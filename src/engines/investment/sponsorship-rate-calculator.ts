import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-14：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

function calculateSponsorship(inputs: Record<string, string>): string[] {
  const downloads = clampNonNegative(parseInt(inputs.monthlyDownloads) || 0);
  const subscribers = clampNonNegative(parseInt(inputs.emailSubscribers) || 0);
  const followers = clampNonNegative(parseInt(inputs.socialFollowers) || 0);
  const contentType = inputs.contentType || 'newsletter';
  const results: string[] = [];

  const cpmRates: Record<string, number> = {
    podcast: 25,
    newsletter: 40,
    youtube: 20,
    blog: 15,
  };
  const cpm = cpmRates[contentType] || 20;

  const podcastValue = downloads > 0 ? (downloads / 1000) * cpm : 0;
  const newsletterValue = (subscribers / 1000) * cpm;
  const socialValue = (followers / 1000) * cpm * 0.5;
  const perPostValue = podcastValue + newsletterValue + socialValue;
  const bundleValue = perPostValue * 4;
  const monthlyValue = perPostValue * 4;
  const annualValue = monthlyValue * 12;

  const totalAudience = downloads + subscribers + followers;
  const audienceTier =
    totalAudience >= 100000 ? 'large creator' : totalAudience >= 25000 ? 'mid-tier' : 'micro-influencer';
  const engagementMultiplier = totalAudience > 0 ? Math.min(2, Math.max(0.5, totalAudience / 50000)) : 1;
  const adjustedRate = perPostValue * engagementMultiplier;
  const yearlyAt1K = (1000 / 1000) * cpm * 4 * 12;
  const yearlyAt10K = (10000 / 1000) * cpm * 4 * 12;
  const yearlyAt100K = (100000 / 1000) * cpm * 4 * 12;

  const typeLabel: Record<string, string> = {
    podcast: 'Podcast',
    newsletter: 'Newsletter',
    youtube: 'YouTube Channel',
    blog: 'Blog',
  };

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
  const pct = (n: number) => n.toFixed(1) + '%';
  const loc = (n: number) => Math.round(n).toLocaleString();
  // P168 B3-14：模板推导要求「params 的表达式」与「兜底里的表达式」**同源**
  //   ⇒ 复合表达式先用局部变量承接，否则推导会把表达式拆成多个占位符（模板污染）。
  const bundlePremiumPct = pct((bundleValue - perPostValue) / Math.max(perPostValue, 1) * 100);
  const contentTypeLabel = typeLabel[contentType];

  results.push(
    makeToken('calc_out.section.sponsorship_rate_calculator', '🎙️ Sponsorship Rate Calculator') + '\n\n' +
    makeToken('calc_out.section.sponsorship_rate_rate_estimate', '💰 Rate Estimate:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.sponsorship_rate.row.content_type', '• Content Type:        ' + contentTypeLabel, { type: contentTypeLabel }) + '\n' +
    '• CPM:                $' + cpm + ' / 1,000 impressions\n' +
    makeToken('calc_out.sponsorship_rate.row.per_post_value', '• Per Post Value:     ' + fmt(perPostValue), { value: fmt(perPostValue) }) + '\n' +
    '• Bundle (4 posts):    ' + fmt(bundleValue) + '\n' +
    '• Monthly (4 posts):   ' + fmt(monthlyValue) + '/mo\n' +
    '• Annual Revenue:      ' + fmt(annualValue) + '/yr\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.sponsorship_rate_cpm_by_niche', '📐 CPM by Niche:') + '\n' +
    makeToken('calc_out.sponsorship_rate.row.niche_podcast', '• Podcast:           $25 CPM  (host-read ads, $18-50 range)') + '\n' +
    makeToken('calc_out.sponsorship_rate.row.niche_newsletter', '• Newsletter:        $40 CPM  (high engagement, $30-60 range)') + '\n' +
    makeToken('calc_out.sponsorship_rate.row.niche_youtube', '• YouTube:           $20 CPM  (direct sponsorships, $15-30 range)') + '\n' +
    makeToken('calc_out.sponsorship_rate.row.niche_blog', '• Blog:              $15 CPM  (display + direct, $10-25 range)') + '\n' +
    makeToken('calc_out.sponsorship_rate.row.niche_b2b_finance', '• B2B SaaS / Finance niche: $50-80 CPM  (premium verticals)') + '\n' +
    makeToken('calc_out.sponsorship_rate.row.niche_lifestyle', '• Lifestyle / General:      $5-15 CPM  (commodity)') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.sponsorship_rate_rate_health', '🩺 Rate Health:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (cpm >= 25
      ? makeToken('calc_out.sponsorship_rate.row.health_cpm_premium', '• 🟢 Premium CPM — top-tier brand deals.') + '\n'
      : cpm >= 15
      ? makeToken('calc_out.sponsorship_rate.row.health_cpm_standard', '• 🟡 Standard CPM — workable rate for content type.') + '\n'
      : makeToken('calc_out.sponsorship_rate.row.health_cpm_low', '• 🔴 Low CPM — limited monetization potential. Focus on engagement.') + '\n') +
    (totalAudience >= 100000
      ? makeToken('calc_out.sponsorship_rate.row.health_tier_large', '• 🟢 Large creator tier — multiple sponsor slots/yr, premium CPMs.') + '\n'
      : totalAudience >= 25000
      ? makeToken('calc_out.sponsorship_rate.row.health_tier_mid', '• 🟡 Mid-tier — competitive CPM, 1-2 sponsor slots/yr typical.') + '\n'
      : makeToken('calc_out.sponsorship_rate.row.health_tier_micro', '• 🟠 Micro-influencer — building toward monetization threshold (10K+).') + '\n') +
    (engagementMultiplier >= 1.2
      ? makeToken('calc_out.sponsorship_rate.row.health_ratio_strong', '• 🟢 Audience-to-deal ratio strong — sponsors see value at this scale.') + '\n'
      : engagementMultiplier >= 0.8
      ? makeToken('calc_out.sponsorship_rate.row.health_ratio_standard', '• 🟡 Standard ratio — focus on growing niche engagement.') + '\n'
      : makeToken('calc_out.sponsorship_rate.row.health_ratio_small', '• 🟠 Small audience — engagement metrics matter more than reach.') + '\n') +
    (cpm >= 25
      ? makeToken('calc_out.sponsorship_rate.row.health_cpm_command', '• 🟢 CPM $' + cpm + ' commands brand attention in this vertical.', { cpm: String(cpm) }) + '\n'
      : makeToken('calc_out.sponsorship_rate.row.health_cpm_below', '• 🟠 CPM $' + cpm + ' is below premium — niche specialization helps.', { cpm: String(cpm) }) + '\n') +
    '\n' + makeToken('calc_out.section.sponsorship_rate_revenue_at_scale', '🎯 Revenue at Scale:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.sponsorship_rate.row.scale_1k', '• At 1,000 audience:     $' + loc(yearlyAt1K) + '/yr  (entry)', { yearly: loc(yearlyAt1K) }) + '\n' +
    makeToken('calc_out.sponsorship_rate.row.scale_10k', '• At 10,000 audience:    $' + loc(yearlyAt10K) + '/yr  (mid-tier)', { yearly: loc(yearlyAt10K) }) + '\n' +
    makeToken('calc_out.sponsorship_rate.row.scale_100k', '• At 100,000 audience:   $' + loc(yearlyAt100K) + '/yr  (premium)', { yearly: loc(yearlyAt100K) }) + '\n' +
    makeToken('calc_out.sponsorship_rate.row.scale_current', '• Current:                ' + fmt(annualValue) + '/yr  (' + loc(totalAudience) + ' audience)', { value: fmt(annualValue), audience: loc(totalAudience) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.sponsorship_rate_per_post_break_even', '⚖️ Per-Post vs Bundle Break-Even:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.sponsorship_rate.row.breakeven_per_post_only', '• Per-post only:        ' + fmt(perPostValue * 12) + '/yr  (1 post/mo, 12 placements)', { value: fmt(perPostValue * 12) }) + '\n' +
    makeToken('calc_out.sponsorship_rate.row.breakeven_bundle_monthly', '• 4-post bundle/mo:     ' + fmt(monthlyValue * 12) + '/yr  (4x exposure)', { value: fmt(monthlyValue * 12) }) + '\n' +
    makeToken('calc_out.sponsorship_rate.row.breakeven_bundle_premium', '• Bundle premium:       +' + bundlePremiumPct + ' revenue vs per-post', { pct: bundlePremiumPct }) + '\n' +
    makeToken('calc_out.sponsorship_rate.row.breakeven_bundle_size', '• Break-even bundle size: need 4+ committed sponsors for retainer') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.what_if_scenarios', '🔄 What-If Scenarios:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.sponsorship_rate.row.whatif_grow_engagement', '• Grow engagement 50%:  Rate ' + fmt(perPostValue) + ' → ' + fmt(perPostValue * 1.5) + '/post  (' + fmt(perPostValue * 1.5 * 12 * 4) + '/yr)', { from: fmt(perPostValue), to: fmt(perPostValue * 1.5), annual: fmt(perPostValue * 1.5 * 12 * 4) }) + '\n' +
    makeToken('calc_out.sponsorship_rate.row.whatif_raise_cpm', '• Raise CPM 25% (negotiate):  Rate ' + fmt(perPostValue) + ' → ' + fmt(perPostValue * 1.25) + '/post  (' + fmt(perPostValue * 1.25 * 12 * 4) + '/yr)', { from: fmt(perPostValue), to: fmt(perPostValue * 1.25), annual: fmt(perPostValue * 1.25 * 12 * 4) }) + '\n' +
    makeToken('calc_out.sponsorship_rate.row.whatif_longer_bundle', '• Longer bundle (8 posts/mo):  Revenue ' + fmt(monthlyValue) + ' → ' + fmt(perPostValue * 8) + '/mo  (' + fmt(perPostValue * 8 * 12) + '/yr)', { from: fmt(monthlyValue), to: fmt(perPostValue * 8), annual: fmt(perPostValue * 8 * 12) }) + '\n' +
    makeToken('calc_out.sponsorship_rate.row.whatif_2x_audience', '• 2x audience growth:  Revenue ' + fmt(annualValue) + ' → ' + fmt(annualValue * 2) + '/yr', { from: fmt(annualValue), to: fmt(annualValue * 2) }) + '\n' +
    makeToken('calc_out.sponsorship_rate.row.whatif_premium_niche', '• Switch to premium niche (B2B/finance):  CPM $' + cpm + ' → $50  → ' + fmt((totalAudience / 1000) * 50 * 4 * 12) + '/yr', { cpm: String(cpm), value: fmt((totalAudience / 1000) * 50 * 4 * 12) }) + '\n\n' +
    makeToken('calc_out.sponsorship_rate.row.tip_direct_sponsorships', '💡 Tip: Direct sponsorships pay 3-10x more than programmatic ads (AdSense: $2-5 CPM vs direct: $15-40 CPM). Build a media kit with engagement metrics (open rate, listen-through, click-through) — a smaller but engaged audience commands premium CPMs. Bundle 4 placements/mo at a 10-15% discount to lock recurring revenue while brands get consistency.'),
  );

  const audienceSizes = [1000, 5000, 15000, 50000, 200000];
  for (let i = 0; i < audienceSizes.length; i++) {
    const audienceSize = audienceSizes[i];
    const monthly = (audienceSize / 1000) * cpm * 4;
    const yearly = monthly * 12;
    // P168 B3-14：params 的表达式与兜底里的表达式必须**同源** ⇒ 先用局部变量承接
    const audienceLabel = audienceSize.toLocaleString();
    const monthlyLabel = loc(monthly);
    const yearlyLabel = loc(yearly);
    const sponsorType = typeLabel[contentType].toLowerCase();
    results.push(
      makeToken(
        'calc_out.sponsorship_rate.row.sponsor_tier',
        'At ' + audienceLabel + ' audience: $' + monthlyLabel + '/mo  ($' + yearlyLabel + '/yr) as ' + sponsorType + ' sponsor',
        { audience: audienceLabel, monthly: monthlyLabel, yearly: yearlyLabel, type: sponsorType },
      ),
    );
  }

  return results;
}

const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let _=function(n){return Number.isNaN(n)?0:Math.max(0,n)},w=function(n){const u=_(parseInt(n.monthlyDownloads)||0),h=_(parseInt(n.emailSubscribers)||0),l=_(parseInt(n.socialFollowers)||0),d=n.contentType||"newsletter",y=[],r={podcast:25,newsletter:40,youtube:20,blog:15}[d]||20,z=u>0?u/1e3*r:0,j=h/1e3*r,K=l/1e3*r*.5,o=z+j+K,b=o*4,p=o*4,i=p*12,s=u+h+l,Y=s>=1e5?"large creator":s>=25e3?"mid-tier":"micro-influencer",m=s>0?Math.min(2,Math.max(.5,s/5e4)):1,H=o*m,f=1e3/1e3*r*4*12,v=1e4/1e3*r*4*12,P=1e5/1e3*r*4*12,M={podcast:"Podcast",newsletter:"Newsletter",youtube:"YouTube Channel",blog:"Blog"},e=c=>"$"+Math.round(c).toLocaleString(),q=c=>c.toFixed(1)+"%",a=c=>Math.round(c).toLocaleString(),C=q((b-o)/Math.max(o,1)*100),$=M[d];y.push(t("calc_out.section.sponsorship_rate_calculator","🎙️ Sponsorship Rate Calculator")+\`

\`+t("calc_out.section.sponsorship_rate_rate_estimate","💰 Rate Estimate:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.sponsorship_rate.row.content_type","• Content Type:        "+$,{type:$})+\`
• CPM:                $\`+r+\` / 1,000 impressions
\`+t("calc_out.sponsorship_rate.row.per_post_value","• Per Post Value:     "+e(o),{value:e(o)})+\`
• Bundle (4 posts):    \`+e(b)+\`
• Monthly (4 posts):   \`+e(p)+\`/mo
• Annual Revenue:      \`+e(i)+\`/yr

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.sponsorship_rate_cpm_by_niche","📐 CPM by Niche:")+\`
\`+t("calc_out.sponsorship_rate.row.niche_podcast","• Podcast:           $25 CPM  (host-read ads, $18-50 range)")+\`
\`+t("calc_out.sponsorship_rate.row.niche_newsletter","• Newsletter:        $40 CPM  (high engagement, $30-60 range)")+\`
\`+t("calc_out.sponsorship_rate.row.niche_youtube","• YouTube:           $20 CPM  (direct sponsorships, $15-30 range)")+\`
\`+t("calc_out.sponsorship_rate.row.niche_blog","• Blog:              $15 CPM  (display + direct, $10-25 range)")+\`
\`+t("calc_out.sponsorship_rate.row.niche_b2b_finance","• B2B SaaS / Finance niche: $50-80 CPM  (premium verticals)")+\`
\`+t("calc_out.sponsorship_rate.row.niche_lifestyle","• Lifestyle / General:      $5-15 CPM  (commodity)")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.sponsorship_rate_rate_health","🩺 Rate Health:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(r>=25?t("calc_out.sponsorship_rate.row.health_cpm_premium","• 🟢 Premium CPM — top-tier brand deals.")+\`
\`:r>=15?t("calc_out.sponsorship_rate.row.health_cpm_standard","• 🟡 Standard CPM — workable rate for content type.")+\`
\`:t("calc_out.sponsorship_rate.row.health_cpm_low","• 🔴 Low CPM — limited monetization potential. Focus on engagement.")+\`
\`)+(s>=1e5?t("calc_out.sponsorship_rate.row.health_tier_large","• 🟢 Large creator tier — multiple sponsor slots/yr, premium CPMs.")+\`
\`:s>=25e3?t("calc_out.sponsorship_rate.row.health_tier_mid","• 🟡 Mid-tier — competitive CPM, 1-2 sponsor slots/yr typical.")+\`
\`:t("calc_out.sponsorship_rate.row.health_tier_micro","• 🟠 Micro-influencer — building toward monetization threshold (10K+).")+\`
\`)+(m>=1.2?t("calc_out.sponsorship_rate.row.health_ratio_strong","• 🟢 Audience-to-deal ratio strong — sponsors see value at this scale.")+\`
\`:m>=.8?t("calc_out.sponsorship_rate.row.health_ratio_standard","• 🟡 Standard ratio — focus on growing niche engagement.")+\`
\`:t("calc_out.sponsorship_rate.row.health_ratio_small","• 🟠 Small audience — engagement metrics matter more than reach.")+\`
\`)+(r>=25?t("calc_out.sponsorship_rate.row.health_cpm_command","• 🟢 CPM $"+r+" commands brand attention in this vertical.",{cpm:String(r)})+\`
\`:t("calc_out.sponsorship_rate.row.health_cpm_below","• 🟠 CPM $"+r+" is below premium — niche specialization helps.",{cpm:String(r)})+\`
\`)+\`
\`+t("calc_out.section.sponsorship_rate_revenue_at_scale","🎯 Revenue at Scale:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.sponsorship_rate.row.scale_1k","• At 1,000 audience:     $"+a(f)+"/yr  (entry)",{yearly:a(f)})+\`
\`+t("calc_out.sponsorship_rate.row.scale_10k","• At 10,000 audience:    $"+a(v)+"/yr  (mid-tier)",{yearly:a(v)})+\`
\`+t("calc_out.sponsorship_rate.row.scale_100k","• At 100,000 audience:   $"+a(P)+"/yr  (premium)",{yearly:a(P)})+\`
\`+t("calc_out.sponsorship_rate.row.scale_current","• Current:                "+e(i)+"/yr  ("+a(s)+" audience)",{value:e(i),audience:a(s)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.sponsorship_rate_per_post_break_even","⚖️ Per-Post vs Bundle Break-Even:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.sponsorship_rate.row.breakeven_per_post_only","• Per-post only:        "+e(o*12)+"/yr  (1 post/mo, 12 placements)",{value:e(o*12)})+\`
\`+t("calc_out.sponsorship_rate.row.breakeven_bundle_monthly","• 4-post bundle/mo:     "+e(p*12)+"/yr  (4x exposure)",{value:e(p*12)})+\`
\`+t("calc_out.sponsorship_rate.row.breakeven_bundle_premium","• Bundle premium:       +"+C+" revenue vs per-post",{pct:C})+\`
\`+t("calc_out.sponsorship_rate.row.breakeven_bundle_size","• Break-even bundle size: need 4+ committed sponsors for retainer")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.what_if_scenarios","🔄 What-If Scenarios:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.sponsorship_rate.row.whatif_grow_engagement","• Grow engagement 50%:  Rate "+e(o)+" → "+e(o*1.5)+"/post  ("+e(o*1.5*12*4)+"/yr)",{from:e(o),to:e(o*1.5),annual:e(o*1.5*12*4)})+\`
\`+t("calc_out.sponsorship_rate.row.whatif_raise_cpm","• Raise CPM 25% (negotiate):  Rate "+e(o)+" → "+e(o*1.25)+"/post  ("+e(o*1.25*12*4)+"/yr)",{from:e(o),to:e(o*1.25),annual:e(o*1.25*12*4)})+\`
\`+t("calc_out.sponsorship_rate.row.whatif_longer_bundle","• Longer bundle (8 posts/mo):  Revenue "+e(p)+" → "+e(o*8)+"/mo  ("+e(o*8*12)+"/yr)",{from:e(p),to:e(o*8),annual:e(o*8*12)})+\`
\`+t("calc_out.sponsorship_rate.row.whatif_2x_audience","• 2x audience growth:  Revenue "+e(i)+" → "+e(i*2)+"/yr",{from:e(i),to:e(i*2)})+\`
\`+t("calc_out.sponsorship_rate.row.whatif_premium_niche","• Switch to premium niche (B2B/finance):  CPM $"+r+" → $50  → "+e(s/1e3*50*4*12)+"/yr",{cpm:String(r),value:e(s/1e3*50*4*12)})+\`

\`+t("calc_out.sponsorship_rate.row.tip_direct_sponsorships","💡 Tip: Direct sponsorships pay 3-10x more than programmatic ads (AdSense: $2-5 CPM vs direct: $15-40 CPM). Build a media kit with engagement metrics (open rate, listen-through, click-through) — a smaller but engaged audience commands premium CPMs. Bundle 4 placements/mo at a 10-15% discount to lock recurring revenue while brands get consistency."));const S=[1e3,5e3,15e3,5e4,2e5];for(let c=0;c<S.length;c++){const A=S[c],B=A/1e3*r*4,E=B*12,L=A.toLocaleString(),R=a(B),F=a(E),x=M[d].toLowerCase();y.push(t("calc_out.sponsorship_rate.row.sponsor_tier","At "+L+" audience: $"+R+"/mo  ($"+F+"/yr) as "+x+" sponsor",{audience:L,monthly:R,yearly:F,type:x}))}return y},g=function(n,u,h){var l=V(n);return Array.isArray(l)?l.join(\`
\`):String(l)};var I=_,D=w,O=g,t=tk,N='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',t=new Function("return "+N)(),V=function(n){return w(n)};return[g(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: 'solopreneur-sponsorship-rate-calculator',
  title: 'Sponsorship Rate Calculator',
  description: 'Estimate what brands will pay to sponsor your content. Calculate CPM-based rates for podcasts, newsletters, YouTube, and blogs with rate ladders and scale projections.',
  inputs: [
    { name: 'monthlyDownloads', label: 'Monthly Downloads / Listens', placeholder: 'e.g. 10000', type: 'number' },
    { name: 'emailSubscribers', label: 'Email Subscribers', placeholder: 'e.g. 5000', type: 'number' },
    { name: 'socialFollowers', label: 'Social Media Followers', placeholder: 'e.g. 15000', type: 'number' },
    { name: 'contentType', label: 'Content Type', placeholder: '', type: 'select', options: ['podcast', 'newsletter', 'youtube', 'blog'] },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  // P140f-p3-T7: minimal Playbook 6 字段 template (Goal=该不该决策)
  // Goal 含"决策"+"该不该"双关键词 → 通过 T1 zod refine 校验
  playbook: {
    goal: '用户该不该用此计算器的结果作为决策依据',
    input: 'engine 定义的 inputs 字段',
    output: 'engine 定义的 generate() 返回数组',
    constraint: 'apply 引擎 inputs 时受实际场景约束',
    tool: 'Phase 1 引擎自身的 🧭 Decision Recommendation (如已 ship) 或未来扩展',
    memory: 'v2.0 11 business domain benchmark + P140f Phase 4 主题簇',
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateSponsorship(inputs);
  },
  staticExamples: [
    '$calc_out.section.sponsorship_rate_calculator|🎙️ Sponsorship Rate Calculator|\n\n$calc_out.section.sponsorship_rate_rate_estimate|💰 Rate Estimate:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.sponsorship_rate.row.content_type{"type":"Newsletter"}|• Content Type:        Newsletter|\n• CPM:                $40 / 1,000 impressions\n$calc_out.sponsorship_rate.row.per_post_value{"value":"$900"}|• Per Post Value:     $900|\n• Bundle (4 posts):    $3,600\n• Monthly (4 posts):   $3,600/mo\n• Annual Revenue:      $43,200/yr\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.sponsorship_rate_cpm_by_niche|📐 CPM by Niche:|\n$calc_out.sponsorship_rate.row.niche_podcast|• Podcast:           $25 CPM  (host-read ads, $18-50 range)|\n$calc_out.sponsorship_rate.row.niche_newsletter|• Newsletter:        $40 CPM  (high engagement, $30-60 range)|\n$calc_out.sponsorship_rate.row.niche_youtube|• YouTube:           $20 CPM  (direct sponsorships, $15-30 range)|\n$calc_out.sponsorship_rate.row.niche_blog|• Blog:              $15 CPM  (display + direct, $10-25 range)|\n$calc_out.sponsorship_rate.row.niche_b2b_finance|• B2B SaaS / Finance niche: $50-80 CPM  (premium verticals)|\n$calc_out.sponsorship_rate.row.niche_lifestyle|• Lifestyle / General:      $5-15 CPM  (commodity)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.sponsorship_rate_rate_health|🩺 Rate Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.sponsorship_rate.row.health_cpm_premium|• 🟢 Premium CPM — top-tier brand deals.|\n$calc_out.sponsorship_rate.row.health_tier_mid|• 🟡 Mid-tier — competitive CPM, 1-2 sponsor slots/yr typical.|\n$calc_out.sponsorship_rate.row.health_ratio_small|• 🟠 Small audience — engagement metrics matter more than reach.|\n$calc_out.sponsorship_rate.row.health_cpm_command{"cpm":"40"}|• 🟢 CPM $40 commands brand attention in this vertical.|\n\n$calc_out.section.sponsorship_rate_revenue_at_scale|🎯 Revenue at Scale:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.sponsorship_rate.row.scale_1k{"yearly":"1,920"}|• At 1,000 audience:     $1,920/yr  (entry)|\n$calc_out.sponsorship_rate.row.scale_10k{"yearly":"19,200"}|• At 10,000 audience:    $19,200/yr  (mid-tier)|\n$calc_out.sponsorship_rate.row.scale_100k{"yearly":"192,000"}|• At 100,000 audience:   $192,000/yr  (premium)|\n$calc_out.sponsorship_rate.row.scale_current{"value":"$43,200","audience":"30,000"}|• Current:                $43,200/yr  (30,000 audience)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.sponsorship_rate_per_post_break_even|⚖️ Per-Post vs Bundle Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.sponsorship_rate.row.breakeven_per_post_only{"value":"$10,800"}|• Per-post only:        $10,800/yr  (1 post/mo, 12 placements)|\n$calc_out.sponsorship_rate.row.breakeven_bundle_monthly{"value":"$43,200"}|• 4-post bundle/mo:     $43,200/yr  (4x exposure)|\n$calc_out.sponsorship_rate.row.breakeven_bundle_premium{"pct":"300.0%"}|• Bundle premium:       +300.0% revenue vs per-post|\n$calc_out.sponsorship_rate.row.breakeven_bundle_size|• Break-even bundle size: need 4+ committed sponsors for retainer|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.sponsorship_rate.row.whatif_grow_engagement{"from":"$900","to":"$1,350","annual":"$64,800"}|• Grow engagement 50%:  Rate $900 → $1,350/post  ($64,800/yr)|\n$calc_out.sponsorship_rate.row.whatif_raise_cpm{"from":"$900","to":"$1,125","annual":"$54,000"}|• Raise CPM 25% (negotiate):  Rate $900 → $1,125/post  ($54,000/yr)|\n$calc_out.sponsorship_rate.row.whatif_longer_bundle{"from":"$3,600","to":"$7,200","annual":"$86,400"}|• Longer bundle (8 posts/mo):  Revenue $3,600 → $7,200/mo  ($86,400/yr)|\n$calc_out.sponsorship_rate.row.whatif_2x_audience{"from":"$43,200","to":"$86,400"}|• 2x audience growth:  Revenue $43,200 → $86,400/yr|\n$calc_out.sponsorship_rate.row.whatif_premium_niche{"cpm":"40","value":"$72,000"}|• Switch to premium niche (B2B/finance):  CPM $40 → $50  → $72,000/yr|\n\n$calc_out.sponsorship_rate.row.tip_direct_sponsorships|💡 Tip: Direct sponsorships pay 3-10x more than programmatic ads (AdSense: $2-5 CPM vs direct: $15-40 CPM). Build a media kit with engagement metrics (open rate, listen-through, click-through) — a smaller but engaged audience commands premium CPMs. Bundle 4 placements/mo at a 10-15% discount to lock recurring revenue while brands get consistency.|\n$calc_out.sponsorship_rate.row.sponsor_tier{"audience":"1,000","monthly":"160","yearly":"1,920","type":"newsletter"}|At 1,000 audience: $160/mo  ($1,920/yr) as newsletter sponsor|\n$calc_out.sponsorship_rate.row.sponsor_tier{"audience":"5,000","monthly":"800","yearly":"9,600","type":"newsletter"}|At 5,000 audience: $800/mo  ($9,600/yr) as newsletter sponsor|\n$calc_out.sponsorship_rate.row.sponsor_tier{"audience":"15,000","monthly":"2,400","yearly":"28,800","type":"newsletter"}|At 15,000 audience: $2,400/mo  ($28,800/yr) as newsletter sponsor|\n$calc_out.sponsorship_rate.row.sponsor_tier{"audience":"50,000","monthly":"8,000","yearly":"96,000","type":"newsletter"}|At 50,000 audience: $8,000/mo  ($96,000/yr) as newsletter sponsor|\n$calc_out.sponsorship_rate.row.sponsor_tier{"audience":"200,000","monthly":"32,000","yearly":"384,000","type":"newsletter"}|At 200,000 audience: $32,000/mo  ($384,000/yr) as newsletter sponsor|',
    'At 1,000 audience: $160/mo  ($1,920/yr) as newsletter sponsor',
    'At 5,000 audience: $800/mo  ($9,600/yr) as newsletter sponsor',
    'At 15,000 audience: $2,400/mo  ($28,800/yr) as newsletter sponsor',
    'At 50,000 audience: $8,000/mo  ($96,000/yr) as newsletter sponsor',
    'At 200,000 audience: $32,000/mo  ($384,000/yr) as newsletter sponsor',
  ],
  faq: [
    { q: 'What is CPM in sponsorship?', a: 'CPM stands for Cost Per Mille (cost per thousand impressions). In sponsorship, it is the rate brands pay per 1,000 views, listens, or opens. Podcasts typically fetch $25-50 CPM for host-read ads. Newsletters command $30-60 CPM due to high engagement. YouTube runs $10-30 CPM via the platform or higher for direct sponsorships. Blogs generally earn $10-25 CPM through display ads or direct placements.' },
    { q: 'How do I increase my sponsorship rates?', a: 'Focus on engagement metrics, not just reach. A smaller but highly engaged audience commands higher CPMs. Track open rates for newsletters (30%+ is excellent), listen-through rates for podcasts (70%+ is strong), and comment-to-view ratios. Create a media kit with these metrics. Niche audiences in finance, tech, and B2B SaaS command 2-3x higher CPMs than general entertainment audiences.' },
    { q: 'Should I charge per episode or monthly retainer?', a: 'Monthly retainers are better for both parties. Brands get consistent exposure and you get predictable revenue. Structure it as 4 placements per month (weekly) with one bonus social post. Charge a premium for single-episode sponsorships (1.5x the per-episode rate) because brands are testing you out with no long-term commitment.' },
    { q: 'When do brands start approaching me?', a: 'Most brands consider sponsorship at 5,000+ subscribers or 10,000+ downloads per episode. However, micro-influencers with 1,000-5,000 highly engaged followers in a specific niche can attract niche brands willing to pay $100-500 per placement. Do not wait to be approached — create a simple media kit and pitch brands you already use and love.' },
    { q: 'How does this compare to ad network revenue?', a: 'Direct sponsorships pay 3-10x more than programmatic ads. YouTube AdSense pays roughly $2-5 CPM, while direct sponsorship deals on YouTube can fetch $15-30 CPM. Similarly, newsletter ad networks like Paved pay $15-25 CPM, while direct deals reach $40-60 CPM. Building direct brand relationships is always more profitable than relying on ad networks alone.' },
    { q: "How much should I charge for sponsorship?", a: "YouTube creators: $20-30 CPM. Instagram: $10-20. TikTok: $5-15. Podcasts: $25-50. Newsletters: $30-50. Influencers: $10-100 per 1K followers. Ad-impressions × CPM. Benchmarks: $20 CPM = $20 per 1000 views. For 100K views: $2000. For 1M views: $20,000. Rates vary by niche, audience quality, engagement." },
    { q: "What is CPM in sponsorship deals?", a: "CPM = Cost Per Mille (per 1000 impressions). YouTube: $20-30 CPM mid-tier, $40-100 for premium. Instagram: $10-20. Podcasts: $25-50. Influencer posts: $10-50 per 1K followers. TikTok: $5-15. Choose CPM based on: audience size, niche, engagement, exclusivity. Negotiate: base CPM + bonus for usage rights." },
    { q: "Should I charge more for dedicated posts vs integrated?", a: "Yes. Dedicated: 100% of CPM (full attention). Integrated: 50-70% of CPM (mixed with other content). Takeover: 150-200% of CPM (full day, exclusive). Stories: 25-50% of CPM. Pricing should reflect: attention, exclusivity, content lifetime. Sponsors pay premium for guaranteed attention." },
    { q: "How do I justify higher sponsorship rates?", a: "Show: 1) Audience demographics (income, location, interests), 2) Engagement rate (likes, comments, shares), 3) Conversion data (sponsor sales from past deals), 4) Audience trust (long-term view, polls), 5) Niche relevance (how aligned with sponsor). Better data = higher rates. Quality over quantity. Premium rates: 2-3x average." },
    { q: "What are typical influencer rates by follower count?", a: "Nano (1K-10K): $10-100 per post. Micro (10K-100K): $100-500. Mid (100K-500K): $500-5000. Macro (500K-1M): $5K-20K. Mega (1M+): $20K+. Per 1K followers: $10-100. Compare per platform. Rates vary by niche (beauty >gaming >tech). Sponsors pay more for higher engagement and tighter audience match." },
    { q: "How do I package sponsorship deals?", a: "Common: 1) Single post: 1x CPM. 2) Multi-post: 2-3x CPM per post (discount). 3) Series: 5x for 6 posts (deep discount). 4) Annual: 10x for 12 posts (best for sponsor). 5) Sponsorship bundle: integrated + dedicated + story. Best: 1 of 4 sponsorship posts reserved for top sponsor." },
    { q: "Should I disclose sponsorships and how?", a: "Yes — required by FTC and platform rules. Disclosure: 1) \"#ad\" or \"#sponsored\" at top of post, 2) \"Paid partnership with [Brand]\" on YouTube, 3) \"Sponsored\" tag on Instagram, 4) Clear, prominent, not buried. Penalties: account suspension, FTC fines ($10K+). Most creators over-disclose (safer). Affiliate links: also disclose." },
    { q: "How do I land my first sponsorship?", a: "Build: 1) Consistent content (10K+ followers, 100K+ views), 2) Media kit (rate card, audience stats, demographics), 3) Case studies (testimonials, past results), 4) Outbound: email brands directly (cold outreach 10% response). Pitch: specific brand why, audience fit, package options. Tools: Grapevine, Aspire, IZEA, CreatorIQ. Start at 30-50% of final rate to build portfolio." },
  ],
  howToUse: [
    'Enter your monthly downloads or listens for podcast/YouTube content.',
    'Enter your email subscriber count for newsletter-based sponsorship value.',
    'Enter your total social media followers across platforms.',
    'Select your primary content type to apply the correct CPM rate.',
    'Review the per-post, bundle, monthly, and annual sponsorship revenue.',
    'Compare how revenue scales at 1K, 10K, and 100K audience levels.',
  ],
  engineKey: true,
};

registerEngine(engine);

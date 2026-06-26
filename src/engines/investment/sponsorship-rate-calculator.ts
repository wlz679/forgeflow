import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

function calculateSponsorship(inputs: Record<string, string>): string[] {
  const downloads = parseInt(inputs.monthlyDownloads) || 0;
  const subscribers = parseInt(inputs.emailSubscribers) || 0;
  const followers = parseInt(inputs.socialFollowers) || 0;
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
  const tierHealth =
    cpm >= 25
      ? '🟢 Premium CPM — top-tier brand deals.'
      : cpm >= 15
      ? '🟡 Standard CPM — workable rate for content type.'
      : '🔴 Low CPM — limited monetization potential. Focus on engagement.';

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

  results.push(
    '🎙️ Sponsorship Rate Calculator\n\n' +
    '💰 Rate Estimate:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Content Type:        ' + typeLabel[contentType] + '\n' +
    '• CPM:                $' + cpm + ' / 1,000 impressions\n' +
    '• Per Post Value:     ' + fmt(perPostValue) + '\n' +
    '• Bundle (4 posts):    ' + fmt(bundleValue) + '\n' +
    '• Monthly (4 posts):   ' + fmt(monthlyValue) + '/mo\n' +
    '• Annual Revenue:      ' + fmt(annualValue) + '/yr\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 CPM by Niche:\n' +
    '• Podcast:           $25 CPM  (host-read ads, $18-50 range)\n' +
    '• Newsletter:        $40 CPM  (high engagement, $30-60 range)\n' +
    '• YouTube:           $20 CPM  (direct sponsorships, $15-30 range)\n' +
    '• Blog:              $15 CPM  (display + direct, $10-25 range)\n' +
    '• B2B SaaS / Finance niche: $50-80 CPM  (premium verticals)\n' +
    '• Lifestyle / General:      $5-15 CPM  (commodity)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Rate Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + tierHealth + '\n' +
    (totalAudience >= 100000
      ? '• 🟢 Large creator tier — multiple sponsor slots/yr, premium CPMs.\n'
      : totalAudience >= 25000
      ? '• 🟡 Mid-tier — competitive CPM, 1-2 sponsor slots/yr typical.\n'
      : '• 🟠 Micro-influencer — building toward monetization threshold (10K+).\n') +
    (engagementMultiplier >= 1.2
      ? '• 🟢 Audience-to-deal ratio strong — sponsors see value at this scale.\n'
      : engagementMultiplier >= 0.8
      ? '• 🟡 Standard ratio — focus on growing niche engagement.\n'
      : '• 🟠 Small audience — engagement metrics matter more than reach.\n') +
    (cpm >= 25
      ? '• 🟢 CPM $' + cpm + ' commands brand attention in this vertical.\n'
      : '• 🟠 CPM $' + cpm + ' is below premium — niche specialization helps.\n') +
    '\n🎯 Revenue at Scale:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• At 1,000 audience:     $' + loc(yearlyAt1K) + '/yr  (entry)\n' +
    '• At 10,000 audience:    $' + loc(yearlyAt10K) + '/yr  (mid-tier)\n' +
    '• At 100,000 audience:   $' + loc(yearlyAt100K) + '/yr  (premium)\n' +
    '• Current:                ' + fmt(annualValue) + '/yr  (' + loc(totalAudience) + ' audience)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Per-Post vs Bundle Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Per-post only:        ' + fmt(perPostValue * 12) + '/yr  (1 post/mo, 12 placements)\n' +
    '• 4-post bundle/mo:     ' + fmt(monthlyValue * 12) + '/yr  (4x exposure)\n' +
    '• Bundle premium:       +' + pct((bundleValue - perPostValue) / Math.max(perPostValue, 1) * 100) + ' revenue vs per-post\n' +
    '• Break-even bundle size: need 4+ committed sponsors for retainer\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Grow engagement 50%:  Rate ' + fmt(perPostValue) + ' → ' + fmt(perPostValue * 1.5) + '/post  (' + fmt(perPostValue * 1.5 * 12 * 4) + '/yr)\n' +
    '• Raise CPM 25% (negotiate):  Rate ' + fmt(perPostValue) + ' → ' + fmt(perPostValue * 1.25) + '/post  (' + fmt(perPostValue * 1.25 * 12 * 4) + '/yr)\n' +
    '• Longer bundle (8 posts/mo):  Revenue ' + fmt(monthlyValue) + ' → ' + fmt(perPostValue * 8) + '/mo  (' + fmt(perPostValue * 8 * 12) + '/yr)\n' +
    '• 2x audience growth:  Revenue ' + fmt(annualValue) + ' → ' + fmt(annualValue * 2) + '/yr\n' +
    '• Switch to premium niche (B2B/finance):  CPM $' + cpm + ' → $50  → ' + fmt((totalAudience / 1000) * 50 * 4 * 12) + '/yr\n\n' +
    '💡 Tip: Direct sponsorships pay 3-10x more than programmatic ads (AdSense: $2-5 CPM vs direct: $15-40 CPM). Build a media kit with engagement metrics (open rate, listen-through, click-through) — a smaller but engaged audience commands premium CPMs. Bundle 4 placements/mo at a 10-15% discount to lock recurring revenue while brands get consistency.',
  );

  const audienceSizes = [1000, 5000, 15000, 50000, 200000];
  for (let i = 0; i < audienceSizes.length; i++) {
    const a = audienceSizes[i];
    const val = (a / 1000) * cpm * 4;
    const yearly = val * 12;
    results.push(
      'At ' + a.toLocaleString() + ' audience: $' + loc(val) + '/mo  ($' + loc(yearly) + '/yr) as ' + typeLabel[contentType].toLowerCase() + ' sponsor',
    );
  }

  return results;
}

const customFn =
  "var dl=parseInt(inputs.monthlyDownloads)||0;" +
  "var subs=parseInt(inputs.emailSubscribers)||0;" +
  "var fol=parseInt(inputs.socialFollowers)||0;" +
  "var ct=inputs.contentType||'newsletter';" +
  "var cr={podcast:25,newsletter:40,youtube:20,blog:15};" +
  "var cpm=cr[ct]||20;" +
  "var pv=dl>0?(dl/1000)*cpm:0;" +
  "var nv=(subs/1000)*cpm;" +
  "var sv=(fol/1000)*cpm*0.5;" +
  "var ppv=pv+nv+sv;" +
  "var bv=ppv*4;" +
  "var mv=ppv*4;" +
  "var av=mv*12;" +
  "var ta=dl+subs+fol;" +
  "var th;" +
  "if(cpm>=25)th='\\uD83D\\uDFE2 Premium CPM \\u2014 top-tier brand deals.';" +
  "else if(cpm>=15)th='\\uD83D\\uDFE1 Standard CPM \\u2014 workable rate for content type.';" +
  "else th='\\uD83D\\uDD34 Low CPM \\u2014 limited monetization potential. Focus on engagement.';" +
  "var em=ta>0?Math.min(2,Math.max(0.5,ta/50000)):1;" +
  "var ar=ppv*em;" +
  "var y1=(1000/1000)*cpm*4*12;" +
  "var y2=(10000/1000)*cpm*4*12;" +
  "var y3=(100000/1000)*cpm*4*12;" +
  "var tl={podcast:'Podcast',newsletter:'Newsletter',youtube:'YouTube Channel',blog:'Blog'};" +
  "function fmt(n){return '$'+Math.round(n).toLocaleString()}" +
  "function pct(n){return n.toFixed(1)+'%'}" +
  "function loc(n){return Math.round(n).toLocaleString()}" +
  "var results=[];" +
  "var r='';" +
  "r+='\\uD83C\\uDF99\\uFE0F Sponsorship Rate Calculator\\n\\n';" +
  "r+='\\uD83D\\uDCB0 Rate Estimate:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Content Type:        '+tl[ct]+'\\n';" +
  "r+='\\u2022 CPM:                $'+cpm+' / 1,000 impressions\\n';" +
  "r+='\\u2022 Per Post Value:     '+fmt(ppv)+'\\n';" +
  "r+='\\u2022 Bundle (4 posts):    '+fmt(bv)+'\\n';" +
  "r+='\\u2022 Monthly (4 posts):   '+fmt(mv)+'/mo\\n';" +
  "r+='\\u2022 Annual Revenue:      '+fmt(av)+'/yr\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCD0 CPM by Niche:\\n';" +
  "r+='\\u2022 Podcast:           $25 CPM  (host-read ads, $18-50 range)\\n';" +
  "r+='\\u2022 Newsletter:        $40 CPM  (high engagement, $30-60 range)\\n';" +
  "r+='\\u2022 YouTube:           $20 CPM  (direct sponsorships, $15-30 range)\\n';" +
  "r+='\\u2022 Blog:              $15 CPM  (display + direct, $10-25 range)\\n';" +
  "r+='\\u2022 B2B SaaS / Finance niche: $50-80 CPM  (premium verticals)\\n';" +
  "r+='\\u2022 Lifestyle / General:      $5-15 CPM  (commodity)\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83E\\uDE7A Rate Health:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 '+th+'\\n';" +
  "if(ta>=100000){r+='\\u2022 \\uD83D\\uDFE2 Large creator tier \\u2014 multiple sponsor slots/yr, premium CPMs.\\n';}" +
  "else if(ta>=25000){r+='\\u2022 \\uD83D\\uDFE1 Mid-tier \\u2014 competitive CPM, 1-2 sponsor slots/yr typical.\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDFE0 Micro-influencer \\u2014 building toward monetization threshold (10K+).\\n';}" +
  "if(em>=1.2){r+='\\u2022 \\uD83D\\uDFE2 Audience-to-deal ratio strong \\u2014 sponsors see value at this scale.\\n';}" +
  "else if(em>=0.8){r+='\\u2022 \\uD83D\\uDFE1 Standard ratio \\u2014 focus on growing niche engagement.\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDFE0 Small audience \\u2014 engagement metrics matter more than reach.\\n';}" +
  "if(cpm>=25){r+='\\u2022 \\uD83D\\uDFE2 CPM $'+cpm+' commands brand attention in this vertical.\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDFE0 CPM $'+cpm+' is below premium \\u2014 niche specialization helps.\\n';}" +
  "r+='\\n\\uD83C\\uDFAF Revenue at Scale:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 At 1,000 audience:     $'+loc(y1)+'/yr  (entry)\\n';" +
  "r+='\\u2022 At 10,000 audience:    $'+loc(y2)+'/yr  (mid-tier)\\n';" +
  "r+='\\u2022 At 100,000 audience:   $'+loc(y3)+'/yr  (premium)\\n';" +
  "r+='\\u2022 Current:                '+fmt(av)+'/yr  ('+loc(ta)+' audience)\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\u2696\\uFE0F Per-Post vs Bundle Break-Even:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Per-post only:        '+fmt(ppv*12)+'/yr  (1 post/mo, 12 placements)\\n';" +
  "r+='\\u2022 4-post bundle/mo:     '+fmt(mv*12)+'/yr  (4x exposure)\\n';" +
  "r+='\\u2022 Bundle premium:       +'+pct((bv-ppv)/Math.max(ppv,1)*100)+' revenue vs per-post\\n';" +
  "r+='\\u2022 Break-even bundle size: need 4+ committed sponsors for retainer\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Grow engagement 50%:  Rate '+fmt(ppv)+' \\u2192 '+fmt(ppv*1.5)+'/post  ('+fmt(ppv*1.5*12*4)+'/yr)\\n';" +
  "r+='\\u2022 Raise CPM 25% (negotiate):  Rate '+fmt(ppv)+' \\u2192 '+fmt(ppv*1.25)+'/post  ('+fmt(ppv*1.25*12*4)+'/yr)\\n';" +
  "r+='\\u2022 Longer bundle (8 posts/mo):  Revenue '+fmt(mv)+' \\u2192 '+fmt(ppv*8)+'/mo  ('+fmt(ppv*8*12)+'/yr)\\n';" +
  "r+='\\u2022 2x audience growth:  Revenue '+fmt(av)+' \\u2192 '+fmt(av*2)+'/yr\\n';" +
  "r+='\\u2022 Switch to premium niche (B2B/finance):  CPM $'+cpm+' \\u2192 $50  \\u2192 '+fmt((ta/1000)*50*4*12)+'/yr\\n\\n';" +
  "r+='\\uD83D\\uDCA1 Tip: Direct sponsorships pay 3-10x more than programmatic ads (AdSense: $2-5 CPM vs direct: $15-40 CPM). Build a media kit with engagement metrics (open rate, listen-through, click-through) \\u2014 a smaller but engaged audience commands premium CPMs. Bundle 4 placements/mo at a 10-15% discount to lock recurring revenue while brands get consistency.';" +
  "results.push(r);" +
  "var sizes=[1000,5000,15000,50000,200000];" +
  "for(var i=0;i<sizes.length;i++){" +
  "var a=sizes[i];" +
  "var val=(a/1000)*cpm*4;" +
  "var yr=val*12;" +
  "results.push('At '+a.toLocaleString()+' audience: $'+loc(val)+'/mo  ($'+loc(yr)+'/yr) as '+tl[ct].toLowerCase()+' sponsor');" +
  "}" +
  "return results;";

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
  generate(inputs: Record<string, string>): string[] {
    return calculateSponsorship(inputs);
  },
  staticExamples: [
    '🎙️ Sponsorship Rate Calculator\n\n💰 Rate Estimate:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Content Type:        Newsletter\n• CPM:                $40 / 1,000 impressions\n• Per Post Value:     $900\n• Bundle (4 posts):    $3,600\n• Monthly (4 posts):   $3,600/mo\n• Annual Revenue:      $43,200/yr\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 CPM by Niche:\n• Podcast:           $25 CPM  (host-read ads, $18-50 range)\n• Newsletter:        $40 CPM  (high engagement, $30-60 range)\n• YouTube:           $20 CPM  (direct sponsorships, $15-30 range)\n• Blog:              $15 CPM  (display + direct, $10-25 range)\n• B2B SaaS / Finance niche: $50-80 CPM  (premium verticals)\n• Lifestyle / General:      $5-15 CPM  (commodity)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Rate Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 Premium CPM — top-tier brand deals.\n• 🟡 Mid-tier — competitive CPM, 1-2 sponsor slots/yr typical.\n• 🟠 Small audience — engagement metrics matter more than reach.\n• 🟢 CPM $40 commands brand attention in this vertical.\n\n🎯 Revenue at Scale:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• At 1,000 audience:     $1,920/yr  (entry)\n• At 10,000 audience:    $19,200/yr  (mid-tier)\n• At 100,000 audience:   $192,000/yr  (premium)\n• Current:                $43,200/yr  (30,000 audience)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Per-Post vs Bundle Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Per-post only:        $10,800/yr  (1 post/mo, 12 placements)\n• 4-post bundle/mo:     $43,200/yr  (4x exposure)\n• Bundle premium:       +300.0% revenue vs per-post\n• Break-even bundle size: need 4+ committed sponsors for retainer\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Grow engagement 50%:  Rate $900 → $1,350/post  ($64,800/yr)\n• Raise CPM 25% (negotiate):  Rate $900 → $1,125/post  ($54,000/yr)\n• Longer bundle (8 posts/mo):  Revenue $3,600 → $7,200/mo  ($86,400/yr)\n• 2x audience growth:  Revenue $43,200 → $86,400/yr\n• Switch to premium niche (B2B/finance):  CPM $40 → $50  → $72,000/yr\n\n💡 Tip: Direct sponsorships pay 3-10x more than programmatic ads (AdSense: $2-5 CPM vs direct: $15-40 CPM). Build a media kit with engagement metrics (open rate, listen-through, click-through) — a smaller but engaged audience commands premium CPMs. Bundle 4 placements/mo at a 10-15% discount to lock recurring revenue while brands get consistency.\nAt 1,000 audience: $160/mo  ($1,920/yr) as newsletter sponsor\nAt 5,000 audience: $800/mo  ($9,600/yr) as newsletter sponsor\nAt 15,000 audience: $2,400/mo  ($28,800/yr) as newsletter sponsor\nAt 50,000 audience: $8,000/mo  ($96,000/yr) as newsletter sponsor\nAt 200,000 audience: $32,000/mo  ($384,000/yr) as newsletter sponsor',
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
  ],
  howToUse: [
    'Enter your monthly downloads or listens for podcast/YouTube content.',
    'Enter your email subscriber count for newsletter-based sponsorship value.',
    'Enter your total social media followers across platforms.',
    'Select your primary content type to apply the correct CPM rate.',
    'Review the per-post, bundle, monthly, and annual sponsorship revenue.',
    'Compare how revenue scales at 1K, 10K, and 100K audience levels.',
  ],
};

registerEngine(engine);
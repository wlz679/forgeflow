import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';
import PRICING from '../data/ai-pricing.json';

interface ProviderInfo {
  name: string;
  perImage: number;
  isSubscription: boolean;
  subRange: string;
  quality: string;
  resolutions: string[];
  order: number;
}

const PROVIDERS: Record<string, ProviderInfo> = PRICING.image.providers as any;

const SUB_TIERS: Record<string, number[]> = PRICING.image.subTiers as any;

const ADVANCED_MULT: Record<string, number> = PRICING.image.advancedMult as any;

const PRESETS: Record<string, Record<string, string>> = {
  'Solopreneur': { provider: 'dalle-3', imagesPerMonth: '100', resolution: '1024×1024', batchSize: '1', advancedMode: 'standard' },
  'Content Creator': { provider: 'midjourney-v7', imagesPerMonth: '500', resolution: '2048×2048', batchSize: '4', advancedMode: 'standard' },
  'Design Agency': { provider: 'dalle-4', imagesPerMonth: '1000', resolution: '1024×1024', batchSize: '4', advancedMode: 'hd' },
  'Budget Hacker': { provider: 'stable-diffusion-4', imagesPerMonth: '5000', resolution: '512×512', batchSize: '8', advancedMode: 'standard' },
  'Best Text Logos': { provider: 'ideogram-3', imagesPerMonth: '300', resolution: '1024×1024', batchSize: '2', advancedMode: 'standard' },
  'High-End Artistic': { provider: 'flux-pro', imagesPerMonth: '800', resolution: '2048×2048', batchSize: '2', advancedMode: 'hd' },
};

function fmt(n: number): string { return '$' + n.toFixed(2); }
function lc(n: number): string { return n.toLocaleString(); }
function pad(s: string, len: number): string { return s + ' '.repeat(Math.max(0, len - s.length)); }
const SEP = '─';

function calculate(inputs: Record<string, string>): string[] {
  const providerKey = inputs.provider || 'dalle-3';
  const p = PROVIDERS[providerKey] || PROVIDERS['dalle-3'];
  const imgs = Math.max(1, Math.min(1000000, parseInt(inputs.imagesPerMonth) || 100));
  const resolution = inputs.resolution || p.resolutions[0];
  const batchSize = Math.max(1, Math.min(64, parseInt(inputs.batchSize) || 1));
  const advancedMode = inputs.advancedMode || 'standard';
  const advMult = ADVANCED_MULT[advancedMode] || 1;

  const out: string[] = [];
  out.push('📅 Pricing last updated: ' + (PRICING.lastUpdated || 'unknown') + ' (data synced weekly)');
  out.push('');

  // Section 1: Header
  let header = '🎨 ' + p.name + ' Cost Estimate';
  if (advancedMode !== 'standard') {
    header += ' (' + advancedMode.toUpperCase() + ' mode, ' + advMult + 'x cost)';
  }
  out.push(header);
  out.push('');
  out.push('Quality: ' + p.quality + ' | Resolution: ' + resolution + ' | Batch: ' + batchSize + '/gen');
  out.push('Pricing: ' + (p.isSubscription ? 'Subscription ' + p.subRange : 'Per-Image $' + p.perImage.toFixed(3)));
  out.push('');

  // Section 2: Cost Summary
  out.push('💰 Cost Summary');
  out.push(SEP.repeat(50));
  let bestTier = 0;
  let perImageCost = 0;
  let monthlyCost = 0;
  if (p.isSubscription) {
    const tiers = SUB_TIERS[providerKey] || [10, 30, 60];
    out.push('Pricing Model: Subscription');
    out.push('Monthly Sub Cost: ' + p.subRange);
    out.push('');

    bestTier = tiers[0];
    for (const tier of tiers) {
      const tierImgs = providerKey === 'midjourney-v7'
        ? (tier <= 30 ? 200 : tier <= 60 ? 1000 : 5000)
        : providerKey === 'leonardo'
          ? (tier <= 12 ? 200 : tier <= 29 ? 1000 : 999999)
          : 200;
      if (imgs <= tierImgs || tier === tiers[tiers.length - 1]) {
        bestTier = tier;
        break;
      }
    }
    out.push('Best Tier for ' + lc(imgs) + ' images/mo: $' + bestTier + '/mo');
    out.push('Annual: ' + fmt(bestTier * 12));
  } else {
    perImageCost = p.perImage * advMult;
    monthlyCost = imgs * perImageCost;
    out.push('Per Image: ' + fmt(perImageCost));
    out.push('Monthly Cost (' + lc(imgs) + ' images): ' + fmt(monthlyCost));
    out.push('Annual Cost: ' + fmt(monthlyCost * 12));
    out.push('');

    const daily = monthlyCost / 30;
    out.push('Daily Avg: ' + fmt(daily) + ' (' + lc(Math.round(imgs / 30)) + ' images/day)');
  }
  out.push('');

  // Section 3: Bar Chart
  out.push('📊 All Providers — Monthly Cost at ' + lc(imgs) + ' images/mo');
  out.push(SEP.repeat(50));
  const sortedProviders = Object.values(PROVIDERS).sort((a, b) => a.order - b.order);
  const allCosts: { name: string; cost: number; isSub: boolean }[] = [];

  for (const prov of sortedProviders) {
    let cost = 0;
    if (prov.isSubscription) {
      const st = SUB_TIERS[
        Object.keys(PROVIDERS).find(k => PROVIDERS[k] === prov) || ''
      ];
      if (st) {
        cost = imgs <= 200 ? st[0] : imgs <= 1000 ? st[1] || st[0] : st[st.length - 1] || st[0];
      } else {
        cost = 20;
      }
    } else {
      cost = imgs * prov.perImage;
    }
    allCosts.push({ name: prov.name, cost, isSub: prov.isSubscription });
  }

  const maxCost = Math.max(...allCosts.map(c => c.cost), 1);
  const BAR_WIDTH = 35;
  const cheapest = allCosts.reduce((min, c) => c.cost < min.cost ? c : min);

  for (const c of allCosts) {
    const ratio = c.cost / maxCost;
    const isCheapest = c === cheapest;
    const prefix = isCheapest ? '✅ ' : '   ';
    let label = c.name;
    if (c.isSub) label += ' (sub)';
    const barLen = Math.max(1, Math.round(ratio * BAR_WIDTH));
    const barStr = '█'.repeat(barLen) + ' '.repeat(Math.max(0, BAR_WIDTH - barLen + 2));
    out.push(prefix + pad(label, 21) + ' ' + barStr + ' ' + fmt(c.cost) + (c.isSub ? '/mo' : ''));
  }
  out.push('');

  // Section 3b: Health (NEW)
  out.push('🩺 Cost Health:');
  out.push(SEP.repeat(50));
  const effectivePerImg = p.isSubscription ? (bestTier / Math.max(1, imgs)) : perImageCost;
  if (effectivePerImg < 0.01) {
    out.push('• 🟢 Exceptional — ' + fmt(effectivePerImg) + '/image is 5x+ below market.');
  } else if (effectivePerImg < 0.05) {
    out.push('• 🟢 Competitive — ' + fmt(effectivePerImg) + '/image is at/below market avg ($0.05).');
  } else if (effectivePerImg < 0.10) {
    out.push('• 🟡 Mid-market — ' + fmt(effectivePerImg) + '/image is around the average.');
  } else {
    out.push('• 🟠 Premium pricing — ' + fmt(effectivePerImg) + '/image is 2x+ market rate.');
  }
  if (p.isSubscription) {
    if (imgs >= 500) {
      out.push('• ✅ Subscription well-utilized at ' + lc(imgs) + ' images/mo.');
    } else if (imgs >= 200) {
      out.push('• ⚠️ Subscription moderately used. Break-even met but not maximized.');
    } else {
      out.push('• 🔴 Subscription underutilized at ' + lc(imgs) + ' images/mo. Per-image may be cheaper.');
    }
  } else {
    const subAlt = sortedProviders.find(prov => prov.isSubscription);
    if (subAlt) {
      const subKey = Object.keys(PROVIDERS).find(k => PROVIDERS[k] === subAlt);
      const subLowest = subKey && SUB_TIERS[subKey] ? SUB_TIERS[subKey][0] : 10;
      const breakEven = Math.ceil(subLowest / p.perImage);
      if (imgs >= breakEven) {
        out.push('• ⚠️ At ' + lc(imgs) + ' imgs/mo, ' + subAlt.name + ' ($' + subLowest + '/mo) would save money.');
      } else {
        out.push('• ✅ Per-image is correct for ' + lc(imgs) + ' imgs/mo. Break-even: ' + lc(breakEven) + ' imgs.');
      }
    }
  }
  out.push('');

  // Section 4: Subscription vs API comparison table
  out.push('📋 Subscription vs API — Price Comparison');
  out.push(SEP.repeat(50));
  const volumes = [50, 200, 500, 1000, 5000];

  let tblHeader = 'Volume'.padEnd(10);
  for (const prov of sortedProviders) tblHeader += ' | ' + pad(prov.name, 14);
  out.push(tblHeader);
  out.push('─'.repeat(tblHeader.length));

  for (const vol of volumes) {
    let row = lc(vol).padEnd(10);
    for (const prov of sortedProviders) {
      let cost = 0;
      if (prov.isSubscription) {
        const st = SUB_TIERS[
          Object.keys(PROVIDERS).find(k => PROVIDERS[k] === prov) || ''
        ];
        if (st) {
          cost = vol <= 200 ? st[0] : vol <= 1000 ? st[1] || st[0] : st[st.length - 1] || st[0];
        } else {
          cost = 20;
        }
      } else {
        cost = vol * prov.perImage;
      }
      row += ' | ' + pad(fmt(cost), 14);
    }
    out.push(row);
  }
  out.push('');

  // Section 4b: Break-even analysis (NEW)
  out.push('⚖️ Break-Even: When Subscription Beats Per-Image');
  out.push(SEP.repeat(50));
  const perImgProvs = sortedProviders.filter(prov => !prov.isSubscription);
  const subProvs = sortedProviders.filter(prov => prov.isSubscription);
  for (const sub of subProvs) {
    const subKey = Object.keys(PROVIDERS).find(k => PROVIDERS[k] === sub);
    if (!subKey || !SUB_TIERS[subKey]) continue;
    const subBasic = SUB_TIERS[subKey][0];
    for (const api of perImgProvs) {
      const be = Math.ceil(subBasic / api.perImage);
      if (be > 0 && be < 100000) {
        out.push('  ' + api.name + ' → ' + sub.name + ' ($' + subBasic + '/mo): ' + lc(be) + ' imgs/mo break-even');
      }
    }
  }
  out.push('');

  // Section 5: Volume scenarios at different batch sizes
  out.push('📈 Volume Scenarios at Different Batch Sizes');
  out.push(SEP.repeat(50));
  const batchScenarios = [1, 4, 8, 16, 32];
  out.push('Batch Size | Images/Mo | Cost/Mo    | Generations Needed');
  out.push('──────────┼───────────┼────────────┼───────────────────');
  for (const bs of batchScenarios) {
    const perImgForBs = p.isSubscription ? 0 : p.perImage * advMult;
    const cost = p.isSubscription
      ? (() => {
          const st = SUB_TIERS[providerKey];
          if (st) {
            return imgs <= 200 ? st[0] : imgs <= 1000 ? st[1] || st[0] : st[st.length - 1] || st[0];
          }
          return 20;
        })()
      : imgs * perImgForBs;
    const gems = Math.ceil(imgs / bs);
    out.push(
      pad(String(bs), 10) + '│ ' +
      pad(lc(imgs), 10) + '│ ' +
      pad(fmt(cost), 11) + '│ ' +
      lc(gems) + ' runs of ' + bs + ' imgs each',
    );
  }
  out.push('');
  out.push('💡 Larger batch sizes = fewer API calls. Some providers limit batch to 4-10 images per generation.');

  // Section 5b: What-If Scenarios (NEW)
  out.push('');
  out.push('🔄 What-If Scenarios:');
  out.push(SEP.repeat(50));
  if (p.isSubscription) {
    out.push('• Cut volume to 50% (' + lc(Math.round(imgs/2)) + ' imgs/mo): Save $0/mo (subscription is fixed)');
  } else {
    const halfImgs = Math.max(1, Math.round(imgs / 2));
    const halfCost = halfImgs * perImageCost;
    out.push('• Cut volume in half: Save $' + fmt(monthlyCost - halfCost) + '/mo ($' + fmt(monthlyCost) + ' → $' + fmt(halfCost) + ')');
  }
  const sd4 = PROVIDERS['stable-diffusion-4'];
  const sd4Cost = imgs * sd4.perImage;
  const currentCost = p.isSubscription ? bestTier : monthlyCost;
  const sd4Savings = currentCost - sd4Cost;
  if (sd4Savings > 0) {
    out.push('• Switch to SD 4 API ($0.003/img): $' + fmt(sd4Cost) + '/mo  (saves $' + fmt(sd4Savings) + '/mo)');
  } else {
    out.push('• Switch to SD 4 API: $' + fmt(sd4Cost) + '/mo  (already cheaper)');
  }
  if (!p.isSubscription) {
    const subAlt = sortedProviders.find(prov => prov.isSubscription);
    if (subAlt) {
      const subKey = Object.keys(PROVIDERS).find(k => PROVIDERS[k] === subAlt);
      const subBasic = subKey && SUB_TIERS[subKey] ? SUB_TIERS[subKey][0] : 10;
      if (subBasic < monthlyCost) {
        out.push('• Switch to ' + subAlt.name + ' ($' + subBasic + '/mo): saves $' + fmt(monthlyCost - subBasic) + '/mo');
      } else {
        out.push('• Switch to ' + subAlt.name + ' ($' + subBasic + '/mo): +$' + fmt(subBasic - monthlyCost) + '/mo vs pay-per-image');
      }
    }
  } else {
    const cheapestApi = sortedProviders.filter(prov => !prov.isSubscription).sort((a, b) => a.perImage - b.perImage)[0];
    if (cheapestApi) {
      const altCost = imgs * cheapestApi.perImage;
      out.push('• Drop subscription, go per-image (' + cheapestApi.name + '): $' + fmt(altCost) + '/mo  (vs $' + bestTier + '/mo)');
    }
  }
  if (p.isSubscription) {
    out.push('• Double volume to ' + lc(imgs * 2) + ' imgs/mo: $0 extra (sub is fixed)');
  } else {
    out.push('• Double volume to ' + lc(imgs * 2) + ' imgs/mo: $' + fmt(imgs * 2 * perImageCost) + '/mo');
  }

  // Section 6: Use-case recommendation (NEW)
  out.push('');
  out.push('🎯 Best Provider by Use Case:');
  out.push(SEP.repeat(50));
  out.push('• 📝 Text in images (logos, signs, UI):  → Ideogram 3 (best text rendering)');
  out.push('• 🎨 Artistic / creative work:           → Midjourney V7 (aesthetic quality)');
  out.push('• 💰 Budget is #1 concern:              → Stable Diffusion 4 ($0.003/image)');
  out.push('• 🧩 Complex multi-object prompts:      → DALL-E 4 (instruction following)');
  out.push('• 📦 Maximum volume (5000+ imgs/mo):    → Midjourney V7 Mega ($60-120/mo)');
  out.push('');
  out.push('💡 For your case (' + lc(imgs) + ' imgs/mo via ' + p.name + '):');
  if (p.perImage >= 0.08 && imgs < 500) {
    const altCost = imgs * 0.04;
    out.push('   Switch to Ideogram 3 ($0.04/img) to save $' + fmt(monthlyCost - altCost) + '/mo with similar quality.');
  } else if (p.perImage >= 0.04 && imgs < 100) {
    const altCost = imgs * 0.003;
    out.push('   At <100 imgs/mo, SD 4 API is 13x cheaper ($' + fmt(altCost) + ' vs $' + fmt(monthlyCost) + '/mo).');
  } else if (p.isSubscription && imgs < 100) {
    const altCost = imgs * 0.04;
    out.push('   Subscription is underutilized. Per-image (Ideogram 3) would be ~$' + fmt(altCost) + '/mo.');
  } else {
    out.push('   Your current choice is well-matched to your volume and quality needs.');
  }

  return out;
}

// customFn — minified JS port of calculate(). Variables: bt=bestTier, pic=perImageCost, mc=monthlyCost.
const customFn =
  "'dalle-4':{n:'DALL-E 4',pi:0.12,is:false,sr:'',q:'Highest',rs:['1024×1024','1792×1024','1024×1792'],od:1}," +
  "'dalle-3':{n:'DALL-E 3',pi:0.08,is:false,sr:'',q:'Very High',rs:['1024×1024','1792×1024','1024×1792'],od:2}," +
  "'midjourney-v7':{n:'Midjourney V7',pi:0,is:true,sr:'$10-$120/mo',q:'Best Artistic',rs:['1024×1024','2048×2048'],od:3}," +
  "'stable-diffusion-4':{n:'SD 4 (API)',pi:0.003,is:false,sr:'',q:'Good+',rs:['512×512','1024×1024','2048×2048'],od:4}," +
  "'ideogram-3':{n:'Ideogram 3',pi:0.04,is:false,sr:'',q:'Best Text',rs:['1024×1024','1280×720'],od:5}," +
  "'flux-pro':{n:'Flux Pro',pi:0.05,is:false,sr:'',q:'Excellent',rs:['1024×1024','2048×2048'],od:6}," +
  "'leonardo':{n:'Leonardo AI',pi:0,is:true,sr:'$12-$49/mo',q:'Very Good',rs:['1024×1024','1536×1536'],od:7}" +

  "var ST={mj:[10,30,60,120],leo:[12,29,49]};" +
  "var AM={standard:1,hd:1.3,ultra:1.8};" +
  "function fm(n){return '$'+n.toFixed(2)}function lc(n){return n.toLocaleString()}function pd(s,l){return s+' '.repeat(Math.max(0,l-s.length))}" +
  "var SEP3='─';" +
  "var pk=inputs.provider||'dalle-3';var p=PS[pk]||PS['dalle-3'];" +
  "var im=Math.max(1,Math.min(1e6,parseInt(inputs.imagesPerMonth)||100));" +
  "var res=inputs.resolution||p.rs[0];var bs=Math.max(1,Math.min(64,parseInt(inputs.batchSize)||1));" +
  "var advm=inputs.advancedMode||'standard';var amv=AM[advm]||1;" +
  "var o=[];" +
  "var bt=0,pic=0,mc=0;" +
  "var hdr='🎨 '+p.n+' Cost Estimate';if(advm!=='standard')hdr+=' ('+advm.toUpperCase()+' mode, '+amv+'x cost)';" +
  "o.push(hdr);o.push('');" +
  "o.push('Quality: '+p.q+' | Resolution: '+res+' | Batch: '+bs+'/gen');" +
  "o.push('Pricing: '+(p.is?'Subscription '+p.sr:'Per-Image $'+p.pi.toFixed(3)));o.push('');" +
  "o.push('💰 Cost Summary');o.push(SEP3.repeat(50));" +
  "if(p.is){" +
  "var ts=pk.indexOf('midjourney')>=0?ST.mj:ST.leo;" +
  "o.push('Pricing Model: Subscription');o.push('Monthly Sub Cost: '+p.sr);o.push('');" +
  "bt=ts[0];for(var ti=0;ti<ts.length;ti++){var t=ts[ti];" +
  "var lim=pk.indexOf('midjourney')>=0?(t<=30?200:t<=60?1000:5000):pk.indexOf('leo')>=0?(t<=12?200:t<=29?1000:999999):200;" +
  "if(im<=lim||ti===ts.length-1){bt=t;break;}}" +
  "o.push('Best Tier for '+lc(im)+' images/mo: $'+bt+'/mo');o.push('Annual: '+fm(bt*12));" +
  "}else{" +
  "pic=p.pi*amv;mc=im*pic;" +
  "o.push('Per Image: '+fm(pic));o.push('Monthly Cost ('+lc(im)+' images): '+fm(mc));" +
  "o.push('Annual Cost: '+fm(mc*12));o.push('');" +
  "o.push('Daily Avg: '+fm(mc/30)+' ('+lc(Math.round(im/30))+' images/day)');" +
  "}" +
  "o.push('');" +
  "o.push('📊 All Providers — Monthly Cost at '+lc(im)+' images/mo');o.push(SEP3.repeat(50));" +
  "var sp=[];for(var k2 in PS)sp.push(PS[k2]);sp.sort(function(a,b){return a.od-b.od;});" +
  "var ac=[];for(var i=0;i<sp.length;i++){" +
  "var pr=sp[i];var cst=0;var pk2=Object.keys(PS).find(function(kk){return PS[kk]===pr;})||'';" +
  "if(pr.is){var st2=pk2.indexOf('midjourney')>=0?ST.mj:pk2.indexOf('leo')>=0?ST.leo:null;" +
  "if(st2){cst=im<=200?st2[0]:im<=1000?(st2[1]||st2[0]):st2[st2.length-1]||st2[0];}else{cst=20;}}" +
  "else{cst=im*pr.pi;}" +
  "ac.push({n:pr.n,c:cst,is:pr.is});}" +
  "var mx=ac.reduce(function(max,c){return c.c>max.c?c:max;}).c;mx=Math.max(mx,1);" +
  "var BW=35;var ch=ac.reduce(function(min,c){return c.c<min.c?c:min;});" +
  "for(var i=0;i<ac.length;i++){var c=ac[i];var rt=c.c/mx;var isCh=c===ch;var pf=isCh?'✅ ':'   ';" +
  "var lb=c.n;if(c.is)lb+=' (sub)';var bl=Math.max(1,Math.round(rt*BW));" +
  "o.push(pf+pd(lb,21)+' '+'█'.repeat(bl)+' '.repeat(Math.max(0,BW-bl+2))+' '+fm(c.c)+(c.is?'/mo':''));" +
  "}" +
  "o.push('');" +
  "o.push('🩺 Cost Health:');o.push(SEP3.repeat(50));" +
  "var epi=p.is?(bt/Math.max(1,im)):pic;" +
  "if(epi<0.01){o.push('• 🟢 Exceptional — '+fm(epi)+'/image is 5x+ below market.');}" +
  "else if(epi<0.05){o.push('• 🟢 Competitive — '+fm(epi)+'/image is at/below market avg ($0.05).');}" +
  "else if(epi<0.10){o.push('• 🟡 Mid-market — '+fm(epi)+'/image is around the average.');}" +
  "else{o.push('• 🟠 Premium pricing — '+fm(epi)+'/image is 2x+ market rate.');}" +
  "if(p.is){" +
  "if(im>=500){o.push('• ✅ Subscription well-utilized at '+lc(im)+' images/mo.');}" +
  "else if(im>=200){o.push('• ⚠️ Subscription moderately used. Break-even met but not maximized.');}" +
  "else{o.push('• 🔴 Subscription underutilized at '+lc(im)+' images/mo. Per-image may be cheaper.');}" +
  "}else{" +
  "var sa=sp.filter(function(x){return x.is;})[0];" +
  "if(sa){var sak=Object.keys(PS).find(function(kk){return PS[kk]===sa;})||'';" +
  "var ismj=sak.indexOf('midjourney')>=0;var sl=ismj?ST.mj[0]:ST.leo[0];" +
  "var be2=Math.ceil(sl/p.pi);" +
  "if(im>=be2){o.push('• ⚠️ At '+lc(im)+' imgs/mo, '+sa.n+' ($'+sl+'/mo) would save money.');}" +
  "else{o.push('• ✅ Per-image is correct for '+lc(im)+' imgs/mo. Break-even: '+lc(be2)+' imgs.');}}" +
  "}" +
  "o.push('');" +
  "o.push('📋 Subscription vs API — Price Comparison');o.push(SEP3.repeat(50));" +
  "var vols2=[50,200,500,1000,5000];" +
  "var th='Volume'.padEnd(10);for(var i=0;i<sp.length;i++)th+=' | '+pd(sp[i].n,14);o.push(th);" +
  "o.push('─'.repeat(th.length));" +
  "for(var vi=0;vi<vols2.length;vi++){var vl=vols2[vi];var row=lc(vl).padEnd(10);" +
  "for(var pi2=0;pi2<sp.length;pi2++){var pr2=sp[pi2];var cst2=0;" +
  "if(pr2.is){var st3=(Object.keys(PS).find(function(kk){return PS[kk]===pr2;})||'').indexOf('midjourney')>=0?ST.mj:ST.leo;" +
  "if(st3){cst2=vl<=200?st3[0]:vl<=1000?(st3[1]||st3[0]):st3[st3.length-1]||st3[0];}else{cst2=20;}}" +
  "else{cst2=vl*pr2.pi;}" +
  "row+=' | '+pd(fm(cst2),14);}" +
  "o.push(row);}" +
  "o.push('');" +
  "o.push('⚖️ Break-Even: When Subscription Beats Per-Image');o.push(SEP3.repeat(50));" +
  "var pap=sp.filter(function(x){return !x.is;});" +
  "var sbp=sp.filter(function(x){return x.is;});" +
  "for(var si=0;si<sbp.length;si++){var sub=sbp[si];" +
  "var sk=Object.keys(PS).find(function(kk){return PS[kk]===sub;})||'';" +
  "if(!sk)continue;var ismj2=sk.indexOf('midjourney')>=0;var sb=ismj2?ST.mj[0]:ST.leo[0];" +
  "for(var ai=0;ai<pap.length;ai++){var api=pap[ai];" +
  "var be3=Math.ceil(sb/api.pi);if(be3>0&&be3<100000){" +
  "o.push('  '+api.n+' → '+sub.n+' ($'+sb+'/mo): '+lc(be3)+' imgs/mo break-even');" +
  "}}}" +
  "}" +
  "o.push('');" +
  "o.push('📈 Volume Scenarios at Different Batch Sizes');o.push(SEP3.repeat(50));" +
  "var bss=[1,4,8,16,32];" +
  "o.push('Batch Size | Images/Mo | Cost/Mo    | Generations Needed');" +
  "o.push('──────────┼───────────┼────────────┼───────────────────');" +
  "for(var bi=0;bi<bss.length;bi++){var bs2=bss[bi];var pic2=p.is?0:p.pi*amv;" +
  "var cst3=p.is?bt:im*pic2;var rns=Math.ceil(im/bs2);" +
  "o.push(pd(String(bs2),10)+'│ '+pd(lc(im),10)+'│ '+pd(fm(cst3),11)+'│ '+lc(rns)+' runs of '+bs2+' imgs each');}" +
  "o.push('');o.push('💡 Larger batch sizes = fewer API calls. Some providers limit batch to 4-10 images per generation.');" +
  "o.push('');" +
  "o.push('🔄 What-If Scenarios:');o.push(SEP3.repeat(50));" +
  "if(p.is){o.push('• Cut volume to 50% ('+lc(Math.round(im/2))+' imgs/mo): Save $0/mo (subscription is fixed)');}" +
  "else{var hi=Math.max(1,Math.round(im/2));var hc=hi*pic;o.push('• Cut volume in half: Save $'+fm(mc-hc)+'/mo ($'+fm(mc)+' → $'+fm(hc)+')');}" +
  "var sdc=im*0.003;var cur=p.is?bt:mc;var sav=cur-sdc;" +
  "if(sav>0){o.push('• Switch to SD 4 API ($0.003/img): $'+fm(sdc)+'/mo  (saves $'+fm(sav)+'/mo)');}" +
  "else{o.push('• Switch to SD 4 API: $'+fm(sdc)+'/mo  (already cheaper)');}" +
  "if(!p.is){" +
  "var sa2=sp.filter(function(x){return x.is;})[0];" +
  "if(sa2){var sak2=Object.keys(PS).find(function(kk){return PS[kk]===sa2;})||'';" +
  "var ismj3=sak2.indexOf('midjourney')>=0;var sb2=ismj3?ST.mj[0]:ST.leo[0];" +
  "if(sb2<mc){o.push('• Switch to '+sa2.n+' ($'+sb2+'/mo): saves $'+fm(mc-sb2)+'/mo');}" +
  "else{o.push('• Switch to '+sa2.n+' ($'+sb2+'/mo): +$'+fm(sb2-mc)+'/mo vs pay-per-image');}}" +
  "}else{" +
  "var cap=sp.filter(function(x){return !x.is;}).sort(function(a,b){return a.pi-b.pi;})[0];" +
  "if(cap){var ac2=im*cap.pi;o.push('• Drop subscription, go per-image ('+cap.n+'): $'+fm(ac2)+'/mo  (vs $'+bt+'/mo)');}}" +
  "}" +
  "if(p.is){o.push('• Double volume to '+lc(im*2)+' imgs/mo: $0 extra (sub is fixed)');}" +
  "else{o.push('• Double volume to '+lc(im*2)+' imgs/mo: $'+fm(im*2*pic)+'/mo');}" +
  "o.push('');" +
  "o.push('🎯 Best Provider by Use Case:');o.push(SEP3.repeat(50));" +
  "o.push('• 📝 Text in images (logos, signs, UI):  → Ideogram 3 (best text rendering)');" +
  "o.push('• 🎨 Artistic / creative work:           → Midjourney V7 (aesthetic quality)');" +
  "o.push('• 💰 Budget is #1 concern:              → Stable Diffusion 4 ($0.003/image)');" +
  "o.push('• 🧩 Complex multi-object prompts:      → DALL-E 4 (instruction following)');" +
  "o.push('• 📦 Maximum volume (5000+ imgs/mo):    → Midjourney V7 Mega ($60-120/mo)');" +
  "o.push('');" +
  "o.push('💡 For your case ('+lc(im)+' imgs/mo via '+p.n+'):');" +
  "if(p.pi>=0.08&&im<500){var ac3=im*0.04;o.push('   Switch to Ideogram 3 ($0.04/img) to save $'+fm(mc-ac3)+'/mo with similar quality.');}" +
  "else if(p.pi>=0.04&&im<100){var ac3=im*0.003;o.push('   At <100 imgs/mo, SD 4 API is 13x cheaper ($'+fm(ac3)+' vs $'+fm(mc)+'/mo).');}" +
  "else if(p.is&&im<100){var ac3=im*0.04;o.push('   Subscription is underutilized. Per-image (Ideogram 3) would be ~$'+fm(ac3)+'/mo.');}" +
  "else{o.push('   Your current choice is well-matched to your volume and quality needs.');}" +
  "return o;";

const engine: ToolEngine = {
  slug: 'solopreneur-ai-image-cost-calculator',
  title: 'AI Image Generation Cost Calculator',
  description: 'Compare costs across 7 AI image providers (DALL-E 4/3, Midjourney V7, SD 4, Ideogram 3, Flux Pro, Leonardo AI). Subscription vs API pricing, break-even analysis, what-if scenarios, and use-case recommendations.',
  category: 'B',
  inputs: [
    { name: 'provider', label: 'Provider', placeholder: '', type: 'select', options: ['dalle-4', 'dalle-3', 'midjourney-v7', 'stable-diffusion-4', 'ideogram-3', 'flux-pro', 'leonardo'] },
    { name: 'imagesPerMonth', label: 'Images per Month', placeholder: 'e.g. 100', type: 'number' },
    { name: 'resolution', label: 'Resolution', placeholder: '', type: 'select', options: ['1024×1024', '1792×1024', '1024×1792', '2048×2048', '512×512', '1280×720', '1536×1536'] },
    { name: 'batchSize', label: 'Batch Size (Images per Call)', placeholder: 'e.g. 1', type: 'number' },
    { name: 'advancedMode', label: 'Quality Mode', placeholder: '', type: 'select', options: ['standard', 'hd', 'ultra'] },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) { return calculate(inputs); },
  staticExamples: [
    '\n🎨 DALL-E 3 Cost Estimate\n\nQuality: Very High | Resolution: 1024×1024 | Batch: 1/gen\nPricing: Per-Image $0.080\n\n💰 Cost Summary\n──────────────────────────────────────────────────\nPer Image: $0.08\nMonthly Cost (100 images): $8.00\nAnnual Cost: $96.00\n\nDaily Avg: $0.27 (3 images/day)\n\n📊 All Providers — Monthly Cost at 100 images/mo\n──────────────────────────────────────────────────\n   DALL-E 4              ███████████████████████████████████   $12.00\n   DALL-E 3              ███████████████████████               $8.00\n   Midjourney V7 (sub)   █████████████████████████████         $10.00/mo\n✅ SD 4 (API)            █                                     $0.30\n   Ideogram 3            ████████████                          $4.00\n   Flux Pro              ███████████████                       $5.00\n   Leonardo AI (sub)     ███████████████████████████████████   $12.00/mo\n\n🩺 Cost Health:\n──────────────────────────────────────────────────\n• 🟡 Mid-market — $0.08/image is around the average.\n• ✅ Per-image is correct for 100 imgs/mo. Break-even: 125 imgs.\n\n📋 Subscription vs API — Price Comparison\n──────────────────────────────────────────────────\nVolume     | DALL-E 4       | DALL-E 3       | Midjourney V7  | SD 4 (API)     | Ideogram 3     | Flux Pro       | Leonardo AI   \n─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────\n50         | $6.00          | $4.00          | $10.00         | $0.15          | $2.00          | $2.50          | $12.00        \n200        | $24.00         | $16.00         | $10.00         | $0.60          | $8.00          | $10.00         | $12.00        \n500        | $60.00         | $40.00         | $30.00         | $1.50          | $20.00         | $25.00         | $29.00        \n1,000      | $120.00        | $80.00         | $30.00         | $3.00          | $40.00         | $50.00         | $29.00        \n5,000      | $600.00        | $400.00        | $120.00        | $15.00         | $200.00        | $250.00        | $49.00        \n\n⚖️ Break-Even: When Subscription Beats Per-Image\n──────────────────────────────────────────────────\n  DALL-E 4 → Midjourney V7 ($10/mo): 84 imgs/mo break-even\n  DALL-E 3 → Midjourney V7 ($10/mo): 125 imgs/mo break-even\n  SD 4 (API) → Midjourney V7 ($10/mo): 3,334 imgs/mo break-even\n  Ideogram 3 → Midjourney V7 ($10/mo): 250 imgs/mo break-even\n  Flux Pro → Midjourney V7 ($10/mo): 200 imgs/mo break-even\n  DALL-E 4 → Leonardo AI ($12/mo): 100 imgs/mo break-even\n  DALL-E 3 → Leonardo AI ($12/mo): 150 imgs/mo break-even\n  SD 4 (API) → Leonardo AI ($12/mo): 4,000 imgs/mo break-even\n  Ideogram 3 → Leonardo AI ($12/mo): 300 imgs/mo break-even\n  Flux Pro → Leonardo AI ($12/mo): 240 imgs/mo break-even\n\n📈 Volume Scenarios at Different Batch Sizes\n──────────────────────────────────────────────────\nBatch Size | Images/Mo | Cost/Mo    | Generations Needed\n──────────┼───────────┼────────────┼───────────────────\n1         │ 100       │ $8.00      │ 100 runs of 1 imgs each\n4         │ 100       │ $8.00      │ 25 runs of 4 imgs each\n8         │ 100       │ $8.00      │ 13 runs of 8 imgs each\n16        │ 100       │ $8.00      │ 7 runs of 16 imgs each\n32        │ 100       │ $8.00      │ 4 runs of 32 imgs each\n\n💡 Larger batch sizes = fewer API calls. Some providers limit batch to 4-10 images per generation.\n\n🔄 What-If Scenarios:\n──────────────────────────────────────────────────\n• Cut volume in half: Save $$4.00/mo ($$8.00 → $$4.00)\n• Switch to SD 4 API ($0.003/img): $$0.30/mo  (saves $$7.70/mo)\n• Switch to Midjourney V7 ($10/mo): +$$2.00/mo vs pay-per-image\n• Double volume to 200 imgs/mo: $$16.00/mo\n\n🎯 Best Provider by Use Case:\n──────────────────────────────────────────────────\n• 📝 Text in images (logos, signs, UI):  → Ideogram 3 (best text rendering)\n• 🎨 Artistic / creative work:           → Midjourney V7 (aesthetic quality)\n• 💰 Budget is #1 concern:              → Stable Diffusion 4 ($0.003/image)\n• 🧩 Complex multi-object prompts:      → DALL-E 4 (instruction following)\n• 📦 Maximum volume (5000+ imgs/mo):    → Midjourney V7 Mega ($60-120/mo)\n\n💡 For your case (100 imgs/mo via DALL-E 3):\n   Switch to Ideogram 3 ($0.04/img) to save $$4.00/mo with similar quality.',
    '🔄 What-If Scenarios:\n──────────────────────────────────────────────────\n• Cut volume in half: Save $4.00/mo ($8.00 → $4.00)\n• Switch to SD 4 API ($0.003/img): $0.30/mo  (saves $7.70/mo)\n• Switch to Midjourney V7 ($10/mo): +$2.00/mo vs pay-per-image\n• Double volume to 200 imgs/mo: $16.00/mo\n\n🎯 Best Provider by Use Case:\n──────────────────────────────────────────────────\n• 📝 Text in images (logos, signs, UI):  → Ideogram 3 (best text rendering)\n• 🎨 Artistic / creative work:           → Midjourney V7 (aesthetic quality)\n• 💰 Budget is #1 concern:              → Stable Diffusion 4 ($0.003/image)\n• 🧩 Complex multi-object prompts:      → DALL-E 4 (instruction following)\n• 📦 Maximum volume (5000+ imgs/mo):    → Midjourney V7 Mega ($60-120/mo)\n\n💡 For your case (100 imgs/mo via DALL-E 3):\n   At <100 imgs/mo, SD 4 API is 13x cheaper ($0.30 vs $8.00/mo).',
  ],
  faq: [
    { q: 'Which AI image generator is cheapest in 2026?', a: 'Stable Diffusion 4 via API at $0.003/image is by far the cheapest — $3/mo for 1000 images. For subscription-based, Midjourney V7 at $10-120/mo and Leonardo AI at $12-49/mo become the cheapest at higher volumes (200+ images/month). DALL-E 3 ($0.08) and Ideogram 3 ($0.04) are the mid-range per-image options.' },
    { q: 'Should I pay per image or use a subscription?', a: 'For under 100 images/month: pay-per-image (DALL-E 3 or SD 4) is cheapest. For 100-500/month: Midjourney Basic ($10/mo) or Ideogram 3. For 500-2000/month: Midjourney Pro ($30/mo) or Leonardo ($29/mo). For 5,000+/month: Midjourney Mega ($60-120/mo) or self-hosted SD 4. Subscriptions offer unlimited or high-volume relaxed generation.' },
    { q: 'Which provider is best for text in images?', a: 'Ideogram 3 is the undisputed leader for text rendering in images (logos, signs, UI mockups). Flux Pro is excellent for text. DALL-E 4 has significantly improved text accuracy. Midjourney V7 still struggles with longer text strings. For any image requiring readable text, choose Ideogram 3 first.' },
    { q: 'Can I use AI-generated images commercially?', a: 'Yes, for all major platforms. DALL-E (OpenAI) and Midjourney grant full commercial rights to generated images. Stable Diffusion models vary by license — check the specific model. Leonardo AI grants commercial rights on paid plans. Always review the latest terms of service, especially for trademark use.' },
    { q: 'What resolution should I choose for my use case?', a: 'For web/social media: 1024x1024 is sufficient. For print/magazines: 2048x2048 or higher. For widescreen/banners: 1792x1024 (DALL-E). For mobile stories: 1024x1792 (DALL-E). Note: DALL-E 3/4 charge the same for all resolutions, making HD the default choice if quality matters.' },
    { q: 'How does Midjourney V7 compare to DALL-E 4?', a: 'Midjourney V7 produces more aesthetically pleasing, artistic images with superior lighting and composition — preferred by designers and artists. DALL-E 4 excels at following complex, multi-object prompts and renders text more accurately. For creative/artistic work, Midjourney wins. For precise, instruction-following commercial work, DALL-E 4 is better.' },
    { q: 'What is the best provider for solopreneurs on a budget?', a: 'For absolute minimum cost: Stable Diffusion 4 API at $0.003/image (5000 images = $15/mo). For best quality/cost balance: Ideogram 3 at $0.04/image (500 images = $20/mo). For unlimited creative freedom: Midjourney V7 Basic at $10/mo. Most solopreneurs benefit from a combo: Midjourney for creative + Ideogram for text-heavy images.' },
  ],
  howToUse: [
    'Select your preferred AI image generation provider from the 7 options.',
    'Enter your estimated monthly image generation volume.',
    'Choose your target resolution — higher resolutions may use more credits on some platforms.',
    'Set the batch size (images per API call) to optimize generation throughput.',
    'Pick standard, HD, or ultra quality mode — higher quality multiplies cost by 1.3x-1.8x.',
    'Review the bar chart, break-even analysis, and use-case recommendations to find the best deal for your needs.',
  ],
  dataLastUpdated: PRICING.lastUpdated,
};

registerEngine(engine);

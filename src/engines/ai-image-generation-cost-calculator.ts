import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

interface ProviderInfo {
  name: string;
  perImage: number;
  isSubscription: boolean;
  subRange: string;
  quality: string;
  resolutions: string[];
  order: number;
}

const PROVIDERS: Record<string, ProviderInfo> = {
  'dalle-4': { name: 'DALL-E 4', perImage: 0.12, isSubscription: false, subRange: '', quality: 'Highest', resolutions: ['1024×1024', '1792×1024', '1024×1792'], order: 1 },
  'dalle-3': { name: 'DALL-E 3', perImage: 0.08, isSubscription: false, subRange: '', quality: 'Very High', resolutions: ['1024×1024', '1792×1024', '1024×1792'], order: 2 },
  'midjourney-v7': { name: 'Midjourney V7', perImage: 0, isSubscription: true, subRange: '$10-$120/mo', quality: 'Best Artistic', resolutions: ['1024×1024', '2048×2048'], order: 3 },
  'stable-diffusion-4': { name: 'SD 4 (API)', perImage: 0.003, isSubscription: false, subRange: '', quality: 'Good+', resolutions: ['512×512', '1024×1024', '2048×2048'], order: 4 },
  'ideogram-3': { name: 'Ideogram 3', perImage: 0.04, isSubscription: false, subRange: '', quality: 'Best Text', resolutions: ['1024×1024', '1280×720'], order: 5 },
  'flux-pro': { name: 'Flux Pro', perImage: 0.05, isSubscription: false, subRange: '', quality: 'Excellent', resolutions: ['1024×1024', '2048×2048'], order: 6 },
  'leonardo': { name: 'Leonardo AI', perImage: 0, isSubscription: true, subRange: '$12-$49/mo', quality: 'Very Good', resolutions: ['1024×1024', '1536×1536'], order: 7 },
};

// Subscription providers estimated cost tiers
const SUB_TIERS: Record<string, number[]> = {
  'midjourney-v7': [10, 30, 60, 120],
  'leonardo': [12, 29, 49],
};

// Advanced mode multipliers
const ADVANCED_MULT: Record<string, number> = {
  'standard': 1,
  'hd': 1.3,
  'ultra': 1.8,
};

const PRESETS: Record<string, Record<string, string>> = {
  'Solopreneur': {
    provider: 'dalle-3', imagesPerMonth: '100', resolution: '1024×1024', batchSize: '1', advancedMode: 'standard',
  },
  'Content Creator': {
    provider: 'midjourney-v7', imagesPerMonth: '500', resolution: '2048×2048', batchSize: '4', advancedMode: 'standard',
  },
  'Design Agency': {
    provider: 'dalle-4', imagesPerMonth: '1000', resolution: '1024×1024', batchSize: '4', advancedMode: 'hd',
  },
  'Budget Hacker': {
    provider: 'stable-diffusion-4', imagesPerMonth: '5000', resolution: '512×512', batchSize: '8', advancedMode: 'standard',
  },
  'Best Text Logos': {
    provider: 'ideogram-3', imagesPerMonth: '300', resolution: '1024×1024', batchSize: '2', advancedMode: 'standard',
  },
  'High-End Artistic': {
    provider: 'flux-pro', imagesPerMonth: '800', resolution: '2048×2048', batchSize: '2', advancedMode: 'hd',
  },
};

function fmt(n: number): string { return '$' + n.toFixed(2); }
function lc(n: number): string { return n.toLocaleString(); }
function pad(s: string, len: number): string { return s + ' '.repeat(Math.max(0, len - s.length)); }
const SEP = '─';

function bar(pct: number, width: number): string {
  const w = Math.max(1, Math.round(pct * width));
  return '█'.repeat(w) + '░'.repeat(Math.max(0, width - w));
}

function calculate(inputs: Record<string, string>): string[] {
  const providerKey = inputs.provider || 'dalle-3';
  const p = PROVIDERS[providerKey] || PROVIDERS['dalle-3'];
  const imgs = Math.max(1, Math.min(1000000, parseInt(inputs.imagesPerMonth) || 100));
  const resolution = inputs.resolution || p.resolutions[0];
  const batchSize = Math.max(1, Math.min(64, parseInt(inputs.batchSize) || 1));
  const advancedMode = inputs.advancedMode || 'standard';
  const advMult = ADVANCED_MULT[advancedMode] || 1;

  const out: string[] = [];

  // Section 1: Header with provider info + pricing model
  let header = '\u{1F3A8} ' + p.name + ' Cost Estimate';
  if (advancedMode !== 'standard') {
    header += ' (' + advancedMode.toUpperCase() + ' mode, ' + advMult + 'x cost)';
  }
  out.push(header);
  out.push('');
  out.push('Quality: ' + p.quality + ' | Resolution: ' + resolution + ' | Batch: ' + batchSize + '/gen');
  out.push('Pricing: ' + (p.isSubscription ? 'Subscription ' + p.subRange : 'Per-Image $' + p.perImage.toFixed(3)));
  out.push('');

  // Section 2: Cost Summary
  out.push('\u{1F4B0} Cost Summary');
  out.push(SEP.repeat(50));
  if (p.isSubscription) {
    const tiers = SUB_TIERS[providerKey] || [10, 30, 60];
    out.push('Pricing Model: Subscription');
    out.push('Monthly Sub Cost: ' + p.subRange);
    out.push('');

    // Show which tier fits based on volume
    let bestTier = tiers[0];
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
    const perImageCost = p.perImage * advMult;
    const monthlyCost = imgs * perImageCost;
    out.push('Per Image: ' + fmt(perImageCost));
    out.push('Monthly Cost (' + lc(imgs) + ' images): ' + fmt(monthlyCost));
    out.push('Annual Cost: ' + fmt(monthlyCost * 12));
    out.push('');

    // Per-day breakdown
    const daily = monthlyCost / 30;
    out.push('Daily Avg: ' + fmt(daily) + ' (' + lc(Math.round(imgs / 30)) + ' images/day)');
  }
  out.push('');

  // Section 3: Bar Chart — all providers at given volume
  out.push('\u{1F4CA} All Providers — Monthly Cost at ' + lc(imgs) + ' images/mo');
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
        cost = 20; // fallback
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
    let label = c.name;
    if (c.isSub) label += ' (sub)';
    const isCheapest = c === cheapest;
    const barChar = isCheapest ? '░' : '█';
    const badge = isCheapest ? ' 🏆' : '';
    const barLen = Math.max(1, Math.round(ratio * BAR_WIDTH));
    const barStr = barChar.repeat(barLen) + ' '.repeat(Math.max(0, BAR_WIDTH - barLen + 2));
    out.push(pad(label, 22) + ' ' + barStr + ' ' + fmt(c.cost) + (c.isSub ? '/mo' : '') + badge);
  }
  out.push('');

  // Section 4: Subscription vs API comparison table
  out.push('\u{1F4CB} Subscription vs API — Price Comparison');
  out.push(SEP.repeat(50));
  const volumes = [50, 200, 500, 1000, 5000];

  // Header row
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

  // Section 5: Volume scenarios at different batch sizes
  out.push('\u{1F4C8} Volume Scenarios at Different Batch Sizes');
  out.push(SEP.repeat(50));
  const batchScenarios = [1, 4, 8, 16, 32];
  out.push('Batch Size | Images/Mo | Cost/Mo    | Generations Needed');
  out.push('──────────┼───────────┼────────────┼───────────────────');
  for (const bs of batchScenarios) {
    const perImageCost = p.isSubscription ? 0 : p.perImage * advMult;
    const cost = p.isSubscription
      ? (() => {
          const st = SUB_TIERS[providerKey];
          if (st) {
            return imgs <= 200 ? st[0] : imgs <= 1000 ? st[1] || st[0] : st[st.length - 1] || st[0];
          }
          return 20;
        })()
      : imgs * perImageCost;
    const gems = Math.ceil(imgs / bs);
    out.push(
      pad(String(bs), 10) + '│ ' +
      pad(lc(imgs), 10) + '│ ' +
      pad(fmt(cost), 11) + '│ ' +
      lc(gems) + ' runs of ' + bs + ' imgs each',
    );
  }
  out.push('');
  out.push('\u{1F4A1} Larger batch sizes = fewer API calls. Some providers limit batch to 4-10 images per generation.');

  return out;
}

// customFn — exact sync with calculate()
const customFn =
  "var PS={" +
  "'dalle-4':{n:'DALL-E 4',pi:0.12,is:false,sr:'',q:'Highest',rs:['1024×1024','1792×1024','1024×1792'],od:1}," +
  "'dalle-3':{n:'DALL-E 3',pi:0.08,is:false,sr:'',q:'Very High',rs:['1024×1024','1792×1024','1024×1792'],od:2}," +
  "'midjourney-v7':{n:'Midjourney V7',pi:0,is:true,sr:'$10-$120/mo',q:'Best Artistic',rs:['1024×1024','2048×2048'],od:3}," +
  "'stable-diffusion-4':{n:'SD 4 (API)',pi:0.003,is:false,sr:'',q:'Good+',rs:['512×512','1024×1024','2048×2048'],od:4}," +
  "'ideogram-3':{n:'Ideogram 3',pi:0.04,is:false,sr:'',q:'Best Text',rs:['1024×1024','1280×720'],od:5}," +
  "'flux-pro':{n:'Flux Pro',pi:0.05,is:false,sr:'',q:'Excellent',rs:['1024×1024','2048×2048'],od:6}," +
  "'leonardo':{n:'Leonardo AI',pi:0,is:true,sr:'$12-$49/mo',q:'Very Good',rs:['1024×1024','1536×1536'],od:7}" +
  "};" +
  "var ST={mj:[10,30,60,120],leo:[12,29,49]};" +
  "var AM={standard:1,hd:1.3,ultra:1.8};" +
  "function fm(n){return '$'+n.toFixed(2)}function lc(n){return n.toLocaleString()}function pd(s,l){return s+' '.repeat(Math.max(0,l-s.length))}" +
  "var SEP3='\\u2500';" +
  "var pk=inputs.provider||'dalle-3';var p=PS[pk]||PS['dalle-3'];" +
  "var im=Math.max(1,Math.min(1e6,parseInt(inputs.imagesPerMonth)||100));" +
  "var res=inputs.resolution||p.rs[0];var bs=Math.max(1,Math.min(64,parseInt(inputs.batchSize)||1));" +
  "var advm=inputs.advancedMode||'standard';var amv=AM[advm]||1;" +
  "var o=[];" +
  "var hdr='\\u{1F3A8} '+p.n+' Cost Estimate';if(advm!=='standard')hdr+=' ('+advm.toUpperCase()+' mode, '+amv+'x cost)';" +
  "o.push(hdr);o.push('');" +
  "o.push('Quality: '+p.q+' | Resolution: '+res+' | Batch: '+bs+'/gen');" +
  "o.push('Pricing: '+(p.is?'Subscription '+p.sr:'Per-Image $'+p.pi.toFixed(3)));o.push('');" +
  "o.push('\\u{1F4B0} Cost Summary');o.push(SEP3.repeat(50));" +
  "if(p.is){" +
  "var ts=pk.indexOf('midjourney')>=0?ST.mj:ST.leo;" +
  "o.push('Pricing Model: Subscription');o.push('Monthly Sub Cost: '+p.sr);o.push('');" +
  "var bt=ts[0];for(var ti=0;ti<ts.length;ti++){var t=ts[ti];" +
  "var lim=pk.indexOf('midjourney')>=0?(t<=30?200:t<=60?1000:5000):pk.indexOf('leo')>=0?(t<=12?200:t<=29?1000:999999):200;" +
  "if(im<=lim||ti===ts.length-1){bt=t;break;}}" +
  "o.push('Best Tier for '+lc(im)+' images/mo: $'+bt+'/mo');o.push('Annual: '+fm(bt*12));" +
  "}else{" +
  "var pic=p.pi*amv;var mc=im*pic;" +
  "o.push('Per Image: '+fm(pic));o.push('Monthly Cost ('+lc(im)+' images): '+fm(mc));" +
  "o.push('Annual Cost: '+fm(mc*12));o.push('');" +
  "o.push('Daily Avg: '+fm(mc/30)+' ('+lc(Math.round(im/30))+' images/day)');" +
  "}" +
  "o.push('');" +
  "o.push('\\u{1F4CA} All Providers — Monthly Cost at '+lc(im)+' images/mo');o.push(SEP3.repeat(50));" +
  "var sp=[];for(var k2 in PS)sp.push(PS[k2]);sp.sort(function(a,b){return a.od-b.od;});" +
  "var ac=[];for(var i=0;i<sp.length;i++){" +
  "var pr=sp[i];var cst=0;var pk2=Object.keys(PS).find(function(kk){return PS[kk]===pr;})||'';" +
  "if(pr.is){var st2=pk2.indexOf('midjourney')>=0?ST.mj:pk2.indexOf('leo')>=0?ST.leo:null;" +
  "if(st2){cst=im<=200?st2[0]:im<=1000?(st2[1]||st2[0]):st2[st2.length-1]||st2[0];}else{cst=20;}}" +
  "else{cst=im*pr.pi;}" +
  "ac.push({n:pr.n,c:cst,is:pr.is});}" +
  "var mx=ac.reduce(function(max,c){return c.c>max.c?c:max;}).c;mx=Math.max(mx,1);" +
  "var BW=35;var ch=ac.reduce(function(min,c){return c.c<min.c?c:min;});" +
  "for(var i=0;i<ac.length;i++){var c=ac[i];var rt=c.c/mx;var lb=c.n;if(c.is)lb+=' (sub)';" +
  "var isCh=c===ch;var bch=isCh?'\\u2591':'\\u2588';var bl=Math.max(1,Math.round(rt*BW));" +
  "o.push(pd(lb,22)+' '+bch.repeat(bl)+' '.repeat(Math.max(0,BW-bl+2))+' '+fm(c.c)+(c.is?'/mo':''));}" +
  "o.push('');" +
  "o.push('\\u{1F4CB} Subscription vs API — Price Comparison');o.push(SEP3.repeat(50));" +
  "var vols2=[50,200,500,1000,5000];" +
  "var th='Volume'.padEnd(10);for(var i=0;i<sp.length;i++)th+=' | '+pd(sp[i].n,14);o.push(th);" +
  "o.push('\\u2500'.repeat(th.length));" +
  "for(var vi=0;vi<vols2.length;vi++){var vl=vols2[vi];var row=lc(vl).padEnd(10);" +
  "for(var pi2=0;pi2<sp.length;pi2++){var pr2=sp[pi2];var cst2=0;" +
  "if(pr2.is){var st3=(Object.keys(PS).find(function(kk){return PS[kk]===pr2;})||'').indexOf('midjourney')>=0?ST.mj:ST.leo;" +
  "if(st3){cst2=vl<=200?st3[0]:vl<=1000?(st3[1]||st3[0]):st3[st3.length-1]||st3[0];}else{cst2=20;}}" +
  "else{cst2=vl*pr2.pi;}" +
  "row+=' | '+pd(fm(cst2),14);}" +
  "o.push(row);}" +
  "o.push('');" +
  "o.push('\\u{1F4C8} Volume Scenarios at Different Batch Sizes');o.push(SEP3.repeat(50));" +
  "var bss=[1,4,8,16,32];" +
  "o.push('Batch Size | Images/Mo | Cost/Mo    | Generations Needed');" +
  "o.push('\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u253C\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u253C\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u253C\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500');" +
  "for(var bi=0;bi<bss.length;bi++){var bs2=bss[bi];var pic2=p.is?0:p.pi*amv;" +
  "var cst3=p.is?bt:im*pic2;var rns=Math.ceil(im/bs2);" +
  "o.push(pd(String(bs2),10)+'\\u2502 '+pd(lc(im),10)+'\\u2502 '+pd(fm(cst3),11)+'\\u2502 '+lc(rns)+' runs of '+bs2+' imgs each');}" +
  "o.push('');o.push('\\u{1F4A1} Larger batch sizes = fewer API calls. Some providers limit batch to 4-10 images per generation.');" +
  "return o;";

const engine: ToolEngine = {
  slug: 'solopreneur-ai-image-cost-calculator',
  title: 'AI Image Generation Cost Calculator',
  description: 'Compare costs across 7 AI image providers (DALL-E 4/3, Midjourney V7, SD 4, Ideogram 3, Flux Pro, Leonardo AI). Subscription vs API pricing, resolution tiers, bar chart comparison, and volume scenarios.',
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
    '\u{1F3A8} DALL-E 3 Cost Estimate\n\nQuality: Very High | Resolution: 1024×1024 | Batch: 1/gen\nPricing: Per-Image $0.080\n\n\u{1F4B0} Cost Summary\n──────────────────────────────────────────────────\nPer Image: $0.08\nMonthly Cost (100 images): $8.00\nAnnual Cost: $96.00\n\nDaily Avg: $0.27 (3 images/day)\n\n\u{1F4CA} All Providers — Monthly Cost at 100 images/mo\n──────────────────────────────────────────────────\nDALL-E 4              ████████████████████████████████    $12.00\nDALL-E 3              ██████████████████████              $8.00\nMidjourney V7 (sub)   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ $10.00/mo\nSD 4 (API)            █                                  $0.30\nIdeogram 3            ███████████                        $4.00\nFlux Pro              ██████████████                     $5.00\nLeonardo AI (sub)     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ $12.00/mo\n\n\u{1F4CB} Subscription vs API — Price Comparison\n──────────────────────────────────────────────────\nVolume     | DALL-E 4       | DALL-E 3       | Midjourney V7  | SD 4 (API)     | Ideogram 3     | Flux Pro       | Leonardo AI\n───────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────────\n50         | $6.00          | $4.00          | $10.00         | $0.15          | $2.00          | $2.50          | $12.00\n200        | $24.00         | $16.00         | $10.00         | $0.60          | $8.00          | $10.00         | $12.00\n500        | $60.00         | $40.00         | $30.00         | $1.50          | $20.00         | $25.00         | $29.00\n1,000       | $120.00        | $80.00         | $30.00         | $3.00          | $40.00         | $50.00         | $29.00\n5,000       | $600.00        | $400.00        | $60.00         | $15.00         | $200.00        | $250.00        | $49.00\n\n\u{1F4C8} Volume Scenarios at Different Batch Sizes\n──────────────────────────────────────────────────\nBatch Size | Images/Mo | Cost/Mo    | Generations Needed\n──────────┼───────────┼────────────┼───────────────────\n1         │ 100       │ $8.00      │ 100 runs of 1 imgs each\n4         │ 100       │ $8.00      │ 25 runs of 4 imgs each\n8         │ 100       │ $8.00      │ 13 runs of 8 imgs each\n16        │ 100       │ $8.00      │ 7 runs of 16 imgs each\n32        │ 100       │ $8.00      │ 4 runs of 32 imgs each\n\n\u{1F4A1} Larger batch sizes = fewer API calls. Some providers limit batch to 4-10 images per generation.',
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
    'Review the bar chart to compare all 7 providers at your volume, and use the comparison table to find the best deal for your needs.',
  ],
};

registerEngine(engine);

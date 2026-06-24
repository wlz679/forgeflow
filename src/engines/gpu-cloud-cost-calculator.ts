import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';
import PRICING from '../data/ai-pricing.json';

interface ProviderInfo {
  name: string;
  spotMult: number;
  reservedMult: number;
  rates: Record<string, number>;
  order: number;
}

const GPU_NAMES: Record<string, string> = {
  'H200': 'H200 141GB',
  'H100': 'H100 80GB',
  'A100': 'A100 80GB',
  'L40S': 'L40S 48GB',
  'RTX4090': 'RTX 4090 24GB',
  'A6000': 'RTX A6000 48GB',
};

const PROVIDERS: Record<string, ProviderInfo> = PRICING.gpu.providers as any;

// Storage cost per GB per month (attached SSD)
const STORAGE_COST_PER_GB = PRICING.gpu.storagePerGB;

// Networking egress cost per GB
const NETWORK_EGRESS_PER_GB = PRICING.gpu.egressPerGB;

// Storage tiers (GB)
const STORAGE_SIZES = [100, 500, 1000, 5000];

// Pricing tier labels
const TIER_LABELS: Record<string, string> = {
  'on-demand': 'On-Demand',
  'spot': 'Spot/Preemptible',
  'reserved': 'Reserved (1yr)',
};

const PRESETS: Record<string, Record<string, string>> = {
  'Budget Single GPU': {
    provider: 'vastai', gpuType: 'RTX4090', gpuCount: '1', hoursPerDay: '12', pricingTier: 'spot', includeStorage: 'yes',
  },
  'Standard Dev Box': {
    provider: 'runpod', gpuType: 'A100', gpuCount: '1', hoursPerDay: '8', pricingTier: 'on-demand', includeStorage: 'yes',
  },
  'Training Rig 4×A100': {
    provider: 'lambdalabs', gpuType: 'A100', gpuCount: '4', hoursPerDay: '24', pricingTier: 'reserved', includeStorage: 'yes',
  },
  'Enterprise H100 Cluster': {
    provider: 'aws', gpuType: 'H100', gpuCount: '8', hoursPerDay: '24', pricingTier: 'reserved', includeStorage: 'yes',
  },
  'Cheapest H200 Test': {
    provider: 'vastai', gpuType: 'H200', gpuCount: '1', hoursPerDay: '4', pricingTier: 'spot', includeStorage: 'no',
  },
  'Pro 8×H100': {
    provider: 'runpod', gpuType: 'H100', gpuCount: '8', hoursPerDay: '24', pricingTier: 'on-demand', includeStorage: 'yes',
  },
};

function fmt(n: number): string { return '$' + n.toFixed(2); }
function lc(n: number): string { return n.toLocaleString(); }
function pad(s: string, len: number): string { return s + ' '.repeat(Math.max(0, len - s.length)); }
const SEP = '─';

function calculate(inputs: Record<string, string>): string[] {
  const provKey = inputs.provider || 'runpod';
  const prov = PROVIDERS[provKey] || PROVIDERS['runpod'];
  const gpuKey = inputs.gpuType || 'A100';
  const gpuCount = Math.max(1, Math.min(1000, parseInt(inputs.gpuCount) || 1));
  const hoursPerDay = Math.max(0.5, Math.min(24, parseInt(inputs.hoursPerDay) || 8));
  const pricingTier = inputs.pricingTier || 'on-demand';
  const includeStorage = inputs.includeStorage !== 'no';

  // Base hourly rate
  const baseRate = prov.rates[gpuKey] || 1.00;

  // Apply pricing tier multiplier
  let tierMult = 1;
  if (pricingTier === 'spot') tierMult = prov.spotMult;
  else if (pricingTier === 'reserved') tierMult = prov.reservedMult;
  const effectiveRate = baseRate * tierMult;

  // GPU costs
  const dailyGpuHours = hoursPerDay * gpuCount;
  const dailyCost = dailyGpuHours * effectiveRate;
  const monthlyCost = dailyCost * 30;
  const annualCost = monthlyCost * 12;

  // Storage costs (monthly)
  const storageCosts: Record<string, number> = {};
  if (includeStorage) {
    for (const size of STORAGE_SIZES) {
      storageCosts[String(size)] = size * STORAGE_COST_PER_GB;
    }
  }

  // Networking (estimated egress: 10% of storage per month)
  const estimatedEgress = includeStorage ? 50 * NETWORK_EGRESS_PER_GB : 0;

  const out: string[] = [];
  out.push('📅 Pricing last updated: ' + (PRICING.lastUpdated || 'unknown') + ' (data synced weekly)');
  out.push('');

  // Section 1: Header
  out.push(('\u{1F5A5}️ ' + prov.name + ' GPU Cost — ' + TIER_LABELS[pricingTier]) || pricingTier.toUpperCase());
  out.push('');
  out.push('GPU: ' + gpuCount + '× ' + GPU_NAMES[gpuKey] + ' | Base Rate: ' + fmt(baseRate) + '/hr');
  if (pricingTier !== 'on-demand') {
    const discount = Math.round((1 - tierMult) * 100);
    out.push('Tier: ' + TIER_LABELS[pricingTier] + ' (' + discount + '% discount) → Effective: ' + fmt(effectiveRate) + '/hr');
  }
  out.push('Usage: ' + hoursPerDay + ' hrs/day → ' + lc(dailyGpuHours) + ' GPU-hrs/day');
  out.push('');

  // Section 2: Cost Summary
  out.push('\u{1F4B0} Cost Breakdown');
  out.push(SEP.repeat(50));
  out.push('Daily GPU Cost (' + lc(dailyGpuHours) + ' hrs):   ' + fmt(dailyCost));
  out.push('Monthly GPU Cost (30 days): ' + fmt(monthlyCost));
  out.push('Annual GPU Cost:            ' + fmt(annualCost));
  if (includeStorage) {
    out.push('');
    out.push('Storage + Networking:');
    out.push('  Storage (500GB SSD): ' + fmt(500 * STORAGE_COST_PER_GB) + '/mo');
    out.push('  Est. Egress (50GB):   ' + fmt(estimatedEgress) + '/mo');
    const totalMonthly = monthlyCost + 500 * STORAGE_COST_PER_GB + estimatedEgress;
    out.push('  Total Monthly:        ' + fmt(totalMonthly));
  }
  out.push('');

  // Section 3: Bar Chart — all providers at this GPU + config
  out.push('\u{1F4CA} Multi-Provider Comparison — ' + gpuCount + '× ' + GPU_NAMES[gpuKey]);
  out.push(SEP.repeat(50));
  const sortedProviders = Object.values(PROVIDERS).sort((a, b) => a.order - b.order);
  const allCosts: { name: string; cost: number }[] = [];

  for (const sp of sortedProviders) {
    const spRate = sp.rates[gpuKey] || 1.00;
    const spEffRate = spRate * tierMult;
    const spMonthly = hoursPerDay * gpuCount * spEffRate * 30;
    allCosts.push({ name: sp.name, cost: spMonthly });
  }

  const maxCost = Math.max(...allCosts.map(c => c.cost), 1);
  const cheapest = allCosts.reduce((min, c) => c.cost < min.cost ? c : min);
  const BAR_WIDTH = 35;

  for (const c of allCosts) {
    const ratio = c.cost / maxCost;
    const isCheapest = c === cheapest;
    const barChar = isCheapest ? '░' : '█';
    const barLen = Math.max(1, Math.round(ratio * BAR_WIDTH));
    out.push(
      pad(c.name, 18) + ' ' +
      barChar.repeat(barLen) + ' '.repeat(Math.max(0, BAR_WIDTH - barLen + 2)) +
      ' ' + fmt(c.cost) + '/mo',
    );
  }
  out.push('');

  // Section 4: Pricing Tier Comparison (spot vs on-demand vs reserved)
  out.push('\u{1F4CA} Pricing Tier Comparison for ' + prov.name);
  out.push(SEP.repeat(50));
  const tiers: [string, number][] = [
    ['Spot (save ' + Math.round((1 - prov.spotMult) * 100) + '%)', prov.spotMult],
    ['On-Demand', 1],
    ['Reserved 1yr (save ' + Math.round((1 - prov.reservedMult) * 100) + '%)', prov.reservedMult],
  ];

  let tierHdr = 'Tier'.padEnd(22);
  tierHdr += ' | Monthly'.padEnd(14) + ' | Annual'.padEnd(16) + ' | Savings vs On-Demand';
  out.push(tierHdr);
  out.push('─'.repeat(tierHdr.length));

  const onDemandMonthly = hoursPerDay * gpuCount * baseRate * 30;
  for (const [label, mult] of tiers) {
    const tm = hoursPerDay * gpuCount * baseRate * mult * 30;
    const savings = onDemandMonthly - tm;
    const pctSaved = onDemandMonthly > 0 ? Math.round((savings / onDemandMonthly) * 100) : 0;
    out.push(
      pad(label, 22) + ' | ' +
      pad(fmt(tm), 14) + ' | ' +
      pad(fmt(tm * 12), 16) + ' | ' +
      (savings > 0 ? 'Save ' + fmt(savings) + '/mo (' + pctSaved + '%)' : '—'),
    );
  }
  out.push('');

  // Section 5: Multi-GPU Scaling
  out.push('\u{1F504} Multi-GPU Scaling (' + prov.name + ', ' + GPU_NAMES[gpuKey] + ')');
  out.push(SEP.repeat(50));
  const gpuCounts = [1, 2, 4, 8, 16, 32, 64];
  let scaleHdr = 'GPUs'.padEnd(8);
  for (const gc of gpuCounts) scaleHdr += ' | ' + pad(lc(gc) + '×', 16);
  out.push(scaleHdr);
  let scaleSep = ''.padEnd(8, SEP);
  for (const _ of gpuCounts) scaleSep += '─┼─'.padEnd(17, SEP);
  out.push(scaleSep);
  let monthlyRow = 'Monthly'.padEnd(8);
  for (const gc of gpuCounts) {
    const cost = hoursPerDay * gc * effectiveRate * 30;
    monthlyRow += ' | ' + pad(fmt(cost), 16);
  }
  out.push(monthlyRow);
  out.push('');

  // Section 6: Storage + Networking Costs
  if (includeStorage) {
    out.push('\u{1F4BE} Storage & Networking Add-Ons');
    out.push(SEP.repeat(50));
    out.push('Storage (SSD): $' + STORAGE_COST_PER_GB.toFixed(2) + '/GB/month');
    out.push('Network Egress: $' + NETWORK_EGRESS_PER_GB.toFixed(2) + '/GB');
    out.push('');
    let storeHdr = 'Storage'.padEnd(14) + ' | Cost/Mo'.padEnd(12) + ' | With GPU Total/Mo';
    out.push(storeHdr);
    out.push('─'.repeat(storeHdr.length));
    for (const size of STORAGE_SIZES) {
      const sc = size * STORAGE_COST_PER_GB;
      const total = monthlyCost + sc + estimatedEgress;
      out.push(pad(lc(size) + ' GB', 14) + ' | ' + pad(fmt(sc), 12) + ' | ' + fmt(total));
    }
    out.push('');
  }

  // Tip
  out.push('\u{1F4A1} ' + prov.name + ' spot instances save ' + Math.round((1 - prov.spotMult) * 100) + '% but can be interrupted. Reserved instances save ' + Math.round((1 - prov.reservedMult) * 100) + '% with 1-year commitment. Cheapest provider for ' + GPU_NAMES[gpuKey] + ': ' + cheapest.name + ' at ' + fmt(cheapest.cost) + '/mo.');

  // 🩺 Cost Health (v3)
  out.push('');
  out.push('🩺 Cost Health:');
  out.push(SEP.repeat(60));
  const totalHourly = prov.rates[gpuKey] || 0;
  const totalMonthlyGpu = totalHourly * hoursPerDay * 30 * gpuCount;
  const totalMonthlyAll = totalMonthlyGpu + (includeStorage ? (100 * STORAGE_COST_PER_GB + 50 * NETWORK_EGRESS_PER_GB) : 0);
  if (totalHourly < 1) out.push('• 🟢 Micro-tier — under $1/hr. Perfect for inference, small training jobs.');
  else if (totalHourly < 3) out.push('• 🟢 Low-tier — $1-3/hr. Most training and inference workloads.');
  else if (totalHourly < 8) out.push('• 🟡 Mid-tier — $3-8/hr. Larger training jobs, multi-GPU setups.');
  else out.push('• 🟠 High-tier — $' + totalHourly.toFixed(2) + '/hr. Premium GPUs for cutting-edge training.');
  if (includeStorage) {
    const storageTotal = (100 * STORAGE_COST_PER_GB + 50 * NETWORK_EGRESS_PER_GB);
    const storagePct = storageTotal / Math.max(totalMonthlyAll, 0.01) * 100;
    if (storagePct > 30) out.push('• ⚠️ Storage + egress is ' + Math.round(storagePct) + '% of total — review whether you need all that data online.');
    else out.push('• 🟢 Storage + egress is only ' + Math.round(storagePct) + '% of total — well-optimized.');
  }
  if (gpuCount >= 8) {
    out.push('• 💡 At ' + gpuCount + ' GPUs, consider reserved instances: save ' + Math.round((1 - prov.reservedMult) * 100) + '% with 1-year commitment.');
  }
  out.push('');

  // 🔄 What-If Scenarios (v3)
  out.push('🔄 What-If Scenarios:');
  out.push(SEP.repeat(60));
  const cheapestProv = sortedProviders[0];
  if (prov !== cheapestProv) {
    const savings = (totalHourly - cheapestProv.rates[gpuKey]) * hoursPerDay * 30 * gpuCount;
    if (savings > 0) out.push('• Switch to ' + cheapestProv.name + ':  save ' + fmt(savings) + '/mo  (cheapest for ' + GPU_NAMES[gpuKey] + ')');
  } else {
    out.push("• You're already on the cheapest provider for " + GPU_NAMES[gpuKey] + '!');
  }
  const spotSavings = totalMonthlyAll * (1 - prov.spotMult);
  out.push('• Switch to spot instances:  save ~' + fmt(spotSavings) + '/mo  (' + Math.round((1 - prov.spotMult) * 100) + '% off, but interruptible)');
  const reservedSavings = totalMonthlyAll * (1 - prov.reservedMult);
  out.push('• 1-year reserved:  save ~' + fmt(reservedSavings) + '/mo  (guaranteed capacity)');
  out.push('• Halve hours:  ' + fmt(totalMonthlyAll / 2) + '/mo  (workload at off-peak?)');
  out.push('• Double hours:  ' + fmt(totalMonthlyAll * 2) + '/mo');
  out.push('');

  return out;
}

// customFn — exact sync with calculate()
const customFn =
  "var GN={H200:'H200 141GB',H100:'H100 80GB',A100:'A100 80GB',L40S:'L40S 48GB',RTX4090:'RTX 4090 24GB',A6000:'RTX A6000 48GB'};" +
  "'runpod':{n:'RunPod',sm:0.6,rm:0.85,r:{H200:2.49,H100:1.99,A100:0.79,L40S:0.69,RTX4090:0.49,A6000:0.39},od:1}," +
  "'vastai':{n:'Vast.ai',sm:0.5,rm:0.8,r:{H200:2.2,H100:1.69,A100:0.69,L40S:0.59,RTX4090:0.44,A6000:0.35},od:2}," +
  "'lambdalabs':{n:'Lambda Labs',sm:0.7,rm:0.9,r:{H200:2.8,H100:2.49,A100:1.1,L40S:0.8,RTX4090:0.55,A6000:0.5},od:3}," +
  "'aws':{n:'AWS',sm:0.4,rm:0.7,r:{H200:5,H100:4,A100:3.5,L40S:1.2,RTX4090:0.8,A6000:0.65},od:4}," +
  "'gcp':{n:'GCP',sm:0.45,rm:0.75,r:{H200:4.5,H100:4.2,A100:2.8,L40S:1,RTX4090:0.7,A6000:0.6},od:5}," +
  "'azure':{n:'Azure',sm:0.5,rm:0.8,r:{H200:4.8,H100:3.8,A100:3,L40S:1.1,RTX4090:0.75,A6000:0.62},od:6}" +

  "var SCPG2=0.1;var NEG2=0.08;var SS2=[100,500,1000,5000];" +
  "function fm3(n){return '$'+n.toFixed(2)}function lc3(n){return n.toLocaleString()}function pd3(s,l){return s+' '.repeat(Math.max(0,l-s.length))}" +
  "var SEP5='\\u2500';" +
  "var pk2=inputs.provider||'runpod';var p2=PS2[pk2]||PS2['runpod'];" +
  "var gk2=inputs.gpuType||'A100';var gc3=Math.max(1,Math.min(1000,parseInt(inputs.gpuCount)||1));" +
  "var hpd2=Math.max(0.5,Math.min(24,parseInt(inputs.hoursPerDay)||8));" +
  "var pt=inputs.pricingTier||'on-demand';var iSt=inputs.includeStorage!=='no';" +
  "var bR=p2.r[gk2]||1;var tm2=1;" +
  "if(pt==='spot')tm2=p2.sm;else if(pt==='reserved')tm2=p2.rm;" +
  "var eR=bR*tm2;var dgh=hpd2*gc3;var dc2=dgh*eR;var mc2=dc2*30;var ac2=mc2*12;" +
  "var scs2={};if(iSt){for(var si2=0;si2<SS2.length;si2++){scs2[String(SS2[si2])]=SS2[si2]*SCPG2;}}" +
  "var eE2=iSt?50*NEG2:0;" +
  "var o=[];" +
  "o.push('\\u{1F5A5}\\uFE0F '+p2.n+' GPU Cost — '+(pt==='on-demand'?'On-Demand':pt==='spot'?'Spot/Preemptible':'Reserved (1yr)'));" +
  "o.push('');o.push('GPU: '+gc3+'\\u00D7 '+GN[gk2]+' | Base Rate: '+fm3(bR)+'/hr');" +
  "if(pt!=='on-demand'){o.push('Tier: '+(pt==='spot'?'Spot/Preemptible':'Reserved (1yr)')+' ('+Math.round((1-tm2)*100)+'% discount) \\u2192 Effective: '+fm3(eR)+'/hr');}" +
  "o.push('Usage: '+hpd2+' hrs/day \\u2192 '+lc3(dgh)+' GPU-hrs/day');o.push('');" +
  "o.push('\\u{1F4B0} Cost Breakdown');o.push(SEP5.repeat(50));" +
  "o.push('Daily GPU Cost ('+lc3(dgh)+' hrs):   '+fm3(dc2));" +
  "o.push('Monthly GPU Cost (30 days): '+fm3(mc2));" +
  "o.push('Annual GPU Cost:            '+fm3(ac2));" +
  "if(iSt){o.push('');o.push('Storage + Networking:');" +
  "o.push('  Storage (500GB SSD): '+fm3(500*SCPG2)+'/mo');" +
  "o.push('  Est. Egress (50GB):   '+fm3(eE2)+'/mo');" +
  "o.push('  Total Monthly:        '+fm3(mc2+500*SCPG2+eE2));}" +
  "o.push('');" +
  "o.push('\\u{1F4CA} Multi-Provider Comparison — '+gc3+'\\u00D7 '+GN[gk2]);o.push(SEP5.repeat(50));" +
  "var sp2=[];for(var k3 in PS2)sp2.push(PS2[k3]);sp2.sort(function(a,b){return a.od-b.od;});" +
  "var acv=[];for(var i=0;i<sp2.length;i++){var spv=sp2[i];var sr=spv.r[gk2]||1;var se=sr*tm2;var sm2=hpd2*gc3*se*30;acv.push({n:spv.n,c:sm2});}" +
  "var mx2=Math.max.apply(Math,acv.map(function(c){return c.c;}));mx2=Math.max(mx2,1);" +
  "var ch2=acv.reduce(function(min,c){return c.c<min.c?c:min;});" +
  "var BW2=35;" +
  "for(var i=0;i<acv.length;i++){var cav=acv[i];var rt2=cav.c/mx2;var isCh2=cav===ch2;var bch2=isCh2?'\\u2591':'\\u2588';var bl2=Math.max(1,Math.round(rt2*BW2));" +
  "o.push(pd3(cav.n,18)+' '+bch2.repeat(bl2)+' '.repeat(Math.max(0,BW2-bl2+2))+' '+fm3(cav.c)+'/mo');}" +
  "o.push('');" +
  "o.push('\\u{1F4CA} Pricing Tier Comparison for '+p2.n);o.push(SEP5.repeat(50));" +
  "var ts=[['Spot (save '+Math.round((1-p2.sm)*100)+'%)',p2.sm],['On-Demand',1],['Reserved 1yr (save '+Math.round((1-p2.rm)*100)+'%)',p2.rm]];" +
  "var th3='Tier'.padEnd(22);th3+=' | '+'Monthly'.padEnd(14)+' | '+'Annual'.padEnd(16)+' | '+'Savings vs On-Demand';o.push(th3);" +
  "o.push('\\u2500'.repeat(th3.length));var odm2=hpd2*gc3*bR*30;" +
  "for(var ti=0;ti<ts.length;ti++){var tl=ts[ti];var tm3=hpd2*gc3*bR*tl[1]*30;var sv2=odm2-tm3;var ps3=odm2>0?Math.round((sv2/odm2)*100):0;" +
  "o.push(pd3(tl[0],22)+' | '+pd3(fm3(tm3),14)+' | '+pd3(fm3(tm3*12),16)+' | '+(sv2>0?'Save '+fm3(sv2)+'/mo ('+ps3+'%)':'\\u2014'));}" +
  "o.push('');" +
  "o.push('\\u{1F504} Multi-GPU Scaling ('+p2.n+', '+GN[gk2]+')');o.push(SEP5.repeat(50));" +
  "var gcs2=[1,2,4,8,16,32,64];var sh2='GPUs'.padEnd(8);for(var gi=0;gi<gcs2.length;gi++)sh2+=' | '+pd3(lc3(gcs2[gi])+'\\u00D7',16);o.push(sh2);" +
  "var ss2=''.padEnd(8,SEP5);for(var gi2=0;gi2<gcs2.length;gi2++)ss2+='\\u2500\\u253C\\u2500'.padEnd(17,SEP5);o.push(ss2);" +
  "var mrw='Monthly'.padEnd(8);for(var gi3=0;gi3<gcs2.length;gi3++){var cst4=hpd2*gcs2[gi3]*eR*30;mrw+=' | '+pd3(fm3(cst4),16);}o.push(mrw);" +
  "o.push('');" +
  "if(iSt){" +
  "o.push('\\u{1F4BE} Storage & Networking Add-Ons');o.push(SEP5.repeat(50));" +
  "o.push('Storage (SSD): $'+SCPG2.toFixed(2)+'/GB/month');o.push('Network Egress: $'+NEG2.toFixed(2)+'/GB');o.push('');" +
  "var soh='Storage'.padEnd(14)+' | '+'Cost/Mo'.padEnd(12)+' | '+'With GPU Total/Mo';o.push(soh);" +
  "o.push('\\u2500'.repeat(soh.length));" +
  "for(var si3=0;si3<SS2.length;si3++){var sz=SS2[si3];var sc3=sz*SCPG2;var tt=mc2+sc3+eE2;o.push(pd3(lc3(sz)+' GB',14)+' | '+pd3(fm3(sc3),12)+' | '+fm3(tt));}" +
  "o.push('');}" +
  "o.push('\\u{1F4A1} '+p2.n+' spot instances save '+Math.round((1-p2.sm)*100)+'% but can be interrupted. Reserved instances save '+Math.round((1-p2.rm)*100)+'% with 1-year commitment. Cheapest provider for '+GN[gk2]+': '+ch2.n+' at '+fm3(ch2.c)+'/mo.');" +
  "return o;";

const engine: ToolEngine = {
  slug: 'solopreneur-gpu-cloud-cost-calculator',
  title: 'GPU Cloud Cost Calculator',
  description: 'Compare GPU rental costs across 6 cloud providers (RunPod, Vast.ai, Lambda Labs, AWS, GCP, Azure). Spot vs on-demand vs reserved pricing, multi-GPU scaling, storage/networking add-ons, and bar chart comparison.',
  category: 'B',
  inputs: [
    { name: 'provider', label: 'Cloud Provider', placeholder: '', type: 'select', options: ['runpod', 'vastai', 'lambdalabs', 'aws', 'gcp', 'azure'] },
    { name: 'gpuType', label: 'GPU Type', placeholder: '', type: 'select', options: ['H200', 'H100', 'A100', 'L40S', 'RTX4090', 'A6000'] },
    { name: 'gpuCount', label: 'GPU Count', placeholder: 'e.g. 1', type: 'number' },
    { name: 'hoursPerDay', label: 'Hours per Day', placeholder: 'e.g. 8', type: 'number' },
    { name: 'pricingTier', label: 'Pricing Tier', placeholder: '', type: 'select', options: ['spot', 'on-demand', 'reserved'] },
    { name: 'includeStorage', label: 'Include Storage/Network', placeholder: '', type: 'select', options: ['yes', 'no'] },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) { return calculate(inputs); },
  staticExamples: [
    '\n🖥️ RunPod GPU Cost — On-Demand\n\nGPU: 1× A100 80GB | Base Rate: $0.79/hr\nUsage: 8 hrs/day → 8 GPU-hrs/day\n\n💰 Cost Breakdown\n──────────────────────────────────────────────────\nDaily GPU Cost (8 hrs):   $6.32\nMonthly GPU Cost (30 days): $189.60\nAnnual GPU Cost:            $2275.20\n\nStorage + Networking:\n  Storage (500GB SSD): $50.00/mo\n  Est. Egress (50GB):   $4.00/mo\n  Total Monthly:        $243.60\n\n📊 Multi-Provider Comparison — 1× A100 80GB\n──────────────────────────────────────────────────\nRunPod             ████████                              $189.60/mo\nVast.ai            ░░░░░░░                               $165.60/mo\nLambda Labs        ███████████                           $264.00/mo\nAWS                ███████████████████████████████████   $840.00/mo\nGCP                ████████████████████████████          $672.00/mo\nAzure              ██████████████████████████████        $720.00/mo\n\n📊 Pricing Tier Comparison for RunPod\n──────────────────────────────────────────────────\nTier                   | Monthly     | Annual        | Savings vs On-Demand\n───────────────────────────────────────────────────────────────────────────\nSpot (save 40%)        | $113.76        | $1365.12         | Save $75.84/mo (40%)\nOn-Demand              | $189.60        | $2275.20         | —\nReserved 1yr (save 15%) | $161.16        | $1933.92         | Save $28.44/mo (15%)\n\n🔄 Multi-GPU Scaling (RunPod, A100 80GB)\n──────────────────────────────────────────────────\nGPUs     | 1×               | 2×               | 4×               | 8×               | 16×              | 32×              | 64×             \n─────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────────┼───────────────\nMonthly  | $189.60          | $379.20          | $758.40          | $1516.80         | $3033.60         | $6067.20         | $12134.40       \n\n💾 Storage & Networking Add-Ons\n──────────────────────────────────────────────────\nStorage (SSD): $0.10/GB/month\nNetwork Egress: $0.08/GB\n\nStorage        | Cost/Mo   | With GPU Total/Mo\n──────────────────────────────────────────────\n100 GB         | $10.00       | $203.60\n500 GB         | $50.00       | $243.60\n1,000 GB       | $100.00      | $293.60\n5,000 GB       | $500.00      | $693.60\n\n💡 RunPod spot instances save 40% but can be interrupted. Reserved instances save 15% with 1-year commitment. Cheapest provider for A100 80GB: Vast.ai at $165.60/mo.\n\n🩺 Cost Health:\n────────────────────────────────────────────────────────────\n• 🟢 Micro-tier — under $1/hr. Perfect for inference, small training jobs.\n• 🟢 Storage + egress is only 7% of total — well-optimized.\n\n🔄 What-If Scenarios:\n────────────────────────────────────────────────────────────\n• You\'re already on the cheapest provider for A100 80GB!\n• Switch to spot instances:  save ~$81.44/mo  (40% off, but interruptible)\n• 1-year reserved:  save ~$30.54/mo  (guaranteed capacity)\n• Halve hours:  $101.80/mo  (workload at off-peak?)\n• Double hours:  $407.20/mo\n',
  ],
  faq: [
    { q: 'Which cloud provider is cheapest for GPUs in 2026?', a: 'Vast.ai offers the lowest prices ($0.35-2.20/hr) through a peer-to-peer marketplace, followed by RunPod ($0.39-2.49/hr). Lambda Labs ($0.50-2.80/hr) is competitive with better reliability. AWS/GCP/Azure are 3-5x more expensive but offer enterprise SLAs, global networking, and reserved/committed-use discounts that can bring costs down 30-60%.' },
    { q: 'Spot vs On-Demand vs Reserved — how do I choose?', a: 'Spot/Preemptible: 40-60% cheaper but can be terminated anytime. Best for: fault-tolerant training jobs with checkpointing, batch processing, experimentation. On-Demand: full price, no commitment. Best for: inference serving, interactive workloads, short jobs. Reserved (1yr): 15-30% discount with commitment. Best for: 24/7 production workloads, predictable usage. Use spot for training, reserved for serving.' },
    { q: 'Should I rent or buy GPUs?', a: 'Rent if: usage under 500 hrs/month, need flexibility, experimenting with different GPUs. Buy if: 24/7 usage for 12+ months. An H100 costs ~$30,000 — at $2/hr rental, break-even is ~15,000 hours (about 20 months of 24/7). For most solopreneurs, renting is the right answer — you can switch providers and GPU types as technology evolves.' },
    { q: 'How much does storage and networking add to the bill?', a: 'Storage: Typically $0.10/GB/month for attached SSD. 100GB = $10/mo, 1TB = $100/mo. For training datasets, 500GB-1TB is common ($50-100/mo). Network egress: $0.05-0.12/GB. Downloading a 100GB dataset once = $5-12. Most solopreneur setups: storage $20-100/mo, networking $5-25/mo. These are usually dwarfed by GPU costs.' },
    { q: 'Which GPU should I choose for my workload?', a: 'H200: latest, best for 70B+ models and large training jobs. H100: 2-4x faster than A100 for transformers, sweet spot for serious LLM work. A100 80GB: versatile workhorse, best availability across providers. L40S: good for inference and fine-tuning at lower cost. RTX 4090: cheapest option, good for small model fine-tuning and prototyping. A6000: 48GB VRAM at budget price — excellent for 7B-13B models.' },
    { q: 'How do I optimize GPU utilization to save money?', a: '1) Use spot instances for training with checkpointing. 2) Right-size your GPU — don\'t use H100 for a 7B model that fits on RTX 4090. 3) Use mixed precision (FP16/BF16) to double effective throughput. 4) Batch inference requests instead of one-at-a-time. 5) Shut down idle instances — set up auto-shutdown after inactivity. 6) Use model quantization (INT8/INT4) for inference to use cheaper GPUs. Combined: 70-90% cost reduction.' },
    { q: 'RunPod vs Vast.ai vs Lambda Labs — which is best?', a: 'Vast.ai: cheapest overall (P2P marketplace), most GPU variety, less reliable for long-running jobs. RunPod: slightly more expensive but more reliable, great serverless GPU option, good API. Lambda Labs: best reliability and support among budget providers, simplest onboarding, ideal for professional training jobs. For 24/7 production: Lambda Labs. For lowest cost experiments: Vast.ai. For best balance: RunPod.' },
  ],
  howToUse: [
    'Select a cloud GPU provider from the 6 options (RunPod, Vast.ai, Lambda Labs, AWS, GCP, Azure).',
    'Choose your GPU type — from budget RTX 4090 to enterprise H200.',
    'Enter the number of GPUs and expected daily usage hours.',
    'Pick your pricing tier: spot (cheapest, interruptible), on-demand (flexible), or reserved (committed discount).',
    'Toggle storage/networking to see add-on costs for SSD storage and data egress.',
    'Review the multi-provider bar chart, tier savings comparison, and multi-GPU scaling table to find the optimal configuration.',
  ],
  dataLastUpdated: PRICING.lastUpdated,
};

registerEngine(engine);

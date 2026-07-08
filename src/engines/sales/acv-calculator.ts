import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

// =====================================================================
// ACV (Average Contract Value) Calculator (P8-3) — Business v3 standard (6+ emoji sections)
// =====================================================================
//
// ACV is the fundamental SaaS pricing metric — average revenue per customer.
//
//   baseACV            = totalContractValue / numCustomers
//   monthlyACV         = baseACV / contractLength
//   annualACV          = monthlyACV * 12               (= baseACV when contract=12mo)
//   expansionAdjustedACV = annualACV * (1 + expansionRate/100)
//
// Display precision:
//   - baseACV, annualACV, expansionAdjustedACV → integer (e.g. $25,000)
//   - monthlyACV → 2dp (e.g. $2,083.33 — REPEATING in JS float)
//
// The cents precision trap: monthlyACV = baseACV / contractLength. With
// canonical inputs (25000 / 12), this yields 2083.333...; if you round to
// 2083.33 then multiply by 12 you get 24999.96 (NOT 25000). To match spec's
// integer display "$25,000/year", `annualACV(monthly)` Math.rounds the
// product so that 24999.96 → 25000 (the cent-level precision bug P8-2 hit).
//
// Health bands by annualACV (USD):
//   🟢 ≥ $50,000 — enterprise-grade contracts
//   🟡 $10,000–$50,000 — mid-market sweet spot
//   🟠 $2,000–$10,000 — SMB pricing tier
//   🔴 < $2,000 — micro-transaction; focus on upsell

// ============== Health band constants (per-file, exported for tests) ==============

export const HEALTH_BANDS = {
  excellent: [50000, Infinity],
  good: [10000, 50000],
  warning: [2000, 10000],
  critical: [0, 2000],
} as const;

// ============== Math helpers (exported for tests) ==============

/**
 * Base ACV = total contract value ÷ number of customers.
 * Returns the raw (unrounded) value so downstream derivations (monthly,
 * annual) don't compound rounding drift.
 */
export function baseACV(totalContractValue: number, numCustomers: number): number {
  if (numCustomers <= 0) return 0;
  return totalContractValue / numCustomers;
}

/**
 * Monthly ACV = baseACV ÷ contract length (months).
 * Returns the raw (unrounded) value. Display rounds to 2dp separately.
 */
export function monthlyACV(base: number, contractLength: number): number {
  if (contractLength <= 0) return 0;
  return base / contractLength;
}

/**
 * Annual ACV = monthly × 12. Rounded to integer for display (matches spec
 * $25,000/year from 2083.33 monthly, which is 24999.96 unrounded).
 */
export function annualACV(monthly: number): number {
  return Math.round(monthly * 12);
}

/**
 * Expansion-adjusted ACV = annual × (1 + expansionRate/100).
 * Uses integer math (× (100 + rate) / 100) to avoid JS float drift
 * (25000 * 1.10 = 27500.000000000004, not 27500, under direct float multiply).
 */
export function expansionAdjustedACV(annual: number, expansionRate: number): number {
  return annual * (100 + expansionRate) / 100;
}

/** Health band label from annual ACV (USD). */
export function calcHealthBand(value: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (value >= HEALTH_BANDS.excellent[0]) return 'excellent';
  if (value >= HEALTH_BANDS.good[0]) return 'good';
  if (value >= HEALTH_BANDS.warning[0]) return 'warning';
  return 'critical';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const totalContractValue = Math.max(0, parseFloat(inputs.totalContractValue) || 0);
  const contractLength = Math.max(1, parseFloat(inputs.contractLength) || 1);
  const numCustomers = Math.max(1, parseFloat(inputs.numCustomers) || 1);
  const expansionRate = Math.max(0, parseFloat(inputs.expansionRate) || 0);

  // Use unrounded intermediates for derivation, then round at display.
  const base = baseACV(totalContractValue, numCustomers);
  const monthlyRaw = monthlyACV(base, contractLength);
  const monthlyDisplay = Math.round(monthlyRaw * 100) / 100;       // 2083.33 (cents-stable)
  const annual = annualACV(monthlyRaw);                            // 25000 (integer, from rounded product)
  const expanded = expansionAdjustedACV(annual, expansionRate);   // 27500 (integer when annual is integer)

  // money() = integer formatter (most lines).
  // moneyExact() = preserves cents (monthly line: $2,083.33 not $2,083).
  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const moneyExact = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Health band (applied to annualACV)
  const band = calcHealthBand(annual);
  const healthEmoji = band === 'excellent' ? '🟢' : band === 'good' ? '🟡' : band === 'warning' ? '🟠' : '🔴';
  const healthLabel =
    band === 'excellent'
      ? 'Excellent — ACV ≥ $50,000/year; enterprise-grade contracts'
      : band === 'good'
      ? 'Good — ACV $10,000–$50,000/year; mid-market sweet spot'
      : band === 'warning'
      ? 'Warning — ACV $2,000–$10,000/year; SMB pricing tier'
      : 'Critical — ACV < $2,000/year; micro-transaction, focus on upsell';

  // What-If scenarios
  const expanded20 = expansionAdjustedACV(annual, 20);
  const expanded20LiftPct = expanded > 0 ? ((expanded20 - expanded) / expanded) * 100 : 0;
  // contract length 12→24: monthly halves, annual halves (only when base/contractLength relationship holds)
  const annualAt24 = annualACV(monthlyACV(base, 24));
  const contractShiftPct = annual > 0 ? ((annualAt24 - annual) / annual) * 100 : 0;
  // numCustomers 12→24: base halves, annual halves
  const annualAt24Cust = annualACV(monthlyACV(baseACV(totalContractValue, 24), contractLength));
  const custShiftPct = annual > 0 ? ((annualAt24Cust - annual) / annual) * 100 : 0;

  // Break-Even: target $50,000/year for 🟢
  //   - annualACV = totalContractValue / numCustomers (when contractLength=12)
  //   - To lift annualACV from current → $50K, increase totalContractValue OR decrease numCustomers
  //   - Show both paths (double contract value, OR half the customers at higher per-cust value)
  const targetAnnual = 50000;
  const gapToExcellent = Math.max(0, targetAnnual - annual);
  // Path A: scale totalCV up (same customers, larger contracts)
  const totalCVForExcellent = annual > 0 ? (targetAnnual / annual) * totalContractValue : 0;
  const totalCVLiftNeeded = Math.max(0, totalCVForExcellent - totalContractValue);
  // Path B: shrink customer base (fewer, higher-value customers) — each customer must be worth $50K
  const numCustForExcellent = totalContractValue > 0 ? Math.ceil(totalContractValue / targetAnnual) : 0;
  const fewerCustNeeded = Math.max(0, numCustomers - numCustForExcellent);

  // Milestone: gap to next tier (from expansion-adjusted ACV to next annual threshold)
  // Spec example: $22,500 to next tier ($50K - $27,500 expansion-adjusted)
  let gapToNext: number;
  let nextTier: string;
  if (band === 'critical') {
    gapToNext = 2000 - expanded;
    nextTier = '🟠 Warning ($2,000)';
  } else if (band === 'warning') {
    gapToNext = 10000 - expanded;
    nextTier = '🟡 Good ($10,000)';
  } else if (band === 'good') {
    gapToNext = 50000 - expanded;
    nextTier = '🟢 Excellent ($50,000)';
  } else {
    gapToNext = 0;
    nextTier = 'top tier maintained';
  }

  // Tip: band-driven contextual advice
  let tip: string;
  if (band === 'critical') {
    tip =
      'ACV < $2,000/year is micro-transaction territory — high volume, low value. Focus on upsell paths: tier upgrades, annual prepay discounts, product bundle attach. A single sale is unlikely to move the needle; you need a flywheel of expansion revenue or a pricing re-architecture.';
  } else if (band === 'warning') {
    tip =
      'ACV $2,000–$10,000/year is SMB-tier pricing. To reach mid-market sweet spot, package features into higher tiers and gate usage-based features. Audit pricing page; most SMB products leave 30–50% of ACV on the table via underpriced annual plans and missing enterprise-only modules.';
  } else if (band === 'good') {
    tip =
      'ACV $10,000–$50,000/year is the mid-market sweet spot. To reach enterprise, invest in procurement-ready features (SSO, SOC2, audit logs), security review templates, and named CSM support. Pair with sales velocity (P8-2) to ensure deal size growth isn\'t coupled with cycle compression you can\'t sustain.';
  } else {
    tip =
      'ACV ≥ $50,000/year is enterprise-grade — protect it. Maintain SLA delivery, executive sponsor relationships, and quarterly business reviews. Watch for discount creep at renewal; expansion revenue (upsell + cross-sell) should be the primary growth lever, not price increases on the base.';
  }

  const r =
    '🚀 ACV Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• Base ACV: ' + money(base) + '  ·  Monthly: ' + moneyExact(monthlyDisplay) + '/month  ·  Annual: ' + money(annual) + '/year\n' +
    '• Expansion-adjusted (' + expansionRate + '%): ' + money(expanded) + '/year\n' +
    '• Formula: ' + money(totalContractValue) + ' ÷ ' + numCustomers + ' customers ÷ ' + contractLength + ' months × (1 + ' + expansionRate + '%) = ' + money(expanded) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Total contract value: ' + money(totalContractValue) + '\n' +
    '• Contract length: ' + contractLength + ' months\n' +
    '• Number of customers: ' + numCustomers + '\n' +
    '• Annual expansion rate: ' + expansionRate + '%\n' +
    '• Base ACV: ' + money(base) + '  ·  Monthly: ' + moneyExact(monthlyDisplay) + '  ·  Annual: ' + money(annual) + '  ·  Expansion-adjusted: ' + money(expanded) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Expansion rate ' + expansionRate + '%→20%: ' + money(expanded20) + '/year (' + (expanded20LiftPct >= 0 ? '+' : '') + expanded20LiftPct.toFixed(1) + '% vs current expanded)\n' +
    '• Contract length ' + contractLength + '→24 months: ' + money(annualAt24) + '/year base (' + (contractShiftPct >= 0 ? '+' : '') + contractShiftPct.toFixed(1) + '%)\n' +
    '• Customers ' + numCustomers + '→24: ' + money(annualAt24Cust) + '/year base (' + (custShiftPct >= 0 ? '+' : '') + custShiftPct.toFixed(1) + '%)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Target for 🟢 Excellent: ' + money(targetAnnual) + '/year ACV\n' +
    '• Gap to 🟢: ' + money(gapToExcellent) + '/year\n' +
    '• Path A — raise total contract value by ' + money(totalCVLiftNeeded) + ' (same customers, larger deals)\n' +
    '• Path B — reduce customer base to ~' + numCustForExcellent + ' customers (each at $50K; fewer, higher-value contracts)\n' +
    '• Note: adding more customers at the same per-customer value reduces per-customer ACV\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Next tier: ' + nextTier + '\n' +
    '• Gap to next tier: ' + money(Math.max(0, gapToNext)) + (band === 'excellent' ? ' (already at top)' : '') + '\n' +
    '• At current pace: ~' + money(expanded) + '/year per-customer revenue (with ' + expansionRate + '% expansion)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  "function bACV(t,n){if(n<=0)return 0;return t/n;}" +
  "function mACV(b,l){if(l<=0)return 0;return b/l;}" +
  "function aACV(m){return Math.round(m*12);}" +
  "function eACV(a,r){return a*(100+r)/100;}" +
  "function band(v){if(v>=50000)return 'excellent';if(v>=10000)return 'good';if(v>=2000)return 'warning';return 'critical';}" +
  "var tcv=Math.max(0,parseFloat(inputs.totalContractValue)||0);" +
  "var cl=Math.max(1,parseFloat(inputs.contractLength)||1);" +
  "var nc=Math.max(1,parseFloat(inputs.numCustomers)||1);" +
  "var er=Math.max(0,parseFloat(inputs.expansionRate)||0);" +
  "var base=bACV(tcv,nc);" +
  "var moRaw=mACV(base,cl);" +
  "var moDisp=Math.round(moRaw*100)/100;" +
  "var annual=aACV(moRaw);" +
  "var expd=eACV(annual,er);" +
  "function money(n){return '$'+Math.round(n).toLocaleString('en-US');}" +
  "function moneyExact(n){return '$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}" +
  "var bd=band(annual);" +
  "var he=bd==='excellent'?'\\uD83D\\uDFE2':bd==='good'?'\\uD83D\\uDFE1':bd==='warning'?'\\uD83D\\uDFE0':'\\uD83D\\uDD34';" +
  "var hl=bd==='excellent'?'Excellent \\u2014 ACV \\u2265 $50,000/year; enterprise-grade contracts':bd==='good'?'Good \\u2014 ACV $10,000\\u2013$50,000/year; mid-market sweet spot':bd==='warning'?'Warning \\u2014 ACV $2,000\\u2013$10,000/year; SMB pricing tier':'Critical \\u2014 ACV < $2,000/year; micro-transaction, focus on upsell';" +
  "var exp20=eACV(annual,20);" +
  "var exp20pct=expd>0?((exp20-expd)/expd)*100:0;" +
  "var ann24=aACV(mACV(base,24));" +
  "var csPct=annual>0?((ann24-annual)/annual)*100:0;" +
  "var ann24c=aACV(mACV(bACV(tcv,24),cl));" +
  "var custPct=annual>0?((ann24c-annual)/annual)*100:0;" +
  "var tgt=50000;" +
  "var gap=Math.max(0,tgt-annual);" +
  "var tcvForExc=annual>0?(tgt/annual)*tcv:0;" +
  "var tcvLift=Math.max(0,tcvForExc-tcv);" +
  "var ncForExc=tcv>0?Math.ceil(tcv/tgt):0;" +
  "var fcNeed=Math.max(0,nc-ncForExc);" +
  "var gn,nt;" +
  "if(bd==='critical'){gn=2000-expd;nt='\\uD83D\\uDFE0 Warning ($2,000)';}" +
  "else if(bd==='warning'){gn=10000-expd;nt='\\uD83D\\uDFE1 Good ($10,000)';}" +
  "else if(bd==='good'){gn=50000-expd;nt='\\uD83D\\uDFE2 Excellent ($50,000)';}" +
  "else{gn=0;nt='top tier maintained';}" +
  "var tip='';" +
  "if(bd==='critical'){tip='ACV < $2,000/year is micro-transaction territory \\u2014 high volume, low value. Focus on upsell paths: tier upgrades, annual prepay discounts, product bundle attach. A single sale is unlikely to move the needle; you need a flywheel of expansion revenue or a pricing re-architecture.';}" +
  "else if(bd==='warning'){tip='ACV $2,000\\u2013$10,000/year is SMB-tier pricing. To reach mid-market sweet spot, package features into higher tiers and gate usage-based features. Audit pricing page; most SMB products leave 30\\u201350% of ACV on the table via underpriced annual plans and missing enterprise-only modules.';}" +
  "else if(bd==='good'){tip='ACV $10,000\\u2013$50,000/year is the mid-market sweet spot. To reach enterprise, invest in procurement-ready features (SSO, SOC2, audit logs), security review templates, and named CSM support. Pair with sales velocity (P8-2) to ensure deal size growth isn\\u2019t coupled with cycle compression you can\\u2019t sustain.';}" +
  "else{tip='ACV \\u2265 $50,000/year is enterprise-grade \\u2014 protect it. Maintain SLA delivery, executive sponsor relationships, and quarterly business reviews. Watch for discount creep at renewal; expansion revenue (upsell + cross-sell) should be the primary growth lever, not price increases on the base.';}" +
  "var r2='';" +
  "r2+='\\uD83D\\uDE80 ACV Calculator\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+he+' '+hl+'\\n';" +
  "r2+='\\u2022 Base ACV: '+money(base)+'  \\u00B7  Monthly: '+moneyExact(moDisp)+'/month  \\u00B7  Annual: '+money(annual)+'/year\\n';" +
  "r2+='\\u2022 Expansion-adjusted ('+er+'%): '+money(expd)+'/year\\n';" +
  "r2+='\\u2022 Formula: '+money(tcv)+' \\u00F7 '+nc+' customers \\u00F7 '+cl+' months \\u00D7 (1 + '+er+'%) = '+money(expd)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCCA Inputs Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Total contract value: '+money(tcv)+'\\n';" +
  "r2+='\\u2022 Contract length: '+cl+' months\\n';" +
  "r2+='\\u2022 Number of customers: '+nc+'\\n';" +
  "r2+='\\u2022 Annual expansion rate: '+er+'%\\n';" +
  "r2+='\\u2022 Base ACV: '+money(base)+'  \\u00B7  Monthly: '+moneyExact(moDisp)+'  \\u00B7  Annual: '+money(annual)+'  \\u00B7  Expansion-adjusted: '+money(expd)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Expansion rate '+er+'%\\u219220%: '+money(exp20)+'/year ('+(exp20pct>=0?'+':'')+exp20pct.toFixed(1)+'% vs current expanded)\\n';" +
  "r2+='\\u2022 Contract length '+cl+'\\u219224 months: '+money(ann24)+'/year base ('+(csPct>=0?'+':'')+csPct.toFixed(1)+'%)\\n';" +
  "r2+='\\u2022 Customers '+nc+'\\u219224: '+money(ann24c)+'/year base ('+(custPct>=0?'+':'')+custPct.toFixed(1)+'%)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Break-Even:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Target for \\uD83D\\uDFE2 Excellent: '+money(tgt)+'/year ACV\\n';" +
  "r2+='\\u2022 Gap to \\uD83D\\uDFE2: '+money(gap)+'/year\\n';" +
  "r2+='\\u2022 Path A \\u2014 raise total contract value by '+money(tcvLift)+' (same customers, larger deals)\\n';" +
  "r2+='\\u2022 Path B \\u2014 reduce customer base to ~'+ncForExc+' customers (each at $50K; fewer, higher-value contracts)\\n';" +
  "r2+='\\u2022 Note: adding more customers at the same per-customer value reduces per-customer ACV\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Milestone:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Next tier: '+nt+'\\n';" +
  "r2+='\\u2022 Gap to next tier: '+money(Math.max(0,gn))+(bd==='excellent'?' (already at top)':'')+'\\n';" +
  "r2+='\\u2022 At current pace: ~'+money(expd)+'/year per-customer revenue (with '+er+'% expansion)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCA1 Tip: '+tip+'\\n';" +
  "return [r2];";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-acv-calculator',
  title: 'ACV Calculator',
  description:
    'Compute Average Contract Value with monthly/annual toggle and expansion adjustment. The fundamental SaaS pricing metric — how much revenue per customer. Health bands: 🟢 ≥$50K · 🟡 $10K-$50K · 🟠 $2K-$10K · 🔴 <$2K.',
  categoryId: 'S',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'totalContractValue', label: 'Total contract value (USD)', placeholder: 'e.g. 300000', type: 'number' },
    { name: 'contractLength', label: 'Contract length (months)', placeholder: 'e.g. 12', type: 'number' },
    { name: 'numCustomers', label: 'Number of customers', placeholder: 'e.g. 12', type: 'number' },
    { name: 'expansionRate', label: 'Annual expansion rate (%)', placeholder: 'e.g. 10', type: 'number' },
  ],
  keywords: [
    'ACV calculator',
    'average contract value',
    'ACV',
    'annual contract value',
    'SaaS pricing',
    'contract value',
    'revenue per customer',
    'pricing metric',
    'B2B SaaS pricing',
    'customer lifetime value',
  ],
  tags: ['sales', 'acv', 'crm', 'pricing'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-07',
  sources: [
    'https://www.insivia.com/blog/what-is-acv/',
    'https://blog.hubspot.com/sales/average-contract-value',
    'https://www.gong.io/blog/average-contract-value',
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  calculate,
  generate: calculate,
  staticExamples: [
    '🚀 ACV Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 Good — ACV $10,000–$50,000/year; mid-market sweet spot\n• Base ACV: $25,000  ·  Monthly: $2,083.33/month  ·  Annual: $25,000/year\n• Expansion-adjusted (10%): $27,500/year\n• Formula: $300,000 ÷ 12 customers ÷ 12 months × (1 + 10%) = $27,500\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Total contract value: $300,000\n• Contract length: 12 months\n• Number of customers: 12\n• Annual expansion rate: 10%\n• Base ACV: $25,000  ·  Monthly: $2,083.33  ·  Annual: $25,000  ·  Expansion-adjusted: $27,500\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Expansion rate 10%→20%: $30,000/year (+9.1% vs current expanded)\n• Contract length 12→24 months: $12,500/year base (-50.0%)\n• Customers 12→24: $12,500/year base (-50.0%)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Target for 🟢 Excellent: $50,000/year ACV\n• Gap to 🟢: $25,000/year\n• Path A — raise total contract value by $300,000 (same customers, larger deals)\n• Path B — reduce customer base to ~6 customers (each at $50K; fewer, higher-value contracts)\n• Note: adding more customers at the same per-customer value reduces per-customer ACV\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Next tier: 🟢 Excellent ($50,000)\n• Gap to next tier: $22,500\n• At current pace: ~$27,500/year per-customer revenue (with 10% expansion)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: ACV $10,000–$50,000/year is the mid-market sweet spot. To reach enterprise, invest in procurement-ready features (SSO, SOC2, audit logs), security review templates, and named CSM support. Pair with sales velocity (P8-2) to ensure deal size growth isn\'t coupled with cycle compression you can\'t sustain.\n',
  ],
  faq: [
    { q: 'What is ACV (Average Contract Value)?', a: 'ACV is the average annualized revenue per customer contract. It is computed as total contract value divided by contract length (annualized), or equivalently total revenue divided by customer count for a given period. ACV is the fundamental SaaS pricing metric — it tells you how much each customer is worth on a per-year basis, separate from new vs expansion revenue.' },
    { q: 'What is the difference between ACV and ARR?', a: 'ARR (Annual Recurring Revenue) is the total annualized recurring revenue across all customers. ACV is the per-customer average. ARR = ACV × number of customers (approximately). Both metrics matter: ARR measures total business scale; ACV measures pricing power and customer segment mix.' },
    { q: 'What is a good ACV for SaaS?', a: 'ACV bands: < $2K/year is micro-transaction / prosumer SMB. $2K-$10K is SMB pricing tier. $10K-$50K is mid-market sweet spot (the most common SaaS band). $50K+ is enterprise-grade. Most B2B SaaS companies target $10K-$50K ACV for product-led growth to sales-assisted handoff; below $10K typically relies on self-serve or low-touch sales.' },
    { q: 'How does expansion rate affect ACV?', a: 'Expansion rate is the percentage of existing customer revenue that grows year-over-year via upsell, cross-sell, or seat expansion. A 10% expansion rate means a $25K ACV customer becomes $27,500 next year without any new logo. Net Revenue Retention above 100% requires expansion to exceed churn.' },
    { q: 'How does this differ from sales velocity (P8-2)?', a: 'Sales velocity measures how fast your pipeline generates revenue (throughput). ACV measures how much each customer is worth (deal size). Velocity = (opportunities × ACV × win rate) ÷ cycle days. Use ACV for pricing tier decisions, velocity for sales productivity optimization.' },
  ],
  howToUse: [
    'Enter your total contract value across all customers for the period (sum of all signed contracts, ACV-friendly unit).',
    'Enter contract length in months (most SaaS is 12 months; multi-year contracts divide total CV by months).',
    'Enter number of customers (count of distinct signed contracts for the period).',
    'Enter annual expansion rate (%) — typical SaaS benchmark is 10-15% (above 20% is excellent).',
    'Read Base ACV (per-customer), Monthly (per-month per-customer), and Annual ACV. Use the health band to assess pricing tier.',
    'Pair with sales velocity (P8-2) to identify whether ACV growth opportunities exist alongside pipeline throughput improvements.',
  ],
};
registerEngine(engine);
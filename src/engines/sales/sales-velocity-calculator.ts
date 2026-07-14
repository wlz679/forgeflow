import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

// =====================================================================
// Sales Velocity Calculator (P8-2) — Business v3 standard (6+ emoji sections)
// =====================================================================
//
// Sales velocity measures how fast your pipeline generates revenue.
//   velocity = (openOpps × avgDealSize × winRate) / cycleDays
//
// Where:
//   openOpps    — number of qualified open opportunities in pipeline
//   avgDealSize — average contract value per closed-won deal (USD)
//   winRate     — fraction of opps that close-won (%)
//   cycleDays   — average days from first touch to closed-won
//
// Health bands by daily velocity (USD/day):
//   🟢 ≥ $5,000 — excellent revenue throughput
//   🟡 $2,000–$5,000 — good productivity
//   🟠 $500–$2,000 — slow; pipeline needs more volume or faster cycle
//   🔴 < $500 — critical; sales engine stalling

// ============== Health band constants (per-file, exported for tests) ==============

export const HEALTH_BANDS = {
  excellent: [5000, Infinity],
  good: [2000, 5000],
  warning: [500, 2000],
  critical: [0, 500],
} as const;

// ============== Math helpers (exported for tests) ==============

/**
 * Daily velocity = (opps × dealSize × winRate) / cycleDays.
 * Returns the raw (unrounded) value so downstream monthly/annual derivations
 * don't compound rounding drift. Use this for arithmetic, NOT for display.
 */
export function dailyVelocityRaw(openOpps: number, avgDealSize: number, winRate: number, cycleDays: number): number {
  if (cycleDays <= 0) return 0;
  return (openOpps * avgDealSize * (winRate / 100)) / cycleDays;
}

/** Daily velocity rounded to 2dp (display-stable). Used for health band classification + display. */
export function dailyVelocity(openOpps: number, avgDealSize: number, winRate: number, cycleDays: number): number {
  const raw = dailyVelocityRaw(openOpps, avgDealSize, winRate, cycleDays);
  return Math.round(raw * 100) / 100;
}

/** Monthly velocity = daily × 30. Rounded to 2dp for display. */
export function monthlyVelocity(daily: number): number {
  return Math.round(daily * 30 * 100) / 100;
}

/** Annual velocity = daily × 365. Rounded to 2dp for display. */
export function annualVelocity(daily: number): number {
  return Math.round(daily * 365 * 100) / 100;
}

/** Health band label from daily velocity (USD). */
export function calcHealthBand(value: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (value >= HEALTH_BANDS.excellent[0]) return 'excellent';
  if (value >= HEALTH_BANDS.good[0]) return 'good';
  if (value >= HEALTH_BANDS.warning[0]) return 'warning';
  return 'critical';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const openOpps = clampNonNegative(parseFloat(inputs.openOpps) || 0);
  const avgDealSize = clampNonNegative(parseFloat(inputs.avgDealSize) || 0);
  const winRate = clampNonNegative(parseFloat(inputs.winRate) || 0);
  const cycleDays = Math.max(1, parseFloat(inputs.cycleDays) || 1);

  // Use raw daily for monthly/annual derivation so cent-level precision
  // is preserved (rounded daily × 30/365 would compound rounding drift).
  const dailyRaw = dailyVelocityRaw(openOpps, avgDealSize, winRate, cycleDays);
  const daily = dailyVelocity(openOpps, avgDealSize, winRate, cycleDays);
  const monthly = monthlyVelocity(dailyRaw);
  const annual = annualVelocity(dailyRaw);

  // money() = integer formatter for most displays (deal size, what-if, milestones).
  // moneyExact() = preserves cents, used only for the daily/monthly/annual velocity
  //   line where spec mandates $83,333.33 / $1,013,888.89 not $83,333 / $1,013,890.
  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const moneyExact = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Health band
  const band = calcHealthBand(daily);
  const healthEmoji = band === 'excellent' ? '🟢' : band === 'good' ? '🟡' : band === 'warning' ? '🟠' : '🔴';
  const healthLabel =
    band === 'excellent'
      ? 'Excellent — revenue throughput ≥ $5,000/day; sales engine humming'
      : band === 'good'
      ? 'Good — productive sales engine; room to compress cycle or lift win rate'
      : band === 'warning'
      ? 'Warning — slow velocity; pipeline needs more volume or faster cycle'
      : 'Critical — sales engine stalling; urgent funnel audit needed';

  // What-If: boost win rate 25%→30% AND compress cycle 45→30 days
  const wr30Daily = dailyVelocity(openOpps, avgDealSize, 30, cycleDays);
  const cy30Daily = dailyVelocity(openOpps, avgDealSize, winRate, 30);
  const wr30LiftPct = daily > 0 ? ((wr30Daily - daily) / daily) * 100 : 0;
  const cy30LiftPct = daily > 0 ? ((cy30Daily - daily) / daily) * 100 : 0;

  // Break-Even: need $5,000/day for 🟢
  //   - via win rate boost: targetWinRate = (5000 × cycleDays) / (opps × dealSize) × 100
  //   - via cycle compression: targetCycleDays = (opps × dealSize × winRate/100) / 5000
  const winRateNeeded = (openOpps * avgDealSize) > 0
    ? (5000 * cycleDays) / (openOpps * avgDealSize) * 100
    : 0;
  const cycleDaysNeeded = daily > 0
    ? (openOpps * avgDealSize * (winRate / 100)) / 5000
    : 0;

  // Milestone: gap to next tier (🟢 from current band)
  let gapToNext: number;
  let nextTier: string;
  if (band === 'critical') {
    gapToNext = 500 - daily;
    nextTier = '🟠 Warning ($500)';
  } else if (band === 'warning') {
    gapToNext = 2000 - daily;
    nextTier = '🟡 Good ($2,000)';
  } else if (band === 'good') {
    gapToNext = 5000 - daily;
    nextTier = '🟢 Excellent ($5,000)';
  } else {
    gapToNext = 0;
    nextTier = 'top tier maintained';
  }

  // Tip: band-driven contextual advice
  let tip: string;
  if (band === 'critical') {
    tip =
      'Daily velocity < $500 is a critical sales engine stall — at this pace you will not cover quota. Audit the funnel end-to-end: lead quality (MQL→SQL conversion), qualification rigor, sales playbook adherence, win/loss reasons. Even a 2× cycle compression or doubling win rate is the minimum viable move.';
  } else if (band === 'warning') {
    tip =
      'Daily velocity $500–$2,000 is below productive. The two fastest levers are win rate (better qualification, stronger close skills) and cycle compression (faster follow-up, fewer proposal revisions). Doubling open opps without improving win rate or cycle just inflates pipeline noise — fix the conversion engine first.';
  } else if (band === 'good') {
    tip =
      'Daily velocity $2,000–$5,000 is productive. To reach Excellent, identify the weakest of the four levers (opps × size × win rate ÷ cycle) and invest there. Often cycle compression (e.g. self-serve trial, async demos) gives 1.5–2× lift without more headcount. Pair with pipeline value to make sure velocity growth is not masking deteriorating deal size.';
  } else {
    tip =
      'Excellent velocity — sales engine is generating ≥ $5K/day. Maintain cadence; protect top performers from burnout and avoid pipeline complacency. Watch for stale late-stage deals (>1.5× cycle) that quietly slip, and rebalance marketing spend toward channels that consistently fill the top of funnel with qualified opps.';
  }

  const r =
    '🚀 Sales Velocity Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• Daily velocity: ' + moneyExact(daily) + '/day  ·  Monthly: ' + moneyExact(monthly) + '  ·  Annual: ' + moneyExact(annual) + '\n' +
    '• Formula: (opps × deal size × win rate) ÷ cycle = (' + openOpps + ' × ' + money(avgDealSize) + ' × ' + winRate + '%) ÷ ' + cycleDays + ' days\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Open opportunities: ' + openOpps + '\n' +
    '• Average deal size: ' + money(avgDealSize) + '\n' +
    '• Win rate: ' + winRate + '%\n' +
    '• Sales cycle: ' + cycleDays + ' days\n' +
    '• Daily / Monthly / Annual velocity: ' + moneyExact(daily) + ' / ' + moneyExact(monthly) + ' / ' + moneyExact(annual) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Win rate ' + winRate + '%→30%: ' + money(wr30Daily) + '/day (' + (wr30LiftPct >= 0 ? '+' : '') + wr30LiftPct.toFixed(1) + '% lift)\n' +
    '• Cycle ' + cycleDays + '→30 days: ' + money(cy30Daily) + '/day (' + (cy30LiftPct >= 0 ? '+' : '') + cy30LiftPct.toFixed(1) + '% lift)\n' +
    '• Combined (win rate 30% AND cycle 30d): ' + money(dailyVelocity(openOpps, avgDealSize, 30, 30)) + '/day\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Target for 🟢 Excellent: $5,000/day\n' +
    '• Path A — lift win rate to ' + winRateNeeded.toFixed(1) + '% (cycle unchanged)\n' +
    '• Path B — compress cycle to ' + Math.max(1, Math.ceil(cycleDaysNeeded)) + ' days (win rate unchanged)\n' +
    '• Path C — add ' + (daily > 0 ? Math.ceil((5000 - daily) / (avgDealSize * (winRate / 100) / cycleDays)) : 0) + ' more open opps (everything else unchanged)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Next tier: ' + nextTier + '\n' +
    '• Gap to next tier: ' + money(Math.max(0, gapToNext)) + (band === 'excellent' ? ' (already at top)' : '') + '\n' +
    '• At current pace: ~' + moneyExact(annual) + '/year revenue contribution\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  "function dvRaw(o,d,w,c){if(c<=0)return 0;return (o*d*(w/100))/c;}" +
  "function dv(o,d,w,c){return Math.round(dvRaw(o,d,w,c)*100)/100;}" +
  "function mv(d){return Math.round(d*30*100)/100;}" +
  "function av(d){return Math.round(d*365*100)/100;}" +
  "function band(v){if(v>=5000)return 'excellent';if(v>=2000)return 'good';if(v>=500)return 'warning';return 'critical';}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var o=cnn(parseFloat(inputs.openOpps)||0);" +
  "var d=cnn(parseFloat(inputs.avgDealSize)||0);" +
  "var w=cnn(parseFloat(inputs.winRate)||0);" +
  "var c=Math.max(1,parseFloat(inputs.cycleDays)||1);" +
  "var dailyRaw=dvRaw(o,d,w,c);" +
  "var daily=dv(o,d,w,c);" +
  "var mo=mv(dailyRaw);" +
  "var yr=av(dailyRaw);" +
  "function money(n){return '$'+Math.round(n).toLocaleString('en-US');}" +
  "function moneyExact(n){return '$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}" +
  "var bd=band(daily);" +
  "var he=bd==='excellent'?'\\uD83D\\uDFE2':bd==='good'?'\\uD83D\\uDFE1':bd==='warning'?'\\uD83D\\uDFE0':'\\uD83D\\uDD34';" +
  "var hl=bd==='excellent'?'Excellent \\u2014 revenue throughput \\u2265 $5,000/day; sales engine humming':bd==='good'?'Good \\u2014 productive sales engine; room to compress cycle or lift win rate':bd==='warning'?'Warning \\u2014 slow velocity; pipeline needs more volume or faster cycle':'Critical \\u2014 sales engine stalling; urgent funnel audit needed';" +
  "var wr30=dv(o,d,30,c);" +
  "var cy30=dv(o,d,w,30);" +
  "var wr30pct=daily>0?((wr30-daily)/daily)*100:0;" +
  "var cy30pct=daily>0?((cy30-daily)/daily)*100:0;" +
  "var wrn=(o*d)>0?(5000*c)/(o*d)*100:0;" +
  "var cyn=daily>0?(o*d*(w/100))/5000:0;" +
  "var gn,nt;" +
  "if(bd==='critical'){gn=500-daily;nt='\\uD83D\\uDFE0 Warning ($500)';}" +
  "else if(bd==='warning'){gn=2000-daily;nt='\\uD83D\\uDFE1 Good ($2,000)';}" +
  "else if(bd==='good'){gn=5000-daily;nt='\\uD83D\\uDFE2 Excellent ($5,000)';}" +
  "else{gn=0;nt='top tier maintained';}" +
  "var tip='';" +
  "if(bd==='critical'){tip='Daily velocity < $500 is a critical sales engine stall \\u2014 at this pace you will not cover quota. Audit the funnel end-to-end: lead quality (MQL\\u2192SQL conversion), qualification rigor, sales playbook adherence, win/loss reasons. Even a 2\\u00D7 cycle compression or doubling win rate is the minimum viable move.';}" +
  "else if(bd==='warning'){tip='Daily velocity $500\\u2013$2,000 is below productive. The two fastest levers are win rate (better qualification, stronger close skills) and cycle compression (faster follow-up, fewer proposal revisions). Doubling open opps without improving win rate or cycle just inflates pipeline noise \\u2014 fix the conversion engine first.';}" +
  "else if(bd==='good'){tip='Daily velocity $2,000\\u2013$5,000 is productive. To reach Excellent, identify the weakest of the four levers (opps \\u00D7 size \\u00D7 win rate \\u00F7 cycle) and invest there. Often cycle compression (e.g. self-serve trial, async demos) gives 1.5\\u20132\\u00D7 lift without more headcount. Pair with pipeline value to make sure velocity growth is not masking deteriorating deal size.';}" +
  "else{tip='Excellent velocity \\u2014 sales engine is generating \\u2265 $5K/day. Maintain cadence; protect top performers from burnout and avoid pipeline complacency. Watch for stale late-stage deals (>1.5\\u00D7 cycle) that quietly slip, and rebalance marketing spend toward channels that consistently fill the top of funnel with qualified opps.';}" +
  "var r2='';" +
  "r2+='\\uD83D\\uDE80 Sales Velocity Calculator\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+he+' '+hl+'\\n';" +
  "r2+='\\u2022 Daily velocity: '+moneyExact(daily)+'/day  \\u00B7  Monthly: '+moneyExact(mo)+'  \\u00B7  Annual: '+moneyExact(yr)+'\\n';" +
  "r2+='\\u2022 Formula: (opps \\u00D7 deal size \\u00D7 win rate) \\u00F7 cycle = ('+o+' \\u00D7 '+money(d)+' \\u00D7 '+w+'%) \\u00F7 '+c+' days\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCCA Inputs Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Open opportunities: '+o+'\\n';" +
  "r2+='\\u2022 Average deal size: '+money(d)+'\\n';" +
  "r2+='\\u2022 Win rate: '+w+'%\\n';" +
  "r2+='\\u2022 Sales cycle: '+c+' days\\n';" +
  "r2+='\\u2022 Daily / Monthly / Annual velocity: '+moneyExact(daily)+' / '+moneyExact(mo)+' / '+moneyExact(yr)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Win rate '+w+'%\\u219230%: '+money(wr30)+'/day ('+(wr30pct>=0?'+':'')+wr30pct.toFixed(1)+'% lift)\\n';" +
  "r2+='\\u2022 Cycle '+c+'\\u219230 days: '+money(cy30)+'/day ('+(cy30pct>=0?'+':'')+cy30pct.toFixed(1)+'% lift)\\n';" +
  "r2+='\\u2022 Combined (win rate 30% AND cycle 30d): '+money(dv(o,d,30,30))+'/day\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Break-Even:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Target for \\uD83D\\uDFE2 Excellent: $5,000/day\\n';" +
  "r2+='\\u2022 Path A \\u2014 lift win rate to '+wrn.toFixed(1)+'% (cycle unchanged)\\n';" +
  "r2+='\\u2022 Path B \\u2014 compress cycle to '+Math.max(1,Math.ceil(cyn))+' days (win rate unchanged)\\n';" +
  "r2+='\\u2022 Path C \\u2014 add '+(daily>0?Math.ceil((5000-daily)/(d*(w/100)/c)):0)+' more open opps (everything else unchanged)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Milestone:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Next tier: '+nt+'\\n';" +
  "r2+='\\u2022 Gap to next tier: '+money(Math.max(0,gn))+(bd==='excellent'?' (already at top)':'')+'\\n';" +
  "r2+='\\u2022 At current pace: ~'+moneyExact(yr)+'/year revenue contribution\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCA1 Tip: '+tip+'\\n';" +
  "return [r2];";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-sales-velocity-calculator',
  title: 'Sales Velocity Calculator',
  description:
    'Measure how fast your sales pipeline generates revenue — (opportunities × deal size × win rate) ÷ cycle days. The 4-factor cascade that tells founders which lever to invest in next. Health bands: 🟢 ≥$5K/day · 🟡 $2K-$5K · 🟠 $500-$2K · 🔴 <$500.',
  categoryId: 'S',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'openOpps', label: 'Open opportunities', placeholder: 'e.g. 20', type: 'number' },
    { name: 'avgDealSize', label: 'Average deal size (USD)', placeholder: 'e.g. 25000', type: 'number' },
    { name: 'winRate', label: 'Win rate (%)', placeholder: 'e.g. 25', type: 'number' },
    { name: 'cycleDays', label: 'Sales cycle (days)', placeholder: 'e.g. 45', type: 'number' },
  ],
  keywords: [
    'sales velocity calculator',
    'sales velocity',
    'sales productivity',
    'pipeline throughput',
    'revenue velocity',
    'sales KPI',
    'B2B SaaS sales',
    'sales cycle',
    'win rate',
    'deal velocity',
  ],
  tags: ['sales', 'velocity', 'crm', 'kpi'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-07',
  sources: [
    'https://blog.hubspot.com/sales/sales-velocity',
    'https://www.insivia.com/blog/sales-velocity/',
    'https://www.gong.io/blog/sales-velocity',
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  calculate,
  generate: calculate,
  staticExamples: ['🚀 Sales Velocity Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 Good — productive sales engine; room to compress cycle or lift win rate\n• Daily velocity: $2,777.78/day  ·  Monthly: $83,333.33  ·  Annual: $1,013,888.89\n• Formula: (opps × deal size × win rate) ÷ cycle = (20 × $25,000 × 25%) ÷ 45 days\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Open opportunities: 20\n• Average deal size: $25,000\n• Win rate: 25%\n• Sales cycle: 45 days\n• Daily / Monthly / Annual velocity: $2,777.78 / $83,333.33 / $1,013,888.89\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Win rate 25%→30%: $3,333/day (+20.0% lift)\n• Cycle 45→30 days: $4,167/day (+50.0% lift)\n• Combined (win rate 30% AND cycle 30d): $5,000/day\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Target for 🟢 Excellent: $5,000/day\n• Path A — lift win rate to 45.0% (cycle unchanged)\n• Path B — compress cycle to 25 days (win rate unchanged)\n• Path C — add 16 more open opps (everything else unchanged)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Next tier: 🟢 Excellent ($5,000)\n• Gap to next tier: $2,222\n• At current pace: ~$1,013,888.89/year revenue contribution\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Daily velocity $2,000–$5,000 is productive. To reach Excellent, identify the weakest of the four levers (opps × size × win rate ÷ cycle) and invest there. Often cycle compression (e.g. self-serve trial, async demos) gives 1.5–2× lift without more headcount. Pair with pipeline value to make sure velocity growth is not masking deteriorating deal size.\n'],
  faq: [
    { q: 'What is sales velocity?', a: 'Sales velocity measures how fast your pipeline generates revenue. Formula: (number of opportunities × average deal size × win rate) ÷ sales cycle length (days). The result is dollars of revenue generated per day — the fundamental sales productivity metric for B2B SaaS and consultative sales.' },
    { q: 'What is a good sales velocity?', a: 'For B2B SaaS, daily velocity ≥ $5,000 is excellent (corresponds to ~$1.8M/year throughput). $2,000–$5,000/day is good (mid-market). Below $500/day is critical — the sales engine is stalling and you will not hit quota.' },
    { q: 'How do I improve sales velocity?', a: 'The formula has 4 levers: more opportunities, larger deals, higher win rate, faster cycle. Usually win rate and cycle compression are the fastest to move (qualification rigor + sales playbook). Doubling opps without improving win rate or cycle just inflates pipeline noise.' },
    { q: 'How does sales velocity relate to pipeline value?', a: 'Pipeline value is a static snapshot — what weighted revenue you have right now. Sales velocity is throughput — how fast that pipeline converts to closed revenue. Use pipeline value for forecast accuracy, velocity for productivity optimization. The two together identify whether weak revenue is a pipeline-fill problem or a conversion problem.' },
    { q: 'What inputs do I need?', a: 'You need four numbers from your CRM: (1) count of qualified open opportunities, (2) average contract value of closed-won deals, (3) historical win rate (closed-won ÷ total closed), (4) average days from first touch to closed-won. Most CRMs (Salesforce, HubSpot, Pipedrive) can compute these with a saved report.' },
  ],
  howToUse: [
    'Pull the count of currently-qualified open opportunities from your CRM (exclude junk/disqualified leads).',
    'Use your average contract value from the last 90 days of closed-won deals (not list price, not total pipeline).',
    'Enter historical win rate: closed-won ÷ (closed-won + closed-lost). Use trailing 6-month average to smooth seasonality.',
    'Use average sales cycle: days from first touch to closed-won for the same cohort of closed deals.',
    'Read daily velocity and the health band. Use the What-If section to model which lever (win rate, cycle, opps) moves velocity fastest.',
    'Pair with pipeline value (P8-1) to identify whether your bottleneck is pipeline fill (low opps) or pipeline conversion (low win rate / long cycle).',
  ],
};
registerEngine(engine);
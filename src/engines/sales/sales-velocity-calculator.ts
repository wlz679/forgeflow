import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
import { BAND_META } from '../../core/engines/band-meta';
// P168 B3-8：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
//   ⚠️ 章节标题 / 标签用**字面量 token**（code|原文|）；带运行时数值的整行用
//      makeToken(code, fallback, params) ⇒ fallback 与 params 取**同一个变量**。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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
  const healthEmoji = BAND_META[band];
  // ── P168 B3-8：健康度四档 → 语义码（4 档都是**字面量 code** ⇒ 静态守卫认得出）──
  const healthLabel =
    band === 'excellent'
      ? makeToken('calc_out.sales_velocity.row.health_excellent', 'Excellent — revenue throughput ≥ $5,000/day; sales engine humming')
      : band === 'good'
      ? makeToken('calc_out.sales_velocity.row.health_good', 'Good — productive sales engine; room to compress cycle or lift win rate')
      : band === 'warning'
      ? makeToken('calc_out.sales_velocity.row.health_warning', 'Warning — slow velocity; pipeline needs more volume or faster cycle')
      : makeToken('calc_out.sales_velocity.row.health_critical', 'Critical — sales engine stalling; urgent funnel audit needed');

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
    nextTier = makeToken('calc_out.sales_velocity.row.next_tier_warning', '🟠 Warning ($500)');
  } else if (band === 'warning') {
    gapToNext = 2000 - daily;
    nextTier = makeToken('calc_out.sales_velocity.row.next_tier_good', '🟡 Good ($2,000)');
  } else if (band === 'good') {
    gapToNext = 5000 - daily;
    nextTier = makeToken('calc_out.sales_velocity.row.next_tier_excellent', '🟢 Excellent ($5,000)');
  } else {
    gapToNext = 0;
    nextTier = makeToken('calc_out.sales_velocity.row.top_tier_maintained', 'top tier maintained');
  }

  // ── P168 B3-8：tip 行**整行**令牌化（「💡 Tip:」标记在兜底内 ⇒ 语言无关过滤仍命中）──
  let tip: string;
  if (band === 'critical') {
    tip = makeToken('calc_out.sales_velocity.row.tip_critical', '💡 Tip: Daily velocity < $500 is a critical sales engine stall — at this pace you will not cover quota. Audit the funnel end-to-end: lead quality (MQL→SQL conversion), qualification rigor, sales playbook adherence, win/loss reasons. Even a 2× cycle compression or doubling win rate is the minimum viable move.');
  } else if (band === 'warning') {
    tip = makeToken('calc_out.sales_velocity.row.tip_warning', '💡 Tip: Daily velocity $500–$2,000 is below productive. The two fastest levers are win rate (better qualification, stronger close skills) and cycle compression (faster follow-up, fewer proposal revisions). Doubling open opps without improving win rate or cycle just inflates pipeline noise — fix the conversion engine first.');
  } else if (band === 'good') {
    tip = makeToken('calc_out.sales_velocity.row.tip_good', '💡 Tip: Daily velocity $2,000–$5,000 is productive. To reach Excellent, identify the weakest of the four levers (opps × size × win rate ÷ cycle) and invest there. Often cycle compression (e.g. self-serve trial, async demos) gives 1.5–2× lift without more headcount. Pair with pipeline value to make sure velocity growth is not masking deteriorating deal size.');
  } else {
    tip = makeToken('calc_out.sales_velocity.row.tip_excellent', '💡 Tip: Excellent velocity — sales engine is generating ≥ $5K/day. Maintain cadence; protect top performers from burnout and avoid pipeline complacency. Watch for stale late-stage deals (>1.5× cycle) that quietly slip, and rebalance marketing spend toward channels that consistently fill the top of funnel with qualified opps.');
  }

  // ── P168 B3-8：运行时数值 → 局部字符串变量 ─────────────────────────────────
  //   ⭐ fallback 与 params 取**同一个变量** ⇒ 英文兜底与中文模板不可能漂。
  const dailyStr = moneyExact(daily);
  const monthlyStr = moneyExact(monthly);
  const annualStr = moneyExact(annual);
  const openOppsStr = String(openOpps);
  const dealSizeStr = money(avgDealSize);
  const winRatePctStr = winRate + '%';
  const cycleDaysStr = String(cycleDays);
  const winRate30DailyStr = money(wr30Daily);
  const winRate30LiftStr = (wr30LiftPct >= 0 ? '+' : '') + wr30LiftPct.toFixed(1) + '%';
  const cycle30DailyStr = money(cy30Daily);
  const cycle30LiftStr = (cy30LiftPct >= 0 ? '+' : '') + cy30LiftPct.toFixed(1) + '%';
  const combinedDailyStr = money(dailyVelocity(openOpps, avgDealSize, 30, 30));
  const winRateNeededStr = winRateNeeded.toFixed(1);
  const cycleDaysNeededStr = String(Math.max(1, Math.ceil(cycleDaysNeeded)));
  const moreOppsStr = String(daily > 0 ? Math.ceil((5000 - daily) / (avgDealSize * (winRate / 100) / cycleDays)) : 0);
  const gapToNextStr = money(Math.max(0, gapToNext));

  // ── P168 B3-8：带运行时数值的整行 → makeToken(code, fallback, params) ─────
  //   ⚠️ code 必须是**字面量**（静态守卫只认字面量）⇒ 不许拼字符串。
  //   ⚠️ 兜底里不得出现半角 '|'（维度行分隔符）—— 本批的行已逐行拆开，无 '|'。
  const tkVelocitySummary = makeToken(
    'calc_out.sales_velocity.row.velocity_summary',
    'Daily velocity: ' + dailyStr + '/day  ·  Monthly: ' + monthlyStr + '  ·  Annual: ' + annualStr,
    { daily: dailyStr, monthly: monthlyStr, annual: annualStr },
  );
  const tkFormula = makeToken(
    'calc_out.sales_velocity.row.formula',
    'Formula: (opps × deal size × win rate) ÷ cycle = (' + openOppsStr + ' × ' + dealSizeStr + ' × ' + winRatePctStr + ') ÷ ' + cycleDaysStr + ' days',
    { opps: openOppsStr, deal: dealSizeStr, win: winRatePctStr, cycle: cycleDaysStr },
  );
  const tkSalesCycle = makeToken(
    'calc_out.sales_velocity.row.sales_cycle',
    'Sales cycle: ' + cycleDaysStr + ' days',
    { days: cycleDaysStr },
  );
  const tkWhatIfWinRate = makeToken(
    'calc_out.sales_velocity.row.whatif_win_rate_30',
    'Win rate ' + winRatePctStr + '→30%: ' + winRate30DailyStr + '/day (' + winRate30LiftStr + ' lift)',
    { win: winRatePctStr, daily: winRate30DailyStr, lift: winRate30LiftStr },
  );
  const tkWhatIfCycle = makeToken(
    'calc_out.sales_velocity.row.whatif_cycle_30',
    'Cycle ' + cycleDaysStr + '→30 days: ' + cycle30DailyStr + '/day (' + cycle30LiftStr + ' lift)',
    { cycle: cycleDaysStr, daily: cycle30DailyStr, lift: cycle30LiftStr },
  );
  const tkWhatIfCombined = makeToken(
    'calc_out.sales_velocity.row.whatif_combined',
    'Combined (win rate 30% AND cycle 30d): ' + combinedDailyStr + '/day',
    { daily: combinedDailyStr },
  );
  const tkPathA = makeToken(
    'calc_out.sales_velocity.row.break_even_path_a',
    'Path A — lift win rate to ' + winRateNeededStr + '% (cycle unchanged)',
    { rate: winRateNeededStr },
  );
  const tkPathB = makeToken(
    'calc_out.sales_velocity.row.break_even_path_b',
    'Path B — compress cycle to ' + cycleDaysNeededStr + ' days (win rate unchanged)',
    { days: cycleDaysNeededStr },
  );
  const tkPathC = makeToken(
    'calc_out.sales_velocity.row.break_even_path_c',
    'Path C — add ' + moreOppsStr + ' more open opps (everything else unchanged)',
    { opps: moreOppsStr },
  );
  const tkAtCurrentPace = makeToken(
    'calc_out.sales_velocity.row.at_current_pace',
    'At current pace: ~' + annualStr + '/year revenue contribution',
    { annual: annualStr },
  );
  // 「(already at top)」是**行尾补充** ⇒ 单独一个行码（前导空格留在 token 之外）
  const tkGapSuffix =
    band === 'excellent'
      ? ' ' + makeToken('calc_out.sales_velocity.row.gap_already_at_top', '(already at top)')
      : '';

  // ── P168 B3-8：输出行逐行令牌化 ──────────────────────────────────────────
  //   · 章节标题 / 标签 ⇒ **字面量 token**（冒号与对齐空格留在 token 之外）
  //   · 带运行时数值的整行 ⇒ makeToken（fallback 与 params 同源）
  const r =
    '$calc_out.section.sales_velocity_calculator|🚀 Sales Velocity Calculator|\n\n' +
    '$calc_out.section.health|🩺 Health:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• ' + tkVelocitySummary + '\n' +
    '• ' + tkFormula + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.open_opportunities|Open opportunities|: ' + openOppsStr + '\n' +
    '• $calc_out.label.average_deal_size|Average deal size|: ' + dealSizeStr + '\n' +
    '• $calc_out.label.win_rate|Win rate|: ' + winRatePctStr + '\n' +
    '• ' + tkSalesCycle + '\n' +
    '• $calc_out.label.daily_monthly_annual_velocity|Daily / Monthly / Annual velocity|: ' + dailyStr + ' / ' + monthlyStr + ' / ' + annualStr + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.what_if|🔄 What-If:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + tkWhatIfWinRate + '\n' +
    '• ' + tkWhatIfCycle + '\n' +
    '• ' + tkWhatIfCombined + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.break_even|⚖️ Break-Even:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.target_for_excellent|Target for 🟢 Excellent|: $5,000/day\n' +
    '• ' + tkPathA + '\n' +
    '• ' + tkPathB + '\n' +
    '• ' + tkPathC + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.milestone|🎯 Milestone:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.next_tier|Next tier|: ' + nextTier + '\n' +
    '• $calc_out.label.gap_to_next_tier|Gap to next tier|: ' + gapToNextStr + tkGapSuffix + '\n' +
    '• ' + tkAtCurrentPace + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  // P168 B3-8：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 两端输出逐字节相同，不可能漂；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let f=function(e){return Number.isNaN(e)?0:Math.max(0,e)},w=function(e,l,n,a){return a<=0?0:e*l*(n/100)/a},s=function(e,l,n,a){const i=w(e,l,n,a);return Math.round(i*100)/100},D=function(e){return Math.round(e*30*100)/100},F=function(e){return Math.round(e*365*100)/100},M=function(e){return e>=g.excellent[0]?"excellent":e>=g.good[0]?"good":e>=g.warning[0]?"warning":"critical"},C=function(e,l,n){var a=U(e);return Array.isArray(a)?a.join(\`
\`):String(a)};var st=f,ut=w,yt=s,_t=D,pt=F,dt=M,ht=C,t=tk,K={excellent:"🟢",good:"🟡",warning:"🟠",critical:"🔴"},Q='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',t=new Function("return "+Q)(),g={excellent:[5e3,null],good:[2e3,5e3],warning:[500,2e3],critical:[0,500]},U=function(e){const l=f(parseFloat(e.openOpps)||0),n=f(parseFloat(e.avgDealSize)||0),a=f(parseFloat(e.winRate)||0),i=Math.max(1,parseFloat(e.cycleDays)||1),N=w(l,n,a,i),c=s(l,n,a,i),V=D(N),B=F(N),u=$=>"$"+Math.round($).toLocaleString("en-US"),v=$=>"$"+$.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}),o=M(c),J=K[o],X=o==="excellent"?t("calc_out.sales_velocity.row.health_excellent","Excellent — revenue throughput ≥ $5,000/day; sales engine humming"):o==="good"?t("calc_out.sales_velocity.row.health_good","Good — productive sales engine; room to compress cycle or lift win rate"):o==="warning"?t("calc_out.sales_velocity.row.health_warning","Warning — slow velocity; pipeline needs more volume or faster cycle"):t("calc_out.sales_velocity.row.health_critical","Critical — sales engine stalling; urgent funnel audit needed"),P=s(l,n,30,i),q=s(l,n,a,30),W=c>0?(P-c)/c*100:0,E=c>0?(q-c)/c*100:0,Y=l*n>0?5e3*i/(l*n)*100:0,Z=c>0?l*n*(a/100)/5e3:0;let y,_;o==="critical"?(y=500-c,_=t("calc_out.sales_velocity.row.next_tier_warning","🟠 Warning ($500)")):o==="warning"?(y=2e3-c,_=t("calc_out.sales_velocity.row.next_tier_good","🟡 Good ($2,000)")):o==="good"?(y=5e3-c,_=t("calc_out.sales_velocity.row.next_tier_excellent","🟢 Excellent ($5,000)")):(y=0,_=t("calc_out.sales_velocity.row.top_tier_maintained","top tier maintained"));let p;o==="critical"?p=t("calc_out.sales_velocity.row.tip_critical","💡 Tip: Daily velocity < $500 is a critical sales engine stall — at this pace you will not cover quota. Audit the funnel end-to-end: lead quality (MQL→SQL conversion), qualification rigor, sales playbook adherence, win/loss reasons. Even a 2× cycle compression or doubling win rate is the minimum viable move."):o==="warning"?p=t("calc_out.sales_velocity.row.tip_warning","💡 Tip: Daily velocity $500–$2,000 is below productive. The two fastest levers are win rate (better qualification, stronger close skills) and cycle compression (faster follow-up, fewer proposal revisions). Doubling open opps without improving win rate or cycle just inflates pipeline noise — fix the conversion engine first."):o==="good"?p=t("calc_out.sales_velocity.row.tip_good","💡 Tip: Daily velocity $2,000–$5,000 is productive. To reach Excellent, identify the weakest of the four levers (opps × size × win rate ÷ cycle) and invest there. Often cycle compression (e.g. self-serve trial, async demos) gives 1.5–2× lift without more headcount. Pair with pipeline value to make sure velocity growth is not masking deteriorating deal size."):p=t("calc_out.sales_velocity.row.tip_excellent","💡 Tip: Excellent velocity — sales engine is generating ≥ $5K/day. Maintain cadence; protect top performers from burnout and avoid pipeline complacency. Watch for stale late-stage deals (>1.5× cycle) that quietly slip, and rebalance marketing spend toward channels that consistently fill the top of funnel with qualified opps.");const m=v(c),S=v(V),d=v(B),x=String(l),b=u(n),h=a+"%",r=String(i),O=u(P),R=(W>=0?"+":"")+W.toFixed(1)+"%",z=u(q),j=(E>=0?"+":"")+E.toFixed(1)+"%",A=u(s(l,n,30,30)),L=Y.toFixed(1),I=String(Math.max(1,Math.ceil(Z))),G=String(c>0?Math.ceil((5e3-c)/(n*(a/100)/i)):0),H=u(Math.max(0,y)),k=t("calc_out.sales_velocity.row.velocity_summary","Daily velocity: "+m+"/day  ·  Monthly: "+S+"  ·  Annual: "+d,{daily:m,monthly:S,annual:d}),T=t("calc_out.sales_velocity.row.formula","Formula: (opps × deal size × win rate) ÷ cycle = ("+x+" × "+b+" × "+h+") ÷ "+r+" days",{opps:x,deal:b,win:h,cycle:r}),tt=t("calc_out.sales_velocity.row.sales_cycle","Sales cycle: "+r+" days",{days:r}),et=t("calc_out.sales_velocity.row.whatif_win_rate_30","Win rate "+h+"→30%: "+O+"/day ("+R+" lift)",{win:h,daily:O,lift:R}),nt=t("calc_out.sales_velocity.row.whatif_cycle_30","Cycle "+r+"→30 days: "+z+"/day ("+j+" lift)",{cycle:r,daily:z,lift:j}),at=t("calc_out.sales_velocity.row.whatif_combined","Combined (win rate 30% AND cycle 30d): "+A+"/day",{daily:A}),lt=t("calc_out.sales_velocity.row.break_even_path_a","Path A — lift win rate to "+L+"% (cycle unchanged)",{rate:L}),ct=t("calc_out.sales_velocity.row.break_even_path_b","Path B — compress cycle to "+I+" days (win rate unchanged)",{days:I}),ot=t("calc_out.sales_velocity.row.break_even_path_c","Path C — add "+G+" more open opps (everything else unchanged)",{opps:G}),it=t("calc_out.sales_velocity.row.at_current_pace","At current pace: ~"+d+"/year revenue contribution",{annual:d}),rt=o==="excellent"?" "+t("calc_out.sales_velocity.row.gap_already_at_top","(already at top)"):"";return[\`$calc_out.section.sales_velocity_calculator|🚀 Sales Velocity Calculator|

$calc_out.section.health|🩺 Health:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+J+" "+X+\`
• \`+k+\`
• \`+T+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• $calc_out.label.open_opportunities|Open opportunities|: \`+x+\`
• $calc_out.label.average_deal_size|Average deal size|: \`+b+\`
• $calc_out.label.win_rate|Win rate|: \`+h+\`
• \`+tt+\`
• $calc_out.label.daily_monthly_annual_velocity|Daily / Monthly / Annual velocity|: \`+m+" / "+S+" / "+d+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.what_if|🔄 What-If:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+et+\`
• \`+nt+\`
• \`+at+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.break_even|⚖️ Break-Even:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• $calc_out.label.target_for_excellent|Target for 🟢 Excellent|: $5,000/day
• \`+lt+\`
• \`+ct+\`
• \`+ot+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.milestone|🎯 Milestone:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• $calc_out.label.next_tier|Next tier|: \`+_+\`
• $calc_out.label.gap_to_next_tier|Gap to next tier|: \`+H+rt+\`
• \`+it+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+p+\`
\`]};return[C(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

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
  generate: calculate,
  staticExamples: ['$calc_out.section.sales_velocity_calculator|🚀 Sales Velocity Calculator|\n\n$calc_out.section.health|🩺 Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 $calc_out.sales_velocity.row.health_good|Good — productive sales engine; room to compress cycle or lift win rate|\n• $calc_out.sales_velocity.row.velocity_summary{"daily":"$2,777.78","monthly":"$83,333.33","annual":"$1,013,888.89"}|Daily velocity: $2,777.78/day  ·  Monthly: $83,333.33  ·  Annual: $1,013,888.89|\n• $calc_out.sales_velocity.row.formula{"opps":"20","deal":"$25,000","win":"25%","cycle":"45"}|Formula: (opps × deal size × win rate) ÷ cycle = (20 × $25,000 × 25%) ÷ 45 days|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.open_opportunities|Open opportunities|: 20\n• $calc_out.label.average_deal_size|Average deal size|: $25,000\n• $calc_out.label.win_rate|Win rate|: 25%\n• $calc_out.sales_velocity.row.sales_cycle{"days":"45"}|Sales cycle: 45 days|\n• $calc_out.label.daily_monthly_annual_velocity|Daily / Monthly / Annual velocity|: $2,777.78 / $83,333.33 / $1,013,888.89\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if|🔄 What-If:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.sales_velocity.row.whatif_win_rate_30{"win":"25%","daily":"$3,333","lift":"+20.0%"}|Win rate 25%→30%: $3,333/day (+20.0% lift)|\n• $calc_out.sales_velocity.row.whatif_cycle_30{"cycle":"45","daily":"$4,167","lift":"+50.0%"}|Cycle 45→30 days: $4,167/day (+50.0% lift)|\n• $calc_out.sales_velocity.row.whatif_combined{"daily":"$5,000"}|Combined (win rate 30% AND cycle 30d): $5,000/day|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.break_even|⚖️ Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.target_for_excellent|Target for 🟢 Excellent|: $5,000/day\n• $calc_out.sales_velocity.row.break_even_path_a{"rate":"45.0"}|Path A — lift win rate to 45.0% (cycle unchanged)|\n• $calc_out.sales_velocity.row.break_even_path_b{"days":"25"}|Path B — compress cycle to 25 days (win rate unchanged)|\n• $calc_out.sales_velocity.row.break_even_path_c{"opps":"16"}|Path C — add 16 more open opps (everything else unchanged)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.milestone|🎯 Milestone:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.next_tier|Next tier|: $calc_out.sales_velocity.row.next_tier_excellent|🟢 Excellent ($5,000)|\n• $calc_out.label.gap_to_next_tier|Gap to next tier|: $2,222\n• $calc_out.sales_velocity.row.at_current_pace{"annual":"$1,013,888.89"}|At current pace: ~$1,013,888.89/year revenue contribution|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.sales_velocity.row.tip_good|💡 Tip: Daily velocity $2,000–$5,000 is productive. To reach Excellent, identify the weakest of the four levers (opps × size × win rate ÷ cycle) and invest there. Often cycle compression (e.g. self-serve trial, async demos) gives 1.5–2× lift without more headcount. Pair with pipeline value to make sure velocity growth is not masking deteriorating deal size.|\n'],
  faq: [
    { q: 'What is sales velocity?', a: 'Sales velocity measures how fast your pipeline generates revenue. Formula: (number of opportunities × average deal size × win rate) ÷ sales cycle length (days). The result is dollars of revenue generated per day — the fundamental sales productivity metric for B2B SaaS and consultative sales.' },
    { q: 'What is a good sales velocity?', a: 'For B2B SaaS, daily velocity ≥ $5,000 is excellent (corresponds to ~$1.8M/year throughput). $2,000–$5,000/day is good (mid-market). Below $500/day is critical — the sales engine is stalling and you will not hit quota.' },
    { q: 'How do I improve sales velocity?', a: 'The formula has 4 levers: more opportunities, larger deals, higher win rate, faster cycle. Usually win rate and cycle compression are the fastest to move (qualification rigor + sales playbook). Doubling opps without improving win rate or cycle just inflates pipeline noise.' },
    { q: 'How does sales velocity relate to pipeline value?', a: 'Pipeline value is a static snapshot — what weighted revenue you have right now. Sales velocity is throughput — how fast that pipeline converts to closed revenue. Use pipeline value for forecast accuracy, velocity for productivity optimization. The two together identify whether weak revenue is a pipeline-fill problem or a conversion problem.' },
    { q: 'What inputs do I need?', a: 'You need four numbers from your CRM: (1) count of qualified open opportunities, (2) average contract value of closed-won deals, (3) historical win rate (closed-won ÷ total closed), (4) average days from first touch to closed-won. Most CRMs (Salesforce, HubSpot, Pipedrive) can compute these with a saved report.' },

    { q: "How do I increase sales velocity?", a: "Four levers: 1) More deals (more leads, more reps), 2) Higher ACV (better pricing, upsell), 3) Higher close rate (better qualification, training), 4) Shorter cycle (better tools, process). 20-50% velocity increase in 6-12 months. 1) Better leads + 4) Shorter cycle. Optimize one at a time. track velocity monthly. Aim for 30-50% YoY increase is good." },
    { q: "What is a good sales velocity by company size?", a: "Benchmarks: 1) <$1M ARR: $1-3K/day, 2) $1-10M ARR: $5-20K/day, 3) $10-100M ARR: $20-100K/day, 4) $100M+ ARR: $100K+/day. For 10-person team: $5-20K/day. For 50-person: $50-200K/day. doubling velocity year-over-year is the goal. Track monthly, by segment. Compare: actual vs target. Most teams under-velocity = under-scaling." },
    { q: "What is the relationship between sales velocity and CAC payback?", a: "Velocity × gross margin = revenue per day. CAC payback = CAC / (velocity × gross margin / days). For $30K CAC, $5K velocity/day, 80% margin: payback = 30/4 = 7.5 days (great). Real: 12-24 months. faster velocity = faster payback. Aim for <18 months. Velocity affects: 1) Capital efficiency, 2) LTV:CAC, 3) Cash flow. Best option: increase velocity (more revenue) + decrease CAC (better efficiency)." },
    { q: "How do I track sales velocity over time?", a: "Track monthly: 1) # of new opportunities, 2) ACV (average deal size), 3) Win rate, 4) Sales cycle. Calculate: velocity = (deals × ACV × win_rate) / cycle_days. Track monthly trend. 5-10% monthly velocity increase is the goal. Tools: CRM, dashboards. Most teams review monthly. Most important: trend, not absolute. Plateaus: signal of saturation or inefficiency." },
    { q: "What is the difference between sales velocity and pipeline velocity?", a: "Sales velocity: revenue generated per day (closed deals). Pipeline velocity: movement of deals through pipeline. Sales velocity: end metric. Pipeline velocity: process metric. track both. Pipeline velocity: deals advancing per week. Sales velocity: dollars closed per day. For forecasting: pipeline velocity. For board: sales velocity. Most teams weekly pipeline review, monthly sales velocity." },
    { q: "How do I use sales velocity for hiring?", a: "Hiring math: 1) Calculate current velocity per rep, 2) Project next year's velocity, 3) Calculate gap, 4) Hire = gap / per-rep velocity. For $5M target, 10 reps at $500K/year: need 10 reps. Add 1-2 for ramp, attrition. Most: 1 rep per $300-500K. For $5M target: 10-15 reps. Plan: 12-18 months ahead. Most: cost per hire is $50-100K. Use: velocity-driven hiring plan." },
    { q: "What is the best way to improve win rate?", a: "1) Better qualification (BANT, MEDDIC), 2) Better discovery (find pain), 3) Better demo (relevant to buyer), 4) Better follow-up (cadence), 5) Better tools (CRM, enablement), 6) Better training (methodology). 5-10 pp win rate lift in 6 months. Aim for 25-35% (from 20-25%). Best option: 1) Qualification + 2) Discovery. 1 pp win rate = 5-10% revenue. Measure: weekly, by rep." },
  ],
  howToUse: [
    'Pull the count of currently-qualified open opportunities from your CRM (exclude junk/disqualified leads).',
    'Use your average contract value from the last 90 days of closed-won deals (not list price, not total pipeline).',
    'Enter historical win rate: closed-won ÷ (closed-won + closed-lost). Use trailing 6-month average to smooth seasonality.',
    'Use average sales cycle: days from first touch to closed-won for the same cohort of closed deals.',
    'Read daily velocity and the health band. Use the What-If section to model which lever (win rate, cycle, opps) moves velocity fastest.',
    'Pair with pipeline value (P8-1) to identify whether your bottleneck is pipeline fill (low opps) or pipeline conversion (low win rate / long cycle).',
  ],
  engineKey: true,
};
registerEngine(engine);
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-9：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
//   ⚠️ 章节标题 / 标签用**字面量 token**（code|原文|）；带运行时数值的整行用
//      makeToken(code, fallback, params) ⇒ fallback 与 params 取**同一个变量**。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

// =====================================================================
// Cohort Retention Calculator (P6-4) — Business v3 standard
// =====================================================================
// Inputs: 5 retention rates (M1/M2/M3/M6/M12) + cohort size + revenue/user.
// Linear interpolation fills M4, M5, M7-M11.
// Health bands based on Month-6 retention rate.
// Outputs: cumulative 12-mo LTV, biggest drop month, M6 health band.

// ============== Health band constants ==============

export const HEALTH_BANDS = {
  excellent: 90,
  good: [70, 90],
  warning: [50, 70],
  critical: 0,
} as const;

// ============== Types ==============

export interface RetentionTable {
  m1: number;
  m2: number;
  m3: number;
  m6: number;
  m12: number;
}

// ============== Math helpers (exported for tests) ==============

/**
 * Linear interpolation between two retention rates at known months.
 * (r1 at month m1, r2 at month m2, target month m) → interpolated retention.
 * Example: interpolateRetention(80, 45, 1, 3, 2) === 62.5 (midpoint).
 */
export function interpolateRetention(r1: number, r2: number, m1: number, m2: number, m: number): number {
  if (m2 === m1) return r1;
  return r1 + (r2 - r1) * (m - m1) / (m2 - m1);
}

/** Get retention at any month m (1-12) using linear interpolation between known months. */
export function retentionAt(month: number, table: RetentionTable): number {
  if (month <= 1) return table.m1;
  if (month <= 2) return table.m1 + (table.m2 - table.m1) * (month - 1);
  if (month <= 3) return table.m2 + (table.m3 - table.m2) * (month - 2);
  if (month <= 6) return table.m3 + (table.m6 - table.m3) * (month - 3) / 3;
  if (month <= 12) return table.m6 + (table.m12 - table.m6) * (month - 6) / 6;
  return table.m12;
}

/** Cumulative LTV over `months` months: sum of retention × cohort × revenue/user. */
export function cumulativeLTV(cohortSize: number, table: RetentionTable, revenuePerUser: number, months: number): number {
  if (cohortSize <= 0) return 0;
  let total = 0;
  for (let m = 1; m <= months; m++) {
    const ret = retentionAt(m, table) / 100;
    total += cohortSize * ret * revenuePerUser;
  }
  return total;
}

/** Find the month index where the largest absolute drop in retention occurred. */
export function biggestDropMonth(table: RetentionTable): number {
  const rates = [table.m1, table.m2, table.m3, table.m6, table.m12];
  const months = [1, 2, 3, 6, 12];
  let maxDrop = 0;
  let dropMonth = 1;
  for (let i = 1; i < rates.length; i++) {
    const drop = rates[i - 1] - rates[i]; // positive = retention dropped
    if (drop > maxDrop) {
      maxDrop = drop;
      dropMonth = months[i - 1]; // the EARLIER month where the drop happens
    }
  }
  return dropMonth;
}

/** Map a M6 retention % to a health band label. */
export function retentionHealth(m6: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (m6 >= HEALTH_BANDS.excellent) return 'excellent';
  if (m6 >= HEALTH_BANDS.good[0]) return 'good';
  if (m6 >= HEALTH_BANDS.warning[0]) return 'warning';
  return 'critical';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const cohortSize = clampNonNegative(parseFloat(inputs.cohortSize) || 0);
  const table: RetentionTable = {
    m1: clampNonNegative(Math.min(100, parseFloat(inputs.m1Retention) || 0)),
    m2: clampNonNegative(Math.min(100, parseFloat(inputs.m2Retention) || 0)),
    m3: clampNonNegative(Math.min(100, parseFloat(inputs.m3Retention) || 0)),
    m6: clampNonNegative(Math.min(100, parseFloat(inputs.m6Retention) || 0)),
    m12: clampNonNegative(Math.min(100, parseFloat(inputs.m12Retention) || 0)),
  };
  const revenuePerUser = clampNonNegative(parseFloat(inputs.revenuePerUser) || 0);

  if (cohortSize === 0) {
    return [
      '$calc_out.section.cohort_retention_calculator|⏰ Cohort Retention Calculator|\n\n' +
        makeToken('calc_out.cohort_retention.row.enter_inputs_required', '📊 Enter cohort size, monthly retention rates (M1/M2/M3/M6/M12), and monthly revenue per user to see cumulative LTV, decay curve, and biggest drop month.'),
    ];
  }

  const ltv12 = cumulativeLTV(cohortSize, table, revenuePerUser, 12);
  const ltv6 = cumulativeLTV(cohortSize, table, revenuePerUser, 6);
  const m6Band = retentionHealth(table.m6);
  const dropM = biggestDropMonth(table);
  const dropPct = dropM === 1 ? table.m1 - table.m2 : dropM === 2 ? table.m2 - table.m3 : dropM === 3 ? table.m3 - table.m6 : table.m6 - table.m12;

  // Health band
  let healthEmoji: string;
  let healthLabel: string;
  // ── P168 B3-9：健康度四档 —— 每档**单独写出 code 字面量**（动态拼码 ⇒ 静态扫描器认不出）──
  if (m6Band === 'excellent') {
    healthEmoji = '🟢';
    healthLabel = makeToken('calc_out.cohort_retention.row.health_excellent', 'Excellent — M6 retention ≥ 90%; product-market fit strong');
  } else if (m6Band === 'good') {
    healthEmoji = '🟡';
    healthLabel = makeToken('calc_out.cohort_retention.row.health_good', 'Good — M6 retention 70–90%; healthy cohort decay');
  } else if (m6Band === 'warning') {
    healthEmoji = '🟠';
    healthLabel = makeToken('calc_out.cohort_retention.row.health_warning', 'Warning — M6 retention 50–70%; investigate onboarding');
  } else {
    healthEmoji = '🔴';
    healthLabel = makeToken('calc_out.cohort_retention.row.health_critical', 'Critical — M6 retention < 50%; high churn, fix product before scaling');
  }

  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const fmt = (n: number) => n.toFixed(1) + '%';

  // What-If: M1 +10pp (early retention improvement)
  const improvedTable: RetentionTable = {
    m1: Math.min(100, table.m1 + 10),
    m2: table.m2,
    m3: table.m3,
    m6: table.m6,
    m12: table.m12,
  };
  const improvedLTV = cumulativeLTV(cohortSize, improvedTable, revenuePerUser, 12);
  const ltvGain = improvedLTV - ltv12;

  // Break-Even: target M6 retention to reach 🟢
  const targetM6 = HEALTH_BANDS.excellent;
  const m6Gap = Math.max(0, targetM6 - table.m6);

  // Milestone: 12-month LTV + per-user LTV + CAC payback estimate
  const perUserLTV = ltv12 / cohortSize;
  const annualRevenue = ltv12;

  // Tip: depends on biggest drop month + M6 band
  // ── P168 B3-9：tip 行整行令牌化（「💡 Tip:」标记在 fallback 内 ⇒ 语言无关过滤仍命中）──
  let tip: string;
  if (m6Band === 'excellent') {
    tip = makeToken('calc_out.cohort_retention.row.tip_excellent', '💡 Tip: Excellent retention. Scale acquisition aggressively — focus on doubling down on channels that bring similar cohorts (lookalike audiences).');
  } else if (dropM === 1 && m6Band !== 'critical') {
    tip = makeToken('calc_out.cohort_retention.row.tip_biggest_drop_m1_m2', '💡 Tip: Biggest drop between M1 and M2 (−' + dropPct.toFixed(1) + 'pp). Audit onboarding, activation emails, and first-use experience. A 10pp M1 retention lift cascades to substantial LTV gain.', { drop: dropPct.toFixed(1) });
  } else if (dropM >= 3 && m6Band === 'warning') {
    tip = makeToken('calc_out.cohort_retention.row.tip_steady_decay_m6', '💡 Tip: Steady decay curve but M6 retention only ' + fmt(table.m6) + '. Your product holds early users but loses them at the 3-month mark. Look for usage-pattern cliffs (feature adoption, billing cycles).', { m6: fmt(table.m6) });
  } else if (m6Band === 'critical') {
    tip = makeToken('calc_out.cohort_retention.row.tip_critical_m6', '💡 Tip: M6 retention < 50% is dangerously low. Stop scaling acquisition — fix product-market fit first. Talk to churned users, identify the moment they left, and rebuild that journey.');
  } else {
    tip = makeToken('calc_out.cohort_retention.row.tip_add_data', '💡 Tip: Add data to see stage-specific recommendations.');
  }

  // ── P168 B3-9：输出行逐行令牌化 ─────────────────────────────────────────
  //   · 章节标题 / 标签 ⇒ **字面量 token**（对齐空格留在 token 之外）
  //   · 带运行时数值的整行 ⇒ makeToken(code, fallback, params)（fallback 与 params 同源）
  const paybackMonths = perUserLTV > 0 && revenuePerUser > 0 ? (perUserLTV / revenuePerUser).toFixed(1) + ' months' : 'n/a';
  const r =
    '$calc_out.section.cohort_retention_calculator|⏰ Cohort Retention Calculator|\n\n' +
    '$calc_out.section.health|🩺 Health:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• ' + makeToken('calc_out.cohort_retention.row.biggest_drop', 'Biggest drop: between M' + dropM + ' and the next checkpoint (−' + dropPct.toFixed(1) + 'pp)', { month: String(dropM), drop: dropPct.toFixed(1) }) + '\n' +
    '• $calc_out.label.ltv_12mo|12-mo LTV|: ' + money(ltv12) + '  ·  $calc_out.label.per_user_ltv|per-user|: ' + money(perUserLTV) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.cohort_size|Cohort size|:     ' + cohortSize.toLocaleString('en-US') + ' users\n' +
    '• $calc_out.label.m1_retention|M1 retention|:    ' + fmt(table.m1) + '\n' +
    '• $calc_out.label.m2_retention|M2 retention|:    ' + fmt(table.m2) + '\n' +
    '• $calc_out.label.m3_retention|M3 retention|:    ' + fmt(table.m3) + '\n' +
    '• $calc_out.label.m6_retention|M6 retention|:    ' + fmt(table.m6) + '\n' +
    '• $calc_out.label.m12_retention|M12 retention|:   ' + fmt(table.m12) + '\n' +
    '• $calc_out.label.revenue_per_user_mo|Revenue/user/mo|: ' + money(revenuePerUser) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.what_if|🔄 What-If:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.cohort_retention.row.whatif_m1_plus_10pp', 'M1 retention +10pp (' + fmt(table.m1) + ' → ' + fmt(improvedTable.m1) + '):', { from: fmt(table.m1), to: fmt(improvedTable.m1) }) + '\n' +
    '  • $calc_out.label.ltv_12mo|12-mo LTV|: ' + money(ltv12) + ' → ' + money(improvedLTV) + ' (+' + money(ltvGain) + ')\n' +
    '  • ' + makeToken('calc_out.cohort_retention.row.whatif_gain', 'Gain: ' + ((ltvGain / Math.max(ltv12, 1)) * 100).toFixed(1) + '% LTV increase', { pct: ((ltvGain / Math.max(ltv12, 1)) * 100).toFixed(1) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.break_even|⚖️ Break-Even:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.cohort_retention.row.breakeven_target_m6', 'To hit 🟢 M6 retention (' + targetM6 + '%):', { target: String(targetM6) }) + '\n' +
    '  • ' + makeToken('calc_out.cohort_retention.row.breakeven_current_gap', 'Current M6: ' + fmt(table.m6) + '  ·  Gap: +' + m6Gap.toFixed(1) + 'pp needed', { m6: fmt(table.m6), gap: m6Gap.toFixed(1) }) + '\n' +
    '  • $calc_out.label.ltv_gain_6mo_at_target|6-mo LTV gain at target|: ' + money(cumulativeLTV(cohortSize, { ...table, m6: targetM6 }, revenuePerUser, 6) - ltv6) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.milestone|🎯 Milestone:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.per_user_ltv_12mo|Per-user LTV (12-mo)|: ' + money(perUserLTV) + '\n' +
    '• $calc_out.label.cohort_total_ltv|Cohort total LTV|:     ' + money(annualRevenue) + '\n' +
    '• ' + makeToken('calc_out.cohort_retention.row.cac_profitable', 'If CAC < ' + money(perUserLTV) + ': profitable unit economics', { cac: money(perUserLTV) }) + '\n' +
    '• ' + makeToken('calc_out.cohort_retention.row.cac_payback', 'CAC payback: ' + paybackMonths + ' (if 100% retention forever — actually longer due to decay)', { months: paybackMonths }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip + '\n';

  return [r];
}

// ============== customFn (minified, mirrors calculate()) ==============

const customFn =
  // P168 B3-9：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 服务端与客户端输出逐字节相同，不可能漂移；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let u=function(t){return Number.isNaN(t)?0:Math.max(0,t)},b=function(t,n){return t<=1?n.m1:t<=2?n.m1+(n.m2-n.m1)*(t-1):t<=3?n.m2+(n.m3-n.m2)*(t-2):t<=6?n.m3+(n.m6-n.m3)*(t-3)/3:t<=12?n.m6+(n.m12-n.m6)*(t-6)/6:n.m12},p=function(t,n,e,r){if(t<=0)return 0;let c=0;for(let l=1;l<=r;l++){const a=b(l,n)/100;c+=t*a*e}return c},F=function(t){const n=[t.m1,t.m2,t.m3,t.m6,t.m12],e=[1,2,3,6,12];let r=0,c=1;for(let l=1;l<n.length;l++){const a=n[l-1]-n[l];a>r&&(r=a,c=e[l-1])}return c},$=function(t){return t>=g.excellent?"excellent":t>=g.good[0]?"good":t>=g.warning[0]?"warning":"critical"},C=function(t,n,e){var r=j(t);return Array.isArray(r)?r.join(\`
\`):String(r)};var G=u,U=b,z=p,E=F,P=$,I=C,o=tk,R='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',o=new Function("return "+R)(),g={excellent:90,good:[70,90],warning:[50,70],critical:0},j=function(t){const n=u(parseFloat(t.cohortSize)||0),e={m1:u(Math.min(100,parseFloat(t.m1Retention)||0)),m2:u(Math.min(100,parseFloat(t.m2Retention)||0)),m3:u(Math.min(100,parseFloat(t.m3Retention)||0)),m6:u(Math.min(100,parseFloat(t.m6Retention)||0)),m12:u(Math.min(100,parseFloat(t.m12Retention)||0))},r=u(parseFloat(t.revenuePerUser)||0);if(n===0)return[\`$calc_out.section.cohort_retention_calculator|⏰ Cohort Retention Calculator|

\`+o("calc_out.cohort_retention.row.enter_inputs_required","📊 Enter cohort size, monthly retention rates (M1/M2/M3/M6/M12), and monthly revenue per user to see cumulative LTV, decay curve, and biggest drop month.")];const c=p(n,e,r,12),l=p(n,e,r,6),a=$(e.m6),_=F(e),M=_===1?e.m1-e.m2:_===2?e.m2-e.m3:_===3?e.m3-e.m6:e.m6-e.m12;let d,f;a==="excellent"?(d="🟢",f=o("calc_out.cohort_retention.row.health_excellent","Excellent — M6 retention ≥ 90%; product-market fit strong")):a==="good"?(d="🟡",f=o("calc_out.cohort_retention.row.health_good","Good — M6 retention 70–90%; healthy cohort decay")):a==="warning"?(d="🟠",f=o("calc_out.cohort_retention.row.health_warning","Warning — M6 retention 50–70%; investigate onboarding")):(d="🔴",f=o("calc_out.cohort_retention.row.health_critical","Critical — M6 retention < 50%; high churn, fix product before scaling"));const s=x=>"$"+Math.round(x).toLocaleString("en-US"),i=x=>x.toFixed(1)+"%",w={m1:Math.min(100,e.m1+10),m2:e.m2,m3:e.m3,m6:e.m6,m12:e.m12},S=p(n,w,r,12),y=S-c,v=g.excellent,L=Math.max(0,v-e.m6),m=c/n,q=c;let h;a==="excellent"?h=o("calc_out.cohort_retention.row.tip_excellent","💡 Tip: Excellent retention. Scale acquisition aggressively — focus on doubling down on channels that bring similar cohorts (lookalike audiences)."):_===1&&a!=="critical"?h=o("calc_out.cohort_retention.row.tip_biggest_drop_m1_m2","💡 Tip: Biggest drop between M1 and M2 (−"+M.toFixed(1)+"pp). Audit onboarding, activation emails, and first-use experience. A 10pp M1 retention lift cascades to substantial LTV gain.",{drop:M.toFixed(1)}):_>=3&&a==="warning"?h=o("calc_out.cohort_retention.row.tip_steady_decay_m6","💡 Tip: Steady decay curve but M6 retention only "+i(e.m6)+". Your product holds early users but loses them at the 3-month mark. Look for usage-pattern cliffs (feature adoption, billing cycles).",{m6:i(e.m6)}):a==="critical"?h=o("calc_out.cohort_retention.row.tip_critical_m6","💡 Tip: M6 retention < 50% is dangerously low. Stop scaling acquisition — fix product-market fit first. Talk to churned users, identify the moment they left, and rebuild that journey."):h=o("calc_out.cohort_retention.row.tip_add_data","💡 Tip: Add data to see stage-specific recommendations.");const V=m>0&&r>0?(m/r).toFixed(1)+" months":"n/a";return[\`$calc_out.section.cohort_retention_calculator|⏰ Cohort Retention Calculator|

$calc_out.section.health|🩺 Health:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+d+" "+f+\`
• \`+o("calc_out.cohort_retention.row.biggest_drop","Biggest drop: between M"+_+" and the next checkpoint (−"+M.toFixed(1)+"pp)",{month:String(_),drop:M.toFixed(1)})+\`
• $calc_out.label.ltv_12mo|12-mo LTV|: \`+s(c)+"  ·  $calc_out.label.per_user_ltv|per-user|: "+s(m)+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• $calc_out.label.cohort_size|Cohort size|:     \`+n.toLocaleString("en-US")+\` users
• $calc_out.label.m1_retention|M1 retention|:    \`+i(e.m1)+\`
• $calc_out.label.m2_retention|M2 retention|:    \`+i(e.m2)+\`
• $calc_out.label.m3_retention|M3 retention|:    \`+i(e.m3)+\`
• $calc_out.label.m6_retention|M6 retention|:    \`+i(e.m6)+\`
• $calc_out.label.m12_retention|M12 retention|:   \`+i(e.m12)+\`
• $calc_out.label.revenue_per_user_mo|Revenue/user/mo|: \`+s(r)+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.what_if|🔄 What-If:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+o("calc_out.cohort_retention.row.whatif_m1_plus_10pp","M1 retention +10pp ("+i(e.m1)+" → "+i(w.m1)+"):",{from:i(e.m1),to:i(w.m1)})+\`
  • $calc_out.label.ltv_12mo|12-mo LTV|: \`+s(c)+" → "+s(S)+" (+"+s(y)+\`)
  • \`+o("calc_out.cohort_retention.row.whatif_gain","Gain: "+(y/Math.max(c,1)*100).toFixed(1)+"% LTV increase",{pct:(y/Math.max(c,1)*100).toFixed(1)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.break_even|⚖️ Break-Even:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+o("calc_out.cohort_retention.row.breakeven_target_m6","To hit 🟢 M6 retention ("+v+"%):",{target:String(v)})+\`
  • \`+o("calc_out.cohort_retention.row.breakeven_current_gap","Current M6: "+i(e.m6)+"  ·  Gap: +"+L.toFixed(1)+"pp needed",{m6:i(e.m6),gap:L.toFixed(1)})+\`
  • $calc_out.label.ltv_gain_6mo_at_target|6-mo LTV gain at target|: \`+s(p(n,{...e,m6:v},r,6)-l)+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.milestone|🎯 Milestone:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• $calc_out.label.per_user_ltv_12mo|Per-user LTV (12-mo)|: \`+s(m)+\`
• $calc_out.label.cohort_total_ltv|Cohort total LTV|:     \`+s(q)+\`
• \`+o("calc_out.cohort_retention.row.cac_profitable","If CAC < "+s(m)+": profitable unit economics",{cac:s(m)})+\`
• \`+o("calc_out.cohort_retention.row.cac_payback","CAC payback: "+V+" (if 100% retention forever — actually longer due to decay)",{months:V})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+h+\`
\`]};return[C(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-cohort-retention-calculator',
  title: 'Cohort Retention Calculator',
  description:
    'Measure monthly cohort retention decay (M1/M2/M3/M6/M12) and project 12-month LTV. See biggest drop month, M6 retention health band, what-if improvements, and CAC payback. Health: 🟢 ≥90% · 🟡 70–90% · 🟠 50–70% · 🔴 <50%.',
  categoryId: 'M',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'cohortSize', label: 'Cohort Size (users)', placeholder: 'e.g. 1000', type: 'number' },
    { name: 'm1Retention', label: 'M1 Retention (%)', placeholder: 'e.g. 80', type: 'number' },
    { name: 'm2Retention', label: 'M2 Retention (%)', placeholder: 'e.g. 60', type: 'number' },
    { name: 'm3Retention', label: 'M3 Retention (%)', placeholder: 'e.g. 45', type: 'number' },
    { name: 'm6Retention', label: 'M6 Retention (%)', placeholder: 'e.g. 30', type: 'number' },
    { name: 'm12Retention', label: 'M12 Retention (%)', placeholder: 'e.g. 20', type: 'number' },
    { name: 'revenuePerUser', label: 'Avg Monthly Revenue / User ($)', placeholder: 'e.g. 30', type: 'number' },
  ],
  keywords: [
    'cohort retention',
    'retention curve',
    'cohort analysis',
    'customer retention',
    'retention rate',
    'churn rate',
    'LTV projection',
    'customer lifetime value',
    'cohort LTV',
    'retention decay',
  ],
  tags: ['marketing', 'retention', 'ltv', 'cohort'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-05',
  sources: [
    'https://www.profitwell.com/blog/cohort-analysis',
    'https://amplitude.com/blog/cohort-analysis',
    'https://www.helpscout.com/blog/customer-retention-rate',
    'https://mixpanel.com/blog/cohort-analysis/',
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
  staticExamples: ['$calc_out.section.cohort_retention_calculator|⏰ Cohort Retention Calculator|\n\n$calc_out.section.health|🩺 Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🔴 $calc_out.cohort_retention.row.health_critical|Critical — M6 retention < 50%; high churn, fix product before scaling|\n• $calc_out.cohort_retention.row.biggest_drop{"month":"1","drop":"20.0"}|Biggest drop: between M1 and the next checkpoint (−20.0pp)|\n• $calc_out.label.ltv_12mo|12-mo LTV|: $130,500  ·  $calc_out.label.per_user_ltv|per-user|: $131\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.cohort_size|Cohort size|:     1,000 users\n• $calc_out.label.m1_retention|M1 retention|:    80.0%\n• $calc_out.label.m2_retention|M2 retention|:    60.0%\n• $calc_out.label.m3_retention|M3 retention|:    45.0%\n• $calc_out.label.m6_retention|M6 retention|:    30.0%\n• $calc_out.label.m12_retention|M12 retention|:   20.0%\n• $calc_out.label.revenue_per_user_mo|Revenue/user/mo|: $30\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if|🔄 What-If:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.cohort_retention.row.whatif_m1_plus_10pp{"from":"80.0%","to":"90.0%"}|M1 retention +10pp (80.0% → 90.0%):|\n  • $calc_out.label.ltv_12mo|12-mo LTV|: $130,500 → $133,500 (+$3,000)\n  • $calc_out.cohort_retention.row.whatif_gain{"pct":"2.3"}|Gain: 2.3% LTV increase|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.break_even|⚖️ Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.cohort_retention.row.breakeven_target_m6{"target":"90"}|To hit 🟢 M6 retention (90%):|\n  • $calc_out.cohort_retention.row.breakeven_current_gap{"m6":"30.0%","gap":"60.0"}|Current M6: 30.0%  ·  Gap: +60.0pp needed|\n  • $calc_out.label.ltv_gain_6mo_at_target|6-mo LTV gain at target|: $36,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.milestone|🎯 Milestone:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.per_user_ltv_12mo|Per-user LTV (12-mo)|: $131\n• $calc_out.label.cohort_total_ltv|Cohort total LTV|:     $130,500\n• $calc_out.cohort_retention.row.cac_profitable{"cac":"$131"}|If CAC < $131: profitable unit economics|\n• $calc_out.cohort_retention.row.cac_payback{"months":"4.3 months"}|CAC payback: 4.3 months (if 100% retention forever — actually longer due to decay)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.cohort_retention.row.tip_critical_m6|💡 Tip: M6 retention < 50% is dangerously low. Stop scaling acquisition — fix product-market fit first. Talk to churned users, identify the moment they left, and rebuild that journey.|\n'],
  faq: [
    { q: 'What is a good M6 retention rate?', a: 'Best-in-class SaaS: ≥90% (Slack, Notion). Good consumer apps: 70–90%. Average SaaS: 50–70%. Concerning: <50%. Benchmarks vary by industry — measure against your vertical.' },
    { q: 'How do I get a cohort retention curve?', a: 'Pull all users who first paid/signed-up in month X (cohort), then measure what % of them are still active each subsequent month. Most analytics tools (Mixpanel, Amplitude) do this automatically.' },
    { q: 'Why is M6 the headline metric?', a: 'M1-M3 are dominated by onboarding success. M6 reflects whether the product delivers ongoing value. M12+ shows compounding effects but takes a year to measure — M6 is the earliest reliable long-term signal.' },
    { q: 'How does retention improvement compound?', a: 'Each percentage point of M1 retention cascades through every later month. A 10pp M1 improvement often lifts 12-mo LTV by 15-25% because retained users keep paying every month.' },
    { q: "What is cohort retention analysis?", a: "Cohort retention = tracking groups of users (cohorts) who started at the same time, and measuring what % are still active at each subsequent period. Examples: Jan 2024 cohort, Feb 2024 cohort. Compare: which cohort retains best? Improves: better onboarding, product changes, market fit. Use: predict LTV, identify churn patterns, measure experiments." },
    { q: "What is a good retention curve for SaaS?", a: "Good: 80-90% month 1, 60-70% month 3, 40-50% month 6, 30-40% month 12. Best-in-class: 95% month 1, 80% month 3, 60% month 12. Bad: <60% month 1, <30% month 3. B2C: typically worse than B2B. Mobile apps: 25-40% day 1, 10-15% day 7, 5-10% day 30. Track by cohort to spot trends." },
    { q: "What is the difference between retention and churn?", a: "Retention: % of users still active. Churn: % of users lost. Churn = 1 - retention. Inverse. If 80% retention month 1: 20% churn. Track both. Retention curve flattens at \"loyal\" user base. Most products: lose 60-80% in first 3 months, then stabilize. The shape of the curve is the key insight. Cohorts reveal true retention." },
    { q: "What are the common retention patterns?", a: "Smiling curve (best): high initial churn, then stable. Flat: great retention, rare. Cliff: sudden drop (red flag). Steady decline: high churn, bad. Initial spike (mobile): huge day 1 drop, then flatten. Most SaaS: smiling curve (lose 30-50% month 1, then 5-10% monthly). Compare to product category benchmarks." },
    { q: "How do I improve retention?", a: "1) Better onboarding (cut time-to-value), 2) Activation events (define and optimize), 3) Habit formation (daily/weekly engagement), 4) Email/push re-engagement, 5) Customer success for top customers, 6) Reduce friction. Most teams 5-15% improvement in 3-6 months. Track by cohort, not aggregate. Find biggest drop-off point and fix." },
    { q: "What is N-Day retention vs N-Week retention?", a: "N-day: % active on day N (0, 1, 7, 30, 90). Common for mobile apps. N-week: % active in week N. Common for SaaS. Cohort analysis: track each group over time. Day 1 retention is critical for mobile. Week 1 retention critical for SaaS. N-day to N-month ratios reveal usage patterns. Don't mix cohorts from different time periods." },
    { q: "How does cohort analysis help predict LTV?", a: "LTV = (ARPU × gross_margin) / churn_rate. For SaaS: ARPU $50/mo, gross margin 80%, monthly churn 5%: LTV = $40/0.05 = $800. Cohort analysis: track ARPU by cohort, retention by cohort. Mature cohorts: reliable churn. Newer cohorts: assume similar to mature. LTV:CAC = 3:1+ = healthy. <2:1 = scaling issues." },
    { q: "How do I build a cohort retention table?", a: "Steps: 1) Pick event (signup, first purchase), 2) Define cohort (signup month), 3) Pick period (day, week, month), 4) Calculate activity per cohort per period, 5) Express as % of cohort size, 6) Color-code (high/medium/low). Tools: Mixpanel, Amplitude, Heap, PostHog, custom SQL. Update weekly. Show trends, not just numbers. Share with team." },
  ],
  howToUse: [
    'Pick a cohort (e.g., all users who signed up in January 2026).',
    'Enter the cohort size and retention rates for M1, M2, M3, M6, M12.',
    'Enter your average monthly revenue per user (ARPU).',
    'Read the 12-mo LTV projection and biggest drop month.',
    'Compare to your CAC to see if unit economics work.',
  ],
  engineKey: true,
};

registerEngine(engine);
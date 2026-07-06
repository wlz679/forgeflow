import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

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
  const cohortSize = Math.max(0, parseFloat(inputs.cohortSize) || 0);
  const table: RetentionTable = {
    m1: Math.max(0, Math.min(100, parseFloat(inputs.m1Retention) || 0)),
    m2: Math.max(0, Math.min(100, parseFloat(inputs.m2Retention) || 0)),
    m3: Math.max(0, Math.min(100, parseFloat(inputs.m3Retention) || 0)),
    m6: Math.max(0, Math.min(100, parseFloat(inputs.m6Retention) || 0)),
    m12: Math.max(0, Math.min(100, parseFloat(inputs.m12Retention) || 0)),
  };
  const revenuePerUser = Math.max(0, parseFloat(inputs.revenuePerUser) || 0);

  if (cohortSize === 0) {
    return [
      '⏰ Cohort Retention Calculator\n\n' +
        '📊 Enter cohort size, monthly retention rates (M1/M2/M3/M6/M12), and monthly revenue per user to see cumulative LTV, decay curve, and biggest drop month.',
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
  if (m6Band === 'excellent') {
    healthEmoji = '🟢';
    healthLabel = 'Excellent — M6 retention ≥ 90%; product-market fit strong';
  } else if (m6Band === 'good') {
    healthEmoji = '🟡';
    healthLabel = 'Good — M6 retention 70–90%; healthy cohort decay';
  } else if (m6Band === 'warning') {
    healthEmoji = '🟠';
    healthLabel = 'Warning — M6 retention 50–70%; investigate onboarding';
  } else {
    healthEmoji = '🔴';
    healthLabel = 'Critical — M6 retention < 50%; high churn, fix product before scaling';
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
  let tip: string;
  if (m6Band === 'excellent') {
    tip = 'Excellent retention. Scale acquisition aggressively — focus on doubling down on channels that bring similar cohorts (lookalike audiences).';
  } else if (dropM === 1 && m6Band !== 'critical') {
    tip = 'Biggest drop between M1 and M2 (−' + dropPct.toFixed(1) + 'pp). Audit onboarding, activation emails, and first-use experience. A 10pp M1 retention lift cascades to substantial LTV gain.';
  } else if (dropM >= 3 && m6Band === 'warning') {
    tip = 'Steady decay curve but M6 retention only ' + fmt(table.m6) + '. Your product holds early users but loses them at the 3-month mark. Look for usage-pattern cliffs (feature adoption, billing cycles).';
  } else if (m6Band === 'critical') {
    tip = 'M6 retention < 50% is dangerously low. Stop scaling acquisition — fix product-market fit first. Talk to churned users, identify the moment they left, and rebuild that journey.';
  } else {
    tip = 'Add data to see stage-specific recommendations.';
  }

  const r =
    '⏰ Cohort Retention Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• Biggest drop: between M' + dropM + ' and the next checkpoint (−' + dropPct.toFixed(1) + 'pp)\n' +
    '• 12-mo LTV: ' + money(ltv12) + '  ·  per-user: ' + money(perUserLTV) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Cohort size:     ' + cohortSize.toLocaleString('en-US') + ' users\n' +
    '• M1 retention:    ' + fmt(table.m1) + '\n' +
    '• M2 retention:    ' + fmt(table.m2) + '\n' +
    '• M3 retention:    ' + fmt(table.m3) + '\n' +
    '• M6 retention:    ' + fmt(table.m6) + '\n' +
    '• M12 retention:   ' + fmt(table.m12) + '\n' +
    '• Revenue/user/mo: ' + money(revenuePerUser) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• M1 retention +10pp (' + fmt(table.m1) + ' → ' + fmt(improvedTable.m1) + '):\n' +
    '  • 12-mo LTV: ' + money(ltv12) + ' → ' + money(improvedLTV) + ' (+' + money(ltvGain) + ')\n' +
    '  • Gain: ' + ((ltvGain / Math.max(ltv12, 1)) * 100).toFixed(1) + '% LTV increase\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• To hit 🟢 M6 retention (' + targetM6 + '%):\n' +
    '  • Current M6: ' + fmt(table.m6) + '  ·  Gap: +' + m6Gap.toFixed(1) + 'pp needed\n' +
    '  • 6-mo LTV gain at target: ' + money(cumulativeLTV(cohortSize, { ...table, m6: targetM6 }, revenuePerUser, 6) - ltv6) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Per-user LTV (12-mo): ' + money(perUserLTV) + '\n' +
    '• Cohort total LTV:     ' + money(annualRevenue) + '\n' +
    '• If CAC < ' + money(perUserLTV) + ': profitable unit economics\n' +
    '• CAC payback: ' + (perUserLTV > 0 && revenuePerUser > 0 ? (perUserLTV / revenuePerUser).toFixed(1) + ' months' : 'n/a') + ' (if 100% retention forever — actually longer due to decay)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (minified, mirrors calculate()) ==============

const customFn =
  "function interp(r1,r2,m1,m2,m){if(m2===m1)return r1;return r1+(r2-r1)*(m-m1)/(m2-m1);}" +
  "function retAt(m,t){if(m<=1)return t.m1;if(m<=2)return t.m1+(t.m2-t.m1)*(m-1);if(m<=3)return t.m2+(t.m3-t.m2)*(m-2);if(m<=6)return t.m3+(t.m6-t.m3)*(m-3)/3;if(m<=12)return t.m6+(t.m12-t.m6)*(m-6)/6;return t.m12;}" +
  "function cumLTV(cs,t,rpm,months){if(cs<=0)return 0;var total=0;for(var m=1;m<=months;m++){var ret=retAt(m,t)/100;total+=cs*ret*rpm;}return total;}" +
  "function bigDrop(t){var rates=[t.m1,t.m2,t.m3,t.m6,t.m12];var months=[1,2,3,6,12];var mx=0;var dm=1;for(var i=1;i<rates.length;i++){var drop=rates[i-1]-rates[i];if(drop>mx){mx=drop;dm=months[i-1];}}return dm;}" +
  "function retH(m6){if(m6>=90)return'excellent';if(m6>=70)return'good';if(m6>=50)return'warning';return'critical';}" +
  "var cs=Math.max(0,parseFloat(inputs.cohortSize)||0);" +
  "var t={m1:Math.max(0,Math.min(100,parseFloat(inputs.m1Retention)||0)),m2:Math.max(0,Math.min(100,parseFloat(inputs.m2Retention)||0)),m3:Math.max(0,Math.min(100,parseFloat(inputs.m3Retention)||0)),m6:Math.max(0,Math.min(100,parseFloat(inputs.m6Retention)||0)),m12:Math.max(0,Math.min(100,parseFloat(inputs.m12Retention)||0))};" +
  "var rpm=Math.max(0,parseFloat(inputs.revenuePerUser)||0);" +
  "if(cs===0){return['\\u23F0 Cohort Retention Calculator\\n\\n\\uD83D\\uDCCA Enter cohort size, monthly retention rates (M1/M2/M3/M6/M12), and monthly revenue per user to see cumulative LTV, decay curve, and biggest drop month.'];}" +
  "var ltv12=cumLTV(cs,t,rpm,12);var ltv6=cumLTV(cs,t,rpm,6);" +
  "var bnd=retH(t.m6);var dm=bigDrop(t);" +
  "var dPct=dm===1?t.m1-t.m2:dm===2?t.m2-t.m3:dm===3?t.m3-t.m6:t.m6-t.m12;" +
  "var hE='',hL='';" +
  "if(bnd==='excellent'){hE='\\uD83D\\uDFE2';hL='Excellent \\u2014 M6 retention \\u2265 90%; product-market fit strong';}" +
  "else if(bnd==='good'){hE='\\uD83D\\uDFE1';hL='Good \\u2014 M6 retention 70\\u201390%; healthy cohort decay';}" +
  "else if(bnd==='warning'){hE='\\uD83D\\uDFE0';hL='Warning \\u2014 M6 retention 50\\u201370%; investigate onboarding';}" +
  "else{hE='\\uD83D\\uDD34';hL='Critical \\u2014 M6 retention < 50%; high churn, fix product before scaling';}" +
  "function money(n){return '$'+Math.round(n).toLocaleString('en-US');}" +
  "function fmt(n){return n.toFixed(1)+'%';}" +
  "var imp={m1:Math.min(100,t.m1+10),m2:t.m2,m3:t.m3,m6:t.m6,m12:t.m12};" +
  "var impLTV=cumLTV(cs,imp,rpm,12);var gain=impLTV-ltv12;" +
  "var target=90;var gap=Math.max(0,target-t.m6);" +
  "var perLTV=ltv12/cs;var annRev=ltv12;" +
  "var tip='';" +
  "if(bnd==='excellent'){tip='Excellent retention. Scale acquisition aggressively \\u2014 focus on doubling down on channels that bring similar cohorts (lookalike audiences).';}" +
  "else if(dm===1&&bnd!=='critical'){tip='Biggest drop between M1 and M2 (\\u2212'+dPct.toFixed(1)+'pp). Audit onboarding, activation emails, and first-use experience. A 10pp M1 retention lift cascades to substantial LTV gain.';}" +
  "else if(dm>=3&&bnd==='warning'){tip='Steady decay curve but M6 retention only '+fmt(t.m6)+'. Your product holds early users but loses them at the 3-month mark. Look for usage-pattern cliffs (feature adoption, billing cycles).';}" +
  "else if(bnd==='critical'){tip='M6 retention < 50% is dangerously low. Stop scaling acquisition \\u2014 fix product-market fit first. Talk to churned users, identify the moment they left, and rebuild that journey.';}" +
  "else{tip='Add data to see stage-specific recommendations.';}" +
  "var r2='';" +
  "r2+='\\u23F0 Cohort Retention Calculator\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+hE+' '+hL+'\\n';" +
  "r2+='\\u2022 Biggest drop: between M'+dm+' and the next checkpoint (\\u2212'+dPct.toFixed(1)+'pp)\\n';" +
  "r2+='\\u2022 12-mo LTV: '+money(ltv12)+'  \\u00B7  per-user: '+money(perLTV)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCCA Inputs Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Cohort size:     '+cs.toLocaleString('en-US')+' users\\n';" +
  "r2+='\\u2022 M1 retention:    '+fmt(t.m1)+'\\n';" +
  "r2+='\\u2022 M2 retention:    '+fmt(t.m2)+'\\n';" +
  "r2+='\\u2022 M3 retention:    '+fmt(t.m3)+'\\n';" +
  "r2+='\\u2022 M6 retention:    '+fmt(t.m6)+'\\n';" +
  "r2+='\\u2022 M12 retention:   '+fmt(t.m12)+'\\n';" +
  "r2+='\\u2022 Revenue/user/mo: '+money(rpm)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 M1 retention +10pp ('+fmt(t.m1)+' \\u2192 '+fmt(imp.m1)+'):\\n';" +
  "r2+='  \\u2022 12-mo LTV: '+money(ltv12)+' \\u2192 '+money(impLTV)+' (+'+money(gain)+')\\n';" +
  "r2+='  \\u2022 Gain: '+((gain/Math.max(ltv12,1))*100).toFixed(1)+'% LTV increase\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Break-Even:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 To hit \\uD83D\\uDFE2 M6 retention ('+target+'%):\\n';" +
  "r2+='  \\u2022 Current M6: '+fmt(t.m6)+'  \\u00B7  Gap: +'+gap.toFixed(1)+'pp needed\\n';" +
  "r2+='  \\u2022 6-mo LTV gain at target: '+money(cumLTV(cs,Object.assign({},t,{m6:target}),rpm,6)-ltv6)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Milestone:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Per-user LTV (12-mo): '+money(perLTV)+'\\n';" +
  "r2+='\\u2022 Cohort total LTV:     '+money(annRev)+'\\n';" +
  "r2+='\\u2022 If CAC < '+money(perLTV)+': profitable unit economics\\n';" +
  "r2+='\\u2022 CAC payback: '+(perLTV>0&&rpm>0?(perLTV/rpm).toFixed(1)+' months':'n/a')+' (if 100% retention forever \\u2014 actually longer due to decay)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCA1 Tip: '+tip+'\\n';" +
  "return [r2];";

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
  generate: calculate,
  staticExamples: ['⏰ Cohort Retention Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🔴 Critical — M6 retention < 50%; high churn, fix product before scaling\n• Biggest drop: between M1 and the next checkpoint (−20.0pp)\n• 12-mo LTV: $130,500  ·  per-user: $131\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Cohort size:     1,000 users\n• M1 retention:    80.0%\n• M2 retention:    60.0%\n• M3 retention:    45.0%\n• M6 retention:    30.0%\n• M12 retention:   20.0%\n• Revenue/user/mo: $30\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• M1 retention +10pp (80.0% → 90.0%):\n  • 12-mo LTV: $130,500 → $133,500 (+$3,000)\n  • Gain: 2.3% LTV increase\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• To hit 🟢 M6 retention (90%):\n  • Current M6: 30.0%  ·  Gap: +60.0pp needed\n  • 6-mo LTV gain at target: $36,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Per-user LTV (12-mo): $131\n• Cohort total LTV:     $130,500\n• If CAC < $131: profitable unit economics\n• CAC payback: 4.3 months (if 100% retention forever — actually longer due to decay)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: M6 retention < 50% is dangerously low. Stop scaling acquisition — fix product-market fit first. Talk to churned users, identify the moment they left, and rebuild that journey.\n'],
  faq: [
    { q: 'What is a good M6 retention rate?', a: 'Best-in-class SaaS: ≥90% (Slack, Notion). Good consumer apps: 70–90%. Average SaaS: 50–70%. Concerning: <50%. Benchmarks vary by industry — measure against your vertical.' },
    { q: 'How do I get a cohort retention curve?', a: 'Pull all users who first paid/signed-up in month X (cohort), then measure what % of them are still active each subsequent month. Most analytics tools (Mixpanel, Amplitude) do this automatically.' },
    { q: 'Why is M6 the headline metric?', a: 'M1-M3 are dominated by onboarding success. M6 reflects whether the product delivers ongoing value. M12+ shows compounding effects but takes a year to measure — M6 is the earliest reliable long-term signal.' },
    { q: 'How does retention improvement compound?', a: 'Each percentage point of M1 retention cascades through every later month. A 10pp M1 improvement often lifts 12-mo LTV by 15-25% because retained users keep paying every month.' },
  ],
  howToUse: [
    'Pick a cohort (e.g., all users who signed up in January 2026).',
    'Enter the cohort size and retention rates for M1, M2, M3, M6, M12.',
    'Enter your average monthly revenue per user (ARPU).',
    'Read the 12-mo LTV projection and biggest drop month.',
    'Compare to your CAC to see if unit economics work.',
  ],
};

registerEngine(engine);
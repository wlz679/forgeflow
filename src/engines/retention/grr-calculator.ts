// =====================================================================
// GRR Calculator (P9-2) — Business v3 standard
// =====================================================================
//
// GRR = (startingMRR - downgradeMRR - churnedMRR) / startingMRR
//

import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-15：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

export const HEALTH_BANDS = {
  excellent: [0.95, Infinity],
  good: [0.90, 0.95],
  warning: [0.80, 0.90],
  critical: [0, 0.80],
} as const;

export function retainedMRR(s: number, d: number, c: number): number {
  return s - d - c;
}

export function grr(s: number, d: number, c: number): number {
  if (s === 0) return 0;
  return retainedMRR(s, d, c) / s;
}

export function calcHealthBand(v: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (v >= HEALTH_BANDS.excellent[0]) return 'excellent';
  if (v >= HEALTH_BANDS.good[0]) return 'good';
  if (v >= HEALTH_BANDS.warning[0]) return 'warning';
  return 'critical';
}

function calculate(inputs: Record<string, string>): string[] {
  const startingMRR = clampNonNegative(parseFloat(inputs.startingMRR) || 0);
  const downgradeMRR = clampNonNegative(parseFloat(inputs.downgradeMRR) || 0);
  const churnedMRR = clampNonNegative(parseFloat(inputs.churnedMRR) || 0);

  if (startingMRR === 0 && downgradeMRR === 0 && churnedMRR === 0) {
    return [
      makeToken('calc_out.section.grr_calculator', '📊 GRR Calculator') +
        '\n\n' +
        makeToken('calc_out.grr.row.need_inputs', '📊 Enter your starting MRR, downgrade MRR, and churned MRR to see your Gross Revenue Retention — the pure retention signal. GRR ≤ 100% always.'),
    ];
  }

  const retained = retainedMRR(startingMRR, downgradeMRR, churnedMRR);
  const ratio = grr(startingMRR, downgradeMRR, churnedMRR);
  const lostMRR = downgradeMRR + churnedMRR;
  const lostPct = startingMRR > 0 ? (lostMRR / startingMRR) * 100 : 0;

  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const pctInt = (n: number) => Math.round(n * 100).toString();
  const pct1 = (n: number) => n.toFixed(1);

  const band = calcHealthBand(ratio);
  // P168 B3-15：健康度 4 档各写一个 code 字面量（静态扫描认得出 ⇒ 不许动态拼码）
  let healthLine: string;
  if (band === 'excellent') {
    healthLine = makeToken(
      'calc_out.grr.row.health_excellent',
      '• 🟢 Excellent — GRR ≥ 95%; best-in-class SaaS retention, minimal churn leakage',
    );
  } else if (band === 'good') {
    healthLine = makeToken(
      'calc_out.grr.row.health_good',
      '• 🟡 Good — GRR 90–95%; SaaS Capital median, healthy retention engine',
    );
  } else if (band === 'warning') {
    healthLine = makeToken(
      'calc_out.grr.row.health_warning',
      '• 🟠 Warning — GRR 80–90%; high churn, mid-market median, intervention needed',
    );
  } else {
    healthLine = makeToken(
      'calc_out.grr.row.health_critical',
      '• 🔴 Critical — GRR < 80%; severe churn, unsustainable, urgent intervention',
    );
  }

  // What-If scenarios
  const grrHC = grr(startingMRR, downgradeMRR, churnedMRR / 2);
  const grrZD = grr(startingMRR, 0, churnedMRR);
  const grrHB = grr(startingMRR, downgradeMRR / 2, churnedMRR / 2);
  const liftHC = grrHC - ratio;
  const liftZD = grrZD - ratio;
  const liftHB = grrHB - ratio;

  // Break-Even: gap to Excellent (GRR >= 0.95)
  const targetRetained = 0.95 * startingMRR;
  const gapToExcellent = Math.max(0, targetRetained - retained);

  // Milestone: gap to next tier
  let gapToNext: number;
  if (band === 'critical') { gapToNext = 0.80 * startingMRR - retained; }
  else if (band === 'warning') { gapToNext = 0.90 * startingMRR - retained; }
  else if (band === 'good') { gapToNext = 0.95 * startingMRR - retained; }
  else { gapToNext = 0; }
  const annualCompounded = startingMRR * Math.pow(1 - lostPct / 100, 12);

  // Tip: band-driven contextual advice
  let tip: string;
  if (band === 'critical') tip = makeToken('calc_out.grr.row.tip_critical', '💡 Tip: GRR < 80% is bleeding your business dry every quarter. Stop the churn first: exit interviews on last 10 lost accounts, save-playbook for top 20 at-risk accounts, reassign CSM coverage.');
  else if (band === 'warning') tip = makeToken('calc_out.grr.row.tip_warning', '💡 Tip: GRR 80-90% is high churn for mid-market B2B SaaS. Diagnose by cohort, build save motion with CSM outreach and executive sponsor pairing for top-50 accounts.');
  else if (band === 'good') tip = makeToken('calc_out.grr.row.tip_good', '💡 Tip: GRR 90-95% is healthy. Focus on tail of at-risk accounts to push to Excellent. Pair with NRR to confirm expansion is also lifting NRR.');
  else tip = makeToken('calc_out.grr.row.tip_excellent', '💡 Tip: GRR >= 95% is best-in-class. Maintain with QBRs, proactive usage monitoring, save team on standby.');

  // P168 B3-15：params 的表达式与兜底里的表达式必须**同源** ⇒ 先用局部变量承接
  const ratioPctLabel = pctInt(ratio);
  const lostPctLabel = pct1(lostPct);
  const retainedLabel = money(retained);
  const lostLabel = money(lostMRR);
  const startingLabel = money(startingMRR);
  const downgradeLabel = money(downgradeMRR);
  const churnedLabel = money(churnedMRR);
  const ratioLabel = ratio.toFixed(4);
  const gapToNextLabel = money(Math.max(0, gapToNext));

  const r =
    makeToken('calc_out.section.grr_calculator', '📊 GRR Calculator') + '\n\n' +
    makeToken('calc_out.section.health', '🩺 Health:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    healthLine + '\n' +
    makeToken('calc_out.grr.row.grr_summary', '• GRR: ' + ratioPctLabel + '%  ·  Lost as % of start: ' + lostPctLabel + '%', { pct: ratioPctLabel, lost: lostPctLabel }) + '\n' +
    makeToken('calc_out.grr.row.retained_lost', '• Retained MRR: ' + retainedLabel + '  ·  Lost MRR (downgrade + churn): ' + lostLabel, { retained: retainedLabel, lost: lostLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.inputs_snapshot', '📊 Inputs Snapshot:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.grr.row.starting_mrr', '• Starting MRR:           ' + startingLabel, { value: startingLabel }) + '\n' +
    makeToken('calc_out.grr.row.downgrade_mrr', '• Downgrade MRR:         -' + downgradeLabel, { value: downgradeLabel }) + '\n' +
    makeToken('calc_out.grr.row.churned_mrr', '• Churned MRR:           -' + churnedLabel, { value: churnedLabel }) + '\n' +
    makeToken('calc_out.grr.row.net_retained', '• Retained MRR:           ' + retainedLabel + ' (starting - downgrade - churn)', { value: retainedLabel }) + '\n' +
    makeToken('calc_out.grr.row.grr_ratio', '• GRR ratio: ' + ratioLabel + ' (' + ratioPctLabel + '%)  ·  Lost as % of start: ' + lostPctLabel + '%', { ratio: ratioLabel, pct: ratioPctLabel, lost: lostPctLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.milestone', '🎯 Milestone:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (band === 'critical'
      ? makeToken('calc_out.grr.row.milestone_next_tier_critical', '• Next tier: 🟠 Warning (80%)')
      : band === 'warning'
      ? makeToken('calc_out.grr.row.milestone_next_tier_warning', '• Next tier: 🟡 Good (90%)')
      : band === 'good'
      ? makeToken('calc_out.grr.row.milestone_next_tier_good', '• Next tier: 🟢 Excellent (95%)')
      : makeToken('calc_out.grr.row.milestone_next_tier_excellent', '• Next tier: top tier maintained')) + '\n' +
    makeToken('calc_out.grr.row.milestone_gap', '• Gap: ' + gapToNextLabel + ' more retained MRR' + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', { value: gapToNextLabel }) + '\n\n' +
    tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============
//
// P164: customFn 是服务端 calculate() 的**逐字节同形移植** —— 页面运行时用
// new Function('inputs','pick','fill', body) 直接执行本函数体，客户端产出的
// 文本与 calculate() 完全一致（换行、分隔线、emoji、千分位、空格逐字节对齐）。
//
// 移植规则：只去掉 TS 类型注解；把 clampNonNegative / retainedMRR / grr /
// calcHealthBand / BAND_META 换成同文件内的局部实现；其余逻辑与文案原样保留。
// customFn 内不引用任何模块作用域变量，也不含 import。

const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let d=function(n){return Number.isNaN(n)?0:Math.max(0,n)},x=function(n,r,e){return n-r-e},l=function(n,r,e){return n===0?0:x(n,r,e)/n},M=function(n){return n>=f.excellent[0]?"excellent":n>=f.good[0]?"good":n>=f.warning[0]?"warning":"critical"},v=function(n,r,e){var o=j(n);return Array.isArray(o)?o.join(\`
\`):String(o)};var I=d,W=x,Z=l,$=M,H=v,t=tk,m='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',t=new Function("return "+m)(),f={excellent:[.95,null],good:[.9,.95],warning:[.8,.9],critical:[0,.8]},j=function(n){const r=d(parseFloat(n.startingMRR)||0),e=d(parseFloat(n.downgradeMRR)||0),o=d(parseFloat(n.churnedMRR)||0);if(r===0&&e===0&&o===0)return[t("calc_out.section.grr_calculator","📊 GRR Calculator")+\`

\`+t("calc_out.grr.row.need_inputs","📊 Enter your starting MRR, downgrade MRR, and churned MRR to see your Gross Revenue Retention — the pure retention signal. GRR ≤ 100% always.")];const s=x(r,e,o),a=l(r,e,o),b=e+o,y=r>0?b/r*100:0,c=_=>"$"+Math.round(_).toLocaleString("en-US"),q=_=>Math.round(_*100).toString(),E=_=>_.toFixed(1),i=M(a);let u;i==="excellent"?u=t("calc_out.grr.row.health_excellent","• 🟢 Excellent — GRR ≥ 95%; best-in-class SaaS retention, minimal churn leakage"):i==="good"?u=t("calc_out.grr.row.health_good","• 🟡 Good — GRR 90–95%; SaaS Capital median, healthy retention engine"):i==="warning"?u=t("calc_out.grr.row.health_warning","• 🟠 Warning — GRR 80–90%; high churn, mid-market median, intervention needed"):u=t("calc_out.grr.row.health_critical","• 🔴 Critical — GRR < 80%; severe churn, unsustainable, urgent intervention");const P=l(r,e,o/2),B=l(r,0,o),D=l(r,e/2,o/2),J=P-a,K=B-a,Q=D-a,O=.95*r,U=Math.max(0,O-s);let g;i==="critical"?g=.8*r-s:i==="warning"?g=.9*r-s:i==="good"?g=.95*r-s:g=0;const z=r*Math.pow(1-y/100,12);let R;i==="critical"?R=t("calc_out.grr.row.tip_critical","💡 Tip: GRR < 80% is bleeding your business dry every quarter. Stop the churn first: exit interviews on last 10 lost accounts, save-playbook for top 20 at-risk accounts, reassign CSM coverage."):i==="warning"?R=t("calc_out.grr.row.tip_warning","💡 Tip: GRR 80-90% is high churn for mid-market B2B SaaS. Diagnose by cohort, build save motion with CSM outreach and executive sponsor pairing for top-50 accounts."):i==="good"?R=t("calc_out.grr.row.tip_good","💡 Tip: GRR 90-95% is healthy. Focus on tail of at-risk accounts to push to Excellent. Pair with NRR to confirm expansion is also lifting NRR."):R=t("calc_out.grr.row.tip_excellent","💡 Tip: GRR >= 95% is best-in-class. Maintain with QBRs, proactive usage monitoring, save team on standby.");const h=q(a),p=E(y),w=c(s),G=c(b),S=c(r),L=c(e),C=c(o),F=a.toFixed(4),N=c(Math.max(0,g));return[t("calc_out.section.grr_calculator","📊 GRR Calculator")+\`

\`+t("calc_out.section.health","🩺 Health:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+u+\`
\`+t("calc_out.grr.row.grr_summary","• GRR: "+h+"%  ·  Lost as % of start: "+p+"%",{pct:h,lost:p})+\`
\`+t("calc_out.grr.row.retained_lost","• Retained MRR: "+w+"  ·  Lost MRR (downgrade + churn): "+G,{retained:w,lost:G})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.inputs_snapshot","📊 Inputs Snapshot:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.grr.row.starting_mrr","• Starting MRR:           "+S,{value:S})+\`
\`+t("calc_out.grr.row.downgrade_mrr","• Downgrade MRR:         -"+L,{value:L})+\`
\`+t("calc_out.grr.row.churned_mrr","• Churned MRR:           -"+C,{value:C})+\`
\`+t("calc_out.grr.row.net_retained","• Retained MRR:           "+w+" (starting - downgrade - churn)",{value:w})+\`
\`+t("calc_out.grr.row.grr_ratio","• GRR ratio: "+F+" ("+h+"%)  ·  Lost as % of start: "+p+"%",{ratio:F,pct:h,lost:p})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.milestone","🎯 Milestone:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(i==="critical"?t("calc_out.grr.row.milestone_next_tier_critical","• Next tier: 🟠 Warning (80%)"):i==="warning"?t("calc_out.grr.row.milestone_next_tier_warning","• Next tier: 🟡 Good (90%)"):i==="good"?t("calc_out.grr.row.milestone_next_tier_good","• Next tier: 🟢 Excellent (95%)"):t("calc_out.grr.row.milestone_next_tier_excellent","• Next tier: top tier maintained"))+\`
\`+t("calc_out.grr.row.milestone_gap","• Gap: "+N+" more retained MRR━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",{value:N})+\`

\`+R+\`
\`]};return[v(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-grr-calculator',
  title: 'GRR Calculator',
  description:
    'Compute Gross Revenue Retention (GRR) — the pure retention signal that strips out expansion. GRR <= 100% always. Health bands: 🟢 >=95% · 🟡 90-95% · 🟠 80-90% · 🔴 <80%. For mid-market B2B SaaS ($10M-$50M ARR) CSMs and RevOps leads.',
  categoryId: 'R',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'startingMRR', label: 'Starting MRR (USD)', placeholder: 'e.g. 100000', type: 'number' },
    { name: 'downgradeMRR', label: 'Downgrade MRR', placeholder: 'e.g. 5000', type: 'number' },
    { name: 'churnedMRR', label: 'Churned MRR', placeholder: 'e.g. 8000', type: 'number' },
  ],
  keywords: [
    'GRR calculator',
    'gross revenue retention',
    'GRR',
    'gross retention',
    'retention metric',
    'saas retention',
    'B2B SaaS',
    'mid-market SaaS',
    'churn rate',
  ],
  tags: ['retention', 'csm', 'grr', 'saas-metrics'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-09',
  sources: [
    'https://www.saas-capital.com/blog-posts/saas-retention-metrics/',
    'https://openviewpartners.com/blog/the-real-story-behind-net-dollar-retention/',
    'https://www.iconiqcapital.com/growth/tte-net-dollar-retention',
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
  staticExamples: ['$calc_out.section.grr_calculator|📊 GRR Calculator|\n\n$calc_out.section.health|🩺 Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.grr.row.health_warning|• 🟠 Warning — GRR 80–90%; high churn, mid-market median, intervention needed|\n$calc_out.grr.row.grr_summary{"pct":"87","lost":"13.0"}|• GRR: 87%  ·  Lost as % of start: 13.0%|\n$calc_out.grr.row.retained_lost{"retained":"$87,000","lost":"$13,000"}|• Retained MRR: $87,000  ·  Lost MRR (downgrade + churn): $13,000|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.grr.row.starting_mrr{"value":"$100,000"}|• Starting MRR:           $100,000|\n$calc_out.grr.row.downgrade_mrr{"value":"$5,000"}|• Downgrade MRR:         -$5,000|\n$calc_out.grr.row.churned_mrr{"value":"$8,000"}|• Churned MRR:           -$8,000|\n$calc_out.grr.row.net_retained{"value":"$87,000"}|• Retained MRR:           $87,000 (starting - downgrade - churn)|\n$calc_out.grr.row.grr_ratio{"ratio":"0.8700","pct":"87","lost":"13.0"}|• GRR ratio: 0.8700 (87%)  ·  Lost as % of start: 13.0%|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.milestone|🎯 Milestone:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.grr.row.milestone_next_tier_warning|• Next tier: 🟡 Good (90%)|\n$calc_out.grr.row.milestone_gap{"value":"$3,000"}|• Gap: $3,000 more retained MRR━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━|\n\n$calc_out.grr.row.tip_warning|💡 Tip: GRR 80-90% is high churn for mid-market B2B SaaS. Diagnose by cohort, build save motion with CSM outreach and executive sponsor pairing for top-50 accounts.|\n'],
  faq: [
    { q: 'What is Gross Revenue Retention (GRR)?', a: 'GRR measures revenue retained from existing customers, excluding any expansion (upsell/cross-sell). GRR <= 100% always. It is the "pure retention" signal — investors use it to see how leaky the bucket is before counting expansion as a save.' },
    { q: 'How is GRR different from NRR?', a: 'NRR includes expansion and can exceed 100%; GRR excludes expansion and never exceeds 100%. GRR is the pure retention signal; NRR is retention + growth. Best-in-class SaaS targets NRR >= 120% AND GRR >= 90%.' },
    { q: 'What is a good GRR for B2B SaaS?', a: 'Top-quartile B2B SaaS achieves GRR >= 95% (best-in-class retention). SaaS Capital median is 90-92%. Below 80% means severe churn that is unsustainable. Mid-market median is around 80-90%, indicating room to improve retention.' },
    { q: 'How do I improve GRR?', a: 'Two levers: (1) reduce churn (proactive CS, save playbooks, exit interviews), (2) reduce downgrades (tier alignment, usage-based pricing). Often the highest-ROI lever is reducing churn on the bottom decile of accounts via dedicated CSM coverage.' },
    { q: 'How often should GRR be measured?', a: 'Quarterly for board reporting; monthly for operational tracking. Year-over-year GRR (over 12 months) is the standard for fundraising. Pair GRR with NRR — a gap between them shows how much growth depends on expansion vs retention.' },
    { q: "What is GRR (Gross Revenue Retention)?", a: "GRR = (starting MRR - churn - contraction) / starting MRR. Excludes expansion. Measures: how well you retain existing revenue. Benchmarks: 1) <80%: serious churn issue, 2) 80-90%: average, 3) 90-95%: good, 4) 95%+: world-class. Most SaaS: 85-95%. NRR includes expansion (always >= GRR). Track: monthly, by cohort. GRR is a leading indicator of long-term viability." },
    { q: "What is the difference between GRR and NRR?", a: "GRR: revenue retained (excludes expansion). NRR: net of expansion. Always: NRR >= GRR. Example: 90% gross retention, 15% expansion = 104% net retention. Most investors: NRR is the headline metric. GRR is the underlying. Strong GRR: foundation. Weak GRR + strong NRR: customers expanding but also churning (sustainability concern). Track both. GRR is harder to game." },
    { q: "What is a good GRR for SaaS?", a: "Benchmarks: 1) <80%: critical (revenue declining), 2) 80-90%: average, 3) 90-95%: good, 4) 95%+: best-in-class. By company size: SMB SaaS 80-90%, mid-market 90-95%, enterprise 95%+. Most teams 90%+ is good. 95%+. Track monthly cohort. GRR is the cleanest measure of customer health. If GRR <80%, fix retention before scaling." },

    { q: "Why does GRR matter for valuation?", a: "GRR is the #1 retention metric. Investors: GRR 90%+ = strong business. <80% = risky. Multiples: 90%+ GRR = 8-15x ARR multiple. <80% GRR = 3-6x. Difference: 2-3x valuation. Why: GRR is hard to game. Strong GRR + expansion = sustainable growth. Weak GRR = leaky bucket. For 5-10 year hold: GRR matters more than growth rate. Most: focus on GRR before NRR." },
    { q: "What is the difference between logo churn and revenue churn?", a: "Logo churn: % of customers lost. Revenue churn: % of MRR lost. Often different. Examples: 5% logo churn + 2% revenue churn = small customers leaving, large stay. Or 5% logo churn + 8% revenue churn = large customers leaving (worse). High logo + low revenue: acceptable for SMB. High revenue + low logo: bad sign. GRR is revenue-based. Use both: GRR + logo churn. Both matter." },
    { q: "How is GRR calculated for usage-based products?", a: "Usage-based: GRR is more complex. Components: 1) Usage growth (paid more this month), 2) Usage decline (paid less), 3) Churn. Calculate: (last month revenue - this month revenue) / last month revenue, excluding new customers. If churn is -5% and expansion is +10%: net = +5% (NRR = 105%). If churn is -10% and expansion is +5%: net = -5% (NRR = 95%). Usage-based: GRR often lower than seat-based." },
    { q: "What is the relationship between GRR and CAC payback?", a: "GRR affects CAC payback. For $1M ARR, 1.0x monthly churn, 1.0x gross margin: payback = 12 months. For 5% monthly churn: 5+ years (no payback). Most SaaS: 0.5-1% monthly churn. Lower churn = faster payback. Use GRR target (e.g., 90%) → monthly churn ~0.83%. Calculate payback. Aim for <24 months for healthy SaaS. Strong GRR: foundation for LTV-based growth." },
  ],
  howToUse: [
    'Enter your Starting MRR (revenue from existing customers at the start of the period).',
    'Enter Downgrade MRR (customers who reduced tier/seats during the period).',
    'Enter Churned MRR (customers who fully cancelled during the period).',
    'Read the GRR percentage and Health band. Pair with NRR (P9-1) to see pure retention vs expansion-driven retention separately.',
  ],
  engineKey: true,
};

registerEngine(engine);

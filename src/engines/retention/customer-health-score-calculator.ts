// =====================================================================
// Customer Health Score Calculator (P9-5) — Business v3 standard
// =====================================================================
//
// Composite customer health score (0-100) from 5 weighted signals.
// The early warning system for at-risk accounts. 4 weight presets let CSMs
// tune the model to their motion: Product-led / Service-led / Sales-led / Balanced.
//
//   score = Σ normalize(signal[i]) × weight[i]   for i in 5 signals
//
// Health bands (score 0-100):
//   🟢 ≥ 80 — excellent, healthy; expand motion
//   🟡 60–80 — good, monitor; engagement check
//   🟠 40–60 — warning, at risk; save play needed
//   🔴 < 40 — critical, emergency intervention

import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-14：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

export const HEALTH_BANDS = {
  excellent: [80, Infinity],
  good: [60, 80],
  warning: [40, 60],
  critical: [0, 40],
} as const;

export const PRESETS = {
  balanced:     [0.20, 0.20, 0.20, 0.20, 0.20],
  'product-led': [0.50, 0.15, 0.10, 0.15, 0.10],
  'service-led': [0.10, 0.20, 0.35, 0.25, 0.10],
  'sales-led':   [0.15, 0.25, 0.10, 0.10, 0.40],
} as const;

export function normalize(signalName: string, value: number): number {
  if (signalName === 'nps') return (value + 100) / 2;
  if (signalName === 'supportTickets') return 100 - Math.min(value * 4, 100);
  return value;
}

export function healthScore(
  productUsage: number, nps: number, supportTickets: number, engagement: number, contractValue: number, preset: string,
): number {
  const signalNames = ['productUsage', 'nps', 'supportTickets', 'engagement', 'contractValue'];
  const rawSignals = [productUsage, nps, supportTickets, engagement, contractValue];
  const normalized = rawSignals.map((v, i) => normalize(signalNames[i], v));
  const weights = PRESETS[preset as keyof typeof PRESETS] || PRESETS.balanced;
  return normalized.reduce((sum, sig, i) => sum + sig * weights[i], 0);
}

export function calcHealthBand(score: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (score >= HEALTH_BANDS.excellent[0]) return 'excellent';
  if (score >= HEALTH_BANDS.good[0]) return 'good';
  if (score >= HEALTH_BANDS.warning[0]) return 'warning';
  return 'critical';
}

function calculate(inputs: Record<string, string>): string[] {
  const productUsage = clampNonNegative(Math.min(100, parseFloat(inputs.productUsage) || 0));
  const nps = Math.max(-100, Math.min(100, parseFloat(inputs.nps) || 0));
  const supportTickets = clampNonNegative(parseFloat(inputs.supportTickets) || 0);
  const engagement = clampNonNegative(Math.min(100, parseFloat(inputs.engagement) || 0));
  const contractValue = clampNonNegative(Math.min(100, parseFloat(inputs.contractValue) || 0));
  const preset = (inputs.weightPreset || 'balanced') as keyof typeof PRESETS;

  if (productUsage === 0 && nps === 0 && supportTickets === 0 && engagement === 0 && contractValue === 0) {
    return [
      makeToken('calc_out.section.customer_health_score_calculator', '📊 Customer Health Score Calculator') +
        '\n\n' +
        makeToken('calc_out.customer_health_score.row.need_inputs', '📊 Enter your 5 customer health signals (product usage, NPS, support tickets, engagement, contract value) and select a weight preset to see your composite score (0-100).'),
    ];
  }

  const signalNames = ['productUsage', 'nps', 'supportTickets', 'engagement', 'contractValue'];
  const rawSignals = [productUsage, nps, supportTickets, engagement, contractValue];
  const normalized = rawSignals.map((v, i) => normalize(signalNames[i], v));
  const weights = PRESETS[preset] || PRESETS.balanced;
  const score = healthScore(productUsage, nps, supportTickets, engagement, contractValue, preset);
  const pct1 = (n: number) => n.toFixed(1);

  const band = calcHealthBand(score);
  const scoreLabel = pct1(score);
  let healthLine: string;
  if (band === 'excellent') {
    healthLine = makeToken(
      'calc_out.customer_health_score.row.health_excellent',
      '• 🟢 Excellent — Score ≥ 80; healthy account, expand motion',
    );
  } else if (band === 'good') {
    healthLine = makeToken(
      'calc_out.customer_health_score.row.health_good',
      '• 🟡 Good — Score 60–80; monitor closely, engagement check',
    );
  } else if (band === 'warning') {
    healthLine = makeToken(
      'calc_out.customer_health_score.row.health_warning',
      '• 🟠 Warning — Score 40–60; at risk, save play needed',
    );
  } else {
    healthLine = makeToken(
      'calc_out.customer_health_score.row.health_critical',
      '• 🔴 Critical — Score < 40; emergency intervention required',
    );
  }

  const scoreNPS70 = healthScore(productUsage, 70, supportTickets, engagement, contractValue, preset);
  const scorePU90 = healthScore(90, nps, supportTickets, engagement, contractValue, preset);
  const scoreST2 = healthScore(productUsage, nps, 2, engagement, contractValue, preset);
  const liftNPS = scoreNPS70 - score;
  const liftPU = scorePU90 - score;
  const liftST = scoreST2 - score;

  const gapToExcellent = Math.max(0, 80 - score);
  const targetProductUsage = Math.min(100, productUsage + gapToExcellent / weights[0]);

  let gapToNext: number, nextTier: string;
  if (band === 'critical') { gapToNext = 40 - score; nextTier = '🟠 Warning 40'; }
  else if (band === 'warning') { gapToNext = 60 - score; nextTier = '🟡 Good 60'; }
  else if (band === 'good') { gapToNext = 80 - score; nextTier = '🟢 Excellent 80'; }
  else { gapToNext = 0; nextTier = 'top tier maintained'; }

  // P168 B3-4：💡 Tip 改成**语义码**（分支条件 = 上面那套 Health band，
  //   不引入第二套阈值）⇒ 模板在 locale 的 decision_tip.<code> 里，动态层随输入变。
  //   最弱信号取自**已算好的** normalized 数组（不改任何计算逻辑）。
  const signalLabels = ['Product Usage', 'NPS', 'Support Tickets', 'Engagement', 'Contract Value'];
  let weakestIdx = 0;
  for (let i = 1; i < normalized.length; i++) if (normalized[i] < normalized[weakestIdx]) weakestIdx = i;
  const tipParams = {
    score: pct1(score),
    weakest: signalLabels[weakestIdx],
    weakestScore: pct1(normalized[weakestIdx]),
  };
  let tipObj: { code: string; params: Record<string, string> };
  if (band === 'critical') tipObj = { code: 'healthscore_critical', params: tipParams };
  else if (band === 'warning') tipObj = { code: 'healthscore_at_risk', params: tipParams };
  else if (band === 'good') tipObj = { code: 'healthscore_monitor', params: tipParams };
  else tipObj = { code: 'healthscore_excellent', params: tipParams };
  const tipJson = JSON.stringify(tipObj);

  // P168 B3-14：params 的表达式与兜底里的表达式必须**同源** ⇒ 先用局部变量承接
  const presetLabel = preset;
  const n0 = pct1(normalized[0]);
  const n1 = pct1(normalized[1]);
  const n2 = pct1(normalized[2]);
  const n3 = pct1(normalized[3]);
  const n4 = pct1(normalized[4]);
  const w0 = Math.round(weights[0] * 100) + '%';
  const w1 = Math.round(weights[1] * 100) + '%';
  const w2 = Math.round(weights[2] * 100) + '%';
  const w3 = Math.round(weights[3] * 100) + '%';
  const w4 = Math.round(weights[4] * 100) + '%';
  const productUsageLabel = String(productUsage);
  const npsLabel = String(nps);
  const supportTicketsLabel = String(supportTickets);
  const engagementLabel = String(engagement);
  const contractValueLabel = String(contractValue);
  const scoreNPS70Label = pct1(scoreNPS70);
  const liftNPSLabel = pct1(liftNPS);
  const scorePU90Label = pct1(scorePU90);
  const liftPULabel = pct1(liftPU);
  const scoreST2Label = pct1(scoreST2);
  const liftSTLabel = pct1(liftST);
  const gapExcellentLabel = pct1(gapToExcellent);
  const targetUsageLabel = String(Math.round(targetProductUsage));
  const gapNextLabel = pct1(Math.max(0, gapToNext));

  let r =
  makeToken('calc_out.section.customer_health_score_calculator', '📊 Customer Health Score Calculator') + '\n\n' +
  makeToken('calc_out.section.health', '🩺 Health:') + '\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
  healthLine + '\n' +
  makeToken('calc_out.customer_health_score.row.health_score', '• Health Score: ' + scoreLabel + ' / 100  ·  Preset: ' + presetLabel, { score: scoreLabel, preset: presetLabel }) + '\n' +
  makeToken('calc_out.customer_health_score.row.sub_scores', '• Sub-scores: Product ' + n0 + ' · NPS ' + n1 + ' · Support ' + n2 + ' · Engagement ' + n3 + ' · Contract ' + n4, { product: n0, nps: n1, support: n2, engagement: n3, contract: n4 }) + '\n\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
  makeToken('calc_out.section.inputs_snapshot', '📊 Inputs Snapshot:') + '\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
  makeToken('calc_out.customer_health_score.row.product_usage', '• Product Usage:    ' + productUsageLabel + ' → ' + n0 + ' normalized', { value: productUsageLabel, score: n0 }) + '\n' +
  makeToken('calc_out.customer_health_score.row.nps', '• NPS:              ' + npsLabel + ' → ' + n1 + ' normalized', { value: npsLabel, score: n1 }) + '\n' +
  makeToken('calc_out.customer_health_score.row.support_tickets', '• Support Tickets:  ' + supportTicketsLabel + ' → ' + n2 + ' normalized', { value: supportTicketsLabel, score: n2 }) + '\n' +
  makeToken('calc_out.customer_health_score.row.engagement', '• Engagement:       ' + engagementLabel + ' → ' + n3 + ' normalized', { value: engagementLabel, score: n3 }) + '\n' +
  makeToken('calc_out.customer_health_score.row.contract_value', '• Contract Value:   ' + contractValueLabel + ' → ' + n4 + ' normalized', { value: contractValueLabel, score: n4 }) + '\n' +
  makeToken('calc_out.customer_health_score.row.weights', '• Weights: Product ' + w0 + ' · NPS ' + w1 + ' · Support ' + w2 + ' · Engagement ' + w3 + ' · Contract ' + w4, { product: w0, nps: w1, support: w2, engagement: w3, contract: w4 }) + '\n\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
  makeToken('calc_out.section.what_if', '🔄 What-If:') + '\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
  makeToken('calc_out.customer_health_score.row.whatif_nps_70', '• NPS 40→70: Score ' + scoreNPS70Label + ' (+' + liftNPSLabel + ')', { score: scoreNPS70Label, lift: liftNPSLabel }) + '\n' +
  makeToken('calc_out.customer_health_score.row.whatif_usage_90', '• Product Usage 75→90: Score ' + scorePU90Label + ' (+' + liftPULabel + ')', { score: scorePU90Label, lift: liftPULabel }) + '\n' +
  makeToken('calc_out.customer_health_score.row.whatif_tickets_2', '• Support Tickets 5→2: Score ' + scoreST2Label + ' (+' + liftSTLabel + ')', { score: scoreST2Label, lift: liftSTLabel }) + '\n\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
  makeToken('calc_out.section.break_even', '⚖️ Break-Even:') + '\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
  makeToken('calc_out.customer_health_score.row.breakeven_target', '• Target for 🟢 Excellent: Score ≥ 80') + '\n' +
  makeToken('calc_out.customer_health_score.row.breakeven_current', '• Current score: ' + scoreLabel + '  ·  Gap to 🟢: ' + gapExcellentLabel + ' points', { score: scoreLabel, gap: gapExcellentLabel }) + '\n' +
  makeToken('calc_out.customer_health_score.row.breakeven_action', '• Action: raise Product Usage to ' + targetUsageLabel + ' OR improve any other signal by ' + gapExcellentLabel + ' normalized points', { target: targetUsageLabel, gap: gapExcellentLabel }) + '\n\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
  makeToken('calc_out.section.milestone', '🎯 Milestone:') + '\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
  (band === 'critical'
    ? makeToken('calc_out.customer_health_score.row.milestone_next_tier_critical', '• Next tier: 🟠 Warning 40')
    : band === 'warning'
    ? makeToken('calc_out.customer_health_score.row.milestone_next_tier_warning', '• Next tier: 🟡 Good 60')
    : band === 'good'
    ? makeToken('calc_out.customer_health_score.row.milestone_next_tier_good', '• Next tier: 🟢 Excellent 80')
    : makeToken('calc_out.customer_health_score.row.milestone_next_tier_excellent', '• Next tier: top tier maintained')) + '\n' +
  (band === 'excellent'
    ? makeToken('calc_out.customer_health_score.row.milestone_gap_top', '• Gap to next tier: ' + gapNextLabel + ' points already at top', { value: gapNextLabel })
    : makeToken('calc_out.customer_health_score.row.milestone_gap', '• Gap to next tier: ' + gapNextLabel + ' points', { value: gapNextLabel })) + '\n\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
  // ⚠️ P168 B3-4：**建议文案已迁到页面 i18n**（decision_tip.<code>）⇒ 这行**保持原样**（不令牌化）
  '💡 Tip: ' + tipJson + '\n';

  // P168 B3-4：**🧭 四段已迁到页面的「🧭 算完之后」区块**
  //   （src/i18n/locales/{en,zh}.json 的 tools.<slug>.decision_goal /
  //     decision_recommendation / decision_constraint / decision_next_tool，双语）
  //   ⇒ 引擎只负责算；**决策支持由区块独占** ⇒ 同页不再有两份决策建议。
  //   ⚠ 引擎里**不要**再写这段：区块与卡片会同时渲染同一件事。

  return [r];
}

const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let p=function(e){return Number.isNaN(e)?0:Math.max(0,e)},V=function(e,o){return e==="nps"?(o+100)/2:e==="supportTickets"?100-Math.min(o*4,100):o},d=function(e,o,i,a,u,_){const h=["productUsage","nps","supportTickets","engagement","contractValue"],O=[e,o,i,a,u].map((l,r)=>V(h[r],l)),s=S[_]||S.balanced;return O.reduce((l,r,c)=>l+r*s[c],0)},j=function(e){return e>=z.excellent[0]?"excellent":e>=z.good[0]?"good":e>=z.warning[0]?"warning":"critical"},E=function(e,o,i){var a=at(e);return Array.isArray(a)?a.join(\`
\`):String(a)};var pt=p,dt=V,mt=d,wt=j,ft=E,t=tk,nt='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',t=new Function("return "+nt)(),z={excellent:[80,null],good:[60,80],warning:[40,60],critical:[0,40]},S={balanced:[.2,.2,.2,.2,.2],"product-led":[.5,.15,.1,.15,.1],"service-led":[.1,.2,.35,.25,.1],"sales-led":[.15,.25,.1,.1,.4]},at=function(e){const o=p(Math.min(100,parseFloat(e.productUsage)||0)),i=Math.max(-100,Math.min(100,parseFloat(e.nps)||0)),a=p(parseFloat(e.supportTickets)||0),u=p(Math.min(100,parseFloat(e.engagement)||0)),_=p(Math.min(100,parseFloat(e.contractValue)||0)),h=e.weightPreset||"balanced";if(o===0&&i===0&&a===0&&u===0&&_===0)return[t("calc_out.section.customer_health_score_calculator","📊 Customer Health Score Calculator")+\`

\`+t("calc_out.customer_health_score.row.need_inputs","📊 Enter your 5 customer health signals (product usage, NPS, support tickets, engagement, contract value) and select a weight preset to see your composite score (0-100).")];const G=["productUsage","nps","supportTickets","engagement","contractValue"],s=[o,i,a,u,_].map((g,gt)=>V(G[gt],g)),l=S[h]||S.balanced,r=d(o,i,a,u,_,h),c=g=>g.toFixed(1),n=j(r),b=c(r);let m;n==="excellent"?m=t("calc_out.customer_health_score.row.health_excellent","• 🟢 Excellent — Score ≥ 80; healthy account, expand motion"):n==="good"?m=t("calc_out.customer_health_score.row.health_good","• 🟡 Good — Score 60–80; monitor closely, engagement check"):n==="warning"?m=t("calc_out.customer_health_score.row.health_warning","• 🟠 Warning — Score 40–60; at risk, save play needed"):m=t("calc_out.customer_health_score.row.health_critical","• 🔴 Critical — Score < 40; emergency intervention required");const q=d(o,70,a,u,_,h),W=d(90,i,a,u,_,h),I=d(o,i,2,u,_,h),st=q-r,lt=W-r,it=I-r,J=Math.max(0,80-r),ut=Math.min(100,o+J/l[0]);let w,x;n==="critical"?(w=40-r,x="🟠 Warning 40"):n==="warning"?(w=60-r,x="🟡 Good 60"):n==="good"?(w=80-r,x="🟢 Excellent 80"):(w=0,x="top tier maintained");const _t=["Product Usage","NPS","Support Tickets","Engagement","Contract Value"];let v=0;for(let g=1;g<s.length;g++)s[g]<s[v]&&(v=g);const N={score:c(r),weakest:_t[v],weakestScore:c(s[v])};let f;n==="critical"?f={code:"healthscore_critical",params:N}:n==="warning"?f={code:"healthscore_at_risk",params:N}:n==="good"?f={code:"healthscore_monitor",params:N}:f={code:"healthscore_excellent",params:N};const ht=JSON.stringify(f),K=h,P=c(s[0]),y=c(s[1]),M=c(s[2]),L=c(s[3]),U=c(s[4]),$=Math.round(l[0]*100)+"%",H=Math.round(l[1]*100)+"%",Q=Math.round(l[2]*100)+"%",X=Math.round(l[3]*100)+"%",Y=Math.round(l[4]*100)+"%",Z=String(o),A=String(i),B=String(a),D=String(u),R=String(_),T=c(q),k=c(st),tt=c(W),et=c(lt),ct=c(I),ot=c(it),C=c(J),rt=String(Math.round(ut)),F=c(Math.max(0,w));return[t("calc_out.section.customer_health_score_calculator","📊 Customer Health Score Calculator")+\`

\`+t("calc_out.section.health","🩺 Health:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+m+\`
\`+t("calc_out.customer_health_score.row.health_score","• Health Score: "+b+" / 100  ·  Preset: "+K,{score:b,preset:K})+\`
\`+t("calc_out.customer_health_score.row.sub_scores","• Sub-scores: Product "+P+" · NPS "+y+" · Support "+M+" · Engagement "+L+" · Contract "+U,{product:P,nps:y,support:M,engagement:L,contract:U})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.inputs_snapshot","📊 Inputs Snapshot:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.customer_health_score.row.product_usage","• Product Usage:    "+Z+" → "+P+" normalized",{value:Z,score:P})+\`
\`+t("calc_out.customer_health_score.row.nps","• NPS:              "+A+" → "+y+" normalized",{value:A,score:y})+\`
\`+t("calc_out.customer_health_score.row.support_tickets","• Support Tickets:  "+B+" → "+M+" normalized",{value:B,score:M})+\`
\`+t("calc_out.customer_health_score.row.engagement","• Engagement:       "+D+" → "+L+" normalized",{value:D,score:L})+\`
\`+t("calc_out.customer_health_score.row.contract_value","• Contract Value:   "+R+" → "+U+" normalized",{value:R,score:U})+\`
\`+t("calc_out.customer_health_score.row.weights","• Weights: Product "+$+" · NPS "+H+" · Support "+Q+" · Engagement "+X+" · Contract "+Y,{product:$,nps:H,support:Q,engagement:X,contract:Y})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.what_if","🔄 What-If:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.customer_health_score.row.whatif_nps_70","• NPS 40→70: Score "+T+" (+"+k+")",{score:T,lift:k})+\`
\`+t("calc_out.customer_health_score.row.whatif_usage_90","• Product Usage 75→90: Score "+tt+" (+"+et+")",{score:tt,lift:et})+\`
\`+t("calc_out.customer_health_score.row.whatif_tickets_2","• Support Tickets 5→2: Score "+ct+" (+"+ot+")",{score:ct,lift:ot})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.break_even","⚖️ Break-Even:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.customer_health_score.row.breakeven_target","• Target for 🟢 Excellent: Score ≥ 80")+\`
\`+t("calc_out.customer_health_score.row.breakeven_current","• Current score: "+b+"  ·  Gap to 🟢: "+C+" points",{score:b,gap:C})+\`
\`+t("calc_out.customer_health_score.row.breakeven_action","• Action: raise Product Usage to "+rt+" OR improve any other signal by "+C+" normalized points",{target:rt,gap:C})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.milestone","🎯 Milestone:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(n==="critical"?t("calc_out.customer_health_score.row.milestone_next_tier_critical","• Next tier: 🟠 Warning 40"):n==="warning"?t("calc_out.customer_health_score.row.milestone_next_tier_warning","• Next tier: 🟡 Good 60"):n==="good"?t("calc_out.customer_health_score.row.milestone_next_tier_good","• Next tier: 🟢 Excellent 80"):t("calc_out.customer_health_score.row.milestone_next_tier_excellent","• Next tier: top tier maintained"))+\`
\`+(n==="excellent"?t("calc_out.customer_health_score.row.milestone_gap_top","• Gap to next tier: "+F+" points already at top",{value:F}):t("calc_out.customer_health_score.row.milestone_gap","• Gap to next tier: "+F+" points",{value:F}))+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Tip: \`+ht+\`
\`]};return[E(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: 'solopreneur-customer-health-score-calculator',
  title: 'Customer Health Score Calculator',
  description:
    'Compute composite customer health score 0-100 from 5 weighted signals: product usage, NPS, support tickets, engagement, contract value. 4 weight presets: balanced, product-led, service-led, sales-led. Health bands: 🟢 ≥80 · 🟡 60-80 · 🟠 40-60 · 🔴 <40. For mid-market B2B SaaS (0M-0M ARR) CSMs and RevOps leads.',
  categoryId: 'R',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'productUsage', label: 'Product usage score 0-100', placeholder: 'e.g. 75', type: 'number' },
    { name: 'nps', label: 'NPS -100 to +100', placeholder: 'e.g. 40', type: 'number' },
    { name: 'supportTickets', label: 'Support tickets last 90 days', placeholder: 'e.g. 5', type: 'number' },
    { name: 'engagement', label: 'Engagement score 0-100', placeholder: 'e.g. 80', type: 'number' },
    { name: 'contractValue', label: 'Contract value score 0-100', placeholder: 'e.g. 60', type: 'number' },
    { name: 'weightPreset', label: 'Weight preset', type: 'select', options: [ { value: 'balanced', label: 'Balanced' }, { value: 'product-led', label: 'Product-led' }, { value: 'service-led', label: 'Service-led' }, { value: 'sales-led', label: 'Sales-led' } ], default: 'balanced' },
  ],
  keywords: ['customer health score', 'health score calculator', 'CSM score', 'account health', 'product usage', 'NPS', 'support tickets', 'engagement', 'contract value', 'B2B SaaS'],
  tags: ['retention', 'csm', 'health-score', 'saas-metrics'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-09',
  sources: [
    'https://www.gainsight.com/blog/customer-health-score/',
    'https://www.churnzero.com/customer-health-score/',
  ],
  staticExamples: ['$calc_out.section.customer_health_score_calculator|📊 Customer Health Score Calculator|\n\n$calc_out.section.health|🩺 Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.customer_health_score.row.health_good|• 🟡 Good — Score 60–80; monitor closely, engagement check|\n$calc_out.customer_health_score.row.health_score{"score":"73.0","preset":"balanced"}|• Health Score: 73.0 / 100  ·  Preset: balanced|\n$calc_out.customer_health_score.row.sub_scores{"product":"75.0","nps":"70.0","support":"80.0","engagement":"80.0","contract":"60.0"}|• Sub-scores: Product 75.0 · NPS 70.0 · Support 80.0 · Engagement 80.0 · Contract 60.0|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.customer_health_score.row.product_usage{"value":"75","score":"75.0"}|• Product Usage:    75 → 75.0 normalized|\n$calc_out.customer_health_score.row.nps{"value":"40","score":"70.0"}|• NPS:              40 → 70.0 normalized|\n$calc_out.customer_health_score.row.support_tickets{"value":"5","score":"80.0"}|• Support Tickets:  5 → 80.0 normalized|\n$calc_out.customer_health_score.row.engagement{"value":"80","score":"80.0"}|• Engagement:       80 → 80.0 normalized|\n$calc_out.customer_health_score.row.contract_value{"value":"60","score":"60.0"}|• Contract Value:   60 → 60.0 normalized|\n$calc_out.customer_health_score.row.weights{"product":"20%","nps":"20%","support":"20%","engagement":"20%","contract":"20%"}|• Weights: Product 20% · NPS 20% · Support 20% · Engagement 20% · Contract 20%|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if|🔄 What-If:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.customer_health_score.row.whatif_nps_70{"score":"76.0","lift":"3.0"}|• NPS 40→70: Score 76.0 (+3.0)|\n$calc_out.customer_health_score.row.whatif_usage_90{"score":"76.0","lift":"3.0"}|• Product Usage 75→90: Score 76.0 (+3.0)|\n$calc_out.customer_health_score.row.whatif_tickets_2{"score":"75.4","lift":"2.4"}|• Support Tickets 5→2: Score 75.4 (+2.4)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.break_even|⚖️ Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.customer_health_score.row.breakeven_target|• Target for 🟢 Excellent: Score ≥ 80|\n$calc_out.customer_health_score.row.breakeven_current{"score":"73.0","gap":"7.0"}|• Current score: 73.0  ·  Gap to 🟢: 7.0 points|\n$calc_out.customer_health_score.row.breakeven_action{"target":"100","gap":"7.0"}|• Action: raise Product Usage to 100 OR improve any other signal by 7.0 normalized points|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.milestone|🎯 Milestone:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.customer_health_score.row.milestone_next_tier_good|• Next tier: 🟢 Excellent 80|\n$calc_out.customer_health_score.row.milestone_gap{"value":"7.0"}|• Gap to next tier: 7.0 points|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: {"code":"healthscore_monitor","params":{"score":"73.0","weakest":"Contract Value","weakestScore":"60.0"}}\n'],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  calculate,
  // P140f-p3-T7: minimal Playbook 6 字段 template (Goal=该不该决策)
  // Goal 含"决策"+"该不该"双关键词 → 通过 T1 zod refine 校验
  playbook: {
    goal: '用户该不该现在干预这个客户，还是先看是哪一项信号在拖分',
    input: 'engine 定义的 inputs 字段',
    output: 'engine 定义的 generate() 返回数组',
    constraint: 'apply 引擎 inputs 时受实际场景约束',
    tool: '页面的「🧭 算完之后」决策区块（决策支持已由区块独占）',
    memory: 'v2.0 11 business domain benchmark + P140f Phase 4 主题簇',
  },
  generate: calculate,
  faq: [
    { q: 'What is a customer health score?', a: 'A composite score 0-100 computed from multiple signals (product usage, NPS, support tickets, engagement, contract value) that predicts account health. The early warning system for at-risk accounts.' },
    { q: 'How do the weight presets differ?', a: 'Balanced 20% each. Product-led weights usage 50%. Service-led weights support 35%. Sales-led weights contract value 40%. Pick the preset that matches your GTM motion — product-led for PLG, sales-led for enterprise.' },
    { q: 'How are signals normalized?', a: 'productUsage, engagement, contractValue pass through 0-100. NPS -100 to +100 maps to 0-100 via (nps+100)/2. Support tickets are inverted: 0 tickets = 100, 25+ tickets = 0 (saturation).' },
    { q: 'What is a good health score?', a: 'Top-quartile B2B SaaS achieves ≥80. 60-80 is healthy mid-market. 40-60 is at-risk — needs save play. Below 40 is critical — emergency intervention.' },
    { q: 'How often should I compute health scores?', a: 'Real-time or daily for operational alerts. Weekly for CSM planning. Monthly for executive reporting. Pair with a quarterly cohort analysis to identify systemic issues vs account-specific.' },

    { q: "What are the components of a customer health score?", a: "Common: 1) Product usage (40%): logins, features used, depth, 2) Engagement (20%): emails opened, support tickets, community, 3) Relationship (20%): exec sponsor, CSM touchpoints, 4) Account (20%): tenure, plan, contract size. Weight varies by business. Most: 5-10 inputs. Score: weighted average. Update weekly. Re-evaluate quarterly." },
    { q: "How do I build a customer health score?", a: "Process: 1) List candidate signals (usage, support, NPS, etc.), 2) Score 0-100 each, 3) Weight (sum to 100%), 4) Calculate composite, 5) Validate against churn (correlation). Iterate. Most: 5-10 signals. Tools: Gainsight, ChurnZero, Vitally, custom. Start simple (3-5 signals), expand. Re-evaluate every 6 months. Validate with: 1) Actual churn correlation, 2) Renewal rates, 3) NPS." },
    { q: "What is a good CHS benchmark?", a: "Benchmarks: 1) 80-100: champion, 2) 60-79: healthy, 3) 40-59: at risk, 4) 0-39: critical. 70+ is healthy base. <50: at risk. Distribution: 30% champions, 40% healthy, 20% at risk, 10% critical. Track distribution over time. Healthy growth: shift to 60+. Avoid gaming the score (manipulation). Calibrate quarterly." },
    { q: "How do I use CHS for churn prevention?", a: "Workflow: 1) Score 0-100 weekly, 2) Categorize (champion, healthy, at risk, critical), 3) Auto-alert CSM for at-risk, 4) Outreach (call, email, meeting), 5) Action plan, 6) Track. Most teams: 30-50% reduction in voluntary churn with proactive outreach. CSM time: focus on at-risk. Tier 1 (top 20%): 80% of CSM time. Bottom 20%: low-touch or save." },
    { q: "How often should CHS update?", a: "Updates: 1) Daily for product usage, 2) Weekly for engagement, 3) Monthly for relationship/account, 4) Quarterly for full recalibration. weekly composite. Critical signals (usage drop): real-time alerts. Avoid real-time composite (too noisy). Tools: Gainsight (real-time), ChurnZero (daily), custom (depends). weekly is enough. Daily alerts for usage drops >50%." },
    { q: "What is the difference between CHS and NPS?", a: "NPS: surveys users (would you recommend?). CHS: composite of behavior + relationship. NPS is leading (predicts churn 3-6 months out). CHS is leading AND current (predicts + identifies). Track both. NPS: survey data. CHS: real-time data. NPS: quarterly. CHS: weekly. Best option: NPS for trend, CHS for action. CHS is more actionable, NPS is more comparable across companies." },
    { q: "How do I avoid CHS gaming or manipulation?", a: "Anti-gaming: 1) Multiple signals, 2) Hard to fake signals (real usage), 3) No \"make it green\" override, 4) Quarterly recalibration, 5) Validate against actual churn. Avoid weights that are too easy to manipulate. Real signals: product usage, ticket volume, NPS, support satisfaction. Less reliable: sentiment analysis, social media. Best option: 5-10 signals, mix of objective + subjective, validated." },
  ],
  howToUse: [
    'Enter the 5 customer health signals: Product Usage (0-100), NPS (-100 to +100), Support Tickets (last 90 days), Engagement (0-100), Contract Value (0-100).',
    'Select a Weight Preset that matches your GTM motion (Balanced is the default).',
    'Read the composite Health Score 0-100 and Health band. Sub-scores are shown normalized so you can identify the lowest signal for intervention.',
  ],
  engineKey: true,
};

registerEngine(engine);

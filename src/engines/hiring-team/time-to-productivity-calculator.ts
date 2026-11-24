// P11-2 Time to Productivity (Ramp Time)
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS People-ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (LinkedIn Talent Insights 2024 + HBR First 90 Days + Pave 2024).
// Dual-band per role_level: IC ramp ~ half of Manager ramp.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-15：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端逐字节相同，不可能漂。
//   ⚠️ 兜底与 params **同源**（同一个局部变量）⇒ 英文页逐字不变（G9）、模板不冻结数值（G8）。
//   ⚠️ 命名空间必须精确等于 toolAlias(slug)（见 tests/scripts/p168-tokenized-engines.mjs）。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

export const HEALTH_BANDS = {
  IC: {
    excellent: { threshold: 4,  label: '🟢 Excellent', message: 'Fast ramp — IC reaches productivity in under a month.' },
    good:      { threshold: 8,  label: '🟡 Good',      message: 'Healthy IC ramp — under 2 months to first meaningful output.' },
    warning:   { threshold: 16, label: '🟠 Warning',   message: 'Slow IC ramp — likely missing documentation, mentorship, or scoped first project.' },
    critical:  { threshold: Infinity, label: '🔴 Critical', message: 'IC ramp >4 months — onboarding program needs immediate overhaul.' },
  },
  Manager: {
    excellent: { threshold: 8,  label: '🟢 Excellent', message: 'Fast Manager ramp — leadership transition completed in under 2 months.' },
    good:      { threshold: 16, label: '🟡 Good',      message: 'Typical Manager ramp — first 90 days complete with team alignment.' },
    warning:   { threshold: 26, label: '🟠 Warning',   message: 'Slow Manager ramp — likely missing executive sponsorship or team context.' },
    critical:  { threshold: Infinity, label: '🔴 Critical', message: 'Manager ramp >6 months — succession risk and team disengagement likely.' },
  },
};

export function adjustedRamp(weeks: number, complexity: 'Low' | 'Med' | 'High'): number {
  const mult = complexity === 'Low' ? 0.75 : complexity === 'High' ? 1.4 : 1.0;
  return weeks * mult;
}

export function calcHealthBand(weeks: number, role: 'IC' | 'Manager'): keyof typeof HEALTH_BANDS.IC {
  const table = HEALTH_BANDS[role];
  if (weeks <= table.excellent.threshold) return 'excellent';
  if (weeks <= table.good.threshold) return 'good';
  if (weeks <= table.warning.threshold) return 'warning';
  return 'critical';
}

function fmtWeeks(x: number): string { return x.toFixed(1).replace(/\.0$/, '') + 'w'; }

const engine: ToolEngine = {
  slug: 'solopreneur-time-to-productivity-calculator',
  title: 'Time to Productivity (Ramp Time)',
  description:
    'Compute the adjusted ramp time to first meaningful productivity for a new hire, factoring role level (IC vs Manager) and industry complexity. INVERSE health bands — shorter ramp is better. For mid-market B2B SaaS ($10M-$50M ARR) People-ops managers and Head-of-HR.',
  inputs: [
    { name: 'role_level',         label: 'Role level',          type: 'select', options: ['IC', 'Manager'], default: 'IC' },
    { name: 'ramp_weeks',         label: 'Base ramp weeks',     placeholder: 'e.g. 8', type: 'number' },
    { name: 'industry_complexity', label: 'Industry complexity', type: 'select', options: ['Low', 'Med', 'High'], default: 'Med' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let d=function(e){return Number.isNaN(e)?0:Math.max(0,e)},l=function(e,t){return e*(t==="Low"?.75:t==="High"?1.4:1)},s=function(e,t){const n=o[t];return e<=n.excellent.threshold?"excellent":e<=n.good.threshold?"good":e<=n.warning.threshold?"warning":"critical"},r=function(e){return e.toFixed(1).replace(/\\.0$/,"")+"w"},m=function(e,t,n){var a=w(e);return Array.isArray(a)?a.join(\`
\`):String(a)};var I=d,j=l,F=s,M=r,L=m,i=tk,b='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',i=new Function("return "+b)(),o={IC:{excellent:{threshold:4,label:"🟢 Excellent",message:"Fast ramp — IC reaches productivity in under a month."},good:{threshold:8,label:"🟡 Good",message:"Healthy IC ramp — under 2 months to first meaningful output."},warning:{threshold:16,label:"🟠 Warning",message:"Slow IC ramp — likely missing documentation, mentorship, or scoped first project."},critical:{threshold:1/0,label:"🔴 Critical",message:"IC ramp >4 months — onboarding program needs immediate overhaul."}},Manager:{excellent:{threshold:8,label:"🟢 Excellent",message:"Fast Manager ramp — leadership transition completed in under 2 months."},good:{threshold:16,label:"🟡 Good",message:"Typical Manager ramp — first 90 days complete with team alignment."},warning:{threshold:26,label:"🟠 Warning",message:"Slow Manager ramp — likely missing executive sponsorship or team context."},critical:{threshold:1/0,label:"🔴 Critical",message:"Manager ramp >6 months — succession risk and team disengagement likely."}}},w=function(e){const t=e.role_level||"IC",n=d(Number(e.ramp_weeks)||0),a=e.industry_complexity||"Med",c=l(n,a),v=s(c,t),x=o[t][v],u=l(n,"Low"),k=s(u,t),_=o[t][k],p=o[t].excellent.threshold,C=p/n,h=a==="Low"?"0.75":a==="High"?"1.40":"1.00",g=String(n),f=a,y=r(c);return["🩺 Ramp Health: "+x.label+" ("+r(c)+" for "+t+")",i("calc_out.time_to_productivity.row.snapshot","📊 Snapshot: "+g+"w base × "+h+" ("+f+" complexity) = "+y+" adjusted",{weeks:g,factor:h,complexity:f,adjusted:y}),"🔄 What-If: if complexity drops to Low, ramp = "+r(u)+" (would be "+_.label+")","⚖️ Break-Even: to hit 🟢 Excellent ("+(t==="IC"?"≤4w":"≤8w")+" ceiling), need base ramp of "+r(p)+" — i.e. "+C.toFixed(2)+"x your current "+n+"w","🎯 Milestone: Plan first 90-day OKRs landing at week 12; pair with [Productivity Ramp Curve Calculator] (P11-3) to model output curve",i("calc_out.time_to_productivity.row.tip","💡 Tip: Manager ramp is typically 2x IC ramp — budget for this in headcount plan and avoid promoting ICs to management without 6 months of management prep.")]};return[m(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`,
  },
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
  generate(inputs) {
    const role = (inputs.role_level || 'IC') as 'IC' | 'Manager';
    const weeks = clampNonNegative(Number(inputs.ramp_weeks) || 0);
    const cplx = (inputs.industry_complexity || 'Med') as 'Low' | 'Med' | 'High';
    const adj = adjustedRamp(weeks, cplx);
    const band = calcHealthBand(adj, role);
    const bandInfo = HEALTH_BANDS[role][band];
    const altAdj = adjustedRamp(weeks, 'Low');
    const altBand = calcHealthBand(altAdj, role);
    const altBandInfo = HEALTH_BANDS[role][altBand];
    const targetWeeks = HEALTH_BANDS[role].excellent.threshold;
    const ratioNeeded = targetWeeks / weeks;
    const complexityFactorLabel = cplx === 'Low' ? '0.75' : cplx === 'High' ? '1.40' : '1.00';
    const weeksLabel = String(weeks);
    const complexityLabel = cplx;
    const adjustedLabel = fmtWeeks(adj);
    return [
      '🩺 Ramp Health: ' + bandInfo.label + ' (' + fmtWeeks(adj) + ' for ' + role + ')',
      makeToken(
        'calc_out.time_to_productivity.row.snapshot',
        '📊 Snapshot: ' + weeksLabel + 'w base × ' + complexityFactorLabel + ' (' + complexityLabel + ' complexity) = ' + adjustedLabel + ' adjusted',
        { weeks: weeksLabel, factor: complexityFactorLabel, complexity: complexityLabel, adjusted: adjustedLabel },
      ),
      '🔄 What-If: if complexity drops to Low, ramp = ' + fmtWeeks(altAdj) + ' (would be ' + altBandInfo.label + ')',
      '⚖️ Break-Even: to hit 🟢 Excellent (' + (role === 'IC' ? '≤4w' : '≤8w') + ' ceiling), need base ramp of ' + fmtWeeks(targetWeeks) + ' — i.e. ' + ratioNeeded.toFixed(2) + 'x your current ' + weeks + 'w',
      '🎯 Milestone: Plan first 90-day OKRs landing at week 12; pair with [Productivity Ramp Curve Calculator] (P11-3) to model output curve',
      makeToken(
        'calc_out.time_to_productivity.row.tip',
        '💡 Tip: Manager ramp is typically 2x IC ramp — budget for this in headcount plan and avoid promoting ICs to management without 6 months of management prep.',
      ),
    ];
  },
  staticExamples: [
    '🩺 Ramp Health: 🟡 Good (8w for IC)\n$calc_out.time_to_productivity.row.snapshot{"weeks":"8","factor":"1.00","complexity":"Med","adjusted":"8w"}|📊 Snapshot: 8w base × 1.00 (Med complexity) = 8w adjusted|\n🔄 What-If: if complexity drops to Low, ramp = 6w (would be 🟡 Good)\n⚖️ Break-Even: to hit 🟢 Excellent (≤4w ceiling), need base ramp of 4w — i.e. 0.50x your current 8w\n🎯 Milestone: Plan first 90-day OKRs landing at week 12; pair with [Productivity Ramp Curve Calculator] (P11-3) to model output curve\n$calc_out.time_to_productivity.row.tip|💡 Tip: Manager ramp is typically 2x IC ramp — budget for this in headcount plan and avoid promoting ICs to management without 6 months of management prep.|',
  ],
  faq: [
    { q: 'What counts as "productivity"?', a: 'A new hire is "productive" when they are contributing at the level expected for their role — usually measured by reaching OKR targets, shipping independent work, or hitting ramp-stage review milestones. Different companies use different definitions; pick one and stick with it.' },
    { q: 'Why is Manager ramp 2x IC ramp?', a: 'Managers have to learn the team (existing 1:1s, dynamics, history), the org (cross-functional partners, political landscape), AND their leadership style — in addition to the same role-context learning an IC needs. HBR "The First 90 Days" and LinkedIn Talent Insights 2024 both confirm this 2x pattern.' },
    { q: 'What is industry complexity?', a: 'A multiplier reflecting how much domain context the new hire needs. Low = consumer/general (e.g. marketing at a DTC brand), Med = general SaaS, High = specialized B2B (e.g. healthcare IT, financial compliance, dev tooling for niche stacks).' },
    { q: 'Should I include training/onboarding in ramp weeks?', a: 'Yes — ramp weeks should cover the FULL period from start date to first meaningful output, including any formal training, certification, or shadowing. Don\'t double-count by adding training separately.' },
    { q: 'How does this pair with P11-3 Productivity Ramp Curve?', a: 'P11-2 measures HOW LONG until first productivity. P11-3 models the CURVE of productivity over time (S-Curve, Linear, SlowStart) and computes break-even month. Use P11-2 for headcount plan; use P11-3 to project cumulative productive output.' },
    { q: 'What if I onboard 10 hires at once?', a: 'Cohort-based onboarding typically lengthens ramp by 20-30% (mentor attention divided). Factor this in by adding a "cohort" complexity tier or multiplying ramp_weeks by 1.25 for cohorts of 5+.' },
    { q: "What is time-to-productivity?", a: "Time from start date to first meaningful productivity. Engineering: 1-4 weeks (first PR, first task complete). Sales: 2-6 weeks (first qualified lead, first call). Marketing: 1-2 weeks. Customer success: 1-2 weeks. Goal: shorter is better. Affected by: onboarding, tools, manager support, role clarity." },
    { q: "How do I reduce time-to-productivity?", a: "1) Pre-onboarding (laptop shipped, accounts set up week before), 2) Structured first-month plan (specific tasks, milestones), 3) Buddy system (peer mentor), 4) Manager 1:1s in first 30 days (twice weekly), 5) Documentation culture (less tribal knowledge), 6) Skip-level meetings. Most teams 30-50% reduction in 3 months." },
    { q: "What is the cost of slow time-to-productivity?", a: "Slow ramp = lost productivity. For $100K engineer: 1 extra month of ramp = $8K. Average ramp: 3 months. Slow ramp: 6 months. Difference: $25K per hire. For 10 hires/year: $250K lost. Investment in onboarding pays back 5-10x. Track ramp time per cohort. Cut slowest first." },
    { q: "How does onboarding affect ramp time?", a: "Strong onboarding: 30-50% faster ramp. Weak onboarding: 6-12 months instead of 3-6. Components: pre-onboarding, week 1 plan, 30/60/90 day plan, clear role, manager support, mentorship. Most companies: 50%+ improvement in 6 months with structured onboarding. Track: time-to-first-PR, time-to-first-ticket-closed." },
    { q: "What is the difference between time-to-productivity and onboarding time?", a: "Onboarding: administrative (paperwork, accounts, training). Time-to-productivity: first meaningful work output. Onboarding: 1-2 weeks. Time-to-productivity: 1-4 weeks for first output. Track both. Slow onboarding = frustration. Slow time-to-productivity = bigger productivity loss. Optimize both." },
    { q: "How long does it take to train a new manager?", a: "New manager (first-time manager): 6-12 months to full effectiveness. Promoting IC to manager: 6-12 months to full productivity. Hiring external manager: 3-6 months. Common pitfalls: 1) No manager training, 2) Too much IC work, 3) Lack of skip-level support. Best: dedicated manager training program + coaching in first 6 months." },
    { q: "What is the 30/60/90 day plan for new hires?", a: "30 days: learn, observe, ramp up. 60 days: contribute to team, ship first projects. 90 days: own deliverables, suggest improvements. Use as: 1) Onboarding guide, 2) Manager check-in template, 3) Goal-setting framework. Customize per role. Most effective: shared with manager + skip-level, reviewed weekly." },
    { q: "How do I measure time-to-productivity objectively?", a: "Per role: 1) Engineering: time-to-first-PR-merged, 2) Sales: time-to-first-meeting-booked, 3) Support: time-to-first-ticket-resolved, 4) Marketing: time-to-first-campaign-live. Track monthly. Compare by cohort, source, manager. Best: peer-rated productivity at 30/60/90 days. Use data to improve onboarding." },
  ],
  howToUse: [
    'Select the role level (IC vs Manager) — Manager has 2x the IC ramp ceiling.',
    'Enter the base ramp weeks for this role (typical: IC 4-12w, Manager 8-26w).',
    'Select industry complexity — Low (consumer/general), Med (SaaS), High (specialized B2B).',
    'Read the adjusted ramp band, then check the What-If for what a complexity reduction would do.',
    'Use the Break-Even to set the target ramp for next hire cohort.',
  ],
  sources: [
    'https://www.linkedin.com/business/talent/blog/talent-acquisition/onshore-onsite-and-ramp-up-time',
    'https://hbr.org/2009/04/leading-change-when-business-is-good',
    'https://www.pave.com/compensation-benchmarks',
  ],
  engineKey: true,
};
registerEngine(engine);

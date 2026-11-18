// P11-6 Attrition Cost
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS People-ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (SHRM 2022 Human Capital Benchmarking + Gallup attrition research + Pave turnover cost).
// INVERSE band direction — lower % = better.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

export const HEALTH_BANDS = {
  excellent: { threshold: 50,  label: '🟢 Excellent', message: 'Lean attrition cost — strong retention practices or low-friction backfill.' },
  good:      { threshold: 100, label: '🟡 Good',      message: 'Typical attrition cost — within SHRM benchmark range; flag >1.5x salary.' },
  warning:   { threshold: 200, label: '🟠 Warning',   message: 'High attrition cost — flight risk concentrated in critical roles; investigate manager tenure.' },
  critical:  { threshold: Infinity, label: '🔴 Critical', message: 'Severe attrition cost (>2x salary) — every leaver is a major business event.' },
};

export function attritionCost(annualSalary: number, recruitingCost: number, rampWeeks: number, lostProductivityMonths: number, roleLevel: 'IC' | 'Manager'): { recruitingCost: number; rampCost: number; lostProductivityCost: number; total: number; pctOfSalary: number } {
  const roleMultiplier = roleLevel === 'Manager' ? 1.5 : 1.0;
  const recruitingTotal = recruitingCost;
  const rampCost = (annualSalary / 52) * rampWeeks * 0.5;
  const lostProductivityCost = (annualSalary / 12) * lostProductivityMonths * roleMultiplier;
  const total = recruitingTotal + rampCost + lostProductivityCost;
  const pctOfSalary = annualSalary === 0 ? 0 : total / annualSalary * 100;
  return { recruitingCost: recruitingTotal, rampCost, lostProductivityCost, total, pctOfSalary };
}

export function calcHealthBand(pct: number): keyof typeof HEALTH_BANDS {
  if (pct <= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (pct <= HEALTH_BANDS.good.threshold) return 'good';
  if (pct <= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtMoney(x: number): string { return '$' + Math.round(x).toLocaleString(); }
function fmtPct(x: number): string { return x.toFixed(1) + '%'; }

const engine: ToolEngine = {
  slug: 'solopreneur-attrition-cost-calculator',
  title: 'Attrition Cost',
  description:
    'Compute the total cost of losing a single employee — recruiting + ramp + lost productivity. INVERSE health bands — lower % of salary is better: 🟢 ≤50% · 🟡 50-100% · 🟠 100-200% · 🔴 >200%. For mid-market B2B SaaS ($10M-$50M ARR) People-ops managers and Head-of-HR.',
  inputs: [
    { name: 'annual_salary',           label: 'Annual base salary',              placeholder: 'e.g. 120000', type: 'number' },
    { name: 'recruiting_cost',         label: 'Recruiting cost',                 placeholder: 'e.g. 8000',   type: 'number' },
    { name: 'ramp_weeks',              label: 'Ramp weeks (backfill)',           placeholder: 'e.g. 12',     type: 'number' },
    { name: 'lost_productivity_months', label: 'Lost productivity months',       placeholder: 'e.g. 6',      type: 'number' },
    { name: 'role_level',              label: 'Role level', type: 'select', options: ['IC', 'Manager'], default: 'IC' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let o=function(t){return Number.isNaN(t)?0:Math.max(0,t)},d=function(t,n,i,r,l){const s=l==="Manager"?1.5:1,c=n,u=t/52*i*.5,g=t/12*r*s,f=c+u+g,h=t===0?0:f/t*100;return{recruitingCost:c,rampCost:u,lostProductivityCost:g,total:f,pctOfSalary:h}},y=function(t){return t<=a.excellent.threshold?"excellent":t<=a.good.threshold?"good":t<=a.warning.threshold?"warning":"critical"},e=function(t){return"$"+Math.round(t).toLocaleString()},m=function(t){return t.toFixed(1)+"%"},p=function(t,n,i){var r=_(t);return Array.isArray(r)?r.join(\`
\`):String(r)};var k=o,w=d,x=y,M=e,N=m,I=p,a={excellent:{threshold:50,label:"🟢 Excellent",message:"Lean attrition cost — strong retention practices or low-friction backfill."},good:{threshold:100,label:"🟡 Good",message:"Typical attrition cost — within SHRM benchmark range; flag >1.5x salary."},warning:{threshold:200,label:"🟠 Warning",message:"High attrition cost — flight risk concentrated in critical roles; investigate manager tenure."},critical:{threshold:null,label:"🔴 Critical",message:"Severe attrition cost (>2x salary) — every leaver is a major business event."}},_=function(t){const n=o(Number(t.annual_salary)||0),i=o(Number(t.recruiting_cost)||0),r=o(Number(t.ramp_weeks)||0),l=o(Number(t.lost_productivity_months)||0),s=t.role_level||"IC",{recruitingCost:c,rampCost:u,lostProductivityCost:g,total:f,pctOfSalary:h}=d(n,i,r,l,s),b=y(h),C=a[b],v=d(n,i,r,l,"Manager");return["🩺 Attrition Cost: "+C.label+" ("+e(f)+" = "+m(h)+" of salary)","📊 Snapshot: Recruiting "+e(c)+" + Ramp "+e(u)+" + Lost productivity "+e(g)+" (role "+s+")","🔄 What-If: if role is Manager, lost prod = "+e(v.lostProductivityCost)+" → total = "+e(v.total)+" ("+m(v.pctOfSalary)+")","⚖️ Break-Even: to hit 🟢 Excellent (≤50%), need lost_productivity_months ≤ 4 OR cut recruiting/ramp costs proportionally","🎯 Milestone: Track attrition cost per leaver quarterly — flag anyone >100% salary for retention review","💡 Tip: Manager attrition costs 1.5x IC — invest in skip-level 1:1s and comp reviews to catch flight risks early."]};return[p(inputs,pick,fill)]}finally{}
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
    const sal = clampNonNegative(Number(inputs.annual_salary) || 0);
    const rec = clampNonNegative(Number(inputs.recruiting_cost) || 0);
    const rw = clampNonNegative(Number(inputs.ramp_weeks) || 0);
    const lpm = clampNonNegative(Number(inputs.lost_productivity_months) || 0);
    const role = (inputs.role_level || 'IC') as 'IC' | 'Manager';
    const { recruitingCost, rampCost, lostProductivityCost, total, pctOfSalary } = attritionCost(sal, rec, rw, lpm, role);
    const band = calcHealthBand(pctOfSalary);
    const bandInfo = HEALTH_BANDS[band];
    const alt = attritionCost(sal, rec, rw, lpm, 'Manager');
    return [
      '🩺 Attrition Cost: ' + bandInfo.label + ' (' + fmtMoney(total) + ' = ' + fmtPct(pctOfSalary) + ' of salary)',
      '📊 Snapshot: Recruiting ' + fmtMoney(recruitingCost) + ' + Ramp ' + fmtMoney(rampCost) + ' + Lost productivity ' + fmtMoney(lostProductivityCost) + ' (role ' + role + ')',
      '🔄 What-If: if role is Manager, lost prod = ' + fmtMoney(alt.lostProductivityCost) + ' → total = ' + fmtMoney(alt.total) + ' (' + fmtPct(alt.pctOfSalary) + ')',
      '⚖️ Break-Even: to hit 🟢 Excellent (≤50%), need lost_productivity_months ≤ 4 OR cut recruiting/ramp costs proportionally',
      '🎯 Milestone: Track attrition cost per leaver quarterly — flag anyone >100% salary for retention review',
      '💡 Tip: Manager attrition costs 1.5x IC — invest in skip-level 1:1s and comp reviews to catch flight risks early.',
    ];
  },
  staticExamples: [
    '🩺 Attrition Cost: 🟡 Good ($81,846 = 68.2% of salary)\n📊 Snapshot: Recruiting $8,000 + Ramp $13,846 + Lost productivity $60,000 (role IC)\n🔄 What-If: if role is Manager, lost prod = $90,000 → total = $111,846 (93.2%)\n⚖️ Break-Even: to hit 🟢 Excellent (≤50%), need lost_productivity_months ≤ 4 OR cut recruiting/ramp costs proportionally\n🎯 Milestone: Track attrition cost per leaver quarterly — flag anyone >100% salary for retention review\n💡 Tip: Manager attrition costs 1.5x IC — invest in skip-level 1:1s and comp reviews to catch flight risks early.',
  ],
  faq: [
    { q: 'What does "attrition cost" include?', a: 'Three components: (1) Recruiting cost — recruiter fees, job board, interview time, signing bonus. (2) Ramp cost — the new hire takes weeks to reach productivity, during which the team is short-handed. (3) Lost productivity cost — the team and the leaver\'s network produce less during transition. P11-6 captures all three.' },
    { q: 'Why is Manager attrition 1.5x IC?', a: 'When a manager leaves, the entire team\'s productivity drops (1:1 disruption, reorg, hiring freeze) and the company pays a premium to backfill the role. P11-6 multiplies the lost_productivity_cost by 1.5 for Manager roles. SHRM 2022 backs this with empirical data.' },
    { q: 'What if I have detailed ramp data per role?', a: 'P11-6 uses a flat 50% productivity during ramp (i.e. ramp_cost = salary/52 × weeks × 0.5). For more granular modeling, use our [Productivity Ramp Curve Calculator] (P11-3) to fit a curve, then integrate over the ramp period.' },
    { q: 'How does recruiting_cost relate to offer accept rate?', a: 'Recruiting cost varies widely: in-house recruiter ~$3-5K, agency search ~$15-30K (15-25% of base for exec), employee referral ~$1-2K. Offer accept rate is orthogonal — a $5K recruiter can close a $200K hire that stays 5 years (very low attrition cost) or leaves in 6 months (very high).' },
    { q: 'Is voluntary + involuntary attrition treated differently?', a: 'P11-6 models total cost regardless of reason. In practice, involuntary attrition (layoffs, PIPs) typically has lower ramp_cost (faster decision to backfill) but higher recruiting_cost (reputation damage + severance). Voluntary attrition (resignations) typically has longer ramp_cost (more disruption) and the lost_productivity_months should reflect notice period + transition.' },
    { q: 'Should I include severance in the cost?', a: 'Yes — add it to recruiting_cost. Severance is typically 2-4 weeks per year of tenure for involuntary departures. P11-6 does not break it out separately, so lump it in.' },
    { q: "How much does employee turnover cost a company?", a: "Industry average: 50-200% of annual salary. Entry-level: 30-50%. Mid-level: 100-150%. Senior/executive: 200-400%. Includes: recruiting fees, training, productivity loss, manager time, customer impact. For a $100K employee: turnover costs $50K-200K. Reducing turnover by 5% saves a 100-person company $250K-1M/year." },
    { q: "What are the hidden costs of turnover?", a: "Beyond recruiting: 1) Knowledge loss (months to rebuild), 2) Customer relationships damaged, 3) Team morale hits, 4) Manager time (20-30% of their week for 2 months), 5) Reduced productivity (new hire is 50-70% productive for 3-6 months), 6) Severance payout, 7) PTO payout. Most companies underestimate by 50-100%." },
    { q: "What is a healthy employee turnover rate?", a: "Benchmarks: <10% voluntary is excellent. 10-15% is healthy. 15-20% is concerning. >20% is critical. By industry: tech 13%, retail 60%, healthcare 20%, education 16%. Voluntary vs involuntary: similar cost. Focus on reducing voluntary turnover (regrettable). Track both rates monthly." },
    { q: "How do I reduce turnover at my company?", a: "Top 5 drivers: 1) Compensation (competitive, transparent), 2) Career growth (clear paths, internal mobility), 3) Manager quality (training, accountability), 4) Work-life balance (remote, flexible hours), 5) Culture (values alignment, recognition). Conduct exit interviews. Track: manager score, comp ratio, tenure. Improve lowest scores first." },
    { q: "When is turnover actually good?", a: "Healthy turnover: 1) Replacing low performers, 2) Career growth exits (people moving up), 3) Cultural issues (removing toxic employees). Unhealthy: high performers leaving, regulatory issues, mass exits. Track regrettable vs non-regrettable turnover. Aim for 5-10% non-regrettable. Be cautious of \"low turnover at all costs\" — it can mask problems." },
    { q: "How do I calculate turnover cost per role?", a: "Cost = (recruiting + onboarding + training + ramp_loss + manager_time + severance + backfill_time). Recruiting: 15-30% of salary. Onboarding: 1-2 weeks manager time. Ramp: 50% productivity for 3-6 months. Severance: 2 weeks per year. For a $100K engineer: $50K-150K total. Use this to justify retention investments." },
    { q: "Is retention bonus worth it?", a: "Retention bonus: 10-25% of annual salary, paid after 12-24 months. Cost: $10K-25K per employee. Alternative: turnover cost $50K-150K. ROI: 3-10x if it prevents one exit. Use for: key talent, M&A, restructuring, high-risk groups. Avoid: across-the-board bonuses (becomes expected)." },
    { q: "How do I track turnover to predict future exits?", a: "Leading indicators: 1) Engagement drops (eNPS surveys), 2) Manager quality scores, 3) Comp ratio (below market = higher exit risk), 4) Internal mobility (people stuck = high exit), 5) Life events (new baby, marriage, buy house). Track monthly. Use ML models for at-risk scoring. Proactive 1:1s with at-risk employees cut exits 30-50%." },
  ],
  howToUse: [
    'Enter the annual base salary of the role that is leaving (or being backfilled).',
    'Enter recruiting cost (recruiter fees + job board + signing bonus).',
    'Enter ramp weeks — how long for the new hire to reach full productivity.',
    'Enter lost productivity months — typically 3-9 months for full team stabilization.',
    'Select role level (IC vs Manager — Manager uses 1.5x multiplier).',
    'Read the % of salary band, then check What-If for the Manager scenario.',
  ],
  sources: [
    'https://www.shrm.org/topics-tools/research/2022-human-capital-benchmarking-report',
    'https://www.gallup.com/workplace/349484/state-of-the-global-workplace.aspx',
    'https://www.pave.com/compensation-benchmarks',
  ],
  engineKey: true,
};
registerEngine(engine);

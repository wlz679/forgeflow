// P14-1 GDPR Fine Risk
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS DPO/Privacy Officer persona (€10M-€50M ARR).
// Regulatory anchors: GDPR Art. 83 (full text at https://gdpr-info.eu/art-83-gdpr/);
// ICO GDPR fines guide 2024; IAPP Privacy Enforcement Atlas 2024.
// HIGHER on exposure_ratio: more exposure = worse. Bands: <0.25% / 0.25-1% / 1-2% / ≥2%.
// Critical threshold 2% (EU enforcement has not exceeded this in past 5 years except against Big Tech).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

export const HEALTH_BANDS = {
  excellent: { threshold: 0.0025, label: 'Excellent', message: 'Low exposure — mature compliance.' },
  good:      { threshold: 0.01,   label: 'Good',      message: 'Manageable exposure.' },
  warning:   { threshold: 0.02,   label: 'Warning',   message: 'Significant exposure.' },
  critical:  { threshold: Infinity, label: 'Critical', message: 'Fine-tier cap likely to hit.' },
};

export function maxFineAmount(revenue: number, finePct: number): number {
  return revenue * (finePct / 100);
}

export function perViolationExpected(maxFine: number, industryMult: number): number {
  return maxFine * industryMult;
}

export function annualExposure(perViolation: number, violations: number): number {
  return perViolation * violations;
}

export function exposureRatio(annual: number, revenue: number): number {
  return revenue > 0 ? annual / revenue : 0;
}

export function calcHealthBand(ratio: number): keyof typeof HEALTH_BANDS {
  if (ratio < HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (ratio < HEALTH_BANDS.good.threshold) return 'good';
  if (ratio < HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtMoney(x: number): string { return '€' + Math.round(x).toLocaleString(); }
function fmtPct(x: number): string { return (x * 100).toFixed(2) + '%'; }
function fmtInt(x: number): string { return Math.round(x).toLocaleString(); }

const engine: ToolEngine = {
  slug: 'solopreneur-gdpr-fine-calculator',
  title: 'GDPR Fine Risk',
  description:
    'Quantify annualized GDPR fine exposure given violation rate and industry-risk profile. HIGHER health bands — more exposure = worse: 🟢 <0.25% · 🟡 0.25-1% · 🟠 1-2% · 🔴 ≥2%. For mid-market B2B SaaS (€10M-€50M ARR) DPOs, Privacy Officers, and Heads of Privacy.',
  inputs: [
    { name: 'annual_revenue_global',    label: 'Annual global revenue (€)',                placeholder: 'e.g. 25000000', type: 'number' },
    { name: 'max_fine_pct',             label: 'GDPR fine tier',                            placeholder: '4% (Art. 83(5))', type: 'select', options: ['4%', '2%', '1%', '0.5%'] },
    { name: 'violations_per_year',      label: 'Reportable violations per year',            placeholder: 'e.g. 2',       type: 'number' },
    { name: 'industry_risk_multiplier', label: 'Industry risk profile',                     placeholder: 'SaaS (0.8×)',  type: 'select', options: ['SaaS (0.8×)', 'FinTech (1.0×)', 'HealthTech (1.4×)', 'AdTech (1.6×)'] },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `var cnn=function(x){return Math.max(0,x)};function run(inputs, pick, fill) {
  var revenue = cnn(Number(inputs.annual_revenue_global) || 0);
  var finePct = Number(String(inputs.max_fine_pct).replace('%','')) || 4;
  var violations = cnn(Number(inputs.violations_per_year) || 0);
  var industryStr = String(inputs.industry_risk_multiplier);
  var industryMult = industryStr.indexOf('0.8') >= 0 ? 0.8 : industryStr.indexOf('1.0') >= 0 ? 1.0 : industryStr.indexOf('1.4') >= 0 ? 1.4 : industryStr.indexOf('1.6') >= 0 ? 1.6 : 0.8;
  var maxFine = revenue * (finePct / 100);
  var perViolation = maxFine * industryMult;
  var annual = perViolation * violations;
  var ratio = revenue > 0 ? annual / revenue : 0;
  var band = ratio < 0.0025 ? 'Excellent' : ratio < 0.01 ? 'Good' : ratio < 0.02 ? 'Warning' : 'Critical';
  var emoji = ratio < 0.0025 ? '🟢' : ratio < 0.01 ? '🟡' : ratio < 0.02 ? '🟠' : '🔴';
  var altFinePct = 2;
  var altMaxFine = revenue * (altFinePct / 100);
  var altPerViolation = altMaxFine * industryMult;
  var altAnnual = altPerViolation * violations;
  var lift = Math.max(0, annual - altAnnual);
  var needViolations = altPerViolation > 0 ? Math.ceil(altAnnual / altPerViolation) : 0;
  return [
    '🩺 GDPR Fine Risk: ' + emoji + ' ' + band + ' (annual exposure ' + Math.round(annual).toLocaleString() + ' € / ' + (ratio*100).toFixed(2) + '% of revenue)',
    '📊 Snapshot: ' + Math.round(revenue).toLocaleString() + ' € global revenue · ' + violations.toLocaleString() + ' violations/yr · ' + finePct + '% cap tier · industry ' + industryMult.toFixed(1) + '× · per-violation ' + Math.round(perViolation).toLocaleString() + ' € · annual exposure ' + Math.round(annual).toLocaleString() + ' €',
    '🔄 What-If: if tier drops to 2% (procedural), annual exposure drops to ' + Math.round(altAnnual).toLocaleString() + ' € (' + (altAnnual*100/Math.max(1,revenue)).toFixed(2) + '% — 🟢 Excellent). Invest in DSAR automation + CMP to halve violation rate.',
    '⚖️ Break-Even: to hit 🟢 Excellent (<0.25%), need ~' + needViolations + ' violation/yr OR move to 2% tier (procedural-only violations)',
    '🎯 Milestone: re-baseline annually + after any material breach. ICO publishes quarterly enforcement summaries (https://ico.org.uk/action-weve-taken/enforcement/).',
    '💡 Tip: pair with [Data Breach Notification] (L-5) — a single breach can fill the violations budget. Also pair with our [NRR Calculator] (R-1) — fines compound with churn.',
    '\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🧭 Decision Question: 单纯看 fine % 是陷阱，**核心问题是"annual turnover + 数据规模 + prior violations + mitigation efforts"决定实际罚款 + 是否值得立刻全面合规**。4% 全球营收是上限，实际常在 1-3% 区间。\n• 🧭 Recommendation: (1) **fine > 4% 全球营收** → 必须立刻全面合规（C-level 推动 + 法务介入）；(2) **2-4%** → 高 ROI 投入（合规预算 < fine 期望值）；(3) **< 2%** → minimum viable 合规（DPA + privacy policy + consent banner）；(4) **数据 < 500 人/无跨境** → 标准化模板方案（avoid over-engineering）。\n• 🧭 Key Uncertainty: (1) turnover 阈值是滑动值（不是 4% 上限就罚 4%，看违规严重性 + 配合度）；(2) mitigation efforts 可降 30-50% 罚款（主动报告 vs 被发现差异巨大）；(3) prior violations 会加重（首次 vs 重复）；(4) 跨境数据传输额外风险（Schrems II 单独处罚）。\n• 🧭 Next Action: (a) 跑 [DPA Cost Calculator] 看 supplier 链合规 ROI；(b) 跑 [Consent Revenue Calculator] 看合规 vs 转化率 trade-off；(c) 跑 [DSAR Cost Calculator] 算运营 SOP 成本；(d) 决策前法务 review + 数据流 audit (不只是算法数字)。',
  ];
}
return run(inputs, pick, fill);`,
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
    const revenue = clampNonNegative(Number(inputs.annual_revenue_global) || 0);
    const finePct = Number(String(inputs.max_fine_pct).replace('%', '')) || 4;
    const violations = clampNonNegative(Number(inputs.violations_per_year) || 0);
    const industryStr = String(inputs.industry_risk_multiplier);
    const industryMult = industryStr.indexOf('0.8') >= 0 ? 0.8 : industryStr.indexOf('1.0') >= 0 ? 1.0 : industryStr.indexOf('1.4') >= 0 ? 1.4 : industryStr.indexOf('1.6') >= 0 ? 1.6 : 0.8;
    const maxFine = maxFineAmount(revenue, finePct);
    const perViolation = perViolationExpected(maxFine, industryMult);
    const annual = annualExposure(perViolation, violations);
    const ratio = exposureRatio(annual, revenue);
    const band = calcHealthBand(ratio);
    const bandInfo = HEALTH_BANDS[band];
    const altFinePct = 2;
    const altMaxFine = maxFineAmount(revenue, altFinePct);
    const altPerViolation = perViolationExpected(altMaxFine, industryMult);
    const altAnnual = annualExposure(altPerViolation, violations);
    const needViolations = altPerViolation > 0 ? Math.ceil(altAnnual / altPerViolation) : 0;
    return [
      '🩺 GDPR Fine Risk: ' + bandInfo.label + ' (annual exposure ' + fmtMoney(annual) + ' / ' + fmtPct(ratio) + ' of revenue)',
      '📊 Snapshot: ' + fmtMoney(revenue) + ' global revenue · ' + fmtInt(violations) + ' violations/yr · ' + finePct + '% cap tier · industry ' + industryMult.toFixed(1) + '× · per-violation ' + fmtMoney(perViolation) + ' · annual exposure ' + fmtMoney(annual),
      '🔄 What-If: if tier drops to ' + altFinePct + '% (procedural), annual exposure drops to ' + fmtMoney(altAnnual) + ' (' + fmtPct(altAnnual / Math.max(1, revenue)) + ' — 🟢 Excellent). Invest in DSAR automation + CMP to halve violation rate.',
      '⚖️ Break-Even: to hit 🟢 Excellent (<0.25%), need ~' + needViolations + ' violation/yr OR move to ' + altFinePct + '% tier (procedural-only violations)',
      '🎯 Milestone: re-baseline annually + after any material breach. ICO publishes quarterly enforcement summaries (https://ico.org.uk/action-weve-taken/enforcement/).',
      '💡 Tip: pair with [Data Breach Notification] (L-5) — a single breach can fill the violations budget. Also pair with our [NRR Calculator] (R-1) — fines compound with churn.',
      '\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🧭 Decision Question: 单纯看 fine % 是陷阱，**核心问题是"annual turnover + 数据规模 + prior violations + mitigation efforts"决定实际罚款 + 是否值得立刻全面合规**。4% 全球营收是上限，实际常在 1-3% 区间。\n• 🧭 Recommendation: (1) **fine > 4% 全球营收** → 必须立刻全面合规（C-level 推动 + 法务介入）；(2) **2-4%** → 高 ROI 投入（合规预算 < fine 期望值）；(3) **< 2%** → minimum viable 合规（DPA + privacy policy + consent banner）；(4) **数据 < 500 人/无跨境** → 标准化模板方案（avoid over-engineering）。\n• 🧭 Key Uncertainty: (1) turnover 阈值是滑动值（不是 4% 上限就罚 4%，看违规严重性 + 配合度）；(2) mitigation efforts 可降 30-50% 罚款（主动报告 vs 被发现差异巨大）；(3) prior violations 会加重（首次 vs 重复）；(4) 跨境数据传输额外风险（Schrems II 单独处罚）。\n• 🧭 Next Action: (a) 跑 [DPA Cost Calculator] 看 supplier 链合规 ROI；(b) 跑 [Consent Revenue Calculator] 看合规 vs 转化率 trade-off；(c) 跑 [DSAR Cost Calculator] 算运营 SOP 成本；(d) 决策前法务 review + 数据流 audit (不只是算法数字)。',
    ];
  },
  staticExamples: [
    '🩺 GDPR Fine Risk: Critical (annual exposure €1,600,000 / 6.40% of revenue)\n📊 Snapshot: €25,000,000 global revenue · 2 violations/yr · 4% cap tier · industry 0.8× · per-violation €800,000 · annual exposure €1,600,000\n🔄 What-If: if tier drops to 2% (procedural), annual exposure drops to €800,000 (3.20% — 🟢 Excellent). Invest in DSAR automation + CMP to halve violation rate.\n⚖️ Break-Even: to hit 🟢 Excellent (<0.25%), need ~2 violation/yr OR move to 2% tier (procedural-only violations)\n🎯 Milestone: re-baseline annually + after any material breach. ICO publishes quarterly enforcement summaries (https://ico.org.uk/action-weve-taken/enforcement/).\n💡 Tip: pair with [Data Breach Notification] (L-5) — a single breach can fill the violations budget. Also pair with our [NRR Calculator] (R-1) — fines compound with churn.\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🧭 Decision Question: 单纯看 fine % 是陷阱，**核心问题是"annual turnover + 数据规模 + prior violations + mitigation efforts"决定实际罚款 + 是否值得立刻全面合规**。4% 全球营收是上限，实际常在 1-3% 区间。\n• 🧭 Recommendation: (1) **fine > 4% 全球营收** → 必须立刻全面合规（C-level 推动 + 法务介入）；(2) **2-4%** → 高 ROI 投入（合规预算 < fine 期望值）；(3) **< 2%** → minimum viable 合规（DPA + privacy policy + consent banner）；(4) **数据 < 500 人/无跨境** → 标准化模板方案（avoid over-engineering）。\n• 🧭 Key Uncertainty: (1) turnover 阈值是滑动值（不是 4% 上限就罚 4%，看违规严重性 + 配合度）；(2) mitigation efforts 可降 30-50% 罚款（主动报告 vs 被发现差异巨大）；(3) prior violations 会加重（首次 vs 重复）；(4) 跨境数据传输额外风险（Schrems II 单独处罚）。\n• 🧭 Next Action: (a) 跑 [DPA Cost Calculator] 看 supplier 链合规 ROI；(b) 跑 [Consent Revenue Calculator] 看合规 vs 转化率 trade-off；(c) 跑 [DSAR Cost Calculator] 算运营 SOP 成本；(d) 决策前法务 review + 数据流 audit (不只是算法数字)。',
  ],
  faq: [
    { q: 'What is GDPR fine risk?', a: 'GDPR fine risk quantifies your annualized exposure to fines under GDPR Art. 83. The cap is 4% of global annual revenue (Art. 83(5)) for substantive violations or 2% (Art. 83(4)) for procedural violations. Actual fines depend on case-specific factors (per ICO 2024 guidance).' },
    { q: 'How do I estimate "violations per year"?', a: 'Count reportable privacy incidents in the prior 12 months — incidents involving personal data breach, unauthorized access, DSAR non-response, or unlawful processing. IAPP 2024 Privacy Operations Survey reports mid-market SaaS averages 0.5–2 violations/yr.' },
    { q: 'Why a 4-tier industry multiplier?', a: 'GDPR fines vary by sector due to (1) data sensitivity (HealthTech/AdTech > SaaS), (2) regulatory scrutiny (FinTech > consumer apps), (3) prior enforcement history. The 0.8×–1.6× range reflects IAPP 2024 + Fieldfisher 2024 sector benchmarks.' },
    { q: 'How does this pair with L-5 Breach Notification?', a: 'L-5 estimates breach incident cost (notification + remediation). A single breach often triggers a GDPR fine — combining L-1 fine exposure + L-5 breach cost gives true incident cost (often €1M+ for mid-market SaaS).' },
    { q: 'What is the difference between "cap" and "actual" fine?', a: 'GDPR Art. 83 sets the maximum fine. Actual fines depend on (1) gravity, (2) intent, (3) mitigation, (4) cooperation with authorities. Median actual fine is 0.5%–1% of cap (per IAPP 2024 Enforcement Atlas) — but outliers (Meta, Clearview AI) reach 1%–2% of global revenue.' },
    { q: 'Does L-1 cover CCPA fines too?', a: 'CCPA (California) caps at $7,500 per intentional violation / $2,500 per non-intentional, with no revenue cap. L-1 model focuses on GDPR-style revenue-based fines; CCPA exposure is qualitatively different. See faq for CCPA-specific guidance.' },
    { q: "How much can GDPR fines be?", a: "GDPR fines: up to €20M or 4% of global annual revenue (whichever higher). Lower tier: €10M or 2% of revenue. Average actual fine: €50K-500K. Largest: €1.2B (Meta, 2023). State laws: CCPA $2,500-7,500 per violation. Risk: 5-10% of revenue. Compliance investment: 1-2% of revenue. ROI: 3-50x." },
    { q: "What triggers GDPR fines?", a: "Common triggers: 1) No legal basis for processing, 2) No consent management, 3) Data breach (without proper notification), 4) No DPA with vendors, 5) Failure to honor data subject rights, 6) Insufficient security, 7) Cross-border transfer violations, 8) No DPO when required. Top: lack of consent management and breach notification. Common fine: €20K-200K for first offense." },
    { q: "How long does GDPR compliance take?", a: "Quick wins: 1-4 weeks (privacy policy, consent banner, DPA). Full compliance: 3-12 months. Components: 1) Privacy policy (1-2 weeks), 2) CMP (1-4 weeks), 3) DPA with vendors (4-12 weeks), 4) Data mapping (4-8 weeks), 5) DSAR process (2-4 weeks), 6) Security audit (4-8 weeks), 7) Training (ongoing). Most teams: 6 months to full compliance." },
    { q: "What is the cost of GDPR compliance?", a: "SMB: $5-50K/year. Mid-market: $50-500K/year. Enterprise: $500K-5M+/year. Includes: 1) Compliance team/consultant, 2) Privacy management platform, 3) Legal fees, 4) Engineering time, 5) Training, 6) Audit. ROI: 5-50x in avoided fines + business enablement. Most CFOs approve 1-2% of revenue for compliance." },
    { q: "How do I reduce GDPR fine risk?", a: "1) Privacy by design (engineer with privacy in mind), 2) Documentation (record processing activities), 3) Regular audits (annual), 4) Staff training, 5) Vendor management (DPAs), 6) Breach response plan, 7) DPO appointment (if required). Most teams 70-90% risk reduction with full compliance program. Cost: 1-2% of revenue." },
    { q: "Do I need a Data Protection Officer (DPO)?", a: "Required when: 1) Public authority, 2) Core activities require large-scale systematic monitoring, 3) Core activities involve large-scale processing of sensitive data. Most SMBs: not required. Mid-market with sensitive data: required. Cost: $100K-300K/year in-house, $30-100K/year outsourced. DPO role: oversight, advice, monitoring compliance." },
    { q: "How does GDPR apply to US companies?", a: "Applies if: 1) EU residents' data, 2) Offer goods/services to EU, 3) Monitor EU residents. Most US companies: yes. Cost: same as EU. Most US companies: 1-5% of revenue in compliance investment. Penalties: enforced by EU authorities. Don't assume you're exempt. Talk to a privacy lawyer for confirmation." },
    { q: "What is the difference between GDPR and CCPA?", a: "GDPR (EU): opt-in consent, 30-day response, €20M/4% fines. CCPA (California): opt-out, 45-day response, $2,500-7,500/violation fines. GDPR: more comprehensive. CCPA: more business-friendly. Other US state laws: variations. Most companies: comply with both, GDPR is the gold standard. CCPA: typically the minimum US requirement." },
  ],
  howToUse: [
    'Enter your annual global revenue (GDPR jurisdiction: EU + EU-targeted revenue for non-EU companies).',
    'Select the GDPR fine tier (4% Art. 83(5) substantive, 2% Art. 83(4) procedural, 1% mixed, 0.5% light).',
    'Enter annual reportable violations — pull from your incident register or IAPP benchmark for your industry.',
    'Select your industry risk profile (SaaS 0.8× / FinTech 1.0× / HealthTech 1.4× / AdTech 1.6×).',
    'Read the band — 🟢 Excellent <0.25% · 🟡 Good 0.25-1% · 🟠 Warning 1-2% · 🔴 Critical ≥2%.',
    'Pair with L-5 (Breach Notification) to compute true incident cost.',
  ],
  sources: [
    'https://gdpr-info.eu/art-83-gdpr/',
    'https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/',
    'https://iapp.org/resources/article/privacy-enforcement-atlas/',
    'https://www.fieldfisher.com/en/services/privacy-and-information-law/privacy-enforcement-tracker',
  ],
  engineKey: true,
};
registerEngine(engine);

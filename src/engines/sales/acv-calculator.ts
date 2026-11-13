import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
import { BAND_META } from '../../core/engines/band-meta';
// P168 B3-7：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置同一份实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端逐字节相同，不可能漂。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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

// ============== P168 B3-7：兜底文案常量（服务端 / 客户端**共用同一份**）==============
// ⭐ 为什么抽成常量：兜底文本必须**逐字节相同**（服务端 makeToken / 客户端 tk）
//   ⇒ 同一份常量插进两端 ⇒ 不可能漂。
// ⚠️ locale.en 的对应模板必须与这些常量**逐字相同**（否则兜底与模板分叉 ⇒ 英文页变字）。
const HEALTH_BAND_TEXT = {
  excellent: 'Excellent — ACV ≥ $50,000/year; enterprise-grade contracts',
  good: 'Good — ACV $10,000–$50,000/year; mid-market sweet spot',
  warning: 'Warning — ACV $2,000–$10,000/year; SMB pricing tier',
  critical: 'Critical — ACV < $2,000/year; micro-transaction, focus on upsell',
} as const;

const NEXT_TIER_TEXT = {
  warning: '🟠 Warning ($2,000)',
  good: '🟡 Good ($10,000)',
  excellent: '🟢 Excellent ($50,000)',
  top: 'top tier maintained',
} as const;

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const totalContractValue = clampNonNegative(parseFloat(inputs.totalContractValue) || 0);
  const contractLength = Math.max(1, parseFloat(inputs.contractLength) || 1);
  const numCustomers = Math.max(1, parseFloat(inputs.numCustomers) || 1);
  const expansionRate = clampNonNegative(parseFloat(inputs.expansionRate) || 0);

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
  const healthEmoji = BAND_META[band];
  // P168 B3-7：Health 档位文案 → **语义码**（4 档都是字面量 code ⇒ 静态守卫认得出）
  //   ⚠️ 兜底 = 英文原文**逐字相同** ⇒ 英文页一个字都不变。
  const healthLabel =
    band === 'excellent'
      ? makeToken('calc_out.acv.row.health_excellent', HEALTH_BAND_TEXT.excellent)
      : band === 'good'
      ? makeToken('calc_out.acv.row.health_good', HEALTH_BAND_TEXT.good)
      : band === 'warning'
      ? makeToken('calc_out.acv.row.health_warning', HEALTH_BAND_TEXT.warning)
      : makeToken('calc_out.acv.row.health_critical', HEALTH_BAND_TEXT.critical);

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
  // Path B: shrink customer base (fewer, higher-value customers) — each customer must be worth ≥ $50K.
  // Use Math.floor so "N or fewer customers" guarantees per-cust ≥ $50K (with Math.ceil, partial
  // remainders made the effective per-cust < $50K and the band stayed 🟡 not 🟢).
  const numCustForExcellent = totalContractValue > 0 ? Math.floor(totalContractValue / targetAnnual) : 0;
  const fewerCustNeeded = Math.max(0, numCustomers - numCustForExcellent);

  // Milestone: gap from the SAME base the Health band uses (annual, unexpanded) to the next tier
  // threshold. Previously used `expanded`, which made gap dip to $0 or negative when band was 🟠/🟡
  // (expanded already crossed the next threshold but unexpanded hadn't).
  let gapToNext: number;
  let nextTier: string;
  if (band === 'critical') {
    gapToNext = 2000 - annual;
    nextTier = makeToken('calc_out.acv.row.next_tier_warning', NEXT_TIER_TEXT.warning);
  } else if (band === 'warning') {
    gapToNext = 10000 - annual;
    nextTier = makeToken('calc_out.acv.row.next_tier_good', NEXT_TIER_TEXT.good);
  } else if (band === 'good') {
    gapToNext = 50000 - annual;
    nextTier = makeToken('calc_out.acv.row.next_tier_excellent', NEXT_TIER_TEXT.excellent);
  } else {
    gapToNext = 0;
    nextTier = makeToken('calc_out.acv.row.top_tier_maintained', NEXT_TIER_TEXT.top);
  }

  // P168 B3-4：💡 Tip 改成**语义码**（分支条件 = 上面 Health 那套 band，
  //   不引入第二套阈值）⇒ 模板在 locale 的 decision_tip.<code> 里，动态层随输入变。
  // P168 B3-4：💡 Tip 改成**建议码**（语义码 + 参数）—— 英文句子搬进 locale，
  //   zh 页的动态层才会是中文（照 B3-3 已上线的形态 A）。
  //   ⚠️ **分支条件与阈值一个都不改**（分支 = 上面 Health 那套 band）。
  //   ⚠️ customFn 里必须写**逐字相同**的一份（守卫「两套实现不许漂」守着这条）。
  let tip: string;
  if (band === 'critical') {
    tip = JSON.stringify({
      code: 'acv_micro_transaction',
      params: { acv: money(annual), monthly: moneyExact(monthlyDisplay), expanded: money(expanded) },
    });
  } else if (band === 'warning') {
    tip = JSON.stringify({
      code: 'acv_smb_tier',
      params: { acv: money(annual), monthly: moneyExact(monthlyDisplay), expanded: money(expanded) },
    });
  } else if (band === 'good') {
    tip = JSON.stringify({
      code: 'acv_mid_market',
      params: { acv: money(annual), monthly: moneyExact(monthlyDisplay), expanded: money(expanded) },
    });
  } else {
    tip = JSON.stringify({
      code: 'acv_enterprise_grade',
      params: { acv: money(annual), monthly: moneyExact(monthlyDisplay), expanded: money(expanded) },
    });
  }

  // P168 B3-7：**整行 token**（一行一个语义码；数值走 params ⇒ 中文模板自己拼）
  //   ⚠️ 兜底与 params 取**同一个变量** ⇒ 英文兜底与中文模板不可能漂。
  //   ⚠️ code 必须是**字面量**（静态守卫只认字面量）⇒ 不许拼接。
  const tkHealthAcvSummary = makeToken(
    'calc_out.acv.row.health_acv_summary',
    'Base ACV: ' + money(base) + '  ·  Monthly: ' + moneyExact(monthlyDisplay) + '/month  ·  Annual: ' + money(annual) + '/year',
    { base: money(base), monthly: moneyExact(monthlyDisplay), annual: money(annual) },
  );
  const tkExpansionAdjusted = makeToken(
    'calc_out.acv.row.expansion_adjusted',
    'Expansion-adjusted (' + expansionRate + '%): ' + money(expanded) + '/year',
    { rate: String(expansionRate), expanded: money(expanded) },
  );
  const tkFormula = makeToken(
    'calc_out.acv.row.formula',
    'Formula: ' + money(totalContractValue) + ' ÷ ' + numCustomers + ' customers ÷ ' + contractLength + ' months × 12 × (1 + ' + expansionRate + '%) = ' + money(expanded) + '/year',
    { tcv: money(totalContractValue), cust: String(numCustomers), months: String(contractLength), rate: String(expansionRate), expanded: money(expanded) },
  );
  const tkContractLength = makeToken(
    'calc_out.acv.row.contract_length',
    'Contract length: ' + contractLength + ' months',
    { months: String(contractLength) },
  );
  const tkInputsAcvSummary = makeToken(
    'calc_out.acv.row.inputs_acv_summary',
    'Base ACV: ' + money(base) + '  ·  Monthly: ' + moneyExact(monthlyDisplay) + '  ·  Annual: ' + money(annual) + '  ·  Expansion-adjusted: ' + money(expanded),
    { base: money(base), monthly: moneyExact(monthlyDisplay), annual: money(annual), expanded: money(expanded) },
  );
  const tkWhatifExpansion = makeToken(
    'calc_out.acv.row.whatif_expansion_rate_20',
    'Expansion rate ' + expansionRate + '%→20%: ' + money(expanded20) + '/year (' + (expanded20LiftPct >= 0 ? '+' : '') + expanded20LiftPct.toFixed(1) + '% vs current expanded)',
    { rate: String(expansionRate), expanded20: money(expanded20), lift: (expanded20LiftPct >= 0 ? '+' : '') + expanded20LiftPct.toFixed(1) + '%' },
  );
  const tkWhatifContract = makeToken(
    'calc_out.acv.row.whatif_contract_length_24',
    'Contract length ' + contractLength + '→24 months: ' + money(annualAt24) + '/year base (' + (contractShiftPct >= 0 ? '+' : '') + contractShiftPct.toFixed(1) + '%)',
    { months: String(contractLength), annual24: money(annualAt24), shift: (contractShiftPct >= 0 ? '+' : '') + contractShiftPct.toFixed(1) },
  );
  const tkWhatifCustomers = makeToken(
    'calc_out.acv.row.whatif_customers_24',
    'Customers ' + numCustomers + '→24: ' + money(annualAt24Cust) + '/year base (' + (custShiftPct >= 0 ? '+' : '') + custShiftPct.toFixed(1) + '%)',
    { cust: String(numCustomers), annual24c: money(annualAt24Cust), shift: (custShiftPct >= 0 ? '+' : '') + custShiftPct.toFixed(1) },
  );
  const tkPathA = makeToken(
    'calc_out.acv.row.path_a_raise_contract_value',
    'Path A — raise total contract value by ' + money(totalCVLiftNeeded) + ' (same customers, larger deals)',
    { amount: money(totalCVLiftNeeded) },
  );
  const tkPathB = makeToken(
    'calc_out.acv.row.path_b_reduce_customers',
    'Path B — reduce to ~' + numCustForExcellent + ' or fewer customers (each ≥ $50K target; fewer, higher-value contracts)',
    { n: String(numCustForExcellent) },
  );
  const tkNote = makeToken(
    'calc_out.acv.row.note_more_customers_lower_acv',
    'Note: adding more customers at the same per-customer value reduces per-customer ACV',
  );
  const tkAtCurrentPace = makeToken(
    'calc_out.acv.row.at_current_pace',
    'At current pace: ~' + money(expanded) + '/year per-customer revenue (with ' + expansionRate + '% expansion)',
    { expanded: money(expanded), rate: String(expansionRate) },
  );
  // 「(already at top)」/「(before expansion)」是**行尾补充** ⇒ 单独一个行码（前导空格留在 token 之外）
  const tkGapSuffix =
    band === 'excellent'
      ? makeToken('calc_out.acv.row.gap_already_at_top', '(already at top)')
      : makeToken('calc_out.acv.row.gap_before_expansion', '(before expansion)');

  // P168 B3-7：**共享 section / label 键**（跨工具共享 ⇒ 只包标签文本，冒号与对齐空格留在 token 之外）
  const tkTitle = makeToken('calc_out.section.acv_calculator', '🚀 ACV Calculator');
  const tkHealthSection = makeToken('calc_out.section.health', '🩺 Health:');
  const tkInputsSection = makeToken('calc_out.section.inputs_snapshot', '📊 Inputs Snapshot:');
  const tkWhatIfSection = makeToken('calc_out.section.what_if', '🔄 What-If:');
  const tkBreakEvenSection = makeToken('calc_out.section.break_even', '⚖️ Break-Even:');
  const tkMilestoneSection = makeToken('calc_out.section.milestone', '🎯 Milestone:');
  const tkLabelTotalContractValue = makeToken('calc_out.label.total_contract_value', 'Total contract value');
  const tkLabelNumberOfCustomers = makeToken('calc_out.label.number_of_customers', 'Number of customers');
  const tkLabelAnnualExpansionRate = makeToken('calc_out.label.annual_expansion_rate', 'Annual expansion rate');
  const tkLabelTargetForExcellent = makeToken('calc_out.label.target_for_excellent', 'Target for 🟢 Excellent');
  const tkLabelGapToExcellent = makeToken('calc_out.label.gap_to_excellent', 'Gap to 🟢');
  const tkLabelNextTier = makeToken('calc_out.label.next_tier', 'Next tier');
  const tkLabelGapToNextTier = makeToken('calc_out.label.gap_to_next_tier', 'Gap to next tier');

  let r =
    tkTitle + '\n\n' +
    tkHealthSection + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• ' + tkHealthAcvSummary + '\n' +
    '• ' + tkExpansionAdjusted + '\n' +
    '• ' + tkFormula + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tkInputsSection + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + tkLabelTotalContractValue + ': ' + money(totalContractValue) + '\n' +
    '• ' + tkContractLength + '\n' +
    '• ' + tkLabelNumberOfCustomers + ': ' + numCustomers + '\n' +
    '• ' + tkLabelAnnualExpansionRate + ': ' + expansionRate + '%\n' +
    '• ' + tkInputsAcvSummary + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tkWhatIfSection + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + tkWhatifExpansion + '\n' +
    '• ' + tkWhatifContract + '\n' +
    '• ' + tkWhatifCustomers + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tkBreakEvenSection + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + tkLabelTargetForExcellent + ': ' + money(targetAnnual) + '/year ACV\n' +
    '• ' + tkLabelGapToExcellent + ': ' + money(gapToExcellent) + '/year\n' +
    '• ' + tkPathA + '\n' +
    '• ' + tkPathB + '\n' +
    '• ' + tkNote + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tkMilestoneSection + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + tkLabelNextTier + ': ' + nextTier + '\n' +
    '• ' + tkLabelGapToNextTier + ': ' + money(Math.max(0, gapToNext)) + ' ' + tkGapSuffix + '\n' +
    '• ' + tkAtCurrentPace + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  // P168 B3-4：**🧭 四段已迁到页面的「🧭 算完之后」区块**
  //   （src/i18n/locales/{en,zh}.json 的 tools.<slug>.decision_goal /
  //     decision_recommendation / decision_constraint / decision_next_tool，双语）
  //   ⇒ 引擎只负责算；**决策支持由区块独占** ⇒ 同页不再有两份决策建议。
  //   ⚠️ 引擎里**不要**再写这段：区块与卡片会同时渲染同一件事。

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  // P168 B3-7：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 两端输出逐字节相同，不可能漂；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS +
  "function bACV(t,n){if(n<=0)return 0;return t/n;}" +
  "function mACV(b,l){if(l<=0)return 0;return b/l;}" +
  "function aACV(m){return Math.round(m*12);}" +
  "function eACV(a,r){return a*(100+r)/100;}" +
  "function band(v){if(v>=50000)return 'excellent';if(v>=10000)return 'good';if(v>=2000)return 'warning';return 'critical';}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var tcv=cnn(parseFloat(inputs.totalContractValue)||0);" +
  "var cl=Math.max(1,parseFloat(inputs.contractLength)||1);" +
  "var nc=Math.max(1,parseFloat(inputs.numCustomers)||1);" +
  "var er=cnn(parseFloat(inputs.expansionRate)||0);" +
  "var base=bACV(tcv,nc);" +
  "var moRaw=mACV(base,cl);" +
  "var moDisp=Math.round(moRaw*100)/100;" +
  "var annual=aACV(moRaw);" +
  "var expd=eACV(annual,er);" +
  "function money(n){return '$'+Math.round(n).toLocaleString('en-US');}" +
  "function moneyExact(n){return '$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}" +
  "var bd=band(annual);" +
  "var he=bd==='excellent'?'\\uD83D\\uDFE2':bd==='good'?'\\uD83D\\uDFE1':bd==='warning'?'\\uD83D\\uDFE0':'\\uD83D\\uDD34';" +
  "var hl=bd==='excellent'?tk('calc_out.acv.row.health_excellent','" + HEALTH_BAND_TEXT.excellent + "'):bd==='good'?tk('calc_out.acv.row.health_good','" + HEALTH_BAND_TEXT.good + "'):bd==='warning'?tk('calc_out.acv.row.health_warning','" + HEALTH_BAND_TEXT.warning + "'):tk('calc_out.acv.row.health_critical','" + HEALTH_BAND_TEXT.critical + "');" +
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
  "var ncForExc=tcv>0?Math.floor(tcv/tgt):0;" +
  "var fcNeed=Math.max(0,nc-ncForExc);" +
  "var gn,nt;" +
  "if(bd==='critical'){gn=2000-annual;nt=tk('calc_out.acv.row.next_tier_warning','" + NEXT_TIER_TEXT.warning + "');}" +
  "else if(bd==='warning'){gn=10000-annual;nt=tk('calc_out.acv.row.next_tier_good','" + NEXT_TIER_TEXT.good + "');}" +
  "else if(bd==='good'){gn=50000-annual;nt=tk('calc_out.acv.row.next_tier_excellent','" + NEXT_TIER_TEXT.excellent + "');}" +
  "else{gn=0;nt=tk('calc_out.acv.row.top_tier_maintained','" + NEXT_TIER_TEXT.top + "');}" +
  "var tip='';" +
  "if(bd==='critical'){tip=JSON.stringify({code:'acv_micro_transaction',params:{acv:money(annual),monthly:moneyExact(moDisp),expanded:money(expd)}});}" +
  "else if(bd==='warning'){tip=JSON.stringify({code:'acv_smb_tier',params:{acv:money(annual),monthly:moneyExact(moDisp),expanded:money(expd)}});}" +
  "else if(bd==='good'){tip=JSON.stringify({code:'acv_mid_market',params:{acv:money(annual),monthly:moneyExact(moDisp),expanded:money(expd)}});}" +
  "else{tip=JSON.stringify({code:'acv_enterprise_grade',params:{acv:money(annual),monthly:moneyExact(moDisp),expanded:money(expd)}});}" +
  // P168 B3-7：params 表达式用**服务端同名变量**（客户端变量是短名 ⇒ 这里做别名）
  "var totalContractValue=tcv;var contractLength=cl;var numCustomers=nc;var expansionRate=er;" +
  "var monthlyDisplay=moDisp;var expanded=expd;var expanded20=exp20;var expanded20LiftPct=exp20pct;" +
  "var annualAt24=ann24;var contractShiftPct=csPct;var annualAt24Cust=ann24c;var custShiftPct=custPct;" +
  "var targetAnnual=tgt;var gapToExcellent=gap;var totalCVLiftNeeded=tcvLift;var numCustForExcellent=ncForExc;" +
  "var gapToNext=gn;var nextTier=nt;" +
  "var tkHealthAcvSummary=tk('calc_out.acv.row.health_acv_summary','Base ACV: '+money(base)+'  \\u00B7  Monthly: '+moneyExact(monthlyDisplay)+'/month  \\u00B7  Annual: '+money(annual)+'/year',{base:money(base),monthly:moneyExact(monthlyDisplay),annual:money(annual)});" +
  "var tkExpansionAdjusted=tk('calc_out.acv.row.expansion_adjusted','Expansion-adjusted ('+expansionRate+'%): '+money(expanded)+'/year',{rate:String(expansionRate),expanded:money(expanded)});" +
  "var tkFormula=tk('calc_out.acv.row.formula','Formula: '+money(totalContractValue)+' \\u00F7 '+numCustomers+' customers \\u00F7 '+contractLength+' months \\u00D7 12 \\u00D7 (1 + '+expansionRate+'%) = '+money(expanded)+'/year',{tcv:money(totalContractValue),cust:String(numCustomers),months:String(contractLength),rate:String(expansionRate),expanded:money(expanded)});" +
  "var tkContractLength=tk('calc_out.acv.row.contract_length','Contract length: '+contractLength+' months',{months:String(contractLength)});" +
  "var tkInputsAcvSummary=tk('calc_out.acv.row.inputs_acv_summary','Base ACV: '+money(base)+'  \\u00B7  Monthly: '+moneyExact(monthlyDisplay)+'  \\u00B7  Annual: '+money(annual)+'  \\u00B7  Expansion-adjusted: '+money(expanded),{base:money(base),monthly:moneyExact(monthlyDisplay),annual:money(annual),expanded:money(expanded)});" +
  "var tkWhatifExpansion=tk('calc_out.acv.row.whatif_expansion_rate_20','Expansion rate '+expansionRate+'%\\u219220%: '+money(expanded20)+'/year ('+(expanded20LiftPct>=0?'+':'')+expanded20LiftPct.toFixed(1)+'% vs current expanded)',{rate:String(expansionRate),expanded20:money(expanded20),lift:(expanded20LiftPct>=0?'+':'')+expanded20LiftPct.toFixed(1)+'%'});" +
  "var tkWhatifContract=tk('calc_out.acv.row.whatif_contract_length_24','Contract length '+contractLength+'\\u219224 months: '+money(annualAt24)+'/year base ('+(contractShiftPct>=0?'+':'')+contractShiftPct.toFixed(1)+'%)',{months:String(contractLength),annual24:money(annualAt24),shift:(contractShiftPct>=0?'+':'')+contractShiftPct.toFixed(1)});" +
  "var tkWhatifCustomers=tk('calc_out.acv.row.whatif_customers_24','Customers '+numCustomers+'\\u219224: '+money(annualAt24Cust)+'/year base ('+(custShiftPct>=0?'+':'')+custShiftPct.toFixed(1)+'%)',{cust:String(numCustomers),annual24c:money(annualAt24Cust),shift:(custShiftPct>=0?'+':'')+custShiftPct.toFixed(1)});" +
  "var tkPathA=tk('calc_out.acv.row.path_a_raise_contract_value','Path A \\u2014 raise total contract value by '+money(totalCVLiftNeeded)+' (same customers, larger deals)',{amount:money(totalCVLiftNeeded)});" +
  "var tkPathB=tk('calc_out.acv.row.path_b_reduce_customers','Path B \\u2014 reduce to ~'+numCustForExcellent+' or fewer customers (each \\u2265 $50K target; fewer, higher-value contracts)',{n:String(numCustForExcellent)});" +
  "var tkNote=tk('calc_out.acv.row.note_more_customers_lower_acv','Note: adding more customers at the same per-customer value reduces per-customer ACV');" +
  "var tkAtCurrentPace=tk('calc_out.acv.row.at_current_pace','At current pace: ~'+money(expanded)+'/year per-customer revenue (with '+expansionRate+'% expansion)',{expanded:money(expanded),rate:String(expansionRate)});" +
  "var tkGapSuffix=bd==='excellent'?tk('calc_out.acv.row.gap_already_at_top','(already at top)'):tk('calc_out.acv.row.gap_before_expansion','(before expansion)');" +
  "var tkTitle=tk('calc_out.section.acv_calculator','\\uD83D\\uDE80 ACV Calculator');" +
  "var tkHealthSection=tk('calc_out.section.health','\\uD83E\\uDE7A Health:');" +
  "var tkInputsSection=tk('calc_out.section.inputs_snapshot','\\uD83D\\uDCCA Inputs Snapshot:');" +
  "var tkWhatIfSection=tk('calc_out.section.what_if','\\uD83D\\uDD04 What-If:');" +
  "var tkBreakEvenSection=tk('calc_out.section.break_even','\\u2696\\uFE0F Break-Even:');" +
  "var tkMilestoneSection=tk('calc_out.section.milestone','\\uD83C\\uDFAF Milestone:');" +
  "var tkLabelTotalContractValue=tk('calc_out.label.total_contract_value','Total contract value');" +
  "var tkLabelNumberOfCustomers=tk('calc_out.label.number_of_customers','Number of customers');" +
  "var tkLabelAnnualExpansionRate=tk('calc_out.label.annual_expansion_rate','Annual expansion rate');" +
  "var tkLabelTargetForExcellent=tk('calc_out.label.target_for_excellent','Target for \\uD83D\\uDFE2 Excellent');" +
  "var tkLabelGapToExcellent=tk('calc_out.label.gap_to_excellent','Gap to \\uD83D\\uDFE2');" +
  "var tkLabelNextTier=tk('calc_out.label.next_tier','Next tier');" +
  "var tkLabelGapToNextTier=tk('calc_out.label.gap_to_next_tier','Gap to next tier');" +
  "var r2='';" +
  "r2+=tkTitle+'\\n\\n';" +
  "r2+=tkHealthSection+'\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+he+' '+hl+'\\n';" +
  "r2+='\\u2022 '+tkHealthAcvSummary+'\\n';" +
  "r2+='\\u2022 '+tkExpansionAdjusted+'\\n';" +
  "r2+='\\u2022 '+tkFormula+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tkInputsSection+'\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+tkLabelTotalContractValue+': '+money(totalContractValue)+'\\n';" +
  "r2+='\\u2022 '+tkContractLength+'\\n';" +
  "r2+='\\u2022 '+tkLabelNumberOfCustomers+': '+numCustomers+'\\n';" +
  "r2+='\\u2022 '+tkLabelAnnualExpansionRate+': '+expansionRate+'%\\n';" +
  "r2+='\\u2022 '+tkInputsAcvSummary+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tkWhatIfSection+'\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+tkWhatifExpansion+'\\n';" +
  "r2+='\\u2022 '+tkWhatifContract+'\\n';" +
  "r2+='\\u2022 '+tkWhatifCustomers+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tkBreakEvenSection+'\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+tkLabelTargetForExcellent+': '+money(targetAnnual)+'/year ACV\\n';" +
  "r2+='\\u2022 '+tkLabelGapToExcellent+': '+money(gapToExcellent)+'/year\\n';" +
  "r2+='\\u2022 '+tkPathA+'\\n';" +
  "r2+='\\u2022 '+tkPathB+'\\n';" +
  "r2+='\\u2022 '+tkNote+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tkMilestoneSection+'\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+tkLabelNextTier+': '+nextTier+'\\n';" +
  "r2+='\\u2022 '+tkLabelGapToNextTier+': '+money(Math.max(0,gapToNext))+' '+tkGapSuffix+'\\n';" +
  "r2+='\\u2022 '+tkAtCurrentPace+'\\n\\n';" +
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
  // P140f-p3-T7: minimal Playbook 6 字段 template (Goal=该不该决策)
  // Goal 含"决策"+"该不该"双关键词 → 通过 T1 zod refine 校验
  playbook: {
    goal: '用户该不该用这个 ACV 去做容量与定价决策，还是先把客户结构拆开看',
    input: 'engine 定义的 inputs 字段',
    output: 'engine 定义的 generate() 返回数组',
    constraint: 'apply 引擎 inputs 时受实际场景约束',
    tool: '页面的「🧭 算完之后」决策区块（决策支持已由区块独占）',
    memory: 'v2.0 11 business domain benchmark + P140f Phase 4 主题簇',
  },
  generate: calculate,
  staticExamples: [
    '$calc_out.section.acv_calculator|🚀 ACV Calculator|\n\n$calc_out.section.health|🩺 Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 $calc_out.acv.row.health_good|Good — ACV $10,000–$50,000/year; mid-market sweet spot|\n• $calc_out.acv.row.health_acv_summary{"base":"$25,000","monthly":"$2,083.33","annual":"$25,000"}|Base ACV: $25,000  ·  Monthly: $2,083.33/month  ·  Annual: $25,000/year|\n• $calc_out.acv.row.expansion_adjusted{"rate":"10","expanded":"$27,500"}|Expansion-adjusted (10%): $27,500/year|\n• $calc_out.acv.row.formula{"tcv":"$300,000","cust":"12","months":"12","rate":"10","expanded":"$27,500"}|Formula: $300,000 ÷ 12 customers ÷ 12 months × 12 × (1 + 10%) = $27,500/year|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.total_contract_value|Total contract value|: $300,000\n• $calc_out.acv.row.contract_length{"months":"12"}|Contract length: 12 months|\n• $calc_out.label.number_of_customers|Number of customers|: 12\n• $calc_out.label.annual_expansion_rate|Annual expansion rate|: 10%\n• $calc_out.acv.row.inputs_acv_summary{"base":"$25,000","monthly":"$2,083.33","annual":"$25,000","expanded":"$27,500"}|Base ACV: $25,000  ·  Monthly: $2,083.33  ·  Annual: $25,000  ·  Expansion-adjusted: $27,500|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if|🔄 What-If:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.acv.row.whatif_expansion_rate_20{"rate":"10","expanded20":"$30,000","lift":"+9.1%"}|Expansion rate 10%→20%: $30,000/year (+9.1% vs current expanded)|\n• $calc_out.acv.row.whatif_contract_length_24{"months":"12","annual24":"$12,500","shift":"-50.0"}|Contract length 12→24 months: $12,500/year base (-50.0%)|\n• $calc_out.acv.row.whatif_customers_24{"cust":"12","annual24c":"$12,500","shift":"-50.0"}|Customers 12→24: $12,500/year base (-50.0%)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.break_even|⚖️ Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.target_for_excellent|Target for 🟢 Excellent|: $50,000/year ACV\n• $calc_out.label.gap_to_excellent|Gap to 🟢|: $25,000/year\n• $calc_out.acv.row.path_a_raise_contract_value{"amount":"$300,000"}|Path A — raise total contract value by $300,000 (same customers, larger deals)|\n• $calc_out.acv.row.path_b_reduce_customers{"n":"6"}|Path B — reduce to ~6 or fewer customers (each ≥ $50K target; fewer, higher-value contracts)|\n• $calc_out.acv.row.note_more_customers_lower_acv|Note: adding more customers at the same per-customer value reduces per-customer ACV|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.milestone|🎯 Milestone:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.next_tier|Next tier|: $calc_out.acv.row.next_tier_excellent|🟢 Excellent ($50,000)|\n• $calc_out.label.gap_to_next_tier|Gap to next tier|: $25,000 $calc_out.acv.row.gap_before_expansion|(before expansion)|\n• $calc_out.acv.row.at_current_pace{"expanded":"$27,500","rate":"10"}|At current pace: ~$27,500/year per-customer revenue (with 10% expansion)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: {"code":"acv_mid_market","params":{"acv":"$25,000","monthly":"$2,083.33","expanded":"$27,500"}}\n',
  ],
  faq: [
    { q: 'What is ACV (Average Contract Value)?', a: 'ACV is the average annualized revenue per customer contract. It is computed as total contract value divided by contract length (annualized), or equivalently total revenue divided by customer count for a given period. ACV is the fundamental SaaS pricing metric — it tells you how much each customer is worth on a per-year basis, separate from new vs expansion revenue.' },
    { q: 'What is the difference between ACV and ARR?', a: 'ARR (Annual Recurring Revenue) is the total annualized recurring revenue across all customers. ACV is the per-customer average. ARR = ACV × number of customers (approximately). Both metrics matter: ARR measures total business scale; ACV measures pricing power and customer segment mix.' },
    { q: 'What is a good ACV for SaaS?', a: 'ACV bands: < $2K/year is micro-transaction / prosumer SMB. $2K-$10K is SMB pricing tier. $10K-$50K is mid-market sweet spot (the most common SaaS band). $50K+ is enterprise-grade. Most B2B SaaS companies target $10K-$50K ACV for product-led growth to sales-assisted handoff; below $10K typically relies on self-serve or low-touch sales.' },
    { q: 'How does expansion rate affect ACV?', a: 'Expansion rate is the percentage of existing customer revenue that grows year-over-year via upsell, cross-sell, or seat expansion. A 10% expansion rate means a $25K ACV customer becomes $27,500 next year without any new logo. Net Revenue Retention above 100% requires expansion to exceed churn.' },
    { q: 'How does this differ from sales velocity (P8-2)?', a: 'Sales velocity measures how fast your pipeline generates revenue (throughput). ACV measures how much each customer is worth (deal size). Velocity = (opportunities × ACV × win rate) ÷ cycle days. Use ACV for pricing tier decisions, velocity for sales productivity optimization.' },
    { q: "What is ACV (Annual Contract Value)?", a: "ACV = total contract value / contract length (in years). For $30K over 3 years: $10K ACV. Or: $30K/year for 1 year = $30K ACV. ACV excludes one-time fees (TCV includes). Used for: 1) Sales efficiency, 2) Sales cycle length, 3) Rep productivity. Benchmarks: SMB $5-15K, mid-market $30-100K, enterprise $100K+. Most: track ACV by segment, source, rep." },

    { q: "How do I increase ACV?", a: "1) Tiered pricing (anchor high), 2) Annual prepay discount (locks in higher value), 3) Add-ons (premium features, services), 4) Multi-year deals (15-20% off), 5) Bundling related products, 6) Usage-based add-ons. 10-30% ACV lift in 12 months. Best option: tiered pricing + annual prepay. Avoid just raising prices (loses deals). 5-10% price increase = 2-5% close rate drop." },

    { q: "How is ACV related to sales cycle?", a: "Higher ACV: longer sales cycle. SMB ($5K): 1-2 weeks. Mid-market ($30K): 1-3 months. Enterprise ($100K+): 6-12 months. Formula: cycle_length_weeks = sqrt(ACV/1000) × 2. For $50K ACV: ~6-8 week cycle. Most: plan sales capacity by ACV. Reps: 1-3 deals/month for SMB, 0.5-1 for mid-market, 0.2-0.5 for enterprise. Lower ACV: more volume. Higher: more strategy." },
    { q: "What is the difference between ACV and TCV?", a: "ACV: annual contract value (per year). TCV: total contract value (full term). For 3-year, $30K/year deal: TCV $90K, ACV $30K. TCV: full deal size. ACV: normalized for comparison. For LTV calculations: use ACV (annual basis). For valuation: TCV. Most: track both. ACV for sales efficiency. TCV for forecasting. Pipeline: usually TCV. Renewals: ACV for comparison. Tools: CRM." },
    { q: "How do I calculate weighted ACV?", a: "Weighted ACV = sum(deal_value × close_probability) / count. For forecasting. Example: 3 deals: $30K (50% prob), $50K (30%), $100K (10%): weighted ACV = (15+15+10)/3 = $13.3K. Use: pipeline forecasting, quota planning. Tools: Salesforce, HubSpot. Most: track 3 pipelines (committed, best case, pipeline). Weighted ACV: predict actual ACV at close." },
    { q: "Should I focus on ACV or deal count?", a: "Depends on stage + model. Early: deal count (validate playbook). Growth: ACV (unit economics). Scale: both. ACV × deal count = revenue. Rep productivity: ACV per rep. Most: ACV × close rate = rep output. Aim: $1M per rep per year. For $30K ACV, 80% close: 42 deals per rep per year (1/week). High ACV: fewer deals, more strategy. Low ACV: more volume, more efficiency." },
    { q: 'Should I offer annual or monthly contracts, and does it affect ACV?', a: 'Annual prepay contracts typically lift reported ACV 15-20% even without a list-price increase because customers commit the full year upfront and skip partial-period credits. The trade-offs: longer sales cycles (decision-makers need approval for non-trivial spend), slower ramp in early traction, and customer-friendly cancellation friction can hurt net retention if churn rises when the autopay is finally challenged. A common pattern is annual by default with a 10-15% discount off monthly billing, and only monthly for the bottom tier where self-serve buyers expect no commitment. Watch the discount closely — anything beyond 20% on annual usually attracts price-sensitive customers who churn early.' },
  ],
  howToUse: [
    'Enter your total contract value across all customers for the period (sum of all signed contracts, ACV-friendly unit).',
    'Enter contract length in months (most SaaS is 12 months; multi-year contracts divide total CV by months).',
    'Enter number of customers (count of distinct signed contracts for the period).',
    'Enter annual expansion rate (%) — typical SaaS benchmark is 10-15% (above 20% is excellent).',
    'Read Base ACV (per-customer), Monthly (per-month per-customer), and Annual ACV. Use the health band to assess pricing tier.',
    'Pair with sales velocity (P8-2) to identify whether ACV growth opportunities exist alongside pipeline throughput improvements.',
  ],
  engineKey: true,
};
registerEngine(engine);
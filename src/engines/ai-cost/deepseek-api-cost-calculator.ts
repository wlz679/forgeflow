import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import PRICING from '../../data/ai-pricing.json';
import { pickInteractiveModels } from '../../data/ai-pricing-popular';
// P168 B3-10：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

interface ModelInfo {
  input: number;
  output: number;
  name: string;
  family: 'v4' | 'legacy';
  contextWindow: string;
  order: number;
}

// P156: build-time model set == the interactive set (5), matching the
// client-side customFn bundle. See src/data/ai-pricing-popular.ts.
const MODELS: Record<string, ModelInfo> = pickInteractiveModels(
  PRICING.llm.deepseek.models as any,
  'deepseek',
);

const FAMILY_ICONS: Record<string, string> = {
  v4: '◆',
  legacy: '◇',
};
const FAMILY_LABELS: Record<string, string> = {
  v4: 'V4 Series',
  legacy: 'Legacy',
};

// DeepSeek auto-cache read multiplier = 0.02x input (98% discount)
const CACHE_READ_MULT = 0.02;

const DEFAULT_SELECTED = ['deepseek-v4-flash', 'deepseek-v4-pro-promo', 'deepseek-r1'];

// Cross-provider comparison (cheapest from each)
const CROSS_PROVIDER: Record<string, { input: number; output: number; name: string }> = {
  openai: { input: 0.05, output: 0.4, name: 'GPT-5 Nano' },
  claude: { input: 0.25, output: 1.25, name: 'Claude Haiku 3' },
  gemini: { input: 0.075, output: 0.3, name: 'Gemini 1.5 Flash' },
};

const PRESETS: Record<string, Record<string, string>> = {
  'Light Usage': {
    inputTokens: '500', outputTokens: '1000', requestsPerDay: '50',
    cacheReadHitRate: '80', growthRate: '0', projectionMonths: '12',
  },
  'Mid-Scale': {
    inputTokens: '2000', outputTokens: '1000', requestsPerDay: '500',
    cacheReadHitRate: '60', growthRate: '0', projectionMonths: '12',
  },
  'High Volume': {
    inputTokens: '5000', outputTokens: '2000', requestsPerDay: '10000',
    cacheReadHitRate: '50', growthRate: '0', projectionMonths: '12',
  },
  'Heavy Cache': {
    inputTokens: '2000', outputTokens: '800', requestsPerDay: '5000',
    cacheReadHitRate: '95', growthRate: '0', projectionMonths: '12',
  },
  'Growing App': {
    inputTokens: '1000', outputTokens: '800', requestsPerDay: '200',
    cacheReadHitRate: '70', growthRate: '10', projectionMonths: '12',
  },
  'Enterprise': {
    inputTokens: '8000', outputTokens: '5000', requestsPerDay: '100000',
    cacheReadHitRate: '60', growthRate: '0', projectionMonths: '6',
  },
};

function fmt(n: number): string {
  if (Math.abs(n) < 0.01 && n !== 0) return '$' + n.toFixed(4);
  return '$' + n.toFixed(2);
}
function lc(n: number): string { return n.toLocaleString(); }
function pad(s: string, len: number): string {
  return s + ' '.repeat(Math.max(0, len - s.length));
}

function estimateTokens(text: string): { tokens: number; method: string } {
  if (!text.trim()) return { tokens: 0, method: 'empty' };
  const cjk = (text.match(/[一-鿿㐀-䶿]/g) || []).length;
  const words = text.split(/\s+/).length;
  if (cjk > text.length * 0.3) {
    return { tokens: Math.round(text.length / 0.65), method: 'CJK (0.65 chars/token)' };
  }
  return { tokens: Math.round(words * 1.3), method: 'English (1.3 words/token)' };
}

const SEP = '─';

function calculate(inputs: Record<string, string>): string[] {
  // --- Parse inputs ---
  const selectedKeys = [...new Set(
    (inputs.models || DEFAULT_SELECTED.join(','))
      .split(',').map(s => s.trim()).filter(Boolean),
  )];
  const inTokens = Math.max(1, Math.min(10_000_000, parseInt(inputs.inputTokens) || 1000));
  const outTokens = Math.max(1, Math.min(10_000_000, parseInt(inputs.outputTokens) || 500));
  const reqPerDay = Math.max(0, Math.min(1_000_000, parseInt(inputs.requestsPerDay) || 100));
  const cacheReadHitRate = Math.max(0, Math.min(100, parseInt(inputs.cacheReadHitRate) || 0));
  const growthRate = Math.max(0, Math.min(50, parseFloat(inputs.growthRate) || 0));
  const projMonthsRaw = parseInt(inputs.projectionMonths);
  const projMonths = [3, 6, 12].includes(projMonthsRaw) ? projMonthsRaw : 12;

  const cachingActive = cacheReadHitRate > 0;
  const hitRate = cacheReadHitRate / 100;
  const reqsPerMonth = reqPerDay * 30;

  // --- Compute costs ---
  interface CostEntry {
    key: string;
    info: ModelInfo;
    costPerReq: number;
    monthlyCost: number;
    noCacheCostPerReq: number;
    noCacheMonthly: number;
  }

  const allCosts: CostEntry[] = [];
  for (const [key, info] of Object.entries(MODELS)) {
    const noCacheCostPerReq = (inTokens / 1_000_000) * info.input + (outTokens / 1_000_000) * info.output;
    const noCacheMonthly = noCacheCostPerReq * reqsPerMonth;

    let costPerReq: number;
    if (cachingActive) {
      // DeepSeek auto-caches repeated prefixes
      const cachedInput = (inTokens * hitRate / 1_000_000) * info.input * CACHE_READ_MULT;
      const nonCachedInput = (inTokens * (1 - hitRate) / 1_000_000) * info.input;
      const outputCost = (outTokens / 1_000_000) * info.output;
      costPerReq = cachedInput + nonCachedInput + outputCost;
    } else {
      costPerReq = noCacheCostPerReq;
    }

    const monthlyCost = costPerReq * reqsPerMonth;
    allCosts.push({ key, info, costPerReq, monthlyCost, noCacheCostPerReq, noCacheMonthly });
  }

  allCosts.sort((a, b) => a.info.order - b.info.order);

  const cheapest = allCosts.reduce((min, c) => c.monthlyCost < min.monthlyCost ? c : min);
  const maxCost = allCosts.reduce((max, c) => c.monthlyCost > max.monthlyCost ? c : max).monthlyCost;

  const selectedCosts: CostEntry[] = [];
  for (const k of selectedKeys) {
    const entry = allCosts.find(c => c.key === k);
    if (entry) selectedCosts.push(entry);
  }
  if (selectedCosts.length === 0) {
    for (const dk of DEFAULT_SELECTED) {
      const entry = allCosts.find(c => c.key === dk);
      if (entry) selectedCosts.push(entry);
    }
  }

  const out: string[] = [];
  // P168 B3-10：⭐「📅 Pricing last updated」这一行**从卡片正文里去掉** ——
  //   · 页面用**徽章**显示同一个日期（dataLastUpdated → 「📅 Data updated」）
  //   · codegen 写 staticExamples[0] 时也会过滤掉它（"UI badge covers it"）
  //   ⇒ 留在正文里只会与徽章重复（同一形态 ai-api-cost-comparison / ai-training 已处理）。
  //   ⚠️ 这里**保留空元素**（而不是把这一行删掉）⇒ out 数组与 staticExamples[0] 开头的 '\n' 逐字一致
  //   ⇒ 英文页零变化（selfcheck ① 不需要白名单）。
  out.push('');

  // Section 1: Header
  let headerLine = '$calc_out.section.deepseek_api_cost|\u{1F534} DeepSeek API Cost|';
  if (cachingActive) {
    headerLine += ' | ' + makeToken(
      'calc_out.deepseek_api_cost.row.auto_cache_badge',
      '\u{1F4BE} Auto-Cache: ' + cacheReadHitRate + '% hit (98% discount)',
      { rate: String(cacheReadHitRate) },
    );
  }
  out.push(headerLine);
  out.push('');
  out.push(
    makeToken('calc_out.deepseek_api_cost.row.input_tokens', '\u{1F4E5} Input: ' + lc(inTokens) + ' tokens/req', { tokens: lc(inTokens) }) + ' | ' +
    makeToken('calc_out.deepseek_api_cost.row.output_tokens', '\u{1F4E4} Output: ' + lc(outTokens) + ' tokens/req', { tokens: lc(outTokens) }) + ' | ' +
    makeToken('calc_out.deepseek_api_cost.row.requests_per_day', '\u{1F504} ' + lc(reqPerDay) + ' reqs/day', { reqs: lc(reqPerDay) }),
  );
  out.push('');

  // Section 2: Bar Chart
  out.push(makeToken('calc_out.deepseek_api_cost.row.cost_comparison', '📊 Cost Comparison (' + lc(reqPerDay) + ' reqs/day)', { reqs: lc(reqPerDay) }));
  out.push(SEP.repeat(54));
  const BAR_WIDTH = 40;
  for (const c of allCosts) {
    const icon = FAMILY_ICONS[c.info.family];
    const label = icon + ' ' + c.info.name;
    const barLen = maxCost > 0 ? Math.max(1, Math.round((c.monthlyCost / maxCost) * BAR_WIDTH)) : 1;
    const barChar = c.key === cheapest.key ? '░' : '█';
    const bar = barChar.repeat(barLen);
    const isCheapest = c.key === cheapest.key;
    const badge = isCheapest ? ' 🏆' : '';
    // P153: a label too long for the column used to lose its bar entirely.
    //
    // The client-side bar beautifier (src/pages/[lang]/[slug].astro) only
    // recognises a row when the engine emitted AT LEAST TWO spaces between
    // the label and the bar (regex `^(.+?)\s{2,}([█░]+)\s+[\$](\S+)`), and
    // the engine emits pad(label, W) + ONE separator space. A label of
    // length >= W therefore ended up with a single space, matched nothing,
    // and the row was left as a bare name with no bar.
    //
    // The column is NOT widened to fit the longest label: widening it
    // pushed the comparison page past its page-size budget. So the column
    // stays at 26 and an overflowing label simply gets the two spaces the
    // beautifier needs. Cost: one extra character per overflowing row.
    const labelField = label.length >= 26 ? label + '  ' : pad(label, 26) + ' ';
    out.push(labelField + pad(bar, BAR_WIDTH) + ' ' + fmt(c.monthlyCost) + badge);
  }
  out.push('');
  out.push('');

  // Section 3: Detail Cards — selected models
  out.push('$calc_out.section.deepseek_api_cost_selected_models|📋 Selected Model Details|');
  out.push(SEP.repeat(60));
  for (const c of selectedCosts) {
    const icon = FAMILY_ICONS[c.info.family];
    const famLabel = FAMILY_LABELS[c.info.family];
    const dailyCost = c.costPerReq * reqPerDay;
    const annualCost = c.monthlyCost * 12;

    // P168 B3-10：型号名留在 token 外（专有名词不该被译）；只把**系列标签**与
    //   「Context: …」包进 token ⇒ zh 页那一行不再是整行英文。
    const familyToken = c.info.family === 'v4'
      ? makeToken('calc_out.deepseek_api_cost.row.family_v4', '(' + famLabel + ')')
      : makeToken('calc_out.deepseek_api_cost.row.family_legacy', '(' + famLabel + ')');
    out.push(
      icon + ' ' + c.info.name + ' ' + familyToken +
      ' | ' + makeToken('calc_out.deepseek_api_cost.row.context_window', 'Context: ' + c.info.contextWindow, { context: c.info.contextWindow }),
    );
    out.push(SEP.repeat(44));

    // Input cost per-request breakdown
    const inputCostLine = (inTokens / 1_000_000) * c.info.input;
    out.push(
      makeToken(
        'calc_out.deepseek_api_cost.row.input_cost',
        'Input:  ' +
          pad(lc(inTokens), 7) +
          ' tokens × ' +
          fmt(c.info.input) +
          '/1M → ' +
          fmt(inputCostLine) +
          '/req',
        { tokens: lc(inTokens), rate: fmt(c.info.input), cost: fmt(inputCostLine) },
      ),
    );
    // Output cost per-request breakdown
    const outputCostLine = (outTokens / 1_000_000) * c.info.output;
    out.push(
      makeToken(
        'calc_out.deepseek_api_cost.row.output_cost',
        'Output: ' +
          pad(lc(outTokens), 7) +
          ' tokens × ' +
          fmt(c.info.output) +
          '/1M → ' +
          fmt(outputCostLine) +
          '/req',
        { tokens: pad(lc(outTokens), 7), rate: fmt(c.info.output), cost: fmt(outputCostLine) },
      ),
    );

    out.push(SEP.repeat(44));
    out.push(makeToken('calc_out.label.per_request', 'Per request') + ':    ' + fmt(c.costPerReq));
    out.push(makeToken('calc_out.label.daily', 'Daily') + ' (' + reqPerDay + '):    ' + fmt(dailyCost));
    out.push(makeToken('calc_out.label.monthly', 'Monthly') + ' (30d):  ' + fmt(c.monthlyCost));
    out.push(makeToken('calc_out.label.annual', 'Annual') + ':         ' + fmt(annualCost));
    out.push(SEP.repeat(44));

    // Cache savings per model
    if (cachingActive) {
      const savings = c.noCacheMonthly - c.monthlyCost;
      const pctSaved = c.noCacheMonthly > 0 ? Math.round((savings / c.noCacheMonthly) * 100) : 0;
      out.push(
        makeToken(
          'calc_out.deepseek_api_cost.row.auto_cache_savings',
          '💾 Auto-cache at ' +
            cacheReadHitRate +
            '% hit: ' +
            fmt(c.monthlyCost) +
            '/mo — saves ' +
            fmt(savings) +
            '/mo (' +
            pctSaved +
            '%)',
          { rate: String(cacheReadHitRate), cost: fmt(c.monthlyCost), saved: fmt(savings), pct: String(pctSaved) },
        ),
      );
    }

    out.push('');
  }

  // Section 4: Growth Projection
  if (growthRate > 0) {
    out.push(makeToken('calc_out.deepseek_api_cost.row.growth_projection', '\u{1F4C8} Growth Projection (' + growthRate + '%/month, ' + projMonths + ' months)', { growth: String(growthRate), months: String(projMonths) }));
    out.push('');
    // ⭐ 对齐空格留在 token 之外（先按原英文 pad，再把标签那一截换掉）
    const monthCell = 'Month'.padEnd(8);
    let header = makeToken('calc_out.label.month', 'Month') + monthCell.slice('Month'.length);
    for (const c of selectedCosts) header += ' | ' + c.info.name.padEnd(16);
    out.push(header);
    let sepLine = ''.padEnd(8, SEP);
    for (const _ of selectedCosts) sepLine += '-+-'.padEnd(17, SEP);
    out.push(sepLine);
    const growthMult = 1 + growthRate / 100;
    for (let month = 1; month <= projMonths; month++) {
      const mult = Math.pow(growthMult, month - 1);
      let row = String(month).padEnd(8);
      for (const c of selectedCosts) {
        row += ' | ' + fmt(c.monthlyCost * mult).padEnd(16);
      }
      out.push(row);
    }
    out.push(sepLine);
    const totalCell = 'Total'.padEnd(8);
    let totalRow = makeToken('calc_out.label.total', 'Total') + totalCell.slice('Total'.length);
    for (const c of selectedCosts) {
      let cum = 0;
      for (let m = 1; m <= projMonths; m++) cum += c.monthlyCost * Math.pow(growthMult, m - 1);
      totalRow += ' | ' + fmt(cum).padEnd(16);
    }
    out.push(totalRow);
    out.push('');
  }

  // Section 5: Savings Insights
  out.push('$calc_out.section.deepseek_api_cost_savings_insights|💰 Savings Insights|');
  out.push(SEP.repeat(60));

  // Cheapest overall
  const cheapestDS = allCosts.reduce((min, c) => c.monthlyCost < min.monthlyCost ? c : min);
  out.push(
    makeToken('calc_out.deepseek_api_cost.row.cheapest', '🏆 Cheapest: ' + cheapestDS.info.name + ' at ' + fmt(cheapestDS.monthlyCost) + '/mo', { model: cheapestDS.info.name, cost: fmt(cheapestDS.monthlyCost) }),
  );

  // Best value (V4 series, non-promo)
  const bestValue = allCosts
    .filter((c) => c.info.family === 'v4' && c.key !== 'deepseek-v4-pro-promo')
    .reduce((min, c) => (c.monthlyCost < min.monthlyCost ? c : min), allCosts[0]);
  if (bestValue && bestValue.key !== cheapestDS.key) {
    out.push(
      makeToken('calc_out.deepseek_api_cost.row.best_value', '⭐ Best value (V4 standard): ' + bestValue.info.name + ' at ' + fmt(bestValue.monthlyCost) + '/mo', { model: bestValue.info.name, cost: fmt(bestValue.monthlyCost) }),
    );
  }

  // Switching savings: most expensive selected vs cheapest selected
  if (selectedCosts.length >= 2) {
    const mostExpSelected = selectedCosts.reduce((max, c) =>
      c.monthlyCost > max.monthlyCost ? c : max,
    );
    const cheapSelected = selectedCosts.reduce((min, c) =>
      c.monthlyCost < min.monthlyCost ? c : min,
    );
    const diff = mostExpSelected.monthlyCost - cheapSelected.monthlyCost;
    out.push(
      makeToken('calc_out.deepseek_api_cost.row.switching_savings', '💸 Switching from ' + mostExpSelected.info.name + ' to ' + cheapSelected.info.name + ' saves ' + fmt(diff) + '/mo (' + fmt(diff * 12) + '/yr)', { from: mostExpSelected.info.name, to: cheapSelected.info.name, saved: fmt(diff), yearly: fmt(diff * 12) }),
    );
  }

  // Caching tip
  if (cachingActive && selectedCosts.length > 0) {
    const ref = selectedCosts[0];
    const savings = ref.noCacheMonthly - ref.monthlyCost;
    out.push(
      makeToken('calc_out.deepseek_api_cost.row.auto_cache_summary', '💾 Auto-cache at ' + cacheReadHitRate + '% hit rate saves ~' + fmt(savings) + '/mo on ' + ref.info.name, { rate: String(cacheReadHitRate), saved: fmt(savings), model: ref.info.name }),
    );
  }

  // Cross-provider comparison
  for (const [provKey, prov] of Object.entries(CROSS_PROVIDER)) {
    const provMonthly = ((inTokens / 1_000_000) * prov.input + (outTokens / 1_000_000) * prov.output) * reqsPerMonth;
    const diff = provMonthly - cheapestDS.monthlyCost;
    const pct = provMonthly > 0 ? Math.round((Math.abs(diff) / provMonthly) * 100) : 0;
    if (diff > 0) {
      out.push(
        makeToken('calc_out.deepseek_api_cost.row.cross_provider_cheaper', '🌍 ' + cheapestDS.info.name + ' vs ' + prov.name + ': saves ' + fmt(diff) + '/month (' + pct + '% cheaper)', { model: cheapestDS.info.name, provider: prov.name, saved: fmt(diff), pct: String(pct) }),
      );
    } else {
      out.push(
        makeToken('calc_out.deepseek_api_cost.row.cross_provider_pricier', '🌍 ' + cheapestDS.info.name + ' vs ' + prov.name + ': costs ' + fmt(-diff) + '/month more (' + pct + '% premium)', { model: cheapestDS.info.name, provider: prov.name, extra: fmt(-diff), pct: String(pct) }),
      );
    }
  }
  out.push(makeToken('calc_out.deepseek_api_cost.row.tip_cheaper_than_frontier', '💡 DeepSeek V4 Flash is 20-100x cheaper than frontier models. Auto-caching saves 98% on repeated prompts.'));
  out.push('');

  // Section 6: Usage Scenarios
  out.push(makeToken('calc_out.deepseek_api_cost.row.usage_scenarios', '📅 Usage Scenarios (monthly cost at ' + lc(reqPerDay) + ' reqs/day)', { reqs: lc(reqPerDay) }));
  out.push('');
  const volumes = [50, 100, 500, 1000, 5000, 10000];
  for (const c of selectedCosts) {
    const icon = FAMILY_ICONS[c.info.family];
    const parts: string[] = [];
    for (const v of volumes) {
      parts.push(lc(v) + '→' + fmt(c.costPerReq * v * 30));
    }
    // P168 B3-9：整行**令牌化**（原先是裸文本 ⇒ zh 卡片这一行仍是英文）
    //   ⇒ 图标 / 型号 / 6 档用量全部走 {param} ⇒ zh 侧可整行中文化。
    out.push(
      makeToken(
        'calc_out.deepseek_api_cost.row.usage_scenario_line',
        icon + ' ' + c.info.name + ': ' + parts.join(' · '),
        {
          icon,
          model: c.info.name,
          v50: parts[0],
          v100: parts[1],
          v500: parts[2],
          v1k: parts[3],
          v5k: parts[4],
          v10k: parts[5],
        },
      ),
    );
  }

  // 🩺 Cost Health (v3)
  out.push('');
  out.push('$calc_out.section.deepseek_api_cost_health|🩺 Cost Health:|');
  out.push(SEP.repeat(60));
  const totalSelectedMonthly = selectedCosts.reduce((s, c) => s + c.monthlyCost, 0);
  const cheapestSelected = selectedCosts.reduce((min, c) => c.monthlyCost < min.monthlyCost ? c : min);
  const expensiveSelected = selectedCosts.reduce((max, c) => c.monthlyCost > max.monthlyCost ? c : max);
  if (selectedCosts.length >= 2) {
    const ratio = expensiveSelected.monthlyCost / Math.max(cheapestSelected.monthlyCost, 0.01);
    if (ratio >= 50) out.push(makeToken('calc_out.deepseek_api_cost.row.health_spread_50x', '• 🔴 Your most expensive selection costs ' + ratio.toFixed(0) + 'x your cheapest — consider mixing tiers.', { ratio: ratio.toFixed(0) }));
    else if (ratio >= 10) out.push(makeToken('calc_out.deepseek_api_cost.row.health_spread_10x', '• 🟠 ' + ratio.toFixed(0) + 'x cost spread across selected models — review if every model needs to be premium.', { ratio: ratio.toFixed(0) }));
    else out.push(makeToken('calc_out.deepseek_api_cost.row.health_spread_healthy', '• 🟢 Healthy cost spread (' + ratio.toFixed(1) + 'x) across selected models.', { ratio: ratio.toFixed(1) }));
  }
  if (cheapestSelected) {
    const tierModel = cheapestSelected.info.name;
    const tierCost = fmt(cheapestSelected.monthlyCost);
    // ⚠️ 四档**各有自己的 code**（而不是「一个 code + 四种兜底」）⇒ locale 的 en 值与运行时兜底永远一致。
    if (cheapestSelected.monthlyCost < 5) {
      out.push(makeToken('calc_out.deepseek_api_cost.row.health_tier_micro', '• 🟢 Micro-tier (under $5/mo) — ' + tierModel + ' at ' + tierCost + '/mo.', { model: tierModel, cost: tierCost }));
    } else if (cheapestSelected.monthlyCost < 50) {
      out.push(makeToken('calc_out.deepseek_api_cost.row.health_tier_low', '• 🟢 Low-volume tier — ' + tierModel + ' at ' + tierCost + '/mo.', { model: tierModel, cost: tierCost }));
    } else if (cheapestSelected.monthlyCost < 500) {
      out.push(makeToken('calc_out.deepseek_api_cost.row.health_tier_mid', '• 🟡 Mid-volume tier — ' + tierModel + ' at ' + tierCost + '/mo.', { model: tierModel, cost: tierCost }));
    } else {
      out.push(makeToken('calc_out.deepseek_api_cost.row.health_tier_high', '• 🟠 High-volume tier — ' + tierModel + ' at ' + tierCost + '/mo.', { model: tierModel, cost: tierCost }));
    }
  }
  if (true) { // deepseek doesn't have batch pricing
    const batchSavings = totalSelectedMonthly * 0.5;
    out.push(makeToken('calc_out.deepseek_api_cost.row.batch_pricing_tip', '• 💡 Switch to a provider with batch pricing (Anthropic/OpenAI): save ~' + fmt(batchSavings) + '/mo (50% discount) if latency is not critical.', { saved: fmt(batchSavings) }));
  }
  out.push('');

  // 🔄 What-If Scenarios (v3)
  out.push('$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|');
  out.push(SEP.repeat(60));
  const popularCheapest = allCosts
    .reduce((min, c) => (c.info.input + c.info.output) < (min.info.input + min.info.output) ? c : min, allCosts[0]);
  if (popularCheapest && popularCheapest.key !== cheapestSelected?.key) {
    const cpr = (inTokens / 1e6) * popularCheapest.info.input + (outTokens / 1e6) * popularCheapest.info.output;
    const newMonthly = cpr * reqPerDay * 30;
    const savings = (cheapestSelected?.monthlyCost ?? 0) - newMonthly;
    if (savings > 0) out.push(makeToken('calc_out.deepseek_api_cost.row.whatif_switch_cheapest', '• Switch cheapest to ' + popularCheapest.info.name + ':  save ' + fmt(savings) + '/mo  (similar quality, much cheaper)', { model: popularCheapest.info.name, saved: fmt(savings) }));
  }
  out.push(makeToken('calc_out.deepseek_api_cost.row.whatif_double_volume', '• Double volume to ' + lc(reqPerDay * 2) + ' reqs/day:  ' + fmt(totalSelectedMonthly * 2) + '/mo', { reqs: lc(reqPerDay * 2), cost: fmt(totalSelectedMonthly * 2) }));
  out.push(makeToken('calc_out.deepseek_api_cost.row.whatif_halve_volume', '• Halve volume to ' + lc(Math.max(1, Math.floor(reqPerDay / 2))) + ' reqs/day:  ' + fmt(totalSelectedMonthly / 2) + '/mo', { reqs: lc(Math.max(1, Math.floor(reqPerDay / 2))), cost: fmt(totalSelectedMonthly / 2) }));

  out.push('');
  return out;
}

// customFn — exact sync with calculate()
const customFn =
  // P168 B3-10：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 两端输出逐字节相同，不可能漂移；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS +
  "var M={'deepseek-v4.1-flash-1017':{i:0.15,o:0.6,n:'Deepseek V4.1 Flash 1017',f:'v4',cw:'1M',od:1},'deepseek-v4-flash':{i:0.3,o:1.2,n:'Deepseek V4 Flash',f:'v4',cw:'1M',od:2},'deepseek-v4-pro':{i:1.32,o:3.96,n:'Deepseek V4 Pro',f:'v4',cw:'1M',od:3},'deepseek-v4-pro-promo':{i:0.435,o:0.87,n:'V4 Pro (75% Promo)',f:'v4',cw:'1M',od:4},'deepseek-r1':{i:0.55,o:2.19,n:'Deepseek R1',f:'legacy',cw:'66K',od:5}};" +

  "var FI={v4:'\\u25C6',legacy:'\\u25C7'};" +
  "var FL={v4:'V4 Series',legacy:'Legacy'};" +
  "var DEF=['deepseek-v4-flash','deepseek-v4-pro-promo','deepseek-r1'];" +
  "var CRM=0.02;" +
  "var XP={openai:{i:0.05,o:0.4,n:'GPT-5 Nano'},claude:{i:0.25,o:1.25,n:'Claude Haiku 3'},gemini:{i:0.075,o:0.3,n:'Gemini 1.5 Flash'}};" +
  "function fm(n){if(Math.abs(n)<0.01&&n!==0)return '$'+n.toFixed(4);return '$'+n.toFixed(2)}" +
  "function lc(n){return n.toLocaleString()}" +
  "function pd(s,l){return s+' '.repeat(Math.max(0,l-s.length))}" +
  "var SEP2='\\u2500';" +
  "var rawM=inputs.models||DEF.join(',');var sks=[];var seen={};rawM.split(',').forEach(function(s){s=s.trim();if(s&&!seen[s]){seen[s]=true;sks.push(s);}});" +
  "var iT=Math.max(1,Math.min(1e7,parseInt(inputs.inputTokens)||1000));" +
  "var oT=Math.max(1,Math.min(1e7,parseInt(inputs.outputTokens)||500));" +
  "var rpd=Math.max(0,Math.min(1e6,parseInt(inputs.requestsPerDay)||100));" +
  "var cHR=Math.max(0,Math.min(100,parseInt(inputs.cacheReadHitRate)||0));" +
  "var gR=Math.max(0,Math.min(50,parseFloat(inputs.growthRate)||0));" +
  "var pMraw=parseInt(inputs.projectionMonths);var pM=[3,6,12].indexOf(pMraw)>=0?pMraw:12;" +
  "var cacheOn=cHR>0;var hR=cHR/100;var rpm=rpd*30;" +
  "var all=[];" +
  "for(var k in M){var mi=M[k];var ncpr=(iT/1e6)*mi.i+(oT/1e6)*mi.o;var ncm=ncpr*rpm;var cpr;" +
  "if(cacheOn){var ci=(iT*hR/1e6)*mi.i*CRM;var nci=(iT*(1-hR)/1e6)*mi.i;cpr=ci+nci+(oT/1e6)*mi.o;}else{cpr=ncpr;}" +
  "var mc=cpr*rpm;all.push({k:k,i:mi,cpr:cpr,mc:mc,ncpr:ncpr,ncm:ncm});}" +
  "all.sort(function(a,b){return a.i.od-b.i.od;});" +
  "var ch=all.reduce(function(min,c){return c.mc<min.mc?c:min;});" +
  "var mx=all.reduce(function(max,c){return c.mc>max.mc?c:max;}).mc;" +
  "var sc=[];for(var i=0;i<sks.length;i++){var e=all.find(function(c){return c.k===sks[i];});if(e)sc.push(e);}" +
  "if(sc.length===0){for(var j=0;j<DEF.length;j++){var e2=all.find(function(c){return c.k===DEF[j];});if(e2)sc.push(e2);}}" +
  "var o=[];" +
  "o.push('');" +
  "var hl='$calc_out.section.deepseek_api_cost|\\u{1F534} DeepSeek API Cost|';if(cacheOn){hl+=' | '+tk('calc_out.deepseek_api_cost.row.auto_cache_badge','\\u{1F4BE} Auto-Cache: '+cHR+'% hit (98% discount)',{rate:String(cHR)});}o.push(hl);o.push('');" +
  "o.push(tk('calc_out.deepseek_api_cost.row.input_tokens','\\u{1F4E5} Input: '+lc(iT)+' tokens/req',{tokens:lc(iT)})+' | '+tk('calc_out.deepseek_api_cost.row.output_tokens','\\u{1F4E4} Output: '+lc(oT)+' tokens/req',{tokens:lc(oT)})+' | '+tk('calc_out.deepseek_api_cost.row.requests_per_day','\\u{1F504} '+lc(rpd)+' reqs/day',{reqs:lc(rpd)}));o.push('');" +
  "o.push(tk('calc_out.deepseek_api_cost.row.cost_comparison','\\u{1F4CA} Cost Comparison ('+lc(rpd)+' reqs/day)',{reqs:lc(rpd)}));o.push(SEP2.repeat(54));" +
  "var BW=40;for(var i=0;i<all.length;i++){var c=all[i];var icon=FI[c.i.f];var label=icon+' '+c.i.n;" +
  "var bl=mx>0?Math.max(1,Math.round((c.mc/mx)*BW)):1;var bc=c.k===ch.k?'\\u2591':'\\u2588';var bd=c.k===ch.k?' \\u{1F3C6}':'';" +
  "o.push((label.length>=26?label+'  ':pd(label,26)+' ')+pd(bc.repeat(bl),BW)+' '+fm(c.mc)+bd);}o.push('');o.push('');" +
  "o.push('$calc_out.section.deepseek_api_cost_selected_models|\\u{1F4CB} Selected Model Details|');o.push(SEP2.repeat(60));" +
  "for(var i=0;i<sc.length;i++){var c=sc[i];var icon=FI[c.i.f];var dc2=c.cpr*rpd;var ann=c.mc*12;" +
  "var famTok=c.i.f==='v4'?tk('calc_out.deepseek_api_cost.row.family_v4','('+FL[c.i.f]+')'):tk('calc_out.deepseek_api_cost.row.family_legacy','('+FL[c.i.f]+')');" +
  "o.push(icon+' '+c.i.n+' '+famTok+' | '+tk('calc_out.deepseek_api_cost.row.context_window','Context: '+c.i.cw,{context:c.i.cw}));" +
  "o.push(SEP2.repeat(44));" +
  "var icl=(iT/1e6)*c.i.i;var ocl=(oT/1e6)*c.i.o;" +
  "o.push(tk('calc_out.deepseek_api_cost.row.input_cost','Input:  '+pd(lc(iT),7)+' tokens \\u00d7 '+fm(c.i.i)+'/1M \\u2192 '+fm(icl)+'/req',{tokens:lc(iT),rate:fm(c.i.i),cost:fm(icl)}));" +
  "o.push(tk('calc_out.deepseek_api_cost.row.output_cost','Output: '+pd(lc(oT),7)+' tokens \\u00d7 '+fm(c.i.o)+'/1M \\u2192 '+fm(ocl)+'/req',{tokens:pd(lc(oT),7),rate:fm(c.i.o),cost:fm(ocl)}));" +
  "o.push(SEP2.repeat(44));" +
  "o.push(tk('calc_out.label.per_request','Per request')+':    '+fm(c.cpr));" +
  "o.push(tk('calc_out.label.daily','Daily')+' ('+rpd+'):    '+fm(dc2));" +
  "o.push(tk('calc_out.label.monthly','Monthly')+' (30d):  '+fm(c.mc));" +
  "o.push(tk('calc_out.label.annual','Annual')+':         '+fm(ann));" +
  "o.push(SEP2.repeat(44));" +
  "if(cacheOn){var sv=c.ncm-c.mc;var ps=c.ncm>0?Math.round((sv/c.ncm)*100):0;" +
  "o.push(tk('calc_out.deepseek_api_cost.row.auto_cache_savings','\\u{1F4BE} Auto-cache at '+cHR+'% hit: '+fm(c.mc)+'/mo \\u2014 saves '+fm(sv)+'/mo ('+ps+'%)',{rate:String(cHR),cost:fm(c.mc),saved:fm(sv),pct:String(ps)}));}" +
  "o.push('');}" +
  "if(gR>0){" +
  "o.push(tk('calc_out.deepseek_api_cost.row.growth_projection','\\u{1F4C8} Growth Projection ('+gR+'%/month, '+pM+' months)',{growth:String(gR),months:String(pM)}));o.push('');" +
  "var mCell='Month'.padEnd(8);var hdr=tk('calc_out.label.month','Month')+mCell.slice(5);for(var i=0;i<sc.length;i++)hdr+=' | '+sc[i].i.n.padEnd(16);o.push(hdr);" +
  "var sl=''.padEnd(8,SEP2);for(var i=0;i<sc.length;i++)sl+='-+-'.padEnd(17,SEP2);o.push(sl);" +
  "var gm=1+gR/100;" +
  "for(var m=1;m<=pM;m++){var mult=Math.pow(gm,m-1);var row=String(m).padEnd(8);for(var i=0;i<sc.length;i++)row+=' | '+fm(sc[i].mc*mult).padEnd(16);o.push(row);}" +
  "o.push(sl);" +
  "var tCell='Total'.padEnd(8);var tr=tk('calc_out.label.total','Total')+tCell.slice(5);for(var i=0;i<sc.length;i++){var cum=0;for(var m=1;m<=pM;m++)cum+=sc[i].mc*Math.pow(gm,m-1);tr+=' | '+fm(cum).padEnd(16);}o.push(tr);" +
  "o.push('');}" +
  "o.push('$calc_out.section.deepseek_api_cost_savings_insights|\\u{1F4B0} Savings Insights|');o.push(SEP2.repeat(60));" +
  "var cheapestD=all.reduce(function(min,c){return c.mc<min.mc?c:min;});" +
  "o.push(tk('calc_out.deepseek_api_cost.row.cheapest','\\u{1F3C6} Cheapest: '+cheapestD.i.n+' at '+fm(cheapestD.mc)+'/mo',{model:cheapestD.i.n,cost:fm(cheapestD.mc)}));" +
  "var flt2=all.filter(function(c){return c.i.f==='v4'&&c.k!=='deepseek-v4-pro-promo';});" +
  "var bv=flt2.length>0?flt2.reduce(function(mn,c){return c.mc<mn.mc?c:mn;}):null;" +
  "if(bv&&bv.k!==cheapestD.k){o.push(tk('calc_out.deepseek_api_cost.row.best_value','\\u2B50 Best value (V4 standard): '+bv.i.n+' at '+fm(bv.mc)+'/mo',{model:bv.i.n,cost:fm(bv.mc)}));}" +
  "if(sc.length>=2){" +
  "var meS=sc.reduce(function(max,c){return c.mc>max.mc?c:max;});" +
  "var chS=sc.reduce(function(min,c){return c.mc<min.mc?c:min;});" +
  "var df2=meS.mc-chS.mc;" +
  "o.push(tk('calc_out.deepseek_api_cost.row.switching_savings','\\u{1F4B8} Switching from '+meS.i.n+' to '+chS.i.n+' saves '+fm(df2)+'/mo ('+fm(df2*12)+'/yr)',{from:meS.i.n,to:chS.i.n,saved:fm(df2),yearly:fm(df2*12)}));}" +
  "if(cacheOn&&sc.length>0){" +
  "var ref2=sc[0];var sv2=ref2.ncm-ref2.mc;" +
  "o.push(tk('calc_out.deepseek_api_cost.row.auto_cache_summary','\\u{1F4BE} Auto-cache at '+cHR+'% hit rate saves ~'+fm(sv2)+'/mo on '+ref2.i.n,{rate:String(cHR),saved:fm(sv2),model:ref2.i.n}));}" +
  "for(var pk in XP){var pv=XP[pk];var pm2=((iT/1e6)*pv.i+(oT/1e6)*pv.o)*rpm;var df=pm2-cheapestD.mc;var pct=pm2>0?Math.round((Math.abs(df)/pm2)*100):0;" +
  "if(df>0){o.push(tk('calc_out.deepseek_api_cost.row.cross_provider_cheaper','\\u{1F30D} '+cheapestD.i.n+' vs '+pv.n+': saves '+fm(df)+'/month ('+pct+'% cheaper)',{model:cheapestD.i.n,provider:pv.n,saved:fm(df),pct:String(pct)}));}" +
  "else{o.push(tk('calc_out.deepseek_api_cost.row.cross_provider_pricier','\\u{1F30D} '+cheapestD.i.n+' vs '+pv.n+': costs '+fm(-df)+'/month more ('+pct+'% premium)',{model:cheapestD.i.n,provider:pv.n,extra:fm(-df),pct:String(pct)}));}" +
  "}" +
  "o.push(tk('calc_out.deepseek_api_cost.row.tip_cheaper_than_frontier','\\u{1F4A1} DeepSeek V4 Flash is 20-100x cheaper than frontier models. Auto-caching saves 98% on repeated prompts.'));" +
  "o.push('');" +
  "o.push(tk('calc_out.deepseek_api_cost.row.usage_scenarios','\\u{1F4C5} Usage Scenarios (monthly cost at '+lc(rpd)+' reqs/day)',{reqs:lc(rpd)}));o.push('');" +
  "var vols=[50,100,500,1000,5000,10000];" +
  "for(var i=0;i<sc.length;i++){var c=sc[i];var icon=FI[c.i.f];var pts=[];" +
  "for(var j=0;j<vols.length;j++){pts.push(lc(vols[j])+'\\u2192'+fm(c.cpr*vols[j]*30));}" +
  "o.push(tk('calc_out.deepseek_api_cost.row.usage_scenario_line',icon+' '+c.i.n+': '+pts.join(' \\u00b7 '),{icon:icon,model:c.i.n,v50:pts[0],v100:pts[1],v500:pts[2],v1k:pts[3],v5k:pts[4],v10k:pts[5]}));}" +
  // P168 B3-10：🩺 Cost Health + 🔄 What-If 两段**客户端原本缺失**（服务端有）
  //   ⇒ 与服务端逐字补齐（同一批 B3-8 §0.5 对 burn-rate 的裁定：客户端补齐缺失段）。
  "o.push('');" +
  "o.push('$calc_out.section.deepseek_api_cost_health|\\uD83E\\uDE7A Cost Health:|');o.push(SEP2.repeat(60));" +
  "var totSel=0;for(var i=0;i<sc.length;i++)totSel+=sc[i].mc;" +
  "var chSel=sc.reduce(function(min,c){return c.mc<min.mc?c:min;});" +
  "var exSel=sc.reduce(function(max,c){return c.mc>max.mc?c:max;});" +
  "if(sc.length>=2){var ratio=exSel.mc/Math.max(chSel.mc,0.01);" +
  "if(ratio>=50)o.push(tk('calc_out.deepseek_api_cost.row.health_spread_50x','\\u2022 \\uD83D\\uDD34 Your most expensive selection costs '+ratio.toFixed(0)+'x your cheapest \\u2014 consider mixing tiers.',{ratio:ratio.toFixed(0)}));" +
  "else if(ratio>=10)o.push(tk('calc_out.deepseek_api_cost.row.health_spread_10x','\\u2022 \\uD83D\\uDFE0 '+ratio.toFixed(0)+'x cost spread across selected models \\u2014 review if every model needs to be premium.',{ratio:ratio.toFixed(0)}));" +
  "else o.push(tk('calc_out.deepseek_api_cost.row.health_spread_healthy','\\u2022 \\uD83D\\uDFE2 Healthy cost spread ('+ratio.toFixed(1)+'x) across selected models.',{ratio:ratio.toFixed(1)}));}" +
  "var tM=chSel.i.n;var tC=fm(chSel.mc);" +
  "if(chSel.mc<5)o.push(tk('calc_out.deepseek_api_cost.row.health_tier_micro','\\u2022 '+'🟢 Micro-tier (under $5/mo)'+' \\u2014 '+tM+' at '+tC+'/mo.',{model:tM,cost:tC}));" +
  "else if(chSel.mc<50)o.push(tk('calc_out.deepseek_api_cost.row.health_tier_low','\\u2022 '+'🟢 Low-volume tier'+' \\u2014 '+tM+' at '+tC+'/mo.',{model:tM,cost:tC}));" +
  "else if(chSel.mc<500)o.push(tk('calc_out.deepseek_api_cost.row.health_tier_mid','\\u2022 '+'🟡 Mid-volume tier'+' \\u2014 '+tM+' at '+tC+'/mo.',{model:tM,cost:tC}));" +
  "else o.push(tk('calc_out.deepseek_api_cost.row.health_tier_high','\\u2022 '+'🟠 High-volume tier'+' \\u2014 '+tM+' at '+tC+'/mo.',{model:tM,cost:tC}));" +
  "o.push(tk('calc_out.deepseek_api_cost.row.batch_pricing_tip','\\u2022 \\uD83D\\uDCA1 Switch to a provider with batch pricing (Anthropic/OpenAI): save ~'+fm(totSel*0.5)+'/mo (50% discount) if latency is not critical.',{saved:fm(totSel*0.5)}));" +
  "o.push('');" +
  "o.push('$calc_out.section.what_if_scenarios|\\uD83D\\uDD04 What-If Scenarios:|');o.push(SEP2.repeat(60));" +
  "var pc=all.reduce(function(min,c){return (c.i.i+c.i.o)<(min.i.i+min.i.o)?c:min;},all[0]);" +
  "var chSelK=chSel?chSel.k:undefined;" +
  "if(pc&&pc.k!==chSelK){var cpr2=(iT/1e6)*pc.i.i+(oT/1e6)*pc.i.o;var newM2=cpr2*rpd*30;var svS=(chSel?chSel.mc:0)-newM2;" +
  "if(svS>0)o.push(tk('calc_out.deepseek_api_cost.row.whatif_switch_cheapest','\\u2022 Switch cheapest to '+pc.i.n+':  save '+fm(svS)+'/mo  (similar quality, much cheaper)',{model:pc.i.n,saved:fm(svS)}));}" +
  "o.push(tk('calc_out.deepseek_api_cost.row.whatif_double_volume','\\u2022 Double volume to '+lc(rpd*2)+' reqs/day:  '+fm(totSel*2)+'/mo',{reqs:lc(rpd*2),cost:fm(totSel*2)}));" +
  "o.push(tk('calc_out.deepseek_api_cost.row.whatif_halve_volume','\\u2022 Halve volume to '+lc(Math.max(1,Math.floor(rpd/2)))+' reqs/day:  '+fm(totSel/2)+'/mo',{reqs:lc(Math.max(1,Math.floor(rpd/2))),cost:fm(totSel/2)}));" +
  "o.push('');" +
  // P168 B3-9：⭐ 返回**整份输出**的单元素数组 —— 页面（src/pages/[lang]/[slug].astro:2186）对 custom 型**只渲染 results[0]**
  //   ⇒ 多元素数组会让动态卡片只剩第一行（同一形态 B3-8 已在 ai-api-cost-comparison 修复并验证）。
  "return [o.join('\\n')];";

const engine: ToolEngine = {
  slug: 'solopreneur-deepseek-api-cost-calculator',
  title: 'DeepSeek API Cost Calculator',
  description: 'Calculate DeepSeek API costs for V4 Flash, V4 Pro, and legacy R1. Includes automatic caching, growth projections, and cross-provider savings comparison.',
  inputs: [
    { name: 'models', label: 'Models', placeholder: 'deepseek-v4-flash,deepseek-v4-pro-promo,deepseek-r1', type: 'text' },
    { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
    { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
    { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
    { name: 'cacheReadHitRate', label: 'Auto-Cache Hit Rate (%)', placeholder: 'e.g. 60', type: 'number' },
    { name: 'growthRate', label: 'Monthly Growth Rate (%)', placeholder: 'e.g. 5', type: 'number' },
    { name: 'projectionMonths', label: 'Projection Period', placeholder: '', type: 'select', options: ['3', '6', '12'] },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
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
  generate(inputs) { return calculate(inputs); },
  staticExamples: [
    // Single comprehensive example covering all 6 sections
    '\n$calc_out.section.deepseek_api_cost|🔴 DeepSeek API Cost|\n\n$calc_out.deepseek_api_cost.row.input_tokens{"tokens":"1,000"}|📥 Input: 1,000 tokens/req| | $calc_out.deepseek_api_cost.row.output_tokens{"tokens":"500"}|📤 Output: 500 tokens/req| | $calc_out.deepseek_api_cost.row.requests_per_day{"reqs":"100"}|🔄 100 reqs/day|\n\n$calc_out.deepseek_api_cost.row.cost_comparison{"reqs":"100"}|📊 Cost Comparison (100 reqs/day)|\n──────────────────────────────────────────────────────\n◆ Deepseek V4.1 Flash 1017  ░░░░░                                    $1.35 🏆\n◆ Deepseek V4 Flash        ███████████                              $2.70\n◆ Deepseek V4 Pro          ████████████████████████████████████████ $9.90\n◆ V4 Pro (75% Promo)       ███████████                              $2.61\n◇ Deepseek R1              ████████████████████                     $4.94\n\n\n$calc_out.section.deepseek_api_cost_selected_models|📋 Selected Model Details|\n────────────────────────────────────────────────────────────\n◆ Deepseek V4 Flash $calc_out.deepseek_api_cost.row.family_v4|(V4 Series)| | $calc_out.deepseek_api_cost.row.context_window{"context":"1M"}|Context: 1M|\n────────────────────────────────────────────\n$calc_out.deepseek_api_cost.row.input_cost{"tokens":"1,000","rate":"$0.30","cost":"$0.0003"}|Input:  1,000   tokens × $0.30/1M → $0.0003/req|\n$calc_out.deepseek_api_cost.row.output_cost{"tokens":"500    ","rate":"$1.20","cost":"$0.0006"}|Output: 500     tokens × $1.20/1M → $0.0006/req|\n────────────────────────────────────────────\n$calc_out.label.per_request|Per request|:    $0.0009\n$calc_out.label.daily|Daily| (100):    $0.09\n$calc_out.label.monthly|Monthly| (30d):  $2.70\n$calc_out.label.annual|Annual|:         $32.40\n────────────────────────────────────────────\n\n◆ V4 Pro (75% Promo) $calc_out.deepseek_api_cost.row.family_v4|(V4 Series)| | $calc_out.deepseek_api_cost.row.context_window{"context":"1M"}|Context: 1M|\n────────────────────────────────────────────\n$calc_out.deepseek_api_cost.row.input_cost{"tokens":"1,000","rate":"$0.43","cost":"$0.0004"}|Input:  1,000   tokens × $0.43/1M → $0.0004/req|\n$calc_out.deepseek_api_cost.row.output_cost{"tokens":"500    ","rate":"$0.87","cost":"$0.0004"}|Output: 500     tokens × $0.87/1M → $0.0004/req|\n────────────────────────────────────────────\n$calc_out.label.per_request|Per request|:    $0.0009\n$calc_out.label.daily|Daily| (100):    $0.09\n$calc_out.label.monthly|Monthly| (30d):  $2.61\n$calc_out.label.annual|Annual|:         $31.32\n────────────────────────────────────────────\n\n$calc_out.section.deepseek_api_cost_savings_insights|💰 Savings Insights|\n────────────────────────────────────────────────────────────\n$calc_out.deepseek_api_cost.row.cheapest{"model":"Deepseek V4.1 Flash 1017","cost":"$1.35"}|🏆 Cheapest: Deepseek V4.1 Flash 1017 at $1.35/mo|\n$calc_out.deepseek_api_cost.row.switching_savings{"from":"Deepseek V4 Flash","to":"V4 Pro (75% Promo)","saved":"$0.09","yearly":"$1.08"}|💸 Switching from Deepseek V4 Flash to V4 Pro (75% Promo) saves $0.09/mo ($1.08/yr)|\n$calc_out.deepseek_api_cost.row.cross_provider_pricier{"model":"Deepseek V4.1 Flash 1017","provider":"GPT-5 Nano","extra":"$0.60","pct":"80"}|🌍 Deepseek V4.1 Flash 1017 vs GPT-5 Nano: costs $0.60/month more (80% premium)|\n$calc_out.deepseek_api_cost.row.cross_provider_cheaper{"model":"Deepseek V4.1 Flash 1017","provider":"Claude Haiku 3","saved":"$1.28","pct":"49"}|🌍 Deepseek V4.1 Flash 1017 vs Claude Haiku 3: saves $1.28/month (49% cheaper)|\n$calc_out.deepseek_api_cost.row.cross_provider_pricier{"model":"Deepseek V4.1 Flash 1017","provider":"Gemini 1.5 Flash","extra":"$0.67","pct":"100"}|🌍 Deepseek V4.1 Flash 1017 vs Gemini 1.5 Flash: costs $0.67/month more (100% premium)|\n$calc_out.deepseek_api_cost.row.tip_cheaper_than_frontier|💡 DeepSeek V4 Flash is 20-100x cheaper than frontier models. Auto-caching saves 98% on repeated prompts.|\n\n$calc_out.deepseek_api_cost.row.usage_scenarios{"reqs":"100"}|📅 Usage Scenarios (monthly cost at 100 reqs/day)|\n\n$calc_out.deepseek_api_cost.row.usage_scenario_line{"icon":"◆","model":"Deepseek V4 Flash","v50":"50→$1.35","v100":"100→$2.70","v500":"500→$13.50","v1k":"1,000→$27.00","v5k":"5,000→$135.00","v10k":"10,000→$270.00"}|◆ Deepseek V4 Flash: 50→$1.35 · 100→$2.70 · 500→$13.50 · 1,000→$27.00 · 5,000→$135.00 · 10,000→$270.00|\n$calc_out.deepseek_api_cost.row.usage_scenario_line{"icon":"◆","model":"V4 Pro (75% Promo)","v50":"50→$1.30","v100":"100→$2.61","v500":"500→$13.05","v1k":"1,000→$26.10","v5k":"5,000→$130.50","v10k":"10,000→$261.00"}|◆ V4 Pro (75% Promo): 50→$1.30 · 100→$2.61 · 500→$13.05 · 1,000→$26.10 · 5,000→$130.50 · 10,000→$261.00|\n\n$calc_out.section.deepseek_api_cost_health|🩺 Cost Health:|\n────────────────────────────────────────────────────────────\n$calc_out.deepseek_api_cost.row.health_spread_healthy{"ratio":"1.0"}|• 🟢 Healthy cost spread (1.0x) across selected models.|\n$calc_out.deepseek_api_cost.row.health_tier_micro{"model":"V4 Pro (75% Promo)","cost":"$2.61"}|• 🟢 Micro-tier (under $5/mo) — V4 Pro (75% Promo) at $2.61/mo.|\n$calc_out.deepseek_api_cost.row.batch_pricing_tip{"saved":"$2.65"}|• 💡 Switch to a provider with batch pricing (Anthropic/OpenAI): save ~$2.65/mo (50% discount) if latency is not critical.|\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n────────────────────────────────────────────────────────────\n$calc_out.deepseek_api_cost.row.whatif_switch_cheapest{"model":"Deepseek V4.1 Flash 1017","saved":"$1.26"}|• Switch cheapest to Deepseek V4.1 Flash 1017:  save $1.26/mo  (similar quality, much cheaper)|\n$calc_out.deepseek_api_cost.row.whatif_double_volume{"reqs":"200","cost":"$10.62"}|• Double volume to 200 reqs/day:  $10.62/mo|\n$calc_out.deepseek_api_cost.row.whatif_halve_volume{"reqs":"50","cost":"$2.65"}|• Halve volume to 50 reqs/day:  $2.65/mo|\n',
  ],
  faq: [
    { q: 'How much cheaper is DeepSeek than OpenAI?', a: 'DeepSeek V4.1 Flash 1017 at {{live:deepseek/deepseek-v4.1-flash-1017}} per 1M tokens costs {{liveShareMix:deepseek/deepseek-v4.1-flash-1017|openai/gpt-4o}} of GPT-4o ({{live:openai/gpt-4o}}) on a typical mixed workload. For 1,000 input + 500 output tokens at 3,000 requests/month: DeepSeek V4.1 Flash 1017 costs {{liveMonthlyAt:deepseek/deepseek-v4.1-flash-1017|3000}}/month vs {{liveMonthlyAt:openai/gpt-4o|3000}}/month for GPT-4o. The cheapest DeepSeek model, Coder ({{live:deepseek/deepseek-coder}}), costs {{liveMonthlyAt:deepseek/deepseek-coder|3000}}/month. V4 Pro at promo pricing ({{live:deepseek/deepseek-v4-pro-promo}}) still costs {{liveShareMix:deepseek/deepseek-v4-pro-promo|openai/gpt-4o}} of GPT-4o.' },
    { q: 'What is DeepSeek Automatic Caching?', a: 'DeepSeek automatically caches repeated prefix tokens (system prompts, tool schemas) with no code changes needed. Cache reads get a 98% discount (0.02x input price). On V4.1 Flash 1017, cached tokens cost just {{liveScaledIn:deepseek/deepseek-v4.1-flash-1017|0.02}} per 1M instead of {{liveIn:deepseek/deepseek-v4.1-flash-1017}}; on V4 Flash they cost {{liveScaledIn:deepseek/deepseek-v4-flash|0.02}} per 1M instead of {{liveIn:deepseek/deepseek-v4-flash}}. This is fully automatic -- no cache write configuration required.' },
    { q: 'Which DeepSeek model should I use?', a: 'V4.1 Flash 1017 ({{live:deepseek/deepseek-v4.1-flash-1017}}, 1M context) for: general chat, RAG, code completion, classification -- it is the cheapest V4-series model we track. V4 Flash ({{live:deepseek/deepseek-v4-flash}}) when you want a slightly older, more battle-tested line. V4 Pro (promo {{live:deepseek/deepseek-v4-pro-promo}}) for: complex reasoning, multi-step logic, competitive coding. Coder ({{live:deepseek/deepseek-coder}}) is the cheapest overall, for code completion and refactoring. Use Pro only when you need the strongest reasoning.' },
    { q: 'Is DeepSeek quality comparable to GPT-4o?', a: 'DeepSeek V4.1 Flash 1017 matches GPT-4o on most benchmarks while costing {{liveShareOut:deepseek/deepseek-v4.1-flash-1017|openai/gpt-4o}} of GPT-4o\'s output price ({{liveOut:deepseek/deepseek-v4.1-flash-1017}} vs {{liveOut:openai/gpt-4o}} per 1M). V4 Pro competes with GPT-5.2/Opus 4.8 for reasoning tasks. The main gap is multimodal (image/vision) capabilities where OpenAI and Claude lead. For text-only tasks, DeepSeek is the most cost-effective by far.' },
    { q: 'How do I migrate from legacy R1/V3 to V4?', a: 'Change your model parameter: deepseek-chat -> deepseek-v4-flash, deepseek-reasoner -> deepseek-v4-pro. The legacy aliases will be retired July 24, 2026. Same base URL and API key -- just update the model name. The API format is OpenAI-compatible.' },
    { q: 'Does DeepSeek have rate limits?', a: 'DeepSeek offers generous rate limits for pay-as-you-go users. During peak hours, free-tier users may experience longer queue times. Paid users get priority access. The API is OpenAI-compatible, making migration trivial from any OpenAI-based codebase.' },
    { q: 'Is DeepSeek safe for production use?', a: 'It depends on your data. DeepSeek is a Chinese company and its API endpoints are hosted in China, which is a real consideration for data residency, GDPR scope and regulated workloads. For non-personal, anonymous workloads it is widely used in production. For anything involving PII or regulated data, check residency requirements first and keep OpenAI/Claude for sensitive data. Always review the latest privacy policy for your use case.' },
    { q: "Why is DeepSeek so cheap?", a: "DeepSeek V4.1 Flash 1017 ({{live:deepseek/deepseek-v4.1-flash-1017}}) costs {{liveShareMix:deepseek/deepseek-v4.1-flash-1017|openai/gpt-5.5}} of GPT-5.5 ({{live:openai/gpt-5.5}}) and {{liveShareMix:deepseek/deepseek-v4.1-flash-1017|anthropic/claude-fable-5}} of Claude Fable 5 ({{live:anthropic/claude-fable-5}}) on a mixed workload, for similar quality on many tasks. Reasons: aggressive market entry pricing, a business model focused on volume, and a hosted-inference cost base far below the frontier labs'. Quality is competitive for non-reasoning tasks." },
    { q: "Is DeepSeek good enough for production?", a: "For many use cases, yes. DeepSeek V3 handles: classification, extraction, translation, content generation, code, simple chat. Limitations: content filters are stricter, English-only reasoning is weaker than GPT-5, hosted outside the US (latency, data residency concerns)." },
    { q: "What are the data privacy implications?", a: "DeepSeek is hosted in China. For US/EU users, this raises data residency concerns. Do not send PII or regulated data to DeepSeek API. Use it for: anonymous workloads, content generation, code assistance, internal tools. For customer-facing products with PII, prefer US-hosted providers." },
    { q: "Should I use DeepSeek for coding tasks?", a: "DeepSeek Coder ({{live:deepseek/deepseek-coder}}) is competitive with GPT-4o ({{live:openai/gpt-4o}}) for code generation — it costs {{liveShareMix:deepseek/deepseek-coder|openai/gpt-4o}} of GPT-4o on a mixed workload. Use for: code completion, refactoring, test generation, code review. For complex architecture decisions or multi-repo reasoning, Claude Sonnet 4.6 still wins. Many devs use DeepSeek Coder for the bulk + Sonnet for hard problems." },
    { q: "How does DeepSeek Reasoner compare?", a: "DeepSeek R1 ({{live:deepseek/deepseek-r1}}) is a reasoning model that rivals OpenAI o1 while costing {{liveShareMix:deepseek/deepseek-r1|openai/o1}} of o1 ({{live:openai/o1}}) on a mixed workload. Use for: math, logic, complex multi-step problems. Slower than flash models (~10-30s latency). Not for: real-time chat. Open-source weights available for self-hosting." },
    { q: "What is the promo pricing on V4 Pro?", a: "V4 Pro (Promo) at {{live:deepseek/deepseek-v4-pro-promo}} is discounted against the {{live:deepseek/deepseek-v4-pro}} list price -- {{liveShareIn:deepseek/deepseek-v4-pro-promo|deepseek/deepseek-v4-pro}} of list on input and {{liveShareOut:deepseek/deepseek-v4-pro-promo|deepseek/deepseek-v4-pro}} on output. Promo pricing may change -- check current pricing. Suitable for production workloads that can survive a price increase. For long-term cost certainty, use V4.1 Flash 1017 ({{live:deepseek/deepseek-v4.1-flash-1017}}), which is sustained low pricing." },
    { q: "How do I switch to DeepSeek from OpenAI?", a: "DeepSeek API is OpenAI-compatible. Change base URL to api.deepseek.com, swap API key. Most OpenAI SDKs work with one config change. Existing code runs unchanged. Test quality on your specific use case before fully switching — some prompts may need re-tuning." },
    { q: "What are the rate limits on DeepSeek?", a: "Free tier: minimal. Pay-as-you-go: 100-1000+ requests/minute depending on model and tier. Higher tiers available for enterprise. Soft limits on concurrent requests. Use batching and backoff to handle. Always implement retry logic." },
  ],
  howToUse: [
    'Select the DeepSeek models you want to compare (V4 Flash, V4 Pro, etc.).',
    'Enter your average input and output tokens per API call.',
    'Enter your expected daily request volume.',
    'Set the auto-cache hit rate -- DeepSeek automatically caches repeated prefixes.',
    'Add a growth rate and projection period for long-term cost planning.',
    'Review the cost comparison and see how much you save vs OpenAI, Claude, and Gemini.',
  ],
  dataLastUpdated: PRICING.lastUpdated,
  engineKey: true,
};

registerEngine(engine);

import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import PRICING from '../../data/ai-pricing.json';
import { pickInteractiveModels, pickCrossProviderModels } from '../../data/ai-pricing-popular';
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

interface ModelInfo {
  input: number;
  output: number;
  batchInput: number;
  batchOutput: number;
  name: string;
  family: 'gem4' | 'flash35' | 'pro' | 'flash3' | 'legacy';
  icon: string;
  contextWindow: string;
  order: number;
  supportsCache: boolean;
  supportsBatch: boolean;
}

// P156: build-time model set == the interactive set (8), matching the
// client-side customFn bundle. See src/data/ai-pricing-popular.ts.
const MODELS: Record<string, ModelInfo> = pickInteractiveModels(
  PRICING.llm.google.models as any,
  'google',
);

const FAMILY_LABELS: Record<string, string> = {
  gem4: 'Gemini 4 Argon',
  flash35: 'Gemini 3.5 Flash',
  pro: 'Gemini 3.1 Pro',
  flash3: 'Gemini 3 Flash',
  legacy: 'Legacy',
};

// Gemini Context Caching: cached reads at 0.1x input (90% discount), no write multiplier
const CACHE_READ_MULT = 0.1;

const DEFAULT_SELECTED = ['gemini-3.5-flash', 'gemini-3.1-pro', 'gemini-3-flash', 'gemini-1.5-flash'];

// P164: 跨供应商对比的代表模型。
//
// 「选哪个模型」与「展示名叫什么」是**编辑决定** —— 数据集的 name 字段有自己
// 的大小写约定（`Deepseek V4 Flash`），站内编辑口径是 `DeepSeek V4 Flash`，
// 所以展示名保留手写；但**价格一律从数据集派生**。
//
// 之前这张表是手写的，而且已经漂了：DeepSeek 那行手写 0.14/0.28，
// 数据集里 deepseek-v4-flash 实际 **0.3 / 1.2**（差 2.1 倍 / 4.3 倍）⇒
// 页面上「Gemini vs DeepSeek」的跨供应商对比一直在用错价。
//
// 这份清单放在 src/data/ai-pricing-popular.json 的 crossProviderModels 里
// （**唯一一份**）—— 服务端两个引擎 + 客户端 codegen 三处共用它。
const CROSS_PROVIDER: Record<string, { input: number; output: number; name: string }> =
  Object.fromEntries(
    pickCrossProviderModels('gemini').map((c) => [
      c.key,
      crossProviderModel(c.provider, c.model, c.label),
    ]),
  );

/** 取数据集里某个模型的 per-1M 输入/输出价；展示名用编辑口径。 */
function crossProviderModel(provider: string, key: string, label: string) {
  const models = (PRICING.llm as unknown as Record<string, { models: Record<string, { input: number; output: number }> }>)[provider]?.models;
  const m = models?.[key];
  if (!m) throw new Error(`cross-provider model missing from dataset: ${provider}/${key}`);
  return { input: m.input, output: m.output, name: label };
}

const PRESETS: Record<string, Record<string, string>> = {
  'Light Usage': {
    inputTokens: '500', outputTokens: '1000', requestsPerDay: '50',
    pricingMode: 'realtime', cacheReadHitRate: '80', growthRate: '0', projectionMonths: '12',
  },
  'Mid-Scale': {
    inputTokens: '2000', outputTokens: '1000', requestsPerDay: '500',
    pricingMode: 'realtime', cacheReadHitRate: '60', growthRate: '0', projectionMonths: '12',
  },
  'High Volume': {
    inputTokens: '5000', outputTokens: '2000', requestsPerDay: '10000',
    pricingMode: 'realtime', cacheReadHitRate: '50', growthRate: '0', projectionMonths: '12',
  },
  'Batch Processing': {
    inputTokens: '3000', outputTokens: '5000', requestsPerDay: '10000',
    pricingMode: 'batch', cacheReadHitRate: '0', growthRate: '0', projectionMonths: '12',
  },
  'Heavy Cache': {
    inputTokens: '2000', outputTokens: '800', requestsPerDay: '5000',
    pricingMode: 'realtime', cacheReadHitRate: '95', growthRate: '0', projectionMonths: '12',
  },
  'Enterprise': {
    inputTokens: '8000', outputTokens: '5000', requestsPerDay: '100000',
    pricingMode: 'realtime', cacheReadHitRate: '60', growthRate: '0', projectionMonths: '6',
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
  const pricingMode = (inputs.pricingMode === 'batch') ? 'batch' : 'realtime';
  const cacheReadHitRate = Math.max(0, Math.min(100, parseInt(inputs.cacheReadHitRate) || 0));
  const growthRate = Math.max(0, Math.min(50, parseFloat(inputs.growthRate) || 0));
  const projMonthsRaw = parseInt(inputs.projectionMonths);
  const projMonths = [3, 6, 12].includes(projMonthsRaw) ? projMonthsRaw : 12;

  const isBatch = pricingMode === 'batch';
  const cachingActive = !isBatch && cacheReadHitRate > 0;
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
    // Base pricing: realtime or batch
    const effInput = isBatch && info.supportsBatch ? info.batchInput : info.input;
    const effOutput = isBatch && info.supportsBatch ? info.batchOutput : info.output;

    const noCacheCostPerReq = (inTokens / 1_000_000) * effInput + (outTokens / 1_000_000) * effOutput;
    const noCacheMonthly = noCacheCostPerReq * reqsPerMonth;

    let costPerReq: number;
    if (cachingActive && info.supportsCache) {
      // Gemini Context Caching: cached portion at 0.1x input, non-cached at full input
      const cachedInput = (inTokens * hitRate / 1_000_000) * effInput * CACHE_READ_MULT;
      const nonCachedInput = (inTokens * (1 - hitRate) / 1_000_000) * effInput;
      const outputCost = (outTokens / 1_000_000) * effOutput;
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
  // P168 B3-9：⭐「📅 Pricing last updated」这一行**从卡片正文里去掉**（同一配方见 claude / deepseek）——
  //   · 页面用**徽章**显示同一个日期（dataLastUpdated →「📅 Data updated」）
  //   · codegen 写 staticExamples[0] 时也会过滤掉它（"UI badge covers it"）
  //   ⇒ 留在正文里只会与徽章重复，且让服务端输出比静态卡片多一行（G6 漂移）。
  //   ⚠️ 下面这一行**空元素保留**（原本紧跟 banner 的那一行）⇒ out 数组与 staticExamples[0] 逐行一致。
  out.push('');

  // Section 1: Header
  let headerLine = makeToken('calc_out.section.gemini_api_cost', '\u{1F916} Gemini API Cost');
  if (isBatch) {
    headerLine += ' | ' + makeToken('calc_out.section.gemini_api_cost_batch_mode', '\u{1F4E6} Batch Mode (50% discount)');
  }
  if (cachingActive) {
    headerLine += ' | ' + makeToken('calc_out.section.gemini_api_cost_context_caching', '\u{1F4BE} Context Caching: ' + cacheReadHitRate + '% hit (90% discount)', { hit: String(cacheReadHitRate) });
  }
  out.push(headerLine);
  out.push('');
  out.push(
    makeToken('calc_out.gemini_api_cost.row.input_tokens', '\u{1F4E5} Input: ' + lc(inTokens) + ' tokens/req', { tokens: lc(inTokens) }) + ' | ' +
    makeToken('calc_out.gemini_api_cost.row.output_tokens', '\u{1F4E4} Output: ' + lc(outTokens) + ' tokens/req', { tokens: lc(outTokens) }) + ' | ' +
    makeToken('calc_out.gemini_api_cost.row.requests_per_day', '\u{1F504} ' + lc(reqPerDay) + ' reqs/day', { reqs: lc(reqPerDay) }) + ' | ' +
    (isBatch
      ? makeToken('calc_out.gemini_api_cost.row.mode_batch', '\u{1F4E6} Batch')
      : makeToken('calc_out.gemini_api_cost.row.mode_realtime', '⚡ Real-time')),
  );
  out.push('');

  // Section 2: Bar Chart
  out.push(makeToken('calc_out.gemini_api_cost.row.cost_comparison_header', '📊 Cost Comparison (' + lc(reqPerDay) + ' reqs/day)', { reqs: lc(reqPerDay) }));
  out.push(SEP.repeat(54));
  const BAR_WIDTH = 40;
  for (const c of allCosts) {
    const icon = c.info.icon;
    const label = icon + ' ' + c.info.name;
    const barLen = maxCost > 0 ? Math.max(1, Math.round((c.monthlyCost / maxCost) * BAR_WIDTH)) : 1;
    const barChar = c.key === cheapest.key ? '░' : '█';
    const bar = barChar.repeat(barLen);
    const suffix = isBatch && !c.info.supportsBatch ? ' (no batch)' : '';
    const isCheapest = c.key === cheapest.key;
    const badge = isCheapest ? ' 🏆' : '';
    out.push(pad(label, 28) + ' ' + pad(bar, BAR_WIDTH) + ' ' + fmt(c.monthlyCost) + suffix + badge);
  }
  out.push('');
  out.push('');

  // Section 3: Detail Cards — selected models
  out.push('$calc_out.section.gemini_api_cost_selected_models|📋 Selected Model Details|');
  out.push(SEP.repeat(60));
  for (const c of selectedCosts) {
    const icon = c.info.icon;
    const famLabel = FAMILY_LABELS[c.info.family];
    const dailyCost = c.costPerReq * reqPerDay;
    const annualCost = c.monthlyCost * 12;

    // P168 B3-9：⭐ 型号名留在 token 外（专有名词不该被译）；只把**系列标签**与
    //   「Context: …」包进 token ⇒ zh 页那一行不再是整行英文。
    const familyToken =
      c.info.family === 'gem4'
        ? makeToken('calc_out.gemini_api_cost.row.family_gem4', '(' + famLabel + ')')
        : c.info.family === 'flash35'
          ? makeToken('calc_out.gemini_api_cost.row.family_flash35', '(' + famLabel + ')')
          : c.info.family === 'pro'
            ? makeToken('calc_out.gemini_api_cost.row.family_pro', '(' + famLabel + ')')
            : c.info.family === 'flash3'
              ? makeToken('calc_out.gemini_api_cost.row.family_flash3', '(' + famLabel + ')')
              : makeToken('calc_out.gemini_api_cost.row.family_legacy', '(' + famLabel + ')');
    out.push(
      icon + ' ' + c.info.name + ' ' + familyToken +
      ' | ' + makeToken('calc_out.gemini_api_cost.row.context_window', 'Context: ' + c.info.contextWindow, { context: c.info.contextWindow }),
    );
    out.push(SEP.repeat(44));

    const effInRate = isBatch && c.info.supportsBatch ? c.info.batchInput : c.info.input;
    const effOutRate = isBatch && c.info.supportsBatch ? c.info.batchOutput : c.info.output;
    const inputCostLine = (inTokens / 1_000_000) * effInRate;
    const outputCostLine = (outTokens / 1_000_000) * effOutRate;
    out.push(
      makeToken(
        'calc_out.gemini_api_cost.row.input_cost',
        'Input:  ' +
          pad(lc(inTokens), 7) +
          ' tokens × ' +
          fmt(effInRate) +
          '/1M → ' +
          fmt(inputCostLine) +
          '/req',
        { tokens: lc(inTokens), rate: fmt(effInRate), cost: fmt(inputCostLine) },
      ),
    );
    out.push(
      makeToken(
        'calc_out.gemini_api_cost.row.output_cost',
        'Output: ' +
          pad(lc(outTokens), 7) +
          ' tokens × ' +
          fmt(effOutRate) +
          '/1M → ' +
          fmt(outputCostLine) +
          '/req',
        { tokens: pad(lc(outTokens), 7), rate: fmt(effOutRate), cost: fmt(outputCostLine) },
      ),
    );

    // Batch rate line for models that support it
    if (!isBatch && c.info.supportsBatch) {
      out.push(
        makeToken(
          'calc_out.gemini_api_cost.row.batch_rate',
          '  Batch Rate: ' + fmt(c.info.batchInput) + '/' + fmt(c.info.batchOutput) + ' per 1M tokens',
          { input: fmt(c.info.batchInput), output: fmt(c.info.batchOutput) },
        ),
      );
    } else if (!c.info.supportsBatch) {
      out.push('$calc_out.gemini_api_cost.row.batch_na|  ⚠ Batch: N/A for this model|');
    }

    out.push(SEP.repeat(44));
    out.push(makeToken('calc_out.label.per_request', 'Per request') + ':    ' + fmt(c.costPerReq));
    out.push(makeToken('calc_out.label.daily', 'Daily') + ' (' + reqPerDay + '):    ' + fmt(dailyCost));
    out.push(makeToken('calc_out.label.monthly', 'Monthly') + ' (30d):  ' + fmt(c.monthlyCost));
    out.push(makeToken('calc_out.label.annual', 'Annual') + ':         ' + fmt(annualCost));
    out.push(SEP.repeat(44));

    // Context caching savings per model
    if (cachingActive && c.info.supportsCache) {
      const savings = c.noCacheMonthly - c.monthlyCost;
      const pctSaved = c.noCacheMonthly > 0 ? Math.round((savings / c.noCacheMonthly) * 100) : 0;
      out.push(
        makeToken(
          'calc_out.gemini_api_cost.row.context_cache_savings',
          '💾 Context cache at ' +
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
    } else if (cachingActive && !c.info.supportsCache) {
      out.push('$calc_out.gemini_api_cost.row.cache_unavailable|🚫 Context caching not available for this model|');
    }

    out.push('');
  }

  // Section 4: Growth Projection
  if (growthRate > 0) {
    out.push(makeToken('calc_out.gemini_api_cost.row.growth_projection', '\u{1F4C8} Growth Projection (' + growthRate + '%/month, ' + projMonths + ' months)', { growth: String(growthRate), months: String(projMonths) }));
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
  out.push('$calc_out.section.gemini_api_cost_savings_insights|💰 Savings Insights|');
  out.push(SEP.repeat(60));

  const cheapestGem = allCosts.reduce((min, c) => c.monthlyCost < min.monthlyCost ? c : min);
  out.push(
    makeToken('calc_out.gemini_api_cost.row.cheapest', '🏆 Cheapest: ' + cheapestGem.info.name + ' at ' + fmt(cheapestGem.monthlyCost) + '/mo', { model: cheapestGem.info.name, cost: fmt(cheapestGem.monthlyCost) }),
  );

  // Best value (non-legacy Gemini 3 family)
  const bestValue = allCosts
    .filter((c) => c.info.family !== 'legacy')
    .reduce((min, c) => (c.monthlyCost < min.monthlyCost ? c : min), allCosts[0]);
  if (bestValue && bestValue.key !== cheapestGem.key) {
    out.push(
      makeToken('calc_out.gemini_api_cost.row.best_value', '⭐ Best value (Gemini 3 series): ' + bestValue.info.name + ' at ' + fmt(bestValue.monthlyCost) + '/mo', { model: bestValue.info.name, cost: fmt(bestValue.monthlyCost) }),
    );
  }

  // Switching savings
  if (selectedCosts.length >= 2) {
    const mostExpSelected = selectedCosts.reduce((max, c) => c.monthlyCost > max.monthlyCost ? c : max);
    const cheapSelected = selectedCosts.reduce((min, c) => c.monthlyCost < min.monthlyCost ? c : min);
    const diff = mostExpSelected.monthlyCost - cheapSelected.monthlyCost;
    out.push(
      makeToken('calc_out.gemini_api_cost.row.switching_savings', '💸 Switching from ' + mostExpSelected.info.name + ' to ' + cheapSelected.info.name + ' saves ' + fmt(diff) + '/mo (' + fmt(diff * 12) + '/yr)', { from: mostExpSelected.info.name, to: cheapSelected.info.name, saved: fmt(diff), yearly: fmt(diff * 12) }),
    );
  }

  // Caching tip
  if (cachingActive && selectedCosts.length > 0) {
    const ref = selectedCosts[0];
    const savings = ref.noCacheMonthly - ref.monthlyCost;
    out.push(
      makeToken('calc_out.gemini_api_cost.row.cache_summary', '💾 Context cache at ' + cacheReadHitRate + '% hit rate saves ~' + fmt(savings) + '/mo on ' + ref.info.name, { rate: String(cacheReadHitRate), saved: fmt(savings), model: ref.info.name }),
    );
  }

  // Cross-provider comparison
  for (const [provKey, prov] of Object.entries(CROSS_PROVIDER)) {
    const provMonthly = ((inTokens / 1_000_000) * prov.input + (outTokens / 1_000_000) * prov.output) * reqsPerMonth;
    const savings = provMonthly - cheapestGem.monthlyCost;
    const pct = provMonthly > 0 ? Math.round((savings / provMonthly) * 100) : 0;
    const cheaper = savings > 0;
    if (cheaper) {
      out.push(
        makeToken('calc_out.gemini_api_cost.row.cross_provider_cheaper', '🌍 ' + cheapestGem.info.name + ' vs ' + prov.name + ': saves ' + fmt(savings) + '/month (' + pct + '% cheaper)', { model: cheapestGem.info.name, provider: prov.name, saved: fmt(savings), pct: String(pct) }),
      );
    } else {
      out.push(
        makeToken('calc_out.gemini_api_cost.row.cross_provider_pricier', '🌍 ' + cheapestGem.info.name + ' vs ' + prov.name + ': costs ' + fmt(-savings) + '/month more', { model: cheapestGem.info.name, provider: prov.name, extra: fmt(-savings) }),
      );
    }
  }
  // P164: 这句里的模型名、价格、缓存模型数全部改为派生。
  // 原句写死了 "Gemini 3 Flash" / "$0.50/$3.00" / "the newest 3 models" ——
  // 前两个数值虽然此刻与数据集一致，但没有任何东西保证它们下次刷新还一致；
  // 第三个**当时就是错的**：数据集里 supportsCache 的模型有 **5** 个
  // （3.1-pro / 3-flash / 3.5-flash / 3.8-flash / 4-argon），两个 legacy 不支持。
  const gf = MODELS['gemini-3-flash'];
  const cacheModelCount = Object.values(MODELS).filter((m) => m.supportsCache).length;
  out.push(
    makeToken(
      'calc_out.gemini_api_cost.row.tip_cheapest_frontier',
      '💡 ' + gf.name + ' is the cheapest frontier-quality model at $' +
        gf.input.toFixed(2) + '/$' + gf.output.toFixed(2) +
        ' per 1M tokens. Context Caching saves 90% on repeated prompts for the ' +
        cacheModelCount + ' models that support it.',
      { model: gf.name, input: '$' + gf.input.toFixed(2), output: '$' + gf.output.toFixed(2), count: String(cacheModelCount) },
    ),
  );
  out.push('');

  // Section 6: Usage Scenarios
  out.push(makeToken('calc_out.gemini_api_cost.row.usage_scenarios', '📅 Usage Scenarios (monthly cost at ' + lc(reqPerDay) + ' reqs/day)', { reqs: lc(reqPerDay) }));
  out.push('');
  const volumes = [50, 100, 500, 1000, 5000, 10000];
  for (const c of selectedCosts) {
    const icon = c.info.icon;
    const parts: string[] = [];
    for (const v of volumes) {
      parts.push(lc(v) + '→' + fmt(c.costPerReq * v * 30));
    }
    // P168 B3-9：整行**令牌化**（原先是裸文本 ⇒ zh 卡片这一行仍是英文）
    //   ⇒ 图标 / 型号 / 6 档用量全部走 {param} ⇒ zh 侧可整行中文化。
    out.push(
      makeToken(
        'calc_out.gemini_api_cost.row.usage_scenario_line',
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
  out.push('$calc_out.section.gemini_api_cost_health|🩺 Cost Health:|');
  out.push(SEP.repeat(60));
  const totalSelectedMonthly = selectedCosts.reduce((s, c) => s + c.monthlyCost, 0);
  const cheapestSelected = selectedCosts.reduce((min, c) => c.monthlyCost < min.monthlyCost ? c : min);
  const expensiveSelected = selectedCosts.reduce((max, c) => c.monthlyCost > max.monthlyCost ? c : max);
  if (selectedCosts.length >= 2) {
    const ratio = expensiveSelected.monthlyCost / Math.max(cheapestSelected.monthlyCost, 0.01);
    if (ratio >= 50) out.push(makeToken('calc_out.gemini_api_cost.row.health_spread_50x', '• 🔴 Your most expensive selection costs ' + ratio.toFixed(0) + 'x your cheapest — consider mixing tiers.', { ratio: ratio.toFixed(0) }));
    else if (ratio >= 10) out.push(makeToken('calc_out.gemini_api_cost.row.health_spread_10x', '• 🟠 ' + ratio.toFixed(0) + 'x cost spread across selected models — review if every model needs to be premium.', { ratio: ratio.toFixed(0) }));
    else out.push(makeToken('calc_out.gemini_api_cost.row.health_spread_healthy', '• 🟢 Healthy cost spread (' + ratio.toFixed(1) + 'x) across selected models.', { ratio: ratio.toFixed(1) }));
  }
  if (cheapestSelected) {
    const tierModel = cheapestSelected.info.name;
    const tierCost = fmt(cheapestSelected.monthlyCost);
    // ⚠️ 四档**各有自己的 code**（而不是「一个 code + 四种兜底」）⇒ locale 的 en 值与运行时兜底永远一致。
    if (cheapestSelected.monthlyCost < 5) {
      out.push(makeToken('calc_out.gemini_api_cost.row.health_tier_micro', '• 🟢 Micro-tier (under $5/mo) — ' + tierModel + ' at ' + tierCost + '/mo.', { model: tierModel, cost: tierCost }));
    } else if (cheapestSelected.monthlyCost < 50) {
      out.push(makeToken('calc_out.gemini_api_cost.row.health_tier_low', '• 🟢 Low-volume tier — ' + tierModel + ' at ' + tierCost + '/mo.', { model: tierModel, cost: tierCost }));
    } else if (cheapestSelected.monthlyCost < 500) {
      out.push(makeToken('calc_out.gemini_api_cost.row.health_tier_mid', '• 🟡 Mid-volume tier — ' + tierModel + ' at ' + tierCost + '/mo.', { model: tierModel, cost: tierCost }));
    } else {
      out.push(makeToken('calc_out.gemini_api_cost.row.health_tier_high', '• 🟠 High-volume tier — ' + tierModel + ' at ' + tierCost + '/mo.', { model: tierModel, cost: tierCost }));
    }
  }
  if (cacheReadHitRate === 0) {
    out.push('$calc_out.gemini_api_cost.row.health_cache_zero|• ⚠️ Cache hit rate is 0% — enabling prompt caching on repeated prefixes can cut cost 40-90%.|');
  } else if (cacheReadHitRate < 30) {
    out.push(makeToken('calc_out.gemini_api_cost.row.health_cache_low', '• 🟡 Low cache hit rate (' + cacheReadHitRate + '%) — review if your prompt has stable system instructions.', { rate: String(cacheReadHitRate) }));
  } else {
    out.push(makeToken('calc_out.gemini_api_cost.row.health_cache_healthy', '• 🟢 Healthy cache rate (' + cacheReadHitRate + '%) — keep an eye on cache TTL vs your traffic pattern.', { rate: String(cacheReadHitRate) }));
  }
  if (pricingMode === 'realtime') {
    const batchSavings = totalSelectedMonthly * 0.5;
    out.push(makeToken('calc_out.gemini_api_cost.row.batch_pricing_tip', '• 💡 Switch to batch pricing: save ~' + fmt(batchSavings) + '/mo (50% discount) if latency is not critical.', { saved: fmt(batchSavings) }));
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
    if (savings > 0) out.push(makeToken('calc_out.gemini_api_cost.row.whatif_switch_cheapest', '• Switch cheapest to ' + popularCheapest.info.name + ':  save ' + fmt(savings) + '/mo  (similar quality, much cheaper)', { model: popularCheapest.info.name, saved: fmt(savings) }));
  }
  out.push(makeToken('calc_out.gemini_api_cost.row.whatif_double_volume', '• Double volume to ' + lc(reqPerDay * 2) + ' reqs/day:  ' + fmt(totalSelectedMonthly * 2) + '/mo', { reqs: lc(reqPerDay * 2), cost: fmt(totalSelectedMonthly * 2) }));
  out.push(makeToken('calc_out.gemini_api_cost.row.whatif_halve_volume', '• Halve volume to ' + lc(Math.max(1, Math.floor(reqPerDay / 2))) + ' reqs/day:  ' + fmt(totalSelectedMonthly / 2) + '/mo', { reqs: lc(Math.max(1, Math.floor(reqPerDay / 2))), cost: fmt(totalSelectedMonthly / 2) }));
  if (cacheReadHitRate < 50) {
    const cacheFactor = 0.5 + 0.5 * (1 - 0.5 * 0.9);
    const cachedMonthly = totalSelectedMonthly * cacheFactor;
    const cacheSavings = totalSelectedMonthly - cachedMonthly;
    out.push(makeToken('calc_out.gemini_api_cost.row.whatif_boost_cache', '• Boost cache hit rate to 50%:  save ~' + fmt(cacheSavings) + '/mo  (' + fmt(totalSelectedMonthly) + ' → ' + fmt(cachedMonthly) + ')', { saved: fmt(cacheSavings), current: fmt(totalSelectedMonthly), boosted: fmt(cachedMonthly) }));
  }
  out.push('');
  return out;
}

// customFn — exact sync with calculate()
const customFn =
  // P168 B3-9：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 服务端与客户端输出逐字节相同，不可能漂移；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS +
  "var M={'gemini-4-argon':{i:2,o:10,bi:1,bo:5,n:'Gemini 4 Argon',f:'gem4',ic:'★',cw:'1M',od:1,sc:true,sb:true},'gemini-3.8-flash':{i:0.75,o:3.75,bi:0.375,bo:1.875,n:'Gemini 3.8 Flash',f:'flash3',ic:'◆',cw:'1M',od:2,sc:true,sb:true},'gemini-3.5-flash':{i:1.5,o:9,bi:0.375,bo:2.25,n:'Gemini 3.5 Flash',f:'flash35',ic:'●',cw:'1M',od:3,sc:true,sb:true},'gemini-3.1-pro':{i:2,o:12,bi:1,bo:6,n:'Gemini 3.1 Pro',f:'pro',ic:'▲',cw:'1M',od:4,sc:true,sb:true},'gemini-3-flash':{i:0.5,o:3,bi:0.25,bo:1.5,n:'Gemini 3 Flash',f:'flash3',ic:'◆',cw:'1M',od:5,sc:true,sb:true},'gemini-2.5-flash':{i:0.3,o:2.5,bi:0,bo:0,n:'Gemini 2.5 Flash',f:'legacy',ic:'◇',cw:'1M',od:6,sc:false,sb:false},'gemini-1.5-pro':{i:3.5,o:10.5,bi:0,bo:0,n:'Gemini 1.5 Pro',f:'legacy',ic:'◇',cw:'2M',od:7,sc:false,sb:false},'gemini-1.5-flash':{i:0.075,o:0.3,bi:0,bo:0,n:'Gemini 1.5 Flash',f:'legacy',ic:'◇',cw:'1M',od:8,sc:false,sb:false}};\nvar XP={openai:{i:0.05,o:0.4,n:'GPT-5 Nano'},claude:{i:0.25,o:1.25,n:'Claude Haiku 3'},deepseek:{i:0.3,o:1.2,n:'DeepSeek V4 Flash'}};" +

  "var FL={gem4:'Gemini 4 Argon',flash35:'Gemini 3.5 Flash',pro:'Gemini 3.1 Pro',flash3:'Gemini 3 Flash',legacy:'Legacy'};" +
  "var DEF=['gemini-3.5-flash','gemini-3.1-pro','gemini-3-flash','gemini-1.5-flash'];" +
  "var CRM=0.1;" +
  "function fm(n){if(Math.abs(n)<0.01&&n!==0)return '$'+n.toFixed(4);return '$'+n.toFixed(2)}" +
  "function lc(n){return n.toLocaleString()}" +
  "function pd(s,l){return s+' '.repeat(Math.max(0,l-s.length))}" +
  "var SEP2='\\u2500';" +
  "var rawM=inputs.models||DEF.join(',');var sks=[];var seen={};rawM.split(',').forEach(function(s){s=s.trim();if(s&&!seen[s]){seen[s]=true;sks.push(s);}});" +
  "var iT=Math.max(1,Math.min(1e7,parseInt(inputs.inputTokens)||1000));" +
  "var oT=Math.max(1,Math.min(1e7,parseInt(inputs.outputTokens)||500));" +
  "var rpd=Math.max(0,Math.min(1e6,parseInt(inputs.requestsPerDay)||100));" +
  "var pMode=inputs.pricingMode==='batch'?'batch':'realtime';" +
  "var cHR=Math.max(0,Math.min(100,parseInt(inputs.cacheReadHitRate)||0));" +
  "var gR=Math.max(0,Math.min(50,parseFloat(inputs.growthRate)||0));" +
  "var pMraw=parseInt(inputs.projectionMonths);var pM=[3,6,12].indexOf(pMraw)>=0?pMraw:12;" +
  "var isBatch=pMode==='batch';var cacheOn=!isBatch&&cHR>0;var hR=cHR/100;var rpm=rpd*30;" +
  "var all=[];" +
  "for(var k in M){var mi=M[k];var ei=isBatch&&mi.sb?mi.bi:mi.i;var eo=isBatch&&mi.sb?mi.bo:mi.o;" +
  "var ncpr=(iT/1e6)*ei+(oT/1e6)*eo;var ncm=ncpr*rpm;var cpr;" +
  "if(cacheOn&&mi.sc){var ci=(iT*hR/1e6)*ei*CRM;var nci=(iT*(1-hR)/1e6)*ei;cpr=ci+nci+(oT/1e6)*eo;}else{cpr=ncpr;}" +
  "var mc=cpr*rpm;all.push({k:k,i:mi,cpr:cpr,mc:mc,ncpr:ncpr,ncm:ncm});}" +
  "all.sort(function(a,b){return a.i.od-b.i.od;});" +
  "var ch=all.reduce(function(min,c){return c.mc<min.mc?c:min;});" +
  "var mx=all.reduce(function(max,c){return c.mc>max.mc?c:max;}).mc;" +
  "var sc=[];for(var i=0;i<sks.length;i++){var e=all.find(function(c){return c.k===sks[i];});if(e)sc.push(e);}" +
  "if(sc.length===0){for(var j=0;j<DEF.length;j++){var e2=all.find(function(c){return c.k===DEF[j];});if(e2)sc.push(e2);}}" +
  "var o=[];" +
  "o.push('');" +
  "var hl=tk('calc_out.section.gemini_api_cost','\\u{1F916} Gemini API Cost');if(isBatch){hl+=' | '+tk('calc_out.section.gemini_api_cost_batch_mode','\\u{1F4E6} Batch Mode (50% discount)');}" +
  "if(cacheOn){hl+=' | '+tk('calc_out.section.gemini_api_cost_context_caching','\\u{1F4BE} Context Caching: '+cHR+'% hit (90% discount)',{hit:String(cHR)});}" +
  "o.push(hl);o.push('');" +
  "o.push(tk('calc_out.gemini_api_cost.row.input_tokens','\\u{1F4E5} Input: '+lc(iT)+' tokens/req',{tokens:lc(iT)})+' | '+tk('calc_out.gemini_api_cost.row.output_tokens','\\u{1F4E4} Output: '+lc(oT)+' tokens/req',{tokens:lc(oT)})+' | '+tk('calc_out.gemini_api_cost.row.requests_per_day','\\u{1F504} '+lc(rpd)+' reqs/day',{reqs:lc(rpd)})+' | '+(isBatch?tk('calc_out.gemini_api_cost.row.mode_batch','\\u{1F4E6} Batch'):tk('calc_out.gemini_api_cost.row.mode_realtime','\\u26A1 Real-time')));o.push('');" +
  "o.push(tk('calc_out.gemini_api_cost.row.cost_comparison_header','\\u{1F4CA} Cost Comparison ('+lc(rpd)+' reqs/day)',{reqs:lc(rpd)}));o.push(SEP2.repeat(54));" +
  "var BW=40;for(var i=0;i<all.length;i++){var c=all[i];var icon=c.i.ic;var label=icon+' '+c.i.n;" +
  "var bl=mx>0?Math.max(1,Math.round((c.mc/mx)*BW)):1;var bc=c.k===ch.k?'\\u2591':'\\u2588';" +
  "var sf=isBatch&&!c.i.sb?' (no batch)':'';var bd=c.k===ch.k?' \\u{1F3C6}':'';" +
  "o.push(pd(label,28)+' '+pd(bc.repeat(bl),BW)+' '+fm(c.mc)+sf+bd);}o.push('');o.push('');" +
  "o.push('$calc_out.section.gemini_api_cost_selected_models|\\u{1F4CB} Selected Model Details|');o.push(SEP2.repeat(60));" +
  "for(var i=0;i<sc.length;i++){var c=sc[i];var icon=c.i.ic;var dc2=c.cpr*rpd;var ann=c.mc*12;" +
  "var ftok=c.i.f==='gem4'?tk('calc_out.gemini_api_cost.row.family_gem4','('+FL[c.i.f]+')'):c.i.f==='flash35'?tk('calc_out.gemini_api_cost.row.family_flash35','('+FL[c.i.f]+')'):c.i.f==='pro'?tk('calc_out.gemini_api_cost.row.family_pro','('+FL[c.i.f]+')'):c.i.f==='flash3'?tk('calc_out.gemini_api_cost.row.family_flash3','('+FL[c.i.f]+')'):tk('calc_out.gemini_api_cost.row.family_legacy','('+FL[c.i.f]+')');" +
  "o.push(icon+' '+c.i.n+' '+ftok+' | '+tk('calc_out.gemini_api_cost.row.context_window','Context: '+c.i.cw,{context:c.i.cw}));" +
  "o.push(SEP2.repeat(44));" +
  "var ei2=isBatch&&c.i.sb?c.i.bi:c.i.i;var eo2=isBatch&&c.i.sb?c.i.bo:c.i.o;" +
  "var icl=(iT/1e6)*ei2;var ocl=(oT/1e6)*eo2;" +
  "o.push(tk('calc_out.gemini_api_cost.row.input_cost','Input:  '+pd(lc(iT),7)+' tokens \\u00d7 '+fm(ei2)+'/1M \\u2192 '+fm(icl)+'/req',{tokens:lc(iT),rate:fm(ei2),cost:fm(icl)}));" +
  "o.push(tk('calc_out.gemini_api_cost.row.output_cost','Output: '+pd(lc(oT),7)+' tokens \\u00d7 '+fm(eo2)+'/1M \\u2192 '+fm(ocl)+'/req',{tokens:pd(lc(oT),7),rate:fm(eo2),cost:fm(ocl)}));" +
  "if(!isBatch&&c.i.sb){o.push(tk('calc_out.gemini_api_cost.row.batch_rate','  Batch Rate: '+fm(c.i.bi)+'/'+fm(c.i.bo)+' per 1M tokens',{input:fm(c.i.bi),output:fm(c.i.bo)}));}" +
  "else if(!c.i.sb){o.push('$calc_out.gemini_api_cost.row.batch_na|  \\u26A0 Batch: N/A for this model|');}" +
  "o.push(SEP2.repeat(44));" +
  "o.push(tk('calc_out.label.per_request','Per request')+':    '+fm(c.cpr));" +
  "o.push(tk('calc_out.label.daily','Daily')+' ('+rpd+'):    '+fm(dc2));" +
  "o.push(tk('calc_out.label.monthly','Monthly')+' (30d):  '+fm(c.mc));" +
  "o.push(tk('calc_out.label.annual','Annual')+':         '+fm(ann));" +
  "o.push(SEP2.repeat(44));" +
  "if(cacheOn&&c.i.sc){var sv=c.ncm-c.mc;var ps=c.ncm>0?Math.round((sv/c.ncm)*100):0;o.push(tk('calc_out.gemini_api_cost.row.context_cache_savings','\\u{1F4BE} Context cache at '+cHR+'% hit: '+fm(c.mc)+'/mo \\u2014 saves '+fm(sv)+'/mo ('+ps+'%)',{rate:String(cHR),cost:fm(c.mc),saved:fm(sv),pct:String(ps)}));}" +
  "else if(cacheOn&&!c.i.sc){o.push('$calc_out.gemini_api_cost.row.cache_unavailable|\\u{1F6AB} Context caching not available for this model|');}" +
  "o.push('');}" +
  "if(gR>0){" +
  "o.push(tk('calc_out.gemini_api_cost.row.growth_projection','\\u{1F4C8} Growth Projection ('+gR+'%/month, '+pM+' months)',{growth:String(gR),months:String(pM)}));o.push('');" +
  "var mCell='Month'.padEnd(8);var hdr=tk('calc_out.label.month','Month')+mCell.slice(5);for(var i=0;i<sc.length;i++)hdr+=' | '+sc[i].i.n.padEnd(16);o.push(hdr);" +
  "var sl=''.padEnd(8,SEP2);for(var i=0;i<sc.length;i++)sl+='-+-'.padEnd(17,SEP2);o.push(sl);" +
  "var gm=1+gR/100;" +
  "for(var m=1;m<=pM;m++){var mult=Math.pow(gm,m-1);var row=String(m).padEnd(8);for(var i=0;i<sc.length;i++)row+=' | '+fm(sc[i].mc*mult).padEnd(16);o.push(row);}" +
  "o.push(sl);" +
  "var tCell='Total'.padEnd(8);var tr=tk('calc_out.label.total','Total')+tCell.slice(5);for(var i=0;i<sc.length;i++){var cum=0;for(var m=1;m<=pM;m++)cum+=sc[i].mc*Math.pow(gm,m-1);tr+=' | '+fm(cum).padEnd(16);}o.push(tr);" +
  "o.push('');}" +
  "o.push('$calc_out.section.gemini_api_cost_savings_insights|\\u{1F4B0} Savings Insights|');o.push(SEP2.repeat(60));" +
  "var cheapestG=all.reduce(function(min,c){return c.mc<min.mc?c:min;});" +
  "o.push(tk('calc_out.gemini_api_cost.row.cheapest','\\u{1F3C6} Cheapest: '+cheapestG.i.n+' at '+fm(cheapestG.mc)+'/mo',{model:cheapestG.i.n,cost:fm(cheapestG.mc)}));" +
  "var flt2=all.filter(function(c){return c.i.f!=='legacy';});" +
  "var bv=flt2.length>0?flt2.reduce(function(mn,c){return c.mc<mn.mc?c:mn;}):null;" +
  "if(bv&&bv.k!==cheapestG.k){o.push(tk('calc_out.gemini_api_cost.row.best_value','\\u2B50 Best value (Gemini 3 series): '+bv.i.n+' at '+fm(bv.mc)+'/mo',{model:bv.i.n,cost:fm(bv.mc)}));}" +
  "if(sc.length>=2){" +
  "var meS=sc.reduce(function(max,c){return c.mc>max.mc?c:max;});" +
  "var chS=sc.reduce(function(min,c){return c.mc<min.mc?c:min;});" +
  "var df2=meS.mc-chS.mc;" +
  "o.push(tk('calc_out.gemini_api_cost.row.switching_savings','\\u{1F4B8} Switching from '+meS.i.n+' to '+chS.i.n+' saves '+fm(df2)+'/mo ('+fm(df2*12)+'/yr)',{from:meS.i.n,to:chS.i.n,saved:fm(df2),yearly:fm(df2*12)}));}" +
  "if(cacheOn&&sc.length>0){" +
  "var ref2=sc[0];var sv3=ref2.ncm-ref2.mc;" +
  "o.push(tk('calc_out.gemini_api_cost.row.cache_summary','\\u{1F4BE} Context cache at '+cHR+'% hit rate saves ~'+fm(sv3)+'/mo on '+ref2.i.n,{rate:String(cHR),saved:fm(sv3),model:ref2.i.n}));}" +
  "for(var pk in XP){var pv=XP[pk];var pm2=((iT/1e6)*pv.i+(oT/1e6)*pv.o)*rpm;var sv2=pm2-cheapestG.mc;var pct=pm2>0?Math.round((sv2/pm2)*100):0;" +
  "var cheaper=sv2>0;if(cheaper){o.push(tk('calc_out.gemini_api_cost.row.cross_provider_cheaper','\\u{1F30D} '+cheapestG.i.n+' vs '+pv.n+': saves '+fm(sv2)+'/month ('+pct+'% cheaper)',{model:cheapestG.i.n,provider:pv.n,saved:fm(sv2),pct:String(pct)}));}" +
  "else{o.push(tk('calc_out.gemini_api_cost.row.cross_provider_pricier','\\u{1F30D} '+cheapestG.i.n+' vs '+pv.n+': costs '+fm(-sv2)+'/month more',{model:cheapestG.i.n,provider:pv.n,extra:fm(-sv2)}));}}" +
  "var gf3=M['gemini-3-flash'];var ccm=0;for(var kk in M){if(M[kk].sc)ccm++;}" +
  "o.push(tk('calc_out.gemini_api_cost.row.tip_cheapest_frontier','\\u{1F4A1} '+gf3.n+' is the cheapest frontier-quality model at $'+gf3.i.toFixed(2)+'/$'+gf3.o.toFixed(2)+' per 1M tokens. Context Caching saves 90% on repeated prompts for the '+ccm+' models that support it.',{model:gf3.n,input:'$'+gf3.i.toFixed(2),output:'$'+gf3.o.toFixed(2),count:String(ccm)}));" +
  "o.push('');" +
  "o.push(tk('calc_out.gemini_api_cost.row.usage_scenarios','\\u{1F4C5} Usage Scenarios (monthly cost at '+lc(rpd)+' reqs/day)',{reqs:lc(rpd)}));o.push('');" +
  "var vols=[50,100,500,1000,5000,10000];" +
  "for(var i=0;i<sc.length;i++){var c=sc[i];var icon=c.i.ic;var pts=[];" +
  "for(var j=0;j<vols.length;j++){pts.push(lc(vols[j])+'\\u2192'+fm(c.cpr*vols[j]*30));}" +
  "o.push(tk('calc_out.gemini_api_cost.row.usage_scenario_line',icon+' '+c.i.n+': '+pts.join(' \\u00b7 '),{icon:icon,model:c.i.n,v50:pts[0],v100:pts[1],v500:pts[2],v1k:pts[3],v5k:pts[4],v10k:pts[5]}));}" +
  // P168 B3-9：🩺 Cost Health + 🔄 What-If 两段**客户端原本缺失**（服务端有）
  //   ⇒ 与服务端逐字补齐（同一配方见 deepseek B3-10）⇒ 两端输出逐字节一致。
  "o.push('');" +
  "o.push('$calc_out.section.gemini_api_cost_health|\\uD83E\\uDE7A Cost Health:|');o.push(SEP2.repeat(60));" +
  "var totSel=0;for(var i=0;i<sc.length;i++)totSel+=sc[i].mc;" +
  "var chSel=sc.reduce(function(min,c){return c.mc<min.mc?c:min;});" +
  "var exSel=sc.reduce(function(max,c){return c.mc>max.mc?c:max;});" +
  "if(sc.length>=2){var ratio=exSel.mc/Math.max(chSel.mc,0.01);" +
  "if(ratio>=50)o.push(tk('calc_out.gemini_api_cost.row.health_spread_50x','\\u2022 \\uD83D\\uDD34 Your most expensive selection costs '+ratio.toFixed(0)+'x your cheapest \\u2014 consider mixing tiers.',{ratio:ratio.toFixed(0)}));" +
  "else if(ratio>=10)o.push(tk('calc_out.gemini_api_cost.row.health_spread_10x','\\u2022 \\uD83D\\uDFE0 '+ratio.toFixed(0)+'x cost spread across selected models \\u2014 review if every model needs to be premium.',{ratio:ratio.toFixed(0)}));" +
  "else o.push(tk('calc_out.gemini_api_cost.row.health_spread_healthy','\\u2022 \\uD83D\\uDFE2 Healthy cost spread ('+ratio.toFixed(1)+'x) across selected models.',{ratio:ratio.toFixed(1)}));}" +
  "var tM=chSel.i.n;var tC=fm(chSel.mc);" +
  "if(chSel.mc<5)o.push(tk('calc_out.gemini_api_cost.row.health_tier_micro','\\u2022 '+'🟢 Micro-tier (under $5/mo)'+' \\u2014 '+tM+' at '+tC+'/mo.',{model:tM,cost:tC}));" +
  "else if(chSel.mc<50)o.push(tk('calc_out.gemini_api_cost.row.health_tier_low','\\u2022 '+'🟢 Low-volume tier'+' \\u2014 '+tM+' at '+tC+'/mo.',{model:tM,cost:tC}));" +
  "else if(chSel.mc<500)o.push(tk('calc_out.gemini_api_cost.row.health_tier_mid','\\u2022 '+'🟡 Mid-volume tier'+' \\u2014 '+tM+' at '+tC+'/mo.',{model:tM,cost:tC}));" +
  "else o.push(tk('calc_out.gemini_api_cost.row.health_tier_high','\\u2022 '+'🟠 High-volume tier'+' \\u2014 '+tM+' at '+tC+'/mo.',{model:tM,cost:tC}));" +
  "if(cHR===0)o.push('$calc_out.gemini_api_cost.row.health_cache_zero|• \\u26A0\\uFE0F Cache hit rate is 0% \\u2014 enabling prompt caching on repeated prefixes can cut cost 40-90%.|');" +
  "else if(cHR<30)o.push(tk('calc_out.gemini_api_cost.row.health_cache_low','\\u2022 \\uD83D\\uDFE1 Low cache hit rate ('+cHR+'%) \\u2014 review if your prompt has stable system instructions.',{rate:String(cHR)}));" +
  "else o.push(tk('calc_out.gemini_api_cost.row.health_cache_healthy','\\u2022 \\uD83D\\uDFE2 Healthy cache rate ('+cHR+'%) \\u2014 keep an eye on cache TTL vs your traffic pattern.',{rate:String(cHR)}));" +
  "if(pMode==='realtime'){o.push(tk('calc_out.gemini_api_cost.row.batch_pricing_tip','\\u2022 \\uD83D\\uDCA1 Switch to batch pricing: save ~'+fm(totSel*0.5)+'/mo (50% discount) if latency is not critical.',{saved:fm(totSel*0.5)}));}" +
  "o.push('');" +
  "o.push('$calc_out.section.what_if_scenarios|\\uD83D\\uDD04 What-If Scenarios:|');o.push(SEP2.repeat(60));" +
  "var pc=all.reduce(function(min,c){return (c.i.i+c.i.o)<(min.i.i+min.i.o)?c:min;},all[0]);" +
  "var chSelK=chSel?chSel.k:undefined;" +
  "if(pc&&pc.k!==chSelK){var cpr2=(iT/1e6)*pc.i.i+(oT/1e6)*pc.i.o;var newM2=cpr2*rpd*30;var svS=(chSel?chSel.mc:0)-newM2;" +
  "if(svS>0)o.push(tk('calc_out.gemini_api_cost.row.whatif_switch_cheapest','\\u2022 Switch cheapest to '+pc.i.n+':  save '+fm(svS)+'/mo  (similar quality, much cheaper)',{model:pc.i.n,saved:fm(svS)}));}" +
  "o.push(tk('calc_out.gemini_api_cost.row.whatif_double_volume','\\u2022 Double volume to '+lc(rpd*2)+' reqs/day:  '+fm(totSel*2)+'/mo',{reqs:lc(rpd*2),cost:fm(totSel*2)}));" +
  "o.push(tk('calc_out.gemini_api_cost.row.whatif_halve_volume','\\u2022 Halve volume to '+lc(Math.max(1,Math.floor(rpd/2)))+' reqs/day:  '+fm(totSel/2)+'/mo',{reqs:lc(Math.max(1,Math.floor(rpd/2))),cost:fm(totSel/2)}));" +
  "if(cHR<50){var cf2=0.5+0.5*(1-0.5*0.9);var cm2=totSel*cf2;var cs2=totSel-cm2;" +
  "o.push(tk('calc_out.gemini_api_cost.row.whatif_boost_cache','\\u2022 Boost cache hit rate to 50%:  save ~'+fm(cs2)+'/mo  ('+fm(totSel)+' \\u2192 '+fm(cm2)+')',{saved:fm(cs2),current:fm(totSel),boosted:fm(cm2)}));}" +
  "o.push('');" +
  // P168 B3-9：⭐ 返回**整份输出**的单元素数组 —— 页面（src/pages/[lang]/[slug].astro:2186）对 custom 型**只渲染 results[0]】
  //   ⇒ 多元素数组会让动态卡片只剩第一行（同一形态 B3-8 已在 ai-api-cost-comparison 修复并验证）。
  "return [o.join('\\n')]";

const engine: ToolEngine = {
  slug: 'solopreneur-gemini-api-cost-calculator',
  title: 'Gemini API Cost Calculator',
  description: 'Calculate Google Gemini API costs across Gemini 4 Argon, 3.8 Flash, 3.5 Flash, 3.1 Pro and the legacy lines — with Context Caching, batch pricing, growth projections, and cross-provider comparison.',
  inputs: [
    { name: 'models', label: 'Models', placeholder: 'gemini-3.5-flash,gemini-3.1-pro,gemini-3-flash,gemini-1.5-flash', type: 'text' },
    { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
    { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
    { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
    { name: 'pricingMode', label: 'Pricing Mode', placeholder: '', type: 'select', options: ['realtime', 'batch'] },
    { name: 'cacheReadHitRate', label: 'Context Cache Hit Rate (%)', placeholder: 'e.g. 60', type: 'number' },
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
    // All values verified against actual calculate() output with default inputs
    '\n$calc_out.section.gemini_api_cost|🤖 Gemini API Cost|\n\n$calc_out.gemini_api_cost.row.input_tokens{"tokens":"1,000"}|📥 Input: 1,000 tokens/req| | $calc_out.gemini_api_cost.row.output_tokens{"tokens":"500"}|📤 Output: 500 tokens/req| | $calc_out.gemini_api_cost.row.requests_per_day{"reqs":"100"}|🔄 100 reqs/day| | $calc_out.gemini_api_cost.row.mode_realtime|⚡ Real-time|\n\n$calc_out.gemini_api_cost.row.cost_comparison_header{"reqs":"100"}|📊 Cost Comparison (100 reqs/day)|\n──────────────────────────────────────────────────────\n★ Gemini 4 Argon             ████████████████████████████████         $21.00\n◆ Gemini 3.8 Flash           ████████████                             $7.87\n● Gemini 3.5 Flash           ███████████████████████████              $18.00\n▲ Gemini 3.1 Pro             █████████████████████████████████████    $24.00\n◆ Gemini 3 Flash             █████████                                $6.00\n◇ Gemini 2.5 Flash           ███████                                  $4.65\n◇ Gemini 1.5 Pro             ████████████████████████████████████████ $26.25\n◇ Gemini 1.5 Flash           ░                                        $0.67 🏆\n\n\n$calc_out.section.gemini_api_cost_selected_models|📋 Selected Model Details|\n────────────────────────────────────────────────────────────\n● Gemini 3.5 Flash $calc_out.gemini_api_cost.row.family_flash35|(Gemini 3.5 Flash)| | $calc_out.gemini_api_cost.row.context_window{"context":"1M"}|Context: 1M|\n────────────────────────────────────────────\n$calc_out.gemini_api_cost.row.input_cost{"tokens":"1,000","rate":"$1.50","cost":"$0.0015"}|Input:  1,000   tokens × $1.50/1M → $0.0015/req|\n$calc_out.gemini_api_cost.row.output_cost{"tokens":"500    ","rate":"$9.00","cost":"$0.0045"}|Output: 500     tokens × $9.00/1M → $0.0045/req|\n$calc_out.gemini_api_cost.row.batch_rate{"input":"$0.38","output":"$2.25"}|  Batch Rate: $0.38/$2.25 per 1M tokens|\n────────────────────────────────────────────\n$calc_out.label.per_request|Per request|:    $0.0060\n$calc_out.label.daily|Daily| (100):    $0.60\n$calc_out.label.monthly|Monthly| (30d):  $18.00\n$calc_out.label.annual|Annual|:         $216.00\n────────────────────────────────────────────\n\n▲ Gemini 3.1 Pro $calc_out.gemini_api_cost.row.family_pro|(Gemini 3.1 Pro)| | $calc_out.gemini_api_cost.row.context_window{"context":"1M"}|Context: 1M|\n────────────────────────────────────────────\n$calc_out.gemini_api_cost.row.input_cost{"tokens":"1,000","rate":"$2.00","cost":"$0.0020"}|Input:  1,000   tokens × $2.00/1M → $0.0020/req|\n$calc_out.gemini_api_cost.row.output_cost{"tokens":"500    ","rate":"$12.00","cost":"$0.0060"}|Output: 500     tokens × $12.00/1M → $0.0060/req|\n$calc_out.gemini_api_cost.row.batch_rate{"input":"$1.00","output":"$6.00"}|  Batch Rate: $1.00/$6.00 per 1M tokens|\n────────────────────────────────────────────\n$calc_out.label.per_request|Per request|:    $0.0080\n$calc_out.label.daily|Daily| (100):    $0.80\n$calc_out.label.monthly|Monthly| (30d):  $24.00\n$calc_out.label.annual|Annual|:         $288.00\n────────────────────────────────────────────\n\n$calc_out.section.gemini_api_cost_savings_insights|💰 Savings Insights|\n────────────────────────────────────────────────────────────\n$calc_out.gemini_api_cost.row.cheapest{"model":"Gemini 1.5 Flash","cost":"$0.67"}|🏆 Cheapest: Gemini 1.5 Flash at $0.67/mo|\n$calc_out.gemini_api_cost.row.best_value{"model":"Gemini 3 Flash","cost":"$6.00"}|⭐ Best value (Gemini 3 series): Gemini 3 Flash at $6.00/mo|\n$calc_out.gemini_api_cost.row.switching_savings{"from":"Gemini 3.1 Pro","to":"Gemini 3.5 Flash","saved":"$6.00","yearly":"$72.00"}|💸 Switching from Gemini 3.1 Pro to Gemini 3.5 Flash saves $6.00/mo ($72.00/yr)|\n$calc_out.gemini_api_cost.row.cross_provider_cheaper{"model":"Gemini 1.5 Flash","provider":"GPT-5 Nano","saved":"$0.08","pct":"10"}|🌍 Gemini 1.5 Flash vs GPT-5 Nano: saves $0.08/month (10% cheaper)|\n$calc_out.gemini_api_cost.row.cross_provider_cheaper{"model":"Gemini 1.5 Flash","provider":"Claude Haiku 3","saved":"$1.95","pct":"74"}|🌍 Gemini 1.5 Flash vs Claude Haiku 3: saves $1.95/month (74% cheaper)|\n$calc_out.gemini_api_cost.row.cross_provider_cheaper{"model":"Gemini 1.5 Flash","provider":"DeepSeek V4 Flash","saved":"$2.02","pct":"75"}|🌍 Gemini 1.5 Flash vs DeepSeek V4 Flash: saves $2.02/month (75% cheaper)|\n$calc_out.gemini_api_cost.row.tip_cheapest_frontier{"model":"Gemini 3 Flash","input":"$0.50","output":"$3.00","count":"5"}|💡 Gemini 3 Flash is the cheapest frontier-quality model at $0.50/$3.00 per 1M tokens. Context Caching saves 90% on repeated prompts for the 5 models that support it.|\n\n$calc_out.gemini_api_cost.row.usage_scenarios{"reqs":"100"}|📅 Usage Scenarios (monthly cost at 100 reqs/day)|\n\n$calc_out.gemini_api_cost.row.usage_scenario_line{"icon":"●","model":"Gemini 3.5 Flash","v50":"50→$9.00","v100":"100→$18.00","v500":"500→$90.00","v1k":"1,000→$180.00","v5k":"5,000→$900.00","v10k":"10,000→$1800.00"}|● Gemini 3.5 Flash: 50→$9.00 · 100→$18.00 · 500→$90.00 · 1,000→$180.00 · 5,000→$900.00 · 10,000→$1800.00|\n$calc_out.gemini_api_cost.row.usage_scenario_line{"icon":"▲","model":"Gemini 3.1 Pro","v50":"50→$12.00","v100":"100→$24.00","v500":"500→$120.00","v1k":"1,000→$240.00","v5k":"5,000→$1200.00","v10k":"10,000→$2400.00"}|▲ Gemini 3.1 Pro: 50→$12.00 · 100→$24.00 · 500→$120.00 · 1,000→$240.00 · 5,000→$1200.00 · 10,000→$2400.00|\n\n$calc_out.section.gemini_api_cost_health|🩺 Cost Health:|\n────────────────────────────────────────────────────────────\n$calc_out.gemini_api_cost.row.health_spread_healthy{"ratio":"1.3"}|• 🟢 Healthy cost spread (1.3x) across selected models.|\n$calc_out.gemini_api_cost.row.health_tier_low{"model":"Gemini 3.5 Flash","cost":"$18.00"}|• 🟢 Low-volume tier — Gemini 3.5 Flash at $18.00/mo.|\n$calc_out.gemini_api_cost.row.health_cache_zero|• ⚠️ Cache hit rate is 0% — enabling prompt caching on repeated prefixes can cut cost 40-90%.|\n$calc_out.gemini_api_cost.row.batch_pricing_tip{"saved":"$21.00"}|• 💡 Switch to batch pricing: save ~$21.00/mo (50% discount) if latency is not critical.|\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n────────────────────────────────────────────────────────────\n$calc_out.gemini_api_cost.row.whatif_switch_cheapest{"model":"Gemini 1.5 Flash","saved":"$17.32"}|• Switch cheapest to Gemini 1.5 Flash:  save $17.32/mo  (similar quality, much cheaper)|\n$calc_out.gemini_api_cost.row.whatif_double_volume{"reqs":"200","cost":"$84.00"}|• Double volume to 200 reqs/day:  $84.00/mo|\n$calc_out.gemini_api_cost.row.whatif_halve_volume{"reqs":"50","cost":"$21.00"}|• Halve volume to 50 reqs/day:  $21.00/mo|\n$calc_out.gemini_api_cost.row.whatif_boost_cache{"saved":"$9.45","current":"$42.00","boosted":"$32.55"}|• Boost cache hit rate to 50%:  save ~$9.45/mo  ($42.00 → $32.55)|\n',
  ],
  faq: [
    { q: 'How does Gemini pricing compare to OpenAI/Claude?', a: 'Gemini 3 Flash at {{live:google/gemini-3-flash}} per 1M tokens costs {{liveShareIn:google/gemini-3-flash|openai/gpt-4o}} of GPT-4o ({{live:openai/gpt-4o}}) on input, while its output price is {{liveShareOut:google/gemini-3-flash|anthropic/claude-haiku-3}} of Claude Haiku 3\'s ({{live:anthropic/claude-haiku-3}}). Gemini 3.5 Flash at {{live:google/gemini-3.5-flash}} is {{liveShareIn:google/gemini-3.5-flash|openai/gpt-4o}} of GPT-4o on input. The biggest advantage is Gemini\'s 2M token context window on Pro models.' },
    { q: 'What is Gemini Context Caching and how much can it save?', a: 'Gemini Context Caching stores your system instructions and repeated prefixes for 90% discount on cache reads. Cached tokens cost 0.1x the standard input price. It activates automatically for system instructions — no write cost. With 80% cache hit rate, you save ~72% on input costs. Available only on Gemini 3.5 Flash, 3.1 Pro, and 3 Flash.' },
    { q: 'When should I use Batch API vs Real-time?', a: 'Batch API gives 50% discount with async processing (completed within 24 hours). Use for: bulk data processing, content generation pipelines, overnight analytics. Use Real-time for: chatbots, interactive apps, code assistants — anything needing sub-second responses. Batch is only available on the 3 newest Gemini models.' },
    { q: 'Is Gemini 3.5 Flash worth it vs older Gemini models?', a: 'Gemini 3.5 Flash ({{live:google/gemini-3.5-flash}}) outperforms 2.5 Flash and 1.5 Pro on reasoning benchmarks at a fraction of 1.5 Pro\'s output price. For most production apps, 3 Flash ({{live:google/gemini-3-flash}}) is the sweet spot — frontier quality at budget pricing. Only pay for 3.5 Flash if you need the strongest creative writing and complex reasoning.' },
    { q: 'Gemini 3.5 Flash vs GPT-4o vs Claude Sonnet?', a: 'Gemini 3.5 Flash ({{live:google/gemini-3.5-flash}}) costs {{liveShareIn:google/gemini-3.5-flash|openai/gpt-4o}} of GPT-4o ({{live:openai/gpt-4o}}) on input and {{liveShareOut:google/gemini-3.5-flash|openai/gpt-4o}} on output. Claude Sonnet 4.6 ({{live:anthropic/claude-sonnet-4-6}}) costs {{liveShareIn:anthropic/claude-sonnet-4-6|google/gemini-3.5-flash}} of Gemini 3.5 Flash on input. For multimodal tasks (image+text), Gemini often outperforms at lower cost. For pure text reasoning, the margins are tighter — test your specific use case.' },
    { q: 'How do I switch between Gemini models?', a: 'Just change the model name in your API call: gemini-3.5-flash, gemini-3.1-pro, gemini-3-flash, gemini-2.5-flash, gemini-1.5-pro, gemini-1.5-flash. All models share the same API endpoint and auth. No code changes needed beyond the model parameter. Use Google AI Studio to test models before deploying.' },
    { q: 'Which Gemini model should I use for my use case?', a: 'Chatbots/RAG: Gemini 3 Flash ({{live:google/gemini-3-flash}}) — cheapest frontier quality. Complex reasoning: Gemini 3.1 Pro ({{live:google/gemini-3.1-pro}}) — strongest reasoning with 1M context. Bulk processing: Gemini 3 Flash in batch mode ({{liveBatch:google/gemini-3-flash}}). Multimodal apps: Gemini 3.5 Flash ({{live:google/gemini-3.5-flash}}) — best image+text performance. Budget/legacy: Gemini 1.5 Flash ({{live:google/gemini-1.5-flash}}) — ultra-cheap, acceptable quality.' },
    { q: "Is Gemini really cheaper than GPT or Claude?", a: "Gemini 1.5 Flash ({{live:google/gemini-1.5-flash}}) costs {{liveShareMix:google/gemini-1.5-flash|openai/gpt-5}} of GPT-5 ({{live:openai/gpt-5}}) and {{liveShareMix:google/gemini-1.5-flash|anthropic/claude-sonnet-5}} of Claude Sonnet 5 ({{live:anthropic/claude-sonnet-5}}) on a mixed workload. Gemini 2.5 Pro ({{live:google/gemini-2.5-pro}}) is mid-tier. For high-volume simple workloads (classification, extraction, routing), Flash is the most cost-effective major model." },
    { q: "What is special about Gemini context window?", a: "Gemini 1.5 Pro offers 2M tokens context (vs 200K for Claude, 128K for GPT). Best for: long documents, video analysis (1 hour of video = ~250K tokens), code repos. For 1M-token context, Gemini 1.5 Flash charges {{liveIn:google/gemini-1.5-flash}} per 1M input — extremely cheap for big contexts." },
    { q: "How does Gemini free tier compare?", a: "Google AI Studio offers free Gemini 1.5 Flash usage: 15 requests/minute, 1,500/day, 1M tokens/minute. This is the most generous free tier of any major provider. Use it for: prototypes, learning, low-volume personal projects. Upgrade to paid once you exceed the limit." },
    { q: "Should I use Gemini for production apps?", a: "Yes for most use cases. Gemini 1.5 Flash quality is now competitive with GPT-4o for many tasks. Multimodal (text, image, video, audio) is included. Limitation: rate limits and availability vary by region. Latency is 1-2s vs 200-500ms for GPT-4o." },
    { q: "What are the pricing tiers for Gemini 2.5?", a: "Gemini 2.5 Flash ({{live:google/gemini-2.5-flash}}) — cheap, fast. Gemini 2.5 Pro ({{live:google/gemini-2.5-pro}}) — reasoning, complex tasks. Gemini 2.5 Pro Deep Think (premium tier) — for the hardest problems. For most use cases, Flash is sufficient; upgrade to Pro only when Flash quality fails." },
    { q: "How does Gemini handle multimodal input?", a: "Image input: $0.0015/image (Flash). Video: $0.002/second. Audio: $0.001/second. Multiple modalities in one request: billed per modality. For vision apps, Gemini is often 5-10x cheaper than GPT-4o vision. Document processing (PDFs) is included at text-token rates." },
    { q: "What is the difference between AI Studio and Vertex AI?", a: "AI Studio is consumer/developer-friendly, free tier included, fastest to prototype. Vertex AI is enterprise, has SLAs, VPC-SC, data residency, IAM, higher rate limits. Same models, same prices. Use AI Studio for prototyping, Vertex for production at scale." },
    { q: "How do I optimize Gemini API costs?", a: "Use caching (50% off for repeated context). Use Flash for high-volume simple tasks. Batch processing: 50% off for async. Avoid unnecessary long contexts — fetch only relevant chunks. Use system instructions efficiently (no fluff). Monitor usage in Google Cloud Console." },
  ],
  howToUse: [
    'Select the Gemini models you want to compare (3.5 Flash, 3.1 Pro, 3 Flash, etc.).',
    'Enter your average input and output tokens per API call.',
    'Enter your expected daily request volume.',
    'Choose real-time or batch pricing — batch gives 50% discount for async jobs.',
    'Set the context cache hit rate — Gemini caches system instructions automatically at 90% discount.',
    'Add a growth rate and projection period for long-term cost planning, then review savings vs other providers.',
  ],
  dataLastUpdated: PRICING.lastUpdated,
  engineKey: true,
};

registerEngine(engine);

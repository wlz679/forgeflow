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
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let ot=function(a,F,f){const h=U.llm[a]?.models?.[F];if(!h)throw new Error(\`cross-provider model missing from dataset: \${a}/\${F}\`);return{input:h.input,output:h.output,name:f}},s=function(a){return Math.abs(a)<.01&&a!==0?"$"+a.toFixed(4):"$"+a.toFixed(2)},u=function(a){return a.toLocaleString()},I=function(a,F){return a+" ".repeat(Math.max(0,F-a.length))},L=function(a){const F=[...new Set((a.models||D.join(",")).split(",").map(t=>t.trim()).filter(Boolean))],f=Math.max(1,Math.min(1e7,parseInt(a.inputTokens)||1e3)),_=Math.max(1,Math.min(1e7,parseInt(a.outputTokens)||500)),h=Math.max(0,Math.min(1e6,parseInt(a.requestsPerDay)||100)),K=a.pricingMode==="batch"?"batch":"realtime",m=Math.max(0,Math.min(100,parseInt(a.cacheReadHitRate)||0)),W=Math.max(0,Math.min(50,parseFloat(a.growthRate)||0)),N=parseInt(a.projectionMonths),$=[3,6,12].includes(N)?N:12,v=K==="batch",G=!v&&m>0,E=m/100,A=h*30,g=[];for(const[t,o]of Object.entries(j)){const i=v&&o.supportsBatch?o.batchInput:o.input,c=v&&o.supportsBatch?o.batchOutput:o.output,l=f/1e6*i+_/1e6*c,x=l*A;let r;if(G&&o.supportsCache){const d=f*E/1e6*i*T,R=f*(1-E)/1e6*i,S=_/1e6*c;r=d+R+S}else r=l;const y=r*A;g.push({key:t,info:o,costPerReq:r,monthlyCost:y,noCacheCostPerReq:l,noCacheMonthly:x})}g.sort((t,o)=>t.info.order-o.info.order);const V=g.reduce((t,o)=>o.monthlyCost<t.monthlyCost?o:t),z=g.reduce((t,o)=>o.monthlyCost>t.monthlyCost?o:t).monthlyCost,p=[];for(const t of F){const o=g.find(i=>i.key===t);o&&p.push(o)}if(p.length===0)for(const t of D){const o=g.find(i=>i.key===t);o&&p.push(o)}const e=[];e.push("");let H=n("calc_out.section.gemini_api_cost","🤖 Gemini API Cost");v&&(H+=" | "+n("calc_out.section.gemini_api_cost_batch_mode","📦 Batch Mode (50% discount)")),G&&(H+=" | "+n("calc_out.section.gemini_api_cost_context_caching","💾 Context Caching: "+m+"% hit (90% discount)",{hit:String(m)})),e.push(H),e.push(""),e.push(n("calc_out.gemini_api_cost.row.input_tokens","📥 Input: "+u(f)+" tokens/req",{tokens:u(f)})+" | "+n("calc_out.gemini_api_cost.row.output_tokens","📤 Output: "+u(_)+" tokens/req",{tokens:u(_)})+" | "+n("calc_out.gemini_api_cost.row.requests_per_day","🔄 "+u(h)+" reqs/day",{reqs:u(h)})+" | "+(v?n("calc_out.gemini_api_cost.row.mode_batch","📦 Batch"):n("calc_out.gemini_api_cost.row.mode_realtime","⚡ Real-time"))),e.push(""),e.push(n("calc_out.gemini_api_cost.row.cost_comparison_header","📊 Cost Comparison ("+u(h)+" reqs/day)",{reqs:u(h)})),e.push(C.repeat(54));const J=40;for(const t of g){const i=t.info.icon+" "+t.info.name,c=z>0?Math.max(1,Math.round(t.monthlyCost/z*J)):1,x=(t.key===V.key?"░":"█").repeat(c),r=v&&!t.info.supportsBatch?" (no batch)":"",d=t.key===V.key?" 🏆":"";e.push(I(i,28)+" "+I(x,J)+" "+s(t.monthlyCost)+r+d)}e.push(""),e.push(""),e.push("$calc_out.section.gemini_api_cost_selected_models|📋 Selected Model Details|"),e.push(C.repeat(60));for(const t of p){const o=t.info.icon,i=Z[t.info.family],c=t.costPerReq*h,l=t.monthlyCost*12,x=t.info.family==="gem4"?n("calc_out.gemini_api_cost.row.family_gem4","("+i+")"):t.info.family==="flash35"?n("calc_out.gemini_api_cost.row.family_flash35","("+i+")"):t.info.family==="pro"?n("calc_out.gemini_api_cost.row.family_pro","("+i+")"):t.info.family==="flash3"?n("calc_out.gemini_api_cost.row.family_flash3","("+i+")"):n("calc_out.gemini_api_cost.row.family_legacy","("+i+")");e.push(o+" "+t.info.name+" "+x+" | "+n("calc_out.gemini_api_cost.row.context_window","Context: "+t.info.contextWindow,{context:t.info.contextWindow})),e.push(C.repeat(44));const r=v&&t.info.supportsBatch?t.info.batchInput:t.info.input,y=v&&t.info.supportsBatch?t.info.batchOutput:t.info.output,d=f/1e6*r,R=_/1e6*y;if(e.push(n("calc_out.gemini_api_cost.row.input_cost","Input:  "+I(u(f),7)+" tokens × "+s(r)+"/1M → "+s(d)+"/req",{tokens:u(f),rate:s(r),cost:s(d)})),e.push(n("calc_out.gemini_api_cost.row.output_cost","Output: "+I(u(_),7)+" tokens × "+s(y)+"/1M → "+s(R)+"/req",{tokens:I(u(_),7),rate:s(y),cost:s(R)})),!v&&t.info.supportsBatch?e.push(n("calc_out.gemini_api_cost.row.batch_rate","  Batch Rate: "+s(t.info.batchInput)+"/"+s(t.info.batchOutput)+" per 1M tokens",{input:s(t.info.batchInput),output:s(t.info.batchOutput)})):t.info.supportsBatch||e.push("$calc_out.gemini_api_cost.row.batch_na|  ⚠ Batch: N/A for this model|"),e.push(C.repeat(44)),e.push(n("calc_out.label.per_request","Per request")+":    "+s(t.costPerReq)),e.push(n("calc_out.label.daily","Daily")+" ("+h+"):    "+s(c)),e.push(n("calc_out.label.monthly","Monthly")+" (30d):  "+s(t.monthlyCost)),e.push(n("calc_out.label.annual","Annual")+":         "+s(l)),e.push(C.repeat(44)),G&&t.info.supportsCache){const S=t.noCacheMonthly-t.monthlyCost,Q=t.noCacheMonthly>0?Math.round(S/t.noCacheMonthly*100):0;e.push(n("calc_out.gemini_api_cost.row.context_cache_savings","💾 Context cache at "+m+"% hit: "+s(t.monthlyCost)+"/mo — saves "+s(S)+"/mo ("+Q+"%)",{rate:String(m),cost:s(t.monthlyCost),saved:s(S),pct:String(Q)}))}else G&&!t.info.supportsCache&&e.push("$calc_out.gemini_api_cost.row.cache_unavailable|🚫 Context caching not available for this model|");e.push("")}if(W>0){e.push(n("calc_out.gemini_api_cost.row.growth_projection","📈 Growth Projection ("+W+"%/month, "+$+" months)",{growth:String(W),months:String($)})),e.push("");const t="Month".padEnd(8);let o=n("calc_out.label.month","Month")+t.slice(5);for(const r of p)o+=" | "+r.info.name.padEnd(16);e.push(o);let i="".padEnd(8,C);for(const r of p)i+="-+-".padEnd(17,C);e.push(i);const c=1+W/100;for(let r=1;r<=$;r++){const y=Math.pow(c,r-1);let d=String(r).padEnd(8);for(const R of p)d+=" | "+s(R.monthlyCost*y).padEnd(16);e.push(d)}e.push(i);const l="Total".padEnd(8);let x=n("calc_out.label.total","Total")+l.slice(5);for(const r of p){let y=0;for(let d=1;d<=$;d++)y+=r.monthlyCost*Math.pow(c,d-1);x+=" | "+s(y).padEnd(16)}e.push(x),e.push("")}e.push("$calc_out.section.gemini_api_cost_savings_insights|💰 Savings Insights|"),e.push(C.repeat(60));const w=g.reduce((t,o)=>o.monthlyCost<t.monthlyCost?o:t);e.push(n("calc_out.gemini_api_cost.row.cheapest","🏆 Cheapest: "+w.info.name+" at "+s(w.monthlyCost)+"/mo",{model:w.info.name,cost:s(w.monthlyCost)}));const q=g.filter(t=>t.info.family!=="legacy").reduce((t,o)=>o.monthlyCost<t.monthlyCost?o:t,g[0]);if(q&&q.key!==w.key&&e.push(n("calc_out.gemini_api_cost.row.best_value","⭐ Best value (Gemini 3 series): "+q.info.name+" at "+s(q.monthlyCost)+"/mo",{model:q.info.name,cost:s(q.monthlyCost)})),p.length>=2){const t=p.reduce((c,l)=>l.monthlyCost>c.monthlyCost?l:c),o=p.reduce((c,l)=>l.monthlyCost<c.monthlyCost?l:c),i=t.monthlyCost-o.monthlyCost;e.push(n("calc_out.gemini_api_cost.row.switching_savings","💸 Switching from "+t.info.name+" to "+o.info.name+" saves "+s(i)+"/mo ("+s(i*12)+"/yr)",{from:t.info.name,to:o.info.name,saved:s(i),yearly:s(i*12)}))}if(G&&p.length>0){const t=p[0],o=t.noCacheMonthly-t.monthlyCost;e.push(n("calc_out.gemini_api_cost.row.cache_summary","💾 Context cache at "+m+"% hit rate saves ~"+s(o)+"/mo on "+t.info.name,{rate:String(m),saved:s(o),model:t.info.name}))}for(const[t,o]of Object.entries(k)){const i=(f/1e6*o.input+_/1e6*o.output)*A,c=i-w.monthlyCost,l=i>0?Math.round(c/i*100):0;c>0?e.push(n("calc_out.gemini_api_cost.row.cross_provider_cheaper","🌍 "+w.info.name+" vs "+o.name+": saves "+s(c)+"/month ("+l+"% cheaper)",{model:w.info.name,provider:o.name,saved:s(c),pct:String(l)})):e.push(n("calc_out.gemini_api_cost.row.cross_provider_pricier","🌍 "+w.info.name+" vs "+o.name+": costs "+s(-c)+"/month more",{model:w.info.name,provider:o.name,extra:s(-c)}))}const B=j["gemini-3-flash"],Y=Object.values(j).filter(t=>t.supportsCache).length;e.push(n("calc_out.gemini_api_cost.row.tip_cheapest_frontier","💡 "+B.name+" is the cheapest frontier-quality model at $"+B.input.toFixed(2)+"/$"+B.output.toFixed(2)+" per 1M tokens. Context Caching saves 90% on repeated prompts for the "+Y+" models that support it.",{model:B.name,input:"$"+B.input.toFixed(2),output:"$"+B.output.toFixed(2),count:String(Y)})),e.push(""),e.push(n("calc_out.gemini_api_cost.row.usage_scenarios","📅 Usage Scenarios (monthly cost at "+u(h)+" reqs/day)",{reqs:u(h)})),e.push("");const et=[50,100,500,1e3,5e3,1e4];for(const t of p){const o=t.info.icon,i=[];for(const c of et)i.push(u(c)+"→"+s(t.costPerReq*c*30));e.push(n("calc_out.gemini_api_cost.row.usage_scenario_line",o+" "+t.info.name+": "+i.join(" · "),{icon:o,model:t.info.name,v50:i[0],v100:i[1],v500:i[2],v1k:i[3],v5k:i[4],v10k:i[5]}))}e.push(""),e.push("$calc_out.section.gemini_api_cost_health|🩺 Cost Health:|"),e.push(C.repeat(60));const b=p.reduce((t,o)=>t+o.monthlyCost,0),M=p.reduce((t,o)=>o.monthlyCost<t.monthlyCost?o:t),st=p.reduce((t,o)=>o.monthlyCost>t.monthlyCost?o:t);if(p.length>=2){const t=st.monthlyCost/Math.max(M.monthlyCost,.01);t>=50?e.push(n("calc_out.gemini_api_cost.row.health_spread_50x","• 🔴 Your most expensive selection costs "+t.toFixed(0)+"x your cheapest — consider mixing tiers.",{ratio:t.toFixed(0)})):t>=10?e.push(n("calc_out.gemini_api_cost.row.health_spread_10x","• 🟠 "+t.toFixed(0)+"x cost spread across selected models — review if every model needs to be premium.",{ratio:t.toFixed(0)})):e.push(n("calc_out.gemini_api_cost.row.health_spread_healthy","• 🟢 Healthy cost spread ("+t.toFixed(1)+"x) across selected models.",{ratio:t.toFixed(1)}))}if(M){const t=M.info.name,o=s(M.monthlyCost);M.monthlyCost<5?e.push(n("calc_out.gemini_api_cost.row.health_tier_micro","• 🟢 Micro-tier (under $5/mo) — "+t+" at "+o+"/mo.",{model:t,cost:o})):M.monthlyCost<50?e.push(n("calc_out.gemini_api_cost.row.health_tier_low","• 🟢 Low-volume tier — "+t+" at "+o+"/mo.",{model:t,cost:o})):M.monthlyCost<500?e.push(n("calc_out.gemini_api_cost.row.health_tier_mid","• 🟡 Mid-volume tier — "+t+" at "+o+"/mo.",{model:t,cost:o})):e.push(n("calc_out.gemini_api_cost.row.health_tier_high","• 🟠 High-volume tier — "+t+" at "+o+"/mo.",{model:t,cost:o}))}if(m===0?e.push("$calc_out.gemini_api_cost.row.health_cache_zero|• ⚠️ Cache hit rate is 0% — enabling prompt caching on repeated prefixes can cut cost 40-90%.|"):m<30?e.push(n("calc_out.gemini_api_cost.row.health_cache_low","• 🟡 Low cache hit rate ("+m+"%) — review if your prompt has stable system instructions.",{rate:String(m)})):e.push(n("calc_out.gemini_api_cost.row.health_cache_healthy","• 🟢 Healthy cache rate ("+m+"%) — keep an eye on cache TTL vs your traffic pattern.",{rate:String(m)})),K==="realtime"){const t=b*.5;e.push(n("calc_out.gemini_api_cost.row.batch_pricing_tip","• 💡 Switch to batch pricing: save ~"+s(t)+"/mo (50% discount) if latency is not critical.",{saved:s(t)}))}e.push(""),e.push("$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|"),e.push(C.repeat(60));const O=g.reduce((t,o)=>o.info.input+o.info.output<t.info.input+t.info.output?o:t,g[0]);if(O&&O.key!==M?.key){const o=(f/1e6*O.info.input+_/1e6*O.info.output)*h*30,i=(M?.monthlyCost??0)-o;i>0&&e.push(n("calc_out.gemini_api_cost.row.whatif_switch_cheapest","• Switch cheapest to "+O.info.name+":  save "+s(i)+"/mo  (similar quality, much cheaper)",{model:O.info.name,saved:s(i)}))}if(e.push(n("calc_out.gemini_api_cost.row.whatif_double_volume","• Double volume to "+u(h*2)+" reqs/day:  "+s(b*2)+"/mo",{reqs:u(h*2),cost:s(b*2)})),e.push(n("calc_out.gemini_api_cost.row.whatif_halve_volume","• Halve volume to "+u(Math.max(1,Math.floor(h/2)))+" reqs/day:  "+s(b/2)+"/mo",{reqs:u(Math.max(1,Math.floor(h/2))),cost:s(b/2)})),m<50){const o=b*.775,i=b-o;e.push(n("calc_out.gemini_api_cost.row.whatif_boost_cache","• Boost cache hit rate to 50%:  save ~"+s(i)+"/mo  ("+s(b)+" → "+s(o)+")",{saved:s(i),current:s(b),boosted:s(o)}))}return e.push(""),e},P=function(a,F,f){var _=tt(a);return Array.isArray(_)?_.join(\`
\`):String(_)};var nt=ot,it=s,at=u,ct=I,ut=L,rt=P,U={llm:{openai:{name:"OpenAI",cacheReadMult:null,models:{}},anthropic:{name:"Anthropic",cacheReadMult:.1,cacheWriteMult5m:1.25,cacheWriteMult1h:2,models:{}},google:{name:"Google",cacheReadMult:.1,models:{"gemini-3.5-flash":{input:1.5,output:9,batchInput:.375,batchOutput:2.25,name:"Gemini 3.5 Flash",family:"flash35",contextWindow:"1M",order:3,icon:"●",supportsCache:!0,supportsBatch:!0},"gemini-3.1-pro":{input:2,output:12,batchInput:1,batchOutput:6,name:"Gemini 3.1 Pro",family:"pro",contextWindow:"1M",order:4,icon:"▲",supportsCache:!0,supportsBatch:!0,longContextDoubling:">200K"},"gemini-3-flash":{input:.5,output:3,batchInput:.25,batchOutput:1.5,name:"Gemini 3 Flash",family:"flash3",contextWindow:"1M",order:5,icon:"◆",supportsCache:!0,supportsBatch:!0},"gemini-1.5-flash":{input:.075,output:.3,batchInput:0,batchOutput:0,name:"Gemini 1.5 Flash",family:"legacy",contextWindow:"1M",order:8,icon:"◇",supportsCache:!1,supportsBatch:!1}}},deepseek:{name:"DeepSeek",cacheReadMult:.02,models:{}}}},n=tk,X='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',n=new Function("return "+X)(),j={"gemini-3.5-flash":{input:1.5,output:9,batchInput:.375,batchOutput:2.25,name:"Gemini 3.5 Flash",family:"flash35",contextWindow:"1M",order:3,icon:"●",supportsCache:!0,supportsBatch:!0},"gemini-3.1-pro":{input:2,output:12,batchInput:1,batchOutput:6,name:"Gemini 3.1 Pro",family:"pro",contextWindow:"1M",order:4,icon:"▲",supportsCache:!0,supportsBatch:!0,longContextDoubling:">200K"},"gemini-3-flash":{input:.5,output:3,batchInput:.25,batchOutput:1.5,name:"Gemini 3 Flash",family:"flash3",contextWindow:"1M",order:5,icon:"◆",supportsCache:!0,supportsBatch:!0},"gemini-2.5-flash":{input:.3,output:2.5,batchInput:0,batchOutput:0,name:"Gemini 2.5 Flash",family:"legacy",contextWindow:"1M",order:6,icon:"◇",supportsCache:!1,supportsBatch:!1},"gemini-1.5-pro":{input:3.5,output:10.5,batchInput:0,batchOutput:0,name:"Gemini 1.5 Pro",family:"legacy",contextWindow:"2M",order:7,icon:"◇",supportsCache:!1,supportsBatch:!1},"gemini-1.5-flash":{input:.075,output:.3,batchInput:0,batchOutput:0,name:"Gemini 1.5 Flash",family:"legacy",contextWindow:"1M",order:8,icon:"◇",supportsCache:!1,supportsBatch:!1},"gemini-3.8-flash":{input:.75,output:3.75,name:"Gemini 3.8 Flash",family:"flash3",contextWindow:"1M",order:2,icon:"◆",supportsCache:!0,supportsBatch:!0,batchInput:.375,batchOutput:1.875},"gemini-4-argon":{input:2,output:10,name:"Gemini 4 Argon",family:"gem4",contextWindow:"1M",order:1,icon:"★",supportsCache:!0,supportsBatch:!0,batchInput:1,batchOutput:5}},Z={gem4:"Gemini 4 Argon",flash35:"Gemini 3.5 Flash",pro:"Gemini 3.1 Pro",flash3:"Gemini 3 Flash",legacy:"Legacy"},T=.1,D=["gemini-3.5-flash","gemini-3.1-pro","gemini-3-flash","gemini-1.5-flash"],k={openai:{input:.05,output:.4,name:"GPT-5 Nano"},claude:{input:.25,output:1.25,name:"Claude Haiku 3"},deepseek:{input:.3,output:1.2,name:"DeepSeek V4 Flash"}},C="─",tt=function(a){return L(a)};return[P(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

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

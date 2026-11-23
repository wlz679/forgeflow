import type { ToolEngine } from "../../core/engines/types";
import { registerEngine } from "../../core/engines/registry";
import PRICING from "../../data/ai-pricing.json";
import { pickInteractiveModels } from "../../data/ai-pricing-popular";
// P168 B3-14：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from "../../lib/calc-output-i18n";

// ============================================================
// Task 1: Updated Model Catalog (14 models, 4 families, June 2026 pricing)
// ============================================================

interface ModelInfo {
  input: number;
  output: number;
  name: string;
  family: "gpt6" | "gpt5" | "gpt41" | "o-series" | "legacy";
  contextWindow: string;
  batchInput: number;
  batchOutput: number;
  order: number;
  reasoningMultiplier?: number; // o-series ≈4, others default to 1
}

// P156: the build-time model set is now the INTERACTIVE set (18), the same
// one the client-side customFn bundle carries. Before this, `calculate()`
// iterated all 138 OpenAI models, so the pre-rendered static block said
// "Cost Comparison (138 Models)" while the live widget could only show 18.
// See src/data/ai-pricing-popular.ts.
const MODELS: Record<string, ModelInfo> = pickInteractiveModels(
  PRICING.llm.openai.models as any,
  "openai",
);

// Family labels with text — available for UI consumption (e.g. filter dropdowns, legend)
const FAMILY_LABELS: Record<string, string> = {
  gpt6: "\u{1F537} GPT-6", // 🔷 GPT-6
  gpt5: "\u{1F535} GPT-5", // 🔵 GPT-5
  gpt41: "\u{1F7E2} GPT-4.1", // 🟢 GPT-4.1
  "o-series": "\u{1F7E0} o-series", // 🟠 o-series
  legacy: "\u{26AA} Legacy", // ⚪ Legacy
};

const DEFAULT_SELECTED = ["gpt-5-mini", "gpt-5.5", "gpt-4.1"];

// ============================================================
// Task 2: Scenario Presets
// ============================================================

interface Preset {
  label: string;
  emoji: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  reqPerDay: number;
}

// Scenario presets for one-click form fill — consumed by the UI layer (page template)
const PRESETS: Preset[] = [
  {
    label: "Customer Support Bot",
    emoji: "\u{1F3A7}",
    model: "gpt-5-mini",
    inputTokens: 800,
    outputTokens: 200,
    reqPerDay: 500,
  },
  {
    label: "RAG Q&A",
    emoji: "\u{1F4DA}",
    model: "gpt-4.1",
    inputTokens: 3000,
    outputTokens: 400,
    reqPerDay: 200,
  },
  {
    label: "Code Review",
    emoji: "\u{1F4BB}",
    model: "gpt-5.5",
    inputTokens: 5000,
    outputTokens: 800,
    reqPerDay: 50,
  },
  {
    label: "Document Translation",
    emoji: "\u{1F310}",
    model: "gpt-5",
    inputTokens: 2000,
    outputTokens: 1500,
    reqPerDay: 100,
  },
  {
    label: "Content Generation",
    emoji: "\u{270D}\u{FE0F}",
    model: "gpt-5.2",
    inputTokens: 500,
    outputTokens: 2000,
    reqPerDay: 100,
  },
  {
    label: "Data Analysis",
    emoji: "\u{1F4CA}",
    model: "o3",
    inputTokens: 4000,
    outputTokens: 3000,
    reqPerDay: 30,
  },
];

// ============================================================
// Task 3: Token Estimator
// ============================================================

// Token estimator using heuristic CJK/English character ratios (±15% accuracy).
// Reference implementation — consumed by the UI token-counter widget (page template).
function estimateTokens(text: string): {
  inputTokens: number;
  detectedLang: string;
} {
  if (!text || !text.trim()) return { inputTokens: 0, detectedLang: "empty" };
  let cjkChars = 0;
  let otherChars = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x3040 && code <= 0x309f) ||
      (code >= 0x30a0 && code <= 0x30ff) ||
      (code >= 0xac00 && code <= 0xd7af)
    ) {
      cjkChars++;
    } else if (ch.trim()) {
      otherChars++;
    }
  }
  const total = text.length;
  const cjkRatio = cjkChars / Math.max(total, 1);
  const tokens = Math.ceil(cjkChars / 1.5 + otherChars / 4);
  const detectedLang = cjkRatio > 0.4 ? "zh" : cjkRatio > 0.15 ? "mixed" : "en";
  return { inputTokens: tokens, detectedLang };
}

// ============================================================
// Task 4: Rewritten calculate() — 6-section output
// ============================================================

const FAMILY_ICONS: Record<string, string> = {
  gpt6: "\u{1F537}", // 🔷
  gpt5: "\u{1F535}", // 🔵
  gpt41: "\u{1F7E2}", // 🟢
  "o-series": "\u{1F7E0}", // 🟠
  legacy: "\u{26AA}", // ⚪
};

const SEP = "\u{2501}"; // ━ (horizontal line)
const DASH = "\u{2500}"; // ─ (thin horizontal line)

function fmt(n: number): string {
  if (n < 0.01 && n > 0) return "$" + n.toFixed(4);
  return "$" + n.toFixed(2);
}

function lc(n: number): string {
  return n.toLocaleString();
}

function pad(s: string, len: number): string {
  return s + " ".repeat(Math.max(0, len - s.length));
}

function calculate(inputs: Record<string, string>): string[] {
  // --- Parse inputs ---
  const selectedKeys = [...new Set(
    (inputs.models || DEFAULT_SELECTED.join(","))
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  )];
  const inTokens = Math.max(1, Math.min(10_000_000, parseInt(inputs.inputTokens) || 1000));
  const outTokens = Math.max(1, Math.min(10_000_000, parseInt(inputs.outputTokens) || 500));
  const reqPerDay = Math.max(0, Math.min(1_000_000, parseInt(inputs.requestsPerDay) || 100));
  const pricingMode = inputs.pricingMode === "batch" ? "batch" : "realtime";
  const cacheHitRate = Math.min(
    100,
    Math.max(0, parseInt(inputs.cacheHitRate) || 0),
  );
  const growthRate = Math.min(
    50,
    Math.max(0, parseFloat(inputs.growthRate) || 0),
  );
  const projMonthsRaw = parseInt(inputs.projectionMonths);
  const projMonths = [3, 6, 12].includes(projMonthsRaw) ? projMonthsRaw : 12;

  // --- Compute costs for all 14 models ---
  interface CostEntry {
    key: string;
    info: ModelInfo;
    inputPrice: number;
    outputPrice: number;
    costPerReq: number;
    monthlyCost: number;
  }

  const allCosts: CostEntry[] = [];
  for (const [key, info] of Object.entries(MODELS)) {
    const inputPrice = pricingMode === "batch" ? info.batchInput : info.input;
    const outputPrice =
      pricingMode === "batch" ? info.batchOutput : info.output;
    // o-series models generate hidden reasoning tokens billed as output (≈4× visible tokens)
    const rm = info.reasoningMultiplier || 1;
    const effectiveOut = outTokens * rm;
    const costPerReq =
      (inTokens / 1_000_000) * inputPrice +
      (effectiveOut / 1_000_000) * outputPrice;
    const monthlyCost = costPerReq * reqPerDay * 30;
    allCosts.push({
      key,
      info,
      inputPrice,
      outputPrice,
      costPerReq,
      monthlyCost,
    });
  }

  // Sort by display order (newest model first)
  allCosts.sort((a, b) => a.info.order - b.info.order);
  // Cheapest is still determined by cost, not order
  const cheapest = allCosts.reduce((min, c) =>
    c.monthlyCost < min.monthlyCost ? c : min,
  );
  const maxCost = allCosts.reduce((max, c) =>
    c.monthlyCost > max.monthlyCost ? c : max,
  ).monthlyCost;

  // Build a lookup for selected models
  const selectedCosts: CostEntry[] = [];
  for (const k of selectedKeys) {
    const entry = allCosts.find((c) => c.key === k);
    if (entry) selectedCosts.push(entry);
  }
  // If nothing resolved, fall back to defaults
  if (selectedCosts.length === 0) {
    for (const dk of DEFAULT_SELECTED) {
      const entry = allCosts.find((c) => c.key === dk);
      if (entry) selectedCosts.push(entry);
    }
  }

  const out: string[] = [];
  // P168 B3-14：⭐「📅 Pricing last updated」这一行**从卡片正文里去掉** ——
  //   · 页面用**徽章**显示同一个日期（dataLastUpdated → 「📅 Data updated」）
  //   · codegen 写 staticExamples[0] 时也会过滤掉它（"UI badge covers it"）
  //   ⇒ 留在正文里只会与徽章重复（同一形态 ai-api-cost-comparison / ai-training / claude / gemini / deepseek / gpu-cloud 已处理）。
  //   ⚠️ 这里**保留空元素**⇒ out 数组与 staticExamples[0] 开头的 '\n' 逐字一致 ⇒ 英文页零变化。
  out.push('');

  // ================================================================
  // Section 1: Header
  // ================================================================
  // P168 B3-14：标题与输入摘要令牌化 ⇒ 英文兜底必须与改写前**逐字相同**
  if (pricingMode === "batch") {
    out.push(
      cacheHitRate > 0
        ? makeToken(
            "calc_out.openai_token.row.header_batch_cache",
            "⚡ Batch Pricing | \u{1F4BE} " + cacheHitRate + "% Cache Hit Rate",
            { cache: String(cacheHitRate) },
          )
        : makeToken("calc_out.openai_token.row.header_batch", "⚡ Batch Pricing"),
    );
  } else {
    out.push(
      cacheHitRate > 0
        ? makeToken(
            "calc_out.openai_token.row.header_realtime_cache",
            "🔴 Real-time Pricing | \u{1F4BE} " + cacheHitRate + "% Cache Hit Rate",
            { cache: String(cacheHitRate) },
          )
        : makeToken("calc_out.openai_token.row.header_realtime", "🔴 Real-time Pricing"),
    );
  }
  out.push("");
  const inTokensLabel = lc(inTokens);
  const outTokensLabel = lc(outTokens);
  const reqPerDayLabel = lc(reqPerDay);
  // ⚠️ P168 B3-14：makeToken 会把兜底里的半角 '|' 换成全角 '｜' ⇒ 含 ' | ' 的行必须**拆成多段**
  //   （分隔符留在 token 之外）⇒ 否则英文页逐字变化（G9 变红）。
  out.push(
    makeToken(
      "calc_out.openai_token.row.input_summary",
      "\u{1F4E5} Input: " + inTokensLabel + " tokens/req",
      { in: inTokensLabel },
    ) +
      " | " +
      makeToken(
        "calc_out.openai_token.row.output_summary",
        "\u{1F4E4} Output: " + outTokensLabel + " tokens/req",
        { out: outTokensLabel },
      ) +
      " | " +
      makeToken(
        "calc_out.openai_token.row.requests_summary",
        "\u{1F504} " + reqPerDayLabel + " reqs/day",
        { reqs: reqPerDayLabel },
      ),
  );
  out.push("");

  // ================================================================
  // Section 2: Bar Chart — full-model comparison
  // ================================================================
  const modelCountLabel = String(allCosts.length);
  out.push(
    makeToken(
      "calc_out.section.openai_token_cost_comparison",
      "\u{1F4CA} Cost Comparison (" + modelCountLabel + " Models)",
      { models: modelCountLabel },
    ),
  );
  out.push("");
  for (const item of allCosts) {
    const icon = FAMILY_ICONS[item.info.family];
    const label = icon + " " + item.info.name;
    const paddedLabel = pad(label, 22);
    const barWidth =
      maxCost > 0
        ? Math.max(1, Math.round((item.monthlyCost / maxCost) * 32))
        : 0;
    const bar = "█".repeat(barWidth); // █
    const isCheapest = item.key === cheapest.key;
    const badge = isCheapest ? " \u{1F3C6}" : ""; // 🏆
    out.push(paddedLabel + bar + " " + fmt(item.monthlyCost) + badge);
  }
  out.push("");
  out.push("");

  // ================================================================
  // Section 3: Detail Cards — selected models
  // ================================================================
  out.push(makeToken("calc_out.section.ai_api_cost_comparison_selected_models", "\u{1F4CB} Selected Model Details"));
  out.push(SEP.repeat(60));
  for (const item of selectedCosts) {
    const icon = FAMILY_ICONS[item.info.family];
    const dailyCost = item.costPerReq * reqPerDay;
    const monthlyCost = item.monthlyCost;
    const annualCost = monthlyCost * 12;
    // P168 B3-14：params 的表达式与兜底里的表达式必须**同源** ⇒ 先用局部变量承接
    const modelName = item.info.name;
    const contextWindow = item.info.contextWindow;

    out.push(
      makeToken(
        "calc_out.openai_token.row.model_header",
        icon + " " + modelName,
        { icon: icon, name: modelName },
      ) +
        " | " +
        makeToken(
          "calc_out.openai_token.row.model_context",
          "Context: " + contextWindow + " tokens",
          { context: contextWindow },
        ),
    );
    out.push(DASH.repeat(44));

    const inputCostLine = (inTokens / 1_000_000) * item.inputPrice;
    const rm = item.info.reasoningMultiplier || 1;
    const effectiveOut = outTokens * rm;
    const outputCostLine = (effectiveOut / 1_000_000) * item.outputPrice;
    const inputTokensLabel = pad(lc(inTokens), 7);
    const inputPriceLabel = fmt(item.inputPrice);
    const inputCostLabel = fmt(inputCostLine);
    out.push(
      makeToken(
        "calc_out.openai_token.row.input_cost_line",
        "Input:  " +
          inputTokensLabel +
          " tokens × " +
          inputPriceLabel +
          "/1M → " +
          inputCostLabel +
          "/req",
        { tokens: inputTokensLabel, price: inputPriceLabel, cost: inputCostLabel },
      ),
    );
    const outputTokensLabel = pad(lc(outTokens), 7);
    const outputPriceLabel = fmt(item.outputPrice);
    const outputCostLabel = fmt(outputCostLine);
    if (rm > 1) {
      const reasoningTokensLabel = lc(outTokens * (rm - 1));
      out.push(
        makeToken(
          "calc_out.openai_token.row.output_cost_line_reasoning",
          "Output: " +
            outputTokensLabel +
            " visible + ~" +
            reasoningTokensLabel +
            " reasoning × " +
            outputPriceLabel +
            "/1M → " +
            outputCostLabel +
            "/req",
          {
            tokens: outputTokensLabel,
            reasoning: reasoningTokensLabel,
            price: outputPriceLabel,
            cost: outputCostLabel,
          },
        ),
      );
    } else {
      out.push(
        makeToken(
          "calc_out.openai_token.row.output_cost_line",
          "Output: " +
            outputTokensLabel +
            " tokens × " +
            outputPriceLabel +
            "/1M → " +
            outputCostLabel +
            "/req",
          { tokens: outputTokensLabel, price: outputPriceLabel, cost: outputCostLabel },
        ),
      );
    }
    if (rm > 1) {
      const rmLabel = String(rm);
      out.push(
        makeToken(
          "calc_out.openai_token.row.reasoning_note",
          "🧠 o-series: hidden reasoning tokens (≈×" + rmLabel + " visible) billed at output rate",
          { rm: rmLabel },
        ),
      );
    }
    out.push(DASH.repeat(44));
    out.push("Per request:    " + fmt(item.costPerReq));
    out.push("Daily (" + reqPerDay + "):    " + fmt(dailyCost));
    out.push("Monthly (30d):  " + fmt(monthlyCost));
    out.push("Annual:         " + fmt(annualCost));
    out.push(DASH.repeat(44));

    // Alternative pricing line
    if (pricingMode === "realtime") {
      const batchCPR =
        (inTokens / 1_000_000) * item.info.batchInput +
        (effectiveOut / 1_000_000) * item.info.batchOutput;
      const batchMonthly = batchCPR * reqPerDay * 30;
      const batchCprLabel = fmt(batchCPR);
      const batchMonthlyLabel = fmt(batchMonthly);
      out.push(
        makeToken(
          "calc_out.openai_token.row.batch_pricing",
          "\u{1F4A1} Batch pricing: " +
            batchCprLabel +
            "/req (" +
            batchMonthlyLabel +
            "/mo) — save 50%",
          { cpr: batchCprLabel, monthly: batchMonthlyLabel },
        ),
      );
    } else {
      const realtimeCPR =
        (inTokens / 1_000_000) * item.info.input +
        (effectiveOut / 1_000_000) * item.info.output;
      const realtimeMonthly = realtimeCPR * reqPerDay * 30;
      const realtimeCprLabel = fmt(realtimeCPR);
      const realtimeMonthlyLabel = fmt(realtimeMonthly);
      out.push(
        makeToken(
          "calc_out.openai_token.row.realtime_pricing",
          "\u{1F534} Real-time: " +
            realtimeCprLabel +
            "/req (" +
            realtimeMonthlyLabel +
            "/mo)",
          { cpr: realtimeCprLabel, monthly: realtimeMonthlyLabel },
        ),
      );
    }

    // Cache line
    if (cacheHitRate > 0) {
      // Cached input tokens get 50% discount on input pricing
      const effectiveInput =
        item.inputPrice * (1 - cacheHitRate / 100) +
        item.inputPrice * 0.5 * (cacheHitRate / 100);
      const cachedCPR =
        (inTokens / 1_000_000) * effectiveInput +
        (effectiveOut / 1_000_000) * item.outputPrice;
      const cachedMonthly = cachedCPR * reqPerDay * 30;
      const cacheRateLabel = String(cacheHitRate);
      const cachedCprLabel = fmt(cachedCPR);
      const cachedMonthlyLabel = fmt(cachedMonthly);
      out.push(
        makeToken(
          "calc_out.openai_token.row.cache_hit_line",
          "\u{1F4BE} With " +
            cacheRateLabel +
            "% cache hit: " +
            cachedCprLabel +
            "/req (" +
            cachedMonthlyLabel +
            "/mo)",
          { rate: cacheRateLabel, cpr: cachedCprLabel, monthly: cachedMonthlyLabel },
        ),
      );
    }

    out.push("");
  }

  // ================================================================
  // Section 4: Growth Projection (only if growthRate > 0)
  // ================================================================
  if (growthRate > 0) {
    const growthRateLabel = String(growthRate);
    out.push(
      makeToken(
        "calc_out.section.openai_token_growth_projection",
        "\u{1F4C8} Growth Projection (" + growthRateLabel + "% monthly)",
        { rate: growthRateLabel },
      ),
    );
    out.push("");

    // Build month list
    const monthList: number[] = [1];
    if (projMonths >= 3) monthList.push(3);
    if (projMonths >= 6) monthList.push(6);
    if (projMonths >= 12) monthList.push(12);
    if (!monthList.includes(projMonths)) monthList.push(projMonths);
    monthList.sort((a, b) => a - b);

    // Header row
    let headerRow = pad("Month", 6);
    for (const item of selectedCosts) {
      headerRow += pad(item.info.name, 13);
    }
    headerRow += pad("Cum. Diff", 12);
    out.push(headerRow);

    // Separator
    let sepRow = DASH.repeat(5) + " ";
    for (let i = 0; i < selectedCosts.length; i++) {
      sepRow += DASH.repeat(11) + "  ";
    }
    sepRow += DASH.repeat(10);
    out.push(sepRow);

    let cumDiff = 0;

    for (const month of monthList) {
      const growth = Math.pow(1 + growthRate / 100, month - 1);
      const monthCosts = selectedCosts.map((item) => {
        return item.costPerReq * reqPerDay * 30 * growth;
      });
      const minCost = Math.min(...monthCosts);
      const maxC = Math.max(...monthCosts);

      // Cumulative diff: running sum of (most_expensive - cheapest) each period
      cumDiff += maxC - minCost;

      let row = pad(String(month), 6);
      for (const mc of monthCosts) {
        row += pad(fmt(mc), 13);
      }
      row += pad(fmt(cumDiff), 12);
      out.push(row);
    }
    out.push("");
  }

  // ================================================================
  // Section 5: Savings Insights
  // ================================================================
  out.push(makeToken("calc_out.section.openai_token_savings_insights", "\u{1F4B0} Savings Insights"));
  out.push(SEP.repeat(60));

  // Cheapest overall
  out.push(
    "\u{1F3C6} Cheapest: " +
      cheapest.info.name +
      " at " +
      fmt(cheapest.monthlyCost) +
      "/mo",
  );

  // Best value (cheapest non-legacy, non-Nano by cost)
  const bestValue = allCosts
    .filter(
      (c) =>
        c.info.family !== "legacy" &&
        !c.info.name.toLowerCase().includes("nano"),
    )
    .reduce(
      (min, c) => (c.monthlyCost < min.monthlyCost ? c : min),
      allCosts[0],
    );
  if (bestValue) {
    const bestValueName = bestValue.info.name;
    const bestValueCostLabel = fmt(bestValue.monthlyCost);
    out.push(
      makeToken(
        "calc_out.openai_token.row.best_value",
        "⭐ Best value (non-legacy, non-Nano): " +
          bestValueName +
          " at " +
          bestValueCostLabel +
          "/mo",
        { name: bestValueName, cost: bestValueCostLabel },
      ),
    );
  }

  // Switch savings: most expensive selected vs cheapest selected
  if (selectedCosts.length >= 2) {
    const mostExpSelected = selectedCosts.reduce((max, c) =>
      c.monthlyCost > max.monthlyCost ? c : max,
    );
    const cheapSelected = selectedCosts.reduce((min, c) =>
      c.monthlyCost < min.monthlyCost ? c : min,
    );
    const diff = mostExpSelected.monthlyCost - cheapSelected.monthlyCost;
    const switchFromName = mostExpSelected.info.name;
    const switchToName = cheapSelected.info.name;
    const switchMonthlyLabel = fmt(diff);
    const switchYearlyLabel = fmt(diff * 12);
    out.push(
      makeToken(
        "calc_out.openai_token.row.switch_savings",
        "\u{1F4B8} Switching from " +
          switchFromName +
          " to " +
          switchToName +
          " saves " +
          switchMonthlyLabel +
          "/mo (" +
          switchYearlyLabel +
          "/yr)",
        {
          from: switchFromName,
          to: switchToName,
          monthly: switchMonthlyLabel,
          yearly: switchYearlyLabel,
        },
      ),
    );
  }

  // Caching tip
  if (cacheHitRate > 0 && selectedCosts.length > 0) {
    const ref = selectedCosts[0];
    const effectiveInput =
      ref.inputPrice * (1 - cacheHitRate / 100) +
      ref.inputPrice * 0.5 * (cacheHitRate / 100);
    const cachedCPR =
      (inTokens / 1_000_000) * effectiveInput +
      (outTokens / 1_000_000) * ref.outputPrice;
    const cachedMonthly = cachedCPR * reqPerDay * 30;
    const cacheSaving = ref.monthlyCost - cachedMonthly;
    const cacheHitRateLabel = String(cacheHitRate);
    const cacheSavingLabel = fmt(cacheSaving);
    const cacheRefName = ref.info.name;
    out.push(
      makeToken(
        "calc_out.openai_token.row.prompt_caching",
        "\u{1F4BE} Prompt caching at " +
          cacheHitRateLabel +
          "% hit rate saves ~" +
          cacheSavingLabel +
          "/mo on " +
          cacheRefName,
        { rate: cacheHitRateLabel, save: cacheSavingLabel, name: cacheRefName },
      ),
    );
  }

  // Cross-provider comparison — cheapest competitors
  // DeepSeek Chat: $0.14/$0.28, Gemini 2.0 Flash: $0.10/$0.40
  const dsCost =
    (inTokens / 1_000_000) * 0.14 + (outTokens / 1_000_000) * 0.28;
  const dsMonthly = dsCost * reqPerDay * 30;
  const gfCost =
    (inTokens / 1_000_000) * 0.1 + (outTokens / 1_000_000) * 0.4;
  const gfMonthly = gfCost * reqPerDay * 30;
  const cheapestCompetitor = dsMonthly < gfMonthly ? "DeepSeek Chat" : "Gemini 2.0 Flash";
  const cheapestCompCost = Math.min(dsMonthly, gfMonthly);
  if (cheapest.monthlyCost > 0) {
    const crossCostLabel = fmt(cheapestCompCost);
    const crossSavingLabel = fmt(cheapest.monthlyCost - cheapestCompCost);
    const crossPctLabel =
      cheapestCompCost > 0
        ? ((1 - cheapestCompCost / cheapest.monthlyCost) * 100).toFixed(0)
        : "0";
    out.push(
      makeToken(
        "calc_out.openai_token.row.cross_provider",
        "\u{1F30D} Cross-provider: " +
          cheapestCompetitor +
          " @ " +
          crossCostLabel +
          "/mo — saves " +
          crossSavingLabel +
          "/mo (" +
          crossPctLabel +
          "% cheaper) vs cheapest OpenAI",
        {
          provider: cheapestCompetitor,
          cost: crossCostLabel,
          saving: crossSavingLabel,
          pct: crossPctLabel,
        },
      ),
    );
  }

  out.push("");

  // ================================================================
  // Section 6: Usage Scenarios — per-model rows
  // ================================================================
  out.push(makeToken("calc_out.section.openai_token_usage_scenarios", "\u{1F4C5} Usage Scenarios (monthly costs)"));
  out.push(SEP.repeat(60));

  const scenarioVolumes = [50, 100, 500, 1000, 5000, 10000];
  for (const item of selectedCosts) {
    const icon = FAMILY_ICONS[item.info.family];
    let line = icon + " " + item.info.name + ":  ";
    const parts: string[] = [];
    for (const vol of scenarioVolumes) {
      const mc = item.costPerReq * vol * 30;
      const volLabel = vol >= 1000 ? (vol / 1000) + "K" : String(vol);
      parts.push(volLabel + "→" + fmt(mc));
    }
    line += parts.join("  ·  ");
    out.push(line);
  }

  // 🩺 Cost Health (v3)
  out.push('');
  out.push(makeToken("calc_out.section.openai_token_cost_health", '🩺 Cost Health:'));
  out.push(SEP.repeat(60));
  const totalSelectedMonthly = selectedCosts.reduce((s, c) => s + c.monthlyCost, 0);
  const cheapestSelected = selectedCosts.reduce((min, c) => c.monthlyCost < min.monthlyCost ? c : min);
  const expensiveSelected = selectedCosts.reduce((max, c) => c.monthlyCost > max.monthlyCost ? c : max);
  if (selectedCosts.length >= 2) {
    const ratio = expensiveSelected.monthlyCost / Math.max(cheapestSelected.monthlyCost, 0.01);
    if (ratio >= 50) {
      const ratioLabel = ratio.toFixed(0);
      out.push(
        makeToken(
          "calc_out.openai_token.row.health_spread_extreme",
          '• 🔴 Your most expensive selection costs ' + ratioLabel + 'x your cheapest — consider mixing tiers (e.g., cheap model for 90% of traffic, premium for 10%).',
          { ratio: ratioLabel },
        ),
      );
    } else if (ratio >= 10) {
      const ratioLabel = ratio.toFixed(0);
      out.push(
        makeToken(
          "calc_out.openai_token.row.health_spread_wide",
          '• 🟠 ' + ratioLabel + 'x cost spread across selected models — review if every model needs to be premium.',
          { ratio: ratioLabel },
        ),
      );
    } else {
      const ratioLabel = ratio.toFixed(1);
      out.push(
        makeToken(
          "calc_out.openai_token.row.health_spread_ok",
          '• 🟢 Healthy cost spread (' + ratioLabel + 'x) across selected models.',
          { ratio: ratioLabel },
        ),
      );
    }
  }
  if (cheapestSelected) {
    const tierName = cheapestSelected.info.name;
    const tierCostLabel = fmt(cheapestSelected.monthlyCost);
    if (cheapestSelected.monthlyCost < 5) {
      out.push(
        makeToken(
          "calc_out.openai_token.row.health_tier_micro",
          '• 🟢 Micro-tier (under $5/mo) — ' + tierName + ' at ' + tierCostLabel + '/mo.',
          { name: tierName, cost: tierCostLabel },
        ),
      );
    } else if (cheapestSelected.monthlyCost < 50) {
      out.push(
        makeToken(
          "calc_out.openai_token.row.health_tier_low",
          '• 🟢 Low-volume tier — ' + tierName + ' at ' + tierCostLabel + '/mo.',
          { name: tierName, cost: tierCostLabel },
        ),
      );
    } else if (cheapestSelected.monthlyCost < 500) {
      out.push(
        makeToken(
          "calc_out.openai_token.row.health_tier_mid",
          '• 🟡 Mid-volume tier — ' + tierName + ' at ' + tierCostLabel + '/mo.',
          { name: tierName, cost: tierCostLabel },
        ),
      );
    } else {
      out.push(
        makeToken(
          "calc_out.openai_token.row.health_tier_high",
          '• 🟠 High-volume tier — ' + tierName + ' at ' + tierCostLabel + '/mo.',
          { name: tierName, cost: tierCostLabel },
        ),
      );
    }
  }
  if (cacheHitRate === 0) {
    out.push(
      makeToken(
        "calc_out.openai_token.row.health_cache_none",
        '• ⚠️ Cache hit rate is 0% — enabling prompt caching on repeated prefixes can cut cost 40-90%. Toggle above to model it.',
      ),
    );
  } else if (cacheHitRate < 30) {
    const healthCacheRateLabel = String(cacheHitRate);
    out.push(
      makeToken(
        "calc_out.openai_token.row.health_cache_low",
        '• 🟡 Low cache hit rate (' + healthCacheRateLabel + '%) — review if your prompt has stable system instructions or few-shot examples.',
        { rate: healthCacheRateLabel },
      ),
    );
  } else {
    const healthCacheRateLabel = String(cacheHitRate);
    out.push(
      makeToken(
        "calc_out.openai_token.row.health_cache_ok",
        '• 🟢 Healthy cache rate (' + healthCacheRateLabel + '%) — keep an eye on cache TTL vs your traffic pattern.',
        { rate: healthCacheRateLabel },
      ),
    );
  }
  if (pricingMode === 'realtime') {
    const batchSavings = totalSelectedMonthly * 0.5;
    const batchSavingsLabel = fmt(batchSavings);
    out.push(
      makeToken(
        "calc_out.openai_token.row.health_batch_tip",
        '• 💡 Switch to batch pricing: save ~' + batchSavingsLabel + '/mo (50% discount) if latency is not critical.',
        { save: batchSavingsLabel },
      ),
    );
  }
  out.push('');

  // 🔄 What-If Scenarios (v3)
  out.push(makeToken("calc_out.section.what_if_scenarios", '🔄 What-If Scenarios:'));
  out.push(SEP.repeat(60));
  // Switch to batch
  if (pricingMode === 'realtime') {
    const batchTotal = totalSelectedMonthly * 0.5;
    const currentTotalLabel = fmt(totalSelectedMonthly);
    const batchTotalLabel = fmt(batchTotal);
    const batchSaveLabel = fmt(totalSelectedMonthly - batchTotal);
    out.push(
      makeToken(
        "calc_out.openai_token.row.whatif_switch_batch",
        '• Switch ALL selected to batch pricing:  ' + currentTotalLabel + ' → ' + batchTotalLabel + '/mo  (save ' + batchSaveLabel + ')',
        { from: currentTotalLabel, to: batchTotalLabel, save: batchSaveLabel },
      ),
    );
  } else {
    const realtimeTotal = totalSelectedMonthly * 2;
    const realtimeTotalLabel = fmt(realtimeTotal);
    out.push(
      makeToken(
        "calc_out.openai_token.row.whatif_switch_realtime",
        '• Switch back to real-time (if latency allows batch):  save vs ' + realtimeTotalLabel + '/mo  (50% off currently)',
        { value: realtimeTotalLabel },
      ),
    );
  }
  // Switch to cheapest popular model
  const popularCheapest = allCosts
    .reduce((min, c) => (c.info.input + c.info.output) < (min.info.input + min.info.output) ? c : min, allCosts[0]);
  if (popularCheapest && popularCheapest.key !== cheapestSelected?.key) {
    const cpr = (inTokens / 1e6) * popularCheapest.info.input + (outTokens / 1e6) * popularCheapest.info.output;
    const newMonthly = cpr * reqPerDay * 30;
    const savings = (cheapestSelected?.monthlyCost ?? 0) - newMonthly;
    if (savings > 0) {
      const popularName = popularCheapest.info.name;
      const popularSavingsLabel = fmt(savings);
      out.push(
        makeToken(
          "calc_out.openai_token.row.whatif_switch_cheapest",
          '• Switch cheapest to ' + popularName + ':  save ' + popularSavingsLabel + '/mo  (similar quality, much cheaper)',
          { name: popularName, save: popularSavingsLabel },
        ),
      );
    }
  }
  // Double volume
  const doubleVol = totalSelectedMonthly * 2;
  const doubleReqsLabel = lc(reqPerDay * 2);
  const doubleVolLabel = fmt(doubleVol);
  out.push(
    makeToken(
      "calc_out.openai_token.row.whatif_double_volume",
      '• Double volume to ' + doubleReqsLabel + ' reqs/day:  ' + doubleVolLabel + '/mo',
      { reqs: doubleReqsLabel, cost: doubleVolLabel },
    ),
  );
  // Halve volume
  const halfVol = totalSelectedMonthly / 2;
  const halfReqsLabel = lc(Math.max(1, Math.floor(reqPerDay / 2)));
  const halfVolLabel = fmt(halfVol);
  out.push(
    makeToken(
      "calc_out.openai_token.row.whatif_halve_volume",
      '• Halve volume to ' + halfReqsLabel + ' reqs/day:  ' + halfVolLabel + '/mo',
      { reqs: halfReqsLabel, cost: halfVolLabel },
    ),
  );
  // 50% cache
  if (cacheHitRate < 50) {
    const cacheBoost = 50;
    const cacheFactor = 1 - cacheBoost / 100 * 0.5; // assume 50% of input is cacheable
    const cachedMonthly = totalSelectedMonthly * (0.5 + 0.5 * cacheFactor);
    const cacheSavings = totalSelectedMonthly - cachedMonthly;
    const cacheSaveLabel = fmt(cacheSavings);
    const cacheFromLabel = fmt(totalSelectedMonthly);
    const cacheToLabel = fmt(cachedMonthly);
    out.push(
      makeToken(
        "calc_out.openai_token.row.whatif_cache_boost",
        '• Boost cache hit rate to 50%:  save ~' + cacheSaveLabel + '/mo  (' + cacheFromLabel + ' → ' + cacheToLabel + ')',
        { save: cacheSaveLabel, from: cacheFromLabel, to: cacheToLabel },
      ),
    );
  }
  out.push('');

  return out;
}

// ============================================================
// Task 5: customFn — minified JS producing identical output
// ============================================================

const customFn =
  // Model data: full keys matching MODELS constant → {i,o,f,c,bi,bo,n}
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let c=function(u){return u<.01&&u>0?"$"+u.toFixed(4):"$"+u.toFixed(2)},v=function(u){return u.toLocaleString()},w=function(u,B){return u+" ".repeat(Math.max(0,B-u.length))},z=function(u){const B=[...new Set((u.models||J.join(",")).split(",").map(t=>t.trim()).filter(Boolean))],y=Math.max(1,Math.min(1e7,parseInt(u.inputTokens)||1e3)),_=Math.max(1,Math.min(1e7,parseInt(u.outputTokens)||500)),f=Math.max(0,Math.min(1e6,parseInt(u.requestsPerDay)||100)),F=u.pricingMode==="batch"?"batch":"realtime",h=Math.min(100,Math.max(0,parseInt(u.cacheHitRate)||0)),$=Math.min(50,Math.max(0,parseFloat(u.growthRate)||0)),Q=parseInt(u.projectionMonths),W=[3,6,12].includes(Q)?Q:12,g=[];for(const[t,o]of Object.entries(ht)){const a=F==="batch"?o.batchInput:o.input,s=F==="batch"?o.batchOutput:o.output,r=o.reasoningMultiplier||1,i=_*r,p=y/1e6*a+i/1e6*s,l=p*f*30;g.push({key:t,info:o,inputPrice:a,outputPrice:s,costPerReq:p,monthlyCost:l})}g.sort((t,o)=>t.info.order-o.info.order);const q=g.reduce((t,o)=>o.monthlyCost<t.monthlyCost?o:t),U=g.reduce((t,o)=>o.monthlyCost>t.monthlyCost?o:t).monthlyCost,m=[];for(const t of B){const o=g.find(a=>a.key===t);o&&m.push(o)}if(m.length===0)for(const t of J){const o=g.find(a=>a.key===t);o&&m.push(o)}const e=[];e.push(""),F==="batch"?e.push(h>0?n("calc_out.openai_token.row.header_batch_cache","⚡ Batch Pricing | 💾 "+h+"% Cache Hit Rate",{cache:String(h)}):n("calc_out.openai_token.row.header_batch","⚡ Batch Pricing")):e.push(h>0?n("calc_out.openai_token.row.header_realtime_cache","🔴 Real-time Pricing | 💾 "+h+"% Cache Hit Rate",{cache:String(h)}):n("calc_out.openai_token.row.header_realtime","🔴 Real-time Pricing")),e.push("");const X=v(y),Y=v(_),Z=v(f);e.push(n("calc_out.openai_token.row.input_summary","📥 Input: "+X+" tokens/req",{in:X})+" | "+n("calc_out.openai_token.row.output_summary","📤 Output: "+Y+" tokens/req",{out:Y})+" | "+n("calc_out.openai_token.row.requests_summary","🔄 "+Z+" reqs/day",{reqs:Z})),e.push("");const k=String(g.length);e.push(n("calc_out.section.openai_token_cost_comparison","📊 Cost Comparison ("+k+" Models)",{models:k})),e.push("");for(const t of g){const a=D[t.info.family]+" "+t.info.name,s=w(a,22),r=U>0?Math.max(1,Math.round(t.monthlyCost/U*32)):0,i="█".repeat(r),l=t.key===q.key?" 🏆":"";e.push(s+i+" "+c(t.monthlyCost)+l)}e.push(""),e.push(""),e.push(n("calc_out.section.ai_api_cost_comparison_selected_models","📋 Selected Model Details")),e.push(I.repeat(60));for(const t of m){const o=D[t.info.family],a=t.costPerReq*f,s=t.monthlyCost,r=s*12,i=t.info.name,p=t.info.contextWindow;e.push(n("calc_out.openai_token.row.model_header",o+" "+i,{icon:o,name:i})+" | "+n("calc_out.openai_token.row.model_context","Context: "+p+" tokens",{context:p})),e.push(P.repeat(44));const l=y/1e6*t.inputPrice,d=t.info.reasoningMultiplier||1,S=_*d,K=S/1e6*t.outputPrice,O=w(v(y),7),st=c(t.inputPrice),it=c(l);e.push(n("calc_out.openai_token.row.input_cost_line","Input:  "+O+" tokens × "+st+"/1M → "+it+"/req",{tokens:O,price:st,cost:it}));const N=w(v(_),7),V=c(t.outputPrice),H=c(K);if(d>1){const b=v(_*(d-1));e.push(n("calc_out.openai_token.row.output_cost_line_reasoning","Output: "+N+" visible + ~"+b+" reasoning × "+V+"/1M → "+H+"/req",{tokens:N,reasoning:b,price:V,cost:H}))}else e.push(n("calc_out.openai_token.row.output_cost_line","Output: "+N+" tokens × "+V+"/1M → "+H+"/req",{tokens:N,price:V,cost:H}));if(d>1){const b=String(d);e.push(n("calc_out.openai_token.row.reasoning_note","🧠 o-series: hidden reasoning tokens (≈×"+b+" visible) billed at output rate",{rm:b}))}if(e.push(P.repeat(44)),e.push("Per request:    "+c(t.costPerReq)),e.push("Daily ("+f+"):    "+c(a)),e.push("Monthly (30d):  "+c(s)),e.push("Annual:         "+c(r)),e.push(P.repeat(44)),F==="realtime"){const b=y/1e6*t.info.batchInput+S/1e6*t.info.batchOutput,R=b*f*30,x=c(b),L=c(R);e.push(n("calc_out.openai_token.row.batch_pricing","💡 Batch pricing: "+x+"/req ("+L+"/mo) — save 50%",{cpr:x,monthly:L}))}else{const b=y/1e6*t.info.input+S/1e6*t.info.output,R=b*f*30,x=c(b),L=c(R);e.push(n("calc_out.openai_token.row.realtime_pricing","🔴 Real-time: "+x+"/req ("+L+"/mo)",{cpr:x,monthly:L}))}if(h>0){const b=t.inputPrice*(1-h/100)+t.inputPrice*.5*(h/100),R=y/1e6*b+S/1e6*t.outputPrice,x=R*f*30,L=String(h),rt=c(R),ut=c(x);e.push(n("calc_out.openai_token.row.cache_hit_line","💾 With "+L+"% cache hit: "+rt+"/req ("+ut+"/mo)",{rate:L,cpr:rt,monthly:ut}))}e.push("")}if($>0){const t=String($);e.push(n("calc_out.section.openai_token_growth_projection","📈 Growth Projection ("+t+"% monthly)",{rate:t})),e.push("");const o=[1];W>=3&&o.push(3),W>=6&&o.push(6),W>=12&&o.push(12),o.includes(W)||o.push(W),o.sort((i,p)=>i-p);let a=w("Month",6);for(const i of m)a+=w(i.info.name,13);a+=w("Cum. Diff",12),e.push(a);let s=P.repeat(5)+" ";for(let i=0;i<m.length;i++)s+=P.repeat(11)+"  ";s+=P.repeat(10),e.push(s);let r=0;for(const i of o){const p=Math.pow(1+$/100,i-1),l=m.map(O=>O.costPerReq*f*30*p),d=Math.min(...l),S=Math.max(...l);r+=S-d;let K=w(String(i),6);for(const O of l)K+=w(c(O),13);K+=w(c(r),12),e.push(K)}e.push("")}e.push(n("calc_out.section.openai_token_savings_insights","💰 Savings Insights")),e.push(I.repeat(60)),e.push("🏆 Cheapest: "+q.info.name+" at "+c(q.monthlyCost)+"/mo");const E=g.filter(t=>t.info.family!=="legacy"&&!t.info.name.toLowerCase().includes("nano")).reduce((t,o)=>o.monthlyCost<t.monthlyCost?o:t,g[0]);if(E){const t=E.info.name,o=c(E.monthlyCost);e.push(n("calc_out.openai_token.row.best_value","⭐ Best value (non-legacy, non-Nano): "+t+" at "+o+"/mo",{name:t,cost:o}))}if(m.length>=2){const t=m.reduce((l,d)=>d.monthlyCost>l.monthlyCost?d:l),o=m.reduce((l,d)=>d.monthlyCost<l.monthlyCost?d:l),a=t.monthlyCost-o.monthlyCost,s=t.info.name,r=o.info.name,i=c(a),p=c(a*12);e.push(n("calc_out.openai_token.row.switch_savings","💸 Switching from "+s+" to "+r+" saves "+i+"/mo ("+p+"/yr)",{from:s,to:r,monthly:i,yearly:p}))}if(h>0&&m.length>0){const t=m[0],o=t.inputPrice*(1-h/100)+t.inputPrice*.5*(h/100),s=(y/1e6*o+_/1e6*t.outputPrice)*f*30,r=t.monthlyCost-s,i=String(h),p=c(r),l=t.info.name;e.push(n("calc_out.openai_token.row.prompt_caching","💾 Prompt caching at "+i+"% hit rate saves ~"+p+"/mo on "+l,{rate:i,save:p,name:l}))}const T=(y/1e6*.14+_/1e6*.28)*f*30,tt=(y/1e6*.1+_/1e6*.4)*f*30,ot=T<tt?"DeepSeek Chat":"Gemini 2.0 Flash",j=Math.min(T,tt);if(q.monthlyCost>0){const t=c(j),o=c(q.monthlyCost-j),a=j>0?((1-j/q.monthlyCost)*100).toFixed(0):"0";e.push(n("calc_out.openai_token.row.cross_provider","🌍 Cross-provider: "+ot+" @ "+t+"/mo — saves "+o+"/mo ("+a+"% cheaper) vs cheapest OpenAI",{provider:ot,cost:t,saving:o,pct:a}))}e.push(""),e.push(n("calc_out.section.openai_token_usage_scenarios","📅 Usage Scenarios (monthly costs)")),e.push(I.repeat(60));const mt=[50,100,500,1e3,5e3,1e4];for(const t of m){let a=D[t.info.family]+" "+t.info.name+":  ";const s=[];for(const r of mt){const i=t.costPerReq*r*30,p=r>=1e3?r/1e3+"K":String(r);s.push(p+"→"+c(i))}a+=s.join("  ·  "),e.push(a)}e.push(""),e.push(n("calc_out.section.openai_token_cost_health","🩺 Cost Health:")),e.push(I.repeat(60));const C=m.reduce((t,o)=>t+o.monthlyCost,0),M=m.reduce((t,o)=>o.monthlyCost<t.monthlyCost?o:t),ft=m.reduce((t,o)=>o.monthlyCost>t.monthlyCost?o:t);if(m.length>=2){const t=ft.monthlyCost/Math.max(M.monthlyCost,.01);if(t>=50){const o=t.toFixed(0);e.push(n("calc_out.openai_token.row.health_spread_extreme","• 🔴 Your most expensive selection costs "+o+"x your cheapest — consider mixing tiers (e.g., cheap model for 90% of traffic, premium for 10%).",{ratio:o}))}else if(t>=10){const o=t.toFixed(0);e.push(n("calc_out.openai_token.row.health_spread_wide","• 🟠 "+o+"x cost spread across selected models — review if every model needs to be premium.",{ratio:o}))}else{const o=t.toFixed(1);e.push(n("calc_out.openai_token.row.health_spread_ok","• 🟢 Healthy cost spread ("+o+"x) across selected models.",{ratio:o}))}}if(M){const t=M.info.name,o=c(M.monthlyCost);M.monthlyCost<5?e.push(n("calc_out.openai_token.row.health_tier_micro","• 🟢 Micro-tier (under $5/mo) — "+t+" at "+o+"/mo.",{name:t,cost:o})):M.monthlyCost<50?e.push(n("calc_out.openai_token.row.health_tier_low","• 🟢 Low-volume tier — "+t+" at "+o+"/mo.",{name:t,cost:o})):M.monthlyCost<500?e.push(n("calc_out.openai_token.row.health_tier_mid","• 🟡 Mid-volume tier — "+t+" at "+o+"/mo.",{name:t,cost:o})):e.push(n("calc_out.openai_token.row.health_tier_high","• 🟠 High-volume tier — "+t+" at "+o+"/mo.",{name:t,cost:o}))}if(h===0)e.push(n("calc_out.openai_token.row.health_cache_none","• ⚠️ Cache hit rate is 0% — enabling prompt caching on repeated prefixes can cut cost 40-90%. Toggle above to model it."));else if(h<30){const t=String(h);e.push(n("calc_out.openai_token.row.health_cache_low","• 🟡 Low cache hit rate ("+t+"%) — review if your prompt has stable system instructions or few-shot examples.",{rate:t}))}else{const t=String(h);e.push(n("calc_out.openai_token.row.health_cache_ok","• 🟢 Healthy cache rate ("+t+"%) — keep an eye on cache TTL vs your traffic pattern.",{rate:t}))}if(F==="realtime"){const t=C*.5,o=c(t);e.push(n("calc_out.openai_token.row.health_batch_tip","• 💡 Switch to batch pricing: save ~"+o+"/mo (50% discount) if latency is not critical.",{save:o}))}if(e.push(""),e.push(n("calc_out.section.what_if_scenarios","🔄 What-If Scenarios:")),e.push(I.repeat(60)),F==="realtime"){const t=C*.5,o=c(C),a=c(t),s=c(C-t);e.push(n("calc_out.openai_token.row.whatif_switch_batch","• Switch ALL selected to batch pricing:  "+o+" → "+a+"/mo  (save "+s+")",{from:o,to:a,save:s}))}else{const t=C*2,o=c(t);e.push(n("calc_out.openai_token.row.whatif_switch_realtime","• Switch back to real-time (if latency allows batch):  save vs "+o+"/mo  (50% off currently)",{value:o}))}const G=g.reduce((t,o)=>o.info.input+o.info.output<t.info.input+t.info.output?o:t,g[0]);if(G&&G.key!==M?.key){const o=(y/1e6*G.info.input+_/1e6*G.info.output)*f*30,a=(M?.monthlyCost??0)-o;if(a>0){const s=G.info.name,r=c(a);e.push(n("calc_out.openai_token.row.whatif_switch_cheapest","• Switch cheapest to "+s+":  save "+r+"/mo  (similar quality, much cheaper)",{name:s,save:r}))}}const _t=C*2,et=v(f*2),nt=c(_t);e.push(n("calc_out.openai_token.row.whatif_double_volume","• Double volume to "+et+" reqs/day:  "+nt+"/mo",{reqs:et,cost:nt}));const dt=C/2,ct=v(Math.max(1,Math.floor(f/2))),at=c(dt);if(e.push(n("calc_out.openai_token.row.whatif_halve_volume","• Halve volume to "+ct+" reqs/day:  "+at+"/mo",{reqs:ct,cost:at})),h<50){const a=C*.875,s=C-a,r=c(s),i=c(C),p=c(a);e.push(n("calc_out.openai_token.row.whatif_cache_boost","• Boost cache hit rate to 50%:  save ~"+r+"/mo  ("+i+" → "+p+")",{save:r,from:i,to:p}))}return e.push(""),e},A=function(u,B,y){var _=lt(u);return Array.isArray(_)?_.join(\`
\`):String(_)};var bt=c,yt=v,gt=w,wt=z,Ct=A,n=tk,pt='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',n=new Function("return "+pt)(),ht={"gpt-5.5":{input:5,output:30,batchInput:2.5,batchOutput:15,name:"GPT 5.5",family:"gpt5",contextWindow:"1M",order:5},"gpt-5.2":{input:1.75,output:14,batchInput:.875,batchOutput:7,name:"GPT 5.2",family:"gpt5",contextWindow:"272K",order:6},"gpt-5":{input:1.25,output:10,batchInput:.625,batchOutput:5,name:"GPT 5",family:"gpt5",contextWindow:"272K",order:7},"gpt-5-mini":{input:.25,output:2,batchInput:.125,batchOutput:1,name:"GPT 5 Mini",family:"gpt5",contextWindow:"272K",order:8},"gpt-5-nano":{input:.05,output:.4,batchInput:.025,batchOutput:.2,name:"GPT 5 Nano",family:"gpt5",contextWindow:"272K",order:9},"gpt-4.1":{input:2,output:8,batchInput:1,batchOutput:4,name:"GPT 4.1",family:"gpt41",contextWindow:"1M",order:10},"gpt-4.1-mini":{input:.4,output:1.6,batchInput:.2,batchOutput:.8,name:"GPT 4.1 Mini",family:"gpt41",contextWindow:"1M",order:11},"gpt-4.1-nano":{input:.1,output:.4,batchInput:.05,batchOutput:.2,name:"GPT 4.1 Nano",family:"gpt41",contextWindow:"1M",order:12},o3:{input:2,output:8,batchInput:1,batchOutput:4,name:"O3",family:"o-series",contextWindow:"200K",order:13,reasoningMultiplier:4},"o4-mini":{input:1.1,output:4.4,batchInput:.55,batchOutput:2.2,name:"O4 Mini",family:"o-series",contextWindow:"200K",order:14,reasoningMultiplier:4},"gpt-4o":{input:2.5,output:10,batchInput:1.25,batchOutput:5,name:"GPT 4o",family:"legacy",contextWindow:"128K",order:15},"gpt-4o-mini":{input:.15,output:.6,batchInput:.075,batchOutput:.3,name:"GPT 4o Mini",family:"legacy",contextWindow:"128K",order:16},"gpt-4-turbo":{input:10,output:30,batchInput:5,batchOutput:15,name:"GPT 4 Turbo",family:"legacy",contextWindow:"128K",order:17},"gpt-3.5-turbo":{input:.5,output:1.5,batchInput:.25,batchOutput:.75,name:"GPT 3.5 Turbo",family:"legacy",contextWindow:"16K",order:18},"gpt-6-astra":{input:10,output:50,name:"GPT 6 Astra",family:"gpt6",contextWindow:"922K",order:2,batchInput:5,batchOutput:25},"gpt-6-sol":{input:2,output:10,name:"GPT 6 Sol",family:"gpt6",contextWindow:"922K",order:3,batchInput:1,batchOutput:5},"gpt-6-luna":{input:.1,output:.5,name:"GPT 6 Luna",family:"gpt6",contextWindow:"922K",order:4,batchInput:.05,batchOutput:.25},"gpt-6.1-sol":{input:2,output:10,name:"GPT 6.1 Sol",family:"gpt6",contextWindow:"922K",order:1,batchInput:1,batchOutput:5}},J=["gpt-5-mini","gpt-5.5","gpt-4.1"],D={gpt6:"🔷",gpt5:"🔵",gpt41:"🟢","o-series":"🟠",legacy:"⚪"},I="━",P="─",lt=function(u){return z(u)};return[A(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

// ============================================================
// Task 6: Updated Engine Metadata
// ============================================================

const engine: ToolEngine = {
  slug: "solopreneur-openai-token-calculator",
  title: "OpenAI Token Calculator",
  description:
    "Compare OpenAI API costs across the GPT-6 flagship family, GPT-5, GPT-4.1 and o-series — with batch pricing, prompt caching, and growth projections.",
  inputs: [
    {
      name: "models",
      label: "Models (comma-separated)",
      placeholder: "gpt-5-mini,gpt-5.5,gpt-4.1",
      type: "text",
    },
    {
      name: "inputTokens",
      label: "Input Tokens per Request",
      placeholder: "e.g. 1000",
      type: "number",
    },
    {
      name: "outputTokens",
      label: "Output Tokens per Request",
      placeholder: "e.g. 500",
      type: "number",
    },
    {
      name: "requestsPerDay",
      label: "Requests per Day",
      placeholder: "e.g. 100",
      type: "number",
    },
    {
      name: "pricingMode",
      label: "Pricing Mode",
      placeholder: "",
      type: "select",
      options: ["realtime", "batch"],
    },
    {
      name: "cacheHitRate",
      label: "Cache Hit Rate (%)",
      placeholder: "e.g. 50",
      type: "number",
    },
    {
      name: "growthRate",
      label: "Monthly Growth Rate (%)",
      placeholder: "e.g. 5",
      type: "number",
    },
    {
      name: "projectionMonths",
      label: "Projection Period (months)",
      placeholder: "",
      type: "select",
      options: ["3", "6", "12"],
    },
  ],
  clientConfig: { type: "custom", wordPools: {}, customFn },
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
    return calculate(inputs);
  },
  staticExamples: [
    '\n$calc_out.openai_token.row.header_realtime|🔴 Real-time Pricing|\n\n$calc_out.openai_token.row.input_summary{"in":"1,000"}|📥 Input: 1,000 tokens/req| | $calc_out.openai_token.row.output_summary{"out":"500"}|📤 Output: 500 tokens/req| | $calc_out.openai_token.row.requests_summary{"reqs":"100"}|🔄 100 reqs/day|\n\n$calc_out.section.openai_token_cost_comparison{"models":"18"}|📊 Cost Comparison (18 Models)|\n\n🔷 GPT 6.1 Sol        ██████ $21.00\n🔷 GPT 6 Astra        ████████████████████████████████ $105.00\n🔷 GPT 6 Sol          ██████ $21.00\n🔷 GPT 6 Luna         █ $1.05\n🔵 GPT 5.5            ██████████████████ $60.00\n🔵 GPT 5.2            ████████ $26.25\n🔵 GPT 5              ██████ $18.75\n🔵 GPT 5 Mini         █ $3.75\n🔵 GPT 5 Nano         █ $0.75 🏆\n🟢 GPT 4.1            █████ $18.00\n🟢 GPT 4.1 Mini       █ $3.60\n🟢 GPT 4.1 Nano       █ $0.90\n🟠 O3                 ████████████████ $54.00\n🟠 O4 Mini            █████████ $29.70\n⚪ GPT 4o              ███████ $22.50\n⚪ GPT 4o Mini         █ $1.35\n⚪ GPT 4 Turbo         ███████████████████████ $75.00\n⚪ GPT 3.5 Turbo       █ $3.75\n\n\n$calc_out.section.ai_api_cost_comparison_selected_models|📋 Selected Model Details|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.openai_token.row.model_header{"icon":"🔵","name":"GPT 5"}|🔵 GPT 5| | $calc_out.openai_token.row.model_context{"context":"272K"}|Context: 272K tokens|\n────────────────────────────────────────────\n$calc_out.openai_token.row.input_cost_line{"tokens":"1,000  ","price":"$1.25","cost":"$0.0013"}|Input:  1,000   tokens × $1.25/1M → $0.0013/req|\n$calc_out.openai_token.row.output_cost_line{"tokens":"500    ","price":"$10.00","cost":"$0.0050"}|Output: 500     tokens × $10.00/1M → $0.0050/req|\n────────────────────────────────────────────\nPer request:    $0.0063\nDaily (100):    $0.63\nMonthly (30d):  $18.75\nAnnual:         $225.00\n────────────────────────────────────────────\n$calc_out.openai_token.row.batch_pricing{"cpr":"$0.0031","monthly":"$9.38"}|💡 Batch pricing: $0.0031/req ($9.38/mo) — save 50%|\n\n$calc_out.openai_token.row.model_header{"icon":"🔵","name":"GPT 5 Mini"}|🔵 GPT 5 Mini| | $calc_out.openai_token.row.model_context{"context":"272K"}|Context: 272K tokens|\n────────────────────────────────────────────\n$calc_out.openai_token.row.input_cost_line{"tokens":"1,000  ","price":"$0.25","cost":"$0.0003"}|Input:  1,000   tokens × $0.25/1M → $0.0003/req|\n$calc_out.openai_token.row.output_cost_line{"tokens":"500    ","price":"$2.00","cost":"$0.0010"}|Output: 500     tokens × $2.00/1M → $0.0010/req|\n────────────────────────────────────────────\nPer request:    $0.0013\nDaily (100):    $0.13\nMonthly (30d):  $3.75\nAnnual:         $45.00\n────────────────────────────────────────────\n$calc_out.openai_token.row.batch_pricing{"cpr":"$0.0006","monthly":"$1.88"}|💡 Batch pricing: $0.0006/req ($1.88/mo) — save 50%|\n\n$calc_out.openai_token.row.model_header{"icon":"⚪","name":"GPT 4o"}|⚪ GPT 4o| | $calc_out.openai_token.row.model_context{"context":"128K"}|Context: 128K tokens|\n────────────────────────────────────────────\n$calc_out.openai_token.row.input_cost_line{"tokens":"1,000  ","price":"$2.50","cost":"$0.0025"}|Input:  1,000   tokens × $2.50/1M → $0.0025/req|\n$calc_out.openai_token.row.output_cost_line{"tokens":"500    ","price":"$10.00","cost":"$0.0050"}|Output: 500     tokens × $10.00/1M → $0.0050/req|\n────────────────────────────────────────────\nPer request:    $0.0075\nDaily (100):    $0.75\nMonthly (30d):  $22.50\nAnnual:         $270.00\n────────────────────────────────────────────\n$calc_out.openai_token.row.batch_pricing{"cpr":"$0.0037","monthly":"$11.25"}|💡 Batch pricing: $0.0037/req ($11.25/mo) — save 50%|\n\n$calc_out.section.openai_token_savings_insights|💰 Savings Insights|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🏆 Cheapest: GPT 5 Nano at $0.75/mo\n$calc_out.openai_token.row.best_value{"name":"GPT 6 Luna","cost":"$1.05"}|⭐ Best value (non-legacy, non-Nano): GPT 6 Luna at $1.05/mo|\n$calc_out.openai_token.row.switch_savings{"from":"GPT 4o","to":"GPT 5 Mini","monthly":"$18.75","yearly":"$225.00"}|💸 Switching from GPT 4o to GPT 5 Mini saves $18.75/mo ($225.00/yr)|\n$calc_out.openai_token.row.cross_provider{"provider":"DeepSeek Chat","cost":"$0.84","saving":"$-0.09","pct":"-12"}|🌍 Cross-provider: DeepSeek Chat @ $0.84/mo — saves $-0.09/mo (-12% cheaper) vs cheapest OpenAI|\n\n$calc_out.section.openai_token_usage_scenarios|📅 Usage Scenarios (monthly costs)|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔵 GPT 5:  50→$9.38  ·  100→$18.75  ·  500→$93.75  ·  1K→$187.50  ·  5K→$937.50  ·  10K→$1875.00\n🔵 GPT 5 Mini:  50→$1.88  ·  100→$3.75  ·  500→$18.75  ·  1K→$37.50  ·  5K→$187.50  ·  10K→$375.00\n⚪ GPT 4o:  50→$11.25  ·  100→$22.50  ·  500→$112.50  ·  1K→$225.00  ·  5K→$1125.00  ·  10K→$2250.00\n\n$calc_out.section.openai_token_cost_health|🩺 Cost Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.openai_token.row.health_spread_ok{"ratio":"6.0"}|• 🟢 Healthy cost spread (6.0x) across selected models.|\n$calc_out.openai_token.row.health_tier_micro{"name":"GPT 5 Mini","cost":"$3.75"}|• 🟢 Micro-tier (under $5/mo) — GPT 5 Mini at $3.75/mo.|\n$calc_out.openai_token.row.health_cache_none|• ⚠️ Cache hit rate is 0% — enabling prompt caching on repeated prefixes can cut cost 40-90%. Toggle above to model it.|\n$calc_out.openai_token.row.health_batch_tip{"save":"$22.50"}|• 💡 Switch to batch pricing: save ~$22.50/mo (50% discount) if latency is not critical.|\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.openai_token.row.whatif_switch_batch{"from":"$45.00","to":"$22.50","save":"$22.50"}|• Switch ALL selected to batch pricing:  $45.00 → $22.50/mo  (save $22.50)|\n$calc_out.openai_token.row.whatif_switch_cheapest{"name":"GPT 5 Nano","save":"$3.00"}|• Switch cheapest to GPT 5 Nano:  save $3.00/mo  (similar quality, much cheaper)|\n$calc_out.openai_token.row.whatif_double_volume{"reqs":"200","cost":"$90.00"}|• Double volume to 200 reqs/day:  $90.00/mo|\n$calc_out.openai_token.row.whatif_halve_volume{"reqs":"50","cost":"$22.50"}|• Halve volume to 50 reqs/day:  $22.50/mo|\n$calc_out.openai_token.row.whatif_cache_boost{"save":"$5.63","from":"$45.00","to":"$39.38"}|• Boost cache hit rate to 50%:  save ~$5.63/mo  ($45.00 → $39.38)|\n',
  ],
  faq: [
    {
      q: "How do I estimate token counts for my prompts?",
      a: "Roughly 1 token = 0.75 English words (4 characters). For CJK languages (Chinese, Japanese, Korean), 1 character ~= 1.5 tokens. A 1000-word English article uses ~1,300 tokens. Use OpenAI’s tiktoken library or the Tokenizer page for precise counts. This calculator includes a built-in estimateTokens() utility that detects language and estimates token counts from raw text.",
    },
    {
      q: "Which model is cheapest?",
      a: "GPT-5 Nano is the cheapest at {{live:openai/gpt-5-nano}} per 1M input/output tokens. For simple classification, summarization, and high-volume Q&A, it costs {{liveShareIn:openai/gpt-5-nano|openai/gpt-5.5}} of GPT-5.5 ({{live:openai/gpt-5.5}}) on input. GPT-4.1 Nano ({{live:openai/gpt-4.1-nano}}) is also excellent for budget workloads with a 1M context window.",
    },
    {
      q: "How can I reduce my API costs?",
      a: "(1) Use batch pricing for non-urgent workloads — 50% discount. (2) Enable prompt caching — cached input tokens cost 50% less; reuse system prompts and long context prefixes. (3) Route simple queries to cheaper models (GPT-5 Nano, GPT-4.1 Nano). (4) Limit output tokens with max_tokens. (5) Compress long prompts and prune conversation history.",
    },
    {
      q: "What is the difference between batch and real-time pricing?",
      a: "Batch API processes jobs asynchronously with a 24-hour turnaround window at 50% of real-time pricing. Ideal for evaluation, classification, embedding, and non-interactive workloads. Real-time API is for chat, copilots, and interactive apps where latency matters. Both use the same token pricing structure.",
    },
    {
      q: "When should I use GPT-4.1 vs GPT-5?",
      a: "GPT-4.1 family offers 1M-token context windows at competitive prices — ideal for long-document analysis, full-codebase reviews, and large knowledge-base RAG. GPT-5 family has stronger reasoning and instruction-following. For most cost-sensitive production, GPT-5 Mini hits the sweet spot; for maximum context at low cost, GPT-4.1 Nano is compelling.",
    },
    {
      q: "What is the o-series and when should I use it?",
      a: 'The o-series (o3, o4 Mini) are reasoning models optimized for multi-step logic, math, coding, and scientific analysis. They "think" before responding, using more output tokens but producing higher-quality results for complex tasks. Use o3 for hard reasoning; o4 Mini for cost-effective reasoning workloads. For simple Q&A or chat, GPT-5 or GPT-4.1 models are more cost-effective.',
    },
    {
      q: "How does prompt caching work and how much can it save?",
      a: "OpenAI automatically caches prompt prefixes longer than 1024 tokens. Cached input tokens cost 50% less. Structure your prompts with a long, static system message or knowledge base at the beginning, and vary only the user query at the end. At 50% cache hit rate, input costs drop by 25%. At 80% hit rate, input costs drop by 40%. This calculator lets you model different cache hit rates to see the savings.",
    },
    { q: "How do I estimate cost for a chat application?", a: "A typical chat turn uses 500-2,000 input tokens (system prompt + history + user message) plus 200-800 output tokens. For GPT-5 Nano at 100,000 conversations/month averaging 1,000 input + 500 output tokens, expect {{liveMonthlyAt:openai/gpt-5-nano|100000}}/month. Use our calculator to model your specific mix." },
    { q: "What about system prompt overhead?", a: "A 1,000-token system prompt is charged on every request. If you send 10,000 requests/day, that is 10M tokens/day just for the system prompt. Move static instructions to caching (50% off) or trim them to the essentials. Long system prompts can dominate cost." },
    { q: "Should I use json_mode or tool_calling?", a: "Both add small overhead but improve reliability. json_mode enforces JSON structure at no extra cost. tool_calling adds ~50-200 tokens per call for tool definitions. For repeated tool use, switch to fine-tuned models or store tool definitions in cached context." },
    { q: "How does context window affect cost?", a: "Larger context windows (100K, 200K) charge input tokens even for unused context. Avoid pasting entire documents if you only need a section. Use RAG to retrieve only relevant chunks. Cache common prefixes to cut repeated system prompts." },
    { q: "What is prompt caching and how much does it save?", a: "OpenAI prompt caching offers 50% discount on cached input tokens. Eligible prefixes are 1024+ tokens. For a chat app with 1K system prompt + 5K message history sent 1000 times/day, caching saves 50-90% of input cost. Break-even is within a few requests." },
    { q: "When should I switch to a smaller model?", a: "Use GPT-5 Nano or GPT-4o Mini for: classification, sentiment analysis, simple extraction, translation, summarization. Use GPT-5 for: complex reasoning, code generation, multi-step planning, creative writing. A common pattern: route 80% of traffic to nano, 20% to full GPT-5." },
    { q: "How do I forecast monthly OpenAI spend?", a: "Sum (input_tokens × input_price + output_tokens × output_price) across all calls. Use our calculator for single-request estimates. For production: track usage in OpenAI dashboard, calculate cost per feature, then project monthly." },
    { q: "What hidden costs should I watch for?", a: "Embeddings ($0.02/1M tokens for ada) easily add 10-30% to chatbot cost. Fine-tuning ($3/1M training + 2x inference cost) is expensive — prefer prompting or RAG first. Image generation (DALL-E) at $0.04-0.12/image is a separate budget line. Monitor moderation API usage too." },
  ],
  howToUse: [
    'Enter the model keys you want to compare (comma-separated, e.g. "gpt-5-mini,gpt-5.5,gpt-4.1"). Leave default for the recommended comparison set.',
    "Enter your average input and output tokens per request. Use the estimateTokens() utility or OpenAI’s Tokenizer to gauge your prompt sizes.",
    "Set your daily request volume and choose real-time or batch pricing mode. Batch mode cuts all costs by 50% instantly.",
    "Optionally set a cache hit rate (0-100%) to model prompt caching savings, and a monthly growth rate (0-50%) to project future costs.",
    "Review the detail cards for each selected model — compare per-request, daily, monthly, and annual costs at a glance.",
    "Use the Usage Scenarios table to see how costs scale from 50 to 10,000 requests/day, and check Savings Insights for the cheapest and best-value recommendations.",
  ],
  dataLastUpdated: PRICING.lastUpdated,
  engineKey: true,
};

registerEngine(engine);

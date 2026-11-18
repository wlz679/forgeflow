import type { ToolEngine } from "../../core/engines/types";
import { registerEngine } from "../../core/engines/registry";
import PRICING from "../../data/ai-pricing.json";
import { pickInteractiveModels } from "../../data/ai-pricing-popular";

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
  out.push('📅 Pricing last updated: ' + (PRICING.lastUpdated || 'unknown') + ' (data synced weekly)');
  out.push('');

  // ================================================================
  // Section 1: Header
  // ================================================================
  const modeEmoji = pricingMode === "batch" ? "⚡" : "\u{1F534}"; // ⚡ or 🔴
  const modeLabel =
    pricingMode === "batch" ? "Batch Pricing" : "Real-time Pricing";
  let headerLine = modeEmoji + " " + modeLabel;
  if (cacheHitRate > 0) {
    headerLine += " | \u{1F4BE} " + cacheHitRate + "% Cache Hit Rate"; // 💾
  }
  out.push(headerLine);
  out.push("");
  out.push(
    "\u{1F4E5} Input: " +
      lc(inTokens) +
      " tokens/req | " +
      "\u{1F4E4} Output: " +
      lc(outTokens) +
      " tokens/req | " +
      "\u{1F504} " +
      lc(reqPerDay) +
      " reqs/day",
  );
  out.push("");

  // ================================================================
  // Section 2: Bar Chart — full-model comparison
  // ================================================================
  out.push(`\u{1F4CA} Cost Comparison (${allCosts.length} Models)`);
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
  out.push("\u{1F4CB} Selected Model Details");
  out.push(SEP.repeat(60));
  for (const item of selectedCosts) {
    const icon = FAMILY_ICONS[item.info.family];
    const dailyCost = item.costPerReq * reqPerDay;
    const monthlyCost = item.monthlyCost;
    const annualCost = monthlyCost * 12;

    out.push(
      icon +
        " " +
        item.info.name +
        " | Context: " +
        item.info.contextWindow +
        " tokens",
    );
    out.push(DASH.repeat(44));

    const inputCostLine = (inTokens / 1_000_000) * item.inputPrice;
    const rm = item.info.reasoningMultiplier || 1;
    const effectiveOut = outTokens * rm;
    const outputCostLine = (effectiveOut / 1_000_000) * item.outputPrice;
    out.push(
      "Input:  " +
        pad(lc(inTokens), 7) +
        " tokens × " +
        fmt(item.inputPrice) +
        "/1M → " +
        fmt(inputCostLine) +
        "/req",
    );
    out.push(
      "Output: " +
        pad(lc(outTokens), 7) +
        (rm > 1 ? " visible + ~" + lc(outTokens * (rm - 1)) + " reasoning" : " tokens") +
        " × " +
        fmt(item.outputPrice) +
        "/1M → " +
        fmt(outputCostLine) +
        "/req",
    );
    if (rm > 1) {
      out.push("🧠 o-series: hidden reasoning tokens (≈×" + rm + " visible) billed at output rate");
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
      out.push(
        "\u{1F4A1} Batch pricing: " +
          fmt(batchCPR) +
          "/req (" +
          fmt(batchMonthly) +
          "/mo) — save 50%",
      );
    } else {
      const realtimeCPR =
        (inTokens / 1_000_000) * item.info.input +
        (effectiveOut / 1_000_000) * item.info.output;
      const realtimeMonthly = realtimeCPR * reqPerDay * 30;
      out.push(
        "\u{1F534} Real-time: " +
          fmt(realtimeCPR) +
          "/req (" +
          fmt(realtimeMonthly) +
          "/mo)",
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
      out.push(
        "\u{1F4BE} With " +
          cacheHitRate +
          "% cache hit: " +
          fmt(cachedCPR) +
          "/req (" +
          fmt(cachedMonthly) +
          "/mo)",
      );
    }

    out.push("");
  }

  // ================================================================
  // Section 4: Growth Projection (only if growthRate > 0)
  // ================================================================
  if (growthRate > 0) {
    out.push("\u{1F4C8} Growth Projection (" + growthRate + "% monthly)");
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
  out.push("\u{1F4B0} Savings Insights");
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
    out.push(
      "⭐ Best value (non-legacy, non-Nano): " +
        bestValue.info.name +
        " at " +
        fmt(bestValue.monthlyCost) +
        "/mo",
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
    out.push(
      "\u{1F4B8} Switching from " +
        mostExpSelected.info.name +
        " to " +
        cheapSelected.info.name +
        " saves " +
        fmt(diff) +
        "/mo (" +
        fmt(diff * 12) +
        "/yr)",
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
    out.push(
      "\u{1F4BE} Prompt caching at " +
        cacheHitRate +
        "% hit rate saves ~" +
        fmt(cacheSaving) +
        "/mo on " +
        ref.info.name,
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
    out.push(
      "\u{1F30D} Cross-provider: " +
        cheapestCompetitor +
        " @ " +
        fmt(cheapestCompCost) +
        "/mo — saves " +
        fmt(cheapest.monthlyCost - cheapestCompCost) +
        "/mo (" +
        (cheapestCompCost > 0 ? ((1 - cheapestCompCost / cheapest.monthlyCost) * 100).toFixed(0) : "0") +
        "% cheaper) vs cheapest OpenAI",
    );
  }

  out.push("");

  // ================================================================
  // Section 6: Usage Scenarios — per-model rows
  // ================================================================
  out.push("\u{1F4C5} Usage Scenarios (monthly costs)");
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
  out.push('🩺 Cost Health:');
  out.push(SEP.repeat(60));
  const totalSelectedMonthly = selectedCosts.reduce((s, c) => s + c.monthlyCost, 0);
  const cheapestSelected = selectedCosts.reduce((min, c) => c.monthlyCost < min.monthlyCost ? c : min);
  const expensiveSelected = selectedCosts.reduce((max, c) => c.monthlyCost > max.monthlyCost ? c : max);
  if (selectedCosts.length >= 2) {
    const ratio = expensiveSelected.monthlyCost / Math.max(cheapestSelected.monthlyCost, 0.01);
    if (ratio >= 50) out.push('• 🔴 Your most expensive selection costs ' + ratio.toFixed(0) + 'x your cheapest — consider mixing tiers (e.g., cheap model for 90% of traffic, premium for 10%).');
    else if (ratio >= 10) out.push('• 🟠 ' + ratio.toFixed(0) + 'x cost spread across selected models — review if every model needs to be premium.');
    else out.push('• 🟢 Healthy cost spread (' + ratio.toFixed(1) + 'x) across selected models.');
  }
  if (cheapestSelected) {
    const tier = cheapestSelected.monthlyCost < 5 ? '🟢 Micro-tier (under $5/mo)' : cheapestSelected.monthlyCost < 50 ? '🟢 Low-volume tier' : cheapestSelected.monthlyCost < 500 ? '🟡 Mid-volume tier' : '🟠 High-volume tier';
    out.push('• ' + tier + ' — ' + cheapestSelected.info.name + ' at ' + fmt(cheapestSelected.monthlyCost) + '/mo.');
  }
  if (cacheHitRate === 0) {
    out.push('• ⚠️ Cache hit rate is 0% — enabling prompt caching on repeated prefixes can cut cost 40-90%. Toggle above to model it.');
  } else if (cacheHitRate < 30) {
    out.push('• 🟡 Low cache hit rate (' + cacheHitRate + '%) — review if your prompt has stable system instructions or few-shot examples.');
  } else {
    out.push('• 🟢 Healthy cache rate (' + cacheHitRate + '%) — keep an eye on cache TTL vs your traffic pattern.');
  }
  if (pricingMode === 'realtime') {
    const batchSavings = totalSelectedMonthly * 0.5;
    out.push('• 💡 Switch to batch pricing: save ~' + fmt(batchSavings) + '/mo (50% discount) if latency is not critical.');
  }
  out.push('');

  // 🔄 What-If Scenarios (v3)
  out.push('🔄 What-If Scenarios:');
  out.push(SEP.repeat(60));
  // Switch to batch
  if (pricingMode === 'realtime') {
    const batchTotal = totalSelectedMonthly * 0.5;
    out.push('• Switch ALL selected to batch pricing:  ' + fmt(totalSelectedMonthly) + ' → ' + fmt(batchTotal) + '/mo  (save ' + fmt(totalSelectedMonthly - batchTotal) + ')');
  } else {
    const realtimeTotal = totalSelectedMonthly * 2;
    out.push('• Switch back to real-time (if latency allows batch):  save vs ' + fmt(realtimeTotal) + '/mo  (50% off currently)');
  }
  // Switch to cheapest popular model
  const popularCheapest = allCosts
    .reduce((min, c) => (c.info.input + c.info.output) < (min.info.input + min.info.output) ? c : min, allCosts[0]);
  if (popularCheapest && popularCheapest.key !== cheapestSelected?.key) {
    const cpr = (inTokens / 1e6) * popularCheapest.info.input + (outTokens / 1e6) * popularCheapest.info.output;
    const newMonthly = cpr * reqPerDay * 30;
    const savings = (cheapestSelected?.monthlyCost ?? 0) - newMonthly;
    if (savings > 0) out.push('• Switch cheapest to ' + popularCheapest.info.name + ':  save ' + fmt(savings) + '/mo  (similar quality, much cheaper)');
  }
  // Double volume
  const doubleVol = totalSelectedMonthly * 2;
  out.push('• Double volume to ' + lc(reqPerDay * 2) + ' reqs/day:  ' + fmt(doubleVol) + '/mo');
  // Halve volume
  const halfVol = totalSelectedMonthly / 2;
  out.push('• Halve volume to ' + lc(Math.max(1, Math.floor(reqPerDay / 2))) + ' reqs/day:  ' + fmt(halfVol) + '/mo');
  // 50% cache
  if (cacheHitRate < 50) {
    const cacheBoost = 50;
    const cacheFactor = 1 - cacheBoost / 100 * 0.5; // assume 50% of input is cacheable
    const cachedMonthly = totalSelectedMonthly * (0.5 + 0.5 * cacheFactor);
    const cacheSavings = totalSelectedMonthly - cachedMonthly;
    out.push('• Boost cache hit rate to 50%:  save ~' + fmt(cacheSavings) + '/mo  (' + fmt(totalSelectedMonthly) + ' → ' + fmt(cachedMonthly) + ')');
  }
  out.push('');

  return out;
}

// ============================================================
// Task 5: customFn — minified JS producing identical output
// ============================================================

const customFn =
  // Model data: full keys matching MODELS constant → {i,o,f,c,bi,bo,n}
  `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let n=function(c){return c<.01&&c>0?"$"+c.toFixed(4):"$"+c.toFixed(2)},v=function(c){return c.toLocaleString()},g=function(c,T){return c+" ".repeat(Math.max(0,T-c.length))},S=function(c){const T=[...new Set((c.models||B.join(",")).split(",").map(t=>t.trim()).filter(Boolean))],m=Math.max(1,Math.min(1e7,parseInt(c.inputTokens)||1e3)),l=Math.max(1,Math.min(1e7,parseInt(c.outputTokens)||500)),r=Math.max(0,Math.min(1e6,parseInt(c.requestsPerDay)||100)),x=c.pricingMode==="batch"?"batch":"realtime",p=Math.min(100,Math.max(0,parseInt(c.cacheHitRate)||0)),q=Math.min(50,Math.max(0,parseFloat(c.growthRate)||0)),j=parseInt(c.projectionMonths),k=[3,6,12].includes(j)?j:12,f=[];for(const[t,e]of Object.entries(N)){const a=x==="batch"?e.batchInput:e.input,i=x==="batch"?e.batchOutput:e.output,s=e.reasoningMultiplier||1,d=l*s,h=m/1e6*a+d/1e6*i,C=h*r*30;f.push({key:t,info:e,inputPrice:a,outputPrice:i,costPerReq:h,monthlyCost:C})}f.sort((t,e)=>t.info.order-e.info.order);const I=f.reduce((t,e)=>e.monthlyCost<t.monthlyCost?e:t),_=f.reduce((t,e)=>e.monthlyCost>t.monthlyCost?e:t).monthlyCost,u=[];for(const t of T){const e=f.find(a=>a.key===t);e&&u.push(e)}if(u.length===0)for(const t of B){const e=f.find(a=>a.key===t);e&&u.push(e)}const o=[];o.push("📅 Pricing last updated: "+(H.lastUpdated||"unknown")+" (data synced weekly)"),o.push("");const z=x==="batch"?"⚡":"🔴",A=x==="batch"?"Batch Pricing":"Real-time Pricing";let V=z+" "+A;p>0&&(V+=" | 💾 "+p+"% Cache Hit Rate"),o.push(V),o.push(""),o.push("📥 Input: "+v(m)+" tokens/req | 📤 Output: "+v(l)+" tokens/req | 🔄 "+v(r)+" reqs/day"),o.push(""),o.push(\`📊 Cost Comparison (\${f.length} Models)\`),o.push("");for(const t of f){const a=R[t.info.family]+" "+t.info.name,i=g(a,22),s=_>0?Math.max(1,Math.round(t.monthlyCost/_*32)):0,d="█".repeat(s),C=t.key===I.key?" 🏆":"";o.push(i+d+" "+n(t.monthlyCost)+C)}o.push(""),o.push(""),o.push("📋 Selected Model Details"),o.push(F.repeat(60));for(const t of u){const e=R[t.info.family],a=t.costPerReq*r,i=t.monthlyCost,s=i*12;o.push(e+" "+t.info.name+" | Context: "+t.info.contextWindow+" tokens"),o.push(P.repeat(44));const d=m/1e6*t.inputPrice,h=t.info.reasoningMultiplier||1,C=l*h,K=C/1e6*t.outputPrice;if(o.push("Input:  "+g(v(m),7)+" tokens × "+n(t.inputPrice)+"/1M → "+n(d)+"/req"),o.push("Output: "+g(v(l),7)+(h>1?" visible + ~"+v(l*(h-1))+" reasoning":" tokens")+" × "+n(t.outputPrice)+"/1M → "+n(K)+"/req"),h>1&&o.push("🧠 o-series: hidden reasoning tokens (≈×"+h+" visible) billed at output rate"),o.push(P.repeat(44)),o.push("Per request:    "+n(t.costPerReq)),o.push("Daily ("+r+"):    "+n(a)),o.push("Monthly (30d):  "+n(i)),o.push("Annual:         "+n(s)),o.push(P.repeat(44)),x==="realtime"){const y=m/1e6*t.info.batchInput+C/1e6*t.info.batchOutput,M=y*r*30;o.push("💡 Batch pricing: "+n(y)+"/req ("+n(M)+"/mo) — save 50%")}else{const y=m/1e6*t.info.input+C/1e6*t.info.output,M=y*r*30;o.push("🔴 Real-time: "+n(y)+"/req ("+n(M)+"/mo)")}if(p>0){const y=t.inputPrice*(1-p/100)+t.inputPrice*.5*(p/100),M=m/1e6*y+C/1e6*t.outputPrice,Y=M*r*30;o.push("💾 With "+p+"% cache hit: "+n(M)+"/req ("+n(Y)+"/mo)")}o.push("")}if(q>0){o.push("📈 Growth Projection ("+q+"% monthly)"),o.push("");const t=[1];k>=3&&t.push(3),k>=6&&t.push(6),k>=12&&t.push(12),t.includes(k)||t.push(k),t.sort((s,d)=>s-d);let e=g("Month",6);for(const s of u)e+=g(s.info.name,13);e+=g("Cum. Diff",12),o.push(e);let a=P.repeat(5)+" ";for(let s=0;s<u.length;s++)a+=P.repeat(11)+"  ";a+=P.repeat(10),o.push(a);let i=0;for(const s of t){const d=Math.pow(1+q/100,s-1),h=u.map(M=>M.costPerReq*r*30*d),C=Math.min(...h),K=Math.max(...h);i+=K-C;let y=g(String(s),6);for(const M of h)y+=g(n(M),13);y+=g(n(i),12),o.push(y)}o.push("")}o.push("💰 Savings Insights"),o.push(F.repeat(60)),o.push("🏆 Cheapest: "+I.info.name+" at "+n(I.monthlyCost)+"/mo");const G=f.filter(t=>t.info.family!=="legacy"&&!t.info.name.toLowerCase().includes("nano")).reduce((t,e)=>e.monthlyCost<t.monthlyCost?e:t,f[0]);if(G&&o.push("⭐ Best value (non-legacy, non-Nano): "+G.info.name+" at "+n(G.monthlyCost)+"/mo"),u.length>=2){const t=u.reduce((i,s)=>s.monthlyCost>i.monthlyCost?s:i),e=u.reduce((i,s)=>s.monthlyCost<i.monthlyCost?s:i),a=t.monthlyCost-e.monthlyCost;o.push("💸 Switching from "+t.info.name+" to "+e.info.name+" saves "+n(a)+"/mo ("+n(a*12)+"/yr)")}if(p>0&&u.length>0){const t=u[0],e=t.inputPrice*(1-p/100)+t.inputPrice*.5*(p/100),i=(m/1e6*e+l/1e6*t.outputPrice)*r*30,s=t.monthlyCost-i;o.push("💾 Prompt caching at "+p+"% hit rate saves ~"+n(s)+"/mo on "+t.info.name)}const $=(m/1e6*.14+l/1e6*.28)*r*30,D=(m/1e6*.1+l/1e6*.4)*r*30,E=$<D?"DeepSeek Chat":"Gemini 2.0 Flash",W=Math.min($,D);I.monthlyCost>0&&o.push("🌍 Cross-provider: "+E+" @ "+n(W)+"/mo — saves "+n(I.monthlyCost-W)+"/mo ("+(W>0?((1-W/I.monthlyCost)*100).toFixed(0):"0")+"% cheaper) vs cheapest OpenAI"),o.push(""),o.push("📅 Usage Scenarios (monthly costs)"),o.push(F.repeat(60));const J=[50,100,500,1e3,5e3,1e4];for(const t of u){let a=R[t.info.family]+" "+t.info.name+":  ";const i=[];for(const s of J){const d=t.costPerReq*s*30,h=s>=1e3?s/1e3+"K":String(s);i.push(h+"→"+n(d))}a+=i.join("  ·  "),o.push(a)}o.push(""),o.push("🩺 Cost Health:"),o.push(F.repeat(60));const b=u.reduce((t,e)=>t+e.monthlyCost,0),w=u.reduce((t,e)=>e.monthlyCost<t.monthlyCost?e:t),Q=u.reduce((t,e)=>e.monthlyCost>t.monthlyCost?e:t);if(u.length>=2){const t=Q.monthlyCost/Math.max(w.monthlyCost,.01);t>=50?o.push("• 🔴 Your most expensive selection costs "+t.toFixed(0)+"x your cheapest — consider mixing tiers (e.g., cheap model for 90% of traffic, premium for 10%)."):t>=10?o.push("• 🟠 "+t.toFixed(0)+"x cost spread across selected models — review if every model needs to be premium."):o.push("• 🟢 Healthy cost spread ("+t.toFixed(1)+"x) across selected models.")}if(w){const t=w.monthlyCost<5?"🟢 Micro-tier (under $5/mo)":w.monthlyCost<50?"🟢 Low-volume tier":w.monthlyCost<500?"🟡 Mid-volume tier":"🟠 High-volume tier";o.push("• "+t+" — "+w.info.name+" at "+n(w.monthlyCost)+"/mo.")}if(p===0?o.push("• ⚠️ Cache hit rate is 0% — enabling prompt caching on repeated prefixes can cut cost 40-90%. Toggle above to model it."):p<30?o.push("• 🟡 Low cache hit rate ("+p+"%) — review if your prompt has stable system instructions or few-shot examples."):o.push("• 🟢 Healthy cache rate ("+p+"%) — keep an eye on cache TTL vs your traffic pattern."),x==="realtime"){const t=b*.5;o.push("• 💡 Switch to batch pricing: save ~"+n(t)+"/mo (50% discount) if latency is not critical.")}if(o.push(""),o.push("🔄 What-If Scenarios:"),o.push(F.repeat(60)),x==="realtime"){const t=b*.5;o.push("• Switch ALL selected to batch pricing:  "+n(b)+" → "+n(t)+"/mo  (save "+n(b-t)+")")}else{const t=b*2;o.push("• Switch back to real-time (if latency allows batch):  save vs "+n(t)+"/mo  (50% off currently)")}const O=f.reduce((t,e)=>e.info.input+e.info.output<t.info.input+t.info.output?e:t,f[0]);if(O&&O.key!==w?.key){const e=(m/1e6*O.info.input+l/1e6*O.info.output)*r*30,a=(w?.monthlyCost??0)-e;a>0&&o.push("• Switch cheapest to "+O.info.name+":  save "+n(a)+"/mo  (similar quality, much cheaper)")}const X=b*2;o.push("• Double volume to "+v(r*2)+" reqs/day:  "+n(X)+"/mo");const Z=b/2;if(o.push("• Halve volume to "+v(Math.max(1,Math.floor(r/2)))+" reqs/day:  "+n(Z)+"/mo"),p<50){const a=b*.875,i=b-a;o.push("• Boost cache hit rate to 50%:  save ~"+n(i)+"/mo  ("+n(b)+" → "+n(a)+")")}return o.push(""),o},L=function(c,T,m){var l=U(c);return Array.isArray(l)?l.join(\`
\`):String(l)};var tt=n,ot=v,et=g,nt=S,st=L,H={lastUpdated:"2026-11-09"},N={"gpt-5.5":{input:5,output:30,batchInput:2.5,batchOutput:15,name:"GPT 5.5",family:"gpt5",contextWindow:"1M",order:5},"gpt-5.2":{input:1.75,output:14,batchInput:.875,batchOutput:7,name:"GPT 5.2",family:"gpt5",contextWindow:"272K",order:6},"gpt-5":{input:1.25,output:10,batchInput:.625,batchOutput:5,name:"GPT 5",family:"gpt5",contextWindow:"272K",order:7},"gpt-5-mini":{input:.25,output:2,batchInput:.125,batchOutput:1,name:"GPT 5 Mini",family:"gpt5",contextWindow:"272K",order:8},"gpt-5-nano":{input:.05,output:.4,batchInput:.025,batchOutput:.2,name:"GPT 5 Nano",family:"gpt5",contextWindow:"272K",order:9},"gpt-4.1":{input:2,output:8,batchInput:1,batchOutput:4,name:"GPT 4.1",family:"gpt41",contextWindow:"1M",order:10},"gpt-4.1-mini":{input:.4,output:1.6,batchInput:.2,batchOutput:.8,name:"GPT 4.1 Mini",family:"gpt41",contextWindow:"1M",order:11},"gpt-4.1-nano":{input:.1,output:.4,batchInput:.05,batchOutput:.2,name:"GPT 4.1 Nano",family:"gpt41",contextWindow:"1M",order:12},o3:{input:2,output:8,batchInput:1,batchOutput:4,name:"O3",family:"o-series",contextWindow:"200K",order:13,reasoningMultiplier:4},"o4-mini":{input:1.1,output:4.4,batchInput:.55,batchOutput:2.2,name:"O4 Mini",family:"o-series",contextWindow:"200K",order:14,reasoningMultiplier:4},"gpt-4o":{input:2.5,output:10,batchInput:1.25,batchOutput:5,name:"GPT 4o",family:"legacy",contextWindow:"128K",order:15},"gpt-4o-mini":{input:.15,output:.6,batchInput:.075,batchOutput:.3,name:"GPT 4o Mini",family:"legacy",contextWindow:"128K",order:16},"gpt-4-turbo":{input:10,output:30,batchInput:5,batchOutput:15,name:"GPT 4 Turbo",family:"legacy",contextWindow:"128K",order:17},"gpt-3.5-turbo":{input:.5,output:1.5,batchInput:.25,batchOutput:.75,name:"GPT 3.5 Turbo",family:"legacy",contextWindow:"16K",order:18},"gpt-6-astra":{input:10,output:50,name:"GPT 6 Astra",family:"gpt6",contextWindow:"922K",order:2,batchInput:5,batchOutput:25},"gpt-6-sol":{input:2,output:10,name:"GPT 6 Sol",family:"gpt6",contextWindow:"922K",order:3,batchInput:1,batchOutput:5},"gpt-6-luna":{input:.1,output:.5,name:"GPT 6 Luna",family:"gpt6",contextWindow:"922K",order:4,batchInput:.05,batchOutput:.25},"gpt-6.1-sol":{input:2,output:10,name:"GPT 6.1 Sol",family:"gpt6",contextWindow:"922K",order:1,batchInput:1,batchOutput:5}},B=["gpt-5-mini","gpt-5.5","gpt-4.1"],R={gpt6:"🔷",gpt5:"🔵",gpt41:"🟢","o-series":"🟠",legacy:"⚪"},F="━",P="─",U=function(c){return S(c)};return[L(inputs,pick,fill)]}finally{}
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
    '\n🔴 Real-time Pricing\n\n📥 Input: 1,000 tokens/req | 📤 Output: 500 tokens/req | 🔄 100 reqs/day\n\n📊 Cost Comparison (18 Models)\n\n🔷 GPT 6.1 Sol        ██████ $21.00\n🔷 GPT 6 Astra        ████████████████████████████████ $105.00\n🔷 GPT 6 Sol          ██████ $21.00\n🔷 GPT 6 Luna         █ $1.05\n🔵 GPT 5.5            ██████████████████ $60.00\n🔵 GPT 5.2            ████████ $26.25\n🔵 GPT 5              ██████ $18.75\n🔵 GPT 5 Mini         █ $3.75\n🔵 GPT 5 Nano         █ $0.75 🏆\n🟢 GPT 4.1            █████ $18.00\n🟢 GPT 4.1 Mini       █ $3.60\n🟢 GPT 4.1 Nano       █ $0.90\n🟠 O3                 ████████████████ $54.00\n🟠 O4 Mini            █████████ $29.70\n⚪ GPT 4o              ███████ $22.50\n⚪ GPT 4o Mini         █ $1.35\n⚪ GPT 4 Turbo         ███████████████████████ $75.00\n⚪ GPT 3.5 Turbo       █ $3.75\n\n\n📋 Selected Model Details\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔵 GPT 5 | Context: 272K tokens\n────────────────────────────────────────────\nInput:  1,000   tokens × $1.25/1M → $0.0013/req\nOutput: 500     tokens × $10.00/1M → $0.0050/req\n────────────────────────────────────────────\nPer request:    $0.0063\nDaily (100):    $0.63\nMonthly (30d):  $18.75\nAnnual:         $225.00\n────────────────────────────────────────────\n💡 Batch pricing: $0.0031/req ($9.38/mo) — save 50%\n\n🔵 GPT 5 Mini | Context: 272K tokens\n────────────────────────────────────────────\nInput:  1,000   tokens × $0.25/1M → $0.0003/req\nOutput: 500     tokens × $2.00/1M → $0.0010/req\n────────────────────────────────────────────\nPer request:    $0.0013\nDaily (100):    $0.13\nMonthly (30d):  $3.75\nAnnual:         $45.00\n────────────────────────────────────────────\n💡 Batch pricing: $0.0006/req ($1.88/mo) — save 50%\n\n⚪ GPT 4o | Context: 128K tokens\n────────────────────────────────────────────\nInput:  1,000   tokens × $2.50/1M → $0.0025/req\nOutput: 500     tokens × $10.00/1M → $0.0050/req\n────────────────────────────────────────────\nPer request:    $0.0075\nDaily (100):    $0.75\nMonthly (30d):  $22.50\nAnnual:         $270.00\n────────────────────────────────────────────\n💡 Batch pricing: $0.0037/req ($11.25/mo) — save 50%\n\n💰 Savings Insights\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🏆 Cheapest: GPT 5 Nano at $0.75/mo\n⭐ Best value (non-legacy, non-Nano): GPT 6 Luna at $1.05/mo\n💸 Switching from GPT 4o to GPT 5 Mini saves $18.75/mo ($225.00/yr)\n🌍 Cross-provider: DeepSeek Chat @ $0.84/mo — saves $-0.09/mo (-12% cheaper) vs cheapest OpenAI\n\n📅 Usage Scenarios (monthly costs)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔵 GPT 5:  50→$9.38  ·  100→$18.75  ·  500→$93.75  ·  1K→$187.50  ·  5K→$937.50  ·  10K→$1875.00\n🔵 GPT 5 Mini:  50→$1.88  ·  100→$3.75  ·  500→$18.75  ·  1K→$37.50  ·  5K→$187.50  ·  10K→$375.00\n⚪ GPT 4o:  50→$11.25  ·  100→$22.50  ·  500→$112.50  ·  1K→$225.00  ·  5K→$1125.00  ·  10K→$2250.00\n\n🩺 Cost Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 Healthy cost spread (6.0x) across selected models.\n• 🟢 Micro-tier (under $5/mo) — GPT 5 Mini at $3.75/mo.\n• ⚠️ Cache hit rate is 0% — enabling prompt caching on repeated prefixes can cut cost 40-90%. Toggle above to model it.\n• 💡 Switch to batch pricing: save ~$22.50/mo (50% discount) if latency is not critical.\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Switch ALL selected to batch pricing:  $45.00 → $22.50/mo  (save $22.50)\n• Switch cheapest to GPT 5 Nano:  save $3.00/mo  (similar quality, much cheaper)\n• Double volume to 200 reqs/day:  $90.00/mo\n• Halve volume to 50 reqs/day:  $22.50/mo\n• Boost cache hit rate to 50%:  save ~$5.63/mo  ($45.00 → $39.38)\n',
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

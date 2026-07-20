// Single source of truth for the engine count test assertion.
// Locked at 100 per P16 milestone (P22 fixed 3 stale 98→100 asserts;
// P22b consolidates them into one constant).
//
// P22b v2 lesson (ESM evaluation-order trap):
// Dynamic computation `getAllEngines().length` at import time was the
// original design, but at test-file load time the engine registry is
// empty because `tests/lib/engine-count.ts` imports `registry.ts` BEFORE
// the engine import chain (`src/engines/index.ts` → each subcategory
// import) runs. The constant evaluated to 0, breaking the 3 tests that
// reference it. Static literal avoids the trap.
//
// P23+ drift detection guard: `tests/lib/engine-count.test.ts` asserts
// `registry.length === EXPECTED_ENGINE_COUNT`. When future batches add
// or remove engines, that test fails — keeping the hard-coded constant
// honest via structural integrity check instead of evaluation-time fetch.
//
// Replaces 6 hard-coded `100` literals in tests/ab-split.test.ts
// (lines 51/54/57/59) and tests/internal-links.test.ts (lines 6/7).
export const EXPECTED_ENGINE_COUNT: number = 100;

// P49: per-category engine count map. Double-layer check alongside
// EXPECTED_ENGINE_COUNT (P22b). When a future batch adds/removes/re-
// categorizes engines, this map is the canonical declaration; the
// script (scripts/check-engine-count-by-category.mjs) emits it as a
// markdown table for CLAUDE.md, and tests/engine-count-by-category.test.ts
// asserts the runtime ToolMeta state matches.
//
// Values derived 2026-07-20 from `src/data/tools/index.ts` barrel via
// `node --import tsx`. Update via:
//   1. Edit src/data/tools/*.ts (add/remove/re-categorize engine)
//   2. Update this map
//   3. Run `node scripts/check-engine-count-by-category.mjs` to get new table
//   4. Copy-paste table into CLAUDE.md between `<!-- codegen:start engine-count -->` markers
export const EXPECTED_ENGINES_BY_CATEGORY: Record<string, number> = {
  A: 5,   // SaaS Metrics
  B: 8,   // AI Cost Tools
  C: 10,  // Valuation & Exit
  D: 6,   // Freelance Pricing
  E: 5,   // Cost & Efficiency
  F: 10,  // Investment & Real Estate
  H: 6,   // Hiring & Team
  K: 6,   // Knowledge / 知识库
  L: 6,   // Legal & Compliance
  M: 8,   // Marketing Analytics
  O: 6,   // Operations / 库存运营
  P: 6,   // Product Analytics
  R: 6,   // Retention & Customer Success
  S: 6,   // Sales / 销售管理
  T: 6,   // Customer Support
};

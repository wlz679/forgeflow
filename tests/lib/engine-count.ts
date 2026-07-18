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

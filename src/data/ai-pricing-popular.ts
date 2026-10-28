/**
 * P156 — the INTERACTIVE model set: the models a visitor can actually select
 * and price on the site.
 *
 * BEFORE P156 these lists lived only inside `scripts/codegen-customfn.mjs`,
 * where they decided which models get bundled into the client-side customFn
 * data table. The build-time `calculate()` kept iterating the FULL dataset
 * (245 models), so the pre-rendered `#static-results` block advertised
 *
 *   - "Cost Comparison (138 Models)"                 (openai page)
 *   - "Comparing 245 models across 4 providers"      (comparison page)
 *
 * while the live widget could only ever show 18 and 4 respectively. A visitor
 * read "138 Models", touched the calculator, and watched it become "18
 * Models" — one page, two numbers, and the larger one unreachable.
 *
 * P156 moves the lists into `ai-pricing-popular.json` (a JSON file so BOTH the
 * TypeScript engines and the plain-node codegen script can read one truth) and
 * makes the static block a faithful snapshot of the interactive tool:
 *
 *   - openai 18 · anthropic 13 · google 8 · deepseek 5   (= 44 in total)
 *   - comparison: one flagship per provider                (= 4)
 *
 * `scripts/codegen-customfn.mjs` READS this file. It must not redefine the
 * lists — `tests/ai-cost-scope-guard.test.ts` fails the build if the two ever
 * drift apart.
 *
 * Note on the comparison page: the flagship set keeps the page's key insight
 * intact. "🏆 Cheapest Model Overall" was "Gemini 1.5 Flash" across all 245
 * models, and `gemini-1.5-flash` IS one of the four flagships — so the
 * answer is unchanged, only the 241 unreachable rows disappear.
 */

import popular from './ai-pricing-popular.json';

/** Models selectable on each provider calculator (44 in total). */
export const POPULAR_MODEL_KEYS: Record<string, string[]> = popular.popularModelKeys;

/** One flagship per provider — the cross-provider side-by-side set (4). */
export const COMPARISON_FLAGSHIP_KEYS: Record<string, string> = popular.comparisonFlagshipKeys;

/** Total selectable models across the four provider calculators. */
export const INTERACTIVE_MODEL_COUNT = Object.values(POPULAR_MODEL_KEYS).reduce(
  (n, keys) => n + keys.length,
  0,
);

/** Selectable models on the cross-provider comparison page. */
export const COMPARISON_MODEL_COUNT = Object.keys(COMPARISON_FLAGSHIP_KEYS).length;

/**
 * Filter a provider's full model map down to the interactive set.
 *
 * Key order follows the DATASET (not POPULAR_MODEL_KEYS), which is what the
 * customFn generator does too — so the build-time table and the bundled
 * client table are ordered identically.
 */
export function pickInteractiveModels<T>(
  models: Record<string, T>,
  provider: string,
): Record<string, T> {
  const keep = new Set(POPULAR_MODEL_KEYS[provider] ?? []);
  const out: Record<string, T> = {};
  for (const [key, value] of Object.entries(models)) {
    if (keep.has(key)) out[key] = value;
  }
  return out;
}

/**
 * Filter a provider map down to the comparison flagship (one model each).
 * Providers with no flagship configured are dropped.
 */
export function pickFlagshipModels<T>(
  modelsByProvider: Record<string, Record<string, T>>,
): Record<string, Record<string, T>> {
  const out: Record<string, Record<string, T>> = {};
  for (const [provider, models] of Object.entries(modelsByProvider)) {
    const key = COMPARISON_FLAGSHIP_KEYS[provider];
    if (key && models[key]) out[provider] = { [key]: models[key] };
  }
  return out;
}

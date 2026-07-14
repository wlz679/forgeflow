export function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomPickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export function generateFromTemplates(
  templates: string[],
  wordPools: Record<string, string[]>,
  userInputs: Record<string, string>,
  count: number
): string[] {
  const vars: Record<string, string> = {};
  for (const [key] of Object.entries(wordPools)) vars[key] = '';
  vars.topic = userInputs.topic || userInputs.niche || userInputs.keyword || userInputs.interest || userInputs.title || 'your video';
  vars.niche = userInputs.niche || userInputs.topic || 'your niche';
  vars.keyword = userInputs.keyword || userInputs.topic || 'your keyword';

  const results: string[] = [];
  const seen = new Set<string>();
  let attempts = 0;
  while (results.length < count && attempts < count * 15) {
    attempts++;
    for (const key of Object.keys(wordPools)) vars[key] = randomPick(wordPools[key]);
    const result = fillTemplate(randomPick(templates), vars).trim();
    if (!seen.has(result)) { seen.add(result); results.push(result); }
  }
  return results;
}

export function generateCombinations(
  patterns: ((vars: Record<string, string>) => string)[],
  wordPools: Record<string, string[]>,
  userInputs: Record<string, string>,
  count: number
): string[] {
  const vars: Record<string, string> = { topic: userInputs.topic || userInputs.niche || 'your topic' };
  const results: string[] = [];
  const seen = new Set<string>();
  let attempts = 0;
  while (results.length < count && attempts < count * 15) {
    attempts++;
    for (const key of Object.keys(wordPools)) vars[key] = randomPick(wordPools[key]);
    const result = randomPick(patterns)(vars).trim();
    if (!seen.has(result)) { seen.add(result); results.push(result); }
  }
  return results;
}

/**
 * Clamp a numeric input to [0, Infinity).
 *
 * Used by P-series engines to defensively guard against negative values
 * (e.g., from URL params, presets, or copy-paste typos) that would
 * otherwise silently produce misleading "Excellent" band verdicts.
 *
 * HTML5 min="0" on input fields is the first UX layer; this is the
 * second safety layer at compute time.
 */
export function clampNonNegative(x: number): number {
  // NaN guard: Math.max(0, NaN) === NaN, which would violate the [0, ∞)
  // jsdoc contract and silently leak bad values into band comparators.
  // Undefined passes through (returns NaN) — see tests/helpers.test.ts
  // test 5, which documents that callers must pre-validate undefined.
  return Number.isNaN(x as number) ? 0 : Math.max(0, x);
}

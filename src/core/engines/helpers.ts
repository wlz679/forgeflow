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

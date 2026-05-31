// Inlined in tool pages for browser-side generation.
// Reads a ClientConfig JSON object and runs generation in-browser.
export function generateFromConfig(
  config: { type: string; templates?: string[]; patterns?: string[]; wordPools: Record<string, string[]>; customFn?: string },
  inputs: Record<string, string>,
  count = 10
): string[] {
  const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
  const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? `{${k}}`);

  if (config.type === 'custom' && config.customFn) {
    const fn = new Function('inputs', 'pick', 'fill', config.customFn);
    return fn(inputs, pick, fill);
  }

  const v: Record<string, string> = {
    topic: inputs.topic || inputs.niche || inputs.keyword || inputs.interest || inputs.title || 'your topic',
    niche: inputs.niche || inputs.topic || 'your niche',
    keyword: inputs.keyword || inputs.topic || 'your keyword',
  };

  const results: string[] = [];
  const seen = new Set<string>();
  let attempts = 0;

  while (results.length < count && attempts < count * 15) {
    attempts++;
    for (const key of Object.keys(config.wordPools)) v[key] = pick(config.wordPools[key]);
    let result: string;
    if (config.type === 'templates') {
      result = fill(pick(config.templates!), v).trim();
    } else if (config.type === 'combinations') {
      result = pick(config.patterns!)(v).trim();
    } else {
      result = '';
    }
    if (result && !seen.has(result)) { seen.add(result); results.push(result); }
  }
  return results;
}

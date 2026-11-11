// P168 B3-4 —— codegen defaultInputs 审计（限定本批 15 个工具）
//
// 跑法：node tests/scripts/b3-4-codegen-defaults-audit.mjs
// 用途：核对 scripts/codegen-examples.mjs 的 defaultInputs 字段名与引擎 inputs[].name 一致
//   —— 不一致 ⇒ staticExamples 是拿错输入算出来的（实测线上曾整页全是 0）。
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = process.cwd();
const MINE = ['churn-rate','saas-valuation','csat','kb-coverage-rate','employee-cost','equity-dilution','freelance-rate','rent-vs-buy','customer-health-score','funnel-step','acv','roas','comp-banding','stockout-cost','gpu-cloud-cost'];
const slugs = MINE.map((m) => 'solopreneur-' + m + '-calculator');
const src = readFileSync(join(ROOT, 'scripts/codegen-examples.mjs'), 'utf8');
const map = new Map();
for (const m of src.matchAll(/slug:\s*'([^']+)'[\s\S]*?defaultInputs:\s*\{([\s\S]*?)\}/g)) {
  const keys = [...m[2].matchAll(/([A-Za-z0-9_]+)\s*:/g)].map((x) => x[1]);
  map.set(m[1], keys);
}
function findFile(slug) {
  const stack = [join(ROOT, 'src/engines')];
  while (stack.length) {
    const cur = stack.pop();
    for (const name of readdirSync(cur)) {
      const p = join(cur, name);
      if (statSync(p).isDirectory()) { stack.push(p); continue; }
      if (!name.endsWith('.ts')) continue;
      if (readFileSync(p, 'utf8').indexOf("slug: '" + slug + "'") >= 0) return p;
    }
  }
  return null;
}
let bad = 0;
for (const slug of slugs) {
  const cg = map.get(slug);
  const f = findFile(slug);
  const t = readFileSync(f, 'utf8');
  const inputs = new Set([...t.matchAll(/name:\s*'([A-Za-z0-9_]+)'/g)].map((m) => m[1]));
  const unknown = cg.filter((k) => !inputs.has(k));
  const missing = [...inputs].filter((k) => !cg.includes(k));
  if (unknown.length || missing.length) {
    bad++;
    console.log('MISMATCH ' + slug + '  codegen多:' + (unknown.join(',')||'-') + '  codegen缺:' + (missing.join(',')||'-'));
  } else console.log('OK        ' + slug);
}
console.log('');
console.log(bad === 0 ? '✅ 本批 15 个工具的 codegen defaultInputs 全部对得上' : '❌ ' + bad + ' 个仍对不上');
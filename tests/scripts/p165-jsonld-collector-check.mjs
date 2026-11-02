// P165 —— 对照「旧的只扫顶层」与「新的递归」两种 @type 收集器。
// 目的：证明修守卫是真修了行为，不是「改完就绿」的假象。
//
// 跑法（必须从仓库根目录跑，且需要先 build）：
//   pnpm build:full
//   node tests/scripts/p165-jsonld-collector-check.mjs
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function oldCollect(html) {
  const types = new Set();
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    let parsed;
    try {
      parsed = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const graph = parsed?.['@graph'] ?? [parsed];
    for (const node of Array.isArray(graph) ? graph : [graph]) {
      const t = node?.['@type'];
      if (typeof t === 'string') types.add(t);
      else if (Array.isArray(t)) for (const x of t) if (typeof x === 'string') types.add(x);
    }
  }
  return types;
}

function newCollect(html) {
  const types = new Set();
  const collect = (node) => {
    if (Array.isArray(node)) {
      for (const x of node) collect(x);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const t = node['@type'];
    if (typeof t === 'string') types.add(t);
    else if (Array.isArray(t)) for (const x of t) if (typeof x === 'string') types.add(x);
    for (const key of Object.keys(node)) {
      if (key === '@type') continue;
      collect(node[key]);
    }
  };
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    let parsed;
    try {
      parsed = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    collect(parsed?.['@graph'] ?? [parsed]);
  }
  return types;
}

const REQUIRED = ['CollectionPage', 'BreadcrumbList', 'ItemList'];
const slugs = [
  'saas-metrics', 'ai-cost-tools', 'valuation-exit', 'freelance-pricing', 'cost-efficiency',
  'investment-roi', 'hiring-team', 'knowledge', 'legal-compliance', 'marketing-analytics',
  'operations-inventory', 'product-analytics', 'retention', 'sales', 'customer-support',
];

let oldFail = 0;
let newFail = 0;
for (const lang of ['en', 'zh']) {
  for (const slug of slugs) {
    const html = readFileSync(join('dist', lang, slug, 'index.html'), 'utf8');
    const oldT = oldCollect(html);
    const newT = newCollect(html);
    const oldMiss = REQUIRED.filter((t) => !oldT.has(t));
    const newMiss = REQUIRED.filter((t) => !newT.has(t));
    if (oldMiss.length) oldFail++;
    if (newMiss.length) newFail++;
    if (lang === 'en') {
      console.log(
        `  /${lang}/${slug}/`.padEnd(34) +
          `旧收集器缺=[${oldMiss.join(',')}]`.padEnd(26) +
          `新收集器缺=[${newMiss.join(',')}]`,
      );
    }
  }
}
console.log(`\n旧收集器判定为「缺 schema」的页数 = ${oldFail} / ${slugs.length * 2}`);
console.log(`新收集器判定为「缺 schema」的页数 = ${newFail} / ${slugs.length * 2}`);
process.exitCode = newFail > 0 ? 1 : 0;

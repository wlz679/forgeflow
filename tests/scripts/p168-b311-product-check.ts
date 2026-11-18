#!/usr/bin/env node
// P168 B3-11 —— 产物层验收：静态示例卡片（用户打开页面第一眼看到的那张）
//
// 为什么需要它
// ------------
//   本批修了 12 个引擎的 codegen defaultInputs（此前键名与引擎 inputs[].name 对不上
//   ⇒ staticExamples[0] 是「拿错输入算出来的」）⇒ 用户可见层变了。
//   源码层守卫（键集对齐 / 非退化）证明的是「输入对了」，
//   本工具证明的是「用户打开页面看到的卡片确实是这些输入算出来的」。
//
// 判据（每条都是写死的字面量，不靠「渲染结果等于渲染结果」自证）
//   · burn-rate   卡片必须写 Gross Burn $12,000 / Net Burn $7,000（修复前是 $0 / $-20,000）
//   · market-size 卡片标题必须写「Market Size: US dental clinics」（修复前是「your market」）
//   · mrr         卡片必须出现 Expansion MRR +$800（修复前是 +$0）
//   · ltv         卡片必须出现 CAC $150 与 LTV:CAC 9.3:1
//   · revenue-projector 卡片必须出现 Total Revenue $83,565（修复前是 $0）
//   · break-even  卡片必须出现 $5,000 / $500 / $1,000
//
// ⭐ 双美元号（$$）不在本脚本守
//   它的家是既有守卫 G14（tests/calc-output-no-dd-guard.test.ts，产物层全站扫描）。
//   G14 的判据更严：「$$」前后都挨着「$」⇒ 合法字面量（如 FAQ 里的垃圾邮件敏感词
//   示例 $$$）放行；只有真正的「$$12,000」才算缺陷。
//   本脚本若自己再扫一遍「$$」，必然把合法的 $$$ 误报 ⇒ 一个不变量只守一处。
//   （2026-11-18 实测：初版脚本用宽松正则扫全站，把 3 个含合法 $$$ 的页面误报成缺陷。）
//
// ⭐ 断言作用域：查卡片内容本身，不做整页 HTML 扫描
//   客户端 customFn 里有 u.targetMarket||"your market" 这类兜底值，
//   它是 JS 源码的一部分（用户看不到），但会出现在整页 HTML 里
//   ⇒ 整页扫描会把「兜底值」误判成「卡片内容错了」。
//   （2026-11-18 实测：market-size 卡片标题已是 US dental clinics，
//     但整页 HTML 里仍能搜到 "your market" ⇒ 误报。）
//
// 跑法（从仓库根，需先 build）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-b311-product-check.ts

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const DIST = join(ROOT, 'dist');

interface Expect {
  slug: string;
  lang: string;
  must: string[];
  mustNot: string[];
}

const EXPECT: Expect[] = [
  { slug: 'solopreneur-burn-rate-calculator', lang: 'en', must: ['Gross Burn', '$12,000', 'Net Burn', '$7,000'], mustNot: ['$0/mo'] },
  { slug: 'solopreneur-market-size-estimator', lang: 'en', must: ['Market Size: US dental clinics', 'TAM'], mustNot: ['Market Size: your market'] },
  { slug: 'solopreneur-mrr-calculator', lang: 'en', must: ['Expansion MRR', '$800'], mustNot: ['Expansion MRR|:   +$0'] },
  { slug: 'solopreneur-ltv-calculator', lang: 'en', must: ['$150', '9.3'], mustNot: ['CAC: $0'] },
  { slug: 'solopreneur-revenue-projector', lang: 'en', must: ['$83,565'], mustNot: ['Total Revenue:          $0'] },
  { slug: 'solopreneur-break-even-calculator', lang: 'en', must: ['$5,000', '$500', '$1,000'], mustNot: ['$0'] }
];

function pagePath(slug: string, lang: string): string {
  return join(DIST, lang, slug, 'index.html');
}

function decode(text: string): string {
  return text
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

if (!existsSync(DIST)) {
  console.log('dist/ 不存在 ⇒ 先跑 pnpm build');
  process.exit(1);
}

let bad = 0;
for (const e of EXPECT) {
  const p = pagePath(e.slug, e.lang);
  if (!existsSync(p)) { console.log('✗ 页面不存在: ' + p); bad++; continue; }
  const html = decode(readFileSync(p, 'utf8'));
  for (const m of e.must) {
    if (!html.includes(m)) { console.log('✗ ' + e.slug + ' (' + e.lang + ') 缺: ' + JSON.stringify(m)); bad++; }
  }
  for (const m of e.mustNot) {
    if (html.includes(m)) { console.log('✗ ' + e.slug + ' (' + e.lang + ') 仍含: ' + JSON.stringify(m)); bad++; }
  }
}

console.log('—— 产物层：抽查 ' + EXPECT.length + ' 处 · 问题 ' + bad + ' 处');
console.log('（全站双美元号由既有守卫 G14 守：tests/calc-output-no-dd-guard.test.ts）');
process.exitCode = bad === 0 ? 0 : 1;
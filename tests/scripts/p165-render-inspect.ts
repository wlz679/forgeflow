// P165 —— 渲染结构抽查：把决策层区块的骨架抽出来人工确认（不只是「存在」）。
//
// 跑法（必须从仓库根目录跑，且需要先 build）：
//   pnpm build:full
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p165-render-inspect.ts
import { readFileSync } from 'node:fs';

const html = readFileSync('dist/en/retention/index.html', 'utf8');
const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? '';

for (const attr of ['data-decision-layer', 'data-decision-choices']) {
  const m = main.match(new RegExp(`<section[^>]*${attr}="[^"]*"[^>]*>`));
  console.log(`\n=== ${attr} 的 section 开标签 ===`);
  console.log(m ? m[0] : '(没找到)');
}

// 决策链的步骤数
const chain = main.match(/<section[^>]*data-decision-layer="[^"]*"[^>]*>([\s\S]*?)<\/section>/);
if (chain) {
  const steps = [...chain[1]!.matchAll(/<li[^>]*>/g)].length;
  const h2 = chain[1]!.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1]?.replace(/<[^>]+>/g, '').trim();
  console.log(`\n决策链：h2 = "${h2}"，li 步骤数 = ${steps}`);
}

// 对照表的行数与列头
const choices = main.match(/<section[^>]*data-decision-choices="[^"]*"[^>]*>([\s\S]*?)<\/section>/);
if (choices) {
  const rows = [...choices[1]!.matchAll(/<tr[^>]*>/g)].length;
  const ths = [...choices[1]!.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => m[1]!.replace(/<[^>]+>/g, '').trim());
  console.log(`对照表：tr 数 = ${rows}，列头 = ${JSON.stringify(ths)}`);
  const links = [...choices[1]!.matchAll(/href="([^"]+)"/g)].map((m) => m[1]!);
  console.log(`对照表里的链接（${links.length}）：${links.slice(0, 3).join(' , ')} …`);
}

// 决策链里的链接
if (chain) {
  const links = [...chain[1]!.matchAll(/href="([^"]+)"/g)].map((m) => m[1]!);
  console.log(`决策链里的链接（${links.length}）：${links.join(' , ')}`);
}

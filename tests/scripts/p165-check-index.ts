// P165 —— 校验 index.ts 与各分类文件的导出一致性（并行写最容易出的错）。
//
// 跑法（必须从仓库根目录跑 —— 下面的路径是仓库根相对路径）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p165-check-index.ts
import { readFileSync, existsSync } from 'node:fs';
import { categories } from '../../src/data/categories.ts';

const DIR = 'src/data/category-decision-layers';
const idx = readFileSync(`${DIR}/index.ts`, 'utf8');

const imports = [...idx.matchAll(/import \{ ([A-Z]) \} from '\.\/([a-z])';/g)];
console.log(`index.ts 的 import 数 = ${imports.length}`);

let bad = 0;
for (const m of imports) {
  const L = m[1];
  const f = m[2];
  const p = `${DIR}/${f}.ts`;
  if (!existsSync(p)) {
    console.log(`  ✗ 缺文件 ${p}`);
    bad++;
    continue;
  }
  const src = readFileSync(p, 'utf8');
  if (!new RegExp(`export const ${L}\\s*:\\s*CategoryDecisionLayer`).test(src)) {
    console.log(`  ✗ ${p} 没有 export const ${L}`);
    bad++;
  }
}
console.log(bad === 0 ? '  ✓ 全部文件的导出字母与 index.ts 一致' : `  ✗ 不一致 ${bad} 处`);

// 合并表条目
const table = [...idx.matchAll(/^ {2}([A-Z]),$/gm)].map((m) => m[1]);
console.log(`合并表条目 = ${table.length}：${table.sort().join('')}`);
const all = categories.map((c) => c.id).sort();
console.log(`categories.ts 的 id = ${all.join('')}`);
const missing = all.filter((id) => !table.includes(id));
const extra = table.filter((id) => !all.includes(id));
console.log(
  missing.length === 0 && extra.length === 0
    ? '  ✓ 合并表与 categories.ts 完全一致'
    : `  ✗ 缺 ${missing.join(',')} / 多 ${extra.join(',')}`,
);

// 内容完成度
console.log('\n=== 各分类的内容完成度 ===');
for (const c of categories) {
  const p = `${DIR}/${c.id.toLowerCase()}.ts`;
  if (!existsSync(p)) {
    console.log(`  ${c.id}: 缺文件`);
    continue;
  }
  const src = readFileSync(p, 'utf8');
  const chain = (src.match(/slugs:/g) ?? []).length;
  const choices = (src.match(/answers:/g) ?? []).length;
  const intro = /chainIntro:\s*\{\s*en:\s*'[^']{10,}/.test(src);
  const bad = (src.match(/\uFFFD/g) ?? []).length;
  const flag = chain >= 2 && choices >= 1 && intro ? '✓' : '·';
  console.log(
    `  ${flag} ${c.id}: chain ${chain} 步 / choices ${choices} 行 / intro ${intro ? '有' : '空'} / U+FFFD ${bad} / ${src.length} 字节`,
  );
}

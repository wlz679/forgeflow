#!/usr/bin/env node
// P168 B3-8 —— 可复算体检：逐引擎列出「卡片行 / 英文行 / 裸 token / 判定」。
//
// 用法（从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-b3-8-audit.ts            # 全部 25 个已令牌化引擎
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-b3-8-audit.ts time_value # 只看一个 alias
//
// ⭐ 它是「验收数字」的可复算来源（不依赖 tmp/ 里的临时文件 —— B3-7 教训）。
//
// ⭐⭐ **覆盖边界（2026-11-16 实测补记）**：本工具读的是 **SSR 出来的 HTML** ⇒ 它测的是
//   「**服务端渲染层**有没有整行英文」。⇒ **浏览器里的后处理（客户端 beautifySections）
//   不在它的视野里** —— 那层曾经自己写死面向用户的英文标题、覆盖掉 zh 翻译（见 spec §10.15）。
//   ⇒ **两层合起来才等于「用户所见」**：
//     · 本工具 ⇒ SSR 层 0 整行英文；
//     · tests/beautify-no-hardcoded-copy-guard.test.ts ⇒ 客户端美化层不得自己造文案；
//   ⇒ **一个不变量只守一处**：本工具**不重复**去扫源码里的硬编码文案（那是守卫的职责）。

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { TOKENIZED } from './p168-tokenized-engines.mjs';
import { staticCard, isEnglishLine, hasBareToken } from './p168-card-text.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');
const NL = String.fromCharCode(10);

function distCard(lang: string, slug: string): string[] | null {
  const p = resolve(ROOT, 'dist', lang, slug, 'index.html');
  if (!existsSync(p)) return null;
  return staticCard(readFileSync(p, 'utf8'));
}

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const rows = TOKENIZED.filter((e) => only.length === 0 || only.some((n) => e.alias.includes(n) || e.slug.includes(n)));

let bad = 0;
let totalEn = 0;
let zhEn = 0;
let enEn = 0;
console.log('alias'.padEnd(26) + 'lang  card  en  bare  判定');
for (const e of rows) {
  for (const lang of ['zh', 'en'] as const) {
    const card = distCard(lang, e.slug);
    if (!card) { console.log(e.alias.padEnd(26) + lang + '  产物不存在'); bad++; continue; }
    const en = card.filter(isEnglishLine);
    const bare = card.filter(hasBareToken);
    totalEn += en.length;
    if (lang === 'zh') zhEn += en.length; else enEn += en.length;
    // ⭐ 判据落在**不变量**上：缺陷 = zh 侧有整行英文（G13）或任意侧有裸 token
    //   ⚠️ en 侧整行英文是**正常的**（英文页本来就该是英文）⇒ 不算缺陷
    //   ⇒ 否则本工具永远打不出 ALL OK / exit 0，而计划 Task 8 Step 4 要求它必须能到 ALL OK
    const defect = bare.length > 0 || (lang === 'zh' && en.length > 0);
    if (defect) bad++;
    console.log(e.alias.padEnd(26) + lang + '  ' + String(card.length).padStart(4) + '  ' + String(en.length).padStart(3) + '  ' + String(bare.length).padStart(4) + '  ' + (defect ? '待修' : 'OK'));
  }
}
console.log('—— ' + rows.length + ' 个引擎 · 英文行合计 ' + totalEn + '（zh 侧 ' + zhEn + ' / en 侧 ' + enEn + '）· 不合格 ' + bad);
console.log('（覆盖边界：本工具测 SSR 层；客户端 beautify 后处理由 tests/beautify-no-hardcoded-copy-guard.test.ts 守）');
console.log(bad === 0 ? 'ALL OK' : 'NOT YET');
process.exitCode = bad === 0 ? 0 : 1;

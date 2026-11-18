#!/usr/bin/env node
// P168 B3-9 —— locale **zh 值自动填充**：把「仓库里已有的同文译文」复用到新键上。
//
// 为什么需要它
// --------------
// B3-8 实测：新键 `calc_out.section.*` 是**跨引擎共享**的（措辞必须与 legacy 键逐字一致），
//   而引擎专属的 `calc_out.<alias>.row.*` 才是真正需要新译的。
// ⇒ 先用「**英文值完全相同**」去 locale 里找现成译文 ⇒ 能自动确定的大部分直接落库；
//   剩下的才交给翻译 worker。
// ⚠️ 用**整串英文完全相同**做匹配 ⇒ 冒号/标点/空格天然一致（B3-8 的「冒号存在性必须一致」是它的弱化版）。
//
// 用法（必须从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-locale-zh-autofill.ts
// 产出：
//   tmp/p168-zh-autofill.json  —— { code: zhValue }（可自动确定的）
//   tmp/p168-zh-needs.txt       —— code<TAB>英文模板（需人工翻译的）

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractAll } from './p168-locale-extract.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const NL = String.fromCharCode(10);

const en = JSON.parse(readFileSync(resolve(ROOT, 'src', 'i18n', 'locales', 'en.json'), 'utf8'));
const zh = JSON.parse(readFileSync(resolve(ROOT, 'src', 'i18n', 'locales', 'zh.json'), 'utf8'));

// 英文值 → 中文值（取第一个出现；同文不同译属既有事实，不在本工具职责内）
const byEn = new Map<string, string>();
let reused = 0;
for (const k of Object.keys(en)) {
  const ev = en[k];
  const zv = zh[k];
  if (typeof ev !== 'string' || typeof zv !== 'string') continue;
  if (!byEn.has(ev)) byEn.set(ev, zv);
  else reused++;
}

const res = extractAll(process.argv.slice(2).filter((a) => !a.startsWith('-')));
const newKeys: Record<string, string> = (res as any).newKeys ?? {};
const conflicts: string[] = (res as any).conflicts ?? [];
const noTemplateMissing: string[] = (res as any).noTemplateMissing ?? [];

// ⚠️ 落库工具的约定：zh 输入**不带前导 emoji**（它会从 en 值取前导 emoji 补上 ⇒ emoji 取源、不手打）
const stripLeadingEmoji = (s: string): string => {
  const m = /^[\u{1F000}-\u{1FAFF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}\u{2B50}\u{274C}\u{2705}\u{26A0}]+\s*/u.exec(s);
  return m ? s.slice(m[0].length) : s;
};

const auto: Record<string, string> = {};
const needs: string[] = [];
for (const code of Object.keys(newKeys).sort()) {
  const tpl = newKeys[code];
  const hit = byEn.get(tpl);
  if (hit !== undefined) { auto[code] = stripLeadingEmoji(hit); continue; }
  needs.push(code + '\t' + tpl);
}

if (!existsSync(resolve(ROOT, 'tmp'))) mkdirSync(resolve(ROOT, 'tmp'), { recursive: true });
writeFileSync(resolve(ROOT, 'tmp', 'p168-zh-autofill.json'), JSON.stringify(auto, null, 2), 'utf8');
writeFileSync(resolve(ROOT, 'tmp', 'p168-zh-needs.txt'), needs.join(NL) + NL, 'utf8');

console.log('新键 ' + Object.keys(newKeys).length + ' 个：自动填充 ' + Object.keys(auto).length + ' · 需人工翻译 ' + needs.length);
console.log('（locale 里同文重复的 en 值 ' + reused + ' 处，取首个出现）');
if (conflicts.length) console.log('⚠️ 冲突 ' + conflicts.length + ' 处：' + conflicts.slice(0, 5).join(' | '));
if (noTemplateMissing.length) console.log('⚠️ 推不出模板 ' + noTemplateMissing.length + ' 处：' + noTemplateMissing.slice(0, 5).join(' | '));
console.log('需要翻译的键已写到 tmp/p168-zh-needs.txt');

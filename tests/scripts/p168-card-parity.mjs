#!/usr/bin/env node
// P168 B3-7 —— 产物层「zh 卡片 vs en 卡片」的**结构 parity** 体检（可复算工具）。
//
// ⭐ 三条判据（与 tests/calc-output-render-guard.test.ts 同源）
//   ① zh 卡片可见文本**不得含裸 token**（$calc_out.…）—— 模板没查到就会漏出原始码
//   ② en / zh 卡片**行数必须一致** —— 结构分叉（zh 多一条 tip 行就是典型）
//   ③ zh 卡片**不得有整行英文**（≥3 个 ≥3 字母的英文词，且 CJK 不超过 2 个）
//
// ⚠️ 文件名**不能**带 .test.ts ⇒ 不会被 walkTestSuites 计入套件数。
//
// 用法（从仓库根跑）：
//   node tests/scripts/p168-card-parity.mjs          # 打印表
//   node tests/scripts/p168-card-parity.mjs --check   # 有不合格 ⇒ exit 1

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PILOT, staticCard, isEnglishLine, hasBareToken } from './p168-card-text.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');
const CHECK = process.argv.includes('--check');

function cardOf(lang, slug) {
  const p = join(ROOT, 'dist', lang, slug, 'index.html');
  if (!existsSync(p)) return null;
  return staticCard(readFileSync(p, 'utf8'));
}

const rows = [];
for (const [slug, , alias] of PILOT) {
  const en = cardOf('en', slug);
  const zh = cardOf('zh', slug);
  const rec = { slug, alias, ok: true, notes: [] };
  if (!en || !zh) {
    rec.ok = false;
    rec.notes.push('产物缺失');
    rows.push(rec);
    continue;
  }
  rec.enLines = en.length;
  rec.zhLines = zh.length;
  const bare = zh.filter((l) => hasBareToken(l));
  rec.zhBareTokens = bare.length;
  if (bare.length) { rec.ok = false; rec.notes.push('zh 裸 token ' + bare.length + ' 行'); }
  if (en.length !== zh.length) { rec.ok = false; rec.notes.push('行数 en ' + en.length + ' ≠ zh ' + zh.length); }
  const eng = zh.filter((l) => isEnglishLine(l));
  rec.zhEnglishLines = eng.length;
  if (eng.length) { rec.ok = false; rec.notes.push('zh 整行英文 ' + eng.length + ' 行'); rec.samples = eng.slice(0, 2); }
  rows.push(rec);
}

for (const r of rows) {
  console.log(r.alias.padEnd(22) + String(r.enLines ?? '-').padStart(5) + String(r.zhLines ?? '-').padStart(6) + String(r.zhBareTokens ?? '-').padStart(10) + String(r.zhEnglishLines ?? '-').padStart(9) + '  ' + (r.ok ? '✔' : '✘ ' + r.notes.join('；')));
}
const bad = rows.filter((r) => !r.ok);
console.log('');
console.log(rows.length + ' 个试点 · 不合格 ' + bad.length);
if (CHECK && bad.length) process.exit(1);

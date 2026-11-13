#!/usr/bin/env node
// P168 B3-7 —— 体检脚本：产出 B3-7 的**可复算验收数字**（spec `1.1 目标 3）。
//
// ⭐ 5 组数字：
//   ① zh 卡片英文行数（逐工具）—— 产物层「整行没有 CJK 且含拉丁字母」的行数
//   ② token 覆盖率 —— 每个引擎「输出行数」与「含 token 的行数」
//   ③ locale 键统计 —— calc_out.* 总数 · 共享 label/section 数 · 每工具 row 数
//   ④ 新增 vs 复用 —— 按 Task 6~15 的顺序模拟 ⇒ 外推铺开到 90 个引擎的工作量
//   ⑤ 注入体积 —— 每个工具页注入的模板子集 JSON 字节数
//
// ⚠️ 文件名**不能**带 .test.ts ⇒ 不会被 walkTestSuites 计入套件数。
// ⚠️ 纯 node（不 import TS）⇒ 只解析文件，不执行引擎。
//
// 用法（从仓库根跑）：
//   node tests/scripts/p168-calc-output-audit.mjs
//   node tests/scripts/p168-calc-output-audit.mjs --json

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { stripComments } from '../build-dep-suites.mjs';
import { PILOT, staticCard, isEnglishLine } from './p168-card-text.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');
const JSON_ONLY = process.argv.includes('--json');

/** 10 个试点工具：slug → 引擎文件 */

/** Astro 会把属性里的引号转成 &quot; ⇒ 取出来先解码 */
function decodeEntities(s) {
  return s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]/;
const LATIN = /[A-Za-z]/;

/** 取产物页的 #static-results 卡片文本 */

/** 从引擎源码里抽出 staticExamples[0] 的原始文本（不解码转义，只够统计行数与 token） */
const BS = String.fromCharCode(92);
/** 空白或左方括号（静态示例的写法：staticExamples: [ 换行 '……', 换行 ]） */
function isSpaceOrBracket(c) {
  return c === ' ' || c === String.fromCharCode(9) || c === String.fromCharCode(10) || c === String.fromCharCode(13) || c === '[';
}

function staticExampleRaw(src) {
  const i = src.indexOf('staticExamples:');
  if (i < 0) return '';
  // ⭐ 实测：源码写法是 staticExamples: [ 换行 '……', 换行 ] ⇒ 冒号后是**空白 + 左方括号**，
  //   不是直接跟引号 ⇒ 只跳空白会拿到 '[' ⇒ 抽不到内容。
  let j = i + 'staticExamples:'.length;
  while (j < src.length && isSpaceOrBracket(src[j])) j++;
  const q = src[j];
  if (q !== "'" && q !== '"' && q !== '`') return '';
  const start = j + 1;
  let k = start;
  while (k < src.length) {
    if (src[k] === BS) { k += 2; continue; }
    if (src[k] === q) break;
    k++;
  }
  return src.slice(start, k);
}
/**
 * 引擎源码里声明的 token code 集合（三种写法都认）。
 * ⚠️ 口径必须与守卫（tests/calc-output-i18n-guard.test.ts 的 tokenCodesIn）**完全一致**：
 *   · **先剥注释** ⇒ 注释里写的 code 不算「已声明」（2026-11-13 实测踩过）
 *   · 认**字面量映射表**形态（{excellent:'calc_out.x.band_excellent', ...}）
 *     ⇒ 动态拼码禁令落地后，分支 code 只能以映射表出现
 */
function declaredCodes(rawSrc) {
  const src = stripComments(rawSrc);
  const out = new Set();
  for (const m of src.matchAll(/\$([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)/g)) out.add(m[1]);
  for (const m of src.matchAll(/\b(?:tk|tok|makeToken)\(\s*['"]([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)['"]/g)) out.add(m[1]);
  for (const m of src.matchAll(/['"](calc_out\.[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)['"]/g)) out.add(m[1]);
  return out;
}

const report = { generatedFor: 'P168 B3-7', at: new Date().toISOString(), groups: {} };

// ── ① zh 卡片英文行数（逐工具）────────────────────────────────────────────
const english = [];
for (const [slug, , alias] of PILOT) {
  const p = join(ROOT, 'dist', 'zh', slug, 'index.html');
  if (!existsSync(p)) { english.push({ slug, alias, exists: false }); continue; }
  const html = readFileSync(p, 'utf8');
  const lines = staticCard(html);
  const en = lines.filter(isEnglishLine);
  english.push({ slug, alias, exists: true, totalLines: lines.length, englishLines: en.length, samples: en.slice(0, 3) });
}
report.groups.zhCardEnglishLines = english;

// ── ② token 覆盖率（源码级：staticExamples[0] 的行 vs 含 token 的行）──────
const coverage = [];
for (const [, engineRel, alias] of PILOT) {
  const p = join(ROOT, engineRel);
  if (!existsSync(p)) { coverage.push({ alias, exists: false }); continue; }
  const src = readFileSync(p, 'utf8');
  const raw = staticExampleRaw(src);
  const lines = raw.split('\\n');
  const withToken = lines.filter((l) => l.includes('$calc_out.')).length;
  const codes = declaredCodes(src);
  coverage.push({
    alias, exists: true,
    outputLines: lines.length,
    linesWithToken: withToken,
    coveragePct: lines.length ? +((withToken / lines.length) * 100).toFixed(1) : 0,
    declaredCodes: codes.size,
  });
}
report.groups.tokenCoverage = coverage;

// ── ③ locale 键统计 ──────────────────────────────────────────────────────
const locales = {};
for (const lang of ['en', 'zh']) {
  const p = join(ROOT, 'src/i18n/locales', lang + '.json');
  locales[lang] = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
}
const calcKeys = Object.keys(locales.zh || {}).filter((k) => k.startsWith('calc_out.'));
const shared = calcKeys.filter((k) => /^calc_out\.(label|section)\./.test(k));
const perTool = {};
for (const k of calcKeys) {
  const seg = k.split('.');
  if (seg.length === 4 && seg[2] === 'row') perTool[seg[1]] = (perTool[seg[1]] || 0) + 1;
}
report.groups.localeKeys = {
  total: calcKeys.length,
  enKeys: Object.keys(locales.en || {}).filter((k) => k.startsWith('calc_out.')).length,
  zhKeys: calcKeys.length,
  sharedLabelSection: shared.length,
  perToolRows: perTool,
};

// ── ④ 新增 vs 复用（按 Task 6~15 的顺序模拟）──────────────────────────────
const seq = [];
const seen = new Set();
for (const [, , alias] of PILOT) {
  const cov = coverage.find((c) => c.alias === alias);
  const codes = cov && cov.exists ? declaredCodes(readFileSync(join(ROOT, PILOT.find((x) => x[2] === alias)[1]), 'utf8')) : new Set();
  let fresh = 0;
  for (const c of codes) if (!seen.has(c)) { seen.add(c); fresh++; }
  seq.push({ alias, declared: codes.size, fresh });
}
const avgFresh = seq.length ? +(seq.reduce((a, b) => a + b.fresh, 0) / seq.length).toFixed(1) : 0;
report.groups.newVsReuse = {
  sequence: seq,
  pilotTotalFresh: seq.reduce((a, b) => a + b.fresh, 0),
  avgFreshPerEngine: avgFresh,
  extrapolate90: Math.round(avgFresh * 90),
};

// ── ⑤ 注入体积 ───────────────────────────────────────────────────────────
const injection = [];
for (const [slug, , alias] of PILOT) {
  const p = join(ROOT, 'dist', 'zh', slug, 'index.html');
  if (!existsSync(p)) { injection.push({ slug, alias, exists: false }); continue; }
  const html = readFileSync(p, 'utf8');
  const m = html.match(/data-calc-output-templates="([^"]*)"/);
  const raw = m ? m[1] : '';
  let keys = 0;
  if (raw) {
    try { keys = Object.keys(JSON.parse(decodeEntities(raw))).length; } catch { keys = -1; }
  }
  injection.push({ slug, alias, exists: true, bytes: Buffer.byteLength(raw), keys });
}
report.groups.injectionSize = injection;

if (JSON_ONLY) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('══ P168 B3-7 体检 ══\n');
  console.log('① zh 卡片英文行数（逐工具）');
  for (const e of english) {
    console.log('   ' + e.alias.padEnd(22) + (e.exists ? (e.englishLines + ' / ' + e.totalLines + ' 行') : '（产物不存在）'));
  }
  console.log('\n② token 覆盖率（staticExamples[0]）');
  for (const c of coverage) {
    console.log('   ' + c.alias.padEnd(22) + (c.exists ? (c.linesWithToken + ' / ' + c.outputLines + ' 行 = ' + c.coveragePct + '%（声明 ' + c.declaredCodes + ' 个 code）') : '（引擎文件不存在）'));
  }
  console.log('\n③ locale 键统计');
  console.log('   calc_out.* 总数 ' + report.groups.localeKeys.total + '（en ' + report.groups.localeKeys.enKeys + ' / zh ' + report.groups.localeKeys.zhKeys + '）');
  console.log('   共享 label/section ' + report.groups.localeKeys.sharedLabelSection + ' 个 · 工具独有 row ' + Object.values(report.groups.localeKeys.perToolRows).reduce((a, b) => a + b, 0) + ' 个');
  console.log('\n④ 新增 vs 复用（按试点顺序模拟）');
  for (const s of seq) console.log('   ' + s.alias.padEnd(22) + '声明 ' + s.declared + ' · 新增 ' + s.fresh);
  console.log('   试点合计新增 ' + report.groups.newVsReuse.pilotTotalFresh + ' · 平均每引擎新增 ' + avgFresh + ' ⇒ 外推 90 个引擎约 ' + report.groups.newVsReuse.extrapolate90 + ' 个键');
  console.log('\n⑤ 注入体积（data-calc-output-templates）');
  for (const i2 of injection) {
    console.log('   ' + i2.alias.padEnd(22) + (i2.exists ? (i2.bytes + ' 字节 / ' + i2.keys + ' 个键') : '（产物不存在）'));
  }
}

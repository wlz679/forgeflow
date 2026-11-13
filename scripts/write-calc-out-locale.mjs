#!/usr/bin/env node
// P168 B3-7 —— 把 token 模板落进 locale（en.json / zh.json）。
//
// ⭐⭐ 为什么用**文本插入**而不是 `JSON.stringify(obj, null, 2)` 整文件重写
//   locale 有 ~790KB / 5700+ 行 ⇒ 整文件重写会让 diff 变成「全文重排」
//   ⇒ review 时看不出真实改动 ⇒ 违反「改动可审计」。
//   ⇒ 本脚本**只插入新增行** ⇒ `git diff` 只显示新增行。
//
// ⭐ 插入位置：紧跟 **`decision_tip.`** 块之后
//   locale 的键**不是**字典序，而是**语义分组**（实测前缀顺序：
//   site → nav → btn → results → … → decision → decision_tip → authors → tools → … → notFound）。
//   ⇒ `calc_out.*` 是 B3 的第三个命名空间 ⇒ 紧跟 `decision_tip.*` 放（同族相邻）。
//   ⇒ 可用 `--after-prefix` 改。
//
// 用法（从仓库根跑）：
//   node scripts/write-calc-out-locale.mjs --check          # 只校验，不写
//   node scripts/write-calc-out-locale.mjs                   # 落库
//   node scripts/write-calc-out-locale.mjs --src <file>      # 指定来源（默认 tmp/canonical-locale.json）
//   node scripts/write-calc-out-locale.mjs --target <dir>    # 指定目标目录（默认 src/i18n/locales）
//   node scripts/write-calc-out-locale.mjs --after-prefix decision_tip.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
const argOf = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const SRC = resolve(ROOT, argOf('--src', 'tmp/canonical-locale.json'));
const TARGET_DIR = resolve(ROOT, argOf('--target', 'src/i18n/locales'));
const AFTER_PREFIX = argOf('--after-prefix', 'decision_tip.');

if (!existsSync(SRC)) {
  console.error('找不到来源文件：' + SRC);
  process.exit(2);
}

const canonical = JSON.parse(readFileSync(SRC, 'utf8'));
const codes = Object.keys(canonical).sort();
if (!codes.length) { console.error('来源文件里没有任何键'); process.exit(2); }

/** locale 文件的一行键：  "key": "value", */
const KEY_LINE = /^  ("[^"]+"):/;

function parseLocale(file) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  const keys = [];
  for (let i = 0; i < lines.length; i++) {
    const m = KEY_LINE.exec(lines[i]);
    if (m) keys.push({ key: JSON.parse(m[1]), line: i });
  }
  return { text, lines, keys };
}

function rawValueOf(locale, key) {
  const re = new RegExp('^  "' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '": (.*?),?$');
  for (const line of locale.lines) {
    const m = re.exec(line);
    if (m) return m[1];
  }
  return null;
}

const problems = [];
const toInsert = { en: [], zh: [] };

for (const code of codes) {
  const v = canonical[code];
  if (!v || typeof v.en !== 'string' || typeof v.zh !== 'string') {
    problems.push(code + '：canonical 条目缺 en/zh');
    continue;
  }
  for (const lang of ['en', 'zh']) {
    const file = resolve(TARGET_DIR, lang + '.json');
    const locale = parseLocale(file);
    const want = JSON.stringify(v[lang]);
    const got = rawValueOf(locale, code);
    if (got !== null) {
      if (got !== want) problems.push(lang + '：' + code + ' 已存在但值不同\n  现值: ' + got + '\n  期望: ' + want);
      continue;
    }
    toInsert[lang].push({ code, line: '  ' + JSON.stringify(code) + ': ' + want });
  }
}

if (problems.length) {
  console.error('⚠️ 有 ' + problems.length + ' 处冲突：');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}

function applyInsertions(file, inserts) {
  if (!inserts.length) return { changed: 0, lines: null };
  const locale = parseLocale(file);
  const lines = locale.lines.slice();
  // 插入点：最后一个「以 AFTER_PREFIX 开头」的键之后
  let anchor = -1;
  for (const k of locale.keys) if (k.key.startsWith(AFTER_PREFIX)) anchor = Math.max(anchor, k.line);
  let at;
  if (anchor >= 0) {
    at = anchor + 1;
  } else {
    // 没找到锚点 ⇒ 追加到最后一个键之后
    let lastKeyLine = -1;
    for (const k of locale.keys) lastKeyLine = Math.max(lastKeyLine, k.line);
    at = lastKeyLine + 1;
    // 追加到末尾 ⇒ 原来最后一个键行要补逗号
    const prev = at - 1;
    if (prev >= 0 && KEY_LINE.test(lines[prev]) && !lines[prev].trimEnd().endsWith(',')) {
      lines[prev] = lines[prev].replace(/\s*$/, '') + ',';
    }
  }
  lines.splice(at, 0, ...inserts.map((x) => x.line));
  // 规整：所有键行以逗号结尾，除最后一个键行
  let lastKeyLine = -1;
  for (let i = 0; i < lines.length; i++) if (KEY_LINE.test(lines[i])) lastKeyLine = i;
  for (let i = 0; i < lines.length; i++) {
    if (!KEY_LINE.test(lines[i])) continue;
    const has = lines[i].trimEnd().endsWith(',');
    if (i === lastKeyLine) { if (has) lines[i] = lines[i].replace(/,\s*$/, ''); }
    else if (!has) lines[i] = lines[i].replace(/\s*$/, '') + ',';
  }
  return { changed: inserts.length, lines };
}

let totalInserted = 0;
for (const lang of ['en', 'zh']) {
  const file = resolve(TARGET_DIR, lang + '.json');
  const { changed, lines } = applyInsertions(file, toInsert[lang]);
  totalInserted += changed;
  console.log(lang + '：' + (changed ? ('待插入 ' + changed + ' 个键（位置：' + AFTER_PREFIX + ' 块之后）') : '无需改动（已全部存在）'));
  if (changed && !CHECK) {
    writeFileSync(file, lines.join('\n'), 'utf8');
    console.log('  ✔ 已写入 ' + file);
  }
}

console.log('\n来源: ' + SRC + '（' + codes.length + ' 个键）');
if (CHECK && totalInserted) {
  console.log('⚠️ --check 模式：locale 缺少 ' + totalInserted + ' 个键');
  process.exit(1);
}
console.log(totalInserted ? '✔ 落库完成' : '✔ locale 已是最新');

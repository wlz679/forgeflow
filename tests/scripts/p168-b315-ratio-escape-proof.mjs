#!/usr/bin/env node
// P168 B3-15 修复轮 —— **I-1 逃逸闭环复现**（比例型 param · 保比扰动盲区）。
//
// ⭐ 复审 I-1 说的是什么：
//   旧版验收脚本（p168-b315-params-coverage.mjs，HEAD = b399bc3）的扰动只有
//   「所有正数输入统一 ×3+1」**一个**变体 ⇒ **保比**（分子分母同步放大）
//   ⇒ 比例型 param（如 stale_pct = stale/total）在扰动下**值不变**
//   ⇒ B2 的「兜底变了 ⇒ 模板必须跟着变」**永远不触发**
//   ⇒ 把 {stale_pct} 在 en/zh 模板里冻结成字面量 35 **并**把源码里的 param 删掉
//      ⇒ 脚本仍判绿（**假绿逃逸**）。
//
// ⭐ 本脚本干什么（**不改任何守卫判据**，只换扰动集做对照实验）：
//   ① 在 shadow repo 里直接算出 stale_pct 在每个变体下的兜底值（**数字证据**）
//      —— 保比变体集下**恒定** / 逐参数变体集下**确实变化**
//   ② 用**当前**（逐参数独立扰动）变体集跑验收脚本 + M11 变异 ⇒ 必须 RED
//   ③ 把 shadow 里的 variantsOf **换回旧的保比变体集**再跑同一变异 ⇒ 必须 GREEN（= 逃逸复现）
//   ⇒ ①+②+③ 合起来 = 「旧台子有盲区（新台子堵住了）」的闭环证明。
//
// 用法（**必须从仓库根运行**；纯 .mjs ⇒ 不要加 --import tsx）：
//      node tests/scripts/p168-b315-ratio-escape-proof.mjs
//
// ⚠️ 本文件**不是** test（文件名不带 .test.ts）⇒ 不进 walkTestSuites 的套件计数。
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const REPO = resolve(import.meta.dirname, '..', '..');
const SHADOW = resolve(tmpdir(), 'ffk-p168-b315-ratio-proof');
const PROBE_REL = 'tests/scripts/p168-b315-variant-probe.mjs';

// —— M11 变异（与 p168-b315-mutation-harness.mjs 的 M11 同一条语义）——
const EN_TIP_ANCHOR = '{stale_pct}% of KB has wrong info';
const ZH_TIP_ANCHOR = '{stale_pct}% 的内容是客户照着做却仍出错的信息';
const SRC_TIP_PARAM_ANCHOR = '{ stale_pct: stalePctLabel },';
const SRC_TIP_PAYLOAD_ANCHOR = '{"stale_pct":"35"}';

const FILES = {
  en: 'src/i18n/locales/en.json',
  zh: 'src/i18n/locales/zh.json',
  src: 'src/engines/knowledge/article-freshness-calculator.ts',
  script: 'tests/scripts/p168-b315-params-coverage.mjs',
};

function replaceOnce(text, needle, replacement, label) {
  const n = text.split(needle).length - 1;
  if (n !== 1) throw new Error(label + ' 锚点出现 ' + n + ' 次（期望 1 次）：' + needle.slice(0, 60));
  return text.replace(needle, () => replacement);
}

/** 用括号配对找函数体（从函数名开始）并替换 */
function replaceFunction(src, header, replacement) {
  const i = src.indexOf(header);
  if (i < 0) throw new Error('找不到函数：' + header);
  let depth = 0;
  const open = src.indexOf('{', i);
  for (let k = open; k < src.length; k++) {
    const c = src[k];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return src.slice(0, i) + replacement + src.slice(k + 1);
    }
  }
  throw new Error('函数体括号不配对：' + header);
}

/** 旧版（保比）变体集 —— 与 HEAD=b399bc3 的行为一致：默认 + 全局×3+1 */
const OLD_VARIANTS_OF = [
  'function variantsOf(base) {',
  '  const out = [{ name: \'默认\', inputs: { ...base } }];',
  '  const all = {};',
  '  for (const [k, val] of Object.entries(base)) {',
  '    const n = Number(val);',
  '    all[k] = Number.isFinite(n) && n > 0 ? String(n * 3 + 1) : val;',
  '  }',
  '  out.push({ name: \'全局×3+1\', inputs: all });',
  '  return out;',
  '}',
].join(String.fromCharCode(10));

function setup() {
  if (!SHADOW.startsWith(resolve(tmpdir())) || !SHADOW.includes('ffk-p168-b315-ratio-proof')) {
    throw new Error('shadow 路径不安全：' + SHADOW);
  }
  if (existsSync(SHADOW)) rmSync(SHADOW, { recursive: true, force: true });
  mkdirSync(SHADOW, { recursive: true });
  cpSync(resolve(REPO, 'src'), resolve(SHADOW, 'src'), { recursive: true });
  mkdirSync(resolve(SHADOW, 'scripts'), { recursive: true });
  cpSync(resolve(REPO, 'scripts/codegen-examples.mjs'), resolve(SHADOW, 'scripts/codegen-examples.mjs'));
  mkdirSync(resolve(SHADOW, 'tests/scripts'), { recursive: true });
  for (const f of ['p168-b315-params-coverage.mjs', 'p168-tokenized-engines.mjs', 'p168-b315-variant-probe.mjs']) {
    cpSync(resolve(REPO, 'tests/scripts', f), resolve(SHADOW, 'tests/scripts', f));
  }
  for (const f of ['package.json', 'tsconfig.json']) {
    if (existsSync(resolve(REPO, f))) cpSync(resolve(REPO, f), resolve(SHADOW, f));
  }
  symlinkSync(resolve(REPO, 'node_modules'), resolve(SHADOW, 'node_modules'), 'junction');
}

function runProbe() {
  const r = spawnSync(process.execPath, ['--import', 'tsx', 'tests/scripts/p168-b315-variant-probe.mjs'], {
    cwd: SHADOW, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  const lines = ((r.stdout || '') + (r.stderr || '')).split(/\r?\n/).filter(Boolean);
  const rows = [];
  for (const l of lines) {
    if (!l.trim().startsWith('{')) continue;
    try { rows.push(JSON.parse(l)); } catch { /* 非 JSON 行忽略 */ }
  }
  return { exit: r.status, rows };
}

function runCoverage() {
  const r = spawnSync(process.execPath, ['--import', 'tsx', 'tests/scripts/p168-b315-params-coverage.mjs'], {
    cwd: SHADOW, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024,
  });
  const out = (r.stdout || '') + (r.stderr || '');
  const failRows = (out.match(/^FAIL \| .*$/gm) || []).map((line) => {
    const parts = line.split(' | ');
    return {
      id: (parts[1] || '?') + '|' + (parts[2] || '?'),
      a: /A段\(静态\)=FAIL/.test(line),
      b: /B段\(扰动\)=FAIL/.test(line),
    };
  });
  const summary = (out.match(/—— .*违规 .*/) || [''])[0];
  return { exit: r.status, failRows, summary };
}

function applyM11() {
  const en = replaceOnce(readFileSync(resolve(REPO, FILES.en), 'utf8'), EN_TIP_ANCHOR, EN_TIP_ANCHOR.replace('{stale_pct}', '35'), 'M11c');
  const zh = replaceOnce(readFileSync(resolve(REPO, FILES.zh), 'utf8'), ZH_TIP_ANCHOR, ZH_TIP_ANCHOR.replace('{stale_pct}', '35'), 'M11d');
  let src = readFileSync(resolve(REPO, FILES.src), 'utf8');
  src = replaceOnce(src, SRC_TIP_PARAM_ANCHOR, '', 'M11a');
  src = replaceOnce(src, SRC_TIP_PAYLOAD_ANCHOR, '', 'M11b');
  writeFileSync(resolve(SHADOW, FILES.en), en, 'utf8');
  writeFileSync(resolve(SHADOW, FILES.zh), zh, 'utf8');
  writeFileSync(resolve(SHADOW, FILES.src), src, 'utf8');
}

setup();

// —— ① 数字证据：stale_pct 在各变体下的兜底值 ——
const probe = runProbe();
console.log('== ① 数字证据（shadow 里直接算 stale_pct） ==');
for (const r of probe.rows) {
  console.log('   ' + (r.ratioPreserving ? '[保比] ' : '[非等比] ') + String(r.variant).padEnd(32) + ' stale_pct=' + r.stale_pct);
}
const ratioRows = probe.rows.filter((r) => r.ratioPreserving);
const nonRatioRows = probe.rows.filter((r) => !r.ratioPreserving);
const ratioConst = ratioRows.length > 0 && ratioRows.every((r) => r.stale_pct === ratioRows[0].stale_pct);
const nonRatioChanged = nonRatioRows.some((r) => r.stale_pct !== ratioRows[0].stale_pct);
console.log('   → 保比变体集下 stale_pct ' + (ratioConst ? '恒定（' + ratioRows[0].stale_pct + '）' : '不恒定'));
console.log('   → 逐参数变体集下 stale_pct ' + (nonRatioChanged ? '确实变化' : '没变'));

// —— ② 新变体集（逐参数独立扰动）+ M11 ⇒ 必须 RED ——
applyM11();
const newRun = runCoverage();
const newRed = newRun.exit !== 0;
const newTip = newRun.failRows.some((r) => r.id === 'article_freshness|tip' && r.b);
console.log('');
console.log('== ② 新变体集（逐参数独立扰动）+ M11 ⇒ ==');
console.log('   ' + newRun.summary);
console.log('   exit=' + newRun.exit + ' → ' + (newRed ? 'RED（躲不过）' : 'GREEN（逃逸！）'));
console.log('   失败行：' + (newRun.failRows.map((r) => r.id + (r.b ? '（B段）' : r.a ? '（A段）' : '')).join('、') || '（无）'));

// —— ③ 旧变体集（保比）+ M11 ⇒ 必须 GREEN（= 逃逸复现）——
writeFileSync(resolve(SHADOW, FILES.script), replaceFunction(readFileSync(resolve(REPO, FILES.script), 'utf8'), 'function variantsOf(base)', OLD_VARIANTS_OF), 'utf8');
const oldRun = runCoverage();
const oldGreen = oldRun.exit === 0;
console.log('');
console.log('== ③ 旧变体集（保比：默认 + 全局×3+1）+ M11 ⇒ ==');
console.log('   ' + oldRun.summary);
console.log('   exit=' + oldRun.exit + ' → ' + (oldGreen ? 'GREEN（逃逸复现：旧台子盲区）' : 'RED'));
console.log('   失败行：' + (oldRun.failRows.map((r) => r.id).join('、') || '（无）'));

const verdicts = [
  { id: 'V1 保比变体集下 stale_pct 恒定', ok: ratioConst },
  { id: 'V2 逐参数变体集下 stale_pct 变化', ok: nonRatioChanged },
  { id: 'V3 新变体集 + M11 被 B 段判红（精确行 article_freshness|tip）', ok: newRed && newTip },
  { id: 'V4 旧保比变体集 + M11 判绿（逃逸复现 ⇒ 旧台子确实有盲区）', ok: oldGreen },
];
console.log('');
console.log('== 结论 ==');
for (const v of verdicts) console.log('   ' + (v.ok ? '✓' : '✗') + ' ' + v.id);
const bad = verdicts.filter((v) => !v.ok).length;
console.log('—— ' + verdicts.length + ' 项判定 · 不符 ' + bad + ' 项');
console.log('shadow repo:', SHADOW);
process.exit(bad === 0 ? 0 : 1);

#!/usr/bin/env node
// P168 B3-15 —— **params 覆盖验收脚本的变异台子**（自证：堵住「模板冻结数值」假绿）。
//
// 为什么要它：`tests/scripts/p168-b315-params-coverage.mjs` 的**静态段（A 段）看不见
// 「模板冻结数值」** —— 占位符集合比对只看占位符形态的东西，模板里把 `{up12}` 写成
// 字面量 `325` 时占位符集合照样能对上 ⇒ A 段假绿（2026-11-24 只读复审实测的逃逸）。
// ⇒ 必须有一台**能证明修复真的堵住了逃逸**的台子。
//
// 做法：把仓库的 en.json / zh.json / 引擎源码 / 验收脚本复制到 TEMP（shadow repo，
//       node_modules 用 junction 指回真仓库）⇒ 逐个注入变异 ⇒ 跑验收脚本 ⇒ 看 RED/GREEN。
//
// 用法（**必须从仓库根运行**）：
//      node tests/scripts/p168-b315-mutation-harness.mjs
//
// ⚠️ 本文件**不是** test（文件名不带 .test.ts）⇒ 不进 walkTestSuites 的套件计数。
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const REPO = resolve(import.meta.dirname, '..', '..');
const SHADOW = resolve(tmpdir(), 'ffk-p168-b315-shadow');

const EN_SNAP =
  '📊 Snapshot: {up12}/{total} updated 12mo - {up6}/{total} updated 6mo - {stale} stale - target {target}% ({gap}pp gap)';
const ZH_SNAP =
  '📊 快照：{up12}/{total} 篇在 12 个月内更新过 · {up6}/{total} 篇在 6 个月内更新过 · {stale} 篇已过期 · 目标 {target}%（差距 {gap}pp）';

const FILES = {
  en: 'src/i18n/locales/en.json',
  zh: 'src/i18n/locales/zh.json',
  src: 'src/engines/knowledge/article-freshness-calculator.ts',
};

function replaceOnce(text, needle, replacement, label) {
  const n = text.split(needle).length - 1;
  if (n !== 1) throw new Error(label + ' 锚点出现 ' + n + ' 次（期望 1 次）：' + needle.slice(0, 60));
  return text.replace(needle, () => replacement);
}

// —— shadow repo 搭建 ——
function setup() {
  if (!SHADOW.startsWith(resolve(tmpdir())) || !SHADOW.includes('ffk-p168-b315-shadow')) {
    throw new Error('shadow 路径不安全：' + SHADOW);
  }
  if (existsSync(SHADOW)) rmSync(SHADOW, { recursive: true, force: true });
  mkdirSync(SHADOW, { recursive: true });
  cpSync(resolve(REPO, 'src'), resolve(SHADOW, 'src'), { recursive: true });
  mkdirSync(resolve(SHADOW, 'scripts'), { recursive: true });
  cpSync(resolve(REPO, 'scripts/codegen-examples.mjs'), resolve(SHADOW, 'scripts/codegen-examples.mjs'));
  mkdirSync(resolve(SHADOW, 'tests/scripts'), { recursive: true });
  for (const f of ['p168-b315-params-coverage.mjs', 'p168-tokenized-engines.mjs']) {
    cpSync(resolve(REPO, 'tests/scripts', f), resolve(SHADOW, 'tests/scripts', f));
  }
  for (const f of ['package.json', 'tsconfig.json']) {
    if (existsSync(resolve(REPO, f))) cpSync(resolve(REPO, f), resolve(SHADOW, f));
  }
  symlinkSync(resolve(REPO, 'node_modules'), resolve(SHADOW, 'node_modules'), 'junction');
}

const PRISTINE = {};
function loadPristine() {
  for (const [k, rel] of Object.entries(FILES)) {
    PRISTINE[k] = readFileSync(resolve(REPO, rel), 'utf8');
  }
}

function restore() {
  for (const [k, rel] of Object.entries(FILES)) {
    writeFileSync(resolve(SHADOW, rel), PRISTINE[k], 'utf8');
  }
}

// —— 变异定义 ——
const SRC_PARAM_ANCHOR = '{ up12: up12Label, total: totalLabel,';
const SRC_PARAM_MUT = '{ total: totalLabel,';
const SRC_PAYLOAD_ANCHOR = '{"up12":"325","total":"500"';
const SRC_PAYLOAD_MUT = '{"total":"500"';

export const SCENARIOS = [
  { id: 'M0', desc: '未变异基线', expect: 'GREEN', mut: () => ({}) },
  { id: 'M1', desc: 'en 模板冻结 {up12}→325（params 仍在）', expect: 'RED', mut: () => ({ en: (t) => replaceOnce(t, EN_SNAP, EN_SNAP.replace('{up12}', '325'), 'M1') }) },
  { id: 'M2', desc: 'en 模板删掉 {up6}', expect: 'RED', mut: () => ({ en: (t) => replaceOnce(t, EN_SNAP, EN_SNAP.replace('{up6}', ''), 'M2') }) },
  { id: 'M2b', desc: 'zh 模板删掉 {up6}', expect: 'RED', mut: () => ({ zh: (t) => replaceOnce(t, ZH_SNAP, ZH_SNAP.replace('{up6}', ''), 'M2b') }) },
  { id: 'M8', desc: 'en 模板多一个 {bogus}', expect: 'RED', mut: () => ({ en: (t) => replaceOnce(t, EN_SNAP, EN_SNAP + ' {bogus}', 'M8') }) },
  { id: 'M10', desc: 'zh 模板多一个 {bogus}', expect: 'RED', mut: () => ({ zh: (t) => replaceOnce(t, ZH_SNAP, ZH_SNAP + ' {bogus}', 'M10') }) },
  { id: 'M5', desc: 'param 值没出现在兜底里（载荷 up12→999）', expect: 'RED', mut: () => ({ src: (t) => replaceOnce(t, '"up12":"325"', '"up12":"999"', 'M5') }) },
  { id: 'M6', desc: 'locale 键缺失（删 en 的 snapshot 键）', expect: 'RED', mut: () => ({ en: (t) => replaceOnce(t, '  "calc_out.article_freshness.row.snapshot": "' + EN_SNAP + '",\n', '', 'M6') }) },
  { id: 'M4', desc: '源码 params 删 {up12}（模板不动）', expect: 'RED', mut: () => ({ src: (t) => replaceOnce(replaceOnce(t, SRC_PARAM_ANCHOR, SRC_PARAM_MUT, 'M4a'), SRC_PAYLOAD_ANCHOR, SRC_PAYLOAD_MUT, 'M4b') }) },
  { id: 'M3', desc: '源码 params 删 {up12} + en 模板冻结为 325', expect: 'RED', mut: () => ({ src: (t) => replaceOnce(replaceOnce(t, SRC_PARAM_ANCHOR, SRC_PARAM_MUT, 'M3a'), SRC_PAYLOAD_ANCHOR, SRC_PAYLOAD_MUT, 'M3b'), en: (t) => replaceOnce(t, EN_SNAP, EN_SNAP.replace('{up12}', '325'), 'M3c') }) },
  { id: 'M9', desc: '源码 params 删 {up12} + en/zh 模板都冻结为 325（原假绿逃逸）', expect: 'RED', mut: () => ({ src: (t) => replaceOnce(replaceOnce(t, SRC_PARAM_ANCHOR, SRC_PARAM_MUT, 'M9a'), SRC_PAYLOAD_ANCHOR, SRC_PAYLOAD_MUT, 'M9b'), en: (t) => replaceOnce(t, EN_SNAP, EN_SNAP.replace('{up12}', '325'), 'M9c'), zh: (t) => replaceOnce(t, ZH_SNAP, ZH_SNAP.replace('{up12}', '325'), 'M9d') }) },
];

function apply(mut) {
  restore();
  const m = mut();
  if (m.en) writeFileSync(resolve(SHADOW, FILES.en), m.en(PRISTINE.en), 'utf8');
  if (m.zh) writeFileSync(resolve(SHADOW, FILES.zh), m.zh(PRISTINE.zh), 'utf8');
  if (m.src) writeFileSync(resolve(SHADOW, FILES.src), m.src(PRISTINE.src), 'utf8');
}

export function run() {
  const r = spawnSync(
    process.execPath,
    ['--import', 'tsx', 'tests/scripts/p168-b315-params-coverage.mjs'],
    { cwd: SHADOW, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 },
  );
  const out = (r.stdout || '') + (r.stderr || '');
  const aFail = (out.match(/A段\(静态\)=FAIL/g) || []).length;
  const bFail = (out.match(/B段\(扰动\)=FAIL/g) || []).length;
  const rows = (out.match(/—— (\d+) 行/) || [])[1] || '?';
  const viol = (out.match(/违规 (\d+) 条/) || [])[1] || '?';
  return { exit: r.status, aFail, bFail, rows, viol };
}

if (resolve(process.argv[1] ?? '') === resolve(import.meta.filename)) {
  setup();
  loadPristine();
  const rows = [];
  let bad = 0;
  for (const sc of SCENARIOS) {
    apply(sc.mut);
    const res = run();
    const got = res.exit === 0 ? 'GREEN' : 'RED';
    const ok = got === sc.expect;
    if (!ok) bad++;
    rows.push({ id: sc.id, desc: sc.desc, expect: sc.expect, got, ...res, ok });
    console.log(
      [sc.id, got, sc.expect === got ? '✓' : '✗', 'exit=' + res.exit, '违规=' + res.viol,
        'A段FAIL=' + res.aFail, 'B段FAIL=' + res.bFail, sc.desc].join(' | '),
    );
  }
  const outDir = resolve(REPO, 'tmp');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'p168-b315-mutation-results.json'), JSON.stringify(rows, null, 1), 'utf8');
  console.log('\n—— ' + rows.length + ' 个变异 · 与期望不符 ' + bad + ' 个');
  console.log('shadow repo:', SHADOW);
  process.exit(bad === 0 ? 0 : 1);
}

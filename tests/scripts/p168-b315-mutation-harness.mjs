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

// —— M11 的锚点（tip 行 · **比例型** param stale_pct = stale/total）——
//   EN/ZH 模板里 {stale_pct} 各只出现一次（en.json / zh.json 各 559 行）；
//   源码里 { stale_pct: stalePctLabel }, 只出现在 generate() 的 makeToken 调用（customFn 里是压缩过的 {stale_pct:M}），
//   静态载荷 {"stale_pct":"35"} 也只出现一次 ⇒ 全部可安全 replaceOnce。
const EN_TIP_ANCHOR = '{stale_pct}% of KB has wrong info';
const ZH_TIP_ANCHOR = '{stale_pct}% 的内容是客户照着做却仍出错的信息';
const SRC_TIP_PARAM_ANCHOR = '{ stale_pct: stalePctLabel },';
const SRC_TIP_PAYLOAD_ANCHOR = '{"stale_pct":"35"}';

export const SCENARIOS = [
  { id: 'M0', desc: '未变异基线', expect: 'GREEN', expectFailRows: [], mut: () => ({}) },
  { id: 'M1', desc: 'en 模板冻结 {up12}→325（params 仍在）', expect: 'RED', expectFailRows: ['article_freshness|snapshot'], mut: () => ({ en: (t) => replaceOnce(t, EN_SNAP, EN_SNAP.replace('{up12}', '325'), 'M1') }) },
  { id: 'M2', desc: 'en 模板删掉 {up6}', expect: 'RED', expectFailRows: ['article_freshness|snapshot'], mut: () => ({ en: (t) => replaceOnce(t, EN_SNAP, EN_SNAP.replace('{up6}', ''), 'M2') }) },
  { id: 'M2b', desc: 'zh 模板删掉 {up6}', expect: 'RED', expectFailRows: ['article_freshness|snapshot'], mut: () => ({ zh: (t) => replaceOnce(t, ZH_SNAP, ZH_SNAP.replace('{up6}', ''), 'M2b') }) },
  { id: 'M8', desc: 'en 模板多一个 {bogus}', expect: 'RED', expectFailRows: ['article_freshness|snapshot'], mut: () => ({ en: (t) => replaceOnce(t, EN_SNAP, EN_SNAP + ' {bogus}', 'M8') }) },
  { id: 'M10', desc: 'zh 模板多一个 {bogus}', expect: 'RED', expectFailRows: ['article_freshness|snapshot'], mut: () => ({ zh: (t) => replaceOnce(t, ZH_SNAP, ZH_SNAP + ' {bogus}', 'M10') }) },
  { id: 'M5', desc: 'param 值没出现在兜底里（载荷 up12→999）', expect: 'RED', expectFailRows: ['article_freshness|snapshot'], mut: () => ({ src: (t) => replaceOnce(t, '"up12":"325"', '"up12":"999"', 'M5') }) },
  { id: 'M6', desc: 'locale 键缺失（删 en 的 snapshot 键）', expect: 'RED', expectFailRows: ['article_freshness|snapshot'], mut: () => ({ en: (t) => replaceOnce(t, '  "calc_out.article_freshness.row.snapshot": "' + EN_SNAP + '",\n', '', 'M6') }) },
  { id: 'M4', desc: '源码 params 删 {up12}（模板不动）', expect: 'RED', expectFailRows: ['article_freshness|snapshot'], mut: () => ({ src: (t) => replaceOnce(replaceOnce(t, SRC_PARAM_ANCHOR, SRC_PARAM_MUT, 'M4a'), SRC_PAYLOAD_ANCHOR, SRC_PAYLOAD_MUT, 'M4b') }) },
  { id: 'M3', desc: '源码 params 删 {up12} + en 模板冻结为 325', expect: 'RED', expectFailRows: ['article_freshness|snapshot'], mut: () => ({ src: (t) => replaceOnce(replaceOnce(t, SRC_PARAM_ANCHOR, SRC_PARAM_MUT, 'M3a'), SRC_PAYLOAD_ANCHOR, SRC_PAYLOAD_MUT, 'M3b'), en: (t) => replaceOnce(t, EN_SNAP, EN_SNAP.replace('{up12}', '325'), 'M3c') }) },
  { id: 'M9', desc: '源码 params 删 {up12} + en/zh 模板都冻结为 325（原假绿逃逸）', expect: 'RED', expectFailRows: ['article_freshness|snapshot'], mut: () => ({ src: (t) => replaceOnce(replaceOnce(t, SRC_PARAM_ANCHOR, SRC_PARAM_MUT, 'M9a'), SRC_PAYLOAD_ANCHOR, SRC_PAYLOAD_MUT, 'M9b'), en: (t) => replaceOnce(t, EN_SNAP, EN_SNAP.replace('{up12}', '325'), 'M9c'), zh: (t) => replaceOnce(t, ZH_SNAP, ZH_SNAP.replace('{up12}', '325'), 'M9d') }) },
  // ⭐⭐ M11 —— **比例型 param · 保比扰动盲区**（2026-11-25 复审 I-1 的核心复现）
  //   语义：源码删掉 tip 行的 stale_pct param（generate() 的 makeToken params + 静态载荷）
  //        + en/zh 模板把 {stale_pct} 冻结成字面量 35
  //   ⇒ 旧的**保比**扰动集（所有正数输入统一 ×3+1 ⇒ 分子分母**同步**放大 ⇒ stale/total 不变）
  //      **抓不到** ⇒ 假绿逃逸；新的**逐参数独立扰动**必须抓到。
  //   ⭐ 必须由 **B 段（扰动自检）** 抓到 —— 不能只靠 A 段：
  //      A 段只比「占位符集合 vs params 键集合」；删掉 param + 冻结占位符后两边都是空集 ⇒ A 段必然放行
  //      ⇒ 期望的失败行是 **article_freshness|tip**（不是 snapshot），且该行 **B段(扰动)=FAIL**。
  { id: 'M11', desc: '比例型 param · 保比扰动盲区：源码删 tip 行 stale_pct param + en/zh 模板把 {stale_pct} 冻结为 35', expect: 'RED', expectFailRows: ['article_freshness|tip'], expectBFail: true, mut: () => ({
      src: (t) => replaceOnce(replaceOnce(t, SRC_TIP_PARAM_ANCHOR, '', 'M11a'), SRC_TIP_PAYLOAD_ANCHOR, '', 'M11b'),
      en: (t) => replaceOnce(t, EN_TIP_ANCHOR, EN_TIP_ANCHOR.replace('{stale_pct}', '35'), 'M11c'),
      zh: (t) => replaceOnce(t, ZH_TIP_ANCHOR, ZH_TIP_ANCHOR.replace('{stale_pct}', '35'), 'M11d'),
    }) },
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
  // ⭐ **精确红 1 条** —— 按断言**标题身份**核对（不是只数条数）：
  //   失败行 = 输出里以 'FAIL | ' 开头的行 ⇒ 身份 = '别名|行类型'（如 article_freshness|tip）
  //   + 该行是被 **A 段（静态核对）** 还是 **B 段（扰动自检）** 抓到的
  const failRows = (out.match(/^FAIL \| .*$/gm) || []).map((line) => {
    const parts = line.split(' | ');
    return {
      id: (parts[1] ?? '?') + '|' + (parts[2] ?? '?'),
      a: /A段\(静态\)=FAIL/.test(line),
      b: /B段\(扰动\)=FAIL/.test(line),
    };
  });
  return { exit: r.status, aFail, bFail, rows, viol, failRows };
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
    // ⭐ 精确红 1 条：失败行的**身份集合**必须与期望**完全一致**（不多不少）
    const gotIds = res.failRows.map((r) => r.id).sort();
    const wantIds = (sc.expectFailRows ?? []).slice().sort();
    const idsOk = JSON.stringify(gotIds) === JSON.stringify(wantIds);
    // B 段必须抓到（场景显式要求时 —— 见 M11）
    const bOk = sc.expectBFail ? res.failRows.some((r) => r.b) : true;
    const rowOk = ok && idsOk && bOk;
    if (!rowOk) bad++;
    rows.push({ id: sc.id, desc: sc.desc, expect: sc.expect, got, ...res, ok: rowOk, idsOk, bOk });
    console.log(
      [sc.id, got, sc.expect === got ? '✓' : '✗', 'exit=' + res.exit, '违规=' + res.viol,
        'A段FAIL=' + res.aFail, 'B段FAIL=' + res.bFail,
        '失败行=' + (gotIds.join('、') || '（无）'),
        '身份核对=' + (idsOk ? '✓' : '✗'),
        'B段抓到=' + (sc.expectBFail ? (bOk ? '✓' : '✗') : '—'),
        sc.desc].join(' | '),
    );
  }
  const outDir = resolve(REPO, 'tmp');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'p168-b315-mutation-results.json'), JSON.stringify(rows, null, 1), 'utf8');
  console.log('\n—— ' + rows.length + ' 个变异 · 与期望不符 ' + bad + ' 个');
  console.log('shadow repo:', SHADOW);
  process.exit(bad === 0 ? 0 : 1);
}

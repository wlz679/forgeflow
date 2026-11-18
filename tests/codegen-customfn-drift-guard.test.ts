#!/usr/bin/env node
// P50 drift guard —— scripts/codegen-customfn.mjs 的结构 + 集成不变量。
//
// P168 B3-10 之后的形态（为什么这个守卫要重写）
// ------------------------------------------------
// 旧版：codegen 只重生成 customFn 里的**数据表**（`var M={…}`），逻辑是手抄的镜像。
//   ⇒ 服务端一升级客户端就跟不上 ⇒ B3-10 实测全仓欠账 61 条。
// 现在：客户端 customFn **整段**由服务端代码派生（scripts/customfn-port.ts）。
//   ⇒ 「数据表」与「逻辑」不再分家，codegen 也就不再需要 marker 去找表区。
//   ⇒ 旧的 T1/T2/T3/T5（找 FAMILY_SHORT / ICON / fmt / tableEndMarker）全部失去对象，
//     换成**更强**的不变量（下面 7 条）。
//
// 本守卫盯住这些失败模式（一条断言只守一件事）：
//   T1 — codegen 走的是「派生」通路（调 scripts/customfn-port.ts），不是「就地改表」
//   T2 — codegen 里**一个模型 key 都不许写死**（交互集只能有一个真相源）
//   T3 — codegen 里**没有第二个数字格式化器**（价格格式只能来自服务端）
//   T4 — 每个带 customFn 的引擎都会被 codegen 处理（没有漏网的）
//   T5 — 每个 AI-cost 引擎的客户端 customFn 都是**服务端派生**的（带派生标记）
//   T6 — `codegen-customfn.mjs --check` exit 0 + "No drift detected"
//   T7 — `codegen-customfn.mjs`（重跑）no-op：0 updated + 文件内容不变
//
// ⚠️ 期望值全部是本文件里**独立写死**的字面量，不是从被测模块导出的常量。
// Build dependency: none (source-only).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const SCRIPT_PATH = path.join(ROOT, 'scripts', 'codegen-customfn.mjs');
const PORTER_PATH = path.join(ROOT, 'scripts', 'customfn-port.ts');
const AI_COST_DIR = path.join(ROOT, 'src', 'engines', 'ai-cost');
const ENGINES_DIR = path.join(ROOT, 'src', 'engines');
const POPULAR_PATH = path.join(ROOT, 'src', 'data', 'ai-pricing-popular.json');

// === Load SCRIPT_SOURCE once ===
const SCRIPT_SOURCE = fs.readFileSync(SCRIPT_PATH, 'utf8');

/**
 * ⭐ 独立 AST 扫描：一个源文件里有几个 customFn **取值**。
 *   （`clientConfig: { ..., customFn }` 这种简写引用不算 —— 它没有自己的值。）
 *   ⚠️ 必须**独立**于移植器实现：守卫若复用移植器的扫描函数，
 *   移植器一旦漏扫，守卫会跟着一起瞎 ⇒ 真空绿。
 */
function customFnValueCount(src: string, file: string): number {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let n = 0;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'customFn' && node.initializer) n++;
    else if (ts.isPropertyAssignment(node) && node.name.getText() === 'customFn' && node.initializer) n++;
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return n;
}

// === T1: the codegen delegates to the porter ===
test('T1: codegen-customfn.mjs delegates to scripts/customfn-port.ts', () => {
  assert.ok(
    fs.existsSync(PORTER_PATH),
    'scripts/customfn-port.ts is missing — the client customFn has no generator.',
  );
  assert.match(
    SCRIPT_SOURCE,
    /customfn-port\.ts/,
    'codegen-customfn.mjs does not reference scripts/customfn-port.ts — the client customFn has no generator.',
  );
  assert.doesNotMatch(
    SCRIPT_SOURCE,
    /tableEndMarker|tableStart/,
    'codegen-customfn.mjs still patches the customFn table in place via markers.',
  );
});

// === T2: no generator script holds a copy of the interactive model set ===
//
// ⚠️ P168 B3-10：白名单不再由 codegen 持有（它整段委派给移植器）⇒
//   「某处偷偷写了一份模型清单」的新家是**移植器** ⇒ 两个文件都要查。
test('T2: neither the codegen nor the porter hard-codes a model key (one truth source for the interactive set)', () => {
  const popular = JSON.parse(fs.readFileSync(POPULAR_PATH, 'utf8'));
  const keys = new Set<string>();
  for (const list of Object.values(popular.popularModelKeys as Record<string, string[]>)) {
    for (const k of list) keys.add(k);
  }
  for (const list of Object.values(popular.excludedModelKeys as Record<string, string[]>)) {
    for (const k of list) keys.add(k);
  }
  for (const k of Object.values(popular.comparisonFlagshipKeys as Record<string, string>)) keys.add(k);
  assert.ok(keys.size > 100, `expected the dataset to carry many model keys, got ${keys.size}`);
  const porterSource = fs.readFileSync(PORTER_PATH, 'utf8');
  const offenders: string[] = [];
  for (const k of keys) {
    if (SCRIPT_SOURCE.indexOf(k) >= 0) offenders.push('codegen-customfn.mjs :: ' + k);
    if (porterSource.indexOf(k) >= 0) offenders.push('customfn-port.ts :: ' + k);
  }
  assert.equal(
    offenders.length,
    0,
    `these model key(s) are hard-coded in a generator script: ${offenders.slice(0, 5).join(', ')}` +
      ` — the interactive set must have exactly ONE truth source (src/data/ai-pricing-popular.json).`,
  );
});

// === T3: no second number formatter in the codegen ===
test('T3: codegen-customfn.mjs has no second number formatter', () => {
  assert.doesNotMatch(
    SCRIPT_SOURCE,
    /toFixed|function fmt/,
    'codegen-customfn.mjs formats numbers itself — a second formatter is a second source of price formatting.',
  );
});

// === T4: every engine with a customFn is processed ===
test('T4: every engine with a customFn is processed by the codegen', () => {
  function walk(dir: string, acc: string[]): string[] {
    for (const entry of fs.readdirSync(dir)) {
      const p = path.join(dir, entry);
      if (fs.statSync(p).isDirectory()) walk(p, acc);
      else if (entry.endsWith('.ts')) acc.push(p);
    }
    return acc;
  }
  const withCustomFn = walk(ENGINES_DIR, []).filter((f) => fs.readFileSync(f, 'utf8').includes('customFn'));
  assert.ok(withCustomFn.length > 0, 'no engine file mentions customFn at all — the scan is broken');
  const result = spawnSync(process.execPath, [path.join('scripts', 'codegen-customfn.mjs'), '--check'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  // ⭐ 数的是**逐个引擎的结果行**，不是脚本自己报的总数 ——
  //   「脚本说它处理了 100 个」≠「它真的处理了 100 个」⇒ 后者才是静默跳过的入口。
  const processed = (result.stdout || '')
    .split(String.fromCharCode(10))
    .filter((l) => l.indexOf('src/engines/') >= 0)
    .length;
  assert.equal(
    processed,
    withCustomFn.length,
    `the codegen processed ${processed} engine(s) but ${withCustomFn.length} engine file(s) carry a customFn.`,
  );
});

// === T5: every customFn in every engine is server-derived (provenance marker) ===
//
// ⚠️ 口径说明（三条都是实测踩出来的）：
//   ① 标记必须挂在**压缩之后** —— esbuild 会吃掉注释 ⇒ 挂在压缩前会消失（守卫假红）。
//   ② 不能只查「文件里有没有标记」—— 有的引擎有**两处** customFn：
//      对象字面量里的占位 + 真正生效的那个（后者由 `engine.clientConfig = {...}` 覆盖）。
//      只改一处 = 改了**死代码** ⇒ 线上仍在跑手抄镜像 ⇒ 照样会漂。
//   ⇒ 这里用**独立 AST 扫描**数出每个引擎有几个 customFn 取值，
//      再要求标记数与之相等 ⇒ 任何一处漏改都会红。
test('T5: every customFn in every engine carries the server-derived provenance marker', () => {
  function walk(dir: string, acc: string[]): string[] {
    for (const entry of fs.readdirSync(dir)) {
      const p = path.join(dir, entry);
      if (fs.statSync(p).isDirectory()) walk(p, acc);
      else if (entry.endsWith('.ts')) acc.push(p);
    }
    return acc;
  }
  const START = 'FFK-SERVER-DERIVED:start';
  const END = 'FFK-SERVER-DERIVED:end';
  const bad: string[] = [];
  let engines = 0;
  let exprs = 0;
  for (const f of walk(ENGINES_DIR, [])) {
    const content = fs.readFileSync(f, 'utf8');
    if (!content.includes('customFn')) continue;
    engines++;
    const want = customFnValueCount(content, f);
    const starts = content.split(START).length - 1;
    const ends = content.split(END).length - 1;
    exprs += want;
    if (want === 0 || starts !== want || ends !== want) {
      bad.push(`${path.relative(ROOT, f)}: ${starts} start / ${ends} end marker(s) for ${want} customFn expression(s)`);
    }
  }
  assert.ok(engines > 0, 'no engine file mentions customFn at all — the scan is broken');
  assert.equal(
    bad.length,
    0,
    `these engine(s) do NOT carry the server-derived marker on every customFn:\n  ${bad.join('\n  ')}\n` +
      `  A hand-mirrored client customFn drifts again the moment the server changes.`,
  );
  assert.ok(exprs >= engines, `expected at least one customFn per engine, got ${exprs}/${engines}`);
});

// === T6: --check exits 0 ===
test('T6: codegen-customfn.mjs --check exits 0 with "No drift detected"', () => {
  const result = spawnSync(process.execPath, [path.join('scripts', 'codegen-customfn.mjs'), '--check'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(
    result.status,
    0,
    `codegen-customfn --check exited ${result.status}. stderr: ${result.stderr || '(empty)'}`
  );
  assert.match(
    result.stdout,
    /No drift detected/,
    `Expected "No drift detected" in stdout. Got: ${result.stdout}`
  );
});

// === T7: rerun is a no-op ===
test('T7: codegen-customfn.mjs rerun writes 0 files (idempotent)', () => {
  const aiCostFiles = fs.readdirSync(AI_COST_DIR).filter((f) => f.endsWith('.ts') && f !== 'index.ts');
  const backup = new Map<string, string>();
  for (const f of aiCostFiles) backup.set(f, fs.readFileSync(path.join(AI_COST_DIR, f), 'utf8'));

  try {
    const result = spawnSync(process.execPath, [path.join('scripts', 'codegen-customfn.mjs')], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(
      result.status,
      0,
      `codegen-customfn exited ${result.status}. stderr: ${result.stderr || '(empty)'}`,
    );
    assert.match(
      result.stdout,
      /Done\. 0 engine\(s\) updated\./,
      `Expected "Done. 0 engine(s) updated." (state should already be in sync). Got: ${result.stdout}`,
    );
    for (const f of aiCostFiles) {
      const after = fs.readFileSync(path.join(AI_COST_DIR, f), 'utf8');
      assert.equal(
        after,
        backup.get(f),
        `${f} content drifted during rerun. Backup != disk after spawn.`,
      );
    }
  } finally {
    for (const [f, content] of backup) {
      const current = fs.readFileSync(path.join(AI_COST_DIR, f), 'utf8');
      if (current !== content) fs.writeFileSync(path.join(AI_COST_DIR, f), content);
    }
  }
});

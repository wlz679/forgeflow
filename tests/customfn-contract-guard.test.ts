#!/usr/bin/env node
// P164: customFn 的**浏览器真实路径**守卫。
//
// 为什么存在这个守卫
// ------------------
// 2026-11-02 的一次全量体检发现：**100 个计算器里有 33 个的「计算」按钮在生产里是坏的**。
// 静态示例是服务端渲染的，所以页面「看着正常」；只有用户真的去点「计算」才会炸。
//
// ⚠️ **「33」是可复算的，不是估的**：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/contract-scan-at-ref.ts HEAD
// 该工具把任意 git ref 的 src/ 树抽出来跑同一套三段检查 ⇒ 任何人都能自己数一遍。
//   HEAD（= P163，修复前）：体检通过 67 / 100，坏掉 33。
//   WORKTREE（修复后）  ：体检通过 100 / 100，坏掉 0。
//
// 页面的真实调用路径（src/pages/[lang]/[slug].astro:1425-1429）：
//
//   function generateFromConfig(config, inputs) {
//     if (config.type === 'custom' && config.customFn) {
//       var fn = new Function('inputs', 'pick', 'fill', config.customFn);
//       return fn(inputs, pick, fill);      // ← 直接调用函数体
//     }
//     ...
//   }
//
// ⇒ customFn 是**函数体**，不是「run 函数」：它必须自己执行并返回结果。
//
// 实测到的 5 类失败模式（每类都真实发生过，不是假想；计数取自上面那个工具在 HEAD 上的输出）
// ----------------------------------------------------------------------------------------
//   M1 语法非法：customFn 正文里出现了**落在单引号 JS 字符串内部的真换行**
//      （引擎文件里写 `\n`，被双引号 TS 字面量 / 模板字面量解码成真换行）
//      ⇒ new Function 抛 "Invalid or unexpected token" —— 7 个引擎
//   M2 非法 Unicode 转义：`\u4e` 这种少 2 位十六进制的转义
//      ⇒ new Function 抛 "Invalid Unicode escape sequence" —— rent-vs-buy（1 个）
//   M3 只定义 run() 不调用：body 里写了 `function run(inputs,pick,fill){…}`
//      却没在顶层调用 ⇒ fn(...) 返回 undefined ⇒ 页面 `results[0]` 抛 TypeError
//      —— 21 个引擎（K/P/H/T 四个分类整整齐齐）
//   M4 返回值形状不对：results[0] 是数字 / 对象而不是字符串
//      ⇒ 页面 esc() 抛 TypeError —— grr / expansion-revenue / logo-churn（3 个）
//   M5 执行期引用未定义变量：`ratio is not defined` —— ai-api-cost-comparison（1 个）
//
// ⇒ 7 + 1 + 21 + 3 + 1 = **33 个引擎**，与工具输出一致。
//
// 为什么必须用**真值**而不是源码提取器
// ----------------------------------
// 上一批 CI 一直是绿的，因为 `scripts/codegen-examples.mjs` 的 customFn 提取器
// 有解码 bug：只处理 `\uXXXX`，其它转义一律 `cur += c`（丢掉反斜杠保留字母）
// ⇒ `\n` 被读成字母 `n` ⇒ 它测的根本不是浏览器执行的那份东西。
// 本守卫直接取 `getAllEngines()` 里的**真实** `clientConfig.customFn`，
// 不做任何源码解析 ⇒ 守卫测的和浏览器跑的是同一份字符串。
//
// source-only：不依赖构建产物，所以 `pnpm check` 也会跑它。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EXPECTED_ENGINE_COUNT } from './engine-count.ts';

const root = resolve(import.meta.dirname, '..');
const SLUG_PAGE = resolve(root, 'src', 'pages', '[lang]', '[slug].astro');

// —— 浏览器里那两个 helper 的原样实现（astro:1423-1424）——
function pick(arr: unknown[]): unknown {
  return arr[Math.floor(Math.random() * arr.length)];
}
function fill(t: string, v: Record<string, string>): string {
  return t.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '{' + k + '}');
}

/** 加载全部引擎（index.ts 会 import 所有引擎文件，触发 registerEngine）。 */
let enginesPromise: Promise<any[]> | null = null;
function loadEngines(): Promise<any[]> {
  // 不写 top-level await：tsx 在 CJS 模式下不支持它。
  if (!enginesPromise) {
    enginesPromise = (async () => {
      await import('../src/engines/index.ts');
      const { getAllEngines } = await import('../src/core/engines/registry.ts');
      return getAllEngines() as any[];
    })();
  }
  return enginesPromise;
}

/**
 * 按引擎**自己声明的 inputs** 造一份贴近真实的输入。
 *
 * 为什么不用「所有 key 都返回同一个值」的 Proxy：那会让 select 型输入拿到
 * 根本不存在的取值（实测 sponsorship-rate-calculator 会因为
 * `platforms.find(...)` 找不到而抛 TypeError）—— 那是测试自己造的假故障。
 * 这里按声明的 type 给值：number → '1000'，select → options[0]，其余 → 'SaaS'。
 */
function syntheticInputs(engine: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const input of engine.inputs ?? []) {
    if (input.type === 'number') {
      out[input.name] = '1000';
    } else if (input.type === 'select' && Array.isArray(input.options) && input.options.length > 0) {
      const first = input.options[0];
      out[input.name] = typeof first === 'object' && first !== null ? (first.value ?? first.label) : first;
    } else {
      out[input.name] = 'SaaS';
    }
  }
  return out;
}

test('C0: 覆盖面 —— 每个引擎的 customFn 都进入本守卫（不得有引擎悄悄逃过检查）', async () => {
  const engines = await loadEngines();
  const withCustomFn = engines.filter(
    (e) => typeof e.clientConfig?.customFn === 'string' && e.clientConfig.customFn.length > 0,
  );
  assert.equal(
    engines.length,
    EXPECTED_ENGINE_COUNT,
    `registry has ${engines.length} engines but EXPECTED_ENGINE_COUNT=${EXPECTED_ENGINE_COUNT}.`,
  );
  assert.equal(
    withCustomFn.length,
    engines.length,
    `${engines.length - withCustomFn.length} engine(s) have no clientConfig.customFn and therefore ` +
      'escape this guard entirely.\n' +
      engines
        .filter((e) => !(typeof e.clientConfig?.customFn === 'string' && e.clientConfig.customFn.length > 0))
        .map((e) => `    ${e.slug} (clientConfig.type=${e.clientConfig?.type})`)
        .join('\n'),
  );
});

test('M1/M2: 每个 customFn 都必须能被 new Function 解析（真换行 / 非法 Unicode 转义会在这里炸）', async () => {
  const withCustomFn = await loadEngines().then((all) =>
    all.filter((e) => typeof e.clientConfig?.customFn === 'string' && e.clientConfig.customFn.length > 0),
  );
  const failures: string[] = [];
  for (const e of withCustomFn) {
    try {
      new Function('inputs', 'pick', 'fill', e.clientConfig.customFn);
    } catch (err: any) {
      failures.push(`    ${e.slug}: ${err.message}`);
    }
  }
  assert.deepEqual(
    failures,
    [],
    'these customFn bodies do not parse as valid JS — the browser throws before any ' +
      'calculation happens.\n' + failures.join('\n'),
  );
});

test('M3: 只定义 run() 却不调用的 body 必须被抓住（顶层必须有 run(inputs,…) 的调用）', async () => {
  const withCustomFn = await loadEngines().then((all) =>
    all.filter((e) => typeof e.clientConfig?.customFn === 'string' && e.clientConfig.customFn.length > 0),
  );
  const failures: string[] = [];
  for (const e of withCustomFn) {
    const body: string = e.clientConfig.customFn;
    if (!/function\s+run\s*\(/.test(body)) continue;
    if (!/\brun\s*\(\s*inputs\b/.test(body)) {
      failures.push(`    ${e.slug}: defines run() but never calls it at the top level`);
    }
  }
  assert.deepEqual(
    failures,
    [],
    'the page calls new Function(...) directly (fn(inputs,pick,fill)), so a body that ' +
      'only defines run() returns undefined and the page throws on results[0].\n' +
      failures.join('\n'),
  );
});

test('M4/M5: 每个 customFn 用空输入执行都不得抛异常，且必须返回非空字符串数组', async () => {
  const withCustomFn = await loadEngines().then((all) =>
    all.filter((e) => typeof e.clientConfig?.customFn === 'string' && e.clientConfig.customFn.length > 0),
  );
  const failures: string[] = [];
  for (const e of withCustomFn) {
    const body: string = e.clientConfig.customFn;
    let fn: any;
    try {
      fn = new Function('inputs', 'pick', 'fill', body);
    } catch {
      continue; // M1 已经报了，这里不重复
    }
    for (const [label, inputs] of [
      ['empty inputs', {} as Record<string, unknown>],
      ['declared inputs', syntheticInputs(e)],
    ] as const) {
      let out: unknown;
      try {
        out = fn(inputs, pick, fill);
      } catch (err: any) {
        failures.push(`    ${e.slug} [${label}]: threw ${err.name}: ${err.message}`);
        continue;
      }
      if (!Array.isArray(out)) {
        failures.push(`    ${e.slug} [${label}]: returned ${out === undefined ? 'undefined' : typeof out}, expected a string[]`);
        continue;
      }
      if (out.length === 0) {
        failures.push(`    ${e.slug} [${label}]: returned an empty array`);
        continue;
      }
      // 页面只渲染 results[0]（astro:2070-2071），所以 [0] 必须是非空字符串。
      // 其余元素只是分隔用的空行 —— 允许空串，但必须是字符串。
      if (typeof out[0] !== 'string') {
        failures.push(`    ${e.slug} [${label}]: results[0] is ${typeof out[0]}, expected string`);
        continue;
      }
      if ((out[0] as string).trim() === '') {
        failures.push(`    ${e.slug} [${label}]: results[0] is an empty string`);
        continue;
      }
      const bad = out.findIndex((x) => typeof x !== 'string');
      if (bad >= 0) {
        failures.push(`    ${e.slug} [${label}]: element #${bad} is ${typeof out[bad]}, expected string`);
      }
    }
  }
  assert.deepEqual(
    failures,
    [],
    'these customFn bodies fail the browser\'s actual contract: the page renders ' +
      'results[0] and escapes it as HTML, so the return value must be a non-empty ' +
      'array of non-empty strings.\n' + failures.join('\n'),
  );
});

test('C1: 页面必须仍然直接调用 new Function 出来的函数体（契约锚点）', () => {
  const page = readFileSync(SLUG_PAGE, 'utf8');
  assert.match(
    page,
    /new Function\(\s*'inputs'\s*,\s*'pick'\s*,\s*'fill'\s*,\s*config\.customFn\s*\)/,
    'the page must still build the calculator from config.customFn via new Function — ' +
      'if this changes, the "the body must self-execute" contract has to be revisited ' +
      'for every engine at the same time.',
  );
  assert.match(
    page,
    /return\s+fn\(\s*inputs\s*,\s*pick\s*,\s*fill\s*\)/,
    'the page must still call the built function directly (not fn.run(...)) — otherwise ' +
      'the 24 P12-1-style engine bodies that only define run() would still be dead.',
  );
});

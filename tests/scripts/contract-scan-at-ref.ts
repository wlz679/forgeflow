#!/usr/bin/env node
// P164 —— **交互态契约体检器（可对任意 git ref 复现）**。
//
// 为什么需要它
// ------------
// P164 发现：100 个计算器里有 **33 个**的「计算」按钮在生产里是坏的（详见
// `tests/customfn-contract-guard.test.ts` 的文件头注释）。那个「33」必须**可复算**，
// 否则半年后没人能对上一份账 —— 而它恰恰是本批最刺眼的那个数。
//
// 它测的是什么（页面的真实调用路径）
// ----------------------------------
//   src/pages/[lang]/[slug].astro 的 generateFromConfig：
//     var fn = new Function('inputs','pick','fill', config.customFn);
//     return fn(inputs, pick, fill);          ← 直接调用函数体，不调 run()
//
// ⇒ customFn 是**函数体**：它必须自己执行，并返回**非空字符串数组**
//   （页面只渲染 results[0] 并对它做 HTML 转义）。
//
// 怎么用
// ------
//   node node_modules/tsx/dist/cli.mjs tests/scripts/contract-scan-at-ref.ts            # 默认 HEAD
//   node node_modules/tsx/dist/cli.mjs tests/scripts/contract-scan-at-ref.ts f975915    # 任意 ref
//   node node_modules/tsx/dist/cli.mjs tests/scripts/contract-scan-at-ref.ts WORKTREE  # 当前工作区
//
// 做法：把该 ref 的 `src/` 树原样抽到临时目录，在副本里跑同一套三段检查
//   （parse / exec / shape）⇒ **同一份测量逻辑**可以比对任意两个 ref。
// 引擎全部只用相对导入（已 grep 确认无 bare import）⇒ 副本可独立运行，
// node_modules 由仓库根目录向上查找即可解析。
//
// 注意：**不是**套件。文件名不含 `.test.ts` / `.test.mjs` ⇒ `tests/build-dep-suites.mjs`
// 的 `walkTestSuites` 不会把它收进套件计数（套件计数是 CI 的对外契约，不能随手加）。
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url)))); // repo root

/** 把 `ref` 的整棵 src/ 树抽到临时目录，返回临时目录路径。 */
function extractSrcAtRef(ref: string): string {
  const dest = mkdtempSync(join(tmpdir(), 'ffk-ref-'));
  const listing = execFileSync('git', ['ls-tree', '-r', '--name-only', ref, '--', 'src'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const paths = listing.split('\n').filter(Boolean);
  if (paths.length === 0) throw new Error(`ref "${ref}" has no src/ tree`);

  // 一次 git cat-file --batch 拿回全部内容（比逐个 git show 快一个数量级）。
  const input = paths.map((p) => `${ref}:${p}\n`).join('');
  const raw = execFileSync('git', ['cat-file', '--batch'], {
    cwd: ROOT,
    input,
    encoding: null,
    maxBuffer: 256 * 1024 * 1024,
  }) as Buffer;

  // batch 输出格式：`<sha> <type> <size>\n<content>\n` 逐条拼接。
  let offset = 0;
  for (const p of paths) {
    const nl = raw.indexOf(0x0a, offset);
    if (nl < 0) throw new Error(`unparsable cat-file output for ${p}`);
    const header = raw.subarray(offset, nl).toString('utf8');
    const size = Number(header.split(' ')[2]);
    if (!Number.isFinite(size)) throw new Error(`unparsable cat-file header for ${p}: ${header}`);
    const content = raw.subarray(nl + 1, nl + 1 + size);
    offset = nl + 1 + size + 1; // +1 跳过内容后的换行
    const outPath = join(dest, p);
    mkdirSync(dirname(outPath), { recursive: true });
    // new Uint8Array(buf) 复制成 TS lib 的 Uint8Array（@types/node 的 Buffer 与
    // lib.es2024 的 Uint8Array 在 entries() 迭代器类型上不兼容，直接传 Buffer 会 TS2769）。
    writeFileSync(outPath, new Uint8Array(content));
  }
  return dest;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const e of readdirSync(cur, { withFileTypes: true })) {
      const full = join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.name.endsWith('.ts')) out.push(full);
    }
  }
  return out;
}

// —— 浏览器里那两个 helper 的原样实现（astro:1423-1424）——
const pick = (arr: unknown[]): unknown => arr[Math.floor(Math.random() * arr.length)];
const fill = (t: string, v: Record<string, unknown>): string =>
  t.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? '{' + k + '}'));

/** 按引擎自己声明的 inputs 造一份贴近真实的输入（与守卫同一套口径）。 */
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

type Failure = { slug: string; stage: 'parse' | 'exec' | 'shape'; detail: string };

async function main(): Promise<void> {
  const ref = process.argv[2] ?? 'HEAD';
  // WORKTREE = 直接体检当前工作区（未提交的改动也看得见）。
  const inPlace = ref === 'WORKTREE';
  const dest = inPlace ? ROOT : extractSrcAtRef(ref);
  try {
    const registry = pathToFileURL(join(dest, 'src/core/engines/registry.ts')).href;
    const { getAllEngines } = (await import(registry)) as { getAllEngines: () => any[] };
    const engineFiles = walk(join(dest, 'src/engines'));
    for (const f of engineFiles) {
      try {
        await import(pathToFileURL(f).href);
      } catch (err: any) {
        console.log(`IMPORT-FAIL ${f}: ${err?.message}`);
      }
    }

    const engines = getAllEngines() as any[];
    const failures: Failure[] = [];
    let ok = 0;
    for (const eng of engines) {
      const body = eng.clientConfig?.customFn;
      if (typeof body !== 'string' || body.length === 0) continue;
      let fn: any;
      try {
        fn = new Function('inputs', 'pick', 'fill', body);
      } catch (err: any) {
        failures.push({ slug: eng.slug, stage: 'parse', detail: err?.message ?? String(err) });
        continue;
      }
      let bad = false;
      for (const [label, inputs] of [
        ['empty', {} as Record<string, unknown>],
        ['declared', syntheticInputs(eng)],
      ] as const) {
        let out: unknown;
        try {
          out = fn(inputs, pick, fill);
        } catch (err: any) {
          failures.push({ slug: eng.slug, stage: 'exec', detail: `[${label}] ${err?.message ?? err}` });
          bad = true;
          continue;
        }
        if (!Array.isArray(out)) {
          failures.push({
            slug: eng.slug,
            stage: 'shape',
            detail: `[${label}] returned ${out === undefined ? 'undefined' : typeof out}`,
          });
          bad = true;
          continue;
        }
        if (out.length === 0) {
          failures.push({ slug: eng.slug, stage: 'shape', detail: `[${label}] returned an empty array` });
          bad = true;
          continue;
        }
        if (typeof out[0] !== 'string' || (out[0] as string).trim() === '') {
          failures.push({
            slug: eng.slug,
            stage: 'shape',
            detail: `[${label}] results[0] is ${typeof out[0]}`,
          });
          bad = true;
          continue;
        }
        const badIdx = out.findIndex((x: unknown) => typeof x !== 'string');
        if (badIdx >= 0) {
          failures.push({
            slug: eng.slug,
            stage: 'shape',
            detail: `[${label}] element #${badIdx} is ${typeof out[badIdx]}`,
          });
          bad = true;
        }
      }
      if (!bad) ok++;
    }

    const brokenSlugs = [...new Set(failures.map((f) => f.slug))].sort();
    console.log(`=== customFn 交互态体检 @ ${ref} ===`);
    console.log(`引擎总数 ${engines.length}｜体检通过 ${ok}｜坏掉的引擎 ${brokenSlugs.length}`);
    const byStage = (s: Failure['stage']) => failures.filter((f) => f.stage === s);
    for (const stage of ['parse', 'exec', 'shape'] as const) {
      const list = byStage(stage);
      console.log(`\n— ${stage} (${list.length}) —`);
      for (const f of list) console.log(`   ${f.slug}: ${f.detail}`);
    }
    console.log(`\n>>> 坏掉的引擎（去重）= ${brokenSlugs.length}`);
    console.log(brokenSlugs.join('\n'));
  } finally {
    if (!inPlace) rmSync(dest, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

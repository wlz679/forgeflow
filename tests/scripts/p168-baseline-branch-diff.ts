#!/usr/bin/env node
// P168 B3-13 —— 基线 vs 现在 的分支级差分测量工具。
//
// 用法：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-baseline-branch-diff.ts
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-baseline-branch-diff.ts productivity_score
//
// 为什么需要它（G9 的盲区）：
//   G9（p168-en-page-parity.ts）只比默认输入下的 staticExamples[0]
//   ⇒ 一行里的 if/else 分支若只有非默认输入才会走到，G9 看不见
//   ⇒ 实测 B3-13 组 2 的 productivity_score 就是这么被漏掉的：
//      「工具栈健康度」三档分支里，基线只有 bloat 档以两个换行结尾，
//      令牌化时被统一成两个换行 ⇒ 默认输入（tools=5，走 optimal 档）多出一个空行。
//   ⇒ 本工具把基线提交的引擎源码与现在的源码都跑一遍，
//      逐行比每一组输入下的输出 ⇒ 分支级差异当场暴露。
//
// 做法：
//   ① git show <baseline>:<file> 取基线源码 ⇒ 改写相对 import 为绝对路径
//      ⇒ 写到 tmp/ ⇒ 用 tsx import（不 import src/engines/index.ts，
//         否则现在的引擎会先进模块缓存 ⇒ 注册表里拿到的还是基线那份）。
//   ② 基线先 import → 从注册表取基线引擎；再 import 现在源码 → 取现在引擎。
//   ③ 现在侧的输出用 renderCalcOutput(text, {}) 渲染成英文兜底 ⇒ 与基线侧同形可比。
//   ④ 输入组：codegen 默认值 + 每个输入的边界值 + 确定性伪随机组合。
//
// 判定：任何一行输出不相等 ⇒ 该引擎 FAIL。

import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { renderCalcOutput } from '../../src/lib/calc-output-i18n.ts';
import { getEngine } from '../../src/core/engines/registry.ts';
import { B3_13_BATCH } from './p168-tokenized-engines.mjs';

const NL = String.fromCharCode(10);
const REPO_ROOT = resolve(import.meta.dirname, '..', '..');
const TMP_DIR = resolve(REPO_ROOT, 'tmp', 'p168-baseline');

/** 从 scripts/codegen-examples.mjs 里解析每个引擎的 defaultInputs（与 p168-server-client-parity 同源） */
function codegenDefaults(): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  try {
    const src = readFileSync(resolve(REPO_ROOT, 'scripts', 'codegen-examples.mjs'), 'utf8');
    const i = src.indexOf('const ENGINES = [');
    if (i < 0) return out;
    const j = src.indexOf('\n];', i);
    if (j < 0) return out;
    const arr = new Function('return ' + src.slice(src.indexOf('[', i), j + 2))();
    for (const e of arr) out[e.slug] = e.defaultInputs;
  } catch {
    /* 回落空表 */
  }
  return out;
}

/** 把基线源码里的相对 import 改成绝对路径（基线文件被写到 tmp/ ⇒ 相对路径会失效） */
function absolutizeImports(src: string, fileDir: string): string {
  return src.replace(/(from\s+['"])(\.\.?\/[^'"]+)(['"])/g, (_m, a, rel, c) => {
    const abs = isAbsolute(rel) ? rel : resolve(fileDir, rel);
    return a + abs.replace(/\\/g, '/') + c;
  });
}

/** 确定性伪随机（不用 Math.random ⇒ 可复算） */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** 一组引擎的输入：默认 + 边界 + 伪随机 */
function inputSets(slug: string, engine: any, defaults: Record<string, Record<string, string>>): Record<string, string>[] {
  const names: string[] = (engine.inputs ?? []).map((i: any) => i.name);
  const base = { ...(defaults[slug] ?? {}) };
  const sets: Record<string, string>[] = [base];
  const edges = ['0', '1', '2', '3', '5', '10', '20', '50', '100', '1000', '-5', 'abc', ''];
  for (const n of names) {
    for (const v of edges) {
      const s = { ...base };
      s[n] = v;
      sets.push(s);
    }
    const del = { ...base };
    delete del[n];
    sets.push(del);
  }
  const rnd = lcg(20261119);
  const pool = ['0', '1', '2', '3', '4', '5', '7', '10', '15', '20', '25', '30', '40', '50', '75', '100', '150', '200', '500', '1000', '5000', '10000', '80000', '-3', '0.5', '12.5'];
  for (let k = 0; k < 200; k++) {
    const s: Record<string, string> = {};
    for (const n of names) {
      s[n] = pool[Math.floor(rnd() * pool.length)];
    }
    sets.push(s);
  }
  return sets;
}

function join(out: unknown): string {
  return Array.isArray(out) ? out.map(String).join(NL) : String(out);
}

export interface DiffRow {
  slug: string;
  same: boolean;
  cases: number;
  firstBad: string | null;
  detail: string[];
}

export async function diffEngine(
  slug: string,
  file: string,
  baselineSha: string,
  defaults: Record<string, Record<string, string>>,
): Promise<DiffRow> {
  const curAbs = resolve(REPO_ROOT, file);
  const curDir = dirname(curAbs);
  const baseSrc = execSync('git show ' + baselineSha + ':' + file, { encoding: 'utf8', maxBuffer: 1 << 28 });

  mkdirSync(TMP_DIR, { recursive: true });
  const tmpFile = resolve(TMP_DIR, slug + '.ts');
  writeFileSync(tmpFile, absolutizeImports(baseSrc, curDir), 'utf8');

  // 基线先 import（当前引擎模块此刻还冷 ⇒ 之后 import 它一定重新注册）
  await import(pathToFileURL(tmpFile).href);
  const baseEngine: any = getEngine(slug);
  if (!baseEngine) throw new Error('基线引擎没注册上：' + slug);

  // 现在侧 import
  await import(pathToFileURL(curAbs).href);
  const curEngine: any = getEngine(slug);
  if (!curEngine) throw new Error('现在引擎没注册上：' + slug);

  const sets = inputSets(slug, curEngine, defaults);
  const detail: string[] = [];
  let firstBad: string | null = null;

  for (let i = 0; i < sets.length; i++) {
    const inputs = sets[i];
    let a: string;
    let b: string;
    try {
      a = join((baseEngine.generate ?? baseEngine.calculate).call(baseEngine, inputs));
    } catch (e: any) {
      a = 'ERR:' + String(e && e.message);
    }
    try {
      const raw = join((curEngine.generate ?? curEngine.calculate).call(curEngine, inputs));
      b = renderCalcOutput(raw, {});
    } catch (e: any) {
      b = 'ERR:' + String(e && e.message);
    }
    if (a !== b) {
      if (!firstBad) {
        const A = a.split(NL);
        const B = b.split(NL);
        let k = 0;
        while (k < Math.max(A.length, B.length) && A[k] === B[k]) k++;
        firstBad =
          '输入 ' + JSON.stringify(inputs) + ' ⇒ 第 ' + (k + 1) + ' 行不同：' + NL +
          '    基线: ' + JSON.stringify(A[k]) + NL +
          '    现在: ' + JSON.stringify(B[k]) +
          (A.length !== B.length ? NL + '    行数 ' + A.length + ' → ' + B.length : '');
      }
      if (detail.length < 5) detail.push(JSON.stringify(inputs));
    }
  }

  return { slug, same: firstBad === null, cases: sets.length, firstBad, detail };
}

// ⭐ 本项目 tsx 转译目标是 CJS ⇒ **不能用顶层 await** ⇒ CLI 走 async IIFE。
if (resolve(process.argv[1] ?? '') === resolve(import.meta.dirname, 'p168-baseline-branch-diff.ts')) {
  void (async () => {
    const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
    const norm = (x: string) => x.replace(/^solopreneur-/, '').replace(/-calculator$/, '').replace(/-/g, '_');
    const picked = args.length
      ? B3_13_BATCH.filter((e) => args.some((n) => norm(e.slug).includes(norm(n))))
      : B3_13_BATCH;
    if (picked.length === 0) { console.log('没有匹配到引擎'); process.exit(1); }
    const defaults = codegenDefaults();
    let bad = 0;
    for (const e of picked) {
      const row = await diffEngine(e.slug, e.file, e.baseline, defaults);
      if (row.same) {
        console.log('✔ ' + row.slug.padEnd(44) + ' 全部 ' + row.cases + ' 组输入逐字节一致');
      } else {
        bad++;
        console.log('✗ ' + row.slug + ' ⇒ ' + row.cases + ' 组输入里有 ' + row.detail.length + '+ 组不同');
        console.log('   ' + (row.firstBad ?? '').split(NL).join(NL + '   '));
      }
    }
    console.log('—— ' + picked.length + ' 个引擎 · 不合格 ' + bad);
    process.exitCode = bad ? 1 : 0;
  })();
}
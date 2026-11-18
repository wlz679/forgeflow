#!/usr/bin/env node
// P168 B3-10 —— **单引擎隔离检查器**（worker 的验收命令；不 import 其它引擎 ⇒ 并行互不影响）。
//
// ⭐ 为什么不用 `p168-b310-check.ts`：那个工具 import **全部**引擎 ⇒ 并行 worker 里
//   别人写坏的文件会让你的检查一起挂 ⇒ 无法区分「我写坏了」与「他写坏了」。
//   本工具只 import **你指定的那一个**引擎文件 ⇒ 隔离。
//
// 用法（必须从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-b310-one.ts <引擎文件相对路径> <slug>
// 例如：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-b310-one.ts src/engines/product-analytics/power-user-curve-calculator.ts solopreneur-power-user-curve-calculator
//
// 退出码：0 = 该引擎已清账（单元素 + 与服务端逐字一致）；1 = 还有欠账。

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const NLc = String.fromCharCode(10);
const ROOT = resolve(process.cwd());

function codegenDefaults(): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  try {
    const src = readFileSync(resolve(ROOT, 'scripts', 'codegen-examples.mjs'), 'utf8');
    const i = src.indexOf('const ENGINES = [');
    if (i < 0) return out;
    const j = src.indexOf('\n];', i);
    if (j < 0) return out;
    const arr = new Function('return ' + src.slice(src.indexOf('[', i), j + 2))();
    for (const e of arr) out[e.slug] = e.defaultInputs;
  } catch {
    /* 回落 synthetic */
  }
  return out;
}

function syntheticInputs(engine: any): Record<string, string> {
  const out: Record<string, string> = {};
  for (const input of engine.inputs ?? []) {
    if (input.type === 'number') { out[input.name] = '1000'; continue; }
    if (input.type === 'select' && Array.isArray(input.options) && input.options.length > 0) {
      const first = input.options[0];
      out[input.name] = typeof first === 'object' && first !== null ? (first.value ?? first.label) : first;
      continue;
    }
    out[input.name] = 'SaaS';
  }
  return out;
}

function browserPick(arr: unknown[]): unknown { return arr[Math.floor(Math.random() * arr.length)]; }
function browserFill(t: string, v: Record<string, string>): string {
  return t.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '{' + k + '}');
}

const rel = process.argv[2];
const slug = process.argv[3];
if (!rel || !slug) {
  console.error('usage: p168-b310-one.ts <engine file relative path> <slug>');
  process.exit(2);
}

async function main(): Promise<void> {
  const abs = resolve(ROOT, rel);
  await import(pathToFileURL(abs).href);
  const { getEngine } = await import(pathToFileURL(resolve(ROOT, 'src', 'core', 'engines', 'registry.ts')).href);
  const engine: any = getEngine(slug);
  if (!engine) { console.error('找不到引擎 ' + slug + '（slug 拼错？）'); process.exit(2); }

  const defaults = codegenDefaults();
  const inputs = defaults[slug] ?? syntheticInputs(engine);

  const gen = engine.generate ?? engine.calculate;
  const so = gen.call(engine, inputs);
  const server = Array.isArray(so) ? so.map(String).join(NLc) : String(so);

  const body = engine.clientConfig && engine.clientConfig.customFn;
  let client = '';
  let elements = 0;
  let clientError: string | null = null;
  try {
    const fn = new Function('inputs', 'pick', 'fill', body);
    const co = fn(inputs, browserPick, browserFill);
    elements = Array.isArray(co) ? co.length : 1;
    client = Array.isArray(co) ? co.map(String).join(NLc) : String(co);
  } catch (err: any) {
    clientError = String(err && err.message);
  }

  const sL = server.split(NLc);
  const cL = client.split(NLc);
  let firstDiffLine = 0;
  let serverLine = '';
  let clientLine = '';
  for (let i = 0; i < Math.max(sL.length, cL.length); i++) {
    if (sL[i] !== cL[i]) {
      firstDiffLine = i + 1;
      serverLine = sL[i] ?? '';
      clientLine = cL[i] ?? '';
      break;
    }
  }

  const multiOk = elements === 1;
  const sameOk = server === client;
  console.log(
    slug +
    ' | 元素数=' + elements + (multiOk ? ' OK' : ' X（必须 1）') +
    ' | 逐字一致=' + (sameOk ? 'OK' : 'X') +
    ' | 服务端 ' + sL.length + ' 行 / 客户端 ' + cL.length + ' 行' +
    (clientError ? ' | 客户端抛错 ' + clientError : ''),
  );
  if (!sameOk) {
    console.log('  首行差异 #' + firstDiffLine);
    console.log('    服务端：' + serverLine);
    console.log('    客户端：' + clientLine);
  }
  process.exitCode = multiOk && sameOk ? 0 : 1;
}

main();
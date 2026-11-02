#!/usr/bin/env node
// P164 — 引擎 prose / customFn 两层的「价格必须派生」守卫（source-only）。
//
// 为什么需要这个守卫
// ------------------
// P163 建的《价格主张覆盖面台账》（src/data/price-claim-surface-ledger.ts）里，
// `engine-prose:gemini` 与 `engine-customfn:gemini` 两条都写着
//   guardedBy: ['tests/engine-faq-live-price-guard.test.ts']
// 但那份守卫**只读引擎源码里的 `faq: [...]` 数组**（见它的 readEngineFaq()），
// 压根不扫 calculate() 的 prose，也不扫 customFn 正文
// ⇒ **覆盖声明是假的**：那两层当时处于无人看守的状态。
//
// 而且台账守卫（tests/price-claim-surface-ledger-guard.test.ts）只验证
// 「guardedBy 指向的文件存在」，**不验证那份守卫真的看得见这一层**
// ⇒ 假声明不会被任何 CI 变红。
//
// 本守卫补上这两层，并且用**真值**（引擎模块 + 数据集）而不是源码文本：
//   E1 —— prose 层：价与「支持缓存的模型数」都必须是派生量，源码里不许出现写死的 $价
//   E2 —— customFn 层：同上（客户端那份平行实现）
//   E3 —— 渲染值必须等于数据集当前值（服务端 prose 与客户端 customFn 都要）
//   E4 —— 服务端 prose 与客户端 customFn 的这句话必须逐字节相同（live = static parity）
//
// ⚠️ 期望值来自数据集本身（src/data/ai-pricing.json 是真相源）+ 引擎模块的真实行为，
//    不调用 live-price.ts 的导出函数（那会让判据与实现同源）。
// Build dependency: none (source-only).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import PRICING from '../src/data/ai-pricing.json';
import { pickInteractiveModels } from '../src/data/ai-pricing-popular.ts';

const root = resolve(import.meta.dirname, '..');
const GEMINI_ENGINE = 'src/engines/ai-cost/gemini-api-cost-calculator.ts';

/** 这句话是台账里 gemini prose / customFn 两条的锚点 */
const ANCHOR = 'is the cheapest frontier-quality model';

/** codegen-examples.mjs 里 gemini 引擎的默认输入 */
const GEMINI_INPUTS = {
  models: 'gemini-3.5-flash,gemini-3.1-pro',
  inputTokens: '1000',
  outputTokens: '500',
  requestsPerDay: '100',
  pricingMode: 'realtime',
  cacheHitRate: '0',
  growthRate: '0',
};

/** 数据集当前事实（真相源直接读，不经任何派生函数） */
const googleModels = pickInteractiveModels((PRICING as any).llm.google.models, 'google') as Record<string, any>;
const flash = googleModels['gemini-3-flash'];
const cacheModelCount = Object.values(googleModels).filter((m: any) => m.supportsCache).length;

function engineSource(): string {
  return readFileSync(resolve(root, GEMINI_ENGINE), 'utf8');
}

/** 从多行文本里取出含锚点的那一行 */
function lineWithAnchor(text: string): string {
  const line = text.split('\n').find((l) => l.includes(ANCHOR));
  assert.ok(line, `no line containing "${ANCHOR}" — the prose/customFn sentence disappeared`);
  return line;
}

test('E1: prose 层的价格与模型数必须是派生量（源码里不许写死 $价）', () => {
  const src = engineSource();
  // 服务端 calculate() 里的那一句
  const idx = src.indexOf(ANCHOR);
  assert.ok(idx >= 0, `${GEMINI_ENGINE} has no "${ANCHOR}" prose`);
  // 取该 out.push(...) 语句：从锚点所在行往上找 `out.push(`，往下找 `);`
  const lines = src.split('\n');
  const anchorLine = lines.findIndex((l) => l.includes(ANCHOR) && l.includes('out.push'));
  assert.ok(anchorLine >= 0, 'the server-side prose line is not an out.push(...) call');
  let start = anchorLine;
  while (start >= 0 && !/out\.push\(/.test(lines[start])) start--;
  let end = anchorLine;
  while (end < lines.length && !/\);\s*$/.test(lines[end])) end++;
  const block = lines.slice(start, end + 1).join('\n');

  assert.match(
    block,
    /gf\.input\.toFixed\(2\)/,
    'the server-side prose must derive the input price from the dataset (gf.input), ' +
      'not from a hard-coded literal.',
  );
  assert.match(
    block,
    /gf\.output\.toFixed\(2\)/,
    'the server-side prose must derive the output price from the dataset (gf.output).',
  );
  assert.match(
    block,
    /cacheModelCount/,
    'the server-side prose must derive the "N models that support caching" count — ' +
      'the hard-coded "3" was wrong: the dataset has ' + cacheModelCount + ' cache-capable models.',
  );
  assert.doesNotMatch(
    block,
    /\$\s?\d/,
    'the server-side prose block must not contain a hand-written price literal.',
  );
});

test('E2: customFn 层的同一句也必须是派生量（客户端是平行实现，同样会漂）', () => {
  const src = engineSource();
  const lines = src.split('\n');
  // customFn 侧的那一句：在 customFn 字面量里（o.push 而不是 out.push）
  const idx = lines.findIndex((l) => l.includes(ANCHOR) && l.includes('o.push') && !l.includes('out.push'));
  assert.ok(idx >= 0, `no customFn line containing "${ANCHOR}"`);
  const line = lines[idx];
  assert.match(line, /gf3\.i\.toFixed\(2\)/, 'customFn must derive the input price (gf3.i)');
  assert.match(line, /gf3\.o\.toFixed\(2\)/, 'customFn must derive the output price (gf3.o)');
  assert.match(line, /ccm/, 'customFn must derive the cache-capable model count (ccm)');
  assert.doesNotMatch(line, /\$\s?\d/, 'the customFn prose line must not contain a hand-written price literal');
});

test('E3: 两侧渲染出的价格与模型数都必须等于数据集当前值', async () => {
  await import('../src/engines/index.ts');
  const { getEngine } = await import('../src/core/engines/registry.ts');
  const engine = getEngine('solopreneur-gemini-api-cost-calculator');
  assert.ok(engine, 'gemini engine is not registered');

  const serverText = (engine as any).generate(GEMINI_INPUTS).join('\n');
  const serverLine = lineWithAnchor(serverText);
  assert.ok(
    serverLine.includes(`$${flash.input.toFixed(2)}/$${flash.output.toFixed(2)}`),
    `the server-side prose must render the dataset price $${flash.input.toFixed(2)}/$${flash.output.toFixed(2)}, ` +
      `got: ${JSON.stringify(serverLine)}`,
  );
  assert.ok(
    serverLine.includes(`the ${cacheModelCount} models that support it`),
    `the server-side prose must render the dataset's cache-capable model count (${cacheModelCount}), ` +
      `got: ${JSON.stringify(serverLine)}`,
  );

  const body = (engine as any).clientConfig.customFn;
  assert.equal(typeof body, 'string', 'the gemini engine has no customFn body');
  const fn = new Function('inputs', 'pick', 'fill', body);
  const clientOut = fn(GEMINI_INPUTS, (a: any[]) => a[0], (t: string) => t);
  const clientText = Array.isArray(clientOut) ? clientOut.join('\n') : String(clientOut);
  const clientLine = lineWithAnchor(clientText);
  assert.ok(
    clientLine.includes(`$${flash.input.toFixed(2)}/$${flash.output.toFixed(2)}`),
    `the client-side customFn must render the dataset price $${flash.input.toFixed(2)}/$${flash.output.toFixed(2)}, ` +
      `got: ${JSON.stringify(clientLine)}`,
  );
  assert.ok(
    clientLine.includes(`the ${cacheModelCount} models that support it`),
    `the client-side customFn must render the dataset's cache-capable model count (${cacheModelCount}), ` +
      `got: ${JSON.stringify(clientLine)}`,
  );
});

test('E4: 服务端 prose 与客户端 customFn 的这句话必须逐字节相同（live = static parity）', async () => {
  await import('../src/engines/index.ts');
  const { getEngine } = await import('../src/core/engines/registry.ts');
  const engine = getEngine('solopreneur-gemini-api-cost-calculator');
  const serverText = (engine as any).generate(GEMINI_INPUTS).join('\n');
  const serverLine = lineWithAnchor(serverText).trim();

  const body = (engine as any).clientConfig.customFn;
  const fn = new Function('inputs', 'pick', 'fill', body);
  const clientOut = fn(GEMINI_INPUTS, (a: any[]) => a[0], (t: string) => t);
  const clientText = Array.isArray(clientOut) ? clientOut.join('\n') : String(clientOut);
  const clientLine = lineWithAnchor(clientText).trim();

  assert.equal(
    clientLine,
    serverLine,
    'the client-side customFn and the server-side calculate() must render the same ' +
      'sentence — the page shows one before the click and the other after it.\n' +
      `  server: ${JSON.stringify(serverLine)}\n` +
      `  client: ${JSON.stringify(clientLine)}`,
  );
});

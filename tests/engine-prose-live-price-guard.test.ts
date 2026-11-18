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

// P168 B3-10：客户端 customFn 现在是**服务端同一份代码的派生副本**（生成区）
import { generatedRegion, foldedNumber } from './_generated-region.ts';
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
  // P168 B3-9：服务端 prose 已被令牌化成多行 `out.push(makeToken(code, '...', {...}))`
  //   => 锚点那句**不再与 `out.push(` 同行**（P164 写死的是令牌化之前的单行形态）。
  //   判据不变：仍是**包住锚点的那条 out.push 语句**，且必须落在服务端 calculate() 区间内
  //   （clientConfig 之后是客户端 customFn 的平行实现，不是服务端 prose）。
  const calcStart = lines.findIndex((l) => /function calculate\(/.test(l));
  assert.ok(calcStart >= 0, GEMINI_ENGINE + ' has no calculate() function');
  const clientStart = lines.findIndex((l, i) => i > calcStart && l.includes('clientConfig'));
  const region = lines.slice(calcStart, clientStart >= 0 ? clientStart : lines.length);
  const anchorLine = region.findIndex((l) => l.includes(ANCHOR));
  assert.ok(anchorLine >= 0, 'no server-side prose line contains ' + ANCHOR);
  let start = anchorLine;
  while (start >= 0 && !/out\.push\(/.test(region[start])) start--;
  assert.ok(start >= 0, 'the server-side prose line is not an out.push(...) call');
  let end = anchorLine;
  while (end < region.length && !/\);\s*$/.test(region[end])) end++;
  const block = region.slice(start, end + 1).join('\n');

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

test('E2: customFn 层的同一句也必须是派生量（客户端同样是派生的，不许写死）', () => {
  const src = engineSource();
  // ⚠️ P168 B3-10：客户端 customFn 不再是「平行实现」，而是**服务端同一份代码的派生副本**
  //   ⇒ 变量名被压缩器改写了（gf3.i → 单字母）⇒ 旧判据（按变量名找 gf3.i / gf3.o / ccm）
  //      已经**失效**（不是「坏了」，是「测的东西变了」）。
  //   ⇒ 「客户端不许写死价格」这条不变量改用**形态无关**的口径：
  //      生成区里不得出现手写的价格字面量（`$` + 数字）。
  //   ⇒ 派生性本身由 P50 T5（每个 customFn 都带溯源标记）+ E4（两侧逐字节相同）守着。
  const region = generatedRegion(src);
  assert.ok(region.length > 0, 'the gemini engine has no generated client customFn region');
  // ⭐ 「客户端不许写死价格」在**新架构**下的正确形态：
  //   客户端不再是平行实现 ⇒ 它跑的是服务端那份代码 ⇒ 价格来自**折叠进去的模型表**
  //   ⇒ 折叠产物里**必然**是字面量 ⇒ 「源码里不许出现 $ + 数字」这条判据已经**失效**
  //   （不是「坏了」，是「要守的东西变了」）。
  //   ⇒ 真正要守的是「**折叠进去的表里是数据集当前价**」⇒ 副本陈旧 ⇒ 这里会红。
  const foldedIn = foldedNumber(region, '"gemini-3-flash":{', 'input');
  const foldedOut = foldedNumber(region, '"gemini-3-flash":{', 'output');
  assert.equal(
    foldedIn,
    flash.input,
    'the generated client customFn must carry the dataset current input price for ' +
      flash.name + ' — the folded table is stale ⇒ re-run scripts/codegen-customfn.mjs',
  );
  assert.equal(
    foldedOut,
    flash.output,
    'the generated client customFn must carry the dataset current output price for ' +
      flash.name + ' — the folded table is stale ⇒ re-run scripts/codegen-customfn.mjs',
  );
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

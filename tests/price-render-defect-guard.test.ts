#!/usr/bin/env node
// P163 — 价格渲染缺陷守卫（source-only）。
//
// 为什么需要这个守卫
// ------------------
// 规格 §16.7 信号 AB：**渲染层 bug 不会被任何价格守卫抓到**。
// 现有价格守卫（topic / engine-faq / gpu-*）查的是「有没有手写价」，
// 而 D1（$$ 双美元号）不是真相源漂移，是**代码 bug** ⇒ 它们对它完全失明。
//
// ⇒ 断言必须按**失败模式**枚举，而不是按「对象」枚举。
//
// 本文件每条断言只守一个失败模式：
//   D1 —— `$$` 双美元号（图片 10 处 + 训练 1 处）
//   D2 —— 写死的倍数（"13x cheaper"）
//   D3 —— 训练 Spot/Reserved 折扣带与数据集不符
//
// ⚠️ 期望值全部是本文件里**独立写死**的字面量。
// Build dependency: none (source-only).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import PRICING from '../src/data/ai-pricing.json';

const root = resolve(import.meta.dirname, '..');

const IMAGE_ENGINE = 'src/engines/ai-cost/ai-image-generation-cost-calculator.ts';
const TRAINING_ENGINE = 'src/engines/ai-cost/ai-training-cost-estimator.ts';

/** 只查「拼字符串」的行（out.push / o.push），排除注释行 */
function pushLines(rel: string): Array<[number, string]> {
  const src = readFileSync(resolve(root, rel), 'utf-8');
  return src
    .split('\n')
    .map((l, i) => [i + 1, l] as [number, string])
    .filter(([, l]) => /out\.push|"o\.push/.test(l));
}

test('D1：引擎输出里不得出现 $$ 双美元号', () => {
  for (const rel of [IMAGE_ENGINE, TRAINING_ENGINE]) {
    // ⚠️ 正则必须要求 `fmt(` 紧跟左括号 ——
    //    否则 `fmt` 会匹配到 `fmtNum` 的前缀，把**正确**的写法也判成违规。
    const offenders = pushLines(rel).filter(([, l]) => /['"`][^'"`]*\$['"`]\s*\+\s*fmt\(/.test(l));
    assert.deepEqual(
      offenders.map(([n]) => `${rel}:${n}`),
      [],
      `${rel}: 发现 ${offenders.length} 处 '$ + fmt(...)' 形态 ⇒ fmt() 已带 $，再拼一个就是 $$`,
    );
  }
});

test('D2：倍数不得是写死的字面量，必须由当前单价算出', () => {
  const offenders = pushLines(IMAGE_ENGINE).filter(([, l]) => /\d+(?:\.\d+)?x\s+cheaper/.test(l));
  assert.deepEqual(
    offenders.map(([n]) => n),
    [],
    '图片引擎发现写死的 "Nx cheaper" ⇒ 倍数会随 provider 单价失真（实测 flux-pro $0.05/SD4 $0.003 = 16.7x，文案却说 13x）',
  );
});

test('D3：训练引擎的 Spot/Reserved 折扣带必须来自数据集，不得写死单一百分比', () => {
  const src = readFileSync(resolve(root, TRAINING_ENGINE), 'utf-8');
  const gpu: any = (PRICING as any).gpu;
  const providers = Object.values(gpu.providers) as any[];
  assert.ok(providers.length > 0, '数据集 gpu.providers 不能为空');
  for (const p of providers) {
    assert.ok(typeof p.spotMult === 'number', '每个 provider 必须有 spotMult');
    assert.ok(typeof p.reservedMult === 'number', '每个 provider 必须有 reservedMult');
  }

  // 引擎里不允许出现写死的单一折扣百分比
  const offenders = pushLines(TRAINING_ENGINE).filter(([, l]) =>
    /Spot\/Reserved Discount \(\d+% off\)/.test(l),
  );
  assert.deepEqual(
    offenders.map(([n]) => n),
    [],
    '训练引擎仍有写死的单一 Spot/Reserved 折扣百分比 ⇒ 数据集给的是带（区间），不是单值',
  );

  // 引擎必须引用数据集的乘数（而不是自己定义常量）
  assert.ok(/spotMult/.test(src), '训练引擎没有引用 spotMult ⇒ 现货折扣带没有单一真相源');
  assert.ok(/reservedMult/.test(src), '训练引擎没有引用 reservedMult ⇒ 预留折扣带没有单一真相源');

  // customFn 侧也必须带同一组带（由 codegen 从数据集生成）
  assert.ok(/SPMIN/.test(src), 'customFn 缺少 SPMIN/SPMAX（现货带）');
  assert.ok(/RPMIN/.test(src), 'customFn 缺少 RPMIN/RPMAX（预留带）');
});

test('D3b：训练引擎输出的折扣带 == 数据集按供应商算出的带', () => {
  // 独立写死：数据集的现货带跨 6 家 = 30-60%，预留带 = 10-30%
  // （spotMult ∈ [0.4,0.7]、reservedMult ∈ [0.7,0.9] ⇒ 折扣率 1-mult）
  const gpu: any = (PRICING as any).gpu;
  const providers = Object.values(gpu.providers) as any[];
  const spotOffs = providers.map((p) => Math.round((1 - p.spotMult) * 100)).sort((a, b) => a - b);
  const reservedOffs = providers.map((p) => Math.round((1 - p.reservedMult) * 100)).sort((a, b) => a - b);
  const spotBand = `${spotOffs[0]}-${spotOffs[spotOffs.length - 1]}`;
  const reservedBand = `${reservedOffs[0]}-${reservedOffs[reservedOffs.length - 1]}`;
  assert.equal(spotBand, '30-60', `数据集现货带实测是 ${spotBand}`);
  assert.equal(reservedBand, '10-30', `数据集预留带实测是 ${reservedBand}`);
});

// ---------------------------------------------------------------------------
// P163 变异台子 R2/R3 暴露的盲区 —— 倍数与基线单价必须由数据集派生
// ---------------------------------------------------------------------------

/**
 * D2b：图片引擎里不得出现**数据集拥有的单价字面量**。
 *
 * 独立写死：数据集 image.providers 的三个 perImage —— SD 4 = 0.003、
 * Ideogram 3 = 0.04、DALL-E 3 = 0.08。写死它们的后果不是「不好看」，
 * 而是 bot 刷新价格后 prose 与 customFn 一起失真（实测：写死的 "13x"
 * 只在 Ideogram 3 上恰好正确，Flux Pro 实为 16.7x）。
 *
 * 两条规则分开：
 *   · 算术/比较形态（`* 0.004` / `/ 0.003` / `>= 0.08`）—— 全文扫。
 *     codegen 生成的表里是 `pi:0.08`（等号形态），不会命中。
 *   · 展示形态（`$0.003`）—— 只扫 push 行。静态示例是 codegen 的**产物**
 *     （输出，不是代码），里面出现 $0.003 是合法的。
 */
test('D2b：图片引擎不得出现数据集拥有的单价字面量（0.003 / 0.04 / 0.08）', () => {
  const src = readFileSync(resolve(root, IMAGE_ENGINE), 'utf-8');
  const arith = src
    .split('\n')
    .map((l, i) => [i + 1, l] as [number, string])
    .filter(([, l]) => /[*\/]\s*0\.(?:003|04|08)(?!\d)/.test(l) || /[<>]=?\s*0\.(?:003|04|08)(?!\d)/.test(l));
  assert.deepEqual(
    arith.map(([n]) => n),
    [],
    '图片引擎在算术/比较里用了数据集单价字面量 ⇒ 该价格一刷新就失真（SD 4 / Ideogram 3 / DALL-E 3 的 perImage 必须派生）',
  );

  const displayed = pushLines(IMAGE_ENGINE).filter(([, l]) => /\$0\.(?:003|04|08)(?!\d)/.test(l));
  assert.deepEqual(
    displayed.map(([n]) => n),
    [],
    '图片引擎的输出里出现了手写的 $0.003 / $0.04 / $0.08 ⇒ 显示价必须由数据集单价派生',
  );
});

/**
 * D2c：倍数必须**除以一个数据集单价**（`x.perImage`），不能除以数字字面量。
 *
 * D2 只抓「字面文本」（`13x cheaper`）—— 把倍数写死成常量变量
 * （`const sd4Ratio = 13;`）它看不见。这是 P163 变异台子 R2b 暴露的洞。
 */
test('D2c：倍数必须除以数据集单价（不得除以数字字面量）', () => {
  const src = readFileSync(resolve(root, IMAGE_ENGINE), 'utf-8');
  const literalDiv = src
    .split('\n')
    .map((l, i) => [i + 1, l] as [number, string])
    .filter(([, l]) => /\/\s*0\.\d+/.test(l));
  assert.deepEqual(
    literalDiv.map(([n]) => n),
    [],
    '图片引擎把倍数除以了一个数字字面量 ⇒ 除数必须是数据集单价（*.perImage）',
  );
  assert.ok(
    /Math\.round\(\s*[A-Za-z_$][\w$]*\s*\/\s*[A-Za-z_$][\w$]*\.perImage\s*\)/.test(src),
    '图片引擎没有「Math.round(x / y.perImage)」的倍数计算 ⇒ 倍数不是由数据集单价算出来的',
  );
});

/**
 * D3c：训练引擎的 full-FT 倍数必须由 loraSpeedup 派生。
 *
 * 写死的 `3` 与 FAQ 的 `{{liveTrainingFullFtMult}}`（= round(1/loraSpeedup)）
 * 是同一个数的两个副本 —— 数据集一改就会打架。
 */
test('D3c：训练引擎的 full-FT 倍数必须由 loraSpeedup 派生', () => {
  const src = readFileSync(resolve(root, TRAINING_ENGINE), 'utf-8');
  assert.ok(
    /\/\s*LORA_EPOCH_SPEEDUP\b/.test(src),
    '训练引擎没有「除以 LORA_EPOCH_SPEEDUP」的倍数计算 ⇒ full-FT 倍数不是由数据集派生的',
  );
  const hardCoded = pushLines(TRAINING_ENGINE).filter(([, l]) => /\(\d+x cost|\(1\/\d+ cost/.test(l));
  assert.deepEqual(
    hardCoded.map(([n]) => n),
    [],
    '训练引擎的输出里出现了写死的 full-FT 倍数 ⇒ 必须由 loraSpeedup 派生（与 FAQ 同源）',
  );
});

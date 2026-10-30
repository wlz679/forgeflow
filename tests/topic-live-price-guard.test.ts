#!/usr/bin/env node
// P158 — editorial content 的价格单一真相源守卫（source-only）。
//
// 为什么需要这个守卫
// ------------------
// P156 把**工具页**的模型集口径统一了（静态正文 vs 交互态读同一份数据）。
// 但主题页的**编辑内容**里还有第二个真相源：手写的价格。
//
// 实测（2026-10-28）：`TOPIC_BENCHMARK_CONTENT` 里 16 条可核对的「每 1M token
// 输入/输出价」有 **6 条已经和实时数据集对不上**（37.5%），最严重的一条
// （Gemini 2.5 Flash）输出价差 **8.33 倍**；曝光最高的主题页
// `/en/ai-cost-tools/llm-provider-comparison-compare`（293 展示 / 排名 8.2）
// 的「旗舰定价」行 **4 个格全错**。
//
// 根因和 P156 一样：**同一个事实有两个真相源**，而其中一个每周只被 bot 更新一次。
//
// ⇒ P158 的修法：**价格不再手写**。编辑内容里写 token，构建期从
//   `src/data/ai-pricing.json` 解析出真实价格（见 `src/lib/live-price.ts`）。
//   bot 每周同步价格 ⇒ editorial content 自动跟随 ⇒ 漂移在结构上不可能发生。
//
// 本守卫盯住「派生机制」本身的四条性质：
//
//   1. **手写单价归零**：LLM 编辑内容里不允许再出现「每 token 单价」形态的
//      `$` 字面量（带 K/M/B 后缀的**聚合支出**允许 —— 那是编辑场景，不是单价）。
//   2. **key 必须存在**：每个 token 引用的 provider/key 必须在数据集里存在
//      （否则构建期就会炸，构建期炸 = 整站发不出去，必须提前拦）。
//   3. **名实一致**：同一处文字里 `{{liveName:X}}` 的 X，必须在同处的价格
//      token 里出现 —— 不允许「名字指 A、价格指 B」这种最难发现的错。
//   4. **模板接入**：guide / benchmark / compare 三个模板都必须调用解析器，
//      否则 token 会原样印到页面上。
//
// ⚠️ 期望值全部是本文件里**独立写死**的字面量，不是从被测模块导出的常量。
//    数据集本身（`src/data/ai-pricing.json`）是真相源，直接读它比对 ——
//    而不是调 `live-price.ts` 的导出函数（那会让判据和实现同源）。
//
// Build dependency: none (source-only).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import PRICING from '../src/data/ai-pricing.json';
import {
  TOPIC_COMPARE_CONTENT,
  TOPIC_GUIDE_CONTENT,
  TOPIC_BENCHMARK_CONTENT,
} from '../src/data/topic-content.ts';
import { resolveLiveTokens, resolveLiveTokensDeep, hasUnresolvedToken, referencedModels, liveDatasetDate } from '../src/lib/live-price.ts';

const root = resolve(import.meta.dirname, '..');

/** P158 覆盖的主题 —— 写死，改主题 id 必须同时改这里 */
const LLM_GUIDE_TOPIC = 'llm-api-cost-optimization';
const LLM_COMPARE_TOPIC = 'llm-provider-comparison';

/** 本守卫允许存在的 token 种类（写死的清单） */
const PINNED_TOKEN_KINDS = [
  'live',
  'liveName',
  'liveIn',
  'liveOut',
  'liveMonthly',
  'liveRatioIn',
  'liveRatioOut',
  'liveBandIn',
  'liveBandOut',
  'liveRatioBandIn',
  'liveRatioBandOut',
] as const;

/** 会带出「单价」的 token 种类（liveName 只带名字，不带价） */
const PRICE_TOKEN_KINDS = new Set([
  'live',
  'liveIn',
  'liveOut',
  'liveMonthly',
  'liveRatioIn',
  'liveRatioOut',
  'liveBandIn',
  'liveBandOut',
  'liveRatioBandIn',
  'liveRatioBandOut',
]);

const TOKEN_RE = /\{\{(live|liveName|liveIn|liveOut|liveMonthly|liveRatioIn|liveRatioOut|liveBandIn|liveBandOut|liveRatioBandIn|liveRatioBandOut):([^{}]+)\}\}/g;

/**
 * 收集一个结构里的所有字符串，带路径。
 */
function collectStrings(value: unknown, path = '', acc: Array<{ path: string; value: string }> = []) {
  if (typeof value === 'string') {
    acc.push({ path, value });
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => collectStrings(v, `${path}[${i}]`, acc));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      collectStrings(v, path ? `${path}.${k}` : k, acc);
    }
  }
  return acc;
}

/**
 * 「单位」= 一段独立的文字单元（一个字段 / 一行表 / 一个维度）。
 * 名实一致性必须在**同一单位**内判定 —— 跨单位比对会误报。
 */
interface Unit {
  id: string;
  text: string;
}

function unitsOfCompare(): Unit[] {
  const content = TOPIC_COMPARE_CONTENT[LLM_COMPARE_TOPIC];
  const units: Unit[] = [];
  for (const row of content.heroTable.rows) {
    units.push({ id: `heroTable/${row.aspect.en}`, text: row.cells.map((c) => c.en).join(' | ') });
  }
  for (const [i, dim] of content.dimensions.entries()) {
    units.push({ id: `dimensions[${i}]/en`, text: dim.body.en });
    units.push({ id: `dimensions[${i}]/zh`, text: dim.body.zh });
  }
  if (content.decision) {
    units.push({ id: 'decision/en', text: content.decision.en });
    units.push({ id: 'decision/zh', text: content.decision.zh });
  }
  return units;
}

function unitsOfGuide(): Unit[] {
  const content = TOPIC_GUIDE_CONTENT[LLM_GUIDE_TOPIC];
  const units: Unit[] = [];
  for (const lang of ['en', 'zh'] as const) {
    for (const [field, value] of Object.entries(content[lang])) {
      units.push({ id: `guide/${lang}/${field}`, text: String(value) });
    }
  }
  return units;
}

function unitsOfBenchmark(): Unit[] {
  const content = TOPIC_BENCHMARK_CONTENT[LLM_GUIDE_TOPIC];
  const units: Unit[] = [];
  for (const lang of ['en', 'zh'] as const) {
    const c = content[lang];
    for (const [field, value] of Object.entries(c)) {
      if (field === 'rows') continue;
      units.push({ id: `benchmark/${lang}/${field}`, text: String(value) });
    }
    c.rows.forEach((row, i) => {
      units.push({ id: `benchmark/${lang}/rows[${i}]`, text: `${row.metric} | ${row.benchmark} | ${row.source}` });
    });
  }
  return units;
}

const ALL_UNITS: Unit[] = [...unitsOfCompare(), ...unitsOfGuide(), ...unitsOfBenchmark()];

// ---------------------------------------------------------------------------
// 1. 手写单价归零
// ---------------------------------------------------------------------------

test('P158: no LLM editorial text carries a hand-typed per-token price', () => {
  // `$<数字>` 且**没有** K/M/B 单位后缀 = 手写的单价；带后缀的是聚合支出，允许。
  const priceRe = /\$[ ]?\d+(?:[.,]\d+)?([KMBkmb])?/g;
  const offenders: string[] = [];
  for (const unit of ALL_UNITS) {
    for (const m of unit.text.matchAll(priceRe)) {
      if (m[1]) continue; // 带 K/M/B → 聚合支出（年耗 / 月耗），是编辑场景
      offenders.push(`${unit.id}: ${m[0]} — ${unit.text.slice(0, 160)}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'LLM editorial content still contains hand-typed per-token prices. ' +
      'Every price must go through a {{live*}} token so it follows src/data/ai-pricing.json. ' +
      'Offenders:\n' +
      offenders.join('\n'),
  );
});

test('P158: every LLM editorial unit still carries derived price tokens', () => {
  // 反向检查：不是「不许有手写价」就够了，还得「确实用了派生 token」——
  // 否则把整段正文删空也能通过上一条。
  const unitsWithTokens = ALL_UNITS.filter((u) => /\{\{live/.test(u.text));
  assert.ok(
    unitsWithTokens.length >= 12,
    `expected the LLM editorial content to be tokenised in many places, only ${unitsWithTokens.length} unit(s) carry a live token`,
  );
});

// ---------------------------------------------------------------------------
// 2. 基准行 / 对比页定价行必须走 token
// ---------------------------------------------------------------------------

test('P158: every LLM benchmark row publishes a derived price', () => {
  const rows = TOPIC_BENCHMARK_CONTENT[LLM_GUIDE_TOPIC];
  for (const lang of ['en', 'zh'] as const) {
    const list = rows[lang].rows;
    assert.equal(list.length, 8, `${lang}: expected 8 LLM benchmark rows, got ${list.length}`);
    list.forEach((row, i) => {
      assert.match(
        row.benchmark,
        /^\{\{live:[a-z0-9.\-\/]+\}\}$/,
        `${lang} row ${i} ("${row.metric}") must publish its price as a {{live:provider/key}} token, got "${row.benchmark}"`,
      );
    });
  }
});

test('P158: the comparison page pricing row publishes derived prices', () => {
  const content = TOPIC_COMPARE_CONTENT[LLM_COMPARE_TOPIC];
  const pricingRow = content.heroTable.rows.find((r) => /pricing/i.test(r.aspect.en));
  assert.ok(pricingRow, 'the comparison page must have a pricing row in its hero table');
  assert.equal(pricingRow.cells.length, 4, `expected 4 pricing cells, got ${pricingRow.cells.length}`);
  pricingRow.cells.forEach((cell, i) => {
    for (const lang of ['en', 'zh'] as const) {
      assert.match(
        cell[lang],
        /\{\{live:[a-z0-9.\-\/]+\}\}/,
        `pricing cell ${i} (${lang}) must render a derived price, got "${cell[lang]}"`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 3. token 引用的 key 必须存在 + 名实一致
// ---------------------------------------------------------------------------

test('P158: every referenced model exists in the pricing dataset', () => {
  const missing: string[] = [];
  for (const unit of ALL_UNITS) {
    for (const m of unit.text.matchAll(TOKEN_RE)) {
      for (const ref of m[2]!.split('|')) {
        const slash = ref.indexOf('/');
        assert.ok(slash > 0, `${unit.id}: malformed model reference "${ref}"`);
        const provider = ref.slice(0, slash);
        const key = ref.slice(slash + 1);
        const model = (PRICING as any).llm?.[provider]?.models?.[key];
        if (!model) missing.push(`${unit.id}: ${ref} (token kind ${m[1]})`);
      }
    }
  }
  assert.deepEqual(
    missing,
    [],
    'these model references are not in src/data/ai-pricing.json — pick the current key instead of leaving a stale reference',
  );
});

test('P158: a liveName token always names the same model as the price beside it', () => {
  const offenders: string[] = [];
  for (const unit of ALL_UNITS) {
    const named: string[] = [];
    const priced: string[] = [];
    for (const m of unit.text.matchAll(TOKEN_RE)) {
      const kind = m[1]!;
      for (const ref of m[2]!.split('|')) {
        if (kind === 'liveName') named.push(ref);
        else if (PRICE_TOKEN_KINDS.has(kind)) priced.push(ref);
      }
    }
    for (const name of named) {
      if (!priced.includes(name)) {
        offenders.push(`${unit.id}: {{liveName:${name}}} has no price token for ${name} in the same unit`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'a liveName token must point at the same model as the price next to it — ' +
      '"name says A, price says B" is the hardest drift to notice by eye',
  );
});

// ---------------------------------------------------------------------------
// 4. token 种类必须被实现（行为验证，不是读常量）
// ---------------------------------------------------------------------------

test('P158: every token kind used in the editorial content is implemented', () => {
  const used = new Set<string>();
  for (const unit of ALL_UNITS) {
    for (const m of unit.text.matchAll(TOKEN_RE)) used.add(m[1]!);
  }
  for (const kind of used) {
    assert.ok(
      (PINNED_TOKEN_KINDS as readonly string[]).includes(kind),
      `editorial content uses an unknown token kind "${kind}" — it would be printed verbatim on the page`,
    );
  }
  assert.ok(used.size >= 6, `expected the editorial content to use several token kinds, got ${used.size}`);
});

test('P158: every pinned token kind is actually implemented, not just listed', () => {
  // ⚠️ 上一条只证明「内容里用的种类在清单里」，不证明「清单里的种类真被实现了」。
  //    少实现一种（忘了加进 TOKEN_RE），token 就会原样印到页面上 ——
  //    所以这里对每一种都跑一次真实的替换，断言它真的被吃掉了。
  const samplePayload: Record<string, string> = {
    live: 'openai/gpt-5',
    liveName: 'openai/gpt-5',
    liveIn: 'openai/gpt-5',
    liveOut: 'openai/gpt-5',
    liveMonthly: 'openai/gpt-5',
    liveRatioIn: 'openai/gpt-5|anthropic/claude-opus-5',
    liveRatioOut: 'openai/gpt-5|anthropic/claude-opus-5',
    liveBandIn: 'openai/gpt-5|anthropic/claude-opus-5',
    liveBandOut: 'openai/gpt-5|anthropic/claude-opus-5',
    liveRatioBandIn: 'openai/gpt-5|anthropic/claude-opus-5|google/gemini-2.5-pro',
    liveRatioBandOut: 'openai/gpt-5|anthropic/claude-opus-5|google/gemini-2.5-pro',
  };
  for (const kind of PINNED_TOKEN_KINDS) {
    const token = `{{${kind}:${samplePayload[kind]}}}`;
    const resolved = resolveLiveTokens(token);
    assert.ok(
      !resolved.includes('{{'),
      `token kind "${kind}" is not implemented — resolving ${token} left the raw token in the text`,
    );
    assert.notEqual(resolved, token, `token kind "${kind}" resolved to itself`);
  }
});

test('P158: each pinned token kind resolves to the expected value', () => {
  // 期望值在这里独立算出来（读数据集、照公式手算），不是调被测模块的导出函数。
  // openai/gpt-5 = $1.25 in / $10.00 out；anthropic/claude-opus-5 = $5.00 in / $25.00 out
  // google/gemini-2.5-pro = $1.25 in / $10.00 out
  const cases: Array<{ token: string; expected: string }> = [
    { token: '{{live:openai/gpt-5}}', expected: '$1.25 / $10.00' },
    { token: '{{liveIn:openai/gpt-5}}', expected: '$1.25' },
    { token: '{{liveOut:openai/gpt-5}}', expected: '$10.00' },
    { token: '{{liveName:openai/gpt-5}}', expected: 'GPT 5' },
    // 100M requests × (1000 in / 500 out) tokens = 100M in + 50M out
    // → 100 × $1.25 + 50 × $10.00 = $125 + $500 = $625
    { token: '{{liveMonthly:openai/gpt-5}}', expected: '$625,000' },
    { token: '{{liveRatioIn:openai/gpt-5|anthropic/claude-opus-5}}', expected: '4' },
    { token: '{{liveRatioOut:openai/gpt-5|anthropic/claude-opus-5}}', expected: '3' },
    { token: '{{liveBandIn:openai/gpt-5|anthropic/claude-opus-5}}', expected: '$1.25-$5.00' },
    { token: '{{liveBandOut:openai/gpt-5|anthropic/claude-opus-5}}', expected: '$10.00-$25.00' },
    // opus5 / gpt-5 = 4；gemini-2.5-pro / gpt-5 = 1 → 区间 1-4
    { token: '{{liveRatioBandIn:openai/gpt-5|anthropic/claude-opus-5|google/gemini-2.5-pro}}', expected: '1-4' },
    // opus5 / gpt-5 = round(25/10) = 3；gemini-2.5-pro / gpt-5 = 1 → 区间 1-3
    { token: '{{liveRatioBandOut:openai/gpt-5|anthropic/claude-opus-5|google/gemini-2.5-pro}}', expected: '1-3' },
  ];
  for (const { token, expected } of cases) {
    assert.equal(resolveLiveTokens(token), expected, `token ${token} should resolve to "${expected}"`);
  }
});

test('P158: the date token resolves to the dataset date', () => {
  assert.equal(resolveLiveTokens('{{liveDate}}'), liveDatasetDate());
  assert.equal(liveDatasetDate(), String((PRICING as any).lastUpdated));
});

// ---------------------------------------------------------------------------
// 5b. 解析必须在源层就干净 + 两个观察器必须看到同一批 token
// ---------------------------------------------------------------------------

test('P158: every LLM editorial unit resolves into clean text', () => {
  for (const unit of ALL_UNITS) {
    const resolved = resolveLiveTokensDeep(unit.text);
    assert.ok(
      !hasUnresolvedToken(resolved),
      `${unit.id}: still carries an unresolved live token after resolution — ${resolved.slice(0, 160)}`,
    );
    assert.doesNotMatch(
      resolved,
      TOKEN_RE,
      `${unit.id}: a {{live*}} token survived resolution — ${resolved.slice(0, 160)}`,
    );
  }
});

test('P158: the module scanner and the guard scanner see the same models', () => {
  // 两个**独立**的观察器（守卫自己的正则 + 模块的 referencedModels）必须看到同一批
  // token —— 少实现一种 token 种类时，模块的正则会漏而守卫的正则不会 ⇒ 这条能把
  // 「模块瞎了」和「内容错了」分开。
  for (const unit of ALL_UNITS) {
    const mine: string[] = [];
    for (const m of unit.text.matchAll(TOKEN_RE)) {
      for (const ref of m[2]!.split('|')) mine.push(ref);
    }
    const theirs = referencedModels(unit.text).map((r) => `${r.provider}/${r.key}`);
    assert.deepEqual(
      theirs.slice().sort(),
      mine.slice().sort(),
      `${unit.id}: the module's token scanner and the guard's scanner disagree on the referenced models — ` +
        'the module would silently stop resolving some of them',
    );
  }
});

// ---------------------------------------------------------------------------
// 5. 未知 key / 畸形引用必须报错，不许静默留原文
// ---------------------------------------------------------------------------

test('P158: an unknown model reference throws instead of staying in the text', () => {
  assert.throws(
    () => resolveLiveTokens('{{live:openai/does-not-exist}}'),
    /does-not-exist/,
    'a stale model reference must fail the build, not be printed on the page',
  );
});

test('P158: a malformed model reference throws', () => {
  assert.throws(() => resolveLiveTokens('{{live:noprefix}}'), /Malformed/);
  assert.throws(() => resolveLiveTokens('{{liveRatioIn:openai/gpt-5}}'), /Malformed/);
});

// ---------------------------------------------------------------------------
// 6. 三个模板都必须接入解析器
// ---------------------------------------------------------------------------

test('P158: the guide, benchmark and compare templates all resolve live tokens', () => {
  const templates = [
    'src/pages/[lang]/[letter]/[topic]-guide.astro',
    'src/pages/[lang]/[letter]/[topic]-benchmark.astro',
    'src/pages/[lang]/[letter]/[topic]-compare.astro',
  ];
  for (const rel of templates) {
    const src = readFileSync(resolve(root, rel), 'utf-8');
    assert.match(
      src,
      // ⚠️ P161 放宽：允许 import 列表里有**多个**名字。
      //    旧写法 `\{\s*resolveLiveTokensDeep\s*\}` 要求 import 列表里只有它一个 ——
      //    P161 给三个主题页模板加上了 `resolveLiveTokens`（解析主题描述），
      //    旧正则立刻匹配不上 ⇒ 全量套件红。
      //    ⇒ 断言的意图是「这个模板引入了解析器」，不是「import 列表长什么样」。
      /import\s*\{[^}]*resolveLiveTokensDeep[^}]*\}\s*from\s*'[^']*live-price'/,
      `${rel} must import resolveLiveTokensDeep from src/lib/live-price`,
    );
    assert.match(
      src,
      /resolveLiveTokensDeep\(/,
      `${rel} must call resolveLiveTokensDeep — otherwise the {{live*}} tokens are printed verbatim`,
    );
  }
});

#!/usr/bin/env node
// P163 — `ai-pricing-popular.json` 显式规则守卫（source-only）。
//
// 为什么需要这个守卫
// ------------------
// `src/data/ai-pricing-popular.json` 决定「哪些模型进交互态」（用户能在计算器里
// 选到的）。P163 之前它是一个**纯清单**：44 个 key，没有任何规则说明
// 「数据集里的模型进/不进交互态由谁决定」。
//
// 后果不是 bug，是**流程洞**：
//   - 每周的定价 bot 把新模型同步进 `src/data/ai-pricing.json`；
//   - 新模型**只进数据集、不进 popular** —— 而且**没有任何东西会红**；
//   - 用户在计算器里根本选不到这个模型，交互态永久落后于市场。
//
// P163 的修法：把「决定」变成可执行契约。
//   popularModelKeys   已策展（进交互态）—— 44
//   excludedModelKeys  显式排除（不进交互态）—— 201
//   两个清单必须构成对数据集模型的**完整划分**。
//   excludedFamilies   说明「为什么」—— 42 个族（provider + glob + reason）。
//
// 本守卫盯住这些失败模式（一条断言只守一件事）：
//   1. `_rule` 契约本身缺失
//   2. 数据集模型既没策展也没排除 —— 新模型静默掉队
//   3. 同一个模型既策展又排除 —— 矛盾
//   4. 已策展的 key 在数据集里不存在 —— 陈旧策展
//   5. 已排除的 key 在数据集里不存在 —— 陈旧排除记录
//   6. 比较页 flagship 不在数据集 / 不在交互态
//   7. 排除记录没有被任何族解释 —— 孤儿
//   8. 族没有命中任何排除记录 —— 死族
//   9. 族的 provider 非法 / reason 空
//  10. glob 语义被改坏（`*` 不再匹配中间 / `.` 变成通配）
//
// ⚠️ 期望值全部是本文件里**独立写死**的字面量，不是从被测模块导出的常量。
//    数据集本身（`src/data/ai-pricing.json`）是真相源，直接读它比对 ——
//    而不是调 `ai-pricing-popular.ts` 的导出常量（那会让判据与实现同源）。
// Build dependency: none (source-only).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import PRICING from '../src/data/ai-pricing.json';
import { matchesExcludedFamily } from '../src/data/ai-pricing-popular.ts';

type LlmGroup = { models?: Record<string, unknown> };
type Llm = Record<string, LlmGroup>;

const llm = (PRICING as unknown as { llm: Llm }).llm;

/** 独立写死：数据集里 LLM 模型的总数 */
const DATASET_MODEL_COUNT = 245;
/** 独立写死：已策展（进交互态）模型数 */
const CURATED_COUNT = 44;
/** 独立写死：显式排除模型数 */
const EXCLUDED_COUNT = 201;
/** 独立写死：排除族数量 */
const FAMILY_COUNT = 42;

/** 独立写死：四个 provider */
const PROVIDERS = ['anthropic', 'deepseek', 'google', 'openai'] as const;

// ---------------------------------------------------------------------------
// 读取被测文件（不走 TS 模块导出，避免判据与实现同源）
// ---------------------------------------------------------------------------
const root = resolve(import.meta.dirname, '..');

interface PopularFile {
  _rule?: {
    rule?: string;
    updatedAt?: string;
    rationale?: string;
    curatedModelCount?: number;
    excludedModelCount?: number;
  };
  popularModelKeys?: Record<string, string[]>;
  comparisonFlagshipKeys?: Record<string, string>;
  excludedModelKeys?: Record<string, string[]>;
  excludedFamilies?: { provider: string; pattern: string; reason: string }[];
}

const popularFile = JSON.parse(
  readFileSync(resolve(root, 'src', 'data', 'ai-pricing-popular.json'), 'utf-8'),
) as PopularFile;

const popular = popularFile.popularModelKeys ?? {};
const excluded = popularFile.excludedModelKeys ?? {};
const flagships = popularFile.comparisonFlagshipKeys ?? {};
const families = popularFile.excludedFamilies ?? [];

/** 数据集里所有模型 key（按 provider 分组） */
function datasetKeys(provider: string): string[] {
  return Object.keys(llm[provider]?.models ?? {});
}

/** 数据集模型总数 */
function datasetTotal(): number {
  return PROVIDERS.reduce((n, p) => n + datasetKeys(p).length, 0);
}

// ---------------------------------------------------------------------------
// 1. 规则契约本身
// ---------------------------------------------------------------------------

test('P163: _rule 契约字段齐全（缺一个就说明「谁来决定」没写下来）', () => {
  const rule = popularFile._rule;
  assert.ok(rule, 'ai-pricing-popular.json 必须有 _rule 键');
  assert.ok(
    typeof rule.rule === 'string' && rule.rule.length > 40,
    '_rule.rule 必须是一段说清「模型进不进交互态由谁决定」的文字',
  );
  assert.ok(
    typeof rule.updatedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rule.updatedAt),
    '_rule.updatedAt 必须是 YYYY-MM-DD',
  );
  assert.ok(
    typeof rule.rationale === 'string' && rule.rationale.length > 40,
    '_rule.rationale 必须说明「为什么以前没有规则就是个洞」',
  );
  assert.equal(rule.curatedModelCount, CURATED_COUNT, '_rule.curatedModelCount 与实际策展数不符');
  assert.equal(rule.excludedModelCount, EXCLUDED_COUNT, '_rule.excludedModelCount 与实际排除数不符');
});

// ---------------------------------------------------------------------------
// 2. 完整划分：数据集模型恰好落在「已策展 ∪ 已排除」之一
// ---------------------------------------------------------------------------

test('P163: 数据集里每个模型都被策展或被显式排除（新模型不许静默掉队）', () => {
  const orphans: string[] = [];
  for (const provider of PROVIDERS) {
    const curated = new Set(popular[provider] ?? []);
    const excludedSet = new Set(excluded[provider] ?? []);
    for (const key of datasetKeys(provider)) {
      if (!curated.has(key) && !excludedSet.has(key)) orphans.push(`${provider}/${key}`);
    }
  }
  assert.deepEqual(
    orphans,
    [],
    '这些模型既不在 popularModelKeys 也不在 excludedModelKeys —— ' +
      '新模型进 ai-pricing.json 后必须做「进不进交互态」的决定，否则用户选不到它。' +
      `未决模型（${orphans.length} 个）：\n` +
      orphans.join('\n'),
  );
});

test('P163: 同一个模型不能既已策展又被显式排除（矛盾）', () => {
  const contradictions: string[] = [];
  for (const provider of PROVIDERS) {
    const curated = new Set(popular[provider] ?? []);
    for (const key of excluded[provider] ?? []) {
      if (curated.has(key)) contradictions.push(`${provider}/${key}`);
    }
  }
  assert.deepEqual(
    contradictions,
    [],
    'popularModelKeys 与 excludedModelKeys 互斥 —— 策展优先，排除清单不得再列同一个 key',
  );
});

test('P163: 已策展的模型数与已排除的模型数之和等于数据集模型总数', () => {
  const curatedTotal = Object.values(popular).reduce((n, a) => n + a.length, 0);
  const excludedTotal = Object.values(excluded).reduce((n, a) => n + a.length, 0);
  assert.equal(curatedTotal, CURATED_COUNT, '已策展模型数变了');
  assert.equal(excludedTotal, EXCLUDED_COUNT, '已排除模型数变了');
  assert.equal(datasetTotal(), DATASET_MODEL_COUNT, '数据集里的 LLM 模型数变了');
  assert.equal(
    curatedTotal + excludedTotal,
    DATASET_MODEL_COUNT,
    '策展 + 排除 必须等于数据集全集 —— 否则有模型两边都没有，或两边都有',
  );
});

// ---------------------------------------------------------------------------
// 3. 陈旧记录
// ---------------------------------------------------------------------------

test('P163: 已策展的 key 必须真实存在于数据集（陈旧策展）', () => {
  const stale: string[] = [];
  for (const provider of PROVIDERS) {
    const available = new Set(datasetKeys(provider));
    for (const key of popular[provider] ?? []) {
      if (!available.has(key)) stale.push(`${provider}/${key}`);
    }
  }
  assert.deepEqual(
    stale,
    [],
    'popularModelKeys 里的 key 在数据集里不存在 —— 定价 bot 刷新后这里没跟上，' +
      '用户会选到一个算不出价的模型',
  );
});

test('P163: 已排除的 key 必须真实存在于数据集（陈旧排除记录）', () => {
  const stale: string[] = [];
  for (const provider of PROVIDERS) {
    const available = new Set(datasetKeys(provider));
    for (const key of excluded[provider] ?? []) {
      if (!available.has(key)) stale.push(`${provider}/${key}`);
    }
  }
  assert.deepEqual(
    stale,
    [],
    'excludedModelKeys 里的 key 在数据集里不存在 —— 数据集已经删掉它了，排除记录该一起清掉',
  );
});

// ---------------------------------------------------------------------------
// 4. 对比页 flagship
// ---------------------------------------------------------------------------

test('P163: 比较页的 flagship 必须存在于数据集且在交互态清单里', () => {
  for (const [provider, key] of Object.entries(flagships)) {
    const available = new Set(datasetKeys(provider));
    assert.ok(
      available.has(key),
      `比较页 flagship ${provider}/${key} 不在数据集里 —— 定价 bot 刷新后这里没跟上`,
    );
    assert.ok(
      (popular[provider] ?? []).includes(key),
      `比较页 flagship ${provider}/${key} 不在交互态清单里 —— 对比页能定价一个 provider 页选不到的模型`,
    );
  }
});

// ---------------------------------------------------------------------------
// 5. 族规则：双向校验
// ---------------------------------------------------------------------------

test('P163: 每个被排除的模型都必须被至少一个族解释（不许有孤儿记录）', () => {
  const unexplained: string[] = [];
  for (const provider of PROVIDERS) {
    for (const key of excluded[provider] ?? []) {
      const hit = families.some(
        (f) => f.provider === provider && matchesExcludedFamily(f.pattern, key),
      );
      if (!hit) unexplained.push(`${provider}/${key}`);
    }
  }
  assert.deepEqual(
    unexplained,
    [],
    '这些被排除的模型没有归入任何排除族 —— 「为什么不做交互态」没有记录下来，' +
      '下一个模型就会沿用同样的沉默。' +
      `未归族模型（${unexplained.length} 个）：\n` +
      unexplained.join('\n'),
  );
});

test('P163: 每个排除族都必须命中至少一个被排除的模型（不许有死族）', () => {
  const dead: string[] = [];
  for (const f of families) {
    const keys = excluded[f.provider] ?? [];
    if (!keys.some((key) => matchesExcludedFamily(f.pattern, key))) {
      dead.push(`${f.provider}/${f.pattern}`);
    }
  }
  assert.deepEqual(
    dead,
    [],
    '这些排除族一个被排除的模型都没命中 —— 死族会让人以为「这类模型已经有决定了」',
  );
});

test('P163: 排除族的 provider 必须合法且 reason 不能是空话', () => {
  assert.equal(families.length, FAMILY_COUNT, '排除族数量变了');
  for (const f of families) {
    assert.ok(
      (PROVIDERS as readonly string[]).includes(f.provider),
      `排除族 provider 非法: ${f.provider}`,
    );
    assert.ok(f.pattern.length > 0, `排除族 ${f.provider} 的 pattern 为空`);
    assert.ok(
      typeof f.reason === 'string' && f.reason.length >= 10,
      `排除族 ${f.provider}/${f.pattern} 的 reason 太短 —— 至少要说清「为什么这个品类不进交互态」`,
    );
  }
});

// ---------------------------------------------------------------------------
// 6. glob 语义自测（族的匹配规则被改坏时，上面几条会集体失效）
// ---------------------------------------------------------------------------

test('P163: 排除族的 glob 语义是「* 匹配任意子串」（含中间与空串）', () => {
  assert.equal(matchesExcludedFamily('gpt-4*', 'gpt-4o-mini'), true, '* 应能匹配中间');
  assert.equal(matchesExcludedFamily('gpt-4*', 'gpt-4'), true, '* 应能匹配空串');
  assert.equal(matchesExcludedFamily('gpt-4*', 'gpt-5'), false, '前缀不符时不应命中');
  assert.equal(matchesExcludedFamily('*-5-1', 'claude-mythos-5-1'), true, '前置 * 应能匹配');
  assert.equal(matchesExcludedFamily('gpt-4', 'gpt-4'), true, '无 * 时应精确匹配');
  assert.equal(matchesExcludedFamily('gpt-4', 'gpt-4o'), false, '无 * 时不应前缀匹配');
  assert.equal(
    matchesExcludedFamily('gemini-2.*', 'gemini-2x-flash'),
    false,
    '`.` 不是通配符 —— 家族名里的点必须按字面匹配',
  );
});

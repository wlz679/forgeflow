#!/usr/bin/env node
// P166 —— 「修复优先级表 / 达标清单」**数据形状**守卫（source-only）。
//
// 为什么是 source-only（刻意不挂 RUN_BUILD_TESTS 门）
// ----------------------------------------------------
// P153-G1 的教训：把 build 门加在一个**只读数据源**的守卫上，会让它在每一次
// 默认 pnpm check 里被静默跳过 ⇒ 它守的不变量其实从没被真正执行过。
// 本守卫只读 src/data/**，不需要 build ⇒ 不该挂门。
//
// 它盯住这些失败模式（一条断言只守一件事）：
//   1. 试点名单与「实际带新形态内容的主题集合」必须**集合相等**（不是子集）
//   2. 每个试点主题的 en + zh 都必须有 fixPriority 与 readinessChecklist
//   3. fixPriority 至少 3 行（每行一个指标）
//   4. priority 必须 1..N 连续且不重复（"先修哪个"要真的有顺序）
//   5. 每行字段非空且达长度下限（按字段性质分级）
//   6. readinessChecklist 至少 4 项
//   7. step 编号与该主题 howToApply 里的步骤编号**集合相等**
//   8. 每项的 gate / blockIf 非空，且 gate 必须含数字
//   9. B 类主题：每百万 token 的价格必须走 live token（手写价格每周随 bot 漂移）
//  10. 写死的区块标题必须与 i18n 真值一致（改了 i18n 就要来这里同步）
//
// ⚠️ 期望值全部是本文件里**独立写死**的字面量，不从被测模块导出常量。
// Build dependency: none (source-only).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import { TOPIC_PRIORITY_CONTENT, PRIORITY_TOPICS } from '../src/data/topic-priority/index.ts';
import { TOPIC_GUIDE_CONTENT } from '../src/data/topic-content.ts';
import { TOPICS } from '../src/data/topics.ts';
import { t } from '../src/i18n/index.ts';
// 价格纪律分档的**唯一真相源**（tests/_topic-priority-policy.ts）：
// 手写单价的形状 + 「哪些主题走严格档」都在那里 ⇒ 本文件不自己维护清单。
import { MODEL_PRICE_TOPICS, isModelPriceTopic, handTypedPrices } from './_topic-priority-policy.ts';

/**
 * 期望名单 = **topics.ts 里 tier-1 的全部主题**（派生，不是手写清单）。
 *
 * ⭐ 为什么派生：P166 铺开 42 个主题后，手写 45 个 id 的清单必然与
 *   `src/data/topic-priority/index.ts` 的名单形成**第二份真相源**
 *   （P164 的教训：真相源只管住主数据文件、没管住脚本 ⇒ 开了第二份 ⇒ 既有守卫当场变红）。
 *
 * ⭐ 为什么这仍然是「独立」期望值：`topics.ts` **不是被测模块** ——
 *   被测模块是 `src/data/topic-priority/`（本守卫读它）。拿另一个真相源来比，
 *   比的是「名单对不对」，不是「内容对不对」⇒ 守的是**覆盖完整性**。
 *
 * ⚠️ 「comparison」层主题（4 个）**不做**新形态 —— 它们渲染的是 compare 页，
 *   不是 benchmark / guide 页 ⇒ 不在名单里（断言里会显式排除）。
 */
const EXPECTED_TOPIC_IDS = TOPICS.filter((t) => t.tier === 1).map((t) => t.id).sort();

/** 独立写死：修复优先级表最少行数 */
const MIN_FIX_ROWS = 3;

/** 独立写死：达标清单最少项数 */
const MIN_CHECKLIST_ITEMS = 4;

/**
 * 独立写死：各字段的最短长度（**按字段性质分级** —— 沿用既有
 * topic-content-coverage-guard 的分级思路：把「指标名」和「散文」用同一个
 * 阈值卡会要么放水要么误杀）。
 */
const MIN_METRIC_LENGTH = 20;    // metric / label：短标签
const MIN_PROSE_LENGTH = 150;    // fixFirst / alsoMoves / backfire / intro：散文
const MIN_GATE_LENGTH = 30;      // gate：达标线（还必须含数字）
const MIN_BLOCK_LENGTH = 80;     // blockIf：不达标会卡在哪

/** 独立写死：写死的区块标题（必须与 i18n 一致 —— 另有一条断言核对） */
const BENCH_HEADING = { en: 'What to fix first', zh: '先修哪个' } as const;
const GUIDE_HEADING = { en: 'Readiness checklist', zh: '达标清单' } as const;

const LANGS = ['en', 'zh'] as const;

/** 独立写死：怎么从 howToApply 里抠出步骤编号（en 用 "Step N"，zh 用 "步骤 N"） */
const STEP_PATTERNS: Record<'en' | 'zh', RegExp> = {
  en: /Step\s+(\d+)/g,
  zh: /步骤\s*(\d+)/g,
};

/** 从 howToApply 正文里抽出步骤编号（保持出现顺序、去重） */
function stepNumbers(text: string, lang: 'en' | 'zh'): string[] {
  const seen: string[] = [];
  for (const m of text.matchAll(STEP_PATTERNS[lang])) {
    if (!seen.includes(m[1])) seen.push(m[1]);
  }
  return seen;
}

/** 把一个对象里的所有字符串值收集起来（含嵌套数组） */
function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap(collectStrings);
  }
  return [];
}

// ---------------------------------------------------------------------------
// 1. 名单与全集
// ---------------------------------------------------------------------------

test('P166: 装配名单必须等于 topics.ts 的 tier-1 全集（不多不少）', () => {
  assert.deepEqual(
    [...PRIORITY_TOPICS].sort(),
    [...EXPECTED_TOPIC_IDS],
    'src/data/topic-priority/index.ts 的 PRIORITY_TOPICS 与 topics.ts 的 tier-1 全集不一致 —— ' +
      '要么漏铺了一个主题，要么多登记了一个',
  );
});

test('P166: 带新形态内容的主题集合必须与装配名单**集合相等**（不许多也不许少）', () => {
  assert.deepEqual(
    Object.keys(TOPIC_PRIORITY_CONTENT).sort(),
    [...EXPECTED_TOPIC_IDS],
    'TOPIC_PRIORITY_CONTENT 的主题集合与装配名单不相等 —— ' +
      '要么多了一个没登记的主题，要么漏了一个（半铺开会让「全覆盖」这个词失去意义）',
  );
});

// ---------------------------------------------------------------------------
// 2-8. 数据形状
// ---------------------------------------------------------------------------

test('P166: 每个主题的 en 与 zh 都必须有 fixPriority 与 readinessChecklist', () => {
  const missing: string[] = [];
  for (const id of EXPECTED_TOPIC_IDS) {
    const p = TOPIC_PRIORITY_CONTENT[id];
    if (!p) {
      missing.push(id + '：整个主题缺失');
      continue;
    }
    for (const lang of LANGS) {
      if (!p.fixPriority) missing.push(id + '.fixPriority.' + lang);
      if (!p.readinessChecklist) missing.push(id + '.readinessChecklist.' + lang);
    }
  }
  assert.deepEqual(missing, [], '缺失的新形态段（' + missing.length + ' 个）：\n' + missing.join('\n'));
});

test('P166: 修复优先级表至少 3 行（每个主题 × 每种语言）', () => {
  const problems: string[] = [];
  for (const id of EXPECTED_TOPIC_IDS) {
    const p = TOPIC_PRIORITY_CONTENT[id];
    if (!p) continue;
    for (const lang of LANGS) {
      const n = p.fixPriority[lang]?.rows?.length ?? 0;
      if (n < MIN_FIX_ROWS) problems.push(id + '.' + lang + '：' + n + ' 行（< ' + MIN_FIX_ROWS + '）');
    }
  }
  assert.deepEqual(problems, [], '修复优先级表行数不足：\n' + problems.join('\n'));
});

test('P166: priority 必须是 1..N 连续且不重复', () => {
  const problems: string[] = [];
  for (const id of EXPECTED_TOPIC_IDS) {
    const p = TOPIC_PRIORITY_CONTENT[id];
    if (!p) continue;
    for (const lang of LANGS) {
      const rows = p.fixPriority[lang]?.rows ?? [];
      const got = rows.map((r) => r.priority);
      const want = Array.from({ length: rows.length }, (_, i) => i + 1);
      if (JSON.stringify(got) !== JSON.stringify(want)) {
        problems.push(id + '.' + lang + '：priority=' + JSON.stringify(got) + '，期望 ' + JSON.stringify(want));
      }
    }
  }
  assert.deepEqual(problems, [], 'priority 不连续或有重复：\n' + problems.join('\n'));
});

test('P166: 修复优先级表每行的字段都必须非空且达长度下限', () => {
  const problems: string[] = [];
  for (const id of EXPECTED_TOPIC_IDS) {
    const p = TOPIC_PRIORITY_CONTENT[id];
    if (!p) continue;
    for (const lang of LANGS) {
      const intro = (p.fixPriority[lang]?.intro ?? '').trim();
      if (intro.length < MIN_PROSE_LENGTH) {
        problems.push(id + '.' + lang + '.fixPriority.intro：' + intro.length + ' 字符（< ' + MIN_PROSE_LENGTH + '）');
      }
      for (const row of p.fixPriority[lang]?.rows ?? []) {
        const metric = (row.metric ?? '').trim();
        if (metric.length < MIN_METRIC_LENGTH) {
          problems.push(id + '.' + lang + '.fixPriority.metric：' + metric.length + ' 字符（< ' + MIN_METRIC_LENGTH + '）');
        }
        for (const field of ['fixFirst', 'alsoMoves', 'backfire'] as const) {
          const v = (row[field] ?? '').trim();
          if (v.length < MIN_PROSE_LENGTH) {
            problems.push(id + '.' + lang + '.fixPriority.' + field + '：' + v.length + ' 字符（< ' + MIN_PROSE_LENGTH + '）');
          }
        }
      }
    }
  }
  assert.deepEqual(problems, [], '字段为空或过短（' + problems.length + ' 处）：\n' + problems.join('\n'));
});

test('P166: 达标清单至少 4 项（每个主题 × 每种语言）', () => {
  const problems: string[] = [];
  for (const id of EXPECTED_TOPIC_IDS) {
    const p = TOPIC_PRIORITY_CONTENT[id];
    if (!p) continue;
    for (const lang of LANGS) {
      const n = p.readinessChecklist[lang]?.items?.length ?? 0;
      if (n < MIN_CHECKLIST_ITEMS) problems.push(id + '.' + lang + '：' + n + ' 项（< ' + MIN_CHECKLIST_ITEMS + '）');
    }
  }
  assert.deepEqual(problems, [], '达标清单项数不足：\n' + problems.join('\n'));
});

test('P166: 达标清单的 step 编号必须与该主题 howToApply 里的步骤编号集合相等', () => {
  const problems: string[] = [];
  for (const id of EXPECTED_TOPIC_IDS) {
    const p = TOPIC_PRIORITY_CONTENT[id];
    const guide = TOPIC_GUIDE_CONTENT[id];
    if (!p || !guide) continue;
    for (const lang of LANGS) {
      const want = stepNumbers(guide[lang]?.howToApply ?? '', lang);
      const got = (p.readinessChecklist[lang]?.items ?? []).map((i) => String(i.step));
      const uniqGot = got.filter((v, i) => got.indexOf(v) === i);
      if (JSON.stringify([...uniqGot].sort()) !== JSON.stringify([...want].sort())) {
        problems.push(id + '.' + lang + '：清单=' + JSON.stringify(uniqGot) + '，howToApply=' + JSON.stringify(want));
      }
    }
  }
  assert.deepEqual(problems, [], '步骤编号对不上（凭空多一步或漏一步都会让「不达标别往下走」失效）：\n' + problems.join('\n'));
});

test('P166: 达标清单每项的 label / gate / blockIf 都必须非空且达长度下限', () => {
  const problems: string[] = [];
  for (const id of EXPECTED_TOPIC_IDS) {
    const p = TOPIC_PRIORITY_CONTENT[id];
    if (!p) continue;
    for (const lang of LANGS) {
      const intro = (p.readinessChecklist[lang]?.intro ?? '').trim();
      if (intro.length < MIN_PROSE_LENGTH) {
        problems.push(id + '.' + lang + '.readinessChecklist.intro：' + intro.length + ' 字符（< ' + MIN_PROSE_LENGTH + '）');
      }
      for (const item of p.readinessChecklist[lang]?.items ?? []) {
        const label = (item.label ?? '').trim();
        if (label.length < MIN_METRIC_LENGTH) {
          problems.push(id + '.' + lang + '.readinessChecklist.label：' + label.length + ' 字符（< ' + MIN_METRIC_LENGTH + '）');
        }
        const gate = (item.gate ?? '').trim();
        if (gate.length < MIN_GATE_LENGTH) {
          problems.push(id + '.' + lang + '.readinessChecklist.gate：' + gate.length + ' 字符（< ' + MIN_GATE_LENGTH + '）');
        }
        if (gate && !/\d/.test(gate)) {
          problems.push(id + '.' + lang + '.readinessChecklist.gate：达标线里没有数字 => ' + gate.slice(0, 60));
        }
        const blockIf = (item.blockIf ?? '').trim();
        if (blockIf.length < MIN_BLOCK_LENGTH) {
          problems.push(id + '.' + lang + '.readinessChecklist.blockIf：' + blockIf.length + ' 字符（< ' + MIN_BLOCK_LENGTH + '）');
        }
      }
    }
  }
  assert.deepEqual(problems, [], '达标清单字段为空或过短（' + problems.length + ' 处）：\n' + problems.join('\n'));
});

// ---------------------------------------------------------------------------
// 9. 价格纪律（B 类主题）
// ---------------------------------------------------------------------------

test('P166: 严格档主题必须真的用到 live token（否则「价格走派生」是空话）', () => {
  // ⚠️ 严格档主题来自 topics.ts 的 letterId 派生（不是手写清单）⇒
  //    新增一个 B 类主题时它会自动进这条断言，不靠人记得加一行。
  const strictTopics = Object.keys(TOPIC_PRIORITY_CONTENT).filter(isModelPriceTopic);
  assert.ok(strictTopics.length > 0, '没有任何主题落在严格档 —— 分档规则坏了');
  for (const topicId of strictTopics) {
    const p = TOPIC_PRIORITY_CONTENT[topicId];
    assert.ok(p, topicId + ' 的新形态内容缺失');
    const texts = collectStrings(p);
    const tokenHits = texts.reduce((n, s) => n + (s.match(/\{\{live/g) || []).length, 0);
    assert.ok(tokenHits > 0, topicId + ' 落在严格档却一个 live token 都没有 —— 价格会被 bot 每周漂移');
  }
});

test('P166: ⭐ 手写单价检测器本身必须是活的（自检，不是空转）', () => {
  // ⭐ 为什么必须有这条：一个「检查违规」的断言，在**没有违规时本来就是绿的**
  //   ⇒ 检测器坏了（永远返回空）时守卫照样绿。⇒ 必须单独造一个**已知违规**
  //   的样本，断言检测器看得见它。变异台子 M5 正是靠这条抓住的。
  //
  // 样本 1：裸单价 ⇒ 必须被抓
  assert.deepEqual(
    handTypedPrices('the list price is $15 per request'),
    ['$15'],
    '手写单价检测器看不见裸单价 —— 检测器坏了',
  );
  // 样本 2：带 K/M/B 后缀的聚合支出 ⇒ 必须放行（P158 的同一条约定）
  assert.deepEqual(
    handTypedPrices('the yearly spend is $50K'),
    [],
    '带 K/M/B 后缀的聚合支出被误判成单价 —— 检测器过严会把编辑逼向错误形态',
  );
  // 样本 3：live token 里的数字不该被当成手写单价
  assert.deepEqual(
    handTypedPrices('list input is {{liveIn:openai/gpt-5}} per 1M tokens'),
    [],
    'live token 被误判成手写单价 —— 检测器没先剥掉 token',
  );
  // 样本 4：token 与手写价同时出现时，只报手写的那一个
  assert.deepEqual(
    handTypedPrices('list input is {{liveIn:openai/gpt-5}} but the old note said $12'),
    ['$12'],
    'token 与手写价混排时，检测器只认出了其中一种',
  );
});

test('P166: 严格档主题不许有手写单价（不限于「每百万 token」语境）', () => {
  // ⚠️ 旧版这条只查「带 1M / per million / 每百万字样」的句子 ⇒ 一句
  //    "the list price is $15" 能溜过去。⇒ 现在查**整段**里所有手写单价。
  //    形状与分档都来自共享真相源（P158 的同一条约定：不带 K/M/B 后缀 = 单价）。
  const problems: string[] = [];
  for (const topicId of Object.keys(TOPIC_PRIORITY_CONTENT)) {
    if (!isModelPriceTopic(topicId)) continue;
    const p = TOPIC_PRIORITY_CONTENT[topicId]!;
    for (const lang of LANGS) {
      for (const s of collectStrings(p)) {
        for (const price of handTypedPrices(s)) {
          problems.push(topicId + '/' + lang + '：手写单价 ' + price + ' => ' + s.slice(0, 90));
        }
      }
    }
  }
  assert.deepEqual(problems, [], '手写价格会随每周的定价 bot 漂移：\n' + problems.join('\n'));
});

test('P166: 严格档集合必须由 topics.ts 派生（不是手写清单）', () => {
  // 防「又开了第二份清单」：严格档里必须包含**全部** B 分类 tier-1 主题。
  const bTier1 = TOPICS.filter((t) => t.letterId === 'B' && t.tier === 1).map((t) => t.id).sort();
  assert.ok(bTier1.length > 0, 'topics.ts 里没有 B 分类 tier-1 主题 —— 分档规则坏了');
  for (const id of bTier1) {
    assert.ok(MODEL_PRICE_TOPICS.has(id), id + ' 是 B 分类主题（讲市场价）却不在严格档里 ⇒ 手写单价会漏过');
  }
});

// ---------------------------------------------------------------------------
// 10. 写死的标题与 i18n 真值一致
// ---------------------------------------------------------------------------

test('P166: 守卫里写死的区块标题必须与 i18n 真值一致', () => {
  assert.equal(t('topic.benchmark.h2.fix_priority', 'en'), BENCH_HEADING.en, 'en 的修复优先级表标题变了，守卫要同步');
  assert.equal(t('topic.benchmark.h2.fix_priority', 'zh'), BENCH_HEADING.zh, 'zh 的修复优先级表标题变了，守卫要同步');
  assert.equal(t('topic.guide.h2.readiness_checklist', 'en'), GUIDE_HEADING.en, 'en 的达标清单标题变了，守卫要同步');
  assert.equal(t('topic.guide.h2.readiness_checklist', 'zh'), GUIDE_HEADING.zh, 'zh 的达标清单标题变了，守卫要同步');
});

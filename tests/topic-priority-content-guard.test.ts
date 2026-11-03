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

import { TOPIC_PRIORITY_CONTENT, PILOT_PRIORITY_TOPICS } from '../src/data/topic-priority/index.ts';
import { TOPIC_GUIDE_CONTENT } from '../src/data/topic-content.ts';
import { t } from '../src/i18n/index.ts';

/** 独立写死：试点主题名单（1 个 B 类 + 1 个 C 类 + 1 个 R 类） */
const EXPECTED_PILOT = ['llm-api-cost-optimization', 'customer-acquisition-cost', 'net-revenue-retention'];

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

test('P166: 试点名单与本文件写死的名单一致', () => {
  assert.deepEqual(
    [...PILOT_PRIORITY_TOPICS].sort(),
    [...EXPECTED_PILOT].sort(),
    'src/data/topic-priority/index.ts 的 PILOT_PRIORITY_TOPICS 与守卫写死的名单不一致',
  );
});

test('P166: 带新形态内容的主题集合必须与试点名单**集合相等**（不许多也不许少）', () => {
  assert.deepEqual(
    Object.keys(TOPIC_PRIORITY_CONTENT).sort(),
    [...EXPECTED_PILOT].sort(),
    'TOPIC_PRIORITY_CONTENT 的主题集合与试点名单不相等 —— ' +
      '要么多了一个没登记的主题，要么漏了一个（半铺开会让「试点」这个词失去意义）',
  );
});

// ---------------------------------------------------------------------------
// 2-8. 数据形状
// ---------------------------------------------------------------------------

test('P166: 每个试点主题的 en 与 zh 都必须有 fixPriority 与 readinessChecklist', () => {
  const missing: string[] = [];
  for (const id of EXPECTED_PILOT) {
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

test('P166: 修复优先级表至少 3 行（每个试点主题 × 每种语言）', () => {
  const problems: string[] = [];
  for (const id of EXPECTED_PILOT) {
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
  for (const id of EXPECTED_PILOT) {
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
  for (const id of EXPECTED_PILOT) {
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

test('P166: 达标清单至少 4 项（每个试点主题 × 每种语言）', () => {
  const problems: string[] = [];
  for (const id of EXPECTED_PILOT) {
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
  for (const id of EXPECTED_PILOT) {
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
  for (const id of EXPECTED_PILOT) {
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

test('P166: B 类主题必须真的用到 live token（否则「价格走派生」是空话）', () => {
  const p = TOPIC_PRIORITY_CONTENT['llm-api-cost-optimization'];
  assert.ok(p, 'llm-api-cost-optimization 的新形态内容缺失');
  const texts = collectStrings(p);
  const tokenHits = texts.reduce((n, s) => n + (s.match(/\{\{live/g) || []).length, 0);
  assert.ok(tokenHits > 0, 'B 类主题的新形态内容里一个 live token 都没有 —— 价格会被 bot 每周漂移');
});

test('P166: B 类主题里「每百万 token 的价格」必须由 live token 派生（不许手写）', () => {
  const p = TOPIC_PRIORITY_CONTENT['llm-api-cost-optimization'];
  assert.ok(p, 'llm-api-cost-optimization 的新形态内容缺失');
  const problems: string[] = [];
  for (const lang of LANGS) {
    for (const s of collectStrings(p)) {
      const isPerMillion = /1M|per million|每百万/i.test(s);
      if (!isPerMillion) continue;
      const withoutTokens = s.replace(/\{\{live[^}]*\}/g, '');
      if (/\$\s?\d/.test(withoutTokens)) {
        problems.push(lang + '：手写了每百万 token 的价格 => ' + s.slice(0, 90));
      }
    }
  }
  assert.deepEqual(problems, [], '手写价格会随每周的定价 bot 漂移：\n' + problems.join('\n'));
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

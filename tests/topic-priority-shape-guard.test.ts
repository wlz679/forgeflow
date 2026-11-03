#!/usr/bin/env node
// P166 —— 「修复优先级表 / 达标清单」**渲染形状**守卫（build-dep）。
//
// 收集器与它的**能力自检**在别处：
//   · tests/_topic-priority-collector.ts —— 收集器本体（共享 helper）
//   · tests/topic-priority-collector-guard.test.ts —— 收集器的能力自检（source-only）
// ⇒ 这里只查**渲染产物**。
//
// 它盯住这些失败模式（一条断言只守一件事）：
//   1. 每个试点主题 × 每种语言的基准页：区块标题在、表格在、>= 3 行数据行、
//      5 列、每格非空。
//   2. 每个试点主题 × 每种语言的指南页：区块标题在、表格在、>= 4 行数据行、
//      4 列、每格非空、第 1 列是「第 N 步 / Step N」且编号 1..N 连续。
//   3. 非试点主题的页面**不得**出现新区块（新区段只随数据出现 ⇒ 非试点页
//      产物字节不变）。
//   4. 一次报出全部问题（不首个失败即抛 —— P165 的教训：跨对象断言必须
//      「收集全部问题 → 一次报出」，否则后面的失败全不可见）。
//
// ⚠️ 期望值全部是本文件里**独立写死**的字面量。
// Build dependency: yes (needs a built dist/).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TOPICS } from '../src/data/topics.ts';
import { categories } from '../src/data/categories.ts';
import { buildWithEnv } from './_supabase-build-helper.ts';
import { scopeAfterHeading, extractTable, stepNumberOf } from './_topic-priority-collector.ts';

const root = resolve(import.meta.dirname, '..');

if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const LANGS = ['en', 'zh'] as const;

/** 独立写死：试点主题名单 */
const EXPECTED_PILOT = ['llm-api-cost-optimization', 'customer-acquisition-cost', 'net-revenue-retention'];

/** 独立写死：各语言的区块标题（必须与 i18n 一致 —— source-only 守卫另有一条核对） */
const BENCH_HEADING = { en: 'What to fix first', zh: '先修哪个' } as const;
const GUIDE_HEADING = { en: 'Readiness checklist', zh: '达标清单' } as const;

/** 独立写死：修复优先级表的最少数据行数与列数 */
const MIN_BENCH_BODY_ROWS = 3;
const BENCH_COLS = 5;

/** 独立写死：达标清单的最少数据行数与列数 */
const MIN_GUIDE_BODY_ROWS = 4;
const GUIDE_COLS = 4;

test('P166: 试点主题的基准页渲染出「修复优先级表」，指南页渲染出「达标清单」', () => {
  buildWithEnv({});

  const violations: string[] = [];

  for (const lang of LANGS) {
    for (const topicId of EXPECTED_PILOT) {
      const topic = TOPICS.find((x) => x.id === topicId);
      if (!topic) {
        violations.push(topicId + '：topics.ts 里没有这个主题');
        continue;
      }
      const cat = categories.find((c) => c.id === topic.letterId);
      const letterSlug = cat ? cat.slug : topic.letterId;

      // ---- 基准页：修复优先级表 ----
      const benchPath = resolve(root, 'dist', lang, letterSlug, topicId + '-benchmark', 'index.html');
      if (!existsSync(benchPath)) {
        violations.push(lang + '/' + topicId + '-benchmark：产物缺失');
      } else {
        const html = readFileSync(benchPath, 'utf-8');
        const scope = scopeAfterHeading(html, BENCH_HEADING[lang]);
        if (!scope) {
          violations.push(lang + '/' + topicId + '-benchmark：找不到「' + BENCH_HEADING[lang] + '」区块');
        } else {
          const table = extractTable(scope);
          if (table.body.length < MIN_BENCH_BODY_ROWS) {
            violations.push(
              lang + '/' + topicId + '-benchmark：修复优先级表只有 ' + table.body.length + ' 行数据（< ' + MIN_BENCH_BODY_ROWS + '）',
            );
          }
          if (table.head.length !== 1 || table.head[0].length !== BENCH_COLS) {
            violations.push(
              lang + '/' + topicId + '-benchmark：表头应是 1 行 × ' + BENCH_COLS + ' 列，实际 ' +
                table.head.length + ' 行 × ' + (table.head[0] ? table.head[0].length : 0) + ' 列',
            );
          }
          for (const row of table.body) {
            if (row.length !== BENCH_COLS) {
              violations.push(lang + '/' + topicId + '-benchmark：有数据行是 ' + row.length + ' 列（应 ' + BENCH_COLS + '）');
              continue;
            }
            for (let i = 0; i < row.length; i++) {
              if (!row[i]) violations.push(lang + '/' + topicId + '-benchmark：有空单元格（第 ' + (i + 1) + ' 列）');
            }
          }
        }
      }

      // ---- 指南页：达标清单 ----
      const guidePath = resolve(root, 'dist', lang, letterSlug, topicId + '-guide', 'index.html');
      if (!existsSync(guidePath)) {
        violations.push(lang + '/' + topicId + '-guide：产物缺失');
      } else {
        const html = readFileSync(guidePath, 'utf-8');
        const scope = scopeAfterHeading(html, GUIDE_HEADING[lang]);
        if (!scope) {
          violations.push(lang + '/' + topicId + '-guide：找不到「' + GUIDE_HEADING[lang] + '」区块');
        } else {
          const table = extractTable(scope);
          if (table.body.length < MIN_GUIDE_BODY_ROWS) {
            violations.push(
              lang + '/' + topicId + '-guide：达标清单只有 ' + table.body.length + ' 行数据（< ' + MIN_GUIDE_BODY_ROWS + '）',
            );
          }
          if (table.head.length !== 1 || table.head[0].length !== GUIDE_COLS) {
            violations.push(
              lang + '/' + topicId + '-guide：表头应是 1 行 × ' + GUIDE_COLS + ' 列，实际 ' +
                table.head.length + ' 行 × ' + (table.head[0] ? table.head[0].length : 0) + ' 列',
            );
          }
          const steps: number[] = [];
          for (const row of table.body) {
            if (row.length !== GUIDE_COLS) {
              violations.push(lang + '/' + topicId + '-guide：有数据行是 ' + row.length + ' 列（应 ' + GUIDE_COLS + '）');
              continue;
            }
            for (let i = 0; i < row.length; i++) {
              if (!row[i]) violations.push(lang + '/' + topicId + '-guide：有空单元格（第 ' + (i + 1) + ' 列）');
            }
            const n = stepNumberOf(row[0]);
            if (n === null) {
              violations.push(lang + '/' + topicId + '-guide：第 1 列不是「Step N / 第 N 步」=> ' + row[0]);
            } else {
              steps.push(n);
            }
          }
          const want = Array.from({ length: steps.length }, (_, i) => i + 1);
          if (JSON.stringify(steps) !== JSON.stringify(want)) {
            violations.push(lang + '/' + topicId + '-guide：步骤编号=' + JSON.stringify(steps) + '，期望 ' + JSON.stringify(want));
          }
        }
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    '主题页新形态渲染问题（' + violations.length + ' 处）：\n' + violations.map((v) => '  - ' + v).join('\n'),
  );
});

test('P166: 非试点主题的页面不得出现新形态区块（新区段只随数据出现）', () => {
  buildWithEnv({});

  const violations: string[] = [];
  const pilot = new Set<string>(EXPECTED_PILOT);

  for (const lang of LANGS) {
    for (const topic of TOPICS.filter((x) => x.tier === 1)) {
      if (pilot.has(topic.id)) continue;
      const cat = categories.find((cc) => cc.id === topic.letterId);
      const letterSlug = cat ? cat.slug : topic.letterId;

      const benchPath = resolve(root, 'dist', lang, letterSlug, topic.id + '-benchmark', 'index.html');
      if (!existsSync(benchPath)) {
        violations.push(lang + '/' + topic.id + '-benchmark：产物缺失');
      } else {
        const html = readFileSync(benchPath, 'utf-8');
        if (scopeAfterHeading(html, BENCH_HEADING[lang])) {
          violations.push(lang + '/' + topic.id + '-benchmark：出现了「修复优先级表」区块，但该主题不在试点名单里');
        }
      }

      const guidePath = resolve(root, 'dist', lang, letterSlug, topic.id + '-guide', 'index.html');
      if (!existsSync(guidePath)) {
        violations.push(lang + '/' + topic.id + '-guide：产物缺失');
      } else {
        const html = readFileSync(guidePath, 'utf-8');
        if (scopeAfterHeading(html, GUIDE_HEADING[lang])) {
          violations.push(lang + '/' + topic.id + '-guide：出现了「达标清单」区块，但该主题不在试点名单里');
        }
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    '非试点页不该出现新形态区块（' + violations.length + ' 处）：\n' + violations.map((v) => '  - ' + v).join('\n'),
  );
});

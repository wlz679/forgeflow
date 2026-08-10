#!/usr/bin/env node
// P140f-p3-T8 — CI guard for Playbook 6 fields coverage (100 calc engines).
//
// Why this exists:
//   P140f §4.3 Phase 3 requires 100 calc 引擎统一 Playbook 6 字段 metadata
//   (Goal / Input / Output / Constraint / Tool / Memory) + Goal 含"决策"关键词.
//
// 100 engines (95 minimal + 5 demo 完整):
//   csat / roas / cac / churn-rate (saas) / burn-rate: 完整 6 字段
//   其余 95 engine: minimal 6 字段 (placeholder 允许)
//
// 6 non-calculator 引擎 (Phase 1 ship 时未走 -calculator.ts 命名):
//   ai-api-cost-comparison / ai-training-cost-estimator
//   productivity-score / saas-pricing-planner
//   market-size-estimator / revenue-projector
//
// Build dependency: RUN_BUILD_TESTS=1 required (P23b skip-guard pattern).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const ENGINES_DIR = resolve(root, 'src/engines');
const REQUIRED_FIELDS = ['goal', 'input', 'output', 'constraint', 'tool', 'memory'];
const DECISION_KEYWORDS = /决策|decision|该不该|是否/;

// 6 non-calculator engine files (Phase 1 命名例外，T7 reviewer flag).
const NON_CALCULATOR_ENGINE_FILES = new Set([
  'ai-api-cost-comparison.ts',
  'ai-training-cost-estimator.ts',
  'productivity-score.ts',
  'saas-pricing-planner.ts',
  'market-size-estimator.ts',
  'revenue-projector.ts',
]);

function findEngines(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const full = resolve(dir, e);
    if (statSync(full).isDirectory()) {
      out.push(...findEngines(full));
    } else if (e.endsWith('-calculator.ts') || NON_CALCULATOR_ENGINE_FILES.has(e)) {
      out.push(full);
    }
  }
  return out;
}

const engines = findEngines(ENGINES_DIR);

test('100 engine 全部含 Playbook 6 字段 + Goal 含"决策"关键词', () => {
  assert.equal(engines.length, 100, `期望 100 engine, 实际 ${engines.length}`);
  for (const path of engines) {
    const src = readFileSync(path, 'utf8');
    assert.ok(src.includes('playbook:'), `${path} 缺失 playbook 字段`);
    for (const field of REQUIRED_FIELDS) {
      assert.ok(
        new RegExp(`\\b${field}\\s*:`).test(src),
        `${path} 缺失字段 ${field}`,
      );
    }
    // Goal 字段含"决策"关键词
    const goalMatch = src.match(/goal\s*:\s*['"]([^'"]+)['"]/);
    assert.ok(goalMatch, `${path} 缺失 goal 字段`);
    assert.ok(
      DECISION_KEYWORDS.test(goalMatch![1]),
      `${path} goal 字段不含"决策/decision/该不该/是否"关键词: "${goalMatch![1]}"`,
    );
  }
});

test('5 demo engine (csat/roas/cac/churn-rate/burn-rate) 含具体决策问题 (非 placeholder)', () => {
  const demoSlugs = ['csat', 'roas', 'cac', 'churn-rate', 'burn-rate'];
  for (const path of engines) {
    const fname = path.split(/[/\\]/).pop()!;
    const slug = fname.replace(/-calculator\.ts$/, '');
    if (!demoSlugs.includes(slug)) continue;

    const src = readFileSync(path, 'utf8');
    // 5 demo 必须含具体决策问题（非 "用户该不该用此计算器的结果作为决策依据" placeholder）
    const goalMatch = src.match(/goal\s*:\s*['"]([^'"]+)['"]/);
    assert.ok(goalMatch, `${path} 缺失 goal`);
    assert.ok(
      !goalMatch![1].includes('用此计算器'),
      `${path} goal 仍是 placeholder, demo 必须含具体决策问题: "${goalMatch![1]}"`,
    );
  }
});

test('guard 元数据正确（100 engine × 6 字段 + Goal 关键词）', () => {
  assert.equal(REQUIRED_FIELDS.length, 6);
  assert.ok(DECISION_KEYWORDS instanceof RegExp);
  assert.equal(NON_CALCULATOR_ENGINE_FILES.size, 6);
});

#!/usr/bin/env node
// P153-G2 — CI guard for the User Value Score admission gate (p140f §15.2).
//
// Why this exists:
//   p140f §15.2 defines the quality bar for every engine:
//     User Value Score ≥ 0.7 → 进入候选池
//     User Value Score < 0.7 → 自动拒绝
//   That bar had never been implemented, so it did not exist. G2 implements it
//   (scripts/score-user-value.mjs → src/data/user-value-scores.json); this
//   file is the guard that keeps the implemented gate honest.
//
// Source-only guard: it reads the tool registry and the score JSON. No
// `pnpm build` required, no RUN_BUILD_TESTS gate — P153-G1 removed those
// gates from the other source-only guards precisely because a dormant guard
// protects nothing.
//
// ── Two iron rules baked into this file ─────────────────────────────────
// 1. Every expected value below is a literal written HERE — never imported
//    from the module under test, and never read out of the JSON being
//    checked. If the threshold came from `payload.threshold`, changing
//    0.7 → 0.5 would keep this guard green: the mutation would be invisible.
// 2. One assertion guards one thing. The checks below are deliberately
//    separate — 存在 / 档位 / 公式 / 算法 / 阈值 — because a check named
//    "阈值拦截" must not also be responsible for proving the scoring formula.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tools } from '../src/data/tools/index.ts';

const root = resolve(import.meta.dirname, '..');
const SCORES_PATH = resolve(root, 'src/data/user-value-scores.json');

// ── The contract, written out as literals ───────────────────────────────

// p140f §15.2 threshold, corrected 2026-10-21 (see P153 §4.1): the original
// product form (a×b×c×d×e÷5) maxes out at 0.2 and could never admit
// anything, so it was read as an arithmetic mean.
const GATE_THRESHOLD = 0.7;

// The five dimensions of p140f §15.2, in the order the formula sums them.
const DIMENSIONS = [
  'functionalValue',
  'ux',
  'advisor',
  'retention',
  'advocacy',
] as const;

// p140f §15.2 scores each dimension on a 0 / 0.5 / 1.0 three-step scale.
const ALLOWED_DIMENSION_VALUES = new Set([0, 0.5, 1]);

// The formula string the score file must declare (contract, not a comment).
const EXPECTED_FORMULA = '(functionalValue + ux + advisor + retention + advocacy) / 5';

// ── The system under test ───────────────────────────────────────────────

interface ScoreEntry {
  functionalValue: number;
  ux: number;
  advisor: number;
  retention: number;
  advocacy: number;
  score: number;
  admitted: boolean;
  signals: unknown;
  reviewedAt: string;
}

interface ScoresPayload {
  version: number;
  threshold: number;
  formula: string;
  generatedBy: string;
  note: string;
  scores: Record<string, ScoreEntry | undefined>;
}

const payload: ScoresPayload = JSON.parse(readFileSync(SCORES_PATH, 'utf8'));

/**
 * Recompute the score from the five stored dimension values.
 *
 * This is an INDEPENDENT re-implementation of the formula, not a call into
 * scripts/score-user-value.mjs — the point is to catch the script's formula
 * drifting away from the contract, which a shared helper cannot do.
 */
function recomputeScore(entry: ScoreEntry): number {
  const sum = DIMENSIONS.reduce((acc, dim) => acc + entry[dim], 0);
  return Math.round((sum / DIMENSIONS.length) * 100) / 100;
}

// ── 1. 分数存在 ─────────────────────────────────────────────────────────

test('每个注册表 slug 都有评分条目（缺一即失败；且没有多余条目）', () => {
  const registrySlugs = tools.map((t) => t.slug);
  const scoreSlugs = Object.keys(payload.scores);

  const missing = registrySlugs.filter((slug) => !(slug in payload.scores));
  const extra = scoreSlugs.filter((slug) => !registrySlugs.includes(slug));

  assert.deepEqual(
    missing,
    [],
    `注册表里的引擎没有评分条目（新增引擎必须同时补评分）: ${missing.join(', ')}`,
  );
  assert.deepEqual(
    extra,
    [],
    `评分表里有注册表中不存在的 slug（引擎文件与注册表漂移）: ${extra.join(', ')}`,
  );
});

// ── 2. 维度档位 ─────────────────────────────────────────────────────────

test('每条评分的 5 个维度分值都落在 {0, 0.5, 1} 三档', () => {
  const violations: string[] = [];

  for (const [slug, entry] of Object.entries(payload.scores)) {
    if (!entry) {
      violations.push(`${slug}: 条目缺失`);
      continue;
    }
    for (const dim of DIMENSIONS) {
      const value = entry[dim];
      if (!ALLOWED_DIMENSION_VALUES.has(value)) {
        violations.push(`${slug}.${dim} = ${value}（不在 {0, 0.5, 1} 内）`);
      }
    }
  }

  assert.deepEqual(violations, [], `维度分值档位非法:\n  ${violations.join('\n  ')}`);
});

// ── 3. 公式契约 ─────────────────────────────────────────────────────────

test('评分文件声明的公式 = p140f §15.2 的算术平均', () => {
  assert.equal(
    payload.formula,
    EXPECTED_FORMULA,
    `formula 字段与契约不符: "${payload.formula}"`,
  );
});

// ── 4. 分数算法 ─────────────────────────────────────────────────────────

test('每条评分的 score 等于 5 维算术平均（测试内独立重算，不信任存储值）', () => {
  const violations: string[] = [];

  for (const [slug, entry] of Object.entries(payload.scores)) {
    if (!entry) continue;
    const recomputed = recomputeScore(entry);
    if (entry.score !== recomputed) {
      violations.push(`${slug}: 存储 score=${entry.score}，重算=${recomputed}`);
    }
  }

  assert.deepEqual(violations, [], `score 与五维平均不一致:\n  ${violations.join('\n  ')}`);
});

// ── 5. 阈值拦截 ─────────────────────────────────────────────────────────

test('阈值用字面量 0.7 判定：threshold 字段是 0.7，且 admitted = 重算分数 ≥ 0.7', () => {
  assert.equal(
    payload.threshold,
    GATE_THRESHOLD,
    `闸门阈值字段被改成 ${payload.threshold}，p140f §15.2 契约是 ${GATE_THRESHOLD}`,
  );

  const violations: string[] = [];

  for (const [slug, entry] of Object.entries(payload.scores)) {
    if (!entry) continue;
    const recomputed = recomputeScore(entry);
    const expected = recomputed >= GATE_THRESHOLD;
    if (entry.admitted !== expected) {
      violations.push(
        `${slug}: admitted=${entry.admitted}，重算分数 ${recomputed} ${expected ? '≥' : '<'} ${GATE_THRESHOLD} → 应为 ${expected}`,
      );
    }
  }

  assert.deepEqual(violations, [], `准入判定与阈值不一致:\n  ${violations.join('\n  ')}`);
});

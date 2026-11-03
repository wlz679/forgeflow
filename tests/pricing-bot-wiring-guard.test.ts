#!/usr/bin/env node
// P166 —— 定价 bot 的**接线守卫**（source-only）。
//
// 为什么需要这个守卫
// ------------------
// P163 的规则守卫守住的是「popular.json 本身对不对」。但 P166 实测发现的根因是
// **更靠上游的一环**：bot 改 popular.json 这件事本身**有没有真的发生**。
//
//   - `scripts/sync-pricing.mjs` 只写 `src/data/ai-pricing.json`；
//   - `ai-pricing-popular.json` 决定「哪些模型进交互态」（用户能选到哪些）；
//   - 两者之间**没有任何一步** ⇒ 新模型静默地只进数据集、不进交互态。
//
// 而唯一会红的东西是 popular-models-rule-guard 里的**写死计数**（245/44/201/42）
// ⇒ 它每周必红，却从没人看见（PR #4 的 CI run 是 `action_required`，jobs=0）。
//
// 所以这里守的不是「数据」，是「**bot 有没有被接进 workflow**」：
//   1. workflow 里有一个真的执行 `scripts/curate-pricing-models.mjs` 的步骤；
//   2. 变更检测包含 `src/data/ai-pricing-popular.json`（否则改了也不会提交）；
//   3. `git add` 包含 `src/data/ai-pricing-popular.json`（否则改了也不会进 PR）；
//   4. `push.paths` 包含 popular.json 与策展脚本（否则改了就再也不会触发 bot）。
//
// ⚠️ 判据要**落在 workflow 文件的对应片段上**，不许把整个文件拼起来查 ——
//    整页查会被别处的同域正确值当挡箭牌（P165 实测过的坑）：比如 `paths:` 里
//    已经有 `ai-pricing.json` 了，整页 grep 'ai-pricing' 会误判为「已接线」。
//
// ⚠️ 期望值全部是本文件里**独立写死**的字面量（路径字符串），不是从被测文件
//    导出的常量。
// Build dependency: none (source-only).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const WORKFLOW = resolve(root, '.github', 'workflows', 'sync-pricing.yml');

const workflow = readFileSync(WORKFLOW, 'utf8');

/** 独立写死：策展脚本的仓库相对路径 */
const CURATE_SCRIPT = 'scripts/curate-pricing-models.mjs';
/** 独立写死：被策展的文件的仓库相对路径 */
const POPULAR_FILE = 'src/data/ai-pricing-popular.json';

/**
 * 抽出 workflow 里**某个 step 的正文**（`run:` 块里的内容）。
 *
 * 为什么要按 step 切：接线守卫的每条判据都必须落在**它自己那一步**上 ——
 * 「策展步骤跑没跑」看 curate step，「diff 路径有没有 popular.json」看 diff step。
 * 把整个文件拼起来查就会出现「别处的同域正确值当挡箭牌」的误判。
 *
 * step 的边界：`- name: <标题>` 开始，到下一个 `- name:` / `- uses:` 为止。
 */
function stepBody(stepName: string): string | null {
  const lines = workflow.split('\n');
  const start = lines.findIndex((l) => l.trim() === `- name: ${stepName}`);
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith('- name:') || t.startsWith('- uses:')) { end = i; break; }
  }
  return lines.slice(start, end).join('\n');
}

// ---------------------------------------------------------------------------
// 1. 策展步骤真的存在且真的跑 bot
// ---------------------------------------------------------------------------

test('P166: workflow 里有一个步骤真的执行 scripts/curate-pricing-models.mjs', () => {
  const body = stepBody('Curate new models into the interactive set (P166)');
  assert.ok(
    body !== null,
    "sync-pricing.yml 里没有名为 'Curate new models into the interactive set (P166)' 的步骤 —— " +
      '新模型进数据集后就没有人做「进不进交互态」的决定，用户在计算器里选不到它。',
  );
  assert.ok(
    body.includes('node scripts/curate-pricing-models.mjs'),
    '策展步骤里没有真的执行 node scripts/curate-pricing-models.mjs —— 步骤名字在，但 bot 没跑。',
  );
});

// ---------------------------------------------------------------------------
// 2. 变更检测包含 popular.json
// ---------------------------------------------------------------------------

test('P166: 变更检测（diff）步骤包含 src/data/ai-pricing-popular.json', () => {
  const body = stepBody('Check for changes');
  assert.ok(body !== null, "sync-pricing.yml 里没有名为 'Check for changes' 的步骤");
  const diffLine = (body ?? '')
    .split('\n')
    .find((l) => l.includes('git diff --quiet'));
  assert.ok(diffLine, '变更检测步骤里没有 git diff --quiet 这一行');
  assert.ok(
    (diffLine ?? '').includes('src/data/ai-pricing-popular.json'),
    'git diff --quiet 没有包含 src/data/ai-pricing-popular.json —— ' +
      '策展步骤改了 popular.json，但 diff 步骤看不见它 ⇒ 改动永远不会被提交。',
  );
});

// ---------------------------------------------------------------------------
// 3. git add 包含 popular.json
// ---------------------------------------------------------------------------

test('P166: 提交步骤的 git add 包含 src/data/ai-pricing-popular.json', () => {
  const body = stepBody('Commit pricing sync to bot branch');
  assert.ok(body !== null, "sync-pricing.yml 里没有名为 'Commit pricing sync to bot branch' 的步骤");
  const addLine = (body ?? '')
    .split('\n')
    .find((l) => l.trim().startsWith('git add '));
  assert.ok(addLine, '提交步骤里没有 git add 这一行');
  assert.ok(
    (addLine ?? '').includes('src/data/ai-pricing-popular.json'),
    'git add 没有包含 src/data/ai-pricing-popular.json —— ' +
      '策展步骤改了 popular.json，但它不会被加进暂存区 ⇒ PR 里看不到这次策展。',
  );
});

// ---------------------------------------------------------------------------
// 4. push.paths 包含 popular.json 与策展脚本
// ---------------------------------------------------------------------------

test('P166: push 的 paths 过滤包含 popular.json 与策展脚本', () => {
  // 只取 `push:` 触发器下面那一段 paths 列表 —— 不许把整个文件拼起来查。
  const lines = workflow.split('\n');
  const pushIdx = lines.findIndex((l) => /^\s{2}push:\s*$/.test(l));
  assert.ok(pushIdx >= 0, 'sync-pricing.yml 里没有 push 触发器');
  const pathsIdx = lines.findIndex((l, i) => i > pushIdx && /^\s{4}paths:\s*$/.test(l));
  assert.ok(pathsIdx >= 0, 'push 触发器下面没有 paths 过滤');

  const entries: string[] = [];
  for (let i = pathsIdx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (!/^\s{6}-\s/.test(l)) break;
    entries.push(l.trim().replace(/^-\s*/, '').replace(/^['\"]|['\"]$/g, ''));
  }

  const missing: string[] = [];
  if (!entries.includes('src/data/ai-pricing-popular.json')) {
    missing.push('src/data/ai-pricing-popular.json');
  }
  if (!entries.includes('scripts/curate-pricing-models.mjs')) {
    missing.push('scripts/curate-pricing-models.mjs');
  }
  assert.deepEqual(
    missing,
    [],
    'push.paths 缺少这些条目 —— 改了它们之后 workflow 再也不会被触发，' +
      '接线就断在这里：' +
      `缺少（${missing.length} 个）：\n` +
      missing.join('\n'),
  );
});

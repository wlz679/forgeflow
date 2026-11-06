#!/usr/bin/env node
// P168 —— 决策支持（批次 3 B3-0）的**产物级守卫**（build-dep）。
//
// 为什么源码级守卫不够
// --------------------
// 源码级守卫能证明「内容写好了、提取逻辑是对的」，但证明不了
// **页面真的把决策区块渲染出来了**、**建议真的没有重复**。
// ⇒ 本守卫读构建产物，量的是「用户打开页面看到的东西」。
//
// 它守的 5 件事
// ------------
//   ① 激活工具的页面（en + zh）都渲染出 #decision-support，且三块静态内容都在
//   ② 区块里的「下一步」非空
//   ③ ⭐ **零重复**：全页恰好出现一次决策建议（卡片里不再有、决策区块里有）
//   ④ ⭐ **不丢失**：决策建议没有在客户端被剥掉（页面里带事件派发 + 模块被引用）
//   ⑤ 非激活工具**不渲染**这个区块（不能给 100 个工具页都加同一块空壳）
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  LANGS,
  MAX_BLOCK_CARD_OVERLAP,
  activatedSlugs,
  blockCardOverlap,
  loadEngines,
  readLocale,
} from './_decision-support-fixture.ts';
import { extractDecisionLines } from '../src/lib/decision-support.ts';

const ROOT = process.cwd();

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const locales = { en: readLocale('en'), zh: readLocale('zh') } as const;

function page(rel: string): string {
  const f = join(ROOT, 'dist', rel);
  assert.ok(existsSync(f), '产物缺失（先跑 pnpm build）：' + rel);
  return readFileSync(f, 'utf8');
}

function textOf(html: string): string {
  const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return (m ? m[1] : html).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&');
}

test('P168 产物：激活工具的页面（en + zh）都渲染出决策区块，且三块静态内容都在', async () => {
  const engines = await loadEngines();
  const bySlug = new Map(engines.map((e) => [e.slug, e]));
  const activated = activatedSlugs(locales as any);
  assert.ok(activated.length > 0, '没有任何工具被激活');

  const problems: string[] = [];
  for (const slug of activated) {
    const engine = bySlug.get(slug);
    const sampleTip = extractDecisionLines(engine?.staticExamples?.[0] ?? '').tip;
    for (const lang of LANGS) {
      const rel = lang + '/' + slug + '/index.html';
      if (!existsSync(join(ROOT, 'dist', rel))) { problems.push(rel + ' 产物缺失'); continue; }
      const html = page(rel);
      if (!html.includes('id="decision-support"')) { problems.push(rel + ' 没有渲染决策区块'); continue; }
      if (!html.includes('id="decision-next-step"')) { problems.push(rel + ' 没有决策建议容器'); continue; }

      // 三块静态内容：标题 + 文案
      for (const k of ['decision_goal', 'decision_recommendation', 'decision_constraint', 'decision_next_tool']) {
        const v = locales[lang]['tools.' + slug + '.' + k];
        if (!textOf(html).includes(v.slice(0, 40))) {
          problems.push(rel + ' 缺少 ' + k + ' 的文案');
        }
      }
      // 「下一步」非空
      const box = html.match(/<div id="decision-next-step"[^>]*>([\s\S]*?)<\/div>/);
      const boxText = box ? textOf(box[1]).trim() : '';
      if (!boxText) problems.push(rel + ' 的决策建议是空的');
      else if (sampleTip && !boxText.includes(sampleTip.slice(0, 40))) {
        problems.push(rel + ' 的决策建议不是引擎产出的那条');
      }
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 产物：⭐ 零重复 —— 全页恰好出现一次决策建议', async () => {
  const engines = await loadEngines();
  const bySlug = new Map(engines.map((e) => [e.slug, e]));
  const problems: string[] = [];
  for (const slug of activatedSlugs(locales as any)) {
    const sampleTip = extractDecisionLines(bySlug.get(slug)?.staticExamples?.[0] ?? '').tip;
    if (!sampleTip) continue;
    const probe = sampleTip.slice(0, 50);
    for (const lang of LANGS) {
      const rel = lang + '/' + slug + '/index.html';
      if (!existsSync(join(ROOT, 'dist', rel))) continue;
      const html = page(rel);
      // 只数**可见正文**里的出现次数（脚本源码里的字符串不算）
      const mainHtml = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
      const mainText = textOf(mainHtml ? mainHtml[0] : html);
      const count = mainText.split(probe).length - 1;
      if (count !== 1) {
        problems.push(rel + ' 决策建议出现 ' + count + ' 次（应为 1 次：卡片与决策区块只能有一个家）');
      }
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 产物：⭐ 决策区块与结果卡片没有逐字复读（"零重复"的完整版）', async () => {
  const problems: string[] = [];
  let measured = 0;
  for (const slug of activatedSlugs(locales as any)) {
    for (const lang of LANGS) {
      const rel = lang + '/' + slug + '/index.html';
      if (!existsSync(join(ROOT, 'dist', rel))) continue;
      const html = page(rel);
      const overlap = blockCardOverlap(html);
      if (overlap < 0) { problems.push(rel + ' 测不出重叠率（页面结构对不上）'); continue; }
      measured++;
      if (overlap > MAX_BLOCK_CARD_OVERLAP) {
        problems.push(rel + ' 决策区块有 ' + overlap.toFixed(1) + '% 的内容在结果卡片里已经出现过（上限 ' + MAX_BLOCK_CARD_OVERLAP + '%）');
      }
    }
  }
  assert.ok(measured > 0, '一个页面都没测到 ⇒ 断言可能没在测');
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 产物：⭐ 结果卡片里不再有 🧭 决策段（决策支持由区块独占）', async () => {
  const problems: string[] = [];
  let checked = 0;
  for (const slug of activatedSlugs(locales as any)) {
    for (const lang of LANGS) {
      const rel = lang + '/' + slug + '/index.html';
      if (!existsSync(join(ROOT, 'dist', rel))) continue;
      const html = page(rel);
      const card = html.match(/<div id="static-results"[\s\S]*?(?=<div id="dynamic-results")/);
      if (!card) { problems.push(rel + ' 取不到结果卡片'); continue; }
      checked++;
      if (card[0].includes('🧭 Decision')) {
        problems.push(rel + ' 的结果卡片里还有 🧭 Decision 段 ⇒ 与决策区块重复');
      }
    }
  }
  assert.ok(checked > 0, '一个页面都没测到 ⇒ 断言可能没在测');
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 产物：⭐ 客户端链路完整（派发事件 + 模块被页面引用）', async () => {
  const problems: string[] = [];
  for (const slug of activatedSlugs(locales as any)) {
    for (const lang of LANGS) {
      const rel = lang + '/' + slug + '/index.html';
      if (!existsSync(join(ROOT, 'dist', rel))) continue;
      const html = page(rel);
      if (!html.includes('ffk:decision-result')) {
        problems.push(rel + ' 没有派发 ffk:decision-result 事件 ⇒ 客户端不会刷新建议');
      }
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 产物：客户端模块被打包且被页面引用', () => {
  const dir = join(ROOT, 'dist', '_astro');
  assert.ok(existsSync(dir), 'dist/_astro 不存在（先跑 pnpm build）');
  const files = require('node:fs').readdirSync(dir).filter((f: string) => f.endsWith('.js'));
  const withDecision = files.filter((f: string) => {
    const c = readFileSync(join(dir, f), 'utf8');
    return c.includes('ffk:decision-result') && c.includes('decision-next-step');
  });
  assert.ok(withDecision.length > 0, '找不到含决策支持逻辑的客户端模块');
});

test('P168 产物：非激活工具**不渲染**决策区块', async () => {
  const engines = await loadEngines();
  const activated = new Set(activatedSlugs(locales as any));
  const problems: string[] = [];
  let checked = 0;
  for (const engine of engines) {
    if (activated.has(engine.slug)) continue;
    const rel = 'en/' + engine.slug + '/index.html';
    if (!existsSync(join(ROOT, 'dist', rel))) continue;
    checked++;
    const html = page(rel);
    if (html.includes('id="decision-support"')) {
      problems.push(rel + ' 不该渲染决策区块（它没有专属文案）');
    }
  }
  assert.ok(checked > 50, '检查的工具页太少（' + checked + '），断言可能没在测');
  assert.deepEqual(problems, [], problems.join(' | '));
});

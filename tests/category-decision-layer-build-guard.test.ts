#!/usr/bin/env node
// P159 — 2.0 批次 1「分类页决策层」守卫（build-dep）。
//
// 为什么需要 build-dep 版本
// -------------------------
// 源码守卫盯的是「数据写得对不对」。但决策层真正要保证的两条性质**只存在于
// 产物里**：
//
//   1. **决策层里一个价格都没有** —— 源码里的 `answers` / `useWhen` 是文本，
//      但页面渲染后会不会混进价格，只有摊开 HTML 才知道。
//   2. **决策层没有制造站内重复内容** —— 「不复制主题页基准表」这条约束在
//      源码里只能查「有没有抄某几段固定文本」，而真正的度量是
//      **分类页与同类别主题页的 5-gram 相似度**。这必须量产物。
//
// 本守卫直接读 dist/ 的 HTML，断言：
//   · 每个已配置决策层的类别 × 每种语言，产物里都有决策层区块；
//   · 决策层区块里 0 个金额串；
//   · 决策层里的工具链接都指向真实存在的页面；
//   · 分类页与该类别**全部**主题页（en + zh）的相似度 ≤ 12%；
//   · 决策层确实把正文加厚了（信息量 ≥ 400 单位）。
//
// 相似度上限 12% 的来历：加决策层**之前**，实测分类页与同类别主题页的
// 相似度最大只有 **0.31%**（en，5-gram Jaccard）。12% 给了 ~40 倍余量，
// 但仍远低于「把主题页那张基准表搬过来」的量级（那会是 30%+）⇒ 一旦有人
// 复制基准表，守卫会红。
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { CATEGORY_DECISION_LAYERS } from '../src/data/category-decision-layers.ts';
import { categories } from '../src/data/categories.ts';
import { TOPICS } from '../src/data/topics.ts';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

/** 相似度上限（5-gram Jaccard，百分比）—— 见文件头的来历说明 */
const MAX_TOPIC_SIMILARITY_PERCENT = 12;

/** 决策层必须给正文增加的信息量单位（Latin word = 1，CJK 字 = 0.5） */
const MIN_ADDED_UNITS = 400;

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'ai-cost-tools', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p159] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

function readPage(path: string): string | null {
  for (const rel of [`dist${path}/index.html`, `dist${path}.html`]) {
    const abs = resolve(root, rel);
    if (existsSync(abs)) return readFileSync(abs, 'utf-8');
  }
  return null;
}

function mainOf(html: string): string {
  const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return m ? m[1] : html;
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function infoUnits(s: string): number {
  let cjk = 0;
  let latin = 0;
  for (const m of s.matchAll(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]+|[A-Za-z0-9][A-Za-z0-9'’\-]*/g)) {
    if (/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]/.test(m[0])) cjk += m[0].length;
    else latin += 1;
  }
  return latin + cjk / 2;
}

function shingles(text: string, n = 5): Set<string> {
  const tokens = [
    ...text.matchAll(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]|[A-Za-z0-9][A-Za-z0-9'’\-]*/g),
  ].map((m) => m[0].toLowerCase());
  const out = new Set<string>();
  for (let i = 0; i + n <= tokens.length; i++) out.add(tokens.slice(i, i + n).join(' '));
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const g of a) if (b.has(g)) inter++;
  return inter / (a.size + b.size - inter);
}

/** 该类别下的全部主题页路径（en + zh） */
function topicPagePaths(categoryId: string): string[] {
  const out: string[] = [];
  for (const topic of TOPICS.filter((t) => t.letterId === categoryId)) {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) continue;
    const variants =
      topic.tier === 'comparison' ? ['compare'] : topic.tier === 1 ? ['guide', 'benchmark'] : [];
    for (const lang of ['en', 'zh']) {
      for (const variant of variants) out.push(`/${lang}/${cat.slug}/${topic.id}-${variant}`);
    }
  }
  return out;
}

/** 决策层区块的 HTML（两个 section） */
function decisionLayerHtml(main: string, categoryId: string): string {
  const sections = [
    ...main.matchAll(/<section[^>]*data-decision-layer="[^"]*"[^>]*>([\s\S]*?)<\/section>/g),
    ...main.matchAll(/<section[^>]*data-decision-choices="[^"]*"[^>]*>([\s\S]*?)<\/section>/g),
  ];
  assert.ok(sections.length >= 2, `expected the two decision-layer sections, found ${sections.length}`);
  return sections.map((m) => m[1] ?? '').join('\n');
}

const configured = Object.keys(CATEGORY_DECISION_LAYERS);

// ---------------------------------------------------------------------------
// 1. The decision layer is actually rendered, in both languages
// ---------------------------------------------------------------------------

for (const categoryId of configured) {
  const cat = categories.find((c) => c.id === categoryId)!;
  for (const lang of ['en', 'zh'] as const) {
    test(`P159: /${lang}/${cat.slug}/ renders the decision layer`, () => {
      ensureBuilt();
      const html = readPage(`/${lang}/${cat.slug}`);
      assert.ok(html, `dist/ has no /${lang}/${cat.slug}/ page`);
      const main = mainOf(html);
      assert.ok(
        main.includes(`data-decision-layer="${categoryId}"`),
        `/${lang}/${cat.slug}/ is missing the decision-chain section`,
      );
      assert.ok(
        main.includes(`data-decision-choices="${categoryId}"`),
        `/${lang}/${cat.slug}/ is missing the tool-choices section`,
      );
    });
  }
}

// ---------------------------------------------------------------------------
// 2. The decision layer publishes no prices
// ---------------------------------------------------------------------------

for (const categoryId of configured) {
  const cat = categories.find((c) => c.id === categoryId)!;
  for (const lang of ['en', 'zh'] as const) {
    test(`P159: /${lang}/${cat.slug}/ decision layer contains no price`, () => {
      ensureBuilt();
      const html = readPage(`/${lang}/${cat.slug}`)!;
      const layerHtml = decisionLayerHtml(mainOf(html), categoryId);
      const money = [...new Set([...stripTags(layerHtml).matchAll(/\$\s?\d[\d.,]*/g)].map((m) => m[0]))];
      assert.deepEqual(
        money,
        [],
        `/${lang}/${cat.slug}/ decision layer publishes prices (${money.join(' ')}) — the topic ` +
          'benchmark tables are still hand-typed and have already drifted from the live dataset',
      );
    });
  }
}

// ---------------------------------------------------------------------------
// 3. Every tool link in the decision layer resolves
// ---------------------------------------------------------------------------

for (const categoryId of configured) {
  const cat = categories.find((c) => c.id === categoryId)!;
  for (const lang of ['en', 'zh'] as const) {
    test(`P159: /${lang}/${cat.slug}/ decision layer links resolve`, () => {
      ensureBuilt();
      const html = readPage(`/${lang}/${cat.slug}`)!;
      const layerHtml = decisionLayerHtml(mainOf(html), categoryId);
      const hrefs = [...new Set([...layerHtml.matchAll(/href="(\/[^"]+)"/g)].map((m) => m[1]!))];
      assert.ok(hrefs.length > 0, `/${lang}/${cat.slug}/ decision layer has no links at all`);
      for (const href of hrefs) {
        const target = readPage(href.replace(/\/$/, ''));
        assert.ok(target, `/${lang}/${cat.slug}/ decision layer links to "${href}" which is not a built page`);
      }
    });
  }
}

// ---------------------------------------------------------------------------
// 4. The decision layer did not manufacture intra-site duplication
// ---------------------------------------------------------------------------

for (const categoryId of configured) {
  const cat = categories.find((c) => c.id === categoryId)!;
  for (const lang of ['en', 'zh'] as const) {
    test(`P159: /${lang}/${cat.slug}/ stays far from its topic pages`, () => {
      ensureBuilt();
      const html = readPage(`/${lang}/${cat.slug}`)!;
      const hubShingles = shingles(stripTags(mainOf(html)));
      const topics = topicPagePaths(categoryId).filter((p) => p.startsWith(`/${lang}/`));
      assert.ok(topics.length > 0, `no topic pages found for category ${categoryId}`);
      for (const path of topics) {
        const topicHtml = readPage(path);
        if (!topicHtml) continue;
        const sim = jaccard(hubShingles, shingles(stripTags(mainOf(topicHtml)))) * 100;
        assert.ok(
          sim <= MAX_TOPIC_SIMILARITY_PERCENT,
          `/${lang}/${cat.slug}/ is ${sim.toFixed(2)}% similar to ${path} — above the ` +
            `${MAX_TOPIC_SIMILARITY_PERCENT}% ceiling. The decision layer must stay the DECISION layer; ` +
            'copying the topic benchmark table here is exactly the intra-site duplication we must avoid',
        );
      }
    });
  }
}

// ---------------------------------------------------------------------------
// 5. The decision layer actually thickens the page
// ---------------------------------------------------------------------------

for (const categoryId of configured) {
  const cat = categories.find((c) => c.id === categoryId)!;
  for (const lang of ['en', 'zh'] as const) {
    test(`P159: /${lang}/${cat.slug}/ decision layer adds real body text`, () => {
      ensureBuilt();
      const html = readPage(`/${lang}/${cat.slug}`)!;
      const main = mainOf(html);
      const before = stripTags(
        main.replace(/<section[^>]*data-decision-(?:layer|choices)[^>]*>[\s\S]*?<\/section>/g, ' '),
      );
      const after = stripTags(main);
      const added = infoUnits(after) - infoUnits(before);
      assert.ok(
        added >= MIN_ADDED_UNITS,
        `/${lang}/${cat.slug}/ decision layer only added ${added.toFixed(0)} units of body text ` +
          `(expected ≥ ${MIN_ADDED_UNITS}) — a thin layer does not fix the thin-page problem`,
      );
    });
  }
}

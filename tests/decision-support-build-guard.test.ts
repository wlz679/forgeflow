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
// ⭐ P168（本批）：建议码形态下，页面显示的是**渲染后的模板**（en 英文 / zh 中文）
//   ⇒ 探针必须按语言取渲染结果，不能再拿引擎原始 tip（那现在是一段 JSON）
import { renderDecisionTip } from '../src/lib/decision-tip-templates.ts';

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
  return (m ? m[1] : html)
    .replace(/<[^>]+>/g, ' ')
    // ⭐ 必须解码实体：Astro 把文案里的 `>` `<` `"` 转义成 `&gt;` `&lt;` `&quot;`
    //   ⇒ 只解 `&amp;` 的话，就是拿**解码后的页面文本**去比 **locale 原文** ⇒ 比不上
    //   （实测：stockout-cost 的 zh 文案前 40 字含 `>` ⇒ 产物级断言假红）。
    //   ⚠️ 顺序：`&amp;` 必须**最后**解（否则 `&amp;gt;` 会被误解成 `>`）。
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

test('P168 产物：激活工具的页面（en + zh）都渲染出决策区块，且三块静态内容都在', async () => {
  const engines = await loadEngines();
  const bySlug = new Map(engines.map((e) => [e.slug, e]));
  const activated = activatedSlugs(locales as any);
  assert.ok(activated.length > 0, '没有任何工具被激活');

  const problems: string[] = [];
  for (const slug of activated) {
    const engine = bySlug.get(slug);
    const sampleLines = extractDecisionLines(engine?.staticExamples?.[0] ?? '');
    for (const lang of LANGS) {
      // ⭐ 探针 = 按语言渲染后的那条建议（建议码形态下不再是引擎原始 tip）
      const sampleTip = sampleLines.tipCode
        ? renderDecisionTip(sampleLines.tipCode, sampleLines.tipParams, lang)
        : sampleLines.tip;
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
    const sampleLines = extractDecisionLines(bySlug.get(slug)?.staticExamples?.[0] ?? '');
    for (const lang of LANGS) {
      // ⭐ 探针 = 按语言渲染后的那条建议（建议码形态下不再是引擎原始 tip）
      const sampleTip = sampleLines.tipCode
        ? renderDecisionTip(sampleLines.tipCode, sampleLines.tipParams, lang)
        : sampleLines.tip;
      if (!sampleTip) continue;
      const probe = sampleTip.slice(0, 50);
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

test('P168 产物：⭐ 结果卡片里**没有**决策建议（卡片剥离了它 ⇒ 建议只有区块一个家）', async () => {
  // ⭐⭐ **与「全页恰好出现一次」互不相交的第二条轴**：
  //   那条数的是**渲染后的文案**（区块里那份）
  //   ⇒ 卡片里若没剥离建议，多出来的是**决策码 JSON**（引擎原始 tip）
  //   ⇒ 两条轴各查一件事，缺一条就有一类缺陷对验收门**完全隐形**。
  //
  // ⚠️⚠️ 探针必须落在**原始 HTML**上，不能拿「解标签后的文本」去比：
  //   建议码是 JSON（{"code":"burn_high_burn"}）⇒ Astro 把 `"` 转义成 `&quot;`
  //   ⇒ 拿「未转义的原文」比「只解了 &amp; 的文本」**永远比不上**
  //   ⇒ 第一版就是这么写的 ⇒ 变异 M8 实测 SURVIVED（守卫对这条缺陷完全失明）。
  // ⇒ 改用两个**不会被 HTML 转义**的标记：💡 Tip / 💡 提示 的标记词 + 建议码标识符。
  const engines = await loadEngines();
  const bySlug = new Map(engines.map((e) => [e.slug, e]));
  const problems: string[] = [];
  for (const slug of activatedSlugs(locales as any)) {
    const lines = extractDecisionLines(bySlug.get(slug)?.staticExamples?.[0] ?? '');
    if (!lines.tip) continue;
    for (const lang of LANGS) {
      const rel = lang + '/' + slug + '/index.html';
      if (!existsSync(join(ROOT, 'dist', rel))) continue;
      const html = page(rel);
      const card = html.match(/<div id="static-results"[\s\S]*?(?=<div id="dynamic-results")/);
      if (!card) { problems.push(rel + ' 取不到结果卡片'); continue; }
      const cardHtml = card[0];
      // ① 建议的标记词（en / zh 两种；emoji 与 ASCII 不会被 HTML 转义）
      if (cardHtml.includes('💡 Tip') || cardHtml.includes('💡 提示')) {
        problems.push(rel + ' 的结果卡片里还有 💡 Tip 行 ⇒ 建议在卡片与决策区块各有一家');
      }
      // ② 建议码本身（标识符是纯 ASCII ⇒ 不会被转义）
      if (lines.tipCode && cardHtml.includes(lines.tipCode)) {
        problems.push(rel + ' 的结果卡片里还有建议码 ' + lines.tipCode);
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

test('P168 产物：⭐ 英文页不得出现中文（扫全部 100 个工具页 · 产物级）', async () => {
  // ⭐⭐ 本批（B3-4）要补的**守卫盲区**：
  //   旧断言「英文页不得含中文」只遍历**已激活**工具（4 个）
  //   ⇒ 那 15 个「英文页渲染中文决策段」的工具页对它**完全隐形**。
  //   ⇒ 本条改成**产物级 + 扫全部 100 个工具页**，不再依赖激活清单。
  //
  // ⚠️ **表示层必须与被测层一致**：判据落在**最终产物**（用户看到的那张卡片 /
  //   那个决策区块），不是引擎源码，也不是 locale 源码。
  //
  // ⚠️ **与既有断言互不相交**（一条变异只红一条断言的隔离纪律）：
  //   ① 「结果卡片里不再有 🧭 决策段」负责**🧭 Decision 段**本身 ⇒
  //      本条**剔除** 🧭 Decision 段再查中文（那 82 个尚未迁移的工具仍合法地
  //      在卡片里显示英文 🧭 段 —— 迁出它们是后续批次，不在本批范围）。
  //   ② 「英文页的决策建议不得含中文」是**源码级**（查引擎 tip 与 en 模板）
  //      ⇒ 本条查**产物里的区块正文**（四层静态文案），键集合不同 ⇒ 不相交。
  const engines = await loadEngines();
  const problems: string[] = [];
  let cardChecked = 0;
  let blockChecked = 0;
  for (const engine of engines) {
    const rel = 'en/' + engine.slug + '/index.html';
    if (!existsSync(join(ROOT, 'dist', rel))) continue;
    const html = page(rel);
    // ① 结果卡片（剔除 🧭 Decision 段）
    const card = html.match(/<div id="static-results"[\s\S]*?(?=<div id="dynamic-results")/);
    if (!card) { problems.push(rel + ' 取不到结果卡片'); continue; }
    cardChecked++;
    const cardText = textOf(card[0].split('🧭 Decision')[0]);
    if (/[\u3400-\u4dbf\u4e00-\u9fff]/.test(cardText)) {
      const hit = cardText.match(/[\u3400-\u4dbf\u4e00-\u9fff][\s\S]{0,40}/);
      problems.push(rel + ' 的英文页结果卡片里有中文：' + (hit ? hit[0] : ''));
    }
    // ② 决策区块（四层静态文案来自 en.json ⇒ 必须英文）
    const blk = html.match(/<section id="decision-support"[\s\S]*?<\/section>/);
    if (!blk) continue;
    blockChecked++;
    const blkText = textOf(blk[0]);
    if (/[\u3400-\u4dbf\u4e00-\u9fff]/.test(blkText)) {
      const hit = blkText.match(/[\u3400-\u4dbf\u4e00-\u9fff][\s\S]{0,40}/);
      problems.push(rel + ' 的英文页决策区块里有中文：' + (hit ? hit[0] : ''));
    }
  }
  // ⭐ 期望值**独立写死**：这条断言的价值就在于「覆盖全部工具页」，
  //   若只扫到几十页 ⇒ 它又退化成「只查已激活工具」的老形态 ⇒ 必须红。
  assert.ok(cardChecked >= 90, '只扫到 ' + cardChecked + ' 个英文工具页（期望 ≥ 90），断言没覆盖全量');
  assert.ok(blockChecked > 0, '一个决策区块都没测到 ⇒ 断言可能没在测');
  assert.deepEqual(problems, [], problems.join(' | '));
});

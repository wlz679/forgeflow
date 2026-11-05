#!/usr/bin/env node
// scripts/codegen-review-dates.mjs
//
// 从工具散文（src/content/tools/*.md）的 frontmatter 派生「最近审核」日期，
// 写入 src/data/review-dates.json。
//
//   node scripts/codegen-review-dates.mjs          # 重新生成
//   node scripts/codegen-review-dates.mjs --check  # 断言 JSON 是最新的
//
// 为什么要有这个生成物（而不是在构建期直接读文件）
// --------------------------------------------------
// 本站的 Cloudflare worker 运行时**没有 node:fs** ⇒ 任何被 .astro 组件
// import 的模块都不能碰文件系统（构建会直接失败：
//   "Cannot bundle Node.js built-in node:fs imported from ..."）。
// 而「最近审核」的真值源正是散文 frontmatter ⇒ 只能预处理成静态数据。
//
// 这也正是本仓库既有的做法（src/data/user-value-scores.json、
// src/data/og-samples.json、src/data/ai-pricing.json 都是生成物或上游快照）。
//
// ⭐ 真值源是**散文**，不是 src/data/tools/*.ts 的 ToolMeta.dataReviewedAt
//   src/pages/[lang]/[slug].astro:87 早就这么做了：
//       proseEntry?.data.data_reviewed_at ?? toolMeta.dataReviewedAt
//   那里的注释写明 ToolMeta 的日期「比 prose 落后约 5 周」。
//   实测（2026-11-05）：prose 2026-07-31×158 / 08-03×30 / 10-21×10 / 10-30×2；
//   ToolMeta 2026-06-22×26 / 07-03×6 / …
//   ⇒ 若分类页读 ToolMeta，会显示 2026-06-22，而同分类的工具页显示 2026-07-31
//   ⇒ **「同一站点两套口径」这个病根本没治**。
//
// ⭐ 守卫与本脚本**共用同一个解析器**（parseProseReviewDates）
//   否则会出现「生成物说一套、守卫验另一套」的错位。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_PATH = path.join(ROOT, 'src', 'data', 'review-dates.json');
const CHECK_MODE = process.argv.includes('--check');

/** 从 frontmatter 里取一个标量字段 */
function pick(frontmatter, key) {
  const m = frontmatter.match(new RegExp('^' + key + ":\\s*'?([^'\\r\\n]+)'?\\s*$", 'm'));
  return m ? m[1].trim() : undefined;
}

/**
 * 解析全部工具散文 frontmatter 里的审阅日期。
 *
 * 目录里还有一个 _README.md（没有 frontmatter）⇒ 解析不出字段的文件自动跳过。
 * en/zh 两份散文各有 category_id / data_reviewed_at / engine_ref。
 */
export function parseProseReviewDates(root = ROOT) {
  const dir = path.join(root, 'src', 'content', 'tools');
  const records = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.md')) continue;
    const raw = fs.readFileSync(path.join(dir, name), 'utf8');
    const fm = (raw.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1];
    if (!fm) continue;
    const categoryId = pick(fm, 'category_id');
    const dataReviewedAt = pick(fm, 'data_reviewed_at');
    const slug = pick(fm, 'engine_ref') || pick(fm, 'slug');
    if (!categoryId || !dataReviewedAt || !slug) continue;
    records.push({ slug, categoryId, dataReviewedAt });
  }
  return records;
}

/** 由散文记录派生出生成物内容 */
export function buildReviewDates(root = ROOT) {
  const records = parseProseReviewDates(root);
  const tools = {};
  const categories = {};

  for (const r of records) {
    const prev = tools[r.slug];
    if (!prev || r.dataReviewedAt > prev.dataReviewedAt) {
      tools[r.slug] = { categoryId: r.categoryId, dataReviewedAt: r.dataReviewedAt };
    }
    const cur = categories[r.categoryId];
    if (!cur || r.dataReviewedAt > cur) categories[r.categoryId] = r.dataReviewedAt;
  }

  const siteDate = Object.values(categories).reduce((m, d) => (d > m ? d : m), '');

  return {
    version: 1,
    source: 'src/content/tools/*.md frontmatter: category_id + data_reviewed_at',
    siteDate,
    categories: Object.fromEntries(Object.keys(categories).sort().map((k) => [k, categories[k]])),
    tools: Object.fromEntries(Object.keys(tools).sort().map((k) => [k, tools[k]])),
  };
}

function serialize(data) {
  return JSON.stringify(data, null, 2) + '\n';
}

function main() {
  const data = buildReviewDates();
  const next = serialize(data);

  if (CHECK_MODE) {
    if (!fs.existsSync(OUT_PATH)) {
      console.error('[codegen-review-dates] 缺少 src/data/review-dates.json');
      process.exit(1);
    }
    const cur = fs.readFileSync(OUT_PATH, 'utf8');
    if (cur !== next) {
      console.error(
        '[codegen-review-dates] src/data/review-dates.json 已过期 —— ' +
          '跑 node scripts/codegen-review-dates.mjs',
      );
      process.exit(1);
    }
    console.log(
      '[codegen-review-dates] ✓ 最新（' +
        Object.keys(data.tools).length +
        ' 个工具 / ' +
        Object.keys(data.categories).length +
        ' 个分类 / 全站 ' +
        data.siteDate +
        '）',
    );
    return;
  }

  fs.writeFileSync(OUT_PATH, next, 'utf8');
  console.log(
    '[codegen-review-dates] 已写入 ' +
      Object.keys(data.tools).length +
      ' 个工具 / ' +
      Object.keys(data.categories).length +
      ' 个分类 / 全站 ' +
      data.siteDate,
  );
}

// 只在直接运行时执行（被 import 时不跑）
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}

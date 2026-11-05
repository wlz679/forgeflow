// P168 —— 「最近审核」日期的**唯一真值源**。
//
// 背景
// ----
// 整改前：`src/components/CategoryHero.astro` 把一个固定日期**硬编码**在组件里，
//   30 个分类页（15 分类 × 2 语言）因此全部显示同一个 4 个多月前的日期；
//   而工具页显示的是各自真实的审阅日期 ⇒ **同一站点两套口径**。
//   审核员看到的就是「这个站不维护」。
//
// ⭐ 真值源是**工具散文（prose）frontmatter**
//   `src/pages/[lang]/[slug].astro:87` 早就这么做了：
//       proseEntry?.data.data_reviewed_at ?? toolMeta.dataReviewedAt
//   那里的注释写明 ToolMeta 的日期「比 prose 落后约 5 周」。
//   ⇒ 若分类页只读 ToolMeta，会显示 2026-06-22，而同分类的工具页显示 2026-07-31
//   ⇒ 「两套口径」这个病根本没治。
//
// ⭐ 为什么读的是**生成物**而不是散文本身
//   本站的 Cloudflare worker 运行时没有 node:fs ⇒ 被 .astro 组件 import 的
//   模块不能碰文件系统（构建会直接失败）。散文里的日期由
//   `scripts/codegen-review-dates.mjs` 预生成到 `src/data/review-dates.json`，
//   并由 `--check` + 守卫（adsense-hardening-guard）双重防漂移。
//
// 用法
// ----
//   import { getCategoryReviewDate, getSiteReviewDate } from '../lib/content-review-dates';
//   getCategoryReviewDate('A');   // → '2026-07-31'
//   getSiteReviewDate();          // → '2026-10-30'

import REVIEW_DATES from '../data/review-dates.json';

export interface ProseReviewRecord {
  /** 工具 slug（来自 frontmatter 的 engine_ref，en/zh 都有） */
  slug: string;
  /** 分类字母 A / B / C … */
  categoryId: string;
  /** YYYY-MM-DD */
  dataReviewedAt: string;
}

export interface ReviewDatesFile {
  version: number;
  source: string;
  siteDate: string;
  categories: Record<string, string>;
  tools: Record<string, { categoryId: string; dataReviewedAt: string }>;
}

const DATA = REVIEW_DATES as ReviewDatesFile;

/** 全部工具的审阅日期记录（每个 slug 一条，en/zh 取较晚者）。 */
export function readProseReviewRecords(): ProseReviewRecord[] {
  return Object.entries(DATA.tools).map(([slug, v]) => ({
    slug,
    categoryId: v.categoryId,
    dataReviewedAt: v.dataReviewedAt,
  }));
}

/** slug → 该工具最新的审阅日期。 */
export function getToolReviewDates(): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of readProseReviewRecords()) map.set(r.slug, r.dataReviewedAt);
  return map;
}

/** 分类字母 → 该分类下工具的**最新**审阅日期。 */
export function getCategoryReviewDates(): Record<string, string> {
  return { ...DATA.categories };
}

/** 单个分类的「最近审核」日期；没有数据时返回空串（调用方据此不渲染该行）。 */
export function getCategoryReviewDate(categoryId: string): string {
  return DATA.categories[categoryId] ?? '';
}

/** 全站最近一次内容审阅日期。 */
export function getSiteReviewDate(): string {
  return DATA.siteDate;
}

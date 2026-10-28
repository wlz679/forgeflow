// P155 — 把已删除的 /blog/* URL 面 301 回对应的计算器页。
//
// 为什么需要（全部实测，2026-10-27）
// --------------------------------
// 1. 站点在 2026-06 删掉了整个 /blog/* URL 面，但 Google 的索引里还留着
//    **198 条**。对全部 645 个有展示的 URL 逐个验活（HEAD→GET，12 并发）：
//    447 个 200、**198 个硬 404、0 条重定向**。这 198 条合计
//    **2,526 次展示 = 全站索引展示的 18.9%**，还带来 3 次点击（陈旧 SERP）。
// 2. AdSense 在 2026-10-27 复审给出「低价位内容」，政策原文第 ② 条是
//    「持续精选优质内容和**维护网站页面结构**」。**19% 的索引展示指向 404**
//    正是这一条最硬的不达标证据。
// 3. 旧的 blog slug **一律**是 `best-` + 工具 slug，而那个工具 slug 至今
//    仍在。实测 196/196 命中 `/{lang}/blog/best-{slug}/` → `/{lang}/{slug}/`，
//    且 **196/196 的目标页都真实存在**；剩下 2 条是 blog 索引页
//    `/{lang}/blog/`（44 次展示）。
//
// 为什么目标来自注册表而不是手写清单
// --------------------------------
// 目标 slug 从 `src/data/tools` 推导 ⇒ **301 不可能指向一个不存在的页面**
// （301→404 比 404 更糟：它会把权重永久交给另一个 404）。工具增删时规则
// 自动跟随，不需要改两处。
//
// 为什么是 middleware 而不是 public/_redirects
// --------------------------------------------
// 本站跑在 @astrojs/cloudflare adapter + output:'hybrid' 上，构建产物的
// `dist/_routes.json` 是 `"include": ["/*"]` —— **所有请求都由 Pages Function
// 处理**。Cloudflare 官方文档明写：「`_redirects` 里的规则对由 Pages
// Function 处理的请求不生效」。所以 301 必须落在应用层。

import { tools } from '../data/tools';

/** /{lang}/blog/best-{slug}/ → 目标 slug */
const BLOG_TOOL_RE = /^\/(en|zh)\/blog\/best-([a-z0-9][a-z0-9-]*)\/?$/;

/** /{lang}/blog/ （blog 索引页） */
const BLOG_INDEX_RE = /^\/(en|zh)\/blog\/?$/;

/** 活着的计算器 slug 集合 —— 注册表是唯一真相源 */
const toolSlugs = new Set(tools.map((t) => t.slug));

/**
 * 把旧的 /blog/* URL 解析成它该去的地方。
 *
 * @param pathname 请求路径（不含 query / hash）
 * @returns 301 目标路径；`null` 表示这个路径不该被重定向
 */
export function resolveBlogRedirect(pathname: string): string | null {
  const m = BLOG_TOOL_RE.exec(pathname);
  if (m) {
    const [, lang, slug] = m;
    // 只在目标页真的存在时重定向。注册表里没有 ⇒ 老实 404。
    if (!toolSlugs.has(slug)) return null;
    return `/${lang}/${slug}/`;
  }
  const idx = BLOG_INDEX_RE.exec(pathname);
  if (idx) return `/${idx[1]}/`;
  return null;
}

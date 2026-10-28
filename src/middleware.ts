// P155 — 请求级中间件。
//
// 目前只有一件事：把已删除的 /blog/* URL 301 回对应的计算器页。
// 详见 src/lib/blog-redirects.ts 顶部的实测依据。
//
// 为什么不能靠 public/_redirects：本站跑在 @astrojs/cloudflare adapter +
// output:'hybrid' 上，构建产物的 dist/_routes.json 是 `"include": ["/*"]`
// —— 所有请求都由 Pages Function 处理，而 Cloudflare 文档明写 `_redirects`
// 的规则对 Pages Function 处理的请求不生效。

import { defineMiddleware } from 'astro:middleware';
import { resolveBlogRedirect } from './lib/blog-redirects';

export const onRequest = defineMiddleware(async (context, next) => {
  const target = resolveBlogRedirect(context.url.pathname);
  if (target) {
    // 301：永久。旧的 blog URL 已经不存在，这是把权重搬回活页面，不是临时跳转。
    return context.redirect(target, 301);
  }
  return next();
});

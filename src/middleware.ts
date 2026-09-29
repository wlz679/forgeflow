// P152: Return 410 Gone for the programmatic-SEO blog URLs removed in 32a982e.
//
// Why 410 and not the 404 page: those ~200 URLs (100 posts x en/zh) are still
// sitting in Google's index (GSC reported 620 indexed URLs against a 437-page
// site on 2026-09-21). A 404 says "temporarily missing, might come back", so
// Google keeps retrying and keeps them indexed. 410 says "permanently gone,
// stop crawling and drop from the index" — this is the status code Google
// documents for accelerating deindexing of deliberately removed content.
//
// Cloudflare Pages' `_redirects` file only supports 301/302/303/307/308, so a
// 410 rule there is silently ignored. And the Astro Cloudflare adapter emits
// `dist/_worker.js`, which per Cloudflare docs causes the whole `functions/`
// directory to be ignored. Astro middleware is the only place in this stack
// where a custom status code can be returned.
//
// Runs for every request the worker handles. `/blog/*` is not in the
// `_routes.json` exclude list, so those requests do reach the worker.

import type { MiddlewareHandler } from 'astro';

// Matches /en/blog, /en/blog/, /en/blog/<anything> and the same under /zh.
const REMOVED_SECTION = /^\/(en|zh)\/blog(\/.*)?$/;

const BODY = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<title>410 Gone</title>
</head>
<body>
<h1>410 Gone</h1>
<p>This content has been permanently removed.</p>
<p><a href="/">Home</a></p>
</body>
</html>
`;

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { pathname } = context.url;

  if (REMOVED_SECTION.test(pathname)) {
    return new Response(BODY, {
      status: 410,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  return next();
};

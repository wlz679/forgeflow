# P86 Sitemap hreflang Annotations Ship Log

## Summary

P86 adds i18n SEO hreflang annotations (`<xhtml:link rel="alternate" hreflang="...">`) to every URL in `sitemap-0.xml`. Each URL now declares its en/zh/x-default siblings — Google i18n SEO best practice. Previously the sitemap had 0 hreflang annotations; now 1347 (449 URLs × 3 langs).

**Date:** 2026-07-26
**Batch ID:** P86
**Files touched:** 1 (`astro.config.mjs`)
**Test delta:** unchanged (no new tests; pnpm check still 1181)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### `astro.config.mjs` sitemap serializer enhancement

Modified the `serialize(item)` callback to emit `links` field:

```js
serialize(item) {
  const c = classifyUrl(item.url);
  const u = new URL(item.url);
  const path = u.pathname;
  let enPath = path;
  let zhPath = path;
  if (path.startsWith('/zh/') || path === '/zh') enPath = '/en' + path.slice(3);
  else if (path.startsWith('/en/') || path === '/en') zhPath = '/zh' + path.slice(3);
  const enUrl = `${SITE_URL}${enPath}`;
  const zhUrl = `${SITE_URL}${zhPath}`;
  return {
    ...item,
    changefreq: c.changefreq,
    priority: c.priority,
    // The `links` field renders as <xhtml:link> children of <url>.
    // Includes x-default per Google i18n SEO best practice.
    links: [
      { lang: 'en', url: enUrl },
      { lang: 'zh', url: zhUrl },
      { lang: 'x-default', url: enUrl },
    ],
  };
},
```

The `links` array is `@astrojs/sitemap`'s standard field that becomes `<xhtml:link>` children of each `<url>` element. The serializer's prefix-swap logic pairs each URL with its en/zh sibling:
- `/en/about/` → en self, zh = `/zh/about/`
- `/zh/about/` → en = `/en/about/`, zh self
- `/` (root) → en self, zh self (both point to root, since Astro handles locale redirect at the root)

## Verification

After rebuild, manual inspection of `dist/sitemap-0.xml`:

**Count**: 1347 hreflang attributes total (449 URLs × 3 langs)
- Before P86: 0 hreflang annotations
- After P86: 1347 (en + zh + x-default per URL)

**Sample URL** (`/en/about/`):
```xml
<url>
  <loc>https://forgeflowkit.com/en/about/</loc>
  <changefreq>monthly</changefreq>
  <priority>0.5</priority>
  <xhtml:link rel="alternate" hreflang="en" href="https://forgeflowkit.com/en/about/"/>
  <xhtml:link rel="alternate" hreflang="zh" href="https://forgeflowkit.com/zh/about/"/>
  <xhtml:link rel="alternate" hreflang="x-default" href="https://forgeflowkit.com/en/about/"/>
</url>
```

**Sample blog URL** (`/en/blog/best-solopreneur-mrr-calculator/`):
```xml
<url>
  <loc>https://forgeflowkit.com/en/blog/best-solopreneur-mrr-calculator/</loc>
  <changefreq>weekly</changefreq>
  <priority>0.7</priority>
  <xhtml:link rel="alternate" hreflang="en" href="https://forgeflowkit.com/en/blog/best-solopreneur-mrr-calculator/"/>
  <xhtml:link rel="alternate" hreflang="zh" href="https://forgeflowkit.com/zh/blog/best-solopreneur-mrr-calculator/"/>
  <xhtml:link rel="alternate" hreflang="x-default" href="https://forgeflowkit.com/en/blog/best-solopreneur-mrr-calculator/"/>
</url>
```

## Why this exists

P86 was scoped as "sitemap / robots.txt / meta descriptions integrity check." Investigation found:

1. **robots.txt** ✅ — already clean (User-agent: * + Allow: / + Sitemap: declaration)
2. **Meta descriptions** ✅ — already i18n'd per P80/P81 (en pages have EN meta, zh pages have zh meta)
3. **HTML head hreflang** ✅ — `BaseLayout.astro` already emits `<link rel="alternate" hreflang="en/zh/x-default">` (lines 137-139)
4. **Sitemap hreflang** ❌ — sitemap-0.xml had **0** hreflang annotations

This last gap is a real i18n SEO defect. Search engines use sitemap hreflang to:
- Understand the language structure of the site
- Serve the right language version to users in different regions
- Avoid duplicate content penalties

Without sitemap hreflang, even though the HTML head has them, search engines may not properly index the en/zh siblings.

P86 closes this gap with a custom `serialize()` callback that adds the `links` field.

## What was NOT done

- ❌ Did NOT change `<xhtml:link>` behavior in HTML head (already correct per BaseLayout.astro:137-139)
- ❌ Did NOT change robots.txt (already correct)
- ❌ Did NOT change meta descriptions (already correct per P80/P81)
- ❌ Did NOT add CI guard — the change is a single config file edit; CI guard for "sitemap has hreflang" would be a one-time check (no ongoing drift risk)
- ❌ Did NOT verify `<xhtml:link>` is also emitted correctly in `dist/zh/.../index.html` HTML — confirmed earlier that BaseLayout.astro emits them, but didn't double-check post-P86

## Related references

- **BaseLayout.astro** — already emits HTML head hreflang (P62 era?)
- **`@astrojs/sitemap` 3.2.1** — supports `links` field in serialize for `<xhtml:link>` output
- **Google Search Central** — hreflang best practices documentation
- **P80/P81** — closed tool description i18n gap (related i18n hygiene)

## P87+ candidate

- **HTML hreflang CI guard** — verify dist/zh pages still emit `<link rel="alternate" hreflang>` (no regression)
- **Sitemap URL coverage** — verify all 224 zh pages have en sibling + vice versa (programmatic check)
- **Blog body i18n completion** — translate remaining 100 MD body content (~3K lines already done in P75)
- **OG image localization** — image generation scope
- **Audit script migration** — extract parser logic to shared library
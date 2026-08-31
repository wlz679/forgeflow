# Last-Modified + Sitemap lastmod Injection (P149)

**Date**: 2026-08-31
**Status**: Draft
**Trigger**: AdSense reapply pre-flight (8/30 GSC verify) revealed 53% indexed
coverage with 10-day crawl stagnation. Root cause: production pages lack
`Last-Modified` HTTP header + sitemap entries lack `<lastmod>` field,
so Googlebot cannot distinguish "newly shipped 631 P140f pages" from
"already-indexed 407 pages". Recrawl priority gets pushed to minimum.

## Goal

Inject `Last-Modified` HTTP header and sitemap `<lastmod>` field into
every Astro static page, sourced from the page's source-file mtime
(content/blog/*.md for blog pages, src/engines/ai-cost/*.ts for engine
pages, src/pages/[lang]/*.astro for static pages). This gives Googlebot
the signal it needs to prioritize recrawl of newly-shipped content.

## Architecture

### Layer 1: Astro integration plugin

Add a custom Astro integration in `astro.config.mjs` that hooks:

- `astro:config:setup`: register `astro:build:done` listener
- `astro:build:done`: walk `dist/` HTML files, look up source file mtime
  via a reverse path map (built during setup), write the date into:
  (a) HTML file content as `<meta http-equiv="last-modified">` (browser-cached)
  (b) Sitemap entry `<lastmod>` (server-side, in serialize callback)
  (c) HTTP response header (deployed via Cloudflare Page Rules OR via
      Cloudflare Workers; out of scope if Cloudflare strips it from origin)

### Layer 2: Source-file reverse map

Built during `astro:config:setup` by walking `src/` and creating
`{htmlPath: sourcePath}` mappings. Static mapping is OK (build-time only).

### Layer 3: Sitemap `serialize`

Augment the existing `sitemap({ serialize })` callback to set `lastmod:
<ISO timestamp>` from the same source-mtime lookup. The `lastmod` field
appears as `<lastmod>` in sitemap-0.xml output.

### Layer 4: HTTP header (Cloudflare edge)

If Cloudflare edge strips Last-Modified from origin (likely, based on
8/28 curl showing `none` despite Astro 4 default behavior), add a
Cloudflare Page Rule via dashboard OR deploy a Cloudflare Worker that
reads file mtime from R2 and injects Last-Modified header. This is
**OUT OF SCOPE for this sub-project** — separate work item if needed.

## Tech Stack

- Astro 4.13.2 (already installed)
- `@astrojs/sitemap` integration (already wired)
- Node 20.19.4 (already in toolchain)
- Cloudflare Pages hosting (managed via dashboard, NOT via this PR)

## Global Constraints

- **Zero impact on existing 6 health-check guard tests** (must remain 1296/1297 passing)
- **No dependency additions** (must use already-installed packages)
- **Sitemap must remain valid XML** (validate with `xmllint` or browser)
- **Last-Modified must be RFC1123 / HTTP-date format** (e.g., `Tue, 31 Aug 2026 12:34:56 GMT`)
- **Astro 4 default behavior must NOT be disabled** (we ADD Last-Modified, we don't replace existing logic)

## File Layout

- Create: `tmp/verify-last-modified.mjs` (curl-based pre/post verify script)
- Modify: `astro.config.mjs` (~30 lines added: integration + sitemap augment)
- Create: `tests/last-modified-guard.test.ts` (regression test)

## Acceptance Criteria

1. `curl -I https://forgeflowkit.com/en/about/` returns `Last-Modified: <RFC1123>` (post-deploy)
2. `curl https://forgeflowkit.com/sitemap-0.xml | grep lastmod | wc -l` >= 639 (every URL has lastmod)
3. New `tests/last-modified-guard.test.ts` PASSES (asserts dist/ HTML files have proper format)
4. `pnpm check` still reports 1296/1297 (no regression)
5. `node tmp/adsense-preflight.cjs` still reports 13/13 + 9/9 PASS

## Out of Scope

- Cloudflare edge configuration changes (separate work item)
- IndexNow changes
- Astro output mode change (`output: "static"` is default; explicit set is YAGNI)
- Cache-Control optimization (separate sub-project)
- Cloudflare Worker for header injection

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Cloudflare strips Last-Modified from origin | HIGH (root cause is at CDN level) | Verify post-deploy with curl. If still missing, defer to Cloudflare Worker sub-project. |
| Source file mtime not available (Astro 4 limit) | MEDIUM | Walk src/ tree to build reverse map manually |
| Build time regression | LOW | Plugin runs at build:done, not config:setup |
| Sitemap size increase | TRIVIAL | 1 line per URL × 639 = ~30 KB |

## Open Questions

1. Does Astro 4 emit Last-Modified by default for static builds? (To verify
   before this PR — current evidence says no)
2. Is Cloudflare stripping the header? (To verify after deploy)

## Related Memory

- [memory/adsense-reapply-checklist-2026-09-01.md] — Original 9/01 target, deferred due to this finding
- [memory/adsense-resubmit-window.md] — Original 8/18 trigger rationale
- [docs/superpowers/specs/2026-08-28-p150-p151-retrospective-design.md] — Recent audit context
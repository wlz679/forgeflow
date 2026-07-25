# P61 M-Category Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the 3 gaps found by the M (Marketing Analytics) v3 + SEO audit: (G1) engine → blog reverse link missing on every calculator page; (G2.cart-abandonment) Health 3-band → 4-band split; (G2.coupon-attribution) keep 3-band and document the ROI-hard-breakpoint exemption in CLAUDE.md.

**Architecture:**
- **G1** — `[slug].astro` (the universal calculator page) calls `getBlogPostsByToolSlug(slug)` and renders a "Read the full guide" link below `<RelatedTools>` for every tool that has a matching blog post. i18n strings added once to `translations.ts`. New `tests/related-blog-coverage.test.ts` guards 100% coverage (every toolSlug in `tools[]` has exactly one matching blog, no orphan calculators, no orphan blogs).
- **G2.cart-abandonment** — split the existing `warning` band (ROI 100–300%) into two bands: `caution` 🟡 (200–300%) and `warning` 🟠 (100–200%). HEALTH_BANDS gains `caution`; `calcHealthBand` returns 4 outcomes; emoji selector + label picker + tip branching all reflect the new bands. `calculate()`, `customFn` minified JS, the engine description string, and `staticExamples[0]` (regenerated via `node scripts/codegen-examples.mjs`) all stay in sync. Existing tests at `tests/cart-abandonment-cost-calculator.test.ts` get updated boundary tests for the new 200% threshold.
- **G2.coupon-attribution** — leave `calcHealthBand` 3-band (good / warning / critical) untouched. Add a header comment in `coupon-attribution-calculator.ts` referencing the CLAUDE.md exemption. Add the exemption paragraph to CLAUDE.md under "v3 standard — two variants" with the canonical example (ROI = 100% is a hard breakpoint, not a fuzzy middle).

**Tech Stack:** Astro 4.16.19 static pages · TypeScript 5.6 strict · Node `^20.19.0 || >=22.13.0` · `pnpm` · `node:test` + `node:assert/strict` for tests · `scripts/codegen-examples.mjs` for static-example regeneration.

## Global Constraints

- Engine count locked at `EXPECTED_ENGINE_COUNT = 100` (`tests/lib/engine-count.ts`); this plan touches 2 engines (cart-abandonment, coupon-attribution) and 1 page template (`[slug].astro`) — net new file count: 0 removed, 1 created (`tests/related-blog-coverage.test.ts`); net line change to engine files: +~12 / -~4.
- Pre-commit hook (`.githooks/pre-commit`) runs `codegen-examples.mjs --check` and the test suite; if either fails, commit is rejected. Use `SKIP_PRECOMMIT_CHECK=1` only as emergency escape (do not use here — every task passes the gate cleanly).
- Pre-push hook (`/dev/null` hook) may report `ahead=0` false-negative on github push after origin push refreshes local state — known pattern from P48; bypass via `git -c core.hooksPath=/dev/null push github master` if encountered.
- `pnpm check` must be green before any commit (zero errors). Local quality gate supersedes convenience.
- Engine Health bands: business v3 spec is "🟢🟡🟠🔴" (4 bands). Coupon-attribution is a documented exemption (ROI = 100% hard breakpoint) — do not "fix" it to 4-band.
- Bidirectional blog ↔ engine link: blog → engine already exists via `toolSlug` frontmatter (`src/content/blog/best-solopreneur-*.md`); engine → blog is the missing half this plan adds.
- i18n: every new user-facing string needs `en` + `zh` entries in `src/i18n/translations.ts`.
- Naming: file paths kebab-case; function names camelCase; constants UPPER_SNAKE; emoji section prefixes (`🩺`, `📊`, `💰`, `🔄`, `⚖️`, `🎯`, `💡`) follow the existing engine convention.

## File Structure

| File | Status | Role |
|---|---|---|
| `src/pages/[lang]/[slug].astro` | Modify L13 (import `getBlogPostsByToolSlug`) + L39 (`relatedBlog = ...`) + L978 (new `<RelatedBlog>` render after `<RelatedTools>`) | Wire engine → blog back link for all 100 calculator pages × 2 langs |
| `src/components/RelatedBlog.astro` | Create (~25 lines) | Tiny wrapper that renders the "Read the full guide" link, mirrors `RelatedTools.astro` design but with a 📝 icon |
| `src/i18n/translations.ts` | Modify — add 4 keys (`related_blog.title`, `related_blog.cta`, 2 langs) | i18n strings for the new component |
| `src/engines/marketing/cart-abandonment-cost-calculator.ts` | Modify HEALTH_BANDS (add `caution`), `calcHealthBand` (4-way), emoji/label pickers, tip branching, header comment, engine `description`, `customFn` minified JS | 4-band split: 🟢 ≥300% · 🟡 200–300% · 🟠 100–200% · 🔴 <100% |
| `src/engines/marketing/coupon-attribution-calculator.ts` | Modify header comment L1–L25 only (add exemption note + ref to CLAUDE.md) | Documented 3-band exception; no behavior change |
| `CLAUDE.md` | Modify — add 1 paragraph under "v3 standard — two variants" defining the ROI-hard-breakpoint exemption category | Pin the rule so future audits don't flag coupon-attribution again |
| `tests/related-blog-coverage.test.ts` | Create (~30 lines) | 4 assertions: every toolSlug has 1 blog; blog file exists; blog frontmatter has matching `toolSlug`; no orphan blogs |
| `tests/cart-abandonment-cost-calculator.test.ts` | Modify — replace "ROI 100-300% → warning" with 3 boundary tests (≥300 good, 200–300 caution, 100–200 warning, <100 critical) | Lock the new band boundaries |
| `src/engines/INDEX.md` (P39) | Modify — update cart-abandonment description row to mention the new 🟠 band | Drift-guard against future audits (P39 established the per-engine doc surface) |
| `memory/p61-m-category-fixes-shipped.md` | Create (after ship) | Ship log per P-series convention |

---

### Task 1: Wire engine → blog reverse link in `[slug].astro` + i18n + new component

**Files:**
- Create: `src/components/RelatedBlog.astro` (~25 lines)
- Modify: `src/pages/[lang]/[slug].astro:8` (add import) + `:13` (add helper import) + `:39` (compute `relatedBlog` after `related`) + after `:977` (render `<RelatedBlog>`)
- Modify: `src/i18n/translations.ts` — add `related_blog.title` + `related_blog.cta` for en + zh
- Test: `tests/related-blog-coverage.test.ts` (new)

**Interfaces:**
- Consumes: `getBlogPostsByToolSlug(toolSlug: string): Promise<BlogPost[]>` from `src/lib/blog.ts` (already exists at line 57)
- Produces: `relatedBlog: BlogPost[]` available in the `[slug].astro` frontmatter, rendered by `<RelatedBlog posts={relatedBlog} />`

**Why this task is first:** It's the biggest user-facing win (100 pages × 2 langs get a new internal link). Doing it first means the smaller tasks (cart-abandonment band split + coupon-attribution exemption note) can be reviewed in isolation afterward.

- [ ] **Step 1: Write the failing coverage test**

Create `tests/related-blog-coverage.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tools } from '../src/data/tools/index.ts';
import { getCollection } from 'astro:content';
import { EXPECTED_ENGINE_COUNT } from './engine-count.ts';

// Resolve at test time; Astro's getCollection isn't available outside Astro,
// so we mirror its behavior by reading frontmatter directly.
function readBlogFrontmatter(file: string): { toolSlug: string } | null {
  const text = require('node:fs').readFileSync(file, 'utf8') as string;
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const tm = m[1].match(/toolSlug:\s*'([^']+)'/);
  return tm ? { toolSlug: tm[1] } : null;
}

const blogDir = join(process.cwd(), 'src/content/blog');
const blogFiles = readdirSync(blogDir).filter(f => f.endsWith('.md'));
const blogTools = new Set(
  blogFiles
    .map(f => readBlogFrontmatter(join(blogDir, f))?.toolSlug)
    .filter((s): s is string => Boolean(s))
);

test(`every tool (${EXPECTED_ENGINE_COUNT}) has exactly 1 matching blog`, () => {
  const missing: string[] = [];
  for (const t of tools) {
    if (!blogTools.has(t.slug)) missing.push(t.slug);
  }
  assert.equal(missing.length, 0, `tools missing blog: ${missing.join(', ')}`);
});

test('no orphan blog files (every blog references a real tool)', () => {
  const toolSlugs = new Set(tools.map(t => t.slug));
  const orphan: string[] = [];
  for (const file of blogFiles) {
    const fm = readBlogFrontmatter(join(blogDir, file));
    if (!fm || !toolSlugs.has(fm.toolSlug)) orphan.push(file);
  }
  assert.equal(orphan.length, 0, `orphan blogs: ${orphan.join(', ')}`);
});

test('blog file name matches toolSlug (best-solopreneur-<toolSlug>.md convention)', () => {
  for (const file of blogFiles) {
    const fm = readBlogFrontmatter(join(blogDir, file));
    assert.ok(fm, `${file} has no parseable frontmatter`);
    const expected = `best-solopreneur-${fm!.toolSlug.replace(/^solopreneur-/, '')}.md`;
    assert.equal(file, expected, `${file} should be named ${expected}`);
  }
});
```

Run: `pnpm test tests/related-blog-coverage.test.ts`
Expected: PASS (no code change yet — the blog coverage is already 100/100 from P58; this test guards against regression during the [slug].astro edits below).

- [ ] **Step 2: Create `RelatedBlog.astro`**

Create `src/components/RelatedBlog.astro`:

```astro
---
import { t, getLang } from '../i18n';
import type { BlogPost } from '../lib/blog';

export interface Props { posts: BlogPost[]; }

const lang = getLang(Astro);
---

{posts.length > 0 && (
  <div class="mt-6">
    <h2 class="text-lg font-bold text-gray-900 mb-4">{t('related_blog.title', lang)}</h2>
    <div class="flex flex-wrap gap-2">
      {posts.map(post => (
        <a href={`/${lang}/blog/${post.slug}`} class="inline-flex items-center gap-2 px-4 py-2 text-sm bg-purple-50 border border-purple-100 rounded-full hover:border-[#7C3AED]/30 hover:bg-white hover:text-[#7C3AED] transition-all duration-300">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 5v14H5V5h14m1.1-2H3.9c-0.5 0-0.9 0.4-0.9 0.9v16.2c0 0.5 0.4 0.9 0.9 0.9h16.2c0.5 0 0.9-0.4 0.9-0.9V3.9c0-0.5-0.4-0.9-0.9-0.9zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
          </svg>
          {post.title}
        </a>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 3: Add i18n strings**

In `src/i18n/translations.ts`, locate the `related_tools` block (it exists per `RelatedTools.astro:10`) and add immediately after:

```ts
related_blog: {
  title: { en: 'Read the Full Guide', zh: '阅读完整指南' },
  cta:   { en: 'Read the guide',        zh: '阅读指南' },
},
```

Place it right after the `related_tools` key (search the file for `'related_tools.title'` or `related_tools:` to find the exact anchor; preserve the surrounding formatting/comments).

- [ ] **Step 4: Wire `[slug].astro` to render the new component**

Three edits to `src/pages/[lang]/[slug].astro`:

**(4a)** After line 8 (`import RelatedTools from '../../components/RelatedTools.astro';`), add:

```astro
import RelatedBlog from '../../components/RelatedBlog.astro';
```

**(4b)** After line 14 (`import { relatedTools } from '../../data/internal-links';`), add:

```astro
import { getBlogPostsByToolSlug } from '../../lib/blog';
```

**(4c)** After line 39 (`const related = relatedTools[slug!]?.map(...) ?? [];`), add:

```astro
const relatedBlog = await getBlogPostsByToolSlug(slug!);
```

**(4d)** After line 977 (`<RelatedTools tools={related.map(...)} />`), add:

```astro
        <RelatedBlog posts={relatedBlog} />
```

(Note: indentation matches the surrounding JSX — 8 spaces inside the outer `<div class="lg:col-span-3">`.)

- [ ] **Step 5: Run the full quality gate**

Run: `pnpm check`
Expected: tsc clean + test suite green (was 1163/0/0 before this task, should remain so; the new test adds +3 passing assertions → 1166/0/0).

If `pnpm check` fails with a type error on `await getBlogPostsByToolSlug(slug!)` inside the frontmatter, it's because Astro frontmatter is sync-but-top-level-await is allowed. If the build complains, wrap in `Promise.all([getBlogPostsByToolSlug(slug!), ...otherAsyncCalls])` — but only if needed; the more common pattern (other examples in this repo do) is plain top-level `await`.

- [ ] **Step 6: Commit**

```bash
git add src/components/RelatedBlog.astro src/pages/[lang]/[slug].astro src/i18n/translations.ts tests/related-blog-coverage.test.ts
git commit -m "feat(p61-g1): wire engine->blog reverse link on all calculator pages"
```

---

### Task 2: cart-abandonment Health 3-band → 4-band split

**Files:**
- Modify: `src/engines/marketing/cart-abandonment-cost-calculator.ts:22-25` (header comment) + `:35-39` (HEALTH_BANDS) + `:69-73` (`calcHealthBand`) + `:110-111` (emoji/label pickers in `calculate()`) + `:154-170` (tip branching) + `:246-273` (customFn minified JS band/label/tip logic) + `:329` (engine `description`)
- Modify: `tests/cart-abandonment-cost-calculator.test.ts:39-40` (boundary tests) — current test asserts `calcHealthBand(2.0) === 'warning'`; under the new scheme 2.0 → `caution` 🟡; split into 4 boundary tests
- Modify: `src/engines/INDEX.md` — update the cart-abandonment description row to mention the 4-band split (search for `cart-abandonment` row in the M section and adjust the per-slug 详情 paragraph if it mentions Health bands)
- Regenerate: `node scripts/codegen-examples.mjs` (regenerates `staticExamples[0]` to match the new `calculate()` output)

**Interfaces:**
- `HEALTH_BANDS` gains a new key `caution` between `good` and `warning`. Order matters for `calcHealthBand` early-return cascade.
- `calcHealthBand(roi: number): 'good' | 'caution' | 'warning' | 'critical'` — return type narrows; existing `'warning'` value remains but its semantic range shrinks from "100–300%" to "100–200%"; the new `'caution'` covers "200–300%".

**Why 200%/2.0x as the new threshold:** Cart-abandonment recovery ROI is normally cited as 5x+ (email) or 3x+ (SMS). The "warning" band (barely profitable) historically kicked in at 100% ROI; splitting at 200% means: 🟡 caution = "profitable but room to optimize", 🟠 warning = "structurally fragile, fix the math". The 2.0x split line is where the LMS-v3 emoji convention places the 🟡/🟠 boundary (see roas-calculator 🟡 2.0–4.0x · 🟠 1.0–2.0x for parallel).

- [ ] **Step 1: Update the failing boundary test FIRST**

Open `tests/cart-abandonment-cost-calculator.test.ts`. The existing line ~39–40 reads:

```ts
test('cart-abandonment: ROI 100-300% (1.0-3.0x) -> warning', () => {
  assert.equal(calcHealthBand(2.0), 'warning');
```

Replace with 4 boundary tests covering the new scheme:

```ts
test('cart-abandonment: ROI >= 300% (3.0x) -> good', () => {
  assert.equal(calcHealthBand(3.0), 'good');
  assert.equal(calcHealthBand(5.0), 'good');
});

test('cart-abandonment: ROI 200-300% (2.0-3.0x) -> caution', () => {
  assert.equal(calcHealthBand(2.0), 'caution');
  assert.equal(calcHealthBand(2.5), 'caution');
});

test('cart-abandonment: ROI 100-200% (1.0-2.0x) -> warning', () => {
  assert.equal(calcHealthBand(1.0), 'warning');
  assert.equal(calcHealthBand(1.5), 'warning');
});

test('cart-abandonment: ROI < 100% (<1.0x) -> critical', () => {
  assert.equal(calcHealthBand(0.99), 'critical');
  assert.equal(calcHealthBand(0), 'critical');
});
```

Run: `pnpm test tests/cart-abandonment-cost-calculator.test.ts`
Expected: FAIL with "calcHealthBand(2.0) returned 'warning', expected 'caution'" (the engine hasn't been updated yet — that's the point of TDD).

- [ ] **Step 2: Update HEALTH_BANDS constant (lines 35–39)**

Replace:

```ts
export const HEALTH_BANDS = {
  good: { threshold: 3.0, label: 'Good — recovery ROI >= 300%; recovery spend is highly profitable' },
  warning: { threshold: 1.0, label: 'Warning — recovery ROI 100–300%; recovery spend barely profitable' },
  critical: { threshold: -Infinity, label: 'Critical — recovery ROI < 100%; recovery spend destroys value' },
} as const;
```

With:

```ts
export const HEALTH_BANDS = {
  good:    { threshold: 3.0,   label: 'Good — recovery ROI ≥ 300%; recovery spend is highly profitable' },
  caution: { threshold: 2.0,   label: 'Caution — recovery ROI 200–300%; profitable but room to optimize' },
  warning: { threshold: 1.0,   label: 'Warning — recovery ROI 100–200%; recovery spend is fragile' },
  critical:{ threshold: -Infinity, label: 'Critical — recovery ROI < 100%; recovery spend destroys value' },
} as const;
```

- [ ] **Step 3: Update `calcHealthBand` return type + cascade (lines 69–73)**

Replace:

```ts
export function calcHealthBand(roi: number): 'good' | 'warning' | 'critical' {
  if (roi >= HEALTH_BANDS.good.threshold) return 'good';
  if (roi >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}
```

With:

```ts
export function calcHealthBand(roi: number): 'good' | 'caution' | 'warning' | 'critical' {
  if (roi >= HEALTH_BANDS.good.threshold) return 'good';
  if (roi >= HEALTH_BANDS.caution.threshold) return 'caution';
  if (roi >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}
```

- [ ] **Step 4: Update `calculate()` emoji + label pickers (lines 110–111)**

Replace:

```ts
  const healthEmoji = band === 'good' ? '🟢' : band === 'warning' ? '🟡' : '🔴';
  const healthLabel = HEALTH_BANDS[band].label;
```

With:

```ts
  const healthEmoji = band === 'good' ? '🟢' : band === 'caution' ? '🟡' : band === 'warning' ? '🟠' : '🔴';
  const healthLabel = HEALTH_BANDS[band].label;
```

- [ ] **Step 5: Update `calculate()` tip branching (lines 154–170)**

Replace the existing tip branching block (the `if (band === 'critical') ... else if (band === 'good') ... else { /* warning */ ... }` structure) with a 4-branch cascade:

```ts
  let tip: string;
  if (band === 'critical') {
    tip =
      'Recovery spend is destroying value. Either lower recovery cost per send (switch from SMS to email, or move to triggered drip sequences rather than one-shot blasts), or focus recovery on high-AOV segments where the recovery economics work. A $0.50 send against an $80 AOV is profitable above 0.625% recovery rate; below that, the math fails.';
  } else if (band === 'good') {
    tip =
      'Healthy recovery ROI. Scale recovery volume — add SMS to the email sequence (SMS recovery rate is typically 3x email), test send timing (1h vs 24h vs 72h after abandonment), and segment by cart value to push recovery on high-AOV carts first. Each additional 1pp of recovery rate lifts ROI by ~12.8x at this baseline.';
  } else if (band === 'caution') {
    tip =
      'Profitable but with headroom. The two main levers: lift recovery rate from 8% toward 12% (SMS add-on typically triples email recovery at marginal cost) and lower cost per send by moving to email-dominant sequences. Either alone pushes ROI into 🟢; both compound to ~3x.';
  } else {
    // warning band (100-200% ROI)
    if (recoveryCostPerSend > 1.0) {
      tip =
        'SMS costs ($1+ per send) dominate the recovery math. Test email-only sequences first (Klaviyo/Mailchimp average 8% recovery at ~$0.05/send) before scaling SMS to high-AOV carts only. Alternatively, move to triggered in-app messages at near-zero cost.';
    } else {
      tip =
        'Recovery barely covers its cost. Two main levers: (1) lift recovery rate from 8% toward 15% via SMS add-on, better subject lines, and dynamic product personalization, (2) lower cost per send by moving to email-dominant sequences. Either alone doubles ROI; both compound to ~5x.';
    }
  }
```

- [ ] **Step 6: Update header comment (lines 22–25)**

Replace:

```
// Health bands on recovery_roi: green >=300% . yellow 100-300% . red <100%
//   - Good: every recovery dollar produces >=$3 of recovered revenue.
//   - Warning: recovery barely covers its own cost (fragile).
//   - Critical: recovery campaigns destroy value.
```

With:

```
// Health bands on recovery_roi (Business v3 4-band standard):
//   green  ≥300%   every recovery dollar produces ≥$3 of recovered revenue.
//   yellow 200-300%  profitable but headroom remains (lift via SMS / cost cuts).
//   orange 100-200%  recovery barely covers its own cost (structurally fragile).
//   red    <100%   recovery campaigns destroy value.
```

- [ ] **Step 7: Update engine `description` (line 329)**

Replace:

```
    'Model cart abandonment and the ROI of a recovery campaign (email + SMS retargeting). See 8-output breakdown, what-if scenarios (recovery rate, cost, abandonment), break-even recovery rate, and annualized projections. Industry benchmarks: 🟢 ≥300% recovery ROI · 🟡 100–300% · 🔴 <100%.',
```

With:

```
    'Model cart abandonment and the ROI of a recovery campaign (email + SMS retargeting). See 8-output breakdown, what-if scenarios (recovery rate, cost, abandonment), break-even recovery rate, and annualized projections. Industry benchmarks: 🟢 ≥300% · 🟡 200–300% · 🟠 100–200% · 🔴 <100% recovery ROI.',
```

- [ ] **Step 8: Update customFn minified JS (lines 246–273)**

Three string substitutions inside the `customFn` constant (the `band` classifier on line 246, the `he` emoji picker on line 247, the `hl` label picker on line 248, and the tip `if` cascade on lines 271–273):

**8a** — Replace:

```js
'var band=roi>=3?"good":(roi>=1?"warning":"critical");' +
'var he=band==="good"?"🟢":(band==="warning"?"🟡":"🔴");' +
'var hl=band==="good"?"Good — recovery ROI >= 300%; recovery spend is highly profitable":(band==="warning"?"Warning — recovery ROI 100–300%; recovery spend barely profitable":"Critical — recovery ROI < 100%; recovery spend destroys value");' +
```

With:

```js
'var band=roi>=3?"good":(roi>=2?"caution":(roi>=1?"warning":"critical"));' +
'var he=band==="good"?"🟢":(band==="caution"?"🟡":(band==="warning"?"🟠":"🔴"));' +
'var hl=band==="good"?"Good — recovery ROI ≥ 300%; recovery spend is highly profitable":(band==="caution"?"Caution — recovery ROI 200–300%; profitable but room to optimize":(band==="warning"?"Warning — recovery ROI 100–200%; recovery spend is fragile":"Critical — recovery ROI < 100%; recovery spend destroys value"));' +
```

**8b** — Replace the tip branching (lines 271–273):

```js
'if(band==="critical"){tip="Recovery spend is destroying value. Either lower recovery cost per send (switch from SMS to email, or move to triggered drip sequences rather than one-shot blasts), or focus recovery on high-AOV segments where the recovery economics work. A $0.50 send against an $80 AOV is profitable above 0.625% recovery rate; below that, the math fails.";}' +
'else if(band==="good"){tip="Healthy recovery ROI. Scale recovery volume — add SMS to the email sequence (SMS recovery rate is typically 3x email), test send timing (1h vs 24h vs 72h after abandonment), and segment by cart value to push recovery on high-AOV carts first. Each additional 1pp of recovery rate lifts ROI by ~12.8x at this baseline.";}' +
'else{if(rcps>1){tip="SMS costs ($1+ per send) dominate the recovery math. Test email-only sequences first (Klaviyo/Mailchimp average 8% recovery at ~$0.05/send) before scaling SMS to high-AOV carts only. Alternatively, move to triggered in-app messages at near-zero cost.";}else{tip="Recovery barely covers its cost. Two main levers: (1) lift recovery rate from 8% toward 15% via SMS add-on, better subject lines, and dynamic product personalization, (2) lower cost per send by moving to email-dominant sequences. Either alone doubles ROI; both compound to ~5x.";}}' +
```

With:

```js
'if(band==="critical"){tip="Recovery spend is destroying value. Either lower recovery cost per send (switch from SMS to email, or move to triggered drip sequences rather than one-shot blasts), or focus recovery on high-AOV segments where the recovery economics work. A $0.50 send against an $80 AOV is profitable above 0.625% recovery rate; below that, the math fails.";}' +
'else if(band==="good"){tip="Healthy recovery ROI. Scale recovery volume — add SMS to the email sequence (SMS recovery rate is typically 3x email), test send timing (1h vs 24h vs 72h after abandonment), and segment by cart value to push recovery on high-AOV carts first. Each additional 1pp of recovery rate lifts ROI by ~12.8x at this baseline.";}' +
'else if(band==="caution"){tip="Profitable but with headroom. The two main levers: lift recovery rate from 8% toward 12% (SMS add-on typically triples email recovery at marginal cost) and lower cost per send by moving to email-dominant sequences. Either alone pushes ROI into 🟢; both compound to ~3x.";}' +
'else{if(rcps>1){tip="SMS costs ($1+ per send) dominate the recovery math. Test email-only sequences first (Klaviyo/Mailchimp average 8% recovery at ~$0.05/send) before scaling SMS to high-AOV carts only. Alternatively, move to triggered in-app messages at near-zero cost.";}else{tip="Recovery barely covers its cost. Two main levers: (1) lift recovery rate from 8% toward 15% via SMS add-on, better subject lines, and dynamic product personalization, (2) lower cost per send by moving to email-dominant sequences. Either alone doubles ROI; both compound to ~5x.";}}' +
```

- [ ] **Step 9: Regenerate staticExamples[0]**

Run: `node scripts/codegen-examples.mjs`
Expected: writes an updated `staticExamples[0]` for `cart-abandonment-cost-calculator.ts`. Open the file, find the `staticExamples` block (line ~366), confirm the new example shows `🟢` (because the canonical inputs — 50000 traffic / 20% add / 70% abandon / $80 AOV / 8% recovery / $0.50 cost — produce 1280% ROI, still firmly in the 🟢 band; only the band legend in the description and the `if/else` cascade have changed). The example text itself should be byte-equivalent except the engine `description` snippet inside `staticExamples[0]` (which is the engine's own description, so it should now match the updated description with the 🟠 band mention).

If `codegen-examples.mjs` regenerates `staticExamples[0]` but the output is now structurally different from the hand-written one, accept the codegen output (per CLAUDE.md "After editing calculate() in any engine, run node scripts/codegen-examples.mjs before committing").

Run: `pnpm test:unit -- --test tests/cart-abandonment-cost-calculator.test.ts`
Expected: PASS (all 4 boundary tests green).

- [ ] **Step 10: Update `src/engines/INDEX.md` (P39 doc surface)**

Search for `cart-abandonment-cost-calculator` in `src/engines/INDEX.md`. Find the row in the M section (per P39 the file has per-slug 详情 paragraphs in a per-category section). Locate the line that mentions the Health bands (something like "🟢 ≥300% recovery ROI · 🟡 100–300% · 🔴 <100%") and replace with the new 4-band line.

If the INDEX has no per-band mention for cart-abandonment (P39 might only summarize per-engine, not per-band), skip this step and note in the commit message that INDEX.md had no drift.

- [ ] **Step 11: Run the full quality gate**

Run: `pnpm check`
Expected: tsc clean (the `calcHealthBand` return type narrows to a 4-way union; no consumers broke because no caller switches on `'warning'` for cart-abandonment except this engine itself). Test count should rise by ~2 (replaced 1 boundary test with 4, net +3) → 1169/0/0.

- [ ] **Step 12: Commit**

```bash
git add src/engines/marketing/cart-abandonment-cost-calculator.ts tests/cart-abandonment-cost-calculator.test.ts src/engines/INDEX.md
git commit -m "feat(p61-g2-cart): split Health 3-band into 4-band (caution 200-300% / warning 100-200%)"
```

---

### Task 3: coupon-attribution 3-band exemption — CLAUDE.md note + engine header

**Files:**
- Modify: `src/engines/marketing/coupon-attribution-calculator.ts:5-7` (engine header comment) — add 1 line referencing the CLAUDE.md exemption
- Modify: `CLAUDE.md` — add 1 paragraph under "v3 standard — two variants" defining the ROI-hard-breakpoint exemption

**Interfaces:**
- No behavior change. Engine logic, tests, staticExamples all stay byte-equivalent.

**Why this task is separate from Task 2:** Task 2 splits one engine's bands (4-band gain); Task 3 explicitly preserves another engine's bands (3-band retention) but anchors the rule in CLAUDE.md so future audits don't re-flag coupon-attribution.

- [ ] **Step 1: Add exemption note to `coupon-attribution-calculator.ts` header**

Open `src/engines/marketing/coupon-attribution-calculator.ts`. The header block at lines 5–25 already explains the formula and 3-band logic. Insert 1 new line at the very top of the engine comment block (between the `====...` banner and the existing formula comment) — or, cleaner: append to the existing band explanation.

Locate lines 20–24:

```
// Health bands on true_roi: green >=100% . yellow 0-100% . red <0%
//   - Good: every coupon dollar produced >=$1 of incremental profit.
//   - Warning: coupons returned less than they cost (fragile).
//   - Critical: coupons destroyed value.
```

Append (after the `Critical:` line):

```
//
// NOTE: This engine uses 3-band Health (🟢🟡🔴) by design — see CLAUDE.md
// "v3 standard — two variants" for the ROI-hard-breakpoint exemption.
// True coupon ROI's break-even is structurally at 100% (profit↔loss
// boundary), not a fuzzy middle band; inserting a 🟠 band would force
// an arbitrary split (e.g. 50–100% margin) with no business meaning.
```

- [ ] **Step 2: Add the exemption paragraph to `CLAUDE.md`**

Locate the section in `CLAUDE.md` titled **"v3 standard — two variants"** (after the "Categories (15 letters, canonical from `src/data/categories.ts`)" section). The variants table follows; after the table, before the "**v3 status (P16 milestone locked 2026-07-15/16):**" subsection, insert:

```markdown
**Hard-breakpoint exemption (3-band allowed):** Engines whose primary metric has a structural break-even at one end of its range (true ROI = 100%, recovery ROI = 100%, payback period = 0 months, etc.) are permitted to ship with 3-band Health (🟢🟡🔴) instead of the standard 4-band. The reasoning: the "🟠 warning moderate" band normally signals "profitable but fragile"; for hard-breakpoint metrics there's no fuzzy middle — values either cross the threshold or they don't, and adding a 🟠 band forces an arbitrary split with no business meaning. Currently documented exceptions:
- `coupon-attribution-calculator` (M) — true coupon ROI: 🟢 ≥100% / 🟡 0–100% / 🔴 <0%.
- `cart-abandonment-cost-calculator` (M) — was 3-band through P60; promoted to 4-band in P61 (🟢 ≥300% / 🟡 200–300% / 🟠 100–200% / 🔴 <100%) because recovery ROI has a meaningful middle range above the 100% break-even.

Any future engine that wants the 3-band exemption must (a) cite the hard-breakpoint justification in its header comment and (b) cross-link the CLAUDE.md exemption note. Both pieces are required for audit-grade clarity.
```

Note on P61 promotion: cart-abandonment was 3-band through P60 but is being promoted to 4-band in this very plan (Task 2). The exemption note above documents that promotion so future audits reading CLAUDE.md see the historical state. Remove the parenthetical if you'd rather not document the transition in CLAUDE.md; the (a)+(b) audit-grade rule still applies to all 3-band engines going forward.

- [ ] **Step 3: Run the full quality gate**

Run: `pnpm check`
Expected: tsc clean + tests unchanged (1169/0/0). CLAUDE.md and one engine header comment changed — neither has a test impact.

- [ ] **Step 4: Commit**

```bash
git add src/engines/marketing/coupon-attribution-calculator.ts CLAUDE.md
git commit -m "docs(p61-g2-coupon): document ROI-hard-breakpoint 3-band exemption"
```

---

### Task 4: Final verification + ship memory + 3-way sync

**Files:**
- Create: `memory/p61-m-category-fixes-shipped.md`
- Modify: `memory/MEMORY.md` (add 1-line pointer)

**Why this is last:** Tasks 1–3 are independent and shippable on their own. This task is the meta-task that closes the batch, ships the memory entry per P-series convention (P45 CHANGELOG + P35 memory INDEX), and pushes the 3-way mirror (origin / github / gitee).

- [ ] **Step 1: Run the full quality gate one final time**

Run: `pnpm check`
Expected: green. Capture the test count (X pass / 0 fail / 0 skip) for the memory entry.

- [ ] **Step 2: Build the site**

Run: `pnpm build`
Expected: 0 errors. The [slug].astro change (Task 1) generates 100 × 2 = 200 calculator pages, each with a new "Read the Full Guide" block (or no block for tools without a blog — currently all 100 have blogs, so all 200 pages render the block).

- [ ] **Step 3: Spot-check the new link in the built HTML**

Run: `grep -l 'related_blog\|Read the Full Guide' dist/en/solopreneur-roas-calculator/index.html`
Expected: at least one match. If 0 matches, the i18n key wasn't picked up — check `translations.ts` for the `related_blog` block and re-run.

- [ ] **Step 4: Write the ship memory**

Create `memory/p61-m-category-fixes-shipped.md` per P35 INDEX convention:

```markdown
---
name: p61-m-category-fixes-shipped
description: P61 — M-category audit fixes (G1 engine→blog back link + G2 cart-abandonment 4-band split + G2 coupon-attribution 3-band exemption).
metadata:
  type: project
---

# P61 M-Category Audit Fixes — Shipped YYYY-MM-DD

## What shipped

3 batches in 1 P-series, driven by the M-category v3 + SEO audit (P61-audit, run before this batch):

- **G1 (Major)**: Engine → blog reverse link wired into `src/pages/[lang]/[slug].astro` via new `src/components/RelatedBlog.astro` + `src/lib/blog.ts#getBlogPostsByToolSlug` helper. Every calculator page (100 × 2 langs = 200 pages) now renders a "Read the Full Guide" block below `<RelatedTools>`. SEO internal-link value flows page → blog for the first time.
- **G2.cart-abandonment**: Health bands split 3→4 (🟢 ≥300% / 🟡 200–300% / 🟠 100–200% / 🔴 <100%). Affects `HEALTH_BANDS`, `calcHealthBand` return type (4-way union), emoji/label pickers in `calculate()`, tip branching (4-way cascade), header comment, engine description, customFn minified JS. `staticExamples[0]` regenerated via `scripts/codegen-examples.mjs`. Boundary tests in `tests/cart-abandonment-cost-calculator.test.ts` updated from 1 to 4 cases.
- **G2.coupon-attribution**: Kept 3-band (🟢🟡🔴) by design. Added 4-line exemption comment to engine header citing CLAUDE.md, and added a "Hard-breakpoint exemption" paragraph to CLAUDE.md under "v3 standard — two variants" pinning the rule + listing currently-documented exceptions.

## Files changed

| Type | Path | Notes |
|---|---|---|
| Create | `src/components/RelatedBlog.astro` | ~25 lines, mirrors `RelatedTools.astro` design with 📝 icon |
| Create | `tests/related-blog-coverage.test.ts` | 3 assertions: every toolSlug has 1 blog, no orphan blogs, file-name convention |
| Modify | `src/pages/[lang]/[slug].astro` | 4 edits: 2 imports + 1 frontmatter `await` + 1 JSX render |
| Modify | `src/i18n/translations.ts` | +`related_blog.title` / `related_blog.cta` for en + zh |
| Modify | `src/engines/marketing/cart-abandonment-cost-calculator.ts` | HEALTH_BANDS, calcHealthBand, calculate(), customFn, description, header |
| Modify | `tests/cart-abandonment-cost-calculator.test.ts` | 1 boundary test → 4 (good / caution / warning / critical) |
| Modify | `src/engines/marketing/coupon-attribution-calculator.ts` | +4-line exemption note in header (lines 25–30) |
| Modify | `CLAUDE.md` | +1 "Hard-breakpoint exemption" paragraph under v3 variants |
| Modify | `src/engines/INDEX.md` | cart-abandonment row updated for new 4-band (if mentioned) |

## Metrics

- pnpm check: N pass / 0 fail / 0 skip (was 1163 before P61; +3 from related-blog-coverage.test.ts; +3 from cart-abandonment boundary tests net = +6 → 1169/0/0).
- pnpm build: 0 errors; dist HTML grep confirms new section present in 100 × 2 pages.
- Files touched: 9 (1 new test, 1 new component, 7 modified). No engine count change.
- Lines: ~+260 / −~40 (RelatedBlog component + tests dominate the addition).

## Lessons

- **Audit-then-fix is a good cadence.** P61 began as a read-only audit on a single category (M) and produced a 3-fix batch without expanding scope to the other 14 categories. The pattern: audit one slice thoroughly (8 engines, 8 blogs, 4 dimensions), then fix the same slice. Repeat per-category if needed (P62 = ?).
- **Hard-breakpoint metrics deserve a documented exemption, not a forced 4-band fit.** cart-abandonment's recovery ROI genuinely has a 200–300% middle range worth labeling 🟡; coupon-attribution's true ROI breaks at exactly 100% with no meaningful fuzzy middle. Forcing 🟠 on coupon-attribution would mean labeling the 50–100% range as "warning moderate" — semantically meaningless. The CLAUDE.md exemption is the right outcome.
- **Blog coverage was already 100/100 from P58; the missing half was the back link.** P58 shipped 100 templated blog posts (acknowledged in its memory as "template-grade"); P61 completes the bidirectional link by wiring `[slug].astro → blog`. Coverage + direction = usable SEO graph; either alone is wasted.
- **Pre-push hook stale-cache workaround (P48 lesson) fired again this batch** — see P48 ship memory for the documented `git -c core.hooksPath=/dev/null push github master` bypass.

## Related

- Audit source: pre-P61 read-only M-category audit (run inline before this plan; not committed as a separate memory entry — the audit findings live in this P61 memory).
- Related P-series: P45 (CHANGELOG), P35 (memory INDEX), P58 (blog coverage backfill), P48 (operational lessons).
```

(Replace `YYYY-MM-DD` and `N` with actual values from Steps 1 and 2.)

- [ ] **Step 5: Update `memory/MEMORY.md`**

Add 1 line at the top of the "P17+ (active batches — cascade audit + INDEX series)" section (after the most recent P59 entry, before the standing notes):

```markdown
- [P61 M-category fixes](p61-m-category-fixes-shipped.md) — 3-batch (G1 engine→blog back link + G2 cart-abandonment 4-band split + G2 coupon-attribution exemption); 1169/0/0; 9 files
```

- [ ] **Step 6: Push to all 3 remotes (P48 protocol)**

```bash
git fetch origin && git fetch github
git rev-list --left-right --count origin/master...github/master   # check divergence
git push origin master
# If pre-push hook fires ahead=0 false-negative on github push:
git -c core.hooksPath=/dev/null push github master
git push gitee master
```

Expected: all 3 remotes at the same SHA; rev-list shows `0\t0` after push.

- [ ] **Step 7: Final commit (memory files only — already on the same branch)**

If the memory file and MEMORY.md change weren't included in any prior commit, batch them:

```bash
git add memory/p61-m-category-fixes-shipped.md memory/MEMORY.md
git commit -m "docs(p61): ship memory + MEMORY.md pointer"
git push origin master
# (same P48 bypass protocol if hook stale-caches again)
git push github master
git push gitee master
```

---

## Self-Review (run before executing)

**1. Spec coverage:**
- ✅ G1 — Task 1 covers engine→blog back link, i18n, tests, new component.
- ✅ G2.cart-abandonment — Task 2 covers 4-band split across HEALTH_BANDS, calcHealthBand, calculate(), customFn, header, description, tests, staticExamples regeneration, INDEX update.
- ✅ G2.coupon-attribution — Task 3 covers exemption note in engine + CLAUDE.md paragraph.
- ✅ Final ship protocol — Task 4 covers quality gate, build verification, memory, 3-way push.
- All 3 audit gaps covered; no requirement left without a task.

**2. Placeholder scan:**
- Searched for: `TBD`, `TODO`, `implement later`, `fill in details`, `Add appropriate error handling`, `Similar to Task N`. None found.
- Each code step shows the full snippet, not "implement similar to above".
- One editorial liberty in Task 2: the `caution`-band tip copy ("Profitable but with headroom…") is hand-written, not pulled from any existing string. This is intentional — it's a new tip for the new band; there's no existing copy to copy from. Reviewer should sanity-check the copy matches the `coupon-attribution`-style "lift recovery rate from 8% toward 12%" framing (consistency with the existing `warning`-band tip).

**3. Type consistency:**
- `calcHealthBand` return type in Task 2: `'good' | 'caution' | 'warning' | 'critical'` — matches the new 4-tuple exactly across HEALTH_BANDS, calcHealthBand signature, emoji picker, label picker, tip cascade, and customFn minified JS. No mismatches.
- `HEALTH_BANDS` keys: `{ good, caution, warning, critical }` — used consistently in the cascade.
- `getBlogPostsByToolSlug` interface from `src/lib/blog.ts:57` (already verified): `(toolSlug: string) => Promise<BlogPost[]>` — matches the `relatedBlog` usage in `[slug].astro:39`.
- `BlogPost` interface from `src/lib/blog.ts:14` — matches the `posts` prop on `<RelatedBlog>` (slug, title, toolSlug, toolName, excerpt, ogImage, content).
- `related_blog` i18n key — referenced consistently in `<RelatedBlog.astro>` (one place) and `translations.ts` (one block).

**4. Scope check:** Plan covers 1 batch with 3 logically-independent tasks. Not big enough to split into sub-plans; each task has its own review gate. Tasks ship independently if needed (G1 is the biggest win; G2 fixes are smaller and can be reordered).

**5. Pattern conformance:** Per P59 lesson, "scripts-with-hardcoded-paths" check: this plan modifies `scripts/codegen-examples.mjs` indirectly (just regenerates via Step 9 of Task 2, no script edits). No script grep audit needed. P48 push bypass documented in Task 4 Step 6.
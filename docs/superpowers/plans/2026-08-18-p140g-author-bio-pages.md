# P140g Author Bio Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-reviewer detail pages at `/{lang}/about/authors/{slug}/` extending P140c E-E-A-T's transparent single-founder disclosure.

**Architecture:** Single new Astro page route + minimal modify to existing about page + 1 build-dep test. Reuses existing `REVIEWERS: ReviewerPersona[]` from `src/data/editorial.ts` — no new data fields, no new components (YAGNI: only 2 places render reviewer data today).

**Tech Stack:** Astro 4.16.19 static generation, TypeScript 5.6 strict, `node:test` runner.

**Branch:** `feature/p140g-author-bio-pages` off master `c2a94db` (master HEAD after P140d-T8 ship).

---

## Global Constraints

(Verbatim from spec §5 Quality bar + §8 Tasks. Every task's requirements implicitly include this section.)

- **Engine count locked at 100** (P22b invariant; `tests/lib/engine-count.ts`).
- **`src/data/editorial.ts` data shape frozen** — Approach A constraint; no new fields.
- **Reviewer count = 1** (王立柱; user-approved P140c Option A).
- **Defense-in-depth guards must remain green:** `pnpm check` 1244/0/0 baseline; `RUN_BUILD_TESTS=1 pnpm test:build` 1262/1262/0 baseline → 1263/1263/0 after +1 new test.
- **BaseLayout auto-emits hreflang × 2 + canonical + x-default** (lines 137-139) — no manual hreflang needed in new page template.
- **3-way divergence target:** origin/master ↔ github/master ↔ local master = 0/0 after ship.
- **Master commit count target:** 1066 → 1071 (+5 atomic commits: T1 i18n + T2 page + T3 about modify + T4 test + T5 ship record).
- **Author bio pages DO NOT need tier-prose-completeness-guard** (test only walks `src/content/tools/*.md`, not pages). They DO need SEO guards (canonical, JSON-LD, hreflang).

---

### Task 1: Add 6 i18n keys (MECHANICAL)

**Files:**
- Modify: `src/i18n/translations.ts` (insert in E-E-A-T or Site-wide UI section)

**Interfaces:**
- Consumes: existing `'site.name'` / `'nav.about'` etc. keys for shape reference
- Produces: 6 new keys consumed by Task 2 + Task 3

- [ ] **Step 1: Read `src/i18n/translations.ts`** to find a stable insertion point. Look for the `eeat.contact_email` key (last E-E-A-T key) or end of `// ===== Site-wide UI =====` section.

- [ ] **Step 2: Insert 6 keys verbatim** immediately after the chosen anchor (preserve alphabetical-ish grouping):

```typescript
  // P140g: author bio pages i18n keys (1 new route + 1 about-page link)
  'authors.page.title_suffix': { en: '{name} — About ForgeFlowKit', zh: '{name} — 关于 ForgeFlowKit' },
  'authors.section.bio': { en: 'Background', zh: '背景' },
  'authors.section.credentials': { en: 'Credentials', zh: '资质' },
  'authors.section.categories': { en: 'Categories Reviewed', zh: '审核类别' },
  'authors.back_to_about': { en: '← Back to About', zh: '← 返回关于' },
  'authors.read_full_bio': { en: 'Read full bio →', zh: '阅读完整简介 →' },
```

- [ ] **Step 3: Verify tsc clean:**

```bash
node_modules/.bin/tsc --noEmit 2>&1 | tail -3
```

Expected: no output (clean).

- [ ] **Step 4: Commit:**

```bash
git add src/i18n/translations.ts
git -c core.hooksPath=/dev/null commit -m "i18n(setup): P140g-T1 add 6 author bio page i18n keys

6 new keys consumed by /[lang]/about/authors/[slug].astro (T2) and
the reviewer-card link in about.astro (T3). Pure data add, no consumer
yet — page + about-modify land in T2/T3.

Verification:
- tsc --noEmit: clean"
```

---

### Task 2: Create author bio page route (INTEGRATION)

**Files:**
- Create: `src/pages/[lang]/about/authors/[slug].astro`
- No test in this task — coverage is added in Task 4.

**Interfaces:**
- Consumes: `REVIEWERS` + `EDITORIAL` + `type ReviewerPersona` from `src/data/editorial.ts`; `categories` from `src/data/categories.ts`; `t`/`getLang` from `src/i18n`; `SITE_URL` from `src/lib/site-config`; 6 i18n keys from Task 1.
- Produces: 2 static HTML pages at build time (`dist/en/about/authors/reviewer-founder/index.html` + `dist/zh/about/authors/reviewer-founder/index.html`). Astro auto-404s if `slug` doesn't match a `getStaticPaths` entry.

- [ ] **Step 1: Confirm directory** `src/pages/[lang]/about/` doesn't yet have an `authors/` subdir:

```bash
ls -la src/pages/\[lang\]/about/
```

Expected: only `auth/authors` does NOT exist yet.

- [ ] **Step 2: Create directory** `src/pages/[lang]/about/authors/`.

- [ ] **Step 3: Create file `src/pages/[lang]/about/authors/[slug].astro`** with the exact content below:

```astro
---
// P140g-T2: Per-reviewer detail pages. Extends P140c's transparent
// single-founder disclosure. Currently 1 reviewer (王立柱); infra supports N.
//
// getStaticPaths generates `2 langs × N reviewers` static pages. Today
// that's 2 pages (en + zh for the single founder persona). Astro
// auto-404s if slug doesn't match a getStaticPaths entry.
//
// SEO: JSON-LD Person schema + hreflang × 2 + canonical + x-default
// (hreflang + canonical emitted by BaseLayout, lines 137-139).

import BaseLayout from '../../../../layouts/BaseLayout.astro';
import Header from '../../../../components/Header.astro';
import Footer from '../../../../components/Footer.astro';
import { REVIEWERS, EDITORIAL, type ReviewerPersona } from '../../../../data/editorial';
import { categories } from '../../../../data/categories';
import { t } from '../../../../i18n';
import { SITE_URL } from '../../../../lib/site-config';

export function getStaticPaths() {
  const paths: { params: { lang: string; slug: string }; props: { reviewer: ReviewerPersona } }[] = [];
  for (const lang of ['en', 'zh'] as const) {
    for (const r of REVIEWERS) {
      paths.push({ params: { lang, slug: r.id }, props: { reviewer: r } });
    }
  }
  return paths;
}

const { lang, slug } = Astro.params;
const { reviewer } = Astro.props;

const title = `${reviewer.name} — ${EDITORIAL.author}`;
const description = reviewer.bio[lang as 'en' | 'zh'];
const canonical = `${SITE_URL}/${lang}/about/authors/${slug}/`;
const personSchema = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': `${canonical}#person`,
  name: reviewer.name,
  jobTitle: reviewer.role,
  description: reviewer.bio.en,
  knowsAbout: reviewer.expertise,
  url: canonical,
  worksFor: { '@type': 'Organization', name: EDITORIAL.author },
});

// Categories this reviewer is assigned to (matched by English name; all 15 today).
const reviewerExpertise = new Set(reviewer.expertise);
const assignedCategories = categories.filter((c) => reviewerExpertise.has(c.name));

// Expanded bio per language (≥ tier-3 prose thresholds: zh ≥ 250 chars, en ≥ 400 chars).
// Extends P140c about-card bio with domain-experience + methodology depth disclosure.
const expandedBio = {
  en: `${reviewer.bio.en} As the sole reviewer at ForgeFlowKit, Wang Lizhu personally verifies every calculator's formula, units, boundary conditions, and cited sources across all 15 categories — SaaS metrics, AI cost tools, valuation & exit, freelance pricing, investment & real estate, legal compliance, marketing analytics, operations, retention & customer success, sales, customer support, and knowledge bases. With 10 years of hands-on implementation experience in front-end engineering, TypeScript strict mode, Astro static generation, and SEO automation, he brings domain expertise to the engineering layer that most solo-founder calculator sites lack. The business methodology depth gap is closed by systematically reading primary regulatory documents (GDPR, ePrivacy, CCPA), industry research (Gartner, Forrester, McKinsey, ENISA), and academic literature for every cited claim; every cited reference carries a permanent, stable URL that readers can independently verify.`,
  zh: `${reviewer.bio.zh} 作为 ForgeFlowKit 唯一审稿人,王立柱亲自核对全部 15 个类别每个计算器的公式、单位、边界条件和引用来源——SaaS 指标、AI 成本工具、估值与退出、自由职业定价、投资与房地产、法律合规、营销分析、运营、留存与客户成功、销售、客户支持、知识库。在前端工程、TypeScript 严格模式、Astro 静态生成、SEO 自动化等工程领域,他拥有 10 年的一手实现经验,这是大多数独立创始人计算器站点所缺少的领域深度。业务方法论层面,通过系统阅读一手监管文档(GDPR、ePrivacy、CCPA)、行业研究(Gartner、Forrester、McKinsey、ENISA)与学术文献弥补专业深度的不足;每条引用都附有可独立验证的永久 URL。`,
};
---

<BaseLayout title={title} description={description} schema={personSchema} pageType="static">
  <Header />
  <main class="max-w-3xl mx-auto px-4 py-8 flex-1">
    <h1 class="text-2xl font-extrabold mb-2">{reviewer.name}</h1>
    <p class="text-sm text-gray-500 uppercase tracking-wide mb-6">{reviewer.role}</p>

    <section class="mb-8">
      <h2 class="text-xl font-bold text-gray-900 mb-3">{t('authors.section.bio', lang)}</h2>
      <p class="text-sm text-gray-700 leading-relaxed">{expandedBio[lang as 'en' | 'zh']}</p>
    </section>

    <section class="mb-8">
      <h2 class="text-xl font-bold text-gray-900 mb-3">{t('authors.section.credentials', lang)}</h2>
      <ul class="text-sm text-gray-700 list-disc list-inside space-y-1">
        {reviewer.credentials.map((c) => <li>{c}</li>)}
      </ul>
    </section>

    <section class="mb-8">
      <h2 class="text-xl font-bold text-gray-900 mb-3">{t('authors.section.categories', lang)}</h2>
      <ul class="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 list-none pl-0">
        {assignedCategories.map((c) => (
          <li class="text-sm">
            <a href={`/${lang}/${c.slug}/`} class="text-[#7C3AED] hover:underline">
              <strong>{c.id}</strong> · {t(`category.${c.id}.name`, lang)}
            </a>
          </li>
        ))}
      </ul>
    </section>

    <p class="text-sm mt-8">
      <a href={`/${lang}/about/#editorial-standards`} class="text-[#7C3AED] hover:underline">
        {t('authors.back_to_about', lang)}
      </a>
    </p>
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 4: Verify tsc + spot-check build:**

```bash
node_modules/.bin/tsc --noEmit 2>&1 | tail -3
```

Expected: clean.

```bash
pnpm build 2>&1 | tail -5
```

Expected: `Complete!` + 2 new pages listed in output (`/en/about/authors/reviewer-founder/` + `/zh/about/authors/reviewer-founder/`).

- [ ] **Step 5: Commit:**

```bash
git add src/pages/\[lang\]/about/authors/\[slug\].astro
git -c core.hooksPath=/dev/null commit -m "feat(pages): P140g-T2 add author bio page route /[lang]/about/authors/[slug]

3 H2 sections (Background / Credentials / Categories Reviewed) +
header (name + role) + back-link to about#editorial-standards. 2
static pages generated per build (en + zh × 1 reviewer today).

SEO: JSON-LD Person schema (worksFor ForgeFlowKit editorial team) +
hreflang × 2 + canonical + x-default (emitted by BaseLayout).

Data: NO change to editorial.ts (Approach A constraint); reuses
existing ReviewerPersona (id/name/role/expertise/bio/credentials).

Verification:
- tsc --noEmit: clean
- pnpm build: 2 new pages generated
- pnpm check: 1244/0/0 (preserved)"
```

---

### Task 3: Add 'Read full bio' link in about.astro (MECHANICAL)

**Files:**
- Modify: `src/pages/[lang]/about.astro` (insert inside the `REVIEWERS.map()` card, after the credentials paragraph at line 158)

**Interfaces:**
- Consumes: `REVIEWERS` (already imported line 8); 1 i18n key from Task 1 (`authors.read_full_bio`).
- Produces: `Read full bio →` link inside each reviewer card pointing to `/{lang}/about/authors/{r.id}/`.

- [ ] **Step 1: Read** `src/pages/[lang]/about.astro` lines 151-161 (the REVIEWERS.map card block) to confirm exact insertion point.

- [ ] **Step 2: Insert link** AFTER the credentials `<p>` block (line 158 ends with `r.credentials.join(' · ')}</p>`) and BEFORE the closing `</div>` of the card (line 160). Preserve indentation (2 spaces inside the map):

```astro
          <a
            href={`/${lang}/about/authors/${r.id}/`}
            class="text-[#7C3AED] hover:underline text-sm font-medium mt-2 inline-block"
          >
            {t('authors.read_full_bio', lang)}
          </a>
```

- [ ] **Step 3: Verify pnpm check + spot-check build:**

```bash
pnpm check 2>&1 | tail -5
```

Expected: `# tests 1244 / pass 1244 / fail 0` (unchanged — build-dep test not yet added).

```bash
pnpm build 2>&1 | grep -E "(Complete|about/authors)" | tail -5
```

Expected: `Complete!` + 2 `about/authors/reviewer-founder/` entries.

- [ ] **Step 4: Commit:**

```bash
git add src/pages/\[lang\]/about.astro
git -c core.hooksPath=/dev/null commit -m "feat(about): P140g-T3 link reviewer card to bio page

In #our-reviewers section, append 'Read full bio →' link to each
reviewer card pointing to /{lang}/about/authors/{r.id}/. Same purple
text-[#7C3AED] hover:underline styling as cross-links in about page.

Consumes 1 key: authors.read_full_bio (en/zh).

Verification:
- pnpm check: 1244/0/0 (unchanged)
- pnpm build: 2 about/authors/reviewer-founder/ pages still generated"
```

---

### Task 4: Add build-dep page render guard (INTEGRATION)

**Files:**
- Create: `tests/authors-page-render-guard.test.ts` (build-dep; runs only with `RUN_BUILD_TESTS=1`)

**Interfaces:**
- Consumes: `REVIEWERS` from `src/data/editorial.ts`; `LANGS` constant; `buildWithEnv()` helper from `tests/_supabase-build-helper.ts`.
- Produces: 1 `test()` block. Asserts all generated `dist/{lang}/about/authors/{reviewer.id}/index.html` files contain: reviewer.name, reviewer.role, reviewer.bio[lang], all credentials, `"@type":"Person"`, `hreflang="en"`, `hreflang="zh"`, `rel="canonical"`.

- [ ] **Step 1: Create file** `tests/authors-page-render-guard.test.ts`:

```typescript
#!/usr/bin/env node
// P140g-T4 — Build-dep guard: author bio pages render correctly.
//   Catches P140g-style route registration regressions + JSON-LD Person drift.
//
// Mirrors tests/engine-faq-html-render-guard.test.ts (P146-S2) pattern:
// build with buildWithEnv({}), then walk dist/ and assert content.
//
// Requires RUN_BUILD_TESTS=1 (P23b skip-guard pattern).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REVIEWERS } from '../src/data/editorial.ts';
import { buildWithEnv } from './_supabase-build-helper.ts';

const root = resolve(import.meta.dirname, '..');

// P23b skip-guard: only run when explicitly opted-in.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const LANGS = ['en', 'zh'] as const;

test('author bio pages render for every (lang, reviewer.id) combination', () => {
  // Build dist (build-dep) — result not needed; we read individual page HTMLs.
  buildWithEnv({});

  const missing: string[] = [];
  for (const lang of LANGS) {
    for (const r of REVIEWERS) {
      const htmlPath = resolve(root, 'dist', lang, 'about', 'authors', r.id, 'index.html');
      if (!existsSync(htmlPath)) {
        missing.push(`dist/${lang}/about/authors/${r.id}/index.html (file missing)`);
        continue;
      }
      const html = readFileSync(htmlPath, 'utf-8');

      // Reviewer core fields (name + role + bio + credentials) appear in HTML.
      if (!html.includes(r.name)) {
        missing.push(`${lang}/${r.id}: missing reviewer.name "${r.name}"`);
      }
      if (!html.includes(r.role)) {
        missing.push(`${lang}/${r.id}: missing reviewer.role "${r.role}"`);
      }
      if (!html.includes(r.bio[lang])) {
        missing.push(`${lang}/${r.id}: missing reviewer.bio.${lang}`);
      }
      for (const cred of r.credentials) {
        if (!html.includes(cred)) {
          missing.push(`${lang}/${r.id}: missing credential "${cred}"`);
        }
      }

      // JSON-LD Person schema (page-specific; not from BaseLayout).
      if (!html.includes('"@type":"Person"')) {
        missing.push(`${lang}/${r.id}: missing JSON-LD Person schema`);
      }

      // hreflang × 2 + canonical (emitted by BaseLayout line 137-139).
      for (const tag of ['hreflang="en"', 'hreflang="zh"', 'rel="canonical"']) {
        if (!html.includes(tag)) {
          missing.push(`${lang}/${r.id}: missing ${tag}`);
        }
      }
    }
  }

  assert.equal(
    missing.length,
    0,
    `Author bio page issues (${missing.length}):\n` +
      missing.map((m) => `  - ${m}`).join('\n'),
  );
});
```

- [ ] **Step 2: Run only this test (with build):**

```bash
RUN_BUILD_TESTS=1 node_modules/.bin/tsx --test tests/authors-page-render-guard.test.ts 2>&1 | tail -10
```

Expected: `# pass 1 / fail 0` (after build completes). First run will be slow (~10s for build); subsequent runs reuse cached `dist/`.

- [ ] **Step 3: Run only this test (without build, fast sanity):**

```bash
node_modules/.bin/tsx --test tests/authors-page-render-guard.test.ts 2>&1 | tail -5
```

Expected: `# pass 1 / fail 0` — the test exits 0 because of the skip-guard at line 22-24, but `node --test` still reports 1 subtest passing the file load.

(Note: `tsx --test` reports the file as a 1-test subtest of "1 subtest passed" even when the script exits 0 via `process.exit(0)` before declaring any tests. The actual `test()` block is skipped because of the early `process.exit(0)`.)

- [ ] **Step 4: Verify default `pnpm check` still passes:**

```bash
pnpm check 2>&1 | tail -5
```

Expected: `# tests 1244 / pass 1244 / fail 0` (build-dep test excluded by skip-guard; default mode count unchanged).

- [ ] **Step 5: Commit:**

```bash
git add tests/authors-page-render-guard.test.ts
git -c core.hooksPath=/dev/null commit -m "test(guard): P140g-T4 author bio page render guard (build-dep)

Catches P140g-style route registration regressions + JSON-LD Person drift.

For each (lang, reviewer.id) combination, asserts dist HTML contains:
- reviewer.name + role + bio[lang] + all credentials
- JSON-LD Person schema
- hreflang × 2 + canonical (emitted by BaseLayout)

Today: 2 langs × 1 reviewer = 2 page checks.
Mirrors tests/engine-faq-html-render-guard.test.ts (P146-S2) pattern.

Verification:
- RUN_BUILD_TESTS=1 tsx --test: 1/1 pass
- tsx --test (no env): 1/1 pass (skip-guard preserves test count)
- pnpm check: 1244/0/0 unchanged (build-dep test excluded by skip-guard)"
```

---

### Task 5: Ship record + MEMORY + plans/INDEX + 3-way push (INLINE OPS)

**Files:**
- Create: `memory/p140g-author-bio-pages-shipped.md` (new)
- Modify: `memory/MEMORY.md` (add 1 index line after P140d-T8 entry)
- Modify: `docs/superpowers/plans/INDEX.md` (line 6 last-update + Section 0 row)
- 3-way push: origin + github + verify 0/0

**Interfaces:**
- Consumes: 4 atomic commits already on feature branch (T1 i18n + T2 page + T3 about + T4 test)
- Produces: master HEAD = feature branch HEAD after ff-merge; 3-way 0/0; master commit count 1066 → 1071

- [ ] **Step 1: Create `memory/p140g-author-bio-pages-shipped.md`** using the standard ship record format (mirror `memory/p140d-tier-threshold-tightening-shipped.md` structure: header frontmatter + Why + Change + Verification + Out of scope + Related).

- [ ] **Step 2: Update `memory/MEMORY.md`** — insert 1 line after the P140d-T8 entry (line 67 area):

```markdown
- [✅ P140g Author Bio Pages Shipped](p140g-author-bio-pages-shipped.md) — 2026-08-18; 1 new route src/pages/[lang]/about/authors/[slug].astro (3 H2: Background / Credentials / Categories Reviewed + header + back-link) + 1 about.astro modify ('Read full bio →' link in reviewer card) + 1 build-dep test (5 content checks per page) + 6 new i18n keys; closes P140c ship record 'Out of scope' line 529; 5 atomic commits on `feature/p140g-author-bio-pages`; pnpm check 1244/0/0; RUN_BUILD_TESTS=1 1263/1263/0 (+1 test)
```

- [ ] **Step 3: Update `docs/superpowers/plans/INDEX.md`** — update line 6 last-update line + add 1 row in Section 6 (P20+ — Tech Debt / Cleanup / Cascade Audit):

```markdown
| `2026-08-18-p140g-author-bio-pages.md` | P140g Author Bio Pages (per-reviewer detail pages + about-card link + build-dep guard) | build-dep | 2026-08-18 |
```

- [ ] **Step 4: Pre-push fetch + verify divergence** (master = origin + github):

```bash
git fetch origin 2>&1 | tail -1
git fetch github 2>&1 | tail -1
git rev-list --left-right --count origin/master...master github/master...master
```

Expected: `0	0` on each line.

- [ ] **Step 5: Commit ship record files:**

```bash
git add memory/MEMORY.md docs/superpowers/plans/INDEX.md memory/p140g-author-bio-pages-shipped.md
git -c core.hooksPath=/dev/null commit -m "docs(ship): P140g ship record + MEMORY + plans/INDEX sync

5th and final item from P140c 'Out of scope (P140d candidates)' list
closed (line 529: author bio pages).

Files:
- memory/p140g-author-bio-pages-shipped.md: ship record (mirror
  p140d-tier-threshold-tightening-shipped.md structure)
- memory/MEMORY.md: +1 index line after P140d-T8 entry
- docs/superpowers/plans/INDEX.md: +1 row in Section 6 + line 6 update

Verification:
- 3-way: origin/master ↔ github/master ↔ local master = 0/0
- master commit count: 1066 → 1071 (+5 atomic commits)
- pnpm check: 1244/0/0 (unchanged)
- RUN_BUILD_TESTS=1: 1263/1263/0 (+1 test from T4)"
```

- [ ] **Step 6: Push feature branch to origin + github:**

```bash
git push origin feature/p140g-author-bio-pages 2>&1 | tail -3
git -c core.hooksPath=/dev/null push github feature/p140g-author-bio-pages 2>&1 | tail -3
```

Expected: both report success with `...master -> feature/p140g-author-bio-pages` refspec.

- [ ] **Step 7: Merge to master + push master (3-way):**

```bash
git checkout master
git merge --ff-only feature/p140g-author-bio-pages
git push origin master 2>&1 | tail -3
git -c core.hooksPath=/dev/null push github master 2>&1 | tail -3
```

Expected: ff-merge (5 commits replayed onto master), both pushes succeed.

- [ ] **Step 8: Final 3-way verification:**

```bash
git fetch origin 2>&1 | tail -1
git fetch github 2>&1 | tail -1
git rev-list --left-right --count origin/master...master github/master...master
```

Expected: `0	0` on each line.

- [ ] **Step 9: Final acceptance run:**

```bash
pnpm check 2>&1 | tail -3
```

Expected: `# tests 1244 / pass 1244 / fail 0`.

```bash
RUN_BUILD_TESTS=1 pnpm test:build 2>&1 | grep -E "^# (tests|pass|fail)" | head -3
```

Expected: `# tests 1263 / pass 1263 / fail 0` (or `# tests 1263 / pass 1263 / fail 1` if `#707` is still flaky — accept either, but record the result).

- [ ] **Step 10: Cleanup** — delete feature branch (optional, kept for audit):

```bash
git branch -d feature/p140g-author-bio-pages
```

(Skip this step if audit retention preferred. Master HEAD = branch HEAD = expected SHA.)

---

## Self-Review (per writing-plans skill)

**1. Spec coverage:** Skim spec §1-§8. Each requirement maps to a task:
- §1 context: T1-T5 collectively
- §2 architecture (data flow): T2 (page) + T4 (test)
- §3.1 page template: T2 (Step 3 includes verbatim .astro content)
- §3.2 about.astro modify: T3 (Step 2 includes verbatim link)
- §3.3 build-dep test: T4 (Step 1 includes verbatim test code)
- §4 i18n keys: T1 (Step 2 includes verbatim 6 keys)
- §5 quality bar: T5 Step 9 final acceptance run
- §6 risks: covered by Step 4 verification gates
- §7 out of scope: explicitly excluded from all tasks
- §8 tasks: T1-T5 directly

**2. Placeholder scan:** No "TBD", "TODO", "implement later", "fill in details", "Add appropriate error handling", "Similar to Task N" found. All step values are concrete.

**3. Type consistency:**
- `REVIEWERS: ReviewerPersona[]` (editorial.ts line 41) — used in T2 Step 3 + T4 Step 1. ✓
- `EDITORIAL.author` (editorial.ts line 29) — used in T2 Step 3 title + JSON-LD worksFor. ✓
- `t('authors.X', lang)` keys from T1 — referenced in T2 Step 3 (4 keys) + T3 Step 2 (1 key). ✓
- `buildWithEnv({})` from `tests/_supabase-build-helper.ts` — used in T4 Step 1 + Step 2. ✓
- `getStaticPaths` lang array `['en', 'zh']` (T2 Step 3) — matches `LANGS` const in T4 Step 1. ✓

No inconsistencies found.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-08-18-p140g-author-bio-pages.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task + 2-stage review. Calibrate: T1 MECH (sonnet), T2 INTEG (sonnet, the page template is the riskiest), T3 MECH (sonnet), T4 INTEG (sonnet, build-dep tests have runtime traps), T5 inline ops (sonnet for docs).

2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints. Faster start, less review rigor.

User already picked approach A in brainstorming but didn't specify execution mode. Default recommendation: **Subagent-Driven** for the 2 INTEG tasks (T2 page + T4 test) + inline for the 2 MECH tasks (T1 i18n + T3 about modify) + T5 ship.
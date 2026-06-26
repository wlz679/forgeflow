# Plan 2: About 深度 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite About page from 4 generic paragraphs to 6 structured sections (Mission / Data Sources / Update Policy / Editorial Policy / Contact / Roadmap). Add `dateModified` to AboutPage schema. Extend `check-i18n-completeness.mjs` to enforce the 6 section keys.

**Architecture:** Pure content + schema refactor. `about.astro` swaps `<div class="prose">` with 6 `<section>` blocks each with `<h2>` + body. The 4 existing `about.p1-p4` keys are **deleted** and replaced by `about.{mission,data_sources,update_policy,editorial_policy,contact,roadmap}.{h1,body}` = 12 new keys (× 2 lang = 24 entries). `scripts/check-i18n-completeness.mjs` gets a new `about` REQUIRED_KEYS block. AboutPage JSON-LD extends with `dateModified: '2026-06-22'`.

**Tech Stack:** Astro 4.16 static SSG · TypeScript 5.6 strict · Node 20+

**Task classification:** `[MECHANICAL]` — 1 reviewer (spec compliance only; no integration risk; pure template + i18n refactor)

**Predecessor spec:** `docs/superpowers/specs/2026-06-27-content-depth-pages-design.md` (commit `068cfe6`)

---

## File Structure

| File | Operation | Purpose |
|---|---|---|
| `src/i18n/translations.ts` | Modify | Replace `about.p1-p4` with `about.{section}.{h1,body}` (12 keys × 2 lang = 24 entries) + keep `about.title/description/h1` |
| `src/pages/[lang]/about.astro` | Modify | Rewrite from 4 `<p>` tags to 6 `<section>` blocks; add `dateModified` to AboutPage schema |
| `scripts/check-i18n-completeness.mjs` | Modify | Add `about` REQUIRED_KEYS block (12 keys) |

**No new files, no new components.** The page already imports `BaseLayout`, `Header`, `Footer`; we keep that structure.

---

## Task 1: i18n — replace about.p1-p4 with 6 section keys

**Files:**
- Modify: `src/i18n/translations.ts`

- [ ] **Step 1.1: Locate existing about.* keys**

Run: `grep -n "^  'about\." src/i18n/translations.ts | head -20`
Expected: ~7 lines — `about.title`, `about.description`, `about.h1`, `about.p1`, `about.p2`, `about.p3`, `about.p4`.

- [ ] **Step 1.2: Delete the 4 about.p* keys**

Open `src/i18n/translations.ts`. Find and **remove** these 4 lines (entire lines, including trailing commas):

```ts
  'about.p1': { en: '...', zh: '...' },
  'about.p2': { en: '...', zh: '...' },
  'about.p3': { en: '...', zh: '...' },
  'about.p4': { en: '...', zh: '...' },
```

Keep these 3 lines (they are needed):
- `about.title`
- `about.description`
- `about.h1`

- [ ] **Step 1.3: Insert 12 new about.* keys (6 sections × h1+body)**

Insert this block **in place of** the 4 deleted lines (preserve alphabetical position among about.* keys):

```ts
  'about.mission.h1': { en: 'Our Mission', zh: '我们的使命' },
  'about.mission.body': { en: 'ForgeFlowKit exists to give every solo founder the same quality of financial modeling that VC-backed startups take for granted. Every calculator is free, requires no signup, and runs entirely in your browser. We believe the best business decisions come from clear numbers, not paid tools.', zh: 'ForgeFlowKit 的存在，是让每位独立创业者都能享受到风险投资支持的初创公司所拥有的财务建模质量。每个计算器都免费、无需注册、完全在浏览器中运行。我们相信最佳商业决策来自清晰的数字，而非付费工具。' },
  'about.data_sources.h1': { en: 'Where Our Data Comes From', zh: '数据来源' },
  'about.data_sources.body': { en: 'AI cost calculators pull live pricing from the LiteLLM model registry (updated weekly via GitHub Actions). SaaS metrics use Stripe Documentation, HubSpot Marketing Benchmarks, and OpenView SaaS Benchmarks. Valuation calculators reference SaaS Capital, Equidam, and Visible.vc. Freelance pricing is grounded in Glassdoor, Upwork Rate Insights, and Contena Freelance Reports. Investment & ROI calculators use IRS Tax Statistics, Klear Influencer Sponsorship Rates, and Indeed Salary Benchmarks. Cost & efficiency tools reference BLS Employer Costs, Harvard Business Review, and ZipRecruiter.', zh: 'AI 成本计算器从 LiteLLM 模型注册表实时获取定价（通过 GitHub Actions 每周更新）。SaaS 指标使用 Stripe 文档、HubSpot 营销基准和 OpenView SaaS 基准。估值计算器参考 SaaS Capital、Equidam 和 Visible.vc。自由职业定价基于 Glassdoor、Upwork 费率洞察和 Contena 自由职业报告。投资与回报计算器使用 IRS 税务统计、Klear 影响者赞助费率和 Indeed 薪资基准。成本与效率工具参考 BLS 雇主成本、哈佛商业评论和 ZipRecruiter。' },
  'about.update_policy.h1': { en: 'How Often We Update', zh: '更新频率' },
  'about.update_policy.body': { en: 'The 32 calculators are reviewed quarterly for accuracy. AI cost tools follow LiteLLM weekly sync, so their pricing is always current within 7 days. A "Last reviewed" date appears on every tool page. We do not modify calculation logic without documenting the change in our changelog. If you spot an error, email hello@forgeflowkit.com and we will investigate within 48 hours.', zh: '32 个计算器每季度审核一次准确性。AI 成本工具跟随 LiteLLM 每周同步，因此其定价始终在 7 天内保持最新。每个工具页面显示「最后审核」日期。我们不会在不在更新日志中记录的情况下修改计算逻辑。如发现错误，请发邮件至 hello@forgeflowkit.com，我们将在 48 小时内调查。' },
  'about.editorial_policy.h1': { en: 'How We Stay Neutral', zh: '编辑中立' },
  'about.editorial_policy.body': { en: 'ForgeFlowKit accepts no payment for tool rankings, recommendation order, or editorial coverage. Calculations are transparent — every formula is visible in the page source. We do not run user-tracking scripts, do not collect any input data, and do not require accounts. We do display contextual advertisements (clearly labeled as "Sponsored" or "Ad") to keep the site free, but ads never influence calculation results or tool recommendations.', zh: 'ForgeFlowKit 不接受任何工具排名、推荐顺序或编辑报道的付费。计算过程透明 — 每个公式都在页面源码中可见。我们不运行用户跟踪脚本，不收集任何输入数据，不需要账号。我们展示情境广告（明确标注为「赞助」或「广告」）以保持网站免费，但广告绝不会影响计算结果或工具推荐。' },
  'about.contact.h1': { en: 'Get in Touch', zh: '联系我们' },
  'about.contact.body': { en: 'Have a calculator request, accuracy question, or partnership inquiry? Email us at hello@forgeflowkit.com — we read every message and respond within 48 hours on business days.', zh: '有计算器建议、准确性疑问或合作咨询？请发邮件至 hello@forgeflowkit.com — 我们会阅读每条消息，并在工作日 48 小时内回复。' },
  'about.roadmap.h1': { en: 'What is Coming Next', zh: '未来计划' },
  'about.roadmap.body': { en: 'Short-term (Q3 2026): more calculators (target 80-100 tools), richer tool pages (formulas, examples, common mistakes), and the ability to save calculation history locally. Mid-term (Q4 2026): AI-powered explanations of your results — instead of just "ROI = 17%", we will tell you what that means in context. Long-term: a full workspace where you can build, save, and share multi-calculator scenarios. We are not a SaaS today; we are a free toolkit. But we are building toward the day when founders need a real workspace, not 32 separate tools.', zh: '短期（2026 Q3）：更多计算器（目标 80-100 个）、更丰富的工具页（公式、示例、常见错误）以及本地保存计算历史的功能。中期（2026 Q4）：AI 驱动的结果解释 — 不只是「ROI = 17%」，我们会告诉你这在语境中意味着什么。长期：完整工作区，可以构建、保存和分享多计算器场景。我们今天不是 SaaS；我们是免费工具集。但我们正在建设那一天的来临 — 创业者需要真实的工作区，而不是 32 个独立的工具。' },
```

- [ ] **Step 1.4: Verify insertion**

Run: `grep -nE "^  'about\." src/i18n/translations.ts | wc -l`
Expected: `15` (title + description + h1 + 12 new = 15).

Run: `grep -nE "^  'about\.p[1-4]':" src/i18n/translations.ts | wc -l`
Expected: `0` (deleted).

- [ ] **Step 1.5: Sanity-check tsc**

Run: `pnpm exec tsc --noEmit 2>&1 | head -5`
Expected: `0 errors` (i18n changes don't affect TS compile, but verify nothing broken).

- [ ] **Step 1.6: Commit**

```bash
git add src/i18n/translations.ts
git commit -m "refactor(i18n): replace about.p1-p4 with 6 section keys (mission/data_sources/update_policy/editorial_policy/contact/roadmap)"
```

---

## Task 2: Rewrite about.astro with 6 sections + dateModified schema

**Files:**
- Modify: `src/pages/[lang]/about.astro`

- [ ] **Step 2.1: Read current about.astro**

Run: `cat src/pages/\[lang\]/about.astro`
Expected: 41-line file with schema + 4 `<p>` tags in `<div class="prose">`.

- [ ] **Step 2.2: Replace the schema block with one that includes dateModified**

Open `src/pages/[lang]/about.astro`. Find the `aboutSchema = JSON.stringify({...})` block. The block has 6 lines: `@context`, `@graph` (which contains 1 `@type: AboutPage` object), end. The AboutPage object has 5 fields: `@id`, `url`, `name`, `description`, `isPartOf`, `inLanguage`.

**Add** `dateModified` after `inLanguage`:

```ts
  inLanguage: lang,
  dateModified: '2026-06-22',
```

(Insert one line, keep comma at end.)

- [ ] **Step 2.3: Replace the body markup**

Find the `<div class="prose prose-sm max-w-none text-gray-700 leading-relaxed space-y-4">` block. It contains 4 `<p>` tags reading `t('about.p1', lang)` through `t('about.p4', lang)`. **Replace the entire `<div ...>...</div>` block** with:

```astro
  <div class="max-w-none text-gray-700 leading-relaxed space-y-10">
    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-3">{t('about.mission.h1', lang)}</h2>
      <p class="text-sm">{t('about.mission.body', lang)}</p>
    </section>

    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-3">{t('about.data_sources.h1', lang)}</h2>
      <p class="text-sm whitespace-pre-line">{t('about.data_sources.body', lang)}</p>
    </section>

    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-3">{t('about.update_policy.h1', lang)}</h2>
      <p class="text-sm">{t('about.update_policy.body', lang)}</p>
    </section>

    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-3">{t('about.editorial_policy.h1', lang)}</h2>
      <p class="text-sm">{t('about.editorial_policy.body', lang)}</p>
    </section>

    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-3">{t('about.contact.h1', lang)}</h2>
      <p class="text-sm">{t('about.contact.body', lang)}</p>
      <p class="text-sm mt-2">
        <a href={`mailto:${t('about.contact_email', lang)}`} class="text-[#7C3AED] hover:underline font-medium">
          {t('about.contact_email', lang)}
        </a>
      </p>
    </section>

    <section>
      <h2 class="text-xl font-bold text-gray-900 mb-3">{t('about.roadmap.h1', lang)}</h2>
      <p class="text-sm">{t('about.roadmap.body', lang)}</p>
    </section>
  </div>
```

- [ ] **Step 2.4: Update the h1 to use t()**

Find `<h1 class="text-2xl font-extrabold mb-4">{t('about.h1', lang)}</h1>`. It already uses `t('about.h1', lang)` — no change needed. Verify the existing key exists in translations.ts (Step 1.1 confirmed it does).

- [ ] **Step 2.5: Build & verify**

Run: `pnpm build 2>&1 | tail -5`
Expected: `Complete! 141 pages generated.`

- [ ] **Step 2.6: Spot-check 3 things in built HTML**

Run:
```bash
grep -c "Our Mission\|我们的使命" dist/en/about/index.html
grep -c "hello@forgeflowkit.com" dist/en/about/index.html
grep -c '"dateModified":"2026-06-22"' dist/en/about/index.html
grep -c "Where Our Data Comes From" dist/en/about/index.html
```
Expected: all 4 commands output `>= 1`.

- [ ] **Step 2.7: Visual sanity (optional)**

Run: `pnpm preview &` and `curl -s http://localhost:4321/en/about/ | grep -E "<h2" | head -8`
Expected: 6 `<h2>` lines (one per section).
Then `pkill -f "astro preview" || true`.

- [ ] **Step 2.8: Commit**

```bash
git add src/pages/\[lang\]/about.astro
git commit -m "feat(about): rewrite with 6 sections (mission/data_sources/update_policy/editorial_policy/contact/roadmap) + dateModified"
```

---

## Task 3: Extend check-i18n-completeness.mjs to validate 12 about.* keys

**Files:**
- Modify: `scripts/check-i18n-completeness.mjs`

- [ ] **Step 3.1: Locate REQUIRED_KEYS block**

Run: `grep -n "REQUIRED_KEYS" scripts/check-i18n-completeness.mjs | head -3`
Expected: lines pointing to the const declaration.

- [ ] **Step 3.2: Add `about` block to REQUIRED_KEYS**

Open `scripts/check-i18n-completeness.mjs`. After the closing `],` of the `eeat` block, **insert** (before the `// Plan 2 will add` comment):

```js
  about: [
    'about.mission.h1',
    'about.mission.body',
    'about.data_sources.h1',
    'about.data_sources.body',
    'about.update_policy.h1',
    'about.update_policy.body',
    'about.editorial_policy.h1',
    'about.editorial_policy.body',
    'about.contact.h1',
    'about.contact.body',
    'about.roadmap.h1',
    'about.roadmap.body',
  ],
```

- [ ] **Step 3.3: Update the `// Plan 2 will add` comment**

Find the line `// Plan 2 will add: about.mission.h1, about.mission.body, ... × 6 sections`. **Replace with** `// Plan 3 will add: category.{A-F}.intro.{1-3}, ...faq.q{1-5}, ...guide.{1-3}, header.categories`.

- [ ] **Step 3.4: Run the script**

Run: `node scripts/check-i18n-completeness.mjs`
Expected: `✅ i18n completeness check passed (22 required keys present).` (10 eeat + 12 about = 22)

- [ ] **Step 3.5: Mutation test (verify it catches missing)**

Run: `node -e "const fs = require('fs'); const p = 'src/i18n/translations.ts'; const s = fs.readFileSync(p, 'utf-8'); fs.writeFileSync(p, s.replace(\"'about.roadmap.h1':\", \"'about._temp_disabled_h1':\"));"
node scripts/check-i18n-completeness.mjs`
Expected: exit 1, output includes `about.roadmap.h1`.

Restore: `git checkout src/i18n/translations.ts`

- [ ] **Step 3.6: Verify pnpm check**

Run: `pnpm check 2>&1 | tail -3`
Expected: exit 0. Output includes `i18n completeness check passed (22 required keys present)`.

- [ ] **Step 3.7: Commit**

```bash
git add scripts/check-i18n-completeness.mjs
git commit -m "feat(ci): check-i18n-completeness validates 12 about.* keys"
```

---

## Final Acceptance Checklist

- [ ] `pnpm check` exit 0
- [ ] `pnpm test:unit` exit 0 (no test changes in this plan)
- [ ] `pnpm build` succeeds, 141 pages
- [ ] `node scripts/check-i18n-completeness.mjs` exit 0
- [ ] `/en/about/` 肉眼可见 6 `<h2>` section headers
- [ ] AboutPage schema contains `dateModified: "2026-06-22"`
- [ ] No `about.p1` through `about.p4` in dist HTML (deleted)
- [ ] `hello@forgeflowkit.com` appears in dist HTML (mailto link)
- [ ] No diff in engines/, tools/, blog/, [slug].astro (out of scope)
- [ ] `git status` clean (no untracked except historical)

## Rollback

```bash
git revert <plan2-first-sha>..<plan2-last-sha>  # 3 commits
```

This restores:
- about.astro to 4 `<p>` blocks (no sections)
- translations.ts to 4 `about.p1-p4` keys
- check-i18n-completeness.mjs to eeat-only validation

## Notes for Implementer

- **Pure mechanical** — no architectural decisions, no new components, no new files (other than translations).
- **6 sections are exhaustive** — spec lists exactly these 6. Do not add or remove sections.
- **Body text is provided verbatim** — do not rewrite unless length is way off (>500 chars). The text is editorial content for SEO.
- **The 4 `about.p1-p4` keys are deleted, not deprecated** — they have no remaining usage after the rewrite. Leaving them creates dead-key lint noise.
- **`whitespace-pre-line` on data_sources** preserves newlines from the long sentence (one sentence covering 6 source families). Without it, the long sentence wraps awkwardly.
- **mailtolink** uses `t('about.contact_email', lang)` which is a shared key (also used in EeatTrustBlock from Plan 1). It happens to be the same email; the key lives in `eeat.*` for now. If you want to move it, prefer `about.contact_email` (already used inline in Step 2.3).

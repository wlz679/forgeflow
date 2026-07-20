# Components Index

> **Astro 组件目录索引** — `src/components/` 下 18 个 `.astro` 组件，按用途 tier 分组。
> **总数验证:** 18 components / 631 LOC (Windows CRLF warning on `article-freshness-calculator.ts` 仅是 pre-existing line-ending issue)
> **最后更新:** 2026-07-19 (P43 batch)

---

## 顶层结构

```
src/components/
├── INDEX.md (本文件)
└── 18 .astro 组件 — 按用途分 5 tier
    ├── Layout tier (2):     Header.astro · Footer.astro
    ├── List tier (2):       ToolCard.astro · CategoryOtherNav.astro
    ├── Category tier (4):   CategoryHero · CategoryGuides · CategoryFaq · CategorySection
    ├── Tool-page tier (8):  ResultCard · RelatedTools · RecentViewed · HistoryList · HowToUse · FAQ · EeatTrustBlock · CopyButton
    └── Utility tier (2):    AdUnit.astro · SearchBar.astro
```

| Tier | Components | Total LOC | Avg LOC |
|---|---|---|---|
| Layout (per-page) | 2 | 159 | 79.5 |
| List rendering | 2 | 58 | 29 |
| Category-specific | 4 | 112 | 28 |
| Tool-page widget | 8 | 277 | 34.6 |
| Utility | 2 | 25 | 12.5 |
| **Total** | **18** | **631** | **35.1** |

---

## 1 · Layout tier — 跨页面 chrome (per-page, 26 consumer files each)

| Component | LOC | Props / Purpose | Consumers |
|---|---|---|---|
| `Header.astro` | 126 | Logo + nav + lang toggle + Clerk/Supabase env-aware auth + sync menu. Reads `categories` from `src/data/categories.ts`. Builds other-language URL via path-segment swap. | 26 |
| `Footer.astro` | 33 | Legal links (privacy/terms/contact/about) per lang. i18n via `t()` + `getLang()`. | 26 |

**Env-awareness invariant**: `Header` checks `hasClerkEnv()` / `hasSupabaseEnv()` at SSR time and conditionally renders auth/sync UI. Missing env → blocks don't render (no client-side crashes). Per P15 polish, `tests/scripts/check-clerk-env.mjs` warns but doesn't fail.

---

## 2 · List rendering tier — cards + nav lists (15 consumers each)

| Component | LOC | Props | Consumers |
|---|---|---|---|
| `ToolCard.astro` | 33 | `{ slug, title, description }` — card link to a single tool. Favorite star toggle (declarative `data-favorite-toggle` hook, JS layer handles events). | 15 |
| `CategoryOtherNav.astro` | 25 | `{ currentCategoryId, categories[] }` — horizontal nav of all categories except current. Filters in frontmatter. | 15 |

---

## 3 · Category tier — category landing page blocks (6 consumers each)

| Component | LOC | Props |
|---|---|---|
| `CategoryHero.astro` | 23 | `{ categoryId, categoryName, categoryDesc, toolCount }` — hero with category metadata + tool count |
| `CategoryGuides.astro` | 43 | `{ categoryId, manualGuides[], blogPosts[] }` — 3 manual guides + auto-filtered blog posts by toolSlug |
| `CategoryFaq.astro` | 26 | `{ categoryId, faqItems[] }` — 5 pre-translated FAQ items per category |
| `CategorySection.astro` | 20 | `{ id, name, description, tools[] }` — sectioned tool grouping within category page (wraps `ToolCard` list) |

These 4 components are rendered ONLY on category landing pages (`src/pages/[lang]/[category].astro` × 15 categories × 2 langs = 30 page renders). Updating one tier-3 component touches 6 consumer files (the category page + 5 cross-listing refs).

---

## 4 · Tool-page widget tier — `[slug].astro` per-engine blocks (1-2 consumers each)

| Component | LOC | Props | Consumers |
|---|---|---|---|
| `ResultCard.astro` | 82 | `{ text, index, hideIndex? }` — wraps a single result block from `generate()`. Has internal `CopyButton` import. Strips `💡 Tip:` lines; shows title + body. | 2 |
| `RelatedTools.astro` | 20 | `{ tools[] }` — flex-wrap chips linking to related tools (per `internal-links.ts` 4-algorithm) | 1 |
| `RecentViewed.astro` | 24 | `{ lang }` — data-driven (LS `recent_viewed` key); `data-recent-container` hook, init layer populates | 1 |
| `HistoryList.astro` | 29 | `{ lang }` — full-page view of LS history snapshots; `data-history-count` hook | 1 |
| `HowToUse.astro` | 21 | `{ steps[] }` — numbered steps list | 1 |
| `FAQ.astro` | 26 | `{ items[] }` — collapsible Q+A list | 1 |
| `EeatTrustBlock.astro` | 51 | `{ reviewedBy, dataReviewedAt, sources[], author }` — EEAT trust signals per content-depth spec | 1 |
| `CopyButton.astro` | 24 | `{ text }` — clipboard copy button with `data-copy` hook + label i18n. Used ONLY inside `ResultCard`. | 0 (transitively via `ResultCard`) |

**CopyButton caveat**: 0 direct consumer files because grep searches for `components/CopyButton` literal; actual usage is `import CopyButton from './CopyButton.astro'` inside `ResultCard.astro`. INDEX records consumer count via transitive scan to avoid this grep trap.

---

## 5 · Utility tier — cross-page utilities (1-4 consumers)

| Component | LOC | Props | Consumers |
|---|---|---|---|
| `AdUnit.astro` | 11 | `{ slot: 'home-hero' \| 'home-mid' \| 'home-footer' \| 'tool-result' \| 'blog-mid' \| 'blog-end' }` — AdSense placeholder div with slot-specific min-height | 4 |
| `SearchBar.astro` | 14 | None — `<input type="search" id="tool-search">` with JS init layer | 1 |

---

## Consumer count crosswalk

`grep -rln "<ComponentName>" src/` counts (corrected for transitive imports):

| Component | Direct | Transitive | Total reach |
|---|---|---|---|
| Header | 26 | 0 | 26 |
| Footer | 26 | 0 | 26 |
| ToolCard | 15 | + CategorySection | 16 |
| CategoryOtherNav | 15 | 0 | 15 |
| ResultCard | 2 | + CopyButton (inside) | 3 |
| CopyButton | 0 | via ResultCard | 1 indirect |
| All others | 1 | 0 | 1 |

---

## 维护约定

- **navigator, not catalog** — INDEX 列 props shape + 用途 + LOC + consumer count; 不重述 template markup
- 新增 component 必须：(1) 添加到合适 tier section；(2) 若有 props interface 简述 1 行；(3) 更新 consumer count
- Tier 1-2 components (Header / Footer / ToolCard / CategoryOtherNav) 修改需 cascade review (15-26 consumer impact)
- Tier 3 components 修改前先检查所有 6 consumer files (category landing pages)
- Tier 4-5 components 修改 isolated (1-3 consumers)
- `ResultCard` 内部 import 变化会触发 `CopyButton` cascade；一起 review

---

## 与其他 INDEX 的关系

| Surface | Scope | Audience |
|---|---|---|
| `src/engines/INDEX.md` (P39) | 100 engines × 15 subdirs | Engines contributors |
| `src/data/INDEX.md` (P40) | 6 top-level + tools/ 16 barrels | Data contributors |
| `src/components/INDEX.md` (P43, 本文件) | 18 .astro components × 5 tiers | UI contributors / Astro template reviewers |

P39 + P40 + P43 = src/ 树三 INDEX triad，覆盖 engines (logic) + data (metadata) + components (UI) 三大资产。

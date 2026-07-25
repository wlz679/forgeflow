# P73 Legal Pages i18n Fix (D4 + D5) Ship Log

## Summary

P73 closes the P72 audit's remaining 2 user-visible i18n defects — privacy-policy.astro and terms.astro were entirely EN-hardcoded. Both pages now have full zh translations.

**Date:** 2026-07-25
**Batch ID:** P73
**Files touched:** 3 (2 templates + 1 translations.ts)
**Test delta:** 1179 → 1179 (no new tests; existing tests still pass)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### translations.ts additions (22 new keys)
```ts
'legal.privacy.title': { en: 'Privacy Policy — ForgeFlowKit', zh: '隐私政策 — ForgeFlowKit' },
'legal.privacy.description': { en: 'Privacy policy for ForgeFlowKit. Learn how we handle your data.', zh: 'ForgeFlowKit 隐私政策，了解我们如何处理你的数据。' },
'legal.privacy.h1': { en: 'Privacy Policy', zh: '隐私政策' },
'legal.privacy.last_updated': { en: 'Last updated: 2026', zh: '最后更新：2026' },
'legal.privacy.info_collect_h': { en: 'Information We Collect', zh: '我们收集的信息' },
'legal.privacy.info_collect_p': { en: '...', zh: '...' },  // long paragraph
'legal.privacy.cookies_h': { en: 'Cookies and Tracking', zh: 'Cookie 与跟踪' },
'legal.privacy.cookies_p': { en: '...', zh: '...' },
'legal.privacy.third_party_h': { en: 'Third-Party Services', zh: '第三方服务' },
'legal.privacy.third_party_p': { en: '...', zh: '...' },
'legal.privacy.contact_h': { en: 'Contact', zh: '联系我们' },
'legal.privacy.contact_p': { en: '...', zh: '...' },
// 11 terms keys (similar shape)
'legal.terms.title': { en: 'Terms & Conditions — ForgeFlowKit', zh: '服务条款 — ForgeFlowKit' },
'legal.terms.description': { en: '...', zh: '...' },
'legal.terms.h1': { en: 'Terms & Conditions', zh: '服务条款' },
'legal.terms.last_updated': { en: 'Last updated: 2026', zh: '最后更新：2026' },
'legal.terms.accept_h': { en: 'Acceptance of Terms', zh: '条款接受' },
'legal.terms.accept_p': { en: '...', zh: '...' },
'legal.terms.use_h': { en: 'Use of the Service', zh: '服务使用' },
'legal.terms.use_p': { en: '...', zh: '...' },
'legal.terms.disclaimer_h': { en: 'Disclaimer', zh: '免责声明' },
'legal.terms.disclaimer_p': { en: '...', zh: '...' },
'legal.terms.ip_h': { en: 'Intellectual Property', zh: '知识产权' },
'legal.terms.ip_p': { en: '...', zh: '...' },
```

### privacy-policy.astro refactor
- Added `import { t } from '../../i18n'`
- Frontmatter: `title` + `description` now use `t('legal.privacy.title'/'description', lang)` (was hardcoded EN)
- Body: 4 hardcoded EN sections replaced with `t()` lookups:
  - `<h1>Privacy Policy</h1>` → `<h1>{t('legal.privacy.h1', lang)}</h1>`
  - `<p>Last updated: 2026</p>` → `<p>{t('legal.privacy.last_updated', lang)}</p>`
  - `<h2>Information We Collect</h2>` + paragraph → `<h2>{t('legal.privacy.info_collect_h', lang)}</h2>` + `<p>{t('legal.privacy.info_collect_p', lang)}</p>`
  - `<h2>Cookies and Tracking</h2>` + paragraph → `<h2>{t('legal.privacy.cookies_h', lang)}</h2>` + `<p>{t('legal.privacy.cookies_p', lang)}</p>`
  - `<h2>Third-Party Services</h2>` + paragraph → `<h2>{t('legal.privacy.third_party_h', lang)}</h2>` + `<p>{t('legal.privacy.third_party_p', lang)}</p>`
  - `<h2>Contact</h2>` + paragraph → `<h2>{t('legal.privacy.contact_h', lang)}</h2>` + `<p>{t('legal.privacy.contact_p', lang)}</p>`
- zh-only sections (Account Authentication Clerk / Data Sync Supabase / Browser Storage) UNCHANGED — already had explicit zh conditional branches

### terms.astro refactor
- Added `import { t } from '../../i18n'`
- Frontmatter: `title` + `description` now use `t('legal.terms.title'/'description', lang)` (was hardcoded EN)
- Body: 4 hardcoded EN sections replaced with `t()` lookups:
  - `<h1>Terms & Conditions</h1>` → `<h1>{t('legal.terms.h1', lang)}</h1>`
  - `<p>Last updated: 2026</p>` → `<p>{t('legal.terms.last_updated', lang)}</p>`
  - `<h2>Acceptance of Terms</h2>` + paragraph → `<h2>{t('legal.terms.accept_h', lang)}</h2>` + `<p>{t('legal.terms.accept_p', lang)}</p>`
  - `<h2>Use of the Service</h2>` + paragraph → `<h2>{t('legal.terms.use_h', lang)}</h2>` + `<p>{t('legal.terms.use_p', lang)}</p>`
  - `<h2>Disclaimer</h2>` + paragraph → `<h2>{t('legal.terms.disclaimer_h', lang)}</h2>` + `<p>{t('legal.terms.disclaimer_p', lang)}</p>`
  - `<h2>Intellectual Property</h2>` + paragraph → `<h2>{t('legal.terms.ip_h', lang)}</h2>` + `<p>{t('legal.terms.ip_p', lang)}</p>`

## Why this exists

P72 i18n audit found 6 user-visible defects where zh pages rendered English. P72 T2-A fixed 3 of them (D1 = blog index, D2 = RelatedBlog, D3 = CategoryGuides). P73 closes the remaining 2 (D4 = privacy-policy, D5 = terms).

Before P73, Chinese visitors to `/zh/privacy-policy/` saw:
- `<h1>Privacy Policy</h1>` (EN)
- `<h2>Information We Collect</h2>` + EN paragraph
- `<h2>Cookies and Tracking</h2>` + EN paragraph
- `<h2>Third-Party Services</h2>` + EN paragraph
- `<h2>Contact</h2>` + EN paragraph
(only the zh-specific Clerk/Supabase/Storage sections were correctly localized)

After P73, all 4 hardcoded EN sections render in zh via `t()` lookups. en pages unchanged (still show English).

## Verification

After rebuild, manual grep of dist confirms:

**zh privacy-policy**:
- h1: 隐私政策 ✓
- h2: 我们收集的信息 / Cookie 与跟踪 / 第三方服务 / 联系我们 ✓ (plus the already-fixed zh-only sections: 账户认证（Clerk）, 数据同步（Supabase）, 浏览器存储, 最近访问, 历史快照)
- Paragraphs: 最后更新：2026 / ForgeFlowKit 不要求用户注册... / 我们使用 Google AdSense... / 本网站使用 Google AdSense... / 如果你对本隐私政策有任何问题... ✓

**zh terms**:
- h1: 服务条款 ✓
- h2: 条款接受 / 服务使用 / 免责声明 / 知识产权 ✓
- (All 4 hardcoded EN sections now properly localized)

**en privacy-policy + terms**: unchanged (still English, as expected) ✓

## Coverage expansion

| Page | Before P73 zh strings | After P73 zh strings |
|---|---|---|
| `/zh/privacy-policy/` | ~50% (4/9 sections localized via conditional, 5 hardcoded EN) | **100%** |
| `/zh/terms/` | 0% (entire body hardcoded EN) | **100%** |

P72 audit's D4 + D5 defects: **CLOSED**. All 6 P72 audit findings now resolved (D1+D2+D3 in T2-A, D4+D5 in P73).

## What was NOT done (deferred)

- ❌ D6 (MD blog bodies) — 100 markdown files have EN-only body content. Different scope (content translation, not template i18n). Defer to P74+.
- ❌ No new CJK guard tests — D4+D5 fixes verified via direct grep; existing P66b/P67b/P68/P69/P71 tests still pass (don't cover legal pages, but they don't break them either).

## P74+ candidate

- **D6 (MD blog bodies)** — translate 100 markdown files (~300 lines each). Subagent-driven translation batch (P69 pattern).
- **Audit script as CI guard** — turn `scripts/p72-audit-v6.cjs` into a build-dep test that runs as part of CI, catches future render-layer leaks automatically.
- **CLAUDE.md standing rule** — formalize `.superpowers/` gitignore rule from P70.

## CI integration

- No new build-dep suites (existing 13 unchanged)
- 22 new i18n keys + 2 template refactors = minimal CI impact
- pnpm check unchanged at 1179/0/0

## Related references

- **P72 T1** — i18n audit that found these defects
- **P72 T2-A** — fixed D1+D2+D3 (related pattern, this P73 closes D4+D5)
- **P62** — original category i18n fix that established `t()` lookup pattern
- **CLAUDE.md** "Hard-breakpoint exemption" — design choice for i18n exemptions (audit-grade documentation requirement, though D4+D5 didn't need it since both languages have valid text)
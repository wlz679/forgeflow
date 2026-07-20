# ForgeFlowKit

> **Free business calculators and tools for smarter decisions.**
> Live at **[forgeflowkit.com](https://forgeflowkit.com)** · 100 calculators · 15 categories · 2 languages (English / 中文)

---

## What is ForgeFlowKit?

ForgeFlowKit is a static single-page application (SPA) providing **100 free business calculators** for solopreneurs, SaaS founders, and small business operators. Every calculator is rendered as its own page with bilingual support (English + Chinese), v3 industry-leading UI standards, and zero server-side computation at runtime.

**Tech stack:** Astro 4.16.19 (static site generation) · TypeScript 5.6 strict · Tailwind CSS 4

---

## Quick Start

```bash
# Requires pnpm (enforced via preinstall). Node ^20.19.0 || >=22.13.0
pnpm install      # Install dependencies
pnpm dev          # Dev server (Astro, port 4321 default)
pnpm build        # Production build → dist/ (~313 static pages: 100 calcs × 2 langs + 15 category listings × 2 langs + 2 landing pages × 2 langs)
pnpm preview      # Preview built app
```

**Optional:**
- `pnpm sync` — Fetch latest AI pricing (LiteLLM upstream) + regenerate engine data tables
- `pnpm test:unit` / `pnpm test:build` — Run test suite (default skips build-dependent; `RUN_BUILD_TESTS=1` to opt in)
- `pnpm translate` — Regenerate engine word pools

See [`CLAUDE.md`](./CLAUDE.md) for the project's source-of-truth (architecture, commands, file conventions).

---

## Calculator Categories

100 calculators organized into **15 categories** (A/B/C/D/E/F/H/K/L/M/O/P/R/S/T; B = AI Cost Tools, no separate 16th category). Engine count is locked at `EXPECTED_ENGINE_COUNT = 100` in `tests/lib/engine-count.ts`.

| Letter | Category | Calculators |
|---|---|---|
| **B** | Business (financial / valuation) | LTV, CAC, MRR, ARR Multiple, Burn Multiple, Rule of 40, SAFE / Convertible Note, Break-even, Equity dilution |
| **C** | Pricing | Hourly vs Fixed, Freelance Rate, Sponsorship Rate, Course Pricing, SaaS Pricing |
| **D** | HR / Cost | Employee Cost (Fully-loaded), Ramp Time, Productivity Ramp, Attrition Cost |
| **E** | Personal | Freelance Tax, Productivity Score |
| **F** | Freelance | Hourly rate variants, proposal pricing, contract scoping |
| **H** | Hiring / Team | Comp banding, equity refresh, team ramp curves |
| **I** | Investment | Compound Interest, Mortgage, DSCR, Cap Rate |
| **K** | Knowledge / Documentation | KB Coverage, Article Freshness, Search Effectiveness, Deflection Quality, Documentation ROI, Helpfulness Score |
| **L** | Legal & Compliance | GDPR Fine, DSAR Cost, Consent Revenue, DPA Negotiation, Breach Notification, CMP ROI |
| **M** | Marketing | ROAS, Funnel Step, Power User Curve, Cohort, Attribution, Cart Abandonment, Coupon Attribution |
| **O** | Operations | Inventory Turnover, Supplier Scorecard, Capacity Planning |
| **P** | Product Analytics | Funnel step-through, retention curves, NPS |
| **R** | Retention | NRR, GRR, Renewal Rate, Cohort Retention |
| **S** | Sales | Pipeline Value, Sales Velocity, ACV, Win Rate by Stage, Quota Attainment, Pipeline Coverage |
| **T** | Customer Support | Cost Per Ticket, CSAT, Deflection Rate, FRT / SLA, Resolution Time |
| **V** | Valuation | ARR Multiple, Rule of 40, SAFE conversion |
| **AI** | AI Cost | OpenAI / Anthropic Claude / Google Gemini / DeepSeek token pricing, AI image gen cost, GPU cloud cost, AI training cost |

Browse the live site at [forgeflowkit.com](https://forgeflowkit.com).

---

## Internationalization (i18n)

English (`en`) and Chinese (`zh`) supported throughout. All 100 calculators, 15 category listings, and 2 landing pages have full translations. Cross-references in `src/i18n/translations.ts`; ZH terminology anchored to `docs/i18n/zh-terminology.md` (single source of truth).

---

## Architecture

### Engines (`src/engines/`)

Each calculator is a single self-contained `.ts` file. The registry pattern (`src/core/engines/registry.ts`) is called via `registerEngine(engine)` at module import:

- `calculate(inputs)` — server-side, called by Astro pages to render static examples
- `customFn` — minified JS string that runs in the browser for live interactions
- `staticExamples` — pre-baked output strings, used as the initial page render
- `dataLastUpdated` (optional) — shown as a `📅 Data updated: YYYY-MM-DD` badge

### Data-Driven Engines (8 of 100)

8 engines read from `src/data/ai-pricing.json` (single source of truth for OpenAI / Claude / Gemini / DeepSeek token pricing, 7 image gen providers, 6 GPU cloud providers). Updated weekly via `pnpm sync`.

### Pages (`src/pages/[lang]/`)

- `[lang]/[slug].astro` — main calculator page
- `[lang]/index.astro` — landing page
- `[lang]/blog/` — blog posts
- `[lang]/about.astro`, `contact.astro`, `privacy-policy.astro`, `terms.astro` — static content

### Automation Scripts (`scripts/`)

- `sync-pricing.mjs` — Fetch AI pricing from LiteLLM upstream
- `codegen-customfn.mjs` — Regenerate engine data tables from PRICING.json
- `codegen-examples.mjs` — Regenerate `staticExamples[0]` from `calculate()`

---

## Testing

```bash
pnpm check                 # Quality gate: typecheck + i18n + customFn parse + tests (one command)
pnpm test:unit             # Unit tests (skips 5 build-dependent by default)
pnpm test:build            # Opt-in: RUN_BUILD_TESTS=1 wrapper for build-dependent tests
RUN_BUILD_TESTS=1 pnpm test:unit  # Same as pnpm test:build
```

Test infrastructure includes ~1096+ passing assertions across:
- Math correctness (per-calculator equation tests)
- Schema coverage (JSON-LD, OpenGraph, AB split distribution)
- Internal links (multi-dimensional recommendation)
- i18n completeness (no raw keys leak)
- CustomFn parse safety (4-style declaration parser)
- HTML5 numeric input audit (red-ring + programmatic clamp + defensive test per engine)

---

## Repository Layout

```
.
├── CLAUDE.md                 # AI session source of truth (architecture, conventions)
├── AGENTS.md                 # gstack skills catalog (managed)
├── README.md                 # This file (human-facing entry point)
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── src/
│   ├── engines/              # 100 calculators, organized by 15 categories
│   ├── pages/[lang]/         # Astro pages (en + zh)
│   ├── core/engines/         # Engine framework: types, registry, helpers
│   ├── components/           # Shared Astro components
│   ├── data/                 # Static data (PRICING.json, og-samples.json, tools/)
│   ├── i18n/                 # Translation strings
│   └── scripts/              # Legacy utility scripts
├── scripts/                  # Build-time automation (sync, codegen)
├── tests/                    # Test suite (1096+ assertions)
├── docs/                     # Documentation (INDEX.md + superpowers/{specs,plans}/)
│   ├── INDEX.md              # Top-level docs navigator
│   ├── deploy/               # Production deployment runbooks
│   ├── i18n/                 # ZH terminology glossary
│   ├── superpowers/specs/    # Design specs (44 files, INDEX.md)
│   └── superpowers/plans/    # Implementation plans (51 files, INDEX.md)
└── memory/                   # Project-level ship logs (41 files, INDEX.md)
```

---

## Contributing

This repository is owned and maintained by ForgeFlowKit. For bugs, suggestions, or partnership inquiries, see the [Contact](https://forgeflowkit.com/contact) page.

If you're an AI session landing in this repo, **read `CLAUDE.md` first** — it documents the engine pattern, customFn parse-safety invariant, cascade audit pattern, and contributor workflow expectations.

---

## License

ISC — see [LICENSE](./LICENSE) for full text.

---

## Acknowledgments

AI token pricing data is sourced from the [LiteLLM](https://github.com/BerriAI/litellm) project (`model_prices_and_context_window.json`), updated weekly via `pnpm sync`.

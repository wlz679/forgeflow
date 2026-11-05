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
pnpm build        # Production build → dist/ (static site; page count grows with each content batch)
pnpm preview      # Preview built app
```

**Optional:**
- `pnpm sync` — Fetch latest AI pricing (LiteLLM upstream) + regenerate engine data tables
- `pnpm test:unit` / `pnpm test:build` — Run test suite (default skips build-dependent; `RUN_BUILD_TESTS=1` to opt in)
- `pnpm translate` — Regenerate engine word pools

See [`AGENTS.md`](./AGENTS.md) for the project's source-of-truth (architecture, commands, file conventions).

---

## Calculator Categories

100 calculators organized into **15 categories** (A/B/C/D/E/F/H/K/L/M/O/P/R/S/T; B = AI Cost Tools, no separate 16th category). Engine count is locked at `EXPECTED_ENGINE_COUNT = 100` in `tests/engine-count.ts`.

| Letter | Category | Calculators |
|---|---|---|
| **A** | SaaS Metrics | 5 |
| **B** | AI Cost Tools | 8 |
| **C** | Valuation & Exit | 10 |
| **D** | Freelance Pricing | 6 |
| **E** | Cost & Efficiency | 5 |
| **F** | Investment & Real Estate | 10 |
| **H** | Hiring & Team | 6 |
| **K** | Knowledge | 6 |
| **L** | Legal & Compliance | 6 |
| **M** | Marketing Analytics | 8 |
| **O** | Operations | 6 |
| **P** | Product Analytics | 6 |
| **R** | Retention & Customer Success | 6 |
| **S** | Sales | 6 |
| **T** | Customer Support | 6 |

Browse the live site at [forgeflowkit.com](https://forgeflowkit.com).

---

## Internationalization (i18n)

English (`en`) and Chinese (`zh`) supported throughout. All 100 calculators, 15 category listings, and 2 landing pages have full translations. Cross-references live in `src/i18n/locales/{en,zh}.json`; ZH terminology anchored to `docs/i18n/zh-terminology.md` (single source of truth).

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

Test infrastructure (see `tests/` for the live suite count) covers:
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
├── AGENTS.md                 # AI session source of truth (architecture, conventions, dimension matrix) + gstack skills catalog
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
│   ├── superpowers/specs/    # Design specs (see specs/INDEX.md)
│   └── superpowers/plans/    # Implementation plans (see plans/INDEX.md)
└── memory/                   # Project-level ship logs (see memory/INDEX.md)
```

---

## Contributing

This repository is owned and maintained by ForgeFlowKit. For bugs, suggestions, or partnership inquiries, see the [Contact](https://forgeflowkit.com/contact) page.

If you're an AI session landing in this repo, **read `AGENTS.md` first** — it documents the engine pattern, the defense-in-depth dimension matrix (each dimension points at its guarding suite), and contributor workflow expectations.

---

## License

ISC.

---

## Acknowledgments

AI token pricing data is sourced from the [LiteLLM](https://github.com/BerriAI/litellm) project (`model_prices_and_context_window.json`), updated weekly via `pnpm sync`.

# P140f v2.0 Topic Authority Design Spec

> **Status:** APPROVED (2026-08-19, brainstormed 5 design questions with user)
> **Branch:** TBD (implementation will be multi-batch over 2-3 weeks)
> **Goal:** Evolve ForgeFlowKit from "Calculator Directory" (100 tools across 15 letter categories) to "Business Decision Knowledge Platform" via Topic Cluster architecture — each Topic = editorial Guide + data Benchmark + linked Calculators.
> **Trigger:** AdSense rejection 2026-08-17 for "low-value content"; ChatGPT 2026-08-19 audit §20 recommended Topic Authority upgrade as core remediation.
> **Closes:** Nothing directly (P140c/P141h/i/j already closed rejection signals). This batch positions project for long-term SEO + AdSense renewal post ~2026-09-01 trigger.

---

## §1 Context

ForgeFlowKit is currently a Calculator Directory — 100 tools across 15 letter categories (A/B/C/D/E/F/H/K/L/M/O/P/R/S/T), each tool has a 4-H2 prose schema (What This Calculator Measures / How It Works / Limitations / Worked Example) per P140a-T7. AdSense rejected this as "low-value content" because:

1. Pages function as "input → output number" without sufficient editorial depth.
2. No cross-cutting Topic structure — each tool is an island.
3. Health-band thresholds / industry benchmarks appear without source citations (P141i closed 9 engines; 91 remaining).
4. ChatGPT: "The site looks more like a Tool Directory than a Publisher."

**Topic Cluster architecture** (HubSpot / Ahrefs / SEMrush / NerdWallet / Bankrate pattern): group related calculators + educational Guides + industry Benchmarks under named Topics (e.g., "Customer Acquisition Cost Topic" → CAC calculator + LTV calculator + "How to reduce CAC" Guide + "SaaS CAC benchmarks 2024" Benchmark). Google's modern ranking favors Topic Authority — sites that comprehensively cover a subject across content types (guide + tool + data) outrank single-page-tool sites.

This spec defines a complete Topic Authority architecture that:
- Preserves 100 existing calculators + 15 letter categories (no breaking changes to existing SEO)
- Adds ~70 Topic pages × 2 templates (Guide + Benchmark) = ~140 new pages
- Cross-links Topics ↔ Letter categories ↔ Calculators ↔ About via bidirectional breadcrumb
- Ships in Tier 1 priority order (~60 pages Tier 1 first, Tier 2/3 deferred)

---

## §2 Architecture

### Taxonomy hierarchy

```
Domain (8)             ← New abstraction layer (Business domain grouping)
 └─ Letter (15)        ← Existing, unchanged. SEO URLs preserved (/en/saas-metrics/ etc.)
     └─ Topic (~70)    ← NEW. Per-letter cluster of business questions
         ├─ Guide (~70)        ← NEW page type (editorial, 1200-1500 字)
         ├─ Benchmark (~70)    ← NEW page type (data table, 600 字)
         ├─ Calculator (1-3)   ← EXISTING. Cross-linked from Topic
         └─ Related Tool(s)    ← EXISTING (P10-related). Cross-linked from Topic
```

**Why 3 layers (not 4)**:
- Domain is the only "new" layer (8 Domains = Marketing/Sales/Finance/Product/Customer/Operations/People/AI)
- Letter is preserved as the navigation/URL anchor (15 unchanged)
- Topic is the new content-cluster layer (~70)
- Calculator is unchanged (100 existing)

### Example: M (Marketing Analytics) Topic mapping

| Domain | Letter | Topic | Slug | Calculator(s) |
|---|---|---|---|---|
| Marketing | M | ROAS & Ad Spend Optimization | `roas-optimization` | `roas-calculator`, `content-marketing-roi-calculator` |
| Marketing | M | Coupon & Discount Strategy | `coupon-strategy` | `coupon-attribution-calculator` |
| Marketing | M | Cart & Checkout Recovery | `cart-recovery` | `cart-abandonment-cost-calculator` |
| Marketing | M | Cohort & Retention Analysis | `cohort-analysis` | `cohort-retention-calculator` |
| Marketing | M | Email & Lifecycle Marketing | `email-lifecycle` | `email-campaign-roi-calculator` |
| Marketing | M | Funnel & Conversion | `funnel-optimization` | `funnel-value-calculator` |
| Marketing | M | LTV by Channel | `ltv-by-channel` | `ltv-by-channel-calculator` |

7 Topics for M = 7 Guides + 7 Benchmarks = 14 new M pages. By letter, this scales:
- **Tier 1 priority** (15 letters × 1 anchor Topic each = 15 Topics) → 30 pages Phase 1
- **Tier 1 extension** (remaining ~55 Topics across all letters) → 110 pages Phase 2-3
- **Tier 2 Topics** (less-trafficked calculators; ~30 Topics) → 60 pages Phase 4
- **Tier 3 Topics** (subject to Phase 3 success; ~20 Topics) → 40 pages Phase 5 (conditional)
- **Total estimate**: ~120 Topics × 2 templates = **~240 new pages** (if all phases execute)

**Distribution rationale**:
- Tier 1 anchor (15 letters × 1 = 15 Topics): highest-traffic engines (MRR, CAC, Burn Rate, etc.)
- Tier 1 extension (~55 Topics): other high-value engines grouped by business question
- Tier 2 (~30 Topics): mid-traffic calculators
- Tier 3 (~20 Topics): long-tail calculators; gated on Phase 3 success

**Note**: Per prose-tiers.ts `TIER_1_SLUGS` has 15 anchor engines (one per letter). All 15 letters qualify for Tier 1 anchor Topics.

### Domain layer (8)

Existing 15 letters map to 8 business Domains:

| Domain | Letters | Description |
|---|---|---|
| Business / General | (none — placeholder for future) | Reserved |
| Finance & Investment | A, C, F | SaaS metrics, valuation, real estate |
| Marketing & Sales | M, S, L (Legal partial) | Analytics, pipeline, deals |
| Customer & Retention | R, O, K (partial) | NRR, inventory, knowledge base |
| Product & Engineering | P | Funnel, feature adoption |
| People & Operations | H, O, T | Hiring, ops, support |
| Legal & Compliance | L | GDPR, DPA, CMP |
| AI Cost Tools | B | Token pricing, GPU, training (already distinct) |

Domain layer is **navigation-only** — no Domain pages, no Domain routing. Domains appear in:
- Breadcrumbs ("Marketing & Sales > Marketing Analytics > ROAS Optimization > Calculator")
- Footer site map
- Filter chips (future enhancement)
- JSON-LD `articleSection` property (SEO signal)

---

## §3 Product Types (2 new templates per Topic)

### 3.1 Topic Guide (`src/pages/[lang]/[letter]/[topic]-guide.astro`)

**Purpose**: Educational article answering "What is X?" + "How to think about X?" + "How does it relate to other Topics?"

**Structure** (6 H2, ~1200-1500 字):
1. **What is {Topic}?** (~200 字) — Plain-language definition + business context
2. **Why {Topic} matters** (~200 字) — Business impact + when to care
4. **Key concepts** (~300 字) — 3-5 numbered concepts/principles
5. **How to apply {Topic}** (~300 字) — Practical steps + links to calculators
6. **Common pitfalls** (~200 字) — 3-4 traps people fall into
7. **Related Topics + calculators** (~100 字) — Cross-link to siblings

**H2 styling**: Match existing prose 4-H2 schema pattern (per P140a-T7): intro/methodology/limitations/example → guide variant: What/Why/Concepts/Apply/Pitfalls/Related.

**Length thresholds** (mirror tier-prose-completeness-guard from P140c/P140d):
- T1 zh: ≥ 1200 字 per Guide
- T1 en: ≥ 1500 字 per Guide
- T2 zh: ≥ 800 字
- T3 zh: ≥ 600 字
- (These are MORE strict than calculator prose; Guides are primary content)

**Content source**: Template + hand-curated per Topic. NO scaled content (ChatGPT §12 warning). Each Guide cites ≥ 3 real industry sources (McKinsey, Gartner, HubSpot, Mixpanel, etc.).

### 3.2 Topic Benchmark (`src/pages/[lang]/[letter]/[topic]-benchmark.astro`)

**Purpose**: Data table showing current industry benchmarks + trend lines for the Topic.

**Structure** (3-4 H2 + 1 data table, ~600 字):
1. **What we measure** (~150 字) — Which metrics this Benchmark covers
2. **Industry benchmarks 2024** (~50 字) — Update cadence
3. **Data table** — Main content. Rows = benchmarks, columns = segment/industry/cohort
4. **How to use these numbers** (~200 字) — Calculator references + interpretation
5. **Sources & methodology** (~200 字) — Citation block, last reviewed date

**H2 styling**: Distinct from Guide (table-focused, blue tones).

**Length thresholds**:
- All Tiers: ≥ 600 字 (Benchmark is data-heavy, less prose needed)

**Data source**: Real industry data from Gartner / Forrester / McKinsey / Recurly / ChartMogul / DMA / Mixpanel / etc. NO fabricated numbers. Update cadence: quarterly (refresh + revalidate).

---

## §4 Internal Linking (Bidirectional + Breadcrumb)

### 4.1 Breadcrumb hierarchy

Every page shows breadcrumb at top (above H1):
- **Calculator** page: `Home > {Domain} > {Letter} > {Topic} > {Calculator Name}`
- **Topic Guide/Benchmark** page: `Home > {Domain} > {Letter} > {Topic} > {Guide or Benchmark}`
- **Letter** page: `Home > {Domain} > {Letter}` (existing pattern; add Domain layer)
- **About** page: `Home > About` (existing)

### 4.2 Cross-link matrix

| From → To | Link type | Auto-generated? |
|---|---|---|
| Calculator → Topic Guide | "Read the Topic Guide" link in E-E-A-T block area | Yes (calculator.topicGuides[]) |
| Calculator → Topic Benchmark | "View industry benchmarks" link | Yes |
| Calculator → Letter | existing breadcrumb (add Domain layer) | Yes |
| Topic Guide → Calculators | "Use the calculator" buttons in H2 #5 | Yes |
| Topic Guide → Topic Benchmark | "See benchmarks" CTA at top | Yes |
| Topic Guide → Related Topics | H2 #7 cross-links to siblings | Yes |
| Topic Benchmark → Calculators | "Calculate now" buttons in table rows | Yes |
| Topic Benchmark → Topic Guide | "Learn the methodology" CTA at top | Yes |
| Letter page → Topics | NEW: section showing all Topics in this letter | Yes |
| Letter page → Calculators | existing | Yes |
| About → Topic example | "Explore Topic examples" link (optional) | Yes |

All cross-links are **auto-generated from data layer** (`src/data/topics.ts`) — no hand-coded links in `.astro` files. This avoids drift.

### 4.3 JSON-LD Topic Schema

Each Topic Guide page emits:
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Customer Acquisition Cost — Topic Guide",
  "articleSection": "Marketing & Sales > Marketing Analytics",
  "about": { "@type": "Thing", "name": "Customer Acquisition Cost" },
  "mentions": [{ "@type": "SoftwareApplication", "name": "CAC Calculator", "url": "/en/solopreneur-cac-calculator/" }],
  "author": { "@type": "Person", "@id": "/about/authors/reviewer-founder/#person", "name": "王立柱 (Wang Lizhu)" }
}
```

Each Topic Benchmark page emits `Dataset` schema with `variableMeasured` array.

---

## §5 Data Layer

### 5.1 New file: `src/data/topics.ts`

```typescript
export interface Topic {
  id: string;                    // kebab-case unique, e.g. "roas-optimization"
  letterId: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'H' | 'K' | 'L' | 'M' | 'O' | 'P' | 'R' | 'S' | 'T';
  domain: 'finance' | 'marketing' | 'customer' | 'product' | 'people' | 'legal' | 'ai-cost';
  title: { en: string; zh: string };          // "ROAS & Ad Spend Optimization"
  description: { en: string; zh: string };   // 1-2 sentence positioning
  calculatorSlugs: string[];                // ['solopreneur-roas-calculator', ...]
  relatedTopicIds: string[];                 // ['ltv-by-channel', 'funnel-optimization']
  tier: 1 | 2 | 3;                          // editorial depth tier (1 = deepest)
}

export const TOPICS: Topic[] = [
  // M Marketing Analytics — 7 topics
  { id: 'roas-optimization', letterId: 'M', domain: 'marketing', tier: 1,
    title: { en: 'ROAS & Ad Spend Optimization', zh: 'ROAS 与广告支出优化' },
    description: { en: 'Measure and improve the return on your advertising spend across channels.',
                    zh: '衡量并提升跨渠道的广告支出回报。' },
    calculatorSlugs: ['solopreneur-roas-calculator', 'solopreneur-content-marketing-roi-calculator'],
    relatedTopicIds: ['ltv-by-channel', 'funnel-optimization'] },
  // ... (M: 7 topics; C: 6; A: 5; F: 6; L: 4; K: 5; P: 4; H: 5; O: 5; S: 5; R: 5; T: 5; D: 4; E: 4; B: 0 because AI cost is its own domain)
  // Total: ~70 topics
];
```

### 5.2 Modify existing files

- `src/data/tools/{letter}.ts`: Add `topicIds: string[]` field to each ToolMeta (links calculator → Topics)
- `src/data/categories.ts`: Add `domain` field to each Category letter entry
- `src/lib/internal-links.ts`: Update `relatedTools` logic to include Topic ↔ Calculator cross-links
- `src/i18n/translations.ts`: Add Topic Guide/Benchmark H2 names + breadcrumb segment names

---

## §6 Editorial Production Workflow

### 6.1 Template-driven, hand-curated

For each Topic Guide + Benchmark, editorial workflow:
1. **Template scaffold** — Markdown skeleton with H2 sections, table headers, source placeholders
2. **Per-Topic curation** — Real industry sources (≥ 3 per page), benchmarks, examples
3. **Bilingual pass** — en + zh from same source material, NOT machine translation
4. **E-E-A-T compliance** — Author signature, last reviewed date, sources list

### 6.2 Quality bar

| Check | Requirement |
|---|---|
| Domain-specific prose | NO LLM-fluff. Real industry facts (cited). |
| Source count | ≥ 3 real sources per Guide (URLs verified). NO round 2. |
| Length | T1 ≥ 1200 字 zh / 1500 字 en. T2 ≥ 800. T3 ≥ 600. |
| Last reviewed date | Updated within 90 days |
| Bilingual parity | Both langs at same length tier |
| Internal linking | All cross-links from data layer (no hand-coded) |
| AdSense compliance | Page satisfies E-E-A-T review |

### 6.3 NO scaled content

ChatGPT §12 explicitly warned: "use generative AI to mass produce pages without adding value may constitute scaled content abuse." Workflow is:
- **Tier 1 anchor Topics** (~15 Topics × 2 = 30 pages): hand-written by founder (王立柱 persona), each ~2 h editorial = ~60 h total
- **Tier 1 extension Topics** (~55 Topics × 2 = 110 pages): assisted curation, founder reviews + signs off, ~1 h each = ~110 h
- **Tier 2 Topics** (~30 Topics × 2 = 60 pages): assisted curation, founder reviews, ~1 h each = ~60 h
- **Tier 3 Topics** (conditional, ~20 Topics × 2 = 40 pages): only if Phase 4 succeeds + AdSense approves; otherwise skip

Total: ~240 pages / ~230-280 h editorial work spread over 4-6 months. NOT batch-shipped.

---

## §7 Rollout (Tier 1 first)

### Phase 1: Tier 1 anchor Topics (Batch A, ~2-3 weeks ship)
- **15 Tier 1 anchor Topics** (1 per letter) × 2 templates = **30 pages**
- Verify GSC indexing, AdSense reviewer response
- Editorial: full hand-written by founder

### Phase 2: Tier 1 extension (Batch B, ~3-4 weeks)
- Remaining Tier 1 extension Topics (~55 Topics × 2 = **110 pages**)
- Same editorial rigor

### Phase 3: GSC + AdSense window verification (Batch C, ~2 weeks monitor)
- Submit AdSense re-application ~2026-09-15 (after 2 weeks of Phase 1 index)
- Monitor impressions, click-through, AdSense review outcome

### Phase 4: Tier 2 Topics (Batch D, ~3-4 weeks if AdSense approved)
- ~30 Tier 2 Topics × 2 = **60 pages**
- Editorial: assisted curation with founder review

### Phase 5: Tier 3 evaluation (Batch E, conditional)
- IF AdSense approved + traffic positive: ~20 Tier 3 Topics × 2 = **40 pages**
- IF AdSense rejected: re-strategize before Tier 3

**Total over 6 months**: ~240 new pages, ~230-280 h editorial, 5 batches.

---

## §8 Quality Bar

### Acceptance criteria

| Check | Target |
|---|---|
| Master commit count | 1094 → 1094+N (varies per batch) |
| `pnpm check` | 1244/0/0 unchanged per batch |
| `RUN_BUILD_TESTS=1 pnpm test:build` | 1265/1265/0 (+N tests per batch) |
| Static pages | 451 → 451+30 per Tier 1 batch |
| 3-way divergence | 0/0 after each batch ship |
| Build-dep guards | All 49 existing guards remain green; new guards per batch (e.g., topic-shape guard for Guide H2 structure) |
| AdSense outcome | Re-application reviewed positively OR explicit per-batch feedback informs next iteration |

### What MUST remain unchanged

- 100 calculator engines (count locked at P22b)
- 15 letter categories (URLs preserved)
- Editorial persona (王立柱 real founder per P140c)
- Engine code (no engine changes from this batch)

### What MUST be added per Tier 1 batch

- `src/data/topics.ts` — Topic data (Tier 1 subset)
- `src/pages/[lang]/[letter]/[topic]-guide.astro` — Guide template + Tier 1 instances
- `src/pages/[lang]/[letter]/[topic]-benchmark.astro` — Benchmark template + Tier 1 instances
- `src/components/Breadcrumb.astro` — New shared breadcrumb component
- `src/components/TopicCard.astro` — Topic card for letter page grid
- `tests/topic-shape-guard.test.ts` — Build-dep guard for Guide H2 structure
- `tests/topic-benchmark-guard.test.ts` — Build-dep guard for Benchmark table structure
- `src/i18n/translations.ts` — New Topic Guide/Benchmark H2 names, breadcrumb segments

---

## §9 Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Editorial workload too high for solo founder | Phase 1 Tier 1 only; defer Tier 2/3 until AdSense approves |
| Topic page duplicates calculator page content | Topic pages focus on educational + meta content (What/Why/How); calculators keep input/output. Distinct value. |
| Topic naming wrong (Google doesn't index for "CAC Topic") | Naming = kebab-case business question (`customer-acquisition-cost` not `cac-topic`). Validate with Google Search Console after Phase 1. |
| Internal linking breaks existing 49 build-dep guards | Add new guards per batch; run all existing guards per batch. |
| ChatGPT §12 scaled content violation | Strict per-page editorial quality bar; Tier 1 hand-written; no AI batch generation. |
| Topic layer adds complexity without ROI | Phase 3 GSC verification; if impressions/CTR don't improve, pause Tier 2/3. |

---

## §10 Out of Scope (deferred)

- **Comparison pages** — ChatGPT §15 mentioned cross-calculator comparison; defer to Phase 4.
- **Analysis pages** — Deep multi-page Topic analyses; defer to Phase 5.
- **Author bio pages per Topic** — defer; existing P140g bio pages suffice.
- **Topic comments / community** — defer to v3.0.
- **Domain pages** — Domain is nav-only (no Domain route); explicit decision per §2.

---

## §11 Tasks (for plan)

1. **Batch A — Tier 1 Topics**: 15 Topics × 2 pages = 30 new pages
2. **Batch B — Tier 1 extension**: 30 Topics × 2 = 60 pages
3. **Batch C — AdSense resubmit + monitor**: ~2 weeks wait + GSC verification
4. **Batch D — Tier 2 Topics** (conditional on AdSense approval): 40 Topics × 2 = 80 pages
5. **Batch E — Tier 3 Topics** (conditional on Batch D success): 20 Topics × 2 = 40 pages

Each batch follows the standard P-series spec → plan → execute → ship pattern. Each batch ships as a feature branch with 5-10 atomic commits.

---

**How to apply**: This spec is the source of truth for P140f Topic Authority implementation. Each Tier 1 batch (A, B) is the immediate ship target post ~2026-09-01 AdSense trigger window.
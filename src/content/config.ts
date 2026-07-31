import { defineCollection, z } from 'astro:content';

// Blog posts migrated from src/data/blog-posts.ts in P1-2.
// See: docs/superpowers/specs/2026-06-29-p1-blog-markdown-design.md
// Body is raw markdown but currently rendered as paragraphs via split('\n').
// Frontmatter is MINIMAL: slug/toolName are derived from filename + tools[] in adapter.
const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    ogImage: z.string(),
    toolSlug: z.string(),
    // P75: zh translation of body content. Optional — falls back to
    // `content` (en body) when missing. Set by P75 T1 subagent on each
    // markdown frontmatter as a YAML `|` block scalar (preserves newlines).
    bodyZh: z.string().optional(),
  }),
});

// P140a-T3: Astro Content Collections schema for tool prose pages.
// Each calculator's editorial content (intro / methodology / limitations / worked example)
// lives at src/content/tools/<slug>.md (en) and <slug>.zh.md (zh).
//
// The 4-H2 markdown body is rendered by src/components/CalculatorProse.astro
// (P140a-T5) into [lang]/[slug].astro (P140b-T4).
//
// zod frontmatter invariants:
//   - slug                : must match src/data/tools.ts:engine.slug pattern
//   - engine_ref          : mirrors slug (kept as separate field for future divergence)
//   - category_id         : one of A/B/C/D/E/F/H/K/L/M/O/P/R/S/T (15 categories, CLAUDE.md)
//   - reviewed_by         : array of reviewer ids → src/data/reviewers.ts (P140c-T1)
//   - author              : single reviewer id (defaults to 'wlz')
//   - data_reviewed_at    : YYYY-MM-DD; CI guard (P140a-T7) does not validate this —
//                           P140b T8 may add.
//   - sources             : ≥1 external reference with valid URL (AdSense E-E-A-T signal)
const CATEGORY_LETTERS = [
  'A', // SaaS Metrics
  'B', // AI Cost Tools
  'C', // Valuation & Exit
  'D', // Freelance Pricing
  'E', // Cost & Efficiency
  'F', // Investment & Real Estate
  'H', // Hiring & Team
  'K', // Knowledge
  'L', // Legal & Compliance
  'M', // Marketing Analytics
  'O', // Operations
  'P', // Product Analytics
  'R', // Retention & Customer Success
  'S', // Sales
  'T', // Customer Support
] as const;

const SLUG_PATTERN = /^solopreneur-[a-z0-9-]+$/;

const tools = defineCollection({
  type: 'content',
  schema: z.object({
    slug: z.string().regex(SLUG_PATTERN),
    engine_ref: z.string().regex(SLUG_PATTERN),
    category_id: z.enum(CATEGORY_LETTERS),
    reviewed_by: z.array(z.string()).default([]),
    author: z.string().default('wlz'),
    data_reviewed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD'),
    sources: z
      .array(
        z.object({
          name: z.string().min(1),
          url: z.string().url(),
        })
      )
      .min(1, 'sources must contain at least 1 reference (AdSense E-E-A-T signal)'),
  }),
});

export const collections = { blog, tools };

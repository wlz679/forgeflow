// P140a-T7 schema extraction: keep the zod schema independent of Astro's
// `astro:content` virtual module so that:
//   1. `src/content/config.ts` can wrap it with defineCollection() for runtime use
//   2. tests/content-prose-shape-guard.test.ts can import it directly via tsx
//      (which does NOT resolve the `astro:content` virtual module)
//
// The schema fields mirror what's documented in the comment block in
// src/content/config.ts. Single source of truth: any future field changes
// happen here, and both runtime + test pick them up.

import { z } from 'zod';

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

/**
 * The shared zod schema for tool-prose frontmatter.
 *
 * NB: `slug` is intentionally NOT a field here. Astro 4.x reserves `slug`
 * for entry-id generation (any `slug:` field in a defineCollection schema
 * crashes build with ContentSchemaContainsSlugError — discovered & fixed
 * in P140a-T4 commit e1465ff). Frontmatter `slug` text in md files is
 * decorative; entry-id is derived from filename.
 *
 * `engine_ref` enforces the slug pattern that `slug` would have enforced;
 * both can't coexist on Astro 4.
 */
export const toolsFrontmatterSchema = z.object({
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
});

export const SLUG_REGEX_SOURCE = SLUG_PATTERN;
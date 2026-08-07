// P140e — Blog frontmatter zod schema (independent of astro:content)
// See: src/content/config.ts for defineCollection() wrapper
//
// Mirrors P140a-T7 tools-schema.ts pattern: keep the zod schema independent
// of Astro's `astro:content` virtual module so that:
//   1. `src/content/config.ts` can wrap it with defineCollection() for runtime use
//   2. any future test suite can import it directly via tsx
//      (which does NOT resolve the `astro:content` virtual module)
//
// §13.2 AIO-aware EEAT/AIO-aware fields: 5 new optional fields below.
//
// Single source of truth: any future field changes happen here, and both
// runtime + tests pick them up automatically.

import { z } from 'zod';

const SLUG_PATTERN = /^solopreneur-[a-z0-9-]+$/;

/**
 * The shared zod schema for blog frontmatter.
 *
 * Backward-compat note: all 5 P140e fields are `.default(...)` or `.optional()`,
 * so the 100 existing blog files (shipped before T1) continue to parse without
 * any frontmatter edits. T2-T6 will populate these fields on selected blogs.
 *
 * Field groups:
 *   Core (already shipped):   title, excerpt, ogImage, toolSlug, bodyZh
 *   P140e EEAT (§13.2 #3):    author, reviewed_by, data_reviewed_at
 *   P140e Decision Support:   decision_query
 *   P140e AIO-aware (§13.2 #2): comparison_table
 *
 * NB: `slug` is intentionally NOT a field here. Astro 4.x reserves `slug` for
 * entry-id generation (any `slug:` field in a defineCollection schema crashes
 * build with ContentSchemaContainsSlugError — P140a-T4 closed this on tools;
 * same lesson applies here). Entry-id is derived from filename.
 */
export const blogFrontmatterSchema = z.object({
  title: z.string(),
  excerpt: z.string(),
  ogImage: z.string(),
  toolSlug: z.string().regex(SLUG_PATTERN),
  // P75: zh translation of body content. Optional — falls back to `content`
  // (en body) when missing. Set by P75 T1 subagent on each markdown frontmatter
  // as a YAML `|` block scalar (preserves newlines).
  bodyZh: z.string().optional(),
  // ---- P140e §13.2 AIO-aware EEAT 标注 (all optional, default-faithful to ship state) ----
  // EEAT author — defaults to site owner so existing blogs continue to advertise
  // a single human author in metadata without any frontmatter edits.
  author: z.string().default('wlz'),
  // EEAT reviewers — array of human names who reviewed this post for E-E-A-T signal.
  // Empty by default; T2-T6 will populate on reviewed posts only.
  reviewed_by: z.array(z.string()).default([]),
  // EEAT data freshness — when the underlying data was last reviewed. Optional
  // because not every blog cites live data (e.g. evergreen fundamentals posts).
  data_reviewed_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
    .optional(),
  // Decision Support user query — phrased as the question the reader is trying
  // to answer (e.g. "What's a fair commission split for affiliates under $5k/mo?").
  // Optional because not every blog is decision-targeted.
  decision_query: z.string().optional(),
  // AIO-aware §13.2 6 元素 #2 — whether this blog contains an actual comparison
  // table (per content-prose-shape rule). Default false; T6 will set true only
  // on posts that genuinely include a table.
  comparison_table: z.boolean().default(false),
});

export const SLUG_REGEX_SOURCE = SLUG_PATTERN;

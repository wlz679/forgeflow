import { defineCollection } from 'astro:content';
import { toolsFrontmatterSchema } from './tools-schema';
import { blogFrontmatterSchema } from './blog-schema';

// Blog posts migrated from src/data/blog-posts.ts in P1-2.
// See: docs/superpowers/specs/2026-06-29-p1-blog-markdown-design.md
// Body is raw markdown but currently rendered as paragraphs via split('\n').
// Frontmatter is MINIMAL: slug/toolName are derived from filename + tools[] in adapter.
//
// P140e-T1: zod frontmatter invariants are defined in src/content/blog-schema.ts
// and imported here. This keeps the schema independent of Astro's `astro:content`
// virtual module so tests can validate against the SAME schema source of truth
// (mirrors P140a-T7 tools-schema.ts pattern).
const blog = defineCollection({
  type: 'content',
  schema: blogFrontmatterSchema,
});

// P140a-T3: Astro Content Collections schema for tool prose pages.
// Each calculator's editorial content (intro / methodology / limitations / worked example)
// lives at src/content/tools/<slug>.md (en) and <slug>.zh.md (zh).
//
// The 4-H2 markdown body is rendered by src/components/CalculatorProse.astro
// (P140a-T5) into [lang]/[slug].astro (P140b-T4).
//
// zod frontmatter invariants are defined in src/content/tools-schema.ts and
// imported here. This keeps the schema independent of Astro's `astro:content`
// virtual module so tests/content-prose-shape-guard.test.ts can validate
// against the SAME schema source of truth.
const tools = defineCollection({
  type: 'content',
  schema: toolsFrontmatterSchema,
});

export const collections = { blog, tools };

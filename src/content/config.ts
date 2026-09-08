import { defineCollection } from 'astro:content';
import { toolsFrontmatterSchema } from './tools-schema';

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

export const collections = { tools };

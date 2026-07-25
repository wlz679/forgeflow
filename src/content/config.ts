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

export const collections = { blog };

// Adapter layer for the Astro Content Collection `blog`.
// Returns the same BlogPost shape that src/data/blog-posts.ts used to export,
// so consumer files (5 .astro pages + 1 component + 2 tests) can swap their
// import source without changing call sites.
//
// The 4 frontmatter fields are MINIMAL — slug is derived from the filename
// (entry.slug = 'best-${toolSlug}'), and toolName is looked up from tools[].
//
// See: docs/superpowers/specs/2026-06-29-p1-blog-markdown-design.md

import { getCollection, type CollectionEntry } from 'astro:content';
import { tools } from '../data/tools';

export interface BlogPost {
  slug: string;
  title: string;
  toolSlug: string;
  toolName: string;
  excerpt: string;
  ogImage: string;
  content: string;
}

type BlogEntry = CollectionEntry<'blog'>;

// Maps toolSlug → its index in the original tools[] array. Used to preserve
// the pre-migration post order so blog post indexes (and therefore the
// synthetic JSON-LD datePublished in [slug].astro:30) stay byte-equivalent.
const toolIndex = new Map(tools.map((t, i) => [t.slug, i]));

function toBlogPost(entry: BlogEntry): BlogPost {
  const toolSlug = entry.data.toolSlug;
  const tool = tools.find(t => t.slug === toolSlug);
  return {
    slug: entry.slug,
    title: entry.data.title,
    toolSlug,
    toolName: tool?.title ?? toolSlug,
    excerpt: entry.data.excerpt,
    ogImage: entry.data.ogImage,
    content: entry.body ?? '',
  };
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const entries = await getCollection('blog');
  return entries.map(toBlogPost).sort(
    (a, b) => (toolIndex.get(a.toolSlug) ?? 0) - (toolIndex.get(b.toolSlug) ?? 0)
  );
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const entries = await getCollection('blog', (e) => e.slug === slug);
  return entries[0] ? toBlogPost(entries[0]) : undefined;
}

export async function getBlogPostsByToolSlug(toolSlug: string): Promise<BlogPost[]> {
  const entries = await getCollection('blog', (e) => e.data.toolSlug === toolSlug);
  return entries.map(toBlogPost);
}

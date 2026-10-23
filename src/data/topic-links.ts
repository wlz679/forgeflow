// Single source of truth for "what is the URL of a Topic?".
//
// P153: the topic routes are `[topic]-guide.astro` / `[topic]-benchmark.astro`
// / `[topic]-compare.astro`, so a bare topic id is NOT a URL. Two components
// used to build `/${lang}/${cat.slug}/${topic.id}/` on their own, and every
// one of those links 404'd — measured 2026-10-23: 98 distinct broken targets,
// ~586 broken link instances across 437 pages.
//
// The rule, in one place:
//   · tier-1 topics (45 of them)  → the `-guide` page (they also have a
//     `-benchmark` page, but the guide is the editorial one; the card's own
//     CTA says "read guide")
//   · comparison topics (4 of them) → the `-compare` page (they have no guide)
//
// Every Topic in TOPICS has at least one page, so this always resolves.
import { categories } from './categories';
import type { Topic } from './topics';
import type { Lang } from '../i18n';

/** Which page variant is the canonical landing page for a Topic? */
export function topicPageVariant(topic: Topic): 'guide' | 'compare' {
  return topic.tier === 'comparison' ? 'compare' : 'guide';
}

/**
 * The public URL of a Topic's canonical page, or null when the topic's
 * letter has no category (in which case the caller should not render a link).
 */
export function topicHref(topic: Topic, lang: Lang): string | null {
  const cat = categories.find((c) => c.id === topic.letterId);
  if (!cat) return null;
  return `/${lang}/${cat.slug}/${topic.id}-${topicPageVariant(topic)}/`;
}

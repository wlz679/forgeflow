import { tools, type ToolMeta } from './tools';

// Count how many keywords (case-insensitive) two tools share.
function sharedKeywords(a: ToolMeta, b: ToolMeta): number {
  const aSet = new Set(a.keywords.map(k => k.toLowerCase()));
  const bSet = new Set(b.keywords.map(k => k.toLowerCase()));
  let n = 0;
  for (const k of aSet) if (bSet.has(k)) n++;
  return n;
}

// Rank candidates by (shared keywords desc, slug asc for tie-break).
function rankByKeywords(source: ToolMeta, candidates: ToolMeta[]) {
  return candidates
    .map(c => ({ c, score: sharedKeywords(source, c) }))
    .sort((a, b) => b.score - a.score || a.c.slug.localeCompare(b.c.slug));
}

// Auto-generate: each tool gets exactly 4 related tools.
// Algorithm:
//   1. Same-category first, ranked by shared keywords (desc).
//   2. If < 4 same-category, fill from cross-category scored picks (score > 0).
//   3. If still < 4, fill remaining slots from cross-category score-0 picks
//      (ranked by slug for stability). Ensures every tool always has exactly
//      4 related entries — even during P6 marketing-category seeding phase
//      when 'M' has < 5 tools. Quality degrades gracefully (score-0 picks
//      have no keyword overlap) but navigation never breaks.
export const relatedTools: Record<string, string[]> = {};

for (const tool of tools) {
  const sameCat = tools.filter(t => t.categoryId === tool.categoryId && t.slug !== tool.slug);
  const picked: ToolMeta[] = rankByKeywords(tool, sameCat).slice(0, 4).map(s => s.c);

  if (picked.length < 4) {
    const pickedSlugs = new Set(picked.map(p => p.slug));
    const crossCat = tools.filter(t =>
      t.categoryId !== tool.categoryId && t.slug !== tool.slug && !pickedSlugs.has(t.slug)
    );
    // Tier 1: cross-category with score > 0 (semantic matches)
    for (const s of rankByKeywords(tool, crossCat)) {
      if (picked.length >= 4) break;
      if (s.score > 0) picked.push(s.c);
    }
    // Tier 2: any remaining slots — fill with score-0 (slug-sorted) for
    // stable per-tool related-list across regenerations.
    if (picked.length < 4) {
      const pickedSlugs2 = new Set(picked.map(p => p.slug));
      const remaining = crossCat.filter(t => !pickedSlugs2.has(t.slug));
      for (const s of rankByKeywords(tool, remaining)) {
        if (picked.length >= 4) break;
        picked.push(s.c); // include even when score = 0
      }
    }
  }

  relatedTools[tool.slug] = picked.map(t => t.slug);
}
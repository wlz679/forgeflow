import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { relatedTools } from '../src/data/internal-links.ts';
import { tools } from '../src/data/tools/index.ts';

test('all 89 tools have relatedTools entry', () => {
  assert.equal(Object.keys(relatedTools).length, 89);
  for (const t of tools) {
    assert.ok(relatedTools[t.slug], `missing entry for ${t.slug}`);
  }
});

test('related list never includes the tool itself', () => {
  for (const t of tools) {
    assert.ok(!relatedTools[t.slug].includes(t.slug), `${t.slug} self-references`);
  }
});

test('related list has 4 entries for all 82 tools', () => {
  for (const t of tools) {
    assert.equal(
      relatedTools[t.slug].length,
      4,
      `${t.slug} (${t.categoryId}) has ${relatedTools[t.slug].length} related, want 4`
    );
  }
});

test('every tool has exactly 4 related entries (lazy fallback reports low-density state)', () => {
  // Two-phase check:
  //   1. Every tool must have exactly 4 related entries (hard requirement;
  //      the cross-category fallback in internal-links.ts guarantees this
  //      via tier-2 score-0 fill during low-density category seeding).
  //   2. Tools relying on cross-category fallback (same-cat count < 4) are
  //      reported as an informational warning. A-F are dense (5+ tools each);
  //      M is the new marketing category seeded during P6 — info-level logs
  //      until P6-5 lands 5+ same-cat peers, after which it goes dormant again.
  const lowDensity: Array<{slug: string; categoryId: string; sameCat: number; related: number}> = [];
  let totalTools = 0;
  for (const t of tools) {
    totalTools++;
    const sameCat = tools.filter(x => x.categoryId === t.categoryId && x.slug !== t.slug);
    const related = relatedTools[t.slug].length;
    assert.equal(
      related,
      4,
      `${t.slug} should have 4 related entries, got ${related}`
    );
    if (sameCat.length < 4) {
      lowDensity.push({slug: t.slug, categoryId: t.categoryId, sameCat: sameCat.length, related});
    }
  }
  if (lowDensity.length > 0) {
    console.log(
      `\n[informational] ${lowDensity.length}/${totalTools} tools cross-category fallback:`,
      lowDensity.map(l => `${l.slug} (${l.categoryId}, same-cat=${l.sameCat})`).join(', '),
    );
  }
});

test('related list is sorted: same-category before cross-category', () => {
  for (const t of tools) {
    const related = relatedTools[t.slug].map(s => tools.find(x => x.slug === s)!);
    let seenCross = false;
    for (const r of related) {
      if (r.categoryId !== t.categoryId) seenCross = true;
      else if (seenCross) {
        assert.fail(`${t.slug}: same-category ${r.slug} appears after cross-category`);
      }
    }
  }
});

test('no duplicate slugs in any related list', () => {
  for (const t of tools) {
    const set = new Set(relatedTools[t.slug]);
    assert.equal(
      set.size,
      relatedTools[t.slug].length,
      `${t.slug} has duplicates: ${relatedTools[t.slug].join(',')}`
    );
  }
});
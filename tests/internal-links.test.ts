import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { relatedTools } from '../src/data/internal-links.ts';
import { tools } from '../src/data/tools/index.ts';

test('all 44 tools have relatedTools entry', () => {
  assert.equal(Object.keys(relatedTools).length, 44);
  for (const t of tools) {
    assert.ok(relatedTools[t.slug], `missing entry for ${t.slug}`);
  }
});

test('related list never includes the tool itself', () => {
  for (const t of tools) {
    assert.ok(!relatedTools[t.slug].includes(t.slug), `${t.slug} self-references`);
  }
});

test('related list has 4 entries for all 44 tools', () => {
  for (const t of tools) {
    assert.equal(
      relatedTools[t.slug].length,
      4,
      `${t.slug} (${t.categoryId}) has ${relatedTools[t.slug].length} related, want 4`
    );
  }
});

test('no tool has fewer than 4 same-category candidates (fallback currently dormant)', () => {
  // Defensive: the cross-category fallback in internal-links.ts only
  // activates when a tool has < 4 same-category peers. With all 7
  // categories holding 5+ tools, the fallback path is dormant — kept
  // as a safety net for future single-engine categories.
  for (const t of tools) {
    const sameCat = tools.filter(x => x.categoryId === t.categoryId && x.slug !== t.slug);
    assert.ok(
      sameCat.length >= 4,
      `${t.slug} (${t.categoryId}) has only ${sameCat.length} same-cat peers — fallback would activate (re-verify fallback logic if this triggers)`
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
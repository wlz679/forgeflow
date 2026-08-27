#!/usr/bin/env node
// P147-C3: Build-dep guard for Comparison Topic cross-link coverage.
// Catches (a) empty relatedTopicIds on comparison-tier Topics,
// (b) orphan relatedTopicIds pointing to deleted topics,
// (c) reciprocal cross-link asymmetry (advisory warn),
// (d) page render: each Comparison page has ≥1 related link,
// (e) letter page render: B/C/M/R pages have Comparison grid section.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { TOPICS } from '../src/data/topics.ts';
import { categories } from '../src/data/categories.ts';
import en from '../src/i18n/locales/en.json';
import zh from '../src/i18n/locales/zh.json';

const COMPARISON_TOPICS = TOPICS.filter((t) => t.tier === 'comparison');
const LETTERS_WITH_COMPARE = ['B', 'C', 'M', 'R'] as const;
const DIST = join(process.cwd(), 'dist');

function walkComparePages(): string[] {
  // Returns list of /<lang>/<cat>/<topic>-compare/index.html paths
  const result: string[] = [];
  if (!existsSync(DIST)) return result;
  for (const lang of ['en', 'zh']) {
    const langDir = join(DIST, lang);
    if (!existsSync(langDir)) continue;
    for (const cat of readdirSync(langDir)) {
      const catPath = join(langDir, cat);
      if (!statSync(catPath).isDirectory()) continue;
      for (const topicDir of readdirSync(catPath)) {
        if (topicDir.endsWith('-compare') && existsSync(join(catPath, topicDir, 'index.html'))) {
          result.push(join(catPath, topicDir, 'index.html'));
        }
      }
    }
  }
  return result;
}

// Resolve letter → category slug via categories map (NOT hardcoded b/c/m/r).
// Brief resolution #2: letter pages are category-named (ai-cost-tools etc.),
// not letter-named (b.astro etc.).
const LETTER_SLUG_MAP = new Map(categories.map((c) => [c.id, c.slug]));

function walkLetterPages(letter: string): { en: string; zh: string } | null {
  const slug = LETTER_SLUG_MAP.get(letter);
  if (!slug) return null;
  const enPath = join(DIST, 'en', slug, 'index.html');
  const zhPath = join(DIST, 'zh', slug, 'index.html');
  if (!existsSync(enPath) || !existsSync(zhPath)) return null;
  return { en: enPath, zh: zhPath };
}

test('comparison-cross-link-guard: every comparison Topic has ≥1 relatedTopicId', () => {
  assert.ok(COMPARISON_TOPICS.length >= 4, `Expected ≥4 comparison topics, found ${COMPARISON_TOPICS.length}`);
  for (const t of COMPARISON_TOPICS) {
    assert.ok(
      t.relatedTopicIds.length >= 1,
      `${t.id}: relatedTopicIds is empty — every comparison-tier Topic must have ≥1 cross-link`
    );
  }
});

test('comparison-cross-link-guard: all relatedTopicIds resolve to existing TOPICS entries', () => {
  const topicIds = new Set(TOPICS.map((t) => t.id));
  for (const t of COMPARISON_TOPICS) {
    for (const rid of t.relatedTopicIds) {
      assert.ok(topicIds.has(rid), `${t.id}.relatedTopicIds contains orphan '${rid}' — points to non-existent Topic`);
    }
  }
});

test('comparison-cross-link-guard: reciprocal cross-link advisory (warn-only)', () => {
  // For each (A, B) pair where A.relatedTopicIds includes B, log advisory if B doesn't include A.
  // Explicit asymmetry is allowed per spec, so this is a console.warn, not an assert.
  const reverseIndex = new Map<string, Set<string>>();
  for (const t of COMPARISON_TOPICS) {
    reverseIndex.set(t.id, new Set(t.relatedTopicIds));
  }
  const asymmetries: string[] = [];
  for (const t of COMPARISON_TOPICS) {
    for (const rid of t.relatedTopicIds) {
      const reverseSet = reverseIndex.get(rid);
      if (reverseSet && !reverseSet.has(t.id)) {
        asymmetries.push(`${t.id} → ${rid} (no reverse)`);
      }
    }
  }
  if (asymmetries.length > 0) {
    console.warn(`[advisory] Cross-link asymmetries (explicit allowed): ${asymmetries.join(', ')}`);
  }
  // No assertion — advisory only.
});

test('comparison-cross-link-guard: page render — each Comparison page has ≥1 related link (build-dep)', () => {
  if (!existsSync(DIST)) {
    console.warn('dist/ not built yet — skipping build-dep render check (run pnpm build first)');
    return;
  }
  const comparePages = walkComparePages();
  assert.ok(comparePages.length >= 8, `Expected ≥8 comparison pages in dist/, found ${comparePages.length}`);
  for (const pagePath of comparePages) {
    const html = readFileSync(pagePath, 'utf8');
    // Parse topic ID from path: dist/<lang>/<cat>/<topicId>-compare/index.html.
    // P147-followup Important #1: precise invariant — verify THIS page links to its OWN
    // relatedTopicIds, not just "any" comparison topic's relatedTopicIds (v1 was loose
    // by design — `some(...)` across all comparison topics meant a deletion in ONE
    // page's relatedTopicIds could be masked by other topics' links).
    const match = pagePath.match(/[/\\]([^/\\]+)-compare[/\\]index\.html$/);
    assert.ok(match, `Cannot parse topic ID from ${pagePath}`);
    const topicId = match[1];
    const topic = TOPICS.find((t) => t.id === topicId);
    assert.ok(topic, `No TOPICS entry for ${topicId} (parsed from path)`);
    const ownRelatedLinks = topic.relatedTopicIds.filter((rid) => html.includes(`/${rid}/`));
    assert.ok(
      ownRelatedLinks.length >= 1,
      `${pagePath} (${topicId}) has no cross-link to its own relatedTopicIds: ${topic.relatedTopicIds.join(', ')}`
    );
  }
});

test('comparison-cross-link-guard: letter page render — B/C/M/R pages have Comparison grid section', () => {
  if (!existsSync(DIST)) {
    console.warn('dist/ not built yet — skipping build-dep render check (run pnpm build first)');
    return;
  }
  // P147-followup Important #2: marker strings sourced from translations.ts so the
  // guard stays in sync if i18n values change (avoids hardcoded literals drifting).
  const sectionKey = 'letter.compare.section' as const;
  const enMarker = en[sectionKey] as string;
  const zhMarker = zh[sectionKey] as string;
  for (const letter of LETTERS_WITH_COMPARE) {
    const paths = walkLetterPages(letter);
    assert.ok(paths, `Letter page ${letter} not found in dist/`);
    const enHtml = readFileSync(paths!.en, 'utf8');
    const zhHtml = readFileSync(paths!.zh, 'utf8');
    assert.ok(enHtml.includes(enMarker), `${paths!.en} missing '${enMarker}' (Compare grid section)`);
    assert.ok(zhHtml.includes(zhMarker), `${paths!.zh} missing '${zhMarker}' (对比专题 section)`);
  }
});

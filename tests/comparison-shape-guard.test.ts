#!/usr/bin/env node
// P140f Phase 4 Task 1: Build-dep guard for Comparison Topic content shape.
// Verifies every comparison-tier Topic in topics.ts has a TOPIC_COMPARE_CONTENT
// entry with non-trivial hero title/subtitle, hero table cell-count invariant
// (cells per row === compareSlug length), ≥4 hero rows, 5-6 dimensions with
// en/zh body length thresholds, decision body thresholds, and sources ≥100 chars
// with ≥5 year citations. Defends against stub/placeholder fills.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { TOPICS } from '../src/data/topics.ts';
import { TOPIC_COMPARE_CONTENT } from '../src/data/topic-content.ts';

const YEAR_REGEX = /20\d{2}/g;

test('comparison-shape-guard: registry has ≥4 TOPICS comparison entries', () => {
  // Task 1 ships 4 comparison TOPICS entries; Tasks 2-4 progressively fill
  // their TOPIC_COMPARE_CONTENT. This check only asserts the 4 TOPICS entries
  // are registered — content entries are validated by the shape checks below
  // (which iterate Object.entries(TOPIC_COMPARE_CONTENT)).
  const compareTopics = TOPICS.filter((t) => t.tier === 'comparison');
  assert.ok(compareTopics.length >= 4, `Expected ≥4 comparison topics, found ${compareTopics.length}`);
  // Fable review fix: every comparison-tier Topic must ship a TOPIC_COMPARE_CONTENT entry.
  // Defends against silent-pass where Tasks 2-4 partially fill content but a Topic is
  // shipped without heroTitle/dimensions/decision/sources.
  for (const t of compareTopics) {
    assert.ok(
      TOPIC_COMPARE_CONTENT[t.id],
      `TOPIC_COMPARE_CONTENT missing entry for ${t.id} — must ship full content for every comparison-tier Topic`
    );
  }
});

test('comparison-shape-guard: hero title length thresholds', () => {
  for (const [id, c] of Object.entries(TOPIC_COMPARE_CONTENT)) {
    assert.ok(c.heroTitle.en.length >= 30, `${id}.heroTitle.en too short: ${c.heroTitle.en.length}`);
    assert.ok(c.heroTitle.zh.length >= 10, `${id}.heroTitle.zh too short: ${c.heroTitle.zh.length}`);
  }
});

test('comparison-shape-guard: hero subtitle length thresholds', () => {
  for (const [id, c] of Object.entries(TOPIC_COMPARE_CONTENT)) {
    assert.ok(c.heroSubtitle.en.length >= 50, `${id}.heroSubtitle.en too short: ${c.heroSubtitle.en.length}`);
    assert.ok(c.heroSubtitle.zh.length >= 15, `${id}.heroSubtitle.zh too short: ${c.heroSubtitle.zh.length}`);
  }
});

test('comparison-shape-guard: hero table cell count matches compareSlug length', () => {
  for (const topic of TOPICS.filter((t) => t.tier === 'comparison')) {
    const content = TOPIC_COMPARE_CONTENT[topic.id];
    if (!content) continue;
    const expectedCells = topic.compareSlug?.length ?? 0;
    assert.ok(expectedCells >= 2, `${topic.id}: compareSlug must have ≥2 entries`);
    for (const [i, row] of content.heroTable.rows.entries()) {
      assert.strictEqual(
        row.cells.length,
        expectedCells,
        `${topic.id}.heroTable.rows[${i}].cells.length=${row.cells.length} but compareSlug.length=${expectedCells}`
      );
    }
    // Hero table must have ≥4 aspect rows
    assert.ok(content.heroTable.rows.length >= 4, `${topic.id}: heroTable must have ≥4 rows, has ${content.heroTable.rows.length}`);
  }
});

test('comparison-shape-guard: dimensions array has 5-6 entries with body length thresholds', () => {
  for (const [id, c] of Object.entries(TOPIC_COMPARE_CONTENT)) {
    assert.ok(c.dimensions.length >= 5 && c.dimensions.length <= 6, `${id}: dimensions.length=${c.dimensions.length}, expected 5-6`);
    for (const [i, dim] of c.dimensions.entries()) {
      assert.ok(dim.body.en.length >= 200, `${id}.dimensions[${i}].body.en too short: ${dim.body.en.length}`);
      assert.ok(dim.body.zh.length >= 60, `${id}.dimensions[${i}].body.zh too short: ${dim.body.zh.length}`);
    }
  }
});

test('comparison-shape-guard: decision body length thresholds', () => {
  for (const [id, c] of Object.entries(TOPIC_COMPARE_CONTENT)) {
    assert.ok(c.decision.en.length >= 300, `${id}.decision.en too short: ${c.decision.en.length}`);
    assert.ok(c.decision.zh.length >= 90, `${id}.decision.zh too short: ${c.decision.zh.length}`);
  }
});

test('comparison-shape-guard: sources ≥100 chars total + ≥5 year citations', () => {
  for (const [id, c] of Object.entries(TOPIC_COMPARE_CONTENT)) {
    assert.ok(c.sources.length >= 100, `${id}.sources too short: ${c.sources.length}`);
    const yearsFound = (c.sources.match(YEAR_REGEX) ?? []).length;
    assert.ok(yearsFound >= 5, `${id}.sources has only ${yearsFound} year citations, expected ≥5`);
  }
});

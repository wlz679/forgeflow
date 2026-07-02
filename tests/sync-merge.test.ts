/**
 * P3-2 sync core merge-function tests.
 * Covers: mergeFavorites / mergeRecent / mergeHistory
 *   - set union, cap 50, lastUpdated = max
 *   - same slug → newer visitedAt wins; different slugs → timestamp top-N, cap 20
 *   - same id → newer accessedAt wins; different ids → union, cap 100
 * Run via: node --import tsx --test tests/sync-merge.test.ts
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  mergeFavorites,
  mergeRecent,
  mergeHistory,
  type FavoritesPayload,
  type RecentPayload,
  type HistoryPayload,
} from '../src/lib/sync.ts';

// ============== mergeFavorites ==============

const FAV_LS_A: FavoritesPayload = { version: 1, slugs: ['A', 'B'], lastUpdated: '2026-07-01T10:00:00Z' };
const FAV_CLOUD_C: FavoritesPayload = { version: 1, slugs: ['C', 'D'], lastUpdated: '2026-07-01T09:00:00Z' };
const FAV_CLOUD_OVERLAP: FavoritesPayload = { version: 1, slugs: ['B', 'C'], lastUpdated: '2026-07-01T11:00:00Z' };

test('mergeFavorites: LS=null + cloud=null → empty', () => {
  const m = mergeFavorites(null, null);
  assert.deepEqual(m.slugs, []);
  assert.equal(m.version, 1);
});

test('mergeFavorites: set union (disjoint)', () => {
  const m = mergeFavorites(FAV_LS_A, FAV_CLOUD_C);
  assert.deepEqual(m.slugs.sort(), ['A', 'B', 'C', 'D'].sort());
});

test('mergeFavorites: set union with dedup (overlap)', () => {
  const m = mergeFavorites(FAV_LS_A, FAV_CLOUD_OVERLAP);
  assert.deepEqual(m.slugs.sort(), ['A', 'B', 'C'].sort());
  // lastUpdated = max(LS, cloud)
  assert.equal(m.lastUpdated, '2026-07-01T11:00:00Z');
});

test('mergeFavorites: cap at 50 (drop oldest by lastUpdated)', () => {
  const ls: FavoritesPayload = { version: 1, slugs: Array.from({length: 30}, (_, i) => `ls${i}`), lastUpdated: '2026-07-01T08:00:00Z' };
  const cloud: FavoritesPayload = { version: 1, slugs: Array.from({length: 30}, (_, i) => `c${i}`), lastUpdated: '2026-07-01T12:00:00Z' };
  const m = mergeFavorites(ls, cloud);
  assert.equal(m.slugs.length, 50);
  // cloud is newer → cloud entries should dominate
  const cloudCount = m.slugs.filter(s => s.startsWith('c')).length;
  assert.equal(cloudCount, 30);
});

// ============== mergeRecent ==============

const REC_LS: RecentPayload = {
  version: 1,
  entries: [{slug: 'X', visitedAt: '2026-07-01T10:00:00Z'}],
  lastUpdated: '2026-07-01T10:00:00Z',
};
const REC_CLOUD_NEWER: RecentPayload = {
  version: 1,
  entries: [{slug: 'X', visitedAt: '2026-07-01T11:00:00Z'}],
  lastUpdated: '2026-07-01T11:00:00Z',
};

test('mergeRecent: same slug, cloud newer → cloud wins', () => {
  const m = mergeRecent(REC_LS, REC_CLOUD_NEWER);
  assert.equal(m.entries.length, 1);
  assert.equal(m.entries[0].visitedAt, '2026-07-01T11:00:00Z');
});

test('mergeRecent: different slugs → union by timestamp top-N', () => {
  const ls: RecentPayload = { version: 1, entries: [{slug: 'A', visitedAt: '2026-07-01T08:00:00Z'}], lastUpdated: '2026-07-01T08:00:00Z' };
  const cloud: RecentPayload = { version: 1, entries: [{slug: 'B', visitedAt: '2026-07-01T12:00:00Z'}], lastUpdated: '2026-07-01T12:00:00Z' };
  const m = mergeRecent(ls, cloud);
  assert.equal(m.entries.length, 2);
  assert.equal(m.entries[0].slug, 'B'); // newer first
});

// ============== mergeHistory ==============

const HIST_LS: HistoryPayload = {
  version: 1,
  entries: [{
    id: 'h1', slug: 'calc', inputs: {a: '1'}, result: '5', savedAt: '2026-07-01T08:00:00Z', accessedAt: '2026-07-01T10:00:00Z'
  }],
  lastUpdated: '2026-07-01T10:00:00Z',
};
const HIST_CLOUD_SAME_ID: HistoryPayload = {
  version: 1,
  entries: [{
    id: 'h1', slug: 'calc', inputs: {a: '2'}, result: '7', savedAt: '2026-07-01T08:00:00Z', accessedAt: '2026-07-01T11:00:00Z'
  }],
  lastUpdated: '2026-07-01T11:00:00Z',
};

test('mergeHistory: same id → newer accessedAt wins (merge fields)', () => {
  const m = mergeHistory(HIST_LS, HIST_CLOUD_SAME_ID);
  assert.equal(m.entries.length, 1);
  assert.equal(m.entries[0].accessedAt, '2026-07-01T11:00:00Z');
  assert.equal(m.entries[0].inputs.a, '2'); // from cloud (newer)
  assert.equal(m.entries[0].result, '7');
});

test('mergeHistory: different ids → union, cap 100 by accessedAt', () => {
  const ls: HistoryPayload = { version: 1, entries: [{...HIST_LS.entries[0], id: 'h1'}], lastUpdated: '2026-07-01T10:00:00Z' };
  const cloud: HistoryPayload = { version: 1, entries: [{...HIST_LS.entries[0], id: 'h2', accessedAt: '2026-07-01T11:00:00Z'}], lastUpdated: '2026-07-01T11:00:00Z' };
  const m = mergeHistory(ls, cloud);
  assert.equal(m.entries.length, 2);
});

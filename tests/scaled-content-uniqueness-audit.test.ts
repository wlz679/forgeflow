#!/usr/bin/env node
// P148-B: scaled-content-uniqueness-audit.test.ts
// Aug 18 Spam Update risk assessment — detect pages sharing too much boilerplate.
// Walks dist/ HTML files, groups by template type (guide/benchmark/compare/other),
// computes pairwise Jaccard similarity on extracted main content. Flags any pair
// above threshold as suspect boilerplate-heavy.
//
// This is an AUDIT (advisory only) — does not fail build. Output feeds the
// memory/audit-scaled-content-2026-08-25.md report.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist');
const SIMILARITY_THRESHOLD = 0.8; // >80% Jaccard = suspect boilerplate-heavy
const MIN_TOKEN_COUNT = 50; // skip pages with too few tokens (likely utility)

type TemplateType = 'guide' | 'benchmark' | 'compare' | 'other';

interface Page {
  lang: string;
  cat: string;
  path: string;
  template: TemplateType;
  tokens: Set<string>;
  tokenCount: number;
  charCount: number;
}

const UTILITY_CATS = new Set([
  'about', 'contact', 'favorites', 'history', 'recent', 'privacy-policy', 'terms', 'blog',
]);

function detectTemplate(path: string): TemplateType {
  // Normalize path separators for cross-platform compat (Windows uses \)
  const p = path.replace(/\\/g, '/');
  if (p.includes('-guide/index.html')) return 'guide';
  if (p.includes('-benchmark/index.html')) return 'benchmark';
  if (p.includes('-compare/index.html')) return 'compare';
  return 'other';
}

function extractMainContent(html: string): string {
  let s = html;
  // Strip head/scripts/styles/svg/nav/header/footer/aside/comments before tag strip
  s = s.replace(/<head[\s\S]*?<\/head>/g, ' ');
  s = s.replace(/<script[\s\S]*?<\/script>/g, ' ');
  s = s.replace(/<style[\s\S]*?<\/style>/g, ' ');
  s = s.replace(/<svg[\s\S]*?<\/svg>/g, ' ');
  s = s.replace(/<nav[\s\S]*?<\/nav>/g, ' ');
  s = s.replace(/<header[\s\S]*?<\/header>/g, ' ');
  s = s.replace(/<footer[\s\S]*?<\/footer>/g, ' ');
  s = s.replace(/<aside[\s\S]*?<\/aside>/g, ' ');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  // Strip remaining HTML tags
  s = s.replace(/<[^>]+>/g, ' ');
  // Decode common HTML entities
  s = s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&nbsp;/g, ' ');
  return s;
}

// Minimal English stopword list — purpose is to deflate boilerplate contributions.
// CJK characters are dense; shingles (2-char) provide natural differentiation without stopwords.
const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out',
  'this', 'that', 'with', 'have', 'has', 'had', 'what', 'when', 'where', 'which', 'who', 'why', 'how',
  'will', 'your', 'from', 'they', 'been', 'their', 'would', 'there', 'could', 'should', 'about',
  'than', 'then', 'them', 'some', 'these', 'those', 'into', 'over', 'after', 'before', 'between',
  'also', 'just', 'only', 'very', 'more', 'most', 'much', 'such', 'each', 'every', 'any', 'both',
  'few', 'other', 'same', 'still', 'being', 'does', 'done', 'make', 'made', 'uses', 'used', 'using',
  'use', 'get', 'got', 'set', 'see', 'per', 'via', 'within', 'across', 'without', 'against',
  'because', 'while', 'though', 'even', 'since', 'until', 'unless', 'whether',
]);

function tokenize(text: string): Set<string> {
  const tokens = new Set<string>();
  // Latin words (3+ chars, alphanumeric)
  for (const match of text.toLowerCase().matchAll(/[a-z][a-z0-9]{2,}/g)) {
    const tok = match[0];
    if (!STOPWORDS.has(tok)) tokens.add(tok);
  }
  // Chinese chars: 2-char shingles for phrase-level granularity
  for (const match of text.matchAll(/[一-鿿]+/g)) {
    const seq = match[0];
    for (let i = 0; i < seq.length - 1; i++) {
      tokens.add(seq.slice(i, i + 2));
    }
  }
  return tokens;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  // Iterate over the smaller set for speed
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const t of small) if (large.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function walkPages(): Page[] {
  const pages: Page[] = [];
  if (!existsSync(DIST)) return pages;
  for (const lang of ['en', 'zh']) {
    const langDir = join(DIST, lang);
    if (!existsSync(langDir)) continue;
    for (const cat of readdirSync(langDir)) {
      if (UTILITY_CATS.has(cat)) continue;
      const catPath = join(langDir, cat);
      if (!statSync(catPath).isDirectory()) continue;
      walkDir(catPath, lang, cat, pages);
    }
  }
  return pages;
}

function walkDir(dir: string, lang: string, cat: string, pages: Page[]): void {
  for (const entry of readdirSync(dir)) {
    const entryPath = join(dir, entry);
    if (statSync(entryPath).isDirectory()) {
      walkDir(entryPath, lang, cat, pages);
    } else if (entry === 'index.html') {
      const html = readFileSync(entryPath, 'utf8');
      const main = extractMainContent(html);
      const tokens = tokenize(main);
      const template = detectTemplate(entryPath);
      pages.push({
        lang,
        cat,
        path: entryPath,
        template,
        tokens,
        tokenCount: tokens.size,
        charCount: main.length,
      });
    }
  }
}

test('scaled-content-uniqueness-audit: pairwise Jaccard within template groups', () => {
  if (!existsSync(DIST)) {
    console.warn('[audit] dist/ not built yet — skipping (run pnpm build first)');
    return;
  }
  const pages = walkPages();
  assert.ok(
    pages.length > 100,
    `Expected >100 content pages, got ${pages.length} (audit may have skipped too much)`
  );
  const groups = new Map<string, Page[]>();
  for (const p of pages) {
    const key = `${p.lang}/${p.template}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  console.log(`\n[audit] Walked ${pages.length} content pages in ${groups.size} template groups`);
  const flagged: Array<{ a: string; b: string; jaccard: number; group: string }> = [];
  let totalPairs = 0;
  for (const [groupKey, groupPages] of groups) {
    if (groupPages.length < 2) continue;
    const avgTokens = groupPages.reduce((s, p) => s + p.tokenCount, 0) / groupPages.length;
    const minTokens = Math.min(...groupPages.map((p) => p.tokenCount));
    const maxTokens = Math.max(...groupPages.map((p) => p.tokenCount));
    console.log(
      `  ${groupKey}: ${groupPages.length} pages, tokens ${minTokens}-${maxTokens} (avg ${avgTokens.toFixed(0)})`
    );
    for (let i = 0; i < groupPages.length; i++) {
      for (let j = i + 1; j < groupPages.length; j++) {
        const a = groupPages[i];
        const b = groupPages[j];
        if (a.tokenCount < MIN_TOKEN_COUNT || b.tokenCount < MIN_TOKEN_COUNT) continue;
        totalPairs++;
        const sim = jaccard(a.tokens, b.tokens);
        if (sim > SIMILARITY_THRESHOLD) {
          flagged.push({ a: a.path, b: b.path, jaccard: sim, group: groupKey });
        }
      }
    }
  }
  console.log(`\n[audit] Total pairwise comparisons: ${totalPairs}`);
  if (flagged.length > 0) {
    console.warn(
      `\n[audit] ⚠️  ${flagged.length} pair(s) exceed ${SIMILARITY_THRESHOLD} similarity threshold:`
    );
    for (const f of flagged) {
      console.warn(`  [${f.group}] ${f.a}\n    ↔ ${f.b}\n    jaccard=${f.jaccard.toFixed(3)}`);
    }
  } else {
    console.log(`\n[audit] ✅ 0 pairs exceed ${SIMILARITY_THRESHOLD} — Aug 18 Spam Update risk = LOW`);
  }
  // Advisory audit — does not fail build. Future hardening can convert to hard assert.
});
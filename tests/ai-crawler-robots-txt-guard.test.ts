#!/usr/bin/env node
// tests/ai-crawler-robots-txt-guard.test.ts
// P148-G S22 source-only guard: AI crawler robots.txt audit.
//
// Defends against accidental future blocks of major AI training crawlers:
//   - ClaudeBot (Anthropic)         — Claude training data
//   - GPTBot (OpenAI)               — ChatGPT training data
//   - Applebot-Extended (Apple)     — Apple Intelligence training
//   - Google-Extended (Google)      — Gemini training (separate from Googlebot)
//   - PerplexityBot (Perplexity)    — Perplexity citation retrieval
//
// Per P148-G S22 audit (维度 3 Proactive Co-Pilot round 5, 2026-08-26),
// all 5 must be allowed in robots.txt. Default `User-agent: *` + `Allow: /`
// counts as allowed; explicit per-crawler Allow is also accepted.
//
// P153-E2: this guard used to read dist/robots.txt when it existed and
// otherwise PARSE the source's BODY array with a quote-scanning regex.
// Both paths were broken:
//   - dist/robots.txt does not exist: the route is an on-demand Astro
//     endpoint (output: 'hybrid', no `export const prerender`), and
//     public/robots.txt does not exist either. So the parse path was the
//     normal one.
//   - the parse regex matched any single-quoted run, and the source's
//     comments contain an apostrophe ("...any new AI crawler we haven't
//     enumerated yet)"), which opened a phantom string that swallowed the
//     real 'User-agent: *' and 'Allow: /' lines. The parsed body silently
//     lost the wildcard rule, so the guard failed for a site whose
//     robots.txt was correct.
//
// New contract: ask the route handler for the bytes it actually serves.
// That is the ground truth — no parsing, no dist/ dependency, and the
// result cannot depend on whether a local build happens to be lying around.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { GET } from '../src/pages/robots.txt.ts';

const ROOT = process.cwd();
const ROBOTS_SRC = join(ROOT, 'src/pages/robots.txt.ts');

// Major AI crawlers that must be allowed per P148-G S22.
const AI_CRAWLERS = [
  'ClaudeBot',
  'GPTBot',
  'Applebot-Extended',
  'Google-Extended',
  'PerplexityBot',
];

/** The exact body the site serves at /robots.txt. */
async function readBody(): Promise<string> {
  // APIRoute may return a Response or a Promise<Response> — await both.
  const res = await GET({} as Parameters<typeof GET>[0]);
  return await res.text();
}

test('src/pages/robots.txt.ts exists', () => {
  assert.ok(existsSync(ROBOTS_SRC), `Expected ${ROBOTS_SRC} to exist`);
});

test('robots.txt 的 wildcard 块（User-agent: *）允许抓取全部', async () => {
  const body = await readBody();
  assert.match(body, /User-agent:\s*\*/i, 'Expected wildcard User-agent: *');
  // Block-scoped: the wildcard's OWN rules must allow the root and must not
  // disallow it. A body-wide `/Allow:\s*\//` regex would also match the five
  // per-crawler blocks, so it would keep passing even after the wildcard
  // was turned into `Disallow: /` — the assertion would not be guarding the
  // thing its name claims. (Found by the mutation harness.)
  assert.ok(
    isCrawlerAllowed(body, '*'),
    'wildcard block must have "Allow: /" and no "Disallow: /"',
  );
});

test('Sitemap directive is present', async () => {
  const body = await readBody();
  assert.match(body, /Sitemap:\s*https?:\/\//i, 'Expected Sitemap: <url> directive');
});

// Iterate over AI_CRAWLERS (test.each not available in this runner)
for (const crawler of AI_CRAWLERS) {
  test(`AI crawler ${crawler} is allowed`, async () => {
    const body = await readBody();
    assert.ok(
      isCrawlerAllowed(body, crawler),
      `Expected robots.txt to ALLOW ${crawler} ` +
        `(explicit Allow, or wildcard User-agent: * + Allow: / with no Disallow: /)`
    );
  });
}

function isCrawlerAllowed(body: string, crawler: string): boolean {
  const lines = body.split(/\r?\n/);
  // robots.txt rules: each User-agent block has rules until the next User-agent.
  // First match wins for that User-agent.
  let currentAgent: string | null = null;
  let wildcardAgent: { allowRoot: boolean; disallowRules: string[] } | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.toLowerCase().startsWith('user-agent:')) {
      currentAgent = line.slice('user-agent:'.length).trim();
      continue;
    }
    const lc = line.toLowerCase();
    if (currentAgent === crawler) {
      // First match for this crawler wins.
      if (lc.startsWith('allow: /') || lc === 'allow: /') return true;
      if (lc.startsWith('disallow: /') || lc === 'disallow: /') return false;
      // Other rules (non-root) don't block crawlability; continue scanning.
    }
    if (currentAgent === '*' && wildcardAgent === null) {
      wildcardAgent = { allowRoot: false, disallowRules: [] };
    }
    if (currentAgent === '*' && wildcardAgent) {
      if (lc.startsWith('allow: /')) wildcardAgent.allowRoot = true;
      if (lc.startsWith('disallow:')) {
        wildcardAgent.disallowRules.push(line.slice('disallow:'.length).trim());
      }
    }
  }
  // No explicit rule for this crawler → fall through to wildcard.
  if (wildcardAgent) {
    return wildcardAgent.allowRoot && !wildcardAgent.disallowRules.includes('/');
  }
  return false;
}

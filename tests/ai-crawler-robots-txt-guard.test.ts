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
// Runs in default pnpm check (no RUN_BUILD_TESTS gate, no dist/ rebuild).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const ROBOTS_SRC = join(ROOT, 'src/pages/robots.txt.ts');
const DIST_ROBOTS = join(ROOT, 'dist/robots.txt');

// Major AI crawlers that must be allowed per P148-G S22.
const AI_CRAWLERS = [
  'ClaudeBot',
  'GPTBot',
  'Applebot-Extended',
  'Google-Extended',
  'PerplexityBot',
];

function readBody(): string {
  // Prefer dist/robots.txt (the actually-served file) if it exists;
  // otherwise parse src/pages/robots.txt.ts BODY template literal.
  if (existsSync(DIST_ROBOTS)) {
    return readFileSync(DIST_ROBOTS, 'utf8');
  }
  if (!existsSync(ROBOTS_SRC)) {
    throw new Error(`Neither ${DIST_ROBOTS} nor ${ROBOTS_SRC} exists`);
  }
  // Parse the BODY = [ ... ].join('\n') template literal — best-effort extraction
  const txt = readFileSync(ROBOTS_SRC, 'utf8');
  const m = txt.match(/const BODY = \[([\s\S]*?)\]\.join\('\\n'\)/);
  if (!m) throw new Error('Could not extract BODY from src/pages/robots.txt.ts');
  // Each line is a quoted string — extract them and join.
  const lines = [...m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((line) => {
    return line[1]
      .replace(/\\\\/g, '\x00') // \\
      .replace(/\\'/g, "'")
      .replace(/\\n/g, '\n')
      .replace(/\x00/g, '\\');
  });
  return lines.join('\n');
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

test('src/pages/robots.txt.ts exists', () => {
  assert.ok(existsSync(ROBOTS_SRC), `Expected ${ROBOTS_SRC} to exist`);
});

test('robots.txt has wildcard User-agent: * with Allow: /', () => {
  const body = readBody();
  assert.match(body, /User-agent:\s*\*/i, 'Expected wildcard User-agent: *');
  assert.match(body, /Allow:\s*\//i, 'Expected Allow: / for wildcard');
});

// Iterate over AI_CRAWLERS (test.each not available in this runner)
for (const crawler of AI_CRAWLERS) {
  test(`AI crawler ${crawler} is allowed`, () => {
    const body = readBody();
    assert.ok(
      isCrawlerAllowed(body, crawler),
      `Expected robots.txt to ALLOW ${crawler} ` +
        `(explicit Allow, or wildcard User-agent: * + Allow: / with no Disallow: /)`
    );
  });
}

test('Sitemap directive is present', () => {
  const body = readBody();
  assert.match(body, /Sitemap:\s*https?:\/\//i, 'Expected Sitemap: <url> directive');
});
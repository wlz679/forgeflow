// src/pages/robots.txt.ts
// Renders /robots.txt (served as text/plain at the site root).
//
// Policy (P148-G S22 — 维度 3 Proactive Co-Pilot scan round 5, 2026-08-26):
//   ALLOW all crawlers, including AI training crawlers. We want our content
//   cited by Claude, ChatGPT, Gemini, Perplexity, Apple Intelligence, etc.
//
// `User-agent: *` with `Allow: /` covers all crawlers per robots.txt spec,
// including:
//   - ClaudeBot (Anthropic)
//   - GPTBot (OpenAI)
//   - Applebot-Extended (Apple Intelligence)
//   - Google-Extended (Gemini training — separate from Googlebot indexing)
//   - PerplexityBot (Perplexity)
//   - Bytespider, CCBot, DuckAssistBot, and ~26 others per Dark Visitors
//
// The explicit per-AI-crawler User-agent blocks below are defensive — they
// survive even if someone accidentally removes the wildcard User-agent: *.
// Each is followed by `Allow: /` so a future `User-agent: *` Disallow: /bot/`
// would not accidentally block these AI crawlers.
//
// If you want to block an AI crawler, use a per-crawler `Disallow: /` rule
// AFTER these explicit Allow rules — order matters in robots.txt (first
// matching rule wins for that User-agent).
//
// See: tests/ai-crawler-robots-txt-guard.test.ts

import type { APIRoute } from 'astro';
import { SITE_URL } from '../lib/site-config';

const BODY = [
  // Defensive explicit allows for major AI training crawlers.
  // First match wins per User-agent, so these take precedence over the
  // wildcard User-agent: * rule below.
  'User-agent: ClaudeBot',
  'Allow: /',
  '',
  'User-agent: GPTBot',
  'Allow: /',
  '',
  'User-agent: Applebot-Extended',
  'Allow: /',
  '',
  'User-agent: Google-Extended',
  'Allow: /',
  '',
  'User-agent: PerplexityBot',
  'Allow: /',
  '',
  // Wildcard allow for all other crawlers (including SEO bots, image
  // crawlers, and any new AI crawler we haven't enumerated yet).
  'User-agent: *',
  'Allow: /',
  '',
  `Sitemap: ${SITE_URL}/sitemap-index.xml`,
  '',
].join('\n');

export const GET: APIRoute = () => {
  return new Response(BODY, { headers: { 'Content-Type': 'text/plain' } });
};
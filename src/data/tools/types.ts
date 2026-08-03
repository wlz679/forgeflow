import type { ToolInput } from '../../core/engines/types';

export interface ToolMeta {
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  applicationCategory: string;
  // Reuses ToolInput from the engine runtime types so new fields (`default`,
  // value/label option pairs, min/max/step, hint) stay in sync automatically.
  // P53 P1 Critical Batch: closed 7 TS2353 errors in hiring-team (5) +
  // product-analytics (2) by widening the shape.
  inputs: ToolInput[];
  keywords: string[];   // 5-10 per tool; drives recommendation algorithm (shared keyword count = similarity score)
  tags: string[];       // 3-5 per tool; reserved for future UI / Schema.org reuse
  // EEAT (added 2026-06-27, P0 content-depth spec)
  reviewedBy: string;        // e.g. 'ForgeFlowKit Team' — legacy free-form label, kept for backward compat (P140d-T8 removes)
  author: string;            // e.g. 'ForgeFlowKit' — legacy free-form label, kept for backward compat (P140d-T8 removes)
  dataReviewedAt: string;    // ISO date YYYY-MM-DD
  sources: string[];         // e.g. ['LiteLLM Pricing', 'Stripe Docs', 'HubSpot Benchmarks'] — legacy string[] form, kept for backward compat (P140d-T8 removes)
  // P140b-T3: AdSense E-E-A-T structured fields (additive — old fields above
  // kept for backward compat; P140d-T8 removes `reviewedBy` + `author` +
  // `sources` legacy fields after migration is complete). Reviewer ids
  // reference src/data/reviewers.ts:reviewers[].id (P140c-T1).
  authorId: string;          // → reviewers[].id (default 'wlz' founder)
  reviewerIds: string[];     // → reviewers[].id[] (max 2 displayed per P140b-T6)
  sourcesRich: { name: string; url: string }[];  // superset of sources[], with URLs for link display
}

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
  reviewedBy: string;        // e.g. 'ForgeFlowKit Team'
  author: string;            // e.g. 'ForgeFlowKit'
  dataReviewedAt: string;    // ISO date YYYY-MM-DD
  sources: string[];         // e.g. ['LiteLLM Pricing', 'Stripe Docs', 'HubSpot Benchmarks']
}

export interface ToolMeta {
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  applicationCategory: string;
  inputs: { name: string; label: string; placeholder: string; type: 'text' | 'select' | 'number'; options?: string[] }[];
  keywords: string[];   // 5-10 per tool; drives recommendation algorithm (shared keyword count = similarity score)
  tags: string[];       // 3-5 per tool; reserved for future UI / Schema.org reuse
  // EEAT (added 2026-06-27, P0 content-depth spec)
  reviewedBy: string;        // e.g. 'ForgeFlowKit Team'
  author: string;            // e.g. 'ForgeFlowKit'
  dataReviewedAt: string;    // ISO date YYYY-MM-DD
  sources: string[];         // e.g. ['LiteLLM Pricing', 'Stripe Docs', 'HubSpot Benchmarks']
}

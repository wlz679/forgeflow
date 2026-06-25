// Maps ToolMeta.categoryId (A-F) to schema.org applicationCategory value.
// Source: design doc §4.3.2. SaaS/finance tools get specific types;
// freelance/cost tools use the generic BusinessApplication.

export const CATEGORY_TO_APPLICATION: Record<string, string> = {
  A: 'BusinessApplication',   // SaaS Metrics
  B: 'DeveloperApplication',  // AI Cost Tools
  C: 'FinanceApplication',    // Valuation & Exit
  D: 'BusinessApplication',   // Freelance Pricing
  E: 'BusinessApplication',   // Cost & Efficiency
  F: 'FinanceApplication',    // Investment & ROI
};

export function categoryIdToApplicationCategory(id: string): string {
  return CATEGORY_TO_APPLICATION[id] ?? 'BusinessApplication';
}

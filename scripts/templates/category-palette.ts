// 6-category color palette for og:image gradient backgrounds.
// Color hex codes match design doc §4.4.1.

export interface CategoryPalette {
  primary: string;
  secondary: string;
  emoji: string;
}

export const CATEGORY_PALETTE: Record<string, CategoryPalette> = {
  A: { primary: '#7C3AED', secondary: '#F97316', emoji: '📊' },  // SaaS Metrics
  B: { primary: '#0EA5E9', secondary: '#06B6D4', emoji: '🤖' },  // AI Cost Tools
  C: { primary: '#10B981', secondary: '#84CC16', emoji: '💎' },  // Valuation & Exit
  D: { primary: '#EC4899', secondary: '#F43F5E', emoji: '💼' },  // Freelance Pricing
  E: { primary: '#F59E0B', secondary: '#EF4444', emoji: '⚡' },  // Cost & Efficiency
  F: { primary: '#6366F1', secondary: '#8B5CF6', emoji: '📈' },  // Investment & ROI
};

export function getCategoryPalette(categoryId: string): CategoryPalette {
  return CATEGORY_PALETTE[categoryId] ?? CATEGORY_PALETTE.A;
}

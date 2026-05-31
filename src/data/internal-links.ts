import { tools } from './tools';

// Generate related tools: 3 from same category + 2 cross-category
export const relatedTools: Record<string, string[]> = {};

for (const tool of tools) {
  const sameCategory = tools.filter(t => t.categoryId === tool.categoryId && t.slug !== tool.slug);
  const otherCategory = tools.filter(t => t.categoryId !== tool.categoryId);
  relatedTools[tool.slug] = [
    ...sameCategory.slice(0, 3).map(t => t.slug),
    ...otherCategory.slice(0, 2).map(t => t.slug),
  ];
}

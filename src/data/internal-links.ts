import { tools } from './tools';

// Auto-generate: each tool links to 4-5 other tools in the same category
export const relatedTools: Record<string, string[]> = {};

for (const tool of tools) {
  const sameCategory = tools.filter(t => t.categoryId === tool.categoryId && t.slug !== tool.slug);
  relatedTools[tool.slug] = sameCategory.slice(0, 4).map(t => t.slug);
}

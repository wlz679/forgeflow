// Use project tsx to import all 18 tools/*.ts files
import { tools } from 'file:///D:/E/独立站/youtube-tools/src/data/tools/index.ts';

const all = tools.map(t => ({
  slug: t.slug,
  title: t.title,
  description: t.description,
  categoryId: t.categoryId,
  applicationCategory: t.applicationCategory,
  keywords: t.keywords,
  tags: t.tags,
  authorId: t.authorId,
  dataReviewedAt: t.dataReviewedAt,
  sources: t.sources,
}));

import fs from 'node:fs';
const OUT = 'docs/superpowers/_research/p140e-blog-strategy/tool-keywords.json';
fs.writeFileSync(OUT, JSON.stringify({
  source: 'src/data/tools/index.ts (compiled via tsx)',
  totalTools: all.length,
  byCategory: all.reduce((acc, t) => {
    acc[t.categoryId] = (acc[t.categoryId] || 0) + 1;
    return acc;
  }, {}),
  tools: all,
}, null, 2));

console.log('TOTAL TOOLS:', all.length);
console.log('BY CATEGORY:', all.reduce((acc, t) => {
  acc[t.categoryId] = (acc[t.categoryId] || 0) + 1;
  return acc;
}, {}));
console.log('\nKEYWORDS PER TOOL (range):', Math.min(...all.map(t => t.keywords.length)), '~', Math.max(...all.map(t => t.keywords.length)));
console.log('AVG KEYWORDS:', (all.reduce((s, t) => s + t.keywords.length, 0) / all.length).toFixed(1));
console.log('WROTE:', OUT);

import type { ToolMeta } from './types';

// Aggregate all ToolMeta entries from sibling category files.
// Explicit imports (vs import.meta.glob) chosen for tsx compatibility:
// the test runner and prebuild script both run under tsx, which does
// not implement import.meta.glob. Consumers (blog-posts, internal-links,
// [lang]/index.astro, [slug].astro) continue to work unchanged.
import { tools as saas } from './saas';
import { tools as aiCost } from './ai-cost';
import { tools as valuation } from './valuation';
import { tools as freelance } from './freelance';
import { tools as cost } from './cost';
import { tools as investment } from './investment';
import { tools as realEstate } from './real-estate';
import { tools as marketing } from './marketing';
import { tools as operations } from './operations';
import { tools as sales } from './sales';
import { tools as retention } from './retention';
import { tools as productAnalytics } from './product-analytics';
import { tools as hiringTeam } from './hiring-team';
import { tools as customerSupport } from './customer-support';
import { tools as knowledge } from './knowledge';
import { tools as legalCompliance } from './legal-compliance';

export const tools: ToolMeta[] = [
  ...saas,
  ...aiCost,
  ...valuation,
  ...freelance,
  ...cost,
  ...investment,
  ...realEstate,
  ...marketing,
  ...operations,
  ...sales,
  ...retention,
  ...productAnalytics,
  ...hiringTeam,
  ...customerSupport,
  ...knowledge,
  ...legalCompliance,
];

export type { ToolMeta };

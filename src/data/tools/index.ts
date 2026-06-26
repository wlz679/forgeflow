import type { ToolMeta } from './types';

// Auto-aggregate all ToolMeta entries from sibling category files.
// import.meta.glob is Vite/Astro-native: zero maintenance, zero runtime cost.
// Side effect of each sibling file is a top-level `export const tools: ToolMeta[] = [...]`.
// `index.ts` itself doesn't export `tools` named, so it is naturally filtered out.
const modules = import.meta.glob<{ tools?: ToolMeta[] }>('./*.ts', { eager: true });

export const tools: ToolMeta[] = Object.values(modules)
  .filter((m): m is { tools: ToolMeta[] } => Array.isArray(m.tools))
  .flatMap(m => m.tools);

export type { ToolMeta };

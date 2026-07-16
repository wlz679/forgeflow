export interface ToolInput {
  name: string;
  label: string;
  placeholder: string;
  type: 'text' | 'select' | 'number';
  options?: string[];
}

export interface ClientConfig {
  type: 'templates' | 'combinations' | 'custom';
  templates?: string[];
  patterns?: string[];
  wordPools: Record<string, string[]>;
  customFn?: string; // JS function body for type='custom', receives (inputs, pick, fill)
}

export interface ToolEngine {
  slug: string;
  title: string;
  description: string;
  inputs: ToolInput[];
  clientConfig: ClientConfig;
  generate(inputs: Record<string, string>): string[];
  staticExamples: string[];
  faq: { q: string; a: string }[];
  howToUse: string[];
  dataLastUpdated?: string; // ISO date (YYYY-MM-DD) — shown as a "pricing data" badge for dynamic calculators
  /** Set true when all engine-level i18n keys (input.{name}.label|placeholder, faq.{i}.q|a,
   *  how_to_use.{i}) are present in src/i18n/translations.ts. Validated by
   *  scripts/check-i18n-completeness.mjs. Default false (legacy engines).
   *  New engines SHOULD set this after translating all keys. */
  engineKey?: boolean;
}

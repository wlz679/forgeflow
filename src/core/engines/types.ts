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
}

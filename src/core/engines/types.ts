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

/**
 * One-click preset that fills a calculator's inputs from a button click.
 * Rendered as a chip at the top of the form (above inputs) when `presets`
 * is set on the engine. Currently used by AI Cost v3 (4 calcs).
 */
export interface Preset {
  /** Lookup key for i18n label via t(`tools.${slug}.preset.${key}`, lang) */
  key: string;
  /** Emoji prefix displayed before the label (e.g. '💼') */
  emoji: string;
  /** input.name → value. Component converts camelCase → kebab-case for HTML data-attr */
  fields: Record<string, string | number>;
}

export interface ToolEngine {
  slug: string;
  title: string;
  description: string;
  category: string;
  inputs: ToolInput[];
  clientConfig: ClientConfig;
  generate(inputs: Record<string, string>): string[];
  staticExamples: string[];
  faq: { q: string; a: string }[];
  howToUse: string[];
  dataLastUpdated?: string; // ISO date (YYYY-MM-DD) — shown as a "pricing data" badge for dynamic calculators
  /** Optional preset chips rendered at top of form */
  presets?: Preset[];
}

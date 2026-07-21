export interface ToolInput {
  name: string;
  label: string;
  /** Optional placeholder. Select-type inputs (9 across 7 engines — P53 P1) don't need one. */
  placeholder?: string;
  type: 'text' | 'select' | 'number';
  /** Allow both legacy string-array and value/label-pair forms.
   *  Customer Health Score (Agent A P1) uses {value,label} for human-readable
   *  selects; most other engines use string[]. Union is non-breaking. */
  options?: ({ value: string; label: string } | string)[];
  /** Default value for the input. string or number depending on `type`. */
  default?: string | number;
  /** HTML5 number-input attrs (only when type='number'). */
  min?: number;
  max?: number;
  step?: number;
  /** Human-readable hint shown next to the input. */
  hint?: string;
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

  // EEAT/metadata fields (P53 expansion — closes Agent A P1 dead-field class).
  // Most engines don't set these; they are here to typecheck the 19+ engines
  // (customer-support 6 + knowledge 6 + hiring-team 6 + legal-compliance 6 +
  // customer-health-score × all P-series metadata additions) whose literals
  // already include them. Optional to keep migration non-breaking.
  /** Source list. Items may be a bare URL string (legacy/most engines) or a
   *  {label, url} object (renewal-rate-calculator — P53 P1, human-readable labels). */
  sources?: ({ label: string; url: string } | string)[];
  categoryId?: string;
  applicationCategory?: string;
  keywords?: string[];
  tags?: string[];
  reviewedBy?: string;
  author?: string;
  dataReviewedAt?: string;
  /** Default values keyed by input.name. Some legacy engines use a single
   *  string `default: 'X'` at ToolInput — kept there; this is a separate
   *  engine-level bag of per-input overrides. Optional. */
  defaults?: Record<string, string | number>;
}
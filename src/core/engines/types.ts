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

import type { PlaybookMetadata } from './metadata';

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
  inputs: ToolInput[];
  clientConfig: ClientConfig;
  generate(inputs: Record<string, string>): string[];
  /** Legacy/historical alias for `generate`. Most engines declare BOTH
   *  (`calculate` as the named function + `generate: calculate` as the
   *  type-aligned bridge) — kept for backward compat. New engines can
   *  declare just `generate` (preferred). Both have identical signatures.
   *  P53 P1 Critical Batch: closed 25 TS2353 errors across marketing (8) +
   *  operations (6) + retention (5) + sales (6) by adding this field. */
  calculate?: (inputs: Record<string, string>) => string[];
  /** Semantic version string for the engine (e.g. '1.0.0'). Renewal Rate
   *  Calculator (P9-6) was the first to declare this — keeps room for
   *  future engines to ship versioned revisions. P53 P1 Critical Batch. */
  version?: string;
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
  /** Human-readable category name (e.g., 'retention'). Distinct from `categoryId`
   *  (the 1-letter code, e.g., 'R'). Optional — most engines don't set it. */
  category?: string;
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
  // P140f-p3 NEW: Playbook 6 字段 metadata (P140f §4.3 Phase 3)
  // optional 向后兼容 100 现有 engine; T2-T7 渐进填充
  /** 6 字段 Playbook metadata (Goal / Input / Output / Constraint / Tool / Memory).
   *  Goal 字段必填且含"决策/decision/该不该/是否"关键词 — v2.0 Decision Support 灵魂落地。 */
  playbook?: PlaybookMetadata;

  /** P151: Optional preset chips rendered at top of form. When set, page
   *  renders one button per preset that fills inputs from `preset.fields`.
   *  Component converts camelCase → kebab-case for HTML data-attr. */
  presets?: Preset[];
}

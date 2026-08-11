// =====================================================================
// P141-B1-T4: Shared health band → emoji lookup table
// =====================================================================
//
// Replaces the per-engine nested ternary pattern:
//   const healthEmoji = band === 'excellent' ? '🟢'
//                     : band === 'good' ? '🟡'
//                     : band === 'warning' ? '🟠'
//                     : '🔴';
//
// with a shared `Record<BandKey, string>` lookup. The canonical 4-tier scheme
// (excellent/good/warning/critical) is used by most engines:
//   operations/* (6), retention/* (5), sales/* (6), product-analytics/* (6),
//   ai-cost/* (8 via codegen), plus others.
//
// Engines with non-standard tier shapes keep a local emoji table:
//   - coupon-attribution-calculator: 3-tier {good, warning, critical}
//     (CLAUDE.md "Hard-breakpoint exemption" — ROI=100% has no fuzzy middle).
//   - cart-abandonment-cost-calculator: 4-tier with 'caution' alias instead of 'excellent'.
//
// this file is data-only — no runtime logic, no engine imports. Engines register
// their own emoji table (via BAND_META or local map) and look up directly.
// =====================================================================

/**
 * Canonical 4-tier health-band → emoji mapping.
 *
 * Used by the 16+ engines whose calcHealthBand() returns one of:
 *   `'excellent' | 'good' | 'warning' | 'critical'`
 *
 * Engines with non-standard tier names (e.g. `'caution'` or 3-band subset)
 * keep their own local emoji table — see files for examples.
 */
export const BAND_META = {
  excellent: '🟢',
  good:      '🟡',
  warning:   '🟠',
  critical:  '🔴',
} as const;

/** Type-safe alias for the keys of {@link BAND_META}. */
export type BandKey = keyof typeof BAND_META;

/**
 * Look up the band emoji for a canonical 4-tier band key.
 *
 * Function form is provided for symmetry with future helpers (getBandLabel,
 * getBandTip) that may be added if engines converge on a shared label/tip
 * vocabulary. For now the direct `BAND_META[band]` lookup is equally valid
 * and slightly more idiomatic in TS — both are accepted.
 */
export const getBandEmoji = (band: BandKey): string => BAND_META[band];

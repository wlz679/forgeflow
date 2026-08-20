// P140c-T1: Tier assignments for the 100 calculators × 2 langs = 200 prose
// files shipped in P140b (2026-08-04). Tier-1 = 15 hand-written anchors
// (1 per category letter); Tier-2 = 35 mid-priority; Tier-3 = 50 remaining.
//
// Adjustments from plan (verifier-pass-1, 2026-08-18): 11 plan slugs did not
// exist under src/data/tools/*.ts and were substituted with the closest
// existing engine slug in the same category to preserve design intent:
//   Tier-1: H ramp-time-calculator        → productivity-ramp-curve-calculator
//           L gdpr-fine-risk-calculator   → gdpr-fine-calculator
//           P funnel-conversion-calculator→ funnel-step-calculator
//           T cost-per-ticket-calculator  → cost-per-support-ticket-calculator
//   Tier-2: A arr-multiple-calculator     → arr-multiple-valuation-calculator
//           B ai-image-generation-cost    → ai-image-cost
//           C ltv-cac-calculator + cac-payback-period-calculator
//             (both stale) → ltv-calculator + unit-economics-calculator
//           E productivity-score-calculator → productivity-score (no suffix)
//           L dsar-processing-cost-calculator → dsar-cost-calculator
//           L cookie-consent-revenue-calculator → consent-revenue-impact-calculator
//           O inventory-carrying-cost-calculator → carrying-cost-calculator
//           +2 B/C tier-2 additions (gpu-cloud-cost-calculator, cac-calculator)
//            to meet plan-declared count of 35 (listed enumeration only had 33).

export const TIER_1_SLUGS: string[] = [
  'solopreneur-mrr-calculator',                          // A
  'solopreneur-openai-token-calculator',                 // B
  'solopreneur-saas-valuation-calculator',               // C
  'solopreneur-freelance-rate-calculator',               // D
  'solopreneur-employee-cost-calculator',                // E
  'solopreneur-mortgage-calculator',                     // F
  'solopreneur-productivity-ramp-curve-calculator',      // H (was solopreneur-ramp-time-calculator)
  'solopreneur-kb-coverage-rate-calculator',             // K
  'solopreneur-gdpr-fine-calculator',                    // L (was solopreneur-gdpr-fine-risk-calculator)
  'solopreneur-roas-calculator',                         // M
  'solopreneur-inventory-turnover-calculator',           // O
  'solopreneur-funnel-step-calculator',                  // P (was solopreneur-funnel-conversion-calculator)
  'solopreneur-nrr-calculator',                          // R
  'solopreneur-pipeline-value-calculator',               // S
  'solopreneur-cost-per-support-ticket-calculator',      // T (was solopreneur-cost-per-ticket-calculator)
];

export const TIER_2_SLUGS: string[] = [
  // A (SaaS Metrics) — 1 mid-priority (2 promoted to Tier 1 extension in P140f-B2 wave A)
  'solopreneur-churn-rate-calculator',
  // B (AI Cost) — 2 mid-priority (2 promoted to Tier 1 extension in P140f-B2 wave B)
  'solopreneur-claude-api-cost-calculator',
  'solopreneur-deepseek-api-cost-calculator',
  // C (Valuation) — 4 mid-priority
  'solopreneur-equity-dilution-calculator',
  'solopreneur-ltv-calculator',                          // was solopreneur-ltv-cac-calculator
  'solopreneur-unit-economics-calculator',               // was solopreneur-cac-payback-period-calculator
  'solopreneur-cac-calculator',                          // C+1 over plan to meet 35 count
  // D (Freelance) — 2
  'solopreneur-project-profitability-calculator',
  'solopreneur-saas-pricing-planner',
  // E (Cost) — 2
  'solopreneur-meeting-cost-calculator',
  'solopreneur-productivity-score',                      // was solopreneur-productivity-score-calculator
  // F (Investment) — 2
  'solopreneur-compound-interest-calculator',
  'solopreneur-cap-rate-calculator',
  // H (Hiring) — 2
  'solopreneur-fully-loaded-employee-cost-calculator',
  'solopreneur-attrition-cost-calculator',
  // K (Knowledge) — 2
  'solopreneur-article-freshness-calculator',
  'solopreneur-search-effectiveness-calculator',
  // L (Legal) — 2
  'solopreneur-dsar-cost-calculator',                    // was solopreneur-dsar-processing-cost-calculator
  'solopreneur-consent-revenue-impact-calculator',       // was solopreneur-cookie-consent-revenue-calculator
  // M (Marketing) — 2
  'solopreneur-ltv-by-channel-calculator',
  'solopreneur-email-campaign-roi-calculator',
  // O (Ops) — 2
  'solopreneur-carrying-cost-calculator',                // was solopreneur-inventory-carrying-cost-calculator
  'solopreneur-reorder-point-calculator',
  // P (Product) — 2
  'solopreneur-feature-adoption-calculator',
  'solopreneur-stickiness-calculator',
  // R (Retention) — 2
  'solopreneur-grr-calculator',
  'solopreneur-customer-health-score-calculator',
  // S (Sales) — 2
  'solopreneur-sales-velocity-calculator',
  'solopreneur-acv-calculator',
  // T (Support) — 2
  'solopreneur-first-response-time-calculator',
  'solopreneur-resolution-time-calculator',
];

// Tier-3 (50) — remaining 50 engines (100 - 15 - 35 = 50). Derived as
// complement of TIER_1_SLUGS ∪ TIER_2_SLUGS over src/data/tools/*.ts.
export const TIER_3_SLUGS: string[] = [
  'solopreneur-market-size-estimator',                   // A (mid-priority flagged for hand-review)
  'solopreneur-gemini-api-cost-calculator',              // B (mid-priority flagged for hand-review)
  'solopreneur-activation-rate-calculator',              // P
  'solopreneur-affiliate-income-calculator',             // D
  'solopreneur-ai-api-cost-comparison',                  // B
  'solopreneur-ai-training-cost-estimator',              // B
  'solopreneur-article-helpfulness-calculator',          // K
  'solopreneur-breach-notification-cost-calculator',     // L
  'solopreneur-break-even-calculator',                   // C
  'solopreneur-brrrr-calculator',                        // F
  'solopreneur-burn-multiple-rule-of-40-calculator',     // C
  'solopreneur-cart-abandonment-cost-calculator',        // M
  'solopreneur-cmp-roi-calculator',                      // L
  'solopreneur-cohort-retention-calculator',             // M
  'solopreneur-comp-banding-calculator',                 // H
  'solopreneur-content-marketing-roi-calculator',        // M
  'solopreneur-coupon-attribution-calculator',           // M
  'solopreneur-course-pricing-calculator',               // D
  'solopreneur-csat-calculator',                        // T
  'solopreneur-deflection-quality-calculator',           // K
  'solopreneur-deflection-rate-calculator',              // T
  'solopreneur-documentation-roi-calculator',            // K
  'solopreneur-dpa-cost-calculator',                     // L
  'solopreneur-dscr-calculator',                         // F
  'solopreneur-email-list-revenue-calculator',           // D
  'solopreneur-equity-refresh-calculator',               // H
  'solopreneur-expansion-revenue-calculator',            // R
  'solopreneur-freelance-tax-calculator',                // F
  'solopreneur-fulfillment-cost-calculator',             // O
  'solopreneur-funnel-value-calculator',                 // M
  'solopreneur-hourly-vs-fixed-calculator',              // D
  'solopreneur-logo-churn-rate-calculator',              // R
  'solopreneur-pipeline-coverage-calculator',            // S
  'solopreneur-power-user-curve-calculator',             // P
  'solopreneur-quota-attainment-calculator',             // S
  'solopreneur-remote-vs-office-calculator',             // E
  'solopreneur-renewal-rate-calculator',                 // R
  'solopreneur-rent-vs-buy-calculator',                  // F
  'solopreneur-rental-yield-calculator',                 // F
  'solopreneur-revenue-projector',                       // A
  'solopreneur-safe-convertible-note-calculator',        // C
  'solopreneur-sponsorship-rate-calculator',             // F
  'solopreneur-stockout-cost-calculator',                // O
  'solopreneur-stripe-fee-calculator',                   // C
  'solopreneur-supplier-scorecard-calculator',           // O
  'solopreneur-support-capacity-planning-calculator',    // T
  'solopreneur-time-to-productivity-calculator',         // H
  'solopreneur-time-to-value-calculator',                // P
  'solopreneur-time-value-calculator',                   // F
  'solopreneur-win-rate-by-stage-calculator',            // S
];

export function getTier(slug: string): 1 | 2 | 3 {
  if (TIER_1_SLUGS.includes(slug)) return 1;
  if (TIER_2_SLUGS.includes(slug)) return 2;
  return 3;
}

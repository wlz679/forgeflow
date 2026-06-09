/**
 * Reference data that may need periodic updates (monthly/quarterly).
 * Update the `updated` field when values change.
 *
 * To update: search for current market rates, platform policies, and industry benchmarks,
 * then update the relevant section and rebuild.
 */

export const REFERENCE = {
  updated: '2026-06-06',

  /** Freelance hourly rates in USD (mid-level, US market) */
  freelanceRates: {
    developer: { junior: 50, mid: 85, senior: 140, expert: 200 },
    designer: { junior: 40, mid: 70, senior: 110, expert: 160 },
    writer: { junior: 30, mid: 55, senior: 90, expert: 130 },
    marketer: { junior: 35, mid: 65, senior: 100, expert: 150 },
    consultant: { junior: 60, mid: 100, senior: 175, expert: 250 },
  },

  /** Typical SaaS industry benchmarks */
  saasBenchmarks: {
    avgMonthlyChurn: 0.05,       // 5% monthly churn
    avgAnnualChurn: 0.40,        // 40% annual churn
    avgCPLConsumer: 2.50,        // avg cost per lead (consumer SaaS)
    avgCPLB2B: 25,               // avg cost per lead (B2B SaaS)
    avgConversionTrial: 0.08,    // 8% trial-to-paid
    avgConversionFreemium: 0.04, // 4% freemium-to-paid
  },

  /** Common SaaS pricing tiers */
  pricingTiers: {
    starter: { range: '$9-$29/mo', typicalFeatures: 5 },
    pro: { range: '$29-$99/mo', typicalFeatures: 15 },
    business: { range: '$99-$299/mo', typicalFeatures: 30 },
    enterprise: { range: '$299-$999+/mo', typicalFeatures: 'unlimited' },
  },

  /** Platform revenue shares (approximate) */
  platformRevenueShare: {
    appStore: 0.30,
    googlePlay: 0.30,
    stripe: 0.029,      // 2.9% + $0.30
    gumroad: 0.10,
    paddle: 0.05,       // 5% + $0.50
    productHunt: 0,     // free to launch
  },
} as const;

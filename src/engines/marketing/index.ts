// P6 marketing-analytics category — incrementally populated by P6-1..P6-6 tasks
// P6-1 roas-calculator.ts                -- added in P6-1
// P6-2 ltv-by-channel-calculator.ts      -- added in P6-2
// P6-3 funnel-value-calculator.ts        -- added in P6-3
// P6-4 cohort-retention-calculator.ts    -- added in P6-4
// P6-5 email-campaign-roi-calculator.ts  -- added in P6-5
// P6-6 content-marketing-roi-calculator.ts -- added in P6-6
// P16-1 coupon-attribution-calculator.ts -- added in P16-1
// P16-2 cart-abandonment-cost-calculator.ts -- added in P16-2
// P53: refactored from `export *` to `import './X'` (side-effect only) to
// resolve 9 duplicate-export TS errors (Agent D P2 D7). All engines' helpers
// (e.g., HEALTH_BANDS, calcHealthBand) remain exported from individual files
// (e.g., `import { calcHealthBand } from './cohort-retention-calculator'`).
import './roas-calculator';
import './ltv-by-channel-calculator';
import './funnel-value-calculator';
import './cohort-retention-calculator';
import './email-campaign-roi-calculator';
import './content-marketing-roi-calculator';
import './coupon-attribution-calculator';
import './cart-abandonment-cost-calculator';

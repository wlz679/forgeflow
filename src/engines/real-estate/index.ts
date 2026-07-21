// P5 real-estate category — incrementally populated by P5-1..P5-6 tasks
// P5-1 mortgage-calculator.ts      -- added in P5-1 (commit e5e55be+)
// P5-2 rent-vs-buy-calculator.ts   -- added in P5-2
// P5-3 cap-rate-calculator.ts      -- added in P5-3
// P5-4 rental-yield-calculator.ts  -- added in P5-4
// P5-5 brrrr-calculator.ts         -- added in P5-5
// P5-6 dscr-calculator.ts          -- added in P5-6 (FINAL)
// P53: refactored from `export *` to `import './X'` (side-effect only) to
// resolve 4 duplicate-export TS errors (Agent D P2 D7).
import './mortgage-calculator';
import './rent-vs-buy-calculator';
import './cap-rate-calculator';
import './rental-yield-calculator';
import './brrrr-calculator';
import './dscr-calculator';

// Aggregate all engines from 7 subdirectories.
// Explicit imports (vs import.meta.glob) chosen for tsx compatibility:
// the test runner (tests/run.mjs) and prebuild script (scripts/build-og-images.ts)
// both run under tsx, which does not implement import.meta.glob. Astro pages
// also work fine with static imports.
import './saas';
import './ai-cost';
import './valuation';
import './freelance';
import './cost';
import './investment';
import './real-estate';

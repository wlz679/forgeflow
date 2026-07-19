#!/usr/bin/env node
// P23b: opt-in wrapper for build-dependent tests. Sets RUN_BUILD_TESTS=1
// so the 5 build-dependent test files (baselayout-clerk-script,
// baselayout-sync-script, header-clerk-render, header-sync-ui,
// privacy-policy-sync) participate. Use via `pnpm test:build` or
// `node scripts/test-build.mjs` from project root.
process.env.RUN_BUILD_TESTS = '1';
await import('../tests/run.mjs');

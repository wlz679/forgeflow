// Single source of truth for "which test suites are build-dependent".
//
// P153: this list used to be a hardcoded console.log in tests/run.mjs, and
// the claude-md-invariant-guard used to PARSE that printed list to learn
// the build-dep count. Two consequences, both bad:
//
//   1. The hardcoded copy drifted in both directions (it named deleted
//      blog-* suites, suites that are no longer gated, and omitted suites
//      that really are gated) — see P153-G1/E1.
//   2. When E1 made the list COMPUTED, the guard's parser found no
//      console.log('[skip-mode]   a, b, c') literal any more and read the
//      count as 0.
//
// So the answer is computed from the test sources — the same rule both
// places must agree on — and both places call THIS function.
import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist']);

/** Recursively collect every *.test.ts / *.test.mjs under tests/. */
export function walkTestSuites(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && /\.test\.(ts|mjs)$/.test(entry.name)) out.push(full);
    }
  };
  walk(resolve(root, 'tests'));
  return out;
}

/** Strip block comments and line comments (a `//` that follows `:` is a URL). */
export function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * The build-dependent suite names, relative to tests/ and sorted.
 * A suite is build-dependent iff its SOURCE mentions process.env.RUN_BUILD_TESTS
 * outside of comments.
 */
export function computeBuildDepSuites(root) {
  return walkTestSuites(root)
    .filter((f) => stripComments(readFileSync(f, 'utf8')).includes('process.env.RUN_BUILD_TESTS'))
    .map((f) => relative(root, f).replaceAll('\\', '/').replace(/^tests\//, ''))
    .sort();
}

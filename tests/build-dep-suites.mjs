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

/**
 * Strip block comments and line comments (a `//` that follows `:` is a URL).
 *
 * P153: the previous implementation was two regexes:
 *
 *     src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
 *
 * The block-comment regex is non-greedy, so it pairs the FIRST block-comment
 * opener it sees with the NEXT closing delimiter. A block-comment opener
 * that appears INSIDE a comment body — e.g. a tools-glob path written in a
 * JSX comment in src/pages/[lang]/[slug].astro — became a comment start,
 * and the span it swallowed ran on to a much later closing delimiter.
 * Measured: **40,718 characters** were swallowed that way, and the span
 * contained the `t('engine_cost.comparison_title')` /
 * `t('engine_cost.reqs_per_day')` call sites. A guard that cannot see
 * those call sites cannot notice a missing key there — it was blind in
 * exactly the place P153 §7.10 shipped a production defect.
 *
 * (This docblock is itself a live example of the trap: writing the closing
 * delimiter literally in prose ends the comment early and the rest of the
 * sentence is parsed as code. It happened while writing this comment.)
 *
 * This is a scanner, not a regex: it walks the source once and tracks
 * string literals, so a comment marker inside a string is not mistaken for
 * a comment. Line comments keep the old "not preceded by a colon" rule so a
 * URL in prose (http://…) is not truncated.
 */
export function stripComments(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    // Line comment — but not the "//" of a URL (that is preceded by ':').
    if (c === '/' && src[i + 1] === '/' && src[i - 1] !== ':') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    // Block comment.
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i = Math.min(i + 2, n);
      continue;
    }
    // String literal — copied verbatim so a comment marker inside it is safe.
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      out += c;
      i++;
      while (i < n) {
        if (src[i] === '\\') {
          out += src[i] + (src[i + 1] ?? '');
          i += 2;
          continue;
        }
        out += src[i];
        if (src[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    out += c;
    i++;
  }
  return out;
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

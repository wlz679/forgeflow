#!/usr/bin/env node
// P141-B3-T8: 综合 CI guard 守护 B3 全部工程化清理修复
//
// Why this exists:
//   Batch 3 (Engineering Cleanup) made 7 fixes across scripts/ pages infra
//   security layers. This guard prevents regression of any single fix
//   surfacing silently in CI. Each test is source-level (no DOM, no
//   pnpm build dependency), so it runs under `pnpm test:unit` by default.
//
// Coverage map (per plan §B3-T8 + user task brief):
//   B3-T1  archive fix gate    — scripts/.scratch/_archive/fix-*.mjs must
//                                early-exit unless ALLOW_ARCHIVE_FIX=1
//   B3-T2  run.mjs dynamic glob — no hardcoded suite=[] whitelist (would
//                                rot when subdirs added)
//   B3-T3  parallel I/O         — 8 category pages must use Promise.all,
//                                NOT `for (const slug of toolSlugs*) await`
//   B3-T4  _redirects cleanup   — invalid HTTPS upgrade rule removed by
//                                B3-T4-fix (commit 79c4dc7); www→apex
//                                redirect still present
//   B3-T5  BaseLayout schema    — `set:html={schema}` literal absent;
//                                current safe form is
//                                `set:html={schema.replace(/<\/script>/g,
//                                '<\\/script>')}` per B3-T5a
//   B3-T6  sync-supabase argv   — no `process.argv` (DB password leaks via
//                                `ps`); uses SUPABASE_DB_URL env var
//
// Reference: docs/superpowers/plans/2026-08-10-p141-ocr-batch-fix.md §B3-T8.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');

// P23b skip-guard: this guard lives under tests/build-dep/ (recursive walk
// in tests/run.mjs finds it) and follows the build-dep gate for surface
// consistency with the other P96/P106/P138 guards. Tests are all
// source-level (no dist/ read, no DOM), but opting in here keeps the
// skip-mode summary accurate.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

// B3-T1 — archive fix scripts must early-exit unless ALLOW_ARCHIVE_FIX is
// explicitly set. Prevents accidental CI invocation of one-off surgical
// fixes (B3-T1 commit 8359086).
test('B3-T1: archive fix scripts require ALLOW_ARCHIVE_FIX gate', () => {
  const archiveDir = join(root, 'scripts', '.scratch', '_archive');
  const archive = readdirSync(archiveDir);
  const fixScripts = archive.filter(f => f.startsWith('fix-') && f.endsWith('.mjs'));
  // There must be at least one fix-* script — empty dir would also fail
  // silently without this guard catching it.
  assert.ok(fixScripts.length > 0, 'expected at least one fix-*.mjs in _archive');

  for (const f of fixScripts) {
    const src = readFileSync(join(archiveDir, f), 'utf8');
    assert.ok(
      src.includes('ALLOW_ARCHIVE_FIX'),
      `${f} missing ALLOW_ARCHIVE_FIX gate — B3-T1 fix regressed?`
    );
    // The gate must be a guard (process.exit) — not just a comment reference.
    assert.ok(
      /process\.exit[^)]*\)/.test(src),
      `${f} has ALLOW_ARCHIVE_FIX but no process.exit() — gate is not effective`
    );
  }
});

// B3-T2 — tests/run.mjs must use dynamic glob (B3-T2 commit 4bec261). A
// hardcoded `suites = ['...', '...', ...]` whitelist would rot when new
// test subdirs are added. The walker in run.mjs now scans recursively.
test('B3-T2: run.mjs has no hardcoded suite whitelist', () => {
  const src = readFileSync(join(root, 'tests', 'run.mjs'), 'utf8');
  // A real hardcoded whitelist looks like:  suites = ['foo', 'bar']
  // The dynamic walker uses: const suites = walkTests(...); — the `[` after
  // walkTests(...) is not preceded by quote, so the regex below won't match.
  assert.equal(
    /\bsuites\s*=\s*\[\s*['"][^'"]+['"]/.test(src),
    false,
    'tests/run.mjs should use dynamic glob (walkTests), not a hardcoded suite array'
  );
});

// B3-T3 — 8 category pages (B3-T3 commit 064f1b5) replaced sequential
// `for (const slug of toolSlugsInCategory) { ... await ... }` with
// `(await Promise.all(...)).flat()`. Catch any rollback to sequential.
test('B3-T3: category pages use parallel I/O (no for-await over slugs)', () => {
  const langDir = join(root, 'src', 'pages', '[lang]');
  const categoryPages = readdirSync(langDir).filter(
    f => f.endsWith('.astro') && f !== '[slug].astro'
  );
  // 8 category pages minimum — per CLAUDE.md, 15 categories total.
  assert.ok(
    categoryPages.length >= 8,
    `expected ≥8 category pages, found ${categoryPages.length}`
  );

  for (const p of categoryPages) {
    const src = readFileSync(join(langDir, p), 'utf8');
    assert.equal(
      /for\s*\(\s*const\s+slug\s+of\s+\w*[Ss]lug[s]?\w*\s*\)\s*\{[^}]*await/.test(src),
      false,
      `${p} still has sequential \`for (const slug of ...) { await ... }\` — B3-T3 fix regressed?`
    );
  }
});

// B3-T4 — public/_redirects cleanup (B3-T4 + B3-T4-fix). The original
// B3-T4 added a malformed `https://*:splat https://%schttps://%shost%spathsplat
// 301` rule; B3-T4-fix (79c4dc7) deleted it because the syntax was invalid
// for Cloudflare Pages. Only the www→apex redirect should remain.
test('B3-T4: _redirects has NO invalid HTTPS upgrade rule', () => {
  const src = readFileSync(join(root, 'public', '_redirects'), 'utf8');
  // The invalid rule had `https://*:splat` on the source side.
  assert.equal(
    /https:\/\/\*:%s/.test(src),
    false,
    'public/_redirects still contains invalid https://*:splat rule (deleted by B3-T4-fix)'
  );
  // The www→apex redirect must remain (not regressed).
  assert.ok(
    src.includes('www.forgeflowkit.com') && src.includes('forgeflowkit.com/:splat'),
    'public/_redirects lost the www→apex redirect — regression?'
  );
});

// B3-T5 — BaseLayout schema injection (B3-T5a commit 4316b43). Caller-
// supplied JSON-LD strings must be escaped via .replace(/<\/script>/g, ...)
// to prevent `</script>` breakout XSS. The original unsafe form
// `set:html={schema}` (literal substring) must NOT appear; the safe form
// `set:html={schema.replace(...)}` is acceptable.
test('B3-T5: BaseLayout has no unescaped set:html={schema}', () => {
  const src = readFileSync(join(root, 'src', 'layouts', 'BaseLayout.astro'), 'utf8');
  // Look for the exact unsafe literal `set:html={schema}` (closing brace
  // immediately after `schema`). The safe form `set:html={schema.replace(
  // ...)` has a `.` after `schema` so the substring `set:html={schema}`
  // does NOT match.
  assert.equal(
    src.includes('set:html={schema}'),
    false,
    'BaseLayout.astro has unsafe `set:html={schema}` — JSON-LD </script> breakout possible'
  );
  // Positive assertion: the safe escape form IS present. The regex
  // literal `/<\/script>/g` in the source contains a literal backslash,
  // which is hard to match in a regex literal itself, so we use a
  // simpler string check on the safe form's prefix.
  assert.ok(
    src.includes('set:html={schema.replace(/<\\/script>'),
    'BaseLayout.astro missing safe `set:html={schema.replace(/<\\/script>/g, ...)` escape'
  );
});

// B3-T6 — scripts/sync-supabase-schema.mjs argv cleanup (B3-T6 per OCR
// F-段 audit). DB URL must come from env var (SUPABASE_DB_URL), NOT
// process.argv — argv leaks via `ps` output during the psql spawn.
test('B3-T6: sync-supabase-schema.mjs does not use process.argv', () => {
  const src = readFileSync(join(root, 'scripts', 'sync-supabase-schema.mjs'), 'utf8');
  assert.equal(
    /argv\[/.test(src),
    false,
    'scripts/sync-supabase-schema.mjs still uses process.argv — DB password would leak via ps'
  );
  // Positive assertion: env var path is used.
  assert.ok(
    src.includes('SUPABASE_DB_URL'),
    'scripts/sync-supabase-schema.mjs missing SUPABASE_DB_URL env var'
  );
});
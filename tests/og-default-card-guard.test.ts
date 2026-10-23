#!/usr/bin/env node
// P153-B′ — CI guard for the DEFAULT social-preview card.
//
// Why this exists:
//   Until 2026-10-22, `public/og-default.png` was a 1×1 transparent PNG —
//   68 bytes. The 2026-06-25 SEO round created it deliberately as a
//   placeholder ("1×1 transparent PNG placeholder (BaseLayout default
//   ogImage until Plan B ships real images)") and Plan B never shipped.
//
//   The failure mode this guard exists to prevent is NOT a 404. A 1×1 PNG is
//   a valid image that returns HTTP 200, so every scraper rendered a BLANK
//   card: 237 non-tool pages (home / category / guide / compare / about /
//   terms / 404) shared a social preview with no visible content, and the
//   Article JSON-LD `image` on 98 guide/compare pages pointed at a blank
//   pixel. Nothing in the stack reported it — the URL was 200, the MIME
//   type was right, and no monitor looked at the pixels.
//
//   Two classes of regression are guarded here:
//     1. The card degrading back into a placeholder (dimensions, size).
//     2. The card existing only on a developer's machine. `public/og/` (the
//        200 per-tool cards) is gitignored build output, so a fresh checkout
//        has none of it — that is exactly how the 200 tool pages ended up
//        404ing in production while every local build looked fine (P153
//        §7.15). The brand cards are TRACKED precisely to avoid that fate,
//        and this guard asserts the tracking.
//
// Build dependency: NONE. Everything asserted here is a tracked file, so the
//   guard runs in a fresh CI checkout with no build step and no dist/.
//   (A guard that can only see a locally-generated artifact cannot protect
//   the artifact from not being generated at all.)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');

// Expected values are hardcoded literals on purpose. Importing them from the
// module under test would make every mutation below pass silently — the
// lesson from the User Value Score guard (P153 §4.5) and the robots
// wildcard assertion (P153 §7.8).
const EXPECTED_WIDTH = 1200;
const EXPECTED_HEIGHT = 630;
const MIN_CARD_BYTES = 10 * 1024; // the placeholder was 68 bytes
const PLACEHOLDER_BYTES = 68;

// The card the layout points at. The English filename is NEW
// (og-default-en.png) on purpose: social platforms cache an og:image BY URL,
// and /og-default.png served a 1×1 transparent PNG until 2026-10-22 — a
// platform that fetched it back then may still be showing a blank card, and
// that cache is not ours to invalidate. A URL no platform has seen is always
// re-fetched.
const EN_CARD = '/og-default-en.png';
const ZH_CARD = '/og-default-zh.png';

// The historical English URL. It is no longer what the layout points at, but
// it is still published (with the same bytes) so that anything already
// linking to it gets a real card instead of a 404 — and so that a platform
// re-fetching it gets the real card rather than the 1×1 blank it used to be.
const LEGACY_EN_CARD = '/og-default.png';

// A card's URL path (`/og-default.png`) and its path on disk
// (`public/og-default.png`) are different things. Astro serves `public/`
// at the site root, so the URL path is the disk path minus the `public/`
// prefix. Keeping both names explicit here stops the two from being
// conflated — the first draft of this guard did exactly that and failed on
// "file does not exist" while the card was sitting right there in public/.
const PUBLIC_DIR = 'public';

/** URL path → repository-relative disk path. */
function diskPath(cardUrl: string): string {
  return `${PUBLIC_DIR}${cardUrl}`;
}

interface PngInfo {
  width: number;
  height: number;
  bytes: number;
}

/** Read a PNG's dimensions from its IHDR chunk (bytes 16-19 = width, 20-23 = height, big-endian). */
function readPng(relPath: string): PngInfo {
  const abs = join(root, relPath);
  assert.ok(existsSync(abs), `${relPath} does not exist`);
  const buf = readFileSync(abs);
  assert.ok(buf.length > 8, `${relPath} is too short to be a PNG (${buf.length} bytes)`);
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  assert.deepEqual(
    [...buf.subarray(0, 8)],
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    `${relPath} is not a PNG (bad signature)`,
  );
  assert.equal(buf.subarray(12, 16).toString('ascii'), 'IHDR', `${relPath} has no IHDR chunk`);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height, bytes: buf.length };
}

/** Is this path tracked by git? A file that exists only on one machine is a bug, not an asset. */
function isTracked(relPath: string): boolean {
  const r = spawnSync('git', ['ls-files', '--error-unmatch', relPath], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return r.status === 0;
}

/** Is this path excluded by .gitignore? Exit 0 from `check-ignore` means "yes, it is ignored". */
function isGitignored(relPath: string): boolean {
  const r = spawnSync('git', ['check-ignore', '-q', relPath], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return r.status === 0;
}

for (const [locale, card] of [
  ['en', EN_CARD],
  ['zh', ZH_CARD],
  // The historical English URL is no longer what the layout points at, but
  // it is still published — so it must satisfy the same contract: a real
  // card, tracked, and not gitignored. If it ever regressed to the 1×1
  // placeholder, every platform that still had it cached would keep showing
  // a blank card.
  ['legacy-en', LEGACY_EN_CARD],
] as const) {
  test(`brand card for ${locale} is a real ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT} image`, () => {
    const info = readPng(diskPath(card));

    // The placeholder check comes FIRST, on purpose. `assert.equal` from
    // node:assert/strict is an assertion function, so TypeScript narrows
    // `info.width` to the literal 1200 after the dimension check below —
    // and a `width === 1` comparison after that narrowing is statically
    // dead code (tsc reports TS2367). The 1×1 case is the regression this
    // whole guard exists for, so it is asserted on its own terms, before
    // any narrowing happens.
    assert.ok(
      !(info.width === 1 && info.height === 1),
      `${diskPath(card)} is a 1x1 pixel placeholder (${info.bytes} bytes). Every social platform ` +
        `renders that as an empty card while every HTTP check reports 200 OK.`,
    );
    assert.equal(
      info.width,
      EXPECTED_WIDTH,
      `${diskPath(card)} is ${info.width}px wide, expected ${EXPECTED_WIDTH}. A 1x1 placeholder is the ` +
        `exact regression this guard was written for — it returns HTTP 200 and renders blank.`,
    );
    assert.equal(
      info.height,
      EXPECTED_HEIGHT,
      `${diskPath(card)} is ${info.height}px tall, expected ${EXPECTED_HEIGHT}.`,
    );
    assert.ok(
      info.bytes > MIN_CARD_BYTES,
      `${diskPath(card)} is only ${info.bytes} bytes (the 1x1 placeholder was ${PLACEHOLDER_BYTES}). ` +
        `A real card is well over ${MIN_CARD_BYTES} bytes.`,
    );
  });

  test(`brand card for ${locale} is tracked by git (not a local-only artifact)`, () => {
    assert.ok(
      isTracked(diskPath(card)),
      `${diskPath(card)} is not tracked by git. The per-tool cards in public/og/ are gitignored ` +
        `build output, which is exactly why 200 tool pages 404 in production while local builds ` +
        `look fine (P153 §7.15). The brand cards must stay tracked.`,
    );
  });

  test(`brand card for ${locale} is not excluded by .gitignore`, () => {
    // The tracked check above is about "is it in the repo right now"; this
    // one is about "can it ever be missing from the repo". They fail in
    // different ways: a brand-new file is untracked until it is added (red
    // on the check above, green here), whereas a .gitignore rule makes the
    // file permanently absent from every checkout — which is precisely how
    // public/og/ lost 200 tool pages in production while every local build
    // looked perfect (P153 §7.15).
    assert.ok(
      !isGitignored(diskPath(card)),
      `${diskPath(card)} is excluded by .gitignore. It would be absent from every fresh ` +
        `checkout, so production would serve a 404 (or, before this card existed, a 1x1 ` +
        `placeholder) while local builds looked fine.`,
    );
  });
}

test('defaultOgImage() maps each locale to its own card', async () => {
  const mod = await import('../src/lib/site-config.ts');
  // Both the expected value and the actual value are literals here: the
  // point of this assertion is that the mapping is what we say it is, not
  // that it agrees with itself.
  // The intent-carrying assertion comes FIRST on purpose. Pointing 'en' back
  // at the historical filename is exactly the regression this guard has to
  // catch, and if the plain equality check ran first it would abort the
  // test before this one could fire — leaving the specific "why" untested
  // and the mutation killed only by a sibling assertion.
  assert.notEqual(
    mod.defaultOgImage('en'),
    LEGACY_EN_CARD,
    "defaultOgImage('en') must NOT point at the historical filename: social platforms cache an " +
      'og:image by URL, and the historical path served a 1x1 blank card until 2026-10-22. ' +
      'Pointing at a URL no platform has seen is what forces a re-fetch.',
  );
  assert.equal(mod.defaultOgImage('en'), EN_CARD, "defaultOgImage('en') must return the English card");
  assert.equal(mod.defaultOgImage('zh'), ZH_CARD, "defaultOgImage('zh') must return the Chinese card");
  assert.notEqual(
    mod.defaultOgImage('en'),
    mod.defaultOgImage('zh'),
    'the two locales must not share one card — the zh card is localised',
  );
});

test('no page template hardcodes a brand-card path', () => {
  // Single source of truth: the locale→card mapping lives in
  // src/lib/site-config.ts. A template that hardcodes a path is a call site
  // that will silently drift the day the filenames change.
  const offenders: string[] = [];
  // src/lib/site-config.ts IS the single source of truth — it is the one
  // place allowed to name a card file. Everything else must call the helper.
  const ALLOWED = 'src/lib/site-config.ts';

  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && /\.(astro|ts|tsx)$/.test(entry.name)) {
        const rel = relative(root, full).replaceAll('\\', '/');
        if (rel === ALLOWED) continue;
        const src = readFileSync(full, 'utf8');
        if (src.includes("'/og-default") || src.includes('"/og-default')) {
          offenders.push(rel);
        }
      }
    }
  }
  walk(join(root, 'src'));

  assert.deepEqual(
    offenders,
    [],
    `these files hardcode a brand-card path instead of calling defaultOgImage():\n  ${offenders.join('\n  ')}\n` +
      `Route them through src/lib/site-config.ts so the mapping stays in one place.`,
  );
});

test('the layout actually uses the shared helper (it is not dead code)', () => {
  const layout = readFileSync(join(root, 'src', 'layouts', 'BaseLayout.astro'), 'utf8');
  assert.ok(
    layout.includes('defaultOgImage('),
    'BaseLayout.astro must resolve its default og:image through defaultOgImage()',
  );
  assert.ok(
    !layout.includes("ogImage = '/og-default"),
    'BaseLayout.astro still hardcodes a brand-card path as its ogImage default',
  );
});

test('the brand card is copied into the build output', () => {
  // `public/` is copied verbatim by Astro, so the card reaches dist/ without
  // any extra wiring. Assert the file is where Astro will pick it up.
  for (const card of [EN_CARD, ZH_CARD, LEGACY_EN_CARD]) {
    const abs = join(root, diskPath(card));
    assert.ok(existsSync(abs), `${diskPath(card)} must exist for Astro to copy it into dist/`);
    assert.ok(statSync(abs).size > MIN_CARD_BYTES, `${diskPath(card)} is too small to be a real card`);
  }
});

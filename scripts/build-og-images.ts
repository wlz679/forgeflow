// Build 64 og:image cards (32 tools x 2 lang) into public/og/.
// Run via `pnpm build:og` (manual) or `prebuild`/`predev` (automatic).
//
// Deviation from spec: satori 0.26's bundled opentype.js cannot parse COLR/CBDT
// color-emoji fonts (NotoColorEmoji.ttf is COLRv1 and fails with "Font doesn't
// contain TrueType or CFF outlines"). The spec listed Noto Color Emoji in the
// fonts array, but it would fail at load time, so:
//   - It is NOT in the `fonts:` array below (no Inter/Noto-Sans-SC equivalent).
//   - It is NOT downloaded by scripts/download-og-fonts.mjs (saves ~10 MB).
// Instead we use satori's documented `graphemeImages` option to substitute
// Twemoji PNGs for the 9 emoji used in og-card.tsx / og-samples.json. CJK
// glyphs are still covered by NotoSansSC-Regular.otf.

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

import { tools } from '../src/data/tools';
import { categories } from '../src/data/categories';
import ogSamplesRaw from '../src/data/og-samples.json';
import { OgCard } from './templates/og-card';
import { OgDefaultCard } from './templates/og-default-card';
import { CATEGORY_PALETTE } from './templates/category-palette';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FONTS_DIR = join(ROOT, 'scripts', 'fonts');
const OUT_DIR = join(ROOT, 'public', 'og');
// Twemoji PNGs are VENDORED in the repo (scripts/fonts/twemoji/), not
// downloaded. They used to be fetched from jsDelivr on every build into
// scripts/.twemoji-cache/ — and because that cache is gitignored, every fresh
// runner started cold, so the build depended on reaching a CDN. A CDN hiccup
// therefore blocked a production deploy outright.
//
// Vendoring makes the build hermetic. The files are byte-for-byte the ones
// the CDN served, so the rendered cards are unchanged. Attribution:
// scripts/fonts/twemoji/LICENSE.txt.
const TWEMOJI_VENDOR_DIR = join(FONTS_DIR, 'twemoji');

const LANGS = ['en', 'zh'] as const;
type Lang = (typeof LANGS)[number];

// P153-B′: the brand cards for every page that has no per-tool image
// (home / category / guide / compare / about / terms / 404 — 237 pages
// measured 2026-10-22). These files are TRACKED in git, unlike public/og/
// which is a gitignored build artifact: that is the whole point, because
// Cloudflare Pages runs `pnpm build` (not `pnpm build:full`) and a tracked
// asset is served regardless of which build command runs.
//
//   public/og-default-en.png → the English card the layout points at.
//
//     The filename is NEW on purpose. Social platforms cache an og:image BY
//     URL, and `/og-default.png` served a 1×1 transparent PNG until
//     2026-10-22 — so any platform that fetched it back then may still be
//     showing a blank card, and that cache is not ours to invalidate. A URL
//     no platform has seen is always re-fetched.
//
//   public/og-default.png    → the historical URL, still generated with the
//     same bytes so it keeps serving a real card instead of 404ing. Keeping
//     it also means anything that already links to it gets the real card.
//
//   public/og-default-zh.png → Chinese card for the zh locale.
const DEFAULT_CARDS: { lang: Lang; file: string }[] = [
  { lang: 'en', file: 'og-default-en.png' },
  { lang: 'en', file: 'og-default.png' },
  { lang: 'zh', file: 'og-default-zh.png' },
];

// CLI flags
const args = new Set(process.argv.slice(2));
const devMode = args.has('--dev');      // only render 1 image
const checkMode = args.has('--check');  // verify all 64 exist, don't write
// P153-B′: render ONLY the brand cards. The 200 per-tool cards take minutes
// to rasterise, so iterating on the brand card without this flag means
// waiting for the whole bundle every time.
const defaultOnly = args.has('--default-only');
const slugArg = [...args].find(a => a.startsWith('--slug='))?.split('=')[1];

interface Sample {
  headline: Record<Lang, string>;
  headlineUnit: Record<Lang, string>;
  headlineLabel: Record<Lang, string>;
  trend?: Record<Lang, string>;
}

const ogSamples = ogSamplesRaw as Record<string, Sample>;

// 9 emoji that appear in og-card.tsx / category-palette.ts / og-samples.json.
// Anything outside this set either falls back to Inter/Noto Sans SC or
// renders as a missing-glyph box. The set is closed; the build fails loudly
// if a new emoji slips in (see assertEmojiSet() below).
const EMOJI_SET = new Set<string>([
  '\u{1F3AC}', // 🎬 logo
  '\u{26A0}️',  // ⚠️ warning
  '\u{2705}', // ✅ check
  '\u{1F4CA}', // 📊 SaaS Metrics
  '\u{1F916}', // 🤖 AI Cost Tools
  '\u{1F48E}', // 💎 Valuation & Exit
  '\u{1F4BC}', // 💼 Freelance Pricing
  '\u{26A1}',  // ⚡ Cost & Efficiency
  '\u{1F4C8}', // 📈 Investment & ROI
  '\u{1F7E0}', // 🟠 orange circle (Health band)
  '\u{1F7E1}', // 🟡 yellow circle (Health band)
  '\u{1F7E2}', // 🟢 green circle (Health band)
]);

function assertEmojiSet(): void {
  const missing: string[] = [];
  const collect = (s: string) => {
    // Match emoji with optional VS16 (FE0F).
    const re = /(?:\p{Extended_Pictographic}(?:️)?)/gu;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) {
      if (!EMOJI_SET.has(m[0])) missing.push(`${m[0]} U+${m[0].codePointAt(0)!.toString(16).toUpperCase()}`);
    }
  };
  for (const e of Object.values(ogSamples)) {
    for (const v of [e.headline.en, e.headline.zh, e.headlineUnit.en, e.headlineUnit.zh, e.headlineLabel.en, e.headlineLabel.zh, e.trend?.en, e.trend?.zh]) {
      if (v) collect(v);
    }
  }
  if (missing.length) {
    throw new Error(`Unmapped emoji in og-samples.json: ${[...new Set(missing)].join(', ')}. Add them to EMOJI_SET in scripts/build-og-images.ts.`);
  }

  // Every emoji in the closed set needs a vendored PNG, otherwise the build
  // would have to reach the network for it — and a build that cannot reach
  // the network fails outright. Name the exact file to add.
  const missingFiles: string[] = [];
  for (const emoji of EMOJI_SET) {
    const cps = [...emoji].map(c => c.codePointAt(0)!.toString(16)).filter(c => c !== 'fe0f');
    const file = `${cps.join('-')}.png`;
    if (!existsSync(join(TWEMOJI_VENDOR_DIR, file))) missingFiles.push(file);
  }
  if (missingFiles.length) {
    throw new Error(
      `Missing vendored twemoji PNG(s) in scripts/fonts/twemoji/: ${missingFiles.join(', ')}\n` +
      `Copy them from https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/72x72/ ` +
      `(see scripts/fonts/twemoji/LICENSE.txt for the attribution).`,
    );
  }
}

// Load the vendored Twemoji PNGs as data URIs keyed by emoji codepoint (hex).
// No network: the PNGs live in scripts/fonts/twemoji/ (tracked in git).
function buildGraphemeImages(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const emoji of EMOJI_SET) {
    const cps = [...emoji].map(c => c.codePointAt(0)!.toString(16)).filter(c => c !== 'fe0f');
    const filename = cps.join('-');
    const buf = loadTwemoji(filename);
    out[emoji] = `data:image/png;base64,${buf.toString('base64')}`;
  }
  return out;
}

// Load a Twemoji PNG from the vendored copy.
// File name is the hex codepoint (e.g. "1f3ac.png"); a missing file is a
// hard error with the exact name to add — the build must never silently
// fall back to the network.
function loadTwemoji(filename: string): Buffer {
  const p = join(TWEMOJI_VENDOR_DIR, `${filename}.png`);
  if (!existsSync(p)) {
    throw new Error(
      `Vendored twemoji PNG not found: ${p}\n` +
      `Copy it from https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/72x72/${filename}.png ` +
      `into scripts/fonts/twemoji/ (see scripts/fonts/twemoji/LICENSE.txt for the attribution).`,
    );
  }
  return readFileSync(p);
}

function loadFont(filename: string): Buffer {
  const p = join(FONTS_DIR, filename);
  if (!existsSync(p)) throw new Error(`Font not found: ${p}. Run: node scripts/download-og-fonts.mjs`);
  return readFileSync(p);
}

// Single source of truth for the rasterisation parameters. Both the per-tool
// cards and the brand cards go through here, so the two card families cannot
// drift apart in size, font stack, or emoji handling.
async function renderPng(element: React.ReactElement, graphemeImages: Record<string, string>): Promise<Buffer> {
  const svg = await satori(element, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Inter',         data: loadFont('Inter-Regular.otf'),     weight: 400, style: 'normal' },
      { name: 'Inter',         data: loadFont('Inter-Bold.otf'),        weight: 700, style: 'normal' },
      { name: 'Inter',         data: loadFont('Inter-Black.otf'),       weight: 900, style: 'normal' },
      { name: 'Noto Sans SC',  data: loadFont('NotoSansSC-Regular.otf'), weight: 400, style: 'normal' },
    ],
    embedFont: true,
    graphemeImages,
  });

  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: { loadSystemFonts: false },
  }).render().asPng();

  return Buffer.from(png);
}

async function renderOne(slug: string, lang: Lang, graphemeImages: Record<string, string>): Promise<Buffer> {
  const tool = tools.find(t => t.slug === slug);
  if (!tool) throw new Error(`Unknown tool slug: ${slug}`);
  const cat = categories.find(c => c.id === tool.categoryId);
  if (!cat) throw new Error(`Unknown category for ${slug}: ${tool.categoryId}`);

  const sample = ogSamples[slug];
  if (!sample) throw new Error(`Missing og-sample for ${slug} (unexpected — see upfront report above)`);

  // Translated tool title (no async - we use English-only here; og-samples already bilingual
  // for headline. The tool title is read from tools.ts which is English-only in data;
  // we render it as-is. For zh og:images, accept English title for v1; can localize later.)
  const title = tool.title;
  const categoryName = cat.name;
  const url = `forgeflowkit.com/${lang}/${slug}`;

  const element = React.createElement(OgCard, {
    title,
    categoryId: tool.categoryId,
    categoryName,
    lang,
    headline: sample.headline[lang],
    headlineUnit: sample.headlineUnit[lang],
    headlineLabel: sample.headlineLabel[lang],
    trend: sample.trend?.[lang],
    url,
  });

  return renderPng(element, graphemeImages);
}

async function renderDefaultCard(lang: Lang, graphemeImages: Record<string, string>): Promise<Buffer> {
  const element = React.createElement(OgDefaultCard, {
    lang,
    url: lang === 'zh' ? 'forgeflowkit.com/zh' : 'forgeflowkit.com/en',
  });
  return renderPng(element, graphemeImages);
}

function buildTargets(): Array<{ slug: string; lang: Lang }> {
  if (defaultOnly) return [];
  if (slugArg) {
    return LANGS.map(lang => ({ slug: slugArg, lang }));
  }
  const toolsList = devMode ? tools.slice(0, 1) : tools;
  const out: Array<{ slug: string; lang: Lang }> = [];
  for (const t of toolsList) {
    for (const lang of LANGS) {
      out.push({ slug: t.slug, lang });
    }
  }
  return out;
}

async function main() {
  if (checkMode) {
    // Verify all 64 exist with size > 10KB
    let missing = 0;
    let small = 0;
    for (const { slug, lang } of buildTargets()) {
      const p = join(OUT_DIR, `${slug}-${lang}.png`);
      if (!existsSync(p)) { console.log(`MISSING: ${slug}-${lang}.png`); missing++; continue; }
      const sz = statSync(p).size;
      if (sz < 10000) { console.log(`TOO SMALL: ${slug}-${lang}.png (${sz}b)`); small++; }
    }
    console.log(`\n${tools.length * LANGS.length} target images. Missing: ${missing}, TooSmall: ${small}`);

    // P153-B′: the brand cards are TRACKED (not gitignored like public/og/),
    // so their absence is never "this checkout didn't build them" — it is a
    // real defect that ships a blank card to every social scraper.
    let defaultMissing = 0;
    let defaultSmall = 0;
    for (const { lang, file } of DEFAULT_CARDS) {
      const p = join(ROOT, 'public', file);
      if (!existsSync(p)) { console.log(`MISSING: public/${file} (${lang})`); defaultMissing++; continue; }
      const sz = statSync(p).size;
      if (sz < 10000) { console.log(`TOO SMALL: public/${file} (${sz}b) — a 1×1 placeholder is 68 bytes`); defaultSmall++; }
    }
    console.log(`${DEFAULT_CARDS.length} brand cards. Missing: ${defaultMissing}, TooSmall: ${defaultSmall}`);

    if (missing || small || defaultMissing || defaultSmall) process.exit(1);
    return;
  }

  assertEmojiSet();

  // P23: collect ALL missing og-samples upfront, then throw once. The old
  // per-render check short-circuited at the first missing slug and hid
  // subsequent ones behind it — cart-abandonment stayed invisible because
  // coupon-attribution threw first. Pre-flight passes the FULL list so the
  // operator can fix everything in one edit.
  {
    const preflight = buildTargets();
    const missingOgSamples = [...new Set(preflight.map(t => t.slug).filter(s => !ogSamples[s]))];
    if (missingOgSamples.length > 0) {
      throw new Error(
        `Missing ${missingOgSamples.length} og-sample entries in src/data/og-samples.json:\n` +
        missingOgSamples.map(s => `  - ${s}`).join('\n') +
        `\nAdd entries to src/data/og-samples.json.`
      );
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });
  console.log('Fetching Twemoji grapheme images...');
  const graphemeImages = buildGraphemeImages();

  const targets = buildTargets();
  console.log(`Rendering ${targets.length} og:images to ${OUT_DIR}/ ...`);
  let i = 0;
  for (const { slug, lang } of targets) {
    const png = await renderOne(slug, lang, graphemeImages);
    const dest = join(OUT_DIR, `${slug}-${lang}.png`);
    // P150 follow-up: see comment in loadTwemoji(). Zero-copy Uint8Array view
    // around the same underlying ArrayBuffer so writeFileSync's strict
    // ArrayBufferView overload accepts it.
    writeFileSync(dest, new Uint8Array(png.buffer, png.byteOffset, png.byteLength));
    i++;
    if (i % 8 === 0 || i === targets.length) {
      console.log(`  ${i}/${targets.length}`);
    }
  }
  console.log(`Done. ${i} images written.`);

  // P153-B′: brand cards. Rendered AFTER the per-tool cards and written to
  // public/ (tracked) rather than public/og/ (gitignored) — see DEFAULT_CARDS.
  console.log(`Rendering ${DEFAULT_CARDS.length} brand cards to public/ ...`);
  for (const { lang, file } of DEFAULT_CARDS) {
    const png = await renderDefaultCard(lang, graphemeImages);
    const dest = join(ROOT, 'public', file);
    writeFileSync(dest, new Uint8Array(png.buffer, png.byteOffset, png.byteLength));
    console.log(`  public/${file} (${lang}) — ${(png.byteLength / 1024).toFixed(1)} KB`);
  }
  console.log('Done. Brand cards written.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

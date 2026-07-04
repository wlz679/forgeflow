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
import { CATEGORY_PALETTE } from './templates/category-palette';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FONTS_DIR = join(ROOT, 'scripts', 'fonts');
const OUT_DIR = join(ROOT, 'public', 'og');
// Twemoji PNG cache: buildGraphemeImages() fetches 9 PNGs from jsDelivr on
// every prebuild. Cache to disk so subsequent builds (and offline runs of
// pnpm check) don't need network. Pre-populate with `pnpm build:og` once.
const TWEMOJI_CACHE_DIR = join(ROOT, 'scripts', '.twemoji-cache');

const LANGS = ['en', 'zh'] as const;
type Lang = (typeof LANGS)[number];

// CLI flags
const args = new Set(process.argv.slice(2));
const devMode = args.has('--dev');      // only render 1 image
const checkMode = args.has('--check');  // verify all 64 exist, don't write
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
}

// Cache Twemoji PNGs as data URIs keyed by emoji codepoint (hex).
// Fetched from jsDelivr CDN (Twemoji CC-BY 4.0).
async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (i === attempts - 1) throw new Error(`HTTP ${res.status} for ${url}`);
    } catch (err) {
      if (i === attempts - 1) throw err;
      // exponential backoff: 500ms, 1500ms, 4500ms
      await new Promise(r => setTimeout(r, 500 * Math.pow(3, i)));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${attempts} attempts`);
}

async function buildGraphemeImages(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  await Promise.all([...EMOJI_SET].map(async (emoji) => {
    const cps = [...emoji].map(c => c.codePointAt(0)!.toString(16)).filter(c => c !== 'fe0f');
    const filename = cps.join('-');
    const buf = await loadTwemoji(filename);
    out[emoji] = `data:image/png;base64,${buf.toString('base64')}`;
  }));
  return out;
}

// Load a Twemoji PNG from local cache, falling back to jsDelivr on miss.
// Cache key is the hex codepoint filename (e.g. "1f3ac.png"); busting the
// cache is `rm -rf scripts/.twemoji-cache/`.
async function loadTwemoji(filename: string): Promise<Buffer> {
  const cachePath = join(TWEMOJI_CACHE_DIR, `${filename}.png`);
  if (existsSync(cachePath)) {
    return readFileSync(cachePath);
  }
  const url = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/72x72/${filename}.png`;
  const res = await fetchWithRetry(url);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(TWEMOJI_CACHE_DIR, { recursive: true });
  writeFileSync(cachePath, buf);
  return buf;
}

function loadFont(filename: string): Buffer {
  const p = join(FONTS_DIR, filename);
  if (!existsSync(p)) throw new Error(`Font not found: ${p}. Run: node scripts/download-og-fonts.mjs`);
  return readFileSync(p);
}

async function renderOne(slug: string, lang: Lang, graphemeImages: Record<string, string>): Promise<Buffer> {
  const tool = tools.find(t => t.slug === slug);
  if (!tool) throw new Error(`Unknown tool slug: ${slug}`);
  const cat = categories.find(c => c.id === tool.categoryId);
  if (!cat) throw new Error(`Unknown category for ${slug}: ${tool.categoryId}`);

  const sample = ogSamples[slug];
  if (!sample) throw new Error(`Missing og-sample for ${slug}`);

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

function buildTargets(): Array<{ slug: string; lang: Lang }> {
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
    if (missing || small) process.exit(1);
    return;
  }

  assertEmojiSet();
  mkdirSync(OUT_DIR, { recursive: true });
  console.log('Fetching Twemoji grapheme images...');
  const graphemeImages = await buildGraphemeImages();

  const targets = buildTargets();
  console.log(`Rendering ${targets.length} og:images to ${OUT_DIR}/ ...`);
  let i = 0;
  for (const { slug, lang } of targets) {
    const png = await renderOne(slug, lang, graphemeImages);
    const dest = join(OUT_DIR, `${slug}-${lang}.png`);
    writeFileSync(dest, png);
    i++;
    if (i % 8 === 0 || i === targets.length) {
      console.log(`  ${i}/${targets.length}`);
    }
  }
  console.log(`Done. ${i} images written.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

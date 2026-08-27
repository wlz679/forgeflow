#!/usr/bin/env node
// P82 — CI guard for translation glossary structural invariants.
//
// Why this exists:
//   P17 introduced `tools.*.description` keys; P69 added `blog.*.title/excerpt`
//   keys; P73 added `legal.*` keys. Future batches must follow the same
//   pattern (every tool needs description key, every blog needs title +
//   excerpt keys). This CI guard catches structural drift:
//     - Every tool in src/data/tools/ has a corresponding tools.${slug}.description key
//     - Every blog in src/content/blog/ has a blog.${slug}.title AND blog.${slug}.excerpt key
//     - Every category in src/data/categories.ts has category.${id}.name AND category.${id}.desc
//   A drift here means a future refactor will leak English onto zh pages.
//
// Build dependency:
//   - NO RUN_BUILD_TESTS required — pure source-file scan, fast (~50ms)
//   - Reads src/data/tools/index.ts, src/content/blog/*.md, src/data/categories.ts,
//     src/i18n/translations.ts
//
// Reference: docs/i18n/zh-terminology.md (P78) — single source of truth for
// translation keys structure.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

// Parse i18n locale JSON files (mirrors the structure of scripts/p72-audit-v6.cjs,
// which previously scanned translations.ts). Returns Map<key, {en, zh}>.
//
// P150: data source is now per-locale JSON. The value object shape is kept
// for backward compatibility with callers that do `.get(key).en/.zh`, even
// though current callers only use `.has(key)` / `.keys()`.
//
// Robustness over audit-v6: JSON.parse catches malformed entries (trailing
// commas, missing quotes) immediately, instead of silently skipping them
// via the regex scan.
function parseTranslations(): Map<string, { en: string; zh: string }> {
  const enPath = resolve(root, 'src/i18n/locales/en.json');
  const zhPath = resolve(root, 'src/i18n/locales/zh.json');
  const en = JSON.parse(readFileSync(enPath, 'utf-8')) as Record<string, string>;
  const zh = JSON.parse(readFileSync(zhPath, 'utf-8')) as Record<string, string>;
  const keys = new Map<string, { en: string; zh: string }>();
  for (const key of Object.keys(en)) {
    keys.set(key, { en: en[key] ?? '', zh: zh[key] ?? '' });
  }
  return keys;
}

// Extract tool slugs from src/data/tools/index.ts (barrel file).
function getToolSlugs(): string[] {
  // Scan all per-category files for 'slug:' lines.
  const slugs = new Set<string>();
  const files = ['saas', 'ai-cost', 'valuation', 'freelance', 'cost', 'investment', 'real-estate', 'marketing', 'operations', 'sales', 'retention', 'product-analytics', 'hiring-team', 'customer-support', 'knowledge', 'legal-compliance'];
  for (const f of files) {
    const path = resolve(root, `src/data/tools/${f}.ts`);
    if (!existsSync(path)) continue;
    const c = readFileSync(path, 'utf-8');
    for (const m of c.matchAll(/slug:\s*'([^']+)'/g)) {
      slugs.add(m[1]!);
    }
  }
  return [...slugs].sort();
}

// Extract category IDs from src/data/categories.ts.
function getCategoryIds(): string[] {
  const content = readFileSync(resolve(root, 'src/data/categories.ts'), 'utf-8');
  return [...content.matchAll(/id:\s*'([A-Z])'/g)].map(m => m[1]!);
}

// Extract blog slugs from src/content/blog/ filenames.
function getBlogSlugs(): string[] {
  const dir = resolve(root, 'src/content/blog');
  return readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''))
    .sort();
}

// P83: Walk all .astro/.ts/.tsx files in src/ to find every t() call site.
// Returns Set of all keys referenced anywhere.
//
// Handles three call styles:
//   t('exact.key', ...)         — adds exact key
//   t("exact.key", ...)         — adds exact key
//   t(`prefix.${var}.suffix`, ...) — adds the static prefix (everything
//                                    before the first ${). Template-literal
//                                    usage like t(`tools.${slug}.title`, lang)
//                                    adds 'tools.' as a "used prefix"; any
//                                    key starting with 'tools.' is treated
//                                    as potentially referenced.
//   key: 'exact.key'             — components like Footer.astro use a map
//                                    of {href, key} pairs and call t(key, lang)
//                                    with the key as a variable. Any string
//                                    literal matching translation-key shape
//                                    (e.g. "footer.privacy") is also treated
//                                    as referenced.
function getUsedKeys(): { exact: Set<string>; prefixes: Set<string> } {
  const exact = new Set<string>();
  const prefixes = new Set<string>();
  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.astro' || entry.name === 'dist') continue;
        walk(full);
      } else if (/\.(astro|ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
        const content = readFileSync(full, 'utf-8');
        // Strip line comments first (mirror audit script + glossary parser)
        const masked = content.split('\n').map(line => {
          const idx = line.indexOf('//');
          return idx === -1 ? line : line.slice(0, idx);
        }).join('\n');
        // t('exact.key', ...)
        for (const m of masked.matchAll(/\bt\(\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g)) exact.add(m[1]!);
        // t("exact.key", ...)
        for (const m of masked.matchAll(/\bt\(\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g)) exact.add(m[1]!);
        // t(`prefix.${var}.suffix`, ...) — capture prefix before first ${
        for (const m of masked.matchAll(/\bt\(\s*`([^`]*?)(?:\$\{)/g)) {
          const prefix = m[1]!;
          if (prefix) prefixes.add(prefix);
        }
        // Variable key references like `key: 'footer.privacy'` — string
        // literal matching translation-key shape (lowercase letters, dots,
        // optional digits/underscores/dashes).
        for (const m of masked.matchAll(/['"`]([a-z][a-z0-9_-]*\.[a-z0-9_.-]+)['"`]/g)) {
          exact.add(m[1]!);
        }
      }
    }
  }
  walk(resolve(root, 'src'));
  return { exact, prefixes };
}

test('translation glossary structural invariants (every tool/blog/category has expected keys)', () => {
  const keys = parseTranslations();
  const toolSlugs = getToolSlugs();
  const categoryIds = getCategoryIds();
  const blogSlugs = getBlogSlugs();

  const violations: string[] = [];

  // Every tool slug should have tools.${slug}.description key
  for (const slug of toolSlugs) {
    if (!keys.has(`tools.${slug}.description`)) {
      violations.push(`missing tools.${slug}.description (tool exists in src/data/tools/)`);
    }
  }

  // Every category id should have category.${id}.name AND .desc keys
  for (const id of categoryIds) {
    if (!keys.has(`category.${id}.name`)) {
      violations.push(`missing category.${id}.name`);
    }
    if (!keys.has(`category.${id}.desc`)) {
      violations.push(`missing category.${id}.desc`);
    }
  }

  // Every blog slug should have blog.${slug}.title AND .excerpt keys
  for (const slug of blogSlugs) {
    if (!keys.has(`blog.${slug}.title`)) {
      violations.push(`missing blog.${slug}.title (md file exists)`);
    }
    if (!keys.has(`blog.${slug}.excerpt`)) {
      violations.push(`missing blog.${slug}.excerpt (md file exists)`);
    }
  }

  assert.equal(
    violations.length,
    0,
    `Glossary structural drift detected (${violations.length} violations):\n` +
      violations.slice(0, 30).map(v => `  - ${v}`).join('\n') +
      (violations.length > 30 ? `\n  ... and ${violations.length - 30} more` : '') +
      `\n\nThis means a new tool/blog/category was added without its translation keys. ` +
      `See docs/i18n/zh-terminology.md for the expected structure.`
  );
});

test('no orphan translation keys (every key in translations.ts is referenced by a t() call)', () => {
  const keys = parseTranslations();
  const { exact, prefixes } = getUsedKeys();

  // A key is "used" if:
  //   1. It's referenced by an exact string t('key', ...) call, OR
  //   2. Some template literal t(`prefix.${var}...`, ...) exists where
  //      `prefix` is a prefix of the key (e.g., key "tools.${slug}.title"
  //      matches template literal prefix "tools.").
  function isUsed(key: string): boolean {
    if (exact.has(key)) return true;
    for (const prefix of prefixes) {
      if (key.startsWith(prefix)) return true;
    }
    return false;
  }

  // An "orphan" key is one in translations.ts that no t() call could resolve to.
  // These are dead code — they bloat translations.ts without serving any page.
  const orphans: string[] = [];
  for (const k of keys.keys()) {
    if (!isUsed(k)) {
      orphans.push(k);
    }
  }

  assert.equal(
    orphans.length,
    0,
    `Orphan translation keys detected (${orphans.length}):\n` +
      orphans.slice(0, 30).map(k => `  - ${k}`).join('\n') +
      (orphans.length > 30 ? `\n  ... and ${orphans.length - 30} more` : '') +
      `\n\nThese keys exist in translations.ts but no t() call references them. ` +
      `Either wire them into templates or remove them.`
  );
});
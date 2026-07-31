#!/usr/bin/env node
// P140a-T7: Build-dep CI guard enforcing Calculator Content Collection
// markdown files conform to the spec's 4-H2 prose schema with relaxed
// P140a word-count thresholds.
//
// Why this guard exists eagerly:
//   Astro 4.x Content Collections validation is LAZY — the schema only
//   fires when `getCollection('tools')` / `getEntry('tools', ...)` is
//   invoked. As of P140a-T7 ship, NO source file imports the tools
//   collection (CalculatorProse.astro uses CollectionEntry type but is
//   not yet wired into [lang]/[slug].astro — that hookup is P140b-T4).
//   Without this eager guard, broken frontmatter will pass `pnpm build`
//   silently and only blow up later when P140b attempts to render the
//   page. By importing the same zod schema from src/content/config.ts
//   and calling `.safeParse()` directly, this guard fronts the validation
//   instead of waiting for Astro's lazy hookup.
//
// P140a thresholds (relaxed; one demo MD ships in this PR):
//   - frontmatter: validated via tools schema (zod) → enforces engine_ref
//     pattern / category_id enum / data_reviewed_at YYYY-MM-DD / sources ≥ 1
//     with `url()` / name min(1). Note: `slug` is intentionally NOT in the
//     schema — Astro 4.x reserves `slug` for entry-id generation. Frontmatter
//     `slug` fields (if any) are decorative text; entry-id derivation comes
//     from filename (P140a-T4 implementer Concern #1, commit e1465ff).
//   - 4 mandatory H2 sections (in any order): What This Calculator Measures /
//     How It Works (Methodology) / Limitations & When Not To Use / Worked Example
//   - per-H2 body: en ≥ 80 chars, zh ≥ 50 chars
//   - full document: en ≥ 400 chars, zh ≥ 250 chars
//
// zh handling:
//   - filename suffix `.zh.md` triggers ZH threshold
//   - P140a/b: missing zh file only emits console.warn (not fail)
//   - P140d-T8 will tighten this to build-fail when zh is missing.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern).
//
// Reference: spec §3 (Content Model), §5 (zh fallback), §8 (CI guards).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
// Import from the Astro-agnostic schema module — tsx cannot resolve Astro's
// `astro:content` virtual module, so we cannot import directly from
// src/content/config.ts (which wraps the schema with defineCollection()).
// See src/content/tools-schema.ts for the schema's source of truth.
import { toolsFrontmatterSchema } from '../src/content/tools-schema.ts';

const root = resolve(import.meta.dirname, '..');

// P23b skip-guard: this test belongs to the build-dep suite registry; only
// run when explicitly opted-in.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const PROSE_DIR = resolve(root, 'src/content/tools');
const README = resolve(PROSE_DIR, '_README.md');

// Thresholds — P140a relaxed; P140b-T8 will tighten.
const THRESHOLDS = {
  en: { perH2: 80, total: 400 },
  zh: { perH2: 50, total: 250 },
} as const;

type Lang = 'en' | 'zh';

// Reference the zod schema imported from src/content/tools-schema.ts so this
// guard shares ONE source of truth with the Astro runtime. (T3 concern #2:
// lazy validation gap — this guard closes it eagerly.)
const TOOLS_SCHEMA = toolsFrontmatterSchema;

// 4 mandatory H2 (the markdown body, not frontmatter). Each H2 has both an
// en and a zh substring variant — the check picks the right one per file
// based on filename suffix (T4 implementer found .zh.md needs separate
// H2 labels per language).
const REQUIRED_H2_VARIANTS: Record<string, readonly string[]> = {
  intro:       ['What This Calculator Measures', '这个计算器衡量什么'],
  methodology: ['How It Works',                 '计算方法'],
  limitations: ['Limitations',                  '局限性'],
  example:     ['Worked Example',               '案例走读'],
} as const;

interface Frontmatter {
  [k: string]: unknown;
}

interface ProseFile {
  filename: string;   // basename
  isZh: boolean;      // ends with .zh.md
  lang: Lang;
  text: string;       // raw file
  frontmatter: Frontmatter;
  body: string;       // text minus frontmatter
}

function parseFrontmatter(text: string): { fm: Frontmatter; body: string } {
  // Match --- at line start, then YAML, then --- at line start
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { fm: {}, body: text };

  const lines = match[1].split('\n');
  const fm: Frontmatter = {};

  // Two-pass walk: handle `key:` with block-list (`- item` lines following at
  // increased indent), `key: [...]` inline arrays, `key: 'string'` quoted,
  // and `key: bare` unquoted scalars.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const kv = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!kv) continue;
    const key = kv[1];
    const raw = kv[2];
    if (raw === '') {
      // Empty value → check if next lines are block-list (`- item`) with
      // possible continuation keys (e.g. `- name: X` then `  url: Y`).
      const items: Array<Record<string, string>> = [];
      let j = i + 1;
      while (j < lines.length) {
        const lj = lines[j];
        const newItem = lj.match(/^\s+-\s+(.*)$/);
        const cont    = lj.match(/^\s+([a-z_]+):\s*(.*)$/i);
        if (newItem) {
          // New list item: parse the rest of the line as `key: value`
          const itemLine = newItem[1].trim();
          const itemKv = itemLine.match(/^([a-z_]+):\s*(.*)$/i);
          const obj: Record<string, string> = {};
          if (itemKv) {
            obj[itemKv[1]] = itemKv[2].replace(/^['"]|['"]$/g, '');
          }
          items.push(obj);
          j++;
        } else if (cont && items.length > 0) {
          // Continuation key — add to the current (last) item.
          items[items.length - 1][cont[1]] = cont[2].replace(/^['"]|['"]$/g, '');
          j++;
        } else {
          break;
        }
      }
      if (items.length > 0) {
        fm[key] = items;
        i = j - 1;
        continue;
      }
      fm[key] = '';
    } else if (raw.startsWith('[') && raw.endsWith(']')) {
      fm[key] = raw.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
    } else if (/^['"]/.test(raw)) {
      fm[key] = raw.replace(/^['"]|['"]$/g, '');
    } else {
      fm[key] = raw;
    }
  }
  return { fm, body: match[2] };
}

function loadProseFile(filename: string): ProseFile | null {
  const full = resolve(PROSE_DIR, filename);
  if (!existsSync(full)) return null;
  // Skip _README.md (editor guide) and any non-md files
  if (!filename.endsWith('.md')) return null;
  if (filename === '_README.md') return null;
  const text = readFileSync(full, 'utf8');
  const { fm, body } = parseFrontmatter(text);
  const isZh = filename.endsWith('.zh.md');
  return {
    filename,
    isZh,
    lang: isZh ? 'zh' : 'en',
    text,
    frontmatter: fm,
    body,
  };
}

function listProseFiles(): string[] {
  if (!existsSync(PROSE_DIR)) return [];
  return readdirSync(PROSE_DIR).filter(n => n.endsWith('.md') && n !== '_README.md');
}

function extractH2(body: string): { title: string; content: string }[] {
  const lines = body.split('\n');
  const out: { title: string; content: string }[] = [];
  let cur: { title: string; content: string[] } | null = null;
  for (const line of lines) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      if (cur) out.push({ title: cur.title, content: cur.content.join('\n').trim() });
      cur = { title: h[1], content: [] };
    } else if (cur) {
      cur.content.push(line);
    }
  }
  if (cur) out.push({ title: cur.title, content: cur.content.join('\n').trim() });
  return out;
}

// =============================================================
// Test 1: README.md is present (editing-guide file ships with the schema).
// =============================================================
test('src/content/tools/_README.md exists as the editor guide (underscore-prefix skips Astro entry)', () => {
  assert.equal(existsSync(README), true, `Missing editing-guide at ${README}; copy from spec §3`);
});

// =============================================================
// Test 2: every prose file's frontmatter passes the imported zod schema.
//       This is the SINGLE source of truth — same schema that Astro uses
//       at runtime. (Replaces the manual REQUIRED_FRONTMATTER check, which
//       would risk drifting from the schema if a key was added/removed.)
// =============================================================
test('every prose file frontmatter passes the imported tools schema (zod)', () => {
  const files = listProseFiles();
  const failures: string[] = [];
  for (const filename of files) {
    const p = loadProseFile(filename);
    if (!p) continue;
    const result = TOOLS_SCHEMA.safeParse(p.frontmatter);
    if (!result.success) {
      const issues = result.error.issues
        .map(i => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; ');
      failures.push(`${filename}: ${issues}`);
    }
  }
  assert.equal(failures.length, 0, failures.join('\n'));
});

// =============================================================
// Test 3: every prose file contains all 4 mandatory H2 sections.
// =============================================================
test('every prose file has the 4 mandatory H2 sections (in any order)', () => {
  const files = listProseFiles();
  const missingH2: string[] = [];
  for (const filename of files) {
    const p = loadProseFile(filename);
    if (!p) continue;
    const h2s = extractH2(p.body).map(h => h.title);
    // Pick en or zh variants per file. H2 must contain one of the substrings.
    const variants = p.isZh
      ? Object.values(REQUIRED_H2_VARIANTS).map(v => v[1])
      : Object.values(REQUIRED_H2_VARIANTS).map(v => v[0]);
    const missing = variants.filter(req => !h2s.some(t => t.includes(req)));
    if (missing.length > 0) {
      missingH2.push(`${filename}: missing H2 ${JSON.stringify(missing)}`);
    }
  }
  assert.equal(missingH2.length, 0, missingH2.join('\n'));
});

// =============================================================
// Test 4: per-H2 word-count thresholds.
// =============================================================
test('every prose file meets per-H2 body length thresholds', () => {
  const files = listProseFiles();
  const failures: string[] = [];
  for (const filename of files) {
    const p = loadProseFile(filename);
    if (!p) continue;
    const t = THRESHOLDS[p.lang];
    // H2 must match one of the 4 mandatory sections for this file's language.
    const langVariants = p.isZh
      ? Object.values(REQUIRED_H2_VARIANTS).map(v => v[1])
      : Object.values(REQUIRED_H2_VARIANTS).map(v => v[0]);
    const h2s = extractH2(p.body).filter(h => langVariants.some(req => h.title.includes(req)));
    for (const h of h2s) {
      const chars = h.content.replace(/\s+/g, ' ').trim().length;
      if (chars < t.perH2) {
        failures.push(`${filename} [${p.lang}] "${h.title}" has ${chars} chars, threshold ${t.perH2}`);
      }
    }
  }
  assert.equal(failures.length, 0, failures.join('\n'));
});

// =============================================================
// Test 5: full-document word-count thresholds.
// =============================================================
test('every prose file meets full-document body length thresholds', () => {
  const files = listProseFiles();
  const failures: string[] = [];
  for (const filename of files) {
    const p = loadProseFile(filename);
    if (!p) continue;
    const t = THRESHOLDS[p.lang];
    // Body excluding frontmatter, but including all 4 H2s (they get rendered).
    const chars = p.body.replace(/\s+/g, ' ').trim().length;
    if (chars < t.total) {
      failures.push(`${filename} [${p.lang}] total ${chars} chars, threshold ${t.total}`);
    }
  }
  assert.equal(failures.length, 0, failures.join('\n'));
});

// =============================================================
// Test 6: for each en file, the corresponding zh counterpart warns (not fails)
//         if missing — P140a/b phase. P140d-T8 will tighten.
// =============================================================
test('zh counterparts are encouraged but not required yet (P140a phase)', () => {
  const files = listProseFiles();
  const pairs: string[] = [];   // en→zh expected pairs
  for (const filename of files) {
    if (filename.endsWith('.zh.md')) continue;
    const slug = filename.replace(/\.md$/, '');
    const zhName = `${slug}.zh.md`;
    if (!files.includes(zhName)) {
      pairs.push(zhName);
    }
  }
  // P140a: only console.warn; not a hard fail.
  if (pairs.length > 0) {
    console.warn(`[p140a-T7] Missing zh counterparts (P140a tolerated): ${pairs.join(', ')}`);
  }
  // Always pass — leaving the door open for P140b's mass-write to ship incrementally.
  assert.ok(true);
});

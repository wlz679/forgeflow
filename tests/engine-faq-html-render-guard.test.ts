#!/usr/bin/env node
// P146-S2 — Build-dep guard: every engine FAQ en text MUST appear in dist HTML.
// Catches P140b-style engine updates that don't sync to translations.ts,
// which would cause user-visible HTML drift (engine text vs translations text).
//
// Builds via buildWithEnv (build-dep); checks dist HTML contains engine text.
// Requires RUN_BUILD_TESTS=1 (skips in default mode).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildWithEnv } from './_supabase-build-helper.ts';
// P160: 引擎 FAQ 里的价格是从 src/data/ai-pricing.json 派生的 token
// （{{live:provider/key}} 等），页面渲染时会被 resolveLiveTokens 解析掉。
// ⇒ 拿**带 token 的源码**去 HTML 里找，永远找不到 ⇒ 必须先解析再比对。
import { resolveLiveTokens } from '../src/lib/live-price';

const root = resolve(import.meta.dirname, '..');

// P23b: skip if RUN_BUILD_TESTS not set
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function walkEngines(d: string, out: string[]): void {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const full = resolve(d, e.name);
    if (e.isDirectory()) walkEngines(full, out);
    else if (e.name.endsWith('.ts')) out.push(full);
  }
}
const engineFiles: string[] = [];
walkEngines(resolve(root, 'src', 'engines'), engineFiles);

/**
 * FAQ 条目的正则 —— **单引号和双引号都要匹配**。
 *
 * P160 修掉了一个覆盖盲区：旧版只匹配双引号（`q:\s*"..."`），于是
 * **1322 条 FAQ 里只有 814 条被检查**，508 条（38%）从来没进过这个守卫。
 * 单引号条目不是「不存在」，只是正则没看见 —— 而「没看见」等于「没保护」。
 */
const FAQ_ENTRY_RE =
  /\{\s*q:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*,\s*a:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*,?\s*\}/g;

/** TS 字面量 → 纯文本 */
function unescapeTs(s: string): string {
  return s.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

const engineFaq: Record<string, { q: string; a: string }[]> = {};
for (const file of engineFiles) {
  const text = readFileSync(file, 'utf-8');
  const slugMatch = text.match(/slug:\s*['"](solopreneur-[a-z0-9-]+)['"]/);
  if (!slugMatch) continue;
  const slug = slugMatch[1];
  const faqMatch = text.match(/faq:\s*\[([\s\S]*?)(?=\],\s*\n\s*howToUse|\],\s*\n\s*\};)/);
  if (!faqMatch) continue;
  const entries: { q: string; a: string }[] = [];
  FAQ_ENTRY_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FAQ_ENTRY_RE.exec(faqMatch[1])) !== null) {
    entries.push({
      q: unescapeTs(m[1]!.slice(1, -1)),
      a: unescapeTs(m[2]!.slice(1, -1)),
    });
  }
  engineFaq[slug] = entries;
}

const escapeForHtml = (s: string): string => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

test('every engine FAQ en text appears in dist HTML', () => {
  // Build dist (build-dep) — result not needed (we read individual page HTMLs)
  buildWithEnv({});

  const violations: string[] = [];
  for (const slug of Object.keys(engineFaq)) {
    const entries = engineFaq[slug];
    if (entries.length === 0) continue;
    const enPath = resolve(root, 'dist', 'en', slug, 'index.html');
    if (!existsSync(enPath)) {
      violations.push(`${slug}: dist/en/${slug}/index.html missing (build incomplete?)`);
      continue;
    }
    const pageHtml = readFileSync(enPath, 'utf-8');
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry) continue;
      for (const field of ['q', 'a'] as const) {
        const engText = entry[field];
        // P160: FAQ 里的价格是 token ⇒ 页面上的文本是**解析后**的
        let resolved: string;
        try {
          resolved = resolveLiveTokens(engText);
        } catch (e) {
          violations.push(
            `${slug}.faq.${i}.${field}: token 解析失败 —— ${e instanceof Error ? e.message : String(e)}`,
          );
          continue;
        }
        const escaped = escapeForHtml(resolved);
        if (!pageHtml.includes(escaped)) {
          violations.push(`${slug}.faq.${i}.${field}: engine text (${resolved.length} chars) not in HTML`);
        }
      }
    }
  }
  assert.equal(
    violations.length,
    0,
    `Engine FAQ en text not in dist HTML (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '')
  );
});
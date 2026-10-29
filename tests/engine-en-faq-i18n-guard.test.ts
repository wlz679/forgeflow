#!/usr/bin/env node
// P131 — Single-dimension test: en FAQ q + a. En-side mirror of
// engine-zh-faq-i18n-guard.test.ts. Replaces dimension 4 of 5 from P124.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildSlugToFaqCount,
  escapeForHtml,
} from './_composite-i18n-walkers';
// P153: translations moved from the deleted src/i18n/translations.ts to the
// per-locale JSON files (P150, commit c16322b). This guard used to scrape
// `tools.<slug>.faq.N.q` out of the TS module with a regex and died with
// ENOENT once the module was deleted.
import { getTranslation, getEngineSlugsFromLocales } from './_locale-json';
// P160: 引擎 FAQ 里的价格是从 src/data/ai-pricing.json 派生的 token
// （{{live:provider/key}} 等）。页面渲染时（src/pages/[lang]/[slug].astro 的
// translatedFaq）会先 resolveLiveTokens，再把结果喂给 <FAQ> 和 JSON-LD。
// ⇒ 本守卫必须**解析后再比对**，否则拿带 token 的原文去 HTML 里找，永远找不到。
import { resolveLiveTokens } from '../src/lib/live-price';

const root = resolve(import.meta.dirname, '..');

/** 解析 token；解析失败时返回 null 并把原因带出来（不让整个套件炸掉） */
function resolveOrExplain(raw: string): { ok: true; text: string } | { ok: false; error: string } {
  try {
    return { ok: true, text: resolveLiveTokens(raw) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p131-en-faq] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

test('every en engine page renders all FAQ q + a entries (P131 split from P124 dim 4)', () => {
  ensureBuilt();

  const allSlugs = getEngineSlugsFromLocales();
  assert.equal(
    allSlugs.length,
    100,
    `Expected 100 engine slugs, found ${allSlugs.length} — P22b lock broken?`
  );

  const slugToFaqCount = buildSlugToFaqCount();
  const violations: string[] = [];

  for (const slug of allSlugs) {
    const faqCount = slugToFaqCount.get(slug) ?? 0;
    if (faqCount === 0) continue;
    for (let i = 0; i < faqCount; i++) {
      const qRaw = getTranslation('en', `tools.${slug}.faq.${i}.q`);
      const aRaw = getTranslation('en', `tools.${slug}.faq.${i}.a`);
      assert.ok(
        typeof qRaw === 'string',
        `${slug}: missing FAQ[${i}].q translation key (engine defines ${faqCount} FAQ entries, but en.json has no tools.${slug}.faq.${i}.q)`
      );
      assert.ok(
        typeof aRaw === 'string',
        `${slug}: missing FAQ[${i}].a translation key (engine defines ${faqCount} FAQ entries, but en.json has no tools.${slug}.faq.${i}.a)`
      );
      const qResolved = resolveOrExplain(qRaw);
      const aResolved = resolveOrExplain(aRaw);
      if (!qResolved.ok) {
        violations.push(`${slug}: FAQ[${i}].q token 解析失败 —— ${qResolved.error}`);
      }
      if (!aResolved.ok) {
        violations.push(`${slug}: FAQ[${i}].a token 解析失败 —— ${aResolved.error}`);
      }
      if (!qResolved.ok || !aResolved.ok) continue;
      const qEn = escapeForHtml(qResolved.text);
      const aEn = escapeForHtml(aResolved.text);
      const enPath = resolve(root, 'dist', 'en', slug, 'index.html');
      if (!existsSync(enPath)) {
        violations.push(`${slug}: dist/en/${slug}/index.html missing (build incomplete?)`);
        break;
      }
      const rawHtml = readFileSync(enPath, 'utf-8');
      if (!rawHtml.includes(qEn)) {
        violations.push(`${slug}: missing FAQ[${i}].q (en length ${qEn.length})`);
      }
      if (!rawHtml.includes(aEn)) {
        violations.push(`${slug}: missing FAQ[${i}].a (en length ${aEn.length})`);
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `FAQ (en) i18n violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '')
  );
});

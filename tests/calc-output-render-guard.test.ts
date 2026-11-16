#!/usr/bin/env node
// P168 B3-7 —— 产物层守卫：zh 结果卡片里不得残留未解析的 token，
// 且 en / zh 卡片必须**结构一致**。
//
// ⭐ 为什么必须剥掉两个 data-* 属性再取文本（2026-11-13 实测）
//   · data-calc-output-raw —— token **原文**（客户端 beautify 的输入）⇒ 里面**必然**有 token
//   · data-calc-output-templates —— 注入的模板表 JSON（里面是**英文** locale 值）
//   ⇒ 旧写法直接对整段 HTML 做 includes('$calc_out.') ⇒ **必然**误报；
//     而旧版从未在 RUN_BUILD_TESTS=1 下真跑过 ⇒ **真空绿**。
//
// ⭐ 三条判据
//   G4  zh 卡片可见文本不得含裸 token
//   G4b en / zh 卡片行数必须一致（结构 parity —— zh 多一条 tip 行就是典型）
//   G4c zh 卡片不得有整行英文（≥2 个 ≥3 字母的英文词且无 CJK）
//   + 非真空绿断言：卡片必须真的取到内容（提取器坏了 ⇒ 立刻红）

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PILOT, staticCard, isEnglishLine, hasBareToken } from './scripts/p168-card-text.mjs';
// P168 B3-7 G4d：产物层的注入集合必须等于引擎声明的 code 集合。
import { extractEngineTokenCodes } from '../src/lib/calc-output-i18n.ts';
import '../src/engines/index.ts';
import { getEngine } from '../src/core/engines/registry.ts';

const ROOT = resolve(import.meta.dirname, '..');

// ⭐ CI 的「Unit tests」步骤跑在「Build」步骤**之前** ⇒ 全新 checkout 里**没有 dist/**
//   ⇒ 守卫必须**自己**构建（仓库既有约定：a11y-guard / breadcrumb-list-guard /
//   canonical-url-guard / category-page-schema-guard 都是这么做的）。
//   ⚠️ 2026-11-13 实测：本守卫最初没写这段 ⇒ 本地绿（dist 已存在）但 **CI 必红**
//   （10 个试点全部报「产物不存在」）⇒ **本地绿 ≠ CI 绿**，产物层守卫必须自建。
function ensureBuilt(): void {
  const probe = resolve(ROOT, 'dist', 'zh', 'solopreneur-mrr-calculator', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p168-b3-7] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, 'pnpm build failed with status ' + r.status);
}

function calcOutTemplatesFromHtml(html: string): Record<string, string> | null {
  const marker = 'data-calc-output-templates="';
  const i = html.indexOf(marker);
  if (i < 0) return null;
  const start = i + marker.length;
  const end = html.indexOf('"', start);
  if (end < 0) return null;
  const raw = html.slice(start, end);
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };
  const decoded = raw.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m: string, ent: string) => {
    if (ent[0] === '#') {
      const code = ent[1] === 'x' || ent[1] === 'X' ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      return Number.isFinite(code) ? String.fromCharCode(code) : m;
    }
    return named[ent] || m;
  });
  return JSON.parse(decoded);
}

function cardOf(lang: string, slug: string): string[] | null {
  const p = resolve(ROOT, 'dist', lang, slug, 'index.html');
  if (!existsSync(p)) return null;
  return staticCard(readFileSync(p, 'utf8'));
}

test('P168 B3-7 产物层：zh 卡片不得残留裸 token / en 与 zh 结构一致 / 无整行英文', (t) => {
  if (!process.env.RUN_BUILD_TESTS) {
    t.skip('build-dep：需要 RUN_BUILD_TESTS=1 与已构建的 dist/');
    return;
  }
  ensureBuilt();
  const problems: string[] = [];
  let checked = 0;
  let totalZh = 0;
  for (const [slug, , alias] of PILOT) {
    const zh = cardOf('zh', slug);
    const en = cardOf('en', slug);
    if (!zh || !en) {
      problems.push(alias + '：产物不存在（dist/' + (zh ? 'en' : 'zh') + '/' + slug + '/index.html）');
      continue;
    }
    checked++;
    if (zh.length < 1) problems.push(alias + '：zh 卡片取到 0 行（提取器坏了？）');
    if (en.length < 1) problems.push(alias + '：en 卡片取到 0 行（提取器坏了？）');
    totalZh += zh.length;
    const bare = zh.filter((l) => hasBareToken(l));
    if (bare.length) problems.push(alias + '：zh 卡片残留裸 token ' + bare.length + ' 行 —— ' + bare[0].slice(0, 80));
    if (en.length !== zh.length) problems.push(alias + '：行数不一致 en ' + en.length + ' ≠ zh ' + zh.length);
    const eng = zh.filter((l) => isEnglishLine(l));
    if (eng.length) problems.push(alias + '：zh 卡片有整行英文 ' + eng.length + ' 行 —— ' + eng[0].slice(0, 80));
  }
  assert.equal(checked, PILOT.length, '试点产物不全（checked=' + checked + '/' + PILOT.length + '）');
  // ⭐ 非真空绿：提取器整体失效时总行数会塌到 0（单页最少行数因工具而异，不能当判据）
  assert.ok(totalZh >= 250, 'zh 卡片总行数只有 ' + totalZh + '（提取器可能坏了）');
  assert.deepEqual(problems, [], problems.join(' | '));
});

// ── G4d：注入的模板表 == 本引擎声明的 code 集合 ───────────────────────────
// ⭐ 为什么要在**产物层**再守一次（2026-11-13 实测）
//   源码层的 G12 能证明「函数能裁剪」，但不能证明「构建产物里真的裁掉了」
//   ⇒ 原实现每页注入**全仓 184 条共享键**（rent_vs_buy 页面 209 KB > 200 KB 阈值）
//   ⇒ 产物层把它锁住：注入集合与引擎声明不等 ⇒ 立刻红。
test('P168 B3-7 G4d：产物层注入的模板表必须恰好等于引擎声明的 code 集合', (t) => {
  if (!process.env.RUN_BUILD_TESTS) {
    t.skip('build-dep：需要 RUN_BUILD_TESTS=1 与已构建的 dist/');
    return;
  }
  ensureBuilt();
  const problems = [];
  let checked = 0;
  for (const [slug, , alias] of PILOT) {
    const engine = getEngine(slug);
    if (!engine) { problems.push(alias + '：引擎没注册'); continue; }
    const want = [...extractEngineTokenCodes(engine)].sort();
    if (want.length === 0) { problems.push(alias + '：提取到的 code 数为 0（提取器坏了？）'); continue; }
    for (const lang of ['en', 'zh']) {
      const p = resolve(ROOT, 'dist', lang, slug, 'index.html');
      if (!existsSync(p)) { problems.push(alias + '：产物不存在（dist/' + lang + '/' + slug + '/index.html）'); continue; }
      const tpls = calcOutTemplatesFromHtml(readFileSync(p, 'utf8'));
      if (tpls === null) { problems.push(lang + '/' + alias + '：注入属性找不到'); continue; }
      checked++;
      const got = Object.keys(tpls).sort();
      const missing = want.filter((c) => !got.includes(c));
      const extra = got.filter((c) => !want.includes(c));
      if (missing.length) problems.push(lang + '/' + alias + '：注入表少了 ' + missing.length + ' 个 code');
      if (extra.length) problems.push(lang + '/' + alias + '：注入表多了 ' + extra.length + ' 个 code');
    }
  }
  assert.ok(checked === PILOT.length * 2, '试点产物没测全：' + checked + '/' + PILOT.length * 2);
  assert.deepEqual(problems, [], problems.join(' | '));
});

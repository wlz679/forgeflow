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
import { PILOT, staticCard, isEnglishLine, hasBareToken } from './scripts/p168-card-text.mjs';

const ROOT = resolve(import.meta.dirname, '..');

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

#!/usr/bin/env node
// P168 B3-8 —— 「客户端美化层不得自己造面向用户的文案」的**结构性**守卫。
//
// 为什么存在（B3-8 实施期实测抓到的真缺陷）
// ----------------------------------------------
//   src/pages/[lang]/[slug].astro 的客户端 beautifySections() 会**重排**结果卡片；
//   其中两个分支**自己写了面向用户的英文标题**：
//     「💰 Savings Insights」/「📊 Usage Scenarios (monthly costs)」
//   ⇒ zh 页上，这两行**覆盖**了 token 渲染出来的中文标题
//   ⇒ 实测 zh 页用户看到「📊 Usage Scenarios (monthly costs)」（整行英文）。
//
// ⭐⭐ 为什么**产物层守卫抓不到**（这条判据的承重前提）
//   · 产物层守卫（G4c / G13 等）读的是 **SSR 出来的 HTML**；
//   · beautify 是**浏览器里的后处理**（staticMono.innerHTML = beautifySections(...)）
//     ⇒ SSR HTML 里**根本没有**这两行；
//   ⇒ 「zh 页 0 整行英文」在 SSR 层**是真的** ⇒ 守卫绿 ⇒ **用户却看到英文**。
//   ⇒ 结论：⭐⭐ **SSR 层绿 ≠ 用户所见绿** ⇒ 必须有一条**能看见客户端插入内容**的判据。
//
// ⭐⭐ 为什么判据选「结构性」而不是「字符串黑名单」
//   字符串黑名单只拦已知的两个字符串 ⇒ 新增一个就漏；
//   结构性判据：**凡是直接写进 HTML 的面向用户文字，都必须来自原文**（含 esc(...)）
//   ⇒ 任何未来新增的硬编码文案都会红 ⇒ 承重。
//
// source-only：不依赖构建产物 ⇒ pnpm check 也会跑它。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { countEnglishWords } from './scripts/p168-card-text.mjs';

const root = resolve(import.meta.dirname, '..');
const PAGE = resolve(root, 'src', 'pages', '[lang]', '[slug].astro');

test('P168 B3-8：客户端美化层不得自己造面向用户的英文文案（可见文字必须来自原文）', () => {
  const src = readFileSync(PAGE, 'utf8');
  const lines = src.split('\n');
  const violations: string[] = [];
  let scanned = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.indexOf('+= ') < 0) continue;
    // 只看**拼出 HTML 的**语句（服务端用 Astro 模板，不做字符串拼 HTML）
    const lits = [...line.matchAll(/'([^']*)'/g)].map((m) => m[1]);
    const htmlLits = lits.filter((l) => l.indexOf('<') >= 0 && l.indexOf('>') >= 0);
    if (!htmlLits.length) continue;
    scanned++;
    for (const lit of htmlLits) {
      // 去掉 HTML 标签 ⇒ 只剩**可见文本**（class/style 里的英文不算）
      const visible = lit.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (!visible) continue;
      // ⭐ 阈值是 **2 个**英文词（不是产物层的 3）—— 因为这里判的是「一段硬编码文案」，
      //   不是「整行英文」：「💰 Savings Insights」只有 2 个词，但它是**面向用户的英文**。
      if (countEnglishWords(visible) >= 2) {
        violations.push('    第 ' + (i + 1) + ' 行：' + JSON.stringify(visible));
      }
    }
  }
  // ⭐ 防真空绿：扫描器必须真的扫到了东西（否则改坏了扫描器也是绿的）
  assert.ok(scanned >= 20, '只扫到 ' + scanned + ' 条「拼出 HTML」的语句 ⇒ 扫描器失效（应至少 20 条）');
  assert.deepEqual(
    violations,
    [],
    '客户端美化层里不得自己写面向用户的英文文案 —— 它们会**覆盖** zh 翻译。\n' +
      '⭐ 正确做法：标题取**原文那一行**（原文是 token 原文 ⇒ 保留 token ⇒ calc-output.client.ts 会换成 zh 模板）。\n' +
      '⚠️ 这类文案在 **SSR 的 HTML 里不存在**（beautify 是浏览器后处理）⇒ 产物层守卫看不见 ⇒ 必须有本条。\n' +
      violations.join('\n'),
  );
});

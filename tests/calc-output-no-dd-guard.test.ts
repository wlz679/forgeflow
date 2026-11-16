#!/usr/bin/env node
// P168 B3-8 G14：产物页不得残留双美元号（$$）。
//
// ⭐ 为什么需要它（2026-11-16 实测）
//   `fmt()` 已带 '$'，调用处再拼一个就成 '$$'（P163 D1 的注释只提醒了，没拦住）。
//   ⇒ 实测 src/engines 有 24 处 '$$'，其中 20 处是**可见缺陷**
//   （产物层 140 处 / 14 页；线上已确认可见，其中 saas_valuation 32 处/页）。
//   ⇒ G9（英文页零变化）**抓不到**它：那 20 处是「一直就有的」，不在本批的基线差异里。
//
// ⭐ 判据：'$$' **前后都不挨着** '$' 才是缺陷
//   · '$$12,000/yr'  → 缺陷（后面是数字）
//   · '"$$$"'       → 合法（垃圾邮件敏感词示例，FAQ 里的字面量）⇒ 前后都挨着 '$' ⇒ 放行
//
// source-only 做不到（产物层），故本守卫自建 dist。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(import.meta.dirname, '..');

function ensureBuilt(): void {
  const probe = resolve(ROOT, 'dist', 'zh', 'solopreneur-mrr-calculator', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p168-b3-8] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  assert.equal(r.status, 0, 'pnpm build failed with status ' + r.status);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === 'index.html') out.push(p);
  }
  return out;
}

// '$$' 前后都不挨着 '$' ⇒ 缺陷；'$$$'（前后都挨着 '$'）⇒ 合法字面量，放行
// ⚠️ 两侧都要看：只看右侧（/(?<!\$) 缺失）时 '$$$' 会在位置 1 再匹配一次 ⇒ 合法字面量被误报
const DD_DEFECT = /(?<!\$)\$\$(?!\$)/g;

test('P168 B3-8 G14：产物页不得残留双美元号（$$）', () => {
  if (!process.env.RUN_BUILD_TESTS) {
    test.skip('build-dep：需要 RUN_BUILD_TESTS=1 与已构建的 dist/');
    return;
  }
  ensureBuilt();
  const files = walk(resolve(ROOT, 'dist'));
  assert.ok(files.length >= 50, 'dist/ 只有 ' + files.length + ' 个 HTML —— 构建可能不完整');
  const offenders: string[] = [];
  for (const f of files) {
    const html = readFileSync(f, 'utf8');
    const hits = html.match(DD_DEFECT);
    if (!hits || hits.length === 0) continue;
    const rel = f.slice(resolve(ROOT, 'dist').length + 1).replace(/\\/g, '/');
    offenders.push(rel + '  x' + hits.length);
  }
  assert.deepEqual(offenders, [], '产物页残留双美元号（' + offenders.length + ' 个文件）：\n  ' + offenders.slice(0, 25).join('\n  '));
});

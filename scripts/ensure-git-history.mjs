#!/usr/bin/env node
// P168 B3-6b —— 确保构建环境里 git 历史是**完整**的（否则 lastmod 的真相源失效）
//
// ⭐⭐ 为什么需要它（2026-11-11 **线上实测**）
//   Cloudflare Pages 克隆仓库时用 --depth 1（浅克隆）⇒ 构建期 git log -1 -- <path>
//   对**每一个**文件都只能看到**同一个** HEAD 提交 ⇒ 所有页面的 lastmod 都等于
//   「本次部署的提交时间」⇒ **每次部署依然是在告诉 Google「431 个页面全是新的」**。
//   ⇒ 本地（完整历史）测出来的 **5 种** lastmod 取值，在线上退化成 **1 种**。
//
//   ⭐ 这与 Quartz 的 CreatedModifiedDate transformer 踩过的是**同一个** CF Pages 行为，
//   它的解法也是**同一个**：构建前把浅克隆补成完整克隆。
//
// ⚠️ 必须**失败开放**（fail-open）：拉不到历史时**不能**让构建失败
//   ⇒ 退回 mtime（= 修复前的行为），但构建照常成功。
//
// 跑法（构建脚本里自动调用，也可单独跑）：
//   node scripts/ensure-git-history.mjs

import { execFileSync } from 'node:child_process';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

// ---- 1. 不是 git 仓库 / git 不可用 ⇒ 跳过（不阻断构建） ----
let shallow = false;
try {
  shallow = git(['rev-parse', '--is-shallow-repository']).trim() === 'true';
} catch {
  console.log('[ensure-git-history] 不是 git 仓库（或 git 不可用）⇒ 跳过。');
  console.log('[ensure-git-history] ⚠️ lastmod 将退回 mtime（= 部署时间）。');
  process.exit(0);
}

// ---- 2. 已经是完整克隆 ⇒ 无需处理 ----
if (!shallow) {
  console.log('[ensure-git-history] git 历史已完整 ⇒ 无需处理。');
  process.exit(0);
}

// ---- 3. 浅克隆 ⇒ 补成完整克隆 ----
console.log('[ensure-git-history] 检测到浅克隆 ⇒ 拉取完整历史');
console.log('[ensure-git-history] （否则 lastmod 会全部等于本次部署时间 = 索引信号作废）');
let ok = false;
for (const args of [['fetch', '--unshallow', 'origin'], ['fetch', '--unshallow']]) {
  try {
    execFileSync('git', args, { stdio: ['ignore', 'inherit', 'inherit'] });
    ok = true;
    break;
  } catch (e) {
    console.warn('[ensure-git-history] ⚠️ ' + args.join(' ') + ' 失败：' + (e && e.message));
  }
}
if (!ok) {
  console.warn('[ensure-git-history] ⚠️ 无法拉取完整历史 ⇒ 继续构建。');
  console.warn('[ensure-git-history] ⚠️ lastmod 将退回 mtime（= 部署时间）。');
  process.exit(0);
}
try {
  console.log('[ensure-git-history] 完成 · is-shallow-repository=' + git(['rev-parse', '--is-shallow-repository']).trim());
} catch { /* ignore */ }
process.exit(0);

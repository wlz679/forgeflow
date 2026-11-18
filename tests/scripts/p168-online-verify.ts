#!/usr/bin/env node
// P168 B3-9 —— **线上复验**（zh 结果卡片本地化的**生产侧**验收 · 可复算 · 已入库）。
//
// 为什么需要它
// ------------------
// 「CI 绿」和「已推送」都不是「页面真的变了」⇒ 必须看目标侧。
// ⚠️ **CDN 边缘缓存会让你误判「没部署」**（2026-11-16 实测）：首次 fetch 拿到的仍是**旧副本**
//   ⇒ 必须「**重取 + 换随机 cache-buster**」再下结论（否则会把「没部署」误报成「部署了」）。
// ⚠️ 本工具比对的不是「整页字节」而是**结果卡片的每一行**：整页会带 CF 注入的属性与构建时间戳
//   ⇒ 恒不相等；**卡片行才是用户看到的正文**。
//
// 断言（每页）
//   ① 线上 zh 卡片 **逐行等于** 本地 dist zh 卡片（⇒ 线上跑的就是这份代码）
//   ② 线上卡片 **0 整行英文**（CJK ≤ 2 且英文词 ≥ 3 —— 与 G4c 同一判据）
//   ③ 线上卡片 **0 裸 token**（`$calc_out.`）
//   ④ 线上卡片 **0 处 `$$`**
//   ⑤ **非真空绿**：每页卡片行数 > 0、合计 > 0（提取器整体失效时立刻红）
//
// 用法（必须从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-online-verify.ts
//   环境变量：P168_ONLINE_SLUGS=逗号分隔（默认 = 已令牌化引擎清单）

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { staticCard, isEnglishLine, hasBareToken, PILOT } from './p168-card-text.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');
const SITE = 'https://forgeflowkit.com';
const NL = String.fromCharCode(10);

function targetSlugs(): string[] {
  const env = process.env.P168_ONLINE_SLUGS;
  if (env && env.trim()) return env.split(',').map((s) => s.trim()).filter(Boolean);
  return PILOT.map((p) => p[0]);
}

function firstDiff(a: string[], b: string[]): string {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) {
      return '第 ' + (i + 1) + ' 行不同 | 本地: ' + JSON.stringify(a[i]) + ' | 线上: ' + JSON.stringify(b[i]);
    }
  }
  return '';
}

async function main(): Promise<void> {
  const slugs = targetSlugs();
  let bad = 0;
  let noLocal = 0;
  let totalLines = 0;
  const problems: string[] = [];

  for (const slug of slugs) {
    const localPath = resolve(ROOT, 'dist', 'zh', slug, 'index.html');
    if (!existsSync(localPath)) {
      noLocal++;
      console.log('✗ ' + slug + ' | 本地 dist 缺失（先跑 pnpm build）');
      continue;
    }
    const localCard = staticCard(readFileSync(localPath, 'utf-8'));

    let onlineCard: string[] = [];
    let status = 0;
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(SITE + '/zh/' + slug + '/?cb=' + Date.now() + '-' + attempt, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      status = res.status;
      if (status !== 200) break;
      onlineCard = staticCard(await res.text());
      // 与本地一致即认为拿到的就是新版本；否则换 cache-buster 重取一次
      if (onlineCard.join(NL) === localCard.join(NL)) break;
    }

    const lines = onlineCard.length;
    totalLines += lines;
    const english = onlineCard.filter((l) => isEnglishLine(l));
    const bare = onlineCard.filter((l) => hasBareToken(l));
    const dbl = onlineCard.filter((l) => l.includes('$$')).length;
    const same = onlineCard.join(NL) === localCard.join(NL);
    const ok =
      status === 200 && lines > 0 && localCard.length > 0 && same &&
      english.length === 0 && bare.length === 0 && dbl === 0;
    if (!ok) {
      bad++;
      const why: string[] = [];
      if (status !== 200) why.push('HTTP ' + status);
      if (lines === 0) why.push('线上卡片 0 行（提取器失效？）');
      if (localCard.length === 0) why.push('本地卡片 0 行');
      if (!same) why.push('与本地不一致 ⇒ ' + firstDiff(localCard, onlineCard));
      if (english.length) why.push('整行英文 ' + english.length + ' 行 ⇒ ' + JSON.stringify(english.slice(0, 2)));
      if (bare.length) why.push('裸 token ' + bare.length + ' 行');
      if (dbl) why.push('$$ ' + dbl + ' 处');
      problems.push(slug + '：' + why.join('；'));
    }
    console.log(
      (ok ? '✓' : '✗') +
        ' ' +
        slug.padEnd(52) +
        ' HTTP ' +
        status +
        ' | 卡片 ' +
        lines +
        ' 行（本地 ' +
        localCard.length +
        '）' +
        ' | 与本地一致=' +
        (same ? '是' : '否') +
        ' | 整行英文=' +
        english.length +
        ' | 裸token=' +
        bare.length +
        ' | $$=' +
        dbl,
    );
  }

  console.log(
    '—— 页数 ' +
      slugs.length +
      ' · 本地缺页 ' +
      noLocal +
      ' · 卡片总行数 ' +
      totalLines +
      ' · 不达标 ' +
      bad,
  );
  for (const p of problems) console.log('   ⚠ ' + p);
  if (totalLines === 0) {
    console.log('⛔ 卡片总行数 0 ⇒ 提取器整体失效 ⇒ 本轮结论无效');
  }
  process.exitCode = bad > 0 || noLocal > 0 || totalLines === 0 ? 1 : 0;
}

main();

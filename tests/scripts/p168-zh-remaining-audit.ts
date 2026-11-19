#!/usr/bin/env node
// P168 B3-13 —— **全站 zh 整行英文测量**（先红：拿到欠账基线）。
//
// 用法（从仓库根跑）：
//   cmd.exe /c "node node_modules\tsx\dist\cli.mjs tests\scripts\p168-zh-remaining-audit.ts"
//   cmd.exe /c "node node_modules\tsx\dist\cli.mjs tests\scripts\p168-zh-remaining-audit.ts --json"
//
// ⭐ 为什么需要它
//   本批（B3-13）目标：zh 页**零整行英文**。但 G4c 产物层守卫**只覆盖 TOKENIZED**
//   （45 个引擎）⇒ 剩下 55 个引擎的欠账在任何守卫的视野之外。
//   本工具就是那把尺子：**逐引擎量出 zh 侧整行英文行数**，先给出可复算的欠账基线
//   （本批基线：55 个引擎 / 734 行），供 B3-13 后续批次按台账核销。
//
// ⭐ 口径照抄 G4c（**不另写判据**）
//   测量函数直接复用 p168-card-text.mjs 的 staticCard + isEnglishLine
//   ⇒ 工具与守卫共用同一份真相源；自写更宽的判据必然假阳性（判绿是假的）。
//
// ⭐ 读 dist/（SSR 产物）⇒ 测的是**服务端渲染层**
//   ⇒ 必须先构建。客户端 beautify 后处理由 tests/beautify-no-hardcoded-copy-guard.test.ts
//   守（一个不变量只守一处）。
//
// ⚠️ 本文件**不是** test（文件名不带 .test.ts）⇒ 不进 walkTestSuites 的套件计数。

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import '../../src/engines/index.ts';
import { getAllEngines } from '../../src/core/engines/registry.ts';
import { staticCard, isEnglishLine } from './p168-card-text.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');

export function auditAll(): { slug: string; zhEn: number; cardLines: number }[] {
  const out: { slug: string; zhEn: number; cardLines: number }[] = [];
  for (const e of getAllEngines() as any[]) {
    const p = resolve(ROOT, 'dist', 'zh', e.slug, 'index.html');
    if (!existsSync(p)) continue;
    const card = staticCard(readFileSync(p, 'utf8'));
    out.push({ slug: e.slug, zhEn: card.filter(isEnglishLine).length, cardLines: card.length });
  }
  return out;
}

if (resolve(process.argv[1] ?? '') === resolve(import.meta.filename ?? '')) {
  const rows = auditAll().sort((a, b) => b.zhEn - a.zhEn);
  const todo = rows.filter((r) => r.zhEn > 0);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(todo, null, 2));
  } else {
    for (const r of todo) console.log(String(r.zhEn).padStart(4) + ' / ' + String(r.cardLines).padStart(3) + '  ' + r.slug);
    console.log('—— ' + todo.length + ' 个引擎 · zh 整行英文合计 ' + todo.reduce((s, r) => s + r.zhEn, 0) + ' 行');
  }
}

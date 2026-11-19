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
// ⚠️ **量不到就报错，绝不报 0**（复审 Important 1）
//   dist/ 是 gitignored ⇒ 新 checkout / CI 上**根本没有** dist/；旧 checkout 上可能是**过期**产物。
//   ⇒ 旧写法「缺页就 continue」让 auditAll() 静悄悄返回空集 ⇒ 工具打印
//     「—— 0 个引擎 · zh 整行英文合计 0 行」⇒ **一个像「欠账已清零」的假绿**
//     （台账里记 0 与真零无法区分；过期 dist 则给出一个看似合理、实则过期的数）。
//   ⇒ 现在：dist/zh 不存在 ⇒ stderr 报错 + exit 1；缺页（含**过期 dist**）⇒ 报出
//     「扫到 N/100」+ 缺页清单 + exit 1。
//   ⚠️ 报错只在 **CLI 路径**；auditAll() 自身**绝不 exit** ⇒ Task 2 import 它时不会把进程打死。
//
// ⭐ 两条**行数不同**的输出（别混用）
//   · auditAll() ⇒ **全部**有 zh 页的引擎（dist 齐全时 100 行，含 zhEn=0 的已令牌化引擎）
//   · --json     ⇒ 只含**欠账**行（zhEn>0，当前 55 条）—— 纯 JSON，无附加行
//   · 汇总行「—— N 个引擎 · zh 整行英文合计 M 行」里的 N/M 来自**欠账行**（55 / 734）
//
// ⭐ 被审计的构建标识（复审 Minor 4）
//   兄弟工具 p168-zh-audit.ts 会打印「被审计的 dist 构建：构建时间 + 内容哈希」⇒
//   重建后数值就会变 ⇒ 不带标识的数字不可复算。本工具照此给一个**自包含**的最小标识：
//   被审计的 100 个 dist/zh/<slug>/index.html 的 sha256 汇总 + 最新产物时间戳。
//   （p168-zh-audit.ts 的 buildIdentity() **没有导出**、且耦合 GSC 读取 ⇒ 复用不了 ⇒ 只留最小必要部分。）
//
// ⚠️ ROOT 可被 P168_AUDIT_ROOT 覆盖 —— **只为验证护栏**（把 ROOT 指到没有 dist/ 的目录，
//    实测「dist 缺失时必须显式失败」）。默认永远是仓库根。
//
// ⚠️ 本文件**不是** test（文件名不带 .test.ts）⇒ 不进 walkTestSuites 的套件计数。

import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import '../../src/engines/index.ts';
import { getAllEngines } from '../../src/core/engines/registry.ts';
import { staticCard, isEnglishLine } from './p168-card-text.mjs';

const ROOT = process.env.P168_AUDIT_ROOT
  ? resolve(process.env.P168_AUDIT_ROOT)
  : resolve(import.meta.dirname, '..', '..');

export function auditAll(): { slug: string; zhEn: number; cardLines: number }[] {
  const out: { slug: string; zhEn: number; cardLines: number }[] = [];
  for (const e of getAllEngines()) {
    const p = resolve(ROOT, 'dist', 'zh', e.slug, 'index.html');
    if (!existsSync(p)) continue;
    const card = staticCard(readFileSync(p, 'utf8'));
    out.push({ slug: e.slug, zhEn: card.filter(isEnglishLine).length, cardLines: card.length });
  }
  return out;
}

/**
 * 被审计的 dist 构建标识 —— 数字必须挂在**可辨认的构建**上，否则不可复算。
 * ⚠️ 与兄弟工具 p168-zh-audit.ts 的 buildIdentity() 同一思路，但**自包含**：
 *   那个函数没有导出、且耦合 GSC 目录读取 ⇒ 复用不了 ⇒ 这里只留最小必要部分
 *   （被审计页的内容哈希 + 最新产物时间戳）。
 */
function buildStamp(slugs: string[]): { stamp: string; hash: string; files: number } {
  const h = createHash('sha256');
  let maxMtime = 0;
  let files = 0;
  for (const s of [...slugs].sort()) {
    const p = resolve(ROOT, 'dist', 'zh', s, 'index.html');
    if (!existsSync(p)) continue;
    const buf = readFileSync(p);
    h.update(s + '|' + createHash('sha256').update(new Uint8Array(buf)).digest('hex') + '\n');
    files++;
    const mt = statSync(p).mtimeMs;
    if (mt > maxMtime) maxMtime = mt;
  }
  return {
    stamp: maxMtime ? new Date(maxMtime).toISOString() : '未知',
    hash: h.digest('hex').slice(0, 12),
    files,
  };
}

if (resolve(process.argv[1] ?? '') === resolve(import.meta.filename ?? '')) {
  // ⚠️ 以下护栏全在 **CLI 路径** —— auditAll() 自身绝不 exit（Task 2 会 import 它）。
  const engines = getAllEngines();
  const total = engines.length;
  if (!existsSync(resolve(ROOT, 'dist', 'zh'))) {
    console.error('⚠️ dist/zh 不存在 ⇒ 先跑 pnpm build:full（本工具测 SSR 产物；没构建就量不到任何东西）');
    process.exit(1);
  }
  const rows = auditAll().sort((a, b) => b.zhEn - a.zhEn);
  const have = new Set(rows.map((r) => r.slug));
  const missing = engines.filter((e) => !have.has(e.slug)).map((e) => e.slug);
  if (missing.length) {
    // ⚠️ 缺页 = dist 过期（构建时引擎还少）⇒ 数字不完整 ⇒ 不可入台账
    console.error('⚠️ 只扫到 ' + rows.length + '/' + total + ' 个引擎的 zh 页 ⇒ 缺 ' + missing.length + ' 个：' + missing.join('、'));
    console.error('   ⇒ 本次数字**不完整**，不可入台账（先补构建：pnpm build:full）');
    process.exit(1);
  }
  const todo = rows.filter((r) => r.zhEn > 0);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(todo, null, 2));
  } else {
    for (const r of todo) console.log(String(r.zhEn).padStart(4) + ' / ' + String(r.cardLines).padStart(3) + '  ' + r.slug);
    const build = buildStamp(rows.map((r) => r.slug));
    console.log('扫描：' + rows.length + '/' + total + ' 个引擎的 zh 页（缺页 ' + missing.length + '）');
    console.log('被审计的 dist 构建：构建时间 ' + build.stamp + '（UTC） · 内容哈希 sha256:' + build.hash + '（' + build.files + ' 个 zh 页）');
    console.log('—— ' + todo.length + ' 个引擎 · zh 整行英文合计 ' + todo.reduce((s, r) => s + r.zhEn, 0) + ' 行');
  }
}

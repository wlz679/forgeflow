#!/usr/bin/env node
// P168 —— **行内中英混排**复算脚本（可复算工具，**入库**）。
//
// ⭐ 为什么要有它（2026-11-25 复审 M-1）：
//   CHANGELOG / AGENTS.md 里那句「46 行中英混排」**只在一个很窄的口径下成立**
//   （组 3 的 12 个引擎 + englishWords>=1）⇒ 读者容易误读成「全站只有 46 行」
//   ⇒ **低估下一批（中英混排批）的工作量约 17 倍**（46 → 785）。
//   ⇒ 既然这些数字要写进文档，就**必须有一份能被别人复算的脚本**（否则只是「作者说过」）。
//
// 口径（**唯一口径**，不要另写一份检测逻辑）：
//   · 行 = zh 产物页静态卡片的一行（staticCard(dist/zh/<slug>/index.html)）
//   · 中英混排 = countCJK(line) > 0 **且** countEnglishWords(line) >= N
//     （N 取 1 / 3 两档 —— N=1 是「有英文词就算」，N=3 是仓库既有的 isEnglishLine 阈值）
//   · 检测函数全部复用 tests/scripts/p168-card-text.mjs（countCJK / countEnglishWords / staticCard）
//
// 分组（B3_15_BATCH 的顺序切分 —— 见 p168-tokenized-engines.mjs）：
//   组 1 = slice(0,3)   —— B 档 3 个
//   组 2 = slice(3,15)  —— C 档组 A（K 知识库 6 + L 法律合规 6）
//   组 3 = slice(15,27) —— C 档组 B（T 客服 6 + H 招聘团队 6）
//   本批 27 = B3_15_BATCH 全量
//   全站 100 = TOKENIZED 全量
//
// 用法（**必须从仓库根运行**；纯 .mjs ⇒ **不要**加 --import tsx）：
//      node tests/scripts/p168-mixed-language-recount.mjs
//      node tests/scripts/p168-mixed-language-recount.mjs --json
//
// ⚠️ 数据源是 dist/（SSR 产物）⇒ 读的是**服务端渲染层**的 zh 页。
//   dist/ 是 gitignored ⇒ 新 checkout 上没有 dist ⇒ 本脚本会**显式失败**（exit 1），
//   不会给出一个「看起来合理」的假数字（缺页也会显式报出）。
//
// ⚠️ 本文件**不是** test（文件名不带 .test.ts）⇒ 不进 walkTestSuites 的套件计数。
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

import { countCJK, countEnglishWords, staticCard } from './p168-card-text.mjs';
import { TOKENIZED, B3_15_BATCH, B3_13_BATCH } from './p168-tokenized-engines.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');
const JSON_OUT = process.argv.includes('--json');
/** englishWords 阈值两档 */
const THRESHOLDS = [1, 3];

const GROUPS = [
  { name: '组1（B档 3 引擎）', items: B3_15_BATCH.slice(0, 3) },
  { name: '组2（C档组A · 12 引擎）', items: B3_15_BATCH.slice(3, 15) },
  { name: '组3（C档组B · 12 引擎）', items: B3_15_BATCH.slice(15, 27) },
  { name: '本批 27 引擎', items: B3_15_BATCH },
  { name: '全站 100 引擎', items: TOKENIZED },
  // ⭐ 追加：更早批次（B3-13 的 10 个引擎）—— AGENTS.md 同族教训五里那句「35 行」的历史口径，
  //   没有这行就没法复算「35」到底是哪个范围的 35。
  { name: 'B3-13 批次 10 引擎（历史口径「35 行」出处）', items: B3_13_BATCH },
];

/** 一个引擎的 zh 页里，每档阈值下的混排行数 */
function measureEngine(slug) {
  const p = resolve(ROOT, 'dist', 'zh', slug, 'index.html');
  if (!existsSync(p)) return { slug, missing: true, cardLines: 0, per: {} };
  const card = staticCard(readFileSync(p, 'utf8'));
  const per = {};
  for (const n of THRESHOLDS) {
    per['ew' + n] = card.filter((line) => countCJK(line) > 0 && countEnglishWords(line) >= n).length;
  }
  return { slug, missing: false, cardLines: card.length, per };
}

/** 被审计的 dist 构建标识 —— 数字必须挂在**可辨认的构建**上，否则不可复算 */
function buildStamp(slugs) {
  const h = createHash('sha256');
  let maxMtime = 0;
  let files = 0;
  for (const s of [...slugs].sort()) {
    const p = resolve(ROOT, 'dist', 'zh', s, 'index.html');
    if (!existsSync(p)) continue;
    h.update(s + '|' + createHash('sha256').update(new Uint8Array(readFileSync(p))).digest('hex') + '\n');
    files++;
    const mt = statSync(p).mtimeMs;
    if (mt > maxMtime) maxMtime = mt;
  }
  return { stamp: maxMtime ? new Date(maxMtime).toISOString() : '未知', hash: h.digest('hex').slice(0, 12), files };
}

if (!existsSync(resolve(ROOT, 'dist', 'zh'))) {
  console.error('⚠️ dist/zh 不存在 ⇒ 先跑 pnpm build:full（本工具测 SSR 产物；没构建就量不到任何东西）');
  process.exit(1);
}

const bySlug = new Map();
const missingAll = [];
for (const g of GROUPS) {
  for (const it of g.items) {
    if (bySlug.has(it.slug)) continue;
    const r = measureEngine(it.slug);
    if (r.missing) missingAll.push(it.slug);
    bySlug.set(it.slug, r);
  }
}

const groups = GROUPS.map((g) => {
  const detail = g.items.map((it) => bySlug.get(it.slug));
  const totals = {};
  for (const n of THRESHOLDS) {
    totals['ew' + n] = detail.reduce((s, r) => s + (r.per['ew' + n] ?? 0), 0);
  }
  const missing = detail.filter((r) => r.missing).map((r) => r.slug);
  return { name: g.name, engines: g.items.length, totals, missing, detail };
});

const build = buildStamp([...bySlug.keys()]);

if (JSON_OUT) {
  console.log(JSON.stringify({ build, groups }, null, 2));
} else {
  console.log('== 口径：zh 产物页静态卡片 · 一行内 countCJK>0 且 countEnglishWords>=N ==');
  console.log('== 分组：B3_15_BATCH 顺序切分（组1=slice(0,3) 组2=slice(3,15) 组3=slice(15,27)） ==');
  for (const g of groups) {
    console.log('');
    console.log('── ' + g.name + '（' + g.engines + ' 引擎）· ew>=1 = ' + g.totals.ew1 + ' 行 · ew>=3 = ' + g.totals.ew3 + ' 行 · 缺页 ' + g.missing.length + ' 个');
    for (const r of g.detail) {
      if (r.missing) { console.log('   ⚠️ 缺页 ' + r.slug); continue; }
      console.log('   ' + String(r.per.ew1).padStart(3) + ' / ' + String(r.per.ew3).padStart(3) + '  ' + r.slug);
    }
  }
  console.log('');
  console.log('被审计的 dist 构建：构建时间 ' + build.stamp + '（UTC） · 内容哈希 sha256:' + build.hash + '（' + build.files + ' 个 zh 页）');
  console.log('—— 缺页合计 ' + missingAll.length + ' 个' + (missingAll.length ? '：' + missingAll.join('、') : ''));
}

if (missingAll.length) {
  console.error('⚠️ 缺页 ⇒ dist 过期（构建时引擎还少）⇒ 数字不完整 ⇒ 不可写进文档（先补构建：pnpm build:full）');
  process.exit(1);
}

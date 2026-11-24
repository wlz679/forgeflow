#!/usr/bin/env node
// P168 B3-13 —— 「zh 整行英文」欠账台账（测量 + 销账清单）。
//
// 为什么必须有它（不是「再加一个守卫」）
// ---------------------------------------------
//   G4c（产物层守卫：zh 结果卡片不得有整行英文）**只覆盖 TOKENIZED**（55 个已令牌化引擎）
//   ⇒ 剩下 36 个引擎的 zh 欠账**不在任何守卫的视野里**。
//   ⇒ 「把 36 个引擎的欠账做完」与「把欠账藏进 locale」都能让 CI 全绿
//   ⇒ 本台账把这件事变成**显式、可核销、可复算**的清单：
//     · 实测（loadZhEnRows）—— 逐引擎量出 zh 侧整行英文行数；
//     · 登记（ZH_EN_DEBT）—— 人写的欠账清单（slug → 行数）；
//     · 核对（守卫）—— 实测集合 ≡ 台账集合（双向）且逐条行数相等。
//
// ⭐ 口径照抄 G4c（**不另写判据**）
//   测量函数直接 import Task 1 的 p168-zh-remaining-audit.ts 的 auditAll()
//   （它用 p168-card-text.mjs 的 staticCard + isEnglishLine）
//   ⇒ 工具与守卫共用**一份真相源**；自写更宽的判据必然假阳性（口径宽于守卫 ⇒ 判绿是假的）。
//   ⇒ 本文件**不自己读 dist** ⇒ 全仓的 zh 整行英文测量逻辑只有 Task 1 一处。
//
// ⭐ 台账只能变小不能变大（销账制）
//   修好一个引擎（令牌化 ⇒ zh 页不再有整行英文）⇒ **同 commit** 从 ZH_EN_DEBT 删掉该条。
//   ⇒ 规模上限 DEBT_MAX 由守卫守着 ⇒ 台账条目数不许超过本批基线。
//   ⇒ 条目按 **slug 字典序**登记（与 --emit 的输出逐字一致 ⇒ 贴回即可，不产生无谓 diff）。
//
// ⚠️ P168_AUDIT_ROOT 覆盖（Task 1 的护栏，必须知道这件事）
//   p168-zh-remaining-audit.ts 的 ROOT 可被 P168_AUDIT_ROOT 覆盖
//   （那是为了验证「dist 缺失时必须显式失败」而留的开关）。
//   ⇒ 若该环境变量在本进程里生效，本台账**量的是另一个根目录** ⇒ 数字不可与仓库基线直接比较。
//   ⇒ 本文件的 CLI 把**被测根目录**打出来；守卫核「扫到的引擎数 = 全仓引擎数」
//     ⇒ 免得在错误的根上得出「零欠账」的假绿。
//
// 用法（必须从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-tokenize-remaining-ledger.ts           # 摘要 + 逐引擎降序表
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-tokenize-remaining-ledger.ts --json    # 机器可读
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-tokenize-remaining-ledger.ts --emit    # 台账源码块（**独立模式**：stdout 只有这块，可重定向后原样贴回 ZH_EN_DEBT）
//
// ⚠️ 本文件**不是** test（文件名不带 .test.ts）⇒ 不进 walkTestSuites 的套件计数。

import { resolve } from 'node:path';
// ⭐ 唯一的测量来源 —— 本文件**不重新实现** isEnglishLine。
import { auditAll } from './p168-zh-remaining-audit.ts';
import '../../src/engines/index.ts';
import { getAllEngines } from '../../src/core/engines/registry.ts';

/** 逐引擎实测行 */
export interface ZhEnRow {
  slug: string;
  /** zh 侧整行英文的行数（0 = 已清零） */
  zhEn: number;
  /** zh 侧结果卡片的总行数（分母，用来判断这一页是不是「小到没内容」） */
  cardLines: number;
}

/**
 * 本批的**规模上限** —— 台账条目数不得超过它。
 *
 * ⭐ 为什么需要它（台账「只能变小不能变大」的可执行形式）
 *   T1 要求「实测有欠账的引擎必须登记进台账」⇒ 单看 T1，台账**可以变大**。
 *   ⇒ 那正是「欠账在增长」的情形 ⇒ 必须有一个**独立于实测**的硬上限把它挡住。
 *   ⇒ 修好一条销一条 ⇒ 条目数只应下降 ⇒ 超过基线（36）就是欠账在长。
 */
export const DEBT_MAX = 12;

/**
 * 台账：当前已知的「zh 页整行英文」欠账（**未令牌化**的那 12 个引擎 —— P168 B3-15 组 3 的 T/H 两组）。
 * · **不得新增**：修好一条必须销一条 ⇒ 台账只能变小不能变大（DEBT_MAX 守着规模上限）。
 * · 数字必须与实测一致（守卫会核）⇒ 台账条目不是空壳。
 * · 条目按 slug 字典序排列（= --emit 的输出顺序 ⇒ 贴回即可）。
 */
export const ZH_EN_DEBT: Record<string, number> = {
  'solopreneur-attrition-cost-calculator': 2,
  'solopreneur-comp-banding-calculator': 1,
  'solopreneur-cost-per-support-ticket-calculator': 2,
  'solopreneur-csat-calculator': 1,
  'solopreneur-deflection-rate-calculator': 2,
  'solopreneur-equity-refresh-calculator': 2,
  'solopreneur-first-response-time-calculator': 2,
  'solopreneur-fully-loaded-employee-cost-calculator': 2,
  'solopreneur-productivity-ramp-curve-calculator': 2,
  'solopreneur-resolution-time-calculator': 2,
  'solopreneur-support-capacity-planning-calculator': 2,
  'solopreneur-time-to-productivity-calculator': 2,
};

/**
 * 被审计的根目录 —— **镜像** p168-zh-remaining-audit.ts 的 ROOT 表达式。
 *
 * ⚠️ 那边没有导出 ROOT ⇒ 这里镜像同一表达式，只为把「量的是哪个根」显式打出来。
 *   两处若不一致 ⇒ 打印出来的根与实际测量的根不是同一个 ⇒ 数字不可信。
 */
const MEASURED_ROOT = process.env.P168_AUDIT_ROOT
  ? resolve(process.env.P168_AUDIT_ROOT)
  : resolve(import.meta.dirname, '..', '..');

/**
 * 逐引擎实测（**不过滤**）：返回所有**有 zh 页**的引擎，含 zhEn = 0 的已令牌化引擎。
 *
 * ⚠️ 口径来自 Task 1 的 auditAll()（staticCard + isEnglishLine）⇒ 与 G4c 同源。
 * ⚠️ 返回**不完整**的集合（dist 过期 / 缺页）时，调用方必须自己核「扫到的引擎数 = 全仓引擎数」
 *   —— 量不到就报错，绝不报 0（Task 1 的教训）。
 */
export function loadZhEnRows(): ZhEnRow[] {
  return auditAll();
}

/** slug 字典序（不依赖 locale ⇒ 结果可复现） */
function bySlug(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// ── CLI ────────────────────────────────────────────────────────────────
function isCli(): boolean {
  const self = resolve(import.meta.dirname, 'p168-tokenize-remaining-ledger.ts');
  return resolve(process.argv[1] ?? '') === self;
}

if (isCli()) {
  const json = process.argv.includes('--json');
  const emit = process.argv.includes('--emit');
  const rows = loadZhEnRows();
  const total = getAllEngines().length;
  // ⚠️ 量不到就报错，绝不报 0 —— 缺页（dist 过期）时下面的数字**不完整**，不可入台账。
  if (rows.length < total) {
    console.error('⚠️ 只扫到 ' + rows.length + '/' + total + ' 个引擎的 zh 页 ⇒ 数字不完整，不可入台账（先补构建：pnpm build:full）');
    process.exit(1);
  }
  const debt = rows
    .filter((r) => r.zhEn > 0)
    .sort((a, b) => b.zhEn - a.zhEn || bySlug(a.slug, b.slug));
  const debtRows = debt.reduce((s, r) => s + r.zhEn, 0);
  const ledgerEntries = Object.keys(ZH_EN_DEBT).length;
  const ledgerRows = Object.values(ZH_EN_DEBT).reduce((s, n) => s + n, 0);
  const measuredSet = new Set(debt.map((r) => r.slug));
  const ledgerSet = new Set(Object.keys(ZH_EN_DEBT));
  const diff = [...measuredSet].filter((s) => !ledgerSet.has(s)).length
    + [...ledgerSet].filter((s) => !measuredSet.has(s)).length;
  // ⭐ --emit 是**独立模式**：stdout **只有**台账源码块（不含表格/汇总行）
  //   ⇒ 重定向到文件即可**原样**贴回 ZH_EN_DEBT（不夹带别的行 ⇒ 贴回不产生垃圾）。
  if (emit) {
    for (const r of [...debt].sort((a, b) => bySlug(a.slug, b.slug))) {
      console.log("  '" + r.slug + "': " + r.zhEn + ',');
    }
  } else if (json) {
    console.log(JSON.stringify({
      root: MEASURED_ROOT,
      scanned: rows.length,
      totalEngines: total,
      debtEngines: debt.length,
      debtRows,
      ledger: { entries: ledgerEntries, rows: ledgerRows, max: DEBT_MAX, matchesMeasured: diff === 0 },
      rows: debt,
    }, null, 2));
  } else {
    for (const r of debt) console.log(String(r.zhEn).padStart(4) + ' / ' + String(r.cardLines).padStart(3) + '  ' + r.slug);
    console.log('扫描：' + rows.length + '/' + total + ' 个引擎的 zh 页（缺页 ' + (total - rows.length) + '）');
    console.log('被审计的根目录：' + MEASURED_ROOT
      + (process.env.P168_AUDIT_ROOT ? '（⚠️ P168_AUDIT_ROOT 已覆盖 ⇒ 数字不可与仓库基线直接比较）' : ''));
    console.log('台账：' + ledgerEntries + ' 条 / 上限 ' + DEBT_MAX + ' · 登记 ' + ledgerRows + ' 行 · 与实测'
      + (diff === 0 ? '一致 ✓' : '不一致 ✗（差 ' + diff + ' 条）'));
    console.log('—— ' + debt.length + ' 个引擎 · zh 整行英文合计 ' + debtRows + ' 行');
  }
  process.exitCode = 0;
}

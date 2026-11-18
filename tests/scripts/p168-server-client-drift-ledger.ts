#!/usr/bin/env node
// P168 B3-10 —— G6「服务端 ≡ 客户端」漂移的**可销账台账**（测量 + 分类 + 校验）。
//
// 为什么需要它（B3-9 收尾时实测）
// ----------------------------------
//   G6 守的是「**已令牌化**的 45 个引擎两侧必须逐字一致」⇒ **其余 55 个引擎没人管**。
//   实测全仓：100 个引擎 · 一致 **68** · **漂移 32**（B3-7 之前是 55 条漂移 ⇒ 令牌化确实在销账）。
//   ⭐ 2026-11-18 B3-10：这 32 条**已全部修完**（客户端 customFn 改为服务端同一份代码的派生物）
//     ⇒ DRIFT_DEBT 清零；「台账必须非空」那条断言同步移除（它守的是「欠账存在」这个**回溯型**不变量
//     ⇒ 修好之后反而挡住修复）⇒ 改成守**目标型**不变量的「测量必须覆盖每一个引擎」。
//   ⇒ 这 32 条是「静态卡片与动态卡片**内容矛盾**」的已知欠账，但此前**不可见、不可守**。
//
// 三件事（缺一不可）
//   ① **分类**：把漂移分成「客户端整段缺失 / 客户端多输出 / 措辞微差 / 顺序或某行不同 / 抛错」
//      ⇒ 分类决定修法与优先级（整段缺失 = 用户看不到内容，最严重）
//   ② **台账**：每条登记 slug + 分类 + 人写的理由 ⇒ 修好一条销一条 ⇒ **台账只能变小不能变大**
//   ③ **校验**（在守卫里）：实测漂移集合 ≡ 台账集合（双向）+ 每条的分类与实测一致 + 台账非空
//
// ⭐ 分类逻辑与台账**同处这一个模块** ⇒ 工具与守卫共用一份真相源（规则只有一处）。
// ⭐ 测量**可复现**：实测连续两次跑出的漂移集合逐字相同（32 = 32）⇒ 台账不会因随机而漂。
//
// 用法（必须从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-server-client-drift-ledger.ts           # 摘要 + 分类
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-server-client-drift-ledger.ts --detail  # 每条的首行差异证据
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-server-client-drift-ledger.ts --json     # 机器可读
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-server-client-drift-ledger.ts --emit    # 打印台账源码块（贴进本文件）

import { resolve } from 'node:path';

import '../../src/engines/index.ts';
import { getAllEngines } from '../../src/core/engines/registry.ts';
import { browserPick, browserFill, codegenDefaults, syntheticInputs } from './p168-server-client-parity.ts';

const NL = String.fromCharCode(10);

/** 漂移的分类 —— 决定修法与优先级 */
export type DriftKind =
  | 'error'            // 服务端或客户端抛错
  | 'missing-section'  // 客户端**整段缺失**（用户点计算会看不到这段内容）
  | 'extra-section'    // 客户端**多输出**
  | 'wording'          // 行数相同、措辞/数值微差
  | 'content';         // 行数与字符数都相同，但内容/顺序不同

export interface DriftRow {
  slug: string;
  kind: DriftKind;
  serverLines: number;
  clientLines: number;
  serverChars: number;
  clientChars: number;
  firstDiffLine: number;
  serverLine: string;
  clientLine: string;
  serverError: string | null;
  clientError: string | null;
}

/**
 * 台账：当前已知的 G6 漂移（**未令牌化**的那些引擎）。
 * · **不得新增**；修好一条必须销一条 ⇒ 台账只能变小不能变大。
 * · `kind` 必须与实测一致（守卫会核）⇒ 台账条目不是空壳。
 * · `note` 是人写的理由（决定这条归 B3-10 的哪一类修法）。
 */
export const DRIFT_DEBT: Record<string, { kind: DriftKind; note: string }> = {
};

function joinText(out: unknown): string {
  return Array.isArray(out) ? out.map(String).join(NL) : String(out);
}

function classify(
  server: string | null,
  client: string | null,
  sLines: string[],
  cLines: string[],
  serverError: string | null,
  clientError: string | null,
): DriftKind {
  if (serverError || clientError) return 'error';
  if (cLines.length < sLines.length) return 'missing-section';
  if (cLines.length > sLines.length) return 'extra-section';
  if ((server ?? '').length !== (client ?? '').length) return 'wording';
  return 'content';
}

function firstDiff(sLines: string[], cLines: string[]): { index: number; s: string; c: string } {
  const n = Math.max(sLines.length, cLines.length);
  for (let i = 0; i < n; i++) {
    if (sLines[i] !== cLines[i]) return { index: i + 1, s: sLines[i] ?? '', c: cLines[i] ?? '' };
  }
  return { index: 0, s: '', c: '' };
}

/** 跑一遍：只返回**漂移**的引擎（一致的直接跳过） */
/**
 * 覆盖率：每个**带 customFn** 的引擎都必须能被 `new Function` **成功构造**。
 *
 * ⭐ 2026-11-18 B3-10：台账清零后，「台账必须非空」那条断言已移除（它守的是「欠账存在」
 *   这个**回溯型**不变量 ⇒ 修好之后反而挡住修复）⇒ 改成守**目标型**不变量：测量不许漏引擎。
 *   顺带堵上真空绿：customFn 语法错误 ⇒ 该页动态卡片整页空白，必须显式报出来而不是被 catch 掉。
 */
export function customFnCoverage(): { withCustomFn: number; parseFailures: string[] } {
  const engines = getAllEngines() as any[];
  const parseFailures: string[] = [];
  let withCustomFn = 0;
  for (const e of engines) {
    const cf = e.clientConfig && e.clientConfig.customFn;
    if (typeof cf !== 'string' || cf.length === 0) continue;
    withCustomFn++;
    try {
      new Function('inputs', 'pick', 'fill', cf);
    } catch (err: any) {
      parseFailures.push(e.slug + '：' + String(err && err.message));
    }
  }
  return { withCustomFn, parseFailures };
}
export function measureDrift(engines: any[], defaults: Record<string, Record<string, string>>): DriftRow[] {
  const rows: DriftRow[] = [];
  for (const e of engines) {
    const cf = e.clientConfig && e.clientConfig.customFn;
    if (typeof cf !== 'string' || cf.length === 0) continue;
    const d = defaults[e.slug];
    const inputs = d ?? syntheticInputs(e);
    let server: string | null = null;
    let serverError: string | null = null;
    try {
      const gen = e.generate ?? e.calculate;
      server = joinText(gen.call(e, inputs));
    } catch (err: any) {
      serverError = String(err && err.message);
    }
    let client: string | null = null;
    let clientError: string | null = null;
    try {
      const fn = new Function('inputs', 'pick', 'fill', cf);
      client = joinText(fn(inputs, browserPick, browserFill));
    } catch (err: any) {
      clientError = String(err && err.message);
    }
    if (server !== null && client !== null && server === client) continue;
    const sLines = server === null ? [] : server.split(NL);
    const cLines = client === null ? [] : client.split(NL);
    const kind = classify(server, client, sLines, cLines, serverError, clientError);
    const d0 = firstDiff(sLines, cLines);
    rows.push({
      slug: e.slug,
      kind,
      serverLines: sLines.length,
      clientLines: cLines.length,
      serverChars: server === null ? 0 : server.length,
      clientChars: client === null ? 0 : client.length,
      firstDiffLine: d0.index,
      serverLine: d0.s,
      clientLine: d0.c,
      serverError,
      clientError,
    });
  }
  return rows;
}

/** 全仓（或指定 slug 集合）的漂移行 */
export function loadDriftRows(slugs?: string[]): DriftRow[] {
  const engines = getAllEngines() as any[];
  const use = slugs && slugs.length > 0 ? engines.filter((e) => slugs.includes(e.slug)) : engines;
  return measureDrift(use, codegenDefaults());
}

// ── CLI ────────────────────────────────────────────────────────────────
function isCli(): boolean {
  const self = resolve(import.meta.dirname, 'p168-server-client-drift-ledger.ts');
  return resolve(process.argv[1] ?? '') === self;
}

if (isCli()) {
  const rows = loadDriftRows();
  const json = process.argv.includes('--json');
  const detail = process.argv.includes('--detail');
  const emit = process.argv.includes('--emit');
  const byKind = new Map<string, DriftRow[]>();
  for (const r of rows) {
    const arr = byKind.get(r.kind) ?? [];
    arr.push(r);
    byKind.set(r.kind, arr);
  }
  if (json) {
    console.log(JSON.stringify({ total: rows.length, byKind: Object.fromEntries(byKind), rows }, null, 2));
  } else {
    console.log('漂移 ' + rows.length + ' 条 · 分类：' + [...byKind.entries()].map(([k, v]) => k + ' ' + v.length).join(' / '));
    for (const r of rows) {
      console.log(
        '  [' + r.kind + '] ' + r.slug +
        ' | 服务端 ' + r.serverLines + '行/' + r.serverChars + '字符 vs 客户端 ' + r.clientLines + '行/' + r.clientChars + '字符'
        + (detail
          ? ' | 首行差异 #' + r.firstDiffLine + ' 服务端「' + r.serverLine.slice(0, 70) + '」 客户端「' + r.clientLine.slice(0, 70) + '」'
          : '')
        + (r.serverError ? ' | 服务端抛错 ' + r.serverError : '')
        + (r.clientError ? ' | 客户端抛错 ' + r.clientError : ''),
      );
    }
  }
  if (emit) {
    console.log('');
    console.log('// ── 台账（贴回上面的 DRIFT_DEBT）──');
    for (const r of rows) {
      console.log("  '" + r.slug + "': { kind: '" + r.kind + "', note: 'TODO' },");
    }
  }
  process.exitCode = 0;
}
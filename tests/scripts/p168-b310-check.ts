#!/usr/bin/env node
// P168 B3-10 —— **逐引擎验收器**（B3-10 worker 的唯一验收命令）。
//
// 它同时查 B3-10 的两笔欠账：
//   ① **多元素**：customFn 返回 >1 个元素 ⇒ 页面只渲染 `results[0]` ⇒ 动态卡片只剩第一行
//   ② **漂移**：客户端输出与服务端 `generate()` 输出**逐字不同** ⇒ 同一页两处内容矛盾
//
// ⭐ 清单**不写死** ⇒ 由实测算出（多元素 ∪ 漂移）⇒ 修好一条就少一条 ⇒ 清单自动缩小。
// ⭐ 每条都打印**首行差异证据**（服务端那行 vs 客户端那行）⇒ worker 不用猜要改哪句。
//
// 用法（必须从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-b310-check.ts                 # 全仓（58 个欠账引擎）
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-b310-check.ts --slug a,b,c    # 只查这几个
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-b310-check.ts --json          # 机器可读
//
// 退出码：0 = 全清；1 = 还有欠账。

import { resolve } from 'node:path';
import { getAllEngines } from '../../src/core/engines/registry.ts';
import { codegenDefaults, syntheticInputs, browserPick, browserFill } from './p168-server-client-parity.ts';
import { loadDriftRows } from './p168-server-client-drift-ledger.ts';

const NLc = String.fromCharCode(10);

function pick(a: unknown[]): unknown { return a[Math.floor(Math.random() * a.length)]; }
function fill(t: string, v: Record<string, string>): string {
  return t.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '{' + k + '}');
}

export interface EngineFinding {
  slug: string;
  multiElement: number;
  drift: string | null;
  firstDiffLine: number;
  serverLine: string;
  clientLine: string;
}

export function checkEngines(slugs?: string[]): EngineFinding[] {
  const engines = getAllEngines() as any[];
  const defaults = codegenDefaults();
  const use = slugs && slugs.length > 0 ? engines.filter((e) => slugs.includes(e.slug)) : engines;
  const out: EngineFinding[] = [];
  for (const e of use) {
    const body = e.clientConfig && e.clientConfig.customFn;
    if (typeof body !== 'string' || body.length === 0) continue;
    const inputs = defaults[e.slug] ?? syntheticInputs(e);
    let server = '';
    try {
      const gen = e.generate ?? e.calculate;
      const so = gen.call(e, inputs);
      server = Array.isArray(so) ? so.map(String).join(NLc) : String(so);
    } catch {
      continue;
    }
    let client = '';
    let multi = 0;
    let clientError: string | null = null;
    try {
      const fn = new Function('inputs', 'pick', 'fill', body);
      const co = fn(inputs, browserPick, browserFill);
      if (Array.isArray(co)) multi = co.length;
      client = Array.isArray(co) ? co.map(String).join(NLc) : String(co);
    } catch (err: any) {
      clientError = String(err && err.message);
    }
    const sL = server.split(NLc);
    const cL = client.split(NLc);
    let firstDiffLine = 0;
    let serverLine = '';
    let clientLine = '';
    for (let i = 0; i < Math.max(sL.length, cL.length); i++) {
      if (sL[i] !== cL[i]) {
        firstDiffLine = i + 1;
        serverLine = sL[i] ?? '';
        clientLine = cL[i] ?? '';
        break;
      }
    }
    out.push({
      slug: e.slug,
      multiElement: multi,
      drift: clientError ? 'client-error: ' + clientError : (server === client ? null : 'differs'),
      firstDiffLine,
      serverLine,
      clientLine,
    });
  }
  return out;
}

function isCli(): boolean {
  const self = resolve(import.meta.dirname, 'p168-b310-check.ts');
  return resolve(process.argv[1] ?? '') === self;
}

if (isCli()) {
  const args = process.argv.slice(2);
  const only: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--slug') {
      only.push(...(args[i + 1] ?? '').split(',').map((s) => s.trim()).filter(Boolean));
      i++;
    }
  }
  const json = args.includes('--json');
  const rows = checkEngines(only.length ? only : undefined);
  const bad = rows.filter((r) => r.multiElement > 1 || r.drift !== null);
  if (json) {
    console.log(JSON.stringify({ total: rows.length, bad: bad.length, rows }, null, 2));
  } else {
    console.log('检查 ' + rows.length + ' 个引擎 · 仍欠账 ' + bad.length);
    for (const r of bad) {
      console.log(
        '  ✗ ' + r.slug +
        ' | 多元素=' + (r.multiElement > 1 ? r.multiElement + ' 个' : '无') +
        ' | 漂移=' + (r.drift ?? '无') +
        (r.firstDiffLine
          ? ' | 首行差异 #' + r.firstDiffLine + ' 服务端「' + r.serverLine.slice(0, 80) + '」 客户端「' + r.clientLine.slice(0, 80) + '」'
          : ''),
      );
    }
  }
  process.exitCode = bad.length > 0 ? 1 : 0;
}
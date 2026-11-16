#!/usr/bin/env node
// P168 B3-8 —— **令牌化自检**（source-only，不需要 build / 不依赖 git 基线）。
//
// 用法：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-token-selfcheck.ts            # 全部 25 个
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-token-selfcheck.ts burn_rate  # 只看一个
//
// ⭐ 守四件事（每条都是**不变量**，不是代理指标）：
//   ① **英文页零变化**：
//      · codegen 重生成**之前**（staticExamples[0] 还是纯英文）⇒ 判据 =
//        「token 的英文兜底渲染」==「未改动的 staticExamples[0]」逐字相同
//      · codegen 重生成**之后**（staticExamples[0] 已含 token）⇒ 判据 =
//        「staticExamples[0] 的兜底渲染」==「generate() 的兜底渲染」逐字相同
//      ⇒ 两个阶段都有可复算的判据，且都不依赖 git 历史。
//      ⚠️ 「已登记的有意差异」复用 p168-en-page-parity.ts 的 ALLOWED_DIFFS（同一份真相源）。
//   ② **两端 token 集合一致**：服务端 output 与客户端 customFn 吐的 code 集合必须相同
//      （G3 是源码级静态扫描；本条是**运行时**验证，能抓到静态扫描看不出的形态差异）
//   ③ **fallback 里不得含半角 |**（`beautifySections` 用 ` | ` 切维度行 ⇒ 会把行切错）
//   ④ **params 值里不得含花括号**（params 组是 \{[^{}]*\} ⇒ 含花括号会让整个 token 退化成裸码）
//
// ⚠️ 本文件**不是** test（文件名不带 .test.ts）⇒ 不进 walkTestSuites 的套件计数。

import { resolve } from 'node:path';
import '../../src/engines/index.ts';
import { getAllEngines } from '../../src/core/engines/registry.ts';
import { renderCalcOutput, extractTokenCodes } from '../../src/lib/calc-output-i18n.ts';
import { TOKENIZED } from './p168-tokenized-engines.mjs';
import { codegenDefaults, syntheticInputs } from './p168-server-client-parity.ts';
import { ALLOWED_DIFFS, normalizeDates } from './p168-en-page-parity.ts';

const NL = String.fromCharCode(10);
const TOKEN_RE = /\$([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)(\{[^{}]*\})?(?:\|((?:(?!\$[a-z])[^|\n\r])*)\|)?/g;

export interface SelfcheckRow {
  slug: string; alias: string;
  enSame: boolean; enAllowed: boolean; enNote: string; enDiffs: string[];
  codeSame: boolean; onlyServer: string[]; onlyClient: string[];
  serverCodes: number; clientCodes: number;
  badPipe: number; badBrace: number; badJson: number;
}

function join(out: unknown): string {
  return Array.isArray(out) ? out.map(String).join(NL) : String(out);
}

export function selfcheck(slug: string, alias: string): SelfcheckRow {
  const engines = getAllEngines() as any[];
  const eng = engines.find((e) => e.slug === slug);
  const defaults = codegenDefaults();
  const inputs = defaults[slug] ?? syntheticInputs(eng);
  const gen = eng.generate ?? eng.calculate;
  const serverRaw = join(gen.call(eng, inputs));
  const cf = eng.clientConfig && eng.clientConfig.customFn;
  const clientRaw = join(new Function('inputs', 'pick', 'fill', cf)(inputs, (a: any) => a, (a: any, b: any) => b));

  // ① 英文页零变化
  const base = String(eng.staticExamples?.[0] ?? '');
  const baseHasToken = extractTokenCodes(base).length > 0;
  const renderedServer = renderCalcOutput(serverRaw, {});
  const enNote = baseHasToken
    ? 'staticExamples[0] vs generate()（两侧都兜底渲染）'
    : '兜底渲染 vs 未 codegen 的 staticExamples[0]';
  // ⭐ 基线侧也要兜底渲染（staticExamples[0] 若已含 token ⇒ 必须渲染后才可比）
  // ⭐ 日期归一化（与 p168-en-page-parity 同一口径）：`dateLabel()` 用**当前月份**推算里程碑日期
  //   ⇒ staticExamples[0] 是几个月前生成的 ⇒ 这一项必然随时间变 ⇒ 归一化掉。
  const baseLines = normalizeDates(renderCalcOutput(base, {})).split(NL);
  const newLines = normalizeDates(renderedServer).split(NL);
  const enDiffs: string[] = [];
  for (let k = 0; k < Math.max(baseLines.length, newLines.length); k++) {
    if (baseLines[k] !== newLines[k]) {
      enDiffs.push('第 ' + (k + 1) + ' 行：基线 ' + JSON.stringify(baseLines[k]) + ' vs 现在 ' + JSON.stringify(newLines[k]));
    }
  }
  const allow = ALLOWED_DIFFS[slug] ?? [];
  const enAllowed = enDiffs.length > 0 && enDiffs.every((d) => allow.some((x) => d.includes(x)));
  const enSame = enDiffs.length === 0;

  // ② 两端 code 集合
  const sc = new Set<string>();
  const cc = new Set<string>();
  for (const m of serverRaw.matchAll(new RegExp(TOKEN_RE.source, 'g'))) sc.add(m[1]);
  for (const m of clientRaw.matchAll(new RegExp(TOKEN_RE.source, 'g'))) cc.add(m[1]);
  const onlyServer = [...sc].filter((c) => !cc.has(c));
  const onlyClient = [...cc].filter((c) => !sc.has(c));

  // ③ ④ fallback 半角 | / params 花括号 / params JSON
  let badPipe = 0; let badBrace = 0; let badJson = 0;
  for (const text of [serverRaw, clientRaw]) {
    for (const m of text.matchAll(new RegExp(TOKEN_RE.source, 'g'))) {
      if (m[3] && m[3].indexOf('|') >= 0) badPipe++;
      if (m[2]) {
        const inner = m[2].slice(1, -1);
        if (inner.indexOf('{') >= 0 || inner.indexOf('}') >= 0) badBrace++;
        try {
          const o = JSON.parse(m[2]);
          for (const v of Object.values(o)) {
            if (String(v).indexOf('{') >= 0 || String(v).indexOf('}') >= 0) badBrace++;
          }
        } catch { badJson++; }
      }
    }
  }

  return {
    slug, alias, enSame, enAllowed, enNote, enDiffs,
    codeSame: onlyServer.length === 0 && onlyClient.length === 0, onlyServer, onlyClient,
    serverCodes: sc.size, clientCodes: cc.size,
    badPipe, badBrace, badJson,
  };
}

export function selfcheckAll(slugs: string[]): SelfcheckRow[] {
  const byAlias = new Map(TOKENIZED.map((t) => [t.slug, t.alias]));
  return slugs.map((s) => selfcheck(s, byAlias.get(s) ?? s));
}

if (resolve(process.argv[1] ?? '') === resolve(import.meta.dirname, 'p168-token-selfcheck.ts')) {
  // ⭐ 别名用下划线（sales_velocity），slug 用连字符 ⇒ 过滤必须两边都归一化
  const norm = (x: string) => x.replace(/^solopreneur-/, '').replace(/-calculator$/, '').replace(/-/g, '_');
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const slugs = only.length > 0
    ? TOKENIZED.map((t) => t.slug).filter((s) => only.some((n) => norm(s).includes(norm(n))))
    : TOKENIZED.map((t) => t.slug);
  const rows = selfcheckAll(slugs);
  // ⭐ 防真空绿：过滤条件写错 ⇒ 匹配到 0 个引擎 ⇒ 「0 个不合格」是假绿
  if (rows.length === 0) { console.log('没有匹配到任何引擎（过滤条件写错了？）· 期望至少 1 个'); process.exit(1); }
  let bad = 0;
  for (const r of rows) {
    const enOk = r.enSame || r.enAllowed;
    const ok = enOk && r.codeSame && r.badPipe === 0 && r.badBrace === 0 && r.badJson === 0;
    if (!ok) bad++;
    console.log((ok ? 'OK  ' : 'FAIL') + ' ' + r.alias.padEnd(24)
      + ' code(服务端 ' + String(r.serverCodes).padStart(3) + ' / 客户端 ' + String(r.clientCodes).padStart(3) + ')'
      + '  英文零变化=' + (enOk ? (r.enAllowed ? '是(有意差异)' : '是') : '否')
      + '  两端集合=' + (r.codeSame ? '一致' : '不一致')
      + '  |fallback=' + r.badPipe + ' 花括号=' + r.badBrace + ' JSON坏=' + r.badJson);
    if (!ok) {
      if (!enOk && !r.enAllowed) {
        console.log('      [' + r.enNote + ']');
        for (const d of r.enDiffs.slice(0, 6)) console.log('      ' + d);
      }
      if (!r.codeSame) {
        if (r.onlyServer.length) console.log('      仅服务端有：' + r.onlyServer.join(', '));
        if (r.onlyClient.length) console.log('      仅客户端有：' + r.onlyClient.join(', '));
      }
    }
  }
  console.log('—— ' + rows.length + ' 个引擎 · 不合格 ' + bad);
  console.log(bad === 0 ? 'ALL OK' : 'NOT YET');
  process.exitCode = bad === 0 ? 0 : 1;
}

#!/usr/bin/env node
// P168 B3-14 —— **token 命名空间别名一致性检查**（source-only，不需要 build）。
//
// 用法（必须从仓库根跑）：
//   cmd.exe /c "node node_modules/tsx/dist/cli.mjs tests/scripts/p168-token-namespace-alias.ts"
//   cmd.exe /c "node node_modules/tsx/dist/cli.mjs tests/scripts/p168-token-namespace-alias.ts burn_multiple"
//
// ⭐ 守什么（2026-11-23 实测踩坑，B3-14 组 1 收尾时抓到的真实缺陷）：
//   · `src/lib/calc-output-templates.ts` 的 `calcOutputTemplates(lang, alias, codes)`
//     **只放行「键的第二段 == alias」的键**；
//   · 服务端页面 `src/pages/[lang]/[slug].astro` 用 `toolAlias(slug)` 作为 alias
//     （去 `solopreneur-` 前缀 + 去 `-calculator` 后缀 + 连字符换下划线）；
//   ⇒ 引擎里写的命名空间**必须**等于 `toolAlias(slug)`，否则该引擎的行码被整段过滤掉
//     ⇒ 服务端查不到 zh 模板 ⇒ 回落英文兜底 ⇒ **zh 页卡片整行英文**。
//   ⚠️ 实测症状极隐蔽：源码里 `makeToken` 都在、locale 里 en/zh 键都齐、
//      `check:examples` / `check:customfn` / `check:i18n` 全绿，
//      **只有** `p168-zh-remaining-audit.ts`（量 dist 产物）才暴露。
//   ⚠️ 而台账守卫 `p168-tokenize-remaining-ledger.ts` 会报「与实测不一致（差 N 条）」——
//      因为引擎已被销账（记 0 行）但实测仍有行。
//
// ⭐ 判据 = **命名空间集合 == {toolAlias(slug)} ∪ {共享的 label / section}**
//   （共享段 `calc_out.label.*` / `calc_out.section.*` 对所有引擎开放，不算错）。
//
// ⚠️ 本文件**不是** test（文件名不带 .test.ts）⇒ 不进 walkTestSuites 的套件计数。

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TOKENIZED } from './p168-tokenized-engines.mjs';

/** slug → alias：与 src/lib/calc-output-templates.ts 的 toolAlias 逐字一致 */
export function toolAlias(slug: string): string {
  return slug.replace(/^solopreneur-/, '').replace(/-calculator$/, '').replace(/-/g, '_');
}

const SHARED = new Set(['label', 'section']);

export interface AliasRow {
  slug: string; file: string; want: string;
  used: string[]; wrong: string[];
}

export function aliasRows(slugs?: string[]): AliasRow[] {
  const out: AliasRow[] = [];
  for (const e of TOKENIZED) {
    if (slugs && slugs.length && !slugs.some((n) => e.slug.includes(n) || e.alias.includes(n) || e.file.includes(n))) continue;
    const src = readFileSync(resolve(e.file), 'utf8');
    const used = new Set<string>();
    for (const m of src.matchAll(/calc_out\.([a-z0-9_]+)\./g)) used.add(m[1]);
    const want = toolAlias(e.slug);
    const wrong = [...used].filter((x) => x !== want && !SHARED.has(x)).sort();
    out.push({ slug: e.slug, file: e.file, want, used: [...used].sort(), wrong });
  }
  return out;
}

if (resolve(process.argv[1] ?? '') === resolve(import.meta.filename ?? '')) {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const rows = aliasRows(only);
  const bad = rows.filter((r) => r.wrong.length);
  for (const r of rows) {
    console.log((r.wrong.length ? 'BAD  ' : 'ok   ') + r.slug + '  want=' + r.want + (r.wrong.length ? '  WRONG=' + r.wrong.join(',') : ''));
  }
  console.log('——');
  console.log('已令牌化引擎 ' + rows.length + ' 个 · 命名空间别名不一致 ' + bad.length + ' 个');
  if (bad.length) {
    console.error('⚠️ 命名空间必须等于 toolAlias(slug)，否则 zh 页卡片会回落英文：');
    for (const r of bad) console.error('  ' + r.slug + '  应为 ' + r.want + '，实际用了 ' + r.wrong.join(', '));
    process.exit(1);
  }
  console.log('ALL OK');
}

#!/usr/bin/env node
// P167 —— 文档新鲜度检查的**共享实现**（CI 守卫 + 体检工具共用同一份规则）。
//
// ⭐ 为什么要共享（照抄同批 `tests/_category-sections-metrics.ts` 的做法）：
//   守卫（CI 强制）与体检工具（人看）如果**各写一份**同一批规则，迟早会对不上
//   —— 工具报「0 个问题」而守卫在红（或反过来）⇒ **体检数字会误导人**。
//   ⇒ 一份实现、两处调用 ⇒ **不可能对不上**。
//
// 使用方：
//   · `tests/doc-freshness-guard.test.ts`   —— CI 强制（每个函数一条断言）
//   · `tests/scripts/p167-doc-drift-scan.ts` —— 人看的体检报告
//
// ⚠️ 本文件只导出函数，**不要单独跑**（没有 main）。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { categories } from '../src/data/categories.ts';
import { tools } from '../src/data/tools/index.ts';

export const ROOT = resolve(import.meta.dirname, '..');

export interface DocProblem {
  /** 问题类别（给人看的短标签） */
  kind: string;
  /** 人类可读的具体描述 */
  detail: string;
}

export function readDoc(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

/** README 里「会随批次漂移」的数量 —— 判据落在**要禁的形状**上，不是「必须写对数字」 */
export const README_DRIFT_NUMBERS: { label: string; re: RegExp }[] = [
  { label: 'build 页数', re: /~\d+ static pages/ },
  { label: 'spec 文件数', re: /specs\/\s+# Design specs \(\d+ files/ },
  { label: 'plan 文件数', re: /plans\/\s+# Implementation plans \(\d+ files/ },
  { label: 'memory ship log 数', re: /memory\/\s+# Project-level ship logs \(\d+ files/ },
];

/** 顶层 navigator 与 README 同病 ⇒ 同样禁写死会漂的文件数 */
export const DOCS_INDEX_DRIFT_NUMBERS: { label: string; re: RegExp }[] = [
  { label: 'specs 文件数', re: /\b\d+\s+spec files\b/ },
  { label: 'plans 文件数', re: /\b\d+\s+plan files\b/ },
  { label: 'specs 导航条目里的文件数', re: /\|\s*\d+\s*specs navigator\s*\|/ },
  { label: 'plans 导航条目里的文件数', re: /\|\s*\d+\s*plans navigator\s*\|/ },
  { label: '总文件数', re: /\*\*总文件数\*\*\s*\|\s*\|\s*\*\*\d+\*\*/ },
];

function readmeCategoryRows(readme: string): { letter: string; name: string; count: string }[] {
  return [...readme.matchAll(/^\| \*\*([A-Z]+)\*\* \| ([^|]+?) \| ([^|]*?) \|$/gm)].map((m) => ({
    letter: m[1]!,
    name: m[2]!.trim(),
    count: m[3]!.trim(),
  }));
}

/** ① README 的分类表 == 真实分类（幽灵 / 漏列 / 名字错位 / 行数不等） */
export function checkReadmeCategoryTable(): DocProblem[] {
  const readme = readDoc('README.md');
  const rows = readmeCategoryRows(readme);
  const problems: DocProblem[] = [];
  const push = (kind: string, detail: string): void => { problems.push({ kind, detail }); };

  if (rows.length === 0) {
    push('README 分类表', 'README 里找不到分类表（\| Letter | Category | Calculators |）—— 表格结构变了？守卫需更新');
    return problems;
  }

  const realLetters = new Set(categories.map((c) => c.id));
  const readmeLetters = new Set(rows.map((r) => r.letter));
  for (const r of rows) {
    if (!realLetters.has(r.letter)) {
      push('幽灵分类', 'README 有**幽灵分类** ' + r.letter + '（' + r.name + '）—— 现实里不存在这个分类');
    }
  }
  for (const c of categories) {
    if (!readmeLetters.has(c.id)) {
      push('漏列分类', 'README **漏了分类** ' + c.id + '（' + c.name + '）');
    }
  }
  for (const c of categories) {
    const row = rows.find((r) => r.letter === c.id);
    if (!row) continue;
    if (row.name !== c.name) {
      push('名字错位', 'README 分类 ' + c.id + ' 的名字写的是「' + row.name + '」，真实是「' + c.name + '」');
    }
  }
  if (rows.length !== categories.length) {
    push('行数不等', 'README 分类表有 ' + rows.length + ' 行，真实分类数是 ' + categories.length);
  }
  return problems;
}

/** ② README 不得写死「会随批次漂移」的数量 */
export function checkReadmeDriftNumbers(): DocProblem[] {
  const readme = readDoc('README.md');
  const problems: DocProblem[] = [];
  for (const f of README_DRIFT_NUMBERS) {
    if (f.re.test(readme)) {
      problems.push({
        kind: 'README 写死易漂数字',
        detail: 'README 写死了「' + f.label + '」—— 它每批次都会漂 ⇒ 请改成指向 INDEX 的指针',
      });
    }
  }
  return problems;
}

/** ③ docs/INDEX.md 同样不得写死会漂的文件数 */
export function checkDocsIndexDriftNumbers(): DocProblem[] {
  const idx = readDoc('docs/INDEX.md');
  const problems: DocProblem[] = [];
  for (const f of DOCS_INDEX_DRIFT_NUMBERS) {
    if (f.re.test(idx)) {
      problems.push({
        kind: 'docs/INDEX.md 写死易漂数字',
        detail: 'docs/INDEX.md 写死了「' + f.label + '」—— 它每批次都会漂 ⇒ 请改成指向 sub-INDEX 的指针',
      });
    }
  }
  return problems;
}

/** ④ README 里的链接与路径都必须存在 */
export function checkReadmeLinks(): DocProblem[] {
  const readme = readDoc('README.md');
  const problems: DocProblem[] = [];
  for (const m of readme.matchAll(/\]\(([^)]+)\)/g)) {
    const raw = m[1]!;
    if (raw.startsWith('http')) continue;
    const path = raw.split('#')[0];
    if (!path) continue;
    if (!existsSync(resolve(ROOT, path))) {
      problems.push({ kind: '坏链', detail: '坏链: ' + raw });
    }
  }
  for (const m of readme.matchAll(/`([A-Za-z0-9_./-]+\.(?:ts|md|json|astro|mjs))`/g)) {
    const p = m[1]!;
    if (!p.includes('/')) continue;
    if (!existsSync(resolve(ROOT, p))) {
      problems.push({ kind: '坏路径', detail: '坏路径: `' + p + '`' });
    }
  }
  return problems;
}

/** ⑤ README 分类表的算子数 == 真实引擎数（按 categoryId 分组，与 check-engine-count-by-category.mjs 同口径） */
export function checkReadmeEngineCounts(): DocProblem[] {
  const readme = readDoc('README.md');
  const rows = readmeCategoryRows(readme);
  const real: Record<string, number> = {};
  for (const t of tools) real[t.categoryId] = (real[t.categoryId] ?? 0) + 1;
  const problems: DocProblem[] = [];
  for (const r of rows) {
    const actual = real[r.letter];
    if (actual === undefined) continue; // 幽灵分类由 ① 负责，这里不重复报
    if (r.count !== String(actual)) {
      problems.push({
        kind: '算子数漂移',
        detail: 'README 分类 ' + r.letter + ' 写的是 ' + r.count + ' 个算子，真实是 ' + actual,
      });
    }
  }
  return problems;
}

/** 仓库里所有 .md 的文件名（跨目录 navigator 的幽灵判定用） */
export function allMdNames(): Set<string> {
  const out = new Set<string>();
  const walk = (dir: string): void => {
    let entries;
    try { entries = readdirSync(resolve(ROOT, dir), { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
      if (e.isDirectory()) {
        if (e.name === 'tmp' || e.name === '.superpowers' || e.name === '.codegraph') continue;
        walk(dir + '/' + e.name);
      } else if (e.name.endsWith('.md')) {
        out.add(e.name);
      }
    }
  };
  walk('docs');
  walk('memory');
  return out;
}

export interface IndexTarget {
  idx: string;
  dir: string;
  /** 该目录里**不算内容文件**的 .md（INDEX.md 自身 + 特殊文件） */
  exclude: string[];
  /** 幽灵判定作用域：同目录（dir）vs 全仓（repo —— 顶层 navigator 跨子目录） */
  ghostScope: 'dir' | 'repo';
}

export const INDEX_TARGETS: IndexTarget[] = [
  { idx: 'docs/superpowers/plans/INDEX.md', dir: 'docs/superpowers/plans', exclude: ['INDEX.md'], ghostScope: 'dir' },
  { idx: 'docs/superpowers/specs/INDEX.md', dir: 'docs/superpowers/specs', exclude: ['INDEX.md'], ghostScope: 'dir' },
  { idx: 'memory/INDEX.md', dir: 'memory', exclude: ['INDEX.md', 'MEMORY.md'], ghostScope: 'dir' },
  { idx: 'docs/INDEX.md', dir: 'docs', exclude: ['INDEX.md'], ghostScope: 'repo' },
];

/**
 * ⭐ 某 INDEX 里**真正登记**的 .md 文件名。
 *
 * 判据落在「**登记**」这个形状上：**只认表格首列里的登记行**。
 *   —— 散文、维护约定、计数表里对别的文件的**行内提及不算登记**。
 *
 * 为什么必须这么严（P167 实测踩到）：
 *   第一版守卫用「全文任意反引号 .md」当已登记 ⇒ `memory/MEMORY.md` 在
 *   「维护约定」里被提了一句就算「已登记」⇒ **一个真的漏登记的文件被放过**。
 *   ⇒ 「已登记」判据太松 ⇒ 漏登记守卫**失明**（而它看起来是绿的）。
 */
export function listedNames(idx: string): string[] {
  const out: string[] = [];
  for (const ln of idx.split(/\r?\n/)) {
    if (!ln.trim().startsWith('|')) continue;
    const first = ln.trim().split('|')[1] ?? '';
    const m = first.match(/`([^`]+.md)`/);
    if (!m) continue;
    const n = m[1]!;
    if (n.includes('/')) continue;
    if (/[*?]/.test(n)) continue;
    out.push(n);
  }
  return out;
}

/**
 * 按 `## N` 段分组，收集每段**登记**的文件名。
 * 非编号的 `## ` 段（类别计数 / 维护约定 / 与其他 INDEX 的关系…）不计入。
 */
export function sectionRegistrations(idx: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  let cur: string | null = null;
  for (const ln of idx.split(/\r?\n/)) {
    const h = ln.match(/^##\s+(.*)$/);
    if (h) {
      const key = h[1]!.match(/^(\d+|Section\s+\d+)\s*[·—]/);
      cur = key ? key[1]!.replace('Section ', '') : null;
      if (cur && !out.has(cur)) out.set(cur, []);
      continue;
    }
    if (!cur) continue;
    const first = ln.trim().split('|')[1] ?? '';
    const m = first.match(/`([^`]+.md)`/);
    if (!m) continue;
    const n = m[1]!;
    if (n.includes('/') || /[*?]/.test(n)) continue;
    out.get(cur)!.push(n);
  }
  return out;
}

/** 目录下的 .md 文件名（含 INDEX.md 自身） */
export function dirMdFiles(dir: string): string[] {
  try {
    return readdirSync(resolve(ROOT, dir)).filter((f) => f.endsWith('.md'));
  } catch {
    return [];
  }
}

/** 某 INDEX 的覆盖明细（守卫与体检工具共用同一套口径） */
export interface CoverageDetail {
  target: IndexTarget;
  listed: string[];
  onDisk: string[];
  ghosts: string[];
  unlisted: string[];
}

export function indexCoverageDetail(t: IndexTarget, all: Set<string>): CoverageDetail {
  const idx = readDoc(t.idx);
  const listed = listedNames(idx);
  const onDisk = dirMdFiles(t.dir).filter((f) => !t.exclude.includes(f));
  const ghosts = t.ghostScope === 'dir'
    ? listed.filter((f) => !onDisk.includes(f))
    : listed.filter((f) => !all.has(f));
  const unlisted = t.ghostScope === 'dir'
    ? onDisk.filter((f) => !listed.includes(f))
    : [];
  return { target: t, listed, onDisk, ghosts, unlisted };
}

/** ⑥ 四层 INDEX 覆盖完整（无漏登记、无幽灵） */
export function checkIndexCoverage(): DocProblem[] {
  const problems: DocProblem[] = [];
  const all = allMdNames();
  for (const t of INDEX_TARGETS) {
    const d = indexCoverageDetail(t, all);
    for (const f of d.unlisted) {
      problems.push({ kind: '漏登记', detail: t.idx + '：漏登记 ' + f + '（磁盘上有、INDEX 没列）' });
    }
    for (const f of d.ghosts) {
      const where = t.ghostScope === 'dir' ? '该目录里没有这个文件' : '仓库里没有这个文件';
      problems.push({ kind: '幽灵条目', detail: t.idx + '：幽灵条目 ' + f + '（INDEX 列了、' + where + '）' });
    }
  }
  return problems;
}

/**
 * ⑦ 四层 INDEX 的**类别计数表** == 各段实际登记数。
 *
 * ⭐ 为什么这条必须单独存在：计数表是「现状断言」而不是「历史记录」
 *   ⇒ 它会漂。P167 实测：plans 表写 58（实际 108）· specs 表写 82（实际 83）
 *   · memory 表写 41（实际 180）—— **导航文件在骗人**。
 *   ⇒ 覆盖率守卫（⑥）只保证「每个文件都被登记」，**保证不了「登记了几条」写对了**。
 *
 * 计数表的三条约定（守卫按这三条判）：
 *   ① 每个 `## N` 段都要有一行「N · …」，数字 == 该段**实际登记数**；
 *   ② 各段登记数之和 + 非内容文件数 == 目录内 .md 总数；
 *   ③ 标着「目录文件总数」的那一行 == 目录内 .md 总数（含 INDEX.md 自身）。
 */
export interface CountRow {
  label: string;
  count: number;
  section: string | null;
  isTotal: boolean;
}

/** 解析「## 类别计数」小节里的表格行 */
export function parseCountTable(idx: string): CountRow[] {
  const lines = idx.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s+类别计数\s*$/.test(l));
  if (start < 0) return [];
  const rows: CountRow[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const ln = lines[i]!;
    if (/^##\s/.test(ln)) break;
    if (!ln.trim().startsWith('|')) continue;
    const cells = ln.trim().split('|').map((c) => c.trim());
    if (cells.length < 3) continue;
    const label = (cells[1] ?? '').replace(/\*\*/g, '').trim();
    const countCell = (cells[cells.length - 2] ?? '').replace(/\*\*/g, '').trim();
    if (!label || !countCell) continue;
    if (/^[-:]+$/.test(countCell)) continue; // 分隔行
    // 「5 + 2 + 1 + 7 = 15」⇒ 取最后一个 = 之后的数；否则取第一个整数
    const m = countCell.includes('=')
      ? countCell.slice(countCell.lastIndexOf('=') + 1).match(/\d+/)
      : countCell.match(/\d+/);
    if (!m) continue;
    const sec = label.match(/^(\d+)\s*(?:·|$)/);
    rows.push({
      label,
      count: Number(m[0]),
      section: sec ? sec[1]! : null,
      isTotal: /总数|总计/.test(label),
    });
  }
  return rows;
}

/** 计数表里「目录文件总数」那一行的标签（各 INDEX 措辞不一，先按序号找） */
export function totalRowLabel(rows: CountRow[]): string | null {
  const r = rows.find((x) => x.isTotal);
  return r ? r.label : null;
}

export function checkIndexCounts(): DocProblem[] {
  const problems: DocProblem[] = [];
  for (const t of INDEX_TARGETS) {
    if (t.ghostScope !== 'dir') continue; // 顶层 navigator 没有分段计数表
    const idx = readDoc(t.idx);
    const secs = sectionRegistrations(idx);
    const rows = parseCountTable(idx);
    if (rows.length === 0) {
      problems.push({ kind: '缺计数表', detail: t.idx + '：找不到「## 类别计数」小节或其表格行' });
      continue;
    }

    // ① 每段都要有对应行且数字相符
    for (const [sec, files] of secs) {
      const row = rows.find((r) => r.section === sec);
      if (!row) {
        problems.push({ kind: '计数表缺段', detail: t.idx + '：计数表里没有第 ' + sec + ' 段的行（实际登记 ' + files.length + ' 个）' });
        continue;
      }
      if (row.count !== files.length) {
        problems.push({
          kind: '段计数漂移',
          detail: t.idx + '：第 ' + sec + ' 段计数表写 ' + row.count + '，实际登记 ' + files.length + ' 个',
        });
      }
    }

    // ② 各段之和 + 非内容文件 == 目录 .md 总数
    const sum = [...secs.values()].reduce((s, f) => s + f.length, 0);
    const disk = dirMdFiles(t.dir).length;
    if (disk - sum !== t.exclude.length) {
      problems.push({
        kind: '登记总数不符',
        detail: t.idx + '：各段登记合计 ' + sum + ' + 非内容文件 ' + t.exclude.length +
          ' ≠ 目录 .md 总数 ' + disk + '（有文件既没登记、也不在排除清单里）',
      });
    }

    // ③ 「目录文件总数」行 == 目录 .md 总数（含 INDEX.md 自身）
    const total = rows.find((r) => r.isTotal);
    if (!total) {
      problems.push({ kind: '缺总数行', detail: t.idx + '：计数表里没有标着「总数 / 总计」的行' });
    } else if (total.count !== disk) {
      problems.push({
        kind: '总数漂移',
        detail: t.idx + '：计数表「' + total.label + '」写 ' + total.count + '，目录里实际有 ' + disk + ' 个 .md',
      });
    }
  }
  return problems;
}

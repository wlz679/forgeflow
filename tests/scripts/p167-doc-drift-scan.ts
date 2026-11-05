// P167 —— 文档漂移体检：INDEX 覆盖 + README/顶层文档的现状断言 vs 现实。
//
// 为什么要有这个工具
// ------------------
// 用户 2026-11-04 问「是不是还有一些过期无用的文档？」
// ⇒ 本工具把那次扫描**固化成可复算的**。
//
// ⭐ 关键区分（这决定了什么算「过期」）：
//   · **计划 / 规格里的旧数字 = 正常**（那是历史记录，写的是当时的值）；
//   · **「现状描述」里的旧数字 = 过期**（它声称说的是现在）；
//   · **索引漏登记 = 过期**（navigator pyramid 的约定：每个层级都要同步）。
// ⇒ 所以本工具只查两类：**INDEX 覆盖漂移** 与 **README/顶层文档的现状断言**。
//
// ⭐ **规则与 CI 守卫共用同一份实现**（`tests/_doc-freshness-checks.ts`）
//   —— 体检工具与守卫各写一份规则，迟早会对不上 ⇒ 工具报「0 个问题」而守卫在红
//   ⇒ **一个会误导人的体检数字，比没有数字更糟**。
//
// 跑法（必须从仓库根目录跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p167-doc-drift-scan.ts
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p167-doc-drift-scan.ts --strict
//     ↑ --strict：发现漂移时返回退出码 1
//
// ⚠️ 文件名**不能**带 .test.ts —— tests/build-dep-suites.mjs 的 walkTestSuites 只收
//    *.test.ts / *.test.mjs，带了会让套件计数漂移。
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  ROOT,
  README_DRIFT_NUMBERS,
  DOCS_INDEX_DRIFT_NUMBERS,
  INDEX_TARGETS,
  allMdNames,
  indexCoverageDetail,
  sectionRegistrations,
  parseCountTable,
  checkReadmeCategoryTable,
  checkReadmeDriftNumbers,
  checkDocsIndexDriftNumbers,
  checkReadmeLinks,
  checkReadmeEngineCounts,
  checkIndexCoverage,
  checkIndexCounts,
  type DocProblem,
} from '../_doc-freshness-checks.ts';

const NL_ = String.fromCharCode(10);

function countPages(): number {
  // ⭐ 用 ROOT 拼绝对路径，不用相对 'dist' —— 否则在 cwd 不是仓库根时
  //   会安静地报「0 页」（实测踩过：cd 带中文路径的仓库时 cwd 没落到根目录）。
  //   ⇒ **体检数字必须可信**，否则读者会以为「站点没有页面」。
  let n = 0;
  const walk = (d: string): void => {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const f = join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (e.name === 'index.html') n++;
    }
  };
  walk(join(ROOT, 'dist'));
  return n;
}

function mdCount(dir: string, exclude: string[]): number {
  try {
    return readdirSync(join(ROOT, dir)).filter((f) => f.endsWith('.md') && !exclude.includes(f)).length;
  } catch {
    return 0;
  }
}

function main(): void {
  const strict = process.argv.slice(2).indexOf('--strict') >= 0;
  const out: string[] = [];
  const p = (s: string): void => { out.push(s); };
  const problems: DocProblem[] = [];

  const real = {
    pages: countPages(),
    specs: mdCount('docs/superpowers/specs', ['INDEX.md']),
    plans: mdCount('docs/superpowers/plans', ['INDEX.md']),
    memory: mdCount('memory', ['INDEX.md', 'MEMORY.md']),
  };

  p('='.repeat(78));
  p('P167 —— 文档漂移体检');
  p('='.repeat(78));
  p('现实值（实测）: dist 页面 ' + real.pages + '　spec ' + real.specs + '　plan ' + real.plans + '　memory ' + real.memory);
  p('');

  // ── 维度 A：INDEX 覆盖漂移 ──
  p('-'.repeat(78));
  p('A. INDEX 覆盖（navigator pyramid：每层都要同步）');
  p('   ⭐ 「已登记」只认**表格首列的登记行** —— 散文里的行内提及不算');
  const all = allMdNames();
  for (const t of INDEX_TARGETS) {
    const d = indexCoverageDetail(t, all);
    p('  ' + t.idx);
    p('    列了 ' + d.listed.length + '　磁盘 ' + d.onDisk.length +
      '　幽灵 ' + d.ghosts.length + '　漏登记 ' + d.unlisted.length);
    for (const f of d.ghosts.slice(0, 5)) p('      幽灵: ' + f);
    for (const f of d.unlisted.slice(0, 5)) p('      漏登记: ' + f);
    if (d.unlisted.length > 5) p('      … 还有 ' + (d.unlisted.length - 5) + ' 个漏登记');
  }
  p('');

  // ── 维度 B：README 的现状断言 ──
  p('-'.repeat(78));
  p('B. README 的现状断言 vs 现实');
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
  for (const f of README_DRIFT_NUMBERS) {
    const claim = (readme.match(f.re) || [])[0];
    if (claim === undefined) {
      p('  [OK]   ' + f.label + ': README 未写死（推荐 —— 会随批次漂移的数字不该进 README）');
    } else {
      p('  [漂移] ' + f.label + ': README 写死了「' + claim + '」');
    }
  }
  p('');

  // ── 维度 C：README 分类表 vs 真实分类 ──
  p('-'.repeat(78));
  p('C. README 分类表 vs 真实分类（src/data/categories.ts）');
  const readmeRows = [...readme.matchAll(/^\| \*\*([A-Z]+)\*\* \| ([^|]+?) \|/gm)].map((m) => ({
    letter: m[1]!,
    name: m[2]!.trim(),
  }));
  const catsSrc = readFileSync(join(ROOT, 'src/data/categories.ts'), 'utf8');
  const realCats = [...catsSrc.matchAll(/\{ id: '([A-Z])', name: '([^']+)'/g)].map((m) => ({
    letter: m[1]!,
    name: m[2]!,
  }));
  p('  README 表里 ' + readmeRows.length + ' 个分类　真实 ' + realCats.length + ' 个');
  const catProblems = checkReadmeCategoryTable();
  const phantom = catProblems.filter((x) => x.kind === '幽灵分类');
  const missing = catProblems.filter((x) => x.kind === '漏列分类');
  p('  ⚠️ 幽灵分类（README 有、现实无）: ' + (phantom.length ? phantom.map((x) => x.detail).join('; ') : '无'));
  p('  ⚠️ 缺失分类（现实有、README 无）: ' + (missing.length ? missing.map((x) => x.detail).join('; ') : '无'));
  p('');

  // ── 维度 D：README 分类表的算子数 vs 真实引擎数 ──
  p('-'.repeat(78));
  p('D. README 分类表的算子数 vs 真实引擎数');
  const countProblems = checkReadmeEngineCounts();
  p('  ' + (countProblems.length ? '⚠️ ' + countProblems.length + ' 处不一致' : '全部一致'));
  for (const x of countProblems) p('      ' + x.detail);
  p('');

  // ── 维度 E：README 的链接与路径 ──
  p('-'.repeat(78));
  p('E. README 的链接与路径是否存在');
  const linkProblems = checkReadmeLinks();
  p('  ' + (linkProblems.length ? '⚠️ ' + linkProblems.length + ' 个坏链/坏路径' : '全部存在'));
  for (const x of linkProblems) p('      ' + x.detail);
  p('');

  // ── 维度 F：顶层 navigator 的易漂数字 ──
  p('-'.repeat(78));
  p('F. docs/INDEX.md 是否写死了会漂的文件数');
  const idxProblems = checkDocsIndexDriftNumbers();
  p('  ' + (idxProblems.length ? '⚠️ ' + idxProblems.length + ' 处写死' : '未写死（推荐）'));
  for (const x of idxProblems) p('      ' + x.detail);
  p('');

  // ── 维度 G：各 sub-INDEX 的类别计数表 vs 各段实际登记数 ──
  p('-'.repeat(78));
  p('G. 各 sub-INDEX 的「类别计数」表 vs 各段实际登记数');
  for (const t of INDEX_TARGETS) {
    if (t.ghostScope !== 'dir') continue;
    const idx = readFileSync(join(ROOT, t.idx), 'utf8');
    const secs = sectionRegistrations(idx);
    const rows = parseCountTable(idx);
    p('  ' + t.idx);
    for (const [sec, files] of secs) {
      const row = rows.find((r) => r.section === sec);
      const stated = row ? row.count : null;
      const ok = stated === files.length;
      p('    ' + (ok ? '[OK]  ' : '[漂移]') + ' 第 ' + sec + ' 段: 表写 ' +
        (stated === null ? '(缺行)' : stated) + '　实际 ' + files.length);
    }
    const total = rows.find((r) => r.isTotal);
    const disk = readdirSync(join(ROOT, t.dir)).filter((f) => f.endsWith('.md')).length;
    p('    ' + (total && total.count === disk ? '[OK]  ' : '[漂移]') +
      ' 总数: 表写 ' + (total ? total.count : '(缺行)') + '　目录 .md 实有 ' + disk);
  }
  p('');

  // ── 汇总：全部问题以**共享实现**为准（守卫与体检不会对不上） ──
  problems.push(
    ...catProblems,
    ...checkReadmeDriftNumbers(),
    ...idxProblems,
    ...linkProblems,
    ...countProblems,
    ...checkIndexCoverage(),
    ...checkIndexCounts(),
  );

  p('='.repeat(78));
  p(problems.length === 0 ? '结论：0 个问题' : '结论：' + problems.length + ' 个问题');
  for (const pr of problems) p('  · [' + pr.kind + '] ' + pr.detail);
  p('='.repeat(78));

  process.stdout.write(out.join(NL_) + NL_);
  if (strict && problems.length > 0) process.exitCode = 1;
}

main();

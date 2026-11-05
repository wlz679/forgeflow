// P167 —— INDEX 补登记生成器：把「磁盘上有、INDEX 没列」的文件补成表格行。
//
// 为什么要有这个工具
// ------------------
// 用户 2026-11-04 问「是不是还有一些过期无用的文档？」⇒ 实测四层 INDEX 全部漂移：
//   plans INDEX 漏 38 · specs INDEX 漏 1 · memory INDEX 漏 138。
//   ⇒ 根因是「每批次新增 plan/spec/ship-log 时没人回头补索引」。
//
// ⭐ 这个工具**只生成待补的行**，不直接改 INDEX ——
//   因为 INDEX 的**分组**（哪些 plan 属于哪个 P 批次）需要人判断，
//   自动塞进一个「未分组」段会让索引失去导航价值。
//   ⇒ 流程：跑本工具拿到行 → 人工归组 → 粘进对应 section。
//
// 跑法（必须从仓库根目录跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p167-index-regen.ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const NL = String.fromCharCode(10);

interface Meta { title: string; date: string }
/** 从文件里抽标题与日期；日期优先取文件名，其次取标题里的 YYYY-MM-DD */
function metaOf(path: string, file: string): Meta {
  let s = '';
  try { s = readFileSync(path, 'utf8'); } catch { /* unreadable */ }
  let title = '';
  const h1 = s.match(/^#\s+(.+)$/m);
  if (h1) title = h1[1]!.trim();
  if (!title) {
    const fm = s.match(/^title:\s*["']?(.+?)["']?$/m);
    if (fm) title = fm[1]!.trim();
  }
  if (!title) {
    title = file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '').replace(/-/g, ' ');
  }
  const fromName = file.match(/^(\d{4}-\d{2}-\d{2})/);
  if (fromName) return { title, date: fromName[1]! };
  const fromTitle = title.match(/(\d{4}-\d{2}-\d{2})/);
  if (fromTitle) return { title, date: fromTitle[1]! };
  return { title, date: '' };
}

function listedFiles(idxPath: string): Set<string> {
  const idx = readFileSync(idxPath, 'utf8');
  const s = new Set<string>();
  for (const m of idx.matchAll(/`([^`]+\.md)`/g)) {
    const n = m[1]!;
    if (n.includes('/')) continue;
    s.add(n);
  }
  return s;
}

const TARGETS: { idx: string; dir: string }[] = [
  { idx: 'docs/superpowers/plans/INDEX.md', dir: 'docs/superpowers/plans' },
  { idx: 'docs/superpowers/specs/INDEX.md', dir: 'docs/superpowers/specs' },
  { idx: 'memory/INDEX.md', dir: 'memory' },
];

let total = 0;
for (const t of TARGETS) {
  const listed = listedFiles(t.idx);
  const onDisk = readdirSync(t.dir).filter((f) => f.endsWith('.md') && f !== 'INDEX.md').sort();
  const missing = onDisk.filter((f) => !listed.has(f));
  total += missing.length;
  console.log('=== ' + t.idx + ' · 漏登记 ' + missing.length + ' ===');
  for (const f of missing) {
    const m = metaOf(join(t.dir, f), f);
    console.log('| `' + f + '` | ' + m.title.replace(/\|/g, '\\|') + ' | ' + m.date + ' |');
  }
  console.log('');
}
console.log('合计漏登记: ' + total);

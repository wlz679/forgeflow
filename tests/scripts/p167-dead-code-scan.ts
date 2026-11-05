// P167 —— 全仓死代码 / 冗余文件体检工具。
//
// 为什么要有这个工具
// ------------------
// 用户 2026-11-04 要求「全局扫描一下，看有没有无用的冗余代码和文件」。
// ⇒ 本工具把那次扫描**固化成可复算的**，而不是只给一个口头结论。
//
// ⭐ 扫描设计上的两个要点（都是踩过的坑）：
//   ① **路径必须转回「相对仓库根」** —— `resolve()` 产出的是绝对路径，
//      而 git 的文件清单是相对路径 ⇒ 直接比较会**一个都匹配不上**，
//      扫描结果会是「全部未被引用」的假警报（第一版就栽在这）；
//   ② **`.astro` 必须参与 import 扫描** —— 组件全是 `.astro`，
//      漏掉它会把 100 个组件全报成死文件。
//
// 五个维度：
//   ① 死文件：src/ + scripts/ 下被 git 跟踪、但没有任何跟踪文件 import 它
//      （排除 index.* 与 .d.ts —— 它们是入口/类型声明）
//   ② 死导出：src/ 下 export 的函数/常量，在全仓库只出现 1 次（= 只有定义处）
//   ③ 孤儿 i18n 键：locale 里有、但叶子名在源码里从不出现
//   ④ 字节级重复文件：内容完全相同的跟踪文件组
//   ⑤ 一次性脚本目录（README 明确写了 DO NOT delete ⇒ 有意保留）
//
// 跑法（必须从仓库根目录跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p167-dead-code-scan.ts
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p167-dead-code-scan.ts --strict
//     ↑ --strict：发现「死导出」或「孤儿 i18n 键」时返回退出码 1
//
// ⚠️ 文件名**不能**带 .test.ts —— tests/build-dep-suites.mjs 的 walkTestSuites 只收
//    *.test.ts / *.test.mjs，带了会让套件计数漂移。
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative, resolve } from 'node:path';

const NL = String.fromCharCode(10);
const ROOT = process.cwd();

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', '.astro', '.wrangler', 'tmp', '.superpowers',
  '.codegraph', '.claude', '.serena', '.qoder', 'public', 'docs', 'memory',
]);

function gitLsFiles(): string[] {
  return execSync('git ls-files', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split(NL)
    .filter((f) => f.trim())
    .map((f) => f.split('\\').join('/'));
}

function walkFiles(extRe: RegExp): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (SKIP_DIRS.has(e.name)) continue;
      const f = join(dir, e.name);
      if (e.isDirectory()) walk(f);
      else if (extRe.test(e.name)) out.push(f.split('\\').join('/'));
    }
  };
  walk(ROOT);
  return out;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function main(): void {
  const strict = process.argv.slice(2).indexOf('--strict') >= 0;
  const tracked = gitLsFiles();
  const out: string[] = [];
  const p = (s: string): void => { out.push(s); };

  p('='.repeat(78));
  p('P167 —— 全仓死代码 / 冗余文件体检');
  p('='.repeat(78));
  p('git 跟踪文件数: ' + tracked.length);
  p('');

  // ── 维度 ① 死文件 ──
  const importRe = /(?:from\s+|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g;
  const imported = new Set<string>();
  const codeFiles = tracked.filter((f) => /\.(ts|tsx|astro|mjs|js)$/.test(f));
  for (const f of codeFiles) {
    let s = '';
    try { s = readFileSync(join(ROOT, f), 'utf8'); } catch { continue; }
    for (const m of s.matchAll(importRe)) {
      const spec = m[1]!;
      if (!spec.startsWith('.')) continue;
      // ⭐ 必须转回相对仓库根，否则与 git 的相对路径对不上（见文件头注释）
      const abs = resolve(ROOT, dirname(f), spec).split('\\').join('/');
      const rel = relative(ROOT, abs).split('\\').join('/');
      imported.add(rel);
      for (const ext of ['.ts', '.tsx', '.astro', '.mjs', '.js', '.json']) imported.add(rel + ext);
      imported.add(rel + '/index.ts');
      imported.add(rel + '/index.tsx');
    }
  }
  const fileCandidates = tracked.filter(
    (f) =>
      /^(src|scripts)\//.test(f) &&
      /\.(ts|tsx|mjs|astro)$/.test(f) &&
      !/\/index\.(ts|tsx|mjs)$/.test(f) &&
      !/\.d\.ts$/.test(f) &&
      !f.includes('i18n/locales'),
  );
  const deadFiles = fileCandidates.filter((f) => !imported.has(f));
  p('-'.repeat(78));
  p('① 死文件候选（src/ + scripts/ 下无任何跟踪文件 import）: ' + deadFiles.length + ' / ' + fileCandidates.length);
  for (const f of deadFiles) p('    ' + f);
  p('');

  // ── 维度 ② 死导出 ──
  const corpusFiles = walkFiles(/\.(ts|tsx|mjs|astro|js)$/);
  let corpus = '';
  for (const f of corpusFiles) {
    try { corpus += readFileSync(join(ROOT, f), 'utf8') + NL; } catch { /* binary */ }
  }
  const deadExports: { file: string; name: string }[] = [];
  for (const f of corpusFiles.filter((x) => x.startsWith('src/'))) {
    let src = '';
    try { src = readFileSync(join(ROOT, f), 'utf8'); } catch { continue; }
    const names = new Set<string>();
    for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]!);
    for (const m of src.matchAll(/export\s+const\s+([A-Za-z_$][\w$]*)\s*[=:]/g)) names.add(m[1]!);
    for (const n of names) {
      const re = new RegExp('\\b' + escapeRe(n) + '\\b', 'g');
      if ((corpus.match(re) || []).length <= 1) deadExports.push({ file: f, name: n });
    }
  }
  p('-'.repeat(78));
  p('② 死导出候选（src/ 下导出但全仓库只出现 1 次 = 只有定义处）: ' + deadExports.length);
  for (const d of deadExports) p('    ' + d.file + '  →  ' + d.name);
  p('');

  // ── 维度 ③ 孤儿 i18n 键 ──
  const orphanKeys: string[] = [];
  for (const lang of ['en', 'zh']) {
    const o = JSON.parse(readFileSync(join(ROOT, 'src/i18n/locales', lang + '.json'), 'utf8')) as Record<string, string>;
    for (const k of Object.keys(o)) {
      if (k.includes('$')) continue;
      const leaf = k.split('.').pop();
      if (!leaf || leaf.length < 2) continue;
      if (!corpus.includes(leaf)) orphanKeys.push(lang + ':' + k);
    }
  }
  p('-'.repeat(78));
  p('③ 孤儿 i18n 键（叶子名在源码里从不出现）: ' + orphanKeys.length);
  for (const k of orphanKeys) p('    ' + k);
  p('');

  // ── 维度 ④ 字节级重复文件 ──
  const byHash = new Map<string, string[]>();
  for (const f of tracked) {
    if (!/\.(ts|tsx|astro|mjs|js|css|json|md)$/.test(f)) continue;
    let buf: Buffer;
    try { buf = readFileSync(join(ROOT, f)); } catch { continue; }
    if (buf.length < 200) continue;
    // ⚠️ createHash.update 要 Uint8Array —— Buffer 在新版 @types/node 下不匹配
    const h = createHash('sha256').update(new Uint8Array(buf)).digest('hex');
    if (!byHash.has(h)) byHash.set(h, []);
    byHash.get(h)!.push(f);
  }
  const dupGroups = [...byHash.entries()].filter(([, v]) => v.length > 1);
  p('-'.repeat(78));
  p('④ 字节级重复文件组: ' + dupGroups.length);
  for (const [, fs] of dupGroups) {
    p('    ' + fs.length + ' 个: ' + fs.join('  |  '));
    p('      ⚠️ 需人工判定（夹具的 en/zh 占位文件故意相同 ⇒ 非冗余）');
  }
  p('');

  // ── 维度 ⑤ 一次性脚本目录 ──
  const archive = 'scripts/.scratch/_archive/';
  const archiveFiles = tracked.filter((f) => f.startsWith(archive));
  p('-'.repeat(78));
  p('⑤ 一次性脚本目录 ' + archive + ': ' + archiveFiles.length + ' 个跟踪文件');
  p('    ⚠️ 其 README 明确写了「DO NOT delete」（审计取证价值）⇒ **不是冗余**');
  p('    ⚠️ 但 i18n-needed.json 是**活文件**（check-i18n-completeness.mjs 读它）⇒ 不能删');
  p('');

  p('='.repeat(78));
  p('⚠️ ① 与 ② 的候选**需要人工判定** —— 有些是框架约定（如 Astro middleware 的 onRequest）、');
  p('   有些是「有意保留的预留位」（如 enterprise 的 3 个 deferred modal）。');
  p('   ⇒ 本工具只报「客观事实」，不自动下「删掉」结论。');
  p('='.repeat(78));

  process.stdout.write(out.join(NL) + NL);
  if (strict && (deadExports.length > 0 || orphanKeys.length > 0)) process.exitCode = 1;
}

main();

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join, relative } from 'node:path';

// P168 B3-6c —— 工具页 lastmod 的**逐工具粒度**守卫（source-only）
//
// ⭐ 为什么是 source-only：它守的是「源集合」与「解析值」，**不需要构建产物**
//   ⇒ 本文件刻意**不出现** RUN_BUILD_TESTS（tests/build-dep-suites.mjs 靠这个变量判 build-dep）。
//
// ⭐⭐ 为什么只有 **1 个测试**（而不是「源集合」「纯净性」「时间」三个）：
//   本批的不变量是**一件事**（源集合 + 由它算出的时间）。
//   拆成三个 ⇒ 「源集退回族级」这一条变异会同时红 2~3 个测试
//   ⇒ 违反「一条变异只红一条断言」。
//
// ⭐⭐ 判据为什么必须落在「源集合**逐条**比对」而不能只比时间：
//   「把注册表源删掉」这个变异**不会改变任何工具的时间**
//   （实测注册表的时间从来不是最大值）⇒ 只比时间的话守卫全绿 ⇒ 变异测不到东西。

const root = resolve(import.meta.dirname, '..');

type Ref = { file: string; kind: 'file' | 'lines'; lines?: number[] };

/** 递归列出仓库相对路径 */
function listRel(dirAbs: string): string[] {
  const out: string[] = [];
  if (!existsSync(dirAbs)) return out;
  for (const e of readdirSync(dirAbs, { withFileTypes: true })) {
    const full = join(dirAbs, e.name);
    if (e.isDirectory()) out.push(...listRel(full));
    else out.push(relative(root, full).replace(/\\/g, '/'));
  }
  return out;
}

/**
 * 「文件 → 最后一次**内容**变更时间」的表（**一次** git 调用）。
 * git log 是**新 → 旧** ⇒ 文件**第一次**出现的那次提交就是它的最后变更时间。
 */
function gitTimeTable(): Map<string, number> {
  const out = execFileSync('git', ['log', '--format=%ct', '--name-only', '--', 'src/'], {
    cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  const map = new Map<string, number>();
  let cur: number | null = null;
  for (const raw of out.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (/^\d+$/.test(line)) { cur = Number(line) * 1000; continue; }
    if (cur !== null && !map.has(line)) map.set(line, cur);
  }
  return map;
}

const blameCache = new Map<string, number[]>();

/** 读文件并按行切分（带缓存 —— 纯性检查要对 200 个工具读同一个 1 MB 的 locale） */
const linesCache = new Map<string, string[]>();
function readLines(rel: string): string[] {
  const hit = linesCache.get(rel);
  if (hit) return hit;
  const v = readFileSync(resolve(root, rel), 'utf8').split(/\r?\n/);
  linesCache.set(rel, v);
  return v;
}

/** 逐行 git 时间（一次 blame ⇒ 整个文件的逐行时间数组，秒） */
function gitLineTimes(relPath: string): number[] {
  const hit = blameCache.get(relPath);
  if (hit) return hit;
  const out = execFileSync('git', ['blame', '--line-porcelain', '--', relPath], {
    cwd: root, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024,
  });
  const times: number[] = [];
  let cur = 0;
  let uncommitted = false;
  for (const line of out.split('\n')) {
      const h = /^([0-9a-f]{40}) \d+ \d+/.exec(line);
      if (h) { uncommitted = /^0+$/.test(h[1]); if (uncommitted) cur = 0; continue; }
    if (line.startsWith('committer-time ')) {
        const v = parseInt(line.slice('committer-time '.length).trim(), 10);
        if (!uncommitted && Number.isFinite(v) && v > 0) cur = v;
      continue;
    }
    if (line.startsWith('\t')) times.push(cur);
  }
  blameCache.set(relPath, times);
  return times;
}

/** slug → 引擎文件（靠解析引擎文件里的 slug 字面量；文件名 ≠ slug） */
function scanEngineMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const rel of listRel(resolve(root, 'src/engines'))) {
    if (!rel.endsWith('.ts') || rel.endsWith('/index.ts')) continue;
    const src = readFileSync(resolve(root, rel), 'utf8');
    const m = /slug:\s*(?:'([^']+)'|"([^"]+)")/.exec(src);
    if (m) map.set(m[1] || m[2], rel);
  }
  return map;
}

/** locale 文件里每个 slug 的**行集合**（1-based） */
function scanLocaleLines(lang: string): Map<string, number[]> {
  const rel = 'src/i18n/locales/' + lang + '.json';
  const lines = readFileSync(resolve(root, rel), 'utf8').split(/\r?\n/);
  const map = new Map<string, number[]>();
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*"tools\.([^."]+)\./.exec(lines[i]);
    if (!m) continue;
    if (!map.has(m[1])) map.set(m[1], []);
    map.get(m[1])!.push(i + 1);
  }
  return map;
}

/** 注册表文件里每个 slug 的**行集合**（index.ts 是聚合器，不是内容源） */
function scanRegistryLines(): Map<string, Array<{ file: string; lines: number[] }>> {
  const map = new Map<string, Array<{ file: string; lines: number[] }>>();
  const dir = resolve(root, 'src/data/tools');
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isFile() || !e.name.endsWith('.ts')) continue;
    if (e.name === 'types.ts' || e.name === 'index.ts') continue;
    const rel = 'src/data/tools/' + e.name;
    const lines = readFileSync(resolve(root, dir, e.name), 'utf8').split(/\r?\n/);
    const marks: Array<{ line: number; slug: string }> = [];
    for (let i = 0; i < lines.length; i++) {
      const m = /slug:\s*(?:'([^']+)'|"([^"]+)")/.exec(lines[i]);
      if (m) marks.push({ line: i, slug: m[1] || m[2] });
    }
    for (let i = 0; i < marks.length; i++) {
      const start = marks[i].line + 1;
      const end = i + 1 < marks.length ? marks[i + 1].line : lines.length;
      const ls: number[] = [];
      for (let j = start; j <= end; j++) ls.push(j);
      if (!map.has(marks[i].slug)) map.set(marks[i].slug, []);
      map.get(marks[i].slug)!.push({ file: rel, lines: ls });
    }
  }
  return map;
}

/** 规范化一个 ref，用于逐条比对 */
function refKey(r: Ref): string {
  return r.kind === 'lines' ? r.file + '|' + (r.lines || []).join(',') : r.file + '|*';
}

test('P168 B3-6c：⭐ 粒度 · 真相源 —— 工具页 lastmod 的源集合必须精确到该工具，且时间等于该集合最新的 git 内容时间', async () => {
  const mod = await import('../src/integrations/last-modified.mjs');
  const engines = scanEngineMap();
  const locale = { en: scanLocaleLines('en'), zh: scanLocaleLines('zh') };
  const registry = scanRegistryLines();
  const table = gitTimeTable();

  assert.equal(engines.size, 100, '引擎文件里解析出的 slug 数应为 100，实际 ' + engines.size);
  assert.equal(locale.en.size, 100, 'en locale 里有键块的 slug 数应为 100，实际 ' + locale.en.size);
  assert.equal(locale.zh.size, 100, 'zh locale 里有键块的 slug 数应为 100，实际 ' + locale.zh.size);
  assert.equal(registry.size, 100, '注册表里有条目的 slug 数应为 100，实际 ' + registry.size);

  const problems: string[] = [];
  const slugs = [...engines.keys()].sort();

  for (const slug of slugs) {
    for (const lang of ['en', 'zh'] as const) {
      // ---- 守卫自己算的期望源集合（独立枚举，不复用实现的取数逻辑） ----
      const exp: Ref[] = [];
      const eng = engines.get(slug)!;
      exp.push({ file: eng, kind: 'file' });
      const prose = 'src/content/tools/' + slug + (lang === 'zh' ? '.zh.md' : '.md');
      if (existsSync(resolve(root, prose))) exp.push({ file: prose, kind: 'file' });
      for (const r of registry.get(slug) || []) exp.push({ file: r.file, kind: 'lines', lines: r.lines });
      const loc = locale[lang].get(slug);
      if (loc) exp.push({ file: 'src/i18n/locales/' + lang + '.json', kind: 'lines', lines: loc });

      const act: Ref[] = mod.getToolSourceRefs(slug, lang);

      // ---- 1) 源集合逐条比对 ----
      const ek = exp.map(refKey).sort();
      const ak = act.map(refKey).sort();
      if (ek.join(' || ') !== ak.join(' || ')) {
        problems.push(
          slug + '/' + lang + ' 源集合不匹配\n  期望: ' + ek.join('\n         ') +
          '\n  实际: ' + ak.join('\n         '),
        );
        continue;
      }

      // ---- 2) 源集合纯净性 ----
      const engineRefs = act.filter((r) => r.file.startsWith('src/engines/'));
      if (engineRefs.length !== 1) {
        problems.push(slug + '/' + lang + ' 源集合里的引擎文件数应为 1，实际 ' + engineRefs.length);
      } else if (engineRefs[0].file !== eng) {
        problems.push(slug + '/' + lang + ' 源集合里的引擎文件不是自己的（' + engineRefs[0].file + '）');
      }
      if (act.some((r) => r.file === 'src/data/tools/index.ts')) {
        problems.push(slug + '/' + lang + ' 源集合里混进了 src/data/tools/index.ts（聚合器不是内容源）');
      }
      for (const r of act) {
        if (r.kind !== 'lines') continue;
        const fileLines = readLines(r.file);
        for (const ln of r.lines || []) {
          const text = fileLines[ln - 1] || '';
          if (r.file.endsWith('.json')) {
            if (!new RegExp('^\\s*"tools\\.' + slug + '\\.').test(text)) {
              problems.push(slug + '/' + lang + ' locale 行 ' + ln + ' 不属于本 slug: ' + text.slice(0, 90));
              break;
            }
          } else {
            const m = /slug:\s*(?:'([^']+)'|"([^"]+)")/.exec(text);
            if (m && (m[1] || m[2]) !== slug) {
              problems.push(slug + '/' + lang + ' 注册表行 ' + ln + ' 属于别的 slug: ' + (m[1] || m[2]));
              break;
            }
          }
        }
      }

      // ---- 3) 逐工具时间 ----
      let expected = 0;
      for (const r of exp) {
        if (r.kind === 'file') {
          const t = table.get(r.file) || 0;
          if (t > expected) expected = t;
        } else {
          const times = gitLineTimes(r.file);
          for (const ln of r.lines || []) {
            const sec = times[ln - 1] || 0;
            if (sec * 1000 > expected) expected = sec * 1000;
          }
        }
      }
      const actual = mod.getMtimeForHtmlPath('/' + lang + '/' + slug) as Date | null;
      if (!actual) {
        problems.push(slug + '/' + lang + ' lastmod 解析失败');
        continue;
      }
      if (actual.getTime() !== expected) {
        problems.push(
          slug + '/' + lang + ' lastmod = ' + actual.toISOString() +
          '，但该工具专属源集合里最新的 git 内容时间是 ' + new Date(expected).toISOString(),
        );
      }
    }
  }

  assert.deepEqual(problems, [],
    problems.length + ' 处不一致（覆盖 ' + slugs.length + ' 个工具 × 2 语言 = ' + slugs.length * 2 + ' 个工具页）:\n' +
    problems.slice(0, 6).join('\n---\n'));
});

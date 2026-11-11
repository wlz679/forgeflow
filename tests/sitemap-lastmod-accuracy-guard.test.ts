import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join, relative } from 'node:path';

// ⭐ 本套件是 **build-dep**：断言 1 要读 dist/sitemap-0.xml（构建产物）。
//   ⇒ 无 dist 时**整体跳过**（而不是失败）—— 跳过逻辑用 process.env.RUN_BUILD_TESTS，
//   这也是 tests/build-dep-suites.mjs 判定 build-dep 的唯一依据（源码里提到该变量）。
const RUN_BUILD = process.env.RUN_BUILD_TESTS;

const root = resolve(import.meta.dirname, '..');

/** 递归列出仓库相对路径 */
function listRel(dirAbs: string, rootDir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dirAbs)) return out;
  for (const e of readdirSync(dirAbs, { withFileTypes: true })) {
    const full = join(dirAbs, e.name);
    if (e.isDirectory()) out.push(...listRel(full, rootDir));
    else out.push(relative(rootDir, full).replace(/\\/g, '/'));
  }
  return out;
}

/**
 * 建「文件 → 最后一次**内容**变更时间」的表（**一次** git 调用）。
 *
 * `git log --format=%ct --name-only -- src/` 的输出形如：
 *   <ct>\n\n<file1>\n<file2>\n<ct>\n\n<file3>…
 * git log 是**新 → 旧** ⇒ 文件**第一次**出现的那次提交就是它的最后变更时间。
 *
 * ⚠️ 为什么用一次调用而不是「每个文件一次 git log」：
 *   实测前者 **141 KB / < 1 秒**；后者需要 1000+ 次进程 spawn
 *   （实测单条产物级断言就要 **61 秒**）⇒ 守卫不该把 CI 拖成小时级。
 *
 * ⭐ 判据落在 **git 内容变更时间** 上，不是文件 mtime：
 *   mtime 会被 `git checkout` / `git stash` / 构建刷新而内容可能没变
 *   （实测 `src/i18n/locales/en.json` 的 mtime = 构建时刻，git 内容变更 = 更早）
 *   ⇒ 用 mtime 等于每次部署都骗 Google「页面全新」。
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

/** 载入被测实现（.mjs 无类型声明 ⇒ 用动态 import，运行时真解析） */
async function loadImpl(): Promise<any> {
  return await import('../src/integrations/last-modified.mjs');
}

// ============================================================
// 断言 1（build-dep）· 产物层 · 「lastmod 的值是真的」
// ============================================================
test('P168 B3-6：⭐ 产物层 —— sitemap 的 lastmod 必须等于某个内容源文件的 git 变更时间', () => {
  if (!RUN_BUILD) {
    console.log('SKIP — 需要构建产物（dist/sitemap-0.xml）· 跑 RUN_BUILD_TESTS=1');
    return;
  }
  // ⭐⭐ 为什么这条断言独立成文件（不塞进 last-modified-guard）：
  //   既有守卫只查「meta tag 在不在」⇒ 一个**全站同一时刻**的 lastmod 照样通过
  //   ⇒ 那是个恒真式盲区。本条断言查的是**值**，不是**存在性**。
  //
  // ⭐⭐ 判据为什么不能用「时间窗」：
  //   「内容今天真的变了」与「lastmod = 构建时刻」在时间上**无法区分**
  //   ⇒ 唯一可判定的口径是：**lastmod 必须等于某个源文件的 git 内容变更时间**。
  //   构建时刻**不是**任何源文件的 git 变更时间 ⇒ 修好之前必然红。
  const xmlPath = resolve(root, 'dist/sitemap-0.xml');
  if (!existsSync(xmlPath)) assert.fail('dist/sitemap-0.xml 不存在 ⇒ 先跑 pnpm build');
  const xml = readFileSync(xmlPath, 'utf8');
  const entries = [...xml.matchAll(/<url><loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)].map((m) => ({
    loc: m[1], lastmod: m[2], t: Date.parse(m[2]),
  }));
  assert.ok(entries.length > 100, 'sitemap 条目太少（' + entries.length + '）');

  const allowed = new Set<number>([...gitTimeTable().values()]);
  const bad = entries.filter((e) => !Number.isFinite(e.t) || !allowed.has(e.t));
  const msg =
    'sitemap 里 ' + bad.length + ' / ' + entries.length + ' 个 URL 的 lastmod 不是任何内容源文件的 git 变更时间' +
    '⇒ 它们回退到了**构建时刻**（每次部署都告诉 Google「这些页面全新」⇒ 抓取预算被打散 ⇒ 索引率持续下滑）' +
    '例: ' + bad.slice(0, 5).map((e) => e.loc + ' → ' + e.lastmod).join(' | ');
  assert.deepEqual(bad.map((e) => e.loc), [], msg);
});

// ============================================================
// 断言 2（source-only）· 寻址层 · 「路径形态不影响结果」
// ============================================================
test('P168 B3-6：⭐ 寻址层 —— 同一页面的各种路径形态必须解析到同一个时间戳', async () => {
  const mod = await loadImpl();
  // ⭐ 这 4 种形态都是**同一个页面**（en 的 ACV 工具页）：
  //   ① sitemap 侧传的是 `/<lang>/<slug>`（无 index.html）
  //   ② 带尾斜杠
  //   ③ 带 index.html 后缀
  //   ④ dist 相对路径形态
  // ⇒ **寻址结果必须完全相同** —— 这正是 B3-6 根因所在的那一层。
  const same = [
    '/en/solopreneur-acv-calculator',
    '/en/solopreneur-acv-calculator/',
    '/en/solopreneur-acv-calculator/index.html',
    'dist/en/solopreneur-acv-calculator/index.html',
  ];
  const times = same.map((p) => mod.getMtimeForHtmlPath(p));
  const unresolved = same.filter((_, i) => times[i] === null);
  assert.deepEqual(unresolved, [],
    '这些路径形态解析不到源文件：' + unresolved.join(' | ') +
    '（映射表的 key 形态与调用形态不一致 ⇒ 100% 回退到构建时刻）');
  const uniq = new Set(times.map((t) => (t as Date).getTime()));
  assert.equal(uniq.size, 1,
    '同一页面的 4 种路径形态解析出了**不同**的时间戳：' +
    same.map((p, i) => p + ' → ' + (times[i] as Date).toISOString()).join(' | '));
  // 另一个语言页（不同页面 ⇒ 时间**允许**不同）但必须能解析
  const zh = mod.getMtimeForHtmlPath('/zh/solopreneur-acv-calculator');
  assert.ok(zh !== null, 'zh 页解析失败 ⇒ 形态归一化对语言维度失效');
});

// ============================================================
// 断言 3（source-only）· 真相源层 · 「用的是 git 内容时间，不是 mtime」
// ============================================================
test('P168 B3-6：⭐ 真相源 —— 工具页的 lastmod 必须等于「locale + 工具注册表 + 引擎」中最新的 git 变更时间', async () => {
  const mod = await loadImpl();
  // ⭐ 期望值**独立**枚举（守卫自己列文件、自己调 git），不复用实现的取数逻辑
  //   ⇒ 实现若换了源文件集合 / 退回 mtime / 退回构建时刻，本条会红。
  //
  // ⚠️ 动态路由页（`[lang]/[slug].astro`）**每次构建都被触碰**
  //   （实测 src/pages 下 32 个 .astro，只有它被刷新）
  //   ⇒ 工具页必须取**内容数据源**的时间，而不是路由源文件的时间。
  const table = gitTimeTable();
  const cands = [
    'src/i18n/locales/en.json',
    'src/data/tools/index.ts',
    ...listRel(resolve(root, 'src/engines'), root),
  ];
  const times = cands.map((p) => table.get(p)).filter((t): t is number => typeof t === 'number');
  assert.ok(times.length > 50, '候选源文件太少（' + times.length + '）⇒ git 表可能没建起来');
  const expected = Math.max(...times);
  const actual = mod.getMtimeForHtmlPath('/en/solopreneur-acv-calculator');
  assert.ok(actual !== null, '工具页 lastmod 解析失败');
  assert.equal((actual as Date).getTime(), expected,
    '工具页 lastmod = ' + (actual as Date).toISOString() +
    '，但「locale + 工具注册表 + 引擎」中最新的 git 变更时间是 ' + new Date(expected).toISOString() +
    '⇒ 真相源不是 git 内容时间（退回 mtime 或构建时刻了？）');
});

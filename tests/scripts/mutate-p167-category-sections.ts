#!/usr/bin/env node
// P167 —— 变异台子：证明 P167 的三个守卫断言**真的在测**。
//
// 为什么要有它
// ------------
// 「守卫全绿」≠「守卫真的在测」。P167 新增了三个守卫：
//   · category-content-uniqueness-guard（source-only）守「内容不模板化」
//   · category-page-sections-guard（build-dep）守「三区块齐平」
//   · category-page-similarity-guard（build-dep）守「整页之间没有变得更像」
// 其中**两条都是「检查违规」型断言** —— 在没有违规时它们本来就绿，
// 所以「全绿」完全可能是空转。
//
// 这个台子把每个守卫真的弄红一次，看它**接不接得住**：
//   M1 15 个分类的 intro.1 全换成同一段  ⇒ 模板词份额断言红
//   M2 6 个分类的 faq 答案末尾追加同一句  ⇒ 跨分类共用 5-gram 断言红
//   M3 删掉一个分类的 FAQ 第 3 条（locale）  ⇒ FAQ 条数不一致断言红
//   M4 把产物里介绍段的 h2 改坏           ⇒ 「找不到介绍段」断言红
//   M5 把产物里一张指南卡删掉             ⇒ 指南卡数不一致断言红
//   M6 把另一个分类页的正文塞进本页       ⇒ 页面相似度断言红
//
// 纪律（照抄 P166 的台子，别改松）：
//   · 快照落盘 → **每轮开头还原** → 收尾**无条件**还原 + sha256 逐字节校验；
//   · 锚点必须**唯一**（命中 0 次或 >1 次 ⇒ 判 INVALID，不计 KILLED/SURVIVED）；
//   · 变异必须用**函数式替换**（replace(find, () => to)，避免 $& 被当模板）；
//   · 变异必须保持文件**可解析**（JSON 变异后仍能被 JSON.parse）；
//   · 还原列表必须包含**每条变异的全部目标文件**。
//
// ⚠️ 本台子会改 src/i18n/locales/*.json 与 dist/**/*.html ——
//   **不要**把它接进 pnpm check（它会改工作区）。
//
// 跑法（必须从仓库根目录跑 —— 台子用的是仓库根相对路径）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/mutate-p167-category-sections.ts
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { categories } from '../../src/data/categories.ts';

const ROOT = resolve(join(fileURLToPath(import.meta.url), '..', '..', '..'));

const GUARD_CONTENT = 'tests/category-content-uniqueness-guard.test.ts';
const GUARD_SECTIONS = 'tests/category-page-sections-guard.test.ts';
const GUARD_SIMILARITY = 'tests/category-page-similarity-guard.test.ts';

const EN = 'src/i18n/locales/en.json';
const ZH = 'src/i18n/locales/zh.json';

const SNAP_DIR = join(ROOT, 'tmp', 'p167-mutate-snapshots');

const snapshots = new Map<string, Uint8Array>();

function snapPath(file: string): string {
  return join(SNAP_DIR, file.split(/[\\/]/).join('__'));
}

function snapshot(file: string): void {
  mkdirSync(SNAP_DIR, { recursive: true });
  const bytes = new Uint8Array(readFileSync(join(ROOT, file)));
  writeFileSync(snapPath(file), bytes);
  snapshots.set(file, bytes);
}

function restore(file: string): void {
  const abs = join(ROOT, file);
  if (!snapshots.has(file)) {
    if (existsSync(snapPath(file))) {
      const bytes = new Uint8Array(readFileSync(snapPath(file)));
      snapshots.set(file, bytes);
      writeFileSync(abs, bytes);
      return;
    }
    snapshot(file);
    return;
  }
  writeFileSync(abs, snapshots.get(file)!);
}

function verifyRestored(): void {
  for (const [file, bytes] of snapshots) {
    const now = createHash('sha256').update(new Uint8Array(readFileSync(join(ROOT, file)))).digest('hex');
    const orig = createHash('sha256').update(bytes).digest('hex');
    if (now !== orig) throw new Error('还原失败（sha256 不一致）: ' + file);
  }
  console.log('还原校验 OK（sha256 逐字节一致，' + snapshots.size + ' 个文件）');
}

function replaceOnce(src: string, find: string, to: string, label: string): string {
  const parts = src.split(find);
  if (parts.length - 1 !== 1) {
    throw new Error('锚点命中 ' + (parts.length - 1) + ' 次（应为 1）: ' + label);
  }
  return parts[0] + to + parts[1];
}

function runGuard(guard: string) {
  try {
    const out = execFileSync(
      'node',
      ['node_modules/tsx/dist/cli.mjs', '--test', '--test-concurrency=1', guard],
      {
        encoding: 'utf8',
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, RUN_BUILD_TESTS: '1' },
      },
    );
    return { ok: true, out };
  } catch (e: any) {
    return { ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

function localeFile(file: string): Record<string, string> {
  return JSON.parse(readFileSync(join(ROOT, file), 'utf8')) as Record<string, string>;
}

function dumpLocale(file: string, obj: Record<string, string>): string {
  return JSON.stringify(obj, null, 2) + String.fromCharCode(10);
}

const LETTERS = categories.map((c) => c.id);
const slugOf = (letter: string): string => {
  const c = categories.find((x) => x.id === letter);
  if (!c) throw new Error('找不到分类 ' + letter);
  return c.slug;
};

interface Mutation {
  id: string;
  desc: string;
  guard: string;
  expect: string;
  targets: string[];
  apply: (files: Map<string, string>) => Map<string, string>;
}

const MUTATIONS: Mutation[] = [
  {
    id: 'M1',
    desc: '15 个分类的 intro.1 全换成同一段 ⇒ 模板词份额断言红',
    guard: GUARD_CONTENT,
    expect: '组内模板词份额',
    targets: [EN, ZH],
    apply: (files) => {
      const out = new Map(files);
      for (const file of [EN, ZH]) {
        const obj = localeFile(file);
        // donor = 当前最长的一段 intro.1（运行时取，不写死）
        let donor = '';
        for (const L of LETTERS) {
          const t = obj['category.' + L + '.intro.1'] ?? '';
          if (t.length > donor.length) donor = t;
        }
        if (donor.length < 60) throw new Error('donor 太短，长不出 5-gram: ' + donor.length);
        for (const L of LETTERS) obj['category.' + L + '.intro.1'] = donor;
        out.set(file, dumpLocale(file, obj));
      }
      return out;
    },
  },
  {
    id: 'M2',
    desc: '6 个分类的 faq.q5.a 末尾追加同一句 ⇒ 跨分类共用 5-gram 断言红',
    guard: GUARD_CONTENT,
    expect: '同一个 5-gram 被',
    targets: [EN, ZH],
    apply: (files) => {
      const out = new Map(files);
      const six = LETTERS.slice(0, 6);
      for (const file of [EN, ZH]) {
        const obj = localeFile(file);
        const isZh = file === ZH;
        const sentence = isZh
          ? ' 每周跑这个指标的团队，最后比的都是同一批数字和同一个方向。'
          : ' Every team that runs this metric weekly ends up comparing the same handful of numbers in the same direction.';
        for (const L of six) {
          const key = 'category.' + L + '.faq.q5.a';
          const cur = obj[key];
          if (cur === undefined) throw new Error('缺键: ' + key);
          obj[key] = cur + sentence;
        }
        out.set(file, dumpLocale(file, obj));
      }
      return out;
    },
  },
  {
    id: 'M3',
    desc: '删掉 M 分类 FAQ 第 3 条（locale）⇒ FAQ 条数不一致断言红',
    guard: GUARD_SECTIONS,
    expect: 'FAQ 渲染',
    targets: [EN, ZH],
    apply: (files) => {
      const out = new Map(files);
      for (const file of [EN, ZH]) {
        const obj = localeFile(file);
        const kq = 'category.M.faq.q3.q';
        const ka = 'category.M.faq.q3.a';
        if (!(kq in obj) || !(ka in obj)) throw new Error('缺键: ' + kq);
        delete obj[kq];
        delete obj[ka];
        out.set(file, dumpLocale(file, obj));
      }
      return out;
    },
  },
  {
    id: 'M4',
    desc: '把产物里 S 分类介绍段的 h2 改坏 ⇒ 「找不到介绍段」断言红',
    guard: GUARD_SECTIONS,
    expect: '找不到介绍段',
    targets: ['dist/en/sales/index.html', 'dist/zh/sales/index.html'],
    apply: (files) => {
      const out = new Map(files);
      const pairs: [string, string][] = [
        ['dist/en/sales/index.html', 'About Sales Calculators'],
        ['dist/zh/sales/index.html', '关于销售计算器'],
      ];
      for (const [file, heading] of pairs) {
        const src = files.get(file)!;
        out.set(file, replaceOnce(src, '>' + heading + '</h2>', '>改坏的介绍段标题</h2>', file));
      }
      return out;
    },
  },
  {
    id: 'M5',
    desc: '把产物里 S 分类的一张指南卡删掉 ⇒ 指南卡数不一致断言红',
    guard: GUARD_SECTIONS,
    expect: '分类指南渲染',
    targets: ['dist/en/sales/index.html'],
    apply: (files) => {
      const out = new Map(files);
      const file = 'dist/en/sales/index.html';
      const src = files.get(file)!;
      // 注意：产物里 `&` 被转义成 `&` —— 用拼接写，避免编辑通道把实体还原成 &
      const h2 = src.indexOf('>Guides &' + 'amp; Articles</h2>');
      if (h2 < 0) throw new Error('找不到 Guides & Articles 标题');
      const aStart = src.indexOf('<article', h2);
      if (aStart < 0) throw new Error('指南区里没有 <article>');
      const aEnd = src.indexOf('</article>', aStart);
      if (aEnd < 0) throw new Error('指南区的 <article> 没有闭合');
      const end = aEnd + '</article>'.length;
      out.set(file, src.slice(0, aStart) + src.slice(end));
      return out;
    },
  },
  {
    id: 'M6',
    desc: '把 H 分类页的正文塞进 S 分类页 ⇒ 页面相似度断言红',
    guard: GUARD_SIMILARITY,
    expect: '最大相似度',
    targets: ['dist/en/sales/index.html', 'dist/en/hiring-team/index.html'],
    apply: (files) => {
      const out = new Map(files);
      const donor = files.get('dist/en/hiring-team/index.html')!;
      const m = donor.match(/<main[^>]*>([\s\S]*?)<\/main>/);
      if (!m) throw new Error('donor 页面里没有 <main>');
      const inner = m[1]!;
      const file = 'dist/en/sales/index.html';
      const tgt = files.get(file)!;
      const idx = tgt.lastIndexOf('</main>');
      if (idx < 0) throw new Error('target 页面里没有 </main>');
      out.set(file, tgt.slice(0, idx) + inner + tgt.slice(idx));
      return out;
    },
  },
];

function allFiles(): string[] {
  const files = new Set<string>([EN, ZH]);
  for (const m of MUTATIONS) for (const f of m.targets) files.add(f);
  return [...files];
}

let killed = 0;
let survived = 0;
let invalid = 0;

function cleanup(): void {
  for (const f of allFiles()) restore(f);
  verifyRestored();
  rmSync(SNAP_DIR, { recursive: true, force: true });
}

for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    try {
      cleanup();
    } finally {
      process.exit(1);
    }
  });
}

try {
  for (const f of allFiles()) {
    if (!existsSync(join(ROOT, f))) {
      console.log('缺目标文件（先跑 pnpm build）: ' + f);
      process.exit(1);
    }
    if (existsSync(snapPath(f))) {
      writeFileSync(join(ROOT, f), new Uint8Array(readFileSync(snapPath(f))));
    }
    snapshot(f);
    restore(f);
  }

  for (const g of [GUARD_CONTENT, GUARD_SECTIONS, GUARD_SIMILARITY]) {
    const base = runGuard(g);
    if (!base.ok) {
      console.log('基线就红 ⇒ 台子有问题，先怀疑台子。守卫: ' + g);
      console.log(base.out.slice(-2500));
      process.exit(1);
    }
    console.log('基线绿 ✓ ' + g);
  }
  console.log('');

  for (const m of MUTATIONS) {
    for (const f of allFiles()) restore(f);

    const files = new Map<string, string>();
    for (const f of m.targets) files.set(f, readFileSync(join(ROOT, f), 'utf8'));
    let mutated: Map<string, string>;
    try {
      mutated = m.apply(files);
    } catch (e: any) {
      console.log('[' + m.id + '] INVALID —— ' + e.message);
      invalid += 1;
      continue;
    }
    let changed = false;
    for (const [f, text] of mutated) {
      if (text !== files.get(f)) {
        changed = true;
        writeFileSync(join(ROOT, f), text, 'utf8');
      }
    }
    if (!changed) {
      console.log('[' + m.id + '] INVALID —— 变异没有改变任何文件');
      invalid += 1;
      continue;
    }

    const res = runGuard(m.guard);
    const caught = !res.ok && res.out.includes(m.expect);
    if (caught) {
      killed += 1;
      console.log('[' + m.id + '] KILLED —— ' + m.desc);
    } else {
      survived += 1;
      console.log('[' + m.id + '] ⚠️ SURVIVED —— ' + m.desc);
      console.log('      期望失败信息里包含「' + m.expect + '」；实际：' + (res.ok ? '守卫全绿' : '红了但不是这条断言'));
      console.log(res.out.slice(-1500));
    }
  }
} finally {
  cleanup();
}

console.log('');
console.log('KILLED ' + killed + '｜SURVIVED ' + survived + '｜INVALID ' + invalid);
process.exitCode = survived > 0 || invalid > 0 ? 1 : 0;

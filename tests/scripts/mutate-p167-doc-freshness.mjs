import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

// P167 —— 变异台子：证明 doc-freshness-guard 的断言**真的在测**。
//
// 为什么需要它
// --------------
// 「守卫全绿」≠「守卫真的在测」—— 尤其这个守卫守的是**文档**，
// 而文档类守卫最容易变成「永远绿」：
//   · 正则写错 ⇒ 匹配到 0 个 ⇒ 断言「没有漂移」永远成立；
//   · 判据写得太宽 ⇒ 真实漂移也抓不到。
// ⇒ 本台子把 README / INDEX **真的改坏**，看守卫是否红。
//
// 纪律（照抄 P166/P167 的台子）：
//   · 快照 → 每轮开头还原 → 收尾**无条件**还原；
//   · 变异必须真的改变文件（否则判 INVALID，不计 SURVIVED）；
//   · 基线必须先绿（否则是台子自己的问题）。
//   · ⭐ 变异要**隔离规则**：M10 让合计不变（只测段计数）、M11 只改总数行、
//     M12 删整行 —— 否则一条变异同时触发多条规则，测不出是哪条在承重。
//   · ⭐ M9 专门杀「已登记判定过松」：那个文件名在**散文**里被提过 ⇒
//     松口径会以为它已登记 ⇒ 漏登记失明。
//
// ⚠️ 本台子会**临时改写仓库里的 README / INDEX** ⇒ 不要接进 pnpm check。
//
// 跑法（必须从仓库根目录跑）：
//   node tests/scripts/mutate-p167-doc-freshness.mjs
const ROOT = process.cwd();
const NL = String.fromCharCode(10);
const TARGETS = [
  'README.md',
  'docs/superpowers/plans/INDEX.md',
  'docs/superpowers/specs/INDEX.md',
  'memory/INDEX.md',
];
const backups = new Map();
for (const t of TARGETS) backups.set(t, readFileSync(join(ROOT, t)));

function restore() {
  for (const [f, buf] of backups) writeFileSync(join(ROOT, f), buf);
}

function runGuard() {
  try {
    execFileSync(
      'node',
      ['node_modules/tsx/dist/cli.mjs', '--test', '--test-concurrency=1', 'tests/doc-freshness-guard.test.ts'],
      { encoding: 'utf8', cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return { ok: true, out: '' };
  } catch (e) {
    return { ok: false, out: String(e.stdout ?? '') + String(e.stderr ?? '') };
  }
}
const MUTATIONS = [
  {
    id: 'M1',
    desc: 'README 分类表加一个幽灵分类 I',
    apply: () => {
      const p = join(ROOT, 'README.md');
      const s = readFileSync(p, 'utf8');
      const out = s.replace('| **A** | SaaS Metrics | 5 |',
        '| **I** | Investment | 5 |' + NL + '| **A** | SaaS Metrics | 5 |');
      if (out === s) throw new Error('锚点未命中');
      writeFileSync(p, out, 'utf8');
    },
  },
  {
    id: 'M2',
    desc: 'README 删掉一个真实分类 A',
    apply: () => {
      const p = join(ROOT, 'README.md');
      const s = readFileSync(p, 'utf8');
      const out = s.replace('| **A** | SaaS Metrics | 5 |' + NL, '');
      if (out === s) throw new Error('锚点未命中');
      writeFileSync(p, out, 'utf8');
    },
  },
  {
    id: 'M3',
    desc: 'README 写死一个会漂的页数',
    apply: () => {
      const p = join(ROOT, 'README.md');
      const s = readFileSync(p, 'utf8');
      const out = s.replace('# Production build → dist/', '# Production build → dist/ (~313 static pages');
      if (out === s) throw new Error('锚点未命中');
      writeFileSync(p, out, 'utf8');
    },
  },
  {
    id: 'M4',
    desc: '从 plans INDEX 删掉一条登记（制造漏登记）',
    apply: () => {
      const p = join(ROOT, 'docs/superpowers/plans/INDEX.md');
      const s = readFileSync(p, 'utf8');
      const out = s.replace(/\| `2026-07-20-p48-claude-md-lessons\.md`[^\n]*\n/, '');
      if (out === s) throw new Error('锚点未命中');
      writeFileSync(p, out, 'utf8');
    },
  },
  {
    id: 'M5',
    desc: '给 plans INDEX 加一个不存在的文件（幽灵）',
    apply: () => {
      const p = join(ROOT, 'docs/superpowers/plans/INDEX.md');
      const s = readFileSync(p, 'utf8');
      const out = s.replace('| 文件 | 标题 | 日期 |',
        '| `2099-01-01-not-exist.md` | x | 2099-01-01 |' + NL + '| 文件 | 标题 | 日期 |', 1);
      if (out === s) throw new Error('锚点未命中');
      writeFileSync(p, out, 'utf8');
    },
  },
  {
    id: 'M7',
    desc: 'README 加一个指向不存在文件的链接',
    apply: () => {
      const p = join(ROOT, 'README.md');
      const s = readFileSync(p, 'utf8');
      const out = s.replace('## Calculator Categories', '## Calculator Categories\n\nSee [nowhere](./does-not-exist.md) for details.');
      if (out === s) throw new Error('锚点未命中');
      writeFileSync(p, out, 'utf8');
    },
  },
  {
    id: 'M8',
    desc: 'README 分类表把 M 分类的算子数写错（8 → 9）',
    apply: () => {
      const p = join(ROOT, 'README.md');
      const s = readFileSync(p, 'utf8');
      const out = s.replace('| **M** | Marketing Analytics | 8 |', '| **M** | Marketing Analytics | 9 |');
      if (out === s) throw new Error('锚点未命中');
      writeFileSync(p, out, 'utf8');
    },
  },
  {
    id: 'M9',
    desc: 'memory INDEX 删掉一条登记，但该文件名在**散文**里被提过 ⇒ 漏登记必须仍被红（隔离「登记只看表格首列」这条严格性）',
    apply: () => {
      const p = join(ROOT, 'memory/INDEX.md');
      const s = readFileSync(p, 'utf8');
      const out = s.replace(/\n\| `p10-holistic-fix-shipped\.md` \|[^\n]*/, '');
      if (out === s) throw new Error('锚点未命中');
      writeFileSync(p, out, 'utf8');
    },
  },
  {
    id: 'M10',
    desc: 'plans 计数表：第 9 段 38→39 且第 8 段 1→0（合计不变 ⇒ 只触发「段计数」规则）',
    apply: () => {
      const p = join(ROOT, 'docs/superpowers/plans/INDEX.md');
      const s = readFileSync(p, 'utf8');
      const out = s
        .replace('| 8 · Excluded (pr-body) | 1 |', '| 8 · Excluded (pr-body) | 0 |')
        .replace('| 9 · P48+ — 后续批次（P48 → P166） | 38 |', '| 9 · P48+ — 后续批次（P48 → P166） | 39 |');
      if (out === s) throw new Error('锚点未命中');
      writeFileSync(p, out, 'utf8');
    },
  },
  {
    id: 'M11',
    desc: 'plans 计数表的「目录文件总数」109→108（只触发「总数」规则）',
    apply: () => {
      const p = join(ROOT, 'docs/superpowers/plans/INDEX.md');
      const s = readFileSync(p, 'utf8');
      const out = s.replace('| **目录文件总数** | **109** |', '| **目录文件总数** | **108** |');
      if (out === s) throw new Error('锚点未命中');
      writeFileSync(p, out, 'utf8');
    },
  },
  {
    id: 'M12',
    desc: 'specs 计数表删掉第 9 段那一行（计数表缺段）',
    apply: () => {
      const p = join(ROOT, 'docs/superpowers/specs/INDEX.md');
      const s = readFileSync(p, 'utf8');
      const out = s.replace('\n| 9 · P155+ — AdSense 诊断与 2.0 收口 | 1 |', '');
      if (out === s) throw new Error('锚点未命中');
      writeFileSync(p, out, 'utf8');
    },
  },
  {
    id: 'M6',
    desc: '从 memory INDEX 删掉一条登记',
    apply: () => {
      const p = join(ROOT, 'memory/INDEX.md');
      const s = readFileSync(p, 'utf8');
      const out = s.replace(/\| `p103-dead-i18n-keys-guard-shipped\.md`[^\n]*\n/, '');
      if (out === s) throw new Error('锚点未命中');
      writeFileSync(p, out, 'utf8');
    },
  },
];

let killed = 0;
let survived = 0;
try {
  const base = runGuard();
  if (!base.ok) {
    console.log('基线就红 ⇒ 先怀疑自己（守卫或台子有问题）');
    console.log(base.out.slice(-2000));
    process.exit(1);
  }
  console.log('基线绿 ✓');
  console.log('');
  for (const m of MUTATIONS) {
    restore();
    try {
      m.apply();
    } catch (e) {
      console.log('[' + m.id + '] INVALID —— ' + e.message);
      survived++;
      continue;
    }
    const res = runGuard();
    if (!res.ok) {
      killed++;
      console.log('[' + m.id + '] KILLED —— ' + m.desc);
    } else {
      survived++;
      console.log('[' + m.id + '] ⚠️ SURVIVED —— ' + m.desc);
    }
  }
} finally {
  restore();
}
console.log('');
console.log('KILLED ' + killed + '｜SURVIVED ' + survived);
process.exitCode = survived > 0 ? 1 : 0;

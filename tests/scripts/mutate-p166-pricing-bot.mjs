#!/usr/bin/env node
// P166 —— 变异台子：证明 P166 的守卫断言**真的在测**。
//
// 为什么要有它
// ------------
// 「守卫全绿」≠「守卫真的在测」。P166 的守卫里有几条很容易写成**永远绿**的断言
// （比如「_rule.datasetModelCount == 数据集总数」—— 如果两边都读同一个文件、
// 或者断言写成了 `assert.ok(true)`，它就永远不会红）。
//
// 这个台子把守卫真的弄红一次，看它**接不接得住**：
//   M1 从 popularModelKeys 删一个 key         ⇒ 划分等式红
//   M2 从 excludedModelKeys 删一个 key        ⇒ 族成死族 ⇒ 死族守卫红
//   M3 把 _rule.excludedModelCount 改成别的数   ⇒ 声明≠实际红
//   M4 把 _rule.datasetModelCount 改成别的数   ⇒ 「bot 没跑」红
//   M5 把 workflow 里的策展步骤整段删掉        ⇒ 接线守卫红
//   M6 把 workflow 的 git add 里的 popular.json 删掉 ⇒ 接线守卫红
//   M7 把 excludedModelKeys 整块删掉          ⇒ 划分等式 + floor 红
//
// 纪律（照抄 P165 的台子，别改松）：
//   · 快照落盘 → **每轮开头还原** → 收尾**无条件**还原 + sha256 逐字节校验；
//   · 锚点必须**唯一**（命中 0 次或 >1 次 ⇒ 判 INVALID，不计 KILLED/SURVIVED）；
//   · 变异必须用**函数式替换**（`replace(find, () => to)`，避免 `$&` 被当模板）；
//   · 变异必须保持文件**可解析**（JSON 变异后仍能被 JSON.parse）；
//   · 还原列表必须包含**每条变异的全部目标文件**。
//
// 跑法（必须从仓库根目录跑 —— 台子用的是仓库根相对路径）：
//   node tests/scripts/mutate-p166-pricing-bot.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(join(fileURLToPath(import.meta.url), '..', '..', '..'));

const POPULAR = 'src/data/ai-pricing-popular.json';
const WORKFLOW = '.github/workflows/sync-pricing.yml';
const RULE_GUARD = 'tests/popular-models-rule-guard.test.ts';
const WIRING_GUARD = 'tests/pricing-bot-wiring-guard.test.ts';

const SNAP_DIR = join(ROOT, 'tmp', 'p166-mutate-snapshots');

// ---------------------------------------------------------------------------
// 快照 / 还原
// ---------------------------------------------------------------------------
const snapshots = new Map();

/** 快照文件在磁盘上的位置（路径分隔符换成 __，避免建出目录树）。 */
function snapPath(file) {
  return join(SNAP_DIR, file.split(/[\\/]/).join('__'));
}

/**
 * 把这个文件的**当前内容**记为基线（内存 + 落盘）。
 *
 * 内存那份是本轮运行用的；落盘那份是「上一次被打断」的恢复源。
 * 每次调用都会刷新落盘那份 —— 否则「上一次跑完留下的旧基线」会在下一次运行时
 * 把工作区回滚到旧内容（那比不还原更危险）。
 */
function snapshot(file) {
  mkdirSync(SNAP_DIR, { recursive: true });
  const bytes = readFileSync(join(ROOT, file));
  writeFileSync(snapPath(file), bytes);
  snapshots.set(file, bytes);
}

/**
 * 还原一个文件。
 *
 * 优先用内存快照；内存没有但磁盘上有 ⇒ 用磁盘那份（上一轮被打断的残留）；
 * 两份都没有 ⇒ 第一次见它，先快照再还原（等于没变）。
 */
function restore(file) {
  const abs = join(ROOT, file);
  if (!snapshots.has(file)) {
    if (existsSync(snapPath(file))) {
      const bytes = readFileSync(snapPath(file));
      snapshots.set(file, bytes);
      writeFileSync(abs, bytes);
      return;
    }
    snapshot(file);
    return;
  }
  writeFileSync(abs, snapshots.get(file));
}

function verifyRestored() {
  for (const [file, bytes] of snapshots) {
    const now = createHash('sha256').update(readFileSync(join(ROOT, file))).digest('hex');
    const orig = createHash('sha256').update(bytes).digest('hex');
    if (now !== orig) throw new Error('还原失败（sha256 不一致）: ' + file);
  }
  console.log('还原校验 OK（sha256 逐字节一致，' + snapshots.size + ' 个文件）');
}

/**
 * 函数式替换 + **唯一锚点**检查。
 *
 * 命中 0 次或 >1 次 ⇒ 抛错（判 INVALID，不计 KILLED/SURVIVED）——
 * 锚点不唯一时变异可能落在错误的位置，那样的「KILLED」是假的。
 */
function replaceOnce(src, find, to, label) {
  const parts = src.split(find);
  if (parts.length - 1 !== 1) {
    throw new Error('锚点命中 ' + (parts.length - 1) + ' 次（应为 1）: ' + label);
  }
  // 函数式替换：to 里的 $& / $1 等不会被当成模板变量。
  return parts[0] + to + parts[1];
}

/** 变异后 JSON 必须仍可解析（否则守卫会因 SyntaxError 而红，那是假红）。 */
function assertParsableJson(file) {
  if (!file.endsWith('.json')) return;
  JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
}

function runGuard(guard) {
  try {
    const out = execFileSync(
      'node',
      ['node_modules/tsx/dist/cli.mjs', '--test', '--test-concurrency=1', guard],
      { encoding: 'utf8', cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

// ---------------------------------------------------------------------------
// 变异清单
// ---------------------------------------------------------------------------
const MUTATIONS = [
  {
    id: 'M1',
    desc: '从 popularModelKeys 删一个 key ⇒ 划分等式红',
    file: POPULAR,
    guard: RULE_GUARD,
    expect: '策展 + 排除 必须等于数据集全集',
    apply: (s) =>
      replaceOnce(
        s,
        '    "openai": [\n      "gpt-6.1-sol",\n',
        '    "openai": [\n',
        'popularModelKeys 删 gpt-6.1-sol',
      ),
  },
  {
    id: 'M2',
    desc: '从 excludedModelKeys 删一个 key（族留着）⇒ 那个族成死族 ⇒ 死族守卫红',
    file: POPULAR,
    guard: RULE_GUARD,
    expect: '这些排除族一个被排除的模型都没命中',
    apply: (s) =>
      replaceOnce(
        s,
        '      "deepseek-reasoner",\n',
        '',
        'excludedModelKeys 删 deepseek-reasoner',
      ),
  },
  {
    id: 'M3',
    desc: '把 _rule.excludedModelCount 改成别的数 ⇒ 声明≠实际红',
    file: POPULAR,
    guard: RULE_GUARD,
    expect: '_rule.excludedModelCount 与实际排除数不符',
    apply: (s) =>
      replaceOnce(
        s,
        '"excludedModelCount": 201,',
        '"excludedModelCount": 999,',
        'excludedModelCount 改成 999',
      ),
  },
  {
    id: 'M4',
    desc: '把 _rule.datasetModelCount 改成别的数 ⇒ 「bot 没跑」红',
    file: POPULAR,
    guard: RULE_GUARD,
    expect: '说明定价 bot 的策展步骤没跑',
    apply: (s) =>
      replaceOnce(
        s,
        '"datasetModelCount": 245,',
        '"datasetModelCount": 999,',
        'datasetModelCount 改成 999',
      ),
  },
  {
    id: 'M5',
    desc: '把 workflow 里的策展步骤整段删掉 ⇒ 接线守卫红',
    file: WORKFLOW,
    guard: WIRING_GUARD,
    expect: '没有名为',
    apply: (s) => {
      const start = s.indexOf('      - name: Curate new models into the interactive set (P166)');
      if (start < 0) throw new Error('找不到策展步骤');
      const end = s.indexOf('      - name: Regenerate engine customFn data', start);
      if (end < 0) throw new Error('找不到策展步骤的结尾');
      return s.slice(0, start) + s.slice(end);
    },
  },
  {
    id: 'M6',
    desc: '把 workflow 的 git add 里的 popular.json 删掉 ⇒ 接线守卫红',
    file: WORKFLOW,
    guard: WIRING_GUARD,
    expect: 'git add 没有包含 src/data/ai-pricing-popular.json',
    apply: (s) =>
      replaceOnce(
        s,
        'git add src/data/ai-pricing.json src/data/ai-pricing-popular.json src/engines/',
        'git add src/data/ai-pricing.json src/engines/',
        'git add 去掉 popular.json',
      ),
  },
  {
    id: 'M7',
    desc: '把 excludedModelKeys 整块删掉 ⇒ 划分等式 + floor 红',
    file: POPULAR,
    guard: RULE_GUARD,
    expect: '策展 + 排除 必须等于数据集全集',
    apply: (s) => {
      const start = s.indexOf('  "excludedModelKeys": {\n');
      if (start < 0) throw new Error('找不到 excludedModelKeys 块');
      const end = s.indexOf('  "excludedFamilies": [\n', start);
      if (end < 0) throw new Error('找不到 excludedModelKeys 块的结尾');
      return s.slice(0, start) + s.slice(end);
    },
  },
];

/** 台子要管住的所有文件（含每条变异的全部目标文件）。 */
function allFiles() {
  const files = new Set([POPULAR, WORKFLOW]);
  for (const m of MUTATIONS) files.add(m.file);
  return [...files];
}

let killed = 0;
let survived = 0;
let invalid = 0;

function cleanup() {
  for (const f of allFiles()) restore(f);
  verifyRestored();
  // 跑完了 ⇒ 基线作废（下次跑从当前工作区取新基线）。
  // 只有「被打断」时才会留下落盘快照 —— 那正是下次启动要用来恢复的东西。
  rmSync(SNAP_DIR, { recursive: true, force: true });
}

// SIGINT / SIGTERM / SIGHUP —— 被打断时也要还原（否则工作区被留在变异状态）。
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
  // 启动先还原：上一轮被打断留下的变异必须先清掉，基线才是干净的。
  // （磁盘上已有快照 ⇒ 说明上一轮没跑完 ⇒ 先按磁盘那份还原成未变异的基线，
  //   再把它重新快照当本轮的基线。）
  for (const f of allFiles()) {
    if (existsSync(snapPath(f))) {
      writeFileSync(join(ROOT, f), readFileSync(snapPath(f)));
    }
    snapshot(f);
    restore(f);
  }

  const base = runGuard(RULE_GUARD);
  const baseWiring = runGuard(WIRING_GUARD);
  if (!base.ok || !baseWiring.ok) {
    console.log('基线就红 ⇒ 台子有问题，先怀疑台子。');
    console.log((base.ok ? '' : base.out.slice(-2500)) + (baseWiring.ok ? '' : baseWiring.out.slice(-2500)));
    process.exit(1);
  }
  console.log('基线绿 ✓（规则守卫 + 接线守卫）\n');

  for (const m of MUTATIONS) {
    // 每轮开头还原：上一轮的残留不能污染这一轮的基线。
    for (const f of allFiles()) restore(f);

    const abs = join(ROOT, m.file);
    const src = readFileSync(abs, 'utf8');
    let mutated;
    try {
      mutated = m.apply(src);
    } catch (e) {
      console.log(`[${m.id}] INVALID —— ${e.message}`);
      invalid += 1;
      continue;
    }
    if (mutated === src) {
      console.log(`[${m.id}] INVALID —— 变异没有改变文件（锚点可能没命中）`);
      invalid += 1;
      continue;
    }
    writeFileSync(abs, mutated, 'utf8');

    try {
      assertParsableJson(m.file);
    } catch (e) {
      console.log(`[${m.id}] INVALID —— 变异后文件不可解析: ${e.message}`);
      invalid += 1;
      continue;
    }

    const res = runGuard(m.guard);
    const caught = !res.ok && res.out.includes(m.expect);
    if (caught) {
      killed += 1;
      console.log(`[${m.id}] KILLED —— ${m.desc}`);
    } else {
      survived += 1;
      console.log(`[${m.id}] ⚠️ SURVIVED —— ${m.desc}`);
      console.log(
        `      期望失败信息里包含「${m.expect}」；实际：` +
          (res.ok ? '守卫全绿' : '红了但不是这条断言'),
      );
      console.log(res.out.slice(-1200));
    }
  }
} finally {
  // 无条件还原 + 逐字节校验。
  cleanup();
}

console.log(`\nKILLED ${killed}｜SURVIVED ${survived}｜INVALID ${invalid}`);
process.exitCode = survived > 0 || invalid > 0 ? 1 : 0;

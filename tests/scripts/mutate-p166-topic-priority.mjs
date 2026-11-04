#!/usr/bin/env node
// P166 —— 变异台子（价格纪律分档）：证明 P166-B 的价格守卫断言**真的在测**。
//
// 为什么要有它
// ------------
// 「守卫全绿」≠「守卫真的在测」。本批刚把价格纪律的判据从
// 「只查带 1M / per million / 每百万字样的句子」改成「查整段里的所有手写单价」，
// 并把「哪些主题走严格档」从**手写清单**改成**从 topics.ts 派生**。
// 这两条改动的风险正是「写成永远绿」：
//   · 如果 handTypedPrices 永远返回空 ⇒ 手写单价断言是空转；
//   · 如果严格档集合是空的 ⇒ 「严格档主题必须用 live token」断言是空转；
//   · 如果严格档漏了某个 B 类主题 ⇒ 那条主题的手写单价会静默漏过。
//
// 这个台子把守卫真的弄红一次，看它**接不接得住**：
//   M1 在严格档主题里塞一个手写单价（不带 1M 字样）⇒ 手写单价断言红
//   M2 把一个 live token 换成手写单价            ⇒ 手写单价断言红
//   M3 把 topics.ts 里某个 B 类主题的 letterId 改掉 ⇒ 派生集断言红
//   M4 把 policy 里的 MODEL_PRICE_LETTERS 清空   ⇒ 严格档断言红（空转防护）
//   M5 让 handTypedPrices 永远返回空             ⇒ 手写单价断言红（空转防护）
//   M6 把 B 类主题的 live token 全删掉           ⇒ live token 断言红
//
// 纪律（照抄 P166-A 的台子，别改松）：
//   · 快照落盘 → **每轮开头还原** → 收尾**无条件**还原 + sha256 逐字节校验；
//   · 锚点必须**唯一**（命中 0 次或 >1 次 ⇒ 判 INVALID，不计 KILLED/SURVIVED）；
//   · 变异必须用**函数式替换**（replace(find, () => to)，避免 $& 被当模板）；
//   · 变异必须保持文件**可解析**（.ts 变异后仍能被 tsx 加载）；
//   · 还原列表必须包含**每条变异的全部目标文件**。
//
// 跑法（必须从仓库根目录跑 —— 台子用的是仓库根相对路径）：
//   node tests/scripts/mutate-p166-topic-priority.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(join(fileURLToPath(import.meta.url), '..', '..', '..'));

const GUARD = 'tests/topic-priority-content-guard.test.ts';
const POLICY = 'tests/_topic-priority-policy.ts';
const TOPICS_SRC = 'src/data/topics.ts';
const PRIORITY_SRC = 'src/data/topic-priority/llm-api-cost-optimization.ts';

const SNAP_DIR = join(ROOT, 'tmp', 'p166b-mutate-snapshots');

const snapshots = new Map();

function snapPath(file) {
  return join(SNAP_DIR, file.split(/[\\/]/).join('__'));
}

function snapshot(file) {
  mkdirSync(SNAP_DIR, { recursive: true });
  const bytes = readFileSync(join(ROOT, file));
  writeFileSync(snapPath(file), bytes);
  snapshots.set(file, bytes);
}

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

function replaceOnce(src, find, to, label) {
  const parts = src.split(find);
  if (parts.length - 1 !== 1) {
    throw new Error('锚点命中 ' + (parts.length - 1) + ' 次（应为 1）: ' + label);
  }
  return parts[0] + to + parts[1];
}

function runGuard() {
  try {
    const out = execFileSync(
      'node',
      ['node_modules/tsx/dist/cli.mjs', '--test', '--test-concurrency=1', GUARD],
      { encoding: 'utf8', cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

const MUTATIONS = [
  {
    id: 'M1',
    desc: '在严格档主题里塞一个手写单价（不带 1M 字样）⇒ 手写单价断言红',
    file: PRIORITY_SRC,
    expect: '手写单价',
    // ⚠️ 锚点必须锚在**不会随内容改写而失效**的地方。
    //   第一版锚在导语的第一句（'Five cost metrics usually fail together:'）
    //   ⇒ 铺开后重写导语（去模板化）⇒ 锚点消失 ⇒ 变异 INVALID（命中 0 次）。
    //   ⇒ 改锚到 **rows 里的 metric 行**：导语改写不碰 rows ⇒ 锚点稳定。
    apply: (s) =>
      replaceOnce(
        s,
        "metric: 'Cache hit rate on stable-prefix prompts",
        "metric: 'The list price is $15 per request. Cache hit rate on stable-prefix prompts",
        'metric 塞手写单价',
      ),
  },
  {
    id: 'M2',
    desc: '把一个 live token 换成手写单价 ⇒ 手写单价断言红',
    file: PRIORITY_SRC,
    expect: '手写单价',
    apply: (s) =>
      replaceOnce(
        s,
        'is {{liveIn:openai/gpt-5}} per 1M tokens',
        'is $1.25 per 1M tokens',
        'liveIn 换成手写 $1.25',
      ),
  },
  {
    id: 'M3',
    desc: '把 policy 的分档字母从 B 改成不存在的 Z ⇒ B 类主题掉出严格档 ⇒ 覆盖断言红',
    file: POLICY,
    expect: '却不在严格档里',
    apply: (s) =>
      replaceOnce(
        s,
        "export const MODEL_PRICE_LETTERS = ['B'] as const;",
        "export const MODEL_PRICE_LETTERS = ['Z'] as const;",
        'MODEL_PRICE_LETTERS 改成 Z',
      ),
  },
  {
    id: 'M7',
    desc: '把 policy 的分档退化成「只含 1 个主题」的手写清单 ⇒ 覆盖不全断言红',
    file: POLICY,
    expect: '却不在严格档里',
    apply: (s) =>
      replaceOnce(
        s,
        "TOPICS.filter((t) => (MODEL_PRICE_LETTERS as readonly string[]).includes(t.letterId)).map((t) => t.id)",
        "TOPICS.filter((t) => t.id === 'llm-api-cost-optimization').map((t) => t.id)",
        'policy 的派生逻辑退化成手写清单',
      ),
  },
  {
    id: 'M4',
    desc: '把 policy 里的 MODEL_PRICE_LETTERS 清空 ⇒ 严格档集合空 ⇒ 空转防护红',
    file: POLICY,
    expect: '没有任何主题落在严格档',
    apply: (s) =>
      replaceOnce(
        s,
        "export const MODEL_PRICE_LETTERS = ['B'] as const;",
        'export const MODEL_PRICE_LETTERS = [] as string[];',
        'MODEL_PRICE_LETTERS 清空',
      ),
  },
  {
    id: 'M5',
    desc: '让 handTypedPrices 永远返回空 ⇒ 手写单价断言红（空转防护）',
    file: POLICY,
    expect: '手写单价',
    apply: (s) =>
      replaceOnce(
        s,
        'export function handTypedPrices(text: string): string[] {',
        'export function handTypedPrices(text: string): string[] { if (text) return [];',
        'handTypedPrices 永远返回空',
      ),
  },
  {
    id: 'M6',
    desc: '把严格档主题的 live token 全删掉 ⇒ live token 断言红',
    file: PRIORITY_SRC,
    expect: '落在严格档却一个 live token 都没有',
    apply: (s) => {
      const out = s.replace(/\{\{live[^}]*\}\}/g, 'the live price');
      if (out === s) throw new Error('没找到 live token');
      return out;
    },
  },
];

function allFiles() {
  const files = new Set([GUARD, POLICY, TOPICS_SRC, PRIORITY_SRC]);
  for (const m of MUTATIONS) files.add(m.file);
  return [...files];
}

let killed = 0;
let survived = 0;
let invalid = 0;

function cleanup() {
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
    if (existsSync(snapPath(f))) {
      writeFileSync(join(ROOT, f), readFileSync(snapPath(f)));
    }
    snapshot(f);
    restore(f);
  }

  const base = runGuard();
  if (!base.ok) {
    console.log('基线就红 ⇒ 台子有问题，先怀疑台子。');
    console.log(base.out.slice(-2500));
    process.exit(1);
  }
  console.log('基线绿 ✓（价格纪律守卫）\n');

  for (const m of MUTATIONS) {
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

    const res = runGuard();
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
      console.log(res.out.slice(-1500));
    }
  }
} finally {
  cleanup();
}

console.log(`\nKILLED ${killed}｜SURVIVED ${survived}｜INVALID ${invalid}`);
process.exitCode = survived > 0 || invalid > 0 ? 1 : 0;

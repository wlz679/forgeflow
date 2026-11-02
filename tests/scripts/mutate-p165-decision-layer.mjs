// P165 —— 变异台子：证明 P165 新加/改造的守卫断言**真的在测**。
//
// M1 从 index.ts 里删掉一个分类（模拟「只配了 1 个类别」的样板状态）
//    → 期望被「每一个分类都必须有决策层」抓住
// M2 把某个分类的 chain 删到只剩 1 步
//    → 期望被「every decision layer has a chain and a choices table」抓住
// M3 从某个分类的 choices 里删掉一行
//    → 期望被「the choices table covers exactly the tools of the category」抓住
// M4 把某个分类的 chain 里所有工具都去掉
//    → 期望被「the chain reaches every tool of the category」抓住
// M5 在某个分类的 purpose 里塞一个价格（$1.50）
//    → 期望被「no decision layer text contains a price」抓住
//
// ⭐ 额外验证 **P165 的守卫改造本身**：
//    M6 让**两个**分类同时坏掉 → 期望失败信息里**同时**出现两个分类
//    （改造前的写法会在第一个失败分类就抛 ⇒ 第二个分类的失败不可见）
//
// 纪律：快照落盘 → 每轮开头还原 → 收尾无条件还原 + sha256 逐字节校验。
//
// 跑法（必须从仓库根目录跑 —— 台子用的是仓库根相对路径）：
//   node tests/scripts/mutate-p165-decision-layer.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const INDEX = 'src/data/category-decision-layers/index.ts';
const GUARD = 'tests/category-decision-layer-guard.test.ts';

const snapshots = new Map();
function snapshot(file) {
  if (!snapshots.has(file)) snapshots.set(file, readFileSync(file));
  return snapshots.get(file);
}
function restore(file) {
  writeFileSync(file, snapshot(file));
}
function verifyRestored() {
  for (const [file, buf] of snapshots) {
    const now = createHash('sha256').update(readFileSync(file)).digest('hex');
    const orig = createHash('sha256').update(buf).digest('hex');
    if (now !== orig) throw new Error(`还原失败: ${file}`);
  }
  console.log('还原校验 OK（sha256 一致）');
}

function replaceOnce(src, find, to, label) {
  const parts = src.split(find);
  if (parts.length - 1 !== 1) throw new Error(`锚点命中 ${parts.length - 1} 次（应为 1）: ${label}`);
  return parts[0] + to + parts[1];
}

function runGuard() {
  try {
    const out = execFileSync(
      'node',
      ['node_modules/tsx/dist/cli.mjs', '--test', '--test-concurrency=1', GUARD],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

/** 找一个「有内容的分类」的 chain 第一步的 slugs 数组，做定点变异 */
function mutateFirstChainSlugs(src, mutate) {
  // 真实缩进：chain 的每一步是 4 空格的 `{`、6 空格的 `slugs: [...]`
  // ⚠️ 必须**保留方括号** —— 否则模块变成非法语法 ⇒ import 直接 SyntaxError ⇒
  //    根本到不了断言 ⇒ 台子会把「变异没生效」误报成「守卫没抓住」。
  const m = src.match(/(\n {6}slugs: )\[([^\]]*)\]/);
  if (!m) throw new Error('找不到 chain 第一步的 slugs');
  const head = m[1];
  const inner = m[2];
  const tailStart = m.index + m[0].length;
  return src.slice(0, m.index) + head + '[' + mutate(inner) + ']' + src.slice(tailStart);
}

/** 台子要管住的所有文件（含 M6 的 secondFile —— 漏了它 ⇒ 上一轮残留会污染下一轮基线） */
function allFiles() {
  const files = new Set([INDEX, GUARD]);
  for (const m of MUTATIONS) {
    files.add(m.file);
    if (m.secondFile) files.add(m.secondFile);
  }
  return [...files];
}

const MUTATIONS = [
  {
    id: 'M1',
    desc: '从 index.ts 的合并表里删掉一个分类（模拟「只配了 1 个类别」）',
    file: INDEX,
    apply: (s) => replaceOnce(s, '  S,\n', '', 'index.ts 删 S'),
    expect: '每一个分类都必须有决策层',
  },
  {
    id: 'M2',
    desc: '把某个分类的 chain 删到只剩 1 步',
    file: 'src/data/category-decision-layers/a.ts',
    apply: (s) => {
      // chain 数组：每一步以 4 空格的 `{` 开头
      const i = s.indexOf('  chain: [');
      const j = s.indexOf('\n  ],', i);
      const block = s.slice(i, j);
      const steps = block.split(/\n {4}\{\n/).slice(1);
      if (steps.length < 2) throw new Error(`a.ts 的 chain 步数不足（解析到 ${steps.length}）`);
      const rebuilt = '  chain: [\n    {' + steps.slice(1).join('\n    {\n');
      return s.slice(0, i) + rebuilt + s.slice(j);
    },
    expect: 'every decision layer has a chain and a choices table',
  },
  {
    id: 'M3',
    desc: '从某个分类的 choices 里删掉一行',
    file: 'src/data/category-decision-layers/a.ts',
    apply: (s) => {
      const i = s.indexOf('  choices: [');
      const j = s.indexOf('\n  ],', i);
      const block = s.slice(i, j);
      const rows = block.split(/\n {4}\{\n/).slice(1);
      if (rows.length < 2) throw new Error(`a.ts 的 choices 行数不足（解析到 ${rows.length}）`);
      const rebuilt = '  choices: [\n    {' + rows.slice(1).join('\n    {\n');
      return s.slice(0, i) + rebuilt + s.slice(j);
    },
    expect: 'the choices table covers exactly the tools of the category',
  },
  {
    id: 'M4',
    desc: '把某个分类 chain 第一步的 slugs 清空',
    file: 'src/data/category-decision-layers/a.ts',
    apply: (s) => mutateFirstChainSlugs(s, () => ''),
    expect: 'the chain reaches every tool of the category',
  },
  {
    id: 'M5',
    desc: '在某个分类的 purpose 里塞一个价格（$1.50）',
    file: 'src/data/category-decision-layers/a.ts',
    apply: (s) => {
      const m = s.match(/(\n {8}en: ')([^']*)(')/);
      if (!m) throw new Error('找不到 purpose.en');
      return s.slice(0, m.index) + m[1] + 'The blended cost is $1.50 per seat. ' + m[2] + m[3] + s.slice(m.index + m[0].length);
    },
    expect: 'no decision layer text contains a price',
  },
  {
    id: 'M6',
    desc: '⭐ 让两个分类同时坏掉 ⇒ 失败信息里必须**同时**出现两个分类',
    file: 'src/data/category-decision-layers/a.ts',
    apply: (s) => s.replace('  chain: [', '  chain: [\n    { slugs: [], purpose: { en: "x", zh: "x" } },'),
    expect: 'A:',
    expectAlso: 'C:',
    secondFile: 'src/data/category-decision-layers/c.ts',
    secondApply: (s) => s.replace('  chain: [', '  chain: [\n    { slugs: [], purpose: { en: "x", zh: "x" } },'),
  },
];

let killed = 0;
let survived = 0;
let invalid = 0;

try {
  for (const f of allFiles()) restore(f);
  const base = runGuard();
  if (!base.ok) {
    console.log('基线就红 ⇒ 台子有问题，先怀疑台子。');
    console.log(base.out.slice(-2500));
    process.exit(1);
  }
  console.log('基线绿 ✓\n');

  for (const m of MUTATIONS) {
    restore(INDEX);
    restore(GUARD);
    restore(m.file);
    if (m.secondFile) restore(m.secondFile);
    const src = readFileSync(m.file, 'utf8');
    let mutated;
    try {
      mutated = m.apply(src);
    } catch (e) {
      console.log(`[${m.id}] INVALID —— ${e.message}`);
      invalid++;
      continue;
    }
    if (mutated === src) {
      console.log(`[${m.id}] INVALID —— 变异没有改变文件（锚点可能没命中）`);
      invalid++;
      continue;
    }
    writeFileSync(m.file, mutated, 'utf8');
    // M6 要同时破坏两个分类 ⇒ 验证「全量报告」改造
    if (m.secondFile && m.secondApply) {
      const s2 = readFileSync(m.secondFile, 'utf8');
      writeFileSync(m.secondFile, m.secondApply(s2), 'utf8');
    }
    const res = runGuard();
    const caught = !res.ok && res.out.includes(m.expect) && (!m.expectAlso || res.out.includes(m.expectAlso));
    if (caught) {
      killed++;
      console.log(`[${m.id}] KILLED —— ${m.desc}`);
    } else {
      survived++;
      console.log(`[${m.id}] ⚠️ SURVIVED —— ${m.desc}`);
      console.log(`      期望包含「${m.expect}」${m.expectAlso ? ` + 「${m.expectAlso}」` : ''}；实际：${res.ok ? '守卫全绿' : '红了但不是这条断言'}`);
      console.log(res.out.slice(-900));
    }
  }
} finally {
  restore(INDEX);
  restore(GUARD);
  for (const f of allFiles()) restore(f);
  verifyRestored();
}

console.log(`\nKILLED ${killed}｜SURVIVED ${survived}｜INVALID ${invalid}`);
process.exitCode = survived > 0 || invalid > 0 ? 1 : 0;

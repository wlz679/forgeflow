#!/usr/bin/env node
// P166 —— 每周定价 bot 的 **PR 合并前验收**（可复算，入库）。
//
// 为什么要有它
// ------------
// PR #4 是**滚动 PR**：bot 每周 force-push `chore/pricing-sync` 并更新同一个 PR。
// ⇒ 「这个 PR 能不能合」是一个**每周都要回答一次**的问题，而答案必须能被复算。
//
// 而「CI 是绿的」**不足以**回答它：
//   · 历史上这个 PR 的 CI run 是 `action_required`（**0 个 job**）⇒ 绿灯是假的
//     （P164 修法：push 必须用 PAT，否则 PR 的 CI 永远不跑）；
//   · CI 只知道「测试过了」，**不知道** bot 有没有越过它的边界。
//
// ⭐⭐ 本工具守的是 bot 的**职责边界**（宪法级）：
//   · **策展侧（popularModelKeys）永远只由人改** ⇒ bot 的 diff 不得碰它；
//   · bot 只允许动**排除侧** + **数据集** + `_rule` 的声明值；
//   · 「策展 ∪ 排除 == 数据集全集」这个**完整划分**必须成立（否则新模型静默掉队）；
//   · bot 的输出必须**幂等**：再跑一次策展脚本，新增/剪除必须都是 0
//     （≠ 0 ⇒ 这份数据不是 bot 写的，是有人手改的 ⇒ 流程被绕过）。
//
// 用法（必须从仓库根目录跑）：
//   node tests/scripts/pricing-pr-acceptance.mjs [--ref github/chore/pricing-sync] [--base master]
//
// 退出码：0 = 全部通过；1 = 有问题（逐条打印）。

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const REF = opt('--ref', 'refs/remotes/github/chore/pricing-sync');
const BASE = opt('--base', 'master');

const PROVIDERS = ['anthropic', 'deepseek', 'google', 'openai'];
const DATASET = 'src/data/ai-pricing.json';
const POPULAR = 'src/data/ai-pricing-popular.json';

let passed = 0;
let failed = 0;
function check(label, problems) {
  if (problems.length === 0) {
    passed += 1;
    console.log('  ok   ' + label);
    return;
  }
  failed += 1;
  console.log('  FAIL ' + label);
  for (const p of problems) console.log('         - ' + p);
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
}
function show(rev, file) {
  return JSON.parse(git(['show', rev + ':' + file]));
}
function modelsOf(pricing) {
  const out = new Set();
  for (const p of PROVIDERS) {
    for (const k of Object.keys(pricing.llm?.[p]?.models ?? {})) out.add(p + '/' + k);
  }
  return out;
}
function keysOf(popular) {
  const out = new Set();
  for (const [prov, arr] of Object.entries(popular.excludedModelKeys ?? {})) {
    for (const k of arr) out.add(prov + '/' + k);
  }
  return out;
}
function curatedOf(popular) {
  const out = new Set();
  for (const arr of Object.values(popular.popularModelKeys ?? {})) for (const k of arr) out.add(k);
  return out;
}

console.log('定价 PR 合并前验收');
console.log('  ref  = ' + REF);
console.log('  base = ' + BASE);
console.log('');

let baseSha, headSha;
try {
  headSha = git(['rev-parse', REF]);
  baseSha = git(['merge-base', BASE, REF]);
} catch (e) {
  console.log('❌ 解析 ref/base 失败（先 git fetch ' + REF + '）：' + e.message);
  process.exit(1);
}
console.log('  PR head  = ' + headSha.slice(0, 7));
console.log('  基点      = ' + baseSha.slice(0, 7));
console.log('');

const files = git(['diff', '--name-only', baseSha, headSha]).split('\n').filter(Boolean);

const popBase = show(baseSha, POPULAR);
const popHead = show(headSha, POPULAR);
const dataBase = show(baseSha, DATASET);
const dataHead = show(headSha, DATASET);

const exBase = keysOf(popBase);
const exHead = keysOf(popHead);
const curBase = curatedOf(popBase);
const curHead = curatedOf(popHead);
const dsBase = modelsOf(dataBase);
const dsHead = modelsOf(dataHead);

// 1. 改动面：只允许 2 个数据文件
{
  const allowed = new Set([DATASET, POPULAR]);
  const bad = files.filter((f) => !allowed.has(f));
  check('① 改动面只含 2 个数据文件（不得碰引擎/页面/守卫）', bad.map((f) => '越界改动：' + f));
}

// 2. 策展侧逐字未动（宪法级：策展是人的决定）
{
  const p = [];
  for (const k of ['popularModelKeys', 'crossProviderModels', 'comparisonFlagshipKeys']) {
    if (JSON.stringify(popBase[k]) !== JSON.stringify(popHead[k])) p.push('策展侧被改了：' + k);
  }
  if (curBase.size !== curHead.size) p.push('策展条目数变了：' + curBase.size + ' → ' + curHead.size);
  check('② 策展侧（popularModelKeys / 跨供应商对比 / 旗舰）逐字未动', p);
}

// 3. 只允许往排除侧加，不许删
{
  const removed = [...exBase].filter((k) => !exHead.has(k));
  check('③ 排除侧只增不减（新增 ' + (exHead.size - exBase.size) + ' 个）', removed.map((k) => '被剪掉了：' + k));
}

// 4. 完整划分：数据集 == 策展 ∪ 排除
{
  const union = new Set([...curHead, ...[...exHead].map((k) => k.split('/').slice(1).join('/'))]);
  const missing = [...dsHead].filter((k) => !union.has(k.split('/').slice(1).join('/')));
  check('④ 完整划分：数据集每个模型都被策展或被排除（数据集 ' + dsHead.size + ' 个）', missing.map((k) => '没人做决定：' + k));
}

// 5. 声明值 == 实际值（bot 必须刷新 _rule 的三个数）
{
  const p = [];
  const r = popHead._rule ?? {};
  if (r.curatedModelCount !== curHead.size) p.push('curatedModelCount ' + r.curatedModelCount + ' ≠ 实际 ' + curHead.size);
  if (r.excludedModelCount !== exHead.size) p.push('excludedModelCount ' + r.excludedModelCount + ' ≠ 实际 ' + exHead.size);
  if (r.datasetModelCount !== dsHead.size) p.push('datasetModelCount ' + r.datasetModelCount + ' ≠ 实际 ' + dsHead.size);
  check('⑤ _rule 声明的三个数 == 实际（策展 ' + curHead.size + ' / 排除 ' + exHead.size + ' / 数据集 ' + dsHead.size + '）', p);
}

// 6. 新增的模型必须都进了排除侧（默认排除 = bot 的规矩）
{
  const added = [...dsHead].filter((k) => !dsBase.has(k));
  const addedShort = added.map((k) => k.split('/').slice(1).join('/'));
  const notExcluded = addedShort.filter((k) => !exHead.has('x/' + k) && ![...exHead].some((e) => e.endsWith('/' + k)));
  check('⑥ 本次新增的 ' + added.length + ' 个模型全部进排除侧（默认排除）', notExcluded.map((k) => '既没策展也没排除：' + k));
}

// 7. 合并可行性：base 侧那两个文件没被后来的提交动过 ⇒ 不会冲突
{
  const p = [];
  let mt = '';
  try {
    mt = git(['merge-tree', '--write-tree', BASE, REF]);
  } catch (e) {
    p.push('merge-tree 报冲突：' + String(e.stdout ?? e.message).slice(0, 300));
  }
  check('⑦ 能干净合进 ' + BASE + '（merge-tree 无冲突）', p);
}

// 8. 幂等：再跑一次 bot 的策展步骤，新增/剪除必须都是 0
{
  const p = [];
  let out = '';
  try {
    out = execFileSync('node', ['scripts/curate-pricing-models.mjs', '--dry-run'], {
      cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env },
    });
  } catch (e) {
    out = String(e.stdout ?? '') + String(e.stderr ?? '');
    p.push('策展脚本执行失败：' + out.slice(0, 300));
  }
  for (const k of ['addedCount', 'prunedCount', 'famAddedCount', 'famPrunedCount', 'failuresCount']) {
    const m = new RegExp('^' + k + '=(\\d+)$', 'm').exec(out);
    if (!m) { p.push('策展脚本输出里没有 ' + k + '（输出变了？）'); continue; }
    if (m[1] !== '0') p.push(k + ' = ' + m[1] + '（≠ 0 ⇒ 这份数据不是 bot 幂等产出的）');
  }
  check('⑧ bot 幂等：对当前工作区再跑一次策展，新增/剪除/族增删全是 0', p);
}

console.log('');
console.log('断言通过 ' + passed + '｜失败 ' + failed);
process.exitCode = failed === 0 ? 0 : 1;

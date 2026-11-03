#!/usr/bin/env node
// P166 —— 定价 bot 的**自测**（8 条断言）。
//
// 为什么要有它
// ------------
// 「守卫全绿」≠「守卫真的在测」。bot 有六种行为（新模型默认排除 / 族覆盖 /
// 新建精确族 / 剪陈旧排除 / 剪死族 / 策展模型消失时拒绝写），每一种都可能被
// 改坏而**没有任何东西变红** —— 因为这些行为全都发生在「数据写入」这一步，
// 而现有的守卫只读写入之后的文件。
//
// 所以这里用**合成 fixture**（tmp/ 下的临时文件）把 bot 当黑盒跑一遍，逐条断言
// 它的可观察行为。第 7 条最关键：bot 的 glob 匹配器是**手写的、不用正则**的
// 副本，而真值实现（`src/data/ai-pricing-popular.ts` 的 `matchesExcludedFamily`）
// 用正则 —— 两者必须在**真实的 42 个族 × 245 个 key** 上**逐例**同结果。
// 只测几个样例是不够的（样例恰好相等，不代表语义相等）。
//
// 跑法（必须从仓库根目录跑）：
//   node tests/scripts/p166-pricing-bot-selftest.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BOT = path.join(ROOT, 'scripts', 'curate-pricing-models.mjs');

let passed = 0;
let failed = 0;

/** 一条断言只守一件事；失败时把**全部**问题一次报出来。 */
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

/** 跑一次 bot（不真写仓库里的文件），返回 { code, stdout, popular }。 */
function runBot(dir, dataset, popular) {
  const datasetPath = path.join(dir, 'dataset.json');
  const popularPath = path.join(dir, 'popular.json');
  const reportPath = path.join(dir, 'report.md');
  fs.writeFileSync(datasetPath, JSON.stringify(dataset, null, 2) + '\n', 'utf8');
  fs.writeFileSync(popularPath, JSON.stringify(popular, null, 2) + '\n', 'utf8');
  const before = fs.readFileSync(popularPath);
  let code = 0;
  let stdout = '';
  try {
    stdout = execFileSync('node', [BOT, '--dataset', datasetPath, '--popular', popularPath, '--report', reportPath], {
      encoding: 'utf8',
      cwd: ROOT,
    });
  } catch (e) {
    code = e.status ?? 1;
    stdout = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
  const after = fs.readFileSync(popularPath);
  return {
    code,
    stdout,
    report: fs.existsSync(reportPath) ? fs.readFileSync(reportPath, 'utf8') : '',
    popular: JSON.parse(after.toString('utf8')),
    popularBytes: after,
    popularBefore: before,
  };
}

/** 从报告的 machine-readable 段里取某个字段。 */
function reportField(report, key) {
  const m = report.match(new RegExp('^' + key + '=(.*)$', 'm'));
  return m ? m[1].trim() : null;
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'p166-bot-selftest-'));

// ---------------------------------------------------------------------------
// fixture：最小可用的数据集 + popular.json
// ---------------------------------------------------------------------------
function baseDataset(models) {
  return {
    version: '1.0',
    lastUpdated: '2026-11-03',
    source: 'selftest',
    llm: {
      acme: { models: Object.fromEntries(models.map((m) => [m, {}])) },
    },
  };
}

function basePopular(overrides = {}) {
  return {
    _rule: {
      rule: 'x'.repeat(60),
      updatedAt: '2026-01-01',
      rationale: 'y'.repeat(60),
      curatedModelCount: 1,
      excludedModelCount: 1,
    },
    popularModelKeys: { acme: ['keep-me'] },
    comparisonFlagshipKeys: {},
    crossProviderModels: {},
    excludedModelKeys: { acme: ['drop-me'] },
    excludedFamilies: [
      { provider: 'acme', pattern: 'drop-*', reason: 'selftest 用的族（命中 drop-me / drop-new）' },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 断言 1：新模型默认进排除侧（且策展侧一个字节都不动）
// ---------------------------------------------------------------------------
console.log('断言 1：新模型默认进排除侧');
{
  const r = runBot(tmpRoot, baseDataset(['keep-me', 'drop-me', 'brand-new']), basePopular());
  const problems = [];
  if (r.code !== 0) problems.push('退出码应为 0，实际 ' + r.code);
  const excluded = r.popular.excludedModelKeys?.acme ?? [];
  if (!excluded.includes('brand-new')) {
    problems.push('新模型 brand-new 没有进 excludedModelKeys —— bot 的核心规则是「新模型默认排除」');
  }
  if (excluded.includes('keep-me')) {
    problems.push('keep-me 是策展模型，却出现在排除侧 —— bot 碰了策展侧');
  }
  const curated = r.popular.popularModelKeys?.acme ?? [];
  if (JSON.stringify(curated) !== JSON.stringify(['keep-me'])) {
    problems.push('策展侧被改了：期望 ["keep-me"]，实际 ' + JSON.stringify(curated));
  }
  check('新模型默认进排除侧，且策展侧不动', problems);
}

// ---------------------------------------------------------------------------
// 断言 2：能被已有族命中的新模型不新建族
// ---------------------------------------------------------------------------
console.log('断言 2：能被已有族命中的新模型不新建族');
{
  const r = runBot(tmpRoot, baseDataset(['keep-me', 'drop-me', 'drop-new']), basePopular());
  const problems = [];
  const excluded = r.popular.excludedModelKeys?.acme ?? [];
  if (!excluded.includes('drop-new')) {
    problems.push('drop-new 没有进排除侧');
  }
  const families = r.popular.excludedFamilies ?? [];
  const extra = families.filter((f) => f.pattern !== 'drop-*');
  if (extra.length) {
    problems.push(
      'drop-new 已被已有族 drop-* 命中，却新建了族：' +
        JSON.stringify(extra.map((f) => f.pattern)),
    );
  }
  if (families.length !== 1) {
    problems.push('族数量应为 1，实际 ' + families.length);
  }
  check('能被已有族命中的新模型不新建族', problems);
}

// ---------------------------------------------------------------------------
// 断言 3：谁也命不中的新模型新建一个精确匹配族
// ---------------------------------------------------------------------------
console.log('断言 3：谁也命不中的新模型新建一个精确匹配族');
{
  const r = runBot(tmpRoot, baseDataset(['keep-me', 'drop-me', 'solo-new']), basePopular());
  const problems = [];
  const families = r.popular.excludedFamilies ?? [];
  const created = families.find((f) => f.pattern === 'solo-new');
  if (!created) {
    problems.push('solo-new 没有被任何已有族命中，却没有被新建一个精确匹配的族');
  } else {
    if (created.provider !== 'acme') problems.push('新族 provider 应为 acme，实际 ' + created.provider);
    if (created.pattern !== 'solo-new') problems.push('新族 pattern 应为精确的 solo-new，实际 ' + created.pattern);
    if (typeof created.reason !== 'string' || created.reason.length < 10) {
      problems.push('新族必须带一段说明为什么被排除的 reason');
    }
  }
  check('谁也命不中的新模型新建一个精确匹配族', problems);
}

// ---------------------------------------------------------------------------
// 断言 4：数据集里没了的排除记录被剪掉
// ---------------------------------------------------------------------------
console.log('断言 4：数据集里没了的排除记录被剪掉');
{
  const r = runBot(tmpRoot, baseDataset(['keep-me']), basePopular());
  const problems = [];
  const excluded = r.popular.excludedModelKeys?.acme ?? [];
  if (excluded.includes('drop-me')) {
    problems.push('drop-me 已经不在数据集里了，却还留在排除侧 —— 陈旧排除记录该被剪掉');
  }
  if (reportField(r.report, 'prunedCount') !== '1') {
    problems.push('报告里的 prunedCount 应为 1，实际 ' + reportField(r.report, 'prunedCount'));
  }
  check('数据集里没了的排除记录被剪掉', problems);
}

// ---------------------------------------------------------------------------
// 断言 5：命不中任何排除记录的族被剪掉（死族）
// ---------------------------------------------------------------------------
console.log('断言 5：命不中任何排除记录的族被剪掉');
{
  const popular = basePopular();
  popular.excludedFamilies = [
    { provider: 'acme', pattern: 'drop-*', reason: '活着的族（命中 drop-me）' },
    { provider: 'acme', pattern: 'never-matches-*', reason: '命中不了任何记录的族' },
  ];
  const r = runBot(tmpRoot, baseDataset(['keep-me', 'drop-me']), popular);
  const problems = [];
  const families = r.popular.excludedFamilies ?? [];
  if (families.some((f) => f.pattern === 'never-matches-*')) {
    problems.push('never-matches-* 一个排除记录都命中不了，却还留在族列表里 —— 死族该被剪掉');
  }
  if (!families.some((f) => f.pattern === 'drop-*')) {
    problems.push('drop-* 命中了 drop-me，却不该被剪掉');
  }
  check('命不中任何排除记录的族被剪掉', problems);
}

// ---------------------------------------------------------------------------
// 断言 6：策展模型消失 ⇒ 退出码 1 且 popular.json 一个字节没变
// ---------------------------------------------------------------------------
console.log('断言 6：策展模型消失 ⇒ 退出码 1 且 popular.json 一个字节没变');
{
  const r = runBot(tmpRoot, baseDataset(['drop-me']), basePopular());
  const problems = [];
  if (r.code !== 1) {
    problems.push('策展模型 keep-me 从数据集消失时退出码应为 1，实际 ' + r.code);
  }
  if (!r.popularBytes.equals(r.popularBefore)) {
    problems.push('bot 在拒绝写的时候仍然改了 popular.json —— 必须一个字节都不动');
  }
  check('策展模型消失 ⇒ 退出码 1 且 popular.json 一个字节没变', problems);
}

// ---------------------------------------------------------------------------
// 断言 7：bot 的 glob 匹配器 == 真值实现（真实 42 族 × 245 key，逐例）
// ---------------------------------------------------------------------------
console.log('断言 7：glob 匹配器与真值实现逐例等价（真实 42 族 × 245 key）');
{
  // bot 自己的匹配器（手写、无正则的副本）。
  const { matchesExcludedFamily: botMatch } = await import(
    new URL('../../scripts/curate-pricing-models.mjs', import.meta.url).href,
  );
  // 真值实现：`src/data/ai-pricing-popular.ts` 里的那个（用正则）。
  // 用 tsx 在子进程里跑 —— 本文件是纯 node，不能直接 import TS。
  const truthOut = execFileSync(
    'node',
    [
      path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
      '--eval',
      `import { matchesExcludedFamily } from './src/data/ai-pricing-popular.ts';
import fs from 'node:fs';
const pop = JSON.parse(fs.readFileSync('./src/data/ai-pricing-popular.json', 'utf8'));
const ds = JSON.parse(fs.readFileSync('./src/data/ai-pricing.json', 'utf8'));
const keys = [];
for (const [p, g] of Object.entries(ds.llm || {})) {
  for (const k of Object.keys(g.models || {})) keys.push({ provider: p, key: k });
}
const out = [];
for (const f of pop.excludedFamilies) {
  for (const k of keys) out.push(f.provider + '|' + f.pattern + '|' + k.key + '|' + (matchesExcludedFamily(f.pattern, k.key) ? 1 : 0));
}
process.stdout.write(JSON.stringify({ families: pop.excludedFamilies.length, keys: keys.length, out }));`,
    ],
    { encoding: 'utf8', cwd: ROOT },
  );
  const truth = JSON.parse(truthOut);

  const problems = [];
  const pop = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'src', 'data', 'ai-pricing-popular.json'), 'utf8'),
  );
  const ds = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'src', 'data', 'ai-pricing.json'), 'utf8'),
  );
  const keys = [];
  for (const [p, g] of Object.entries(ds.llm || {})) {
    for (const k of Object.keys(g.models || {})) keys.push({ provider: p, key: k });
  }

  if (truth.families !== pop.excludedFamilies.length) {
    problems.push('真值侧读到的族数量与本地不一致');
  }
  if (truth.keys !== keys.length) {
    problems.push('真值侧读到的 key 数量与本地不一致');
  }

  // 逐例比对：真值侧已经算好了每一对 (族, key) 的结果，这里重算一遍 bot 的。
  const truthMap = new Map(truth.out.map((row) => [row.slice(0, row.lastIndexOf('|')), row.slice(row.lastIndexOf('|') + 1)]));
  let compared = 0;
  const mismatches = [];
  for (const f of pop.excludedFamilies) {
    for (const k of keys) {
      // 匹配器吃的是**裸 key**（不含 provider 前缀）—— 与真值实现的使用方式一致。
      const actual = botMatch(f.pattern, k.key) ? 1 : 0;
      const expected = truthMap.get(f.provider + '|' + f.pattern + '|' + k.key);
      compared += 1;
      if (expected === undefined) {
        mismatches.push(f.provider + '|' + f.pattern + ' vs ' + k.key + '（真值侧没有这一对）');
      } else if (String(actual) !== expected) {
        mismatches.push(
          f.provider + '|' + f.pattern + ' vs ' + k.key + '：bot=' + actual + ' 真值=' + expected,
        );
      }
    }
  }
  if (mismatches.length) {
    problems.push(
      `有 ${mismatches.length} 对不一致（共比对 ${compared} 对）：\n` + mismatches.slice(0, 20).join('\n'),
    );
  }
  if (compared !== pop.excludedFamilies.length * keys.length) {
    problems.push(
      `比对的对数不对：期望 ${pop.excludedFamilies.length * keys.length}，实际 ${compared}`,
    );
  }
  check(
    `glob 匹配器逐例等价（${pop.excludedFamilies.length} 族 × ${keys.length} key = ${compared} 对）`,
    problems,
  );
}

// ---------------------------------------------------------------------------
// 断言 8：_rule.updatedAt 只在「决定集真的变了」时才动
// ---------------------------------------------------------------------------
//
// 为什么这条重要（不是洁癖）：如果 updatedAt 每次运行都变，popular.json 每次
// 都会被写 ⇒ workflow 的「Check for changes」永远 changed=true ⇒ **每周都开一个
// 内容为空的 PR**。⇒ 「没变就不写」是这条链的前提。
//
// 语义：_rule.updatedAt = 「这份进/不进交互态的决定是什么时候做的」，
// **不是**「价格数据什么时候同步的」（dataset.lastUpdated —— 两者不是同一件事：
// 价格天天在变，而「进不进交互态」只在真的做了新决定时才变）。
console.log('断言 8：_rule.updatedAt 只在决定集真的变了时才动');
{
  const problems = [];

  // 情况 A：决定集**没变**（没有新模型、没有陈旧记录、没有死族）
  //         ⇒ updatedAt 必须与跑之前**逐字节相同**。
  const unchanged = runBot(tmpRoot, baseDataset(['keep-me', 'drop-me']), basePopular());
  const beforeUnchanged = unchanged.popular._rule?.updatedAt;
  if (beforeUnchanged !== '2026-01-01') {
    problems.push(
      'fixture 的 _rule.updatedAt 应为 2026-01-01，实际 ' + String(beforeUnchanged),
    );
  }
  if (unchanged.popular._rule?.updatedAt !== unchanged.popularBefore.toString('utf8')
    .match(/"updatedAt":\s*"([^"]+)"/)?.[1]) {
    problems.push(
      '决定集没变时 _rule.updatedAt 变了：' +
        String(unchanged.popularBefore.toString('utf8').match(/"updatedAt":\s*"([^"]+)"/)?.[1]) +
        ' → ' +
        String(unchanged.popular._rule?.updatedAt) +
        ' —— 每次运行都改这个字段 ⇒ bot 每次都写文件 ⇒ 每周开一个空 PR',
    );
  }

  // 情况 B：决定集**真的变了**（多一个新模型）⇒ updatedAt 必须等于本次运行日期。
  const changed = runBot(tmpRoot, baseDataset(['keep-me', 'drop-me', 'brand-new']), basePopular());
  const runDate = new Date().toISOString().slice(0, 10);
  if (changed.popular._rule?.updatedAt !== runDate) {
    problems.push(
      '决定集变了时 _rule.updatedAt 必须等于本次运行日期 ' + runDate +
        '，实际 ' + String(changed.popular._rule?.updatedAt),
    );
  }

  check('_rule.updatedAt 只在决定集真的变了时才动', problems);
}

// ---------------------------------------------------------------------------

console.log('');
console.log(`断言通过 ${passed}｜失败 ${failed}`);
if (failed > 0) process.exit(1);

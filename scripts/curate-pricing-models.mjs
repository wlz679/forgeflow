#!/usr/bin/env node
// P166 —— 定价 bot 的「进不进交互态」闭环。
//
// 问题（实测 2026-11-03）：每周 bot 把新模型同步进 src/data/ai-pricing.json，
// 但 ai-pricing-popular.json 只有清单、没有「谁来决定」⇒ 新模型静默地只进数据集、
// 不进交互态 ⇒ 用户在计算器里选不到它，而唯一会红的东西是 popular-models-rule-guard
// （写死了 245/44/201/42）⇒ 每周 PR 必然红。
//
// P166 的决定（用户拍板）：**新模型默认排除**。bot 只改 popular.json 的排除侧，
// 永不碰策展侧（策展是人的决定，且引擎静态文案把 18/13/8/5 写死了）。
//
// 六种行为：
//   1. 新模型（数据集有、策展与排除都没有）→ 进 excludedModelKeys
//   2. 新模型能被已有排除族命中 → 挂上去，不新建族
//   3. 新模型谁也命中不了 → 新建一个精确匹配（pattern = key）的族
//   4. 排除清单里有、数据集里没了 → 剪掉（陈旧排除记录）
//   5. 排除族一个排除记录都命中不了 → 剪掉（死族）
//   6. 策展模型从数据集消失 → 拒绝写文件并退出 1（bot 不替人做策展决定）
//
// ⚠️ 写文件的方式与计划有一处**故意的偏差**（理由见 serializePreserving 的注释）：
//    本文件的 crossProviderModels 段是手工紧凑排版，整份 JSON.stringify 重写会把
//    那段重排 30 行 ⇒ 每周 PR 里多出一段与「策展」无关的噪音 diff ⇒ 改成外科式写入。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 换行符一律走这里：写文件时用 '\n' 字面量容易被工具链吞成真换行。
const NL = String.fromCharCode(10);

const ROOT = path.resolve(import.meta.dirname, '..');
const DATASET_DEFAULT = path.join(ROOT, 'src', 'data', 'ai-pricing.json');
const POPULAR_DEFAULT = path.join(ROOT, 'src', 'data', 'ai-pricing-popular.json');
const REPORT_DEFAULT = path.join(ROOT, 'tmp', 'p166-curation-report.md');

/**
 * 族规则匹配：* 匹配任意子串（含空串），其余字符按字面量。
 *
 * 语义与 src/data/ai-pricing-popular.ts 的 matchesExcludedFamily 一致，
 * 但**不使用正则**（零依赖 + 不用处理字符类转义）。
 * 等价性由 tests/scripts/p166-pricing-bot-selftest.mjs 在真实数据上断言。
 */
export function matchesExcludedFamily(pattern, key) {
  if (!pattern.includes('*')) return pattern === key;
  const parts = pattern.split('*');
  if (!key.startsWith(parts[0])) return false;
  if (!key.endsWith(parts[parts.length - 1])) return false;
  let pos = parts[0].length;
  for (const part of parts.slice(1, -1)) {
    const idx = key.indexOf(part, pos);
    if (idx < 0) return false;
    pos = idx + part.length;
  }
  return true;
}

/**
 * 主流程（6 种行为）。
 *
 * popular 是**就地修改**的；调用方负责写盘。
 */
export function curate(dataset, popular) {
  const dsKeys = {};
  for (const [provider, group] of Object.entries(dataset.llm ?? {})) {
    dsKeys[provider] = Object.keys(group?.models ?? {});
  }
  const curated = popular.popularModelKeys ?? {};
  const excluded = popular.excludedModelKeys ?? {};
  const families = popular.excludedFamilies ?? [];

  const added = [];        // 'provider/key' 新进排除
  const pruned = [];       // 'provider/key' 从排除剪掉
  const famAdded = [];     // 'provider/pattern'
  const famPruned = [];    // 'provider/pattern'
  const failures = [];     // 拒绝写的原因

  // 行为 1/2/3 —— 新模型默认排除 + 族覆盖
  for (const [provider, keys] of Object.entries(dsKeys)) {
    const curatedSet = new Set(curated[provider] ?? []);
    const excludedSet = new Set(excluded[provider] ?? []);
    const fresh = keys.filter((k) => !curatedSet.has(k) && !excludedSet.has(k));
    if (fresh.length === 0) continue;
    excluded[provider] = [...(excluded[provider] ?? []), ...fresh];
    for (const key of fresh) {
      const covered = families.some(
        (f) => f.provider === provider && matchesExcludedFamily(f.pattern, key),
      );
      if (!covered) {
        const pattern = key;                       // 精确匹配，零猜测
        families.push({
          provider,
          pattern,
          reason:
            'P166 自动排除：' + provider + '/' + key + ' 随 LiteLLM 同步落地数据集，' +
            '尚未人工策展，默认不进交互态（人工策展后请并入对应产品线族）',
        });
        famAdded.push(provider + '/' + pattern);
      }
      added.push(provider + '/' + key);
    }
  }

  // 行为 4 —— 剪掉数据集里已消失的排除记录
  for (const [provider, keys] of Object.entries(excluded)) {
    const avail = new Set(dsKeys[provider] ?? []);
    excluded[provider] = keys.filter((k) => {
      if (avail.has(k)) return true;
      pruned.push(provider + '/' + k);
      return false;
    });
  }

  // 行为 5 —— 剪掉死族（族不再命中任何排除记录）
  popular.excludedFamilies = families.filter((f) => {
    const hit = (excluded[f.provider] ?? []).some((k) => matchesExcludedFamily(f.pattern, k));
    if (!hit) { famPruned.push(f.provider + '/' + f.pattern); return false; }
    return true;
  });

  // 行为 6 —— 策展模型消失 = 需要人做决定 ⇒ 拒绝写
  for (const [provider, keys] of Object.entries(curated)) {
    const avail = new Set(dsKeys[provider] ?? []);
    const gone = keys.filter((k) => !avail.has(k)).map((k) => provider + '/' + k);
    if (gone.length) failures.push('策展模型从数据集消失：' + gone.join(', '));
  }

  const curatedTotal = Object.values(curated).reduce((n, a) => n + a.length, 0);
  const excludedTotal = Object.values(excluded).reduce((n, a) => n + a.length, 0);
  const datasetTotal = Object.values(dsKeys).reduce((n, a) => n + a.length, 0);

  popular.popularModelKeys = curated;
  popular.excludedModelKeys = excluded;

  // _rule.updatedAt 的语义是「**这份进/不进交互态的决定**是什么时候做的」，
  // **不是**「价格数据什么时候同步的」（那是 dataset.lastUpdated —— 两者不是同一件事：
  // 价格天天在变，而「进不进交互态」只在真的做了新决定时才变）。
  //
  // ⇒ 只有决定集真的变了才刷新它；没变就保持原值。
  //
  // 为什么这条不是洁癖（实测 2026-11-03）：如果 updatedAt 每次运行都变，
  // 那么 popular.json 每次都会被写 ⇒ workflow 的「Check for changes」永远
  // changed=true ⇒ **每周都开一个内容为空的 PR**。⇒「没变就不写」是这条链的前提。
  const decisionChanged =
    added.length > 0 || pruned.length > 0 || famAdded.length > 0 || famPruned.length > 0;
  const runDate = new Date().toISOString().slice(0, 10);
  const previousUpdatedAt = popular._rule?.updatedAt;
  const updatedAt =
    decisionChanged || typeof previousUpdatedAt !== 'string' || previousUpdatedAt.length === 0
      ? runDate
      : previousUpdatedAt;

  popular._rule = {
    ...popular._rule,
    updatedAt,
    curatedModelCount: curatedTotal,
    excludedModelCount: excludedTotal,
    datasetModelCount: datasetTotal,
    autoCuration:
      'P166 起每周 bot 自动做「进不进交互态」的决定：新模型默认进排除侧，' +
      '并保证每个排除记录都被一个排除族命中。策展侧（popularModelKeys）永远只由人改。',
  };

  return { added, pruned, famAdded, famPruned, failures, curatedTotal, excludedTotal, datasetTotal };
}

// ---------------------------------------------------------------------------
// 外科式 JSON 写入：只重新序列化**真的变了**的顶层成员。
// ---------------------------------------------------------------------------

/** 扫到字符串字面量的结尾（返回闭引号之后的下标）。 */
function scanStringEnd(text, start) {
  let i = start + 1;
  const n = text.length;
  while (i < n) {
    if (text[i] === '\\') { i += 2; continue; }
    if (text[i] === '"') return i + 1;
    i += 1;
  }
  throw new Error('JSON 字符串未闭合');
}

/** 扫到一个 JSON 值的结尾（返回该值之后的下标）。 */
function scanValueEnd(text, start) {
  const n = text.length;
  const c = text[start];
  if (c === '"') return scanStringEnd(text, start);
  if (c === '{' || c === '[') {
    let depth = 0;
    let i = start;
    while (i < n) {
      const ch = text[i];
      if (ch === '"') { i = scanStringEnd(text, i); continue; }
      if (ch === '{' || ch === '[') { depth += 1; i += 1; continue; }
      if (ch === '}' || ch === ']') {
        depth -= 1;
        i += 1;
        if (depth === 0) return i;
        continue;
      }
      i += 1;
    }
    throw new Error('JSON 值未闭合');
  }
  let i = start;
  while (i < n && text[i] !== ',' && text[i] !== '}' && text[i] !== NL) i += 1;
  return i;
}

/** 扫描一个 JSON 对象的顶层成员 → { members: [{key, vStart, vEnd}], closeIdx }。 */
function scanTopLevelMembers(text) {
  const members = [];
  const n = text.length;
  let i = text.indexOf('{');
  if (i < 0) throw new Error('popular.json 不是 JSON 对象');
  const openIdx = i;
  i += 1;
  while (i < n) {
    while (i < n && (' ' + NL + '\t\r,').includes(text[i])) i += 1;
    if (i >= n || text[i] === '}') break;
    if (text[i] !== '"') throw new Error('顶层成员名不是字符串（offset ' + i + '）');
    const keyStart = i;
    i = scanStringEnd(text, i);
    const key = JSON.parse(text.slice(keyStart, i));
    while (i < n && text[i] !== ':') i += 1;
    i += 1;
    while (i < n && text[i] === ' ') i += 1;
    const vStart = i;
    const vEnd = scanValueEnd(text, vStart);
    members.push({ key, vStart, vEnd });
    i = vEnd;
  }
  let closeIdx = i;
  while (closeIdx < n && text[closeIdx] !== '}') closeIdx += 1;
  return { members, openIdx, closeIdx };
}

/** 给多行 JSON 的第 2 行起补 pad 个空格（顶层成员的续行缩进）。 */
function indentRest(s, pad) {
  const padStr = ' '.repeat(pad);
  return s.split(NL).map((l, i) => (i === 0 ? l : padStr + l)).join(NL);
}

/**
 * 外科式序列化：逐个顶层成员比对，**只有真的变了的成员**才重新序列化；
 * 没变的成员原样保留字节。
 *
 * 为什么不用 JSON.stringify(popular, null, 2) 整份重写：
 *   ai-pricing-popular.json 的 crossProviderModels 段是**手工紧凑排版**
 *   （一行一个 { ... } 对象）。整份重写会把那 30 行重排 ⇒ 每周的 PR 里出现一段
 *   与「策展」毫无关系的噪音 diff，而验收要求「git diff 只出现 _rule 的变化」。
 */
export function serializePreserving(originalText, newObj) {
  const { members, closeIdx } = scanTopLevelMembers(originalText);
  const parts = [];
  let prev = 0;
  const handled = new Set();
  for (const m of members) {
    parts.push(originalText.slice(prev, m.vStart));
    handled.add(m.key);
    const newVal = newObj[m.key];
    if (newVal === undefined) {
      // 顶层成员被删 —— bot 不会这么做；保留原样，绝不静默丢数据。
      parts.push(originalText.slice(m.vStart, m.vEnd));
    } else {
      const oldVal = JSON.parse(originalText.slice(m.vStart, m.vEnd));
      const same = JSON.stringify(oldVal) === JSON.stringify(newVal);
      parts.push(
        same
          ? originalText.slice(m.vStart, m.vEnd)
          : indentRest(JSON.stringify(newVal, null, 2), 2),
      );
    }
    prev = m.vEnd;
  }
  parts.push(originalText.slice(prev));
  let text = parts.join('');

  // 新增顶层成员（本 bot 不会发生）—— 兜底追加，保持 JSON 合法。
  const extra = Object.keys(newObj).filter((k) => !handled.has(k));
  if (extra.length) {
    const last = members.length ? members[members.length - 1].vEnd : closeIdx;
    const head = text.slice(0, last);
    const tail = text.slice(last);
    const add = extra
      .map((k) => ',' + NL + '  ' + JSON.stringify(k) + ': ' + indentRest(JSON.stringify(newObj[k], null, 2), 2))
      .join('');
    text = head + add + tail;
  }
  return text;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function buildReport(r) {
  const lines = [];
  lines.push('### 定价策展（popular-models 闭环）');
  lines.push('');
  lines.push('- 数据集模型总数：**' + r.datasetTotal + '**');
  lines.push('- 策展（进交互态）：**' + r.curatedTotal + '**（bot 不动）');
  lines.push('- 排除（不进交互态）：**' + r.excludedTotal + '**');
  lines.push('- 新增排除：**' + r.added.length + '**');
  lines.push('- 剪掉陈旧排除记录：**' + r.pruned.length + '**');
  lines.push('- 新建排除族：**' + r.famAdded.length + '**');
  lines.push('- 剪掉死族：**' + r.famPruned.length + '**');
  if (r.added.length) { lines.push(''); lines.push('**新增排除模型**'); r.added.forEach((x) => lines.push('- ' + x)); }
  if (r.famAdded.length) { lines.push(''); lines.push('**新建排除族**'); r.famAdded.forEach((x) => lines.push('- ' + x)); }
  if (r.pruned.length) { lines.push(''); lines.push('**剪掉陈旧排除记录**'); r.pruned.forEach((x) => lines.push('- ' + x)); }
  if (r.famPruned.length) { lines.push(''); lines.push('**剪掉死族**'); r.famPruned.forEach((x) => lines.push('- ' + x)); }
  if (r.failures.length) {
    lines.push(''); lines.push('**拒绝自动处理（需要人工决定）**');
    r.failures.forEach((x) => lines.push('- ' + x));
    lines.push('');
    lines.push('bot 不会替人改策展侧（popularModelKeys）。请人工调整后重跑。');
  }
  lines.push('');
  lines.push('<!-- machine-readable -->');
  lines.push('curatedTotal=' + r.curatedTotal);
  lines.push('excludedTotal=' + r.excludedTotal);
  lines.push('datasetTotal=' + r.datasetTotal);
  lines.push('addedCount=' + r.added.length);
  lines.push('added=' + (r.added.length ? r.added.join(',') : '0'));
  lines.push('prunedCount=' + r.pruned.length);
  lines.push('pruned=' + (r.pruned.length ? r.pruned.join(',') : '0'));
  lines.push('famAddedCount=' + r.famAdded.length);
  lines.push('famAdded=' + (r.famAdded.length ? r.famAdded.join(',') : '0'));
  lines.push('famPrunedCount=' + r.famPruned.length);
  lines.push('famPruned=' + (r.famPruned.length ? r.famPruned.join(',') : '0'));
  lines.push('failuresCount=' + r.failures.length);
  lines.push('failures=' + (r.failures.length ? r.failures.join(' | ') : '0'));
  return lines.join(NL) + NL;
}

export function main(argv = process.argv.slice(2)) {
  const dryRun = argv.includes('--dry-run');
  const opt = (name, dflt) => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
  };
  const datasetPath = opt('--dataset', DATASET_DEFAULT);
  const popularPath = opt('--popular', POPULAR_DEFAULT);
  const reportPath = opt('--report', REPORT_DEFAULT);

  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  const originalText = fs.readFileSync(popularPath, 'utf8');
  const popular = JSON.parse(originalText);
  const r = curate(dataset, popular);
  const after = serializePreserving(originalText, popular);

  const report = buildReport(r);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report, 'utf8');
  process.stdout.write(report);

  if (r.failures.length) { process.exit(1); }
  if (dryRun) { console.log('（dry-run：未写文件）'); return; }
  if (after === originalText) { console.log('（popular.json 无变化）'); return; }
  fs.writeFileSync(popularPath, after, 'utf8');
  console.log('已写入 ' + popularPath);
}

// 只有被直接当脚本跑时才执行 CLI —— 被 import（自测脚本要 import 匹配器）时不跑。
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) main();

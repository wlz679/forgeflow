#!/usr/bin/env node
// P168 —— 决策支持（批次 3 B3-0）的**源码级守卫**（source-only）。
//
// 这个守卫守什么
// --------------
// 批次 3 的形态是「静态层（SSR，SEO 可见）+ 动态层（客户端，随输入变化）」。
// 本守卫钉住的是**这条链路上每一个会悄悄退化的环节**：
//
//   ① 共享实现（src/lib/decision-support.ts）存在且导出齐全
//   ② ⭐ **提取器的自检** —— 给一个「没有决策建议」的输出，它必须返回空；
//      「检查违规」的断言在没有违规时本来就绿 ⇒ 检测器的能力本身必须被断言
//   ③ 提取器会剥掉 markdown 粗体（引擎输出是纯文本渲染，符号会原样显示）
//   ④ 「已激活工具」的判定口径 == 页面渲染条件（不许两套清单）
//   ⑤ 每个激活工具：en/zh 三个静态键都在、不是占位模板、有长度下限
//   ⑥ 每个激活工具的引擎输出**确实**带决策建议（否则区块是空壳）
//   ⑦ ⭐ **英文页不得出现中文决策段** —— 实测发现 19 个引擎的 🧭 决策段
//      整段是中文（还带 markdown 星号），直接渲染在英文页上
//   ⑧ 引擎的 playbook 6 字段对激活工具不得是占位模板
//   ⑨ ⭐ **customFn 与 generate 的建议必须一致**（两套实现不许漂）：
//      customFn 是浏览器真正执行的那份，generate 是 TS 实现 —— 同一组输入下
//      两者漂了，用户看到的建议就会与静态示例对不上。
//      ⚠️ 判据用的是 **generate**，不是 staticExamples[0]：后者是 codegen 用
//      另一组示例输入生成的缓存，它的 Tip 自然落在别的分支（burn-rate 实测）。
//   ⑩ ⭐ **决策建议必须随输入变化**（动态层不能是常量建议）
//
// P153-G1: source-only guard —— 不需要 pnpm build。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  DECISION_KEYS,
  LANGS,
  MIN_CONSTRAINT_UNITS,
  MIN_GOAL_UNITS,
  MIN_NEXT_TOOL_UNITS,
  MIN_RECOMMENDATION_UNITS,
  MIN_ZH_TO_EN_RATIO,
  infoUnits,
  PLACEHOLDER_MARKER,
  activatedSlugs,
  loadEngines,
  probeInputs,
  readLocale,
  rendersDecisionBlock,
  tipFromCustomOutput,
} from './_decision-support-fixture.ts';
import {
  DECISION_MARKERS,
  extractDecisionLines,
  hasDecisionLines,
} from '../src/lib/decision-support.ts';

const locales = { en: readLocale('en'), zh: readLocale('zh') } as const;

test('P168 共享实现：decision-support 模块存在且导出齐全', () => {
  const src = readFileSync(resolve(process.cwd(), 'src/lib/decision-support.ts'), 'utf8');
  for (const fn of ['extractDecisionLines', 'hasDecisionLines']) {
    assert.match(src, new RegExp('export function ' + fn + '\\b'), '缺少导出：' + fn);
  }
  assert.ok(DECISION_MARKERS.tip, '缺少标记常量');
  // 标记必须与引擎输出里的字面量一致（💡 = U+1F4A1）
  assert.equal(DECISION_MARKERS.tip, '\u{1F4A1} Tip:');
});

test('P168 提取器自检：没有决策建议的输出必须返回空（不是随便抓一行）', () => {
  const noTip = '💸 Burn Summary\n• Gross Burn: $10,000/mo\n⏳ Runway\n• Remaining Runway: 5.0 months';
  assert.equal(extractDecisionLines(noTip).tip, '');
  assert.equal(hasDecisionLines(noTip), false);
  // 空输入
  assert.equal(extractDecisionLines('').tip, '');
  // 有则必须抓得到，且是**那一行**而不是整段
  const withTip = '💸 Burn Summary\n• Gross Burn: $10,000/mo\n💡 Tip: Team costs are typically 50-70% of gross burn.';
  assert.equal(
    extractDecisionLines(withTip).tip,
    'Team costs are typically 50-70% of gross burn.',
  );
});

test('P168 提取器：剥掉 markdown 粗体（纯文本渲染 ⇒ 符号会原样显示）', () => {
  const raw = '💡 Tip: **runway < 6 mo** means raise now.';
  assert.equal(extractDecisionLines(raw).tip, 'runway < 6 mo means raise now.');
  assert.doesNotMatch(extractDecisionLines(raw).tip, /\*\*/);
});

test('P168 激活清单：判定口径与页面渲染条件一致', async () => {
  const engines = await loadEngines();
  const bySlug = new Map(engines.map((e) => [e.slug, e]));
  const activated = activatedSlugs(locales as any);
  assert.ok(activated.length > 0, '没有任何工具被激活（决策区块会永远不渲染）');

  const problems: string[] = [];
  for (const slug of activated) {
    const engine = bySlug.get(slug);
    if (!engine) { problems.push(slug + ' 没有对应引擎'); continue; }
    const sample = engine.staticExamples?.[0] ?? '';
    if (!rendersDecisionBlock(slug, locales as any, sample)) {
      problems.push(slug + ' 已被激活，但引擎示例里没有决策建议 ⇒ 页面会渲染一个空区块');
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 激活工具：en/zh 四个静态键都在、非占位、有长度下限', () => {
  const activated = activatedSlugs(locales as any);
  const problems: string[] = [];
  const floors: Record<string, number> = {
    decision_goal: MIN_GOAL_UNITS,
    decision_recommendation: MIN_RECOMMENDATION_UNITS,
    decision_constraint: MIN_CONSTRAINT_UNITS,
    decision_next_tool: MIN_NEXT_TOOL_UNITS,
  };
  for (const slug of activated) {
    for (const lang of LANGS) {
      for (const k of DECISION_KEYS) {
        const v = locales[lang]['tools.' + slug + '.' + k];
        if (typeof v !== 'string' || !v.length) {
          problems.push(lang + '/' + slug + '.' + k + ' 缺失');
          continue;
        }
        if (v.includes(PLACEHOLDER_MARKER)) {
          problems.push(lang + '/' + slug + '.' + k + ' 仍是占位模板');
          continue;
        }
        const units = infoUnits(v);
        if (units < floors[k]) {
          problems.push(lang + '/' + slug + '.' + k + ' 只有 ' + units.toFixed(1) + ' 信息量（下限 ' + floors[k] + '）');
          continue;
        }
        // ⭐ 保真度：中文不得比英文原文薄太多（中文更紧凑 ⇒ 忠实翻译约 0.75）
        if (lang === 'zh') {
          const enUnits = infoUnits(locales.en['tools.' + slug + '.' + k]);
          if (enUnits > 0 && units < enUnits * MIN_ZH_TO_EN_RATIO) {
            problems.push(
              lang + '/' + slug + '.' + k + ' 只有英文的 ' + (units / enUnits).toFixed(2) +
              '（下限 ' + MIN_ZH_TO_EN_RATIO + '）',
            );
          }
        }
      }
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 激活工具：三个静态键在 en 与 zh 里**互不相同**（防模板化）', () => {
  const activated = activatedSlugs(locales as any);
  const problems: string[] = [];
  for (const lang of LANGS) {
    for (const k of DECISION_KEYS) {
      const seen = new Map<string, string[]>();
      for (const slug of activated) {
        const v = locales[lang]['tools.' + slug + '.' + k];
        const arr = seen.get(v) ?? [];
        arr.push(slug);
        seen.set(v, arr);
      }
      for (const [text, slugs] of seen) {
        if (slugs.length > 1) {
          problems.push(lang + '.' + k + ' 有 ' + slugs.length + ' 个工具共用同一段文案：' + slugs.join(', '));
        }
      }
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 激活工具：引擎的 playbook 6 字段不得是占位模板', async () => {
  const engines = await loadEngines();
  const bySlug = new Map(engines.map((e) => [e.slug, e]));
  const problems: string[] = [];
  for (const slug of activatedSlugs(locales as any)) {
    const pb = bySlug.get(slug)?.playbook;
    if (!pb) { problems.push(slug + ' 没有 playbook'); continue; }
    for (const field of ['goal', 'input', 'output', 'constraint', 'tool', 'memory']) {
      const v = (pb as any)[field];
      if (typeof v !== 'string' || !v.length) { problems.push(slug + '.playbook.' + field + ' 缺失'); continue; }
      if (v.includes(PLACEHOLDER_MARKER)) problems.push(slug + '.playbook.' + field + ' 仍是占位模板');
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 激活工具：引擎输出里**不得**再有 🧭 决策段（区块已接管 ⇒ 再写就是同页重复）', async () => {
  const engines = await loadEngines();
  const bySlug = new Map(engines.map((e) => [e.slug, e]));
  const problems: string[] = [];
  for (const slug of activatedSlugs(locales as any)) {
    const engine = bySlug.get(slug);
    const sample = engine?.staticExamples?.[0] ?? '';
    if (sample.includes('🧭 Decision')) {
      problems.push(slug + ' 的引擎示例输出里还有 🧭 Decision 段 ⇒ 与决策区块同页重复');
    }
    // ⭐ 还要查**运行时**的输出：示例是缓存，运行时才是浏览器真正跑的那份
    let live = '';
    try {
      const r = engine?.generate?.({});
      live = Array.isArray(r) ? r.join('\n') : String(r ?? '');
    } catch (e) { /* 引擎缺输入抛错不算缺陷，跳过 */ }
    if (live.includes('🧭 Decision')) {
      problems.push(slug + ' 的引擎运行时输出里还有 🧭 Decision 段 ⇒ 与决策区块同页重复');
    }
    const customFn = engine?.clientConfig?.customFn ?? '';
    if (customFn.includes('Decision Recommendation')) {
      problems.push(slug + ' 的 customFn 里还有决策段 ⇒ 客户端算完也会同页重复');
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 激活工具：英文页的决策建议不得含中文（实测 19 个引擎整段是中文）', async () => {
  const engines = await loadEngines();
  const bySlug = new Map(engines.map((e) => [e.slug, e]));
  const problems: string[] = [];
  for (const slug of activatedSlugs(locales as any)) {
    const engine = bySlug.get(slug);
    const sample = engine?.staticExamples?.[0] ?? '';
    const tip = extractDecisionLines(sample).tip;
    if (!tip) continue;
    if (/[\u4e00-\u9fff]/.test(tip)) {
      problems.push(slug + ' 的决策建议在英文页上是中文：' + tip.slice(0, 60));
    }
  }
  // ⭐ P168（本批）：建议码形态下，英文页的建议**来自 en.json 的 decision_tip.* 模板**
  //   ⇒ 这条不变量现在也必须守 locale 那一侧，否则它对已迁移的 4 个工具**完全变空**
  //     （引擎里只剩一段 JSON，天然查不出中文）。
  for (const key of Object.keys(locales.en)) {
    if (!key.startsWith('decision_tip.')) continue;
    const v = locales.en[key];
    if (/[\u4e00-\u9fff]/.test(v)) {
      problems.push(key + ' 的英文模板里含中文：' + v.slice(0, 60));
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 ⭐ customFn 与 generate 的建议必须一致（两套实现不许漂）', async () => {
  const engines = await loadEngines();
  const bySlug = new Map(engines.map((e) => [e.slug, e]));
  const problems: string[] = [];
  for (const slug of activatedSlugs(locales as any)) {
    const engine = bySlug.get(slug);
    if (!engine) continue;
    // ⭐ 服务端这一侧用 **generate**（TS 实现），不是 staticExamples[0]：
    //   staticExamples 是 codegen 用**另一组示例输入**生成的缓存，
    //   它的 Tip 自然落在别的分支 ⇒ 拿它跟默认输入的客户端比是**错的口径**
    //   （实测 burn-rate：server="Default alive..." / client="Team costs..."）
    //   ⇒ 真正的不变量是「**同一组输入**下，两套实现给出同一句话」。
    const inputs = probeInputs(engine);
    let serverTip = '';
    try {
      const r = engine.generate(inputs);
      serverTip = extractDecisionLines((Array.isArray(r) ? r.map(String) : [String(r)]).join('\n')).tip;
    } catch (e) {
      problems.push(slug + ' 的 generate 执行失败：' + (e as Error).message);
      continue;
    }
    // 客户端真正执行的是 clientConfig.customFn —— 用**同一组输入**跑一遍
    const customFn = engine.clientConfig?.customFn;
    if (!customFn) continue;
    let clientTip = '';
    try {
      const fn = new Function('inputs', 'pick', 'fill', customFn);
      const pick = (arr: string[]) => arr[0];
      const fill = (tpl: string, v: Record<string, string>) =>
        tpl.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '{' + k + '}');
      const out = fn(inputs, pick, fill);
      // ⭐ 扫**全部**输出元素（gdpr-fine / cac 的 customFn 返回多元素数组）
      clientTip = tipFromCustomOutput(out);
    } catch (e) {
      problems.push(slug + ' 的 customFn 执行失败：' + (e as Error).message);
      continue;
    }
    if (serverTip !== clientTip) {
      problems.push(
        slug + ' 服务端与客户端的建议不一致：\n  server: ' + serverTip.slice(0, 80) +
        '\n  client: ' + clientTip.slice(0, 80),
      );
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 激活工具：决策建议必须**随输入变化**（动态层不能是常量建议）', async () => {
  // ⭐ 守的是不变量：「动态层放的是**针对你这组数字**的建议」。
  //   若 Tip 是写死的常量，它对任何输入都只会说同一句话 ⇒
  //   区块标题写着「这组数字的下一步」，说的却跟你的数字无关 ⇒ 名不副实。
  //
  // ⭐ 判据刻意**宽松**：逐个把某个 number 型输入 ×2，只要**有一次** Tip 变了就算过。
  //   只有「所有输入都改了、建议还一字不变」才判红 ⇒ 真常量才会红。
  //
  // ⚠️ pick 必须**确定性**（取第 0 个）—— 否则随机词池会让两次跑本来就不同，
  //   这条守卫就变成了永远绿。
  const engines = await loadEngines();
  const bySlug = new Map(engines.map((e) => [e.slug, e]));
  const problems: string[] = [];
  for (const slug of activatedSlugs(locales as any)) {
    const engine: any = bySlug.get(slug);
    if (!engine) continue;
    const fn = engine.clientConfig?.customFn;
    if (!fn) continue;
    const f = new Function('inputs', 'pick', 'fill', fn);
    const pick = (arr: string[]) => arr[0];
    const fill = (tpl: string, v: Record<string, string>) =>
      tpl.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '{' + k + '}');
    const base = probeInputs(engine);
    const run = (inputs: Record<string, string>) => {
      try {
        return tipFromCustomOutput(f(inputs, pick, fill));
      } catch {
        return '';
      }
    };
    const baseTip = run(base);
    if (!baseTip) {
      problems.push(slug + ' 跑不出决策建议 ⇒ 动态层是空的');
      continue;
    }
    let changed = false;
    for (const inp of engine.inputs ?? []) {
      if ((inp.type ?? 'number') !== 'number') continue;
      const v = Number(base[inp.name]);
      if (!isFinite(v) || v === 0) continue;
      // ⭐ 扰动要够「狠」：×2 对**比例型**分支条件无效
      //   （burn-rate 的分支看的是净烧钱占比；探针实测「全部输入 ×2」也不触发）
      //   ⇒ 依次试 ×10 / 归零 / +10000，任一命中即算「随输入变化」。
      for (const nv of [String(v * 10), '0', String(v + 10000)]) {
        const t = run({ ...base, [inp.name]: nv });
        if (t && t !== baseTip) { changed = true; break; }
      }
      if (changed) break;
    }
    if (!changed) {
      problems.push(slug + ' 的决策建议不随任何输入变化 ⇒ 它是常量建议（动态层名不副实）');
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 locale：每个工具的四个决策键必须**成组**齐（缺一个就要红）', () => {
  // ⭐⭐ 为什么不能只查「激活清单」
  //   激活清单是**自指**的：locale 少一个键 ⇒ 该工具「不算激活」
  //   ⇒ 守卫压根不去查它 ⇒ **永远绿**。
  //   （实测：变异 M16 删掉 gdpr-fine 的 decision_goal 之后，
  //     「四个静态键都在、非占位、有长度下限」那条**依然绿** ——
  //      因为那个工具已经「不被检查」了。）
  // ⇒ 改成扫**全部** tools.*.decision_* 键 ⇒ 按 slug 分组 ⇒ 每组必须正好 4 个。
  //
  // ⚠️ 期望值**独立写死**（不从 tests/l5-layers.json 派生 ⇒ 否则是同义反复）。
  const REQUIRED = ['decision_goal', 'decision_recommendation', 'decision_constraint', 'decision_next_tool'];
  const problems: string[] = [];
  for (const lang of LANGS) {
    const groups = new Map<string, Set<string>>();
    for (const key of Object.keys(locales[lang])) {
      const m = /^tools\.([^.]+)\.(decision_\w+)$/.exec(key);
      if (!m) continue;
      const slug = m[1];
      if (!groups.has(slug)) groups.set(slug, new Set<string>());
      groups.get(slug)!.add(m[2]);
    }
    for (const [slug, keys] of groups) {
      const missing = REQUIRED.filter((k) => !keys.has(k));
      if (missing.length) problems.push(lang + '/' + slug + ' 少了决策键：' + missing.join(', '));
      const extra = [...keys].filter((k) => !REQUIRED.includes(k));
      if (extra.length) problems.push(lang + '/' + slug + ' 有多余的决策键：' + extra.join(', '));
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

#!/usr/bin/env node
// P166 —— 「导语模板化」守卫（source-only）。
//
// 为什么要有这条守卫（守卫矩阵的一个真实缺口）
// --------------------------------------------
// P166 铺开 45 个主题后，实测发现**导语模板化严重**：
//   · zh/达标清单导语的组内模板词份额 = 34.08%（正文只有 6.81%）
//   · en/达标清单导语 = 26.54%（正文 2.12%）
//   · 页面级后果：新增「达标清单」区块后，与同类别其它主题页的最大相似度
//     在 44/45 页上**上升**（zh 平均 +1.16 个百分点）
//
// ⭐ 同池对照证明这是**真模板**、不是池子效应：
//   · 既有散文（howToApply + keyConcepts）在同一个 45 主题池里只有 6.98%
//   · 池子效应实测：同一批文本，池子 3→45，份额 3.88%→11.04%（会涨，但远不到 34%）
//   · 导语的曲线是**阶跃**：k3=2.57% → k6=20.30% ⇒ 说明有一批主题共用同一副骨架。
//
// ⇒ 之前的守卫矩阵**完全没覆盖这个维度**：内容守卫查字段长度/形状/step 对齐，
//   形状守卫查渲染结构，**没有一条查「导语之间像不像」**。
//   ⇒ 同 §17「守卫全绿 ≠ 维度被覆盖」：这个维度只能靠**主动量 + 独立断言**补上。
//
// 它盯住这些失败模式（一条断言只守一件事）：
//   1. 每个语言/形态的**导语**模板词份额不得超过上限
//   2. 任何两个主题的导语**开头**不得相同（同一副骨架的直接证据）
//   3. 样板句式不得在 ≥3 个主题的导语里出现
//   4. ⭐ **检测器自检**：造一个已知模板样本，断言检测器看得见它
//      （「检查违规」的断言在没有违规时本来就绿 —— 变异台子 M5 抓过这个缺口）
//
// ⚠️ 期望值全部是本文件里**独立写死**的字面量，不从被测模块导出常量。
// ⚠️ 上限的来由（不是拍脑袋）：
//   · 既有散文同池基线 6.98%（zh）/ 更低（en）
//   · 铺开前 3 个试点的实测值 0.50%–1.82%
//   · 上限留了 ~2 倍余量，但**远低于** AdSense 判低价值的 12.6% 那条线
// Build dependency: none (source-only).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import { TOPIC_PRIORITY_CONTENT } from '../src/data/topic-priority/index.ts';

/** 独立写死：导语的最短长度（与内容守卫同一套阈值） */
const MIN_INTRO_LENGTH = 150;

/**
 * 独立写死：各语言/形态的导语模板词份额上限（%）。
 *
 * 来由：既有散文同池基线 6.98%（zh）；试点 3 主题实测 0.50%–1.82%；
 * 上限留 ~2 倍余量，但明显低于 AdSense 判低价值的 12.6%。
 */
const MAX_INTRO_TEMPLATE_SHARE: Record<string, number> = {
  'en/benchmark': 12,
  'en/guide': 12,
  'zh/benchmark': 14,
  'zh/guide': 14,
};

/** 独立写死：导语开头多少字算「同一个开头」 */
const OPENING_CHARS = 16;

/** 独立写死：一个样板句式要命中几个主题才算「模板」（命中 1 个只是碰巧） */
const MIN_TOPICS_FOR_BOILERPLATE = 3;

const LANGS = ['en', 'zh'] as const;
const FORMS = ['benchmark', 'guide'] as const;

/**
 * 独立写死：样板句式清单 —— 「这一类主题该写什么」的通用骨架。
 * 命中说明写的是**关于这个形态本身**的话，而不是关于这个主题的话。
 */
const BOILERPLATE: Record<string, { label: string; re: RegExp }[]> = {
  'en/benchmark': [
    { label: 'the order below is a dependency order', re: /the order below is a dependency order/i },
    { label: 'the table below is ordered by', re: /the table below is ordered by/i },
  ],
  'en/guide': [
    { label: 'today', re: /\btoday\b/i },
    { label: 'a number you can check', re: /a number you can check/i },
    { label: 'if a step fails its gate', re: /if a step fails its gate/i },
    { label: 'as a scorecard', re: /as a scorecard/i },
  ],
  'zh/benchmark': [
    { label: '统一一套口径', re: /统一一套口径|统一口径/ },
    { label: '按依赖关系排序', re: /按依赖关系排/ },
  ],
  'zh/guide': [
    { label: '今天就能', re: /今天就能|今天能|今天可以/ },
    { label: '不达标别往下走', re: /不达标别往下走/ },
    { label: '这张清单说的是', re: /这张清单说的是|这份清单说的是/ },
    { label: '下面每一行都是', re: /下面每一行都是|下面每条都是/ },
  ],
};

/** 分词成 5-gram 序列（CJK 按字切，拉丁按词切） */
function shingles(text: string, n = 5): string[] {
  const tokens = [
    ...text.matchAll(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]|[A-Za-z0-9][A-Za-z0-9'\u2019\-]*/g),
  ].map((m) => m[0]!.toLowerCase());
  const out: string[] = [];
  for (let i = 0; i + n <= tokens.length; i++) out.push(tokens.slice(i, i + n).join(' '));
  return out;
}

/** 一批文本里「出现在 ≥2 个文本中的 n-gram」占全部 n-gram 的份额（%） */
function templateShare(texts: string[]): number {
  const counts = new Map<string, number>();
  const per = texts.map((t) => {
    const g = shingles(t);
    for (const x of g) counts.set(x, (counts.get(x) ?? 0) + 1);
    return g;
  });
  let total = 0;
  let shared = 0;
  for (const g of per) {
    for (const x of g) {
      total++;
      if ((counts.get(x) ?? 0) > 1) shared++;
    }
  }
  return total ? (shared / total) * 100 : 0;
}

/** 取某主题某语言某形态的导语 */
function introOf(id: string, lang: 'en' | 'zh', form: 'benchmark' | 'guide'): string {
  const p = TOPIC_PRIORITY_CONTENT[id];
  if (!p) return '';
  return form === 'benchmark' ? p.fixPriority[lang].intro : p.readinessChecklist[lang].intro;
}

const TOPIC_IDS = Object.keys(TOPIC_PRIORITY_CONTENT).sort();

// ---------------------------------------------------------------------------
// 1. 导语模板词份额
// ---------------------------------------------------------------------------

test('P166: 每个语言/形态的导语模板词份额都不得超过上限', () => {
  const problems: string[] = [];
  for (const lang of LANGS) {
    for (const form of FORMS) {
      const key = lang + '/' + form;
      const limit = MAX_INTRO_TEMPLATE_SHARE[key]!;
      const share = templateShare(TOPIC_IDS.map((id) => introOf(id, lang, form)));
      if (share > limit) {
        problems.push(key + '：导语模板词份额 ' + share.toFixed(2) + '% > 上限 ' + limit + '%');
      }
    }
  }
  assert.deepEqual(
    problems,
    [],
    '导语在复用同一副骨架（AdSense 判低价值的「组内模板词」维度）：\n' + problems.join('\n'),
  );
});

test('P166: 每个导语都必须非空且达长度下限', () => {
  const problems: string[] = [];
  for (const id of TOPIC_IDS) {
    for (const lang of LANGS) {
      for (const form of FORMS) {
        const text = (introOf(id, lang, form) ?? '').trim();
        if (text.length < MIN_INTRO_LENGTH) {
          problems.push(id + '.' + lang + '.' + form + '：' + text.length + ' 字符（< ' + MIN_INTRO_LENGTH + '）');
        }
      }
    }
  }
  assert.deepEqual(problems, [], '导语为空或过短：\n' + problems.join('\n'));
});

// ---------------------------------------------------------------------------
// 2. 开头不得撞
// ---------------------------------------------------------------------------

test('P166: 任何两个主题的导语开头都不得相同（同一副骨架的直接证据）', () => {
  const problems: string[] = [];
  for (const lang of LANGS) {
    for (const form of FORMS) {
      const groups = new Map<string, string[]>();
      for (const id of TOPIC_IDS) {
        const key = (introOf(id, lang, form) ?? '').trim().slice(0, OPENING_CHARS);
        if (!key) continue;
        const arr = groups.get(key) ?? [];
        arr.push(id);
        groups.set(key, arr);
      }
      for (const [key, group] of groups) {
        if (group.length > 1) {
          problems.push(lang + '/' + form + '：开头 ' + JSON.stringify(key) + ' → ' + group.join(', '));
        }
      }
    }
  }
  assert.deepEqual(
    problems,
    [],
    '两个主题的导语开头相同 ⇒ 它们在用同一副骨架：\n' + problems.join('\n'),
  );
});

// ---------------------------------------------------------------------------
// 3. 样板句式
// ---------------------------------------------------------------------------

test('P166: 样板句式不得在 ≥' + MIN_TOPICS_FOR_BOILERPLATE + ' 个主题的导语里出现', () => {
  const problems: string[] = [];
  for (const lang of LANGS) {
    for (const form of FORMS) {
      const key = lang + '/' + form;
      for (const bp of BOILERPLATE[key] ?? []) {
        const hit = TOPIC_IDS.filter((id) => bp.re.test(introOf(id, lang, form)));
        if (hit.length >= MIN_TOPICS_FOR_BOILERPLATE) {
          problems.push(key + '：样板句式「' + bp.label + '」命中 ' + hit.length + ' 个主题 → ' + hit.join(', '));
        }
      }
    }
  }
  assert.deepEqual(
    problems,
    [],
    '导语在写「关于这个形态本身」的话 ⇒ 45 个主题会长成同一副骨架：\n' + problems.join('\n'),
  );
});

// ---------------------------------------------------------------------------
// 4. ⭐ 检测器自检
// ---------------------------------------------------------------------------

test('P166: ⭐ 模板词检测器本身必须是活的（自检，不是空转）', () => {
  // ⭐ 为什么必须有这条：一个「检查违规」的断言，在**没有违规时本来就是绿的**
  //   ⇒ 检测器坏了（永远返回 0）时守卫照样绿。⇒ 必须单独造一个**已知模板**
  //   的样本，断言检测器看得见它。
  //
  // ⚠️ ⭐ 样本必须**长到能真的产生 5-gram**（≥5 个词）。
  //   踩过的坑：自检样本写成 'identical intro text'（只有 3 个词）⇒ 分词后
  //   一个 5-gram 都产不出来 ⇒ 份额算成 0% ⇒ 断言「检测器坏了」红了，
  //   而**检测器其实是对的**。⇒ 第一次跑这条自检就红了 ⇒ 改的是样本，不是检测器。
  //
  // 样本 1：两个完全一样的导语（每个 11 个词 ⇒ 各 7 个 5-gram）⇒ 份额必须接近 100%
  const same = templateShare([
    'alpha beta gamma delta epsilon zeta eta theta iota kappa',
    'alpha beta gamma delta epsilon zeta eta theta iota kappa',
  ]);
  assert.ok(same > 90, '两个一模一样的导语被判成 ' + same.toFixed(1) + '% ⇒ 检测器坏了');
  // 样本 2：两个毫无关系的导语 ⇒ 份额必须很低
  const diff = templateShare([
    'the warehouse burned down on tuesday afternoon and nobody noticed',
    'interest rates moved three times this quarter and nobody noticed',
  ]);
  assert.ok(diff < 5, '两个毫无关系的导语被判成 ' + diff.toFixed(1) + '% ⇒ 检测器过严（会误杀）');
  // 样本 3：前 10 个词相同、最后一个词不同 ⇒ 份额必须落在两者之间
  const partial = templateShare([
    'alpha beta gamma delta epsilon zeta eta theta iota kappa',
    'alpha beta gamma delta epsilon zeta eta theta iota omega',
  ]);
  assert.ok(partial > 5 && partial < 90, '部分重叠的导语被判成 ' + partial.toFixed(1) + '% ⇒ 检测器形状不对');
});

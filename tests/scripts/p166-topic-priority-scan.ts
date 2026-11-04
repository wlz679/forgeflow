#!/usr/bin/env node
// P166 —— 主题页新形态（「修复优先级表」/「达标清单」）实测扫描。
//
// 为什么要有这个工具
// ------------------
// P166 的新形态是**手写内容层**：每主题一个文件（src/data/topic-priority/<topic-id>.ts），
// 每个文件装 2 种形态 × 2 种语言 = 4 段内容。
// 试点阶段 3 个主题 ⇒ **3 主题 × 2 语言 × 2 形态 = 12 段**。
// 下一批铺其余 42 个主题时是**多个 worker 并行写** ⇒ 靠人眼把关必然漏 ⇒ 必须有可复算的验收工具。
//
// 本工具一次性报出六件事（对应计划 Task 6 Step 3）：
//   ① fixPriority.rows.length 与每行 4 个字段的长度
//   ② readinessChecklist.items.length 与每项 4 个字段的长度
//   ③ fixPriority 的 priority 是否 1..N 连续
//   ④ readinessChecklist 的 step 是否与 howToApply 里出现的 Step N 集合相等
//   ⑤ 价格类片段是否都走 live token（不许手写价格）
//   ⑥ PILOT_PRIORITY_TOPICS 与「实际带 priority 内容的 topic 集合」是否集合相等
//
// 报告形状要能同时表达「骨架未填」与「内容已填」两种状态：
//   · 每个字段都有状态（[OK] n 字符 / [缺失] 0 字符 / [过短] n 字符 / [问题] …）
//   · 每段都有状态（待填（骨架）/ 半填 / 已填）
//   · 总览给出「12 段待填」这类计数
//
// ⚠️ 此刻（试点骨架阶段）跑出来**必然**是「12 段待填 + 若干问题」—— 那是真实状态，不是工具坏了。
//    内容填完后重跑，同样的形状会变成「12 段已填 + 0 问题」。
//
// 跑法（必须从仓库根目录跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p166-topic-priority-scan.ts
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p166-topic-priority-scan.ts --strict
//     ↑ --strict：只要还有待填段/问题就返回退出码 1（给 CI 用；默认纯报告，退出码 0）
//
// ⚠️ 文件名**不能**带 .test.ts —— tests/build-dep-suites.mjs 的 walkTestSuites 只收
//    *.test.ts / *.test.mjs，带了会让套件计数漂移（266 → 267）。
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  PRIORITY_TOPICS,
  TOPIC_PRIORITY_CONTENT,
} from '../../src/data/topic-priority/index.ts';
import { TOPIC_GUIDE_CONTENT } from '../../src/data/topic-content.ts';
import { referencedModels } from '../../src/lib/live-price.ts';
// 价格纪律分档的**唯一真相源**（tests/_topic-priority-policy.ts）——
// 本文件不再自己维护一份清单（P164 的教训：开了第二份清单 ⇒ 既有守卫当场变红）。
import { MODEL_PRICE_TOPICS, handTypedPrices } from '../_topic-priority-policy.ts';
import PRICING from '../../src/data/ai-pricing.json';
import type {
  TopicFixPriorityTable,
  TopicPriorityContent,
  TopicReadinessChecklist,
} from '../../src/data/topic-priority/types.ts';

const NL = String.fromCharCode(10);
const LANGS = ['en', 'zh'] as const;
type Lang = (typeof LANGS)[number];

const ROOT = resolve(import.meta.dirname, '..', '..');
const TOPIC_DIR = resolve(ROOT, 'src', 'data', 'topic-priority');

// —— 阈值（与 tests/topic-priority-content-guard.test.ts 写死的同一套）——
const MIN_FIX_ROWS = 3;
const MIN_CHECKLIST_ITEMS = 4;
const MIN_METRIC_LENGTH = 20;   // metric / label：短标签
const MIN_PROSE_LENGTH = 150;   // intro / fixFirst / alsoMoves / backfire：散文
const MIN_GATE_LENGTH = 30;     // gate：达标线（还必须含数字）
const MIN_BLOCK_LENGTH = 80;    // blockIf：不达标会卡在哪

interface PricingDataset {
  llm?: Record<string, { models?: Record<string, unknown> }>;
}
const DATASET = PRICING as unknown as PricingDataset;

/** 「每 1M token」这种单价语境 —— 出现它就说明这段在讲单价。 */
const UNIT_PRICE_RE = /1M|per million|每百万/i;
const LIVE_TOKEN_RE = /\{\{live[^}]*\}\}/g;

// ⭐ 手写单价的形状与「哪些主题走严格档」都**不在本文件**：
//   · 形状（$ + 数字、无 K/M/B 后缀 = 手写）⇒ tests/_topic-priority-policy.ts
//   · 分档（讲市场价的 B 分类 = 严格档）⇒ 同上，从 topics.ts 的 letterId 派生
// 本文件只消费，不维护 —— P164 的教训：真相源只管住主数据文件、没管住脚本，
// 等于开了第二份清单 ⇒ 既有守卫当场变红。

function pad(s: string, width: number): string {
  let w = 0;
  for (const ch of s) w += ch.charCodeAt(0) > 0x2e80 ? 2 : 1;
  return w >= width ? s : s + ' '.repeat(width - w);
}

/** howToApply 里的步骤编号：en 用 "Step N"，zh 用 "步骤 N"。 */
function stepNumbers(text: string, lang: Lang): number[] {
  const re = lang === 'en' ? /Step\s+(\d+)/g : /步骤\s*(\d+)/g;
  const seen: number[] = [];
  for (const m of text.matchAll(re)) {
    const n = Number(m[1]);
    if (!seen.includes(n)) seen.push(n);
  }
  return seen.sort((a, b) => a - b);
}

function liveTokenCount(text: string): number {
  return (text.match(LIVE_TOKEN_RE) || []).length;
}

/** 一段文字里的价格问题：手写单价 / 讲了单价却没走 token / token 指向的数据集里没有的模型。 */
function priceProblems(text: string, strict: boolean): string[] {
  const out: string[] = [];
  if (!text) return out;
  if (strict) {
    for (const price of handTypedPrices(text)) {
      out.push('手写单价 ' + price + '（未走 live token）');
    }
  }
  const withoutTokens = text.replace(LIVE_TOKEN_RE, '');
  if (UNIT_PRICE_RE.test(text) && liveTokenCount(text) === 0) {
    out.push('讲每百万 token 单价却整段没有任何 live token');
  }
  if (UNIT_PRICE_RE.test(text) && /\$\s?\d/.test(withoutTokens)) {
    out.push('单价语境里混进了手写价格');
  }
  for (const ref of referencedModels(text)) {
    const provider = DATASET.llm ? DATASET.llm[ref.provider] : undefined;
    const model = provider && provider.models ? provider.models[ref.key] : undefined;
    if (!model) out.push('token 指向的模型不在数据集里：' + ref.provider + '/' + ref.key);
  }
  return out;
}

interface Cell {
  length: number;
  problems: string[];
}

function cell(value: string | undefined, min: number, strict: boolean): Cell {
  const text = typeof value === 'string' ? value : '';
  const trimmed = text.trim();
  const problems: string[] = [];
  if (trimmed.length === 0) problems.push('空');
  else if (trimmed.length < min) problems.push('过短（< ' + min + ' 字符）');
  for (const p of priceProblems(text, strict)) problems.push(p);
  return { length: trimmed.length, problems };
}

function tag(c: Cell): string {
  if (c.problems.length === 0) return '[OK]  ';
  if (c.problems.indexOf('空') >= 0) return '[缺失]';
  return '[问题]';
}

function segmentStatus(intro: string, count: number, allOk: boolean): string {
  if (!intro || intro.trim().length === 0) return count === 0 ? '待填（骨架）' : '半填';
  return allOk ? '已填' : '半填';
}

interface SegmentResult {
  status: string;
  lines: string[];
  problems: string[];
}

function renderFixPriority(
  topic: string,
  lang: Lang,
  table: TopicFixPriorityTable,
): SegmentResult {
  const lines: string[] = [];
  const problems: string[] = [];
  let allOk = true;

  const strict = MODEL_PRICE_TOPICS.has(topic);
  const intro = cell(table.intro, MIN_PROSE_LENGTH, strict);
  lines.push('      ' + pad('intro', 9) + ' ' + tag(intro) + ' ' + intro.length + ' 字符');
  if (intro.problems.length) {
    allOk = false;
    problems.push(topic + '/' + lang + '/fixPriority.intro：' + intro.problems.join('；'));
  }

  const rows = table.rows ?? [];
  lines.push('      ' + pad('rows', 9) + ' ' + rows.length + ' 行');
  if (rows.length < MIN_FIX_ROWS) {
    allOk = false;
    problems.push(topic + '/' + lang + '/fixPriority：只有 ' + rows.length + ' 行（< ' + MIN_FIX_ROWS + '）');
  }

  const priorities: number[] = [];
  rows.forEach((row, i) => {
    const p = typeof row.priority === 'number' ? row.priority : Number.NaN;
    priorities.push(p);
    lines.push('        [' + (i + 1) + '] priority = ' + String(p));
    const specs: Array<[string, string | undefined, number]> = [
      ['metric', row.metric, MIN_METRIC_LENGTH],
      ['fixFirst', row.fixFirst, MIN_PROSE_LENGTH],
      ['alsoMoves', row.alsoMoves, MIN_PROSE_LENGTH],
      ['backfire', row.backfire, MIN_PROSE_LENGTH],
    ];
    for (const spec of specs) {
      const c = cell(spec[1], spec[2], strict);
      lines.push('            ' + pad(spec[0], 9) + ' ' + tag(c) + ' ' + c.length + ' 字符');
      if (c.problems.length) {
        allOk = false;
        problems.push(
          topic + '/' + lang + '/fixPriority.rows[' + i + '].' + spec[0] + '：' + c.problems.join('；'),
        );
      }
    }
  });

  const want = rows.map((_, i) => i + 1);
  const consecutive = JSON.stringify(priorities) === JSON.stringify(want);
  if (rows.length === 0) {
    lines.push('      ' + pad('priority', 9) + ' [—] 无行（骨架）');
  } else if (consecutive) {
    lines.push('      ' + pad('priority', 9) + ' [OK] 1..' + rows.length + ' 连续');
  } else {
    lines.push(
      '      ' + pad('priority', 9) + ' [错误] ' + JSON.stringify(priorities) + '（期望 1..' + rows.length + '）',
    );
    allOk = false;
    problems.push(topic + '/' + lang + '/fixPriority：priority 不连续 ⇒ ' + JSON.stringify(priorities));
  }

  return { status: segmentStatus(table.intro, rows.length, allOk), lines, problems };
}

function renderChecklist(
  topic: string,
  lang: Lang,
  checklist: TopicReadinessChecklist,
  guideSteps: number[],
  hasGuide: boolean,
): SegmentResult {
  const lines: string[] = [];
  const problems: string[] = [];
  let allOk = true;

  const strict = MODEL_PRICE_TOPICS.has(topic);
  const intro = cell(checklist.intro, MIN_PROSE_LENGTH, strict);
  lines.push('      ' + pad('intro', 9) + ' ' + tag(intro) + ' ' + intro.length + ' 字符');
  if (intro.problems.length) {
    allOk = false;
    problems.push(topic + '/' + lang + '/readinessChecklist.intro：' + intro.problems.join('；'));
  }

  const items = checklist.items ?? [];
  lines.push('      ' + pad('items', 9) + ' ' + items.length + ' 项');
  if (items.length < MIN_CHECKLIST_ITEMS) {
    allOk = false;
    problems.push(
      topic + '/' + lang + '/readinessChecklist：只有 ' + items.length + ' 项（< ' + MIN_CHECKLIST_ITEMS + '）',
    );
  }

  const steps: number[] = [];
  items.forEach((item, i) => {
    const st = typeof item.step === 'number' ? item.step : Number.NaN;
    steps.push(st);
    lines.push('        [' + (i + 1) + '] step = ' + String(st));
    const specs: Array<[string, string | undefined, number]> = [
      ['label', item.label, MIN_METRIC_LENGTH],
      ['gate', item.gate, MIN_GATE_LENGTH],
      ['blockIf', item.blockIf, MIN_BLOCK_LENGTH],
    ];
    for (const spec of specs) {
      const c = cell(spec[1], spec[2], strict);
      lines.push('            ' + pad(spec[0], 9) + ' ' + tag(c) + ' ' + c.length + ' 字符');
      if (c.problems.length) {
        allOk = false;
        problems.push(
          topic + '/' + lang + '/readinessChecklist.items[' + i + '].' + spec[0] + '：' + c.problems.join('；'),
        );
      }
    }
    const gate = typeof item.gate === 'string' ? item.gate.trim() : '';
    if (gate && !/\d/.test(gate)) {
      allOk = false;
      problems.push(topic + '/' + lang + '/readinessChecklist.items[' + i + '].gate：达标线里没有数字');
    }
  });

  const uniq = Array.from(new Set(steps)).sort((a, b) => a - b);
  if (!hasGuide) {
    lines.push('      ' + pad('step', 9) + ' [错误] 该主题没有 TOPIC_GUIDE_CONTENT，无法对齐');
    allOk = false;
    problems.push(topic + '/' + lang + '/readinessChecklist：该主题在 TOPIC_GUIDE_CONTENT 里缺失');
  } else if (guideSteps.length === 0) {
    lines.push('      ' + pad('step', 9) + ' [错误] howToApply 里没识别出步骤编号');
    allOk = false;
    problems.push(topic + '/' + lang + '/readinessChecklist：howToApply 里没识别出步骤编号');
  } else if (items.length === 0) {
    lines.push(
      '      ' + pad('step', 9) + ' [待对齐] 清单为空 —— howToApply 有 ' + guideSteps.length + ' 步（' +
        guideSteps.join(', ') + '）待填',
    );
  } else if (JSON.stringify(uniq) === JSON.stringify(guideSteps)) {
    lines.push('      ' + pad('step', 9) + ' [OK] 与 howToApply 一致（' + guideSteps.join(', ') + '）');
  } else {
    lines.push(
      '      ' + pad('step', 9) + ' [错误] 清单=' + JSON.stringify(uniq) + '，howToApply=' + JSON.stringify(guideSteps),
    );
    allOk = false;
    problems.push(
      topic + '/' + lang + '/readinessChecklist：step 集合对不上 ⇒ 清单=' + JSON.stringify(uniq) +
        '，howToApply=' + JSON.stringify(guideSteps),
    );
  }

  return { status: segmentStatus(checklist.intro, items.length, allOk), lines, problems };
}

async function main(): Promise<void> {
  const strict = process.argv.slice(2).indexOf('--strict') >= 0;
  const out: string[] = [];
  const p = (s: string): void => {
    out.push(s);
  };
  // 内容问题（每个主题的字段长度 / step 对齐 / 价格纪律）
  const problems: string[] = [];
  // 装配待办（铺开过程中 index.ts 还没重跑生成器 ⇒ 这里会临时不为空；
  //   保留在问题计数里（--strict 仍然会因它而失败）。
  const assembly: string[] = [];

  // —— ⑥ 名单 vs 磁盘上真正带 priority 内容的文件 ——
  let filesOnDisk: string[] = [];
  try {
    filesOnDisk = readdirSync(TOPIC_DIR)
      .filter((f) => f.endsWith('.ts') && f !== 'types.ts' && f !== 'index.ts')
      .map((f) => f.slice(0, -3))
      .sort();
  } catch (e) {
    problems.push('读不到 src/data/topic-priority/ 目录：' + String(e));
  }
  const pilotList = Array.from(PRIORITY_TOPICS);
  const pilotSet = new Set<string>(pilotList);
  const diskSet = new Set<string>(filesOnDisk);
  const contentKeys = Object.keys(TOPIC_PRIORITY_CONTENT);
  const contentSet = new Set<string>(contentKeys);
  const missingFile = pilotList.filter((t) => !diskSet.has(t));
  const orphanFile = filesOnDisk.filter((t) => !pilotSet.has(t));
  const missingReg = filesOnDisk.filter((t) => !contentSet.has(t));
  const extraReg = contentKeys.filter((t) => !pilotSet.has(t));
  const sameOrder = JSON.stringify(contentKeys) === JSON.stringify(pilotList);

  // —— 逐主题逐形态逐语言渲染 ——
  const statuses: string[] = [];
  const topicBlocks: string[] = [];
  // ⭐ 遍历**磁盘上的全部文件**，不只遍历名单：
  //   铺开时（42 个主题分批写、逐批装配），新落盘但还没登记进 index.ts 的
  //   文件也能被验到 —— 否则「没登记」会被误报成「内容没问题」。
  const scanList = filesOnDisk.length ? filesOnDisk : pilotList;
  // ⭐ 从**磁盘直接 import** 每个主题文件（运行时真值）：
  //   铺开过程中「新落盘但还没登记进 index.ts」的文件也能被验到
  //   （之前只从 index.ts 取 ⇒ 未登记的文件被误报成「内容缺失」）。
  const diskContent = new Map<string, TopicPriorityContent>();
  for (const topic of filesOnDisk) {
    const href = pathToFileURL(resolve(TOPIC_DIR, topic + '.ts')).href;
    const mod = (await import(href)) as { priority: TopicPriorityContent };
    diskContent.set(topic, mod.priority);
  }
  for (const topic of scanList) {
    const content = diskContent.get(topic) ?? TOPIC_PRIORITY_CONTENT[topic];
    const guide = TOPIC_GUIDE_CONTENT[topic];
    const block: string[] = [];
    block.push('─'.repeat(78));
    block.push('主题 ' + topic);
    if (!content) {
      block.push('  ⚠️ 这个主题在 TOPIC_PRIORITY_CONTENT 里没有登记');
      problems.push(topic + '：TOPIC_PRIORITY_CONTENT 里缺失');
      topicBlocks.push(block.join(NL));
      continue;
    }
    for (const shape of ['fixPriority', 'readinessChecklist'] as const) {
      block.push('  ' + shape);
      for (const lang of LANGS) {
        let seg: SegmentResult;
        if (shape === 'fixPriority') {
          seg = renderFixPriority(topic, lang, content.fixPriority[lang]);
        } else {
          const steps = guide ? stepNumbers(guide[lang]?.howToApply ?? '', lang) : [];
          seg = renderChecklist(topic, lang, content.readinessChecklist[lang], steps, !!guide);
        }
        statuses.push(seg.status);
        block.push('    [' + lang + '] 状态：' + seg.status);
        for (const line of seg.lines) block.push(line);
        for (const pr of seg.problems) problems.push(pr);
      }
    }
    topicBlocks.push(block.join(NL));
  }

  const filled = statuses.filter((s) => s === '已填').length;
  const half = statuses.filter((s) => s === '半填').length;
  const todo = statuses.filter((s) => s === '待填（骨架）').length;

  // —— 报告 ——
  p('='.repeat(78));
  p('P166 —— 主题页新形态实测扫描（修复优先级表 / 达标清单）');
  p('='.repeat(78));
  p('数据层：src/data/topic-priority/');
  p('扫描范围（磁盘上的主题文件 ' + scanList.length + ' 个）：' + scanList.join(' / '));
  p('');
  p('【总览】');
  p('  段总数：' + scanList.length + ' 主题 × ' + LANGS.length + ' 语言 × 2 形态 = ' + statuses.length + ' 段');
  p('  已填 ' + filled + ' 段 ｜ 半填 ' + half + ' 段 ｜ 待填（骨架）' + todo + ' 段');
  p('  内容问题：' + problems.length + ' 条 ｜ 装配待办：' + assembly.length + ' 条（铺开过程中正常，装配层由生成器重跑后归零）');
  p('');
  p('【名单与文件（⑥）】');
  p('  index.ts 的 PRIORITY_TOPICS：' + pilotList.join(' / '));
  p('  磁盘上的主题文件（' + filesOnDisk.length + ' 个）      ：' + (filesOnDisk.join(' / ') || '（无）'));
  p('  TOPIC_PRIORITY_CONTENT 的键（' + contentKeys.length + ' 个）：' + (contentKeys.join(' / ') || '（无）'));
  p('  集合相等（名单 = 文件 = 注册表）：' +
    (missingFile.length === 0 && orphanFile.length === 0 && missingReg.length === 0 && extraReg.length === 0
      ? '[OK]'
      : '[错误]'));
  if (missingFile.length) assembly.push('名单里有、磁盘上没有文件：' + missingFile.join(', '));
  if (orphanFile.length) assembly.push('磁盘上有文件、名单里没有：' + orphanFile.join(', '));
  if (missingReg.length) assembly.push('文件有、TOPIC_PRIORITY_CONTENT 没登记：' + missingReg.join(', '));
  if (extraReg.length) assembly.push('TOPIC_PRIORITY_CONTENT 登记了名单外的主题：' + extraReg.join(', '));
  p('  装配顺序 = 名单顺序：' + (sameOrder ? '[OK]' : '[错误] ' + JSON.stringify(contentKeys)));
  if (!sameOrder) assembly.push('TOPIC_PRIORITY_CONTENT 的装配顺序与名单顺序不一致');
  p('');

  for (const block of topicBlocks) {
    p(block);
  }
  p('');

  p('【内容问题清单】（' + problems.length + ' 条）');
  if (problems.length === 0) {
    p('  （无）');
  } else {
    problems.forEach((pr, i) => {
      p('  ' + (i + 1) + '. ' + pr);
    });
  }
  p('');
  p('【装配待办清单】（' + assembly.length + ' 条，铺开过程中正常；装配层由生成器重跑后归零）');
  if (assembly.length === 0) {
    p('  （无）');
  } else {
    assembly.forEach((pr, i) => {
      p('  ' + (i + 1) + '. ' + pr);
    });
  }
  p('');
  p('（骨架阶段「待填 + 字段缺失」是真实状态；内容填完后重跑，同一份报告会变成「已填 + 0 问题」）');

  process.stdout.write(out.join(NL) + NL);
  if (strict && (problems.length > 0 || assembly.length > 0 || todo > 0 || half > 0)) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

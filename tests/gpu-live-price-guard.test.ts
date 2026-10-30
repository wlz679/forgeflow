#!/usr/bin/env node
// P161 — GPU 主题页与工具页 prose 的价格单一真相源守卫（source-only）。
//
// 为什么需要这个守卫
// ------------------
// P158 把主题页的 LLM 价格改成派生 token，P160 把引擎 FAQ 的价格也改成派生。
// 但 **GPU 那一层还在手写**，而且已经漂了：
//
// 实测（2026-10-30）：GPU 主题页的编辑内容里同时存在**三套**供应商口径 ——
// 正文列 10 家（6 专用 + 4 超大规模）、步骤写 7 家（多一个 CoreWeave）、
// 数据集只有 6 家；而**三套档位折扣区间**也彼此矛盾：
//
//   现货折扣   数据集 30-60%   工具页 md 40-60%   主题页 50-70%
//   预留折扣   数据集 10-30%   工具页 md 15-30%   主题页 30-60%
//
// 全部 GPU 单价区间也已脱节：主题页写 H100 $2.49-$12.40/hr，数据集是
// $1.69-$4.20/hr；H200 写 $2.79-$13.40/hr，数据集是 $2.20-$5.00/hr。
//
// 根因和 P158/P160 一样：**同一个事实两个真相源**，而其中一个每周只被 bot
// 更新一次（数据集由 bot 每周同步，编辑内容不）。
//
// ⇒ P161 的修法：GPU 的供应商名单、单价、档位折扣、月账单全部从
//   `src/data/ai-pricing.json` 的 `gpu` 段派生（见 src/lib/live-price.ts）。
//
// 本守卫盯住六条性质：
//
//   1. **手写单价归零**：GPU 编辑内容里不允许再出现手写的 GPU 价格
//      （数据集拥有的那一类）。不属于数据集的数字（出口/存储的**市场区间**、
//      计算器自己的**建模假设**）走**白名单**，每条必须写明理由，且必须
//      仍然出现在文本里（白名单腐烂 = 红）。
//   2. **供应商名单一致**：GPU 内容里出现的供应商名必须与数据集一致；
//      且必须出现**全部** 6 家（少一家 = 口径偷偷缩了）。
//   3. **token 种类已实现**：内容用到的 GPU token 种类必须在钉死清单里，
//      且清单里的每一种都真的被实现（跑一次真实替换，断言 token 被吃掉）。
//   4. **派生值 == 写死字面量**：关键派生值在本文件里**独立写死**，
//      不从被测模块导出。
//   5. **en / zh token 集合一致**：中文改了英文没改（或反之）会被抓住。
//   6. **模板接入**：主题页三个模板 + CalculatorProse + TopicCard 都必须
//      调用解析器，否则 token 会原样印到页面上。
//   7. **折扣带没有手写形态**：带 token 必须在场（否则编辑可以删掉它），
//      且**不得**额外出现手写的「数字区间 + %」折扣带（否则编辑可以
//      追加一个和数据集不符的带 —— P161 修掉的原故障形态）。
//
// ⚠️ 期望值全部是本文件里**独立写死**的字面量，不是从被测模块导出的常量。
//    数据集本身（`src/data/ai-pricing.json`）是真相源，直接读它比对 ——
//    而不是调 `live-price.ts` 的导出函数（那会让判据和实现同源）。
//
// Build dependency: none (source-only).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import PRICING from '../src/data/ai-pricing.json';
import {
  TOPIC_GUIDE_CONTENT,
  TOPIC_BENCHMARK_CONTENT,
} from '../src/data/topic-content.ts';
import { TOPICS } from '../src/data/topics.ts';
import { resolveLiveTokens, resolveLiveTokensDeep, hasUnresolvedToken } from '../src/lib/live-price.ts';

const root = resolve(import.meta.dirname, '..');

/** P161 覆盖的主题 —— 写死 */
const GPU_TOPIC = 'gpu-cloud-cost-optimization';

/** 工具页 prose（en + zh） */
const MD_EN = 'src/content/tools/solopreneur-gpu-cloud-cost-calculator.md';
const MD_ZH = 'src/content/tools/solopreneur-gpu-cloud-cost-calculator.zh.md';

/** 数据集里 GPU 段的供应商（真相源） */
const GPU_PROVIDERS = (PRICING as any).gpu.providers as Record<
  string,
  { name: string; spotMult: number; reservedMult: number; rates: Record<string, number>; order: number }
>;

/** 数据集里出现过的 GPU 型号 */
const GPU_TYPES = (() => {
  const out: string[] = [];
  for (const p of Object.values(GPU_PROVIDERS)) {
    for (const t of Object.keys(p.rates)) if (!out.includes(t)) out.push(t);
  }
  return out;
})();

/**
 * 白名单：**不属于数据集**的数字。
 *
 * ⚠️ 白名单不是免责区：每条必须写明理由，且必须仍然出现在文本里 ——
 *    编辑把它删了却忘了改白名单，守卫要报「白名单已腐烂」。
 *
 * ⚠️ 用**正则**而不是精确字符串：精确字符串会被更长的条目抢先命中
 *    （"$0.10" 里的 "$0" 会把 "$0.05-$0.12/GB" 拆坏）。
 */
const WHITELIST_EN: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\$0\.05-\$0\.12\/GB/,
    reason: '出口流量的市场区间 —— 数据集只拥有 GPU 小时价，不拥有存储/出口价',
  },
  {
    pattern: /\$900\/month/,
    reason: '10TB 跨区出口的示例金额 —— 同样落在市场出口价区间里（数据集不拥有）',
  },
  {
    pattern: /\$0\.10/,
    reason: '计算器自己的存储建模假设（公式常量 + 正文说明），不是市场报价',
  },
  {
    pattern: /\$0\.08/,
    reason: '计算器自己的出口建模假设（公式常量 + 正文说明），不是市场报价',
  },
  {
    pattern: /\$50(?![,\d])/,
    reason: '500 GB × $0.10/GB 的存储月费（建模假设的算术结果）',
  },
  {
    pattern: /\$4(?![,\d])/,
    reason: '50 GB × $0.08/GB 的出口月费（建模假设的算术结果）',
  },
  {
    pattern: /\$2,905\.20\/mo/,
    reason: 'GPU 费 + 存储 + 出口的合计（守卫会独立重算它，见下面的断言）',
  },
  {
    pattern: /\$0(?![\d.])/,
    reason: '专用云出口免费 —— "$0" 是「免费」而不是一个单价',
  },
];

const WHITELIST_ZH: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\$0\.05-\$0\.12\/GB/,
    reason: '出口流量的市场区间 —— 数据集只拥有 GPU 小时价，不拥有存储/出口价',
  },
  {
    pattern: /\$900\/月/,
    reason: '10TB 跨区出口的示例金额 —— 同样落在市场出口价区间里（数据集不拥有）',
  },
  {
    pattern: /\$0\.10/,
    reason: '计算器自己的存储建模假设（公式常量 + 正文说明），不是市场报价',
  },
  {
    pattern: /\$0\.08/,
    reason: '计算器自己的出口建模假设（公式常量 + 正文说明），不是市场报价',
  },
  {
    pattern: /\$50(?![,\d])/,
    reason: '500 GB × $0.10/GB 的存储月费（建模假设的算术结果）',
  },
  {
    pattern: /\$4(?![,\d])/,
    reason: '50 GB × $0.08/GB 的出口月费（建模假设的算术结果）',
  },
  {
    pattern: /\$2,905\.20\/月/,
    reason: 'GPU 费 + 存储 + 出口的合计（守卫会独立重算它，见下面的断言）',
  },
  {
    pattern: /\$0(?![\d.])/,
    reason: '专用云出口免费 —— "$0" 是「免费」而不是一个单价',
  },
];

/** 手写价格字面量：`$` + 数字（带 K/M/B 后缀的是聚合支出，允许） */
const PRICE_RE = /\$[ ]?\d+(?:[.,]\d+)?([KMBkmb])?/g;

/** 已经被数据集淘汰 / 从未存在的 GPU 云名字 */
const FORBIDDEN_PROVIDERS = ['CoreWeave', 'FluidStack', 'Crusoe', 'OCI'];

interface Unit {
  id: string;
  text: string;
}

function readMd(rel: string): string {
  const raw = readFileSync(resolve(root, rel), 'utf-8');
  return raw.replace(/^---[\s\S]*?---\n/, '');
}

function guideUnits(): Unit[] {
  const content = TOPIC_GUIDE_CONTENT[GPU_TOPIC]!;
  const units: Unit[] = [];
  for (const lang of ['en', 'zh'] as const) {
    for (const [field, value] of Object.entries(content[lang])) {
      units.push({ id: `guide/${lang}/${field}`, text: String(value) });
    }
  }
  return units;
}

function benchmarkUnits(): Unit[] {
  const content = TOPIC_BENCHMARK_CONTENT[GPU_TOPIC]!;
  const units: Unit[] = [];
  for (const lang of ['en', 'zh'] as const) {
    const c = content[lang];
    for (const [field, value] of Object.entries(c)) {
      if (field === 'rows') continue;
      units.push({ id: `benchmark/${lang}/${field}`, text: String(value) });
    }
    c.rows.forEach((row, i) => {
      units.push({
        id: `benchmark/${lang}/rows[${i}]`,
        text: `${row.segment} | ${row.metric} | ${row.benchmark} | ${row.source}`,
      });
    });
  }
  return units;
}

function mdUnits(): Unit[] {
  return [
    { id: 'md/en', text: readMd(MD_EN) },
    { id: 'md/zh', text: readMd(MD_ZH) },
  ];
}

function topicDescriptionUnits(): Unit[] {
  const topic = TOPICS.find((t) => t.id === GPU_TOPIC)!;
  return [
    { id: 'topics/description/en', text: topic.description.en },
    { id: 'topics/description/zh', text: topic.description.zh },
  ];
}

const ALL_UNITS: Unit[] = [
  ...guideUnits(),
  ...benchmarkUnits(),
  ...mdUnits(),
  ...topicDescriptionUnits(),
];

/** 去掉白名单条目后的文本（用于扫手写价） */
function stripWhitelist(text: string, whitelist: Array<{ pattern: RegExp }>): string {
  let out = text;
  for (const { pattern } of whitelist) out = out.replace(new RegExp(pattern.source, 'g'), ' ');
  return out;
}

function whitelistFor(unitId: string): Array<{ pattern: RegExp; reason: string }> {
  if (unitId === 'md/zh') return WHITELIST_ZH;
  if (unitId.startsWith('benchmark/zh') || unitId.startsWith('guide/zh')) return WHITELIST_ZH;
  return WHITELIST_EN;
}

// ---------------------------------------------------------------------------
// 1. 手写单价归零
// ---------------------------------------------------------------------------

test('P161: GPU editorial content carries no hand-typed GPU price', () => {
  const offenders: string[] = [];
  for (const unit of ALL_UNITS) {
    const text = stripWhitelist(unit.text, whitelistFor(unit.id));
    for (const m of text.matchAll(PRICE_RE)) {
      if (m[1]) continue; // 带 K/M/B → 聚合支出（月耗/阈值），是编辑场景
      offenders.push(`${unit.id}: ${m[0]} — ${unit.text.slice(0, 160)}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'GPU editorial content still contains hand-typed prices. Every price the pricing ' +
      'dataset owns must go through a {{liveGpu*}} token; prices it does not own ' +
      '(egress/storage market ranges, the calculator own modeling assumptions) must be ' +
      'whitelisted with a reason. Offenders:\n' +
      offenders.join('\n'),
  );
});

test('P161: every whitelist entry still appears in the content (whitelist does not rot)', () => {
  const missing: string[] = [];
  const all = ALL_UNITS.map((u) => u.text).join('\n');
  for (const { pattern, reason } of [...WHITELIST_EN, ...WHITELIST_ZH]) {
    if (!pattern.test(all)) missing.push(`${pattern.source} (${reason})`);
  }
  assert.deepEqual(
    missing,
    [],
    'these whitelist entries no longer appear anywhere in the GPU content — remove them ' +
      'from the whitelist (or restore the sentence they justified)',
  );
});

test('P161: the worked example total equals the derived GPU bill plus the modelling assumptions', () => {
  // 独立重算：4 GPU × 24 小时/天 × 30 天 × Lambda Labs A100 预留档价 + 500GB×$0.10 + 50GB×$0.08
  const lambda = GPU_PROVIDERS['lambdalabs']!;
  const rate = lambda.rates['A100']! * lambda.reservedMult; // 1.10 × 0.90 = 0.99
  const gpuBill = 4 * 24 * 30 * rate;
  const storage = 500 * 0.1;
  const egress = 50 * 0.08;
  const total = gpuBill + storage + egress;
  assert.equal(gpuBill.toFixed(2), '2851.20');
  assert.equal(total.toFixed(2), '2905.20');
  const en = readMd(MD_EN);
  const zh = readMd(MD_ZH);
  assert.ok(
    en.includes('$2,905.20/mo'),
    'the en worked example must publish the recomputed total $2,905.20/mo',
  );
  assert.ok(
    zh.includes('$2,905.20/月'),
    'the zh worked example must publish the recomputed total $2,905.20/月',
  );
});

// ---------------------------------------------------------------------------
// 2. 供应商名单一致
// ---------------------------------------------------------------------------

test('P161: GPU content names exactly the providers the dataset tracks', () => {
  const resolved = ALL_UNITS.map((u) => resolveLiveTokensDeep(u.text)).join('\n');
  const violations: string[] = [];
  for (const forbidden of FORBIDDEN_PROVIDERS) {
    const re = new RegExp(`\\b${forbidden}\\b`);
    if (re.test(resolved)) violations.push(`mentions "${forbidden}" — it is not in the dataset`);
  }
  for (const provider of Object.values(GPU_PROVIDERS)) {
    if (!resolved.includes(provider.name)) {
      violations.push(`never mentions "${provider.name}" — a tracked provider was dropped`);
    }
  }
  assert.deepEqual(
    violations,
    [],
    'the GPU content must name exactly the providers in src/data/ai-pricing.json (gpu.providers):\n' +
      violations.join('\n'),
  );
});

test('P161: the GPU provider count published in the content equals the dataset count', () => {
  const expected = Object.keys(GPU_PROVIDERS).length;
  assert.equal(expected, 6, 'the dataset should carry 6 GPU cloud providers');
  const guide = TOPIC_GUIDE_CONTENT[GPU_TOPIC]!;
  for (const lang of ['en', 'zh'] as const) {
    assert.ok(
      guide[lang].howToApply.includes('{{liveGpuProviderCount}}'),
      `${lang} guide must publish the provider count as a derived token`,
    );
  }
});

// ---------------------------------------------------------------------------
// 3. token 种类必须被实现
// ---------------------------------------------------------------------------

const GPU_TOKEN_KIND_RE = /\{\{(liveGpu[A-Za-z]*)(?::([^{}]*))?\}\}/g;

/** 内容里真正用到的 GPU token 种类 */
function usedGpuKinds(texts: string[]): Set<string> {
  const used = new Set<string>();
  for (const text of texts) {
    for (const m of text.matchAll(GPU_TOKEN_KIND_RE)) used.add(m[1]!);
  }
  return used;
}

/** 钉死的 GPU token 种类清单（写死） */
const PINNED_GPU_TOKEN_KINDS = [
  'liveGpuProviderCount',
  'liveGpuProviderList',
  'liveGpuProviderName',
  'liveGpuTypeList',
  'liveGpuTypeCount',
  'liveGpuRate',
  'liveGpuSpot',
  'liveGpuReserved',
  'liveGpuRange',
  'liveGpuSpotRange',
  'liveGpuOffSpot',
  'liveGpuOffReserved',
  'liveGpuShare',
  'liveGpuRatio',
  'liveGpuMonthly',
  'liveGpuMonthlyBlend',
  'liveGpuMonthlyRange',
  'liveGpuMonthlyBlendRange',
  'liveGpuBlendBand',
  'liveGpuCheapest',
  'liveGpuPriceiest',
] as const;

test('P161: every GPU token kind used in the content is implemented', () => {
  const used = usedGpuKinds(ALL_UNITS.map((u) => u.text));
  const unknown = [...used].filter((k) => !(PINNED_GPU_TOKEN_KINDS as readonly string[]).includes(k));
  assert.deepEqual(
    unknown,
    [],
    `these GPU token kinds are not implemented — they would be printed verbatim: ${unknown.join(', ')}`,
  );
  assert.ok(used.size >= 12, `expected the GPU content to use many token kinds, got ${used.size}`);
});

test('P161: every pinned GPU token kind is actually implemented, not just listed', () => {
  // 期望值独立写死（照数据集手算），不从被测模块导出。
  const samples: Record<string, string> = {
    liveGpuProviderCount: '6',
    liveGpuProviderList: 'RunPod, Vast.ai, Lambda Labs, AWS, GCP, Azure',
    liveGpuProviderName: 'lambdalabs',
    liveGpuTypeList: 'H200, H100, A100, L40S, RTX 4090, A6000',
    liveGpuTypeCount: '6',
    liveGpuRate: 'lambdalabs|H100',
    liveGpuSpot: 'vastai|A100',
    liveGpuReserved: 'lambdalabs|A100',
    liveGpuRange: 'H100',
    liveGpuSpotRange: 'A100',
    liveGpuOffSpot: 'aws',
    liveGpuOffReserved: 'aws',
    liveGpuShare: 'min|H100|on|max|H100|on',
    liveGpuRatio: 'min|H100|on|max|H100|on',
    liveGpuMonthly: 'lambdalabs|H100|on|4|24',
    liveGpuMonthlyBlend: 'lambdalabs|H100|0.7|0.3|4|24',
    liveGpuMonthlyRange: 'H100|on|4|24',
    liveGpuMonthlyBlendRange: 'H100|0.7|0.3|4|24',
    liveGpuBlendBand: 'H100|0.7|0.3',
    liveGpuCheapest: 'H100|on',
    liveGpuPriceiest: 'H100|on',
  };
  for (const kind of PINNED_GPU_TOKEN_KINDS) {
    const token = `{{${kind}:${samples[kind]!}}}`;
    const resolved = resolveLiveTokens(token);
    assert.ok(
      !resolved.includes('{{'),
      `token kind "${kind}" is not implemented — resolving ${token} left the raw token in the text`,
    );
    assert.notEqual(resolved, token, `token kind "${kind}" resolved to itself`);
  }
});

// ---------------------------------------------------------------------------
// 4. 派生值 == 写死字面量
// ---------------------------------------------------------------------------

test('P161: each pinned GPU token resolves to the expected value', () => {
  // 期望值在这里独立算出来（照数据集手算），不是调被测模块的导出函数。
  // 数据集：RunPod 1.99/0.79/0.69、Vast.ai 1.69/0.69/0.59、Lambda 2.49/1.10/0.80、
  //         AWS 4.00/3.50/1.20、GCP 4.20/2.80/1.00、Azure 3.80/3.00/1.10
  //         spotMult 0.6/0.5/0.7/0.4/0.45/0.5 · reservedMult 0.85/0.8/0.9/0.7/0.75/0.8
  const cases: Array<{ token: string; expected: string }> = [
    { token: '{{liveGpuProviderCount}}', expected: '6' },
    { token: '{{liveGpuProviderList}}', expected: 'RunPod, Vast.ai, Lambda Labs, AWS, GCP, Azure' },
    { token: '{{liveGpuProviderName:lambdalabs}}', expected: 'Lambda Labs' },
    { token: '{{liveGpuTypeList}}', expected: 'H200, H100, A100, L40S, RTX 4090, A6000' },
    { token: '{{liveGpuTypeCount}}', expected: '6' },
    { token: '{{liveGpuRate:lambdalabs|H100}}', expected: '$2.49' },
    { token: '{{liveGpuRate:min|H100}}', expected: '$1.69' },
    { token: '{{liveGpuRate:max|H100}}', expected: '$4.20' },
    { token: '{{liveGpuSpot:vastai|A100}}', expected: '$0.345' },
    { token: '{{liveGpuSpot:aws|H100}}', expected: '$1.60' },
    { token: '{{liveGpuReserved:lambdalabs|A100}}', expected: '$0.99' },
    { token: '{{liveGpuRange:H100}}', expected: '$1.69-$4.20' },
    { token: '{{liveGpuRange:A100}}', expected: '$0.69-$3.50' },
    { token: '{{liveGpuRange:H200}}', expected: '$2.20-$5.00' },
    { token: '{{liveGpuRange:L40S}}', expected: '$0.59-$1.20' },
    { token: '{{liveGpuRange:RTX4090}}', expected: '$0.44-$0.80' },
    { token: '{{liveGpuRange:A6000}}', expected: '$0.35-$0.65' },
    { token: '{{liveGpuSpotRange:A100}}', expected: '$0.345-$1.50' },
    { token: '{{liveGpuOffSpot}}', expected: '30-60' },
    { token: '{{liveGpuOffReserved}}', expected: '10-30' },
    { token: '{{liveGpuOffSpot:aws}}', expected: '60' },
    { token: '{{liveGpuOffReserved:aws}}', expected: '30' },
    { token: '{{liveGpuOffSpot:lambdalabs}}', expected: '30' },
    { token: '{{liveGpuOffReserved:lambdalabs}}', expected: '10' },
    // 最便宜 / 最贵：H100 按需 = Vast.ai $1.69 与 GCP $4.20
    { token: '{{liveGpuShare:min|H100|on|max|H100|on}}', expected: '40%' },
    { token: '{{liveGpuRatio:min|H100|on|max|H100|on}}', expected: '2.5' },
    { token: '{{liveGpuCheapest:H100|on}}', expected: 'Vast.ai' },
    { token: '{{liveGpuPriceiest:H100|on}}', expected: 'GCP' },
    // 月账单：4 GPU × 24h × 30d = 2880 GPU-小时
    { token: '{{liveGpuMonthly:lambdalabs|H100|on|4|24}}', expected: '$7,171.20' },
    { token: '{{liveGpuMonthly:lambdalabs|A100|reserved|4|24}}', expected: '$2,851.20' },
    { token: '{{liveGpuMonthly:vastai|A100|spot|1|8}}', expected: '$82.80' },
    { token: '{{liveGpuMonthlyRange:H100|on|4|24}}', expected: '$4,867.20-$12,096.00' },
    { token: '{{liveGpuMonthlyBlendRange:H100|0.7|0.3|4|24}}', expected: '$3,455.71-$7,983.36' },
    { token: '{{liveGpuBlendBand:H100|0.7|0.3}}', expected: '61-84' },
  ];
  for (const { token, expected } of cases) {
    assert.equal(resolveLiveTokens(token), expected, `token ${token} should resolve to "${expected}"`);
  }
});

// ---------------------------------------------------------------------------
// 5. en / zh 同步 + 基准行必须派生
// ---------------------------------------------------------------------------

test('P161: the en and zh GPU content use the same set of token kinds', () => {
  const guide = TOPIC_GUIDE_CONTENT[GPU_TOPIC]!;
  const bench = TOPIC_BENCHMARK_CONTENT[GPU_TOPIC]!;
  const enKinds = usedGpuKinds([
    ...Object.values(guide.en),
    ...bench.en.rows.map((r) => `${r.metric} ${r.benchmark} ${r.source}`),
    bench.en.whatWeMeasure,
    bench.en.industryBenchmarks,
    bench.en.howToUse,
    bench.en.sources,
  ]);
  const zhKinds = usedGpuKinds([
    ...Object.values(guide.zh),
    ...bench.zh.rows.map((r) => `${r.metric} ${r.benchmark} ${r.source}`),
    bench.zh.whatWeMeasure,
    bench.zh.industryBenchmarks,
    bench.zh.howToUse,
    bench.zh.sources,
  ]);
  const onlyEn = [...enKinds].filter((k) => !zhKinds.has(k));
  const onlyZh = [...zhKinds].filter((k) => !enKinds.has(k));
  assert.deepEqual(
    { onlyEn, onlyZh },
    { onlyEn: [], onlyZh: [] },
    'the en and zh GPU content must use the same token kinds — one language was ' +
      'updated and the other was not',
  );
});

test('P161: the tier discount bands are published as derived tokens, not typed by hand', () => {
  // ⚠️ 为什么单独一条：折扣区间**没有 `$`**（"30-60% off"），所以上面那条
  //    「手写单价归零」看不见它。编辑要是手写一个 "50-70% off"，
  //    站点会安静地发布一个和数据集不符的折扣 —— 这条断言把它按住。
  const guide = TOPIC_GUIDE_CONTENT[GPU_TOPIC]!;
  const bench = TOPIC_BENCHMARK_CONTENT[GPU_TOPIC]!;
  const mdEn = readMd(MD_EN);
  const mdZh = readMd(MD_ZH);
  const units: Array<[string, string]> = [
    ['guide/en', Object.values(guide.en).join('\n')],
    ['guide/zh', Object.values(guide.zh).join('\n')],
    ['benchmark/en', bench.en.rows.map((r) => r.benchmark).join('\n')],
    ['benchmark/zh', bench.zh.rows.map((r) => r.benchmark).join('\n')],
    ['md/en', mdEn],
    ['md/zh', mdZh],
  ];
  const violations: string[] = [];
  for (const [id, text] of units) {
    // ⚠️ 必须匹配**带本身**（`{{liveGpuOffSpot}}`），不能只匹配「有个 off-spot token」——
    //    表格里逐家供应商的 `{{liveGpuOffSpot:runpod}}` 会顶替掉带 token，
    //    断言就成了空转（变异台子 M10 实测）。
    if (!/\{\{liveGpuOffSpot\}\}/.test(text)) violations.push(`${id}: no {{liveGpuOffSpot}} band token`);
    if (!/\{\{liveGpuOffReserved\}\}/.test(text)) {
      violations.push(`${id}: no {{liveGpuOffReserved}} band token`);
    }
  }
  assert.deepEqual(
    violations,
    [],
    'the spot/reserved discount bands must be published as derived tokens — a typed ' +
      '"50-70% off" would publish a band the pricing dataset does not agree with:\n' +
      violations.join('\n'),
  );
});

// ---------------------------------------------------------------------------
// 1b. 手写的**折扣带**（"50-70% off"）—— 没有 `$`，上面两条都看不见它
// ---------------------------------------------------------------------------

/**
 * ⚠️ 为什么必须有这一条：
 *   上一条只断言「带 token 在不在」⇒ 抓的是「把 token 换成手写带」；
 *   但**追加**一个手写带（token 还在、手写带也加上去）时，上一条照样绿 ——
 *   而那正是 P161 修掉的原故障形态（主题页 50-70%、工具页 40-60%）。
 *   build-dep 的「过期串已消失」也只认那几条具体字符串，换成新的带同样漏。
 *   ⇒ 这条断言把「带」这个**形状**按住，而不是按住某几个字符串。
 *
 * 判定形状：手写的带一定长成「数字区间 + %」，且紧邻折扣词
 * （off / discount / cheaper / savings / 折扣 / 便宜 / 优惠 / 低）。
 * 合法写法只有一种形状 —— token 后面没有数字：
 *     {{liveGpuOffSpot}}% off   ← 合法
 *     50-70% off                ← 违规
 *
 * ⚠️ 窗口取 ±16 字符、而不是「禁止一切百分比区间」：
 *    GPU 内容里有大量**合法**的手写百分比区间（SemiAnalysis 超额支付
 *    35-60%、热备溢价 5-15%、出口隐藏加价 20-30%、现货采用 30-50%…），
 *    它们不是数据集拥有的事实、也不是折扣带 ⇒ 一刀切禁掉会误伤。
 *    真正要禁的是「带」，所以判据落在**带**的形状上。
 */
const RANGE_PCT_RE = /\d+(?:\.\d+)?\s*[-–—]\s*\d+(?:\.\d+)?\s*%/g;
/**
 * 折扣词表。
 *
 * ⚠️ 中文「低」**不在**这张表里：它有歧义 ——「跨云低延迟」「低于」「最低」
 *    都含「低」。实测：GPU 内容里合法的「热备溢价 5-15%」旁边就跟着
 *    「跨云低延迟」，把「低」放进窗口词表会把它误判成手写带。
 *    ⇒ 「低」只认**紧邻**写法（「低 50-70%」），单独一条正则判。
 *    「折扣 / 便宜 / 优惠」和英文那批（off / discount / cheaper / savings）
 *    没有这个歧义，正常进窗口。
 */
const DISCOUNT_WORD_RE = /\boff\b|\bdiscount(?:s|ed)?\b|\bcheaper\b|\bsavings?\b|折扣|便宜|优惠/;
const DISCOUNT_WINDOW = 16;
/** 中文折扣标记「低」的紧邻写法（「低 50-70%」），最多回看 6 个字符 */
const ZH_LOW_ADJACENT_RE = /低\s*$/;

test('P161: no hand-typed discount band survives in the GPU editorial content', () => {
  const offenders: string[] = [];
  for (const unit of ALL_UNITS) {
    const text = stripWhitelist(unit.text, whitelistFor(unit.id));
    for (const m of text.matchAll(RANGE_PCT_RE)) {
      const start = m.index!;
      const end = start + m[0].length;
      const window = text
        .slice(Math.max(0, start - DISCOUNT_WINDOW), Math.min(text.length, end + DISCOUNT_WINDOW))
        .replace(/\s+/g, ' ');
      const zhAdjacent = ZH_LOW_ADJACENT_RE.test(text.slice(Math.max(0, start - 6), start));
      if (DISCOUNT_WORD_RE.test(window) || zhAdjacent) {
        offenders.push(`${unit.id}: "${m[0]}" — …${window}…`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'a hand-typed discount band is published. The spot/reserved bands must come from ' +
      '{{liveGpuOffSpot}} / {{liveGpuOffReserved}} — a typed "50-70% off" would publish a ' +
      'band the pricing dataset does not agree with:\n' + offenders.join('\n'),
  );
});

test('P161: every GPU benchmark row publishes a derived price (except the egress row)', () => {
  const bench = TOPIC_BENCHMARK_CONTENT[GPU_TOPIC]!;
  for (const lang of ['en', 'zh'] as const) {
    const rows = bench[lang].rows;
    assert.ok(rows.length >= 8, `${lang}: expected at least 8 GPU benchmark rows, got ${rows.length}`);
    rows.forEach((row, i) => {
      if (/egress/i.test(row.segment) || /出口/.test(row.segment)) return; // 出口行是白名单里的市场区间
      assert.match(
        row.benchmark,
        /\{\{liveGpu[A-Za-z]*[:}]/,
        `${lang} row ${i} ("${row.segment}") must publish its price as a {{liveGpu*}} token, got "${row.benchmark}"`,
      );
    });
  }
});

test('P161: the GPU content resolves into clean text (no token survives)', () => {
  for (const unit of ALL_UNITS) {
    const resolved = resolveLiveTokensDeep(unit.text);
    assert.ok(
      !hasUnresolvedToken(resolved),
      `${unit.id}: still carries an unresolved live token after resolution — ${resolved.slice(0, 160)}`,
    );
  }
});

// ---------------------------------------------------------------------------
// 6. 工具页 prose 的表格 == 数据集
// ---------------------------------------------------------------------------

/**
 * 切表格行 —— 必须**跳过 token 内部的 `|`**。
 *
 * ⚠️ 踩过的坑：`{{liveGpuRate:runpod|H100}}` 里有一个 `|`，直接按 `|` split
 *    会把一个单元格切成三段 —— 守卫自己先坏掉，然后对着坏数据报错。
 */
function splitTableRow(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let depth = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '{' && line[i + 1] === '{') {
      depth++;
      cur += '{{';
      i++;
      continue;
    }
    if (ch === '}' && line[i + 1] === '}') {
      depth--;
      cur += '}}';
      i++;
      continue;
    }
    if (ch === '|' && depth === 0) {
      cells.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  cells.push(cur);
  return cells.map((c) => c.trim()).filter((c) => c.length);
}

test('P161: the tool page prose table matches the dataset row by row', () => {
  for (const rel of [MD_EN, MD_ZH]) {
    const body = readMd(rel);
    const tableLines = body.split('\n').filter((l) => /^\|/.test(l) && !/^\|\s*-/.test(l));
    // 去掉表头行
    const dataLines = tableLines.slice(1);
    assert.equal(
      dataLines.length,
      Object.keys(GPU_PROVIDERS).length,
      `${rel}: the table must have one row per tracked provider (${Object.keys(GPU_PROVIDERS).length})`,
    );
    dataLines.forEach((line, i) => {
      const cells = splitTableRow(line);
      assert.equal(cells.length, 6, `${rel} row ${i}: expected 6 cells, got ${cells.length}`);
      const providerKey = Object.keys(GPU_PROVIDERS)[i]!;
      const provider = GPU_PROVIDERS[providerKey]!;
      // 每个价格格都必须**是 token**（不是手写字面量）
      for (let c = 1; c < 6; c++) {
        assert.ok(
          cells[c]!.includes('{{liveGpu'),
          `${rel} row ${i} cell ${c} must be a {{liveGpu*}} token, got "${cells[c]}"`,
        );
      }
      assert.equal(
        resolveLiveTokens(cells[0]!),
        provider.name,
        `${rel} row ${i}: provider name must come from the dataset`,
      );
      // H100 / A100 / L40S 三档按需价
      const expectedRates = ['H100', 'A100', 'L40S'].map(
        (type) => `$${provider.rates[type]!.toFixed(2)}`,
      );
      for (let c = 0; c < 3; c++) {
        assert.equal(
          resolveLiveTokens(cells[c + 1]!),
          expectedRates[c],
          `${rel} row ${i} (${provider.name}): ${['H100', 'A100', 'L40S'][c]} rate must equal the dataset value`,
        );
      }
      // 现货 / 预留折扣（先解析再比对 —— 单元格原文里是 token）
      const spotOff = Math.round((1 - provider.spotMult) * 100);
      const reservedOff = Math.round((1 - provider.reservedMult) * 100);
      assert.ok(
        resolveLiveTokens(cells[4]!).includes(`${spotOff}%`),
        `${rel} row ${i} (${provider.name}): spot discount must be the derived ${spotOff}%`,
      );
      assert.ok(
        resolveLiveTokens(cells[5]!).includes(`${reservedOff}%`),
        `${rel} row ${i} (${provider.name}): reserved discount must be the derived ${reservedOff}%`,
      );
    });
  }
});

// ---------------------------------------------------------------------------
// 7. 模板接入
// ---------------------------------------------------------------------------

test('P161: every template that renders GPU content resolves live tokens', () => {
  const templates: Array<[string, RegExp]> = [
    ['src/pages/[lang]/[letter]/[topic]-guide.astro', /resolveLiveTokens\(/],
    ['src/pages/[lang]/[letter]/[topic]-compare.astro', /resolveLiveTokens\(/],
    ['src/pages/[lang]/[letter]/[topic]-benchmark.astro', /resolveLiveTokens\(/],
    ['src/components/CalculatorProse.astro', /resolveLiveTokens\(/],
    ['src/components/TopicCard.astro', /resolveLiveTokens\(/],
  ];
  for (const [rel, pattern] of templates) {
    const src = readFileSync(resolve(root, rel), 'utf-8');
    assert.match(
      src,
      /import\s*\{[^}]*resolveLiveTokens[^}]*\}\s*from\s*'[^']*live-price'/,
      `${rel} must import resolveLiveTokens from src/lib/live-price`,
    );
    assert.match(src, pattern, `${rel} must call resolveLiveTokens — otherwise the tokens are printed verbatim`);
  }
});

// ---------------------------------------------------------------------------
// 8. 未知 provider / 型号必须报错
// ---------------------------------------------------------------------------

test('P161: an unknown GPU provider or type throws instead of staying in the text', () => {
  assert.throws(() => resolveLiveTokens('{{liveGpuRate:nope|H100}}'), /Unknown GPU provider/);
  assert.throws(() => resolveLiveTokens('{{liveGpuRate:aws|L4}}'), /GPU type/);
  assert.throws(() => resolveLiveTokens('{{liveGpuMonthly:lambdalabs|H100|on|4}}'), /Malformed/);
});

#!/usr/bin/env node
// P160 — 引擎 FAQ 的价格单一真相源守卫（source-only）。
//
// 为什么需要这个守卫
// ------------------
// P158 把**主题页**的编辑内容（src/data/topic-content.ts）里的手写价格换成了
// 从 src/data/ai-pricing.json 派生的 token。但**工具页的 FAQ** 仍然是第二个
// 真相源 —— 那里手写着同一批模型的价格。
//
// 实测（2026-10-29）：5 个 LLM 引擎（claude / gemini / deepseek / openai /
// comparison）的 FAQ 里 42 处「模型 + $X/$Y」，其中 **4 处已经漂了**：
//   - Gemini 3.1 Pro    写 $2.50/$15.00 → 实为 $2.00/$12.00
//   - Gemini 2.5 Flash  写 $0.075/$0.30 → 实为 $0.30/$2.50（输出差 8.33 倍）
//   - Claude Haiku 4.5  写 $0.80/$4     → 实为 $1.00/$5.00
//   - Claude Opus 4.8   写 $15/$75      → 实为 $5.00/$25.00（差 3 倍）
// 还有 3 处**方向就写反了**（Gemini 3 Flash 的输出价其实比 Claude Haiku 3 贵
// 140%，文案却写「便宜 75%」），以及 1 处数量级错误（Claude 200K prompt 写
// $0.0003/1K，实际是 $0.003）。
//
// ⇒ P160 的修法：FAQ 里的价格也改成 token（见 src/lib/live-price.ts），
//   页面渲染时在 src/pages/[lang]/[slug].astro 的 translatedFaq 里解析。
//
// 本守卫盯住「派生机制」的六条性质：
//
//   1. **手写单价归零**：FAQ 源码里不允许再出现「每 1M token 单价」形态的
//      `$` 字面量（图片单价 / embedding 价 / 预算区间 / 启动额度走**显式白名单**，
//      每条白名单都写明理由）。
//   2. **key 必须存在**：每个 token 引用的 provider/key 必须在数据集里存在
//      （解析失败 = 构建期炸 = 整站发不出去）。
//   3. **三处同步**：引擎 .ts 的 FAQ、en.json、zh.json 必须逐条对齐 ——
//      少同步一处，zh 页面就会出现「问答错位」。
//   4. **不靠删价格钻空子**：token 数量有下限，且关键价格被写死钉住。
//   5. **名实一致**：价格 token 引用的模型必须与同句提到的模型名对得上。
//   6. **白名单不腐烂**：每条白名单必须仍在文本里出现，否则白名单已过期。
//
// ⚠️ 期望值全部是本文件里**独立写死**的字面量，不是从被测模块导出的常量。
//    数据集本身（`src/data/ai-pricing.json`）是真相源，直接读它比对 ——
//    而不是调 `live-price.ts` 的导出函数（那会让判据和实现同源）。
//
// Build dependency: none (source-only).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

import PRICING from '../src/data/ai-pricing.json';
import { resolveLiveTokens } from '../src/lib/live-price.ts';

const root = resolve(import.meta.dirname, '..');

/** P160 覆盖的 5 个 LLM 引擎（slug → 引擎文件名）—— 写死 */
const LLM_ENGINE_FILES: Array<{ slug: string; file: string }> = [
  { slug: 'solopreneur-ai-api-cost-comparison', file: 'ai-api-cost-comparison.ts' },
  { slug: 'solopreneur-claude-api-cost-calculator', file: 'claude-api-cost-calculator.ts' },
  { slug: 'solopreneur-gemini-api-cost-calculator', file: 'gemini-api-cost-calculator.ts' },
  { slug: 'solopreneur-deepseek-api-cost-calculator', file: 'deepseek-api-cost-calculator.ts' },
  { slug: 'solopreneur-openai-token-calculator', file: 'openai-token-calculator.ts' },
];

/**
 * 白名单：FAQ 里**保留手写**的金额 —— 它们不是「某个具名模型的每 1M token
 * 单价」，数据集推导不出来。每条都写明理由。
 */
const ALLOWED_RAW_PRICES: Array<{
  slug: string;
  index: number;
  snippets: string[];
  reason: string;
}> = [
  {
    slug: 'solopreneur-ai-api-cost-comparison',
    index: 11,
    snippets: ['$0.01/1M'],
    reason: 'embedding 单价 —— 数据集的 llm 段没有 embedding 模型',
  },
  {
    slug: 'solopreneur-openai-token-calculator',
    index: 14,
    snippets: ['$0.02/1M', '$3/1M'],
    reason: 'embedding 单价 / 微调单价 —— 数据集的 llm 段没有这些模型',
  },
];

/**
 * 「每 1M token 单价」的手写形态（严格）：
 *   $A/$B      每百万输入/输出价对
 *   $A/1M      每百万价（$A/M、$A/MTok 同理）
 *   $A per 1M  每百万价
 * 刻意**不**匹配 $A/image、$A/month、$A-$B 区间、$AK 额度 —— 那些不是单价。
 */
const RAW_TOKEN_PRICE =
  /\$[\d,.]+(?:\s*\/\s*(?:\$[\d,.]+|(?:1M|M|MTok)\b)|\s+per\s+1M\b)/gi;

const FAQ_ENTRY_RE =
  /\{\s*q:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*,\s*a:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*,?\s*\}/g;

function unescapeTs(s: string): string {
  return s.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

/** 读一个引擎文件里 faq: [...] 数组的 {q,a} 条目（按源码顺序） */
function readEngineFaq(file: string): Array<{ q: string; a: string }> {
  const src = readFileSync(join(root, 'src/engines/ai-cost', file), 'utf-8');
  const howIdx = src.indexOf('\n  howToUse:');
  assert.ok(howIdx > 0, `${file}: cannot find howToUse: marker`);
  const start = src.lastIndexOf('faq: [', howIdx);
  assert.ok(start > 0, `${file}: cannot find faq: [ marker`);
  const block = src.slice(start, howIdx);
  const out: Array<{ q: string; a: string }> = [];
  let m: RegExpExecArray | null;
  FAQ_ENTRY_RE.lastIndex = 0;
  while ((m = FAQ_ENTRY_RE.exec(block)) !== null) {
    out.push({ q: unescapeTs(m[1]!.slice(1, -1)), a: unescapeTs(m[2]!.slice(1, -1)) });
  }
  return out;
}

function readLocale(locale: 'en' | 'zh'): Record<string, string> {
  const raw = JSON.parse(
    readFileSync(join(root, 'src/i18n/locales', `${locale}.json`), 'utf-8'),
  ) as Record<string, string>;
  return raw;
}

/** 全部 5 个引擎的 FAQ（引擎源 + en + zh 三处） */
function collectAllFaq(): Array<{
  slug: string;
  index: number;
  where: 'engine' | 'en' | 'zh';
  q: string;
  a: string;
}> {
  const en = readLocale('en');
  const zh = readLocale('zh');
  const out: Array<{ slug: string; index: number; where: 'engine' | 'en' | 'zh'; q: string; a: string }> = [];
  for (const { slug, file } of LLM_ENGINE_FILES) {
    const entries = readEngineFaq(file);
    for (let i = 0; i < entries.length; i++) {
      out.push({ slug, index: i, where: 'engine', q: entries[i]!.q, a: entries[i]!.a });
      const enQ = en[`tools.${slug}.faq.${i}.q`];
      const enA = en[`tools.${slug}.faq.${i}.a`];
      const zhQ = zh[`tools.${slug}.faq.${i}.q`];
      const zhA = zh[`tools.${slug}.faq.${i}.a`];
      out.push({ slug, index: i, where: 'en', q: enQ ?? '', a: enA ?? '' });
      out.push({ slug, index: i, where: 'zh', q: zhQ ?? '', a: zhA ?? '' });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// 1. 手写单价归零
// ─────────────────────────────────────────────────────────────
test('P160: LLM 引擎 FAQ 里不再有手写的「每 1M token 单价」', () => {
  const violations: string[] = [];
  for (const { slug, index, where, a } of collectAllFaq()) {
    if (!a) continue;
    const allowed = ALLOWED_RAW_PRICES.filter((x) => x.slug === slug && x.index === index);
    for (const hit of a.match(RAW_TOKEN_PRICE) ?? []) {
      const covered = allowed.some((x) => x.snippets.some((s) => s.includes(hit) || hit.includes(s)));
      if (!covered) {
        violations.push(`${slug} FAQ[${index}] (${where}): 手写单价 ${hit}`);
      }
    }
  }
  assert.equal(
    violations.length,
    0,
    `FAQ 里的手写「每 1M token 单价」必须改成 token：\n` +
      violations.map((v) => `  - ${v}`).join('\n'),
  );
});

// ─────────────────────────────────────────────────────────────
// 2. key 必须存在（解析不炸）
// ─────────────────────────────────────────────────────────────
test('P160: FAQ 里的每个 live token 都能从数据集解析出来', () => {
  const violations: string[] = [];
  for (const { slug, index, where, a } of collectAllFaq()) {
    if (!a) continue;
    try {
      const resolved = resolveLiveTokens(a);
      if (/\{\{/.test(resolved)) {
        violations.push(`${slug} FAQ[${index}] (${where}): 解析后仍有 {{ }} 残留`);
      }
    } catch (e) {
      violations.push(`${slug} FAQ[${index}] (${where}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  assert.equal(
    violations.length,
    0,
    `FAQ token 解析失败：\n` + violations.map((v) => `  - ${v}`).join('\n'),
  );
});

// ─────────────────────────────────────────────────────────────
// 3. 三处同步（引擎 / en.json / zh.json 逐条对齐）
// ─────────────────────────────────────────────────────────────
test('P160: 引擎 FAQ 与 en.json / zh.json 逐条对齐（index → q/a）', () => {
  const violations: string[] = [];
  for (const { slug, file } of LLM_ENGINE_FILES) {
    const entries = readEngineFaq(file);
    const en = readLocale('en');
    const zh = readLocale('zh');
    const seenQuestions = new Map<string, number>();
    for (let i = 0; i < entries.length; i++) {
      const enQ = en[`tools.${slug}.faq.${i}.q`];
      const enA = en[`tools.${slug}.faq.${i}.a`];
      const zhQ = zh[`tools.${slug}.faq.${i}.q`];
      const zhA = zh[`tools.${slug}.faq.${i}.a`];
      if (enQ !== entries[i]!.q) {
        violations.push(`${file} FAQ[${i}].q: en.json 与引擎源不一致`);
      }
      if (enA !== entries[i]!.a) {
        violations.push(`${file} FAQ[${i}].a: en.json 与引擎源不一致`);
      }
      if (typeof zhQ !== 'string' || zhQ === '') {
        violations.push(`${file} FAQ[${i}].q: zh.json 缺失`);
      }
      if (typeof zhA !== 'string' || zhA === '') {
        violations.push(`${file} FAQ[${i}].a: zh.json 缺失`);
      }

      // ── 同一个 index 上，三处引用的 live token 必须完全一致 ──
      // zh 是翻译，文本可以不同；但**价格 token 必须指向同一批模型** ——
      // 否则 zh 页面会拿 en 页面的价格配另一个模型的文案。
      const tokOf = (s: string | undefined): string =>
        typeof s === 'string' ? [...s.matchAll(/\{\{live[A-Za-z]*:([^}]+)\}\}/g)].map((m) => m[1]!).sort().join('|') : ' MISSING';
      const engineTok = tokOf(entries[i]!.a);
      if (tokOf(enA) !== engineTok) {
        violations.push(`${file} FAQ[${i}].a: en.json 的 token 集合与引擎源不一致`);
      }
      if (tokOf(zhA) !== engineTok) {
        violations.push(`${file} FAQ[${i}].a: zh.json 的 token 集合与引擎源不一致`);
      }

      // ── en.json 的问题不得重复 ──
      // 修过的真实 bug：claude / openai 的 locale JSON 里 FAQ[7] 与 FAQ[14]
      // 重复（都是最后一条），导致引擎的第 7 条 FAQ 在 zh 页面上整条消失。
      if (typeof enQ === 'string') {
        const prev = seenQuestions.get(enQ);
        if (prev !== undefined) {
          violations.push(`${file}: en.json 的 FAQ[${i}].q 与 FAQ[${prev}].q 重复 —— 有一条 FAQ 被漏掉了`);
        } else {
          seenQuestions.set(enQ, i);
        }
      }
    }
  }
  assert.equal(
    violations.length,
    0,
    `FAQ 三处来源不一致（zh 页面按 index 取值，错位 = 问答不对应）：\n` +
      violations.map((v) => `  - ${v}`).join('\n'),
  );
});

// ─────────────────────────────────────────────────────────────
// 4. 不靠删价格钻空子 —— token 数量下限 + 关键价格钉死
// ─────────────────────────────────────────────────────────────
test('P160: FAQ 里的价格确实来自数据集（token 数量下限 + 关键价格钉死）', () => {
  // token 数量下限（写死）：5 个引擎的 FAQ 一共至少要有这么多 live token，
  // 否则「把价格全删掉」也能骗过守卫。
  let tokenCount = 0;
  for (const { slug, file } of LLM_ENGINE_FILES) {
    for (const entry of readEngineFaq(file)) {
      tokenCount += (entry.a.match(/\{\{live/g) ?? []).length;
      tokenCount += (entry.q.match(/\{\{live/g) ?? []).length;
    }
  }
  assert.ok(
    tokenCount >= 90,
    `5 个 LLM 引擎 FAQ 里的 live token 只有 ${tokenCount} 个（期望 ≥ 90）—— 价格被删掉了？`,
  );

  // 关键价格钉死：期望值是**写死的字面量**，不是从 live-price.ts 导出的。
  const cases: Array<{
    slug: string;
    file: string;
    index: number;
    mustInclude: string[];
    mustNotInclude: string[];
  }> = [
    {
      slug: 'solopreneur-claude-api-cost-calculator',
      file: 'claude-api-cost-calculator.ts',
      index: 8,
      // Haiku 4.5 真价 $1.00/$5.00（旧手写 $0.80/$4）；Opus 4.8 真价 $5.00/$25.00（旧手写 $15/$75）
      mustInclude: ['$1.00 / $5.00', '$5.00 / $25.00'],
      mustNotInclude: ['$0.80', '$15/$75'],
    },
    {
      slug: 'solopreneur-gemini-api-cost-calculator',
      file: 'gemini-api-cost-calculator.ts',
      index: 11,
      // Gemini 2.5 Flash 真价 $0.30/$2.50（旧手写 $0.075/$0.30 —— 那是 1.5 Flash 的价）
      mustInclude: ['$0.30 / $2.50'],
      mustNotInclude: ['$0.075 / $0.30'],
    },
    {
      slug: 'solopreneur-deepseek-api-cost-calculator',
      file: 'deepseek-api-cost-calculator.ts',
      index: 0,
      // 100 reqs/day ⇒ 3,000 reqs/月：V4.1 Flash 1017 = $1.35，GPT-4o = $22.50
      mustInclude: ['$1.35', '$22.50', '$0.84'],
      mustNotInclude: [],
    },
    {
      slug: 'solopreneur-openai-token-calculator',
      file: 'openai-token-calculator.ts',
      index: 1,
      mustInclude: ['$0.05 / $0.40'],
      mustNotInclude: ['$0.05/$0.40'],
    },
  ];

  for (const c of cases) {
    const entry = readEngineFaq(c.file)[c.index];
    assert.ok(entry, `${c.file}: no FAQ[${c.index}]`);
    const resolved = resolveLiveTokens(entry!.a);
    for (const needle of c.mustInclude) {
      assert.ok(
        resolved.includes(needle),
        `${c.file} FAQ[${c.index}] 解析结果应包含 "${needle}"，实际：${resolved.slice(0, 200)}`,
      );
    }
    for (const needle of c.mustNotInclude) {
      assert.ok(
        !resolved.includes(needle),
        `${c.file} FAQ[${c.index}] 解析结果不应再包含旧手写价 "${needle}"`,
      );
    }
  }
});

// ─────────────────────────────────────────────────────────────
// 5. 名实一致 —— 价格 token 必须在同一条目里提到对应的模型
// ─────────────────────────────────────────────────────────────
/** 规范化：去掉点号、空格、连字符、括号、逗号、百分号（"Opus 4.8" ≡ "Opus 48"） */
function norm(s: string): string {
  return s.toLowerCase().replace(/[.\s\-()%,]/g, '');
}

/**
 * 数据集显示名与正文写法能否对上。
 *
 * 数据集名与正文常见两类差异：
 *   - 分隔符不同："GPT 4o"（数据集）vs "GPT-4o"（正文）→ 规范化后相同
 *   - 正文省略厂商前缀："Claude Opus 48"（数据集）vs "Opus 4.8"（正文）
 *     → 去掉括号补充与厂商前缀后再比
 */
function namesMatch(datasetName: string, prose: string): boolean {
  const p = norm(prose);
  if (p.includes(norm(datasetName))) return true;
  const stripped = datasetName
    .replace(/\([^)]*\)/g, ' ')
    .replace(/^(Deepseek|GPT|Claude|Gemini)\s+/i, '')
    .trim();
  const core = norm(stripped);
  // 核心名太短（"55"、"r1"）时匹配不可靠 ⇒ 不作为判据
  return core.length >= 3 && p.includes(core);
}

test('P160: FAQ 里每个价格 token 的模型名都在同一条目里出现', () => {
  const violations: string[] = [];
  for (const { slug, file } of LLM_ENGINE_FILES) {
    for (const entry of readEngineFaq(file)) {
      const refs = [
        ...entry.a.matchAll(
          /\{\{live(?:In|Out|Batch|BatchIn|BatchOut|ScaledIn|ScaledOut|CostIn|CostOut|MonthlyAt)?:([^}|]+)(?:\|[^}]*)?\}\}/g,
        ),
      ];
      for (const ref of refs) {
        const key = ref[1]!.trim();
        const model = (PRICING as any).llm?.[key.split('/')[0]]?.models?.[key.split('/')[1]];
        assert.ok(model, `${slug}: token 引用的 ${key} 不在数据集里`);
        const name = String(model.name);
        if (!namesMatch(name, entry.a)) {
          violations.push(
            `${slug}: token ${key}（${name}）的价��出现在这条 FAQ 里，但条目中没有提到该模型：${entry.a.slice(0, 150)}`,
          );
        }
      }
    }
  }
  assert.equal(
    violations.length,
    0,
    `FAQ 里「名字指 A、价格指 B」的错位：\n` + violations.map((v) => `  - ${v}`).join('\n'),
  );
});

// ─────────────────────────────────────────────────────────────
// 7. 派生值钉死 —— 每个 token 类型的输出必须与写死的字面量一致
// ─────────────────────────────────────────────────────────────
test('P160: 各 token 类型的派生值 == 写死的字面量', () => {
  const expectations: Array<[string, string]> = [
    // 每 1M token 的输入/输出价
    ['{{live:anthropic/claude-opus-4-8}}', '$5.00 / $25.00'],
    ['{{live:anthropic/claude-haiku-4-5}}', '$1.00 / $5.00'],
    ['{{live:google/gemini-2.5-flash}}', '$0.30 / $2.50'],
    ['{{live:deepseek/deepseek-coder}}', '$0.14 / $0.28'],
    // 单价
    ['{{liveIn:openai/gpt-4o}}', '$2.50'],
    ['{{liveOut:openai/gpt-4o-mini}}', '$0.60'],
    // 批处理价（数据集里 39/245 个模型有批处理档）
    ['{{liveBatch:google/gemini-3-flash}}', '$0.25 / $1.50'],
    ['{{liveBatchIn:google/gemini-3.1-pro}}', '$1.00'],
    // 占比（方向安全：贵 200% 就是贵 200%）
    ['{{liveShareIn:anthropic/claude-opus-4-8|openai/gpt-4o}}', '200%'],
    ['{{liveShareMix:deepseek/deepseek-v4.1-flash-1017|openai/gpt-4o}}', '6%'],
    // 单次请求成本（5 位小数不能被截断）
    ['{{liveCostIn:openai/gpt-5|1000}}', '$0.00125'],
    ['{{liveCostOut:openai/gpt-5|500}}', '$0.005'],
    ['{{liveCostMix:openai/gpt-5|1000|500}}', '$0.00625'],
    // 按系数缩放（缓存折后价）
    ['{{liveScaledIn:anthropic/claude-sonnet-4-6|0.1}}', '$0.30'],
    ['{{liveScaledIn:deepseek/deepseek-v4.1-flash-1017|0.02}}', '$0.003'],
    // 月支出（按每月请求数）
    ['{{liveMonthlyAt:deepseek/deepseek-v4.1-flash-1017|3000}}', '$1.35'],
    ['{{liveMonthlyAt:openai/gpt-4o|3000}}', '$22.50'],
    ['{{liveMonthlyAt:openai/gpt-5-nano|100000}}', '$25.00'],
  ];
  for (const [token, expected] of expectations) {
    assert.equal(
      resolveLiveTokens(token),
      expected,
      `${token} 的解析结果应为 "${expected}"`,
    );
  }
});

// ─────────────────────────────────────────────────────────────
// 6. 白名单不腐烂
// ─────────────────────────────────────────────────────────────
test('P160: 白名单条目必须仍然存在于对应 FAQ 里（否则白名单已过期）', () => {
  const violations: string[] = [];
  for (const allowed of ALLOWED_RAW_PRICES) {
    const file = LLM_ENGINE_FILES.find((x) => x.slug === allowed.slug)?.file;
    assert.ok(file, `白名单里的 slug ${allowed.slug} 不在本守卫覆盖范围内`);
    const entry = readEngineFaq(file!)[allowed.index];
    assert.ok(entry, `${file}: no FAQ[${allowed.index}]`);
    for (const snippet of allowed.snippets) {
      if (!entry!.a.includes(snippet)) {
        violations.push(`${allowed.slug} FAQ[${allowed.index}]: 白名单片段 "${snippet}" 已不在文本里`);
      }
    }
    assert.ok(allowed.reason.length > 10, `白名单条目 ${allowed.slug}[${allowed.index}] 必须写明理由`);
  }
  assert.equal(violations.length, 0, violations.join('\n'));
});

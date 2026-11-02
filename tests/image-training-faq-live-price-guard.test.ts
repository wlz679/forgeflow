#!/usr/bin/env node
// P163 — 图片 / 训练两个引擎 FAQ 的价格单一真相源守卫（source-only）。
//
// 覆盖：
//   src/engines/ai-cost/ai-image-generation-cost-calculator.ts
//   src/engines/ai-cost/ai-training-cost-estimator.ts
//
// 为什么需要这个守卫
// ------------------
// P160 的 FAQ 价格守卫只覆盖 5 个 LLM 引擎；P162 补了 GPU 引擎。
// ⇒ 图片与训练这两个引擎的 FAQ 在 P163 之前**不在任何价格守卫内**
// （信号 W 的第三次复发）。本守卫补上这一格。
//
// 本守卫盯住六条性质（与 P160 同形，但断言对象不同）：
//   1. 手写单价归零（白名单逐条写「数据集为什么不拥有它」）
//   2. token 引用的 provider / gpuKey 必须在数据集里存在
//   3. 三处同步：引擎 .ts 的 FAQ、en.json、zh.json 逐条对齐
//   4. token 数量有下限（不靠删价格钻空子）
//   5. 每种 token 都真的被实现了（不只是列在清单里）
//   6. 白名单不腐烂：每条白名单必须仍在文本里出现
//
// ⚠️ 期望值全部是本文件里**独立写死**的字面量。
// Build dependency: none (source-only).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import PRICING from '../src/data/ai-pricing.json';
import { resolveLiveTokens, IMAGE_TRAINING_TOKEN_KINDS } from '../src/lib/live-price.ts';

const root = resolve(import.meta.dirname, '..');

const ENGINES = [
  {
    slug: 'solopreneur-ai-image-cost-calculator',
    file: 'src/engines/ai-cost/ai-image-generation-cost-calculator.ts',
    providerKeys: ['dalle-4', 'dalle-3', 'midjourney-v7', 'stable-diffusion-4', 'ideogram-3', 'flux-pro', 'leonardo'],
  },
  {
    slug: 'solopreneur-ai-training-cost-estimator',
    file: 'src/engines/ai-cost/ai-training-cost-estimator.ts',
    providerKeys: ['H200-141GB', 'H100-80GB', 'A100-80GB', 'L40S-48GB', 'RTX-6000'],
  },
] as const;

/**
 * 白名单：FAQ 里**保留手写**的金额 —— 数据集推导不出来。
 * 每条都写明「数据集为什么不拥有它」。
 */
const ALLOWED_RAW_PRICES: Array<{ slug: string; snippets: string[]; reason: string }> = [
  {
    slug: 'solopreneur-ai-image-cost-calculator',
    snippets: ['Together AI'],
    reason: '数据集的 image.providers 只有 7 家，没有 Together AI ⇒ 没有可派生的单价',
  },
  {
    slug: 'solopreneur-ai-image-cost-calculator',
    snippets: ['Stability AI'],
    reason: '数据集没有 Stability AI 直连这一档 ⇒ 没有可派生的单价',
  },
  {
    slug: 'solopreneur-ai-image-cost-calculator',
    snippets: ['FLUX schnell'],
    reason: '数据集只有 flux-pro，没有 schnell 这个变体的单价 ⇒ 没有可派生的单价',
  },
  {
    slug: 'solopreneur-ai-image-cost-calculator',
    snippets: ['Stock photos: $0.10-5/image'],
    reason: '图库照片是市场形态（不是 AI 生成定价）⇒ 数据集不拥有它',
  },
];

/** 引擎源里 faq: [...] 的 {q, a} 条目 */
const FAQ_ENTRY_RE =
  /\{\s*q:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*,\s*a:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*,?\s*\}/g;

function unescapeTs(s: string): string {
  return s.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

function readEngineFaq(file: string): Array<{ q: string; a: string }> {
  const src = readFileSync(resolve(root, file), 'utf-8');
  const howIdx = src.indexOf('\n  howToUse:');
  assert.ok(howIdx > 0, `${file}: cannot find howToUse: marker`);
  const start = src.lastIndexOf('  faq: [', howIdx);
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
  return JSON.parse(readFileSync(resolve(root, 'src/i18n/locales', `${locale}.json`), 'utf-8')) as Record<string, string>;
}

/**
 * 每种 token 的**解析结果**期望值（独立写死的字面量）。
 *
 * 这张表同时被两条断言用：
 *   · 实现侧 —— 每一种 token 都真的能被 `resolveLiveTokens` 解析出这个结果
 *   · 使用侧 —— FAQ 文本里用到的每一种 token 都必须在这张表里
 *              （反向：文本里出现一个没实现的 token ⇒ 它会原样印到线上）
 */
const TOKEN_EXPECTATIONS: Array<[string, string]> = [
  ['{{liveImagePerImage:dalle-3}}', '$0.080'],
  ['{{liveImagePerImageTrim:dalle-3}}', '$0.08'],
  ['{{liveImageSubRange:midjourney-v7}}', '$10-$120/mo'],
  ['{{liveImageSubTier:midjourney-v7|1}}', '$30'],
  ['{{liveImageMonthly:stable-diffusion-4|1000}}', '$3.00'],
  // —— P164 补齐的 3 种 ——
  // ⚠️ 这 3 种在 src/lib/live-price.ts 里**早就实现了**，是这张表漏了它们。
  //    漏项的后果不是「token 没实现」，而是**更隐蔽的**：守卫的「反向检查」
  //    （FAQ 里用到的 kind 必须在表里）会把它们判成「未实现的 token」⇒
  //    谁想把它们放进 FAQ 答案都会被守卫挡住，只能躲进**问句**（问句不被扫）。
  //    ⇒ 于是「画质倍率要加价」这句话被塞进标题、正文却不回答它。
  //    补齐这张表 + 加一条「表必须与实现同集合」的结构断言（见下）才能根治。
  ['{{liveImageAdvMult:hd}}', '1.3'],
  ['{{liveImageCheapest:stable-diffusion-4}}', 'SD 4 (API)'],
  ['{{liveTrainingDataProcess}}', '$1.50'],
  ['{{liveTrainingGpuRate:A100-80GB}}', '$1.50'],
  ['{{liveTrainingGpuName:A100-80GB}}', 'A100 80GB'],
  ['{{liveTrainingStorage}}', '$0.10'],
  ['{{liveTrainingStorageFor:100}}', '$10.00'],
  ['{{liveTrainingGpuCost:H100-80GB|4|4}}', '$40.00'],
  ['{{liveTrainingFullFtMult}}', '3'],
  ['{{liveTrainingSpotOff}}', '30-60'],
  ['{{liveTrainingReservedOff}}', '10-30'],
];

/** FAQ 文本里出现的 image / training token 的 kind（`{{liveImagePerImage:xxx}}` → `liveImagePerImage`） */
function tokenKind(token: string): string {
  const colon = token.indexOf(':');
  const brace = token.indexOf('}}');
  const end = colon > 0 && brace > colon ? colon : brace;
  return token.slice(2, end);
}

test('图片 / 训练两个引擎的 FAQ 里不出现手写单价（白名单除外）', () => {
  for (const e of ENGINES) {
    for (const { a } of readEngineFaq(e.file)) {
      // 白名单锚点所在的条目整条豁免（那些条目里的金额都被数据集排除在外）
      const allowed = ALLOWED_RAW_PRICES.filter((x) => x.slug === e.slug).filter((x) => x.snippets.some((s) => a.includes(s)));
      if (allowed.length > 0) continue;
      const hits = a.match(/\$\s?\d+(?:\.\d+)?/g) ?? [];
      assert.deepEqual(hits, [], `${e.slug}: FAQ 里还有手写金额 ${JSON.stringify(hits)} ⇒ 全部要派生成 token`);
    }
  }
});

test('token 引用的 provider / gpuKey 在数据集里都存在', () => {
  const imageProv: any = (PRICING as any).image.providers;
  const trainGpu: any = (PRICING as any).training.gpuTypes;
  const re = /\{\{(liveImagePerImage|liveImagePerImageTrim|liveImageSubRange|liveImageSubTier|liveImageMonthly|liveTrainingGpuRate|liveTrainingGpuName|liveTrainingGpuCost):([^{}]+)\}\}/g;
  for (const e of ENGINES) {
    for (const { a } of readEngineFaq(e.file)) {
      for (const m of a.matchAll(re)) {
        const kind = m[1]!;
        const payload = m[2]!;
        const key = payload.split('|')[0]!;
        if (kind.startsWith('liveTraining')) {
          assert.ok(trainGpu[key], `${e.slug}: training GPU 不存在 ${key}`);
        } else {
          assert.ok(imageProv[key], `${e.slug}: image provider 不存在 ${key}`);
        }
      }
    }
  }
});

test('三处同步：引擎源 / en.json / zh.json 的 FAQ 条数一致且 token 形态一致', () => {
  const en = readLocale('en');
  const zh = readLocale('zh');
  for (const e of ENGINES) {
    const entries = readEngineFaq(e.file);
    for (let i = 0; i < entries.length; i++) {
      const enA = en[`tools.${e.slug}.faq.${i}.a`];
      const zhA = zh[`tools.${e.slug}.faq.${i}.a`];
      assert.ok(typeof enA === 'string' && enA.length > 0, `${e.slug}.faq.${i}.a 在 en.json 缺失`);
      assert.ok(typeof zhA === 'string' && zhA.length > 0, `${e.slug}.faq.${i}.a 在 zh.json 缺失`);
      // 引擎源里有 token 的条目，i18n 两侧也必须有 token
      // （否则 zh 页面会显示原始 token 或英文原文）
      const srcTok = entries[i]!.a.match(/\{\{live[A-Za-z]+\b[^}]*\}\}/g) ?? [];
      for (const t of srcTok) {
        assert.ok(enA.includes(t), `${e.slug}.faq.${i}.a 在 en.json 缺 token ${t}`);
        assert.ok(zhA.includes(t), `${e.slug}.faq.${i}.a 在 zh.json 缺 token ${t}`);
      }
    }
  }
});

test('token 数量有下限（不靠删价格钻空子）', () => {
  // ⚠️ 下限 = 2026-11-02 的**实测值**（图片 27 / 训练 35）——
  //    故意与实测值取齐 ⇒ 删掉任何一个 token 都会红。
  //    「删价格」是绕过「手写单价」检查最省事的办法，这条下限就是它的封条。
  //    （P164 上调：3 种 token 从问句搬回答案 + 训练 FAQ2 的 8 个 GPU 显示名派生化。）
  const expectations = [
    { file: 'src/engines/ai-cost/ai-image-generation-cost-calculator.ts', min: 27 },
    { file: 'src/engines/ai-cost/ai-training-cost-estimator.ts', min: 35 },
  ];
  for (const { file, min } of expectations) {
    let n = 0;
    for (const { a } of readEngineFaq(file)) {
      n += (a.match(/\{\{live[A-Za-z]+\b[^}]*\}\}/g) ?? []).length;
    }
    assert.ok(n >= min, `${file}: FAQ 里只有 ${n} 个 token（下限 ${min}）⇒ 可能在靠删价格钻空子`);
  }
});

test('每种 token 都真的被实现了（不只是列在清单里）', () => {
  for (const [token, expected] of TOKEN_EXPECTATIONS) {
    assert.equal(resolveLiveTokens(token), expected, `token ${token} 解析结果不对`);
  }
});

test('这张表必须与实现同集合（防止「实现了但没进表」的漏项再次发生）', () => {
  // 为什么需要这条
  // --------------
  // P164 实测：liveImageAdvMult / liveImageCheapest / liveTrainingDataProcess
  // 在 src/lib/live-price.ts 里**早就实现了**，但这张表里没有 ⇒
  // 「反向检查」把它们判成「未实现的 token」⇒ 谁把它们放进 FAQ **答案**都会被守卫挡住，
  // 只能躲进**问句**（问句不被扫 token kind）⇒ 于是「画质模式要加价」这句话
  // 被塞进标题、正文却不回答它（编辑不自洽，且没有任何守卫会红）。
  //
  // ⇒ 表必须是「实现侧 kind 集合」的**完整镜像**，而不是手工维护的子集。
  //   新增一种 token 而忘了进表 ⇒ 这条断言变红。
  const tabled = new Set(TOKEN_EXPECTATIONS.map(([token]) => tokenKind(token)));
  const implemented = new Set(IMAGE_TRAINING_TOKEN_KINDS);
  const missing = [...implemented].filter((k) => !tabled.has(k)).sort();
  const extra = [...tabled].filter((k) => !implemented.has(k)).sort();
  assert.deepEqual(
    missing,
    [],
    `这些 image/training token 已在 src/lib/live-price.ts 实现，却没进 TOKEN_EXPECTATIONS：` +
      `${missing.join(', ')}\n` +
      `⇒ 守卫会把它们误判成「未实现的 token」⇒ 谁用它们进 FAQ 答案都会被挡，只能躲进问句。`,
  );
  assert.deepEqual(
    extra,
    [],
    `TOKEN_EXPECTATIONS 里有实现侧不存在的 kind：${extra.join(', ')} ⇒ 表已经腐烂（token 被删了？）`,
  );
});

test('FAQ 文本里用到的每一种 token 都必须已被实现（反向：未实现的 token 会原样印到线上）', () => {
  const implemented = new Set(TOKEN_EXPECTATIONS.map(([token]) => tokenKind(token)));
  const used = new Set<string>();
  for (const e of ENGINES) {
    for (const { a } of readEngineFaq(e.file)) {
      for (const t of a.match(/\{\{live(?:Image|Training)[A-Za-z]*\b[^}]*\}\}/g) ?? []) {
        used.add(tokenKind(t));
      }
    }
  }
  const unknown = [...used].filter((k) => !implemented.has(k)).sort();
  assert.deepEqual(
    unknown,
    [],
    `FAQ 里用了没实现的 token kind：${unknown.join(', ')} ⇒ 它会原样印到线上（用户看到 {{live...}}）`,
  );
});

test('白名单不腐烂：每条白名单必须仍在文本里出现', () => {
  for (const e of ENGINES) {
    const all = readEngineFaq(e.file).map((x) => x.a).join('\n');
    for (const a of ALLOWED_RAW_PRICES.filter((x) => x.slug === e.slug)) {
      for (const s of a.snippets) {
        assert.ok(all.includes(s), `${e.slug}: 白名单锚点 "${s}" 已不在文本里 ⇒ 白名单该删`);
      }
    }
  }
});

test('FAQ 渲染后不含未解析的 token（构建期不会把 {{live...}} 发到线上）', () => {
  for (const e of ENGINES) {
    for (const { a } of readEngineFaq(e.file)) {
      const resolved = resolveLiveTokens(a);
      assert.ok(!resolved.includes('{{'), `${e.slug}: 渲染后仍有未解析 token => ${resolved.slice(0, 120)}`);
    }
  }
});

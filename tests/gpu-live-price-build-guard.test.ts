#!/usr/bin/env node
// P161 — GPU 主题页与工具页 prose 的价格单一真相源守卫（build-dep）。
//
// 为什么需要 build-dep 版本
// -----------------------
// source-only 守卫能证明「内容写对了」，但证明不了「**产物**里是对的」：
//
//   1. **模板没接解析器** —— 源码里的 token 写得再对，页面也会把
//      `{{liveGpuRate:aws|H100}}` 原样印出去（这正是 P158/P160 踩过的坑）。
//   2. **解析器算错** —— 例如把 `rates` 又乘了一次 1e6，页面会安静地
//      显示一个错得离谱的数字。
//   3. **旧价格必须消失** —— P161 修掉的正是那批已经漂移的价格；产物里
//      还留着它们，就说明页面没真正走到新数据上。
//
// 本守卫盯住：
//   · 全站 dist 没有未解析的 {{liveGpu*}} token；
//   · GPU 主题页（en + zh，guide + benchmark）渲染出**派生后**的真实价格；
//   · 工具页（en + zh）渲染出 prose 里派生后的价格；
//   · P161 修掉的那批过期价格串在对应产物里已经消失。
//
// ⚠️ 期望值全部是本文件里**独立写死**的字面量，不是从被测模块导出的常量。
//
// Build dependency: yes — 需要 `pnpm build` 的产物（RUN_BUILD_TESTS=1）。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { TOPICS } from '../src/data/topics.ts';
import { categories } from '../src/data/categories.ts';

const root = resolve(import.meta.dirname, '..');

if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const GPU_TOPIC = 'gpu-cloud-cost-optimization';
const GPU_TOOL = 'solopreneur-gpu-cloud-cost-calculator';

const category = categories.find((c) => TOPICS.find((t) => t.id === GPU_TOPIC)?.letterId === c.id)!;
const letterSlug = category.slug;

function listHtml(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) listHtml(full, out);
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

function pagePath(lang: string, ...rest: string[]): string {
  return resolve(root, 'dist', lang, ...rest, 'index.html');
}

// ---------------------------------------------------------------------------
// 1. 产物里没有未解析的 token
// ---------------------------------------------------------------------------

test('P161: dist carries no unresolved {{liveGpu*}} token', () => {
  const files = listHtml(resolve(root, 'dist'));
  assert.ok(files.length > 0, 'dist/ has no HTML — run the build first');
  const violations: string[] = [];
  for (const file of files) {
    const html = readFileSync(file, 'utf-8');
    if (html.includes('{{liveGpu')) {
      violations.push(file.replace(root, '').split('\\').join('/'));
    }
  }
  assert.deepEqual(
    violations,
    [],
    `these built pages still contain a raw {{liveGpu*}} token:\n  ${violations.slice(0, 10).join('\n  ')}`,
  );
});

// ---------------------------------------------------------------------------
// 2. GPU 主题页渲染出派生后的真实价格
// ---------------------------------------------------------------------------

test('P161: the GPU topic pages publish the derived prices', () => {
  // 期望值独立写死（照数据集手算）：
  //   H100 按需区间 = Vast.ai $1.69 ~ GCP $4.20
  //   A100 按需区间 = Vast.ai $0.69 ~ AWS $3.50
  //   现货折扣区间 = 30-60%（AWS 0.4 倍 ⇒ 低 60%）
  //   预留折扣区间 = 10-30%（AWS 0.7 倍 ⇒ 低 30%）
  //   4×H100 24/7 月账单区间 = $4,867.20 ~ $12,096.00
  const mustContain = ['$1.69-$4.20', '$0.69-$3.50', '30-60%', '10-30%', '$4,867.20'];
  const violations: string[] = [];
  for (const lang of ['en', 'zh'] as const) {
    for (const variant of ['guide', 'benchmark'] as const) {
      const path = pagePath(lang, letterSlug, `${GPU_TOPIC}-${variant}`);
      assert.ok(existsSync(path), `missing built page: ${path}`);
      const html = readFileSync(path, 'utf-8');
      for (const needle of mustContain) {
        if (!html.includes(needle)) violations.push(`${lang}/${variant}: missing "${needle}"`);
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    `the built GPU topic pages do not publish the derived prices:\n  ${violations.join('\n  ')}`,
  );
});

// ---------------------------------------------------------------------------
// 3. 工具页 prose 渲染出派生后的价格
// ---------------------------------------------------------------------------

test('P161: the GPU tool page prose publishes the derived prices', () => {
  // 期望值独立写死：
  //   工具页表格里 Lambda Labs 的 H100 = $2.49 / A100 = $1.10 / L40S = $0.80
  //   预留档折扣 = 低 10%（Lambda reservedMult 0.9）
  //   案例走读：预留档有效费率 $0.99/hr（zh 写 $0.99/小时），月度 GPU 费 $2,851.20
  const perLang: Record<string, string[]> = {
    en: ['$2.49', '$1.10', '$0.80', '$0.99/hr', '$2,851.20'],
    zh: ['$2.49', '$1.10', '$0.80', '$0.99/小时', '$2,851.20'],
  };
  const violations: string[] = [];
  for (const lang of ['en', 'zh'] as const) {
    const path = pagePath(lang, GPU_TOOL);
    assert.ok(existsSync(path), `missing built page: ${path}`);
    const html = readFileSync(path, 'utf-8');
    for (const needle of perLang[lang]!) {
      if (!html.includes(needle)) violations.push(`${lang}: missing "${needle}"`);
    }
  }
  assert.deepEqual(
    violations,
    [],
    `the built GPU tool page does not publish the derived prices:\n  ${violations.join('\n  ')}`,
  );
});

// ---------------------------------------------------------------------------
// 4. P161 修掉的过期价格串必须消失
// ---------------------------------------------------------------------------

test('P161: the stale GPU price strings are gone from the built pages', () => {
  // 这些是 P161 修掉的**手写**价格（来自主题页 / 工具页 prose 的旧文本）。
  //
  // ⚠️ 必须**分作用域**：
  //   · "$30,000" 也在引擎 FAQ 里（H100 硬件购置价，calc 层，本批未纳入）；
  //   · "Compare all 7 providers" / "50-70% off" 属于**图片**成本工具
  //     （数据集 image 段确实有 7 家），不是 GPU 的过期串。
  //   ⇒ 主题页与工具页各查各的，整站查会误伤别的工具。
  const stale: Array<{ needle: string; scope: 'topic' | 'tool' }> = [
    { needle: '$2.49-$12.40/hr', scope: 'topic' }, // 旧 H100 区间
    { needle: '$1.29 - $4.10/hr', scope: 'topic' }, // 旧 A100 行
    { needle: '$2.79 - $13.40/hr', scope: 'topic' }, // 旧 H200 行
    { needle: '$0.50 - $1.80/hr', scope: 'topic' }, // 旧 L4/RTX4090/A6000 行
    { needle: '$9,400', scope: 'topic' }, // 旧 4×H100 月账单下界
    { needle: '$30,000', scope: 'topic' }, // 旧 4×H100 月账单上界
    { needle: 'range across 7 providers', scope: 'topic' }, // 旧行标题
    { needle: 'Compare all 7 providers', scope: 'topic' }, // 旧 howToApply
    { needle: 'across the 7 providers', scope: 'topic' }, // 旧 howToUse
    { needle: '50-70% off', scope: 'topic' }, // 旧主题页现货折扣区间
    { needle: '30-60% off on-demand across all providers', scope: 'topic' }, // 旧主题页预留折扣说法
    { needle: '40-60% off', scope: 'tool' }, // 旧工具页现货折扣区间
    { needle: '15-30% off', scope: 'tool' }, // 旧工具页预留折扣区间
  ];
  const violations: string[] = [];
  for (const lang of ['en', 'zh'] as const) {
    const targets: Array<[string, string]> = [
      [`${lang}/guide`, pagePath(lang, letterSlug, `${GPU_TOPIC}-guide`)],
      [`${lang}/benchmark`, pagePath(lang, letterSlug, `${GPU_TOPIC}-benchmark`)],
      [`${lang}/tool`, pagePath(lang, GPU_TOOL)],
    ];
    for (const [label, file] of targets) {
      if (!existsSync(file)) continue;
      const html = readFileSync(file, 'utf-8');
      const scope: 'topic' | 'tool' = label.endsWith('/tool') ? 'tool' : 'topic';
      for (const { needle, scope: needleScope } of stale) {
        if (needleScope !== scope) continue;
        if (html.includes(needle)) {
          violations.push(`${label}: still contains "${needle}"`);
        }
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    `stale GPU prices are still published:\n  ${violations.join('\n  ')}`,
  );
});

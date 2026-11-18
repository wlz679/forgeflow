#!/usr/bin/env node
// P168 B3-10 —— **线上复验**（生产侧 · 随机 cache-buster · 用户可见层）。
//
// ⭐ 测的是**生产环境**上真正的三个不变量：
//   ① **部署生效**：线上 HTML 里的 @BT@clientConfig.customFn@BT@ 与**本地已提交**的那份**逐字节相同**
//      ⇒ 本地在 2,054 组输入上验过的「服务端 ≡ 客户端」，**原样搬到生产**。
//   ② **生产侧服务端 ≡ 客户端**：线上那份 customFn 跑出来的输出 == 本地服务端 generate() 的输出。
//   ③ **契约**：客户端返回**单元素数组**（G15）+ **动态卡片不比静态卡片更英文**。
//
// ⚠️ 为什么**不**直接比「静态卡片文本 == 动态卡片文本」：
//   · 静态卡片是 codegen 生成的**冻结样例** ⇒ codegen **故意剥掉**「📅 Pricing last updated:」
//     那行（UI 徽章负责显示）⇒ 文本必然不同；
//   · 冻结样例里带 @BT@new Date()@BT@ 派生的**里程碑日期** ⇒ 天生会过期（实测 mrr：静态 Sep 2026 / 动态 Jan 2027）；
//   ⇒ 拿它当判据 = **测错了**，不是「坏了」。
//   ⇒ 改成比「**整行英文的行数**」—— 动态卡片**不得比**静态卡片更英文。
//
// ⚠️ 必须带**随机 cache-buster** ⇒ CDN 边缘缓存会让你误判「没部署」（B3-6 实测过）。
//
// 用法（必须从仓库根跑）：node --import tsx tests/scripts/p168-b310-online-check.ts

import '../../src/engines/index.ts';
import { getEngine, getAllEngines } from '../../src/core/engines/registry.ts';
import { renderCalcOutput } from '../../src/lib/calc-output-i18n.ts';
import { codegenDefaults, browserPick, browserFill } from './p168-server-client-parity.ts';

const BASE = 'https://forgeflowkit.com';
const CB = String(Date.now());
/** ⭐ 清单从**注册表**取 ⇒ 不会写出不存在的 slug（实测手写清单里有一个 404） */
const WANTED = [
  'renewal-rate', 'claude-api-cost', 'openai-token', 'gemini-api-cost',
  'deepseek-api-cost', 'ai-api-cost-comparison', 'ai-training-cost',
  'gpu-cloud-cost', 'ai-image-generation', 'mrr-calculator', 'ltv-calculator',
  'csat-calculator', 'nrr-calculator', 'grr-calculator', 'compound-interest',
  'saas-valuation', 'quota-attainment', 'logo-churn-rate', 'coupon-attribution',
  'burn-rate', 'churn-rate',
];
const ALL = getAllEngines() as any[];
const SLUGS = ALL
  .filter((e) => WANTED.some((w) => e.slug.includes(w)))
  .map((e) => e.slug as string)
  .sort();
const D = codegenDefaults();

function unescapeHtml(s: string): string {
  return s.replace(/&#34;/g, '"').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** 取属性的全部取值（@BT@staticExamples@BT@ 是数组 ⇒ 页面渲染成多张卡 ⇒ 不能只取第一个） */
function attrs(html: string, name: string): string[] {
  const key = name + '="';
  const out: string[] = [];
  let idx = 0;
  for (;;) {
    const i = html.indexOf(key, idx);
    if (i < 0) break;
    const start = i + key.length;
    let end = start;
    while (end < html.length && html[end] !== '"') end++;
    out.push(unescapeHtml(html.slice(start, end)));
    idx = end + 1;
  }
  return out;
}

function extractClientConfig(html: string): { customFn?: string } | null {
  const marker = 'const clientConfig = ';
  const idx = html.indexOf(marker);
  if (idx < 0) return null;
  const start = idx + marker.length;
  const quote = html[start];
  if (quote !== '"' && quote !== "'") return null;
  let i = start + 1;
  for (; i < html.length; i++) {
    const ch = html[i]!;
    if (ch === '\\') { i++; continue; }
    if (ch === quote) break;
  }
  if (i >= html.length) return null;
  try {
    const first = JSON.parse(html.slice(start, i + 1));
    const cfg = typeof first === 'string' ? JSON.parse(first) : first;
    return cfg as { customFn?: string };
  } catch {
    return null;
  }
}

/**
 * zh 侧「整行英文」判据（G4c 同款）：CJK ≤ 2 且英文词 ≥ 3。
 *
 * ⚠️ **排除「📅 Pricing last updated:」那一行** —— codegen **故意**把它从冻结样例里剥掉
 *   （「UI badge covers it」）⇒ 静态卡片天生没有这一行、动态卡片有 ⇒ 把它算进去
 *   ⇒ 动态卡片永远比静态卡片「多一行英文」⇒ 假红。
 */
function isWholeEnglishLine(line: string): boolean {
  if (line.trimStart().startsWith('📅 Pricing last updated:')) return false;
  const cjk = (line.match(/[\u4e00-\u9fff]/g) || []).length;
  const words = (line.match(/[A-Za-z][A-Za-z'-]*/g) || []).length;
  return cjk <= 2 && words >= 3;
}

async function fetchWithRetry(url: string): Promise<string> {
  let lastErr = '';
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'ffk-b310-online-check' } });
      if (!res.ok) lastErr = 'HTTP ' + res.status;
      else return await res.text();
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
    await new Promise((r) => setTimeout(r, 1200 * attempt));
  }
  throw new Error('fetch failed: ' + lastErr);
}

async function main(): Promise<void> {
  let bad = 0;
  for (const slug of SLUGS) {
    const url = BASE + '/zh/' + slug + '/?cb=' + CB + '&t=' + Math.random().toString(36).slice(2);
    const html = await fetchWithRetry(url);
    const marker = html.includes('FFK-SERVER-DERIVED:start');
    const oldMirror = html.includes('cnn(Number(inputs.arrUpForRenewal)');
    const cfg = extractClientConfig(html);
    const local: any = getEngine(slug);
    const localFn = local.clientConfig.customFn as string;
    const deployedSame = !!cfg && cfg.customFn === localFn;
    const inputs = D[slug] ?? {};
    const serverOut = (local.generate as any)(inputs);
    const serverText = Array.isArray(serverOut) ? serverOut.join('\n') : String(serverOut);
    let dynText = '';
    let single = false;
    let err = '';
    try {
      const fn = new Function('inputs', 'pick', 'fill', cfg!.customFn!) as any;
      const o = fn(inputs, browserPick, browserFill);
      single = Array.isArray(o) && o.length === 1;
      dynText = Array.isArray(o) ? o.join('\n') : String(o);
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    }
    const parity = dynText === serverText;
    // ⚠️ 静态基线取**本地 staticExamples[0]**（= 线上那一张）：
    //   从线上 HTML 里挖 @BT@data-calc-output-raw@BT@ 不可靠 —— 有的页面根本不吐这个属性
    //   （实测 openai 页挖到的不是完整输出 ⇒ 基线变成「0 行英文」⇒ 假绿）。
    //   ⇒ 而线上的静态卡片就是**已提交的那份** staticExamples[0]（部署一致性已由 ① 证明）。
    const tRaw = attrs(html, 'data-calc-output-templates')[0];
    let templates: Record<string, string> = {};
    try { templates = tRaw ? JSON.parse(tRaw) : {}; } catch { templates = {}; }
    const staticText = renderCalcOutput((local.staticExamples ?? [])[0] ?? '', templates);
    const enStatic = staticText.split('\n').filter(isWholeEnglishLine).length;
    const enDyn = renderCalcOutput(dynText, templates).split('\n').filter(isWholeEnglishLine).length;
    // 动态卡片**不得比**静态卡片更英文
    const enOk = enDyn <= enStatic;
    const ok = marker && !oldMirror && deployedSame && parity && single && enOk && err === '';
    if (!ok) bad++;
    console.log((ok ? 'OK   ' : 'BAD  ') + slug + ' · 标记=' + marker + ' · 旧镜像=' + oldMirror + ' · 部署一致=' + deployedSame + ' · 生产≡服务端=' + parity + ' · 单元素=' + single + ' · 整行英文(静态/动态)=' + enStatic + '/' + enDyn + (err ? ' · error=' + err : ''));
    if (!parity && err === '') {
      const a = serverText.split('\n'); const b = dynText.split('\n');
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i] !== b[i]) { console.log('   差异行 ' + (i+1) + ' · 服务端: ' + JSON.stringify((a[i]??'<none>').slice(0,100)) + ' · 客户端: ' + JSON.stringify((b[i]??'<none>').slice(0,100))); break; }
      }
    }
  }
  console.log('线上复验：' + (SLUGS.length - bad) + '/' + SLUGS.length + ' 通过');
  process.exit(bad === 0 ? 0 : 1);
}

main();
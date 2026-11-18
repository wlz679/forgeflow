#!/usr/bin/env node
// P168 B3-9 —— G16 守卫：**「标签: 内容」切分不得劈开 token**，且**必须还原**（source-only）。
//
// ⭐ 为什么需要它（2026-11-17 B3-9 浏览器层实测抓到）
//   `beautifySections` 的 BIZ_V3 分支用 `/^([^:]+):\s*(.*)$/` 把一行拆成「标签 + 内容」；
//   而 token 的 **params 组是 JSON**（`{"gain":"$50,000"}`）⇒ **JSON 里有冒号**
//   ⇒ 切分会劈进 token 内部 ⇒ 客户端拿到半截 token ⇒ params 解析失败
//   ⇒ 模板里的 `{gain}` 留成字面量 + JSON 碎片裸露到 zh 页上（= 整行英文）。
//
// ⭐⭐ 为什么判据落在**共享实现的返回值**上（而不是扫源码文本）
//   B3-9 实测踩了两次坑，两次都是「实现存在但没用对」：
//     ① 页面用**内联副本**的遮蔽算法，而 lib 里的 `maskCalcOutputTokens` **导出但从未 import**
//        ⇒ 两份实现漂移、无守卫；
//     ② emoji-led 分支的 content 取自**遮蔽后**的文本却**从不 restore**
//        ⇒ 用户看到 `\u0001N\u0001` 控制字符 + 正文整段丢失。
//   ⇒ 「扫源码找冒号」只能证明「某处没有冒号」，**结构上证明不了「切分后 token 完整」**。
//   ⇒ 判据必须是：**喂一行含 token 的文本进共享实现 ⇒ 出来的 label+content 必须原样含完整 token**。
//
// ⭐ 配套断言（防漂移）：页面**必须**用共享实现，**不得**再内联第二份遮蔽算法
//   —— 这是「同一个不变量只守一处」：不变量在共享实现里，页面只是调用方。
//
// ⚠️ 「SSR 层绿」≠「用户所见绿」—— 这个缺陷在 SSR 产物里**完全看不出来**
//   （SSR 渲染的是 en 兜底，结构正常）⇒ 只有浏览器层能抓到
//   ⇒ 浏览器层由 tests/scripts/p168-browser-verify.ts 兜。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { splitCalcOutputV3Line } from '../src/lib/calc-output-i18n.ts';
import { TOKENIZED } from './scripts/p168-tokenized-engines.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const NL = String.fromCharCode(10);

/** token 正则（与服务端同一份协议） */
const TOKEN_RE = /\$([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)(\{[^{}]*\})?(?:\|((?:(?!\$[a-z])[^|\n\r])*)\|)?/g;

/** 一行里出现的全部 token 原文（按出现顺序） */
function tokensIn(line: string): string[] {
  const re = new RegExp(TOKEN_RE.source, 'g');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) out.push(m[0]);
  return out;
}

test('G16-a: 共享切分实现不得劈开 token（params 组含冒号也必须完整）', () => {
  // ⭐ 这行是**实测抓到的真实形态**：params 是 JSON ⇒ JSON 里有冒号 ⇒
  //   「按第一个冒号切标签」的启发式会劈进 token 内部。
  const line = '📊 Snapshot: $calc_out.ltv_by_channel.row.gain{"gain":"$50,000"}|Gain: $50,000|';
  const r = splitCalcOutputV3Line(line);
  assert.ok(r, '这一行必须能切出「标签: 内容」');
  assert.equal(r.kind, 'emoji');
  const merged = r.icon + ' ' + r.label + r.content;
  const want = tokensIn(line);
  assert.ok(want.length > 0, '样本行必须含 token（否则本断言是空跑）');
  for (const t of want) {
    assert.ok(merged.includes(t), 'token 被切开了：' + JSON.stringify(t) + ' → ' + JSON.stringify(merged));
  }
});

test('G16-b: 切分结果必须已还原（不得残留 \u0001 占位符）', () => {
  const cases = [
    '📊 Snapshot: $calc_out.x.row.gain{"gain":"$50,000"}|Gain: $50,000|',
    '🔄 What-If: $calc_out.x.row.save{"save":"$10"}|Save $10|',
    'Snapshot: $calc_out.x.row.gain{"gain":"$50,000"}|Gain: $50,000|',
  ];
  for (const line of cases) {
    const r = splitCalcOutputV3Line(line);
    assert.ok(r, '切分失败：' + line);
    const merged = r.icon + r.label + r.content;
    assert.ok(merged.indexOf(String.fromCharCode(1)) < 0, '残留占位符控制字符：' + JSON.stringify(merged));
    assert.ok(merged.indexOf(String.fromCharCode(1) + '0' + String.fromCharCode(1)) < 0, '残留占位符：' + JSON.stringify(merged));
    for (const t of tokensIn(line)) {
      assert.ok(merged.includes(t), 'token 被切碎：' + JSON.stringify(t));
    }
  }
});

test('G16-c: 真实引擎输出行 —— 切分后 token 原文必须完整存在', () => {
  let scannedLines = 0;
  let scannedTokens = 0;
  const problems: string[] = [];
  for (const e of TOKENIZED) {
    const src = readFileSync(resolve(ROOT, e.file), 'utf8');
    // 静态示例里的 token 形态：$code{json}|fallback|
    const re = new RegExp(TOKEN_RE.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      scannedTokens++;
      const tok = m[0];
      // 用「token 单独成行」与「token 前带标签」两种形态各试一次
      const samples = [tok, 'Snapshot: ' + tok, '📊 Snapshot: ' + tok];
      for (const line of samples) {
        scannedLines++;
        const r = splitCalcOutputV3Line(line);
        if (!r) continue;
        const merged = r.icon + r.label + r.content;
        if (!merged.includes(tok)) {
          problems.push(e.alias + '：token 被劈开 → ' + JSON.stringify(line.slice(0, 90)));
        }
        if (merged.indexOf(String.fromCharCode(1)) >= 0) {
          problems.push(e.alias + '：残留占位符 → ' + JSON.stringify(merged.slice(0, 90)));
        }
      }
    }
  }
  // ⭐ 前置断言：判据必须真的扫到了东西 ⇒ 不许真空绿
  assert.ok(scannedTokens > 500, '扫描到的 token 太少（' + scannedTokens + '）⇒ 判据可能空跑');
  assert.ok(scannedLines > 1500, '扫描到的行太少（' + scannedLines + '）⇒ 判据可能空跑');
  assert.deepEqual(problems, [], problems.slice(0, 20).join(NL));
});

test('G16-d: 页面必须用共享实现，不得再内联第二份遮蔽/切分算法', () => {
  const page = readFileSync(resolve(ROOT, 'src/pages/[lang]/[slug].astro'), 'utf8');
  assert.ok(
    page.indexOf('CALC_OUTPUT_SPLIT_V3_LINE_JS') >= 0,
    '页面必须 import 共享实现 CALC_OUTPUT_SPLIT_V3_LINE_JS',
  );
  assert.ok(
    page.indexOf('splitCalcOutputV3Line(v3l)') >= 0,
    '页面的 BIZ_V3 分支必须调用共享的 splitCalcOutputV3Line',
  );
  // ⭐ 内联副本的指纹：遮蔽占位符的构造 + 恢复用的正则
  assert.ok(
    page.indexOf('function maskTokens') < 0,
    '页面不得再内联 maskTokens（会与共享实现漂移）',
  );
  assert.ok(
    page.indexOf('v3mask') < 0,
    '页面不得再出现 v3mask（遮蔽后未还原 = B3-9 实测抓到的第二个缺陷）',
  );
});

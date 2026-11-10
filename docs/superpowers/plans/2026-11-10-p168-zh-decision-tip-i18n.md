# P168 —— zh 决策区块动态层「建议码 + locale 模板」实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 zh 页「🧭 算完之后」区块的**动态层**（针对你这组数字的下一步）显示中文 —— SSR 示例与客户端实时两条路径都生效；并建立「引擎建议码 ↔ locale 模板 ↔ 运行时探针」的三集合守恒守卫。

**Architecture:** 引擎不再把英文建议句子写进输出，改为输出**结构化建议码 + 参数**（`💡 Tip: {"code":"burn_high_burn","params":{}}`）。英文句子搬进 `src/i18n/locales/en.json`、中文写进 `zh.json`（沿用既有 `{param}` 占位符约定）。决策层解析出 code+params 后从 locale 取模板并插值；zh 缺键时 `translate()` 自动回退 en ⇒ 页面永不出现空块或裸 code。

**Tech Stack:** Astro 5 · TypeScript（strict）· 扁平 JSON locale（`src/i18n/locales/{en,zh}.json`）· `node:test`（tsx runner）· 变异台子（`tests/scripts/mutate-p168-*.mjs`）

## 命名说明（避免与既有批次编号混用）

本批**不是**规格 §19.24 批次表里的「B3-2（按分类铺）」或「B3-3（其余补齐）」，也不是 §19.27 的「B3-2（标题瘦身）」。本批在规格里落为 **§19.29**，计划文件名不带 B3 编号。

## Global Constraints

- 引擎层（`src/engines/**`）属 calc 层：**用户已于 2026-11-09 拍板授权**本批改动，范围仅限 4 个引擎的 💡 Tip 输出形态 + 其手写 customFn 镜像；**不得**顺手改任何计算逻辑、阈值或文案语义。
- `customFn` 是浏览器真正执行的那份，**不被任何脚本自动生成**（`scripts/codegen-customfn.mjs` 只处理 AI cost 引擎的数据表）⇒ 每个引擎必须**手改两处**：`calculate()` 与 `customFn` 里的镜像逻辑。
- `staticExamples[0]` 由 `node scripts/codegen-examples.mjs` 生成（把 `generate()` 的多行结果用 `\n` 连成一条）⇒ 改完引擎必须重跑生成器并把结果一起提交；`node scripts/codegen-examples.mjs --check` 必须 exit 0。
- locale 键命名：`decision_tip.<code>`（全局扁平键；code 自带工具前缀 `burn_` / `ltv_` / `gdpr_` / `cac_`）⇒ **en.json 与 zh.json 必须成对出现**。
- locale 模板的占位符用 `{param}`（既有约定），插值由 `fillTemplate` 做 `replaceAll`。
- 守卫规范（项目既有）：期望值独立写死字面量；一条变异只红一条断言；变异必须隔离；还原无条件执行 + sha256 逐字节校验。
- 实测/验收工具进 `tests/scripts/`，**文件名不能带 `.test.ts`**（`tests/build-dep-suites.mjs` 的 walkTestSuites 只收 `*.test.ts` / `*.test.mjs`）；脚本内 `src/` 相对路径按仓库根算，必须从仓库根跑。
- 文件须无 BOM、全 LF；Windows 上刚写过的文件会被系统索引独占（`UV_UNKNOWN(-4094)`）⇒ 写操作要重试（25×40ms）。
- commit 信息格式 `type(scope): 中文标题` + 正文含**实测数字**；**绝不能**含 `[CI Skip]` / `[Skip CI]` / `[CF-Pages-Skip]`。
- 完成代码改动后**先询问是否 commit / push**；push 前必须 `git fetch` + 确认 0 behind；禁止 force-push。
- 本批**不删任何页面**（GSC 92 天实测：zh 贡献 63.6% 点击 / CTR 是 en 的 2.59 倍）。
- 本批**只修决策区块动态层**；zh 页结果卡片整段英文（92 个业务引擎）**记为独立缺陷**，不在本批范围。
- 维度 3 scan 声明：本批**不含实时外部信号**（`web_search` 额度 402）⇒ 声明基于仓库内信号：4 个引擎的 Tip 分支穷举结果 + 既有 P168 决策层契约（i18n 键存在即激活）。

---

## File Structure

**新建**

| 文件 | 职责 |
|---|---|
| `src/lib/decision-tip-templates.ts` | **仅服务端**：读 locale 的 `decision_tip.*` 键，提供 `decisionTipTemplates(lang)` / `decisionTipTemplatesJson(lang)` / `renderDecisionTip(code, params, lang)` |
| `tests/decision-tip-i18n-guard.test.ts` | 本批主守卫：解析器自检 + 三集合守恒 + 译文质量 |
| `tests/_decision-tip-probe.ts` | 分支探针夹具：4 个引擎 × 18 个建议码的**实测**输入组合 |
| `tests/scripts/p168-decision-tip-probe.ts` | 可复算工具：跑探针，打印「引擎 → 观察到的建议码集合」，供人工核对与规格回填 |

**修改**

| 文件 | 改什么 |
|---|---|
| `src/lib/decision-support.ts` | 纯逻辑层：新增 `parseDecisionTip` / `fillTemplate`；`DecisionLines` 扩展 `tipCode` / `tipParams`。**绝不 import locale** |
| `src/components/DecisionSupport.astro` | SSR 用 locale 模板渲染示例建议；把当前 lang 的模板表注入 DOM 给客户端 |
| `src/scripts/decision-support.client.ts` | 客户端从注入的模板表渲染实时建议 |
| `src/pages/[lang]/[slug].astro` | 派给客户端的 `raw` 从 `results[0]` 改成 `results.join('\n')`（gdpr 的 Tip 在最后一个元素里） |
| `src/i18n/locales/en.json` / `zh.json` | 各 +18 个 `decision_tip.*` 键 |
| `src/engines/saas/burn-rate-calculator.ts` | 3 条 Tip 改建议码（+ customFn 镜像） |
| `src/engines/legal-compliance/gdpr-fine-calculator.ts` | 4 条 Tip 改建议码（+ customFn 镜像） |
| `src/engines/valuation/cac-calculator.ts` | 5 条 Tip 改建议码（+ customFn 镜像） |
| `src/engines/marketing/ltv-by-channel-calculator.ts` | 6 条 Tip 改建议码（+ customFn 镜像）；处置 1 条实测不可达的分支 |
| `tests/scripts/mutate-p168-decision-support.mjs` | 追加本批变异（守恒 / 译文 / 接线） |
| `tests/dead-i18n-keys-guard.test.ts` | `decision_tip.*` 是**动态键**，源码里查不到字面量 ⇒ 需加入白名单 |
| `docs/superpowers/specs/2026-10-27-p155-adsense-low-value-content-and-pricing-bot-diagnosis.md` | 新增 §19.29 |
| `docs/superpowers/plans/INDEX.md` | 登记本计划（Section 9 计数 40→41，总数 111→112） |
| `AGENTS.md` / `CHANGELOG.md` | 同步本批教训与变更 |

---

## 实测基线（本批的起点，全部已复算）

| 项 | 实测值 |
|---|---|
| 渲染决策区块的工具数 | **4**（burn-rate / ltv-by-channel / gdpr-fine / cac）——判定口径：`hasDecisionLines(staticExamples[0])` |
| 4 个引擎的 Tip 分支总数 | **19**（burn 3 + ltv 7 + gdpr 4 + cac 5） |
| 穷举扫描（ltv 1296 组渠道组合 + 其余三引擎网格）后**可达**分支 | **18**（ltv 的 `Add more channel data for comparison insights.` **一次都没出现 ⇒ 死分支**） |
| locale 里的 `decision_tip.*` 键数（改后） | **18**（en 18 + zh 18） |
| 带参数的分支 | **8**（gdpr 4×1 + cac 5×1 + ltv 2（4 参数 / 3 参数））；无参数 10 条 |
| locale 文件体积 | en **970KB** / zh **944KB** ⇒ **绝不能进客户端 bundle** |
| zh 动态层当前表现 | 静态 4 层中文 + 动态层**英文**（线上 `forgeflowkit.com/zh/solopreneur-burn-rate-calculator/` 已确认） |

> ⚠️ **本计划里所有探针输入都是实测出来的**（`tmp/sweep-tips.ts` 穷举 + `tmp/probe-gdpr.ts` 逐档验证），不是推测值。执行者**不要**改这些输入；要改先跑 `tests/scripts/p168-decision-tip-probe.ts` 复核。

---

### Task 1: 决策层纯逻辑 —— 建议码解析 + 模板插值

**Files:**
- Modify: `src/lib/decision-support.ts`
- Create: `tests/decision-tip-i18n-guard.test.ts`

**Interfaces:**
- Consumes: 无（本批第一个任务）
- Produces:
  - `export interface DecisionTip { code: string; params: Record<string, string> }`
  - `export function parseDecisionTip(tip: string): DecisionTip | null`
  - `export function fillTemplate(tmpl: string, params: Record<string, string>): string`
  - `DecisionLines` 扩展两个字段：`tipCode: string`（非结构化输出时为 `''`）、`tipParams: Record<string, string>`（非结构化输出时为 `{}`）
  - ⚠️ `tip` 字段语义**不变**（仍是 marker 之后的原文）⇒ `tests/decision-support-guard.test.ts` 的现有断言**不需要改**。

- [ ] **Step 1: 写失败测试**

创建 `tests/decision-tip-i18n-guard.test.ts`：

```ts
#!/usr/bin/env node
// P168 —— 决策建议「建议码 + locale 模板」的**主守卫**（批次：zh 动态层英文缺陷修复）。
//
// 本守卫守三条链：
//   ① 解析器：只认结构化 JSON，其它一律 null（不得「猜」）
//   ② 三集合守恒：引擎源码里的建议码 == locale 里的模板 == 探针跑出来的码
//   ③ 译文质量：zh 模板不是英文原文、不是占位、厚度达标、占位符对齐
//
// P153-G1: source-only guard —— 不需要 pnpm build。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  extractDecisionLines,
  fillTemplate,
  parseDecisionTip,
} from '../src/lib/decision-support.ts';

test('P168 建议码解析器：只认结构化 JSON，其它一律 null（不得「猜」）', () => {
  assert.deepEqual(parseDecisionTip('{"code":"burn_high_burn","params":{}}'), {
    code: 'burn_high_burn',
    params: {},
  });
  assert.deepEqual(
    parseDecisionTip('{"code":"ltv_strong_winner","params":{"winner":"Ch1","winnerRatio":"3.2"}}'),
    { code: 'ltv_strong_winner', params: { winner: 'Ch1', winnerRatio: '3.2' } },
  );
  // 旧式英文句子 ⇒ null
  assert.equal(parseDecisionTip('Team costs are typically 50-70% of gross burn.'), null);
  // JSON 但没有 code ⇒ null
  assert.equal(parseDecisionTip('{"params":{"a":"1"}}'), null);
  // code 不是字符串 ⇒ null
  assert.equal(parseDecisionTip('{"code":123,"params":{}}'), null);
  // 非法 JSON ⇒ null
  assert.equal(parseDecisionTip('{"code":'), null);
  // 数组 / 空 ⇒ null
  assert.equal(parseDecisionTip('[]'), null);
  assert.equal(parseDecisionTip(''), null);
});

test('P168 建议码解析器：参数值一律字符串化（避免 3.2 与 "3.2" 两种写法）', () => {
  const p = parseDecisionTip('{"code":"c","params":{"ratio":3.2,"n":2,"skip":null}}');
  assert.deepEqual(p, { code: 'c', params: { ratio: '3.2', n: '2' } });
});

test('P168 模板插值：{param} 全部出现都替换（与 translate-helper 同一口径）', () => {
  assert.equal(fillTemplate('Move {winner} to {loser}', { winner: 'Ch1', loser: 'Ch2' }), 'Move Ch1 to Ch2');
  // 同一个占位符出现两次 ⇒ 两处都替换
  assert.equal(fillTemplate('{winner} and {winner}', { winner: 'Ch1' }), 'Ch1 and Ch1');
  // 没有对应参数 ⇒ 占位符原样保留（不静默吞掉）
  assert.equal(fillTemplate('ratio {ratio}', {}), 'ratio {ratio}');
});

test('P168 提取器：结构化输出带上 tipCode / tipParams，旧式输出仍是空码', () => {
  const structured = extractDecisionLines('💡 Tip: {"code":"burn_high_burn","params":{}}');
  assert.equal(structured.tipCode, 'burn_high_burn');
  assert.deepEqual(structured.tipParams, {});
  const legacy = extractDecisionLines('💡 Tip: Team costs are typically 50-70% of gross burn.');
  assert.equal(legacy.tipCode, '');
  assert.deepEqual(legacy.tipParams, {});
  // ⭐ 向后兼容：tip 字段语义不变（marker 之后的原文）
  assert.equal(legacy.tip, 'Team costs are typically 50-70% of gross burn.');
});

test('P168 共享模块：不得 import locale（客户端 bundle 会被拖进 1.9MB）', () => {
  const src = readFileSync(resolve(process.cwd(), 'src/lib/decision-support.ts'), 'utf8');
  assert.doesNotMatch(src, /from '\.\.\/i18n/);
  assert.doesNotMatch(src, /locales\//);
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\decision-tip-i18n-guard.test.ts
```
Expected: FAIL —— `parseDecisionTip` / `fillTemplate` 未导出。

- [ ] **Step 3: 实现**

在 `src/lib/decision-support.ts` 末尾追加（并改 `DecisionLines` 与 `extractDecisionLines`）：

```ts
/** 解析出来的结构化建议（code + 参数） */
export interface DecisionTip {
  /** 语义码，如 'burn_high_burn'；与 locale 的 decision_tip.<code> 对应 */
  code: string;
  /** 插值参数（值一律按字符串处理） */
  params: Record<string, string>;
}

/**
 * 把「💡 Tip:」后面的文本解析成结构化建议。
 *
 * ⭐ 引擎输出的是 JSON：{"code":"burn_high_burn","params":{"ratio":"0.42"}}
 *   ⇒ 解析失败（不是 JSON / 没有 code）时返回 null，由调用方决定回退。
 * ⭐ **参数值一律 String()**：locale 的占位符插值是纯文本替换，
 *   数字与字符串没有区别 ⇒ 避免 3.2 与 "3.2" 两种写法在两侧不一致。
 */
export function parseDecisionTip(tip: string): DecisionTip | null {
  const raw = (tip || '').trim();
  if (!raw.startsWith('{')) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const obj = parsed as Record<string, unknown>;
  const code = typeof obj.code === 'string' ? obj.code.trim() : '';
  if (!code) return null;
  const params: Record<string, string> = {};
  const src = (obj.params ?? {}) as Record<string, unknown>;
  if (src && typeof src === 'object' && !Array.isArray(src)) {
    for (const [k, v] of Object.entries(src)) {
      if (v === null || v === undefined) continue;
      params[k] = String(v);
    }
  }
  return { code, params };
}

/**
 * 模板插值：{param} → 值（全部出现都替换）。
 *
 * ⭐ 服务端与客户端**共用这一份实现** ⇒ 两边不可能漂。
 */
export function fillTemplate(tmpl: string, params: Record<string, string>): string {
  if (!tmpl) return '';
  return Object.entries(params).reduce(
    (s, [k, v]) => s.replaceAll('{' + k + '}', String(v)),
    tmpl,
  );
}
```

并把 `DecisionLines` 与 `extractDecisionLines` 改成：

```ts
export interface DecisionLines {
  /** 「💡 Tip」那一行的正文（不含标记本身） */
  tip: string;
  /** ⭐ 结构化建议码（非结构化输出时为 ''） */
  tipCode: string;
  /** ⭐ 结构化建议的参数（非结构化输出时为 {}） */
  tipParams: Record<string, string>;
}

export function extractDecisionLines(output: string): DecisionLines {
  const tip = findLine(output, DECISION_MARKERS.tip);
  const parsed = parseDecisionTip(tip);
  return {
    tip,
    tipCode: parsed ? parsed.code : '',
    tipParams: parsed ? parsed.params : {},
  };
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\decision-tip-i18n-guard.test.ts
node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\decision-support-guard.test.ts
```
Expected: PASS —— 5 + N 个用例全绿，既有决策守卫不回归。

- [ ] **Step 5: 提交**

```bash
git add src/lib/decision-support.ts tests/decision-tip-i18n-guard.test.ts
git commit -F tmp/commit-msg-decision-tip-t1.txt
```

提交信息正文必须写明实测数字，例如：

```
feat(decision): 决策层新增建议码解析与模板插值（zh 动态层英文缺陷修复 · 第 1 步）

· 新增 parseDecisionTip / fillTemplate；DecisionLines 扩展 tipCode / tipParams
· 解析器只认结构化 JSON：旧式英文句子 / 无 code / 非法 JSON / 数组 一律 null
· 参数值一律 String()：避免 3.2 与 "3.2" 两种写法在服务端与客户端不一致
· 守卫 5 个用例：解析器 3 + 插值 1 + 「共享模块不得 import locale」1
· 共享模块刻意不 import locale：en.json 970KB + zh.json 944KB 进客户端 bundle 会拖慢每个工具页
```

---

### Task 2: 服务端模板模块 + SSR / 客户端接线

**Files:**
- Create: `src/lib/decision-tip-templates.ts`
- Modify: `src/components/DecisionSupport.astro`
- Modify: `src/scripts/decision-support.client.ts`
- Modify: `src/pages/[lang]/[slug].astro`（客户端 raw 的取值范围）
- Test: `tests/decision-tip-i18n-guard.test.ts`（追加）

**Interfaces:**
- Consumes: Task 1 的 `parseDecisionTip` / `fillTemplate` / `DecisionLines.tipCode` / `DecisionLines.tipParams`
- Produces:
  - `export const DECISION_TIP_KEY_PREFIX = 'decision_tip.'`（在 `src/lib/decision-tip-templates.ts`）
  - `export function decisionTipTemplates(lang: 'en' | 'zh'): Record<string, string>` —— 返回 `{ [code]: template }`
  - `export function decisionTipTemplatesJson(lang: 'en' | 'zh'): string` —— 给 DOM 属性用的 JSON 串（`<` 已转义）
  - `export function renderDecisionTip(code: string, params: Record<string, string>, lang: 'en' | 'zh'): string`
  - DOM 契约：`#decision-next-step` 元素带 `data-tip-templates` 属性（JSON 串）

- [ ] **Step 1: 写失败测试**

在 `tests/decision-tip-i18n-guard.test.ts` 追加：

```ts
import {
  DECISION_TIP_KEY_PREFIX,
  decisionTipTemplates,
  decisionTipTemplatesJson,
  renderDecisionTip,
} from '../src/lib/decision-tip-templates.ts';

test('P168 模板模块：键前缀与 locale 的 decision_tip.* 对齐', () => {
  assert.equal(DECISION_TIP_KEY_PREFIX, 'decision_tip.');
});

test('P168 模板模块：只挑出 decision_tip.* 前缀的键，且去掉前缀', () => {
  const tpls = decisionTipTemplates('zh');
  assert.ok(Object.keys(tpls).length > 0, 'zh 没有任何建议模板');
  for (const [code, text] of Object.entries(tpls)) {
    assert.ok(code.length > 0);
    assert.ok(!code.startsWith(DECISION_TIP_KEY_PREFIX), '前缀没去掉：' + code);
    assert.ok(text.length > 0);
  }
});

test('P168 模板模块：注入用的 JSON 串不含裸 <（防 </script> 截断）', () => {
  const json = decisionTipTemplatesJson('zh');
  assert.ok(!json.includes('<'), 'JSON 里出现裸 <');
  assert.doesNotThrow(() => JSON.parse(json));
});

test('P168 模板模块：renderDecisionTip 按 locale 取模板并插值', () => {
  const tpls = decisionTipTemplates('zh');
  const code = Object.keys(tpls)[0];
  const zh = renderDecisionTip(code, {}, 'zh');
  assert.ok(zh.length > 0, '渲染结果为空');
  assert.notEqual(zh, DECISION_TIP_KEY_PREFIX + code, '渲染回了原始键名（说明模板不存在）');
});

test('P168 模板模块：不存在的建议码返回空串（不得把键名渲染到页面上）', () => {
  assert.equal(renderDecisionTip('definitely_not_a_code', {}, 'zh'), '');
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\decision-tip-i18n-guard.test.ts
```
Expected: FAIL —— 找不到模块 `src/lib/decision-tip-templates.ts`。

- [ ] **Step 3: 实现服务端模板模块**

创建 `src/lib/decision-tip-templates.ts`：

```ts
// P168 —— 决策建议**模板**的服务端侧：locale 里的 decision_tip.* 键。
//
// ⭐ 为什么单独一个模块（而不是塞进 src/lib/decision-support.ts）
//   decision-support.ts 是**客户端也要 import** 的纯逻辑模块；
//   而 locale（en.json 970KB + zh.json 944KB）一旦被它 import
//   ⇒ 每个工具页的客户端 bundle 会被拖进 1.9MB。
//   ⇒ 模板查找留在服务端；客户端只拿「服务端查好的模板表」（DOM 属性）。

import en from '../i18n/locales/en.json';
import zh from '../i18n/locales/zh.json';
import { translate } from '../i18n/translate-helper';
import { fillTemplate } from './decision-support';

export type TipLang = 'en' | 'zh';

/** locale 里存建议模板的键前缀 */
export const DECISION_TIP_KEY_PREFIX = 'decision_tip.';

const LOCALES: Record<TipLang, Record<string, string>> = { en, zh };

/** 该 locale 下全部建议模板（键去掉前缀） */
export function decisionTipTemplates(lang: TipLang): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(LOCALES[lang] ?? {})) {
    if (!k.startsWith(DECISION_TIP_KEY_PREFIX)) continue;
    out[k.slice(DECISION_TIP_KEY_PREFIX.length)] = v;
  }
  return out;
}

/** 给 DOM 属性用的 JSON 串：`<` 转义 ⇒ 不会截断 </script> */
export function decisionTipTemplatesJson(lang: TipLang): string {
  return JSON.stringify(decisionTipTemplates(lang)).replace(/</g, '\\u003c');
}

/**
 * 渲染一条建议。
 *
 * ⭐ zh 缺键时 `translate` 会**自动回退 en** ⇒ 页面显示英文而不是空的
 *   或裸的 code ⇒ 降级是内建的；守卫另外负责让缺键在 CI 里变红。
 * ⭐ 两个 locale 都缺 ⇒ 返回空串（不把键名渲染到页面上）。
 */
export function renderDecisionTip(
  code: string,
  params: Record<string, string>,
  lang: TipLang,
): string {
  if (!code) return '';
  const key = DECISION_TIP_KEY_PREFIX + code;
  const tmpl = translate(key, lang);
  if (tmpl === key) return '';
  return fillTemplate(tmpl, params);
}
```

- [ ] **Step 4: 实现 SSR 渲染 + 模板注入**

改 `src/components/DecisionSupport.astro` 的 frontmatter：

```astro
---
import { t, getLang } from '../i18n';
import { extractDecisionLines } from '../lib/decision-support';
import { decisionTipTemplatesJson, renderDecisionTip } from '../lib/decision-tip-templates';

export interface Props {
  /** 决策问题（工具专属） */
  goal: string;
  /** 据此该怎么定（工具专属） */
  recommendation: string;
  /** 适用边界（工具专属） */
  constraint: string;
  /** 「下一步用哪个工具」（工具专属，静态） */
  nextTool: string;
  /** 引擎的示例输出（静态版，用来填 SSR 初始的决策建议） */
  sampleOutput: string;
}

const { goal, recommendation, constraint, nextTool, sampleOutput } = Astro.props;
const lang = getLang(Astro);

// 静态（SSR）版：直接从引擎的示例输出里取决策建议 —— 与客户端**同一份实现**
const sampleLines = extractDecisionLines(sampleOutput);
const hasSample = Boolean(sampleLines.tip);
// ⭐ 有建议码 ⇒ 用 locale 模板渲染；没有 ⇒ 原样（兼容旧式英文句子）
const sampleText = sampleLines.tipCode
  ? renderDecisionTip(sampleLines.tipCode, sampleLines.tipParams, lang)
  : sampleLines.tip;
// ⭐ 客户端要用同一批模板（客户端 bundle 不带 locale ⇒ 由服务端注入）
const tipTemplatesJson = decisionTipTemplatesJson(lang);
---
```

并把动态层容器改成（**只加一个属性**，其余结构不动）：

```astro
<div id="decision-next-step" data-tip-templates={tipTemplatesJson} class="text-sm text-gray-700 leading-relaxed space-y-2">
  {hasSample ? (
    <p>{sampleText}</p>
  ) : (
    <p class="text-gray-500">{t('decision.next_step_pending', lang)}</p>
  )}
</div>
```

- [ ] **Step 5: 实现客户端渲染**

改 `src/scripts/decision-support.client.ts` 的 `render` 与新增 `readTemplates`：

```ts
import { extractDecisionLines, fillTemplate } from '../lib/decision-support';

/** 决策区块里「针对你这组数字」那块的容器 id */
const BOX_ID = 'decision-next-step';
/** 事件名（与 [slug].astro 内联脚本里派发的名字必须一致） */
export const DECISION_RESULT_EVENT = 'ffk:decision-result';

interface DecisionResultDetail {
  /** 引擎的原始输出（results 全部拼起来的文本） */
  raw: string;
}

/** 从 DOM 读服务端注入的模板表（客户端 bundle 不带 locale） */
function readTemplates(box: HTMLElement): Record<string, string> {
  const raw = box.dataset.tipTemplates;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function render(box: HTMLElement, raw: string): void {
  const lines = extractDecisionLines(raw);
  if (!lines.tip) return;
  let text = lines.tip;
  if (lines.tipCode) {
    const tmpl = readTemplates(box)[lines.tipCode];
    // ⭐ 模板缺失 ⇒ 保留原文（守卫负责让缺键在 CI 里变红）
    if (tmpl) text = fillTemplate(tmpl, lines.tipParams);
  }
  box.innerHTML = '<p>' + escapeHtml(text) + '</p>';
  // 「示例」徽章只在展示示例数据时成立 ⇒ 换成用户自己的数字后要去掉
  const badge = box.parentElement?.querySelector('[data-decision-example-badge]');
  if (badge) badge.remove();
}
```

- [ ] **Step 6: 让客户端拿得到 gdpr 的 Tip**

⚠️ 实测发现：`solopreneur-gdpr-fine-calculator` 的 `generate()` 返回**6 个元素**，Tip 在**最后一个**；而 `src/pages/[lang]/[slug].astro` 派给客户端的是 `results[0]` ⇒ **gdpr 的客户端动态层永远抓不到 Tip**（用户点「计算」后动态层还停在示例内容）。

改 `src/pages/[lang]/[slug].astro` 的事件派发（把 `raw` 从单元素改成整段）：

```astro
try {
  document.dispatchEvent(new CustomEvent('ffk:decision-result', {
    detail: { raw: results && results.length ? results.join('\n') : '' }
  }));
} catch (e) { /* 事件派发失败不影响计算结果 */ }
```

（客户端只从中提取 Tip、只渲染 Tip，不渲染整段 ⇒ 不影响卡片，也不产生重复。）

- [ ] **Step 7: 跑测试确认通过**

```bash
node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\decision-tip-i18n-guard.test.ts
pnpm exec tsc --noEmit
```
Expected: PASS + exit 0。

- [ ] **Step 8: 提交**

```bash
git add src/lib/decision-tip-templates.ts src/components/DecisionSupport.astro src/scripts/decision-support.client.ts "src/pages/[lang]/[slug].astro" tests/decision-tip-i18n-guard.test.ts
git commit -F tmp/commit-msg-decision-tip-t2.txt
```

---

### Task 3: burn-rate 引擎改建议码 + 3 条模板 + 探针夹具

**Files:**
- Modify: `src/engines/saas/burn-rate-calculator.ts`（`calculate()` + `customFn`）
- Modify: `src/i18n/locales/en.json` / `zh.json`（+3 键）
- Create: `tests/_decision-tip-probe.ts`
- Test: `tests/decision-tip-i18n-guard.test.ts`（追加本引擎的守恒断言）

**Interfaces:**
- Consumes: Task 1 的解析器、Task 2 的模板模块
- Produces: 建议码 `burn_high_burn` / `burn_positive_burn` / `burn_cashflow_positive`（三条**无参数**）；`tests/_decision-tip-probe.ts` 的 `TIP_PROBES` / `probeCodes(slug)`

- [ ] **Step 1: 写失败测试（守恒断言，本引擎分组）**

在 `tests/decision-tip-i18n-guard.test.ts` 追加：

```ts
import { readLocale } from './_decision-support-fixture.ts';
import { TIP_PROBES, probeCodes } from './_decision-tip-probe.ts';

const locales = { en: readLocale('en'), zh: readLocale('zh') } as const;

test('P168 建议码守恒（burn-rate）：locale 模板 == 探针跑出来的码', () => {
  const codes = probeCodes('solopreneur-burn-rate-calculator');
  assert.deepEqual(
    codes.sort(),
    ['burn_cashflow_positive', 'burn_high_burn', 'burn_positive_burn'],
    'burn-rate 的建议码集合与登记的不一致',
  );
  for (const lang of ['en', 'zh'] as const) {
    for (const code of codes) {
      const v = locales[lang]['decision_tip.' + code];
      assert.equal(typeof v, 'string', lang + ' 缺模板 decision_tip.' + code);
      assert.ok(v.length > 0, lang + ' 的 decision_tip.' + code + ' 是空串');
    }
  }
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\decision-tip-i18n-guard.test.ts
```
Expected: FAIL —— 找不到模块 `tests/_decision-tip-probe.ts`。

- [ ] **Step 3: 创建探针夹具（先只放 burn-rate 三条）**

创建 `tests/_decision-tip-probe.ts`（**文件名不能带 `.test.ts`**）：

```ts
// P168 —— 决策建议的**分支探针**：每个建议码一组实测输入。
//
// ⭐ 这些输入是**穷举扫描**出来的，不是推测值：
//   tmp/sweep-tips.ts 对 ltv 跑了 1296 组渠道组合、其余三个引擎跑了网格，
//   把每个引擎观察到的 tip 文本归并成「建议码模板」后，取每档的第一个样本。
// ⭐ 探针的用途是**守恒**：
//   引擎源码里的建议码集合 == locale 的模板集合 == 探针跑出来的集合。
//   三者相等 ⇒ 每个码都有模板、每个模板都被跑过、每个分支都被译过。
//
// ⚠️ 文件名不能带 .test.ts —— tests/build-dep-suites.mjs 的 walkTestSuites
//    只收 *.test.ts / *.test.mjs，带了会让套件计数漂移。

import { getAllEngines } from '../src/core/engines/registry.ts';
import '../src/engines/index.ts';
import { extractDecisionLines } from '../src/lib/decision-support.ts';

export interface TipProbe {
  /** 期望的建议码 */
  code: string;
  /** 引擎输入 */
  inputs: Record<string, string>;
}

export const TIP_PROBES: Record<string, TipProbe[]> = {
  'solopreneur-burn-rate-calculator': [
    {
      code: 'burn_high_burn',
      inputs: { monthlyRevenue: '0', netNewRevenue: '0', teamCost: '100', infraCost: '0', marketingCost: '0', opsCost: '0', currentCash: '50000' },
    },
    {
      code: 'burn_positive_burn',
      inputs: { monthlyRevenue: '98', netNewRevenue: '0', teamCost: '100', infraCost: '0', marketingCost: '0', opsCost: '0', currentCash: '50000' },
    },
    {
      code: 'burn_cashflow_positive',
      inputs: { monthlyRevenue: '0', netNewRevenue: '0', teamCost: '0', infraCost: '0', marketingCost: '0', opsCost: '0', currentCash: '50000' },
    },
  ],
};

/** 跑某个工具的探针，返回观察到的建议码集合（去重） */
export function probeCodes(slug: string): string[] {
  const engines = getAllEngines() as any[];
  const engine = engines.find((e) => e.slug === slug);
  if (!engine) return [];
  const out = new Set<string>();
  for (const probe of TIP_PROBES[slug] ?? []) {
    const results = engine.generate(probe.inputs);
    const joined = (Array.isArray(results) ? results : [results]).join('\n');
    const lines = extractDecisionLines(joined);
    if (lines.tipCode) {
      out.add(lines.tipCode);
      continue;
    }
    // ⭐ 还没改码的引擎 ⇒ tip 还是旧式英文句子 ⇒ 记下来由断言报错
    out.add('LEGACY:' + lines.tip.slice(0, 40));
  }
  return [...out];
}
```

- [ ] **Step 4: 跑测试确认失败（此时探针跑出的是 LEGACY 句）**

```bash
node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\decision-tip-i18n-guard.test.ts
```
Expected: FAIL —— 建议码集合是 `['LEGACY:...']` 而不是三个建议码。

- [ ] **Step 5: 改引擎（`calculate()` 与 `customFn` 各一处）**

改 `src/engines/saas/burn-rate-calculator.ts` 的 `calculate()`：

```ts
  // 💡 Tip (v3)
  // ⭐ P168：输出**结构化建议码**（不再内嵌英文句子）
  //   —— 英文句子搬进 src/i18n/locales/en.json，中文写进 zh.json
  //   —— 决策层（SSR + 客户端）用 decision_tip.<code> 取模板并插值
  if (netBurn > 5) {
    result += "\n\n💡 Tip: " + JSON.stringify({ code: 'burn_high_burn', params: {} });
  } else if (netBurn > 0) {
    result += "\n\n💡 Tip: " + JSON.stringify({ code: 'burn_positive_burn', params: {} });
  } else {
    result += "\n\n💡 Tip: " + JSON.stringify({ code: 'burn_cashflow_positive', params: {} });
  }
```

改同一文件的 `customFn` 镜像（**逐字对应**）：

```ts
  "if(nb>5)r+='\\n\\n\\uD83D\\uDCA1 Tip: '+JSON.stringify({code:'burn_high_burn',params:{}});else if(nb>0)r+='\\n\\n\\uD83D\\uDCA1 Tip: '+JSON.stringify({code:'burn_positive_burn',params:{}});else r+='\\n\\n\\uD83D\\uDCA1 Tip: '+JSON.stringify({code:'burn_cashflow_positive',params:{}});" +
```

- [ ] **Step 6: 写 locale 模板（en 3 键 + zh 3 键）**

`src/i18n/locales/en.json`：

```json
"decision_tip.burn_high_burn": "Team costs are typically 50-70% of gross burn. If you need to extend runway fast, headcount is the biggest lever — but also the slowest to undo. Try cutting SaaS subscriptions and contractor hours first for immediate savings without firing.",
"decision_tip.burn_positive_burn": "Burn multiple below 1.0× means you're growing revenue faster than you burn. Below 0.5× is best-in-class — investors reward capital efficiency. Track it monthly.",
"decision_tip.burn_cashflow_positive": "Default alive is just the start. Reinvest excess cash into growth experiments (paid acquisition, content, hiring) to compound the advantage before competitors catch up.",
```

`src/i18n/locales/zh.json`：

```json
"decision_tip.burn_high_burn": "团队成本通常占总烧钱的 50–70%。你需要快速延长跑道时，人数是最大的杠杆——但也是最难撤销的。先砍 SaaS 订阅和外包工时，能立刻省下钱而不必裁员。",
"decision_tip.burn_positive_burn": "烧钱倍数低于 1.0× 意味着你的收入增长快于烧钱速度。低于 0.5× 属于行业顶尖——投资人奖励资本效率。每月跟踪一次。",
"decision_tip.burn_cashflow_positive": "「默认活着」只是起点。把多余现金再投入增长实验（付费获客、内容、招人），在竞争对手追上来之前把优势复利放大。",
```

- [ ] **Step 7: 重生成 staticExamples 并验证**

```bash
node scripts\codegen-examples.mjs
node scripts\codegen-examples.mjs --check
node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\decision-tip-i18n-guard.test.ts
```
Expected: 全部 exit 0 / PASS，且 burn-rate 的 `staticExamples[0]` 里出现 `💡 Tip: {"code":"burn_cashflow_positive"...}`。

- [ ] **Step 8: 提交**

```bash
git add src/engines/saas/burn-rate-calculator.ts src/i18n/locales/en.json src/i18n/locales/zh.json tests/_decision-tip-probe.ts tests/decision-tip-i18n-guard.test.ts
git commit -F tmp/commit-msg-decision-tip-t3.txt
```

---

### Task 4: gdpr-fine 引擎改建议码 + 4 条模板

**Files:**
- Modify: `src/engines/legal-compliance/gdpr-fine-calculator.ts`（`generate()` + `customFn`）
- Modify: `src/i18n/locales/en.json` / `zh.json`（+4 键）
- Modify: `tests/_decision-tip-probe.ts`（+4 条探针）
- Test: `tests/decision-tip-i18n-guard.test.ts`（追加本引擎的守恒断言）

**Interfaces:**
- Consumes: Task 3 建立的三集合守恒模式
- Produces: 建议码 `gdpr_mature` / `gdpr_manageable` / `gdpr_full_programme` / `gdpr_escalate`（四条各带 1 个参数 `{ratio}`）

- [ ] **Step 1: 写失败测试**

在 `tests/decision-tip-i18n-guard.test.ts` 追加（与 burn-rate 同形状）：

```ts
test('P168 建议码守恒（gdpr-fine）：locale 模板 == 探针跑出来的码', () => {
  const codes = probeCodes('solopreneur-gdpr-fine-calculator');
  assert.deepEqual(
    codes.sort(),
    ['gdpr_escalate', 'gdpr_full_programme', 'gdpr_manageable', 'gdpr_mature'],
    'gdpr-fine 的建议码集合与登记的不一致',
  );
  for (const lang of ['en', 'zh'] as const) {
    for (const code of codes) {
      const v = locales[lang]['decision_tip.' + code];
      assert.equal(typeof v, 'string', lang + ' 缺模板 decision_tip.' + code);
      assert.ok(v.length > 0);
    }
  }
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\decision-tip-i18n-guard.test.ts
```
Expected: FAIL —— gdpr 的探针还没登记 ⇒ `probeCodes` 返回空数组。

- [ ] **Step 3: 登记 gdpr 探针（4 条，输入已实测验证）**

在 `tests/_decision-tip-probe.ts` 的 `TIP_PROBES` 里追加：

```ts
  'solopreneur-gdpr-fine-calculator': [
    {
      code: 'gdpr_mature',
      inputs: { annual_revenue_global: '25000000', max_fine_pct: '0.5%', violations_per_year: '0', industry_risk_multiplier: 'SaaS (0.8×)' },
    },
    {
      code: 'gdpr_manageable',
      inputs: { annual_revenue_global: '25000000', max_fine_pct: '0.5%', violations_per_year: '1', industry_risk_multiplier: 'SaaS (0.8×)' },
    },
    {
      code: 'gdpr_full_programme',
      inputs: { annual_revenue_global: '25000000', max_fine_pct: '2%', violations_per_year: '1', industry_risk_multiplier: 'SaaS (0.8×)' },
    },
    {
      code: 'gdpr_escalate',
      inputs: { annual_revenue_global: '25000000', max_fine_pct: '4%', violations_per_year: '1', industry_risk_multiplier: 'SaaS (0.8×)' },
    },
  ],
```

> ⚠️ gdpr 的敞口比例 `ratio = (finePct/100) × 行业系数 × 违规次数`，**与营收无关** ⇒ 换营收不换档，只换 `max_fine_pct` / `violations_per_year`。

- [ ] **Step 4: 改引擎（`generate()` 与 `customFn` 各一处）**

`generate()` 里把 `tipTxt` 的四段英文换成建议码（**参数 `ratio` 保持两位小数的百分比**，与原英文 `fmtPct(ratio)` 的数字部分一致）：

```ts
      '💡 Tip: ' + (band === 'excellent'
        ? JSON.stringify({ code: 'gdpr_mature', params: { ratio: fmtPct(ratio).replace('%', '') } })
        : band === 'good'
        ? JSON.stringify({ code: 'gdpr_manageable', params: { ratio: fmtPct(ratio).replace('%', '') } })
        : band === 'warning'
        ? JSON.stringify({ code: 'gdpr_full_programme', params: { ratio: fmtPct(ratio).replace('%', '') } })
        : JSON.stringify({ code: 'gdpr_escalate', params: { ratio: fmtPct(ratio).replace('%', '') } })),
```

`customFn` 里对应的那一行：

```ts
  var tipTxt = ratio < 0.0025 ? JSON.stringify({code:'gdpr_mature',params:{ratio:(ratio*100).toFixed(2)}}) : ratio < 0.01 ? JSON.stringify({code:'gdpr_manageable',params:{ratio:(ratio*100).toFixed(2)}}) : ratio < 0.02 ? JSON.stringify({code:'gdpr_full_programme',params:{ratio:(ratio*100).toFixed(2)}}) : JSON.stringify({code:'gdpr_escalate',params:{ratio:(ratio*100).toFixed(2)}});
```

- [ ] **Step 5: 写 locale 模板（en 4 键 + zh 4 键）**

```json
"decision_tip.gdpr_mature": "Your annual exposure sits at {ratio}% of revenue, which is a mature compliance posture. Keep the baseline current and re-run this after any material breach, because the number next year depends on how cleanly the data you hold today is documented.",
"decision_tip.gdpr_manageable": "Annual exposure is {ratio}% of revenue — manageable, but not free. Put roughly half the expected fine into DSAR automation and CMP tooling now; that is enough to halve the violation rate and move you into the excellent band.",
"decision_tip.gdpr_full_programme": "Annual exposure has reached {ratio}% of revenue, so a full programme now costs less than the fine does. Move DSAR automation and CMP into this quarter, and start the data-flow audit in parallel.",
"decision_tip.gdpr_escalate": "Annual exposure is {ratio}% of revenue, high enough that the fine-tier cap is likely to be hit. Escalate to a C-level owner and legal now, and book the expected fine as a budget line rather than a risk you can wait on.",
```

```json
"decision_tip.gdpr_mature": "你的年度风险敞口占营收 {ratio}%，属于成熟的合规状态。保持基线是最新的，并在任何重大数据泄露后重算——明年的数字取决于今天手上的数据记录得有多干净。",
"decision_tip.gdpr_manageable": "年度敞口占营收 {ratio}%——可控，但不是零成本。现在就把预期罚款的一半左右投到 DSAR 自动化和 CMP 工具上；这足以把违规率减半，把你推进「优秀」区间。",
"decision_tip.gdpr_full_programme": "年度敞口已达营收 {ratio}%，此时做一套完整合规体系的成本已经低于罚款本身。把 DSAR 自动化和 CMP 排进本季度，同时启动数据流审计。",
"decision_tip.gdpr_escalate": "年度敞口占营收 {ratio}%，高到很可能触及罚款档位上限。立刻上报给 C 级负责人和法务，并把预期罚款作为预算科目入账，而不是一个可以等的风险。",
```

- [ ] **Step 6: 重生成 staticExamples 并验证**

```bash
node scripts\codegen-examples.mjs
node scripts\codegen-examples.mjs --check
node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\decision-tip-i18n-guard.test.ts
```
Expected: 全部 exit 0 / PASS。

⚠️ gdpr 的 `generate()` 返回 **6 个元素**、Tip 在最后一个 ⇒ `staticExamples[0]` 是把 6 段用 `\n` 连起来的一条（codegen 就是这么做的）⇒ 改完后 `staticExamples[0]` 里会出现 `💡 Tip: {"code":...}` ✔。

- [ ] **Step 7: 提交**

```bash
git add src/engines/legal-compliance/gdpr-fine-calculator.ts src/i18n/locales/en.json src/i18n/locales/zh.json tests/_decision-tip-probe.ts tests/decision-tip-i18n-guard.test.ts
git commit -F tmp/commit-msg-decision-tip-t4.txt
```

---

### Task 5: cac 引擎改建议码 + 5 条模板

**Files:**
- Modify: `src/engines/valuation/cac-calculator.ts`（`calculate()` + `customFn`）
- Modify: `src/i18n/locales/en.json` / `zh.json`（+5 键）
- Modify: `tests/_decision-tip-probe.ts`（+5 条探针）
- Test: `tests/decision-tip-i18n-guard.test.ts`（追加本引擎的守恒断言）

**Interfaces:**
- Produces: 建议码 `cac_no_revenue`（参数 `{cac}`）/ `cac_payback_fast` / `cac_payback_within_12` / `cac_payback_past_12` / `cac_payback_slow`（后四条参数 `{paybackMonths}`）

- [ ] **Step 1: 写失败测试**

```ts
test('P168 建议码守恒（cac）：locale 模板 == 探针跑出来的码', () => {
  const codes = probeCodes('solopreneur-cac-calculator');
  assert.deepEqual(
    codes.sort(),
    ['cac_no_revenue', 'cac_payback_fast', 'cac_payback_past_12', 'cac_payback_slow', 'cac_payback_within_12'],
    'cac 的建议码集合与登记的不一致',
  );
  for (const lang of ['en', 'zh'] as const) {
    for (const code of codes) {
      const v = locales[lang]['decision_tip.' + code];
      assert.equal(typeof v, 'string', lang + ' 缺模板 decision_tip.' + code);
      assert.ok(v.length > 0);
    }
  }
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\decision-tip-i18n-guard.test.ts
```
Expected: FAIL —— cac 探针未登记。

- [ ] **Step 3: 登记 cac 探针（5 条，输入已实测验证）**

```ts
  'solopreneur-cac-calculator': [
    {
      code: 'cac_no_revenue',
      inputs: { marketingSpend: '600', salesSpend: '0', newCustomers: '10', avgRevenuePerCustomer: '0', grossMargin: '100' },
    },
    {
      code: 'cac_payback_fast',
      inputs: { marketingSpend: '600', salesSpend: '0', newCustomers: '10', avgRevenuePerCustomer: '20', grossMargin: '100' },
    },
    {
      code: 'cac_payback_within_12',
      inputs: { marketingSpend: '600', salesSpend: '0', newCustomers: '10', avgRevenuePerCustomer: '7.5', grossMargin: '100' },
    },
    {
      code: 'cac_payback_past_12',
      inputs: { marketingSpend: '600', salesSpend: '0', newCustomers: '10', avgRevenuePerCustomer: '4', grossMargin: '100' },
    },
    {
      code: 'cac_payback_slow',
      inputs: { marketingSpend: '600', salesSpend: '0', newCustomers: '10', avgRevenuePerCustomer: '2', grossMargin: '100' },
    },
  ],
```

- [ ] **Step 4: 改引擎（`calculate()` 与 `customFn` 各一处）**

`calculate()` 里把 `cacTip` 的五段英文换成建议码：

```ts
  let cacTip: string;
  if (avgRevenuePerCustomer <= 0) {
    cacTip = JSON.stringify({ code: 'cac_no_revenue', params: { cac: fmt(cac) } });
  } else if (paybackMonths <= 6) {
    cacTip = JSON.stringify({ code: 'cac_payback_fast', params: { paybackMonths: paybackMonths.toFixed(1) } });
  } else if (paybackMonths <= 12) {
    cacTip = JSON.stringify({ code: 'cac_payback_within_12', params: { paybackMonths: paybackMonths.toFixed(1) } });
  } else if (paybackMonths <= 18) {
    cacTip = JSON.stringify({ code: 'cac_payback_past_12', params: { paybackMonths: paybackMonths.toFixed(1) } });
  } else {
    cacTip = JSON.stringify({ code: 'cac_payback_slow', params: { paybackMonths: paybackMonths.toFixed(1) } });
  }
```

`customFn` 里对应的那一行：

```ts
  "var tipTxt = arc <= 0 ? JSON.stringify({code:'cac_no_revenue',params:{cac:'$'+Math.round(cac2).toLocaleString()}}) : pbm <= 6 ? JSON.stringify({code:'cac_payback_fast',params:{paybackMonths:pbm.toFixed(1)}}) : pbm <= 12 ? JSON.stringify({code:'cac_payback_within_12',params:{paybackMonths:pbm.toFixed(1)}}) : pbm <= 18 ? JSON.stringify({code:'cac_payback_past_12',params:{paybackMonths:pbm.toFixed(1)}}) : JSON.stringify({code:'cac_payback_slow',params:{paybackMonths:pbm.toFixed(1)}});" +
```

- [ ] **Step 5: 写 locale 模板（en 5 键 + zh 5 键）**

```json
"decision_tip.cac_no_revenue": "Your CAC is {cac}, but without average revenue per customer there is no payback period to judge it against. Add that input to see whether acquisition recovers its cost, and break the number down by channel in the meantime — a blended average is what hides the expensive line.",
"decision_tip.cac_payback_fast": "Your CAC pays back in {paybackMonths} months, fast enough to compound. Keep concentrating the budget on the channel with the lowest cost per customer — payback this quick only compounds while the money stays concentrated.",
"decision_tip.cac_payback_within_12": "CAC pays back in {paybackMonths} months, inside the 12-month benchmark. Hold total spend steady and shift the marginal dollar toward your cheapest channel; payback this healthy improves fastest when you move weight, not when you add volume.",
"decision_tip.cac_payback_past_12": "CAC pays back in {paybackMonths} months, past the 12-month ideal, so every new customer ties up cash for longer than it should. Fix the channel mix before you add budget — a smaller spend that pays back faster beats a bigger spend that does not.",
"decision_tip.cac_payback_slow": "CAC takes {paybackMonths} months to pay back, long enough to strain cash flow even when the customer is worth acquiring. Cut the worst channels first and re-run this before you scale spend.",
```

```json
"decision_tip.cac_no_revenue": "你的 CAC 是 {cac}，但没有每客户平均收入就算不出回本周期，没法判断。补上这个输入就能看获客是否收回成本；在此之前先把数字按渠道拆开——被平均数掩盖的正是那条最贵的渠道。",
"decision_tip.cac_payback_fast": "你的 CAC 在 {paybackMonths} 个月回本，快到足以产生复利。继续把预算集中在每客户成本最低的渠道——回本这么快，只有资金保持集中才会复利。",
"decision_tip.cac_payback_within_12": "CAC 在 {paybackMonths} 个月回本，处于 12 个月的基准线以内。保持总支出不变，把边际的那一块钱挪向最便宜的渠道；这种健康的回本，只有把钱挪走而不是加量才会变快。",
"decision_tip.cac_payback_past_12": "CAC 在 {paybackMonths} 个月回本，已经越过 12 个月的理想线，每个新客户占用的现金时间都超出应有水平。先修渠道结构再加预算——回本更快的小额支出，胜过不更快的大额支出。",
"decision_tip.cac_payback_slow": "CAC 需要 {paybackMonths} 个月回本，即便这个客户值得获取，现金流也会被拖紧。先砍掉最差的渠道，在放大支出之前重算一次。",
```

- [ ] **Step 6: 重生成 staticExamples 并验证**

```bash
node scripts\codegen-examples.mjs
node scripts\codegen-examples.mjs --check
node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\decision-tip-i18n-guard.test.ts
```
Expected: 全部 exit 0 / PASS。

- [ ] **Step 7: 提交**

```bash
git add src/engines/valuation/cac-calculator.ts src/i18n/locales/en.json src/i18n/locales/zh.json tests/_decision-tip-probe.ts tests/decision-tip-i18n-guard.test.ts
git commit -F tmp/commit-msg-decision-tip-t5.txt
```

---

### Task 6: ltv-by-channel 引擎改建议码 + 6 条模板 + 处置 1 条死分支

**Files:**
- Modify: `src/engines/marketing/ltv-by-channel-calculator.ts`（`calculate()` + `customFn`）
- Modify: `src/i18n/locales/en.json` / `zh.json`（+6 键）
- Modify: `tests/_decision-tip-probe.ts`（+6 条探针）
- Test: `tests/decision-tip-i18n-guard.test.ts`（追加本引擎的守恒断言）

**Interfaces:**
- Produces: 建议码 `ltv_no_data` / `ltv_single_channel` / `ltv_no_green` / `ltv_similar_ratios`（无参数）、`ltv_strong_winner`（`{winner}` `{winnerRatio}` `{loser}` `{loserRatio}`）、`ltv_both_healthy`（`{winner}` `{ratio}` `{loser}`）

- [ ] **Step 1: 写失败测试**

```ts
test('P168 建议码守恒（ltv-by-channel）：locale 模板 == 探针跑出来的码', () => {
  const codes = probeCodes('solopreneur-ltv-by-channel-calculator');
  assert.deepEqual(
    codes.sort(),
    ['ltv_both_healthy', 'ltv_no_data', 'ltv_no_green', 'ltv_single_channel', 'ltv_similar_ratios', 'ltv_strong_winner'],
    'ltv-by-channel 的建议码集合与登记的不一致',
  );
  for (const lang of ['en', 'zh'] as const) {
    for (const code of codes) {
      const v = locales[lang]['decision_tip.' + code];
      assert.equal(typeof v, 'string', lang + ' 缺模板 decision_tip.' + code);
      assert.ok(v.length > 0);
    }
  }
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\decision-tip-i18n-guard.test.ts
```
Expected: FAIL —— ltv 探针未登记。

- [ ] **Step 3: 登记 ltv 探针（6 条，输入已实测验证）**

```ts
  'solopreneur-ltv-by-channel-calculator': [
    {
      code: 'ltv_no_data',
      inputs: { ch1_spend: '0', ch1_conv: '0', ch1_ltv: '0', ch2_spend: '0', ch2_conv: '0', ch2_ltv: '20' },
    },
    {
      code: 'ltv_single_channel',
      inputs: { ch1_spend: '0', ch1_conv: '0', ch1_ltv: '0', ch2_spend: '100', ch2_conv: '10', ch2_ltv: '20' },
    },
    {
      code: 'ltv_no_green',
      inputs: { ch1_spend: '0', ch1_conv: '10', ch1_ltv: '0', ch2_spend: '100', ch2_conv: '10', ch2_ltv: '20' },
    },
    {
      code: 'ltv_strong_winner',
      inputs: { ch1_spend: '0', ch1_conv: '10', ch1_ltv: '0', ch2_spend: '100', ch2_conv: '10', ch2_ltv: '50' },
    },
    {
      code: 'ltv_similar_ratios',
      inputs: { ch1_spend: '100', ch1_conv: '10', ch1_ltv: '20', ch2_spend: '100', ch2_conv: '10', ch2_ltv: '20' },
    },
    {
      code: 'ltv_both_healthy',
      inputs: { ch1_spend: '100', ch1_conv: '10', ch1_ltv: '20', ch2_spend: '100', ch2_conv: '10', ch2_ltv: '50' },
    },
  ],
```

- [ ] **Step 4: 处置那条实测不可达的分支**

⚠️ 实测结论（穷举 1296 组渠道组合）：`Add more channel data for comparison insights.` **一次都没有出现** ⇒ 该 `else` 是**死分支**（`finiteRatios.length > 0` ⇒ `winner`/`loser` 必然都存在 ⇒ 外层 `else` 不可达）。

守恒断言要求「locale 里每个模板都能被探针跑到」⇒ 死分支必须处置。**处置方式**：把那条不可达的 `else` 改成 `ltv_no_data`（语义同为「先去填数据」），**不新增建议码、不新增模板**。

`calculate()` 里：

```ts
  } else {
    // ⭐ P168：这条 else 实测**不可达**（finiteRatios.length > 0 ⇒ winner/loser 必然存在），
    //   穷举 1296 组渠道组合从未出现 ⇒ 与 ltv_no_data 合并，避免产生永远跑不到的建议码。
    tip = JSON.stringify({ code: 'ltv_no_data', params: {} });
  }
```

`customFn` 里对应的那一段：

```ts
  "else{tip=JSON.stringify({code:'ltv_no_data',params:{}});}" +
```

- [ ] **Step 5: 改引擎的 6 条分支**

`calculate()` 里把 `tip` 的 6 段英文换成建议码：

```ts
  // Tip
  // ⭐ P168：输出**结构化建议码**（英文句子搬进 locale）
  let tip: string;
  if (finiteRatios.length === 0) {
    tip = JSON.stringify({ code: 'ltv_no_data', params: {} });
  } else if (winner && loser && winner.id === loser.id) {
    tip = JSON.stringify({ code: 'ltv_single_channel', params: {} });
  } else if (winner && loser) {
    const winnerRatio = winner.ratio;
    const loserRatio = loser.ratio;
    if (winnerRatio >= 3 && loserRatio < 1) {
      tip = JSON.stringify({
        code: 'ltv_strong_winner',
        params: {
          winner: winner.id,
          winnerRatio: winnerRatio.toFixed(1),
          loser: loser.id,
          loserRatio: loserRatio.toFixed(1),
        },
      });
    } else if (winnerRatio >= 3 && loserRatio >= 1) {
      tip = JSON.stringify({
        code: 'ltv_both_healthy',
        params: {
          winner: winner.id,
          ratio: (winnerRatio / loserRatio).toFixed(1),
          loser: loser.id,
        },
      });
    } else if (winnerRatio < 3 && loserRatio < 1) {
      tip = JSON.stringify({ code: 'ltv_no_green', params: {} });
    } else {
      tip = JSON.stringify({ code: 'ltv_similar_ratios', params: {} });
    }
  } else {
    // ⭐ P168：这条 else 实测**不可达**（finiteRatios.length > 0 ⇒ winner/loser 必然存在），
    //   穷举 1296 组渠道组合从未出现 ⇒ 与 ltv_no_data 合并，避免产生永远跑不到的建议码。
    tip = JSON.stringify({ code: 'ltv_no_data', params: {} });
  }
```

`customFn` 里对应的那几行（原本是 4 个内层分支 + 1 个外层 else）：

```ts
  "if(finiteRatios.length===0){tip=JSON.stringify({code:'ltv_no_data',params:{}});}" +
  "else if(winner&&loser&&winner.id===loser.id){tip=JSON.stringify({code:'ltv_single_channel',params:{}});}" +
  "else if(winner&&loser){var wr=winner.ratio;var lr=loser.ratio;if(wr>=3&&lr<1){tip=JSON.stringify({code:'ltv_strong_winner',params:{winner:winner.id,winnerRatio:wr.toFixed(1),loser:loser.id,loserRatio:lr.toFixed(1)}});}else if(wr>=3&&lr>=1){tip=JSON.stringify({code:'ltv_both_healthy',params:{winner:winner.id,ratio:(wr/lr).toFixed(1),loser:loser.id}});}else if(wr<3&&lr<1){tip=JSON.stringify({code:'ltv_no_green',params:{}});}else{tip=JSON.stringify({code:'ltv_similar_ratios',params:{}});}}" +
  "else{tip=JSON.stringify({code:'ltv_no_data',params:{}});}" +
```

- [ ] **Step 6: 写 locale 模板（en 6 键 + zh 6 键）**

```json
"decision_tip.ltv_no_data": "Enter at least one channel with conversion count to see recommendations.",
"decision_tip.ltv_single_channel": "Only one channel has data. Add 2-4 more channels for actionable comparison and reallocation insights.",
"decision_tip.ltv_no_green": "No channel is in the 🟢 band. Audit both creatives and targeting before scaling — your CAC is structurally high.",
"decision_tip.ltv_similar_ratios": "Channels cluster in similar ratios. Differentiate with new creative angles (video, UGC, founder-led) before reallocating.",
"decision_tip.ltv_strong_winner": "Strong winner ({winner}, {winnerRatio}x) vs weak loser ({loser}, {loserRatio}x). Shift budget: double down on {winner} with lookalike audiences, pause or rework {loser} creatives.",
"decision_tip.ltv_both_healthy": "Both channels healthy, but {winner} is {ratio}x more efficient. Shift 20-30% of {loser} budget to {winner}.",
```

```json
"decision_tip.ltv_no_data": "至少填一个渠道的转化数，才能看到建议。",
"decision_tip.ltv_single_channel": "只有一个渠道有数据。再加 2–4 个渠道，才能得到可执行的对比与预算再分配建议。",
"decision_tip.ltv_no_green": "没有渠道进入 🟢 区间。放量之前先审计两个渠道的素材与定向——你的获客成本是结构性地偏高。",
"decision_tip.ltv_similar_ratios": "各渠道的效率倍数很接近。重新分配预算之前，先用新的素材角度（视频、用户原创内容、创始人出镜）做出差异化。",
"decision_tip.ltv_strong_winner": "强势赢家（{winner}，{winnerRatio}x）对比弱势渠道（{loser}，{loserRatio}x）。预算怎么调：加码 {winner}，用相似受众扩大投放；暂停或重做 {loser} 的素材。",
"decision_tip.ltv_both_healthy": "两个渠道都健康，但 {winner} 的效率高出 {ratio} 倍。把 {loser} 预算的 20–30% 挪给 {winner}。",
```

- [ ] **Step 7: 重生成 staticExamples 并验证**

```bash
node scripts\codegen-examples.mjs
node scripts\codegen-examples.mjs --check
node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\decision-tip-i18n-guard.test.ts
```
Expected: 全部 exit 0 / PASS。

- [ ] **Step 8: 提交**

```bash
git add src/engines/marketing/ltv-by-channel-calculator.ts src/i18n/locales/en.json src/i18n/locales/zh.json tests/_decision-tip-probe.ts tests/decision-tip-i18n-guard.test.ts
git commit -F tmp/commit-msg-decision-tip-t6.txt
```

---

### Task 7: 三集合守恒 + 译文质量守卫 + 可复算工具

**Files:**
- Modify: `tests/decision-tip-i18n-guard.test.ts`
- Modify: `tests/dead-i18n-keys-guard.test.ts`（`decision_tip.*` 是动态键 ⇒ 白名单）
- Create: `tests/scripts/p168-decision-tip-probe.ts`（可复算工具）

**Interfaces:**
- Consumes: Task 3–6 的 18 个建议码、探针夹具、locale 模板
- Produces: 全局守恒断言 + 译文质量断言（拆成两条以守隔离纪律）+ 一个可复算工具

- [ ] **Step 1: 写失败测试**

在 `tests/decision-tip-i18n-guard.test.ts` 追加（需要 `import { getAllEngines } from '../src/core/engines/registry.ts';` 与 `import { infoUnits, readLocale } from './_decision-support-fixture.ts';`）：

```ts
const ENGINE_FILES: Record<string, string> = {
  'solopreneur-burn-rate-calculator': 'src/engines/saas/burn-rate-calculator.ts',
  'solopreneur-ltv-by-channel-calculator': 'src/engines/marketing/ltv-by-channel-calculator.ts',
  'solopreneur-gdpr-fine-calculator': 'src/engines/legal-compliance/gdpr-fine-calculator.ts',
  'solopreneur-cac-calculator': 'src/engines/valuation/cac-calculator.ts',
};

/** 引擎源码里出现的建议码字面量（'code': 'xxx' 形式） */
function sourceCodes(slug: string): string[] {
  const src = readFileSync(resolve(process.cwd(), ENGINE_FILES[slug]), 'utf8');
  const out = new Set<string>();
  for (const m of src.matchAll(/code:\s*'([a-z0-9_]+)'/g)) out.add(m[1]);
  return [...out].sort();
}

test('P168 建议码守恒（全局）：源码 == locale == 探针，三者相等', () => {
  const problems: string[] = [];
  for (const slug of Object.keys(TIP_PROBES)) {
    const src = sourceCodes(slug);
    const probe = probeCodes(slug).sort();
    for (const lang of ['en', 'zh'] as const) {
      const loc = Object.keys(locales[lang])
        .filter((k) => k.startsWith('decision_tip.'))
        .map((k) => k.slice('decision_tip.'.length));
      for (const code of src) {
        if (!probe.includes(code)) problems.push(slug + ': 建议码 ' + code + ' 没被任何探针跑到（分支没被覆盖）');
        if (!loc.includes(code)) problems.push(slug + ': ' + lang + ' 缺模板 decision_tip.' + code);
      }
      for (const code of loc) {
        const owner = Object.keys(TIP_PROBES).some((s) => sourceCodes(s).includes(code));
        if (!owner) problems.push(lang + ': 模板 decision_tip.' + code + ' 没有任何引擎产出（死模板）');
      }
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 译文质量（一）：zh 模板不是英文原文、不是占位', () => {
  const problems: string[] = [];
  const zhCodes = Object.keys(locales.zh).filter((k) => k.startsWith('decision_tip.'));
  assert.ok(zhCodes.length >= 18, 'zh 的建议模板只有 ' + zhCodes.length + ' 条（期望 ≥ 18）');
  for (const key of zhCodes) {
    const en = locales.en[key];
    const zh = locales.zh[key];
    if (typeof en !== 'string' || typeof zh !== 'string') { problems.push(key + ' 缺失'); continue; }
    if (zh === en) problems.push(key + ' 的 zh 与 en 逐字相同（没翻）');
    if (zh.includes('用此计算器')) problems.push(key + ' 是占位模板');
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 译文质量（二）：zh 模板厚度达标（中文 ≥ 英文 × 0.55）', () => {
  const problems: string[] = [];
  for (const key of Object.keys(locales.zh).filter((k) => k.startsWith('decision_tip.'))) {
    const en = locales.en[key];
    const zh = locales.zh[key];
    if (typeof en !== 'string' || typeof zh !== 'string') continue;
    const enUnits = infoUnits(en);
    const zhUnits = infoUnits(zh);
    if (enUnits > 0 && zhUnits < enUnits * 0.55) {
      problems.push(key + ' 的中文只有英文的 ' + (zhUnits / enUnits).toFixed(2) + '（下限 0.55）');
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

test('P168 译文质量（三）：模板的占位符集合 == 引擎实际发出的参数键集合', () => {
  const problems: string[] = [];
  const engines = getAllEngines() as any[];
  for (const [slug, probes] of Object.entries(TIP_PROBES)) {
    for (const probe of probes) {
      const results = engines.find((e) => e.slug === slug)!.generate(probe.inputs);
      const joined = (Array.isArray(results) ? results : [results]).join('\n');
      const lines = extractDecisionLines(joined);
      if (!lines.tipCode) continue;
      const tmpl = locales.zh['decision_tip.' + lines.tipCode] ?? '';
      const tmplParams = new Set([...tmpl.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]));
      const sent = new Set(Object.keys(lines.tipParams));
      for (const p of sent) {
        if (!tmplParams.has(p)) problems.push(slug + '/' + lines.tipCode + '：模板没有占位符 {' + p + '}');
      }
      for (const p of tmplParams) {
        if (!sent.has(p)) problems.push(slug + '/' + lines.tipCode + '：模板多了占位符 {' + p + '}');
      }
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\decision-tip-i18n-guard.test.ts
```
Expected: FAIL —— 「死模板」或「没被任何探针跑到」会报出来（证明断言真的有牙齿；此时若已经全绿，说明断言写错了，要改成能红的形状）。

- [ ] **Step 3: 处理死键守卫**

`decision_tip.*` 是**动态键**（源码里是 `'decision_tip.' + code`），死键守卫查不到字面量 ⇒ 会把 18 个键全判成死键。

在 `tests/dead-i18n-keys-guard.test.ts` 里加一条前缀豁免（**先读一遍该文件的白名单结构再改**，按它既有的形状写）：

```ts
// P168：决策建议模板是**动态键**（'decision_tip.' + code）
//   ⇒ 源码里查不到字面量，不能按死键判。
const DYNAMIC_KEY_PREFIXES = ['decision_tip.'];
```

并在该守卫判定「死键」的地方跳过这些前缀。

- [ ] **Step 4: 创建可复算工具**

创建 `tests/scripts/p168-decision-tip-probe.ts`（**文件名不能带 `.test.ts`**）：

```ts
#!/usr/bin/env node
// P168 —— 决策建议**分支探针**的可复算工具。
//
// 跑法（必须从仓库根目录跑）：
//   node node_modules\tsx\dist\cli.mjs tests\scripts\p168-decision-tip-probe.ts
//
// 用途：
//   ① 打印每个工具的「建议码 → 实测输入」，供人工核对与规格回填；
//   ② --strict 时，任何工具的码集合与 locale 的模板集合不相等就 exit 1。
//
// ⚠️ 只读：不写任何文件（只 readFileSync / import）。

import { getAllEngines } from '../../src/core/engines/registry.ts';
import '../../src/engines/index.ts';
import { extractDecisionLines } from '../../src/lib/decision-support.ts';
import { TIP_PROBES } from '../_decision-tip-probe.ts';
import { readLocale } from '../_decision-support-fixture.ts';

const STRICT = process.argv.includes('--strict');
const locales = { en: readLocale('en'), zh: readLocale('zh') } as const;
const engines = getAllEngines() as any[];

let problems = 0;
for (const [slug, probes] of Object.entries(TIP_PROBES)) {
  const engine = engines.find((e) => e.slug === slug);
  if (!engine) { console.error('✗ 找不到引擎 ' + slug); problems++; continue; }
  console.log('=== ' + slug + ' ===');
  const seen = new Set<string>();
  for (const probe of probes) {
    const results = engine.generate(probe.inputs);
    const joined = (Array.isArray(results) ? results : [results]).join('\n');
    const lines = extractDecisionLines(joined);
    const code = lines.tipCode || ('LEGACY:' + lines.tip.slice(0, 40));
    const hit = code === probe.code;
    if (!hit) problems++;
    console.log(
      '  ' + (hit ? '✓' : '✗') + ' ' + probe.code +
      ' → 实测 ' + code +
      ' | params ' + JSON.stringify(lines.tipParams),
    );
    seen.add(code);
  }
  console.log('  探针覆盖 ' + seen.size + ' 个码');
}

const templateCodes = Object.keys(locales.zh).filter((k) => k.startsWith('decision_tip.'));
for (const key of templateCodes) {
  const code = key.slice('decision_tip.'.length);
  const owner = Object.values(TIP_PROBES).some((ps) => ps.some((p) => p.code === code));
  if (!owner) { console.error('✗ 死模板 ' + key); problems++; }
}
console.log('\n[decision-tip-probe] locale 模板 ' + templateCodes.length + ' 条 | ' + (problems === 0 ? 'PASSED' : 'problems=' + problems));
if (problems > 0) process.exit(1);
if (STRICT) console.log('[decision-tip-probe] --strict 通过');
```

- [ ] **Step 5: 跑测试与工具确认全绿**

```bash
node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\decision-tip-i18n-guard.test.ts
node node_modules\tsx\dist\cli.mjs tests\scripts\p168-decision-tip-probe.ts --strict
node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\dead-i18n-keys-guard.test.ts
```
Expected: 全部 exit 0 / PASS。

- [ ] **Step 6: 提交**

```bash
git add tests/decision-tip-i18n-guard.test.ts tests/dead-i18n-keys-guard.test.ts tests/scripts/p168-decision-tip-probe.ts
git commit -F tmp/commit-msg-decision-tip-t7.txt
```

---

### Task 8: 变异台子扩充 + 负对照

**Files:**
- Modify: `tests/scripts/mutate-p168-decision-support.mjs`

**Interfaces:**
- Consumes: Task 1–7 的断言
- Produces: 本批的变异（每条只红一条断言）

- [ ] **Step 1: 在 MUTATIONS 里追加本批变异**

按现有 `{ id, guard, desc, expect, allowExtra?, apply }` 形状追加（`expect` 必须写**断言名全文**）：

| id | 变异 | 期望只红的断言 |
|---|---|---|
| `M23` | `src/lib/decision-support.ts` 的 `parseDecisionTip` 去掉 `if (!code) return null;` | `P168 建议码解析器：只认结构化 JSON，其它一律 null（不得「猜」）` |
| `M24` | `fillTemplate` 的 `replaceAll` 改成 `replace`（只替换第一处） | `P168 模板插值：{param} 全部出现都替换（与 translate-helper 同一口径）` |
| `M25` | `src/lib/decision-tip-templates.ts` 的 `renderDecisionTip` 去掉 `if (tmpl === key) return '';` | `P168 模板模块：不存在的建议码返回空串（不得把键名渲染到页面上）` |
| `M26` | `zh.json` 的 `decision_tip.burn_high_burn` 改成英文原文 | `P168 译文质量（一）：zh 模板不是英文原文、不是占位` |
| `M27` | `zh.json` 的 `decision_tip.burn_high_burn` 砍掉一半（保真度） | `P168 译文质量（二）：zh 模板厚度达标（中文 ≥ 英文 × 0.55）` |
| `M28` | `src/engines/saas/burn-rate-calculator.ts` 的 `burn_high_burn` 改成 `burn_positive_burn`（分支码写错） | `P168 建议码守恒（全局）：源码 == locale == 探针，三者相等` |
| `M29` | `src/pages/[lang]/[slug].astro` 的 `results.join('\n')` 改回 `results[0]` | `P168 建议码守恒（全局）：源码 == locale == 探针，三者相等` |

⚠️ **M26 / M27 必须拆成两条断言**（Task 7 Step 1 已拆好），否则一条变异会同时触发「zh==en」和「厚度」两条 ⇒ 违反「一条变异只红一条断言」的隔离纪律。

- [ ] **Step 2: 跑台子确认 22 → 29 条变异全部 KILLED**

```bash
node tests\scripts\mutate-p168-decision-support.mjs
```
Expected: `KILLED 29 / 29`，0 存活 / 0 INVALID / 0 未隔离。

- [ ] **Step 3: 跑负对照**

```bash
node tests\scripts\mutate-p168-decision-support.mjs --negative-control
```
Expected: 报 `RED-BUT-NOT-ISOLATED` 且整轮 exitCode = 1；**该模式自身 exit 0** = 证明成立。

- [ ] **Step 4: 提交**

```bash
git add tests/scripts/mutate-p168-decision-support.mjs
git commit -F tmp/commit-msg-decision-tip-t8.txt
```

---

### Task 9: 文档同步 + 全量验证 + 线上实测

**Files:**
- Modify: `docs/superpowers/specs/2026-10-27-p155-adsense-low-value-content-and-pricing-bot-diagnosis.md`（新增 §19.29）
- Modify: `docs/superpowers/plans/INDEX.md`
- Modify: `AGENTS.md`（新增一条教训）
- Modify: `CHANGELOG.md`

- [ ] **Step 1: 写规格 §19.29**

§19.29 必须包含（照 §19.28 的形状）：定位 · 用户拍板（A 形态 + 只修动态层）· 机制取证（4 个工具 / 19 分支 / 18 可达 / 死分支实测）· 形态定案 · 实现要点（建议码 + locale 模板 + 服务端注入 + 客户端不拖 locale）· 三集合守恒 · 实测验收数字 · **维度 3 scan 声明**（不含实时外部信号，web_search 402）· 遗留（zh 页卡片英文 / 其余约 15 个引擎的 🧭 段迁出）。

- [ ] **Step 2: 更新计划索引**

`docs/superpowers/plans/INDEX.md`：Section 9 计数 **40 → 41**，目录文件总数 **111 → 112**，并加一行本计划。

- [ ] **Step 3: 写 AGENTS.md 教训 + CHANGELOG**

建议新增的教训：

> **十一、动态文案要「搬进 locale」，就得先给它一个稳定的语义码**
> 引擎里写死的英文句子没法被翻译；要让 zh 页显示中文，又不能把两套语言塞进同一个函数 ⇒ 引擎改吐**语义码 + 参数**，文案进 locale，决策层按码取模板插值。
> 三件事必须同时到位：① 引擎吐码（不是英文句子）② locale 有 en+zh 两份模板 ③ 守卫守「源码码集 == locale 码集 == 探针码集」—— 少一件，英文就会以「漏网分支」的形式回到页面上。
> ⭐ 顺带一条：**死分支要先证伪再处置**（穷举扫描 1296 组输入确认某分支一次都不出现），否则「删死代码」会变成「删掉只是暂时没跑到的分支」。

- [ ] **Step 4: 跑全量门禁**

```bash
pnpm exec tsc --noEmit
node scripts\codegen-examples.mjs --check
node scripts\codegen-customfn.mjs --check
node scripts\check-i18n-completeness.mjs
node scripts\check-engine-count-by-category.mjs --check
node scripts\score-user-value.mjs --check
node scripts\codegen-review-dates.mjs --check
$env:SKIP_INDEXNOW='1'; pnpm build
node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\decision-tip-i18n-guard.test.ts
node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\decision-support-guard.test.ts
node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\title-seo-guard.test.ts
node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\doc-freshness-guard.test.ts
node tests\scripts\mutate-p168-decision-support.mjs
node tests\scripts\mutate-p168-decision-support.mjs --negative-control
node tmp\run-full-with-log.cjs
```

Expected: 全部 exit 0；构建仍为 **438** 页；变异台子 **29/29 KILLED**；负对照报 RED-BUT-NOT-ISOLATED；全量 **281** 套件 10 批全 `# fail 0`。

⚠️ 全量套件跑起来之前先确认**没有别的进程在写 `dist/`**（派过 reviewer / 跑过构建类命令就等它结束）⇒ 全量失败的第一嫌疑是环境污染，不是代码。

- [ ] **Step 5: 线上实测（push 之后）**

push GitHub master = 上线（部署触发器在 CF Dashboard webhook，不在 CI）⇒ push 后**约 4 分钟**生效。

```bash
node tmp\verify-push.cjs
```

然后用浏览器打开：

- `https://forgeflowkit.com/zh/solopreneur-burn-rate-calculator/` ⇒ 动态层显示**中文**
- `https://forgeflowkit.com/en/solopreneur-burn-rate-calculator/` ⇒ 动态层显示**英文**（逐字与改前一致）
- `https://forgeflowkit.com/zh/solopreneur-cac-calculator/` ⇒ 中文；改几个输入再点「计算」⇒ 动态层换成**针对你这组数字**的中文
- `https://forgeflowkit.com/zh/solopreneur-gdpr-fine-calculator/` ⇒ 中文；点「计算」后动态层**会更新**（此前因为 raw 只取 `results[0]` 而永不更新）

- [ ] **Step 6: 提交 + 询问 push**

```bash
git add AGENTS.md CHANGELOG.md docs/superpowers/specs/2026-10-27-p155-adsense-low-value-content-and-pricing-bot-diagnosis.md docs/superpowers/plans/INDEX.md
git commit -F tmp/commit-msg-decision-tip-t9.txt
```

⛔ **不要自动 push**。先向用户报告实测数字并询问是否 push（用户规则：先询问 → 得到同意 → 再 push；push 前必须 `git fetch` + 确认 0 behind）。

---

## 执行差异记录（2026-11-10 实际执行与本计划的出入）

本计划是**执行前**写的；实际执行中有 4 处出入，记在这里，免得后来人照本计划复现时被绊住。

| # | 计划写的 | 实际做的 | 为什么 |
|---|---|---|---|
| 1 | locale 模板在 Task 3–6 **按引擎**录入 | **18 条模板在 Task 2 一次性录入**（locale 与引擎解耦，文案一次搬完） | Task 2 的断言要验「取模板 + 插值」，模板不在就验不了；且守恒断言里「locale 键集合 == 码集合」是**全局**的 ⇒ 分 4 次录只会让中间态红 |
| 2 | Task 7 要给 `dead-i18n-keys-guard` 加 `decision_tip.` 前缀白名单 | **不需要** | 那个守卫是 **build-dep** 守卫（扫构建产物里的死文案），**不枚举源码里的未用键** ⇒ 动态键不会被误判 |
| 3 | 守恒拆成「每引擎」+「全局」两条断言 | **合成一条**（源码 / 运行时探针 / 登记清单 / locale 模板四个视角） | §19.26.9 的老教训：**同一个不变量被两处守 ⇒ 一次变异必然红两条** ⇒ 隔离要拆 ⇒ 合成一条 |
| 4 | 变异台子本来没有 `--negative-control`（B3-2 只加在 title 台子上） | **按 B3-2 的形状补上**（故意让两条断言同时红 ⇒ 必须报 RED-BUT-NOT-ISOLATED；**该模式自身 exit 0** = 证明成立） | 「KILLED N」本身可以是假绿 ⇒ 隔离判定自己也要被证明 |
| 5 | Task 8 一次跑完 29 条 | **实际分三轮**（首轮跑到 M10 被取消 ⇒ 之后发现 M11 的变异**残留在工作区**，且**已被烤进磁盘快照**） | 台子被硬杀时收尾还原**不执行** ⇒ 残留留在仓库 ⇒ ~90 个工具页渲染**裸 i18n 键名**；更隐蔽的是**污染状态下刷的快照**会把污染一起烤进去 ⇒ 下次开跑的自愈会**再装回去**（越跑越脏）⇒ 修复顺序必须是「**先修源码 → 再刷快照 → 才开跑**」 |
| 6 | 守卫里加一条「结果卡片里没有决策建议」就能判掉 M8 | **第一版这条轴对 M8 完全隐形**（实测 SURVIVED）⇒ 改成落在**不会被 HTML 转义**的标记上（emoji + 纯 ASCII 标识符），并让 **M8 认领这条轴** | 探针拿「**未转义的原文**」比「**只解了 `&amp;` 的文本**」⇒ 建议码 JSON 里的 `"` 被 Astro 转义成 `&quot;` ⇒ **永远比不上** ⇒ 「零重复」那条数的是**渲染后的文案** ⇒ 两条轴都对 M8 隐形 |
| 7 | 29 条变异的锚点沿用上一批 | **4 条锚点随建议码形态失效**（M12 / M14 / M17 / M29 ⇒ 实测 INVALID）⇒ 逐条改成新形态后重跑 | 锚点锚的是**旧的英文句子** ⇒ 建议码形态下那句话不存在了 ⇒ 台子必须**随实现形态一起改**；另：源码里的 `\n` 是**两个字符** ⇒ 拿真换行（`NL`）做锚点**永远锚不中**（M29）⇒ 锚点改用 `BS` 常量 |
| 9 | 计划写的：locale 动态键不会被任何守卫误判 | **全量套件首轮抓到 `translation-glossary-guard` 把 18 个 `decision_tip.*` 判成「孤儿键」** ⇒ 守卫里显式登记「动态查表的键前缀」，并写明**由建议码守恒那条更强地接手** | 计划只核了 `dead-i18n-keys-guard`（build-dep、扫产物文案、不枚举源码未用键）⇒ **漏了这条**（它确实枚举源码未用键）⇒ 教训：「某个守卫不会误判」要落到**所有会枚举源码键的守卫**上 |
| 10 | 计划写的：Task 9 只做文档同步 | **全量套件首轮还抓到 `plans/INDEX.md` 的「类别计数表」没跟着改** ⇒ 补上（第 9 段 40→41、总数 111→112） | 我只改了文件**头部说明行**（写了「40→41、111→112」）⇒ 但**表里的数字**才是被校验的那份 ⇒ 头部说明行不算更新 |
| 8 | M19（Tip 退化成常量）应严格只红一条断言 | **逻辑上拆不开** ⇒ 用 `allowExtra: true` + 在台子里写明理由 | 守恒断言里的「**探针码集是跑出来的**」⇒ 常量 Tip ⇒ 探针只跑出**一个**码 ⇒ 守恒**必然**一起红 ⇒ 任何「让 Tip 变常量」的写法都会让码集塌成一个 ⇒ 「守恒单独红」由 **M28** 覆盖 ⇒ 两条断言**各有专属变异** |

⚠️ **另有一处计划外的守卫更新**：`tests/decision-support-build-guard.test.ts` 的探针从「引擎原始 tip」改成「**按语言渲染后**的建议」（en 英文 / zh 中文）—— 建议码形态下页面显示的是渲染结果，而引擎原始 tip 现在是一段 JSON ⇒ 不改探针会误报「决策建议出现 0 次」。

⚠️ **另有一处执行风险（已处置）**：台子的磁盘快照是**上次跑台子那一刻**的内容 ⇒ 开工前若带着旧快照又设了 `P168_ALLOW_RECOVER=1`，「恢复」会把**本批改动整个回滚**。⇒ 处置：先把快照刷成**当前内容**（恢复动作变成 no-op）再开跑。

---

## Self-Review（写完计划后的自检）

**1. 规格覆盖**：

- 缺陷本体（zh 动态层英文）→ Task 2（渲染）+ Task 3–6（改码 + 模板）✔
- 两条路径（SSR 示例 + 客户端实时）→ Task 2 Step 5–6 ✔
- 漂移防护 → Task 7 的三集合守恒 ✔
- 降级不出现空块 → `translate` 的 zh→en 回退（Task 2 Step 3）✔
- 死分支处置 → Task 6 Step 4（先证伪再处置）✔
- 客户端 bundle 不被 locale 拖爆 → Task 1 的「不得 import locale」断言 + Task 2 的服务端注入 ✔
- 可复算工具入库 → Task 7 Step 4 ✔
- 变异台子 + 负对照 → Task 8 ✔
- 文档 / 维度 3 scan → Task 9 ✔
- 明确的范围外项 → Global Constraints（zh 页卡片英文、其余引擎的 🧭 段迁出）✔

**2. 占位符扫描**：计划内无 TBD / TODO / 「类似 Task N」；所有代码块都有完整内容；探针输入全部是实测值 ✔

**3. 类型一致性**：

- `parseDecisionTip` / `fillTemplate` / `DecisionTip` / `DecisionLines.tipCode` / `tipParams` 在 Task 1 定义，Task 2–8 一致使用 ✔
- `decisionTipTemplates` / `decisionTipTemplatesJson` / `renderDecisionTip` / `DECISION_TIP_KEY_PREFIX` 在 Task 2 定义，Task 7 一致使用 ✔
- `probeCodes` / `TIP_PROBES` 在 Task 3 定义，Task 4–7 一致使用 ✔
- `infoUnits` / `readLocale` 来自 `tests/_decision-support-fixture.ts`（既有导出）✔

**4. 已知风险（执行者必须知道）**：

- `scripts/codegen-examples.mjs` 会重写 `staticExamples[0]` ⇒ 改完引擎**必须**跑生成器并提交结果，否则 `--check` 会红。
- `customFn` 是**手写压缩镜像**，不会被任何脚本自动生成 ⇒ 每个引擎改两处，且靠既有守卫 ⑨（customFn 与 generate 的建议必须一致）守漂移。
- `decision_tip.*` 是动态键 ⇒ 死键守卫必须豁免，否则 18 个键全被判死键。
- 变异台子会**临时改写仓库里的源文件** ⇒ 不要接进 `pnpm check`；跑之前确认没有台子快照残留（否则需要 `P168_ALLOW_RECOVER=1` 且要先人工核对）。
- gdpr 的 `generate()` 返回 6 个元素、Tip 在最后一个 ⇒ 任何「只看 results[0]」的地方都抓不到它（本批已把客户端 raw 改成整段拼接）。
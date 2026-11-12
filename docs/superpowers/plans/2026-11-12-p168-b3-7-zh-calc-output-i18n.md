# P168 批次 3 · B3-7：zh 页结果卡片英文化 —— 引擎吐「标签码 + 值」，zh 侧查 locale 拼装（试点 10 个工具）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> ℹ️ **本计划 2026-11-12 起草 · 待执行。** 上游设计规格：`docs/superpowers/specs/2026-11-12-p168-b3-7-zh-calc-output-i18n-design.md`（commit `26f8f89`，已获用户逐节认可）。
> ℹ️ **本计划对 spec 有一处「精确化补全」**（spec §2.3 的 B-2 行码尾部语法未定义完整）—— 见 **§0.3「对 spec 的唯一一处补全」**，其余完全按 spec 执行。

**Goal:** 让 **10 个试点工具** 的 zh 页结果卡片（**首屏静态卡片 + 点「计算」后的动态卡片**）**全中文**，并建立一套可复用的机制与守卫，使后续铺开到其余 90 个引擎成为「重复劳动」而非「重新设计」。

**Architecture:** 引擎不再吐英文句子，而是吐**「语义码 + 值」**：`$calc_out.label.starting_mrr|Starting MRR      $12,000`。服务端与客户端**共用同一份纯逻辑渲染器**（`src/lib/calc-output-i18n.ts`），服务端查 locale 渲静态卡片、客户端查**服务端注入的模板子集**渲动态卡片 ⇒ 不会出现「静态中文、动态英文」的分裂。**token 自带英文兜底** ⇒ locale 缺键时降级到英文而不是显示裸 token。

**Tech Stack:** Node 20 · Astro 5 · `node:test` · 本仓库既有 `src/lib/decision-support.ts`（B3-4 的「建议码 + locale 模板」已验证形态）/ `src/lib/decision-tip-templates.ts` / `src/scripts/decision-support.client.ts` / `tests/_decision-support-fixture.ts`。

---

## 0. 执行前必读

### 0.1 本批要解决的缺陷（实测规模见 spec §0.2）

zh 页（`/zh/<slug>/`）的**结果卡片**整段是英文：页面框架（导航 / 按钮 / 决策区块 / FAQ）是中文，卡片里的**计算结果正文却是英文** ⇒ 同一页两种语言。

| # | 实测事实 | 依据 |
|---|---|---|
| 1 | **100/100** 引擎输出正文零中文 | `engine.generate()` + `staticExamples[0]` 全量跑 |
| 2 | 产物层**静态卡片**：**75/100 页**仍有整行英文，共 **2048 行** | 解析 `dist/zh/*/index.html` 的 `#static-results` |
| 3 | 产物层**动态卡片**：**100/100** 零中文；**1227/1905 行（64.4%）**整行英文 | 同上 |
| 4 | **86.6%** 的残留行是「`标签: 值`」形态；不同标签 **1091 种**，≥2 工具共用的 **58 种** | 标签切分统计 |
| 5 | ⭐⭐ `translateCalcOutput` **只在 SSR 静态路径（`:1394`）被调用**；客户端动态路径（`:2120~2185`）**根本没有翻译环节** | `src/pages/[lang]/[slug].astro` |
| 6 | 「去数字后」的英文形状 **1451 种**，其中 **1233 种只出现一次** ⇒ 逐条字面量对照表不可行 | 归一化统计 |

### 0.2 本批的边界（明确不做）

| 不做 | 理由 |
|---|---|
| 铺开到其余 90 个引擎 | 形态未验证；本批只为验证形态 + 攒每引擎耗时数据 |
| 清理 `translateCalcOutput` 的 129 个死键 | 与 `dead-i18n-keys-guard` 有依赖（§19.34 的「删键让别的门禁变红」教训） |
| 改任何引擎的**计算逻辑 / 阈值 / 输入定义** | 宪法：本批只碰「输出形态」 |
| 动 `staticExamples` 的生成机制 | `codegen-examples.mjs` 自动重生成即可 |

### 0.3 ⭐ 对 spec 的唯一一处补全（spec §2.3 的 B-2 语法精确化）

**spec 原文的 B-2 行码形态**：

``
• $calc_out.mrr.row.path_a|Path A — raise total contract value by {total} (same customers, larger deals) {total} $300,000 {note}
``

⚠️ **问题**：尾部 `{total} $300,000 {note}` 的**分隔规则没有定义完整**（`{note}` 后面跟什么？值与名怎么切？值里带空格怎么办？）。直接实现会产生歧义解析。

⭐ **本计划把它精确化为：「紧跟 code 的可选 JSON params」**：

``
• $calc_out.mrr.row.path_a{"total":"$300,000"}|Path A — raise total contract value by $300,000 (same customers, larger deals)
``

| 段 | 含义 | 约束 |
|---|---|---|
| `$` | token 前缀（避开 locale 里已有的 **97 个 `{param}` 键**，两者正交） | 引擎输出里 `$` 只以 `$数字` 形式出现 ⇒ 零误判 |
| `code` | 语义码 = **locale 键名**（渲染时去掉 `$` 即为键 ⇒ 一个正则同时完成「找 token」与「查键」，不需要第二张映射表） | ≥2 段、全小写、段内只允许 `[a-z0-9_]` |
| `params` | 可选 JSON 对象（紧跟 code，**无空格**） | 值里不得出现 `{` `}`（正则用 `[^{}]*` 界定）；**可以**出现 \`|` |
| `fallback` | \`|` 之后的英文原文（= 兜底文本） | **不得含 \`|`**（`beautifySections` 用 \`|` 分隔维度行）；**可以**含 `$数字`（金额）与 `{param}` |

⭐ **为什么这样比 spec 原形态更好**：
1. **无歧义** —— JSON 自带边界，不需要额外的分隔规则；
2. **与仓库既有约定同源** —— B3-4 的 `decision_tip` 已经是「码 + JSON params」；
3. **兜底仍可用** —— 删掉 en 键只会让页面退回**可读的英文**，不会显示裸 token；
4. **params 与 fallback 的值一致** —— 引擎用同一个变量同时生成 `params.total` 与 fallback 里的 `$300,000` ⇒ 两侧不可能漂。

⭐ **本批的最终 token 协议**：

``
TOKEN    := '$' CODE [ PARAMS ] [ '|' FALLBACK ]
CODE     := [a-z][a-z0-9_]* ( '.' [a-z][a-z0-9_]* )+          -- ≥2 段
PARAMS   := '{' JSON_OBJECT '}'                              -- 可选
FALLBACK := 任意文本，不含 '|'

正则：
  /\$([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)(\{[^{}]*\})?(?:\|((?:(?!\$[a-z])[^|])*))?/g
``

⚠️ **正则两处关键**：
- `(?!\$[a-z])` —— 遇到 `$` **+ 字母**才停、遇到 `$` **+ 数字**继续吃 ⇒ `raise to $300,000` 不会被截断；
- `[a-z][a-z0-9_]*` 起头 ⇒ `$12,000`（数字开头）**不匹配** ⇒ 金额安全。

### 0.4 locale 键命名（三层）

``
calc_out.label.<key>          B-1 共享标签（跨工具共用，如 calc_out.label.starting_mrr）
calc_out.section.<key>        章节标题（共享，如 calc_out.section.mrr_snapshot）
calc_out.<alias>.row.<key>    B-2 行码（工具独有，如 calc_out.mrr.row.path_a）
``

⭐ **`<alias>` = 工具 slug 去掉 `solopreneur-` 前缀与 `-calculator` 后缀**，连字符换下划线：

| 工具 slug | alias |
|---|---|
| `solopreneur-mrr-calculator` | `mrr` |
| `solopreneur-rent-vs-buy-calculator` | `rent_vs_buy` |
| `solopreneur-brrr-calculator` | `brrrr` |
| `solopreneur-coupon-attribution-calculator` | `coupon_attribution` |
| `solopreneur-saas-valuation-calculator` | `saas_valuation` |
| `solopreneur-acv-calculator` | `acv` |
| `solopreneur-funnel-step-calculator` | `funnel_step` |
| `solopreneur-activation-rate-calculator` | `activation_rate` |
| `solopreneur-stickiness-calculator` | `stickiness` |
| `solopreneur-project-profitability-calculator` | `project_profitability` |

⚠️ **alias 必须全局唯一**（守卫 G2 会断言 100 个工具的 alias 两两不同）。

### 0.5 ⭐⭐ 三条判据 → 三个独立断言 + 一个产物层断言（一条变异只红一条）

| # | 判据 | 落在哪层 | 专属变异 |
|---|---|---|---|
| **G1** | locale 键的**译文质量**：zh ≠ en · 非占位 · **中文信息量 ≥ 英文 × 0.7** | source-only | P1 / P5 |
| **G2** | **模板表守恒（双向）**：引擎源码声明的 token 集合 == locale 的 `calc_out.*` 键集合 | source-only | P2 / P4 |
| **G3** | **两份实现一致**：`customFn` 声明的 token 集合 == `calculate()` 声明的 token 集合 | source-only | P3 |
| **G2b** | **`# P168 批次 3 · B3-7：zh 页结果卡片英文化 —— 引擎吐「标签码 + 值」，zh 侧查 locale 拼装（试点 10 个工具）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> ℹ️ **本计划 2026-11-12 起草 · 待执行。** 上游设计规格：`docs/superpowers/specs/2026-11-12-p168-b3-7-zh-calc-output-i18n-design.md`（commit `26f8f89`，已获用户逐节认可）。
> ℹ️ **本计划对 spec 有一处「精确化补全」**（spec §2.3 的 B-2 行码尾部语法未定义完整）—— 见 **§0.3「对 spec 的唯一一处补全」**，其余完全按 spec 执行。

**Goal:** 让 **10 个试点工具** 的 zh 页结果卡片（**首屏静态卡片 + 点「计算」后的动态卡片**）**全中文**，并建立一套可复用的机制与守卫，使后续铺开到其余 90 个引擎成为「重复劳动」而非「重新设计」。

**Architecture:** 引擎不再吐英文句子，而是吐**「语义码 + 值」**：`$calc_out.label.starting_mrr|Starting MRR      $12,000`。服务端与客户端**共用同一份纯逻辑渲染器**（`src/lib/calc-output-i18n.ts`），服务端查 locale 渲静态卡片、客户端查**服务端注入的模板子集**渲动态卡片 ⇒ 不会出现「静态中文、动态英文」的分裂。**token 自带英文兜底** ⇒ locale 缺键时降级到英文而不是显示裸 token。

**Tech Stack:** Node 20 · Astro 5 · `node:test` · 本仓库既有 `src/lib/decision-support.ts`（B3-4 的「建议码 + locale 模板」已验证形态）/ `src/lib/decision-tip-templates.ts` / `src/scripts/decision-support.client.ts` / `tests/_decision-support-fixture.ts`。

---

## 0. 执行前必读

### 0.1 本批要解决的缺陷（实测规模见 spec §0.2）

zh 页（`/zh/<slug>/`）的**结果卡片**整段是英文：页面框架（导航 / 按钮 / 决策区块 / FAQ）是中文，卡片里的**计算结果正文却是英文** ⇒ 同一页两种语言。

| # | 实测事实 | 依据 |
|---|---|---|
| 1 | **100/100** 引擎输出正文零中文 | `engine.generate()` + `staticExamples[0]` 全量跑 |
| 2 | 产物层**静态卡片**：**75/100 页**仍有整行英文，共 **2048 行** | 解析 `dist/zh/*/index.html` 的 `#static-results` |
| 3 | 产物层**动态卡片**：**100/100** 零中文；**1227/1905 行（64.4%）**整行英文 | 同上 |
| 4 | **86.6%** 的残留行是「`标签: 值`」形态；不同标签 **1091 种**，≥2 工具共用的 **58 种** | 标签切分统计 |
| 5 | ⭐⭐ `translateCalcOutput` **只在 SSR 静态路径（`:1394`）被调用**；客户端动态路径（`:2120~2185`）**根本没有翻译环节** | `src/pages/[lang]/[slug].astro` |
| 6 | 「去数字后」的英文形状 **1451 种**，其中 **1233 种只出现一次** ⇒ 逐条字面量对照表不可行 | 归一化统计 |

### 0.2 本批的边界（明确不做）

| 不做 | 理由 |
|---|---|
| 铺开到其余 90 个引擎 | 形态未验证；本批只为验证形态 + 攒每引擎耗时数据 |
| 清理 `translateCalcOutput` 的 129 个死键 | 与 `dead-i18n-keys-guard` 有依赖（§19.34 的「删键让别的门禁变红」教训） |
| 改任何引擎的**计算逻辑 / 阈值 / 输入定义** | 宪法：本批只碰「输出形态」 |
| 动 `staticExamples` 的生成机制 | `codegen-examples.mjs` 自动重生成即可 |

### 0.3 ⭐ 对 spec 的唯一一处补全（spec §2.3 的 B-2 语法精确化）

**spec 原文的 B-2 行码形态**：

``
• $calc_out.mrr.row.path_a|Path A — raise total contract value by {total} (same customers, larger deals) {total} $300,000 {note}
``

⚠️ **问题**：尾部 `{total} $300,000 {note}` 的**分隔规则没有定义完整**（`{note}` 后面跟什么？值与名怎么切？值里带空格怎么办？）。直接实现会产生歧义解析。

⭐ **本计划把它精确化为：「紧跟 code 的可选 JSON params」**：

``
• $calc_out.mrr.row.path_a{"total":"$300,000"}|Path A — raise total contract value by $300,000 (same customers, larger deals)
``

| 段 | 含义 | 约束 |
|---|---|---|
| `$` | token 前缀（避开 locale 里已有的 **97 个 `{param}` 键**，两者正交） | 引擎输出里 `$` 只以 `$数字` 形式出现 ⇒ 零误判 |
| `code` | 语义码 = **locale 键名**（渲染时去掉 `$` 即为键 ⇒ 一个正则同时完成「找 token」与「查键」，不需要第二张映射表） | ≥2 段、全小写、段内只允许 `[a-z0-9_]` |
| `params` | 可选 JSON 对象（紧跟 code，**无空格**） | 值里不得出现 `{` `}`（正则用 `[^{}]*` 界定）；**可以**出现 \`|` |
| `fallback` | \`|` 之后的英文原文（= 兜底文本） | **不得含 \`|`**（`beautifySections` 用 \`|` 分隔维度行）；**可以**含 `$数字`（金额）与 `{param}` |

⭐ **为什么这样比 spec 原形态更好**：
1. **无歧义** —— JSON 自带边界，不需要额外的分隔规则；
2. **与仓库既有约定同源** —— B3-4 的 `decision_tip` 已经是「码 + JSON params」；
3. **兜底仍可用** —— 删掉 en 键只会让页面退回**可读的英文**，不会显示裸 token；
4. **params 与 fallback 的值一致** —— 引擎用同一个变量同时生成 `params.total` 与 fallback 里的 `$300,000` ⇒ 两侧不可能漂。

⭐ **本批的最终 token 协议**：

``
TOKEN    := '$' CODE [ PARAMS ] [ '|' FALLBACK ]
CODE     := [a-z][a-z0-9_]* ( '.' [a-z][a-z0-9_]* )+          -- ≥2 段
PARAMS   := '{' JSON_OBJECT '}'                              -- 可选
FALLBACK := 任意文本，不含 '|'

正则：
  /\$([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)(\{[^{}]*\})?(?:\|((?:(?!\$[a-z])[^|])*))?/g
``

⚠️ **正则两处关键**：
- `(?!\$[a-z])` —— 遇到 `$` **+ 字母**才停、遇到 `$` **+ 数字**继续吃 ⇒ `raise to $300,000` 不会被截断；
- `[a-z][a-z0-9_]*` 起头 ⇒ `$12,000`（数字开头）**不匹配** ⇒ 金额安全。

### 0.4 locale 键命名（三层）

``
calc_out.label.<key>          B-1 共享标签（跨工具共用，如 calc_out.label.starting_mrr）
calc_out.section.<key>        章节标题（共享，如 calc_out.section.mrr_snapshot）
calc_out.<alias>.row.<key>    B-2 行码（工具独有，如 calc_out.mrr.row.path_a）
``

⭐ **`<alias>` = 工具 slug 去掉 `solopreneur-` 前缀与 `-calculator` 后缀**，连字符换下划线：

| 工具 slug | alias |
|---|---|
| `solopreneur-mrr-calculator` | `mrr` |
| `solopreneur-rent-vs-buy-calculator` | `rent_vs_buy` |
| `solopreneur-brrr-calculator` | `brrrr` |
| `solopreneur-coupon-attribution-calculator` | `coupon_attribution` |
| `solopreneur-saas-valuation-calculator` | `saas_valuation` |
| `solopreneur-acv-calculator` | `acv` |
| `solopreneur-funnel-step-calculator` | `funnel_step` |
| `solopreneur-activation-rate-calculator` | `activation_rate` |
| `solopreneur-stickiness-calculator` | `stickiness` |
| `solopreneur-project-profitability-calculator` | `project_profitability` |

⚠️ **alias 必须全局唯一**（守卫 G2 会断言 100 个工具的 alias 两两不同）。

### 0.5 ⭐⭐ 三条判据 → 三个独立断言 + 一个产物层断言（一条变异只红一条）

| # | 判据 | 落在哪层 | 专属变异 |
|---|---|---|---|
| **G1** | locale 键的**译文质量**：zh ≠ en · 非占位 · **中文信息量 ≥ 英文 × 0.7** | source-only | P1 / P5 |
| **G2** | **模板表守恒（双向）**：引擎源码声明的 token 集合 == locale 的 `calc_out.*` 键集合 | source-only | P2 / P4 |
| **G3** | **两份实现一致**：`customFn` 声明的 token 集合 == `calculate()` 声明的 token 集合 | source-only | P3 |
 只出现在 token 或金额形态**（token 协议不被误用） | source-only | — |
| **G4** | **产物层无残留 token**：zh 试点页 `#static-results` 里不出现 `$calc_out.` | build-dep | — |

⭐ **「zh 卡片全中文」为什么不需要第 5 条断言**：它由三条断言**链式推出** ——
**G2**（引擎吐的每个 token 都有 locale 键） + **G1**（每个键的 zh 是真译文、不是英文） + **G4**（没有 token 残留到产物） ⇒ **渲染出来的每一行都是中文**。
⇒ 所以**不要**再加一条「无整行英文」的产物层断言 —— 那会让「删一个 locale 键」这条变异同时红两条（G2 + 它），违反隔离纪律。

⭐ **G1 的口径**：CJK 字符记 **0.5**、Latin 词记 **1** —— 与 `tests/_decision-support-fixture.ts` 的 `infoUnits()` 同口径（自校准，不需要魔法数）。
⭐ **为什么用相对断言而不是绝对字数**：忠实的中文天然比英文短（实测 burn-rate en 63 → zh 48 ≈ **0.75**）⇒ 绝对字数会把每段忠实翻译都误判为「太短」。

### 0.6 ⚠️ 渲染顺序（**必须**遵守，否则 beautifySections 会失配）

客户端的 `beautifySections(text, config)` 靠**英文标记**识别区块（`Context:` / `Rate:` / `Per Request:` / `Selected Model Details` / `Cost Comparison` …）。

⭐ **关键机制**：token **自带英文兜底** ⇒ **token 化的文本里仍然含英文标记** ⇒ `beautifySections` 对 token 文本的判定与对英文原文的判定**完全一致**。

⭐⭐ **因此顺序必须是：先 beautify（看到 token 文本里的英文兜底）→ 再替换 token（出中文）**：

``
SSR 静态层：renderCalcOutput(英文/token 文本) → 中文   -- 爬虫看到中文 ✔
客户端静态层：beautifySections(token 文本) → 替换 token → 中文
客户端动态层：beautifySections(token 文本) → 替换 token → 中文
``

⚠️ **若先替换再 beautify**：中文里没有 `Rate:` 之类标记 ⇒ 区块识别与英文页**不一致** ⇒ en/zh 两页结构分叉 ⇒ **不可接受**。

⚠️ **章节标题的译文必须保留行首 emoji**（`🩺 📊 🔄 ⚖️ 🎯 💡`）—— `BIZ_V3_CONFIG.iconRegex = /[🩺📊🔄⚖️🎯💡]/u` 靠 emoji 认区块，翻译时把 emoji 去掉会让整段降级成普通文本块。

### 0.7 全局约束（每个 Task 都隐含包含）

- **宪法（AGENTS.md）**：本批**只碰「输出形态」** —— 不改任何引擎的**计算逻辑 / 阈值 / 输入定义**；不改 Roadmap / Phase；不新建工具。
- **判据落在不变量上**：代理指标 ≠ 真效果（禁止用「有几种取值」「大概翻译了」当判据）。
- **一个不变量只守一处**：G1/G2/G3/G4 各守一处，不重复设防。
- **一条变异只红一条断言**：台子必须核对**失败断言的名字**，不只是「有东西红了」。
- **产物层 ≠ 源码层**：源码层变异**不重建产物**（产物是陈旧的）⇒ 源码层变异只跑 source-only 断言。
- **验收数字必须入库为可复算工具**（`tests/scripts/`，文件名**不能**带 `.test.ts`，否则 `walkTestSuites` 计数漂移）。
- **用户规则**：完成改动后**先询问是否 commit/push**；push 前 `git fetch` + 确认 **0 behind**；**禁止 force-push**。
- **编码**：文件无 BOM、全 LF；commit 信息用 `git commit -F <utf8file>`（PowerShell `>` 会写 UTF-16LE+BOM）。
- **commit 信息**：`type(scope): 中文标题` + 正文含**实测数字**；**绝不能**含 `[CI Skip]` / `[Skip CI]` / `[CF-Pages-Skip]`。
- **Windows**：PowerShell 没有 `head`；`Get-ChildItem -Path 'src\\pages\\[lang]'` 的通配符要用 `-LiteralPath`；内联 `node -e` 会被引号规则打爆 ⇒ 一律写成 `tmp/*.mjs` 再跑；`git` 远端操作要在**同一条命令**里设 `$env:GIT_SSH_COMMAND='C:/Windows/System32/OpenSSH/ssh.exe'; $env:GIT_SSH_VARIANT='external'`。
- **维度 3 scan**：本计划末尾 + CHANGELOG 必须有「维度 3 scan: 基于信号 X / Y / Z」声明。
- **`bing-block-urls.csv` 保持未跟踪**，不得提交。

### 0.8 依赖链（**顺序不能反**）

``
① src/lib/calc-output-i18n.ts（纯逻辑）+ 单测
   ↓
② src/lib/calc-output-templates.ts（服务端查 locale + 子集注入）
   ↓
③ src/scripts/calc-output.client.ts（客户端读 DOM 模板表 + 替换 token）
   ↓
④ src/pages/[lang]/[slug].astro 接线（静态渲染 + 动态事件 + DOM 注入）
   ↓
⑤ 10 个引擎 token 化（可并行）+ locale 键落库
   ↓
⑥ node scripts/codegen-examples.mjs（重生成 staticExamples[0]）+ --check
   ↓
⑦ 守卫 G1/G2/G3/G4 + 变异台子 P1~P5 + 体检脚本
   ↓
⑧ 全量验收（tsc / 构建 / 守卫 / 台子 / 全量套件）
   ↓
⑨ 文档同步（AGENTS 维度行 / 规格 §19.35 / CHANGELOG / INDEX）
``

⚠️ **⑤⑥ 的顺序不能反**：引擎改完必须先重生成 `staticExamples`，否则产物是陈旧的（旧英文）⇒ G4 会误红。

---

## Task 0: 取证复核（结论已存档，随实现复核）

**Files:** 只读（`dist/zh/*/index.html` · `src/i18n/locales/{en,zh}.json` · `src/engines/**` · `src/pages/[lang]/[slug].astro`）

**实测结论见 §0.1（全部来自本仓库当前产物与源码，非推断）。**

**执行时需复核的 3 件事**：

- [ ] **Step 1: 复核产物层残留行数** —— 打开 `dist/zh/solopreneur-mrr-calculator/index.html`（`dist/` 不存在则先跑一次 `pnpm build`），在 `#static-results` 区块里数一数**整行没有中文**的行数；mrr 应约 **60 行**。明显不符就停下来核对，别硬往下做。**精确基线由 Task 18 的体检脚本产出。**
- [ ] **Step 2: 复核 `translateCalcOutput` 的调用点** —— `grep -n "translateCalcOutput" src/pages/[lang]/[slug].astro` 应只有**一个**调用点（约 `:1394`，SSR 静态路径）；客户端动态路径（`:2120~2185`）**没有**调用 ⇒ 这是本批必须补的洞。
- [ ] **Step 3: 复核 10 个试点引擎的形态** —— 逐个读引擎源码，记录：① 是否 `clientConfig.type === 'custom'`（决定有没有 `customFn` 双实现）；② 章节标题清单；③ 每行的标签/值切分。**这份记录是 Task 4~13 的输入**，写进 `tmp/pilot-line-inventory.md`（不入库）。

---

## Task 1: 核心纯逻辑模块 —— token 解析 + 渲染

**Files:**
- Create: `src/lib/calc-output-i18n.ts`
- Test: `tests/calc-output-i18n-guard.test.ts`（与 G1/G2/G3 同文件，见 Task 7）

**Interfaces:**
- Consumes: 无（**不得 import locale**，否则客户端 bundle 会被拖进 1.9MB —— 与 `src/lib/decision-support.ts` 同约束）
- Produces:
  - `CALC_OUTPUT_TOKEN_RE: RegExp` —— token 正则（全局，带 `g`）
  - `makeToken(code: string, fallback: string, params?: Record<string, string>): string` —— 引擎侧构造 token
  - `renderCalcOutput(text: string, templates: Record<string, string>): string` —— 渲染（查 `templates`，缺则用 fallback）
  - `extractTokenCodes(text: string): string[]` —— 抽出文本里出现的全部 code（守恒断言用）

### Step 1: 写失败的测试

在 `tests/calc-output-i18n-guard.test.ts` 顶部创建文件，先写这几条**单元断言**（它们守「token 协议本身」这个不变量，与 G1/G2/G3 分开）：

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CALC_OUTPUT_TOKEN_RE,
  makeToken,
  renderCalcOutput,
  extractTokenCodes,
} from '../src/lib/calc-output-i18n.ts';

test('B3-7 token 协议：code 段数 ≥2、全小写、段内只允许 [a-z0-9_]', () => {
  assert.ok(CALC_OUTPUT_TOKEN_RE.global, '正则必须带 g（要替换全部 token）');
  assert.match(makeToken('calc_out.label.starting_mrr', 'Starting MRR'), /^\$calc_out\.label\.starting_mrr\|/);
  // $ + 数字（金额）不是 token
  assert.deepEqual(extractTokenCodes('Total: $12,000 and $300,000'), []);
  // 三段 / 四段都合法
  assert.deepEqual(extractTokenCodes('$calc_out.label.a'), ['calc_out.label.a']);
  assert.deepEqual(extractTokenCodes('$calc_out.mrr.row.path_a'), ['calc_out.mrr.row.path_a']);
});

test('B3-7 token 协议：params 是紧跟 code 的 JSON，fallback 在第一个 | 之后', () => {
  const tok = makeToken('calc_out.mrr.row.path_a', 'Path A — raise total contract value by $300,000', { total: '$300,000' });
  assert.match(tok, /^\$calc_out\.mrr\.row\.path_a\{"total":"\$300,000"\}\|Path A/);
});

test('B3-7 渲染：命中 locale 键 ⇒ 用模板并插值 params', () => {
  const tok = makeToken('calc_out.mrr.row.path_a', 'Path A — raise total contract value by $300,000', { total: '$300,000' });
  const out = renderCalcOutput('• ' + tok, {
    'calc_out.mrr.row.path_a': '路径 A —— 把合同总价值提高到 {total}（同样的客户数，更大的单子）',
  });
  assert.equal(out, '• 路径 A —— 把合同总价值提高到 $300,000（同样的客户数，更大的单子）');
});

test('B3-7 渲染：locale 缺键 ⇒ 降级到英文兜底（不显示裸 token）', () => {
  const tok = makeToken('calc_out.label.starting_mrr', 'Starting MRR');
  const out = renderCalcOutput('• ' + tok, {});
  assert.equal(out, '• Starting MRR');
  assert.ok(!out.includes('$calc_out'), '降级后不得残留裸 token');
});

test('B3-7 渲染：locale 缺键且 fallback 为空 ⇒ 保留 token 原文（让守卫在 CI 里变红）', () => {
  const out = renderCalcOutput('$calc_out.label.x', {});
  assert.equal(out, '$calc_out.label.x');
});

test('B3-7 渲染：兜底里的金额不被截断（$ + 数字继续吃，$ + 字母才停）', () => {
  const tok = makeToken('calc_out.mrr.row.milestone', '$20,000.00 MRR: 2.2 months');
  const out = renderCalcOutput(tok, {});
  assert.equal(out, '$20,000.00 MRR: 2.2 months');
});

test('B3-7 渲染：模板里没有对应 param 时占位符原样保留（不静默吞掉）', () => {
  const tok = makeToken('calc_out.x.row.y', 'en {missing}', { other: 'v' });
  const out = renderCalcOutput(tok, { 'calc_out.x.row.y': '中文 {missing}' });
  assert.equal(out, '中文 {missing}');
});

test('B3-7 共享模块：不得 import locale（客户端 bundle 会被拖进 1.9MB）', () => {
  const src = readFileSync(resolve(process.cwd(), 'src/lib/calc-output-i18n.ts'), 'utf8');
  assert.doesNotMatch(src, /from '\\.\\.\\/i18n/);
  assert.doesNotMatch(src, /locales\\//);
});
```

### Step 2: 跑测试，确认失败

Run:
```
cmd.exe /c "node node_modules\\tsx\\dist\\cli.mjs --test --test-concurrency=1 tests\\calc-output-i18n-guard.test.ts"
```
Expected: FAIL —— `Cannot find module '../src/lib/calc-output-i18n.ts'`

### Step 3: 实现最小可用的模块

创建 `src/lib/calc-output-i18n.ts`：

```ts
// P168 B3-7 —— 计算结果卡片的「语义码 + 值」渲染：**唯一实现**。
//
// ⭐ 为什么是纯逻辑、不 import locale
//   locale（en.json 970KB + zh.json 944KB）一旦被客户端 import
//   ⇒ 每个工具页的客户端 bundle 被拖进 1.9MB。
//   ⇒ 模板查找留在服务端（src/lib/calc-output-templates.ts）；
//      客户端只拿「服务端查好的模板表」（DOM 属性），像 B3-4 那样。
//
// ⭐ 为什么 token 用 '$' 前缀
//   locale 里已有 97 个键用 {param} 占位符（fillTemplate 逐个替换）
//   ⇒ token 若也写成 {ns.key}，替换顺序会产生歧义。
//   ⇒ '$' 与 '{param}' 完全正交；且引擎输出里 '$' 只以 '$数字' 形式出现。
//
// ⭐ token 自带英文兜底（'码|英文原文'）
//   token 化把英文换走了 ⇒ 原文案在运行时已不存在
//   ⇒ 若 locale 缺键，没有任何地方能拿到兜底文本 ⇒ 页面会显示裸 token。
//   ⇒ 把英文原文塞进 token ⇒ 缺键时降级到「可读的英文」而不是裸码。
//
// ⭐ 渲染顺序：先 beautify（看到 token 里的英文兜底，区块识别与英文页一致）
//   → 再替换 token（出中文）。反过来会让 en/zh 两页结构分叉。

/** locale 里存计算结果模板的键前缀 */
export const CALC_OUTPUT_KEY_PREFIX = 'calc_out.';

/**
 * token 正则（全局）。
 *
 * 分三组：
 *   1) code      —— ≥2 段、全小写、段内只允许 [a-z0-9_]（$12,000 不匹配）
 *   2) params    —— 可选 JSON，紧跟 code（值里不得有 { }）
 *   3) fallback  —— 第一个 | 之后；遇到 $ + 字母才停、$ + 数字继续吃
 *      （否则 'raise to $300,000' 会被截断）
 */
export const CALC_OUTPUT_TOKEN_RE =
  /\$([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)(\{[^{}]*\})?(?:\|((?:(?!\$[a-z])[^|])*))?/g;

/** 渲染结果卡片的文本：命中模板用模板，缺键降级到英文兜底 */
export type RenderCalcOutput = (text: string, templates: Record<string, string>) => string;

/**
 * 构造一个 token（引擎侧用）。
 *
 * ⭐ params 的值与 fallback 里出现的金额**必须来自同一个变量**
 *   ⇒ 英文兜底与中文模板不可能漂。
 */
export function makeToken(code: string, fallback: string, params?: Record<string, string>): string {
  const p = params && Object.keys(params).length > 0 ? JSON.stringify(params) : '';
  return '$' + code + p + '|' + fallback;
}

/** 抽出文本里出现的全部 token code（守恒断言用） */
export function extractTokenCodes(text: string): string[] {
  const out = new Set<string>();
  if (!text) return [];
  const re = new RegExp(CALC_OUTPUT_TOKEN_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.add(m[1]);
  return [...out].sort();
}

/**
 * 把文本里的 token 替换成模板文本。
 *
 * ⭐ 模板缺失 ⇒ 用 token 自带的英文兜底（可读）；兜底也为空 ⇒ 保留 token 原文
 *   （守卫负责让这种情况在 CI 里变红，页面不会显示空串）。
 */
export const renderCalcOutput: RenderCalcOutput = (text, templates) => {
  if (!text) return text;
  const re = new RegExp(CALC_OUTPUT_TOKEN_RE.source, 'g');
  return String(text).replace(re, (m, code: string, rawParams?: string, fallback?: string) => {
    let params: Record<string, string> = {};
    if (rawParams) {
      try {
        const parsed = JSON.parse(rawParams);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          for (const [k, v] of Object.entries(parsed)) params[k] = String(v);
        }
      } catch {
        params = {};
      }
    }
    let tmpl = templates ? templates[code] : undefined;
    if (typeof tmpl !== 'string' || tmpl.length === 0) {
      tmpl = typeof fallback === 'string' && fallback.length > 0 ? fallback : m;
    }
    return tmpl.replace(/\{(\w+)\}/g, (_, k: string) => (params[k] != null ? params[k] : '{' + k + '}'));
  });
};
```

### Step 4: 实现三条 source-only 判据（G1 / G2 / G2b / G3）

⭐ **为什么放在这一步**：Task 6~15 的引擎任务要靠 G2/G3 验收（跑守卫看它从红变绿）⇒ 守卫必须先于引擎任务存在。

把下面这段追加到 `tests/calc-output-i18n-guard.test.ts`：

```ts
// ═══ P168 B3-7 的四条 source-only 判据 ═══
// （本段需要的 import：readdirSync / readFileSync 来自 'node:fs'；resolve 来自 'node:path'；
//   infoUnits / readLocale / MIN_ZH_TO_EN_RATIO / ROOT 来自 './_decision-support-fixture.ts'）

/** 引擎文件里出现的所有 token code（两种写法都要认） */
function tokenCodesIn(text: string): string[] {
  const out = new Set<string>();
  // ① 直接字面量：'$calc_out.label.starting_mrr'
  for (const m of text.matchAll(/\$([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)/g)) out.add(m[1]);
  // ② 构造器调用：makeToken('calc_out.x.y', ...) / tok('calc_out.x.y', ...)
  //   ⚠️ customFn 里没有 '$' 前缀（它是字符串字面量里的裸 code）⇒ 必须单独认
  for (const m of text.matchAll(/(?:tok|makeToken)\(\s*['"]([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)['"]/g)) {
    out.add(m[1]);
  }
  return [...out].sort();
}

/** slug → 引擎文件（扫 src/engines/** 解析 slug 字面量，不硬编码路径表） */
function engineFileBySlug(): Map<string, string> {
  const map = new Map<string, string>();
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith('.ts') && e.name !== 'index.ts') {
        const src = readFileSync(file, 'utf8');
        const m = /slug:\s*(?:'([^']+)'|"([^"]+)")/.exec(src);
        if (m) map.set(m[1] || m[2], full);
      }
    }
  };
  walk(resolve(ROOT, 'src', 'engines'));
  return map;
}

/**
 * 把引擎文件按「服务端区 / customFn 区」切开。
 *
 * ⭐ custom 引擎的文件布局是稳定的：
 *     <calculate 实现> … const customFn = "…" … const engine = { … }
 *   ⇒ 服务端区 = customFn 声明之前；客户端区 = customFn 声明之后、engine 对象之前。
 *   ⇒ engine 对象（含 staticExamples）**不参与比较** ——
 *     staticExamples 是 generate() 的产物，两边天然一致，比它没有意义。
 */
function splitEngineRegions(src: string): { server: string; client: string } | null {
  const fnAt = src.indexOf('const customFn');
  if (fnAt < 0) return null;
  const engineAt = src.indexOf('const engine', fnAt);
  if (engineAt < 0) return null;
  return { server: src.slice(0, fnAt), client: src.slice(fnAt, engineAt) };
}

// ── G1：译文质量（zh ≠ en · 非占位 · 信息量 ≥ 英文 × 0.7）────────────────
test('P168 B3-7 G1：calc_out.* 的 zh 译文不是英文原文、不是占位、厚度达标', () => {
  const locales = { en: readLocale('en'), zh: readLocale('zh') } as const;
  const keys = Object.keys(locales.zh).filter((k) => k.startsWith('calc_out.'));
  assert.ok(keys.length > 0, 'locale 里没有任何 calc_out.* 键');
  const problems: string[] = [];
  for (const key of keys) {
    const en = locales.en[key];
    const zh = locales.zh[key];
    if (typeof en !== 'string' || typeof zh !== 'string') {
      problems.push(key + ' 在 en/zh 有一边缺失');
      continue;
    }
    if (zh === en) problems.push(key + ' 的 zh 与 en 逐字相同（没翻）');
    if (zh.includes('用此计算器')) problems.push(key + ' 是占位模板');
    const enU = infoUnits(en);
    const zhU = infoUnits(zh);
    if (enU > 0 && zhU < enU * MIN_ZH_TO_EN_RATIO) {
      problems.push(key + ' 的中文只有英文的 ' + (zhU / enU).toFixed(2) + '（下限 ' + MIN_ZH_TO_EN_RATIO + '）');
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

// ── G2：模板表守恒（双向）────────────────────────────────────────────────
test('P168 B3-7 G2：calc_out.* 模板表守恒（引擎声明的 token 集合 == locale 键集合，双向）', () => {
  const locales = { en: readLocale('en'), zh: readLocale('zh') } as const;
  const declared = new Set<string>();
  for (const file of engineFileBySlug().values()) {
    for (const code of tokenCodesIn(readFileSync(file, 'utf8'))) declared.add(code);
  }
  const problems: string[] = [];
  for (const lang of ['en', 'zh'] as const) {
    const localeKeys = Object.keys(locales[lang]).filter((k) => k.startsWith('calc_out.')).sort();
    // 方向一：引擎吐的每个 token 都必须有 locale 键（否则 zh 页显示裸 token）
    for (const code of [...declared].sort()) {
      if (!localeKeys.includes(code)) {
        problems.push(lang + '：引擎声明了 ' + code + '，但 locale 没有这个键');
      }
    }
    // 方向二：locale 的每个键都必须被引擎声明（否则是死键）
    for (const key of localeKeys) {
      if (!declared.has(key)) {
        problems.push(lang + '：locale 有 ' + key + '，但没有任何引擎声明它（死键）');
      }
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

// ── G2b：'$' 只出现在 token 或金额形态（token 协议不被误用）───────────────
test('P168 B3-7 G2b：引擎示例输出里的 "$" 只出现在 token 或金额形态', () => {
  const problems: string[] = [];
  for (const [slug, file] of engineFileBySlug()) {
    const src = readFileSync(file, 'utf8');
    // staticExamples 的字符串字面量（够用：它是 generate() 的产物）
    const samples = src.match(/staticExamples:\s*\[([\s\S]*?)\]/);
    if (!samples) continue;
    for (const m of samples[1].matchAll(/\$([^a-z\s])/g)) {
      if (/[0-9]/.test(m[1])) continue;          // $数字 = 金额 ✔
      problems.push(slug + '：示例里出现了非金额的 "$' + m[1] + '"');
    }
    // 引擎源码里 '$' + 字母 但不是 token 的形态（说明协议被误用）
    for (const m of src.matchAll(/\$([a-z][A-Za-z0-9_]*)/g)) {
      if (m[0].startsWith('$calc_out')) continue;
      problems.push(slug + '：源码里出现 "$' + m[1] + '"（既不是金额也不是 token）');
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

// ── G3：两份实现（calculate / customFn）声明的 token 集合一致 ────────────
test('P168 B3-7 G3：customFn 声明的 token 集合 == calculate() 声明的 token 集合', () => {
  const problems: string[] = [];
  let checked = 0;
  for (const [slug, file] of engineFileBySlug()) {
    const regions = splitEngineRegions(readFileSync(file, 'utf8'));
    if (!regions) continue;   // 非 custom 引擎（没有客户端实现）⇒ 本判据不适用
    checked += 1;
    const server = tokenCodesIn(regions.server);
    const client = tokenCodesIn(regions.client);
    if (JSON.stringify(server) !== JSON.stringify(client)) {
      problems.push(slug + '：服务端 ' + JSON.stringify(server) + ' vs 客户端 ' + JSON.stringify(client));
    }
  }
  assert.ok(checked >= 10, '只检查到 ' + checked + ' 个 custom 引擎（期望 ≥ 10）');
  assert.deepEqual(problems, [], problems.join(' | '));
});
```

⚠️ **G3 的覆盖面**：断言「custom 引擎数 ≥ 10」—— 若某个引擎的布局被改到 splitEngineRegions 切不出来，会被静默跳过 ⇒ 用这条断言兜住。
⚠️ **G2b 是独立的第四条断言**（spec §2.3 要求的「输出里除 '$' + 数字与 token 外，无其它 '$' 出现」）—— 它与 G2 是**不同不变量** ⇒ 单独一条测试。
⚠️ **守卫文件里不要出现 `process.env.RUN_BUILD_TESTS`** —— 它必须保持 source-only（build-dep 判定靠这个字符串）。

### Step 5: 跑测试

Run:
```cmd.exe /c "node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\calc-output-i18n-guard.test.ts"
```
Expected: PASS —— **18 个测试全绿**（Task 1 的 8 个单元断言 + Task 2 的 2 个 + Task 3 的 1 个 + Task 4 的 3 个 + 本步的 4 个）。

⚠️ **此时 locale 里还没有 `calc_out.*` 键** ⇒ G1/G2 会红（locale 键为空 / 引擎还没 token 化）、G2b 会绿（引擎还没 token 化 ⇒ 没有非法 '$'）、G3 会绿（两边都还没有 token）。
⇒ **本 Task 结束时「G1 / G2 / 模板子集为空」三条预期是红的**（locale 键在 Task 6~15 的引擎任务 + Task 16 落库）。
⇒ **判定**：只要**除这三条外**的断言全绿即可继续；locale 键落库后（Task 16 末）必须全绿。

### Step 5: Commit

```bash
git add src/lib/calc-output-i18n.ts tests/calc-output-i18n-guard.test.ts
git commit -m "feat(i18n): P168 B3-7 —— 计算结果 token 协议与纯逻辑渲染器"
```

---

## Task 2: 服务端模板模块 + 三条 source-only 判据（G1 / G2 / G2b / G3）

**Files:**
- Create: `src/lib/calc-output-templates.ts`
- Test: `tests/calc-output-i18n-guard.test.ts`（追加 2 条 + Step 4 的 4 条判据）

**Interfaces:**
- Consumes: `src/i18n/locales/{en,zh}.json`（**服务端专用**）、`src/lib/calc-output-i18n.ts` 的 `CALC_OUTPUT_KEY_PREFIX`
- Produces:
  - `calcOutputTemplates(lang: 'en' | 'zh', alias: string): Record<string, string>` —— 该 lang 下**本工具要注入的模板子集**
  - `calcOutputTemplatesJson(lang: 'en' | 'zh', alias: string): string` —— 给 DOM 属性用的 JSON 串（`<` 转义 ⇒ 不会截断 `</script>`）
  - `toolAlias(slug: string): string` —— slug → alias（去 `solopreneur-` 前缀 / `-calculator` 后缀，连字符 → 下划线）

### Step 1: 写失败的测试

追加到 `tests/calc-output-i18n-guard.test.ts`：

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tools } from '../src/data/tools';
import {
  calcOutputTemplates,
  calcOutputTemplatesJson,
  toolAlias,
} from '../src/lib/calc-output-templates.ts';

test('B3-7 alias：slug → alias（去前缀/后缀、连字符换下划线），100 个工具两两不同', () => {
  assert.equal(toolAlias('solopreneur-mrr-calculator'), 'mrr');
  assert.equal(toolAlias('solopreneur-rent-vs-buy-calculator'), 'rent_vs_buy');
  assert.equal(toolAlias('solopreneur-funnel-step-calculator'), 'funnel_step');
  // ⭐ 100 个工具的 alias 必须两两不同（否则行码会跨工具串味）
  const aliases = new Set<string>();
  const dup: string[] = [];
  for (const tool of tools) {
    const a = toolAlias(tool.slug);
    if (aliases.has(a)) dup.push(a);
    aliases.add(a);
  }
  assert.deepEqual(dup, [], 'alias 重复：' + dup.join(', '));
});

test('B3-7 模板子集：共享 label/section + 本工具 row；不含别的工具的 row', () => {
  const tpls = calcOutputTemplates('zh', 'mrr');
  const keys = Object.keys(tpls);
  assert.ok(keys.length > 0, '模板子集为空');
  for (const k of keys) {
    assert.ok(k.startsWith('calc_out.'), '键前缀不对：' + k);
    const second = k.split('.')[1];
    assert.ok(
      second === 'label' || second === 'section' || second === 'mrr',
      '混进了别的工具的行码：' + k,
    );
  }
  // 注入用的 JSON 串不含裸 <（防 </script> 截断）
  const json = calcOutputTemplatesJson('zh', 'mrr');
  assert.ok(!json.includes('<'), 'JSON 里出现裸 <');
  assert.doesNotThrow(() => JSON.parse(json));
});
```

### Step 2: 跑测试，确认失败

Run: ```cmd.exe /c "node node_modules\\tsx\\dist\\cli.mjs --test --test-concurrency=1 tests\\calc-output-i18n-guard.test.ts"```
Expected: FAIL —— `Cannot find module '../src/lib/calc-output-templates.ts'`

### Step 3: 实现

创建 `src/lib/calc-output-templates.ts`：

```ts
// P168 B3-7 —— 计算结果模板的**服务端侧**：locale 里的 calc_out.* 键。
//
// ⭐ 与 src/lib/decision-tip-templates.ts 同构（B3-4 已验证的做法）：
//   · 服务端查 locale → 渲静态卡片；
//   · 同一张表的**子集**序列化进 DOM 属性 → 客户端 customFn 渲动态卡片。
//   ⇒ 静态中文、动态英文的分裂在结构上不可能发生。
//
// ⭐ 只注入**本工具用得到的子集**（共享 label/section + 本工具 row）
//   —— 100 个工具全量注入会让每个页面多带几十 KB。

import en from '../i18n/locales/en.json';
import zh from '../i18n/locales/zh.json';
import { CALC_OUTPUT_KEY_PREFIX } from './calc-output-i18n';

export type CalcOutLang = 'en' | 'zh';

const LOCALES: Record<CalcOutLang, Record<string, string>> = { en, zh };

/** slug → alias：去 'solopreneur-' 前缀 / '-calculator' 后缀，连字符换下划线 */
export function toolAlias(slug: string): string {
  return slug
    .replace(/^solopreneur-/, '')
    .replace(/-calculator$/, '')
    .replace(/-/g, '_');
}

/**
 * 该 lang 下、本工具要注入的模板子集。
 *
 * 组成：
 *   · calc_out.label.*    —— 跨工具共享的标签（全部）
 *   · calc_out.section.*  —— 跨工具共享的章节标题（全部）
 *   · calc_out.<alias>.*  —— 本工具独有的行码（全部）
 *
 * ⭐ 别的工具的 row **不注入** —— 客户端根本不会吐那些 code。
 */
export function calcOutputTemplates(lang: CalcOutLang, alias: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(LOCALES[lang] ?? {})) {
    if (!k.startsWith(CALC_OUTPUT_KEY_PREFIX)) continue;
    if (typeof v !== 'string') continue;
    const second = k.slice(CALC_OUTPUT_KEY_PREFIX.length).split('.')[0];
    if (second === 'label' || second === 'section' || second === alias) out[k] = v;
  }
  return out;
}

/** 给 DOM 属性用的 JSON 串：'<' 转义 ⇒ 不会截断 </script> */
export function calcOutputTemplatesJson(lang: CalcOutLang, alias: string): string {
  return JSON.stringify(calcOutputTemplates(lang, alias)).replace(/</g, '\\\\u003c');
}
```

### Step 4: 跑测试，确认全绿

Run: ```cmd.exe /c "node node_modules\\tsx\\dist\\cli.mjs --test --test-concurrency=1 tests\\calc-output-i18n-guard.test.ts"```
Expected: PASS —— 10 个测试全绿。

⚠️ **此时模板子集是空的**（locale 里还没有 `calc_out.*` 键）⇒ `calcOutputTemplates` 返回 `{}` ⇒ 「模板子集为空」那条会红。
⇒ **本 Task 结束时该测试可能仍是红的**（这是预期的：locale 键在 Task 4~13 落库）。
⇒ **判定**：只要**除「模板子集非空」外**的断言全绿即可继续；locale 键落库后（Task 13 末）必须全绿。

### Step 5: Commit

```bash
git add src/lib/calc-output-templates.ts tests/calc-output-i18n-guard.test.ts
git commit -m "feat(i18n): P168 B3-7 —— 服务端模板表（查 locale + 子集注入）"
```

---

## Task 3: 客户端模块 —— 读 DOM 模板表 + 替换 DOM 里的 token

**Files:**
- Create: `src/scripts/calc-output.client.ts`
- Test: `tests/calc-output-i18n-guard.test.ts`（追加 1 条接线断言）

**Interfaces:**
- Consumes: `src/lib/calc-output-i18n.ts` 的 `renderCalcOutput`（**唯一实现** —— 客户端与服务端共用同一份）
- Produces:
  - 监听 DOM 事件 `ffk:calc-output-rendered`（`detail.container` = 要处理的容器元素）
  - 导出常量 `CALC_OUTPUT_RENDERED_EVENT = 'ffk:calc-output-rendered'`
- DOM 契约：模板表放在 `#static-results` 的 `data-calc-output-templates` 属性里（JSON）

### Step 1: 写失败的测试

追加到 `tests/calc-output-i18n-guard.test.ts`：

```ts
test('B3-7 接线：客户端模块必须复用共享渲染器（不得自带第二份实现）', () => {
  const src = readFileSync(resolve(process.cwd(), 'src/scripts/calc-output.client.ts'), 'utf8');
  assert.match(src, /from '\\.\\.\\/lib\\/calc-output-i18n'/, '客户端没有 import 共享渲染器');
  assert.doesNotMatch(src, /locales\\//, '客户端不得直接读 locale');
});
```

### Step 2: 跑测试，确认失败

Run: ```cmd.exe /c "node node_modules\\tsx\\dist\\cli.mjs --test --test-concurrency=1 tests\\calc-output-i18n-guard.test.ts"```
Expected: FAIL —— 文件不存在。

### Step 3: 实现

创建 `src/scripts/calc-output.client.ts`：

```ts
// P168 B3-7 —— 结果卡片的**客户端**部分：把 DOM 里的 token 换成中文模板。
//
// ⭐ 为什么是独立模块而不是内联脚本
//   内联的 define:vars 脚本不能 import ⇒ 若把渲染逻辑写进去，
//   就与服务端形成**两份实现** ⇒ 两边会漂。
//   ⇒ 渲染逻辑住在 src/lib/calc-output-i18n.ts（唯一实现），
//      本模块 import 它；服务端也 import 同一个文件 ⇒ 一份实现、两处调用。
//
// ⭐ 为什么用事件而不是直接改 DOM
//   内联脚本在 HTML 解析期执行（早于本模块加载）⇒ 事件会漏。
//   ⇒ 双保险：① 本模块加载时无条件扫一遍 #static-results / #dynamic-results；
//      ② 内联脚本在**动态卡片渲染完之后**派发事件 ⇒ 事件到达时本模块已就绪。
//
// ⭐ 模板表从 DOM 读（客户端 bundle 不带 locale）
//   与 B3-4 的 data-tip-templates 同一套路。

import { renderCalcOutput } from '../lib/calc-output-i18n';

/** 事件名（与 [slug].astro 内联脚本里派发的名字必须一致） */
export const CALC_OUTPUT_RENDERED_EVENT = 'ffk:calc-output-rendered';

interface RenderedDetail {
  /** 要处理的容器（静态卡片或动态卡片） */
  container?: HTMLElement | null;
}

/** 从 DOM 读服务端注入的模板表 */
function readTemplates(): Record<string, string> {
  const host = document.getElementById('static-results');
  const raw = host?.getAttribute('data-calc-output-templates');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/**
 * 把容器里的 token 换成模板文本。
 *
 * ⭐ 只处理**文本节点**：容器的 HTML 结构（h3 标题 / .font-mono 正文 /
 *   复制按钮的 data-copy 属性）都要一起换，否则用户复制出来的是裸 token。
 */
function renderContainer(container: HTMLElement, templates: Record<string, string>): void {
  if (!templates || Object.keys(templates).length === 0) return;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node = walker.nextNode();
  while (node) {
    textNodes.push(node as Text);
    node = walker.nextNode();
  }
  for (const t of textNodes) {
    const raw = t.nodeValue;
    if (!raw || !raw.includes('$calc_out.')) continue;
    t.nodeValue = renderCalcOutput(raw, templates);
  }

  // data-copy / data-export 里也可能有 token（复制/导出用的是原始文本）
  container.querySelectorAll('[data-copy], [data-export]').forEach((el) => {
    for (const attr of ['data-copy', 'data-export']) {
      const v = el.getAttribute(attr);
      if (v && v.includes('$calc_out.')) el.setAttribute(attr, renderCalcOutput(v, templates));
    }
  });
}

function renderAll(): void {
  const templates = readTemplates();
  if (!templates || Object.keys(templates).length === 0) return;
  for (const id of ['static-results', 'dynamic-results']) {
    const el = document.getElementById(id);
    if (el) renderContainer(el, templates);
  }
}

document.addEventListener(CALC_OUTPUT_RENDERED_EVENT, (event) => {
  const detail = (event as CustomEvent<RenderedDetail>).detail;
  const container = detail?.container ?? null;
  if (!container) {
    renderAll();
    return;
  }
  renderContainer(container, readTemplates());
});

// ⭐ 页面加载时扫一遍（内联脚本的静态卡片 beautify 早于本模块加载 ⇒ 事件会漏）
renderAll();
```

### Step 4: 跑测试，确认全绿

Run: ```cmd.exe /c "node node_modules\\tsx\\dist\\cli.mjs --test --test-concurrency=1 tests\\calc-output-i18n-guard.test.ts"```
Expected: 接线断言 PASS（其余断言状态同 Task 2 末尾）。

### Step 5: Commit

```bash
git add src/scripts/calc-output.client.ts tests/calc-output-i18n-guard.test.ts
git commit -m "feat(i18n): P168 B3-7 —— 客户端 token 替换模块（复用共享渲染器）"
```

---

## Task 4: 页面接线 —— 静态渲染 + 动态事件 + DOM 注入

**Files:**
- Modify: `src/pages/[lang]/[slug].astro`（3 处）
- Test: `tests/calc-output-i18n-guard.test.ts`（追加 3 条接线断言）

**Interfaces:**
- Consumes: `src/lib/calc-output-i18n.ts` 的 `renderCalcOutput`；`src/lib/calc-output-templates.ts` 的 `calcOutputTemplatesJson` / `toolAlias`；`src/scripts/calc-output.client.ts` 的 `CALC_OUTPUT_RENDERED_EVENT`
- Produces: DOM 属性 `#static-results[data-calc-output-templates]`（JSON 串）

### Step 1: 写失败的测试

追加到 `tests/calc-output-i18n-guard.test.ts`：

```ts
// （本段需要 readFileSync 来自 'node:fs'、resolve 来自 'node:path'；Task 1 已引入）
const astroSrc = readFileSync(resolve(process.cwd(), 'src/pages/[lang]/[slug].astro'), 'utf8');

test('B3-7 接线：静态卡片必须先渲染 token 再走 translateCalcOutput（顺序不能反）', () => {
  const renderAt = astroSrc.indexOf('renderCalcOutput(');
  const translateAt = astroSrc.indexOf('translateCalcOutput(ex');
  assert.ok(renderAt > 0, '静态路径没有调用 renderCalcOutput');
  assert.ok(translateAt > 0, '静态路径没有调用 translateCalcOutput');
  assert.ok(renderAt < translateAt, 'renderCalcOutput 必须排在 translateCalcOutput 之前');
});

test('B3-7 接线：模板子集必须注入到 #static-results 的 data 属性', () => {
  assert.match(
    astroSrc,
    /id="static-results"[^>]*data-calc-output-templates=/,
    '模板子集没有注入到 #static-results',
  );
});

test('B3-7 接线：动态卡片渲染后必须派发 ffk:calc-output-rendered 事件', () => {
  assert.match(astroSrc, /ffk:calc-output-rendered/, '动态路径没有派发渲染完成事件');
});
```

### Step 2: 跑测试，确认失败

Run: ```cmd.exe /c "node node_modules\\tsx\\dist\\cli.mjs --test --test-concurrency=1 tests\\calc-output-i18n-guard.test.ts"```
Expected: FAIL —— 3 条接线断言全红。

### Step 3: 改 `src/pages/[lang]/[slug].astro`（三处）

#### 3a. 前置 import 与工具 alias

在既有 import 区（`import { hasDecisionLines, stripDecisionTip } from '../../lib/decision-support';` 附近）加：

```astro
import { renderCalcOutput } from '../../lib/calc-output-i18n';
import { calcOutputTemplates, calcOutputTemplatesJson, toolAlias } from '../../lib/calc-output-templates';
```

在 frontmatter 里（`const engine = getEngine(slug!);` 之后）加：

```astro
// P168 B3-7：结果卡片的「语义码 + 值」渲染。
//   ⭐ 只有**本工具真的吐 token** 时才注入模板表 ——
//     否则 90 个未 token 化的工具每个页面都要多带几十 KB 的无用模板。
//   ⭐ 用 getLang(Astro) 而不是 Astro.params.lang —— params.lang 是 string|undefined。
const pageLang = getLang(Astro);
const calcOutAlias = toolAlias(slug!);
const engineSampleText = (engine.staticExamples ?? []).join('\n');
const hasCalcOutTokens = engineSampleText.includes('$calc_out.');
const calcOutTemplates = hasCalcOutTokens ? calcOutputTemplates(pageLang, calcOutAlias) : {};
const calcOutTemplatesJson = hasCalcOutTokens ? calcOutputTemplatesJson(pageLang, calcOutAlias) : '';
```

#### 3b. 静态路径（约 `:1394`）

把既有的：

```astro
const translatedEx = lang === 'zh' && engine.clientConfig.type === 'custom'
  ? translateCalcOutput(exWithoutTip, lang)
  : exWithoutTip;
```

改成：

```astro
// P168 B3-7：⭐ 顺序是「先 token 渲染、再 translateCalcOutput」——
//   token 渲染把英文换成了中文 ⇒ translateCalcOutput 对已 token 化的引擎
//   自动降级为 no-op（整串匹配命中不了）⇒ 试点外的 90 个引擎行为不变。
//   ⭐ 反过来（先 translate 再 render）会让 translateCalcOutput 把 token
//     **内部**的英文兜底也替换掉 ⇒ 兜底被污染。
const renderedEx = hasCalcOutTokens ? renderCalcOutput(exWithoutTip, calcOutTemplates) : exWithoutTip;
const translatedEx = lang === 'zh' && engine.clientConfig.type === 'custom'
  ? translateCalcOutput(renderedEx, lang)
  : renderedEx;
```

#### 3c. 模板表注入 DOM

把静态卡片的容器：

```astro
<div id="static-results" class="space-y-3">
```

改成：

```astro
<div id="static-results" class="space-y-3" data-calc-output-templates={calcOutTemplatesJson}>
```

⚠️ 空字符串时属性值为 `""` ⇒ 客户端 `readTemplates()` 读到空串 ⇒ 返回 `{}` ⇒ 直接 return ✔（不做事）。

#### 3d. 客户端模块的引入

在既有的

```astro
  <script>
    import '../../scripts/decision-support.client.ts';
  </script>
```

旁边加：

```astro
  <script>
    import '../../scripts/calc-output.client.ts';
  </script>
```

#### 3e. 动态路径派发事件（约 `:2176~2185`）

在动态卡片的 beautify 之后（`monoDiv.innerHTML = beautifySections(textDyn, calcConfig);` 那一段结束处）加：

```js
// P168 B3-7：⭐ 在 beautify **之后**派发 ——
//   beautifySections 靠 token 里的**英文兜底**识别区块
//   （Context: / Rate: / Per Request: …）⇒ 先替换 token 会让 en/zh 结构分叉。
document.dispatchEvent(new CustomEvent('ffk:calc-output-rendered', {
  detail: { container: dynamicResults }
}));
```

⚠️ **事件名必须与 `src/scripts/calc-output.client.ts` 的 `CALC_OUTPUT_RENDERED_EVENT` 一致**（两边都用字面量 `'ffk:calc-output-rendered'`；守卫断言字符串一致）。

⚠️ **不要**在动态路径里再调一次 `renderCalcOutput` —— 那是客户端模块的活；重复调用会把 fallback 文本当模板再插值一次（幂等但没必要）。

#### 3f. ⭐ 静态卡片的客户端 beautify（视觉一致性的关键，必须处理）

客户端在页面加载时会把静态卡片**重新** beautify 一次（约 `:2030~2036`）：

```js
var staticMono = staticResults.querySelector('.font-mono');
if (staticMono) {
  var stext = staticMono.textContent || '';
  staticMono.innerHTML = beautifySections(stext, calcConfig);
}
```

⚠️ **问题**：SSR 已经把卡片渲成中文了 ⇒ 客户端读到的 `textContent` 是中文 ⇒ `beautifySections` 用**英文标记**判定区块会失配 ⇒ **zh 页的卡片结构与 en 页分叉**。

⭐ **默认方案（保结构）**：让客户端 beautify 读**token 文本**而不是中文文本。

- **Modify `src/components/ResultCard.astro`**：加一个**可选** prop `rawText?: string`（缺省 = `text`），并把它写进 `.font-mono` 容器的 `data-calc-output-raw` 属性。
  - ⚠️ 改 prop 前先 `grep -rn "<ResultCard" src/` 确认调用点；预期只有 `[slug].astro`。
- **\[slug].astro\]**：给 `<ResultCard ... />` 传 `rawText={ex}`（**token 原文**，未经渲染）。
- **客户端 beautify** 改为：

```js
var staticMono = staticResults.querySelector('.font-mono');
if (staticMono) {
  // P168 B3-7：⭐ 优先用 **token 文本**（data-calc-output-raw）beautify ——
  //   token 里带英文兜底 ⇒ 区块识别与英文页一致；替换 token 放在 beautify 之后。
  var rawAttr = staticMono.getAttribute('data-calc-output-raw');
  var stext = rawAttr || staticMono.textContent || '';
  staticMono.innerHTML = beautifySections(stext, calcConfig);
}
```

⭐ **备选方案（若 ResultCard 改动面过大）**：已 token 化的工具**跳过**客户端的静态 beautify（SSR 已经渲好了）：

```js
var calcOutActive = !!staticResults.getAttribute('data-calc-output-templates');
if (calcConfig) {
  var staticMono = staticResults.querySelector('.font-mono');
  if (staticMono && !calcOutActive) {
    var stext = staticMono.textContent || '';
    staticMono.innerHTML = beautifySections(stext, calcConfig);
  }
}
```

⚠️ **备选方案的代价**：静态卡片失去 beautifySections 的富结构（对比卡片 / 柱状图）⇒ **视觉回退**。
⇒ ⭐ **默认走「保结构」方案**；**执行时必须浏览器目视对比 en / zh 两页的静态卡片结构**（Task 20 Step 6），若不一致再退回备选。

### Step 4: 跑测试

Run: ```cmd.exe /c "node node_modules\\tsx\\dist\\cli.mjs --test --test-concurrency=1 tests\\calc-output-i18n-guard.test.ts"```
Expected: 3 条接线断言 PASS。

Run: ```cmd.exe /c "npx tsc --noEmit"```
Expected: exit 0（0 error）。

### Step 5: Commit

```bash
git add src/pages/[lang]/[slug].astro src/components/ResultCard.astro tests/calc-output-i18n-guard.test.ts
git commit -m "feat(i18n): P168 B3-7 —— 页面接线（静态渲染 + 动态事件 + 模板注入）"
```

---

## Task 5: 试点工具清单与 token 化配方（**10 个引擎的统一施工手册**）

**Files:**
- Create: `tmp/pilot-token-plan.md`（**不入库**，工作笔记）
- Read: 10 个引擎源码 + `src/i18n/locales/{en,zh}.json`

**Interfaces:**
- Produces: 每个引擎的 **token 清单**（code + 英文 fallback + params + 中文译文），供 Task 6~15 逐个落地

### ⭐ 施工配方（每个引擎都一样）

对目标引擎的**每一行**输出，按下面的顺序判定：

1. **章节标题行**（整行就是一个 emoji 标题，如 `💰 MRR Snapshot`）
   ⇒ token：`$calc_out.section.<key>`
   - `key` = 标题的 slug（`mrr_snapshot` / `churn_health` / `what_if_scenarios` …）
   - ⚠️ **中文译文必须保留行首 emoji**
2. **标签行**（`• 标签: 值` 或 `  标签:  值`，**值里没有自然语言句子**）
   ⇒ token：`$calc_out.label.<key>`，**只替换标签部分，值原样留在行里**
   - `key` = 标签的 slug（`starting_mrr` / `ending_mrr` / `arr_x12` / `subscribers` …）
   - ⚠️ **对齐空格留在 token 之外** —— 例：`• $calc_out.label.starting_mrr|Starting MRR      $12,000`
   - ⭐ **共享标签**（≥2 个工具会用）与**独占标签**都先放 `calc_out.label.*`（统一放共享层，将来铺开时再下沉）
3. **整行结论句 / 判定句**（含自然语言 + 运行时数值）
   ⇒ token：`$calc_out.<alias>.row.<key>`，**整行替换**
   - 例：`$calc_out.mrr.row.assessment_excellent|🟢 Excellent — 10%+ MoM growth is top-tier.`
   - ⚠️ **运行时数值必须同时进 `params` 和 fallback**（同一个变量 ⇒ 两侧不可能漂）
4. **纯结构性行**（空行、分隔符之类）⇒ 不动
5. **💡 Tip 行** ⇒ **不动**（B3-4 已经用 `decision_tip` 码接管了；卡片里它会被剥掉）

⚠️ **fallback 里不得出现 `|`**（`beautifySections` 用 ` | ` 分隔维度行）。
⚠️ **params 的值里不得出现 `{` `}`**。
⚠️ **一行里可以有多个 token**（例：`• $calc_out.label.target_mrr|Target MRR: $calc_out.label.new_mrr|New MRR`）—— 正则逐个替换 ✔。

### Step 1: 建 token 清单

对 10 个引擎逐个做（**这一步是纯设计，不改代码**）：

- [ ] 读引擎源码，列出**全部**输出行（含分支）。
- [ ] 按上面的配方给每一行定 code。
- [ ] 写出中文译文（**信息量 ≥ 英文 × 0.7** ⇒ 忠实翻译，不删信息、不注水）。
- [ ] 标注每个 code 是「共享」（≥2 个工具会用）还是「本工具独有」。
- [ ] 把清单写进 `tmp/pilot-token-plan.md`，格式：

```
## solopreneur-mrr-calculator（alias: mrr）
| 源行（英文） | code | params | 中文译文 |
|---|---|---|---|
| 💰 MRR Snapshot | calc_out.section.mrr_snapshot | — | 💰 MRR 快照 |
| • Starting MRR:      $12,000 | calc_out.label.starting_mrr | — | • 起始 MRR：      $12,000 |
| 🟢 Excellent — 10%+ MoM growth is top-tier. | calc_out.mrr.row.assessment_excellent | — | 🟢 优秀 —— MoM 增长 10%+ 属于顶尖水平。 |
| • If churn drops 3.0% → 1.0%: | calc_out.mrr.row.whatif_churn_drop | {"from":"3.0%","to":"1.0%"} | • 若流失率从 3.0% 降到 1.0%： |
```

### Step 2: 统计共享 vs 新增

在 `tmp/pilot-token-plan.md` 末尾统计：

| 指标 | 期望 | 说明 |
|---|---|---|
| 10 个引擎的**唯一英文行**总数 | ≈ 250~300 | 去重后 |
| **共享 label**（≥2 工具共用） | ≈ 40~70 | 铺开后省下的重复量 |
| **独占 row** | ≈ 180~230 | 每个工具独有 |
| 平均每引擎**新增** locale 键 | 首引擎最多，后续递减 | ⭐ 这是铺开 90 个引擎的工作量预测依据 |

⭐ **这个统计是 spec §1.1 目标 3（产出真实耗时数据）的核心交付物** —— 必须写进 CHANGELOG 与计划文档的「执行结果」段。

### Step 3: 本 Task 不改代码 ⇒ 不 commit

---

## Task 6~15: 10 个引擎逐个 token 化（**可并行**）

> ⭐ **这 10 个 Task 结构完全相同、文件互不重叠 ⇒ 必须用 `dispatching-parallel-agents` / `subagent-driven-development` 并行执行**（宪法与 Superpowers 流程要求：2 个以上独立任务必须并行）。
> ⚠️ **每个 Task 只允许改自己那一个引擎文件**（locale 文件是共享文件 ⇒ 见下方「locale 冲突处理」）。

**Task 6**: `solopreneur-mrr-calculator`（长叙述 60 行 · **有 customFn 双实现** · alias `mrr`）
**Task 7**: `solopreneur-rent-vs-buy-calculator`（长叙述 87 行 · **Comparison 形态** · alias `rent_vs_buy`）
**Task 8**: `solopreneur-brrr-calculator`（长叙述 69 行 · alias `brrrr`）
**Task 9**: `solopreneur-project-profitability-calculator`（长叙述 99 行 · **最坏情况** · alias `project_profitability`）
**Task 10**: `solopreneur-coupon-attribution-calculator`（表型 55 行 · alias `coupon_attribution`）
**Task 11**: `solopreneur-saas-valuation-calculator`（中型 22 行 · alias `saas_valuation`）
**Task 12**: `solopreneur-acv-calculator`（中型 19 行 · **B3-4 已迁 🧭 四层** · alias `acv`）
**Task 13**: `solopreneur-funnel-step-calculator`（短表 7 行 · 有 customFn · alias `funnel_step`）
**Task 14**: `solopreneur-activation-rate-calculator`（短表 4 行 · alias `activation_rate`）
**Task 15**: `solopreneur-stickiness-calculator`（短表 4 行 · alias `stickiness`）

**每个 Task 的步骤（以 Task 6 为例，其余 9 个同构）**：

**Files:**
- Modify: `src/engines/saas/mrr-calculator.ts`（**只改这个文件**）

**Interfaces:**
- Consumes: `makeToken(code, fallback, params?)` from `src/lib/calc-output-i18n`（**引擎侧 import 共享实现** —— customFn 侧见 Step 3）
- Produces: 该引擎的 token 化输出（服务端 `calculate()` 与客户端 `customFn` **两份同步**）

### Step 1: 写失败的测试

⚠️ **B3-7 的引擎级判据已由 G2/G3 覆盖**（源码声明的 token 集合 == locale 键集合；customFn 集合 == calculate 集合）⇒ **本 Task 不需要新写引擎级单测**。
⇒ **本 Task 的「失败测试」= 跑 G2/G3 看到红**（locale 还没有键 ⇒ G2 红）。

Run:
```
cmd.exe /c "node node_modules\\tsx\\dist\\cli.mjs --test --test-concurrency=1 tests\\calc-output-i18n-guard.test.ts"
```
Expected: G2 红（源码有 token、locale 没键）。

### Step 2: token 化服务端实现（`calculate()`）

把每一行按 Task 5 的配方改成 token。**两种写法**：

⭐ **写法 A（无 params，推荐）** —— 直接写 token 字面量：

```ts
result += '$calc_out.section.mrr_snapshot|💰 MRR Snapshot' + "\\n";
```

⚠️ **注意**：token 里已经有 emoji 了 ⇒ 不要再额外拼 emoji。

⭐⭐ **写法 B（有 params）** —— 用 `makeToken`：

```ts
import { makeToken } from '../../lib/calc-output-i18n';
...
result += '• ' + makeToken('calc_out.mrr.row.whatif_churn_drop',
  'If churn drops ' + pct(churnRate) + ' → ' + pct(newChurn) + ':',
  { from: pct(churnRate), to: pct(newChurn) }) + "\\n";
```

⚠️ **fallback 里不能有 `|`**；⚠️ **params 的值不能有 `{}`**。

### Step 3: 同步 token 化客户端实现（`customFn`）

⚠️ **customFn 是一个 JS 源码字符串** ⇒ 它**不能 import** `makeToken` ⇒ 必须在字符串里自带等价的拼装逻辑。

⭐⭐ **解法（关键）**：**把 `makeToken` 作为第 4 个参数传给 customFn**。

- 改 `src/pages/[lang]/[slug].astro` 的 `new Function('inputs','pick','fill', config.customFn)` → `new Function('inputs','pick','fill','tok', config.customFn)`
- 改同一处调用点：

```js
var fn = new Function('inputs', 'pick', 'fill', 'tok', config.customFn);
return fn(inputs, pick, fill, calcOutMakeToken);
```

- 在同一个内联脚本里定义 `calcOutMakeToken`（**与服务端同一套语义**）：

```js
// P168 B3-7：与 src/lib/calc-output-i18n.ts 的 makeToken 同语义。
//   ⚠️ 这是**第二处字面实现** —— 但它只有一行拼接（拼字符串），
//     真正的「解析 + 查表 + 插值」仍然只有服务端那份（客户端模块 import 它）。
//     守卫 G3 断言两份实现吐**同一个 token 集合** ⇒ 拼法漂移会被抓到。
function calcOutMakeToken(code, fallback, params) {
  var p = (params && Object.keys(params).length) ? JSON.stringify(params) : '';
  return '$' + code + p + '|' + fallback;
}
```

- 在引擎的 customFn 字符串里用它：

```ts
const customFn =
  "var cnn=function(x){return Math.max(0,x)};" +
  ...
  "r+='• '+tok('calc_out.mrr.row.whatif_churn_drop','If churn drops '+pct(churnRate)+' → '+pct(newChurn)+':',{from:pct(churnRate),to:pct(newChurn)})+'\\n';" +
  ...
```

⚠️ **`tok` 是 `new Function` 的第 4 个参数名** ⇒ customFn 字符串里可以直接用。

⚠️⚠️ **`codegen-examples.mjs --check` 会做 `new Function('inputs','pick','fill', body)` 的解析检查** —— 少了 `tok` 参数**不会**报错（`tok` 只是未声明标识符，不是语法错误）⇒ 该检查仍然有效 ✔。
⚠️ 但 `codegen-examples.mjs` **不执行** customFn ⇒ 不受影响 ✔。

### Step 4: 输出 locale 键清单（**不直接改 locale 文件**）

⭐ **locale 冲突处理（10 个 Task 并行时）**：每个 Task 只**追加**自己的键到文件末尾 ⇒ 并行写会互相覆盖 ❌。
⇒ ⭐⭐ **正确做法**：**10 个 Task 并行只改引擎文件；locale 键由 Task 16 统一落库**。

- [ ] 创建 `tmp/locale-<alias>.json`：

```json
{
  "calc_out.section.mrr_snapshot": { "en": "💰 MRR Snapshot", "zh": "💰 MRR 快照" },
  "calc_out.label.starting_mrr": { "en": "Starting MRR", "zh": "起始 MRR" },
  "calc_out.mrr.row.assessment_excellent": {
    "en": "🟢 Excellent — 10%+ MoM growth is top-tier.",
    "zh": "🟢 优秀 —— MoM 增长 10%+ 属于顶尖水平。"
  },
  "calc_out.mrr.row.whatif_churn_drop": {
    "en": "If churn drops {from} → {to}:",
    "zh": "若流失率从 {from} 降到 {to}："
  }
}
```

- [ ] 确认：**共享 label 在多个 Task 里出现时，en/zh 值必须逐字相同** ⇒ Task 16 合并时会检测冲突并报错。

### Step 5: ⚠️ 并行阶段**不跑** codegen

⚠️ **⚠️⚠️ 并行危险**：`codegen-examples.mjs` 会**同时重写所有 100 个引擎**的 `staticExamples[0]` ⇒ **10 个 Task 并行跑它会互相覆盖** ❌❌
⇒ ⭐⭐ **并行阶段（Task 6~15）只改引擎源码，不跑 codegen**；Task 16 之后统一跑一次。
⇒ ⭐⭐ **`codegen-examples --check` 在并行期间会红**（静态示例陈旧）⇒ **并行阶段不跑 `--check`**；Task 16 之后必须跑通。

⚠️ **收尾检查**：并行结束后用 `git diff --stat` 确认**只有那 10 个引擎文件 + 其它预期文件**被改 ⇒ 若发现别的引擎的 `staticExamples[0]` 也变了，说明有人提前跑了 codegen ⇒ `git checkout -- <那些文件>` 还原。

### Step 6: 跑守卫（此时 G2 应仍红，locale 还没落库）

Run:
```
cmd.exe /c "node node_modules\\tsx\\dist\\cli.mjs --test --test-concurrency=1 tests\\calc-output-i18n-guard.test.ts"
```
Expected: G2 红（locale 缺键）—— **这是预期的**。

### Step 7: Commit（**每个引擎一个 commit**）

```bash
git add src/engines/saas/mrr-calculator.ts
git commit -m "feat(i18n): P168 B3-7 —— mrr 引擎结果 token 化（服务端 + customFn 同步）"
```

⚠️ **commit 不含 locale**（locale 由 Task 16 统一落库）⇒ 每个 commit 的 diff 只碰 1 个引擎文件 ⇒ 冲突面最小 ⇒ 适合并行。

---

## Task 16: locale 键统一落库 + 重生成 staticExamples

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/zh.json`
- Modify: `src/engines/**`（codegen 重写的 `staticExamples[0]`）
- Read: `tmp/locale-*.json`（10 份）

### Step 1: 合并 10 份 locale 清单

写 `tmp/merge-locale.mjs`：

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const aliases = ['mrr','rent_vs_buy','brrrr','project_profitability','coupon_attribution','saas_valuation','acv','funnel_step','activation_rate','stickiness'];

const merged = {};
const conflicts = [];
for (const a of aliases) {
  const f = resolve(ROOT, 'tmp', 'locale-' + a + '.json');
  const obj = JSON.parse(readFileSync(f, 'utf8'));
  for (const [k, v] of Object.entries(obj)) {
    if (merged[k] && (merged[k].en !== v.en || merged[k].zh !== v.zh)) {
      conflicts.push(k + ': ' + JSON.stringify(merged[k]) + ' vs ' + JSON.stringify(v));
    }
    merged[k] = v;
  }
}
if (conflicts.length) {
  console.error('共享键冲突（必须人工裁定）：');
  for (const c of conflicts) console.error('  - ' + c);
  process.exit(1);
}
console.log('合并键数：' + Object.keys(merged).length);

for (const lang of ['en', 'zh']) {
  const p = resolve(ROOT, 'src', 'i18n', 'locales', lang + '.json');
  let raw = readFileSync(p, 'utf8');
  // 去掉上一轮遗留的 calc_out 块（幂等：重跑不重复）
  raw = raw.replace(/,\\n  "calc_out\\.[^"]*": "[^"]*"(?=\\n)/g, '');
  const lines = Object.entries(merged).map(([k, v]) =>
    '  ' + JSON.stringify(k) + ': ' + JSON.stringify(v[lang])
  );
  const block = lines.join(',\\n');
  raw = raw.replace(/\\n}\\n$/, ',\\n' + block + '\\n}\\n');
  writeFileSync(p, raw, 'utf8');
  console.log(lang + ' 写入 ' + Object.keys(merged).length + ' 个 calc_out 键');
}
```

⚠️ **为什么用「文本追加」而不是 `JSON.stringify(obj, null, 2)`**：后者会**整文件重新序列化** ⇒ 若原文件有任何格式差异（转义、空格），diff 会爆炸。
⇒ **跑完必须检查**：`git diff --stat src/i18n/locales/` ⇒ **只应显示新增行**（+\~300 / -0）。若显示大量改动 ⇒ 立即 `git checkout -- src/i18n/locales/` 并改用其它追加方式。

⚠️ 追加方式要求**末尾的最后一个键没有尾随逗号** ⇒ 替换 `\\n}\\n$` 时在它前面补 `,` ✔（原文件最后一行是 `"notFound.homeLink": "返回首页"` 无逗号 ✔）。

### Step 2: 跑 locale 完整性检查

Run:
```
cmd.exe /c "node scripts\\check-i18n-completeness.mjs"
```
Expected: PASS（en / zh 的键集合一致）。

### Step 3: 重生成 staticExamples

Run:
```
cmd.exe /c "node scripts\\codegen-examples.mjs"
```
Expected: 10 个试点引擎的 `staticExamples[0]` 被重写成 token 文本。

### Step 4: 验证 codegen 无漂移

Run:
```
cmd.exe /c "node scripts\\codegen-examples.mjs --check"
```
Expected: `--check PASSED: all 100 engines in sync and clean.`

⚠️ **若不 PASSED**：说明某个引擎的 `staticExamples[0]` 与 `generate()` 不一致 ⇒ 多半是本批改坏的 ⇒ 修引擎，不要改 `--check`。

### Step 5: 跑守卫，G2 应转绿

Run:
```
cmd.exe /c "node node_modules\\tsx\\dist\\cli.mjs --test --test-concurrency=1 tests\\calc-output-i18n-guard.test.ts"
```
Expected: G2 全绿。G3 也应全绿（两份实现同步了）。

### Step 6: Commit

```bash
git add src/i18n/locales/en.json src/i18n/locales/zh.json src/engines/
git commit -m "feat(i18n): P168 B3-7 —— locale 落库（calc_out.* 键）+ staticExamples 重生成"
```

---

## Task 17: 产物层守卫 G4

**Files:**
- Create: `tests/calc-output-render-guard.test.ts`

**Interfaces:**
- Consumes: `dist/zh/<slug>/index.html` 的 `#static-results`
- Produces: 1 个测试（build-dep）

### Step 1: 写测试

```ts
#!/usr/bin/env node
// P168 B3-7 —— 产物层守卫：zh 结果卡片里**不得残留未解析的 token**。
//
// ⭐ 为什么只断言「无残留 token」而不断言「无整行英文」
//   「zh 卡片全中文」是由三条断言链式推出的：
//     G2（引擎吐的每个 token 都有 locale 键）
//   + G1（每个键的 zh 是真译文、不是英文）
//   + G4（本守卫：没有 token 残留到产物）
//   ⇒ 渲染出来的每一行都是中文。
//   ⭐ 若再加一条「无整行英文」的产物层断言 ⇒ 「删一个 locale 键」这条变异
//     会同时红 G2 与它 ⇒ 违反「一条变异只红一条断言」的隔离纪律。
//
// P153-G1: build-dep guard —— 需要 pnpm build。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const PILOT = [
  'solopreneur-mrr-calculator',
  'solopreneur-rent-vs-buy-calculator',
  'solopreneur-brrr-calculator',
  'solopreneur-project-profitability-calculator',
  'solopreneur-coupon-attribution-calculator',
  'solopreneur-saas-valuation-calculator',
  'solopreneur-acv-calculator',
  'solopreneur-funnel-step-calculator',
  'solopreneur-activation-rate-calculator',
  'solopreneur-stickiness-calculator',
];

test('P168 B3-7 产物层：10 个试点工具的 zh 卡片不得残留未解析的 token', (t) => {
  if (!process.env.RUN_BUILD_TESTS) {
    t.skip('build-dep：需要 RUN_BUILD_TESTS=1 与已构建的 dist/');
    return;
  }
  const problems: string[] = [];
  for (const slug of PILOT) {
    const p = resolve(ROOT, 'dist', 'zh', slug, 'index.html');
    if (!existsSync(p)) {
      problems.push(slug + '：产物不存在（dist/zh/' + slug + '/index.html）');
      continue;
    }
    const html = readFileSync(p, 'utf8');
    const m = html.match(/<div id="static-results"[^>]*>([\s\S]*?)<div id="dynamic-results"/);
    const card = m ? m[1] : html;
    if (card.includes('$calc_out.')) {
      const idx = card.indexOf('$calc_out.');
      problems.push(slug + '：卡片里残留 token —— ' + card.slice(Math.max(0, idx - 60), idx + 60).replace(/\s+/g, ' '));
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});
```

⚠️ **`#static-results` 的闭合边界**：产物里 `<div id="static-results" ...>` 之后是卡片，然后是 `<div id="dynamic-results"`。用非贪婪匹配到 `dynamic-results` 之前 ✔。
⚠️ 若某个工具的卡片里**没有** `dynamic-results`（非交互页）⇒ 退回全文匹配 ✔（本批 10 个都是交互页）。

### Step 2: 跑测试（此时应红 —— 产物还没重建）

Run:
```
cmd.exe /c "set RUN_BUILD_TESTS=1&&node node_modules\\tsx\\dist\\cli.mjs --test --test-concurrency=1 tests\\calc-output-render-guard.test.ts"
```
Expected: 红色（产物是旧的 / dist 不存在）⇒ 记录基线。

### Step 3: 构建

Run:
```
cmd.exe /c "set SKIP_INDEXNOW=1&&pnpm build"
```
Expected: **438** 页，`injected=438 skipped=0 failed=0`。

### Step 4: 再跑测试，应全绿

Run:
```
cmd.exe /c "set RUN_BUILD_TESTS=1&&node node_modules\\tsx\\dist\\cli.mjs --test --test-concurrency=1 tests\\calc-output-render-guard.test.ts"
```
Expected: PASS。

### Step 5: Commit

```bash
git add tests/calc-output-render-guard.test.ts
git commit -m "test(i18n): P168 B3-7 —— 产物层守卫（zh 卡片零残留 token）"
```

---

## Task 18: 变异台子 P1~P5 + 体检脚本

**Files:**
- Create: `tests/scripts/mutate-p168-calc-output.mjs`
- Create: `tests/scripts/p168-calc-output-audit.mjs`
- Reference: `tests/scripts/mutate-p168-lastmod.mjs`（快照 / 还原 / sha256 校验 / 断言名核对的现成范式）

### Step 1: 写体检脚本 `tests/scripts/p168-calc-output-audit.mjs`

⭐ **它必须能复算验收数字**（spec §1.1 目标 3：产出真实耗时与覆盖率数据）。

输出 5 组数字：

1. **zh 卡片英文行数（逐工具）** —— 解析 `dist/zh/<slug>/index.html` 的 `#static-results`，统计「整行没有 CJK 且含拉丁字母」的行数（这是「残留英文」的机器口径）。
2. **token 覆盖率** —— 每个引擎的「输出行数」与「含 token 的行数」⇒ 覆盖率百分比。
3. **locale 键统计** —— `calc_out.*` 总数 · 共享 label 数 · 每工具 row 数。
4. **新增 vs 复用** —— 按 Task 6~15 的顺序模拟：第 1 个引擎新增 N₁ 个键，之后每个引擎只新增「自己独有的」⇒ 给出「铺开到 90 个引擎」的**外推**（按试点实测的平均新增键数 × 90）。
5. **注入体积** —— 每个工具页注入的模板子集 JSON 字节数（`data-calc-output-templates`）。

**跑法**：
```
node tests/scripts/p168-calc-output-audit.mjs
```

⚠️ **文件名不能带 `.test.ts`** ⇒ 不会被 `walkTestSuites` 计入套件数 ✔。

### Step 2: 写变异台子 `tests/scripts/mutate-p168-calc-output.mjs`

**沿用 `mutate-p168-lastmod.mjs` 的纪律**：
- 快照 → 每轮开头还原 → 收尾**无条件**还原 + **sha256 逐字节校验**；
- 变异必须**真的改变文件**（否则判 INVALID，不算 SURVIVED）；
- **基线必须先绿**，否则拒绝开跑；
- 每条变异只许红**一条断言**（核对**失败断言的名字**，不只是「有东西红了」）；
- 快照闸门：发现旧快照且没有 `P168_ALLOW_RECOVER` ⇒ 拒绝开跑；
- 写操作带重试（Windows 上刚被写过的文件会被系统索引短暂独占）；
- **不重建产物** ⇒ 源码层变异只跑 source-only 断言。

**变异清单**：

| ID | 变异手法 | 应红的断言 | 隔离性说明 |
|---|---|---|---|
| **P1** | 把某个 zh 模板改短（如 `calc_out.label.starting_mrr` 的 zh 从 `起始 MRR` 改成 `MRR`）⇒ 信息量 < 0.7 | **G1** | 键集合不变 ⇒ G2 绿；只改 zh 值 ⇒ G3 绿；不重建 ⇒ G4 绿 |
| **P2** | 删一个 locale 模板键（从 `zh.json` 删 `calc_out.label.starting_mrr`） | **G2** | 渲染时降级到英文兜底 ⇒ **不产生裸 token** ⇒ G4 绿；G1 只看仍存在的键 ⇒ 绿 |
| **P3** | 把 `customFn` 里某个 token 换成**另一个已存在**的 token（只改客户端侧） | **G3** | 源码 token **集合**不变 ⇒ G2 绿；不改 locale ⇒ G1 绿；不重建 ⇒ G4 绿 |
| **P4** | 把**服务端 + 客户端**两处同一个 token 换成一个 **locale 里没有**的新 code | **G2** | 两份实现同步改 ⇒ G3 绿；改的是 `calculate()` 源码而**不重建 staticExamples** ⇒ 产物层不变 ⇒ G4 绿 |
| **P5** | 把某个 zh 模板改成与 en **逐字相同**（等于没翻译） | **G1** | 键集合不变 ⇒ G2 绿；G3 绿；G4 绿 |

⚠️ **P4 的关键**：必须**同时**改服务端与客户端两份（否则 G3 会跟着红 ⇒ 两条红 ⇒ 隔离失败）。
⚠️ **P4 的第二个关键**：改的是 `calculate()` 里的**源码字面量**，而 `staticExamples[0]` **不重建** ⇒ 产物层保持旧内容 ⇒ G4 绿。
⚠️ **P3 的关键**：换成**已存在**的 token ⇒ 源码 token 集合不变 ⇒ G2 绿。

**跑法**：
```
node tests/scripts/mutate-p168-calc-output.mjs
node tests/scripts/mutate-p168-calc-output.mjs P1,P3
node tests/scripts/mutate-p168-calc-output.mjs --negative-control
```

⭐ **断言名核对**：台子要解析 tsx 的 TAP 输出，取 `not ok N - <名字>` 的 `<名字>` 列表 ⇒ 与期望的断言名比对 ⇒ 不一致 ⇒ 判 `RED-BUT-NOT-ISOLATED`。

### Step 3: 跑台子

Run:
```
cmd.exe /c "node node_modules\\tsx\\dist\\cli.mjs --test --test-concurrency=1 tests\\calc-output-i18n-guard.test.ts"
cmd.exe /c "node tests\\scripts\\mutate-p168-calc-output.mjs"
cmd.exe /c "node tests\\scripts\\mutate-p168-calc-output.mjs --negative-control"
```
Expected: 基线全绿；P1~P5 **全部 KILLED** 且每条**精确红 1 条**；负对照成立（不改任何东西时全绿 / INVALID）。

### Step 4: 跑体检脚本

Run:
```
cmd.exe /c "node tests\\scripts\\p168-calc-output-audit.mjs"
```
Expected: 5 组数字全部产出（记入 Task 20 的文档）。

### Step 5: Commit

```bash
git add tests/scripts/mutate-p168-calc-output.mjs tests/scripts/p168-calc-output-audit.mjs
git commit -m "test(i18n): P168 B3-7 —— 变异台子 P1~P5 + 体检脚本（验收数字可复算）"
```

---

## Task 19: 文档同步

**Files:**
- Modify: `AGENTS.md` —— ① 新维度行「Calc Output i18n（结果卡片语义码 + locale 模板）」；② 规格新增 **§19.35**；③ 套件计数（新增 2 个测试文件 ⇒ **286 → 288**；build-dep 65 → **66**；source-only 221 → **222**）。
- Modify: `CHANGELOG.md` —— B3-7 段（含实测数字）。
- Modify: `docs/superpowers/specs/INDEX.md` —— 复核登记（**已登记**，只需复核计数）。
- Modify: `docs/superpowers/plans/INDEX.md` —— 登记本计划（Section 9 计数 45 → **46**；目录文件总数 116 → **117**）。

⚠️ **套件计数变了 ⇒ `tests/claude-md-invariant-guard.test.ts` 的算术不变量要跟着核**（总数 = build-dep + source-only）。
⚠️ **guard 的 build-dep 判定**是「源码里出现 `process.env.RUN_BUILD_TESTS`」⇒ `tests/calc-output-render-guard.test.ts` 命中 ⇒ build-dep +1 ✔；`tests/calc-output-i18n-guard.test.ts` **不得**出现该字符串 ⇒ 保持 source-only ✔。

### Step 1: 写文档

- **AGENTS.md §19.35**：写「B3-7 zh 结果卡片语义码化」的规格段（形态 / token 协议 / locale 键命名 / 四条判据 / 试点清单 / 铺开外推）。
- **AGENTS.md 维度矩阵**：加一行「Calc Output i18n（结果卡片语义码 + locale 模板）」，注明「10/100 工具已迁 · 其余 90 待铺开」。
- **CHANGELOG.md**：写 B3-7 段，必须含**实测数字**（英文行数 426 → 0 · locale 键数 · 注入体积 · 台子 5/5 · 套件数）。
- **plans/INDEX.md**：Section 9 的 P160+ 表格加一行 + 更新两处计数 + 更新「最后更新」行。

### Step 2: 跑文档守卫

Run:
```
cmd.exe /c "set RUN_BUILD_TESTS=1&&node node_modules\\tsx\\dist\\cli.mjs --test --test-concurrency=1 tests\\claude-md-invariant-guard.test.ts tests\\doc-freshness-guard.test.ts"
```
Expected: 全绿。

### Step 3: Commit

```bash
git add AGENTS.md CHANGELOG.md docs/superpowers/plans/INDEX.md
git commit -m "docs(p168): P168 B3-7 —— 规格 §19.35 + 维度矩阵 + CHANGELOG + INDEX"
```

---

## Task 20: 全量验收

**Files:** 只读

### Step 1: 类型检查 + 构建

```
cmd.exe /c "npx tsc --noEmit"
cmd.exe /c "set SKIP_INDEXNOW=1&&pnpm build"
```
Expected: tsc **0 error**；构建 **438** 页（`injected=438 skipped=0 failed=0`）。

### Step 2: 守卫

```
cmd.exe /c "node node_modules\\tsx\\dist\\cli.mjs --test --test-concurrency=1 tests\\calc-output-i18n-guard.test.ts"
cmd.exe /c "set RUN_BUILD_TESTS=1&&node node_modules\\tsx\\dist\\cli.mjs --test --test-concurrency=1 tests\\calc-output-render-guard.test.ts"
```
Expected: G1 / G2 / G3 / G4 全绿。

### Step 3: 台子 + 体检

```
cmd.exe /c "node tests\\scripts\\mutate-p168-calc-output.mjs"
cmd.exe /c "node tests\\scripts\\mutate-p168-calc-output.mjs --negative-control"
cmd.exe /c "node tests\\scripts\\p168-calc-output-audit.mjs"
```
Expected: P1~P5 **全部 KILLED**（每条精确红 1 条）；负对照成立；体检 5 组数字产出。

### Step 4: 既有闸门

```
cmd.exe /c "node scripts\\codegen-examples.mjs --check"
cmd.exe /c "node scripts\\codegen-customfn.mjs --check"
cmd.exe /c "node scripts\\check-engine-count-by-category.mjs --check"
cmd.exe /c "node scripts\\generate-seo-titles.mjs --check"
cmd.exe /c "node scripts\\check-i18n-completeness.mjs"
```
Expected: 全部 PASSED。

### Step 5: 全量套件

```
cmd.exe /c "set RUN_BUILD_TESTS=1&&node tests\\run.mjs"
```
Expected: **288** 套件 / 10 批 **全部 `# fail 0`**。

### Step 6: ⭐ 浏览器目视验收（**不可省**）

⭐ **必须**用浏览器打开这 4 个页面确认（en / zh 各一对），因为「静态卡片的 beautify 结构」是本批的视觉风险点：

- forgeflowkit.com/zh/solopreneur-mrr-calculator/ （长叙述 + customFn 双实现）
- forgeflowkit.com/en/solopreneur-mrr-calculator/ （对照：结构应与 zh 一致）
- forgeflowkit.com/zh/solopreneur-rent-vs-buy-calculator/ （Comparison 形态）
- forgeflowkit.com/zh/solopreneur-funnel-step-calculator/ （短表）

**逐项确认**：
1. 首屏静态卡片**整行无英文**（数字/货币/模型名除外）；
2. 点「计算」后动态卡片**整行无英文**；
3. **en 页与 zh 页的卡片结构一致**（区块数、卡片数、柱状图一致）；
4. 章节标题的 **emoji 还在**（🩺 📊 🔄 ⚖️ 🎯 💡）；
5. 点「复制」得到的文本**无裸 token**（`$calc_out.`）。

⚠️ **第 3 条是 en/zh 一致性的硬判据** —— 若 zh 页的结构与 en 页不同 ⇒ 说明 §0.6 的渲染顺序被破坏 ⇒ 回去修。

### Step 7: 记录验收数字

把 Step 1~6 的**实测数字**写进本计划文档的「执行结果」段（见下）+ CHANGELOG。

---

## Task 21: 提交与推送（**必须先问用户**）

- **commit**：Task 6~15 的 10 个引擎 commit + Task 16 的 locale commit + Task 17~19 的守卫/文档 commit —— 已按 Task 分布完成；**收尾时**再检查一次 `git status` 是否干净。
- ⚠️ **用户规则**：**先询问是否 commit/push**（带选项问卷 + 明确推荐项），**不允许自动 commit/push**。
- **push 前**：

```powershell
$env:GIT_SSH_COMMAND='C:/Windows/System32/OpenSSH/ssh.exe'; $env:GIT_SSH_VARIANT='external'
git fetch 'ssh://git@ssh.github.com:443/wlz679/forgeflow.git' master:refs/remotes/github/master
git fetch origin master
git rev-list --left-right --count origin/master...HEAD   # 期望 0<TAB>N
```

- **推两端**：

```powershell
$env:GIT_SSH_COMMAND='C:/Windows/System32/OpenSSH/ssh.exe'; $env:GIT_SSH_VARIANT='external'
git push 'ssh://git@ssh.github.com:443/wlz679/forgeflow.git' master
git push origin master
git ls-remote origin refs/heads/master
```

⚠️ **推 GitHub master = 上线**（CF Pages 部署约 4 分钟）⇒ 生效后抓 zh 的 mrr 页核验中文卡片。

---

## 维度 3 scan

> **维度 3 scan: 基于信号 ① Google 对多语言页面的指引**（zh 与 en 是**两个独立市场**，各有各的搜索意图；zh 页给中文用户看，就必须给中文内容）—— 本批把 zh 结果卡片从英文改成中文，正对齐这条。
> **② 本仓库实测**（2026-11-12）：zh 页 75/100 的结果卡片整段英文（2048 行）、动态层 100/100 零中文；主规格 §19.30.6 早就把它记成「量级远大于本批，单独排期」⇒ 现在量级已经量清，可以开工。
> **③ 业界同证**：B3-4 的「建议码 + locale 模板」形态已在本站验证可行（19 个工具已迁、zh 页动态层中文）⇒ 本批沿用同一形态，不另创机制。
> ⇒ 三条信号共同指向「**动态文案要可翻译，就先给它一个稳定的语义码**」⇒ 因此修法是**换输出形态**，不是加词表。
> ⚠️ **AI 不擅自改 Roadmap / Phase**：本批是 P168 批次 3 的独立一支（不新增/重排批次）；不新建工具；不改任何计算逻辑与阈值。

---

## 未解决（本批不做）

1. ⏳ **铺开到其余 90 个引擎的批次划分** —— 本批验收后按实测耗时决定（体检脚本第 4 组数字给出外推）。
2. ⏳ **GSC 2~4 周观察窗口**（2026-11-11 起算）：zh 页中文结果卡片对 zh 查询的展示/点击影响 —— 本批的真正验收指标本地测不出来。
3. ⏳ **`translateCalcOutput` 的 129 个死键** —— 与 `dead-i18n-keys-guard` 有依赖，需单独排期。
4. ⏳ **zh 页的结果卡片之外**（如 `about` / `terms` / 主题页的动态层）是否还有同类缺陷 —— 本批只查工具页。
5. ⏳ **`codegen` 的 15 个引擎 defaultInputs 错配**（`staticExamples` 算错）—— 与本批无关，已由 `tests/scripts/b3-4-codegen-defaults-audit.mjs` 报出，另立批次。

# P168 批次 3 · B3-7：zh 页结果卡片英文化 —— 引擎吐「标签码 + 值」，zh 侧查 locale 拼装（试点 10 个工具）｜设计规格

> **状态**：设计已获用户逐节认可（2026-11-12）· 待实施
> **范围**：只做 **10 个试点工具**（形态可行性验证），**不铺开到其余 90 个**
> **对应主规格**：§19.35（本文的浓缩版）
> **本批定位**：P168 批次 3 的独立一支。解决 §19.30.6 记录的「zh 页结果卡片整段英文」缺陷。

---

## 0. 为什么是这一支（问题陈述）

### 0.1 缺陷

zh 页（`/zh/<slug>/`）的**结果卡片**（首屏静态卡片 + 用户点「计算」后的动态卡片）整段是**英文**：
页面的框架（导航、按钮、决策区块、FAQ）是中文，卡片里的**计算结果正文却是英文** ⇒ 同一页两种语言。

### 0.2 实测规模（2026-11-12，全部来自本仓库当前产物与源码，非推断）

| # | 事实 | 依据 |
|---|---|---|
| 1 | **100/100** 引擎的输出正文**零中文字**（不是主规格写的 92 —— 92 = 100 − 8 个 AI cost 引擎） | `engine.generate()` + `staticExamples[0]` 全量跑 |
| 2 | **产物层 · 静态卡片**：**75/100 页**仍有整行英文，共 **2048 行**残留 | 解析 `dist/zh/*/index.html` 的 `#static-results` |
| 3 | **产物层 · 动态卡片**：**100/100** 引擎零中文；**1227/1905 行（64.4%）**是整行英文 | 同上 |
| 4 | 已全中文的 **25 页全部只有 4~7 行**（短表型）；英文页平均 **51 行**（长叙述型）⇒ 两种完全不同的引擎形态 | 交叉表 |
| 5 | 「去数字后」的英文形状有 **1451 种**，其中 **1233 种只出现一次** ⇒ **逐条字面量对照表不可行** | 归一化统计 |
| 6 | **86.6%** 的残留行是「`标签: 值`」形态；不同标签 **1091 种**，被 ≥2 工具共用的 **58 种**（覆盖 196 行） | 标签切分统计 |
| 7 | 片段级更碎：2647 种片段，被 ≥10 工具共用的仅 **7 种** | 片段切分统计 |
| 8 | `translateCalcOutput` **只翻译章节标题**（143 个 headerKeys 里只有 **14 个是真键**），正文一行都不翻 | `src/pages/[lang]/[slug].astro:147` |
| 9 | ⭐⭐ `translateCalcOutput` **只在 SSR 静态路径被调用**（`:1394`）；**客户端动态路径（`:2120~2185`）完全没有翻译环节** ⇒ 连章节标题在动态层都没翻 | 同上 |

### 0.3 结论

- **#5 + #6** ⇒ 逐条字面量翻译表不可行；真正的杠杆是**「标签层」**（86.6% 的行是 `标签: 值`）。
- **#9** ⇒ 动态层比静态层更严重，且**不是「翻译不全」，是「根本没有翻译环节」** ⇒ 本批必须补上这一层。
- **#8 + #9** ⇒ 现有机制（整串精确匹配的章节标题替换）**只能覆盖标题**，无法覆盖正文。

---

## 1. 目标与非目标

### 1.1 目标

1. 试点 10 个工具的 **zh 页结果卡片（静态 + 动态）全部中文化**。
2. 建立**可复用的机制与守卫**，使后续铺开到其余 90 个引擎成为「重复劳动」而非「重新设计」。
3. 产出**真实耗时数据**（每引擎平均改多久），供铺开批次划分决策。

### 1.2 非目标（明确不做）

| 不做 | 理由 |
|---|---|
| 铺开到其余 90 个引擎 | 形态未验证；本批只为验证形态 + 攒数据 |
| 清理 `translateCalcOutput` 的 129 个死键 | 它们与 `dead-i18n-keys-guard` 有依赖（主规格 §19.34 记过「删键让别的门禁变红」的教训） |
| 改引擎的**计算逻辑 / 阈值 / 输入定义** | 宪法：本批只碰「输出形态」，不改 calc |
| 动 `staticExamples` 的生成机制 | `codegen-examples.mjs` 自动重生成即可 |

---

## 2. 形态：引擎吐「标签码 + 值」，zh 侧查 locale 拼装

### 2.1 总体数据流

```
                    en 页                          zh 页
                    ────                          ────
引擎 calculate()  ──▶ 原样英文文本 ─────────▶ 引擎吐「码 + 值」
引擎 customFn    ──▶ 原样英文文本 ─────────▶ 引擎吐「码 + 值」
                                                  │
                                    ┌─────────────┴─────────────┐
                                    ▼                           ▼
                        服务端：查 locale 得模板        服务端：把本工具的
                        （src/lib/calc-output-        模板子集注入 DOM
                         templates.ts）                属性
                                    │                           │
                                    ▼                           ▼
                        SSR 静态卡片 = 中文              客户端 customFn
                        （src/pages/[lang]/[slug].astro 运行时查同一张表
                         的静态路径）                    ⇒ 动态卡片 = 中文
```

### 2.2 三个设计要点

1. **一个模板表，两处使用** —— 服务端查它渲染静态卡片；同一张表被序列化进 DOM 属性，客户端 `customFn` 运行时查它渲染动态卡片 ⇒ **不会出现「静态中文、动态英文」的分裂**。
2. **locale 不进客户端 bundle** —— 沿用 B3-4 已验证的做法（`en.json` 970KB + `zh.json` 944KB 绝不能进 bundle）。只把**本工具用到的模板子集**注入（几十条）。
3. **降级是内建的** —— zh 缺键时自动回退（见 §6.3 的 token 自带兜底）⇒ 页面永远显示可读文本而不是裸 token。

### 2.3 token 协议（B-1 标签码 + B-2 行码）

⭐ **token 的完整形态 = 「码 + 英文兜底」**（`码|英文原文`）—— 原因见 §6.3 的漏洞修补。

#### B-1 标签码（覆盖 86.6% 的行）

```
英文现状：  • Starting MRR:      $12,000
B-1 后：    • $calc_out.label.starting_mrr|Starting MRR      $12,000
            ← 标签变成「码|英文兜底」，值不动
locale：   calc_out.label.starting_mrr = "Starting MRR" / "起始 MRR"
```

#### B-2 行码（覆盖结论句等 13.4%）

```
英文现状：  • Path A — raise total contract value by $300,000 (same customers, larger deals)
B-2 后：    • $calc_out.mrr.row.path_a|Path A — raise total contract value by {total} (same customers, larger deals) {total} $300,000 {note}
            ← 「行码|英文兜底模板」+ 动态值 + 收尾片段
locale：   calc_out.mrr.row.path_a = "路径 A —— 把合同总价值提高到 {total}（同样的客户数，更大的单子）"
```

#### ⭐ token 语法必须避开 `{param}` 冲突

**冲突**：locale 已有 **97 个键**使用 `{param}` 占位符（`fillTemplate` 逐个替换）。若 token 也写成 `{ns.key}`，两者形态相同 ⇒ 替换顺序会产生歧义（token 被当参数名吃掉，或参数被当 token 替换）。

**解法**：token 用 **`$` 前缀**，与 `{param}` 完全正交。

- `$` 在引擎输出里**从未出现**（实测：所有输出只有 `$数字` 形式的金额）⇒ 零误判风险。
- ⭐ **token 名 = locale 键名 + `$` 前缀** —— 渲染时去掉 `$` 即为 locale 键 ⇒ **一个正则同时完成「找 token」与「查键」**，不需要第二张映射表。
- ⚠️ **兜底原文里允许有 `$`**（B-2 的英文模板常含金额）⇒ 正则必须「遇到 `$` + 字母才停、遇到 `$` + 数字继续吃」。

**最终正则**：

```
\$([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)(\{[^{}]*\})?(?:\|((?:(?!\$[a-z])[^|\n\r])*)\|)?
```

- 捕获组 1 = 码（≥2 段，字母开头）⇒ `$12,000` **不匹配**（数字开头）⇒ 金额安全。
- 捕获组 2 = params JSON（可选）。
- 捕获组 3 = 英文兜底原文（可选）。
- ⚠️ 切分只按**第一个** `|` ⇒ **行码文案里禁用 `|`**（`beautifySections` 用 ` | ` 分隔维度行）。
- ⭐⭐ **兜底以收尾终止符 `|` 收住**（2026-11-13 用户拍板，原为「兜底吃到行尾」）：
  - **旧**：兜底段是 `(?:(?!\$[a-z])[^|])*` ⇒ **贪心到行尾** ⇒ token 后面的一切文本都被吞进兜底
    ⇒ ① 缺 locale 键时英文兜底吞掉后续内容；② token 无法只包标签 ⇒ 标签模板替换时**数值一起消失**。
  - **新**：兜底段是 `(?:(?!\$[a-z])[^|\n\r])*\|` ⇒ 兜底 = **两个 `|` 之间** ⇒ 边界明确。
  - ⇒ token 形态：`$code{params}|兜底|`（`makeToken` / `tk` 自动补收尾 `|`）。
  - ⇒ **label token 可以只包标签**（冒号 / 对齐空格 / 数值留在 token 之外）⇒ locale 标签模板保持裸标签、可跨引擎复用。
  - ⇒ **row token 仍是整行**（数值用 params 插值）⇒ locale 模板 = 整行 + `{param}`。
- ⚠️ 原文里**允许** `{param}`（B-2 需要）⇒ 模板插值在 token 替换**之后**做，两步互不干扰。
- 守卫额外断言：「输出里除 `$` + 数字与 token 外，无其它 `$` 出现」。

### 2.4 locale 键命名（沿用仓库既有惯例）

既有命名空间实测：`tools.*`（4931 键）/ `decision_tip.*`（75 键）/ `engine_health.*`（32 键）/ `engine_snapshot.*`（28 键）。

本批沿用 `decision_tip.*` 的**共享命名空间**先例：

```
calc_out.*               B-1 标签：跨工具共享（如 calc_out.label.base_acv）
calc_out.<slug>.row.*    B-2 行码：每工具独有（如 calc_out.mrr.row.path_a）
```

⭐ **B-1 共享、B-2 独有** —— 与实测吻合：58 个标签被 ≥2 工具共用（共享可省 196+ 次重复），而行码几乎都是单工具的。

### 2.5 与既有 `translateCalcOutput` 的关系（⭐ 关键）

**风险**：`translateCalcOutput` 用**整串精确匹配**（`out.split(en).join(localized)`），覆盖 14 个真键（`⚖️ Break-Even` 命中 93 页、`💰 Savings Insights` 200 页、`💡 Tip` 200 页）。引擎一旦吐 token，这些英文原文从文本里消失 ⇒ **zh 页章节标题会退回英文**（比现在更糟）。

**处置（三条一起上）**：

| 措施 | 做什么 | 为什么 |
|---|---|---|
| **① 章节标题也 token 化** | 引擎吐 `$calc_out.section.snapshot|💰 MRR Snapshot` 而不是 `💰 MRR Snapshot` | 标题与正文走**同一套机制** ⇒ 不存在「正文中文、标题英文」的割裂 |
| **② `translateCalcOutput` 保留但降级为「兜底」** | 它继续处理**未 token 化的引擎**（试点外的 90 个） | 试点是增量 ⇒ 不能为了 10 个工具弄坏其余 90 个 |
| **③ 死键清理不在本批** | 129 个「注释裸词」键是历史遗留，靠字面量巧合在用 | 与 `dead-i18n-keys-guard` 有依赖 ⇒ 动它风险外溢 |

⭐ **①②的交互是自动的**：token 化之后，`translateCalcOutput` 的整串替换对**已 token 化的引擎**不再命中（英文原文已消失）⇒ 自动降级为 no-op ⇒ **不需要写分支逻辑**。

---

## 3. 试点清单（10 个工具，覆盖全部形态）

| 工具 | 形态 | 英文行 | 为什么选它 |
|---|---|---|---|
| project-profitability | 长叙述 | 99/147 | 英文最严重 ⇒ 最坏情况 |
| rent-vs-buy | 长叙述 + Comparison | 87/164 | Comparison 行是特殊形态 |
| brrrr | 长叙述 | 69/116 | 真实投资语义（IRR / DSCR） |
| mrr | 长叙述 | 60/91 | 有 `customFn` 双实现 ⇒ 验证双份同步 |
| coupon-attribution | 表型 | 55/123 | 验证「表型输出」不被改坏 |
| saas-valuation | 中型 | 22/39 | 中型代表 |
| acv | 中型 | 19/36 | **B3-4 已迁 🧭 四层** ⇒ 改造后结构参照 |
| funnel-step | 短表 | 7/10 | 短表型代表 |
| activation-rate | 短表 | 4/5 | 几乎全中文 ⇒ 确认**不改坏** |
| stickiness | 短表 | 4/5 | 同上 |

覆盖矩阵：3 种长度形态 × Comparison 行 × 表型输出 × 已迁 🧭 的引擎 × 有 `customFn` 双实现的引擎。

---

## 4. 文件改动清单

### 4.1 新建（6 个）

| 文件 | 职责 | 层 |
|---|---|---|
| `src/lib/calc-output-i18n.ts` | **纯逻辑**（不 import locale）：token 解析 + 渲染 | 服务端 + 客户端共用 |
| `src/lib/calc-output-templates.ts` | 服务端专用：查 locale 得模板表（与 `decision-tip-templates.ts` 同构） | 服务端 |
| `tests/calc-output-i18n-guard.test.ts` | G1（中文信息量）+ G3（静态==动态）+ 模板表守恒 | source-only |
| `tests/calc-output-render-guard.test.ts` | G2（产物层无残留 token） | build-dep |
| `tests/scripts/mutate-p168-calc-output.mjs` | 变异台子 P1~P5 | — |
| `tests/scripts/p168-calc-output-audit.mjs` | 体检工具（验收数字可复算） | — |

### 4.2 修改（4 类）

| 文件 | 改什么 | 影响面 |
|---|---|---|
| `src/engines/<cat>/<slug>.ts` × 10 | 标签字面量 → token；结论句 → 行码；**两份实现同步** | 试点 10 个引擎 |
| `src/i18n/locales/{en,zh}.json` | 新增 `calc_out.*` 键 | +N 键 |
| `src/pages/[lang]/[slug].astro` | ① 静态路径接 `renderCalcOutput` ② **动态路径补翻译环节** ③ 注入模板子集到 DOM | 页面层；**试点外 90 个引擎不受影响** |
| `scripts/codegen-examples.mjs` | 若 token 化影响 staticExamples 生成 | 待测 |

---

## 5. 执行顺序（依赖链）

```
① 建 src/lib/calc-output-i18n.ts（纯逻辑）+ 单测
   ↓
② 建 src/lib/calc-output-templates.ts（服务端查 locale）
   ↓
③ locale 加 calc_out.* 键（en 必需 + zh）
   ↓
④ 改 10 个引擎（token 化）+ 同步 customFn
   ↓
⑤ 跑 codegen-examples（自动重生成 staticExamples）+ --check
   ↓
⑥ 改 [slug].astro：静态路径接渲染 + 动态路径补翻译 + DOM 注入
   ↓
⑦ 写守卫（G1/G2/G3）+ 变异台子 P1~P5 + 体检工具
   ↓
⑧ 全量验收（tsc / 构建 / 守卫 / 台子 / 全量套件）
   ↓
⑨ 文档同步（AGENTS 维度行 / 规格 §19.35 / CHANGELOG / INDEX）
```

⚠️ **④⑤ 的顺序不能反**：引擎改完必须先重生成 staticExamples，否则产物是陈旧的（旧英文）⇒ G2 守卫会误红。

---

## 6. 验收判据

### 6.1 三条判据 → 三个独立断言（⚠️ 一条变异只红一条断言）

| # | 判据 | 落在哪层 | 专属变异 |
|---|---|---|---|
| **G1** | **中文信息量 ≥ 英文 × 0.7** | source-only（跑引擎输出） | P1：把某个 zh 模板改短 |
| **G2** | **无残留未解析 token** | build-dep（产物）+ source-only（模板表守恒） | P2：删一个 locale 键 |
| **G3** | **静态层 == 动态层** | source-only（跑两份实现比对） | P3：让 `customFn` 与 `calculate()` 吐不同 token |

**G1 的口径**：CJK 字符记 **0.5**、Latin 词记 **1** —— 与 `decision-support` 守卫同口径（自校准，不需要魔法数）。

⭐ **为什么用相对断言而不是绝对字数**：忠实的中文天然比英文短（仓库实测 burn-rate en 63 → zh 48 ≈ **0.75**）⇒ 用绝对字数会把每段忠实翻译都误判为「太短」⇒ 会把编辑逼向「注水式中文」或「删掉英文才写得下」。

### 6.2 G2 的两个方向必须合成一条

```
引擎实际吐的 token 集合  ==  locale 里该工具的模板键集合
```

- 方向一：引擎吐了 `$calc_out.foo` 但 locale 没有 ⇒ **红**（zh 页会显示裸 token）
- 方向二：locale 有 `$calc_out.foo` 但引擎不再吐 ⇒ **红**（死键）

⚠️ 双向但**写成一条** —— 否则「删 locale 键」会同时红两条 ⇒ 违反隔离纪律。

### 6.3 ⭐⭐ 模板缺失的降级：token 自带英文兜底

**问题**：token 化把英文换成了 token ⇒ **原文案在运行时已经不存在了** ⇒ 若 locale 缺键，没有任何地方能拿到兜底文本 ⇒ 页面会显示**裸 token**。

**解法**：token 自带英文原文（形态见 §2.3）：`$码|英文原文`。

**渲染规则（三步，顺序固定）**：

1. 用正则切出「码」与「英文原文」（只按**第一个** `|` 切）；
2. 查 locale：**zh 有 ⇒ 用 zh 模板**；**zh 无 ⇒ 用切出的英文原文**（这就是兜底）；**zh 无且英文原文为空 ⇒ 保留 token 原文**（守卫负责让这种情况在 CI 里变红）；
3. 模板里的 `{param}` 用行内动态值插值（`fillTemplate`）。

⇒ **不依赖 en locale 也能正确降级** ⇒ 删掉 en 键只会让页面退回英文（可读），不会显示裸 token。

⚠️ **代价**：引擎输出变长（每个 token 多带一份英文原文）⇒ `customFn` 的字符串也会变长。可接受：① 客户端拿的是**渲染后**的文本，不带 token；② token 只存在于引擎吐出的中间态。

### 6.4 变异台子

| ID | 变异 | 应红的断言 |
|---|---|---|
| P1 | 把某个 zh 模板改短（信息量 < 0.7） | G1 |
| P2 | 删一个 locale 模板键 | G2 |
| P3 | 让 `customFn` 吐一个与服务端不同的 token | G3 |
| P4 | 让引擎吐一个 locale 里没有的 token（如 `$calc_out.mrr.row.nope`） | G2 |
| P5 | 让 zh 模板变成英文（等于没翻译） | G1 |

### 6.5 验收清单（全部实测，不许推断）

```
cmd.exe /c "npx tsc --noEmit"
cmd.exe /c "set RUN_BUILD_TESTS=1&&pnpm build"
node tests/scripts/p168-calc-output-audit.mjs
node node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 tests/calc-output-i18n-guard.test.ts
cmd.exe /c "set RUN_BUILD_TESTS=1&& node node_modules\tsx\dist\cli.mjs --test --test-concurrency=1 tests\calc-output-render-guard.test.ts"
node tests/scripts/mutate-p168-calc-output.mjs
cmd.exe /c "set RUN_BUILD_TESTS=1&&node tests\run.mjs"
```

**必须同时满足**：tsc 0 error · 构建 438 页 · 体检「10 个试点工具的 zh 卡片中文信息量 ≥ 英文 × 0.7」· G1/G2/G3 全绿 · 台子 P1~P5 **全部 KILLED**（每条精确红 1 条）· 全量套件 **0 fail**。

---

## 7. 风险与缓解

| 风险 | 缓解 |
|---|---|
| **token 与 `{param}` 冲突** | token 用 `$` 前缀（§2.3）⇒ 正交 |
| **locale 缺键 ⇒ 裸 token** | token 自带英文兜底（§6.3）⇒ 降级到英文而非裸码 |
| **兜底原文里的 `$` 被正则截断** | 正则用「`$` + 字母才停」（§2.3）⇒ 金额完整 |
| **`|` 与维度分隔符冲突** | 行码文案禁用 `|`（§2.3） |
| **章节标题退回英文** | §2.5 的 ①（章节标题也 token 化）+ ②（`translateCalcOutput` 保留兜底） |
| **`customFn` 与服务端不一致** | G3 断言 + 既有 `codegen-customfn --check` |
| **`staticExamples` 陈旧** | ⑤ 先重生成再验收；`codegen-examples --check` 守漂移 |
| **试点外 90 个引擎受影响** | `translateCalcOutput` 保留；新渲染**只在有 token 时生效**（无 token ⇒ 原样返回） |
| **locale 死键** | 模板表守恒双向断言（§6.2） |
| **工作量大到无法收敛** | 本批只做 10 个 ⇒ 最坏损失可控；且能产出每引擎耗时数据 |

---

## 8. 维度 3 scan

> **维度 3 scan: 基于信号 ① Google 对多语言页面的指引**（zh 与 en 是**两个独立市场**，各有各的搜索意图；zh 页给中文用户看，就必须给中文内容）—— 本批把 zh 结果卡片从英文改成中文，正对齐这条。
> **② 本仓库实测**（2026-11-12）：zh 页 75/100 的结果卡片整段英文（2048 行）、动态层 100/100 零中文；主规格 §19.30.6 早就把它记成「量级远大于本批，单独排期」⇒ 现在量级已经量清，可以开工。
> **③ 业界同证**：B3-4 的「建议码 + locale 模板」形态已在本站验证可行（19 个工具已迁、zh 页动态层中文）⇒ 本批沿用同一形态，不另创机制。
> ⇒ 三条信号共同指向「**动态文案要可翻译，就先给它一个稳定的语义码**」⇒ 因此修法是**换输出形态**，不是加词表。
> ⚠️ **AI 不擅自改 Roadmap / Phase**：本批是 P168 批次 3 的独立一支（不新增/重排批次）；不新建工具；不改任何计算逻辑与阈值。

---

## 9. 未解决

1. ⏳ **铺开到其余 90 个引擎的批次划分** —— 本批验收后按实测耗时决定。
2. ⏳ **GSC 2~4 周观察窗口**（2026-11-11 起算）：zh 页的中文结果卡片对 zh 查询的展示/点击影响 —— 本批的真正验收指标本地测不出来。
3. ⏳ **`translateCalcOutput` 的 129 个死键** —— 与 `dead-i18n-keys-guard` 有依赖，需单独排期。
4. ⏳ **zh 页的结果卡片之外**（如 `about` / `terms` / 主题页的动态层）是否还有同类缺陷 —— 本批只查工具页。
---

## 10. 实施期实测修正（2026-11-13）

> ⭐ 本节记录**实施期发现并已修正**的规格漏洞。每条都**有工具可复算**，不是复盘感想。
> 实施期发现的问题分两类：**协议本身的漏洞**（10.1 / 10.2）与**守卫口径的漏洞**（10.3 / 10.4 / 10.5）——
> 后者更值得记：**守卫绿灯不等于判据成立**，必须回头验证「这条判据在缺数据时会不会真空绿」。

### 10.1 ⭐⭐ 兜底必须以收尾终止符 `|` 收住（用户 2026-11-13 拍板）

§2.3 原写「fallback 吃到行尾」⇒ 兜底捕获组是 `(?:(?!\$[a-z])[^|])*` ⇒ **贪心**。

- **实测**：`$calc_out.label.x|A\nB\nC` 的兜底捕获成 `"A\nB\nC"` ⇒
  ① 缺 locale 键时**英文兜底吞掉后面整段文本**；
  ② **token 根本做不到「只包标签」** ⇒ locale 的裸标签模板会把**数值一起替换掉** ⇒ **页面上数字消失**（en/zh 都丢）。
- **修法**：兜底以**收尾终止符 `|`** 收住（`$code|兜底|`）⇒ 兜底 = 两个 `|` 之间 ⇒ 边界明确。
  `makeToken` / `tk` **自动补**收尾 `|` ⇒ 用构造器写的 token 源码一个字都不用改；**字面量写法必须自己补**。
- **代价**：核心模块 + G2c 守卫 + 协议三处同步；已 token 化的 2 个引擎返工；8 个未开工引擎按新格式写（无额外成本）
  ⇒ **改在���便宜的时刻**。

### 10.2 ⭐⭐ 动态拼码禁止：code 必须来自**字面量映射表**

- **实测**（funnel_step）：`'calc_out.funnel_step.row.band_' + band` ⇒ 静态扫描器把**拼接前缀**当成一个 code ⇒
  ① locale 里没有 `calc_out.funnel_step.row.band_` ⇒ 守卫假红；
  ② locale 里真正的 4 个键（`band_excellent` 等）全部变成**死键**。
- **修法**：code 必须是**字符串字面量**；有分支时用**字面量映射表**
  （`{excellent:'calc_out.x.band_excellent', ...}`）⇒ 扫描器直接认表里的字面量 ⇒ 两个方向同时闭合。

### 10.3 ⭐⭐ G3 的「服务端区」切分曾让整条判据**真空绿**

- **实测**：旧口径把「服务端区 = `const customFn` 声明之前」⇒ 而**多数引擎的服务端实现在 engine 对象里**
  （`generate()` 方法）⇒ 服务端 token 集合**恒为空** ⇒ 「空集 == 空集」⇒ **G3 对绝大多数引擎什么都没比就绿了**。
- **实测**：唯一暴露问题的是布局不同的 funnel_step（服务端在 engine 对象里 ⇒ 服务端 0 / 客户端 10 ⇒ 假红）。
- **修法**：服务端区 = **整个文件去掉 customFn 声明**；客户端区 = customFn 声明本身。
  并补 **检测器自检**（造一个「服务端实现在 engine 对象里」的假引擎 ⇒ 必须看得见）
  + **非真空绿断言**（试点引擎的两边 token 集合都不得为空）。

### 10.4 ⭐ token code 提取必须**先剥注释**

- **实测**：注释里写「⛔ 不要写 `'calc_out.x.row.band_' + band`」⇒ 提取器把注释里的 code 当成「引擎已声明」⇒
  死键看起来是活的、伪 code 会假红。
- **修法**：`tokenCodesIn` 先过 `stripComments`（扫描器实现 ⇒ 字符串字面量逐字保留，含 customFn 的 JS 源码）。

### 10.5 ⭐⭐ 并行改造必须有**单引擎作用域**的闸门

- **问题**：全局守卫把 10 个试点的问题**汇总**成一条断言 ⇒ 3 个 agent 并行时互相看到对方的红
  ⇒ agent 会去改**不属于自己**的引擎（实测已发生）。
- **修法**：`tests/scripts/p168-engine-check.ts`（**入库可复算**）把同一条不变量**按引擎拆开**：
  ① locale 缺键 ② 死键 ③ 服务端 ≡ 客户端 ④ 兜底 ≡ locale.en 模板 ⑤ 英文页零变化。

### 10.6 新增判据与工具清单

| 判据 | 含义 | 守卫 | 可复算工具 |
|---|---|---|---|
| **G6** | 服务端输出 ≡ 客户端 customFn 输出 | `tests/calc-output-parity-guard.test.ts` | `tests/scripts/p168-server-client-parity.ts` |
| **G8** | 兜底渲染 ≡ locale.en 模板渲染 | `tests/calc-output-render-parity-guard.test.ts` | `tests/scripts/p168-render-parity.ts` |
| **G9** | 英文页零变化（兜底渲染 == HEAD 的 `staticExamples[0]`） | `tests/calc-output-en-parity-guard.test.ts` | `tests/scripts/p168-en-page-parity.ts` |
| **G1b** | 占位符后的 `%` 不得在 zh 侧丢失 | `tests/calc-output-i18n-guard.test.ts` | — |
| — | 单引擎作用域闸门 | — | `tests/scripts/p168-engine-check.ts` |

### 10.7 ⭐⭐ tip 行的「语言标记」必须语言无关（2026-11-13 实测）

**现象**：zh 卡片比 en 卡片**多一条** `💡 提示: …` 行（实测 **16 页**，其中 mrr / project_profitability 是本批试点）；该行的**正文仍是英文**。

**根因（两层）**：

1. zh 页的 `translateCalcOutput` 会把「💡 Tip:」改写成「💡 提示:」；
2. `ResultCard.astro` 的 tip 过滤器**只认英文标记** ⇒ zh 上**失配** ⇒ 那行没被过滤。

⚠️ 连带损伤：`data-calc-output-raw` 里的**英文原文**被正确过滤 ⇒ **SSR 与客户端 beautify 的行结构不一致**（hydration 后那行消失 ⇒ 布局跳动）。

**修法**：

- 标记清单与判定抽到 `src/lib/calc-output-i18n.ts` 的 `CALC_OUTPUT_TIP_MARKERS` / `isCalcOutputTipLine`（**唯一实现**），覆盖**英文 / 中文半角冒号 / 中文全角冒号**三种形态；
- 新增 **G11**（源码级单测，断言三种标记都认 + 非 tip 行不误杀）+ 变异 **P9**（删中文标记 ⇒ G11 必红）。

### 10.8 ⭐⭐ 产物层守卫曾**从未执行过**（2026-11-13 实测）

**G4**（zh 卡片不得残留裸 token）需要 `RUN_BUILD_TESTS=1`，而常规套件不带这个变量 ⇒ 这条守卫**一次都没跑过**；而且它的提取方式把 `data-calc-output-raw`（token **原文**，必然含 token）与 `data-calc-output-templates`（模板表 JSON，含**英文** locale 值）一起算进「卡片文本」⇒ 即便真跑也**必然误报**。

**修法**：

- 新增 `tests/scripts/p168-card-text.mjs`（**入库可复算**）：剥掉两个 `data-*` 属性 + 只取**文本节点**（不取 HTML 标签名）；
- **G4 重写**：G4（无裸 token）+ **G4b**（en/zh 卡片**行数一致** —— 离散可判定，比「无整行英文」更强）+ **G4c**（无整行英文）+ **非真空绿断言**（卡片必须真的取到 ≥5 行 ⇒ 提取器坏了立刻红）；
- 新增 `tests/scripts/p168-card-parity.mjs`（产物层 parity 表，`--check` 可当门禁）。

⚠️ **体检脚本自己也要被体检**：旧体检把 HTML 标签当「英文行」数、又没剥模板属性 ⇒ 报出 `rent_vs_buy 44/223` 这类**假阳性**（真相 0）⇒ 排查方向整个跑偏。⇒ 判据：**代理指标必须先证明提取口径对**（拿已知为真的样本手算对账）。

### 10.9 ⭐ tip 正文也要 token 化（2026-11-13 实测）

brrrr（3 个分支变体）与 coupon_attribution（4 个 band 变体）的 tip 正文是**硬编码英文** ⇒ zh 卡片仍有英文段落 ⇒ 与本批「zh 页结果卡片英文化」的目标冲突。

**修法**：token code 用**字面量**、**整行**包（含 `💡 Tip: ` 前缀 ⇒ en 页零变化），locale 落库 **+7 / -0**；zh 模板用 `💡 提示：`（全角冒号，与既有 `calc_out.*.row.tip_*` 一致）。

⚠️ 客户端 customFn 里这些 `tk(...)` 的 code 必须用**裸单引号**（不能写成 `tk(\'...\')`）⇒ 否则 G3 的 `tk\(['"]` 模式**匹配不到** ⇒ 误判「客户端没声明」。

### 10.10 ⭐⭐ 给「孤儿键守卫」加豁免前，先确认有更强的不变量接手死键判定（2026-11-13 实测）

全量套件跑出唯一 1 条失败：`no orphan translation keys (每个 locale key 都被某个 t() 调用引用)`。

**根因**：该守卫靠「源码里有没有字面量 `t('key')`」判死键；而 `calc_out.<code>` 是**运行时拼出来**的查表键（`src/lib/calc-output-templates.ts` 用 `toolAlias(lang, alias)` + 引擎吐出的码去查）⇒ 源码里根本没有 `t()` 调用 ⇒ **417 个键全被判成孤儿**。

**修法**：把 `calc_out.` 加进 `tests/translation-glossary-guard.test.ts` 的 `DYNAMIC_KEY_PREFIXES`（与既有 `decision_tip.` 同一模式）⇒ **死键判定交给 G2**：引擎声明的 token 集合 == locale 的 `calc_out.*` 键集合，**双向**比对、且扫全部 100 个引擎 ⇒ 放行不削弱覆盖率。

⚠️ **豁免必须配负对照实测**：往 locale 塞一个死的 `calc_out.__neg_dead_key__` ⇒ G2 精确报红「locale 有 calc_out.__neg_dead_key__，但没有任何引擎声明它（死键）」⇒ 还原后 sha256 逐字节一致 ⇒ 证明**豁免没有变成覆盖漏洞**。

# P168 批次 3 · B3-16：修 3 条真实 locale 模板缺陷 + 把 G8 升级为「非等比」守卫

> **状态：** 计划已入库，实施待办（用户 2026-11-25 拍板：**授权改 `src/engines/**`**，修完 D-1/D-2/D-3 并升级 G8）。
> **起点 commit：** `cbd520b`（B3-15 修复轮）· **G9 基线钉：** `361e6cc`（B3-15 令牌化前最后一个提交，**不得用 HEAD**）。

## 0. 一句话

本批修掉 B3-15 修复轮量出的 **3 条真实「模板 ≠ 兜底」缺陷**（其中 1 条是**用户可见的错误数字**），并把暴露它们的那把尺子 —— G8 —— 从「保比扰动」升级为「非等比扰动」，让它从**只对 73→100 个引擎的默认形态有效**变成**对全站 2,403 个 code 的多形态有效**。

## 1. 背景：这些缺陷是怎么被发现的

B3-15 修复轮给 G8（`tests/scripts/p168-locale-roundtrip.ts`）加「非等比变体」时，暴露了 3 条真实缺陷。
但 G8 本体当时**没有合并**（合并会让 CI 守卫 `tests/calc-output-template-parity-guard.test.ts` 变红，而修缺陷要改 `src/engines/**` ⇒ 需 user 拍板）⇒ 增强能力被放进诊断脚本 `tests/scripts/p168-locale-roundtrip-nonratio.ts`（exit 0 · 非守卫 · 已进 CI `--strict`）。

user 2026-11-25 拍板：**授权改引擎，修完 3 条并升级 G8** ⇒ 本批把那条分叉合回去。

## 2. 3 条缺陷 · 根因 · 修法 · 验收

### D-1 · `calc_out.revenue_projector.row.whatif_runway` —— **用户可见的错误数字**

| 项 | 内容 |
|---|---|
| 现象 | 兜底渲染 `   Runway: 60.0 mo → 150.0 mo`，locale 模板渲染成 `   Runway: 60.0 mo → **60.0 mo**` ⇒ **第二个数字被冻成第一个** |
| 根因 | **locale 模板笔误**：`en.json` / `zh.json` 里写成 `{from} → {from}`（`{from}` 出现 2 次），而引擎 `src/engines/saas/revenue-projector.ts:274` 的 params 明确是 `{ from: …, to: … }` |
| 影响面 | **en / zh 两侧都受影响**（`zh.json` 同为 `{from} → {from}`）⇒ zh 页也显示错误跑道数字 |
| 修法 | **只改 locale 模板**：en + zh 各把第二处 `{from}` 改成 `{to}` ⇒ **不动引擎** |
| 已干跑验证 | 控制器在内存里干跑（**未改任何文件**）：命中 2 个变体下 **en 侧不一致 2 → 0**、**zh 侧数字序列不一致 2 → 0**；修后渲染 = 兜底（`60.0 mo → 150.0 mo` / `3.8 mo → 5.1 mo`） |
| G9 影响 | 该 code **不在** `revenue_projector` 的 `staticExamples` 里 ⇒ **英文静态卡片不变** ⇒ G9 绿（只影响内联 locale JSON 与客户端动态卡片） |
| 同族扫描 | 全仓 locale 里「同一占位符出现 ≥2 次」的 code 共 **8** 个，**只有 D-1 是笔误**；其余 7 个（`article_freshness.snapshot` 的 `{total}`、`churn_rate.break_even_eroding` 的 `{be}`、`compound_interest.goal_years` 的 `{years}`、`ltv_by_channel.breakeven_cut_cac` 的 `{pct}`、`rent_vs_buy.whatif_stay_horizon_{5y,10y,15y}` 的 `{years}`）是**合法的「同一值该出现两次」** ⇒ 且它们在非等比变体下渲染一致（诊断脚本的实际不一致集合里不含它们） |

### D-2 / D-3 · `deepseek_api_cost` / `gemini_api_cost` 的 `row.input_cost` —— 列对齐差 **2** 个空格

| 项 | 内容 |
|---|---|
| 现象 | 兜底 `Input:  400     tokens × $0.30/1M → $0.0001/req`（**5** 空格）vs 模板渲染 `Input:  400   tokens × …`（**4** 空格）⇒ 差 2 |
| 根因 | 引擎兜底用 `pad(lc(inTokens), 7)` 对齐，模板的 `{tokens}` 拿的是**未 pad** 的值（`{ tokens: lc(inTokens), … }`） |
| 为何旧台子看不见 | 旧变体集只有「默认 / ×2 / ×3+1」⇒ tokens 恒为 **4 位**（1000/2000/3001）⇒ pad 补的 **3** 格恰好等于模板的 **3** 格 ⇒ **结构性失明** |
| 现成范式 | **同仓库已有正确写法，不必重新发明**：① 同引擎的 `row.output_cost` 用 `{ tokens: pad(lc(outTokens), 7), … }` ② `src/engines/ai-cost/openai-token-calculator.ts:373-386` 的 `row.input_cost_line` 用 `const inputTokensLabel = pad(lc(inTokens), 7);` + params `{ tokens: inputTokensLabel, … }`，其 locale 模板正是 `"Input:  {tokens} tokens × {price}/1M → {cost}/req"`（**1** 空格） |
| 修法（**4 步，缺一不可**） | ① 引擎 params 改传 pad 值（照抄上述范式）② locale en + zh 模板 `{tokens}   tokens` → `{tokens} tokens` ③ **`node scripts/codegen-examples.mjs`**（引擎 param 值**直接进 staticExamples 载荷** ⇒ 不重生成 ⇒ `check:examples` 报 DRIFT，且不一致实例会从 **2 涨到 14**）④ `node scripts/codegen-customfn.mjs`（重生成客户端 customFn） |
| 影响面 | en / zh 两侧 |
| 范围界定 | 全仓 `row.input_cost` 只有 **3** 个引擎命中 grep，其中 **openai-token 的 code 名是 `row.input_cost_line`**（另一套范式，**本来就正确**）⇒ 本批只改 **deepseek + gemini** 两个引擎 |

### D-4 · `calc_out.openai_token.row.header_realtime_cache` —— 潜伏的 en 侧不一致（**本批只登记，不修**）

| 项 | 内容 |
|---|---|
| 现象 | 引擎兜底经 `makeToken` 净化后 `\|` → `｜`（全角），locale 模板仍是半角 `\|` ⇒ 兜底 ≠ 模板 |
| 为何测不到 | 该 code 只在 `cacheHitRate > 0` 时吐出，而 openai-token 的输入名是 **`cacheHitRate`**（**不是** `cacheReadHitRate`）且 codegen 默认值 = **0** ⇒ **非等比扰动只扰动正数输入 ⇒ 该输入不被扰动 ⇒ 命中 0 实例** |
| 本批处置 | **登记进诊断脚本的已知缺陷表**（标「已知 · 当前不可达」）⇒ 下一批若改 openai-token 的默认输入就会撞上、且有据可依 |
| 为什么不在本批修 | user 授权范围是 D-1/D-2/D-3；且改它要动 `\|` ⇒ 影响**英文页可见文本** ⇒ 需单独判 G9 |

## 3. G8 升级（本批的另一半）

### 3.1 改什么

`tests/scripts/p168-locale-roundtrip.ts` 的 `variantsOf` 从「base / ×2 / ×3+1（**全保比**）」扩成「base / ×2 / ×3+1 + **逐参数独立扰动**（只改一个输入、其余原样 ⇒ 分子分母不同步）」⇒ 与 `tests/scripts/p168-locale-roundtrip-nonratio.ts` **同构**。

### 3.2 为什么这样才算真的升级

- 旧 G8 的 3 个变体**全部保比** ⇒ 比例型 param（`stale/total`）的值**恒定** ⇒ 「模板冻结数值」这条逃逸在**全站 2,403 个 code**上都看不见。
- 非等比变体下，比例型 param 立刻变化 ⇒ 逃逸被堵住。
- ⚠️ **升级前必须先实测**：非等比变体集下 G8 的实际不一致数必须 = **0**（修完 D-1/D-2/D-3 之后）⇒ 否则 `tests/calc-output-template-parity-guard.test.ts` 会红。
  （B3-15 修复轮已实测：非等比变体下 G8 的实际不一致集合 = **3 条** = D-1/D-2/D-3 ⇒ 修完这 3 条即为 0。）

### 3.3 单一真相源（防漂移）

`p168-locale-roundtrip-nonratio.ts` 的 en 侧检查改为 **import G8 的 `measure()`**（G8 本体已经 `export function measure()`）⇒ 变体集只有**一处**实现 ⇒ 两把尺子不会各自漂移。
诊断脚本只保留它自己的增量：**zh 侧 3 条判据**（占位符一致性 / 载荷数字计数一致性 / 词面数字差异 + 51 条显式 allowlist）+ 已知缺陷登记表 + 对账。

### 3.4 CI 步骤

`.github/workflows/ci.yml` 已有步骤「P168 non-ratio template parity (strict — only unexpected inconsistencies fail)」⇒ 修完后实际集合 = ∅、已知集合 = ∅ ⇒ 仍 **exit 0** ⇒ **保留不变**。

## 4. 任务拆分

| Task | 内容 | 产出 |
|---|---|---|
| **T1** | 修 D-1（locale）+ D-2/D-3（引擎 + locale + 2 个 codegen） | `src/engines/ai-cost/{deepseek,gemini}-api-cost-calculator.ts` · `src/i18n/locales/{en,zh}.json` · 两个 codegen 重生成产物 |
| **T1b** | `pnpm build:full`（**T1 改了引擎 ⇒ 必须重建 dist**）才能跑产物层守卫 | `dist/`（gitignored） |
| **T2** | G8 升级为非等比 + 诊断脚本收敛到 import G8 + 已知缺陷表清空（3 条转「已修」+ 登记 D-4） | `tests/scripts/p168-locale-roundtrip.ts` · `tests/scripts/p168-locale-roundtrip-nonratio.ts` |
| **T3** | 全量验收 + 文档回填（CHANGELOG / AGENTS）+ 提交 + 推送 + CI 核对 | — |

## 5. 门禁（T2 收尾必须逐条实测）

| 门禁 | 命令 | 期望 |
|---|---|---|
| G8 本体（非等比） | `node node_modules/tsx/dist/cli.mjs tests/scripts/p168-locale-roundtrip.ts` | 2,403 code · **不一致 0** |
| G8 CI 守卫 | `set RUN_BUILD_TESTS=1&& node --import tsx tests/calc-output-template-parity-guard.test.ts` | 2/2 pass · 0 fail |
| 诊断脚本 strict | `pnpm exec tsx tests/scripts/p168-locale-roundtrip-nonratio.ts --strict` | exit 0 · 实际集合 ⊆ 已知集合 |
| 静态卡片漂移 | `pnpm check:examples` | 100 引擎 in sync |
| 客户端 customFn 漂移 | `pnpm check:customfn` | No drift detected |
| i18n 完整性 | `pnpm check:i18n` | exit 0 |
| 引擎覆盖 | `pnpm check:engine-coverage` | exit 0 |
| 类型 | `pnpm exec tsc --noEmit` | exit 0 |
| 英文页逐字不变（G9） | `node node_modules/tsx/dist/cli.mjs tests/scripts/p168-en-page-parity.ts` | 100 试点 · **未记录差异 0**（基线 `361e6cc`） |
| zh 整行英文 | `node node_modules/tsx/dist/cli.mjs tests/scripts/p168-zh-remaining-audit.ts` | 0 个引擎 · **0 行** |
| 欠账台账 | `node node_modules/tsx/dist/cli.mjs tests/scripts/p168-tokenize-remaining-ledger.ts` | 0 条 / 上限 0 · 与实测一致 ✓ |
| 命名空间别名 | `node node_modules/tsx/dist/cli.mjs tests/scripts/p168-token-namespace-alias.ts` | 100 引擎 · 不一致 0 · ALL OK |
| token 自检 | `node node_modules/tsx/dist/cli.mjs tests/scripts/p168-token-selfcheck.ts` | 100/100 ALL OK |
| **死键守卫** | `set RUN_BUILD_TESTS=1&& node --import tsx tests/dead-i18n-keys-guard.test.ts` | ⚠️ **改 zh 模板值可能被判「译文消失」**（该守卫的 `WORKING_KEY_REQUIRED` 硬编码遗留 zh 字串）⇒ 若红 ⇒ **只同步守卫里的字串**（**不改判据**） |
| 套件计数 | `node -e "…walkTestSuites…"` | 301（build-dep 68 + source-only 233）—— 本批**不新增** `.test.ts` ⇒ 不变 |

## 6. 边界（明确不做）

- **不改** 令牌化机制、不改 `TOKENIZED` 清单、不动 zh 整行英文台账（已是 0）。
- **不做** 中英混排批次（已测绘：全站 **785** 行 ew≥1 / **146** 行 ew≥3；成因拆解 = **517 术语型**（改 zh locale 可修）/ **268 变量型**（多为专有名词·单位·月份缩写，**不该译**）⇒ 下一批立项用）。
- **不修** D-4（只登记）。
- **不新增** `.test.ts` ⇒ AGENTS.md 套件计数（68 / 233 / 301）不变。
- **不改** `AGENTS.md` 的引擎分类表 / Defense-in-Depth 行（只在 P168 note 里登记本批）。

## 7. 维度 3 scan 声明

- **本轮未做实时外部市场扫描** ⇒ 不含实时外部信号；沿用 B3-15 计划（`docs/superpowers/plans/2026-11-24-p168-b3-15-tokenize-batch3.md`）中的维度 3 scan 声明。
- **站内信号（本批新增，来源明确）**：
  ① **验收工具自身的盲区会掩盖产物缺陷** —— G8 的保比变体集在全站 2,403 个 code 上「结构性失明」，掩盖了 3 条真实偏差（其中 D-1 是**用户可见的错误数字**）⇒ **先把尺子变严、量出已知洞、再补洞**，比「先补洞、后补尺子」更安全。
  ② **「合法重复」与「笔误」必须靠尺子区分，不能靠肉眼** —— 全仓有 8 个模板含重复占位符，只有 1 个是笔误 ⇒ 人眼扫会误伤 7 个 ⇒ 必须用「模板渲染 ≡ 兜底渲染」判定。
  ③ **同仓库常有现成的正确范式** —— D-2/D-3 的修法不需要重新发明：`openai-token` 的 `input_cost_line` 与同引擎 `output_cost` 已经是正确写法 ⇒ **先找范式，再改代码**。
  ④ **「本轮不动」也要写进台账** —— D-4 虽不在授权范围，但必须登记（已知 · 当前不可达）⇒ 否则下一批改 openai-token 默认输入时会撞上且无据可依。

## 8. 已知风险与预案

| 风险 | 预案 |
|---|---|
| T1 改了引擎 ⇒ `check:examples` / `check:customfn` 报 DRIFT | 修法第 ③ ④ 步已含两个 codegen 重生成 ⇒ **必须两个都跑**（复审实测：只跑 customfn ⇒ 不一致实例从 2 涨到 14） |
| 改 zh 模板值 ⇒ 死键守卫判「译文消失」 | 只同步守卫里的 `WORKING_KEY_REQUIRED` 字串（**不改判据**） |
| G8 升级后不一致 ≠ 0 ⇒ CI 红 | 升级前先跑非等比变体实测（诊断脚本已实测 = 3 条 ⇒ 修完 = 0）；若出现**新**不一致 ⇒ **登记并当场判定**（修 or 显式留账），**不放宽判据** |
| 改 locale ⇒ 英文页内联 JSON 变 | G9 只量**静态卡片**（`data-history-result` 正文）⇒ D-1/D-2/D-3 均不改变静态卡片文本 ⇒ G9 绿；**必须实测确认** |
| 客户端 customFn 重生成 ⇒ 客户端产物变 | `check:customfn` 绿 + G6（服务端 ≡ 客户端）绿 |
| D-4 在下一批撞上 | 本批已登记进诊断脚本的已知缺陷表（随仓库走、不丢账） |

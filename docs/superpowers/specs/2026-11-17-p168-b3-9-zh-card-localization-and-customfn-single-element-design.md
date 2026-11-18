# P168 批次 3 · B3-9 —— zh 结果卡片本地化第二批（top15 剩余引擎）+ customFn 单元素数组契约（设计规格）

> **状态：** APPROVED（user 2026-11-17 拍板范围 =「AI cost 6 引擎动态卡片修复 + top15 剩余引擎令牌化」）
> **维度 3 scan:** 基于信号 ① **GSC 实时展示量排名**（`tmp/gsc-live-status.json` 的 zh 页展示量，top15 剩余引擎 = 501 展示，占剩余 75 引擎的 66%）② **页面渲染契约复核**（`src/pages/[lang]/[slug].astro:2186` 只渲染 `results[0]`）③ **P164 守卫判据欠规格**（`customfn-contract-guard` 只断言「非空字符串数组」，结构上看不见「多元素 ⇒ 内容被丢弃」）。

---

## 0. 本批要解决的两个缺陷（均为实测，非推断）

### 0.1 缺陷 A：customFn 返回多元素数组 ⇒ 动态结果卡片**内容被静默丢弃**

页面对 custom 型引擎只渲染 `results[0]`：

```js
// src/pages/[lang]/[slug].astro:2185-2186
var exportResult = config.type === 'custom' ? results[0] : results.join('\n\n');
if (config.type === 'custom') { results = [results[0]]; }
```

⇒ customFn 若返回 N 个元素，**第 2 行起的全部内容被丢弃**。
⚠️ 静态示例是服务端渲染的完整报告 ⇒ **页面「看着正常」，只有用户真的点「计算」才暴露**。

**实测（B3-9 用真值探针量得，`tests/scripts/p168-customfn-shape-audit.ts`）**：

| 口径 | 数量 | 说明 |
|---|---|---|
| custom 引擎总数 | 100 | 全仓每个引擎都有 customFn |
| 修复前返回多元素 | **63** | ⇒ 动态卡片内容被丢弃 |
| 其中 `results[0]` 只有 1 行 | **31** | 用户点「计算」**只看到一行** |
| 其余（`results[0]` 是多行报告） | 32 | 尾部若干行被丢（最多 3,748 字符） |
| 修复后仍欠账 | **57** | 本批只授权修 6 个 AI cost 引擎 ⇒ 台账钉住这 57 个 |

**B3-8 已修 1 个**（`ai-api-cost-comparison`：动态卡片从「1 行空白」变成 37 行完整报告）。
**本批授权修 6 个**：claude / gemini / deepseek / ai-image / ai-training / gpu-cloud（均为 `return o;` 形态）。

### 0.2 缺陷 B：P164 的 customFn 契约守卫**判据欠规格**

`tests/customfn-contract-guard.test.ts`（P164）断言的是「返回值是非空字符串数组」——
**多元素数组同样满足那条** ⇒ 它在结构上不可能看见缺陷 A ⇒ 63 个中招引擎全程绿灯。
⇒ 本批新增**独立**守卫 G15（`tests/customfn-single-element-guard.test.ts`），守「返回数组长度必须为 1」。

## 1. 范围（user 已拍板）

### 1.1 缺陷 A 的授权范围：6 个 AI cost 引擎

修法（与 B3-8 在 `ai-api-cost-comparison` 上验证过的写法一致）：

```js
// 修复前
"return o;"
// 修复后
"return [o.join('\\n')];"
```

⚠️ `o.join('\n')` 与服务端 `out.join('\n')` **逐字相同** ⇒ G6（两端一致）不受影响。

### 1.2 铺量范围：GSC 展示量 top15 剩余引擎（15 个）

口径：**与 B3-8 完全一致**（`tmp/gsc-live-status.json` 的 zh 页展示量），并用 B3-8 的已知数字自校验：
dirty90 = **2,853** ✓ · B3-8 的 15 个 = **2,096** ✓ ⇒ 口径复现无误。

| # | 引擎 | alias | 展示 | 文件 |
|---|---|---|---|---|
| 1 | email-list-revenue | email_list_revenue | 47 | src/engines/freelance/email-list-revenue-calculator.ts |
| 2 | cap-rate | cap_rate | 44 | src/engines/real-estate/cap-rate-calculator.ts |
| 3 | roas | roas | 43 | src/engines/marketing/roas-calculator.ts |
| 4 | cohort-retention | cohort_retention | 39 | src/engines/marketing/cohort-retention-calculator.ts |
| 5 | market-size-estimator | market_size_estimator | 38 | src/engines/saas/market-size-estimator.ts |
| 6 | ltv-by-channel | ltv_by_channel | 36 | src/engines/marketing/ltv-by-channel-calculator.ts |
| 7 | churn-rate | churn_rate | 35 | src/engines/saas/churn-rate-calculator.ts |
| 8 | pipeline-coverage | pipeline_coverage | 35 | src/engines/sales/pipeline-coverage-calculator.ts |
| 9 | cac | cac | 32 | src/engines/valuation/cac-calculator.ts |
| 10 | ai-training-cost-estimator | ai_training_cost_estimator | 30 | src/engines/ai-cost/ai-training-cost-estimator.ts |
| 11 | content-marketing-roi | content_marketing_roi | 30 | src/engines/marketing/content-marketing-roi-calculator.ts |
| 12 | revenue-projector | revenue_projector | 29 | src/engines/saas/revenue-projector.ts |
| 13 | logo-churn-rate | logo_churn_rate | 26 | src/engines/retention/logo-churn-rate-calculator.ts |
| 14 | email-campaign-roi | email_campaign_roi | 20 | src/engines/marketing/email-campaign-roi-calculator.ts |
| 15 | renewal-rate | renewal_rate | 17 | src/engines/retention/renewal-rate-calculator.ts |

合计 **501** 展示（剩余 75 引擎合计 757 的 **66%**）。令牌化机制与施工配方**逐字复用 B3-8**（`makeToken` / `CALC_OUTPUT_MAKE_TOKEN_JS` / `calc_out.*` 三族命名 / 文本插入式 locale 落库）。

## 2. 非目标（本批明确不做）

1. **其余 57 个欠账引擎的修复** —— 本批只授权 6 个 AI cost 引擎；其余用 G15 台账钉住（§4）。
2. 决策支持铺开到 227 页（zh 侧应在卡片中文化之后做）。
3. 剩余 60 个引擎（top30 之后）的令牌化。
4. 其余 44 个漂移引擎（G6 逐例 diff 后裁定）。
5. `codegen` 剩余 15 个引擎 `defaultInputs` 错配。
6. **页面渲染分支顺序**（`analysis-card` vs 仪表盘卡片）的调整 —— 见 §5 风险。

## 3. 判据（落在不变量上）

| # | 不变量 | 守卫/工具 | 层 |
|---|---|---|---|
| G15 | customFn 返回数组长度 = 1（除台账 57 个） | `tests/customfn-single-element-guard.test.ts` | 源码层（真值执行） |
| G15b | 台账每条都真的丢内容（lost > 0） | 同上 | 源码层 |
| G3/G13 | zh 页结果卡片 0 整行英文 | 既有（范围扩到 40 引擎） | 源码层 + 产物层 |
| G6 | 服务端与客户端输出逐字一致 | 既有 | 源码层 |
| G9 | 英文页逐字不变 | 既有（基线按引擎分组） | 源码层 |
| — | 令牌化自检（英文零变化 / 两端集合一致 / fallback 无半角竖线 / params 无花括号） | `tests/scripts/p168-token-selfcheck.ts` | 源码层 |

## 4. G15 台账设计（让缺陷可见、不可扩大）

`DEBT` 钉住当前 **57** 个欠账引擎，规则：

1. **不得新增** —— 新增欠账 ⇒ set-equal 断言失败；
2. **修好了必须销账** —— 修好后 set-equal 同样失败（台账必须跟着缩）；
3. **每条必须真的丢内容**（lost > 0）—— 台账不许腐化成空条目；
4. **防真空绿** —— 断言台账非空。

⇒ 台账**只能变小、不能变大**，每次变动都在 diff 里看得见。

## 5. 风险与已知边界

1. ⚠️ **合并成单元素后可能改变页面渲染分支**：页面的分支顺序是
   ① 单元素里同时出现 `' → '` 与 `' | '` ⇒ 走 analysis-card（折叠详情）
   ② 否则 custom 且 length===1 ⇒ 走「仪表盘卡片」。
   实测：6 个本批修复的引擎里 **5 个**（claude / deepseek / gemini / ai-image / gpu-cloud）的合并输出同时命中 ①。
   ⇒ **本批不调整页面分支顺序**（属 §2 非目标），改由浏览器目视验收确认「内容完整可见」。
   ⇒ 这是已知的**呈现形态**变化（用户看到折叠详情而非仪表盘卡片），**不是内容丢失**。
2. ⚠️ 「ai-training-cost-estimator」的合并输出有 **1,044 行 / 46,938 字符** —— 合并后卡片很长。
3. ⚠️ 令牌化会把 token code 写进英文兜底 ⇒ 英文页的**渲染结果**逐字不变，但 `staticExamples[0]` 会在 codegen 后含 token（既有机制，B3-8 已验收）。

## 6. 验收判据（可复算）

1. `node node_modules/tsx/dist/cli.mjs tests/scripts/p168-customfn-shape-audit.ts` ⇒ 57 个欠账，6 个本批修复的引擎已是单元素；
2. `node --test tests/customfn-single-element-guard.test.ts` ⇒ 3/3 通过；
3. `node node_modules/tsx/dist/cli.mjs tests/scripts/p168-token-selfcheck.ts` ⇒ **40/40 OK**（25 + 15）；
4. `node node_modules/tsx/dist/cli.mjs tests/scripts/p168-b3-8-audit.ts` ⇒ zh 侧 0 整行英文、0 裸 token；
5. `node node_modules/tsx/dist/cli.mjs tests/scripts/p168-server-client-parity.ts` ⇒ 本批 15 个全部 consistent；
6. `pnpm build` ⇒ 438 页、注入 438；
7. 浏览器（iframe 批量，**用户所见**层）：15 个 zh 页卡片 0 整行英文 + 6 个 AI cost 页动态卡片内容完整；
8. 全量套件 ⇒ 0 fail。

## 7. 维度 3 提议（不在本批范围，待 user 拍板）

**提议：下一批（B3-10）修完剩余 57 个欠账引擎。** 依据：

- 实测 **57** 个引擎的动态结果卡片内容被丢弃，其中 **31** 个用户点「计算」只看到一行；
- 修法已在 7 个引擎上验证（B3-8 的 1 个 + 本批的 6 个），改动量 = 每个引擎一行；
- G15 台账已经把这件事变成**可守的不变量**，每修一个引擎就销一条账，进展在 diff 里可见。

⚠️ 风险：合并后可能命中页面的 analysis-card 分支（§5.1）⇒ 建议 B3-10 同时评估**分支顺序**是否该调整为「custom 型优先走仪表盘卡片」。

## 8. 实施期补记（2026-11-17）

> ⭐ 本节记录**实施期实测推翻本 spec 判断**的部分 —— spec 写的是「计划」，这里是「真相」。

### 8.1 计划阶段的三个判断被实测推翻

1. **「locale 的 `calc_out.*` 段连续且内部按字典序」** —— 前提不成立：本轮 `p168-locale-repair.ts` 用 `JSON.stringify(obj)` **整对象写盘** + 直接赋值 ⇒ 新键被**追加到文件末尾** ⇒ `en/zh` 各 9 个 calc_out 键落在文件尾部 ⇒ 段被撕成两段 ⇒ 落库工具直接抛「段不连续」。
   ⇒ 修法：**有序插入规则抽成共享实现**（`tests/scripts/p168-locale-order.ts`）⇒ 两个落库工具共用一套规则 ⇒ 落库前先归一化 ⇒ **恒为连续一段**。
2. **「模板正确性用源码推导判」** —— 源码推导本身有三条盲区（见 §8.2）。
3. **「往返体检能抓住数值冻结」** —— 只能抓住**分支被换输入走到**的那部分（见 §8.3）。

### 8.2 提取器的三条盲区（全部已修）

| # | 盲区 | 症状 | 修法 |
| --- | --- | --- | --- |
| 1 | `replaceWordValue` 的「不得拆数字」规则**声明了却没接上**（`numericLike` / `isDigitish` 算出来后未使用） | 数值后跟单位后缀（`60.0pp` / `1.25x`）时换不掉 ⇒ 模板数值被**冻结** | 数值型取值的边界改用 `isDigitish`（前后不得是数字/小数点，**允许**后缀字母） |
| 2 | `sourceTemplates` 与 `sourceTemplatesWithOrigin` 用了**两套不同的选择规则** | 同一个 code 在提取器与体检工具里给出**不同模板** ⇒ 落库与体检互相打架 | `sourceTemplates` 统一委托 `sourceTemplatesWithOrigin`（构造器**且全部参数都回填成占位符**才用，否则回落字面量） |
| 3 | 漂移判据拿**运行时烘焙值**当基线（`en[c] !== r`） | 正确的 locale 模板（带占位符）与烘焙值（带具体数字）必然不等 ⇒ **42 条里绝大多数是假阳性** | 基线改为**推导模板** `tpl` ⇒ 真漂移浮出水面 |

### 8.3 往返体检的盲区 ⇒ 新增「逐 token 校验」

往返体检靠「换输入重新走到该分支」来暴露冻结值 ⇒ **分支没被换输入走到的 code 漏过**（实测 claude `health_spread_ok` 的模板冻结成 `10.0x`，该分支只有默认输入会走到 ⇒ 体检绿）。

⇒ 新增工具 `tests/scripts/p168-locale-token-parity.ts`（**不依赖分支是否被重新走到**）：

- ① **占位符守恒**：模板的 `{param}` 集合必须覆盖 token params 里**出现在兜底文本中**的键
  （⚠️ 有些 token 带**装饰性参数** —— 值不在文本里，例 `unit_hrs_per_epoch` 的 `hrs=24`、文本只是 ` hrs/epoch` ⇒ 那类参数**不需要**占位符，否则误报）；
- ② **渲染等价**：用 token 自带 params 渲染 locale 模板 == token 的英文兜底文本。

⇒ 实测 **12,512 次 token 出现 / 1,397 个 code** ⇒ 违规从 **15** 降到 **0**（15 条里 3 条是装饰性参数误报，12 条是真缺陷）。

### 8.4 「数值冻结」在**英文页**同样可见 ⇒ 属 P0

实施期实测发现 **5 个引擎**的英文页显示**错的数字**：roas `at 0% margin`（应 60%）/ cohort_retention `−0.0pp`（应 −20.0pp）/ ltv_by_channel `0.00x`（应 13.33x）/ revenue_projector **四个季度全显示 `Q1`** / logo_churn_rate `(-{churn}.0pp)`（应为 `-{lift}pp`）。

⇒ **这不是中文页的问题，是英文页的缺陷**（locale.en 模板一旦有值，英文页就用它渲染 ⇒ 冻结的数值直接显示给用户）⇒ 本批必须修完。

### 8.5 引擎侧 token 缺参数 ⇒ 模板化不了（3 个引擎）

| 引擎 | 症状 | 修法 |
| --- | --- | --- |
| gpu_cloud_cost | `spot_reserved_tip` 的 **spot/reserved 百分比不在 params 里** ⇒ 模板化不了（locale 里只能写死 60%/30%） | 补 `spot` / `reserved` 两个参数（服务端 + 客户端） |
| deepseek_api_cost / gemini_api_cost | `output_cost` 的 **`pad()` 对齐空格烘焙在模板里** ⇒ token 宽度一变就错位（实测 `1,000` 时模板给 5 空格、源码给 3 空格） | 把 `pad(lc(outTokens), 7)` **移进 param** ⇒ 模板与兜底逐字一致，且**默认输入下英文页渲染结果不变** |

### 8.6 令牌化把「默认输入走不到的分支」暴露成 locale 缺键

`family_gem4` / `family_flash3` / `family_legacy`（gemini + deepseek）/ `health_storage_high`（gpu）这 **5 个 code** 在默认输入下不会被产出 ⇒ 提取器**看不见** ⇒ 但 `calc-output-i18n-guard` 用 `extractEngineTokenCodes` 扫**源码与 customFn** ⇒ 报「locale 缺值」⇒ 补 5 个键（en 逐字等于兜底 + zh 译文）。

⚠️ ⇒ **「提取器看不见」≠「locale 不需要」** ⇒ 缺键判据必须有一路**扫源码**（G2/G12 已覆盖）。

### 8.7 收尾阶段实测暴露的 4 类「zh 卡片整行英文」⇒ 三种不同成因、三种不同修法

产物层守卫 G4c（「zh 卡片不得有整行英文」= CJK ≤ 2 且英文词 ≥ 3）在收尾阶段实测抓到 **4 类** ⇒ **同一句「zh 页有英文」背后是完全不同的成因**：

| # | 页面 / 行 | 成因 | 修法 |
| --- | --- | --- | --- |
| 1 | claude 的 **usage-scenario 每模型行**（静态卡片 3 行） | 该行**根本没进 token**（整行裸文本）⇒ zh 侧无从翻译 | 新 code §calc_out.claude_api_cost.row.usage_scenario_line§（params = icon / model / family / v50~v10k）⇒ **整行令牌化**（服务端 + 客户端两侧） |
| 2 | gemini / deepseek 的**档位行** | 档位名被装进 §{tier}§ **运行时参数** ⇒ locale 模板只能写 §{tier}§ ⇒ zh 渲染成「🟢 Low-volume tier —— …」 | 档位**按分支写死成字面量**（四档各有自己的 code）⇒ 删掉 §{tier}§ 参数 ⇒ locale 才能给中文档位名 |
| 3 | ai-image 的**订阅 / API 对比表表头** | §calc_out.label.volume§ 的 zh =「用量」只有 **2 个 CJK** ⇒ 未过 G4c 的「CJK ≤ 2」判据 | zh 改「**月用量**」（3 个 CJK）⇒ 判据通过 |
| 4 | gemini / deepseek 的 **usage-scenario 每模型行** | 同 #1（裸文本）⇒ 但英文词只有 2 个 ⇒ **未触发 G4c**（型号是专有名词） | 为「同一 UI 行在不同引擎逐字一致」**一并令牌化**（否则 claude 中文 / gemini 英文）⇒ 新 code §calc_out.{gemini,deepseek}_api_cost.row.usage_scenario_line§（params = icon / model / v50~v10k） |

⇒ 落库走**既有可复算工具** §tests/scripts/p168-locale-repair.ts§（§TEMPLATE_FIXES§ 改值 12 条 + §NEW_KEYS§ 新增 3 条）⇒ **不手改 locale JSON**。

⚠️ ⇒ **G4c 是启发式判据**（CJK ≤ 2 且英文词 ≥ 3）⇒ 第 4 类那「英文词只有 2 个」的裸英文行**不会**被它抓到 ⇒ **守卫绿 ≠ 用户所见全中文** ⇒ 仍需逐页目视 / 浏览器层复验。

### 8.8 G6 抓到：客户端 customFn 的**收尾引号多转义一层** ⇒ 整个动态卡片抛 SyntaxError

修 §8.7§ 的 #1 时 G6 报红：§solopreneur-claude-api-cost-calculator：服务端 88 行 / 8019 字符 vs 客户端 0 行 / 0 字符；客户端抛错 missing ) after argument list§。

⇒ 根因：§clientConfig.customFn§ 是**一段 TS 字符串字面量**，里面再嵌**客户端 JS 的单引号串** ⇒ 转义有**两层**：§\\u00b7§ 表示客户端里的 §\u00b7§；而 §\\§§ 表示客户端里的撇号转义（英文撇号的正确编码）。⚠️ 本次**把 §pts.join(§ … §)§ 的收尾引号也按撇号习惯转义了** ⇒ 客户端 JS 里字符串提前闭合 ⇒ **整个 customFn 语法错误** ⇒ 该页**动态卡片全空**（静态卡片正常 ⇒ 用户「一点计算就空白」）。

⇒ 修法：去掉多余的转义 ⇒ G6 绿。
⇒ ⭐ **同族排查**：全仓扫「反斜杠 反斜杠 单引号」共 **41 处** ⇒ 逐处确认**全是英文撇号的正确编码** ⇒ **无第二处同族缺陷**。
⇒ ⭐⭐ **判据**：「静态卡片正常」不代表「动态卡片正常」⇒ 客户端 customFn 的**可解析性**必须被一条守卫单独守住（G6 覆盖 **45** 个已令牌化引擎，**其余 55** 个引擎尚无此守卫 ⇒ 已列入「维度 3 scan」的主动提议）。

### 8.9 令牌化的两个「连带副作用面」（都不是输出本身的问题）

令牌化 = **重写整个引擎文件** ⇒ 风险面不止「输出」：

| # | 症状 | 根因 | 修法 |
| --- | --- | --- | --- |
| 1 | §dead-i18n-keys§ 守卫报红：§claude§ 页缺「📊 使用场景」、§market-size§ 缺「现实校验」、§revenue-projector§ 缺「月度 MRR 明细」、§email-list-revenue§ 缺「列表经济:」 | 令牌化时给 section 标题**自己另写了一套中文**（「📊 用量情景」/「🎯 现实检验」/「📅 月度 MRR 拆解」/「📐 列表经济性:」）⇒ 把仓库**既有的 legacy 译法**顶掉了 ⇒ P105 / P117 / P118 的「working i18n key 必须仍在目标页出现」契约破掉 | **对齐既有措辞**（保留 emoji 前缀），**不改守卫** —— 守卫守的就是那个既有译法 |
| 2 | §engine-en-faq§ 守卫报红：§content-marketing-roi§ 的 FAQ[10].a 在页面里找不到 | 令牌化**重写整个引擎文件** ⇒ 答案里的「**Email/**」被误删（§Email/chat copy§ → §Chat copy§）⇒ 页面与 locale 分叉 ⇒ 而 **G9 覆盖不到**（G9 只比 §staticExamples§ = 输出；FAQ / description / how_to_use 不在里面） | 还原文案；⭐ **「locale ≡ 页面」的守卫必须覆盖非输出类字段** —— 本批正是它抓住了这次误删 |
### 8.10 令牌化改写代码形态 ⇒ 两处既有守卫的「形态假设」失配（一个吵闹、一个静默）

令牌化把服务端 prose 从单行 `out.push('…')` 改写成多行 `out.push(makeToken(code, '…', {…}))` ⇒ **两处既有守卫都按「代码形态」找东西**，失配方式完全不同：

| # | 守卫 | 失配方式 | 症状 | 修法（不变量不变） |
| --- | --- | --- | --- | --- |
| 1 | `tests/engine-prose-live-price-guard.test.ts`（E1） | **吵闹**（会红） | E1 要求「锚点句与 `out.push(` **同行**」⇒ 令牌化后锚点行不再同行 ⇒ 报「the server-side prose line is not an out.push(...) call」。⚠️ 不变量本身仍成立（E2/E3/E4 全绿）⇒ 这是**判据取样方式**过期，不是缺陷 | 判据改为「定位**包住锚点的那条 `out.push` 语句**」（从锚点行往上找 `out.push(`、往下找到语句收尾），并把搜索范围限定在服务端 `calculate()` 区间内（`clientConfig` 之后是客户端 customFn 的平行实现） |
| 2 | `tests/price-render-defect-guard.test.ts`（D1/D2/D2b/D3/D3c） | ⭐⭐⭐ **静默**（失明） | 扫描面是「**含 `out.push` 的那一行**」⇒ 令牌化把价格串挪到 `makeToken(` 的**续行**后 ⇒ 续行里的写死价**逃过判据** ⇒ 守卫照样绿、只是**不再查** | 扫描面扩到「**整条 push 语句覆盖到的每一行**」（括号配平 + 字符串/转义感知地定位语句结尾；字符串字面量里的括号不参与配平，因为客户端 customFn 是一大段字符串），并显式排除注释行。**逐行判据本身不变** |

⇒ **两条都不放宽不变量**：E1 仍要求「价必须是派生量 + 不得写死 `$价`」；价格守卫仍要求「输出里不得有写死价 / 写死倍数 / 写死折扣带」。

⇒ **变异台子**（入库：`tests/scripts/p168-guard-shape-mutation.ts`）双向证明「改完还咬得住」：

- **G1**：给训练引擎**多行 push 的续行**加 `'$' + fmt(...)` ⇒ 价格守卫 **D1 精确红 1 条**（报 `ai-training-cost-estimator.ts:170`）；⚠️ **旧的逐行扫在同一行 `pushLine=0` ⇒ 完全看不见** ⇒ 盲区被量化。
- **G2**：把 gemini prose 的派生价改成写死 `'$0.50'` ⇒ prose 守卫 **E1 精确红 1 条**（报出的正是包住锚点的那条 `out.push(makeToken(...))` 语句）⇒ 证明新的语句定位不是真空。
- 两次变异**还原后 sha256 逐字节一致**。

⇒ ⭐⭐ **判据：改代码形态时，必须一起问「哪些守卫在按代码形态找东西？」—— 失配分两种：会红的（吵闹但安全）与**会静默失明的**（安静但危险）。**

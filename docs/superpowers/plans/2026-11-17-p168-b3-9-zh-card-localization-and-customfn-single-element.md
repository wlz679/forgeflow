# P168 批次 3 · B3-9 —— zh 结果卡片本地化第二批（top15 剩余引擎）+ customFn 单元素数组契约（实施计划）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ① 修掉 6 个 AI cost 引擎「动态结果卡片被截断」的用户可见缺陷；② 把 zh 结果卡片本地化铺到 GSC 展示量 top15 剩余引擎（+501 展示）；③ 把「customFn 必须返回单元素数组」变成**可守的不变量**（G15 + 57 引擎欠账台账）。

**Architecture:** **完全复用 B3-8 已上线的机制**（`makeToken` / `CALC_OUTPUT_MAKE_TOKEN_JS` / `calc_out.*` 三族命名 / 文本插入式 locale 落库 / 单一真相源 `p168-tokenized-engines.mjs` / G9 按引擎分组基线）。本批**不新增任何核心模块**，只新增：① 一条守卫 G15（含 57 条欠账台账）；② 一个体检工具（customFn 返回形态）；③ 15 个引擎的令牌化 + 6 个引擎的返回形态修复。

**Tech Stack:** TypeScript · Node 20 · tsx（`node node_modules/tsx/dist/cli.mjs`）· node:test · Astro 5 · pnpm

## Global Constraints

- **宪法（AGENTS.md）**：本批已获 user 拍板改 `src/engines/**`（calc 层）——范围**严格限定**为「6 个 AI cost 引擎的 customFn 返回形态」+「15 个引擎的输出令牌化」；**不改任何计算逻辑 / 阈值 / 输入定义**；不改 Roadmap / Phase。
- **不擅自扩范围**：其余 **57** 个欠账引擎**不改**（用 G15 台账钉住）⇒ 扩范围需 user 再次拍板（见 spec §7 提议）。
- **判据落在不变量上**：代理指标 ≠ 真效果。
- **一个不变量只守一处**：G15 落在**新文件**（P164 守的是「非空字符串数组」，G15 守的是「长度 = 1」，两条不同不变量）。
- **产物层 ≠ 源码层**：源码层变异**不重建产物** ⇒ 源码层变异只跑 source-only 断言。
- **验收数字必须入库为可复算工具**（`tests/scripts/`，文件名**不能**带 `.test.ts`）。
- **用户规则**：完成改动后**先询问是否 commit/push**（带选项问卷 + 推荐项）；push 前 `git fetch` + 确认 **0 behind**；**禁止 force-push**。
- **编码**：文件无 BOM、全 LF；commit 信息用 `git commit -F <utf8file>`。
- **commit 信息**：`type(scope): 中文标题` + 正文含**实测数字** + **维度 3 scan 声明**；**绝不能**含 `[CI Skip]` / `[Skip CI]` / `[CF-Pages-Skip]`。
- **并行纪律**：worker **只改自己那几个引擎文件**；**并行阶段 subagent 不做任何 git 操作**；**并行阶段不跑 `codegen-examples.mjs`**（它会同时重写全部 100 个引擎）。
- **emoji 不得手打**：zh 值的 emoji **从 en 值原样复制**。
- **`bing-block-urls.csv` 保持未跟踪**，不得提交。

---

## Task 0 · 立项（本计划 + spec + 两个 INDEX 登记）

- [ ] spec：`docs/superpowers/specs/2026-11-17-p168-b3-9-...-design.md`
- [ ] plan：本文档
- [ ] `docs/superpowers/specs/INDEX.md` §9 加一行 + 计数 3→4、目录 86→87 + 「最后更新」
- [ ] `docs/superpowers/plans/INDEX.md` §9 加一行 + 计数 47→48、目录 118→119 + 「最后更新」
- [ ] 单独 commit（文档先行，engine 改动另批）

## Task 1 · 6 个 AI cost 引擎：customFn 返回形态修复

**判据**：页面 `src/pages/[lang]/[slug].astro:2186` 只渲染 `results[0]` ⇒ customFn 必须返回**单元素数组**。

- [ ] 6 个文件：`claude-api-cost-calculator.ts` / `gemini-api-cost-calculator.ts` / `deepseek-api-cost-calculator.ts` / `ai-image-generation-cost-calculator.ts` / `ai-training-cost-estimator.ts` / `gpu-cloud-cost-calculator.ts`
- [ ] 改法：`"return o;";` → `"return [o.join('\\n')];";`（与 B3-8 的 `ai-api-cost-comparison` 一致）
- [ ] ⛔ **不改** `fmt()` 之类的其它函数；⛔ 不改 `o.push(...)` 的任何一行

## Task 2 · G15 守卫 + 体检工具 + 变异台子

- [ ] `tests/scripts/p168-customfn-shape-audit.ts`（可复算体检：逐引擎的元素数 / 丢失字符 / 是否命中 analysis 分支）
- [ ] `tests/customfn-single-element-guard.test.ts`（G15/G15b/G15c，DEBT 台账 57 条）
- [ ] `tests/scripts/p168-customfn-shape-mutation.ts`（变异台子：M1 把一个合规引擎改回多元素 ⇒ G15 精确红 1 条；M2 从台账删一条仍在欠账的引擎 ⇒ G15b 红）⇒ **还原 sha256 逐字节一致**

## Task 3 · 15 个引擎令牌化（并行 worker，各改各文件）

- [ ] 4 个并行 worker × 3 引擎 + 1 个补位（并发上限 4）
- [ ] 施工配方**逐字复用** B3-8 plan §0.3
- [ ] 每个引擎跑 `tests/scripts/p168-token-selfcheck.ts <alias>` ⇒ 必须 `OK`
- [ ] 单一真相源 `tests/scripts/p168-tokenized-engines.mjs` 加 `B3_9_BATCH`（15 条，baseline `5c1bd52`）

## Task 4 · locale 提取 + en/zh 落库 + zh 翻译

- [ ] `tests/scripts/p168-locale-extract.ts` → 新键清单（先 `--dry`）
- [ ] `tests/scripts/p168-locale-branch-probe.ts`（fuzz + round-trip + 众数消歧）
- [ ] `tests/scripts/p168-locale-merge.ts` 落库（en = 源码原文；zh = 翻译）
- [ ] ⚠️ **zh 值里的 emoji 从 en 值原样复制**；⛔ 不手打 emoji
- [ ] ⚠️ 新键 `calc_out.section.*` 的 zh 值必须与**跨引擎共享的 legacy 键逐字一致**（措辞取 legacy / emoji 取源 / 冒号存在性须一致参与匹配 / 冲突即跳过）
- [ ] zh 翻译分 2~3 个 worker（每个只写自己那批键，输出 JSON 片段给控制器合并）

## Task 5 · 守卫范围扩展

- [ ] G13（zh 页 0 整行英文）范围扩到 40 引擎
- [ ] G9 基线按引擎分组（B3-9 批次 = `5c1bd52`）
- [ ] G6 / G12 / G12b / G4d 的引擎清单同步扩到 40

## Task 6 · codegen + 类型检查 + 构建

- [ ] `node scripts/codegen-examples.mjs` ⇒ 100 引擎更新成功
- [ ] `node node_modules/typescript/bin/tsc --noEmit` ⇒ exit 0
- [ ] `pnpm build` ⇒ exit 0（438 页，injected=438 skipped=0 failed=0）

## Task 7 · 浏览器目视验收（**用户所见**层）

- [ ] 本地 `dist` + `python -m http.server` + **iframe 批量加载**（iframe 里脚本真执行 ⇒ 测的是用户所见）
- [ ] 15 个 zh 页：静态卡片 + 动态卡片 **0 整行英文**
- [ ] 6 个 AI cost 页：动态卡片**内容完整**（行数与探针一致，无截断）

## Task 8 · 全量套件

- [ ] `$env:RUN_BUILD_TESTS='1'; $env:SKIP_INDEXNOW='1'; node tests/run.mjs` ⇒ 0 fail
- [ ] 套件计数写进 AGENTS.md（walkTestSuites 实测值）

## Task 9 · 文档

- [ ] AGENTS.md：B3-9 note（本批教训）+ 标题行 + 套件计数 + 验收数字
- [ ] CHANGELOG.md：「最后更新」改 B3-9（原 B3-8 降为「上次更新」）
- [ ] spec / plan 补 §11 实施期补记

## Task 10 · commit + push + 线上复验

- [ ] commit A（engine + 守卫 + 工具 + locale + AGENTS 计数）与 commit B（CHANGELOG + spec/plan）
- [ ] **先问 user**（带选项问卷 + 推荐项）
- [ ] `git fetch` + 确认 0 behind ⇒ push GitHub + Gitee（**禁 force**）
- [ ] CI 结论用 Actions badge SVG 查（不占 API 配额）；线上复验**必须加随机 cache-buster**

---

## 验收数字（实施期回填）

- **customFn 单元素引擎数：46/100**（多元素欠账 **54** · G15 台账 **54** 条 · 与实测一一对应）
  ⚠️ 立项时的估计「37 → 43 / 欠账 63 → 57」**已被实测推翻** —— 令牌化过程顺带把 3 个引擎的 customFn 也改成了单元素 ⇒ 台账按**实测**建（54 条）⇒ 计划里的数字只作历史记录。
- **令牌化引擎数：45**（自检 **45/45 ALL OK** · 服务端↔客户端 code 集合逐个一致 · 英文零变化 = 是）
- **locale `calc_out.*` 键：1,949**（en 7,680 / zh 7,680 · **键序逐字一致** · 互缺 0）
- **token 逐条校验（新增工具 `p168-locale-token-parity.ts`）：12,561 次 token 出现 / 1,400 个 code ⇒ 违规 0**
- **模板往返体检（`p168-locale-roundtrip.ts`）：1,400 个 code ⇒ 与兜底渲染不一致 0**
- **本批修掉的真缺陷：12 处模板/引擎 + 5 处 locale 缺键**（详见下表）
- **守卫组：50/50 绿**（G1 / G1b / G2 / G2b / G2c / G3 / G7 / G11 / G12 / G12b / G15 / G15b / G15c / G16 a~d / G17 + G17 自检 + G4 / G4b / G4c / G4d / G6 / G6 自检 / G9 + dead-i18n-keys + engine-en-faq）
- **构建：438 页**（`injected=438 skipped=0 failed=0`）· **浏览器层（用户所见）22 页 / 问题 0**
- **变异台子：4/4 KILLED**（2 个台子：G15 契约 2 条 + **守卫形态 2 条**「守卫按代码形态找东西」）—— 每条精确红 1 条 + 还原 sha256 逐字节一致
- **全量套件：298 套件**（B3-8 = 294 ⇒ 本批新增 4 个：G15 / G16 / G17 / G1 自然语言探针）· **10 批全部 `# fail 0`**（exit 0）
- **线上复验（生产侧 · 随机 cache-buster）：45 个 zh 页 / 卡片 1,793 行 · 与本地 build 逐行一致 · 整行英文 0 / 裸 token 0 / `$$` 0**（工具 `tests/scripts/p168-online-verify.ts` 已入库）

### 实施期实测修正表（计划 → 实测）

| # | 计划时的判断 | 实测 | 处置 |
| --- | --- | --- | --- |
| 1 | locale `calc_out.*` 段「连续且内部按字典序」⇒ 新键直接插入该段 | **段被撕成两段**：本轮 `p168-locale-repair.ts` 用 `JSON.stringify(obj)` 整对象写盘 + 直接赋值 ⇒ 新键被**追加到文件末尾** ⇒ `en/zh` 各 9 个 calc_out 键落在尾部 | 抽出**共享实现** `tests/scripts/p168-locale-order.ts`（`normalizeCalcOut` + `insertCalcOut`）⇒ 两个落库工具共用一套规则 ⇒ 落库前先归一化，**calc_out.* 恒为连续一段** |
| 2 | 模板正确性用「源码推导」判 | 源码推导**有三条盲区**：① `replaceWordValue` 的「不得拆数字」规则**算出来了却没接上**（`numericLike` / `isDigitish` 声明后未使用）⇒ 数值后跟单位后缀时换不掉；② `sourceTemplates` 与 `sourceTemplatesWithOrigin` 用了**两套不同的选择规则** ⇒ 同一 code 在两个工具里给出不同模板；③ 漂移判据拿**运行时烘焙值**当基线 ⇒ 42 条里绝大多数是假阳性 | 三处全修 ⇒ 漂移基线改为**推导模板**；`sourceTemplates` 统一走 `sourceTemplatesWithOrigin` |
| 3 | 「模板冻结」靠往返体检（多组输入）抓 | 往返体检**有盲区**：靠「换输入重新走到该分支」暴露冻结值 ⇒ 分支没被走到的 code 漏过（实测 claude `health_spread_ok` 冻结成 10.0x 却没被抓到） | 新增**逐 token 校验**工具 `p168-locale-token-parity.ts`：① **占位符守恒**（模板的 {param} 集合必须覆盖 token params 里**出现在兜底文本中**的键）② **渲染等价**（用 token 自带 params 渲染模板 == 兜底文本）⇒ **不依赖分支是否被重新走到** |
| 4 | 6 个 AI cost 引擎只改 customFn 返回形态 | 其中 **3 个引擎的 token 缺参数** ⇒ 模板化不了：gpu 的 spot/reserved 百分比**不在 params 里**；deepseek/gemini 的 `output_cost` 把 `pad()` 的对齐空格**烘焙在模板里**（token 宽度一变就错位） | 引擎改：gpu 补 `spot`/`reserved` 两个参数；deepseek/gemini 把 `pad(lc(outTokens),7)` **移进 param** ⇒ 模板与兜底逐字一致且**英文页零变化**（默认输入下渲染结果不变） |
| 5 | 令牌化只改引擎输出 | 令牌化把 `family_*`（族标签）与 `health_storage_high`（存储占比告警）暴露成 **5 个 locale 缺键**（默认输入走不到 ⇒ 提取器看不见 ⇒ 既有守卫 `calc-output-i18n-guard` 报红） | 补 5 个键（en 逐字等于兜底 + zh 译文）⇒ 守卫转绿 |
| 6 | 收尾阶段「zh 页 0 整行英文」交给守卫 G4c 兜住即可 | 实测暴露 **4 类** zh 卡片整行英文，**成因各不相同**：① claude 的 usage-scenario **每模型行整行是裸文本**（静态卡片 3 行）；② gemini/deepseek 的**档位行**把英文档位名装进 `{tier}` 运行时参数 ⇒ zh 渲染成「🟢 Low-volume tier —— …」；③ ai-image 的**对比表表头** `calc_out.label.volume` 的 zh =「用量」只有 **2 个 CJK** ⇒ 未过 G4c 的「CJK ≤ 2 且英文词 ≥ 3」判据；④ gemini/deepseek 的 usage 每模型行也是裸文本，但英文词只有 2 个 ⇒ **未触发 G4c** | ① claude **整行令牌化**（新 code `usage_scenario_line`，params = icon/model/family/v50~v10k，服务端 + 客户端两侧）；② 档位**按分支写死成字面量**（四档各有自己的 code）⇒ 删掉 `{tier}` 参数 ⇒ locale 才能给中文档位名；③ zh 改「**月用量**」（3 个 CJK）；④ 为「同一 UI 行在不同引擎逐字一致」**一并令牌化**（否则 claude 中文 / gemini 英文）⇒ 落库走既有可复算工具 `p168-locale-repair.ts`（12 条修正 + 3 个新键）⇒ **不手改 locale JSON** |
| 7 | 客户端 customFn 只改「返回形态」，不涉语法 | G6 抓到 **claude 客户端 `usage_scenario_line` 的收尾引号被多转义了一个反斜杠** ⇒ 生成的客户端 JS 里字符串提前闭合 ⇒ **整个 customFn 抛 SyntaxError**（missing ) after argument list）⇒ 该页**动态卡片全空**（静态卡片正常 ⇒ 用户「一点计算就空白」） | 去掉多余转义 ⇒ G6 绿；并全仓扫「反斜杠 反斜杠 单引号」**41 处** ⇒ 逐处确认**全是英文撇号的正确编码**（英文撇号编码）⇒ **无第二处同族缺陷** |
| 8 | 令牌化的 zh 措辞「自己另写一套」就行 | 收尾阶段 `dead-i18n-keys` 守卫报红 ⇒ 令牌化时**另写了一套 zh 措辞**，把仓库**既有的 legacy 措辞**顶掉了（**4 处**：📊 使用场景 / 🎯 现实校验 / 📅 月度 MRR 明细 / 📐 列表经济:）⇒ P105 / P117 / P118 的「working i18n key 必须仍在目标页出现」契约被破掉 | **对齐既有措辞**（保留 emoji 前缀）⇒ 4 处 locale zh 修正 ⇒ 守卫转绿。⭐ **改措辞前先看仓库里同一行有没有既有译法** —— 守卫守的就是那个译法 |
| 9 | 令牌化只改「输出」 | 令牌化 = **重写整个引擎文件** ⇒ 实测**误删了 FAQ 文案**（答案里的「Email/」被删 ⇒ 页面与 locale 分叉 ⇒ FAQ 守卫红）⇒ **G9 覆盖不到**（G9 只比 `staticExamples` = 输出；FAQ / description / how_to_use 不在里面） | 还原文案；⭐ **「locale ≡ 页面」的守卫必须覆盖非输出类字段** —— 本批正是它抓住了这次误删 |

| 10 | 令牌化只改引擎输出，不影响既有守卫 | 令牌化把服务端 prose 改写成**多行** `out.push(makeToken(code, '…', {…}))` ⇒ **两处既有守卫都在按代码形态找东西**：① `engine-prose-live-price-guard` 的 E1 要求「锚点句与 `out.push(` **同行**」⇒ **红**（不变量本身仍成立，E2/E3/E4 全绿）；② ⭐⭐⭐ `price-render-defect-guard` 的扫描面是「**含 `out.push` 的那一行**」⇒ **续行里的写死价会逃过判据 ⇒ 守卫静默变真空绿**（不报错、只是「不再查」） | 两处都改**判据的取样方式**（不放宽不变量）：① E1 改为「定位**包住锚点的那条 `out.push` 语句**」并限定在服务端 `calculate()` 区间内；② 价格守卫扫描面扩到「**整条 push 语句覆盖到的每一行**」（逐行判据不变）+ 显式排除注释行。⇒ 新增**专用变异台子** `tests/scripts/p168-guard-shape-mutation.ts` 双向证明：① 训练引擎多行 push 的**续行**加 `'$' + fmt(...)` ⇒ 价格守卫 **D1 精确红 1 条**（旧逐行扫 `pushLine=0` ⇒ 看不见）；② gemini prose 派生价改成写死 `'$0.50'` ⇒ E1 **精确红 1 条** ⇒ 还原 sha256 逐字节一致 |
| 11 | 验收只看本地全量套件 298/0 即可 | 推双远端后 **CI 报红**（`Unit tests` 步骤；漂移检查 / 引擎覆盖 / 类型检查全绿）⇒ 根因：`claude-md-invariant-guard` 的「CHANGELOG 头部 **Total commits** 必须与 `git rev-list --count HEAD` 对齐（容忍漂移 ≤ 5）」—— 本地跑套件时 HEAD 还是 `5c1bd52`（**1,417**）⇒ 漂移 **5** ⇒ **恰好落在容忍带内** ⇒ 全绿；提交后 HEAD 变 **1,418 / 1,419** ⇒ 漂移 **6 / 7** ⇒ CI 红。⚠️ 该守卫带 skip-guard ⇒ **本地单跑它是真空绿**（文件级 ✔、0 个子测试） | ① 头部计数更新到**修复 commit 之后的真实值**（**1,412 → 1,420**）+ 日期同步；② 带 `RUN_BUILD_TESTS=1` 重跑该守卫 + **提交后重跑全量套件**；③ 判据入库：**任何以 HEAD 为基线的不变量都必须在提交之后验收** |
## 维度 3 scan

基于信号：① GSC 实时展示量排名（zh 页 top15 剩余 = 501 展示）；② 页面渲染契约复核（`results[0]`）；③ P164 守卫判据欠规格；④ **实施期实测新增信号**：locale 模板的「数值冻结」在**英文页**同样可见（roas 显示 `at 0% margin` / cohort 显示 `−0.0pp` / ltv_by_channel 显示 `0.00x` / revenue_projector 四季度全显示 `Q1`）⇒ **这不是中文页的问题，是英文页的缺陷**；⑤ **实施期收尾阶段新增信号**：产物层守卫 G4c 报出 **4 类** zh 卡片整行英文（三种不同成因）+ G6 报出**客户端 customFn 语法错误**（动态卡片全空）⇒ 两者都不是「中文没翻」，而是**引擎输出形态与 locale 模板形态**的问题。

本批内的主动提议（**未擅自实施，待 user 拍板**）：

- **spec §7**：下一批（B3-10）修完剩余 **54** 个欠账引擎（实测台账口径，比计划时的 57 更准）；
- **本批新发现**：① `input_cost`（deepseek/gemini/claude/openai-token）的 `pad()` 对齐空格**同样烘焙在模板里**（本批只修了被实测抓到的 `output_cost`）⇒ 建议 B3-10 一并处理；② 剩余 **60** 个引擎（top30 之后）尚未令牌化（预计再 4~5 批）；③ 其余 **44** 个漂移引擎待 G6 逐例 diff 裁定。
- **本批新发现**：④ **客户端 customFn 的转义层级是独立的缺陷面**（TS 字符串里再嵌客户端 JS ⇒ 收尾引号多转义一层就会让**整个 customFn 抛 SyntaxError** ⇒ 该页动态卡片全空）⇒ 建议 B3-10 把「customFn 可被 `new Function` 解析」列为**每个引擎的准入条件**（G6 目前只覆盖 **45** 个已令牌化引擎，**其余 55** 个无此守卫）；⑤ **G4c 是启发式判据**（CJK ≤ 2 且英文词 ≥ 3）⇒ 「英文词只有 2 个」的裸英文行**不会被它抓到** ⇒ 建议 B3-10 令牌化时**逐行核对「同一 UI 行在不同引擎逐字一致」**，别只依赖守卫；⑥ **令牌化是「重写整个引擎文件」而不是「改几行输出」** ⇒ 风险面包括**非输出类字段**（FAQ / description / how_to_use / 示例文案）⇒ 建议 B3-10 令牌化前先存一份**引擎文件 hash 快照**、令牌化后**逐字段 diff**（当前只有「locale ≡ 页面」的守卫能兜住内容丢失）。

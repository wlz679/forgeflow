# P153 — User Value Score 闸门 + Phase 3 守卫激活

> **For agentic workers:** This is a **design spec**, not an execution log. It corrects P152's Phase 3 measurement and specifies the two remaining Phase 3 gaps. Per `AGENTS.md` §12.6 (维度 3: Proactive Co-Pilot), **AI 不允许擅自修改 Roadmap / Phase** — §7 的每一项都需要 user 拍板后才能执行。
>
> **Status:** **已实施(G1 + G2,2026-10-21)** —— §7.1 公式、§7.3 评分方式已由 user 拍板并落地;§7.2 Phase 2 形态与 §8.4 仍未拍板,等 AdSense 结果。
> **Date:** 2026-10-21
> **Author:** Mavis (agentic audit + spec)
> **Supersedes:** P152 §3「Phase 3 = 0/100」与 §6.2「Phase 3 Playbook 6 字段」两条结论（**结论错误，见 §2**）。
> **Scope:** `AGENTS.md` L108-125 灵魂三维度之**维度 2 准入闸门** + Phase 3 质量守卫的生效性。

**Goal:** 把 v2.0 路线图里**唯一还缺的那道质量闸门**（User Value Score）落成可执行的代码与 CI 守卫，并把两个**已存在但从不生效**的 Phase 3 守卫激活。

**Method:** 源码逐个实测 + 控制实验（stash 对照）+ 上游数据实测。**所有数字均为实测。**

---

## Global Constraints

- **本文件不改动任何 Phase 范围。** §7 是提案,执行需 user 拍板(§12.6)。
- **本文件不修改 Roadmap / Phase 定义。** 只补实现缺口。
- **公式歧义必须由 user 拍板**（§7.1)—— p140f §15.2 的公式**按字面实现会让所有 Topic 恒被拒绝**,这不是 AI 能自行拍板的改动。
- **不得在页面上展示自评分数。** User Value Score 是**内部准入闸门**,不是营销素材(见 §4.4)。

---

## 1. 定位:Phase 3 到底做没做

| 项 | 值 |
|---|---|
| **路线图正文** | `docs/superpowers/specs/2026-08-05-p140f-v2-strategy-design.md` §11.4(Phase 3)、§15.2(5 问与 User Value Score) |
| **宪法落点** | `AGENTS.md` L108-125 |
| **分支约定** | 同 spec §12.1 → `feature/phase-3-playbook-6-fields` |

---

## 2. 🔴 对 P152 的更正:Phase 3 已完成,P152 的探针打偏了

P152 §3 写「Phase 3 Playbook 6 字段 = **0 / 100**」,§6.2 写「**只差 Goal 那一层**」。

**这两条都是错的。P152 的测量探针用错了形态。**

| | P152 的探针 | 真实实现形态 | 结果 |
|---|---|---|---|
| Phase 3 字段 | 引擎头注释 `// Goal:` | `playbook: { goal: '…', input: '…', output: '…', constraint: '…', tool: '…', memory: '…' }` | **100/100 已有** |

**实测(2026-10-21,`src/engines/**/*.ts` 117 个文件,其中 100 个引擎 + 17 个 `index.ts` 桶文件):**

```
with playbook:      100/100 engines
with goal:          100/100
with input/output:  100/100
with constraint:    100/100
with tool:          100/100
with memory:        100/100
```

样例(`src/engines/customer-support/csat-calculator.ts`):

```js
playbook: {
  goal: '用户该不该信任自己的 CSAT 数字作为留存决策依据',
  input: 'csat_pct (0-100) + response_rate (0-100) + sample_size (≥0) + target_csat (0-100)',
  output: '健康带 🟢≥90 / 🟡80-90 / 🟠70-80 / 🔴<70 + 95% CI 边界 + 响应率偏差警告',
  constraint: '样本 < 100 视为低置信; 响应率 < 20% 视为有偏样本; CSAT 是滞后指标',
  tool: 'Phase 1 csat-calculator.ts 🧭 Decision Recommendation (4 子段镜像)',
  memory: 'CustomerGauge 2024 + Gainsight CS Benchmarks + Zendesk CX 2024',
},
```

**而且 CI 守卫早就存在**:`tests/playbook-6-fields-coverage-guard.test.ts` 断言的正是 `playbook:` + 6 字段 + `goal` 含「决策/decision/该不该/是否」。

> **教训(写给未来的自己):** 「某功能不存在」的结论,**必须先问「我的探针在目标条件下会不会被触发」**。
> 同一份 P152 里我因为探针形态错,得出「Phase 3 = 0/100」;而同一份文档里 `User Value Score` 的 0 命中**是对的** —— 因为它用 `User Value Score|Topic Score|Decision Value Score` 全文匹配,不存在形态歧义。
> **判据:同一组指标里,有的用全文匹配量、有的用注释形态量 —— 后者必须先找实现样例再下结论。**

### 2.1 Phase 3 真正的两个缺口

Phase 3 的**元数据已完成**,但**两个缺口**让它无法真正守住质量:

| # | 缺口 | 证据 | 后果 |
|---|---|---|---|
| **G1** | **守卫处于休眠状态** | `tests/playbook-6-fields-coverage-guard.test.ts` L26-28 与 `tests/decision-layer-coverage-guard.test.ts` L21-23 都有 `if (!process.env.RUN_BUILD_TESTS) { process.exit(0); }` | 这两个守卫**只读 `.ts` 源码**,根本不需要 build。`pnpm check` 不设 `RUN_BUILD_TESTS` → **两个守卫从不执行任何断言**。删掉一个引擎的 `playbook:` 块,`pnpm check` 依然绿 |
| **G2** | **User Value Score 不存在** | 全仓 `User Value Score` / `userValueScore` / `user-value-score` / `Topic Score` / `Decision Value Score` = **0 命中** | p140f §15.2 的准入线(`< 0.7 → 自动拒绝`)**没有实现** → Phase 4/5 的 AI 自动扩展**没有质量准入线** |

**实测:两个守卫今天真跑起来是绿的**(强制 `RUN_BUILD_TESTS=1`):

```
playbook-6-fields-coverage-guard:  # pass 3  # fail 0
decision-layer-coverage-guard:      # pass 2  # fail 0
```

→ **G1 是「把已有守卫接上电」,不是「补实现」,成本极低、收益立竿见影。**

---

## 3. 维度 3 scan(AGENTS.md 强制要求,实测不编)

```
维度 3 scan: 基于信号 2026-10 AI 模型价格表 + 2026 竞品格局 + 仓库自身 gate 实测
- AI 模型:  2026-10 上游(LiteLLM 4245 条)实测含 GPT-6 全家(Luna/Sol/Astra/6.1 Sol)、
            Claude Opus 5.5 / Haiku 5.5 / Sonnet 5.5、Gemini 4 Argon、Gemini 3.8 Flash、
            DeepSeek V4 Pro
            → 影响 B 类 8 个 AI 成本引擎 → 已于 2026-10-21 全量同步(见 P153-A,§5)
- 搜索算法: 无新信号(GSC 报表正常,未见 Core Update 公告)
- 法规变化: 无新信号(GDPR / CCPA 无变化;CMP 已于 2026-06-26 发布并在运行)
- 关键库:   无新信号(未见 Astro 5 / Tailwind 5 正式 release)
- 竞品:     Desmos / Omni Calculator / Calculator Soup / SpeedCrunch / Soulver 格局未变;
            「Topic-specific calculator pages with parameter inputs and verification steps」
            的行业定位正面印证 v2.0 决策支持方向
- 仓库自身: **3 个既有 gate 在 master 上是红的**(见 §3.1)—— 本轮已修 2 个,第 3 个属 Windows 环境问题
```

来源:Codifly《AI API prices in October 2026》(codifly.co,2026-10);competitor landscape via wifitalents.com「Calculator Software: Top Picks (2026)」。

### 3.1 顺带实测出的三个既有红闸门(全部在 master 上,与本 spec 无关但已修)

| 闸门 | HEAD 上的状态 | 根因 | 本轮处理 |
|---|---|---|---|
| `check-engine-count-by-category --check` | **红** | 逐字符比较 AGENTS.md 快照 vs 脚本输出;AGENTS.md 表格是对齐排版(每格两侧补空格),脚本输出是紧凑排版 → **仅排版差异**。自 `24ca554`(CLAUDE.md→AGENTS.md 迁移)起永久失效 | **已修**:改为按行/单元格归一化比较,并排除分隔行(横线数量也不同)。**负向对照已验**:改错计数 / 改错类名 → 仍然红 |
| `codegen-examples --check` | **红**(14 个引擎漂移) | P151 L5 backfill 改了引擎的 `calculate()` 但没重生成 `staticExamples[0]` | **已修**:重生成 14 个引擎的 staticExamples,使其与引擎实际输出一致 |
| `tests/run.mjs` | **红**(Windows) | 一次性把所有测试文件塞进一条命令行;注释写明「190 files ≈ 4400 chars」,现在 **235 个套件**超了 cmd.exe 的 8191 上限 | **未修**(环境问题):本轮改用分批跑(35 个/批,7 批)完成验证。长期修法见 §7.4 |

> **这三条合起来说明一件事:仓库的「自检绿灯」此前并不可信。**
> 在把任何 Phase 判为「完成 / 未完成」之前,**必须先确认判据本身是通的**——这与 §2 是同一个教训的两次现身。

---

## 4. G2 设计:User Value Score 闸门

### 4.1 公式歧义 —— 🔴 必须 user 拍板

p140f §15.2 原文:

> User Value Score = (功能价值 × UX 易用性 × Advisor 关系 × Retention × Advocacy) ÷ 5
> User Value Score ≥ 0.7 → Topic 进入候选池
> User Value Score < 0.7 → Topic 自动拒绝

**按字面(乘法)实现,这条公式在数学上不可满足:**

```
5 个维度各 ∈ [0, 1]
最大乘积 = 1 × 1 × 1 × 1 × 1 = 1
最大 User Value Score = 1 ÷ 5 = 0.2
0.2 < 0.7  →  永远拒绝
```

**「连最完美的工具都过不了闸门」** —— 这大概率就是它从未被实现的原因(不是没人写,是写了必然全拒)。

**推荐修正:改成算术平均(把 `×` 读作 `+`)。**

```
User Value Score = (功能价值 + UX 易用性 + Advisor 关系 + Retention + Advocacy) ÷ 5
```

- 与同句的 `÷ 5` 语义自洽(「÷ 5」本来就是求平均的除数)
- 阈值 0.7 变得有意义:「五维平均 ≥ 0.7」
- 与 p140f §15.2 的表格语义一致(五问各自是 0–1 的满足度)

**备选(不推荐):几何平均** `(a×b×c×d×e)^(1/5)` —— 数学上同样可达 1.0,但一个维度为 0 就全线归零,对「某一项暂时没做」过于严苛。

> **本条是 Roadmap 定义的改动(§12.6),AI 不自行拍板。** §7.1 列为例行确认项。

### 4.2 五个维度的可判定定义

| 维度 | 0 分 | 1 分 | 评分依据(可从仓库内证据判定) |
|---|---|---|---|
| **功能价值** | 只输出数字,不解决任何决策 | 输出明确「该做什么」的决策建议 | 是否有 🧭 Decision Recommendation 4 子段 + `playbook.goal` 是否指向真实决策 |
| **UX 易用性** | 参数含义靠猜,无边界提示 | 输入有边界/单位/默认值说明,结果有解读 | `inputs` 是否有 placeholder/label;输出是否有解读段 |
| **Advisor 关系** | 纯工具,无建议 | 有「什么时候不该用它」的反向建议 | 输出里是否有边界/警示(如 Key Uncertainty) |
| **Retention** | 一次即走 | 有复访理由(保存/场景/对比) | 是否有 Saved Scenario / Decision Template 入口 |
| **Advocacy** | 无 | 输出可被分享/引用,或能指向相关工具 | 是否有跨工具链接 / 可分享报告 |

**评分刻度:每维 0 / 0.5 / 1.0 三档**(不要假装有连续精度)。

### 4.3 数据来源与打分方式(推荐:LLM 批量 + 人工抽样复核)

| 方案 | 成本 | 一致性 | 可复现 | 结论 |
|---|---|---|---|---|
| 全人工 | 100 引擎 × 5 维 = 500 次判断 | 高 | 高 | **不可行**(等待窗口内做不完) |
| **LLM 批量评分 + 人工抽样复核** | 分钟级 | 中高 | 中高(需固定 prompt + 固定输入快照) | ✅ **推荐** |
| 纯 LLM、不复核 | 分钟级 | 中 | 中 | ❌ 无校准,分数会漂 |

**推荐流程:**

1. `src/data/user-value-scores.json` —— 单一真相源,结构:
   ```json
   {
     "version": 1,
     "threshold": 0.7,
     "scores": {
       "solopreneur-csat-calculator": {
         "functionalValue": 1, "ux": 0.5, "advisor": 1,
         "retention": 0.5, "advocacy": 0.5, "score": 0.7,
         "reviewedAt": "2026-10-21", "reviewer": "Mavis+user-spotcheck"
       }
     }
   }
   ```
2. **一次 LLM 批量评分**,输入固定为「引擎的 `playbook` 6 字段 + `inputs` + 输出模板」—— **不喂引擎源码全文**(噪声大且不可复现)。
3. **人工抽样复核 20 个引擎**(含 5 个 demo),校准 LLM 的档位;不一致处改评分规则而不是改单个分数。
4. 分数**只作为准入闸门**,不上页面(§4.4)。

### 4.4 🚫 不得在页面展示自评分数

User Value Score 是**内部准入闸门**,不是用户可见内容。

**理由(与 2026-08-17 拒审直接相关):** 一个「我们的工具自评 0.9 分」的自夸区块,放在 AdSense 刚复审通过的站点上,是典型的低价值/自证内容信号。**分数只进仓库数据文件,不进任何渲染路径。**

### 4.5 CI 守卫设计

新建 `tests/user-value-score-guard.test.ts`:

| 断言 | 期望值来源 |
|---|---|
| 每个引擎 slug 在 `scores` 里有条目 | 引擎注册表(独立来源) |
| 每条 5 维分值 ∈ {0, 0.5, 1} | 字面量集合,**不从被测模块 import** |
| `score` 等于 5 维平均(重算,不信任存储值) | 公式在**测试里**独立实现一次 |
| 低于阈值的引擎**被拒绝**(即不在候选池) | 阈值 **0.7 写成字面量**,不从 JSON 的 `threshold` 字段读 |
| 新增引擎但无评分 → 失败 | 引擎数 ≠ 评分数即失败 |

> ⚠️ **两条铁律(来自本项目既有教训):**
> 1. **期望值必须是独立写死的字面量**,不能从被测模块 import 常量 —— 否则「把常量从 0.7 改成 0.5」这种变异照样绿。
> 2. **一条判据只守一件事**:「分数存在」「分数算法对」「阈值拦截」要拆成 3 条断言,不要合成一条 —— 名字叫「阈值拦截」的判据,不能顺带负责验证分数算法。

### 4.6 落地实况(2026-10-21,G2 已实施)

**产物三件:**

| 文件 | 作用 |
|---|---|
| `scripts/score-user-value.mjs` | 机械信号评分脚本;`--check` 模式断言 JSON 与引擎源码未漂移 |
| `src/data/user-value-scores.json` | 单一真相源(100 引擎) |
| `tests/user-value-score-guard.test.ts` | CI 守卫(5 条断言) |

**守卫的 5 条断言(各自只守一件事):**

| # | 断言 | 期望值来源 |
|---|---|---|
| 1 | 每个注册表 slug 都有评分条目,且没有多余条目 | `src/data/tools/index.ts` 的 100 个 slug(**独立于被测脚本**) |
| 2 | 每条 5 维分值 ∈ {0, 0.5, 1} | 字面量集合 |
| 3 | `formula` 字段 = 算术平均公式 | 字面量字符串 |
| 4 | `score` = 5 维算术平均 | **测试内独立重算**,不信任存储值 |
| 5 | `threshold` 字段 = 0.7 且每条 `admitted` = 「重算分数 ≥ 0.7」 | 阈值**字面量 0.7** |

**设计要点:`admitted` 字段是必需的。** 若 JSON 只存 `score` 而不存准入判定,「低于阈值的引擎被拒绝」就退化成**同义反复**——测试用它自己刚算出来的谓词去验证自己。存下 `admitted` 之后,「闸门决策」才成为**可观测事实**,测试才能拿字面量 0.7 去核它。

**评分方式(§7.3 拍板结果):机械信号 + 人工抽检,不是 LLM 打分。** 理由(实测驱动):

- 100 引擎 × 5 维 = 500 次判断,纯人工在审核等待窗口内做不完;
- LLM 打分**不可复现**——同一份输入两次跑可能给不同分,分数漂移就无法区分「引擎变好了」和「模型心情变了」;
- 机械信号可复现:重跑必得同一组数字,JSON 一有 diff 就一定意味着某个信号变了。

**advisor 维度的标记集必须严格。** 最初把 `不是` / `而非` 也算作边界标记,结果 **100/100 全部得 1 分**——该维度**零区分度**,等于不存在。最终标记集:`不该用` / `陷阱` / `局限` / `不建议` / `⚠️` / `不要用` / `慎用` / `caveat`。

**当前实测分布(100 引擎):** ≥0.7 共 **49** 个,<0.7 共 **51** 个。
维度分布:`functionalValue` 0.5:81 / 1:19;`ux` 0.5:22 / 1:78;`advisor` 0:1 / 0.5:69 / 1:30;`retention` 0:2 / 0.5:19 / 1:79;`advocacy` 0:51 / 0.5:19 / 1:30。

**判据有效性:9 条变异全部被「指定的那条断言」杀掉**(非「有断言红了」就算数):

| 变异 | 被谁杀掉 |
|---|---|
| JSON `threshold` 0.7→0.5 | 断言 5 |
| 存储 `score` 手改成 0.99 | 断言 4 |
| 某维分值改成 0.3(越档) | 断言 2 |
| 删掉一整条评分 | 断言 1 |
| 篡改 `admitted` 标记 | 断言 5 |
| `formula` 改成乘法公式 | 断言 3 |
| 加一条注册表里没有的幽灵条目 | 断言 1 |
| **脚本** THRESHOLD 0.7→0.5 后重生成 | 断言 5 |
| **脚本** 公式 /5→/4 后重生成 | 断言 4 |

> 变异台子的三条硬纪律被遵守:还原放在 `finally` 无条件执行、还原后逐字节比对(不一致即停)、基线不绿即停。**「变异存活」与「needle 过期」在退出码上同形**,所以台子报告 `SURVIVED` / `WRONG-KILLER` / `BROKE` 三种,而不是一个布尔值。

**闸门已接进 `pnpm check`:** `node scripts/score-user-value.mjs --check` 已加入 `check` 脚本(并新增 `check:user-value` 快捷命令)。否则「新增引擎但忘了评分」只有守卫的注册表比对能发现,**引擎文件与注册表同时漂移**的情形无人发现。

---

## 5. P153-A(已完成,2026-10-21):AI 定价全量刷新

> 这部分在 P153 写 spec 的同日完成并已上线,记录在此以便 P153 整体自洽。

### 5.1 做了什么

| 项 | 内容 |
|---|---|
| **数据** | `src/data/ai-pricing.json` 重新同步:`lastUpdated` 2026-08-24 → **2026-10-21**;新增 32 个模型、更新 44 个模型的价格/上下文窗口 |
| **新增旗舰** | `gpt-6.1-sol` / `gpt-6-astra` / `gpt-6-sol` / `gpt-6-luna`(in $2 / $10 / $0.1,out $10 / $50 / $0.5,ctx 922K)、`claude-opus-5-5` / `claude-sonnet-5-5` / `claude-haiku-5-5`(ctx 1M)、`gemini-4-argon`(★ 新 family)、`gemini-3.8-flash` |
| **新 family** | `gpt6`(🔷)、`claude5x`(★)、`gem4`(★) —— 否则新旗舰会落进 `legacy` 桶,而 `legacy` **被「best value」推荐排除** |
| **策展化** | 策展旗舰(display order + batch 折扣 + icon + cache/batch 能力位 + maxOutput)搬进 `scripts/sync-pricing.mjs` 的 `CURATED`,`pnpm sync` 每次都会重建 → 不再靠手改 JSON |
| **文案** | 4 个工具的 description 去掉易腐的「across N models」硬数字,改为家族/lineup 表述 —— 实测对比引擎实际渲染 **121 个模型**而文案写「15 models」,且那串字就在用户可见的 howToUse 里;`data_reviewed_at` / `dataReviewedAt` 更新到 2026-10-21(10 个 prose 文件 + 5 个 tools 条目) |
| **修正的既有缺陷** | ① `Cost Comparison (14 Models)` 硬编码 —— 实测静态图实际画 **127 行**,标签却是 14 → 改为动态取各自真实模型数;② §3.1 的两个红闸门 |

### 5.2 留档的已知不一致(不在本轮修)

**静态路径与交互路径的模型集不同:**
- SSR 首屏(`staticExamples[0]`,由 TS `calculate()` 生成)= **137** 个模型
- 交互态(`customFn` 压缩表)= **18** 个策展模型

标签已各自改为真实值(137 / 18),但**同一个页面首屏和点「Generate」后行数不同**。这是既有设计(`codegen-customfn` 的 bundle-size 权衡),修它需要决定「长尾模型名要不要留作 SEO 关键词面」——**属产品决策,留给 user**。

### 5.3 复测方法

```powershell
Set-Location 'D:\E\独立站\ForgeFlowKit'
node scripts/sync-pricing.mjs          # 数据 + 策展
node scripts/codegen-customfn.mjs      # 引擎压缩表
node scripts/codegen-examples.mjs      # staticExamples
node scripts/check-engine-count-by-category.mjs --check   # 已修的闸门
```

---

## 6. Phase 2 的真实成本(更正 P152 §6.1)

P152 §6.1 把「重建 5 篇决策博客」估为「中」成本。**实测后必须上调。**

`32a982e` 删除博客时,删掉的不只是文章文件:

| 被删的东西 | master 上的现状 |
|---|---|
| `src/content/blog/`(100 篇) | ❌ 不存在 |
| 博客集合定义(独立于 `src/content/config.ts` 的 `tools` 集合) | ❌ 不存在 |
| 博客路由(`/en/blog/*`、`/zh/blog/*`) | ❌ 零路由 |
| markdown 渲染依赖 | ❌ 无(仅 `src/content/tools/` 的 prose 走 Astro 内置) |
| sitemap / `llms.txt` / 导航里的 `/blog/` 链接 | ❌ 已清(整改时移除的) |

**重开 `/blog/*` 这个 URL 面 = 重建一整套内容管道 + 5 篇 1500+ 词文章 + 重新接 sitemap / llms.txt / 内部链接。**

**而且时机不好:** AdSense 于 2026-10-19 09:40 送审,当前状态「正在准备」。**在审核进行中重开刚被关掉的 URL 面,收益为零**(审核员看的是当前线上站点,新内容赶不上这次审核),风险却是实的(半成品的 `/en/blog/` 可能被爬虫或审核员看到)。

→ **建议:Phase 2 重建放到 AdSense 批准之后**,并按 §12.1 单独开 `feature/phase-2-p140e-seo` 分支 + 单独 spec。

**替代方案(成本低得多,值得 user 考虑):** 仓库里**已经有** prose 层 —— `src/content/tools/` 下 100 个 en 文件、**41,309 词**、均值 413 词(实测,不含 `_README.md`),由 `CalculatorProse.astro` 渲染进 `[lang]/[slug].astro`。5 个 ADR 对应的计算器(csat / roas / cac / churn-rate / burn-rate)**都有 prose 文件**。

> 把这 5 个 prose 改写成「决策指南」形态,**零新管道、零新 URL、零 sitemap 风险**。代价是它不是独立文章(没有独立 URL 与独立的 SEO 入口)。

**这一条(独立文章 vs 升级既有 prose)是 Phase 2 的核心产品决策,列在 §7.2。**

---

## 7. 建议行动序列(待 user 拍板)

| | 动作 | 成本 | 收益 | 依赖 |
|---|---|---|---|---|
| **G1** | ✅ **已完成(2026-10-21)**:去掉 5 个只读源码守卫里**不成立的** build 依赖 | 分钟级 | Phase 3 的质量线**从「形同虚设」变成真守** | 无 |
| **G2** | ✅ **已完成(2026-10-21)**:User Value Score 落地(脚本 + JSON + 5 条断言的守卫) | 中 | p140f §15.2 的准入线落地 → **Phase 4/5 扩量前唯一缺的那道闸** | 公式已拍板(7.1) |
| **P2** | Phase 2 重建 5 篇决策博客 | **大**(管道 + 文章 + 接线) | 路线图断层 + 深度内容 | 等 AdSense 批准 + 7.2 决策 |
| **E1** | ✅ **已完成(2026-10-21)**:修 `tests/run.mjs` 的 Windows 命令行长度限制(分批 spawn) | 小 | `pnpm check` 在 Windows 上能跑完 | 无 |
| **E2** | ✅ **已完成(2026-10-21)**:补齐博客删除后遗留的测试引用 —— 实测范围比预估大(7 套件 / 10 条断言,根因是「博客删除没做收尾」),CI 已从红转绿 | 小→中 | 消除 10 个永久红的测试;**master 的 CI 第一次是绿的** | 无 |
| **E3** | 静态 / 交互模型集不一致(§5.2) | 中 | 首屏与交互一致 | 需产品决策 |

**推荐顺序:G1 → G2 → (等 AdSense)P2;E1/E2 顺手做掉。**

**理由:G1/G2 是「先把护栏修好,再扩内容」的顺序。** 2026-08-17 的拒审本质就是「在没有质量准入线的情况下扩内容」;而现在 Phase 4/5 的 AI 自动扩展正要开始 —— 没有 User Value Score 闸门就扩,等于把同一个坑再踩一遍(§2.2 的 G2)。

### 7.5 G1 落地实况(2026-10-21)

**解除休眠门的 5 个守卫(只读源码,build 门不成立):**

| 守卫 | 断言数 | 解除后实测 |
|---|---|---|
| `playbook-6-fields-coverage-guard` | 3 | pass |
| `decision-layer-coverage-guard` | 2 | pass |
| `content-prose-shape-guard` | 7 | pass |
| `sources-quality-guard` | 1 | pass |
| `topic-content-coverage-guard` | 1 | pass |

> `no-adsense-placeholder-guard` **本来就没有门**(它显式声明 source-only),不是「解除」而是「确认无需解除」——原先的 todo 把它算进 6 个是笔误。

**顺带修正的既有漂移:`tests/run.mjs` 的 skip-mode 清单是硬编码的,已经漂了。** 原清单列了 4 个**已删除**的 blog-* 守卫、4 个**其实没有门**的守卫(含本次解除门的 3 个),同时**漏列** 8 个真正带门的守卫(实测带门套件 **47** 个)。改为**从测试源码动态计算**(`process.env.RUN_BUILD_TESTS` 出现即算带门,注释先剥离),**清单从此不可能再漂**。

### 7.6 E2 落地实况(2026-10-21):把「博客删除的收尾」做完

**为什么先做这个:** master 的 CI 本来就是**红的** —— 那 10 个失败**不是** build-gated,Linux CI 上照样红。在一个红灯基线上继续叠加改动,等于每层楼都建在坏地基上。而审核窗口正好是修护栏的窗口。

**根因只有一个:** `32a982e` 删掉博客集合/路由/渲染依赖时**没做收尾** —— 守卫还在读已删的文件、i18n 留下了死 key、判据还在断言一个**已经被故意废弃**的契约。

| 套件 | 失败数 | 根因 | 新契约 |
|---|---|---|---|
| `a11y-scattered` | 1 | 手抄的 9 个组件清单里有已删的 `RelatedBlog.astro` → ENOENT | **全量扫描** `src/components/*.astro`:每个含 `<svg>` 的组件都要有 `aria-hidden` |
| `ab-split` | 1 | 手抄的 4 个消费者里有已删的 `src/lib/blog.ts` → ENOENT | **从源码推导**:每个 import tools 注册表的模块都必须用规范相对路径 |
| `last-modified-guard` | 1 | 硬编码 5 个抽查路径,含 2 个已删的博客 URL | **全量扫描** `dist/**/*.html` |
| `translation-glossary-guard` | 2 | ① 断言 `src/content/blog` 存在 ② 8 个真孤儿 key | ① 博客 post 集合**从实际存在的 md 推导**(博客回来时自动重新要求 key)② 删掉 8 个死 key |
| `translate-helper` | 2 | 测试键 `blog.try_now` 随博客一起消失,`translate()` 落到「返回 key 本身」兜底 | 改用真实存在、带具名占位符的 key `topic.guide.h2.what_is` |
| `decision-support-audit` | 1 | import `../tmp/audit-decision-support.cjs` —— `tmp/` 被 gitignore ⇒ **CI 上必然缺** | L5 契约抽到 `tests/l5-tags.ts` 单一真相源,守卫与审计测试共用 |
| `wrangler-bindings-contract` | 2 | 断言的 `r2_buckets`/`kv_namespaces` 段是**当初为解锁 CF Pages publish 而故意删掉的** | 新契约:绑定名必须在 wrangler.toml 里被记录(供 Dashboard 配置),但**段不能存在**、配置行不许有占位符 |

**三条通用手法(全部用上了):**

1. **别抄,去算。** 4 处手抄清单(组件 9 项 / 消费者 4 个 / dist 抽查 5 个 / 博客 slug 列表)全部改成从真相源推导。收益不只是「不再腐烂」,覆盖面同时变大了:a11y 从 9 个文件 → **全部 23 个组件**(含 `<svg>` 的 8 个);消费者从 4 个 → **全部 24 个**;Last-Modified 从 5 个 → **全部 438 个页面**。
2. **判据要写清新契约,不能只把否定翻成肯定。** 例如 wrangler 那条不是「不要 `r2_buckets`」就完事,而是拆成三条各自独立的:绑定名要被记录 / 段不能存在 / 配置行不许有占位符。
3. **变异台子验证。** **10 条变异全被指定的那条断言**杀掉。台子还揪出了台子作者自己的**两个真 bug**:① `[[r2_buckets]]` 是 TOML 的数组表语法,而第一版正则只认单括号 `[r2_buckets]` ⇒ **漏检**;② robots 的 wildcard 断言写成了全 body 正则,body 里还有 5 个爬虫各自的 `Allow: /` ⇒ 把 wildcard 换成 `Disallow: /` 它照样绿。**这两条靠「读测试」都读不出来 —— 只有问「这条断言能不能杀掉它声称要杀的东西」才会暴露。**

**8 个真孤儿 key(逐个查证 0 引用后删除;其中 5 个同时还在另一份契约清单里,见 §7.8):**
`nav.blog` / `breadcrumb.blog` / `related_blog.title` / `favorites.saved_count` / `eeat.reviewed_by` / `eeat.team` / `eeat.author_label` / `eeat.publisher_label`

两个 locale 文件各删 8 行,5128 → 5120 键,en/zh 键集仍完全同步。删后**重建产物确认 8 个 key 一个都没漏进页面**(否则页面上会露出 key 字面量)。

### 7.7 E2 顺带挖出的第 11 个失败:「半门」套件(2026-10-21)

修完上表 10 个之后,全量复跑只剩 **1 个**失败:`privacy-policy: Chinese Supabase section present in dist` —— 而且它是**修完之后才出现**的。

**根因不是我的改动,是这个套件自己漏了 P23b 的 skip-guard。** `tests/privacy-policy-sync.test.ts` 有两个测试:第一个带 `if (skipIfNoBuildTests()) return;`,**第二个没有** ⇒ 它在默认模式下照样执行,去读磁盘上**碰巧存在**的 `dist/`。于是:

| dist/ 是谁构建的 | 结果 |
|---|---|
| 早先某次带 Supabase 环境变量的构建 | 通过(旧产物里有「数据同步（Supabase）」段) |
| 本轮不带环境变量的 `astro build` | **失败**(没有 Supabase 段) |

**「测试结果」取决于「上一次构建是谁做的」—— 这是非确定性,不是内容缺陷。** 修法:给第二个测试补上与第一个相同的 skip-guard(默认跳过;`RUN_BUILD_TESTS=1` 时读第一个测试用正确 env 构建出的产物)。

**顺手全仓扫了同类缺陷**(扫描器:先剥注释,再找「文件级门」与「测试级门」的差集):

> **半门套件:一个文件有 `RUN_BUILD_TESTS` 门,但只有部分 `test(...)` 块被门覆盖。**

实测 47 个 build 依赖套件里**只有 1 个是半门**,就是上面这个;其余要么是**文件级** `process.exit(0)`(覆盖全部测试),要么每个测试各自带门。修完后复扫 = **0**。

> 扫描器本身也返工了两次:第一版把「文件级门」误判成「无门」(42 个假阳性);第二版被注释里的 `test(` 和 `RegExp.prototype.test(` 骗到(`\btest\s*\(` 会匹配 `.test(`)。**每一次「扫描结果异常」都先怀疑扫描器** —— 这条已经吃过两次亏(见 agent memory「自建的校验器报 0 条时先怀疑解码器」)。

### 7.8 E2 的连锁发现:失败的数量和位置 ≠ 原因的数量和位置 (2026-10-21)

修完上两节,全量复跑从 10 个失败降到 1 个(robots + privacy-policy)。但**再跑一次,变成 6 个**,而且其中 3 个是我上一轮刚改的测试。追下去发现的是一条**三层因果链**:

| 层 | 现象 | 真正的原因 |
|---|---|---|
| 1 | 6 个测试失败:robots ×2 / feedback-widget / last-modified / sitemap ×2 | —— |
| 2 | `dist/ missing — run pnpm build first` | 构建**失败**了,`cleanDist()` 已把 dist/ 删掉却没重建 |
| 3 | `build failed: ❌ i18n completeness check failed. Missing 5 key(s)` | **`pnpm build` 的 prebuild 步骤挂了** |

**第 3 层才是根因,而它是我自己造成的:** 我删掉 8 个 i18n key 时,只问了一个守卫(孤儿 key 守卫说它们没人引用),**没问第二个守卫** —— `scripts/check-i18n-completeness.mjs` 的 `REQUIRED_KEYS` 硬编码清单里,其中 5 个还在:

```
eeat.reviewed_by / eeat.team / eeat.author_label / eeat.publisher_label / favorites.saved_count
```

逐个查证后确认:**这 5 个确实无人渲染**(EEAT 组件直接输出作者名 + `eeat.author_role.${role}`,从不打印「Author / Publisher / Reviewed by」标签;favorites 页也从不显示 saved-count)。**所以过时的是那份硬编码契约清单,不是数据。** 修法:从 `REQUIRED_KEYS` 里删掉这 5 条,并在脚本里写明原因。

> **两个闸门对同一批 key 给出相反结论时,不能只信一个。** 而且**删数据之前必须先问:还有没有别的闸门依赖它。** 孤儿守卫只覆盖了「被引用」这一个维度,prebuild 的完整性检查覆盖的是「被声明为必需」—— 两者是**不同契约**,不是同一个真相源。

**另一条独立发现:robots 守卫的源码解析器是坏的。**

`ai-crawler-robots-txt-guard` 在 `dist/robots.txt` 不存在时(常态:该路由是 hybrid 模式的按需端点,`public/robots.txt` 也不存在),会退回去**用正则扫源码里的 `BODY` 数组**。而源码注释里有一个撇号:

```js
// crawlers, and any new AI crawler we haven't enumerated yet).
```

这个撇号被当成字符串引号,**吞掉了后面真正的 `'User-agent: *'` 和 `'Allow: /'` 两行** ⇒ 解析出的 body 悄悄少了 wildcard 规则 ⇒ 守卫对一份**完全正确**的 robots.txt 报红。修法:**不再解析源码,直接调用真实的路由处理器**(`GET()` 返回的 Response 就是线上吐出的字节)—— 没有解析、没有 dist/ 依赖、结果不取决于本地有没有残留构建。

> **改完又被变异台子抓了一次:** 新写的「wildcard 有 `Allow: /`」断言用的是**全 body 正则**,而 body 里还有 5 个爬虫各自的 `Allow: /` ⇒ 把 wildcard 的 `Allow` 换成 `Disallow: /` 之后,这条断言**照样通过**。**断言的名字说的是「wildcard」,实际守的是「body 里任意一处」。** 改成块级判定(`isCrawlerAllowed(body, '*')` 解析 `User-agent: *` 自己的规则段)。
>
> 这就是台子的价值:它验证的是「**这个断言能不能杀掉它声称要杀的东西**」,而不是「这个测试现在是绿的」。

**第三类:「读 dist/ 却不拥有 dist/」的测试。**

系统扫了一遍:读 dist/ 的套件里,还有两个既**没有 build 门**、也**不自己构建** —— `feedback-widget-guard` 与 `last-modified-guard`。它们的结果取决于「本地碰巧有没有一份构建产物」:全新克隆上直接报 `dist/ missing — run pnpm build first`;CI 里因为 unit-test 步骤跑在 build 步骤**之前**,能不能过全看**排在它前面的套件有没有顺手构建过**。两个都改成仓库既有模式:**无 `RUN_BUILD_TESTS` 则跳过,需要时自己构建**。

扫完的结论:**读 dist/ 的套件要么有门、要么自建**,不再有第三种。

**遗留待拍板项(本轮未自行决定):**
- **L5 标记目前是精确大小写匹配**(`decision-layer-coverage-guard` 用 `src.includes('🧭 Decision Question')`)。原审计脚本的测试断言的是「大小写不敏感」,而**没有任何实现曾是不敏感的** —— 那是草稿脚本与守卫之间的漂移。现在契约被钉死为精确匹配。若认为「引擎里写成小写也应被检出」(即守卫应更宽松),需要**同时**改 `tests/l5-tags.ts` 与守卫语义 —— 属产品决策,留给 user。

### 7.1 公式歧义(必须拍板) —— ✅ 已拍板(2026-10-21)

- **推荐:** `User Value Score = (功能价值 + UX + Advisor + Retention + Advocacy) ÷ 5`(算术平均)
- **理由:** 与同句 `÷ 5` 自洽;阈值 0.7 可达;`×` 读作 `+` 几乎肯定是原意(否则公式恒拒)
- **改的是 p140f §15.2 的原文** → 属 Roadmap 改动,需 user 明确点头

> **拍板结果(user,2026-10-21):采纳算术平均。**
> 已落地:`docs/superpowers/specs/2026-08-05-p140f-v2-strategy-design.md` §15.2 原文已改写,并附 2026-10-21 修正说明(含「为何乘法形式不可满足」的推导)与三档刻度。
> 脚本实现:`scripts/score-user-value.mjs` 的 `score = sum / 5`;`src/data/user-value-scores.json` 的 `formula` 字段写死同一公式;守卫断言 3 / 4 独立核验该公式。

### 7.2 Phase 2 形态(必须拍板)

- **选项 A(推荐):** 升级既有 5 个 prose 为决策指南 —— 零新管道、零新 URL,当天可完成
- **选项 B:** 重建独立博客管道 + 5 篇独立文章 —— 真正的 P140e 交付物,但成本大、且要等 AdSense 批准
- **选项 C:** 先 A 后 B(A 立刻提升内容质量,B 排期做)

### 7.3 评分方式 —— ✅ 已拍板(2026-10-21)

- **原推荐:** LLM 批量 + 人工抽样 20 个(§4.3)
- **拍板结果:** 改为**机械信号 + 人工抽检**(§4.6),理由见该节:LLM 打分不可复现,分数漂移无法区分「引擎变好」与「模型心情变了」;机械信号重跑必得同一组数字。
- 人工抽检仍保留 —— 用于校准**标记集与档位规则**,而不是校准单个引擎的分数。**规则不一致时改规则,不改分数。**

### 7.4 `tests/run.mjs` 修法 —— ✅ 已实施(2026-10-21)

- 原推荐:分批 spawn(35 个/批),与本轮验证时用的方法一致;或把路径写进临时响应文件
- **实际采用:分批 spawn(30 个/批)。** 单次 spawn 携带 236 条测试路径会超 Windows cmd.exe 的 8191 字符上限,`pnpm check` 在 Windows 上**一条断言都跑不到**就死在 "The command line is too long."。分批后:
  - 每批一条命令行,长度远低于上限;
  - 语义不变:所有套件仍**全部跑完**、**串行**(`spawnSync` 阻塞,批次之间不会交错,不会互相踩 `dist/`),任一批失败 → 进程非零退出;
  - 每批打印一行 `[run] batch N (M suites, …)` 便于观察进度。

---

## 8. Open Questions(2026-10-21 拍板后)

1. ~~**§7.1 公式**改成算术平均?~~ → ✅ **已拍板:算术平均**(2026-10-21)。p140f §15.2 原文已改写并附修正说明(§4.6)。
2. **§7.2 Phase 2 形态**:A(升级 prose)/ B(重建博客)/ C(先 A 后 B)? → ⏸ **仍未拍板**。取舍:**A 零新管道、零新 URL,当天可完成**;**B 是真正的 P140e 交付物,但成本大、且要等 AdSense 批准**。P152 §6.1 的成本估计已被实测上调(A 实际是「中等」,Phase 2 重建是「大」)。
3. ~~**§7.3 评分方式**~~ → ✅ **已拍板:机械信号 + 人工抽检**(2026-10-21),非 LLM 批量打分(理由见 §4.6)。
4. **§5.2** 静态 137 模型 vs 交互 18 模型 —— 要不要统一?统一的话长尾模型名的 SEO 关键词面会缩 → ⏸ 未拍板。
5. **分支命名** → ✅ **已定**:`feature/phase-3-playbook-6-fields` 承载 G1+G2+E1,按 §12.2「Phase 3 内的工作算小更新」直接 commit 在该分支上,不开 sub-branch。P2 另开 `feature/phase-2-p140e-seo`。
6. `feat/i18n-drift-fix` / `feat/ai-cost-preset-chip-unification` 两个悬空分支 → ⏸ 未拍板。事实:**已被 squash 合入 master**(JSON 迁移 + 漂移检测 + pre-commit 接线都在 master 上),`git cherry` 判 `+` 只因 squash 后 patch-id 变了。真正没进 master 的只有 i18n 分支上的 2 个测试文件 → **建议只补这 2 个测试,然后删掉两个分支指针**。
7. **L5 标记的大小写语义**(2026-10-22 新增)—— `tests/l5-tags.ts` 现钉死为**精确大小写**匹配,与 `decision-layer-coverage-guard` 的 `src.includes()` 一致。原审计脚本的测试断言「大小写不敏感」,而**没有任何实现曾是不敏感的**。若要让守卫更宽松(引擎里写成 `🧭 decision question:` 也算命中),需**同时**改 `tests/l5-tags.ts` 与守卫语义 → 属产品决策,留给 user。

---

## 9. 复测方法

```powershell
Set-Location 'D:\E\独立站\ForgeFlowKit'

# Phase 3 字段覆盖率(应为 100/100)
Get-ChildItem src\engines -Recurse -Filter *.ts | Where-Object Name -ne 'index.ts' |
  Select-String -Pattern 'playbook\s*:' | Measure-Object

# 守卫激活后,应在不带 RUN_BUILD_TESTS 的情况下仍然执行断言
node_modules\.bin\tsx.cmd --test tests/playbook-6-fields-coverage-guard.test.ts
node_modules\.bin\tsx.cmd --test tests/decision-layer-coverage-guard.test.ts

# User Value Score(应 > 0 命中)
Get-ChildItem src,tests -Recurse -Include *.ts,*.json,*.astro |
  Select-String -Pattern 'user-value-score|userValueScore|User Value Score'

# 两个红闸门(应 PASS)
node scripts/check-engine-count-by-category.mjs --check
node scripts/codegen-examples.mjs --check

# User Value Score 闸门(2026-10-21 新增)
node scripts/score-user-value.mjs --check          # JSON 与引擎源码未漂移
node_modules\.bin\tsx.cmd --test tests/user-value-score-guard.test.ts   # 5 条断言

# G1 激活后的守卫(不带 RUN_BUILD_TESTS 也必须真跑断言)
node_modules\.bin\tsx.cmd --test tests/playbook-6-fields-coverage-guard.test.ts
node_modules\.bin\tsx.cmd --test tests/decision-layer-coverage-guard.test.ts
node_modules\.bin\tsx.cmd --test tests/content-prose-shape-guard.test.ts
node_modules\.bin\tsx.cmd --test tests/sources-quality-guard.test.ts
node_modules\.bin\tsx.cmd --test tests/topic-content-coverage-guard.test.ts

# 全量(Windows 下已修:分批 spawn,不再超命令行长度上限)
node tests/run.mjs

# E2 修完后:这 7 个套件必须全绿,且不再依赖任何 gitignored 文件
node_modules\.bin\tsx.cmd --test tests/a11y-scattered.test.ts tests/ab-split.test.ts `
  tests/last-modified-guard.test.ts tests/translation-glossary-guard.test.ts `
  tests/translate-helper.test.ts tests/decision-support-audit.test.ts `
  tests/wrangler-bindings-contract.test.ts

# 8 个孤儿 key 删除后:两个 locale 键集仍同步,且没有漏进产物
node -e "const en=require('./src/i18n/locales/en.json'),zh=require('./src/i18n/locales/zh.json');"
node scripts/check-i18n-completeness.mjs

# AI 定价新鲜度
Get-Content src\data\ai-pricing.json | ConvertFrom-Json | Select-Object lastUpdated, source
```

---

## 10. References

### 路线图 / 宪法

- `docs/superpowers/specs/2026-08-05-p140f-v2-strategy-design.md` §11.4 / §12.1 / §15.2 —— Phase 3、5 问与 User Value Score
- `AGENTS.md` L108-125 —— Project Constitution (v2.0 灵魂三维度)
- `docs/superpowers/specs/2026-10-21-p152-v2-roadmap-execution-audit-design.md` —— 本 spec 更正其 §3 / §6.1 / §6.2

### 审计用到的仓库产物

- `tests/playbook-6-fields-coverage-guard.test.ts` —— Phase 3 守卫(P153-G1 已激活)
- `tests/decision-layer-coverage-guard.test.ts` —— L5 决策层守卫(P153-G1 已激活)
- `tests/content-prose-shape-guard.test.ts` / `tests/sources-quality-guard.test.ts` / `tests/topic-content-coverage-guard.test.ts` —— 另外 3 个已激活的 source-only 守卫
- `tests/user-value-score-guard.test.ts` —— **P153-G2 新建**:User Value Score 闸门守卫(5 条断言)
- `scripts/score-user-value.mjs` —— **P153-G2 新建**:机械信号评分脚本(`--check` 模式)
- `src/data/user-value-scores.json` —— **P153-G2 新建**:100 引擎的评分单一真相源
- `src/engines/**/*.ts` —— 100 个引擎(playbook 6 字段 / L5 决策层)
- `src/data/tools/index.ts` —— 工具注册表(100 slug,守卫断言 1 的**独立来源**)
- `src/content/tools/*.md` —— prose 层(100 en / 41,309 词,实测)
- `src/data/ai-pricing.json` + `scripts/sync-pricing.mjs` + `scripts/codegen-customfn.mjs` —— AI 定价链路
- `tests/run.mjs` —— 测试 runner(P153-E1 已修:分批 spawn + 动态 skip 清单)

### 外部

- Codifly《AI API prices in October 2026》(codifly.co,2026-10)—— 维度 3 AI 模型信号
- wifitalents.com「Calculator Software: Top Picks (2026)」—— 维度 3 竞品信号
- LiteLLM `model_prices_and_context_window.json`(4245 条,2026-10-21 实测)—— 定价源头

# P168 批次 3 B3-1 —— 决策支持迁出到区块独占（3 个异类引擎）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `ltv-by-channel` / `gdpr-fine` / `cac` 三个异类引擎的 🧭 四段从引擎输出里**整段迁出**到页面 i18n 四层，并给常量 Tip 的引擎补一条**真动态**的 💡 Tip。

**Architecture:** 沿用 B3-0 已验证的形态 —— 「静态四层（SSR，i18n）+ 动态一层（引擎 💡 Tip，客户端）」，决策支持**由区块独占**。引擎只管算；卡片不再输出 🧭 段 ⇒ 同页零重复是结构性的。

**Tech Stack:** Astro 5 · TypeScript · `node:test`（tsx 运行）· JSON locale · 纯 JS codegen 脚本

## Global Constraints

- 迁出 = **三件事**：翻译进 locale + 从引擎删除 + 补真动态 Tip。少一件都不算完成。
- locale 文案**不得**含 markdown `**`（页面纯文本渲染 ⇒ 星号原样显示）。
- 跨工具引用**必须**保留方括号 `[CAC Calculator]`（`score-user-value.mjs` 的 advocacy 计数靠它；burn-rate 踩过：丢了方括号 ⇒ advocacy 1→0）。
- 静态层**不得**写死动态数字（cac 源段里的 `$80` 必须剥离 ⇒ 否则英文页显示假数字）。
- `customFn` 与 `generate` 的 💡 Tip 必须**逐字一致**（守卫 `live = static parity` 守着这条）。
- 中文信息量 ≥ 英文 × 0.7（`MIN_ZH_TO_EN_RATIO`）；绝对下限只挡「明显不是成文内容」。
- 引擎输出里**不得**再有 `🧭 Decision`（含 `staticExamples[0]` / 运行时 `generate` / `customFn` 三处）。
- 期望值**独立写死**（不可从 `tests/l5-layers.json` 派生 ⇒ 同义反复）。
- 一条变异只红一条断言；还原无条件执行 + sha256 逐字节校验。
- 提交前必须 `git fetch` + 确认 0 behind；**禁止** force-push；commit 信息不得含 `[CI Skip]` 类标记。
- ⛔ `bing-block-urls.csv` 是用户的无关文件，**不得提交**。
- ⚠️ 本轮**不处理** zh 页动态层显示英文的缺陷（用户 2026-11-06 拍板：记为独立缺陷，下一轮处理）。

---

### Task 1: 写 3 个引擎的 en/zh 四层文案并合并进 locale（激活 3 个工具）

**Files:**
- Modify: `src/i18n/locales/en.json`（新增 12 个键）
- Modify: `src/i18n/locales/zh.json`（新增 12 个键）
- Create: `tmp/b3-1-copy.json`（临时合并源，gitignored）

**Interfaces:**
- Produces: `tools.solopreneur-ltv-by-channel-calculator.decision_{goal,recommendation,constraint,next_tool}` + 同名的 `solopreneur-gdpr-fine-calculator` + `solopreneur-cac-calculator`（en 与 zh 各 4 个）

- [ ] **Step 1: 写文案源文件 `tmp/b3-1-copy.json`**

内容见下方「文案全文」一节（en 12 段 + zh 12 段）。

- [ ] **Step 2: 合并脚本（保留键序 + 格式）**

键必须插到该 slug 的**第一个 `input.*` 键之前**（与 burn-rate 现有位置一致），组内顺序 goal → recommendation → constraint → next_tool。

```js
// tmp/merge-b3-1.cjs
const fs = require('fs');
const copy = JSON.parse(fs.readFileSync('tmp/b3-1-copy.json', 'utf8'));
for (const lang of ['en', 'zh']) {
  const p = 'src/i18n/locales/' + lang + '.json';
  const src = fs.readFileSync(p, 'utf8');
  const obj = JSON.parse(src);
  const out = {};
  const pending = new Map();
  for (const [k, v] of Object.entries(obj)) {
    // 该 slug 的第一个 input.* 键之前 ⇒ 插入 4 个 decision 键
    const m = /^tools\.([^.\s]+)\.input\./.exec(k);
    if (m && copy[lang] && copy[lang][m[1]]) {
      for (const dk of ['goal', 'recommendation', 'constraint', 'next_tool']) {
        out['tools.' + m[1] + '.decision_' + dk] = copy[lang][m[1]][dk];
      }
    }
    out[k] = v;
  }
  fs.writeFileSync(p, JSON.stringify(out, null, 2) + '\n', 'utf8');
}
```

- [ ] **Step 3: 跑合并脚本 + 校验格式**

Run: `node tmp/merge-b3-1.cjs`
Expected: 无输出；`en.json` 仍无 BOM、末尾仍是 LF、缩进仍是 2 空格。

Run: `node -e "..."`（校验 24 个新键都存在且顺序正确）—— 用文件脚本跑，不要用 `node -e`（PowerShell 会吃掉转义）。

- [ ] **Step 4: 确认守卫变红（TDD 红）**

Run: `node node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 tests/decision-support-guard.test.ts`
Expected: **FAIL** —— 「引擎输出里不得再有 🧭 决策段」这条会红（3 个新工具的引擎还带着 🧭）。

---

### Task 2: 新守卫「决策建议必须随输入变化」

**Files:**
- Modify: `tests/decision-support-guard.test.ts`（追加一条 test）

- [ ] **Step 1: 写失败测试**

对每个**激活工具**：跑 `customFn`（或 `generate`）两次 —— 基准输入 + 逐个把某个 number 型输入 ×2 —— 只要**有一次** Tip 文本变了就算通过；全部不变 ⇒ 判红（Tip 是常量）。

判据守的是不变量「动态层必须随输入变」，不是实现细节。

- [ ] **Step 2: 跑测试确认红**

Run: `node node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 tests/decision-support-guard.test.ts`
Expected: **FAIL** —— cac / gdpr-fine 的 Tip 还是写死的常量。

---

### Task 3: 迁 `ltv-by-channel`（最简单：Tip 已动态）

**Files:**
- Modify: `src/engines/marketing/ltv-by-channel-calculator.ts`

- [ ] **Step 1: 删除 🧭 段（generate 里）**

删除 `r += '\n\n🧭 Decision Recommendation...'` 整块（含四个子段）。

- [ ] **Step 2: 删除 🧭 段（customFn 里）**

customFn 是压缩过的字符串，同样要删掉对应的 `\\n\\n🧭 Decision Recommendation...` 片段。

- [ ] **Step 3: 跑 codegen 重生成 `staticExamples[0]`**

Run: `node scripts/codegen-examples.mjs`
Expected: `ltv-by-channel-calculator.ts` 的 `staticExamples[0]` 里不再有 🧭。

- [ ] **Step 4: 跑守卫确认这条绿了**

---

### Task 4: 迁 `gdpr-fine` + 补真动态 Tip

**Files:**
- Modify: `src/engines/legal-compliance/gdpr-fine-calculator.ts`（`generate` + `customFn` + `staticExamples[0]` 三处）

- [ ] **Step 1: 写动态 Tip（4 档，与 `HEALTH_BANDS` 同一套阈值）**

档位：ratio < 0.25% / 0.25-1% / 1-2% / ≥2%（与 `calcHealthBand` 完全一致，不引入第二套标准）。
每档正文见「文案全文」。

- [ ] **Step 2: `generate` 里替换 💡 Tip + 删 🧭 段**

- [ ] **Step 3: `customFn` 里做**同样**的替换 + 删 🧭 段（必须与 generate 逐字一致）**

- [ ] **Step 4: 跑 codegen + 守卫**

---

### Task 5: 迁 `cac` + 补真动态 Tip + 剥离静态数字

**Files:**
- Modify: `src/engines/valuation/cac-calculator.ts`（`generate` + `customFn` + `staticExamples[0]`）

- [ ] **Step 1: 写动态 Tip（payback 4 档 + 缺输入 fallback）**

档位：payback ≤ 6 / ≤ 12 / ≤ 18 / > 18（引擎里已有的分支阈值）。
⚠️ `avgRevenuePerCustomer` 没填 ⇒ 没有 payback ⇒ 走 1 个 fallback 分支（提示补输入）。

- [ ] **Step 2: `generate` 里替换 💡 Tip + 删 🧭 段（$ 数字随之消失）**

- [ ] **Step 3: `customFn` 里做同样的替换 + 删 🧭 段**

customFn 里可用的变量：`cac2`（CAC）、`pbm`（payback 月数）、`arc`（avg revenue）、`gpc`（gross profit/customer）。

- [ ] **Step 4: 跑 codegen + 守卫**

---

### Task 6: 扩 `decision-layer-coverage-guard` 的目标工具 5 → 8

**Files:**
- Modify: `tests/decision-layer-coverage-guard.test.ts`

- [ ] **Step 1: `TARGET_CALCS` 加 3 个路径**

- [ ] **Step 2: 元数据断言同步（8 而不是 5）**

期望值**写死字面量**，不派生。

- [ ] **Step 3: 跑该守卫确认绿**

---

### Task 7: 变异台子加 M15–M19

**Files:**
- Modify: `tests/scripts/mutate-p168-decision-support.mjs`

- [ ] **Step 1: M15** —— 把 cac 的 🧭 段写回 `generate` ⇒ 应红「引擎输出里不得再有 🧭 决策段」
- [ ] **Step 2: M16** —— 删掉 gdpr-fine 的 `decision_goal` 键 ⇒ 应红「en/zh 四个静态键都在、非占位、有长度下限」
- [ ] **Step 3: M17** —— 把 cac 的 `customFn` Tip 改得与 `generate` 不一致 ⇒ 应红「客户端与服务端取到的建议必须一致」
- [ ] **Step 4: M18** —— 把 ltv-by-channel 的 🧭 写回 `customFn` ⇒ 应红「引擎输出里不得再有 🧭 决策段」
- [ ] **Step 5: M19** —— 把 cac 的动态 Tip 退化成常量 ⇒ 应红「决策建议必须随输入变化」
- [ ] **Step 6: 跑满台子，确认 19/19 KILLED、0 存活、0 未隔离，还原 sha256 逐字节一致**

---

### Task 8: codegen + 构建 + 验收测量

- [ ] **Step 1: 跑全量 codegen 校验**

Run: `node scripts/codegen-examples.mjs --check` / `node scripts/codegen-customfn.mjs --check` / `node scripts/score-user-value.mjs --check` / `node scripts/check-i18n-completeness.mjs`
Expected: 全部 exit 0。

⚠️ `score-user-value.mjs --check` 若因 `user-value-scores.json` 变化而红 ⇒ 跑一次不带 `--check` 重新生成，并确认**分数分布没变**（burn-rate 仍是 0.9 / l5Tags 4 / crossToolLinks 2）。

- [ ] **Step 2: 构建**

Run: `$env:SKIP_INDEXNOW='1'; pnpm build`
Expected: 438 页。

- [ ] **Step 3: 验收测量**

Run: `node node_modules/tsx/dist/cli.mjs tests/scripts/p168-decision-support-measure.ts`
Expected:
- 工具页两两相似度 **≤ 19%**（基线 en 12.54% / zh 18.22%）
- 同页逐字重叠 **≤ 2%**（基线 0.00%）
⚠️ 若相似度上升 ⇒ 说明 3 个工具的文案互相太像 ⇒ 改写句式（**不要**加免责声明式废话）。

---

### Task 9: 文档同步

- [ ] **Step 1: `AGENTS.md`** —— P168 note 补 B3-1 的验收数字与新增教训；维度表「Decision Support Rendering」行的数字
- [ ] **Step 2: `CHANGELOG.md`** —— 新增 B3-1 条目 + Total commits 计数
- [ ] **Step 3: 规格 `docs/superpowers/specs/2026-10-27-p155-...md`** —— 追加 `§19.26`（含 19.26.x 四层表、验收表、维度 3 scan、遗留缺陷「zh 动态层英文」）
- [ ] **Step 4: `src/components/INDEX.md` / `src/scripts/INDEX.md`** —— 若有变化则同步

---

### Task 10: 全量验证 + 提交询问

- [ ] **Step 1: 全量套件（后台，约 20 分钟）**

Run: `$env:RUN_BUILD_TESTS='1'; $env:SKIP_INDEXNOW='1'; node tests/run.mjs 2>&1 | Out-File -Encoding utf8 tmp/full-run.log`
Expected: 280 套件 / 0 失败。

- [ ] **Step 2: 提交前核对**

`git status -sb`（只能剩 `bing-block-urls.csv` 未跟踪）· 提交信息用 `git commit -F <utf8file>`（无 BOM、全 LF、无 skip 标记）

- [ ] **Step 3: 问用户是否提交**（带选项问卷 + 推荐项）

- [ ] **Step 4: 推送两端**（fetch → 确认 0 behind → push origin → push github URL → `git ls-remote` 复核）

---

## 文案全文

### en

**solopreneur-ltv-by-channel-calculator**

- `decision_goal`: Ranking channels by LTV alone is a trap. The number that decides where the next dollar goes is LTV:CAC measured against a 3x floor, with payback under 12 months — under 1x means each customer costs you money, and 3x or better means the channel can absorb more budget. Use this tool to sort channels by what they actually return per dollar spent, not by the revenue each one reports.
- `decision_recommendation`: Every channel falls into one of four bands, and each one wants a different move. Below 1x LTV:CAC: cut the budget now, because you are paying to lose money on every customer and more volume only scales the loss. Between 1x and 3x: hold spend where it is and work on funnel conversion instead, since that is where most recoverable margin hides. Above 3x: add budget while the channel is this efficient, because efficient channels get competed away. High LTV on low volume: keep it running as brand spend, and judge it on awareness rather than direct return.
- `decision_constraint`: Four things can swing this ratio by 2-5x, and none of them live in the calculator. Last-click attribution over-credits direct and under-counts brand, so a channel that started the journey can look like it closed it. A cohort window shorter than 6 months flatters churn and inflates every downstream number. A 24-month LTV that was never discounted inflates the ratio further. And one outsized customer can turn a segment into an outlier, which means the winner may not be repeatable when you try to scale it.
- `decision_next_tool`: Open CAC Calculator next to see what each channel costs per customer, then ROAS Calculator for the short-window return that a 24-month LTV cannot show you. Use Cohort Retention Calculator to confirm the cohort underneath the LTV is actually stable, and recalibrate against 6-12 months of real cohort data before you move budget.

**solopreneur-gdpr-fine-calculator**

- `decision_goal`: The headline fine percentage is the least reliable number on this page. What actually determines the penalty is annual turnover, how much data you hold, whether you have been caught before, and how much you did to mitigate it — 4% of global turnover is only the statutory ceiling, and real penalties usually land somewhere between 1% and 3%. Use this tool to decide whether compliance work is worth doing now, rather than to read a worst-case number.
- `decision_recommendation`: Four exposure ranges, four different responses. Above 4% of turnover: the number says a full compliance programme is already cheaper than the fine — get a C-level owner and legal in the room this quarter. Between 2% and 4%: spend is still high-ROI, because any compliance budget below the expected fine pays for itself; fund DSAR automation and CMP tooling now. Under 2%: minimum viable compliance is enough — a DPA, a privacy policy, and a consent banner cover most of the exposure. Under 500 records with no cross-border transfer: a standardised template package is the right answer, and over-engineering the programme just burns budget.
- `decision_constraint`: Four assumptions can move the real penalty far from this estimate. The turnover threshold slides with severity and how cooperative you were, so a 4% cap does not mean a 4% fine. Mitigation genuinely reduces penalties by 30-50%, and self-reporting versus being found is a large difference. Prior violations make the next one heavier. And cross-border transfers can be penalised separately under Schrems II, which this figure does not include at all.
- `decision_next_tool`: Run DPA Cost Calculator to see what supplier-side compliance actually costs, Consent Revenue Calculator to weigh that spend against conversion, and DSAR Cost Calculator to price the operational SOP. Then have legal review the data flows themselves — the calculator sizes the exposure, but only a data-flow audit says whether the exposure is real.

**solopreneur-cac-calculator**

- `decision_goal`: A CAC figure on its own does not tell you whether acquisition was worth paying for. Two things decide that: the LTV:CAC ratio you can actually defend, and what the number looks like once you split it by channel. Use this tool to find out how much of your blended CAC is hiding a channel that costs several times more than the average, because that is where the money leaks.
- `decision_recommendation`: Three conditions have to hold together before acquisition counts as working. LTV:CAC must sit at 3.0 or better, payback must come inside 12 months, and even the worst channel after you split the spend still needs an LTV:CAC of at least 2.0. Read the ratio as a set of moves: below 2x you are funding losses, so stop; between 2x and 3x optimise carefully; 3x to 5x is healthy enough to scale; above 5x means grab the window and spend hard while competitors hesitate.
- `decision_constraint`: Two things quietly break this. First, a blended CAC is an average, and averages are what hide the bad channel — your $500-per-customer LinkedIn spend sits comfortably inside a blended $80 while still being the single worst line in the budget. Second, the LTV you compare against matters: a historical 12-month LTV understates a 24-month one, so pairing a short LTV with a long payback flatters the ratio. Both errors point the same way, toward overestimating how healthy your acquisition is.
- `decision_next_tool`: Work out the real ratio with LTV Calculator, then split CAC by channel so the average stops hiding the expensive one. After that, move budget out of every channel below 2x and into the ones above 5x, and re-run this calculator to confirm the blended number moved in the direction you expected.

### zh

**solopreneur-ltv-by-channel-calculator**

- `decision_goal`: 只按 LTV 给渠道排序是个陷阱。真正决定下一块钱该投哪里的，是 LTV:CAC 对着 3x 这条底线看、再配上回本周期是否短于 12 个月 —— 低于 1x 说明每个客户都在让你亏钱，达到 3x 以上才说明这个渠道还能吃下更多预算。用这个工具按每个渠道「每投一块钱真正赚回多少」来排序，而不是按各渠道自己报的收入高低排序。
- `decision_recommendation`: 每个渠道都会落进四个档位之一，而四个档位要的动作各不相同。LTV:CAC 低于 1x：立刻砍预算 —— 你现在是在为每个客户付亏损的钱，加量只会把亏损一起放大，渠道结构性问题不会因为多花钱而消失。1x 到 3x 之间：预算先别动，把力气放到优化漏斗转化率上 —— 大多数渠道真正可回收的利润都卡在这一层，而不是卡在少花钱这一层。3x 以上：趁这个渠道效率还在就加预算，因为高效率的窗口会被后来的竞争者摊薄，很快就不值钱了。LTV 高但量很小：留着当品牌投入继续跑，但要用它买认知，而不是指望它带回直接的订单和收入。
- `decision_constraint`: 有四件事能让这个倍数在 2 到 5 倍之间摆动，而它们全都不在计算器里。归因模型选成 last-click 会高估直接转化、低估品牌带来的那部分，于是「开了局」的渠道看起来像是「收了尾」的渠道；cohort 观察窗不到 6 个月会把流失率算得过于好看，后面所有的数字都会被一起抬高；24 个月的 LTV 如果没有折现，倍数还会再虚高一截；最后，一个特别高 LTV 的客户有可能把一个真实客群变成统计上的异常值，也就是说现在的第一名未必放大得了、未必复制得出来。
- `decision_next_tool`: 接着打开 CAC Calculator，看每个渠道真正摊到每个客户身上花了多少钱；再用 ROAS Calculator 看短期回报 —— 那是 24 个月 LTV 看不到的部分，两者互补。用 Cohort Retention Calculator 确认撑起这个 LTV 的 cohort 到底稳不稳，动手挪预算之前，先拿 6 到 12 个月的真实 cohort 数据重新校准一遍。

**solopreneur-gdpr-fine-calculator**

- `decision_goal`: 这页上最不可靠的数字恰恰是那个「罚款百分比」。真正决定实际罚多少的是：全球年营业额、你手上有多少数据、以前有没有被罚过、以及你在事后做了多少补救 —— 4% 只是法定上限，真正落地的罚单通常在 1% 到 3% 之间。用这个工具来判断「现在做合规值不值得」，而不是去读一个最坏情形的数字。
- `decision_recommendation`: 四个敞口区间，对应四种完全不同的处理方式。高于营收 4%：这个数字本身说明，全面合规的总投入已经比罚款本身便宜 —— 这次就把 C 级负责人和法务拉进来定方案。2% 到 4% 之间：投入仍然是高 ROI 的，因为任何低于预期罚款额的合规预算都能自己回本 —— 现在就把 DSAR 自动化和 CMP 工具的钱投下去。低于 2%：minimum viable 合规就够了 —— 一份 DPA、一份隐私政策、一个同意横幅，基本能覆盖大部分敞口。数据不足 500 人且没有跨境传输：用标准化模板方案就够，把合规项目做得过度复杂只是在烧钱。
- `decision_constraint`: 有四个假设会让实际罚款和这个估算差得很远。turnover 阈值是滑动的，要看违规严重性和配合程度，所以「上限 4%」并不等于「就罚 4%」；主动补救确实能把罚款压低 30% 到 50%，而主动上报和被查出来之间差别巨大；以前的违规记录会让下一次更重；另外，跨境数据传输还可能被按 Schrems II 单独处罚，这部分完全不包含在上面的数字里。
- `decision_next_tool`: 先跑 DPA Cost Calculator，看供应商那一侧的合规成本到底是多少；再用 Consent Revenue Calculator 权衡这笔投入与转化率的关系；用 DSAR Cost Calculator 算出这套运营 SOP 的成本。最后一定要让法务过一遍真实的数据流 —— 计算器算的是敞口大小，只有数据流审计才能说明这个敞口是不是真的存在。

**solopreneur-cac-calculator**

- `decision_goal`: 单看一个 CAC 数字，回答不了「这次获客到底值不值」。真正能下结论的是两件事：你拿得出手、也扛得住质疑的 LTV:CAC 比例，以及把 CAC 按渠道拆开之后剩下的那个数。用这个工具找出混合 CAC 里藏着多少「贵好几倍」的渠道 —— 漏钱基本都漏在那里，而不是漏在你看到的那个平均值里。
- `decision_recommendation`: 有三条必须同时成立，获客才算真的跑通了。LTV:CAC 要达到 3.0 及以上，回本周期要压在 12 个月以内，而且把预算拆开之后，最差的那条渠道的 LTV:CAC 也要不低于 2.0。比例要这样读：低于 2x 就是在为亏损花钱，先停；2x 到 3x 之间，谨慎地一点点优化；3x 到 5x 是健康水平，可以放心扩量；高于 5x 说明窗口正开着，趁竞品还在犹豫，把预算狠狠加上去。
- `decision_constraint`: 有两件事会在暗中毁掉这个判断。第一，混合 CAC 是平均数，而平均数恰恰是用来藏坏渠道的 —— 某个渠道每个客户 500 美元的 LinkedIn 花费，完全可以舒舒服服地待在混合的 80 美元里面，同时还是整份预算里最差的那一行。第二，你拿来对比的 LTV 本身也要对：用历史的 12 个月 LTV 去比一个更长的回本期，会低估真实的回收能力，而低估的方向永远是让数字看起来比实际更健康。这两个错误都朝同一个方向骗人。
- `decision_next_tool`: 先用 LTV Calculator 算出真实的比例，再把 CAC 按渠道拆开，让平均值不再替你藏住那个贵的渠道。拆完之后，把所有低于 2x 的渠道的预算砍掉，把预算挪到 5x 以上的渠道去，然后回来重跑一次这个计算器，确认混合后的那个数字确实朝你预期的方向动了。

### 动态 Tip 文案（英文，写进引擎；zh 动态层英文是已知遗留缺陷）

**gdpr-fine（4 档，与 HEALTH_BANDS 一致）**

- excellent（ratio < 0.25%）: Your annual exposure sits at X% of revenue, which is a mature compliance posture. Keep the baseline current and re-run this after any material breach, because next year's number depends on how cleanly today's data is documented.
- good（0.25-1%）: Annual exposure is X% of revenue — manageable, but not free. Put roughly half the expected fine into DSAR automation and CMP tooling now; that is enough to halve the violation rate and move you into the excellent band.
- warning（1-2%）: Annual exposure has reached X% of revenue, so a full programme now costs less than the fine does. Move DSAR automation and CMP into this quarter, and start the data-flow audit in parallel.
- critical（≥2%）: Annual exposure is X% of revenue, which is high enough that the fine-tier cap is likely to be hit. Escalate to a C-level owner and legal now, and book the expected fine as a budget line rather than a risk you can wait on.

**cac（payback 4 档 + fallback）**

- ≤ 6: Your CAC pays back in X months, fast enough to compound. Keep concentrating the budget on the channel with the lowest cost per customer — payback this quick only compounds while the money stays concentrated.
- ≤ 12: CAC pays back in X months, inside the 12-month benchmark. Hold total spend steady and shift the marginal dollar toward your cheapest channel; payback this healthy improves fastest when you move weight, not when you add volume.
- ≤ 18: CAC pays back in X months, past the 12-month ideal, so every new customer ties up cash for longer than it should. Fix the channel mix before you add budget — a smaller spend that pays back faster beats a bigger spend that does not.
- > 18: CAC takes X months to pay back, long enough to strain cash flow even when the customer is worth acquiring. Cut the worst channels first and re-run this before you scale spend.
- fallback（未填 average revenue per customer）: Your CAC is $X, but without average revenue per customer there is no payback period to judge it against. Add that input to see whether acquisition recovers its cost, and break the number down by channel in the meantime — a blended average is what hides the expensive line.

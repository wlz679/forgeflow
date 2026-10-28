# P155 — AdSense「低价位内容」判定诊断 + 每周定价 bot 的 PR 步骤失败

- **日期**: 2026-10-27
- **触发**: AdSense 后台「网站」页截图（forgeflowkit.com）+ AdSense 复审详情页截图 + Search Console「Performance on Search」导出
- **性质**: 诊断 + 一项基础设施修复。**未改动任何 calc / Roadmap / Phase**（宪法要求拍板）

---

## 1. 后台状态：两个变化，一个是好的，一个不是

| 字段 | 2026-10-19（送审快照） | 2026-10-27 13:48 CST |
|---|---|---|
| 审批状态 | 需要审核 | **需要注意** |
| 状态详情 | — | **低价位内容** |
| Ads.txt 状态 | 未找到 | **已授权** ✅ |

**ads.txt 已修好。** 批次 4（`4013863`，2026-10-26 18:08）加的 `<link rel="advertising" href="/ads.txt">` 发现标签生效了 —— Google 这次找到了文件并完成授权。原先"未找到"确实是发现标签缺失，不是文件问题。

**复审结论是「低价位内容」。** 政策原文要求满足三条：

1. 提供真实、高质量的信息、工具或服务。
2. 持续精选优质内容和维护网站页面结构。
3. 能够切实引起并持续吸引用户关注。

同时页面给出两个动作：**勾选「我确认已解决相关问题」→ 申请审核**。

---

## 2. 内容厚度实测（基于 `dist/`，构建于 2026-10-26 10:07Z）——第 1 条我们满足

| 指标 | 英文 (218 页) | 中文 (218 页) |
|---|---|---|
| 静态可见正文（中位数） | 1,808 词 | 514 词元 |
| 页面特有内容占比（中位数） | **0.776** | **0.774** |
| 站点级特有内容占比 | 0.766 | 0.860 |
| 全站重复面最大的一块 | 每页顶部 ~500 词的 mega-menu（15 个类别的完整描述，438 页逐字相同） | 同 |
| 薄页 | 42 页 < 200 特有词（多为 topic / benchmark 页，非计算器页） | |

- v3 标准（6+ emoji 板块 / intro / methodology / limitations / worked example / FAQ）于 **2026-07-30（P138）** 全量上线，**复审窗口（10-19 → 10-27）看到的就是它**。
- 438 页**全部纯服务端渲染**（`astro-island` = 0），v3 板块在**静态可见正文里每页各出现一次**。
- 每页可见结构：页顶 mega-menu / 📌 intro / ⚙️ methodology（公式+变量表+领域要点）/ ⚠️ limitations（明确写「不建模什么」）/ 📋 example（带真实数字的算例）/ How to Use 6 步 / FAQ 12+ 条 / 数据来源 + 具名复核人 + 复核日期 / 页脚合规页。
- **中英对等**：中文字符总数 = 英文的 55%（中位比值 0.488）—— 这是 **CJK 字符密度**的正常结果，**不是翻译缺失**（抽样页 zh 19,736 vs en 20,550 字符）。

**⇒ 第 1 条「提供真实、高质量的信息、工具或服务」：站点是达标的。**

---

## 3. Search Console 实测（2026-07-26 → 2026-10-25，92 天）——第 3 条不达标，第 2 条有硬伤

### 3.1 总量

| 指标 | 值 |
|---|---|
| 总点击 | **20** |
| 总展示 | **9,554** |
| 平均 CTR | **0.21%** |
| 加权平均排名 | **29.6**（第 3 页） |
| 有展示的查询数 | 567 |
| 有展示的页面数 | 645（URL 行；apex 与 www 各占一行，实测 24 组重复；带/不带尾斜杠另有 56 组 ⇒ 按 pathname 聚合后 **565** 页） |
| 贡献 50% 展示的页面数 | ~~21~~ → **38**（口径更正，见下方） |
| 贡献 80% 展示的页面数 | ~~59~~ → **117**（口径更正，见下方） |
| 设备 | 桌面 18 click / 8,512 imp（pos 30.86）· 移动 2 click / 1,019 imp（pos 19.77） |

> ⚠️ **口径更正（2026-10-28）**：上面两个划掉的数字是**混用分母**算出来的 —— 分母用了**图表表**的 9,554，累加的却是**网页表**的展示（合计 13,383）。两个表本来就对不上（差 40.1%，原因未查明），拿其中一个当另一个的分母，得到的比例没有意义。
>
> 口径统一后的权威值（清单落 `src/data/priority-pages.ts`，常量写死 + 守卫钉住）：**分母 = 候选页展示合计 13,164**（398 页 = 活页 402 扣掉 4 个壳页；活页已含把 2,526 次 404 blog 展示**归并**进 301 目标页的部分）。⇒ **P1（50%）= 38 页，P80（80%）= 117 页**。

**20 次点击 / 92 天 ≈ 0.22 次点击/天。** 这就是"用户热度"的实测值。

### 3.2 排名分布（567 个有展示的查询）

| 排名区间 | 查询数 |
|---|---|
| 1–3 | 12 |
| 4–10 | 34 |
| 11–20 | 38 |
| 21–50 | 97 |
| **51+** | **386（68%）** |

**已进前 10 名的 40 个查询合计只有 149 次展示（占 1.6%），0 点击。**
⇒ 站点**被 Google 找到了**（9,554 展示），但**几乎全部排在第 3 页及以后**。CTR 0.21% 在平均排名 29.6 的位置上是正常值 —— **CTR 不是问题，排名才是**。

### 3.3 ⭐ 198 个 URL 在生产环境是硬 404（无任何重定向）

对 GSC 里全部 645 个 URL 逐个验活（HEAD→GET 跟随，12 并发）：

| 状态 | URL 数 | 合计展示 | 占比 |
|---|---|---|---|
| **200** | 447 | 10,857 | 81.1% |
| **404** | **198** | **2,526** | **18.9%** |

- 404 全部集中在 `/en/blog`（2,139 imp）与 `/zh/blog`（387 imp）—— **blog URL 面被删掉了，但 Google 索引里还留着 198 条**。
- **0 条重定向**（死链是硬 404，不是 301）。
- 其中 3 次点击来自这些死链（陈旧 SERP 条目）。
- 站点 `dist/` 里 **0 个 blog HTML**，`src/pages/[lang]/` 下只剩 `about` / `admin` / `[letter]`。

**⇒ 第 2 条「维护网站页面结构」不达标：19% 的索引展示指向死链。**

### 3.4 ⭐ 近空页在被索引并在排名

| URL | 展示 | 实际内容 |
|---|---|---|
| `/zh/history/` | 179 | 22.6 KB HTML，**可见文字仅 ~1,263 字符**（本地存储的历史记录壳页） |
| `/en/` | 230 | 首页 |
| `/zh/` | 137 | 首页 |
| `/en/ai-cost-tools/` | 369 | 分类页（nav + 分类描述） |
| `/en/saas-metrics/` | 272 | 分类页 |
| `/zh/operations-inventory/` | 176 | 分类页 |
| `/zh/marketing-analytics/` | 176 | 分类页 |

`history` / `favorites` / `recent` 是**每用户 localStorage 壳页**（"Recently Viewed (0)"、"History (0)"），**本就不该被索引**。

### 3.5 ⭐ 品牌词没排第 1

| 查询 | 展示 | 排名 |
|---|---|---|
| `forgeflowkit.com` | 142 | **31.97** |
| `site:forgeflowkit.com` | 186 | 44.87 |
| `roas calculator` | 82 | 28.05 |
| `google gemini cost` | 73 | **7.03** |

**站点自己的品牌词排第 32 位。** 根 `/` 的实测响应：**821 字节、`<meta http-equiv="refresh">` + JS 跳转、`<head>` 里没有 `<title>`、没有 canonical、没有 robots** —— 一个 200 状态但几乎无内容的页面。

### 3.6 ⭐ 198 个死链里有 196 个能一对一救回（覆盖 98.3% 展示）

映射规则（实测，100% 一致）：`/{lang}/blog/best-solopreneur-{slug}/` → `/{lang}/solopreneur-{slug}/`

- 可映射：**196 / 198**，覆盖展示 **2,482 / 2,526（98.3%）**
- 映射不到：2 个（`/en/blog/`、`/zh/blog/` 索引页本身，44 imp）
- 15 组有 2–3 个 blog 源指向同一工具页 —— 对 301 而言这是正确的（多源归一）

---

## 4. 结论

**「低价值内容 = 因为 v1 是纯计算」这个前提不成立，且「做完 2.0 灵魂改造就会好很多」的推论也不成立。**

对照政策三条：

| 政策条目 | 实测 | 结论 |
|---|---|---|
| ① 提供真实、高质量的信息、工具或服务 | 每页 1,900–3,200 词、77% 页面特有、v3 板块已上线 | **达标** |
| ② 持续精选优质内容和维护网站页面结构 | **198 个索引 URL 硬 404（19% 展示）** + history/favorites 空壳页被索引 + 根页无 title/canonical | **不达标（可修）** |
| ③ 能够切实引起并持续吸引用户关注 | **20 次点击 / 92 天**；68% 的查询排在第 5 页以后 | **不达标（长线）** |

**⇒ 判定主体是 ② 和 ③，不是 ①。**

- **② 是结构问题，1 天能修完**，而且有 2,526 次展示的实测量撑着。
- **③ 是排名问题**：站点已被 Google 收录并展示 9,554 次，但平均排名 29.6 ⇒ **加更多页面、加更多板块都不会改善平均排名，反而摊薄权重**。真实杠杆是「让已有页面在已有查询上往前挪」+「把 19% 死链的权重救回来」+「品牌词排第 1」。
- **2.0 灵魂改造仍然值得做，但落点必须重定**：从「437 页各加板块」改成「**只投给贡献 80% 展示的页面**」，且产出必须是**页面独有的结论**（最新模型实价对比、真实行业阈值、跨引擎对比），不是模板句。**给 437 页加统一板块会把相似度推高，反而更像规模化内容滥用**（政策链接里的《适用于 Google 网页搜索的垃圾内容政策》正是这条线）。
  - ⚠️ **这个清单的数字在本轮落地方案里重算过一次**：早先写的「59 个贡献 80% 展示的页面」是**混用分母**算出来的 —— 拿**图表表**的 9,554 当分母，去累加**网页表**的展示（合计 13,383）。两个表本来就对不上（差 40.1%，原因未查明），拿其中一个当另一个的分母，得到的比例没有意义。
  - **口径统一后的权威数字**（清单落在 `src/data/priority-pages.ts`，常量写死并由守卫钉住）：
    | 量 | 值 |
    |---|---|
    | 网页表 URL 行数 | 645（apex + www 各占一行：24 组；带/不带尾斜杠另有 56 组） |
    | 按 pathname 聚合后 | **565 个页面**，展示合计 **13,383**（0 丢失） |
    | 404（已删除的 blog 面） | **179 个页面 / 2,526 次展示**，**全部**能映射到活着的目标页（0 个映射不到） |
    | 活页（含归并进来的展示） | 402 个页面 / 13,383 次展示 |
    | 壳页（noindex，排除） | 4 个页面 / 219 次展示 |
    | 候选页（分母） | **398 个页面 / 13,164 次展示** |
    | **P1（50% 展示）** | **38 个页面** |
    | **P80（80% 展示）** | **117 个页面**（10,557 次展示 = 80.2%） |
    | 117 页的构成 | 工具页 71（去重 53 个 slug）/ 分类页 19 / 主题页 22 / 首页 2 / 静态页 3 |

**是否申请重新审核**：政策页明确给了「解决该问题后可以申请审核」的入口。**建议先做 §3.3 / §3.4 / §3.5 的结构修复，再勾选申请** —— 现在勾"已解决"不成立；且这批修复同时救回 2,526 次展示与品牌词排名，是**同一批改动两处收益**。

**诚实边界**：即使全部修好，0.22 次点击/天的流量也很难支撑有意义的广告收入。**「通过审核」和「有广告收入」是两件事**，前者可达（结构修好后有实据可陈），后者是长线。

---

## 5. 维度 3 scan 声明

按宪法要求，本次诊断基于以下市场信号：

- **信号 A（AdSense 后台）**：2026-10-27 13:48 CST 状态从「需要审核」变为「需要注意 / 低价位内容」，Ads.txt 从「未找到」变为「已授权」；政策原文三条 + 「申请审核」入口。
- **信号 B（Search Console 实测）**：92 天 9,554 展示 / 20 点击 / CTR 0.21% / 加权排名 29.6；386/567 查询排 51+；645 个索引 URL 中 198 个硬 404。
- **信号 C（渲染层实测）**：438 页 `astro-island` = 0 ⇒ v3 决策内容确实进静态正文，不需要"要不要改成 SSR"这类工程决策。
- **信号 D（重复面实测）**：每页 ~500 词的 mega-menu 在 438 页逐字重复，是全站单一最大重复块；AI cost 页静态正文另有一块 "Cost Comparison (137 Models)" 的大列表。
- **信号 E（模型市场信号）**：LiteLLM 上线 `openai/gpt-6.1-terra`（2026-10-27 实测抓到），bot 下次同步会收进**静态表**，但 `popularKeys` 是手工白名单 ⇒ **进不了交互态**（数据集 244 个模型 vs 交互态 44 个）。
- **信号 F（GitHub 平台行为）**：2026-10-26 的 schedule run 里 bot 分支推送成功但 PR 数量为 0，说明 GITHUB_TOKEN 建 PR 这一环被拒（原因待取证，见 §7）。

---

## 6. 决策点（等用户拍板，AI 不擅自改 Roadmap / Phase）

| # | 决策 | 说明 |
|---|---|---|
| D1 | **结构修复要不要现在做** | 198 个 404 → 301（救回 2,526 展示 + 2,482 权重）；history/favorites/recent 加 noindex；根页补 title/canonical 或改成真语言落地页 |
| D2 | **2.0 灵魂改造的落点重定** | 从「437 页各加板块」改成「只投给**贡献 80% 展示的页面**（实测 P80 = 117 页，其中工具页 71 个 / 53 个 slug）+ 页面独有结论」。这是**改 Roadmap**，必须拍板 |
| D3 | **§5.2 模型集统一 / `gpt-6.1-terra` 是否进交互态** | 数据集 244 vs 交互 44；新旗舰只进静态表会继续加厚最厚页 |
| D4 | **申请重新审核的时机** | 建议结构修复落地后再申请（政策原文要求"解决该问题后"） |
| D5 | **Phase 2 A·B·C / L5 大小写语义** | 仍在等拍板；AdSense 为它们加了一个"变现受阻"的高优先级驱动 |

---

## 7. 同期修复：每周定价 bot 的 "Open or update Pull Request" 步骤

### 7.1 定位（不靠猜）

GitHub API 匿名可读，实测：

- `chore/pricing-sync` 分支**存在**，head `092add0`，父提交 = master 的 `4013863` ⇒ **领先 master 1 个提交**（差异只有 `src/data/ai-pricing.json` 1 行）⇒ 不是"没有可提的提交"。
- `head=wlz679:chore/pricing-sync` 的 **PR 数量 = 0** ⇒ `gh pr create` **没有建出 PR**。
- 仓库历史上只有 2 个 PR（2026-06，均为人工创建且已关闭）⇒ **bot 从未成功建过 PR**。
- job 权限：`contents: write` + `pull-requests: write` **都在** ⇒ 不是 token 作用域缺失。

### 7.2 旧写法有两处结构缺陷

1. `gh pr view "$BOT_BRANCH" ... 2>/dev/null` —— **stderr 被直接丢掉**。gh 的真实报错（403 / 权限 / 配额 / 参数错）一行都不会出现在任何地方，只剩一个裸的 `exit code 1`。
2. 用 `gh pr view` 的**退出码**当"有没有 PR"的判据 —— gh 在"没有 PR"和"API 拒绝访问"两种情况下的退出码无法区分 ⇒ "API 报错"会被误判成"没有 PR"，继而走进 `gh pr create`，再撞一次墙。

**这也解释了为什么这次排查取不到日志**：job log 需要登录态（GitHub 未认证访问返回 403），公开 API 只能证明"分支推了、PR 没建"。

### 7.3 修法

- 诊断写进 **job summary**（Actions 页面直接可见，不需要读 log）：`gh auth status` + `repos/$REPO/actions/permissions` + `repos/$REPO/actions/permissions/workflow`（后者的 `can_approve_pull_request_reviews` 正是"仓库是否允许 GITHUB_TOKEN 建 PR"的那个开关）。
- 存在性判定改用 **API 列表** `pulls?state=open&head=owner:branch`（空数组 = 没有 PR，非零退出 = API 真的报错）。
- 创建/更新后**用 API 回读确认** PR 真的可见，确认不了就非零退出。
- 创建失败时**留下人工可点的 compare 链接** —— 分支已经推了，一周一次的定价增量不该因为建不了 PR 而静默丢掉。

### 7.4 守卫

`tests/sync-pricing-pr-step-guard.test.ts`（source-only，7 条断言）钉住上面 5 条性质。变异台子 **7/7 KILLED**，还原后 sha256 逐字节一致。

> 变异台子抓到守卫自己的两个漏洞：
> 1. 第一版只查 `VERIFY_URL` 这个标识符，删掉赋值行、只留 `if [ -z "$VERIFY_URL" ]` 时仍然恒绿。已改成断**读取动作本身**。
> 2. 第一版把 `head` 过滤写成 `owner/repo:branch`。**实测真实 API 不报错**，两种写法都返回 HTTP 200 + 空数组，即错误写法**静默声称"永远没有 PR"**。已改用 `$GITHUB_REPOSITORY_OWNER`，并单列一条断言钉住。

---

## 8. 验证

- 工作流 YAML 可解析（11 steps）；PR 步骤脚本 `bash -n` 语法通过；守卫 7/7 绿；变异台子 7/7 杀 + 逐字节还原。
- 本地 CI 模式全量：**243 套件 / 1414 断言 / 0 失败 / 0 跳过**（exit 0）。
- AGENTS.md 套件计数同步：**51 build-dep + 192 source-only = 243**（新增 1 个 source-only 守卫），并新增 **CI Automation** 维度（第 9 个维度）。
- GSC 结论的每个数字都可复算：645 URL 逐个验活、436 页内容厚度、语言分组 df、博客→工具页映射。

---

## 9. 结构修复的落地方案：三个坑，每一个都差点静默上线

用户 2026-10-28 拍板：**结构修复三项全做**（① 196 个 blog URL → 301 回工具页；② 壳页 noindex + 移出 sitemap；③ 根页补 title/canonical/hreflang/可见内容），**2.0 落点重定**，修复合并上线后再申请复审。**不碰任何 calc 正文，只动 URL 与索引规则。**

实现过程中有三个坑。它们的共同形状是：**构建 exit 0、测试全绿、线上却是坏的** —— 也就是说，任何只盯"构建成功"的门禁都看不见它们。

### 9.1 坑一：`_redirects` 对 Pages Function 处理的请求不生效

Cloudflare 官方文档（[Redirects](https://developers.cloudflare.com/pages/configuration/redirects/)）原文：

> Redirects defined in the `_redirects` file are **not applied to requests served by Pages Functions**, even if the Function route matches the URL pattern. If your Pages application uses Functions, you must migrate any behaviors from the `_redirects` file to the code in the appropriate `/functions` route, or **exclude the route from Functions**.

本站 `dist/_routes.json` 是 `"include": ["/*"]` ⇒ 所有请求都归 Function ⇒ `_redirects` 里的规则**永远不会被执行**。文档给的两条出路：把行为搬进 Function，或把路由从 Function 里 exclude 掉。**本轮选了前者**（把路由做成按需渲染，行为放 middleware）。

### 9.2 坑二：middleware 对预渲染路由不执行

第一版实现把 301 放在 `src/middleware.ts`。构建产物里 middleware **确实被打包了**（`dist/_worker.js/_astro-internal_middleware.mjs` 里能看到完整的正则与 `context.redirect(target, 301)`），但：

- Astro 的 middleware 只在**按需渲染（`prerender = false`）**的路由上于请求期运行；
- 本站是 `output: 'hybrid'` 且**所有页面都是预渲染的** ⇒ `/en/blog/*` 在站内**没有任何页面**，落进 **预渲染的** 404 路由 ⇒ middleware 根本不参与。

**实测**（`wrangler pages dev` 真 HTTP）：带 middleware 的构建对 `/en/blog/best-solopreneur-acv-calculator/` 返回 **404，且没有 Location 头**。

修法：**新增 `src/pages/[lang]/blog/[...slug].astro`，`export const prerender = false`** —— 这条路由的作用不是"渲染一个页面"，而是**把 `/blog/*` 这段 URL 面挂到 Function 上**。挂上去之后 middleware 就会跑（实测 5/5 的 301 全部正确）。

⇒ 由此多出一条**承重墙断言**：这条路由一旦被改回预渲染，301 会**静默**失效（站点变 404，但没有任何报错）。所以守卫里单列一条钉住 `export const prerender = false`。

### 9.3 坑三：sitemap 的 filter 收到的是字符串，而且异常被吞

第一版 sitemap filter：

```js
filter: (page) => !SHELL_PAGE_RE.test(new URL(page.url).pathname),
```

`@astrojs/sitemap@3.2.1` 的 `.d.ts` 写得很清楚：`filter?(page: string): boolean`；实现里是 `pageUrls.filter(filter)`，而 `pageUrls` 是 `string[]` ⇒ **`page` 是 URL 字符串，`page.url` 是 `undefined`** ⇒ `new URL(undefined)` 抛 `TypeError: Invalid URL`。

而集成对 filter 抛出的异常是这么处理的：

```js
try { pageUrls = pageUrls.filter(filter); }
catch (err) { logger.error(`Error filtering pages\n${err.toString()}`); return; }
```

⇒ **记一条 error 日志，然后直接 return —— 一个 sitemap 文件都不写。而构建照样 exit 0。**

**实测**（`dist/` 里没有 `sitemap-index.xml`，也没有 `sitemap-0.xml`），而 `public/robots.txt` 仍然写着 `Sitemap: https://forgeflowkit.com/sitemap-index.xml` ⇒ 站点对外宣称有 sitemap，实际 404。

这类失败任何"看构建退出码"的门禁都看不见 ⇒ 加了 **build-dep 守卫 `tests/sitemap-shell-page-guard`** 盯住**产物本身**（文件存在 / 壳页不在其中 / 根 URL 的 hreflang 正确），并用真实回归（把 filter 改回读 `page.url`）重建一次验证：**构建绿、守卫红**。

### 9.4 顺带修掉的两个真 bug

1. **`yt-lang` cookie 从未被设置过** —— grep 全仓库只有 `src/pages/index.astro` 一处**读取**、零处**写入** ⇒ 旧代码 `m ? m[1] : "en"` 的兜底是唯一生效的分支：**每个访客（含中文用户）都被丢进英文首页**。改成「只有访客明确选过语言才自动跳转」。
2. **`Astro.rewrite('/404')` 会 500** —— 404 路由是**预渲染**的，服务端 bundle 里没有它的 page 组件 ⇒ 实测抛 `TypeError: module.page is not a function`（`AstroPipeline.getComponentByRoute`）⇒ 未知 blog URL 返回 500。改为直接返回 404 响应体（**必须是真 404**：200 + 404 页 = soft 404，Google 会把它当正常页面索引）。

### 9.5 端到端验证

`wrangler pages dev`（Cloudflare Pages 本地模拟器，wrangler 3.114.17）打真 HTTP，**32/32 通过**：

| 组 | 断言数 | 结果 |
|---|---|---|
| A. 301 回工具页 | 8 | 5 个 URL 形态全部 301 且 Location 正确；目标页 200；未知 slug → 404；活页不被劫持 |
| B. 壳页 noindex | 6 | 6 个页面 200 且 `robots` meta 为 `noindex, follow` |
| C. 根页 | 9 | 200 + title + canonical + hreflang(en/zh/x-default) + robots + 可见 h1 + `rel="advertising"` + 无英文兜底 |
| D. sitemap | 5 | `sitemap-index.xml` / `sitemap-0.xml` 200、431 条 URL、壳页 0 条、根 URL 在其中且 hreflang 正确 |
| E. robots.txt | 1 | 仍指着 `/sitemap-index.xml` |

### 9.6 守卫

| 守卫 | 类型 | 断言 | 变异台子 |
|---|---|---|---|
| `p155-structure-fix-guard` | source-only | 24 | **25/25 KILLED** |
| `sitemap-shell-page-guard` | build-dep | 3 | 真实回归（`page.url`）重建一次：构建绿、守卫红 |

> **变异台子抓到台子自己的 3 个 bug**（值得单独记一笔，因为它们都会让结论失效）：
> 1. **每轮变异前没还原** ⇒ 变异在文件上层层叠加，后面的每一轮都带着前面几轮的破损 ⇒ 连带红越来越多，"22/25 KILLED"这种数字是假的。还原必须发生在**每一轮开头**，而且要有 sha256 逐字节校验。
> 2. **正则提取把定界符吞进去了** ⇒ 造出来的正则源变成 `/^…$/` ⇒ 永远不匹配 ⇒ 守卫红在提取上，不在实现上。
> 3. **判据写得太松**：`new\s+Response\([\s\S]*?status:\s*404` 匹配到了文件里**更早**那个响应（lang 校验的），于是把真正那个响应的状态码改成 200 也照样绿 ⇒ 必须断**具体那个响应**（`new Response(body, { status: 404 … })`）。
>
> 另有一条更根本的：**文本判据抓不到"把条件改坏"**。第一版 sitemap 守卫只查 `filter: (…) => !SHELL_PAGE_RE.test(...)` 这个**形状**，于是 §9.3 那个真实回归 100% 逃逸。修法是把那个 filter 表达式**原样取出来当函数跑一遍**（`new Function('SHELL_PAGE_RE', 'return (' + expr + ')')`）—— 行为判据，不是形状判据。

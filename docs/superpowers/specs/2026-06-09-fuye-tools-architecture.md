# 副业赚钱工具站 — 架构文档 v2

> 工具 + 内容混合型纯静态网站。面向国内副业人群，覆盖「不知道做什么 → 评估方向 → 计算收益 → 开始行动」的完整路径。

## 1. 产品定位

### 与 Solopreneur Tools 的本质区别

| | Solopreneur Tools（国外） | 副业工具箱（国内） |
|---|---|---|
| 用户阶段 | 已有方向，需要精算 | **正在探索，需要指引** |
| 用户问题 | "我的 MRR 怎么算" | **"我该做什么副业才能赚钱"** |
| 产品形态 | 30+ 纯计算器 | **评测 + 计算器 + 内容** |
| 流量入口 | 工具关键词搜索 | **内容长尾 + 工具关键词 + 测评传播** |
| 变现方式 | 仅广告 | **广告 + 渠道佣金 + 付费测评报告** |

### 用户路径

```
搜索"副业推荐"    →  副业匹配测评  →  得到 3 个推荐方向
                                        ↓
                                  平台收益对比页（小红书 vs 抖音 vs 闲鱼）
                                        ↓
                                  利润计算器（算清楚能不能赚）
                                        ↓
                                  入门指南 + 推荐工具/平台（佣金链接）
```

---

## 2. 技术架构

### 2.1 技术栈

| 技术 | 用途 |
|------|------|
| Astro 4 | 静态站点生成 |
| TypeScript 5 | 引擎 & 数据层 |
| Tailwind CSS 4 | 全站样式 |
| MDX | 内容页面（案例拆解、指南） |
| `new Function()` | 客户端计算/评分（无后端依赖） |

### 2.3 纯静态边界

所有交互都在浏览器端完成，构建时输出纯 HTML+CSS+JS：

```
用户交互（浏览器）：
  ├── 计算器：表单输入 → new Function(customFn) → 结果渲染
  ├── 测评：多步骤表单 → 打分算法 → 推荐结果页
  └── 内容页：点击切换 tab、展开/折叠、搜索过滤（纯 CSS/少量 JS）

数据更新（开发者）：
  └── 编辑 reference-data.ts → npm run build → 部署
```

---

## 3. 目录结构

```
fuye-tools/
├── package.json
├── astro.config.mjs
├── tsconfig.json
│
├── src/
│   ├── core/                          # 从 Solopreneur Tools 完整复制
│   │   └── engines/
│   │       ├── types.ts               # ToolEngine 接口（向下兼容）
│   │       ├── registry.ts            # 注册中心
│   │       └── helpers.ts             # 工具函数
│   │
│   ├── engines/                       # 20 个引擎（15 计算器 + 5 测评）
│   │   ├── index.ts
│   │   ├── calculators/               # 15 个计算器
│   │   │   ├── ecommerce-profit.ts
│   │   │   ├── ad-roi.ts
│   │   │   └── ...
│   │   └── assessments/               # 5 个测评
│   │       ├── side-hustle-matcher.ts
│   │       ├── platform-selector.ts
│   │       └── ...
│   │
│   ├── data/
│   │   ├── tools.ts                   # 20 个工具元数据
│   │   ├── categories.ts             # 7 个分类（含内容分类）
│   │   ├── reference-data.ts          # 参考数据
│   │   └── internal-links.ts          # 相关工具/内容链接
│   │
│   ├── pages/
│   │   ├── index.astro                # 首页
│   │   ├── [slug].astro               # 工具/测评页（计算器 & 测评共用）
│   │   ├── content/                   # 内容型页面
│   │   │   ├── [slug].astro           # 通用内容页模板
│   │   │   ├── platform-compare.astro  # 平台收益对比（特殊布局）
│   │   │   └── side-hustle-rankings.astro  # 副业排行榜
│   │   ├── about.astro
│   │   └── blog/
│   │       └── [slug].astro
│   │
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── SearchBar.astro
│   │   ├── ToolCard.astro             # 首页工具卡片
│   │   ├── ContentCard.astro          # 首页内容卡片
│   │   ├── ResultCard.astro           # 计算器结果卡片
│   │   ├── AssessmentResult.astro     # 测评结果组件（独立）
│   │   ├── MultiStepForm.astro        # 多步骤表单（测评用）
│   │   ├── ScoreGauge.astro           # 分数仪表盘
│   │   ├── CompareTable.astro         # 数据对比表
│   │   ├── FAQ.astro
│   │   ├── HowToUse.astro
│   │   ├── RelatedTools.astro
│   │   └── AdUnit.astro
│   │
│   ├── layouts/
│   │   └── BaseLayout.astro
│   │
│   ├── content/
│   │   ├── cases/                     # 副业案例拆解（MDX）
│   │   ├── guides/                    # 入门指南（MDX）
│   │   └── blog/                      # 博客（MDX）
│   │
│   └── styles/
│       └── global.css
│
├── public/
│   ├── favicon.svg
│   └── robots.txt
│
└── CLAUDE.md
```

---

## 4. 引擎系统

### 4.1 核心框架（src/core/engines/）

从 Solopreneur Tools 完整复制，零修改：

- `types.ts` — `ToolInput`, `ClientConfig`, `ToolEngine` 接口
- `registry.ts` — `registerEngine()`, `getEngine()`, `getAllEngines()`
- `helpers.ts` — `randomPick()`, `fillTemplate()`, `generateFromTemplates()`

### 4.2 引擎接口扩展

在原 `ToolEngine` 基础上增加一个可选字段：

```typescript
interface ToolEngine {
  slug: string;
  title: string;
  description: string;
  category: string;
  inputs: ToolInput[];
  clientConfig: ClientConfig;
  generate(inputs: Record<string, string>): string[];
  staticExamples: string[];
  faq: { q: string; a: string }[];
  howToUse: string[];

  // ⭐ 新增：引擎渲染模式（可选，默认 'calculator'）
  renderMode?: 'calculator' | 'assessment';
}
```

- `calculator` — 沿用现有 `[slug].astro` 布局：左侧表单 + 右侧结果卡片
- `assessment` — 使用新布局：顶部进度条 + 步骤表单 + 底部结果仪表盘

### 4.3 计算器引擎（模式不变）

与 Solopreneur Tools 完全相同，三种子模式：

| 子模式 | clientConfig.type | 适用场景 |
|--------|-------------------|---------|
| templates | `'templates'` | 标题生成、文案创作 |
| custom | `'custom'` | 利润计算、ROI、估值 |
| combinations | `'combinations'` | 复杂组合逻辑 |

### 4.4 测评引擎（新增）

```typescript
// 示例：副业匹配测评
const engine: ToolEngine = {
  slug: 'side-hustle-matcher',
  title: '副业方向匹配测评',
  description: '回答 8 个问题，找到最适合你的副业方向',
  category: 'A',
  renderMode: 'assessment',  // ⭐ 标记为测评模式

  // 测评不展示传统表单，inputs 用于定义评分维度
  inputs: [],  // 测评用自定义表单，不走通用 input 渲染

  clientConfig: {
    type: 'custom',
    wordPools: {},
    // 测评专用配置
    assessment: {
      // 多步骤定义
      steps: [
        {
          title: '你的基本情况',
          fields: [
            { name: 'timePerDay', label: '每天可用时间', type: 'select',
              options: ['1-2小时', '3-4小时', '5小时以上'] },
            { name: 'startBudget', label: '启动资金', type: 'select',
              options: ['0-1000元', '1000-5000元', '5000-20000元', '2万元以上'] },
          ],
        },
        {
          title: '你的技能特长',
          fields: [
            { name: 'skills', label: '已有技能（可多选）', type: 'checkbox',
              options: ['写作', '设计', '编程', '拍摄剪辑', '销售', '外语', '无特殊技能'] },
          ],
        },
        {
          title: '你的偏好',
          fields: [
            { name: 'workStyle', label: '偏好工作方式', type: 'radio',
              options: ['纯线上', '可以线下', '无所谓'] },
            { name: 'incomeGoal', label: '月收入目标', type: 'select',
              options: ['1000-3000元', '3000-8000元', '8000-20000元', '2万元以上'] },
          ],
        },
      ],
      // 评分算法（浏览器端执行）
      scoringFn: "var scores = { 自媒体创作: 0, 电商卖货: 0, ... }; /* 加权计算 */ return scores;",
      // 结果等级
      levels: [
        { range: [80, 100], title: '强烈推荐', icon: '🔥' },
        { range: [60, 79], title: '比较适合', icon: '👍' },
        { range: [0, 59], title: '可以尝试', icon: '💡' },
      ],
    },
  },

  generate(inputs) { /* 服务端示例计算 */ },
  staticExamples: [/* 服务端生成的示例结果 */],
  faq: [...],
  howToUse: [...],
};
```

**测评页面布局**：

```
┌─────────────────────────────────────────┐
│  进度条: 步骤 2/5  ████░░░░░░░░  40%    │
├─────────────────────────────────────────┤
│                                         │
│  第 2 步：你的技能特长                    │
│                                         │
│  ☐ 写作    ☐ 设计    ☐ 编程              │
│  ☐ 拍摄剪辑  ☐ 销售    ☐ 外语            │
│  ☐ 无特殊技能                            │
│                                         │
│  [上一步]              [下一步]           │
│                                         │
├─────────────────────────────────────────┤
│  完成后显示结果仪表盘：                    │
│                                         │
│         🎯 85 分                          │
│      自媒体创作 — 强烈推荐                 │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 📱 小红书博主                     │    │
│  │ 适合度: ★★★★★  投入: ¥500-2000   │    │
│  │ 预计月收入: ¥3000-15000          │    │
│  │ 上手周期: 1-3个月                │    │
│  │ [查看详细指南 →]                 │    │
│  └─────────────────────────────────┘    │
│  ...（更多推荐方向）                      │
└─────────────────────────────────────────┘
```

**测评结果的数据格式**（customFn 返回值）：

```
result[0] = "ASSESSMENT | 85 | 🔥 | 自媒体创作\n综合来看，你的写作技能和充足时间..."
result[1] = "小红书博主 | ★★★★★ | 投入¥500-2000 | 月入¥3000-15000 | 上手1-3月"
result[2] = "公众号写作 | ★★★★☆ | 投入¥0-500 | 月入¥2000-8000 | 上手1-2月"
result[3] = "闲鱼电商 | ★★★☆☆ | 投入¥1000-5000 | 月入¥3000-10000 | 上手2-4周"
result[4] = "抖音带货 | ..."
result[5] = "AI工具变现 | ..."
```

`[slug].astro` 通过检测结果是否以 `ASSESSMENT |` 开头来判断渲染模式。

---

## 5. 内容页面体系

### 5.1 内容页面分类

| 类型 | 目录 | 实现 | 数量 |
|------|------|------|------|
| 平台收益对比 | `pages/content/` | Astro 组件 + reference-data.ts | 5 页 |
| 副业案例拆解 | `content/cases/` | MDX 文件 | 10+ 篇 |
| 入门指南 | `content/guides/` | MDX 文件 | 10+ 篇 |
| 副业排行榜 | `pages/content/` | Astro 组件 + reference-data.ts | 3 页 |

### 5.2 平台收益对比页

```
┌─────────────────────────────────────────┐
│  小红书 vs 抖音 vs B站 — 副业收益对比      │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┬────────┬────────┬──────┐  │
│  │          │ 小红书  │  抖音   │ B站  │  │
│  ├──────────┼────────┼────────┼──────┤  │
│  │ 起号难度  │  ★★   │  ★★★  │ ★★★★ │  │
│  │ 变现方式  │ 广告+  │ 带货+  │ 创作 │  │
│  │          │ 带货   │ 直播   │ 激励 │  │
│  │ 千粉估值  │ ¥50-  │ ¥30-  │ ¥20- │  │
│  │          │ ¥200  │ ¥100  │ ¥80  │  │
│  │ 月入潜力  │ ¥3k-  │ ¥5k-  │ ¥2k- │  │
│  │ (万粉)   │ ¥15k  │ ¥30k  │ ¥10k │  │
│  └──────────┴────────┴────────┴──────┘  │
│                                         │
│  数据来源：公开数据 + 行业经验             │
│  更新日期：2026-06-09                     │
└─────────────────────────────────────────┘
```

纯静态实现：数据从 `reference-data.ts` 读取，构建时生成静态 HTML。

### 5.3 案例拆解（MDX）

```mdx
---
title: "宝妈兼职做小红书，月入 8000 的零基础实操"
category: "自媒体"
platform: "小红书"
investment: "¥500-2000"
monthlyIncome: "¥3000-15000"
difficulty: "★★☆☆☆"
timeToStart: "1-3个月"
---

## 背景
李女士，32岁，全职宝妈，零基础，每天只有 2-4 小时空闲时间...

## 起步阶段（第1-2周）
1. 定位：母婴 + 家居收纳
2. 账号搭建：...

## 变现阶段（第2-3个月）
- 粉丝 5000 时接到第一条广告：¥300
- ...

## 投入产出明细
| 投入项 | 金额 |
|--------|------|
| 拍摄道具 | ¥200 |
| 小红书推广 | ¥0 |
| **总收入（3个月）** | **¥8400** |
```

### 5.4 副业排行榜

```
副业赚钱潜力排行（2026年6月）

🥇 AI 工具定制     综合分 92  投入 ¥0-2000  月入 ¥5k-50k  热度 ↗↗↗
🥈 小红书博主       综合分 88  投入 ¥500-5000 月入 ¥3k-30k  热度 ↗↗
🥉 抖音短视频带货    综合分 85  投入 ¥2000-1w 月入 ¥5k-50k  热度 ↗
4   闲鱼无货源      综合分 82  ...
5   自媒体写作      综合分 80  ...
```

数据在 `reference-data.ts` 中手动维护，每月更新一次。

---

## 6. 工具分类与清单

### 分类总览

| ID | 分类名 | 内容 | 数量 |
|----|--------|------|------|
| A | 🎯 副业测评 | 匹配测试、平台选择器、收入潜力评估 | 5 个引擎 |
| B | 📱 自媒体创作 | 标题生成、选题灵感、账号估值 | 4 个引擎 |
| C | 🛒 电商卖货 | 利润计算、ROI、选品评估 | 4 个引擎 |
| D | 💼 知识付费 & 接单 | 课程定价、报价计算、税务 | 4 个引擎 |
| E | 🤖 AI 变现 | API 成本、Token 计算（可移植） | 3 个引擎 |
| F | 📊 投资理财 | 复利、定投、财务自由 | 0 个引擎（内容页为主导） |
| G | 📖 指南 & 案例 | 平台对比、案例拆解、入门指南 | 内容页 |

### 分类 A：副业测评（5 个引擎）

| # | 引擎 | slug | 模式 |
|---|------|------|------|
| 1 | 副业方向匹配测评 | `side-hustle-matcher` | assessment |
| 2 | 副业平台选择器 | `platform-selector` | assessment |
| 3 | 副业收入潜力评估 | `income-potential-estimator` | calculator |
| 4 | 副业投入产出测算 | `side-hustle-roi` | calculator |
| 5 | 副业风险评估 | `risk-assessment` | assessment |

### 分类 B：自媒体创作（4 个引擎）

| # | 引擎 | slug | 模式 |
|---|------|------|------|
| 6 | 爆款标题生成器 | `viral-title-generator` | templates |
| 7 | 选题灵感生成器 | `topic-idea-generator` | templates |
| 8 | 账号估值计算器 | `account-valuation` | calculator |
| 9 | 发布时间优化器 | `posting-time-optimizer` | calculator |

### 分类 C：电商卖货（4 个引擎）

| # | 引擎 | slug | 模式 |
|---|------|------|------|
| 10 | 电商利润计算器 | `ecommerce-profit-calculator` | calculator |
| 11 | 广告 ROI 计算器 | `ad-roi-calculator` | calculator |
| 12 | 选品评估器 | `product-evaluator` | assessment |
| 13 | 定价策略计算器 | `pricing-strategy-calculator` | calculator |

### 分类 D：知识付费 & 接单（4 个引擎）

| # | 引擎 | slug | 模式 |
|---|------|------|------|
| 14 | 课程定价计算器 | `course-pricing-calculator` | calculator |
| 15 | 自由职业报价器 | `freelance-quote-calculator` | calculator |
| 16 | 时薪换算器 | `hourly-rate-converter` | calculator |
| 17 | 项目利润 & 税务器 | `freelance-tax-profit` | calculator |

### 分类 E：AI 变现（3 个引擎）

| # | 引擎 | slug | 模式 |
|---|------|------|------|
| 18 | AI API 成本对比 | `ai-api-cost-comparison` | calculator |
| 19 | AI 绘画成本 | `ai-image-cost-calculator` | calculator |
| 20 | GPU 租用对比 | `gpu-rental-comparison` | calculator |

> 注：分类 E 可直接从 Solopreneur Tools 移植，数据改为人民币显示。

### 分类 F：投资理财（内容页主导）

不做独立引擎，以内容页为主：
- 复利计算 → 指南页内嵌小计算器
- 定投收益 → 同上
- 财务自由计算 → 同上

### 分类 G：指南 & 案例（纯内容，约 25 篇）

| 类型 | 示例 | 
|------|------|
| 平台对比（5篇） | 小红书 vs 抖音 vs B站 vs 闲鱼 vs 淘宝 — 副业收益对比 |
| 案例拆解（10篇） | 宝妈做小红书月入8k、程序员接单副业年入20w、大学生闲鱼无货源... |
| 入门指南（10篇） | 小红书从0到1教程、闲鱼无货源入门、抖音带货新手教程、AI工具变现指南... |
| 排行榜（3篇） | 副业赚钱排行、最适合上班族的副业、最适合宝妈的副业... |

---

## 7. 首页设计

首页内容混合布局：

```
┌──────────────────────────────────────────────┐
│  🧰 副业工具箱                                 │
│  找到最适合你的副业，算清楚能赚多少                 │
│                                               │
│  ┌──────────────────────────────────────┐    │
│  │  🎯 不知道做什么？先测一测              │    │
│  │  [开始副业匹配测评 →]     ⭐ 2分钟      │    │
│  └──────────────────────────────────────┘    │
│                                               │
│  ┌──────────── 热门计算器 ──────────────┐      │
│  │ [电商利润] [广告ROI] [报价计算] [时薪] │      │
│  │ [课程定价] [账号估值] [AI成本] [选品]  │      │
│  └──────────────────────────────────────┘     │
│                                               │
│  ┌──────────── 副业排行榜 ───────────────┐     │
│  │ 🥇 AI工具定制    🥈 小红书博主         │     │
│  │ 🥉 抖音带货      4. 闲鱼无货源        │     │
│  │ [查看完整排行 →]                       │     │
│  └──────────────────────────────────────┘     │
│                                               │
│  ┌──────────── 最新案例 ─────────────────┐     │
│  │ 📖 宝妈做小红书月入8k                   │     │
│  │ 📖 程序员接单年入20w                    │     │
│  │ 📖 大学生闲鱼起步两周出单               │     │
│  │ [更多案例 →]                           │     │
│  └──────────────────────────────────────┘     │
│                                               │
│  ┌──────────── 平台收益对比 ──────────────┐     │
│  │ 小红书 vs 抖音 vs B站 vs 闲鱼 vs 淘宝    │     │
│  │ [查看对比 →]                           │     │
│  └──────────────────────────────────────┘     │
└──────────────────────────────────────────────┘
```

---

## 8. 变现架构

### 8.1 变现层级

```
第一层：展示广告
  └── 所有工具页 + 内容页嵌入 AdSense/国内广告联盟

第二层：渠道佣金（核心）
  ├── 闲鱼/淘宝 — 阿里妈妈 PID 返佣
  ├── 知识星球/小报童 — 平台分销
  ├── 设计工具（Canva/稿定）— 推荐返佣
  ├── AI 工具 — API 分销链接
  └── 课程平台 — CPS 分佣

第三层：付费内容（可选）
  └── 深度测评报告 / PDF 合集 / 社群
```

### 8.2 佣金链接管理

所有外链集中在 `reference-data.ts` 统一管理：

```typescript
export const AFFILIATE = {
  xianyu: { url: 'https://...', label: '去闲鱼看看', commission: 'CPS 0.6%' },
  xiaohongshu: { url: 'https://...', label: '下载小红书', commission: '无' },
  canva: { url: 'https://...', label: '免费试用 Canva', commission: '订阅返佣' },
  // ...
};
```

内容页通过 `<AffiliateLink platform="xianyu" />` 组件渲染，换链接只改一处。

---

## 9. 参考数据（src/data/reference-data.ts）

```typescript
export const REFERENCE = {
  updated: '2026-06-09',

  // 副业排行榜
  sideHustleRankings: [
    { rank: 1, name: 'AI 工具定制', score: 92, investment: '0-2000元', income: '5k-50k/月', trend: 'up' },
    { rank: 2, name: '小红书博主', score: 88, investment: '500-5000元', income: '3k-30k/月', trend: 'up' },
    // ...
  ],

  // 平台收益对比数据
  platformCompare: {
    xiaohongshu: { difficulty: 2, incomeRange: [3000, 15000], monetization: ['广告', '带货', '知识付费'], followersValue: '50-200元/千粉' },
    douyin: { difficulty: 3, incomeRange: [5000, 30000], monetization: ['带货', '直播', '广告'], followersValue: '30-100元/千粉' },
    bilibili: { difficulty: 4, incomeRange: [2000, 10000], monetization: ['创作激励', '广告', '充电'], followersValue: '20-80元/千粉' },
    xianyu: { difficulty: 1, incomeRange: [2000, 10000], monetization: ['差价', '无货源'], followersValue: '无' },
    taobao: { difficulty: 3, incomeRange: [3000, 20000], monetization: ['差价', '广告'], followersValue: '无' },
  },

  // 自由职业市场价（时薪，人民币）
  freelanceRates: {
    developer: { junior: 150, mid: 300, senior: 500, expert: 800 },
    designer: { junior: 120, mid: 250, senior: 400, expert: 600 },
    writer: { junior: 80, mid: 200, senior: 350, expert: 500 },
  },

  // 五险一金比例（以北京为例）
  socialInsurance: {
    pension: { personal: 0.08, company: 0.16 },
    medical: { personal: 0.02, company: 0.098 },
    unemployment: { personal: 0.005, company: 0.005 },
    housingFund: { personal: 0.12, company: 0.12 },
  },

  // AI API 价格
  aiPricing: {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'claude-sonnet': { input: 3.00, output: 15.00 },
    'deepseek-chat': { input: 0.14, output: 0.28 },
  },
} as const;
```

---

## 10. 页面路由

纯中文，无 i18n，路由简洁：

```
/                                          ← 首页
/[slug]/                                   ← 工具/测评页（20 页）
  /side-hustle-matcher/                    ← 副业匹配测评
  /ecommerce-profit-calculator/            ← 电商利润计算器
  /viral-title-generator/                  ← 爆款标题生成器
  ...

/content/platform-compare/                 ← 平台收益对比
/content/side-hustle-rankings/             ← 副业排行榜

/cases/[slug]/                             ← 案例拆解（10+ 篇）
  /cases/mom-xiaohongshu-8k/
  /cases/programmer-freelance-200k/
  ...

/guides/[slug]/                            ← 入门指南（10+ 篇）
  /guides/xiaohongshu-from-zero/
  /guides/xianyu-no-inventory/
  ...

/blog/[slug]/                              ← 博客

/about/                                    ← 关于
```

**构建产物**：约 80-100 个 HTML 页面。

---

## 11. 品牌设计

### 配色

```css
--color-brand: #F97316;           /* 橙色主色 — 财富、活力 */
--color-brand-dark: #EA580C;      /* 深橙 */
--color-brand-light: #FFF7ED;     /* 浅橙背景 */
--color-success: #059669;         /* 绿色 — 收益/增长 */
--color-warning: #D97706;         /* 黄色 — 风险提示 */
--color-text: #1F2937;            /* 深灰文字 */
--color-bg: #FAFAFA;              /* 背景 */
```

### Logo

橙色 ¥ 符号 + 小齿轮，寓意「搞钱工具」。`public/favicon.svg`。

### 品牌名

推荐：**副业工具箱** 或 **搞钱工具箱**

---

## 12. 组件改造清单

`[slug].astro` 是唯一需要较大改动的文件：根据 `engine.renderMode` 切换布局。

```astro
// [slug].astro 伪代码
const engine = getEngine(slug);
const isAssessment = engine.renderMode === 'assessment';

if (isAssessment) {
  // 渲染 MultiStepForm + AssessmentResult 组件
} else {
  // 沿用现有计算器布局
}
```

其余组件改动很小——把 `t()` 调用替换为直接写中文即可。

---

## 13. 与 Solopreneur Tools 的差异总结

| 维度 | Solopreneur Tools | 副业工具箱 |
|------|-------------------|-----------|
| 产品形态 | 纯计算器站 | **计算器 + 测评 + 内容站** |
| 引擎类型 | calculator 一种 | calculator + assessment 两种 |
| 工具数量 | 32 款引擎 | 20 款引擎（15计算器 + 5测评） |
| 内容页 | 仅博客 | 平台对比 + 案例拆解 + 指南 + 排行榜 + 博客 |
| 语言 | 中英双语 | 纯中文 |
| 路由 | `/[lang]/[slug]` | `/[slug]` |
| i18n | `src/i18n/` | 无 |
| 品牌色 | 紫色 #7C3AED | **橙色 #F97316** |
| 变现 | 仅广告 | 广告 + **渠道佣金** |
| 构建页数 | ~141 页 | ~80-100 页 |
| 核心框架 | `src/core/engines/` | **完全复用** |

---

## 14. 开发顺序

```
Phase 1: 项目初始化（1天）
  ├── 复制 Solopreneur Tools
  ├── 删除所有引擎 + i18n
  ├── 改造组件去 i18n
  ├── 改品牌色 + Logo
  └── 简化路由 [lang]/[slug] → [slug]

Phase 2: 核心引擎（3-4天）
  ├── 写 15 个计算器引擎
  └── 写 5 个测评引擎（含 MultiStepForm + AssessmentResult 组件）

Phase 3: 内容页面（2天）
  ├── 平台收益对比页
  ├── 副业排行榜页
  └── 内容页模板 + 首批 5 篇案例

Phase 4: 首页 & 发布（1天）
  ├── 新首页（工具+内容混合布局）
  └── 构建验证 + 部署
```

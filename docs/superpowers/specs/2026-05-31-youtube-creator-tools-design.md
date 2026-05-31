# YouTube Creator Tools — 设计文档

## 1. 项目概述

**定位：** 面向 YouTube 创作者的免费工具集合网站，通过 Google AdSense 变现。核心流量来源为 SEO 自然搜索（Google）。覆盖 YouTube 创作全流程，包含 30 个工具，按 6 大分类组织。

**语言：** 仅英文（MVP 阶段）。

**成功指标：** Google Search Console 收录状态、关键词排名、AdSense 展示量/收入。

## 2. 技术栈

| 层级 | 选型 | 理由 |
|------|------|------|
| 框架 | Astro（SSG 静态生成） | 纯静态 HTML，零 JS 开销，Lighthouse 95+ |
| 样式 | Tailwind CSS | 原子化 CSS，打包体积小 |
| 交互 | 原生 JavaScript | 轻量，简单交互无需框架 |
| 分析 | Google Search Console | 无需页面改代码 |
| 变现 | Google AdSense | 首页、工具页、Blog 页嵌入广告 |
| 部署 | Cloudflare Pages（或 Vercel） | 免费套餐，全球 CDN 加速 |

## 3. 内容生成引擎

所有 30 个工具采用**纯前端规则引擎**——不调用任何 AI API。

- 模板数据库（句式结构、形容词库、关键词池）
- 规则生成（从加权词池随机抽取、格式组合）
- 每个工具页预渲染静态示例结果（供爬虫抓取，SEO 内容）
- 用户输入触发浏览器端 JS 即时生成（零延迟、零成本）

## 4. URL 结构

扁平结构，关键词直接出现在 URL 路径中（无 `/tools/` 前缀）：

```
/
/blog/
/blog/best-youtube-title-generator          （每个工具对应 1 篇 Blog，共 30 篇）
/youtube-title-generator
/youtube-tag-generator
/youtube-cpm-revenue-calculator
/about
/contact
/privacy-policy
/terms
```

路径越短，关键词越靠前，SEO 信号越强。

## 5. 页面架构（共 66 页）

### 5.1 首页（1 页）
- 搜索框（按工具名称筛选）
- 6 大分类区块（A–F），每区块展示对应工具卡片
- 3 个 AdSense 广告位（Hero 下方、页面中部、Footer 上方）
- Footer 包含法律页面链接

### 5.2 工具页（30 页）
统一模板，每个工具页包含：
1. 工具名称 + 简短描述（H1）
2. 输入区（1–3 个字段）+ Generate 按钮
3. 结果卡片——每条带独立 Copy 按钮 + Copy All 按钮
4. 预渲染静态示例结果（不依赖 JS，SEO 可抓取）
5. How to Use 使用说明（分步骤）
6. FAQ 区（手风琴折叠，4–6 个问题）
7. Related Tools（4–5 个同类工具内链）
8. AdSense 广告位（结果区或 FAQ 下方）

### 5.3 Blog 列表页（1 页）
- 30 篇文章列表，按分类分组
- 按工具名搜索/筛选
- AdSense 广告位

### 5.4 Blog 文章页（30 页）
模板化生成，每篇约 500 词。固定结构：
1. 标题："Best [工具名] for YouTube Creators (2026)"
2. 什么是 [工具名]？
3. 为什么 YouTuber 需要它
4. 如何使用这个工具（分步骤）
5. 技巧与最佳实践
6. CTA → 链接到对应工具页
7. 相关工具链接
8. AdSense 广告位

### 5.5 法律页面（4 页）
- Privacy Policy（AdSense 要求）
- Terms & Conditions
- About
- Contact

## 6. 工具页布局

**桌面端：** 双栏布局
- 左栏：工具标题 + 输入字段 + FAQ
- 右栏：结果卡片 + Related Tools

**移动端：** 单栏，全部纵向堆叠。

**从上到下顺序：**
```
[工具名称 H1]
[简短描述]
[输入框 1] [输入框 2] [输入框 3]  ← 最多 3 个字段
[Generate 按钮]
[结果区 — 卡片网格]
[每条结果带 Copy + 全部 Copy All]
[静态示例结果 — 预渲染]
[How to Use 说明]
[FAQ 折叠区]
[Related Tools 内链]
[AdSense 广告]
```

## 7. 工具分类与内部链接

### A 类：内容创意（Content Ideas）
1. YouTube Video Idea Generator
2. YouTube Trending Ideas Finder
3. YouTube Niche Ideas Generator
4. YouTube Content Planner
5. YouTube Viral Video Ideas Generator

### B 类：标题与文案（Titles & SEO Copy）
6. YouTube Title Generator
7. YouTube Clickbait Title Generator
8. YouTube Description Generator
9. YouTube Hook Generator
10. YouTube Script Generator

### C 类：Shorts 增长（Shorts Growth）
11. YouTube Shorts Idea Generator
12. YouTube Shorts Hook Generator
13. YouTube Shorts Caption Generator
14. YouTube Shorts Title Generator
15. YouTube Shorts Hashtag Generator

### D 类：SEO 优化（SEO Optimization）
16. YouTube Tag Generator
17. YouTube Hashtag Generator
18. YouTube Keyword Generator
19. YouTube SEO Title Analyzer
20. YouTube Video SEO Checklist Tool

### E 类：缩略图优化（Thumbnail Optimization）
21. YouTube Thumbnail Text Generator
22. YouTube Thumbnail Idea Generator
23. YouTube Thumbnail CTR Optimizer
24. YouTube Thumbnail A/B Title Tester
25. YouTube Thumbnail Emotion Generator

### F 类：频道增长（Channel Growth）
26. YouTube Channel Name Generator
27. YouTube Channel Description Generator
28. YouTube Upload Time Optimizer
29. YouTube CPM Revenue Calculator
30. YouTube Growth Score Analyzer

### 内链规则
- 每个工具页链接到 4–5 个同类工具 + 跨分类相关工具
- 每篇 Blog 文章链接到对应工具页 + 3 篇相关 Blog
- 首页链接到全部 30 个工具 + 所有分类锚点
- Footer 链接到所有法律页面

## 8. 设计系统

**风格：** 极简 SaaS，移动端优先。

**配色：**
- 背景：白色 #FFFFFF
- 正文：近黑 #111827
- 主色：蓝灰 #374151 / #4B5563
- 强调色：红色 #DC2626——按钮、链接、图标（YouTube 品牌联想）
- 边框：浅灰 #E5E7EB

**字体：**
- 系统字体栈（设备原生字体，零加载时间）
- 字号：正文 14px，H1 24px，H2 18px，H3 16px

**断点：**
- 移动端：< 640px（单栏）
- 桌面端：>= 768px（工具页双栏）

## 9. SEO 策略

### 每个工具页的关键词覆盖
- 1 个主关键词（出现在 H1、URL、meta title、meta description）
- 3–5 个次要关键词（出现在 FAQ、H2、正文）
- 5–10 个长尾关键词（出现在 FAQ 回答、使用场景举例）

### 示例 — Title Generator：
| 类型 | 关键词 |
|------|--------|
| 主关键词 | `youtube title generator` |
| 次要关键词 | `catchy youtube titles`、`viral youtube title ideas`、`best youtube titles for gaming`、`seo youtube titles` |
| 长尾关键词 | `how to write youtube titles that get views`、`youtube title generator for gaming`、`best title generator for youtube creators`、`free youtube title maker`、`youtube video title ideas generator` |

### 全局 SEO
- sitemap.xml（Astro 自动生成）
- robots.txt
- Schema.org 结构化数据：工具页标记 `SoftwareApplication`，FAQ 区标记 `FAQPage`，全站 `BreadcrumbList`
- Meta 标签：title ≤ 60 字符，description ≤ 150 字符，og:image
- 所有页面均为预渲染静态 HTML（爬虫无需 JS 即可获取完整内容）

## 10. AdSense 广告位

| 位置 | 广告单元 | 优先级 |
|------|----------|--------|
| 首页 Hero 下方 | 横幅（728×90 或自适应） | 高 |
| 首页中部（C 类之后） | 信息流广告 | 中 |
| 首页 Footer 上方 | 横幅 | 中 |
| 工具页结果下方 | 矩形（300×250 或自适应） | 高 |
| Blog 文中 | 文章内嵌广告 | 高 |
| Blog 文末 | 矩形 | 中 |

使用自适应 AdSense 单元。每页不超过 3 个广告（AdSense 政策限制）。

## 11. MVP 不做
- 多语言支持
- 用户账号/登录
- Google Analytics（推后）
- AI/API 接入（全部为规则引擎）
- Instagram/TikTok 工具
- 付费/高级工具
- 用户提交内容
- 数据库或后端服务器

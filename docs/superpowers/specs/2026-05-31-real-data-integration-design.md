# 真实数据接入 — 设计文档

**日期：** 2026-05-31 | **状态：** 草稿

## 概述

当前 31 个 YouTube 创作者工具均使用写死的模板和词库生成内容。本设计定义了一条每周数据管道，从 YouTube Data API 和 Google Trends（均为免费）拉取真实趋势数据，为约 19 个工具提供动态词库，其余工具保持模板兜底，待后续有条件时增强。

## 数据流

```
每周一凌晨 3 点（GitHub Actions 定时触发）
         │
         ▼
┌─────────────────────────┐
│ YouTube Data API v3     │  拉取 15 个分类各 50 条热门视频
│ 免费配额：10,000/天      │  → 提取趋势词、热门创作者、高频关键词
└───────────┬─────────────┘
            │
┌───────────┴─────────────┐
│ Google Trends           │  对预定义的细分领域关键词
│ 非官方社区库             │  → 提取搜索上升趋势词
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ scripts/update-data.ts  │  合并、去重、提取结构化数据
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ src/data/pools/         │  trends.json、experts.json、
│                         │  keywords.json、search-trends.json、
│                         │  metadata.json
└───────────┬─────────────┘
            │
      ┌─────┴─────┐
      ▼           ▼
  git push    Astro 构建（SSG）
  → 触发部署    构建时读取数据池
               烘焙进静态页面
```

### 关键设计决策

- **构建时读取，非运行时请求。** 数据池在 Astro 构建阶段被读入，烘焙为静态 HTML。用户端零额外延迟，无运行时 API 调用。对 SEO 无影响。
- **失败时兜底。** 如果 API 拉取失败或返回空数据，脚本保留上次成功的 JSON。网站不会因数据更新失败而中断。
- **每次运行消耗约 500-1500 配额单位。** 免费配额每天 10,000，即使日更也绰绰有余。选择周更是因为 YouTube 趋势日际变化不大，没必要每天构建一次。

## 数据池定义

### 数据池 1：`trends.json`
**来源：** YouTube Data API `/videos?chart=mostPopular`，遍历 15 个分类  
**提取方式：** 热门视频标题 → 分词（按空格/标点切开、转小写）→ 过滤英文停用词 → 词频排序  
**数据结构：**
```json
{
  "topics": ["trending topic 1", "trending topic 2", ...],   // 取前 30
  "updated": "2026-06-02T03:00:00Z"
}
```
**供给工具：** YouTube 视频创意生成器、热门创意发现器、细分领域创意生成器、爆款视频创意、Shorts 创意、内容规划器、脚本生成器（共 7 个）

### 数据池 2：`experts.json`
**来源：** YouTube Data API — 热门视频对应的频道名  
**提取方式：** 从热门视频列表提取频道名 → 去重 → 按出现频率排序  
**数据结构：**
```json
{
  "creators": ["Creator A", "Creator B", ...],   // 取前 20
  "updated": "2026-06-02T03:00:00Z"
}
```
**供给工具：** 钩子生成器、标题生成器、标题党生成器、描述生成器、缩略图创意/文字/情绪生成器（共 7 个）

### 数据池 3：`keywords.json`
**来源：** YouTube Data API — 热门视频标题的 n-gram（2-3 词组合）频率  
**提取方式：** 从热门视频标题提取 bigram/trigram → 去重 → 词频排序  
**数据结构：**
```json
{
  "phrases": ["high freq phrase 1", "phrase 2", ...],   // 取前 40
  "updated": "2026-06-02T03:00:00Z"
}
```
**供给工具：** 关键词生成器、标签生成器、话题标签生成器、Shorts 标签、SEO 标题分析器（共 5 个）

### 数据池 4：`search-trends.json`
**来源：** Google Trends — 对预定义细分领域关键词查询 `interestOverTime` + `relatedQueries`  
**预定义关键词：** fitness、cooking、tech reviews、gaming、beauty、personal finance、travel、music、education、fashion  
**数据结构：**
```json
{
  "rising": [
    {"query": "rising keyword", "change": "+340%"},
    ...
  ],                                                     // 取前 30
  "updated": "2026-06-02T03:00:00Z"
}
```
**供给工具：** 关键词生成器、SEO 标题分析器、细分领域创意、热门创意发现器（共 4 个）

### 数据池 5：`metadata.json`
```json
{
  "lastUpdated": "2026-06-02T03:00:00Z",
  "youtubeCategories": 15,
  "totalVideosSampled": 742,
  "trendsCount": 30,
  "expertsCount": 20,
  "keywordsCount": 40,
  "risingQueriesCount": 30,
  "partialUpdate": false
}
```
用于页面展示"数据更新于 X 日"以及监控脚本运行状态。

## 引擎改造（约 19 个工具）

### 改造模式：数据池 + 写死兜底

```ts
// 改造前
const wordPools: Record<string, string[]> = {
  trend: ['AI-Generated Content', 'Live Streaming', ...],
  platform: ['YouTube', 'TikTok', ...],
};

// 改造后
import trends from '../../data/pools/trends.json';

const wordPools: Record<string, string[]> = {
  trend: trends.topics.length > 0
    ? trends.topics.slice(0, 20)                          // 真实数据
    : ['AI-Generated Content', 'Live Streaming', ...],    // 兜底写死
  platform: ['YouTube', 'TikTok', 'Instagram', 'Twitch'], // 保持写死
};
```

### 改造范围（Phase 2）

| 分类 | 工具 | 改动 |
|------|------|------|
| 创意生成类（7 个） | 视频创意、热门创意、细分领域、爆款创意、Shorts 创意、内容规划、脚本生成 | `wordPools` 读 `trends.json` + `experts.json` |
| 标题/描述/钩子（4 个） | 标题生成、标题党生成、描述生成、钩子生成 | `wordPools` 读 `experts.json` |
| 标签/关键词（3 个） | 标签生成、话题标签、关键词生成 | `wordPools` 读 `keywords.json` + `search-trends.json` |
| Shorts 系列（5 个） | Shorts 创意、钩子、标题、标签、字幕 | 复用对应长视频工具的数据池 |
| SEO（1 个） | SEO 标题分析器 | `wordPools` 读 `keywords.json` + `search-trends.json` |

### 暂不改动的工具（Phase 3+）

| 工具 | 不改原因 | 后续计划 |
|------|---------|---------|
| CPM 计算器 | CPM 数据无免费公开 API | 保持"行业估算"，页面标注清楚 |
| 频道增长评分 | 需要用户 OAuth 授权频道数据 | 改为更多手动输入的估算模型 |
| 最佳上传时间 | 精准观众数据需 YouTube Analytics API | 使用公开的行业经验数据表 |
| 缩略图 CTR 优化 | CTR 基准无免费的按领域公开数据 | 使用行业平均 CTR 经验表 |
| 缩略图 AB 标题测试 | 纯模板对比逻辑 | 保持模板 |
| 缩略图情绪生成 | 情绪词映射属 NLP 范畴，非 API | 保持模板 |
| 频道名称生成 | 按风格/双关生成，不依赖外部数据 | 保持模板 |
| 频道描述生成 | 描述结构模板 | 保持模板 |
| 视频 SEO 清单 | 静态清单 | 保持原样 |
| 缩略图文字生成 | 模板生成短文本 | 保持模板 |

## 脚本与自动化

### `scripts/update-data.ts`

1. 用 `YOUTUBE_API_KEY` 环境变量初始化 YouTube API 客户端
2. 遍历 15 个 categoryId，拉取 `/videos?chart=mostPopular&maxResults=50&part=snippet`
3. 收集所有标题 → 分词 → 过滤停用词 → 词频统计 → 取前 30 写入 `trends.json`
4. 收集所有频道名 → 词频统计 → 取前 20 写入 `experts.json`
5. 提取标题 bigram/trigram → 词频统计 → 取前 40 写入 `keywords.json`
6. 对 12 个预定义细分关键词查 Google Trends → 收集上升查询词 → 取前 30 写入 `search-trends.json`
7. 写入 `metadata.json`（包含统计数据）
8. 对比新旧 JSON 文件，完全相同则跳过 git commit

### `.github/workflows/update-trends.yml`

```yaml
name: 每周数据刷新
on:
  schedule: '0 3 * * 1'  # 每周一 UTC 凌晨 3 点
  workflow_dispatch:       # 支持手动触发（方便测试）

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout
      - uses: actions/setup-node
      - run: npm ci
      - run: npm run update-data
        env:
          YOUTUBE_API_KEY: ${{ secrets.YOUTUBE_API_KEY }}
      - run: |
          git config user.name "data-bot"
          git config user.email "bot@example.com"
          git add src/data/pools/
          git diff --staged --quiet || git commit -m "chore: 每周数据刷新"
          git push
```

### `package.json` 新增

```json
{
  "scripts": {
    "update-data": "tsx scripts/update-data.ts"
  }
}
```
新增 `tsx` 为 dev 依赖，用于直接运行 TypeScript 脚本而无需编译步骤。

## 前端展示

### "数据更新于" 时间展示

在 `[slug].astro` 的结果区上方：

```astro
{poolMetadata && (
  <p class="text-xs text-gray-400 mb-3">
    {t('results.data_updated', lang)} {formatDate(poolMetadata.lastUpdated, lang)}
  </p>
)}
```

新增 i18n 键：`results.data_updated` → `{ en: 'Data updated on', zh: '数据更新于' }`

仅对使用了数据池的工具展示（`poolMetadata` 由有数据池依赖的引擎注入）。

## 失败处理

| 场景 | 行为 |
|------|------|
| YouTube API 超配额 | 跳过 YouTube 部分，记录警告，只更新 Google Trends 数据，`partialUpdate` 标记为 true |
| Google Trends 请求失败 | 跳过，只更新 YouTube 数据，`partialUpdate` 标记为 true |
| 双方都失败 | 脚本正常退出（exit 0），不更新任何文件，网站使用上次成功数据构建 |
| 数据与上周相同 | 不执行 git commit，不触发部署 |
| 构建时 JSON 文件缺失 | 引擎回退到写死的 `wordPools`，网站与原有一致 |

## 实施步骤

### Phase 1：搭建数据管道

1. 安装 `tsx` dev 依赖，新增 `npm run update-data` 脚本
2. 创建 `scripts/update-data.ts`
3. 创建 `src/data/pools/` 目录，初始化空 JSON（种子数据使用当前写死值）
4. 创建 `.github/workflows/update-trends.yml`
5. 在 GitHub Secrets 中配置 `YOUTUBE_API_KEY`
6. 本地手动运行一次，验证 JSON 数据质量
7. 等第一个周一自动运行，验证端到端流程

### Phase 2：引擎接入

1. 改造约 19 个引擎文件，从数据池读取并保留写死兜底
2. 工具页增加"数据更新于 X 日"展示
3. 新增 i18n 翻译键
4. 全量构建验证 — 确保所有工具在有/无数据池情况下均正常生成

### Phase 3：持续优化

1. 观察数周数据质量，调整分词和停用词策略
2. 如有必要，扩展 Google Trends 查询关键词列表
3. 探索其他免费数据源（Reddit API、RSS 订阅等）
4. 逐步将 Phase 3 工具从写死模板替换为数据驱动模型

## 风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| YouTube API 配额调整或缩减 | 低 | 中 | 目前仅用配额的 5-15%；可减少分类数或频率 |
| Google Trends 非官方库失效 | 中 | 低 | 仅影响 2 个工具；YouTube 数据不受影响 |
| API 数据质量差（标题含大量无意义内容） | 中 | 中 | 写死兜底确保结果不比现在差 |
| GitHub Actions 运行失败 | 低 | 低 | 保留上次成功数据，网站正常构建部署 |

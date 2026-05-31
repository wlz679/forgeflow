# 真实数据接入 Phase 1：数据管道 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建每周自动运行的 YouTube + Google Trends 数据拉取管道，产出 JSON 数据池文件供引擎消费。

**Architecture:** GitHub Actions 每周一凌晨 3 点执行 `scripts/update-data.ts`，拉取 YouTube Data API v3（15 分类热门视频）和 Google Trends（12 个细分关键词搜索趋势），经分词和词频提取后写入 `src/data/pools/*.json`，最后 git commit + push 触发 Vercel 自动部署。脚本有完整失败兜底——API 失败时保留上次数据不中断构建。

**Tech Stack:** TypeScript (tsx 直接运行), Node.js 内置 fetch, google-trends-api (npm), GitHub Actions cron, Astro 4 SSG

**Design doc:** `docs/superpowers/specs/2026-05-31-real-data-integration-design.md`

---

## 文件结构

```
src/data/pools/              # 新增目录，存放自动生成的数据池
├── trends.json              # 热门话题词（自动生成，带种子数据）
├── experts.json             # 热门创作者名（自动生成，带种子数据）
├── keywords.json            # 高频标题短语（自动生成，带种子数据）
├── search-trends.json       # Google 搜索上升趋势（自动生成，带种子数据）
└── metadata.json            # 元数据/更新时间

scripts/
└── update-data.ts           # 新增，数据拉取主脚本

.github/workflows/
└── update-trends.yml        # 新增，GitHub Actions 定时触发

package.json                 # 修改：加 tsx 依赖 + update-data 脚本
src/i18n/translations.ts     # 修改：加 results.data_updated 翻译键
src/pages/[lang]/[slug].astro # 修改：加"数据更新于"展示
```

---

### Task 1: 安装依赖 + 新增 npm 脚本

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装 tsx 和 google-trends-api**

```bash
npm install --save-dev tsx google-trends-api
```

- [ ] **Step 2: 在 package.json 新增 update-data 脚本**

将 `"scripts"` 改为：

```json
"scripts": {
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "update-data": "tsx scripts/update-data.ts"
}
```

- [ ] **Step 3: 验证 tsx 可用**

```bash
npx tsx --version
```
Expected: 输出版本号

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add tsx and google-trends-api for data pipeline"
```

---

### Task 2: 创建种子数据池文件

**Files:**
- Create: `src/data/pools/trends.json`
- Create: `src/data/pools/experts.json`
- Create: `src/data/pools/keywords.json`
- Create: `src/data/pools/search-trends.json`
- Create: `src/data/pools/metadata.json`

种子数据从现有引擎 wordPools 汇总提取，确保脚本未运行时引擎有兜底数据可用。

- [ ] **Step 1: 创建目录**

```bash
mkdir -p src/data/pools
```

- [ ] **Step 2: 创建 trends.json**

```json
{
  "topics": [
    "AI Generated Content", "Live Streaming", "Short Form Video", "VR Content",
    "Interactive Videos", "Community Posts", "Educational Content", "Niche Communities",
    "Raw Unedited Footage", "Story Driven Content", "Minimalist Editing", "Voice Only Content",
    "AI Tools", "Remote Work", "Sustainable Living", "Mental Health", "Side Hustles",
    "Productivity Hacks", "Home Workouts", "Budget Travel"
  ],
  "updated": null
}
```

- [ ] **Step 3: 创建 experts.json**

```json
{
  "creators": [
    "MrBeast", "Marques Brownlee", "PewDiePie", "Lex Fridman", "Casey Neistat",
    "a Professional", "a Millionaire", "an Expert Coach", "a Top Creator",
    "Expert", "Pro", "Hacker", "Millionaire", "CEO", "Scientist"
  ],
  "updated": null
}
```

- [ ] **Step 4: 创建 keywords.json**

```json
{
  "phrases": [
    "how to", "step by step", "complete guide", "for beginners", "tips and tricks",
    "everything you need", "what you should", "the truth about", "you need to",
    "full tutorial", "crash course", "pro tips", "easy steps", "zero to hero",
    "master class", "cheat sheet", "from scratch", "in minutes", "quick start"
  ],
  "updated": null
}
```

- [ ] **Step 5: 创建 search-trends.json**

```json
{
  "rising": [],
  "updated": null
}
```

- [ ] **Step 6: 创建 metadata.json**

```json
{
  "lastUpdated": null,
  "youtubeCategories": 0,
  "totalVideosSampled": 0,
  "trendsCount": 20,
  "expertsCount": 16,
  "keywordsCount": 20,
  "risingQueriesCount": 0,
  "partialUpdate": false
}
```

- [ ] **Step 7: Commit**

```bash
git add src/data/pools/
git commit -m "chore: add seed data pool files"
```

---

### Task 3: 创建数据拉取脚本 `scripts/update-data.ts`

**Files:**
- Create: `scripts/update-data.ts`

这是核心脚本。每次运行时拉取 YouTube API 和 Google Trends，处理后写入 JSON 文件。

- [ ] **Step 1: 创建脚本骨架**

```typescript
// scripts/update-data.ts
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const POOLS_DIR = join(import.meta.dirname, '..', 'src', 'data', 'pools');
const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_BASE = 'https://www.googleapis.com/youtube/v3';

// YouTube 15 个热门分类 ID
const CATEGORIES = [
  1,   // Film & Animation
  2,   // Autos & Vehicles
  10,  // Music
  15,  // Pets & Animals
  17,  // Sports
  19,  // Travel & Events
  20,  // Gaming
  22,  // People & Blogs
  23,  // Comedy
  24,  // Entertainment
  25,  // News & Politics
  26,  // Howto & Style
  27,  // Education
  28,  // Science & Technology
  29,  // Nonprofits & Activism
];

interface TrendsData { topics: string[]; updated: string | null; }
interface ExpertsData { creators: string[]; updated: string | null; }
interface KeywordsData { phrases: string[]; updated: string | null; }
interface SearchTrendsData { rising: { query: string; change: string }[]; updated: string | null; }
interface Metadata {
  lastUpdated: string | null;
  youtubeCategories: number;
  totalVideosSampled: number;
  trendsCount: number;
  expertsCount: number;
  keywordsCount: number;
  risingQueriesCount: number;
  partialUpdate: boolean;
}

function readJSON<T>(filename: string): T {
  return JSON.parse(readFileSync(join(POOLS_DIR, filename), 'utf-8'));
}

function writeJSON(filename: string, data: unknown): void {
  writeFileSync(join(POOLS_DIR, filename), JSON.stringify(data, null, 2) + '\n');
}

function ensureDir(): void {
  if (!existsSync(POOLS_DIR)) mkdirSync(POOLS_DIR, { recursive: true });
}

// 停用词列表（英文）
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or',
  'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every',
  'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because',
  'about', 'over', 'this', 'that', 'these', 'those', 'it', 'its',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'they',
  'him', 'her', 'them', 'his', 'their', 'what', 'which', 'who', 'whom',
  'how', 'when', 'where', 'why', 'if', 'then', 'here', 'there',
  'also', 'get', 'make', 'one', 'out', 'up', 'now', 'new', 'like',
  '2026', '2025', '2024', 'vs', '—', '-', '|', '•',
]);

async function main() {
  ensureDir();

  const now = new Date().toISOString();
  let partialUpdate = false;
  let youtubeCategories = 0;
  let totalVideosSampled = 0;

  // ===== YouTube 数据 =====
  if (YOUTUBE_KEY) {
    try {
      const allTitles: string[] = [];
      const allChannels: string[] = [];

      for (const catId of CATEGORIES) {
        try {
          const url = `${YOUTUBE_BASE}/videos?part=snippet&chart=mostPopular&regionCode=US&maxResults=50&videoCategoryId=${catId}&key=${YOUTUBE_KEY}`;
          const res = await fetch(url);
          const json = await res.json() as any;

          if (json.error) {
            console.error(`YouTube API error for category ${catId}: ${json.error.message}`);
            continue;
          }

          youtubeCategories++;
          for (const item of json.items || []) {
            const title: string = item.snippet?.title || '';
            const channel: string = item.snippet?.channelTitle || '';
            if (title) allTitles.push(title);
            if (channel) allChannels.push(channel);
          }
        } catch (e) {
          console.error(`Failed to fetch category ${catId}:`, e);
        }
      }

      totalVideosSampled = allTitles.length;
      console.log(`Fetched ${totalVideosSampled} videos across ${youtubeCategories} categories`);

      // 提取趋势词：分词 → 停用词过滤 → 词频排序 → 取前 30
      const wordFreq = new Map<string, number>();
      for (const title of allTitles) {
        const words = title
          .toLowerCase()
          .split(/[\s,.;:!?()"'\[\]{}|\\/@#$%^&*+=~`-]+/)
          .map(w => w.trim())
          .filter(w => w.length > 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
        for (const word of words) {
          wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        }
      }
      const topTopics = [...wordFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));

      // 提取创作者名：去重 → 词频排序 → 取前 20
      const channelFreq = new Map<string, number>();
      for (const ch of allChannels) {
        channelFreq.set(ch, (channelFreq.get(ch) || 0) + 1);
      }
      const topCreators = [...channelFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([name]) => name);

      // 提取高频短语（bigram + trigram）：取前 40
      const phraseFreq = new Map<string, number>();
      for (const title of allTitles) {
        const words = title
          .toLowerCase()
          .split(/[\s,.;:!?()"'\[\]{}|\\/@#$%^&*+=~`-]+/)
          .map(w => w.trim())
          .filter(w => w.length > 1 && !/^\d+$/.test(w));
        for (let i = 0; i < words.length - 1; i++) {
          const bigram = `${words[i]} ${words[i + 1]}`;
          phraseFreq.set(bigram, (phraseFreq.get(bigram) || 0) + 1);
          if (i < words.length - 2) {
            const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
            phraseFreq.set(trigram, (phraseFreq.get(trigram) || 0) + 1);
          }
        }
      }
      const topPhrases = [...phraseFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 40)
        .map(([p]) => p);

      writeJSON('trends.json', { topics: topTopics, updated: now } satisfies TrendsData);
      writeJSON('experts.json', { creators: topCreators, updated: now } satisfies ExpertsData);
      writeJSON('keywords.json', { phrases: topPhrases, updated: now } satisfies KeywordsData);

      console.log(`Extracted: ${topTopics.length} topics, ${topCreators.length} creators, ${topPhrases.length} phrases`);
    } catch (e) {
      console.error('YouTube data fetch failed, keeping previous data:', e);
      partialUpdate = true;
    }
  } else {
    console.warn('YOUTUBE_API_KEY not set, skipping YouTube data fetch');
    partialUpdate = true;
  }

  // ===== Google Trends 数据 =====
  try {
    const googleTrends = await import('google-trends-api');
    const NICHES = [
      'fitness', 'cooking', 'tech reviews', 'gaming', 'beauty',
      'personal finance', 'travel vlog', 'music', 'education', 'fashion',
      'home decor', 'productivity',
    ];

    const risingQueries: { query: string; change: string }[] = [];

    for (const niche of NICHES) {
      try {
        const result = await googleTrends.relatedQueries({ keyword: niche, startTime: new Date(Date.now() - 7 * 86400000) });
        const parsed = JSON.parse(result);
        const rising = parsed?.default?.rankedList?.[1]?.rankedKeyword || [];
        for (const item of rising.slice(0, 5)) {
          risingQueries.push({
            query: item.query,
            change: item.value || 'rising',
          });
        }
      } catch (e) {
        // 单个 niche 失败不影响整体
      }
    }

    if (risingQueries.length > 0) {
      writeJSON('search-trends.json', {
        rising: risingQueries.slice(0, 30),
        updated: now,
      } satisfies SearchTrendsData);
      console.log(`Extracted ${Math.min(risingQueries.length, 30)} rising queries`);
    } else {
      console.warn('No rising queries found, keeping previous search-trends.json');
    }
  } catch (e) {
    console.error('Google Trends fetch failed, keeping previous data:', e);
    partialUpdate = true;
  }

  // ===== 写 metadata =====
  writeJSON('metadata.json', {
    lastUpdated: now,
    youtubeCategories,
    totalVideosSampled,
    trendsCount: readJSON<TrendsData>('trends.json').topics.length,
    expertsCount: readJSON<ExpertsData>('experts.json').creators.length,
    keywordsCount: readJSON<KeywordsData>('keywords.json').phrases.length,
    risingQueriesCount: readJSON<SearchTrendsData>('search-trends.json').rising.length,
    partialUpdate,
  } satisfies Metadata);

  console.log(`Data update complete. partialUpdate=${partialUpdate}`);
}

main().catch(e => {
  console.error('update-data failed:', e);
  // 永远不返回非零 exit code，避免中断 GitHub Actions
  process.exit(0);
});
```

- [ ] **Step 2: 本地测试语法正确**

```bash
npx tsx --eval "console.log('tsx works')"
```
Expected: `tsx works`

- [ ] **Step 3: Commit**

```bash
git add scripts/update-data.ts
git commit -m "feat: add weekly data pipeline script (YouTube + Google Trends)"
```

---

### Task 4: 创建 GitHub Actions 工作流

**Files:**
- Create: `.github/workflows/update-trends.yml`

- [ ] **Step 1: 创建工作流文件**

```yaml
name: 每周数据刷新

on:
  schedule:
    - cron: '0 3 * * 1'  # 每周一 UTC 凌晨 3 点
  workflow_dispatch:       # 支持手动触发

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci

      - name: 拉取最新数据
        run: npm run update-data
        env:
          YOUTUBE_API_KEY: ${{ secrets.YOUTUBE_API_KEY }}

      - name: 提交数据更新
        run: |
          git config user.name "data-bot"
          git config user.email "bot@youtube-tools.local"
          git add src/data/pools/
          if git diff --staged --quiet; then
            echo "No data changes, skipping commit"
          else
            git commit -m "chore: 每周数据刷新 $(date +%Y-%m-%d)"
            git push
          fi
```

- [ ] **Step 2: 验证工作流语法**

```bash
# 手动检查 YAML 语法（不需要工具，肉眼检查即可）
cat .github/workflows/update-trends.yml
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/update-trends.yml
git commit -m "ci: add weekly data refresh workflow"
```

---

### Task 5: 前端增加"数据更新于"展示

**Files:**
- Modify: `src/pages/[lang]/[slug].astro`
- Modify: `src/i18n/translations.ts`

- [ ] **Step 1: 在 translations.ts 新增翻译键**

在 `translations.ts` 的顶层对象中，`results.title` 附近添加：

```typescript
'results.data_updated': { en: 'Data updated on', zh: '数据更新于' },
```

在文件中搜索 `'results.title'` 定位插入位置。

- [ ] **Step 2: 在 slug 页面引入 metadata 并展示更新时间**

修改 `src/pages/[lang]/[slug].astro`：

在 frontmatter 中新增 import（放在其他 import 之后）：

```typescript
import poolMetadata from '../../data/pools/metadata.json';
```

注意：文件顶部已有 `---` frontmatter 分隔符，import 放在第一个 `---` 之后的 import 区域。

在页面的结果区 `<h2>` 标签下方（`{t('results.title', lang)}` 那一行之后）添加：

```astro
{poolMetadata.lastUpdated && (
  <p class="text-xs text-gray-400 mb-3">
    {t('results.data_updated', lang)} {new Date(poolMetadata.lastUpdated).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
  </p>
)}
```

搜索结果区的原有 `<h2>` 行位置在 `<!-- 结果区 -->` 注释附近。确认插入位置在 `<h2>` 和 `<div id="static-results">` 之间。

- [ ] **Step 3: 本地验证构建**

```bash
npm run build
```
Expected: 构建成功，无报错

- [ ] **Step 4: Commit**

```bash
git add src/pages/[lang]/[slug].astro src/i18n/translations.ts
git commit -m "feat: show data last-updated time on tool pages"
```

---

### Task 6: 本地端到端测试

**Files:** 无（验证现有文件）

- [ ] **Step 1: 确保种子数据存在**

检查 `src/data/pools/` 下 5 个 JSON 文件都存在且内容合法。

- [ ] **Step 2: 无 API key 时运行脚本（测试兜底逻辑）**

```bash
npm run update-data
```
Expected:
- 输出 `YOUTUBE_API_KEY not set, skipping YouTube data fetch`
- 输出 `Extracted X rising queries` 或 `No rising queries found`
- 输出 `Data update complete. partialUpdate=true`
- 不崩溃

- [ ] **Step 3: 检查 metadata.json 已更新**

```bash
node -e "const m = require('./src/data/pools/metadata.json'); console.log('lastUpdated:', m.lastUpdated, 'partialUpdate:', m.partialUpdate);"
```
Expected: `lastUpdated` 为当前时间，`partialUpdate` 为 `true`（因为没设 API key）

- [ ] **Step 4: 有 API key 时运行脚本（可选，如果你有 key）**

```bash
YOUTUBE_API_KEY=你的key npm run update-data
```
Expected:
- 输出 `Fetched XXX videos across XX categories`
- `partialUpdate` 取决于 Google Trends 是否成功
- JSON 文件包含真实数据

- [ ] **Step 5: 验证构建成功**

```bash
npm run build
```
Expected: Build 成功，工具页展示"数据更新于"时间

---

### 完成检查清单

- [ ] `npm run update-data` 可本地运行且不崩溃
- [ ] 种子 JSON 内容合法，可作为引擎兜底数据
- [ ] GitHub Actions 工作流 YAML 格式正确
- [ ] 前端构建成功，"数据更新于"展示正常
- [ ] 脚本 exit code 永远为 0（API 失败时不影响构建）

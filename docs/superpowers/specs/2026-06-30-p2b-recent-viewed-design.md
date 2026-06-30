# P2b LocalStorage 最近浏览 — 设计 spec

**Date:** 2026-06-30
**Status:** Pending user review
**Branch:** `master`
**Scope:** P2b（3 阶段 P2 计划的第二阶段）
**Predecessor:** P2a (`2026-06-30-p2-localstorage-favorites-design.md`, ship 2026-06-30)
**Trigger:** P2a ship 后用户批准 P2b 方向

---

## 1. 目标与范围

为 32 个 calculators 添加 **"最近浏览"自动记录**：用户进入任意工具详情页时自动记录到 localStorage，3 处 UI 暴露——Header dropdown、工具页底部 pill 列表、`/[lang]/recent/` 专页。完全客户端（localStorage），无后端、无跨设备同步、无 analytics。**与 P2a 完全独立**（独立 LS key、独立 lib、独立 init script）。

### 包含

- 32 工具详情页 mount 时自动 `recordVisit(slug)` 写 LS
- Header 第 2 个 `<details>` dropdown（favorites 左侧），top 5 + "View all (N) →"
- 工具详情页底部 `<RecentViewed />` 组件（pill 列表，title + "2h ago"）
- `/[lang]/recent/` SSG 页（JS hydrate 渲染 ToolCard grid）
- 跨 tab 同步（`storage` event 监听）
- LRU 重访语义：再次访问移到顶部 + 更新 `visitedAt`
- Privacy policy 加 "最近访问" 段落（与 P2a 平行）
- i18n 中英双语

### 不包含（Out of Scope）

- 跨设备同步、用户账户
- 手动 "pin" / 收藏最近浏览
- 浏览历史分组 / 标签
- 访客匿名统计
- Result 卡片 [保存结果] 按钮（这是 P2c）
- Export / Import JSON
- 搜索框（独立 P2.x）

---

## 2. 架构（4 层，与 P2a 完全平行）

```
┌─────────────────────────────────────────────────────────────┐
│ UI 层 (Astro components)                                    │
│   Header.astro + RecentViewed.astro + [lang]/recent.astro   │
│   [lang]/[slug].astro 挂载 <RecentViewed />                 │
└─────────────────────────────────────────────────────────────┘
            ▲
            │  data-recent-* attrs (declarative hooks)
            ▼
┌─────────────────────────────────────────────────────────────┐
│ Init 层 (src/scripts/recent-init.client.ts)                 │
│   DOMContentLoaded → scan + bind + auto-record current slug │
└─────────────────────────────────────────────────────────────┘
            ▲
            │  lib.recordVisit / subscribe
            ▼
┌─────────────────────────────────────────────────────────────┐
│ State 层 (src/lib/recent.ts)                                │
│   read/write/recordVisit/has/isAvailable/subscribe          │
└─────────────────────────────────────────────────────────────┘
            ▲
            ▼
   localStorage['forgeflowkit:recent:v1']
```

关键：
- **`Set` 在 lib 层 dedup，`entries[]` 在 JSON**（与 P2a 同样的 SSR-safe 模式）
- **versioned storage key**：`:v1` 后缀与 P2a 隔离
- **`.client.ts` suffix**：Astro 自动 tree-shake 仅打包到 client
- **`data-recent-*` data-attrs**：declarative hooks，加新 surface = 加 attr，无 JS 改动
- **完全独立**：不复用 favorites 的 lib / init / i18n key，与 P2a 平行（CLAUDE.md "Don't over-engineer"）

---

## 3. 文件变更清单

### 新建（4 文件）

| 文件 | 职责 | 行数估计 |
|---|---|---|
| `src/lib/recent.ts` | state mgmt，pure TS，无 DOM | ~100 |
| `src/scripts/recent-init.client.ts` | DOM 扫描 + 事件绑定 + 渲染 + auto-record | ~100 |
| `src/components/RecentViewed.astro` | 工具页底部 pill 列表组件 | ~30 |
| `src/pages/[lang]/recent.astro` | recent 专页骨架 + JS hydrate | ~50 |

### 修改（5 文件）

| 文件 | 改动 |
|---|---|
| `src/components/Header.astro` | + Recent `<details>` dropdown（在 favorites **左**侧） |
| `src/pages/[lang]/[slug].astro` | 挂载 `<RecentViewed />` 在 FAQ/HowToUse 后 |
| `src/pages/[lang]/privacy-policy.astro` | + "最近访问（Recently Viewed）" 段落（中英） |
| `src/i18n/translations.ts` | + 11 新 key（en + zh = 22 行） |
| `src/layouts/BaseLayout.astro` | `<head>` import `recent-init.client.ts` |
| `scripts/check-i18n-completeness.mjs` | + `recent: [...]` 数组 |
| `tests/recent.test.ts`（新） | lib 单测 ~18 用例 |
| `tests/recent-init.test.ts`（新） | init 组件测试 ~12 用例 |
| `tests/seo-schemas.test.ts` | + 1 fixture（/recent/ WebPage 断言 + 不含 LS data） |

总计 13 文件变动（6 新 + 7 改），~500-700 行净增（与 P2a 平行）。

---

## 4. 数据模型（LS schema）

```ts
// LocalStorage key: 'forgeflowkit:recent:v1'
interface RecentStoreV1 {
  version: 1;                          // schema version
  entries: RecentEntry[];              // 最近访问在前（LRU）
  lastUpdated: string;                 // ISO 8601 timestamp
}

interface RecentEntry {
  slug: string;                        // 工具 slug (e.g. "solopreneur-mrr-calculator")
  visitedAt: string;                   // ISO 8601 timestamp
}
```

**JSON 实例：**
```json
{
  "version": 1,
  "entries": [
    { "slug": "solopreneur-mrr-calculator", "visitedAt": "2026-06-30T14:22:00Z" },
    { "slug": "solopreneur-ltv-calculator",  "visitedAt": "2026-06-30T14:20:00Z" },
    { "slug": "solopreneur-cac-calculator",  "visitedAt": "2026-06-30T14:18:00Z" }
  ],
  "lastUpdated": "2026-06-30T14:22:00Z"
}
```

**lib 导出常量与接口：**
```ts
export const RECENT_STORAGE_KEY = 'forgeflowkit:recent:v1';
export const RECENT_MAX_ITEMS = 20;

export function read(): RecentEntry[];                          // 容错解析 → []
export function write(entries: RecentEntry[]): void;            // 含 lastUpdated
export function recordVisit(slug: string): void;                // LRU: 重访移顶 + 更新时间
export function has(slug: string): boolean;                     // 仅检查存在性
export function isAvailable(): boolean;                         // 模块级缓存
export function subscribe(cb: () => void): () => void;          // returns unsubscribe

// 错误类型（P2b 独立 export；与 P2a 同名 class 但不同模块，互不影响）
export class RecentUnavailableError extends Error {}
export class QuotaExceededError extends Error {}
export class SchemaMismatchError extends Error {}
```

**Schema 演进策略：**
- 字段变化 → bump `:v2`，新 key，migrate 函数在首次 v2 调用时执行
- 与 P2a 互不干扰（独立 key）
- migrate 函数初始 stub，真实迁移等需要时再写

---

## 5. 数据流

### 用户进入工具详情页

```
[mount /[lang]/[slug]/]
  └─ BaseLayout import recent-init.client.ts
       └─ DOMContentLoaded → init()
            ├─ getLang() reads /^\/(en|zh)(\/|$)/  from window.location.pathname
            ├─ getCurrentSlug() reads pathname (e.g., /en/solopreneur-mrr-calculator/ → "solopreneur-mrr-calculator")
            ├─ lib.recordVisit(currentSlug)            ← 自动记录
            │    ├─ read() 当前 entries
            │    ├─ slug 存在 → 从原位置移除
            │    ├─ 头部插入 {slug, visitedAt: new Date().toISOString()}
            │    ├─ length > 20 → truncate tail
            │    ├─ write() LS
            │    ├─ 抛 RecentUnavailableError (LS 不可用时)
            │    └─ 内部 dispatch notify() → subscribe fanout
            ├─ scanDocument()：
            │    ├─ 所有 [data-recent-container] → renderInitial()
            │    └─ 监听 window 'storage' event（跨 tab）
            └─ subscribe(favoritesChange) → renderAll()
```

### render 模式（3 种，与 P2a 平行）

| data-mode | 用途 | 行为 |
|---|---|---|
| `preview` | Header dropdown | top N（默认 5）+ "View all (N) →"；空时显示 "No recent yet" |
| `inline` | 工具页底部 pill 列表 | 全部 entries (除当前 slug 外)，pill 样式 + "2h ago"；空时整块隐藏 |
| `full` | `/recent/` 专页 | 全部 entries 对应 ToolCard grid；空时显示完整 empty state |

### 跨 tab 同步

- 监听 `window` 'storage' event
- 收到非自己写的 LS 变化时 → read() → renderAll()
- 同 tab 跨 surface 同步用 `subscribe()`（模块级 Set 回调）

---

## 6. UI 行为（4 位置 + 隐私）

### A — Header Recent dropdown

- 位置：Header 左起第 1 个（在 Favorites 之前）
- `<details>` element（与 Favorites/Categories 同 pattern）
- 数字徽章 `(N)` 紧随 "Recent" 文字，0 时隐藏
- dropdown 内显示 top 5 recent entries
- 每个 entry：tool title（短）+ "2h ago"（time-ago format）
- i18n：标题 "Recently Viewed" / "最近浏览"

### B — 工具页底部 `<RecentViewed />`

- 位置：`[slug].astro` 底部（FAQ / HowToUse / EeatTrustBlock 之后，AdUnit 之前）
- 隐藏条件：entries 长度为 0 **或** 1（1 个 = 只看了当前工具，无意义）
- 样式：pill 列表（与 RelatedTools 同款），wrap 布局
- 每个 pill：`[title · "2h ago"]`，点击导航到对应工具
- 标题：`👁 Recently Viewed (4)` / `👁 最近浏览 (4)`
- **不显示当前工具**（自己不算"最近"）
- i18n：标题 + "Just now" / "刚刚" + "Xh ago" / "X小时前" + "Xd ago" / "X天前"

### C — `/[lang]/recent/` 专页

- SSG HTML，含 title/description/JSON-LD `WebPage` schema
- Hero：标题 + 副标题 + "7 tools visited" 小字
- 网格：复用 ToolCard 样式（与 /favorites/ 平行）
- Empty state：中央 👁 大图标 + 双语提示 + 浏览按钮（链 `/[lang]/`）
- `dateModified` 动态（`new Date().toISOString().slice(0,10)`，build-time）

### D — privacy-policy 新段落

```
## 最近访问（Recently Viewed）

我们在你的浏览器中使用 localStorage 存储以下数据：
- 你最近访问过的工具列表（最多 20 个）及访问时间戳

这些数据：
- 仅存储在你的设备上（不发送至我们的服务器，不跨设备同步）
- 可随时在浏览器设置中清除（站点数据 → 删除）
- 不包含任何可识别个人身份的信息（仅工具 slug + 时间戳）

如果你不希望使用此功能，可使用浏览器的隐私模式或禁用站点数据。
```

中英页面分别写（与 P2a 平行）。

---

## 7. 错误处理

### 4 类 error 分类（与 P2a 平行）

| 错误 | 触发 | UI 反馈 |
|---|---|---|
| `RecentUnavailableError` | LS 不可用 | Header dropdown 灰色 "不可用"；工具页底部隐藏 |
| `QuotaExceededError` | LS 满 + 添加 | Tooltip "存储已达上限" |
| `SchemaMismatchError` | version 错 | 自动 fallback `[]` |
| `InvalidSlugError` | 非合法 slug | console.warn，no-op |

### isAvailable() 缓存策略

- 模块级 cached，模块加载时一次性 probe
- `try { LS.setItem('__probe__', '1'); LS.removeItem('__probe__'); } catch → false`
- 失败不抛错，返回 boolean

### read() 容错序列（5 步，与 P2a 平行）

1. LS.getItem → `[]`（不可用）
2. null → `[]`（新用户）
3. JSON.parse fail → `[]`（损坏）
4. version !== 1 → `[]`（schema 旧）
5. entries 非数组 → `[]`（畸形）
6. 过滤非法 slug（防御）

### 边界情况

- **已删除/重命名 slug**：`recordVisit` 接受任意字符串；渲染时由 `init` 层在 `tools` 数据表中查找，找不到的 slug 静默跳过（与 P2a `favorites` 一致）
- **同 slug 重访**：`recordVisit` 检测到已存在 → 从原位置移除 → 头部插入新 entry（**LRU 语义**）
- **同 tab 多次 mount**：`recordVisit` 是幂等的（最终 entries 顺序一致）
- **跨 tab 同步延迟**：`storage` event 不带 `event.newValue` 解析时直接 `read()` 一次

### 不暴露 manual "remove" 按钮

- 决策：**不提供**手动删除单个 entry 的 UI（避免冗余功能；用户可通过 "clear all" 浏览器站点数据重置）
- 如未来需要，再加 entry 移除按钮

---

## 8. 测试策略

### Layer 1 — `tests/recent.test.ts`（lib 单测，~18 用例）

| 组 | 用例 | 覆盖 |
|---|---|---|
| `read()` | 4 | 空、合法、损坏 JSON、旧 version |
| `write()` | 3 | 正常、quota 抛错、空数组 |
| `recordVisit()` | 5 | 新增、重访移顶、超 MAX truncate、invalid slug、幂等 |
| `has()` | 2 | true / false |
| `subscribe()` | 3 | 触发、unsubscribe 失效、fan-out |
| `isAvailable()` | 3 | 可用、catch false、缓存 |

### Layer 2 — `tests/recent-init.test.ts`（init 组件测试，~12 用例）

复用 P2a 的 hand-rolled DOM stub（per-test child-process isolation）。

| 组 | 用例 |
|---|---|
| Auto-record | 3（mount 写 LS、已存在移顶、空 entries 启动） |
| DOM scan | 2（container 渲染、无 container no-op） |
| Render modes | 4（preview 5 / inline filter current / full all / empty state） |
| Storage event | 2（外部 tab 写、自身写不重渲染） |
| Error handling | 1（Unavailable 早期返回） |

### Layer 3 — `tests/seo-schemas.test.ts`（+1 fixture）

```ts
it('recent page schema is WebPage without user data', () => {
  const html = readFileSync('dist/en/recent/index.html', 'utf-8');
  expect(html).toContain('"@type":"WebPage"');
  expect(html).toContain('"name":"Recently Viewed"');
  expect(html).not.toContain('forgeflowkit:recent:v1');
  expect(html).toContain('data-recent-grid');  // hydration hook present
});
```

### Coverage 目标

- lib: ≥ 95%
- init script: ≥ 80%

### Not Tested

- 浏览器 native dialogs
- LS 实际 5MB 上限
- i18n 翻译文本（已由 check-i18n-completeness.mjs 覆盖）
- time-ago locale 细节（用统一的 Intl.RelativeTimeFormat）

---

## 9. 未来兼容性

### P2b 留下的扩展钩子

1. **独立 LS key**：`forgeflowkit:recent:v1` 已与 P2a/P2c 隔离
2. **同名 pattern**：`data-recent-*` 可复用到 `data-history-*`（P2c）
3. **subscribe API**：与 P2a 同签名，P2c 可直接复用模式
4. **独立 MAX_ITEMS**：favorites=50、recent=20、history=100

### P2c 预想（History Snapshots）

- LS key：`forgeflowkit:history:v1`
- 触发：ResultCard 区域加 [保存结果] 按钮
- UI：`/[lang]/history/` 页 + Header 第三 dropdown（与 favorites/recent 并列）
- 与 P2a/P2b 关系：**完全独立**

### 未来演进为"用户账户系统"

如果未来引入用户账户，P2b 可平滑迁移：
- 加 `userId` 字段
- LS 作 offline cache，后端 source of truth
- 但**现阶段 0 用户后端**，纯 LS 是正确的最小实现

---

## 10. Acceptance Criteria

P2b ship 标准：

- [ ] `src/lib/recent.ts` 提供 6 个导出函数 + 3 错误类型 + 2 常量
- [ ] `src/scripts/recent-init.client.ts` 自动 `recordVisit(currentSlug)` + scan + bind + re-render
- [ ] `src/components/RecentViewed.astro` 工具页底部 pill 列表，0/1 entries 隐藏
- [ ] `src/pages/[lang]/recent.astro` SSG + JS hydrate（与 /favorites/ 平行）
- [ ] Header `<details>` dropdown 在 favorites 左侧，含 top 5 + "View all" + 数字徽章
- [ ] 32 工具详情页 mount 时自动写 LS（验证：浏览 3 个工具 → LS 含 3 entries）
- [ ] 重访同一工具 → 移到顶部 + 更新 visitedAt
- [ ] 满 20 后再访问新工具 → 移除最旧的
- [ ] Privacy policy 中英各加 `## 最近访问（Recently Viewed）` 段
- [ ] i18n 11 新 key × 2 lang = 22 行通过 check-i18n-completeness
- [ ] `pnpm check` exit 0
- [ ] `tests/recent.test.ts` ~18 用例全 pass
- [ ] `tests/recent-init.test.ts` ~12 用例全 pass
- [ ] `tests/seo-schemas.test.ts` 新增 fixture pass
- [ ] Manual test：开 2 tab → 一边访问新工具 → 另一边 Header dropdown 自动更新
- [ ] Manual test：清 LS → 工具页底部隐藏 + Header 显示 "No recent yet"
- [ ] Manual test：Safari private mode → 工具页底部隐藏 + Header dropdown 不可用

---

## 11. Implementation Plan 计划

- 写 plans：`docs/superpowers/plans/2026-06-30-p2b-recent-viewed-plan.md`（task-by-task）
- 执行：subagent-driven-development（每 task 1 implementer + 1 spec reviewer；[INTEGRATION] 任务加 1 quality reviewer）
- 任务分解（~5-6 task）：
  1. `src/lib/recent.ts` + `tests/recent.test.ts` — state mgmt lib（[MECHANICAL]）
  2. `src/scripts/recent-init.client.ts` + `tests/recent-init.test.ts` — init 层 + DOM 渲染（[INTEGRATION]）
  3. `src/i18n/translations.ts` + `check-i18n-completeness.mjs` — i18n 11 keys（[MECHANICAL]）
  4. `src/components/Header.astro` + `src/components/RecentViewed.astro` + `src/pages/[lang]/[slug].astro` + `src/layouts/BaseLayout.astro` — UI 接入（[INTEGRATION]）
  5. `src/pages/[lang]/recent.astro` + `src/pages/[lang]/privacy-policy.astro` — 专页 + 隐私（[INTEGRATION]）
  6. `tests/seo-schemas.test.ts` + final integration check（[MECHANICAL]）
- 预期 5-6 task × ~30 min = 半天到 1 天

---

## 12. Self-Review Notes

- ✅ Placeholder scan：0 个 TBD/TODO/占位段
- ✅ Internal consistency：架构 ↔ 文件清单 ↔ schema 一致
- ✅ Scope check：仅 recent viewed，P2c 不污染
- ✅ Ambiguity check：所有"必须/应该/可以"已澄清（LRU 行为已 spec out）
- ✅ Out of Scope 已明确列出（11 个 ❌ 列出）
- ✅ Acceptance criteria 量化（18 + 12 + 1 = 31 test 用例 + 3 manual test）
- ✅ 与 P2a/P2c 的边界明确（独立 LS key，独立 lib，相同模式不抽 factory）
- ✅ 复用策略明确：完全独立（CLAUDE.md "Don't over-engineer" 合契）

---

## 13. Self-Review (Spec-Level 复审检查)

1. **每个 P2x 独立可 ship**？✅ 是 — 3 个 LS key 隔离，lib 各自独立
2. **数据契约清晰**？✅ 是 — RecentStoreV1 + RecentEntry 接口明确 + version 字段
3. **UI 行为可测试**？✅ 是 — 3 渲染模式 + 4 错误路径 + 1 边界（current slug 过滤）
4. **跨 tab 同步处理**？✅ 是 — `storage` event 监听
5. **渐进增强（progressive enhancement）**？✅ 是 — JS-disabled 时 header dropdown 显示空 + 工具页底部隐藏
6. **Out of Scope 明确**？✅ 是 — 11 个 ❌ 列出
7. **未来兼容性**？✅ 是 — namespace 隔离 + 版本化 + subscribe API 一致

# Scripts Index

> **浏览器侧 init 层目录索引** — `src/scripts/` 下 6 个 `.client.ts` 客户端脚本，按 P-series origin 分组。
> **总数验证:** 6 scripts / 1473 LOC (all `.client.ts` suffix → Vite tree-shakes out of SSR, bundled to client only)
> **最后更新:** 2026-07-20 (P44 batch)

---

## 顶层结构

```
src/scripts/
├── INDEX.md (本文件)
└── 6 .client.ts 浏览器 init 层 — 按 P-series 分 2 section
    ├── P2 LS-only trio (3):  favorites-init · recent-init · history-init
    └── P3 cloud-sync trio (3): clerk-init · sync-init · migration
```

| Section | Scripts | Total LOC | Avg LOC | Bundling |
|---|---|---|---|---|
| P2 LS-only trio | 3 | 905 | 301.7 | Client only (`.client.ts` suffix) |
| P3 cloud-sync trio | 3 | 568 | 189.3 | Client only (`.client.ts` suffix) |
| **Total** | **6** | **1473** | **245.5** | Client only |

> **Bundle invariant**: 全部 6 个脚本以 `.client.ts` 后缀命名 → Vite/Astro build 时从 SSR 树摇出，仅打包到客户端 bundle。修改这些脚本不会影响 SSR 渲染，但会改变客户端行为，需在浏览器 console 或交互测试中验证。

---

## 1 · P2 LS-only trio — localStorage 数据层 + DOM 渲染

每个脚本管理一个独立的 localStorage collection（favorites / recent / history），提供：
1. **Subscribe/notify** 跨 tab 同步（via `window 'storage'` 事件 + 内部 `subscribe()` fanout）
2. **Data-attr contract** — 通过声明式 `data-*` 钩子与组件交互（components 不 import scripts）
3. **DOM render** — self-init on `DOMContentLoaded` 渲染对应 UI（star toggle / pills / badge / full grid）

| Script | LOC | Origin | Storage key | Self-init @ | P-series ref |
|---|---|---|---|---|---|
| `favorites-init.client.ts` | 278 | P2a | `FAVORITES_STORAGE_KEY` | BaseLayout L162 | 2026-06-30 P2a trilogy 第 1 部 |
| `recent-init.client.ts` | 249 | P2b | `RECENT_STORAGE_KEY` | BaseLayout L165 | 2026-07-01 P2b trilogy 第 2 部 |
| `history-init.client.ts` | 378 | P2c | `HISTORY_STORAGE_KEY` | BaseLayout L168 | 2026-07-01 P2c trilogy 第 3 部 (LS history snapshots) |

### 1.1 favorites-init.client.ts (278 LOC)

**Role**: 收藏列表 localStorage 管理 + DOM 渲染。P2a 产物。

**Storage**: `FAVORITES_STORAGE_KEY` (localStorage, JSON array of slugs, max 64 items per `FAVORITES_MAX_ITEMS`)

**Data-attr contract** (声明式钩子，components 不 import):
- `[data-favorite-toggle][data-favorite-slug="..."]` — 点击切换收藏
- `[data-favorites-container][data-mode="preview|full|count"]` — 渲染目标容器
- `#tools-data` — `/favorites` 页面嵌入的 `<script type="application/json">`，含 `{[slug]: {title, description, categoryId}}` 用于卡片渲染；缺失时优雅降级

**Consumers** (direct + transitive):
- Header star toggle (`data-favorite-toggle` 钩子)
- `/favorites` 页面 full grid 渲染
- 任何工具页的"收藏"按钮

**Cross-tab sync**: `window 'storage'` event + `lib/favorites.ts` `subscribe()`/`notify()` fanout

**i18n**: 通过 `window.location.pathname` 检测 lang (`/^\/(en|zh)(\/|$)/`)，取 `favorites.dropdown.*` / `favorites.toast.*` / `favorites.aria.*`

### 1.2 recent-init.client.ts (249 LOC)

**Role**: 最近浏览工具列表 + DOM 渲染。P2b 产物。

**Storage**: `RECENT_STORAGE_KEY` (localStorage, JSON array of `{slug, viewedAt}` pairs)

**Data-attr contract**:
- `[data-recent-container]` — Header pills 渲染目标
- `[data-recent-clear]` — 清除按钮
- 工具页 `[slug].astro` 渲染时由该脚本 push slug + timestamp

**Consumers**:
- Header 最近浏览 pills (`data-recent-container` 钩子)
- `/recent` 页面 full grid 渲染（`renderFull()` exported）
- 100 个工具页 (`[slug].astro` × 16 cats × 2 langs = 200 page renders) — 每个页面触发 `recordView(slug)`

**URL prefill**: 工具页可带 `?from=recent` 进入 → `handlePrefillFromURL()` exported（per P2b 测试 seam）

**i18n**: `window.__i18n_recent__` 内嵌 JSON（BaseLayout L176 set:html 注入），`recent.header.*` / `recent.empty.*` 等 key

### 1.3 history-init.client.ts (378 LOC)

**Role**: 历史快照管理 + DOM 渲染（P2c 收官之作，最复杂的 P2 script）。P2c 产物。

**Storage**: `HISTORY_STORAGE_KEY` (localStorage, capped snapshot ring buffer per `HISTORY_MAX_ITEMS`)

**Data-attr contract**:
- `[data-history-container]` — full grid 渲染目标
- `[data-history-count]` — Header 计数徽章
- `[data-history-clear]` — 清除按钮
- 工具页通过 `recordSnapshot(input, result)` push

**Consumers**:
- Header history count badge
- `/history` 页面 full snapshot 列表（`renderAll()` exported）
- 100 个工具页 record snapshot on calculate

**Exports** (P2c 测试 seam 强化):
- `renderAll` — 显式 export，避免 Vite tree-shaking
- `handlePrefillFromURL` — `?from=history&ts=...` URL prefill

**i18n**: `window.__i18n_history__` 内嵌 JSON（BaseLayout L177）

---

## 2 · P3 cloud-sync trio — Clerk auth + cross-device sync + LS→cloud migration

P2 三个 script 各自管理一个 LS collection；P3 三个 script 协作实现跨设备同步：
1. **clerk-init**: 懒加载 Clerk SDK（避免 SSR 不必要的 SDK import）
2. **sync-init**: 把 P2 三 collection 接到云端（Supabase REST API），同时 wire Header 同步菜单
3. **migration**: P2 用户的 LS 数据一次性迁云（P3-3 收官之作）

| Script | LOC | Origin | Storage / env | Self-init @ | P-series ref |
|---|---|---|---|---|---|
| `clerk-init.client.ts` | 66 | P3-1 | env: `PUBLIC_CLERK_PUBLISHABLE_KEY` | BaseLayout L171 | 2026-07-01 Clerk auth |
| `sync-init.client.ts` | 321 | P3-2 | `LAST_PUSHED_KEY_PREFIX:*` (LS) + Supabase env | BaseLayout L174 | 2026-07-02 Cross-Device Sync |
| `migration.client.ts` | 181 | P3-3 | `SESSION_PULL_KEY` (SS) + `forgeflowkit:migration:{userId}` (LS) | **NOT in BaseLayout** (imported by sync-init) | 2026-07-02 LS → cloud migration |

### 2.1 clerk-init.client.ts (66 LOC) — 最小但关键

**Role**: 懒加载 `@clerk/clerk-js` SDK + 暴露 `getClerkInstance()` 给 sync-init 复用。P3-1 产物。

**Storage**: 无 LS key；仅读 `PUBLIC_CLERK_PUBLISHABLE_KEY` env

**Exports**:
- `initClerk()` — 初始化 Clerk SDK（lazy import）
- `getClerkInstance(): Clerk | null` — P3-1 Task 4 lesson: 显式 export + self-call EOF 阻止 Vite tree-shaking

**Consumers**:
- `sync-init.client.ts` 通过 `getClerkInstance()` 读用户身份（不直接 import `@clerk/clerk-js`）

**Env-awareness**: 缺失 `PUBLIC_CLERK_PUBLISHABLE_KEY` → init 早退，`getClerkInstance()` 永远返回 `null` → sync-init 的 pollForAuth loop 5s 后超时 → Header sync menu 渲染"未配置"状态（不会 crash）

### 2.2 sync-init.client.ts (321 LOC) — P3 编排核心

**Role**: 把 P2 三个 LS collection 接到 Supabase cloud；wire Header sync menu UI；处理 visibilitychange flush。P3-2 产物。

**Storage**: 
- `LAST_PUSHED_KEY_PREFIX:*` (localStorage, per-collection debounce timestamp)
- 不直接管理 P2 三 collection 的 data（subscribes 监听变化）

**Constants**:
- `DEBOUNCE_MS = 5000` — 写入后 5s 防抖再推云
- `POLL_FOR_AUTH_MS = 5000` / `POLL_INTERVAL_MS = 1000` — Clerk auth 检测（page load 后 5s 内每 1s poll 一次）

**Subscribes** (per P2 trio):
- `subscribeFavorites` ← `lib/favorites.ts`
- `subscribeRecent` ← `lib/recent.ts`
- `subscribeHistory` ← `lib/history.ts`

**Wired UI** (`data-sync-*` 钩子 in Header):
- `sync now` → `syncNow()` (force push + pull)
- `export JSON` → `exportAll()` → blob download
- `delete cloud data` → `deleteCloudData()` after confirm
- `visibilitychange` → `sendBeacon` flush

**Exports**:
- `wireSyncMenu()` — Header sync menu click handler wiring
- `startSync()` — 主入口，self-call EOF 触发
- `pullAndMerge` / `flushPending` — sync primitives (used by migration inlined equivalent)

**Consumers**:
- Header.astro (sync menu UI)
- migration.client.ts (call `maybeMigrate(userId)` after auth resolves at L290)

### 2.3 migration.client.ts (181 LOC) — 特殊地位

**Role**: 一次性 LS→cloud migration。P3-3 收官之作（LS-only trilogy → cloud-aware trilogy 的桥梁）。

**Storage**:
- `SESSION_PULL_KEY = 'sync:did-pull-once'` (sessionStorage, per-tab guard)
- `forgeflowkit:migration:{userId}` (localStorage, per-device per-user guard)

**Exports**:
- `maybeMigrate(userId): Promise<boolean>` — 两层 idempotency 都通过时执行 pull-merge-push（6 fetches: 3 GET + 3 POST）

**Init entry**: ⚠️ **NOT in BaseLayout.** 这是 INDEX 必须记录的 cascade 陷阱：
- `grep -rn "scripts/migration"` 在 BaseLayout 找不到 → 容易误判为 dead code
- 真实 init 入口：`sync-init.client.ts:25` import + `sync-init.client.ts:290` call inside `pollForAuthAndPull`
- 文件末尾 `if (typeof document !== 'undefined') { /* no-op */ }` 是 P3-1 self-call pattern 的迁移版 — 仅用于阻止 Vite tree-shaking `maybeMigrate` export（side-effect-only block）

**Inlined pull+merge+push**: 原计划从 `lib/sync.ts` import `pullAndMerge`，但 `pullAndMerge` 实际定义在 `sync-init.client.ts` → 循环依赖风险。`migration.client.ts` 改为 inlined 等价实现（6 fetches 同款），行为一致。Per 文件 L20-25 comment 记录。

**i18n**: 迁移完成 toast 文案取 `translations['en'|'zh'].sync.migration.*`

---

## 3 · Init entry topology

```
BaseLayout.astro L162-174 (5 <script> 标签, 顺序敏感)
├── L162 favorites-init.client.ts  → self-init DOMContentLoaded
├── L165 recent-init.client.ts      → self-init DOMContentLoaded
├── L168 history-init.client.ts     → self-init DOMContentLoaded
├── L171 clerk-init.client.ts       → initClerk() lazy
└── L174 sync-init.client.ts        → startSync() self-call EOF
    └── L25 import maybeMigrate from ./migration.client.ts
    └── L290 maybeMigrate(userId) after auth resolves
```

**顺序敏感性**:
- P2 trio (L162-168) 之间无依赖 — 可任意顺序
- `clerk-init` 必须在 `sync-init` 之前 (sync-init 用 `getClerkInstance()`)
- `migration` 通过 sync-init import 间接加载 — BaseLayout 不需显式 import

**`migration.client.ts` 是唯一不在 BaseLayout 出现的 script** — grep "scripts/" 时容易漏掉，这是 INDEX 必须显式标记的 cascade 陷阱。

---

## 4 · Storage keys 索引

| Key | Type | Owner script | Purpose |
|---|---|---|---|
| `FAVORITES_STORAGE_KEY` | localStorage | favorites-init | 收藏 slug list |
| `RECENT_STORAGE_KEY` | localStorage | recent-init | 最近浏览 `{slug, viewedAt}[]` |
| `HISTORY_STORAGE_KEY` | localStorage | history-init | 历史快照 ring buffer |
| `LAST_PUSHED_KEY_PREFIX:*` | localStorage | sync-init | per-collection debounce timestamp |
| `SESSION_PULL_KEY` (`sync:did-pull-once`) | sessionStorage | migration | per-tab migration guard |
| `forgeflowkit:migration:{userId}` | localStorage | migration | per-device per-user migration guard |

**LS-only trio (P2)** 各管一 collection，互不干扰；**Cloud-sync trio (P3)** 读取 P2 trio + 写自己的 prefix。

---

## 5 · Consumer crosswalk

| Script | Direct consumers | Transitive | Total reach |
|---|---|---|---|
| favorites-init | Header star + `/favorites` page | — | 2 |
| recent-init | Header pills + `/recent` page + 100 工具页 (recordView) | via tool-page | 102 |
| history-init | Header badge + `/history` page + 100 工具页 (recordSnapshot) | via tool-page | 102 |
| clerk-init | sync-init (`getClerkInstance`) | — | 1 |
| sync-init | Header sync menu + migration (via maybeMigrate) | via migration | 3 |
| migration | sync-init (`maybeMigrate(userId)`) | — | 1 |

**修正 grep trap**: `grep -rln "migration\.client"` 在 BaseLayout 返回 0 行 — 真实 consumer 是 `sync-init.client.ts:25`。INDEX 的 §3 拓扑图 + §2.3 显式标注。

---

## 6 · 维护约定

- **navigator, not catalog** — INDEX 列 role + LOC + storage + consumer + init entry + 关键副作用；不重述函数实现
- 修改任一 script 必须跑 `pnpm test:unit`（验证 P2 trio 12-15 component tests + P3 trio sync flow tests）
- 修改 BaseLayout.astro L162-174 顺序 → 必须保持 clerk-init 先于 sync-init
- 新增 script 必须：**(1)** `.client.ts` 后缀确保 SSR tree-shake; **(2)** 添加到合适 P2/P3 section; **(3)** 更新 init entry topology; **(4)** 更新 storage key 表
- **`migration.client.ts` 不能移到 BaseLayout** — 它是 sync-init 内部依赖（circular import 风险），保持 indirect load
- 修改 storage key → 必须同步 `lib/favorites.ts` / `lib/recent.ts` / `lib/history.ts` / `lib/sync.ts` / `lib/migration.ts` 等 constant 定义

---

## 7 · 与其他 INDEX 的关系

| Surface | Scope | Audience |
|---|---|---|
| `src/engines/INDEX.md` (P39) | 100 engines × 16 subdirs | Engines contributors |
| `src/data/INDEX.md` (P40) | 6 top-level + tools/ 16 barrels | Data contributors |
| `src/components/INDEX.md` (P43) | 18 .astro components × 5 tiers | UI contributors / Astro template reviewers |
| `src/scripts/INDEX.md` (P44, 本文件) | 6 .client.ts scripts × P2/P3 sections | Browser init layer / runtime behavior reviewers |

P39 + P40 + P43 + P44 = src/ 树四 INDEX quad，覆盖 engines (logic) + data (metadata) + components (UI) + scripts (runtime) 四大资产维度。

---

## 8 · P-series origin map

| Script | Origin commit | Origin session | Plan/Spec ref |
|---|---|---|---|
| favorites-init.client.ts | `c297ace` | P2a session | `docs/superpowers/plans/2026-06-30-p2a-favorites.md` |
| recent-init.client.ts | `f861f3e` | P2b session | `docs/superpowers/plans/2026-07-01-p2b-recent.md` |
| history-init.client.ts | `4e4c7e1` | P2c session | `docs/superpowers/plans/2026-07-01-p2c-history.md` |
| clerk-init.client.ts | `44daabe` | P3-1 session | `docs/superpowers/plans/2026-07-01-p3-1-clerk.md` |
| sync-init.client.ts | `e697e15` | P3-2 session | `docs/superpowers/plans/2026-07-02-p3-2-sync.md` |
| migration.client.ts | `b2f3ea3` | P3-3 session | `docs/superpowers/plans/2026-07-02-p3-3-migration.md` |

每个 script 都是单一 P-series batch 的产物。修改任一 script 前应 review 对应 plan/spec 了解原始设计意图。
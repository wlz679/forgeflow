# P2a LocalStorage 收藏 — 设计 spec

**Date:** 2026-06-30
**Status:** Pending user review
**Branch:** `master`
**Scope:** P2a（3 阶段 P2 计划中的第一阶段）
**Trigger:** v2 cleanup 完成 + ChatGPT 反馈建议（2026-06-25 / 2026-06-27）+ 用户（2026-06-30）批准方向
**Predecessors:**
- v2_20260626 merge（master @ `ec9848e` + tag `v2-merged-2026-06-29`）
- v2 cleanup（`c65cfb2` dead code + `2fe1e79` SITE_URL centralization）

---

## 1. 目标与范围

为 32 个 calculators 添加 **bookmark 收藏**功能：用户可在任意 ToolCard 上点击 ⭐ 收藏/取消收藏，Header 提供 dropdown 预览最近 3 个收藏，全部收藏在 `/[lang]/favorites/` 页展示。完全客户端（localStorage），无后端、无跨设备同步、无 analytics。

P2 是 3 阶段计划，**本 spec 只做 P2a（favorites）**。P2b（最近访问）和 P2c（计算历史）等 P2a ship 后再 brainstorm。

### 包含

- ToolCard 右下角 ⭐ toggle button
- Header `<details>` dropdown（左起第 1 位，preview top 3）
- `/[lang]/favorites/` SSG 页面（JS hydrate 渲染用户列表）
- 跨 tab 同步（`storage` event 监听）
- Privacy policy 加 1 节说明 localStorage
- i18n 中英双语（13 个新 key × 2 lang = 26 行）

### 不包含（Out of Scope，保留 P2b/P2c 或未来）

- 跨设备同步、用户账户
- Export/Import JSON 收藏
- 收藏夹分类 / 拖拽排序
- Export OGP / Schema 时仅 `WebPage`，不索引用户内容
- Result 导出 PDF、AI 解释、SearchBar 多字段、RelatedTools 分组（这些是独立 P2.x）

---

## 2. 架构（4 层）

```
┌─────────────────────────────────────────────────────────┐
│ UI 层 (Astro components)                                 │
│   ToolCard, Header, [lang]/favorites, privacy-policy    │
└─────────────────────────────────────────────────────────┘
            ▲
            │  data-favorite-* attrs (declarative hooks)
            ▼
┌─────────────────────────────────────────────────────────┐
│ Init 层 (src/scripts/favorites-init.client.ts)          │
│   DOMContentLoaded → scan + bind + cross-tab sync       │
└─────────────────────────────────────────────────────────┘
            ▲
            │  lib.toggle / subscribe
            ▼
┌─────────────────────────────────────────────────────────┐
│ State 层 (src/lib/favorites.ts)                         │
│   read/write/toggle/has/isAvailable/subscribe           │
└─────────────────────────────────────────────────────────┘
            ▲
            ▼
   localStorage['forgeflowkit:favorites:v1']
```

关键：
- **`Set` 在 lib 层，`array` 在 JSON**（dedup 在 lib，序列化 JSON）
- **versioned storage key**：`v1` 后缀，P2b/P2c 用 `:recent:v1`/`:history:v1` 隔离
- **`.client.ts` suffix**：Astro 自动 tree-shake 仅打包到 client
- **`data-favorite-*` data-attrs**：declarative hooks，加新 toggle = 加 attr，无 JS 改动

---

## 3. 文件变更清单

### 新建（3 文件）

| 文件 | 职责 | 行数估计 |
|---|---|---|
| `src/lib/favorites.ts` | state mgmt，pure TS，无 DOM | ~80 |
| `src/scripts/favorites-init.client.ts` | DOM 扫描 + 事件绑定 + 渲染 | ~60 |
| `src/pages/[lang]/favorites.astro` | 收藏页骨架 + JS hydrate | ~100 |

### 修改（7 文件）

| 文件 | 改动 |
|---|---|
| `src/components/ToolCard.astro` | 加 ⭐ button（顶角，toggle state） |
| `src/components/Header.astro` | 加 Favorites `<details>` dropdown |
| `src/layouts/BaseLayout.astro` | `<head>` import favorites-init.client.ts |
| `src/pages/[lang]/privacy-policy.astro` | 加 `## 浏览器存储（Browser Storage）` 段落 |
| `src/i18n/translations.ts` | +13 新 key（en + zh = 26 行） |
| `tests/favorites.test.ts`（新） | lib 单测 21 用例 |
| `tests/favorites-init.test.ts`（新） | init 组件测试 15 用例 |
| `tests/seo-schemas.test.ts` | +1 fixture（WebPage 断言 + 不含 LS data） |

总计 11 文件变动，~500-700 行净增（+70% production / +30% test）。

---

## 4. 数据模型（LS schema）

```ts
// LocalStorage key: 'forgeflowkit:favorites:v1'
interface FavoritesStoreV1 {
  version: 1;                          // schema version
  slugs: string[];                     // 收藏列表（最近添加在前）
  lastUpdated: string;                 // ISO 8601 timestamp
}
```

**JSON 实例：**
```json
{
  "version": 1,
  "slugs": ["solopreneur-mrr-calculator", "solopreneur-ltv-calculator"],
  "lastUpdated": "2026-06-30T08:42:15Z"
}
```

**lib 导出常量与接口：**
```ts
export const FAVORITES_STORAGE_KEY = 'forgeflowkit:favorites:v1';
export const FAVORITES_MAX_ITEMS = 50;

export function read(): string[];
export function write(slugs: string[]): void;
export function toggle(slug: string): { added: boolean; slugs: string[] };
export function has(slug: string): boolean;
export function isAvailable(): boolean;
export function subscribe(cb: () => void): () => void;       // returns unsubscribe

// 错误类型（page-level handling，lib 内部通常吞掉）
export class FavoritesUnavailableError extends Error {}
export class QuotaExceededError extends Error {}
export class SchemaMismatchError extends Error {}
```

**Schema 演进策略：**
- 字段变化 → bump `:v2`，新 key，migrate 函数在首次 v2 调用时执行
- P2b/P2c 各自 key（`:recent:v1`/`:history:v1`），互不干扰
- migrate 函数初始 stub，真实迁移等需要时再写

---

## 5. 数据流

### 用户点击 ⭐

```
[click button]
  └─ init script 读 data-favorite-slug
       └─ lib.toggle(slug)
            ├─ read() 当前 slugs
            ├─ slug 不存在 → 头部插入 → write() LS
            ├─ slug 存在 → 移除 → write()
            ├─ 抛 FavoritesUnavailableError（如 LS 不可用）
            ├─ 抛 QuotaExceededError（仅 slugs.length >= 50 时新加入）
            └─ 内部 dispatch CustomEvent('favorites:change', { detail: newSlugs })

[favorites:change + 'storage' event listeners]
  └─ 重新渲染所有 [data-favorites-container]（按 data-mode 渲染）
```

### 首次加载

```
[BaseLayout import favorites-init.client.ts]
  └─ script defer → DOMContentLoaded
       ├─ scanDocument()：
       │    ├─ 所有 [data-favorite-toggle] → attachClickHandler
       │    └─ 所有 [data-favorites-container] → renderInitial()
       ├─ 监听 window 'storage' event（跨 tab）
       └─ 监听 window 'favorites:change' CustomEvent（同 tab）
```

### 渲染模式

| data-mode | 用途 | 行为 |
|---|---|---|
| `preview` | Header dropdown | top N（默认 3）+ "View all (M) →"；空时显示 "No favorites yet" |
| `full` | `/favorites/` 页 | 全部 slugs 对应 ToolCard grid；空时显示完整 empty state |
| `count` | 预留（P2b 用） | 纯数字徽章 |

---

## 6. UI 行为（4 位置）

### A — ToolCard ⭐

- 位置：ToolCard 右上角外侧
- 状态：未收藏 ⭐ outline（gray-400），已收藏 ⭐ filled（`#7C3AED`）+ `aria-pressed="true"`
- Hover：scale 1.1，过渡 200ms
- `e.stopPropagation()` 阻止与 ToolCard navigate 冲突
- `aria-label`: "Add to favorites" / "Remove from favorites"（中英 i18n）

### B — Header Favorites dropdown

- 位置：Header 左起第 1 个（在 Categories 之前）
- `<details>` element（复用 Categories 同 pattern）
- 数字徽章 `(N)` 紧随文字，0 时隐藏
- dropdown 内显示 top 3 收藏条目
- i18n：标题 "Your Favorites" / "你的收藏"

### C — `/[lang]/favorites/` 页

- SSG HTML，含 title/description/JSON-LD WebPage schema
- Hero：标题 + 副标题 + 右上"3 saved"小字
- 网格：复用 ToolCard 样式（含 ⭐ state）
- Empty state：中央 ⭐ 大图标 + 双语提示 + 浏览按钮（链 `/[lang]/`）

### D — privacy-policy 新段落

```
## 浏览器存储（Browser Storage）

我们在你的浏览器中使用 localStorage 存储以下数据：
- 你收藏的工具列表（最多 50 个）

这些数据：
- 仅存储在你的设备上（不发送至我们的服务器，不跨设备同步）
- 可随时在浏览器设置中清除（站点数据 → 删除）
- 不包含任何可识别个人身份的信息（仅工具 slug）

如果你不希望使用此功能，可使用浏览器的隐私模式或禁用站点数据。
```

中英页面分别写。

---

## 7. 错误处理

### 4 类 error 分类

| 错误 | 触发 | UI 反馈 |
|---|---|---|
| `FavoritesUnavailableError` | LS 不可用 | Header dropdown 灰色 "不可用"；⭐ click → toast |
| `QuotaExceededError` | LS 满 + 添加 | Toast "存储已达上限，请清理后重试" |
| `SchemaMismatchError` | version 错 | 自动 fallback `[]` |
| `InvalidSlugError` | 非合法 slug | console.warn，no-op |

### isAvailable() 缓存策略

- 模块级 cached，模块加载时一次性 probe
- try { LS.setItem('__probe__', '1'); LS.removeItem('__probe__'); } catch → false
- 失败不抛错，返回 boolean

### read() 容错序列

1. LS.getItem → `[]`（不可用）
2. null → `[]`（新用户）
3. JSON.parse fail → `[]`（损坏）
4. version !== 1 → `[]`（schema 旧）
5. slugs 非数组 → `[]`（畸形）
6. 过滤非法 slug（防御）

### Quota 满用户体验

slugs.length >= 50 时新加入返回 `{added: false}`，⭐ button 状态不变，toast 提示。不偷偷丢老数据。

---

## 8. 测试策略

### Layer 1 — `tests/favorites.test.ts`（lib 单测，21 用例）

| 组 | 用例 | 覆盖 |
|---|---|---|
| `read()` | 4 | 空、合法、损坏 JSON、旧 version |
| `write()` | 3 | 正常、quota 抛错、空数组合法 |
| `toggle()` | 5 | 添加、移除、幂等、超 MAX、invalid |
| `has()` | 2 | true / false |
| `subscribe()` | 3 | 触发、unsubscribe 失效、fan-out |
| `isAvailable()` | 3 | 可用、catch false、缓存 |

### Layer 2 — `tests/favorites-init.test.ts`（init 组件测试，15 用例）

| 组 | 用例 |
|---|---|
| DOM 扫描 | 3 |
| Click toggle | 4 |
| storage event | 2 |
| 渲染模式 | 4 |
| 错误处理 | 2 |

### Layer 3 — `tests/seo-schemas.test.ts`（+1 fixture）

```ts
it('favorites page schema is WebPage without user data', () => {
  const html = readFileSync('dist/en/favorites/index.html', 'utf-8');
  expect(html).toContain('"@type":"WebPage"');
  expect(html).toContain('"name":"Favorites"');
  expect(html).not.toContain('forgeflowkit:favorites:v1');  // user data 不入 SSG
});
```

### Coverage 目标

- lib: ≥ 95%
- init script: ≥ 80%

### Not Tested（避免 over-test）

- 浏览器 native dialogs
- LS 实际 5MB 上限
- i18n 翻译文本（已由 check-i18n-completeness.mjs 覆盖）

---

## 9. 未来兼容性（Out of P2a）

### P2a 留下的扩展钩子

1. **versioned storage key**：`forgeflowkit:favorites:v1` 命名空间已隔离 P2b/P2c
2. **同名 pattern**：`data-favorite-*` 可复用到 `data-recent-*` / `data-history-*`
3. **subscribe API**：P2b/P2c 各自 lib 同样签名
4. **独立 MAX_ITEMS**：favorites=50、recent=20、history=100

### P2b 预想（Recent Viewed）

- LS key：`forgeflowkit:recent:v1`
- 触发：进入 `[slug]/` + `/blog/best-{slug}/` 时写入
- UI：Header 第二 dropdown，或合并到 favorites dropdown 顶部区段
- 范围：最多 20 条
- 与 P2a 关系：**完全独立**

### P2c 预想（History Snapshots）

- LS key：`forgeflowkit:history:v1`
- 触发：ResultCard 区域加 [保存结果] 按钮
- UI：`/[lang]/history/` 页 + Header 第三 dropdown
- 与 P2a/P2b 关系：**完全独立**

### 未来演进为"用户账户系统"

如果未来引入用户账户，P2a 可平滑迁移：
- 加 `userId` 字段
- LS 作 offline cache，后端 source of truth
- 但**现阶段 0 用户后端**，纯 LS 是正确的最小实现

---

## 10. Acceptance Criteria

P2a ship 标准：

- [ ] `src/lib/favorites.ts` 提供 6 个导出函数 + 3 错误类型 + 2 常量
- [ ] `src/scripts/favorites-init.client.ts` 自动 scan + bind + re-render
- [ ] `src/pages/[lang]/favorites.astro` SSG + JS hydrate
- [ ] Header `<details>` dropdown 含 top 3 + "View all" + 数字徽章
- [ ] 32 个 ToolCard 都有 ⭐ button（通过 Astro 循环渲染一次实现）
- [ ] Privacy policy 中英各加 `## 浏览器存储（Browser Storage）` 段
- [ ] i18n 13 新 key × 2 lang = 26 行通过 check-i18n-completeness
- [ ] `pnpm check` exit 0（含新增 lib unit test）
- [ ] `tests/favorites.test.ts` 21 用例全 pass
- [ ] `tests/favorites-init.test.ts` 15 用例全 pass
- [ ] `tests/seo-schemas.test.ts` 新增 fixture pass
- [ ] Manual test：开 2 tab → 一边 toggle → 另一边自动更新
- [ ] Manual test：清 LS → 自动 fallback 空状态
- [ ] Manual test：Safari private mode → button click → toast 显示 + dropdown 不可用

## 11. Implementation Plan 计划

- 写 plans：docs/superpowers/plans/2026-06-30-p2a-favorites-plan.md（task-by-task）
- 执行：subagent-driven-development（每 task 1 implementer + 1 spec reviewer + 1 quality reviewer）
- 集成任务：init script + page（cross-file 协作）
- 机械任务：i18n key 填表 + tests 模板（1 reviewer 即可）
- 预期 4-6 task × ~30 min = 半天到 1 天

---

## 12. Self-Review Notes

- ✅ Placeholder scan：0 个 TBD/TODO/占位段
- ✅ Internal consistency：架构 ↔ 文件清单 ↔ schema 一致
- ✅ Scope check：仅 favorites，P2b/P2c 不污染
- ✅ Ambiguity check：所有"必须/应该/可以"已澄清（toggle 行为已 spec out）
- ✅ Out of Scope 已明确列出（避免扩散）
- ✅ Acceptance criteria 量化（21 + 15 + 1 = 37 test 用例 + manual test）
- ✅ 与 P2b/P2c 的边界明确（独立 LS key，独立 lib）

---

## 13. Self-Review (Spec-Level 复审检查)

1. **每个 P2x 独立可 ship**？✅ 是 — 3 个 LS key 隔离，lib 各自独立
2. **数据契约清晰**？✅ 是 — FavoritesStoreV1 接口明确 + version 字段
3. **UI 行为可测试**？✅ 是 — 5 渲染模式 + 4 错误路径
4. **跨 tab 同步处理**？✅ 是 — `storage` event 监听
5. **渐进增强（progressive enhancement）**？✅ 是 — JS-disabled 时 ⭐ 不工作但页面仍可访问
6. **Out of Scope 明确**？✅ 是 — 13 个 ❌ 列出
7. **未来兼容性**？✅ 是 — namespace 隔离 + 版本化 + subscribe API 一致

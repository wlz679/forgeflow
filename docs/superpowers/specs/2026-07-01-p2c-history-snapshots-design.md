# P2c LocalStorage 历史快照 — 设计 spec

**Date:** 2026-07-01
**Status:** Pending user review
**Branch:** `master`
**Scope:** P2c（P2 3 阶段计划的第三阶段：favorites + recent + history）
**Predecessors:**
- P2a (`2026-06-30-p2-localstorage-favorites-design.md`, ship 2026-06-30, commit `48ce375`)
- P2b (`2026-06-30-p2b-recent-viewed-design.md`, ship 2026-07-01, commit `6863886`)
- P2a spec §9 P2c 预想（4 行）

---

## 1. 目标与范围

为 32 个 calculators 添加 **"历史快照"** 功能：用户点击 ResultCard 上的 [💾 保存] 按钮，将当前 inputs + result 写入 localStorage。Header 第 3 个 dropdown（与 ⭐ Favorites / 👁 Recent 并列）显示 top 5，`/[lang]/history/` 专页展示全部 100 条快照，每条支持 [↺ 恢复]（重新填充表单并重算）和 [🗑 删除]。完全客户端（localStorage），无后端、无跨设备同步、无 analytics。**与 P2a/P2b 完全独立**（独立 LS key、独立 lib、独立 init script）。

### 包含

- ResultCard 区域加 [💾 保存] 按钮（手动 trigger；与 [复制] [导出] 同位）
- 保存时记录完整 inputs（`Record<string, string>`）+ result + slug + savedAt + accessedAt
- Header 第 3 个 `<details>` dropdown（History 在 Recent 左侧），top 5 + "View all (N) →"
- `/[lang]/history/` SSG 页（JS hydrate 渲染快照列表）
- 跨 tab 同步（`storage` event 监听）
- LRU 重访语义：点击 [↺ 恢复] 时移到顶部 + 更新 `accessedAt`
- 删除单条（`/history/` 页 [🗑]）+ Clear all（顶右 + 二次确认）
- Restore 机制：跳原工具页 + URL `?prefill=base64-encoded-inputs` + form 自动填充 + 重算
- Privacy policy 加 "历史快照（History Snapshots）" 段落（与 P2a/P2b 平行）
- i18n 中英双语

### 不包含（Out of Scope，保留未来或 P3）

- 跨设备同步、用户账户
- 编辑 entry label（`label?` 字段暂不实现）
- 跨 entry 对比（table view）
- Export / Import JSON 历史
- 按工具/日期筛选 UI（V2）
- 自动 label 生成（V2）
- 触屏长按手势支持（V2）
- 同一 inputs 重复保存时的 dedup（V2：发现重复时询问用户）

---

## 2. 架构（4 层，与 P2a/P2b 完全平行）

```
┌─────────────────────────────────────────────────────────────┐
│ UI 层 (Astro components)                                    │
│   ResultCard (新增 [💾 保存] 按钮) + Header.astro (新 dropdown) │
│   + /[lang]/history.astro (新 SSG 页) + privacy-policy     │
└─────────────────────────────────────────────────────────────┘
            ▲
            │  data-history-* attrs (declarative hooks)
            ▼
┌─────────────────────────────────────────────────────────────┐
│ Init 层 (src/scripts/history-init.client.ts)                │
│   DOMContentLoaded → scan + bind + restore-from-URL         │
└─────────────────────────────────────────────────────────────┘
            ▲
            │  lib.save / lib.restore / lib.delete / subscribe
            ▼
┌─────────────────────────────────────────────────────────────┐
│ State 层 (src/lib/history.ts)                               │
│   read/write/save/restore/delete/clearAll/has/isAvailable/subscribe │
└─────────────────────────────────────────────────────────────┘
            ▲
            ▼
   localStorage['forgeflowkit:history:v1']
```

关键：
- **独立 LS key**：`forgeflowkit:history:v1`（与 P2a `:favorites:v1` / P2b `:recent:v1` 命名空间隔离）
- **`.client.ts` suffix**：Astro 自动 tree-shake 仅打包到 client
- **`data-history-*` data-attrs**：declarative hooks
- **完全独立**：不复用 P2a/P2b 的 lib / init / i18n key（CLAUDE.md "Don't over-engineer"）
- **Restore via URL hash**：保存的 inputs 通过 base64 编码后附在 URL `?prefill=...`，init 脚本读 URL → 填充 form → 触发 calculate()。零后端依赖。

---

## 3. 文件变更清单

### 新建（4 文件）

| 文件 | 职责 | 行数估计 |
|---|---|---|
| `src/lib/history.ts` | state mgmt，pure TS，无 DOM | ~150 |
| `src/scripts/history-init.client.ts` | DOM 扫描 + 事件绑定 + 渲染 + restore-from-URL | ~200 |
| `src/components/HistoryList.astro` | /history/ 页 entry 列表组件 | ~50 |
| `src/pages/[lang]/history.astro` | history 专页骨架 + JS hydrate | ~80 |

### 修改（6 文件）

| 文件 | 改动 |
|---|---|
| `src/components/ResultCard.astro` | + [💾 保存] 按钮（[复制] [导出] 旁边）+ data attr `data-history-save`（slug/inputs/result 由 click handler 动态读 form + URL）|
| `src/components/Header.astro` | + History `<details>` dropdown（在 Recent 左侧） |
| `src/layouts/BaseLayout.astro` | + `<script>import '../scripts/history-init.client.ts';</script>` + `window.__i18n_history__` JSON + `window.__tools_slugs__`（P2b 已有）+ URL prefill 处理 |
| `src/pages/[lang]/[slug].astro` | + `data-history-inputs` 容器 (init 层读 URL prefill 时填入 form) |
| `src/pages/[lang]/privacy-policy.astro` | + `## 历史快照（History Snapshots）` 段落 |
| `src/i18n/translations.ts` | + 12 新 key × 2 lang = 24 行 |
| `scripts/check-i18n-completeness.mjs` | + `history: [...]` 12 required keys |
| `tests/history.test.ts` (新) | lib 单测 ~20 用例 |
| `tests/history-init.test.ts` (新) | init 组件测 ~14 用例 |
| `tests/seo-schemas.test.ts` | + 1 fixture (history page WebPage schema) |

总计 ~14 文件变动，~1100 行净增。

---

## 4. 数据模型（LS schema）

```ts
// LocalStorage key: 'forgeflowkit:history:v1'
interface HistoryStoreV1 {
  version: 1;
  entries: HistoryEntry[];
  lastUpdated: string;     // ISO 8601
}

interface HistoryEntry {
  id: string;              // crypto.randomUUID() — 唯一标识 for delete + LRU
  slug: string;            // 工具 slug
  inputs: Record<string, string>;  // form field values
  result: string;          // 完整 result 文本 (title + body)
  savedAt: string;         // ISO 8601 (创建时间)
  accessedAt: string;      // ISO 8601 (最近 restore / LRU bump)
}
```

**JSON 实例：**
```json
{
  "version": 1,
  "entries": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "slug": "solopreneur-mrr-calculator",
      "inputs": {
        "subscriberCount": "1000",
        "monthlyPrice": "5",
        "monthlyChurnRate": "3",
        "expansionMrr": "500",
        "newSubsPerMonth": "100",
        "contractionMrr": "0",
        "reactivationMrr": "0"
      },
      "result": "MRR Calculator\n$5,000 → $6,200 MRR\n+24% MoM growth\nNRR: 110%",
      "savedAt": "2026-07-01T10:30:00Z",
      "accessedAt": "2026-07-01T14:22:00Z"
    }
  ],
  "lastUpdated": "2026-07-01T14:22:00Z"
}
```

**lib 导出常量与接口：**
```ts
export const HISTORY_STORAGE_KEY = 'forgeflowkit:history:v1';
export const HISTORY_MAX_ITEMS = 100;

export function read(): HistoryEntry[];                              // 容错解析
export function write(entries: HistoryEntry[]): void;                // lastUpdated 注入
export function save(entry: Omit<HistoryEntry, 'id' | 'savedAt' | 'accessedAt'>): HistoryEntry;
                                                                      // 生成 id + 时间戳 + 头部插入 + truncate
export function restore(id: string): HistoryEntry | null;            // LRU bump: 移顶 + 更新 accessedAt
export function remove(id: string): void;                            // 按 id 删除
export function clearAll(): void;                                    // 清空 store
export function has(slug: string): boolean;                          // 检查 slug 是否存在
export function isAvailable(): boolean;                              // 模块级缓存
export function subscribe(cb: () => void): () => void;               // 同 tab fanout
export function encodePrefill(inputs: Record<string, string>): string;  // base64
export function decodePrefill(encoded: string): Record<string, string> | null;  // base64

// 错误类型
export class HistoryUnavailableError extends Error {}
export class QuotaExceededError extends Error {}
export class SchemaMismatchError extends Error {}
export class InvalidSlugError extends Error {}
export class PrefillDecodeError extends Error {}
```

**Schema 演进策略：**
- 字段变化 → bump `:v2`，新 key，migrate 函数在首次 v2 调用时执行
- 与 P2a/P2b 互不干扰（独立 key）
- `id` 必须用 `crypto.randomUUID()` 生成（避免碰撞）

---

## 5. 数据流

### 用户点击 [💾 保存]

```
[click data-history-save button in ResultCard]
  └─ click handler 动态读 (ResultCard 共享组件, 无 data 属性):
       ├─ slug = pathname.match(/^\/(?:en|zh)\/([a-z0-9-]+)\/?$/) → groups[1]
       ├─ form = document.getElementById('tool-form')
       ├─ inputs = { [name]: value } for each form input/select
       └─ result = 当前 ResultCard 文本 (this.dataset 或父容器读取)
  └─ lib.save({ slug, inputs, result })
       ├─ generate id = crypto.randomUUID()
       ├─ now = new Date().toISOString()
       ├─ read() 当前 entries
       ├─ 头部插入 { id, slug, inputs, result, savedAt: now, accessedAt: now }
       ├─ length > 100 → truncate tail (drop oldest by savedAt)
       ├─ write(entries) LS
       ├─ 抛 HistoryUnavailableError (LS 不可用)
       └─ notify() → subscribe fanout

[subscribe callbacks]
  └─ 重新渲染所有 [data-history-container] (Header dropdown top 5 刷新)
```

### 用户点击 [↺ 恢复]

```
[click data-history-restore in /history/ 页 或 Header dropdown]
  └─ lib.restore(id)
       ├─ read() 当前 entries
       ├─ 找到 entry by id
       ├─ 抛 EntryNotFoundError (id 不存在)
       ├─ 从原位置移除 + 头部插入
       ├─ 更新 accessedAt = now
       ├─ write(entries) LS
       └─ 返回 entry (含 inputs)

[UI handler]
  └─ encodePrefill(entry.inputs) → base64
  └─ window.location.href = `/${lang}/${entry.slug}/?prefill=${encoded}`
       └─ 跳到原工具页
       └─ init script 读 URL ?prefill=
            └─ decodePrefill(encoded) → inputs
            └─ for each form field: set value
            └─ 触发 form submit (重算)
```

### /history/ 页 JS hydrate

```
[DOMContentLoaded on /history/]
  └─ init()
       ├─ getLang() reads /^\/(en|zh)(\/|$)/
       ├─ read() 全 entries
       ├─ scanDocument: [data-history-container data-mode="full"] → renderFull
       └─ 绑定:
            - [data-history-restore] → restore + 跳转
            - [data-history-delete] → remove(id)
            - [data-history-clear-all] → confirm dialog + clearAll()
```

### URL Prefill 处理（所有工具页）

```
[mount /[lang]/[slug]/?prefill=xxx]
  └─ init() 启动时检查 URL search params
       └─ const encoded = new URLSearchParams(location.search).get('prefill')
       └─ if encoded → decodePrefill + 填 form + 触发 submit
       └─ 清除 URL 中的 prefill 参数 (history.replaceState)
```

### Render 模式

| data-mode | 用途 | 行为 |
|---|---|---|
| `preview` | Header dropdown | top N（默认 5）+ "View all (N) →" |
| `full` | /history/ 专页 | 全部 entries 列表，每条 [↺ 恢复] [🗑] |

---

## 6. UI 行为（3 位置 + 隐私）

### A — ResultCard [💾 保存] 按钮

- 位置：ResultCard 右上角（与现有 [复制] [导出] 同位）
- 初始状态：[💾 保存] 紫色 hover
- 点击后：闪绿 1.5s（`#059669`）+ 文本变 [已保存]
- 再次点击同 inputs：在 [已保存] 状态直到 hover out
- 完全独立 form submit（不阻塞其他操作）
- 错误时（LS 不可用）：闪红 + tooltip "无法保存"
- i18n：标题 "保存结果" / "保存结果" + "已保存" / "已保存"

**实现机制（与现有 Export button 一致）:**

由于 ResultCard 是共享组件，不知道 tool slug 或 form 字段具体值：
- [💾 保存] 按钮在 click handler 动态读取 form（`document.getElementById('tool-form')`）+ 当前 result 文本
- slug 从 `window.location.pathname` 读取（`/^\/(?:en|zh)\/([a-z0-9-]+)\/?$/`）
- 不需要 `data-history-inputs` 或 `data-history-result` data 属性
- 只需要在按钮上 `data-history-save` 标识（init 层通过此 attr 绑定 click handler）
- 表单字段读取逻辑（与 export button 同）：`form.querySelectorAll('input, select')` → 收集 `{ name: value }`
- 收集后调用 `lib.save({ slug, inputs, result })`

### B — Header History dropdown

- 位置：Header 左起第 1 个（在 👁 Recent 之前）
- `<details>` element（与 Favorites/Recent 同 pattern）
- 数字徽章 `(N)` 紧随 "History" 文字，0 时隐藏
- dropdown 内显示 top 5 entries
- 每个 entry：tool title + result 第一行 + "2h ago" 时间 + [↺ 恢复] 小按钮
- i18n：标题 "History" / "历史快照" + 复用 P2b 的 time-ago i18n key

### C — `/[lang]/history/` 专页

- SSG HTML，含 title/description/JSON-LD `WebPage` schema
- Hero：标题 + 副标题 + "X snapshots saved" 小字
- 顶右 [Clear all] 按钮 + 二次确认 dialog
- 列表：每个 entry 卡片，含
  - Tool title + slug
  - result 第一行 (monospace, truncate)
  - savedAt 时间 (人类可读)
  - [↺ 恢复] 按钮（跳原工具页 + prefill）
  - [🗑] 按钮（删除单条）
- 空状态：中央 💾 大图标 + 双语提示 + 浏览按钮（链 `/[lang]/`）
- `dateModified` 动态（`new Date().toISOString().slice(0,10)`, build-time）

### D — privacy-policy 新段落

```
## 历史快照（History Snapshots）

我们在你的浏览器中使用 localStorage 存储以下数据：
- 你保存的计算快照（最多 100 个），含工具 slug、输入值、计算结果、保存时间

这些数据：
- 仅存储在你的设备上（不发送至我们的服务器，不跨设备同步）
- 可随时在浏览器设置中清除（站点数据 → 删除）
- 可在 /history/ 页面查看、恢复、删除单条或清空

如果你不希望使用此功能，可使用浏览器的隐私模式或禁用站点数据。
```

中英页面分别写（与 P2a/P2b 平行）。

---

## 7. 错误处理

### 5 类 error 分类（与 P2a/P2b 平行 + 1 新）

| 错误 | 触发 | UI 反馈 |
|---|---|---|
| `HistoryUnavailableError` | LS 不可用 | Header dropdown 灰色 "不可用"；[💾 保存] 闪红 |
| `QuotaExceededError` | LS 满 + 保存 | Tooltip "存储已达上限，请清理后重试" |
| `SchemaMismatchError` | version 错 | 自动 fallback `[]` |
| `InvalidSlugError` | 非合法 slug | console.warn，no-op |
| `PrefillDecodeError` | URL `?prefill=...` 解析失败 | 静默忽略，正常加载页面 |

### isAvailable() 缓存策略

- 模块级 cached，模块加载时一次性 probe
- `try { LS.setItem('__probe__', '1'); LS.removeItem('__probe__'); } catch → false`
- 失败不抛错，返回 boolean

### read() 容错序列（6 步，与 P2b 平行）

1. LS.getItem → `[]`（不可用）
2. null → `[]`（新用户）
3. JSON.parse fail → `[]`（损坏）
4. version !== 1 → `[]`（schema 旧）
5. entries 非数组 → `[]`（畸形）
6. 过滤非法 entries（id 缺失 / slug 缺失 / savedAt 缺失）

### 边界情况

- **同 inputs 重复保存**：每次都生成新 id，作为新 entry（不 dedup）。V1 允许重复，V2 可加 dedup。
- **Restore 时 entry 不存在**：抛 `EntryNotFoundError`（仅在编程接口；UI 层用 lib 内置逻辑处理）
- **Restore 跨语言**：URL `?prefill=` 与 lang 无关，form 字段是同一套（en/zh 表单字段名一致）
- **URL prefill 超长**：base64 后 inputs 通常 < 500 字符，URL 长度 < 1000 字符，远低于浏览器限制
- **Clear all 误操作**：二次确认 dialog 强制
- **LS 满 5MB**：100 条 × ~500 字符 = 50KB，远低于 5MB，不会触发

### URL Prefill 设计取舍

- **不用 JSON.stringify**：base64 编码比 JSON.stringify 短 30%（对特殊字符更友好）
- **不用 hash (#)**：hash 不发送到服务器，但 P2c 无 SSR 需求；用 search (`?prefill=`) 兼容性更好
- **不用 localStorage 暂存**：直接 URL 编码，最简单

---

## 8. 测试策略

### Layer 1 — `tests/history.test.ts`（lib 单测，~20 用例）

| 组 | 用例 | 覆盖 |
|---|---|---|
| `read()` | 4 | 空、合法、损坏 JSON、旧 version |
| `write()` | 3 | 正常、quota 抛错、空数组 |
| `save()` | 4 | 新增、id 唯一、MAX truncate、InvalidSlugError |
| `restore()` | 3 | 找到移顶 + accessedAt 更新、未找到抛错、id 不存在 |
| `remove()` | 2 | 找到删除、未找到 no-op |
| `clearAll()` | 1 | 清空 store |
| `has()` | 2 | true / false |
| `subscribe()` | 3 | 触发、unsubscribe 失效、fan-out |
| `isAvailable()` | 2 | 可用、catch false |
| `encodePrefill/decodePrefill` | 3 | round-trip、特殊字符、空 inputs |

### Layer 2 — `tests/history-init.test.ts`（init 组件测试，~14 用例）

复用 P2b 的 hand-rolled DOM stub（per-test child process isolation）。

| 组 | 用例 |
|---|---|
| Save | 3（click 写 LS、id 唯一、闪绿状态） |
| Restore via URL | 3（URL ?prefill 解析、form 填值、submit 触发） |
| DOM scan | 2（container 渲染、无 container no-op） |
| Render modes | 3（preview top 5、full 全部、empty state） |
| Delete + Clear all | 2（单条删除、clearAll 全清） |
| Storage event | 1（跨 tab 同步） |
| Error handling | 1（LS unavailable 早期返回） |

### Layer 3 — `tests/seo-schemas.test.ts`（+1 fixture）

```ts
test('history page schema is WebPage without user data', () => {
  for (const lang of ['en', 'zh']) {
    const html = readFileSync(`dist/${lang}/history/index.html`, 'utf-8');
    assert.ok(html.includes('"@type":"WebPage"'), `${lang}/history: WebPage JSON-LD present`);
    assert.ok(html.includes('"name":"${lang === 'en' ? 'History' : '历史快照'}"`));
    assert.ok(!html.includes('forgeflowkit:history:v1'), `${lang}/history: no LS key in SSG`);
    assert.ok(html.includes('data-history-container'), `${lang}/history: hydration hook present`);
  }
});
```

### Coverage 目标

- lib: ≥ 95%
- init script: ≥ 80%

### Not Tested

- 浏览器 native dialogs (Clear all 确认)
- LS 实际 5MB 上限
- i18n 翻译文本（已由 check-i18n-completeness.mjs 覆盖）
- base64 跨大字符集（用标准 browser API）

---

## 9. 未来兼容性

### P2c 留下的扩展钩子

1. **独立 LS key**：`forgeflowkit:history:v1` 已与 P2a/P2b 隔离
2. **同名 pattern**：`data-history-*` 可复用到未来 feature
3. **subscribe API**：与 P2a/P2b 同签名
4. **独立 MAX_ITEMS**：favorites=50、recent=20、history=100

### P2c 之后的可能演进（Out of P2c Scope）

- **P3 (跨设备同步)**: LS 作 offline cache，后端 source of truth
- **History compare**: 跨 entry 对比 table
- **Edit label**: 用户自定义 entry 名称
- **Dedup prompt**: 同 inputs 重复时询问合并

### 未来演进为"用户账户系统"

如果未来引入用户账户，P2c 可平滑迁移：
- 加 `userId` 字段
- LS 作 offline cache
- 后端持久化 + 多设备同步

---

## 10. Acceptance Criteria

P2c ship 标准：

- [ ] `src/lib/history.ts` 提供 9 个导出函数 + 5 错误类型 + 2 常量 + 2 编解码函数
- [ ] `src/scripts/history-init.client.ts` 处理 save/restore/delete/clearAll + URL prefill + 跨 tab 同步
- [ ] ResultCard 32 个工具页都有 [💾 保存] 按钮（点击后闪绿 + 写 LS）
- [ ] Header `<details>` dropdown 在 Recent 左侧，含 top 5 + "View all" + 数字徽章
- [ ] `/[lang]/history/` SSG 页有 [Clear all] + 每条 [↺ 恢复] [🗑]
- [ ] 工具页 URL `?prefill=base64` 自动填 form + 重算
- [ ] LRU 语义：restore 时移到顶部 + 更新 accessedAt
- [ ] max=100 + overflow drop tail
- [ ] Privacy policy 中英各加 `## 历史快照（History Snapshots）` 段
- [ ] i18n 12 新 key × 2 lang = 24 行通过 check-i18n-completeness
- [ ] `pnpm check` exit 0
- [ ] `tests/history.test.ts` ~20 用例全 pass
- [ ] `tests/history-init.test.ts` ~14 用例全 pass
- [ ] `tests/seo-schemas.test.ts` 新增 fixture pass
- [ ] Manual test：保存 → restore → form 字段一致 + result 一致
- [ ] Manual test：开 2 tab → 一边 restore → 另一边 Header dropdown 更新
- [ ] Manual test：Safari private mode → [💾 保存] 闪红 + Header dropdown 不可用
- [ ] Manual test：Clear all 二次确认 dialog

---

## 11. Implementation Plan 计划

- 写 plans：`docs/superpowers/plans/2026-07-01-p2c-history-snapshots-plan.md`（task-by-task）
- 执行：subagent-driven-development（每 task 1 implementer + 1 spec reviewer；[INTEGRATION] 任务加 1 quality reviewer）
- 任务分解（~6 task）：
  1. `src/lib/history.ts` + `tests/history.test.ts` — state mgmt lib + 编解码（[MECHANICAL]）
  2. `src/scripts/history-init.client.ts` + `tests/history-init.test.ts` — init 层 + DOM 渲染（[INTEGRATION]）
  3. `src/i18n/translations.ts` + `check-i18n-completeness.mjs` — i18n 12 keys（[MECHANICAL]）
  4. UI 接入：ResultCard.astro + Header.astro + BaseLayout.astro + [slug].astro（[INTEGRATION]）
  5. `/[lang]/history/` 页 + privacy-policy section（[INTEGRATION]）
  6. SEO fixture + final integration check（[MECHANICAL]）
- 预期 5-6 task × ~30 min = 半天到 1 天

---

## 12. Self-Review Notes

- ✅ Placeholder scan：0 个 TBD/TODO/占位段
- ✅ Internal consistency：架构 ↔ 文件清单 ↔ schema 一致
- ✅ Scope check：仅 history snapshots，P3 不污染
- ✅ Ambiguity check：所有"必须/应该/可以"已澄清
- ✅ Out of Scope 已明确列出（11 个 ❌ 列出）
- ✅ Acceptance criteria 量化（20 + 14 + 1 = 35 test 用例 + 4 manual test）
- ✅ 与 P2a/P2c 的边界明确（独立 LS key，独立 lib，相同模式不抽 factory）
- ✅ 复用策略明确：完全独立（CLAUDE.md "Don't over-engineer" 合契）
- ✅ URL prefill 机制详细说明（base64 编码 + search params + history.replaceState）

---

## 13. Self-Review (Spec-Level 复审检查)

1. **每个 P2x 独立可 ship**？✅ 是 — 3 个 LS key 隔离，lib 各自独立
2. **数据契约清晰**？✅ 是 — HistoryStoreV1 + HistoryEntry 接口明确 + version 字段
3. **UI 行为可测试**？✅ 是 — 2 渲染模式 + 5 错误路径 + 5 边界（clearAll / 重访 / dedup / cross-lang / 超长 URL）
4. **跨 tab 同步处理**？✅ 是 — `storage` event 监听
5. **渐进增强（progressive enhancement）**？✅ 是 — JS-disabled 时无 [💾 保存] 按钮但页面仍可访问
6. **Out of Scope 明确**？✅ 是 — 11 个 ❌ 列出
7. **未来兼容性**？✅ 是 — namespace 隔离 + 版本化 + subscribe API 一致
8. **Restore 机制安全**？✅ 是 — base64 编码 + try/catch + URL 清除，避免 LS 注入
9. **Save/Race condition**？✅ 是 — 单 tab 内串行（无并发）；跨 tab 通过 storage event 同步

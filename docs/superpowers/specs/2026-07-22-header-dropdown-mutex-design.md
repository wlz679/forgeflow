# Header 下拉互斥脚本 — 设计 spec

**Date:** 2026-07-22
**Status:** Pending user review (brainstorming approved 2026-07-22)
**Branch:** `master`
**Scope:** Bug fix — 1 new file + 1 line in BaseLayout + 4 attrs in Header.astro
**Trigger:** User-reported UI bug — multiple `<details>` dropdowns in Header overlap when opened sequentially (see screenshot in chat).

---

## 1. 目标与范围

### 目标

修复 Header 4 个原生 `<details>` 下拉（history / recent / favorites / categories）依次打开时**重叠**的 UI bug（截图中三个面板同时 open 互相覆盖）。

### 根因

`src/components/Header.astro` 行 40 / 53 / 66 / 77 渲染 4 个独立 `<details>` 元素。HTML 规范允许多个 `<details>` 同时 open，浏览器原生管理开合无互斥逻辑。三个 init 脚本（history-init / recent-init / favorites-init）均未在 summary 上注册互斥 toggle（已交叉验证）。

### 包含

- 新增 `src/scripts/header-dropdown-mutex.client.ts`（~50 行）：监听 4 个 details 的 click + document click + keydown，强制全局至多 1 个打开
- `src/layouts/BaseLayout.astro` 新增 1 行 `<script>` 引入
- `src/components/Header.astro` 给 4 个 `<details>` 加 `data-dropdown="..."` 属性（4 处）
- 新增 `tests/header-dropdown-mutex.test.ts`（~200 行）：5 个 `node:test` 用例覆盖核心行为（hand-rolled DOM stub + `spawnSync` per-test，沿用项目 `tests/favorites-init.test.ts` 模式）

### 不包含（Out of Scope）

- 改造 `<details>` 为 `<button>` + 条件渲染面板（YAGNI：当前 bug 是开合协调问题，非架构问题）
- aria-expanded / aria-haspopup 等无障碍增强（YAGNI：原生 `<details>` 已具备语义）
- 焦点管理 / focus trap（YAGNI：纯鼠标 + 简单键盘场景）
- 跨页面下拉状态保持（页面刷新下拉自然关闭，期望行为）
- animation / transition 优化（YAGNI）

---

## 2. 架构

```
BaseLayout.astro (modified — 1 line added)
  └─ <script> import '../scripts/header-dropdown-mutex.client.ts'; (NEW)
        ↓ registers 3 document-level listeners
Header.astro (modified — 4 data-dropdown attrs)
  ├─ <details data-dropdown="history">     ─┐
  ├─ <details data-dropdown="recent">       ├─ 共享 data-dropdown 属性
  ├─ <details data-dropdown="favorites">    │  供 mutex 脚本识别
  └─ <details data-dropdown="categories"> ─┘
```

**单一职责**：`header-dropdown-mutex.client.ts` 仅负责 4 个下拉的开合互斥协调，**不读 LS / 不渲染面板 / 不依赖 init 脚本**。Init 脚本（history-init / recent-init / favorites-init）继续负责面板内容渲染、badge 更新、保存逻辑 — 互不耦合。

---

## 3. 文件变更清单

### 新建 — `src/scripts/header-dropdown-mutex.client.ts` (~50 行)

```ts
const DROPDOWN_SELECTOR = 'details[data-dropdown]';

function closeAllExcept(target: HTMLDetailsElement | null): void {
  document.querySelectorAll<HTMLDetailsElement>(DROPDOWN_SELECTOR).forEach(d => {
    if (d !== target && d.open) d.open = false;
  });
}

// 1) summary click → 互斥 toggle
document.addEventListener('click', (e) => {
  const summary = (e.target as Element | null)?.closest('summary');
  const details = summary?.parentElement;
  if (!details?.matches(DROPDOWN_SELECTOR)) return;
  e.preventDefault(); // 拦截浏览器原生 toggle
  const wasOpen = details.open;
  closeAllExcept(details);
  details.open = !wasOpen;
});

// 2) document click（非 summary / 非 panel 内）→ 全部关闭
document.addEventListener('click', (e) => {
  const target = e.target as Element | null;
  if (target?.closest('summary')) return; // summary click 走上面分支
  if (target?.closest(`[data-dropdown] > *:not(summary)`)) return; // 面板内部不关
  closeAllExcept(null);
});

// 3) ESC → 全部关闭
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllExcept(null);
});
```

### 修改 — `src/layouts/BaseLayout.astro` (+1 行)

在行 162（favorites-init 之前）新增：

```astro
<script>
  import '../scripts/header-dropdown-mutex.client.ts';
</script>
```

**位置理由**：语义上"先注册互斥基础，再注册面板内容"，且与现有 5 个 init 脚本的引入顺序风格一致。

### 修改 — `src/components/Header.astro` (+4 attrs)

| 行号 | 当前 | 新 |
|---|---|---|
| 40 | `<details class="relative group">` | `<details class="relative group" data-dropdown="history">` |
| 53 | `<details class="relative group">` | `<details class="relative group" data-dropdown="recent">` |
| 66 | `<details class="relative group">` | `<details class="relative group" data-dropdown="favorites">` |
| 77 | `<details class="relative group">` | `<details class="relative group" data-dropdown="categories">` |

**不修改 class、不修改 summary、不修改 panel 内容**。

### 新建 — `tests/header-dropdown-mutex.test.ts` (~80 行)

`node:test` + 手写 DOM stub + `spawnSync` per-test（项目惯例，`tests/favorites-init.test.ts` 已有同类模式），覆盖 5 个核心行为：

| # | 用例 | 断言 |
|---|------|------|
| 1 | 默认：4 个 details 都 `open=false` | DOM 初始状态 |
| 2 | 点 history summary → history.open=true，其他 false | 互斥 |
| 3 | history.open 后点 recent summary → history.open=false, recent.open=true | 互斥 |
| 4 | history.open 后按 ESC → 全部 open=false | ESC |
| 5 | history.open 后点 document.body → history.open=false | 点击外部 |

---

## 4. 数据流

| 触发 | 处理路径 | DOM 副作用 |
|------|---------|-----------|
| 用户 click summary (X) | click listener #1 → preventDefault → closeAllExcept(X) → toggle X | 至多 1 个 `[open]` |
| 用户 click 非 summary 非面板 | click listener #2 → closeAllExcept(null) | 全部 `[open]` 移除 |
| 用户 click 面板**内**非链接空白 | click listener #2 → `closest('[data-dropdown] > *:not(summary)')` 命中 → return | 无变化 |
| 用户 click 面板**内**链接 | 浏览器原生导航（Astro 静态站 → 页面换） | 下拉随页面消失 |
| 用户按 ESC | keydown listener → closeAllExcept(null) | 全部 `[open]` 移除 |
| 用户按 ESC 时无下拉 open | keydown listener → closeAllExcept(null) 无副作用 | 无变化 |

**无 localStorage、无网络请求、无第三方依赖**。纯 DOM 协调，加载即生效。

---

## 5. 关键交互决策（已锁定）

| # | 场景 | 行为 |
|---|------|------|
| ① | 点 history summary 打开 → 再点 history summary | toggle 关闭（保留原生 details 行为） |
| ② | 点 history 打开 → 点 recent summary | history 关，recent 开（互斥） |
| ③ | 点 history 打开 → 点 history 面板**内**空白 | history 保持开（避免误触） |
| ④ | 点 history 打开 → 点 history 面板**内**链接 | history 保持开 → 浏览器跳转 → 页面换下拉自然消失 |
| ⑤ | 点 history 打开 → 点页面**外部**（hero / footer / body） | history 关（期望行为） |
| ⑥ | 点 history 打开 → 按 ESC | history 关（期望行为） |
| ⑦ | 4 个 details 都关闭时按 ESC | 无操作 |
| ⑧ | 重复点同一个 summary | toggle（开 → 关 → 开） |

---

## 6. 错误处理 / 边界

| 边界 | 行为 |
|------|------|
| `<details>` 无 `data-dropdown` 属性 | `querySelectorAll` 跳过，非目标 details 不受影响 |
| `e.target` 为文本节点（罕见） | `closest()` 在非 Element 上调用 TS 类型已保护；运行时空值 return |
| 重复 import（理论不会发生） | `addEventListener` 会重复注册 → 重复执行 toggle → 但行为幂等（最终 `open` 状态一致） |
| SSR 环境 | `*.client.ts` 后缀让 Astro 仅打包到 client bundle，无 SSR 报错 |
| jsdom-free 测试环境 | `node:test` + 手写 DOM stub（项目惯例，无 jsdom 依赖）；5 个 `spawnSync` 测试用例覆盖核心场景 |
| 浏览器 disable JS | `<details>` 退化为原生行为（可独立开合），属降级而非 bug |

---

## 7. 风险评估

| 风险 | 等级 | 缓解 |
|------|------|------|
| preventDefault 拦截 summary click 影响嵌套 `<a>` | 低 | Header 现有 summary 仅含 `<span>`/`<svg>`，无 `<a>` |
| 手写 DOM stub 模拟 click 与真实浏览器 `e.target` 差异 | 低 | 5 个测试覆盖核心 click + ESC + 外部 click；e2e 浏览器验证在 pnpm build 后手动跑 |
| iOS Safari `<details>` 兼容性 | 低 | 项目已有 4 个 details 在生产稳定运行（P2a/P2b/P2c 期间验证过） |
| 性能开销（3 个 document-level listener） | 极低 | click 路径 1 行 closest 判断，零 DOM reflow |
| 4 个 data-dropdown 属性命名冲突 | 零 | 新增属性，无既有 `data-dropdown` |

---

## 8. 全局约束

1. **pnpm check 必须 0 错误** — commit 前通过 typecheck + test:run
2. **不动现有 init 脚本** — history-init / recent-init / favorites-init 的 LS 逻辑、面板渲染、badge 更新全部保留
3. **不动 Header.astro 的 class / 结构** — 仅加 `data-dropdown` 属性
4. **3-way sync** — origin (gitee: wlz679/calcKit) + github (github: wlz679/forgeflow) 需同步最终 commits
5. **pre-commit hook** — `core.hooksPath=.githooks`，`codegen-examples.mjs --check` 自动跑（与本任务无关，应自动通过）
6. **ship 流程** — 遵循 P44 bypass 模式（`git -c core.hooksPath=/dev/null push github master` 防 hook stale-cache 误报）

---

## 9. 验证清单（实施后逐项勾选）

- [ ] pnpm check 通过（typecheck + test:run）
- [ ] pnpm build 通过（313+ 静态页生成）
- [ ] 手动浏览器验证 4 个下拉：依次打开只显示 1 个
- [ ] ESC 键关闭已打开下拉
- [ ] 点击 hero / footer 区域关闭已打开下拉
- [ ] 点击面板内空白保持打开
- [ ] 点击面板内链接正常跳转
- [ ] 移动端 Safari 测试（iOS 模拟器或远程验证）
- [ ] 3-way sync 完成（origin + github + local 一致）

---

## 10. 后续 P55+ 候选（不在本任务范围）

- **aria-expanded 属性增强**：原生 `<details>` 已有 `open` 反映给 AT，但显式 `aria-expanded` 可增强屏幕阅读器体验
- **focus trap**：下拉打开时焦点困在面板内（重度键盘用户场景）
- **下拉打开动画**：原生 details 无动画，CSS `details[open] summary ~ *` transition 可加
- **点击面板内空白关闭**：与当前"避免误触"取舍相反，部分产品如 Notion 倾向关

以上均 YAGNI，待 P54 ship 后视用户反馈决定。
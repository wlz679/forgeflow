# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **"入河排口智能监控系统"** (River Outlet Intelligent Monitoring System) — a Vue 3 admin SPA built on top of [pure-admin-thin](https://github.com/pure-admin/pure-admin-thin). It manages river drainage outlets, video/water-quality monitoring, alarms, maintenance work orders, and statistical analysis for environmental monitoring in Chengdu.

## Commands

```bash
pnpm dev                # Dev server (development mode, port 10086)
pnpm dev:test           # Dev server (test mode)
pnpm dev:gk             # Dev server (gk mode)
pnpm build              # Production build
pnpm build:staging      # Staging build
pnpm build:lib          # Library-mode build (BUILD_MODE=lib)
pnpm preview            # Preview built app
pnpm lint               # Run all linters (eslint + prettier + stylelint)
pnpm lint:eslint        # ESLint only
pnpm lint:prettier      # Prettier only
pnpm lint:stylelint     # Stylelint only
pnpm typecheck          # TypeScript + vue-tsc type check (no emit)
pnpm report             # Build with rollup-plugin-visualizer
pnpm clean:cache        # Nuke node_modules, lockfile, cache and reinstall
```

**Requires pnpm** — enforced via `preinstall` script. Node `^20.19.0 || >=22.13.0`.

## Tech Stack

- **Vue 3.5** + **TypeScript 5.9** + **Vite 7**
- **Element Plus 2.11** (UI framework, full import, Chinese locale)
- **Pinia 3** (state management)
- **Tailwind CSS 4** (via `@tailwindcss/vite`)
- **ECharts 6** (charts)
- **Axios** with custom wrapper at `src/utils/http/`
- **Casdoor** (`casdoor-vue-sdk`) for SSO authentication
- **AMap** (高德地图) for map features
- **video.js** + **flv.js** + **hls.js** for video playback

## Architecture

### Build System (`build/`)

`vite.config.ts` delegates to `build/plugins.ts`, `build/optimize.ts`, and `build/utils.ts`. The build system supports both **app mode** and **library mode** (`BUILD_MODE=lib`). CDN externalization is controlled by `VITE_CDN` env var.

### Router (`src/router/`)

Routes are **auto-imported** from `src/router/modules/**/*.ts` (excluding `remaining.ts`) via Vite's `import.meta.glob`. Each route module exports a `RouteRecordRaw[]`. Route components at `/src/views/**/*.{vue,tsx}` are also auto-globbed — the router resolves component strings to actual modules in `router/utils.ts`.

Route rank ordering: menu items are sorted by `meta.rank`. Home must be rank 0. See `src/router/enums.ts` for rank constants organized by business module.

Auth guards in `router/index.ts` check tokens and dynamically fetch menus via `menuRoleApi`.

### Store (`src/store/`)

Pinia with modules: `app` (sidebar/layout state), `epTheme`, `multiTags` (tab management), `permission` (route permissions), `settings`, `user` (roles/permissions/profile).

### HTTP Client (`src/utils/http/`)

Custom `PureHttp` class wrapping Axios with:

- Automatic Bearer token injection
- 401 handling with token refresh queue (prevents concurrent refresh)
- Response error routing to login page

### Auth Flow

Casdoor SDK handles the SSO login flow. On success, tokens are stored in localStorage under key `user-info`. Auth guards check token existence and call `menuRoleApi` to fetch dynamic menus. Route permissions are filtered by returned roles.

### Config System (`src/config/`)

At startup, `getPlatformConfig()` fetches `public/platform-config.json` and merges it into `app.config.globalProperties.$config`. Env files (`.env`, `.env.development`, `.env.test`, `.env.gk`, `.env.production`, `.env.staging`) configure API base URLs, CDN mode, and Casdoor environment selection.

### Directory Conventions

| Directory         | Purpose                                                                             |
| ----------------- | ----------------------------------------------------------------------------------- |
| `src/views/`      | Page components, organized by business domain                                       |
| `src/components/` | Shared/reusable components (Re-prefixed: ReDialog, ReAuth, ReUpload, etc.)          |
| `src/api/`        | API endpoint functions, one file per domain                                         |
| `src/utils/`      | Utilities: `auth.ts`, `dict.ts` (business enums/maps), `district.ts`, `function.ts` |
| `src/layout/`     | Admin shell: sidebar, navbar, tags view, frame/redirect pages                       |
| `src/directives/` | Custom Vue directives                                                               |
| `src/style/`      | SCSS + Tailwind entry points                                                        |
| `types/`          | Global TypeScript declarations                                                      |
| `mock/`           | Mock API handlers (vite-plugin-fake-server)                                         |

### Business Domain Views

- `pkManagement` — 排口管理 (outlet management)
- `alarmCenter` — 告警中心 (alarm/alert processing)
- `monitorCenter` — 监控中心 (video monitoring, online/offline status)
- `waterQualityMonitor` — 水质监测 (water quality monitoring + statistics)
- `maintenanceManage` — 运维管理 (work orders, maintenance)
- `analysis` — 统计分析 (statistical analysis dashboards)
- `processCenter` — 流程中心 (approval workflows)
- `dashboardManage` — 数据看板 (overview dashboard)
- `system` — 系统管理 (system settings, user/role/dept management)
- `recordManage` — 记录管理 (records/audit logs)

### Utility Files of Note

- `src/utils/dict.ts` — Central dictionary of all business enums (drainage types, work order statuses, device types, etc.) mapped to select options
- `src/utils/function.ts` — Shared helper functions including `mapToOptions`, error handling, etc.
- `src/utils/district.ts` — Chengdu district data for cascading selectors
- `src/utils/auth.ts` — Token management (`getToken`, `setToken`, `removeToken`, `hasPerms`)

## Git Hooks

- **pre-commit**: Runs `lint-staged` (ESLint + Prettier + Stylelint on staged files per `.lintstagedrc`)
- **commit-msg**: `commitlint` enforcing conventional commits (feat, fix, perf, style, etc.)

## Communication Style

- **Page layout / UI structure**: When discussing page layouts, component arrangements, or UI structure, prefer visual communication — use ASCII diagrams, wireframe mockups, or component tree sketches to convey the design, not text descriptions alone.

## Superpowers Workflow (自动编排) ★

收到指令先分类，再动手。不要先问问题、先读代码、先解释——先分类，先调 Skill。

**快速通道**：用户说"继续/可以/开始/改吧/好"，或改动明显是单文件小修 → 直接处理，不走 Skill。

| 场景                                   | → Skill                                      |
| -------------------------------------- | -------------------------------------------- |
| 🐛 Bug/报错/测试失败                   | `superpowers:systematic-debugging`           |
| 🆕 新功能/新页面/新模块                | `superpowers:brainstorming`                  |
| 📐 重构/多步骤/跨多文件                | `superpowers:writing-plans`                  |
| 📋 有 plan 文件 + "执行/继续"          | `superpowers:executing-plans`                |
| 🔍 代码写完、commit 前（复杂改动可选） | `superpowers:requesting-code-review`         |
| ✅ "完成/好了/做完了"                  | `superpowers:verification-before-completion` |
| 🚀 "合并/PR/发布"                      | `superpowers:finishing-a-development-branch` |
| ➖ 以上都不匹配                        | 直接处理                                     |

### 推荐执行链

从上到下串联，不跳步：

```
新功能/新模块:
brainstorming → writing-plans → executing-plans → requesting-code-review → verification-before-completion

Bug修复:
systematic-debugging → verification-before-completion

重构/跨文件改动:
writing-plans → executing-plans → requesting-code-review → verification-before-completion
```

### 强制规则（不可跳过）

1. **先匹配，后说话** — 收到用户第一条消息，先对决策路由表（注意快速通道），命中即调 Skill，调完 Skill 再回复。不允许先说"我来帮你xxx"再调 Skill。**陈述假设、呈现权衡**——面临多种实现路径时，列出选项和利弊，不替用户做选择。有更简单的方案时主动提出
2. **先读懂，再动手** — 改文件前必须先读文件，理解其职责、数据流和上下游关系。不确定时用 `codegraph_context` 或 `codegraph_trace` 摸清调用链。禁止在不理解代码意图的情况下修改
3. **TDD 按场景** — 新写纯函数/工具函数/数据映射逻辑前先写测试。接入 API、替换 mock、简单 CRUD 等已有测试覆盖的场景不需要 TDD
4. **拒绝假测试** — 测试必须验证真实行为，禁止以下形式：
   - 空断言（`expect(true).toBe(true)`）
   - 仅测 mock 不测真实逻辑
   - 绕过核心逻辑只测无关细节
   - 为覆盖率而写的无用测试
     每条测试用例失败时能准确指出哪里坏了，才是有效测试
5. **简洁优先** — 只写解决问题所需的最少代码。不为单次使用创建抽象层，不添加未被要求的"灵活性"或"可配置性"，不为不可能发生的场景写错误处理。如果 200 行能变 50 行，重写它。试金石：高级工程师看了会说"过度设计"吗？
6. **精准变更** — 只改必须改的代码，不动相邻代码。不重构没坏的东西，不顺手改格式/注释/import 排序。匹配现有代码风格，即使你更倾向另一种写法。发现无关死代码 → 提出来，但不要擅自删除。测试：每一行改动都必须能追溯到用户的请求
7. **提交前过质量门禁** — 每次 commit 前必须 `pnpm check`（typecheck + test:run），零错误才能提交。复杂改动可额外调 `Skill("superpowers:requesting-code-review")`
8. **冲突不妥协** — 合并冲突、架构冲突、需求与现状矛盾时，不走捷径、不掩盖、不强行合并。先理解双方意图，再决定保留/舍弃/重构，不确定时列出选项给用户决断
9. **问题必报** — review 或 test 发现问题，列表给用户，由用户决断，不擅自改。遇到不确定、不理解、无法验证的情况，立即说明，绝不隐瞒
10. **Skill 工具优先** — 用 `Skill` 工具调用技能，不要用 Read 读技能文件
11. **代码注释** — 以下位置必须写注释，给新人看的：
    - **数据流/调用链** — 跨接口编排（如"柱状图+环形图数据来自 A 接口，表格数据来自 B 接口"）
    - **字段映射** — API DTO → UI 字段的非同名转换（如 `finished_count` → 表格"已完结"列）
    - **非显而易见的业务规则** — 如百分比转换、状态码映射、秒数格式化公式
    - **不用写** — 自解释代码、Vue/Element Plus 框架常识

### 防偷懒规则（不可跳过）★

这些规则针对一个反复出现的问题：Claude 只完成"基础设施"或"单个入口"，但遗漏了需要同样改动的其他消费者页面。

**1. 端到端完备 — 不交付"半截功能"**

改一个功能时，必须追溯到**所有消费端**。典型反例：

- 只改了共享组件（如 `DownloadRecords`），但没把所有页面的 `onExport` 接进去
- 只改了 API 定义，但没把调用方从 mock 换成真实接口
- 只改了一个 tab 的逻辑，但没改同页面其他 tab

**正确做法**：接到功能需求后，先搜索全局找出**所有相关点**，列出清单，逐一处理。清单未清零 = 功能未完成。

**2. 主动全域扫描 — 动手前先摸底**

改功能前必须：

```bash
# 搜索所有可能受影响的文件
grep -rn "关键词" src/
```

扫描后输出影响面清单，逐层确认：

| 层级       | 是否受影响 | 具体文件/符号 |
| ---------- | ---------- | ------------- |
| API        | □          |               |
| Store      | □          |               |
| Hook       | □          |               |
| Component  | □          |               |
| View       | □          |               |
| Route      | □          |               |
| Permission | □          |               |
| Test       | □          |               |
| Util       | □          |               |
| Layout     | □          |               |

所有勾选项必须检查，不得遗漏。

**3. 自问"还有什么" — 声称完成前的自查**

每次说"完成"之前，反问自己三个问题：

- 还有没有其他页面/组件/模块需要同样的改动？
- 所有占位符/空函数都处理完了吗？
- 用户描述的场景从头到尾能走通吗？

三个问题任意一个回答"不确定"或"没查过"，那就还没完成。继续查，继续改。

**4. 真实案例回顾**

以下对话模式**每次都要识别**，不得重演：

| 用户说          | 典型错误做法        | 正确做法                             |
| --------------- | ------------------- | ------------------------------------ |
| "接入真实 API"  | 只改了共享组件      | 搜索所有调用方/占位符，每一处都接入  |
| "完善 X 功能"   | 只改了一个页面/入口 | 检查所有相似页面/入口是否同样需要改  |
| "替换/迁移 XXX" | 改了一处就停        | 全局搜索旧调用，全量替换，确认无残留 |

**5. 覆盖率终验 — 宣布完成前的最后一道关**

每次声称"完成"前，必须执行（按项目实际情况增删关键词）：

```bash
grep -rn "TODO" src/
grep -rn "FIXME" src/
grep -rn "mock" src/          # JS/TS 项目；其他语言删
grep -rn "placeholder" src/
grep -rn "开发中" src/         # 中文项目；其他语言替换
```

确认无残留的 TODO、mock 调用、占位逻辑、空实现、临时代码。有任一命中 → 未完成，继续处理。

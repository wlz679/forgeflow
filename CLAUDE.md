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

| 场景 | → Skill |
|------|---------|
| 🐛 Bug/报错/测试失败 | `superpowers:systematic-debugging` |
| 🆕 新功能/新页面/新模块 | `superpowers:brainstorming` |
| 📐 重构/多步骤/跨多文件 | `superpowers:writing-plans` |
| 📋 有 plan 文件 + "执行/继续" | `superpowers:executing-plans` |
| 🔍 代码写完、commit 前（复杂改动可选） | `superpowers:requesting-code-review` |
| ✅ "完成/好了/做完了" | `superpowers:verification-before-completion` |
| 🚀 "合并/PR/发布" | `superpowers:finishing-a-development-branch` |
| ➖ 以上都不匹配 | 直接处理 |

### 强制规则（不可跳过）

1. **先匹配，后说话** — 收到用户第一条消息，先对决策路由表（注意快速通道），命中即调 Skill，调完 Skill 再回复。不允许先说"我来帮你xxx"再调 Skill
2. **TDD 按场景** — 新写纯函数/工具函数/数据映射逻辑前先写测试。接入 API、替换 mock、简单 CRUD 等已有测试覆盖的场景不需要 TDD
3. **提交前过质量门禁** — 每次 commit 前必须 `pnpm check`（typecheck + test:run），零错误才能提交。复杂改动可额外调 `Skill("superpowers:requesting-code-review")`
4. **问题必报** — review 或 test 发现问题，列表给用户，由用户决断，不擅自改
5. **Skill 工具优先** — 用 `Skill` 工具调用技能，不要用 Read 读技能文件

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
grep -rn "关键词" src/ --include="*.vue" --include="*.ts" --include="*.tsx"
```

例如改导出功能前，搜 `onExport\|handleExport\|导出功能开发中` 找出所有占位符页面。

**3. 自问"还有什么" — 声称完成前的自查**

每次说"完成"之前，反问自己三个问题：
- 还有没有其他页面/组件/模块需要同样的改动？
- 所有占位符/空函数都处理完了吗？
- 用户描述的场景从头到尾能走通吗？

三个问题任意一个回答"不确定"或"没查过"，那就还没完成。继续查，继续改。

**4. 真实案例回顾**

以下对话模式**每次都要识别**，不得重演：

| 用户说 | Claude 做了 | 应该做 |
|--------|------------|--------|
| "接入真实 API" | 只改了 `DownloadRecords` 组件 | 搜遍所有 `onExport` 占位符，10 个页面逐一接入 |
| "完善导入功能" | 只改一个页面的 import | 检查所有页面的相似按钮是否也要改 |
| "接入 XXX 接口" | 改 API + 一个调用方 | 搜索所有调用旧接口/mock 的地方，全量替换 |
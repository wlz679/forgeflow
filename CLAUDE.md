# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vue 3 + TypeScript + Vite mobile webview for an industrial water monitoring platform. Uses `amfe-flexible` + `postcss-pxtorem` for viewport adaptation.

## Build & Development Commands

```bash
npm run dev                 # Development
npm run dev:test            # Test environment
npm run dev:production      # Production environment

npm run build               # Type-check + build
npm run build:test          # Type-check + build (test)
npm run build:production    # Type-check + build (prod)

npm run preview             # Preview production build
```

`build` runs `vue-tsc` for type checking before `vite build` — treat TypeScript errors as build failures.

## Environment Variables

Each `.env.*` file defines:

- `VITE_ENV` — `development`, `test`, or `production`
- `VITE_BASE_API` — backend API target (proxied through `/v` in dev)
- `VITE_PUBLIC_PATH` — deployment base path

## Architecture

### Routing

- Uses `createWebHashHistory`
- Root `/` redirects to `/home`
- Catch-all `/:pathMatch(.*)*` renders noRbac page
- Three routes bypass Layout: `/login`, `/register`, `/externalLink`

### Directory Layout

```
src/
├── api/              # HTTP API modules
│   ├── request.ts    # Axios instance, interceptors
│   ├── user.ts       # Auth (login, password)
│   ├── global.ts     # Shared endpoints (upload, simple lists)
│   └── rbac.ts       # Permission management
├── router/
│   ├── index.ts      # Router creation, beforeEach guard
│   ├── routes.ts     # Aggregated routes
│   └── common.ts     # Shared routes (login, home, noRbac)
├── store/
│   ├── pinia.ts      # Pinia instance
│   └── user.ts       # User store (token, role) — persisted via @vueuse/core useStorage
├── components/
│   ├── Layout/       # Header, SubHeader, userInfo
│   ├── BaseTable/    # Reusable table component
│   ├── BaseCard/     # Reusable card component
│   ├── DatetimePicker/
│   ├── DownloadRecords/
│   ├── pagination/
│   ├── Query/        # Select/input query components
│   └── Vchart/       # Chart components (stubs)
├── utils/
│   ├── function.ts   # Utility library (error handling, validation, password utils)
│   ├── token.ts      # Token get/set helpers
│   ├── eventBus.ts   # Simple reactive event bus
│   ├── interface.ts  # Shared TypeScript interfaces
│   └── dict/         # Dictionary configs: common.ts
├── views/
│   ├── registerLogIn/login/  # Login page
│   ├── Home.vue      # Simple home page
│   ├── externalLink.vue
│   └── noRbac.vue
├── App.vue           # Root component
├── main.ts           # Entry point
└── style.css
```

### State Management

Single Pinia store (`user`) holds: `name`, `token`, `tokenExp`, `Role`. All state fields use `@vueuse/core`'s `useStorage` for automatic localStorage persistence. Actions: `login`, `logout`, `removeToken`, `dispatchToken`.

### HTTP Client (`src/api/request.ts`)

Axios instance with baseURL `/v2`. Request interceptor attaches `Authorization: Bearer <token>`. Response interceptor handles error codes: 221/222/223/214 → redirect to login, 403 → reject. Exports `request` object with `get`, `post`, `patch`, `put`, `delete` methods.

### UI Libraries

- **Vant 4** — primary mobile UI. Auto-imported via `unplugin-vue-components` with `VantResolver`.

### Key Patterns

- **Path alias**: `@` maps to `src/`
- **Event bus**: `src/utils/eventBus.ts` provides `$on`/`$emit`
- **Toast/notification**: Uses Vant's `showToast` and `showDialog` wrapped in `function.ts` as `handle_err`, `handle_warn`, `handle_succ`
- **Date handling**: `dayjs` with `customParseFormat` plugin, Chinese locale

## Communication Style

- **Page layout / UI structure**: When discussing page layouts, component arrangements, or UI structure, prefer visual communication — use ASCII diagrams, wireframe mockups, or component tree sketches to convey the design, not text descriptions alone.

## Superpowers Workflow (自动编排)

Each task follows this pipeline. At each stage, invoke the corresponding skill BEFORE acting. If a stage is inapplicable, skip it with a one-line reason.

```text
需求/任务输入
    │
    ▼
[1] 需求分析 ── 新功能/创意性工作? → superpowers:brainstorming
    │          ── 多步骤任务? → superpowers:writing-plans
    │          ── Bug/异常? → superpowers:systematic-debugging
    │
    ▼
[2] 代码实现 ── 写新代码? → superpowers:test-driven-development (先测试，后实现)
    │          ── 多独立任务? → superpowers:dispatching-parallel-agents
    │          ── 需隔离环境? → superpowers:using-git-worktrees
    │
    ▼
[3] 质量门禁 ── 代码写完 → /code-review 或 superpowers:requesting-code-review
    │          ── 有测试缺口? → 补写测试用例
    │
    ▼
[4] 问题处置 ── Review 发现问题? → superpowers:systematic-debugging
    │          ── 修复后 → 回到 [3] 重新审查
    │          ── ⚠️ 发现任何代码问题，先提醒用户，由用户决断是否修复
    │
    ▼
[5] 完成验证 ── 全部通过? → superpowers:verification-before-completion
              ── 准备合并? → superpowers:finishing-a-development-branch
```

### 触发条件速查

| 场景 | 技能 | 触发时机 |
| --- | --- | --- |
| 新功能、组件、行为变更 | `superpowers:brainstorming` | 写代码之前 |
| 多步骤实现任务 | `superpowers:writing-plans` | brainstorm 之后 |
| 执行已有计划 | `superpowers:executing-plans` | 有 plan 文件时 |
| 写任何新代码 | `superpowers:test-driven-development` | 实现阶段 |
| 多个独立任务并行 | `superpowers:dispatching-parallel-agents` | 任务无依赖时 |
| 代码写完 | `/code-review` + 补测试 | 提交前 |
| 遇到 bug/测试失败 | `superpowers:systematic-debugging` | 问题发生时 |
| 任务完成 | `superpowers:verification-before-completion` | 声称完成前 |
| 分支开发结束 | `superpowers:finishing-a-development-branch` | 合并/PR 前 |

### 关键规则

1. **先分析，后动手** — 收到任务后，第一时间判断属于哪种类型（新功能/修复/重构），选择正确的入口技能
2. **TDD 优先** — 写实现代码前先写测试，除非是纯样式调整或配置变更
3. **写完必审** — 任何代码变更完成后，自动触发 code-review，不跳过
4. **问题必报** — review 或 test 发现的问题，先列出给用户，由用户决定是否修复，不擅自修改
5. **不跳过门禁** — 即使简单的改动，也要走完 review + verify 流程

# Docs Index

> **目录索引** — `docs/` 树顶层 navigator，跨 3 个子目录。
> **Sub-INDEX:** `superpowers/specs/INDEX.md` · `superpowers/plans/INDEX.md` · 项目级 `memory/INDEX.md`
> **Project-wide source of truth:** `../CLAUDE.md`
> **最后更新:** 2026-11-04（P167：去掉会漂的文件数 + 修坏链；子目录内容数见各 Section）

---

## 顶层结构

```
docs/
├── INDEX.md (本文件)
├── deploy/        # 部署 runbooks
├── i18n/          # 跨切割 ZH 术语
└── superpowers/   # superpowers 框架: specs/ + plans/ (见各自 INDEX.md)
```

| 子目录 | INDEX 链接 | 文件数 |
|---|---|---|
| `deploy/` | (本文件 Section 1) | 见 Section 1 |
| `i18n/` | (本文件 Section 2) | 见 Section 2 |
| `superpowers/specs/` | [`specs/INDEX.md`](./superpowers/specs/INDEX.md) | 见 specs/INDEX.md |
| `superpowers/plans/` | [`plans/INDEX.md`](./superpowers/plans/INDEX.md) | 见 plans/INDEX.md |
| **总文件数** | | 见各 sub-INDEX |

---

## 1 · `docs/deploy/` — Deployment runbooks

| 文件 | 标题 | 类别 | 日期 |
|---|---|---|---|
| `p3-2-rollout.md` | P3-2 Cross-Device Sync — Deployment Rollout | runbook | 2026-07-02 |

> **未来扩展触发**: 当 P3-2 之外的 deployment runbook 出现（如 P3-3 migration, P10 analytics, P14-legal DPO），加文件 + 同步本节。

---

## 2 · `docs/i18n/` — Cross-cutting ZH terminology

| 文件 | 标题 | 类别 | 日期 |
|---|---|---|---|
| `zh-terminology.md` | ForgeFlowKit ZH Terminology Glossary (Single source of truth for technical term ZH translation) | glossary | 2026-07-18 (P18-3) |

> **Single source of truth**: 该 glossary 是 100 engines ZH 翻译的术语 anchor；P18-3 audit 后保持稳定。新术语添加应改文件 + 同步 user-global 的 p18-i18n-tooling-hardening 索引。

---

## 3 · `docs/superpowers/` — Specs + Plans framework

详见各 sub-INDEX（已由 P33/P34 建立）：

- **`docs/superpowers/specs/INDEX.md`** — spec 文件导航
- **`docs/superpowers/plans/INDEX.md`** — plan 文件导航

P33/P34 已 ship 这两个 sub-INDEX；本顶层 INDEX 仅 cross-ref，不再重复列表。

---

## 与其他 INDEX 的关系

| INDEX | 位置 | 内容 | 起始 |
|---|---|---|---|
| `docs/INDEX.md` (本文件) | `docs/INDEX.md` (git-tracked) | 顶层 3 subdirs 导航 | 2026-07-19 (P36) |
| `docs/superpowers/specs/INDEX.md` | (git-tracked) | specs navigator | 2026-07-19 (P33) |
| `docs/superpowers/plans/INDEX.md` | (git-tracked) | plans navigator | 2026-07-19 (P34) |
| `memory/INDEX.md` | `memory/INDEX.md` (git-tracked) | ship logs navigator | 2026-07-19 (P35) |
| User-global `MEMORY.md` | `~/.claude/projects/.../memory/MEMORY.md` (gitignored) | 跨 session 单行 ship log 索引 | 2026-07-18 (P22b) |

**Single source of truth invariant**: 5 个 INDEX 形成 "navigator pyramid" — 顶层 `docs/INDEX.md` → 3 sub-INDEX → 各 subdir 详细文件。Future AI session 找任何 doc 都从顶层 `docs/INDEX.md` 入手。

---

## 维护约定

- `docs/INDEX.md` 是顶层 navigator，**不**详列 specs/plans/memory 内容（sub-INDEX 负责）。
- 新 doc 子目录出现时在本 INDEX 加 section + forward-pointer。
- 现有 `deploy/` / `i18n/` 子目录若新增文件，同步本 INDEX Section 1/2。
- 文件排序：**字母序**（每 section 内）。

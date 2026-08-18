---
name: p140d-tier-threshold-tightening-shipped
description: P140d tier length threshold tightening — bumped per-tier prose length thresholds by +70% (C3 candidate) and filled 31 newly-surfaced H2 gaps with domain-specific content. 5 atomic conceptual commits on `feature/p140d-tier-threshold-tightening` (off master f14a21b). Guard now has real teeth against future drift.
metadata:
  type: project
---

# P140d Tier Threshold Tightening — Ship Record (2026-08-18)

## Origin

P140c-T4 (in `memory/p140c-eeat-completion-shipped.md`) shipped with thresholds so loose (T1 zh minH2 p10 = 160 vs threshold 150 — only 10 char headroom) that real drift could recur without tripping the guard. P140d raises thresholds to C3 (+70%) and fills the 31 newly-surfaced H2 gaps with domain-specific content.

## What shipped

5 conceptual atomic commits on `feature/p140d-tier-threshold-tightening` (off master `f14a21b`):

| Commit | Task | Subject |
|---|---|---|
| `e24fae0` | T1 | `feat(guard):` bump tier length thresholds to C3 (+70%) |
| (22 H2 commits) | T2 | `fix(i18n):` × 22 — T1 zh H2 expansions (anchor pages) |
| (6 H2 commits) | T3 | `fix(i18n):` × 6 — T2 zh H2 expansions |
| (3 H2 commits) | T4 | `fix(i18n):` × 3 — T3 zh + T1 en H2 expansions |
| (T5) | T5 | `docs(ship):` this file + MEMORY + plans/INDEX + specs/INDEX + 3-way push |

Total branch commits: ~33 (1 T1 + 1 tooling + 31 H2 expansions).

## Key data

### C3 thresholds

| Tier | en perH2 | en total | zh perH2 | zh total |
|---|---|---|---|---|
| T1 (15) | 340 (+70%) | 1400 (+75%) | 255 (+70%) | 1000 (+67%) |
| T2 (35) | 220 (+69%) | 850 (+70%) | 150 (+67%) | 595 (+70%) |
| T3 (50) | 170 (+70%) | 680 (+70%) | 120 (+71%) | 425 (+70%) |

### 31 H2 expansions

22 T1 zh (anchor pages — 1 per category letter + 7 with multiple H2 gaps) + 1 T1 en + 6 T2 zh + 2 T3 zh = 31 total.

Total +1480 chars across 31 files. Each expansion added specific domain knowledge:
- BLS ECEC Q4 2025 burden rate components (29.7% benefits / 7.2% paid leave / 8.9% insurance / 5.4% retirement) — employee-cost
- OpenView 2024 SaaS benchmark tiers (early-stage $5-30k MRR, growth $30-300k, enterprise $300k+) — mrr/nrr
- GDPR Art. 83(4) vs 83(5) tier breakdown, Meta 1.2B EUR 2023 / Amazon 746M EUR 2021 — gdpr-fine
- Zendesk 2024 15-30% SaaS self-service deflection benchmark — kb-coverage-rate
- AARRR vs HEART funnel framework step definitions, Mixpanel "SaaS 注册到激活中位 20-30%" — funnel-step
- TripleWhale/Northbeam attribution window mechanics, DTC breakeven ~2-3x vs B2B SaaS ~3-5x — roas
- Twilio (usage-heavy) vs Figma (seat-based) MRR model comparison — mrr.en
- TSIA 2024 联络中心 attrition rates (年化 30-40%) — support-capacity-planning

No LLM-fluff. No "in today's fast-paced business environment". No padding. No repetition.

## Build status

- `pnpm check` 1244 / 0 / 0 (unchanged from P140c)
- `RUN_BUILD_TESTS=1 pnpm test:build` 1262 / 1262 / 0
- `RUN_BUILD_TESTS=1 pnpm test tests/tier-prose-completeness-guard.test.ts`: 2/2 pass, 0 fail
- pnpm build: 449 pages clean (unchanged)

## Subagent calls

~33 (1 T1 + 22 T2 H2 expanders + 6 T3 + 3 T4 + 1 T1 reviewer + retries). Plus 2 manual commits for gdpr-fine + pipeline-value (original agents didn't commit; manual preserves content).

## Drive-by discipline notes

- **No drive-by changes** in branch — only TIER_THRESHOLDS constants + H2 sections in listed files modified.
- **Reverted** 2 drive-by changes accidentally introduced by subagents: `.astro/settings.json` (deleted by subagent, restored) + `CLAUDE.md` (modified by subagent, restored).
- **Commit typo fixed**: gdpr-fine original commit `e4f25a5` had "gmail-fine-calculator" typo in subject; amended to `9b570c5` with correct spelling.
- **Concurrent commit collisions handled**: 2 subagents (mortgage, inventory-turnover) had their commits rebased/squashed by parallel subagent activity; SHA changed but content verified equivalent via `git show` (mortgage: 976ae34/24cceca → 7457eb0/8807476; inventory: ad95cc1 → 71e3bcb preserves H2[0] content in same commit).
- **Stray scratch files cleaned**: `scripts/_runner-codegen-examples.ts` (created by codegen-examples.mjs during pnpm check) + `D:E独立站youtube-tools.superpowerssddcheck.log` (created by subagent's path bug) — both removed.

## Lessons learned

1. **C3 thresholding is asymmetric** — all 31 newly-surfaced gaps are zh (except 1 en), because en content already had substantial headroom (en minH2 p10 = 377 vs threshold 200). Future tightening should monitor zh specifically and consider separate zh/en scaling.
2. **Total field is irrelevant** — no file failed the total threshold because content is already well-padded. The actionable dimension is per-H2 only. Future tightening should consider removing total field or significantly raising it.
3. **Guard is now a real defense-in-depth layer** — 31 violations found means the guard would have caught the P140c-T4 drift class immediately (vs the 5/31 ratio that actually fired).
5. **Concurrent subagent dispatching has collision risk** — when 13+ subagents work in parallel on the same branch, git add can sweep in unrelated changes; some commits get rebased/squashed mid-flight. Mitigation: dispatch per-file (not per-H2) so each subagent owns one file end-to-end; manual commit fallback when agents fail to commit.

## Next steps (P140e candidates)

- Index gap cleanup (9 missing 2026-08-XX specs already shipped)
- P141-P146 CHANGELOG M-section catch-up
- content-prose-shape-guard.test.ts zh 缺位 upgrade: warn → build fail
- AdSense Console Auto Ads toggle + resubmit (~2026-09-01 trigger per `adsense-resubmit-window.md`)

## How to apply

- Reference when designing next prose-length tightening batch — start from C3 baseline; further tightening should focus on zh specifically.
- Reference for domain-specific prose expansion pattern (real industry benchmarks > LLM-fluff).
- Reference for per-file subagent expansion (safer than per-H2 for parallel dispatch).
- Reference for drive-by cleanup discipline (revert + amend typo on the way to ship).
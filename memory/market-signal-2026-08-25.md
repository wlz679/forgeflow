---
name: "market-signal-2026-08-25"
description: "维度 3 market signal scan — 5 WebSearch probes + 1 pnpm sync probe. INITIAL scan flagged S1 (PRICING.json lag), S2 (Aug 18 Spam Update timing), S3 (Kimi K3 new provider). PROBE RESULT 2026-08-25: S1 was FALSE alarm — cron sync keeps PRICING.json current; S3 narrowed to Kimi K3 only (1 entry); S2 valid. 4 no-action signals (Astro/Tailwind/Reddit/AdSense-tool-blocked)."
metadata:
  type: project
  scan_date: 2026-08-25
  scan_only: true
  probe_run: "2026-08-25 (post-scan verification)"
  probe_result: "S1 FALSE alarm — PRICING.json is current. S3 narrowed to Kimi K3 only. S2 valid."
  scope: "5 WebSearch probes (parallel) + 1 pnpm sync probe (post-scan verification), no code written, no commit, user decides next action"
  trigger: "维度 3 Proactive Co-Pilot 强制约束 — 9/15 AdSense trigger 前 21 天空窗"
---

# Market Signal Scan — 2026-08-25

**Date:** 2026-08-25 (Tuesday)
**Trigger:** 项目宪法 v2.0 灵魂三维度之 3 — Proactive Co-Pilot (Claude 不允许跳过提议 / "暂时没看到" = 视为未跑 scan)
**Window:** ~21 days until AdSense resubmit window (~9/15)

---

## Scan Methodology

5 concurrent WebSearch probes, each focused on a different signal source:

| # | Probe | Tool | Result |
|---|---|---|---|
| 1 | AI 模型 release (GPT-5/Opus 5/Gemini 3/DeepSeek V4) | WebSearch | ✅ solid (10 links) |
| 2 | Google Aug 2026 algorithm update | WebSearch | ✅ solid (10 links) |
| 3 | Programmatic SEO calculator landscape | WebSearch | ⚠️ weak (no organic results, only related-search suggestions) |
| 4 | Astro 5 / Tailwind 5 upgrade status | WebSearch | ⚠️ empty (no 2026 data surfaced) |
| 5 | AdSense policy / YMYL compliance | WebSearch | ❌ tool-blocked in this session |

---

## 🔬 Probe Result (2026-08-25, post-scan verification)

**User asked for 5-min probe (`pnpm sync` + grep PRICING.json). Result contradicts initial S1 signal.**

### What we ran

```bash
pnpm sync       # sync-pricing.mjs + codegen-customfn.mjs + codegen-examples.mjs
git diff --stat # observe what changed
grep -E "..."   src/data/ai-pricing.json  # verify presence
```

### What we found

| Signal | Initial claim | Probe reality |
|---|---|---|
| **S1** (PRICING.json 落后 7+ SKU) | "Likely missing GPT-5.6 / Opus 5 / Sonnet 5 / Gemini 3.7 Flash / DeepSeek V4 0813" | **✅ ALL PRESENT** in PRICING.json — cron `pnpm sync` (weekly Monday) keeps it fresh. `pnpm sync` ran clean today with only `lastUpdated` bump (no model additions). |
| **S3** (Kimi K3 missing) | "New Moonshot AI provider, 2.8T MoE open weights" | **✅ STILL VALID** — `grep -i kimi` returned no result. Kimi K3 not in PRICING.json AND not in LiteLLM (sync-pricing.mjs `PROVIDER_MATCHERS` has no Moonshot matcher). Manual addition only. |
| **S2** (Aug 18 Spam Update) | External Google event, not verifiable by probe | **No probe needed**, still valid. AdSense ~9/15 trigger window overlaps with post-update recovery period. |

### Concrete evidence — models present in PRICING.json today

```
OpenAI:   gpt-5.5, gpt-5.5-pro, gpt-5.6, gpt-5.6-sol, gpt-5.6-terra,
          gpt-5.6-luna, gpt-5.6-cyber, gpt-5.4*, gpt-5.3*, gpt-5.2*, ...
Anthropic: claude-fable-5, claude-opus-4-8, claude-sonnet-5,
           claude-opus-5, claude-mythos-5, claude-opus-4-6, ...
Google:   gemini-3.5-flash, gemini-3.7-flash, gemini-3.1-pro,
          gemini-3.6-flash, gemini-3.5-flash-lite, ...
DeepSeek: deepseek-v4-flash, deepseek-v4-pro, deepseek-v4-pro-promo,
          deepseek-v3.2, deepseek-r1, deepseek-chat, ...
```

### Probe takeaways
- ✅ **维度 3 Proactive Co-Pilot 工作正常** — cron `pnpm sync` 一直在保持 PRICING.json 新鲜, B 8 engines 不需要"latest model coverage"修正
- ❌ **维度 1 信号误报** — initial scan 没有 first verify PRICING.json 现状, 误判 7+ SKU missing
- 🔍 **教训**: 对 PRICING.json 类资源, scan 必加 "grep 当前状态" 一行 (5 min) before 标记 actionable signal
- ⏭️ **真正 actionable**: 仅 Kimi K3 (1 个 model, 1 个新 provider) — 30 min if user wants
- ⚠️ **S2 仍待处理** — Aug 18 Spam Update timing risk 仍需 S2 audit (P148-B)

### Working tree after probe
```
$ git diff --stat
 memory/MEMORY.md | 1 +
 1 file changed, 1 insertion(+)
```
Only the scan index line is dirty. PRICING.json no-op `lastUpdated` bump reverted. **No commit made** (probe only, per CLAUDE.md "commit only when user asks").

---

## Top Signals (Ranked by Impact × Effort)

### S1 — AI 模型 release lag: PRICING.json 落后 7+ 新 SKU  ⭐⭐⭐ HIGH IMPACT, LOW EFFORT

**What (confirmed via WebSearch):**

| Provider | New model | Released | Pricing (per 1M tokens) | In PRICING.json today? |
|---|---|---|---|---|
| OpenAI | GPT-5.5 | Apr 24, 2026 | $5 / $30 | ❓ likely missing |
| OpenAI | GPT-5.6 **Sol** (flagship) | Jul 9, 2026 | $5 / $30 | ❓ likely missing |
| OpenAI | GPT-5.6 **Terra** (mid) | Jul 9, 2026 | $2.50 / $15 | ❓ likely missing |
| OpenAI | GPT-5.6 **Luna** (cheap) | Jul 9, 2026 | $1 / $6 | ❓ likely missing |
| Anthropic | Claude Opus 4.8 | May 28, 2026 | (need verify) | ❓ likely missing |
| Anthropic | Claude **Fable 5** | Jun 9, 2026 | $10 / $50 | ❓ likely missing |
| Anthropic | Claude **Mythos 5** | Jun 9, 2026 | (no public API) | n/a |
| Anthropic | Claude Sonnet 5 | Jun 30, 2026 | (need verify) | ❓ likely missing |
| Anthropic | Claude **Opus 5** | Jul 24, 2026 | $5 / $25, 1M ctx | ❓ likely missing |
| Google | Gemini **3.7 Flash** | Aug 2026 | $0.75 / $3.75 | ❓ likely missing |
| Google | Gemini 3.5 Pro | upcoming TBA | TBA | n/a |
| DeepSeek | **V4-Pro / V4-Flash** | Apr 24, 2026 | (MIT license) | ❓ likely missing |
| DeepSeek | V4-Flash-0731 | Jul 31, 2026 | $0.14 / $0.28 | ❓ likely missing |
| DeepSeek | **V4 Pro 0813** | Aug 2026 | (latest refresh) | ❓ likely missing |
| Moonshot | **Kimi K3** | Jul 16, 2026 | open weights 2.8T MoE | ❌ definitely missing |

**Impact on ForgeFlowKit:**
- B 类 8 个 engines (`openai-token-calculator` / `claude-api-cost-calculator` / `gemini-api-cost-calculator` / `deepseek-api-cost-calculator` / `ai-api-cost-comparison` / `ai-image-generation-cost-calculator` / `gpu-cloud-cost-calculator` / `ai-training-cost-estimator`) 全部由 `src/data/ai-pricing.json` 驱动 + `codegen-customfn.mjs` 自动 regen
- 缺失的 7+ 新 SKU = 8 engines 对访客展示过时的价格表,违反"decision support"维度 1 (帮用户用最新价格决策)
- `pnpm sync` 会自动从 LiteLLM 拉 — 但**前提是 LiteLLM 仓已收录**,Kimi K3 (新 provider) 不一定被 LiteLLM 收录
- 周一 cron `sync-pricing.yml` 应该会跑 — 但无法保证覆盖度

**Effort:**
- 先跑 `pnpm sync` (5 min) 看 LiteLLM 覆盖度
- 检查 `src/data/ai-pricing.json` diff (10 min)
- 缺失 SKU 手动补 (Kimi K3 + 任何 LiteLLM 没收录的): ~30-60 min per provider
- 跑 `node scripts/codegen-customfn.mjs` 重生 customFn (5 min)
- `pnpm build` + `pnpm check` (5 min)
- **Total: ~1-2 hr**

**Risk:**
- Low (codegen-driven, 已有 47 build-dep guards 兜底)
- 单 commit 可 revert

**Recommendation:** 🟢 **P148-A 候选** — 高 ROI, 低风险, 1-2 hr 即可让 B engines 重新成为"latest price reference"

---

### S2 — Google Aug 18 Spam Update timing risk vs AdSense resubmit  ⭐⭐ MEDIUM IMPACT, MEDIUM EFFORT

**What (confirmed via WebSearch):**
- **Google Aug 2026 Spam Update** released **Aug 18, 2026** (7 days before today)
- **Scope:** global rollout, all languages; spam policies now apply across generative AI experiences in Search (AIO)
- **Targets:**
  - Mass-produced AI-generated low-quality content
  - Scaled content abuse
  - Site reputation abuse ("Parasite SEO")
  - Link manipulation, cloaking
- This is the **3rd spam update of 2026** (after March and June)
- August 2026 Core Update (separate): rewards firsthand evidence / intent-matched content / E-E-A-T compliance

**Impact on ForgeFlowKit:**
- 我们有 631 个 programmatic-style 页面 — Google 这次明确针对 "scaled content abuse"
- ⚠️ **关键问题**: AdSense 重新审核预期 ~9/15 — 距离 Aug 18 Spam Update 仅 4 周,期间 Google 内部对该 update 的判定可能尚未稳定,AdSense 审查员可能援引新 spam policy 拒绝
- 我们的 mitigation 已就位:
  - **P140c** E-E-A-T 完成 — 单一真实评审者 王立柱 + About 页面 3 段 (Editorial Standards / Reviewers / Methodology)
  - **P140g** Author Bio Pages — 每评审者详情页 + JSON-LD Person
  - **P141h** placeholder leakage guard — 防止再生 placeholder
  - **P141i** Prose P1 Deepening — 18 引擎 prose 扩展 + Assumptions / Common Mistakes 段
- ✅ 每个 Tier 1 Topic 页有独特内容 (Guide 150 / Bench 25 / sources 50 / rows 8 min via `topic-content-coverage-guard`)
- ✅ Comparison 页面 (4 个 X vs Y) 各有独立表 + 独立 advisor voice
- ⚠️ Tier 3 selective promotion 是未来的"低门槛批量" — 假如未来 Phase 5 Tier 3 大批上, 这次 Spam Update 是预警

**Effort:**
- Audit (grep + 浏览): 1-2 hr
- 假如发现某类页面确实 thin → 加 prose 或合并
- 防御性 guard: 可能需要 1 个 `scaled-content-uniqueness-guard` 验证每页 unique 内容指标

**Risk:**
- Medium — 不是"我们当前有错",而是"未来大批量前需要 audit"
- AdSense 9/15 时间窗可能受 Aug 18 update 影响 — 这是不可控外部因素

**Recommendation:** 🟡 **P148-B 候选 (audit only, 不改)** — 跑 1-2 hr audit, 验证 631 页 uniqueness, 写 audit report; 不主动改, 但保留作为 Phase 5 Tier 3 启动前的 gate

---

### S3 — Kimi K3 (Moonshot AI): 新 LLM provider  ⭐⭐ LOW IMPACT, LOW EFFORT, NEW THEME

**What:**
- **Kimi K3** (Moonshot AI) — Jul 16, 2026 release
- **2.8T MoE**, open weights, MIT license
- LiteLLM 收录状态: ❓ need verify

**Impact on ForgeFlowKit:**
- 当前 `ai-api-cost-comparison` engine 显示 4 provider (OpenAI / Anthropic / Google / DeepSeek)
- 加 Kimi K3 → 5 provider 视图
- 也让 Kimi K3 进入 `claude-api-cost-calculator` 等 individual engines 的"竞品对照"段

**Effort:**
- PRICING.json 加 Kimi 段 (5 min)
- 跑 codegen-customfn (5 min)
- 跑 build + check (5 min)
- **Total: ~30 min** (前提是 LiteLLM 已收录价格)

**Risk:**
- Low — 单 commit, codegen-driven
- 需要先 verify Kimi K3 是否已有公开 token pricing (2.8T MoE 是 open weights, 但 hosted API 价格可能不同)

**Recommendation:** 🟢 **可与 S1 合并入 P148-A** (同一 batch, 因为都改 PRICING.json)

---

## No-Action Signals (Surfaced but not actionable)

### S4 — Astro 5 / Tailwind 5 upgrade
- Search 返回 no organic results (索引可能未覆盖)
- 我们在 Astro 4.16.19 + Tailwind 4 (via @tailwindcss/vite) — stable, 无 compelling upgrade 理由
- **Action: NONE** — Astro 5 (Dec 2024 release) 升级会破 build, ROI 不明; Tailwind 5 尚无 release

### S5 — Programmatic SEO calculator landscape
- Search weak, 仅返回 related-search suggestions
- 已知 competitive landscape: Calculator.net (generic) + NerdWallet / Bankrate (finance-only)
- ForgeFlowKit 定位 niche underserved (SaaS / Solopreneur / B2B)
- **Action: NONE immediate** — 现状 positioning 良好, Phase 5 Tier 3 是已规划的下一步

### S6 — Reddit citations in ChatGPT dropped 86.4% mid-Aug
- LLM citation landscape 变化 — Reddit 失去 advantage
- Sites with strong EEAT + structured data (like us, post-P140g) become more prominent citation sources
- **Action: NONE immediate** — meta trend, 我们已在正确位置 (P140c-P140g 已经 ship)

### S7 — AdSense policy update (specific)
- Search tool blocked in this session (WebSearch 工具限制)
- **Action:** 待 user 决定是否开第二轮 scan (用 WebFetch 或其他 tool)

---

## Recommended P148 Batch Scope (if user wants to act)

### Option 1 — P148-A only (S1 + S3 合并, ~1.5 hr)
- Sync PRICING.json with 2026 AI model releases (GPT-5.6 family / Claude Opus 5 / Sonnet 5 / Gemini 3.7 Flash / DeepSeek V4 Pro 0813)
- Add Kimi K3 as 5th LLM provider
- Verify codegen + build + check
- **Output:** B 8 engines 重新成为"latest price reference"; 5-provider compare 视图
- **Risk:** Low

### Option 2 — P148-A + S2 audit (~3 hr)
- P148-A + 1-2 hr scaled-content audit + audit report
- 不改内容, 仅验证 + 写 audit
- **Output:** 防御性 audit baseline (作为 Phase 5 Tier 3 启动前的 gate)
- **Risk:** Low

### Option 3 — No action (wait for Phase 3 trigger ~9/15)
- 让 Aug 18 Spam Update 沉淀 4 周, AdSense 重新审核时再用真实流量数据决策
- **Output:** 零代码改动, 21 天 wait
- **Risk:** Zero (passive)

---

## Open Questions for User

1. **P148-A 是否开?** (S1+S3, 1.5 hr) — 决定前可以先跑 `pnpm sync` 看 LiteLLM 覆盖度 (5 min, 纯探测, 不 commit)
2. **P148-B audit 是否开?** (S2, 1-2 hr) — 纯防御性 audit, 不改内容
3. **Astro/Tailwind upgrade** — 是否值得第二轮 scan? (WebSearch 没数据, 可能需要 WebFetch 抓 GitHub release page)
4. **AdSense policy 第二轮 scan** — 是否值得?

---

## Related

- [[p147-followup-shipped]] — last ship (test design quality)
- [[p140f-decision-support-system]] — 项目宪法 v2.0 灵魂三维度 + 维度 3 Proactive Co-Pilot 强制约束
- [[adsense-resubmit-window]] — ~9/15 trigger window
- [[p141h-adsense-p0-fixes-shipped]] — placeholder leakage guard (P148-B audit 的 baseline)
- [[p141i-prose-p1-deepening-shipped]] — prose deepening (P148-B audit 的 baseline)
- [[p140c-eeat-completion-shipped]] — E-E-A-T (S2 mitigation 的 baseline)
# P14 Legal & Compliance Calculator Batch — SHIPPED

## Series ID
P14

## Name
Legal & Compliance Calculator Batch (GDPR/CCPA/DSAR/CMP)

## Ship date
2026-07-13/14

## Total commits
~13 (scaffold + 6 calcs + 1 fix wave + 1 sync chore + 2 docs commits + 1 fix-wave for closure)
- scaffold P14-0 (commit `0bb3d9b`): NEW 'L' Legal & Compliance category (15th letter), empty barrel, empty tools file, listing page
- P14-1 GDPR Fine (commit `01f8a73`): 4 inputs + 11 tests + 6-section v3
- P14-2 DSAR Cost (commit `7af8fe7`): 4 inputs + 11 tests + 6-section v3
- P14-3 Cookie Consent Revenue (commits `b6d45a7` + `baac5cc` fix): 4 inputs + 15 tests + 6-section v3
- P14-4 DPA Cost (commit `5496e50`): 5 inputs + 11 tests + 6-section v3
- P14-5 Breach Notification (commits `7f62ea5` / `c1422ad`): 5 inputs + 10 tests + 6-section v3
- P14-6 CMP ROI (commit `99afbcf`): 6 inputs + 12 tests + 6-section v3, FINAL batch bump
- chore sync-pricing (commit `dce0923`): sync from LiteLLM + regen customFn + staticExamples
- docs P14-1 (commit `1dbfe9a`): memory for GDPR Fine
- docs P14-2 (commit `43bcd21`): memory + MEMORY.md index pointer for DSAR Cost
- docs P14-6 (commit `c8e4088`): memory index pointer for CMP ROI
- **fix p14-holistic (commit `4570380`)**: 5 reviewer-caught issues (CRITICAL customFn wrapper for P14-1/2/3 + IMPORTANT Break-Even targetRounds path + MINOR dead code + MINOR Math.floor boundary + MINOR What-If sign guard)

## Engines delta
92 → 98 (+6)

## Categories delta
14 → 15 (NEW 'L' Legal & Compliance — 15th letter)

## Inputs added
26 across 6 calcs:
- L-1 GDPR Fine: 4 inputs (annual_revenue_global, max_fine_pct, violations_per_year, industry_risk_multiplier)
- L-2 DSAR Cost: 4 inputs (dsars_per_month, hours_per_dsar, hourly_rate_dpo, automation_pct)
- L-3 Cookie Consent Revenue: 4 inputs (monthly_visitors, current_consent_rate_pct, target_consent_rate_pct, conversion_rate_pct)
- L-4 DPA Cost: 5 inputs (dpas_per_quarter, avg_negotiation_rounds, hours_per_round, legal_hourly_rate, redlines_per_dpa)
- L-5 Breach Notification: 5 inputs (records_affected, severity, notification_cost, regulatory_filing_fee, post_incident_program)
- L-6 CMP ROI: 4 inputs (cmp_monthly_cost, consent_lift_pp, monthly_covered_visitors, conversion_rate_pct) + 2 derived (AOV)

## Tests added
11 + 11 + 15 + 11 + 10 + 12 = **70 math tests**
(All 70 passed at ship; final holistic-fix-wave kept canonical outputs unchanged → 70 still green)

## Roster
| Slug | Title | Inputs | Tests | Canonical |
|---|---|---|---|---|
| gdpr-fine-calculator | GDPR Fine Risk | 4 | 11 | €1.6M Critical |
| dsar-cost-calculator | DSAR Processing Cost | 4 | 11 | €99,750/yr Good |
| consent-revenue-impact-calculator | Cookie Consent Revenue Impact | 4 | 15 | €64K/mo 20pp gap Warning |
| dpa-cost-calculator | DPA Negotiation Cost | 5 | 11 | €336K/yr Warning |
| breach-notification-cost-calculator | Data Breach Notification Cost | 5 | 10 | €330K/yr Warning |
| cmp-roi-calculator | CMP ROI | 4 | 12 | €42.6K net 296% Good |

## Persona
DPO/Privacy Officer for mid-market B2B SaaS (€10M–€50M ARR). Compliance + legal-ops focus. Regulatory anchors: GDPR Art. 83 (fines), Art. 15 (DSARs), Art. 28 (DPAs), Art. 33-34 (breach), ePrivacy Recital 32 (cookie consent), CCPA (mentioned but GDPR-primary).

## Lessons learned

1. **Math recompute is mandatory** — When using calculated totals in display strings, ALWAYS recompute against the actual inputs (don't trust intuition):
   - P14-1 GDPR Fine: 10× typo in fine amount (0.0064 vs 0.064 → max fine displayed as €64K vs €640K). Caught at codegen sanity check.
   - P14-2 DSAR Cost: "60% automation should give Excellent" was actually Good (€99,750). Caught by checking the actual computed annual against the band threshold.
   - P14-3 Cookie Consent: "70% should be Excellent" was actually Good (gap=5pp is exactly the warning→good boundary, not excellent). Fixed by using `target - 4.9` epsilon so the displayed value (70.1pp) yields gap=4.9 which IS excellent under strict-<.

2. **customFn wrapper pattern is critical** — `var fn = new Function('inputs','pick','fill', customFn); fn(...)` returns `undefined` when customFn is just `function run(inputs, pick, fill) { ... }` without an invocation wrapper. P14-1/2/3 missed `return run(inputs, pick, fill);` at the end → pages silently returned undefined output. P14-4/5/6 used the wrapper correctly from the start. **Holistic review caught this CRITICAL bug for P14-1/2/3** (the brief explicitly called out: "customFn returns undefined").

3. **`.ts` suffix in codegen `file` field** — The codegen script reads via path.join which requires `.ts` extension. Brief said `gdpr-fine-calculator` but should be `gdpr-fine-calculator.ts`. Caught at scaffold review.

4. **Subagent mid-task drop-off pattern** — 3 of 8 subagents (P14-3 fix-wave, P14-5, P14-6) dropped mid-task without completing all steps. Controller pattern: verify git state with `git log --oneline -3` + `git rev-list --left-right --count origin/master...github/master`; finish remaining steps manually if subagent reports DONE but work incomplete.

5. **Cross-cutting fix-wave pattern** — Per `superpowers:code-review` skill: "ONE fix subagent with complete findings list, not one fixer per finding." P14-4 reviewer caught 4 IMPORTANT + 4 MINOR findings; deferred ALL to P14-7 holistic fix-wave (NOT fixed piecemeal per task). P14-7 fix-wave is one commit (`4570380`) covering all 5 in-scope issues.

6. **P14-4 boundary precision** — `Math.round(annual)` can round a value into the next band (e.g., 99,999.5 displayed as "100,000" → "Excellent" label contradicts math). Use `Math.floor(annual).toLocaleString()` for the annual display in band-sensitive Health lines (NOT for perDPA or other values — those are not band-relevant).

7. **What-If copy must check sign** — "drops to €X" is mathematically false when altAnnual > annual (e.g., user already has rounds=1, can't "drop to 2"). Add guard: `altAnnual < annual ? 'drops to' : 'is already optimal at'`. Use the smaller value (or current annual) for the display number.

## Cross-links preserved
- L-1 ↔ L-5: GDPR fine + breach notification (combined true incident cost)
- L-2 ↔ P12-1: DSAR + cost-per-ticket (broader privacy ops budget)
- L-3 ↔ L-6: cookie consent + CMP ROI (consent tooling closes revenue gap)
- L-4 ↔ P8-1: DPA + sales pipeline (DPA rounds delay deal close)
- L-5 ↔ R-1: breach notification + NRR (fines compound with churn)
- L-6 ↔ L-2/L-3: CMP ROI + DSAR + consent (consent tooling reduces both DSAR volume and revenue gap)

## Out-of-scope deferrals (to future polish / P15)
1. **HTML5 `step="any"` cross-engine** — affects all 98 engines. Number inputs reject decimal values on some browsers. Not P14-specific.
2. **HEALTH_BANDS negative input guard** — affects all 98 engines. Band thresholds assume non-negative input; no defensive guard. Not P14-specific.

These are cross-cutting concerns best fixed in a dedicated audit pass, not at series-closure time.

## Final state
- 98 engines / 15 categories / 0 NEW test failures
- 3-way sync (origin/gitee/github): pending final verification
- pnpm check: 892 pass / 12 fail (all pre-existing Header Clerk + BaseLayout clerk-init + privacy-policy Supabase flakes per CLAUDE.md authorized escape)
- codegen-examples --check: 98/98 PASS
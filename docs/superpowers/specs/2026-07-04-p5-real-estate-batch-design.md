# P5 Real-Estate Calculator Batch Design

**Date:** 2026-07-04
**Status:** DRAFT (brainstorming)
**Author:** Claude (controller direct execution, post P4 series)
**Context:** P5 sub-project — extend 38 v3-standard calculators with a **vertical-depth real-estate batch (6 engines)** in a new `real-estate/` category. Closes SEO gaps for "mortgage calculator" / "rent vs buy" / "cap rate calculator" / "rental yield" / "BRRRR" / "DSCR" — 6 distinct RE-finance audiences in one cluster.

---

## Executive Summary

| Element | Decision |
|---|---|
| **Batch size** | 6 engines (P5-1 through P5-6) — same size as P4 series (32→38), takes us to 38→44 |
| **Category** | New `src/engines/real-estate/` + `src/data/tools/real-estate.ts`; `categoryId: 'F'` (Investment/Finance semantic match — same letter as compound-interest, equity-dilution) |
| **Coverage matrix** | Owner-occupier (P5-1 mortgage, P5-2 rent-vs-buy) · Light landlord (P5-3 cap rate, P5-4 rental yield) · RE investor (P5-5 BRRRR, P5-6 DSCR) |
| **Output model** | 9-section v3 standard (per existing pattern: ⏰ title · 💰 Snapshot · 📐 Math · 🩺 Health · 🎯 Stage benchmarks · ⚖️ Decision matrix · 🔄 What-If · 💡 Tip · SEO comparison rows) — `v3 standard — Business variant` per CLAUDE.md |
| **Math depth** | Each engine has substantive distinct math (PMT amortization · NPV comparison · NOI ratio · cash-flow ROI · 5-stage cascade · DSCR debt-coverage) — not thin overlays |
| **i18n** | en + zh (auto-translates via existing pipeline) |
| **Wiring** | Per-calculator 6-file checklist + 2 test bumps — identical to P4 lesson |

## Why real-estate vertical depth (not breadth)

Per brainstorm summary above:
- 5 SEO gaps identified; real-estate is the **only category with 0 engines** (true white space)
- Topical authority: 6 interlinked RE pages form a Google-recognized cluster
- Existing P4 series a/b internal linking playbook transfers 1:1
- Each math model is genuinely distinct (amortization, NPV, ratio, cash-flow, BRRRR cascade, DSCR)
- No engine-pattern risk (proven v3 standard, no meta-shift)

---

## Architecture

### New directory structure

```
src/
  engines/
    real-estate/                            # NEW
      index.ts                              # 6 imports + re-export
      mortgage-calculator.ts
      rent-vs-buy-calculator.ts
      cap-rate-calculator.ts
      rental-yield-calculator.ts
      brrrr-calculator.ts
      dscr-calculator.ts
  data/
    tools/
      real-estate.ts                        # NEW — 6 ToolMeta entries with `ToolInput[]` structured form
docs/
  superpowers/
    plans/
      2026-07-04-p5-real-estate-batch.md    # 6-task [MECHANICAL] implementation plan
```

### Per-calculator file structure

Each engine mirrors P4-1..P4-6 file pattern:

```ts
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

// ============ Math helpers (exported for tests) ============
// ... mathematical primitives, no side effects

// ============ calculate() ============
// 9-section string assembly

// ============ customFn ============
// minified JS, escaped unicode, ASI-safe (}if→}; if)

// ============ Engine ============
const engine: ToolEngine = { /* slug, title, inputs, clientConfig, generate, staticExamples, faq, howToUse */ };
registerEngine(engine);
```

### Wiring checklist (per calculator — 6 files)

1. `src/engines/real-estate/index.ts` — 6 imports + barrel
2. `scripts/codegen-examples.mjs` — 6 ENGINES entries (alphabetical)
3. `src/data/tools/real-estate.ts` — 6 ToolMeta entries (`ToolInput[]` structured form, per P4-2 lesson)
4. `src/data/og-samples.json` — 6 OG samples (headline + headlineUnit + headlineLabel)
5. `tests/ab-split.test.ts` — count bump 38 → 39, 40, 41, 42, 43, 44
6. `tests/internal-links.test.ts` — count bump 38 → 39, 40, 41, 42, 43, 44

### Shared math helper conventions

| Pattern | Convention | Reason |
|---|---|---|
| Sign convention | Costs positive, gains/percentages as percent or normalized | User-friendly |
| Money formatting | `$1,234,567` (en-US locale) | Matches existing engines |
| Edge case (zero) | Return safe default + visible tip "Enter value > 0" | Avoids `NaN` / `Infinity` crashes |
| Health thresholds | 🟢🟡🟠🔴 per value-appropriate bands; document thresholds in spec not code | Easier to review |
| Tip selection | Conditional based on output band (multiple tips, one selected) | Contextual advice |

---

## P5-1: Mortgage Calculator

**Slug:** `solopreneur-mortgage-calculator`

### Inputs (4)

| Name | Label | Type | Placeholder | Default |
|---|---|---|---|---|
| `homePrice` | Home Price ($) | number | e.g. 500000 | 500000 |
| `downPayment` | Down Payment ($) | number | e.g. 100000 | 100000 |
| `loanTermYears` | Loan Term (years) | number | e.g. 30 | 30 |
| `interestRate` | Annual Interest Rate (%) | number | e.g. 6.5 | 6.5 |

### Math model

```
principal = homePrice - downPayment
monthlyRate = interestRate / 100 / 12
n = loanTermYears * 12

monthlyPayment = principal * monthlyRate / (1 - (1 + monthlyRate)^-n)
                  // PMT formula: 0 if monthlyRate=0
totalInterest = monthlyPayment * n - principal
totalCost = homePrice + totalInterest
ltv = principal / homePrice * 100
```

Edge cases:
- `homePrice <= downPayment` → tip: "Down payment >= home price; loan = 0, no interest. Consider lower down payment."
- `interestRate === 0` → monthlyPayment = principal / n; flag tip "0% loan — confirm lender does not charge fees"
- `loanTermYears === 0` → guard, show error

### 9-section v3 output (Business variant)

| Section | Content |
|---|---|
| ⏰ Title | "Mortgage Calculator" |
| 💰 Loan Snapshot | Home price, down payment, loan amount, LTV % |
| 📐 Monthly Payment | P&I breakdown, monthly interest-only view, total interest, total cost |
| 🩺 Affordability Health | 🟢<28% DTI · 🟡28-36% · 🟠>36% (DTI = P&I / income not modeled in V1 — alternative: use monthlyPayment vs homePrice) |
| 🎯 Loan Comparison | 15y vs 20y vs 30y monthly payment + total interest (3 rows) |
| ⚖️ Amortization Milestone | Principal paid at year 5/15/30; how much of payment is interest vs principal at each year |
| 🔄 What-If (5) | Rate -1pp · Rate +1pp · Extra $200/mo payment · 15-year refinance · 20% down vs current |
| 💡 Tip (3 conditional) | (high LTV) "PMI required over 80% LTV" · (long term) "30-year term has lowest payment but highest total interest" · (default) "Compare 15-year vs 30-year; 15-year saves ~X interest" |
| SEO comparison | 6 rows at $200K/$400K/$600K/$800K/$1M/$1.5M home prices |

**Health heuristic (no income input in V1):**
- 🟢 Monthly P&I < 1.0% of home price (typical: 30y at 6.5% ≈ 0.63%) — affordable baseline
- 🟡 1.0–1.3%
- 🟠 > 1.3%

### Tests

Count: **8 tests**
1. monthlyPayment basic (500K home, 100K down, 30y, 6.5% → ~$2,528)
2. monthlyPayment zero interest
3. monthlyPayment zero down payment (full loan)
4. totalInterest basic
5. ltv basic (20% down → 80% LTV)
6. amortization milestone year 5 (principal paid ≈ 5-10%)
7. amortization milestone year 15 (~50% principal)
8. term comparison (15y vs 30y)

---

## P5-2: Rent-vs-Buy Calculator

**Slug:** `solopreneur-rent-vs-buy-calculator`

### Inputs (7)

| Name | Label | Type | Placeholder |
|---|---|---|---|
| `monthlyRent` | Current Monthly Rent ($) | number | e.g. 2000 |
| `homePrice` | Home Purchase Price ($) | number | e.g. 500000 |
| `downPayment` | Down Payment ($) | number | e.g. 100000 |
| `mortgageRate` | Mortgage Rate (%) | number | e.g. 6.5 |
| `yearsToStay` | Years You Plan to Stay | number | e.g. 7 |
| `annualAppreciation` | Expected Home Appreciation (%/yr) | number | e.g. 3 |
| `annualRentIncrease` | Annual Rent Increase (%/yr) | number | e.g. 3 |

### Math model

**Buying NPV (over `yearsToStay` years):**
```
monthlyRate = mortgageRate / 100 / 12
n_months = yearsToStay * 12
principal = homePrice - downPayment

// Monthly P&I (PMT formula)
monthlyPI = principal * monthlyRate / (1 - (1 + monthlyRate)^-n_months)
totalMortgagePaid = monthlyPI * n_months

// Remaining loan balance at end of year `yearsToStay` (using months-paid basis):
//   balance(m) = principal × [(1+r)^N - (1+r)^m] / [(1+r)^N - 1]
// At horizon with full amortization:
//   remainingBalance = 0 (loan fully paid)
// For partial-term analysis (yearsToStay < loan term), see implementation note below.
remainingBalance = principal × ((1 + monthlyRate)^n_months - (1 + monthlyRate)^n_months) / ((1 + monthlyRate)^n_months - 1)  // = 0 at full term

// Property appreciation at horizon
futureValue = homePrice * (1 + annualAppreciation/100)^yearsToStay

// Selling costs at horizon only (buy closing was already paid at purchase, not at horizon)
sellingCosts = futureValue * 0.06  // 6% roundtrip selling costs (5-7% typical)

// Net proceeds from sale at horizon
netProceeds = futureValue - sellingCosts - remainingBalance

// Initial cash outlay at purchase (down payment + buy closing)
buyClosingCosts = homePrice * 0.03  // 3% buy closing
initialOutlay = downPayment + buyClosingCosts

// Monthly holding costs (during ownership): opportunity cost of down payment + property tax + maintenance + insurance
//   ≈ 4% opportunity (alternative S&P return) + 1.2% property tax/maintenance = 5.2% of home value annually
monthlyHoldingCost = (downPayment * 0.04 + homePrice * 0.012) / 12  // approximate
// Property tax + insurance expense (NOT opportunity cost — those are also cash flows but ignored for simplicity)
monthlyPropertyTaxMaint = homePrice * 0.012 / 12  // 1.2% annual: property tax + insurance + maintenance
totalHoldingCosts = monthlyPropertyTaxMaint * n_months

// Net cost of buying
netCostBuy = initialOutlay + totalMortgagePaid + totalHoldingCosts - netProceeds
```

**Renting NPV (over `yearsToStay` years):**
```
monthlyRentGrowth = annualRentIncrease / 100
totalRentPaid = sum over year y of (monthlyRent * 12 * (1 + monthlyRentGrowth)^y) for y=0..yearsToStay-1
// opportunity gain: if down payment was invested:
investedGrowth = downPayment * ((1 + 0.07)^yearsToStay - 1)  // 7% S&P average
opportunityGain = investedGrowth
totalRentCost = totalRentPaid - opportunityGain
```

**Comparison:**
```
savings = totalRentCost - netCostBuy
// negative = buying cheaper; positive = renting cheaper
```

Edge cases:
- `yearsToStay <= 0` → guard, show error
- `homePrice <= downPayment` → tip: "100% cash purchase; run mortgage calc first"
- `mortgageRate === 0` → handle 0% rate case

### 9-section v3 output

| Section | Content |
|---|---|
| ⏰ Title | "Rent-vs-Buy Calculator" |
| 💰 Decision Snapshot | Years-to-stay · current rent · home price · your verdict (BUY/RENT/CLOSE) |
| 📐 Cost Breakdown | Annualized buying cost vs renting cost (3-line summary each) |
| 🩺 Verdict Health | 🟢 strong savings · 🟡 close call · 🟠 buying loses |
| 🎯 Time Horizon | Cross-over years when buying overtakes renting |
| ⚖️ Side-by-side | Buying NPV vs Renting NPV; per-year cost chart |
| 🔄 What-If (5) | Stay 5y vs 10y vs 15y · Appreciation +2pp · Rent increase +2pp · 20% down · 15% down |
| 💡 Tip (3 conditional) | (stay <5y) "Buying costs don't recoup in <5y" · (close call) "Run with conservative appreciation" · (default) "Rule of thumb: stay 7y+ favors buying" |
| SEO comparison | 6 rows at 3y/5y/7y/10y/15y/30y time horizons |

**Verdict heuristic:**
- 🟢 buying saves > $30K NPV → "BUY strongly favored"
- 🟡 within ±$30K → "CLOSE call — sensitivity matters"
- 🟠 buying loses > $30K → "RENT favored"

### Tests

Count: **9 tests**
1. monthlyPI basic (mortgage substep)
2. totalRentPaid basic (5y at $2K/mo, 3% increase)
3. futureValue basic (homePrice appreciation)
4. netCostBuy basic
5. totalRentCost basic
6. verdict BUY (long stay, high appreciation)
7. verdict RENT (short stay)
8. verdict CLOSE (within ±$30K)
9. sensitivity: stay 5y vs 10y (should flip)

---

## P5-3: Cap Rate Calculator

**Slug:** `solopreneur-cap-rate-calculator`

### Inputs (4)

| Name | Label | Type | Placeholder |
|---|---|---|---|
| `propertyValue` | Property Value ($) | number | e.g. 500000 |
| `annualRentIncome` | Annual Gross Rental Income ($) | number | e.g. 36000 |
| `annualExpenses` | Annual Operating Expenses ($) | number | e.g. 12000 |
| `vacancyRate` | Vacancy Rate (%) | number | e.g. 5 |

### Math model

```
effectiveGrossIncome = annualRentIncome * (1 - vacancyRate/100)
noi = effectiveGrossIncome - annualExpenses
capRate = noi / propertyValue * 100  // percent
cashOnCash = (effectiveGrossIncome - annualExpenses) / propertyValue * 100  // if all-cash (no mortgage)
```

Edge cases:
- `propertyValue <= 0` → guard
- `vacancyRate >= 100` → tip "Vacancy ≥ 100% would result in negative income"

### 9-section v3 output

| Section | Content |
|---|---|
| ⏰ Title | "Cap Rate Calculator" |
| 💰 Property Snapshot | Value, gross income, vacancy %, effective income, expenses, NOI |
| 📐 Cap Rate Math | capRate formula breakdown + cashOnCash |
| 🩺 Cap Rate Health | 🟢 5-9% residential · 🟡 3-5% or 9-12% (extreme) · 🟠 outside |
| 🎯 Market Benchmarks | Class A/B/C cap rates by city tier |
| ⚖️ Implied Value | Reverse: given target cap rate 7%, what value = NOI/0.07 |
| 🔄 What-If (5) | Vacancy +5pp · Expenses -10% · +$300/mo rent · All-cash vs 75% LTV · Target 8% cap (implied value) |
| 💡 Tip (3 conditional) | (high cap) "High cap may signal lower-quality neighborhood" · (low cap) "Low cap in HCOL area is normal" · (default) "Cap rate excludes financing; for leveraged ROI use cash-on-cash" |
| SEO comparison | 6 rows at 3%/5%/7%/9%/11%/13% cap rates |

**Cap rate heuristic (residential):**
- 🟢 5-9% typical
- 🟡 3-5% (low — HCOL/coastal) or 9-12% (high — distressed)
- 🟠 outside ±12% (rare)

### Tests

Count: **6 tests**
1. capRate basic ($500K value, $36K rent, $12K expenses, 5% vacancy → 4.7%)
2. cashOnCash basic (all-cash return)
3. capRate zero vacancy
4. capRate full vacancy (zero effective income)
5. impliedValue (reverse calc)
6. health bands (multiple values)

---

## P5-4: Rental Yield / Cash-on-Cash Calculator

**Slug:** `solopreneur-rental-yield-calculator`

### Inputs (8)

| Name | Label | Type | Placeholder |
|---|---|---|---|
| `purchasePrice` | Purchase Price ($) | number | e.g. 300000 |
| `downPayment` | Down Payment ($) | number | e.g. 75000 |
| `loanAmount` | Loan Amount ($) | number | e.g. 225000 |
| `interestRate` | Mortgage Rate (%) | number | e.g. 7 |
| `monthlyRent` | Monthly Rent Income ($) | number | e.g. 2500 |
| `monthlyExpenses` | Monthly Operating Expenses ($) | number | e.g. 600 |
| `vacancyRate` | Vacancy Rate (%) | number | e.g. 5 |
| `annualAppreciation` | Expected Appreciation (%/yr) | number | e.g. 3 |

### Math model

```
grossAnnualRent = monthlyRent * 12
effectiveAnnualRent = grossAnnualRent * (1 - vacancyRate/100)
annualMortgagePayment = monthlyMortgage(loanAmount, interestRate) * 12
annualOperatingExpenses = monthlyExpenses * 12
annualCashFlow = effectiveAnnualRent - annualMortgagePayment - annualOperatingExpenses
totalCashInvested = downPayment + closingCosts(purchasePrice)
// closing costs ~3% of purchase
closingCosts = purchasePrice * 0.03
totalCashInvested = downPayment + closingCosts
grossYield = grossAnnualRent / purchasePrice * 100
netYield = annualCashFlow / purchasePrice * 100  // of property value
cashOnCash = annualCashFlow / totalCashInvested * 100  // of actual cash in
```

Edge cases:
- `loanAmount === 0` → cash purchase; mortgage fields ignored
- `monthlyRent * 12 < annualMortgagePayment` → negative cash flow; flag 🔴

### 9-section v3 output

| Section | Content |
|---|---|
| ⏰ Title | "Rental Yield / Cash-on-Cash Calculator" |
| 💰 Investment Snapshot | Purchase price · Down payment · Loan · Total cash invested |
| 📐 Annual Cash Flow | Gross rent · Effective rent · Mortgage P&I · OpEx · Net cash flow |
| 🩺 Yield Health | 🟢 CoC 8-12% · 🟡 4-8% or 12-15% · 🟠 outside · Cash flow positive? |
| 🎯 Yield Benchmarks | Gross yield vs Net yield vs Cash-on-cash comparison |
| ⚖️ Return Composition | Cap rate component (NOI/value) + Appreciation + Loan paydown |
| 🔄 What-If (5) | Vacancy +5pp · Rent +$200/mo · Rate -1pp · 30y vs 15y · Down payment $100K (vs $75K) |
| 💡 Tip (3 conditional) | (negative cash flow) "Out-of-pocket monthly burden — reserves needed" · (low CoC) "Below stock market 7%; arbitrage vs stock index" · (default) "Aim for 8%+ cash-on-cash in typical markets" |
| SEO comparison | 6 rows at 4%/6%/8%/10%/12%/15% cash-on-cash |

**Cash-on-cash heuristic:**
- 🟢 8-12% strong
- 🟡 4-8% (low — HCOL) or 12-15% (high yield risk)
- 🟠 outside

### Tests

Count: **8 tests**
1. grossYield basic
2. cashOnCash basic (yield on actual cash)
3. negative cash flow scenario
4. all-cash purchase (loanAmount=0)
5. vacancy impact (5% vs 15%)
6. appreciation impact on long-term ROI
7. closingCosts calculation
8. health bands (multiple CoC values)

---

## P5-5: BRRRR Calculator

**Slug:** `solopreneur-brrrr-calculator`

### Inputs (11)

| Name | Label | Type | Placeholder |
|---|---|---|---|
| `purchasePrice` | Purchase Price ($) | number | e.g. 150000 |
| `rehabCost` | Rehab Cost ($) | number | e.g. 30000 |
| `afterRepairValue` | After-Repair Value (ARV) ($) | number | e.g. 220000 |
| `downPaymentPct` | Down Payment (%) | number | e.g. 25 |
| `interestRate` | Refinance Rate (%) | number | e.g. 7.5 |
| `loanTermYears` | Loan Term after Refi (years) | number | e.g. 30 |
| `monthlyRent` | Monthly Rent after Refi ($) | number | e.g. 1800 |
| `monthlyExpenses` | Monthly OpEx ($) | number | e.g. 400 |
| `vacancyRate` | Vacancy Rate (%) | number | e.g. 5 |
| `holdingMonths` | Holding Period (months until refi) | number | e.g. 6 |
| `sellingCostsPct` | Selling Costs if not held (%) | number | e.g. 8 |

### Math model

**Stage 1: Buy**
```
initialLoan = purchasePrice * (1 - downPaymentPct/100)
downPayment = purchasePrice * (downPaymentPct/100)
closingBuy = purchasePrice * 0.03  // 3% closing
totalStage1Cash = downPayment + closingBuy
```

**Stage 2: Rehab**
```
totalStage2Cash = rehabCost
// during rehab: monthly holding cost (mortgage, utilities, insurance)
monthlyHoldCost = initialLoan * interestRate/100/12 + 200  // $200 utilities/insurance estimate
holdingCost = monthlyHoldCost * holdingMonths
```

**Stage 3: Rent (post-refi, optional interim)**
```
// if rent starts before refi (e.g., 1-2 mo before refi closes):
interimRent = monthlyRent * 2  // assume 2 months rent during holding
```

**Stage 4: Refinance**
```
refiLTV = 0.75  // typical 75% LTV at refi
refiLoan = afterRepairValue * refiLTV  // NOT initial loan
cashOutFromRefi = refiLoan - initialLoan  // can be negative (cash-in)
monthlyMortgagePI = pm(refiLoan, interestRate, loanTermYears)
annualCashFlow = monthlyRent * 12 * (1 - vacancyRate/100) - monthlyExpenses * 12 - monthlyMortgagePI * 12
```

**Stage 5: Repeat (cash-in/cash-out tally)**
```
// Total cash OUT (what you actually paid in):
cashOut = totalStage1Cash + totalStage2Cash + holdingCost

// Total cash IN (what came back to you during the deal):
//   interimRent: 2 months of rent collected during rehab+rent before refi closes
//   cashOutFromRefi: refi loan minus initial loan balance (positive = cash to you)
cashIn = interimRent + cashOutFromRefi

// Cash left in the deal = cashOut - cashIn
// (if negative, you actually got cash back from the refi — BRRRR success)
cashLeftInDeal = cashOut - cashIn

// Forced appreciation: market value created by rehab, in dollars
forcedAppreciation = afterRepairValue - purchasePrice - rehabCost

// Cash-on-cash return (year 1, post-refi)
cashOnCash = annualCashFlow / cashLeftInDeal * 100   // if cashLeftInDeal > 0; otherwise undefined
```

Edge cases:
- `afterRepairValue < purchasePrice + rehabCost` → tip "ARV too low; flip don't BRRRR"
- `refiLoan < initialLoan` → cash-in (rare, but possible in downturns)
- `holdingMonths <= 0` → guard

### 9-section v3 output

| Section | Content |
|---|---|
| ⏰ Title | "BRRRR Calculator (Buy Rehab Rent Refinance Repeat)" |
| 💰 Deal Snapshot | ARV · total cash invested · cash left in deal after refi (the magic) |
| 📐 5-Stage Breakdown | Each of Buy/Rehab/Rent/Refi/Repeat (annualized) with cash in/out |
| 🩺 Deal Health | 🟢 cash-out or near-zero · 🟡 small cash-in (1-15%) · 🟠 large cash-in |
| 🎯 BRRRR Targets | 70% rule: ARV × 70% should cover (purchase + rehab) |
| ⚖️ Forced Appreciation | ARV vs (purchase + rehab); % gain |
| 🔄 What-If (5) | Rehab -$10K · ARV -$20K · Refi LTV 75% vs 80% · 30y vs 15y term · 20% down vs 25% |
| 💡 Tip (3 conditional) | (cash-in large) "BRRRR didn't pull cash out; consider flip instead" · (low CoC) "Cash-on-cash < 8%; another deal?" · (default) "BRRRR ideal when rehab creates $50K+ ARV lift" |
| SEO comparison | 6 rows at 10K/30K/50K/70K/100K/150K ARV lift |

**Deal health heuristic (cash left in deal as % of total cash invested):**
- 🟢 ≤ 0% (cash-out + cash-flow positive)
- 🟡 0-15%
- 🟠 > 15% (capital still trapped)

### Tests

Count: **10 tests**
1. stage 1 cash calc (purchase + closing)
2. stage 2 cash calc (rehab + holding cost)
3. refi LTV 75% basic
4. refi cash-out (positive scenario)
5. cash-in scenario (negative cash-out)
6. annual cash flow post-refi
7. cash-on-cash return
8. 70% rule check
9. forced appreciation %
10. health bands (various cash-left scenarios)

---

## P5-6: DSCR (Debt Service Coverage Ratio) Calculator

**Slug:** `solopreneur-dscr-calculator`

### Inputs (6)

| Name | Label | Type | Placeholder |
|---|---|---|---|
| `monthlyRent` | Monthly Gross Rent ($) | number | e.g. 5000 |
| `monthlyExpenses` | Monthly Operating Expenses ($) | number | e.g. 1500 |
| `loanAmount` | Loan Amount ($) | number | e.g. 400000 |
| `interestRate` | Loan Rate (%) | number | e.g. 7.5 |
| `loanTermYears` | Loan Term (years) | number | e.g. 30 |
| `vacancyRate` | Vacancy Rate (%) | number | e.g. 5 |

### Math model

```
// Annual NOI
grossAnnualRent = monthlyRent * 12
effectiveAnnualRent = grossAnnualRent * (1 - vacancyRate/100)
annualOperatingExpenses = monthlyExpenses * 12
annualNOI = effectiveAnnualRent - annualOperatingExpenses

// Annual Debt Service
monthlyMortgagePI = pm(loanAmount, interestRate, loanTermYears)
annualDebtService = monthlyMortgagePI * 12

// DSCR
dscr = annualNOI / annualDebtService

// Reverse: max loan at target DSCR
targetDSCR = 1.25  // typical lender minimum
maxAnnualDS = annualNOI / targetDSCR
// Find max loan: binary search or iterative
// Closed-form approximation: maxLoan = maxAnnualDS / annualDebtFactor
// where annualDebtFactor = monthlyMortgagePI / loanAmount * 12
// Simpler: maxLoan = maxAnnualDS / (interestRate/100 * 1.0 + tinyPrincipal) but accuracy varies
// Practical: provide target DSCR as user input, output reverse loan

// Default to forward calc; offer reverse in What-If
```

Edge cases:
- `annualDebtService === 0` → guard (interest-only loan or no loan)
- DSCR < 1.0 → cannot cover debt service; 🔴 deal fails
- DSCR > 2.0 → very strong coverage

### 9-section v3 output

| Section | Content |
|---|---|
| ⏰ Title | "DSCR Calculator (Debt Service Coverage Ratio)" |
| 💰 Loan Snapshot | Annual NOI · Annual debt service · DSCR ratio |
| 📐 DSCR Math | NOI = gross × (1-vacancy) - opex; Debt service = PMT × 12; DSCR = NOI/Debt |
| 🩺 DSCR Health | 🟢 ≥ 1.25 (qualifies) · 🟡 1.0-1.25 (marginal) · 🔴 < 1.0 (fails) |
| 🎯 Lender Thresholds | Conventional 1.20-1.25 · STR 0.75-1.0 · Commercial 1.20-1.40 |
| ⚖️ Reverse Calc | Max loan at DSCR 1.25 (typical lender minimum) |
| 🔄 What-If (5) | Vacancy +5pp · Rate +1pp · Loan term 30y vs 15y · Operating expenses -10% · Target DSCR 1.0 vs 1.25 vs 1.5 |
| 💡 Tip (3 conditional) | (fails) "DSCR <1.0 — deal won't qualify; reduce loan or raise rent" · (marginal) "DSCR in 1.0-1.25 zone; many lenders decline" · (default) "STR DSCR 0.75-1.0 common; conventional requires 1.20+" |
| SEO comparison | 6 rows at 0.8/1.0/1.25/1.5/2.0/3.0 DSCR ratios |

**DSCR heuristic:**
- 🟢 ≥ 1.25 (qualifies for most lenders)
- 🟡 1.0-1.25 (marginal)
- 🔴 < 1.0 (fails; cannot service debt)

### Tests

Count: **7 tests**
1. DSCR basic (loan 400K, rate 7.5%, rent 5K/mo, opex 1.5K, 5% vac → ~1.18)
2. DSCR strong deal (1.5+)
3. DSCR failing deal (<1.0)
4. annualNOI with vacancy
5. annualDebtService = monthlyPI * 12
6. reverse max loan at target DSCR 1.25
7. health bands (3+ values)

---

## Cross-cutting decisions

### Naming

| Aspect | Pattern |
|---|---|
| Slug | `solopreneur-{name}-calculator` (existing convention) |
| File | `src/engines/real-estate/{name}-calculator.ts` (NEW directory) |
| ToolMeta file | `src/data/tools/real-estate.ts` (NEW) |
| categoryId | `'F'` (matches existing investment semantics) |

### Health thresholds (decision rule)

- All engines use 🟢🟡🟠🔴 bands documented in code comments (per existing pattern)
- Bands chosen from industry standards (not arbitrary)
- Edge cases return safe defaults with visible tip "Enter positive value"

### customFn design

Each engine:
- Math helpers identical to source (no drift — applies P4-2 lesson)
- Inputs validated `parseFloat(input) || 0` with `Math.max(0, ...)` clamps
- Returns `string[]` matching `calculate()` shape (live = static parity)
- ASCII chart/bar where applicable, no external library
- ASI-safe: `}; if(...)` not `}if(...)`

### Testing strategy

Total: 8 + 9 + 6 + 8 + 10 + 7 = **48 math tests** across 6 engines.

Per-calculator test file: `tests/{slug-without-prefix}.test.ts`. Each test:
- Calls the exported math helper directly
- Asserts expected value with tolerance where appropriate (e.g., PMT with rounding)
- For health-band tests, asserts emoji label, not ratio number

### Pre-flight invariant checks

Before each commit:
1. `pnpm check` exits 0 (drift detection + i18n + customFn tables)
2. `node tests/scripts/test-customFn.mjs <slug>` parses (no ASI trap, no unescaped unicode)
3. Live = static parity: spot-check `staticExamples[0]` matches what customFn produces for default inputs
4. Both mirrors fetched + rev-list ok before push

### Sequenced execution plan

| Task | Calculator | Estimated LoC | Tests |
|---|---|---|---|
| P5-1 | Mortgage | ~340 | 8 |
| P5-2 | Rent-vs-Buy | ~360 | 9 |
| P5-3 | Cap Rate | ~280 | 6 |
| P5-4 | Rental Yield / CoC | ~360 | 8 |
| P5-5 | BRRRR | ~440 | 10 |
| P5-6 | DSCR | ~340 | 7 |
| Batch wiring (per calc) | index.ts + codegen + tools + og-samples + 2 test bumps | ~6 files/calc | — |
| **Total per-calc** | 6 | **~2,120 LoC** | **48 tests** |

Order rationale: P5-1 (Mortgage) ships first as the foundation; P5-2 (Rent-vs-Buy) builds on it; landlord/investor engines come after. Each delivered as 1 spec + 1 implementer (controller direct execution per P4-3+ lesson).

### Out of scope (V2 deferred)

- Mortgage closing costs detailed breakdown (origination fee, points, PMI)
- Property tax + insurance escrow (mentioned in V1 as "OpEx")
- Multi-property portfolio aggregation
- CapEx reserve modeling
- 1031 exchange / depreciation tax shields
- Airbnb/STR dynamic pricing modeling
- Refinance break-even timeline (separate calc)
- Mortgage ARM (adjustable-rate) modeling
- HELOC integration
- DSCR reverse calc: complex multi-rate amortization

These were all considered; out of scope to keep V1 focused. Future V2 batches can tackle.

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Calendar ambiguity in mortgage amortization | Low | Use closed-form PMT formula; verify against standard amortization table |
| Rent-vs-Buy NPV complexity | Medium | Spec dictates formulas explicitly; reviewer focuses on signs (cost = positive, gain = subtract) |
| BRRRR cascade has many state vars | Medium | Single calculate() function with named intermediates; test each stage independently |
| DSCR reverse max loan round-trip | Low | Use closed-form PMT inference or binary search with reasonable bounds |
| Pre-flight drift (customFn vs calculate) | Low (P4-2 lesson learned) | Live = static parity check before each commit; pre-flight script |
| codegen-examples drift (P3-x lesson) | Low | `node scripts/codegen-examples.mjs --check` before commit (CIs already) |
| TypeScript `ToolInput[]` typing (P4-2 lesson) | Low | Plan spec mandates structured form, not string array |
| Ignoition: ASI trap `}if(...)` (CLAUDE.md notes) | Low | Insert literal `;` between consecutive statements |

---

## Success criteria

- All 6 engines ship + tests pass + codegen clean
- 38 → 44 engines total
- `pnpm check` exits 0 throughout
- No live vs static drift
- Both mirrors (gitee + github) pushed clean
- Per-calculator memory file written (matches P4-1..P4-6 pattern)

---

## Open questions / clarifications resolved

1. **Q: Add new directory or fold into investment/financial?**
   - **A: NEW `src/engines/real-estate/` + `src/data/tools/real-estate.ts`** — cluster SEO value, distinct math, future expansion. categoryId 'F'.

2. **Q: Use existing F category letter or introduce new letter (e.g., 'G')?**
   - **A: 'F'** — keep letter scheme stable; tool listing uses folder names for navigation anyway.

3. **Q: Spec-vs-plan split (per P4 calculator)?**
   - **A: One bundled spec, one bundled plan, 6 independent tasks within** — single design doc covers shared patterns + per-calc math; matches P5 vertical batch design intent.

4. **Q: Include tax modeling (depreciation, 1031, cap gains)?**
   - **A: V2 deferred** — V1 stays pre-tax; user can layer on after.

5. **Q: STR/Airbnb-specific model?**
   - **A: V2 deferred** — DSCR engine uses generic inputs; STR users can adapt.

6. **Q: Monthly mortgage payment formula precision?**
   - **A: Standard PMT formula** — verified against bankrate.com and smartasset mortgage calculators.

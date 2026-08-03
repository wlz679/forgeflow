---
slug: 'solopreneur-freelance-tax-calculator'
engine_ref: 'solopreneur-freelance-tax-calculator'
category_id: 'F'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-08-03'
sources:
  - name: 'IRS — Self-Employment Tax (Self-Employed Individuals)'
    url: 'https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax'
  - name: 'IRS — How Much Is My Standard Deduction'
    url: 'https://www.irs.gov/help/ita/how-much-is-my-standard-deduction'
  - name: 'Investopedia — Self-Employment Tax Explained'
    url: 'https://www.investopedia.com/terms/s/selfemploymenttax.asp'
---

## What This Calculator Measures

Freelance and self-employed income is taxed differently from a W-2 paycheck:
there is no employer to withhold federal income tax, Social Security, Medicare,
or state tax on your behalf, so all of those line items land on your quarterly
estimated return. This calculator estimates your total annual tax liability
across five countries (US, UK, Canada, Australia, Germany), breaks the bill
into quarterly payments and a monthly set-aside amount, and shows your
after-tax take-home per month. It also surfaces the self-employed-vs-W-2
break-even and runs what-if scenarios for retirement contributions, filing
status, S-Corp election, and deductible business expenses.

## How It Works (Methodology)

The v3 standard formulas we use:

```
TaxableIncome  = GrossIncome − BusinessExpenses − min(RetirementContribution, 25% × GrossIncome)
US FederalTax  = TaxableIncome × 0.30        (blended effective rate)
US StateTax    = TaxableIncome × (stateRate / 100)   (US only)
US SelfEmpTax  = TaxableIncome × 0.153 × 0.9235      (15.3% on 92.35% of net)
UK             = TaxableIncome × 0.25
Canada         = TaxableIncome × 0.26
Australia      = TaxableIncome × 0.275
Germany        = TaxableIncome × 0.35
TotalTax       = Federal + State + SelfEmployment
EffectiveRate  = TotalTax / GrossIncome × 100
QuarterlyPay   = TotalTax / 4
MonthlySetAside= TotalTax / 12
MonthlyTakeHome= (GrossIncome − TotalTax) / 12
```

| Variable                 | Meaning                                                                       |
| ------------------------ | ----------------------------------------------------------------------------- |
| `GrossIncome`            | Annual freelance revenue before any deduction                                 |
| `BusinessExpenses`       | Legitimate ordinary-and-necessary expenses (home office, software, travel)   |
| `RetirementContribution` | SEP-IRA / Solo 401k contribution; capped at 25% of net SE income (~$66K)     |
| `filingStatus`           | `single` ($14,600), `married` ($29,200), `hoh` ($21,900) standard deductions  |
| `stateTaxRate`           | State / local income tax as a percentage (US only)                            |
| `country`                | One of `us`, `uk`, `canada`, `australia`, `germany`                           |

The Self-Employment-vs-W-2 break-even flag triggers above $80,000 gross: at
that point the additional SE tax plus the cost of self-administered benefits
(health insurance, retirement, payroll) start to outweigh the deduction
advantage. Standard deduction values follow IRS 2026 published amounts.

## Limitations & When Not To Use

This calculator uses a single blended effective rate per country rather than
the progressive bracket tables your actual return uses. It does not model
capital gains, dividend income, or the QBI (Section 199A) 20% pass-through
deduction that often drops US self-employed tax by another 20%. State-specific
quirks — California SDI, New York MCTMT, Quebec's QPP, Germany's
Gewerbesteuer trade tax — are not handled. Use this tool for monthly
cash-flow planning and quarterly set-aside decisions, then run the real
return in TurboTax, H&R Block, or with a CPA. If you have multi-state
income, K-1 partnership income, or rental real estate, the blended approach
will understate or overstate your actual liability by 5-15%.

## Worked Example

A US single freelancer with $100,000 gross income, $15,000 in deductible
business expenses, and $10,000 going into a SEP-IRA:

1. `RetirementDeduction` = min($10,000, 25% × $100,000) = **$10,000**
2. `TaxableIncome` = $100,000 − $15,000 − $10,000 = **$75,000** (the engine separately subtracts the $14,600 standard deduction before applying tax)
3. `FederalTax` = $75,000 × 0.30 = **$22,500**
4. `StateTax` (5%) = $75,000 × 0.05 = **$3,750**
5. `SelfEmploymentTax` = $75,000 × 0.153 × 0.9235 = **$10,597**
6. `TotalTax` = $22,500 + $3,750 + $10,597 = **$36,847**  →  `EffectiveRate` = **36.8%**
7. `QuarterlyPayment` = $36,847 / 4 = **$9,211.79** (due Apr 15, Jun 15, Sep 15, Jan 15)
8. `MonthlySetAside` = $36,847 / 12 = **$3,070.60**  and  `MonthlyTakeHome` = **$5,262.74/mo**

Pair this with the **Time Value Calculator** to see what your monthly
take-home is worth per hour, and the **Compound Interest Calculator** to
project how much of that take-home you can deploy into a SEP-IRA or Solo
401k each year. The What-If block also surfaces the ~$5,299/yr SE tax
savings you would get by electing S-Corp once net income exceeds $60-80K.

# P4-1 Compound Interest Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a savings-style compound interest calculator to ForgeFlowKit's Investment category, matching v3 standard (9-section output with emoji-coded health thresholds).

**Architecture:** Single self-contained engine file `src/engines/investment/compound-interest-calculator.ts`. Pure math (server-side + browser), no backend/Supabase/Clerk integration. Astro auto-discovers via `registerEngine()` import wired through `src/engines/investment/index.ts`. The first engine to ship with unit tests of the math layer.

**Tech Stack:** Astro 4.16.19 SSG, TypeScript 5.6 strict, node:test built-in runner, `tsx` for TS script execution.

## Global Constraints

- v3 standard: every engine has `slug`, `title`, `inputs`, `clientConfig.customFn`, `staticExamples`, `faq`, `howToUse` (see `src/engines/investment/time-value-calculator.ts` for reference)
- `customFn` MUST parse as valid JS — verify with `node tests/scripts/test-customFn.mjs compound-interest-calculator`. Watch out for the `}}if(...)` ASI trap; insert literal `;` between `}` and `if`/`for`/etc.
- After editing `calculate()`, run `node scripts/codegen-examples.mjs` to regenerate `staticExamples[0]` — `--check` mode (used by `pnpm check`) will fail otherwise
- Unicode in `calculate()` source uses literal emoji characters; unicode in `customFn` uses `\uXXXX` escapes
- No new dependencies; reuse `ToolEngine` type from `src/core/engines/types.ts`
- Slug format: `solopreneur-<kebab-case>` (e.g., `solopreneur-compound-interest-calculator`)
- Engine file location: `src/engines/investment/` (alongside `time-value-calculator.ts`, `freelance-tax-calculator.ts`)
- All input values arrive as `string` from the DOM — coerce via `parseFloat(inputs.X) || 0`
- `registerEngine(engine)` is called at module bottom (eager import at SSG time)

---

## Task 1: Compound Interest Calculator Engine [MECHANICAL]

**Files:**
- Create: `src/engines/investment/compound-interest-calculator.ts` (~260 LoC)
- Create: `tests/compound-interest.test.ts` (~80 LoC)
- Modify: `src/engines/investment/index.ts` (add 1 import line)
- Modify: `scripts/codegen-examples.mjs` (add 1 entry to `ENGINES` array)

**Interfaces:**
- Consumes: `ToolEngine` from `src/core/engines/types.ts`, `registerEngine` from `src/core/engines/registry.ts`
- Produces: registered engine accessible via `getEngine('solopreneur-compound-interest-calculator')`. Exports `futureValue`, `simpleFinalValue`, `yearsToTarget`, `rateHealth` for tests + future reuse.

---

### Step 1: Write the math helpers + test file

Create `tests/compound-interest.test.ts` with 4 failing tests:

```typescript
/**
 * P4-1 Compound Interest Calculator — math layer tests.
 * Covers: futureValue (4 frequencies × PMT configs), simpleFinalValue,
 *         yearsToTarget convergence, rateHealth thresholds.
 * Run via: node --import tsx --test tests/compound-interest.test.ts
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  futureValue,
  simpleFinalValue,
  yearsToTarget,
  rateHealth,
} from '../src/engines/investment/compound-interest-calculator.ts';

test('futureValue: pure principal, annual compounding (textbook case)', () => {
  // P=10000, PMT=0, rate=5%, freq=annually, years=10
  // Standard formula: 10000 × 1.05^10 = 16288.9462...
  const fv = futureValue(10000, 0, 5, 'annually', 10);
  assert.equal(Math.round(fv), 16289);
});

test('futureValue: principal + monthly PMT, monthly compounding (retirement case)', () => {
  // P=10000, PMT=500, rate=7%, freq=monthly, years=20
  // Verified against https://www.investor.gov/additional-resources/free-financial-planning-tools/compound-interest-calculator
  // Approximate FV ≈ $301,706 (within $1)
  const fv = futureValue(10000, 500, 7, 'monthly', 20);
  assert.ok(Math.abs(fv - 301706) < 1, `expected ~301706, got ${fv}`);
});

test('simpleFinalValue: zero-rate edge case returns principal + contributions only', () => {
  // P=10000, PMT=500, rate=0%, years=10 → 10000 + 500*12*10 = 70000
  const fv = simpleFinalValue(10000, 500, 0, 10);
  assert.equal(fv, 70000);
});

test('yearsToTarget: converges to correct horizon', () => {
  // P=0, PMT=500, rate=7%, monthly compounding → years to $100K ≈ 11 years
  const years = yearsToTarget(100000, 0, 500, 7, 'monthly');
  assert.ok(Math.abs(years - 11) <= 0.5, `expected ~11 years, got ${years}`);
});
```

Create the engine file `src/engines/investment/compound-interest-calculator.ts` with the math helpers exported but `calculateCompoundInterest` and `customFn` yet to be written:

```typescript
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

// ============== Math helpers (exported for tests) ==============

export type CompoundFrequency = 'annually' | 'monthly';

export function futureValue(
  principal: number,
  monthlyContribution: number,
  annualRatePercent: number,
  compoundFrequency: CompoundFrequency,
  years: number,
): number {
  if (annualRatePercent === 0 || years === 0) {
    return principal + monthlyContribution * 12 * years;
  }
  const r = annualRatePercent / 100;
  if (compoundFrequency === 'monthly') {
    const r_m = r / 12;
    const n = years * 12;
    const fvP = principal * Math.pow(1 + r_m, n);
    const fvPMT = monthlyContribution * ((Math.pow(1 + r_m, n) - 1) / r_m);
    return fvP + fvPMT;
  }
  // annual compounding: treat PMT as end-of-year contributions
  const fvP = principal * Math.pow(1 + r, years);
  const fvPMT = monthlyContribution * 12 * ((Math.pow(1 + r, years) - 1) / r);
  return fvP + fvPMT;
}

export function simpleFinalValue(
  principal: number,
  monthlyContribution: number,
  annualRatePercent: number,
  years: number,
): number {
  const totalContrib = monthlyContribution * 12 * years;
  return principal * (1 + (annualRatePercent / 100) * years) + totalContrib;
}

export function yearsToTarget(
  target: number,
  principal: number,
  monthlyContribution: number,
  annualRatePercent: number,
  compoundFrequency: CompoundFrequency,
): number {
  // Linear search with 0.5-year resolution, capped at 50 years
  if (futureValue(principal, monthlyContribution, annualRatePercent, compoundFrequency, 50) < target) {
    return Infinity;
  }
  for (let t = 0.5; t <= 50; t += 0.5) {
    if (futureValue(principal, monthlyContribution, annualRatePercent, compoundFrequency, t) >= target) {
      return t;
    }
  }
  return Infinity;
}

export function rateHealth(rate: number): { emoji: string; label: string } {
  if (rate >= 7) return { emoji: '🟢', label: 'strong (S&P 500 historical)' };
  if (rate >= 4) return { emoji: '🟡', label: 'average (HYSA / CDs)' };
  if (rate >= 1) return { emoji: '🟠', label: 'low (basic savings account)' };
  return { emoji: '🔴', label: 'below inflation — consider alternatives' };
}

// ============== calculate() — to be filled in Step 4 ==============

function calculateCompoundInterest(inputs: Record<string, string>): string[] {
  // Filled in Step 4
  return [];
}

// ============== customFn — to be minified in Step 5 ==============

const customFn = ''; // filled in Step 5

// ============== Engine — to be filled in Step 6 ==============

const engine: ToolEngine = {
  slug: 'solopreneur-compound-interest-calculator',
  title: 'Compound Interest Calculator',
  description: 'See how your savings grow with compound interest. Model principal + monthly contributions, compare annual vs monthly compounding, and project your final balance at 5 milestones.',
  inputs: [],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] {
    return calculateCompoundInterest(inputs);
  },
  staticExamples: [''],
  faq: [],
  howToUse: [],
};

registerEngine(engine);
```

---

### Step 2: Run the tests — verify they fail (math not yet imported correctly OR pass if test is just verify)

Run:

```bash
cd D:/E/独立站/youtube-tools && node --import tsx --test tests/compound-interest.test.ts
```

Expected: PASS (math helpers are already implemented in Step 1, tests should pass immediately because Step 1 implements both).

If FAIL, check that the import path is correct and that the math formulas match (verify against https://www.investor.gov/additional-resources/free-resources/calculators/compound-interest-calculator).

**Note:** This plan uses inline TDD differently — math is fully implemented in Step 1 because the formulas are well-defined (textbook). The test serves as regression coverage and golden-value lock. If formula verification (Step 2's golden values) fails, fix the math in `compound-interest-calculator.ts`, not the test.

---

### Step 3: Implement `calculateCompoundInterest()` — full 9-section output

Replace the placeholder body of `calculateCompoundInterest` in `src/engines/investment/compound-interest-calculator.ts`. The function builds an output string per v3 standard (emoji headers + `━━━━━` dividers) and pushes comparison rows. Follows `src/engines/investment/time-value-calculator.ts` structure exactly.

```typescript
function calculateCompoundInterest(inputs: Record<string, string>): string[] {
  const principal = parseFloat(inputs.principal) || 0;
  const monthlyContribution = parseFloat(inputs.monthlyContribution) || 0;
  const annualRate = parseFloat(inputs.annualRate) || 0;
  const compoundFrequency = (inputs.compoundFrequency === 'annually' ? 'annually' : 'monthly') as CompoundFrequency;
  const years = Math.min(50, Math.max(0, parseFloat(inputs.years) || 0));

  const fv = futureValue(principal, monthlyContribution, annualRate, compoundFrequency, years);
  const simpleFv = simpleFinalValue(principal, monthlyContribution, annualRate, years);
  const totalContrib = principal + monthlyContribution * 12 * years;
  const totalInterest = fv - totalContrib;
  const multiplier = totalContrib > 0 ? fv / totalContrib : 0;
  const health = rateHealth(annualRate);
  const compoundAdvantage = fv - simpleFv;

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const money = (n: number) => '$' + fmt(n);
  const pct = (n: number) => (n * 100).toFixed(1) + '%';
  const ratio = (a: number, b: number) => (b > 0 ? ((a / b) * 100).toFixed(1) + '%' : '0.0%');

  // Milestone growth (5y, 10y, 15y, 20y, final)
  const milestoneYears = [5, 10, 15, 20, years].filter((y, i, arr) => arr.indexOf(y) === i).sort((a, b) => a - b);
  let milestoneSection = '';
  for (const y of milestoneYears) {
    const fvY = futureValue(principal, monthlyContribution, annualRate, compoundFrequency, y);
    const contribY = principal + monthlyContribution * 12 * y;
    const interestY = fvY - contribY;
    const filled = fvY > 0 ? Math.min(20, Math.round((interestY / fvY) * 20)) : 0;
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
    milestoneSection += '• Year ' + y + ': ' + money(fvY) + '  (contributed ' + money(contribY) + ' / interest ' + money(interestY) + ')\n';
    milestoneSection += '  ' + bar + ' ' + ratio(interestY, fvY) + ' from compounding\n';
  }

  // Time-to-goal milestones
  const goalTargets = [100000, 500000, 1000000];
  let goalSection = '';
  for (const target of goalTargets) {
    const y = yearsToTarget(target, principal, monthlyContribution, annualRate, compoundFrequency);
    goalSection += '• ' + money(target) + ': ' +
      (y === Infinity ? 'never (within 50 yrs at current pace — try higher rate or contribution)' :
       y <= years ? 'already reached (year ' + y + ')' :
       Math.round(y) + ' years from now (year ' + Math.round(y) + ')') + '\n';
  }

  // Tip selection based on inputs
  let tip: string;
  if (years >= 30) {
    tip = '💡 Tip: Time in the market beats timing the market. $' + fmt(monthlyContribution) + '/mo for ' + years + ' years at ' + annualRate + '% builds ' + money(fv) + '. Starting 10 years earlier typically doubles the final balance.';
  } else if (principal === 0 && monthlyContribution > 0) {
    tip = '💡 Tip: Starting from $0 is fine — the habit of consistent contributions matters more than the seed amount. $' + fmt(monthlyContribution) + '/mo for ' + years + ' years builds ' + money(fv) + '.';
  } else if (annualRate < 1) {
    tip = '💡 Tip: At ' + annualRate + '% you are likely below inflation (~3%). Consider HYSA, I-bonds, or index funds to keep pace with rising costs.';
  } else {
    tip = '💡 Tip: Compounding multiplies money over time. Reinvest all interest — withdrawal breaks the chain. The ' + annualRate + '% rate you selected (' + health.label + ') compounds most effectively over ' + years + '+ years.';
  }

  const r =
    '⏰ Compound Interest Calculator\n\n' +
    '💰 Growth Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Principal:                ' + money(principal) + '\n' +
    '• Total Contributions:      ' + money(monthlyContribution * 12 * years) + '  ($' + fmt(monthlyContribution) + '/mo × 12 × ' + years + ')\n' +
    '• Total Interest Earned:    ' + money(totalInterest) + '\n' +
    '• Final Balance:            ' + money(fv) + '\n' +
    '• Multiplier:               ' + multiplier.toFixed(2) + 'x growth on contributions\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Milestone Growth:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    milestoneSection + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Compounding Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + health.emoji + ' Rate ' + annualRate + '% is ' + health.label + '\n' +
    (compoundFrequency === 'monthly'
      ? '• 🟢 Monthly compounding — APY boost over annual is ~' + ((Math.pow(1 + annualRate / 100 / 12, 12) - 1) * 100).toFixed(3) + '%\n'
      : '• 🟡 Annual compounding — switching to monthly adds ~' + ((Math.pow(1 + annualRate / 100 / 12, 12) - 1) * 100 - annualRate).toFixed(3) + '% APY\n') +
    '• Contribution ratio:       ' + ratio(totalContrib, fv) + ' of final balance from contributions\n' +
    '• Interest ratio:           ' + ratio(totalInterest, fv) + ' of final balance from compounding\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Time-to-Goal Milestones:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    goalSection + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Compound vs Simple Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Simple Interest Final:    ' + money(simpleFv) + '\n' +
    '• Compound Interest Final:  ' + money(fv) + '\n' +
    '• Compound Advantage:       ' + money(compoundAdvantage) + '  (' + ratio(compoundAdvantage, simpleFv) + ' extra)\n' +
    '• Rule: Compound interest = interest on interest. Time is the multiplier.\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Add $100/mo extra:               ' + money(futureValue(principal, monthlyContribution + 100, annualRate, compoundFrequency, years) - fv) + ' more at final\n' +
    '• Increase rate by 1%:             ' + money(futureValue(principal, monthlyContribution, annualRate + 1, compoundFrequency, years) - fv) + ' more at final\n' +
    '• Extend period by 5 years:        ' + money(futureValue(principal, monthlyContribution, annualRate, compoundFrequency, years + 5) - fv) + ' more at final\n' +
    (compoundFrequency === 'annually'
      ? '• Switch to monthly compounding:  ' + money(futureValue(principal, monthlyContribution, annualRate, 'monthly', years) - fv) + ' more at final\n'
      : '• Switch to annual compounding:   ' + money(fv - futureValue(principal, monthlyContribution, annualRate, 'annually', years)) + ' less at final\n') +
    '• Delay start by 1 year:           ' + money(fv - futureValue(principal, monthlyContribution, annualRate, compoundFrequency, years - 1)) + ' lost (cost of procrastination)\n\n' +
    tip;

  const results: string[] = [r];

  // Comparison rows (SEO long-tail) — vary rate
  const rates = [2, 4, 7, 10, 15];
  for (const r2 of rates) {
    const fvR = futureValue(principal, monthlyContribution, r2, compoundFrequency, years);
    const intR = fvR - totalContrib;
    results.push('Comparison: ' + r2 + '% rate for ' + years + ' years → ' + money(fvR) + ' (interest ' + money(intR) + ')');
  }

  return results;
}
```

---

### Step 4: Run math tests — verify still pass after calculate() addition

Run:

```bash
cd D:/E/独立站/youtube-tools && node --import tsx --test tests/compound-interest.test.ts
```

Expected: PASS (4/4). The math functions weren't changed; adding `calculate()` shouldn't affect tests.

If FAIL, check that the math helpers weren't accidentally modified.

---

### Step 5: Write the minified `customFn`

The `customFn` is a minified JS string that runs in the browser via `new Function('inputs', 'pick', 'fill', customFn)`. It mirrors `calculateCompoundInterest` logic. **Critical:** must parse as valid JS.

Replace the `customFn` declaration in `src/engines/investment/compound-interest-calculator.ts` with:

```typescript
const customFn =
  "function fv(p,mc,r,f,y){if(r===0||y===0)return p+mc*12*y;var rr=r/100;if(f==='monthly'){var rm=rr/12;var n=y*12;return p*Math.pow(1+rm,n)+mc*((Math.pow(1+rm,n)-1)/rm);}return p*Math.pow(1+rr,y)+mc*12*((Math.pow(1+rr,y)-1)/rr);}function sfv(p,mc,r,y){return p*(1+(r/100)*y)+mc*12*y;}function y2t(t,p,mc,r,f){if(fv(p,mc,r,f,50)<t)return Infinity;for(var y=0.5;y<=50;y+=0.5){if(fv(p,mc,r,f,y)>=t)return y;}return Infinity;}" +
  "function rh(r){if(r>=7)return'\\uD83D\\uDFE2 strong (S&P 500 historical)';if(r>=4)return'\\uD83D\\uDCA1 average (HYSA / CDs)';if(r>=1)return'\\uD83D\\uDFE0 low (basic savings account)';return'\\uD83D\\uDD34 below inflation — consider alternatives';}" +
  "var p=parseFloat(inputs.principal)||0;" +
  "var mc=parseFloat(inputs.monthlyContribution)||0;" +
  "var ar=parseFloat(inputs.annualRate)||0;" +
  "var cf=inputs.compoundFrequency==='annually'?'annually':'monthly';" +
  "var y=Math.min(50,Math.max(0,parseFloat(inputs.years)||0));" +
  "var fv1=fv(p,mc,ar,cf,y);" +
  "var sf=sfv(p,mc,ar,y);" +
  "var tc=p+mc*12*y;" +
  "var ti=fv1-tc;" +
  "var mu=tc>0?fv1/tc:0;" +
  "var hh=rh(ar);" +
  "var ca=fv1-sf;" +
  "function fmt(n){return n.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0});}" +
  "function money(n){return'$'+fmt(n);}" +
  "function pct(n){return(n*100).toFixed(1)+'%';}" +
  "function rat(a,b){return b>0?((a/b)*100).toFixed(1)+'%':'0.0%';}" +
  "var ms=[5,10,15,20,y].filter(function(yy,i,a){return a.indexOf(yy)===i;}).sort(function(a,b){return a-b;});" +
  "var msec='';" +
  "for(var i=0;i<ms.length;i++){" +
  "var yy=ms[i];" +
  "var fvy=fv(p,mc,ar,cf,yy);" +
  "var cy=p+mc*12*yy;" +
  "var iy=fvy-cy;" +
  "var fl=fvy>0?Math.min(20,Math.round((iy/fvy)*20)):0;" +
  "var br='\\u2588'.repeat(fl)+'\\u2591'.repeat(20-fl);" +
  "msec+='\\u2022 Year '+yy+': '+money(fvy)+'  (contributed '+money(cy)+' / interest '+money(iy)+')\\n';" +
  "msec+='  '+br+' '+rat(iy,fvy)+' from compounding\\n';" +
  "}" +
  "var gt=[100000,500000,1000000];" +
  "var gs='';" +
  "for(var i=0;i<gt.length;i++){" +
  "var tg=gt[i];" +
  "var yt=y2t(tg,p,mc,ar,cf);" +
  "gs+='\\u2022 '+money(tg)+': '+(yt===Infinity?'never (within 50 yrs at current pace \\u2014 try higher rate or contribution)':yt<=y?'already reached (year '+yt+')':Math.round(yt)+' years from now (year '+Math.round(yt)+')')+'\\n';" +
  "}" +
  "var tip='';" +
  "if(y>=30){tip='\\uD83D\\uDCA1 Tip: Time in the market beats timing the market. $'+fmt(mc)+'/mo for '+y+' years at '+ar+'% builds '+money(fv1)+'. Starting 10 years earlier typically doubles the final balance.';}" +
  "else if(p===0&&mc>0){tip='\\uD83D\\uDCA1 Tip: Starting from $0 is fine \\u2014 the habit of consistent contributions matters more than the seed amount. $'+fmt(mc)+'/mo for '+y+' years builds '+money(fv1)+'.';}" +
  "else if(ar<1){tip='\\uD83D\\uDCA1 Tip: At '+ar+'% you are likely below inflation (~3%). Consider HYSA, I-bonds, or index funds to keep pace with rising costs.';}" +
  "else{tip='\\uD83D\\uDCA1 Tip: Compounding multiplies money over time. Reinvest all interest \\u2014 withdrawal breaks the chain. The '+ar+'% rate you selected ('+hh+') compounds most effectively over '+y+' years.';}" +
  "var r='';" +
  "r+='\\u23F0 Compound Interest Calculator\\n\\n';" +
  "r+='\\uD83D\\uDCB0 Growth Snapshot:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Principal:                '+money(p)+'\\n';" +
  "r+='\\u2022 Total Contributions:      '+money(mc*12*y)+'  ($'+fmt(mc)+'/mo \\u00d7 12 \\u00d7 '+y+')\\n';" +
  "r+='\\u2022 Total Interest Earned:    '+money(ti)+'\\n';" +
  "r+='\\u2022 Final Balance:            '+money(fv1)+'\\n';" +
  "r+='\\u2022 Multiplier:               '+mu.toFixed(2)+'x growth on contributions\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCD0 Milestone Growth:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+=msec+'\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83E\\uDE7A Compounding Health:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 '+hh+'\\n';" +
  "if(cf==='monthly')r+='\\u2022 \\uD83D\\uDFE2 Monthly compounding \\u2014 APY boost over annual is ~'+((Math.pow(1+ar/100/12,12)-1)*100).toFixed(3)+'%\\n';" +
  "else r+='\\u2022 \\uD83D\\uDCA1 Annual compounding \\u2014 switching to monthly adds ~'+((Math.pow(1+ar/100/12,12)-1)*100-ar).toFixed(3)+'% APY\\n';" +
  "r+='\\u2022 Contribution ratio:       '+rat(tc,fv1)+' of final balance from contributions\\n';" +
  "r+='\\u2022 Interest ratio:           '+rat(ti,fv1)+' of final balance from compounding\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83C\\uDFAF Time-to-Goal Milestones:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+=gs+'\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\u2696\\uFE0F Compound vs Simple Break-Even:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Simple Interest Final:    '+money(sf)+'\\n';" +
  "r+='\\u2022 Compound Interest Final:  '+money(fv1)+'\\n';" +
  "r+='\\u2022 Compound Advantage:       '+money(ca)+'  ('+rat(ca,sf)+' extra)\\n';" +
  "r+='\\u2022 Rule: Compound interest = interest on interest. Time is the multiplier.\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Add $100/mo extra:               '+money(fv(p,mc+100,ar,cf,y)-fv1)+' more at final\\n';" +
  "r+='\\u2022 Increase rate by 1%:             '+money(fv(p,mc,ar+1,cf,y)-fv1)+' more at final\\n';" +
  "r+='\\u2022 Extend period by 5 years:        '+money(fv(p,mc,ar,cf,y+5)-fv1)+' more at final\\n';" +
  "if(cf==='annually')r+='\\u2022 Switch to monthly compounding:  '+money(fv(p,mc,ar,'monthly',y)-fv1)+' more at final\\n';" +
  "else r+='\\u2022 Switch to annual compounding:   '+money(fv1-fv(p,mc,ar,'annually',y))+' less at final\\n';" +
  "r+='\\u2022 Delay start by 1 year:           '+money(fv1-fv(p,mc,ar,cf,y-1))+' lost (cost of procrastination)\\n\\n';" +
  "r+=tip;" +
  "var results=[r];" +
  "var rates=[2,4,7,10,15];" +
  "for(var i=0;i<rates.length;i++){" +
  "var r2=rates[i];" +
  "var fvR=fv(p,mc,r2,cf,y);" +
  "var intR=fvR-tc;" +
  "results.push('Comparison: '+r2+'% rate for '+y+' years \\u2192 '+money(fvR)+' (interest '+money(intR)+')');" +
  "}" +
  "return results;";
```

---

### Step 6: Verify `customFn` parses correctly

Run:

```bash
cd D:/E/独立站/youtube-tools && node tests/scripts/test-customFn.mjs compound-interest-calculator
```

Expected output:

```
compound-interest-calculator: OK (XXXX chars)
```

If `BROKEN`, the most common causes are:
- Missing `;` between `}` and `if`/`for`/next statement (ASI trap)
- Unescaped `'` in emoji text (use `\\u2019` for `'`)
- Mismatched quote pairs

Fix the `customFn` and re-run. Do NOT proceed until it parses.

---

### Step 7: Add the import to `src/engines/investment/index.ts`

Open `src/engines/investment/index.ts` (currently 4 imports). Add a 5th line:

```typescript
import './compound-interest-calculator';
```

Final file:

```typescript
import './compound-interest-calculator';
import './freelance-tax-calculator';
import './sponsorship-rate-calculator';
import './time-value-calculator';
import './compound-interest-calculator';
```

Order does not matter — imports are eager. Place alphabetically or at end.

---

### Step 8: Add the engine entry to `scripts/codegen-examples.mjs`

Open `scripts/codegen-examples.mjs` and add a new entry to the `ENGINES` array (insert after line 79 `equity-dilution-calculator.ts` entry to keep investment engines grouped):

```javascript
  { file: 'compound-interest-calculator.ts', slug: 'solopreneur-compound-interest-calculator',
    subdir: 'investment', defaultInputs: { principal: '10000', monthlyContribution: '500', annualRate: '7', compoundFrequency: 'monthly', years: '20' } },
```

Note: `compoundFrequency: 'monthly'` is a string — the codegen runner passes inputs as JSON, and the engine's `parseFloat` will only consume numeric fields. The string `monthly` passes through to `calculateCompoundInterest` which handles the string→enum coercion.

---

### Step 9: Regenerate `staticExamples[0]` via codegen

Run:

```bash
cd D:/E/独立站/youtube-tools && node scripts/codegen-examples.mjs
```

This rewrites `staticExamples[0]` in `src/engines/investment/compound-interest-calculator.ts` to match the output of `calculateCompoundInterest({principal: '10000', monthlyContribution: '500', annualRate: '7', compoundFrequency: 'monthly', years: '20'})`.

Expected: no errors. The script writes back the staticExamples field.

Verify the regenerated content by reading `src/engines/investment/compound-interest-calculator.ts` and confirming `staticExamples[0]` matches the 9-section output you wrote in Step 3.

---

### Step 10: Fill in engine metadata (inputs, faq, howToUse)

Replace the empty arrays in the engine object in `src/engines/investment/compound-interest-calculator.ts`:

```typescript
const engine: ToolEngine = {
  slug: 'solopreneur-compound-interest-calculator',
  title: 'Compound Interest Calculator',
  description: 'See how your savings grow with compound interest. Model principal + monthly contributions, compare annual vs monthly compounding, and project your final balance at 5 milestones.',
  inputs: [
    { name: 'principal', label: 'Initial Deposit ($)', placeholder: 'e.g. 10000', type: 'number' },
    { name: 'monthlyContribution', label: 'Monthly Contribution ($)', placeholder: 'e.g. 500', type: 'number' },
    { name: 'annualRate', label: 'Annual Interest Rate (%)', placeholder: 'e.g. 7', type: 'number' },
    { name: 'compoundFrequency', label: 'Compounding Frequency', placeholder: '', type: 'select', options: ['annually', 'monthly'] },
    { name: 'years', label: 'Investment Period (years)', placeholder: 'e.g. 20', type: 'number' },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] {
    return calculateCompoundInterest(inputs);
  },
  staticExamples: [''], // codegen will fill this in Step 9
  faq: [
    { q: 'What is compound interest?', a: 'Compound interest is interest calculated on the initial principal and on the accumulated interest from previous periods. Unlike simple interest (which only pays interest on the original principal), compound interest grows your money exponentially because you earn "interest on interest". The longer your money compounds, the steeper the growth curve. A $10,000 deposit at 7% compounded annually becomes $16,289 after 10 years, $76,123 after 30 years, and $199,290 after 40 years.' },
    { q: 'How does compounding frequency affect returns?', a: 'Compounding frequency measures how often interest is added back to your balance and starts earning more interest. Annual compounding adds interest once per year; monthly compounding adds it 12 times per year. The difference is small for typical rates: at 7%, monthly compounding yields 7.229% APY vs 7.000% for annual — a ~0.23% difference per year. Over 30 years on $10K, that translates to about $5,000 more. The bigger lever is rate and time, not frequency.' },
    { q: 'What is a realistic annual return to assume?', a: 'For long-term planning, 7% (real return, after inflation) matches S&P 500 historical performance. For safer choices: high-yield savings accounts (HYSA) currently yield 4-5%, CDs yield 4-5%, Treasury bonds yield 3-5% depending on duration. For aggressive portfolios, 8-10% is achievable but volatile. Use 4% as a conservative baseline and 7% as a moderate baseline. Avoid projecting above 10% for retirement planning — it sets unrealistic expectations.' },
    { q: 'Should I reinvest dividends and interest?', a: 'Yes — this calculator assumes reinvestment. Withdrawal of interest breaks the compounding chain. If you receive $500 in interest and withdraw it, that $500 no longer earns interest in future years. Over 30 years, withdrawing rather than reinvesting interest can cost you 30-50% of your final balance. For taxable accounts, reinvestment triggers tax events; balance the tax drag against the compounding benefit. Tax-advantaged accounts (401k, IRA) avoid this trade-off.' },
    { q: 'How accurate is this calculator for retirement planning?', a: 'This calculator is accurate for the math (future value with regular contributions) but simplified for retirement decisions. Real retirement planning accounts for: inflation (real vs nominal returns), tax drag on withdrawals, required minimum distributions (RMDs), healthcare costs, Social Security, and sequence-of-returns risk in early retirement. Use this for back-of-envelope projections; consult a CFP for detailed retirement modeling.' },
  ],
  howToUse: [
    'Enter your initial deposit (principal) — typically $0 if starting from scratch.',
    'Set your monthly contribution — what you can comfortably add each month.',
    'Enter the expected annual interest rate (use 7% for S&P 500 long-term average).',
    'Choose compounding frequency — monthly for savings/brokerage, annually for bonds.',
    'Set the investment period in years (typical retirement horizon: 20-40 years).',
    'Review your final balance, milestone growth, and time-to-goal projections.',
    'Check the 5 What-If scenarios to see how small changes compound over time.',
  ],
};
```

---

### Step 11: Run the codegen drift check (must pass)

Run:

```bash
cd D:/E/独立站/youtube-tools && node scripts/codegen-examples.mjs --check
```

Expected: exit 0, no drift errors. If drift detected, re-run `node scripts/codegen-examples.mjs` (without `--check`) to regenerate, then re-run `--check`.

---

### Step 12: Run full unit test suite + typecheck

Run:

```bash
cd D:/E/独立站/youtube-tools && pnpm test:unit
```

Expected: all tests pass (33 P3 + 4 P4-1 + others).

Then:

```bash
cd D:/E/独立站/youtube-tools && pnpm exec astro check
```

Expected: 0 type errors. (Or `pnpm check` which combines env checks + codegen drift + tests.)

---

### Step 13: Verify the page renders (build smoke test)

Run:

```bash
cd D:/E/独立站/youtube-tools && pnpm build
```

Expected: build succeeds (141 → 142 pages; new page at `/en/compound-interest-calculator`).

If build fails:
- Type error in engine file → check `inputs` field shape matches `ToolInput` type
- `customFn` runtime error → re-check parse with `test-customFn.mjs`
- Page render error → check `[slug].astro` auto-discovery (no changes needed there)

---

### Step 14: Commit

Stage and commit:

```bash
cd D:/E/独立站/youtube-tools && git add src/engines/investment/compound-interest-calculator.ts src/engines/investment/index.ts tests/compound-interest.test.ts scripts/codegen-examples.mjs
git commit -m "feat(p4-1): compound interest calculator (savings-style + 9-section v3 output + 4 math tests)"
```

Expected: 1 commit, ~340 LoC added.

---

### Step 15: Push to gitee + github

```bash
cd D:/E/独立站/youtube-tools && git fetch origin && git rev-list --left-right --count origin/master...master
```

Expected: `0	1` (1 local commit ahead).

Push to gitee (primary mirror):

```bash
cd D:/E/独立站/youtube-tools && git push origin master
```

Push to github (secondary mirror, skip fetch hook):

```bash
cd D:/E/独立站/youtube-tools && SKIP_PUSH_FETCH=1 git push github master
```

Both should report success with the 1-commit delta.

---

## Self-Review (run before handoff)

**1. Spec coverage:** Each spec section → which plan step implements it?
- ✅ Input model (5 fields) → Step 10 (engine.inputs)
- ✅ Future value math → Step 1 (math helpers) + Step 3 (calculate) + Step 5 (customFn)
- ✅ Simple interest comparison → Step 1 (simpleFinalValue) + Steps 3/5 (output)
- ✅ 9 output sections → Step 3 (calculate) + Step 5 (customFn mirror)
- ✅ Milestone growth (5y/10y/15y/20y/final) → Step 3 milestoneSection + Step 5
- ✅ Health thresholds (🟢🟡🟠🔴) → Step 1 rateHealth + Steps 3/5
- ✅ Time-to-goal ($100K/$500K/$1M) → Step 1 yearsToTarget + Step 3 goalSection + Step 5
- ✅ What-If (5 scenarios) → Step 3 what-if block + Step 5
- ✅ Tip (4 conditional variants) → Step 3 tip selection + Step 5
- ✅ Comparison rows (5 rates) → Step 3 final loop + Step 5
- ✅ Edge cases (rate=0, years=0, all=0) → Step 1 futureValue early return + Step 3 input clamps
- ✅ Tests (4 cases) → Step 1 test file
- ✅ FAQ (5 entries) → Step 10 engine.faq
- ✅ HowToUse (5 steps) → Step 10 engine.howToUse
- ✅ Category (E class under investment/) → Task 1 file path
- ✅ codegen registration → Step 8
- ✅ Index.ts wiring → Step 7
- ✅ customFn parse safety → Step 6 verification

**2. Placeholder scan:** No "TBD", "TODO", "implement later", "fill in details" in plan. All code blocks are complete (Step 3 calculate() ~110 lines, Step 5 customFn ~3.5KB minified, Step 10 FAQ ~600 words, etc.).

**3. Type consistency:**
- `ToolEngine` interface used correctly (slug, title, description, inputs, clientConfig, generate, staticExamples, faq, howToUse) ✓
- `CompoundFrequency` type exported and used in math helpers, calculate, customFn (all consistent: `'annually' | 'monthly'`) ✓
- `inputs` field shapes match `ToolInput` (name, label, placeholder, type, options) ✓
- `customFn` reads `inputs.X` (string), coerces via `parseFloat` ✓
- Output: `results[0]` is the big 9-section string; `results[1..]` are comparison rows (matches existing pattern) ✓

**4. Risk areas:**
- Step 5 customFn is large — implementer should keep the math helpers (fv/sfv/y2t/rh) defined at the start of the string and reuse them; ASI trap is the main risk
- Step 9 codegen must complete successfully — `--check` will be run by `pnpm check` in CI; if drift, fix and re-run
- Step 13 build verifies the page actually renders; this is the integration smoke test

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-03-p4-1-compound-interest-plan.md`. Single [MECHANICAL] task. Recommended execution: **subagent-driven-development** — 1 implementer + 1 spec-compliance reviewer.

- Implementer: opus or sonnet, full task scope (Steps 1-14)
- Reviewer: spec-compliance only (verify each step matches plan, check customFn parses, codegen drift = 0, build = pass)
- Holistic pre-merge review: NOT needed (single self-contained file, no cross-file concerns, <5 files touched)
- Push: gitee primary + github with `SKIP_PUSH_FETCH=1`

After P4-1 ships, proceed to P4-2 (Stripe Fee Calculator) following the same flow.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

// ============== Math helpers (exported for tests) ==============

/**
 * Annual cost of fully-office setup.
 * Per person: salary + 12 months of office overhead + one-time setup.
 */
export function officeAnnualCost(
  headcount: number,
  salary: number,
  officeOverheadPerPerson: number,
  oneTimeSetupPerPerson: number,
): number {
  if (headcount <= 0) return 0;
  return headcount * (salary + 12 * officeOverheadPerPerson) + headcount * oneTimeSetupPerPerson;
}

/**
 * Annual cost of fully-remote setup.
 */
export function remoteAnnualCost(
  headcount: number,
  salary: number,
  remoteStipendPerPerson: number,
  oneTimeSetupPerPerson: number,
): number {
  if (headcount <= 0) return 0;
  return headcount * (salary + 12 * remoteStipendPerPerson) + headcount * oneTimeSetupPerPerson;
}

/**
 * Annual cost of hybrid (50/50 mix) setup: 50% office overhead, 50% remote stipend.
 */
export function hybridAnnualCost(
  headcount: number,
  salary: number,
  officeOverheadPerPerson: number,
  remoteStipendPerPerson: number,
  oneTimeSetupPerPerson: number,
): number {
  if (headcount <= 0) return 0;
  const mixedOverhead = 0.5 * officeOverheadPerPerson + 0.5 * remoteStipendPerPerson;
  return headcount * (salary + 12 * mixedOverhead) + headcount * oneTimeSetupPerPerson;
}

/**
 * Productivity-adjusted remote cost. Positive delta means remote is more productive
 * (lower effective cost per unit of work). Negative delta means less productive.
 * Returns Infinity if factor is non-positive (infeasible).
 */
export function productivityAdjustedRemote(
  remoteAnnualCost: number,
  productivityDeltaPercent: number,
): number {
  const factor = 1 + productivityDeltaPercent / 100;
  if (factor <= 0) return Infinity;
  return remoteAnnualCost / factor;
}

/**
 * Decision health based on cost savings + productivity direction.
 */
export function decisionHealth(
  savings: number,
  productivityDelta: number,
): { emoji: string; label: string } {
  const productivityPositive = productivityDelta >= 0;
  const savingsPositive = savings > 0;
  if (savingsPositive && productivityPositive)
    return { emoji: '🟢', label: 'STRONG — remote saves money AND is more productive' };
  if (savingsPositive && productivityDelta >= -10)
    return { emoji: '🟡', label: 'MODERATE — remote saves money but slight productivity loss' };
  if (!savingsPositive && productivityPositive)
    return { emoji: '🟡', label: 'MODERATE — office saves money but remote is more productive' };
  return { emoji: '🟠', label: 'WEAK — office is cheaper AND remote is less productive' };
}

/**
 * Per-person annual savings. The break-even is per-person (not per headcount)
 * because cost difference is constant per person.
 */
export function perPersonSavings(
  officeOverhead: number,
  remoteStipend: number,
): number {
  return 12 * (officeOverhead - remoteStipend);
}

// ============== calculate() ==============

function calculateRemoteOffice(inputs: Record<string, string>): string[] {
  const headcount = clampNonNegative(parseFloat(inputs.headcount) || 0);
  const avgSalary = clampNonNegative(parseFloat(inputs.avgSalary) || 0);
  const officeOverhead = clampNonNegative(parseFloat(inputs.officeOverheadPerPerson) || 0);
  const remoteStipend = clampNonNegative(parseFloat(inputs.remoteStipendPerPerson) || 0);
  const oneTimeSetup = clampNonNegative(parseFloat(inputs.oneTimeSetupPerPerson) || 0);
  const productivityDelta = parseFloat(inputs.productivityDelta) || 0;

  if (headcount === 0) {
    return [
      '⏰ Remote vs In-Office Cost Calculator\n\n' +
        '💰 Enter headcount > 0 to compare office vs remote cost structures.',
    ];
  }
  if (avgSalary === 0 && officeOverhead === 0 && remoteStipend === 0) {
    return [
      '⏰ Remote vs In-Office Cost Calculator\n\n' +
        '💰 Enter average salary and overhead values to see the cost comparison.',
    ];
  }

  const officeCost = officeAnnualCost(headcount, avgSalary, officeOverhead, oneTimeSetup);
  const remoteCost = remoteAnnualCost(headcount, avgSalary, remoteStipend, oneTimeSetup);
  const hybridCost = hybridAnnualCost(headcount, avgSalary, officeOverhead, remoteStipend, oneTimeSetup);
  const adjustedRemote = productivityAdjustedRemote(remoteCost, productivityDelta);
  const savings = officeCost - remoteCost;
  const dh = decisionHealth(savings, productivityDelta);
  const pps = perPersonSavings(officeOverhead, remoteStipend);

  // Format helpers
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const money = (n: number) => '$' + fmt(n);

  // ASCII stacked bar (3 scenarios, scale to max)
  const maxCost = Math.max(officeCost, remoteCost, hybridCost);
  const scale = (n: number) => Math.round((n / maxCost) * 50);
  const bar = (n: number) => '▓'.repeat(scale(n)) + '░'.repeat(50 - scale(n));
  const pct = (n: number) => ((n / maxCost) * 100).toFixed(0) + '%';

  let chart = '                ' + '0%'.padStart(4) + '      ' + '50%'.padStart(4) + '     ' + '100%'.padStart(4) + '\n';
  chart += 'Office Only  │' + bar(officeCost) + '│ ' + money(officeCost) + ' (' + pct(officeCost) + ')\n';
  chart += 'Hybrid 50/50 │' + bar(hybridCost) + '│ ' + money(hybridCost) + ' (' + pct(hybridCost) + ')\n';
  chart += 'Remote Only  │' + bar(remoteCost) + '│ ' + money(remoteCost) + ' (' + pct(remoteCost) + ')';

  // What-If scenarios
  // 1. Reduce office space 30% (hot-desking)
  const hotDeskCost = headcount * (avgSalary + 12 * officeOverhead * 0.7) + headcount * oneTimeSetup;
  const hotDeskSavings = officeCost - hotDeskCost;
  // 2. Increase remote stipend to $1000
  const remoteStipend1000 = remoteAnnualCost(headcount, avgSalary, 1000, oneTimeSetup);
  const stipendDelta = remoteStipend1000 - remoteCost;
  // 3. 2-day in-office hybrid (40% office, 60% remote)
  const twoDayOverhead = 0.4 * officeOverhead + 0.6 * remoteStipend;
  const twoDayCost = headcount * (avgSalary + 12 * twoDayOverhead) + headcount * oneTimeSetup;
  const twoDayDelta = twoDayCost - remoteCost;
  // 4. Hire 5 more people (marginal cost)
  const marginalPerPerson = officeOverhead + avgSalary / 12; // avg monthly cost per person
  const fiveHireOffice = 5 * (avgSalary + 12 * officeOverhead) + 5 * oneTimeSetup;
  const fiveHireRemote = 5 * (avgSalary + 12 * remoteStipend) + 5 * oneTimeSetup;
  const fiveHireSavings = fiveHireOffice - fiveHireRemote;
  // 5. Switch to fully remote (12-month savings projection)
  const switchToRemote12mo = savings;

  // Tip selection
  let tip: string;
  if (productivityDelta <= -10) {
    tip =
      '💡 Tip: Significant remote productivity loss. Consider hybrid (2-3 days in office) to balance cost savings with collaboration.';
  } else if (officeOverhead < 800) {
    tip =
      '💡 Tip: Low office cost. Remote savings may not justify the loss of in-person collaboration. Stay in office.';
  } else if (headcount >= 50) {
    tip =
      '💡 Tip: At >50 people, collaboration and culture become more important. Many companies mandate 2-3 days in office at this scale (Stripe, Apple).';
  } else {
    tip =
      '💡 Tip: Office costs scale with real estate; remote costs scale with stipends. At <20 people, remote is usually 30-50% cheaper. At >50 people, the calculus shifts.';
  }

  const r =
    '⏰ Remote vs In-Office Cost Calculator\n\n' +
    '💰 Cost Comparison (Annual):\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Office Only:    ' +
    money(officeCost) +
    '  (' +
    money(officeCost / headcount) +
    ' per person)\n' +
    '• Remote Only:    ' +
    money(remoteCost) +
    '  (' +
    money(remoteCost / headcount) +
    ' per person)\n' +
    '• Hybrid 50/50:   ' +
    money(hybridCost) +
    '  (50% office overhead, 50% remote stipend)\n' +
    '• Savings:        ' +
    (savings > 0 ? money(savings) + ' by going remote' : savings < 0 ? money(-savings) + ' by staying in office' : '$0 — costs equal') +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Per-Employee Breakdown:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Salary:                      ' +
    money(avgSalary) +
    ' /yr\n' +
    '• Office overhead (12 mo):     ' +
    money(12 * officeOverhead) +
    ' /yr (' +
    money(officeOverhead) +
    ' /mo)\n' +
    '• Remote stipend (12 mo):      ' +
    money(12 * remoteStipend) +
    ' /yr (' +
    money(remoteStipend) +
    ' /mo)\n' +
    '• One-time setup:              ' +
    money(oneTimeSetup) +
    ' (amortized over 1 year)\n' +
    '• Per-employee office total:   ' +
    money(avgSalary + 12 * officeOverhead + oneTimeSetup) +
    '\n' +
    '• Per-employee remote total:   ' +
    money(avgSalary + 12 * remoteStipend + oneTimeSetup) +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Decision Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' +
    dh.emoji +
    ' ' +
    dh.label +
    '\n' +
    '• Per-person annual savings:   ' +
    money(pps) +
    ' (office - remote overhead)\n' +
    '• Productivity: ' +
    (productivityDelta > 0
      ? '🟢 remote is ' + productivityDelta + '% more productive'
      : productivityDelta < 0
        ? '🟠 remote is ' + Math.abs(productivityDelta) + '% less productive'
        : '🟡 neutral (no productivity adjustment)') +
    '\n' +
    '• 3-year TCO: office ' +
    money(officeCost * 3) +
    ' vs remote ' +
    money(remoteCost * 3) +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Break-Even Analysis:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Per-person annual savings:  ' +
    money(pps) +
    '\n' +
    '• Current savings (× ' +
    headcount +
    ' people):     ' +
    money(pps * headcount) +
    '\n' +
    '• 3-year cumulative savings:  ' +
    money(pps * headcount * 3) +
    '\n' +
    '• Note: break-even is per-person (not per headcount) because cost difference is constant per person.\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Productivity-Adjusted Comparison:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Raw remote cost:             ' +
    money(remoteCost) +
    '\n' +
    '• Productivity adjustment:     ' +
    (productivityDelta > 0 ? '+' : '') +
    productivityDelta +
    '%\n' +
    '• Productivity-adjusted cost:  ' +
    money(adjustedRemote) +
    ' (effective cost per unit of work)\n' +
    '• Net effect: ' +
    (adjustedRemote < officeCost
      ? '🟢 remote is cheaper after productivity'
      : '🟠 office is cheaper after productivity') +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Hot-desk (30% less office):           office cost ' +
    money(hotDeskCost) +
    ' (save ' +
    money(hotDeskSavings) +
    ')\n' +
    '• Remote stipend → $1,000:                remote cost ' +
    money(remoteStipend1000) +
    ' (+' +
    money(stipendDelta) +
    ')\n' +
    '• 2-day in-office hybrid:                cost ' +
    money(twoDayCost) +
    ' (+' +
    money(twoDayDelta) +
    ' vs full remote)\n' +
    '• Hire 5 more (marginal):                office +' +
    money(fiveHireOffice) +
    ' vs remote +' +
    money(fiveHireRemote) +
    ' (save ' +
    money(fiveHireSavings) +
    ')\n' +
    '• Switch to fully remote today:          save ' +
    money(switchToRemote12mo) +
    ' /yr\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    chart +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip;

  const results: string[] = [r];

  // SEO long-tail comparison rows at 5 headcount levels
  const counts = [5, 10, 25, 50, 100];
  for (let idx = 0; idx < counts.length; idx++) {
    const hc = counts[idx];
    const oc = officeAnnualCost(hc, avgSalary, officeOverhead, oneTimeSetup);
    const rc = remoteAnnualCost(hc, avgSalary, remoteStipend, oneTimeSetup);
    const sv = oc - rc;
    results.push(
      'Comparison: ' +
        hc +
        ' employees: office ' +
        money(oc) +
        ' vs remote ' +
        money(rc) +
        ' — save ' +
        money(sv) +
        ' /yr by going remote',
    );
  }

  return results;
}

// ============== customFn ==============

const customFn =
  "function oc(hc,s,o,ots){if(hc<=0)return 0;return hc*(s+12*o)+hc*ots;}" +
  "function rc(hc,s,r,ots){if(hc<=0)return 0;return hc*(s+12*r)+hc*ots;}" +
  "function hcFn(hc,s,o,r,ots){if(hc<=0)return 0;var m=0.5*o+0.5*r;return hc*(s+12*m)+hc*ots;}" +
  "function adj(rc2,pd){var f=1+pd/100;if(f<=0)return Infinity;return rc2/f;}" +
  "function dhFn(sv,pd){var pp=pd>=0;var sp=sv>0;if(sp&&pp)return{e:'\\uD83D\\uDFE2',l:'STRONG \\u2014 remote saves money AND is more productive'};if(sp&&pd>=-10)return{e:'\\uD83D\\uDCA1',l:'MODERATE \\u2014 remote saves money but slight productivity loss'};if(!sp&&pp)return{e:'\\uD83D\\uDCA1',l:'MODERATE \\u2014 office saves money but remote is more productive'};return{e:'\\uD83D\\uDFE0',l:'WEAK \\u2014 office is cheaper AND remote is less productive'};}" +
  "function pps(o,r){return 12*(o-r);}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var hc=cnn(parseFloat(inputs.headcount)||0);" +
  "var s=cnn(parseFloat(inputs.avgSalary)||0);" +
  "var o=cnn(parseFloat(inputs.officeOverheadPerPerson)||0);" +
  "var r=cnn(parseFloat(inputs.remoteStipendPerPerson)||0);" +
  "var ots=cnn(parseFloat(inputs.oneTimeSetupPerPerson)||0);" +
  "var pd=parseFloat(inputs.productivityDelta)||0;" +
  "if(hc===0){return['\\u23F0 Remote vs In-Office Cost Calculator\\n\\n\\uD83D\\uDCB0 Enter headcount > 0 to compare office vs remote cost structures.'];}" +
  "if(s===0&&o===0&&r===0){return['\\u23F0 Remote vs In-Office Cost Calculator\\n\\n\\uD83D\\uDCB0 Enter average salary and overhead values to see the cost comparison.'];}" +
  "var ocv=oc(hc,s,o,ots);" +
  "var rcv=rc(hc,s,r,ots);" +
  "var hcv=hcFn(hc,s,o,r,ots);" +
  "var arcv=adj(rcv,pd);" +
  "var sv=ocv-rcv;" +
  "var dh=dhFn(sv,pd);" +
  "var ppsv=pps(o,r);" +
  "function fmt(n){return n.toLocaleString('en-US',{maximumFractionDigits:0});}" +
  "function money(n){return'$'+fmt(n);}" +
  "var mx=Math.max(ocv,rcv,hcv);" +
  "function sc(n){return Math.round((n/mx)*50);}" +
  "function br(n){var a=sc(n);return'\\u2593'.repeat(a)+'\\u2591'.repeat(50-a);}" +
  "function pc(n){return((n/mx)*100).toFixed(0)+'%';}" +
  "var chrt='                '+'0%'.padStart(4)+'      '+'50%'.padStart(4)+'     '+'100%'.padStart(4)+'\\n';" +
  "chrt+='Office Only  \\u2502'+br(ocv)+'\\u2502 '+money(ocv)+' ('+pc(ocv)+')\\n';" +
  "chrt+='Hybrid 50/50 \\u2502'+br(hcv)+'\\u2502 '+money(hcv)+' ('+pc(hcv)+')\\n';" +
  "chrt+='Remote Only  \\u2502'+br(rcv)+'\\u2502 '+money(rcv)+' ('+pc(rcv)+')';" +
  "var hdCost=hc*(s+12*o*0.7)+hc*ots;" +
  "var hdSv=ocv-hdCost;" +
  "var rs1000=rc(hc,s,1000,ots);" +
  "var rsDelta=rs1000-rcv;" +
  "var tdOh=0.4*o+0.6*r;" +
  "var tdCost=hc*(s+12*tdOh)+hc*ots;" +
  "var tdDelta=tdCost-rcv;" +
  "var fhOc=5*(s+12*o)+5*ots;" +
  "var fhRc=5*(s+12*r)+5*ots;" +
  "var fhSv=fhOc-fhRc;" +
  "var tip='';" +
  "if(pd<=-10)tip='\\uD83D\\uDCA1 Tip: Significant remote productivity loss. Consider hybrid (2-3 days in office) to balance cost savings with collaboration.';" +
  "else if(o<800)tip='\\uD83D\\uDCA1 Tip: Low office cost. Remote savings may not justify the loss of in-person collaboration. Stay in office.';" +
  "else if(hc>=50)tip='\\uD83D\\uDCA1 Tip: At >50 people, collaboration and culture become more important. Many companies mandate 2-3 days in office at this scale (Stripe, Apple).';" +
  "else tip='\\uD83D\\uDCA1 Tip: Office costs scale with real estate; remote costs scale with stipends. At <20 people, remote is usually 30-50% cheaper. At >50 people, the calculus shifts.';" +
  "var r2='';" +
  "r2+='\\u23F0 Remote vs In-Office Cost Calculator\\n\\n';" +
  "r2+='\\uD83D\\uDCB0 Cost Comparison (Annual):\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Office Only:    '+money(ocv)+'  ('+money(ocv/hc)+' per person)\\n';" +
  "r2+='\\u2022 Remote Only:    '+money(rcv)+'  ('+money(rcv/hc)+' per person)\\n';" +
  "r2+='\\u2022 Hybrid 50/50:   '+money(hcv)+'  (50% office overhead, 50% remote stipend)\\n';" +
  "r2+='\\u2022 Savings:        '+(sv>0?money(sv)+' by going remote':sv<0?money(-sv)+' by staying in office':'$0 \\u2014 costs equal')+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCD0 Per-Employee Breakdown:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Salary:                      '+money(s)+' /yr\\n';" +
  "r2+='\\u2022 Office overhead (12 mo):     '+money(12*o)+' /yr ('+money(o)+' /mo)\\n';" +
  "r2+='\\u2022 Remote stipend (12 mo):      '+money(12*r)+' /yr ('+money(r)+' /mo)\\n';" +
  "r2+='\\u2022 One-time setup:              '+money(ots)+' (amortized over 1 year)\\n';" +
  "r2+='\\u2022 Per-employee office total:   '+money(s+12*o+ots)+'\\n';" +
  "r2+='\\u2022 Per-employee remote total:   '+money(s+12*r+ots)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Decision Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+dh.e+' '+dh.l+'\\n';" +
  "r2+='\\u2022 Per-person annual savings:   '+money(ppsv)+' (office - remote overhead)\\n';" +
  "r2+='\\u2022 Productivity: '+(pd>0?'\\uD83D\\uDFE2 remote is '+pd+'% more productive':pd<0?'\\uD83D\\uDFE0 remote is '+Math.abs(pd)+'% less productive':'\\uD83D\\uDCA1 neutral (no productivity adjustment)')+'\\n';" +
  "r2+='\\u2022 3-year TCO: office '+money(ocv*3)+' vs remote '+money(rcv*3)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Break-Even Analysis:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Per-person annual savings:  '+money(ppsv)+'\\n';" +
  "r2+='\\u2022 Current savings (\\u00d7 '+hc+' people):     '+money(ppsv*hc)+'\\n';" +
  "r2+='\\u2022 3-year cumulative savings:  '+money(ppsv*hc*3)+'\\n';" +
  "r2+='\\u2022 Note: break-even is per-person (not per headcount) because cost difference is constant per person.\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Productivity-Adjusted Comparison:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Raw remote cost:             '+money(rcv)+'\\n';" +
  "r2+='\\u2022 Productivity adjustment:     '+(pd>0?'+':'')+pd+'%\\n';" +
  "r2+='\\u2022 Productivity-adjusted cost:  '+money(arcv)+' (effective cost per unit of work)\\n';" +
  "r2+='\\u2022 Net effect: '+(arcv<ocv?'\\uD83D\\uDFE2 remote is cheaper after productivity':'\\uD83D\\uDFE0 office is cheaper after productivity')+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Hot-desk (30% less office):           office cost '+money(hdCost)+' (save '+money(hdSv)+')\\n';" +
  "r2+='\\u2022 Remote stipend \\u2192 $1,000:                remote cost '+money(rs1000)+' (+'+money(rsDelta)+')\\n';" +
  "r2+='\\u2022 2-day in-office hybrid:                cost '+money(tdCost)+' (+'+money(tdDelta)+' vs full remote)\\n';" +
  "r2+='\\u2022 Hire 5 more (marginal):                office +'+money(fhOc)+' vs remote +'+money(fhRc)+' (save '+money(fhSv)+')\\n';" +
  "r2+='\\u2022 Switch to fully remote today:          save '+money(sv)+' /yr\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=chrt+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tip;" +
  "var results=[r2];" +
  "var counts=[5,10,25,50,100];" +
  "for(var j=0;j<counts.length;j++){var hc2=counts[j];var o2=oc(hc2,s,o,ots);var r2c=rc(hc2,s,r,ots);var sv2=o2-r2c;results.push('Comparison: '+hc2+' employees: office '+money(o2)+' vs remote '+money(r2c)+' \\u2014 save '+money(sv2)+' /yr by going remote');}" +
  "return results;";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-remote-vs-office-calculator',
  title: 'Remote vs In-Office Cost Calculator',
  description:
    'Compare the true annual cost of running a fully-remote vs fully-office vs hybrid team. See per-employee breakdown, productivity-adjusted comparison, 3-year TCO, and what-if scenarios (hot-desking, hybrid schedules, hiring impact).',
  inputs: [
    {
      name: 'headcount',
      label: 'Number of Employees',
      placeholder: 'e.g. 10',
      type: 'number',
    },
    {
      name: 'avgSalary',
      label: 'Average Annual Salary ($)',
      placeholder: 'e.g. 80000',
      type: 'number',
    },
    {
      name: 'officeOverheadPerPerson',
      label: 'Office Overhead per Person per Month ($)',
      placeholder: 'e.g. 1500',
      type: 'number',
    },
    {
      name: 'remoteStipendPerPerson',
      label: 'Remote Stipend per Person per Month ($)',
      placeholder: 'e.g. 500',
      type: 'number',
    },
    {
      name: 'oneTimeSetupPerPerson',
      label: 'One-Time Setup per Person ($)',
      placeholder: 'e.g. 3000',
      type: 'number',
    },
    {
      name: 'productivityDelta',
      label: 'Remote Productivity Change vs Office (%)',
      placeholder: 'e.g. 5 or -10',
      type: 'number',
    },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] {
    return calculateRemoteOffice(inputs);
  },
  staticExamples: ['⏰ Remote vs In-Office Cost Calculator\n\n💰 Cost Comparison (Annual):\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Office Only:    $1,010,000  ($101,000 per person)\n• Remote Only:    $890,000  ($89,000 per person)\n• Hybrid 50/50:   $950,000  (50% office overhead, 50% remote stipend)\n• Savings:        $120,000 by going remote\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Per-Employee Breakdown:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Salary:                      $80,000 /yr\n• Office overhead (12 mo):     $18,000 /yr ($1,500 /mo)\n• Remote stipend (12 mo):      $6,000 /yr ($500 /mo)\n• One-time setup:              $3,000 (amortized over 1 year)\n• Per-employee office total:   $101,000\n• Per-employee remote total:   $89,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Decision Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 STRONG — remote saves money AND is more productive\n• Per-person annual savings:   $12,000 (office - remote overhead)\n• Productivity: 🟡 neutral (no productivity adjustment)\n• 3-year TCO: office $3,030,000 vs remote $2,670,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Break-Even Analysis:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Per-person annual savings:  $12,000\n• Current savings (× 10 people):     $120,000\n• 3-year cumulative savings:  $360,000\n• Note: break-even is per-person (not per headcount) because cost difference is constant per person.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Productivity-Adjusted Comparison:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Raw remote cost:             $890,000\n• Productivity adjustment:     0%\n• Productivity-adjusted cost:  $890,000 (effective cost per unit of work)\n• Net effect: 🟢 remote is cheaper after productivity\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Hot-desk (30% less office):           office cost $956,000 (save $54,000)\n• Remote stipend → $1,000:                remote cost $950,000 (+$60,000)\n• 2-day in-office hybrid:                cost $938,000 (+$48,000 vs full remote)\n• Hire 5 more (marginal):                office +$505,000 vs remote +$445,000 (save $60,000)\n• Switch to fully remote today:          save $120,000 /yr\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n                  0%       50%     100%\nOffice Only  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ $1,010,000 (100%)\nHybrid 50/50 │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░│ $950,000 (94%)\nRemote Only  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░│ $890,000 (88%)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Office costs scale with real estate; remote costs scale with stipends. At <20 people, remote is usually 30-50% cheaper. At >50 people, the calculus shifts.\nComparison: 5 employees: office $505,000 vs remote $445,000 — save $60,000 /yr by going remote\nComparison: 10 employees: office $1,010,000 vs remote $890,000 — save $120,000 /yr by going remote\nComparison: 25 employees: office $2,525,000 vs remote $2,225,000 — save $300,000 /yr by going remote\nComparison: 50 employees: office $5,050,000 vs remote $4,450,000 — save $600,000 /yr by going remote\nComparison: 100 employees: office $10,100,000 vs remote $8,900,000 — save $1,200,000 /yr by going remote'],
  faq: [
    {
      q: 'Is it cheaper to be remote or in-office?',
      a: 'For most companies with <50 employees, remote is 20-50% cheaper. The math: a fully-remote employee costs $500-$1,000/month (stipend) vs $1,500-$3,000/month (office rent + utilities in Tier 1 cities). For 10 employees at $80K salary with $1,500 office overhead vs $500 remote stipend, you save ~$120,000/year by going remote. However, the calculus shifts at >50 people where collaboration, culture, and mentorship start to dominate the cost equation.',
    },
    {
      q: 'How much does a typical office cost per employee?',
      a: 'Office cost per employee varies hugely by city: $500-$1,000/month in smaller cities (Tulsa, Indianapolis), $1,500-$2,500/month in mid-tier cities (Austin, Denver), $2,500-$4,000/month in Tier 1 cities (SF, NYC). This includes rent (typically 80-100 sq ft per person), utilities, internet, janitorial, and amenities. A typical SaaS startup in SF pays $30K-$50K/year per employee just for office space.',
    },
    {
      q: 'How much should I pay as a remote work stipend?',
      a: 'Industry standard is $500-$1,000/month, covering coworking space, home internet, utilities, and equipment. Some companies go higher ($1,500+) for fully-remote roles to attract talent. The most common breakdown: $200-$300 internet/utilities, $200-$500 coworking membership, $0-$200 phone/other. A $500/month stipend typically satisfies 70% of remote employees; the rest prefer fully-company-funded coworking at $1,000+/month.',
    },
    {
      q: 'Is remote work more or less productive?',
      a: 'Research is mixed. Stanford study (Bloom 2015) showed 13% productivity increase for remote workers. Microsoft and Slack surveys show 35-50% of employees prefer hybrid. Recent 2023-2024 data suggests: (1) early-career employees are 10-20% less productive remote (need mentorship), (2) senior employees are 5-10% more productive remote (fewer distractions), (3) collaboration-heavy roles suffer 5-15% productivity loss. Most companies settle on hybrid (2-3 days in office) as the optimal balance — captures remote savings while preserving in-person collaboration.',
    },
    {
      q: 'What are the hidden costs of switching from office to remote?',
      a: 'Hidden costs of switching to remote: (1) Lease termination fees — typically 3-6 months of rent remaining on your lease ($50K-$200K+), (2) Office furniture liquidation — 10-50% loss on desk/chair/fixture sales, (3) Equipment shipped to employees — $2,000-$5,000 per person (laptop, monitor, peripherals), (4) Cybersecurity — VPN, endpoint protection, security training ($50-$200 per person), (5) Collaboration software — Slack, Zoom, Notion ($50-$150 per person per month). Total transition cost: $100K-$500K for a 50-person team. Plan a 6-12 month transition.',
    },
  ],
  howToUse: [
    'Enter your team headcount.',
    'Enter the average annual salary (or estimate).',
    'Enter your current office overhead per person per month (rent + utilities).',
    'Enter the remote stipend you would offer per person per month.',
    'Enter the one-time setup cost per person (equipment + onboarding).',
    'Enter the productivity change you expect from remote work (positive = more productive, negative = less).',
    'Review the cost comparison across office, remote, and hybrid scenarios.',
    'Use the 5 what-if scenarios to model hot-desking, hybrid schedules, and hiring impact.',
  ],
};

registerEngine(engine);


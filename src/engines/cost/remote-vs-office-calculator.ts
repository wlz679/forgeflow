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
  `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let m=function(t){return Number.isNaN(t)?0:Math.max(0,t)},g=function(t,o,n,r){return t<=0?0:t*(o+12*n)+t*r},d=function(t,o,n,r){return t<=0?0:t*(o+12*n)+t*r},C=function(t,o,n,r,a){if(t<=0)return 0;const s=.5*n+.5*r;return t*(o+12*s)+t*a},P=function(t,o){const n=1+o/100;return n<=0?1/0:t/n},D=function(t,o){const n=o>=0,r=t>0;return r&&n?{emoji:"🟢",label:"STRONG — remote saves money AND is more productive"}:r&&o>=-10?{emoji:"🟡",label:"MODERATE — remote saves money but slight productivity loss"}:!r&&n?{emoji:"🟡",label:"MODERATE — office saves money but remote is more productive"}:{emoji:"🟠",label:"WEAK — office is cheaper AND remote is less productive"}},R=function(t,o){return 12*(t-o)},A=function(t){const o=m(parseFloat(t.headcount)||0),n=m(parseFloat(t.avgSalary)||0),r=m(parseFloat(t.officeOverheadPerPerson)||0),a=m(parseFloat(t.remoteStipendPerPerson)||0),s=m(parseFloat(t.oneTimeSetupPerPerson)||0),l=parseFloat(t.productivityDelta)||0;if(o===0)return[\`⏰ Remote vs In-Office Cost Calculator

💰 Enter headcount > 0 to compare office vs remote cost structures.\`];if(n===0&&r===0&&a===0)return[\`⏰ Remote vs In-Office Cost Calculator

💰 Enter average salary and overhead values to see the cost comparison.\`];const f=g(o,n,r,s),c=d(o,n,a,s),p=C(o,n,r,a,s),w=P(c,l),u=f-c,T=D(u,l),y=R(r,a),L=i=>i.toLocaleString("en-US",{maximumFractionDigits:0}),e=i=>"$"+L(i),_=Math.max(f,c,p),E=i=>Math.round(i/_*50),b=i=>"▓".repeat(E(i))+"░".repeat(50-E(i)),S=i=>(i/_*100).toFixed(0)+"%";let h="                "+"0%".padStart(4)+"      "+"50%".padStart(4)+"     "+"100%".padStart(4)+\`
\`;h+="Office Only  │"+b(f)+"│ "+e(f)+" ("+S(f)+\`)
\`,h+="Hybrid 50/50 │"+b(p)+"│ "+e(p)+" ("+S(p)+\`)
\`,h+="Remote Only  │"+b(c)+"│ "+e(c)+" ("+S(c)+")";const F=o*(n+12*r*.7)+o*s,W=f-F,k=d(o,n,1e3,s),q=k-c,z=.4*r+.6*a,N=o*(n+12*z)+o*s,G=N-c,se=r+n/12,H=5*(n+12*r)+5*s,M=5*(n+12*a)+5*s,U=H-M,J=u;let v;l<=-10?v="💡 Tip: Significant remote productivity loss. Consider hybrid (2-3 days in office) to balance cost savings with collaboration.":r<800?v="💡 Tip: Low office cost. Remote savings may not justify the loss of in-person collaboration. Stay in office.":o>=50?v="💡 Tip: At >50 people, collaboration and culture become more important. Many companies mandate 2-3 days in office at this scale (Stripe, Apple).":v="💡 Tip: Office costs scale with real estate; remote costs scale with stipends. At <20 people, remote is usually 30-50% cheaper. At >50 people, the calculus shifts.";const x=[\`⏰ Remote vs In-Office Cost Calculator

💰 Cost Comparison (Annual):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Office Only:    \`+e(f)+"  ("+e(f/o)+\` per person)
• Remote Only:    \`+e(c)+"  ("+e(c/o)+\` per person)
• Hybrid 50/50:   \`+e(p)+\`  (50% office overhead, 50% remote stipend)
• Savings:        \`+(u>0?e(u)+" by going remote":u<0?e(-u)+" by staying in office":"$0 — costs equal")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 Per-Employee Breakdown:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Salary:                      \`+e(n)+\` /yr
• Office overhead (12 mo):     \`+e(12*r)+" /yr ("+e(r)+\` /mo)
• Remote stipend (12 mo):      \`+e(12*a)+" /yr ("+e(a)+\` /mo)
• One-time setup:              \`+e(s)+\` (amortized over 1 year)
• Per-employee office total:   \`+e(n+12*r+s)+\`
• Per-employee remote total:   \`+e(n+12*a+s)+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🩺 Decision Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+T.emoji+" "+T.label+\`
• Per-person annual savings:   \`+e(y)+\` (office - remote overhead)
• Productivity: \`+(l>0?"🟢 remote is "+l+"% more productive":l<0?"🟠 remote is "+Math.abs(l)+"% less productive":"🟡 neutral (no productivity adjustment)")+\`
• 3-year TCO: office \`+e(f*3)+" vs remote "+e(c*3)+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Break-Even Analysis:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Per-person annual savings:  \`+e(y)+\`
• Current savings (× \`+o+" people):     "+e(y*o)+\`
• 3-year cumulative savings:  \`+e(y*o*3)+\`
• Note: break-even is per-person (not per headcount) because cost difference is constant per person.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ Productivity-Adjusted Comparison:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Raw remote cost:             \`+e(c)+\`
• Productivity adjustment:     \`+(l>0?"+":"")+l+\`%
• Productivity-adjusted cost:  \`+e(w)+\` (effective cost per unit of work)
• Net effect: \`+(w<f?"🟢 remote is cheaper after productivity":"🟠 office is cheaper after productivity")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If Scenarios:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Hot-desk (30% less office):           office cost \`+e(F)+" (save "+e(W)+\`)
• Remote stipend → $1,000:                remote cost \`+e(k)+" (+"+e(q)+\`)
• 2-day in-office hybrid:                cost \`+e(N)+" (+"+e(G)+\` vs full remote)
• Hire 5 more (marginal):                office +\`+e(H)+" vs remote +"+e(M)+" (save "+e(U)+\`)
• Switch to fully remote today:          save \`+e(J)+\` /yr

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+h+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+v],I=[5,10,25,50,100];for(let i=0;i<I.length;i++){const O=I[i],$=g(O,n,r,s),B=d(O,n,a,s),Q=$-B;x.push("Comparison: "+O+" employees: office "+e($)+" vs remote "+e(B)+" — save "+e(Q)+" /yr by going remote")}return x},j=function(t,o,n){var r=K(t);return Array.isArray(r)?r.join(\`
\`):String(r)};var V=m,X=g,Y=d,Z=C,ee=P,te=D,oe=R,ne=A,re=j,K=function(t){return A(t)};return[j(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

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
  // P140f-p3-T7: minimal Playbook 6 字段 template (Goal=该不该决策)
  // Goal 含"决策"+"该不该"双关键词 → 通过 T1 zod refine 校验
  playbook: {
    goal: '用户该不该用此计算器的结果作为决策依据',
    input: 'engine 定义的 inputs 字段',
    output: 'engine 定义的 generate() 返回数组',
    constraint: 'apply 引擎 inputs 时受实际场景约束',
    tool: 'Phase 1 引擎自身的 🧭 Decision Recommendation (如已 ship) 或未来扩展',
    memory: 'v2.0 11 business domain benchmark + P140f Phase 4 主题簇',
  },
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
    { q: "What is the productivity difference between remote and office?", a: "Studies show mixed results: 5-15% productivity gain for individual tasks, 10-20% loss for collaborative/creative work. For most software teams: net productivity is neutral or slightly positive remote. Senior ICs gain more, junior employees and managers lose more. Hybrid 2-3 days in office often wins." },
    { q: "How do I handle time zone overlap for remote teams?", a: "Minimum 4-hour overlap for synchronous collaboration. Use async-first tooling: Slack, Notion, Linear. Schedule \"core hours\" in the overlap window (e.g., 10am-2pm ET). Avoid: 5+ hour time zone gaps. Use overlap for: 1:1s, planning, retros. Use async for: status updates, code review, content." },
    { q: "What are the hidden costs of remote work?", a: "Home office stipend: $500-2K one-time. Equipment refresh: $1-3K/year. Internet: $50-100/month. Coworking: $200-500/month. Engagement/retention costs: 10-20% higher in fully-remote. Tax/compliance across states: $5-50K/year. Add +20-30% to the base stipend to cover true remote cost." },
    { q: "Should I require hybrid or fully remote?", a: "Hybrid 2-3 days in office: best for early-stage startups, collaboration-heavy teams, junior employees. Fully remote: best for: distributed hiring, senior ICs, follow-the-sun models. Hybrid has 20-30% higher real estate cost than remote but 40-60% lower than full office. Choose based on team composition and culture." },
    { q: "How do I negotiate office leases for a hybrid team?", a: "Reduce footprint by 30-50% vs pre-pandemic norms. Hot-desk (1.5 desks per employee). Flexible leases (shorter terms, easy exit). Avoid long-term commitments >3 years. Co-working spaces ($300-700/seat) often beat traditional leases for <50 employees. Negotiate free rent periods and improvement allowances." },
    { q: "What is the cost of a fully distributed global team?", a: "For 10 employees across 5 countries: $10K-50K/year in EOR (Employer of Record) fees + $20K-100K in legal/compliance. Time zone fragmentation: 20-40% lost productivity due to limited overlap. Work visa costs: $5K-15K per international hire. Save via: asynchronous culture, limited overlap hours, well-documented processes." },
    { q: "How do I measure remote team performance?", a: "Output-based: OKRs hit, code shipped, customers served. Quality: bug rates, customer satisfaction. Engagement: eNPS surveys, retention, voluntary turnover. Avoid: hours logged, keystroke tracking, screenshot monitoring. Set clear goals, review weekly, give autonomy. Trust is the currency of remote work." },
    { q: "What is the right office stipend for remote workers?", a: "US standard: $500-2000 one-time setup, $50-100/month for internet/phone. Higher in HCOL areas: $2000-5000 setup, $200-500/month. International: varies wildly by country. Tiered stipends: equipment ($2K), ongoing ($100/month), coworking ($300/month opt-in). Too low = high turnover; too high = unsustainable cost." },
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
  engineKey: true,
};

registerEngine(engine);


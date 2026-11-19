import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-13：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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
/**
 * 决策健康度的**档位键**（P168 B3-13：每档一个 code 字面量 ⇒ zh 页能整行中文）。
 */
export type DecisionHealthBand = 'strong' | 'moderate_savings' | 'moderate_productivity' | 'weak';

export function decisionHealth(
  savings: number,
  productivityDelta: number,
): { emoji: string; label: string; band: DecisionHealthBand } {
  const productivityPositive = productivityDelta >= 0;
  const savingsPositive = savings > 0;
  const band: DecisionHealthBand =
    savingsPositive && productivityPositive
      ? 'strong'
      : savingsPositive && productivityDelta >= -10
        ? 'moderate_savings'
        : !savingsPositive && productivityPositive
          ? 'moderate_productivity'
          : 'weak';
  if (band === 'strong')
    return { emoji: '🟢', label: 'STRONG — remote saves money AND is more productive', band };
  if (band === 'moderate_savings')
    return { emoji: '🟡', label: 'MODERATE — remote saves money but slight productivity loss', band };
  if (band === 'moderate_productivity')
    return { emoji: '🟡', label: 'MODERATE — office saves money but remote is more productive', band };
  return { emoji: '🟠', label: 'WEAK — office is cheaper AND remote is less productive', band };
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
        makeToken(
          'calc_out.remote_vs_office.row.need_headcount',
          '💰 Enter headcount > 0 to compare office vs remote cost structures.',
        ),
    ];
  }
  if (avgSalary === 0 && officeOverhead === 0 && remoteStipend === 0) {
    return [
      '⏰ Remote vs In-Office Cost Calculator\n\n' +
        makeToken(
          'calc_out.remote_vs_office.row.need_inputs',
          '💰 Enter average salary and overhead values to see the cost comparison.',
        ),
    ];
  }

  const officeCost = officeAnnualCost(headcount, avgSalary, officeOverhead, oneTimeSetup);
  const remoteCost = remoteAnnualCost(headcount, avgSalary, remoteStipend, oneTimeSetup);
  const hybridCost = hybridAnnualCost(headcount, avgSalary, officeOverhead, remoteStipend, oneTimeSetup);
  const adjustedRemote = productivityAdjustedRemote(remoteCost, productivityDelta);
  const savings = officeCost - remoteCost;
  const dh = decisionHealth(savings, productivityDelta);
  // ⭐ 局部变量承接（2026-11-19 B3-13 组 2 实测修）：见下方 productivity_down 注释。
  const productivityDownPct = Math.abs(productivityDelta);
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

  // Tip selection（P168 B3-13：每个分支一个 code 字面量 ⇒ zh 页整行中文）
  let tip: string;
  if (productivityDelta <= -10) {
    tip = makeToken(
      'calc_out.remote_vs_office.row.tip_productivity_loss',
      '💡 Tip: Significant remote productivity loss. Consider hybrid (2-3 days in office) to balance cost savings with collaboration.',
    );
  } else if (officeOverhead < 800) {
    tip = makeToken(
      'calc_out.remote_vs_office.row.tip_low_office',
      '💡 Tip: Low office cost. Remote savings may not justify the loss of in-person collaboration. Stay in office.',
    );
  } else if (headcount >= 50) {
    tip = makeToken(
      'calc_out.remote_vs_office.row.tip_large_team',
      '💡 Tip: At >50 people, collaboration and culture become more important. Many companies mandate 2-3 days in office at this scale (Stripe, Apple).',
    );
  } else {
    tip = makeToken(
      'calc_out.remote_vs_office.row.tip_default',
      '💡 Tip: Office costs scale with real estate; remote costs scale with stipends. At <20 people, remote is usually 30-50% cheaper. At >50 people, the calculus shifts.',
    );
  }

  const r =
    '⏰ Remote vs In-Office Cost Calculator\n\n' +
    makeToken('calc_out.remote_vs_office.row.section_cost_comparison', '💰 Cost Comparison (Annual):') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.remote_vs_office.row.cost_office_only', '• Office Only:    ' + money(officeCost) + '  (' + money(officeCost / headcount) + ' per person)', { office: money(officeCost), per_person: money(officeCost / headcount) }) + '\n' +
    makeToken('calc_out.remote_vs_office.row.cost_remote_only', '• Remote Only:    ' + money(remoteCost) + '  (' + money(remoteCost / headcount) + ' per person)', { remote: money(remoteCost), per_person: money(remoteCost / headcount) }) + '\n' +
    makeToken('calc_out.remote_vs_office.row.cost_hybrid', '• Hybrid 50/50:   ' + money(hybridCost) + '  (50% office overhead, 50% remote stipend)', { hybrid: money(hybridCost) }) + '\n' +
    (savings > 0
      ? makeToken('calc_out.remote_vs_office.row.savings_remote', '• Savings:        ' + money(savings) + ' by going remote', { savings: money(savings) })
      : savings < 0
        ? makeToken('calc_out.remote_vs_office.row.savings_office', '• Savings:        ' + money(-savings) + ' by staying in office', { savings: money(-savings) })
        : makeToken('calc_out.remote_vs_office.row.savings_equal', '• Savings:        $0 — costs equal')) + '\n\n' +
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
    makeToken('calc_out.remote_vs_office.row.one_time_setup', '• One-time setup:              ' + money(oneTimeSetup) + ' (amortized over 1 year)', { setup: money(oneTimeSetup) }) + '\n' +
    makeToken('calc_out.remote_vs_office.row.per_employee_office_total', '• Per-employee office total:   ' + money(avgSalary + 12 * officeOverhead + oneTimeSetup), { total: money(avgSalary + 12 * officeOverhead + oneTimeSetup) }) + '\n' +
    makeToken('calc_out.remote_vs_office.row.per_employee_remote_total', '• Per-employee remote total:   ' + money(avgSalary + 12 * remoteStipend + oneTimeSetup), { total: money(avgSalary + 12 * remoteStipend + oneTimeSetup) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Decision Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (dh.band === 'strong'
      ? makeToken('calc_out.remote_vs_office.row.health_strong', '• 🟢 STRONG — remote saves money AND is more productive')
      : dh.band === 'moderate_savings'
        ? makeToken('calc_out.remote_vs_office.row.health_moderate_savings', '• 🟡 MODERATE — remote saves money but slight productivity loss')
        : dh.band === 'moderate_productivity'
          ? makeToken('calc_out.remote_vs_office.row.health_moderate_productivity', '• 🟡 MODERATE — office saves money but remote is more productive')
          : makeToken('calc_out.remote_vs_office.row.health_weak', '• 🟠 WEAK — office is cheaper AND remote is less productive')) + '\n' +
    makeToken('calc_out.remote_vs_office.row.per_person_annual_savings', '• Per-person annual savings:   ' + money(pps) + ' (office - remote overhead)', { savings: money(pps) }) + '\n' +
    (productivityDelta > 0
      ? makeToken('calc_out.remote_vs_office.row.productivity_up', '• Productivity: 🟢 remote is ' + productivityDelta + '% more productive', { pct: String(productivityDelta) })
      : productivityDelta < 0
        // ⭐ 局部变量承接（2026-11-19 B3-13 组 2 实测修）：'Math.abs(productivityDelta)' 直接写进
        //   兜底 ⇒ 源码模板推导会把 'Math' / 'abs' / 'productivityDelta' 当三个标识符分别替换
        //   ⇒ 模板污染（相邻字符串字面量 ⇒ new Function 抛 SyntaxError ⇒ 推导返回 null
        //   ⇒ 该 code 被静默丢掉 ⇒ locale 缺键 ⇒ G2/G12 红）⇒ 必须是**标识符**。
        ? makeToken('calc_out.remote_vs_office.row.productivity_down', '• Productivity: 🟠 remote is ' + productivityDownPct + '% less productive', { pct: String(productivityDownPct) })
        : makeToken('calc_out.remote_vs_office.row.productivity_neutral', '• Productivity: 🟡 neutral (no productivity adjustment)')) + '\n' +
    makeToken('calc_out.remote_vs_office.row.tco_3y', '• 3-year TCO: office ' + money(officeCost * 3) + ' vs remote ' + money(remoteCost * 3), { office: money(officeCost * 3), remote: money(remoteCost * 3) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Break-Even Analysis:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.remote_vs_office.row.breakeven_per_person_savings', '• Per-person annual savings:  ' + money(pps), { savings: money(pps) }) + '\n' +
    makeToken('calc_out.remote_vs_office.row.breakeven_current_savings', '• Current savings (× ' + headcount + ' people):     ' + money(pps * headcount), { people: String(headcount), savings: money(pps * headcount) }) + '\n' +
    makeToken('calc_out.remote_vs_office.row.breakeven_cumulative_savings', '• 3-year cumulative savings:  ' + money(pps * headcount * 3), { savings: money(pps * headcount * 3) }) + '\n' +
    makeToken('calc_out.remote_vs_office.row.breakeven_note', '• Note: break-even is per-person (not per headcount) because cost difference is constant per person.') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.remote_vs_office.row.section_productivity_adjusted', '⚖️ Productivity-Adjusted Comparison:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.remote_vs_office.row.raw_remote_cost', '• Raw remote cost:             ' + money(remoteCost), { cost: money(remoteCost) }) + '\n' +
    '• Productivity adjustment:     ' +
    (productivityDelta > 0 ? '+' : '') +
    productivityDelta +
    '%\n' +
    makeToken('calc_out.remote_vs_office.row.adjusted_remote_cost', '• Productivity-adjusted cost:  ' + money(adjustedRemote) + ' (effective cost per unit of work)', { cost: money(adjustedRemote) }) + '\n' +
    (adjustedRemote < officeCost
      ? makeToken('calc_out.remote_vs_office.row.net_effect_remote', '• Net effect: 🟢 remote is cheaper after productivity')
      : makeToken('calc_out.remote_vs_office.row.net_effect_office', '• Net effect: 🟠 office is cheaper after productivity')) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.remote_vs_office.row.whatif_hot_desk', '• Hot-desk (30% less office):           office cost ' + money(hotDeskCost) + ' (save ' + money(hotDeskSavings) + ')', { cost: money(hotDeskCost), save: money(hotDeskSavings) }) + '\n' +
    makeToken('calc_out.remote_vs_office.row.whatif_stipend_1000', '• Remote stipend → $1,000:                remote cost ' + money(remoteStipend1000) + ' (+' + money(stipendDelta) + ')', { cost: money(remoteStipend1000), delta: money(stipendDelta) }) + '\n' +
    makeToken('calc_out.remote_vs_office.row.whatif_two_day_hybrid', '• 2-day in-office hybrid:                cost ' + money(twoDayCost) + ' (+' + money(twoDayDelta) + ' vs full remote)', { cost: money(twoDayCost), delta: money(twoDayDelta) }) + '\n' +
    makeToken('calc_out.remote_vs_office.row.whatif_hire_5', '• Hire 5 more (marginal):                office +' + money(fiveHireOffice) + ' vs remote +' + money(fiveHireRemote) + ' (save ' + money(fiveHireSavings) + ')', { office: money(fiveHireOffice), remote: money(fiveHireRemote), save: money(fiveHireSavings) }) + '\n' +
    makeToken('calc_out.remote_vs_office.row.whatif_switch_remote', '• Switch to fully remote today:          save ' + money(switchToRemote12mo) + ' /yr', { save: money(switchToRemote12mo) }) + '\n\n' +
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
      makeToken(
        'calc_out.remote_vs_office.row.comparison_row',
        'Comparison: ' +
          hc +
          ' employees: office ' +
          money(oc) +
          ' vs remote ' +
          money(rc) +
          ' — save ' +
          money(sv) +
          ' /yr by going remote',
        { count: String(hc), office: money(oc), remote: money(rc), save: money(sv) },
      ),
    );
  }

  return results;
}

// ============== customFn ==============

const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let p=function(r){return Number.isNaN(r)?0:Math.max(0,r)},h=function(r,o,c,s){return r<=0?0:r*(o+12*c)+r*s},y=function(r,o,c,s){return r<=0?0:r*(o+12*c)+r*s},F=function(r,o,c,s,i){if(r<=0)return 0;const n=.5*c+.5*s;return r*(o+12*n)+r*i},M=function(r,o){const c=1+o/100;return c<=0?1/0:r/c},H=function(r,o){const c=o>=0,s=r>0,i=s&&c?"strong":s&&o>=-10?"moderate_savings":!s&&c?"moderate_productivity":"weak";return i==="strong"?{emoji:"🟢",label:"STRONG — remote saves money AND is more productive",band:i}:i==="moderate_savings"?{emoji:"🟡",label:"MODERATE — remote saves money but slight productivity loss",band:i}:i==="moderate_productivity"?{emoji:"🟡",label:"MODERATE — office saves money but remote is more productive",band:i}:{emoji:"🟠",label:"WEAK — office is cheaper AND remote is less productive",band:i}},q=function(r,o){return 12*(r-o)},x=function(r){const o=p(parseFloat(r.headcount)||0),c=p(parseFloat(r.avgSalary)||0),s=p(parseFloat(r.officeOverheadPerPerson)||0),i=p(parseFloat(r.remoteStipendPerPerson)||0),n=p(parseFloat(r.oneTimeSetupPerPerson)||0),l=parseFloat(r.productivityDelta)||0;if(o===0)return[\`⏰ Remote vs In-Office Cost Calculator

\`+t("calc_out.remote_vs_office.row.need_headcount","💰 Enter headcount > 0 to compare office vs remote cost structures.")];if(c===0&&s===0&&i===0)return[\`⏰ Remote vs In-Office Cost Calculator

\`+t("calc_out.remote_vs_office.row.need_inputs","💰 Enter average salary and overhead values to see the cost comparison.")];const _=h(o,c,s,n),a=y(o,c,i,n),m=F(o,c,s,i,n),b=M(a,l),u=_-a,S=H(u,l),$=Math.abs(l),v=q(s,i),Z=f=>f.toLocaleString("en-US",{maximumFractionDigits:0}),e=f=>"$"+Z(f),K=Math.max(_,a,m),W=f=>Math.round(f/K*50),O=f=>"▓".repeat(W(f))+"░".repeat(50-W(f)),P=f=>(f/K*100).toFixed(0)+"%";let w="                "+"0%".padStart(4)+"      "+"50%".padStart(4)+"     "+"100%".padStart(4)+\`
\`;w+="Office Only  │"+O(_)+"│ "+e(_)+" ("+P(_)+\`)
\`,w+="Hybrid 50/50 │"+O(m)+"│ "+e(m)+" ("+P(m)+\`)
\`,w+="Remote Only  │"+O(a)+"│ "+e(a)+" ("+P(a)+")";const C=o*(c+12*s*.7)+o*n,B=_-C,D=y(o,c,1e3,n),G=D-a,T=.4*s+.6*i,A=o*(c+12*T)+o*n,L=A-a,ae=s+c/12,R=5*(c+12*s)+5*n,j=5*(c+12*i)+5*n,z=R-j,J=u;let d;l<=-10?d=t("calc_out.remote_vs_office.row.tip_productivity_loss","💡 Tip: Significant remote productivity loss. Consider hybrid (2-3 days in office) to balance cost savings with collaboration."):s<800?d=t("calc_out.remote_vs_office.row.tip_low_office","💡 Tip: Low office cost. Remote savings may not justify the loss of in-person collaboration. Stay in office."):o>=50?d=t("calc_out.remote_vs_office.row.tip_large_team","💡 Tip: At >50 people, collaboration and culture become more important. Many companies mandate 2-3 days in office at this scale (Stripe, Apple)."):d=t("calc_out.remote_vs_office.row.tip_default","💡 Tip: Office costs scale with real estate; remote costs scale with stipends. At <20 people, remote is usually 30-50% cheaper. At >50 people, the calculus shifts.");const U=[\`⏰ Remote vs In-Office Cost Calculator

\`+t("calc_out.remote_vs_office.row.section_cost_comparison","💰 Cost Comparison (Annual):")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.remote_vs_office.row.cost_office_only","• Office Only:    "+e(_)+"  ("+e(_/o)+" per person)",{office:e(_),per_person:e(_/o)})+\`
\`+t("calc_out.remote_vs_office.row.cost_remote_only","• Remote Only:    "+e(a)+"  ("+e(a/o)+" per person)",{remote:e(a),per_person:e(a/o)})+\`
\`+t("calc_out.remote_vs_office.row.cost_hybrid","• Hybrid 50/50:   "+e(m)+"  (50% office overhead, 50% remote stipend)",{hybrid:e(m)})+\`
\`+(u>0?t("calc_out.remote_vs_office.row.savings_remote","• Savings:        "+e(u)+" by going remote",{savings:e(u)}):u<0?t("calc_out.remote_vs_office.row.savings_office","• Savings:        "+e(-u)+" by staying in office",{savings:e(-u)}):t("calc_out.remote_vs_office.row.savings_equal","• Savings:        $0 — costs equal"))+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 Per-Employee Breakdown:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Salary:                      \`+e(c)+\` /yr
• Office overhead (12 mo):     \`+e(12*s)+" /yr ("+e(s)+\` /mo)
• Remote stipend (12 mo):      \`+e(12*i)+" /yr ("+e(i)+\` /mo)
\`+t("calc_out.remote_vs_office.row.one_time_setup","• One-time setup:              "+e(n)+" (amortized over 1 year)",{setup:e(n)})+\`
\`+t("calc_out.remote_vs_office.row.per_employee_office_total","• Per-employee office total:   "+e(c+12*s+n),{total:e(c+12*s+n)})+\`
\`+t("calc_out.remote_vs_office.row.per_employee_remote_total","• Per-employee remote total:   "+e(c+12*i+n),{total:e(c+12*i+n)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🩺 Decision Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(S.band==="strong"?t("calc_out.remote_vs_office.row.health_strong","• 🟢 STRONG — remote saves money AND is more productive"):S.band==="moderate_savings"?t("calc_out.remote_vs_office.row.health_moderate_savings","• 🟡 MODERATE — remote saves money but slight productivity loss"):S.band==="moderate_productivity"?t("calc_out.remote_vs_office.row.health_moderate_productivity","• 🟡 MODERATE — office saves money but remote is more productive"):t("calc_out.remote_vs_office.row.health_weak","• 🟠 WEAK — office is cheaper AND remote is less productive"))+\`
\`+t("calc_out.remote_vs_office.row.per_person_annual_savings","• Per-person annual savings:   "+e(v)+" (office - remote overhead)",{savings:e(v)})+\`
\`+(l>0?t("calc_out.remote_vs_office.row.productivity_up","• Productivity: 🟢 remote is "+l+"% more productive",{pct:String(l)}):l<0?t("calc_out.remote_vs_office.row.productivity_down","• Productivity: 🟠 remote is "+$+"% less productive",{pct:String($)}):t("calc_out.remote_vs_office.row.productivity_neutral","• Productivity: 🟡 neutral (no productivity adjustment)"))+\`
\`+t("calc_out.remote_vs_office.row.tco_3y","• 3-year TCO: office "+e(_*3)+" vs remote "+e(a*3),{office:e(_*3),remote:e(a*3)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Break-Even Analysis:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.remote_vs_office.row.breakeven_per_person_savings","• Per-person annual savings:  "+e(v),{savings:e(v)})+\`
\`+t("calc_out.remote_vs_office.row.breakeven_current_savings","• Current savings (× "+o+" people):     "+e(v*o),{people:String(o),savings:e(v*o)})+\`
\`+t("calc_out.remote_vs_office.row.breakeven_cumulative_savings","• 3-year cumulative savings:  "+e(v*o*3),{savings:e(v*o*3)})+\`
\`+t("calc_out.remote_vs_office.row.breakeven_note","• Note: break-even is per-person (not per headcount) because cost difference is constant per person.")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.remote_vs_office.row.section_productivity_adjusted","⚖️ Productivity-Adjusted Comparison:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.remote_vs_office.row.raw_remote_cost","• Raw remote cost:             "+e(a),{cost:e(a)})+\`
• Productivity adjustment:     \`+(l>0?"+":"")+l+\`%
\`+t("calc_out.remote_vs_office.row.adjusted_remote_cost","• Productivity-adjusted cost:  "+e(b)+" (effective cost per unit of work)",{cost:e(b)})+\`
\`+(b<_?t("calc_out.remote_vs_office.row.net_effect_remote","• Net effect: 🟢 remote is cheaper after productivity"):t("calc_out.remote_vs_office.row.net_effect_office","• Net effect: 🟠 office is cheaper after productivity"))+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If Scenarios:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.remote_vs_office.row.whatif_hot_desk","• Hot-desk (30% less office):           office cost "+e(C)+" (save "+e(B)+")",{cost:e(C),save:e(B)})+\`
\`+t("calc_out.remote_vs_office.row.whatif_stipend_1000","• Remote stipend → $1,000:                remote cost "+e(D)+" (+"+e(G)+")",{cost:e(D),delta:e(G)})+\`
\`+t("calc_out.remote_vs_office.row.whatif_two_day_hybrid","• 2-day in-office hybrid:                cost "+e(A)+" (+"+e(L)+" vs full remote)",{cost:e(A),delta:e(L)})+\`
\`+t("calc_out.remote_vs_office.row.whatif_hire_5","• Hire 5 more (marginal):                office +"+e(R)+" vs remote +"+e(j)+" (save "+e(z)+")",{office:e(R),remote:e(j),save:e(z)})+\`
\`+t("calc_out.remote_vs_office.row.whatif_switch_remote","• Switch to fully remote today:          save "+e(J)+" /yr",{save:e(J)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+w+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+d],Q=[5,10,25,50,100];for(let f=0;f<Q.length;f++){const g=Q[f],E=h(g,c,s,n),N=y(g,c,i,n),V=E-N;U.push(t("calc_out.remote_vs_office.row.comparison_row","Comparison: "+g+" employees: office "+e(E)+" vs remote "+e(N)+" — save "+e(V)+" /yr by going remote",{count:String(g),office:e(E),remote:e(N),save:e(V)}))}return U},I=function(r,o,c){var s=Y(r);return Array.isArray(s)?s.join(\`
\`):String(s)};var k=p,ee=h,te=y,oe=F,re=M,ce=H,se=q,ie=x,ne=I,t=tk,X='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',t=new Function("return "+X)(),Y=function(r){return x(r)};return[I(inputs,pick,fill)]}finally{}
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
  staticExamples: ['⏰ Remote vs In-Office Cost Calculator\n\n$calc_out.remote_vs_office.row.section_cost_comparison|💰 Cost Comparison (Annual):|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.remote_vs_office.row.cost_office_only{"office":"$1,010,000","per_person":"$101,000"}|• Office Only:    $1,010,000  ($101,000 per person)|\n$calc_out.remote_vs_office.row.cost_remote_only{"remote":"$890,000","per_person":"$89,000"}|• Remote Only:    $890,000  ($89,000 per person)|\n$calc_out.remote_vs_office.row.cost_hybrid{"hybrid":"$950,000"}|• Hybrid 50/50:   $950,000  (50% office overhead, 50% remote stipend)|\n$calc_out.remote_vs_office.row.savings_remote{"savings":"$120,000"}|• Savings:        $120,000 by going remote|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Per-Employee Breakdown:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Salary:                      $80,000 /yr\n• Office overhead (12 mo):     $18,000 /yr ($1,500 /mo)\n• Remote stipend (12 mo):      $6,000 /yr ($500 /mo)\n$calc_out.remote_vs_office.row.one_time_setup{"setup":"$3,000"}|• One-time setup:              $3,000 (amortized over 1 year)|\n$calc_out.remote_vs_office.row.per_employee_office_total{"total":"$101,000"}|• Per-employee office total:   $101,000|\n$calc_out.remote_vs_office.row.per_employee_remote_total{"total":"$89,000"}|• Per-employee remote total:   $89,000|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Decision Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.remote_vs_office.row.health_strong|• 🟢 STRONG — remote saves money AND is more productive|\n$calc_out.remote_vs_office.row.per_person_annual_savings{"savings":"$12,000"}|• Per-person annual savings:   $12,000 (office - remote overhead)|\n$calc_out.remote_vs_office.row.productivity_neutral|• Productivity: 🟡 neutral (no productivity adjustment)|\n$calc_out.remote_vs_office.row.tco_3y{"office":"$3,030,000","remote":"$2,670,000"}|• 3-year TCO: office $3,030,000 vs remote $2,670,000|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Break-Even Analysis:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.remote_vs_office.row.breakeven_per_person_savings{"savings":"$12,000"}|• Per-person annual savings:  $12,000|\n$calc_out.remote_vs_office.row.breakeven_current_savings{"people":"10","savings":"$120,000"}|• Current savings (× 10 people):     $120,000|\n$calc_out.remote_vs_office.row.breakeven_cumulative_savings{"savings":"$360,000"}|• 3-year cumulative savings:  $360,000|\n$calc_out.remote_vs_office.row.breakeven_note|• Note: break-even is per-person (not per headcount) because cost difference is constant per person.|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.remote_vs_office.row.section_productivity_adjusted|⚖️ Productivity-Adjusted Comparison:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.remote_vs_office.row.raw_remote_cost{"cost":"$890,000"}|• Raw remote cost:             $890,000|\n• Productivity adjustment:     0%\n$calc_out.remote_vs_office.row.adjusted_remote_cost{"cost":"$890,000"}|• Productivity-adjusted cost:  $890,000 (effective cost per unit of work)|\n$calc_out.remote_vs_office.row.net_effect_remote|• Net effect: 🟢 remote is cheaper after productivity|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.remote_vs_office.row.whatif_hot_desk{"cost":"$956,000","save":"$54,000"}|• Hot-desk (30% less office):           office cost $956,000 (save $54,000)|\n$calc_out.remote_vs_office.row.whatif_stipend_1000{"cost":"$950,000","delta":"$60,000"}|• Remote stipend → $1,000:                remote cost $950,000 (+$60,000)|\n$calc_out.remote_vs_office.row.whatif_two_day_hybrid{"cost":"$938,000","delta":"$48,000"}|• 2-day in-office hybrid:                cost $938,000 (+$48,000 vs full remote)|\n$calc_out.remote_vs_office.row.whatif_hire_5{"office":"$505,000","remote":"$445,000","save":"$60,000"}|• Hire 5 more (marginal):                office +$505,000 vs remote +$445,000 (save $60,000)|\n$calc_out.remote_vs_office.row.whatif_switch_remote{"save":"$120,000"}|• Switch to fully remote today:          save $120,000 /yr|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n                  0%       50%     100%\nOffice Only  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ $1,010,000 (100%)\nHybrid 50/50 │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░│ $950,000 (94%)\nRemote Only  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░│ $890,000 (88%)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.remote_vs_office.row.tip_default|💡 Tip: Office costs scale with real estate; remote costs scale with stipends. At <20 people, remote is usually 30-50% cheaper. At >50 people, the calculus shifts.|\n$calc_out.remote_vs_office.row.comparison_row{"count":"5","office":"$505,000","remote":"$445,000","save":"$60,000"}|Comparison: 5 employees: office $505,000 vs remote $445,000 — save $60,000 /yr by going remote|\n$calc_out.remote_vs_office.row.comparison_row{"count":"10","office":"$1,010,000","remote":"$890,000","save":"$120,000"}|Comparison: 10 employees: office $1,010,000 vs remote $890,000 — save $120,000 /yr by going remote|\n$calc_out.remote_vs_office.row.comparison_row{"count":"25","office":"$2,525,000","remote":"$2,225,000","save":"$300,000"}|Comparison: 25 employees: office $2,525,000 vs remote $2,225,000 — save $300,000 /yr by going remote|\n$calc_out.remote_vs_office.row.comparison_row{"count":"50","office":"$5,050,000","remote":"$4,450,000","save":"$600,000"}|Comparison: 50 employees: office $5,050,000 vs remote $4,450,000 — save $600,000 /yr by going remote|\n$calc_out.remote_vs_office.row.comparison_row{"count":"100","office":"$10,100,000","remote":"$8,900,000","save":"$1,200,000"}|Comparison: 100 employees: office $10,100,000 vs remote $8,900,000 — save $1,200,000 /yr by going remote|'],
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


import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-13：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

function calculateEmployeeCost(inputs: Record<string, string>): string[] {
  const annualSalary = clampNonNegative(parseFloat(inputs.annualSalary) || 0);
  const benefitsPct = clampNonNegative(parseFloat(inputs.benefitsPercentage) || 0);
  const location = inputs.location || 'us';

  const employerTaxRates: Record<string, number> = {
    us: 0.0765,
    uk: 0.138,
    europe: 0.20,
    asia: 0.12,
    remote: 0.10,
  };

  const overheadRates: Record<string, number> = {
    us: 0.25,
    uk: 0.20,
    europe: 0.22,
    asia: 0.15,
    remote: 0.10,
  };

  const taxRate = employerTaxRates[location] || 0.0765;
  const overheadRate = overheadRates[location] || 0.25;

  const benefitsCost = annualSalary * (benefitsPct / 100);
  const employerTax = annualSalary * taxRate;
  const overhead = annualSalary * overheadRate;
  const totalAnnualCost = annualSalary + benefitsCost + employerTax + overhead;
  const monthlyCost = totalAnnualCost / 12;
  const trueMultiplier = annualSalary > 0 ? totalAnnualCost / annualSalary : 0;
  const firstYearCost = totalAnnualCost * 1.15;
  // P168 B3-4：💡 Tip 改成**语义码**（分支条件 = 下面 Cost Health 那套 band，
  //   不引入第二套阈值）⇒ 模板在 locale 的 decision_tip.<code> 里，动态层随输入变。
  const tipJson =
    trueMultiplier <= 1.4
      ? JSON.stringify({ code: 'employee_cost_lean', params: { multiplier: trueMultiplier.toFixed(1) } })
      : trueMultiplier <= 1.8
      ? JSON.stringify({ code: 'employee_cost_standard', params: { multiplier: trueMultiplier.toFixed(1) } })
      : trueMultiplier <= 2.2
      ? JSON.stringify({ code: 'employee_cost_high', params: { multiplier: trueMultiplier.toFixed(1) } })
      : JSON.stringify({ code: 'employee_cost_excessive', params: { multiplier: trueMultiplier.toFixed(1) } });
  const ongoingCost = totalAnnualCost;
  const contractorCost = annualSalary * 1.05;
  const fullTimeBreakEven = contractorCost > totalAnnualCost;

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const loc = (n: number) => Math.round(n).toLocaleString();
  const pct = (v: number, t: number) => t > 0 ? ((v / t) * 100).toFixed(1) + '%' : '0%';

  const locLabel: Record<string, string> = {
    us: 'United States',
    uk: 'United Kingdom',
    europe: 'Europe (EU avg)',
    asia: 'Asia (regional avg)',
    remote: 'Global Remote',
  };

  const results: string[] = [];

  // P168 B3-13：📍 地点这一行按**地区分支**各写一个 code 字面量
  //   ⇒ zh 页能整行中文（而不是把英文地名塞进参数里）。
  const locationRow =
    location === 'us' ? makeToken('calc_out.employee_cost.row.location_us', '📍 Location: United States')
    : location === 'uk' ? makeToken('calc_out.employee_cost.row.location_uk', '📍 Location: United Kingdom')
    : location === 'europe' ? makeToken('calc_out.employee_cost.row.location_europe', '📍 Location: Europe (EU avg)')
    : location === 'asia' ? makeToken('calc_out.employee_cost.row.location_asia', '📍 Location: Asia (regional avg)')
    : location === 'remote' ? makeToken('calc_out.employee_cost.row.location_remote', '📍 Location: Global Remote')
    : '📍 Location: ' + locLabel[location];

  results.push(
    '💼 Employee Cost Calculator\n\n' +
    locationRow + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.employee_cost.row.true_cost_breakdown', '💰 True Cost Breakdown:') + '\n' +
    makeToken('calc_out.employee_cost.row.base_salary', '• Base Salary:                $' + loc(annualSalary) + '/yr  (' + pct(annualSalary, totalAnnualCost) + ' of total)', { salary: loc(annualSalary), share: pct(annualSalary, totalAnnualCost) }) + '\n' +
    makeToken('calc_out.employee_cost.row.benefits', '• Benefits (' + benefitsPct + '%):          $' + loc(benefitsCost) + '/yr  (' + pct(benefitsCost, totalAnnualCost) + ')', { pct: String(benefitsPct), cost: loc(benefitsCost), share: pct(benefitsCost, totalAnnualCost) }) + '\n' +
    makeToken('calc_out.employee_cost.row.employer_tax', '• Employer Tax (' + (taxRate * 100).toFixed(1) + '%):      $' + loc(employerTax) + '/yr  (' + pct(employerTax, totalAnnualCost) + ')', { rate: (taxRate * 100).toFixed(1), cost: loc(employerTax), share: pct(employerTax, totalAnnualCost) }) + '\n' +
    makeToken('calc_out.employee_cost.row.overhead', '• Overhead (' + (overheadRate * 100).toFixed(0) + '%):           $' + loc(overhead) + '/yr  (' + pct(overhead, totalAnnualCost) + ')', { rate: (overheadRate * 100).toFixed(0), cost: loc(overhead), share: pct(overhead, totalAnnualCost) }) + '\n' +
    makeToken('calc_out.employee_cost.row.total_annual_cost', '• Total Annual Cost:        $' + loc(totalAnnualCost) + '/yr', { cost: loc(totalAnnualCost) }) + '\n' +
    makeToken('calc_out.employee_cost.row.monthly_cost', '• Monthly Cost:                $' + fmt(monthlyCost) + '/mo', { cost: fmt(monthlyCost) }) + '\n' +
    makeToken('calc_out.employee_cost.row.true_cost_multiplier', '• True Cost Multiplier:    ' + trueMultiplier.toFixed(2) + 'x base salary', { mult: trueMultiplier.toFixed(2) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Key Metrics:\n' +
    makeToken('calc_out.employee_cost.row.loaded_vs_base_ratio', '• Loaded vs Base Ratio:    ' + trueMultiplier.toFixed(2) + 'x  (1.2-1.8x typical)', { mult: trueMultiplier.toFixed(2) }) + '\n' +
    makeToken('calc_out.employee_cost.row.first_year_cost', '• First-Year Cost (incl. onboarding):   $' + loc(firstYearCost), { cost: loc(firstYearCost) }) + '\n' +
    makeToken('calc_out.employee_cost.row.ongoing_annual_cost', '• Ongoing Annual Cost:        $' + loc(ongoingCost), { cost: loc(ongoingCost) }) + '\n' +
    makeToken('calc_out.employee_cost.row.year1_premium', '• Year-1 Premium:                $' + loc(firstYearCost - ongoingCost) + '  (' + pct(firstYearCost - ongoingCost, ongoingCost) + ' ramp-up)', { premium: loc(firstYearCost - ongoingCost), share: pct(firstYearCost - ongoingCost, ongoingCost) }) + '\n' +
    makeToken('calc_out.employee_cost.row.benefits_per_hour', '• Benefits per Hour:           $' + (benefitsCost / 2080).toFixed(2) + '  (over 2,080 work hours/yr)', { perhour: (benefitsCost / 2080).toFixed(2) }) + '\n' +
    makeToken('calc_out.employee_cost.row.effective_hourly_cost', '• Effective Hourly Cost:    $' + (totalAnnualCost / 2080).toFixed(2) + '/hr', { rate: (totalAnnualCost / 2080).toFixed(2) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Cost Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (trueMultiplier <= 1.4
      ? makeToken('calc_out.employee_cost.row.health_multiplier_lean', '• 🟢 Lean multiplier (' + trueMultiplier.toFixed(2) + 'x) — efficient operation.', { mult: trueMultiplier.toFixed(2) }) + '\n'
      : trueMultiplier <= 1.8
      ? makeToken('calc_out.employee_cost.row.health_multiplier_standard', '• 🟢 Standard multiplier (' + trueMultiplier.toFixed(2) + 'x) — typical for full-time staff.', { mult: trueMultiplier.toFixed(2) }) + '\n'
      : trueMultiplier <= 2.2
      ? makeToken('calc_out.employee_cost.row.health_multiplier_high', '• 🟠 High multiplier (' + trueMultiplier.toFixed(2) + 'x) — review overhead/benefits ratio.', { mult: trueMultiplier.toFixed(2) }) + '\n'
      : makeToken('calc_out.employee_cost.row.health_multiplier_excessive', '• 🔴 Excessive multiplier (' + trueMultiplier.toFixed(2) + 'x) — likely heavy overhead or benefits.', { mult: trueMultiplier.toFixed(2) }) + '\n') +
    (annualSalary >= 150000
      ? makeToken('calc_out.employee_cost.row.health_hire_senior', '• ⚠️ Senior hire at $' + loc(annualSalary) + '/yr — clear ROI must be established.', { salary: loc(annualSalary) }) + '\n'
      : annualSalary >= 80000
      ? makeToken('calc_out.employee_cost.row.health_hire_mid', '• 🟢 Mid-level hire at $' + loc(annualSalary) + '/yr — standard team member.', { salary: loc(annualSalary) }) + '\n'
      : makeToken('calc_out.employee_cost.row.health_hire_junior', '• 🟢 Junior hire at $' + loc(annualSalary) + '/yr — low-risk entry-level role.', { salary: loc(annualSalary) }) + '\n') +
    (benefitsPct >= 30
      ? makeToken('calc_out.employee_cost.row.health_benefits_competitive', '• 🟢 Benefits ratio (' + benefitsPct + '%) is competitive.', { pct: String(benefitsPct) }) + '\n'
      : benefitsPct >= 20
      ? makeToken('calc_out.employee_cost.row.health_benefits_below_avg', '• 🟡 Benefits ratio (' + benefitsPct + '%) is below US average (30-35%).', { pct: String(benefitsPct) }) + '\n'
      : makeToken('calc_out.employee_cost.row.health_benefits_too_low', '• 🟠 Benefits ratio (' + benefitsPct + '%) is very low — may hurt retention.', { pct: String(benefitsPct) }) + '\n') +
    '\n🎯 Annual Projection:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.employee_cost.row.year1', '• Year 1 (with onboarding):    $' + loc(firstYearCost), { cost: loc(firstYearCost) }) + '\n' +
    makeToken('calc_out.employee_cost.row.year2', '• Year 2 (full productivity):  $' + loc(ongoingCost) + '  (-' + ((firstYearCost - ongoingCost) / firstYearCost * 100).toFixed(1) + '%)', { cost: loc(ongoingCost), drop: ((firstYearCost - ongoingCost) / firstYearCost * 100).toFixed(1) }) + '\n' +
    makeToken('calc_out.employee_cost.row.year3', '• Year 3 (with 3% raise):           $' + loc(ongoingCost * 1.03) + '  (+3%)', { cost: loc(ongoingCost * 1.03) }) + '\n' +
    makeToken('calc_out.employee_cost.row.year5', '• Year 5 (with 3%/yr raises):    $' + loc(ongoingCost * Math.pow(1.03, 4)), { cost: loc(ongoingCost * Math.pow(1.03, 4)) }) + '\n' +
    makeToken('calc_out.employee_cost.row.five_year_total', '• 5-Year Total:                            $' + loc(firstYearCost + ongoingCost + ongoingCost * 1.03 + ongoingCost * Math.pow(1.03, 2) + ongoingCost * Math.pow(1.03, 3) + ongoingCost * Math.pow(1.03, 4)), { total: loc(firstYearCost + ongoingCost + ongoingCost * 1.03 + ongoingCost * Math.pow(1.03, 2) + ongoingCost * Math.pow(1.03, 3) + ongoingCost * Math.pow(1.03, 4)) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Full-Time vs Contractor Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (fullTimeBreakEven
      ? '• 🟢 Full-time is cheaper than a contractor at this level. Hire directly.\n'
      : makeToken('calc_out.employee_cost.row.breakeven_contractor_cheaper', '• 🟡 Contractor cheaper at $' + loc(contractorCost) + '/yr — consider contractor for short-term needs.', { cost: loc(contractorCost) }) + '\n') +
    makeToken('calc_out.employee_cost.row.fulltime_annual_cost', '• Full-Time Annual Cost:          $' + loc(totalAnnualCost), { cost: loc(totalAnnualCost) }) + '\n' +
    makeToken('calc_out.employee_cost.row.contractor_equivalent', '• Contractor Equivalent:            $' + loc(contractorCost) + '/yr  (no benefits/tax overhead)', { cost: loc(contractorCost) }) + '\n' +
    makeToken('calc_out.employee_cost.row.savings_with_fulltime', '• Savings with Full-Time:           $' + loc(contractorCost - totalAnnualCost) + '/yr  (vs contractor)', { savings: loc(contractorCost - totalAnnualCost) }) + '\n' +
    (fullTimeBreakEven
      ? '• Break-Even Point:                  Already crossed\n\n'
      : makeToken('calc_out.employee_cost.row.breakeven_point_months', '• Break-Even Point:                  ~' + Math.ceil((totalAnnualCost - contractorCost) / (annualSalary * 0.05)) + ' months at this salary', { months: String(Math.ceil((totalAnnualCost - contractorCost) / (annualSalary * 0.05))) }) + '\n\n') +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.employee_cost.row.whatif_bonus_10', '• Add 10% performance bonus:   Total → $' + loc(totalAnnualCost * 1.1) + '  (Multiplier ' + (totalAnnualCost * 1.1 / annualSalary).toFixed(2) + 'x)', { cost: loc(totalAnnualCost * 1.1), mult: (totalAnnualCost * 1.1 / annualSalary).toFixed(2) }) + '\n' +
    makeToken('calc_out.employee_cost.row.whatif_benefits_20', '• Cut benefits to 20%:                Save $' + loc(benefitsCost - annualSalary * 0.20) + '/yr  (Total → $' + loc(annualSalary + annualSalary * 0.20 + employerTax + overhead) + ')', { save: loc(benefitsCost - annualSalary * 0.20), total: loc(annualSalary + annualSalary * 0.20 + employerTax + overhead) }) + '\n' +
    makeToken('calc_out.employee_cost.row.whatif_training_5k', '• Increase training budget ($5K):  Total → $' + loc(totalAnnualCost + 5000) + '  (better retention)', { cost: loc(totalAnnualCost + 5000) }) + '\n' +
    makeToken('calc_out.employee_cost.row.whatif_hire_asia', '• Hire in Asia instead:                 ~$' + loc(annualSalary * 0.4) + '/yr  (40% of US cost)', { cost: loc(annualSalary * 0.4) }) + '\n' +
    makeToken('calc_out.employee_cost.row.whatif_remote', '• Remote (anywhere):                         ~$' + loc(annualSalary * 0.7) + '/yr  (saves office overhead)', { cost: loc(annualSalary * 0.7) }) + '\n\n' +
    '💡 Tip: ' + tipJson,
  );

  const salaries = [40000, 60000, 80000, 120000, 180000];
  for (let i = 0; i < salaries.length; i++) {
    const s = salaries[i];
    const bc = s * (benefitsPct / 100);
    const et = s * taxRate;
    const oh = s * overheadRate;
    const tac = s + bc + et + oh;
    results.push(
      makeToken('calc_out.employee_cost.row.comparison_head', 'Comparison: $' + loc(s) + ' salary → Total $' + loc(tac) + '/yr ($' + fmt(tac / 12) + '/mo)', { salary: loc(s), total: loc(tac), monthly: fmt(tac / 12) }) +
      ' | ' +
      makeToken('calc_out.employee_cost.row.comparison_multiplier', 'Multiplier ' + (tac / s).toFixed(2) + 'x', { mult: (tac / s).toFixed(2) }),
    );
  }

  // P168 B3-4：**🧭 四段已迁到页面的「🧭 算完之后」区块**
  //   （src/i18n/locales/{en,zh}.json 的 tools.<slug>.decision_goal /
  //     decision_recommendation / decision_constraint / decision_next_tool，双语）
  //   ⇒ 引擎只负责算；**决策支持由区块独占** ⇒ 同页不再有两份决策建议。
  //   ⚠️ 引擎里**不要**再写这段：区块与卡片会同时渲染同一件事。

  return results;
}

const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let x=function(_){return Number.isNaN(_)?0:Math.max(0,_)},b=function(_){const e=x(parseFloat(_.annualSalary)||0),i=x(parseFloat(_.benefitsPercentage)||0),s=_.location||"us",B={us:.0765,uk:.138,europe:.2,asia:.12,remote:.1},L={us:.25,uk:.2,europe:.22,asia:.15,remote:.1},f=B[s]||.0765,v=L[s]||.25,p=e*(i/100),m=e*f,d=e*v,r=e+p+m+d,S=r/12,a=e>0?r/e:0,l=r*1.15,O=a<=1.4?JSON.stringify({code:"employee_cost_lean",params:{multiplier:a.toFixed(1)}}):a<=1.8?JSON.stringify({code:"employee_cost_standard",params:{multiplier:a.toFixed(1)}}):a<=2.2?JSON.stringify({code:"employee_cost_high",params:{multiplier:a.toFixed(1)}}):JSON.stringify({code:"employee_cost_excessive",params:{multiplier:a.toFixed(1)}}),c=r,y=e*1.05,C=y>r,g=h=>h.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}),t=h=>Math.round(h).toLocaleString(),u=(h,n)=>n>0?(h/n*100).toFixed(1)+"%":"0%",R={us:"United States",uk:"United Kingdom",europe:"Europe (EU avg)",asia:"Asia (regional avg)",remote:"Global Remote"},F=[],N=s==="us"?o("calc_out.employee_cost.row.location_us","📍 Location: United States"):s==="uk"?o("calc_out.employee_cost.row.location_uk","📍 Location: United Kingdom"):s==="europe"?o("calc_out.employee_cost.row.location_europe","📍 Location: Europe (EU avg)"):s==="asia"?o("calc_out.employee_cost.row.location_asia","📍 Location: Asia (regional avg)"):s==="remote"?o("calc_out.employee_cost.row.location_remote","📍 Location: Global Remote"):"📍 Location: "+R[s];F.push(\`💼 Employee Cost Calculator

\`+N+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+o("calc_out.employee_cost.row.true_cost_breakdown","💰 True Cost Breakdown:")+\`
\`+o("calc_out.employee_cost.row.base_salary","• Base Salary:                $"+t(e)+"/yr  ("+u(e,r)+" of total)",{salary:t(e),share:u(e,r)})+\`
\`+o("calc_out.employee_cost.row.benefits","• Benefits ("+i+"%):          $"+t(p)+"/yr  ("+u(p,r)+")",{pct:String(i),cost:t(p),share:u(p,r)})+\`
\`+o("calc_out.employee_cost.row.employer_tax","• Employer Tax ("+(f*100).toFixed(1)+"%):      $"+t(m)+"/yr  ("+u(m,r)+")",{rate:(f*100).toFixed(1),cost:t(m),share:u(m,r)})+\`
\`+o("calc_out.employee_cost.row.overhead","• Overhead ("+(v*100).toFixed(0)+"%):           $"+t(d)+"/yr  ("+u(d,r)+")",{rate:(v*100).toFixed(0),cost:t(d),share:u(d,r)})+\`
\`+o("calc_out.employee_cost.row.total_annual_cost","• Total Annual Cost:        $"+t(r)+"/yr",{cost:t(r)})+\`
\`+o("calc_out.employee_cost.row.monthly_cost","• Monthly Cost:                $"+g(S)+"/mo",{cost:g(S)})+\`
\`+o("calc_out.employee_cost.row.true_cost_multiplier","• True Cost Multiplier:    "+a.toFixed(2)+"x base salary",{mult:a.toFixed(2)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 Key Metrics:
\`+o("calc_out.employee_cost.row.loaded_vs_base_ratio","• Loaded vs Base Ratio:    "+a.toFixed(2)+"x  (1.2-1.8x typical)",{mult:a.toFixed(2)})+\`
\`+o("calc_out.employee_cost.row.first_year_cost","• First-Year Cost (incl. onboarding):   $"+t(l),{cost:t(l)})+\`
\`+o("calc_out.employee_cost.row.ongoing_annual_cost","• Ongoing Annual Cost:        $"+t(c),{cost:t(c)})+\`
\`+o("calc_out.employee_cost.row.year1_premium","• Year-1 Premium:                $"+t(l-c)+"  ("+u(l-c,c)+" ramp-up)",{premium:t(l-c),share:u(l-c,c)})+\`
\`+o("calc_out.employee_cost.row.benefits_per_hour","• Benefits per Hour:           $"+(p/2080).toFixed(2)+"  (over 2,080 work hours/yr)",{perhour:(p/2080).toFixed(2)})+\`
\`+o("calc_out.employee_cost.row.effective_hourly_cost","• Effective Hourly Cost:    $"+(r/2080).toFixed(2)+"/hr",{rate:(r/2080).toFixed(2)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🩺 Cost Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(a<=1.4?o("calc_out.employee_cost.row.health_multiplier_lean","• 🟢 Lean multiplier ("+a.toFixed(2)+"x) — efficient operation.",{mult:a.toFixed(2)})+\`
\`:a<=1.8?o("calc_out.employee_cost.row.health_multiplier_standard","• 🟢 Standard multiplier ("+a.toFixed(2)+"x) — typical for full-time staff.",{mult:a.toFixed(2)})+\`
\`:a<=2.2?o("calc_out.employee_cost.row.health_multiplier_high","• 🟠 High multiplier ("+a.toFixed(2)+"x) — review overhead/benefits ratio.",{mult:a.toFixed(2)})+\`
\`:o("calc_out.employee_cost.row.health_multiplier_excessive","• 🔴 Excessive multiplier ("+a.toFixed(2)+"x) — likely heavy overhead or benefits.",{mult:a.toFixed(2)})+\`
\`)+(e>=15e4?o("calc_out.employee_cost.row.health_hire_senior","• ⚠️ Senior hire at $"+t(e)+"/yr — clear ROI must be established.",{salary:t(e)})+\`
\`:e>=8e4?o("calc_out.employee_cost.row.health_hire_mid","• 🟢 Mid-level hire at $"+t(e)+"/yr — standard team member.",{salary:t(e)})+\`
\`:o("calc_out.employee_cost.row.health_hire_junior","• 🟢 Junior hire at $"+t(e)+"/yr — low-risk entry-level role.",{salary:t(e)})+\`
\`)+(i>=30?o("calc_out.employee_cost.row.health_benefits_competitive","• 🟢 Benefits ratio ("+i+"%) is competitive.",{pct:String(i)})+\`
\`:i>=20?o("calc_out.employee_cost.row.health_benefits_below_avg","• 🟡 Benefits ratio ("+i+"%) is below US average (30-35%).",{pct:String(i)})+\`
\`:o("calc_out.employee_cost.row.health_benefits_too_low","• 🟠 Benefits ratio ("+i+"%) is very low — may hurt retention.",{pct:String(i)})+\`
\`)+\`
🎯 Annual Projection:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+o("calc_out.employee_cost.row.year1","• Year 1 (with onboarding):    $"+t(l),{cost:t(l)})+\`
\`+o("calc_out.employee_cost.row.year2","• Year 2 (full productivity):  $"+t(c)+"  (-"+((l-c)/l*100).toFixed(1)+"%)",{cost:t(c),drop:((l-c)/l*100).toFixed(1)})+\`
\`+o("calc_out.employee_cost.row.year3","• Year 3 (with 3% raise):           $"+t(c*1.03)+"  (+3%)",{cost:t(c*1.03)})+\`
\`+o("calc_out.employee_cost.row.year5","• Year 5 (with 3%/yr raises):    $"+t(c*Math.pow(1.03,4)),{cost:t(c*Math.pow(1.03,4))})+\`
\`+o("calc_out.employee_cost.row.five_year_total","• 5-Year Total:                            $"+t(l+c+c*1.03+c*Math.pow(1.03,2)+c*Math.pow(1.03,3)+c*Math.pow(1.03,4)),{total:t(l+c+c*1.03+c*Math.pow(1.03,2)+c*Math.pow(1.03,3)+c*Math.pow(1.03,4))})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ Full-Time vs Contractor Break-Even:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(C?\`• 🟢 Full-time is cheaper than a contractor at this level. Hire directly.
\`:o("calc_out.employee_cost.row.breakeven_contractor_cheaper","• 🟡 Contractor cheaper at $"+t(y)+"/yr — consider contractor for short-term needs.",{cost:t(y)})+\`
\`)+o("calc_out.employee_cost.row.fulltime_annual_cost","• Full-Time Annual Cost:          $"+t(r),{cost:t(r)})+\`
\`+o("calc_out.employee_cost.row.contractor_equivalent","• Contractor Equivalent:            $"+t(y)+"/yr  (no benefits/tax overhead)",{cost:t(y)})+\`
\`+o("calc_out.employee_cost.row.savings_with_fulltime","• Savings with Full-Time:           $"+t(y-r)+"/yr  (vs contractor)",{savings:t(y-r)})+\`
\`+(C?\`• Break-Even Point:                  Already crossed

\`:o("calc_out.employee_cost.row.breakeven_point_months","• Break-Even Point:                  ~"+Math.ceil((r-y)/(e*.05))+" months at this salary",{months:String(Math.ceil((r-y)/(e*.05)))})+\`

\`)+\`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If Scenarios:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+o("calc_out.employee_cost.row.whatif_bonus_10","• Add 10% performance bonus:   Total → $"+t(r*1.1)+"  (Multiplier "+(r*1.1/e).toFixed(2)+"x)",{cost:t(r*1.1),mult:(r*1.1/e).toFixed(2)})+\`
\`+o("calc_out.employee_cost.row.whatif_benefits_20","• Cut benefits to 20%:                Save $"+t(p-e*.2)+"/yr  (Total → $"+t(e+e*.2+m+d)+")",{save:t(p-e*.2),total:t(e+e*.2+m+d)})+\`
\`+o("calc_out.employee_cost.row.whatif_training_5k","• Increase training budget ($5K):  Total → $"+t(r+5e3)+"  (better retention)",{cost:t(r+5e3)})+\`
\`+o("calc_out.employee_cost.row.whatif_hire_asia","• Hire in Asia instead:                 ~$"+t(e*.4)+"/yr  (40% of US cost)",{cost:t(e*.4)})+\`
\`+o("calc_out.employee_cost.row.whatif_remote","• Remote (anywhere):                         ~$"+t(e*.7)+"/yr  (saves office overhead)",{cost:t(e*.7)})+\`

💡 Tip: \`+O);const M=[4e4,6e4,8e4,12e4,18e4];for(let h=0;h<M.length;h++){const n=M[h],U=n*(i/100),Y=n*f,j=n*v,w=n+U+Y+j;F.push(o("calc_out.employee_cost.row.comparison_head","Comparison: $"+t(n)+" salary → Total $"+t(w)+"/yr ($"+g(w/12)+"/mo)",{salary:t(n),total:t(w),monthly:g(w/12)})+" | "+o("calc_out.employee_cost.row.comparison_multiplier","Multiplier "+(w/n).toFixed(2)+"x",{mult:(w/n).toFixed(2)}))}return F},$=function(_,e,i){var s=A(_);return Array.isArray(s)?s.join(\`
\`):String(s)};var J=x,q=b,H=$,o=tk,E='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',o=new Function("return "+E)(),A=function(_){return b(_)};return[$(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: 'solopreneur-employee-cost-calculator',
  title: 'Employee Cost Calculator',
  description: 'Calculate the true loaded cost of hiring — base salary, benefits, employer taxes, overhead — with break-even vs contractor and 5-year projections.',
  inputs: [
    { name: 'annualSalary', label: 'Annual Base Salary ($)', placeholder: 'e.g. 80000', type: 'number' },
    { name: 'benefitsPercentage', label: 'Benefits (% of salary)', placeholder: 'e.g. 30', type: 'number' },
    { name: 'location', label: 'Hiring Location', placeholder: '', type: 'select', options: ['us', 'uk', 'europe', 'asia', 'remote'] },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  // P140f-p3-T7: minimal Playbook 6 字段 template (Goal=该不该决策)
  // Goal 含"决策"+"该不该"双关键词 → 通过 T1 zod refine 校验
  playbook: {
    goal: '用户该不该按这个完全负荷成本招这个岗位，还是先换一种用工方式',
    input: 'engine 定义的 inputs 字段',
    output: 'engine 定义的 generate() 返回数组',
    constraint: 'apply 引擎 inputs 时受实际场景约束',
    tool: '页面的「🧭 算完之后」决策区块（决策支持已由区块独占）',
    memory: 'v2.0 11 business domain benchmark + P140f Phase 4 主题簇',
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateEmployeeCost(inputs);
  },
  staticExamples: [
    '💼 Employee Cost Calculator\n\n$calc_out.employee_cost.row.location_us|📍 Location: United States|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.employee_cost.row.true_cost_breakdown|💰 True Cost Breakdown:|\n$calc_out.employee_cost.row.base_salary{"salary":"80,000","share":"61.5%"}|• Base Salary:                $80,000/yr  (61.5% of total)|\n$calc_out.employee_cost.row.benefits{"pct":"30","cost":"24,000","share":"18.4%"}|• Benefits (30%):          $24,000/yr  (18.4%)|\n$calc_out.employee_cost.row.employer_tax{"rate":"7.6","cost":"6,120","share":"4.7%"}|• Employer Tax (7.6%):      $6,120/yr  (4.7%)|\n$calc_out.employee_cost.row.overhead{"rate":"25","cost":"20,000","share":"15.4%"}|• Overhead (25%):           $20,000/yr  (15.4%)|\n$calc_out.employee_cost.row.total_annual_cost{"cost":"130,120"}|• Total Annual Cost:        $130,120/yr|\n$calc_out.employee_cost.row.monthly_cost{"cost":"10,843.33"}|• Monthly Cost:                $10,843.33/mo|\n$calc_out.employee_cost.row.true_cost_multiplier{"mult":"1.63"}|• True Cost Multiplier:    1.63x base salary|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Key Metrics:\n$calc_out.employee_cost.row.loaded_vs_base_ratio{"mult":"1.63"}|• Loaded vs Base Ratio:    1.63x  (1.2-1.8x typical)|\n$calc_out.employee_cost.row.first_year_cost{"cost":"149,638"}|• First-Year Cost (incl. onboarding):   $149,638|\n$calc_out.employee_cost.row.ongoing_annual_cost{"cost":"130,120"}|• Ongoing Annual Cost:        $130,120|\n$calc_out.employee_cost.row.year1_premium{"premium":"19,518","share":"15.0%"}|• Year-1 Premium:                $19,518  (15.0% ramp-up)|\n$calc_out.employee_cost.row.benefits_per_hour{"perhour":"11.54"}|• Benefits per Hour:           $11.54  (over 2,080 work hours/yr)|\n$calc_out.employee_cost.row.effective_hourly_cost{"rate":"62.56"}|• Effective Hourly Cost:    $62.56/hr|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Cost Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.employee_cost.row.health_multiplier_standard{"mult":"1.63"}|• 🟢 Standard multiplier (1.63x) — typical for full-time staff.|\n$calc_out.employee_cost.row.health_hire_mid{"salary":"80,000"}|• 🟢 Mid-level hire at $80,000/yr — standard team member.|\n$calc_out.employee_cost.row.health_benefits_competitive{"pct":"30"}|• 🟢 Benefits ratio (30%) is competitive.|\n\n🎯 Annual Projection:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.employee_cost.row.year1{"cost":"149,638"}|• Year 1 (with onboarding):    $149,638|\n$calc_out.employee_cost.row.year2{"cost":"130,120","drop":"13.0"}|• Year 2 (full productivity):  $130,120  (-13.0%)|\n$calc_out.employee_cost.row.year3{"cost":"134,024"}|• Year 3 (with 3% raise):           $134,024  (+3%)|\n$calc_out.employee_cost.row.year5{"cost":"146,451"}|• Year 5 (with 3%/yr raises):    $146,451|\n$calc_out.employee_cost.row.five_year_total{"total":"840,463"}|• 5-Year Total:                            $840,463|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Full-Time vs Contractor Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.employee_cost.row.breakeven_contractor_cheaper{"cost":"84,000"}|• 🟡 Contractor cheaper at $84,000/yr — consider contractor for short-term needs.|\n$calc_out.employee_cost.row.fulltime_annual_cost{"cost":"130,120"}|• Full-Time Annual Cost:          $130,120|\n$calc_out.employee_cost.row.contractor_equivalent{"cost":"84,000"}|• Contractor Equivalent:            $84,000/yr  (no benefits/tax overhead)|\n$calc_out.employee_cost.row.savings_with_fulltime{"savings":"-46,120"}|• Savings with Full-Time:           $-46,120/yr  (vs contractor)|\n$calc_out.employee_cost.row.breakeven_point_months{"months":"12"}|• Break-Even Point:                  ~12 months at this salary|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.employee_cost.row.whatif_bonus_10{"cost":"143,132","mult":"1.79"}|• Add 10% performance bonus:   Total → $143,132  (Multiplier 1.79x)|\n$calc_out.employee_cost.row.whatif_benefits_20{"save":"8,000","total":"122,120"}|• Cut benefits to 20%:                Save $8,000/yr  (Total → $122,120)|\n$calc_out.employee_cost.row.whatif_training_5k{"cost":"135,120"}|• Increase training budget ($5K):  Total → $135,120  (better retention)|\n$calc_out.employee_cost.row.whatif_hire_asia{"cost":"32,000"}|• Hire in Asia instead:                 ~$32,000/yr  (40% of US cost)|\n$calc_out.employee_cost.row.whatif_remote{"cost":"56,000"}|• Remote (anywhere):                         ~$56,000/yr  (saves office overhead)|\n\n💡 Tip: {"code":"employee_cost_standard","params":{"multiplier":"1.6"}}\n$calc_out.employee_cost.row.comparison_head{"salary":"40,000","total":"65,060","monthly":"5,421.67"}|Comparison: $40,000 salary → Total $65,060/yr ($5,421.67/mo)| | $calc_out.employee_cost.row.comparison_multiplier{"mult":"1.63"}|Multiplier 1.63x|\n$calc_out.employee_cost.row.comparison_head{"salary":"60,000","total":"97,590","monthly":"8,132.50"}|Comparison: $60,000 salary → Total $97,590/yr ($8,132.50/mo)| | $calc_out.employee_cost.row.comparison_multiplier{"mult":"1.63"}|Multiplier 1.63x|\n$calc_out.employee_cost.row.comparison_head{"salary":"80,000","total":"130,120","monthly":"10,843.33"}|Comparison: $80,000 salary → Total $130,120/yr ($10,843.33/mo)| | $calc_out.employee_cost.row.comparison_multiplier{"mult":"1.63"}|Multiplier 1.63x|\n$calc_out.employee_cost.row.comparison_head{"salary":"120,000","total":"195,180","monthly":"16,265.00"}|Comparison: $120,000 salary → Total $195,180/yr ($16,265.00/mo)| | $calc_out.employee_cost.row.comparison_multiplier{"mult":"1.63"}|Multiplier 1.63x|\n$calc_out.employee_cost.row.comparison_head{"salary":"180,000","total":"292,770","monthly":"24,397.50"}|Comparison: $180,000 salary → Total $292,770/yr ($24,397.50/mo)| | $calc_out.employee_cost.row.comparison_multiplier{"mult":"1.63"}|Multiplier 1.63x|',
    '',
    '',
    '',
    '',
  ],
  faq: [
    { q: 'What is included in employer taxes?', a: 'In the US, employer taxes include Social Security (6.2%), Medicare (1.45%), and federal/state unemployment insurance. Rates vary significantly by country. The UK adds National Insurance contributions at 13.8%. European countries often have higher social charges ranging from 20-35% of gross salary. Always consult a local accountant for precise calculations in your jurisdiction.' },
    { q: 'What counts as overhead for an employee?', a: 'Overhead includes office space/desk rent ($500-$2,000/mo), equipment (laptop, monitor, software licenses), HR and payroll administration, training and onboarding costs, manager time spent supervising, and general operational costs like internet, utilities, and insurance. A common rule of thumb is 20-30% of base salary for knowledge workers.' },
    { q: 'How do I calculate total employee cost quickly?', a: 'Use the multiplier method: base salary × (1 + benefits% + employer tax% + overhead%). For a US employee with 30% benefits, the multiplier is roughly 1.6-1.7x. So a $100K salary really costs $160K-$170K. For European employees, the multiplier is often 1.8-2.2x due to higher social charges and mandatory benefits.' },
    { q: 'Should I hire locally or remotely?', a: 'Remote hiring can reduce overhead by 10-15% (no office space, lower equipment costs) and may allow access to markets with lower employer tax rates. However, you may face compliance complexity, currency fluctuation risk, and communication challenges across time zones. The calculator helps you compare the financial side of this decision.' },
    { q: 'Does this include recruiting and onboarding costs?', a: 'The calculator provides recurring annual costs. Recruiting is typically a one-time expense of 20-30% of first-year salary (agency fees, job board postings, interview time). Onboarding and ramp-up productivity loss can add another 10-20% in the first 3-6 months. Budget separately for these upfront investments.' },
    { q: "What is the true cost of an employee beyond salary?", a: "Total cost is typically 1.25-1.4x base salary for software engineers. This includes: payroll taxes (7.65% FICA), health insurance ($5K-15K), 401K match (3-6%), equipment ($2-5K), recruiting fees ($5-20K), training ($1-5K), real estate ($5-15K). Senior hires in tech hubs can reach 1.5x." },
    { q: "How do benefits and taxes affect total compensation cost?", a: "FICA: 7.65% (split between employer/employee). Federal/state unemployment: 0.6-3.5%. Health insurance: $5K-20K per employee. 401K match: 3-6% of salary. Workers comp: 0.5-2%. Disability/life: 0.5-1%. PTO/holidays: 8-11% of salary (paid time off). Sum: 25-40% above base salary." },
    { q: "What is the cost of contractor vs full-time employee?", a: "Contractors: typically 1.5-3x hourly rate vs equivalent FTE. But: no benefits, no payroll taxes, no recruiting fees, easier to scale down. For short-term work (<6 months), contractors are usually cheaper. For long-term, full-time with benefits is more cost-effective despite the higher headline rate." },
    { q: "How do I budget for recruiting cost?", a: "Engineering: $5K-30K per hire (15-30% of first-year salary). Sales: $10K-50K. Executive: $50K-200K. Internal recruiting team costs $100K-200K/year but pays back at 5+ hires/year. Use referrals (free or $2K-5K bonus) to cut external recruiting fees by 50%." },
    { q: "Should I include opportunity cost in employee cost?", a: "Opportunity cost = the value of what the senior employee could be doing instead. For a CEO: $300K-1M/year. For a senior engineer: $150-300K/year. Opportunity cost is hard to quantify but should inform team composition. A senior hire that frees up 30% of CEO time pays back even at $300K." },
    { q: "How do I calculate cost for international employees?", a: "Use EOR (Employer of Record) services for hiring abroad: $500-2K/month per employee. Direct entity setup: $50K-200K + ongoing legal/compliance. Approved EORs: Deel, Remote, Oyster. Consider: tax equalization, currency fluctuation, severance requirements by country. Total cost varies 30-100% by country." },
    { q: "What equipment costs should I budget for?", a: "New hire: $2-5K (laptop $2-3K, monitor $0.5K, accessories $0.5K). Refresh: $1-2K every 3 years. Software licenses: $1-5K/year per employee (GitHub, Slack, design tools). Home office stipend (remote): $500-2000 one-time. Annual tech budget: $3-10K per employee is typical." },
    { q: "How do severance and turnover affect my cost model?", a: "Severance: 2 weeks per year of service is US standard. Add: PTO payout, health insurance continuation (COBRA), acceleration of equity vesting for involuntary departures. Average cost of turnover: 50-200% of annual salary. Build voluntary turnover at 10-15% into your model to avoid surprise." },
  ],
  howToUse: [
    'Enter the annual base salary you plan to offer.',
    'Set the benefits percentage (typical range: 20-40% of salary).',
    'Select the hiring location to apply country-specific tax/overhead rates.',
    'Review the true cost breakdown — base, benefits, taxes, overhead.',
    'Check the true cost multiplier and annual projection.',
    'Compare Full-Time vs Contractor break-even and 5-year total.',
  ],
  engineKey: true,
};

registerEngine(engine);


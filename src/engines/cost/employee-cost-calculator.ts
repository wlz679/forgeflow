import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

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

  results.push(
    '💼 Employee Cost Calculator\n\n' +
    '📍 Location: ' + locLabel[location] + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💰 True Cost Breakdown:\n' +
    '• Base Salary:                $' + loc(annualSalary) + '/yr  (' + pct(annualSalary, totalAnnualCost) + ' of total)\n' +
    '• Benefits (' + benefitsPct + '%):          $' + loc(benefitsCost) + '/yr  (' + pct(benefitsCost, totalAnnualCost) + ')\n' +
    '• Employer Tax (' + (taxRate * 100).toFixed(1) + '%):      $' + loc(employerTax) + '/yr  (' + pct(employerTax, totalAnnualCost) + ')\n' +
    '• Overhead (' + (overheadRate * 100).toFixed(0) + '%):           $' + loc(overhead) + '/yr  (' + pct(overhead, totalAnnualCost) + ')\n' +
    '• Total Annual Cost:        $' + loc(totalAnnualCost) + '/yr\n' +
    '• Monthly Cost:                $' + fmt(monthlyCost) + '/mo\n' +
    '• True Cost Multiplier:    ' + trueMultiplier.toFixed(2) + 'x base salary\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Key Metrics:\n' +
    '• Loaded vs Base Ratio:    ' + trueMultiplier.toFixed(2) + 'x  (1.2-1.8x typical)\n' +
    '• First-Year Cost (incl. onboarding):   $' + loc(firstYearCost) + '\n' +
    '• Ongoing Annual Cost:        $' + loc(ongoingCost) + '\n' +
    '• Year-1 Premium:                $' + loc(firstYearCost - ongoingCost) + '  (' + pct(firstYearCost - ongoingCost, ongoingCost) + ' ramp-up)\n' +
    '• Benefits per Hour:           $' + (benefitsCost / 2080).toFixed(2) + '  (over 2,080 work hours/yr)\n' +
    '• Effective Hourly Cost:    $' + (totalAnnualCost / 2080).toFixed(2) + '/hr\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Cost Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (trueMultiplier <= 1.4
      ? '• 🟢 Lean multiplier (' + trueMultiplier.toFixed(2) + 'x) — efficient operation.\n'
      : trueMultiplier <= 1.8
      ? '• 🟢 Standard multiplier (' + trueMultiplier.toFixed(2) + 'x) — typical for full-time staff.\n'
      : trueMultiplier <= 2.2
      ? '• 🟠 High multiplier (' + trueMultiplier.toFixed(2) + 'x) — review overhead/benefits ratio.\n'
      : '• 🔴 Excessive multiplier (' + trueMultiplier.toFixed(2) + 'x) — likely heavy overhead or benefits.\n') +
    (annualSalary >= 150000
      ? '• ⚠️ Senior hire at $' + loc(annualSalary) + '/yr — clear ROI must be established.\n'
      : annualSalary >= 80000
      ? '• 🟢 Mid-level hire at $' + loc(annualSalary) + '/yr — standard team member.\n'
      : '• 🟢 Junior hire at $' + loc(annualSalary) + '/yr — low-risk entry-level role.\n') +
    (benefitsPct >= 30
      ? '• 🟢 Benefits ratio (' + benefitsPct + '%) is competitive.\n'
      : benefitsPct >= 20
      ? '• 🟡 Benefits ratio (' + benefitsPct + '%) is below US average (30-35%).\n'
      : '• 🟠 Benefits ratio (' + benefitsPct + '%) is very low — may hurt retention.\n') +
    '\n🎯 Annual Projection:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Year 1 (with onboarding):    $' + loc(firstYearCost) + '\n' +
    '• Year 2 (full productivity):  $' + loc(ongoingCost) + '  (-' + ((firstYearCost - ongoingCost) / firstYearCost * 100).toFixed(1) + '%)\n' +
    '• Year 3 (with 3% raise):           $' + loc(ongoingCost * 1.03) + '  (+3%)\n' +
    '• Year 5 (with 3%/yr raises):    $' + loc(ongoingCost * Math.pow(1.03, 4)) + '\n' +
    '• 5-Year Total:                            $' + loc(firstYearCost + ongoingCost + ongoingCost * 1.03 + ongoingCost * Math.pow(1.03, 2) + ongoingCost * Math.pow(1.03, 3) + ongoingCost * Math.pow(1.03, 4)) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Full-Time vs Contractor Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (fullTimeBreakEven
      ? '• 🟢 Full-time is cheaper than a contractor at this level. Hire directly.\n'
      : '• 🟡 Contractor cheaper at $' + loc(contractorCost) + '/yr — consider contractor for short-term needs.\n') +
    '• Full-Time Annual Cost:          $' + loc(totalAnnualCost) + '\n' +
    '• Contractor Equivalent:            $' + loc(contractorCost) + '/yr  (no benefits/tax overhead)\n' +
    '• Savings with Full-Time:           $' + loc(contractorCost - totalAnnualCost) + '/yr  (vs contractor)\n' +
    '• Break-Even Point:                  ' + (fullTimeBreakEven ? 'Already crossed' : '~' + Math.ceil((totalAnnualCost - contractorCost) / (annualSalary * 0.05)) + ' months at this salary') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Add 10% performance bonus:   Total → $' + loc(totalAnnualCost * 1.1) + '  (Multiplier ' + (totalAnnualCost * 1.1 / annualSalary).toFixed(2) + 'x)\n' +
    '• Cut benefits to 20%:                Save $' + loc(benefitsCost - annualSalary * 0.20) + '/yr  (Total → $' + loc(annualSalary + annualSalary * 0.20 + employerTax + overhead) + ')\n' +
    '• Increase training budget ($5K):  Total → $' + loc(totalAnnualCost + 5000) + '  (better retention)\n' +
    '• Hire in Asia instead:                 ~$' + loc(annualSalary * 0.4) + '/yr  (40% of US cost)\n' +
    '• Remote (anywhere):                         ~$' + loc(annualSalary * 0.7) + '/yr  (saves office overhead)\n\n' +
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
      'Comparison: $' + loc(s) + ' salary → Total $' + loc(tac) + '/yr ($' + fmt(tac / 12) + '/mo) | Multiplier ' + (tac / s).toFixed(2) + 'x',
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
  `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let f=function(a){return Number.isNaN(a)?0:Math.max(0,a)},g=function(a){const t=f(parseFloat(a.annualSalary)||0),i=f(parseFloat(a.benefitsPercentage)||0),c=a.location||"us",w={us:.0765,uk:.138,europe:.2,asia:.12,remote:.1},M={us:.25,uk:.2,europe:.22,asia:.15,remote:.1},v=w[c]||.0765,x=M[c]||.25,d=t*(i/100),p=t*v,h=t*x,n=t+d+p+h,k=n/12,o=t>0?n/t:0,u=n*1.15,A=o<=1.4?JSON.stringify({code:"employee_cost_lean",params:{multiplier:o.toFixed(1)}}):o<=1.8?JSON.stringify({code:"employee_cost_standard",params:{multiplier:o.toFixed(1)}}):o<=2.2?JSON.stringify({code:"employee_cost_high",params:{multiplier:o.toFixed(1)}}):JSON.stringify({code:"employee_cost_excessive",params:{multiplier:o.toFixed(1)}}),r=n,m=t*1.05,b=m>n,S=s=>s.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}),e=s=>Math.round(s).toLocaleString(),y=(s,l)=>l>0?(s/l*100).toFixed(1)+"%":"0%",B={us:"United States",uk:"United Kingdom",europe:"Europe (EU avg)",asia:"Asia (regional avg)",remote:"Global Remote"},$=[];$.push(\`💼 Employee Cost Calculator

📍 Location: \`+B[c]+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 True Cost Breakdown:
• Base Salary:                $\`+e(t)+"/yr  ("+y(t,n)+\` of total)
• Benefits (\`+i+"%):          $"+e(d)+"/yr  ("+y(d,n)+\`)
• Employer Tax (\`+(v*100).toFixed(1)+"%):      $"+e(p)+"/yr  ("+y(p,n)+\`)
• Overhead (\`+(x*100).toFixed(0)+"%):           $"+e(h)+"/yr  ("+y(h,n)+\`)
• Total Annual Cost:        $\`+e(n)+\`/yr
• Monthly Cost:                $\`+S(k)+\`/mo
• True Cost Multiplier:    \`+o.toFixed(2)+\`x base salary

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 Key Metrics:
• Loaded vs Base Ratio:    \`+o.toFixed(2)+\`x  (1.2-1.8x typical)
• First-Year Cost (incl. onboarding):   $\`+e(u)+\`
• Ongoing Annual Cost:        $\`+e(r)+\`
• Year-1 Premium:                $\`+e(u-r)+"  ("+y(u-r,r)+\` ramp-up)
• Benefits per Hour:           $\`+(d/2080).toFixed(2)+\`  (over 2,080 work hours/yr)
• Effective Hourly Cost:    $\`+(n/2080).toFixed(2)+\`/hr

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🩺 Cost Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(o<=1.4?"• 🟢 Lean multiplier ("+o.toFixed(2)+\`x) — efficient operation.
\`:o<=1.8?"• 🟢 Standard multiplier ("+o.toFixed(2)+\`x) — typical for full-time staff.
\`:o<=2.2?"• 🟠 High multiplier ("+o.toFixed(2)+\`x) — review overhead/benefits ratio.
\`:"• 🔴 Excessive multiplier ("+o.toFixed(2)+\`x) — likely heavy overhead or benefits.
\`)+(t>=15e4?"• ⚠️ Senior hire at $"+e(t)+\`/yr — clear ROI must be established.
\`:t>=8e4?"• 🟢 Mid-level hire at $"+e(t)+\`/yr — standard team member.
\`:"• 🟢 Junior hire at $"+e(t)+\`/yr — low-risk entry-level role.
\`)+(i>=30?"• 🟢 Benefits ratio ("+i+\`%) is competitive.
\`:i>=20?"• 🟡 Benefits ratio ("+i+\`%) is below US average (30-35%).
\`:"• 🟠 Benefits ratio ("+i+\`%) is very low — may hurt retention.
\`)+\`
🎯 Annual Projection:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Year 1 (with onboarding):    $\`+e(u)+\`
• Year 2 (full productivity):  $\`+e(r)+"  (-"+((u-r)/u*100).toFixed(1)+\`%)
• Year 3 (with 3% raise):           $\`+e(r*1.03)+\`  (+3%)
• Year 5 (with 3%/yr raises):    $\`+e(r*Math.pow(1.03,4))+\`
• 5-Year Total:                            $\`+e(u+r+r*1.03+r*Math.pow(1.03,2)+r*Math.pow(1.03,3)+r*Math.pow(1.03,4))+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ Full-Time vs Contractor Break-Even:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(b?\`• 🟢 Full-time is cheaper than a contractor at this level. Hire directly.
\`:"• 🟡 Contractor cheaper at $"+e(m)+\`/yr — consider contractor for short-term needs.
\`)+"• Full-Time Annual Cost:          $"+e(n)+\`
• Contractor Equivalent:            $\`+e(m)+\`/yr  (no benefits/tax overhead)
• Savings with Full-Time:           $\`+e(m-n)+\`/yr  (vs contractor)
• Break-Even Point:                  \`+(b?"Already crossed":"~"+Math.ceil((n-m)/(t*.05))+" months at this salary")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If Scenarios:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Add 10% performance bonus:   Total → $\`+e(n*1.1)+"  (Multiplier "+(n*1.1/t).toFixed(2)+\`x)
• Cut benefits to 20%:                Save $\`+e(d-t*.2)+"/yr  (Total → $"+e(t+t*.2+p+h)+\`)
• Increase training budget ($5K):  Total → $\`+e(n+5e3)+\`  (better retention)
• Hire in Asia instead:                 ~$\`+e(t*.4)+\`/yr  (40% of US cost)
• Remote (anywhere):                         ~$\`+e(t*.7)+\`/yr  (saves office overhead)

💡 Tip: \`+A);const _=[4e4,6e4,8e4,12e4,18e4];for(let s=0;s<_.length;s++){const l=_[s],E=l*(i/100),N=l*v,R=l*x,F=l+E+N+R;$.push("Comparison: $"+e(l)+" salary → Total $"+e(F)+"/yr ($"+S(F/12)+"/mo) | Multiplier "+(F/l).toFixed(2)+"x")}return $},C=function(a,t,i){var c=T(a);return Array.isArray(c)?c.join(\`
\`):String(c)};var Y=f,O=g,H=C,T=function(a){return g(a)};return[C(inputs,pick,fill)]}finally{}
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
    '💼 Employee Cost Calculator\n\n📍 Location: United States\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💰 True Cost Breakdown:\n• Base Salary:                $80,000/yr  (61.5% of total)\n• Benefits (30%):          $24,000/yr  (18.4%)\n• Employer Tax (7.6%):      $6,120/yr  (4.7%)\n• Overhead (25%):           $20,000/yr  (15.4%)\n• Total Annual Cost:        $130,120/yr\n• Monthly Cost:                $10,843.33/mo\n• True Cost Multiplier:    1.63x base salary\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Key Metrics:\n• Loaded vs Base Ratio:    1.63x  (1.2-1.8x typical)\n• First-Year Cost (incl. onboarding):   $149,638\n• Ongoing Annual Cost:        $130,120\n• Year-1 Premium:                $19,518  (15.0% ramp-up)\n• Benefits per Hour:           $11.54  (over 2,080 work hours/yr)\n• Effective Hourly Cost:    $62.56/hr\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Cost Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 Standard multiplier (1.63x) — typical for full-time staff.\n• 🟢 Mid-level hire at $80,000/yr — standard team member.\n• 🟢 Benefits ratio (30%) is competitive.\n\n🎯 Annual Projection:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Year 1 (with onboarding):    $149,638\n• Year 2 (full productivity):  $130,120  (-13.0%)\n• Year 3 (with 3% raise):           $134,024  (+3%)\n• Year 5 (with 3%/yr raises):    $146,451\n• 5-Year Total:                            $840,463\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Full-Time vs Contractor Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 Contractor cheaper at $84,000/yr — consider contractor for short-term needs.\n• Full-Time Annual Cost:          $130,120\n• Contractor Equivalent:            $84,000/yr  (no benefits/tax overhead)\n• Savings with Full-Time:           $-46,120/yr  (vs contractor)\n• Break-Even Point:                  ~12 months at this salary\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Add 10% performance bonus:   Total → $143,132  (Multiplier 1.79x)\n• Cut benefits to 20%:                Save $8,000/yr  (Total → $122,120)\n• Increase training budget ($5K):  Total → $135,120  (better retention)\n• Hire in Asia instead:                 ~$32,000/yr  (40% of US cost)\n• Remote (anywhere):                         ~$56,000/yr  (saves office overhead)\n\n💡 Tip: {"code":"employee_cost_standard","params":{"multiplier":"1.6"}}\nComparison: $40,000 salary → Total $65,060/yr ($5,421.67/mo) | Multiplier 1.63x\nComparison: $60,000 salary → Total $97,590/yr ($8,132.50/mo) | Multiplier 1.63x\nComparison: $80,000 salary → Total $130,120/yr ($10,843.33/mo) | Multiplier 1.63x\nComparison: $120,000 salary → Total $195,180/yr ($16,265.00/mo) | Multiplier 1.63x\nComparison: $180,000 salary → Total $292,770/yr ($24,397.50/mo) | Multiplier 1.63x',
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


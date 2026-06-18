import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateEmployeeCost(inputs: Record<string, string>): string[] {
  const annualSalary = parseFloat(inputs.annualSalary) || 0;
  const benefitsPct = parseFloat(inputs.benefitsPercentage) || 0;
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
    '💡 Tip: Budget rule of thumb: total employee cost = base salary × ' + trueMultiplier.toFixed(1) + ' for this role. Round up to 1.7x when planning headcount budgets to absorb benefits, taxes, onboarding, and the productivity ramp.',
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

  return results;
}

const customFn =
  "var sal=parseFloat(inputs.annualSalary)||0;" +
  "var bp=parseFloat(inputs.benefitsPercentage)||0;" +
  "var loc1=inputs.location||'us';" +
  "var tr={us:0.0765,uk:0.138,europe:0.20,asia:0.12,remote:0.10};" +
  "var or={us:0.25,uk:0.20,europe:0.22,asia:0.15,remote:0.10};" +
  "var txR=tr[loc1]||0.0765;" +
  "var ohR=or[loc1]||0.25;" +
  "var bc=sal*(bp/100);" +
  "var et=sal*txR;" +
  "var oh=sal*ohR;" +
  "var tac=sal+bc+et+oh;" +
  "var mc=tac/12;" +
  "var tm=sal>0?tac/sal:0;" +
  "var fyc=tac*1.15;" +
  "var con=sal*1.05;" +
  "var ftbe=con>tac;" +
  "function fmt(n){return n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}" +
  "function loc(n){return Math.round(n).toLocaleString()}" +
  "function pct(v,t){return t>0?((v/t)*100).toFixed(1)+'%':'0%'}" +
  "var ll={us:'United States',uk:'United Kingdom',europe:'Europe (EU avg)',asia:'Asia (regional avg)',remote:'Global Remote'};" +
  "var r='';" +
  "r+='\\uD83D\\uDCBC Employee Cost Calculator\\n\\n';" +
  "r+='\\uD83D\\uDCCD Location: '+ll[loc1]+'\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCB0 True Cost Breakdown:\\n';" +
  "r+='\\u2022 Base Salary:                $'+loc(sal)+'/yr  ('+pct(sal,tac)+' of total)\\n';" +
  "r+='\\u2022 Benefits ('+bp+'%):          $'+loc(bc)+'/yr  ('+pct(bc,tac)+')\\n';" +
  "r+='\\u2022 Employer Tax ('+(txR*100).toFixed(1)+'%):      $'+loc(et)+'/yr  ('+pct(et,tac)+')\\n';" +
  "r+='\\u2022 Overhead ('+(ohR*100).toFixed(0)+'%):           $'+loc(oh)+'/yr  ('+pct(oh,tac)+')\\n';" +
  "r+='\\u2022 Total Annual Cost:        $'+loc(tac)+'/yr\\n';" +
  "r+='\\u2022 Monthly Cost:                $'+fmt(mc)+'/mo\\n';" +
  "r+='\\u2022 True Cost Multiplier:    '+tm.toFixed(2)+'x base salary\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCD0 Key Metrics:\\n';" +
  "r+='\\u2022 Loaded vs Base Ratio:    '+tm.toFixed(2)+'x  (1.2-1.8x typical)\\n';" +
  "r+='\\u2022 First-Year Cost (incl. onboarding):   $'+loc(fyc)+'\\n';" +
  "r+='\\u2022 Ongoing Annual Cost:        $'+loc(tac)+'\\n';" +
  "r+='\\u2022 Year-1 Premium:                $'+loc(fyc-tac)+'  ('+pct(fyc-tac,tac)+' ramp-up)\\n';" +
  "r+='\\u2022 Benefits per Hour:           $'+(bc/2080).toFixed(2)+'  (over 2,080 work hours/yr)\\n';" +
  "r+='\\u2022 Effective Hourly Cost:    $'+(tac/2080).toFixed(2)+'/hr\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83E\\uDE7A Cost Health:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "if(tm<=1.4)r+='\\u2022 \\uD83D\\uDFE2 Lean multiplier ('+tm.toFixed(2)+'x) \\u2014 efficient operation.\\n';" +
  "else if(tm<=1.8)r+='\\u2022 \\uD83D\\uDFE2 Standard multiplier ('+tm.toFixed(2)+'x) \\u2014 typical for full-time staff.\\n';" +
  "else if(tm<=2.2)r+='\\u2022 \\uD83D\\uDFE0 High multiplier ('+tm.toFixed(2)+'x) \\u2014 review overhead/benefits ratio.\\n';" +
  "else r+='\\u2022 \\uD83D\\uDD34 Excessive multiplier ('+tm.toFixed(2)+'x) \\u2014 likely heavy overhead or benefits.\\n';" +
  "if(sal>=150000)r+='\\u2022 \\u26A0\\uFE0F Senior hire at $'+loc(sal)+'/yr \\u2014 clear ROI must be established.\\n';" +
  "else if(sal>=80000)r+='\\u2022 \\uD83D\\uDFE2 Mid-level hire at $'+loc(sal)+'/yr \\u2014 standard team member.\\n';" +
  "else r+='\\u2022 \\uD83D\\uDFE2 Junior hire at $'+loc(sal)+'/yr \\u2014 low-risk entry-level role.\\n';" +
  "if(bp>=30)r+='\\u2022 \\uD83D\\uDFE2 Benefits ratio ('+bp+'%) is competitive.\\n';" +
  "else if(bp>=20)r+='\\u2022 \\uD83D\\uDFE1 Benefits ratio ('+bp+'%) is below US average (30-35%).\\n';" +
  "else r+='\\u2022 \\uD83D\\uDFE0 Benefits ratio ('+bp+'%) is very low \\u2014 may hurt retention.\\n';" +
  "r+='\\n\\uD83C\\uDFAF Annual Projection:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Year 1 (with onboarding):    $'+loc(fyc)+'\\n';" +
  "r+='\\u2022 Year 2 (full productivity):  $'+loc(tac)+'  (-'+((fyc-tac)/fyc*100).toFixed(1)+'%)\\n';" +
  "r+='\\u2022 Year 3 (with 3% raise):           $'+loc(tac*1.03)+'  (+3%)\\n';" +
  "r+='\\u2022 Year 5 (with 3%/yr raises):    $'+loc(tac*Math.pow(1.03,4))+'\\n';" +
  "r+='\\u2022 5-Year Total:                            $'+loc(fyc+tac+tac*1.03+tac*Math.pow(1.03,2)+tac*Math.pow(1.03,3)+tac*Math.pow(1.03,4))+'\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\u2696\\uFE0F Full-Time vs Contractor Break-Even:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "if(ftbe)r+='\\u2022 \\uD83D\\uDFE2 Full-time is cheaper than a contractor at this level. Hire directly.\\n';" +
  "else r+='\\u2022 \\uD83D\\uDFE1 Contractor cheaper at $'+loc(con)+'/yr \\u2014 consider contractor for short-term needs.\\n';" +
  "r+='\\u2022 Full-Time Annual Cost:          $'+loc(tac)+'\\n';" +
  "r+='\\u2022 Contractor Equivalent:            $'+loc(con)+'/yr  (no benefits/tax overhead)\\n';" +
  "r+='\\u2022 Savings with Full-Time:           $'+loc(con-tac)+'/yr  (vs contractor)\\n';" +
  "r+='\\u2022 Break-Even Point:                  '+(ftbe?'Already crossed':'~'+Math.ceil((tac-con)/(sal*0.05))+' months at this salary')+'\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Add 10% performance bonus:   Total \\u2192 $'+loc(tac*1.1)+'  (Multiplier '+(tac*1.1/sal).toFixed(2)+'x)\\n';" +
  "r+='\\u2022 Cut benefits to 20%:                Save $'+loc(bc-sal*0.20)+'/yr  (Total \\u2192 $'+loc(sal+sal*0.20+et+oh)+')\\n';" +
  "r+='\\u2022 Increase training budget ($5K):  Total \\u2192 $'+loc(tac+5000)+'  (better retention)\\n';" +
  "r+='\\u2022 Hire in Asia instead:                 ~$'+loc(sal*0.4)+'/yr  (40% of US cost)\\n';" +
  "r+='\\u2022 Remote (anywhere):                         ~$'+loc(sal*0.7)+'/yr  (saves office overhead)\\n\\n';" +
  "r+='\\uD83D\\uDCA1 Tip: Budget rule of thumb: total employee cost = base salary \\u00d7 '+tm.toFixed(1)+' for this role. Round up to 1.7x when planning headcount budgets to absorb benefits, taxes, onboarding, and the productivity ramp.';" +
  "var results=[r];" +
  "var salaries=[40000,60000,80000,120000,180000];" +
  "for(var i=0;i<salaries.length;i++){" +
  "var s=salaries[i];" +
  "var b=s*(bp/100);" +
  "var e=s*txR;" +
  "var o=s*ohR;" +
  "var t=s+b+e+o;" +
  "results.push('Comparison: $'+loc(s)+' salary \\u2192 Total $'+loc(t)+'/yr ($'+fmt(t/12)+'/mo) | Multiplier '+(t/s).toFixed(2)+'x');" +
  "}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-employee-cost-calculator',
  title: 'Employee Cost Calculator',
  description: 'Calculate the true loaded cost of hiring — base salary, benefits, employer taxes, overhead — with break-even vs contractor and 5-year projections.',
  category: 'D',
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
  generate(inputs: Record<string, string>): string[] {
    return calculateEmployeeCost(inputs);
  },
  staticExamples: [
    '💼 Employee Cost Calculator\n\n📍 Location: United States\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💰 True Cost Breakdown:\n• Base Salary:                $80,000/yr  (61.5% of total)\n• Benefits (30%):          $24,000/yr  (18.4%)\n• Employer Tax (7.6%):      $6,120/yr  (4.7%)\n• Overhead (25%):           $20,000/yr  (15.4%)\n• Total Annual Cost:        $130,120/yr\n• Monthly Cost:                $10,843.33/mo\n• True Cost Multiplier:    1.63x base salary\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Key Metrics:\n• Loaded vs Base Ratio:    1.63x  (1.2-1.8x typical)\n• First-Year Cost (incl. onboarding):   $149,638\n• Ongoing Annual Cost:        $130,120\n• Year-1 Premium:                $19,518  (15.0% ramp-up)\n• Benefits per Hour:           $11.54  (over 2,080 work hours/yr)\n• Effective Hourly Cost:    $62.56/hr\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Cost Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 Standard multiplier (1.63x) — typical for full-time staff.\n• 🟢 Mid-level hire at $80,000/yr — standard team member.\n• 🟢 Benefits ratio (30%) is competitive.\n\n🎯 Annual Projection:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Year 1 (with onboarding):    $149,638\n• Year 2 (full productivity):  $130,120  (-13.0%)\n• Year 3 (with 3% raise):           $134,024  (+3%)\n• Year 5 (with 3%/yr raises):    $146,451\n• 5-Year Total:                            $840,463\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Full-Time vs Contractor Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 Contractor cheaper at $84,000/yr — consider contractor for short-term needs.\n• Full-Time Annual Cost:          $130,120\n• Contractor Equivalent:            $84,000/yr  (no benefits/tax overhead)\n• Savings with Full-Time:           $-46,120/yr  (vs contractor)\n• Break-Even Point:                  ~12 months at this salary\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Add 10% performance bonus:   Total → $143,132  (Multiplier 1.79x)\n• Cut benefits to 20%:                Save $8,000/yr  (Total → $122,120)\n• Increase training budget ($5K):  Total → $135,120  (better retention)\n• Hire in Asia instead:                 ~$32,000/yr  (40% of US cost)\n• Remote (anywhere):                         ~$56,000/yr  (saves office overhead)\n\n💡 Tip: Budget rule of thumb: total employee cost = base salary × 1.6 for this role. Round up to 1.7x when planning headcount budgets to absorb benefits, taxes, onboarding, and the productivity ramp.\nComparison: $40,000 salary → Total $65,060/yr ($5,421.67/mo) | Multiplier 1.63x\nComparison: $60,000 salary → Total $97,590/yr ($8,132.50/mo) | Multiplier 1.63x\nComparison: $80,000 salary → Total $130,120/yr ($10,843.33/mo) | Multiplier 1.63x\nComparison: $120,000 salary → Total $195,180/yr ($16,265.00/mo) | Multiplier 1.63x\nComparison: $180,000 salary → Total $292,770/yr ($24,397.50/mo) | Multiplier 1.63x',
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
  ],
  howToUse: [
    'Enter the annual base salary you plan to offer.',
    'Set the benefits percentage (typical range: 20-40% of salary).',
    'Select the hiring location to apply country-specific tax/overhead rates.',
    'Review the true cost breakdown — base, benefits, taxes, overhead.',
    'Check the true cost multiplier and annual projection.',
    'Compare Full-Time vs Contractor break-even and 5-year total.',
  ],
};

registerEngine(engine);

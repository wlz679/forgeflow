import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-13：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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

/**
 * 利率健康度的**档位键**（P168 B3-13：每档一个 code 字面量 ⇒ zh 页能整行中文）。
 */
export type RateHealthBand = 'strong' | 'average' | 'low' | 'below_inflation';

export function rateHealth(rate: number): { emoji: string; label: string; band: RateHealthBand } {
  if (rate >= 7) return { emoji: '🟢', label: 'strong (S&P 500 historical)', band: 'strong' };
  if (rate >= 4) return { emoji: '🟡', label: 'average (HYSA / CDs)', band: 'average' };
  if (rate >= 1) return { emoji: '🟠', label: 'low (basic savings account)', band: 'low' };
  return { emoji: '🔴', label: 'below inflation — consider alternatives', band: 'below_inflation' };
}

// ============== calculate() — full 9-section output (v3 standard) ==============

function calculateCompoundInterest(inputs: Record<string, string>): string[] {
  const principal = clampNonNegative(parseFloat(inputs.principal) || 0);
  const monthlyContribution = clampNonNegative(parseFloat(inputs.monthlyContribution) || 0);
  const annualRate = clampNonNegative(parseFloat(inputs.annualRate) || 0);
  const compoundFrequency = (inputs.compoundFrequency === 'annually' ? 'annually' : 'monthly') as CompoundFrequency;
  const years = Math.min(50, clampNonNegative(parseFloat(inputs.years) || 0));

  const fv = futureValue(principal, monthlyContribution, annualRate, compoundFrequency, years);
  const simpleFv = simpleFinalValue(principal, monthlyContribution, annualRate, years);
  const totalContrib = principal + monthlyContribution * 12 * years;
  const totalInterest = fv - totalContrib;
  const multiplier = totalContrib > 0 ? fv / totalContrib : 0;
  const health = rateHealth(annualRate);
  const compoundAdvantage = fv - simpleFv;

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const money = (n: number) => '$' + fmt(n);
  const ratio = (a: number, b: number) => (b > 0 ? ((a / b) * 100).toFixed(1) + '%' : '0.0%');

  // Milestone growth (5y, 10y, 15y, 20y, final — dedup + sort)
  const milestoneYears = [5, 10, 15, 20, years].filter((y, i, arr) => arr.indexOf(y) === i).sort((a, b) => a - b);
  let milestoneSection = '';
  for (const y of milestoneYears) {
    const fvY = futureValue(principal, monthlyContribution, annualRate, compoundFrequency, y);
    const contribY = principal + monthlyContribution * 12 * y;
    const interestY = fvY - contribY;
    const filled = fvY > 0 ? Math.min(20, Math.round((interestY / fvY) * 20)) : 0;
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
    milestoneSection += makeToken('calc_out.compound_interest.row.milestone_year', '• Year ' + y + ': ' + money(fvY) + '  (contributed ' + money(contribY) + ' / interest ' + money(interestY) + ')', { year: String(y), fv: money(fvY), contributed: money(contribY), interest: money(interestY) }) + '\n';
    milestoneSection += '  ' + bar + ' ' + ratio(interestY, fvY) + ' from compounding\n';
  }

  // Time-to-goal milestones
  const goalTargets = [100000, 500000, 1000000];
  let goalSection = '';
  for (const target of goalTargets) {
    const y = yearsToTarget(target, principal, monthlyContribution, annualRate, compoundFrequency);
    const yearsOut = Math.round(y);
    goalSection += (y === Infinity
      ? makeToken('calc_out.compound_interest.row.goal_never', '• ' + money(target) + ': never (within 50 yrs at current pace — try higher rate or contribution)', { target: money(target) })
      : y <= years
        ? makeToken('calc_out.compound_interest.row.goal_already', '• ' + money(target) + ': already reached (year ' + y + ')', { target: money(target), year: String(y) })
        : makeToken('calc_out.compound_interest.row.goal_years', '• ' + money(target) + ': ' + yearsOut + ' years from now (year ' + yearsOut + ')', { target: money(target), years: String(yearsOut) })) + '\n';
  }

  // Tip selection based on inputs（P168 B3-13：每分支一个 code 字面量；默认档还要按利率档再拆 ⇒ 档位描述写进兜底）
  let tip: string;
  if (years >= 30) {
    tip = makeToken('calc_out.compound_interest.row.tip_long_horizon', '💡 Tip: Time in the market beats timing the market. $' + fmt(monthlyContribution) + '/mo for ' + years + ' years at ' + annualRate + '% builds ' + money(fv) + '. Starting 10 years earlier typically doubles the final balance.', { contrib: fmt(monthlyContribution), years: String(years), rate: String(annualRate), final: money(fv) });
  } else if (principal === 0 && monthlyContribution > 0) {
    tip = makeToken('calc_out.compound_interest.row.tip_from_zero', '💡 Tip: Starting from $0 is fine — the habit of consistent contributions matters more than the seed amount. $' + fmt(monthlyContribution) + '/mo for ' + years + ' years builds ' + money(fv) + '.', { contrib: fmt(monthlyContribution), years: String(years), final: money(fv) });
  } else if (annualRate < 1) {
    tip = makeToken('calc_out.compound_interest.row.tip_below_inflation', '💡 Tip: At ' + annualRate + '% you are likely below inflation (~3%). Consider HYSA, I-bonds, or index funds to keep pace with rising costs.', { rate: String(annualRate) });
  } else if (health.band === 'strong') {
    tip = makeToken('calc_out.compound_interest.row.tip_default_strong', '💡 Tip: Compounding multiplies money over time. Reinvest all interest — withdrawal breaks the chain. The ' + annualRate + '% rate you selected (strong (S&P 500 historical)) compounds most effectively over ' + years + '+ years.', { rate: String(annualRate), years: String(years) });
  } else if (health.band === 'average') {
    tip = makeToken('calc_out.compound_interest.row.tip_default_average', '💡 Tip: Compounding multiplies money over time. Reinvest all interest — withdrawal breaks the chain. The ' + annualRate + '% rate you selected (average (HYSA / CDs)) compounds most effectively over ' + years + '+ years.', { rate: String(annualRate), years: String(years) });
  } else if (health.band === 'low') {
    tip = makeToken('calc_out.compound_interest.row.tip_default_low', '💡 Tip: Compounding multiplies money over time. Reinvest all interest — withdrawal breaks the chain. The ' + annualRate + '% rate you selected (low (basic savings account)) compounds most effectively over ' + years + '+ years.', { rate: String(annualRate), years: String(years) });
  } else {
    tip = makeToken('calc_out.compound_interest.row.tip_default_below_inflation', '💡 Tip: Compounding multiplies money over time. Reinvest all interest — withdrawal breaks the chain. The ' + annualRate + '% rate you selected (below inflation — consider alternatives) compounds most effectively over ' + years + '+ years.', { rate: String(annualRate), years: String(years) });
  }

  const r =
    '⏰ Compound Interest Calculator\n\n' +
    '💰 Growth Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Principal:                ' + money(principal) + '\n' +
    '• Total Contributions:      ' + money(monthlyContribution * 12 * years) + '  ($' + fmt(monthlyContribution) + '/mo × 12 × ' + years + ')\n' +
    makeToken('calc_out.compound_interest.row.total_interest', '• Total Interest Earned:    ' + money(totalInterest), { interest: money(totalInterest) }) + '\n' +
    '• Final Balance:            ' + money(fv) + '\n' +
    makeToken('calc_out.compound_interest.row.multiplier', '• Multiplier:               ' + multiplier.toFixed(2) + 'x growth on contributions', { mult: multiplier.toFixed(2) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Milestone Growth:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    milestoneSection + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Compounding Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (health.band === 'strong'
      ? makeToken('calc_out.compound_interest.row.health_rate_strong', '• 🟢 Rate ' + annualRate + '% is strong (S&P 500 historical)', { rate: String(annualRate) })
      : health.band === 'average'
        ? makeToken('calc_out.compound_interest.row.health_rate_average', '• 🟡 Rate ' + annualRate + '% is average (HYSA / CDs)', { rate: String(annualRate) })
        : health.band === 'low'
          ? makeToken('calc_out.compound_interest.row.health_rate_low', '• 🟠 Rate ' + annualRate + '% is low (basic savings account)', { rate: String(annualRate) })
          : makeToken('calc_out.compound_interest.row.health_rate_below_inflation', '• 🔴 Rate ' + annualRate + '% is below inflation — consider alternatives', { rate: String(annualRate) })) + '\n' +
    (compoundFrequency === 'monthly'
      ? makeToken('calc_out.compound_interest.row.health_compounding_monthly', '• 🟢 Monthly compounding — APY boost over annual is ~' + ((Math.pow(1 + annualRate / 100 / 12, 12) - 1) * 100).toFixed(3) + '%', { apy: ((Math.pow(1 + annualRate / 100 / 12, 12) - 1) * 100).toFixed(3) }) + '\n'
      : makeToken('calc_out.compound_interest.row.health_compounding_annual', '• 🟡 Annual compounding — switching to monthly adds ~' + ((Math.pow(1 + annualRate / 100 / 12, 12) - 1) * 100 - annualRate).toFixed(3) + '% APY', { apy: ((Math.pow(1 + annualRate / 100 / 12, 12) - 1) * 100 - annualRate).toFixed(3) }) + '\n') +
    makeToken('calc_out.compound_interest.row.health_contribution_ratio', '• Contribution ratio:       ' + ratio(totalContrib, fv) + ' of final balance from contributions', { pct: ratio(totalContrib, fv) }) + '\n' +
    makeToken('calc_out.compound_interest.row.health_interest_ratio', '• Interest ratio:           ' + ratio(totalInterest, fv) + ' of final balance from compounding', { pct: ratio(totalInterest, fv) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Time-to-Goal Milestones:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    goalSection + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.compound_interest.row.section_break_even', '⚖️ Compound vs Simple Break-Even:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.compound_interest.row.breakeven_simple_final', '• Simple Interest Final:    ' + money(simpleFv), { value: money(simpleFv) }) + '\n' +
    makeToken('calc_out.compound_interest.row.breakeven_compound_final', '• Compound Interest Final:  ' + money(fv), { value: money(fv) }) + '\n' +
    makeToken('calc_out.compound_interest.row.breakeven_advantage', '• Compound Advantage:       ' + money(compoundAdvantage) + '  (' + ratio(compoundAdvantage, simpleFv) + ' extra)', { advantage: money(compoundAdvantage), pct: ratio(compoundAdvantage, simpleFv) }) + '\n' +
    makeToken('calc_out.compound_interest.row.breakeven_rule', '• Rule: Compound interest = interest on interest. Time is the multiplier.') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.compound_interest.row.whatif_add_100mo', '• Add $100/mo extra:               ' + money(futureValue(principal, monthlyContribution + 100, annualRate, compoundFrequency, years) - fv) + ' more at final', { extra: money(futureValue(principal, monthlyContribution + 100, annualRate, compoundFrequency, years) - fv) }) + '\n' +
    makeToken('calc_out.compound_interest.row.whatif_rate_plus_1', '• Increase rate by 1%:             ' + money(futureValue(principal, monthlyContribution, annualRate + 1, compoundFrequency, years) - fv) + ' more at final', { extra: money(futureValue(principal, monthlyContribution, annualRate + 1, compoundFrequency, years) - fv) }) + '\n' +
    makeToken('calc_out.compound_interest.row.whatif_extend_5y', '• Extend period by 5 years:        ' + money(futureValue(principal, monthlyContribution, annualRate, compoundFrequency, years + 5) - fv) + ' more at final', { extra: money(futureValue(principal, monthlyContribution, annualRate, compoundFrequency, years + 5) - fv) }) + '\n' +
    (compoundFrequency === 'annually'
      ? makeToken('calc_out.compound_interest.row.whatif_switch_monthly', '• Switch to monthly compounding:  ' + money(futureValue(principal, monthlyContribution, annualRate, 'monthly', years) - fv) + ' more at final', { extra: money(futureValue(principal, monthlyContribution, annualRate, 'monthly', years) - fv) }) + '\n'
      : makeToken('calc_out.compound_interest.row.whatif_switch_annual', '• Switch to annual compounding:   ' + money(fv - futureValue(principal, monthlyContribution, annualRate, 'annually', years)) + ' less at final', { loss: money(fv - futureValue(principal, monthlyContribution, annualRate, 'annually', years)) }) + '\n') +
    makeToken('calc_out.compound_interest.row.whatif_delay_1y', '• Delay start by 1 year:           ' + money(fv - futureValue(principal, monthlyContribution, annualRate, compoundFrequency, years - 1)) + ' lost (cost of procrastination)', { lost: money(fv - futureValue(principal, monthlyContribution, annualRate, compoundFrequency, years - 1)) }) + '\n\n' +
    tip;

  const results: string[] = [r];

  // Comparison rows (SEO long-tail) — vary rate
  const rates = [2, 4, 7, 10, 15];
  for (const r2 of rates) {
    const fvR = futureValue(principal, monthlyContribution, r2, compoundFrequency, years);
    const intR = fvR - totalContrib;
    results.push(makeToken('calc_out.compound_interest.row.comparison_row', 'Comparison: ' + r2 + '% rate for ' + years + ' years → ' + money(fvR) + ' (interest ' + money(intR) + ')', { rate: String(r2), years: String(years), fv: money(fvR), interest: money(intR) }));
  }

  return results;
}

// ============== customFn — minified JS string, runs in browser via new Function ==============

const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let b=function(c){return Number.isNaN(c)?0:Math.max(0,c)},_=function(c,i,e,t,l){if(e===0||l===0)return c+i*12*l;const n=e/100;if(t==="monthly"){const p=n/12,g=l*12,v=c*Math.pow(1+p,g),f=i*((Math.pow(1+p,g)-1)/p);return v+f}const a=c*Math.pow(1+n,l),h=i*12*((Math.pow(1+n,l)-1)/n);return a+h},x=function(c,i,e,t){const l=i*12*t;return c*(1+e/100*t)+l},M=function(c,i,e,t,l){if(_(i,e,t,l,50)<c)return 1/0;for(let n=.5;n<=50;n+=.5)if(_(i,e,t,l,n)>=c)return n;return 1/0},A=function(c){return c>=7?{emoji:"🟢",label:"strong (S&P 500 historical)",band:"strong"}:c>=4?{emoji:"🟡",label:"average (HYSA / CDs)",band:"average"}:c>=1?{emoji:"🟠",label:"low (basic savings account)",band:"low"}:{emoji:"🔴",label:"below inflation — consider alternatives",band:"below_inflation"}},I=function(c){const i=b(parseFloat(c.principal)||0),e=b(parseFloat(c.monthlyContribution)||0),t=b(parseFloat(c.annualRate)||0),l=c.compoundFrequency==="annually"?"annually":"monthly",n=Math.min(50,b(parseFloat(c.years)||0)),a=_(i,e,t,l,n),h=x(i,e,t,n),p=i+e*12*n,g=a-p,v=p>0?a/p:0,f=A(t),S=a-h,y=s=>s.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0}),o=s=>"$"+y(s),w=(s,u)=>u>0?(s/u*100).toFixed(1)+"%":"0.0%",q=[5,10,15,20,n].filter((s,u,d)=>d.indexOf(s)===u).sort((s,u)=>s-u);let C="";for(const s of q){const u=_(i,e,t,l,s),d=i+e*12*s,F=u-d,P=u>0?Math.min(20,Math.round(F/u*20)):0,N="█".repeat(P)+"░".repeat(20-P);C+=r("calc_out.compound_interest.row.milestone_year","• Year "+s+": "+o(u)+"  (contributed "+o(d)+" / interest "+o(F)+")",{year:String(s),fv:o(u),contributed:o(d),interest:o(F)})+\`
\`,C+="  "+N+" "+w(F,u)+\` from compounding
\`}const E=[1e5,5e5,1e6];let Y="";for(const s of E){const u=M(s,i,e,t,l),d=Math.round(u);Y+=(u===1/0?r("calc_out.compound_interest.row.goal_never","• "+o(s)+": never (within 50 yrs at current pace — try higher rate or contribution)",{target:o(s)}):u<=n?r("calc_out.compound_interest.row.goal_already","• "+o(s)+": already reached (year "+u+")",{target:o(s),year:String(u)}):r("calc_out.compound_interest.row.goal_years","• "+o(s)+": "+d+" years from now (year "+d+")",{target:o(s),years:String(d)}))+\`
\`}let m;n>=30?m=r("calc_out.compound_interest.row.tip_long_horizon","💡 Tip: Time in the market beats timing the market. $"+y(e)+"/mo for "+n+" years at "+t+"% builds "+o(a)+". Starting 10 years earlier typically doubles the final balance.",{contrib:y(e),years:String(n),rate:String(t),final:o(a)}):i===0&&e>0?m=r("calc_out.compound_interest.row.tip_from_zero","💡 Tip: Starting from $0 is fine — the habit of consistent contributions matters more than the seed amount. $"+y(e)+"/mo for "+n+" years builds "+o(a)+".",{contrib:y(e),years:String(n),final:o(a)}):t<1?m=r("calc_out.compound_interest.row.tip_below_inflation","💡 Tip: At "+t+"% you are likely below inflation (~3%). Consider HYSA, I-bonds, or index funds to keep pace with rising costs.",{rate:String(t)}):f.band==="strong"?m=r("calc_out.compound_interest.row.tip_default_strong","💡 Tip: Compounding multiplies money over time. Reinvest all interest — withdrawal breaks the chain. The "+t+"% rate you selected (strong (S&P 500 historical)) compounds most effectively over "+n+"+ years.",{rate:String(t),years:String(n)}):f.band==="average"?m=r("calc_out.compound_interest.row.tip_default_average","💡 Tip: Compounding multiplies money over time. Reinvest all interest — withdrawal breaks the chain. The "+t+"% rate you selected (average (HYSA / CDs)) compounds most effectively over "+n+"+ years.",{rate:String(t),years:String(n)}):f.band==="low"?m=r("calc_out.compound_interest.row.tip_default_low","💡 Tip: Compounding multiplies money over time. Reinvest all interest — withdrawal breaks the chain. The "+t+"% rate you selected (low (basic savings account)) compounds most effectively over "+n+"+ years.",{rate:String(t),years:String(n)}):m=r("calc_out.compound_interest.row.tip_default_below_inflation","💡 Tip: Compounding multiplies money over time. Reinvest all interest — withdrawal breaks the chain. The "+t+"% rate you selected (below inflation — consider alternatives) compounds most effectively over "+n+"+ years.",{rate:String(t),years:String(n)});const j=[\`⏰ Compound Interest Calculator

💰 Growth Snapshot:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Principal:                \`+o(i)+\`
• Total Contributions:      \`+o(e*12*n)+"  ($"+y(e)+"/mo × 12 × "+n+\`)
\`+r("calc_out.compound_interest.row.total_interest","• Total Interest Earned:    "+o(g),{interest:o(g)})+\`
• Final Balance:            \`+o(a)+\`
\`+r("calc_out.compound_interest.row.multiplier","• Multiplier:               "+v.toFixed(2)+"x growth on contributions",{mult:v.toFixed(2)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 Milestone Growth:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+C+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🩺 Compounding Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(f.band==="strong"?r("calc_out.compound_interest.row.health_rate_strong","• 🟢 Rate "+t+"% is strong (S&P 500 historical)",{rate:String(t)}):f.band==="average"?r("calc_out.compound_interest.row.health_rate_average","• 🟡 Rate "+t+"% is average (HYSA / CDs)",{rate:String(t)}):f.band==="low"?r("calc_out.compound_interest.row.health_rate_low","• 🟠 Rate "+t+"% is low (basic savings account)",{rate:String(t)}):r("calc_out.compound_interest.row.health_rate_below_inflation","• 🔴 Rate "+t+"% is below inflation — consider alternatives",{rate:String(t)}))+\`
\`+(l==="monthly"?r("calc_out.compound_interest.row.health_compounding_monthly","• 🟢 Monthly compounding — APY boost over annual is ~"+((Math.pow(1+t/100/12,12)-1)*100).toFixed(3)+"%",{apy:((Math.pow(1+t/100/12,12)-1)*100).toFixed(3)})+\`
\`:r("calc_out.compound_interest.row.health_compounding_annual","• 🟡 Annual compounding — switching to monthly adds ~"+((Math.pow(1+t/100/12,12)-1)*100-t).toFixed(3)+"% APY",{apy:((Math.pow(1+t/100/12,12)-1)*100-t).toFixed(3)})+\`
\`)+r("calc_out.compound_interest.row.health_contribution_ratio","• Contribution ratio:       "+w(p,a)+" of final balance from contributions",{pct:w(p,a)})+\`
\`+r("calc_out.compound_interest.row.health_interest_ratio","• Interest ratio:           "+w(g,a)+" of final balance from compounding",{pct:w(g,a)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Time-to-Goal Milestones:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+Y+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+r("calc_out.compound_interest.row.section_break_even","⚖️ Compound vs Simple Break-Even:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+r("calc_out.compound_interest.row.breakeven_simple_final","• Simple Interest Final:    "+o(h),{value:o(h)})+\`
\`+r("calc_out.compound_interest.row.breakeven_compound_final","• Compound Interest Final:  "+o(a),{value:o(a)})+\`
\`+r("calc_out.compound_interest.row.breakeven_advantage","• Compound Advantage:       "+o(S)+"  ("+w(S,h)+" extra)",{advantage:o(S),pct:w(S,h)})+\`
\`+r("calc_out.compound_interest.row.breakeven_rule","• Rule: Compound interest = interest on interest. Time is the multiplier.")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If Scenarios:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+r("calc_out.compound_interest.row.whatif_add_100mo","• Add $100/mo extra:               "+o(_(i,e+100,t,l,n)-a)+" more at final",{extra:o(_(i,e+100,t,l,n)-a)})+\`
\`+r("calc_out.compound_interest.row.whatif_rate_plus_1","• Increase rate by 1%:             "+o(_(i,e,t+1,l,n)-a)+" more at final",{extra:o(_(i,e,t+1,l,n)-a)})+\`
\`+r("calc_out.compound_interest.row.whatif_extend_5y","• Extend period by 5 years:        "+o(_(i,e,t,l,n+5)-a)+" more at final",{extra:o(_(i,e,t,l,n+5)-a)})+\`
\`+(l==="annually"?r("calc_out.compound_interest.row.whatif_switch_monthly","• Switch to monthly compounding:  "+o(_(i,e,t,"monthly",n)-a)+" more at final",{extra:o(_(i,e,t,"monthly",n)-a)})+\`
\`:r("calc_out.compound_interest.row.whatif_switch_annual","• Switch to annual compounding:   "+o(a-_(i,e,t,"annually",n))+" less at final",{loss:o(a-_(i,e,t,"annually",n))})+\`
\`)+r("calc_out.compound_interest.row.whatif_delay_1y","• Delay start by 1 year:           "+o(a-_(i,e,t,l,n-1))+" lost (cost of procrastination)",{lost:o(a-_(i,e,t,l,n-1))})+\`

\`+m],H=[2,4,7,10,15];for(const s of H){const u=_(i,e,s,l,n),d=u-p;j.push(r("calc_out.compound_interest.row.comparison_row","Comparison: "+s+"% rate for "+n+" years → "+o(u)+" (interest "+o(d)+")",{rate:String(s),years:String(n),fv:o(u),interest:o(d)}))}return j},R=function(c,i,e){var t=$(c);return Array.isArray(t)?t.join(\`
\`):String(t)};var O=b,G=_,z=x,B=M,J=A,K=I,L=R,r=tk,D='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',r=new Function("return "+D)(),$=function(c){return I(c)};return[R(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

// ============== Engine — to be filled in Step 6 ==============

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
    return calculateCompoundInterest(inputs);
  },
  staticExamples: ['⏰ Compound Interest Calculator\n\n💰 Growth Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Principal:                $10,000\n• Total Contributions:      $120,000  ($500/mo × 12 × 20)\n$calc_out.compound_interest.row.total_interest{"interest":"$170,851"}|• Total Interest Earned:    $170,851|\n• Final Balance:            $300,851\n$calc_out.compound_interest.row.multiplier{"mult":"2.31"}|• Multiplier:               2.31x growth on contributions|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Milestone Growth:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.compound_interest.row.milestone_year{"year":"5","fv":"$49,973","contributed":"$40,000","interest":"$9,973"}|• Year 5: $49,973  (contributed $40,000 / interest $9,973)|\n  ████░░░░░░░░░░░░░░░░ 20.0% from compounding\n$calc_out.compound_interest.row.milestone_year{"year":"10","fv":"$106,639","contributed":"$70,000","interest":"$36,639"}|• Year 10: $106,639  (contributed $70,000 / interest $36,639)|\n  ███████░░░░░░░░░░░░░ 34.4% from compounding\n$calc_out.compound_interest.row.milestone_year{"year":"15","fv":"$186,971","contributed":"$100,000","interest":"$86,971"}|• Year 15: $186,971  (contributed $100,000 / interest $86,971)|\n  █████████░░░░░░░░░░░ 46.5% from compounding\n$calc_out.compound_interest.row.milestone_year{"year":"20","fv":"$300,851","contributed":"$130,000","interest":"$170,851"}|• Year 20: $300,851  (contributed $130,000 / interest $170,851)|\n  ███████████░░░░░░░░░ 56.8% from compounding\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Compounding Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.compound_interest.row.health_rate_strong{"rate":"7"}|• 🟢 Rate 7% is strong (S&P 500 historical)|\n$calc_out.compound_interest.row.health_compounding_monthly{"apy":"7.229"}|• 🟢 Monthly compounding — APY boost over annual is ~7.229%|\n$calc_out.compound_interest.row.health_contribution_ratio{"pct":"43.2%"}|• Contribution ratio:       43.2% of final balance from contributions|\n$calc_out.compound_interest.row.health_interest_ratio{"pct":"56.8%"}|• Interest ratio:           56.8% of final balance from compounding|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Time-to-Goal Milestones:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.compound_interest.row.goal_already{"target":"$100,000","year":"9.5"}|• $100,000: already reached (year 9.5)|\n$calc_out.compound_interest.row.goal_years{"target":"$500,000","years":"26"}|• $500,000: 26 years from now (year 26)|\n$calc_out.compound_interest.row.goal_years{"target":"$1,000,000","years":"35"}|• $1,000,000: 35 years from now (year 35)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.compound_interest.row.section_break_even|⚖️ Compound vs Simple Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.compound_interest.row.breakeven_simple_final{"value":"$144,000"}|• Simple Interest Final:    $144,000|\n$calc_out.compound_interest.row.breakeven_compound_final{"value":"$300,851"}|• Compound Interest Final:  $300,851|\n$calc_out.compound_interest.row.breakeven_advantage{"advantage":"$156,851","pct":"108.9%"}|• Compound Advantage:       $156,851  (108.9% extra)|\n$calc_out.compound_interest.row.breakeven_rule|• Rule: Compound interest = interest on interest. Time is the multiplier.|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.compound_interest.row.whatif_add_100mo{"extra":"$52,093"}|• Add $100/mo extra:               $52,093 more at final|\n$calc_out.compound_interest.row.whatif_rate_plus_1{"extra":"$42,928"}|• Increase rate by 1%:             $42,928 more at final|\n$calc_out.compound_interest.row.whatif_extend_5y{"extra":"$161,439"}|• Extend period by 5 years:        $161,439 more at final|\n$calc_out.compound_interest.row.whatif_switch_annual{"loss":"$16,181"}|• Switch to annual compounding:   $16,181 less at final|\n$calc_out.compound_interest.row.whatif_delay_1y{"lost":"$26,061"}|• Delay start by 1 year:           $26,061 lost (cost of procrastination)|\n\n$calc_out.compound_interest.row.tip_default_strong{"rate":"7","years":"20"}|💡 Tip: Compounding multiplies money over time. Reinvest all interest — withdrawal breaks the chain. The 7% rate you selected (strong (S&P 500 historical)) compounds most effectively over 20+ years.|\n$calc_out.compound_interest.row.comparison_row{"rate":"2","years":"20","fv":"$162,312","interest":"$32,312"}|Comparison: 2% rate for 20 years → $162,312 (interest $32,312)|\n$calc_out.compound_interest.row.comparison_row{"rate":"4","years":"20","fv":"$205,613","interest":"$75,613"}|Comparison: 4% rate for 20 years → $205,613 (interest $75,613)|\n$calc_out.compound_interest.row.comparison_row{"rate":"7","years":"20","fv":"$300,851","interest":"$170,851"}|Comparison: 7% rate for 20 years → $300,851 (interest $170,851)|\n$calc_out.compound_interest.row.comparison_row{"rate":"10","years":"20","fv":"$452,965","interest":"$322,965"}|Comparison: 10% rate for 20 years → $452,965 (interest $322,965)|\n$calc_out.compound_interest.row.comparison_row{"rate":"15","years":"20","fv":"$945,775","interest":"$815,775"}|Comparison: 15% rate for 20 years → $945,775 (interest $815,775)|'], // regenerated by scripts/codegen-examples.mjs
  faq: [
    { q: 'What is compound interest?', a: 'Compound interest is interest calculated on the initial principal and on the accumulated interest from previous periods. Unlike simple interest (which only pays interest on the original principal), compound interest grows your money exponentially because you earn "interest on interest". The longer your money compounds, the steeper the growth curve. A $10,000 deposit at 7% compounded annually becomes $16,289 after 10 years, $76,123 after 30 years, and $199,290 after 40 years.' },
    { q: 'How does compounding frequency affect returns?', a: 'Compounding frequency measures how often interest is added back to your balance and starts earning more interest. Annual compounding adds interest once per year; monthly compounding adds it 12 times per year. The difference is small for typical rates: at 7%, monthly compounding yields 7.229% APY vs 7.000% for annual — a ~0.23% difference per year. Over 30 years on $10K, that translates to about $5,000 more. The bigger lever is rate and time, not frequency.' },
    { q: 'What is a realistic annual return to assume?', a: 'For long-term planning, 7% (real return, after inflation) matches S&P 500 historical performance. For safer choices: high-yield savings accounts (HYSA) currently yield 4-5%, CDs yield 4-5%, Treasury bonds yield 3-5% depending on duration. For aggressive portfolios, 8-10% is achievable but volatile. Use 4% as a conservative baseline and 7% as a moderate baseline. Avoid projecting above 10% for retirement planning — it sets unrealistic expectations.' },
    { q: 'Should I reinvest dividends and interest?', a: 'Yes — this calculator assumes reinvestment. Withdrawal of interest breaks the compounding chain. If you receive $500 in interest and withdraw it, that $500 no longer earns interest in future years. Over 30 years, withdrawing rather than reinvesting interest can cost you 30-50% of your final balance. For taxable accounts, reinvestment triggers tax events; balance the tax drag against the compounding benefit. Tax-advantaged accounts (401k, IRA) avoid this trade-off.' },
    { q: 'How accurate is this calculator for retirement planning?', a: 'This calculator is accurate for the math (future value with regular contributions) but simplified for retirement decisions. Real retirement planning accounts for: inflation (real vs nominal returns), tax drag on withdrawals, required minimum distributions (RMDs), healthcare costs, Social Security, and sequence-of-returns risk in early retirement. Use this for back-of-envelope projections; consult a CFP for detailed retirement modeling.' },
    { q: "What is the rule of 72?", a: "Rule of 72: years to double your money = 72 / interest rate. At 10% return, money doubles every 7.2 years. At 7%, 10.3 years. At 4%, 18 years. Quick mental math. Useful for: investment planning, comparing returns, setting realistic expectations. Compounding is exponential — small differences compound dramatically." },
    { q: "How often should I compound interest?", a: "Daily compounding: best for savings accounts. Monthly: typical for CDs, bonds. Quarterly: bank accounts. Annually: many investments. The more frequent, the higher the effective annual rate. Monthly compounding at 6% = 6.17% effective annual. Stay consistent — frequency matters less than the rate and time." },
    { q: "How does inflation affect my compound interest calculation?", a: "Inflation erodes purchasing power. Real return = nominal return − inflation. 7% return − 3% inflation = 4% real return. To preserve wealth: investments must beat inflation. Rule: target 4-5% real return after inflation. Long-term stock market: 6-7% real return. Savings accounts: often negative real return." },
    { q: "What is the difference between simple and compound interest?", a: "Simple interest: principal × rate × time. Compound interest: interest earns interest. $1000 at 10% simple = $100/year. Compound (annual): $100, $110, $121, $133. Over 30 years: $1000 simple = $4000. Compound = $17,449. Compound is the engine of long-term wealth. Start early — time matters more than amount." },
    { q: "What is a realistic return rate for long-term investing?", a: "S&P 500 historical: 10% nominal, 7% real (after inflation). Conservative: 6-7% real. Aggressive stock: 8-10% real. Bonds: 2-4% nominal. Real estate: 4-8% total return. For retirement planning: 5-7% real return is conservative. Avoid: 10%+ real expectations (rare and unsustainable)." },
    { q: "How does compounding differ in retirement accounts?", a: "401(k)/IRA: tax-deferred (compounds without tax drag). Roth: tax-free compounding. Brokerage: tax drag annually (dividends, capital gains taxed). Tax-deferred shelters are 0.5-1% better long-term. Max out 401(k) match first. Then Roth IRA. Then taxable. Tax-advantaged accounts are huge long-term." },
    { q: "How do I handle market downturns in compound interest planning?", a: "Don't stop investing. Downturns are buying opportunities. Long-term returns are positive even after major crashes. Use dollar-cost averaging (invest fixed amount monthly). Keep 6-12 months emergency fund outside investments. Rebalance annually. The best long-term investors: stay invested, ignore short-term noise, add during downturns." },
    { q: "What is the difference between nominal and effective rate?", a: "Nominal rate: stated rate (e.g., 6% APR). Effective rate: actual rate after compounding. 6% monthly compounded = 6.17% effective. Compare offers: use effective rate. Credit cards: nominal rate is misleading (daily compounding). Investments: compare time-weighted returns. Always compare effective rates when evaluating options." },
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
  engineKey: true,
};

registerEngine(engine);

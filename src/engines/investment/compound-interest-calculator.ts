import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

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

// ============== customFn — minified JS string, runs in browser via new Function ==============

const customFn =
  "function fv(p,mc,r,f,y){if(r===0||y===0)return p+mc*12*y;var rr=r/100;if(f==='monthly'){var rm=rr/12;var n=y*12;return p*Math.pow(1+rm,n)+mc*((Math.pow(1+rm,n)-1)/rm);}return p*Math.pow(1+rr,y)+mc*12*((Math.pow(1+rr,y)-1)/rr);}function sfv(p,mc,r,y){return p*(1+(r/100)*y)+mc*12*y;}function y2t(t,p,mc,r,f){if(fv(p,mc,r,f,50)<t)return Infinity;for(var y=0.5;y<=50;y+=0.5){if(fv(p,mc,r,f,y)>=t)return y;}return Infinity;}" +
  "function rh(r){if(r>=7)return'\\uD83D\\uDFE2 strong (S&P 500 historical)';if(r>=4)return'\\uD83D\\uDCA1 average (HYSA / CDs)';if(r>=1)return'\\uD83D\\uDFE0 low (basic savings account)';return'\\uD83D\\uDD34 below inflation \\u2014 consider alternatives';}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var p=cnn(parseFloat(inputs.principal)||0);" +
  "var mc=cnn(parseFloat(inputs.monthlyContribution)||0);" +
  "var ar=cnn(parseFloat(inputs.annualRate)||0);" +
  "var cf=inputs.compoundFrequency==='annually'?'annually':'monthly';" +
  "var y=Math.min(50,cnn(parseFloat(inputs.years)||0));" +
  "var fv1=fv(p,mc,ar,cf,y);" +
  "var sf=sfv(p,mc,ar,y);" +
  "var tc=p+mc*12*y;" +
  "var ti=fv1-tc;" +
  "var mu=tc>0?fv1/tc:0;" +
  "var hh=rh(ar);" +
  "var ca=fv1-sf;" +
  "function fmt(n){return n.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0});}" +
  "function money(n){return'$'+fmt(n);}" +
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
  generate(inputs: Record<string, string>): string[] {
    return calculateCompoundInterest(inputs);
  },
  staticExamples: ['⏰ Compound Interest Calculator\n\n💰 Growth Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Principal:                $10,000\n• Total Contributions:      $120,000  ($500/mo × 12 × 20)\n• Total Interest Earned:    $170,851\n• Final Balance:            $300,851\n• Multiplier:               2.31x growth on contributions\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Milestone Growth:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Year 5: $49,973  (contributed $40,000 / interest $9,973)\n  ████░░░░░░░░░░░░░░░░ 20.0% from compounding\n• Year 10: $106,639  (contributed $70,000 / interest $36,639)\n  ███████░░░░░░░░░░░░░ 34.4% from compounding\n• Year 15: $186,971  (contributed $100,000 / interest $86,971)\n  █████████░░░░░░░░░░░ 46.5% from compounding\n• Year 20: $300,851  (contributed $130,000 / interest $170,851)\n  ███████████░░░░░░░░░ 56.8% from compounding\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Compounding Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 Rate 7% is strong (S&P 500 historical)\n• 🟢 Monthly compounding — APY boost over annual is ~7.229%\n• Contribution ratio:       43.2% of final balance from contributions\n• Interest ratio:           56.8% of final balance from compounding\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Time-to-Goal Milestones:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $100,000: already reached (year 9.5)\n• $500,000: 26 years from now (year 26)\n• $1,000,000: 35 years from now (year 35)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Compound vs Simple Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Simple Interest Final:    $144,000\n• Compound Interest Final:  $300,851\n• Compound Advantage:       $156,851  (108.9% extra)\n• Rule: Compound interest = interest on interest. Time is the multiplier.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Add $100/mo extra:               $52,093 more at final\n• Increase rate by 1%:             $42,928 more at final\n• Extend period by 5 years:        $161,439 more at final\n• Switch to annual compounding:   $16,181 less at final\n• Delay start by 1 year:           $26,061 lost (cost of procrastination)\n\n💡 Tip: Compounding multiplies money over time. Reinvest all interest — withdrawal breaks the chain. The 7% rate you selected (strong (S&P 500 historical)) compounds most effectively over 20+ years.\nComparison: 2% rate for 20 years → $162,312 (interest $32,312)\nComparison: 4% rate for 20 years → $205,613 (interest $75,613)\nComparison: 7% rate for 20 years → $300,851 (interest $170,851)\nComparison: 10% rate for 20 years → $452,965 (interest $322,965)\nComparison: 15% rate for 20 years → $945,775 (interest $815,775)'], // regenerated by scripts/codegen-examples.mjs
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
  engineKey: true,
};

registerEngine(engine);

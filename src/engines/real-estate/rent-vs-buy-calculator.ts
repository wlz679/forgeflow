import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

// ============== Math helpers (exported for tests) ==============

/** Monthly P&I (PMT formula). Zero-rate handled. */
export function monthlyPI(principal: number, monthlyRate: number, n: number): number {
  if (n <= 0) return 0;
  if (monthlyRate === 0) return principal / n;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
}

/**
 * Total rent paid over `years` years with annual increase `g`.
 * Geometric sum: monthlyRent * 12 * ((1+g)^N - 1) / g
 * Zero growth reduces to monthlyRent * 12 * N.
 */
export function totalRentPaidSeries(monthlyRent: number, annualRentIncreasePct: number, years: number): number {
  const g = annualRentIncreasePct / 100;
  if (years <= 0) return 0;
  if (g === 0) return monthlyRent * 12 * years;
  return monthlyRent * 12 * (Math.pow(1 + g, years) - 1) / g;
}

/**
 * Opportunity gain if down payment were invested at 7% annual (S&P average).
 * returns downPayment * ((1+r)^years - 1)
 */
export function opportunityGain(downPayment: number, annualReturnPct: number, years: number): number {
  if (years <= 0) return 0;
  return downPayment * (Math.pow(1 + annualReturnPct / 100, years) - 1);
}

/** futureValue = homePrice * (1 + appreciation)^years */
export function futureValue(homePrice: number, annualAppreciationPct: number, years: number): number {
  return homePrice * Math.pow(1 + annualAppreciationPct / 100, years);
}

interface NetCostBuyArgs {
  homePrice: number;
  downPayment: number;
  mortgageRate: number;
  yearsToStay: number;
  annualAppreciation: number;
}

/**
 * Net cost of buying over `yearsToStay`.
 * V1 simplification: assumes yearsToStay == loanTerm (30y typical), so remainingBalance = 0.
 */
export function netCostBuy(args: NetCostBuyArgs): {
  initialOutlay: number;
  totalMortgagePaid: number;
  totalHoldingCosts: number;
  sellingCosts: number;
  netProceeds: number;
  netCostBuy: number;
} {
  const principal = args.homePrice - args.downPayment;
  const monthlyRate = args.mortgageRate / 100 / 12;
  const n = args.yearsToStay * 12;
  const monthly = monthlyPI(principal, monthlyRate, n);
  const totalMortgagePaid = monthly * n;
  const fv = futureValue(args.homePrice, args.annualAppreciation, args.yearsToStay);
  const sellingCosts = fv * 0.06;
  const netProceeds = fv - sellingCosts;  // V1 simplification: remainingBalance = 0
  const buyClosingCosts = args.homePrice * 0.03;
  const initialOutlay = args.downPayment + buyClosingCosts;
  const monthlyPropertyTaxMaint = args.homePrice * 0.012 / 12;
  const totalHoldingCosts = monthlyPropertyTaxMaint * n;
  const cost = initialOutlay + totalMortgagePaid + totalHoldingCosts - netProceeds;
  return { initialOutlay, totalMortgagePaid, totalHoldingCosts, sellingCosts, netProceeds, netCostBuy: cost };
}

interface TotalRentCostArgs {
  monthlyRent: number;
  annualRentIncrease: number;
  downPayment: number;
  yearsToStay: number;
}

/**
 * Renting cost = total rent paid over stay MINUS opportunity gain from investing down payment at 7%.
 */
export function totalRentCost(args: TotalRentCostArgs): {
  totalRentPaid: number;
  opportunityGain: number;
  total: number;
} {
  const totalRentPaid = totalRentPaidSeries(args.monthlyRent, args.annualRentIncrease, args.yearsToStay);
  const oppGain = opportunityGain(args.downPayment, 7, args.yearsToStay);
  return { totalRentPaid, opportunityGain: oppGain, total: totalRentPaid - oppGain };
}

/**
 * Verdict based on savings = totalRentCost - netCostBuy.
 * - savings > 30K → 🟢 BUY strongly favored (buying saved you more than $30K)
 * - |savings| ≤ 30K → 🟡 CLOSE call
 * - savings < -30K → 🟠 RENT favored (renting saved you more than $30K)
 */
export function verdict(savings: number): { emoji: string; label: string } {
  if (savings > 30000) return { emoji: '🟢', label: 'BUY strongly favored — buying saves > $30K over renting' };
  if (savings >= -30000) return { emoji: '🟡', label: 'CLOSE call — within $30K; sensitivity matters' };
  return { emoji: '🟠', label: 'RENT favored — renting saves > $30K over buying' };
}

// ============== calculate() ==============

function calculateRentVsBuy(inputs: Record<string, string>): string[] {
  const monthlyRent = clampNonNegative(parseFloat(inputs.monthlyRent) || 0);
  const homePrice = clampNonNegative(parseFloat(inputs.homePrice) || 0);
  const downPayment = clampNonNegative(parseFloat(inputs.downPayment) || 0);
  const mortgageRate = parseFloat(inputs.mortgageRate) || 0;
  const yearsToStay = clampNonNegative(parseFloat(inputs.yearsToStay) || 0);
  const annualAppreciation = parseFloat(inputs.annualAppreciation) || 0;
  const annualRentIncrease = parseFloat(inputs.annualRentIncrease) || 0;

  if (yearsToStay <= 0) {
    return ['⏰ Rent-vs-Buy Calculator\n\n💰 Enter years you plan to stay (>0). This is the horizon for the comparison.'];
  }
  if (homePrice <= 0 && monthlyRent <= 0) {
    return ['⏰ Rent-vs-Buy Calculator\n\n💰 Enter rent, home price, and down payment to compare total cost over your stay horizon.'];
  }

  // Default home price if only rent provided
  const effHomePrice = homePrice > 0 ? homePrice : monthlyRent * 200;  // rough rent-multiplier rule
  const effDown = downPayment > 0 ? downPayment : effHomePrice * 0.2;

  const buyRes = netCostBuy({
    homePrice: effHomePrice,
    downPayment: effDown,
    mortgageRate,
    yearsToStay,
    annualAppreciation,
  });
  const rentRes = totalRentCost({
    monthlyRent,
    annualRentIncrease,
    downPayment: effDown,
    yearsToStay,
  });
  const savings = rentRes.total - buyRes.netCostBuy;
  const v = verdict(savings);

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const money = (n: number) => '$' + fmt(n);

  // Pre-compute projections at 6 stay horizons — used by both 🎯 Milestone and SEO rows
  const horizonYears = [3, 5, 7, 10, 15, 30];
  const horizonRows = horizonYears.map(h => {
    const buyH = netCostBuy({
      homePrice: effHomePrice,
      downPayment: effDown,
      mortgageRate,
      yearsToStay: h,
      annualAppreciation,
    });
    const rentH = totalRentCost({
      monthlyRent,
      annualRentIncrease,
      downPayment: effDown,
      yearsToStay: h,
    });
    const s = rentH.total - buyH.netCostBuy;
    const winner = s > 30000 ? 'BUY' : s < -30000 ? 'RENT' : 'CLOSE';
    return { h, buy: buyH.netCostBuy, rent: rentH.total, s, winner };
  });

  // Find breakeven year via linear interpolation where savings sign flips
  let breakevenYr: number | null = null;
  for (let i = 0; i < horizonRows.length - 1; i++) {
    const a = horizonRows[i];
    const b = horizonRows[i + 1];
    if (a.s < 0 && b.s >= 0) {
      const t = -a.s / (b.s - a.s);
      breakevenYr = a.h + t * (b.h - a.h);
      break;
    } else if (a.s >= 0 && b.s < 0) {
      const t = a.s / (a.s - b.s);
      breakevenYr = a.h + t * (b.h - a.h);
      break;
    }
  }
  const breakevenLabel = breakevenYr !== null
    ? breakevenYr.toFixed(1) + ' years'
    : 'beyond 30 years';

  const r =
    '⏰ Rent-vs-Buy Calculator\n\n' +
    '💰 Decision Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Years you plan to stay:  ' + yearsToStay + ' years\n' +
    '• Current monthly rent:    ' + money(monthlyRent) + '\n' +
    '• Home price (assumed):    ' + money(effHomePrice) + '\n' +
    '• Down payment (assumed):  ' + money(effDown) + '  (20% if not specified)\n' +
    '• Verdict:                 ' + v.emoji + ' ' + v.label + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Cost Breakdown:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'Buying cost (over ' + yearsToStay + ' years):\n' +
    '• Down + closing:         ' + money(buyRes.initialOutlay) + '\n' +
    '• Total mortgage paid:    ' + money(buyRes.totalMortgagePaid) + '\n' +
    '• Property tax + maint:   ' + money(buyRes.totalHoldingCosts) + '\n' +
    '• Selling costs (at end): ' + money(buyRes.sellingCosts) + '\n' +
    '• Net proceeds (sale):    ' + money(buyRes.netProceeds) + '\n' +
    '• Net cost of buying:     ' + money(buyRes.netCostBuy) + '\n\n' +
    'Renting cost (over ' + yearsToStay + ' years):\n' +
    '• Total rent paid:        ' + money(rentRes.totalRentPaid) + '\n' +
    '• Opportunity gain (7%): -' + money(rentRes.opportunityGain) + '\n' +
    '• Net cost of renting:    ' + money(rentRes.total) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Verdict Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + v.emoji + ' ' + v.label + '\n' +
    '• Savings (rent vs buy):  ' + money(savings) + '\n' +
    '  (positive = buying was cheaper by this much)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Side-by-Side:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Buying net cost:  ' + money(buyRes.netCostBuy) + '\n' +
    '• Renting net cost: ' + money(rentRes.total) + '\n' +
    '• Difference:       ' + money(Math.abs(savings)) + ' ' + (savings > 0 ? '(buying cheaper)' : savings < 0 ? '(renting cheaper)' : '(equal)') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Stay-Horizon Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'At different stay horizons, the math flips:\n' +
    horizonRows.map(hr => {
      const lbl = (hr.winner === 'BUY' ? 'buy wins' : hr.winner === 'RENT' ? 'rent wins' : 'close').padEnd(10);
      const sign = hr.s >= 0 ? '+' : '-';
      return '• ' + hr.h + 'y: ' + lbl + '(' + sign + '$' + fmt(Math.abs(hr.s)) + ')';
    }).join('\n') + '\n' +
    '💡 Breakeven ≈ ' + breakevenLabel + ' — selling + closing costs (~9%) recouped at this horizon.\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Stay 5 years:  runs the comparison at 5y horizon\n' +
    '• Stay 10 years: runs the comparison at 10y horizon\n' +
    '• Stay 15 years: runs the comparison at 15y horizon\n' +
    '• Appreciation +2pp: rerun with ' + (annualAppreciation + 2) + '% (boost buying math)\n' +
    '• 20% down (vs current): rerun with $' + fmt(effHomePrice * 0.2) + ' down\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: Most rent-vs-buy decisions break on time horizon — selling costs (~6%) and closing costs (~3%) make buying expensive in <5y stays, but appreciation + forced savings make buying cheaper in 7+ year stays.';

  const results: string[] = [r];

  // SEO comparison rows (reuse pre-computed horizonRows)
  for (const hr of horizonRows) {
    const winner = hr.winner === 'BUY' ? 'BUY favored' : hr.winner === 'RENT' ? 'RENT favored' : 'CLOSE';
    results.push(
      'Comparison: ' + hr.h + '-year stay → buy ' + money(hr.buy) + ' vs rent ' + money(hr.rent) + ' → ' + winner + ' (savings ' + money(hr.s) + ')',
    );
  }
  return results;
}

// ============== customFn (live = static parity) ==============

const customFn =
  "function mPI(p,r,n){if(n<=0)return 0;if(r===0)return p/n;return(p*r)/(1-Math.pow(1+r,-n));}" +
  "function trps(mr,gr,y){var g=gr/100;if(y<=0)return 0;if(g===0)return mr*12*y;return mr*12*(Math.pow(1+g,y)-1)/g;}" +
  "function oppG(dp,ar,y){if(y<=0)return 0;return dp*(Math.pow(1+ar/100,y)-1);}" +
  "function fv(hp,ap,y){return hp*Math.pow(1+ap/100,y);}" +
  "function ncb(hp,dp,mr,yrs,apr){var p=hp-dp;var r=mr/100/12;var n=yrs*12;var m=mPI(p,r,n);var tmp=m*n;var f=fv(hp,apr,yrs);var sc=f*0.06;var np=f-sc;var bcc=hp*0.03;var io=dp+bcc;var mptm=hp*0.012/12;var thc=mptm*n;return{io:io,tmp:tmp,thc:thc,sc:sc,np:np,total:io+tmp+thc-np};}" +
  "function trc(mr,ri,dp,y){var trp=trps(mr,ri,y);var og=oppG(dp,7,y);return{totalRentPaid:trp,opportunityGain:og,total:trp-og};}" +
  "function verd(s){if(s>30000)return{e:'\\uD83D\\uDFE2',l:'BUY strongly favored \\u2014 buying saves > $30K over renting'};if(s>=-30000)return{e:'\\uD83D\\uDCA1',l:'CLOSE call \\u2014 within $30K; sensitivity matters'};return{e:'\\uD83D\\uDFE0',l:'RENT favored \\u2014 renting saves > $30K over buying'};}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var mr=cnn(parseFloat(inputs.monthlyRent)||0);" +
  "var hp=cnn(parseFloat(inputs.homePrice)||0);" +
  "var dp=cnn(parseFloat(inputs.downPayment)||0);" +
  "var mRate=parseFloat(inputs.mortgageRate)||0;" +
  "var yrs=cnn(parseFloat(inputs.yearsToStay)||0);" +
  "var appr=parseFloat(inputs.annualAppreciation)||0;" +
  "var rentI=parseFloat(inputs.annualRentIncrease)||0;" +
  "if(yrs<=0){return['\\u23F0 Rent-vs-Buy Calculator\\n\\n\\uD83D\\uDCB0 Enter years you plan to stay (>0). This is the horizon for the comparison.'];}" +
  "if(hp<=0&&mr<=0){return['\\u23F0 Rent-vs-Buy Calculator\\n\\n\\uD83D\\uDCB0 Enter rent, home price, and down payment to compare total cost over your stay horizon.'];}" +
  "var eh=hp>0?hp:mr*200;" +
  "var ed=dp>0?dp:eh*0.2;" +
  "var bR=ncb(eh,ed,mRate,yrs,appr);" +
  "var rR=trc(mr,rentI,ed,yrs);" +
  "var sav=rR.total-bR.total;" +
  "var v=verd(sav);" +
  "function fmt(n){return n.toLocaleString('en-US',{maximumFractionDigits:0});}" +
  "function money(n){return '$'+fmt(n);}" +
  "var hy=[3,5,7,10,15,30];" +
  "var hrows=hy.map(function(h){var bh=ncb(eh,ed,mRate,h,appr);var rh=trc(mr,rentI,ed,h);var s=rh.total-bh.total;var w=s>30000?'BUY':s<-30000?'RENT':'CLOSE';return{h:h,b:bh.total,r:rh.total,s:s,w:w};});" +
  "var brk=null;" +
  "for(var bi=0;bi<hrows.length-1;bi++){var a=hrows[bi];var b=hrows[bi+1];if(a.s<0&&b.s>=0){var t=-a.s/(b.s-a.s);brk=a.h+t*(b.h-a.h);break;}else if(a.s>=0&&b.s<0){var t=a.s/(a.s-b.s);brk=a.h+t*(b.h-a.h);break;}}" +
  "var brkL=brk!==null?brk.toFixed(1)+' years':'beyond 30 years';" +
  "var r2='';" +
  "r2+='\\u23F0 Rent-vs-Buy Calculator\\n\\n';" +
  "r2+='\\uD83D\\uDCB0 Decision Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Years you plan to stay:  '+yrs+' years\\n';" +
  "r2+='\\u2022 Current monthly rent:    '+money(mr)+'\\n';" +
  "r2+='\\u2022 Home price (assumed):    '+money(eh)+'\\n';" +
  "r2+='\\u2022 Down payment (assumed):  '+money(ed)+'  (20% if not specified)\\n';" +
  "r2+='\\u2022 Verdict:                 '+v.e+' '+v.l+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCD0 Cost Breakdown:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='Buying cost (over '+yrs+' years):\\n';" +
  "r2+='\\u2022 Down + closing:         '+money(bR.io)+'\\n';" +
  "r2+='\\u2022 Total mortgage paid:    '+money(bR.tmp)+'\\n';" +
  "r2+='\\u2022 Property tax + maint:   '+money(bR.thc)+'\\n';" +
  "r2+='\\u2022 Selling costs (at end): '+money(bR.sc)+'\\n';" +
  "r2+='\\u2022 Net proceeds (sale):    '+money(bR.np)+'\\n';" +
  "r2+='\\u2022 Net cost of buying:     '+money(bR.total)+'\\n\\n';" +
  "r2+='Renting cost (over '+yrs+' years):\\n';" +
  "r2+='\\u2022 Total rent paid:        '+money(rR.totalRentPaid)+'\\n';" +
  "r2+='\\u2022 Opportunity gain (7%): -'+money(rR.opportunityGain)+'\\n';" +
  "r2+='\\u2022 Net cost of renting:    '+money(rR.total)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Verdict Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+v.e+' '+v.l+'\\n';" +
  "r2+='\\u2022 Savings (rent vs buy):  '+money(sav)+'\\n';" +
  "r2+='  (positive = buying was cheaper by this much)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Side-by-Side:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Buying net cost:  '+money(bR.total)+'\\n';" +
  "r2+='\\u2022 Renting net cost: '+money(rR.total)+'\\n';" +
  "r2+='\\u2022 Difference:       '+money(Math.abs(sav))+' '+(sav>0?'(buying cheaper)':sav<0?'(renting cheaper)':'(equal)')+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  // 🎯 Stay-Horizon Milestone (matches calculate() output, uses pre-computed hrows + brkL)
  "r2+='\\uD83C\\uDFAF Stay-Horizon Milestone:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='At different stay horizons, the math flips:\\n';" +
  "for(var him=0;him<hrows.length;him++){var hr=hrows[him];var lbl=(hr.w==='BUY'?'buy wins':hr.w==='RENT'?'rent wins':'close');while(lbl.length<10)lbl+=' ';var sg=hr.s>=0?'+':'-';r2+='\\u2022 '+hr.h+'y: '+lbl+'('+sg+'$'+fmt(Math.abs(hr.s))+')\\n';}" +
  "r2+='\\uD83D\\uDCA1 Breakeven \\u2248 '+brkL+' \\u2014 selling + closing costs (~9%) recouped at this horizon.\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Stay 5 years:  runs the comparison at 5y horizon\\n';" +
  "r2+='\\u2022 Stay 10 years: runs the comparison at 10y horizon\\n';" +
  "r2+='\\u2022 Stay 15 years: runs the comparison at 15y horizon\\n';" +
  "r2+='\\u2022 Appreciation +2pp: rerun with '+(appr+2).toFixed(1)+'% (boost buying math)\\n';" +
  "r2+='\\u2022 20% down (vs current): rerun with $'+fmt(eh*0.2)+' down\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCA1 Tip: Most rent-vs-buy decisions break on time horizon \\u2014 selling costs (~6%) and closing costs (~3%) make buying expensive in <5y stays, but appreciation + forced savings make buying cheaper in 7+ year stays.';" +
  "var results=[r2];" +
  "for(var hi=0;hi<hrows.length;hi++){var hr=hrows[hi];var w=hr.w==='BUY'?'BUY favored':hr.w==='RENT'?'RENT favored':'CLOSE';results.push('Comparison: '+hr.h+'-year stay \\u2192 buy '+money(hr.b)+' vs rent '+money(hr.r)+' \\u2192 '+w+' (savings '+money(hr.s)+')');}" +
  "return results;";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-rent-vs-buy-calculator',
  title: 'Rent-vs-Buy Calculator',
  description:
    'Decide whether to rent or buy with NPV comparison over your stay horizon. Includes down payment opportunity cost, selling costs, and appreciation. Multiplies into 6 time horizons to show how the answer changes with commitment length.',
  inputs: [
    { name: 'monthlyRent', label: 'Current Monthly Rent ($)', placeholder: 'e.g. 2000', type: 'number' },
    { name: 'homePrice', label: 'Home Purchase Price ($)', placeholder: 'e.g. 500000', type: 'number' },
    { name: 'downPayment', label: 'Down Payment ($)', placeholder: 'e.g. 100000', type: 'number' },
    { name: 'mortgageRate', label: 'Mortgage Rate (%)', placeholder: 'e.g. 6.5', type: 'number' },
    { name: 'yearsToStay', label: 'Years You Plan to Stay', placeholder: 'e.g. 7', type: 'number' },
    { name: 'annualAppreciation', label: 'Expected Home Appreciation (%/yr)', placeholder: 'e.g. 3', type: 'number' },
    { name: 'annualRentIncrease', label: 'Annual Rent Increase (%/yr)', placeholder: 'e.g. 3', type: 'number' },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] {
    return calculateRentVsBuy(inputs);
  },
  staticExamples: ['⏰ Rent-vs-Buy Calculator\n\n💰 Decision Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Years you plan to stay:  7 years\n• Current monthly rent:    $2,000\n• Home price (assumed):    $500,000\n• Down payment (assumed):  $100,000  (20% if not specified)\n• Verdict:                 🟢 BUY strongly favored — buying saves > $30K over renting\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Cost Breakdown:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nBuying cost (over 7 years):\n• Down + closing:         $115,000\n• Total mortgage paid:    $498,941\n• Property tax + maint:   $42,000\n• Selling costs (at end): $36,896\n• Net proceeds (sale):    $578,041\n• Net cost of buying:     $77,900\n\nRenting cost (over 7 years):\n• Total rent paid:        $183,899\n• Opportunity gain (7%): -$60,578\n• Net cost of renting:    $123,321\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Verdict Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 BUY strongly favored — buying saves > $30K over renting\n• Savings (rent vs buy):  $45,421\n  (positive = buying was cheaper by this much)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Side-by-Side:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Buying net cost:  $77,900\n• Renting net cost: $123,321\n• Difference:       $45,421 (buying cheaper)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Stay-Horizon Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nAt different stay horizons, the math flips:\n• 3y: close     (-$9,087)\n• 5y: close     (+$17,435)\n• 7y: buy wins  (+$45,421)\n• 10y: buy wins  (+$90,028)\n• 15y: buy wins  (+$170,518)\n• 30y: buy wins  (+$416,220)\n💡 Breakeven ≈ 3.7 years — selling + closing costs (~9%) recouped at this horizon.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Stay 5 years:  runs the comparison at 5y horizon\n• Stay 10 years: runs the comparison at 10y horizon\n• Stay 15 years: runs the comparison at 15y horizon\n• Appreciation +2pp: rerun with 5% (boost buying math)\n• 20% down (vs current): rerun with $100,000 down\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Most rent-vs-buy decisions break on time horizon — selling costs (~6%) and closing costs (~3%) make buying expensive in <5y stays, but appreciation + forced savings make buying cheaper in 7+ year stays.\nComparison: 3-year stay → buy $60,764 vs rent $51,677 → CLOSE (savings $-9,087)\nComparison: 5-year stay → buy $69,729 vs rent $87,164 → CLOSE (savings $17,435)\nComparison: 7-year stay → buy $77,900 vs rent $123,321 → BUY favored (savings $45,421)\nComparison: 10-year stay → buy $88,390 vs rent $178,418 → BUY favored (savings $90,028)\nComparison: 15-year stay → buy $99,953 vs rent $270,471 → BUY favored (savings $170,518)\nComparison: 30-year stay → buy $64,365 vs rent $480,584 → BUY favored (savings $416,220)'],
  faq: [
    {
      q: 'When does it make financial sense to buy vs rent?',
      a: 'Generally 7+ years. The rule of thumb: if you stay less than 5 years, transaction costs (3% buy closing + 6% selling) plus limited appreciation time usually favor renting. If you stay 7+ years, appreciation + forced savings + principal paydown usually make buying cheaper. The exact break-even depends on your rent-to-price ratio, appreciation rate, and how much you would otherwise invest the down payment.',
    },
    {
      q: 'How is the opportunity cost of the down payment calculated?',
      a: 'The opportunity cost is what your down payment would earn if invested instead. We assume 7% annual (roughly S&P 500 historical average). For a $100K down payment over 5 years, that is ~$40K of opportunity gain subtracted from renting costs. Adjust your expected return if you have a different investment strategy.',
    },
    {
      q: 'What costs are included in "net cost of buying"?',
      a: 'Initial outlay (down payment + 3% closing costs) + total mortgage P&I over the stay + ongoing property tax + maintenance (1.2%/yr of home value annually) + 6% selling costs at horizon MINUS net sale proceeds (home value at appreciation minus selling costs). In V1 we assume the loan term equals your stay, so there is no remaining balance at sale.',
    },
    {
      q: 'How accurate is this calculator?',
      a: 'It captures the major cash flows: mortgage, holding costs, transaction costs, appreciation, and opportunity gain. It does NOT model property tax increases, insurance changes, repairs, or tax deductions (mortgage interest deduction in the US can save 10-25% of monthly interest cost for higher earners). For a personalized analysis, combine with a tax advisor.',
    },
    {
      q: 'Should I include homeowners insurance and HOA fees?',
      a: 'Yes — our 1.2%/yr "property tax + maintenance" estimate is conservative and assumes roughly 0.8% property tax + 0.4% maintenance/insurance. HOA fees in condos/co-ops can add 0.5-2% of home value annually and should be added to the property tax + maintenance line for accurate results. Adjust the calculation or use a different model for high-HOA markets.',
    },
  ],
  howToUse: [
    'Enter your current monthly rent.',
    'Enter the home price you would buy at.',
    'Enter your planned down payment.',
    'Enter the mortgage rate you would finance at.',
    'Enter years you plan to stay in the home (key sensitivity).',
    'Enter expected annual home appreciation (default 3% = long-term US average).',
    'Enter expected annual rent increase (default 3% = typical rent inflation).',
    'Review the verdict and side-by-side net cost comparison.',
    'Check the 6 time-horizon SEO rows — answer changes dramatically with commitment length.',
    'Apply the 5 what-ifs to find your break-even stay duration.',
  ],
  engineKey: true,
};

registerEngine(engine);

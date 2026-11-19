import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-13：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

function calculateEquityDilution(inputs: Record<string, string>): string[] {
  const preMoneyValuation = clampNonNegative(parseFloat(inputs.companyValuation) || 0);
  const investmentAmount = clampNonNegative(parseFloat(inputs.investmentAmount) || 0);
  const founderShares = clampNonNegative(parseInt(inputs.founderShares) || 0);
  const results: string[] = [];

  const postMoneyValuation = preMoneyValuation + investmentAmount;
  const investorOwnershipPct = postMoneyValuation > 0 ? (investmentAmount / postMoneyValuation) * 100 : 0;
  const investorShares = preMoneyValuation > 0 ? Math.round(founderShares * (investmentAmount / preMoneyValuation)) : 0;
  const totalSharesAfter = founderShares + investorShares;
  const founderOwnershipAfter = totalSharesAfter > 0 ? (founderShares / totalSharesAfter) * 100 : 100;
  const dilutionPct = 100 - founderOwnershipAfter;
  const pricePerShare = founderShares > 0 ? preMoneyValuation / founderShares : 0;

  const optionPoolPct = 10;
  const optionPoolShares = Math.round(totalSharesAfter * (optionPoolPct / (100 - optionPoolPct)));
  const founderOwnershipWithPool = totalSharesAfter + optionPoolShares > 0
    ? (founderShares / (totalSharesAfter + optionPoolShares)) * 100
    : founderOwnershipAfter;

  const exitValuation = preMoneyValuation * 10;
  const founderExitProceeds = (founderOwnershipAfter / 100) * exitValuation;
  const founderExitProceedsDiluted = (founderOwnershipWithPool / 100) * exitValuation;

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
  const fmt2 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct2 = (n: number) => n.toFixed(2);
  const pct1 = (n: number) => n.toFixed(1);
  const loc = (n: number) => n.toLocaleString();

  // P168 B3-4：💡 Tip 改成**建议码**（复用本引擎 🩺 Founder Health 的 dilution 三档 band）
  //   —— 原先是一条写死的英文建议，对任何输入都只说同一句话 ⇒ 动态层名不副实。
  //   ⚠️ customFn 里必须写**逐字相同**的一份（守卫「两套实现不许漂」守着这条）。
  const dilutionTipParams = { dilution: pct2(dilutionPct), founderStake: pct2(founderOwnershipAfter) };
  const dilutionTip =
    dilutionPct <= 20
      ? { code: 'dilution_healthy', params: dilutionTipParams }
      : dilutionPct <= 35
      ? { code: 'dilution_aggressive', params: dilutionTipParams }
      : { code: 'dilution_excessive', params: dilutionTipParams };

  results.push(
    '📊 Equity Dilution Calculator\n\n' +
    makeToken('calc_out.equity_dilution.row.pre_money_valuation', '🏢 Pre-Money Valuation:  ' + fmt(preMoneyValuation), { valuation: fmt(preMoneyValuation) }) + '\n' +
    makeToken('calc_out.equity_dilution.row.investment_amount', '💰 Investment Amount:    ' + fmt(investmentAmount), { amount: fmt(investmentAmount) }) + '\n' +
    makeToken('calc_out.equity_dilution.row.founder_shares', '🏗️ Founder Shares (initial): ' + loc(founderShares), { shares: loc(founderShares) }) + '\n' +
    makeToken('calc_out.equity_dilution.row.price_per_share', '💵 Price Per Share:      ' + fmt2(pricePerShare), { price: fmt2(pricePerShare) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💰 Cap Table Snapshot:\n' +
    makeToken('calc_out.equity_dilution.row.post_money_valuation', '• Post-Money Valuation:  ' + fmt(postMoneyValuation), { valuation: fmt(postMoneyValuation) }) + '\n' +
    makeToken('calc_out.equity_dilution.row.total_shares_after', '• Total Shares (after): ' + loc(totalSharesAfter), { shares: loc(totalSharesAfter) }) + '\n' +
    makeToken('calc_out.equity_dilution.row.founder_ownership', '• Founder Ownership:    ' + pct2(founderOwnershipAfter) + '%  (' + loc(founderShares) + ' shares)', { stake: pct2(founderOwnershipAfter), shares: loc(founderShares) }) + '\n' +
    makeToken('calc_out.equity_dilution.row.investor_ownership', '• Investor Ownership:  ' + pct2(investorOwnershipPct) + '%  (' + loc(investorShares) + ' shares)', { stake: pct2(investorOwnershipPct), shares: loc(investorShares) }) + '\n' +
    makeToken('calc_out.equity_dilution.row.option_pool', '• Option Pool (10%):    ' + pct2(100 * optionPoolShares / (totalSharesAfter + optionPoolShares)) + '%  (' + loc(optionPoolShares) + ' shares reserved)', { pool: pct2(100 * optionPoolShares / (totalSharesAfter + optionPoolShares)), shares: loc(optionPoolShares) }) + '\n' +
    makeToken('calc_out.equity_dilution.row.founder_after_pool', '• Founder (after pool): ' + pct2(founderOwnershipWithPool) + '%', { stake: pct2(founderOwnershipWithPool) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Dilution per Round:\n' +
    makeToken('calc_out.equity_dilution.row.founder_dilution', '• Founder Dilution:      ' + pct2(dilutionPct) + '%  (pre-investment: 100%, post: ' + pct2(founderOwnershipAfter) + '%)', { dilution: pct2(dilutionPct), stake: pct2(founderOwnershipAfter) }) + '\n' +
    makeToken('calc_out.equity_dilution.row.dilution_per_1k', '• Dilution per $1K:    ' + (investmentAmount > 0 ? pct2((dilutionPct / investmentAmount) * 1000) + ' pp' : '0.00 pp'), { pp: (investmentAmount > 0 ? pct2((dilutionPct / investmentAmount) * 1000) + ' pp' : '0.00 pp') }) + '\n' +
    makeToken('calc_out.equity_dilution.row.investor_per_pp', '• Investor $/pp:        ' + (investmentAmount > 0 && dilutionPct > 0 ? fmt(investmentAmount / dilutionPct) : '$0'), { cost: (investmentAmount > 0 && dilutionPct > 0 ? fmt(investmentAmount / dilutionPct) : '$0') }) + '\n' +
    makeToken('calc_out.equity_dilution.row.pool_impact', '• Pool Impact:         ~' + pct2(founderOwnershipAfter - founderOwnershipWithPool) + '% additional from option pool', { impact: pct2(founderOwnershipAfter - founderOwnershipWithPool) }) + '\n' +
    makeToken('calc_out.equity_dilution.row.industry_benchmark_head', '• Industry Benchmark: Seed 10-20%') +
    ' | ' +
    makeToken('calc_out.equity_dilution.row.industry_benchmark_a', 'Series A 15-25%') +
    ' | ' +
    makeToken('calc_out.equity_dilution.row.industry_benchmark_b', 'Series B 10-20%') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Founder Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (founderOwnershipAfter > 60
      ? makeToken('calc_out.equity_dilution.row.health_founder_strong', '• 🟢 Founder retains ' + pct2(founderOwnershipAfter) + '% — strong control after this round.', { stake: pct2(founderOwnershipAfter) }) + '\n'
      : founderOwnershipAfter >= 40
      ? makeToken('calc_out.equity_dilution.row.health_founder_minority', '• 🟡 Founder at ' + pct2(founderOwnershipAfter) + '% — minority control. Watch for blocking rights.', { stake: pct2(founderOwnershipAfter) }) + '\n'
      : founderOwnershipAfter >= 20
      ? makeToken('calc_out.equity_dilution.row.health_founder_losing_majority', '• 🟠 Founder at ' + pct2(founderOwnershipAfter) + '% — losing majority. Negotiate board seats.', { stake: pct2(founderOwnershipAfter) }) + '\n'
      : makeToken('calc_out.equity_dilution.row.health_founder_minority_stake', '• 🔴 Founder at ' + pct2(founderOwnershipAfter) + '% — minority stake. Investors likely control board.', { stake: pct2(founderOwnershipAfter) }) + '\n') +
    (dilutionPct <= 20
      ? makeToken('calc_out.equity_dilution.row.health_dilution_healthy', '• 🟢 Round dilutes only ' + pct2(dilutionPct) + '% — within healthy seed/Series A range.', { dilution: pct2(dilutionPct) }) + '\n'
      : dilutionPct <= 35
      ? makeToken('calc_out.equity_dilution.row.health_dilution_aggressive', '• 🟡 Round dilutes ' + pct2(dilutionPct) + '% — aggressive but workable for late stages.', { dilution: pct2(dilutionPct) }) + '\n'
      : makeToken('calc_out.equity_dilution.row.health_dilution_excessive', '• 🔴 Round dilutes ' + pct2(dilutionPct) + '% — excessive. Renegotiate valuation or raise less.', { dilution: pct2(dilutionPct) }) + '\n') +
    (pricePerShare > 0 && preMoneyValuation > 0
      ? makeToken('calc_out.equity_dilution.row.health_price_floor', '• 🟢 Price/share ' + fmt2(pricePerShare) + ' sets floor for next round.', { price: fmt2(pricePerShare) }) + '\n'
      : '') +
    '\n🎯 Exit Value by Round:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.equity_dilution.row.assuming_exit', 'Assuming ' + fmt(exitValuation) + ' exit (10x pre-money):', { valuation: fmt(exitValuation) }) + '\n' +
    makeToken('calc_out.equity_dilution.row.founder_take', '• Founder Take:           ' + fmt(founderExitProceeds) + '  (' + pct2(founderOwnershipAfter) + '%)', { amount: fmt(founderExitProceeds), stake: pct2(founderOwnershipAfter) }) + '\n' +
    makeToken('calc_out.equity_dilution.row.investor_take', '• Investor Take:         ' + fmt((investorOwnershipPct / 100) * exitValuation), { amount: fmt((investorOwnershipPct / 100) * exitValuation) }) + '\n' +
    makeToken('calc_out.equity_dilution.row.with_option_pool', '• With Option Pool:    Founder ' + fmt(founderExitProceedsDiluted) + '  (' + pct2(founderOwnershipWithPool) + '%)', { amount: fmt(founderExitProceedsDiluted), stake: pct2(founderOwnershipWithPool) }) + '\n' +
    makeToken('calc_out.equity_dilution.row.break_even_multiplier', '• Break-Even Multiplier:  ' + (investmentAmount > 0 && founderOwnershipAfter > 0 ? ((investmentAmount / 0.01) / founderOwnershipAfter).toFixed(1) : '∞') + 'x  (min exit for VC to clear 1% return)', { mult: (investmentAmount > 0 && founderOwnershipAfter > 0 ? ((investmentAmount / 0.01) / founderOwnershipAfter).toFixed(1) : '∞') }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Dilution Threshold:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.equity_dilution.row.loss_of_majority_control', '• Loss of majority control at 50% stake') + '\n' +
    makeToken('calc_out.equity_dilution.row.founders_below_20', '• Founders below 20% typically lose board seats') + '\n' +
    makeToken('calc_out.equity_dilution.row.current_founder_stake', '• Current founder stake: ' + pct2(founderOwnershipAfter) + '%', { stake: pct2(founderOwnershipAfter) }) + '\n' +
    (founderOwnershipAfter > 50
      ? makeToken('calc_out.equity_dilution.row.threshold_above_50', '• 🟢 Above 50% — you control major decisions.') + '\n'
      : founderOwnershipAfter > 20
      ? makeToken('calc_out.equity_dilution.row.threshold_below_50', '• 🟡 Below 50% — investors have blocking rights on key votes.') + '\n'
      : makeToken('calc_out.equity_dilution.row.threshold_below_20', '• 🔴 Below 20% — minority protection only. Investors effectively control company.') + '\n') +
    makeToken('calc_out.equity_dilution.row.acceptable_next_round', '• Acceptable next round: Dilution <25% to retain ' + pct2(founderOwnershipAfter * 0.75) + '% stake', { stake: pct2(founderOwnershipAfter * 0.75) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.equity_dilution.row.whatif_raise_half', '• Raise half ($' + Math.round(investmentAmount / 2).toLocaleString() + '):  Dilution ' + (postMoneyValuation > 0 ? pct2((investmentAmount / 2) / (preMoneyValuation + (investmentAmount / 2)) * 100) : '0.00') + '%  → Founder keeps ' + pct2(100 - (investmentAmount / 2) / (preMoneyValuation + (investmentAmount / 2)) * 100) + '%', { amount: Math.round(investmentAmount / 2).toLocaleString(), dilution: (postMoneyValuation > 0 ? pct2((investmentAmount / 2) / (preMoneyValuation + (investmentAmount / 2)) * 100) : '0.00'), stake: pct2(100 - (investmentAmount / 2) / (preMoneyValuation + (investmentAmount / 2)) * 100) }) + '\n' +
    makeToken('calc_out.equity_dilution.row.whatif_safe', '• Raise via SAFE (no immediate dilution):  Convert later at discount (15-25%) — plan for additional 5-10% dilution at next round') + '\n' +
    makeToken('calc_out.equity_dilution.row.whatif_smaller_rounds', '• Smaller rounds, twice:  Two $' + Math.round(investmentAmount / 2).toLocaleString() + ' rounds → similar total dilution but more milestone-based', { amount: Math.round(investmentAmount / 2).toLocaleString() }) + '\n' +
    makeToken('calc_out.equity_dilution.row.whatif_negotiate_valuation', '• Negotiate valuation +25%:  Pre $' + Math.round(preMoneyValuation * 1.25).toLocaleString() + ' → Dilution drops to ' + (preMoneyValuation * 1.25 + investmentAmount > 0 ? pct2(investmentAmount / (preMoneyValuation * 1.25 + investmentAmount) * 100) : '0.00') + '%', { pre: Math.round(preMoneyValuation * 1.25).toLocaleString(), dilution: (preMoneyValuation * 1.25 + investmentAmount > 0 ? pct2(investmentAmount / (preMoneyValuation * 1.25 + investmentAmount) * 100) : '0.00') }) + '\n' +
    makeToken('calc_out.equity_dilution.row.whatif_smaller_pool', '• Keep smaller option pool (5%):  Founder at ' + pct2(founderShares / (totalSharesAfter + totalSharesAfter * (5 / (100 - 5))) * 100) + '% vs current ' + pct2(founderOwnershipWithPool) + '%', { stake: pct2(founderShares / (totalSharesAfter + totalSharesAfter * (5 / (100 - 5))) * 100), current: pct2(founderOwnershipWithPool) }) + '\n\n' +
    '💡 Tip: ' + JSON.stringify(dilutionTip)
  );

  const exitScenarios = [exitValuation * 0.5, exitValuation, exitValuation * 2, exitValuation * 5, exitValuation * 10];
  for (let i = 0; i < exitScenarios.length; i++) {
    const ev = exitScenarios[i];
    const founderTake = (founderOwnershipAfter / 100) * ev;
    const investorTake = (investorOwnershipPct / 100) * ev;
    results.push(
      makeToken('calc_out.equity_dilution.row.exit_head', 'Exit @ ' + fmt(ev) + ': Founder ' + fmt(founderTake) + ' (' + pct2(founderOwnershipAfter) + '%)', { exit: fmt(ev), founder: fmt(founderTake), stake: pct2(founderOwnershipAfter) }) +
      ' | ' +
      makeToken('calc_out.equity_dilution.row.exit_investor', 'Investor ' + fmt(investorTake) + ' (' + pct2(investorOwnershipPct) + '%)', { investor: fmt(investorTake), stake: pct2(investorOwnershipPct) }),
    );
  }

  return results;
}

const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let v=function(_){return Number.isNaN(_)?0:Math.max(0,_)},x=function(_){const e=v(parseFloat(_.companyValuation)||0),i=v(parseFloat(_.investmentAmount)||0),l=v(parseInt(_.founderShares)||0),S=[],f=e+i,y=f>0?i/f*100:0,F=e>0?Math.round(l*(i/e)):0,a=l+F,n=a>0?l/a*100:100,u=100-n,w=l>0?e/l:0,P=10,p=Math.round(a*(P/(100-P))),h=a+p>0?l/(a+p)*100:n,c=e*10,M=n/100*c,A=h/100*c,r=s=>"$"+Math.round(s).toLocaleString(),q=s=>s.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}),t=s=>s.toFixed(2),V=s=>s.toFixed(1),d=s=>s.toLocaleString(),b={dilution:t(u),founderStake:t(n)},E=u<=20?{code:"dilution_healthy",params:b}:u<=35?{code:"dilution_aggressive",params:b}:{code:"dilution_excessive",params:b};S.push(\`📊 Equity Dilution Calculator

\`+o("calc_out.equity_dilution.row.pre_money_valuation","🏢 Pre-Money Valuation:  "+r(e),{valuation:r(e)})+\`
\`+o("calc_out.equity_dilution.row.investment_amount","💰 Investment Amount:    "+r(i),{amount:r(i)})+\`
\`+o("calc_out.equity_dilution.row.founder_shares","🏗️ Founder Shares (initial): "+d(l),{shares:d(l)})+\`
\`+o("calc_out.equity_dilution.row.price_per_share","💵 Price Per Share:      "+q(w),{price:q(w)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Cap Table Snapshot:
\`+o("calc_out.equity_dilution.row.post_money_valuation","• Post-Money Valuation:  "+r(f),{valuation:r(f)})+\`
\`+o("calc_out.equity_dilution.row.total_shares_after","• Total Shares (after): "+d(a),{shares:d(a)})+\`
\`+o("calc_out.equity_dilution.row.founder_ownership","• Founder Ownership:    "+t(n)+"%  ("+d(l)+" shares)",{stake:t(n),shares:d(l)})+\`
\`+o("calc_out.equity_dilution.row.investor_ownership","• Investor Ownership:  "+t(y)+"%  ("+d(F)+" shares)",{stake:t(y),shares:d(F)})+\`
\`+o("calc_out.equity_dilution.row.option_pool","• Option Pool (10%):    "+t(100*p/(a+p))+"%  ("+d(p)+" shares reserved)",{pool:t(100*p/(a+p)),shares:d(p)})+\`
\`+o("calc_out.equity_dilution.row.founder_after_pool","• Founder (after pool): "+t(h)+"%",{stake:t(h)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 Dilution per Round:
\`+o("calc_out.equity_dilution.row.founder_dilution","• Founder Dilution:      "+t(u)+"%  (pre-investment: 100%, post: "+t(n)+"%)",{dilution:t(u),stake:t(n)})+\`
\`+o("calc_out.equity_dilution.row.dilution_per_1k","• Dilution per $1K:    "+(i>0?t(u/i*1e3)+" pp":"0.00 pp"),{pp:i>0?t(u/i*1e3)+" pp":"0.00 pp"})+\`
\`+o("calc_out.equity_dilution.row.investor_per_pp","• Investor $/pp:        "+(i>0&&u>0?r(i/u):"$0"),{cost:i>0&&u>0?r(i/u):"$0"})+\`
\`+o("calc_out.equity_dilution.row.pool_impact","• Pool Impact:         ~"+t(n-h)+"% additional from option pool",{impact:t(n-h)})+\`
\`+o("calc_out.equity_dilution.row.industry_benchmark_head","• Industry Benchmark: Seed 10-20%")+" | "+o("calc_out.equity_dilution.row.industry_benchmark_a","Series A 15-25%")+" | "+o("calc_out.equity_dilution.row.industry_benchmark_b","Series B 10-20%")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🩺 Founder Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(n>60?o("calc_out.equity_dilution.row.health_founder_strong","• 🟢 Founder retains "+t(n)+"% — strong control after this round.",{stake:t(n)})+\`
\`:n>=40?o("calc_out.equity_dilution.row.health_founder_minority","• 🟡 Founder at "+t(n)+"% — minority control. Watch for blocking rights.",{stake:t(n)})+\`
\`:n>=20?o("calc_out.equity_dilution.row.health_founder_losing_majority","• 🟠 Founder at "+t(n)+"% — losing majority. Negotiate board seats.",{stake:t(n)})+\`
\`:o("calc_out.equity_dilution.row.health_founder_minority_stake","• 🔴 Founder at "+t(n)+"% — minority stake. Investors likely control board.",{stake:t(n)})+\`
\`)+(u<=20?o("calc_out.equity_dilution.row.health_dilution_healthy","• 🟢 Round dilutes only "+t(u)+"% — within healthy seed/Series A range.",{dilution:t(u)})+\`
\`:u<=35?o("calc_out.equity_dilution.row.health_dilution_aggressive","• 🟡 Round dilutes "+t(u)+"% — aggressive but workable for late stages.",{dilution:t(u)})+\`
\`:o("calc_out.equity_dilution.row.health_dilution_excessive","• 🔴 Round dilutes "+t(u)+"% — excessive. Renegotiate valuation or raise less.",{dilution:t(u)})+\`
\`)+(w>0&&e>0?o("calc_out.equity_dilution.row.health_price_floor","• 🟢 Price/share "+q(w)+" sets floor for next round.",{price:q(w)})+\`
\`:"")+\`
🎯 Exit Value by Round:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+o("calc_out.equity_dilution.row.assuming_exit","Assuming "+r(c)+" exit (10x pre-money):",{valuation:r(c)})+\`
\`+o("calc_out.equity_dilution.row.founder_take","• Founder Take:           "+r(M)+"  ("+t(n)+"%)",{amount:r(M),stake:t(n)})+\`
\`+o("calc_out.equity_dilution.row.investor_take","• Investor Take:         "+r(y/100*c),{amount:r(y/100*c)})+\`
\`+o("calc_out.equity_dilution.row.with_option_pool","• With Option Pool:    Founder "+r(A)+"  ("+t(h)+"%)",{amount:r(A),stake:t(h)})+\`
\`+o("calc_out.equity_dilution.row.break_even_multiplier","• Break-Even Multiplier:  "+(i>0&&n>0?(i/.01/n).toFixed(1):"∞")+"x  (min exit for VC to clear 1% return)",{mult:i>0&&n>0?(i/.01/n).toFixed(1):"∞"})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ Dilution Threshold:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+o("calc_out.equity_dilution.row.loss_of_majority_control","• Loss of majority control at 50% stake")+\`
\`+o("calc_out.equity_dilution.row.founders_below_20","• Founders below 20% typically lose board seats")+\`
\`+o("calc_out.equity_dilution.row.current_founder_stake","• Current founder stake: "+t(n)+"%",{stake:t(n)})+\`
\`+(n>50?o("calc_out.equity_dilution.row.threshold_above_50","• 🟢 Above 50% — you control major decisions.")+\`
\`:n>20?o("calc_out.equity_dilution.row.threshold_below_50","• 🟡 Below 50% — investors have blocking rights on key votes.")+\`
\`:o("calc_out.equity_dilution.row.threshold_below_20","• 🔴 Below 20% — minority protection only. Investors effectively control company.")+\`
\`)+o("calc_out.equity_dilution.row.acceptable_next_round","• Acceptable next round: Dilution <25% to retain "+t(n*.75)+"% stake",{stake:t(n*.75)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If Scenarios:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+o("calc_out.equity_dilution.row.whatif_raise_half","• Raise half ($"+Math.round(i/2).toLocaleString()+"):  Dilution "+(f>0?t(i/2/(e+i/2)*100):"0.00")+"%  → Founder keeps "+t(100-i/2/(e+i/2)*100)+"%",{amount:Math.round(i/2).toLocaleString(),dilution:f>0?t(i/2/(e+i/2)*100):"0.00",stake:t(100-i/2/(e+i/2)*100)})+\`
\`+o("calc_out.equity_dilution.row.whatif_safe","• Raise via SAFE (no immediate dilution):  Convert later at discount (15-25%) — plan for additional 5-10% dilution at next round")+\`
\`+o("calc_out.equity_dilution.row.whatif_smaller_rounds","• Smaller rounds, twice:  Two $"+Math.round(i/2).toLocaleString()+" rounds → similar total dilution but more milestone-based",{amount:Math.round(i/2).toLocaleString()})+\`
\`+o("calc_out.equity_dilution.row.whatif_negotiate_valuation","• Negotiate valuation +25%:  Pre $"+Math.round(e*1.25).toLocaleString()+" → Dilution drops to "+(e*1.25+i>0?t(i/(e*1.25+i)*100):"0.00")+"%",{pre:Math.round(e*1.25).toLocaleString(),dilution:e*1.25+i>0?t(i/(e*1.25+i)*100):"0.00"})+\`
\`+o("calc_out.equity_dilution.row.whatif_smaller_pool","• Keep smaller option pool (5%):  Founder at "+t(l/(a+a*(5/95))*100)+"% vs current "+t(h)+"%",{stake:t(l/(a+a*(5/95))*100),current:t(h)})+\`

💡 Tip: \`+JSON.stringify(E));const D=[c*.5,c,c*2,c*5,c*10];for(let s=0;s<D.length;s++){const g=D[s],I=n/100*g,O=y/100*g;S.push(o("calc_out.equity_dilution.row.exit_head","Exit @ "+r(g)+": Founder "+r(I)+" ("+t(n)+"%)",{exit:r(g),founder:r(I),stake:t(n)})+" | "+o("calc_out.equity_dilution.row.exit_investor","Investor "+r(O)+" ("+t(y)+"%)",{investor:r(O),stake:t(y)}))}return S},m=function(_,e,i){var l=L(_);return Array.isArray(l)?l.join(\`
\`):String(l)};var $=v,N=x,R=m,o=tk,j='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',o=new Function("return "+j)(),L=function(_){return x(_)};return[m(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: 'solopreneur-equity-dilution-calculator',
  title: 'Equity Dilution Calculator',
  description: 'Model how investment rounds dilute founder equity. Calculate post-money valuation, investor ownership, founder control, and exit scenarios at different valuations.',
  inputs: [
    { name: 'companyValuation', label: 'Pre-Money Valuation ($)', placeholder: 'e.g. 5000000', type: 'number' },
    { name: 'investmentAmount', label: 'Investment Amount ($)', placeholder: 'e.g. 1000000', type: 'number' },
    { name: 'founderShares', label: 'Founder Shares Issued', placeholder: 'e.g. 10000000', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  // P140f-p3-T7: minimal Playbook 6 字段 template (Goal=该不该决策)
  // Goal 含"决策"+"该不该"双关键词 → 通过 T1 zod refine 校验
  playbook: {
    goal: '用户该不该接受这一轮的投资条款，还是先调整估值再谈',
    input: 'engine 定义的 inputs 字段',
    output: 'engine 定义的 generate() 返回数组',
    constraint: 'apply 引擎 inputs 时受实际场景约束',
    tool: '页面的「🧭 算完之后」决策区块（决策支持已由区块独占）',
    memory: 'v2.0 11 business domain benchmark + P140f Phase 4 主题簇',
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateEquityDilution(inputs);
  },
  staticExamples: [
    '📊 Equity Dilution Calculator\n\n$calc_out.equity_dilution.row.pre_money_valuation{"valuation":"$5,000,000"}|🏢 Pre-Money Valuation:  $5,000,000|\n$calc_out.equity_dilution.row.investment_amount{"amount":"$1,000,000"}|💰 Investment Amount:    $1,000,000|\n$calc_out.equity_dilution.row.founder_shares{"shares":"10,000,000"}|🏗️ Founder Shares (initial): 10,000,000|\n$calc_out.equity_dilution.row.price_per_share{"price":"0.50"}|💵 Price Per Share:      0.50|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💰 Cap Table Snapshot:\n$calc_out.equity_dilution.row.post_money_valuation{"valuation":"$6,000,000"}|• Post-Money Valuation:  $6,000,000|\n$calc_out.equity_dilution.row.total_shares_after{"shares":"12,000,000"}|• Total Shares (after): 12,000,000|\n$calc_out.equity_dilution.row.founder_ownership{"stake":"83.33","shares":"10,000,000"}|• Founder Ownership:    83.33%  (10,000,000 shares)|\n$calc_out.equity_dilution.row.investor_ownership{"stake":"16.67","shares":"2,000,000"}|• Investor Ownership:  16.67%  (2,000,000 shares)|\n$calc_out.equity_dilution.row.option_pool{"pool":"10.00","shares":"1,333,333"}|• Option Pool (10%):    10.00%  (1,333,333 shares reserved)|\n$calc_out.equity_dilution.row.founder_after_pool{"stake":"75.00"}|• Founder (after pool): 75.00%|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Dilution per Round:\n$calc_out.equity_dilution.row.founder_dilution{"dilution":"16.67","stake":"83.33"}|• Founder Dilution:      16.67%  (pre-investment: 100%, post: 83.33%)|\n$calc_out.equity_dilution.row.dilution_per_1k{"pp":"0.02 pp"}|• Dilution per $1K:    0.02 pp|\n$calc_out.equity_dilution.row.investor_per_pp{"cost":"$60,000"}|• Investor $/pp:        $60,000|\n$calc_out.equity_dilution.row.pool_impact{"impact":"8.33"}|• Pool Impact:         ~8.33% additional from option pool|\n$calc_out.equity_dilution.row.industry_benchmark_head|• Industry Benchmark: Seed 10-20%| | $calc_out.equity_dilution.row.industry_benchmark_a|Series A 15-25%| | $calc_out.equity_dilution.row.industry_benchmark_b|Series B 10-20%|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Founder Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.equity_dilution.row.health_founder_strong{"stake":"83.33"}|• 🟢 Founder retains 83.33% — strong control after this round.|\n$calc_out.equity_dilution.row.health_dilution_healthy{"dilution":"16.67"}|• 🟢 Round dilutes only 16.67% — within healthy seed/Series A range.|\n$calc_out.equity_dilution.row.health_price_floor{"price":"0.50"}|• 🟢 Price/share 0.50 sets floor for next round.|\n\n🎯 Exit Value by Round:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.equity_dilution.row.assuming_exit{"valuation":"$50,000,000"}|Assuming $50,000,000 exit (10x pre-money):|\n$calc_out.equity_dilution.row.founder_take{"amount":"$41,666,667","stake":"83.33"}|• Founder Take:           $41,666,667  (83.33%)|\n$calc_out.equity_dilution.row.investor_take{"amount":"$8,333,333"}|• Investor Take:         $8,333,333|\n$calc_out.equity_dilution.row.with_option_pool{"amount":"$37,500,001","stake":"75.00"}|• With Option Pool:    Founder $37,500,001  (75.00%)|\n$calc_out.equity_dilution.row.break_even_multiplier{"mult":"1200000.0"}|• Break-Even Multiplier:  1200000.0x  (min exit for VC to clear 1% return)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Dilution Threshold:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.equity_dilution.row.loss_of_majority_control|• Loss of majority control at 50% stake|\n$calc_out.equity_dilution.row.founders_below_20|• Founders below 20% typically lose board seats|\n$calc_out.equity_dilution.row.current_founder_stake{"stake":"83.33"}|• Current founder stake: 83.33%|\n$calc_out.equity_dilution.row.threshold_above_50|• 🟢 Above 50% — you control major decisions.|\n$calc_out.equity_dilution.row.acceptable_next_round{"stake":"62.50"}|• Acceptable next round: Dilution <25% to retain 62.50% stake|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.equity_dilution.row.whatif_raise_half{"amount":"500,000","dilution":"9.09","stake":"90.91"}|• Raise half ($500,000):  Dilution 9.09%  → Founder keeps 90.91%|\n$calc_out.equity_dilution.row.whatif_safe|• Raise via SAFE (no immediate dilution):  Convert later at discount (15-25%) — plan for additional 5-10% dilution at next round|\n$calc_out.equity_dilution.row.whatif_smaller_rounds{"amount":"500,000"}|• Smaller rounds, twice:  Two $500,000 rounds → similar total dilution but more milestone-based|\n$calc_out.equity_dilution.row.whatif_negotiate_valuation{"pre":"6,250,000","dilution":"13.79"}|• Negotiate valuation +25%:  Pre $6,250,000 → Dilution drops to 13.79%|\n$calc_out.equity_dilution.row.whatif_smaller_pool{"stake":"79.17","current":"75.00"}|• Keep smaller option pool (5%):  Founder at 79.17% vs current 75.00%|\n\n💡 Tip: {"code":"dilution_healthy","params":{"dilution":"16.67","founderStake":"83.33"}}\n$calc_out.equity_dilution.row.exit_head{"exit":"$25,000,000","founder":"$20,833,333","stake":"83.33"}|Exit @ $25,000,000: Founder $20,833,333 (83.33%)| | $calc_out.equity_dilution.row.exit_investor{"investor":"$4,166,667","stake":"16.67"}|Investor $4,166,667 (16.67%)|\n$calc_out.equity_dilution.row.exit_head{"exit":"$50,000,000","founder":"$41,666,667","stake":"83.33"}|Exit @ $50,000,000: Founder $41,666,667 (83.33%)| | $calc_out.equity_dilution.row.exit_investor{"investor":"$8,333,333","stake":"16.67"}|Investor $8,333,333 (16.67%)|\n$calc_out.equity_dilution.row.exit_head{"exit":"$100,000,000","founder":"$83,333,333","stake":"83.33"}|Exit @ $100,000,000: Founder $83,333,333 (83.33%)| | $calc_out.equity_dilution.row.exit_investor{"investor":"$16,666,667","stake":"16.67"}|Investor $16,666,667 (16.67%)|\n$calc_out.equity_dilution.row.exit_head{"exit":"$250,000,000","founder":"$208,333,333","stake":"83.33"}|Exit @ $250,000,000: Founder $208,333,333 (83.33%)| | $calc_out.equity_dilution.row.exit_investor{"investor":"$41,666,667","stake":"16.67"}|Investor $41,666,667 (16.67%)|\n$calc_out.equity_dilution.row.exit_head{"exit":"$500,000,000","founder":"$416,666,667","stake":"83.33"}|Exit @ $500,000,000: Founder $416,666,667 (83.33%)| | $calc_out.equity_dilution.row.exit_investor{"investor":"$83,333,333","stake":"16.67"}|Investor $83,333,333 (16.67%)|',
    'Exit @ $25,000,000: Founder $20,833,333 (83.33%) | Investor $4,166,667 (16.67%)',
    'Exit @ $50,000,000: Founder $41,666,667 (83.33%) | Investor $8,333,333 (16.67%)',
    'Exit @ $100,000,000: Founder $83,333,333 (83.33%) | Investor $16,666,667 (16.67%)',
    'Exit @ $500,000,000: Founder $416,666,667 (83.33%) | Investor $83,333,333 (16.67%)',
  ],
  faq: [
    { q: 'What is pre-money vs post-money valuation?', a: 'Pre-money valuation is what your company is worth before the investment. Post-money valuation = pre-money + investment amount. For example, if an investor puts in $1M at a $4M pre-money valuation, the post-money is $5M and the investor owns 20% ($1M/$5M). This distinction is critical: negotiating a $1M investment at a $5M valuation could mean $5M pre-money (investor gets 16.7%) or $5M post-money (investor gets 20%). Always clarify which you are discussing.' },
    { q: 'How much dilution is normal per round?', a: 'Seed rounds typically dilute founders 10-20%. Series A rounds dilute 15-25%. Series B and beyond dilute 10-20% each. After 3-4 rounds, founders often end up with 20-40% of the company. This is normal and expected — owning a smaller piece of a much larger pie is better than 100% of nothing. The key is raising enough to hit milestones that meaningfully increase valuation before the next round.' },
    { q: 'What about employee option pools?', a: 'Most investors require creating or expanding an employee option pool (typically 10-20%) before their investment. This dilution typically comes from the pre-money valuation and hits founders before the investor puts money in. A 15% option pool on a $5M pre-money effectively makes the pre-money $4.25M for founders. Always model option pool expansion alongside investment dilution to see the combined impact on your ownership.' },
    { q: 'How do convertible notes and SAFEs affect dilution?', a: 'Convertible notes and SAFEs delay dilution calculation until the next priced round. When they convert, they typically include a discount (10-25%) and sometimes a valuation cap. For example, a $500K SAFE with a $5M cap and 20% discount converts at the lower of the capped price or the discounted round price. This means early SAFE investors get more shares for their money, and founders bear additional dilution that was not visible at the time of the SAFE.' },
    { q: 'Can I avoid dilution entirely?', a: 'Yes, by bootstrapping and never taking investment. However, dilution is not inherently bad — it is the cost of capital that can accelerate growth. The key question is: will the investment increase the value of your remaining shares by more than the dilution cost? If $1M investment for 20% dilution helps you grow the company value from $5M to $20M, your 80% stake is now worth $16M (up from $5M). That is a great trade. Avoid dilution only when the capital would not meaningfully accelerate value creation.' },
    { q: "How much equity should I give up in a seed round?", a: "Typical seed: 10-25% dilution. Median: 15-20%. Below 10%: founders keep too much, investors uninterested. Above 25%: founders too diluted, less skin in game. Calculate: post-money valuation, your share = pre-money / post-money. For $5M pre, $2M raise: 40% post-money = founders own 60% post-money." },
    { q: "What is the difference between pre-money and post-money valuation?", a: "Pre-money valuation: company value before investment. Post-money = pre-money + investment. Dilution = investment / post-money. For $5M pre, $2M investment: $7M post-money. Investor gets 2/7 = 28.6%. Founders dilute 28.6%. Key: option pool refresh dilutes from pre-money (cost to founders)." },
    { q: "How does option pool refresh affect dilution?", a: "Option pool is reserved stock for future hires. Pre-money option pool: cost to founders. If pre-money is $5M and $1M option pool is added pre-money, then $2M investment: effective pre-money is $4M, $6M post-money. Investors own 33% (more than 28.6% without pool). Negotiate option pool post-money to avoid this." },
    { q: "What is the typical Series A dilution?", a: "Series A: 15-25% dilution. Median: 20%. Pre-money: $10-30M. Investment: $5-15M. Founders dilute 15-25%. Total dilution across all rounds: 40-60% from founder to exit. Series B: 15-20%. Series C: 10-15%. Late-stage: 5-10%. By IPO: founders typically own 10-30%." },
    { q: "What is the difference between primary and secondary dilution?", a: "Primary dilution: new shares issued (new investor buys). Secondary dilution: existing shares sold (no new shares, no cash to company). Founders selling secondary: cash to founders, no dilution. New investors mostly buy primary. Secondary is rare unless founders want liquidity. Primary = dilution. Secondary = transfer." },
    { q: "How do I model dilution across multiple rounds?", a: "Model: round 1 pre-money V1, raise X1, % to investor = X1/(V1+X1). New founder %. Round 2 pre-money V2 (post-money V1 after uplifted valuation, typically 2-3x), raise X2, % to investor. Multiply: round 1 × round 2 × ... = final founder %. Add: employee pool (10-15% reserved). Excel: per-round ownership table." },
    { q: "What is a SAFE vs priced round?", a: "SAFE: Simple Agreement for Future Equity. No price set now (valuation cap, discount, or MFN). Converts at next priced round. Lightweight, no preferred stock. Priced round: actual valuation, preferred stock, board seats, protective provisions. Seed typically uses SAFEs. Series A typically priced. SAFE delays dilution but creates future pricing risk." },
    { q: "How do I avoid excessive dilution?", a: "Tactics: 1) Raise only what you need (avoid over-raising), 2) Negotiate option pool post-money, 3) Bootstrap as long as possible (revenue funds growth), 4) Use SAFEs for early rounds, 5) Track milestones (lower burn = higher valuation = less dilution). Target: <50% total dilution before liquidity event. Above 60%: founders lose control." },
  ],
  howToUse: [
    'Enter your company\'s pre-money valuation (what it is worth before the investment).',
    'Enter the investment amount you are raising.',
    'Enter the total founder shares currently issued.',
    'Review the post-money valuation, founder/investor ownership, and option pool impact.',
    'Check the founder health tier and exit scenario projections.',
    'See exactly what percentage the investor gets and how much your ownership is diluted.',
    'Scroll down to compare exits across 5 different valuation multiples.',
  ],
  engineKey: true,
};

registerEngine(engine);

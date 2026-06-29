import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

function calculateEquityDilution(inputs: Record<string, string>): string[] {
  const preMoneyValuation = parseFloat(inputs.companyValuation) || 0;
  const investmentAmount = parseFloat(inputs.investmentAmount) || 0;
  const founderShares = parseInt(inputs.founderShares) || 0;
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

  results.push(
    '📊 Equity Dilution Calculator\n\n' +
    '🏢 Pre-Money Valuation:  ' + fmt(preMoneyValuation) + '\n' +
    '💰 Investment Amount:    ' + fmt(investmentAmount) + '\n' +
    '🏗️ Founder Shares (initial): ' + loc(founderShares) + '\n' +
    '💵 Price Per Share:      ' + fmt2(pricePerShare) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💰 Cap Table Snapshot:\n' +
    '• Post-Money Valuation:  ' + fmt(postMoneyValuation) + '\n' +
    '• Total Shares (after): ' + loc(totalSharesAfter) + '\n' +
    '• Founder Ownership:    ' + pct2(founderOwnershipAfter) + '%  (' + loc(founderShares) + ' shares)\n' +
    '• Investor Ownership:  ' + pct2(investorOwnershipPct) + '%  (' + loc(investorShares) + ' shares)\n' +
    '• Option Pool (10%):    ' + pct2(100 * optionPoolShares / (totalSharesAfter + optionPoolShares)) + '%  (' + loc(optionPoolShares) + ' shares reserved)\n' +
    '• Founder (after pool): ' + pct2(founderOwnershipWithPool) + '%\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Dilution per Round:\n' +
    '• Founder Dilution:      ' + pct2(dilutionPct) + '%  (pre-investment: 100%, post: ' + pct2(founderOwnershipAfter) + '%)\n' +
    '• Dilution per $1K:    ' + (investmentAmount > 0 ? pct2((dilutionPct / investmentAmount) * 1000) + ' pp' : '0.00 pp') + '\n' +
    '• Investor $/pp:        ' + (investmentAmount > 0 && dilutionPct > 0 ? fmt(investmentAmount / dilutionPct) : '$0') + '\n' +
    '• Pool Impact:         ~' + pct2(founderOwnershipAfter - founderOwnershipWithPool) + '% additional from option pool\n' +
    '• Industry Benchmark: Seed 10-20% | Series A 15-25% | Series B 10-20%\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Founder Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (founderOwnershipAfter > 60
      ? '• 🟢 Founder retains ' + pct2(founderOwnershipAfter) + '% — strong control after this round.\n'
      : founderOwnershipAfter >= 40
      ? '• 🟡 Founder at ' + pct2(founderOwnershipAfter) + '% — minority control. Watch for blocking rights.\n'
      : founderOwnershipAfter >= 20
      ? '• 🟠 Founder at ' + pct2(founderOwnershipAfter) + '% — losing majority. Negotiate board seats.\n'
      : '• 🔴 Founder at ' + pct2(founderOwnershipAfter) + '% — minority stake. Investors likely control board.\n') +
    (dilutionPct <= 20
      ? '• 🟢 Round dilutes only ' + pct2(dilutionPct) + '% — within healthy seed/Series A range.\n'
      : dilutionPct <= 35
      ? '• 🟡 Round dilutes ' + pct2(dilutionPct) + '% — aggressive but workable for late stages.\n'
      : '• 🔴 Round dilutes ' + pct2(dilutionPct) + '% — excessive. Renegotiate valuation or raise less.\n') +
    (pricePerShare > 0 && preMoneyValuation > 0
      ? '• 🟢 Price/share ' + fmt2(pricePerShare) + ' sets floor for next round.\n'
      : '') +
    '\n🎯 Exit Value by Round:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'Assuming ' + fmt(exitValuation) + ' exit (10x pre-money):\n' +
    '• Founder Take:           ' + fmt(founderExitProceeds) + '  (' + pct2(founderOwnershipAfter) + '%)\n' +
    '• Investor Take:         ' + fmt((investorOwnershipPct / 100) * exitValuation) + '\n' +
    '• With Option Pool:    Founder ' + fmt(founderExitProceedsDiluted) + '  (' + pct2(founderOwnershipWithPool) + '%)\n' +
    '• Break-Even Multiplier:  ' + (investmentAmount > 0 && founderOwnershipAfter > 0 ? ((investmentAmount / 0.01) / founderOwnershipAfter).toFixed(1) : '∞') + 'x  (min exit for VC to clear 1% return)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Dilution Threshold:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Loss of majority control at 50% stake\n' +
    '• Founders below 20% typically lose board seats\n' +
    '• Current founder stake: ' + pct2(founderOwnershipAfter) + '%\n' +
    (founderOwnershipAfter > 50
      ? '• 🟢 Above 50% — you control major decisions.\n'
      : founderOwnershipAfter > 20
      ? '• 🟡 Below 50% — investors have blocking rights on key votes.\n'
      : '• 🔴 Below 20% — minority protection only. Investors effectively control company.\n') +
    '• Acceptable next round: Dilution <25% to retain ' + pct2(founderOwnershipAfter * 0.75) + '% stake\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Raise half ($' + Math.round(investmentAmount / 2).toLocaleString() + '):  Dilution ' + (postMoneyValuation > 0 ? pct2((investmentAmount / 2) / (preMoneyValuation + (investmentAmount / 2)) * 100) : '0.00') + '%  → Founder keeps ' + pct2(100 - (investmentAmount / 2) / (preMoneyValuation + (investmentAmount / 2)) * 100) + '%\n' +
    '• Raise via SAFE (no immediate dilution):  Convert later at discount (15-25%) — plan for additional 5-10% dilution at next round\n' +
    '• Smaller rounds, twice:  Two $' + Math.round(investmentAmount / 2).toLocaleString() + ' rounds → similar total dilution but more milestone-based\n' +
    '• Negotiate valuation +25%:  Pre $' + Math.round(preMoneyValuation * 1.25).toLocaleString() + ' → Dilution drops to ' + (preMoneyValuation * 1.25 + investmentAmount > 0 ? pct2(investmentAmount / (preMoneyValuation * 1.25 + investmentAmount) * 100) : '0.00') + '%\n' +
    '• Keep smaller option pool (5%):  Founder at ' + pct2(founderShares / (totalSharesAfter + totalSharesAfter * (5 / (100 - 5))) * 100) + '% vs current ' + pct2(founderOwnershipWithPool) + '%\n\n' +
    '💡 Tip: The price you negotiate today sets the floor for your next round. A low pre-money means you dilute more AND set a low anchor for the next raise. Even a 25% higher valuation saves you ~' + pct2(investmentAmount > 0 ? (investmentAmount / (preMoneyValuation * 1.25 + investmentAmount)) * 100 - investorOwnershipPct : 0) + '% dilution and signals momentum to future investors.',
  );

  const exitScenarios = [exitValuation * 0.5, exitValuation, exitValuation * 2, exitValuation * 5, exitValuation * 10];
  for (let i = 0; i < exitScenarios.length; i++) {
    const ev = exitScenarios[i];
    const founderTake = (founderOwnershipAfter / 100) * ev;
    const investorTake = (investorOwnershipPct / 100) * ev;
    results.push(
      'Exit @ ' + fmt(ev) + ': Founder ' + fmt(founderTake) + ' (' + pct2(founderOwnershipAfter) + '%) | Investor ' + fmt(investorTake) + ' (' + pct2(investorOwnershipPct) + '%)',
    );
  }

  return results;
}

const customFn =
  "var pmv=parseFloat(inputs.companyValuation)||0;" +
  "var inv=parseFloat(inputs.investmentAmount)||0;" +
  "var fs=parseInt(inputs.founderShares)||0;" +
  "var postv=pmv+inv;" +
  "var ioPct=postv>0?(inv/postv)*100:0;" +
  "var ish=pmv>0?Math.round(fs*(inv/pmv)):0;" +
  "var tsa=fs+ish;" +
  "var foPct=tsa>0?(fs/tsa)*100:100;" +
  "var dil=100-foPct;" +
  "var pps=fs>0?pmv/fs:0;" +
  "var opp=10;" +
  "var opsh=Math.round(tsa*(opp/(100-opp)));" +
  "var foPool=tsa+opsh>0?(fs/(tsa+opsh))*100:foPct;" +
  "var ev=pmv*10;" +
  "var fExit=(foPct/100)*ev;" +
  "var fExitD=(foPool/100)*ev;" +
  "function fmt(n){return '$'+Math.round(n).toLocaleString()}" +
  "function fmt2(n){return n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}" +
  "function pct2(n){return n.toFixed(2)}" +
  "function pct1(n){return n.toFixed(1)}" +
  "function loc(n){return n.toLocaleString()}" +
  "var results=[];" +
  "var r='';" +
  "r+='\\uD83D\\uDCCA Equity Dilution Calculator\\n\\n';" +
  "r+='\\uD83C\\uDFE2 Pre-Money Valuation:  '+fmt(pmv)+'\\n';" +
  "r+='\\uD83D\\uDCB0 Investment Amount:    '+fmt(inv)+'\\n';" +
  "r+='\\uD83C\\uDFD7\\uFE0F Founder Shares (initial): '+loc(fs)+'\\n';" +
  "r+='\\uD83D\\uDCB5 Price Per Share:      '+fmt2(pps)+'\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCB0 Cap Table Snapshot:\\n';" +
  "r+='\\u2022 Post-Money Valuation:  '+fmt(postv)+'\\n';" +
  "r+='\\u2022 Total Shares (after): '+loc(tsa)+'\\n';" +
  "r+='\\u2022 Founder Ownership:    '+pct2(foPct)+'%  ('+loc(fs)+' shares)\\n';" +
  "r+='\\u2022 Investor Ownership:  '+pct2(ioPct)+'%  ('+loc(ish)+' shares)\\n';" +
  "r+='\\u2022 Option Pool (10%):    '+pct2(100*opsh/(tsa+opsh))+'%  ('+loc(opsh)+' shares reserved)\\n';" +
  "r+='\\u2022 Founder (after pool): '+pct2(foPool)+'%\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCD0 Dilution per Round:\\n';" +
  "r+='\\u2022 Founder Dilution:      '+pct2(dil)+'%  (pre-investment: 100%, post: '+pct2(foPct)+'%)\\n';" +
  "r+='\\u2022 Dilution per $1K:    '+(inv>0?pct2((dil/inv)*1000)+' pp':'0.00 pp')+'\\n';" +
  "r+='\\u2022 Investor $/pp:        '+(inv>0&&dil>0?fmt(inv/dil):'$0')+'\\n';" +
  "r+='\\u2022 Pool Impact:         ~'+pct2(foPct-foPool)+'% additional from option pool\\n';" +
  "r+='\\u2022 Industry Benchmark: Seed 10-20% | Series A 15-25% | Series B 10-20%\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83E\\uDE7A Founder Health:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "if(foPct>60){r+='\\u2022 \\uD83D\\uDFE2 Founder retains '+pct2(foPct)+'% \\u2014 strong control after this round.\\n';}" +
  "else if(foPct>=40){r+='\\u2022 \\uD83D\\uDFE1 Founder at '+pct2(foPct)+'% \\u2014 minority control. Watch for blocking rights.\\n';}" +
  "else if(foPct>=20){r+='\\u2022 \\uD83D\\uDFE0 Founder at '+pct2(foPct)+'% \\u2014 losing majority. Negotiate board seats.\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDD34 Founder at '+pct2(foPct)+'% \\u2014 minority stake. Investors likely control board.\\n';}" +
  "if(dil<=20){r+='\\u2022 \\uD83D\\uDFE2 Round dilutes only '+pct2(dil)+'% \\u2014 within healthy seed/Series A range.\\n';}" +
  "else if(dil<=35){r+='\\u2022 \\uD83D\\uDFE1 Round dilutes '+pct2(dil)+'% \\u2014 aggressive but workable for late stages.\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDD34 Round dilutes '+pct2(dil)+'% \\u2014 excessive. Renegotiate valuation or raise less.\\n';}" +
  "if(pps>0&&pmv>0){r+='\\u2022 \\uD83D\\uDFE2 Price/share '+fmt2(pps)+' sets floor for next round.\\n';}" +
  "r+='\\n\\uD83C\\uDFAF Exit Value by Round:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='Assuming '+fmt(ev)+' exit (10x pre-money):\\n';" +
  "r+='\\u2022 Founder Take:           '+fmt(fExit)+'  ('+pct2(foPct)+'%)\\n';" +
  "r+='\\u2022 Investor Take:         '+fmt((ioPct/100)*ev)+'\\n';" +
  "r+='\\u2022 With Option Pool:    Founder '+fmt(fExitD)+'  ('+pct2(foPool)+'%)\\n';" +
  "r+='\\u2022 Break-Even Multiplier:  '+(inv>0&&foPct>0?((inv/0.01)/foPct).toFixed(1):'\\u221E')+'x  (min exit for VC to clear 1% return)\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\u2696\\uFE0F Dilution Threshold:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Loss of majority control at 50% stake\\n';" +
  "r+='\\u2022 Founders below 20% typically lose board seats\\n';" +
  "r+='\\u2022 Current founder stake: '+pct2(foPct)+'%\\n';" +
  "if(foPct>50){r+='\\u2022 \\uD83D\\uDFE2 Above 50% \\u2014 you control major decisions.\\n';}" +
  "else if(foPct>20){r+='\\u2022 \\uD83D\\uDFE1 Below 50% \\u2014 investors have blocking rights on key votes.\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDD34 Below 20% \\u2014 minority protection only. Investors effectively control company.\\n';}" +
  "r+='\\u2022 Acceptable next round: Dilution <25% to retain '+pct2(foPct*0.75)+'% stake\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Raise half ($'+Math.round(inv/2).toLocaleString()+'):  Dilution '+(postv>0?pct2((inv/2)/(pmv+(inv/2))*100):'0.00')+'%  \\u2192 Founder keeps '+pct2(100-(inv/2)/(pmv+(inv/2))*100)+'%\\n';" +
  "r+='\\u2022 Raise via SAFE (no immediate dilution):  Convert later at discount (15-25%) \\u2014 plan for additional 5-10% dilution at next round\\n';" +
  "r+='\\u2022 Smaller rounds, twice:  Two $'+Math.round(inv/2).toLocaleString()+' rounds \\u2192 similar total dilution but more milestone-based\\n';" +
  "r+='\\u2022 Negotiate valuation +25%:  Pre $'+Math.round(pmv*1.25).toLocaleString()+' \\u2192 Dilution drops to '+(pmv*1.25+inv>0?pct2(inv/(pmv*1.25+inv)*100):'0.00')+'%\\n';" +
  "r+='\\u2022 Keep smaller option pool (5%):  Founder at '+pct2(fs/(tsa+tsa*(5/(100-5)))*100)+'% vs current '+pct2(foPool)+'%\\n\\n';" +
  "r+='\\uD83D\\uDCA1 Tip: The price you negotiate today sets the floor for your next round. A low pre-money means you dilute more AND set a low anchor for the next raise. Even a 25% higher valuation saves you ~'+pct2(inv>0?(inv/(pmv*1.25+inv))*100-ioPct:0)+'% dilution and signals momentum to future investors.';" +
  "results.push(r);" +
  "var exs=[ev*0.5,ev,ev*2,ev*5,ev*10];" +
  "for(var i=0;i<exs.length;i++){" +
  "var e=exs[i];" +
  "var ft=(foPct/100)*e;" +
  "var it=(ioPct/100)*e;" +
  "results.push('Exit @ '+fmt(e)+': Founder '+fmt(ft)+' ('+pct2(foPct)+'%) | Investor '+fmt(it)+' ('+pct2(ioPct)+'%)');" +
  "}" +
  "return results;";

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
  generate(inputs: Record<string, string>): string[] {
    return calculateEquityDilution(inputs);
  },
  staticExamples: [
    '📊 Equity Dilution Calculator\n\n🏢 Pre-Money Valuation:  $5,000,000\n💰 Investment Amount:    $1,000,000\n🏗️ Founder Shares (initial): 10,000,000\n💵 Price Per Share:      0.50\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💰 Cap Table Snapshot:\n• Post-Money Valuation:  $6,000,000\n• Total Shares (after): 12,000,000\n• Founder Ownership:    83.33%  (10,000,000 shares)\n• Investor Ownership:  16.67%  (2,000,000 shares)\n• Option Pool (10%):    10.00%  (1,333,333 shares reserved)\n• Founder (after pool): 75.00%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Dilution per Round:\n• Founder Dilution:      16.67%  (pre-investment: 100%, post: 83.33%)\n• Dilution per $1K:    0.02 pp\n• Investor $/pp:        $60,000\n• Pool Impact:         ~8.33% additional from option pool\n• Industry Benchmark: Seed 10-20% | Series A 15-25% | Series B 10-20%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Founder Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 Founder retains 83.33% — strong control after this round.\n• 🟢 Round dilutes only 16.67% — within healthy seed/Series A range.\n• 🟢 Price/share 0.50 sets floor for next round.\n\n🎯 Exit Value by Round:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nAssuming $50,000,000 exit (10x pre-money):\n• Founder Take:           $41,666,667  (83.33%)\n• Investor Take:         $8,333,333\n• With Option Pool:    Founder $37,500,001  (75.00%)\n• Break-Even Multiplier:  1200000.0x  (min exit for VC to clear 1% return)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Dilution Threshold:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Loss of majority control at 50% stake\n• Founders below 20% typically lose board seats\n• Current founder stake: 83.33%\n• 🟢 Above 50% — you control major decisions.\n• Acceptable next round: Dilution <25% to retain 62.50% stake\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Raise half ($500,000):  Dilution 9.09%  → Founder keeps 90.91%\n• Raise via SAFE (no immediate dilution):  Convert later at discount (15-25%) — plan for additional 5-10% dilution at next round\n• Smaller rounds, twice:  Two $500,000 rounds → similar total dilution but more milestone-based\n• Negotiate valuation +25%:  Pre $6,250,000 → Dilution drops to 13.79%\n• Keep smaller option pool (5%):  Founder at 79.17% vs current 75.00%\n\n💡 Tip: The price you negotiate today sets the floor for your next round. A low pre-money means you dilute more AND set a low anchor for the next raise. Even a 25% higher valuation saves you ~-2.87% dilution and signals momentum to future investors.\nExit @ $25,000,000: Founder $20,833,333 (83.33%) | Investor $4,166,667 (16.67%)\nExit @ $50,000,000: Founder $41,666,667 (83.33%) | Investor $8,333,333 (16.67%)\nExit @ $100,000,000: Founder $83,333,333 (83.33%) | Investor $16,666,667 (16.67%)\nExit @ $250,000,000: Founder $208,333,333 (83.33%) | Investor $41,666,667 (16.67%)\nExit @ $500,000,000: Founder $416,666,667 (83.33%) | Investor $83,333,333 (16.67%)',
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
};

registerEngine(engine);

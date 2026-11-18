import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

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
    '💡 Tip: ' + JSON.stringify(dilutionTip)
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
  `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let m=function(l){return Number.isNaN(l)?0:Math.max(0,l)},k=function(l){const e=m(parseFloat(l.companyValuation)||0),t=m(parseFloat(l.investmentAmount)||0),r=m(parseInt(l.founderShares)||0),y=[],f=e+t,v=f>0?t/f*100:0,P=e>0?Math.round(r*(t/e)):0,u=r+P,o=u>0?r/u*100:100,s=100-o,S=r>0?e/r:0,b=10,d=Math.round(u*(b/(100-b))),p=u+d>0?r/(u+d)*100:o,c=e*10,D=o/100*c,M=p/100*c,a=i=>"$"+Math.round(i).toLocaleString(),_=i=>i.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}),n=i=>i.toFixed(2),L=i=>i.toFixed(1),h=i=>i.toLocaleString(),g={dilution:n(s),founderStake:n(o)},I=s<=20?{code:"dilution_healthy",params:g}:s<=35?{code:"dilution_aggressive",params:g}:{code:"dilution_excessive",params:g};y.push(\`📊 Equity Dilution Calculator

🏢 Pre-Money Valuation:  \`+a(e)+\`
💰 Investment Amount:    \`+a(t)+\`
🏗️ Founder Shares (initial): \`+h(r)+\`
💵 Price Per Share:      \`+_(S)+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Cap Table Snapshot:
• Post-Money Valuation:  \`+a(f)+\`
• Total Shares (after): \`+h(u)+\`
• Founder Ownership:    \`+n(o)+"%  ("+h(r)+\` shares)
• Investor Ownership:  \`+n(v)+"%  ("+h(P)+\` shares)
• Option Pool (10%):    \`+n(100*d/(u+d))+"%  ("+h(d)+\` shares reserved)
• Founder (after pool): \`+n(p)+\`%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 Dilution per Round:
• Founder Dilution:      \`+n(s)+"%  (pre-investment: 100%, post: "+n(o)+\`%)
• Dilution per $1K:    \`+(t>0?n(s/t*1e3)+" pp":"0.00 pp")+\`
• Investor $/pp:        \`+(t>0&&s>0?a(t/s):"$0")+\`
• Pool Impact:         ~\`+n(o-p)+\`% additional from option pool
• Industry Benchmark: Seed 10-20% | Series A 15-25% | Series B 10-20%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🩺 Founder Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(o>60?"• 🟢 Founder retains "+n(o)+\`% — strong control after this round.
\`:o>=40?"• 🟡 Founder at "+n(o)+\`% — minority control. Watch for blocking rights.
\`:o>=20?"• 🟠 Founder at "+n(o)+\`% — losing majority. Negotiate board seats.
\`:"• 🔴 Founder at "+n(o)+\`% — minority stake. Investors likely control board.
\`)+(s<=20?"• 🟢 Round dilutes only "+n(s)+\`% — within healthy seed/Series A range.
\`:s<=35?"• 🟡 Round dilutes "+n(s)+\`% — aggressive but workable for late stages.
\`:"• 🔴 Round dilutes "+n(s)+\`% — excessive. Renegotiate valuation or raise less.
\`)+(S>0&&e>0?"• 🟢 Price/share "+_(S)+\` sets floor for next round.
\`:"")+\`
🎯 Exit Value by Round:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assuming \`+a(c)+\` exit (10x pre-money):
• Founder Take:           \`+a(D)+"  ("+n(o)+\`%)
• Investor Take:         \`+a(v/100*c)+\`
• With Option Pool:    Founder \`+a(M)+"  ("+n(p)+\`%)
• Break-Even Multiplier:  \`+(t>0&&o>0?(t/.01/o).toFixed(1):"∞")+\`x  (min exit for VC to clear 1% return)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ Dilution Threshold:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Loss of majority control at 50% stake
• Founders below 20% typically lose board seats
• Current founder stake: \`+n(o)+\`%
\`+(o>50?\`• 🟢 Above 50% — you control major decisions.
\`:o>20?\`• 🟡 Below 50% — investors have blocking rights on key votes.
\`:\`• 🔴 Below 20% — minority protection only. Investors effectively control company.
\`)+"• Acceptable next round: Dilution <25% to retain "+n(o*.75)+\`% stake

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If Scenarios:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Raise half ($\`+Math.round(t/2).toLocaleString()+"):  Dilution "+(f>0?n(t/2/(e+t/2)*100):"0.00")+"%  → Founder keeps "+n(100-t/2/(e+t/2)*100)+\`%
• Raise via SAFE (no immediate dilution):  Convert later at discount (15-25%) — plan for additional 5-10% dilution at next round
• Smaller rounds, twice:  Two $\`+Math.round(t/2).toLocaleString()+\` rounds → similar total dilution but more milestone-based
• Negotiate valuation +25%:  Pre $\`+Math.round(e*1.25).toLocaleString()+" → Dilution drops to "+(e*1.25+t>0?n(t/(e*1.25+t)*100):"0.00")+\`%
• Keep smaller option pool (5%):  Founder at \`+n(r/(u+u*(5/95))*100)+"% vs current "+n(p)+\`%

💡 Tip: \`+JSON.stringify(I));const A=[c*.5,c,c*2,c*5,c*10];for(let i=0;i<A.length;i++){const F=A[i],T=o/100*F,E=v/100*F;y.push("Exit @ "+a(F)+": Founder "+a(T)+" ("+n(o)+"%) | Investor "+a(E)+" ("+n(v)+"%)")}return y},x=function(l,e,t){var r=w(l);return Array.isArray(r)?r.join(\`
\`):String(r)};var O=m,R=k,V=x,w=function(l){return k(l)};return[x(inputs,pick,fill)]}finally{}
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
    '📊 Equity Dilution Calculator\n\n🏢 Pre-Money Valuation:  $5,000,000\n💰 Investment Amount:    $1,000,000\n🏗️ Founder Shares (initial): 10,000,000\n💵 Price Per Share:      0.50\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💰 Cap Table Snapshot:\n• Post-Money Valuation:  $6,000,000\n• Total Shares (after): 12,000,000\n• Founder Ownership:    83.33%  (10,000,000 shares)\n• Investor Ownership:  16.67%  (2,000,000 shares)\n• Option Pool (10%):    10.00%  (1,333,333 shares reserved)\n• Founder (after pool): 75.00%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Dilution per Round:\n• Founder Dilution:      16.67%  (pre-investment: 100%, post: 83.33%)\n• Dilution per $1K:    0.02 pp\n• Investor $/pp:        $60,000\n• Pool Impact:         ~8.33% additional from option pool\n• Industry Benchmark: Seed 10-20% | Series A 15-25% | Series B 10-20%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Founder Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 Founder retains 83.33% — strong control after this round.\n• 🟢 Round dilutes only 16.67% — within healthy seed/Series A range.\n• 🟢 Price/share 0.50 sets floor for next round.\n\n🎯 Exit Value by Round:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nAssuming $50,000,000 exit (10x pre-money):\n• Founder Take:           $41,666,667  (83.33%)\n• Investor Take:         $8,333,333\n• With Option Pool:    Founder $37,500,001  (75.00%)\n• Break-Even Multiplier:  1200000.0x  (min exit for VC to clear 1% return)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Dilution Threshold:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Loss of majority control at 50% stake\n• Founders below 20% typically lose board seats\n• Current founder stake: 83.33%\n• 🟢 Above 50% — you control major decisions.\n• Acceptable next round: Dilution <25% to retain 62.50% stake\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Raise half ($500,000):  Dilution 9.09%  → Founder keeps 90.91%\n• Raise via SAFE (no immediate dilution):  Convert later at discount (15-25%) — plan for additional 5-10% dilution at next round\n• Smaller rounds, twice:  Two $500,000 rounds → similar total dilution but more milestone-based\n• Negotiate valuation +25%:  Pre $6,250,000 → Dilution drops to 13.79%\n• Keep smaller option pool (5%):  Founder at 79.17% vs current 75.00%\n\n💡 Tip: {"code":"dilution_healthy","params":{"dilution":"16.67","founderStake":"83.33"}}\nExit @ $25,000,000: Founder $20,833,333 (83.33%) | Investor $4,166,667 (16.67%)\nExit @ $50,000,000: Founder $41,666,667 (83.33%) | Investor $8,333,333 (16.67%)\nExit @ $100,000,000: Founder $83,333,333 (83.33%) | Investor $16,666,667 (16.67%)\nExit @ $250,000,000: Founder $208,333,333 (83.33%) | Investor $41,666,667 (16.67%)\nExit @ $500,000,000: Founder $416,666,667 (83.33%) | Investor $83,333,333 (16.67%)',
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

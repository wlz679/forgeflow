import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateEquityDilution(inputs: Record<string, string>): string[] {
  const preMoneyValuation = parseFloat(inputs.companyValuation) || 0;
  const investmentAmount = parseFloat(inputs.investmentAmount) || 0;
  const founderShares = parseInt(inputs.founderShares) || 0;
  const results: string[] = [];

  const postMoneyValuation = preMoneyValuation + investmentAmount;
  const investorOwnershipPct = postMoneyValuation > 0 ? (investmentAmount / postMoneyValuation) * 100 : 0;
  const investorShares = postMoneyValuation > 0 ? Math.round(founderShares * (investmentAmount / preMoneyValuation)) : 0;
  const totalSharesAfter = founderShares + investorShares;
  const founderOwnershipAfter = totalSharesAfter > 0 ? (founderShares / totalSharesAfter) * 100 : 100;
  const dilutionPct = 100 - founderOwnershipAfter;
  const founderSharesAfter = founderShares;
  const pricePerShare = founderShares > 0 ? preMoneyValuation / founderShares : 0;

  const loc = (n: number) => '$' + n.toLocaleString();
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (n: number) => n.toFixed(2);

  results.push(
    '📊 Equity Dilution Analysis\n\n' +
    '🏢 Pre-Money Valuation: ' + loc(preMoneyValuation) + '\n' +
    '💰 Investment Amount: ' + loc(investmentAmount) + '\n' +
    '🏗️ Founder Shares (initial): ' + founderShares.toLocaleString() + '\n' +
    '📈 Price Per Share: ' + fmt(pricePerShare) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🚀 Post-Money Valuation: ' + loc(postMoneyValuation) + '\n' +
    '🤝 Investor Ownership: ' + pct(investorOwnershipPct) + '% (' + investorShares.toLocaleString() + ' shares)\n' +
    '👤 Founder Ownership After: ' + pct(founderOwnershipAfter) + '% (' + founderSharesAfter.toLocaleString() + ' shares)\n' +
    '📉 Founder Dilution: ' + pct(dilutionPct) + '%\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Cap Table:\n' +
    '• Total Shares: ' + totalSharesAfter.toLocaleString() + '\n' +
    '• Founder: ' + founderSharesAfter.toLocaleString() + ' shares (' + pct(founderOwnershipAfter) + '%)\n' +
    '• Investor: ' + investorShares.toLocaleString() + ' shares (' + pct(investorOwnershipPct) + '%)\n\n' +
    '💡 At ' + fmt(pricePerShare) + '/share, each additional ' + founderShares.toLocaleString() + ' shares of employee option pool would dilute founders by an additional ~' + pct(100 - (founderShares / (totalSharesAfter + founderShares * 0.1)) * 100) + '%.',
  );

  const investmentAmounts = [50000, 250000, 500000, 2000000, 10000000];
  for (let i = 0; i < investmentAmounts.length; i++) {
    const inv = investmentAmounts[i];
    const post = preMoneyValuation + inv;
    const ownPct = post > 0 ? (inv / post) * 100 : 0;
    const invShares = preMoneyValuation > 0 ? Math.round(founderShares * (inv / preMoneyValuation)) : 0;
    const totalSh = founderShares + invShares;
    const fOwnPct = totalSh > 0 ? (founderShares / totalSh) * 100 : 100;
    const dil = 100 - fOwnPct;
    results.push(
      'Comparison: Invest ' + loc(inv) + ' at ' + loc(preMoneyValuation) + ' val → Investor gets ' + pct(ownPct) + '% | Founder keeps ' + pct(fOwnPct) + '% | Dilution: ' + pct(dil) + '%',
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
  "var ish=postv>0?Math.round(fs*(inv/pmv)):0;" +
  "var tsa=fs+ish;" +
  "var foPct=tsa>0?(fs/tsa)*100:100;" +
  "var dil=100-foPct;" +
  "var pps=fs>0?pmv/fs:0;" +
  "function loc(n){return '$'+n.toLocaleString()}" +
  "function fmt(n){return n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}" +
  "function pct(n){return n.toFixed(2)}" +
  "var results=[];" +
  "results.push(" +
  "'\\uD83D\\uDCCA Equity Dilution Analysis\\n\\n" +
  "\\uD83C\\uDFE2 Pre-Money Valuation: '+loc(pmv)+'\\n" +
  "\\uD83D\\uDCB0 Investment Amount: '+loc(inv)+'\\n" +
  "\\uD83C\\uDFD7\\uFE0F Founder Shares (initial): '+fs.toLocaleString()+'\\n" +
  "\\uD83D\\uDCC8 Price Per Share: '+fmt(pps)+'\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\uD83D\\uDE80 Post-Money Valuation: '+loc(postv)+'\\n" +
  "\\uD83E\\uDD1D Investor Ownership: '+pct(ioPct)+'% ('+ish.toLocaleString()+' shares)\\n" +
  "\\uD83D\\uDC64 Founder Ownership After: '+pct(foPct)+'% ('+fs.toLocaleString()+' shares)\\n" +
  "\\uD83D\\uDCC9 Founder Dilution: '+pct(dil)+'%\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\uD83D\\uDCCA Cap Table:\\n" +
  "\\u2022 Total Shares: '+tsa.toLocaleString()+'\\n" +
  "\\u2022 Founder: '+fs.toLocaleString()+' shares ('+pct(foPct)+'%)\\n" +
  "\\u2022 Investor: '+ish.toLocaleString()+' shares ('+pct(ioPct)+'%)\\n\\n" +
  "\\uD83D\\uDCA1 At '+fmt(pps)+'/share, each additional '+fs.toLocaleString()+' shares of employee option pool would dilute founders by an additional ~'+pct(100-(fs/(tsa+fs*0.1))*100)+'%.'" +
  ");" +
  "var invAmts=[50000,250000,500000,2000000,10000000];" +
  "for(var i=0;i<invAmts.length;i++){" +
  "var ia=invAmts[i];" +
  "var p=pmv+ia;" +
  "var op=p>0?(ia/p)*100:0;" +
  "var is=p>0?Math.round(fs*(ia/pmv)):0;" +
  "var ts=fs+is;" +
  "var fo=ts>0?(fs/ts)*100:100;" +
  "var d=100-fo;" +
  "results.push('Comparison: Invest '+loc(ia)+' at '+loc(pmv)+' val \\u2192 Investor gets '+pct(op)+'% | Founder keeps '+pct(fo)+'% | Dilution: '+pct(d)+'%');" +
  "}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-equity-dilution-calculator',
  title: 'Equity Dilution Calculator',
  description: 'Model how investment rounds dilute founder equity. Calculate post-money valuation, investor ownership, and your remaining shares after funding.',
  category: 'E',
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
    '📊 Equity Dilution Analysis\n\n🏢 Pre-Money Valuation: $5,000,000\n💰 Investment Amount: $1,000,000\n🏗️ Founder Shares (initial): 10,000,000\n📈 Price Per Share: $0.50\n\n━━━━━━━━━━━━━━━━━━━━\n\n🚀 Post-Money Valuation: $6,000,000\n🤝 Investor Ownership: 16.67% (2,000,000 shares)\n👤 Founder Ownership After: 83.33% (10,000,000 shares)\n📉 Founder Dilution: 16.67%\n\n━━━━━━━━━━━━━━━━━━━━\n\n📊 Cap Table:\n• Total Shares: 12,000,000\n• Founder: 10,000,000 shares (83.33%)\n• Investor: 2,000,000 shares (16.67%)\n\n💡 At $0.50/share, each additional 10,000,000 shares of employee option pool would dilute founders by an additional ~9.09%.',
    'Comparison: Invest $50,000 at $5,000,000 val → Investor gets 0.99% | Founder keeps 99.01% | Dilution: 0.99%',
    'Comparison: Invest $250,000 at $5,000,000 val → Investor gets 4.76% | Founder keeps 95.24% | Dilution: 4.76%',
    'Comparison: Invest $500,000 at $5,000,000 val → Investor gets 9.09% | Founder keeps 90.91% | Dilution: 9.09%',
    'Comparison: Invest $2,000,000 at $5,000,000 val → Investor gets 28.57% | Founder keeps 71.43% | Dilution: 28.57%',
    'Comparison: Invest $10,000,000 at $5,000,000 val → Investor gets 66.67% | Founder keeps 33.33% | Dilution: 66.67%',
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
    'Review the post-money valuation, price per share, and cap table breakdown.',
    'See exactly what percentage the investor gets and how much your ownership is diluted.',
    'Scroll down to compare dilution across different investment amounts.',
  ],
};

registerEngine(engine);

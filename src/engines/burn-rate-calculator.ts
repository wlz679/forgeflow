import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateBurnRate(inputs: Record<string, string>): string[] {
  const startingCash = parseFloat(inputs.startingCash) || 0;
  const endingCash = parseFloat(inputs.endingCash) || 0;
  const months = parseInt(inputs.months) || 1;
  const results: string[] = [];

  const totalCashSpent = startingCash - endingCash;
  const netBurnPerMonth = months > 0 ? totalCashSpent / months : 0;

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
  const pct = (n: number) => (n * 100).toFixed(1) + '%';

  let mainResult =
    '\\uD83D\\uDD25 Burn Rate Analysis\\n\\n' +
    '\\u2022 Starting Cash: ' + fmt(startingCash) + '\\n' +
    '\\u2022 Ending Cash: ' + fmt(endingCash) + '\\n' +
    '\\u2022 Period: ' + months + ' month' + (months > 1 ? 's' : '') + '\\n' +
    '\\u2022 Total Cash Spent: ' + fmt(totalCashSpent) + '\\n\\n' +
    '\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';

  if (netBurnPerMonth <= 0) {
    mainResult += '\\uD83C\\uDF89 Your cash balance increased or stayed flat — you have no net burn!\\n\\n';
  }

  mainResult +=
    '\\u2022 Net Burn Rate: ' + fmt(netBurnPerMonth) + '/month\\n' +
    '\\u2022 Annualized Burn: ' + fmt(netBurnPerMonth * 12) + '/year\\n';

  if (netBurnPerMonth > 0 && startingCash > 0) {
    const runway = startingCash / netBurnPerMonth;
    mainResult += '\\u2022 Estimated Runway: ' + runway.toFixed(1) + ' months\\n';
  }

  mainResult += '\\n';
  if (startingCash > 0) {
    const monthlyDecline = netBurnPerMonth > 0 ? pct(netBurnPerMonth / startingCash) : '0.0%';
    mainResult += '\\u2022 Monthly Cash Decline: ' + monthlyDecline + '\\n';
  }

  mainResult += '\\n\\uD83D\\uDCA1 Tip: Track both net burn (total cash outflow minus revenue) and gross burn (total cash outflow only). Net burn tells you how fast your bank account shrinks. Gross burn tells you your total spending before revenue kicks in.';

  results.push(mainResult);

  // 5 comparison scenarios at different cash levels
  const cashLevels = [10000, 25000, 75000, 100000, 250000];
  for (let i = 0; i < cashLevels.length; i++) {
    const totalSpent = cashLevels[i] - endingCash;
    const burnAtLevel = totalSpent / months;
    const rwy = netBurnPerMonth > 0 ? cashLevels[i] / netBurnPerMonth : Infinity;
    const rwyStr = netBurnPerMonth <= 0 ? 'Infinite' : (isFinite(rwy) ? rwy.toFixed(1) + ' months' : 'N/A');
    results.push(
      'Starting with ' + fmt(cashLevels[i]) + ': Burn ' + fmt(burnAtLevel) + '/mo \\u2192 ' + rwyStr + ' of runway',
    );
  }

  return results;
}

const customFn =
  "var sc=parseFloat(inputs.startingCash)||0;" +
  "var ec=parseFloat(inputs.endingCash)||0;" +
  "var mo=parseInt(inputs.months)||1;" +
  "var totalSpent=sc-ec;" +
  "var nbm=mo>0?totalSpent/mo:0;" +
  "function fmt(n){return '$'+Math.round(n).toLocaleString()}" +
  "function pct(n){return (n*100).toFixed(1)+'%'}" +
  "var mr2='';" +
  "mr2+='\\uD83D\\uDD25 Burn Rate Analysis\\n\\n';" +
  "mr2+='\\u2022 Starting Cash: '+fmt(sc)+'\\n';" +
  "mr2+='\\u2022 Ending Cash: '+fmt(ec)+'\\n';" +
  "mr2+='\\u2022 Period: '+mo+' month'+(mo>1?'s':'')+'\\n';" +
  "mr2+='\\u2022 Total Cash Spent: '+fmt(totalSpent)+'\\n\\n';" +
  "mr2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "if(nbm<=0){mr2+='\\uD83C\\uDF89 Your cash balance increased or stayed flat \\u2014 you have no net burn!\\n\\n';}" +
  "mr2+='\\u2022 Net Burn Rate: '+fmt(nbm)+'/month\\n';" +
  "mr2+='\\u2022 Annualized Burn: '+fmt(nbm*12)+'/year\\n';" +
  "if(nbm>0&&sc>0){var rwy=sc/nbm;mr2+='\\u2022 Estimated Runway: '+rwy.toFixed(1)+' months\\n';}" +
  "mr2+='\\n';" +
  "if(sc>0){var md=nbm>0?pct(nbm/sc):'0.0%';mr2+='\\u2022 Monthly Cash Decline: '+md+'\\n';}" +
  "mr2+='\\n\\uD83D\\uDCA1 Tip: Track both net burn (total cash outflow minus revenue) and gross burn (total cash outflow only). Net burn tells you how fast your bank account shrinks. Gross burn tells you your total spending before revenue kicks in.';" +
  "var results=[mr2];" +
  "var cl=[10000,25000,75000,100000,250000];" +
  "for(var i=0;i<cl.length;i++){var ts=cl[i]-ec;var bl=ts/mo;var rw=nbm>0?cl[i]/nbm:Infinity;var rs=nbm<=0?'Infinite':(isFinite(rw)?rw.toFixed(1)+' months':'N/A');results.push('Starting with '+fmt(cl[i])+': Burn '+fmt(bl)+'/mo \\u2192 '+rs+' of runway');}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-burn-rate-calculator',
  title: 'Burn Rate Calculator',
  description: 'Calculate your net monthly burn rate by comparing starting vs ending cash over a period. See how different cash levels affect your runway.',
  category: 'A',
  inputs: [
    { name: 'startingCash', label: 'Starting Cash ($)', placeholder: 'e.g. 100000', type: 'number' },
    { name: 'endingCash', label: 'Ending Cash ($)', placeholder: 'e.g. 70000', type: 'number' },
    { name: 'months', label: 'Number of Months', placeholder: 'e.g. 6', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateBurnRate(inputs);
  },
  staticExamples: [
    '🔥 Burn Rate Analysis\n\n• Starting Cash: $100,000\n• Ending Cash: $70,000\n• Period: 6 months\n• Total Cash Spent: $30,000\n\n━━━━━━━━━━━━━━━━━━━━\n\n• Net Burn Rate: $5,000/month\n• Annualized Burn: $60,000/year\n• Estimated Runway: 20.0 months\n\n• Monthly Cash Decline: 5.0%\n\n💡 Tip: Track both net burn (total cash outflow minus revenue) and gross burn (total cash outflow only). Net burn tells you how fast your bank account shrinks. Gross burn tells you your total spending before revenue kicks in.',
    'Starting with $10,000: Burn $1,667/mo → 2.0 months of runway',
    'Starting with $25,000: Burn $4,167/mo → 5.0 months of runway',
    'Starting with $75,000: Burn $12,500/mo → 15.0 months of runway',
    'Starting with $100,000: Burn $16,667/mo → 20.0 months of runway',
  ],
  faq: [
    { q: 'What is the difference between net burn and gross burn?', a: 'Gross burn is your total monthly operating expenses before any revenue. Net burn is gross burn minus monthly revenue. For example, if you spend $20K/month and earn $5K/month, your gross burn is $20K and net burn is $15K. Always track both — gross burn shows your spending discipline, net burn shows how fast your bank account shrinks.' },
    { q: 'What is a healthy burn rate for a SaaS startup?', a: 'For early-stage SaaS, a net burn of $10K-$50K/month is common post-seed. The key metric is burn multiple: net burn divided by net new ARR per month. A burn multiple under 1.0x is excellent, meaning every dollar of burn generates more than a dollar of new ARR.' },
    { q: 'How do I reduce my burn rate quickly?', a: 'Start with the biggest line items: people (consider contractors instead of full-time hires), office space (go remote), SaaS subscriptions (audit and cancel unused tools), and marketing (shift to organic channels like SEO and content). A 20% reduction in burn can double your runway.' },
    { q: 'Should I include one-time expenses in burn rate?', a: 'No. Burn rate should reflect recurring operating expenses, not one-time costs like equipment purchases or legal fees for incorporation. Track one-time costs separately. This gives you a clearer picture of your ongoing cash needs.' },
    { q: 'How often should I recalculate my burn rate?', a: 'Monthly, at minimum. Review your burn rate every time you close your books. Set up a simple spreadsheet or use accounting software to track it. If your burn rate is increasing month-over-month, investigate immediately — it is easy to let spending creep up without noticing.' },
  ],
  howToUse: [
    'Enter your starting cash balance at the beginning of the period.',
    'Enter your ending cash balance at the end of the period.',
    'Enter the number of months in the period.',
    'Review your net burn rate per month and annualized burn rate.',
    'Check your estimated runway based on your current cash and burn rate.',
    'Scroll down to see 5 comparison scenarios with different starting cash levels.',
  ],
};

registerEngine(engine);

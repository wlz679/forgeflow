import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateRate(inputs: Record<string, string>): string[] {
  const skill = inputs.skill || 'developer';
  const experience = inputs.experience || 'mid';
  const location = inputs.location || 'us';
  const results: string[] = [];

  const baseRates: Record<string, number> = {
    developer: 75,
    designer: 65,
    writer: 50,
    marketer: 60,
    consultant: 100,
  };

  const expMultiplier: Record<string, number> = {
    junior: 0.6,
    mid: 1.0,
    senior: 1.6,
    expert: 2.5,
  };

  const locationAdj: Record<string, number> = {
    us: 1.0,
    europe: 0.85,
    asia: 0.5,
    remote: 0.8,
  };

  const base = baseRates[skill] || 70;
  const hourly = Math.round(base * expMultiplier[experience] * locationAdj[location]);
  const daily = hourly * 8;
  const weekly = daily * 5;
  const monthly = weekly * 4.33;
  const yearly = monthly * 12;

  const loc = (n: number) => '$' + n.toLocaleString();

  const expLabel: Record<string, string> = {
    junior: 'Junior (0-2 years)',
    mid: 'Mid-Level (3-5 years)',
    senior: 'Senior (6-10 years)',
    expert: 'Expert (10+ years)',
  };

  const locLabel: Record<string, string> = {
    us: 'US Market',
    europe: 'European Market',
    asia: 'Asian Market',
    remote: 'Global Remote',
  };

  results.push(
    '💰 Freelance Rate Breakdown\n\n' +
    '🧠 Skill: ' + skill.charAt(0).toUpperCase() + skill.slice(1) + '\n' +
    '📊 Experience: ' + expLabel[experience] + '\n' +
    '🌍 Market: ' + locLabel[location] + '\n\n' +
    '\n' +
    '⏱️  Hourly Rate:   ' + loc(hourly) + '/hr\n' +
    '📅  Daily Rate:     ' + loc(daily) + '/day\n' +
    '📆  Weekly Rate:  ' + loc(weekly) + '/wk\n' +
    '📊  Monthly Rate: ' + loc(monthly) + '/mo\n' +
    '💰  Yearly Rate:   ' + loc(yearly) + '/yr\n\n' +
    '\n' +
    '💡 Pricing Tips:\n' +
    '• Charge by the project, not by the hour. Clients buy outcomes, not time.\n' +
    '• Double your hourly rate for rush jobs or weekend work.\n' +
    '• Offer retainer packages (10/20/40 hrs per month) for steady income.\n' +
    '• Raise rates every 6 months as you gain testimonials and portfolio pieces.\n' +
    '• Your effective hourly rate = (project fee) / (actual hours). Track this.\n\n' +
    '📌 Formula: Base Rate ($' + (baseRates[skill] || 70) + ') × Experience (' + expMultiplier[experience] + 'x) × Location (' + locationAdj[location] + 'x)',
  );

  const skills = ['developer', 'designer', 'writer', 'marketer', 'consultant'];
  const levels = ['junior', 'mid', 'senior', 'expert'];
  const locations = ['us', 'europe', 'asia', 'remote'];
  let count = 0;

  for (let s = 0; s < skills.length && count < 9; s++) {
    for (let e = 0; e < levels.length && count < 9; e++) {
      if (skills[s] === skill && levels[e] === experience) continue;
      const r = Math.round((baseRates[skills[s]] || 70) * expMultiplier[levels[e]] * locationAdj[location]);
      results.push(
        'Comparison: ' + skills[s].charAt(0).toUpperCase() + skills[s].slice(1) +
        ' (' + levels[e] + ') → $' + r + '/hr | $' + (r * 8) + '/day | $' + (r * 8 * 5 * 4.33).toLocaleString() + '/mo',
      );
      count++;
    }
  }

  return results;
}

const customFn =
  "var skill=inputs.skill||'developer';" +
  "var exp=inputs.experience||'mid';" +
  "var loc=inputs.location||'us';" +
  "var br={developer:75,designer:65,writer:50,marketer:60,consultant:100};" +
  "var em={junior:0.6,mid:1.0,senior:1.6,expert:2.5};" +
  "var la={us:1.0,europe:0.85,asia:0.5,remote:0.8};" +
  "var base=br[skill]||70;" +
  "var hourly=Math.round(base*em[exp]*la[loc]);" +
  "var daily=hourly*8;" +
  "var weekly=daily*5;" +
  "var monthly=weekly*4.33;" +
  "var yearly=monthly*12;" +
  "function loc(n){return '$'+n.toLocaleString()}" +
  "var el={junior:'Junior (0-2 years)',mid:'Mid-Level (3-5 years)',senior:'Senior (6-10 years)',expert:'Expert (10+ years)'};" +
  "var ll={us:'US Market',europe:'European Market',asia:'Asian Market',remote:'Global Remote'};" +
  "var results=[];" +
  "results.push(" +
  "'\\uD83D\\uDCB0 Freelance Rate Breakdown\\n\\n" +
  "\\uD83E\\uDDE0 Skill: '+skill.charAt(0).toUpperCase()+skill.slice(1)+'\\n" +
  "\\uD83D\\uDCCA Experience: '+el[exp]+'\\n" +
  "\\uD83C\\uDF0D Market: '+ll[loc]+'\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\u23F1\\uFE0F  Hourly Rate:   '+loc(hourly)+'/hr\\n" +
  "\\uD83D\\uDCC5  Daily Rate:     '+loc(daily)+'/day\\n" +
  "\\uD83D\\uDCC6  Weekly Rate:  '+loc(weekly)+'/wk\\n" +
  "\\uD83D\\uDCCA  Monthly Rate: '+loc(monthly)+'/mo\\n" +
  "\\uD83D\\uDCB0  Yearly Rate:   '+loc(yearly)+'/yr\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\uD83D\\uDCA1 Pricing Tips:\\n" +
  "\\u2022 Charge by the project, not by the hour. Clients buy outcomes, not time.\\n" +
  "\\u2022 Double your hourly rate for rush jobs or weekend work.\\n" +
  "\\u2022 Offer retainer packages (10/20/40 hrs per month) for steady income.\\n" +
  "\\u2022 Raise rates every 6 months as you gain testimonials and portfolio pieces.\\n" +
  "\\u2022 Your effective hourly rate = (project fee) / (actual hours). Track this.\\n\\n" +
  "\\uD83D\\uDCCC Formula: Base Rate ($'+(br[skill]||70)+') \\u00d7 Experience ('+em[exp]+'x) \\u00d7 Location ('+la[loc]+'x)'" +
  ");" +
  "var skills=['developer','designer','writer','marketer','consultant'];" +
  "var levels=['junior','mid','senior','expert'];" +
  "var count=0;" +
  "for(var s=0;s<skills.length&&count<9;s++){" +
  "for(var e=0;e<levels.length&&count<9;e++){" +
  "if(skills[s]===skill&&levels[e]===exp)continue;" +
  "var r=Math.round((br[skills[s]]||70)*em[levels[e]]*la[loc]);" +
  "results.push('Comparison: '+skills[s].charAt(0).toUpperCase()+skills[s].slice(1)+' ('+levels[e]+') \\u2192 $'+r+'/hr | $'+(r*8)+'/day | $'+(r*8*5*4.33).toLocaleString()+'/mo');" +
  "count++;" +
  "}" +
  "}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-freelance-rate-calculator',
  title: 'Freelance Rate Calculator',
  description: 'Calculate your ideal hourly, daily, and monthly rate based on your skill, experience level, and market location.',
  category: 'C',
  inputs: [
    { name: 'skill', label: 'Your Skill', placeholder: '', type: 'select', options: ['developer', 'designer', 'writer', 'marketer', 'consultant'] },
    { name: 'experience', label: 'Experience Level', placeholder: '', type: 'select', options: ['junior', 'mid', 'senior', 'expert'] },
    { name: 'location', label: 'Target Market', placeholder: '', type: 'select', options: ['us', 'europe', 'asia', 'remote'] },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateRate(inputs);
  },
  staticExamples: [
    '💰 Freelance Rate Breakdown\n\n🧠 Skill: Developer\n📊 Experience: Mid-Level (3-5 years)\n🌍 Market: US Market\n\n⏱️  Hourly Rate:   $75/hr\n📅  Daily Rate:     $600/day\n📆  Weekly Rate:  $3,000/wk\n📊  Monthly Rate: $12,990/mo\n💰  Yearly Rate:   $155,880/yr\n\n💡 Pricing Tips:\n• Charge by the project, not by the hour. Clients buy outcomes, not time.\n• Double your hourly rate for rush jobs or weekend work.\n• Offer retainer packages (10/20/40 hrs per month) for steady income.\n• Raise rates every 6 months as you gain testimonials and portfolio pieces.\n• Your effective hourly rate = (project fee) / (actual hours). Track this.\n\n📌 Formula: Base Rate ($75) × Experience (1x) × Location (1x)',
    'Comparison: Designer (junior) → $39/hr | $312/day | $6,752/mo',
    'Comparison: Writer (mid) → $50/hr | $400/day | $8,660/mo',
    'Comparison: Marketer (senior) → $96/hr | $768/day | $16,627/mo',
    'Comparison: Consultant (expert) → $250/hr | $2,000/day | $43,300/mo',
  ],
  faq: [
    { q: 'How do I know if my rate is too high?', a: 'If you win every proposal, your rate is too low. Aim to lose 20-30% of proposals on price — that means you are charging what you are worth.' },
    { q: 'Should I charge different rates for different clients?', a: 'Yes. Charge startups less (with equity upside), enterprises more. Adjust for project complexity, deadline pressure, and ongoing relationship value.' },
    { q: 'How often should I raise my rates?', a: 'Every 6 months or after every 3 completed projects. Notify existing clients 30 days in advance. New clients get the new rate immediately.' },
    { q: 'What about value-based pricing?', a: 'For projects where you can quantify the client\'s ROI (e.g., "this landing page will generate $50K"), charge 10-20% of the expected value instead of hourly.' },
    { q: 'Are these rates realistic for Asian markets?', a: 'The calculator adjusts for regional markets. However, if you work remotely for US/EU clients, charge US/EU rates regardless of where you live.' },
  ],
  howToUse: [
    'Select your primary skill.',
    'Choose your experience level.',
    'Pick your target market.',
    'Review your recommended hourly, daily, weekly, monthly, and yearly rates.',
    'Scroll down to compare rates across different skills and experience levels.',
    'Use the pricing tips to negotiate better with clients.',
  ],
};

registerEngine(engine);

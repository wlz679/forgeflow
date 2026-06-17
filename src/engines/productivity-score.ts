import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateProductivity(inputs: Record<string, string>): string[] {
  const deepWork = parseInt(inputs.weeklyDeepWorkHours) || 0;
  const tools = parseInt(inputs.toolsUsed) || 0;
  const meetings = parseInt(inputs.meetingsPerWeek) || 0;
  const results: string[] = [];

  let score = 50;
  const tips: string[] = [];
  const wins: string[] = [];

  // Deep work scoring (max +25)
  if (deepWork >= 30) { score += 25; wins.push('Elite deep work hours — you are in the top 5% of solopreneurs.'); }
  else if (deepWork >= 20) { score += 20; wins.push('Strong deep work routine. This is the sweet spot for sustained productivity.'); }
  else if (deepWork >= 10) { score += 10; tips.push('Aim for 15-20 hours of deep work per week. Block 3-4 hour morning sessions.'); }
  else if (deepWork >= 5) { score += 5; tips.push('Deep work is your highest-leverage activity. Try scheduling 2-hour blocks each morning before checking email.'); }
  else { tips.push('Critical: You need dedicated deep work time. Start with 2-hour blocks, 3x per week. No phone, no email, no Slack.'); }

  // Tools scoring (max +15)
  if (tools >= 3 && tools <= 5) { score += 15; wins.push('Perfect tool stack size. Enough to automate, not so many that you drown in subscriptions.'); }
  else if (tools >= 1 && tools <= 2) { score += 8; tips.push('Consider adding 1-2 tools for automation (Zapier, Make) and project management (Notion, Linear).'); }
  else if (tools >= 6 && tools <= 8) { score += 5; tips.push('You might have too many tools. Audit your subscriptions — cut any you haven\'t used in 2 weeks.'); }
  else if (tools > 8) { tips.push('Tool overload! You likely have redundant tools. Cancel half and watch your focus improve. Tool-switching is a hidden productivity killer.'); }
  else { tips.push('Using zero tools? At minimum, get a to-do app and a calendar. They are force multipliers.'); }

  // Meetings scoring (max +20)
  if (meetings <= 2) { score += 20; wins.push('Minimal meetings — you protect your maker time. This is the solopreneur advantage.'); }
  else if (meetings <= 5) { score += 10; tips.push('Try to batch all meetings on one day (e.g., Thursday). This keeps the rest of the week meeting-free.'); }
  else if (meetings <= 10) { score += 0; tips.push('That is a lot of meetings for a solopreneur. Ask: can this be an email? Can it be async (Loom)? Cut 50%.'); }
  else { tips.push('Too many meetings. You are running a company, not attending one. Replace recurring meetings with async updates. Your deep work is suffering.'); }

  score = Math.max(10, Math.min(100, score));

  let grade: string;
  let emoji: string;
  if (score >= 85) { grade = 'A — Elite Solopreneur'; emoji = '🏆'; }
  else if (score >= 70) { grade = 'B — Solid Systems'; emoji = '🔥'; }
  else if (score >= 50) { grade = 'C — Room to Grow'; emoji = '📈'; }
  else if (score >= 30) { grade = 'D — Needs Attention'; emoji = '⚠️'; }
  else { grade = 'F — Urgent Action Needed'; emoji = '🚨'; }

  results.push(
    emoji + ' Productivity Score: ' + score + '/100\n' +
    'Grade: ' + grade + '\n\n' +
    '📊 Breakdown:\n' +
    '• Weekly Deep Work: ' + deepWork + ' hours' + (deepWork >= 20 ? ' ✅' : deepWork >= 10 ? ' ⚡' : ' ❌') + '\n' +
    '• Tools in Stack: ' + tools + ' tools' + (tools >= 3 && tools <= 5 ? ' ✅' : tools >= 1 ? ' ⚡' : ' ❌') + '\n' +
    '• Weekly Meetings: ' + meetings + ' meetings' + (meetings <= 2 ? ' ✅' : meetings <= 5 ? ' ⚡' : ' ❌') + '\n\n' +
    '✅ WINS:\n' + (wins.length > 0 ? wins.map(w => '• ' + w).join('\n') : '• No major wins yet — focus on the tips below.\n') + '\n' +
    '💡 ACTION ITEMS:\n' + tips.map(t => '• ' + t).join('\n') + '\n\n' +
    '' +
    '🎯 Your #1 lever: ' + (deepWork < 10 ? 'Increase deep work hours. Block 2-3 hour morning sessions with zero distractions.' :
      meetings > 5 ? 'Cut meetings by 50%. Replace them with async video updates.' :
      tools > 5 ? 'Audit and reduce your tool stack. Fewer tools = less context switching.' :
      'You are on track. Protect your current systems and incrementally improve.') + '\n\n' +
    '📌 Score Formula: Base 50 + Deep Work (max +25) + Tool Stack (max +15) + Meeting Efficiency (max +20). Max: 100. Min: 10.\n\n' +
    '🩺 Productivity Health:\n' +
    (score >= 90
      ? '• 🟢 Peak performer — protect what is working.\n'
      : score >= 75
      ? '• 🟢 Strong systems — keep iterating.\n'
      : score >= 60
      ? '• 🟡 Solid baseline — room to grow in weak area.\n'
      : score >= 45
      ? '• 🟠 Below average — focus on the #1 lever.\n'
      : '• 🔴 Struggling — fundamental changes needed.\n') +
    (deepWork >= 20
      ? '• ✅ Deep work hours in top quartile (20+).\n'
      : deepWork >= 10
      ? '• ⚠️ Deep work hours OK but not exceptional.\n'
      : '• 🔴 Deep work is too low — biggest improvement area.\n') +
    '\n🔄 What-If Scenarios:\n' +
    '• Add 5 deep work hrs/wk:  Score +' + Math.min(25, (deepWork + 5 >= 30 ? 25 : deepWork + 5 >= 20 ? 20 : deepWork + 5 >= 10 ? 10 : 5)) + ' pts (max +25)\n' +
    '• Cut meetings to 2/wk:  Score +' + (meetings > 5 ? 20 : meetings > 2 ? 10 : 0) + ' pts\n' +
    '• Trim tool stack to 3-5:  Score +' + (tools > 5 ? 10 : tools < 3 ? 7 : 0) + ' pts',
  );

  // 9 comparison scenarios
  const scenarios = [
    { dw: 40, t: 4, m: 1, label: 'Peak Performance' },
    { dw: 25, t: 3, m: 2, label: 'Ideal Solopreneur' },
    { dw: 15, t: 5, m: 4, label: 'Balanced Grinder' },
    { dw: 8, t: 2, m: 3, label: 'Side Hustler' },
    { dw: 5, t: 8, m: 12, label: 'Meeting-Heavy Founder' },
    { dw: 30, t: 10, m: 1, label: 'Deep Worker + Tool Overload' },
    { dw: 2, t: 0, m: 0, label: 'Just Starting' },
    { dw: 20, t: 4, m: 6, label: 'Growing Team' },
    { dw: 12, t: 6, m: 3, label: 'Distracted Builder' },
  ];

  for (const s of scenarios) {
    let sScore = 50;
    if (s.dw >= 30) sScore += 25; else if (s.dw >= 20) sScore += 20; else if (s.dw >= 10) sScore += 10; else if (s.dw >= 5) sScore += 5;
    if (s.t >= 3 && s.t <= 5) sScore += 15; else if (s.t >= 1 && s.t <= 2) sScore += 8; else if (s.t >= 6 && s.t <= 8) sScore += 5;
    if (s.m <= 2) sScore += 20; else if (s.m <= 5) sScore += 10;
    sScore = Math.max(10, Math.min(100, sScore));
    results.push(s.label + ': Score ' + sScore + '/100 — Deep Work: ' + s.dw + 'h | Tools: ' + s.t + ' | Meetings: ' + s.m + '/wk');
  }

  return results;
}

const customFn =
  "var dw=parseInt(inputs.weeklyDeepWorkHours)||0;" +
  "var tools=parseInt(inputs.toolsUsed)||0;" +
  "var mtg=parseInt(inputs.meetingsPerWeek)||0;" +
  "var score=50;var tips=[];var wins=[];" +
  "if(dw>=30){score+=25;wins.push('Elite deep work hours \\u2014 you are in the top 5% of solopreneurs.');}" +
  "else if(dw>=20){score+=20;wins.push('Strong deep work routine. This is the sweet spot for sustained productivity.');}" +
  "else if(dw>=10){score+=10;tips.push('Aim for 15-20 hours of deep work per week. Block 3-4 hour morning sessions.');}" +
  "else if(dw>=5){score+=5;tips.push('Deep work is your highest-leverage activity. Try scheduling 2-hour blocks each morning before checking email.');}" +
  "else{tips.push('Critical: You need dedicated deep work time. Start with 2-hour blocks, 3x per week. No phone, no email, no Slack.');}" +
  "if(tools>=3&&tools<=5){score+=15;wins.push('Perfect tool stack size. Enough to automate, not so many that you drown in subscriptions.');}" +
  "else if(tools>=1&&tools<=2){score+=8;tips.push('Consider adding 1-2 tools for automation (Zapier, Make) and project management (Notion, Linear).');}" +
  "else if(tools>=6&&tools<=8){score+=5;tips.push('You might have too many tools. Audit your subscriptions \\u2014 cut any you haven\\'t used in 2 weeks.');}" +
  "else if(tools>8){tips.push('Tool overload! You likely have redundant tools. Cancel half and watch your focus improve. Tool-switching is a hidden productivity killer.');}" +
  "else{tips.push('Using zero tools? At minimum, get a to-do app and a calendar. They are force multipliers.');}" +
  "if(mtg<=2){score+=20;wins.push('Minimal meetings \\u2014 you protect your maker time. This is the solopreneur advantage.');}" +
  "else if(mtg<=5){score+=10;tips.push('Try to batch all meetings on one day (e.g., Thursday). This keeps the rest of the week meeting-free.');}" +
  "else if(mtg<=10){tips.push('That is a lot of meetings for a solopreneur. Ask: can this be an email? Can it be async (Loom)? Cut 50%.');}" +
  "else{tips.push('Too many meetings. You are running a company, not attending one. Replace recurring meetings with async updates. Your deep work is suffering.');}" +
  "score=Math.max(10,Math.min(100,score));" +
  "var grade;var emoji;" +
  "if(score>=85){grade='A \\u2014 Elite Solopreneur';emoji='\\uD83C\\uDFC6';}" +
  "else if(score>=70){grade='B \\u2014 Solid Systems';emoji='\\uD83D\\uDD25';}" +
  "else if(score>=50){grade='C \\u2014 Room to Grow';emoji='\\uD83D\\uDCC8';}" +
  "else if(score>=30){grade='D \\u2014 Needs Attention';emoji='\\u26A0\\uFE0F';}" +
  "else{grade='F \\u2014 Urgent Action Needed';emoji='\\uD83D\\uDEA8';}" +
  "var results=[];" +
  "results.push(emoji+' Productivity Score: '+score+'/100\\nGrade: '+grade+'\\n\\n\\uD83D\\uDCCA Breakdown:\\n\\u2022 Weekly Deep Work: '+dw+' hours'+(dw>=20?' \\u2705':dw>=10?' \\u26A1':' \\u274C')+'\\n\\u2022 Tools in Stack: '+tools+' tools'+(tools>=3&&tools<=5?' \\u2705':tools>=1?' \\u26A1':' \\u274C')+'\\n\\u2022 Weekly Meetings: '+mtg+' meetings'+(mtg<=2?' \\u2705':mtg<=5?' \\u26A1':' \\u274C')+'\\n\\n\\u2705 WINS:\\n'+(wins.length>0?wins.map(function(w){return '\\u2022 '+w}).join('\\n'):'\\u2022 No major wins yet \\u2014 focus on the tips below.\\n')+'\\n\\uD83D\\uDCA1 ACTION ITEMS:\\n'+tips.map(function(t){return '\\u2022 '+t}).join('\\n')+'\\n\\n\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\uD83C\\uDFAF Your #1 lever: '+(dw<10?'Increase deep work hours. Block 2-3 hour morning sessions with zero distractions.':mtg>5?'Cut meetings by 50%. Replace them with async video updates.':tools>5?'Audit and reduce your tool stack. Fewer tools = less context switching.':'You are on track. Protect your current systems and incrementally improve.')+'\\n\\n\\uD83D\\uDCCC Score Formula: Base 50 + Deep Work (max +25) + Tool Stack (max +15) + Meeting Efficiency (max +20). Max: 100. Min: 10.');" +
  "var scs=[{dw:40,t:4,m:1,l:'Peak Performance'},{dw:25,t:3,m:2,l:'Ideal Solopreneur'},{dw:15,t:5,m:4,l:'Balanced Grinder'},{dw:8,t:2,m:3,l:'Side Hustler'},{dw:5,t:8,m:12,l:'Meeting-Heavy Founder'},{dw:30,t:10,m:1,l:'Deep Worker + Tool Overload'},{dw:2,t:0,m:0,l:'Just Starting'},{dw:20,t:4,m:6,l:'Growing Team'},{dw:12,t:6,m:3,l:'Distracted Builder'}];" +
  "for(var i=0;i<scs.length;i++){var s=scs[i];var ss=50;" +
  "if(s.dw>=30)ss+=25;else if(s.dw>=20)ss+=20;else if(s.dw>=10)ss+=10;else if(s.dw>=5)ss+=5;" +
  "if(s.t>=3&&s.t<=5)ss+=15;else if(s.t>=1&&s.t<=2)ss+=8;else if(s.t>=6&&s.t<=8)ss+=5;" +
  "if(s.m<=2)ss+=20;else if(s.m<=5)ss+=10;ss=Math.max(10,Math.min(100,ss));" +
  "results.push(s.l+': Score '+ss+'/100 \\u2014 Deep Work: '+s.dw+'h | Tools: '+s.t+' | Meetings: '+s.m+'/wk');}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-productivity-score',
  title: 'Productivity Score Calculator',
  description: 'Rate your solopreneur productivity with a scored assessment. Get actionable tips based on your deep work hours, tool stack, and meeting load.',
  category: 'E',
  inputs: [
    { name: 'weeklyDeepWorkHours', label: 'Weekly Deep Work Hours', placeholder: 'e.g. 15', type: 'number' },
    { name: 'toolsUsed', label: 'Tools / Apps Used Weekly', placeholder: 'e.g. 5', type: 'number' },
    { name: 'meetingsPerWeek', label: 'Meetings Per Week', placeholder: 'e.g. 3', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateProductivity(inputs);
  },
  staticExamples: [
    '📈 Productivity Score: 75/100\nGrade: B — Solid Systems\n\n📊 Breakdown:\n• Weekly Deep Work: 15 hours ⚡\n• Tools in Stack: 5 tools ✅\n• Weekly Meetings: 3 meetings ⚡\n\n✅ WINS:\n• Perfect tool stack size. Enough to automate, not so many that you drown in subscriptions.\n\n💡 ACTION ITEMS:\n• Aim for 15-20 hours of deep work per week. Block 3-4 hour morning sessions.\n• Try to batch all meetings on one day (e.g., Thursday). This keeps the rest of the week meeting-free.\n\n🎯 Your #1 lever: You are on track. Protect your current systems and incrementally improve.\n\n📌 Score Formula: Base 50 + Deep Work (max +25) + Tool Stack (max +15) + Meeting Efficiency (max +20). Max: 100. Min: 10.',
    'Peak Performance: Score 100/100 — Deep Work: 40h | Tools: 4 | Meetings: 1/wk',
    'Ideal Solopreneur: Score 95/100 — Deep Work: 25h | Tools: 3 | Meetings: 2/wk',
    'Balanced Grinder: Score 75/100 — Deep Work: 15h | Tools: 5 | Meetings: 4/wk',
    'Side Hustler: Score 58/100 — Deep Work: 8h | Tools: 2 | Meetings: 3/wk',
  ],
  faq: [
    { q: 'What counts as deep work?', a: 'Deep work = focused, uninterrupted time on your most cognitively demanding tasks (coding, writing, strategy, design). No email, Slack, social media, or phone. 50+ minute blocks minimum.' },
    { q: 'What is a good productivity score?', a: '70+ is solid. 85+ is excellent. The score is diagnostic — use it to identify your weakest area and improve it over 2-4 weeks.' },
    { q: 'How many tools should a solopreneur use?', a: '3-5 core tools is the sweet spot. Every additional tool adds cognitive overhead. Audit quarterly: if you haven\'t used a tool in 2 weeks, cancel it.' },
    { q: 'Are all meetings bad?', a: 'No — customer calls, sales demos, and 1:1s with contractors are high-value. It is internal status meetings and "quick syncs" that kill productivity. Batch them.' },
    { q: 'How often should I recalculate my score?', a: 'Monthly. Track your deep work hours and meeting count for a week, then recalculate. Small changes compound — adding 5 hours of deep work per week is 260 more hours per year.' },
  ],
  howToUse: [
    'Enter your total weekly deep work hours (uninterrupted, focused work).',
    'Count how many tools/apps you actively use each week.',
    'Enter your average number of meetings per week.',
    'Review your productivity score and grade.',
    'Read your wins and action items for specific improvements.',
    'Scroll down to compare your score against 9 archetype scenarios.',
  ],
};

registerEngine(engine);

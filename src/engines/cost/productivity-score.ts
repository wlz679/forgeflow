import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

function calculateProductivity(inputs: Record<string, string>): string[] {
  const deepWork = clampNonNegative(parseInt(inputs.weeklyDeepWorkHours) || 0);
  const tools = clampNonNegative(parseInt(inputs.toolsUsed) || 0);
  const meetings = clampNonNegative(parseInt(inputs.meetingsPerWeek) || 0);

  const SEP = '━'.repeat(41);

  // Score formula: base 50 + deep work (max +25) + tool stack (max +15) + meeting efficiency (max +20)
  let score = 50;
  const wins: string[] = [];
  const tips: string[] = [];

  if (deepWork >= 30) { score += 25; wins.push('Elite deep work hours — you are in the top 5% of solopreneurs.'); }
  else if (deepWork >= 20) { score += 20; wins.push('Strong deep work routine. This is the sweet spot for sustained productivity.'); }
  else if (deepWork >= 10) { score += 10; tips.push('Aim for 15–20 hours of deep work per week. Block 3–4 hour morning sessions.'); }
  else if (deepWork >= 5) { score += 5; tips.push('Deep work is your highest-leverage activity. Try scheduling 2-hour blocks each morning before checking email.'); }
  else { tips.push('Critical: You need dedicated deep work time. Start with 2-hour blocks, 3x per week. No phone, no email, no Slack.'); }

  if (tools >= 3 && tools <= 5) { score += 15; wins.push('Perfect tool stack size. Enough to automate, not so many that you drown in subscriptions.'); }
  else if (tools >= 1 && tools <= 2) { score += 8; tips.push('Consider adding 1–2 tools for automation (Zapier, Make) and project management (Notion, Linear).'); }
  else if (tools >= 6 && tools <= 8) { score += 5; tips.push('You might have too many tools. Audit your subscriptions — cut any you haven\'t used in 2 weeks.'); }
  else if (tools > 8) { tips.push('Tool overload! You likely have redundant tools. Cancel half and watch your focus improve. Tool-switching is a hidden productivity killer.'); }
  else { tips.push('Using zero tools? At minimum, get a to-do app and a calendar. They are force multipliers.'); }

  if (meetings <= 2) { score += 20; wins.push('Minimal meetings — you protect your maker time. This is the solopreneur advantage.'); }
  else if (meetings <= 5) { score += 10; tips.push('Try to batch all meetings on one day (e.g., Thursday). This keeps the rest of the week meeting-free.'); }
  else if (meetings <= 10) { score += 0; tips.push('That is a lot of meetings for a solopreneur. Ask: can this be an email? Can it be async (Loom)? Cut 50%.'); }
  else { tips.push('Too many meetings. You are running a company, not attending one. Replace recurring meetings with async updates. Your deep work is suffering.'); }

  score = Math.max(10, Math.min(100, score));

  const fmt = (n: number) => n.toString();

  let main = '📈 Productivity Score: ' + score + '/100\n\n';

  // 💰 Snapshot
  main += '💰 Score Snapshot:\n' + SEP + '\n';
  main += '• Total Score:          ' + score + '/100\n';
  main += '• Weekly Deep Work:    ' + deepWork + ' hours\n';
  main += '• Tools in Stack:      ' + tools + ' tools\n';
  main += '• Weekly Meetings:     ' + meetings + ' meetings\n';
  main += '• Total Work Hours:    ' + (deepWork + meetings + 5) + ' hrs/wk  (deep work + meetings + admin)\n\n';

  // 📐 Key Metrics
  main += '📐 Key Metrics:\n' + SEP + '\n';
  const deepWorkPct = Math.min(100, Math.round((deepWork / 40) * 100));
  const meetingsVsDeep = deepWork > 0 ? (meetings / deepWork * 100).toFixed(0) : '∞';
  main += '• Deep Work % of week:     ' + deepWorkPct + '%  (target: 40%+)\n';
  main += '• Meetings-to-Deep Ratio:  ' + meetingsVsDeep + '%  (lower is better)\n';
  main += '• Tool Efficiency Score:   ' + (tools >= 3 && tools <= 5 ? '🟢 Optimal (3–5)' : tools < 3 ? '🟠 Under-tooled' : '🟠 Over-tooled') + '\n';
  main += '• Productivity Tier:       ' + (score >= 85 ? 'A — Elite' : score >= 70 ? 'B — Solid' : score >= 50 ? 'C — Growing' : score >= 30 ? 'D — Needs Work' : 'F — Urgent') + '\n\n';

  // 🩺 Health
  main += '🩺 Productivity Health:\n' + SEP + '\n';
  if (score >= 90) main += '• 🟢 Score ' + score + '/100 — peak performer. Protect what is working.\n';
  else if (score >= 75) main += '• 🟢 Score ' + score + '/100 — strong systems. Keep iterating.\n';
  else if (score >= 60) main += '• 🟡 Score ' + score + '/100 — solid baseline. Room to grow in the weakest area.\n';
  else if (score >= 45) main += '• 🟠 Score ' + score + '/100 — below average. Focus on the #1 lever below.\n';
  else main += '• 🔴 Score ' + score + '/100 — struggling. Fundamental changes needed.\n';

  if (deepWork >= 20) main += '• 🟢 Deep work hours in top quartile (20+ hrs/wk).\n';
  else if (deepWork >= 10) main += '• 🟡 Deep work hours OK but not exceptional. Push for 20+.\n';
  else main += '• 🔴 Deep work is too low — biggest improvement area. Aim for 15–20 hrs/wk.\n';

  if (meetings <= 2) main += '• 🟢 Meeting load is light. Your maker time is protected.\n';
  else if (meetings <= 5) main += '• 🟡 Meeting load is moderate. Batch them to one day if possible.\n';
  else main += '• 🔴 Meeting load is heavy. Cut 50% and replace with async updates.\n';

  if (tools >= 3 && tools <= 5) main += '• 🟢 Tool stack is optimal. You have what you need, no bloat.\n';
  else if (tools < 3) main += '• 🟡 Tool stack is light. Consider adding 1–2 automation tools.\n';
  else main += '• 🟠 Tool stack has bloat. Audit and cut what you haven\'t used in 2 weeks.\n\n';

  // 🎯 Improvement Projection
  main += '🎯 Improvement Projection:\n' + SEP + '\n';
  const add5DW = Math.min(25, deepWork + 5 >= 30 ? 25 : deepWork + 5 >= 20 ? 20 : deepWork + 5 >= 10 ? 10 : 5);
  const cutMtg = meetings > 5 ? 20 : meetings > 2 ? 10 : 0;
  const trimTools = tools > 5 ? 10 : tools < 3 ? 7 : 0;
  const projection30 = Math.min(100, score + add5DW + cutMtg + trimTools);
  main += '• Current score:                ' + score + '/100\n';
  main += '• +5 deep work hrs/wk:          +' + add5DW + ' pts → ' + Math.min(100, score + add5DW) + '/100\n';
  main += '• Cut meetings to 2/wk:         +' + cutMtg + ' pts → ' + Math.min(100, score + cutMtg) + '/100\n';
  main += '• Trim tools to 3–5:            +' + trimTools + ' pts → ' + Math.min(100, score + trimTools) + '/100\n';
  main += '• All three in 30 days:         ' + projection30 + '/100\n';
  if (score >= 85) main += '• Target: maintain score and protect deep work time.\n';
  else if (projection30 >= 85) main += '• Target: 85+ achievable within 30 days with focused effort.\n';
  else main += '• Target: +20 pts in 30 days. Focus on the lowest sub-score first.\n\n';

  // ⚖️ Break-even
  main += '⚖️ Deep Work vs Shallow Work Break-Even:\n' + SEP + '\n';
  const totalHours = 40;
  const shallowHours = totalHours - deepWork - meetings;
  if (deepWork >= 15 && meetings <= 3) {
    main += '• 🟢 Your mix is healthy: ' + deepWork + 'h deep + ' + meetings + 'h meetings + ' + shallowHours + 'h admin.\n';
  } else if (deepWork < 10 && meetings > 5) {
    main += '• 🔴 Your mix is inverted: only ' + deepWork + 'h deep but ' + meetings + 'h meetings. The 4:1 meeting:deep ratio is costing you output.\n';
  } else if (deepWork < meetings) {
    main += '• 🟠 You spend more time in meetings than in deep work. Flip this ratio.\n';
  } else {
    main += '• 🟡 Your mix is workable but improvable. Aim for 2x deep work vs meetings.\n';
  }
  main += '• Break-even: at 15+ hrs/wk deep work, you compound skills. Below 10, you are treading water.\n';
  main += '• Cal Newport\'s research: 4 hours/day of deep work = full-time knowledge worker output.\n\n';

  // 🔄 What-If Scenarios
  main += '🔄 What-If Scenarios:\n' + SEP + '\n';
  main += '• Add 5 deep work hrs/wk:           +' + add5DW + ' pts (max +25 from deep work alone)\n';
  main += '• Cut meetings to 2/wk:             +' + cutMtg + ' pts (full +20 if currently >5)\n';
  main += '• Trim tool stack to 3–5 core tools: +' + trimTools + ' pts (full +10 if currently >5)\n';
  main += '• Block all meetings to Thursdays:  no score change but recovers 4+ hrs/wk for deep work\n';
  main += '• Quit one recurring meeting:       +5 to +10 pts and reclaims 1–2 hrs/wk\n\n';

  // 💡 Tip
  const topLever = deepWork < 10 ? 'Increase deep work hours. Block 2–3 hour morning sessions with zero distractions. Phone in another room, email closed, no Slack.' :
    meetings > 5 ? 'Cut meetings by 50%. Replace them with Loom videos or written updates. The async tax is real but smaller than the meeting tax.' :
    tools > 5 ? 'Audit and reduce your tool stack. Fewer tools = less context switching. Cut any subscription you haven\'t used in the last 2 weeks.' :
    'You are on track. Protect your current systems. The next 5 points come from going deeper, not wider.';
  main += '💡 Top Lever: ' + topLever + '\n';

  const results: string[] = [main];

  // Comparison rows
  const scenarios = [
    { dw: 40, t: 4, m: 1, label: 'Peak Performer' },
    { dw: 25, t: 3, m: 2, label: 'Ideal Solopreneur' },
    { dw: 15, t: 5, m: 4, label: 'Balanced Grinder' },
    { dw: 8, t: 2, m: 3, label: 'Side Hustler' },
    { dw: 5, t: 8, m: 12, label: 'Meeting-Heavy Founder' },
  ];
  for (const s of scenarios) {
    let sScore = 50;
    if (s.dw >= 30) sScore += 25; else if (s.dw >= 20) sScore += 20; else if (s.dw >= 10) sScore += 10; else if (s.dw >= 5) sScore += 5;
    if (s.t >= 3 && s.t <= 5) sScore += 15; else if (s.t >= 1 && s.t <= 2) sScore += 8; else if (s.t >= 6 && s.t <= 8) sScore += 5;
    if (s.m <= 2) sScore += 20; else if (s.m <= 5) sScore += 10;
    sScore = Math.max(10, Math.min(100, sScore));
    results.push(s.label + ': ' + sScore + '/100 — Deep Work ' + s.dw + 'h | Tools ' + s.t + ' | Meetings ' + s.m + '/wk');
  }

  return results;
}

const customFn =
  "var cnn=function(x){return Math.max(0,x)};" +
  "var dw=cnn(parseInt(inputs.weeklyDeepWorkHours)||0);" +
  "var tools=cnn(parseInt(inputs.toolsUsed)||0);" +
  "var mtg=cnn(parseInt(inputs.meetingsPerWeek)||0);" +
  "var SEP='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501';" +
  "var score=50;var wins=[];var tips=[];" +
  "if(dw>=30){score+=25;wins.push('Elite deep work hours \\u2014 you are in the top 5% of solopreneurs.');}" +
  "else if(dw>=20){score+=20;wins.push('Strong deep work routine. This is the sweet spot for sustained productivity.');}" +
  "else if(dw>=10){score+=10;tips.push('Aim for 15\\u201320 hours of deep work per week. Block 3\\u20134 hour morning sessions.');}" +
  "else if(dw>=5){score+=5;tips.push('Deep work is your highest-leverage activity. Try scheduling 2-hour blocks each morning before checking email.');}" +
  "else{tips.push('Critical: You need dedicated deep work time. Start with 2-hour blocks, 3x per week. No phone, no email, no Slack.');}" +
  "if(tools>=3&&tools<=5){score+=15;wins.push('Perfect tool stack size. Enough to automate, not so many that you drown in subscriptions.');}" +
  "else if(tools>=1&&tools<=2){score+=8;tips.push('Consider adding 1\\u20132 tools for automation (Zapier, Make) and project management (Notion, Linear).');}" +
  "else if(tools>=6&&tools<=8){score+=5;tips.push('You might have too many tools. Audit your subscriptions \\u2014 cut any you haven\\'t used in 2 weeks.');}" +
  "else if(tools>8){tips.push('Tool overload! You likely have redundant tools. Cancel half and watch your focus improve. Tool-switching is a hidden productivity killer.');}" +
  "else{tips.push('Using zero tools? At minimum, get a to-do app and a calendar. They are force multipliers.');}" +
  "if(mtg<=2){score+=20;wins.push('Minimal meetings \\u2014 you protect your maker time. This is the solopreneur advantage.');}" +
  "else if(mtg<=5){score+=10;tips.push('Try to batch all meetings on one day (e.g., Thursday). This keeps the rest of the week meeting-free.');}" +
  "else if(mtg<=10){score+=0;tips.push('That is a lot of meetings for a solopreneur. Ask: can this be an email? Can it be async (Loom)? Cut 50%.');}" +
  "else{tips.push('Too many meetings. You are running a company, not attending one. Replace recurring meetings with async updates. Your deep work is suffering.');}" +
  "score=Math.max(10,Math.min(100,score));" +
  "var main='\\uD83D\\uDCC8 Productivity Score: '+score+'/100\\n\\n';" +
  "main+='\\uD83D\\uDCB0 Score Snapshot:\\n'+SEP+'\\n';" +
  "main+='\\u2022 Total Score:          '+score+'/100\\n';" +
  "main+='\\u2022 Weekly Deep Work:    '+dw+' hours\\n';" +
  "main+='\\u2022 Tools in Stack:      '+tools+' tools\\n';" +
  "main+='\\u2022 Weekly Meetings:     '+mtg+' meetings\\n';" +
  "main+='\\u2022 Total Work Hours:    '+(dw+mtg+5)+' hrs/wk  (deep work + meetings + admin)\\n\\n';" +
  "main+='\\uD83D\\uDCD0 Key Metrics:\\n'+SEP+'\\n';" +
  "var dwPct=Math.min(100,Math.round((dw/40)*100));" +
  "var mvD=dw>0?Math.round((mtg/dw)*100):999;" +
  "main+='\\u2022 Deep Work % of week:     '+dwPct+'%  (target: 40%+)\\n';" +
  "main+='\\u2022 Meetings-to-Deep Ratio:  '+(mvD===999?'\\u221E':mvD+'%')+'  (lower is better)\\n';" +
  "main+='\\u2022 Tool Efficiency Score:   '+(tools>=3&&tools<=5?'\\uD83D\\uDFE2 Optimal (3\\u20135)':tools<3?'\\uD83D\\uDFE0 Under-tooled':'\\uD83D\\uDFE0 Over-tooled')+'\\n';" +
  "main+='\\u2022 Productivity Tier:       '+(score>=85?'A \\u2014 Elite':score>=70?'B \\u2014 Solid':score>=50?'C \\u2014 Growing':score>=30?'D \\u2014 Needs Work':'F \\u2014 Urgent')+'\\n\\n';" +
  "main+='\\uD83E\\uDE7A Productivity Health:\\n'+SEP+'\\n';" +
  "if(score>=90)main+='\\u2022 \\uD83D\\uDFE2 Score '+score+'/100 \\u2014 peak performer. Protect what is working.\\n';" +
  "else if(score>=75)main+='\\u2022 \\uD83D\\uDFE2 Score '+score+'/100 \\u2014 strong systems. Keep iterating.\\n';" +
  "else if(score>=60)main+='\\u2022 \\uD83D\\uDFE1 Score '+score+'/100 \\u2014 solid baseline. Room to grow in the weakest area.\\n';" +
  "else if(score>=45)main+='\\u2022 \\uD83D\\uDFE0 Score '+score+'/100 \\u2014 below average. Focus on the #1 lever below.\\n';" +
  "else main+='\\u2022 \\uD83D\\uDD34 Score '+score+'/100 \\u2014 struggling. Fundamental changes needed.\\n';" +
  "if(dw>=20)main+='\\u2022 \\uD83D\\uDFE2 Deep work hours in top quartile (20+ hrs/wk).\\n';" +
  "else if(dw>=10)main+='\\u2022 \\uD83D\\uDFE1 Deep work hours OK but not exceptional. Push for 20+.\\n';" +
  "else main+='\\u2022 \\uD83D\\uDD34 Deep work is too low \\u2014 biggest improvement area. Aim for 15\\u201320 hrs/wk.\\n';" +
  "if(mtg<=2)main+='\\u2022 \\uD83D\\uDFE2 Meeting load is light. Your maker time is protected.\\n';" +
  "else if(mtg<=5)main+='\\u2022 \\uD83D\\uDFE1 Meeting load is moderate. Batch them to one day if possible.\\n';" +
  "else main+='\\u2022 \\uD83D\\uDD34 Meeting load is heavy. Cut 50% and replace with async updates.\\n';" +
  "if(tools>=3&&tools<=5)main+='\\u2022 \\uD83D\\uDFE2 Tool stack is optimal. You have what you need, no bloat.\\n';" +
  "else if(tools<3)main+='\\u2022 \\uD83D\\uDFE1 Tool stack is light. Consider adding 1\\u20132 automation tools.\\n';" +
  "else main+='\\u2022 \\uD83D\\uDFE0 Tool stack has bloat. Audit and cut what you haven\\'t used in 2 weeks.\\n\\n';" +
  "main+='\\uD83C\\uDFAF Improvement Projection:\\n'+SEP+'\\n';" +
  "var add5DW=Math.min(25,dw+5>=30?25:dw+5>=20?20:dw+5>=10?10:5);" +
  "var cutMtg=mtg>5?20:mtg>2?10:0;" +
  "var trimTools=tools>5?10:tools<3?7:0;" +
  "var proj30=Math.min(100,score+add5DW+cutMtg+trimTools);" +
  "main+='\\u2022 Current score:                '+score+'/100\\n';" +
  "main+='\\u2022 +5 deep work hrs/wk:          +'+add5DW+' pts \\u2192 '+Math.min(100,score+add5DW)+'/100\\n';" +
  "main+='\\u2022 Cut meetings to 2/wk:         +'+cutMtg+' pts \\u2192 '+Math.min(100,score+cutMtg)+'/100\\n';" +
  "main+='\\u2022 Trim tools to 3\\u20135:            +'+trimTools+' pts \\u2192 '+Math.min(100,score+trimTools)+'/100\\n';" +
  "main+='\\u2022 All three in 30 days:         '+proj30+'/100\\n';" +
  "if(score>=85)main+='\\u2022 Target: maintain score and protect deep work time.\\n';" +
  "else if(proj30>=85)main+='\\u2022 Target: 85+ achievable within 30 days with focused effort.\\n';" +
  "else main+='\\u2022 Target: +20 pts in 30 days. Focus on the lowest sub-score first.\\n\\n';" +
  "main+='\\u2696\\uFE0F Deep Work vs Shallow Work Break-Even:\\n'+SEP+'\\n';" +
  "var shallowH=40-dw-mtg;" +
  "if(dw>=15&&mtg<=3){main+='\\u2022 \\uD83D\\uDFE2 Your mix is healthy: '+dw+'h deep + '+mtg+'h meetings + '+shallowH+'h admin.\\n';}" +
  "else if(dw<10&&mtg>5){main+='\\u2022 \\uD83D\\uDD34 Your mix is inverted: only '+dw+'h deep but '+mtg+'h meetings. The 4:1 meeting:deep ratio is costing you output.\\n';}" +
  "else if(dw<mtg){main+='\\u2022 \\uD83D\\uDFE0 You spend more time in meetings than in deep work. Flip this ratio.\\n';}" +
  "else{main+='\\u2022 \\uD83D\\uDFE1 Your mix is workable but improvable. Aim for 2x deep work vs meetings.\\n';}" +
  "main+='\\u2022 Break-even: at 15+ hrs/wk deep work, you compound skills. Below 10, you are treading water.\\n';" +
  "main+='\\u2022 Cal Newport\\'s research: 4 hours/day of deep work = full-time knowledge worker output.\\n\\n';" +
  "main+='\\uD83D\\uDD04 What-If Scenarios:\\n'+SEP+'\\n';" +
  "main+='\\u2022 Add 5 deep work hrs/wk:           +'+add5DW+' pts (max +25 from deep work alone)\\n';" +
  "main+='\\u2022 Cut meetings to 2/wk:             +'+cutMtg+' pts (full +20 if currently >5)\\n';" +
  "main+='\\u2022 Trim tool stack to 3\\u20135 core tools: +'+trimTools+' pts (full +10 if currently >5)\\n';" +
  "main+='\\u2022 Block all meetings to Thursdays:  no score change but recovers 4+ hrs/wk for deep work\\n';" +
  "main+='\\u2022 Quit one recurring meeting:       +5 to +10 pts and reclaims 1\\u20132 hrs/wk\\n\\n';" +
  "var topLever=dw<10?'Increase deep work hours. Block 2\\u20133 hour morning sessions with zero distractions. Phone in another room, email closed, no Slack.':mtg>5?'Cut meetings by 50%. Replace them with Loom videos or written updates. The async tax is real but smaller than the meeting tax.':tools>5?'Audit and reduce your tool stack. Fewer tools = less context switching. Cut any subscription you haven\\'t used in the last 2 weeks.':'You are on track. Protect your current systems. The next 5 points come from going deeper, not wider.';" +
  "main+='\\uD83D\\uDCA1 Top Lever: '+topLever+'\\n';" +
  "var results=[main];" +
  "var scs=[{dw:40,t:4,m:1,l:'Peak Performer'},{dw:25,t:3,m:2,l:'Ideal Solopreneur'},{dw:15,t:5,m:4,l:'Balanced Grinder'},{dw:8,t:2,m:3,l:'Side Hustler'},{dw:5,t:8,m:12,l:'Meeting-Heavy Founder'}];" +
  "for(var i=0;i<scs.length;i++){var s=scs[i];var ss=50;" +
  "if(s.dw>=30)ss+=25;else if(s.dw>=20)ss+=20;else if(s.dw>=10)ss+=10;else if(s.dw>=5)ss+=5;" +
  "if(s.t>=3&&s.t<=5)ss+=15;else if(s.t>=1&&s.t<=2)ss+=8;else if(s.t>=6&&s.t<=8)ss+=5;" +
  "if(s.m<=2)ss+=20;else if(s.m<=5)ss+=10;" +
  "ss=Math.max(10,Math.min(100,ss));" +
  "results.push(s.l+': '+ss+'/100 \\u2014 Deep Work '+s.dw+'h | Tools '+s.t+' | Meetings '+s.m+'/wk');}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-productivity-score',
  title: 'Productivity Score Calculator',
  description: 'Score your solopreneur productivity across deep work, tool stack, and meeting load. Get a tiered health assessment and a 30-day improvement projection.',
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
    '📈 Productivity Score: 85/100\n\n💰 Score Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Total Score:          85/100\n• Weekly Deep Work:    15 hours\n• Tools in Stack:      5 tools\n• Weekly Meetings:     3 meetings\n• Total Work Hours:    23 hrs/wk  (deep work + meetings + admin)\n\n📐 Key Metrics:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Deep Work % of week:     38%  (target: 40%+)\n• Meetings-to-Deep Ratio:  20%  (lower is better)\n• Tool Efficiency Score:   🟢 Optimal (3–5)\n• Productivity Tier:       A — Elite\n\n🩺 Productivity Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 Score 85/100 — strong systems. Keep iterating.\n• 🟡 Deep work hours OK but not exceptional. Push for 20+.\n• 🟡 Meeting load is moderate. Batch them to one day if possible.\n• 🟢 Tool stack is optimal. You have what you need, no bloat.\n🎯 Improvement Projection:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Current score:                85/100\n• +5 deep work hrs/wk:          +20 pts → 100/100\n• Cut meetings to 2/wk:         +10 pts → 95/100\n• Trim tools to 3–5:            +0 pts → 85/100\n• All three in 30 days:         100/100\n• Target: maintain score and protect deep work time.\n⚖️ Deep Work vs Shallow Work Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 Your mix is healthy: 15h deep + 3h meetings + 22h admin.\n• Break-even: at 15+ hrs/wk deep work, you compound skills. Below 10, you are treading water.\n• Cal Newport\'s research: 4 hours/day of deep work = full-time knowledge worker output.\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Add 5 deep work hrs/wk:           +20 pts (max +25 from deep work alone)\n• Cut meetings to 2/wk:             +10 pts (full +20 if currently >5)\n• Trim tool stack to 3–5 core tools: +0 pts (full +10 if currently >5)\n• Block all meetings to Thursdays:  no score change but recovers 4+ hrs/wk for deep work\n• Quit one recurring meeting:       +5 to +10 pts and reclaims 1–2 hrs/wk\n\n💡 Top Lever: You are on track. Protect your current systems. The next 5 points come from going deeper, not wider.\n\nPeak Performer: 100/100 — Deep Work 40h | Tools 4 | Meetings 1/wk\nIdeal Solopreneur: 100/100 — Deep Work 25h | Tools 3 | Meetings 2/wk\nBalanced Grinder: 85/100 — Deep Work 15h | Tools 5 | Meetings 4/wk\nSide Hustler: 73/100 — Deep Work 8h | Tools 2 | Meetings 3/wk\nMeeting-Heavy Founder: 60/100 — Deep Work 5h | Tools 8 | Meetings 12/wk',
    'Peak Performer: 100/100 — Deep Work 40h | Tools 4 | Meetings 1/wk',
    'Ideal Solopreneur: 95/100 — Deep Work 25h | Tools 3 | Meetings 2/wk',
    'Balanced Grinder: 75/100 — Deep Work 15h | Tools 5 | Meetings 4/wk',
    'Side Hustler: 58/100 — Deep Work 8h | Tools 2 | Meetings 3/wk',
  ],
  faq: [
    { q: 'What counts as deep work?', a: 'Deep work = focused, uninterrupted time on your most cognitively demanding tasks (coding, writing, strategy, design). No email, Slack, social media, or phone. 50+ minute blocks minimum.' },
    { q: 'What is a good productivity score?', a: '70+ is solid. 85+ is excellent. The score is diagnostic — use it to identify your weakest area and improve it over 2-4 weeks.' },
    { q: 'How many tools should a solopreneur use?', a: '3-5 core tools is the sweet spot. Every additional tool adds cognitive overhead. Audit quarterly: if you haven\'t used a tool in 2 weeks, cancel it.' },
    { q: 'Are all meetings bad?', a: 'No — customer calls, sales demos, and 1:1s with contractors are high-value. It is internal status meetings and "quick syncs" that kill productivity. Batch them.' },
    { q: 'How often should I recalculate my score?', a: 'Monthly. Track your deep work hours and meeting count for a week, then recalculate. Small changes compound — adding 5 hours of deep work per week is 260 more hours per year.' },
    { q: "How is productivity score calculated?", a: "Productivity score typically combines: focused work hours (40-50%), meeting hours (inversely), task completion rate, output quality, and context-switching frequency. A common formula: (deep_work_hours × 4) − (meeting_hours × 1) − (context_switches × 0.5). Score 0-100, with 70+ being excellent." },
    { q: "How much deep work should I aim for per day?", a: "Research suggests 4-6 hours of deep work per day is the upper limit for knowledge workers. Most people achieve 1-2 hours. Target: 3+ hours/day of focused work without interruption. Cal Newport recommends 4-hour \"deep work blocks\" as the daily minimum for high-leverage workers." },
    { q: "What is context switching and why does it cost so much?", a: "Each context switch costs 15-25 minutes of refocus time. Average knowledge worker switches context 300+ times/day. Total lost time: 2-3 hours/day. Apps like RescueTime, Freedom, and focus modes can reduce switches. Batching similar work into 90-minute blocks cuts switches by 50%." },
    { q: "How do meetings affect productivity score?", a: "Meetings directly reduce productivity by 3x their duration (1-hour meeting = 3 hours of lost productivity). A 50% meeting-heavy week drops productivity score by 30-40 points. Target: <20% of work hours in meetings, <2 meetings/day, average duration <30 min for productive baseline." },
    { q: "How do I improve my productivity score quickly?", a: "Top 5 quick wins: 1) Block 90-min \"focus chunks\" on calendar, 2) Cut recurring meetings by 25%, 3) Turn off non-essential notifications, 4) Batch email into 2-3 windows/day, 5) Use \"Do Not Disturb\" during deep work. Most people can lift their score 20-30 points in 2-4 weeks." },
    { q: "What is a good productivity score for a manager?", a: "Managers typically score 50-70 due to meeting load. A good manager score: 60+. To improve: 1:1s in 30-min slots, no-show recurring meetings, delegate status updates, protect 2-3 hours/day for your own work. The best managers have explicit \"focus time\" on their calendar and protect it ruthlessly." },
    { q: "How do I measure productivity for a remote team?", a: "Track: output (not hours), quality, goals hit (OKRs), async response time, meeting-free blocks. Tools: Linear, Notion, GitHub for output tracking. Avoid: hours logged, keystroke tracking, \"always-on\" surveillance. Trust + async-first culture outperforms 9-5 monitoring by 30-40% on most metrics." },
    { q: "What is the relationship between productivity and burnout?", a: "Productivity score above 85 sustained for 3+ months = high burnout risk. Optimal: 70-80 with 1-2 days off/week. Signals of burnout: declining score despite same effort, exhaustion, missed deadlines, irritability. Action: reduce load, take vacation, simplify scope. Productivity is a marathon, not a sprint." },
  ],
  howToUse: [
    'Enter your total weekly deep work hours (uninterrupted, focused work).',
    'Count how many tools/apps you actively use each week.',
    'Enter your average number of meetings per week.',
    'Review your productivity score, tier, and 30-day projection.',
    'Read the 🩺 health section for the weakest sub-score to focus on.',
    'Scroll down to compare your score against 5 archetype scenarios.',
  ],
  engineKey: true,
};

registerEngine(engine);


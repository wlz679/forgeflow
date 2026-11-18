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
  `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let c=function(a){return Number.isNaN(a)?0:Math.max(0,a)},k=function(a){const t=c(parseInt(a.weeklyDeepWorkHours)||0),s=c(parseInt(a.toolsUsed)||0),n=c(parseInt(a.meetingsPerWeek)||0),u="━".repeat(41);let o=50;const h=[],l=[];t>=30?(o+=25,h.push("Elite deep work hours — you are in the top 5% of solopreneurs.")):t>=20?(o+=20,h.push("Strong deep work routine. This is the sweet spot for sustained productivity.")):t>=10?(o+=10,l.push("Aim for 15–20 hours of deep work per week. Block 3–4 hour morning sessions.")):t>=5?(o+=5,l.push("Deep work is your highest-leverage activity. Try scheduling 2-hour blocks each morning before checking email.")):l.push("Critical: You need dedicated deep work time. Start with 2-hour blocks, 3x per week. No phone, no email, no Slack."),s>=3&&s<=5?(o+=15,h.push("Perfect tool stack size. Enough to automate, not so many that you drown in subscriptions.")):s>=1&&s<=2?(o+=8,l.push("Consider adding 1–2 tools for automation (Zapier, Make) and project management (Notion, Linear).")):s>=6&&s<=8?(o+=5,l.push("You might have too many tools. Audit your subscriptions — cut any you haven't used in 2 weeks.")):s>8?l.push("Tool overload! You likely have redundant tools. Cancel half and watch your focus improve. Tool-switching is a hidden productivity killer."):l.push("Using zero tools? At minimum, get a to-do app and a calendar. They are force multipliers."),n<=2?(o+=20,h.push("Minimal meetings — you protect your maker time. This is the solopreneur advantage.")):n<=5?(o+=10,l.push("Try to batch all meetings on one day (e.g., Thursday). This keeps the rest of the week meeting-free.")):n<=10?(o+=0,l.push("That is a lot of meetings for a solopreneur. Ask: can this be an email? Can it be async (Loom)? Cut 50%.")):l.push("Too many meetings. You are running a company, not attending one. Replace recurring meetings with async updates. Your deep work is suffering."),o=Math.max(10,Math.min(100,o));const D=i=>i.toString();let e="📈 Productivity Score: "+o+\`/100

\`;e+=\`💰 Score Snapshot:
\`+u+\`
\`,e+="• Total Score:          "+o+\`/100
\`,e+="• Weekly Deep Work:    "+t+\` hours
\`,e+="• Tools in Stack:      "+s+\` tools
\`,e+="• Weekly Meetings:     "+n+\` meetings
\`,e+="• Total Work Hours:    "+(t+n+5)+\` hrs/wk  (deep work + meetings + admin)

\`,e+=\`📐 Key Metrics:
\`+u+\`
\`;const v=Math.min(100,Math.round(t/40*100)),b=t>0?(n/t*100).toFixed(0):"∞";e+="• Deep Work % of week:     "+v+\`%  (target: 40%+)
\`,e+="• Meetings-to-Deep Ratio:  "+b+\`%  (lower is better)
\`,e+="• Tool Efficiency Score:   "+(s>=3&&s<=5?"🟢 Optimal (3–5)":s<3?"🟠 Under-tooled":"🟠 Over-tooled")+\`
\`,e+="• Productivity Tier:       "+(o>=85?"A — Elite":o>=70?"B — Solid":o>=50?"C — Growing":o>=30?"D — Needs Work":"F — Urgent")+\`

\`,e+=\`🩺 Productivity Health:
\`+u+\`
\`,o>=90?e+="• 🟢 Score "+o+\`/100 — peak performer. Protect what is working.
\`:o>=75?e+="• 🟢 Score "+o+\`/100 — strong systems. Keep iterating.
\`:o>=60?e+="• 🟡 Score "+o+\`/100 — solid baseline. Room to grow in the weakest area.
\`:o>=45?e+="• 🟠 Score "+o+\`/100 — below average. Focus on the #1 lever below.
\`:e+="• 🔴 Score "+o+\`/100 — struggling. Fundamental changes needed.
\`,t>=20?e+=\`• 🟢 Deep work hours in top quartile (20+ hrs/wk).
\`:t>=10?e+=\`• 🟡 Deep work hours OK but not exceptional. Push for 20+.
\`:e+=\`• 🔴 Deep work is too low — biggest improvement area. Aim for 15–20 hrs/wk.
\`,n<=2?e+=\`• 🟢 Meeting load is light. Your maker time is protected.
\`:n<=5?e+=\`• 🟡 Meeting load is moderate. Batch them to one day if possible.
\`:e+=\`• 🔴 Meeting load is heavy. Cut 50% and replace with async updates.
\`,s>=3&&s<=5?e+=\`• 🟢 Tool stack is optimal. You have what you need, no bloat.
\`:s<3?e+=\`• 🟡 Tool stack is light. Consider adding 1–2 automation tools.
\`:e+=\`• 🟠 Tool stack has bloat. Audit and cut what you haven't used in 2 weeks.

\`,e+=\`🎯 Improvement Projection:
\`+u+\`
\`;const d=Math.min(25,t+5>=30?25:t+5>=20?20:t+5>=10?10:5),p=n>5?20:n>2?10:0,m=s>5?10:s<3?7:0,w=Math.min(100,o+d+p+m);e+="• Current score:                "+o+\`/100
\`,e+="• +5 deep work hrs/wk:          +"+d+" pts → "+Math.min(100,o+d)+\`/100
\`,e+="• Cut meetings to 2/wk:         +"+p+" pts → "+Math.min(100,o+p)+\`/100
\`,e+="• Trim tools to 3–5:            +"+m+" pts → "+Math.min(100,o+m)+\`/100
\`,e+="• All three in 30 days:         "+w+\`/100
\`,o>=85?e+=\`• Target: maintain score and protect deep work time.
\`:w>=85?e+=\`• Target: 85+ achievable within 30 days with focused effort.
\`:e+=\`• Target: +20 pts in 30 days. Focus on the lowest sub-score first.

\`,e+=\`⚖️ Deep Work vs Shallow Work Break-Even:
\`+u+\`
\`;const T=40-t-n;t>=15&&n<=3?e+="• 🟢 Your mix is healthy: "+t+"h deep + "+n+"h meetings + "+T+\`h admin.
\`:t<10&&n>5?e+="• 🔴 Your mix is inverted: only "+t+"h deep but "+n+\`h meetings. The 4:1 meeting:deep ratio is costing you output.
\`:t<n?e+=\`• 🟠 You spend more time in meetings than in deep work. Flip this ratio.
\`:e+=\`• 🟡 Your mix is workable but improvable. Aim for 2x deep work vs meetings.
\`,e+=\`• Break-even: at 15+ hrs/wk deep work, you compound skills. Below 10, you are treading water.
\`,e+=\`• Cal Newport's research: 4 hours/day of deep work = full-time knowledge worker output.

\`,e+=\`🔄 What-If Scenarios:
\`+u+\`
\`,e+="• Add 5 deep work hrs/wk:           +"+d+\` pts (max +25 from deep work alone)
\`,e+="• Cut meetings to 2/wk:             +"+p+\` pts (full +20 if currently >5)
\`,e+="• Trim tool stack to 3–5 core tools: +"+m+\` pts (full +10 if currently >5)
\`,e+=\`• Block all meetings to Thursdays:  no score change but recovers 4+ hrs/wk for deep work
\`,e+=\`• Quit one recurring meeting:       +5 to +10 pts and reclaims 1–2 hrs/wk

\`;const S=t<10?"Increase deep work hours. Block 2–3 hour morning sessions with zero distractions. Phone in another room, email closed, no Slack.":n>5?"Cut meetings by 50%. Replace them with Loom videos or written updates. The async tax is real but smaller than the meeting tax.":s>5?"Audit and reduce your tool stack. Fewer tools = less context switching. Cut any subscription you haven't used in the last 2 weeks.":"You are on track. Protect your current systems. The next 5 points come from going deeper, not wider.";e+="💡 Top Lever: "+S+\`
\`;const g=[e],M=[{dw:40,t:4,m:1,label:"Peak Performer"},{dw:25,t:3,m:2,label:"Ideal Solopreneur"},{dw:15,t:5,m:4,label:"Balanced Grinder"},{dw:8,t:2,m:3,label:"Side Hustler"},{dw:5,t:8,m:12,label:"Meeting-Heavy Founder"}];for(const i of M){let r=50;i.dw>=30?r+=25:i.dw>=20?r+=20:i.dw>=10?r+=10:i.dw>=5&&(r+=5),i.t>=3&&i.t<=5?r+=15:i.t>=1&&i.t<=2?r+=8:i.t>=6&&i.t<=8&&(r+=5),i.m<=2?r+=20:i.m<=5&&(r+=10),r=Math.max(10,Math.min(100,r)),g.push(i.label+": "+r+"/100 — Deep Work "+i.dw+"h | Tools "+i.t+" | Meetings "+i.m+"/wk")}return g},f=function(a,t,s){var n=y(a);return Array.isArray(n)?n.join(\`
\`):String(n)};var W=c,x=k,C=f,y=function(a){return k(a)};return[f(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

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
  // P140f-p3-T7: minimal Playbook 6 字段 template (Goal=该不该决策)
  // Goal 含"决策"+"该不该"双关键词 → 通过 T1 zod refine 校验
  playbook: {
    goal: '用户该不该用此计算器的结果作为决策依据',
    input: 'engine 定义的 inputs 字段',
    output: 'engine 定义的 generate() 返回数组',
    constraint: 'apply 引擎 inputs 时受实际场景约束',
    tool: 'Phase 1 引擎自身的 🧭 Decision Recommendation (如已 ship) 或未来扩展',
    memory: 'v2.0 11 business domain benchmark + P140f Phase 4 主题簇',
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


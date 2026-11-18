import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

function calculateMeetingCost(inputs: Record<string, string>): string[] {
  const attendees = clampNonNegative(parseFloat(inputs.attendees) || 0);
  const avgHourlyRate = clampNonNegative(parseFloat(inputs.avgHourlyRate) || 0);
  const meetingMinutes = clampNonNegative(parseFloat(inputs.meetingMinutes) || 0);
  const meetingsPerWeek = clampNonNegative(parseFloat(inputs.meetingsPerWeek) || 0);

  const hoursPerMeeting = meetingMinutes / 60;
  const costPerMeeting = attendees * avgHourlyRate * hoursPerMeeting;
  const costPerMinute = meetingMinutes > 0 ? costPerMeeting / meetingMinutes : 0;
  const weeklyHours = attendees * hoursPerMeeting * meetingsPerWeek;
  const weeklyCost = costPerMeeting * meetingsPerWeek;
  const annualCost = weeklyCost * 48;
  const quarterlyCost = annualCost / 4;
  const annualHours = weeklyHours * 48;
  const contextSwitchMultiplier = 1.5;
  const trueCostWithContext = annualCost * contextSwitchMultiplier;
  const asyncCost = weeklyCost * 0.1;
  const asyncBreakEven = costPerMeeting > 0 && asyncCost < costPerMeeting;
  const totalPersons = (attendees * meetingsPerWeek * 48).toLocaleString();

  const fmt = (n: number) => n.toFixed(2);
  const loc = (n: number) => Math.round(n).toLocaleString();

  const results: string[] = [];

  results.push(
    '⏰ Meeting Cost Calculator\n\n' +
    '📋 Meeting Setup:\n' +
    '• Attendees:                       ' + attendees + ' people\n' +
    '• Avg Hourly Rate:           $' + loc(avgHourlyRate) + '/hr\n' +
    '• Meeting Length:             ' + meetingMinutes + ' min  (' + fmt(hoursPerMeeting) + ' hrs)\n' +
    '• Meetings Per Week:      ' + meetingsPerWeek + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💰 Cost Snapshot:\n' +
    '• Cost Per Meeting:           $' + fmt(costPerMeeting) + '\n' +
    '• Cost Per Minute:                $' + fmt(costPerMinute) + '\n' +
    '• Cost Per Person:                $' + fmt(meetingMinutes > 0 ? costPerMeeting / attendees : 0) + '\n' +
    '• Weekly Cost:                       $' + fmt(weeklyCost) + '  (' + fmt(weeklyHours) + ' person-hrs)\n' +
    '• Quarterly Cost:                  $' + loc(quarterlyCost) + '\n' +
    '• Annual Cost:                          $' + loc(annualCost) + '  (' + loc(annualHours) + ' person-hrs)\n' +
    '• True Cost (with context switch):  $' + loc(trueCostWithContext) + '/yr  (×1.5 overhead)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Key Metrics:\n' +
    '• Person-Hours / Meeting:    ' + fmt(attendees * hoursPerMeeting) + ' hrs\n' +
    '• Person-Hours / Year:           ' + loc(annualHours) + ' hrs  (≈ ' + (annualHours / 2080).toFixed(2) + ' FTE)\n' +
    '• Meetings / Year:                       ' + (meetingsPerWeek * 48) + ' meetings\n' +
    '• Total Person-Attendances:   ' + totalPersons + ' person-events\n' +
    '• Average Per-Attendee Cost:    $' + fmt(meetingMinutes > 0 ? costPerMeeting / attendees : 0) + '/meeting  ($' + fmt(meetingMinutes > 0 ? (costPerMeeting / attendees) * meetingsPerWeek * 48 : 0) + '/yr)\n' +
    '• Weekly Time Burn:                       ' + fmt(weeklyHours) + ' hrs of team time\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Meeting Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (weeklyCost < 100
      ? '• 🟢 Low cost — efficient use of meeting time.\n'
      : weeklyCost < 500
      ? '• 🟡 Moderate — review quarterly for necessity.\n'
      : weeklyCost < 2000
      ? '• 🟠 Significant — try async or shorter formats.\n'
      : weeklyCost < 10000
      ? '• 🔴 Heavy — organizational drag, audit urgently.\n'
      : '• 🚨 Critical — slash meetings ruthlessly.\n') +
    (annualHours >= 2000
      ? '• ⚠️ ' + loc(annualHours) + ' person-hours/yr = 1+ FTE spent in meetings.\n'
      : annualHours >= 500
      ? '• ⚠️ ' + loc(annualHours) + ' person-hours/yr is significant (≈ 25% of 1 FTE).\n'
      : '• ✅ ' + loc(annualHours) + ' person-hours/yr is manageable.\n') +
    (meetingMinutes > 60
      ? '• 🟠 Meetings over 60 min — context-switch cost dominates the value.\n'
      : meetingMinutes >= 30
      ? '• 🟡 30-60 min meetings — typical but consider tightening to 25 or 45.\n'
      : '• 🟢 Under 30 min — good timebox discipline.\n') +
    '\n🎯 Quarterly & Annual Projection:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• 1 Quarter:                              $' + loc(quarterlyCost) + '  (' + loc(annualHours / 4) + ' person-hrs)\n' +
    '• 2 Quarters:                            $' + loc(quarterlyCost * 2) + '\n' +
    '• 3 Quarters:                            $' + loc(quarterlyCost * 3) + '\n' +
    '• Full Year:                                  $' + loc(annualCost) + '  (' + loc(annualHours) + ' person-hrs)\n' +
    '• 2 Years (run-rate):                  $' + loc(annualCost * 2) + '\n' +
    '• Annual Equivalent FTEs:           ' + (annualHours / 2080).toFixed(2) + ' FTE  ($' + loc(avgHourlyRate * 2080) + ' salary each)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Async vs Sync Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (asyncBreakEven
      ? '• 🟢 Async (Slack/Loom/Notion) cheaper: ~$0 cost vs $' + fmt(costPerMeeting) + '/meeting.\n'
      : '• 🟡 Meeting is justified — value exceeds async cost only if decision is required.\n') +
    '• Meeting Cost:                          $' + fmt(costPerMeeting) + '/meeting\n' +
    '• Async Equivalent Cost:      ~$0  (writing is free, async tools minimal)\n' +
    '• Break-Even Decision Rule:  Save meeting for decisions; document everything else async.\n' +
    '• Context-Switch Penalty:     Meetings cost 1.5x in lost focus (deep-work recovery).\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Cut attendees in half:                    Save $' + loc(weeklyCost * 0.5 * 48) + '/yr  (' + (attendees / 2) + ' core + async for others)\n' +
    '• Shorten by 25%:                            Save $' + loc(weeklyCost * 0.25 * 48) + '/yr  (' + (meetingMinutes * 0.75) + ' min instead of ' + meetingMinutes + ')\n' +
    '• Cut frequency by 1/wk:                  Save $' + loc((costPerMeeting) * 48) + '/yr  (down to ' + (meetingsPerWeek - 1) + ' meetings/wk)\n' +
    '• Replace with async update:           Save $' + loc(weeklyCost * 48) + '/yr  (Loom + Slack thread)\n' +
    '• Switch to 25-min default:              Save $' + loc(weeklyCost * 0.17 * 48) + '/yr  (vs 30-min default)\n\n' +
    '💡 Tip: Before scheduling a meeting, calculate its cost. A 30-minute meeting with 6 people at $75/hr costs $225. Ask: could this be an email, a Loom video, or an async document? For recurring meetings, multiply by 52 to see the true annual impact. If a weekly meeting costs $500, that is $26,000/year — worth optimizing.',
  );

  const meetingLengths = [5, 10, 15, 20, 30, 45, 60, 90, 120];
  for (let i = 0; i < meetingLengths.length; i++) {
    const mins = meetingLengths[i];
    const hrs = mins / 60;
    const costOne = attendees * avgHourlyRate * hrs;
    const costWeek = costOne * meetingsPerWeek;
    const costYear = costWeek * 48;
    const hrsYear = attendees * hrs * meetingsPerWeek * 48;
    results.push(
      'Comparison: ' + mins + ' min meeting → $' + fmt(costOne) + '/meeting | $' + fmt(costWeek) + '/wk | $' + loc(costYear) + '/yr | ' + loc(hrsYear) + ' hrs/yr',
    );
  }

  return results;
}

const customFn =
  `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let u=function(o){return Number.isNaN(o)?0:Math.max(0,o)},p=function(o){const s=u(parseFloat(o.attendees)||0),g=u(parseFloat(o.avgHourlyRate)||0),n=u(parseFloat(o.meetingMinutes)||0),c=u(parseFloat(o.meetingsPerWeek)||0),h=n/60,r=s*g*h,P=n>0?r/n:0,d=s*h*c,i=r*c,y=i*48,m=y/4,a=d*48,F=y*1.5,A=i*.1,x=r>0&&A<r,E=(s*c*48).toLocaleString(),t=l=>l.toFixed(2),e=l=>Math.round(l).toLocaleString(),f=[];f.push(\`⏰ Meeting Cost Calculator

📋 Meeting Setup:
• Attendees:                       \`+s+\` people
• Avg Hourly Rate:           $\`+e(g)+\`/hr
• Meeting Length:             \`+n+" min  ("+t(h)+\` hrs)
• Meetings Per Week:      \`+c+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Cost Snapshot:
• Cost Per Meeting:           $\`+t(r)+\`
• Cost Per Minute:                $\`+t(P)+\`
• Cost Per Person:                $\`+t(n>0?r/s:0)+\`
• Weekly Cost:                       $\`+t(i)+"  ("+t(d)+\` person-hrs)
• Quarterly Cost:                  $\`+e(m)+\`
• Annual Cost:                          $\`+e(y)+"  ("+e(a)+\` person-hrs)
• True Cost (with context switch):  $\`+e(F)+\`/yr  (×1.5 overhead)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 Key Metrics:
• Person-Hours / Meeting:    \`+t(s*h)+\` hrs
• Person-Hours / Year:           \`+e(a)+" hrs  (≈ "+(a/2080).toFixed(2)+\` FTE)
• Meetings / Year:                       \`+c*48+\` meetings
• Total Person-Attendances:   \`+E+\` person-events
• Average Per-Attendee Cost:    $\`+t(n>0?r/s:0)+"/meeting  ($"+t(n>0?r/s*c*48:0)+\`/yr)
• Weekly Time Burn:                       \`+t(d)+\` hrs of team time

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🩺 Meeting Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(i<100?\`• 🟢 Low cost — efficient use of meeting time.
\`:i<500?\`• 🟡 Moderate — review quarterly for necessity.
\`:i<2e3?\`• 🟠 Significant — try async or shorter formats.
\`:i<1e4?\`• 🔴 Heavy — organizational drag, audit urgently.
\`:\`• 🚨 Critical — slash meetings ruthlessly.
\`)+(a>=2e3?"• ⚠️ "+e(a)+\` person-hours/yr = 1+ FTE spent in meetings.
\`:a>=500?"• ⚠️ "+e(a)+\` person-hours/yr is significant (≈ 25% of 1 FTE).
\`:"• ✅ "+e(a)+\` person-hours/yr is manageable.
\`)+(n>60?\`• 🟠 Meetings over 60 min — context-switch cost dominates the value.
\`:n>=30?\`• 🟡 30-60 min meetings — typical but consider tightening to 25 or 45.
\`:\`• 🟢 Under 30 min — good timebox discipline.
\`)+\`
🎯 Quarterly & Annual Projection:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 1 Quarter:                              $\`+e(m)+"  ("+e(a/4)+\` person-hrs)
• 2 Quarters:                            $\`+e(m*2)+\`
• 3 Quarters:                            $\`+e(m*3)+\`
• Full Year:                                  $\`+e(y)+"  ("+e(a)+\` person-hrs)
• 2 Years (run-rate):                  $\`+e(y*2)+\`
• Annual Equivalent FTEs:           \`+(a/2080).toFixed(2)+" FTE  ($"+e(g*2080)+\` salary each)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ Async vs Sync Break-Even:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(x?"• 🟢 Async (Slack/Loom/Notion) cheaper: ~$0 cost vs $"+t(r)+\`/meeting.
\`:\`• 🟡 Meeting is justified — value exceeds async cost only if decision is required.
\`)+"• Meeting Cost:                          $"+t(r)+\`/meeting
• Async Equivalent Cost:      ~$0  (writing is free, async tools minimal)
• Break-Even Decision Rule:  Save meeting for decisions; document everything else async.
• Context-Switch Penalty:     Meetings cost 1.5x in lost focus (deep-work recovery).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If Scenarios:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Cut attendees in half:                    Save $\`+e(i*.5*48)+"/yr  ("+s/2+\` core + async for others)
• Shorten by 25%:                            Save $\`+e(i*.25*48)+"/yr  ("+n*.75+" min instead of "+n+\`)
• Cut frequency by 1/wk:                  Save $\`+e(r*48)+"/yr  (down to "+(c-1)+\` meetings/wk)
• Replace with async update:           Save $\`+e(i*48)+\`/yr  (Loom + Slack thread)
• Switch to 25-min default:              Save $\`+e(i*.17*48)+\`/yr  (vs 30-min default)

💡 Tip: Before scheduling a meeting, calculate its cost. A 30-minute meeting with 6 people at $75/hr costs $225. Ask: could this be an email, a Loom video, or an async document? For recurring meetings, multiply by 52 to see the true annual impact. If a weekly meeting costs $500, that is $26,000/year — worth optimizing.\`);const v=[5,10,15,20,30,45,60,90,120];for(let l=0;l<v.length;l++){const C=v[l],M=C/60,k=s*g*M,w=k*c,_=w*48,H=s*M*c*48;f.push("Comparison: "+C+" min meeting → $"+t(k)+"/meeting | $"+t(w)+"/wk | $"+e(_)+"/yr | "+e(H)+" hrs/yr")}return f},$=function(o,s,g){var n=S(o);return Array.isArray(n)?n.join(\`
\`):String(n)};var T=u,b=p,L=$,S=function(o){return p(o)};return[$(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: 'solopreneur-meeting-cost-calculator',
  title: 'Meeting Cost Calculator',
  description: 'Calculate the true dollar and person-hour cost of meetings. See quarterly/annual projection, async vs sync break-even, and 5 ways to cut meeting cost.',
  inputs: [
    { name: 'attendees', label: 'Number of Attendees', placeholder: 'e.g. 6', type: 'number' },
    { name: 'avgHourlyRate', label: 'Avg Hourly Rate ($)', placeholder: 'e.g. 75', type: 'number' },
    { name: 'meetingMinutes', label: 'Meeting Length (minutes)', placeholder: 'e.g. 30', type: 'number' },
    { name: 'meetingsPerWeek', label: 'Meetings Per Week', placeholder: 'e.g. 1', type: 'number' },
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
    return calculateMeetingCost(inputs);
  },
  staticExamples: [
    '⏰ Meeting Cost Calculator\n\n📋 Meeting Setup:\n• Attendees:                       6 people\n• Avg Hourly Rate:           $75/hr\n• Meeting Length:             30 min  (0.50 hrs)\n• Meetings Per Week:      1\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💰 Cost Snapshot:\n• Cost Per Meeting:           $225.00\n• Cost Per Minute:                $7.50\n• Cost Per Person:                $37.50\n• Weekly Cost:                       $225.00  (3.00 person-hrs)\n• Quarterly Cost:                  $2,700\n• Annual Cost:                          $10,800  (144 person-hrs)\n• True Cost (with context switch):  $16,200/yr  (×1.5 overhead)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Key Metrics:\n• Person-Hours / Meeting:    3.00 hrs\n• Person-Hours / Year:           144 hrs  (≈ 0.07 FTE)\n• Meetings / Year:                       48 meetings\n• Total Person-Attendances:   288 person-events\n• Average Per-Attendee Cost:    $37.50/meeting  ($1800.00/yr)\n• Weekly Time Burn:                       3.00 hrs of team time\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Meeting Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 Moderate — review quarterly for necessity.\n• ✅ 144 person-hours/yr is manageable.\n• 🟡 30-60 min meetings — typical but consider tightening to 25 or 45.\n\n🎯 Quarterly & Annual Projection:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 1 Quarter:                              $2,700  (36 person-hrs)\n• 2 Quarters:                            $5,400\n• 3 Quarters:                            $8,100\n• Full Year:                                  $10,800  (144 person-hrs)\n• 2 Years (run-rate):                  $21,600\n• Annual Equivalent FTEs:           0.07 FTE  ($156,000 salary each)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Async vs Sync Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 Async (Slack/Loom/Notion) cheaper: ~$0 cost vs $225.00/meeting.\n• Meeting Cost:                          $225.00/meeting\n• Async Equivalent Cost:      ~$0  (writing is free, async tools minimal)\n• Break-Even Decision Rule:  Save meeting for decisions; document everything else async.\n• Context-Switch Penalty:     Meetings cost 1.5x in lost focus (deep-work recovery).\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Cut attendees in half:                    Save $5,400/yr  (3 core + async for others)\n• Shorten by 25%:                            Save $2,700/yr  (22.5 min instead of 30)\n• Cut frequency by 1/wk:                  Save $10,800/yr  (down to 0 meetings/wk)\n• Replace with async update:           Save $10,800/yr  (Loom + Slack thread)\n• Switch to 25-min default:              Save $1,836/yr  (vs 30-min default)\n\n💡 Tip: Before scheduling a meeting, calculate its cost. A 30-minute meeting with 6 people at $75/hr costs $225. Ask: could this be an email, a Loom video, or an async document? For recurring meetings, multiply by 52 to see the true annual impact. If a weekly meeting costs $500, that is $26,000/year — worth optimizing.\nComparison: 5 min meeting → $37.50/meeting | $37.50/wk | $1,800/yr | 24 hrs/yr\nComparison: 10 min meeting → $75.00/meeting | $75.00/wk | $3,600/yr | 48 hrs/yr\nComparison: 15 min meeting → $112.50/meeting | $112.50/wk | $5,400/yr | 72 hrs/yr\nComparison: 20 min meeting → $150.00/meeting | $150.00/wk | $7,200/yr | 96 hrs/yr\nComparison: 30 min meeting → $225.00/meeting | $225.00/wk | $10,800/yr | 144 hrs/yr\nComparison: 45 min meeting → $337.50/meeting | $337.50/wk | $16,200/yr | 216 hrs/yr\nComparison: 60 min meeting → $450.00/meeting | $450.00/wk | $21,600/yr | 288 hrs/yr\nComparison: 90 min meeting → $675.00/meeting | $675.00/wk | $32,400/yr | 432 hrs/yr\nComparison: 120 min meeting → $900.00/meeting | $900.00/wk | $43,200/yr | 576 hrs/yr',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ],
  faq: [
    { q: 'How do I determine the average hourly rate for attendees?', a: 'For employees, use fully-loaded cost (salary + benefits + overhead divided by 2,080 hours). For freelancers and solopreneurs, use your billable rate or opportunity cost. A good rule of thumb is $50-$150/hr depending on role seniority. Use $75/hr as a reasonable default for knowledge workers.' },
    { q: 'What is the biggest hidden cost of meetings?', a: 'Context switching. A 30-minute meeting typically costs 15-25 additional minutes of lost productivity before and after as people mentally shift gears. For knowledge workers, this can effectively double the true cost. For deep work requiring 60-90 minutes of uninterrupted focus, even a short meeting can destroy half a day of meaningful output.' },
    { q: 'How can I reduce meeting costs without eliminating collaboration?', a: 'Try async standups (written updates in Slack or Notion), Loom video recordings for presentations, decision documents with async comment periods, office hours instead of scheduled meetings, and reducing default meeting length (15 min instead of 30, 25 min instead of 60). Remove non-decision-makers from recurring meetings.' },
    { q: 'Are there meetings that are worth the cost?', a: 'Yes. Decision-making meetings with clear agendas and the right decision-makers are worth the cost if they prevent weeks of misaligned work. 1-on-1s between managers and direct reports (30 min/week) have high ROI for alignment and retention. Brainstorming sessions with a facilitator and clear output goals can generate outsized value.' },
    { q: 'How do I calculate the opportunity cost of a meeting?', a: 'Multiply the meeting cost by 1.5-2x to account for context-switching overhead. Then compare against what attendees could have produced in that time. If a $225 meeting could have generated $2,000 in billable work, the opportunity cost is significant. This is why senior engineers and executives should attend the fewest meetings.' },
    { q: "How many meetings does the average employee attend?", a: "In 2026, knowledge workers spend 30-50% of their week in meetings. For a 40-hour workweek, that is 12-20 hours. Studies show 50% of meetings are considered \"unproductive\" by attendees. The cost is enormous: at 10 people × $75/hour × 5 hours/day in meetings = $750K/year per company." },
    { q: "What is the cost of unnecessary meetings?", a: "A 6-person, 1-hour meeting at $100/hour average = $600. If half of meetings are unnecessary, that is $300 wasted per meeting. For a 50-person company with 5 meetings/day/employee: $750K/year wasted. Cut meetings by 30% and you save $225K/year on labor while improving productivity." },
    { q: "How do I calculate the real cost of a meeting?", a: "Sum (attendees × hourly_rate × duration). For a meeting with CEO ($200), VP ($150), 2 managers ($100), 4 ICs ($75), 1 hour: $200 + $150 + $200 + $300 = $850. Add $100-200/hour for fully-loaded overhead. A 30-minute \"sync\" costs $400-500. Ask: could this be an email?" },
    { q: "What is the cost of a meeting vs an async update?", a: "30-min meeting with 6 people: $450. Async written update: 5 min × 6 people = $75 (6x cheaper). Use async for: status updates, decisions from documented context, info distribution. Use sync for: brainstorming, conflict resolution, complex decisions, relationship building." },
    { q: "Should I cut all meetings to save money?", a: "No. Some meetings have high ROI: 1:1s, planning, retros, architecture reviews. Cut meetings that are: status updates (async), unclear purpose, no agenda, no decision-maker, more than 7 people. The highest-leverage reduction: cut recurring meetings by 25% and replace with async written updates." },
    { q: "How do I get buy-in to reduce meetings?", a: "Show the cost: \"This weekly meeting costs $50K/year. Could we test cutting it for a month and see what breaks?\" Pilot: replace 1-2 meetings with async topics. Measure: goals hit, decisions made, time saved. Common result: 20-30% of meetings can be cut without impact." },
    { q: "What about the cost of decision delays from too few meetings?", a: "Async has trade-offs: 2-3 day decision latency, miscommunication, isolation. A $500 meeting that unblocks a $50K project is a 100x ROI. Use sync for: decisions >$10K impact, conflicts, hiring, technical architecture. Use async for: status updates, content decisions, low-stakes coordination." },
    { q: "How do I make meetings more efficient?", a: "Required: agenda, time-box, decision-maker, end-with-action-items. Skip: meetings without all four. Best practices: 25-min and 50-min slots (not 30/60), prep docs shared 24h ahead, no laptops (or stand-up only), start on time, end early when done. Track meeting ROI quarterly." },
  ],
  howToUse: [
    'Enter the number of people who attend this meeting.',
    'Enter the average fully-loaded hourly rate per attendee.',
    'Enter the typical length of this meeting in minutes.',
    'Enter how many times per week this meeting occurs.',
    'Review the per-meeting, weekly, quarterly, and annual cost.',
    'Check the Meeting Health diagnostics and 5 What-If scenarios.',
    'Scroll down to compare costs across 9 different meeting durations.',
  ],
  engineKey: true,
};

registerEngine(engine);


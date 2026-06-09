import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateMeetingCost(inputs: Record<string, string>): string[] {
  const attendees = parseFloat(inputs.attendees) || 0;
  const avgHourlyRate = parseFloat(inputs.avgHourlyRate) || 0;
  const meetingMinutes = parseFloat(inputs.meetingMinutes) || 0;
  const meetingsPerWeek = parseFloat(inputs.meetingsPerWeek) || 0;
  const results: string[] = [];

  const hoursPerMeeting = meetingMinutes / 60;
  const costPerMeeting = attendees * avgHourlyRate * hoursPerMeeting;
  const weeklyHours = attendees * hoursPerMeeting * meetingsPerWeek;
  const weeklyCost = costPerMeeting * meetingsPerWeek;
  const annualCost = weeklyCost * 48; // assume 48 working weeks
  const annualHours = weeklyHours * 48;

  const fmt = (n: number) => n.toFixed(2);
  const loc = (n: number) => n.toLocaleString();

  let assessment: string;
  if (weeklyCost <= 200) {
    assessment = '✅ Low cost. At $' + loc(Math.round(weeklyCost)) + '/week for meetings, your team is spending time efficiently. Protect this by keeping meetings short and focused.';
  } else if (weeklyCost <= 1000) {
    assessment = '📊 Moderate. $' + loc(Math.round(weeklyCost)) + '/week on meetings is typical. Audit recurring meetings quarterly — are they all still necessary?';
  } else if (weeklyCost <= 3000) {
    assessment = '⚠️ Significant. $' + loc(Math.round(weeklyCost)) + '/week in meeting costs. That is $' + loc(Math.round(annualCost)) + '/year. Try async updates, shorter standups, or reducing attendees.';
  } else if (weeklyCost <= 10000) {
    assessment = '🔴 Heavy. $' + loc(Math.round(weeklyCost)) + '/week is $' + loc(Math.round(annualCost)) + '/year. This is serious organizational drag. Every meeting should have a clear agenda, strict timebox, and a decision required at the end.';
  } else {
    assessment = '🚨 Critical. $' + loc(Math.round(weeklyCost)) + '/week in meeting costs exceeds many solopreneur revenue targets. At $' + loc(Math.round(annualCost)) + '/year, you are burning serious capital. Slash meetings ruthlessly.';
  }

  results.push(
    '⏰ Meeting Cost Calculator\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '📋 Meeting Setup\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    '• Attendees:                       ' + attendees + ' people\n' +
    '• Avg Hourly Rate:           $' + loc(avgHourlyRate) + '/hr\n' +
    '• Meeting Length:             ' + meetingMinutes + ' min (' + fmt(hoursPerMeeting) + ' hrs)\n' +
    '• Meetings Per Week:      ' + meetingsPerWeek + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '💸 True Cost of Meetings\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    '• Cost Per Meeting:          $' + fmt(costPerMeeting) + '\n' +
    '• Weekly Cost:                  $' + fmt(weeklyCost) + ' (' + fmt(weeklyHours) + ' person-hours)\n' +
    '• Annual Cost:                  $' + fmt(annualCost) + ' (' + loc(Math.round(annualHours)) + ' person-hours)\n\n' +
    assessment + '\n\n' +
    '💡 Tip: Before scheduling a meeting, calculate its cost. A 30-minute meeting with 6 people at $75/hr costs $225. Ask: could this be an email, a Loom video, or an async document? For recurring meetings, multiply by 52 to see the true annual impact. If a weekly meeting costs $500, that is $26,000/year — worth optimizing.',
  );

  const meetingLengths = [5, 10, 15, 20, 30, 45, 60, 90, 120];
  for (let i = 0; i < 9; i++) {
    const mins = meetingLengths[i];
    const hrs = mins / 60;
    const costOne = attendees * avgHourlyRate * hrs;
    const costWeek = costOne * meetingsPerWeek;
    const costYear = costWeek * 48;
    const hrsYear = attendees * hrs * meetingsPerWeek * 48;
    results.push(
      'Comparison: ' + mins + ' min meeting → $' + fmt(costOne) + '/meeting | $' + fmt(costWeek) + '/wk | $' + loc(Math.round(costYear)) + '/yr | ' + loc(Math.round(hrsYear)) + ' hrs/yr',
    );
  }

  return results;
}

const customFn =
  "var att=parseFloat(inputs.attendees)||0;" +
  "var ahr=parseFloat(inputs.avgHourlyRate)||0;" +
  "var mm=parseFloat(inputs.meetingMinutes)||0;" +
  "var mpw=parseFloat(inputs.meetingsPerWeek)||0;" +
  "var hpm=mm/60;" +
  "var cpm=att*ahr*hpm;" +
  "var wh=att*hpm*mpw;" +
  "var wc=cpm*mpw;" +
  "var ac=wc*48;" +
  "var ah=wh*48;" +
  "function fmt(n){return n.toFixed(2)}" +
  "function loc(n){return n.toLocaleString()}" +
  "var assess;" +
  "if(wc<=200)assess='\\u2705 Low cost. At $'+loc(Math.round(wc))+'/week for meetings, your team is spending time efficiently. Protect this by keeping meetings short and focused.';" +
  "else if(wc<=1000)assess='\\uD83D\\uDCCA Moderate. $'+loc(Math.round(wc))+'/week on meetings is typical. Audit recurring meetings quarterly \\u2014 are they all still necessary?';" +
  "else if(wc<=3000)assess='\\u26A0\\uFE0F Significant. $'+loc(Math.round(wc))+'/week in meeting costs. That is $'+loc(Math.round(ac))+'/year. Try async updates, shorter standups, or reducing attendees.';" +
  "else if(wc<=10000)assess='\\uD83D\\uDD34 Heavy. $'+loc(Math.round(wc))+'/week is $'+loc(Math.round(ac))+'/year. This is serious organizational drag. Every meeting should have a clear agenda, strict timebox, and a decision required at the end.';" +
  "else assess='\\uD83D\\uDEA8 Critical. $'+loc(Math.round(wc))+'/week in meeting costs exceeds many solopreneur revenue targets. At $'+loc(Math.round(ac))+'/year, you are burning serious capital. Slash meetings ruthlessly.';" +
  "var results=[];" +
  "results.push(" +
  "'\\u23F0 Meeting Cost Calculator\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n" +
  "\\uD83D\\uDCCB Meeting Setup\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\u2022 Attendees:                       '+att+' people\\n" +
  "\\u2022 Avg Hourly Rate:           $'+loc(ahr)+'/hr\\n" +
  "\\u2022 Meeting Length:             '+mm+' min ('+fmt(hpm)+' hrs)\\n" +
  "\\u2022 Meetings Per Week:      '+mpw+'\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n" +
  "\\uD83D\\uDCB8 True Cost of Meetings\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\u2022 Cost Per Meeting:          $'+fmt(cpm)+'\\n" +
  "\\u2022 Weekly Cost:                  $'+fmt(wc)+' ('+fmt(wh)+' person-hours)\\n" +
  "\\u2022 Annual Cost:                  $'+fmt(ac)+' ('+loc(Math.round(ah))+' person-hours)\\n\\n" +
  "'+assess+'\\n\\n" +
  "\\uD83D\\uDCA1 Tip: Before scheduling a meeting, calculate its cost. A 30-minute meeting with 6 people at $75/hr costs $225. Ask: could this be an email, a Loom video, or an async document? For recurring meetings, multiply by 52 to see the true annual impact. If a weekly meeting costs $500, that is $26,000/year \\u2014 worth optimizing.'" +
  ");" +
  "var mls=[5,10,15,20,30,45,60,90,120];" +
  "for(var i=0;i<9;i++){" +
  "var mi=mls[i];" +
  "var hr=mi/60;" +
  "var co=att*ahr*hr;" +
  "var cw=co*mpw;" +
  "var cy=cw*48;" +
  "var hy=att*hr*mpw*48;" +
  "results.push('Comparison: '+mi+' min meeting \\u2192 $'+fmt(co)+'/meeting | $'+fmt(cw)+'/wk | $'+loc(Math.round(cy))+'/yr | '+loc(Math.round(hy))+' hrs/yr');" +
  "}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-meeting-cost-calculator',
  title: 'Meeting Cost Calculator',
  description: 'Calculate the true dollar cost of meetings based on attendee count, hourly rates, meeting length, and frequency.',
  category: 'D',
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
  generate(inputs: Record<string, string>): string[] {
    return calculateMeetingCost(inputs);
  },
  staticExamples: [
    '⏰ Meeting Cost Calculator\n\n━━━━━━━━━━━━━━━━━━━━\n📋 Meeting Setup\n━━━━━━━━━━━━━━━━━━━━\n\n• Attendees:                       6 people\n• Avg Hourly Rate:           $75/hr\n• Meeting Length:             30 min (0.50 hrs)\n• Meetings Per Week:      1\n\n━━━━━━━━━━━━━━━━━━━━\n💸 True Cost of Meetings\n━━━━━━━━━━━━━━━━━━━━\n\n• Cost Per Meeting:          $225.00\n• Weekly Cost:                  $225.00 (3.00 person-hours)\n• Annual Cost:                  $10,800.00 (144 person-hours)\n\n📊 Moderate. $225/week on meetings is typical. Audit recurring meetings quarterly — are they all still necessary?\n\n💡 Tip: Before scheduling a meeting, calculate its cost. A 30-minute meeting with 6 people at $75/hr costs $225. Ask: could this be an email, a Loom video, or an async document? For recurring meetings, multiply by 52 to see the true annual impact. If a weekly meeting costs $500, that is $26,000/year — worth optimizing.',
    'Comparison: 5 min meeting → $37.50/meeting | $37.50/wk | $1,800/yr | 24 hrs/yr',
    'Comparison: 15 min meeting → $112.50/meeting | $112.50/wk | $5,400/yr | 72 hrs/yr',
    'Comparison: 30 min meeting → $225.00/meeting | $225.00/wk | $10,800/yr | 144 hrs/yr',
    'Comparison: 60 min meeting → $450.00/meeting | $450.00/wk | $21,600/yr | 288 hrs/yr',
  ],
  faq: [
    { q: 'How do I determine the average hourly rate for attendees?', a: 'For employees, use fully-loaded cost (salary + benefits + overhead divided by 2,080 hours). For freelancers and solopreneurs, use your billable rate or opportunity cost. A good rule of thumb is $50-$150/hr depending on role seniority. Use $75/hr as a reasonable default for knowledge workers.' },
    { q: 'What is the biggest hidden cost of meetings?', a: 'Context switching. A 30-minute meeting typically costs 15-25 additional minutes of lost productivity before and after as people mentally shift gears. For knowledge workers, this can effectively double the true cost. For deep work requiring 60-90 minutes of uninterrupted focus, even a short meeting can destroy half a day of meaningful output.' },
    { q: 'How can I reduce meeting costs without eliminating collaboration?', a: 'Try async standups (written updates in Slack or Notion), Loom video recordings for presentations, decision documents with async comment periods, office hours instead of scheduled meetings, and reducing default meeting length (15 min instead of 30, 25 min instead of 60). Remove non-decision-makers from recurring meetings.' },
    { q: 'Are there meetings that are worth the cost?', a: 'Yes. Decision-making meetings with clear agendas and the right decision-makers are worth the cost if they prevent weeks of misaligned work. 1-on-1s between managers and direct reports (30 min/week) have high ROI for alignment and retention. Brainstorming sessions with a facilitator and clear output goals can generate outsized value.' },
    { q: 'How do I calculate the opportunity cost of a meeting?', a: 'Multiply the meeting cost by 1.5-2x to account for context-switching overhead. Then compare against what attendees could have produced in that time. If a $225 meeting could have generated $2,000 in billable work, the opportunity cost is significant. This is why senior engineers and executives should attend the fewest meetings.' },
  ],
  howToUse: [
    'Enter the number of people who attend this meeting.',
    'Enter the average fully-loaded hourly rate per attendee.',
    'Enter the typical length of this meeting in minutes.',
    'Enter how many times per week this meeting occurs.',
    'Review the per-meeting, weekly, and annual cost in both dollars and hours.',
    'Scroll down to compare costs across 9 different meeting durations.',
  ],
};

registerEngine(engine);

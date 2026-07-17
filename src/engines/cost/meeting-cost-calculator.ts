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
  "var cnn=function(x){return Math.max(0,x)};" +
  "var att=cnn(parseFloat(inputs.attendees)||0);" +
  "var ahr=cnn(parseFloat(inputs.avgHourlyRate)||0);" +
  "var mm=cnn(parseFloat(inputs.meetingMinutes)||0);" +
  "var mpw=cnn(parseFloat(inputs.meetingsPerWeek)||0);" +
  "var hpm=mm/60;" +
  "var cpm=att*ahr*hpm;" +
  "var cpmin=mm>0?cpm/mm:0;" +
  "var wh=att*hpm*mpw;" +
  "var wc=cpm*mpw;" +
  "var ac=wc*48;" +
  "var qc=ac/4;" +
  "var ah=wh*48;" +
  "var csm=1.5;" +
  "var tcwc=ac*csm;" +
  "var async=wc*0.1;" +
  "var asbe=cpm>0&&async<cpm;" +
  "var tp=(att*mpw*48).toLocaleString();" +
  "function fmt(n){return n.toFixed(2)}" +
  "function loc(n){return Math.round(n).toLocaleString()}" +
  "var r='';" +
  "r+='\\u23F0 Meeting Cost Calculator\\n\\n';" +
  "r+='\\uD83D\\uDCCB Meeting Setup:\\n';" +
  "r+='\\u2022 Attendees:                       '+att+' people\\n';" +
  "r+='\\u2022 Avg Hourly Rate:           $'+loc(ahr)+'/hr\\n';" +
  "r+='\\u2022 Meeting Length:             '+mm+' min  ('+fmt(hpm)+' hrs)\\n';" +
  "r+='\\u2022 Meetings Per Week:      '+mpw+'\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCB0 Cost Snapshot:\\n';" +
  "r+='\\u2022 Cost Per Meeting:           $'+fmt(cpm)+'\\n';" +
  "r+='\\u2022 Cost Per Minute:                $'+fmt(cpmin)+'\\n';" +
  "r+='\\u2022 Cost Per Person:                $'+fmt(mm>0?cpm/att:0)+'\\n';" +
  "r+='\\u2022 Weekly Cost:                       $'+fmt(wc)+'  ('+fmt(wh)+' person-hrs)\\n';" +
  "r+='\\u2022 Quarterly Cost:                  $'+loc(qc)+'\\n';" +
  "r+='\\u2022 Annual Cost:                          $'+loc(ac)+'  ('+loc(ah)+' person-hrs)\\n';" +
  "r+='\\u2022 True Cost (with context switch):  $'+loc(tcwc)+'/yr  (\\u00d71.5 overhead)\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCD0 Key Metrics:\\n';" +
  "r+='\\u2022 Person-Hours / Meeting:    '+fmt(att*hpm)+' hrs\\n';" +
  "r+='\\u2022 Person-Hours / Year:           '+loc(ah)+' hrs  (\\u2248 '+(ah/2080).toFixed(2)+' FTE)\\n';" +
  "r+='\\u2022 Meetings / Year:                       '+(mpw*48)+' meetings\\n';" +
  "r+='\\u2022 Total Person-Attendances:   '+tp+' person-events\\n';" +
  "r+='\\u2022 Average Per-Attendee Cost:    $'+fmt(mm>0?cpm/att:0)+'/meeting  ($'+fmt(mm>0?(cpm/att)*mpw*48:0)+'/yr)\\n';" +
  "r+='\\u2022 Weekly Time Burn:                       '+fmt(wh)+' hrs of team time\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83E\\uDE7A Meeting Health:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "if(wc<100)r+='\\u2022 \\uD83D\\uDFE2 Low cost \\u2014 efficient use of meeting time.\\n';" +
  "else if(wc<500)r+='\\u2022 \\uD83D\\uDFE1 Moderate \\u2014 review quarterly for necessity.\\n';" +
  "else if(wc<2000)r+='\\u2022 \\uD83D\\uDFE0 Significant \\u2014 try async or shorter formats.\\n';" +
  "else if(wc<10000)r+='\\u2022 \\uD83D\\uDD34 Heavy \\u2014 organizational drag, audit urgently.\\n';" +
  "else r+='\\u2022 \\uD83D\\uDEA8 Critical \\u2014 slash meetings ruthlessly.\\n';" +
  "if(ah>=2000)r+='\\u2022 \\u26A0\\uFE0F '+loc(ah)+' person-hours/yr = 1+ FTE spent in meetings.\\n';" +
  "else if(ah>=500)r+='\\u2022 \\u26A0\\uFE0F '+loc(ah)+' person-hours/yr is significant (\\u2248 25% of 1 FTE).\\n';" +
  "else r+='\\u2022 \\u2705 '+loc(ah)+' person-hours/yr is manageable.\\n';" +
  "if(mm>60)r+='\\u2022 \\uD83D\\uDFE0 Meetings over 60 min \\u2014 context-switch cost dominates the value.\\n';" +
  "else if(mm>=30)r+='\\u2022 \\uD83D\\uDFE1 30-60 min meetings \\u2014 typical but consider tightening to 25 or 45.\\n';" +
  "else r+='\\u2022 \\uD83D\\uDFE2 Under 30 min \\u2014 good timebox discipline.\\n';" +
  "r+='\\n\\uD83C\\uDFAF Quarterly & Annual Projection:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 1 Quarter:                              $'+loc(qc)+'  ('+loc(ah/4)+' person-hrs)\\n';" +
  "r+='\\u2022 2 Quarters:                            $'+loc(qc*2)+'\\n';" +
  "r+='\\u2022 3 Quarters:                            $'+loc(qc*3)+'\\n';" +
  "r+='\\u2022 Full Year:                                  $'+loc(ac)+'  ('+loc(ah)+' person-hrs)\\n';" +
  "r+='\\u2022 2 Years (run-rate):                  $'+loc(ac*2)+'\\n';" +
  "r+='\\u2022 Annual Equivalent FTEs:           '+(ah/2080).toFixed(2)+' FTE  ($'+loc(ahr*2080)+' salary each)\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\u2696\\uFE0F Async vs Sync Break-Even:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "if(asbe)r+='\\u2022 \\uD83D\\uDFE2 Async (Slack/Loom/Notion) cheaper: ~$0 cost vs $'+fmt(cpm)+'/meeting.\\n';" +
  "else r+='\\u2022 \\uD83D\\uDFE1 Meeting is justified \\u2014 value exceeds async cost only if decision is required.\\n';" +
  "r+='\\u2022 Meeting Cost:                          $'+fmt(cpm)+'/meeting\\n';" +
  "r+='\\u2022 Async Equivalent Cost:      ~$0  (writing is free, async tools minimal)\\n';" +
  "r+='\\u2022 Break-Even Decision Rule:  Save meeting for decisions; document everything else async.\\n';" +
  "r+='\\u2022 Context-Switch Penalty:     Meetings cost 1.5x in lost focus (deep-work recovery).\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Cut attendees in half:                    Save $'+loc(wc*0.5*48)+'/yr  ('+(att/2)+' core + async for others)\\n';" +
  "r+='\\u2022 Shorten by 25%:                            Save $'+loc(wc*0.25*48)+'/yr  ('+(mm*0.75)+' min instead of '+mm+')\\n';" +
  "r+='\\u2022 Cut frequency by 1/wk:                  Save $'+loc((cpm)*48)+'/yr  (down to '+(mpw-1)+' meetings/wk)\\n';" +
  "r+='\\u2022 Replace with async update:           Save $'+loc(wc*48)+'/yr  (Loom + Slack thread)\\n';" +
  "r+='\\u2022 Switch to 25-min default:              Save $'+loc(wc*0.17*48)+'/yr  (vs 30-min default)\\n\\n';" +
  "r+='\\uD83D\\uDCA1 Tip: Before scheduling a meeting, calculate its cost. A 30-minute meeting with 6 people at $75/hr costs $225. Ask: could this be an email, a Loom video, or an async document? For recurring meetings, multiply by 52 to see the true annual impact. If a weekly meeting costs $500, that is $26,000/year \\u2014 worth optimizing.';" +
  "var results=[r];" +
  "var mls=[5,10,15,20,30,45,60,90,120];" +
  "for(var i=0;i<mls.length;i++){" +
  "var mi=mls[i];" +
  "var hr=mi/60;" +
  "var co=att*ahr*hr;" +
  "var cw=co*mpw;" +
  "var cy=cw*48;" +
  "var hy=att*hr*mpw*48;" +
  "results.push('Comparison: '+mi+' min meeting \\u2192 $'+fmt(co)+'/meeting | $'+fmt(cw)+'/wk | $'+loc(cy)+'/yr | '+loc(hy)+' hrs/yr');" +
  "}" +
  "return results;";

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


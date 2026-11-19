import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-13：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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
    makeToken('calc_out.meeting_cost.row.attendees', '• Attendees:                       ' + attendees + ' people', { count: String(attendees) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.avg_hourly_rate', '• Avg Hourly Rate:           $' + loc(avgHourlyRate) + '/hr', { rate: loc(avgHourlyRate) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.meeting_length', '• Meeting Length:             ' + meetingMinutes + ' min  (' + fmt(hoursPerMeeting) + ' hrs)', { mins: String(meetingMinutes), hrs: fmt(hoursPerMeeting) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.meetings_per_week', '• Meetings Per Week:      ' + meetingsPerWeek, { count: String(meetingsPerWeek) }) + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💰 Cost Snapshot:\n' +
    makeToken('calc_out.meeting_cost.row.cost_per_meeting', '• Cost Per Meeting:           $' + fmt(costPerMeeting), { cost: fmt(costPerMeeting) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.cost_per_minute', '• Cost Per Minute:                $' + fmt(costPerMinute), { cost: fmt(costPerMinute) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.cost_per_person', '• Cost Per Person:                $' + fmt(meetingMinutes > 0 ? costPerMeeting / attendees : 0), { cost: fmt(meetingMinutes > 0 ? costPerMeeting / attendees : 0) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.weekly_cost', '• Weekly Cost:                       $' + fmt(weeklyCost) + '  (' + fmt(weeklyHours) + ' person-hrs)', { cost: fmt(weeklyCost), hours: fmt(weeklyHours) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.quarterly_cost', '• Quarterly Cost:                  $' + loc(quarterlyCost), { cost: loc(quarterlyCost) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.annual_cost', '• Annual Cost:                          $' + loc(annualCost) + '  (' + loc(annualHours) + ' person-hrs)', { cost: loc(annualCost), hours: loc(annualHours) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.true_cost_context_switch', '• True Cost (with context switch):  $' + loc(trueCostWithContext) + '/yr  (×1.5 overhead)', { cost: loc(trueCostWithContext) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Key Metrics:\n' +
    makeToken('calc_out.meeting_cost.row.person_hours_per_meeting', '• Person-Hours / Meeting:    ' + fmt(attendees * hoursPerMeeting) + ' hrs', { hours: fmt(attendees * hoursPerMeeting) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.person_hours_per_year', '• Person-Hours / Year:           ' + loc(annualHours) + ' hrs  (≈ ' + (annualHours / 2080).toFixed(2) + ' FTE)', { hours: loc(annualHours), fte: (annualHours / 2080).toFixed(2) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.meetings_per_year', '• Meetings / Year:                       ' + (meetingsPerWeek * 48) + ' meetings', { count: String(meetingsPerWeek * 48) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.total_person_attendances', '• Total Person-Attendances:   ' + totalPersons + ' person-events', { total: totalPersons }) + '\n' +
    makeToken('calc_out.meeting_cost.row.avg_per_attendee_cost', '• Average Per-Attendee Cost:    $' + fmt(meetingMinutes > 0 ? costPerMeeting / attendees : 0) + '/meeting  ($' + fmt(meetingMinutes > 0 ? (costPerMeeting / attendees) * meetingsPerWeek * 48 : 0) + '/yr)', { cost: fmt(meetingMinutes > 0 ? costPerMeeting / attendees : 0), annual: fmt(meetingMinutes > 0 ? (costPerMeeting / attendees) * meetingsPerWeek * 48 : 0) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.weekly_time_burn', '• Weekly Time Burn:                       ' + fmt(weeklyHours) + ' hrs of team time', { hours: fmt(weeklyHours) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Meeting Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (weeklyCost < 100
      ? makeToken('calc_out.meeting_cost.row.health_low', '• 🟢 Low cost — efficient use of meeting time.') + '\n'
      : weeklyCost < 500
      ? makeToken('calc_out.meeting_cost.row.health_moderate', '• 🟡 Moderate — review quarterly for necessity.') + '\n'
      : weeklyCost < 2000
      ? makeToken('calc_out.meeting_cost.row.health_significant', '• 🟠 Significant — try async or shorter formats.') + '\n'
      : weeklyCost < 10000
      ? makeToken('calc_out.meeting_cost.row.health_heavy', '• 🔴 Heavy — organizational drag, audit urgently.') + '\n'
      : makeToken('calc_out.meeting_cost.row.health_critical', '• 🚨 Critical — slash meetings ruthlessly.') + '\n') +
    (annualHours >= 2000
      ? makeToken('calc_out.meeting_cost.row.hours_fte_alert', '• ⚠️ ' + loc(annualHours) + ' person-hours/yr = 1+ FTE spent in meetings.', { hours: loc(annualHours) }) + '\n'
      : annualHours >= 500
      ? makeToken('calc_out.meeting_cost.row.hours_significant', '• ⚠️ ' + loc(annualHours) + ' person-hours/yr is significant (≈ 25% of 1 FTE).', { hours: loc(annualHours) }) + '\n'
      : makeToken('calc_out.meeting_cost.row.hours_manageable', '• ✅ ' + loc(annualHours) + ' person-hours/yr is manageable.', { hours: loc(annualHours) }) + '\n') +
    (meetingMinutes > 60
      ? makeToken('calc_out.meeting_cost.row.length_over_60', '• 🟠 Meetings over 60 min — context-switch cost dominates the value.') + '\n'
      : meetingMinutes >= 30
      ? makeToken('calc_out.meeting_cost.row.length_30_60', '• 🟡 30-60 min meetings — typical but consider tightening to 25 or 45.') + '\n'
      : makeToken('calc_out.meeting_cost.row.length_under_30', '• 🟢 Under 30 min — good timebox discipline.') + '\n') +
    '\n🎯 Quarterly & Annual Projection:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.meeting_cost.row.quarter_1', '• 1 Quarter:                              $' + loc(quarterlyCost) + '  (' + loc(annualHours / 4) + ' person-hrs)', { cost: loc(quarterlyCost), hours: loc(annualHours / 4) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.quarter_2', '• 2 Quarters:                            $' + loc(quarterlyCost * 2), { cost: loc(quarterlyCost * 2) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.quarter_3', '• 3 Quarters:                            $' + loc(quarterlyCost * 3), { cost: loc(quarterlyCost * 3) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.full_year', '• Full Year:                                  $' + loc(annualCost) + '  (' + loc(annualHours) + ' person-hrs)', { cost: loc(annualCost), hours: loc(annualHours) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.two_years', '• 2 Years (run-rate):                  $' + loc(annualCost * 2), { cost: loc(annualCost * 2) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.annual_equivalent_fte', '• Annual Equivalent FTEs:           ' + (annualHours / 2080).toFixed(2) + ' FTE  ($' + loc(avgHourlyRate * 2080) + ' salary each)', { fte: (annualHours / 2080).toFixed(2), salary: loc(avgHourlyRate * 2080) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Async vs Sync Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (asyncBreakEven
      ? makeToken('calc_out.meeting_cost.row.async_cheaper', '• 🟢 Async (Slack/Loom/Notion) cheaper: ~$0 cost vs $' + fmt(costPerMeeting) + '/meeting.', { cost: fmt(costPerMeeting) }) + '\n'
      : makeToken('calc_out.meeting_cost.row.meeting_justified', '• 🟡 Meeting is justified — value exceeds async cost only if decision is required.') + '\n') +
    makeToken('calc_out.meeting_cost.row.meeting_cost', '• Meeting Cost:                          $' + fmt(costPerMeeting) + '/meeting', { cost: fmt(costPerMeeting) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.async_equivalent_cost', '• Async Equivalent Cost:      ~$0  (writing is free, async tools minimal)') + '\n' +
    makeToken('calc_out.meeting_cost.row.break_even_decision_rule', '• Break-Even Decision Rule:  Save meeting for decisions; document everything else async.') + '\n' +
    makeToken('calc_out.meeting_cost.row.context_switch_penalty', '• Context-Switch Penalty:     Meetings cost 1.5x in lost focus (deep-work recovery).') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.meeting_cost.row.whatif_cut_attendees', '• Cut attendees in half:                    Save $' + loc(weeklyCost * 0.5 * 48) + '/yr  (' + (attendees / 2) + ' core + async for others)', { save: loc(weeklyCost * 0.5 * 48), core: String(attendees / 2) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.whatif_shorten_25', '• Shorten by 25%:                            Save $' + loc(weeklyCost * 0.25 * 48) + '/yr  (' + (meetingMinutes * 0.75) + ' min instead of ' + meetingMinutes + ')', { save: loc(weeklyCost * 0.25 * 48), newmins: String(meetingMinutes * 0.75), mins: String(meetingMinutes) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.whatif_cut_frequency', '• Cut frequency by 1/wk:                  Save $' + loc((costPerMeeting) * 48) + '/yr  (down to ' + (meetingsPerWeek - 1) + ' meetings/wk)', { save: loc((costPerMeeting) * 48), count: String(meetingsPerWeek - 1) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.whatif_async_update', '• Replace with async update:           Save $' + loc(weeklyCost * 48) + '/yr  (Loom + Slack thread)', { save: loc(weeklyCost * 48) }) + '\n' +
    makeToken('calc_out.meeting_cost.row.whatif_25min_default', '• Switch to 25-min default:              Save $' + loc(weeklyCost * 0.17 * 48) + '/yr  (vs 30-min default)', { save: loc(weeklyCost * 0.17 * 48) }) + '\n\n' +
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
      makeToken('calc_out.meeting_cost.row.comparison_head', 'Comparison: ' + mins + ' min meeting → $' + fmt(costOne) + '/meeting', { mins: String(mins), cost: fmt(costOne) }) +
      ' | ' +
      makeToken('calc_out.meeting_cost.row.comparison_week', '$' + fmt(costWeek) + '/wk', { cost: fmt(costWeek) }) +
      ' | ' +
      makeToken('calc_out.meeting_cost.row.comparison_year', '$' + loc(costYear) + '/yr', { cost: loc(costYear) }) +
      ' | ' +
      makeToken('calc_out.meeting_cost.row.comparison_hours', loc(hrsYear) + ' hrs/yr', { hours: loc(hrsYear) }),
    );
  }

  return results;
}

const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let y=function(_){return Number.isNaN(_)?0:Math.max(0,_)},S=function(_){const c=y(parseFloat(_.attendees)||0),g=y(parseFloat(_.avgHourlyRate)||0),o=y(parseFloat(_.meetingMinutes)||0),a=y(parseFloat(_.meetingsPerWeek)||0),w=o/60,r=c*g*w,C=o>0?r/o:0,m=c*w*a,i=r*a,u=i*48,l=u/4,s=m*48,M=u*1.5,H=i*.1,j=r>0&&H<r,F=(c*a*48).toLocaleString(),n=h=>h.toFixed(2),e=h=>Math.round(h).toLocaleString(),p=[];p.push(\`⏰ Meeting Cost Calculator

📋 Meeting Setup:
\`+t("calc_out.meeting_cost.row.attendees","• Attendees:                       "+c+" people",{count:String(c)})+\`
\`+t("calc_out.meeting_cost.row.avg_hourly_rate","• Avg Hourly Rate:           $"+e(g)+"/hr",{rate:e(g)})+\`
\`+t("calc_out.meeting_cost.row.meeting_length","• Meeting Length:             "+o+" min  ("+n(w)+" hrs)",{mins:String(o),hrs:n(w)})+\`
\`+t("calc_out.meeting_cost.row.meetings_per_week","• Meetings Per Week:      "+a,{count:String(a)})+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Cost Snapshot:
\`+t("calc_out.meeting_cost.row.cost_per_meeting","• Cost Per Meeting:           $"+n(r),{cost:n(r)})+\`
\`+t("calc_out.meeting_cost.row.cost_per_minute","• Cost Per Minute:                $"+n(C),{cost:n(C)})+\`
\`+t("calc_out.meeting_cost.row.cost_per_person","• Cost Per Person:                $"+n(o>0?r/c:0),{cost:n(o>0?r/c:0)})+\`
\`+t("calc_out.meeting_cost.row.weekly_cost","• Weekly Cost:                       $"+n(i)+"  ("+n(m)+" person-hrs)",{cost:n(i),hours:n(m)})+\`
\`+t("calc_out.meeting_cost.row.quarterly_cost","• Quarterly Cost:                  $"+e(l),{cost:e(l)})+\`
\`+t("calc_out.meeting_cost.row.annual_cost","• Annual Cost:                          $"+e(u)+"  ("+e(s)+" person-hrs)",{cost:e(u),hours:e(s)})+\`
\`+t("calc_out.meeting_cost.row.true_cost_context_switch","• True Cost (with context switch):  $"+e(M)+"/yr  (×1.5 overhead)",{cost:e(M)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 Key Metrics:
\`+t("calc_out.meeting_cost.row.person_hours_per_meeting","• Person-Hours / Meeting:    "+n(c*w)+" hrs",{hours:n(c*w)})+\`
\`+t("calc_out.meeting_cost.row.person_hours_per_year","• Person-Hours / Year:           "+e(s)+" hrs  (≈ "+(s/2080).toFixed(2)+" FTE)",{hours:e(s),fte:(s/2080).toFixed(2)})+\`
\`+t("calc_out.meeting_cost.row.meetings_per_year","• Meetings / Year:                       "+a*48+" meetings",{count:String(a*48)})+\`
\`+t("calc_out.meeting_cost.row.total_person_attendances","• Total Person-Attendances:   "+F+" person-events",{total:F})+\`
\`+t("calc_out.meeting_cost.row.avg_per_attendee_cost","• Average Per-Attendee Cost:    $"+n(o>0?r/c:0)+"/meeting  ($"+n(o>0?r/c*a*48:0)+"/yr)",{cost:n(o>0?r/c:0),annual:n(o>0?r/c*a*48:0)})+\`
\`+t("calc_out.meeting_cost.row.weekly_time_burn","• Weekly Time Burn:                       "+n(m)+" hrs of team time",{hours:n(m)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🩺 Meeting Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(i<100?t("calc_out.meeting_cost.row.health_low","• 🟢 Low cost — efficient use of meeting time.")+\`
\`:i<500?t("calc_out.meeting_cost.row.health_moderate","• 🟡 Moderate — review quarterly for necessity.")+\`
\`:i<2e3?t("calc_out.meeting_cost.row.health_significant","• 🟠 Significant — try async or shorter formats.")+\`
\`:i<1e4?t("calc_out.meeting_cost.row.health_heavy","• 🔴 Heavy — organizational drag, audit urgently.")+\`
\`:t("calc_out.meeting_cost.row.health_critical","• 🚨 Critical — slash meetings ruthlessly.")+\`
\`)+(s>=2e3?t("calc_out.meeting_cost.row.hours_fte_alert","• ⚠️ "+e(s)+" person-hours/yr = 1+ FTE spent in meetings.",{hours:e(s)})+\`
\`:s>=500?t("calc_out.meeting_cost.row.hours_significant","• ⚠️ "+e(s)+" person-hours/yr is significant (≈ 25% of 1 FTE).",{hours:e(s)})+\`
\`:t("calc_out.meeting_cost.row.hours_manageable","• ✅ "+e(s)+" person-hours/yr is manageable.",{hours:e(s)})+\`
\`)+(o>60?t("calc_out.meeting_cost.row.length_over_60","• 🟠 Meetings over 60 min — context-switch cost dominates the value.")+\`
\`:o>=30?t("calc_out.meeting_cost.row.length_30_60","• 🟡 30-60 min meetings — typical but consider tightening to 25 or 45.")+\`
\`:t("calc_out.meeting_cost.row.length_under_30","• 🟢 Under 30 min — good timebox discipline.")+\`
\`)+\`
🎯 Quarterly & Annual Projection:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.meeting_cost.row.quarter_1","• 1 Quarter:                              $"+e(l)+"  ("+e(s/4)+" person-hrs)",{cost:e(l),hours:e(s/4)})+\`
\`+t("calc_out.meeting_cost.row.quarter_2","• 2 Quarters:                            $"+e(l*2),{cost:e(l*2)})+\`
\`+t("calc_out.meeting_cost.row.quarter_3","• 3 Quarters:                            $"+e(l*3),{cost:e(l*3)})+\`
\`+t("calc_out.meeting_cost.row.full_year","• Full Year:                                  $"+e(u)+"  ("+e(s)+" person-hrs)",{cost:e(u),hours:e(s)})+\`
\`+t("calc_out.meeting_cost.row.two_years","• 2 Years (run-rate):                  $"+e(u*2),{cost:e(u*2)})+\`
\`+t("calc_out.meeting_cost.row.annual_equivalent_fte","• Annual Equivalent FTEs:           "+(s/2080).toFixed(2)+" FTE  ($"+e(g*2080)+" salary each)",{fte:(s/2080).toFixed(2),salary:e(g*2080)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ Async vs Sync Break-Even:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(j?t("calc_out.meeting_cost.row.async_cheaper","• 🟢 Async (Slack/Loom/Notion) cheaper: ~$0 cost vs $"+n(r)+"/meeting.",{cost:n(r)})+\`
\`:t("calc_out.meeting_cost.row.meeting_justified","• 🟡 Meeting is justified — value exceeds async cost only if decision is required.")+\`
\`)+t("calc_out.meeting_cost.row.meeting_cost","• Meeting Cost:                          $"+n(r)+"/meeting",{cost:n(r)})+\`
\`+t("calc_out.meeting_cost.row.async_equivalent_cost","• Async Equivalent Cost:      ~$0  (writing is free, async tools minimal)")+\`
\`+t("calc_out.meeting_cost.row.break_even_decision_rule","• Break-Even Decision Rule:  Save meeting for decisions; document everything else async.")+\`
\`+t("calc_out.meeting_cost.row.context_switch_penalty","• Context-Switch Penalty:     Meetings cost 1.5x in lost focus (deep-work recovery).")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If Scenarios:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.meeting_cost.row.whatif_cut_attendees","• Cut attendees in half:                    Save $"+e(i*.5*48)+"/yr  ("+c/2+" core + async for others)",{save:e(i*.5*48),core:String(c/2)})+\`
\`+t("calc_out.meeting_cost.row.whatif_shorten_25","• Shorten by 25%:                            Save $"+e(i*.25*48)+"/yr  ("+o*.75+" min instead of "+o+")",{save:e(i*.25*48),newmins:String(o*.75),mins:String(o)})+\`
\`+t("calc_out.meeting_cost.row.whatif_cut_frequency","• Cut frequency by 1/wk:                  Save $"+e(r*48)+"/yr  (down to "+(a-1)+" meetings/wk)",{save:e(r*48),count:String(a-1)})+\`
\`+t("calc_out.meeting_cost.row.whatif_async_update","• Replace with async update:           Save $"+e(i*48)+"/yr  (Loom + Slack thread)",{save:e(i*48)})+\`
\`+t("calc_out.meeting_cost.row.whatif_25min_default","• Switch to 25-min default:              Save $"+e(i*.17*48)+"/yr  (vs 30-min default)",{save:e(i*.17*48)})+\`

💡 Tip: Before scheduling a meeting, calculate its cost. A 30-minute meeting with 6 people at $75/hr costs $225. Ask: could this be an email, a Loom video, or an async document? For recurring meetings, multiply by 52 to see the true annual impact. If a weekly meeting costs $500, that is $26,000/year — worth optimizing.\`);const q=[5,10,15,20,30,45,60,90,120];for(let h=0;h<q.length;h++){const f=q[h],P=f/60,d=c*g*P,v=d*a,x=v*48,A=c*P*a*48;p.push(t("calc_out.meeting_cost.row.comparison_head","Comparison: "+f+" min meeting → $"+n(d)+"/meeting",{mins:String(f),cost:n(d)})+" | "+t("calc_out.meeting_cost.row.comparison_week","$"+n(v)+"/wk",{cost:n(v)})+" | "+t("calc_out.meeting_cost.row.comparison_year","$"+e(x)+"/yr",{cost:e(x)})+" | "+t("calc_out.meeting_cost.row.comparison_hours",e(A)+" hrs/yr",{hours:e(A)}))}return p},$=function(_,c,g){var o=E(_);return Array.isArray(o)?o.join(\`
\`):String(o)};var L=y,W=S,N=$,t=tk,b='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',t=new Function("return "+b)(),E=function(_){return S(_)};return[$(inputs,pick,fill)]}finally{}
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
    '⏰ Meeting Cost Calculator\n\n📋 Meeting Setup:\n$calc_out.meeting_cost.row.attendees{"count":"6"}|• Attendees:                       6 people|\n$calc_out.meeting_cost.row.avg_hourly_rate{"rate":"75"}|• Avg Hourly Rate:           $75/hr|\n$calc_out.meeting_cost.row.meeting_length{"mins":"30","hrs":"0.50"}|• Meeting Length:             30 min  (0.50 hrs)|\n$calc_out.meeting_cost.row.meetings_per_week{"count":"1"}|• Meetings Per Week:      1|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💰 Cost Snapshot:\n$calc_out.meeting_cost.row.cost_per_meeting{"cost":"225.00"}|• Cost Per Meeting:           $225.00|\n$calc_out.meeting_cost.row.cost_per_minute{"cost":"7.50"}|• Cost Per Minute:                $7.50|\n$calc_out.meeting_cost.row.cost_per_person{"cost":"37.50"}|• Cost Per Person:                $37.50|\n$calc_out.meeting_cost.row.weekly_cost{"cost":"225.00","hours":"3.00"}|• Weekly Cost:                       $225.00  (3.00 person-hrs)|\n$calc_out.meeting_cost.row.quarterly_cost{"cost":"2,700"}|• Quarterly Cost:                  $2,700|\n$calc_out.meeting_cost.row.annual_cost{"cost":"10,800","hours":"144"}|• Annual Cost:                          $10,800  (144 person-hrs)|\n$calc_out.meeting_cost.row.true_cost_context_switch{"cost":"16,200"}|• True Cost (with context switch):  $16,200/yr  (×1.5 overhead)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Key Metrics:\n$calc_out.meeting_cost.row.person_hours_per_meeting{"hours":"3.00"}|• Person-Hours / Meeting:    3.00 hrs|\n$calc_out.meeting_cost.row.person_hours_per_year{"hours":"144","fte":"0.07"}|• Person-Hours / Year:           144 hrs  (≈ 0.07 FTE)|\n$calc_out.meeting_cost.row.meetings_per_year{"count":"48"}|• Meetings / Year:                       48 meetings|\n$calc_out.meeting_cost.row.total_person_attendances{"total":"288"}|• Total Person-Attendances:   288 person-events|\n$calc_out.meeting_cost.row.avg_per_attendee_cost{"cost":"37.50","annual":"1800.00"}|• Average Per-Attendee Cost:    $37.50/meeting  ($1800.00/yr)|\n$calc_out.meeting_cost.row.weekly_time_burn{"hours":"3.00"}|• Weekly Time Burn:                       3.00 hrs of team time|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Meeting Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.meeting_cost.row.health_moderate|• 🟡 Moderate — review quarterly for necessity.|\n$calc_out.meeting_cost.row.hours_manageable{"hours":"144"}|• ✅ 144 person-hours/yr is manageable.|\n$calc_out.meeting_cost.row.length_30_60|• 🟡 30-60 min meetings — typical but consider tightening to 25 or 45.|\n\n🎯 Quarterly & Annual Projection:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.meeting_cost.row.quarter_1{"cost":"2,700","hours":"36"}|• 1 Quarter:                              $2,700  (36 person-hrs)|\n$calc_out.meeting_cost.row.quarter_2{"cost":"5,400"}|• 2 Quarters:                            $5,400|\n$calc_out.meeting_cost.row.quarter_3{"cost":"8,100"}|• 3 Quarters:                            $8,100|\n$calc_out.meeting_cost.row.full_year{"cost":"10,800","hours":"144"}|• Full Year:                                  $10,800  (144 person-hrs)|\n$calc_out.meeting_cost.row.two_years{"cost":"21,600"}|• 2 Years (run-rate):                  $21,600|\n$calc_out.meeting_cost.row.annual_equivalent_fte{"fte":"0.07","salary":"156,000"}|• Annual Equivalent FTEs:           0.07 FTE  ($156,000 salary each)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Async vs Sync Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.meeting_cost.row.async_cheaper{"cost":"225.00"}|• 🟢 Async (Slack/Loom/Notion) cheaper: ~$0 cost vs $225.00/meeting.|\n$calc_out.meeting_cost.row.meeting_cost{"cost":"225.00"}|• Meeting Cost:                          $225.00/meeting|\n$calc_out.meeting_cost.row.async_equivalent_cost|• Async Equivalent Cost:      ~$0  (writing is free, async tools minimal)|\n$calc_out.meeting_cost.row.break_even_decision_rule|• Break-Even Decision Rule:  Save meeting for decisions; document everything else async.|\n$calc_out.meeting_cost.row.context_switch_penalty|• Context-Switch Penalty:     Meetings cost 1.5x in lost focus (deep-work recovery).|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.meeting_cost.row.whatif_cut_attendees{"save":"5,400","core":"3"}|• Cut attendees in half:                    Save $5,400/yr  (3 core + async for others)|\n$calc_out.meeting_cost.row.whatif_shorten_25{"save":"2,700","newmins":"22.5","mins":"30"}|• Shorten by 25%:                            Save $2,700/yr  (22.5 min instead of 30)|\n$calc_out.meeting_cost.row.whatif_cut_frequency{"save":"10,800","count":"0"}|• Cut frequency by 1/wk:                  Save $10,800/yr  (down to 0 meetings/wk)|\n$calc_out.meeting_cost.row.whatif_async_update{"save":"10,800"}|• Replace with async update:           Save $10,800/yr  (Loom + Slack thread)|\n$calc_out.meeting_cost.row.whatif_25min_default{"save":"1,836"}|• Switch to 25-min default:              Save $1,836/yr  (vs 30-min default)|\n\n💡 Tip: Before scheduling a meeting, calculate its cost. A 30-minute meeting with 6 people at $75/hr costs $225. Ask: could this be an email, a Loom video, or an async document? For recurring meetings, multiply by 52 to see the true annual impact. If a weekly meeting costs $500, that is $26,000/year — worth optimizing.\n$calc_out.meeting_cost.row.comparison_head{"mins":"5","cost":"37.50"}|Comparison: 5 min meeting → $37.50/meeting| | $calc_out.meeting_cost.row.comparison_week{"cost":"37.50"}|$37.50/wk| | $calc_out.meeting_cost.row.comparison_year{"cost":"1,800"}|$1,800/yr| | $calc_out.meeting_cost.row.comparison_hours{"hours":"24"}|24 hrs/yr|\n$calc_out.meeting_cost.row.comparison_head{"mins":"10","cost":"75.00"}|Comparison: 10 min meeting → $75.00/meeting| | $calc_out.meeting_cost.row.comparison_week{"cost":"75.00"}|$75.00/wk| | $calc_out.meeting_cost.row.comparison_year{"cost":"3,600"}|$3,600/yr| | $calc_out.meeting_cost.row.comparison_hours{"hours":"48"}|48 hrs/yr|\n$calc_out.meeting_cost.row.comparison_head{"mins":"15","cost":"112.50"}|Comparison: 15 min meeting → $112.50/meeting| | $calc_out.meeting_cost.row.comparison_week{"cost":"112.50"}|$112.50/wk| | $calc_out.meeting_cost.row.comparison_year{"cost":"5,400"}|$5,400/yr| | $calc_out.meeting_cost.row.comparison_hours{"hours":"72"}|72 hrs/yr|\n$calc_out.meeting_cost.row.comparison_head{"mins":"20","cost":"150.00"}|Comparison: 20 min meeting → $150.00/meeting| | $calc_out.meeting_cost.row.comparison_week{"cost":"150.00"}|$150.00/wk| | $calc_out.meeting_cost.row.comparison_year{"cost":"7,200"}|$7,200/yr| | $calc_out.meeting_cost.row.comparison_hours{"hours":"96"}|96 hrs/yr|\n$calc_out.meeting_cost.row.comparison_head{"mins":"30","cost":"225.00"}|Comparison: 30 min meeting → $225.00/meeting| | $calc_out.meeting_cost.row.comparison_week{"cost":"225.00"}|$225.00/wk| | $calc_out.meeting_cost.row.comparison_year{"cost":"10,800"}|$10,800/yr| | $calc_out.meeting_cost.row.comparison_hours{"hours":"144"}|144 hrs/yr|\n$calc_out.meeting_cost.row.comparison_head{"mins":"45","cost":"337.50"}|Comparison: 45 min meeting → $337.50/meeting| | $calc_out.meeting_cost.row.comparison_week{"cost":"337.50"}|$337.50/wk| | $calc_out.meeting_cost.row.comparison_year{"cost":"16,200"}|$16,200/yr| | $calc_out.meeting_cost.row.comparison_hours{"hours":"216"}|216 hrs/yr|\n$calc_out.meeting_cost.row.comparison_head{"mins":"60","cost":"450.00"}|Comparison: 60 min meeting → $450.00/meeting| | $calc_out.meeting_cost.row.comparison_week{"cost":"450.00"}|$450.00/wk| | $calc_out.meeting_cost.row.comparison_year{"cost":"21,600"}|$21,600/yr| | $calc_out.meeting_cost.row.comparison_hours{"hours":"288"}|288 hrs/yr|\n$calc_out.meeting_cost.row.comparison_head{"mins":"90","cost":"675.00"}|Comparison: 90 min meeting → $675.00/meeting| | $calc_out.meeting_cost.row.comparison_week{"cost":"675.00"}|$675.00/wk| | $calc_out.meeting_cost.row.comparison_year{"cost":"32,400"}|$32,400/yr| | $calc_out.meeting_cost.row.comparison_hours{"hours":"432"}|432 hrs/yr|\n$calc_out.meeting_cost.row.comparison_head{"mins":"120","cost":"900.00"}|Comparison: 120 min meeting → $900.00/meeting| | $calc_out.meeting_cost.row.comparison_week{"cost":"900.00"}|$900.00/wk| | $calc_out.meeting_cost.row.comparison_year{"cost":"43,200"}|$43,200/yr| | $calc_out.meeting_cost.row.comparison_hours{"hours":"576"}|576 hrs/yr|',
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


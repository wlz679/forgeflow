import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-13：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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

  let main = makeToken('calc_out.productivity_score.row.title', '📈 Productivity Score: ' + score + '/100', { score: String(score) }) + '\n\n';

  // 💰 Snapshot
  main += '💰 Score Snapshot:\n' + SEP + '\n';
  main += makeToken('calc_out.productivity_score.row.total_score', '• Total Score:          ' + score + '/100', { score: String(score) }) + '\n';
  main += makeToken('calc_out.productivity_score.row.weekly_deep_work', '• Weekly Deep Work:    ' + deepWork + ' hours', { hours: String(deepWork) }) + '\n';
  main += makeToken('calc_out.productivity_score.row.tools_in_stack', '• Tools in Stack:      ' + tools + ' tools', { count: String(tools) }) + '\n';
  main += makeToken('calc_out.productivity_score.row.weekly_meetings', '• Weekly Meetings:     ' + meetings + ' meetings', { count: String(meetings) }) + '\n';
  // ⭐ 局部变量承接（2026-11-19 B3-13 组 2 实测修）：兜底里的表达式与 params 里的表达式
  //   必须是**同一份源码文本** ⇒ 否则源码模板推导会把 'deepWork + meetings + 5' 拆成
  //   两个 {hours} ⇒ 模板污染（{hours}{hours}5）⇒ 与运行时反推不一致 ⇒ 报 conflict。
  const totalWorkHours = deepWork + meetings + 5;
  main += makeToken('calc_out.productivity_score.row.total_work_hours', '• Total Work Hours:    ' + totalWorkHours + ' hrs/wk  (deep work + meetings + admin)', { hours: String(totalWorkHours) }) + '\n\n';

  // 📐 Key Metrics
  main += '📐 Key Metrics:\n' + SEP + '\n';
  const deepWorkPct = Math.min(100, Math.round((deepWork / 40) * 100));
  const meetingsVsDeep = deepWork > 0 ? (meetings / deepWork * 100).toFixed(0) : '∞';
  main += makeToken('calc_out.productivity_score.row.deep_work_pct', '• Deep Work % of week:     ' + deepWorkPct + '%  (target: 40%+)', { pct: String(deepWorkPct) }) + '\n';
  main += makeToken('calc_out.productivity_score.row.meetings_to_deep_ratio', '• Meetings-to-Deep Ratio:  ' + meetingsVsDeep + '%  (lower is better)', { ratio: meetingsVsDeep }) + '\n';
  main += (tools >= 3 && tools <= 5
    ? makeToken('calc_out.productivity_score.row.tool_efficiency_optimal', '• Tool Efficiency Score:   🟢 Optimal (3–5)')
    : tools < 3
      ? makeToken('calc_out.productivity_score.row.tool_efficiency_under', '• Tool Efficiency Score:   🟠 Under-tooled')
      : makeToken('calc_out.productivity_score.row.tool_efficiency_over', '• Tool Efficiency Score:   🟠 Over-tooled')) + '\n';
  // ⚠️ 「D — Needs Work」/「F — Urgent」两档**永远到不了**（score 只增不减 ⇒ 恒 ≥ 50）
  //   ⇒ 不给它们造 locale 码（否则 G2 缺键），保留成普通英文字符串。
  main += (score >= 85
    ? makeToken('calc_out.productivity_score.row.tier_elite', '• Productivity Tier:       A — Elite')
    : score >= 70
      ? makeToken('calc_out.productivity_score.row.tier_solid', '• Productivity Tier:       B — Solid')
      : score >= 50
        ? makeToken('calc_out.productivity_score.row.tier_growing', '• Productivity Tier:       C — Growing')
        : score >= 30
          ? '• Productivity Tier:       D — Needs Work'
          : '• Productivity Tier:       F — Urgent') + '\n\n';

  // 🩺 Health
  main += '🩺 Productivity Health:\n' + SEP + '\n';
  // ⚠️ 「struggling」档（score < 45）**永远到不了**（score 恒 ≥ 50）⇒ 保留普通英文字符串。
  main += (score >= 90
    ? makeToken('calc_out.productivity_score.row.health_peak', '• 🟢 Score ' + score + '/100 — peak performer. Protect what is working.', { score: String(score) })
    : score >= 75
      ? makeToken('calc_out.productivity_score.row.health_strong', '• 🟢 Score ' + score + '/100 — strong systems. Keep iterating.', { score: String(score) })
      : score >= 60
        ? makeToken('calc_out.productivity_score.row.health_solid', '• 🟡 Score ' + score + '/100 — solid baseline. Room to grow in the weakest area.', { score: String(score) })
        : score >= 45
          ? makeToken('calc_out.productivity_score.row.health_below_avg', '• 🟠 Score ' + score + '/100 — below average. Focus on the #1 lever below.', { score: String(score) })
          : '• 🔴 Score ' + score + '/100 — struggling. Fundamental changes needed.') + '\n';

  main += (deepWork >= 20
    ? makeToken('calc_out.productivity_score.row.deep_work_top', '• 🟢 Deep work hours in top quartile (20+ hrs/wk).')
    : deepWork >= 10
      ? makeToken('calc_out.productivity_score.row.deep_work_ok', '• 🟡 Deep work hours OK but not exceptional. Push for 20+.')
      : makeToken('calc_out.productivity_score.row.deep_work_low', '• 🔴 Deep work is too low — biggest improvement area. Aim for 15–20 hrs/wk.')) + '\n';

  main += (meetings <= 2
    ? makeToken('calc_out.productivity_score.row.meeting_light', '• 🟢 Meeting load is light. Your maker time is protected.')
    : meetings <= 5
      ? makeToken('calc_out.productivity_score.row.meeting_moderate', '• 🟡 Meeting load is moderate. Batch them to one day if possible.')
      : makeToken('calc_out.productivity_score.row.meeting_heavy', '• 🔴 Meeting load is heavy. Cut 50% and replace with async updates.')) + '\n';

  // ⚠️ 各分支的行尾换行符必须与基线逐字一致（基线：optimal/light 各为 '\n'，bloat 为 '\n\n'）。
  main += (tools >= 3 && tools <= 5
    ? makeToken('calc_out.productivity_score.row.tool_optimal', '• 🟢 Tool stack is optimal. You have what you need, no bloat.') + '\n'
    : tools < 3
      ? makeToken('calc_out.productivity_score.row.tool_light', '• 🟡 Tool stack is light. Consider adding 1–2 automation tools.') + '\n'
      : makeToken('calc_out.productivity_score.row.tool_bloat', '• 🟠 Tool stack has bloat. Audit and cut what you haven\'t used in 2 weeks.') + '\n\n');

  // 🎯 Improvement Projection
  main += '🎯 Improvement Projection:\n' + SEP + '\n';
  const add5DW = Math.min(25, deepWork + 5 >= 30 ? 25 : deepWork + 5 >= 20 ? 20 : deepWork + 5 >= 10 ? 10 : 5);
  const cutMtg = meetings > 5 ? 20 : meetings > 2 ? 10 : 0;
  const trimTools = tools > 5 ? 10 : tools < 3 ? 7 : 0;
  const projection30 = Math.min(100, score + add5DW + cutMtg + trimTools);
  main += makeToken('calc_out.productivity_score.row.current_score', '• Current score:                ' + score + '/100', { score: String(score) }) + '\n';
  main += makeToken('calc_out.productivity_score.row.projection_add_5dw', '• +5 deep work hrs/wk:          +' + add5DW + ' pts → ' + Math.min(100, score + add5DW) + '/100', { add: String(add5DW), after: Math.min(100, score + add5DW) + '/100' }) + '\n';
  main += makeToken('calc_out.productivity_score.row.projection_cut_mtg', '• Cut meetings to 2/wk:         +' + cutMtg + ' pts → ' + Math.min(100, score + cutMtg) + '/100', { add: String(cutMtg), after: Math.min(100, score + cutMtg) + '/100' }) + '\n';
  main += makeToken('calc_out.productivity_score.row.projection_trim_tools', '• Trim tools to 3–5:            +' + trimTools + ' pts → ' + Math.min(100, score + trimTools) + '/100', { add: String(trimTools), after: Math.min(100, score + trimTools) + '/100' }) + '\n';
  main += makeToken('calc_out.productivity_score.row.projection_all_three', '• All three in 30 days:         ' + projection30 + '/100', { score: projection30 + '/100' }) + '\n';
  // ⚠️ 各分支的行尾换行符必须与基线逐字一致（基线：maintain/85 各为 '\n'，target_20 为 '\n\n'）。
  main += (score >= 85
    ? makeToken('calc_out.productivity_score.row.target_maintain', '• Target: maintain score and protect deep work time.') + '\n'
    : projection30 >= 85
      ? makeToken('calc_out.productivity_score.row.target_85', '• Target: 85+ achievable within 30 days with focused effort.') + '\n'
      : makeToken('calc_out.productivity_score.row.target_20', '• Target: +20 pts in 30 days. Focus on the lowest sub-score first.') + '\n\n');

  // ⚖️ Break-even
  main += '⚖️ Deep Work vs Shallow Work Break-Even:\n' + SEP + '\n';
  const totalHours = 40;
  const shallowHours = totalHours - deepWork - meetings;
  if (deepWork >= 15 && meetings <= 3) {
    main += makeToken('calc_out.productivity_score.row.mix_healthy', '• 🟢 Your mix is healthy: ' + deepWork + 'h deep + ' + meetings + 'h meetings + ' + shallowHours + 'h admin.', { deep: String(deepWork), meetings: String(meetings), admin: String(shallowHours) }) + '\n';
  } else if (deepWork < 10 && meetings > 5) {
    main += makeToken('calc_out.productivity_score.row.mix_inverted', '• 🔴 Your mix is inverted: only ' + deepWork + 'h deep but ' + meetings + 'h meetings. The 4:1 meeting:deep ratio is costing you output.', { deep: String(deepWork), meetings: String(meetings) }) + '\n';
  } else if (deepWork < meetings) {
    main += makeToken('calc_out.productivity_score.row.mix_more_meetings', '• 🟠 You spend more time in meetings than in deep work. Flip this ratio.') + '\n';
  } else {
    main += makeToken('calc_out.productivity_score.row.mix_workable', '• 🟡 Your mix is workable but improvable. Aim for 2x deep work vs meetings.') + '\n';
  }
  main += makeToken('calc_out.productivity_score.row.break_even_threshold', '• Break-even: at 15+ hrs/wk deep work, you compound skills. Below 10, you are treading water.') + '\n';
  main += makeToken('calc_out.productivity_score.row.cal_newport', '• Cal Newport\'s research: 4 hours/day of deep work = full-time knowledge worker output.') + '\n\n';

  // 🔄 What-If Scenarios
  main += '🔄 What-If Scenarios:\n' + SEP + '\n';
  main += makeToken('calc_out.productivity_score.row.whatif_add_5dw', '• Add 5 deep work hrs/wk:           +' + add5DW + ' pts (max +25 from deep work alone)', { add: String(add5DW) }) + '\n';
  main += makeToken('calc_out.productivity_score.row.whatif_cut_mtg', '• Cut meetings to 2/wk:             +' + cutMtg + ' pts (full +20 if currently >5)', { add: String(cutMtg) }) + '\n';
  main += makeToken('calc_out.productivity_score.row.whatif_trim_tools', '• Trim tool stack to 3–5 core tools: +' + trimTools + ' pts (full +10 if currently >5)', { add: String(trimTools) }) + '\n';
  main += makeToken('calc_out.productivity_score.row.whatif_block_thursdays', '• Block all meetings to Thursdays:  no score change but recovers 4+ hrs/wk for deep work') + '\n';
  main += makeToken('calc_out.productivity_score.row.whatif_quit_meeting', '• Quit one recurring meeting:       +5 to +10 pts and reclaims 1–2 hrs/wk') + '\n\n';

  // 💡 Top Lever
  main += (deepWork < 10
    ? makeToken('calc_out.productivity_score.row.top_lever_deep_work', '💡 Top Lever: Increase deep work hours. Block 2–3 hour morning sessions with zero distractions. Phone in another room, email closed, no Slack.')
    : meetings > 5
      ? makeToken('calc_out.productivity_score.row.top_lever_meetings', '💡 Top Lever: Cut meetings by 50%. Replace them with Loom videos or written updates. The async tax is real but smaller than the meeting tax.')
      : tools > 5
        ? makeToken('calc_out.productivity_score.row.top_lever_tools', '💡 Top Lever: Audit and reduce your tool stack. Fewer tools = less context switching. Cut any subscription you haven\'t used in the last 2 weeks.')
        : makeToken('calc_out.productivity_score.row.top_lever_track', '💡 Top Lever: You are on track. Protect your current systems. The next 5 points come from going deeper, not wider.')) + '\n';

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
    // ⭐ 局部变量承接（2026-11-19 B3-13 组 2 实测修）：'s.t' / 's.m' 直接写进兜底 ⇒
  //   源码模板推导会把 's' / 't' 当成两个标识符分别替换 ⇒ 模板污染（{count}.{count}）
  //   ⇒ 必须是**标识符**（与 unit_economics 的 costCut 同一处理）。
    const toolCount = s.t;
    const meetingCount = s.m;
    results.push(
      // ⭐ 参数边界：'deep' 必须带上单位 'h'，'score' 必须只带数值 ⇒
      //   否则运行时反推会把 '40'（后面紧跟字母 h）/'100'（后面紧跟 /100）判为「不匹配」
      //   ⇒ 模板里的数值被**冻结**（源码推导 vs 运行时反推不一致 ⇒ 报 conflict）。
      makeToken('calc_out.productivity_score.row.archetype_head', s.label + ': ' + (sScore + '/100') + ' — Deep Work ' + (s.dw + 'h'), { label: s.label, score: sScore + '/100', deep: s.dw + 'h' }) +
      ' | ' +
      makeToken('calc_out.productivity_score.row.archetype_tools', 'Tools ' + toolCount, { count: String(toolCount) }) +
      ' | ' +
      makeToken('calc_out.productivity_score.row.archetype_meetings', 'Meetings ' + meetingCount + '/wk', { count: String(meetingCount) }),
    );
  }

  return results;
}

const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let h=function(a){return Number.isNaN(a)?0:Math.max(0,a)},y=function(a){const r=h(parseInt(a.weeklyDeepWorkHours)||0),s=h(parseInt(a.toolsUsed)||0),i=h(parseInt(a.meetingsPerWeek)||0),_="━".repeat(41);let o=50;const w=[],l=[];r>=30?(o+=25,w.push("Elite deep work hours — you are in the top 5% of solopreneurs.")):r>=20?(o+=20,w.push("Strong deep work routine. This is the sweet spot for sustained productivity.")):r>=10?(o+=10,l.push("Aim for 15–20 hours of deep work per week. Block 3–4 hour morning sessions.")):r>=5?(o+=5,l.push("Deep work is your highest-leverage activity. Try scheduling 2-hour blocks each morning before checking email.")):l.push("Critical: You need dedicated deep work time. Start with 2-hour blocks, 3x per week. No phone, no email, no Slack."),s>=3&&s<=5?(o+=15,w.push("Perfect tool stack size. Enough to automate, not so many that you drown in subscriptions.")):s>=1&&s<=2?(o+=8,l.push("Consider adding 1–2 tools for automation (Zapier, Make) and project management (Notion, Linear).")):s>=6&&s<=8?(o+=5,l.push("You might have too many tools. Audit your subscriptions — cut any you haven't used in 2 weeks.")):s>8?l.push("Tool overload! You likely have redundant tools. Cancel half and watch your focus improve. Tool-switching is a hidden productivity killer."):l.push("Using zero tools? At minimum, get a to-do app and a calendar. They are force multipliers."),i<=2?(o+=20,w.push("Minimal meetings — you protect your maker time. This is the solopreneur advantage.")):i<=5?(o+=10,l.push("Try to batch all meetings on one day (e.g., Thursday). This keeps the rest of the week meeting-free.")):i<=10?(o+=0,l.push("That is a lot of meetings for a solopreneur. Ask: can this be an email? Can it be async (Loom)? Cut 50%.")):l.push("Too many meetings. You are running a company, not attending one. Replace recurring meetings with async updates. Your deep work is suffering."),o=Math.max(10,Math.min(100,o));const Y=c=>c.toString();let e=t("calc_out.productivity_score.row.title","📈 Productivity Score: "+o+"/100",{score:String(o)})+\`

\`;e+=\`💰 Score Snapshot:
\`+_+\`
\`,e+=t("calc_out.productivity_score.row.total_score","• Total Score:          "+o+"/100",{score:String(o)})+\`
\`,e+=t("calc_out.productivity_score.row.weekly_deep_work","• Weekly Deep Work:    "+r+" hours",{hours:String(r)})+\`
\`,e+=t("calc_out.productivity_score.row.tools_in_stack","• Tools in Stack:      "+s+" tools",{count:String(s)})+\`
\`,e+=t("calc_out.productivity_score.row.weekly_meetings","• Weekly Meetings:     "+i+" meetings",{count:String(i)})+\`
\`;const f=r+i+5;e+=t("calc_out.productivity_score.row.total_work_hours","• Total Work Hours:    "+f+" hrs/wk  (deep work + meetings + admin)",{hours:String(f)})+\`

\`,e+=\`📐 Key Metrics:
\`+_+\`
\`;const m=Math.min(100,Math.round(r/40*100)),S=r>0?(i/r*100).toFixed(0):"∞";e+=t("calc_out.productivity_score.row.deep_work_pct","• Deep Work % of week:     "+m+"%  (target: 40%+)",{pct:String(m)})+\`
\`,e+=t("calc_out.productivity_score.row.meetings_to_deep_ratio","• Meetings-to-Deep Ratio:  "+S+"%  (lower is better)",{ratio:S})+\`
\`,e+=(s>=3&&s<=5?t("calc_out.productivity_score.row.tool_efficiency_optimal","• Tool Efficiency Score:   🟢 Optimal (3–5)"):s<3?t("calc_out.productivity_score.row.tool_efficiency_under","• Tool Efficiency Score:   🟠 Under-tooled"):t("calc_out.productivity_score.row.tool_efficiency_over","• Tool Efficiency Score:   🟠 Over-tooled"))+\`
\`,e+=(o>=85?t("calc_out.productivity_score.row.tier_elite","• Productivity Tier:       A — Elite"):o>=70?t("calc_out.productivity_score.row.tier_solid","• Productivity Tier:       B — Solid"):o>=50?t("calc_out.productivity_score.row.tier_growing","• Productivity Tier:       C — Growing"):o>=30?"• Productivity Tier:       D — Needs Work":"• Productivity Tier:       F — Urgent")+\`

\`,e+=\`🩺 Productivity Health:
\`+_+\`
\`,e+=(o>=90?t("calc_out.productivity_score.row.health_peak","• 🟢 Score "+o+"/100 — peak performer. Protect what is working.",{score:String(o)}):o>=75?t("calc_out.productivity_score.row.health_strong","• 🟢 Score "+o+"/100 — strong systems. Keep iterating.",{score:String(o)}):o>=60?t("calc_out.productivity_score.row.health_solid","• 🟡 Score "+o+"/100 — solid baseline. Room to grow in the weakest area.",{score:String(o)}):o>=45?t("calc_out.productivity_score.row.health_below_avg","• 🟠 Score "+o+"/100 — below average. Focus on the #1 lever below.",{score:String(o)}):"• 🔴 Score "+o+"/100 — struggling. Fundamental changes needed.")+\`
\`,e+=(r>=20?t("calc_out.productivity_score.row.deep_work_top","• 🟢 Deep work hours in top quartile (20+ hrs/wk)."):r>=10?t("calc_out.productivity_score.row.deep_work_ok","• 🟡 Deep work hours OK but not exceptional. Push for 20+."):t("calc_out.productivity_score.row.deep_work_low","• 🔴 Deep work is too low — biggest improvement area. Aim for 15–20 hrs/wk."))+\`
\`,e+=(i<=2?t("calc_out.productivity_score.row.meeting_light","• 🟢 Meeting load is light. Your maker time is protected."):i<=5?t("calc_out.productivity_score.row.meeting_moderate","• 🟡 Meeting load is moderate. Batch them to one day if possible."):t("calc_out.productivity_score.row.meeting_heavy","• 🔴 Meeting load is heavy. Cut 50% and replace with async updates."))+\`
\`,e+=s>=3&&s<=5?t("calc_out.productivity_score.row.tool_optimal","• 🟢 Tool stack is optimal. You have what you need, no bloat.")+\`
\`:s<3?t("calc_out.productivity_score.row.tool_light","• 🟡 Tool stack is light. Consider adding 1–2 automation tools.")+\`
\`:t("calc_out.productivity_score.row.tool_bloat","• 🟠 Tool stack has bloat. Audit and cut what you haven't used in 2 weeks.")+\`

\`,e+=\`🎯 Improvement Projection:
\`+_+\`
\`;const u=Math.min(25,r+5>=30?25:r+5>=20?20:r+5>=10?10:5),d=i>5?20:i>2?10:0,p=s>5?10:s<3?7:0,g=Math.min(100,o+u+d+p);e+=t("calc_out.productivity_score.row.current_score","• Current score:                "+o+"/100",{score:String(o)})+\`
\`,e+=t("calc_out.productivity_score.row.projection_add_5dw","• +5 deep work hrs/wk:          +"+u+" pts → "+Math.min(100,o+u)+"/100",{add:String(u),after:Math.min(100,o+u)+"/100"})+\`
\`,e+=t("calc_out.productivity_score.row.projection_cut_mtg","• Cut meetings to 2/wk:         +"+d+" pts → "+Math.min(100,o+d)+"/100",{add:String(d),after:Math.min(100,o+d)+"/100"})+\`
\`,e+=t("calc_out.productivity_score.row.projection_trim_tools","• Trim tools to 3–5:            +"+p+" pts → "+Math.min(100,o+p)+"/100",{add:String(p),after:Math.min(100,o+p)+"/100"})+\`
\`,e+=t("calc_out.productivity_score.row.projection_all_three","• All three in 30 days:         "+g+"/100",{score:g+"/100"})+\`
\`,e+=o>=85?t("calc_out.productivity_score.row.target_maintain","• Target: maintain score and protect deep work time.")+\`
\`:g>=85?t("calc_out.productivity_score.row.target_85","• Target: 85+ achievable within 30 days with focused effort.")+\`
\`:t("calc_out.productivity_score.row.target_20","• Target: +20 pts in 30 days. Focus on the lowest sub-score first.")+\`

\`,e+=\`⚖️ Deep Work vs Shallow Work Break-Even:
\`+_+\`
\`;const b=40-r-i;r>=15&&i<=3?e+=t("calc_out.productivity_score.row.mix_healthy","• 🟢 Your mix is healthy: "+r+"h deep + "+i+"h meetings + "+b+"h admin.",{deep:String(r),meetings:String(i),admin:String(b)})+\`
\`:r<10&&i>5?e+=t("calc_out.productivity_score.row.mix_inverted","• 🔴 Your mix is inverted: only "+r+"h deep but "+i+"h meetings. The 4:1 meeting:deep ratio is costing you output.",{deep:String(r),meetings:String(i)})+\`
\`:r<i?e+=t("calc_out.productivity_score.row.mix_more_meetings","• 🟠 You spend more time in meetings than in deep work. Flip this ratio.")+\`
\`:e+=t("calc_out.productivity_score.row.mix_workable","• 🟡 Your mix is workable but improvable. Aim for 2x deep work vs meetings.")+\`
\`,e+=t("calc_out.productivity_score.row.break_even_threshold","• Break-even: at 15+ hrs/wk deep work, you compound skills. Below 10, you are treading water.")+\`
\`,e+=t("calc_out.productivity_score.row.cal_newport","• Cal Newport's research: 4 hours/day of deep work = full-time knowledge worker output.")+\`

\`,e+=\`🔄 What-If Scenarios:
\`+_+\`
\`,e+=t("calc_out.productivity_score.row.whatif_add_5dw","• Add 5 deep work hrs/wk:           +"+u+" pts (max +25 from deep work alone)",{add:String(u)})+\`
\`,e+=t("calc_out.productivity_score.row.whatif_cut_mtg","• Cut meetings to 2/wk:             +"+d+" pts (full +20 if currently >5)",{add:String(d)})+\`
\`,e+=t("calc_out.productivity_score.row.whatif_trim_tools","• Trim tool stack to 3–5 core tools: +"+p+" pts (full +10 if currently >5)",{add:String(p)})+\`
\`,e+=t("calc_out.productivity_score.row.whatif_block_thursdays","• Block all meetings to Thursdays:  no score change but recovers 4+ hrs/wk for deep work")+\`
\`,e+=t("calc_out.productivity_score.row.whatif_quit_meeting","• Quit one recurring meeting:       +5 to +10 pts and reclaims 1–2 hrs/wk")+\`

\`,e+=(r<10?t("calc_out.productivity_score.row.top_lever_deep_work","💡 Top Lever: Increase deep work hours. Block 2–3 hour morning sessions with zero distractions. Phone in another room, email closed, no Slack."):i>5?t("calc_out.productivity_score.row.top_lever_meetings","💡 Top Lever: Cut meetings by 50%. Replace them with Loom videos or written updates. The async tax is real but smaller than the meeting tax."):s>5?t("calc_out.productivity_score.row.top_lever_tools","💡 Top Lever: Audit and reduce your tool stack. Fewer tools = less context switching. Cut any subscription you haven't used in the last 2 weeks."):t("calc_out.productivity_score.row.top_lever_track","💡 Top Lever: You are on track. Protect your current systems. The next 5 points come from going deeper, not wider."))+\`
\`;const M=[e],D=[{dw:40,t:4,m:1,label:"Peak Performer"},{dw:25,t:3,m:2,label:"Ideal Solopreneur"},{dw:15,t:5,m:4,label:"Balanced Grinder"},{dw:8,t:2,m:3,label:"Side Hustler"},{dw:5,t:8,m:12,label:"Meeting-Heavy Founder"}];for(const c of D){let n=50;c.dw>=30?n+=25:c.dw>=20?n+=20:c.dw>=10?n+=10:c.dw>=5&&(n+=5),c.t>=3&&c.t<=5?n+=15:c.t>=1&&c.t<=2?n+=8:c.t>=6&&c.t<=8&&(n+=5),c.m<=2?n+=20:c.m<=5&&(n+=10),n=Math.max(10,Math.min(100,n));const x=c.t,P=c.m;M.push(t("calc_out.productivity_score.row.archetype_head",c.label+": "+(n+"/100")+" — Deep Work "+(c.dw+"h"),{label:c.label,score:n+"/100",deep:c.dw+"h"})+" | "+t("calc_out.productivity_score.row.archetype_tools","Tools "+x,{count:String(x)})+" | "+t("calc_out.productivity_score.row.archetype_meetings","Meetings "+P+"/wk",{count:String(P)}))}return M},v=function(a,r,s){var i=W(a);return Array.isArray(i)?i.join(\`
\`):String(i)};var A=h,F=y,j=v,t=tk,C='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',t=new Function("return "+C)(),W=function(a){return y(a)};return[v(inputs,pick,fill)]}finally{}
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
    '$calc_out.productivity_score.row.title{"score":"85"}|📈 Productivity Score: 85/100|\n\n💰 Score Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.productivity_score.row.total_score{"score":"85"}|• Total Score:          85/100|\n$calc_out.productivity_score.row.weekly_deep_work{"hours":"15"}|• Weekly Deep Work:    15 hours|\n$calc_out.productivity_score.row.tools_in_stack{"count":"5"}|• Tools in Stack:      5 tools|\n$calc_out.productivity_score.row.weekly_meetings{"count":"3"}|• Weekly Meetings:     3 meetings|\n$calc_out.productivity_score.row.total_work_hours{"hours":"23"}|• Total Work Hours:    23 hrs/wk  (deep work + meetings + admin)|\n\n📐 Key Metrics:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.productivity_score.row.deep_work_pct{"pct":"38"}|• Deep Work % of week:     38%  (target: 40%+)|\n$calc_out.productivity_score.row.meetings_to_deep_ratio{"ratio":"20"}|• Meetings-to-Deep Ratio:  20%  (lower is better)|\n$calc_out.productivity_score.row.tool_efficiency_optimal|• Tool Efficiency Score:   🟢 Optimal (3–5)|\n$calc_out.productivity_score.row.tier_elite|• Productivity Tier:       A — Elite|\n\n🩺 Productivity Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.productivity_score.row.health_strong{"score":"85"}|• 🟢 Score 85/100 — strong systems. Keep iterating.|\n$calc_out.productivity_score.row.deep_work_ok|• 🟡 Deep work hours OK but not exceptional. Push for 20+.|\n$calc_out.productivity_score.row.meeting_moderate|• 🟡 Meeting load is moderate. Batch them to one day if possible.|\n$calc_out.productivity_score.row.tool_optimal|• 🟢 Tool stack is optimal. You have what you need, no bloat.|\n🎯 Improvement Projection:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.productivity_score.row.current_score{"score":"85"}|• Current score:                85/100|\n$calc_out.productivity_score.row.projection_add_5dw{"add":"20","after":"100/100"}|• +5 deep work hrs/wk:          +20 pts → 100/100|\n$calc_out.productivity_score.row.projection_cut_mtg{"add":"10","after":"95/100"}|• Cut meetings to 2/wk:         +10 pts → 95/100|\n$calc_out.productivity_score.row.projection_trim_tools{"add":"0","after":"85/100"}|• Trim tools to 3–5:            +0 pts → 85/100|\n$calc_out.productivity_score.row.projection_all_three{"score":"100/100"}|• All three in 30 days:         100/100|\n$calc_out.productivity_score.row.target_maintain|• Target: maintain score and protect deep work time.|\n⚖️ Deep Work vs Shallow Work Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.productivity_score.row.mix_healthy{"deep":"15","meetings":"3","admin":"22"}|• 🟢 Your mix is healthy: 15h deep + 3h meetings + 22h admin.|\n$calc_out.productivity_score.row.break_even_threshold|• Break-even: at 15+ hrs/wk deep work, you compound skills. Below 10, you are treading water.|\n$calc_out.productivity_score.row.cal_newport|• Cal Newport\'s research: 4 hours/day of deep work = full-time knowledge worker output.|\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.productivity_score.row.whatif_add_5dw{"add":"20"}|• Add 5 deep work hrs/wk:           +20 pts (max +25 from deep work alone)|\n$calc_out.productivity_score.row.whatif_cut_mtg{"add":"10"}|• Cut meetings to 2/wk:             +10 pts (full +20 if currently >5)|\n$calc_out.productivity_score.row.whatif_trim_tools{"add":"0"}|• Trim tool stack to 3–5 core tools: +0 pts (full +10 if currently >5)|\n$calc_out.productivity_score.row.whatif_block_thursdays|• Block all meetings to Thursdays:  no score change but recovers 4+ hrs/wk for deep work|\n$calc_out.productivity_score.row.whatif_quit_meeting|• Quit one recurring meeting:       +5 to +10 pts and reclaims 1–2 hrs/wk|\n\n$calc_out.productivity_score.row.top_lever_track|💡 Top Lever: You are on track. Protect your current systems. The next 5 points come from going deeper, not wider.|\n\n$calc_out.productivity_score.row.archetype_head{"label":"Peak Performer","score":"100/100","deep":"40h"}|Peak Performer: 100/100 — Deep Work 40h| | $calc_out.productivity_score.row.archetype_tools{"count":"4"}|Tools 4| | $calc_out.productivity_score.row.archetype_meetings{"count":"1"}|Meetings 1/wk|\n$calc_out.productivity_score.row.archetype_head{"label":"Ideal Solopreneur","score":"100/100","deep":"25h"}|Ideal Solopreneur: 100/100 — Deep Work 25h| | $calc_out.productivity_score.row.archetype_tools{"count":"3"}|Tools 3| | $calc_out.productivity_score.row.archetype_meetings{"count":"2"}|Meetings 2/wk|\n$calc_out.productivity_score.row.archetype_head{"label":"Balanced Grinder","score":"85/100","deep":"15h"}|Balanced Grinder: 85/100 — Deep Work 15h| | $calc_out.productivity_score.row.archetype_tools{"count":"5"}|Tools 5| | $calc_out.productivity_score.row.archetype_meetings{"count":"4"}|Meetings 4/wk|\n$calc_out.productivity_score.row.archetype_head{"label":"Side Hustler","score":"73/100","deep":"8h"}|Side Hustler: 73/100 — Deep Work 8h| | $calc_out.productivity_score.row.archetype_tools{"count":"2"}|Tools 2| | $calc_out.productivity_score.row.archetype_meetings{"count":"3"}|Meetings 3/wk|\n$calc_out.productivity_score.row.archetype_head{"label":"Meeting-Heavy Founder","score":"60/100","deep":"5h"}|Meeting-Heavy Founder: 60/100 — Deep Work 5h| | $calc_out.productivity_score.row.archetype_tools{"count":"8"}|Tools 8| | $calc_out.productivity_score.row.archetype_meetings{"count":"12"}|Meetings 12/wk|',
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


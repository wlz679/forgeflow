import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-8：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
//   ⚠️ 章节标题 / 标签用**字面量 token**（code|原文|）；整行结论句用
//      makeToken(code, fallback, params) ⇒ fallback 与 params 取**同一个变量**。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

function calculateEmailRevenue(inputs: Record<string, string>): string[] {
  const subscriberCount = clampNonNegative(parseFloat(inputs.subscriberCount) || 0);
  const openRate = clampNonNegative(parseFloat(inputs.openRate) || 0);
  const clickRate = clampNonNegative(parseFloat(inputs.clickRate) || 0);
  const conversionRate = clampNonNegative(parseFloat(inputs.conversionRate) || 0);
  const avgOrderValue = clampNonNegative(parseFloat(inputs.avgOrderValue) || 0);
  const emailsPerMonth = clampNonNegative(parseFloat(inputs.emailsPerMonth) || 4);
  const unsubscribeRate = clampNonNegative(parseFloat(inputs.unsubscribeRate) || 0.5);
  const results: string[] = [];

  const opens = subscriberCount * (openRate / 100);
  const clicks = opens * (clickRate / 100);
  const conversions = clicks * (conversionRate / 100);
  const revenuePerSend = conversions * avgOrderValue;
  const monthlyRevenue = revenuePerSend * emailsPerMonth;
  const annualRevenue = monthlyRevenue * 12;
  const revenuePerSubscriber = subscriberCount > 0 ? annualRevenue / subscriberCount : 0;
  const revenuePerSendPerSub = subscriberCount > 0 ? revenuePerSend / subscriberCount : 0;
  const breakEvenSubs = avgOrderValue > 0 && conversionRate > 0 && clickRate > 0 && openRate > 0
    ? (1 / (openRate / 100) / (clickRate / 100) / (conversionRate / 100) / avgOrderValue / emailsPerMonth * 12)
    : 0;

  const fmt = (n: number) => '$' + n.toFixed(2);
  const fmt0 = (n: number) => '$' + Math.round(n).toLocaleString();
  const pct2 = (n: number) => n.toFixed(2);
  const pct1 = (n: number) => n.toFixed(1);
  const loc = (n: number) => Math.round(n).toLocaleString();

  results.push(
    '$calc_out.section.email_list_revenue_calculator|📧 Email List Revenue Calculator|\n\n' +
    '$calc_out.section.email_list_revenue_funnel_metrics|📊 Funnel Metrics:|\n' +
    '• $calc_out.label.subscribers|Subscribers|:           ' + loc(subscriberCount) + '\n' +
    '• ' + makeToken('calc_out.email_list_revenue.row.open_rate', 'Open Rate:             ' + pct1(openRate) + '%  → ' + loc(opens) + ' opens', { rate: pct1(openRate), opens: loc(opens) }) + '\n' +
    '• ' + makeToken('calc_out.email_list_revenue.row.click_rate', 'Click Rate:            ' + pct1(clickRate) + '%  → ' + loc(clicks) + ' clicks', { rate: pct1(clickRate), clicks: loc(clicks) }) + '\n' +
    '• ' + makeToken('calc_out.email_list_revenue.row.conversion_rate', 'Conversion Rate:       ' + pct1(conversionRate) + '%  → ' + conversions.toFixed(2) + ' conversions', { rate: pct1(conversionRate), conversions: conversions.toFixed(2) }) + '\n' +
    '• $calc_out.label.avg_order_value|Avg Order Value|:       ' + fmt(avgOrderValue) + '\n' +
    '• ' + makeToken('calc_out.email_list_revenue.row.emails_per_month', 'Emails/Month:          ' + emailsPerMonth + '  (industry avg 2-8)', { emails: String(emailsPerMonth) }) + '\n' +
    '• $calc_out.label.monthly_unsubscribes|Monthly Unsubscribes|:  ~' + pct1(unsubscribeRate) + '%  (' + loc(subscriberCount * unsubscribeRate / 100) + '/mo)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.email_list_revenue_revenue_snapshot|💰 Revenue Snapshot:|\n' +
    '• $calc_out.label.revenue_per_send|Revenue Per Send|:      ' + fmt(revenuePerSend) + '\n' +
    '• $calc_out.label.monthly_revenue|Monthly Revenue|:       ' + fmt0(monthlyRevenue) + '/mo\n' +
    '• $calc_out.label.annual_revenue_email|Annual Revenue|:        ' + fmt0(annualRevenue) + '/yr\n' +
    '• $calc_out.label.per_subscriber_yr|Per Subscriber (yr)|:   ' + fmt(revenuePerSubscriber) + '/sub/yr\n' +
    '• $calc_out.label.per_subscriber_mo|Per Subscriber (mo)|:   ' + '$' + (revenuePerSubscriber / 12).toFixed(2) + '/sub/mo\n' +
    '• $calc_out.label.per_send_per_sub|Per Send Per Sub|:      ' + '$' + revenuePerSendPerSub.toFixed(4) + '\n' +
    '• ' + makeToken('calc_out.email_list_revenue.row.total_annual_conversions', 'Total Annual Conversions: ' + loc(conversions * emailsPerMonth * 12) + ' sales/yr', { conversions: loc(conversions * emailsPerMonth * 12) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.email_list_revenue_list_economics|📐 List Economics:|\n' +
    '• $calc_out.label.revenue_send|Revenue/Send|:          ' + fmt(revenuePerSend) + '\n' +
    '• $calc_out.label.revenue_1000_opens|Revenue/1000 Opens|:    ' + '$' + (opens > 0 ? ((conversions * avgOrderValue) / opens * 1000).toFixed(2) : '0.00') + '\n' +
    '• $calc_out.label.revenue_1000_clicks|Revenue/1000 Clicks|:   ' + '$' + (clicks > 0 ? ((conversions * avgOrderValue) / clicks * 1000).toFixed(2) : '0.00') + '\n' +
    '• ' + makeToken('calc_out.email_list_revenue.row.click_to_open_rate', 'Click-to-Open Rate:    ' + pct1(opens > 0 ? (clicks / opens) * 100 : 0) + '%  (CTOR — industry: 10-15%)', { rate: pct1(opens > 0 ? (clicks / opens) * 100 : 0) }) + '\n' +
    '• ' + makeToken('calc_out.email_list_revenue.row.revenue_per_email', 'Revenue per Email:     ' + fmt(revenuePerSend) + ' (per send)', { revenue: fmt(revenuePerSend) }) + '\n' +
    '• $calc_out.label.industry_benchmark_email|Industry Benchmark|:    ' + makeToken('calc_out.email_list_revenue.row.benchmark_baseline', '$1-2/sub/yr baseline') + ' | ' + makeToken('calc_out.email_list_revenue.row.benchmark_top_performers', '$5-20/sub/yr top performers') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.email_list_revenue_list_health|🩺 List Health:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + (openRate > 25
      ? makeToken('calc_out.email_list_revenue.row.health_open_strong', '🟢 Open rate ' + pct1(openRate) + '% is strong (industry avg 20-25%).', { rate: pct1(openRate) })
      : openRate >= 15
      ? makeToken('calc_out.email_list_revenue.row.health_open_average', '🟡 Open rate ' + pct1(openRate) + '% is on industry average.', { rate: pct1(openRate) })
      : openRate >= 10
      ? makeToken('calc_out.email_list_revenue.row.health_open_below', '🟠 Open rate ' + pct1(openRate) + '% is below average — test subject lines.', { rate: pct1(openRate) })
      : makeToken('calc_out.email_list_revenue.row.health_open_weak', '🔴 Open rate ' + pct1(openRate) + '% is weak — clean list, test sender reputation.', { rate: pct1(openRate) })) + '\n' +
    '• ' + (clickRate >= 4
      ? makeToken('calc_out.email_list_revenue.row.health_click_healthy', '🟢 Click rate ' + pct1(clickRate) + '% is healthy.', { rate: pct1(clickRate) })
      : clickRate >= 2
      ? makeToken('calc_out.email_list_revenue.row.health_click_ok', '🟡 Click rate ' + pct1(clickRate) + '% is OK — test better CTAs.', { rate: pct1(clickRate) })
      : makeToken('calc_out.email_list_revenue.row.health_click_weak', '🔴 Click rate ' + pct1(clickRate) + '% is weak — rewrite for relevance.', { rate: pct1(clickRate) })) + '\n' +
    (revenuePerSubscriber >= 5
      ? '• ' + makeToken('calc_out.email_list_revenue.row.monetization_strong', '🟢 ' + fmt(revenuePerSubscriber) + '/sub/yr — strong monetization.', { value: fmt(revenuePerSubscriber) }) + '\n'
      : revenuePerSubscriber >= 2
      ? '• ' + makeToken('calc_out.email_list_revenue.row.monetization_workable', '🟡 ' + fmt(revenuePerSubscriber) + '/sub/yr — workable, improvable.', { value: fmt(revenuePerSubscriber) }) + '\n'
      : revenuePerSubscriber >= 0.5
      ? '• ' + makeToken('calc_out.email_list_revenue.row.monetization_below', '🟠 ' + fmt(revenuePerSubscriber) + '/sub/yr — below benchmark.', { value: fmt(revenuePerSubscriber) }) + '\n'
      : subscriberCount > 0
      ? '• ' + makeToken('calc_out.email_list_revenue.row.monetization_very_low', '🔴 ' + fmt(revenuePerSubscriber) + '/sub/yr — very low.', { value: fmt(revenuePerSubscriber) }) + '\n'
      : '') +
    '• ' + (unsubscribeRate < 0.3
      ? makeToken('calc_out.email_list_revenue.row.unsub_strong', '🟢 Unsub rate ' + pct1(unsubscribeRate) + '% — strong list retention.', { rate: pct1(unsubscribeRate) })
      : unsubscribeRate < 1
      ? makeToken('calc_out.email_list_revenue.row.unsub_typical', '🟡 Unsub rate ' + pct1(unsubscribeRate) + '% — typical.', { rate: pct1(unsubscribeRate) })
      : makeToken('calc_out.email_list_revenue.row.unsub_too_high', '🔴 Unsub rate ' + pct1(unsubscribeRate) + '% — too high, prune inactive subs.', { rate: pct1(unsubscribeRate) })) + '\n' +
    '\n$calc_out.section.email_list_revenue_list_growth_projection|🎯 List Growth Projection:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.email_list_revenue.row.growth_assumption', 'Assuming ' + pct1(unsubscribeRate) + '% monthly churn and 10% monthly net growth:', { churn: pct1(unsubscribeRate) }) + '\n' +
    '• ' + makeToken('calc_out.email_list_revenue.row.net_monthly_growth', 'Net monthly growth:    ' + pct1(10 - unsubscribeRate) + '%  (10% new - ' + pct1(unsubscribeRate) + '% churn)', { growth: pct1(10 - unsubscribeRate), churn: pct1(unsubscribeRate) }) + '\n' +
    '• ' + makeToken('calc_out.email_list_revenue.row.list_in_6_months', 'List in 6 months:      ' + loc(subscriberCount * Math.pow(1 + (0.10 - unsubscribeRate / 100), 6)) + '  (compound)', { subs: loc(subscriberCount * Math.pow(1 + (0.10 - unsubscribeRate / 100), 6)) }) + '\n' +
    '• $calc_out.label.list_in_12_months|List in 12 months|:     ' + loc(subscriberCount * Math.pow(1 + (0.10 - unsubscribeRate / 100), 12)) + '\n' +
    '• ' + makeToken('calc_out.email_list_revenue.row.revenue_in_12_months', 'Revenue in 12 months:  ' + fmt0(annualRevenue * Math.pow(1 + (0.10 - unsubscribeRate / 100), 12)) + '/yr  (projected)', { revenue: fmt0(annualRevenue * Math.pow(1 + (0.10 - unsubscribeRate / 100), 12)) + '/yr' }) + '\n' +
    '• ' + makeToken('calc_out.email_list_revenue.row.net_adds_needed', 'Net adds needed:       ' + loc(subscriberCount * 0.10) + ' new subs/mo to sustain', { adds: loc(subscriberCount * 0.10) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.email_list_revenue_per_sub_break_even|⚖️ Per-Sub Value Break-Even:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.current_per_sub_yr|Current $/sub/yr|:      ' + fmt(revenuePerSubscriber) + '\n' +
    '• ' + makeToken('calc_out.email_list_revenue.row.industry_target', 'Industry target:       $1-2/sub/yr  (avg lists)') + '\n' +
    '• $calc_out.label.top_performer|Top performer|:         $5-20/sub/yr\n' +
    '• ' + (revenuePerSubscriber >= 2
      ? makeToken('calc_out.email_list_revenue.row.breakeven_above', '🟢 Above $2/sub/yr — monetizing well.')
      : revenuePerSubscriber >= 1
      ? makeToken('calc_out.email_list_revenue.row.breakeven_baseline', '🟡 At $1-2/sub/yr — meeting baseline.')
      : makeToken('calc_out.email_list_revenue.row.breakeven_below', '🔴 Below $1/sub/yr — focus on segmentation + offer quality.')) + '\n' +
    '• ' + makeToken('calc_out.email_list_revenue.row.to_hit_5k', 'To hit $5K/yr:         ' + loc(5000 / Math.max(revenuePerSubscriber, 0.01)) + ' engaged subscribers', { subs: loc(5000 / Math.max(revenuePerSubscriber, 0.01)) }) + '\n' +
    '• ' + makeToken('calc_out.email_list_revenue.row.to_hit_50k', 'To hit $50K/yr:        ' + loc(50000 / Math.max(revenuePerSubscriber, 0.01)) + ' engaged subscribers', { subs: loc(50000 / Math.max(revenuePerSubscriber, 0.01)) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.email_list_revenue_what_if_scenarios|🔄 What-If Scenarios:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.email_list_revenue.row.whatif_raise_open_rate', 'Raise open rate 2x:    Annual ' + fmt0(annualRevenue * 2) + '  (better subject lines + send time)', { annual: fmt0(annualRevenue * 2) }) + '\n' +
    '• ' + makeToken('calc_out.email_list_revenue.row.whatif_raise_click_rate', 'Raise click rate 2x:   Annual ' + fmt0(annualRevenue * 2) + '  (clearer CTAs + better content)', { annual: fmt0(annualRevenue * 2) }) + '\n' +
    '• ' + makeToken('calc_out.email_list_revenue.row.whatif_double_subscribers', '2x subscribers:        Annual ' + fmt0(annualRevenue * 2) + '  (lead magnets + list growth)', { annual: fmt0(annualRevenue * 2) }) + '\n' +
    '• ' + makeToken('calc_out.email_list_revenue.row.whatif_all_combined', 'All combined:          Annual ' + fmt0(annualRevenue * 8) + '  (max upside)', { annual: fmt0(annualRevenue * 8) }) + '\n' +
    '• ' + makeToken('calc_out.email_list_revenue.row.whatif_double_emails', 'Send 2x more emails:   Annual ' + fmt0(annualRevenue * 2) + '  (more touch points)', { annual: fmt0(annualRevenue * 2) }) + '\n\n' +
    makeToken('calc_out.email_list_revenue.row.tip_segmentation', '💡 Tip: The industry benchmark is $1-2 per subscriber per year. To beat this, segment your list by interest and past purchases, then send targeted offers. A segmented campaign can generate 760% more revenue than a broadcast to everyone.'),
  );

  const listSizes = [500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000];
  for (let i = 0; i < listSizes.length; i++) {
    const s = listSizes[i];
    const o = s * (openRate / 100);
    const c = o * (clickRate / 100);
    const conv = c * (conversionRate / 100);
    const rps = conv * avgOrderValue;
    const mr = rps * emailsPerMonth;
    const ar = mr * 12;
    results.push(
      // ⚠️ ' | ' 是维度行分隔符 ⇒ **不得进 fallback**（token 的兜底段以第一个 | 收尾）
      //   ⇒ 整行拆成 4 个 token，中间用字面量 ' | ' 连接 ⇒ 英文页逐字不变。
      makeToken('calc_out.email_list_revenue.row.comparison_list_size', loc(s) + ' subs', { size: loc(s) }) + ': ' +
      makeToken('calc_out.email_list_revenue.row.comparison_monthly', fmt(mr) + '/mo', { monthly: fmt(mr) + '/mo' }) + ' | ' +
      makeToken('calc_out.email_list_revenue.row.comparison_annual', fmt0(ar) + '/yr', { annual: fmt0(ar) + '/yr' }) + ' | ' +
      makeToken('calc_out.email_list_revenue.row.comparison_per_sub', fmt(s > 0 ? ar / s : 0) + '/sub/yr', { per_sub: fmt(s > 0 ? ar / s : 0) + '/sub/yr' }),
    );
  }

  return results;
}

const customFn =
  // P168 B3-8：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 服务端与客户端输出逐字节相同，不可能漂移；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let h=function(c){return Number.isNaN(c)?0:Math.max(0,c)},F=function(c){const _=h(parseFloat(c.subscriberCount)||0),s=h(parseFloat(c.openRate)||0),o=h(parseFloat(c.clickRate)||0),g=h(parseFloat(c.conversionRate)||0),m=h(parseFloat(c.avgOrderValue)||0),p=h(parseFloat(c.emailsPerMonth)||4),n=h(parseFloat(c.unsubscribeRate)||.5),R=[],v=_*(s/100),w=v*(o/100),y=w*(g/100),$=y*m,M=$*p,u=M*12,r=_>0?u/_:0,P=_>0?$/_:0,L=m>0&&g>0&&o>0&&s>0?1/(s/100)/(o/100)/(g/100)/m/p*12:0,l=b=>"$"+b.toFixed(2),i=b=>"$"+Math.round(b).toLocaleString(),N=b=>b.toFixed(2),t=b=>b.toFixed(1),a=b=>Math.round(b).toLocaleString();R.push(\`$calc_out.section.email_list_revenue_calculator|📧 Email List Revenue Calculator|

$calc_out.section.email_list_revenue_funnel_metrics|📊 Funnel Metrics:|
• $calc_out.label.subscribers|Subscribers|:           \`+a(_)+\`
• \`+e("calc_out.email_list_revenue.row.open_rate","Open Rate:             "+t(s)+"%  → "+a(v)+" opens",{rate:t(s),opens:a(v)})+\`
• \`+e("calc_out.email_list_revenue.row.click_rate","Click Rate:            "+t(o)+"%  → "+a(w)+" clicks",{rate:t(o),clicks:a(w)})+\`
• \`+e("calc_out.email_list_revenue.row.conversion_rate","Conversion Rate:       "+t(g)+"%  → "+y.toFixed(2)+" conversions",{rate:t(g),conversions:y.toFixed(2)})+\`
• $calc_out.label.avg_order_value|Avg Order Value|:       \`+l(m)+\`
• \`+e("calc_out.email_list_revenue.row.emails_per_month","Emails/Month:          "+p+"  (industry avg 2-8)",{emails:String(p)})+\`
• $calc_out.label.monthly_unsubscribes|Monthly Unsubscribes|:  ~\`+t(n)+"%  ("+a(_*n/100)+\`/mo)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.email_list_revenue_revenue_snapshot|💰 Revenue Snapshot:|
• $calc_out.label.revenue_per_send|Revenue Per Send|:      \`+l($)+\`
• $calc_out.label.monthly_revenue|Monthly Revenue|:       \`+i(M)+\`/mo
• $calc_out.label.annual_revenue_email|Annual Revenue|:        \`+i(u)+\`/yr
• $calc_out.label.per_subscriber_yr|Per Subscriber (yr)|:   \`+l(r)+\`/sub/yr
• $calc_out.label.per_subscriber_mo|Per Subscriber (mo)|:   $\`+(r/12).toFixed(2)+\`/sub/mo
• $calc_out.label.per_send_per_sub|Per Send Per Sub|:      $\`+P.toFixed(4)+\`
• \`+e("calc_out.email_list_revenue.row.total_annual_conversions","Total Annual Conversions: "+a(y*p*12)+" sales/yr",{conversions:a(y*p*12)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.email_list_revenue_list_economics|📐 List Economics:|
• $calc_out.label.revenue_send|Revenue/Send|:          \`+l($)+\`
• $calc_out.label.revenue_1000_opens|Revenue/1000 Opens|:    $\`+(v>0?(y*m/v*1e3).toFixed(2):"0.00")+\`
• $calc_out.label.revenue_1000_clicks|Revenue/1000 Clicks|:   $\`+(w>0?(y*m/w*1e3).toFixed(2):"0.00")+\`
• \`+e("calc_out.email_list_revenue.row.click_to_open_rate","Click-to-Open Rate:    "+t(v>0?w/v*100:0)+"%  (CTOR — industry: 10-15%)",{rate:t(v>0?w/v*100:0)})+\`
• \`+e("calc_out.email_list_revenue.row.revenue_per_email","Revenue per Email:     "+l($)+" (per send)",{revenue:l($)})+\`
• $calc_out.label.industry_benchmark_email|Industry Benchmark|:    \`+e("calc_out.email_list_revenue.row.benchmark_baseline","$1-2/sub/yr baseline")+" | "+e("calc_out.email_list_revenue.row.benchmark_top_performers","$5-20/sub/yr top performers")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.email_list_revenue_list_health|🩺 List Health:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+(s>25?e("calc_out.email_list_revenue.row.health_open_strong","🟢 Open rate "+t(s)+"% is strong (industry avg 20-25%).",{rate:t(s)}):s>=15?e("calc_out.email_list_revenue.row.health_open_average","🟡 Open rate "+t(s)+"% is on industry average.",{rate:t(s)}):s>=10?e("calc_out.email_list_revenue.row.health_open_below","🟠 Open rate "+t(s)+"% is below average — test subject lines.",{rate:t(s)}):e("calc_out.email_list_revenue.row.health_open_weak","🔴 Open rate "+t(s)+"% is weak — clean list, test sender reputation.",{rate:t(s)}))+\`
• \`+(o>=4?e("calc_out.email_list_revenue.row.health_click_healthy","🟢 Click rate "+t(o)+"% is healthy.",{rate:t(o)}):o>=2?e("calc_out.email_list_revenue.row.health_click_ok","🟡 Click rate "+t(o)+"% is OK — test better CTAs.",{rate:t(o)}):e("calc_out.email_list_revenue.row.health_click_weak","🔴 Click rate "+t(o)+"% is weak — rewrite for relevance.",{rate:t(o)}))+\`
\`+(r>=5?"• "+e("calc_out.email_list_revenue.row.monetization_strong","🟢 "+l(r)+"/sub/yr — strong monetization.",{value:l(r)})+\`
\`:r>=2?"• "+e("calc_out.email_list_revenue.row.monetization_workable","🟡 "+l(r)+"/sub/yr — workable, improvable.",{value:l(r)})+\`
\`:r>=.5?"• "+e("calc_out.email_list_revenue.row.monetization_below","🟠 "+l(r)+"/sub/yr — below benchmark.",{value:l(r)})+\`
\`:_>0?"• "+e("calc_out.email_list_revenue.row.monetization_very_low","🔴 "+l(r)+"/sub/yr — very low.",{value:l(r)})+\`
\`:"")+"• "+(n<.3?e("calc_out.email_list_revenue.row.unsub_strong","🟢 Unsub rate "+t(n)+"% — strong list retention.",{rate:t(n)}):n<1?e("calc_out.email_list_revenue.row.unsub_typical","🟡 Unsub rate "+t(n)+"% — typical.",{rate:t(n)}):e("calc_out.email_list_revenue.row.unsub_too_high","🔴 Unsub rate "+t(n)+"% — too high, prune inactive subs.",{rate:t(n)}))+\`

$calc_out.section.email_list_revenue_list_growth_projection|🎯 List Growth Projection:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+e("calc_out.email_list_revenue.row.growth_assumption","Assuming "+t(n)+"% monthly churn and 10% monthly net growth:",{churn:t(n)})+\`
• \`+e("calc_out.email_list_revenue.row.net_monthly_growth","Net monthly growth:    "+t(10-n)+"%  (10% new - "+t(n)+"% churn)",{growth:t(10-n),churn:t(n)})+\`
• \`+e("calc_out.email_list_revenue.row.list_in_6_months","List in 6 months:      "+a(_*Math.pow(1+(.1-n/100),6))+"  (compound)",{subs:a(_*Math.pow(1+(.1-n/100),6))})+\`
• $calc_out.label.list_in_12_months|List in 12 months|:     \`+a(_*Math.pow(1+(.1-n/100),12))+\`
• \`+e("calc_out.email_list_revenue.row.revenue_in_12_months","Revenue in 12 months:  "+i(u*Math.pow(1+(.1-n/100),12))+"/yr  (projected)",{revenue:i(u*Math.pow(1+(.1-n/100),12))+"/yr"})+\`
• \`+e("calc_out.email_list_revenue.row.net_adds_needed","Net adds needed:       "+a(_*.1)+" new subs/mo to sustain",{adds:a(_*.1)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.email_list_revenue_per_sub_break_even|⚖️ Per-Sub Value Break-Even:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• $calc_out.label.current_per_sub_yr|Current $/sub/yr|:      \`+l(r)+\`
• \`+e("calc_out.email_list_revenue.row.industry_target","Industry target:       $1-2/sub/yr  (avg lists)")+\`
• $calc_out.label.top_performer|Top performer|:         $5-20/sub/yr
• \`+(r>=2?e("calc_out.email_list_revenue.row.breakeven_above","🟢 Above $2/sub/yr — monetizing well."):r>=1?e("calc_out.email_list_revenue.row.breakeven_baseline","🟡 At $1-2/sub/yr — meeting baseline."):e("calc_out.email_list_revenue.row.breakeven_below","🔴 Below $1/sub/yr — focus on segmentation + offer quality."))+\`
• \`+e("calc_out.email_list_revenue.row.to_hit_5k","To hit $5K/yr:         "+a(5e3/Math.max(r,.01))+" engaged subscribers",{subs:a(5e3/Math.max(r,.01))})+\`
• \`+e("calc_out.email_list_revenue.row.to_hit_50k","To hit $50K/yr:        "+a(5e4/Math.max(r,.01))+" engaged subscribers",{subs:a(5e4/Math.max(r,.01))})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.email_list_revenue_what_if_scenarios|🔄 What-If Scenarios:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+e("calc_out.email_list_revenue.row.whatif_raise_open_rate","Raise open rate 2x:    Annual "+i(u*2)+"  (better subject lines + send time)",{annual:i(u*2)})+\`
• \`+e("calc_out.email_list_revenue.row.whatif_raise_click_rate","Raise click rate 2x:   Annual "+i(u*2)+"  (clearer CTAs + better content)",{annual:i(u*2)})+\`
• \`+e("calc_out.email_list_revenue.row.whatif_double_subscribers","2x subscribers:        Annual "+i(u*2)+"  (lead magnets + list growth)",{annual:i(u*2)})+\`
• \`+e("calc_out.email_list_revenue.row.whatif_all_combined","All combined:          Annual "+i(u*8)+"  (max upside)",{annual:i(u*8)})+\`
• \`+e("calc_out.email_list_revenue.row.whatif_double_emails","Send 2x more emails:   Annual "+i(u*2)+"  (more touch points)",{annual:i(u*2)})+\`

\`+e("calc_out.email_list_revenue.row.tip_segmentation","💡 Tip: The industry benchmark is $1-2 per subscriber per year. To beat this, segment your list by interest and past purchases, then send targeted offers. A segmented campaign can generate 760% more revenue than a broadcast to everyone."));const A=[500,1e3,2500,5e3,1e4,25e3,5e4,1e5,25e4];for(let b=0;b<A.length;b++){const d=A[b],S=d*(s/100)*(o/100)*(g/100)*m*p,f=S*12;R.push(e("calc_out.email_list_revenue.row.comparison_list_size",a(d)+" subs",{size:a(d)})+": "+e("calc_out.email_list_revenue.row.comparison_monthly",l(S)+"/mo",{monthly:l(S)+"/mo"})+" | "+e("calc_out.email_list_revenue.row.comparison_annual",i(f)+"/yr",{annual:i(f)+"/yr"})+" | "+e("calc_out.email_list_revenue.row.comparison_per_sub",l(d>0?f/d:0)+"/sub/yr",{per_sub:l(d>0?f/d:0)+"/sub/yr"}))}return R},x=function(c,_,s){var o=O(c);return Array.isArray(o)?o.join(\`
\`):String(o)};var j=h,z=F,E=x,e=tk,C='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',e=new Function("return "+C)(),O=function(c){return F(c)};return[x(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: 'solopreneur-email-list-revenue-calculator',
  title: 'Email List Revenue Calculator',
  description: 'Calculate how much revenue your email list generates per send, per month, and per year based on your funnel metrics, with growth projections and break-even sub counts.',
  inputs: [
    { name: 'subscriberCount', label: 'Number of Subscribers', placeholder: 'e.g. 10000', type: 'number' },
    { name: 'openRate', label: 'Open Rate (%)', placeholder: 'e.g. 25', type: 'number' },
    { name: 'clickRate', label: 'Click Rate (% of opens)', placeholder: 'e.g. 5', type: 'number' },
    { name: 'conversionRate', label: 'Conversion Rate (% of clicks)', placeholder: 'e.g. 2', type: 'number' },
    { name: 'avgOrderValue', label: 'Avg Order Value ($)', placeholder: 'e.g. 50', type: 'number' },
    { name: 'emailsPerMonth', label: 'Emails per Month', placeholder: 'e.g. 4', type: 'number' },
    { name: 'unsubscribeRate', label: 'Monthly Unsubscribe Rate (%)', placeholder: 'e.g. 0.5', type: 'number' },
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
    return calculateEmailRevenue(inputs);
  },
  staticExamples: [
    '$calc_out.section.email_list_revenue_calculator|📧 Email List Revenue Calculator|\n\n$calc_out.section.email_list_revenue_funnel_metrics|📊 Funnel Metrics:|\n• $calc_out.label.subscribers|Subscribers|:           10,000\n• $calc_out.email_list_revenue.row.open_rate{"rate":"25.0","opens":"2,500"}|Open Rate:             25.0%  → 2,500 opens|\n• $calc_out.email_list_revenue.row.click_rate{"rate":"5.0","clicks":"125"}|Click Rate:            5.0%  → 125 clicks|\n• $calc_out.email_list_revenue.row.conversion_rate{"rate":"2.0","conversions":"2.50"}|Conversion Rate:       2.0%  → 2.50 conversions|\n• $calc_out.label.avg_order_value|Avg Order Value|:       $50.00\n• $calc_out.email_list_revenue.row.emails_per_month{"emails":"4"}|Emails/Month:          4  (industry avg 2-8)|\n• $calc_out.label.monthly_unsubscribes|Monthly Unsubscribes|:  ~0.5%  (50/mo)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.email_list_revenue_revenue_snapshot|💰 Revenue Snapshot:|\n• $calc_out.label.revenue_per_send|Revenue Per Send|:      $125.00\n• $calc_out.label.monthly_revenue|Monthly Revenue|:       $500/mo\n• $calc_out.label.annual_revenue_email|Annual Revenue|:        $6,000/yr\n• $calc_out.label.per_subscriber_yr|Per Subscriber (yr)|:   $0.60/sub/yr\n• $calc_out.label.per_subscriber_mo|Per Subscriber (mo)|:   $0.05/sub/mo\n• $calc_out.label.per_send_per_sub|Per Send Per Sub|:      $0.0125\n• $calc_out.email_list_revenue.row.total_annual_conversions{"conversions":"120"}|Total Annual Conversions: 120 sales/yr|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.email_list_revenue_list_economics|📐 List Economics:|\n• $calc_out.label.revenue_send|Revenue/Send|:          $125.00\n• $calc_out.label.revenue_1000_opens|Revenue/1000 Opens|:    $50.00\n• $calc_out.label.revenue_1000_clicks|Revenue/1000 Clicks|:   $1000.00\n• $calc_out.email_list_revenue.row.click_to_open_rate{"rate":"5.0"}|Click-to-Open Rate:    5.0%  (CTOR — industry: 10-15%)|\n• $calc_out.email_list_revenue.row.revenue_per_email{"revenue":"$125.00"}|Revenue per Email:     $125.00 (per send)|\n• $calc_out.label.industry_benchmark_email|Industry Benchmark|:    $calc_out.email_list_revenue.row.benchmark_baseline|$1-2/sub/yr baseline| | $calc_out.email_list_revenue.row.benchmark_top_performers|$5-20/sub/yr top performers|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.email_list_revenue_list_health|🩺 List Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.email_list_revenue.row.health_open_average{"rate":"25.0"}|🟡 Open rate 25.0% is on industry average.|\n• $calc_out.email_list_revenue.row.health_click_healthy{"rate":"5.0"}|🟢 Click rate 5.0% is healthy.|\n• $calc_out.email_list_revenue.row.monetization_below{"value":"$0.60"}|🟠 $0.60/sub/yr — below benchmark.|\n• $calc_out.email_list_revenue.row.unsub_typical{"rate":"0.5"}|🟡 Unsub rate 0.5% — typical.|\n\n$calc_out.section.email_list_revenue_list_growth_projection|🎯 List Growth Projection:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.email_list_revenue.row.growth_assumption{"churn":"0.5"}|Assuming 0.5% monthly churn and 10% monthly net growth:|\n• $calc_out.email_list_revenue.row.net_monthly_growth{"growth":"9.5","churn":"0.5"}|Net monthly growth:    9.5%  (10% new - 0.5% churn)|\n• $calc_out.email_list_revenue.row.list_in_6_months{"subs":"17,238"}|List in 6 months:      17,238  (compound)|\n• $calc_out.label.list_in_12_months|List in 12 months|:     29,715\n• $calc_out.email_list_revenue.row.revenue_in_12_months{"revenue":"$17,829/yr"}|Revenue in 12 months:  $17,829/yr  (projected)|\n• $calc_out.email_list_revenue.row.net_adds_needed{"adds":"1,000"}|Net adds needed:       1,000 new subs/mo to sustain|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.email_list_revenue_per_sub_break_even|⚖️ Per-Sub Value Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.current_per_sub_yr|Current $/sub/yr|:      $0.60\n• $calc_out.email_list_revenue.row.industry_target|Industry target:       $1-2/sub/yr  (avg lists)|\n• $calc_out.label.top_performer|Top performer|:         $5-20/sub/yr\n• $calc_out.email_list_revenue.row.breakeven_below|🔴 Below $1/sub/yr — focus on segmentation + offer quality.|\n• $calc_out.email_list_revenue.row.to_hit_5k{"subs":"8,333"}|To hit $5K/yr:         8,333 engaged subscribers|\n• $calc_out.email_list_revenue.row.to_hit_50k{"subs":"83,333"}|To hit $50K/yr:        83,333 engaged subscribers|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.email_list_revenue_what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.email_list_revenue.row.whatif_raise_open_rate{"annual":"$12,000"}|Raise open rate 2x:    Annual $12,000  (better subject lines + send time)|\n• $calc_out.email_list_revenue.row.whatif_raise_click_rate{"annual":"$12,000"}|Raise click rate 2x:   Annual $12,000  (clearer CTAs + better content)|\n• $calc_out.email_list_revenue.row.whatif_double_subscribers{"annual":"$12,000"}|2x subscribers:        Annual $12,000  (lead magnets + list growth)|\n• $calc_out.email_list_revenue.row.whatif_all_combined{"annual":"$48,000"}|All combined:          Annual $48,000  (max upside)|\n• $calc_out.email_list_revenue.row.whatif_double_emails{"annual":"$12,000"}|Send 2x more emails:   Annual $12,000  (more touch points)|\n\n$calc_out.email_list_revenue.row.tip_segmentation|💡 Tip: The industry benchmark is $1-2 per subscriber per year. To beat this, segment your list by interest and past purchases, then send targeted offers. A segmented campaign can generate 760% more revenue than a broadcast to everyone.|\n$calc_out.email_list_revenue.row.comparison_list_size{"size":"500"}|500 subs|: $calc_out.email_list_revenue.row.comparison_monthly{"monthly":"$25.00/mo"}|$25.00/mo| | $calc_out.email_list_revenue.row.comparison_annual{"annual":"$300/yr"}|$300/yr| | $calc_out.email_list_revenue.row.comparison_per_sub{"per_sub":"$0.60/sub/yr"}|$0.60/sub/yr|\n$calc_out.email_list_revenue.row.comparison_list_size{"size":"1,000"}|1,000 subs|: $calc_out.email_list_revenue.row.comparison_monthly{"monthly":"$50.00/mo"}|$50.00/mo| | $calc_out.email_list_revenue.row.comparison_annual{"annual":"$600/yr"}|$600/yr| | $calc_out.email_list_revenue.row.comparison_per_sub{"per_sub":"$0.60/sub/yr"}|$0.60/sub/yr|\n$calc_out.email_list_revenue.row.comparison_list_size{"size":"2,500"}|2,500 subs|: $calc_out.email_list_revenue.row.comparison_monthly{"monthly":"$125.00/mo"}|$125.00/mo| | $calc_out.email_list_revenue.row.comparison_annual{"annual":"$1,500/yr"}|$1,500/yr| | $calc_out.email_list_revenue.row.comparison_per_sub{"per_sub":"$0.60/sub/yr"}|$0.60/sub/yr|\n$calc_out.email_list_revenue.row.comparison_list_size{"size":"5,000"}|5,000 subs|: $calc_out.email_list_revenue.row.comparison_monthly{"monthly":"$250.00/mo"}|$250.00/mo| | $calc_out.email_list_revenue.row.comparison_annual{"annual":"$3,000/yr"}|$3,000/yr| | $calc_out.email_list_revenue.row.comparison_per_sub{"per_sub":"$0.60/sub/yr"}|$0.60/sub/yr|\n$calc_out.email_list_revenue.row.comparison_list_size{"size":"10,000"}|10,000 subs|: $calc_out.email_list_revenue.row.comparison_monthly{"monthly":"$500.00/mo"}|$500.00/mo| | $calc_out.email_list_revenue.row.comparison_annual{"annual":"$6,000/yr"}|$6,000/yr| | $calc_out.email_list_revenue.row.comparison_per_sub{"per_sub":"$0.60/sub/yr"}|$0.60/sub/yr|\n$calc_out.email_list_revenue.row.comparison_list_size{"size":"25,000"}|25,000 subs|: $calc_out.email_list_revenue.row.comparison_monthly{"monthly":"$1250.00/mo"}|$1250.00/mo| | $calc_out.email_list_revenue.row.comparison_annual{"annual":"$15,000/yr"}|$15,000/yr| | $calc_out.email_list_revenue.row.comparison_per_sub{"per_sub":"$0.60/sub/yr"}|$0.60/sub/yr|\n$calc_out.email_list_revenue.row.comparison_list_size{"size":"50,000"}|50,000 subs|: $calc_out.email_list_revenue.row.comparison_monthly{"monthly":"$2500.00/mo"}|$2500.00/mo| | $calc_out.email_list_revenue.row.comparison_annual{"annual":"$30,000/yr"}|$30,000/yr| | $calc_out.email_list_revenue.row.comparison_per_sub{"per_sub":"$0.60/sub/yr"}|$0.60/sub/yr|\n$calc_out.email_list_revenue.row.comparison_list_size{"size":"100,000"}|100,000 subs|: $calc_out.email_list_revenue.row.comparison_monthly{"monthly":"$5000.00/mo"}|$5000.00/mo| | $calc_out.email_list_revenue.row.comparison_annual{"annual":"$60,000/yr"}|$60,000/yr| | $calc_out.email_list_revenue.row.comparison_per_sub{"per_sub":"$0.60/sub/yr"}|$0.60/sub/yr|\n$calc_out.email_list_revenue.row.comparison_list_size{"size":"250,000"}|250,000 subs|: $calc_out.email_list_revenue.row.comparison_monthly{"monthly":"$12500.00/mo"}|$12500.00/mo| | $calc_out.email_list_revenue.row.comparison_annual{"annual":"$150,000/yr"}|$150,000/yr| | $calc_out.email_list_revenue.row.comparison_per_sub{"per_sub":"$0.60/sub/yr"}|$0.60/sub/yr|',
    '500 subs: $25.00/mo | $300/yr | $0.60/sub/yr',
    '5,000 subs: $250.00/mo | $3,000/yr | $0.60/sub/yr',
    '10,000 subs: $500.00/mo | $6,000/yr | $0.60/sub/yr',
    '100,000 subs: $5,000.00/mo | $60,000/yr | $0.60/sub/yr',
  ],
  faq: [
    { q: 'What is a good open rate for marketing emails?', a: '20-30% is the industry average across all sectors. Niche audiences and highly engaged lists can reach 30-45%. If you are below 15%, clean your list of inactive subscribers (who have not opened in 90+ days) and improve subject lines. A smaller engaged list outperforms a large disengaged one.' },
    { q: 'How often should I email my list?', a: '1-4 times per week is the sweet spot for most creators. Daily emails work for high-value niches like trading or breaking news but risk higher unsubscribes. Weekly is the minimum to stay top-of-mind. Test frequency by monitoring open rates and unsubscribe rates — if opens drop, send less frequently.' },
    { q: 'What affects click rate the most?', a: 'Relevance and placement. Emails with one clear CTA outperform those with multiple links. Personalize based on past behavior. Plain-text emails often get higher click rates than heavily designed templates because they feel more personal. The first link in an email typically gets 40-60% of all clicks.' },
    { q: 'How do I calculate revenue per subscriber?', a: 'Total annual email revenue divided by total subscribers. The benchmark is $1-$2/subscriber/year for most industries. Top performers reach $5-$20+. This is your single most important email KPI — it captures the health of your entire email monetization funnel.' },
    { q: 'What is the biggest mistake email marketers make?', a: 'Sending the same offer to everyone. Segmenting your list by purchase history, engagement level, and expressed interests can increase email revenue 3-10x. A new subscriber should receive a different sequence than someone who has purchased 3 times. Use tagging and automation to deliver the right offer to the right person at the right time.' },
    { q: "How much can you earn from a 10K email list?", a: "Benchmarks: 10K list × 25% open rate × 2% CTR × 1% conversion × $100 AOV = $50 per send. Monthly newsletter (4 sends): $200/month. Promotional (2 product emails): $500-1000/month. With automation (welcome, abandoned cart, browse): $2000-5000/month. Top creators: $10K-50K/month from a 10K list." },
    { q: "How do I monetize an email list?", a: "Top 5 strategies: 1) Affiliate products (3-5% conversion, $20-100 AOV), 2) Own product sales (5-15% conversion, $100-1000 AOV), 3) Sponsored emails ($5-15 per subscriber per send), 4) Premium subscriptions ($5-30/month, 5-15% conversion), 5) Lead generation for services. Diversify: 60% products, 30% affiliate, 10% sponsors." },
    { q: "What is a good email open rate in 2026?", a: "Benchmarks: 25-30% is good, 35%+ is excellent. Apple MPP (2021) cut open rates 15-20%. Industry average: 25%. List hygiene matters: clean inactive subscribers quarterly. Subject lines: 6-8 words, personalize, curiosity-driven. Send time: Tuesday-Thursday, 10am-2pm recipient time zone." },
    { q: "How do I grow my email list quickly?", a: "Top lead magnets: 1) Free tools/calculators (high conversion 5-20%), 2) Comprehensive guides (PDF, 2000+ words), 3) Templates (cheat sheets, swipe files), 4) Mini-courses (5-7 day email course), 5) Discounts/coaching samples. Promote: blog posts, social media, podcast guesting, partnerships. Growth rate: 100-1000 subscribers/month is realistic." },
    { q: "What is the value of an email subscriber?", a: "Average: $1-3 per subscriber per year for content creators. Top performers: $5-20 per subscriber. Factors: niche, engagement, monetization mix. To calculate: sum revenue / list size. Aim for $1+ per subscriber per year. B2B lists: $5-50 per subscriber. E-commerce: $2-10 per subscriber." },
    { q: "How do I avoid spam filters?", a: "Tactics: 1) Use double opt-in (reduces spam complaints 50%+), 2) Authenticate SPF/DKIM/DMARC, 3) Avoid spam words in subject lines (\"FREE\", \"URGENT\", \"$$$\"), 4) Maintain <0.1% spam complaint rate, 5) Clean inactive subscribers quarterly (no opens in 6 months), 6) Consistent sending volume (don't go from 1/month to 1/day)." },
    { q: "What is the best email marketing platform?", a: "For beginners: Mailchimp (free tier), ConvertKit (creators). For growing: ActiveCampaign (automation), Klaviyo (e-commerce). For advanced: Customer.io (custom), Iterable (enterprise). Pricing: free-$99/month for most creators. Pick based on: automation needs, list size, integration with your store/CMS." },
    { q: "How often should I send emails?", a: "Best for engagement: 1-2 emails/week. Daily works for: news, deals, daily tips. Weekly works for: newsletters, content creators. Twice monthly: launches only. Quality > quantity. Test frequency: track unsubscribe rate vs engagement. The right frequency fills the inbox without overwhelming." },
  ],
  howToUse: [
    'Enter your current email subscriber count.',
    'Enter your typical open rate (industry average is 20-30%).',
    'Enter your click rate as a percentage of opens (typical is 2-5%).',
    'Enter your conversion rate from clicks to purchases (typical is 1-3%).',
    'Enter the average value of an order from your emails.',
    'Enter emails per month and your typical monthly unsubscribe rate.',
    'Review per-sub value, break-even sub counts, and growth projections.',
    'Scroll down to see revenue projections across 9 different list sizes.',
  ],
  engineKey: true,
};

registerEngine(engine);

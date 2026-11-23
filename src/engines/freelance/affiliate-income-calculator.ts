import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-14：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

function calculateAffiliateIncome(inputs: Record<string, string>): string[] {
  const monthlyTraffic = clampNonNegative(parseFloat(inputs.monthlyTraffic) || 0);
  const conversionRate = clampNonNegative(parseFloat(inputs.conversionRate) || 0);
  const avgCommission = clampNonNegative(parseFloat(inputs.avgCommission) || 0);
  const monthlyCost = clampNonNegative(parseFloat(inputs.monthlyCost) || 0);
  const results: string[] = [];

  const monthlyConversions = monthlyTraffic * (conversionRate / 100);
  const monthlyIncome = monthlyConversions * avgCommission;
  const annualIncome = monthlyIncome * 12;
  const incomePerThousand = monthlyTraffic > 0 ? (monthlyIncome / monthlyTraffic) * 1000 : 0;
  const earningsPerVisitor = monthlyTraffic > 0 ? monthlyIncome / monthlyTraffic : 0;
  const netMonthly = monthlyIncome - monthlyCost;
  const breakEvenTraffic = earningsPerVisitor > 0 ? monthlyCost / earningsPerVisitor : 0;

  const fmt = (n: number) => '$' + n.toFixed(2);
  const fmt0 = (n: number) => '$' + Math.round(n).toLocaleString();
  const pct2 = (n: number) => n.toFixed(2);
  const pct1 = (n: number) => n.toFixed(1);
  const loc = (n: number) => n.toLocaleString();

  const trafficLevels = [
    { label: '1K visitors/mo', val: 1000 },
    { label: '10K visitors/mo', val: 10000 },
    { label: '100K visitors/mo', val: 100000 },
    { label: '500K visitors/mo', val: 500000 },
    { label: '1M visitors/mo', val: 1000000 },
  ];

  // P168 B3-14：params 的表达式与兜底里的表达式必须**同源** ⇒ 先用局部变量承接
  const trafficLabel = loc(monthlyTraffic);
  const conversionsLabel = loc(Math.round(monthlyConversions));
  const costLabel = fmt0(monthlyCost);
  const per1kLabel = fmt(incomePerThousand);
  const epvLabel = '$' + earningsPerVisitor.toFixed(4);
  const netLabel = fmt0(netMonthly);
  const netMarginLabel = pct1(monthlyIncome > 0 ? (netMonthly / monthlyIncome) * 100 : 0);
  const rpcLabel = monthlyConversions > 0 ? fmt(monthlyIncome / monthlyConversions) : '$0';
  const ctrLabel = pct2(conversionRate);
  const commissionLabel = fmt(avgCommission);
  const breakEvenLabel = loc(Math.ceil(breakEvenTraffic));
  const needMoreLabel = loc(Math.ceil(breakEvenTraffic - monthlyTraffic));
  const raiseCtrLabel = fmt0(monthlyIncome * 1.5);
  const doubleTrafficLabel = fmt0(monthlyIncome * 2);
  const combinedLabel = fmt0(monthlyIncome * 4.5);
  const cutCostsLabel = fmt0(netMonthly + monthlyCost * 0.5);
  const tipImpactLabel = fmt0(50000 * 0.01 * avgCommission);
  const net5kLabel = loc(Math.ceil((5000 + monthlyCost) / Math.max(earningsPerVisitor, 0.0001)));
  const net10kLabel = loc(Math.ceil((10000 + monthlyCost) / Math.max(earningsPerVisitor, 0.0001)));

  results.push(
    makeToken('calc_out.section.affiliate_income_calculator', '🔗 Affiliate Income Calculator') + '\n\n' +
    makeToken('calc_out.section.affiliate_income_traffic', '📊 Your Traffic & Conversions:') + '\n' +
    makeToken('calc_out.affiliate_income.row.monthly_traffic', '• Monthly Traffic:       ' + trafficLabel + ' visitors', { traffic: trafficLabel }) + '\n' +
    '• Conversion Rate:       ' + pct2(conversionRate) + '%\n' +
    '• Avg Commission:        ' + fmt(avgCommission) + '\n' +
    makeToken('calc_out.affiliate_income.row.monthly_conversions', '• Monthly Conversions:   ' + conversionsLabel + ' sales', { sales: conversionsLabel }) + '\n' +
    makeToken('calc_out.affiliate_income.row.monthly_cost', '• Monthly Cost:          ' + costLabel + '  (hosting, tools, content)', { cost: costLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.affiliate_income_revenue_snapshot', '💰 Revenue Snapshot:') + '\n' +
    '• Monthly Income:        ' + fmt0(monthlyIncome) + '/mo\n' +
    '• Annual Income:         ' + fmt0(annualIncome) + '/yr\n' +
    makeToken('calc_out.affiliate_income.row.per_1k_visitors', '• Per 1K Visitors:       ' + per1kLabel + '/1K  (EPC — earnings per click-adjacent)', { value: per1kLabel }) + '\n' +
    makeToken('calc_out.affiliate_income.row.earnings_per_visitor', '• Earnings Per Visitor:  ' + epvLabel, { value: epvLabel }) + '\n' +
    makeToken('calc_out.affiliate_income.row.net_after_costs', '• Net (after costs):     ' + netLabel + '/mo  (margin ' + netMarginLabel + '%)', { value: netLabel, margin: netMarginLabel }) + '\n' +
    '• Annual Net:            ' + fmt0(netMonthly * 12) + '/yr\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.affiliate_income_funnel', '📐 CTR/EPC Funnel:') + '\n' +
    '• Traffic Impressions:   ' + loc(monthlyTraffic) + '\n' +
    '• Conversions:           ' + loc(Math.round(monthlyConversions)) + '  (rate ' + pct2(conversionRate) + '%)\n' +
    makeToken('calc_out.affiliate_income.row.revenue_per_click', '• Revenue per Click:     ' + rpcLabel + '  (avg commission)', { value: rpcLabel }) + '\n' +
    makeToken('calc_out.affiliate_income.row.revenue_per_visitor', '• Revenue per Visitor:   ' + epvLabel + '  (key efficiency metric)', { value: epvLabel }) + '\n' +
    '• Annualized Visitors:   ' + loc(monthlyTraffic * 12) + '/yr\n' +
    makeToken('calc_out.affiliate_income.row.benchmark_ctr', '• Industry Benchmark:    CTR 1-3%') +
    ' | ' +
    makeToken('calc_out.affiliate_income.row.benchmark_epc', 'EPC $0.10-1.00') +
    ' | ' +
    makeToken('calc_out.affiliate_income.row.benchmark_sites', 'Aff. sites $20-50/1K visitors') +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.affiliate_income_health', '🩺 Funnel Health:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (conversionRate > 3
      ? makeToken('calc_out.affiliate_income.row.health_ctr_strong', '• 🟢 CTR ' + ctrLabel + '% is strong (industry avg 1-3%).', { ctr: ctrLabel }) + '\n'
      : conversionRate >= 1
      ? makeToken('calc_out.affiliate_income.row.health_ctr_average', '• 🟡 CTR ' + ctrLabel + '% is on industry average.', { ctr: ctrLabel }) + '\n'
      : conversionRate >= 0.5
      ? makeToken('calc_out.affiliate_income.row.health_ctr_below', '• 🟠 CTR ' + ctrLabel + '% is below average — improve targeting.', { ctr: ctrLabel }) + '\n'
      : makeToken('calc_out.affiliate_income.row.health_ctr_weak', '• 🔴 CTR ' + ctrLabel + '% is weak — review offer-market fit.', { ctr: ctrLabel }) + '\n') +
    (incomePerThousand >= 50
      ? makeToken('calc_out.affiliate_income.row.health_epc_top', '• 🟢 EPC ' + per1kLabel + '/1K — top-quartile affiliate performance.', { value: per1kLabel }) + '\n'
      : incomePerThousand >= 20
      ? makeToken('calc_out.affiliate_income.row.health_epc_solid', '• 🟡 EPC ' + per1kLabel + '/1K — solid performance.', { value: per1kLabel }) + '\n'
      : incomePerThousand >= 5
      ? makeToken('calc_out.affiliate_income.row.health_epc_below', '• 🟠 EPC ' + per1kLabel + '/1K — below average; optimize offers.', { value: per1kLabel }) + '\n'
      : monthlyTraffic > 0
      ? makeToken('calc_out.affiliate_income.row.health_epc_very_low', '• 🔴 EPC ' + per1kLabel + '/1K — very low; rethink affiliate programs.', { value: per1kLabel }) + '\n'
      : '') +
    (monthlyIncome > 0 && netMonthly > 0
      ? makeToken('calc_out.affiliate_income.row.health_net_margin', '• 🟢 Net margin ' + netMarginLabel + '% after costs.', { margin: netMarginLabel }) + '\n'
      : monthlyCost > 0 && netMonthly <= 0
      ? makeToken('calc_out.affiliate_income.row.health_costs_exceed', '• 🔴 Costs exceed revenue — unprofitable. Cut costs or grow traffic.') + '\n'
      : '') +
    '\n' +
    makeToken('calc_out.section.affiliate_income_scale_projection', '🎯 Scale Projection:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.affiliate_income.row.scale_assumption', 'Assuming ' + ctrLabel + '% CTR and ' + commissionLabel + ' commission:', { ctr: ctrLabel, commission: commissionLabel }) + '\n' +
    (() => {
      let out = '';
      for (const tl of trafficLevels) {
        const mc = tl.val * (conversionRate / 100);
        const mi = mc * avgCommission;
        out += '• ' + tl.label + ':  ' + fmt0(mi) + '/mo  (' + fmt0(mi * 12) + '/yr)\n';
      }
      return out;
    })() +
    '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.affiliate_income_break_even', '⚖️ Break-Even Traffic:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Costs/Month:           ' + fmt0(monthlyCost) + '\n' +
    '• Earnings/Visitor:      ' + '$' + earningsPerVisitor.toFixed(4) + '\n' +
    makeToken('calc_out.affiliate_income.row.break_even_traffic', '• Break-Even Traffic:    ' + breakEvenLabel + ' visitors/mo', { traffic: breakEvenLabel }) + '\n' +
    (monthlyTraffic >= breakEvenTraffic
      ? makeToken('calc_out.affiliate_income.row.break_even_covered', '• 🟢 Current traffic (' + trafficLabel + ') covers costs.', { traffic: trafficLabel }) + '\n'
      : makeToken('calc_out.affiliate_income.row.break_even_need', '• 🔴 Need ' + needMoreLabel + ' more visitors to break even.', { traffic: needMoreLabel }) + '\n') +
    '• To Net $5K/mo:         ' + net5kLabel + ' visitors/mo\n' +
    '• To Net $10K/mo:        ' + net10kLabel + ' visitors/mo\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.what_if_scenarios', '🔄 What-If Scenarios:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.affiliate_income.row.whatif_raise_ctr', '• Raise CTR 50%:  ' + raiseCtrLabel + '/mo  (better targeting + landing page)', { value: raiseCtrLabel }) + '\n' +
    makeToken('calc_out.affiliate_income.row.whatif_higher_commission', '• Higher commission (+50%):  ' + raiseCtrLabel + '/mo  (recurring SaaS programs)', { value: raiseCtrLabel }) + '\n' +
    makeToken('calc_out.affiliate_income.row.whatif_double_traffic', '• 2x traffic:  ' + doubleTrafficLabel + '/mo  (SEO + paid ads)', { value: doubleTrafficLabel }) + '\n' +
    makeToken('calc_out.affiliate_income.row.whatif_all_combined', '• All three combined:  ' + combinedLabel + '/mo  (max upside)', { value: combinedLabel }) + '\n' +
    makeToken('calc_out.affiliate_income.row.whatif_cut_costs', '• Cut costs 50%:  Net ' + cutCostsLabel + '/mo  (drop expensive tools)', { value: cutCostsLabel }) + '\n\n' +
    makeToken('calc_out.affiliate_income.row.tip_conversion_leverage', '💡 Tip: Conversion rate is the highest-leverage metric. A 1% CTR improvement at 50K visitors adds ' + tipImpactLabel + '/mo with no extra traffic cost. Focus on review quality, comparison tables, and clear CTAs before scaling traffic.', { value: tipImpactLabel }),
  );

  const tlArr = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
  for (let i = 0; i < tlArr.length; i++) {
    const t = tlArr[i];
    const mc = t * (conversionRate / 100);
    const mi = mc * avgCommission;
    const ai = mi * 12;
    results.push(
      loc(t) + ' visitors/mo: ' + fmt(mi) + '/mo | ' + fmt0(ai) + '/yr | ' + loc(Math.round(mc)) + ' sales',
    );
  }

  return results;
}

const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let v=function(a){return Number.isNaN(a)?0:Math.max(0,a)},K=function(a){const e=v(parseFloat(a.monthlyTraffic)||0),r=v(parseFloat(a.conversionRate)||0),s=v(parseFloat(a.avgCommission)||0),_=v(parseFloat(a.monthlyCost)||0),M=[],h=e*(r/100),n=h*s,J=n*12,w=e>0?n/e*1e3:0,u=e>0?n/e:0,m=n-_,F=u>0?_/u:0,p=o=>"$"+o.toFixed(2),i=o=>"$"+Math.round(o).toLocaleString(),E=o=>o.toFixed(2),W=o=>o.toFixed(1),c=o=>o.toLocaleString(),Y=[{label:"1K visitors/mo",val:1e3},{label:"10K visitors/mo",val:1e4},{label:"100K visitors/mo",val:1e5},{label:"500K visitors/mo",val:5e5},{label:"1M visitors/mo",val:1e6}],C=c(e),A=c(Math.round(h)),N=i(_),l=p(w),d="$"+u.toFixed(4),P=i(m),y=W(n>0?m/n*100:0),S=h>0?p(n/h):"$0",f=E(r),$=p(s),I=c(Math.ceil(F)),j=c(Math.ceil(F-e)),L=i(n*1.5),q=i(n*2),V=i(n*4.5),O=i(m+_*.5),B=i(5e4*.01*s),G=c(Math.ceil((5e3+_)/Math.max(u,1e-4))),Q=c(Math.ceil((1e4+_)/Math.max(u,1e-4)));M.push(t("calc_out.section.affiliate_income_calculator","🔗 Affiliate Income Calculator")+\`

\`+t("calc_out.section.affiliate_income_traffic","📊 Your Traffic & Conversions:")+\`
\`+t("calc_out.affiliate_income.row.monthly_traffic","• Monthly Traffic:       "+C+" visitors",{traffic:C})+\`
• Conversion Rate:       \`+E(r)+\`%
• Avg Commission:        \`+p(s)+\`
\`+t("calc_out.affiliate_income.row.monthly_conversions","• Monthly Conversions:   "+A+" sales",{sales:A})+\`
\`+t("calc_out.affiliate_income.row.monthly_cost","• Monthly Cost:          "+N+"  (hosting, tools, content)",{cost:N})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.affiliate_income_revenue_snapshot","💰 Revenue Snapshot:")+\`
• Monthly Income:        \`+i(n)+\`/mo
• Annual Income:         \`+i(J)+\`/yr
\`+t("calc_out.affiliate_income.row.per_1k_visitors","• Per 1K Visitors:       "+l+"/1K  (EPC — earnings per click-adjacent)",{value:l})+\`
\`+t("calc_out.affiliate_income.row.earnings_per_visitor","• Earnings Per Visitor:  "+d,{value:d})+\`
\`+t("calc_out.affiliate_income.row.net_after_costs","• Net (after costs):     "+P+"/mo  (margin "+y+"%)",{value:P,margin:y})+\`
• Annual Net:            \`+i(m*12)+\`/yr

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.affiliate_income_funnel","📐 CTR/EPC Funnel:")+\`
• Traffic Impressions:   \`+c(e)+\`
• Conversions:           \`+c(Math.round(h))+"  (rate "+E(r)+\`%)
\`+t("calc_out.affiliate_income.row.revenue_per_click","• Revenue per Click:     "+S+"  (avg commission)",{value:S})+\`
\`+t("calc_out.affiliate_income.row.revenue_per_visitor","• Revenue per Visitor:   "+d+"  (key efficiency metric)",{value:d})+\`
• Annualized Visitors:   \`+c(e*12)+\`/yr
\`+t("calc_out.affiliate_income.row.benchmark_ctr","• Industry Benchmark:    CTR 1-3%")+" | "+t("calc_out.affiliate_income.row.benchmark_epc","EPC $0.10-1.00")+" | "+t("calc_out.affiliate_income.row.benchmark_sites","Aff. sites $20-50/1K visitors")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.affiliate_income_health","🩺 Funnel Health:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(r>3?t("calc_out.affiliate_income.row.health_ctr_strong","• 🟢 CTR "+f+"% is strong (industry avg 1-3%).",{ctr:f})+\`
\`:r>=1?t("calc_out.affiliate_income.row.health_ctr_average","• 🟡 CTR "+f+"% is on industry average.",{ctr:f})+\`
\`:r>=.5?t("calc_out.affiliate_income.row.health_ctr_below","• 🟠 CTR "+f+"% is below average — improve targeting.",{ctr:f})+\`
\`:t("calc_out.affiliate_income.row.health_ctr_weak","• 🔴 CTR "+f+"% is weak — review offer-market fit.",{ctr:f})+\`
\`)+(w>=50?t("calc_out.affiliate_income.row.health_epc_top","• 🟢 EPC "+l+"/1K — top-quartile affiliate performance.",{value:l})+\`
\`:w>=20?t("calc_out.affiliate_income.row.health_epc_solid","• 🟡 EPC "+l+"/1K — solid performance.",{value:l})+\`
\`:w>=5?t("calc_out.affiliate_income.row.health_epc_below","• 🟠 EPC "+l+"/1K — below average; optimize offers.",{value:l})+\`
\`:e>0?t("calc_out.affiliate_income.row.health_epc_very_low","• 🔴 EPC "+l+"/1K — very low; rethink affiliate programs.",{value:l})+\`
\`:"")+(n>0&&m>0?t("calc_out.affiliate_income.row.health_net_margin","• 🟢 Net margin "+y+"% after costs.",{margin:y})+\`
\`:_>0&&m<=0?t("calc_out.affiliate_income.row.health_costs_exceed","• 🔴 Costs exceed revenue — unprofitable. Cut costs or grow traffic.")+\`
\`:"")+\`
\`+t("calc_out.section.affiliate_income_scale_projection","🎯 Scale Projection:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.affiliate_income.row.scale_assumption","Assuming "+f+"% CTR and "+$+" commission:",{ctr:f,commission:$})+\`
\`+(()=>{let o="";for(const b of Y){const g=b.val*(r/100)*s;o+="• "+b.label+":  "+i(g)+"/mo  ("+i(g*12)+\`/yr)
\`}return o})()+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.affiliate_income_break_even","⚖️ Break-Even Traffic:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Costs/Month:           \`+i(_)+\`
• Earnings/Visitor:      $\`+u.toFixed(4)+\`
\`+t("calc_out.affiliate_income.row.break_even_traffic","• Break-Even Traffic:    "+I+" visitors/mo",{traffic:I})+\`
\`+(e>=F?t("calc_out.affiliate_income.row.break_even_covered","• 🟢 Current traffic ("+C+") covers costs.",{traffic:C})+\`
\`:t("calc_out.affiliate_income.row.break_even_need","• 🔴 Need "+j+" more visitors to break even.",{traffic:j})+\`
\`)+"• To Net $5K/mo:         "+G+\` visitors/mo
• To Net $10K/mo:        \`+Q+\` visitors/mo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.what_if_scenarios","🔄 What-If Scenarios:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.affiliate_income.row.whatif_raise_ctr","• Raise CTR 50%:  "+L+"/mo  (better targeting + landing page)",{value:L})+\`
\`+t("calc_out.affiliate_income.row.whatif_higher_commission","• Higher commission (+50%):  "+L+"/mo  (recurring SaaS programs)",{value:L})+\`
\`+t("calc_out.affiliate_income.row.whatif_double_traffic","• 2x traffic:  "+q+"/mo  (SEO + paid ads)",{value:q})+\`
\`+t("calc_out.affiliate_income.row.whatif_all_combined","• All three combined:  "+V+"/mo  (max upside)",{value:V})+\`
\`+t("calc_out.affiliate_income.row.whatif_cut_costs","• Cut costs 50%:  Net "+O+"/mo  (drop expensive tools)",{value:O})+\`

\`+t("calc_out.affiliate_income.row.tip_conversion_leverage","💡 Tip: Conversion rate is the highest-leverage metric. A 1% CTR improvement at 50K visitors adds "+B+"/mo with no extra traffic cost. Focus on review quality, comparison tables, and clear CTAs before scaling traffic.",{value:B}));const z=[1e3,5e3,1e4,25e3,5e4,1e5,25e4,5e5,1e6];for(let o=0;o<z.length;o++){const b=z[o],R=b*(r/100),g=R*s,U=g*12;M.push(c(b)+" visitors/mo: "+p(g)+"/mo | "+i(U)+"/yr | "+c(Math.round(R))+" sales")}return M},x=function(a,e,r){var s=D(a);return Array.isArray(s)?s.join(\`
\`):String(s)};var X=v,Z=K,T=x,t=tk,H='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',t=new Function("return "+H)(),D=function(a){return K(a)};return[x(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: 'solopreneur-affiliate-income-calculator',
  title: 'Affiliate Income Calculator',
  description: 'Estimate your monthly and annual affiliate income based on traffic, conversion rate, and average commission. Includes CTR/EPC funnel, break-even traffic, and scale projections.',
  inputs: [
    { name: 'monthlyTraffic', label: 'Monthly Traffic (visitors)', placeholder: 'e.g. 50000', type: 'number' },
    { name: 'conversionRate', label: 'Conversion Rate (%)', placeholder: 'e.g. 2', type: 'number' },
    { name: 'avgCommission', label: 'Average Commission ($)', placeholder: 'e.g. 50', type: 'number' },
    { name: 'monthlyCost', label: 'Monthly Costs ($)', placeholder: 'e.g. 200', type: 'number' },
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
    return calculateAffiliateIncome(inputs);
  },
  staticExamples: [
    '$calc_out.section.affiliate_income_calculator|🔗 Affiliate Income Calculator|\n\n$calc_out.section.affiliate_income_traffic|📊 Your Traffic & Conversions:|\n$calc_out.affiliate_income.row.monthly_traffic{"traffic":"50,000"}|• Monthly Traffic:       50,000 visitors|\n• Conversion Rate:       2.00%\n• Avg Commission:        $50.00\n$calc_out.affiliate_income.row.monthly_conversions{"sales":"1,000"}|• Monthly Conversions:   1,000 sales|\n$calc_out.affiliate_income.row.monthly_cost{"cost":"$200"}|• Monthly Cost:          $200  (hosting, tools, content)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.affiliate_income_revenue_snapshot|💰 Revenue Snapshot:|\n• Monthly Income:        $50,000/mo\n• Annual Income:         $600,000/yr\n$calc_out.affiliate_income.row.per_1k_visitors{"value":"$1000.00"}|• Per 1K Visitors:       $1000.00/1K  (EPC — earnings per click-adjacent)|\n$calc_out.affiliate_income.row.earnings_per_visitor{"value":"$1.0000"}|• Earnings Per Visitor:  $1.0000|\n$calc_out.affiliate_income.row.net_after_costs{"value":"$49,800","margin":"99.6"}|• Net (after costs):     $49,800/mo  (margin 99.6%)|\n• Annual Net:            $597,600/yr\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.affiliate_income_funnel|📐 CTR/EPC Funnel:|\n• Traffic Impressions:   50,000\n• Conversions:           1,000  (rate 2.00%)\n$calc_out.affiliate_income.row.revenue_per_click{"value":"$50.00"}|• Revenue per Click:     $50.00  (avg commission)|\n$calc_out.affiliate_income.row.revenue_per_visitor{"value":"$1.0000"}|• Revenue per Visitor:   $1.0000  (key efficiency metric)|\n• Annualized Visitors:   600,000/yr\n$calc_out.affiliate_income.row.benchmark_ctr|• Industry Benchmark:    CTR 1-3%| | $calc_out.affiliate_income.row.benchmark_epc|EPC $0.10-1.00| | $calc_out.affiliate_income.row.benchmark_sites|Aff. sites $20-50/1K visitors|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.affiliate_income_health|🩺 Funnel Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.affiliate_income.row.health_ctr_average{"ctr":"2.00"}|• 🟡 CTR 2.00% is on industry average.|\n$calc_out.affiliate_income.row.health_epc_top{"value":"$1000.00"}|• 🟢 EPC $1000.00/1K — top-quartile affiliate performance.|\n$calc_out.affiliate_income.row.health_net_margin{"margin":"99.6"}|• 🟢 Net margin 99.6% after costs.|\n\n$calc_out.section.affiliate_income_scale_projection|🎯 Scale Projection:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.affiliate_income.row.scale_assumption{"ctr":"2.00","commission":"$50.00"}|Assuming 2.00% CTR and $50.00 commission:|\n• 1K visitors/mo:  $1,000/mo  ($12,000/yr)\n• 10K visitors/mo:  $10,000/mo  ($120,000/yr)\n• 100K visitors/mo:  $100,000/mo  ($1,200,000/yr)\n• 500K visitors/mo:  $500,000/mo  ($6,000,000/yr)\n• 1M visitors/mo:  $1,000,000/mo  ($12,000,000/yr)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.affiliate_income_break_even|⚖️ Break-Even Traffic:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Costs/Month:           $200\n• Earnings/Visitor:      $1.0000\n$calc_out.affiliate_income.row.break_even_traffic{"traffic":"200"}|• Break-Even Traffic:    200 visitors/mo|\n$calc_out.affiliate_income.row.break_even_covered{"traffic":"50,000"}|• 🟢 Current traffic (50,000) covers costs.|\n• To Net $5K/mo:         5,200 visitors/mo\n• To Net $10K/mo:        10,200 visitors/mo\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.affiliate_income.row.whatif_raise_ctr{"value":"$75,000"}|• Raise CTR 50%:  $75,000/mo  (better targeting + landing page)|\n$calc_out.affiliate_income.row.whatif_higher_commission{"value":"$75,000"}|• Higher commission (+50%):  $75,000/mo  (recurring SaaS programs)|\n$calc_out.affiliate_income.row.whatif_double_traffic{"value":"$100,000"}|• 2x traffic:  $100,000/mo  (SEO + paid ads)|\n$calc_out.affiliate_income.row.whatif_all_combined{"value":"$225,000"}|• All three combined:  $225,000/mo  (max upside)|\n$calc_out.affiliate_income.row.whatif_cut_costs{"value":"$49,900"}|• Cut costs 50%:  Net $49,900/mo  (drop expensive tools)|\n\n$calc_out.affiliate_income.row.tip_conversion_leverage{"value":"$25,000"}|💡 Tip: Conversion rate is the highest-leverage metric. A 1% CTR improvement at 50K visitors adds $25,000/mo with no extra traffic cost. Focus on review quality, comparison tables, and clear CTAs before scaling traffic.|\n1,000 visitors/mo: $1000.00/mo | $12,000/yr | 20 sales\n5,000 visitors/mo: $5000.00/mo | $60,000/yr | 100 sales\n10,000 visitors/mo: $10000.00/mo | $120,000/yr | 200 sales\n25,000 visitors/mo: $25000.00/mo | $300,000/yr | 500 sales\n50,000 visitors/mo: $50000.00/mo | $600,000/yr | 1,000 sales\n100,000 visitors/mo: $100000.00/mo | $1,200,000/yr | 2,000 sales\n250,000 visitors/mo: $250000.00/mo | $3,000,000/yr | 5,000 sales\n500,000 visitors/mo: $500000.00/mo | $6,000,000/yr | 10,000 sales\n1,000,000 visitors/mo: $1000000.00/mo | $12,000,000/yr | 20,000 sales',
    '1,000 visitors/mo: $1,000.00/mo | $12,000/yr | 20 sales',
    '10,000 visitors/mo: $10,000.00/mo | $120,000/yr | 200 sales',
    '50,000 visitors/mo: $50,000.00/mo | $600,000/yr | 1,000 sales',
    '1,000,000 visitors/mo: $1,000,000.00/mo | $12,000,000/yr | 20,000 sales',
  ],
  faq: [
    { q: 'What is a good conversion rate for affiliate content?', a: 'For well-targeted review and comparison content, 1-5% is typical. Top-performing affiliate sites can reach 5-10%. If you are below 0.5%, your content likely is not matching purchase intent — revisit your keyword strategy and content format.' },
    { q: 'How can I increase my average commission?', a: 'Promote higher-ticket products, negotiate better rates with affiliate managers once you have volume, and look for recurring commission programs (SaaS tools often pay 20-30% recurring). Bundling complementary products in your content can also increase average order value.' },
    { q: 'How long does it take to build meaningful affiliate traffic?', a: 'Most affiliate sites take 12-18 months to reach 25K+ monthly visitors with consistent content production. Expect 6-12 months before seeing meaningful income. The key is publishing 2-4 high-quality, SEO-optimized posts per week consistently.' },
    { q: 'Which affiliate programs pay the most?', a: 'SaaS and software affiliate programs often pay the highest commissions (20-30% recurring). Premium hosting, online courses, and financial products also have high payouts. Amazon Associates has lower rates (1-10%) but converts easily due to brand trust.' },
    { q: 'Do I need a large email list for affiliate marketing?', a: 'Not necessarily. Most affiliate income comes from organic search traffic directly to your content. However, an email list lets you promote affiliate offers repeatedly without relying on new traffic. Build both channels — SEO for acquisition, email for retention and repeat promotions.' },
    { q: "What is a realistic affiliate income for a content site?", a: "For 50K monthly visitors: $300-2000/month. 100K visitors: $1000-5000. 500K visitors: $5000-25000. 1M+ visitors: $10000-50000+. Conversion rate matters more than traffic: 1-3% CTR on affiliate links, 1-5% conversion to sale. Top affiliate sites can hit $50K-200K/month at scale." },
    { q: "How do I choose affiliate programs to promote?", a: "Pick programs: 1) Relevant to your audience (saves trust), 2) High commission rate (20%+ for digital, 5-10% for physical), 3) Recurring commissions (SaaS, subscriptions), 4) Long cookie duration (30+ days), 5) Good EPC (earnings per click) above $1. Avoid low-commission physical products unless volume is huge." },
    { q: "Should I do Amazon Associates or other programs?", a: "Amazon: 1-4% commission, 24-hour cookie, trusted, huge inventory. Niche programs: 20-50% commission, longer cookies, higher payouts. Hybrid: Amazon for trusted baseline + niche for high-margin. Diversify across 10-20 programs to spread risk. Don't put all eggs in one basket." },
    { q: "How do I disclose affiliate links properly?", a: "FTC requires clear disclosure. Best practices: 1) \"Affiliate link\" label near every link, 2) Disclosure at top of post (\"This post contains affiliate links\"), 3) Plain language (\"I earn a commission\"), 4) Above the fold disclosure on review pages. Non-compliance risks: FTC fines, platform bans, lost trust." },
    { q: "What content converts best for affiliate marketing?", a: "Top converting: 1) Product reviews (3-5x higher conversion than listicles), 2) Comparison posts (\"X vs Y\"), 3) \"Best of\" roundups, 4) Tutorials showing product in use, 5) Email sequences. Long-form (2000+ words) outperforms short. Original photos and testing improve conversion 30-50%." },
    { q: "How do I track affiliate conversions?", a: "Affiliate dashboards: Amazon Associates, ShareASale, CJ Affiliate, Impact, PartnerStack. Track: clicks, conversions, EPC, conversion rate. Use UTM parameters to track which content drives sales. Set up Google Analytics 4 for cross-platform tracking. Talk to a tax pro: affiliate income is self-employment." },
    { q: "How long does it take to build affiliate income?", a: "Realistic timeline: 6-12 months to first $100/month. 12-24 months to $1000+/month. 24-36 months to $5000+/month. Requires: consistent content (4-8 posts/month), SEO-driven traffic, 2-3 trusted affiliate programs. The most successful affiliate sites invested 2-3 years before seeing real income." },
    { q: "What is EPC and why does it matter?", a: "EPC = Earnings Per Click. Average across all clicks. Industry benchmarks: $0.5-2 EPC for most niches. $2-5 for high-commission digital products. $0.1-0.5 for low-commission physical products. EPC >$1 suggests good program + good content. Improve by: A/B testing link placement, writing better anchor text, focusing on buying-intent content." },
  ],
  howToUse: [
    'Enter your average monthly website traffic.',
    'Enter your affiliate link conversion rate (typically 1-5% for review content).',
    'Enter the average commission you earn per sale.',
    'Optionally enter monthly costs (hosting, tools, content production).',
    'Review your monthly and annual income projections plus earnings per visitor.',
    'See your break-even traffic and how many visitors you need for $5K/$10K net income.',
    'Scroll down to see income projections across 9 different traffic levels.',
  ],
  engineKey: true,
};

registerEngine(engine);


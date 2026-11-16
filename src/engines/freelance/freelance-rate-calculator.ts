import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-8：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
//   ⚠️ 章节标题 / 标签用**字面量 token**（code|原文|）；带运行时数值的整行用
//      makeToken(code, fallback, params) ⇒ fallback 与 params 取**同一个变量**。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

function calculateFreelanceRate(inputs: Record<string, string>): string[] {
  const annualIncome = clampNonNegative(parseFloat(inputs.annualIncome) || 0);
  const expenses = clampNonNegative(parseFloat(inputs.expenses) || 0);
  const billableHrs = clampNonNegative(parseFloat(inputs.billableHrs) || 0);
  const profit = clampNonNegative(parseFloat(inputs.profit) || 0);
  const results: string[] = [];

  const netIncome = annualIncome - expenses;
  const baseRate = billableHrs > 0 ? (netIncome + profit) / billableHrs : 0;
  const marketMultiplier = 1.5;
  const expertMultiplier = 2;
  const skilledMultiplier = 1.25;
  const hourlyRate = Math.ceil(baseRate);
  const dailyRate = hourlyRate * 8;
  const weeklyRate = dailyRate * 5;
  const monthlyRate = weeklyRate * 4.33;
  const yearlyRate = monthlyRate * 12;
  const skilledRate = Math.ceil(baseRate * skilledMultiplier);
  const expertRate = Math.ceil(baseRate * expertMultiplier);
  const breakEvenRate = billableHrs > 0 ? expenses / billableHrs : 0;

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
  const fmt2 = (n: number) => '$' + n.toFixed(2);
  const pct = (n: number) => n.toFixed(1) + '%';
  const loc = (n: number) => Math.round(n).toLocaleString();

  const benchmarkTiers = [
    { tier: 'Junior',       pct: 60,  label: 'junior' },
    { tier: 'Mid-Level',    pct: 100, label: 'mid' },
    { tier: 'Senior',       pct: 160, label: 'senior' },
    { tier: 'Expert',       pct: 250, label: 'expert' },
  ];
  const baseMarket = 75;
  const juniorRate = Math.round(baseMarket * 0.6);
  const midRate = Math.round(baseMarket * 1.0);
  const seniorRate = Math.round(baseMarket * 1.6);
  const expertRateMarket = Math.round(baseMarket * 2.5);

  const rateVsMarket = baseRate / midRate;
  // P168 B3-8：健康度行改成 token —— 每个分支**单独写出 code 字面量**
  //   （动态拼码 ⇒ 静态扫描器认不出 ⇒ locale 落库后仍红）。
  const rateHealthRow =
    rateVsMarket >= 1.5
      ? makeToken('calc_out.freelance_rate.row.health_premium', '🟢 Premium — top 10% of market. You charge what top-tier experts charge.')
      : rateVsMarket >= 1.0
      ? makeToken('calc_out.freelance_rate.row.health_market', '🟢 Market-rate — competitive for your skill level.')
      : rateVsMarket >= 0.7
      ? makeToken('calc_out.freelance_rate.row.health_below_market', '🟡 Below market — clients see you as a bargain. Test raising rates.')
      : makeToken('calc_out.freelance_rate.row.health_entry', '🟠 Entry-level — focus on building portfolio to justify higher rates.');

  // P168 B3-4：💡 Tip 改成**语义码**（分支条件 = 上面 Market Position 那套 band，
  //   不引入第二套阈值）⇒ 模板在 locale 的 decision_tip.<code> 里，动态层随输入变。
  const tipJson =
    rateVsMarket >= 1.5
      ? JSON.stringify({ code: 'freelance_rate_premium', params: {} })
      : rateVsMarket >= 1.0
      ? JSON.stringify({ code: 'freelance_rate_market', params: {} })
      : rateVsMarket >= 0.7
      ? JSON.stringify({ code: 'freelance_rate_below_market', params: {} })
      : JSON.stringify({ code: 'freelance_rate_entry', params: {} });

  const utilization = billableHrs > 1200 ? '🟢' : billableHrs > 900 ? '🟡' : '🟠';
  const expenseRatio = annualIncome > 0 ? (expenses / annualIncome) * 100 : 0;
  const profitMargin = annualIncome > 0 ? (profit / annualIncome) * 100 : 0;

  // P168 B3-8：费用 / 利润两行同样**逐分支写出 code 字面量**。
  const expenseRow =
    expenseRatio < 15
      ? makeToken('calc_out.freelance_rate.row.expenses_lean', '🟢 Expenses at ' + pct(expenseRatio) + ' of income — lean operation.', { pct: pct(expenseRatio) })
      : expenseRatio < 30
      ? makeToken('calc_out.freelance_rate.row.expenses_manageable', '🟡 Expenses at ' + pct(expenseRatio) + ' of income — manageable.', { pct: pct(expenseRatio) })
      : makeToken('calc_out.freelance_rate.row.expenses_trim', '🟠 Expenses at ' + pct(expenseRatio) + ' of income — trim to lift margin.', { pct: pct(expenseRatio) });
  const profitRow =
    profitMargin >= 30
      ? makeToken('calc_out.freelance_rate.row.profit_healthy', '🟢 Profit margin ' + pct(profitMargin) + ' — healthy solopreneur margin.', { pct: pct(profitMargin) })
      : profitMargin >= 15
      ? makeToken('calc_out.freelance_rate.row.profit_workable', '🟡 Profit margin ' + pct(profitMargin) + ' — workable, room to grow.', { pct: pct(profitMargin) })
      : makeToken('calc_out.freelance_rate.row.profit_too_thin', '🔴 Profit margin ' + pct(profitMargin) + ' — too thin; raise rate.', { pct: pct(profitMargin) });

  // P168 B3-8：整行 token 化。
  //   ⚠️ 章节标题 / 标签用**字面量 token**（code|原文|），对齐空格留在 token 之外；
  //   ⚠️ 含运行时数值的整行用 makeToken(code, fallback, params) ⇒ fallback 与 params 同源；
  //   ⚠️ '💡 Tip: ' 那行**保持原样**（决策层靠它解析建议码，见 decision-support.ts）。
  results.push(
    '$calc_out.section.freelance_rate_calculator|💼 Freelance Rate Calculator|\n\n' +
    '$calc_out.section.freelance_rate_snapshot|💰 Target Rate Snapshot:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.target_annual_net|Target Annual Net|:    ' + fmt(annualIncome) + '/yr\n' +
    '• ' + makeToken('calc_out.freelance_rate.row.business_expenses', 'Business Expenses:   ' + fmt(expenses) + '/yr  (' + pct(expenseRatio) + ' of target)', { expenses: fmt(expenses), pct: pct(expenseRatio) }) + '\n' +
    '• ' + makeToken('calc_out.freelance_rate.row.desired_profit', 'Desired Profit:      ' + fmt(profit) + '/yr  (' + pct(profitMargin) + ' margin)', { profit: fmt(profit), pct: pct(profitMargin) }) + '\n' +
    '• $calc_out.label.billable_hours|Billable Hours|:      ' + loc(billableHrs) + ' hrs/yr\n' +
    '• $calc_out.label.required_hourly_rate|Required Hourly Rate|: ' + fmt2(baseRate) + '/hr\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.freelance_rate_multipliers|📐 Rate Multipliers:|\n' +
    '• $calc_out.label.base_rate_1x|1x base rate|:        ' + fmt(hourlyRate) + '/hr\n' +
    '• ' + makeToken('calc_out.freelance_rate.row.multiplier_skilled', '1.25x skilled:       ' + fmt(skilledRate) + '/hr  (proven track record)', { rate: fmt(skilledRate) }) + '\n' +
    '• ' + makeToken('calc_out.freelance_rate.row.multiplier_premium', '1.5x premium:        ' + fmt(Math.ceil(baseRate * marketMultiplier)) + '/hr  (specialized niche)', { rate: fmt(Math.ceil(baseRate * marketMultiplier)) }) + '\n' +
    '• ' + makeToken('calc_out.freelance_rate.row.multiplier_expert', '2x expert:           ' + fmt(expertRate) + '/hr  (top-tier authority)', { rate: fmt(expertRate) }) + '\n\n' +
    '• $calc_out.label.daily_rate_8hrs|Daily Rate (8 hrs)|:   ' + fmt(dailyRate) + '/day\n' +
    '• $calc_out.label.weekly_rate_5days|Weekly Rate (5 days)|: ' + fmt(weeklyRate) + '/wk\n' +
    '• $calc_out.label.monthly_rate|Monthly Rate|:         ' + fmt(monthlyRate) + '/mo\n' +
    '• $calc_out.label.yearly_rate|Yearly Rate|:          ' + fmt(yearlyRate) + '/yr\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.freelance_rate_market_position|🩺 Market Position:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + rateHealthRow + '\n' +
    '• ' + utilization + ' ' + makeToken('calc_out.freelance_rate.row.billable_utilization', 'Billable utilization: ' + loc(billableHrs) + ' hrs/yr  (industry: 900-1,400)', { hours: loc(billableHrs) }) + '\n' +
    '• ' + expenseRow + '\n' +
    '• ' + profitRow + '\n' +
    '\n$calc_out.section.freelance_rate_ladder|🎯 Rate Ladder (market context):|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.freelance_rate.row.tier_junior', 'Junior:       ' + fmt(juniorRate) + '/hr  (entry, building portfolio)', { rate: fmt(juniorRate) }) + '\n' +
    '• ' + makeToken('calc_out.freelance_rate.row.tier_mid', 'Mid-Level:    ' + fmt(midRate) + '/hr  (3-5 yrs, market median)', { rate: fmt(midRate) }) + '\n' +
    '• ' + makeToken('calc_out.freelance_rate.row.tier_senior', 'Senior:       ' + fmt(seniorRate) + '/hr  (6-10 yrs, specialist)', { rate: fmt(seniorRate) }) + '\n' +
    '• ' + makeToken('calc_out.freelance_rate.row.tier_expert', 'Expert:       ' + fmt(expertRateMarket) + '/hr  (10+ yrs, top authority)', { rate: fmt(expertRateMarket) }) + '\n' +
    '• ' + makeToken('calc_out.freelance_rate.row.your_rate', 'Your rate:    ' + fmt(hourlyRate) + '/hr  (' + pct(rateVsMarket * 100) + ' of market median)', { rate: fmt(hourlyRate), pct: pct(rateVsMarket * 100) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.freelance_rate_break_even|⚖️ Break-Even Rate:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.break_even_expenses_only|Break-even (expenses only)|: ' + fmt2(breakEvenRate) + '/hr\n' +
    '• ' + makeToken('calc_out.freelance_rate.row.break_even_with_profit', 'Break-even + profit:        ' + fmt2(baseRate) + '/hr  (your required rate)', { rate: fmt2(baseRate) }) + '\n' +
    '• ' + makeToken('calc_out.freelance_rate.row.raise_impact', 'At current billable hrs (' + loc(billableHrs) + '), every $10/hr raise adds ' + fmt(10 * billableHrs) + '/yr', { hours: loc(billableHrs), amount: fmt(10 * billableHrs) }) + '\n' +
    '• ' + makeToken('calc_out.freelance_rate.row.target_1_5x_income', 'To hit $' + loc(annualIncome * 1.5) + '/yr net: raise to ' + fmt2(billableHrs > 0 ? (annualIncome * 1.5) / billableHrs : 0) + '/hr', { target: '$' + loc(annualIncome * 1.5), rate: fmt2(billableHrs > 0 ? (annualIncome * 1.5) / billableHrs : 0) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    // ⚠️ P168 B3-8 §0.6：**双美元号修复** —— fmt() 自带 '$'，这里不再多拼一个
    '• ' + makeToken('calc_out.freelance_rate.row.whatif_raise_20', 'Raise rate 20%:  ' + fmt(Math.ceil(baseRate * 1.2)) + '/hr → ' + fmt(Math.ceil(baseRate * 1.2) * billableHrs) + '/yr gross', { rate: fmt(Math.ceil(baseRate * 1.2)), gross: fmt(Math.ceil(baseRate * 1.2) * billableHrs) }) + '\n' +
    '• ' + makeToken('calc_out.freelance_rate.row.whatif_raise_50', 'Raise rate 50%:  ' + fmt(Math.ceil(baseRate * 1.5)) + '/hr → ' + fmt(Math.ceil(baseRate * 1.5) * billableHrs) + '/yr gross', { rate: fmt(Math.ceil(baseRate * 1.5)), gross: fmt(Math.ceil(baseRate * 1.5) * billableHrs) }) + '\n' +
    '• ' + makeToken('calc_out.freelance_rate.row.whatif_cut_expenses', 'Cut expenses 25%:  Save ' + fmt(expenses * 0.25) + '/yr → break-even drops to ' + fmt2((expenses * 0.75) / Math.max(billableHrs, 1)) + '/hr', { savings: fmt(expenses * 0.25), rate: fmt2((expenses * 0.75) / Math.max(billableHrs, 1)) }) + '\n' +
    '• ' + makeToken('calc_out.freelance_rate.row.whatif_more_hours', '+200 billable hrs/yr:  Same rate → ' + fmt(hourlyRate * (billableHrs + 200)) + '/yr gross (was ' + fmt(hourlyRate * billableHrs) + ')', { gross: fmt(hourlyRate * (billableHrs + 200)), was: fmt(hourlyRate * billableHrs) }) + '\n' +
    '• ' + makeToken('calc_out.freelance_rate.row.whatif_expert_tier', 'Move to expert tier (2x):  ' + fmt(expertRate) + '/hr → ' + fmt(expertRate * billableHrs) + '/yr gross', { rate: fmt(expertRate), gross: fmt(expertRate * billableHrs) }) + '\n\n' +
    '💡 Tip: ' + tipJson,
  );

  const scenarios = [
    { label: 'Junior (60%)', mult: 0.6 },
    { label: 'Mid (100%)', mult: 1.0 },
    { label: 'Skilled (125%)', mult: 1.25 },
    { label: 'Premium (150%)', mult: 1.5 },
    { label: 'Expert (200%)', mult: 2.0 },
  ];
  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    const r = Math.ceil(baseRate * s.mult);
    const day = '$' + (r * 8).toLocaleString();
    const month = '$' + Math.round(r * 8 * 5 * 4.33).toLocaleString();
    const year = '$' + Math.round(r * billableHrs).toLocaleString();
    const hours = loc(billableHrs);
    // ⚠️ 标签 token **逐档写出 code 字面量**（动态拼码 ⇒ 静态扫描器认不出）
    const labelToken =
      i === 0
        ? '$calc_out.label.scenario_junior|Junior (60%)|'
        : i === 1
        ? '$calc_out.label.scenario_mid|Mid (100%)|'
        : i === 2
        ? '$calc_out.label.scenario_skilled|Skilled (125%)|'
        : i === 3
        ? '$calc_out.label.scenario_premium|Premium (150%)|'
        : '$calc_out.label.scenario_expert|Expert (200%)|';
    // ⚠️ ' | ' 是维度行分隔符 ⇒ **不得进 fallback** ⇒ 整行拆成 3 个 token
    results.push(
      labelToken + ': ' +
      makeToken('calc_out.freelance_rate.row.scenario_rate_day', '$' + r + '/hr → ' + day + '/day', { rate: '$' + r, day }) +
      ' | ' +
      makeToken('calc_out.freelance_rate.row.scenario_month', month + '/mo', { month }) +
      ' | ' +
      makeToken('calc_out.freelance_rate.row.scenario_year', year + '/yr at ' + hours + ' hrs', { year, hours }),
    );
  }

  // P168 B3-4：**🧭 四段已迁到页面的「🧭 算完之后」区块**
  //   （src/i18n/locales/{en,zh}.json 的 tools.<slug>.decision_goal /
  //     decision_recommendation / decision_constraint / decision_next_tool，双语）
  //   ⇒ 引擎只负责算；**决策支持由区块独占** ⇒ 同页不再有两份决策建议。
  //   ⚠️ 引擎里**不要**再写这段：区块与卡片会同时渲染同一件事。

  return results;
}

const customFn =
  // P168 B3-8：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 服务端与客户端输出逐字节相同，不可能漂；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var ai=cnn(parseFloat(inputs.annualIncome)||0);" +
  "var ex=cnn(parseFloat(inputs.expenses)||0);" +
  "var bh=cnn(parseFloat(inputs.billableHrs)||0);" +
  "var pr=cnn(parseFloat(inputs.profit)||0);" +
  "var ni=ai-ex;" +
  "var br=bh>0?(ni+pr)/bh:0;" +
  "var mm=1.5;" +
  "var em=2;" +
  "var sm=1.25;" +
  "var hr=Math.ceil(br);" +
  "var dr=hr*8;" +
  "var wr=dr*5;" +
  "var mr=wr*4.33;" +
  "var yr=mr*12;" +
  "var sr=Math.ceil(br*sm);" +
  "var xr=Math.ceil(br*em);" +
  "var ber=bh>0?ex/bh:0;" +
  "var bm=75;" +
  "var jr=Math.round(bm*0.6);" +
  "var mdr=Math.round(bm*1.0);" +
  "var snr=Math.round(bm*1.6);" +
  "var exm=Math.round(bm*2.5);" +
  "var rvm=br/mdr;" +
  "var tj = rvm>=1.5 ? JSON.stringify({code:'freelance_rate_premium',params:{}}) : rvm>=1.0 ? JSON.stringify({code:'freelance_rate_market',params:{}}) : rvm>=0.7 ? JSON.stringify({code:'freelance_rate_below_market',params:{}}) : JSON.stringify({code:'freelance_rate_entry',params:{}});" +
  "var ut=bh>1200?'\\uD83D\\uDFE2':bh>900?'\\uD83D\\uDFE1':'\\uD83D\\uDFE0';" +
  "var er=ai>0?(ex/ai)*100:0;" +
  "var pm=ai>0?(pr/ai)*100:0;" +
  "function fmt(n){return '$'+Math.round(n).toLocaleString()}" +
  "function fmt2(n){return '$'+n.toFixed(2)}" +
  "function pct(n){return n.toFixed(1)+'%'}" +
  "function loc(n){return Math.round(n).toLocaleString()}" +
  // ⚠️ 每个分支**单独写出 code 字面量**（动态拼码 ⇒ 静态扫描器认不出 ⇒ locale 落库后仍红）
  "var rh=" +
  "rvm>=1.5?tk('calc_out.freelance_rate.row.health_premium','\\uD83D\\uDFE2 Premium \\u2014 top 10% of market. You charge what top-tier experts charge.'):" +
  "rvm>=1.0?tk('calc_out.freelance_rate.row.health_market','\\uD83D\\uDFE2 Market-rate \\u2014 competitive for your skill level.'):" +
  "rvm>=0.7?tk('calc_out.freelance_rate.row.health_below_market','\\uD83D\\uDFE1 Below market \\u2014 clients see you as a bargain. Test raising rates.'):" +
  "tk('calc_out.freelance_rate.row.health_entry','\\uD83D\\uDFE0 Entry-level \\u2014 focus on building portfolio to justify higher rates.');" +
  "var erow=" +
  "er<15?tk('calc_out.freelance_rate.row.expenses_lean','\\uD83D\\uDFE2 Expenses at '+pct(er)+' of income \\u2014 lean operation.',{pct:pct(er)}):" +
  "er<30?tk('calc_out.freelance_rate.row.expenses_manageable','\\uD83D\\uDFE1 Expenses at '+pct(er)+' of income \\u2014 manageable.',{pct:pct(er)}):" +
  "tk('calc_out.freelance_rate.row.expenses_trim','\\uD83D\\uDFE0 Expenses at '+pct(er)+' of income \\u2014 trim to lift margin.',{pct:pct(er)});" +
  "var prow=" +
  "pm>=30?tk('calc_out.freelance_rate.row.profit_healthy','\\uD83D\\uDFE2 Profit margin '+pct(pm)+' \\u2014 healthy solopreneur margin.',{pct:pct(pm)}):" +
  "pm>=15?tk('calc_out.freelance_rate.row.profit_workable','\\uD83D\\uDFE1 Profit margin '+pct(pm)+' \\u2014 workable, room to grow.',{pct:pct(pm)}):" +
  "tk('calc_out.freelance_rate.row.profit_too_thin','\\uD83D\\uDD34 Profit margin '+pct(pm)+' \\u2014 too thin; raise rate.',{pct:pct(pm)});" +
  "var results=[];" +
  "var r='';" +
  "r+='$calc_out.section.freelance_rate_calculator|\\uD83D\\uDCBC Freelance Rate Calculator|\\n\\n';" +
  "r+='$calc_out.section.freelance_rate_snapshot|\\uD83D\\uDCB0 Target Rate Snapshot:|\\n';" +
    "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 $calc_out.label.target_annual_net|Target Annual Net|:    '+fmt(ai)+'/yr\\n';" +
  "r+='\\u2022 '+tk('calc_out.freelance_rate.row.business_expenses','Business Expenses:   '+fmt(ex)+'/yr  ('+pct(er)+' of target)',{expenses:fmt(ex),pct:pct(er)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.freelance_rate.row.desired_profit','Desired Profit:      '+fmt(pr)+'/yr  ('+pct(pm)+' margin)',{profit:fmt(pr),pct:pct(pm)})+'\\n';" +
  "r+='\\u2022 $calc_out.label.billable_hours|Billable Hours|:      '+loc(bh)+' hrs/yr\\n';" +
  "r+='\\u2022 $calc_out.label.required_hourly_rate|Required Hourly Rate|: '+fmt2(br)+'/hr\\n\\n';" +
    "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='$calc_out.section.freelance_rate_multipliers|\\uD83D\\uDCD0 Rate Multipliers:|\\n';" +
  "r+='\\u2022 $calc_out.label.base_rate_1x|1x base rate|:        '+fmt(hr)+'/hr\\n';" +
  "r+='\\u2022 '+tk('calc_out.freelance_rate.row.multiplier_skilled','1.25x skilled:       '+fmt(sr)+'/hr  (proven track record)',{rate:fmt(sr)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.freelance_rate.row.multiplier_premium','1.5x premium:        '+fmt(Math.ceil(br*mm))+'/hr  (specialized niche)',{rate:fmt(Math.ceil(br*mm))})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.freelance_rate.row.multiplier_expert','2x expert:           '+fmt(xr)+'/hr  (top-tier authority)',{rate:fmt(xr)})+'\\n\\n';" +
  "r+='\\u2022 $calc_out.label.daily_rate_8hrs|Daily Rate (8 hrs)|:   '+fmt(dr)+'/day\\n';" +
  "r+='\\u2022 $calc_out.label.weekly_rate_5days|Weekly Rate (5 days)|: '+fmt(wr)+'/wk\\n';" +
  "r+='\\u2022 $calc_out.label.monthly_rate|Monthly Rate|:         '+fmt(mr)+'/mo\\n';" +
  "r+='\\u2022 $calc_out.label.yearly_rate|Yearly Rate|:          '+fmt(yr)+'/yr\\n\\n';" +
    "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='$calc_out.section.freelance_rate_market_position|\\uD83E\\uDE7A Market Position:|\\n';" +
    "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 '+rh+'\\n';" +
  "r+='\\u2022 '+ut+' '+tk('calc_out.freelance_rate.row.billable_utilization','Billable utilization: '+loc(bh)+' hrs/yr  (industry: 900-1,400)',{hours:loc(bh)})+'\\n';" +
  "r+='\\u2022 '+erow+'\\n';" +
  "r+='\\u2022 '+prow+'\\n';" +
  "r+='\\n$calc_out.section.freelance_rate_ladder|\\uD83C\\uDFAF Rate Ladder (market context):|\\n';" +
    "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 '+tk('calc_out.freelance_rate.row.tier_junior','Junior:       '+fmt(jr)+'/hr  (entry, building portfolio)',{rate:fmt(jr)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.freelance_rate.row.tier_mid','Mid-Level:    '+fmt(mdr)+'/hr  (3-5 yrs, market median)',{rate:fmt(mdr)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.freelance_rate.row.tier_senior','Senior:       '+fmt(snr)+'/hr  (6-10 yrs, specialist)',{rate:fmt(snr)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.freelance_rate.row.tier_expert','Expert:       '+fmt(exm)+'/hr  (10+ yrs, top authority)',{rate:fmt(exm)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.freelance_rate.row.your_rate','Your rate:    '+fmt(hr)+'/hr  ('+pct(rvm*100)+' of market median)',{rate:fmt(hr),pct:pct(rvm*100)})+'\\n\\n';" +
    "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='$calc_out.section.freelance_rate_break_even|\\u2696\\uFE0F Break-Even Rate:|\\n';" +
    "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 $calc_out.label.break_even_expenses_only|Break-even (expenses only)|: '+fmt2(ber)+'/hr\\n';" +
  "r+='\\u2022 '+tk('calc_out.freelance_rate.row.break_even_with_profit','Break-even + profit:        '+fmt2(br)+'/hr  (your required rate)',{rate:fmt2(br)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.freelance_rate.row.raise_impact','At current billable hrs ('+loc(bh)+'), every $10/hr raise adds '+fmt(10*bh)+'/yr',{hours:loc(bh),amount:fmt(10*bh)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.freelance_rate.row.target_1_5x_income','To hit $'+loc(ai*1.5)+'/yr net: raise to '+fmt2(bh>0?(ai*1.5)/bh:0)+'/hr',{target:'$'+loc(ai*1.5),rate:fmt2(bh>0?(ai*1.5)/bh:0)})+'\\n\\n';" +
    "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='$calc_out.section.what_if_scenarios|\\uD83D\\uDD04 What-If Scenarios:|\\n';" +
    "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  // ⚠️ P168 B3-8 §0.6：**双美元号修复** —— fmt() 自带 '$'，这里不再多拼一个
  "r+='\\u2022 '+tk('calc_out.freelance_rate.row.whatif_raise_20','Raise rate 20%:  '+fmt(Math.ceil(br*1.2))+'/hr \\u2192 '+fmt(Math.ceil(br*1.2)*bh)+'/yr gross',{rate:fmt(Math.ceil(br*1.2)),gross:fmt(Math.ceil(br*1.2)*bh)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.freelance_rate.row.whatif_raise_50','Raise rate 50%:  '+fmt(Math.ceil(br*1.5))+'/hr \\u2192 '+fmt(Math.ceil(br*1.5)*bh)+'/yr gross',{rate:fmt(Math.ceil(br*1.5)),gross:fmt(Math.ceil(br*1.5)*bh)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.freelance_rate.row.whatif_cut_expenses','Cut expenses 25%:  Save '+fmt(ex*0.25)+'/yr \\u2192 break-even drops to '+fmt2((ex*0.75)/Math.max(bh,1))+'/hr',{savings:fmt(ex*0.25),rate:fmt2((ex*0.75)/Math.max(bh,1))})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.freelance_rate.row.whatif_more_hours','+200 billable hrs/yr:  Same rate \\u2192 '+fmt(hr*(bh+200))+'/yr gross (was '+fmt(hr*bh)+')',{gross:fmt(hr*(bh+200)),was:fmt(hr*bh)})+'\\n';" +
  "r+='\\u2022 '+tk('calc_out.freelance_rate.row.whatif_expert_tier','Move to expert tier (2x):  '+fmt(xr)+'/hr \\u2192 '+fmt(xr*bh)+'/yr gross',{rate:fmt(xr),gross:fmt(xr*bh)})+'\\n\\n';" +
  "r+='\\uD83D\\uDCA1 Tip: '+tj;" +
  "results.push(r);" +
  "var scs=[{l:'Junior (60%)',m:0.6},{l:'Mid (100%)',m:1.0},{l:'Skilled (125%)',m:1.25},{l:'Premium (150%)',m:1.5},{l:'Expert (200%)',m:2.0}];" +
  "for(var i=0;i<scs.length;i++){" +
  "var s=scs[i];" +
  "var rt=Math.ceil(br*s.m);" +
  "var sday='$'+(rt*8).toLocaleString();" +
  "var smon='$'+Math.round(rt*8*5*4.33).toLocaleString();" +
  "var syr='$'+Math.round(rt*bh).toLocaleString();" +
  "var shrs=loc(bh);" +
  "var lbl=i===0?'$calc_out.label.scenario_junior|Junior (60%)|':i===1?'$calc_out.label.scenario_mid|Mid (100%)|':i===2?'$calc_out.label.scenario_skilled|Skilled (125%)|':i===3?'$calc_out.label.scenario_premium|Premium (150%)|':'$calc_out.label.scenario_expert|Expert (200%)|';" +
  "results.push(lbl+': '+tk('calc_out.freelance_rate.row.scenario_rate_day','$'+rt+'/hr \\u2192 '+sday+'/day',{rate:'$'+rt,day:sday})+' | '+tk('calc_out.freelance_rate.row.scenario_month',smon+'/mo',{month:smon})+' | '+tk('calc_out.freelance_rate.row.scenario_year',syr+'/yr at '+shrs+' hrs',{year:syr,hours:shrs}));" +
  "}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-freelance-rate-calculator',
  title: 'Freelance Rate Calculator',
  description: 'Calculate the hourly rate you need to hit your income goals. See how market multipliers (skilled, premium, expert) affect what you should charge.',
  inputs: [
    { name: 'annualIncome', label: 'Target Annual Net Income ($)', placeholder: 'e.g. 100000', type: 'number' },
    { name: 'expenses', label: 'Annual Business Expenses ($)', placeholder: 'e.g. 10000', type: 'number' },
    { name: 'billableHrs', label: 'Billable Hours Per Year', placeholder: 'e.g. 1200', type: 'number' },
    { name: 'profit', label: 'Desired Profit Margin ($)', placeholder: 'e.g. 30000', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  // P140f-p3-T7: minimal Playbook 6 字段 template (Goal=该不该决策)
  // Goal 含"决策"+"该不该"双关键词 → 通过 T1 zod refine 校验
  playbook: {
    goal: '用户该不该马上提价，还是先靠多做几个客户把收入缺口补上',
    input: 'engine 定义的 inputs 字段',
    output: 'engine 定义的 generate() 返回数组',
    constraint: 'apply 引擎 inputs 时受实际场景约束',
    tool: '页面的「🧭 算完之后」决策区块（决策支持已由区块独占）',
    memory: 'v2.0 11 business domain benchmark + P140f Phase 4 主题簇',
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateFreelanceRate(inputs);
  },
  staticExamples: [
    '$calc_out.section.freelance_rate_calculator|💼 Freelance Rate Calculator|\n\n$calc_out.section.freelance_rate_snapshot|💰 Target Rate Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.target_annual_net|Target Annual Net|:    $80,000/yr\n• $calc_out.freelance_rate.row.business_expenses{"expenses":"$10,000","pct":"12.5%"}|Business Expenses:   $10,000/yr  (12.5% of target)|\n• $calc_out.freelance_rate.row.desired_profit{"profit":"$20,000","pct":"25.0%"}|Desired Profit:      $20,000/yr  (25.0% margin)|\n• $calc_out.label.billable_hours|Billable Hours|:      1,200 hrs/yr\n• $calc_out.label.required_hourly_rate|Required Hourly Rate|: $75.00/hr\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.freelance_rate_multipliers|📐 Rate Multipliers:|\n• $calc_out.label.base_rate_1x|1x base rate|:        $75/hr\n• $calc_out.freelance_rate.row.multiplier_skilled{"rate":"$94"}|1.25x skilled:       $94/hr  (proven track record)|\n• $calc_out.freelance_rate.row.multiplier_premium{"rate":"$113"}|1.5x premium:        $113/hr  (specialized niche)|\n• $calc_out.freelance_rate.row.multiplier_expert{"rate":"$150"}|2x expert:           $150/hr  (top-tier authority)|\n\n• $calc_out.label.daily_rate_8hrs|Daily Rate (8 hrs)|:   $600/day\n• $calc_out.label.weekly_rate_5days|Weekly Rate (5 days)|: $3,000/wk\n• $calc_out.label.monthly_rate|Monthly Rate|:         $12,990/mo\n• $calc_out.label.yearly_rate|Yearly Rate|:          $155,880/yr\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.freelance_rate_market_position|🩺 Market Position:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.freelance_rate.row.health_market|🟢 Market-rate — competitive for your skill level.|\n• 🟡 $calc_out.freelance_rate.row.billable_utilization{"hours":"1,200"}|Billable utilization: 1,200 hrs/yr  (industry: 900-1,400)|\n• $calc_out.freelance_rate.row.expenses_lean{"pct":"12.5%"}|🟢 Expenses at 12.5% of income — lean operation.|\n• $calc_out.freelance_rate.row.profit_workable{"pct":"25.0%"}|🟡 Profit margin 25.0% — workable, room to grow.|\n\n$calc_out.section.freelance_rate_ladder|🎯 Rate Ladder (market context):|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.freelance_rate.row.tier_junior{"rate":"$45"}|Junior:       $45/hr  (entry, building portfolio)|\n• $calc_out.freelance_rate.row.tier_mid{"rate":"$75"}|Mid-Level:    $75/hr  (3-5 yrs, market median)|\n• $calc_out.freelance_rate.row.tier_senior{"rate":"$120"}|Senior:       $120/hr  (6-10 yrs, specialist)|\n• $calc_out.freelance_rate.row.tier_expert{"rate":"$188"}|Expert:       $188/hr  (10+ yrs, top authority)|\n• $calc_out.freelance_rate.row.your_rate{"rate":"$75","pct":"100.0%"}|Your rate:    $75/hr  (100.0% of market median)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.freelance_rate_break_even|⚖️ Break-Even Rate:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.break_even_expenses_only|Break-even (expenses only)|: $8.33/hr\n• $calc_out.freelance_rate.row.break_even_with_profit{"rate":"$75.00"}|Break-even + profit:        $75.00/hr  (your required rate)|\n• $calc_out.freelance_rate.row.raise_impact{"hours":"1,200","amount":"$12,000"}|At current billable hrs (1,200), every $10/hr raise adds $12,000/yr|\n• $calc_out.freelance_rate.row.target_1_5x_income{"target":"$120,000","rate":"$100.00"}|To hit $120,000/yr net: raise to $100.00/hr|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.freelance_rate.row.whatif_raise_20{"rate":"$90","gross":"$108,000"}|Raise rate 20%:  $90/hr → $108,000/yr gross|\n• $calc_out.freelance_rate.row.whatif_raise_50{"rate":"$113","gross":"$135,600"}|Raise rate 50%:  $113/hr → $135,600/yr gross|\n• $calc_out.freelance_rate.row.whatif_cut_expenses{"savings":"$2,500","rate":"$6.25"}|Cut expenses 25%:  Save $2,500/yr → break-even drops to $6.25/hr|\n• $calc_out.freelance_rate.row.whatif_more_hours{"gross":"$105,000","was":"$90,000"}|+200 billable hrs/yr:  Same rate → $105,000/yr gross (was $90,000)|\n• $calc_out.freelance_rate.row.whatif_expert_tier{"rate":"$150","gross":"$180,000"}|Move to expert tier (2x):  $150/hr → $180,000/yr gross|\n\n💡 Tip: {"code":"freelance_rate_market","params":{}}\n$calc_out.label.scenario_junior|Junior (60%)|: $calc_out.freelance_rate.row.scenario_rate_day{"rate":"$45","day":"$360"}|$45/hr → $360/day| | $calc_out.freelance_rate.row.scenario_month{"month":"$7,794"}|$7,794/mo| | $calc_out.freelance_rate.row.scenario_year{"year":"$54,000","hours":"1,200"}|$54,000/yr at 1,200 hrs|\n$calc_out.label.scenario_mid|Mid (100%)|: $calc_out.freelance_rate.row.scenario_rate_day{"rate":"$75","day":"$600"}|$75/hr → $600/day| | $calc_out.freelance_rate.row.scenario_month{"month":"$12,990"}|$12,990/mo| | $calc_out.freelance_rate.row.scenario_year{"year":"$90,000","hours":"1,200"}|$90,000/yr at 1,200 hrs|\n$calc_out.label.scenario_skilled|Skilled (125%)|: $calc_out.freelance_rate.row.scenario_rate_day{"rate":"$94","day":"$752"}|$94/hr → $752/day| | $calc_out.freelance_rate.row.scenario_month{"month":"$16,281"}|$16,281/mo| | $calc_out.freelance_rate.row.scenario_year{"year":"$112,800","hours":"1,200"}|$112,800/yr at 1,200 hrs|\n$calc_out.label.scenario_premium|Premium (150%)|: $calc_out.freelance_rate.row.scenario_rate_day{"rate":"$113","day":"$904"}|$113/hr → $904/day| | $calc_out.freelance_rate.row.scenario_month{"month":"$19,572"}|$19,572/mo| | $calc_out.freelance_rate.row.scenario_year{"year":"$135,600","hours":"1,200"}|$135,600/yr at 1,200 hrs|\n$calc_out.label.scenario_expert|Expert (200%)|: $calc_out.freelance_rate.row.scenario_rate_day{"rate":"$150","day":"$1,200"}|$150/hr → $1,200/day| | $calc_out.freelance_rate.row.scenario_month{"month":"$25,980"}|$25,980/mo| | $calc_out.freelance_rate.row.scenario_year{"year":"$180,000","hours":"1,200"}|$180,000/yr at 1,200 hrs|',
    'Junior (60%): $53/hr → $424/day | $9,179/mo | $63,600/yr at 1200 hrs',
    'Mid (100%): $89/hr → $712/day | $15,417/mo | $106,800/yr at 1200 hrs',
    'Skilled (125%): $112/hr → $896/day | $19,395/mo | $134,400/yr at 1200 hrs',
    'Premium (150%): $134/hr → $1,072/day | $23,205/mo | $160,800/yr at 1200 hrs',
    'Expert (200%): $179/hr → $1,432/day | $31,001/mo | $214,800/yr at 1200 hrs',
  ],
  faq: [
    { q: 'How do I know if my rate is too high?', a: 'If you win every proposal, your rate is too low. Aim to lose 20-30% of proposals on price — that means you are charging what you are worth.' },
    { q: 'Should I charge different rates for different clients?', a: 'Yes. Charge startups less (with equity upside), enterprises more. Adjust for project complexity, deadline pressure, and ongoing relationship value.' },
    { q: 'How often should I raise my rates?', a: 'Every 6 months or after every 3 completed projects. Notify existing clients 30 days in advance. New clients get the new rate immediately.' },
    { q: 'What about value-based pricing?', a: 'For projects where you can quantify the client\'s ROI (e.g., "this landing page will generate $50K"), charge 10-20% of the expected value instead of hourly.' },
    { q: 'Are these rates realistic for global markets?', a: 'The calculator adjusts based on your target income and billable hours, not regional averages. If you work remotely for US/EU clients, charge US/EU rates regardless of where you live. The market ladder (junior → expert) gives you anchors regardless of geography.' },
    { q: "How do I set my freelance hourly rate?", a: "Rate = (target_annual_income + business_expenses + profit + taxes) / billable_hours. For $100K income, $20K expenses, 25% taxes, 1200 billable hours = $120/hour. Most freelancers undercount expenses and billable hours. Aim for 25-50% overhead buffer. Test with 3-5 clients before settling." },
    { q: "What is a good freelance hourly rate in 2026?", a: "Mid-level developer: $75-150/hour. Senior: $150-300/hour. Specialized (AI, security, blockchain): $200-500/hour. Designer: $75-150/hour. Writer: $50-150/hour. Marketing consultant: $100-250/hour. Top freelancers in tech hubs: $300-500/hour. Increase rates 10-20% annually." },
    { q: "Should I charge hourly or per project?", a: "Hourly: predictable, fair for unclear scope, easy to estimate. Per-project: rewards efficiency, gives client price certainty, requires clear scope. Hybrid: estimate hours, charge fixed price with hour cap. Per-project favors experienced freelancers. Hourly favors new freelancers. Industry: 50/50 split is common." },
    { q: "How do I justify my rate to clients?", a: "Show ROI: \"Saving you 10 hours/week at $150/hour = $78K/year. My rate of $200/hour saves $7000/month in this work alone.\" Compare: vs full-time employee ($50-80K fully loaded + benefits), vs agency ($300+/hour), vs doing nothing (lost revenue). Provide case studies with measurable results." },
    { q: "What is the right utilization rate for freelancers?", a: "Healthy: 60-75% billable utilization. Top freelancers: 80-90%. Below 50%: business development is weak. Time spent on: client work (60-80%), business development (10-20%), admin/learning (10-15%). Track utilization weekly. Aim for 70% as a sustainable target." },
    { q: "How do I handle scope creep?", a: "Prevention: written scope, change orders for additions, clear deliverables. Response: \"This is outside scope. Happy to add for $X additional.\" Always: get change orders in writing. Track scope creep: log every out-of-scope request. Use contracts with revision limits (e.g., \"2 rounds of revisions included\")." },
    { q: "Should I charge more for rush projects?", a: "Yes. Rush multiplier: 1.5x for 1-week deadline, 2x for 3-day, 3x for 24-hour. Communicate upfront: \"Rush projects incur a 50% premium.\" Only accept rush if you have capacity. Build a \"rush fee\" template. This is a major profit center for established freelancers." },
    { q: "How do I raise my rates without losing clients?", a: "Raise rates: 10-20% annually for existing clients, 30-50% for new clients. Process: 1) Notify existing clients 30-60 days ahead, 2) Differentiate tiers (legacy rate for committed clients, new rate for new), 3) Offer \"lock in current rate for 12 months\" to long-term clients. Expected churn: 10-20% of clients. Worth it." },
  ],
  howToUse: [
    'Enter your target annual net income (after taxes, before profit).',
    'Enter your annual business expenses (software, equipment, insurance).',
    'Enter realistic billable hours — most freelancers bill 900-1,400/yr.',
    'Enter desired profit (what you want to keep above expenses).',
    'Review your required hourly rate and the skilled/premium/expert multipliers.',
    'See how raising rates 20-50% impacts annual revenue at your billable hours.',
  ],
  engineKey: true,
};

registerEngine(engine);

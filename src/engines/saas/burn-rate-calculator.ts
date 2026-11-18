import type { ToolEngine } from "../../core/engines/types";
import { registerEngine } from "../../core/engines/registry";
import { clampNonNegative } from "../../core/engines/helpers";
// P168 B3-8：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
//   ⚠️ 章节标题 / 标签用**字面量 token**（code|原文|）；带运行时数值的整行用
//      makeToken(code, fallback, params) ⇒ fallback 与 params 取**同一个变量**。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from "../../lib/calc-output-i18n";

function bar(pct: number): string {
  const w = Math.round(pct * 20);
  return "█".repeat(w) + "░".repeat(20 - w);
}

function calculateBurnRate(inputs: Record<string, string>): string[] {
  const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
  const pct = (n: number, total: number) => total > 0 ? ((n / total) * 100).toFixed(1) + "%" : "0.0%";

  const monthlyRevenue = clampNonNegative(parseFloat(inputs.monthlyRevenue) || 0);
  const teamCost = clampNonNegative(parseFloat(inputs.teamCost) || 0);
  const infraCost = clampNonNegative(parseFloat(inputs.infraCost) || 0);
  const marketingCost = clampNonNegative(parseFloat(inputs.marketingCost) || 0);
  const opsCost = clampNonNegative(parseFloat(inputs.opsCost) || 0);
  const currentCash = clampNonNegative(parseFloat(inputs.currentCash) || 0);
  const netNewRevenue = clampNonNegative(parseFloat(inputs.netNewRevenue) || 0);

  const grossBurn = teamCost + infraCost + marketingCost + opsCost;
  const netBurn = grossBurn - monthlyRevenue;

  // ── P168 B3-8：结果输出逐行令牌化 ─────────────────────────────────────────
  //   · 章节标题 / 标签 ⇒ **字面量 token**（code|原文|）；对齐空格留在 token 之外
  //   · 含自然语言句子的整行 ⇒ makeToken(code, fallback, params)
  //     ⇒ fallback 与 params 取**同一个变量** ⇒ 两边不可能漂
  //   ⛔ 「💡 Tip: {"code":...}」是 P168 决策建议 i18n 的既定形态 ⇒ **一个字都不动**
  //     （src/lib/decision-support.ts 的 parseDecisionTip 解析它，英文句子在
  //       decision_tip.* locale 模板里；tests/decision-tip-i18n-guard.test.ts 守着它）
  let result = "$calc_out.section.burn_rate_cash_flow_health_check|🔥 Cash Flow Health Check|\n\n";

  result += "$calc_out.section.burn_rate_burn_summary|💸 Burn Summary|\n";
  result += "• $calc_out.label.gross_burn|Gross Burn|:    " + fmt(grossBurn) + "/mo\n";
  result += "• $calc_out.label.net_burn|Net Burn|:      " + fmt(netBurn) + "/mo";
  if (monthlyRevenue > 0) result += "  $calc_out.burn_rate.row.net_burn_gross_minus_revenue|(Gross − Revenue)|\n";
  else result += "  $calc_out.burn_rate.row.net_burn_no_revenue|(no revenue yet)|\n";
  result += "• $calc_out.label.annual_burn|Annual Burn|:   " + fmt(netBurn * 12) + "/yr\n";
  if (netBurn > 0) {
    result += "• " + makeToken(
      "calc_out.burn_rate.row.to_break_even",
      "To break even: Need +" + fmt(netBurn) + "/mo more revenue (or cut costs by same amount)",
      { amount: fmt(netBurn) },
    ) + "\n";
  }

  // runwayMonths is computed here for reuse in Default Alive/Dead section
  let runwayMonths = 0;
  result += "\n$calc_out.section.burn_rate_runway|⏳ Runway|\n";
  result += "• $calc_out.label.current_cash|Current Cash|:      " + fmt(currentCash) + "\n";
  if (netBurn <= 0) {
    result += "• " + makeToken("calc_out.burn_rate.row.status_cashflow_positive", "Status:            ✅ Cash-flow positive! No burn concern.") + "\n";
  }
  else if (currentCash <= 0) {
    result += "• " + makeToken("calc_out.burn_rate.row.status_no_cash_reserve", "Status:            ⚠️ No cash reserve — enter your balance to estimate runway.") + "\n";
  }
  else {
    runwayMonths = currentCash / netBurn;
    const today = new Date();
    const runOut = new Date(today.getTime() + runwayMonths * 30.44 * 24 * 60 * 60 * 1000);
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const runOutLabel = monthNames[runOut.getMonth()] + " " + runOut.getFullYear();
    result += "• $calc_out.label.remaining_runway|Remaining Runway|:  " + runwayMonths.toFixed(1) + " months\n";
    result += "• $calc_out.label.est_cash_run_out|Est. Cash Run-out|:   " + runOutLabel + "\n";
    if (runwayMonths > 12) result += "• " + makeToken("calc_out.burn_rate.row.assessment_healthy", "Assessment:        🟢 Healthy — over a year of runway.") + "\n";
    else if (runwayMonths > 6) result += "• " + makeToken("calc_out.burn_rate.row.assessment_manageable", "Assessment:        🟡 Manageable — 6–12 months. Plan ahead.") + "\n";
    else if (runwayMonths > 3) result += "• " + makeToken("calc_out.burn_rate.row.assessment_tight", "Assessment:        🟠 Tight — 3–6 months. Cut costs or raise revenue now.") + "\n";
    else result += "• " + makeToken("calc_out.burn_rate.row.assessment_critical", "Assessment:        🔴 Critical — under 3 months. Immediate action required.") + "\n";
  }

  // Burn Multiple section — measures how efficiently burn converts to new revenue
  if (netNewRevenue > 0) {
    const burnMultiple = netBurn / netNewRevenue;
    result += "\n$calc_out.section.burn_rate_burn_multiple|📈 Burn Multiple|\n";
    result += "• $calc_out.label.net_new_revenue|Net New Revenue|:  " + fmt(netNewRevenue) + "/mo\n";
    result += "• $calc_out.label.burn_multiple|Burn Multiple|:    " + burnMultiple.toFixed(1) + "× ";
    if (burnMultiple < 1.0) {
      result += "🟢\n";
      result += "• " + makeToken("calc_out.burn_rate.row.insight_great", "Insight:          You're adding more revenue than you're burning. Great trajectory!") + "\n";
    } else if (burnMultiple <= 2.0) {
      result += "🟡\n";
      result += "• " + makeToken("calc_out.burn_rate.row.insight_moderate", "Insight:          Moderate efficiency. Aim to bring this below 1.0×.") + "\n";
    } else {
      result += "🔴\n";
      result += "• " + makeToken("calc_out.burn_rate.row.insight_burning_faster", "Insight:          Burning much faster than you're adding revenue. Need to improve efficiency.") + "\n";
    }
  }

  // Default Alive/Dead — overall health verdict based on runway and growth trajectory
  result += "\n$calc_out.section.burn_rate_default_alive_dead_status|💀 Default Alive/Dead Status|\n";
  if (netBurn <= 0) {
    result += "• " + makeToken("calc_out.burn_rate.row.default_alive_cashflow_positive", "Status:  ✅ Default Alive: cash-flow positive") + "\n";
  } else if (currentCash > 0) {
    if (runwayMonths > 24) {
      result += "• " + makeToken("calc_out.burn_rate.row.default_alive_24plus", "Status:  🟢 Default Alive: 24+ months runway") + "\n";
    } else if (runwayMonths > 12) {
      result += "• " + makeToken("calc_out.burn_rate.row.default_alive_12_24", "Status:  🟡 Default Alive: 12-24 months") + "\n";
    } else {
      result += "• " + makeToken("calc_out.burn_rate.row.default_dead_under_12", "Status:  🔴 Default Dead: under 12 months — need growth or funding to survive") + "\n";
    }
  } else {
    result += "• " + makeToken("calc_out.burn_rate.row.default_dead_under_12", "Status:  🔴 Default Dead: under 12 months — need growth or funding to survive") + "\n";
  }

  if (grossBurn > 0) {
    result += "\n$calc_out.section.burn_rate_cost_structure|📊 Cost Structure|\n";
    // ⚠️ 标签用**字面量 token**；对齐补白按**英文标签长度**算（token 渲染回英文时逐字不变）
    const categories: [string, string, number][] = [
      ["Team", "$calc_out.label.team|Team|", teamCost],
      ["Marketing", "$calc_out.label.marketing|Marketing|", marketingCost],
      ["Infrastructure", "$calc_out.label.infrastructure|Infrastructure|", infraCost],
      ["Operations", "$calc_out.label.operations|Operations|", opsCost],
    ];
    for (const [label, token, cost] of categories) {
      if (cost > 0) { const share = cost / grossBurn; result += "• " + token + " ".repeat(Math.max(0, 14 - label.length)) + " " + pct(cost, grossBurn).padStart(6) + "  " + bar(share) + "\n"; }
    }
  }

  const originalRunway = (netBurn > 0 && currentCash > 0) ? currentCash / netBurn : Infinity;
  if (netBurn > 0 && currentCash > 0) {
    const cuts = [0.1, 0.2, 0.3];
    result += "\n$calc_out.section.burn_rate_cost_cut_scenarios|🔄 Cost-Cut Scenarios|\n";
    for (const cut of cuts) {
      const savings = grossBurn * cut;
      const reducedNetBurn = netBurn - savings;
      const pctLabel = Math.round(cut * 100) + "%";
      if (reducedNetBurn <= 0) {
        result += "• " + makeToken(
          "calc_out.burn_rate.row.cut_scenario_cashflow_positive",
          "Cut " + pctLabel + ": Save " + fmt(savings) + "/mo — ✅ Cash-flow positive!",
          { pct: pctLabel, savings: fmt(savings) },
        ) + "\n";
      } else {
        const newRunway = currentCash / reducedNetBurn; const extra = newRunway - originalRunway;
        result += "• " + makeToken(
          "calc_out.burn_rate.row.cut_scenario",
          "Cut " + pctLabel + ": Save " + fmt(savings) + "/mo — Net burn " + fmt(reducedNetBurn) + "/mo — Runway " + newRunway.toFixed(1) + " mo (+" + extra.toFixed(1) + " extra)",
          { pct: pctLabel, savings: fmt(savings), net_burn: fmt(reducedNetBurn), runway: newRunway.toFixed(1), extra: extra.toFixed(1) },
        ) + "\n";
      }
    }
  }

  // 🩺 Burn Health (v3)
  const burnHealthHeader = "\n\n$calc_out.section.burn_rate_burn_health|🩺 Burn Health:|\n" + "━".repeat(54) + "\n• ";
  if (netBurn <= 0) {
    result += burnHealthHeader + makeToken("calc_out.burn_rate.row.burn_health_default_alive", "🟢 Default alive — revenue ≥ expenses. No burn. Focus on growth and reinvestment.");
  } else if (currentCash <= 0) {
    result += burnHealthHeader + makeToken("calc_out.burn_rate.row.burn_health_no_cash", "🔴 No cash. Cannot compute runway. Bootstrap, raise, or shut down.");
  } else if (isFinite(originalRunway) && originalRunway < 3) {
    result += burnHealthHeader + makeToken("calc_out.burn_rate.row.burn_health_critical", "🔴 Runway " + originalRunway.toFixed(1) + " months — critical. Raise capital NOW or cut burn 50%+ this month.", { runway: originalRunway.toFixed(1) });
  } else if (isFinite(originalRunway) && originalRunway < 6) {
    result += burnHealthHeader + makeToken("calc_out.burn_rate.row.burn_health_warning", "🟠 Runway " + originalRunway.toFixed(1) + " months — warning zone. Start raising or cut burn in next 2 months.", { runway: originalRunway.toFixed(1) });
  } else if (isFinite(originalRunway) && originalRunway < 12) {
    result += burnHealthHeader + makeToken("calc_out.burn_rate.row.burn_health_adequate", "🟡 Runway " + originalRunway.toFixed(1) + " months — adequate for now. Plan Series A or accelerate revenue.", { runway: originalRunway.toFixed(1) });
  } else {
    result += burnHealthHeader + makeToken("calc_out.burn_rate.row.burn_health_comfortable", "🟢 Runway " + originalRunway.toFixed(1) + " months — comfortable. Default dead is years away. Focus on growth.", { runway: originalRunway.toFixed(1) });
  }

  // 🔄 What-If Scenarios (v3)
  result += "\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n" + "━".repeat(54);
  if (isFinite(originalRunway) && netBurn > 0) {
    const raiseRev20 = currentCash / (netBurn - monthlyRevenue * 0.2);
    const cutExp20 = currentCash / (netBurn * 0.8);
    const raise1M = currentCash + 1_000_000;
    const newRunwayAfterRaise = raise1M / netBurn;
    result += "\n• " + makeToken("calc_out.burn_rate.row.whatif_raise_revenue_20", "Raise revenue 20%:  Runway " + originalRunway.toFixed(1) + " → " + raiseRev20.toFixed(1) + " mo", { from: originalRunway.toFixed(1), to: raiseRev20.toFixed(1) });
    result += "\n• " + makeToken("calc_out.burn_rate.row.whatif_cut_expenses_20", "Cut expenses 20%:  Runway " + originalRunway.toFixed(1) + " → " + cutExp20.toFixed(1) + " mo", { from: originalRunway.toFixed(1), to: cutExp20.toFixed(1) });
    result += "\n• " + makeToken("calc_out.burn_rate.row.whatif_raise_1m", "Raise $1M (6-month runway extension at current burn):  " + (newRunwayAfterRaise).toFixed(1) + " mo", { months: (newRunwayAfterRaise).toFixed(1) });
    result += "\n• " + makeToken("calc_out.burn_rate.row.whatif_hit_default_alive", "Hit default alive (revenue = expenses):  ∞ runway (focus on growth)");
    if (monthlyRevenue > 0) {
      const growthNeeded = ((grossBurn - monthlyRevenue) / monthlyRevenue) * 100;
      result += "\n• " + makeToken("calc_out.burn_rate.row.whatif_growth_needed", "Growth needed monthly to break even:  +" + growthNeeded.toFixed(1) + "% revenue", { pct: growthNeeded.toFixed(1) });
    }
  } else {
    result += "\n• " + makeToken("calc_out.burn_rate.row.whatif_cannot_model", "⚠️ Cannot model — ensure cash > 0 and net burn > 0.");
  }

  // ⚖️ Break-Even (v3)
  if (netBurn > 0 && currentCash > 0) {
    result += "\n\n$calc_out.section.burn_rate_break_even|⚖️ Break-Even|\n" + "─".repeat(54);
    const breakEvenRevenue = monthlyRevenue + netBurn; // revenue needed to hit $0 net burn
    const growthPct = monthlyRevenue > 0 ? ((netBurn / monthlyRevenue) * 100) : 0;
    if (growthPct > 0) {
      result += "\n• " + makeToken("calc_out.burn_rate.row.break_even_need_revenue", "🟡 Need +" + fmt(netBurn) + "/mo revenue (" + growthPct.toFixed(0) + "% growth) to hit break-even", { amount: fmt(netBurn), growth: growthPct.toFixed(0) });
    } else {
      result += "\n• " + makeToken("calc_out.burn_rate.row.break_even_need_revenue_no_base", "🟡 Need +" + fmt(netBurn) + "/mo revenue (no revenue baseline)", { amount: fmt(netBurn) });
    }
    const cutCostPct = Math.round((netBurn / grossBurn) * 100);
    result += "\n• " + makeToken("calc_out.burn_rate.row.break_even_cut_costs", "Or cut costs by " + fmt(netBurn) + "/mo (e.g., " + cutCostPct + "% of current gross burn)", { amount: fmt(netBurn), pct: String(cutCostPct) });
    result += "\n• " + makeToken("calc_out.burn_rate.row.break_even_runway", "Break-even runway: ∞ (no burn = no runway concern)");
  } else if (netBurn <= 0) {
    result += "\n\n$calc_out.section.burn_rate_break_even|⚖️ Break-Even|\n" + "─".repeat(54);
    result += "\n• " + makeToken("calc_out.burn_rate.row.break_even_already", "🟢 Already at break-even — revenue ≥ expenses. Focus on reinvestment.");
  }

  // 🎯 Burn Milestones (v3)
  if (netBurn > 0 && currentCash > 0) {
    result += "\n\n$calc_out.section.burn_rate_runway_milestones|🎯 Runway Milestones|\n" + "─".repeat(54);
    const milestoneMonths = [6, 12, 18, 24];
    for (const mo of milestoneMonths) {
      const cashNeeded = mo * netBurn;
      let status: string;
      if (currentCash >= cashNeeded) {
        status = "🟢";
      } else if (currentCash >= cashNeeded * 0.7) {
        status = "🟡";
      } else if (currentCash >= cashNeeded * 0.4) {
        status = "🟠";
      } else {
        status = "🔴";
      }
      result += "\n• " + makeToken(
        "calc_out.burn_rate.row.milestone_runway",
        mo + "-month runway:  need $" + Math.round(cashNeeded).toLocaleString() + " cash  (you have: " + fmt(currentCash) + ")  " + status,
        { months: String(mo), needed: Math.round(cashNeeded).toLocaleString(), cash: fmt(currentCash), status: status },
      );
    }
  }

  // 💡 Tip (v3)
  if (netBurn > 5) {
    result += "\n\n💡 Tip: " + JSON.stringify({ code: 'burn_high_burn', params: {} });
  } else if (netBurn > 0) {
    result += "\n\n💡 Tip: " + JSON.stringify({ code: 'burn_positive_burn', params: {} });
  } else {
    result += "\n\n💡 Tip: " + JSON.stringify({ code: 'burn_cashflow_positive', params: {} });
  }


  // 🧭 Decision Recommendation —— P168 B3-0：**已迁到页面的「算完之后」区块**
  //   （src/i18n/locales/{en,zh}.json 的 tools.<slug>.decision_* 四层，双语）
  //   ⇒ 引擎只负责算，决策支持由区块独占 ⇒ 同页不再有两份决策建议。
  //   ⚠️ 引擎里**不要**再写这段：区块与卡片会同时渲染同一件事
  //     （实测同页逐字重叠 7.4%，其中一句话在同页出现 3 次）。
  return [result];
}



const customFn =
  // P168 B3-8：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 两端输出逐字节相同，不可能漂移；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let h=function(_){return Number.isNaN(_)?0:Math.max(0,_)},m=function(_){const r=Math.round(_*20);return"█".repeat(r)+"░".repeat(20-r)},y=function(_){const r=c=>"$"+Math.round(c).toLocaleString(),F=(c,a)=>a>0?(c/a*100).toFixed(1)+"%":"0.0%",l=h(parseFloat(_.monthlyRevenue)||0),x=h(parseFloat(_.teamCost)||0),S=h(parseFloat(_.infraCost)||0),$=h(parseFloat(_.marketingCost)||0),C=h(parseFloat(_.opsCost)||0),s=h(parseFloat(_.currentCash)||0),v=h(parseFloat(_.netNewRevenue)||0),f=x+S+$+C,n=f-l;let e=\`$calc_out.section.burn_rate_cash_flow_health_check|🔥 Cash Flow Health Check|

\`;e+=\`$calc_out.section.burn_rate_burn_summary|💸 Burn Summary|
\`,e+="• $calc_out.label.gross_burn|Gross Burn|:    "+r(f)+\`/mo
\`,e+="• $calc_out.label.net_burn|Net Burn|:      "+r(n)+"/mo",l>0?e+=\`  $calc_out.burn_rate.row.net_burn_gross_minus_revenue|(Gross − Revenue)|
\`:e+=\`  $calc_out.burn_rate.row.net_burn_no_revenue|(no revenue yet)|
\`,e+="• $calc_out.label.annual_burn|Annual Burn|:   "+r(n*12)+\`/yr
\`,n>0&&(e+="• "+t("calc_out.burn_rate.row.to_break_even","To break even: Need +"+r(n)+"/mo more revenue (or cut costs by same amount)",{amount:r(n)})+\`
\`);let w=0;if(e+=\`
$calc_out.section.burn_rate_runway|⏳ Runway|
\`,e+="• $calc_out.label.current_cash|Current Cash|:      "+r(s)+\`
\`,n<=0)e+="• "+t("calc_out.burn_rate.row.status_cashflow_positive","Status:            ✅ Cash-flow positive! No burn concern.")+\`
\`;else if(s<=0)e+="• "+t("calc_out.burn_rate.row.status_no_cash_reserve","Status:            ⚠️ No cash reserve — enter your balance to estimate runway.")+\`
\`;else{w=s/n;const c=new Date,a=new Date(c.getTime()+w*30.44*24*60*60*1e3),u=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][a.getMonth()]+" "+a.getFullYear();e+="• $calc_out.label.remaining_runway|Remaining Runway|:  "+w.toFixed(1)+\` months
\`,e+="• $calc_out.label.est_cash_run_out|Est. Cash Run-out|:   "+u+\`
\`,w>12?e+="• "+t("calc_out.burn_rate.row.assessment_healthy","Assessment:        🟢 Healthy — over a year of runway.")+\`
\`:w>6?e+="• "+t("calc_out.burn_rate.row.assessment_manageable","Assessment:        🟡 Manageable — 6–12 months. Plan ahead.")+\`
\`:w>3?e+="• "+t("calc_out.burn_rate.row.assessment_tight","Assessment:        🟠 Tight — 3–6 months. Cut costs or raise revenue now.")+\`
\`:e+="• "+t("calc_out.burn_rate.row.assessment_critical","Assessment:        🔴 Critical — under 3 months. Immediate action required.")+\`
\`}if(v>0){const c=n/v;e+=\`
$calc_out.section.burn_rate_burn_multiple|📈 Burn Multiple|
\`,e+="• $calc_out.label.net_new_revenue|Net New Revenue|:  "+r(v)+\`/mo
\`,e+="• $calc_out.label.burn_multiple|Burn Multiple|:    "+c.toFixed(1)+"× ",c<1?(e+=\`🟢
\`,e+="• "+t("calc_out.burn_rate.row.insight_great","Insight:          You're adding more revenue than you're burning. Great trajectory!")+\`
\`):c<=2?(e+=\`🟡
\`,e+="• "+t("calc_out.burn_rate.row.insight_moderate","Insight:          Moderate efficiency. Aim to bring this below 1.0×.")+\`
\`):(e+=\`🔴
\`,e+="• "+t("calc_out.burn_rate.row.insight_burning_faster","Insight:          Burning much faster than you're adding revenue. Need to improve efficiency.")+\`
\`)}if(e+=\`
$calc_out.section.burn_rate_default_alive_dead_status|💀 Default Alive/Dead Status|
\`,n<=0?e+="• "+t("calc_out.burn_rate.row.default_alive_cashflow_positive","Status:  ✅ Default Alive: cash-flow positive")+\`
\`:s>0?w>24?e+="• "+t("calc_out.burn_rate.row.default_alive_24plus","Status:  🟢 Default Alive: 24+ months runway")+\`
\`:w>12?e+="• "+t("calc_out.burn_rate.row.default_alive_12_24","Status:  🟡 Default Alive: 12-24 months")+\`
\`:e+="• "+t("calc_out.burn_rate.row.default_dead_under_12","Status:  🔴 Default Dead: under 12 months — need growth or funding to survive")+\`
\`:e+="• "+t("calc_out.burn_rate.row.default_dead_under_12","Status:  🔴 Default Dead: under 12 months — need growth or funding to survive")+\`
\`,f>0){e+=\`
$calc_out.section.burn_rate_cost_structure|📊 Cost Structure|
\`;const c=[["Team","$calc_out.label.team|Team|",x],["Marketing","$calc_out.label.marketing|Marketing|",$],["Infrastructure","$calc_out.label.infrastructure|Infrastructure|",S],["Operations","$calc_out.label.operations|Operations|",C]];for(const[a,i,u]of c)if(u>0){const b=u/f;e+="• "+i+" ".repeat(Math.max(0,14-a.length))+" "+F(u,f).padStart(6)+"  "+m(b)+\`
\`}}const o=n>0&&s>0?s/n:1/0;if(n>0&&s>0){const c=[.1,.2,.3];e+=\`
$calc_out.section.burn_rate_cost_cut_scenarios|🔄 Cost-Cut Scenarios|
\`;for(const a of c){const i=f*a,u=n-i,b=Math.round(a*100)+"%";if(u<=0)e+="• "+t("calc_out.burn_rate.row.cut_scenario_cashflow_positive","Cut "+b+": Save "+r(i)+"/mo — ✅ Cash-flow positive!",{pct:b,savings:r(i)})+\`
\`;else{const g=s/u,N=g-o;e+="• "+t("calc_out.burn_rate.row.cut_scenario","Cut "+b+": Save "+r(i)+"/mo — Net burn "+r(u)+"/mo — Runway "+g.toFixed(1)+" mo (+"+N.toFixed(1)+" extra)",{pct:b,savings:r(i),net_burn:r(u),runway:g.toFixed(1),extra:N.toFixed(1)})+\`
\`}}}const d=\`

$calc_out.section.burn_rate_burn_health|🩺 Burn Health:|
\`+"━".repeat(54)+\`
• \`;if(n<=0?e+=d+t("calc_out.burn_rate.row.burn_health_default_alive","🟢 Default alive — revenue ≥ expenses. No burn. Focus on growth and reinvestment."):s<=0?e+=d+t("calc_out.burn_rate.row.burn_health_no_cash","🔴 No cash. Cannot compute runway. Bootstrap, raise, or shut down."):isFinite(o)&&o<3?e+=d+t("calc_out.burn_rate.row.burn_health_critical","🔴 Runway "+o.toFixed(1)+" months — critical. Raise capital NOW or cut burn 50%+ this month.",{runway:o.toFixed(1)}):isFinite(o)&&o<6?e+=d+t("calc_out.burn_rate.row.burn_health_warning","🟠 Runway "+o.toFixed(1)+" months — warning zone. Start raising or cut burn in next 2 months.",{runway:o.toFixed(1)}):isFinite(o)&&o<12?e+=d+t("calc_out.burn_rate.row.burn_health_adequate","🟡 Runway "+o.toFixed(1)+" months — adequate for now. Plan Series A or accelerate revenue.",{runway:o.toFixed(1)}):e+=d+t("calc_out.burn_rate.row.burn_health_comfortable","🟢 Runway "+o.toFixed(1)+" months — comfortable. Default dead is years away. Focus on growth.",{runway:o.toFixed(1)}),e+=\`

$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|
\`+"━".repeat(54),isFinite(o)&&n>0){const c=s/(n-l*.2),a=s/(n*.8),u=(s+1e6)/n;if(e+=\`
• \`+t("calc_out.burn_rate.row.whatif_raise_revenue_20","Raise revenue 20%:  Runway "+o.toFixed(1)+" → "+c.toFixed(1)+" mo",{from:o.toFixed(1),to:c.toFixed(1)}),e+=\`
• \`+t("calc_out.burn_rate.row.whatif_cut_expenses_20","Cut expenses 20%:  Runway "+o.toFixed(1)+" → "+a.toFixed(1)+" mo",{from:o.toFixed(1),to:a.toFixed(1)}),e+=\`
• \`+t("calc_out.burn_rate.row.whatif_raise_1m","Raise $1M (6-month runway extension at current burn):  "+u.toFixed(1)+" mo",{months:u.toFixed(1)}),e+=\`
• \`+t("calc_out.burn_rate.row.whatif_hit_default_alive","Hit default alive (revenue = expenses):  ∞ runway (focus on growth)"),l>0){const b=(f-l)/l*100;e+=\`
• \`+t("calc_out.burn_rate.row.whatif_growth_needed","Growth needed monthly to break even:  +"+b.toFixed(1)+"% revenue",{pct:b.toFixed(1)})}}else e+=\`
• \`+t("calc_out.burn_rate.row.whatif_cannot_model","⚠️ Cannot model — ensure cash > 0 and net burn > 0.");if(n>0&&s>0){e+=\`

$calc_out.section.burn_rate_break_even|⚖️ Break-Even|
\`+"─".repeat(54);const c=l+n,a=l>0?n/l*100:0;a>0?e+=\`
• \`+t("calc_out.burn_rate.row.break_even_need_revenue","🟡 Need +"+r(n)+"/mo revenue ("+a.toFixed(0)+"% growth) to hit break-even",{amount:r(n),growth:a.toFixed(0)}):e+=\`
• \`+t("calc_out.burn_rate.row.break_even_need_revenue_no_base","🟡 Need +"+r(n)+"/mo revenue (no revenue baseline)",{amount:r(n)});const i=Math.round(n/f*100);e+=\`
• \`+t("calc_out.burn_rate.row.break_even_cut_costs","Or cut costs by "+r(n)+"/mo (e.g., "+i+"% of current gross burn)",{amount:r(n),pct:String(i)}),e+=\`
• \`+t("calc_out.burn_rate.row.break_even_runway","Break-even runway: ∞ (no burn = no runway concern)")}else n<=0&&(e+=\`

$calc_out.section.burn_rate_break_even|⚖️ Break-Even|
\`+"─".repeat(54),e+=\`
• \`+t("calc_out.burn_rate.row.break_even_already","🟢 Already at break-even — revenue ≥ expenses. Focus on reinvestment."));if(n>0&&s>0){e+=\`

$calc_out.section.burn_rate_runway_milestones|🎯 Runway Milestones|
\`+"─".repeat(54);const c=[6,12,18,24];for(const a of c){const i=a*n;let u;s>=i?u="🟢":s>=i*.7?u="🟡":s>=i*.4?u="🟠":u="🔴",e+=\`
• \`+t("calc_out.burn_rate.row.milestone_runway",a+"-month runway:  need $"+Math.round(i).toLocaleString()+" cash  (you have: "+r(s)+")  "+u,{months:String(a),needed:Math.round(i).toLocaleString(),cash:r(s),status:u})}}return n>5?e+=\`

💡 Tip: \`+JSON.stringify({code:"burn_high_burn",params:{}}):n>0?e+=\`

💡 Tip: \`+JSON.stringify({code:"burn_positive_burn",params:{}}):e+=\`

💡 Tip: \`+JSON.stringify({code:"burn_cashflow_positive",params:{}}),[e]},p=function(_,r,F){var l=M(_);return Array.isArray(l)?l.join(\`
\`):String(l)};var A=h,B=m,D=y,O=p,t=tk,R='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',t=new Function("return "+R)(),M=function(_){return y(_)};return[p(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: "solopreneur-burn-rate-calculator",
  title: "Burn Rate Calculator",
  description: "Analyze your monthly cash flow: break down costs by category, calculate runway, and see how cost-cutting extends your survival time.",
  inputs: [
    { name: "monthlyRevenue", label: "Monthly Revenue ($)", placeholder: "e.g. 5000", type: "number" },
    { name: "netNewRevenue", label: "Net New Revenue Added ($/mo)", placeholder: "e.g. 3000 (optional)", type: "number" },
    { name: "teamCost", label: "Team Cost ($/mo)", placeholder: "e.g. 8000", type: "number" },
    { name: "infraCost", label: "Infrastructure & SaaS ($/mo)", placeholder: "e.g. 500", type: "number" },
    { name: "marketingCost", label: "Marketing & Ads ($/mo)", placeholder: "e.g. 2000", type: "number" },
    { name: "opsCost", label: "Operations & Misc ($/mo)", placeholder: "e.g. 1500", type: "number" },
    { name: "currentCash", label: "Current Cash Balance ($)", placeholder: "e.g. 50000", type: "number" },
  ],
  clientConfig: { type: "custom", wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] { return calculateBurnRate(inputs); },
  staticExamples: [
    '$calc_out.section.burn_rate_cash_flow_health_check|🔥 Cash Flow Health Check|\n\n$calc_out.section.burn_rate_burn_summary|💸 Burn Summary|\n• $calc_out.label.gross_burn|Gross Burn|:    $12,000/mo\n• $calc_out.label.net_burn|Net Burn|:      $7,000/mo  $calc_out.burn_rate.row.net_burn_gross_minus_revenue|(Gross − Revenue)|\n• $calc_out.label.annual_burn|Annual Burn|:   $84,000/yr\n• $calc_out.burn_rate.row.to_break_even{"amount":"$7,000"}|To break even: Need +$7,000/mo more revenue (or cut costs by same amount)|\n\n$calc_out.section.burn_rate_runway|⏳ Runway|\n• $calc_out.label.current_cash|Current Cash|:      $50,000\n• $calc_out.label.remaining_runway|Remaining Runway|:  7.1 months\n• $calc_out.label.est_cash_run_out|Est. Cash Run-out|:   Feb 2027\n• $calc_out.burn_rate.row.assessment_manageable|Assessment:        🟡 Manageable — 6–12 months. Plan ahead.|\n\n$calc_out.section.burn_rate_burn_multiple|📈 Burn Multiple|\n• $calc_out.label.net_new_revenue|Net New Revenue|:  $3,000/mo\n• $calc_out.label.burn_multiple|Burn Multiple|:    2.3× 🔴\n• $calc_out.burn_rate.row.insight_burning_faster|Insight:          Burning much faster than you\'re adding revenue. Need to improve efficiency.|\n\n$calc_out.section.burn_rate_default_alive_dead_status|💀 Default Alive/Dead Status|\n• $calc_out.burn_rate.row.default_dead_under_12|Status:  🔴 Default Dead: under 12 months — need growth or funding to survive|\n\n$calc_out.section.burn_rate_cost_structure|📊 Cost Structure|\n• $calc_out.label.team|Team|            66.7%  █████████████░░░░░░░\n• $calc_out.label.marketing|Marketing|       16.7%  ███░░░░░░░░░░░░░░░░░\n• $calc_out.label.infrastructure|Infrastructure|   4.2%  █░░░░░░░░░░░░░░░░░░░\n• $calc_out.label.operations|Operations|      12.5%  ███░░░░░░░░░░░░░░░░░\n\n$calc_out.section.burn_rate_cost_cut_scenarios|🔄 Cost-Cut Scenarios|\n• $calc_out.burn_rate.row.cut_scenario{"pct":"10%","savings":"$1,200","net_burn":"$5,800","runway":"8.6","extra":"1.5"}|Cut 10%: Save $1,200/mo — Net burn $5,800/mo — Runway 8.6 mo (+1.5 extra)|\n• $calc_out.burn_rate.row.cut_scenario{"pct":"20%","savings":"$2,400","net_burn":"$4,600","runway":"10.9","extra":"3.7"}|Cut 20%: Save $2,400/mo — Net burn $4,600/mo — Runway 10.9 mo (+3.7 extra)|\n• $calc_out.burn_rate.row.cut_scenario{"pct":"30%","savings":"$3,600","net_burn":"$3,400","runway":"14.7","extra":"7.6"}|Cut 30%: Save $3,600/mo — Net burn $3,400/mo — Runway 14.7 mo (+7.6 extra)|\n\n\n$calc_out.section.burn_rate_burn_health|🩺 Burn Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.burn_rate.row.burn_health_adequate{"runway":"7.1"}|🟡 Runway 7.1 months — adequate for now. Plan Series A or accelerate revenue.|\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.burn_rate.row.whatif_raise_revenue_20{"from":"7.1","to":"8.3"}|Raise revenue 20%:  Runway 7.1 → 8.3 mo|\n• $calc_out.burn_rate.row.whatif_cut_expenses_20{"from":"7.1","to":"8.9"}|Cut expenses 20%:  Runway 7.1 → 8.9 mo|\n• $calc_out.burn_rate.row.whatif_raise_1m{"months":"150.0"}|Raise $1M (6-month runway extension at current burn):  150.0 mo|\n• $calc_out.burn_rate.row.whatif_hit_default_alive|Hit default alive (revenue = expenses):  ∞ runway (focus on growth)|\n• $calc_out.burn_rate.row.whatif_growth_needed{"pct":"140.0"}|Growth needed monthly to break even:  +140.0% revenue|\n\n$calc_out.section.burn_rate_break_even|⚖️ Break-Even|\n──────────────────────────────────────────────────────\n• $calc_out.burn_rate.row.break_even_need_revenue{"amount":"$7,000","growth":"140"}|🟡 Need +$7,000/mo revenue (140% growth) to hit break-even|\n• $calc_out.burn_rate.row.break_even_cut_costs{"amount":"$7,000","pct":"58"}|Or cut costs by $7,000/mo (e.g., 58% of current gross burn)|\n• $calc_out.burn_rate.row.break_even_runway|Break-even runway: ∞ (no burn = no runway concern)|\n\n$calc_out.section.burn_rate_runway_milestones|🎯 Runway Milestones|\n──────────────────────────────────────────────────────\n• $calc_out.burn_rate.row.milestone_runway{"months":"6","needed":"42,000","cash":"$50,000","status":"🟢"}|6-month runway:  need $42,000 cash  (you have: $50,000)  🟢|\n• $calc_out.burn_rate.row.milestone_runway{"months":"12","needed":"84,000","cash":"$50,000","status":"🟠"}|12-month runway:  need $84,000 cash  (you have: $50,000)  🟠|\n• $calc_out.burn_rate.row.milestone_runway{"months":"18","needed":"126,000","cash":"$50,000","status":"🔴"}|18-month runway:  need $126,000 cash  (you have: $50,000)  🔴|\n• $calc_out.burn_rate.row.milestone_runway{"months":"24","needed":"168,000","cash":"$50,000","status":"🔴"}|24-month runway:  need $168,000 cash  (you have: $50,000)  🔴|\n\n💡 Tip: {"code":"burn_high_burn","params":{}}',
  ],
  faq: [
    { q: "What is the difference between gross burn and net burn?", a: "Gross burn is total monthly operating expenses before revenue. Net burn = gross burn − monthly revenue. For example, if you spend $12K/month and earn $5K/month, gross burn is $12K, net burn is $7K. Track both — gross burn shows spending discipline, net burn shows how fast your bank account actually shrinks." },
    { q: "What is Burn Multiple and what's a good number?", a: "Burn Multiple = Net Burn / Net New Revenue Added. It measures how efficiently you're converting burn into revenue growth. <1.0x is great (revenue growing faster than burn), 1.0–2.0x is moderate, >2.0x means you're burning much faster than you're growing — time to improve unit economics or cut costs. Leave net new revenue blank if you don't track it yet." },
    { q: "What is a healthy runway for an early-stage business?", a: "18-24 months is the gold standard after a fundraise. For bootstrapped entrepreneurs, 6-12 months is healthy. Under 3 months is critical — you need to act immediately on either cost-cutting or revenue generation." },
    { q: "Which cost category typically matters most?", a: "Team/personnel costs are almost always the largest expense (50-70% of burn). If you need to cut quickly, headcount is the biggest lever. For SaaS tools, audit subscriptions quarterly — most people are paying for tools they stopped using months ago." },
    { q: "How often should I recalculate my burn rate?", a: "Monthly, when you close your books. Set up a simple spreadsheet or use accounting software. If your net burn is trending up month-over-month, investigate immediately — cost creep is easy to miss." },
    { q: "What if I have irregular revenue?", a: "Use the average of the last 3-6 months for the monthly revenue field. If you are pre-revenue, leave it at 0 to see your worst-case burn. Run a second scenario with your conservative revenue estimate to compare." },

    { q: "How do I calculate runway from burn rate?", a: "Runway (months) = cash_on_hand / monthly_net_burn. For $1M cash, $100K net burn: 10 months runway. Track: 1) Cash on hand (last bank statement), 2) Net burn (last 3-6 month average), 3) Adjust for new revenue/costs. Most: 18+ months runway is healthy. <6 months: critical. 6-12: cautious. 12-18: healthy. 18+: great. Update monthly. Plan: fundraising, cost cuts, or revenue acceleration." },
    { q: "What is a healthy burn multiple?", a: "Burn multiple = net burn / net new ARR. Measures capital efficiency. Benchmarks: 1) <0.5x: capital efficient, 2) 0.5-1x: healthy, 3) 1-2x: average, 4) 2-3x: concerning, 5) >3x: inefficient. Best option: <1x. For $100K net burn, $200K new ARR: 0.5x. 0.3-0.5x. Investors: key efficiency metric. Most teams 0.7-1.5x. Target: <1x." },
    { q: "How do I extend my runway without raising?", a: "1) Cut non-essential costs (audit subscriptions, freeze hiring), 2) Renegotiate vendor contracts, 3) Convert fixed to variable (3PL vs in-house), 4) Slow growth (target profitability), 5) Pre-sell annual contracts, 6) Issue invoices early. 20-50% cost reduction possible. Time: 1-3 months. Use 18-month runway = default to profitability. Avoid 1 round away from zero." },
    { q: "What is a good burn rate for an early-stage startup?", a: "Depends on stage: 1) Pre-seed: $20-50K/month, 2) Seed: $50-150K, 3) Series A: $150-500K, 4) Series B: $500K-2M. stage-appropriate. For $5M raised: burn $200-300K/month, 18-24 month runway. Track burn/capital ratio. Aim for 60-70% of capital on people, 10-20% on product/engineering, 10-20% on sales/marketing, 5-10% G&A. Optimize: highest-ROI spend." },
    { q: "Should I optimize for growth or profitability?", a: "Depends on stage + capital. 1) Pre-PMF: optimize for learning, 2) Post-PMF, pre-scale: optimize for growth, 3) Series B+: optimize for efficiency, 4) Pre-IPO: optimize for profitability. Trade-off: growth = more revenue, more burn, more dilution. Profitability = less growth, less dilution. Most VC-backed: growth > profitability. Bootstrapped: profitability > growth. Choose: by stage, capital, market." },
    { q: "How do I forecast burn rate accurately?", a: "Forecast: 1) Fixed costs (salaries, rent, SaaS), 2) Variable costs (sales, marketing, support), 3) Revenue (deals, churn, expansion). For 12-month model: monthly build. Most: bottom-up (per line item). Top-down: market benchmarks (e.g., $X per employee). Tools: Carta, Fathom, custom. Update monthly. Compare actual vs forecast. Improve accuracy: track variance, adjust assumptions." },
    { q: "What is the difference between cash burn and accounting burn?", a: "Cash burn: actual cash going out. Accounting burn: net loss (P&L basis). Difference: 1) Timing (accounts receivable, payable), 2) Depreciation/amortization (non-cash), 3) Stock-based compensation. For runway: use cash burn. For valuation: use accounting burn. Most: cash burn is the true number. For SaaS: difference is 5-15% typically. Use cash burn for runway calculation." },
  ],
  howToUse: [
    "Enter your average monthly revenue (leave at 0 if pre-revenue).",
    "Optionally enter Net New Revenue Added — the month-over-month revenue growth you're achieving — to see your Burn Multiple.",
    "Fill in your team costs — salaries, contractors, benefits.",
    "Add up all SaaS subscriptions and cloud hosting as Infrastructure.",
    "Include ad spend, content marketing, and tool subscriptions as Marketing.",
    "Enter remaining costs (rent, legal, insurance, travel) as Operations.",
    "Enter your current cash balance to calculate runway and run-out date.",
    "Review the Burn Multiple to see how efficiently you're converting spend into growth.",
    "Check the Default Alive/Dead verdict to understand your overall survival outlook.",
    "Review the cost structure chart to see which category is eating the most cash.",
    "Check the what-if scenario to see how cost-cutting extends your runway.",
  ],
  engineKey: true,
  // P140f-p3-T6: 完整 6 字段 playbook (per P140f §4.3 + ADR-0005)
  // Goal 含"该不该"双关键词 → 通过 T1 zod refine 校验 (决策/decision/该不该/是否)
  // 内容 = 页面决策区块四层（en.json / zh.json 的 tools.<slug>.decision_*）的英文原文
  // ⇒ 引擎输出里不再重复这一段（区块独占），两处改一处就会漂 ⇒ 守卫盯着。
  playbook: {
    goal: 'Should you raise capital now, cut costs, or keep investing in growth? Runway alone does not answer that - the decision depends on how much cash you hold, how fast you burn, and whether each new dollar of spend produces more than a dollar of new revenue. Use this calculator to decide which move comes next.',
    input: 'currentCash (>=0) + monthlyRevenue (>=0) + teamCost / infraCost / marketingCost / opsCost (>=0 each) + optional netNewRevenue for the burn multiple',
    output: 'runway in months + health band (green >18 mo / yellow 12-18 / orange 6-12 / red <6) + Default Alive/Dead verdict + burn multiple + break-even gap + cost-cut scenarios',
    constraint: 'Unreliable when cash includes committed-but-unreceived money, when net burn contains a one-off item that will not repeat, when monthly revenue is a single good month rather than a 3-6 month average, or when you are pre-revenue (runway is then a worst case, not a forecast). Runway is a point-in-time number and moves every time you close the books.',
    tool: 'MRR Calculator for the revenue trend, and Burn Multiple & Rule of 40 Calculator for whether each new dollar of spend buys more than a dollar of new revenue',
    memory: 'OpenView 2024 SaaS runway benchmark + ICONIQ Growth 2024 burn multiple benchmark + YC default alive/dead thresholds',
  },
};
registerEngine(engine);

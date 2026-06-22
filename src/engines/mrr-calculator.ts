import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateMRR(inputs: Record<string, string>): string[] {
  const subs = parseInt(inputs.subscriberCount) || 0;
  const price = parseFloat(inputs.monthlyPrice) || 0;
  const churnRate = parseFloat(inputs.monthlyChurnRate) || 0;
  const expansionMRR = parseFloat(inputs.expansionMRR) || 0;
  const newSubs = parseInt(inputs.newSubsPerMonth) || 0;
  const contractionMRR = parseFloat(inputs.contractionMRR) || 0;
  const reactivationMRR = parseFloat(inputs.reactivationMRR) || 0;

  const fmt = (n: number) => "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (n: number) => n.toFixed(1) + "%";
  const maybeNeg = (n: number) => n >= 0 ? "+" + fmt(n) : fmt(n);

  const startingMRR = subs * price;
  const newMRR = newSubs * price;
  const churnedMRR = subs * (churnRate / 100) * price;
  const endingMRR = startingMRR + newMRR + expansionMRR + reactivationMRR - contractionMRR - churnedMRR;
  const netChange = endingMRR - startingMRR;
  const growthRate = startingMRR > 0 ? (netChange / startingMRR) * 100 : 0;

  // Key metrics
  const nrr = startingMRR > 0 ? (startingMRR + expansionMRR - contractionMRR - churnedMRR) / startingMRR * 100 : null;
  const grr = startingMRR > 0 ? (startingMRR - contractionMRR - churnedMRR) / startingMRR * 100 : null;
  const lossesTotal = contractionMRR + churnedMRR;
  const quickRatio = lossesTotal > 0 ? (newMRR + expansionMRR + reactivationMRR) / lossesTotal : null;
  const maxMRR = churnRate > 0 ? newMRR / (churnRate / 100) : null;

  // Contraction health
  const cteRatio = expansionMRR > 0 ? contractionMRR / expansionMRR * 100 : null;

  // Date helpers
  const today = new Date();
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dateLabel = (monthsFromNow: number) => {
    const d = new Date(today.getTime() + monthsFromNow * 30.44 * 86400000);
    return monthNames[d.getMonth()] + " " + d.getFullYear();
  };

  let result = "📊 MRR Health Dashboard\n\n";

  // ═══ 1. MRR Snapshot ═══
  result += "💰 MRR Snapshot\n";
  result += "• Starting MRR:      " + fmt(startingMRR) + "\n";
  result += "• Ending MRR:        " + fmt(endingMRR) + "  (after 1 month)\n";
  result += "• ARR (×12):         " + fmt(startingMRR * 12) + "\n";
  result += "• Subscribers:       " + subs.toLocaleString() + "  @ " + fmt(price) + "/mo\n";
  if (startingMRR > 0) {
    result += "• Monthly Growth:    " + (growthRate >= 0 ? "+" : "") + pct(growthRate) + "\n";
  }

  // ═══ 2. MRR Waterfall ═══
  result += "\n📈 MRR Waterfall\n";
  result += "  Starting MRR:       " + fmt(startingMRR).padStart(10) + "\n";
  result += "  + New MRR:         +" + fmt(newMRR).padStart(9) + "  (" + newSubs + " new subs × " + fmt(price) + ")\n";
  result += "  + Expansion MRR:   +" + fmt(expansionMRR).padStart(9) + "  (upgrades & add-ons)\n";
  result += "  + Reactivation:    +" + fmt(reactivationMRR).padStart(9) + "  (returned customers)\n";
  result += "  − Contraction:     −" + fmt(contractionMRR).padStart(9) + "  (downgrades)\n";
  result += "  − Churn:           −" + fmt(churnedMRR).padStart(9) + "  (" + pct(churnRate) + " of " + subs.toLocaleString() + " subs)\n";
  result += "  = Ending MRR:       " + fmt(endingMRR).padStart(10) + "\n";
  result += "  Net Change:         " + maybeNeg(netChange).padStart(10) + "  (" + (growthRate >= 0 ? "+" : "") + pct(growthRate) + " MoM)\n";

  // Growth assessment
  if (startingMRR <= 0) {
    result += "  Assessment:         ⚠️  Enter subscribers and price to see growth analysis.\n";
  } else if (growthRate >= 10) {
    result += "  Assessment:         🟢 Excellent — 10%+ MoM growth is top-tier.\n";
  } else if (growthRate >= 5) {
    result += "  Assessment:         🟡 Healthy — 5–10% MoM. Sustainable trajectory.\n";
  } else if (growthRate >= 0) {
    result += "  Assessment:         🟠 Slow — under 5% MoM. Fix acquisition or retention.\n";
  } else {
    result += "  Assessment:         🔴 Shrinking — negative net MRR. Act now.\n";
  }

  // ═══ 3. Key SaaS Metrics ═══
  result += "\n📐 Key SaaS Metrics\n";
  if (nrr !== null) {
    let nrrColor: string;
    if (nrr >= 120) nrrColor = "🟢 Exceptional — growing 20%+ from existing customers";
    else if (nrr >= 110) nrrColor = "🟢 Best-in-class — above 110% NRR";
    else if (nrr >= 100) nrrColor = "🟡 Positive — existing base growing slightly";
    else nrrColor = "🟠 Shrinking — losing revenue from existing customers";
    result += "• NRR (Net Revenue Retention):  " + pct(nrr) + "  " + nrrColor + "\n";
    // GRR
    let grrColor: string;
    if (grr! >= 90) grrColor = "🟢 >90% is healthy";
    else if (grr! >= 80) grrColor = "🟡 80–90% — watch for trends";
    else grrColor = "🟠 <80% — retention needs attention";
    result += "• GRR (Gross Revenue Retention): " + pct(grr!) + "  " + grrColor + "\n";
  } else {
    result += "• NRR: — (enter subscribers and price to calculate)\n";
    result += "• GRR: —\n";
  }
  // Quick Ratio
  if (quickRatio !== null) {
    let qrColor: string;
    if (quickRatio >= 4) qrColor = "🟢 >4 is highly efficient";
    else if (quickRatio >= 2) qrColor = "🟡 2–4 is OK";
    else if (quickRatio >= 1) qrColor = "🟠 1–2 is weak";
    else qrColor = "🔴 <1 — you are shrinking";
    result += "• SaaS Quick Ratio:              " + quickRatio.toFixed(1) + "x  " + qrColor + "\n";
  } else {
    result += "• SaaS Quick Ratio:              ∞  🟢 No contraction or churn losses!\n";
  }
  // Max MRR
  if (maxMRR !== null) {
    result += "• Growth Ceiling (Max MRR):      " + fmt(maxMRR) + "/mo  at " + pct(churnRate) + " churn\n";
    // Insight: halving churn doubles ceiling
    const halfChurnCeiling = newMRR / ((churnRate / 2) / 100);
    result += "  → Halving churn to " + pct(churnRate / 2) + " would lift ceiling to " + fmt(halfChurnCeiling) + "/mo\n";
  } else {
    result += "• Growth Ceiling (Max MRR):      ∞  (no churn — unlimited growth)\n";
  }

  // ═══ 4. Churn & Contraction Health ═══
  result += "\n🩺 Churn & Contraction Health\n";
  // Churn part (existing logic)
  if (churnRate <= 0 && subs > 0) {
    result += "• Monthly Churn:     " + pct(churnRate) + " — ✅ No churn detected.\n";
  } else if (churnRate > 0 && churnRate <= 2) {
    result += "• Monthly Churn:     " + pct(churnRate) + " — 🟢 Great. Under 2% is best-in-class.\n";
  } else if (churnRate <= 3) {
    result += "• Monthly Churn:     " + pct(churnRate) + " — 🟡 Good for SMB SaaS. Aim for under 2%.\n";
  } else if (churnRate <= 5) {
    result += "• Monthly Churn:     " + pct(churnRate) + " — 🟠 Elevated. Every point you reduce compounds.\n";
  } else if (churnRate > 5) {
    result += "• Monthly Churn:     " + pct(churnRate) + " — 🔴 Critical. Retention is your #1 problem.\n";
  } else {
    result += "• Monthly Churn:     " + pct(churnRate) + "\n";
  }
  if (churnRate > 0 && subs > 0) {
    const churnedCount = Math.round(subs * churnRate / 100);
    const annualRetention = Math.pow(1 - churnRate / 100, 12) * 100;
    result += "• Subs Lost/Mo:      ~" + churnedCount + " of " + subs.toLocaleString() + "\n";
    result += "• Annual Retention:  " + annualRetention.toFixed(1) + "% (after 12 months of churn)\n";
  }
  // Contraction part
  if (contractionMRR > 0) {
    result += "• Contraction MRR:   " + fmt(contractionMRR) + "\n";
    if (expansionMRR <= 0) {
      result += "  → 🔴 Contraction with no expansion — investigate immediately.\n";
    } else if (cteRatio !== null && cteRatio > 100) {
      result += "  → 🔴 Contraction exceeds expansion — value delivery problem.\n";
    } else if (cteRatio !== null && cteRatio > 50) {
      result += "  → 🟠 Contraction eats " + cteRatio.toFixed(0) + "% of expansion — watch closely.\n";
    } else {
      result += "  → 🟢 Contraction at " + (cteRatio !== null ? cteRatio.toFixed(0) : "—") + "% of expansion — well-managed.\n";
    }
  } else {
    result += "• Contraction MRR:   $0.00 — ✅ No contraction. All revenue losses are from full churn.\n";
  }

  // ═══ 5. MRR Milestone Projections ═══
  if (startingMRR > 0 && netChange !== 0) {
    result += "\n🎯 MRR Milestone Projections\n";
    result += "   (assuming constant net change of " + maybeNeg(netChange) + "/mo)\n";
    const milestones = netChange > 0
      ? [5000, 10000, 20000, 50000, 100000]
      : [5000, 10000, 20000, 50000, 100000].filter(m => m < startingMRR);
    let anyShown = false;
    for (const milestone of milestones) {
      if (netChange > 0 && startingMRR >= milestone) continue;
      if (netChange < 0 && startingMRR <= milestone) continue;
      const monthsToReach = Math.abs((milestone - startingMRR) / netChange);
      if (monthsToReach > 120) continue;
      result += "• " + fmt(milestone) + " MRR:  " + monthsToReach.toFixed(1) + " months  (~" + dateLabel(monthsToReach) + ")\n";
      anyShown = true;
    }
    if (!anyShown) {
      result += "• All standard milestones reached or beyond projection range.\n";
    }
  } else if (startingMRR > 0 && netChange === 0) {
    result += "\n🎯 MRR Milestone Projections\n";
    result += "• Net change is zero — MRR is flat. Add growth inputs to see projections.\n";
  }

  // ═══ 6. What-If Scenarios ═══
  if (startingMRR > 0) {
    result += "\n🔄 What-If Scenarios\n";

    // Scenario A: Reduce churn
    if (churnRate > 1 && maxMRR !== null) {
      const newChurn = Math.max(1, churnRate - 2); // target 2pp lower, min 1%
      const newMaxMRR = newMRR / (newChurn / 100);
      const annualGain = (newMaxMRR - maxMRR) * 12;
      result += "• If churn drops " + pct(churnRate) + " → " + pct(newChurn) + ":\n";
      result += "  Max MRR: " + fmt(maxMRR) + " → " + fmt(newMaxMRR) + " (+" + fmt(newMaxMRR - maxMRR) + ")\n";
      if (annualGain > 0) {
        result += "  Annual revenue potential: +" + fmt(annualGain) + "\n";
      }
    } else if (churnRate > 0 && churnRate <= 1 && maxMRR !== null) {
      result += "• Churn is already very low at " + pct(churnRate) + " — keep it up! Max MRR: " + fmt(maxMRR) + "/mo.\n";
    }

    // Scenario B: Boost expansion to 25% of new MRR
    const targetExpansion = newMRR * 0.25;
    if (newMRR > 0) {
      if (expansionMRR >= targetExpansion) {
        const currentPct = newMRR > 0 ? (expansionMRR / newMRR * 100).toFixed(0) : "—";
        result += "• Expansion at " + currentPct + "% of new MRR — ✅ already exceeding 25% target.\n";
      } else {
        const gap = targetExpansion - expansionMRR;
        const newNRR = nrr !== null ? (startingMRR + targetExpansion - contractionMRR - churnedMRR) / startingMRR * 100 : null;
        result += "• If expansion grows to 25% of new MRR:\n";
        result += "  Target Expansion: " + fmt(targetExpansion) + "/mo (+" + fmt(gap) + " needed)\n";
        if (nrr !== null && newNRR !== null) {
          result += "  NRR would rise: " + pct(nrr) + " → " + pct(newNRR) + "\n";
        }
      }
    }

    // Scenario C: Halve contraction
    if (contractionMRR > 0) {
      const savings = contractionMRR / 2;
      const newNetChange = netChange + savings;
      const newNRR = nrr !== null ? (startingMRR + expansionMRR - savings - churnedMRR) / startingMRR * 100 : null;
      result += "• If contraction is cut by 50%:\n";
      result += "  Savings: +" + fmt(savings) + "/mo\n";
      result += "  Net Change improves: " + maybeNeg(netChange) + " → " + maybeNeg(newNetChange) + "/mo";
      if (netChange !== 0) {
        const pctImprove = Math.abs((newNetChange - netChange) / netChange * 100);
        result += " (+" + pctImprove.toFixed(0) + "%)";
      }
      result += "\n";
      if (nrr !== null && newNRR !== null) {
        result += "  NRR improves: " + pct(nrr) + " → " + pct(newNRR) + "\n";
      }
    }
  }

  // ═══ 7. Break-Even Growth ═══
  if (startingMRR > 0 && price > 0) {
    const breakEvenSubs = Math.ceil((churnedMRR + contractionMRR - expansionMRR - reactivationMRR) / price);
    const breakEvenNote = breakEvenSubs < 0
      ? "• 🟢 Break-even below 0 — your expansion + reactivation already outpaces losses."
      : newSubs >= breakEvenSubs
        ? "• 🟢 Break-even new subs/mo: " + breakEvenSubs + "  — you're growing above break-even (" + newSubs + " actual)."
        : "• 🔴 Break-even new subs/mo: " + breakEvenSubs + "  — you're below break-even (" + newSubs + " actual). MRR is shrinking.";
    result += "\n⚖️ Break-Even Growth\n" + breakEvenNote + "\n";
  }

  // ═══ 8. Tip ═══
  let tip: string;
  if (nrr !== null && nrr >= 110) {
    tip = "💡 Tip: Best-in-class NRR — protect the expansion motion that drives it. Don't fix what isn't broken.";
  } else if (churnRate < 2 && churnRate > 0) {
    tip = "💡 Tip: Sub-2% churn is your unfair advantage. Don't raise prices until you've maxed expansion revenue per account.";
  } else if (churnRate >= 5) {
    tip = "💡 Tip: Lowering churn from " + churnRate.toFixed(1) + "% to 3% roughly doubles customer lifetime. Retention is your #1 lever right now.";
  } else {
    tip = "💡 Tip: Track your Quick Ratio weekly — above 4 means growth is efficient. Below 2 means you're scaling losses faster than gains.";
  }
  result += "\n" + tip + "\n";

  return [result];
}

// customFn — byte-for-byte equivalent of calculateMRR for client-side execution
const customFn =
  "var subs=parseInt(inputs.subscriberCount)||0;" +
  "var price=parseFloat(inputs.monthlyPrice)||0;" +
  "var churnRate=parseFloat(inputs.monthlyChurnRate)||0;" +
  "var expansionMRR=parseFloat(inputs.expansionMRR)||0;" +
  "var newSubs=parseInt(inputs.newSubsPerMonth)||0;" +
  "var contractionMRR=parseFloat(inputs.contractionMRR)||0;" +
  "var reactivationMRR=parseFloat(inputs.reactivationMRR)||0;" +
  "function fmt(n){return '$'+n.toLocaleString(void 0,{minimumFractionDigits:2,maximumFractionDigits:2})}" +
  "function pct(n){return n.toFixed(1)+'%'}" +
  "function mn(n){return n>=0?'+'+fmt(n):fmt(n)}" +
  "var startingMRR=subs*price;" +
  "var newMRR=newSubs*price;" +
  "var churnedMRR=subs*(churnRate/100)*price;" +
  "var endingMRR=startingMRR+newMRR+expansionMRR+reactivationMRR-contractionMRR-churnedMRR;" +
  "var netChange=endingMRR-startingMRR;" +
  "var growthRate=startingMRR>0?(netChange/startingMRR)*100:0;" +
  "var nrr=startingMRR>0?(startingMRR+expansionMRR-contractionMRR-churnedMRR)/startingMRR*100:null;" +
  "var grr=startingMRR>0?(startingMRR-contractionMRR-churnedMRR)/startingMRR*100:null;" +
  "var lossesTotal=contractionMRR+churnedMRR;" +
  "var quickRatio=lossesTotal>0?(newMRR+expansionMRR+reactivationMRR)/lossesTotal:null;" +
  "var maxMRR=churnRate>0?newMRR/(churnRate/100):null;" +
  "var cteRatio=expansionMRR>0?contractionMRR/expansionMRR*100:null;" +
  "var today=new Date();var mnths=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];" +
  "function dl(m){var d=new Date(today.getTime()+m*30.44*86400000);return mnths[d.getMonth()]+' '+d.getFullYear()}" +
  "var r='\\uD83D\\uDCCA MRR Health Dashboard\\n\\n';" +
  // 1. Snapshot
  "r+='\\uD83D\\uDCB0 MRR Snapshot\\n';" +
  "r+='\\u2022 Starting MRR:      '+fmt(startingMRR)+'\\n';" +
  "r+='\\u2022 Ending MRR:        '+fmt(endingMRR)+'  (after 1 month)\\n';" +
  "r+='\\u2022 ARR (\\u00d712):         '+fmt(startingMRR*12)+'\\n';" +
  "r+='\\u2022 Subscribers:       '+subs.toLocaleString()+'  @ '+fmt(price)+'/mo\\n';" +
  "if(startingMRR>0){r+='\\u2022 Monthly Growth:    '+(growthRate>=0?'+':'')+pct(growthRate)+'\\n';}" +
  // 2. Waterfall
  "r+='\\n\\uD83D\\uDCC8 MRR Waterfall\\n';" +
  "r+='  Starting MRR:       '+('          '+fmt(startingMRR)).slice(-10)+'\\n';" +
  "r+='  + New MRR:         +'+('         '+fmt(newMRR)).slice(-9)+'  ('+newSubs+' new subs \\u00d7 '+fmt(price)+')\\n';" +
  "r+='  + Expansion MRR:   +'+('         '+fmt(expansionMRR)).slice(-9)+'  (upgrades & add-ons)\\n';" +
  "r+='  + Reactivation:    +'+('         '+fmt(reactivationMRR)).slice(-9)+'  (returned customers)\\n';" +
  "r+='  \\u2212 Contraction:     \\u2212'+('         '+fmt(contractionMRR)).slice(-9)+'  (downgrades)\\n';" +
  "r+='  \\u2212 Churn:           \\u2212'+('         '+fmt(churnedMRR)).slice(-9)+'  ('+pct(churnRate)+' of '+subs.toLocaleString()+' subs)\\n';" +
  "r+='  = Ending MRR:       '+('          '+fmt(endingMRR)).slice(-10)+'\\n';" +
  "r+='  Net Change:         '+('          '+mn(netChange)).slice(-10)+'  ('+(growthRate>=0?'+':'')+pct(growthRate)+' MoM)\\n';" +
  "if(startingMRR<=0){r+='  Assessment:         \\u26a0\\ufe0f  Enter subscribers and price to see growth analysis.\\n';}" +
  "else if(growthRate>=10){r+='  Assessment:         \\uD83D\\uDFE2 Excellent \\u2014 10%+ MoM growth is top-tier.\\n';}" +
  "else if(growthRate>=5){r+='  Assessment:         \\uD83D\\uDFE1 Healthy \\u2014 5\\u201310% MoM. Sustainable trajectory.\\n';}" +
  "else if(growthRate>=0){r+='  Assessment:         \\uD83D\\uDFE0 Slow \\u2014 under 5% MoM. Fix acquisition or retention.\\n';}" +
  "else{r+='  Assessment:         \\uD83D\\uDD34 Shrinking \\u2014 negative net MRR. Act now.\\n';}" +
  // 3. Key SaaS Metrics
  "r+='\\n\\uD83D\\uDCD0 Key SaaS Metrics\\n';" +
  "if(nrr!==null){" +
  "var nc;if(nrr>=120)nc='\\uD83D\\uDFE2 Exceptional \\u2014 growing 20%+ from existing customers';" +
  "else if(nrr>=110)nc='\\uD83D\\uDFE2 Best-in-class \\u2014 above 110% NRR';" +
  "else if(nrr>=100)nc='\\uD83D\\uDFE1 Positive \\u2014 existing base growing slightly';" +
  "else nc='\\uD83D\\uDFE0 Shrinking \\u2014 losing revenue from existing customers';" +
  "r+='\\u2022 NRR (Net Revenue Retention):  '+pct(nrr)+'  '+nc+'\\n';" +
  "var gc;if(grr>=90)gc='\\uD83D\\uDFE2 >90% is healthy';" +
  "else if(grr>=80)gc='\\uD83D\\uDFE1 80\\u201390% \\u2014 watch for trends';" +
  "else gc='\\uD83D\\uDFE0 <80% \\u2014 retention needs attention';" +
  "r+='\\u2022 GRR (Gross Revenue Retention): '+pct(grr)+'  '+gc+'\\n';" +
  "}else{r+='\\u2022 NRR: \\u2014 (enter subscribers and price to calculate)\\n';r+='\\u2022 GRR: \\u2014\\n';}" +
  "if(quickRatio!==null){" +
  "var qc;if(quickRatio>=4)qc='\\uD83D\\uDFE2 >4 is highly efficient';" +
  "else if(quickRatio>=2)qc='\\uD83D\\uDFE1 2\\u20134 is OK';" +
  "else if(quickRatio>=1)qc='\\uD83D\\uDFE0 1\\u20132 is weak';" +
  "else qc='\\uD83D\\uDD34 <1 \\u2014 you are shrinking';" +
  "r+='\\u2022 SaaS Quick Ratio:              '+quickRatio.toFixed(1)+'x  '+qc+'\\n';" +
  "}else{r+='\\u2022 SaaS Quick Ratio:              \\u221e  \\uD83D\\uDFE2 No contraction or churn losses!\\n';}" +
  "if(maxMRR!==null){" +
  "r+='\\u2022 Growth Ceiling (Max MRR):      '+fmt(maxMRR)+'/mo  at '+pct(churnRate)+' churn\\n';" +
  "var hcc=newMRR/((churnRate/2)/100);" +
  "r+='  \\u2192 Halving churn to '+pct(churnRate/2)+' would lift ceiling to '+fmt(hcc)+'/mo\\n';" +
  "}else{r+='\\u2022 Growth Ceiling (Max MRR):      \\u221e  (no churn \\u2014 unlimited growth)\\n';}" +
  // 4. Churn & Contraction Health
  "r+='\\n\\uD83E\\uDE7A Churn & Contraction Health\\n';" +
  "if(churnRate<=0&&subs>0){r+='\\u2022 Monthly Churn:     '+pct(churnRate)+' \\u2014 \\u2705 No churn detected.\\n';}" +
  "else if(churnRate>0&&churnRate<=2){r+='\\u2022 Monthly Churn:     '+pct(churnRate)+' \\u2014 \\uD83D\\uDFE2 Great. Under 2% is best-in-class.\\n';}" +
  "else if(churnRate<=3){r+='\\u2022 Monthly Churn:     '+pct(churnRate)+' \\u2014 \\uD83D\\uDFE1 Good for SMB SaaS. Aim for under 2%.\\n';}" +
  "else if(churnRate<=5){r+='\\u2022 Monthly Churn:     '+pct(churnRate)+' \\u2014 \\uD83D\\uDFE0 Elevated. Every point you reduce compounds.\\n';}" +
  "else if(churnRate>5){r+='\\u2022 Monthly Churn:     '+pct(churnRate)+' \\u2014 \\uD83D\\uDD34 Critical. Retention is your #1 problem.\\n';}" +
  "else{r+='\\u2022 Monthly Churn:     '+pct(churnRate)+'\\n';}" +
  "if(churnRate>0&&subs>0){var cc=Math.round(subs*churnRate/100);var ar=Math.pow(1-churnRate/100,12)*100;r+='\\u2022 Subs Lost/Mo:      ~'+cc+' of '+subs.toLocaleString()+'\\n';r+='\\u2022 Annual Retention:  '+ar.toFixed(1)+'% (after 12 months of churn)\\n';}" +
  "if(contractionMRR>0){" +
  "r+='\\u2022 Contraction MRR:   '+fmt(contractionMRR)+'\\n';" +
  "if(expansionMRR<=0){r+='  \\u2192 \\uD83D\\uDD34 Contraction with no expansion \\u2014 investigate immediately.\\n';}" +
  "else if(cteRatio!==null&&cteRatio>100){r+='  \\u2192 \\uD83D\\uDD34 Contraction exceeds expansion \\u2014 value delivery problem.\\n';}" +
  "else if(cteRatio!==null&&cteRatio>50){r+='  \\u2192 \\uD83D\\uDFE0 Contraction eats '+cteRatio.toFixed(0)+'% of expansion \\u2014 watch closely.\\n';}" +
  "else{r+='  \\u2192 \\uD83D\\uDFE2 Contraction at '+(cteRatio!==null?cteRatio.toFixed(0):'\\u2014')+'% of expansion \\u2014 well-managed.\\n';}" +
  "}else{r+='\\u2022 Contraction MRR:   $0.00 \\u2014 \\u2705 No contraction. All revenue losses are from full churn.\\n';}" +
  // 5. Milestones
  "if(startingMRR>0&&netChange!==0){" +
  "r+='\\n\\uD83C\\uDFAF MRR Milestone Projections\\n';" +
  "r+='   (assuming constant net change of '+mn(netChange)+'/mo)\\n';" +
  "var milestones=netChange>0?[5e3,1e4,2e4,5e4,1e5]:[5e3,1e4,2e4,5e4,1e5].filter(function(m){return m<startingMRR});var anyShown=false;" +
  "for(var mi=0;mi<milestones.length;mi++){var ms=milestones[mi];" +
  "if(netChange>0&&startingMRR>=ms)continue;if(netChange<0&&startingMRR<=ms)continue;" +
  "var mtr=Math.abs((ms-startingMRR)/netChange);if(mtr>120)continue;" +
  "r+='\\u2022 '+fmt(ms)+' MRR:  '+mtr.toFixed(1)+' months  (~'+dl(mtr)+')\\n';anyShown=true;}" +
  "if(!anyShown){r+='\\u2022 All standard milestones reached or beyond projection range.\\n';}" +
  "}else if(startingMRR>0&&netChange===0){" +
  "r+='\\n\\uD83C\\uDFAF MRR Milestone Projections\\n';" +
  "r+='\\u2022 Net change is zero \\u2014 MRR is flat. Add growth inputs to see projections.\\n';}" +
  // 6. What-If
  "if(startingMRR>0){" +
  "r+='\\n\\uD83D\\uDD04 What-If Scenarios\\n';" +
  // Scenario A: reduce churn
  "if(churnRate>1&&maxMRR!==null){" +
  "var newChurn=Math.max(1,churnRate-2);var newMaxMRR=newMRR/(newChurn/100);var ag=(newMaxMRR-maxMRR)*12;" +
  "r+='\\u2022 If churn drops '+pct(churnRate)+' \\u2192 '+pct(newChurn)+':\\n';" +
  "r+='  Max MRR: '+fmt(maxMRR)+' \\u2192 '+fmt(newMaxMRR)+' (+'+fmt(newMaxMRR-maxMRR)+')\\n';" +
  "if(ag>0){r+='  Annual revenue potential: +'+fmt(ag)+'\\n';}" +
  "}else if(churnRate>0&&churnRate<=1&&maxMRR!==null){" +
  "r+='\\u2022 Churn is already very low at '+pct(churnRate)+' \\u2014 keep it up! Max MRR: '+fmt(maxMRR)+'/mo.\\n';}" +
  // Scenario B: expansion to 25%
  "var targetExpansion=newMRR*0.25;" +
  "if(newMRR>0){" +
  "if(expansionMRR>=targetExpansion){" +
  "var cpct=newMRR>0?(expansionMRR/newMRR*100).toFixed(0):'\\u2014';" +
  "r+='\\u2022 Expansion at '+cpct+'% of new MRR \\u2014 \\u2705 already exceeding 25% target.\\n';" +
  "}else{" +
  "var gap=targetExpansion-expansionMRR;var newNRR=nrr!==null?(startingMRR+targetExpansion-contractionMRR-churnedMRR)/startingMRR*100:null;" +
  "r+='\\u2022 If expansion grows to 25% of new MRR:\\n';" +
  "r+='  Target Expansion: '+fmt(targetExpansion)+'/mo (+'+fmt(gap)+' needed)\\n';" +
  "if(nrr!==null&&newNRR!==null){r+='  NRR would rise: '+pct(nrr)+' \\u2192 '+pct(newNRR)+'\\n';}" +
  "}}" +
  // Scenario C: halve contraction
  "if(contractionMRR>0){" +
  "var savings=contractionMRR/2;var newNetChange=netChange+savings;" +
  "var newNRR2=nrr!==null?(startingMRR+expansionMRR-savings-churnedMRR)/startingMRR*100:null;" +
  "r+='\\u2022 If contraction is cut by 50%:\\n';" +
  "r+='  Savings: +'+fmt(savings)+'/mo\\n';" +
  "r+='  Net Change improves: '+mn(netChange)+' \\u2192 '+mn(newNetChange)+'/mo';" +
  "if(netChange!==0){var pi=Math.abs((newNetChange-netChange)/netChange*100);r+=' (+'+pi.toFixed(0)+'%)';}r+='\\n';" +
  "if(nrr!==null&&newNRR2!==null){r+='  NRR improves: '+pct(nrr)+' \\u2192 '+pct(newNRR2)+'\\n';}" +
  "}" +
  "}" +
  "if(startingMRR>0&&price>0){var beSubs=Math.ceil((churnedMRR+contractionMRR-expansionMRR-reactivationMRR)/price);var beNote=beSubs<0?'\\u2022 \\uD83D\\uDFE2 Break-even below 0 \\u2014 your expansion + reactivation already outpaces losses.':newSubs>=beSubs?'\\u2022 \\uD83D\\uDFE2 Break-even new subs/mo: '+beSubs+'  \\u2014 you\\'re growing above break-even ('+newSubs+' actual).':'\\u2022 \\uD83D\\uDD34 Break-even new subs/mo: '+beSubs+'  \\u2014 you\\'re below break-even ('+newSubs+' actual). MRR is shrinking.';r+='\\n\\u2696\\uFE0F Break-Even Growth\\n'+beNote+'\\n';}" +
  "var tipStr;" +
  "if(nrr!==null&&nrr>=110){tipStr='\\uD83D\\uDCA1 Tip: Best-in-class NRR \\u2014 protect the expansion motion that drives it. Don\\'t fix what isn\\'t broken.';}" +
  "else if(churnRate<2&&churnRate>0){tipStr='\\uD83D\\uDCA1 Tip: Sub-2% churn is your unfair advantage. Don\\'t raise prices until you\\'ve maxed expansion revenue per account.';}" +
  "else if(churnRate>=5){tipStr='\\uD83D\\uDCA1 Tip: Lowering churn from '+churnRate.toFixed(1)+'% to 3% roughly doubles customer lifetime. Retention is your #1 lever right now.';}" +
  "else{tipStr='\\uD83D\\uDCA1 Tip: Track your Quick Ratio weekly \\u2014 above 4 means growth is efficient. Below 2 means you\\'re scaling losses faster than gains.';}" +
  "r+='\\n'+tipStr+'\\n';" +
  "return [r];";

const engine: ToolEngine = {
  slug: "solopreneur-mrr-calculator",
  title: "MRR Calculator",
  description: "Track your MRR health: new vs churned vs expansion revenue, monthly growth rate, and time to reach key milestones.",
  category: "A",
  inputs: [
    { name: "subscriberCount", label: "Current Subscribers", placeholder: "e.g. 500", type: "number" },
    { name: "monthlyPrice", label: "Monthly Price ($)", placeholder: "e.g. 29", type: "number" },
    { name: "monthlyChurnRate", label: "Monthly Churn Rate (%)", placeholder: "e.g. 3", type: "number" },
    { name: "expansionMRR", label: "Expansion MRR ($/mo)", placeholder: "e.g. 800 (upgrades & add-ons)", type: "number" },
    { name: "newSubsPerMonth", label: "New Subscribers / Month", placeholder: "e.g. 100", type: "number" },
    { name: "contractionMRR", label: "Contraction MRR ($/mo)", placeholder: "e.g. 150 (downgrades & reductions)", type: "number" },
    { name: "reactivationMRR", label: "Reactivation MRR ($/mo)", placeholder: "e.g. 100 (returned customers)", type: "number" },
  ],
  clientConfig: { type: "custom", wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] { return calculateMRR(inputs); },
  staticExamples: [
    '📊 MRR Health Dashboard\n\n💰 MRR Snapshot\n• Starting MRR:      $14,500.00\n• Ending MRR:        $17,715.00  (after 1 month)\n• ARR (×12):         $174,000.00\n• Subscribers:       500  @ $29.00/mo\n• Monthly Growth:    +22.2%\n\n📈 MRR Waterfall\n  Starting MRR:       $14,500.00\n  + New MRR:         +$2,900.00  (100 new subs × $29.00)\n  + Expansion MRR:   +  $800.00  (upgrades & add-ons)\n  + Reactivation:    +  $100.00  (returned customers)\n  − Contraction:     −  $150.00  (downgrades)\n  − Churn:           −  $435.00  (3.0% of 500 subs)\n  = Ending MRR:       $17,715.00\n  Net Change:         +$3,215.00  (+22.2% MoM)\n  Assessment:         🟢 Excellent — 10%+ MoM growth is top-tier.\n\n📐 Key SaaS Metrics\n• NRR (Net Revenue Retention):  101.5%  🟡 Positive — existing base growing slightly\n• GRR (Gross Revenue Retention): 96.0%  🟢 >90% is healthy\n• SaaS Quick Ratio:              6.5x  🟢 >4 is highly efficient\n• Growth Ceiling (Max MRR):      $96,666.67/mo  at 3.0% churn\n  → Halving churn to 1.5% would lift ceiling to $193,333.33/mo\n\n🩺 Churn & Contraction Health\n• Monthly Churn:     3.0% — 🟡 Good for SMB SaaS. Aim for under 2%.\n• Subs Lost/Mo:      ~15 of 500\n• Annual Retention:  69.4% (after 12 months of churn)\n• Contraction MRR:   $150.00\n  → 🟢 Contraction at 19% of expansion — well-managed.\n\n🎯 MRR Milestone Projections\n   (assuming constant net change of +$3,215.00/mo)\n• $20,000.00 MRR:  1.7 months  (~Aug 2026)\n• $50,000.00 MRR:  11.0 months  (~May 2027)\n• $100,000.00 MRR:  26.6 months  (~Sep 2028)\n\n🔄 What-If Scenarios\n• If churn drops 3.0% → 1.0%:\n  Max MRR: $96,666.67 → $290,000.00 (+$193,333.33)\n  Annual revenue potential: +$2,320,000.00\n• Expansion at 28% of new MRR — ✅ already exceeding 25% target.\n• If contraction is cut by 50%:\n  Savings: +$75.00/mo\n  Net Change improves: +$3,215.00 → +$3,290.00/mo (+2%)\n  NRR improves: 101.5% → 102.0%\n\n⚖️ Break-Even Growth\n• 🟢 Break-even below 0 — your expansion + reactivation already outpaces losses.\n\n💡 Tip: Track your Quick Ratio weekly — above 4 means growth is efficient. Below 2 means you\'re scaling losses faster than gains.\n',
    "+$3,215/mo net change → $20K MRR in <2 months",
    "NRR at 101.5% means existing base is growing — churn is well-covered by expansion",
    "Quick Ratio of 6.5x: for every $1 lost, $6.50 in new revenue comes in",
    "Halving 3% churn → Max MRR jumps from $97K to $290K (3× ceiling lift)",
  ],
  faq: [
    { q: "What is a good MRR growth rate for an entrepreneur?", a: "10-20% month-over-month is excellent for early-stage SaaS. 5-10% is healthy. Below 5% means you need to fix either acquisition or retention. The best entrepreneurs track their net MRR movement (new − churned + expansion) weekly, not monthly." },
    { q: "What is NRR and why does it matter?", a: "Net Revenue Retention (NRR) measures how much revenue you retain from existing customers after accounting for expansion, contraction, and churn. NRR above 110% is best-in-class — it means you grow 10%+ from existing customers even with zero new acquisition. Below 100% means your customer base is shrinking." },
    { q: "What churn rate should I target?", a: "Under 3% monthly churn is good for SMB SaaS. Under 1-2% is great. Enterprise SaaS should aim for under 1%. Every percentage point of churn you reduce compounds dramatically — going from 5% to 3% churn can increase customer lifetime by 67%." },
    { q: "How do I increase expansion MRR?", a: "Add usage-based tiers, upsell premium features, offer add-ons (extra seats, storage, integrations), and raise prices for new customers. A healthy SaaS gets 20-30% of new MRR from existing customer expansion, not just new signups." },
    { q: "What is the difference between contraction and churn?", a: "Churn means a customer cancels completely — 100% of their revenue is lost. Contraction means they downgrade or reduce seats — they stay but pay less. Contraction is a leading indicator: customers who downgrade today are far more likely to churn tomorrow. Treat contraction as your early-warning radar." },
  ],
  howToUse: [
    "Enter your current subscriber count.",
    "Enter your monthly price per subscriber.",
    "Enter your monthly churn rate as a percentage (e.g. 3 for 3%).",
    "Enter expansion MRR from upgrades and add-ons (leave 0 if none).",
    "Enter how many new subscribers you typically add per month.",
    "Enter contraction MRR from downgrades and seat reductions.",
    "Enter reactivation MRR from customers who returned after churning.",
    "Review the MRR Waterfall to see where your revenue is coming and going.",
    "Check Key SaaS Metrics — NRR above 110% and Quick Ratio above 4 are the gold standards.",
    "Use What-If Scenarios to model improvements in churn, expansion, and contraction.",
  ],
};
registerEngine(engine);

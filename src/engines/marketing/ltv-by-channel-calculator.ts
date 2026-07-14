import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

// =====================================================================
// LTV by Channel Calculator (P6-2) — Business v3 standard
// =====================================================================
// Compares 5 marketing channels by LTV:CAC ratio. Each channel gets
// spend / conversions / ltv-per-user. Engine computes per-channel CAC
// and LTV:CAC ratio, ranks them, and surfaces whole-table verdict.
//
// Health bands (LTV:CAC ratio per channel):
//   🟢 ≥3.0  (excellent — scale this channel)
//   🟡 1.0-3.0 (good — profitable)
//   🟠 0.5-1.0 (warning — barely break-even)
//   🔴 <0.5 (critical — losing money)

// ============== Health band constants ==============

export const HEALTH_BANDS = {
  excellent: 3.0,
  good: [1.0, 3.0],
  warning: [0.5, 1.0],
  critical: 0,
} as const;

// ============== Types ==============

export interface Channel {
  id: string;
  spend: number;
  conversions: number;
  ltv: number;
  cac: number;     // computed
  ratio: number;   // computed (LTV:CAC)
}

// ============== Math helpers (exported for tests) ==============

/** CAC = spend / conversions. Returns Infinity when conversions = 0. */
export function calcCAC(spend: number, conversions: number): number {
  if (conversions <= 0) return Infinity;
  return spend / conversions;
}

/** LTV:CAC ratio = ltv / cac. Returns Infinity when cac = 0 (handled by caller). */
export function calcLTVRatio(ltv: number, cac: number): number {
  if (cac <= 0 || !isFinite(cac)) return 0;
  return ltv / cac;
}

/** Sum all channels' spend and conversions. */
export function totals(channels: Channel[]): { totalSpend: number; totalConv: number } {
  return channels.reduce(
    (acc, c) => ({ totalSpend: acc.totalSpend + c.spend, totalConv: acc.totalConv + c.conversions }),
    { totalSpend: 0, totalConv: 0 },
  );
}

/** Blended CAC across all channels = totalSpend / totalConv. */
export function blendedCAC(channels: Channel[]): number {
  const { totalSpend, totalConv } = totals(channels);
  if (totalConv <= 0) return Infinity;
  return totalSpend / totalConv;
}

/** Rank channels by LTV:CAC ratio (desc). Zero-conv channels (cac=Infinity) sort last. */
export function rankChannels(channels: Channel[]): Channel[] {
  return [...channels].sort((a, b) => {
    if (!isFinite(a.cac) && !isFinite(b.cac)) return 0;
    if (!isFinite(a.cac)) return 1; // a goes last
    if (!isFinite(b.cac)) return -1; // b goes last
    return b.ratio - a.ratio;
  });
}

/** Determine health emoji for a given LTV:CAC ratio. */
function healthBand(ratio: number): string {
  if (!isFinite(ratio) || ratio <= 0) return '⚪';
  if (ratio >= HEALTH_BANDS.excellent) return '🟢';
  if (ratio >= HEALTH_BANDS.good[0]) return '🟡';
  if (ratio >= HEALTH_BANDS.warning[0]) return '🟠';
  return '🔴';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const channels: Channel[] = [];
  let anyData = false;
  for (let i = 1; i <= 5; i++) {
    const spend = clampNonNegative(parseFloat(inputs[`ch${i}_spend`]) || 0);
    const conversions = clampNonNegative(parseFloat(inputs[`ch${i}_conv`]) || 0);
    const ltv = clampNonNegative(parseFloat(inputs[`ch${i}_ltv`]) || 0);
    if (spend > 0 || conversions > 0 || ltv > 0) anyData = true;
    const cac = calcCAC(spend, conversions);
    const ratio = calcLTVRatio(ltv, cac);
    channels.push({ id: `Ch${i}`, spend, conversions, ltv, cac, ratio });
  }

  // Edge: no data entered
  if (!anyData) {
    return [
      '⏰ LTV by Channel Calculator\n\n' +
        '📊 Enter spend, conversions, and LTV per user for up to 5 marketing channels. See ranked LTV:CAC ratios, channel winners, and reallocation suggestions.',
    ];
  }

  const ranked = rankChannels(channels);
  const winner = ranked.find((c) => isFinite(c.cac));
  const loser = [...ranked].reverse().find((c) => isFinite(c.cac));
  const { totalSpend, totalConv } = totals(channels);
  const blended = blendedCAC(channels);
  const blendedRatio = totalConv > 0 ? channels.reduce((acc, c) => acc + c.ltv * c.conversions, 0) / totalConv / blended : 0;

  // Whole-table verdict = lowest of any non-zero channel's band
  let tableEmoji: string;
  let tableLabel: string;
  const finiteRatios = channels.filter((c) => isFinite(c.cac) && c.ratio > 0).map((c) => c.ratio);
  if (finiteRatios.length === 0) {
    tableEmoji = '⚪';
    tableLabel = 'No channels with conversions — enter conversion counts to compare';
  } else {
    const minRatio = Math.min(...finiteRatios);
    if (minRatio >= HEALTH_BANDS.excellent) {
      tableEmoji = '🟢';
      tableLabel = 'All channels 🟢 — every channel > 3x LTV:CAC; scale aggressively';
    } else if (minRatio >= HEALTH_BANDS.good[0]) {
      tableEmoji = '🟡';
      tableLabel = 'All channels 🟡 — every channel > 1x but some < 3x; reallocate to top performers';
    } else if (minRatio >= HEALTH_BANDS.warning[0]) {
      tableEmoji = '🟠';
      tableLabel = 'At least one channel 🟠 — 0.5-1x LTV:CAC; investigate creative/targeting';
    } else {
      tableEmoji = '🔴';
      tableLabel = 'At least one channel 🔴 — losing money on that channel; pause or rework';
    }
  }

  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const money0 = (n: number) => (isFinite(n) ? '$' + n.toFixed(2) : '∞');

  // What-If: reallocate 25% from loser to winner
  let reallocWhatIf: string;
  if (winner && loser && winner.id !== loser.id) {
    const reallocAmount = loser.spend * 0.25;
    const newWinnerSpend = winner.spend + reallocAmount;
    const newWinnerCAC = newWinnerSpend / winner.conversions;
    const newWinnerRatio = winner.ltv / newWinnerCAC;
    const newLoserSpend = loser.spend - reallocAmount;
    const newLoserCAC = newLoserSpend / Math.max(loser.conversions, 1);
    const newLoserRatio = loser.ltv / newLoserCAC;
    reallocWhatIf = 'Shift 25% from ' + loser.id + ' → ' + winner.id + ':\n' +
      '  • ' + winner.id + ': ratio ' + winner.ratio.toFixed(2) + 'x → ' + newWinnerRatio.toFixed(2) + 'x (CAC rises)\n' +
      '  • ' + loser.id + ': ratio ' + loser.ratio.toFixed(2) + 'x → ' + newLoserRatio.toFixed(2) + 'x (improves if convs stay)';
  } else {
    reallocWhatIf = 'Add a 2nd channel to compare (currently only one valid channel).';
  }

  // Break-Even: target CAC for lowest-band channel
  let breakEvenTarget: string;
  const lowestChannel = finiteRatios.length > 0
    ? channels.filter((c) => isFinite(c.cac) && c.ratio > 0).reduce((min, c) => (c.ratio < min.ratio ? c : min))
    : null;
  if (lowestChannel) {
    const targetCAC = lowestChannel.ltv / HEALTH_BANDS.good[0]; // 3x target
    const currentCAC = lowestChannel.cac;
    const cacCutNeeded = currentCAC - targetCAC;
    breakEvenTarget =
      'To push ' + lowestChannel.id + ' from ' + lowestChannel.ratio.toFixed(2) + 'x to 🟢 (≥3.0x):\n' +
      '  • Target CAC: ' + money0(targetCAC) + ' (currently ' + money0(currentCAC) + ')\n' +
      '  • Need to cut CAC by ' + money0(cacCutNeeded) + ' — improve CR by ' +
      ((cacCutNeeded / currentCAC) * 100).toFixed(0) + '% OR reduce spend ' +
      ((cacCutNeeded / currentCAC) * 100).toFixed(0) + '%';
  } else {
    breakEvenTarget = 'Enter conversion counts to see break-even targets.';
  }

  // Milestone: scaling winner 2x
  let milestone: string;
  if (winner && isFinite(winner.cac)) {
    const scaleRevenue = winner.conversions * 2 * winner.ltv;
    const scaleProfit = scaleRevenue - winner.spend * 2;
    milestone = 'Scaling ' + winner.id + ' 2x (same ratio):\n' +
      '  • Revenue: ' + money(scaleRevenue) + '\n' +
      '  • Profit (after ad cost): ' + money(scaleProfit);
  } else {
    milestone = 'Enter data to project scaling outcomes.';
  }

  // Tip
  let tip: string;
  if (finiteRatios.length === 0) {
    tip = 'Enter at least one channel with conversion count to see recommendations.';
  } else if (winner && loser && winner.id === loser.id) {
    tip = 'Only one channel has data. Add 2-4 more channels for actionable comparison and reallocation insights.';
  } else if (winner && loser) {
    const winnerRatio = winner.ratio;
    const loserRatio = loser.ratio;
    if (winnerRatio >= 3 && loserRatio < 1) {
      tip = 'Strong winner (' + winner.id + ', ' + winnerRatio.toFixed(1) + 'x) vs weak loser (' + loser.id + ', ' + loserRatio.toFixed(1) + 'x). Shift budget: ' +
        'double down on ' + winner.id + ' with lookalike audiences, pause or rework ' + loser.id + ' creatives.';
    } else if (winnerRatio >= 3 && loserRatio >= 1) {
      tip = 'Both channels healthy, but ' + winner.id + ' is ' + (winnerRatio / loserRatio).toFixed(1) + 'x more efficient. Shift 20-30% of ' + loser.id + ' budget to ' + winner.id + '.';
    } else if (winnerRatio < 3 && loserRatio < 1) {
      tip = 'No channel is in the 🟢 band. Audit both creatives and targeting before scaling — your CAC is structurally high.';
    } else {
      tip = 'Channels cluster in similar ratios. Differentiate with new creative angles (video, UGC, founder-led) before reallocating.';
    }
  } else {
    tip = 'Add more channel data for comparison insights.';
  }

  // Build table rows
  const tableRows = ranked
    .map((c, i) => {
      const emoji = healthBand(c.ratio);
      const cacStr = isFinite(c.cac) ? money0(c.cac) : '∞ (no conv)';
      const ratioStr = isFinite(c.cac) ? c.ratio.toFixed(2) + 'x' : '—';
      const rank = i === 0 ? '🏆 ' : '   ';
      return rank + emoji + ' ' + c.id + '  ·  spend ' + money(c.spend) +
        ' · conv ' + c.conversions + ' · LTV ' + money(c.ltv) +
        ' · CAC ' + cacStr + ' · ' + ratioStr;
    })
    .join('\n');

  const r =
    '⏰ LTV by Channel Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + tableEmoji + ' ' + tableLabel + '\n' +
    '• Winner: ' + (winner ? winner.id + ' (' + winner.ratio.toFixed(2) + 'x)' : 'n/a') +
    '  ·  Loser: ' + (loser ? loser.id + ' (' + loser.ratio.toFixed(2) + 'x)' : 'n/a') + '\n' +
    '• Blended CAC: ' + (isFinite(blended) ? money0(blended) : '∞') +
    '  ·  Blended LTV:CAC: ' + (isFinite(blendedRatio) ? blendedRatio.toFixed(2) + 'x' : '—') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    tableRows + '\n\n' +
    '• Total spend:  ' + money(totalSpend) + '\n' +
    '• Total conv:   ' + totalConv + '\n' +
    '• Blended CAC:  ' + (isFinite(blended) ? money0(blended) : '∞') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    reallocWhatIf + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    breakEvenTarget + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    milestone + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (minified, mirrors calculate()) ==============

const customFn =
  "function cCAC(s,c){if(c<=0)return Infinity;return s/c;}" +
  "function cRatio(l,c){if(c<=0||!isFinite(c))return 0;return l/c;}" +
  "function totalsF(cs){return cs.reduce((a,c)=>({ts:a.ts+c.s,tc:a.tc+c.c}),{ts:0,tc:0});}" +
  "function bCAC(cs){var t=totalsF(cs);if(t.tc<=0)return Infinity;return t.ts/t.tc;}" +
  "function rankF(cs){return[...cs].sort(function(a,b){if(!isFinite(a.cac)&&!isFinite(b.cac))return 0;if(!isFinite(a.cac))return 1;if(!isFinite(b.cac))return -1;return b.ratio-a.ratio;});}" +
  "function hBand(r){if(!isFinite(r)||r<=0)return'\\u26AA';if(r>=3)return'\\uD83D\\uDFE2';if(r>=1)return'\\uD83D\\uDFE1';if(r>=0.5)return'\\uD83D\\uDFE0';return'\\uD83D\\uDD34';}" +
  "var ch=[];var anyData=false;" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "for(var i=1;i<=5;i++){var sp=cnn(parseFloat(inputs['ch'+i+'_spend'])||0);var cv=cnn(parseFloat(inputs['ch'+i+'_conv'])||0);var lv=cnn(parseFloat(inputs['ch'+i+'_ltv'])||0);if(sp>0||cv>0||lv>0)anyData=true;var cac=cCAC(sp,cv);ch.push({id:'Ch'+i,spend:sp,conversions:cv,ltv:lv,cac:cac,ratio:cRatio(lv,cac)});}" +
  "if(!anyData){return['\\u23F0 LTV by Channel Calculator\\n\\n\\uD83D\\uDCCA Enter spend, conversions, and LTV per user for up to 5 marketing channels. See ranked LTV:CAC ratios, channel winners, and reallocation suggestions.'];}" +
  "var ranked=rankF(ch);" +
  "var winner=ranked.find(function(c){return isFinite(c.cac);});" +
  "var loser=[...ranked].reverse().find(function(c){return isFinite(c.cac);});" +
  "var t=totalsF(ch);var blen=bCAC(ch);" +
  "var blRatio=t.tc>0?ch.reduce(function(a,c){return a+c.ltv*c.conversions;},0)/t.tc/blen:0;" +
  "var finiteRatios=ch.filter(function(c){return isFinite(c.cac)&&c.ratio>0;}).map(function(c){return c.ratio;});" +
  "var tEmo='',tLab='';" +
  "if(finiteRatios.length===0){tEmo='\\u26AA';tLab='No channels with conversions \\u2014 enter conversion counts to compare';}" +
  "else{var minR=Math.min.apply(null,finiteRatios);" +
  "if(minR>=3){tEmo='\\uD83D\\uDFE2';tLab='All channels \\uD83D\\uDFE2 \\u2014 every channel > 3x LTV:CAC; scale aggressively';}" +
  "else if(minR>=1){tEmo='\\uD83D\\uDFE1';tLab='All channels \\uD83D\\uDFE1 \\u2014 every channel > 1x but some < 3x; reallocate to top performers';}" +
  "else if(minR>=0.5){tEmo='\\uD83D\\uDFE0';tLab='At least one channel \\uD83D\\uDFE0 \\u2014 0.5-1x LTV:CAC; investigate creative/targeting';}" +
  "else{tEmo='\\uD83D\\uDD34';tLab='At least one channel \\uD83D\\uDD34 \\u2014 losing money on that channel; pause or rework';}}" +
  "function money(n){return '$'+Math.round(n).toLocaleString('en-US');}" +
  "function money0(n){return isFinite(n)?'$'+n.toFixed(2):'\\u221E';}" +
  "var realloc='';" +
  "if(winner&&loser&&winner.id!==loser.id){var ra=loser.spend*0.25;var nws=winner.spend+ra;var nwc=nws/winner.conversions;var nwr=winner.ltv/nwc;var nls=loser.spend-ra;var nlc=nls/Math.max(loser.conversions,1);var nlr=loser.ltv/nlc;realloc='Shift 25% from '+loser.id+' \\u2192 '+winner.id+':\\n  \\u2022 '+winner.id+': ratio '+winner.ratio.toFixed(2)+'x \\u2192 '+nwr.toFixed(2)+'x (CAC rises)\\n  \\u2022 '+loser.id+': ratio '+loser.ratio.toFixed(2)+'x \\u2192 '+nlr.toFixed(2)+'x (improves if convs stay)';}else{realloc='Add a 2nd channel to compare (currently only one valid channel).';}" +
  "var lc=finiteRatios.length>0?ch.filter(function(c){return isFinite(c.cac)&&c.ratio>0;}).reduce(function(min,c){return c.ratio<min.ratio?c:min;}):null;" +
  "var beT='';" +
  "if(lc){var tgtCAC=lc.ltv/1;var curCAC=lc.cac;var cut=curCAC-tgtCAC;beT='To push '+lc.id+' from '+lc.ratio.toFixed(2)+'x to \\uD83D\\uDFE2 (\\u22653.0x):\\n  \\u2022 Target CAC: '+money0(tgtCAC)+' (currently '+money0(curCAC)+')\\n  \\u2022 Need to cut CAC by '+money0(cut)+' \\u2014 improve CR by '+((cut/curCAC)*100).toFixed(0)+'% OR reduce spend '+((cut/curCAC)*100).toFixed(0)+'%';}else{beT='Enter conversion counts to see break-even targets.';}" +
  "var ms='';" +
  "if(winner&&isFinite(winner.cac)){var sRev=winner.conversions*2*winner.ltv;var sProf=sRev-winner.spend*2;ms='Scaling '+winner.id+' 2x (same ratio):\\n  \\u2022 Revenue: '+money(sRev)+'\\n  \\u2022 Profit (after ad cost): '+money(sProf);}else{ms='Enter data to project scaling outcomes.';}" +
  "var tip='';" +
  "if(finiteRatios.length===0){tip='Enter at least one channel with conversion count to see recommendations.';}" +
  "else if(winner&&loser&&winner.id===loser.id){tip='Only one channel has data. Add 2-4 more channels for actionable comparison and reallocation insights.';}" +
  "else if(winner&&loser){var wr=winner.ratio;var lr=loser.ratio;if(wr>=3&&lr<1){tip='Strong winner ('+winner.id+', '+wr.toFixed(1)+'x) vs weak loser ('+loser.id+', '+lr.toFixed(1)+'x). Shift budget: double down on '+winner.id+' with lookalike audiences, pause or rework '+loser.id+' creatives.';}else if(wr>=3&&lr>=1){tip='Both channels healthy, but '+winner.id+' is '+(wr/lr).toFixed(1)+'x more efficient. Shift 20-30% of '+loser.id+' budget to '+winner.id+'.';}else if(wr<3&&lr<1){tip='No channel is in the \\uD83D\\uDFE2 band. Audit both creatives and targeting before scaling \\u2014 your CAC is structurally high.';}else{tip='Channels cluster in similar ratios. Differentiate with new creative angles (video, UGC, founder-led) before reallocating.';}}else{tip='Add more channel data for comparison insights.';}" +
  "var tr=ranked.map(function(c,i){var e=hBand(c.ratio);var cs=isFinite(c.cac)?money0(c.cac):'\\u221E (no conv)';var rs=isFinite(c.cac)?c.ratio.toFixed(2)+'x':'\\u2014';var rk=i===0?'\\uD83C\\uDFC6 ':'   ';return rk+e+' '+c.id+'  \\u00B7  spend '+money(c.spend)+' \\u00B7 conv '+c.conversions+' \\u00B7 LTV '+money(c.ltv)+' \\u00B7 CAC '+cs+' \\u00B7 '+rs;}).join('\\n');" +
  "var r2='';" +
  "r2+='\\u23F0 LTV by Channel Calculator\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+tEmo+' '+tLab+'\\n';" +
  "r2+='\\u2022 Winner: '+(winner?winner.id+' ('+winner.ratio.toFixed(2)+'x)':'n/a')+'  \\u00B7  Loser: '+(loser?loser.id+' ('+loser.ratio.toFixed(2)+'x)':'n/a')+'\\n';" +
  "r2+='\\u2022 Blended CAC: '+(isFinite(blen)?money0(blen):'\\u221E')+'  \\u00B7  Blended LTV:CAC: '+(isFinite(blRatio)?blRatio.toFixed(2)+'x':'\\u2014')+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCCA Inputs Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+=tr+'\\n\\n';" +
  "r2+='\\u2022 Total spend:  '+money(t.ts)+'\\n';" +
  "r2+='\\u2022 Total conv:   '+t.tc+'\\n';" +
  "r2+='\\u2022 Blended CAC:  '+(isFinite(blen)?money0(blen):'\\u221E')+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+=realloc+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Break-Even:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+=beT+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Milestone:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+=ms+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCA1 Tip: '+tip+'\\n';" +
  "return [r2];";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-ltv-by-channel-calculator',
  title: 'LTV by Channel Calculator',
  description:
    'Compare up to 5 marketing channels by LTV:CAC ratio. See ranked table with health bands, blended CAC, reallocation suggestions, and break-even targets. Industry benchmarks: 🟢 ≥3.0x · 🟡 1.0–3.0x · 🟠 0.5–1.0x · 🔴 <0.5x.',
  categoryId: 'M',
  applicationCategory: 'BusinessApplication',
  inputs: [
    // Ch1
    { name: 'ch1_spend', label: 'Ch1: Ad Spend ($)', placeholder: 'e.g. 1000', type: 'number' },
    { name: 'ch1_conv', label: 'Ch1: Conversions', placeholder: 'e.g. 50', type: 'number' },
    { name: 'ch1_ltv', label: 'Ch1: LTV per User ($)', placeholder: 'e.g. 500', type: 'number' },
    // Ch2
    { name: 'ch2_spend', label: 'Ch2: Ad Spend ($)', placeholder: 'e.g. 1500', type: 'number' },
    { name: 'ch2_conv', label: 'Ch2: Conversions', placeholder: 'e.g. 30', type: 'number' },
    { name: 'ch2_ltv', label: 'Ch2: LTV per User ($)', placeholder: 'e.g. 800', type: 'number' },
    // Ch3
    { name: 'ch3_spend', label: 'Ch3: Ad Spend ($)', placeholder: 'e.g. 800', type: 'number' },
    { name: 'ch3_conv', label: 'Ch3: Conversions', placeholder: 'e.g. 20', type: 'number' },
    { name: 'ch3_ltv', label: 'Ch3: LTV per User ($)', placeholder: 'e.g. 600', type: 'number' },
    // Ch4
    { name: 'ch4_spend', label: 'Ch4: Ad Spend ($)', placeholder: 'e.g. 1200', type: 'number' },
    { name: 'ch4_conv', label: 'Ch4: Conversions', placeholder: 'e.g. 40', type: 'number' },
    { name: 'ch4_ltv', label: 'Ch4: LTV per User ($)', placeholder: 'e.g. 400', type: 'number' },
    // Ch5
    { name: 'ch5_spend', label: 'Ch5: Ad Spend ($)', placeholder: 'e.g. 600', type: 'number' },
    { name: 'ch5_conv', label: 'Ch5: Conversions', placeholder: 'e.g. 15', type: 'number' },
    { name: 'ch5_ltv', label: 'Ch5: LTV per User ($)', placeholder: 'e.g. 700', type: 'number' },
  ],
  keywords: [
    'LTV by channel',
    'LTV CAC by channel',
    'channel ROI comparison',
    'marketing channel comparison',
    'channel efficiency',
    'LTV calculator multi-channel',
    'CAC by channel',
    'channel budget allocation',
    'marketing mix',
    'channel performance',
  ],
  tags: ['marketing', 'ltv', 'cac', 'channels'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-05',
  sources: [
    'https://www.profitwell.com/blog/cac-by-channel',
    'https://www.hubspot.com/marketing/cac',
    'https://blog.hubspot.com/marketing/customer-acquisition-cost',
    'https://www.saastr.com/customer-acquisition-cost/',
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  calculate,
  generate: calculate,
  staticExamples: ['⏰ LTV by Channel Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 All channels 🟢 — every channel > 3x LTV:CAC; scale aggressively\n• Winner: Ch1 (25.00x)  ·  Loser: Ch4 (13.33x)\n• Blended CAC: $32.90  ·  Blended LTV:CAC: 17.16x\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🏆 🟢 Ch1  ·  spend $1,000 · conv 50 · LTV $500 · CAC $20.00 · 25.00x\n   🟢 Ch5  ·  spend $600 · conv 15 · LTV $700 · CAC $40.00 · 17.50x\n   🟢 Ch2  ·  spend $1,500 · conv 30 · LTV $800 · CAC $50.00 · 16.00x\n   🟢 Ch3  ·  spend $800 · conv 20 · LTV $600 · CAC $40.00 · 15.00x\n   🟢 Ch4  ·  spend $1,200 · conv 40 · LTV $400 · CAC $30.00 · 13.33x\n\n• Total spend:  $5,100\n• Total conv:   155\n• Blended CAC:  $32.90\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nShift 25% from Ch4 → Ch1:\n  • Ch1: ratio 25.00x → 19.23x (CAC rises)\n  • Ch4: ratio 13.33x → 17.78x (improves if convs stay)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nTo push Ch4 from 13.33x to 🟢 (≥3.0x):\n  • Target CAC: $400.00 (currently $30.00)\n  • Need to cut CAC by $-370.00 — improve CR by -1233% OR reduce spend -1233%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nScaling Ch1 2x (same ratio):\n  • Revenue: $50,000\n  • Profit (after ad cost): $48,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Both channels healthy, but Ch1 is 1.9x more efficient. Shift 20-30% of Ch4 budget to Ch1.\n'],
  faq: [
    { q: 'How many channels should I compare?', a: 'Up to 5 — typical solopreneurs use 3-4 (Google Ads, Meta, TikTok, Email). Empty fields are skipped; only fill channels with data.' },
    { q: 'What is a good LTV:CAC ratio?', a: '3:1 is the textbook benchmark (🟢). 1:1 means you break even (🟡). Below 1:1 means losing money (🔴). World-class SaaS targets 5:1+' },
    { q: 'How do I find LTV per user?', a: 'Two ways: (1) historical — sum revenue per cohort over their lifetime; (2) forward — ARPU ÷ monthly churn %. Both work; pick whichever your data supports.' },
    { q: 'What if some channels have no conversions?', a: 'Those channels are flagged "∞ (no conv)" — they pull your blended CAC up but are not ranked. Investigate targeting before adding spend.' },
  ],
  howToUse: [
    'Pick 2-5 marketing channels to compare (Google Ads, Meta, TikTok, etc.).',
    'For each channel, enter total spend, conversions, and LTV per user.',
    'Read the ranked table — the winner has the highest LTV:CAC ratio.',
    'Use the What-If section to model budget reallocation scenarios.',
    'Check the Break-Even target for the lowest-band channel.',
  ],
};

registerEngine(engine);
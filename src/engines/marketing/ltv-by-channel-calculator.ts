import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-9：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
//   ⚠️ 章节标题 / 标签用**字面量 token**（code|原文|）；带运行时数值的整行用
//      makeToken(code, fallback, params) ⇒ fallback 与 params 取**同一个变量**。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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
      '$calc_out.section.ltv_by_channel_calculator|⏰ LTV by Channel Calculator|\n\n' +
        makeToken('calc_out.ltv_by_channel.row.enter_inputs_required', '📊 Enter spend, conversions, and LTV per user for up to 5 marketing channels. See ranked LTV:CAC ratios, channel winners, and reallocation suggestions.'),
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
  // ── P168 B3-9：健康度五档 —— 每档**单独写出 code 字面量**（动态拼码 ⇒ 静态扫描器认不出）──
  if (finiteRatios.length === 0) {
    tableEmoji = '⚪';
    tableLabel = makeToken('calc_out.ltv_by_channel.row.health_no_channels', 'No channels with conversions — enter conversion counts to compare');
  } else {
    const minRatio = Math.min(...finiteRatios);
    if (minRatio >= HEALTH_BANDS.excellent) {
      tableEmoji = '🟢';
      tableLabel = makeToken('calc_out.ltv_by_channel.row.health_all_green', 'All channels 🟢 — every channel > 3x LTV:CAC; scale aggressively');
    } else if (minRatio >= HEALTH_BANDS.good[0]) {
      tableEmoji = '🟡';
      tableLabel = makeToken('calc_out.ltv_by_channel.row.health_all_yellow', 'All channels 🟡 — every channel > 1x but some < 3x; reallocate to top performers');
    } else if (minRatio >= HEALTH_BANDS.warning[0]) {
      tableEmoji = '🟠';
      tableLabel = makeToken('calc_out.ltv_by_channel.row.health_some_orange', 'At least one channel 🟠 — 0.5-1x LTV:CAC; investigate creative/targeting');
    } else {
      tableEmoji = '🔴';
      tableLabel = makeToken('calc_out.ltv_by_channel.row.health_some_red', 'At least one channel 🔴 — losing money on that channel; pause or rework');
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
    reallocWhatIf = makeToken('calc_out.ltv_by_channel.row.whatif_shift_25pct', 'Shift 25% from ' + loser.id + ' → ' + winner.id + ':', { from: loser.id, to: winner.id }) + '\n' +
      '  • ' + makeToken('calc_out.ltv_by_channel.row.whatif_winner_ratio', winner.id + ': ratio ' + winner.ratio.toFixed(2) + 'x → ' + newWinnerRatio.toFixed(2) + 'x (CAC rises)', { id: winner.id, from: winner.ratio.toFixed(2), to: newWinnerRatio.toFixed(2) }) + '\n' +
      '  • ' + makeToken('calc_out.ltv_by_channel.row.whatif_loser_ratio', loser.id + ': ratio ' + loser.ratio.toFixed(2) + 'x → ' + newLoserRatio.toFixed(2) + 'x (improves if convs stay)', { id: loser.id, from: loser.ratio.toFixed(2), to: newLoserRatio.toFixed(2) });
  } else {
    reallocWhatIf = makeToken('calc_out.ltv_by_channel.row.whatif_need_second_channel', 'Add a 2nd channel to compare (currently only one valid channel).');
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
      makeToken('calc_out.ltv_by_channel.row.breakeven_push_to_green', 'To push ' + lowestChannel.id + ' from ' + lowestChannel.ratio.toFixed(2) + 'x to 🟢 (≥3.0x):', { id: lowestChannel.id, ratio: lowestChannel.ratio.toFixed(2) }) + '\n' +
      '  • ' + makeToken('calc_out.ltv_by_channel.row.breakeven_target_cac', 'Target CAC: ' + money0(targetCAC) + ' (currently ' + money0(currentCAC) + ')', { target: money0(targetCAC), current: money0(currentCAC) }) + '\n' +
      '  • ' + makeToken('calc_out.ltv_by_channel.row.breakeven_cut_cac', 'Need to cut CAC by ' + money0(cacCutNeeded) + ' — improve CR by ' +
      ((cacCutNeeded / currentCAC) * 100).toFixed(0) + '% OR reduce spend ' +
      ((cacCutNeeded / currentCAC) * 100).toFixed(0) + '%', { cut: money0(cacCutNeeded), pct: ((cacCutNeeded / currentCAC) * 100).toFixed(0) });
  } else {
    breakEvenTarget = makeToken('calc_out.ltv_by_channel.row.breakeven_need_conversions', 'Enter conversion counts to see break-even targets.');
  }

  // Milestone: scaling winner 2x
  let milestone: string;
  if (winner && isFinite(winner.cac)) {
    const scaleRevenue = winner.conversions * 2 * winner.ltv;
    const scaleProfit = scaleRevenue - winner.spend * 2;
    milestone = makeToken('calc_out.ltv_by_channel.row.milestone_scaling', 'Scaling ' + winner.id + ' 2x (same ratio):', { id: winner.id }) + '\n' +
      '  • $calc_out.label.revenue|Revenue|: ' + money(scaleRevenue) + '\n' +
      '  • $calc_out.label.profit_after_ad_cost|Profit (after ad cost)|: ' + money(scaleProfit);
  } else {
    milestone = makeToken('calc_out.ltv_by_channel.row.milestone_need_data', 'Enter data to project scaling outcomes.');
  }

  // Tip
  let tip: string;
  if (finiteRatios.length === 0) {
    tip = JSON.stringify({ code: 'ltv_no_data', params: {} });
  } else if (winner && loser && winner.id === loser.id) {
    tip = JSON.stringify({ code: 'ltv_single_channel', params: {} });
  } else if (winner && loser) {
    const winnerRatio = winner.ratio;
    const loserRatio = loser.ratio;
    if (winnerRatio >= 3 && loserRatio < 1) {
      tip = JSON.stringify({
        code: 'ltv_strong_winner',
        params: {
          winner: winner.id,
          winnerRatio: winnerRatio.toFixed(1),
          loser: loser.id,
          loserRatio: loserRatio.toFixed(1),
        },
      });
    } else if (winnerRatio >= 3 && loserRatio >= 1) {
      tip = JSON.stringify({
        code: 'ltv_both_healthy',
        params: {
          winner: winner.id,
          ratio: (winnerRatio / loserRatio).toFixed(1),
          loser: loser.id,
        },
      });
    } else if (winnerRatio < 3 && loserRatio < 1) {
      tip = JSON.stringify({ code: 'ltv_no_green', params: {} });
    } else {
      tip = JSON.stringify({ code: 'ltv_similar_ratios', params: {} });
    }
  } else {
    // ⭐ P168：这条 else 实测**不可达**（finiteRatios.length > 0 ⇒ winner/loser 必然存在），
    //   穷举 1296 组渠道组合从未出现 ⇒ 与 ltv_no_data 合并，避免产生永远跑不到的建议码。
    tip = JSON.stringify({ code: 'ltv_no_data', params: {} });
  }

  // Build table rows
  const tableRows = ranked
    .map((c, i) => {
      const emoji = healthBand(c.ratio);
      const cacStr = isFinite(c.cac) ? money0(c.cac) : '∞ (no conv)';
      const ratioStr = isFinite(c.cac) ? c.ratio.toFixed(2) + 'x' : '—';
      const rank = i === 0 ? '🏆 ' : '   ';
      // ⚠️ 排名标记与健康度 emoji 留在 token 之外（语言无关）；整行其余部分令牌化
      return rank + emoji + ' ' + makeToken(
        'calc_out.ltv_by_channel.row.channel_row',
        c.id + '  ·  spend ' + money(c.spend) +
          ' · conv ' + c.conversions + ' · LTV ' + money(c.ltv) +
          ' · CAC ' + cacStr + ' · ' + ratioStr,
        { id: c.id, spend: money(c.spend), conv: String(c.conversions), ltv: money(c.ltv), cac: cacStr, ratio: ratioStr },
      );
    })
    .join('\n');

  // ── P168 B3-9：输出行逐行令牌化 ─────────────────────────────────────────
  //   · 章节标题 / 标签 ⇒ **字面量 token**（对齐空格留在 token 之外）
  //   · 带运行时数值的整行 ⇒ makeToken(code, fallback, params)（fallback 与 params 同源）
  //   ⚠️ 「💡 Tip: {"code":…}」是 P168 决策建议 i18n 的**既定形态** ⇒ **一个字都不动**
  let r =
    '$calc_out.section.ltv_by_channel_calculator|⏰ LTV by Channel Calculator|\n\n' +
    '$calc_out.section.health|🩺 Health:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + tableEmoji + ' ' + tableLabel + '\n' +
    '• $calc_out.label.winner|Winner|: ' + (winner ? winner.id + ' (' + winner.ratio.toFixed(2) + 'x)' : 'n/a') +
    '  ·  $calc_out.label.loser|Loser|: ' + (loser ? loser.id + ' (' + loser.ratio.toFixed(2) + 'x)' : 'n/a') + '\n' +
    '• $calc_out.label.blended_cac|Blended CAC|: ' + (isFinite(blended) ? money0(blended) : '∞') +
    '  ·  $calc_out.label.blended_ltv_cac|Blended LTV:CAC|: ' + (isFinite(blendedRatio) ? blendedRatio.toFixed(2) + 'x' : '—') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    tableRows + '\n\n' +
    '• $calc_out.label.total_spend|Total spend|:  ' + money(totalSpend) + '\n' +
    '• $calc_out.label.total_conv|Total conv|:   ' + totalConv + '\n' +
    '• $calc_out.label.blended_cac|Blended CAC|:  ' + (isFinite(blended) ? money0(blended) : '∞') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.what_if|🔄 What-If:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    reallocWhatIf + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.break_even|⚖️ Break-Even:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    breakEvenTarget + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.milestone|🎯 Milestone:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    milestone + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  // P168 B3-1：**🧭 四段已迁到页面的「🧭 算完之后」区块**
  //   （src/i18n/locales/{en,zh}.json 的 tools.<slug>.decision_goal /
  //     decision_recommendation / decision_constraint / decision_next_tool，双语）
  //   ⇒ 引擎只负责算；**决策支持由区块独占** ⇒ 同页不再有两份决策建议。
  //   ⚠️ 引擎里**不要**再写这段：区块与卡片会同时渲染同一件事。

  return [r];
}

// ============== customFn (minified, mirrors calculate()) ==============

const customFn =
  // P168 B3-9：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 服务端与客户端输出逐字节相同，不可能漂移；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS +
  "function cCAC(s,c){if(c<=0)return Infinity;return s/c;}" +
  "function cRatio(l,c){if(c<=0||!isFinite(c))return 0;return l/c;}" +
  "function totalsF(cs){return cs.reduce((a,c)=>({ts:a.ts+c.spend,tc:a.tc+c.conversions}),{ts:0,tc:0});}" +
  "function bCAC(cs){var t=totalsF(cs);if(t.tc<=0)return Infinity;return t.ts/t.tc;}" +
  "function rankF(cs){return[...cs].sort(function(a,b){if(!isFinite(a.cac)&&!isFinite(b.cac))return 0;if(!isFinite(a.cac))return 1;if(!isFinite(b.cac))return -1;return b.ratio-a.ratio;});}" +
  "function hBand(r){if(!isFinite(r)||r<=0)return'\\u26AA';if(r>=3)return'\\uD83D\\uDFE2';if(r>=1)return'\\uD83D\\uDFE1';if(r>=0.5)return'\\uD83D\\uDFE0';return'\\uD83D\\uDD34';}" +
  "var ch=[];var anyData=false;" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "for(var i=1;i<=5;i++){var sp=cnn(parseFloat(inputs['ch'+i+'_spend'])||0);var cv=cnn(parseFloat(inputs['ch'+i+'_conv'])||0);var lv=cnn(parseFloat(inputs['ch'+i+'_ltv'])||0);if(sp>0||cv>0||lv>0)anyData=true;var cac=cCAC(sp,cv);ch.push({id:'Ch'+i,spend:sp,conversions:cv,ltv:lv,cac:cac,ratio:cRatio(lv,cac)});}" +
  "if(!anyData){return['$calc_out.section.ltv_by_channel_calculator|\\u23F0 LTV by Channel Calculator|\\n\\n'+tk('calc_out.ltv_by_channel.row.enter_inputs_required','\\uD83D\\uDCCA Enter spend, conversions, and LTV per user for up to 5 marketing channels. See ranked LTV:CAC ratios, channel winners, and reallocation suggestions.')];}" +
  "var ranked=rankF(ch);" +
  "var winner=ranked.find(function(c){return isFinite(c.cac);});" +
  "var loser=[...ranked].reverse().find(function(c){return isFinite(c.cac);});" +
  "var t=totalsF(ch);var blen=bCAC(ch);" +
  "var blRatio=t.tc>0?ch.reduce(function(a,c){return a+c.ltv*c.conversions;},0)/t.tc/blen:0;" +
  "var finiteRatios=ch.filter(function(c){return isFinite(c.cac)&&c.ratio>0;}).map(function(c){return c.ratio;});" +
  "var tEmo='',tLab='';" +
  "if(finiteRatios.length===0){tEmo='\\u26AA';tLab=tk('calc_out.ltv_by_channel.row.health_no_channels','No channels with conversions \\u2014 enter conversion counts to compare');}" +
  "else{var minR=Math.min.apply(null,finiteRatios);" +
  "if(minR>=3){tEmo='\\uD83D\\uDFE2';tLab=tk('calc_out.ltv_by_channel.row.health_all_green','All channels \\uD83D\\uDFE2 \\u2014 every channel > 3x LTV:CAC; scale aggressively');}" +
  "else if(minR>=1){tEmo='\\uD83D\\uDFE1';tLab=tk('calc_out.ltv_by_channel.row.health_all_yellow','All channels \\uD83D\\uDFE1 \\u2014 every channel > 1x but some < 3x; reallocate to top performers');}" +
  "else if(minR>=0.5){tEmo='\\uD83D\\uDFE0';tLab=tk('calc_out.ltv_by_channel.row.health_some_orange','At least one channel \\uD83D\\uDFE0 \\u2014 0.5-1x LTV:CAC; investigate creative/targeting');}" +
  "else{tEmo='\\uD83D\\uDD34';tLab=tk('calc_out.ltv_by_channel.row.health_some_red','At least one channel \\uD83D\\uDD34 \\u2014 losing money on that channel; pause or rework');}}" +
  "function money(n){return '$'+Math.round(n).toLocaleString('en-US');}" +
  "function money0(n){return isFinite(n)?'$'+n.toFixed(2):'\\u221E';}" +
  "var realloc='';" +
  "if(winner&&loser&&winner.id!==loser.id){var ra=loser.spend*0.25;var nws=winner.spend+ra;var nwc=nws/winner.conversions;var nwr=winner.ltv/nwc;var nls=loser.spend-ra;var nlc=nls/Math.max(loser.conversions,1);var nlr=loser.ltv/nlc;realloc=tk('calc_out.ltv_by_channel.row.whatif_shift_25pct','Shift 25% from '+loser.id+' \\u2192 '+winner.id+':',{from:loser.id,to:winner.id})+'\\n  \\u2022 '+tk('calc_out.ltv_by_channel.row.whatif_winner_ratio',winner.id+': ratio '+winner.ratio.toFixed(2)+'x \\u2192 '+nwr.toFixed(2)+'x (CAC rises)',{id:winner.id,from:winner.ratio.toFixed(2),to:nwr.toFixed(2)})+'\\n  \\u2022 '+tk('calc_out.ltv_by_channel.row.whatif_loser_ratio',loser.id+': ratio '+loser.ratio.toFixed(2)+'x \\u2192 '+nlr.toFixed(2)+'x (improves if convs stay)',{id:loser.id,from:loser.ratio.toFixed(2),to:nlr.toFixed(2)});}else{realloc=tk('calc_out.ltv_by_channel.row.whatif_need_second_channel','Add a 2nd channel to compare (currently only one valid channel).');}" +
  "var lc=finiteRatios.length>0?ch.filter(function(c){return isFinite(c.cac)&&c.ratio>0;}).reduce(function(min,c){return c.ratio<min.ratio?c:min;}):null;" +
  "var beT='';" +
  "if(lc){var tgtCAC=lc.ltv/1;var curCAC=lc.cac;var cut=curCAC-tgtCAC;beT=tk('calc_out.ltv_by_channel.row.breakeven_push_to_green','To push '+lc.id+' from '+lc.ratio.toFixed(2)+'x to \\uD83D\\uDFE2 (\\u22653.0x):',{id:lc.id,ratio:lc.ratio.toFixed(2)})+'\\n  \\u2022 '+tk('calc_out.ltv_by_channel.row.breakeven_target_cac','Target CAC: '+money0(tgtCAC)+' (currently '+money0(curCAC)+')',{target:money0(tgtCAC),current:money0(curCAC)})+'\\n  \\u2022 '+tk('calc_out.ltv_by_channel.row.breakeven_cut_cac','Need to cut CAC by '+money0(cut)+' \\u2014 improve CR by '+((cut/curCAC)*100).toFixed(0)+'% OR reduce spend '+((cut/curCAC)*100).toFixed(0)+'%',{cut:money0(cut),pct:((cut/curCAC)*100).toFixed(0)});}else{beT=tk('calc_out.ltv_by_channel.row.breakeven_need_conversions','Enter conversion counts to see break-even targets.');}" +
  "var ms='';" +
  "if(winner&&isFinite(winner.cac)){var sRev=winner.conversions*2*winner.ltv;var sProf=sRev-winner.spend*2;ms=tk('calc_out.ltv_by_channel.row.milestone_scaling','Scaling '+winner.id+' 2x (same ratio):',{id:winner.id})+'\\n  \\u2022 $calc_out.label.revenue|Revenue|: '+money(sRev)+'\\n  \\u2022 $calc_out.label.profit_after_ad_cost|Profit (after ad cost)|: '+money(sProf);}else{ms=tk('calc_out.ltv_by_channel.row.milestone_need_data','Enter data to project scaling outcomes.');}" +
  "var tip='';" +
  "if(finiteRatios.length===0){tip=JSON.stringify({code:'ltv_no_data',params:{}});}else if(winner&&loser&&winner.id===loser.id){tip=JSON.stringify({code:'ltv_single_channel',params:{}});}else if(winner&&loser){var wr=winner.ratio;var lr=loser.ratio;if(wr>=3&&lr<1){tip=JSON.stringify({code:'ltv_strong_winner',params:{winner:winner.id,winnerRatio:wr.toFixed(1),loser:loser.id,loserRatio:lr.toFixed(1)}});}else if(wr>=3&&lr>=1){tip=JSON.stringify({code:'ltv_both_healthy',params:{winner:winner.id,ratio:(wr/lr).toFixed(1),loser:loser.id}});}else if(wr<3&&lr<1){tip=JSON.stringify({code:'ltv_no_green',params:{}});}else{tip=JSON.stringify({code:'ltv_similar_ratios',params:{}});}}else{tip=JSON.stringify({code:'ltv_no_data',params:{}});}" +
  "var tr=ranked.map(function(c,i){var e=hBand(c.ratio);var cs=isFinite(c.cac)?money0(c.cac):'\\u221E (no conv)';var rs=isFinite(c.cac)?c.ratio.toFixed(2)+'x':'\\u2014';var rk=i===0?'\\uD83C\\uDFC6 ':'   ';return rk+e+' '+tk('calc_out.ltv_by_channel.row.channel_row',c.id+'  \\u00B7  spend '+money(c.spend)+' \\u00B7 conv '+c.conversions+' \\u00B7 LTV '+money(c.ltv)+' \\u00B7 CAC '+cs+' \\u00B7 '+rs,{id:c.id,spend:money(c.spend),conv:String(c.conversions),ltv:money(c.ltv),cac:cs,ratio:rs});}).join('\\n');" +
  "var r2='';" +
  "r2+='$calc_out.section.ltv_by_channel_calculator|\\u23F0 LTV by Channel Calculator|\\n\\n';" +
  "r2+='$calc_out.section.health|\\uD83E\\uDE7A Health:|\\n';" +
    "r2+='\\u2501'.repeat(41)+'\\n';" +
  "r2+='\\u2022 '+tEmo+' '+tLab+'\\n';" +
  "r2+='\\u2022 $calc_out.label.winner|Winner|: '+(winner?winner.id+' ('+winner.ratio.toFixed(2)+'x)':'n/a')+'  \\u00B7  $calc_out.label.loser|Loser|: '+(loser?loser.id+' ('+loser.ratio.toFixed(2)+'x)':'n/a')+'\\n';" +
  "r2+='\\u2022 $calc_out.label.blended_cac|Blended CAC|: '+(isFinite(blen)?money0(blen):'\\u221E')+'  \\u00B7  $calc_out.label.blended_ltv_cac|Blended LTV:CAC|: '+(isFinite(blRatio)?blRatio.toFixed(2)+'x':'\\u2014')+'\\n\\n';" +
    "r2+='\\u2501'.repeat(41)+'\\n\\n';" +
  "r2+='$calc_out.section.inputs_snapshot|\\uD83D\\uDCCA Inputs Snapshot:|\\n';" +
    "r2+='\\u2501'.repeat(41)+'\\n';" +
  "r2+=tr+'\\n\\n';" +
  "r2+='\\u2022 $calc_out.label.total_spend|Total spend|:  '+money(t.ts)+'\\n';" +
  "r2+='\\u2022 $calc_out.label.total_conv|Total conv|:   '+t.tc+'\\n';" +
  "r2+='\\u2022 $calc_out.label.blended_cac|Blended CAC|:  '+(isFinite(blen)?money0(blen):'\\u221E')+'\\n\\n';" +
    "r2+='\\u2501'.repeat(41)+'\\n\\n';" +
  "r2+='$calc_out.section.what_if|\\uD83D\\uDD04 What-If:|\\n';" +
    "r2+='\\u2501'.repeat(41)+'\\n';" +
  "r2+=realloc+'\\n\\n';" +
    "r2+='\\u2501'.repeat(41)+'\\n\\n';" +
  "r2+='$calc_out.section.break_even|\\u2696\\uFE0F Break-Even:|\\n';" +
    "r2+='\\u2501'.repeat(41)+'\\n';" +
  "r2+=beT+'\\n\\n';" +
    "r2+='\\u2501'.repeat(41)+'\\n\\n';" +
  "r2+='$calc_out.section.milestone|\\uD83C\\uDFAF Milestone:|\\n';" +
    "r2+='\\u2501'.repeat(41)+'\\n';" +
  "r2+=ms+'\\n\\n';" +
    "r2+='\\u2501'.repeat(41)+'\\n\\n';" +
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
  // P140f-p3-T7: minimal Playbook 6 字段 template (Goal=该不该决策)
  // Goal 含"决策"+"该不该"双关键词 → 通过 T1 zod refine 校验
  playbook: {
    goal: '用户该不该把预算压到回报最高的那个渠道上 —— 先看 LTV:CAC 是否 ≥ 3x、回本周期是否短于 12 个月',
    input: 'engine 定义的 inputs 字段',
    output: 'engine 定义的 generate() 返回数组',
    constraint: 'apply 引擎 inputs 时受实际场景约束',
    tool: '页面的「🧭 算完之后」决策区块（决策支持已由区块独占）',
    memory: 'v2.0 11 business domain benchmark + P140f Phase 4 主题簇',
  },
  generate: calculate,
  staticExamples: ['$calc_out.section.ltv_by_channel_calculator|⏰ LTV by Channel Calculator|\n\n$calc_out.section.health|🩺 Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 $calc_out.ltv_by_channel.row.health_all_green|All channels 🟢 — every channel > 3x LTV:CAC; scale aggressively|\n• $calc_out.label.winner|Winner|: Ch1 (25.00x)  ·  $calc_out.label.loser|Loser|: Ch4 (13.33x)\n• $calc_out.label.blended_cac|Blended CAC|: $32.90  ·  $calc_out.label.blended_ltv_cac|Blended LTV:CAC|: 17.16x\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🏆 🟢 $calc_out.ltv_by_channel.row.channel_row{"id":"Ch1","spend":"$1,000","conv":"50","ltv":"$500","cac":"$20.00","ratio":"25.00x"}|Ch1  ·  spend $1,000 · conv 50 · LTV $500 · CAC $20.00 · 25.00x|\n   🟢 $calc_out.ltv_by_channel.row.channel_row{"id":"Ch5","spend":"$600","conv":"15","ltv":"$700","cac":"$40.00","ratio":"17.50x"}|Ch5  ·  spend $600 · conv 15 · LTV $700 · CAC $40.00 · 17.50x|\n   🟢 $calc_out.ltv_by_channel.row.channel_row{"id":"Ch2","spend":"$1,500","conv":"30","ltv":"$800","cac":"$50.00","ratio":"16.00x"}|Ch2  ·  spend $1,500 · conv 30 · LTV $800 · CAC $50.00 · 16.00x|\n   🟢 $calc_out.ltv_by_channel.row.channel_row{"id":"Ch3","spend":"$800","conv":"20","ltv":"$600","cac":"$40.00","ratio":"15.00x"}|Ch3  ·  spend $800 · conv 20 · LTV $600 · CAC $40.00 · 15.00x|\n   🟢 $calc_out.ltv_by_channel.row.channel_row{"id":"Ch4","spend":"$1,200","conv":"40","ltv":"$400","cac":"$30.00","ratio":"13.33x"}|Ch4  ·  spend $1,200 · conv 40 · LTV $400 · CAC $30.00 · 13.33x|\n\n• $calc_out.label.total_spend|Total spend|:  $5,100\n• $calc_out.label.total_conv|Total conv|:   155\n• $calc_out.label.blended_cac|Blended CAC|:  $32.90\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if|🔄 What-If:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.ltv_by_channel.row.whatif_shift_25pct{"from":"Ch4","to":"Ch1"}|Shift 25% from Ch4 → Ch1:|\n  • $calc_out.ltv_by_channel.row.whatif_winner_ratio{"id":"Ch1","from":"25.00","to":"19.23"}|Ch1: ratio 25.00x → 19.23x (CAC rises)|\n  • $calc_out.ltv_by_channel.row.whatif_loser_ratio{"id":"Ch4","from":"13.33","to":"17.78"}|Ch4: ratio 13.33x → 17.78x (improves if convs stay)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.break_even|⚖️ Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.ltv_by_channel.row.breakeven_push_to_green{"id":"Ch4","ratio":"13.33"}|To push Ch4 from 13.33x to 🟢 (≥3.0x):|\n  • $calc_out.ltv_by_channel.row.breakeven_target_cac{"target":"$400.00","current":"$30.00"}|Target CAC: $400.00 (currently $30.00)|\n  • $calc_out.ltv_by_channel.row.breakeven_cut_cac{"cut":"$-370.00","pct":"-1233"}|Need to cut CAC by $-370.00 — improve CR by -1233% OR reduce spend -1233%|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.milestone|🎯 Milestone:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.ltv_by_channel.row.milestone_scaling{"id":"Ch1"}|Scaling Ch1 2x (same ratio):|\n  • $calc_out.label.revenue|Revenue|: $50,000\n  • $calc_out.label.profit_after_ad_cost|Profit (after ad cost)|: $48,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: {"code":"ltv_both_healthy","params":{"winner":"Ch1","ratio":"1.9","loser":"Ch4"}}\n'],
  faq: [
    { q: 'How many channels should I compare?', a: 'Up to 5 — typical solopreneurs use 3-4 (Google Ads, Meta, TikTok, Email). Empty fields are skipped; only fill channels with data.' },
    { q: 'What is a good LTV:CAC ratio?', a: '3:1 is the textbook benchmark (🟢). 1:1 means you break even (🟡). Below 1:1 means losing money (🔴). World-class SaaS targets 5:1+' },
    { q: 'How do I find LTV per user?', a: 'Two ways: (1) historical — sum revenue per cohort over their lifetime; (2) forward — ARPU ÷ monthly churn %. Both work; pick whichever your data supports.' },
    { q: 'What if some channels have no conversions?', a: 'Those channels are flagged "∞ (no conv)" — they pull your blended CAC up but are not ranked. Investigate targeting before adding spend.' },
    { q: "What is LTV by channel?", a: "LTV by channel = customer lifetime value of customers acquired through each marketing channel. Channel examples: paid search, social, organic, email, referral. Compare: which channel delivers highest-LTV customers? Often: referral and organic have highest LTV. Paid social: lower. Use for: budget allocation, channel optimization. Best: track LTV:CAC by channel." },
    { q: "How do I measure LTV by channel?", a: "Steps: 1) Track channel of acquisition (UTM, referral code, attribution), 2) Calculate LTV per cohort (revenue per customer over time), 3) Wait for cohorts to mature (6-12 months for SaaS), 4) Compare LTV across channels. Tools: Mixpanel, Amplitude, custom SQL, HubSpot. Track over time. Most teams: 2-3x LTV difference between best and worst channel." },
    { q: "Why do LTVs differ by channel?", a: "Reasons: 1) Intent (search ads = high intent, display = low), 2) Audience fit (referral = loyal, social = broad), 3) Funnel position (top of funnel = lower LTV), 4) Creative/messaging (specific = qualified), 5) Trust (earned = better). Most expensive channel: usually paid social. Highest LTV: usually referral or organic. Test all channels." },

    { q: "How do I improve LTV by channel?", a: "Tactics include 1) Better targeting (right audience for each channel), 2) Better onboarding (activation), 3) Retention (reduce churn), 4) Upsell/cross-sell, 5) Loyalty programs, 6) Win-back. Most teams 30-50% LTV improvement in 12 months. Biggest lever: retention (cuts churn 1% = 5-10% LTV lift). Track monthly cohort LTV. Optimize lowest LTV channel first." },
    { q: "How long should I track LTV by channel?", a: "SaaS: 12-24 months. E-commerce: 6-12 months. Subscription: 12-36 months. Until churn stabilizes. Mature cohort = reliable LTV. New channel: assume similar to mature, validate over time. For payback: 6-12 months typical. Most teams: 18-month LTV. CAC:LTV = 1:3+ is the gold standard. Update quarterly as cohorts mature." },
    { q: "What is the difference between gross LTV and net LTV?", a: "Gross LTV: total revenue per customer. Net LTV: revenue minus cost to serve. Use net for unit economics. Gross for marketing ROI. Calculate net: gross_revenue - (COGS + support_cost + payment_fees). For SaaS: gross_margin 70-85% of revenue. Net LTV typically 50-80% of gross. Use net LTV for CAC payback. Most teams: 3-4x net LTV:CAC." },
    { q: "How do I allocate marketing budget by LTV by channel?", a: "Calculate: budget per channel × LTV:CAC. Allocate: highest LTV:CAC first, then lower. If channel A LTV:CAC 5:1 and channel B 2:1, prefer A. But: A may have lower volume. Balance: 60% on highest LTV, 30% on second, 10% on experimental. Track monthly. Reallocate quarterly. Most teams: 2-3x ROAS improvement with LTV-based allocation." },
    { q: 'What attribution model should I use for LTV by channel?', a: 'Last-click attribution overstates bottom-funnel channels (brand search, retargeting) and understates top-funnel (YouTube, podcasts, organic). For stable LTV-by-channel reporting, use a position-based model (40% first-touch, 40% last-touch, 20% spread across middle touches) or data-driven attribution if your volume supports it (typically needs 10K+ conversions per channel per quarter for statistically stable weights). Until then, report LTV alongside both first-touch and last-touch views to avoid the channel-mix illusion that comes from single-touch models.' },
  ],
  howToUse: [
    'Pick 2-5 marketing channels to compare (Google Ads, Meta, TikTok, etc.).',
    'For each channel, enter total spend, conversions, and LTV per user.',
    'Read the ranked table — the winner has the highest LTV:CAC ratio.',
    'Use the What-If section to model budget reallocation scenarios.',
    'Check the Break-Even target for the lowest-band channel.',
  ],
  engineKey: true,
};

registerEngine(engine);
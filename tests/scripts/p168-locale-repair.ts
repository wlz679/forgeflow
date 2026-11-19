#!/usr/bin/env node
// P168 B3-9 —— **locale 模板修复落库**（可复算工具）。
//
// ⭐ 干什么：把「模板里的数值被冻结」/「共享 code 英文冲突」导致的错误模板纠正回正确值。
//
// ⭐ 怎么定「正确值」：**不用人肉判断**，而是跑 p168-locale-roundtrip.ts 的判据
//   （现值必须与 token 兜底渲染逐字一致）⇒ 从两个推导分支里挑**能往返**的那个。
//   ⇒ 挑不出来的 ⇒ 报告「需改引擎源码」（本工具不碰引擎）。
//
// ⭐ zh 值同步：zh 必须与 en **占位符集合一致**（G1/G2 的硬要求）
//   ⇒ zh 模板 = 把 en 模板的占位符换回 zh 译文的对应片段。
//   本工具带一份**人工确认的 zh 覆盖表**（只列需要改写的键）。
//
// 用法：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-locale-repair.ts --dry   # 只报告
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-locale-repair.ts         # 落库

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { measure } from './p168-locale-roundtrip.ts';
import { insertCalcOut, serializeLocale } from './p168-locale-order.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const DRY = process.argv.includes('--dry');

/** 需要改写的 zh 译文（人工确认；占位符必须与 en 一致） */
const ZH_OVERRIDE: Record<string, string> = {
  'calc_out.ai_training_cost_estimator.row.health_storage_significant':
    '• 💡 {gb}GB 存储量相当可观 —— 考虑 S3 冷存储或数据集压缩。',
  'calc_out.cohort_retention.row.biggest_drop':
    '最大跌幅: 出现在 M{month} 与下一个检查点之间（−{drop}pp）',
  'calc_out.cohort_retention.row.breakeven_current_gap':
    '当前 M6: {m6}  ·  差距: 还需 +{gap}pp',
  'calc_out.logo_churn_rate.row.whatif_halve_loss':
    '流失减半（{half}，而非 {lost}）: 流失率 {churn}% (-{lift}pp)',
  'calc_out.logo_churn_rate.row.whatif_lose_only_3':
    '只流失 3 位: 流失率 {churn}% (-{lift}pp)',
  'calc_out.ltv_by_channel.row.breakeven_push_to_green':
    '要把 {id} 从 {ratio}x 推到 🟢（≥3.0x）：',
  'calc_out.revenue_projector.row.quarter_milestone':
    '• Q{q}（第 {month} 个月）：  {mrr}/mo',
  // ⭐ P168 B3-11（2026-11-18）：revenue-projector 的里程碑行模板把区间的**两个端点**
  //   都写成了 {months}（应是 {fast}–{slow}）⇒ en/zh 模板渲染出来是退化的「[15–15]」。
  //   ⚠️ 这个模板 bug 此前**被输入缺陷掩盖**：B3-11 之前 codegen 喂的键名对不上
  //   ⇒ 引擎读到的 MRR 是错的 ⇒ 区间两端恰好相等 ⇒ 模板与兜底「碰巧一致」⇒ 守卫绿。
  //   ⇒ 修好输入后区间变成真实的「[11–24]」⇒ 模板立刻露馅（G8 / G17 同时报红）。
  //   ⇒ 修法：**不手改 locale**，走本工具（en 取 literal 候选，zh 走本覆盖表）。
  'calc_out.revenue_projector.row.milestone':
    '• {target}：  {months} 个月 [{fast}–{slow}]',
  'calc_out.roas.row.break_even_revenue':
    '盈亏平衡收入: {revenue}  （利润率 {margin}% → ROAS = {roas}）',
  'calc_out.gemini_api_cost.row.health_tier_micro':
    '• 🟢 微量档位（每月低于 $5）—— {model}，每月成本 {cost}。',
  'calc_out.gemini_api_cost.row.health_tier_low':
    '• 🟢 低用量档位 —— {model}，每月成本 {cost}。',
  'calc_out.gemini_api_cost.row.health_tier_mid':
    '• 🟡 中等用量档位 —— {model}，每月成本 {cost}。',
  'calc_out.gemini_api_cost.row.health_tier_high':
    '• 🟠 高用量档位 —— {model}，每月成本 {cost}。',
  'calc_out.deepseek_api_cost.row.health_tier_micro':
    '• 🟢 微量档位（每月低于 $5）—— {model}，每月成本 {cost}。',
  'calc_out.deepseek_api_cost.row.health_tier_low':
    '• 🟢 低用量档位 —— {model}，每月成本 {cost}。',
  'calc_out.deepseek_api_cost.row.health_tier_mid':
    '• 🟡 中等用量档位 —— {model}，每月成本 {cost}。',
  'calc_out.deepseek_api_cost.row.health_tier_high':
    '• 🟠 高用量档位 —— {model}，每月成本 {cost}。',
};

/** 新增键（引擎拆分共享 code 后产生）的 en + zh */
const NEW_KEYS: Record<string, { en: string; zh: string }> = {
  'calc_out.label.avg_revenue_per_customer_mo': {
    en: 'Avg Revenue per Customer',
    zh: '每客户平均收入',
  },
  'calc_out.gemini_api_cost.row.family_gem4': {
    en: '(Gemini 4 Argon)',
    zh: '（Gemini 4 Argon）',
  },
  'calc_out.gemini_api_cost.row.family_flash3': {
    en: '(Gemini 3 Flash)',
    zh: '（Gemini 3 Flash）',
  },
  'calc_out.gemini_api_cost.row.family_legacy': {
    en: '(Legacy)',
    zh: '（旧版）',
  },
  'calc_out.deepseek_api_cost.row.family_legacy': {
    en: '(Legacy)',
    zh: '（旧版）',
  },
  'calc_out.gpu_cloud_cost.row.health_storage_high': {
    en: '• ⚠️ Storage + egress is {pct}% of total — review whether you need all that data online.',
    zh: '• ⚠️ 存储 + 出网流量占总成本的 {pct}% —— 复核一下是否真的需要把这些数据都放在线上。',
  },
  'calc_out.label.customers_lost_period': {
    en: 'Customers lost',
    zh: '周期内流失客户数',
  },
  'calc_out.claude_api_cost.row.usage_scenario_line': {
    en: '{icon} {model} ({family}): {v50} · {v100} · {v500} · {v1k} · {v5k} · {v10k}',
    zh: '{icon} {model}（{family}）每月成本：{v50} · {v100} · {v500} · {v1k} · {v5k} · {v10k}',
  },
  'calc_out.gemini_api_cost.row.usage_scenario_line': {
    en: '{icon} {model}: {v50} · {v100} · {v500} · {v1k} · {v5k} · {v10k}',
    zh: '{icon} {model} 每月成本：{v50} · {v100} · {v500} · {v1k} · {v5k} · {v10k}',
  },
  'calc_out.deepseek_api_cost.row.usage_scenario_line': {
    en: '{icon} {model}: {v50} · {v100} · {v500} · {v1k} · {v5k} · {v10k}',
    zh: '{icon} {model} 每月成本：{v50} · {v100} · {v500} · {v1k} · {v5k} · {v10k}',
  },
};

/**
 * 模板修正表（2026-11-17 B3-9 实测修）—— **冻结值 / 缺占位符**的模板一次性纠正。
 *
 * ⭐ 判据来源：`tests/scripts/p168-locale-token-parity.ts`（token 逐条校验）
 *   ① 占位符守恒：模板的 {param} 集合必须覆盖 token params 里**出现在兜底文本中**的键
 *   ② 渲染等价：用 token 自带 params 渲染模板 == 兜底文本
 * ⭐ en 值 = **源码推导模板**（把运行时的具体数值换回 {param}）
 *   zh 值 = 人工译文，占位符集合必须与 en **逐字一致**
 */
const TEMPLATE_FIXES: Record<string, { en: string; zh: string }> = {
  'calc_out.ai_training_cost_estimator.row.whatif_switch_full_finetune': {
    en: '• Switch to full fine-tune:  {cost}  ({mult}x cost, but better quality)',
    zh: '• 切换到全量微调:  {cost}  （{mult} 倍成本，但质量更好）',
  },
  'calc_out.claude_api_cost.row.health_spread_warning': {
    en: '• 🟠 {ratio}x cost spread across selected models — review if every model needs to be premium.',
    zh: '• 🟠 所选模型之间成本差距达到 {ratio}x —— 复核一下是否每个模型都需要高端档位。',
  },
  'calc_out.claude_api_cost.row.health_cache_write_mult': {
    en: '• 💡 Cache write multiplier is {mult}x — writes are expensive. Only cache stable prefixes (system prompts, few-shot examples).',
    zh: '• 💡 缓存写入倍率为 {mult}x —— 写入本身很贵，只缓存稳定的前缀内容（系统提示词、few-shot 示例）。',
  },
  'calc_out.claude_api_cost.row.health_spread_ok': {
    en: '• 🟢 Healthy cost spread ({ratio}x) across selected models.',
    zh: '• 🟢 所选模型之间的成本差距处于健康区间（{ratio}x）。',
  },
  'calc_out.gemini_api_cost.row.health_spread_healthy': {
    en: '• 🟢 Healthy cost spread ({ratio}x) across selected models.',
    zh: '• 🟢 所选模型之间的成本差距健康（{ratio}x）。',
  },
  'calc_out.deepseek_api_cost.row.health_spread_healthy': {
    en: '• 🟢 Healthy cost spread ({ratio}x) across selected models.',
    zh: '• 🟢 所选模型之间的成本差距健康（{ratio}x）。',
  },
  'calc_out.ai_image_cost.row.whatif_cut_in_half': {
    en: '• Cut volume in half: Save ${save}/mo (${cur} → ${half})',
    zh: '• 用量砍到一半：每月省 ${save}（${cur} → ${half}）',
  },
  'calc_out.gpu_cloud_cost.row.storage_ssd_rate': {
    en: 'Storage (SSD): ${rate}/GB/month',
    zh: '存储（SSD）：${rate}/GB/月',
  },
  'calc_out.gpu_cloud_cost.row.network_egress_rate': {
    en: 'Network Egress: ${rate}/GB',
    zh: '网络出网流量：${rate}/GB',
  },
  'calc_out.gpu_cloud_cost.row.spot_reserved_tip': {
    en: '💡 {provider} spot instances save {spot}% but can be interrupted. Reserved instances save {reserved}% with 1-year commitment. Cheapest provider for {gpu}: {cheapest} at {cost}/mo.',
    zh: '💡 {provider} 的抢占式实例可省 {spot}%，但可能被中断。预留实例签 1 年承诺可省 {reserved}%。{gpu} 最便宜的厂商是 {cheapest}，每月 {cost}/mo。',
  },
  'calc_out.deepseek_api_cost.row.output_cost': {
    en: 'Output: {tokens} tokens × {rate}/1M → {cost}/req',
    zh: '输出：{tokens} tokens × {rate}/1M → {cost}/req',
  },
  'calc_out.gemini_api_cost.row.output_cost': {
    en: 'Output: {tokens} tokens × {rate}/1M → {cost}/req',
    zh: '输出：{tokens} tokens × {rate}/1M → {cost}/req',
  },
  'calc_out.gemini_api_cost.row.health_tier_micro': {
    en: '• 🟢 Micro-tier (under $5/mo) — {model} at {cost}/mo.',
    zh: '• 🟢 微量档位（每月低于 $5）—— {model}，每月成本 {cost}。',
  },
  'calc_out.gemini_api_cost.row.health_tier_low': {
    en: '• 🟢 Low-volume tier — {model} at {cost}/mo.',
    zh: '• 🟢 低用量档位 —— {model}，每月成本 {cost}。',
  },
  'calc_out.gemini_api_cost.row.health_tier_mid': {
    en: '• 🟡 Mid-volume tier — {model} at {cost}/mo.',
    zh: '• 🟡 中等用量档位 —— {model}，每月成本 {cost}。',
  },
  'calc_out.gemini_api_cost.row.health_tier_high': {
    en: '• 🟠 High-volume tier — {model} at {cost}/mo.',
    zh: '• 🟠 高用量档位 —— {model}，每月成本 {cost}。',
  },
  'calc_out.deepseek_api_cost.row.health_tier_micro': {
    en: '• 🟢 Micro-tier (under $5/mo) — {model} at {cost}/mo.',
    zh: '• 🟢 微量档位（每月低于 $5）—— {model}，每月成本 {cost}。',
  },
  'calc_out.deepseek_api_cost.row.health_tier_low': {
    en: '• 🟢 Low-volume tier — {model} at {cost}/mo.',
    zh: '• 🟢 低用量档位 —— {model}，每月成本 {cost}。',
  },
  'calc_out.deepseek_api_cost.row.health_tier_mid': {
    en: '• 🟡 Mid-volume tier — {model} at {cost}/mo.',
    zh: '• 🟡 中等用量档位 —— {model}，每月成本 {cost}。',
  },
  'calc_out.deepseek_api_cost.row.health_tier_high': {
    en: '• 🟠 High-volume tier — {model} at {cost}/mo.',
    zh: '• 🟠 高用量档位 —— {model}，每月成本 {cost}。',
  },
  'calc_out.claude_api_cost.row.cheapest_line': {
    en: '🏆 Cheapest: {name} at {cost}/mo',
    zh: '🏆 最便宜: {name}，每月 {cost}',
  },
  'calc_out.gemini_api_cost.row.cheapest': {
    en: '🏆 Cheapest: {model} at {cost}/mo',
    zh: '🏆 最便宜: {model}，每月 {cost}/mo',
  },
  'calc_out.deepseek_api_cost.row.cheapest': {
    en: '🏆 Cheapest: {model} at {cost}/mo',
    zh: '🏆 最便宜: {model}，每月 {cost}/mo',
  },
  'calc_out.label.volume': {
    en: 'Volume',
    zh: '月用量',
  },
  // ⭐ 令牌化时**自己另写了一套 zh 措辞** ⇒ 把仓库既有的 legacy 措辞顶掉了
  //   （P105 / P117 / P118 的「working i18n key 必须仍在目标页出现」守卫因此报红）
  //   ⇒ 修法：**对齐既有措辞**（保留 emoji 前缀），而不是改守卫。
  'calc_out.claude_api_cost.row.usage_scenarios': {
    en: '📊 Usage Scenarios (monthly cost at {rpd} reqs/day)',
    zh: '📊 使用场景（按每天 {rpd} 次请求的月度成本）',
  },
  'calc_out.section.market_size_estimator_reality_check': {
    en: '🎯 Reality Check',
    zh: '🎯 现实校验',
  },
  'calc_out.section.revenue_projector_monthly_mrr_breakdown': {
    en: '📅 Monthly MRR Breakdown',
    zh: '📅 月度 MRR 明细',
  },
  'calc_out.section.email_list_revenue_list_economics': {
    en: '📐 List Economics:',
    zh: '📐 列表经济:',
  },
};
function placeholders(s: string): string[] {
  const out: string[] = [];
  for (const m of s.matchAll(/\{(\w+)\}/g)) out.push(m[1]);
  return out.sort();
};

const enPath = resolve(ROOT, 'src/i18n/locales/en.json');
const zhPath = resolve(ROOT, 'src/i18n/locales/zh.json');
const en = JSON.parse(readFileSync(enPath, 'utf8'));
const zh = JSON.parse(readFileSync(zhPath, 'utf8'));

const rows = measure();
const bad = rows.filter((r) => r.landed !== null && !r.landedOk);
const fixes: { code: string; en: string; zh: string; note: string }[] = [];
const unresolved: string[] = [];
for (const r of bad) {
  if (r.candidates.length === 0) { unresolved.push(r.code + '（无可用候选 ⇒ 需改引擎源码）'); continue; }
  const pick = r.candidates[0];
  const zhVal = ZH_OVERRIDE[r.code] ?? null;
  if (zhVal === null) { unresolved.push(r.code + '（缺 zh 译文覆盖 ⇒ 需人工补）'); continue; }
  const pe = placeholders(pick.tpl).join(',');
  const pz = placeholders(zhVal).join(',');
  if (pe !== pz) { unresolved.push(r.code + '（占位符不一致 en=' + pe + ' zh=' + pz + '）'); continue; }
  fixes.push({ code: r.code, en: pick.tpl, zh: zhVal, note: pick.origin });
}

console.log('待修模板 ' + fixes.length + ' 条 · 待人工处理 ' + unresolved.length + ' 条');
for (const f of fixes) {
  console.log('  ' + f.code + '  (来源 ' + f.note + ')');
  console.log('    en: ' + JSON.stringify(f.en));
  console.log('    zh: ' + JSON.stringify(f.zh));
}
for (const u of unresolved) console.log('  ⚠️ ' + u);

const newCount = Object.keys(NEW_KEYS).length;
console.log('新增键 ' + newCount + ' 条');
for (const [k, v] of Object.entries(NEW_KEYS)) {
  if (en[k] !== undefined) { console.log('  ⚠️ ' + k + ' 已存在，跳过'); continue; }
  console.log('  ' + k + ' => ' + JSON.stringify(v.en) + ' | ' + JSON.stringify(v.zh));
}

console.log('—— 模板修正表（' + Object.keys(TEMPLATE_FIXES).length + ' 条）——');
for (const [k, v] of Object.entries(TEMPLATE_FIXES)) {
  console.log('  ' + k);
  console.log('    en: ' + JSON.stringify(v.en));
  console.log('    zh: ' + JSON.stringify(v.zh));
}

if (DRY) { console.log('（--dry：不写盘）'); process.exit(0); }

// ── 落库 ──
const enNew: Record<string, string> = {};
const zhNew: Record<string, string> = {};
const tplIssues: string[] = [];
for (const [k, v] of Object.entries(TEMPLATE_FIXES)) {
  const pe = placeholders(v.en).join(',');
  const pz = placeholders(v.zh).join(',');
  if (pe !== pz) { tplIssues.push(k + '  占位符不一致 en=' + pe + ' zh=' + pz); continue; }
  // 已存在的键：**原地改值**（位置不变）
  en[k] = v.en;
  zh[k] = v.zh;
}
for (const f of fixes) {
  if (en[f.code] === undefined) { enNew[f.code] = f.en; zhNew[f.code] = f.zh; }
  else { en[f.code] = f.en; zh[f.code] = f.zh; }
}
for (const [k, v] of Object.entries(NEW_KEYS)) {
  if (en[k] !== undefined) continue;
  const pe = placeholders(v.en).join(',');
  const pz = placeholders(v.zh).join(',');
  if (pe !== pz) { tplIssues.push(k + '  占位符不一致 en=' + pe + ' zh=' + pz); continue; }
  enNew[k] = v.en;
  zhNew[k] = v.zh;
}
const enNext = insertCalcOut(en, enNew);
const zhNext = insertCalcOut(zh, zhNew);
writeFileSync(enPath, serializeLocale(enNext), 'utf8');
writeFileSync(zhPath, serializeLocale(zhNext), 'utf8');
console.log('已落库：修 ' + fixes.length + ' 条 + 模板修正 ' + (Object.keys(TEMPLATE_FIXES).length - tplIssues.length) + ' 条 + 新增 ' + Object.keys(enNew).length + ' 条');
if (tplIssues.length) {
  console.log('⚠️ 占位符不一致未落库：');
  for (const t of tplIssues) console.log('  ' + t);
  process.exit(1);
}

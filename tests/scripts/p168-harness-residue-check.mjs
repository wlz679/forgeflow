#!/usr/bin/env node
// P168 —— 变异台子的**残留自检**（诊断工具，入库可复算）。
//
// 它回答一个问题：**台子被硬杀之后，仓库里有没有留下变异？**
//
// ⭐⭐ 为什么需要它（实测踩到）
//   台子的收尾还原在「被硬杀」（运行时中断 / 断电 / 任务被取消）时**不会执行**
//   ⇒ 变异就留在仓库里（P168 实测留下过 `decisionRender = true`）。
//   ⇒ 而**台子自己的磁盘快照会把这个污染一起烤进去**
//   （快照是在「开跑那一刻」抓的 ⇒ 若开跑前就已被污染，快照=污染）
//   ⇒ 下次开跑的自愈会把污染**再装回去** ⇒ 越跑越脏。
//
// ⭐ 判据落在「**意图内容**」上，不是「有没有探针字符串」
//   （B3-0 的老教训：只查探针会漏掉这类污染 —— M11 残留里根本没有探针字符串）。
//
// ⚠️ 这是**诊断工具**，不是 CI 守卫：
//   签名清单与台子的变异一一对应，台子加了新变异时这里要同步补。
//   ⇒ 不要把它接进 pnpm check（会因正常的重构而误报）。
//
// 跑法（必须从仓库根目录跑）：
//   node tests/scripts/p168-harness-residue-check.mjs
//
// 退出码：0 = 干净；1 = 有残留（打印是哪条变异的形状）。

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

const burn = 'src/engines/saas/burn-rate-calculator.ts';
const cac = 'src/engines/valuation/cac-calculator.ts';
const ltv = 'src/engines/marketing/ltv-by-channel-calculator.ts';
const page = 'src/pages/[lang]/[slug].astro';
const lib = 'src/lib/decision-support.ts';
const tpl = 'src/lib/decision-tip-templates.ts';
const en = 'src/i18n/locales/en.json';
const zh = 'src/i18n/locales/zh.json';

// [变异 ID, 文件, 说明, 判定：true = 「该形状不存在」（干净）]
const CHECKS = [
  ['M1',  lib,  'hasDecisionLines 少了 export', (s) => !/\nfunction hasDecisionLines\(/.test(s)],
  ['M2',  lib,  'findLine 的 at 被写死成 0', (s) => !s.includes('const at = 0;')],
  ['M3',  lib,  'markdown 粗体剥离被删', (s) => s.includes("text = text.replace(/\\*\\*/g, '');")],
  ['M23', lib,  '「没有 code 就 null」被删', (s) => s.includes('if (!code) return null;')],
  ['M24', lib,  'replaceAll 被降级成 replace', (s) => s.includes("s.replaceAll('{' + k + '}', String(v))")],
  ['M25', tpl,  '「不存在的码返回空串」被删', (s) => s.includes("if (tmpl === key) return '';")],
  ['M8',  page, '卡片不再剥离 Tip', (s) => !s.includes('const exWithoutTip = ex;')],
  ['M9',  page, '决策区块被整体关掉', (s) => !s.includes('const decisionRender = false;')],
  ['M10', page, '事件名被改掉', (s) => !s.includes("new CustomEvent('ffk:other-event'")],
  ['M11', page, '决策区块被渲染到所有工具页', (s) => !s.includes('const decisionRender = true;')],
  ['M29', page, '客户端 raw 退回 results[0]', (s) => !s.includes("results && results.length ? String(results[0]) : ''")],
  ['M12/M14', burn, '🧭 探针段落残留', (s) => !s.includes('Variant probe')],
  ['M5',  burn, 'playbook 改回占位模板', (s) => !s.includes('用户该不该用此计算器的结果作为决策依据')],
  ['M7/M28', burn, 'burn_high_burn 被误改', (s) => s.includes("'burn_high_burn'")],
  ['M15', cac, '🧭 探针段落残留', (s) => !s.includes('Decision Recommendation')],
  ['M17', cac, 'customFn 建议码被误改', (s) => s.includes("code:'cac_payback_fast'")],
  ['M19', cac, 'Tip 退化成常量', (s) => !s.includes('const cacTip = \'Your CAC pays back')],
  ['M18', ltv, 'customFn 🧭 探针残留', (s) => !s.includes('r2probe')],
  ['M16', en,  'gdpr decision_goal 键被删', (s) => /"tools\.solopreneur-gdpr-fine-calculator\.decision_goal"/.test(s)],
  ['M22', en,  'burn-rate decision_goal 键被删', (s) => /"tools\.solopreneur-burn-rate-calculator\.decision_goal"/.test(s)],
  ['M20', en,  'ltv next_tool 悬空链接', (s) => !s.includes('[CAC Calcluator]')],
  ['M21', en,  'gdpr next_tool 的跨工具引用被剥掉', (s) => s.includes('[DPA Negotiation Cost Calculator]')],
  ['M13', en,  '复读 chunk 残留', (s) => !s.includes('Annual Burn: $-240,000/yr Current Cash: $500,000 Status: ✅ Cash-flow positive!')],
  ['M4',  zh,  'burn-rate constraint 被砍成「不可信。」', (s) => !s.includes('"tools.solopreneur-burn-rate-calculator.decision_constraint": "不可信。"')],
];

let bad = 0;
for (const [id, file, desc, ok] of CHECKS) {
  let res;
  try { res = ok(read(file)); } catch { res = false; }
  if (!res) bad++;
  console.log((res ? 'OK   ' : '✗ 残留') + ' [' + id + '] ' + file + ' —— ' + desc);
}
console.log('');
if (bad === 0) {
  console.log('✅ 台子 9 个 TARGET 全部干净（无变异残留）');
} else {
  console.log('❌ 仍有 ' + bad + ' 处残留 ⇒ 跑台子前先手动修掉（或用 git diff 对照），');
  console.log('   并且**必须把 tmp/decision-support-harness-backup.json 刷成干净内容**，');
  console.log('   否则下次开跑的自愈会把污染再装回去。');
}
process.exitCode = bad === 0 ? 0 : 1;

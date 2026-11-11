// P168 B3-4 —— 修 15 个已迁出工具的 playbook（goal 去占位 + tool 指向页面决策区块）。
//
// 为什么必须改（**迁出后的必然结果**，不是额外要求）：
//   ① `decision-support-guard` 的「激活工具：playbook 6 字段不得是占位模板」
//      —— locale 落盘后这 15 个工具变成「已激活」⇒ goal 里的「用此计算器」判红。
//   ② `playbook-6-fields-coverage-guard` 的「5 个 demo engine 必须含具体决策问题」
//      —— csat / roas / churn-rate 在那份 demo 清单里 ⇒ 同样判红。
//   ③ `tool` 字段仍写着「Phase 1 引擎自身的 🧭 Decision Recommendation」
//      —— 决策支持**已经不在引擎里了** ⇒ 字段内容变成假话。
//
// 口径照 B3-1 已上线的 cac：goal 是一句**真实的中文决策问题**（含「该不该」），
//   tool 指向页面的「🧭 算完之后」区块。
//
// 跑法：node tests/scripts/b3-4-fix-playbook.mjs [--dry]
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry');

// 每个工具一句真实的中文决策问题（必须含「该不该」/「是否」/「决策」）
const GOALS = {
  'solopreneur-churn-rate-calculator': '用户该不该按当前流失率干预留存，还是先接受这个水平把现金花在增长上',
  'solopreneur-gpu-cloud-cost-calculator': '用户该不该继续按当前 GPU 规格付费，还是先换成更便宜但够用的配置',
  'solopreneur-saas-valuation-calculator': '用户该不该按这个估值区间去谈融资，还是先把 ARR 的质量修到能站得住',
  'solopreneur-freelance-rate-calculator': '用户该不该马上提价，还是先靠多做几个客户把收入缺口补上',
  'solopreneur-employee-cost-calculator': '用户该不该按这个完全负荷成本招这个岗位，还是先换一种用工方式',
  'solopreneur-equity-dilution-calculator': '用户该不该接受这一轮的投资条款，还是先调整估值再谈',
  'solopreneur-rent-vs-buy-calculator': '用户该不该在这段居住期内买下这套房，而不是继续租',
  'solopreneur-roas-calculator': '用户该不该继续加投这个广告渠道，还是先把落地页与人群修一遍',
  'solopreneur-stockout-cost-calculator': '用户该不该为这次断货补更多库存，还是先修需求预测',
  'solopreneur-acv-calculator': '用户该不该用这个 ACV 去做容量与定价决策，还是先把客户结构拆开看',
  'solopreneur-customer-health-score-calculator': '用户该不该现在干预这个客户，还是先看是哪一项信号在拖分',
  'solopreneur-funnel-step-calculator': '用户该不该先修漏斗里掉得最狠的那一步，还是继续往后面加功能',
  'solopreneur-comp-banding-calculator': '用户该不该按这个薪资带开价，还是先调整职级与市场定位',
  'solopreneur-csat-calculator': '用户该不该把 CSAT 当成留存的先行指标去追，还是先修回复率与客户分群',
  'solopreneur-kb-coverage-rate-calculator': '用户该不该继续扩写知识库，还是先把高工单量的那些主题补上',
};

const TOOL = '页面的「🧭 算完之后」决策区块（决策支持已由区块独占）';

function findEngines(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...findEngines(full));
    else if (name.endsWith('.ts')) out.push(full);
  }
  return out;
}

let changed = 0;
const missing = [];
for (const path of findEngines(join(ROOT, 'src', 'engines'))) {
  const src = readFileSync(path, 'utf8');
  const slugM = /\bslug\s*:\s*'([^']+)'/.exec(src);
  if (!slugM) continue;
  const slug = slugM[1];
  const goal = GOALS[slug];
  if (!goal) continue;
  const pbIdx = src.indexOf('playbook: {');
  if (pbIdx < 0) { missing.push(slug + '：没有 playbook'); continue; }
  const tail = src.slice(pbIdx);
  const gm = /goal\s*:\s*'([^']*)'/.exec(tail);
  if (!gm) { missing.push(slug + '：playbook 里没有 goal'); continue; }
  const tm = /tool\s*:\s*'([^']*)'/.exec(tail);
  if (!tm) { missing.push(slug + '：playbook 里没有 tool'); continue; }
  const absGoal = pbIdx + gm.index + gm[0].indexOf(gm[1]);
  const absTool = pbIdx + tm.index + tm[0].indexOf(tm[1]);
  let out = src.slice(0, absGoal) + goal + src.slice(absGoal + gm[1].length);
  const shift = goal.length - gm[1].length;
  const absTool2 = absTool + shift;
  out = out.slice(0, absTool2) + TOOL + out.slice(absTool2 + tm[1].length);
  if (out === src) { missing.push(slug + '：没变化'); continue; }
  changed++;
  console.log((DRY ? '[dry] ' : '') + relative(ROOT, path).split('\\').join('/') + ' ← ' + slug);
  if (!DRY) writeFileSync(path, out, 'utf8');
}
console.log('');
console.log((DRY ? '[dry] ' : '') + '改了 ' + changed + ' 个引擎的 playbook' + (missing.length ? '；异常：' + missing.join('、') : ''));

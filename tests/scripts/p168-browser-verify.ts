#!/usr/bin/env node
// P168 B3-9 / B3-17 —— 浏览器层验收工具（用户所见层，可复算，已入库）。
//
// 为什么需要它（B3-8 教训：「SSR 层绿」≠「用户所见绿」）
//   产物层守卫读的是 SSR 出来的 HTML ⇒ 看不见浏览器里的后处理：
//   ① 客户端 beautifySections 的 innerHTML 替换；
//   ② customFn 渲染的动态卡片（用户点「计算」才出现）。
//   ⇒ 用户实际看到的动态卡片，产物层守卫结构上查不到。
//
// ⭐ P168 B3-17：把「假绿」的两处结构性失明补上
//   B-1：**「可见」与「存在」分开量** ——
//     旧判据 visible = 可见行字符数 + .detail 折叠区长度 ⇒ 折叠区被算成「可见」
//     ⇒ 3 行 + 4000 字符的折叠区恒 ≥ 200 ⇒ 结构上不可能发现「内容被藏起来了」。
//     现在 .detail 只作为 detailLen 诊断字段上报，**不计入可见**。
//   B-2：**动态卡片清单必须含 BIZ_V3 引擎** ——
//     旧清单 7 个全是 AI cost 引擎、0 个 BIZ_V3 ⇒ 68 个 v3 引擎的动态卡片从未被浏览器验收覆盖。
//   ⇒ 新增**结构性判据**：SSR 静态卡片有 <h3>（= 服务端 hideIndex / clientConfig.type === 'custom'）
//     ⇒ 动态卡片必须有 <h3>、不得有 .expand-btn（「查看详情」）、可见行数 ≥ 静态的 50%。
//
// 本工具怎么工作（无外部依赖、确定性等待）
//   ① 自建 Node HTTP 服务器：伺服 dist/ + 验收页 + 接收 POST /result；
//   ② 无头 Chrome 打开验收页；验收页用 iframe 批量加载同源 zh 页
//      （iframe 里脚本真执行 ⇒ 测的是 beautify 之后的用户所见）；
//   ③ 验收页跑完把结果 POST 回服务器 ⇒ 不靠「等多久」的猜测；
//   ④ 断言：静态卡片 0 整行英文 / 0 裸 token / 0 处 $$；
//      动态卡片形态与 SSR 一致（结构判据）+ 内容完整 + 0 整行英文（含折叠区）。
//
// ⭐ 验收页会**先填表再点「计算」** —— 表单没有默认值（只有 placeholder），
//   空表单提交时引擎走「请输入…」短路分支 ⇒ 动态卡片天然只剩 2~3 行 ⇒ 与静态卡片无法比较。
//   填表用的数字取自 placeholder 里的示例（= 引擎静态示例用的那组值）。
//
// 用法（必须从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-browser-verify.ts
//   环境变量：P168_CHROME / P168_BROWSER_TIMEOUT_MS（默认 240000）

import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { resolve, join, extname, normalize } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const NL = String.fromCharCode(10);
const PORT = Number(process.env.P168_BROWSER_PORT ?? 8137);
const TIMEOUT_MS = Number(process.env.P168_BROWSER_TIMEOUT_MS ?? 240000);

const SLUGS = [
'solopreneur-email-list-revenue-calculator',
'solopreneur-cap-rate-calculator',
'solopreneur-roas-calculator',
'solopreneur-cohort-retention-calculator',
'solopreneur-market-size-estimator',
'solopreneur-ltv-by-channel-calculator',
'solopreneur-churn-rate-calculator',
'solopreneur-pipeline-coverage-calculator',
'solopreneur-cac-calculator',
'solopreneur-ai-training-cost-estimator',
'solopreneur-content-marketing-roi-calculator',
'solopreneur-revenue-projector',
'solopreneur-logo-churn-rate-calculator',
'solopreneur-email-campaign-roi-calculator',
'solopreneur-renewal-rate-calculator',
];

// P168 B3-17：⭐ 动态卡片清单**必须含 BIZ_V3 引擎** ——
//   旧清单 7 个全是 AI cost 引擎、0 个 BIZ_V3 ⇒ 68 个 v3 引擎的动态卡片从未被浏览器验收覆盖
//   ⇒ 「用户所见层的守卫本身是绿的」这个假绿就是这么来的。
//   现在补上 nrr / roas / kb-coverage（计划点名的三个）+ 一批其它 v3 引擎。
//
// ⭐ 为什么分两组
//   AI cost 家族：模型名 / 价格表按设计保留英文（页面 P85a 注释：「模型名等技术/通用内容保持英文」）
//   ⇒ 对它们做**绝对**英文判定全是噪声 ⇒ 只判形态，不判英文。
//   BIZ_V3 家族：全部内容都该是中文 ⇒ 做英文判定。
//
// ⭐ P168 B3-18：**补 openai-token** —— AI cost 家族是 **8 个**引擎，旧清单只有 7 个 ⇒ 漏了它。
//   实测依据（浏览器层，修绿态实测得到）：
//     · 动态卡片的投影表头 `Month | GPT 5 Mini | … | Cum. Diff` 是**引擎 customFn 里硬编码的 ASCII 表**
//       （src/engines/ai-cost/openai-token-calculator.ts:539 `pad("Month", 6)` / :543 `pad("Cum. Diff", 12)`）
//       ⇒ 按设计保留英文 ⇒ 对它做**绝对**英文判定全是噪声 ⇒ 只判形态，不判英文。
//     · 它的**静态卡片本身也有 1 行英文**（`🏆 Cheapest: GPT 5 Nano at $0.75/mo`）
//       ⇒ 属引擎层既有 i18n 缺口，不是客户端引入的。
//
// ⚠️ 遗留缺陷（如实登记，不悄悄豁免掉就完事）：
//   SSR 静态卡片**没有**投影表头，但客户端 customFn 有 ⇒ SSR ↔ 客户端存在一处英文行分叉；
//   根因在**引擎**（openai-token-calculator.ts 的 customFn 里 `pad("Month", 6)` / `pad("Cum. Diff", 12)`
//   硬编码 ASCII 表头）⇒ 修它要改 src/engines/** ⇒ **需 user 拍板** ⇒ 本批不动 ⇒ 留作后续批次。
const DYNAMIC_AI_COST = [
  'solopreneur-claude-api-cost-calculator',
  'solopreneur-gemini-api-cost-calculator',
  'solopreneur-deepseek-api-cost-calculator',
  'solopreneur-ai-image-cost-calculator',
  'solopreneur-ai-training-cost-estimator',
  'solopreneur-gpu-cloud-cost-calculator',
  'solopreneur-ai-api-cost-comparison',
  'solopreneur-openai-token-calculator',
];
const DYNAMIC_BIZ_V3 = [
  'solopreneur-nrr-calculator',
  'solopreneur-roas-calculator',
  'solopreneur-kb-coverage-rate-calculator',
  'solopreneur-cohort-retention-calculator',
  'solopreneur-content-marketing-roi-calculator',
  'solopreneur-logo-churn-rate-calculator',
  'solopreneur-email-campaign-roi-calculator',
  'solopreneur-funnel-step-calculator',
];

// ⭐ P168 B3-18：**受害引擎清单（24 个）** ——
//   这 24 个 = HEAD（06a7ae5）上实测被 analysis-card 分支劫持的引擎：
//   静态扫描 dist/zh/*/index.html 里 SSR 卡片的 `data-calc-output-raw` 属性，
//   找出 token 原文**同时**含 `' → '` 与 `' | '` 的页面（实测 COUNT=24）。
//   ⇒ **每一个受害引擎都必须被浏览器层覆盖**，否则**覆盖缺口**会让守卫再次假绿：
//     旧清单只有 15 个 slug，其中只有 5 个落在受害面内 ⇒ 剩下 **19** 个受害引擎的退化形态
//     （正文被藏进「查看详情」折叠区）根本没人看见 ⇒ 守卫报「ALL OK」而用户看到的是折叠区。
//
// ⚠️ 清单必须**硬编码**，不许在运行时从 dist 扫描推导 ——
//   判据一旦自指，变异（把客户端分支换回旧顺序）会让清单自己变空 ⇒ **真空绿**
//   （AGENTS.md 教训：判据不能自指）。
const DYNAMIC_VICTIMS = [
  'solopreneur-ai-image-cost-calculator',
  'solopreneur-break-even-calculator',
  'solopreneur-claude-api-cost-calculator',
  'solopreneur-deepseek-api-cost-calculator',
  'solopreneur-email-list-revenue-calculator',
  'solopreneur-employee-cost-calculator',
  'solopreneur-equity-dilution-calculator',
  'solopreneur-freelance-rate-calculator',
  'solopreneur-freelance-tax-calculator',
  'solopreneur-gemini-api-cost-calculator',
  'solopreneur-gpu-cloud-cost-calculator',
  'solopreneur-hourly-vs-fixed-calculator',
  'solopreneur-ltv-calculator',
  'solopreneur-market-size-estimator',
  'solopreneur-meeting-cost-calculator',
  'solopreneur-openai-token-calculator',
  'solopreneur-productivity-score',
  'solopreneur-project-profitability-calculator',
  'solopreneur-revenue-projector',
  'solopreneur-saas-pricing-planner',
  'solopreneur-saas-valuation-calculator',
  'solopreneur-safe-convertible-note-calculator',
  'solopreneur-time-value-calculator',
  'solopreneur-unit-economics-calculator',
];

// ⭐ 34 个动态引擎 = AI cost 8 + BIZ_V3 8 + 受害面 24（去重后 34；6 个受害引擎已在 AI cost 组内）
//   ⇒ 静态 15 + 动态 34 = **49 个页面**。
const DYNAMIC = [...new Set([...DYNAMIC_AI_COST, ...DYNAMIC_BIZ_V3, ...DYNAMIC_VICTIMS])];

// ⭐ P168 B3-17 复审 I-1 / I-2：**逐条登记**的整行英文台账
//   旧口径 1（假绿）：英文行判定是**相对**的 —— 只有「静态卡片没有、客户端才有」才算问题
//     ⇒ 两张卡片**都有的**整行英文永远不会被报
//     ⇒ 实测 12 个 slug / 27 行动态 + 22 行静态 = 49 行用户可见整行英文**零守卫**（复审 I-1）。
//   旧口径 2（假绿）：AI cost 家族**整族豁免**（`DYNAMIC_AI_COST.includes(slug)`）
//     ⇒ 该族内任何新增英文行都不报（复审 I-2）。
//   现在：**绝对**判定 + **逐条**台账 ——
//     ① 静态卡片、动态卡片可见区、动态卡片折叠区里的**每一行**整行英文，都必须在本台账登记；
//     ② 未登记 ⇒ 红；登记了但实际不再出现 ⇒ 提示「可销账」（台账可以删条目了）；
//     ③ 每条必须写清**为什么**允许是英文。
//
//   两类条目：
//     · 精确文本 —— 行内没有随输入/数据变化的数值（引擎硬编码的英文小节标题）；
//     · 正则     —— 行内含**数据驱动**的数值（型号名 / 价格 / 覆盖率）⇒ 随 ai-pricing.json 或输入变化。
//       ⚠️ 正则必须收紧到只匹配这一类行，不许退化成「整族豁免」。
//
//   台账来源：2026-11-26 浏览器层实测（49 页 / 12 个 slug / 27 行动态 + 22 行静态）。
//     · 19 行 = 8 个业务引擎**硬编码的英文小节标题**
//       （employee-cost / equity-dilution / kb-coverage / ltv / meeting-cost /
//         productivity-score / saas-pricing-planner / unit-economics）
//       ⇒ 属已登记的「中英混排」待办（全站 785 行 ew≥1 / 146 行 ew≥3），
//         修它要改 src/engines/** ⇒ **需 user 拍板** ⇒ 本批只登记，不悄悄豁免掉就完事。
//     · 8 行 = AI cost 家族按设计保留的型号名 / 价格表头
//       （P85a：模型名等技术/通用内容保持英文）。
//       ⚠️ 其中 openai-token 的 `Month … Cum. Diff` 是**纯英文 ASCII 表头**
//         （openai-token-calculator.ts:539/:543 硬编码 pad("Month", 6) / pad("Cum. Diff", 12)）
//         ⇒ SSR 静态卡没有这一行、客户端有 ⇒ 引擎层既有缺口 ⇒ 需 user 拍板。
type EnglishDebtEntry = { match: string | RegExp; why: string };

/** 台账判定：返回「未登记的行」+「登记过但实际不再出现（可销账）的条目」 */
function judgeDebt(slug: string, ls: string[]) {
  const entries = ENGLISH_DEBT[slug] || [];
  const used = new Array(entries.length).fill(false);
  const unreg: string[] = [];
  for (const l of ls) {
    let hit = -1;
    for (let i = 0; i < entries.length; i++) {
      const m = entries[i].match;
      const ok = typeof m === 'string' ? m === l : m.test(l);
      if (ok) { hit = i; break; }
    }
    if (hit >= 0) used[hit] = true; else unreg.push(l);
  }
  return { unreg, stale: entries.filter((_, i) => !used[i]) };
}

/** 「可销账」判定：条目在**三种来源的并集**上都没出现才算可销账 */
function staleFor(slug: string, all: string[]) {
  const entries = ENGLISH_DEBT[slug] || [];
  return entries.filter((e) => {
    const m = e.match;
    return !all.some((l) => (typeof m === 'string' ? m === l : m.test(l)));
  });
}

const ENGLISH_DEBT: Record<string, EnglishDebtEntry[]> = {
  // ── AI cost 家族（8 行）：按设计保留英文（P85a「模型名等技术/通用内容保持英文」）────
  'solopreneur-claude-api-cost-calculator': [
    { match: /^月份 \| Claude/, why: '投影表头：中文标签「月份」（token calc_out.claude_api_cost.row.month_label）+ 按设计保留的英文型号名（P85a）；型号名随 ai-pricing.json 变 ⇒ 正则登记' },
  ],
  'solopreneur-deepseek-api-cost-calculator': [
    { match: /^月份 \| Deepseek/, why: '投影表头：中文标签「月份」+ 英文型号名（P85a）；型号名随 ai-pricing.json 变 ⇒ 正则登记' },
  ],
  'solopreneur-gemini-api-cost-calculator': [
    { match: /^月份 \| Gemini/, why: '投影表头：中文标签「月份」+ 英文型号名（P85a）' },
    { match: /^Gemini .+ （Gemini .+）$/, why: '逐型号成本行：型号名按设计不译（gemini 引擎注释「型号名留在 token 外（专有名词不该被译）」）' },
  ],
  'solopreneur-openai-token-calculator': [
    { match: /^Month .+ Cum\. Diff$/, why: '⚠️ 引擎层既有缺口：openai-token-calculator.ts:539/:543 硬编码 ASCII 表头 pad("Month", 6) / pad("Cum. Diff", 12) ⇒ SSR 静态卡无此行、客户端有 ⇒ 修它要改 src/engines/** ⇒ 需 user 拍板' },
    { match: /^🏆 Cheapest: .+ at \$[\d.,]+\/mo$/, why: '最便宜型号行：型号名 + 价格按设计保留英文（P85a）' },
  ],
  // ── 业务引擎硬编码的英文小节标题（19 行）：属已登记的「中英混排」待办 ────────────────
  'solopreneur-employee-cost-calculator': [
    { match: '💼 Employee Cost Calculator', why: '引擎硬编码英文标题（cost/employee-cost-calculator.ts:78、:248 title）⇒ 中英混排待办，需 user 拍板改 src/engines/**' },
    { match: '⚖️ Full-Time vs Contractor Break-Even:', why: '引擎硬编码英文小节标题（cost/employee-cost-calculator.ts:125）⇒ 中英混排待办，需 user 拍板改 src/engines/**' },
  ],
  'solopreneur-equity-dilution-calculator': [
    { match: '📊 Equity Dilution Calculator', why: '引擎硬编码英文标题（investment/equity-dilution-calculator.ts）⇒ 中英混排待办' },
    { match: '💰 Cap Table Snapshot:', why: '引擎硬编码英文小节标题 ⇒ 中英混排待办' },
    { match: '📐 Dilution per Round:', why: '引擎硬编码英文小节标题 ⇒ 中英混排待办' },
    { match: '🎯 Exit Value by Round:', why: '引擎硬编码英文小节标题 ⇒ 中英混排待办' },
  ],
  'solopreneur-kb-coverage-rate-calculator': [
    { match: /^🩺 KB Coverage Health: .*coverage.*gap.*without KB\)$/, why: 'Health 行硬编码英文（knowledge/kb-coverage-rate-calculator.ts）；数值随输入变 ⇒ 正则登记 ⇒ 中英混排待办' },
    { match: /^if coverage climbs to .*saved\)$/, why: '建议句硬编码英文；数值随输入变 ⇒ 正则登记 ⇒ 中英混排待办' },
    { match: /^to hit .*articles$/, why: '建议句硬编码英文；数值随输入变 ⇒ 正则登记 ⇒ 中英混排待办' },
    { match: /^re-audit gap quarterly .*ticket topics$/, why: '建议句硬编码英文；数值随输入变 ⇒ 正则登记 ⇒ 中英混排待办' },
  ],
  'solopreneur-ltv-calculator': [
    { match: '💎 Customer Lifetime Value (LTV)', why: '引擎硬编码英文标题（valuation/ltv-calculator.ts）⇒ 中英混排待办' },
  ],
  'solopreneur-meeting-cost-calculator': [
    { match: '⏰ Meeting Cost Calculator', why: '引擎硬编码英文标题（cost/meeting-cost-calculator.ts）⇒ 中英混排待办' },
    { match: '🎯 Quarterly & Annual Projection:', why: '引擎硬编码英文小节标题 ⇒ 中英混排待办' },
    { match: '⚖️ Async vs Sync Break-Even:', why: '引擎硬编码英文小节标题 ⇒ 中英混排待办' },
  ],
  'solopreneur-productivity-score': [
    { match: '⚖️ Deep Work vs Shallow Work Break-Even:', why: '引擎硬编码英文小节标题（cost/productivity-score.ts:129）⇒ 中英混排待办' },
  ],
  'solopreneur-saas-pricing-planner': [
    { match: '🎯 SaaS Pricing Planner', why: '引擎硬编码英文标题（cost/saas-pricing-planner.ts）⇒ 中英混排待办' },
    { match: '⚖️ Break-Even Customers per Tier:', why: '引擎硬编码英文小节标题（cost/saas-pricing-planner.ts:159）⇒ 中英混排待办' },
  ],
  'solopreneur-unit-economics-calculator': [
    { match: '🏆 Lever Impact Ranking', why: '引擎硬编码英文小节标题（valuation/unit-economics-calculator.ts）⇒ 中英混排待办' },
    { match: '🩺 Unit Economics Health:', why: '引擎硬编码英文小节标题 ⇒ 中英混排待办' },
  ],
};

function findChrome() {
if (process.env.P168_CHROME && existsSync(process.env.P168_CHROME)) return process.env.P168_CHROME;
const cands = [];
cands.push('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
cands.push('C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe');
cands.push('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe');
cands.push('C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe');
for (const c of cands) if (existsSync(c)) return c;
return null;
}

const chrome = findChrome();
if (!chrome) {
console.log('本机未找到 Chrome/Edge ⇒ 浏览器层验收不可用（不是「通过」）。');
console.log('请在装了 Chrome 的机器上跑本工具，或用人工目视 + 产物层守卫兜底。');
process.exit(2);
}

const missing = [];
for (const s of [...SLUGS, ...DYNAMIC]) {
if (!existsSync(resolve(ROOT, 'dist', 'zh', s, 'index.html'))) missing.push(s);
}
if (missing.length) {
console.log('产物缺页（先跑 pnpm build）：' + missing.join(', '));
process.exit(1);
}

const MIME = new Map();
MIME.set('.html', 'text/html; charset=utf-8');
MIME.set('.js', 'text/javascript');
MIME.set('.css', 'text/css');
MIME.set('.json', 'application/json');
MIME.set('.svg', 'image/svg+xml');
MIME.set('.png', 'image/png');
MIME.set('.jpg', 'image/jpeg');
MIME.set('.webp', 'image/webp');
MIME.set('.ico', 'image/x-icon');

let resolveResult: ((v: string) => void) | null = null;
const resultPromise: Promise<string> = new Promise<string>((r) => { resolveResult = r; });

const DIST = join(ROOT, 'dist');
const server = createServer((req: any, res: any) => {
if (req.method === 'POST' && req.url === '/result') {
let body = '';
req.on('data', (c: any) => { body += c; });
req.on('end', () => {
res.writeHead(204);
res.end();
if (resolveResult) resolveResult(body);
});
return;
}
if (req.url === '/__p168_harness.html') {
const tpl = readFileSync(resolve(ROOT, 'tests', 'scripts', 'p168-browser-harness.html'), 'utf8');
const html = tpl.replace('__SLUGS__', JSON.stringify(SLUGS)).replace('__DYN__', JSON.stringify(DYNAMIC));
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
res.end(html);
return;
}
const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
const rel = normalize(urlPath).replace(/^[/\\]+/, '');
const file = join(DIST, rel);
if (!file.startsWith(DIST) || !existsSync(file)) {
res.writeHead(404);
res.end('not found');
return;
}
res.writeHead(200, { 'Content-Type': MIME.get(extname(file)) || 'application/octet-stream' });
res.end(readFileSync(file));
});

async function main() {
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const args = [];
args.push('--headless=new');
args.push('--disable-gpu');
args.push('--no-sandbox');
args.push('--disable-dev-shm-usage');
args.push('--user-data-dir=' + resolve(ROOT, 'tmp', 'browser-verify-profile'));
args.push('http://127.0.0.1:' + PORT + '/__p168_harness.html');
const chromeProc: any = spawn(chrome as string, args, { stdio: 'ignore' });
const timer: Promise<string> = new Promise((r) => setTimeout(() => r('TIMEOUT'), TIMEOUT_MS));
const text = await Promise.race([resultPromise, timer]);
chromeProc.kill();
server.close();
if (text === 'TIMEOUT') {
console.log('验收页超时（' + TIMEOUT_MS + 'ms）—— 可能是浏览器没起来或页面脚本报错。');
process.exit(1);
}
if (text.indexOf('ERROR|') === 0) {
console.log('验收页脚本报错：' + text.slice(6));
process.exit(1);
}
const lines = text.split(NL).filter((x) => x.trim());
for (const l of lines) console.log(l);
console.log('');
const problems: { cls: string; slug: string; msg: string }[] = [];
const staleNotices: { slug: string; why: string }[] = [];
const staleSeen = new Set<string>();
const pushStale = (slug: string, why: string) => {
  const k = slug + '||' + why;
  if (staleSeen.has(k)) return;
  staleSeen.add(k);
  staleNotices.push({ slug, why });
};
const dynRows: string[] = [];
// ⭐ 绝对英文行逐条清单（E|slug|kind|base64；kind = S 静态卡 / V 动态可见 / D 动态折叠区）
const absEn: Record<string, { S: string[]; V: string[]; D: string[] }> = {};
for (const line of lines) {
  if (line.slice(0, 2) !== 'E|') continue;
  const p = line.split('|');
  const slug = p[1];
  const kind = p[2] as 'S' | 'V' | 'D';
  if (!slug || (kind !== 'S' && kind !== 'V' && kind !== 'D')) continue;
  let txt = '';
  try { txt = Buffer.from(p[3] || '', 'base64').toString('utf8'); } catch { txt = ''; }
  (absEn[slug] = absEn[slug] || { S: [], V: [], D: [] })[kind].push(txt);
}
for (const line of lines) {
  if (line === 'DONE') continue;
  const parts = line.split('|');
  if (parts[0] === 'S') {
    // S|slug|lines|en|dd|bare|h3|samples
    const slug = parts[1];
    const en = Number(parts[3]);
    const dd = Number(parts[4]);
    const bare = Number(parts[5]);
    // ⭐ 复审 I-1：**绝对**英文判定 —— 静态卡的整行英文必须**逐条登记**在 ENGLISH_DEBT
    const jS = judgeDebt(slug, absEn[slug] ? absEn[slug].S : []);
    for (const s of staleFor(slug, absEn[slug] ? absEn[slug].S : [])) pushStale(slug, s.why);
    if (jS.unreg.length) problems.push({ cls: '静态卡片有未登记整行英文', slug, msg: jS.unreg.length + ' / ' + en + ' 行 —— ' + jS.unreg.slice(0, 3).join(' ~~ ') });
    if (dd > 0) problems.push({ cls: '静态卡片有双美元号', slug, msg: dd + ' 处' });
    if (bare > 0) problems.push({ cls: '静态卡片有裸 token', slug, msg: bare + ' 处' });
  } else if (parts[0] === 'D') {
    // D|slug|dynLines|visibleLen|detailLen|h3|expandBtn|staticLines|staticH3|enV|enVNew|enD|enDNew|samples
    const slug = parts[1];
    const dynLines = Number(parts[2]);
    const visibleLen = Number(parts[3]);
    const detailLen = Number(parts[4]);
    const h3 = Number(parts[5]);
    const exp = Number(parts[6]);
    const staticLines = Number(parts[7]);
    const staticH3 = Number(parts[8]);
    const enV = Number(parts[9]);
    const enVNew = Number(parts[10]);
    const enD = Number(parts[11]);
    const enDNew = Number(parts[12]);
    const samples = parts[13] || '';
    // ⭐ 复审 I-2：**取消 AI cost 整族豁免** ⇒ 改为 ENGLISH_DEBT 逐条登记
    const jS = judgeDebt(slug, absEn[slug] ? absEn[slug].S : []);
    const jV = judgeDebt(slug, absEn[slug] ? absEn[slug].V : []);
    const jD = judgeDebt(slug, absEn[slug] ? absEn[slug].D : []);
    // ⭐ 「可销账」在**三种来源的并集**上算 —— 只在动态可见区出现的行（如 claude 的投影表头）
    //   在静态卡里本来就没有 ⇒ 若按 kind 分别算会误报「可销账」。
    for (const s of staleFor(slug, [...(absEn[slug] ? absEn[slug].S : []), ...(absEn[slug] ? absEn[slug].V : []), ...(absEn[slug] ? absEn[slug].D : [])])) pushStale(slug, s.why);
    const absV = absEn[slug] ? absEn[slug].V.length : 0;
    const absD = absEn[slug] ? absEn[slug].D.length : 0;
    dynRows.push(
      '  ' + slug.padEnd(44) +
      ' 静态 ' + String(staticLines).padStart(3) + ' 行 → 动态 ' + String(dynLines).padStart(3) + ' 行' +
      ' · <h3> ' + (h3 > 0 ? '有' : '无') +
      ' · 折叠 ' + exp +
      ' · 可见 ' + String(visibleLen).padStart(5) + ' 字符' +
      ' · 折叠区 ' + String(detailLen).padStart(5) + ' 字符' +
      ' · 英文 绝对 ' + absV + '+' + absD + ' 行（相对 ' + enV + '/' + enVNew + '，仅诊断）'
    );
    if (staticH3 > 0) {
      // ⭐ P168 B3-17：**结构性判据**（不再是字符数启发式）——
      //   SSR 静态卡片有 <h3> ⇒ 服务端走了 hideIndex 分支 ⇒ clientConfig.type === 'custom'
      //   ⇒ 客户端的动态卡片**必须**是同一个形态（<h3> 标题 + .font-mono 正文，无折叠区）。
      //   B-1 失明点：旧的「可见 = 可见行 + .detail 长度」把折叠区算成可见 ⇒ 恒 ≥ 200 ⇒ 假绿。
      //   现在 .detail 只作为 detailLen 诊断字段，**不计入可见**。
      const why: string[] = [];
      if (h3 === 0) why.push('动态卡片缺 <h3> 标题（退化成非 v3 形态）');
      if (exp > 0) why.push('动态卡片有 ' + exp + ' 处「查看详情」折叠（正文被藏进折叠区）');
      if (detailLen > 0) why.push('动态卡片有 ' + detailLen + ' 字符的折叠区内容（v3 形态不该有折叠区）');
      // ⚠️ 复审 M-1：这一条只是**兜底**，不是主判据 ——
      //   实测动态/静态的行数差在 −9 ~ +19 之间浮动 ⇒「可见行 ≥ 静态 50%」几乎不会触发；
      //   真正能抓住退化的是上面三条**结构性**判据（<h3> / 折叠按钮 / 折叠区字符）。
      if (dynLines * 2 < staticLines) why.push('可见行 ' + dynLines + ' 行 < 静态卡片 ' + staticLines + ' 行的 50%');
      if (visibleLen < 200) why.push('可见字符仅 ' + visibleLen + '（内容疑似被截断或藏起来了）');
      if (why.length) {
        // 形态错了 ⇒ 内容本身就不可比 ⇒ 只报**根因**（形态退化），不重复报派生的语言噪声
        problems.push({ cls: '动态卡片形态退化', slug, msg: why.join('；') });
      } else {
        // ⭐ 复审 I-1：**绝对**英文判定（不再用「相对静态卡片」口径）
        //   静态卡 + 动态可见区 + 动态折叠区，每一行整行英文都必须已登记在 ENGLISH_DEBT
        if (jS.unreg.length) problems.push({ cls: '静态卡片有未登记整行英文', slug, msg: jS.unreg.length + ' 行 —— ' + jS.unreg.slice(0, 2).join(' ~~ ') });
        if (jV.unreg.length) problems.push({ cls: '动态卡片有未登记整行英文', slug, msg: jV.unreg.length + ' 行 —— ' + jV.unreg.slice(0, 2).join(' ~~ ') });
        if (jD.unreg.length) problems.push({ cls: '折叠区有未登记整行英文', slug, msg: jD.unreg.length + ' 行 —— ' + jD.unreg.slice(0, 2).join(' ~~ ') });
      }
    } else {
      // legacy（非 custom）引擎：折叠是**既有 UX**（不是缺陷）⇒ 内容完整性按「可见 + 折叠区」算
      if (visibleLen + detailLen < 200) {
        problems.push({ cls: '动态卡片内容疑似被截断', slug, msg: '可见 ' + visibleLen + ' + 折叠区 ' + detailLen + ' 字符' });
      }
      // ⭐ 复审 I-1：同样的绝对判定（静态卡 / 动态可见区 / 动态折叠区）
      if (jS.unreg.length) problems.push({ cls: '静态卡片有未登记整行英文', slug, msg: jS.unreg.length + ' 行 —— ' + jS.unreg.slice(0, 2).join(' ~~ ') });
      if (jV.unreg.length) problems.push({ cls: '动态卡片有未登记整行英文', slug, msg: jV.unreg.length + ' 行 —— ' + jV.unreg.slice(0, 2).join(' ~~ ') });
      if (jD.unreg.length) problems.push({ cls: '折叠区有未登记整行英文', slug, msg: jD.unreg.length + ' 行 —— ' + jD.unreg.slice(0, 2).join(' ~~ ') });
    }
  }
}
const classes = [...new Set(problems.map((p) => p.cls))];
const pageRows = lines.filter((x) => x.startsWith('S|') || x.startsWith('D|')).length;
console.log('—— ' + pageRows + ' 个页面检查完毕 · 问题 ' + classes.length + ' 类 · ' + problems.length + ' 处');
console.log('动态卡片可见行数（静态 → 动态 · 形态）：');
for (const row of dynRows) console.log(row);
for (const cls of classes) {
  console.log('  [' + cls + ']');
  for (const pr of problems) if (pr.cls === cls) console.log('    ' + pr.slug + '：' + pr.msg);
}
if (staleNotices.length) {
  console.log('—— 📌 台账「可销账」提示（登记过但实际不再出现，可从 ENGLISH_DEBT 删掉）：');
  for (const s of staleNotices) console.log('    ' + s.slug + '：' + s.why);
}
console.log(problems.length === 0 ? 'ALL OK' : 'NOT YET');
process.exitCode = problems.length === 0 ? 0 : 1;
}

main();



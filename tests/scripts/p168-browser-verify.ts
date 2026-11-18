#!/usr/bin/env node
// P168 B3-9 —— 浏览器层验收工具（用户所见层，可复算，已入库）。
//
// 为什么需要它（B3-8 教训：「SSR 层绿」≠「用户所见绿」）
//   产物层守卫读的是 SSR 出来的 HTML ⇒ 看不见浏览器里的后处理：
//   ① 客户端 beautifySections 的 innerHTML 替换；
//   ② customFn 渲染的动态卡片（用户点「计算」才出现）。
//   ⇒ 用户实际看到的动态卡片，产物层守卫结构上查不到。
//
// 本工具怎么工作（无外部依赖、确定性等待）
//   ① 自建 Node HTTP 服务器：伺服 dist/ + 验收页 + 接收 POST /result；
//   ② 无头 Chrome 打开验收页；验收页用 iframe 批量加载同源 zh 页
//      （iframe 里脚本真执行 ⇒ 测的是 beautify 之后的用户所见）；
//   ③ 验收页跑完把结果 POST 回服务器 ⇒ 不靠「等多久」的猜测；
//   ④ 断言：静态卡片 0 整行英文 / 0 裸 token / 0 处 $$；
//      动态卡片内容完整（可见字符数达标 ⇒ 不是只剩第一行）+ 0 整行英文。
//
// 用法（必须从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-browser-verify.ts
//   环境变量：P168_CHROME / P168_BROWSER_TIMEOUT_MS（默认 120000）

import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { resolve, join, extname, normalize } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const NL = String.fromCharCode(10);
const PORT = Number(process.env.P168_BROWSER_PORT ?? 8137);
const TIMEOUT_MS = Number(process.env.P168_BROWSER_TIMEOUT_MS ?? 120000);

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

const DYNAMIC = [
'solopreneur-claude-api-cost-calculator',
'solopreneur-gemini-api-cost-calculator',
'solopreneur-deepseek-api-cost-calculator',
'solopreneur-ai-image-cost-calculator',
'solopreneur-ai-training-cost-estimator',
'solopreneur-gpu-cloud-cost-calculator',
'solopreneur-ai-api-cost-comparison',
];

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
const problems = [];
for (const line of lines) {
if (line === 'DONE') continue;
const parts = line.split('|');
if (parts[0] === 'S') {
const slug = parts[1];
const en = Number(parts[3]);
const dd = Number(parts[4]);
const bare = Number(parts[5]);
if (en > 0) problems.push(slug + '：静态卡片有整行英文 ' + en + ' 行 —— ' + (parts[6] || ''));
if (dd > 0) problems.push(slug + '：静态卡片有 ' + dd + ' 处双美元号');
if (bare > 0) problems.push(slug + '：静态卡片有 ' + bare + ' 处裸 token');
} else if (parts[0] === 'D') {
const slug = parts[1];
const visible = Number(parts[3]);
const en = Number(parts[5]);
if (visible < 200) problems.push(slug + '：动态卡片内容疑似被截断（可见 ' + visible + ' 字符）');
if (en > 0) problems.push(slug + '：动态卡片有整行英文 ' + en + ' 行 —— ' + (parts[6] || ''));
}
}
console.log('—— ' + lines.filter((x) => x !== 'DONE').length + ' 个页面检查完毕 · 问题 ' + problems.length + ' 处');
for (const pr of problems) console.log('  ' + pr);
console.log(problems.length === 0 ? 'ALL OK' : 'NOT YET');
process.exitCode = problems.length === 0 ? 0 : 1;
}

main();



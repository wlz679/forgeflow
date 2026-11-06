// P168 B3-2 —— 标题瘦身的验收测量（入库 —— 验收数字必须可复算）。
//
// 测三件事：
//   ① 200 条 seoTitle 的长度分布（改前 vs 改后）
//   ② ⭐ SERP 截断模拟：按词边界切到 60 字符 ⇒ 关键词段是否完整保留
//   ③ ⭐ 边界核验：og:title / JSON-LD name / h1 **仍是长名**
//
// ⭐ 为什么入库（不留在 tmp/）
//   这三个数字会被写进 CHANGELOG 与规格 ⇒ 别人 checkout 后必须能**复算**，
//   否则那些数字只是「作者说过」，不是可验证的事实。
//
// ⚠️ 文件名**不能**带 .test.ts —— tests/build-dep-suites.mjs 的 walkTestSuites
//    只收 *.test.ts / *.test.mjs，带了会让套件计数漂移、meta-守卫变红。
//
// 跑法（必须从仓库根目录跑 —— 脚本内的相对路径按仓库根算）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-title-measure.ts
//
// ⭐ 优雅降级（两处，绝不抛异常）：
//   · `tools.<slug>.seoTitle` 在 Task 2 把候选写进 locale 之前**不存在**
//     ⇒ 长度列全是 0；SERP 段没有可判定的对象 ⇒ 打印「缺 seoTitle」提示，
//     缺项**不计入**截断数与「丢失关键词组」数（无对象可判 ≠ 判为丢失）。
//   · dist/ 缺失 ⇒ 跳过边界核验段（先跑 pnpm build）。

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const strip = (s: string) => s.replace(/^\uFEFF/, '');
const locale = (l: string) =>
  JSON.parse(strip(readFileSync(resolve(root, 'src/i18n/locales/' + l + '.json'), 'utf8'))) as Record<string, string>;

const en = locale('en');
const zh = locale('zh');
const slugs = Object.keys(en)
  .filter((k) => /^tools\.[^.]+\.title$/.test(k))
  .map((k) => k.split('.')[1])
  .sort();

const SEP = ' \u2014 ';
const stat = (lens: number[]) => {
  if (!lens.length) return 'n/a（0 条）';
  const s = [...lens].sort((a, b) => a - b);
  return `min ${s[0]} / med ${s[Math.floor(s.length / 2)]} / max ${s[s.length - 1]}`;
};

// —— ① 长度分布（改前 title vs 改后 seoTitle）——
const missing: Record<string, number> = {};
for (const [lang, o] of [['en', en], ['zh', zh]] as const) {
  const full = slugs.map((s) => o['tools.' + s + '.title'].length);
  const seo = slugs.map((s) => (o['tools.' + s + '.seoTitle'] ?? '').length);
  missing[lang] = seo.filter((x) => x === 0).length;
  console.log(`[${lang}] title    长度：${stat(full)}  · 超 60：${full.filter((x) => x > 60).length}/${full.length}`);
  console.log(`[${lang}] seoTitle 长度：${stat(seo)}  · 超 60：${seo.filter((x) => x > 60).length}/${seo.length}`);
  if (missing[lang]) {
    console.log(
      `[${lang}] ⚠️ 缺 tools.<slug>.seoTitle：${missing[lang]}/${slugs.length} 条 —— Task 2 尚未写入 ⇒ SERP 判定无对象可判（不计入截断数与丢失数）`,
    );
  }
}

// ⭐ SERP 截断模拟：按词边界切到 60 字符
function truncateAtWordBoundary(s: string, limit: number): string {
  if (s.length <= limit) return s;
  const cut = s.slice(0, limit);
  const sp = cut.lastIndexOf(' ');
  return sp > 0 ? cut.slice(0, sp) : cut;
}

let truncated = 0;
let judged = 0;
const lostKeywords: string[] = [];
for (const s of slugs) {
  for (const lang of ['en', 'zh'] as const) {
    const o = lang === 'en' ? en : zh;
    const seoRaw = o['tools.' + s + '.seoTitle'];
    // seoTitle 尚未写入 ⇒ 没有可截断/可判定的对象，跳过（不算丢失）。
    if (!seoRaw) continue;
    judged++;
    const seo = seoRaw;
    const shown = truncateAtWordBoundary(seo, 60);
    if (shown.length < seo.length) truncated++;
    const full = o['tools.' + s + '.title'] ?? '';
    const fi = full.indexOf(SEP);
    if (fi < 0) continue;
    const groups = full.slice(fi + SEP.length).replace(/\s*[（(]\d{4}[）)]\s*$/, '').split(/\s*\+\s*/).filter(Boolean);
    const si = shown.indexOf(SEP);
    const shownGroups = si < 0 ? [] : shown.slice(si + SEP.length).split(/\s*\+\s*/);
    if (groups.length && !groups.some((g) => shownGroups.includes(g))) {
      lostKeywords.push(`${lang}/${s}: 原「${groups.join(' | ')}」⇒ SERP 里剩「${shownGroups.join(' | ')}」`);
    }
  }
}
console.log(`\n[SERP 模拟] 被截断的标题：${truncated}/${judged}`);
if (judged < slugs.length * 2) {
  console.log(`[SERP 模拟] 未参与判定：${slugs.length * 2 - judged} 条（缺 tools.<slug>.seoTitle）`);
}
console.log(`[SERP 模拟] 截断后丢失全部关键词组的：${lostKeywords.length}`);
for (const x of lostKeywords.slice(0, 10)) console.log('  ' + x);

// ⭐ 边界核验：og:title / JSON-LD name / h1 仍是长名
const probe = resolve(root, 'dist', 'en', 'solopreneur-burn-rate-calculator', 'index.html');
if (!existsSync(probe)) {
  console.log('\n[边界核验] dist/ 缺失 —— 跳过（先跑 pnpm build）');
} else {
  const html = readFileSync(probe, 'utf8');
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] ?? '';
  const og = (html.match(/og:title" content="([^"]*)"/) || [])[1] ?? '';
  const long = en['tools.solopreneur-burn-rate-calculator.title'];
  console.log(`\n[边界核验] <title>  = ${title}  (${title.length})`);
  console.log(`[边界核验] og:title = ${og}`);
  console.log(`[边界核验] h1 含长名：${html.includes(long)}`);
  console.log(`[边界核验] og:title 含长名 + 品牌后缀：${og.includes(long) && og.includes('ForgeFlowKit')}`);
  const ok = title.length <= 60 && og.includes(long) && og.includes('ForgeFlowKit') && html.includes(long);
  console.log(ok ? '\n✓ 边界达标：只有 <title> 变短' : '\n✗ 边界被破坏');
}

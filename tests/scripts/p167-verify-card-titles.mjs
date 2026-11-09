// P167 —— 线上验收：工具卡标题**用短名**且**不被截断**，而工具详情页
// 的 h1 **仍是长 SEO 名**。
//
// 为什么这两个必须一起验：
//   · 卡片用短名 = 人能一眼扫懂（用户 2026-11-04 反馈的那件事）；
//   · 详情页用长名 = 搜索引擎看到的标题一个字都没少（**不能为了好看把 SEO 砍掉**）。
//   ⇒ 只验其中一个都抓不到「两处搞反了」这个缺陷。
//
// ⚠️ P168 B3-2 之后，详情页的 `<title>` **不再**是长名（换成了 ≤60 字符的
//    seoTitle）—— 但 h1 / og:title / JSON-LD name **仍然是长名**。
//    ⇒ 下面的详情页检查接受 `<title>` 的**两种形态**（见 detailState）：
//      ① 「长名」      = B3-2 还没上线（线上跑的还是旧产物）
//      ② 「seoTitle」  = B3-2 已上线
//    两种形态都**不是 FAIL**；h1 含长名则是**两种状态下的硬要求**。
//    （脚本必须对「部署前 / 部署后」两种线上状态诚实判定，而不是只给一个 ✓/✗。）
//
// 跑法（网络可达即可，从仓库根跑）：
//   node tests/scripts/p167-verify-card-titles.mjs
import { readFileSync } from 'node:fs';
import { tools } from '../../src/data/tools/index.ts';

const en = JSON.parse(readFileSync('src/i18n/locales/en.json', 'utf8'));
const zh = JSON.parse(readFileSync('src/i18n/locales/zh.json', 'utf8'));

/**
 * 从分类页 HTML 里取出所有工具卡的 h3 标题（class 含 line-clamp-2 的）。
 *
 * ⚠️ 必须**先解 HTML 实体**再比对：产物里 `&` 被转义成 `&amp;`
 *    （如 "Burn Multiple &amp; Rule of 40 Calculator"）⇒ 不解码就会误报「非短名」。
 *    （本脚本第一版就踩了这个 ⇒ 线上 30 页全 OK 却报了 1 个 FAIL。）
 */
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function cardTitles(html) {
  return [...html.matchAll(/<h3\b[^>]*class="[^"]*line-clamp-2[^"]*"[^>]*>([^<]*)<\/h3>/g)]
    .map((m) => ({ text: decodeEntities(m[1].trim()), attrs: m[0] }));
}

const CATEGORIES = [
  'saas-metrics', 'ai-cost-tools', 'valuation-exit', 'freelance-pricing',
  'cost-efficiency', 'investment-roi', 'hiring-team', 'knowledge',
  'legal-compliance', 'marketing-analytics', 'operations-inventory',
  'product-analytics', 'retention', 'sales', 'customer-support',
];

let bad = 0;
const rows = [];

for (const lang of ['en', 'zh']) {
  const o = lang === 'en' ? en : zh;
  const shortSet = new Set(tools.map((t) => o['tools.' + t.slug + '.shortTitle']));
  const longSet = new Set(
    tools
      .map((t) => o['tools.' + t.slug + '.title'])
      .filter((v) => v && !v.includes(' — ')),
  );
  for (const slug of CATEGORIES) {
    const url = 'https://forgeflowkit.com/' + lang + '/' + slug + '/';
    let html = '';
    let err = '';
    for (let a = 0; a < 4; a++) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': 'mcode-verify' } });
        html = await res.text();
        if (res.ok && html.length > 1000) break;
        err = 'status ' + res.status;
      } catch (e) {
        err = String((e && e.message) || e);
      }
      await new Promise((r) => setTimeout(r, 4000));
    }
    const cards = cardTitles(html);
    const notShort = cards.filter((c) => !shortSet.has(c.text) && !longSet.has(c.text));
    const noTitleAttr = cards.filter((c) => !/title="[^"]+"/.test(c.attrs));
    const truncated = cards.filter((c) => /class="[^"]*\btruncate\b/.test(c.attrs));
    const ok = cards.length > 0 && notShort.length === 0 && noTitleAttr.length === 0 && truncated.length === 0;
    if (!ok) bad++;
    rows.push(
      (ok ? '[OK]  ' : '[FAIL]') +
      ' ' + lang + '/' + slug.padEnd(22) +
      ' 卡片 ' + cards.length +
      '　非短名 ' + notShort.length +
      '　缺title ' + noTitleAttr.length +
      '　仍truncate ' + truncated.length +
      (err ? '  err=' + err : ''),
    );
  }
}

// —— 详情页：h1 必须含长名（硬要求）；<title> 允许两种形态 ——
//   ① 'long'  = <title> 含长名        ⇒ B3-2 还没上线
//   ② 'seo'   = <title> == locale 的 seoTitle ⇒ B3-2 已上线
//   其它一律 'unknown' ⇒ FAIL（说明线上出现第三种形态）
let detailBad = 0;
const detailStates = { long: 0, seo: 0, unknown: 0 };
const sample = tools.filter((t) => en['tools.' + t.slug + '.title'].includes(' — ')).slice(0, 6);
for (const t of sample) {
  const url = 'https://forgeflowkit.com/en/' + t.slug + '/';
  let html = '';
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'mcode-verify' } });
    html = await res.text();
  } catch {
    detailBad++;
    continue;
  }
  // ⚠️ 产物里的 `&` 会被转义成 `&amp;` ⇒ 必须先解码再比对（复用上面已有的 decodeEntities）。
  const title = decodeEntities(((html.match(/<title>([^<]*)<\/title>/) || [])[1] || '').trim());
  const h1 = decodeEntities(
    ((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '').replace(/<[^>]+>/g, '').trim(),
  );
  const og = decodeEntities(((html.match(/og:title" content="([^"]*)"/) || [])[1] || '').trim());
  const long = en['tools.' + t.slug + '.title'];
  const seo = en['tools.' + t.slug + '.seoTitle'] || '';
  const h1Ok = h1.includes(long);
  // og:title 必须仍是长名（分享卡片不截断）—— P168 B3-2 的核心不变量「只改 <title>」。
  const ogOk = og.includes(long);
  const state = title.includes(long) ? 'long' : seo && title === seo ? 'seo' : 'unknown';
  detailStates[state]++;
  const ok = h1Ok && ogOk && state !== 'unknown';
  if (!ok) detailBad++;
  const stateLabel =
    state === 'long' ? '长名（未上线）' : state === 'seo' ? 'seoTitle（已上线）' : '未知形态 ✗';
  rows.push(
    (ok ? '[OK]  ' : '[FAIL]') +
    ' 详情页 ' + t.slug.slice(0, 34).padEnd(34) +
    ' <title>=' + stateLabel +
    '  h1=' + (h1Ok ? '长名 ✓' : '非长名 ✗') +
    '  og:title=' + (ogOk ? '长名 ✓' : '非长名 ✗') +
    (ok ? '' : '  <title>=' + title.slice(0, 40) + '  h1=' + h1.slice(0, 40)),
  );
}

console.log(rows.join(String.fromCharCode(10)));
console.log('');
console.log(
  '详情页 <title> 形态：长名（未上线） ' + detailStates.long +
  ' · seoTitle（已上线） ' + detailStates.seo +
  ' · 未知 ' + detailStates.unknown +
  '  ⇒ 两种形态都算达标（h1 含长名是硬要求）',
);
console.log('分类页 ' + CATEGORIES.length * 2 + ' 个 + 详情页 ' + sample.length + ' 个：' + (bad + detailBad === 0 ? '全部达标 ✓' : '失败 ' + (bad + detailBad) + ' 个'));
if (bad + detailBad > 0) process.exitCode = 1;

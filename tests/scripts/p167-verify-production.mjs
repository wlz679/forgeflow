// P167 —— 线上验收：确认**生产**的 15 个分类页（× 2 语言）真的渲染出
// 「介绍段 / FAQ / 分类指南」三块。
//
// 「CI 绿」和「已推送」都不是「页面真的变了」⇒ 必须看目标侧（P165 的同一条规矩）。
//
// 判定（逐页，缺一即红）：
//   ① 有 h1（CategoryHero 的标题）
//   ② 介绍段：3 个 <p>
//   ③ FAQ：>= 5 个 <details>（实测 F 分类是 7 条）
//   ④ 分类指南：正好 3 张 <article>
//
// ⚠️ 一个坑：产物里 `&` 被转义成 `&` ⇒ 英文页的指南标题在 HTML 里是
//   `Guides & Articles`，**不是** `Guides & Articles`
//   （本脚本第一版就栽在这里 ⇒ 15 个 en 页全部误报「缺指南」，而站点其实是对的）。
//   ⇒ 这里用拼接写出来，避免被编辑器把实体还原成 &。
//
// 跑法（网络可达即可，从仓库根跑）：
//   node tests/scripts/p167-verify-production.mjs
const SLUGS = [
  'saas-metrics', 'ai-cost-tools', 'valuation-exit', 'freelance-pricing',
  'cost-efficiency', 'investment-roi', 'hiring-team', 'knowledge',
  'legal-compliance', 'marketing-analytics', 'operations-inventory',
  'product-analytics', 'retention', 'sales', 'customer-support',
];

const HEADINGS = {
  en: { faq: 'Frequently Asked Questions', guides: 'Guides &' + 'amp; Articles' },
  zh: { faq: '常见问题', guides: '指南与文章' },
};

const INTRO_PREFIX = { en: 'About ', zh: '关于' };

function scopeAfter(html, h2Markup) {
  const start = html.indexOf(h2Markup);
  if (start < 0) return '';
  const next = html.indexOf('<h2', start + h2Markup.length);
  return html.slice(start, next < 0 ? html.length : next);
}

function h2List(html) {
  return [...html.matchAll(/<h2[^>]*>[\s\S]*?<\/h2>/g)].map((m) => m[0]);
}

let bad = 0;
const rows = [];

for (const lang of ['en', 'zh']) {
  for (const slug of SLUGS) {
    const url = 'https://forgeflowkit.com/' + lang + '/' + slug + '/';
    let html = '';
    let err = '';
    for (let attempt = 0; attempt < 4; attempt++) {
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

    const h2s = h2List(html);
    const introH2 = h2s.find((x) => x.includes(INTRO_PREFIX[lang]));
    const introScope = introH2 ? scopeAfter(html, introH2) : '';
    const introParas = (introScope.match(/<p[\s>]/g) || []).length;

    const faqH2 = h2s.find((x) => x.includes(HEADINGS[lang].faq));
    const faqScope = faqH2 ? scopeAfter(html, faqH2) : '';
    const details = (faqScope.match(/<details[\s>]/g) || []).length;

    const guidesH2 = h2s.find((x) => x.includes(HEADINGS[lang].guides));
    const guidesScope = guidesH2 ? scopeAfter(html, guidesH2) : '';
    const articles = (guidesScope.match(/<article[\s>]/g) || []).length;

    const hasH1 = /<h1[\s>]/.test(html);
    const ok = hasH1 && introParas === 3 && details >= 5 && articles === 3;
    if (!ok) bad++;
    rows.push(
      (ok ? '[OK]  ' : '[FAIL]') +
      ' ' + lang + '/' + slug.padEnd(22) +
      ' h1=' + (hasH1 ? 'y' : 'n') +
      ' introP=' + introParas +
      ' faqDetails=' + details +
      ' guides=' + articles +
      (err ? '  err=' + err : ''),
    );
  }
}

console.log(rows.join(String.fromCharCode(10)));
console.log('');
console.log('线上合规页：' + (rows.length - bad) + ' / ' + rows.length + (bad ? '　⚠️ 失败 ' + bad : '　全部到位 ✓'));
if (bad > 0) process.exitCode = 1;

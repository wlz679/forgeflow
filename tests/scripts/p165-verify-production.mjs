// P165 —— 线上验收：确认部署后的**生产页**真的有决策层 + 三类 schema。
// 「CI 绿」和「已推送」都不是「页面真的变了」⇒ 必须看目标侧。
const PAGES = [
  ['en', 'retention'],
  ['zh', 'cost-efficiency'],
  ['en', 'saas-metrics'],
  ['en', 'customer-support'],
  ['zh', 'knowledge'],
];

function collectTypes(html) {
  const types = new Set();
  const walk = (n) => {
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (!n || typeof n !== 'object') return;
    const t = n['@type'];
    if (typeof t === 'string') types.add(t);
    else if (Array.isArray(t)) for (const x of t) if (typeof x === 'string') types.add(x);
    for (const k of Object.keys(n)) {
      if (k === '@type') continue;
      walk(n[k]);
    }
  };
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const p = JSON.parse(m[1]);
      walk(p['@graph'] ?? [p]);
    } catch {
      /* 解析不了的块不参与判定 */
    }
  }
  return types;
}

let bad = 0;
for (const [lang, slug] of PAGES) {
  const url = `https://forgeflowkit.com/${lang}/${slug}/`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const chainM = html.match(/data-decision-layer="([A-Z])"/);
  const choices = html.includes('data-decision-choices=');
  const types = collectTypes(html);
  const need = ['CollectionPage', 'BreadcrumbList', 'ItemList'];
  const missing = need.filter((t) => !types.has(t));
  // 决策层区块内的金额串
  const sections = [
    ...html.matchAll(/<section[^>]*data-decision-layer="[^"]*"[^>]*>([\s\S]*?)<\/section>/g),
    ...html.matchAll(/<section[^>]*data-decision-choices="[^"]*"[^>]*>([\s\S]*?)<\/section>/g),
  ];
  const layerText = sections.map((m) => m[1] ?? '').join('\n');
  const money = [...new Set([...layerText.matchAll(/\$\s?\d[\d.,]*/g)].map((m) => m[0]))];
  const links = [...new Set([...layerText.matchAll(/href="(\/[^"]+)"/g)].map((m) => m[1]))];
  const ok = res.status === 200 && chainM && choices && missing.length === 0 && money.length === 0 && links.length > 0;
  if (!ok) bad++;
  console.log(
    `${ok ? '✓' : '✗'} ${url.padEnd(48)} HTTP ${res.status}` +
      ` | 决策链=${chainM ? `有(${chainM[1]})` : '无'}` +
      ` | 对照表=${choices ? '有' : '无'}` +
      ` | schema 缺=[${missing.join(',')}]` +
      ` | 决策层金额串=${money.length}` +
      ` | 决策层链接=${links.length}`,
  );
}
console.log(bad === 0 ? '\n✅ 线上全部到位' : `\n⛔ ${bad} 个页面不达标`);
process.exitCode = bad > 0 ? 1 : 0;

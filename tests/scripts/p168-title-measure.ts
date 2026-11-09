// P168 B3-2 —— 标题瘦身的验收测量（入库 —— 验收数字必须可复算）。
//
// 测三件事：
//   ① 200 条 seoTitle 的长度分布（改前 vs 改后）
//   ② ⭐ SERP 截断模拟：按词边界切到 60 字符 ⇒ 关键词段是否完整保留
//   ③ ⭐ 边界核验：og:title / twitter:title / JSON-LD name / h1 / 面包屑 **仍是长名**
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
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-title-measure.ts --strict
//     ↑ --strict：任一断言不成立时退出码 1；**默认永远退出 0**（与同目录
//       p167-category-sections-measure.ts / p168-decision-support-measure.ts 同约定）。
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-title-measure.ts --probe tmp/x.html
//     ↑ --probe：换一份 HTML 做边界核验（证伪实验用；相对路径按仓库根算）。
//       --slug / --lang 可显式指定基准 slug 与语言（默认从 --probe 路径推断）。
//
// ⭐ 三条口径必须分开印（别让读者把分母搞混 —— 2026-11-06 review 的 I-2）：
//   · 截断分母     = **有 seoTitle 的条目**（本仓现状 200/200）。
//   · 词组判定分母 = **有 seoTitle 且原标题含 ' — ' 分隔**的条目（现状 130/200）——
//     原标题压根没有 ' — ' ⇒ 不存在「关键词段」这个概念 ⇒ **不参与**词组判定，
//     但**必须显式披露条数**，不能静默跳过。
//   · 「丢失全部关键词组」的分母 = 词组判定分母（130）。
//
// ⭐ 边界核验必须**逐项**给结论（I-1）：og:title / twitter:title / JSON-LD name /
//   h1 / 面包屑 每一项单独抽元素再比对 —— 「整页包含长名」不提供任何额外信号
//   （长名同时出现在 og:title 里 ⇒ 恒为 true）。抽不到 ⇒ 报「未核验」，
//   **不得默认通过**。

import { readFileSync, existsSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';

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
const BRAND = 'ForgeFlowKit';
const MAX_LEN = 60;
const DEFAULT_SLUG = 'solopreneur-burn-rate-calculator';

const stat = (lens: number[]) => {
  if (!lens.length) return 'n/a（0 条）';
  const s = [...lens].sort((a, b) => a - b);
  return `min ${s[0]} / med ${s[Math.floor(s.length / 2)]} / max ${s[s.length - 1]}`;
};

// —— CLI ——
// ⚠️ --strict 的语义：**任一断言不成立**（✗）⇒ 退出码 1；默认永远 0。
const argv = process.argv.slice(2);
const strict = argv.includes('--strict');
const flagValue = (name: string): string | undefined => {
  const i = argv.indexOf(name);
  const v = i >= 0 ? argv[i + 1] : undefined;
  return v && !v.startsWith('--') ? v : undefined;
};
const probeArg = flagValue('--probe');
const probePath = probeArg
  ? isAbsolute(probeArg)
    ? probeArg
    : resolve(root, probeArg)
  : resolve(root, 'dist', 'en', DEFAULT_SLUG, 'index.html');
// 从 <dist>/<lang>/<slug>/index.html 形态的路径里推断基准（--slug / --lang 可覆盖）。
const probePathMatch = /[\\/](en|zh)[\\/]([^\\/]+)[\\/]index\.html$/.exec(probePath);
const probeSlug = flagValue('--slug') ?? (probePathMatch ? probePathMatch[2] : DEFAULT_SLUG);
const probeLang = (flagValue('--lang') ?? (probePathMatch ? probePathMatch[1] : 'en')) as 'en' | 'zh';

const problems: string[] = [];

// —— ① 长度分布（改前 title vs 改后 seoTitle）——
const missing: Record<string, number> = {};
for (const [lang, o] of [['en', en], ['zh', zh]] as const) {
  const full = slugs.map((s) => o['tools.' + s + '.title'].length);
  const seo = slugs.map((s) => (o['tools.' + s + '.seoTitle'] ?? '').length);
  missing[lang] = seo.filter((x) => x === 0).length;
  console.log(
    `[${lang}] title    长度：${stat(full)}  · 超 ${MAX_LEN}：${full.filter((x) => x > MAX_LEN).length}/${full.length}`,
  );
  console.log(
    `[${lang}] seoTitle 长度：${stat(seo)}  · 超 ${MAX_LEN}：${seo.filter((x) => x > MAX_LEN).length}/${seo.length}`,
  );
  if (missing[lang]) {
    console.log(
      `[${lang}] ⚠️ 缺 tools.<slug>.seoTitle：${missing[lang]}/${slugs.length} 条 —— 无对象可判（不计入截断数与丢失数）`,
    );
  }
}

// —— ② SERP 截断模拟：按词边界切到 60 字符 ——
// ⭐ SERP 切词是**词边界**切，不是字符切 ⇒ 末尾半个词会被丢掉。
function truncateAtWordBoundary(s: string, limit: number): string {
  if (s.length <= limit) return s;
  const cut = s.slice(0, limit);
  const sp = cut.lastIndexOf(' ');
  return sp > 0 ? cut.slice(0, sp) : cut;
}

// 只剥**4 位年份**（术语括号如（NRR）必须保留 —— 与 P168 B3-2 生成器同口径）。
const stripYear = (s: string): string => s.replace(/\s*[（(]\d{4}[）)]\s*$/, '');

let withSeo = 0;
let truncated = 0;
let judged = 0;
let noSep = 0;
const judgedByLang: Record<string, number> = { en: 0, zh: 0 };
const noSepByLang: Record<string, number> = { en: 0, zh: 0 };
const lostKeywords: string[] = [];

for (const s of slugs) {
  for (const lang of ['en', 'zh'] as const) {
    const o = lang === 'en' ? en : zh;
    const seoRaw = o['tools.' + s + '.seoTitle'];
    // seoTitle 不存在 ⇒ 没有可截断/可判定的对象，跳过（不算丢失）。
    if (!seoRaw) continue;
    withSeo++;
    const shown = truncateAtWordBoundary(seoRaw, MAX_LEN);
    if (shown.length < seoRaw.length) truncated++;

    const full = o['tools.' + s + '.title'] ?? '';
    const fi = full.indexOf(SEP);
    // ⚠️ 原标题没有 ' — ' ⇒ 没有「关键词段」这个概念 ⇒ **不参与词组判定**
    //    （但下面会显式披露条数 —— 静默跳过会让「判定 200」看起来比实际多）。
    if (fi < 0) {
      noSep++;
      noSepByLang[lang]++;
      continue;
    }
    judged++;
    judgedByLang[lang]++;
    const groups = stripYear(full.slice(fi + SEP.length)).split(/\s*\+\s*/).filter(Boolean);
    const si = shown.indexOf(SEP);
    const shownGroups = si < 0 ? [] : shown.slice(si + SEP.length).split(/\s*\+\s*/).map(stripYear);
    if (groups.length && !groups.some((g) => shownGroups.includes(g))) {
      lostKeywords.push(
        `${lang}/${s}: 原「${groups.join(' | ')}」⇒ SERP 里剩「${shownGroups.join(' | ')}」`,
      );
    }
  }
}

const total = slugs.length * 2;
console.log('');
console.log(
  `[SERP 模拟] 口径：截断分母 = 有 seoTitle 的条目；词组判定分母 = 有 seoTitle 且原标题含 ' — ' 分隔的条目`,
);
console.log(`[SERP 模拟] 有 seoTitle 的条目：${withSeo}/${total}`);
console.log(
  `[SERP 模拟] 被截断的标题（${MAX_LEN} 字符词边界切后变短）：${truncated}/${withSeo}  ← 分母 = 有 seoTitle 的条目`,
);
if (withSeo < total) {
  console.log(`[SERP 模拟] 未参与判定：${total - withSeo} 条（缺 tools.<slug>.seoTitle）`);
}
console.log(
  `[SERP 模拟] 原标题无 ' — ' 分隔 ⇒ 不参与词组判定：${noSep} 条（en ${noSepByLang.en} / zh ${noSepByLang.zh}）`,
);
console.log(
  `[SERP 模拟] 词组判定：${judged}/${total}（en ${judgedByLang.en} / zh ${judgedByLang.zh}）  ← 有效判定分母`,
);
console.log(
  `[SERP 模拟] 截断后丢失全部关键词组的：${lostKeywords.length}/${judged}  ← 分母 = 词组判定数`,
);
for (const x of lostKeywords.slice(0, 10)) console.log('  ' + x);
if (lostKeywords.length) {
  problems.push(`${lostKeywords.length} 条标题在 SERP 里丢失了全部关键词组`);
}
if (missing.en + missing.zh > 0) {
  problems.push(`缺 ${missing.en + missing.zh} 条 tools.<slug>.seoTitle（en ${missing.en} / zh ${missing.zh}）`);
}

// —— ③ 边界核验：逐项抽元素比对（I-1 / I-3）——
// ⚠️ meta 的属性顺序**不能**假设：先抓标签、再独立取属性
//    （写成 `og:title" content="` 这种顺序依赖 ⇒ 属性顺序一变就假阴性）。
function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, g: string) => {
    if (g.startsWith('#')) {
      const code =
        g[1] === 'x' || g[1] === 'X' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    const named: Record<string, string> = {
      amp: '&',
      lt: '<',
      gt: '>',
      quot: '"',
      apos: "'",
      nbsp: ' ',
    };
    return named[g] ?? m;
  });
}

const textOf = (html: string): string =>
  decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function metaContent(html: string, attr: 'property' | 'name', key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    if (!new RegExp(`\\b${attr}\\s*=\\s*["']${escaped}["']`, 'i').test(tag)) continue;
    const c = /\bcontent\s*=\s*(["'])([\s\S]*?)\1/i.exec(tag);
    if (c) return decodeEntities(c[2]);
  }
  return null;
}

const firstMatch = (html: string, re: RegExp): string | null => {
  const m = re.exec(html);
  return m && m[1] !== undefined ? m[1] : null;
};

const TITLE_RE = /<title\b[^>]*>([\s\S]*?)<\/title>/i;
const H1_RE = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i;
const CRUMB_NAV_RE = /<nav\b[^>]*aria-label\s*=\s*["']Breadcrumb["'][^>]*>([\s\S]*?)<\/nav>/i;
const LD_JSON_RE = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function collectNodes(node: unknown, out: unknown[] = []): unknown[] {
  if (Array.isArray(node)) {
    for (const n of node) collectNodes(n, out);
    return out;
  }
  if (node && typeof node === 'object') {
    out.push(node);
    for (const v of Object.values(node as Record<string, unknown>)) collectNodes(v, out);
  }
  return out;
}

function jsonLdNodes(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const m of html.matchAll(LD_JSON_RE)) {
    const raw = (m[1] ?? '').trim();
    if (!raw) continue;
    try {
      for (const n of collectNodes(JSON.parse(raw))) {
        if (n && typeof n === 'object') out.push(n as Record<string, unknown>);
      }
    } catch {
      // 坏 JSON ⇒ 当作没找到（⇒ 该项「未核验」，不得默认通过）。
    }
  }
  return out;
}

function ldName(html: string, type: string): string | null {
  const hit = jsonLdNodes(html).find(
    (n) => n['@type'] === type && typeof n['name'] === 'string',
  );
  return hit ? (hit['name'] as string) : null;
}

function ldBreadcrumbName(html: string, slug: string): string | null {
  const bc = jsonLdNodes(html).find(
    (n) => n['@type'] === 'BreadcrumbList' && Array.isArray(n['itemListElement']),
  );
  if (!bc) return null;
  const items = bc['itemListElement'] as Record<string, unknown>[];
  const hit =
    items.find((it) => typeof it['item'] === 'string' && (it['item'] as string).includes('/' + slug + '/')) ??
    items[items.length - 1];
  return hit && typeof hit['name'] === 'string' ? (hit['name'] as string) : null;
}

type Status = '合格' | '不合格' | '未核验';
interface Check {
  label: string;
  status: Status;
  detail: string;
}

// 显示宽度对齐（CJK 算 2 格）。
const pad = (s: string, w: number): string => {
  const width = [...s].reduce((n, ch) => n + (/[\u2E80-\uFFFF]/.test(ch) ? 2 : 1), 0);
  return s + ' '.repeat(Math.max(0, w - width));
};

if (!existsSync(probePath)) {
  console.log('');
  console.log(`[边界核验] probe 文件不存在：${probePath} —— 跳过（先跑 pnpm build）`);
  problems.push(`边界核验未执行（probe 文件不存在：${probePath}）`);
} else {
  const html = readFileSync(probePath, 'utf8');
  const probeLocale = probeLang === 'en' ? en : zh;
  const longName = probeLocale['tools.' + probeSlug + '.title'] ?? '';
  const checks: Check[] = [];

  // —— <title>：必须是**短版**（≤60）——
  const titleRaw = firstMatch(html, TITLE_RE);
  const titleText = titleRaw === null ? null : textOf(titleRaw);
  checks.push({
    label: '<title>',
    status: titleText === null ? '未核验' : titleText.length <= MAX_LEN ? '合格' : '不合格',
    detail:
      titleText === null
        ? '页面里没有 <title>'
        : `${titleText}  (${titleText.length} 字符，阈值 ${MAX_LEN})`,
  });

  // —— og:title / twitter:title：仍是**长名** + 品牌后缀 ——
  for (const [label, attr, key] of [
    ['og:title', 'property', 'og:title'],
    ['twitter:title', 'name', 'twitter:title'],
  ] as const) {
    const v = metaContent(html, attr, key);
    const ok = v !== null && longName !== '' && v.includes(longName) && v.includes(BRAND);
    checks.push({
      label,
      status: v === null ? '未核验' : ok ? '合格' : '不合格',
      detail: v === null ? '页面里没有该 meta（未核验）' : v,
    });
  }

  // —— JSON-LD name（SoftwareApplication.name）：仍是长名 ——
  const ldAppName = ldName(html, 'SoftwareApplication');
  checks.push({
    label: 'JSON-LD name',
    status:
      ldAppName === null ? '未核验' : longName !== '' && ldAppName.includes(longName) ? '合格' : '不合格',
    detail: ldAppName === null ? '找不到 SoftwareApplication 的 name（未核验）' : ldAppName,
  });

  // —— h1：仍是长名（元素级断言，不是「整页包含」）——
  const h1Raw = firstMatch(html, H1_RE);
  const h1Text = h1Raw === null ? null : textOf(h1Raw);
  checks.push({
    label: 'h1',
    status:
      h1Text === null ? '未核验' : longName !== '' && h1Text.includes(longName) ? '合格' : '不合格',
    detail: h1Text === null ? '页面里没有 <h1>（未核验）' : h1Text,
  });

  // —— 面包屑：可见导航 + JSON-LD BreadcrumbList 都要仍是长名 ——
  const navRaw = firstMatch(html, CRUMB_NAV_RE);
  const navText = navRaw === null ? null : textOf(navRaw);
  const ldCrumb = ldBreadcrumbName(html, probeSlug);
  const crumbParts: { label: string; value: string | null }[] = [
    { label: '可见导航', value: navText },
    { label: 'JSON-LD BreadcrumbList', value: ldCrumb },
  ];
  const crumbFound = crumbParts.filter((p) => p.value !== null);
  const crumbBad = crumbFound.filter((p) => !(p.value as string).includes(longName));
  const crumbStatus: Status =
    crumbBad.length > 0
      ? '不合格'
      : crumbFound.length === crumbParts.length
        ? '合格'
        : '未核验';
  checks.push({
    label: '面包屑',
    status: crumbStatus,
    detail: crumbParts
      .map((p) => `${p.label}=${p.value ?? '（未找到）'}`)
      .join('  ·  '),
  });

  console.log('');
  console.log(`[边界核验] 目标页：${probePath}`);
  console.log(`[边界核验] 基准：${probeLang}/${probeSlug} · 长名 = ${longName}`);
  for (const c of checks) {
    const tag = c.status === '合格' ? '[合格]' : c.status === '不合格' ? '[不合格]' : '[未核验]';
    console.log(`[边界核验] ${pad(c.label, 14)}${tag}  ${c.detail}`);
  }

  const titleCheck = checks.find((c) => c.label === '<title>');
  const boundaryChecks = checks.filter((c) => c.label !== '<title>');
  const badBoundary = boundaryChecks.filter((c) => c.status === '不合格');
  const unknownBoundary = boundaryChecks.filter((c) => c.status === '未核验');

  if (badBoundary.length) {
    console.log('');
    console.log(`✗ 边界被破坏：${badBoundary.map((c) => c.label).join(' · ')} 不合格`);
    problems.push('边界被破坏：' + badBoundary.map((c) => c.label).join(' · '));
  } else if (unknownBoundary.length) {
    console.log('');
    console.log(
      `✗ 边界未完全核验：${unknownBoundary.map((c) => c.label).join(' · ')} —— 抽不到 ⇒ 不得默认通过`,
    );
    problems.push('边界未完全核验：' + unknownBoundary.map((c) => c.label).join(' · '));
  } else if (titleCheck && titleCheck.status === '不合格') {
    console.log('');
    console.log(`✗ <title> 未瘦身（超过 ${MAX_LEN} 字符）—— 边界 5 项全部合格`);
    problems.push('<title> 未瘦身（超过 ' + MAX_LEN + ' 字符）');
  } else if (titleCheck && titleCheck.status === '未核验') {
    console.log('');
    console.log('✗ <title> 未核验');
    problems.push('<title> 未核验');
  } else {
    console.log('');
    console.log(
      '✓ 边界达标：只有 <title> 变短（og:title / twitter:title / JSON-LD name / h1 / 面包屑 全部仍是长名）',
    );
  }
}

// —— 汇总 ——
if (problems.length) {
  console.log('');
  console.log('✗ 未达标项：');
  for (const p of problems) console.log('  - ' + p);
  if (strict) {
    console.log('');
    console.log('(--strict ⇒ 退出码 1)');
    process.exitCode = 1;
  }
} else {
  console.log('');
  console.log(strict ? '✓ 全部断言通过（--strict）' : '✓ 全部断言通过');
}

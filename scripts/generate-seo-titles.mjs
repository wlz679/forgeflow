#!/usr/bin/env node
/**
 * P168 B3-2 —— seoTitle 候选生成器（可重复执行：同输入 ⇒ 同输出）
 *
 * 输入
 *   src/i18n/locales/en.json + src/i18n/locales/zh.json 的 tools.<slug>.title（100 slug）
 *   scripts/seo-title-overrides.json —— 人工覆盖表（手工维护）
 *
 * 输出（stdout，纯 JSON）
 *   { en: Record<slug,string>, zh: Record<slug,string>, manual: Record<slug,{en,zh}> }
 *
 * 规则（只做机械派生，不改写任何词组）
 *   1. stripYear —— 只剥结尾的 4 位年份括号；术语括号（NRR）/（GRR）/（DAU-MAU）/（CSAT）/（ACV）等一律保留
 *   2. en 自动稿 —— **整组丢弃**低检索价值组（Free / Online / Instant 开头），
 *      其余词组**逐字保留**并按 ' + ' 累加到 <= 60（放不下的组整组跳过）
 *      ⚠️ **绝不改写词组**：把 "Free Blended" 改成 "Blended" 会产出悬垂修饰语
 *        （"CAC Calculator — Blended" 读不通），而「至少保留一组逐字」的判据
 *        **抓不到这一类缺陷**（其它组逐字 ⇒ 判据照样绿）⇒ 必须在生成阶段就避免。
 *   3. zh 自动稿 —— 只剥年份，关键词段一字不动
 *   4. 人工覆盖表优先（覆盖值优先于规则稿）
 *
 * 自检（任一不通过即以非 0 退出码失败，不产出半成品）
 *   - 覆盖表 slug 必须真实存在于 100 个工具里
 *   - 覆盖值 en / zh 长度 <= 60
 *   - 覆盖值必须保留 >= 1 组**原关键词组逐字**，且不含被改写（去掉 Free 等前缀）的词组
 *   - 全量候选：不含 4 位年份、en/zh 的「 — 」分段结构对齐、原标题有词段则候选也要有词段
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT_DEFAULT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// P168 B3-2 收尾：--check（漂移闸门）与 --root（让守卫能在 tmp/ 夹具里跑，不碰真实 locale）
const ARGV = process.argv.slice(2);
const CHECK = ARGV.includes('--check');
const rootEq = ARGV.find((a) => a.startsWith('--root='));
const rootPos = ARGV.indexOf('--root');
const ROOT_ARG = rootEq
  ? rootEq.slice('--root='.length)
  : (rootPos >= 0 && ARGV[rootPos + 1] ? ARGV[rootPos + 1] : '');
const ROOT = ROOT_ARG ? resolve(ROOT_ARG) : ROOT_DEFAULT;

const SEP = ' \u2014 ';                       // ' — '
const MAX_LEN = 60;
// ⭐ 期望值**独立写死**（不可从同一份真值派生 ⇒ 同义反复）
const EXPECTED_SLUG_COUNT = 100;
const LOW_VALUE_PREFIX = ['Free ', 'Online ', 'Instant '];
const YEAR_TAIL = /\s*[\uff08(]\d{4}[\uff09)]\s*$/;   // 只认结尾的 4 位年份
const YEAR_ANY = /[\uff08(]\d{4}[\uff09)]/;             // 任意位置的 4 位年份括号

const fail = (msg) => {
  console.error('[seo-titles] ' + msg);
  process.exit(1);
};

const stripBom = (s) => s.replace(/^\uFEFF/, '');

const readJson = (rel) => {
  let raw;
  try {
    raw = readFileSync(resolve(ROOT, rel), 'utf8');
  } catch (e) {
    fail('读不到文件: ' + rel + ' (' + e.message + ')');
  }
  try {
    return JSON.parse(stripBom(raw));
  } catch (e) {
    fail('JSON 解析失败: ' + rel + ' (' + e.message + ')');
  }
};

/** 只剥结尾的 4 位年份括号（术语括号必须保留） */
const stripYear = (s) => s.replace(YEAR_TAIL, '');

/** 按 ' + ' 切分关键词段 */
const splitGroups = (kw) => kw.split(/\s*\+\s*/);

/** 原 title 的关键词段（去掉年份后切分）；原 title 没有 ' — ' 时返回 null */
const originalGroups = (title) => {
  const s = stripYear(title);
  const i = s.indexOf(SEP);
  if (i < 0) return null;
  return splitGroups(s.slice(i + SEP.length));
};

/** 候选值的关键词段；候选值没有 ' — ' 时返回 null */
const valueGroups = (value) => {
  const i = value.indexOf(SEP);
  if (i < 0) return null;
  return splitGroups(value.slice(i + SEP.length));
};

/** en 自动稿：剥年份 → 整组丢弃低检索价值组 → 其余词组逐字保留，按 ' + ' 累加到 <= 60 */
function enDraft(title) {
  const s = stripYear(title);
  const i = s.indexOf(SEP);
  if (i < 0) return s;                        // 本来就没有关键词段
  const head = s.slice(0, i);
  const kept = [];
  for (const g of splitGroups(s.slice(i + SEP.length))) {
    // ⭐ 低检索价值组**整组丢弃** —— 不剥它的前缀（剥了就是改写词组）
    if (LOW_VALUE_PREFIX.some((lv) => g.startsWith(lv))) continue;
    const cand = head + SEP + [...kept, g].join(' + ');
    if (cand.length > MAX_LEN) continue;      // 放不下 ⇒ 整组跳过，后面的短组仍可保留
    kept.push(g);
  }
  return kept.length ? head + SEP + kept.join(' + ') : head;
}

/** zh 自动稿：只删年份，关键词段一字不动 */
const zhDraft = (title) => stripYear(title);

// ---------------------------------------------------------------------------
// 1. 规则稿
// ---------------------------------------------------------------------------
const en = readJson('src/i18n/locales/en.json');
const zh = readJson('src/i18n/locales/zh.json');

const slugs = Object.keys(en)
  .filter((k) => /^tools\.[^.]+\.title$/.test(k))
  .map((k) => k.split('.')[1])
  .sort();
const zhSlugs = Object.keys(zh)
  .filter((k) => /^tools\.[^.]+\.title$/.test(k))
  .map((k) => k.split('.')[1])
  .sort();

if (slugs.length === 0) fail('没找到任何 tools.<slug>.title 键');
// ⭐ 条数断言：slug 列表由 **en 自己的键集**派生 ⇒ 缺一个键时「缺键检查」是死分支，
//   只剩 `length === 0` 这条永远为真的断言 ⇒ 会**静默**产出 99 条候选并 exit 0。
if (slugs.length !== EXPECTED_SLUG_COUNT) {
  fail('en 的 tools.<slug>.title 键数应为 ' + EXPECTED_SLUG_COUNT + '，实际 ' + slugs.length);
}
if (zhSlugs.length !== slugs.length) {
  fail('en/zh 的 tools.<slug>.title 键数不一致：en ' + slugs.length + ' vs zh ' + zhSlugs.length);
}
const onlyEn = slugs.filter((s) => !zhSlugs.includes(s));
const onlyZh = zhSlugs.filter((s) => !slugs.includes(s));
if (onlyEn.length || onlyZh.length) {
  fail('en/zh 的 slug 集合不一致：只在 en ' + JSON.stringify(onlyEn) + ' · 只在 zh ' + JSON.stringify(onlyZh));
}

const out = { en: {}, zh: {}, manual: {} };
for (const slug of slugs) {
  const enTitle = en['tools.' + slug + '.title'];
  const zhTitle = zh['tools.' + slug + '.title'];
  if (typeof enTitle !== 'string' || !enTitle.trim()) {
    fail('en 缺少 tools.' + slug + '.title，或它是空串');
  }
  if (typeof zhTitle !== 'string' || !zhTitle.trim()) {
    fail('zh 缺少 tools.' + slug + '.title，或它是空串');
  }
  out.en[slug] = enDraft(enTitle);
  out.zh[slug] = zhDraft(zhTitle);
}

// ---------------------------------------------------------------------------
// 2. 人工覆盖表（优先）
// ---------------------------------------------------------------------------
const overrides = readJson('scripts/seo-title-overrides.json');
if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
  fail('scripts/seo-title-overrides.json 必须是 { slug: { en, zh } } 对象');
}

for (const slug of Object.keys(overrides).sort()) {
  const v = overrides[slug];
  if (!v || typeof v !== 'object') fail('覆盖表条目格式错误: ' + slug);
  if (typeof v.en !== 'string' || !v.en.trim()) fail('覆盖表条目缺少 en: ' + slug);
  if (!out.en[slug] || !out.zh[slug]) fail('覆盖表里的 slug 不存在: ' + slug);

  const zhVal = typeof v.zh === 'string' && v.zh.trim() ? v.zh : out.zh[slug];

  if (v.en.length > MAX_LEN) fail('覆盖值 en 超过 ' + MAX_LEN + ' 字符 (' + v.en.length + '): ' + slug);
  if (zhVal.length > MAX_LEN) fail('覆盖值 zh 超过 ' + MAX_LEN + ' 字符 (' + zhVal.length + '): ' + slug);
  if (YEAR_ANY.test(v.en)) fail('覆盖值 en 残留年份: ' + slug);
  if (YEAR_ANY.test(zhVal)) fail('覆盖值 zh 残留年份: ' + slug);

  // 词组完整：覆盖值里每一组都必须是原关键词组逐字，且至少保留一组非 Free 的原词组
  const og = originalGroups(en['tools.' + slug + '.title']);
  const vg = valueGroups(v.en);
  if (og && !vg) fail('覆盖值丢了关键词段: ' + slug);
  if (og && vg) {
    for (const g of vg) {
      if (!og.includes(g)) fail('覆盖值改写了词组 "' + g + '"（必须逐字沿用原词组）: ' + slug);
    }
    const valued = og.filter((g) => !/^Free /.test(g));
    if (valued.length && !valued.some((g) => vg.includes(g))) {
      fail('覆盖值没保留任何一组完整的非 Free 原词组: ' + slug);
    }
  }

  // en / zh 结构对齐：两侧都有或都没有 ' — ' 分段
  if (v.en.includes(SEP) !== zhVal.includes(SEP)) {
    fail('覆盖值 en/zh 结构不对齐: ' + slug);
  }

  out.en[slug] = v.en;
  out.zh[slug] = zhVal;
  out.manual[slug] = { en: v.en, zh: zhVal };
}

// ---------------------------------------------------------------------------
// 3. 全量候选自检
// ---------------------------------------------------------------------------
for (const slug of slugs) {
  const e = out.en[slug];
  const z = out.zh[slug];
  if (e.length > MAX_LEN) fail('en 候选超过 ' + MAX_LEN + ' 字符 (' + e.length + '): ' + slug);
  if (z.length > MAX_LEN) fail('zh 候选超过 ' + MAX_LEN + ' 字符 (' + z.length + '): ' + slug);
  if (YEAR_ANY.test(e) || YEAR_ANY.test(z)) fail('候选残留年份: ' + slug);
  if (e.includes(SEP) !== z.includes(SEP)) fail('en/zh 结构不对齐: ' + slug);
  if (originalGroups(en['tools.' + slug + '.title']) && !e.includes(SEP)) {
    fail('en 候选丢了关键词段: ' + slug);
  }
}

if (CHECK) {
  // ============================================================
  // --check：locale 的 seoTitle 必须与生成器输出**完全一致**
  // ============================================================
  //
  // ⭐ 漂移不变量是什么：locale 里每个 tools.<slug>.seoTitle
  //   必须等于「生成器按规则稿 + 人工覆盖表算出来的值」。
  //   ⇒ 任何手改 seoTitle 的动作都必须登记进 scripts/seo-title-overrides.json
  //   ⇒ 否则 CI 会红。（B3-5 就是手改 GSC 对齐后的 8 条，已登记为覆盖表。）
  //
  // ⭐ 判据为什么不是「locale 里有没有 seoTitle 键」：
  //   那种判据是**存在性**——B3-2 的 100 个键全在，闸门照样绿，
  //   但值已经漂了 ⇒ 闸门必须比**值**。
  const drift = [];
  for (const slug of slugs) {
    const key = 'tools.' + slug + '.seoTitle';
    if (en[key] !== out.en[slug]) {
      drift.push('en ' + slug + ': locale=' + JSON.stringify(en[key]) + ' 生成器=' + JSON.stringify(out.en[slug]));
    }
    if (zh[key] !== out.zh[slug]) {
      drift.push('zh ' + slug + ': locale=' + JSON.stringify(zh[key]) + ' 生成器=' + JSON.stringify(out.zh[slug]));
    }
  }
  if (drift.length > 0) {
    console.error('[seo-titles] 漂移 ' + drift.length + ' 处：locale 的 seoTitle 与生成器输出不一致');
    for (const d of drift.slice(0, 20)) console.error('  · ' + d);
    if (drift.length > 20) console.error('  … 还有 ' + (drift.length - 20) + ' 处');
    console.error('[seo-titles] 修法：把期望值登记进 scripts/seo-title-overrides.json（人工覆盖优先），或重跑生成器');
    process.exit(1);
  }
  console.log('[seo-titles] PASSED — ' + slugs.length + ' 个工具的 en/zh seoTitle 与生成器输出完全一致');
  process.exit(0);
}
process.stdout.write(JSON.stringify(out, null, 2) + '\n');

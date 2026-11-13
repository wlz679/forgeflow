// P168 B3-7 —— zh 页结果卡片英文化：token 协议 + 渲染器的守卫。
//
// ⭐ 本文件守三件事：
//   ① token 协议本身（code 形态 / params / 兜底 / 渲染降级）—— 单元断言；
//   ② 共享模块不得 import locale（客户端 bundle 不带 1.9MB）；
//   ③ 四条 source-only 判据 G1 / G2 / G2b / G3（译文质量 / 模板表守恒 /
//      '$' 形态 / 两份实现一致）—— Task 6~15 的引擎 token 化靠它们验收。
//
// ⚠️ 本文件必须保持 **source-only**：源码里不得出现 build-dep 闸门用的那个环境变量名
//    （分类规则见 tests/build-dep-suites.mjs —— 它按「源码里是否提到该变量名」判定）。

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CALC_OUTPUT_TOKEN_RE,
  makeToken,
  renderCalcOutput,
  extractTokenCodes,
  CALC_OUTPUT_TIP_MARKERS,
  isCalcOutputTipLine,
} from '../src/lib/calc-output-i18n.ts';
import {
  infoUnits,
  readLocale,
  MIN_ZH_TO_EN_RATIO,
  ROOT,
} from './_decision-support-fixture.ts';
import { stripComments } from './build-dep-suites.mjs';
import { tools } from '../src/data/tools/index.ts';
import {
  calcOutputTemplates,
  calcOutputTemplatesJson,
  toolAlias,
} from '../src/lib/calc-output-templates.ts';

test('B3-7 token 协议：code 段数 ≥2、全小写、段内只允许 [a-z0-9_]', () => {
  assert.ok(CALC_OUTPUT_TOKEN_RE.global, '正则必须带 g（要替换全部 token）');
  assert.match(makeToken('calc_out.label.starting_mrr', 'Starting MRR'), /^\$calc_out\.label\.starting_mrr\|/);
  // $ + 数字（金额）不是 token
  assert.deepEqual(extractTokenCodes('Total: $12,000 and $300,000'), []);
  // 三段 / 四段都合法
  assert.deepEqual(extractTokenCodes('$calc_out.label.a'), ['calc_out.label.a']);
  assert.deepEqual(extractTokenCodes('$calc_out.mrr.row.path_a'), ['calc_out.mrr.row.path_a']);
});

test('B3-7 token 协议：params 是紧跟 code 的 JSON，fallback 在第一个 | 之后', () => {
  const tok = makeToken('calc_out.mrr.row.path_a', 'Path A — raise total contract value by $300,000', { total: '$300,000' });
  assert.match(tok, /^\$calc_out\.mrr\.row\.path_a\{"total":"\$300,000"\}\|Path A/);
});

test('B3-7 渲染：命中 locale 键 ⇒ 用模板并插值 params', () => {
  const tok = makeToken('calc_out.mrr.row.path_a', 'Path A — raise total contract value by $300,000', { total: '$300,000' });
  const out = renderCalcOutput('• ' + tok, {
    'calc_out.mrr.row.path_a': '路径 A —— 把合同总价值提高到 {total}（同样的客户数，更大的单子）',
  });
  assert.equal(out, '• 路径 A —— 把合同总价值提高到 $300,000（同样的客户数，更大的单子）');
});

test('B3-7 渲染：locale 缺键 ⇒ 降级到英文兜底（不显示裸 token）', () => {
  const tok = makeToken('calc_out.label.starting_mrr', 'Starting MRR');
  const out = renderCalcOutput('• ' + tok, {});
  assert.equal(out, '• Starting MRR');
  assert.ok(!out.includes('$calc_out'), '降级后不得残留裸 token');
});

test('B3-7 渲染：没有 "|" 分段的 token ⇒ 保留 token 原文（让守卫在 CI 里变红）', () => {
  const out = renderCalcOutput('$calc_out.label.x', {});
  assert.equal(out, '$calc_out.label.x');
});

test('B3-7 渲染：真的空兜底（makeToken 的 fallback 为空串）不残留可见的裸 token', () => {
  const tok = makeToken('calc_out.label.x', '');
  const out = renderCalcOutput(tok, {});
  assert.ok(!out.includes('$calc_out'), '空兜底渲染出了裸 token：' + out);
  assert.equal(out, '');
});

test('B3-7 token 构造：fallback 里的半角 "|" 被净化成全角（否则 token 尾部会漏出孤儿尾巴）', () => {
  const tok = makeToken('calc_out.mrr.row.path_a', 'Path A | raise total contract value');
  assert.ok(tok.includes('｜'), '半角竖线没有被换成全角：' + tok);
  const out = renderCalcOutput(tok, { 'calc_out.mrr.row.path_a': '路径 A' });
  assert.equal(out, '路径 A');
  const fb = renderCalcOutput(tok, {});
  assert.ok(fb.includes('Path A'), '英文兜底丢了：' + fb);
  assert.ok(!fb.includes('$calc_out'), '降级后残留裸 token：' + fb);
});

test('B3-7 token 构造：param 值里的花括号被**转义**（保住 token 结构，且不丢数据）', () => {
  // ⭐ 复核轮实测：直接**删掉**花括号会改数据（公式片段 / JSON 样例 / 代码里的花括号会消失）
  //   ⇒ 用户看到的值 ≠ 引擎算出的值 ⇒ 改为在 JSON 文本层转义成 \u007b / \u007d
  //   ⇒ token 结构保住，JSON.parse 还原后值**一字不差**。
  const tok = makeToken('calc_out.label.x', 'fallback', { note: '{oops}' });
  assert.ok(!tok.includes('{oops}'), 'token 文本里出现了裸花括号（会破坏 params 组匹配）：' + tok);
  const out = renderCalcOutput(tok, { 'calc_out.label.x': '中文 {note}' });
  assert.equal(out, '中文 {oops}', '花括号被静默改写了（数据零损失是硬要求）');
});

test('B3-7 渲染：renderCalcOutput 幂等（连续两次渲染同一段文本，结果一致）', () => {
  const text =
    '• ' + makeToken('calc_out.mrr.row.path_a', 'Path A — raise to $300,000', { total: '$300,000' }) +
    '\n• ' + makeToken('calc_out.label.starting_mrr', 'Starting MRR');
  const tpl = {
    'calc_out.mrr.row.path_a': '路径 A —— {total}',
    'calc_out.label.starting_mrr': '起始 MRR',
  };
  const a = renderCalcOutput(text, tpl);
  const b = renderCalcOutput(text, tpl);
  assert.equal(a, b, '两次渲染结果不一致');
  assert.ok(!a.includes('$calc_out'), '渲染后残留裸 token：' + a);
});

test('B3-7 渲染：兜底里的金额不被截断（$ + 数字继续吃，$ + 字母才停）', () => {
  const tok = makeToken('calc_out.mrr.row.milestone', '$20,000.00 MRR: 2.2 months');
  const out = renderCalcOutput(tok, {});
  assert.equal(out, '$20,000.00 MRR: 2.2 months');
});

test('B3-7 渲染：模板里没有对应 param 时占位符原样保留（不静默吞掉）', () => {
  const tok = makeToken('calc_out.x.row.y', 'en {missing}', { other: 'v' });
  const out = renderCalcOutput(tok, { 'calc_out.x.row.y': '中文 {missing}' });
  assert.equal(out, '中文 {missing}');
});

test('B3-7 共享模块：不得 import locale（客户端 bundle 会被拖进 1.9MB）', () => {
  const src = readFileSync(resolve(process.cwd(), 'src/lib/calc-output-i18n.ts'), 'utf8');
  assert.doesNotMatch(src, /from\s+['"]\.\.\/i18n/, '共享模块 import 了 i18n');
  assert.doesNotMatch(src, /locales[\\/]/, '共享模块里出现了 locales 路径');
});

// ── Task 4：页面接线（3 条断言）─────────────────────────────────────────
const astroSrc = readFileSync(resolve(process.cwd(), 'src/pages/[lang]/[slug].astro'), 'utf8');

test('B3-7 接线：静态卡片必须先渲染 token 再走 translateCalcOutput（顺序不能反）', () => {
  const renderAt = astroSrc.indexOf('renderCalcOutput(exWithoutTip');
  const translateAt = astroSrc.indexOf('translateCalcOutput(renderedEx');
  assert.ok(renderAt > 0, '静态路径没有调用 renderCalcOutput');
  assert.ok(translateAt > 0, '静态路径没有调用 translateCalcOutput');
  assert.ok(renderAt < translateAt, 'renderCalcOutput 必须排在 translateCalcOutput 之前');
});

test('B3-7 接线：模板子集必须注入到 #static-results 的 data 属性', () => {
  assert.match(
    astroSrc,
    /id="static-results"[^>]*data-calc-output-templates=/,
    '模板子集没有注入到 #static-results',
  );
});

test('B3-7 接线：动态卡片渲染后必须派发 ffk:calc-output-rendered 事件', () => {
  assert.match(astroSrc, /ffk:calc-output-rendered/, '动态路径没有派发渲染完成事件');
});

// ── Task 3：客户端模块必须复用共享渲染器（不得自带第二份实现）──────────
test('B3-7 接线：客户端模块必须复用共享渲染器（不得自带第二份实现）', () => {
  const src = readFileSync(resolve(process.cwd(), 'src/scripts/calc-output.client.ts'), 'utf8');
  assert.match(src, /from '\.\.\/lib\/calc-output-i18n'/, '客户端没有 import 共享渲染器');
  assert.doesNotMatch(src, /locales\//, '客户端不得直接读 locale');
});

// ── Task 2：服务端模板模块的两条断言 ──────────────────────────────────
test('B3-7 alias：slug → alias（去前缀/后缀、连字符换下划线），100 个工具两两不同', () => {
  assert.equal(toolAlias('solopreneur-mrr-calculator'), 'mrr');
  assert.equal(toolAlias('solopreneur-rent-vs-buy-calculator'), 'rent_vs_buy');
  assert.equal(toolAlias('solopreneur-funnel-step-calculator'), 'funnel_step');
  // ⭐ 100 个工具的 alias 必须两两不同（否则行码会跨工具串味）
  const aliases = new Set<string>();
  const dup: string[] = [];
  for (const tool of tools) {
    const a = toolAlias(tool.slug);
    if (aliases.has(a)) dup.push(a);
    aliases.add(a);
  }
  assert.deepEqual(dup, [], 'alias 重复：' + dup.join(', '));
});

test('B3-7 模板子集：共享 label/section + 本工具 row；不含别的工具的 row', () => {
  const tpls = calcOutputTemplates('zh', 'mrr');
  const keys = Object.keys(tpls);
  // ⚠️ locale 键在 Task 16 落库前是空的 ⇒ 这条会红（预期红，见计划 Task 2 Step 4）
  assert.ok(keys.length > 0, '模板子集为空（locale 还没有 calc_out.* 键）');
  for (const k of keys) {
    assert.ok(k.startsWith('calc_out.'), '键前缀不对：' + k);
    const second = k.split('.')[1];
    assert.ok(
      second === 'label' || second === 'section' || second === 'mrr',
      '混进了别的工具的行码：' + k,
    );
  }
  // 注入用的 JSON 串不含裸 <（防 </script> 截断）
  const json = calcOutputTemplatesJson('zh', 'mrr');
  assert.ok(!json.includes('<'), 'JSON 里出现裸 <');
  assert.doesNotThrow(() => JSON.parse(json));
});

// ═══ P168 B3-7 的四条 source-only 判据 ═══
// （本段用到的共享夹具：infoUnits / readLocale / MIN_ZH_TO_EN_RATIO / ROOT
//   来自 './_decision-support-fixture.ts' —— 与既有决策层守卫同一套信息量口径）

/** 引擎文件里出现的所有 token code（两种写法都要认） */
function tokenCodesIn(rawText: string): string[] {
  // ⭐ 2026-11-13 实测修复：**先剥注释**。
  //   否则注释里写的 code（例如「⛔ 不要写 'calc_out.x.row.band_' + band」）
  //   会被当成「引擎声明了这个 code」⇒ ① 死键看起来是活的；② locale 里不存在的伪 code 会假红。
  //   stripComments 是扫描器实现 ⇒ 字符串字面量（含 customFn 的 JS 源码）逐字保留 ✔
  const text = stripComments(rawText);
  const out = new Set<string>();
  // ① 直接字面量：'$calc_out.label.starting_mrr'
  for (const m of text.matchAll(/\$([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)/g)) out.add(m[1]);
  // ② 构造器调用：tk('calc_out.x.y', ...) / tok(...) / makeToken(...)
  //   ⚠️ customFn 里没有 '$' 前缀（它是字符串字面量里的裸 code）⇒ 必须单独认
  //   ⚠️ 三个名字都要认：共享 JS 源码里的函数名是 **tk**（customFn 正文前置它）、
  //      服务端 import 的是 makeToken（计划正文里也出现过 tok）。
  //      少认一个 ⇒ G3 的「客户端 token 集合」会变成空集 ⇒ 引擎 token 化后**假红**。
  for (const m of text.matchAll(/\b(?:tk|tok|makeToken)\(\s*['"]([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)['"]/g)) {
    out.add(m[1]);
  }
  // ③ 裸字符串字面量（**映射表形态**）：{excellent:'calc_out.x.band_excellent', ...}
  //   ⭐ 为什么要有这一条（2026-11-13 实测）：makeToken('前缀' + 变量, ...) 这种
  //   **动态拼码**静态扫描器看不见真实 code ⇒ 守卫把拼接前缀当成一个不存在的 code（伪码）
  //   ⇒ 协议改成「code 必须来自字面量映射表」⇒ 扫描器直接认映射表里的字面量。
  //   ⚠️ 只认 calc_out 命名空间 ⇒ 否则 'decision_tip.foo' 之类会被误收进来。
  for (const m of text.matchAll(/['"](calc_out\.[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)['"]/g)) {
    out.add(m[1]);
  }
  return [...out].sort();
}

/** slug → 引擎文件（扫 src/engines/** 解析 slug 字面量，不硬编码路径表） */
function engineFileBySlug(): Map<string, string> {
  const map = new Map<string, string>();
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith('.ts') && e.name !== 'index.ts') {
        const src = readFileSync(full, 'utf8');
        const m = /slug:\s*(?:'([^']+)'|"([^"]+)")/.exec(src);
        if (m) map.set(m[1] || m[2], full);
      }
    }
  };
  walk(resolve(ROOT, 'src', 'engines'));
  return map;
}

/**
 * 把引擎文件按「服务端区 / customFn 区」切开。
 *
 * ⭐ custom 引擎的文件布局是稳定的：
 *     <calculate 实现> … const customFn = "…" … const engine = { … }
 *   ⇒ 客户端区 = customFn 声明（含其字符串字面量）。
 *   ⇒ 服务端区 = **整个文件去掉 customFn 声明**（含 engine 对象里的 generate()）。
 *
 * ⚠️⚠️ 2026-11-13 实测修正：旧口径是「服务端区 = customFn 声明之前」，
 *   而**多数引擎的服务端实现在 engine 对象里**（generate() 方法）
 *   ⇒ 服务端 token 集合恒为空 ⇒ G3 对绝大多数引擎**真空绿**（空集 == 空集）⇒ 门户大开。
 *   ⇒ 现在服务端区取「文件减去 customFn 声明」，客户端区取 customFn 声明本身。
 */
function splitEngineRegions(src: string): { server: string; client: string } | null {
  const fnAt = src.indexOf('const customFn');
  if (fnAt < 0) return null;
  const engineAt = src.indexOf('const engine', fnAt);
  if (engineAt < 0) return null;
  return { server: src.slice(0, fnAt) + src.slice(engineAt), client: src.slice(fnAt, engineAt) };
}

// ── G1：译文质量（zh ≠ en · 非占位 · 信息量 ≥ 英文 × 0.7）────────────────
test('P168 B3-7 G1：calc_out.* 的 zh 译文不是英文原文、不是占位、厚度达标', () => {
  const locales = { en: readLocale('en'), zh: readLocale('zh') } as const;
  const keys = Object.keys(locales.zh).filter((k) => k.startsWith('calc_out.'));
  assert.ok(keys.length > 0, 'locale 里没有任何 calc_out.* 键');
  const problems: string[] = [];
  for (const key of keys) {
    const en = locales.en[key];
    const zh = locales.zh[key];
    if (typeof en !== 'string' || typeof zh !== 'string') {
      problems.push(key + ' 在 en/zh 有一边缺失');
      continue;
    }
    if (zh === en) problems.push(key + ' 的 zh 与 en 逐字相同（没翻）');
    if (zh.includes('用此计算器')) problems.push(key + ' 是占位模板');
    const enU = infoUnits(en);
    const zhU = infoUnits(zh);
    if (enU > 0 && zhU < enU * MIN_ZH_TO_EN_RATIO) {
      problems.push(key + ' 的中文只有英文的 ' + (zhU / enU).toFixed(2) + '（下限 ' + MIN_ZH_TO_EN_RATIO + '）');
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

// ── G1b：占位符后的**单位**不得在 zh 侧丢失 ──────────────────────────────
// ⚠️ 为什么这条独立存在（G1 抓不到）：G1 只看「zh ≠ en」与「信息量 ≥ 0.7」，
//   而「en 是 `{rate}%`、zh 是 `{rate}`」⇒ zh 仍然 ≠ en、厚度也够 ⇒ **G1 照样绿**。
//   ⇒ 实测 coupon_attribution 的两条公式行就是这样漏了单位（zh 会显示「× 10.0 ×」）。
// ⚠️ 口径只查 `%`（百分号）：`-` 之类不是单位（en 的 `{years}-year stay` 的连字符
//   是英文复合词，zh 译成「{years} 年居住」是对的）⇒ 查 `-` 会假红。
test('P168 B3-7 G1b：占位符后的百分号单位不得在 zh 译文里丢失', () => {
  const locales = { en: readLocale('en'), zh: readLocale('zh') } as const;
  const keys = Object.keys(locales.zh).filter((k) => k.startsWith('calc_out.'));
  // ⚠️ 防假绿：locale 还没落库时 keys 为空 ⇒ 断言会「什么都没查」而绿
  assert.ok(keys.length > 0, 'locale 里没有任何 calc_out.* 键 ⇒ 本判据在测空气（locale 必须先落库）');
  const problems: string[] = [];
  for (const key of keys) {
    const en = locales.en[key];
    const zh = locales.zh[key];
    if (typeof en !== 'string' || typeof zh !== 'string') continue;
    const enPh = [...en.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    const zhPh = new Set([...zh.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
    for (const ph of enPh) {
      if (!zhPh.has(ph)) continue;
      const enAfter = en.slice(en.indexOf('{' + ph + '}') + ph.length + 2).slice(0, 1);
      const zhAfter = zh.slice(zh.indexOf('{' + ph + '}') + ph.length + 2).slice(0, 1);
      if (enAfter === '%' && zhAfter !== '%') {
        problems.push(key + '：en 的「{' + ph + '}」后面是 %，zh 后面是 ' + JSON.stringify(zhAfter) + ' ⇒ 单位丢失');
      }
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

// ── G2：模板表守恒（双向）────────────────────────────────────────────────
test('P168 B3-7 G2：calc_out.* 模板表守恒（引擎声明的 token 集合 == locale 键集合，双向）', () => {
  // ⭐ 检测器自检（2026-11-13 实测修复）：**注释里的 code 不得算「已声明」**。
  //   实测：引擎里写「⛔ 不要写 'calc_out.funnel_step.row.band_' + band」这种注释
  //   ⇒ 提取器把注释里的前缀当成一个 code ⇒ ① locale 里没有它 ⇒ 守卫假红
  //   ② locale 里真正的 4 个键（band_excellent 等）变成死键 ⇒ 死锁方向也被带偏。
  const commented = tokenCodesIn('// calc_out.x.row.band_ 与 calc_out.y.z\nconst a = 1;');
  assert.deepEqual(commented, [], '注释里的 code 被当成「已声明」：' + JSON.stringify(commented));
  const locales = { en: readLocale('en'), zh: readLocale('zh') } as const;
  const declared = new Set<string>();
  for (const file of engineFileBySlug().values()) {
    for (const code of tokenCodesIn(readFileSync(file, 'utf8'))) declared.add(code);
  }
  const problems: string[] = [];
  for (const lang of ['en', 'zh'] as const) {
    const localeKeys = Object.keys(locales[lang]).filter((k) => k.startsWith('calc_out.')).sort();
    // 方向一：引擎吐的每个 token 都必须有 locale 键（否则 zh 页显示裸 token）
    for (const code of [...declared].sort()) {
      if (!localeKeys.includes(code)) {
        problems.push(lang + '：引擎声明了 ' + code + '，但 locale 没有这个键');
      }
    }
    // 方向二：locale 的每个键都必须被引擎声明（否则是死键）
    for (const key of localeKeys) {
      if (!declared.has(key)) {
        problems.push(lang + '：locale 有 ' + key + '，但没有任何引擎声明它（死键）');
      }
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

// ── G2b：'$' 只出现在 token 或金额形态（token 协议不被误用）───────────────
// ⚠️ 口径（实测校准，2026-11-12）：本判据**只**守 token 协议的边界 ——
//   引擎源码里的 '$' + 小写字母**必须**都是 token（$calc_out.…）。
//
// ⭐ 为什么不管 '$' + 非字母（'$$' · '$/unit' · '$10-$25' 里的 '-'）：
//   那三种形态**在协议上完全无害**，理由是两条正则的边界：
//     · token 正则要求 '$' + 小写字母 ⇒ '$' + 数字 / '-' / '/' 都不匹配；
//     · fallback 的截断条件是 '(?!\$[a-z])' ⇒ 也只认 '$' + 小写字母。
//   ⇒ 把它们算进本判据 = 用一个**协议无关**的金额卫生检查冒充协议守卫。
//   ⇒ 而它现在正红在既有内容上（实测 100 个引擎：'$$' 20 处 + '$-' 17 处 + '$/' 8 处，
//     其中 '$$' 是 8 个**非试点**引擎里的双美元号笔误 —— 本批不改非试点引擎）。
//   ⇒ 真正的协议风险只有一个：**非 token 的 '$' + 字母会在英文兜底里截断文本**。
test('P168 B3-7 G2b：引擎源码里的 "$" + 字母 必须都是 token 形态', () => {
  const problems: string[] = [];
  for (const [slug, file] of engineFileBySlug()) {
    const src = readFileSync(file, 'utf8');
    // '$' + 字母：只允许 token 形态（source 级扫描 ⇒ 覆盖 staticExamples 里的字符串字面量）
    for (const m of src.matchAll(/\$([a-z][A-Za-z0-9_]*)/g)) {
      if (m[0].startsWith('$calc_out')) continue;
      problems.push(slug + '：源码里出现 "$' + m[1] + '"（既不是金额也不是 token）');
    }
  }
  assert.deepEqual(problems, [], problems.join(' | '));
});

/**
 * 把一次调用的实参切开（顶层逗号分隔；字符串字面量里的逗号不算）。
 *
 * ⭐ 为什么不用正则：实参常是**拼接表达式**
 *   （'If churn drops ' + pct(x) + ' → ' + pct(y)）⇒ 正则切不准。
 */
function splitCallArgs(text: string, openParen: number): string[] {
  const args: string[] = [];
  let depth = 0;
  let cur = '';
  // ⚠️ 从 openParen **之后**开始扫：若从 openParen 起扫，第一个字符就是 '('
  //   ⇒ depth 永远回不到 0 ⇒ 实参永远切不开（检测器自检实测踩过这个坑）。
  for (let i = openParen + 1; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      // 跳过字符串字面量（处理反斜杠转义）
      cur += ch;
      i++;
      while (i < text.length) {
        cur += text[i];
        if (text[i] === '\\') {
          if (i + 1 < text.length) cur += text[i + 1];
          i += 2;
          continue;
        }
        if (text[i] === ch) break;
        i++;
      }
      continue;
    }
    if (ch === '(' || ch === '{' || ch === '[') { depth++; cur += ch; continue; }
    if (ch === ')' || ch === '}' || ch === ']') {
      if (depth === 0) { args.push(cur); return args; }
      depth--; cur += ch; continue;
    }
    if (ch === ',' && depth === 0) { args.push(cur); cur = ''; continue; }
    cur += ch;
  }
  args.push(cur);
  return args;
}

interface TokenLiteral {
  /** token 的 code（如 calc_out.label.starting_mrr） */
  code: string;
  /** fallback 原文（null = 没有 "|" 分段，或首参不是字面量） */
  fallback: string | null;
  /** 形态：literal = 源码里的 token 字面量；call = tk()/makeToken() 构造器调用 */
  form: 'literal' | 'call';
  /** 兜底段是否以收尾终止符 "|" 收住（2026-11-13 新格式） */
  terminated: boolean;
}

/**
 * 找出 pos 所在的**字符串字面量**边界（开引号 / 闭引号的下标）。
 *
 * ⭐ 为什么需要它：token 的 fallback 只能来自**同一个字符串字面量**。
 *   跨字面量找 '|' 会**凭空捏造** fallback ——
 *   例：const a = '$calc_out.label.x'; const b = 'x | y | z';
 *   ⇒ a 的 fallback 被算成 " y | z" ⇒ CI 假红（复核轮实测）。
 */
function enclosingLiteral(src: string, pos: number): { start: number; end: number } | null {
  const QUOTES = "'\"`";
  let i = pos - 1;
  while (i >= 0) {
    const c = src[i];
    if (c === '\\') { i -= 2; continue; }
    if (QUOTES.includes(c)) break;
    i--;
  }
  if (i < 0) return null;
  const q = src[i];
  let j = i + 1;
  while (j < src.length) {
    const c = src[j];
    if (c === '\\') { j += 2; continue; }
    if (c === q) return { start: i, end: j };
    j++;
  }
  return null;
}

/**
 * 抽出源码里出现的 token 字面量（两种写法都要认）：
 *   ① '$calc_out.label.starting_mrr|Starting MRR'      —— 直接字面量
 *   ② tk('calc_out.label.starting_mrr', 'Starting MRR') —— 构造器调用
 *
 * ⭐ code 用**宽松**正则取（字母/数字/下划线/点都吃）
 *   ⇒ 畸形 code（大写、退化裸 '$calc_out'）也会被抽出来 ⇒ 由 G2c 判它违规。
 */
function tokenLiteralsIn(text: string): TokenLiteral[] {
  const out: TokenLiteral[] = [];
  // ⭐ 先剥注释：注释里写的 $calc_out 不是输出 ⇒ 不该被当成 token 字面量
  const src = stripComments(text);

  // ① 直接字面量：$code [params] [| fallback]
  //   ⭐ 只认 calc_out 命名空间：引擎里确实有 $X / $Y / $Z 这类**变量名**
  //     （实测 13 处）⇒ 不设这道闸会把它们全当 token ⇒ 假红。
  const lit = /\$([A-Za-z_][A-Za-z0-9_.]*)/g;
  let m: RegExpExecArray | null;
  while ((m = lit.exec(src)) !== null) {
    const code = m[1];
    if (!code.toLowerCase().startsWith('calc_out')) continue;
    let after = m.index + m[0].length;
    // 跳过可选的 params JSON（协议保证值里没有花括号 ⇒ 第一个 '}' 就是它的结尾）
    if (src[after] === '{') {
      const close = src.indexOf('}', after);
      if (close >= 0) after = close + 1;
    }
    // ⭐ fallback 只能落在**同一个字符串字面量内** —— 否则「本 token 没有 fallback，
    //   但文件后面有个 |」会被凭空捏造出 fallback ⇒ CI 假红（复核轮实测）。
    const encl = enclosingLiteral(src, m.index);
    const limit = encl ? encl.end : -1;
    const pipe = src.indexOf('|', after);
    if (pipe < 0 || (limit >= 0 && pipe > limit)) { out.push({ code, fallback: null, form: 'literal', terminated: true }); continue; }
    // ⭐ 2026-11-13 新格式：兜底段以**收尾的 |** 结束 ⇒ 第二个 | 就是兜底结尾。
    //   没有第二个 | ⇒ 这是**旧格式**（兜底一路吃到行尾）⇒ terminated=false，由 G2c 报错。
    const pipe2 = src.indexOf('|', pipe + 1);
    if (pipe2 < 0 || (limit >= 0 && pipe2 > limit)) {
      out.push({ code, fallback: null, form: 'literal', terminated: false });
      continue;
    }
    out.push({ code, fallback: src.slice(pipe + 1, pipe2), form: 'literal', terminated: true });
  }

  // ② 构造器调用
  const call = /\b(?:tk|tok|makeToken)\s*\(/g;
  while ((m = call.exec(src)) !== null) {
    const openParen = m.index + m[0].length - 1;
    const args = splitCallArgs(src, openParen);
    const rawCode = (args[0] ?? '').trim();
    const litCode = /^(['"])([\s\S]*)\1$/.exec(rawCode);
    if (!litCode) continue;             // 首参不是字面量 ⇒ 静态判不了 ⇒ 跳过
    out.push({ code: litCode[2], fallback: args[1] === undefined ? null : args[1], form: 'call', terminated: true });
  }
  return out;
}

// ── G2c：token 字面量符合协议（code 形态 + fallback 不含半角 "|"）────────
test('P168 B3-7 G2c：引擎里的 token 字面量符合协议（code 形态合法、fallback 不含半角 "|"）', () => {
  const CODE_RE = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/;
  const problems: string[] = [];
  let seen = 0;
  for (const [slug, file] of engineFileBySlug()) {
    const src = readFileSync(file, 'utf8');
    for (const lit of tokenLiteralsIn(src)) {
      seen += 1;
      if (!CODE_RE.test(lit.code)) {
        problems.push(slug + '：token code 形态非法：' + lit.code);
      }
      if (lit.fallback !== null && lit.fallback.includes('|')) {
        problems.push(slug + '：token fallback 里有半角 "|"：' + lit.code);
      }
      // ⭐ 2026-11-13 新格式：token 字面量必须是 $code|兜底|（**兜底以收尾终止符 | 收住**）
      //   旧格式（$code|兜底，兜底一路吃到行尾）⇒ 兜底会吞掉后面的文本 ⇒ 页面丢值。
      if (lit.form === 'literal' && !lit.terminated) {
        problems.push(slug + '：token 字面量没有收尾终止符 "|"（新格式要求 $code|兜底|）：' + lit.code);
      }
    }
  }
  // ⭐ 检测器自检：造一个已知违规样本，断言检测器看得见它
  //   （「检查违规」的断言在没有违规时本来就绿 ⇒ 必须证明检测器本身有效）
  const bad = tokenLiteralsIn("const x = tk('calc_out.Bad_Code', 'A | B');");
  assert.equal(bad.length, 1, '检测器没认出构造器调用');
  assert.ok(!CODE_RE.test(bad[0].code), '检测器没认出非法 code');
  assert.ok((bad[0].fallback || '').includes('|'), '检测器没认出 fallback 里的半角竖线');
  // ⭐ 检测器自检 2：**没有 fallback 的 token 字面量**不得把文件后面的竖线当成自己的 fallback
  const noFb = tokenLiteralsIn("const a = '$calc_out.label.x';\nconst b = 'x | y | z';");
  assert.equal(noFb.length, 1, '检测器没认出字面量：' + JSON.stringify(noFb));
  assert.equal(noFb[0].fallback, null, '凭空捏造了 fallback：' + JSON.stringify(noFb[0]));
  // ⭐ 检测器自检 3：**旧格式**（兜底没有收尾终止符）必须被认出来
  const unterminated = tokenLiteralsIn("const x = '$calc_out.label.a|Fallback';");
  assert.equal(unterminated.length, 1, '检测器没认出字面量：' + JSON.stringify(unterminated));
  assert.equal(unterminated[0].terminated, false, '检测器没认出未收尾的 token 字面量');
  const terminated = tokenLiteralsIn("const x = '$calc_out.label.a|Fallback|';");
  assert.equal(terminated.length, 1, '检测器没认出字面量：' + JSON.stringify(terminated));
  assert.equal(terminated[0].terminated, true, '检测器没认出已收尾的 token 字面量');
  assert.equal(terminated[0].fallback, 'Fallback', '兜底提取错了：' + JSON.stringify(terminated[0]));
  assert.deepEqual(problems, [], problems.join(' | ') + '（共检查 ' + seen + ' 个 token 字面量）');
});

// ── G3：两份实现（calculate / customFn）声明的 token 集合一致 ────────────
/** B3-7 的 10 个试点引擎 —— 「非真空绿」判据只对它们生效 */
const PILOT_SLUGS = new Set([
  'solopreneur-mrr-calculator',
  'solopreneur-rent-vs-buy-calculator',
  'solopreneur-brrrr-calculator',
  'solopreneur-project-profitability-calculator',
  'solopreneur-coupon-attribution-calculator',
  'solopreneur-saas-valuation-calculator',
  'solopreneur-acv-calculator',
  'solopreneur-funnel-step-calculator',
  'solopreneur-activation-rate-calculator',
  'solopreneur-stickiness-calculator',
]);

test('P168 B3-7 G3：customFn 声明的 token 集合 == calculate() 声明的 token 集合', () => {
  // ⭐ 检测器自检（2026-11-13）：造一个「服务端实现在 engine 对象里」的假引擎。
  //   旧口径（服务端区 = customFn 声明之前）会**漏掉**它 ⇒ 必须证明新口径看得见。
  const fake = [
    "const customFn = \"tk('calc_out.x.row.a','A')\";",
    "const engine = { generate() { return ['$calc_out.x.row.b|B|']; } };",
  ].join(String.fromCharCode(10));
  const fr = splitEngineRegions(fake);
  assert.ok(fr, '检测器没切出区域');
  assert.deepEqual(tokenCodesIn(fr.client), ['calc_out.x.row.a'], '客户端区只应含 customFn 里的 token');
  assert.deepEqual(tokenCodesIn(fr.server), ['calc_out.x.row.b'], '服务端区必须含 engine 对象里 generate() 的 token');

  const problems: string[] = [];
  let checked = 0;
  for (const [slug, file] of engineFileBySlug()) {
    const regions = splitEngineRegions(readFileSync(file, 'utf8'));
    if (!regions) continue;   // 非 custom 引擎（没有客户端实现）⇒ 本判据不适用
    checked += 1;
    const server = tokenCodesIn(regions.server);
    const client = tokenCodesIn(regions.client);
    if (JSON.stringify(server) !== JSON.stringify(client)) {
      problems.push(slug + '：服务端 ' + JSON.stringify(server) + ' vs 客户端 ' + JSON.stringify(client));
    }
    // ⭐ 非真空绿：试点引擎的两边**必须都非空** —— 两边都空时「集合相等」是假象
    //   （空集 == 空集）⇒ 引擎根本没 token 化也会假装通过。
    if (PILOT_SLUGS.has(slug) && (server.length === 0 || client.length === 0)) {
      problems.push(slug + '：token 集合有一边是空的（服务端 ' + server.length + ' / 客户端 ' + client.length + '）⇒ 该引擎还没 token 化');
    }
  }
  assert.ok(checked >= 10, '只检查到 ' + checked + ' 个 custom 引擎（期望 ≥ 10）');
  assert.deepEqual(problems, [], problems.join(' | '));
});

// ── G7：token 的 fallback 不跨行（2026-11-12 实测修复的回归测试）────────
// ⚠️ 这条断言的存在理由：project_profitability 清点 agent 报出**核心模块级缺陷**——
//   fallback 捕获组原为 `[^|]` ⇒ 贪心且**不认换行**
//   ⇒ 实测 `$calc_out.label.x|A\nB\nC` 的 fallback 捕获成 "A\nB\nC"
//   ⇒ ① 缺 locale 键时英文兜底**吞掉后面整段文本**（用户看到大段英文且内容丢失）；
//      ② beautifySections 靠 fallback 里的英文识别区块 ⇒ 跨行吞并会让卡片**区块识别错位**。
//   ⇒ 修法：字符类改成 `[^|\n\r]`。
test('P168 B3-7 G7：token 兜底以收尾终止符界定（不得吞掉后续文本）', () => {
  const NL = String.fromCharCode(10);
  // ① 兜底内容 = 两个 | 之间
  const one = '$calc_out.label.x|A|';
  const m = new RegExp(CALC_OUTPUT_TOKEN_RE.source, 'g').exec(one);
  assert.ok(m, '没匹配到 token');
  assert.equal(m[3], 'A', '兜底内容不对：' + JSON.stringify(m[3]));

  // ② ⭐ 新格式的核心能力：兜底后可以跟任意文本，**不会被吞进去**
  const two = '$calc_out.label.x|Starting MRR|: $12,000';
  const m2 = new RegExp(CALC_OUTPUT_TOKEN_RE.source, 'g').exec(two);
  assert.equal(m2?.[3], 'Starting MRR', '兜底吞掉了后面的文本：' + JSON.stringify(m2?.[3]));

  // ③ 渲染层：缺 locale 键 ⇒ 降级到兜底，**后面的文本原样保留**
  const rendered = renderCalcOutput(two, {});
  assert.equal(rendered, 'Starting MRR: $12,000', '缺键时文本被吞：' + JSON.stringify(rendered));

  // ④ 有键时用模板，后面的文本同样原样保留
  const rendered2 = renderCalcOutput(two, { 'calc_out.label.x': '起始 MRR' });
  assert.equal(rendered2, '起始 MRR: $12,000', '模板替换吃掉了后面的文本：' + JSON.stringify(rendered2));

  // ⑤ 旧格式（兜底没有收尾终止符）**不再被当成带兜底的 token** ⇒ 不会被贪心吞整行
  const old = '$calc_out.label.x|A' + NL + 'B' + NL + 'C';
  const mo = new RegExp(CALC_OUTPUT_TOKEN_RE.source, 'g').exec(old);
  assert.equal(mo?.[3], undefined, '旧格式仍被识别成带兜底的 token');

  // ⑥ 检测器自检：旧正则会把整行吞进兜底；新正则拒绝旧写法 ⇒ 证明这条断言不是恒绿
  //   （OLD_RE_SRC = **旧格式**的正则源码：兜底段是 (?:(?!\$[a-z])[^|])* ⇒ 吃到行尾、贪心）
  const OLD_RE_SRC = /\$([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)(\{[^{}]*\})?(?:\|((?:(?!\$[a-z])[^|])*))?/g;
  const greedy = '$calc_out.label.x|Starting MRR: $12,000';
  const oldM = new RegExp(OLD_RE_SRC, 'g').exec(greedy);
  assert.equal(oldM?.[3], 'Starting MRR: $12,000', '旧正则的兜底不是整行（自检样本失效）');
  const newM = new RegExp(CALC_OUTPUT_TOKEN_RE.source, 'g').exec(greedy);
  assert.equal(newM?.[3], undefined, '新格式仍认旧写法 ⇒ 终止符没生效');
});
  // （旧的 G7 断言块已按新格式重写于上方）
test('P168 B3-7 G11：tip 行标记必须语言无关（zh 的 translateCalcOutput 会改写标记）', () => {
  // ⭐ 守的是 2026-11-13 实测踩到的坑：zh 页 translateCalcOutput 把「💡 Tip:」
  //   改写成「💡 提示:」⇒ 只认英文标记的过滤器在 zh 上失配 ⇒ zh 卡片多出一条
  //   en 没有的 tip 行（实测 16 页），且 SSR 与客户端 beautify 结构不一致。
  assert.ok(CALC_OUTPUT_TIP_MARKERS.length >= 3, 'tip 标记清单不能被清空（否则过滤恒失效）');
  for (const marker of ['💡 Tip:', '💡 提示:', '💡 提示：']) {
    assert.ok(CALC_OUTPUT_TIP_MARKERS.includes(marker), '缺 tip 标记：' + marker);
    assert.equal(isCalcOutputTipLine('x ' + marker + ' body'), true, '没认出 tip 行：' + marker);
  }
  // 非 tip 行不得被误杀
  assert.equal(isCalcOutputTipLine('• ARR（×12）: $174,000.00'), false);
  assert.equal(isCalcOutputTipLine(''), false);
});

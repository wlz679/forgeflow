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
  extractEngineTokenCodes,
  CALC_OUTPUT_TIP_MARKERS,
  isCalcOutputTipLine,
} from '../src/lib/calc-output-i18n.ts';
// P168 B3-7 G12：注入子集必须等于**引擎实际吐的 code 集合**⇒ 需要引擎对象本身。
import '../src/engines/index.ts';
import { getEngine } from '../src/core/engines/registry.ts';
import {
  infoUnits,
  readLocale,
  MIN_ZH_TO_EN_RATIO,
  hasNaturalLanguage,
  ROOT,
} from './_decision-support-fixture.ts';
import { stripComments } from './build-dep-suites.mjs';
// P168 B3-8：「已令牌化引擎清单」的**单一真相源**（试点 10 + 本批 15 = 25）
import { TOKENIZED } from './scripts/p168-tokenized-engines.mjs';
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
  const mrrCodes = extractEngineTokenCodes(getEngine('solopreneur-mrr-calculator')!);
  const tpls = calcOutputTemplates('zh', 'mrr', mrrCodes);
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
  const json = calcOutputTemplatesJson('zh', 'mrr', mrrCodes);
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
    // ⚠️ P168 B3-9：只有**含自然语言**的值才受下面两条判据约束。
    //   纯数值片段（`{rev}/mo`）、公式（`  = LTV ÷ CAC`）、行业缩写（`AOV`/`GPU`/`ROI`）
    //   的 zh 与 en 逐字相同是**正确的**（没有可翻的自然语言）⇒ 对它们套判据 = 假红。
    //   实测：新增 675 键里 13 个属此类；既有 1012 键里 0 个。
    if (!hasNaturalLanguage(en)) continue;
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
    // ⚠️ 扫描面 = **服务端区域**（生成区要排除）—— P168 B3-10 起，客户端 customFn 是
    //   服务端代码的**生成副本**（scripts/customfn-port.ts 产出，带 FFK-SERVER-DERIVED 标记）
    //   ⇒ ① 扫它是**重复**（服务端那份已经扫过）；
    //   ② 压缩器的**改名**会在副本里造出 `$t` 之类的**标识符**
    //      ⇒ 被本判据误当成「$ + 字母」⇒ 假红（实测 cart-abandonment / quota-attainment）。
    const scan = src.replace(/FFK-SERVER-DERIVED:start[\s\S]*?FFK-SERVER-DERIVED:end/g, '');
    // '$' + 字母：只允许 token 形态（source 级扫描 ⇒ 覆盖 staticExamples 里的字符串字面量）
    for (const m of scan.matchAll(/\$([a-z][A-Za-z0-9_]*)/g)) {
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
/** 从 open 处找同款引号的**配对闭引号**（处理反斜杠转义）；找不到返回 -1 */
function findClosingQuote(src: string, open: number, quote: string): number {
  let j = open + 1;
  while (j < src.length) {
    if (src[j] === '\\') { j += 2; continue; }
    if (src[j] === quote) return j;
    j++;
  }
  return -1;
}

function enclosingLiteral(src: string, pos: number): { start: number; end: number } | null {
  const QUOTES = "'\"`";
  let i = pos - 1;
  while (i >= 0) {
    const c = src[i];
    if (c === '\\') { i -= 2; continue; }
    if (QUOTES.includes(c)) {
      const j = findClosingQuote(src, i, c);
      if (j < 0) return null;
      // ⭐ 只有当 pos **落在**这个引号区间里，它才是本 token 所属字面量的配对开引号
      //   （否则这个引号是「字面量内部嵌着的另一种引号」⇒ 继续往前找）
      if (pos > i && pos <= j) return { start: i, end: j };
      i--;
      continue;
    }
    i--;
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
  // ⭐ 2026-11-16：字面量边界按**配对**算（不是「最近的引号」）
  //   旧实现往前找最近的引号 ⇒ 字面量**内部**含另一种引号时找错边界：
  //     · staticExamples 里的 \"stuck\" ⇒ 把 fallback 的收尾 | 判到边界外 ⇒ 误报「没有收尾终止符」；
  //     · makeToken 双引号实参里的 you're ⇒ 同理。
  //   ⭐ 用「向前找候选 + 验证 pos 落在区间内」而不是全局扫描表：
  //     全局扫描会被**正则字面量**里的引号带偏（实测 coupon_attribution 的 3 个 health_* 误报）。

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
    //
    // ⭐ 2026-11-16：判「收尾 |」改用**行级**（协议规定 fallback 不跨行）
    //   理由：字面量边界在「字面量内部含另一种引号」时可能算不准
    //   （实测：staticExamples 里的 \"stuck\"、makeToken 双引号实参里的 you're）
    //   ⇒ 拿边界判「收尾 | 在不在界内」会假红。
    //   行级判据是协议自带的（fallback 不跨行）⇒ 不依赖边界算得准不准。
    const pipe2 = src.indexOf('|', pipe + 1);
    const lineEnd = src.indexOf('\n', pipe);
    if (pipe2 < 0 || (lineEnd >= 0 && pipe2 > lineEnd)) {
      out.push({ code, fallback: null, form: 'literal', terminated: false });
      continue;
    }
    // 收尾 | 也必须落在同一个字面量内（防跨字面量捏造）
    if (limit >= 0 && pipe2 > limit) { out.push({ code, fallback: null, form: 'literal', terminated: true }); continue; }
    out.push({ code, fallback: src.slice(pipe + 1, pipe2), form: 'literal', terminated: true });
  }

  // ② 构造器调用
  const call = /\b(?:tk|tok|makeToken)\s*\(/g;
  while ((m = call.exec(src)) !== null) {
    // ⭐ 2026-11-16：跳过**位于 TS 字符串内部**的调用（客户端 customFn 就是这种）
    //   原因：customFn 是**一段 JS 源码字符串**，它的转义层级与 TS 文件不同
    //   （TS 层的 \\\\ 是「一个字面反斜杠」，JS 层才组成 \\'）
    //   ⇒ 按 TS 文件字符流切实参会切错（实测：fallback 被切到几十行之后，把后面的 | 也吃进来）
    //   ⇒ 假红「fallback 里有半角 |」。
    //   ⚠️ 漏检风险可控：customFn 的 fallback 与服务端**逐字相同**（G6 守恒）
    //     ⇒ 服务端那一侧照样会被形态①/形态② 抓到。
    if (enclosingLiteral(src, m.index) !== null) continue;
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
  // ⭐ 检测器自检 4：**字面量内部含另一种引号**时，边界必须仍然配对
  //   （2026-11-16 实测：staticExamples 里的 \"stuck\" 曾让 fallback 的收尾 | 判到边界外 ⇒ 假红）
  const mixed = tokenLiteralsIn('const s = \'$calc_out.label.a|Fallback with "quoted" text|\';');
  assert.equal(mixed.length, 1, '检测器没认出字面量：' + JSON.stringify(mixed));
  assert.equal(mixed[0].terminated, true, '检测器没认出已收尾的 token 字面量');
  assert.equal(mixed[0].fallback, 'Fallback with "quoted" text', '兜底提取错了：' + JSON.stringify(mixed[0]));
  assert.deepEqual(problems, [], problems.join(' | ') + '（共检查 ' + seen + ' 个 token 字面量）');
});

// ── G3：两份实现（calculate / customFn）声明的 token 集合一致 ────────────
/** P168 B3-8：已令牌化的引擎（B3-7 试点 10 + 本批 15 = 25）—— 真相源在 p168-tokenized-engines.mjs */
const PILOT_SLUGS = new Set(TOKENIZED.map((e) => e.slug));

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

// ── G12：注入子集 == 本引擎**实际会吐**的 code 集合 ───────────────────────
// ⭐ 为什么要有这条（2026-11-13 实测）
//   原实现把**全仓 184 条共享键 + 本工具行码**全部注入每个页面
//   ⇒ rent_vs_buy 页面 **209 KB > 200 KB 阈值**（page-size 守卫红）。
//   ⇒ 裁剪到「本引擎实际吐的 code」后：mrr 238→89 条 / rent_vs_buy 210→46 条。
//
// ⭐ 双向严格：少一个 ⇒ 客户端渲出裸 token；多一个 ⇒ 页面带不用的模板。
test('P168 B3-7 G12：注入的模板子集必须恰好等于本引擎声明的 code 集合（且 en/zh 都有值）', () => {
  const locales = { en: readLocale('en'), zh: readLocale('zh') } as const;
  const totalCalcOut = Object.keys(locales.en).filter((k) => k.startsWith('calc_out.')).length;
  const problems: string[] = [];
  let checked = 0;
  for (const slug of PILOT_SLUGS) {
    const engine = getEngine(slug);
    if (!engine) { problems.push(slug + '：引擎没注册'); continue; }
    const codes = extractEngineTokenCodes(engine);
    // ⭐ 防真空绿：提取器坏了就是空集 ⇒ 下面的「完全相等」会虚绿
    if (codes.length === 0) { problems.push(slug + '：提取到的 code 数为 0（提取器坏了？）'); continue; }
    checked++;
    const alias = toolAlias(slug);
    for (const lang of ['en', 'zh'] as const) {
      const tpls = calcOutputTemplates(lang, alias, codes);
      const got = Object.keys(tpls).sort();
      const want = [...codes].sort();
      const missing = want.filter((c) => !got.includes(c));
      const extra = got.filter((c) => !want.includes(c));
      if (missing.length) problems.push(lang + '/' + alias + '：注入表少了 ' + missing.join(', '));
      if (extra.length) problems.push(lang + '/' + alias + '：注入表多了 ' + extra.join(', '));
      for (const c of codes) {
        if (typeof locales.en[c] !== 'string') problems.push(lang + '/' + alias + '：' + c + ' 在 en.json 缺值');
        if (typeof locales.zh[c] !== 'string') problems.push(lang + '/' + alias + '：' + c + ' 在 zh.json 缺值');
      }
      // ⭐ 非真空绿：裁剪必须**真的在生效**（否则裁剪失效一样绿）
      if (got.length >= totalCalcOut) {
        problems.push(lang + '/' + alias + '：注入 ' + got.length + ' 条 ≥ 全仓 calc_out.* 的 ' + totalCalcOut + ' 条 ⇒ 裁剪没生效');
      }
    }
  }
  assert.ok(checked === PILOT_SLUGS.size, '试点没测全：' + checked + '/' + PILOT_SLUGS.size);
  assert.deepEqual(problems, [], problems.join(' | '));
});

// ── G12b：页面接线必须把 code 集合传给模板函数 ─────────────────────
// ⭐ 为什么还要一条源码级断言：G12 只能证明「函数能裁剪」，
//   证不了「页面确实调用它」⇒ 页面会默默使用旧的全量路径。
test('P168 B3-7 G12b：页面必须把「引擎声明的 code 集合」传给模板函数', () => {
  assert.match(astroSrc, /extractEngineTokenCodes\(engine\)/, '页面没有算引擎声明的 code 集合');
  assert.match(astroSrc, /calcOutputTemplates\(pageLang, calcOutAlias, calcOutCodes\)/, '页面没有把 code 集合传给模板函数');
});

// ═══ P168 B3-17：客户端动态卡片的**结构不变式**（源码级 · 零浏览器成本）═══
//
// ⚠️ 为什么要有这一段（2026-11-26 实测背景，缺陷已闭环但**没有第二道防线**）：
//   ① 服务端 src/components/ResultCard.astro 用 hideIndex={engine.clientConfig.type === 'custom'}
//      决定卡片形态（<h3> 标题 + .font-mono 正文，**无折叠区**）；
//   ② 客户端 submit handler 以前**先**判「文本里有没有 ' → ' 和 ' | '」⇒ 命中就渲染
//      analysis-card（标题 + 「查看详情」折叠，正文全塞进折叠区），**后**判 custom 分支
//      ⇒ **custom 引擎被劫持**：用户点「计算」后动态卡片只剩 3 行，正文藏在折叠区里。
//   ③ 实测：100/100 个引擎的 clientConfig.type 都是 'custom'（src/engines/** 全扫，0 个非 custom）
//      ⇒ 那个 analysis-card 分支会劫持**任何输出同时含 ' → ' 和 ' | ' 的引擎**。
//      控制器在 HEAD(06a7ae5) 上静态扫 dist/zh/*/index.html 的 data-calc-output-raw
//      ⇒ 24/100 个页面命中。
//   ④ ⭐ 浏览器守卫 tests/scripts/p168-browser-verify.ts 的动态清单**已扩到 34 个 slug**
//      （覆盖全部 24 个受害引擎）⇒ 但浏览器守卫**不在 CI 里**
//      ⇒ 源码层补这一道顺序不变式：零浏览器成本、覆盖 100/100 引擎、**进 CI**。
//
// ⭐ 判据**语言无关**：只断言**结构**（谁在前），
//   不硬编码任何 slug 清单 / 引擎数量（那是浏览器层的事，源码层管不着）。

/**
 * 客户端「custom 卡片分支」与「analysis-card 分支」的判别式。
 *
 * ⚠️ 为什么不用朴素 indexOf（2026-11-26 实测踩到的坑）：
 *   src/pages/[lang]/[slug].astro 的**注释里**就写着这两个条件
 *   （「⚠️ 以前这里先判『文本里有没有 ' → ' 和 ' | '』」）⇒ 朴素 indexOf 会取到
 *   **注释里**的位置 ⇒ 判据整体错位（实测：注释在 2218 行 / 真代码在 2239 行
 *   ⇒ 朴素口径会把正确顺序误判成「custom 在后」）。
 *   ⇒ 统一用仓库现成的 stripComments（tests/build-dep-suites.mjs）先抹注释再定位。
 *   ⚠️ stripComments 是**整段删除**（不是替换成等长空白）⇒ 不能拿 strip 后的偏移
 *   映射回原文；但**相对顺序**不受影响（只删除、不重排）⇒ 顺序判据成立。
 *   ⭐ stripComments 逐字保留字符串字面量 ⇒ 实测 ' → ' / ' | ' 在 strip 后仍可被找到。
 */
const CUSTOM_CARD_BRANCH_RE =
  /if\s*\(\s*config\.type\s*===\s*['"]custom['"]\s*&&\s*results\.length\s*===\s*1\s*\)/;
const ANALYSIS_CARD_BRANCH_RE =
  /r\.indexOf\(\s*['"]\s*→\s*['"]\s*\)\s*>\s*-1\s*&&\s*r\.indexOf\(\s*['"]\s*\|\s*['"]\s*\)\s*>\s*-1/;

interface BranchOrder {
  /** 判据是否通过 */
  ok: boolean;
  /** 不通过的原因（中文，直接可读） */
  reason: string;
  /** custom 分支在 **strip 后**文本里的位置（-1 = 没找到） */
  customAt: number;
  /** analysis-card 分支在 **strip 后**文本里的位置（-1 = 没找到） */
  analysisAt: number;
  /** 剥掉注释后的源码（供调用方做行号 / 作用域定位） */
  code: string;
}

/**
 * 定位客户端的两个卡片分支并判断**相对顺序**。
 * ⚠️ 找不到分支 ⇒ 判红（不得空转）：将来有人删掉分支时，这条断言必须报警。
 */
function locateClientCardBranches(src: string): BranchOrder {
  const code = stripComments(src);
  const customAt = CUSTOM_CARD_BRANCH_RE.exec(code)?.index ?? -1;
  const analysisAt = ANALYSIS_CARD_BRANCH_RE.exec(code)?.index ?? -1;
  if (customAt < 0) {
    return {
      ok: false,
      reason: "页面里找不到 custom 卡片分支（config.type === 'custom' && results.length === 1）",
      customAt,
      analysisAt,
      code,
    };
  }
  if (analysisAt < 0) {
    return {
      ok: false,
      reason: "页面里找不到 analysis-card 分支（r.indexOf(' → ') > -1 && r.indexOf(' | ') > -1）",
      customAt,
      analysisAt,
      code,
    };
  }
  if (customAt > analysisAt) {
    return {
      ok: false,
      reason:
        "custom 卡片分支排在了 analysis-card 分支之后 ⇒ 输出同时含 ' → ' 与 ' | ' 的 custom 引擎会被劫持成折叠卡片",
      customAt,
      analysisAt,
      code,
    };
  }
  return { ok: true, reason: 'custom 分支在前', customAt, analysisAt, code };
}

/** 位置 → 行号（1 起） */
function lineOf(text: string, pos: number): number {
  return text.slice(0, pos).split('\n').length;
}

// ── 断言 1：custom 卡片分支必须排在 analysis-card 分支之前 ────────────────
test('P168 B3-17 顺序不变式：custom 卡片分支必须排在 analysis-card 分支之前（否则 custom 引擎被劫持）', () => {
  const r = locateClientCardBranches(astroSrc);
  assert.ok(r.ok, r.reason);
  // ⭐ 两个分支都必须落在**客户端脚本块**里（不是服务端代码、不是模板文案）
  const scriptStart = r.code.indexOf('define:vars');
  assert.ok(scriptStart > 0, '页面里找不到客户端脚本注入块（define:vars）');
  const scriptEnd = r.code.indexOf('</script>', scriptStart);
  assert.ok(scriptEnd > scriptStart, '客户端脚本块没有正常闭合');
  assert.ok(
    r.customAt > scriptStart && r.customAt < scriptEnd,
    'custom 分支不在客户端脚本块里（strip 后第 ' + lineOf(r.code, r.customAt) + ' 行）',
  );
  assert.ok(
    r.analysisAt > scriptStart && r.analysisAt < scriptEnd,
    'analysis-card 分支不在客户端脚本块里（strip 后第 ' + lineOf(r.code, r.analysisAt) + ' 行）',
  );

  // ⭐ 检测器自检 1：把两个分支**写反**的样本必须被判红
  //   （仓库纪律：检查违规的断言在没有违规时本来就绿 ⇒ 必须证明检测器本身有效）
  const SAMPLE_CUSTOM = "if (config.type === 'custom' && results.length === 1) { html += 'v3'; }";
  const SAMPLE_ANALYSIS = "if (r.indexOf(' → ') > -1 && r.indexOf(' | ') > -1) { html += 'analysis'; }";
  const swapped = locateClientCardBranches([SAMPLE_ANALYSIS, SAMPLE_CUSTOM].join('\n'));
  assert.equal(swapped.ok, false, "检测器没认出「analysis-card 在前」的样本（这条断言是恒绿？）");
  assert.ok(swapped.reason.includes('排在了'), '检测器没给出顺序错误的原因：' + swapped.reason);
  const good = locateClientCardBranches([SAMPLE_CUSTOM, SAMPLE_ANALYSIS].join('\n'));
  assert.equal(good.ok, true, '检测器把正确的顺序判成了红：' + good.reason);

  // ⭐ 检测器自检 2：**注释里**提到 analysis 条件，不得被当成代码位置
  //   （这正是朴素 indexOf 会踩的坑：注释在 2218 行、真代码在 2239 行）
  const withComment = locateClientCardBranches(
    [
      "// ⚠️ 旧代码先判 r.indexOf(' → ') > -1 && r.indexOf(' | ') > -1 ⇒ 劫持 custom 引擎",
      SAMPLE_CUSTOM,
      SAMPLE_ANALYSIS,
    ].join('\n'),
  );
  assert.equal(withComment.ok, true, '注释里的字串被当成了代码位置：' + withComment.reason);

  // ⭐ 检测器自检 3：analysis 分支**只出现在注释里** ⇒ 必须报「找不到分支」（不得静默通过）
  const onlyComment = locateClientCardBranches(
    ['// r.indexOf(' + "' → '" + ') > -1 && r.indexOf(' + "' | '" + ') > -1', SAMPLE_CUSTOM].join('\n'),
  );
  assert.equal(onlyComment.ok, false, '注释里的 analysis-card 分支被当成了真代码');
  assert.ok(onlyComment.reason.includes('找不到'), '检测器没报「找不到分支」：' + onlyComment.reason);
});

/**
 * 找出代码里内联的 **tip 标记字面量**（= 第二份标记清单）。
 * ⭐ 口径收窄（2026-11-26 实测）：只认「emoji + Tip/提示」的**标记文本**形态。
 *   页面里**合法**存在裸 '💡' 字面量 —— v3 区块图标映射 'Tip': '💡'、
 *   iconRegex /[🩺📊🔄⚖️🎯💡]/u、表格行首 emoji 检测 indexOf('💡')
 *   ⇒ 它们判的是**区块图标**，不是 tip 标记文本 ⇒ 不能一刀切禁掉裸 emoji。
 */
function inlineTipMarkers(code: string): string[] {
  const out: string[] = [];
  for (const m of code.matchAll(/['"][^'"\n]*💡\s*(?:Tip|提示)[^'"\n]*['"]/g)) out.push(m[0]);
  return out;
}

// ── 断言 2：客户端必须用**共享**的 tip 判定实现 ──────────────────────────
test('P168 B3-17 共享 tip 判定：客户端必须用 CALC_OUTPUT_IS_TIP_LINE_JS（不得内联第二份标记清单）', () => {
  const code = stripComments(astroSrc);
  // ① 必须注入并求值共享实现（页面是 .astro ⇒ 不能 import ⇒ 靠 define:vars 注入源码字符串）
  assert.match(astroSrc, /CALC_OUTPUT_IS_TIP_LINE_JS/, '页面没有引用共享的 tip 判定实现');
  assert.match(code, /new Function\([^)]*CALC_OUTPUT_IS_TIP_LINE_JS/, '客户端没有求值共享的 tip 判定实现');
  // ② 客户端必须真的用这个判定（而不是另写一份过滤）
  assert.match(code, /isCalcOutputTipLine/, '客户端没有调用共享的 tip 判定函数');
  // ③ 不得内联第二份标记清单（⭐ 口径见 inlineTipMarkers 的注释）
  const inlined = inlineTipMarkers(code);
  assert.deepEqual(inlined, [], '客户端内联了 tip 标记字面量（第二份标记清单）：' + inlined.join(' | '));

  // ⭐ 检测器自检：造一份**内联过滤**的样本 ⇒ 检测器必须看得见它
  const inlineSample =
    "var stripped = r.indexOf('💡 Tip:') > -1 ? r : r.split('\\n').filter(function(l) { return !isCalcOutputTipLine(l); }).join('\\n');";
  assert.deepEqual(inlineTipMarkers(inlineSample).length, 1, '检测器没认出内联的 tip 标记字面量');
  // ⭐ 检测器自检 2：走共享实现的样本 ⇒ 检测器不得误报
  const sharedSample =
    "var stripped = preserveTip ? r : r.split('\\n').filter(function(l) { return !isCalcOutputTipLine(l); }).join('\\n');";
  assert.deepEqual(inlineTipMarkers(sharedSample), [], '检测器把共享实现误判成内联标记');
  // ⭐ 检测器自检 3：裸 emoji（区块图标）**不得**被误判成标记清单
  const iconSample = "var icons = { 'Tip': '💡', 'Milestone': '🎯' }; var re = /[🩺💡]/u;";
  assert.deepEqual(inlineTipMarkers(iconSample), [], '检测器把区块图标误判成 tip 标记清单');
});

// ── 断言 3：客户端 tip 保留条件必须与服务端**真实行为**一致 ───────────────
/** 客户端的 preserveTip 定义表达式（只认 var/let/const 赋值 ⇒ 不吃服务端 JSX 的同名 prop） */
function clientPreserveTipExpr(code: string): string | null {
  const m = /(?:var|let|const)\s+preserveTip\s*=\s*([^;\n]+)/.exec(code);
  return m ? m[1].trim() : null;
}

/** 判定客户端的 preserveTip 条件是否与服务端真实行为一致 */
function preserveTipConditionOk(expr: string | null): { ok: boolean; reason: string } {
  if (expr === null) return { ok: false, reason: '客户端没有 preserveTip 定义' };
  if (!/bizConfigKey\s*===\s*['"]BIZ_V3['"]/.test(expr)) {
    return { ok: false, reason: "preserveTip 缺少 BIZ_V3 条件：" + expr };
  }
  if (!/!\s*decisionRender/.test(expr)) {
    return { ok: false, reason: 'preserveTip 缺少 !decisionRender（服务端已结构性剥离）：' + expr };
  }
  return { ok: true, reason: expr };
}

test('P168 B3-17 tip 保留条件：客户端必须与服务端真实行为一致（BIZ_V3 且决策区块未接管）', () => {
  const code = stripComments(astroSrc);

  // ① 先把**服务端真实行为**钉住（否则「一致」无从谈起）
  //   服务端 ResultCard.astro：preserveTip 为真 ⇒ 保留 tip 行；否则用共享判定过滤掉
  const cardSrc = readFileSync(resolve(process.cwd(), 'src/components/ResultCard.astro'), 'utf8');
  assert.match(cardSrc, /preserveTip\s*\?\s*text\s*:/, 'ResultCard 不再按 preserveTip 决定是否过滤 tip 行');
  assert.match(cardSrc, /isCalcOutputTipLine/, 'ResultCard 不再用共享的 tip 判定');
  //   服务端 prop 的取值来自页面 JSX：preserveTip={bizConfigKey === 'BIZ_V3'}
  assert.match(
    code,
    /preserveTip=\{bizConfigKey\s*===\s*'BIZ_V3'\}/,
    '页面没有按 BIZ_V3 把 preserveTip 传给 ResultCard',
  );
  //   页面上游还有一道**结构性剥离**：决策区块接管 ⇒ 卡片里本就没有 tip
  assert.match(
    code,
    /decisionRender\s*\?\s*stripDecisionTip\(ex\)\s*:\s*ex/,
    '页面没有结构化剥离决策区块接管的 tip',
  );
  //   ⇒ 卡片里**实际**保留 tip 的条件 = BIZ_V3 && !decisionRender

  // ② 客户端的 preserveTip 定义必须与之一致
  const expr = clientPreserveTipExpr(code);
  const verdict = preserveTipConditionOk(expr);
  assert.ok(verdict.ok, verdict.reason);
  //   ⭐ 且它必须落在**客户端脚本块**里（不是服务端 JSX 的同名 prop）
  const scriptStart = code.indexOf('define:vars');
  assert.ok(scriptStart > 0, '页面里找不到客户端脚本注入块（define:vars）');
  const scriptEnd = code.indexOf('</script>', scriptStart);
  const defAt = code.search(/(?:var|let|const)\s+preserveTip\s*=/);
  assert.ok(defAt > scriptStart && defAt < scriptEnd, '客户端的 preserveTip 定义不在客户端脚本块里');

  // ⭐ 检测器自检：缺 !decisionRender 的样本必须判红（证明这条断言不是恒绿）
  const missingDecision = preserveTipConditionOk("bizConfigKey === 'BIZ_V3'");
  assert.equal(missingDecision.ok, false, '检测器没认出「缺 !decisionRender」的样本');
  assert.ok(missingDecision.reason.includes('!decisionRender'), '检测器没给出缺条件的原因：' + missingDecision.reason);
  // ⭐ 检测器自检 2：缺 BIZ_V3 的样本必须判红
  const missingBiz = preserveTipConditionOk('!decisionRender');
  assert.equal(missingBiz.ok, false, '检测器没认出「缺 BIZ_V3」的样本');
  // ⭐ 检测器自检 3：正确的样本必须判绿
  assert.equal(
    preserveTipConditionOk("bizConfigKey === 'BIZ_V3' && !decisionRender").ok,
    true,
    '检测器把正确条件判成了红',
  );
});


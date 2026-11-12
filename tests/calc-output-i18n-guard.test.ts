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
} from '../src/lib/calc-output-i18n.ts';
import {
  infoUnits,
  readLocale,
  MIN_ZH_TO_EN_RATIO,
  ROOT,
} from './_decision-support-fixture.ts';
import { stripComments } from './build-dep-suites.mjs';

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

test('B3-7 token 构造：param 值里的花括号被去掉（否则整个 token 退化成裸码）', () => {
  const tok = makeToken('calc_out.label.x', 'fallback', { note: '{oops}' });
  assert.ok(!tok.includes('{oops}'), 'param 值里的花括号没被去掉：' + tok);
  const out = renderCalcOutput(tok, { 'calc_out.label.x': '中文 {note}' });
  assert.equal(out, '中文 oops');
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

// ═══ P168 B3-7 的四条 source-only 判据 ═══
// （本段用到的共享夹具：infoUnits / readLocale / MIN_ZH_TO_EN_RATIO / ROOT
//   来自 './_decision-support-fixture.ts' —— 与既有决策层守卫同一套信息量口径）

/** 引擎文件里出现的所有 token code（两种写法都要认） */
function tokenCodesIn(text: string): string[] {
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
 *   ⇒ 服务端区 = customFn 声明之前；客户端区 = customFn 声明之后、engine 对象之前。
 *   ⇒ engine 对象（含 staticExamples）**不参与比较** ——
 *     staticExamples 是 generate() 的产物，两边天然一致，比它没有意义。
 */
function splitEngineRegions(src: string): { server: string; client: string } | null {
  const fnAt = src.indexOf('const customFn');
  if (fnAt < 0) return null;
  const engineAt = src.indexOf('const engine', fnAt);
  if (engineAt < 0) return null;
  return { server: src.slice(0, fnAt), client: src.slice(fnAt, engineAt) };
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

// ── G2：模板表守恒（双向）────────────────────────────────────────────────
test('P168 B3-7 G2：calc_out.* 模板表守恒（引擎声明的 token 集合 == locale 键集合，双向）', () => {
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
    const pipe = src.indexOf('|', after);
    if (pipe < 0) { out.push({ code, fallback: null }); continue; }
    // fallback 到「下一个引号」为止（内层字面量的收尾引号）
    let end = pipe + 1;
    while (end < src.length && "'\"`".indexOf(src[end]) < 0) end++;
    out.push({ code, fallback: src.slice(pipe + 1, end) });
  }

  // ② 构造器调用
  const call = /\b(?:tk|tok|makeToken)\s*\(/g;
  while ((m = call.exec(src)) !== null) {
    const openParen = m.index + m[0].length - 1;
    const args = splitCallArgs(src, openParen);
    const rawCode = (args[0] ?? '').trim();
    const litCode = /^(['"])([\s\S]*)\1$/.exec(rawCode);
    if (!litCode) continue;             // 首参不是字面量 ⇒ 静态判不了 ⇒ 跳过
    out.push({ code: litCode[2], fallback: args[1] === undefined ? null : args[1] });
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
    }
  }
  // ⭐ 检测器自检：造一个已知违规样本，断言检测器看得见它
  //   （「检查违规」的断言在没有违规时本来就绿 ⇒ 必须证明检测器本身有效）
  const bad = tokenLiteralsIn("const x = tk('calc_out.Bad_Code', 'A | B');");
  assert.equal(bad.length, 1, '检测器没认出构造器调用');
  assert.ok(!CODE_RE.test(bad[0].code), '检测器没认出非法 code');
  assert.ok((bad[0].fallback || '').includes('|'), '检测器没认出 fallback 里的半角竖线');
  assert.deepEqual(problems, [], problems.join(' | ') + '（共检查 ' + seen + ' 个 token 字面量）');
});

// ── G3：两份实现（calculate / customFn）声明的 token 集合一致 ────────────
test('P168 B3-7 G3：customFn 声明的 token 集合 == calculate() 声明的 token 集合', () => {
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
  }
  assert.ok(checked >= 10, '只检查到 ' + checked + ' 个 custom 引擎（期望 ≥ 10）');
  assert.deepEqual(problems, [], problems.join(' | '));
});

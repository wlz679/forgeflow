// P168 B3-8 —— 从**引擎源码**抽取每个 token 的英文模板（覆盖**所有分支**）。
//
// ⭐ 为什么需要它（运行时抽取的短板）
//   运行时抽取（跑 generate()）只能看到**默认输入走到的分支** ⇒ 健康度档位、错误提示
//   这类分支拿不到英文模板（实测 48 个「真缺口」）。
//   本模块直接解析源码里的两种 token 形态 ⇒ **分支全覆盖**，且：
//     · 英文模板里的 emoji/特殊字符**从源码取**（不手打 ⇒ 不会被代理的转义弄坏码位）；
//     · 运行时数值统一换成 {param} 占位 ⇒ 与 locale 的参数协议一致。
//
// ⭐ 两种 token 形态
//   ① 字面量形态：$calc_out.label.x|Original|            ⇒ 英文 = Original
//      $calc_out.x.row.y{"p":"v"}|Fallback|           ⇒ 英文 = Fallback（v 换成 {p}）
//   ② 构造器形态：makeToken('code', <表达式>, {参数})     ⇒ 英文 = 表达式求值结果
//      （先把参数表达式替换成 '{param}' 再求值）
//
// 用法：import { sourceTemplates } from './p168-locale-source.ts';

import { readFileSync } from 'node:fs';

/** 按顶层逗号切分（跳过括号/引号内部） */
function splitTopLevel(src: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = '';
  let cur = '';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quote) { cur += c; if (c === '\\') { cur += src[i + 1] ?? ''; i += 2; continue; } if (c === quote) quote = ''; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; cur += c; continue; }
    if (c === '(' || c === '{' || c === '[') { depth++; cur += c; continue; }
    if (c === ')' || c === '}' || c === ']') { depth--; cur += c; continue; }
    if (c === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

/** 从 pos（第一个实参的起点）读出实参列表 */
function readArgs(src: string, pos: number): string[] {
  const args: string[] = [];
  let depth = 0;
  let quote = '';
  let cur = '';
  let i = pos;
  for (; i < src.length; i++) {
    const c = src[i];
    if (quote) { cur += c; if (c === '\\') { cur += src[++i] ?? ''; continue; } if (c === quote) quote = ''; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; cur += c; continue; }
    if (c === '(' || c === '[' || c === '{') { depth++; cur += c; continue; }
    if (c === ')' || c === ']' || c === '}') { if (depth === 0) break; depth--; cur += c; continue; }
    if (c === ',' && depth === 0) { args.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  args.push(cur.trim());
  return args;
}

function isIdent(s: string): boolean { return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s); }

/** 把 TS 源码里的转义还原成真正的字符（客户端 customFn 是一段 TS 字符串字面量 ⇒ 里面的
 *  \\uXXXX 是**双层**转义 ⇒ 直接当源码文本看会看到字面的 \\uD83D\\uDFE2） */
export function unescapeUnicode(s: string): string {
  return s
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\\\'/g, "'")
    .replace(/\\\\/g, '\\');
}

/** 词边界敏感的取值替换
 *
 *  ⭐ 为什么需要（2026-11-16 实测踩坑）
 *   ai-api 的 provider 初始字母 param `initial` 的取值只有**一个字符**（'O' / 'A' / 'G' / 'D'）
 *   ⇒ 朴素的「把取值换回 {param}」会把 'OpenAI' 里的 'O' 也换掉 ⇒ 模板变成 '[{initial}] penAI'
 *   ⇒ 模板被污染 ⇒ 英文页文案被改坏。
 *   ⇒ 规则：只有当取值的**首/尾字符是单词字符**时，才要求该侧的边界不是单词字符。
 *   （取值含 '$' / '+' / '%' 等非单词字符时不做边界要求 —— 否则 '$1,000' 永远换不掉）
 */
export function replaceWordValue(text: string, value: string, placeholder: string): string {
  if (!value) return text;
  const isWord = (ch: string) => /[A-Za-z0-9_$]/.test(ch);
  const firstIsWord = isWord(value[0]);
  const lastIsWord = isWord(value[value.length - 1]);
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text.startsWith(value, i)) {
      const before = i > 0 ? text[i - 1] : '';
      const after = i + value.length < text.length ? text[i + value.length] : '';
      const okBefore = !firstIsWord || before === '' || !isWord(before);
      const okAfter = !lastIsWord || after === '' || !isWord(after);
      if (okBefore && okAfter) { out += placeholder; i += value.length; continue; }
    }
    out += text[i];
    i++;
  }
  return out;
}
/** 把参数取值换回 {param} 占位（取值长的先替换，先到先得） */
export function substituteValues(text: string, params: Record<string, string>): string {
  const keys = Object.keys(params).filter((k) => params[k]).sort((a, b) => params[b].length - params[a].length);
  let out = text;
  for (const k of keys) {
    out = replaceWordValue(out, params[k], '{' + k + '}');
  }
  return out;
}

/** 把源码表达式切成「代码片段 / 字符串片段」交替的数组（引号内的内容单独成段）
 *
 *  为何需要（2026-11-16 实测踩坑）：参数表达式的**标识符**常常与英文文案里的单词同名
 *  （例：params = { fees: money(volume.yearly.fees) }，而文案写着 'At your volume, ... in fees.'）
 *  ⇒ 若不区分代码区与字符串区，'volume' / 'fees' 会被当成参数替换 ⇒ 英文文案被污染。
 *  ⇒ 参数表达式**只可能出现在代码区** ⇒ 只在代码片段里替换，字符串片段一律不动。 */
function splitCodeStrings(src: string): { code: string; str: boolean }[] {
  const out: { code: string; str: boolean }[] = [];
  let cur = '';
  let quote = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (quote) {
      cur += c;
      if (c === '\\') { cur += src[i + 1] ?? ''; i += 2; continue; }
      if (c === quote) { out.push({ code: cur, str: true }); cur = ''; quote = ''; }
      i++;
      continue;
    }
    if (c === String.fromCharCode(39) || c === String.fromCharCode(34) || c === String.fromCharCode(96)) {
      if (cur) { out.push({ code: cur, str: false }); cur = ''; }
      quote = c;
      cur = c;
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  if (cur) out.push({ code: cur, str: quote ? true : false });
  return out;
}

/** 词边界敏感的标识符替换：每命中一次调一次 nextMark() 拿一个新的哨兵 */
function replaceIdentAll(src: string, ident: string, nextMark: () => string): string {
  const isWord = (ch: string) => /[A-Za-z0-9_$]/.test(ch);
  let out = '';
  let i = 0;
  while (i < src.length) {
    if (src.startsWith(ident, i)) {
      const before = i > 0 ? src[i - 1] : '';
      const after = i + ident.length < src.length ? src[i + ident.length] : '';
      const okBefore = before === '' || !isWord(before);
      const okAfter = after === '' || !isWord(after);
      if (okBefore && okAfter) { out += nextMark(); i += ident.length; continue; }
    }
    out += src[i];
    i++;
  }
  return out;
}

/** 把参数**源表达式**换回 {param} 占位，再对 fallback 表达式求值 */
function templateFromExpr(expr: string, paramSrc: { k: string; expr: string }[]): string | null {
  const parts = splitCodeStrings(expr);
  const cands: { k: string; text: string }[] = [];
  for (const p of paramSrc) {
    cands.push({ k: p.k, text: p.expr });
    const ids = (p.expr.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || []).sort((a, b) => b.length - a.length);
    for (const id of ids) if (id !== p.expr) cands.push({ k: p.k, text: id });
  }
  const seen = new Set<string>();
  const uniq = cands.filter((c) => { const key = c.k + '|' + c.text; if (seen.has(key)) return false; seen.add(key); return true; })
    .sort((a, b) => b.text.length - a.text.length);
  // 两阶段替换：先用**哨兵**（控制字符 U+0001/U+0002，源码里不可能出现）占位，
  //   全部替换完成后才还原成 '{k}'。
  //   为何必须两阶段（2026-11-16 实测踩坑）：直接替换成 '{k}' 时，
  //   后续的标识符候选（如 'pct'）会命中**刚插入的** '{pct}' => 字符串被二次替换
  //   => JS 源码语法错误 => new Function 抛异常 => 模板推导静默失败（返回 null）。
  //   症状：25 个分支专属 token（健康度档位 / 小额分支 / 非美国税务分支...）
  //     全部推不出英文模板 => locale 缺键 => G3 红。
  const S1 = String.fromCharCode(1);
  const S2 = String.fromCharCode(2);
  const QUOTE = String.fromCharCode(39);
  const LBRACE = String.fromCharCode(123);
  const RBRACE = String.fromCharCode(125);
  const marks: string[] = [];
  const nextMark = (k: string): string => {
    const m = QUOTE + S1 + marks.length + S2 + QUOTE;
    marks.push(k);
    return m;
  };
  for (const c of uniq) {
    for (const p of parts) {
      if (p.str) continue;
      if (p.code.indexOf(c.text) < 0) continue;
      if (isIdent(c.text)) {
        p.code = replaceIdentAll(p.code, c.text, () => nextMark(c.k));
      } else {
        const pieces = p.code.split(c.text);
        p.code = pieces.map((s, idx) => (idx < pieces.length - 1 ? s + nextMark(c.k) : s)).join('');
      }
    }
  }
  let e = parts.map((p) => p.code).join('');
  for (let i = 0; i < marks.length; i++) {
    e = e.split(QUOTE + S1 + i + S2 + QUOTE).join(QUOTE + LBRACE + marks[i] + RBRACE + QUOTE);
  }
  try { return new Function('return ' + e)(); } catch { return null; }
}

/** 解析 { k: expr, ... } 字面量 ⇒ 参数的源表达式 */
function parseParamSrc(src: string): { k: string; expr: string }[] {
  const inner = src.trim().replace(/^\{/, '').replace(/\}$/, '');
  const out: { k: string; expr: string }[] = [];
  for (const part of splitTopLevel(inner)) {
    const c = part.indexOf(':');
    if (c < 0) continue;
    out.push({ k: part.slice(0, c).trim(), expr: part.slice(c + 1).trim() });
  }
  return out;
}

/** 一个引擎源码里全部 token 的英文模板 */
export function sourceTemplates(file: string): Record<string, string> {
  const src = readFileSync(file, 'utf8');
  const out: Record<string, string> = {};
  // ① 字面量形态（带或不带 params 组）
  const lit = /\$((?:calc_out\.)[a-z0-9_.]+)(?:\{([^{}]*)\})?\|([^|\n]*)\|/g;
  let m: RegExpExecArray | null;
  while ((m = lit.exec(src)) !== null) {
    let original = m[3];
    if (m[2]) {
      let params: Record<string, string> = {};
      try { params = JSON.parse('{' + m[2] + '}'); } catch { params = {}; }
      original = substituteValues(original, params);
    }
    if (out[m[1]] === undefined) out[m[1]] = original;
  }
  // ② 构造器形态
  const call = /(?:makeToken|tk)\(\s*(['"])((?:calc_out\.)[a-z0-9_.]+)\1/g;
  while ((m = call.exec(src)) !== null) {
    const code = m[2];
    // ⚠️ 跳过 code 字符串与第一个实参之间的逗号（漏掉它 ⇒ 第一个实参变成「, 表达式」⇒ 求值失败）
    let ap = m.index + m[0].length;
    while (ap < src.length && (src[ap] === ' ' || src[ap] === '\t' || src[ap] === '\n' || src[ap] === '\r')) ap++;
    if (src[ap] === ',') ap++;
    const args = readArgs(src, ap);
    const expr = args[0] ?? '';
    const paramSrc = args[1] ? parseParamSrc(args[1]) : [];
    const tpl = templateFromExpr(expr, paramSrc);
    if (tpl !== null && out[code] === undefined) out[code] = unescapeUnicode(tpl);
  }
  return out;
}
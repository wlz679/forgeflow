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
  // ⭐ 数值型取值：边界判定改用「不得拆数字」而不是「不得拆单词」
  //   原因（2026-11-17 B3-9 实测）：取值后面的**单位后缀**（`pp` / `x` / `h` / `mo`）也是单词字符
  //   ⇒ 旧规则要求「值后不是单词字符」⇒ `60.0pp` 里的 `60.0` 永远换不了
  //   ⇒ 模板里的数值被**冻结**（页面显示的是默认输入的数，不是用户实际输入的数）
  //   ⇒ 例：注释留存器的 `Gap: +0.0pp needed`（实际应为 `Gap: +{gap}pp needed`）
  //   ⇒ 数值型的边界：前后**不得是数字/小数点**（不拆更长的数字）
  //   ⇒ 但**允许后缀字母**（`pp`/`x`/`h`）⇒ `60.0pp` ⇒ `{gap}pp` ✓
  const numericLike = /^[\$+\-]?[0-9][0-9,.]*%?$/.test(value) && /[0-9]/.test(value);
  const isDigitish = (ch: string) => /[0-9.,]/.test(ch);
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text.startsWith(value, i)) {
      const before = i > 0 ? text[i - 1] : '';
      const after = i + value.length < text.length ? text[i + value.length] : '';
      // ⭐ 数值型取值的边界判定改用「**不得拆数字**」（isDigitish）而不是「不得拆单词」
      //   ⇒ 允许**单位后缀**（`pp` / `x` / `h` / `mo` / `%`）⇒ `60.0pp` ⇒ `{gap}pp` ✓
      //     （2026-11-17 B3-9 实测踩坑：numericLike / isDigitish 算出来了却**没接上**
      //      ⇒ `1.25x` 里的 `1.25` 永远换不掉 ⇒ 模板数值被**冻结**）
      //   ⇒ 同时保证不拆更长的数字（`1,500` 里的 `500` 不单独替换）
      const boundary = numericLike ? isDigitish : isWord;
      const okBefore = !firstIsWord || before === '' || !boundary(before);
      const okAfter = !lastIsWord || after === '' || !boundary(after);
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

/** 源码表达式的「代码区标志」：与 src **同长度**，字符串字面量区域标 false */
/**
 *  为何需要（2026-11-17 B3-9 实测修）：
 *  参数表达式的**标识符**常常与英文文案里的单词同名
 *  （例：params = { fees: money(volume.yearly.fees) }，而文案写着 'At your volume, ... in fees.'）
 *  ⇒ 若不区分代码区与字符串区，'volume' / 'fees' 会被当成参数替换 ⇒ 英文文案被污染。
 *  ⇒ 参数表达式**只可能出现在代码区** ⇒ 只在代码区替换，字符串区一律不动。
 *
 *  ⭐ 为什么用「标志数组」而不是「切成分段数组」（2026-11-17 B3-9 实测踩坑）：
 *  候选表达式**自身含字符串字面量**时（例 `String(m).padStart(2, " ")`）
 *  它**横跨「代码段 + 字符串段 + 代码段」** ⇒ 分段匹配**必然失配**
 *  ⇒ 参数没被替换 ⇒ 模板里残留运行时表达式 ⇒ 推导结果不可用。
 *  ⇒ 标志数组与原串**同长度对齐** ⇒ 可以跨段匹配，同时仍能排除字符串区。 */
function codeRegions(src: string): boolean[] {
  const flags: boolean[] = new Array(src.length).fill(false);
  let quote = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (quote) {
      flags[i] = false;
      if (c === '\\') {
        if (i + 1 < src.length) flags[i + 1] = false;
        i += 2;
        continue;
      }
      if (c === quote) quote = '';
      i++;
      continue;
    }
    if (c === String.fromCharCode(39) || c === String.fromCharCode(34) || c === String.fromCharCode(96)) {
      quote = c;
      flags[i] = false;
      i++;
      continue;
    }
    flags[i] = true;
    i++;
  }
  return flags;
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
  const codeFlags = codeRegions(expr);
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
  // ⭐⭐ 2026-11-17 B3-9（实测修）：**单遍扫插入**（而不是「按候选逐个扫」）
  //   ⇒ 为什么：「按候选逐个扫」会让插入的占位符**改变后续候选的偏移**
  //     ⇒ 后续候选可能匹配到占位符内部⇒ 模板被污染。
  //   ⇒ 单遍扫只插入一次 ⇒ 不会影响后续匹配。
  //   · 候选按长度降序（长的先匹配）⇒ 更具体的表达式先命中。
  //   · 代码区判定：标识符候选要求**覆盖区全在代码区**；整表达式候选要求**起点在代码区**。
  const out: string[] = [];
  let i = 0;
  while (i < expr.length) {
    if (codeFlags[i]) {
      let hit: { k: string; text: string } | null = null;
      for (const c of uniq) {
        if (!expr.startsWith(c.text, i)) continue;
        if (isIdent(c.text)) {
          let allCode = true;
          for (let j = i; j < i + c.text.length; j++) {
            if (!codeFlags[j]) { allCode = false; break; }
          }
          if (!allCode) continue;
          // ⭐ 词边界（保留原语义）：不能在更长标识符**内部**拿到匹配
          //   （例 `dropM` 不能命中 `dropMIdx`）⇒ 否则会把参数同名的两处都替掉
          const before = i > 0 ? expr[i - 1] : '';
          const after = i + c.text.length < expr.length ? expr[i + c.text.length] : '';
          const isWord = (ch: string) => /[A-Za-z0-9_$]/.test(ch);
          if ((before !== '' && isWord(before)) || (after !== '' && isWord(after))) continue;
        }
        hit = c;
        break;
      }
      if (hit) {
        out.push(nextMark(hit.k));
        i += hit.text.length;
        continue;
      }
    }
    out.push(expr[i]);
    i++;
  }
  let e = out.join('');
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

/** 一个引擎源码里全部 token 的英文模板
 *
 *  ⭐ 附带**来源标记**（哪个分支推出来的）：
 *    · 'constructor' —— 从 `makeToken(code, expr, params)` 的**表达式**结构化推导（可靠）
 *    · 'literal'     —— 从源码里的字面量 `$code|...|` 扫出来的（值是**烘焙**的，有冻结风险）
 *  ⇒ 工具与守卫可据此判断「这条模板的数值会不会被冻住」。 */
export function sourceTemplatesWithOrigin(file: string): { tpl: Record<string, string>; origin: Record<string, string>; ctor: Record<string, string>; lit: Record<string, string> } {
  const src = readFileSync(file, 'utf8');
  const ctor: Record<string, string> = {};
  const ctorParams: Record<string, string[]> = {};
  const origin: Record<string, string> = {};
  const call = /(?:makeToken|tk)\(\s*(['"])((?:calc_out\.)[a-z0-9_.]+)\1/g;
  let m: RegExpExecArray | null;
  while ((m = call.exec(src)) !== null) {
    const code = m[2];
    let ap = m.index + m[0].length;
    while (ap < src.length && (src[ap] === ' ' || src[ap] === '\t' || src[ap] === '\n' || src[ap] === '\r')) ap++;
    if (src[ap] === ',') ap++;
    const args = readArgs(src, ap);
    const expr = args[0] ?? '';
    const paramSrc = args[1] ? parseParamSrc(args[1]) : [];
    const tpl = templateFromExpr(expr, paramSrc);
    if (tpl !== null && ctor[code] === undefined) {
      ctor[code] = unescapeUnicode(tpl);
      ctorParams[code] = paramSrc.map((p) => p.k);
    }
  }
  const lit: Record<string, string> = {};
  const litRe = /\$((?:calc_out\.)[a-z0-9_.]+)(?:\{([^{}]*)\})?\|([^|\n]*)\|/g;
  while ((m = litRe.exec(src)) !== null) {
    // ⭐ 2026-11-19 B3-13 组 2（实测修）：字面量分支扫的是**源码原文** ⇒ 源码里
    //   字符串字面量把 ' 写成 \' ⇒ 取到的英文模板残留一个**反斜杠**（"you\'re"）
    //   ⇒ 落库后英文页会多出反斜杠 ⇒ locale 模板渲染 ≠ 英文兜底 ⇒ G8/parity 守卫变红。
    //   （ctor 分支不受影响：它走 new Function 求值 ⇒ 转义已被 JS 解析掉。）
    //   ⇒ 这里按「JS 字符串字面量」规则还原：\' → ' ，\\ → \
    let original = m[3].replace(/\\(['\\])/g, '$1');
    if (m[2]) {
      let params: Record<string, string> = {};
      try { params = JSON.parse('{' + m[2] + '}'); } catch { params = {}; }
      original = substituteValues(original, params);
    }
    if (lit[m[1]] === undefined) lit[m[1]] = original;
  }
  // ⭐⭐ 选择规则（2026-11-17 B3-9 实测定案）：**构造器分支优先，但仅当它把全部参数都回填成了占位符**
  //   ⇒ 否则回落字面量分支
  //   ⇒ 理由（两个分支各自的弱点）：
  //     · 构造器分支（结构化推导）能把「运行时值」推回参数，
  //       但当两个参数**共用同一个标识符**（例如两个参数都跟 `dropIdx` 有关）⇒
  //       推导会把两处都替成同一个占位符 ⇒ 参数丢失
  //     · 字面量分支（从 staticExamples 的烘焙值反推）能补上那些参数，
  //       但值后面跟着**单位后缀**（`pp`/`x`/`h`）时反推失败 ⇒ 数值被**冻结**
  //   ⇒ 两分支必须双向校验（下面的工具对每个 code 做「回填后渲染 == 点值」验证）
  const out: Record<string, string> = {};
  for (const code of Object.keys(ctor)) {
    const keys = ctorParams[code] ?? [];
    // ⭐⭐ 2026-11-19 B3-13 组 2（实测修）：**无参数**的 token 也算「推导完整」
    //   ⇒ 旧规则 `keys.length > 0` 把「没有 param 可回填」的 token 一律判为**不完整**
    //   ⇒ 构造器分支的模板被丢弃 ⇒ 而字面量分支（读 staticExamples 的烘焙值）若也没有这个 code
    //     （例：只在死分支/边界分支出现的 token，staticExamples 里没有）
    //   ⇒ 该 code **被静默丢掉**（既不进 newKeys 也不进 noTemplateMissing）
    //   ⇒ 引擎声明了它、locale 里却没有 ⇒ G2/G12 红。
    //   （实测：remote_vs_office 的 health_moderate_savings / health_weak / need_inputs /
    //     tip_productivity_loss 四个**无参** token 就是这样丢的。）
    //   ⇒ 无参 token 本来就没有「要回填的参数」⇒ 构造器模板**天然完整**。
    const complete = keys.every((k) => ctor[code].includes('{' + k + '}'));
    if (complete) { out[code] = ctor[code]; origin[code] = 'constructor'; }
  }
  for (const code of Object.keys(lit)) {
    if (out[code] !== undefined) continue;
    out[code] = lit[code];
    origin[code] = 'literal';
  }
  return { tpl: out, origin, ctor, lit };
}

/** 一个引擎源码里全部 token 的英文模板 */
export function sourceTemplates(file: string): Record<string, string> {
  // ⭐ 2026-11-17 B3-9（实测修）：**与 sourceTemplatesWithOrigin 用同一条选择规则**
  //   ⇒ 之前这里「构造器优先、字面量补缺」，那边「构造器**且全部参数都回填成占位符**才用」
  //   ⇒ 同一个 code 在两个工具里给出**不同模板** ⇒ 落库与体检互相打架（本批实测）
  //   ⇒ 现在统一走 sourceTemplatesWithOrigin（构造器完整才用，否则回落字面量）。
  return sourceTemplatesWithOrigin(file).tpl;
}

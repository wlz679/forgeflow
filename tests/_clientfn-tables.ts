/**
 * P168 B3-10 —— **客户端表测量夹具**（共享 · 无 skip-guard · 放 tests/ 而不是 tests/scripts/）。
 *
 * 为什么单独一个夹具
 * ------------------
 * 「客户端到底带了哪些模型」有两个测量口：
 *   ① 源码级：引擎文件里 customFn 模板字面量中的那张表
 *   ② 产物级：dist HTML 里 define:vars 注入的 clientConfig（**双重转义**的 JSON 串）
 * 两处必须用**同一套测量逻辑** ⇒ 否则两个口径各说各话 ⇒ 就会出现
 * 「源码说 18、产物说 13」这种互相甩锅的场面。
 *
 * ⭐ 测量口径是**数据锚定**的，不是**代码形态**锚定的：
 *   旧口径（写死 `var M={`）：变量名 + 字面量形态 ⇒ 移植后形态一变就测不到（静默返回 0）
 *   ⇒ 守卫变红的原因跟用户看到的东西无关（测的是形态，不是承诺）。
 *   新口径：先拿到「应该带的模型 key 集合」（交互态白名单），
 *   再在文本里找出**包含这些 key 的那个对象字面量** ⇒ 与变量名无关、与形态无关。
 */

export interface ClientTable {
  /** 客户端表里实际带的模型 key（去重、排序） */
  models: string[];
  /** 该字面量的顶层 key（LLM 表 = 模型 key；comparison 表 = provider 名） */
  topKeys: string[];
}

/** 扫描一段平衡的 {...} 字面量（openIdx 指向 '{'） */
export function scanObjectLiteral(
  text: string,
  openIdx: number,
): { body: string; end: number } | null {
  let depth = 0;
  let quote: string | null = null;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i]!;
    if (quote) {
      if (ch === '\\') { i++; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '{' || ch === '[') { depth++; continue; }
    if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) return { body: text.slice(openIdx + 1, i), end: i };
    }
  }
  return null;
}

/**
 * 收集字面量**深度 0** 的 key（引号 key **和**未加引号的标识符 key）。
 *
 * ⭐ 为什么必须收「未加引号的」：
 *   压缩器会把合法标识符形式的 key 的引号**去掉** —— `{"o3":{…}}` ⇒ `{o3:{…}}`
 *   ⇒ 只认引号 key 的扫描器会**漏数**（实测 openai 页 18 个模型只数到 17 个，
 *   那个漏掉的恰好是 `o3`）⇒ 守卫会因「数错了」而红，可客户端其实一个模型都没少。
 *   ⚠️ 判定「未加引号的 key」必须同时满足两件事，否则三元表达式会误判：
 *     ① 前面一个非空白字符是 `,`（或就是字面量开头）
 *     ② 后面（跳过标识符与空白）是 `:`
 */
export function topLevelKeys(body: string): string[] {
  const keys: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let keyStart = -1;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]!;
    if (quote) {
      if (ch === '\\') { i++; continue; }
      if (ch === quote) {
        // ⭐ 深度 0 的引号 token 只有在**后面紧跟 `:`** 时才是 key。
        //   `{name:"OpenAI"}` 里的 "OpenAI" 是**值**，不是 key ——
        //   不判这一条 ⇒ 值被当 key 收进来 ⇒ 候选集合被污染 ⇒ 匹配到错的字面量。
        if (depth === 0 && body.slice(i + 1).match(/^\s*:/)) keys.push(body.slice(keyStart + 1, i));
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; keyStart = i; continue; }
    if (ch === '{' || ch === '[') { depth++; continue; }
    if (ch === '}' || ch === ']') { depth--; continue; }
    if (depth === 0 && /[A-Za-z_$]/.test(ch)) {
      let j = i;
      while (j < body.length && /[A-Za-z0-9_$]/.test(body[j]!)) j++;
      if (j > i && body.slice(j).match(/^\s*:/)) {
        // ① 必须是 key 位置：前一个非空白字符是 `,` 或字面量开头
        let p = i - 1;
        while (p >= 0 && /\s/.test(body[p]!)) p--;
        if (p < 0 || body[p] === ',') { keys.push(body.slice(i, j)); i = j; }
      }
    }
  }
  return keys;
}

/**
 * 找出「应该带的模型 key」所在的那个对象字面量。
 *
 * ⭐ 口径：**不锚定代码形态**。
 *   旧实现找 `= {`（**带空格**的赋值形态）⇒ 压缩之后是 `={` ⇒ 整段扫不到
 *   ⇒ 守卫因「形态变了」而红，可用户看到的东西一点没变 —— 那是**测错了**，不是**坏了**。
 *   ⇒ 改成扫描所有**取值位置**的 `{`（前一个非空白字符是 = : ( [ ,）⇒ 与形态无关。
 *
 * 候选 key 的来源（三种表形态都覆盖）：
 *   · 顶层引号 key        ⇒ LLM 表（`{"gpt-5.5":{…},…}`）
 *   · `key:'X'`          ⇒ comparison 表（`{openai:{models:[{key:'gpt-5-mini',…}]}}`）
 *   · `"key":"X"` / `"model":"X"` ⇒ 数据集里的跨供应商引用
 */
export function measureClientTable(text: string, expectedKeys: string[]): ClientTable | null {
  if (expectedKeys.length === 0) return null;
  const want = new Set(expectedKeys);
  for (const literal of valuePositionLiterals(text)) {
    const topKeys = topLevelKeys(literal.body);
    const candidates = new Set<string>(topKeys);
    const nested: string[] = [];
    for (const m of literal.body.matchAll(/key:'([^']+)'/g)) { candidates.add(m[1]!); nested.push(m[1]!); }
    // ⭐ 压缩器会把 key 的引号**规范化**：手写源码里是 `key:'X'`，压缩后是 `key:"X"`
    //   ⇒ 只认单引号形态的扫描器会**看不见** comparison 表 ⇒ 守卫误报「客户端一张表都没带」。
    for (const m of literal.body.matchAll(/key:"([^"]+)"/g)) { candidates.add(m[1]!); nested.push(m[1]!); }
    for (const m of literal.body.matchAll(/"key":"([^"]+)"/g)) { candidates.add(m[1]!); nested.push(m[1]!); }
    for (const m of literal.body.matchAll(/"model":"([^"]+)"/g)) candidates.add(m[1]!);
    let all = true;
    for (const k of want) {
      if (!candidates.has(k)) { all = false; break; }
    }
    if (!all) continue;
    // 顶层 key 就是模型 key（LLM 表）⇒ 用它；否则用 `key:'X'`（comparison 表）
    const models = topKeys.length >= want.size && topKeys.every((k) => want.has(k))
      ? topKeys
      : [...new Set(nested)];
    return { models: [...new Set(models)].sort(), topKeys: [...new Set(topKeys)].sort() };
  }
  return null;
}

/** `{` 是否处在「取值位置」—— 语句块（`try{` / `if(){` / `=>{`）不在内 */
function isValuePosition(text: string, openIdx: number): boolean {
  for (let i = openIdx - 1; i >= 0; i--) {
    const ch = text[i]!;
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') continue;
    return ch === '=' || ch === ':' || ch === '(' || ch === '[' || ch === ',';
  }
  return true;
}

/** 扫描出所有「取值位置」的对象字面量（按出现顺序） */
function valuePositionLiterals(text: string): Array<{ body: string }> {
  const out: Array<{ body: string }> = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '{') continue;
    if (!isValuePosition(text, i)) continue;
    const literal = scanObjectLiteral(text, i);
    if (!literal) continue;
    out.push({ body: literal.body });
  }
  return out;
}

/**
 * 从构建产物里取出 define:vars 注入的 clientConfig。
 * 产物里它是**双重转义**的 JSON 串（`const clientConfig = "{\\"type\\":…"`）
 * ⇒ 必须先按 JS 字符串字面量切出来、再 JSON.parse 一次，才拿到真正的 customFn 源码。
 */
export function extractClientConfig(html: string): { customFn?: string } | null {
  const marker = 'const clientConfig = ';
  const idx = html.indexOf(marker);
  if (idx < 0) return null;
  const start = idx + marker.length;
  const quote = html[start];
  if (quote !== '"' && quote !== "'") return null;
  let i = start + 1;
  for (; i < html.length; i++) {
    const ch = html[i]!;
    if (ch === '\\') { i++; continue; }
    if (ch === quote) break;
  }
  if (i >= html.length) return null;
  const literal = html.slice(start, i + 1);
  try {
    // ⚠️ 双重编码：parse 一次得到的是**字符串**（那段 clientConfig 的 JSON 文本）
    //    ⇒ 再 parse 一次才是对象。实测 2026-11-19（openai 页 literalLen=22157）。
    const first = JSON.parse(literal);
    const cfg = typeof first === 'string' ? JSON.parse(first) : first;
    return cfg as { customFn?: string };
  } catch {
    return null;
  }
}

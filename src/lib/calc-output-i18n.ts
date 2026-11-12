// P168 B3-7 —— 计算结果卡片的「语义码 + 值」渲染：**唯一实现**。
//
// ⭐ 为什么是纯逻辑、不 import locale
//   locale（en.json 970KB + zh.json 944KB）一旦被客户端 import
//   ⇒ 每个工具页的客户端 bundle 被拖进 1.9MB。
//   ⇒ 模板查找留在服务端（src/lib/calc-output-templates.ts）；
//      客户端只拿「服务端查好的模板表」（DOM 属性），像 B3-4 那样。
//
// ⭐ 为什么 token 用 '$' 前缀
//   locale 里已有 97 个键用 {param} 占位符（fillTemplate 逐个替换）
//   ⇒ token 若也写成 {ns.key}，替换顺序会产生歧义。
//   ⇒ '$' 与 '{param}' 完全正交；且引擎输出里 '$' 只以 '$数字' 形式出现。
//
// ⭐ token 自带英文兜底（'码|英文原文'）
//   token 化把英文换走了 ⇒ 原文案在运行时已不存在
//   ⇒ 若 locale 缺键，没有任何地方能拿到兜底文本 ⇒ 页面会显示裸 token。
//   ⇒ 把英文原文塞进 token ⇒ 缺键时降级到「可读的英文」而不是裸码。
//
// ⭐ 渲染顺序：先 beautify（看到 token 里的英文兜底，区块识别与英文页一致）
//   → 再替换 token（出中文）。反过来会让 en/zh 两页结构分叉。

/** locale 里存计算结果模板的键前缀 */
export const CALC_OUTPUT_KEY_PREFIX = 'calc_out.';

/**
 * token 正则（全局）。
 *
 * 分三组：
 *   1) code      —— ≥2 段、全小写、段内只允许 [a-z0-9_]（$12,000 不匹配）
 *   2) params    —— 可选 JSON，紧跟 code（值里不得有 { }）
 *   3) fallback  —— 第一个 | 之后；遇到 $ + 字母才停、$ + 数字继续吃
 *      （否则 'raise to $300,000' 会被截断）
 */
export const CALC_OUTPUT_TOKEN_RE =
  /\$([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)(\{[^{}]*\})?(?:\|((?:(?!\$[a-z])[^|])*))?/g;

/** 渲染结果卡片的文本：命中模板用模板，缺键降级到英文兜底 */
export type RenderCalcOutput = (text: string, templates: Record<string, string>) => string;

/**
 * token 构造器的**唯一实现**（JS 源码字符串）。
 *
 * ⭐ 为什么是「源码字符串」而不是一个 TS 函数
 *   客户端的 customFn 是**一段 JS 源码字符串**（`new Function('inputs','pick','fill', body)`），
 *   它**不能 import** ⇒ 若服务端用 TS 函数、客户端另写一份 JS 拼装 ⇒ **两份实现会漂**。
 *   ⇒ 这里把实现写成**一段 JS 源码**，两端都用它：
 *     · 服务端：`makeToken` 由它求值得来（下面）；
 *     · 客户端：每个引擎的 customFn 把它**前置**进函数体（计划 Task 6~15 Step 3）。
 *   ⇒ 真正的一份实现，且**不改 `new Function` 的签名** ⇒ 既有守卫
 *     （customfn-contract-guard / decision-support-guard）零改动、继续绿。
 */
export const CALC_OUTPUT_MAKE_TOKEN_JS =
  'function tk(c,f,p){return "$"+c+(p&&Object.keys(p).length?JSON.stringify(p):"")+"|"+f}';

/**
 * 构造一个 token（引擎侧用）。
 *
 * ⭐ params 的值与 fallback 里出现的金额**必须来自同一个变量**
 *   ⇒ 英文兜底与中文模板不可能漂。
 */
export const makeToken: (code: string, fallback: string, params?: Record<string, string>) => string =
  new Function('return ' + CALC_OUTPUT_MAKE_TOKEN_JS)() as (
    code: string,
    fallback: string,
    params?: Record<string, string>,
  ) => string;

/** 抽出文本里出现的全部 token code（守恒断言用） */
export function extractTokenCodes(text: string): string[] {
  const out = new Set<string>();
  if (!text) return [];
  const re = new RegExp(CALC_OUTPUT_TOKEN_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.add(m[1]);
  return [...out].sort();
}

/**
 * 把文本里的 token 替换成模板文本。
 *
 * ⭐ 模板缺失 ⇒ 用 token 自带的英文兜底（可读）；兜底也为空 ⇒ 保留 token 原文
 *   （守卫负责让这种情况在 CI 里变红，页面不会显示空串）。
 */
export const renderCalcOutput: RenderCalcOutput = (text, templates) => {
  if (!text) return text;
  const re = new RegExp(CALC_OUTPUT_TOKEN_RE.source, 'g');
  return String(text).replace(re, (m, code: string, rawParams?: string, fallback?: string) => {
    let params: Record<string, string> = {};
    if (rawParams) {
      try {
        const parsed = JSON.parse(rawParams);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          for (const [k, v] of Object.entries(parsed)) params[k] = String(v);
        }
      } catch {
        params = {};
      }
    }
    let tmpl = templates ? templates[code] : undefined;
    if (typeof tmpl !== 'string' || tmpl.length === 0) {
      tmpl = typeof fallback === 'string' && fallback.length > 0 ? fallback : m;
    }
    return tmpl.replace(/\{(\w+)\}/g, (_, k: string) => (params[k] != null ? params[k] : '{' + k + '}'));
  });
};

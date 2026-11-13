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
// ⭐ 两道净化安全网（在 makeToken 内置 ⇒ 服务端与客户端同一份）
//   ① **param 值里的花括号**：params 组是 \{[^{}]*\} ⇒ 值里出现 { 或 } 会让整组匹配失败
//      ⇒ **整个 token 退化成裸码**。
//      ⇒ ⭐ 修法（2026-11-12 复核轮）：**不删**（删掉会改数据 —— 公式片段 / JSON 样例 / 代码
//      里的花括号会消失，用户看到的值 ≠ 引擎算出的值）⇒ 改为在 **JSON 文本层**把 { } 转义成
//      \u007b / \u007d ⇒ token 结构保住，JSON.parse 还原后**值一字不差**。
//   ② **fallback 里的半角 '|'**：token 的 fallback 段以第一个 | 结束
//      ⇒ fallback 里再有 | ⇒ 尾部会漏成孤儿尾巴（中文模板 + 孤儿英文）。
//      ⇒ makeToken 兜底把半角 | 换成全角 ｜（U+FF5C：视觉等价，
//      且不破坏 beautifySections 的 ' | ' 维度切分 —— 它只认半角）。
//
// ⭐ 渲染顺序：先 beautify（看到 token 里的英文兜底，区块识别与英文页一致）
//   → 再替换 token（出中文）。反过来会让 en/zh 两页结构分叉。

/** locale 里存计算结果模板的键前缀 */
export const CALC_OUTPUT_KEY_PREFIX = 'calc_out.';

/**
 * tip 行标记（**语言无关**）—— 见 isCalcOutputTipLine。
 *
 * ⭐ 为什么必须语言无关（2026-11-13 实测踩坑）
 *   zh 页的 translateCalcOutput 会把「💡 Tip:」改写成「💡 提示:」
 *   ⇒ 只认英文标记的过滤器在 zh 上**失配** ⇒ zh 卡片多出一条 en 没有的 tip 行
 *     （实测 16 页，其中 mrr / project_profitability 是 B3-7 试点），
 *   ⇒ 且 data-calc-output-raw 里的**英文原文**被正确过滤 ⇒ SSR 与客户端
 *     beautify 的行结构不一致（hydration 后 tip 消失 ⇒ 布局跳动）。
 *
 * ⭐ 覆盖三种形态：英文（引擎原文）、中文半角冒号（translateCalcOutput 的产物）、
 *   中文全角冒号（token 化的 tip 模板用全角「：」）。
 */
export const CALC_OUTPUT_TIP_MARKERS = ['💡 Tip:', '💡 提示:', '💡 提示：'];

/** 这一行是不是「建议行」（💡 Tip / 💡 提示）—— 语言无关 */
export function isCalcOutputTipLine(line: string): boolean {
  if (!line) return false;
  return CALC_OUTPUT_TIP_MARKERS.some((m) => line.includes(m));
}


/**
 * token 正则（全局）。
 *
 * 分三组：
 *   1) code      —— ≥2 段、全小写、段内只允许 [a-z0-9_]（$12,000 不匹配）
 *   2) params    —— 可选 JSON，紧跟 code（值里不得有 { }）
 *   3) fallback  —— 第一个 | 之后；遇到 $ + 字母才停、$ + 数字继续吃
 *      （否则 'raise to $300,000' 会被截断）
 *
 * ⚠️⚠️ **fallback 不跨行**（2026-11-12 实测修复）：字符类是 `[^|\n\r]`，**不是** `[^|]`。
 *   实测（旧写法）：`$calc_out.label.x|A\nB\nC` 的 fallback 捕获成 `"A\nB\nC"`
 *   ⇒ ① 缺 locale 键时**英文兜底吞掉后面整段文本**（用户看到大段英文且内容丢失）；
 *      ② beautifySections 靠 fallback 里的英文识别区块 ⇒ 跨行吞并会让**卡片区块识别错位**。
 *   ⇒ fallback 只能是**一行**的英文短语（协议本来就是这个要求）⇒ 排除换行不损失任何合法场景。
 *
 * ⚠️⚠️ 它带 'g' ⇒ **是有状态的**（lastIndex 会随调用前进）
 *   ⇒ 直接拿它做 .test(x) / .exec(x)，**第二次调用多半得到不同结果**（常见是 false）。
 *   ⇒ 调用方请**克隆**它（new RegExp(CALC_OUTPUT_TOKEN_RE.source, 'g')），
 *     或直接用 renderCalcOutput / extractTokenCodes（两个 helper 内部都克隆了）。
 */
export const CALC_OUTPUT_TOKEN_RE =
  /\$([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)(\{[^{}]*\})?(?:\|((?:(?!\$[a-z])[^|\n\r])*)\|)?/g;

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
 *
 * ⭐ 两道净化安全网（都在这里 ⇒ 两端同一份 ⇒ 不会漂）
 *   ① **param 值里的花括号**：params 组是 \{[^{}]*\} ⇒ 值里出现 { 或 } 会让整组匹配失败
 *      ⇒ **整个 token 退化成裸码**（页面会直接显示 '$calc_out.label.x{"a":"{b}"}|fb'）。
 *      ⇒ ⭐ 这里**在 JSON 文本层**把 { } 转义成 \u007b / \u007d
 *      ⇒ token 结构保住，且 JSON.parse 还原后**值一字不差**（不是删掉，是转义）。
 *   ② **fallback 里的半角 '|'**：token 的 fallback 段以第一个 | 结束
 *      ⇒ fallback 里再有 | ⇒ 尾部漏成孤儿尾巴（中文模板 + 孤儿英文）。
 *      ⇒ 这里兜底把半角 | 换成全角 ｜（U+FF5C：视觉等价，
 *      且不破坏 beautifySections 的 ' | ' 维度切分 —— 它只认半角）。
 *      ⚠️ 这只是**兜底**：真正常见的 ' | ' 是维度行分隔
 *      ⇒ token 化时应当**整行包成一个行码**，而不是把 ' | ' 塞进 fallback。
 */
export const CALC_OUTPUT_MAKE_TOKEN_JS =
  'function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\u007b").replace(/[}]/g,"\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\|/g,"\uFF5C")+"|"}';

/**
 * 构造一个 token（引擎侧用）。
 *
 * ⭐ params 的值与 fallback 里出现的金额**必须来自同一个变量**
 *   ⇒ 英文兜底与中文模板不可能漂。
 *
 * ⭐ params 的值**不得含花括号**（协议规定）—— makeToken 会兜底去掉
 *   （否则 params 组匹配失败 ⇒ 整个 token 退化成裸码）。
 *   fallback 里的半角竖线同理：makeToken 会兜底换成全角 ｜。
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
      if (typeof fallback === 'string') {
        // 有 '|' 分段：兜底为空（makeToken(code,'')）⇒ 不吐半成品，也不吐裸码
        tmpl = fallback.length > 0 ? fallback : '';
      } else {
        // 连 '|' 分段都没有（手写/畸形 token）⇒ 保留原文，让守卫在 CI 里变红
        tmpl = m;
      }
    }
    return tmpl.replace(/\{(\w+)\}/g, (_, k: string) => (params[k] != null ? params[k] : '{' + k + '}'));
  });
};

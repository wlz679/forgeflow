// P168 —— 「算完之后」决策支持的**共享实现**。
//
// 这个模块干什么
// --------------
// 引擎（尤其是 burn-rate）在自己的输出里写了一条 **💡 Tip** —— 一句
// **随输入变化**的行动建议（例如：净烧钱 > 5 时说「团队成本通常占毛烧钱
// 50-70%，要快速延长跑道，headcount 是最大的杠杆」；净烧钱不大时说的是
// 完全不同的另一句）。
//
// ⇒ 但渲染器把这一行**丢掉了**：
//   · 服务端：ResultCard 的 preserveTip 为 false 时整行剥掉；
//   · 客户端：内联脚本无条件 filter 掉含「💡 Tip:」的行。
// ⇒ 用户在静态示例里看得到它，**一点「计算」它就消失了** —— 而那恰恰是
//   最该给建议的时刻（用户刚填了自己的数字）。
//
// ⇒ 本模块负责把这一行**提取出来**，交给页面上的「🧭 算完之后」区块单独呈现。
//   ⭐ 客户端卡片本来就剥它 ⇒ **零重复**，这不是「复制一份」而是「搬家」。
//
// ⭐ 为什么是「提取」而不是「再算一遍」
//   提取是**视图**（view），不是第二份算法 ⇒ 引擎改了建议内容，页面自动跟随，
//   两边不可能漂。若在这里重写一遍算法，就会出现「引擎说 A、页面说 B」。
//
// ⭐ 为什么标记串放在这里（而不是各写各的）
//   客户端脚本（src/scripts/decision-support.client.ts）与服务端组件
//   （src/components/DecisionSupport.astro）都要用同一组标记 ⇒ 单一真相源。

/** 引擎输出里的决策建议标记（与引擎源码中的字面量一致） */
export const DECISION_MARKERS = {
  tip: '\u{1F4A1} Tip:',
} as const;

export interface DecisionLines {
  /** 「💡 Tip」那一行的正文（不含标记本身） */
  tip: string;
  /** ⭐ 结构化建议码（非结构化输出时为 ''） */
  tipCode: string;
  /** ⭐ 结构化建议的参数（非结构化输出时为 {}） */
  tipParams: Record<string, string>;
}

/**
 * 从引擎输出里取出决策建议。
 *
 * 引擎输出的形态是「多行文本，每行一个条目」，例如：
 *   💡 Tip: Team costs are typically 50-70% of gross burn ...
 *
 * ⇒ 按行扫描、按标记定位，取标记之后的部分。
 *
 * ⭐ 同时剥掉 markdown 粗体：引擎输出是**纯文本**（渲染进
 *   whitespace-pre-line 的卡片里），markdown 不会被解析 ⇒ 不剥的话
 *   用户会 literally 看到星号包裹的粗体符号。
 */
export function extractDecisionLines(output: string): DecisionLines {
  const tip = findLine(output, DECISION_MARKERS.tip);
  const parsed = parseDecisionTip(tip);
  return {
    tip,
    tipCode: parsed ? parsed.code : '',
    tipParams: parsed ? parsed.params : {},
  };
}

/** 输出里是否带得了决策建议（决定页面要不要渲染这个区块） */
export function hasDecisionLines(output: string): boolean {
  return Boolean(extractDecisionLines(output).tip);
}

/**
 * 把决策建议那一行**从输出里剥离掉**。
 *
 * ⭐ 为什么需要它（结构性去重，而不是靠 prop 开关）
 *   决策支持区块接管建议之后，结果卡片就**不该再显示同一条**。
 *   之前靠 `ResultCard` 的 `preserveTip` 开关来剥离 ⇒ 那是个「开关」，
 *   一旦某个引擎/某个语言的分支没走到，重复就回来了（而且**看不出来**）。
 *   ⇒ 改成：**根本不给卡片这条建议** —— 卡片拿到的文本里就没有它 ⇒ 零重复是结构性的。
 *
 * ⚠️ 必须**先剥离再翻译**：zh 页的 `translateCalcOutput` 会把「💡 Tip:」
 *   改写成「💡 提示:」⇒ 剥离必须发生在英文原文上，否则匹配不上。
 */
export function stripDecisionTip(output: string): string {
  if (!output) return output;
  const marker = DECISION_MARKERS.tip;
  return output
    .split('\n')
    .filter((line) => !line.includes(marker))
    .join('\n');
}

/** 解析出来的结构化建议（code + 参数） */
export interface DecisionTip {
  /** 语义码，如 'burn_high_burn'；与 locale 的 decision_tip.<code> 对应 */
  code: string;
  /** 插值参数（值一律按字符串处理） */
  params: Record<string, string>;
}

/**
 * 把「💡 Tip:」后面的文本解析成结构化建议。
 *
 * ⭐ 引擎输出的是 JSON：{"code":"burn_high_burn","params":{"ratio":"0.42"}}
 *   ⇒ 解析失败（不是 JSON / 没有 code）时返回 null，由调用方决定回退。
 * ⭐ **参数值一律 String()**：locale 的占位符插值是纯文本替换，
 *   数字与字符串没有区别 ⇒ 避免 3.2 与 "3.2" 两种写法在两侧不一致。
 */
export function parseDecisionTip(tip: string): DecisionTip | null {
  const raw = (tip || '').trim();
  if (!raw.startsWith('{')) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const obj = parsed as Record<string, unknown>;
  const code = typeof obj.code === 'string' ? obj.code.trim() : '';
  if (!code) return null;
  const params: Record<string, string> = {};
  const src = (obj.params ?? {}) as Record<string, unknown>;
  if (src && typeof src === 'object' && !Array.isArray(src)) {
    for (const [k, v] of Object.entries(src)) {
      if (v === null || v === undefined) continue;
      params[k] = String(v);
    }
  }
  return { code, params };
}

/**
 * 模板插值：{param} → 值（全部出现都替换）。
 *
 * ⭐ 服务端与客户端**共用这一份实现** ⇒ 两边不可能漂。
 */
export function fillTemplate(tmpl: string, params: Record<string, string>): string {
  if (!tmpl) return '';
  return Object.entries(params).reduce(
    (s, [k, v]) => s.replaceAll('{' + k + '}', String(v)),
    tmpl,
  );
}

function findLine(output: string, marker: string): string {
  if (!output) return '';
  for (const raw of output.split('\n')) {
    const line = raw.trim();
    const at = line.indexOf(marker);
    if (at < 0) continue;
    let text = line.slice(at + marker.length).trim();
    // 引擎输出里偶尔混进 markdown 粗体（纯文本渲染 ⇒ 符号会原样显示）
    text = text.replace(/\*\*/g, '');
    return text;
  }
  return '';
}

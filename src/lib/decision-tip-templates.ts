// P168 —— 决策建议**模板**的服务端侧：locale 里的 decision_tip.* 键。
//
// ⭐ 为什么单独一个模块（而不是塞进 src/lib/decision-support.ts）
//   decision-support.ts 是**客户端也要 import** 的纯逻辑模块；
//   而 locale（en.json 970KB + zh.json 944KB）一旦被它 import
//   ⇒ 每个工具页的客户端 bundle 会被拖进 1.9MB。
//   ⇒ 模板查找留在服务端；客户端只拿「服务端查好的模板表」（DOM 属性）。

import en from '../i18n/locales/en.json';
import zh from '../i18n/locales/zh.json';
import { translate } from '../i18n/translate-helper';
import { fillTemplate } from './decision-support';

export type TipLang = 'en' | 'zh';

/** locale 里存建议模板的键前缀 */
export const DECISION_TIP_KEY_PREFIX = 'decision_tip.';

const LOCALES: Record<TipLang, Record<string, string>> = { en, zh };

/** 该 locale 下全部建议模板（键去掉前缀） */
export function decisionTipTemplates(lang: TipLang): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(LOCALES[lang] ?? {})) {
    if (!k.startsWith(DECISION_TIP_KEY_PREFIX)) continue;
    out[k.slice(DECISION_TIP_KEY_PREFIX.length)] = v;
  }
  return out;
}

/** 给 DOM 属性用的 JSON 串：`<` 转义 ⇒ 不会截断 </script> */
export function decisionTipTemplatesJson(lang: TipLang): string {
  return JSON.stringify(decisionTipTemplates(lang)).replace(/</g, '\\u003c');
}

/**
 * 渲染一条建议。
 *
 * ⭐ zh 缺键时 `translate` 会**自动回退 en** ⇒ 页面显示英文而不是空的
 *   或裸的 code ⇒ 降级是内建的；守卫另外负责让缺键在 CI 里变红。
 * ⭐ 两个 locale 都缺 ⇒ 返回空串（不把键名渲染到页面上）。
 */
export function renderDecisionTip(
  code: string,
  params: Record<string, string>,
  lang: TipLang,
): string {
  if (!code) return '';
  const key = DECISION_TIP_KEY_PREFIX + code;
  const tmpl = translate(key, lang);
  if (tmpl === key) return '';
  return fillTemplate(tmpl, params);
}
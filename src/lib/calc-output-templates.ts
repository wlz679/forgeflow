// P168 B3-7 —— 计算结果模板的**服务端侧**：locale 里的 calc_out.* 键。
//
// ⭐ 与 src/lib/decision-tip-templates.ts 同构（B3-4 已验证的做法）：
//   · 服务端查 locale → 渲静态卡片；
//   · 同一张表的**子集**序列化进 DOM 属性 → 客户端 customFn 渲动态卡片。
//   ⇒ 静态中文、动态英文的分裂在结构上不可能发生。
//
// ⭐ 只注入**本工具用得到的子集**（共享 label/section + 本工具 row）
//   —— 100 个工具全量注入会让每个页面多带几十 KB。
//
// ⚠️ 本模块**只在服务端 import**（locale 有 1.9MB ⇒ 进了客户端 bundle 就是灾难）。
//    客户端只拿服务端查好的模板子集（DOM 属性），像 B3-4 那样。

import en from '../i18n/locales/en.json';
import zh from '../i18n/locales/zh.json';
import { CALC_OUTPUT_KEY_PREFIX } from './calc-output-i18n';

export type CalcOutLang = 'en' | 'zh';

const LOCALES: Record<CalcOutLang, Record<string, string>> = { en, zh };

/** slug → alias：去 'solopreneur-' 前缀 / '-calculator' 后缀，连字符换下划线 */
export function toolAlias(slug: string): string {
  return slug
    .replace(/^solopreneur-/, '')
    .replace(/-calculator$/, '')
    .replace(/-/g, '_');
}

/**
 * 该 lang 下、本工具要注入的模板子集。
 *
 * 组成：
 *   · calc_out.label.*    —— 跨工具共享的标签（全部）
 *   · calc_out.section.*  —— 跨工具共享的章节标题（全部）
 *   · calc_out.<alias>.*  —— 本工具独有的行码（全部）
 *
 * ⭐ 别的工具的 row **不注入** —— 客户端根本不会吐那些 code。
 */
export function calcOutputTemplates(lang: CalcOutLang, alias: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(LOCALES[lang] ?? {})) {
    if (!k.startsWith(CALC_OUTPUT_KEY_PREFIX)) continue;
    if (typeof v !== 'string') continue;
    const second = k.slice(CALC_OUTPUT_KEY_PREFIX.length).split('.')[0];
    if (second === 'label' || second === 'section' || second === alias) out[k] = v;
  }
  return out;
}

/** 给 DOM 属性用的 JSON 串：'<' 转义 ⇒ 不会截断 </script> */
export function calcOutputTemplatesJson(lang: CalcOutLang, alias: string): string {
  return JSON.stringify(calcOutputTemplates(lang, alias)).replace(/</g, '\\u003c');
}

// P168 —— 「🧭 算完之后」区块的**客户端**部分：把引擎刚算出来的
// 决策建议（💡 Tip）填进页面上的决策区块。
//
// ⭐ 为什么是这个文件而不是内联脚本
//   内联的 define:vars 脚本不能 import ⇒ 若把提取逻辑写进去，
//   就会与服务端组件形成**两份实现** ⇒ 两边会漂。
//   ⇒ 提取逻辑住在 src/lib/decision-support.ts（唯一实现），
//      本模块 import 它；服务端组件也 import 同一个文件 ⇒ 一份实现、两处调用。
//
// ⭐ 交接方式：CustomEvent
//   真正算出结果的是 [slug].astro 里那个内联脚本（它持有 clientConfig 与引擎函数）。
//   它算完后派发一个事件把**原始输出**交出来，本模块负责提取 + 渲染。
//   ⇒ 不需要在 window 上挂全局变量，也不需要共享可变状态。
//
// ⭐ 零重复
//   客户端的结果卡片**本来就**会剥掉 💡 Tip 那一行 ⇒ 建议搬到这里，
//   而不是被两边各显示一次。

import { extractDecisionLines, fillTemplate } from '../lib/decision-support';

/** 决策区块里「针对你这组数字」那块的容器 id */
const BOX_ID = 'decision-next-step';
/** 事件名（与 [slug].astro 内联脚本里派发的名字必须一致） */
export const DECISION_RESULT_EVENT = 'ffk:decision-result';

interface DecisionResultDetail {
  /** 引擎的原始输出（results[0]） */
  raw: string;
}

/** 从 DOM 读服务端注入的模板表（客户端 bundle 不带 locale） */
function readTemplates(box: HTMLElement): Record<string, string> {
  const raw = box.dataset.tipTemplates;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function render(box: HTMLElement, raw: string): void {
  const lines = extractDecisionLines(raw);
  if (!lines.tip) return;
  let text = lines.tip;
  if (lines.tipCode) {
    const tmpl = readTemplates(box)[lines.tipCode];
    // ⭐ 模板缺失 ⇒ 保留原文（守卫负责让缺键在 CI 里变红）
    if (tmpl) text = fillTemplate(tmpl, lines.tipParams);
  }

  box.innerHTML = '<p>' + escapeHtml(text) + '</p>';
  // 「示例」徽章只在展示示例数据时成立 ⇒ 换成用户自己的数字后要去掉
  const badge = box.parentElement?.querySelector('[data-decision-example-badge]');
  if (badge) badge.remove();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.addEventListener(DECISION_RESULT_EVENT, (event) => {
  const detail = (event as CustomEvent<DecisionResultDetail>).detail;
  if (!detail || typeof detail.raw !== 'string') return;
  const box = document.getElementById(BOX_ID);
  if (!box) return;
  render(box, detail.raw);
});

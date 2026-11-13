// P168 B3-7 —— 结果卡片的**客户端**部分：把 DOM 里的 token 换成中文模板。
//
// ⭐ 为什么是独立模块而不是内联脚本
//   内联的 define:vars 脚本不能 import ⇒ 若把渲染逻辑写进去，
//   就与服务端形成**两份实现** ⇒ 两边会漂。
//   ⇒ 渲染逻辑住在 src/lib/calc-output-i18n.ts（唯一实现），
//      本模块 import 它；服务端也 import 同一个文件 ⇒ 一份实现、两处调用。
//
// ⭐ 为什么用事件而不是直接改 DOM
//   内联脚本在 HTML 解析期执行（早于本模块加载）⇒ 事件会漏。
//   ⇒ 双保险：① 本模块加载时无条件扫一遍 #static-results / #dynamic-results；
//      ② 内联脚本在**动态卡片渲染完之后**派发事件 ⇒ 事件到达时本模块已就绪。
//
// ⭐ 模板表从 DOM 读（客户端 bundle 不带 locale）
//   与 B3-4 的 data-tip-templates 同一套路。

import { renderCalcOutput } from '../lib/calc-output-i18n';

/** 事件名（与 [slug].astro 内联脚本里派发的名字必须一致） */
export const CALC_OUTPUT_RENDERED_EVENT = 'ffk:calc-output-rendered';

interface RenderedDetail {
  /** 要处理的容器（静态卡片或动态卡片） */
  container?: HTMLElement | null;
}

/** 从 DOM 读服务端注入的模板表 */
function readTemplates(): Record<string, string> {
  const host = document.getElementById('static-results');
  const raw = host?.getAttribute('data-calc-output-templates');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/**
 * 把容器里的 token 换成模板文本。
 *
 * ⭐ 只处理**文本节点**：容器的 HTML 结构（h3 标题 / .font-mono 正文 /
 *   复制按钮的 data-copy 属性）都要一起换，否则用户复制出来的是裸 token。
 */
function renderContainer(container: HTMLElement, templates: Record<string, string>): void {
  if (!templates || Object.keys(templates).length === 0) return;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node = walker.nextNode();
  while (node) {
    textNodes.push(node as Text);
    node = walker.nextNode();
  }
  for (const t of textNodes) {
    const raw = t.nodeValue;
    if (!raw || !raw.includes('$calc_out.')) continue;
    t.nodeValue = renderCalcOutput(raw, templates);
  }

  // data-copy / data-export 里也可能有 token（复制/导出用的是原始文本）
  container.querySelectorAll('[data-copy], [data-export]').forEach((el) => {
    for (const attr of ['data-copy', 'data-export']) {
      const v = el.getAttribute(attr);
      if (v && v.includes('$calc_out.')) el.setAttribute(attr, renderCalcOutput(v, templates));
    }
  });
}

function renderAll(): void {
  const templates = readTemplates();
  if (!templates || Object.keys(templates).length === 0) return;
  for (const id of ['static-results', 'dynamic-results']) {
    const el = document.getElementById(id);
    if (el) renderContainer(el, templates);
  }
}

document.addEventListener(CALC_OUTPUT_RENDERED_EVENT, (event) => {
  const detail = (event as CustomEvent<RenderedDetail>).detail;
  const container = detail?.container ?? null;
  if (!container) {
    renderAll();
    return;
  }
  renderContainer(container, readTemplates());
});

// ⭐ 页面加载时扫一遍（内联脚本的静态卡片 beautify 早于本模块加载 ⇒ 事件会漏）
renderAll();

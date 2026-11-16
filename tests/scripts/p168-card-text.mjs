import { TOKENIZED } from './p168-tokenized-engines.mjs';

const Q=String.fromCharCode(34); const SQ=String.fromCharCode(39); const NL=String.fromCharCode(10);
/** 已令牌化的引擎（slug, file, alias）—— 真相源在 p168-tokenized-engines.mjs */
export const PILOT = TOKENIZED.map((e) => [e.slug, e.file, e.alias]);
/**
 * 找一个带指定属性标记的元素，返回它的**正文文本**。
 *
 * ⭐ 为什么必须按「引号状态」扫描标签结束位置（2026-11-13 实测踩坑）
 *   属性值里可能有 '>'（例：data-export 里装的是整段结果文本，含 'true ROI >= 100%'）
 *   ⇒ 用 indexOf('>') 找标签结束会**落在属性值里** ⇒ 正文被截断成 '= 100%; ...'。
 *   ⇒ 旧提取器还把整段 #static-results 当卡片 ⇒ 混进按钮文字（保存/复制/导出）。
 *
 * ⭐ 只取 data-history-result 那个元素（卡片正文）⇒ 不含按钮、不含属性值。
 */
function tagEnd(html, lt) {
  let k = lt + 1; let quote = '';
  while (k < html.length) {
    const c = html[k];
    if (quote) { if (c === quote) quote = ''; }
    else if (c === Q || c === SQ) quote = c;
    else if (c === '>') return k;
    k++;
  }
  return -1;
}
export function elementTextByMarker(html, marker) {
  const i = html.indexOf(marker);
  if (i < 0) return null;
  const lt = html.lastIndexOf('<', i);
  if (lt < 0) return null;
  const te = tagEnd(html, lt);
  if (te < 0) return null;
  let nameEnd = lt + 1;
  while (nameEnd < te && html[nameEnd] !== ' ' && html[nameEnd] !== '>') nameEnd++;
  const tagName = html.slice(lt + 1, nameEnd);
  const start = te + 1;
  const close = '<' + '/' + tagName + '>';
  const end = html.indexOf(close, start);
  return html.slice(start, end < 0 ? html.length : end);
}
export function staticCard(html) {
  const body = elementTextByMarker(html, 'data-history-result');
  if (body === null) return [];
  return body.split(NL).map((s) => s.trim()).filter(Boolean);
}
function hasCJK(s) {
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c >= 0x3400 && c <= 0x9fff) return true;
    if (c >= 0xf900 && c <= 0xfaff) return true;
    if (c >= 0x3040 && c <= 0x30ff) return true;
  }
  return false;
}
export function countCJK(s) {
  let n = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c >= 0x3400 && c <= 0x9fff) n++;
    else if (c >= 0xf900 && c <= 0xfaff) n++;
    else if (c >= 0x3040 && c <= 0x30ff) n++;
  }
  return n;
}
export function countEnglishWords(s) {
  let n = 0, run = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0);
    const isLetter = (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
    if (isLetter) { run++; }
    else { if (run >= 3) n++; run = 0; }
  }
  if (run >= 3) n++;
  return n;
}
export function isEnglishLine(line) {
  if (!line) return false;
  if (countCJK(line) > 2) return false;
  return countEnglishWords(line) >= 3;
}
export function hasBareToken(line) { return line.includes('$calc_out.'); }

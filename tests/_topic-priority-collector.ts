/**
 * P166 —— 主题页新形态区块的**收集器**（共享 helper，不是测试套件）。
 *
 * 为什么抽出来
 * ------------
 * 这个收集器有两个使用者：
 *   · tests/topic-priority-shape-guard.test.ts（build-dep）—— 查渲染产物
 *   · tests/topic-priority-collector-guard.test.ts（source-only）—— 查收集器自己
 *
 * 收集器的**能力本身**必须被断言（P165 实测过「只扫一层的收集器把 30/30 页
 * 判成缺」⇒ 收集器看不见 ≠ 没有）。而自检是纯逻辑、不需要 build ⇒ 把它放在
 * source-only 套件里，才能在每一次 pnpm check 里都跑。
 *
 * 关键设计：**按作用域查，不按整页查** —— 整页查会被别处的同域正确值当挡箭牌
 * （P165 实测过的坑）。定位方式 = 精确匹配某个 h2 的**文本**，再取到下一个 h2。
 */

export interface ExtractedTable {
  head: string[][];
  body: string[][];
}

/** 去标签 + 还原实体 + 压空白 */
export function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 从「文本恰好等于 heading 的那个 h2」起，取到下一个 h2 之前的片段。
 *
 * 用 h2 精确匹配（而不是整页 indexOf）⇒ 正文里恰好出现同样几个字不会误判。
 */
export function scopeAfterHeading(html: string, heading: string): string {
  const re = /<h2\b[^>]*>([\s\S]*?)<\/h2>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (stripTags(m[1]) === heading) {
      const next = html.indexOf('<h2', m.index + m[0].length);
      return next < 0 ? html.slice(m.index) : html.slice(m.index, next);
    }
  }
  return '';
}

/** 抽出作用域里第一个表格：表头行（th）与数据行（td）分开 */
export function extractTable(scope: string): ExtractedTable {
  const out: ExtractedTable = { head: [], body: [] };
  const tableMatch = scope.match(/<table\b[^>]*>([\s\S]*?)<\/table>/);
  if (!tableMatch) return out;
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/g;
  let row: RegExpExecArray | null;
  while ((row = rowRe.exec(tableMatch[1])) !== null) {
    const cells: string[] = [];
    const kinds: string[] = [];
    const cellRe = /<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/g;
    let cell: RegExpExecArray | null;
    while ((cell = cellRe.exec(row[1])) !== null) {
      kinds.push(cell[1]);
      cells.push(stripTags(cell[2]));
    }
    if (!cells.length) continue;
    if (kinds.some((k) => k === 'th')) out.head.push(cells);
    else out.body.push(cells);
  }
  return out;
}

/** 从「第 N 步 / Step N」里抠出编号 */
export function stepNumberOf(cell: string): number | null {
  const m = cell.match(/Step\s*(\d+)|第\s*(\d+)\s*步/);
  if (!m) return null;
  return Number(m[1] ?? m[2]);
}

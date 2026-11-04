// P166 —— 主题页新形态（B2：修复优先级表 / 达标清单）的实测体检。
//
// 为什么必须自己量（没有任何守卫覆盖这四件事）
// ------------------------------------------
// 1) 加厚量 —— 新形态给页面加了多少 info units？P165 的决策层有门槛（400），
//    新形态没有 ⇒ 不知道它是「加厚」还是「换皮」。
// 2) 新形态 vs 同页已有散文 —— P166 改案的**全部理由**是「定位表/门槛清单会与
//    howToUse / howToApply 重复」。改案之后这个主张**没有被验证过**：
//    新形态到底跟同页散文重合多少？重合高 = 改案白改。
// 3) 与同类别其它主题页的相似度（新增前/后） —— 加了新块之后，站内重复度是
//    升了还是降了？P165 在决策层上量到的是「降」。
// 4) ⭐ 组内模板词 —— AdSense 判低价值的核心指标之一就是「组内模板词占比」。
//    下一批要铺 42 个主题：如果这 3 个试点的新形态**彼此**已经是同一副骨架换皮，
//    那铺 42 个 = 造 42 份模板 = 直接把复审做砸。⇒ 铺之前必须先量。
//
// 跑法（必须从仓库根目录跑，且需要先 build）：
//   pnpm build
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p166-topic-priority-measure.ts
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { scopeAfterHeading, stripTags } from '../_topic-priority-collector.ts';
import { TOPIC_PRIORITY_CONTENT } from '../../src/data/topic-priority/index.ts';

const HEADING = {
  en: { benchmark: 'What to fix first', guide: 'Readiness checklist' },
  zh: { benchmark: '先修哪个', guide: '达标清单' },
} as const;

const LANGS0 = ['en', 'zh'] as const;

/**
 * ⭐ 主题名单**从构建产物里派生**，不手写清单。
 *
 * 为什么：P166 试点时手写 3 个 id 是对的（当时只有 3 个）。铺开到 45 个主题后，
 *   手写清单 = **第二份真相源**（P164 的教训：开了第二份清单 ⇒ 既有守卫当场变红），
 *   而且「清单漏了一个主题」在这个工具里是**静默**的 —— 它只量自己那 3 个，
 *   剩下的 42 个主题页里的模板词问题根本不会被量到。
 *
 * ⇒ 改成：扫 dist/<lang>/<cat>/<topic>-<form>/index.html，凡是**含这个区块标题**
 *   的页面就算数 ⇒ 工具量的永远是「实际渲染了新形态的页面」，与代码里的名单无关。
 */
function discoverPages(lang: string, form: 'benchmark' | 'guide'): { id: string; cat: string }[] {
  const out: { id: string; cat: string }[] = [];
  const langDir = join('dist', lang);
  if (!existsSync(langDir)) return out;
  for (const cat of readdirSync(langDir)) {
    const catDir = join(langDir, cat);
    if (!existsSync(catDir) || !statSync(catDir).isDirectory()) continue;
    for (const entry of readdirSync(catDir)) {
      if (!entry.endsWith('-' + form)) continue;
      const id = entry.slice(0, -(form.length + 1));
      const file = join(catDir, entry, 'index.html');
      if (!existsSync(file)) continue;
      if (!readFileSync(file, 'utf-8').includes(HEADING[lang as 'en' | 'zh'][form])) continue;
      out.push({ id, cat });
    }
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

const LANGS = ['en', 'zh'] as const;
const FORMS = ['benchmark', 'guide'] as const;

/** 该主题**内容字符串**里的裸单价个数（注释不算）。 */
function contentBarePrices(topicId: string): number {
  const p = TOPIC_PRIORITY_CONTENT[topicId];
  if (!p) return 0;
  let n = 0;
  const walk = (v: unknown): void => {
    if (typeof v === 'string') {
      n += (v.match(/\$[0-9][0-9,.]*/g) || []).length;
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (v && typeof v === 'object') {
      Object.values(v as Record<string, unknown>).forEach(walk);
    }
  };
  walk(p);
  return n;
}

function mainOf(html: string): string {
  const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return m ? m[1]! : html;
}
function shingles(text: string, n = 5): Set<string> {
  const tokens = [
    ...text.matchAll(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]|[A-Za-z0-9][A-Za-z0-9'’\-]*/g),
  ].map((m) => m[0]!.toLowerCase());
  const out = new Set<string>();
  for (let i = 0; i + n <= tokens.length; i++) out.add(tokens.slice(i, i + n).join(' '));
  return out;
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const g of a) if (b.has(g)) inter++;
  return inter / (a.size + b.size - inter);
}
/** CJK-aware info units：1 汉字 ≈ 2 英文字符（口径与 p165-decision-layer-verify 相同） */
function infoUnits(s: string): number {
  let cjk = 0;
  let latin = 0;
  for (const m of s.matchAll(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]+|[A-Za-z0-9][A-Za-z0-9'’\-]*/g)) {
    if (/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]/.test(m[0]!)) cjk += m[0]!.length;
    else latin += 1;
  }
  return latin + cjk / 2;
}
function med(xs: number[]): number {
  return xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
}

function pagePath(lang: string, cat: string, topic: string, form: string): string {
  return join('dist', lang, cat, topic + '-' + form, 'index.html');
}
function otherTopicPages(lang: string, cat: string, selfTopic: string): string[] {
  const out: string[] = [];
  const dir = join('dist', lang, cat);
  if (!existsSync(dir)) return out;
  for (const topic of readdirSync(dir)) {
    if (!topic.endsWith('-benchmark') && !topic.endsWith('-guide') && !topic.endsWith('-compare')) continue;
    const bare = topic.replace(/-(benchmark|guide|compare)$/, '');
    if (bare === selfTopic) continue;
    const p = join(dir, topic, 'index.html');
    if (existsSync(p)) out.push(p);
  }
  return out;
}

let problems = 0;
const templateStats: Record<string, { texts: string[]; labels: string[] }> = {};

console.log('='.repeat(84));
console.log('P166 —— 新形态实测：加厚量 / 与同页散文的重合 / 站内相似度 / 组内模板词 / 价格');
console.log('='.repeat(84));

for (const lang of LANGS) {
  for (const form of FORMS) {
    const heading = HEADING[lang][form];
    const blocks: { label: string; text: string; sh: Set<string>; cat: string }[] = [];
    const rows: string[] = [];

    console.log('\n' + '-'.repeat(84));
    console.log(`【${lang} / ${form}】区块标题：${heading}`);
    console.log('-'.repeat(84));
    console.log('页面                          加厚units  vs同页散文  vs同类别(前)  vs同类别(后)  派生价  手写价  死链');

    const pages = discoverPages(lang, form);
    if (pages.length === 0) {
      console.log('  （dist 里没找到含这个区块的页面 — 先 pnpm build）');
      problems++;
      continue;
    }
    for (const p of pages) {
      const file = pagePath(lang, p.cat, p.id, form);
      if (!existsSync(file)) {
        console.log(p.id.padEnd(28) + '  产物缺失');
        problems++;
        continue;
      }
      const html = readFileSync(file, 'utf-8');
      const main = mainOf(html);
      const scope = scopeAfterHeading(html, heading);
      if (!scope) {
        console.log(p.id.padEnd(28) + '  找不到区块');
        problems++;
        continue;
      }
      const newText = stripTags(scope);
      const restText = stripTags(main.replace(scope, ' '));
      const units = infoUnits(newText);
      const selfSim = jaccard(shingles(newText), shingles(restText)) * 100;

      // 与同类别其它主题页的相似度：新增前（去掉新区块）vs 新增后（整页）
      const others = otherTopicPages(lang, p.cat, p.id);
      const afterSh = shingles(stripTags(main));
      const beforeSh = shingles(restText);
      let beforeMax = 0;
      let afterMax = 0;
      for (const op of others) {
        const oSh = shingles(stripTags(mainOf(readFileSync(op, 'utf-8'))));
        beforeMax = Math.max(beforeMax, jaccard(beforeSh, oSh) * 100);
        afterMax = Math.max(afterMax, jaccard(afterSh, oSh) * 100);
      }

      // ⭐ 价格判据要分清「产物」与「源码」——
      //   产物里出现 $1.25 是**正常**的：那正是 live token 解析出来的真值
      //   （{{liveIn:...}} → $1.25）。手写单价才是缺陷，而它只存在于**源码**里。
      //   ⇒ 这里只**报告**产物里的派生价格数（给人看），不判它为问题；
      //     真正的「手写单价」检查在下面的源码扫描里做。
      const derivedPrices = (newText.match(/\$[0-9][0-9,.]*/g) || []).length;
      // 源码里的手写单价（真缺陷）—— 只扫内容字符串，不扫整个源文件。
      //   教训（第四次撞同一族）：每个主题文件的**头部注释**会引用被禁的形状当作反例
      //   （形如「不写成裸 $5M」）⇒ 扫源文件会把这个**规则说明**当成违规。
      //   ⇒ 判据要落在**要判的那部分**上：内容字符串（渲染出去的那些）。
      const handTyped = contentBarePrices(p.id);
      // 死链：新区块里的 href 是否都指向已构建页面
      const hrefs = [...scope.matchAll(/href="([^"]+)"/g)].map((m) => m[1]!);
      let dead = 0;
      for (const h of hrefs) {
        if (!h.startsWith('/')) continue;
        const target = join('dist', h.replace(/^\//, ''), 'index.html');
        if (!existsSync(target)) dead++;
      }

      rows.push(
        p.id.padEnd(28) +
          String(Math.round(units)).padStart(9) +
          (selfSim.toFixed(2) + '%').padStart(12) +
          (beforeMax.toFixed(2) + '%').padStart(13) +
          (afterMax.toFixed(2) + '%').padStart(13) +
          String(derivedPrices).padStart(8) +
          String(handTyped).padStart(8) +
          String(dead).padStart(6),
      );
      blocks.push({ label: p.id, text: newText, sh: shingles(newText), cat: p.cat });
      if (handTyped > 0) { console.log('  ⚠ 源码里有 ' + handTyped + ' 处手写单价：' + p.id); problems++; }
      if (dead > 0) { console.log('  ⚠ 死链 ' + dead + ' 个：' + p.id); problems++; }
    }
    for (const r of rows) console.log(r);

    // ---- 组内模板词：同形态、不同主题的新形态之间 ----
    if (blocks.length >= 2) {
      const pairs: { a: string; b: string; v: number }[] = [];
      for (let i = 0; i < blocks.length; i++) {
        for (let j = i + 1; j < blocks.length; j++) {
          pairs.push({ a: blocks[i]!.label, b: blocks[j]!.label, v: jaccard(blocks[i]!.sh, blocks[j]!.sh) * 100 });
        }
      }
      const vals = pairs.map((x) => x.v);
      // ★ 配对数随主题数增长而膨胀 ⇒ 中位值比旧版更有意义（它不会被新增的配对抬高）。
      const all = new Map<string, number>();
      for (const b of blocks) for (const g of b.sh) all.set(g, (all.get(g) ?? 0) + 1);
      let total = 0;
      let shared = 0;
      for (const b of blocks) {
        for (const g of b.sh) {
          total++;
          if ((all.get(g) ?? 0) > 1) shared++;
        }
      }
      console.log(
        `  组内模板词：两两相似度 min ${Math.min(...vals).toFixed(2)}% / 中位 ${med(vals).toFixed(2)}% / max ${Math.max(...vals).toFixed(2)}%  |  模板词份额（出现在 ≥2 个主题里的 5-gram）= ${((shared / total) * 100).toFixed(2)}%`,
      );
      // ★ 45 个主题 ⇒ 两两配对数 = 990 ⇒ 全打印会消盖真正的结论，
      //   只打印最高的 15 对（高相似度的那几对才值得看）。
      const sortedPairs = pairs.sort((a, b) => b.v - a.v);
      for (const pr of sortedPairs.slice(0, 15)) {
        console.log(`    ${pr.v.toFixed(2)}%  ${pr.a} × ${pr.b}`);
      }
      if (sortedPairs.length > 15) {
        console.log(`    （其余 ${sortedPairs.length - 15} 对相似度更低，未展示）`);
      }
      templateStats[lang + '/' + form] = { texts: blocks.map((b) => b.text), labels: blocks.map((b) => b.label) };

      // ★ 同类别内部的模板词（真正的对照）：
      //   全局一桶 45 个主题的互相似度里混着**同类别共用词汇**（如「库存」「流量」），
      //   这不是「换皮」（换皮是全站一套骨架）。同类别内部两两相似度才是「同类主题里是否真的一套话」。
      //   ⇒ 额外报一个「同类别内」的两两相似度，作为供应评审的真实数字。
      const byCat = new Map<string, typeof blocks>();
      for (const b of blocks) {
        const arr = byCat.get(b.cat) ?? [];
        arr.push(b);
        byCat.set(b.cat, arr);
      }
      const catPairs: { v: number; a: string; b: string; cat: string }[] = [];
      for (const [cat, arr] of byCat) {
        if (arr.length < 2) continue;
        for (let i = 0; i < arr.length; i++) {
          for (let j = i + 1; j < arr.length; j++) {
            catPairs.push({
              v: jaccard(arr[i]!.sh, arr[j]!.sh) * 100,
              a: arr[i]!.label,
              b: arr[j]!.label,
              cat,
            });
          }
        }
      }
      if (catPairs.length) {
        const cv = catPairs.map((x) => x.v);
        console.log(
          `  同类别内部（真正的换皮对照）：两两相似度 min ${Math.min(...cv).toFixed(2)}% / 中位 ${med(cv).toFixed(2)}% / max ${Math.max(...cv).toFixed(2)}%（${catPairs.length} 对）`,
        );
        for (const pr of catPairs.sort((a, b) => b.v - a.v).slice(0, 5)) {
          console.log(`    ${pr.v.toFixed(2)}%  [${pr.cat}] ${pr.a} × ${pr.b}`);
        }
      }
    }
  }
}

console.log('\n' + '='.repeat(84));
console.log(problems === 0 ? '结论：0 个问题（手写单价 0 / 死链 0 / 区块缺失 0）' : '结论：' + problems + ' 个问题');
console.log('='.repeat(84));

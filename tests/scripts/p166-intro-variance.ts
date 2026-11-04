// P166 —— 主题页新形态「导语模板化」体检工具。
//
// 为什么要有这个工具（第五次撞同一族的延伸）
// ----------------------------------------------
// P166 铺开 45 个主题后，实测量到：
//   · zh 达标清单**导语**的组内模板词份额 = 34.08%（正文只有 6.81%）
//   · en 达标清单导语 = 26.54%（正文 2.12%）
//   · 页面级：新增「达标清单」区块后，与同类别其它主题页的最大相似度
//     在 44/45 页上**上升**（zh 平均 +1.16 个百分点）
// ⇒ 根因不是正文写得像，是**导语复用同一副骨架**：
//   zh「指南的N步说的是做什么，这张清单说的是什么算做完了」
//      「下面每一行都是今天就能对着自己的X核对的数量」…
//   en「the gates below as stop-lines」「if a step fails its gate, the next step waits」
//
// ⭐ 为什么这不是「池子变大」的假象（已实测排除）
//   · 同池对照：既有散文（howToApply+keyConcepts）在同一个 45 主题池里只有 6.98%
//   · 池子效应实测：同一批文本，池子 3→45，份额 3.88%→11.04%（会涨，但不是全部）
//   ⇒ 导语的 34% 是**真模板**，不是池子效应。
//
// 工具形状
// --------
// 报四件事：
//   ① 导语单独的模板词份额（en/zh × benchmark/guide）
//   ② 导语两两相似度最高的若干对（指出哪两个主题像）
//   ③ **导语开头重复**：开头前 N 字相同的组（最直接的「同一副骨架」证据）
//   ④ 样板句式命中数（「今天就能」「if a step fails its gate」这类通用句式）
//
// 跑法（必须从仓库根目录跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p166-intro-variance.ts
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p166-intro-variance.ts --strict
//     ↑ --strict：份额超过阈值时返回退出码 1（给 CI 用）
//
// ⚠️ 文件名**不能**带 .test.ts —— tests/build-dep-suites.mjs 的 walkTestSuites 只收
//    *.test.ts / *.test.mjs，带了会让套件计数漂移。
import { TOPIC_PRIORITY_CONTENT } from '../../src/data/topic-priority/index.ts';

const NL = String.fromCharCode(10);
const LANGS = ['en', 'zh'] as const;
const FORMS = ['benchmark', 'guide'] as const;

/** 上限：导语模板词份额（实测：修复前 zh/guide 34.08%、en/guide 26.54%；既有散文同池 6.98%） */
const MAX_INTRO_SHARE = { en: 12, zh: 14 } as const;

/** 导语开头多少字算「同一个开头」（用于抓「同一副骨架」） */
const OPENING_CHARS = 16;

/**
 * ⭐ 一个样板句式要**几个主题**命中才算「模板」？
 *
 * 只命中 1 个主题 = 那一句只是碰巧这么写 ⇒ **不是模板**。
 * 命中 ≥3 个主题 = 同一副骨架在复用 ⇒ 才是模板。
 *
 * ⚠️ 教训（第四次撞同一族）：规则比需求更严会把编辑逼向错误形态 ——
 *   把「命中 1 次」也判成问题，等于逼作者为了躲开一个词而绕着弯写。
 */
const MIN_TOPICS_FOR_BOILERPLATE = 3;

function shingles(text: string, n = 5): string[] {
  const tokens = [
    ...text.matchAll(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]|[A-Za-z0-9][A-Za-z0-9'\u2019\-]*/g),
  ].map((m) => m[0]!.toLowerCase());
  const out: string[] = [];
  for (let i = 0; i + n <= tokens.length; i++) out.push(tokens.slice(i, i + n).join(' '));
  return out;
}

function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sb = new Set(b);
  let inter = 0;
  for (const g of a) if (sb.has(g)) inter++;
  return inter / (a.length + b.length - inter);
}

/** 一批文本里「出现在 ≥2 个文本中的 n-gram」占全部 n-gram 的份额。 */
function templateShare(texts: string[]): { pct: number; shared: number; total: number } {
  const counts = new Map<string, number>();
  const per = texts.map((t) => {
    const g = shingles(t);
    for (const x of g) counts.set(x, (counts.get(x) ?? 0) + 1);
    return g;
  });
  let total = 0;
  let shared = 0;
  for (const g of per) {
    for (const x of g) {
      total++;
      if ((counts.get(x) ?? 0) > 1) shared++;
    }
  }
  return { pct: total ? (shared / total) * 100 : 0, shared, total };
}

/**
 * ⭐ 样板句式清单 —— 「这一类主题该写什么」的通用骨架。
 * 命中说明写的是**关于这个形态本身**的话，而不是关于这个主题的话。
 * 这是「导语换皮」最直接的证据，所以单独列出来报。
 */
const BOILERPLATE_PATTERNS: { lang: 'en' | 'zh'; label: string; re: RegExp }[] = [
  { lang: 'zh', label: '「今天就能…」', re: /今天就能|今天能|今天可以/ },
  { lang: 'zh', label: '「不达标别往下走」', re: /不达标别往下走/ },
  { lang: 'zh', label: '「这张清单说的是什么算做完了」', re: /这张清单说的是|这份清单说的是/ },
  { lang: 'zh', label: '「下面每一行都是…」', re: /下面每一行都是|下面每条都是|下面每一行/ },
  { lang: 'zh', label: '「统一一套口径」', re: /统一一套口径|统一口径/ },
  { lang: 'zh', label: '「按依赖关系排序」', re: /按依赖关系排/ },
  { lang: 'en', label: '"today"', re: /\btoday\b/i },
  { lang: 'en', label: '"a number you can check"', re: /a number you can check/i },
  { lang: 'en', label: '"if a step fails its gate"', re: /if a step fails its gate/i },
  { lang: 'en', label: '"as a scorecard"', re: /as a scorecard/i },
  { lang: 'en', label: '"the order below is a dependency order"', re: /the order below is a dependency order/i },
  { lang: 'en', label: '"the table below is ordered by"', re: /the table below is ordered by/i },
];

function introOf(id: string, lang: 'en' | 'zh', form: 'benchmark' | 'guide'): string {
  const p = TOPIC_PRIORITY_CONTENT[id];
  if (!p) return '';
  return form === 'benchmark' ? p.fixPriority[lang].intro : p.readinessChecklist[lang].intro;
}

function main(): void {
  const strict = process.argv.slice(2).indexOf('--strict') >= 0;
  const ids = Object.keys(TOPIC_PRIORITY_CONTENT).sort();
  const out: string[] = [];
  const p = (s: string): void => {
    out.push(s);
  };
  const problems: string[] = [];

  p('='.repeat(78));
  p('P166 —— 导语模板化体检（组内模板词 / 开头重复 / 样板句式）');
  p('='.repeat(78));
  p('主题数：' + ids.length);
  p('');

  for (const lang of LANGS) {
    for (const form of FORMS) {
      const texts = ids.map((id) => introOf(id, lang, form));
      const share = templateShare(texts);

      p('-'.repeat(78));
      p('【' + lang + ' / ' + form + '】导语模板词份额 = ' + share.pct.toFixed(2) +
        '%（上限 ' + MAX_INTRO_SHARE[lang] + '%）｜ 5-gram 总 ' + share.total + ' / 共享 ' + share.shared);
      if (share.pct > MAX_INTRO_SHARE[lang]) {
        problems.push(
          lang + '/' + form + '：导语模板词份额 ' + share.pct.toFixed(2) + '% > 上限 ' + MAX_INTRO_SHARE[lang] +
          '% ⇒ 导语在复用同一副骨架',
        );
        p('  [错误] 超过上限 ⇒ 导语在复用同一副骨架');
      } else {
        p('  [OK] 在上限内');
      }

      // —— 开头重复（同一副骨架的直接证据）——
      const openings = new Map<string, string[]>();
      ids.forEach((id, i) => {
        const key = (texts[i] ?? '').trim().slice(0, OPENING_CHARS);
        if (!key) return;
        const arr = openings.get(key) ?? [];
        arr.push(id);
        openings.set(key, arr);
      });
      const dupOpenings = [...openings.entries()].filter((e) => e[1].length > 1);
      if (dupOpenings.length) {
        p('  ⚠ 开头前 ' + OPENING_CHARS + ' 字重复的组（' + dupOpenings.length + ' 组）：');
        for (const [key, group] of dupOpenings) {
          p('    ' + JSON.stringify(key) + '  →  ' + group.join(', '));
        }
      } else {
        p('  [OK] 没有两个主题的导语开头相同');
      }

      // —— 两两相似度最高的若干对 ——
      const pairs: { a: string; b: string; v: number }[] = [];
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const gi = shingles(texts[i] ?? '');
          const gj = shingles(texts[j] ?? '');
          pairs.push({ a: ids[i]!, b: ids[j]!, v: jaccard(gi, gj) * 100 });
        }
      }
      pairs.sort((x, y) => y.v - x.v);
      p('  两两相似度最高 5 对：');
      for (const pr of pairs.slice(0, 5)) {
        p('    ' + pr.v.toFixed(2) + '%  ' + pr.a + ' × ' + pr.b);
      }

      // —— 样板句式 ——
      const bp = BOILERPLATE_PATTERNS.filter((b) => b.lang === lang);
      const hits: { label: string; ids: string[] }[] = [];
      for (const b of bp) {
        const hit = ids.filter((id) => b.re.test(introOf(id, lang, form)));
        if (hit.length >= MIN_TOPICS_FOR_BOILERPLATE) hits.push({ label: b.label, ids: hit });
      }
      if (hits.length) {
        p('  ⚠ 样板句式命中：');
        for (const h of hits) {
          p('    ' + h.label + '  → ' + h.ids.length + ' 个主题（≥' + MIN_TOPICS_FOR_BOILERPLATE + '）：' +
            h.ids.slice(0, 8).join(', ') + (h.ids.length > 8 ? ' …' : ''));
          problems.push(
            lang + '/' + form + '：样板句式 ' + h.label + ' 命中 ' + h.ids.length + ' 个主题的导语',
          );
        }
      } else {
        p('  [OK] 没有样板句式命中 ≥' + MIN_TOPICS_FOR_BOILERPLATE + ' 个主题');
      }
      p('');
    }
  }

  p('='.repeat(78));
  p(problems.length === 0 ? '结论：0 个问题（导语未模板化）' : '结论：' + problems.length + ' 个问题');
  for (const pr of problems) p('  · ' + pr);
  p('='.repeat(78));

  process.stdout.write(out.join(NL) + NL);
  if (strict && problems.length > 0) process.exitCode = 1;
}

main();

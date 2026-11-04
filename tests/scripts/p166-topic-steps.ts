// P166 —— 铺开工具：打印某个主题的既有散文摘要 + howToApply 的 Step 编号。
//
// 为什么需要它
// ------------
// 达标清单（readinessChecklist）的 step 编号必须与该主题 howToApply 的
// Step 编号**集合相等**（守卫硬性断言）。铺 42 个主题时每个作者都要先知道
// 「我这个主题有几步」⇒ 提供一个一条命令就能查的工具，而不是让人去翻
// 980 KB 的 topic-content.ts。
//
// 跑法（必须从仓库根目录跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p166-topic-steps.ts
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p166-topic-steps.ts mrr-growth-strategies
import { TOPIC_GUIDE_CONTENT, TOPIC_BENCHMARK_CONTENT } from '../../src/data/topic-content.ts';
import { TOPICS } from '../../src/data/topics.ts';

const LANGS = ['en', 'zh'] as const;

function stepNumbers(text: string, lang: 'en' | 'zh'): number[] {
  const re = lang === 'en' ? /Step\s+(\d+)/g : /步骤\s*(\d+)/g;
  const seen: number[] = [];
  for (const m of text.matchAll(re)) {
    const n = Number(m[1]);
    if (!seen.includes(n)) seen.push(n);
  }
  return seen.sort((a, b) => a - b);
}

function excerpt(text: string | undefined, max = 400): string {
  if (!text) return '(无)';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

const wanted = process.argv[2];
const targets = wanted
  ? TOPICS.filter((t) => t.id === wanted)
  : TOPICS.filter((t) => t.tier === 1);

if (wanted && targets.length === 0) {
  console.error('找不到主题：' + wanted);
  process.exit(1);
}

for (const topic of targets) {
  const guide = (TOPIC_GUIDE_CONTENT as Record<string, any>)[topic.id];
  const bench = (TOPIC_BENCHMARK_CONTENT as Record<string, any>)[topic.id];
  const enSteps = stepNumbers(guide?.en?.howToApply ?? '', 'en');
  const zhSteps = stepNumbers(guide?.zh?.howToApply ?? '', 'zh');
  const same = JSON.stringify(enSteps) === JSON.stringify(zhSteps);

  console.log('='.repeat(84));
  console.log(`【${topic.id}】 letter=${topic.letterId} tier=${topic.tier}`);
  console.log(`  howToApply 步骤编号：en=${JSON.stringify(enSteps)} zh=${JSON.stringify(zhSteps)} ${same ? '（一致 ✓）' : '（⚠️ 不一致！）'}`);
  console.log(`  ⇒ 达标清单必须正好 ${enSteps.length} 项，step = ${JSON.stringify(enSteps)}`);
  console.log('  --- 既有 howToUse（基准页 · 单指标→单动作）en ---');
  console.log('  ' + excerpt(bench?.en?.howToUse));
  console.log('  --- 既有 howToUse zh ---');
  console.log('  ' + excerpt(bench?.zh?.howToUse));
  console.log('  --- 既有 howToApply（指南页 · Step 链）en ---');
  console.log('  ' + excerpt(guide?.en?.howToApply, 1400));
  console.log('  --- 既有 keyConcepts（指南页 · 概念）en ---');
  console.log('  ' + excerpt(guide?.en?.keyConcepts, 800));
  console.log('');
}

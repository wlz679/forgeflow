import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

// P168 —— 变异台子：证明 adsense-hardening-guard 的断言**真的在测**。
//
// 为什么需要它
// ------------
// 「守卫全绿」≠「守卫真的在测」。这一批守卫守的是「日期有没有写死」
// 与「文案够不够厚」—— 这两类断言天生容易变成「永远绿」：
//   · 正则写太宽 ⇒ 真正的写死日期也抓不到；
//   · 阈值定太低 ⇒ 文案被掏空一半仍然绿。
// ⇒ 本台子把源文件**真的改坏**，看守卫是否红。
//
// 纪律（沿用 P166/P167 的台子，并加严两处）
// ----------------------------------------
//   · 快照 → 每轮开头还原 → 收尾**无条件**还原；
//   · 变异必须真的改变文件（否则判 INVALID，不计 SURVIVED）；
//   · 基线必须先绿（否则是台子自己的问题）。
//   · ⭐ **隔离规则**：每条变异必须只让**一条**断言变红（台子会核对
//     失败断言的名字，不只是「有东西红了」）—— 否则一条变异同时触发
//     多条规则，就测不出到底哪条在承重。
//   · ⭐ 还原后做 **sha256 逐字节校验**，确认仓库回到原样。
//
// ⚠️ 本台子会**临时改写仓库里的源文件** ⇒ 不要接进 pnpm check。
//
// 跑法（必须从仓库根目录跑）：
//   node tests/scripts/mutate-p168-adsense-hardening.mjs

const ROOT = process.cwd();
const NL = String.fromCharCode(10);

const TARGETS = [
  'src/components/CategoryHero.astro',
  'src/lib/content-review-dates.ts',
  'src/pages/[lang]/about.astro',
  'src/pages/[lang]/saas-metrics.astro',
  'src/i18n/locales/en.json',
  'src/i18n/locales/zh.json',
  'src/data/review-dates.json',
];

const backups = new Map();
for (const t of TARGETS) backups.set(t, readFileSync(join(ROOT, t)));

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

/** 同步睡眠（毫秒）—— 台子要保证「还原」一定跑完，所以不能用异步 API */
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * 带重试的写入。
 *
 * ⭐ 为什么必须重试（实测踩到）：Windows 上「刚被某个进程写过的文件」
 *   会在几百毫秒内被系统索引 / 杀软短暂独占，此刻 open() 返回
 *   UV_UNKNOWN(-4094)。第一次跑这个台子时，它直接崩在还原步骤上，
 *   **把变异留在了仓库里**（about.astro 的 dateModified 被改成了字面量）。
 *   ⇒ 还原必须：① 重试 ② 每个文件独立容错（一个失败不掩盖其它文件）
 *     ③ 收尾无条件执行 + sha256 校验（失败要报出来，不能吞掉）。
 */
function writeWithRetry(p, data, attempts) {
  const n = attempts || 25;
  let lastErr;
  for (let i = 0; i < n; i++) {
    try {
      writeFileSync(p, data);
      return;
    } catch (e) {
      lastErr = e;
      sleepSync(40);
    }
  }
  throw lastErr;
}

/** 还原全部快照；返回写入失败的文件列表（不抛异常，避免掩盖其它问题） */
function restore() {
  const failed = [];
  for (const [f, buf] of backups) {
    try {
      writeWithRetry(join(ROOT, f), buf);
    } catch (e) {
      failed.push(f + ' (' + (e && e.code ? e.code : 'unknown') + ')');
    }
  }
  return failed;
}

/** 还原后必须与原始快照逐字节一致 */
function restoreAndVerify() {
  const writeErrors = restore();
  const bad = [];
  for (const [f, buf] of backups) {
    try {
      const now = readFileSync(join(ROOT, f));
      if (sha256(now) !== sha256(buf)) bad.push(f);
    } catch (e) {
      bad.push(f + ' (读不出来: ' + (e && e.code ? e.code : 'unknown') + ')');
    }
  }
  return { writeErrors, bad };
}

function runGuard() {
  try {
    const out = execFileSync(
      'node',
      ['node_modules/tsx/dist/cli.mjs', '--test', '--test-concurrency=1', 'tests/adsense-hardening-guard.test.ts'],
      { encoding: 'utf8', cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: String(e.stdout ?? '') + String(e.stderr ?? '') };
  }
}

/** 从 TAP 输出里取出失败的断言名 */
function failedAssertions(out) {
  const names = [];
  for (const line of out.split(NL)) {
    const m = line.match(/^not ok \d+ - (.+)$/);
    if (m) names.push(m[1].trim());
  }
  return names;
}

/** 把某个 i18n 命名空间的所有值改成极短文本（保持文件格式不变） */
function gutNamespace(file, prefix) {
  const p = join(ROOT, file);
  const s = readFileSync(p, 'utf8');
  const re = new RegExp(
    '^(\\s*"' + prefix.replace('.', '\\.') + '[^"]*":\\s*)"(?:[^"\\\\]|\\\\.)*"(,?)$',
    'gm',
  );
  const out = s.replace(re, (m, p1, p2) => p1 + '"Short."' + p2);
  if (out === s) throw new Error('命名空间锚点未命中：' + prefix);
  const changed = (s.match(re) || []).length;
  if (changed === 0) throw new Error('命名空间没有可改的行：' + prefix);
  writeWithRetry(p, out);
}

const MUTATIONS = [
  {
    id: 'M1',
    desc: 'CategoryHero 把派生日期换回写死字面量',
    expect: 'P168 分类页日期：15 个分类页与 CategoryHero 的 frontmatter 里没有写死的 ISO 日期',
    apply: () => {
      const p = join(ROOT, 'src/components/CategoryHero.astro');
      const s = readFileSync(p, 'utf8');
      const out = s.replace(
        'const lastReviewed = getCategoryReviewDate(categoryId);',
        "const lastReviewed = '2026-07-31';",
      );
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
  {
    id: 'M2',
    desc: 'CategoryHero 不再 import 共享真值源',
    expect: 'P168 分类页日期：CategoryHero 走共享真值源，且不再自己从 ToolMeta 派生',
    apply: () => {
      const p = join(ROOT, 'src/components/CategoryHero.astro');
      const s = readFileSync(p, 'utf8');
      const out = s.replace(
        "import { getCategoryReviewDate } from '../lib/content-review-dates';",
        "import { getCategoryReviewDate } from '../lib/not-the-shared-source';",
      );
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
  {
    id: 'M3',
    desc: 'about.astro 的 dateModified 改回写死字面量',
    expect: 'P168 about/terms：dateModified 必须是派生值，不是写死的字面量',
    apply: () => {
      const p = join(ROOT, 'src/pages/[lang]/about.astro');
      const s = readFileSync(p, 'utf8');
      const out = s.replace('dateModified: getSiteReviewDate(),', "dateModified: '2026-01-01',");
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
  {
    id: 'M4',
    desc: 'saas-metrics 分类页不再传 categoryId',
    expect: 'P168 分类页日期：15 个分类页都把 categoryId 传给 CategoryHero',
    apply: () => {
      const p = join(ROOT, 'src/pages/[lang]/saas-metrics.astro');
      const s = readFileSync(p, 'utf8');
      const out = s.replace('      categoryId={CATEGORY_ID}' + NL, '');
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
  {
    id: 'M5',
    desc: 'B 类 FAQ 把输入价写回字面量',
    expect: 'P168 B 类 FAQ：文案里没有手写价格，也没有手写日期',
    apply: () => {
      const p = join(ROOT, 'src/i18n/locales/en.json');
      const s = readFileSync(p, 'utf8');
      const out = s.replace('{{liveIn:openai/gpt-4o}}', '$2.50');
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
  {
    id: 'M6',
    desc: 'B 类 FAQ 的 token 指向另一个模型（价格对不上数据集）',
    expect: 'P168 B 类 FAQ：解析后的价格与日期 == 价格数据集真值',
    apply: () => {
      const p = join(ROOT, 'src/i18n/locales/en.json');
      const s = readFileSync(p, 'utf8');
      const out = s.replace('{{liveIn:openai/gpt-4o}}', '{{liveIn:openai/gpt-4o-mini}}');
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
  {
    id: 'M7',
    desc: 'about.astro 的代码里重新写死旧的审阅日期',
    expect: 'P168 旧日期字面量不得复现：src/pages 与 src/components 里不能再出现 2026-06-22',
    apply: () => {
      const p = join(ROOT, 'src/pages/[lang]/about.astro');
      const s = readFileSync(p, 'utf8');
      const out = s.replace(
        'const lang = getLang(Astro);',
        "const lang = getLang(Astro);" + NL + "const legacyReviewDate = '2026-06-22';",
      );
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
  {
    id: 'M8',
    desc: 'contact 英文文案被掏空',
    expect: 'P168 contact 页：英文文案量达标（不是空壳页）',
    apply: () => gutNamespace('src/i18n/locales/en.json', 'contact.'),
  },
  {
    id: 'M9',
    desc: 'terms 英文文案被掏空',
    expect: 'P168 terms 页：英文文案量达标',
    apply: () => gutNamespace('src/i18n/locales/en.json', 'legal.terms.'),
  },
  {
    id: 'M10',
    desc: 'contact 中文文案被掏空',
    expect: 'P168 contact 页：中文文案量达标（不是空壳页）',
    apply: () => gutNamespace('src/i18n/locales/zh.json', 'contact.'),
  },
  {
    id: 'M11',
    desc: 'terms 中文文案被掏空',
    expect: 'P168 terms 页：中文文案量达标',
    apply: () => gutNamespace('src/i18n/locales/zh.json', 'legal.terms.'),
  },
  {
    id: 'M12',
    desc: '共享真值源少导出一个函数',
    expect: 'P168 共享真值源：content-review-dates 模块存在并导出全部派生函数',
    apply: () => {
      const p = join(ROOT, 'src/lib/content-review-dates.ts');
      const s = readFileSync(p, 'utf8');
      const out = s.replace('export function getSiteReviewDate(', 'function getSiteReviewDate(');
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
  {
    id: 'M13',
    desc: '分类级派生日期整体退回到 ToolMeta 之前（比真值源旧）',
    expect: 'P168 派生日期：15 个分类都有合法日期，且不早于该分类 ToolMeta 里的最新日期',
    apply: () => {
      const p = join(ROOT, 'src/lib/content-review-dates.ts');
      const s = readFileSync(p, 'utf8');
      const out = s.replace(
        '  return { ...DATA.categories };',
        "  return Object.fromEntries(Object.keys(DATA.categories).map((k) => [k, '2026-01-01']));",
      );
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
  {
    id: 'M14',
    desc: '工具级派生日期整体退回到旧日期',
    expect: 'P168 派生日期：每个工具都有合法日期，且不早于它自己的 ToolMeta 日期',
    apply: () => {
      const p = join(ROOT, 'src/lib/content-review-dates.ts');
      const s = readFileSync(p, 'utf8');
      // ⭐ 注意：不能只把 map 的初值改旧 —— 散文循环会把值覆盖回去，
      //   那样这条变异就是**无效变异**（台子会报 SURVIVED，但守卫其实没被测到）。
      //   要改的是「写进去的值」本身。
      const out = s.replace(
        '  for (const r of readProseReviewRecords()) map.set(r.slug, r.dataReviewedAt);',
        "  for (const r of readProseReviewRecords()) map.set(r.slug, '2026-01-01');",
      );
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
  {
    id: 'M15',
    desc: '生成物 review-dates.json 与散文 frontmatter 漂移',
    expect: 'P168 生成物不许漂移：review-dates.json 与散文 frontmatter 一致',
    apply: () => {
      const p = join(ROOT, 'src/data/review-dates.json');
      const s = readFileSync(p, 'utf8');
      // 只改 siteDate：分类/工具日期不动 ⇒ 只有「漂移」这一条断言会红，
      // 不会顺带把「分类日期不早于 ToolMeta」那条也带红（那就测不出谁在承重）。
      const out = s.replace('"siteDate": "2026-10-30"', '"siteDate": "2026-11-01"');
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
];

let killed = 0;
let survived = 0;
let invalid = 0;
let notIsolated = 0;

try {
  const base = runGuard();
  if (!base.ok) {
    console.log('基线就没绿 —— 先修守卫（守卫或台子有问题）。');
    console.log(base.out.slice(-2000));
    process.exit(1);
  }
  console.log('基线绿 ✓');
  console.log('');

  for (const m of MUTATIONS) {
    // ⭐ 还原失败必须立刻停下：否则上一轮的变异会叠加到下一轮，
    //   台子就变成了「在污染的仓库上测」—— 结论全部作废。
    const restoreErrs = restore();
    if (restoreErrs.length) {
      console.log('还原失败，台子停止：' + restoreErrs.join(', '));
      process.exitCode = 1;
      break;
    }
    try {
      m.apply();
    } catch (e) {
      console.log('[' + m.id + '] INVALID — ' + e.message);
      invalid++;
      survived++;
      continue;
    }
    const res = runGuard();
    if (!res.ok) {
      const failed = failedAssertions(res.out);
      if (failed.length === 1 && failed[0] === m.expect) {
        killed++;
        console.log('[' + m.id + '] KILLED ✓ — ' + m.desc);
      } else {
        notIsolated++;
        survived++;
        console.log(
          '[' + m.id + '] RED-BUT-NOT-ISOLATED — ' + m.desc +
            '（红了，但失败的断言是：' + (failed.join(' / ') || '(未识别)') + '）',
        );
      }
    } else {
      survived++;
      console.log('[' + m.id + '] ✗ SURVIVED — ' + m.desc);
    }
  }
} finally {
  const { writeErrors, bad } = restoreAndVerify();
  if (writeErrors.length) {
    console.log('');
    console.log('还原时写入失败（重试后仍失败）：' + writeErrors.join(', '));
    process.exitCode = 1;
  }
  if (bad.length) {
    console.log('');
    console.log('还原校验失败（sha256 不一致）：' + bad.join(', '));
    process.exitCode = 1;
  }
  if (!writeErrors.length && !bad.length) {
    console.log('');
    console.log('还原校验 ✓ 逐字节一致');
  }
}

console.log('');
console.log('KILLED ' + killed + ' · SURVIVED ' + survived + ' · INVALID ' + invalid + ' · 未隔离 ' + notIsolated);
process.exitCode = survived > 0 ? 1 : 0;

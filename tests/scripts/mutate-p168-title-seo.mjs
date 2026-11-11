#!/usr/bin/env node
// P168 B3-2 / B3-5 —— title-seo-guard + title-query-alignment-guard 的变异台子
// （8 条变异，每条只红一条断言）。
//
// 为什么需要它
// ------------
// 守卫 tests/title-seo-guard.test.ts 有 7 条断言（①键齐全 ②长度 ③无年份/品牌
// ④词组完整 ⑤en/zh 结构对齐 ⑥og:title 边界 ⑦<title> 绑定），
// tests/title-query-alignment-guard.test.ts 另有 1 条（★查询词命中）。
// 「断言存在」不等于「断言承重」：判据写太松 ⇒ 真实缺陷抓不到；断言之间职责没切干净
// ⇒ 一条变异污染多条 ⇒ 看红灯时分不清是哪条规则被破坏。
// ⇒ 本台子把源文件**真的改坏**，看守卫是否红，并且要求**每条变异只红一条断言**
//   （核对失败断言的**名字**，不只是「有东西红了」）。
//
// 纪律（沿用 P166/P167/P168 B3-1 的台子）
// ----------------------------------------
//   · 快照 → 每轮开头还原 → 收尾**无条件**还原 + sha256 逐字节校验；
//   · 变异必须真的改变文件（否则判 INVALID，不算 SURVIVED）；
//   · 基线必须先绿，否则拒绝开跑；
//   · ⭐ **快照闸门**：磁盘快照自愈会**回滚「上次跑台子之后的正常改动」**
//      ⇒ 发现旧快照且没有 P168_ALLOW_RECOVER ⇒ **拒绝开跑并打印指引**
//      （宁可停下报告，也不要静默回滚别人的改动）；
//   · ⭐ 写操作带**重试**：Windows 上刚被写过的文件会被系统索引短暂独占
//      （UV_UNKNOWN / EBUSY / EPERM）⇒ 台子崩在还原步骤会把变异留在仓库里。
//
// ⚠️ 本台子会**临时改写仓库里的源文件**（en.json / zh.json / BaseLayout.astro）
//    ⇒ 不要接进 pnpm check。
//
// 跑法（从仓库根跑）：
//   node tests/scripts/mutate-p168-title-seo.mjs
//   node tests/scripts/mutate-p168-title-seo.mjs T1,T3     # 只跑指定变异

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const TMP = join(ROOT, 'tmp');
const SNAPSHOT = join(TMP, 'title-seo-harness-backup.json');
const GUARD_REL = 'tests/title-seo-guard.test.ts';
const GUARD = join(ROOT, GUARD_REL);
// ⭐ P168 B3-5：新增「查询词 ↔ 标题」守卫（独立文件，职责不同 ⇒ 不能混进 title-seo-guard）
//   ⇒ 台子必须**同时**跑两个守卫文件，否则 T8 变异不会被任何断言看见。
const GUARD_REL_2 = 'tests/title-query-alignment-guard.test.ts';
const GUARD_2 = join(ROOT, GUARD_REL_2);

// ⭐ 还原目标清单：台子会临时改写的**每一个**文件都必须在这里 ——
//   收尾的 sha256 逐字节校验是「这些文件一个都没被留下改动」的凭据。
const TARGETS = [
  'src/i18n/locales/en.json',
  'src/i18n/locales/zh.json',
  'src/layouts/BaseLayout.astro',
  // ⭐ T7 要改 <title> 的绑定 ⇒ 必须进还原清单，否则收尾的 sha256 校验漏掉它
  'src/pages/[lang]/[slug].astro',
];

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** 带重试的写入（Windows：刚被写过的文件会被系统索引短暂独占） */
function writeWithRetry(p, data) {
  let lastErr;
  for (let i = 0; i < 25; i++) {
    try {
      if (typeof data === 'string') writeFileSync(p, data, 'utf8');
      else writeFileSync(p, data);
      return;
    } catch (e) {
      lastErr = e;
      const code = e && e.code;
      if (
        code !== 'UV_UNKNOWN' &&
        code !== 'EBUSY' &&
        code !== 'EPERM' &&
        code !== 'EACCES'
      ) {
        throw e;
      }
      sleepSync(40);
    }
  }
  throw lastErr;
}

/** 读磁盘快照（base64 映射）；不存在 / 坏掉 / 非对象 ⇒ null */
function readSnapshot() {
  if (!existsSync(SNAPSHOT)) return null;
  try {
    const obj = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    return obj;
  } catch {
    return null;
  }
}

function writeSnapshot(map) {
  const obj = {};
  for (const [rel, buf] of map) obj[rel] = buf.toString('base64');
  writeWithRetry(SNAPSHOT, JSON.stringify(obj));
}

// ⭐⭐ **崩溃安全 + 快照闸门**
// 台子被硬杀（运行时中断 / 断电 / Ctrl-C）时，收尾的还原不会执行 ⇒
//   **变异会留在仓库里** ⇒ 每次开跑前先看磁盘快照。
// 但快照存的是「**上次跑台子那一刻**」的内容，不是「仓库真值」⇒
//   自动恢复会把「上次跑台子之后的正常改动」一起回滚掉。
// ⇒ 发现旧快照且**没有** P168_ALLOW_RECOVER ⇒ **拒绝开跑并打印指引**
//   （宁可停下报告，也不要静默回滚别人的改动）。
function recoverFromDiskBackup() {
  // ⚠️ 闸门判据 = **磁盘上存在快照文件**（不看内容）：
  //   「存在」本身就说明上次跑台子没跑完 ⇒ 里面的内容是「上次那一刻」的，
  //   自动恢复会连带回滚之后的正常改动 ⇒ 必须由人拍板（P168_ALLOW_RECOVER）。
  if (!existsSync(SNAPSHOT)) return;
  if (!process.env.P168_ALLOW_RECOVER) {
    console.log('⛔ 发现上次的台子快照，但**没有** P168_ALLOW_RECOVER ⇒ 拒绝自动恢复。');
    console.log('   原因：快照是「上次跑台子那一刻」的内容 ⇒ 自动恢复会把');
    console.log('   「上次跑台子之后的正常改动」一起回滚掉（实测吞掉过 24 个 locale 键）。');
    console.log('   ⇒ 先 git status 核对工作区；确认后再跑：');
    console.log('     $env:P168_ALLOW_RECOVER=1; node tests/scripts/mutate-p168-title-seo.mjs');
    console.log('   或确认无需恢复后**删除**该快照文件（台子每次成功收尾都会自己删）。');
    console.log('     ' + SNAPSHOT);
    process.exit(1);
  }
  const snap = readSnapshot();
  if (!snap) {
    console.log('⚠️ 快照文件存在但内容不可读 ⇒ 跳过恢复（不猜内容）。');
    return;
  }
  const entries = Object.entries(snap);
  if (entries.length === 0) {
    console.log('ℹ 快照文件是空的（明确无需恢复）⇒ 继续跑。');
    return;
  }
  let restored = 0;
  for (const [rel, b64] of entries) {
    if (!TARGETS.includes(rel)) continue; // 只还原台子自己动过的文件
    try {
      const buf = Buffer.from(b64, 'base64');
      const now = readFileSync(join(ROOT, rel));
      if (!now.equals(buf)) {
        writeWithRetry(join(ROOT, rel), buf);
        restored++;
      }
    } catch {
      /* 逐文件容错：一个失败不掩盖其它 */
    }
  }
  console.log(
    restored > 0
      ? '⚠️ 发现上次未完成的台子快照 ⇒ 已恢复 ' + restored + ' 个文件（变异曾留在仓库里）。'
      : 'ℹ 快照与当前磁盘内容一致 ⇒ 无需恢复。',
  );
}

// ⚠️ 顺序很重要：**先自愈，再取快照** —— 否则 backups 里存的是「被污染的内容」，
//   收尾的还原就会把污染还原回去（等于白恢复）。
recoverFromDiskBackup();

const backups = new Map();
for (const rel of TARGETS) backups.set(rel, readFileSync(join(ROOT, rel)));
mkdirSync(TMP, { recursive: true });
writeSnapshot(backups);

/** 还原全部快照；返回写入失败的文件列表（不抛异常，避免掩盖其它问题） */
function restoreAll() {
  const failed = [];
  for (const [rel, buf] of backups) {
    try {
      writeWithRetry(join(ROOT, rel), buf);
    } catch (e) {
      failed.push(rel + ' (' + (e && e.code ? e.code : 'unknown') + ')');
    }
  }
  return failed;
}

/** 还原后的逐字节校验（sha256 全等 ⇒ 内容与快照完全一致） */
function verifyAll() {
  const bad = [];
  for (const [rel, buf] of backups) {
    try {
      if (sha256(readFileSync(join(ROOT, rel))) !== sha256(buf)) bad.push(rel);
    } catch {
      bad.push(rel + ' (读不出来)');
    }
  }
  return bad;
}

/** 改一个目标文件。transform 必须真的改变内容，否则判 INVALID（锚点没命中）。 */
function patchTarget(rel, transform) {
  const p = join(ROOT, rel);
  const before = readFileSync(p, 'utf8');
  const after = transform(before);
  if (after === before) throw new Error('锚点未命中（文件内容没变）: ' + rel);
  if (rel.endsWith('.json')) {
    try {
      JSON.parse(after.replace(/^\uFEFF/, ''));
    } catch (e) {
      throw new Error('变异后 JSON 非法: ' + e.message);
    }
  }
  writeWithRetry(p, after);
}

/** 跑守卫（source-only ⇒ 不需要 rebuild） */
function runGuard() {
  try {
    const out = execFileSync(
      'node',
      ['node_modules/tsx/dist/cli.mjs', '--test', '--test-concurrency=1', GUARD_REL, GUARD_REL_2],
      { encoding: 'utf8', cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: String(e.stdout ?? '') + String(e.stderr ?? '') };
  }
}

/** 从 TAP 输出里取出失败的断言名（not ok N - <name>） */
function failedAssertions(out) {
  const names = [];
  for (const line of out.split(/\r?\n/)) {
    const m = line.match(/^not ok \d+ - (.+)$/);
    if (m) names.push(m[1].trim());
  }
  return names;
}

/**
 * 从守卫源码里解析出 7 条断言的名字（**不手抄** —— 守卫改名时台子不会误判）
 * 用 ①…⑦ 标记定位，避免依赖顺序。
 */
function guardAssertionNames() {
  const src = [GUARD, GUARD_2]
    .filter((p) => existsSync(p))
    .map((p) => readFileSync(p, 'utf8'))
    .join('\n');
  const names = [];
  const re = /test\(\s*'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    names.push(m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
  }
  return names;
}

const ASSERTIONS = guardAssertionNames();

function assertionName(marker) {
  const hit = ASSERTIONS.filter((n) => n.indexOf(marker) >= 0);
  if (hit.length !== 1) {
    console.log('守卫里找不到唯一的断言 ' + marker + '（找到 ' + hit.length + ' 条）⇒ 台子停止。');
    console.log('解析到的断言：');
    for (const n of ASSERTIONS) console.log('  · ' + n);
    process.exit(1);
  }
  return hit[0];
}

// ⭐ 锚点写法：正则**必须限定在目标 key 的那一行** ——
//   否则像 'CAC Calculator' 这种片段会命中**别的工具**的 title。
//   例：'("tools\.solopreneur-cac-calculator\.seoTitle":\s*")([^"]*)(")'。
const MUTATIONS = [
  {
    id: 'T1',
    desc: 'en 的 CAC seoTitle 被加长到 115 字符（超出 SERP 桌面展示上限）',
    marker: '②',
    apply: () => {
      patchTarget('src/i18n/locales/en.json', (s) =>
        s.replace(
          /("tools\.solopreneur-cac-calculator\.seoTitle":\s*")([^"]*)(")/,
          (m, a, val, b) => a + val + ' X'.repeat(40) + b,
        ),
      );
    },
  },
  {
    id: 'T2',
    desc: 'zh 的烧钱率 seoTitle 末尾加回年份（2026）—— 97% 进不了 SERP',
    marker: '③',
    apply: () => {
      patchTarget('src/i18n/locales/zh.json', (s) =>
        s.replace(
          /("tools\.solopreneur-burn-rate-calculator\.seoTitle":\s*")([^"]*)(")/,
          (m, a, val, b) => a + val + '（2026）' + b,
        ),
      );
    },
  },
  {
    id: 'T3',
    desc: 'en 的流失率 seoTitle 关键词段被整段换掉（保留「 — 」分段但词组不匹配）',
    marker: '④',
    apply: () => {
      patchTarget('src/i18n/locales/en.json', (s) =>
        s.replace(
          /("tools\.solopreneur-churn-rate-calculator\.seoTitle":\s*")([^"]*)(")/,
          (m, a, val, b) => a + 'Churn Rate Calculator — Retention Cohort Snapshot' + b,
        ),
      );
    },
  },
  {
    id: 'T4',
    desc: 'en 的 GDPR 罚款 seoTitle 键被删掉（页面会静默回落长名）',
    marker: '①',
    apply: () => {
      patchTarget('src/i18n/locales/en.json', (s) =>
        s.replace(
          /^[ \t]*"tools\.solopreneur-gdpr-fine-calculator\.seoTitle":[^\n]*\r?\n/m,
          '',
        ),
      );
    },
  },
  {
    id: 'T5',
    desc: 'en 的 OpenAI Token seoTitle 加了「 — 」分段而 zh 没有（结构不对齐）',
    marker: '⑤',
    apply: () => {
      patchTarget('src/i18n/locales/en.json', (s) =>
        s.replace(
          /("tools\.solopreneur-openai-token-calculator\.seoTitle":\s*")([^"]*)(")/,
          (m, a, val, b) => a + val + ' — Token Pricing Breakdown' + b,
        ),
      );
    },
  },
  {
    id: 'T6',
    desc: 'BaseLayout 的 og:title 不再独立（回落 <title>）⇒ 分享卡片标题跟着变短',
    marker: '⑥',
    apply: () => {
      patchTarget('src/layouts/BaseLayout.astro', (s) =>
        s.replace(
          'og:title" content={ogTitle ?? title}',
          'og:title" content={title}',
        ),
      );
    },
  },
  {
    id: 'T7',
    desc: '[slug].astro 的 <title> 绑定回退成长名（title={toolTitle}）⇒ 整个瘦身效果静默丢失',
    marker: '⑦',
    apply: () => {
      patchTarget('src/pages/[lang]/[slug].astro', (s) =>
        s.replace(
          /<BaseLayout\b[^>]*\btitle=\{seoTitle\}/,
          (m) => m.replace('title={seoTitle}', 'title={toolTitle}'),
        ),
      );
    },
  },
  {
    id: 'T8',
    desc: 'zh 的流失率 seoTitle 丢掉查询词「订阅流失率」⇒ 标题不再命中用户真实查询（排名进前 10 却 0 点击）',
    marker: 'B3-5',
    apply: () => {
      patchTarget('src/i18n/locales/zh.json', (s) =>
        s.replace(
          '"tools.solopreneur-churn-rate-calculator.seoTitle": "订阅流失率计算器 — 免费追踪客户与收入流失"',
          '"tools.solopreneur-churn-rate-calculator.seoTitle": "流失率计算器 — 免费追踪客户与收入流失"',
        ),
      );
    },
  },
];

// ⭐⭐⭐ **负对照**（negative control）—— 台子自己的「隔离判定」也要被证明有效。
//   没有它，「KILLED N」这句话本身可以是**假绿**：假如隔离检查写错了
//   （比如只看「有没有红」而不看「红了哪几条」），台子照样会把每条变异都报成 KILLED。
//   ⇒ 负对照**故意让两条断言同时红** ⇒ 台子必须报 RED-BUT-NOT-ISOLATED
//      并且把整轮 exitCode 置 1 ⇒ 证明它**抓得住**未隔离。
const NEGATIVE_CONTROL_MUTATION = {
  id: 'NEG',
  desc: '负对照：同时破坏两条断言（② 超长 + ③ 残留年份）',
  apply: () => {
    patchTarget('src/i18n/locales/en.json', (s) =>
      s.replace(
        /("tools\.solopreneur-cac-calculator\.seoTitle":\s*")([^"]*)(")/,
        (m, a, val, b) => a + val + ' X'.repeat(40) + b,
      ),
    );
    patchTarget('src/i18n/locales/zh.json', (s) =>
      s.replace(
        /("tools\.solopreneur-burn-rate-calculator\.seoTitle":\s*")([^"]*)(")/,
        (m, a, val, b) => a + val + '（2026）' + b,
      ),
    );
  },
};

// ⭐ 迭代开关：node tests/scripts/mutate-p168-title-seo.mjs T1,T3
const ONLY = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  : null;

// ⭐ 负对照开关：node tests/scripts/mutate-p168-title-seo.mjs --negative-control
//   （或 $env:P168_NEGATIVE_CONTROL=1）⇒ 只跑负对照那一条变异。
const NEGATIVE_CONTROL =
  process.argv.includes('--negative-control') || process.env.P168_NEGATIVE_CONTROL === '1';

let killed = 0;
let survived = 0;
let invalid = 0;
let notIsolated = 0;
let exitCode = 0;

try {
  console.log('守卫断言（从 ' + GUARD_REL + ' 解析）：');
  for (const n of ASSERTIONS) console.log('  · ' + n);
  console.log('');

  const base = runGuard();
  if (!base.ok) {
    console.log('基线就没绿 —— 先修守卫。');
    console.log(base.out.slice(-2000));
    exitCode = 1;
  } else {
    console.log('基线绿 ✓');
    console.log('');

    if (NEGATIVE_CONTROL) {
      // ===== ⭐⭐ 负对照模式（--negative-control）=====
      console.log('【负对照模式】故意让**两条**断言同时红 ⇒ 台子必须报 RED-BUT-NOT-ISOLATED 并把整轮 exitCode 置 1。');
      console.log('   理由：「KILLED N」这句话本身可以是**假绿** —— 若隔离检查写错了');
      console.log('   （只看「有没有红」而不看「红了哪几条」），台子照样会把每条变异都报成 KILLED。');
      console.log('');
      const neg = NEGATIVE_CONTROL_MUTATION;
      try {
        neg.apply();
      } catch (e) {
        console.log('[NEG] INVALID — ' + e.message);
        exitCode = 1;
      }
      if (exitCode === 0) {
        const res = runGuard();
        const failed = res.ok ? [] : failedAssertions(res.out);
        // ⭐ 判定：必须看到**≥ 2 条**失败（这就是「未隔离」的形状）。
        if (!res.ok && failed.length >= 2) {
          notIsolated++; // 复用台子自己的计数 ⇒ 整轮 exitCode 会变成 1
          console.log('[NEG] RED-BUT-NOT-ISOLATED ✓ — ' + neg.desc);
          console.log('        失败的断言（' + failed.length + ' 条）：' + failed.join(' / '));
          const harnessExit = survived || invalid || notIsolated ? 1 : 0;
          if (harnessExit === 1) {
            console.log('');
            console.log('✅ 负对照 OK —— 台子确实识别出了未隔离（并且会把整轮 exitCode 置 1）⇒ 隔离判定本身有效。');
          } else {
            console.log('');
            console.log('❌ 负对照失败 —— 台子识别出了未隔离却没有把 exitCode 置 1。');
            exitCode = 1;
          }
        } else {
          console.log('[NEG] ❌ 负对照失败 —— 故意让两条断言同时红，台子却只看到 ' + failed.length + ' 条失败（期望 ≥ 2）');
          console.log('        ⇒ 隔离判定可能失效（它可能只看「有没有红」而不看「红了哪几条」）。');
          exitCode = 1;
        }
      }
    } else {
      for (const m of MUTATIONS) {
        if (ONLY && !ONLY.includes(m.id)) continue;
        const expect = assertionName(m.marker);
        // ⭐ 还原失败必须立刻停下：否则上一轮的变异会叠加到下一轮，
        //   台子就变成了「在污染的仓库上测」—— 结论全部作废。
        const restoreErrs = restoreAll();
        if (restoreErrs.length) {
          console.log('还原失败，台子停止：' + restoreErrs.join(', '));
          exitCode = 1;
          break;
        }
        try {
          m.apply();
        } catch (e) {
          console.log('[' + m.id + '] INVALID — ' + e.message);
          invalid++;
          continue;
        }
        const res = runGuard();
        if (!res.ok) {
          const failed = failedAssertions(res.out);
          // ⭐ 隔离规则：必须**恰好一条**失败，且**名字等于**期望的那条。
          if (failed.length === 1 && failed[0] === expect) {
            killed++;
            console.log('[' + m.id + '] KILLED ✓ — ' + m.desc);
            console.log('        失败断言：' + failed[0]);
          } else {
            notIsolated++;
            console.log(
              '[' + m.id + '] RED-BUT-NOT-ISOLATED — ' + m.desc +
                '（失败的断言：' + (failed.join(' / ') || '(未识别)') +
                '；期望：' + expect + '）',
            );
          }
        } else {
          survived++;
          console.log('[' + m.id + '] ✗ SURVIVED — ' + m.desc + '（守卫没红 ⇒ 判据抓不到）');
        }
      }
    }
  }
} finally {
  // ⭐ 无条件还原 + 逐字节校验
  const writeErrors = restoreAll();
  const bad = verifyAll();
  // ⭐ 收尾删掉快照文件（闸门判据是「文件存在」⇒ 留着它下次开跑会被拦住）。
  //   B3-1 用「覆盖写 {}」是因为它的闸门看内容；本台子的闸门看存在性 ⇒ 只能删。
  try {
    rmSync(SNAPSHOT, { force: true });
  } catch {
    console.log('⚠️ 收尾删除快照文件失败 ⇒ 下次开跑会被闸门拦住（请手动清空）：' + SNAPSHOT);
  }
  if (writeErrors.length) {
    console.log('');
    console.log('还原时写入失败：' + writeErrors.join(', '));
    exitCode = 1;
  }
  if (bad.length) {
    console.log('');
    console.log('还原校验失败（sha256 不一致）：' + bad.join(', '));
    exitCode = 1;
  }
  if (!writeErrors.length && !bad.length) {
    console.log('');
    console.log('还原校验 ✓ 逐字节一致');
  }
}

console.log('');
if (NEGATIVE_CONTROL) {
  // ⭐ 负对照模式**自己**的退出码：证明成立 ⇒ 0（证明失败 ⇒ 已在上面置 1）。
  //   注意与正常模式相反：正常模式里「出现未隔离」是**失败**（exit 1）；
  //   负对照模式里「成功识别出未隔离」才是**成功**（exit 0）。
  console.log('负对照：未隔离被识别 = ' + (notIsolated ? '是 ✓' : '否 ✗'));
} else {
  console.log('KILLED ' + killed + ' · SURVIVED ' + survived + ' · INVALID ' + invalid + ' · 未隔离 ' + notIsolated);
  if (survived || invalid || notIsolated) exitCode = 1;
}
process.exitCode = exitCode;


import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

// P168 —— 变异台子：证明决策支持的守卫**真的在测**。
//
// 为什么需要它
// ------------
// 这一批守卫守的是「决策区块渲染出来了」「建议没有重复」「中文没有跑回英文页」
// 这类断言 —— 它们天生容易变成「永远绿」：
//   · 判定写太松 ⇒ 真实缺陷抓不到；
//   · 阈值定太低 ⇒ 内容被掏空一半仍然绿。
// ⇒ 本台子把源文件**真的改坏**，看守卫是否红。
//
// 纪律（沿用 P166/P167/P168 的台子，并加严两处）
// --------------------------------------------
//   · 快照 → 每轮开头还原 → 收尾**无条件**还原 + sha256 逐字节校验；
//   · 变异必须真的改变文件（否则判 INVALID，不计 SURVIVED）；
//   · 基线必须先绿。
//   · ⭐ **隔离规则**：每条变异必须只让**一条**断言变红（台子核对失败断言
//     的名字，不只是「有东西红了」）—— 否则一条变异同时触发多条规则，
//     就测不出到底哪条在承重。
//   · ⭐ 写操作带**重试**：Windows 上刚被写过的文件会被系统索引短暂独占，
//     open() 返回 UV_UNKNOWN(-4094) ⇒ 台子崩在还原步骤会把变异留在仓库里。
//
// ⚠️ 本台子会**临时改写仓库里的源文件** ⇒ 不要接进 pnpm check。
//
// 跑法（必须从仓库根目录跑）：
//   node tests/scripts/mutate-p168-decision-support.mjs

const ROOT = process.cwd();
const NL = String.fromCharCode(10);

const TARGETS = [
  'src/lib/decision-support.ts',
  'src/pages/[lang]/[slug].astro',
  'src/i18n/locales/en.json',
  'src/i18n/locales/zh.json',
  'src/engines/saas/burn-rate-calculator.ts',
];

// ⭐⭐ **崩溃安全**：把快照写到磁盘 —— 台子被硬杀（运行时中断 / 断电 / Ctrl-C）时
//   收尾的 restore() 不会执行 ⇒ **变异会留在仓库里**（实测踩到两次：
//   一次留下 `decisionRender = true`，一次留下 dist/ 被清空到一半）。
//   ⇒ 每次开跑前先检查磁盘快照：存在就说明上次没跑完 ⇒ **先恢复再开跑**。
//   （用「覆盖同一个文件」而不是删除 —— 避免依赖删除操作。）
const BACKUP_FILE = join(ROOT, 'tmp', 'decision-support-harness-backup.json');

function writeBackupFile() {
  const obj = {};
  for (const [f, buf] of backups) obj[f] = buf.toString('base64');
  writeFileSync(BACKUP_FILE, JSON.stringify(obj));
}

function recoverFromDiskBackup() {
  if (!existsSync(BACKUP_FILE)) return false;
  let obj;
  try {
    obj = JSON.parse(readFileSync(BACKUP_FILE, 'utf8'));
  } catch (e) {
    return false;
  }
  let restored = 0;
  for (const [f, b64] of Object.entries(obj)) {
    try {
      const buf = Buffer.from(b64, 'base64');
      const now = readFileSync(join(ROOT, f));
      if (!now.equals(buf)) {
        writeWithRetry(join(ROOT, f), buf);
        restored++;
      }
    } catch (e) { /* 逐文件容错：一个失败不掩盖其它 */ }
  }
  if (restored > 0) {
    console.log('⚠️ 发现上次未完成的台子快照 ⇒ 已恢复 ' + restored + ' 个文件（变异曾留在仓库里）。');
    console.log('   （台子被硬杀时收尾的还原不会执行 ⇒ 这是设计上的兜底）');
  }
  return true;
}

// ⚠️ 顺序很重要：**先自愈，再取快照** —— 否则 backups 里存的是「被污染的内容」，
//   收尾的 restore() 就会把污染还原回去（等于白恢复）。
recoverFromDiskBackup();

const backups = new Map();
for (const t of TARGETS) backups.set(t, readFileSync(join(ROOT, t)));
writeBackupFile();

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** 带重试的写入（Windows：刚写过的文件会被短暂独占） */
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

function restoreAndVerify() {
  const writeErrors = restore();
  // 还原成功 ⇒ 磁盘快照已等于仓库真值（下次开跑前的自愈不会误报）
  writeBackupFile();
  const bad = [];
  for (const [f, buf] of backups) {
    try {
      const now = readFileSync(join(ROOT, f));
      if (sha256(now) !== sha256(buf)) bad.push(f);
    } catch (e) {
      bad.push(f + ' (读不出来)');
    }
  }
  return { writeErrors, bad };
}

/**
 * 重新构建 —— build 级守卫读的是 **dist/**，而变异改的是 **src/**
 * ⇒ 不重建的话，守卫读的是**上一轮的旧产物** ⇒ 变异「存活」是假的。
 */
function rebuild() {
  try {
    execFileSync('pnpm.cmd', ['build'], {
      encoding: 'utf8',
      cwd: ROOT,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, SKIP_INDEXNOW: '1' },
    });
    return '';
  } catch (e) {
    return String(e.stdout ?? '') + String(e.stderr ?? '');
  }
}

function runGuard(which) {
  const files =
    which === 'build'
      ? ['tests/decision-support-build-guard.test.ts']
      : ['tests/decision-support-guard.test.ts'];
  try {
    const out = execFileSync(
      'node',
      ['node_modules/tsx/dist/cli.mjs', '--test', '--test-concurrency=1', ...files],
      {
        encoding: 'utf8',
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, RUN_BUILD_TESTS: which === 'build' ? '1' : process.env.RUN_BUILD_TESTS },
      },
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

const MUTATIONS = [
  {
    id: 'M1',
    guard: 'source',
    desc: '共享模块少导出一个函数',
    expect: 'P168 共享实现：decision-support 模块存在且导出齐全',
    allowExtra: true, // 删掉一个导出合法地会连带红两条（自检那条也用得到它）
    apply: () => {
      const p = join(ROOT, 'src/lib/decision-support.ts');
      const s = readFileSync(p, 'utf8');
      const out = s.replace('export function hasDecisionLines(', 'function hasDecisionLines(');
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
  {
    id: 'M2',
    guard: 'source',
    desc: '提取器改成「抓最后一行」（破坏检测器自检）',
    expect: 'P168 提取器自检：没有决策建议的输出必须返回空（不是随便抓一行）',
    apply: () => {
      const p = join(ROOT, 'src/lib/decision-support.ts');
      const s = readFileSync(p, 'utf8');
      const out = s.replace(
        '    const at = line.indexOf(marker);' + NL + '    if (at < 0) continue;',
        '    const at = 0;' + NL + '    if (!line) continue;',
      );
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
  {
    id: 'M3',
    guard: 'source',
    desc: '提取器不再剥 markdown 粗体',
    expect: 'P168 提取器：剥掉 markdown 粗体（纯文本渲染 ⇒ 符号会原样显示）',
    apply: () => {
      const p = join(ROOT, 'src/lib/decision-support.ts');
      const s = readFileSync(p, 'utf8');
      const out = s.replace("    text = text.replace(/\\*\\*/g, '');" + NL, '');
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
  {
    id: 'M4',
    guard: 'source',
    desc: 'zh 文案被砍掉一半（保真度）',
    expect: 'P168 激活工具：en/zh 四个静态键都在、非占位、有长度下限',
    apply: () => {
      const p = join(ROOT, 'src/i18n/locales/zh.json');
      const s = readFileSync(p, 'utf8');
      const out = s.replace(
        '"tools.solopreneur-burn-rate-calculator.decision_constraint": "出现下面任何一种情况时，这个结果都不可信：现金数字里包含了已承诺但尚未到账的钱；净烧钱里混了一次性支出（设备购置、和解、税费等）且不会重复；月收入只是某一个月的好成绩，而不是 3-6 个月的平均值；或者你还没收入 —— 这时跑道是「最坏情况」而不是预测。另外跑道是「时点数字」，每次结账都会变，所以三个月前算出来的跑道不代表你今天的跑道。"',
        '"tools.solopreneur-burn-rate-calculator.decision_constraint": "不可信。"',
      );
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
  {
    id: 'M5',
    guard: 'source',
    desc: 'playbook 改回占位模板',
    expect: 'P168 激活工具：引擎的 playbook 6 字段不得是占位模板',
    apply: () => {
      const p = join(ROOT, 'src/engines/saas/burn-rate-calculator.ts');
      const s = readFileSync(p, 'utf8');
      const out = s.replace(
        "goal: 'Should you raise capital now, cut costs, or keep investing in growth?",
        "goal: '用户该不该用此计算器的结果作为决策依据",
      );
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
  {
    id: 'M6',
    guard: 'source',
    desc: '英文页的决策建议改回中文',
    expect: 'P168 激活工具：英文页的决策建议不得含中文（实测 19 个引擎整段是中文）',
    apply: () => {
      const p = join(ROOT, 'src/engines/saas/burn-rate-calculator.ts');
      const s = readFileSync(p, 'utf8');
      const needle = 'Default alive is just the start.';
      const out = s.split(needle).join('默认活着只是开始。');
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
  {
    id: 'M7',
    guard: 'source',
    desc: '客户端 customFn 与服务端输出不再一致',
    expect: 'P168 ⭐ 客户端与服务端取到的建议必须一致（live = static parity）',
    apply: () => {
      const p = join(ROOT, 'src/engines/saas/burn-rate-calculator.ts');
      const s = readFileSync(p, 'utf8');
      // 只改 customFn（客户端执行的那份）里的 Tip 文案，运行时那份不动
      const needle = 'Default alive is just the start.';
      const i = s.indexOf(needle, s.indexOf('const customFn'));
      if (i < 0) throw new Error('锚点未命中');
      const out = s.slice(0, i) + 'Default alive is just the start（客户端）。' + s.slice(i + needle.length);
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
  {
    id: 'M8',
    guard: 'build',
    desc: '卡片不再剥离 Tip ⇒ 建议重复出现两次',
    expect: 'P168 产物：⭐ 零重复 —— 全页恰好出现一次决策建议',
    apply: () => {
      const p = join(ROOT, 'src/pages/[lang]/[slug].astro');
      const s = readFileSync(p, 'utf8');
      const out = s.replace(
        'const exWithoutTip = decisionRender ? stripDecisionTip(ex) : ex;',
        'const exWithoutTip = ex;',
      );
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
  {
    id: 'M9',
    guard: 'build',
    desc: '决策区块不再渲染',
    expect: 'P168 产物：激活工具的页面（en + zh）都渲染出决策区块，且三块静态内容都在',
    allowExtra: true, // 区块不渲染 ⇒ 卡片里的 Tip 也没人接管 ⇒ 「零重复」合法地一起红
    apply: () => {
      const p = join(ROOT, 'src/pages/[lang]/[slug].astro');
      const s = readFileSync(p, 'utf8');
      const out = s.replace(
        'const decisionRender = decisionTextReady && hasDecisionLines(decisionSample);',
        'const decisionRender = false;',
      );
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
  {
    id: 'M10',
    guard: 'build',
    desc: '客户端不再派发决策结果事件',
    expect: 'P168 产物：⭐ 客户端链路完整（派发事件 + 模块被页面引用）',
    apply: () => {
      const p = join(ROOT, 'src/pages/[lang]/[slug].astro');
      const s = readFileSync(p, 'utf8');
      const out = s.replace("new CustomEvent('ffk:decision-result'", "new CustomEvent('ffk:other-event'");
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
  {
    id: 'M11',
    guard: 'build',
    desc: '决策区块被渲染到所有工具页',
    expect: 'P168 产物：非激活工具**不渲染**决策区块',
    apply: () => {
      const p = join(ROOT, 'src/pages/[lang]/[slug].astro');
      const s = readFileSync(p, 'utf8');
      const out = s.replace(
        'const decisionRender = decisionTextReady && hasDecisionLines(decisionSample);',
        'const decisionRender = true;',
      );
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
  {
    id: 'M12',
    guard: 'source',
    desc: '引擎运行时输出里又写回了 🧭 决策段（与区块同页重复）',
    expect: 'P168 激活工具：引擎输出里**不得**再有 🧭 决策段（区块已接管 ⇒ 再写就是同页重复）',
    apply: () => {
      const p = join(ROOT, 'src/engines/saas/burn-rate-calculator.ts');
      const s = readFileSync(p, 'utf8');
      const probe = '• 🧭 Decision Question: Variant probe.';
      // 运行时那份
      let out = s.replace(
        'result += "' + '\\n\\n💡 Tip: Default alive is just the start.',
        'result += "' + '\\n\\n' + probe + '\\n💡 Tip: Default alive is just the start.',
      );
      // 缓存示例那份（SSR 卡片读的是它）
      out = out.replace(
        '\\n💡 Tip: Default alive is just the start.',
        '\\n' + probe + '\\n💡 Tip: Default alive is just the start.',
      );
      if (out === s) throw new Error('锚点未命中');
      writeWithRetry(p, out);
    },
  },
  {
    id: 'M13',
    guard: 'build',
    desc: '把结果卡片里的段落整段抄进决策区块（同页复读）',
    expect: 'P168 产物：⭐ 决策区块与结果卡片没有逐字复读（"零重复"的完整版）',
    apply: () => {
      // 这段话**逐字**出现在结果卡片里（默认输入下的 Burn Summary / Runway 段）
      // ⚠️ 块要大到「共用 5-gram 数 / 区块 5-gram 总数」越过 2% 阈值：
      //   tokenizer 会把 break-even / ≥ 之类合并 ⇒ 句子短了只有 4 个共用 5-gram（1.5%）
      const chunk =
        'Gross Burn: $0/mo Net Burn: $-20,000/mo Annual Burn: $-240,000/yr Current Cash: $500,000 Status: ✅ Cash-flow positive! No burn concern. Default Alive: cash-flow positive';
      // ⚠️ 两语言的锚点**必须各写各的**：英文那句在 zh 文件里根本不存在
      //   （zh 的同一句话是中文）⇒ 用同一个锚点会让 zh 那一轮 INVALID。
      const anchors = {
        en: 'those two say whether the time is being spent well.',
        zh: '这两个告诉你这段时间花得值不值。',
      };
      for (const f of ['en', 'zh']) {
        const p = join(ROOT, 'src/i18n/locales/' + f + '.json');
        const s = readFileSync(p, 'utf8');
        const anchor = anchors[f];
        const out = s.replace(anchor, anchor + ' ' + chunk);
        if (out === s) throw new Error('锚点未命中：' + f);
        writeWithRetry(p, out);
      }
    },
  },
  {
    id: 'M14',
    guard: 'build',
    desc: '结果卡片里又出现了 🧭 决策段（决策支持没被区块独占）',
    expect: 'P168 产物：⭐ 结果卡片里不再有 🧭 决策段（决策支持由区块独占）',
    apply: () => {
      const p = join(ROOT, 'src/engines/saas/burn-rate-calculator.ts');
      const s = readFileSync(p, 'utf8');
      const probe = '• 🧭 Decision Question: Variant probe.';
      // 运行时那份
      let out = s.replace(
        'result += "' + '\\n\\n💡 Tip: Default alive is just the start.',
        'result += "' + '\\n\\n' + probe + '\\n💡 Tip: Default alive is just the start.',
      );
      // ⚠️ 静态示例那份（SSR 卡片读的是它）：
      //   锚点必须**在 staticExamples: 之后**找 —— 否则第一次替换改过的运行时
      //   会先命中，静态示例根本没被改 ⇒ 卡片里看不到 🧭 段 ⇒ 变异「存活」是假的
      const cut = out.indexOf('staticExamples:');
      if (cut < 0) throw new Error('锚点未命中：staticExamples');
      const head = out.slice(0, cut);
      const tail = out.slice(cut);
      const outTail = tail.replace(
        '\\n💡 Tip: Default alive is just the start.',
        '\\n' + probe + '\\n💡 Tip: Default alive is just the start.',
      );
      if (outTail === tail) throw new Error('锚点未命中：静态示例');
      out = head + outTail;
      writeWithRetry(p, out);
    },
  },
];

// ⭐ 迭代开关：`node tests/scripts/mutate-p168-decision-support.mjs M13,M14`
//   只跑指定的变异（调试单条时省时间）；不带参数就是跑满全部。
const ONLY = process.argv[2]
  ? process.argv[2].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  : null;

let killed = 0;
let survived = 0;
let invalid = 0;
let notIsolated = 0;

try {
  for (const which of ['source', 'build']) {
    const base = runGuard(which);
    if (!base.ok) {
      console.log('基线就没绿（' + which + '）—— 先修守卫。');
      console.log(base.out.slice(-2000));
      process.exit(1);
    }
  }
  console.log('基线绿 ✓（source + build）');
  console.log('');

  for (const m of MUTATIONS) {
    if (ONLY && !ONLY.includes(m.id)) continue;
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
    if (m.guard === 'build') {
      const buildErr = rebuild();
      if (buildErr) {
        console.log('[' + m.id + '] 构建失败 —— 变异可能破坏了编译（这也算被杀）');
        killed++;
        continue;
      }
    }
    const res = runGuard(m.guard);
    if (!res.ok) {
      const failed = failedAssertions(res.out);
      const isolated = m.allowExtra ? failed.includes(m.expect) : (failed.length === 1 && failed[0] === m.expect);
      if (isolated) {
        killed++;
        console.log('[' + m.id + '] KILLED ✓ — ' + m.desc);
      } else {
        notIsolated++;
        survived++;
        console.log(
          '[' + m.id + '] RED-BUT-NOT-ISOLATED — ' + m.desc +
            '（失败的断言：' + (failed.join(' / ') || '(未识别)') + '）',
        );
      }
    } else {
      survived++;
      console.log('[' + m.id + '] ✗ SURVIVED — ' + m.desc);
    }
  }
} finally {
  // ⭐ 顺序必须是「**先还原源码，再重建产物**」—— 反过来会把最后一轮变异的
  //   产物留在磁盘上（源码已还原、产物还是变异的 ⇒ 后续任何测量都失真）。
  const { writeErrors, bad } = restoreAndVerify();
  const rebuildErr = rebuild();
  if (rebuildErr) console.log('⚠ 收尾重建失败：' + rebuildErr.slice(-400));
  if (writeErrors.length) {
    console.log('');
    console.log('还原时写入失败：' + writeErrors.join(', '));
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

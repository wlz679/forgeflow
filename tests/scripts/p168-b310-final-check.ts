#!/usr/bin/env node
// P168 B3-10 —— **收口验收**（一条命令跑完 B3-10 的全部判据）。
//
// 用法（必须从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-b310-final-check.ts
// 退出码：0 = 全清；1 = 还有欠账或守卫红。

import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const NLc = String.fromCharCode(10);

function run(args: string[]): { code: number; out: string } {
  try {
    return { code: 0, out: execFileSync(process.execPath, args, { encoding: 'utf-8', cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; status?: number };
    return { code: err.status === undefined ? -1 : err.status, out: String(err.stdout || '') + String(err.stderr || '') };
  }
}

const tsx = resolve(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const T = (p: string): string => resolve(ROOT, 'tests', p);

const checks = [
  { name: 'B3-10 全仓欠账（多元素 + 漂移）', args: [tsx, T('scripts/p168-b310-check.ts')] },
  { name: 'G6 漂移台账守卫', args: [tsx, '--test', '--test-reporter=spec', T('calc-output-parity-guard.test.ts')] },
  { name: 'G15 多元素台账守卫', args: [tsx, '--test', '--test-reporter=spec', T('customfn-single-element-guard.test.ts')] },
  { name: 'calc-output 守卫组（G3/G8/G16/G17 等）', args: [tsx, '--test', '--test-concurrency=1', '--test-reporter=spec',
    T('calc-output-i18n-guard.test.ts'), T('calc-output-en-parity-guard.test.ts'), T('calc-output-parity-guard.test.ts'),
    T('calc-output-render-guard.test.ts'), T('calc-output-template-parity-guard.test.ts'), T('calc-output-token-colon-guard.test.ts'),
    T('customfn-single-element-guard.test.ts'), T('g1-natural-language-probe.test.ts') ] },
];

let bad = 0;
for (const c of checks) {
  const r = run(c.args);
  const lines = r.out.split(NLc);
  const head = lines.filter((l) => l.includes('欠账') || l.includes('检查 ') || l.trim().startsWith('# fail') || l.trim().startsWith('# pass')).slice(0, 4).join(' | ');
  if (r.code !== 0) bad++;
  console.log((r.code === 0 ? 'OK  ' : 'FAIL') + ' ' + c.name + (head ? '  → ' + head.slice(0, 200) : ''));
  if (r.code !== 0) {
    for (const l of lines.filter((x) => x.includes('✖') || x.includes('not ok') || x.includes('AssertionError')).slice(0, 8)) {
      console.log('      ' + l.trim().slice(0, 220));
    }
  }
}
console.log(bad === 0 ? '—— 全部通过' : '—— ' + bad + ' 项未通过');
process.exitCode = bad > 0 ? 1 : 0;
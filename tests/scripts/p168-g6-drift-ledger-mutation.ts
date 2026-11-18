import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const LEDGER = resolve(ROOT, 'tests', 'scripts', 'p168-server-client-drift-ledger.ts');
const GUARD = resolve(ROOT, 'tests', 'calc-output-parity-guard.test.ts');
const sha = (p: string): string => createHash('sha256').update(readFileSync(p, 'utf-8')).digest('hex');

const LEDGER_ORIG = readFileSync(LEDGER, 'utf-8');
const GUARD_ORIG = readFileSync(GUARD, 'utf-8');
const L0 = sha(LEDGER);
const G0 = sha(GUARD);

const NLc = String.fromCharCode(10);
const variants = [
  {
    id: 'M1',
    name: '把一条台账的分类改错（wording → missing-section）',
    file: LEDGER,
    from: "'solopreneur-attrition-cost-calculator': { kind: 'wording'",
    to: "'solopreneur-attrition-cost-calculator': { kind: 'missing-section'",
  },
  {
    id: 'M2',
    name: '从台账里删掉一条仍在漂移的引擎（销账但其实没修好）',
    file: LEDGER,
    from: "  'solopreneur-csat-calculator': { kind: 'content', note: \"行数与字符数都相同但内容不同（CI/排序差异）⇒ 需逐行 diff 定位\" }," + NLc,
    to: '',
  },
  {
    id: 'M3',
    name: '台账塞进一条不存在的引擎（幽灵欠账）',
    file: LEDGER,
    from: 'export const DRIFT_DEBT: Record<string, { kind: DriftKind; note: string }> = {',
    to: 'export const DRIFT_DEBT: Record<string, { kind: DriftKind; note: string }> = {' + NLc + "  'solopreneur-ghost-engine-calculator': { kind: 'wording', note: '幽灵' },",
  },
];

let survived = 0;
let notIsolated = 0;
try {
  for (const v of variants) {
    const orig = v.file === LEDGER ? LEDGER_ORIG : GUARD_ORIG;
    const hits = orig.split(v.from).length - 1;
    if (hits !== 1) {
      console.log(v.id + ' SKIP：目标串命中 ' + hits + ' 次（必须恰好 1 次）');
      survived++;
      continue;
    }
    writeFileSync(v.file, orig.split(v.from).join(v.to), 'utf-8');
    let out = '';
    let code = 0;
    try {
      out = execFileSync(process.execPath, [
        resolve(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
        '--test', '--test-concurrency=1', '--test-reporter=spec', GUARD,
      ], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], cwd: ROOT });
      code = 0;
    } catch (e) {
      const err = e as { stdout?: string; stderr?: string; status?: number };
      out = String(err.stdout || '') + String(err.stderr || '');
      code = err.status === undefined ? -1 : err.status;
    }
    const failed = Number((out.match(/(?:^not ok |fail |# fail )(\d+)/m) || [0, '0'])[1]);
    const passed = Number((out.match(/(?:^ok |pass |# pass )(\d+)/m) || [0, '0'])[1]);
    const caught = code !== 0 && failed >= 1;
    const isolated = failed === 1;
    if (!caught) survived++;
    if (caught && !isolated) notIsolated++;
    console.log(v.id + ' ' + v.name + ' => ' + (caught ? 'KILLED' : 'SURVIVED') + '（红 ' + failed + ' 条 / 绿 ' + passed + ' 条，退出码 ' + code + '）');
    writeFileSync(v.file, orig, 'utf-8');
  }
} finally {
  writeFileSync(LEDGER, LEDGER_ORIG, 'utf-8');
  writeFileSync(GUARD, GUARD_ORIG, 'utf-8');
  const okL = sha(LEDGER) === L0;
  const okG = sha(GUARD) === G0;
  console.log('还原：台账 ' + (okL ? '一致 ✓' : '不一致 ✗') + ' · 守卫 ' + (okG ? '一致 ✓' : '不一致 ✗'));
  if (!okL || !okG) process.exit(1);
}
console.log('存活 ' + survived + ' · 未隔离 ' + notIsolated);
process.exit(survived === 0 && notIsolated === 0 ? 0 : 1);
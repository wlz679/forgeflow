import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const PAGE = resolve(ROOT, 'src', 'pages', '[lang]', '[slug].astro');
const GUARD = resolve(ROOT, 'tests', 'beautify-no-hardcoded-copy-guard.test.ts');
const TMP = resolve(ROOT, 'tmp');
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const orig = readFileSync(PAGE, 'utf8');
const origSha = sha(orig);
const BACKUP = resolve(TMP, 'p168-beautify-page.PRE-MUT');
writeFileSync(BACKUP, orig, 'utf8');
console.log('备份 ' + BACKUP + ' sha256=' + origSha.slice(0, 16));

const MUT_A = "            html += '<h4 class=\"text-sm font-bold text-gray-800 mb-2\">' + esc(savingsTitle) + '</h4>';";
const MUT_B = "            html += '<h4 class=\"text-sm font-bold text-gray-800 mb-2\">' + esc(usageTitle) + '</h4>';";

const variants = [
  { id: 'M1', name: 'Savings Insights 标题改回硬编码英文',
    from: MUT_A, to: "            html += '<h4 class=\"text-sm font-bold text-gray-800 mb-2\">💰 Savings Insights</h4>';" },
  { id: 'M2', name: 'Usage Scenarios 标题改回硬编码英文',
    from: MUT_B, to: "            html += '<h4 class=\"text-sm font-bold text-gray-800 mb-2\">📊 Usage Scenarios (monthly costs)</h4>';" },
];

let survived = 0;
let notIsolated = 0;
try {
  for (const v of variants) {
    if (orig.indexOf(v.from) < 0) { console.log(v.id + ' SKIP：目标串在当前文件里找不到'); survived++; continue; }
    const mutated = orig.split(v.from).join(v.to);
    writeFileSync(PAGE, mutated, 'utf8');
    let out = '';
    let code = 0;
    try {
      out = execFileSync(process.execPath, [
        resolve(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
        '--test', '--test-concurrency=1', '--test-reporter=spec', GUARD,
      ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], cwd: ROOT });
      code = 0;
    } catch (e: any) {
      out = String(e.stdout || '') + String(e.stderr || '');
      code = e.status === undefined ? -1 : e.status;
    }
    // ⭐ 两种 reporter 都要认：spec（ℹ fail N）/ TAP（# fail N）
    const failedCount = Number((out.match(/(?:^not ok |ℹ fail |# fail )(\d+)/m) || [0, '0'])[1]);
    const passCount = Number((out.match(/(?:^ok |ℹ pass |# pass )(\d+)/m) || [0, '0'])[1]);
    const caught = code !== 0 && failedCount >= 1;
    const isolated = failedCount === 1;
    if (!caught) survived++;
    if (caught && !isolated) notIsolated++;
    console.log(v.id + ' ' + v.name + ' => ' + (caught ? 'KILLED' : 'SURVIVED') + '（红 ' + failedCount + ' 条 / 绿 ' + passCount + ' 条，退出码 ' + code + '）');
  }
} finally {
  writeFileSync(PAGE, orig, 'utf8');
  const back = readFileSync(PAGE, 'utf8');
  const ok = sha(back) === origSha;
  console.log('还原：sha256 ' + (ok ? '一致 ✓' : '不一致 ✗') + '（' + sha(back).slice(0, 16) + ' vs ' + origSha.slice(0, 16) + '）');
  if (!ok) { console.log('ABORT：还原校验失败'); process.exit(1); }
}
console.log('存活 ' + survived + ' · 未隔离 ' + notIsolated);
process.exit(survived === 0 && notIsolated === 0 ? 0 : 1);
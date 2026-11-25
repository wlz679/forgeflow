// P168 B3-16 —— **对账逻辑复算台子**（控制器复算 + 入库可复算）。
// 对账报告不再打印「✔ 对账通过（实际不一致 0 条 …）」。
// 目的：验证「已知 · 当前不可达」的缺陷**复活**时，对账报告**不再**打印
//   「✔ 对账通过（实际不一致 0 条 …）」⇒ 避免「屏幕上 1 条真实不一致、结论却说通过」。
//
// 做法：从**真实脚本源码**里抽出 KNOWN_DEFECTS 的 (code, state) 登记表，
//   再逐字复刻脚本里的对账表达式，跑 4 个场景。
// ⚠️ **本文件不是判据**（真实判据在 p168-locale-roundtrip-nonratio.ts 本体，
//   且其 --strict 退出条件一字未改）⇒ 本台子只负责**复算「结论行」是否说谎**。
// ⚠️ 文件名**不带 .test.ts** ⇒ 不进 walkTestSuites 的套件计数。
//
// 用法（**必须**从仓库根运行）：
//      node tests/scripts/p168-b316-reconcile-probe.mjs
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO = resolve(import.meta.dirname, '..', '..');
const SRC = resolve(REPO, 'tests/scripts/p168-locale-roundtrip-nonratio.ts');
const src = readFileSync(SRC, 'utf8');

// —— 从真实源码抽 KNOWN_DEFECTS 的 (code, state) ——
const block = src.slice(src.indexOf('const KNOWN_DEFECTS'), src.indexOf('// ── zh 侧「词面数字差异」显式 allowlist'));
const rows = [...block.matchAll(/code: '([^']+)',\s*\n\s*state: '([^']+)'/g)].map((m) => ({ code: m[1], state: m[2] }));
if (rows.length !== 4) throw new Error('登记表抽取异常：' + rows.length + ' 条');
console.log('登记表（从真实源码抽取）：' + rows.map((r) => r.id_hint || r.code + '=' + r.state).join(' · '));

// —— 逐字复刻脚本里的对账表达式 ——
function reconcile(actual) {
  const actualSet = actual.slice().sort();
  const knownSet = rows.map((d) => d.code).sort();
  const knownByCode = new Map(rows.map((d) => [d.code, d]));
  const unexpected = actualSet.filter((c) => !knownSet.includes(c));
  const vanished = knownSet.filter((c) => !actualSet.includes(c));
  const vanishedFixed = vanished.filter((c) => knownByCode.get(c)?.state === 'fixed');
  const vanishedUnreachable = vanished.filter((c) => knownByCode.get(c)?.state === 'unreachable');
  const vanishedUnclassified = vanished.filter((c) => {
    const st = knownByCode.get(c)?.state;
    return st !== 'fixed' && st !== 'unreachable';
  });
  const regressedFixed = actualSet.filter((c) => knownByCode.get(c)?.state === 'fixed');
  const regressedUnreachable = actualSet.filter((c) => knownByCode.get(c)?.state === 'unreachable');
  const reconciled = unexpected.length === 0 && regressedFixed.length === 0;
  const conclusion = reconciled
    ? (actualSet.length
        ? '  ⚠️ 对账通过（无「未知的不一致」）· 但仍有 ' + actualSet.length + ' 条**已知欠账**在场（其中已修回归 ' + regressedFixed.length + ' 条 · 当前不可达复活 ' + regressedUnreachable.length + ' 条）'
        : '  ✔ 对账通过（实际不一致 0 条 · 无未知不一致 · 无回归）')
    : '  🚨 对账不通过（实际不一致 ' + actualSet.length + ' 条 · 存在「未知的不一致」或「已修却回归」⇒ 必须人工确认）';
  const strictExit = unexpected.length > 0 ? 1 : 0;
  return { actualSet, unexpected, vanishedFixed, vanishedUnreachable, vanishedUnclassified, regressedFixed, regressedUnreachable, reconciled, conclusion, strictExit };
}

const D1 = 'calc_out.revenue_projector.row.whatif_runway';
const D4 = 'calc_out.openai_token.row.header_realtime_cache';
const NEW = 'calc_out.brand_new_code';

const cases = [
  ['A 现状（actual=∅）', []],
  ['B D-4 复活（当前不可达的缺陷复现）', [D4]],
  ['C D-1 回归（已修的缺陷复现）', [D1]],
  ['D 全新未知缺陷', [NEW]],
];
let bad = 0;
for (const [name, actual] of cases) {
  const r = reconcile(actual);
  const claimsPass = r.conclusion.includes('✔ 对账通过');
  console.log('');
  console.log('== ' + name + ' ==');
  console.log('   actual=' + JSON.stringify(r.actualSet));
  console.log('   unexpected=' + JSON.stringify(r.unexpected) + ' · 复活=' + JSON.stringify(r.regressedUnreachable) + ' · 已修回归=' + JSON.stringify(r.regressedFixed));
  console.log('   结论行: ' + r.conclusion.trim());
  console.log('   --strict exit=' + r.strictExit);
  // 判定：只有 actual=∅ 时才允许出现「✔ 对账通过（实际不一致 0 条」
  const wrong = claimsPass && r.actualSet.length > 0;
  if (wrong) bad++;
  console.log('   判定: ' + (wrong ? '✘ 错误地宣称「对账通过」' : '✔ 结论行与实际一致'));
}
console.log('');
console.log('—— ' + cases.length + ' 个场景 · 错误宣称「对账通过」 ' + bad + ' 个');
process.exit(bad === 0 ? 0 : 1);

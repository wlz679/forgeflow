// P168 B3-4 —— 把 exp-p151-l5-* 同族测试的判据**迁到更高抽象层**（Wave C）。
//
// 为什么必须迁移：这些测试断言「引擎输出里有那四个 🧭 字符串」
//   ⇒ 决策段整段迁进页面 i18n 之后（**这正是我们要的形态**），
//   ⇒ 后者会把「迁走了」误判成「退化了」。
//
// ⭐ 判据新口径（与 decision-layer-coverage-guard / B3-1 的 gdpr-fine 同口径）：
//   「**这个工具的决策建议层齐不齐**」= 引擎输出 ∪ 页面 i18n 键
//   —— 不是把守卫改松，是把判据挪到内容现在所在的地方。
//
// 做法：以 B3-1 已上线的 gdpr-fine 版为**模板**，只换 slug / import / 输入。
// 跑法：node tests/scripts/b3-4-migrate-l5-tests.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const TESTS = join(ROOT, 'tests');
const DRY = process.argv.includes('--dry');

const TEMPLATE = 'exp-p151-l5-gdpr-fine.test.ts';
const TARGETS = [
  'saas-valuation', 'funnel-step', 'equity-dilution', 'customer-health-score', 'acv',
  'rent-vs-buy', 'kb-coverage-rate', 'gpu-cloud-cost', 'csat', 'comp-banding',
  'stockout-cost', 'freelance-rate', 'employee-cost',
];

const tpl = readFileSync(join(TESTS, TEMPLATE), 'utf8');
let changed = 0;
const skipped = [];
for (const name of TARGETS) {
  const file = join(TESTS, 'exp-p151-l5-' + name + '.test.ts');
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { skipped.push(name + '：没有这个测试文件'); continue; }
  const imp = /import\s+"(\.\.\/src\/engines\/[^"]+)";/.exec(src);
  const slugM = /getEngine\("([^"]+)"\)/.exec(src);
  const genM = /engine\.generate\(\{([\s\S]*?)\}\)/.exec(src);
  if (!imp || !slugM || !genM) { skipped.push(name + '：解析不出 import / slug / inputs'); continue; }
  const slug = slugM[1];
  // ⚠️ 原文每行本来就带逗号 ⇒ 直接按换行拼会拼出「,,」⇒ 先把「逗号+换行」归一
  const inputs = '{\n    ' + genM[1].trim().replace(/\s*,\s*\n\s*/g, ',\n    ').replace(/,\s*$/, '') + ',\n  }';
  let out = tpl;
  out = out.split('solopreneur-gdpr-fine-calculator').join(slug);
  out = out.replace(/import\s+"\.\.\/src\/engines\/[^"]+";/, 'import "' + imp[1] + '";');
  out = out.replace(/engine\.generate\(\{[\s\S]*?\}\)/, 'engine.generate(' + inputs + ')');
  out = out.replace(/P151 L5: gdpr-fine /, 'P151 L5: ' + name + ' ');
  // ⚠️ 报错文案里的工具名也要跟着换（否则断言消息仍写 gdpr-fine ⇒ 误判现场）
  out = out.replace(/gdpr-fine 缺失决策层/g, name + ' 缺失决策层');
  out = out.replace(/gdpr-fine 的 🧭 四段/g, name + ' 的 🧭 四段');
  out = out.replace(/\r\n/g, '\n');
  if (out.indexOf(slug) < 0 || out.indexOf(imp[1]) < 0) { skipped.push(name + '：生成结果异常'); continue; }
  changed++;
  console.log((DRY ? '[dry] ' : '') + name + '.test.ts  ← ' + slug);
  if (!DRY) writeFileSync(file, out, 'utf8');
}
console.log('');
console.log((DRY ? '[dry] ' : '') + '共 ' + changed + ' 个同族测试' + (skipped.length ? '；跳过：' + skipped.join('、') : ''));

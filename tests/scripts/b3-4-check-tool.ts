// P168 B3-4 —— 单工具自检器（worker 自检 + 主控复核共用）
//
// ⭐ 入库说明：fragment 是本批「建议码 + 探针输入 + locale 文案」的唯一真相源，
//   连同本工具一起放在 tests/ 下 ⇒ 换个人 checkout 也能复算同一批验收数字。
//   （fragment 在 tests/fixtures/b3-4/；不要放回 tmp/ —— tmp/ 被 gitignore）
//
// 跑法：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/b3-4-check-tool.ts sweep <slug> [<slug> ...]
//        列出该工具每个建议码对应的**真实输入**（供 fragment.probes 抄）
//   node node_modules/tsx/dist/cli.mjs tests/scripts/b3-4-check-tool.ts check <slug> [<slug> ...]
//        全量核对：引擎无中文 🧭 段 / 运行时码 / customFn 码 / 源码字面量 / 模板占位符
//
// ⚠️ 两个已修的坑（别再踩）：
//   ① 用 placeholder 拼输入 ⇒ 'e.g. 7' 取到 '.' ⇒ Number('.')=NaN ⇒ 全部早退 ⇒ 测不到分支
//      ⇒ 这里从 scripts/codegen-examples.mjs 解析**默认输入**（= 用户打开页面看到的输入）
//   ② 自己写正则提 Tip ⇒ 嵌套 params 会被截断成非法 JSON ⇒ 恒绿/恒红
//      ⇒ 这里直接用仓库同款 extractDecisionLines（src/lib/decision-support.ts）
import '../../src/engines/index.ts';
import { getAllEngines } from '../../src/core/engines/registry.ts';
import { extractDecisionLines } from '../../src/lib/decision-support.ts';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

/** 从 scripts/codegen-examples.mjs 解析每个引擎的默认输入 */
export function parseDefaultInputs(): Record<string, Record<string, string>> {
  const src = readFileSync(join(ROOT, 'scripts/codegen-examples.mjs'), 'utf8');
  const out: Record<string, Record<string, string>> = {};
  const re = /slug:\s*'([^']+)'[\s\S]*?defaultInputs:\s*\{([\s\S]*?)\}\s*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const inputs: Record<string, string> = {};
    for (const kv of m[2].matchAll(/([A-Za-z0-9_]+)\s*:\s*'([^']*)'/g)) inputs[kv[1]] = kv[2];
    out[m[1]] = inputs;
  }
  return out;
}

function hasCjk(text: string): boolean {
  return /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]/.test(text);
}

function runEngine(engine: any, inputs: Record<string, string>): string {
  try {
    const r = engine.generate(inputs);
    return (Array.isArray(r) ? r : [r]).map(String).join('\n');
  } catch {
    return '';
  }
}

function runCustomFn(engine: any, inputs: Record<string, string>): string {
  const fn = engine.clientConfig?.customFn;
  if (!fn) return '';
  try {
    const f = new Function('inputs', 'pick', 'fill', fn);
    const pick = (a: string[]) => a[0];
    const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '{' + k + '}');
    const out = f(inputs, pick, fill);
    return (Array.isArray(out) ? out : [out]).map(String).join('\n');
  } catch {
    return '';
  }
}

/** 扫描：给每个建议码找一个真实输入 */
export function sweep(engine: any, base: Record<string, string>): Map<string, Record<string, string>> {
  const found = new Map<string, Record<string, string>>();
  const probe = (inputs: Record<string, string>) => {
    const code = extractDecisionLines(runEngine(engine, inputs)).tipCode;
    if (code && !found.has(code)) found.set(code, inputs);
  };
  const scales = [0, 0.1, 0.25, 0.5, 1, 2, 5, 10, 100];
  for (const s of scales) {
    const v: Record<string, string> = {};
    for (const [k, raw] of Object.entries(base)) {
      const n = parseFloat(raw);
      v[k] = Number.isFinite(n) ? String(Math.round(n * s * 100) / 100) : raw;
    }
    probe(v);
  }
  for (const k of Object.keys(base)) {
    const n = parseFloat(base[k]);
    if (!Number.isFinite(n)) continue;
    for (const s of scales) {
      const v = { ...base };
      v[k] = String(Math.round(n * s * 100) / 100);
      probe(v);
    }
  }
  for (const i of (engine.inputs ?? [])) {
    if (i.type === 'select' && Array.isArray(i.options)) {
      for (const opt of i.options) {
        const v = { ...base };
        v[i.name] = String(opt);
        probe(v);
      }
    }
  }
  return found;
}

function placeholders(text: string): Set<string> {
  return new Set([...text.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]));
}

/** 找到 slug 对应的引擎源文件（守卫要按源码提码，位置不能猜） */
function findEngineFile(slug: string): string | null {
  const dir = join(ROOT, 'src/engines');
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const name of readdirSync(cur)) {
      const p = join(cur, name);
      const st = statSync(p);
      if (st.isDirectory()) { stack.push(p); continue; }
      if (!name.endsWith('.ts')) continue;
      const text = readFileSync(p, 'utf8');
      if (text.indexOf("slug: '" + slug + "'") >= 0) return p;
    }
  }
  return null;
}

function checkOne(slug: string, engine: any, defaults: Record<string, Record<string, string>>): string[] {
  const problems: string[] = [];
  const fragPath = join(ROOT, 'tests', 'fixtures', 'b3-4', 'frag-' + slug + '.json');
  if (!existsSync(fragPath)) return ['没有 fragment：tmp/b3-4/frag-' + slug + '.json'];
  const frag = JSON.parse(readFileSync(fragPath, 'utf8'));
  const tips: any[] = frag.tips ?? [];
  if (!tips.length) return ['fragment 里没有 tips'];
  const codes = tips.map((t) => t.code);
  const base = defaults[slug] ?? {};
  const swept = sweep(engine, base);
  const probes: Record<string, Record<string, string>> = {};
  for (const p of (frag.probes ?? [])) probes[p.code] = p.inputs;
  for (const c of codes) if (!probes[c] && swept.has(c)) probes[c] = swept.get(c)!;
  for (const c of codes) {
    if (!probes[c]) { problems.push('建议码 ' + c + '：找不到能命中它的真实输入（sweep 没扫到）'); continue; }
    const out = runEngine(engine, probes[c]);
    if (!out) { problems.push('建议码 ' + c + '：运行时抛错'); continue; }
    if (out.indexOf('\u{1F9ED}') >= 0) problems.push('建议码 ' + c + '：运行时输出里还有 🧭 决策段');
    if (hasCjk(out)) problems.push('建议码 ' + c + '：运行时输出里还有中文');
    const live = extractDecisionLines(out);
    if (live.tipCode !== c) problems.push('建议码 ' + c + '：运行时给出的是 ' + (live.tipCode || '(无码)') + '（输入 ' + JSON.stringify(probes[c]) + '）');
    const cf = runCustomFn(engine, probes[c]);
    if (!cf) problems.push('建议码 ' + c + '：customFn 跑不出（抛错或没有 customFn）');
    else {
      const cfCode = extractDecisionLines(cf).tipCode;
      if (cfCode !== c) problems.push('建议码 ' + c + '：customFn 给出的是 ' + (cfCode || '(无码)') + '（与运行时不一致）');
    }
    const tip = tips.find((t) => t.code === c);
    const tmplPh = placeholders(String(tip.en ?? '') + ' ' + String(tip.zh ?? ''));
    const sentPh = new Set(Object.keys(live.tipParams));
    for (const p of sentPh) if (!tmplPh.has(p)) problems.push('建议码 ' + c + '：引擎发了参数 ' + p + '，模板里没有占位符');
    for (const p of tmplPh) if (!sentPh.has(p)) problems.push('建议码 ' + c + '：模板有占位符 ' + p + '，引擎这次没发');
  }
  const all = new Set(codes);
  // 源码码集（用仓库守起用同一个正则）—— 守卫断言「源码 == 登记」
  const engineFile = findEngineFile(slug);
  if (!engineFile) problems.push('在 src/engines 下找不到 slug ' + slug + ' 的引擎文件');
  else {
    const srcText = readFileSync(engineFile, 'utf8');
    const srcCodes = new Set([...srcText.matchAll(/code:\s*'([a-z0-9_]+)'/g)].map((m) => m[1]));
    for (const c of codes) if (!srcCodes.has(c)) problems.push('源码里找不到建议码字面量 code: \'' + c + '\'（守起用 /code:\\s*\'([a-z0-9_]+)\'/g 提取，字面量必须紧跟在 code: 之后）');
    for (const c of srcCodes) if (!all.has(c)) problems.push('源码里有建议码 ' + c + '，fragment 没登记');
  }
  for (const c of swept.keys()) if (!all.has(c)) problems.push('扫到一个 fragment 里没有的建议码 ' + c + '（fragment 与引擎分支不一致）');
  const declared = (frag.probes ?? []).map((p: any) => p.code);
  for (const c of declared) if (!all.has(c)) problems.push('fragment.probes 里有 fragment 没声明的建议码 ' + c);
  return problems;
}

const argv = process.argv.slice(2);
const mode = argv[0] ?? 'check';
const slugs = argv.slice(1);
const engines = getAllEngines() as any[];
const defaults = parseDefaultInputs();

if (mode === 'fill-probes') {
  for (const slug of slugs) {
    const engine = engines.find((e) => e.slug === slug);
    if (!engine) { console.log('❌ ' + slug + '：找不到引擎'); continue; }
    const fragPath = join(ROOT, 'tests', 'fixtures', 'b3-4', 'frag-' + slug + '.json');
    if (!existsSync(fragPath)) { console.log('❌ ' + slug + '：没有 fragment'); continue; }
    const frag = JSON.parse(readFileSync(fragPath, 'utf8'));
    const found = sweep(engine, defaults[slug] ?? {});
    frag.probes = frag.probes ?? [];
    for (const [code, inputs] of found) {
      if (!frag.probes.some((p: any) => p.code === code)) frag.probes.push({ code, inputs });
    }
    writeFileSync(fragPath, JSON.stringify(frag, null, 2) + '\n', 'utf8');
    console.log(slug + '：probes ' + frag.probes.length + ' 个（码 ' + [...found.keys()].join(', ') + '）');
  }
  process.exit(0);
}

if (mode === 'sweep') {
  for (const slug of slugs) {
    const engine = engines.find((e) => e.slug === slug);
    if (!engine) { console.log('❌ ' + slug + '：找不到引擎'); continue; }
    const found = sweep(engine, defaults[slug] ?? {});
    console.log('=== ' + slug + '（默认输入 ' + JSON.stringify(defaults[slug] ?? {}) + '）');
    if (!found.size) console.log('  ⚠️ 一个码都没扫到');
    for (const [code, inputs] of found) {
      console.log('  ' + code + '  <=  ' + JSON.stringify(inputs));
    }
  }
  process.exit(0);
}

let bad = 0;
for (const slug of slugs) {
  const engine = engines.find((e) => e.slug === slug);
  if (!engine) { console.log('❌ ' + slug + '：找不到引擎'); bad++; continue; }
  const problems = checkOne(slug, engine, defaults);
  if (problems.length) {
    bad++;
    console.log('❌ ' + slug);
    for (const p of problems) console.log('   - ' + p);
  } else {
    console.log('✅ ' + slug);
  }
}
console.log('');
console.log(bad === 0 ? '✅ 全部通过' : '❌ ' + bad + ' 项不对');
process.exitCode = bad === 0 ? 0 : 1;

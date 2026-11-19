#!/usr/bin/env node
// P168 B3-12 —— 引擎输入声明守卫：表单字段 ↔ 引擎读取必须**双向一致**。
//
// ⭐ 为什么需要它（B3-11 的同族缺陷，但更靠里一层）
//   B3-11 守的是「codegen defaultInputs ↔ 引擎 inputs[].name 对不上」；
//   本守卫守的是「**引擎声明的输入，引擎到底读不读**」/「**引擎读的输入，表单给不给**」。
//   实测第一个真缺陷：brrrr 的 sellingCostsPct —— 声明了、codegen 也给了，
//   但**引擎从未读取** ⇒ 表单上是个「用户改了、结果一点不变」的假字段。
//   （P5 计划原文：includes sellingCostsPct field that is V2-deferred (not used in V1)）
//
// ⭐⭐ 口径必须是 **AST 级作用域分析**，不是正则扫全文 —— 实测两个坑：
//   ① **helper 的形参也叫 inputs**：brrrr 的 postRefiAnnualCashFlow(inputs: PostRefiCFInputs)
//      与 cashTally(inputs: CashTallyInputs) 内部读 inputs.refiLoan / inputs.totalStage1Cash …
//      ⇒ 全文扫 inputs.X 会把这 6 个**中间计算值**误判成「表单输入」
//      ⇒ 「brrrr 读了 6 个未声明输入」是**假阳性**（中间量不是表单字段）。
//   ② **FAQ/散文里的 inputs**：customer-health 的 FAQ 文本里出现 { … Score … } = inputs
//      ⇒ 文本扫描同样误报。
//   ⇒ 故本守卫用 TypeScript AST：只取「**收到了表单 map 本身**」的函数
//      （调用点把 form-map 标识符直接当实参），helper（实参是对象字面量）不在其中。
//
// ⭐ 两个方向
//   正向（声明 ⇒ 被读）：没被读 ⇒ 表单上是假字段（改了没反应）⇒ 红
//   反向（被读 ⇒ 被声明）：没被声明 ⇒ 用户**无法提供** ⇒ 引擎恒读 undefined ⇒ 红
//
// ⚠️ 已知边界
//   · 动态键（inputs[模板串 ch$i_spend] / inputs['step' + i]）只能做**正向**覆盖
//     （键族无法静态枚举）⇒ 反向不检查动态键。
//   · 「刻意的上下文标注」输入（引擎自述 informational only）列入白名单，
//     且白名单必须**自证**：该引擎源码里确实出现 informational 的措辞。
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

import '../src/engines/index.ts';
import { getAllEngines } from '../src/core/engines/registry.ts';
import { buildEngineFileIndex } from './scripts/p168-codegen-defaults-audit.ts';

const ROOT = resolve(import.meta.dirname, '..');

/** 刻意的「上下文标注」输入（引擎自述 informational only ⇒ 不参与计算） */
const INFO_ONLY: Record<string, string[]> = {
  // K-1：FAQ 明写 It is informational only (tooltip reference)
  'solopreneur-kb-coverage-rate-calculator': ['industry_benchmark'],
  // K-2：输出行明写 informational only
  'solopreneur-search-effectiveness-calculator': ['industry_benchmark']
};

interface EngineAudit {
  slug: string;
  file: string;
  declared: string[];
  exactReads: string[];
  dynamic: RegExp[];
  computeFound: boolean;
  informationalNote: boolean;
}

function escRe(s: string): string {
  let out = '';
  for (const ch of s) {
    if ('.*+?^$()|[]{}'.indexOf(ch) >= 0) out += '\\' + ch;
    else out += ch;
  }
  return out;
}

function firstParamName(fn: ts.Node): string | null {
  const f = fn as ts.FunctionLikeDeclaration;
  const p = f.parameters && f.parameters[0];
  if (!p || !ts.isIdentifier(p.name)) return null;
  return p.name.text;
}

/** 动态键表达式 → 正则源码（模板串 / 字符串拼接） */
function patternToRegex(node: ts.Node): string | null {
  if (ts.isTemplateExpression(node)) {
    // ⚠️ 必须用 .text（纯字面量）；getText() 会带上反引号与 ${ }
    //    ⇒ 实测 head.getText() = 反引号 + ch + ${ ⇒ 正则永远匹配不上（假阳性）
    let out = escRe(node.head.text);
    for (const span of node.templateSpans) {
      out += '.+';
      out += escRe(span.literal.text);
    }
    return out;
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const l = patternToRegex(node.left);
    const r = patternToRegex(node.right);
    if (l === null && r === null) return null;
    return (l === null ? '.+' : l) + (r === null ? '' : r);
  }
  if (ts.isStringLiteral(node)) return escRe(node.text);
  if (ts.isIdentifier(node)) return '.+';
  return null;
}

/** 深度遍历（含函数体内部）—— ts.forEachChild 只到**直接子节点**，
 *  而调用点（helper(inputs)）在 body 里 ⇒ 必须递归，否则闭包永远收不到 helper。 */
function walkDeep(node: ts.Node, cb: (n: ts.Node) => void): void {
  ts.forEachChild(node, (child) => {
    cb(child);
    walkDeep(child, cb);
  });
}

function auditEngine(slug: string, file: string): EngineAudit {
  const text = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const exact = new Set<string>();
  const dyn: RegExp[] = [];

  // 顶层可被调用的本地函数（helper）：函数声明 + 顶层 const 箭头/函数表达式
  const fns = new Map<string, ts.Node>();
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name) fns.set(st.name.text, st);
  }
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    for (const d of st.declarationList.declarations) {
      if (!ts.isIdentifier(d.name)) continue;
      const init0 = d.initializer;
      if (init0 && (ts.isArrowFunction(init0) || ts.isFunctionExpression(init0))) fns.set(d.name.text, init0);
    }
  }

  // 引擎对象字面量里的 calculate / generate
  // ⭐ 形态实测（100 引擎）：75 个是**方法声明** generate(inputs){}，
  //   25 个是 generate: 顶层函数 / generate 简写引用
  //   ⇒ 三种形态都必须收，否则「定位不到计算函数」⇒ 判据在这些引擎身上失效。
  const entries: ts.Node[] = [];
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    for (const d of st.declarationList.declarations) {
      if (!ts.isIdentifier(d.name) || d.name.text !== 'engine') continue;
      const init = d.initializer;
      if (!init || !ts.isObjectLiteralExpression(init)) continue;
      for (const prop of init.properties) {
        const pname = prop.name ? prop.name.getText(sf) : '';
        if (pname !== 'calculate' && pname !== 'generate') continue;
        let target: ts.Node | null = null;
        if (ts.isMethodDeclaration(prop)) target = prop;
        else if (ts.isPropertyAssignment(prop)) target = prop.initializer;
        else if (ts.isShorthandPropertyAssignment(prop)) target = prop.name;
        if (!target) continue;
        if (ts.isIdentifier(target)) {
          const resolved = fns.get(target.text);
          if (resolved) target = resolved;
        }
        if (ts.isMethodDeclaration(target) || ts.isArrowFunction(target) || ts.isFunctionExpression(target) || ts.isFunctionDeclaration(target)) {
          entries.push(target);
        }
      }
    }
  }

  // 闭包：只有「**实参就是表单 map 本身**」的本地函数才算（helper 实参是对象字面量 ⇒ 不算）
  const closure: ts.Node[] = [];
  const seen = new Set<ts.Node>();
  const queue = entries.slice();
  while (queue.length > 0) {
    const fn = queue.shift() as ts.Node;
    if (seen.has(fn)) continue;
    seen.add(fn);
    closure.push(fn);
    const pname = firstParamName(fn);
    if (!pname) continue;
    walkDeep(fn, (node) => {
      // 嵌套函数若自己声明了同名形参 ⇒ 里面的 inputs 不是表单 map，跳过
      if (ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
        const f = node as ts.FunctionLikeDeclaration;
        if (f.parameters.some((p) => ts.isIdentifier(p.name) && p.name.text === pname)) return;
      }
      if (!ts.isCallExpression(node)) return;
      const callee = node.expression;
      if (!ts.isIdentifier(callee)) return;
      const target = fns.get(callee.text);
      if (!target) return;
      const passesMap = node.arguments.some((a) => ts.isIdentifier(a) && a.text === pname);
      if (passesMap) queue.push(target);
    });
  }

  // 读取点：只在闭包函数体内找「形参.X」
  for (const fn of closure) {
    const pname = firstParamName(fn);
    if (!pname) continue;
    const body = (fn as ts.FunctionLikeDeclaration).body;
    if (!body) continue;
    const walk = (node: ts.Node): void => {
      if (ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)) {
        const f = node as ts.FunctionLikeDeclaration;
        const shadows = f.parameters.some((p) => ts.isIdentifier(p.name) && p.name.text === pname);
        if (shadows) return;
      }
      if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === pname) {
        exact.add(node.name.text);
      }
      if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === pname) {
        const arg = node.argumentExpression;
        if (arg && ts.isStringLiteral(arg)) exact.add(arg.text);
        else if (arg) {
          const src = patternToRegex(arg);
          if (src) dyn.push(new RegExp('^' + src + '$'));
        }
      }
      if (ts.isVariableDeclaration(node) && node.initializer && ts.isIdentifier(node.initializer) && node.initializer.text === pname && node.name && ts.isObjectBindingPattern(node.name)) {
        for (const el of node.name.elements) {
          if (el.name && ts.isIdentifier(el.name)) exact.add(el.name.text);
        }
      }
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && (node.expression.text === 'pick' || node.expression.text === 'fill')) {
        const args = node.arguments;
        if (args[0] && ts.isIdentifier(args[0]) && args[0].text === pname) {
          for (const a of args.slice(1)) if (ts.isStringLiteral(a)) exact.add(a.text);
        }
      }
      ts.forEachChild(node, walk);
    };
    walk(body);
  }

  const engines = getAllEngines() as any[];
  const eng = engines.find((e) => e.slug === slug);
  const declared: string[] = (eng && eng.inputs ? eng.inputs : []).map((i: any) => i.name as string);

  return {
    slug,
    file,
    declared,
    exactReads: [...exact].sort(),
    dynamic: dyn,
    computeFound: entries.length > 0,
    informationalNote: /informational/i.test(text)
  };
}

function engineFiles(): Map<string, string> {
  return buildEngineFileIndex();
}

let cached: EngineAudit[] | null = null;
function allAudits(): EngineAudit[] {
  if (cached) return cached;
  const files = engineFiles();
  const out: EngineAudit[] = [];
  for (const e of getAllEngines() as any[]) {
    const f = files.get(e.slug);
    if (!f) continue;
    out.push(auditEngine(e.slug, f));
  }
  cached = out;
  return out;
}

test('T1 覆盖：每个引擎都要能定位到计算函数（防「口径失效 ⇒ 真空绿」）', () => {
  const audits = allAudits();
  assert.equal(audits.length, 100, '只审到 ' + audits.length + ' 个引擎（期望 100）');
  const missing = audits.filter((a) => !a.computeFound).map((a) => a.slug);
  assert.deepEqual(missing, [], '这些引擎定位不到计算函数 ⇒ 判据在它们身上失效：' + missing.join(', '));
});

test('T2 正向：每个声明的输入都必须被引擎读取（否则表单上是「改了没反应」的假字段）', () => {
  const problems: string[] = [];
  for (const a of allAudits()) {
    const allow = INFO_ONLY[a.slug] || [];
    for (const key of a.declared) {
      if (allow.includes(key)) continue;
      if (a.exactReads.includes(key)) continue;
      if (a.dynamic.some((re) => re.test(key))) continue;
      problems.push(a.slug + '：声明了 ' + key + ' 但引擎从未读取（表单上是假字段）');
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('T3 反向：引擎读取的每个输入都必须被声明（否则用户给不了 ⇒ 引擎恒读 undefined）', () => {
  const problems: string[] = [];
  for (const a of allAudits()) {
    for (const key of a.exactReads) {
      if (a.declared.includes(key)) continue;
      problems.push(a.slug + '：读了 ' + key + ' 但 inputs[] 没声明（表单给不了这个值）');
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('T4 白名单自证：informational 白名单必须仍需要，且引擎源码里确有 informational 的措辞', () => {
  const audits = allAudits();
  const problems: string[] = [];
  for (const [slug, keys] of Object.entries(INFO_ONLY)) {
    const a = audits.find((x) => x.slug === slug);
    if (!a) { problems.push(slug + '：白名单里的引擎不存在'); continue; }
    if (!a.informationalNote) problems.push(slug + '：白名单要求引擎自述 informational，但源码里没有 ⇒ 白名单养肥');
    for (const k of keys) {
      const stillUnread = !a.exactReads.includes(k) && !a.dynamic.some((re) => re.test(k));
      if (!stillUnread) problems.push(slug + '：白名单条目 ' + k + ' 现在已被读取 ⇒ 白名单过期（删掉它）');
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});
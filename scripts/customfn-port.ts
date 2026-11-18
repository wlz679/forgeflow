#!/usr/bin/env node
// P168 B3-10 —— **customFn 移植器**（客户端 customFn 由服务端**同一份代码**派生）。
//
// 为什么需要它
// ----------------
//   页面上有**两张结果卡片**：静态卡片来自 `engine.staticExamples[0]`（codegen 用**服务端** generate() 生成），
//   动态卡片（用户点「计算」）来自**客户端** `clientConfig.customFn`。
//   ⇒ 两边不一致 ⇒ 同一页两处内容矛盾（用户点一下计算，数字/文案就变了）。
//
//   历史修法是**手写镜像**：把服务端的输出逻辑抄一份到客户端 customFn 里。
//   ⇒ 服务端一升级（v3 的 🩺 Health 区块、emoji、精度）客户端就跟不上 ⇒ 反复漂移。
//   ⇒ B3-10 实测：全仓 100 个引擎 · 欠账 **61** 条（58 条多元素 + 32 条漂移，并集 61）。
//
// 本工具的修法：**让客户端 customFn 直接由服务端的同一份代码派生**
//   ① 用 TypeScript AST 找到引擎的服务端输出函数（`generate` / `calculate`）与其依赖；
//   ② 用 `ts.transpileModule` 把这些代码转成**可直接执行的 JS 源码**（类型全剥掉）；
//   ③ 拼成 `var __server = function (inputs) { <服务端原样代码> }` + 单元素包装：
//      `function run(...) { var __r = __server(inputs); return Array.isArray(__r) ? __r.join("\n") : String(__r); }`
//      `return [run(inputs, pick, fill)];`
//   ⇒ 客户端跑的就是服务端那份代码 ⇒ **漂移在结构上不可能发生**（不是「测过了没漂」，是「同一份代码」）。
//
// ⭐ 关键细节（都是实测踩出来的）
//   · **发射顺序必须与服务端一致**：模块级 `const` 按源码顺序初始化 ⇒ 移植件也按**源码顺序**发射。
//     （早期版本按「依赖优先」发射 ⇒ `var` 提升 ⇒ `_buildProviders is not a function` 这类 undefined。）
//   · **非声明语句也要发射**：像 `for (...) ALL_MODELS.push(...)` 这种「填数据」的顶层语句，
//     只搬声明会漏掉它 ⇒ 客户端拿到空数组（实测 ai-api-cost-comparison 报 `reading 'monthlyCost'`）。
//   · **导入的模块要整体内联**：`pickInteractiveModels` 依赖它自己模块里的私有常量
//     ⇒ 只内联函数源码不够 ⇒ 整个模块的顶层声明一起搬进来。
//   · **令牌化引擎**用 `CALC_OUTPUT_MAKE_TOKEN_JS`（客户端叫 `tk`，服务端叫 `makeToken`）
//     ⇒ 移植时加一行 `var makeToken = tk;` 做别名 ⇒ **token code 与参数结构一字不动**。
//   · **模板字面量转义**：移植件要嵌回 TS 模板字符串 ⇒ 每个 `\` 必须写成 `\\`，
//     否则 `\n` 会被模板吃掉变成真换行 ⇒ 客户端 JS 字符串提前闭合 ⇒ **整页动态卡片空白**。
//
// 用法（必须从仓库根跑）：
//   node --import tsx scripts/customfn-port.ts <引擎文件相对路径> <slug>          # 移植一个
//   node --import tsx scripts/customfn-port.ts <引擎文件相对路径> <slug> --dry    # 只算不写盘
//   node --import tsx scripts/customfn-port.ts --batch <清单.json> [--write]      # 批量（codegen-customfn 用）
//
// ⚠️ 它**重写整个 customFn 字面量** ⇒ 跑之前先提交（或先 stash），跑完用
//   `tests/scripts/p168-b310-check.ts` 与 `tests/scripts/p168-b310-multi-input.ts` 复验。
import ts from 'typescript';
import { transformSync } from 'esbuild';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const NL = String.fromCharCode(10);

/** 批量模式的 stdout 哨兵：调用方从这一行后面取 JSON ⇒ 别的日志不会干扰解析 */
const PORT_JSON_SENTINEL = '__FFK_PORT_JSON__';

/**
 * ⭐ 溯源标记：证明「客户端 customFn 由服务端同一份代码派生」。
 *    —— 压缩会把注释吃掉 ⇒ 标记必须在**压缩之后**再挂（见 minifyCustomFn 调用处）。
 *    —— **成对**（start/end）⇒ 守卫可以精确圈出「生成区」并把它排除在自己的扫描面之外
 *       （生成区是服务端代码的**副本** ⇒ 扫它是重复；而且压缩器的改名会在副本里造出
 *        `$t` 之类的**标识符** ⇒ 会被「$ + 字母」型判据误伤 ⇒ 假红）。
 */
const PROVENANCE_START = '/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */';
const PROVENANCE_END = '/* FFK-SERVER-DERIVED:end */';

const GLOBALS = new Set([
  'Math','Number','String','Boolean','Object','Array','JSON','Date','RegExp','Error','TypeError','RangeError',
  'parseFloat','parseInt','isNaN','isFinite','Infinity','NaN','undefined','console','Symbol','Map','Set','Promise',
  'globalThis','structuredClone','encodeURIComponent','decodeURIComponent','Intl','BigInt','WeakMap','WeakSet',
]);

function transpile(text: string): string {
  const res = ts.transpileModule(text, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      // ⭐ 必须去注释：移植件是**模板字面量** ⇒ 里面的 `//` 注释不是注释、而是字面文本 ⇒
      //   守卫按源码扫 token code / `$`+字母 时会把注释里的内容当成真代码（实测 G2/G2b 假红）。
      removeComments: true,
      newLine: ts.NewLineKind.LineFeed,
    },
  });
  return res.outputText;
}

/**
 * ⭐ `ts.transpileModule` 作用于「语句」⇒ 表达式（箭头函数 / 函数表达式）会被补一个**尾分号**。
 *   直接拼进 `return (<expr>)` 就是 `return ((x)=>{...};)` ⇒ **SyntaxError: Unexpected token ';'**。
 *   ⇒ 折叠沙箱里必须先把尾分号去掉。
 */
function stripTrailingSemicolon(s: string): string {
  const t = s.trim();
  let end = t.length;
  while (end > 0 && t.charAt(end - 1) === ';') end--;
  return t.slice(0, end);
}

function addBinding(name: ts.BindingName, out: Set<string>): void {
  if (ts.isIdentifier(name)) { out.add(name.text); return; }
  for (const el of name.elements) {
    if (ts.isOmittedExpression(el)) continue;
    addBinding(el.name, out);
  }
}

function collectDeclared(node: ts.Node, out: Set<string>): void {
  const visit = (n: ts.Node) => {
    if (ts.isVariableDeclaration(n)) addBinding(n.name, out);
    else if (ts.isParameter(n)) addBinding(n.name, out);
    else if (ts.isFunctionDeclaration(n) && n.name) out.add(n.name.text);
    else if (ts.isClassDeclaration(n) && n.name) out.add(n.name.text);
    else if (ts.isEnumDeclaration(n) && n.name) out.add(n.name.text);
    ts.forEachChild(n, visit);
  };
  visit(node);
}

function isRefPosition(n: ts.Identifier, parent: ts.Node | undefined): boolean {
  if (!parent) return true;
  if (ts.isPropertyAccessExpression(parent) && parent.name === n) return false;
  if (ts.isQualifiedName(parent) && parent.right === n) return false;
  if (ts.isPropertyAssignment(parent) && parent.name === n) return (parent as any).shorthand === true;
  // ⚠️ 接口 / 类型字面量的成员名**不是值引用**（`{ model: ModelInfo }` 里的 model）。
  //   `ts.isTypeNode` 判不到 PropertySignature ⇒ 不排除的话会被当成自由变量
  //   ⇒ 移植器记成「未解析」⇒ 假报警（实测 ai-api-cost-comparison 的 model/monthlyCost）。
  if (ts.isPropertySignature(parent) && parent.name === n) return false;
  if (ts.isMethodSignature(parent) && parent.name === n) return false;
  if (ts.isPropertyDeclaration(parent) && parent.name === n) return false;
  if (ts.isShorthandPropertyAssignment(parent)) return true;
  if ((ts.isMethodDeclaration(parent) || ts.isGetAccessorDeclaration(parent) || ts.isSetAccessorDeclaration(parent)) && parent.name === n) return false;
  if ((ts.isFunctionDeclaration(parent) || ts.isFunctionExpression(parent) || ts.isClassDeclaration(parent) || ts.isClassExpression(parent) || ts.isInterfaceDeclaration(parent) || ts.isTypeAliasDeclaration(parent) || ts.isEnumDeclaration(parent) || ts.isEnumMember(parent) || ts.isModuleDeclaration(parent)) && parent.name === n) return false;
  if (ts.isVariableDeclaration(parent) && parent.name === n) return false;
  if (ts.isParameter(parent) && parent.name === n) return false;
  if (ts.isBindingElement(parent) && parent.name === n) return false;
  if (ts.isImportSpecifier(parent) || ts.isImportClause(parent) || ts.isNamespaceImport(parent)) return false;
  if (ts.isLabeledStatement(parent) && parent.label === n) return false;
  if (ts.isBreakStatement(parent) || ts.isContinueStatement(parent)) return false;
  if (ts.isTypeNode(parent)) return false;
  return true;
}

function collectFree(node: ts.Node, extra?: string[]): Set<string> {
  const declared = new Set<string>();
  collectDeclared(node, declared);
  for (const x of extra ?? []) declared.add(x);
  const out = new Set<string>();
  const visit = (n: ts.Node, parent: ts.Node | undefined, inType: boolean) => {
    const nowType = inType || ts.isTypeNode(n);
    if (ts.isIdentifier(n) && !nowType && isRefPosition(n, parent)) {
      if (!declared.has(n.text)) out.add(n.text);
    }
    ts.forEachChild(n, (c) => visit(c, n, nowType));
  };
  visit(node, undefined, false);
  return out;
}

function usesThis(node: ts.Node): boolean {
  let found = false;
  const visit = (n: ts.Node) => {
    if (n.kind === ts.SyntaxKind.ThisKeyword) { found = true; return; }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return found;
}

interface ImpInfo { module: string; prop: string; }

interface ModInfo {
  file: string;
  sf: ts.SourceFile;
  topDecls: Map<string, ts.Node>;
  declOrder: string[];
  imports: Map<string, ImpInfo>;
}

function loadMod(file: string): ModInfo {
  const src = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const topDecls = new Map<string, ts.Node>();
  const declOrder: string[] = [];
  const imports = new Map<string, ImpInfo>();
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st)) {
      const ic = st.importClause;
      if (!ic || ic.isTypeOnly) continue;
      const mod = (st.moduleSpecifier as ts.StringLiteral).text;
      if (ic.name) imports.set(ic.name.text, { module: mod, prop: 'default' });
      const nb = ic.namedBindings;
      if (nb && ts.isNamespaceImport(nb)) imports.set(nb.name.text, { module: mod, prop: '*' });
      else if (nb && ts.isNamedImports(nb)) {
        for (const el of nb.elements) {
          if (el.isTypeOnly) continue;
          imports.set(el.name.text, { module: mod, prop: el.propertyName ? el.propertyName.text : el.name.text });
        }
      }
      continue;
    }
    if (ts.isFunctionDeclaration(st) && st.name) {
      if (!topDecls.has(st.name.text)) declOrder.push(st.name.text);
      topDecls.set(st.name.text, st);
      continue;
    }
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (!ts.isIdentifier(d.name)) continue;
        if (!topDecls.has(d.name.text)) declOrder.push(d.name.text);
        topDecls.set(d.name.text, d);
      }
      continue;
    }
    if (ts.isClassDeclaration(st) && st.name) {
      if (!topDecls.has(st.name.text)) declOrder.push(st.name.text);
      topDecls.set(st.name.text, st);
      continue;
    }
    if (ts.isEnumDeclaration(st) && st.name) {
      if (!topDecls.has(st.name.text)) declOrder.push(st.name.text);
      topDecls.set(st.name.text, st);
      continue;
    }
  }
  return { file, sf, topDecls, declOrder, imports };
}

function resolveModuleFile(base: string): string | null {
  const cands = [base + '.ts', base + '/index.ts', base + '.json', base + '.mjs', base + '/index.mjs'];
  for (const c of cands) if (existsSync(c)) return c;
  return null;
}

function declToJs(decl: ts.Node, name: string): string {
  if (ts.isVariableDeclaration(decl)) {
    const init = decl.initializer ? decl.initializer.getText() : 'undefined';
    return transpile('var ' + name + ' = ' + init + ';').trim();
  }
  const text = decl.getText().replace(/^export\s+/, '');
  return transpile(text).trim();
}

/**
 * 内联一个被导入的模块 —— **只内联「可达」的声明**。
 *
 * ⭐ 为什么必须只内联可达部分（实测 2026-11-19）：
 *   旧版**整模块**内联 ⇒ 客户端带上大量用不到的东西：
 *     · calc-output-i18n 的 10 个函数（客户端只需要 makeToken）⇒ 每个令牌化引擎多 ~8 KB
 *     · ai-pricing-popular 的**整份** popular JSON（客户端只需要 crossProviderModels）⇒ 多 ~11 KB
 *   ⇒ 直接把页面顶过 P96 的 200 KB/页 阈值（实测 claude 页 246 KB）。
 *
 * roots = 从这个模块**导入进来的名字**（引擎或上游模块给的入口）。
 * roots 为 '*' ⇒ 命名空间导入 ⇒ 老老实实整模块内联（拿不到入口名）。
 */
async function emitModuleFile(
  file: string,
  seenFiles: Set<string>,
  out: string[],
  roots: string[] | '*',
): Promise<void> {
  if (seenFiles.has(file)) return;
  seenFiles.add(file);
  const m2 = loadMod(file);

  // ① 可达声明：从 roots 出发，沿自由变量传递
  const reachable = new Set<string>();
  if (roots !== '*') {
    const queue: string[] = [...roots];
    while (queue.length > 0) {
      const name = queue.shift()!;
      if (reachable.has(name)) continue;
      reachable.add(name);
      const d = m2.topDecls.get(name);
      if (!d) continue;
      for (const s of collectFree(d)) {
        if (GLOBALS.has(s) || reachable.has(s)) continue;
        if (m2.topDecls.has(s)) queue.push(s);
      }
    }
  }

  // ② 可达声明的源码（后面用它决定「这个模块的 JSON 要留哪些属性」）
  const reachableText = roots === '*'
    ? ''
    : Array.from(reachable)
        .map((n) => {
          const d = m2.topDecls.get(n);
          return d ? d.getText() : '';
        })
        .join(NL);

  // ③ 这个模块自己的导入：只有「可达声明」用到的才继续内联
  for (const st of m2.sf.statements) {
    if (!ts.isImportDeclaration(st)) continue;
    const ic = st.importClause;
    if (!ic || ic.isTypeOnly) continue;
    const mod = (st.moduleSpecifier as ts.StringLiteral).text;
    if (mod.indexOf('engines/registry') >= 0) continue;
    const localName = ic.name ? ic.name.text : 'default';
    const named = ic.namedBindings && ts.isNamedImports(ic.namedBindings)
      ? ic.namedBindings.elements.map((el) => el.name.text)
      : [];
    // ⭐ JSON 的本地名（默认导入）**不是**模块的声明 ⇒ 判据是「可达声明有没有引用它」
    //   （旧判据只看 reachable.has(localName) ⇒ popular JSON 被丢掉 ⇒ 客户端报
    //    `popular is not defined`）
    const escLocal = localName.replace(/[^A-Za-z0-9_$]/g, '');
    const referenced = new RegExp('(?<![A-Za-z0-9_$])' + escLocal + '(?![A-Za-z0-9_$])').test(reachableText);
    const used = roots === '*' || reachable.has(localName) || referenced || named.some((n) => reachable.has(n));
    if (!used) continue;
    const base = resolve(dirname(file), mod);
    if (base.endsWith('.json')) {
      const data = JSON.parse(readFileSync(base, 'utf8')) as Record<string, unknown>;
      // ⭐ JSON 只保留**可达声明真正用到**的属性
      const esc = localName.replace(/[^A-Za-z0-9_$]/g, '');
      const dyn = new RegExp('(?<![A-Za-z0-9_$])' + esc + '\\s*\\[').test(reachableText);
      const propRe = new RegExp('(?<![A-Za-z0-9_$])' + esc + '\\.([A-Za-z_$][\\w$]*)', 'g');
      const props = new Set<string>();
      for (const m of reachableText.matchAll(propRe)) props.add(m[1]!);
      let value: unknown = data;
      if (!dyn && data !== null && typeof data === 'object' && !Array.isArray(data)) {
        const pruned: Record<string, unknown> = {};
        for (const k of Object.keys(data)) if (props.has(k)) pruned[k] = data[k];
        value = pruned;
      }
      out.push('var ' + localName + ' = ' + JSON.stringify(value) + ';');
      continue;
    }
    const f2 = resolveModuleFile(base);
    if (!f2) continue;
    await emitModuleFile(f2, seenFiles, out, named.length > 0 ? named : '*');
  }

  // ④ 只发射可达声明（保持源码顺序 ⇒ 初始化顺序与服务端一致）
  for (const name of m2.declOrder) {
    if (roots !== '*' && !reachable.has(name)) continue;
    const decl = m2.topDecls.get(name)!;
    out.push(declToJs(decl, name));
  }
}

/** 找到 customFn 的字面量表达式（顶层 `const customFn = ...` 或 `clientConfig.customFn: ...`） */
/**
 * 找出引擎里**所有** customFn 表达式。
 *
 * ⚠️ 必须找**全部**，不能只找第一个：
 *   有的引擎（实测 renewal-rate-calculator）同时有两处 customFn ——
 *     ① `engine.clientConfig.customFn`（对象字面量里的占位）
 *     ② `const customFn = ...` + 之后 `engine.clientConfig = { ..., customFn }`（**真正生效**的那个）
 *   ⇒ 只改第一处 = 改了**死代码** ⇒ 线上仍在跑手抄镜像 ⇒ 照样会漂。
 */
function findCustomExprs(root: ts.Node): ts.Expression[] {
  const found: ts.Expression[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'customFn' && n.initializer) { found.push(n.initializer); return; }
    if (ts.isPropertyAssignment(n) && n.name.getText() === 'customFn' && n.initializer) { found.push(n.initializer); return; }
    ts.forEachChild(n, visit);
  };
  visit(root);
  return found;
}

function escapeTemplate(s: string): string {
  let out = '';
  for (const ch of s) {
    if (ch === '\\') { out += '\\\\'; continue; }
    if (ch === '`') { out += '\\`'; continue; }
    out += ch;
  }
  return out.replace(/\$\{/g, '\\${');
}

/** 取导入绑定的**运行时值**（常量折叠用；解析不到返回 undefined） */
async function importValueRaw(mod: ModInfo, imp: ImpInfo): Promise<unknown> {
  if (imp.module.indexOf('engines/registry') >= 0) return undefined;
  const base = resolve(dirname(mod.file), imp.module);
  if (base.endsWith('.json')) {
    try { return JSON.parse(readFileSync(base, 'utf8')); } catch { return undefined; }
  }
  const file = resolveModuleFile(base);
  if (!file) return undefined;
  try {
    const m: any = await import(pathToFileURL(file).href);
    return imp.prop === '*' ? m : m[imp.prop];
  } catch { return undefined; }
}

/** ⭐ 常量折叠的禁用名单：这些表达式**不是纯函数** ⇒ 折了就把「运行时值」冻成「构建时值」 */
const FOLD_DENY = ['Date', 'random', 'now(', 'performance', 'window', 'document', 'process', 'require('];

/**
 * 常量折叠：模块级数据表的初始化式若**只依赖可解析的导入**，就在移植时求值并内联结果。
 *
 * ⭐⭐ 为什么必须有这一步（P156 的核心约束）：
 *   AI cost 引擎的服务端是 `const MODELS = pickInteractiveModels(PRICING.llm.openai.models, "openai")`
 *   —— 服务端可以带**整个** ai-pricing.json，但**客户端只能带 18 个可交互模型**。
 *   ⇒ 若照抄代码，客户端就会把整个价格表（138/245 个模型）搬进浏览器
 *   （实测 customFn 从 ~6 KB 涨到 **67~79 KB** ⇒ 违反 P156 且撑爆页面体积）。
 *   ⇒ 折叠后客户端只拿到**算好的子集**（18 个模型 ⇒ 几 KB），且与服务端**同值**。
 */
async function tryFold(mod: ModInfo, decl: ts.VariableDeclaration): Promise<string | null> {
  const init = decl.initializer;
  if (!init) return null;
  const text = init.getText();
  for (const bad of FOLD_DENY) if (text.indexOf(bad) >= 0) return null;
  const free = collectFree(init);
  const params: string[] = [];
  const values: unknown[] = [];
  const localFns: string[] = [];
  for (const name of free) {
    if (GLOBALS.has(name)) continue;
    const imp = mod.imports.get(name);
    if (imp) {
      const v = await importValueRaw(mod, imp);
      if (v === undefined) return null;
      params.push(name);
      values.push(v);
      continue;
    }
    // ⭐ 本地**函数**声明也可以进沙箱：它在沙箱里被创建 ⇒ 它自己的自由变量
    //   （同样是导入）也在作用域里 ⇒ 例：claude 的 crossProviderModel 读 PRICING.llm[provider]。
    const d = mod.topDecls.get(name);
    if (d && ts.isFunctionDeclaration(d)) { localFns.push(name); continue; }
    // ⭐ 顶层 **const f = () => …** 形态的本地函数也要能进沙箱
    //   （例：ai-api-cost-comparison 的 _buildProviders）
    if (d && ts.isVariableDeclaration(d) && d.initializer &&
        (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) {
      localFns.push(name);
      continue;
    }
    return null;
  }
  // ⭐ 本地函数自己的自由变量（同样是导入）也必须进沙箱 ——
  //   例：claude 的 crossProviderModel 读 PRICING.llm[provider]，而 PRICING 只出现在它体内。
  //   本地函数之间可能互相依赖 ⇒ 用「能建就建、建不了就延后」的定点循环。
  const pendingFns = [...localFns];
  let guard = 0;
  while (pendingFns.length > 0 && guard++ < 12) {
    const name = pendingFns.shift()!;
    const d = mod.topDecls.get(name)!;
    let ready = true;
    for (const s of collectFree(d)) {
      if (GLOBALS.has(s)) continue;
      if (params.indexOf(s) >= 0) continue;
      const imp = mod.imports.get(s);
      if (imp) {
        const v = await importValueRaw(mod, imp);
        if (v === undefined) return null;
        params.push(s);
        values.push(v);
        continue;
      }
      ready = false;
    }
    if (!ready) { pendingFns.push(name); continue; }
    const src = ts.isVariableDeclaration(d)
      ? 'return (' + stripTrailingSemicolon(transpile(d.initializer!.getText())) + ')'
      : 'return ' + stripTrailingSemicolon(transpile(d.getText().replace(/^export\s+/, '')));
    const mk = new Function(...params, src) as (...a: unknown[]) => unknown;
    const made = mk(...values);
    if (typeof made !== 'function') return null;
    params.push(name);
    values.push(made);
  }
  if (pendingFns.length > 0) return null;
  try {
    const js = transpile('return (' + text + ');');
    const fn = new Function(...params, js) as (...a: unknown[]) => unknown;
    const out = fn(...values);
    if (out === undefined || typeof out === 'function') return null;
    const json = JSON.stringify(out);
    if (json === undefined) return null;
    return json;
  } catch {
    return null;
  }
}

/**
 * ⭐ 客户端体积：移植件是**服务端原样代码**（可读、未压缩）⇒ 直接发到浏览器会让页面
 *   从 ~180 KB 涨到 ~250 KB ⇒ 撞破 P96 的 200 KB/页 阈值。
 *   ⇒ 用 esbuild 压一遍（空白 + 语法 + 局部标识符）。
 *
 * ⚠️ 入参名 inputs / pick / fill **不能被改**：页面用
 *    new Function('inputs', 'pick', 'fill', src) 调用 ⇒ 参数名被改就接不上。
 *    ⇒ 压缩时把这三个名字当**外层变量**（不是形参）⇒ esbuild 视其为全局引用 ⇒ 不改名。
 */
/**
 * ⭐ 客户端体积：移植件是**服务端原样代码**（可读、未压缩）⇒ 直接发到浏览器会让页面
 *   从 ~180 KB 涨到 ~250 KB ⇒ 撞破 P96 的 200 KB/页 阈值。
 *   ⇒ 用 esbuild 压一遍（空白 + 语法 + 局部标识符）。
 *
 * ⚠️ 入参名 inputs / pick / fill **不能被改**：页面用
 *    new Function('inputs', 'pick', 'fill', src) 调用 ⇒ 参数名被改就接不上。
 *    ⇒ 压缩时把这三个名字当**外层变量**（不是形参）⇒ esbuild 视其为全局引用 ⇒ 不改名。
 *
 * ⚠️ 怎么把「函数体」从压缩结果里取回来：
 *   不能用「最后一个 }」—— 移植件里有模板字面量（`String.raw\`…\``），
 *   模板内容里的 } 会把边界找错 ⇒ 实测取到一半的函数体（整页动态卡片直接空白）。
 *   ⇒ 改成：把函数体塞进 try，把一个**全局赋值标记**放进 finally；
 *      esbuild 不会重命名全局、也不会删掉它 ⇒ 标记位置就是可靠的结束边界。
 */
function minifyCustomFn(body: string): { code: string | null; error: string | null } {
  try {
    const out = transformSync('function __cf__(){try{' + body + '}finally{__FFK_END__=1}}', {
      minify: true,
      charset: 'utf8',
      target: 'es2020',
      legalComments: 'none',
      logLevel: 'silent',
    }).code;
    const open = out.indexOf('{');
    const marker = out.indexOf('__FFK_END__');
    // ⚠️ 压缩失败**必须报出原因**（旧版 catch 后直接 return null ⇒ 静默回落成未压缩件：
    //   页面悄悄变大，而体积守卫只会说「哪页超了」却说不出「为什么这页没压」）。
    if (open < 0 || marker < 0 || marker < open) {
      return { code: null, error: 'boundary marker not found (open=' + open + ', marker=' + marker + ')' };
    }
    // 取到标记为止 ⇒ 末尾是 `try{…}finally{` ⇒ 补一个 } 把 finally 闭合
    return { code: out.slice(open + 1, marker) + '}', error: null };
  } catch (e) {
    return { code: null, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface PortResult { slug: string; file: string; ok: boolean; changed?: boolean; note: string; }

async function portOne(engineFile: string, slug: string, write: boolean): Promise<PortResult> {
  const mod = loadMod(engineFile);
  const src = mod.sf.text;
  let obj: ts.ObjectLiteralExpression | null = null;
  for (const st of mod.sf.statements) {
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.name.text === 'engine' && d.initializer && ts.isObjectLiteralExpression(d.initializer)) obj = d.initializer;
      }
    }
    if (ts.isExpressionStatement(st) && ts.isCallExpression(st.expression)) {
      const call = st.expression;
      if (ts.isIdentifier(call.expression) && call.expression.text === 'registerEngine' && call.arguments.length > 0 && ts.isObjectLiteralExpression(call.arguments[0])) obj = call.arguments[0];
    }
  }
  if (!obj) return { slug, file: engineFile, ok: false, note: 'no engine object literal' };
  let serverFn: ts.FunctionLikeDeclaration | null = null;
  const findProp = (want: string) => {
    for (const p of obj!.properties) {
      if (!ts.isPropertyAssignment(p) && !ts.isMethodDeclaration(p)) continue;
      if (p.name.getText() !== want) continue;
      if (ts.isMethodDeclaration(p)) return p;
      const init: any = p.initializer;
      if (ts.isFunctionExpression(init) || ts.isArrowFunction(init)) return init;
      if (ts.isIdentifier(init)) {
        const d = mod.topDecls.get(init.text);
        if (d && ts.isFunctionDeclaration(d)) return d;
      }
    }
    return null;
  };
  serverFn = findProp('generate') || findProp('calculate');
  if (!serverFn || !serverFn.body || !ts.isBlock(serverFn.body)) return { slug, file: engineFile, ok: false, note: 'no generate/calculate fn (or its body is not a block)' };
  const paramsText = serverFn.parameters.map((p) => p.getText()).join(', ');
  const bodyText = serverFn.body.getText();
  if (usesThis(serverFn.body)) return { slug, file: engineFile, ok: false, note: 'server body uses this' };
  const paramNames: string[] = [];
  for (const p of serverFn.parameters) if (ts.isIdentifier(p.name)) paramNames.push(p.name.text);
  const free = collectFree(serverFn.body, paramNames);
  const pieces: string[] = [];
  const codeOnly: string[] = [];
  const jsonPending = new Map<string, unknown>();
  const unknown: string[] = [];
  const seenFiles = new Set<string>();
  let usesToken = false;
  let hasTokenPrefix = false;
  const tokImp = mod.imports.get('makeToken');
  if (tokImp && tokImp.module.indexOf('calc-output-i18n') >= 0) usesToken = true;
  const prefImp = mod.imports.get('CALC_OUTPUT_MAKE_TOKEN_JS');
  if (prefImp && prefImp.module.indexOf('calc-output-i18n') >= 0) hasTokenPrefix = true;
  if (usesToken && !hasTokenPrefix) {
    const i18n = loadMod(resolve(dirname(engineFile), '../../lib/calc-output-i18n.ts'));
    const decl = i18n.topDecls.get('CALC_OUTPUT_MAKE_TOKEN_JS');
    if (decl) {
      const init = (decl as ts.VariableDeclaration).initializer;
      const raw = init ? init.getText() : '';
      const js = (new Function('return ' + raw) as () => string)();
      pieces.push(js);
    }
  }
  if (usesToken) pieces.push('var makeToken = tk;');
  const neededDecls = new Set<string>();
  const neededImports = new Set<string>();
  const queue: string[] = [];
  for (const f of free) if (!GLOBALS.has(f)) queue.push(f);
  const emitted = new Set<string>();
  while (queue.length > 0) {
    const name = queue.shift()!;
    if (emitted.has(name)) continue;
    emitted.add(name);
    if (name === 'engine') { unknown.push(name + '(engine-obj)'); continue; }
    if (name === 'makeToken') continue;
    const decl = mod.topDecls.get(name);
    if (decl) {
      neededDecls.add(name);
      const sub = collectFree(decl);
      for (const s of sub) if (!GLOBALS.has(s) && !emitted.has(s)) queue.push(s);
      continue;
    }
    if (mod.imports.has(name)) { neededImports.add(name); continue; }
    unknown.push(name);
  }
  // ⭐ 常量折叠：模块级数据表（`MODELS = pickInteractiveModels(PRICING…, "openai")`）
  //   若只依赖**可解析的导入**，就在移植时求值并内联**算好的子集**
  //   ⇒ 客户端不会把整个 ai-pricing.json 搬进浏览器（P156 的核心约束）。
  const folds = new Map<string, string>();
  for (const name of Array.from(neededDecls)) {
    const decl = mod.topDecls.get(name);
    if (!decl || !ts.isVariableDeclaration(decl)) continue;
    const json = await tryFold(mod, decl);
    if (json !== null) folds.set(name, json);
  }
  // 折叠掉的声明不再需要它的导入 ⇒ 重算导入集合（否则整个价格表会被发射进客户端）
  const finalImports = new Set<string>();
  for (const s of free) if (mod.imports.has(s)) finalImports.add(s);
  for (const name of neededDecls) {
    if (folds.has(name)) continue;
    const decl = mod.topDecls.get(name);
    if (!decl) continue;
    for (const s of collectFree(decl)) if (mod.imports.has(s)) finalImports.add(s);
  }
  for (const st of mod.sf.statements) {
    if (!ts.isImportDeclaration(st)) continue;
    const ic = st.importClause;
    if (!ic || ic.isTypeOnly) continue;
    const mod2 = (st.moduleSpecifier as ts.StringLiteral).text;
    if (mod2.indexOf('engines/registry') >= 0) continue;
    const base = resolve(dirname(engineFile), mod2);
    if (base.endsWith('.json')) {
      const localName = ic.name ? ic.name.text : 'default';
      if (!finalImports.has(localName)) continue;
      const data = JSON.parse(readFileSync(base, 'utf8'));
      jsonPending.set(localName, data);
      continue;
    }
    const f2 = resolveModuleFile(base);
    if (!f2) continue;
    const roots = Array.from(finalImports).filter((nm) => {
      const info = mod.imports.get(nm);
      return info && info.module === mod2;
    });
    if (roots.length === 0) continue;
    await emitModuleFile(f2, seenFiles, pieces, roots);
  }
  for (const st of mod.sf.statements) {
    if (ts.isImportDeclaration(st)) continue;
    if (ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st)) continue;
    if (ts.isExpressionStatement(st) && ts.isCallExpression(st.expression)) {
      const call = st.expression;
      if (ts.isIdentifier(call.expression) && call.expression.text === 'registerEngine') continue;
    }
    // ⚠️ 模块级「管道」语句不能搬进客户端：`export { ... }` / `export default`
    //   在函数体里是 **SyntaxError**（实测 esbuild 直接报 Unexpected "export"）。
    if (ts.isExportDeclaration(st) || ts.isExportAssignment(st) || ts.isImportEqualsDeclaration(st)) continue;
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (!ts.isIdentifier(d.name)) continue;
        if (!neededDecls.has(d.name.text)) continue;
        const folded = folds.get(d.name.text);
        if (folded !== undefined) {
          pieces.push('var ' + d.name.text + ' = ' + folded + ';');
          codeOnly.push('var ' + d.name.text + ' = {};');
          continue;
        }
        pieces.push(declToJs(d, d.name.text));
        codeOnly.push(declToJs(d, d.name.text));
      }
      continue;
    }
    if (ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isEnumDeclaration(st)) {
      if (!st.name || !neededDecls.has(st.name.text)) continue;
      pieces.push(declToJs(st, st.name.text));
      codeOnly.push(declToJs(st, st.name.text));
      continue;
    }
    // 其余顶层语句（典型是「填数据」语句，如 `for (...) ALL_MODELS.push(...)`）：
    //   只有当它**没有引用未发射的模块级名字**时才搬进客户端。
    //   ⚠️ 否则会把模块级管道代码搬进去 ⇒ 运行时 **ReferenceError**
    //      （实测 renewal-rate-calculator 的 `engine.clientConfig = { ..., customFn }`：
    //        engine / customFn 是模块级对象，客户端根本没有）。
    const stFree = collectFree(st);
    let resolvable = true;
    for (const n of stFree) {
      if (mod.topDecls.has(n) && !neededDecls.has(n)) { resolvable = false; break; }
    }
    if (!resolvable) continue;
    pieces.push(transpile(st.getText()).trim());
    codeOnly.push(transpile(st.getText()).trim());
  }
  const extraParams: string[] = [];
  for (const p of ['pick', 'fill']) if (free.has(p)) extraParams.push(p);
  const sig = paramsText + (extraParams.length > 0 ? ', ' + extraParams.join(', ') : '');
  const serverJs = transpile('var __server = function (' + sig + ') ' + bodyText + ';').trim();
  pieces.push(serverJs);
  pieces.push('function run(inputs, pick, fill) { var __r = __server(inputs' + (extraParams.length > 0 ? ', pick, fill' : '') + '); return Array.isArray(__r) ? __r.join(' + JSON.stringify('\n') + ') : String(__r); }');
  pieces.push('return [run(inputs, pick, fill)];');
  const rest = pieces.join(NL);
  const codeOnlyText = codeOnly.join(NL);
  // ⭐⭐ JSON 导入**按实际访问的属性裁剪**再内联：
  //   服务端 body 里常有一处 `PRICING.lastUpdated` ⇒ 若整份 JSON 都搬进客户端，
  //   客户端就会背上整个价格表（138/245 个模型）⇒ 违反 P156 的「客户端只带可交互子集」。
  //   ⇒ 只保留**代码里真正访问到**的顶层属性；遇到**动态访问**（`PRICING[x]`）就不裁剪。
  // ⭐⭐ 「可达模型 key」= 代码里**字面提到**的模型 key ∪ 折叠表里带的模型 key
  //   为什么需要它：AI cost 引擎的服务端用 `PRICING.llm[provider].models[key]` 这种
  //   **动态访问**取跨供应商对比价 ⇒ 旧的「顶层属性裁剪」对它无效 ⇒ 客户端会背上
  //   **整份价格表**（实测 claude 页内联 34 KB / 249 个模型）⇒ 既撑爆页面，
  //   又违反 P156 的「客户端只带可交互子集」。
  //   ⇒ 这里把 `llm.<provider>.models` 裁到只剩真正用得上的那些。
  const datasetModelKeys = new Set<string>();
  for (const data of jsonPending.values()) {
    const llmAny = (data as { llm?: unknown } | null)?.llm;
    if (!llmAny || typeof llmAny !== 'object') continue;
    for (const pv of Object.values(llmAny as Record<string, unknown>)) {
      const models = (pv as { models?: unknown } | null)?.models;
      if (!models || typeof models !== 'object') continue;
      for (const k of Object.keys(models as Record<string, unknown>)) datasetModelKeys.add(k);
    }
  }
  const reachableModels = new Set<string>();
  for (const k of datasetModelKeys) {
    if (codeOnlyText.indexOf('"' + k + '"') >= 0 || rest.indexOf("'" + k + "'") >= 0) reachableModels.add(k);
  }
  for (const json of folds.values()) {
    let parsed: unknown;
    try { parsed = JSON.parse(json); } catch { continue; }
    const walk = (v: unknown): void => {
      if (typeof v === 'string') { if (datasetModelKeys.has(v)) reachableModels.add(v); return; }
      if (Array.isArray(v)) { for (const x of v) walk(x); return; }
      if (v && typeof v === 'object') { for (const x of Object.values(v as Record<string, unknown>)) walk(x); }
    };
    walk(parsed);
  }

  const jsonVars: string[] = [];
  for (const [localName, data] of jsonPending) {
    const esc = localName.replace(/[^A-Za-z0-9_$]/g, '');
    const dynTopRe = new RegExp('(?<![A-Za-z0-9_$])' + esc + '\\s*\\[', 'g');
    const dynPropRe = new RegExp('(?<![A-Za-z0-9_$])' + esc + '\\.([A-Za-z_$][\\w$]*)\\s*\\[', 'g');
    const propRe = new RegExp('(?<![A-Za-z0-9_$])' + esc + '\\.([A-Za-z_$][\\w$]*)', 'g');
    const props = new Set<string>();
    for (const m of rest.matchAll(propRe)) props.add(m[1]!);
    const dynProps = new Set<string>();
    for (const m of rest.matchAll(dynPropRe)) dynProps.add(m[1]!);
    const topLevelDynamic = dynTopRe.test(rest);
    let value: unknown = data;
    if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>;
      const pruned: Record<string, unknown> = {};
      for (const k of Object.keys(obj)) {
        if (topLevelDynamic || props.has(k) || dynProps.has(k)) pruned[k] = obj[k];
      }
      // ⭐ llm 下的模型表按「可达 key」裁剪（动态访问也要裁）
      const keptLlm = pruned['llm'];
      if (keptLlm && typeof keptLlm === 'object' && !Array.isArray(keptLlm)) {
        const prunedLlm: Record<string, unknown> = {};
        for (const [p, pv] of Object.entries(keptLlm as Record<string, unknown>)) {
          const models = (pv as { models?: unknown } | null)?.models;
          if (!models || typeof models !== 'object') { prunedLlm[p] = pv; continue; }
          const kept: Record<string, unknown> = {};
          for (const [k, mv] of Object.entries(models as Record<string, unknown>)) {
            if (reachableModels.has(k)) kept[k] = mv;
          }
          prunedLlm[p] = { ...(pv as object), models: kept };
        }
        pruned['llm'] = prunedLlm;
      }
      value = pruned;
    }
    jsonVars.push('var ' + localName + ' = ' + JSON.stringify(value) + ';');
  }
  const body = jsonVars.length > 0 ? jsonVars.join(NL) + NL + rest : rest;
  // ⭐ 客户端体积：移植件是**服务端原样代码**（可读、未压缩）⇒ 直接发到浏览器
  //   会让 AI cost 页从 ~180 KB 涨到 ~250 KB ⇒ 撞破 P96 的 200 KB/页 阈值。
  //   ⇒ 压一遍（空白 + 语法 + 局部标识符）。
  //   ⚠️ 入参名 inputs / pick / fill **不能被改**（页面用 new Function('inputs','pick','fill', src) 调用）
  //      ⇒ 压缩时把它们当**外层变量**（不是形参）⇒ esbuild 视其为全局引用 ⇒ 不改名。
  const minifyResult = minifyCustomFn(body);
  // ⭐ 溯源标记挂在**压缩之后**：压缩会吃掉注释 ⇒ 挂早了标记就没了
  //   ⇒ 「客户端 customFn 是服务端派生的」在产物里就查无实据（守卫会假红）。
  const finalBody = PROVENANCE_START + String.fromCharCode(10)
    + (minifyResult.code === null ? body : minifyResult.code)
    + String.fromCharCode(10) + PROVENANCE_END;
  const customFnExprs = findCustomExprs(mod.sf);
  if (customFnExprs.length === 0) return { slug, file: engineFile, ok: false, note: 'no customFn literal' };
  const prefix = usesToken && hasTokenPrefix ? 'CALC_OUTPUT_MAKE_TOKEN_JS + ' : '';
  const replacement = prefix + '`' + escapeTemplate(finalBody) + '`';
  // 从后往前替换 ⇒ 靠前表达式的偏移量不受影响
  let newContent = src;
  for (let i = customFnExprs.length - 1; i >= 0; i--) {
    const expr = customFnExprs[i];
    const start = expr.getStart(mod.sf);
    const end = expr.getEnd();
    newContent = newContent.slice(0, start) + replacement + newContent.slice(end);
  }
  const changed = newContent !== src;
  // ⚠️ 「未解析的自由变量」= 客户端 customFn 里会有一个**不存在**的名字 ⇒ 运行时 ReferenceError
  //   ⇒ 不能只记在 note 里（旧版就是这样 ⇒ 静默降级 ⇒ 页面一算就炸）。
  //   ⇒ 判失败 ⇒ codegen 会 exit 1 ⇒ 每周 bot 会把问题暴露出来而不是悄悄发上去。
  if (unknown.length > 0) {
    return {
      slug, file: engineFile, ok: false, changed: false,
      note: 'unresolved free identifier(s): ' + unknown.join(',')
        + ' — the client customFn would throw ReferenceError at runtime',
    };
  }
  if (write && changed) writeFileSync(engineFile, newContent, 'utf8');
  return { slug, file: engineFile, ok: true, changed, note: 'pieces=' + pieces.length + ' customFn=' + customFnExprs.length + ' token=' + usesToken + ' prefix=' + hasTokenPrefix + ' minify=' + (minifyResult.error === null ? 'ok' : 'FAIL ' + minifyResult.error) + (unknown.length ? ' UNKNOWN=' + unknown.join(',') : '') };
}

export { portOne };

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const write = !args.includes('--dry') && !check;

  // ── 批量模式（给 scripts/codegen-customfn.mjs 用）────────────────────
  //   node --import tsx scripts/customfn-port.ts --batch <清单.json> [--write]
  //   清单 = [{ file: 'src/engines/xxx.ts', slug: 'solopreneur-xxx' }, ...]
  //   stdout 只输出一行带哨兵的 JSON ⇒ 调用方不会被别的日志干扰。
  const batchIdx = args.indexOf('--batch');
  if (batchIdx >= 0) {
    const listPath = args[batchIdx + 1];
    if (!listPath) {
      console.error('customfn-port: --batch 需要一个清单文件路径');
      process.exit(2);
    }
    const list = JSON.parse(readFileSync(resolve(process.cwd(), listPath), 'utf8')) as Array<{ file: string; slug: string }>;
    const results: Array<{ slug: string; file: string; ok: boolean; changed: boolean; note: string }> = [];
    for (const item of list) {
      const abs = resolve(process.cwd(), item.file);
      const r = await portOne(abs, item.slug, write);
      results.push({ slug: r.slug, file: item.file, ok: r.ok, changed: r.changed === true, note: r.note });
    }
    console.log(PORT_JSON_SENTINEL + JSON.stringify({ results }));
    return;
  }

  const rest = args.filter((a) => a !== '--dry' && a !== '--check');
  for (let i = 0; i + 1 < rest.length; i += 2) {
    const file = resolve(process.cwd(), rest[i]);
    const slug = rest[i + 1];
    const r = await portOne(file, slug, write);
    console.log((r.ok ? 'OK   ' : 'FAIL ') + slug + ' :: ' + r.note + (r.changed ? ' [changed]' : ''));
  }
}

if (process.argv[1] && process.argv[1].indexOf('customfn-port.ts') >= 0) main();
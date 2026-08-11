// P141-B1-T1: codegen AST builder for customFn data tables
// 把 modelMap 序列化为可被 new Function() 解析的 minified JS source string
// 消除 var + 嵌套三元 + emoji 字面量重复 (来自 OCR Quick Win #1)
// 输出可被 `new Function('inputs', 'pick', 'fill', src)` 解析,
// 作为 customFn 的数据表段被 engine 消费。
//
// P141-B1-T2: 增加 'model-shard' outputFormat — codegen 端直接产出
// `M['k']={i:5,o:10,...};` 这种 model→fields 表,与 8 AI cost engine
// runtime 期待一致 (field-shard 输出对 unit test 保留为 backward compat)。

/**
 * 字段映射配置。键是 PRICING.json 的字段名,值是 customFn 里本地变量名。
 * 例: `{ input: 'i', output: 'o' }` → 生成 `const i={...};const o={...};`
 * 后续会演化为更通用的字段映射(支持 context / batch 等)。
 */
export interface ModelFieldMap {
  /** 必填:JSON 'input' → customFn 'i' */
  input: string;
  /** 必填:JSON 'output' → customFn 'o' */
  output: string;
  /** 可选:JSON 'context' / 'contextWindow' → customFn 'c' / 'cw' */
  context?: string;
  /** 其他可选字段 (允许 undefined 以兼容可选字段的 index 访问) */
  [key: string]: string | undefined;
}

/**
 * model-shard 模式的 field callback 签名: 给定单个 model 的数据 + 名字,
 * 返回该 model record 的 JS 字段片段(不含外层 `{...}`)。
 * 例: `(m) => `i:${m.input},o:${m.output},f:'${m.family}'`` → `i:5,o:30,f:'g5'`。
 */
export type FieldRenderer = (modelData: Record<string, any>, modelName: string) => string;

/**
 * buildCustomFn 选项。
 */
export interface BuildCustomFnOptions {
  /**
   * 输出格式:
   * - 'field-shard' (default, B1-T1): 按字段拆 map,`const i={...};const o={...};`
   *   unit test 走这个分支,`typeof === 'object'` 契约。
   * - 'model-shard' (B1-T2): 输出 `M['k']={i:5,o:10,...};` 行集合,
   *   适配 8 AI cost engine runtime 期待(`Object.keys(M)` + `m.i`)。
   *   必须同时提供 `fieldMap`。
   */
  outputFormat?: 'field-shard' | 'model-shard';
  /** model-shard 模式:外层变量名(M / PS / PS2 / GT / MS),默认 'M' */
  varName?: string;
  /** model-shard 模式:openai 风格 `M['k']={...};` 形式(每行单独 var decl) */
  openaiStyle?: boolean;
  /** model-shard 模式:每个 model record 的字段渲染函数 */
  fieldMap?: FieldRenderer;
}

/**
 * 序列化 PRICING 模型数据为 customFn 数据表 JS source string。
 *
 * 用 const + 对象字面量代替 var + 嵌套三元(QR Quick Win #5 + #6)。
 * 同时内嵌 `__bandMeta` 查表,用于 healthEmoji/healthLabel/tip 的 health band 查表
 * (OCR Quick Win #6 嵌套三元查表化)。
 *
 * @param modelMap PRICING.json 模型数据,如 `PRICING.llm.openai.models`
 * @param engineSlug engine 标识符(保留参数,future use for per-engine 自定义)
 * @param mapping 字段映射(JSON key → customFn 本地变量名)
 * @param options 输出格式 + 字段渲染函数(model-shard 必填 fieldMap)
 * @returns minified JS source string, 可被 `new Function()` 解析
 */
export function buildCustomFn(
  modelMap: Record<string, Record<string, any>>,
  engineSlug: string,
  mapping: ModelFieldMap,
  options: BuildCustomFnOptions = {},
): string {
  const outputFormat = options.outputFormat ?? 'field-shard';

  // engineSlug 当前未在输出中使用 — 保留作为 future hook(per-engine custom output override)。
  void engineSlug;

  // model-shard: 输出 `M['k']={i:5,o:10,...};` 行集合(8 AI cost engine 期待)
  if (outputFormat === 'model-shard') {
    if (!options.fieldMap) {
      throw new Error("buildCustomFn: outputFormat='model-shard' requires options.fieldMap");
    }
    const varName = options.varName ?? 'M';
    const fieldMap = options.fieldMap;
    // 用单引号包 model name,保持与 codegen-customfn.mjs 既有 hand-minified 输出风格一致。
    const q = (s: string) => `'${s.replace(/'/g, "\\'")}'`;
    const entries = Object.entries(modelMap).map(([modelName, modelData]) => {
      const fields = fieldMap(modelData, modelName);
      if (options.openaiStyle) {
        // openai 风格: `M['gpt-5']={i:5,o:10,...};` 单独一行
        return `${varName}[${q(modelName)}]={${fields}};`;
      }
      // 其他: `'gpt-5':{i:5,o:10,...}` 形式(嵌入 `var M={...};`)
      return `${q(modelName)}:{${fields}}`;
    });
    // openai 风格需要先 `var M={};` 触发声明,后接 `M['k']={...};` 逐行赋值。
    // 其他 engine 用 `var M={...};` 一次性输出闭合表。
    if (options.openaiStyle) {
      return `var ${varName}={};\n${entries.join('\n')};`;
    }
    return `var ${varName}={${entries.join(',')}};`;
  }

  // field-shard (B1-T1 default): 按字段拆 map
  // 用 const + 对象字面量代替 var + 嵌套三元
  const fields = Object.entries(mapping).map(([jsonKey, localKey]) => {
    const entries = Object.entries(modelMap).map(([modelName, modelData]) => {
      const value = modelData[jsonKey];
      return `${JSON.stringify(modelName)}:${value}`;
    }).join(',');
    return `const ${localKey}={${entries}};`;
  }).join('');

  // 用对象查找代替嵌套三元 (healthEmoji/healthLabel/tip 等场景通用)
  // 引擎 health band 查表统一用 __bandMeta[b].{emoji,label,tip} 三元嵌套替代。
  // OCR Quick Win #6: 4 band (good / warn / risk / bad) emoji 查表化。
  const lookupFn = `
const __pick=(o,k)=>o&&o[k];
const __bandMeta={
  'good':{emoji:'🟢',label:'Healthy',tip:'All metrics within target range.'},
  'warn':{emoji:'🟡',label:'Caution',tip:'Watch for early warning signs.'},
  'risk':{emoji:'🟠',label:'At Risk',tip:'Action needed within the quarter.'},
  'bad':{emoji:'🔴',label:'Critical',tip:'Immediate intervention required.'}
};`;

  // 返回 object 聚合所有数据表: 让 `new Function('inputs','pick','fill',src)(...)` 返回 object
  // (typeof === 'object'),这是 customFn 数据表段的最小契约 — 调用方后续可在其基础上扩展逻辑。
  // 取 mapping 中所有 localKey 名,组成 {i, o, c, ...} 对象。
  const localKeys = Object.values(mapping).join(',');
  return fields + lookupFn + `return {${localKeys},__bandMeta};`;
}

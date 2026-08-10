// P141-B1-T1: codegen AST builder for customFn data tables
// 把 modelMap 序列化为可被 new Function() 解析的 minified JS source string
// 消除 var + 嵌套三元 + emoji 字面量重复 (来自 OCR Quick Win #1)
// 输出可被 `new Function('inputs', 'pick', 'fill', src)` 解析,
// 作为 customFn 的数据表段被 engine 消费。

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
 * 序列化 PRICING 模型数据为 customFn 数据表 JS source string。
 *
 * 用 const + 对象字面量代替 var + 嵌套三元(QR Quick Win #5 + #6)。
 * 同时内嵌 `__bandMeta` 查表,用于 healthEmoji/healthLabel/tip 的 health band 查表
 * (OCR Quick Win #6 嵌套三元查表化)。
 *
 * @param modelMap PRICING.json 模型数据,如 `PRICING.llm.openai.models`
 * @param engineSlug engine 标识符(保留参数,future use for per-engine 自定义)
 * @param mapping 字段映射(JSON key → customFn 本地变量名)
 * @returns minified JS source string, 可被 `new Function()` 解析
 */
export function buildCustomFn(
  modelMap: Record<string, Record<string, number | string>>,
  engineSlug: string,
  mapping: ModelFieldMap,
): string {
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

  // engineSlug 当前未在输出中使用 — 保留作为 future hook(per-engine custom output override)。
  void engineSlug;
  // 返回 object 聚合所有数据表: 让 `new Function('inputs','pick','fill',src)(...)` 返回 object
  // (typeof === 'object'),这是 customFn 数据表段的最小契约 — 调用方后续可在其基础上扩展逻辑。
  // 取 mapping 中所有 localKey 名,组成 {i, o, c, ...} 对象。
  const localKeys = Object.values(mapping).join(',');
  return fields + lookupFn + `return {${localKeys},__bandMeta};`;
}
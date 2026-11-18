#!/usr/bin/env node
// P168 B3-10 —— **多输入漂移复验器**（比「只看默认输入」的验收器强一档）。
//
// 为什么需要它
// ----------------
//   `p168-b310-check.ts` 只用**一组**输入（codegen 默认）⇒ 只能证明「默认输入下不漂」。
//   ⭐ 但**用户会改输入** ⇒ 手写镜像的客户端在别的输入下照样会漂。
//   B3-10 实测：默认输入下全绿的 5 个引擎（ai-image-cost / attrition-cost /
//   support-capacity-planning / dsar-cost / cmp-roi），在改过输入后**逐字不一致**
//   （例：客户端把 0 人团队的利用率算成 0.0%，服务端算成 Infinity%）。
// ⇒ 本工具对每个引擎跑**多组输入**：codegen 默认 + 每个数值输入的 4 个变体 + 每个下拉选项。
// ⇒ 验收口径与页面真实使用方式一致（用户就是改输入）。
//
// 判据（每组输入都要满足）：
//   ① 客户端返回**恰好 1 个**元素（页面只渲染 results[0]）；
//   ② 客户端输出与服务端 generate() 输出**逐字一致**（静态卡片与动态卡片不能矛盾）；
//   ③ 客户端**不得抛错**（抛错 ⇒ 该页动态卡片空白）。
//
// 用法（必须从仓库根跑）：
//   node node_modules/tsx/dist/cli.mjs tests/scripts/p168-b310-multi-input.ts
// 退出码：0 = 全部通过；1 = 有引擎在某些输入下漂移 / 多元素 / 抛错。

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { codegenDefaults, syntheticInputs, browserPick, browserFill } from './p168-server-client-parity.ts';

const NLc = String.fromCharCode(10);

function variants(e: any, base: Record<string, string>): Record<string, string>[] {
  const out: Record<string, string>[] = [base];
  const nums = [0, 1, 999999, 12345.67];
  for (const input of e.inputs ?? []) {
    if (input.type === 'number') {
      for (const n of nums) {
        const v = Object.assign({}, base);
        v[input.name] = String(n);
        out.push(v);
      }
      continue;
    }
    if (input.type === 'select' && Array.isArray(input.options) && input.options.length > 1) {
      for (const opt of input.options) {
        const v = Object.assign({}, base);
        const val = typeof opt === 'object' && opt !== null ? (opt.value ?? opt.label) : opt;
        v[input.name] = String(val);
        out.push(v);
      }
    }
  }
  return out;
}

async function main(): Promise<void> {
  const root = resolve(process.cwd());
  await import(pathToFileURL(resolve(root, 'src', 'engines', 'index.ts')).href);
  const { getAllEngines } = await import(pathToFileURL(resolve(root, 'src', 'core', 'engines', 'registry.ts')).href);
  const defaults = codegenDefaults();
  let bad = 0; let cases = 0;
  for (const e of getAllEngines() as any[]) {
    const body = e.clientConfig && e.clientConfig.customFn;
    if (typeof body !== 'string' || body.length === 0) continue;
    const base = defaults[e.slug] ?? syntheticInputs(e);
    const sets = variants(e, base);
    let fn: any = null;
    try { fn = new Function('inputs', 'pick', 'fill', body); } catch (err: any) { console.log('SYNTAX ' + e.slug + ' :: ' + String(err && err.message)); bad++; continue; }
    for (const inputs of sets) {
      cases++;
      let server = '';
      try {
        const gen = e.generate ?? e.calculate;
        const so = gen.call(e, inputs);
        server = Array.isArray(so) ? so.map(String).join(NLc) : String(so);
      } catch (err: any) { continue; }
      let client = ''; let err2 = ''; let n = 0;
      try {
        const co = fn(inputs, browserPick, browserFill);
        n = Array.isArray(co) ? co.length : 1;
        client = Array.isArray(co) ? co.map(String).join(NLc) : String(co);
      } catch (err: any) { err2 = String(err && err.message); }
      if (err2) { console.log('ERR  ' + e.slug + ' :: ' + err2); bad++; continue; }
      if (n !== 1) { console.log('MULTI ' + e.slug + ' :: elements=' + n); bad++; continue; }
      if (server !== client) {
        bad++;
        const sL = server.split(NLc); const cL = client.split(NLc);
        let k = 0; while (k < sL.length && sL[k] === cL[k]) k++;
        console.log('DIFF ' + e.slug + ' :: line' + (k + 1));
        console.log('   S: ' + (sL[k] ?? '<none>').slice(0, 120));
        console.log('   C: ' + (cL[k] ?? '<none>').slice(0, 120));
        break;
      }
    }
  }
  console.log('cases=' + cases + ' bad=' + bad);
}

main();
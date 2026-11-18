/**
 * P168 B3-10 —— 「生成区」边界。
 *
 * 客户端 customFn 现在是**服务端同一份代码的派生副本**（scripts/customfn-port.ts 产出），
 * 它就**躺在同一个引擎文件里**（一个模板字面量内），并用一对标记圈出：
 *
 *   FFK-SERVER-DERIVED:start … FFK-SERVER-DERIVED:end
 *
 * ⇒ 任何**扫引擎源码文本**的守卫都会看到这份**副本** ⇒ 两个后果：
 *   ① **重复**：服务端那份已经扫过，副本是同一段代码；
 *   ② **假红**：压缩器的**改名**会在副本里造出 `$t` 之类的**标识符**，
 *      被折叠的**标量表**（例：训练引擎的 Spot/Reserved 折扣带）也会变成字面量
 *      ⇒ 「不得写死百分比」「不得出现 $$」「必须是派生量」这类判据会**误伤副本**。
 *
 * ⇒ 修法：扫源码前先**去掉生成区** ⇒ 判据只看**服务端**那份（用户真正看到的那份）。
 */
export const GENERATED_START = 'FFK-SERVER-DERIVED:start';
export const GENERATED_END = 'FFK-SERVER-DERIVED:end';

/** 去掉引擎源码里的「生成区」 */
export function stripGeneratedRegion(src: string): string {
  return src.replace(new RegExp(GENERATED_START + '[\\s\\S]*?' + GENERATED_END, 'g'), '');
}

/**
 * 从文本里取「某个锚点之后、某个字段」的**数值**。
 *
 * ⭐ 为什么必须**数值化**而不是文本比较：压缩器会把 `0.5` 写成 `.5`、
 *   把 `true` 写成 `!0` ⇒ 文本比较（`JSON.stringify(0.5)` = `"0.5"`）**必然对不上**
 *   ⇒ 那会是「测错了」，不是「坏了」。
 *
 * ⭐ 为什么必须带**锚点**：生成区里有几十张表 ⇒ 不带锚点就会取到别人的数。
 */
export function foldedNumber(text: string, anchor: string, field: string): number | null {
  const at = text.indexOf(anchor);
  if (at < 0) return null;
  const rest = text.slice(at);
  const pattern = '"?' + field + '"?\\s*:\\s*(!0|!1|-?\\d*\\.?\\d+(?:e[-+]?\\d+)?)';
  const m = new RegExp(pattern).exec(rest);
  if (!m) return null;
  const raw = m[1]!;
  if (raw === '!0') return 1;
  if (raw === '!1') return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** 取引擎源码里的「生成区」内容（没有则返回空串） */
export function generatedRegion(src: string): string {
  const re = new RegExp(GENERATED_START + '([\\s\\S]*?)' + GENERATED_END, 'g');
  const parts: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) parts.push(m[1] ?? '');
  return parts.join(String.fromCharCode(10));
}
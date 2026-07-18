// State-machine string parser + zh-value replacer, shared across i18n scripts.
// P18-1: extracted from apply-translations.mjs so tests can import without eval.
// P20-3: unified parseStringLiteral + parseStringLiteralSmart into a single
// function with a `tolerant` option. The smart parser is preserved as an
// alias for backward compatibility at call sites that want the P17b-corruption
// recovery behavior explicitly.

export function parseStringLiteral(content, i, { tolerant = false } = {}) {
  const quote = content[i];
  if (quote !== '"' && quote !== "'") return null;
  let j = i + 1;
  let value = '';
  while (j < content.length) {
    const ch = content[j];
    if (ch === '\\') {
      value += ch + (content[j + 1] ?? '');
      j += 2;
      continue;
    }
    if (ch === quote) {
      if (tolerant) {
        // Look ahead past whitespace — closing quote must be followed by `,` or `}`
        let k = j + 1;
        while (k < content.length && /\s/.test(content[k])) k++;
        if (k >= content.length || content[k] === ',' || content[k] === '}') {
          return [value, j + 1];
        }
        // Not a boundary — treat as content and keep walking
        value += ch;
        j++;
        continue;
      }
      return [value, j + 1];
    }
    value += ch;
    j++;
  }
  return null;
}

// Backward-compat alias: explicit name for the P17b-corruption-tolerant mode.
// Kept so existing call sites (replaceZhValue line below + any future callers)
// can opt into the recovery behavior by name without passing `{ tolerant: true }`.
export const parseStringLiteralSmart = (content, i) =>
  parseStringLiteral(content, i, { tolerant: true });

export function replaceZhValue(src, key, newZh) {
  const escapedKey = key.replace(/\./g, '\\.');
  const keyRe = new RegExp(`'${escapedKey}':\\s*\\{`, 'g');
  let m;
  while ((m = keyRe.exec(src)) !== null) {
    const objStart = m.index;
    const objEnd = src.indexOf('}', objStart);
    if (objEnd === -1) break;
    const obj = src.substring(objStart, objEnd + 1);
    const zhKw = obj.match(/zh:\s*/);
    if (!zhKw) continue;
    let zi = obj.indexOf(zhKw[0]) + zhKw[0].length;
    while (zi < obj.length && /\s/.test(obj[zi])) zi++;
    if (zi >= obj.length) continue;
    const quote = obj[zi];
    if (quote !== '"' && quote !== "'") continue;
    // Smart parser tolerates P17b-corruption pattern (unescaped `'` inside value)
    const parsed = parseStringLiteralSmart(obj, zi);
    if (!parsed) continue;
    const [, valueEnd] = parsed;
    const escapedNewZh = newZh.replace(/\\/g, '\\\\').replace(new RegExp(quote, 'g'), '\\' + quote);
    const quoteAbsPos = objStart + zi;          // src pos of opening quote
    const closingQuoteAbsPos = objStart + (valueEnd - 1);  // src pos of closing quote
    return src.substring(0, quoteAbsPos + 1) + escapedNewZh + src.substring(closingQuoteAbsPos);
  }
  return src;
}
#!/usr/bin/env node
// Verify customFn parses for a slug. Handles 4 customFn styles:
//   1. const customFn = "..."       (top-level var)
//   2. customFn: "..."               (inline property, double-quoted)
//   3. customFn: `...`               (inline template literal)
//   4. customFn: ["...", "..."].join('\n')   (array-join)
//
// Why this exists: tests/scripts/test-customFn.mjs (Task 3) only handled
// styles 1+2+3 and omitted the `\n`/`\t`/`\\`/`\'`/`\"` decode step, leaving
// 5 customer-support engines (Style 2 with embedded `\n` literals) unparseable.
// Style 4 (array-join) was entirely unsupported. This script fixes both.
//
// Deviations from the brief-supplied reference code:
//   - Brief's `quote = src[i]` (Style 2/3) reads the first body character
//     instead of the opening quote, producing wrong extraction boundaries.
//     Fixed: use `quote = afterColon` (the regex-captured opening quote).
//   - Brief's `stringRegex` in extractArrayJoinBody excludes all quote chars
//     from captured content, so it stops at the first inner single quote
//     inside double-quoted array elements (e.g. `"    '🩺 ...' + ..."`),
//     fragmenting those strings into many pieces. Fixed: replaced with a
//     depth/string-aware scanner that splits on top-level commas only.

import fs from 'node:fs';

function decodeEscapes(s) {
  return s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\').replace(/\\'/g, "'").replace(/\\"/g, '"');
}

// Strip the surrounding quote pair and decode common escapes.
// Caller is responsible for knowing the part is a string literal.
function stripAndDecode(part) {
  const trimmed = part.trim();
  if (trimmed.length < 2) return '';
  const quote = trimmed[0];
  if (trimmed[trimmed.length - 1] !== quote) return '';
  return decodeEscapes(trimmed.slice(1, -1));
}

// Extract the body of a `customFn: [ ... ].join('\n')` (Style 4).
// Walks the array content with depth + string tracking and splits on
// top-level commas — respects nested quotes, brackets, and parens.
function extractArrayJoinBody(src, propIdx) {
  const arrStart = src.indexOf('[', propIdx);
  if (arrStart < 0) return null;
  let i = arrStart + 1;
  let depth = 0;
  let inStr = false;
  let strQ = '';
  let cur = '';
  const parts = [];
  while (i < src.length) {
    const c = src[i];
    if (inStr) {
      cur += c;
      if (c === '\\' && i + 1 < src.length) {
        cur += src[i + 1];
        i += 2;
        continue;
      }
      if (c === strQ) inStr = false;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = true;
      strQ = c;
      cur += c;
      i++;
      continue;
    }
    if (c === '[' || c === '{' || c === '(') depth++;
    else if (c === ']' || c === '}' || c === ')') {
      if (c === ']' && depth === 0) break; // closing of customFn array
      depth--;
    }
    if (c === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  if (cur.trim().length > 0) parts.push(cur);
  return parts.map(stripAndDecode).join('\n');
}

function extractCustomFn(slug) {
  const src = fs.readFileSync('src/engines/' + slug + '.ts', 'utf8');

  // Style 1: top-level const customFn = "..."
  const topIdx = src.indexOf('const customFn');
  if (topIdx >= 0) {
    let i = src.indexOf('"', topIdx);
    const parts = [];
    while (i < src.length && src[i] === '"') {
      let j = i + 1;
      let cur = '';
      while (j < src.length && src[j] !== '"') {
        if (src[j] === '\\' && j + 1 < src.length) {
          const c = src[j + 1];
          if (c === 'u' && j + 5 < src.length) {
            cur += String.fromCharCode(parseInt(src.slice(j + 2, j + 6), 16));
            j += 6;
          } else {
            cur += c;
            j += 2;
          }
        } else {
          cur += src[j];
          j++;
        }
      }
      parts.push(cur);
      i = j + 1;
      while (i < src.length && /[\s+]/.test(src[i])) i++;
      if (src[i] === ';') break;
    }
    return { style: 'top-level-var', body: parts.join('') };
  }

  // Style 2/3/4: clientConfig: { ..., customFn: <something>, ... }
  const propMatch = src.match(/customFn\s*:\s*['"`\[]/);
  if (!propMatch) return null;
  const propIdx = propMatch.index;
  const afterColon = src[propMatch.index + propMatch[0].length - 1];

  if (afterColon === '[') {
    // Style 4: array-join
    return { style: 'array-join', body: extractArrayJoinBody(src, propIdx) || '' };
  }

  // Style 2 (inline string) or 3 (template literal).
  // i = position right after the opening quote.
  // We must decode `\n` (and `\t`, `\\`, `\"`, `\'`) to their JS string meanings:
  // the body uses `\n` both inside string literals (where it would become a
  // newline at runtime) AND between code statements (where it acts as a line
  // separator in the source). For code-level `\n`, we need a real newline
  // char so `new Function` parses it correctly. Decoding inside string
  // literals is equivalent to letting JS interpret `\n` at runtime — same
  // observable result.
  let i = src.indexOf(afterColon, propIdx) + 1;
  const quote = afterColon;
  let j = i;
  let cur = '';
  while (j < src.length && src[j] !== quote) {
    if (src[j] === '\\' && j + 1 < src.length) {
      const c = src[j + 1];
      if (c === 'n') { cur += '\n'; j += 2; }
      else if (c === 't') { cur += '\t'; j += 2; }
      else if (c === 'r') { cur += '\r'; j += 2; }
      else if (c === '\\') { cur += '\\'; j += 2; }
      else if (c === "'") { cur += "'"; j += 2; }
      else if (c === '"') { cur += '"'; j += 2; }
      else if (c === '`') { cur += '`'; j += 2; }
      else if (c === 'u' && j + 5 < src.length) {
        cur += String.fromCharCode(parseInt(src.slice(j + 2, j + 6), 16));
        j += 6;
      } else {
        cur += c;
        j += 2;
      }
    } else {
      cur += src[j];
      j++;
    }
  }
  const style = afterColon === '`' ? 'template-literal' : 'inline-string';
  return { style, body: cur };
}

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.log('Usage: node tests/scripts/verify-customfn.mjs <slug> [<slug>...]');
  console.log('Example: node tests/scripts/verify-customfn.mjs roas-calculator');
  process.exit(1);
}

let allOk = true;
for (const slug of targets) {
  const result = extractCustomFn(slug);
  if (!result) { console.log(slug + ': no customFn'); allOk = false; continue; }
  try {
    new Function('inputs', 'pick', 'fill', result.body);
    console.log(slug + ': OK (' + result.body.length + ' chars) [' + result.style + ']');
  } catch (e) {
    console.log(slug + ': BROKEN - ' + e.message);
    console.log('  first 300 chars:', JSON.stringify(result.body.slice(0, 300)));
    allOk = false;
  }
}
process.exit(allOk ? 0 : 1);
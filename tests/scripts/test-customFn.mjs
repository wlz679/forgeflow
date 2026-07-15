#!/usr/bin/env node
// Focused parse test for specific engines.
import fs from 'node:fs';

function testParse(slug) {
  const src = fs.readFileSync('src/engines/' + slug + '.ts', 'utf8');
  // Try top-level const customFn first
  let idx = src.indexOf('const customFn');
  let prefix = '';
  if (idx < 0) {
    // Try inline form: clientConfig: { customFn: "..." } or customFn: `...`
    const m = src.match(/customFn\s*:\s*(['"`])/);
    if (!m) { console.log(slug + ': no customFn'); return; }
    idx = m.index;
    prefix = 'inline';
  }
  // For inline form, find the quote AFTER the `:` and start extracting from there
  let i;
  let openQuote = '"';
  if (prefix === 'inline') {
    const colonIdx = src.indexOf(':', idx);
    i = colonIdx + 1;
    while (i < src.length && /\s/.test(src[i])) i++;
    // i now points to opening quote
    openQuote = src[i];
  } else {
    i = src.indexOf('"', idx);
  }
  const parts = [];
  while (i < src.length && src[i] === openQuote) {
    let j = i + 1;
    let cur = '';
    while (j < src.length && src[j] !== openQuote) {
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
  const body = parts.join('');
  try {
    new Function('inputs', 'pick', 'fill', body);
    console.log(slug + ': OK (' + body.length + ' chars)' + (prefix ? ' [' + prefix + ']' : ''));
  } catch (e) {
    console.log(slug + ': BROKEN - ' + e.message);
    // Show snippet around the start
    console.log('  first 300 chars:', JSON.stringify(body.slice(0, 300)));
  }
}

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.log('Usage: node tests/scripts/test-customFn.mjs <slug> [<slug>...]');
  console.log('Example: node tests/scripts/test-customFn.mjs revenue-projector');
  process.exit(1);
}
targets.forEach(testParse);
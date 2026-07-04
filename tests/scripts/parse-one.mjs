#!/usr/bin/env node
// Quick parser check for a single engine file at src/engines/<dir>/<shortname>.ts
import fs from 'node:fs';
const slug = process.argv[2];
if (!slug) { console.log('usage: parse-one.mjs <slug>'); process.exit(1); }
const shortName = slug.replace(/^solopreneur-/, '');

// Try root first (legacy), then search subdirectories
let paths = [`src/engines/${slug}.ts`];
const subdirs = fs.readdirSync('src/engines', { withFileTypes: true }).filter(d => d.isDirectory()).map(d => `src/engines/${d.name}/${shortName}.ts`);
paths = paths.concat(subdirs);

let src = null;
for (const p of paths) {
  if (fs.existsSync(p)) { src = fs.readFileSync(p, 'utf8'); console.log(`using: ${p}`); break; }
}
if (!src) { console.log(`file not found: looked in ${paths.join(', ')}`); process.exit(1); }

const idx = src.indexOf('const customFn');
if (idx < 0) { console.log(`${slug}: no customFn`); process.exit(1); }
let i = src.indexOf('"', idx);
const parts = [];
while (i < src.length && src[i] === '"') {
  let j = i + 1, cur = '';
  while (j < src.length && src[j] !== '"') {
    if (src[j] === '\\' && j + 1 < src.length) {
      const c = src[j + 1];
      if (c === 'u' && j + 5 < src.length) {
        cur += String.fromCharCode(parseInt(src.slice(j + 2, j + 6), 16));
        j += 6;
      } else { cur += c; j += 2; }
    } else { cur += src[j]; j++; }
  }
  parts.push(cur);
  i = j + 1;
  while (i < src.length && /[\s+]/.test(src[i])) i++;
  if (src[i] === ';') break;
}
const body = parts.join('');
try {
  new Function('inputs', 'pick', 'fill', body);
  console.log(`${slug}: OK (${body.length} chars)`);
} catch (e) {
  console.log(`${slug}: BROKEN - ${e.message}`);
  console.log('  first 200 chars:', JSON.stringify(body.slice(0, 200)));
  process.exit(2);
}

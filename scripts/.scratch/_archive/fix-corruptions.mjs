// Fix all 5 corrupted lines in translations.ts
// Pattern: 'key': { en: '...', zh: '<partial>'tools...: { en: '<dup EN>', zh: '<rest>' ' },
// Fix: extract real EN, combine ZH parts, restore to single-line entry
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'D:/E/独立站/youtube-tools/src/i18n/translations.ts';
let src = readFileSync(path, 'utf-8');
const lines = src.split('\n');

// For each corrupted line, find pattern and fix
let fixed = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Detect corruption: line contains 'tools. multiple times
  const matches = line.match(/'tools\./g) || [];
  if (matches.length <= 1) continue;

  // Parse: 'key': { en: '<EN>', zh: '<part1>'<embedded new entry>'<part2>' },
  // The embedded new entry: 'tools.<samekey>': { en: '<EN>', zh: <part2>' },
  // Look for: zh: '....\'tools.<key>\': { en: \'<en>\'\', zh: <part2>\' },
  // Easier: split on zh: first occurrence to get en, then handle the rest

  // Find the first 'zh: ' position
  const zhIdx = line.indexOf("zh: '");
  if (zhIdx === -1) continue;

  // EN is between "{ en: '" and "', zh:"
  const enStart = line.indexOf("{ en: '") + "{ en: '".length;
  const enEnd = line.indexOf("', zh:", enStart);
  const en = line.slice(enStart, enEnd);

  // After "zh: '" we have part1, then the embedded entry, then part2
  const zhStart = zhIdx + "zh: '".length;
  // Find where the embedded entry starts: "'tools.<key>': { en: '"
  const embeddedMarker = "'tools.";
  const embeddedIdx = line.indexOf(embeddedMarker, zhStart);
  if (embeddedIdx === -1) continue;

  // part1 = from zhStart to the apostrophe BEFORE embeddedMarker
  // The embedded marker starts with "'". So the apostrophe before it is at embeddedIdx - 1
  // Actually the embedded entry starts with "'tools." so the previous char should be a closing quote
  // part1: from zhStart to embeddedIdx - 1 (excluding the closing ')
  // But careful — if the part1 doesn't end with `'` (e.g., it has `'s` content), we need to find the LAST `'` before embeddedIdx

  // Simpler: take part1 = everything between zhStart and the embeddedMarker (excluding the trailing `'`)
  // The embedded entry has its own `zh: '<part2>'`, and part2 ends with `' }`
  // So we find the LAST `\'` before `},`

  // Find the LAST `'` before the final `,` (end of line)
  // Or use the structure: zh: '<part1>'<embedded>'<part2>' },

  // The cleanest parse: extract using regex
  // pattern: zh: '(PART1)'(EMBEDDED_KEY)': { en: '(EN)', zh: (PART2)' },
  // EMBEDDED_KEY = tools.X
  // PART2 may have escaped quotes

  const re = /^  '(tools\.[^']+)': \{ en: '([^']*)', zh: '(.+?)'tools\.(.+?)': \{ en: '([^']*)', zh: (.+) \}$/;
  const m = line.match(re);
  if (!m) {
    console.log('Could not parse line', i + 1, ':', line.slice(0, 100));
    continue;
  }
  const [, key1, en1, part1, _key2, _en2, rest] = m;
  // rest is everything after the second `zh: `, like `'$10M...基准）。...红旗。' },`
  // Strip trailing ` },`
  let part2 = rest;
  if (part2.endsWith(' },')) part2 = part2.slice(0, -2);
  if (part2.endsWith("'")) part2 = part2.slice(0, -1);

  // Combine parts (need to handle the transition from part1 ending mid-content)
  // part1: e.g. "顶级 B2B SaaS 达到 15-25% 的扩展率（OpenView/ICONIQ 对 "
  // part2: e.g. "$10M-$50M ARR 的基准）。低于 5%..."
  // Just concat (the apostrophe was inserted by the bug)
  const combinedZh = part1 + part2;

  // Build the correct line
  const correctLine = `  '${key1}': { en: '${en1}', zh: '${combinedZh}' },`;
  lines[i] = correctLine;
  fixed++;
  console.log('Fixed line', i + 1, ':', key1);
}

const newSrc = lines.join('\n');
writeFileSync(path, newSrc);
console.log('\nTotal fixed:', fixed);
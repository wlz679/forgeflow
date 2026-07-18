#!/usr/bin/env node
/**
 * Comprehensive i18n translation inserter.
 * Handles:
 *   - Update existing entries (single OR double quoted zh fields)
 *   - Add NEW entries (reads EN from engine source, inserts in alphabetical position)
 *
 * Usage: node scripts/apply-translations.mjs <json-file>
 * JSON format: { "tools.{slug}.{input|faq|how_to_use}.{...}": "<ZH text>", ... }
 *
 * Supersedes insert-translations.mjs (which only handles update-existing). Use this
 * for any batch that creates new keys.
 *
 * P17b-4 promotion: was scripts/.scratch/apply-translations.mjs (Task 3+4 subagent
 * POC). Promoted to canonical because Tasks 4-7 all need to create new entries.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStringLiteral, replaceZhValue } from './lib/zh-parser.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// scripts/apply-translations.mjs → project root is ../
const root = resolve(__dirname, '..');
const translationsPath = resolve(root, 'src/i18n/translations.ts');

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error('Usage: node apply-translations.mjs <json-file>');
  process.exit(1);
}

const entries = JSON.parse(readFileSync(resolve(root, jsonPath), 'utf-8'));
let src = readFileSync(translationsPath, 'utf-8');

let updated = 0, added = 0, failed = 0;

// Step 1: Update existing entries (state-machine parser handles escapes correctly;
// P18-1 supersedes the prior `[^']*` regex that corrupted values containing apostrophes)
for (const [key, zh] of Object.entries(entries)) {
  const before = src;
  src = replaceZhValue(src, key, zh);
  if (src !== before) updated++;
}

// Step 2: Identify keys that need adding
const stillMissing = [];
for (const [key, zh] of Object.entries(entries)) {
  const escapedKey = key.replace(/\./g, '\\.');
  const re = new RegExp(`'${escapedKey}':\\s*\\{`, 'm');
  if (!re.test(src)) {
    stillMissing.push({ key, zh });
  }
}

// Helper: find top-level array
function extractBalancedBlock(content, startIdx) {
  let i = content.indexOf('[', startIdx);
  if (i === -1) return null;
  let depth = 1;
  let j = i + 1;
  while (j < content.length && depth > 0) {
    const ch = content[j];
    if (ch === '[') depth++;
    else if (ch === ']') depth--;
    j++;
  }
  return content.substring(i, j);
}

function findTopLevelArray(content, name) {
  const re = new RegExp('^  ' + name + ':', 'gm');
  let m;
  while ((m = re.exec(content)) !== null) {
    const block = extractBalancedBlock(content, m.index);
    return block;
  }
  return null;
}

// Extract FAQ q or a at index i using state-machine parser
function readFaqItem(block, idx, key) {
  const objStart = block.indexOf('{', idx);
  if (objStart === -1) return null;
  const objEnd = block.indexOf('}', objStart);
  if (objEnd === -1) return null;
  const obj = block.substring(objStart, objEnd + 1);
  const kIdx = obj.indexOf(key + ':');
  if (kIdx === -1) return null;
  let ki = kIdx + key.length + 1;
  while (ki < obj.length && /\s/.test(obj[ki])) ki++;
  if (ki >= obj.length) return null;
  const r = parseStringLiteral(obj, ki);
  if (!r) return null;
  return r[0].replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

// Read EN value from engine file
function readEnValue(slug, subkey) {
  const engineSlug = slug.replace(/^solopreneur-/, '');
  const candidates = [
    `src/engines/valuation/${engineSlug}.ts`,
    `src/engines/valuation/${engineSlug}-calculator.ts`,
    `src/engines/ai-cost/${engineSlug}.ts`,
    `src/engines/cost/${engineSlug}.ts`,
    `src/engines/customer-support/${engineSlug}.ts`,
    `src/engines/freelance/${engineSlug}.ts`,
    `src/engines/hiring-team/${engineSlug}.ts`,
    `src/engines/investment/${engineSlug}.ts`,
    `src/engines/knowledge/${engineSlug}.ts`,
    `src/engines/legal-compliance/${engineSlug}.ts`,
    `src/engines/marketing/${engineSlug}.ts`,
    `src/engines/operations/${engineSlug}.ts`,
    `src/engines/product-analytics/${engineSlug}.ts`,
    `src/engines/real-estate/${engineSlug}.ts`,
    `src/engines/retention/${engineSlug}.ts`,
    `src/engines/saas/${engineSlug}.ts`,
    `src/engines/sales/${engineSlug}.ts`,
  ];
  let c = null;
  for (const cand of candidates) {
    try {
      c = readFileSync(resolve(root, cand), 'utf-8');
      break;
    } catch {}
  }
  if (!c) return null;

  const m = subkey.match(/^(input|faq|how_to_use)\.(.+)$/);
  if (!m) return null;

  if (m[1] === 'input') {
    const inpMatch = m[2].match(/^([^.]+)\.(label|placeholder)$/);
    if (!inpMatch) return null;
    const name = inpMatch[1];
    const field = inpMatch[2];
    const inputsBlock = findTopLevelArray(c, 'inputs');
    if (!inputsBlock) return null;
    // Try both single and double quote patterns. Two patterns:
    //   1. inputs with BOTH label and placeholder (number inputs)
    //   2. inputs with only label (select inputs — type:'select', no placeholder)
    const safeName = name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
    let re = new RegExp(
      `name:\\s*['"]${safeName}['"]\\s*,\\s*label:\\s*['"]((?:[^"'\\\\]|\\\\.)*)['"]\\s*,\\s*placeholder:\\s*['"]((?:[^"'\\\\]|\\\\.)*)['"]`
    );
    let mm = inputsBlock.match(re);
    if (mm) {
      const val = field === 'label' ? mm[1] : mm[2];
      return val.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    // Fallback: select-type input (label only, then type/options/default).
    re = new RegExp(
      `name:\\s*['"]${safeName}['"]\\s*,\\s*label:\\s*['"]((?:[^"'\\\\]|\\\\.)*)['"]`
    );
    mm = inputsBlock.match(re);
    if (mm && field === 'label') {
      return mm[1].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    return null;
  } else if (m[1] === 'faq') {
    const faqMatch = m[2].match(/^(\d+)\.(q|a)$/);
    if (!faqMatch) return null;
    const idx = parseInt(faqMatch[1]);
    const field = faqMatch[2];
    const faqBlock = findTopLevelArray(c, 'faq');
    if (!faqBlock) return null;
    // Walk to nth { ... } entry
    let pos = 0;
    let found = -1;
    while (pos < faqBlock.length) {
      const objStart = faqBlock.indexOf('{', pos);
      if (objStart === -1) break;
      const objEnd = faqBlock.indexOf('}', objStart);
      if (objEnd === -1) break;
      found++;
      if (found === idx) {
        const obj = faqBlock.substring(objStart, objEnd + 1);
        const kIdx = obj.indexOf(field + ':');
        if (kIdx === -1) return null;
        let ki = kIdx + field.length + 1;
        while (ki < obj.length && /\s/.test(obj[ki])) ki++;
        if (ki >= obj.length) return null;
        const r = parseStringLiteral(obj, ki);
        if (!r) return null;
        return r[0].replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }
      pos = objEnd + 1;
    }
    return null;
  } else if (m[1] === 'how_to_use') {
    const idx = parseInt(m[2]);
    const htuBlock = findTopLevelArray(c, 'howToUse');
    if (!htuBlock) return null;
    // Walk strings
    let pos = 0;
    let found = -1;
    while (pos < htuBlock.length) {
      const ch = htuBlock[pos];
      if (ch === '"' || ch === "'") {
        const r = parseStringLiteral(htuBlock, pos);
        if (!r) break;
        found++;
        if (found === idx) {
          return r[0].replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        pos = r[1];
      } else {
        pos++;
      }
    }
    return null;
  }
  return null;
}

// Step 3: Add missing entries
for (const { key, zh } of stillMissing) {
  const slugMatch = key.match(/^tools\.([^.]+)\./);
  if (!slugMatch) {
    failed++;
    continue;
  }
  const slug = slugMatch[1];
  const subkey = key.replace(slugMatch[0], '');

  const enValue = readEnValue(slug, subkey);
  if (enValue === null) {
    console.warn(`⚠️  Cannot find EN value for ${key} in engine file`);
    failed++;
    continue;
  }

  const lines = src.split('\n');
  const slugPrefix = `tools.${slug}.`;
  let prevKey = '';
  let insertAfterIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^  '(tools\.[^']+)':\s*\{/);
    if (m) {
      const k = m[1];
      if (k.startsWith(slugPrefix) && k < key) {
        if (k > prevKey) {
          prevKey = k;
          insertAfterIdx = i;
        }
      }
    }
  }

  if (insertAfterIdx === -1) {
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^  '(tools\.[^']+)':\s*\{/);
      if (m) {
        const k = m[1];
        if (k.startsWith(slugPrefix)) {
          insertAfterIdx = i - 1;
          break;
        }
      }
    }
  }

  if (insertAfterIdx === -1) {
    console.warn(`⚠️  Cannot determine insertion point for ${key}`);
    failed++;
    continue;
  }

  // Replace newlines with \n in EN value for single-line JS string
  const escapedEn = enValue.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
  const escapedZh = zh.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
  const newLine = `  '${key}': { en: '${escapedEn}', zh: '${escapedZh}' },`;

  lines.splice(insertAfterIdx + 1, 0, newLine);
  src = lines.join('\n');
  added++;
}

writeFileSync(translationsPath, src);
console.log(`✅ Updated ${updated} existing entries (zh values), Added ${added} new entries, ${failed} failed.`);

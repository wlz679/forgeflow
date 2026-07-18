#!/usr/bin/env node
/**
 * Extract all needed i18n keys + their EN values from source data.
 * Output: scripts/.scratch/_archive/i18n-needed.json (preserved audit trail)
 *
 * Scope: category.{X}.name|desc + tools.{slug}.title|description
 *        + tools.{slug}.input.{name}.label|placeholder
 *        + tools.{slug}.faq.{i}.q|a + tools.{slug}.how_to_use.{i}
 *
 * Source files:
 *   src/data/categories.ts          (Category id, name, description)
 *   src/data/tools/[name].ts             (slug, title, description, inputs.name)
 *   src/engines/[category]/[name].ts    (faq q/a, howToUse list, input label/placeholder)
 *
 * Notes:
 *   Inputs.label/placeholder come from src/engines/*.ts (engine definition),
 *   not src/data/tools/*.ts (which is the SEO metadata). The tools/*.ts only
 *   has inputs[].name; for label/placeholder we read engine.inputs[].label
 *   and engine.inputs[].placeholder.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStringLiteral } from './lib/zh-parser.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Helper: extract balanced-bracket block starting at startIdx (returning full block including brackets).
// Used by FAQ + howToUse extraction (P17b-3 fix — promoted from scripts/.scratch/extract-faqs.mjs).
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

const out = {
  categories: [],
  tools: [],
};

// 1. Categories from src/data/categories.ts
const catsSrc = readFileSync(resolve(root, 'src/data/categories.ts'), 'utf-8');
const catRe = /\{\s*id:\s*'([A-Z])',\s*name:\s*'([^']+)',\s*slug:\s*'([^']+)',\s*description:\s*'((?:[^'\\]|\\.)*)'\s*\}/g;
let m;
while ((m = catRe.exec(catsSrc)) !== null) {
  out.categories.push({
    id: m[1],
    name: m[2],
    slug: m[3],
    description: m[4].replace(/\\'/g, "'").replace(/\\"/g, '"'),
  });
}

// 2. Tools from src/data/tools/*.ts (slug, title, description) + inputs.name
const toolsDir = resolve(root, 'src/data/tools');
for (const file of readdirSync(toolsDir).filter(f => f.endsWith('.ts') && f !== 'index.ts' && f !== 'types.ts')) {
  const content = readFileSync(resolve(toolsDir, file), 'utf-8');
  const slugRe = /slug:\s*'([^']+)'/g;
  while ((m = slugRe.exec(content)) !== null) {
    const slug = m[1];
    // Find the block starting at this slug
    const startIdx = m.index;
    // Find the next slug or end of array
    const restContent = content.substring(startIdx);
    const nextSlug = restContent.search(/slug:\s*'/);
    const blockEnd = nextSlug > 0 ? startIdx + nextSlug : content.length;
    const block = content.substring(startIdx, blockEnd);

    const titleM = block.match(/title:\s*'((?:[^'\\]|\\.)*)'/);
    const descM = block.match(/description:\s*'((?:[^'\\]|\\.)*)'/);
    const inputsM = block.match(/inputs:\s*\[(.*?)\]/s);
    const inputNames = inputsM ? [...inputsM[1].matchAll(/name:\s*'([^']+)'/g)].map(x => x[1]) : [];

    out.tools.push({
      slug,
      title: titleM ? titleM[1].replace(/\\'/g, "'") : null,
      description: descM ? descM[1].replace(/\\'/g, "'") : null,
      inputs: inputNames,
    });
  }
}

// 3. For each tool, read engine file to get input.label, input.placeholder, faq, howToUse
const enginesDir = resolve(root, 'src/engines');
function walk(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = resolve(dir, f);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (f.endsWith('.ts') && f !== 'index.ts') out.push(p);
  }
  return out;
}
const engineFiles = walk(enginesDir);

for (const tool of out.tools) {
  // Engine slug is tool.slug without leading 'solopreneur-' prefix
  const engineSlug = tool.slug.replace(/^solopreneur-/, '');
  // Try to find engine file: src/engines/<category>/<engineSlug>.ts OR src/engines/<category>/<engineSlug>-calculator.ts
  let enginePath = null;
  for (const cat of ['ai-cost','cost','customer-support','freelance','hiring-team','investment','knowledge','legal-compliance','marketing','operations','product-analytics','real-estate','retention','saas','sales','valuation']) {
    for (const suffix of ['', '-calculator']) {
      const candidate = resolve(enginesDir, cat, engineSlug + suffix + '.ts');
      if (engineFiles.includes(candidate)) { enginePath = candidate; break; }
    }
    if (enginePath) break;
    // Fallback: scan category dir for any .ts file whose slug declaration matches tool.slug
    // (handles filename/slug inconsistencies like ai-image-cost-calculator slug ↔ ai-image-generation-cost-calculator.ts file)
    if (!enginePath) {
      for (const f of engineFiles) {
        if (!f.includes(`${cat}${sep}`)) continue;
        const fc = readFileSync(f, 'utf-8');
        const sm = fc.match(/slug:\s*['"]([^'"]+)['"]/);
        if (sm && sm[1] === tool.slug) { enginePath = f; break; }
      }
    }
  }

  tool.engineFile = enginePath ? enginePath.replace(root + '\\', '').replace(/\\/g, '/') : null;
  tool.faq = [];
  tool.howToUse = [];
  tool.inputLabels = {};
  tool.inputPlaceholders = {};

  if (enginePath) {
    const content = readFileSync(enginePath, 'utf-8');
    // Extract FAQ q/a (engine.faq: [{ q: '...', a: '...' }, ...])
    // P17b-3 fix: regex-based extraction was fragile with mixed single/double quotes
    // and escape sequences. Replace with state-machine parser (bracket-balanced + literal parser).
    // Promoted from scripts/.scratch/extract-faqs.mjs (Task 3 subagent POC).
    const faqIdx = content.indexOf('faq:');
    if (faqIdx !== -1) {
      const block = extractBalancedBlock(content, faqIdx);
      if (block) {
        const items = [];
        let pos = 0;
        while (pos < block.length) {
          const objStart = block.indexOf('{', pos);
          if (objStart === -1) break;
          const objEnd = block.indexOf('}', objStart);
          if (objEnd === -1) break;
          const obj = block.substring(objStart, objEnd + 1);
          const qKeyIdx = obj.indexOf('q:');
          const aKeyIdx = obj.indexOf('a:');
          if (qKeyIdx !== -1 && aKeyIdx !== -1) {
            let qi = qKeyIdx + 2;
            while (qi < obj.length && /\s/.test(obj[qi])) qi++;
            if (qi < obj.length) {
              const qResult = parseStringLiteral(obj, qi);
              if (qResult) {
                let ai = aKeyIdx + 2;
                while (ai < obj.length && /\s/.test(obj[ai])) ai++;
                if (ai < obj.length) {
                  const aResult = parseStringLiteral(obj, ai);
                  if (aResult) {
                    const qVal = qResult[0].replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                    const aVal = aResult[0].replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                    items.push({ q: qVal, a: aVal });
                  }
                }
              }
            }
          }
          pos = objEnd + 1;
        }
        tool.faq = items;
      }
    }
    // Extract howToUse: ['...', '...', ...] — same state-machine approach.
    const htuIdx = content.indexOf('howToUse:');
    if (htuIdx !== -1) {
      const block = extractBalancedBlock(content, htuIdx + 'howToUse:'.length);
      if (block) {
        const items = [];
        let i = 1; // skip the opening [
        while (i < block.length) {
          while (i < block.length && /\s/.test(block[i])) i++;
          if (i >= block.length || block[i] === ']') break;
          const result = parseStringLiteral(block, i);
          if (result) { items.push(result[0]); i = result[1]; } else { i++; }
        }
        tool.howToUse = items;
      }
    }
    // Extract input labels/placeholders from engine.inputs (accept both quote styles)
    const inputsBlock = content.match(/inputs:\s*\[(.*?)\n\s*\]/s);
    if (inputsBlock) {
      const itemRe = /\{\s*name:\s*(['"])([^'"]+)\1[^}]*?\}/g;
      let im;
      while ((im = itemRe.exec(inputsBlock[1])) !== null) {
        const inputObj = im[0];
        const name = im[2];
        const labelM = inputObj.match(/label:\s*(['"])((?:[^\\]|\\.)*?)\1/);
        const phM = inputObj.match(/placeholder:\s*(['"])((?:[^\\]|\\.)*?)\1/);
        if (labelM) tool.inputLabels[name] = labelM[2].replace(/\\(['"\\])/g, '$1');
        if (phM && phM[2] !== '') tool.inputPlaceholders[name] = phM[2].replace(/\\(['"\\])/g, '$1');
      }
    }
  }
}

// Write output
// P20-1: write to _archive/ to match check-i18n-completeness.mjs read path.
const archiveDir = resolve(root, 'scripts/.scratch/_archive');
mkdirSync(archiveDir, { recursive: true });
const outPath = resolve(archiveDir, 'i18n-needed.json');
writeFileSync(outPath, JSON.stringify(out, null, 2));

// Stats
const totalKeys = {
  categories: out.categories.length * 2,
  toolTitleDesc: out.tools.length * 2,
  inputLabels: out.tools.reduce((s, t) => s + Object.keys(t.inputLabels).length, 0),
  inputPlaceholders: out.tools.reduce((s, t) => s + Object.keys(t.inputPlaceholders).length, 0),
  faq: out.tools.reduce((s, t) => s + t.faq.length * 2, 0),
  howToUse: out.tools.reduce((s, t) => s + t.howToUse.length, 0),
};
const grandTotal = Object.values(totalKeys).reduce((a, b) => a + b, 0);
console.log('Wrote', outPath);
console.log('Categories:', out.categories.length, '× 2 =', totalKeys.categories);
console.log('Tools:', out.tools.length, '× 2 (title+desc) =', totalKeys.toolTitleDesc);
console.log('Input labels:', totalKeys.inputLabels);
console.log('Input placeholders:', totalKeys.inputPlaceholders);
console.log('FAQ q+a:', totalKeys.faq);
console.log('How-to-use:', totalKeys.howToUse);
console.log('GRAND TOTAL keys needed:', grandTotal);
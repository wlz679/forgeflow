#!/usr/bin/env node
/**
 * Extract all needed i18n keys + their EN values from source data.
 * Output: scripts/.scratch/i18n-needed.json (gitignored scratch)
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
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

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
  }

  tool.engineFile = enginePath ? enginePath.replace(root + '\\', '').replace(/\\/g, '/') : null;
  tool.faq = [];
  tool.howToUse = [];
  tool.inputLabels = {};
  tool.inputPlaceholders = {};

  if (enginePath) {
    const content = readFileSync(enginePath, 'utf-8');
    // Extract FAQ q/a (engine.faq: [{ q: '...', a: '...' }, ...])
    const faqBlock = content.match(/faq:\s*\[(.*?)\n\s*\],?\s*\n\s*(?:howToUse|sources|staticExamples)/s);
    if (faqBlock) {
      const items = [...faqBlock[1].matchAll(/\{\s*q:\s*'((?:[^'\\]|\\.)*)'\s*,\s*a:\s*'((?:[^'\\]|\\.)*)'\s*\}/g)];
      for (const it of items) {
        tool.faq.push({ q: it[1].replace(/\\'/g, "'"), a: it[2].replace(/\\'/g, "'") });
      }
    }
    // Extract howToUse: ['...', '...', ...]
    const htuBlock = content.match(/howToUse:\s*\[(.*?)\n\s*\]/s);
    if (htuBlock) {
      const items = [...htuBlock[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)];
      tool.howToUse = items.map(it => it[1].replace(/\\'/g, "'"));
    }
    // Extract input labels/placeholders from engine.inputs
    const inputsBlock = content.match(/inputs:\s*\[(.*?)\n\s*\]/s);
    if (inputsBlock) {
      const itemRe = /\{\s*name:\s*'([^']+)'[^}]*?\}/g;
      let im;
      while ((im = itemRe.exec(inputsBlock[1])) !== null) {
        const inputObj = im[0];
        const name = im[1];
        const labelM = inputObj.match(/label:\s*'((?:[^'\\]|\\.)*)'/);
        const phM = inputObj.match(/placeholder:\s*'((?:[^'\\]|\\.)*)'/);
        if (labelM) tool.inputLabels[name] = labelM[1].replace(/\\'/g, "'");
        if (phM && phM[1] !== '') tool.inputPlaceholders[name] = phM[1].replace(/\\'/g, "'");
      }
    }
  }
}

// Write output
const scratchDir = resolve(root, 'scripts/.scratch');
mkdirSync(scratchDir, { recursive: true });
const outPath = resolve(scratchDir, 'i18n-needed.json');
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
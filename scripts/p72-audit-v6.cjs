// P72 audit FINAL — uses the working state-machine parser
const fs = require('fs');
const path = require('path');
const tcontent = fs.readFileSync('src/i18n/translations.ts', 'utf-8');

const keys = new Map();
const len = tcontent.length;
let i = 0;
function skipStr(s, start) {
  const q = s[start];
  let j = start + 1;
  while (j < s.length) {
    if (s[j] === '\\') { j += 2; continue; }
    if (s[j] === q) return j + 1;
    j++;
  }
  return j;
}
while (i < len) {
  const ch = tcontent[i];
  if (ch === '"' || ch === '`') { i = skipStr(tcontent, i); continue; }
  if (ch === "'") {
    const keyStart = i + 1;
    let j = keyStart;
    while (j < len && tcontent[j] !== "'") {
      if (tcontent[j] === '\\') j++;
      j++;
    }
    if (j >= len) { i++; continue; }
    const keyStr = tcontent.slice(keyStart, j);
    if (!/^[\w.-]+$/.test(keyStr)) { i = j + 1; continue; }
    let k = j + 1;
    while (k < len && /\s/.test(tcontent[k])) k++;
    if (tcontent[k] !== ':') { i = j + 1; continue; }
    k++;
    while (k < len && /\s/.test(tcontent[k])) k++;
    if (tcontent[k] !== '{') { i = j + 1; continue; }
    let depth = 1;
    let m = k + 1;
    while (m < len && depth > 0) {
      const c = tcontent[m];
      if (c === "'" || c === '"' || c === '`') { m = skipStr(tcontent, m); continue; }
      if (c === '{') depth++;
      else if (c === '}') depth--;
      m++;
    }
    const block = tcontent.slice(k, m);
    const enM = /en:\s*(['"])((?:[^\\]|\\.)*?)\1/.exec(block);
    const zhM = /zh:\s*(['"])((?:[^\\]|\\.)*?)\1/.exec(block);
    if (enM && zhM) {
      const en = enM[2].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      const zh = zhM[2].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      if (!keys.has(keyStr)) keys.set(keyStr, { en, zh });
    }
    i = m;
    continue;
  }
  i++;
}
console.log('Total keys:', keys.size);

// Empty values
const emptyEn = [], emptyZh = [];
for (const [k, v] of keys) {
  if (v.en === '') emptyEn.push(k);
  if (v.zh === '') emptyZh.push(k);
}
console.log('Empty en:', emptyEn.length, emptyEn.slice(0,30));
console.log('Empty zh:', emptyZh.length, emptyZh.slice(0,30));

// === t() calls ===
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(astro|ts|tsx|js|jsx|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}
const srcFiles = walk('src');
let totalT = 0;
const missing = [];
for (const f of srcFiles) {
  const c = fs.readFileSync(f, 'utf-8');
  const re1 = /\bt\(\s*'((?:[^'\\]|\\.)*)'/g;
  const re2 = /\bt\(\s*"((?:[^"\\]|\\.)*)"/g;
  const re3 = /\bt\(\s*`([^`$\\]*)`/g;
  let mm;
  while ((mm = re1.exec(c)) !== null) { totalT++; if (!keys.has(mm[1])) missing.push({ file: f.replace(/\\/g, '/'), key: mm[1] }); }
  while ((mm = re2.exec(c)) !== null) { totalT++; if (!keys.has(mm[1])) missing.push({ file: f.replace(/\\/g, '/'), key: mm[1] }); }
  while ((mm = re3.exec(c)) !== null) { totalT++; if (!keys.has(mm[1])) missing.push({ file: f.replace(/\\/g, '/'), key: mm[1] }); }
}
console.log('\nTotal t() static calls:', totalT);
console.log('Missing:', missing.length);
const missingByFile = {};
for (const m of missing) {
  if (!missingByFile[m.file]) missingByFile[m.file] = [];
  missingByFile[m.file].push(m.key);
}
for (const f in missingByFile) {
  console.log('  ' + f + ' (' + missingByFile[f].length + ')');
  for (const k of [...new Set(missingByFile[f])]) console.log('    ' + k);
}

// === dist/zh ===
function walkDist(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkDist(p));
    else if (p.endsWith('index.html')) out.push(p);
  }
  return out;
}
const zhFiles = walkDist('dist/zh');
console.log('\ndist/zh index.html count:', zhFiles.length);
const candidates = ['Privacy Policy', 'Terms', 'About', 'Contact', 'Blog', 'Calculate', 'Reset', 'Copy', 'Share', 'Export', 'Home', 'What is', 'How to use', 'FAQ', 'Related Tools', 'Results', 'Save', 'Search', 'Privacy', 'Login', 'Subscribe', 'Newsletter', 'Tools', 'Calculators', 'Cookies', 'Disclaimer', 'Sitemap'];
const findings = {};
for (const c of candidates) {
  let totalCount = 0;
  const pages = new Set();
  for (const f of zhFiles) {
    const content = fs.readFileSync(f, 'utf-8');
    const stripped = content.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+type="application\/ld\+json"[^>]*>[\s\S]*?<\/[^>]+>/gi, ' ');
    const esc = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re3 = new RegExp(`(?<![A-Za-z0-9])${esc}(?![A-Za-z0-9])`, 'g');
    const matches = stripped.match(re3);
    if (matches && matches.length) { totalCount += matches.length; pages.add(f.replace(/\\/g, '/').replace(/^dist\/zh\//, '').replace(/\/index\.html$/, '/')); }
  }
  if (totalCount > 0) findings[c] = { count: totalCount, pages: pages.size };
}
const sorted = Object.entries(findings).sort((a,b)=>b[1].count - a[1].count);
console.log('Hardcoded English in dist/zh:');
for (const [s, info] of sorted) console.log('  ' + s + ': ' + info.count + ' / ' + info.pages + ' pages');

// === blog content ===
const blogKeys = [...keys.keys()].filter(k => k.startsWith('blog.'));
const blogTitleKeys = blogKeys.filter(k => k.endsWith('.title'));
const blogExcerptKeys = blogKeys.filter(k => k.endsWith('.excerpt'));
console.log('\nblog.* total:', blogKeys.length, 'title:', blogTitleKeys.length, 'excerpt:', blogExcerptKeys.length);
const blogFiles = fs.readdirSync('src/content/blog').filter(f => f.endsWith('.md'));
console.log('blog MD files:', blogFiles.length);
const blogTitleKeySlugs = new Set(blogTitleKeys.map(k => k.replace(/^blog\./, '').replace(/\.title$/, '')));
const blogExcerptKeySlugs = new Set(blogExcerptKeys.map(k => k.replace(/^blog\./, '').replace(/\.excerpt$/, '')));
const mdSlugs = new Set(blogFiles.map(f => f.replace(/\.md$/, '')));
console.log('MDs without title key:', [...mdSlugs].filter(s => !blogTitleKeySlugs.has(s)));
console.log('MDs without excerpt key:', [...mdSlugs].filter(s => !blogExcerptKeySlugs.has(s)));
const blogSame = [];
for (const k of blogKeys) {
  const v = keys.get(k);
  if (v.en === v.zh && v.en !== '' && k.startsWith('blog.best-')) blogSame.push(k);
}
console.log('blog.best-* keys where zh===en (P69 fix verification):', blogSame.length, blogSame.slice(0,10));

// === Components ===
console.log('\n=== Components ===');
const compFiles = ['src/components/Footer.astro', 'src/components/Header.astro', 'src/components/CopyButton.astro', 'src/components/EeatTrustBlock.astro', 'src/components/FAQ.astro', 'src/components/RelatedTools.astro', 'src/components/RelatedBlog.astro', 'src/components/RecentViewed.astro', 'src/components/HistoryList.astro', 'src/components/HowToUse.astro', 'src/components/SearchBar.astro', 'src/components/ToolCard.astro', 'src/components/CategoryFaq.astro', 'src/components/CategoryHero.astro', 'src/components/CategoryOtherNav.astro', 'src/components/CategorySection.astro', 'src/components/CategoryGuides.astro', 'src/components/AdUnit.astro', 'src/components/ResultCard.astro'];
for (const cf of compFiles) {
  if (!fs.existsSync(cf)) continue;
  const c = fs.readFileSync(cf, 'utf-8');
  const tre = /\bt\(\s*['"]([^'"]+)['"]/g;
  let tm;
  const used = new Set();
  while ((tm = tre.exec(c)) !== null) used.add(tm[1]);
  const missingInComp = [...used].filter(k => !keys.has(k));
  if (missingInComp.length) console.log('  ' + cf + ' — ' + used.size + ' keys, MISSING: ' + missingInComp.slice(0, 10).join(', '));
  else if (used.size) console.log('  ' + cf + ' — ' + used.size + ' keys, OK');
}

// === zh === en suspicious (excluding brand/preset/model/placeholder) ===
console.log('\n=== zh === en suspicious ===');
const sameLg = [];
for (const [k, v] of keys) {
  if (v.en === v.zh && v.en !== '') {
    if (k.startsWith('tools.') && (k.includes('.preset.') || k.includes('.model.') || k.includes('.placeholder'))) continue;
    if (k === 'site.name' || k === 'home.h1' || k === 'eeat.contact_email') continue;
    sameLg.push(k);
  }
}
console.log('zh===en suspicious (excluding brand/preset/model):', sameLg.length);
for (const k of sameLg.slice(0, 50)) {
  const v = keys.get(k);
  console.log('  ' + k + ' => ' + JSON.stringify(v.en).slice(0, 80));
}

fs.writeFileSync('scripts/p72-findings-final.json', JSON.stringify({
  totalKeys: keys.size,
  emptyEn, emptyZh,
  totalTCalls: totalT,
  missingKeys: missing,
  zhPages: zhFiles.length,
  hardcodedEnglish: findings,
  blogKeysTotal: blogKeys.length,
  blogTitleKeys: blogTitleKeys.length,
  blogExcerptKeys: blogExcerptKeys.length,
  blogMdFiles: blogFiles.length,
  blogSameEnZh: blogSame,
  sameLgSuspicious: sameLg,
}, null, 2));
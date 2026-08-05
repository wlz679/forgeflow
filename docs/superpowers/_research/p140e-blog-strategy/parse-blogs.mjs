import fs from 'node:fs';
import path from 'node:path';

const BLOG_DIR = 'D:/E/独立站/youtube-tools/src/content/blog';
const OUT = 'docs/superpowers/_research/p140e-blog-strategy/blog-keyword-mentions.json';

// Load tools.json to look up keywords
const toolsData = JSON.parse(fs.readFileSync('docs/superpowers/_research/p140e-blog-strategy/tool-keywords.json', 'utf-8'));
const toolsBySlug = {};
for (const t of toolsData.tools) {
  // strip "solopreneur-" prefix from blog toolSlug to map to tools slug
  // blog toolSlug is exactly like "solopreneur-csat-calculator"
  // tools slug is exactly "solopreneur-csat-calculator"
  toolsBySlug[t.slug] = t;
}

// Load keywords lowercased for matching
const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));
console.log('BLOG FILES:', files.length);

const blogs = [];

for (const f of files) {
  const text = fs.readFileSync(path.join(BLOG_DIR, f), 'utf-8');
  // Split at the first '---' boundary that begins the frontmatter
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    blogs.push({ file: f, error: 'no frontmatter found' });
    continue;
  }
  const [, fmRaw, bodyRaw] = fmMatch;

  // Frontmatter: simple key: 'value' parsing + toolSlug
  const fm = {};
  for (const line of fmRaw.split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    // strip surrounding single/double quotes
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    // skip multi-line YAML blocks (bodyZh) for title/excerpt/extraction
    fm[key] = val;
  }

  // Get the actual English body (after frontmatter)
  // The English body comes after the `---` line; it has the 5 H2 sections.
  // Strip basic markdown (##, **, etc.) to get plain text
  const plainBody = bodyRaw
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*`]/g, '')
    .toLowerCase();

  const words = plainBody.split(/\s+/).filter(Boolean);
  const first500 = words.slice(0, 500).join(' ');
  const fullBodyPlain = plainBody;

  // Find the tool via toolSlug
  const tool = fm.toolSlug ? toolsBySlug[fm.toolSlug] : null;

  let matchedKeywords = [];
  let allKeywordCoverage = null;
  if (tool) {
    matchedKeywords = tool.keywords.filter(kw => {
      // word-boundary match for short keywords, anywhere match for multi-word
      const klow = kw.toLowerCase();
      // Try exact word boundary first; fallback to substring
      const wbRegex = new RegExp(`\\b${klow.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return wbRegex.test(fullBodyPlain) || fullBodyPlain.includes(klow);
    });
    allKeywordCoverage = {
      total: tool.keywords.length,
      matched: matchedKeywords.length,
      matchedList: matchedKeywords,
      unmatched: tool.keywords.filter(kw => !matchedKeywords.includes(kw)),
    };
  }

  // Detect 5 H2 sections in english body
  const enH2List = [];
  const h2Regex = /^##\s+(.+)$/gm;
  let h2Match;
  while ((h2Match = h2Regex.exec(bodyRaw)) !== null) {
    enH2List.push(h2Match[1].trim());
  }

  blogs.push({
    file: f,
    frontmatter: { title: fm.title || '', excerpt: fm.excerpt || '', toolSlug: fm.toolSlug || '', ogImage: fm.ogImage || '' },
    toolCategory: tool?.categoryId || null,
    toolTitle: tool?.title || null,
    h2Count: enH2List.length,
    h2Titles: enH2List,
    bodyWordCount: words.length,
    first500WordsSnippet: first500.slice(0, 1500),
    keywordCoverage: allKeywordCoverage,
  });
}

const output = {
  source: 'src/content/blog/*.md',
  totalBlogs: blogs.length,
  h2Stats: {
    avg: (blogs.reduce((s, b) => s + (b.h2Count || 0), 0) / blogs.length).toFixed(2),
    min: Math.min(...blogs.map(b => b.h2Count || 0)),
    max: Math.max(...blogs.map(b => b.h2Count || 0)),
  },
  wordStats: {
    avg: Math.round(blogs.reduce((s, b) => s + (b.bodyWordCount || 0), 0) / blogs.length),
    min: Math.min(...blogs.map(b => b.bodyWordCount || 0)),
    max: Math.max(...blogs.map(b => b.bodyWordCount || 0)),
  },
  keywordCoverageStats: (() => {
    const matched = blogs.filter(b => b.keywordCoverage).map(b => b.keywordCoverage.matched / b.keywordCoverage.total);
    return {
      withCoverageData: matched.length,
      avgCoverageRate: matched.length ? (matched.reduce((s, n) => s + n, 0) / matched.length * 100).toFixed(1) + '%' : 'N/A',
      fullyCovered: blogs.filter(b => b.keywordCoverage && b.keywordCoverage.matched === b.keywordCoverage.total).length,
      partiallyCovered: blogs.filter(b => b.keywordCoverage && b.keywordCoverage.matched < b.keywordCoverage.total && b.keywordCoverage.matched > 0).length,
      noCoverage: blogs.filter(b => b.keywordCoverage && b.keywordCoverage.matched === 0).length,
    };
  })(),
  blogs,
};

fs.writeFileSync(OUT, JSON.stringify(output, null, 2));

console.log('BLOGS:', blogs.length);
console.log('H2 STATS:', output.h2Stats);
console.log('WORD STATS:', output.wordStats);
console.log('KEYWORD COVERAGE:', output.keywordCoverageStats);

// Print the worst-covered blogs to spot-check
const worst = blogs
  .filter(b => b.keywordCoverage)
  .map(b => ({
    file: b.file,
    matched: b.keywordCoverage.matched,
    total: b.keywordCoverage.total,
    rate: (b.keywordCoverage.matched / b.keywordCoverage.total * 100).toFixed(0) + '%',
    unmatched: b.keywordCoverage.unmatched.slice(0, 3),
  }))
  .sort((a, b) => a.matched / a.total - b.matched / b.total)
  .slice(0, 10);
console.log('\nWORST 10 KEYWORD COVERAGE:');
for (const w of worst) console.log(`  ${w.file}: ${w.matched}/${w.total} (${w.rate}) unmatched=${w.unmatched.join(', ')}`);

console.log('\nWROTE:', OUT);

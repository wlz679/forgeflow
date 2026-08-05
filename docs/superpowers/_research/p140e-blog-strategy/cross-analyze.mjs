import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'docs/superpowers/_research/p140e-blog-strategy';
const gsc = JSON.parse(fs.readFileSync(path.join(ROOT, 'gsc-query-table.json'), 'utf-8'));
const tools = JSON.parse(fs.readFileSync(path.join(ROOT, 'tool-keywords.json'), 'utf-8'));
const blogs = JSON.parse(fs.readFileSync(path.join(ROOT, 'blog-keyword-mentions.json'), 'utf-8'));

const queries = gsc.sheets.queries;
const pages = gsc.sheets.pages;
const blogByToolSlug = {};
const blogByFile = {};
for (const b of blogs.blogs) {
  blogByFile[b.file] = b;
  if (b.frontmatter && b.frontmatter.toolSlug) {
    blogByToolSlug[b.frontmatter.toolSlug] = b;
  }
}
const toolBySlug = {};
for (const t of tools.tools) toolBySlug[t.slug] = t;

// === Lookup helpers ===

// Try match a query string to a tool via:
// 1. Direct substring match (e.g. "csat calculator" → csat-calculator tool by keywords)
// 2. Tool slug match
function queryToToolMatches(queryLower) {
  const out = [];
  for (const t of tools.tools) {
    const slugParts = t.slug.replace(/^solopreneur-/, '').replace(/-/g, ' ').toLowerCase();
    if (queryLower.includes(slugParts) || slugParts.includes(queryLower)) {
      out.push({ slug: t.slug, reason: 'slug_substring' });
      continue;
    }
    // keyword match (any keyword in query)
    for (const kw of t.keywords) {
      const kwLow = kw.toLowerCase();
      if (queryLower.includes(kwLow) && kwLow.length >= 4) {
        out.push({ slug: t.slug, reason: `keyword:${kw}` });
        break;
      }
    }
  }
  return out;
}

// Try match a query string to a blog via:
// 1. blog.frontmatter.toolSlug whose derived slug-part matches the query
// 2. Same key as above but via keywords
function queryToBlogMatch(queryLower) {
  const out = [];
  for (const [toolSlug, blog] of Object.entries(blogByToolSlug)) {
    const slugParts = toolSlug.replace(/^solopreneur-/, '').replace(/-/g, ' ').toLowerCase();
    if (queryLower.includes(slugParts) || slugParts.includes(queryLower)) {
      out.push({ file: blog.file, toolSlug, reason: 'tool_slug_part' });
      continue;
    }
    const tool = toolBySlug[toolSlug];
    if (tool) {
      for (const kw of tool.keywords) {
        const kwLow = kw.toLowerCase();
        if (queryLower.includes(kwLow) && kwLow.length >= 4) {
          out.push({ file: blog.file, toolSlug, reason: `keyword:${kw}` });
          break;
        }
      }
    }
  }
  return out;
}

// intent labels heuristic
function classifyIntent(queryLower) {
  if (/\b(calculator|compute|calculate|cost|price|tool)\b/.test(queryLower)) return 'transactional';
  if (/\b(what is|how to|guide|best)\b/.test(queryLower)) return 'informational';
  if (/\b(buy|pricing|review|alternative|vs)\b/.test(queryLower)) return 'commercial';
  return 'discovery';
}

// === TABLE 1: GSC query × existing blog coverage ===
const table1 = queries.map(q => {
  const qLower = (q.query || '').toLowerCase();
  const matchedTools = queryToToolMatches(qLower);
  const matchedBlogs = queryToBlogMatch(qLower);
  const blogExists = matchedBlogs.length > 0;
  const intent = classifyIntent(qLower);

  // blog intent match: 1=slug exact, 2=keyword partial, 3=keyword fuzzy, N=no match
  let blogIntentMatch = 'N';
  if (matchedBlogs.length > 0) {
    const reasons = matchedBlogs.map(b => b.reason);
    if (reasons.some(r => r === 'tool_slug_part')) blogIntentMatch = '1';
    else if (reasons.some(r => r.startsWith('keyword:'))) blogIntentMatch = '2';
    else blogIntentMatch = '3';
  }

  let action;
  if (!blogExists) action = 'NEW_SPOKE';
  else if (blogIntentMatch === '1') action = 'COVERED';
  else if (blogIntentMatch === '2' || blogIntentMatch === '3') action = 'REWRITE_DEPTH';

  return {
    query: q.query,
    impressions: q.impressions,
    clicks: q.clicks,
    avg_position: q.position,
    ctr: q.ctr,
    intent,
    matched_tools: matchedTools.map(t => t.slug),
    matched_blogs: matchedBlogs.map(b => b.file),
    blog_exists: blogExists ? 'Y' : 'N',
    blog_intent_match: blogIntentMatch,
    action,
  };
}).sort((a, b) => (b.impressions || 0) - (a.impressions || 0));

// Write table-1 partial JSON (just the GSC-query pieces for now)
fs.writeFileSync(path.join(ROOT, 'table1-gsc-blog-coverage.json'), JSON.stringify({
  source: 'gsc × blog',
  totalRows: table1.length,
  actionable: table1.filter(t => t.action !== 'COVERED').length,
  byAction: table1.reduce((acc, t) => {
    acc[t.action || 'UNKNOWN'] = (acc[t.action || 'UNKNOWN'] || 0) + 1;
    return acc;
  }, {}),
  rows: table1,
}, null, 2));

console.log('TABLE 1 rows:', table1.length);
console.log('TABLE 1 actions:', table1.reduce((acc, t) => {
  acc[t.action || 'UNKNOWN'] = (acc[t.action || 'UNKNOWN'] || 0) + 1;
  return acc;
}, {}));

// === TABLE 2: tool × keywords × blog coverage (100 rows) ===
const table2 = tools.tools.map(t => {
  const blog = blogByToolSlug[t.slug];
  return {
    tool_slug: t.slug,
    title: t.title,
    categoryId: t.categoryId,
    keywords: t.keywords,
    blog_file: blog ? blog.file : null,
    blog_h2_count: blog ? blog.h2Count : 0,
    blog_h2_titles: blog ? blog.h2Titles : null,
    blog_word_count: blog ? blog.bodyWordCount : 0,
    blog_keywords_matched: blog ? blog.keywordCoverage.matched : 0,
    blog_keywords_total: blog ? blog.keywordCoverage.total : t.keywords.length,
    blog_keywords_coverage_pct: blog ? Math.round(blog.keywordCoverage.matched / blog.keywordCoverage.total * 100) : 0,
    blog_unmatched_keywords: blog ? blog.keywordCoverage.unmatched : [],
    blog_intent_coverage: blog ? {
      what_is: blog.h2Titles.some(h => /what is/i.test(h)),
      how_to_calc: blog.h2Titles.some(h => /how to (use|calculate)/i.test(h)),
      formula_sheet: blog.h2Titles.some(h => /formula|calculation/i.test(h)),
      benchmark_data: blog.h2Titles.some(h => /benchmark|data|statistic/i.test(h)),
      best_practices: blog.h2Titles.some(h => /tips|best practice|how to use/i.test(h)),
    } : null,
    recommended_additions: (() => {
      const need = [];
      if (!blog) {
        need.push('CREATE_BLOG');
        return need;
      }
      if (blog.keywordCoverage.matched / blog.keywordCoverage.total < 0.5) need.push('DEPTH_REWRITE');
      if (blog.bodyWordCount < 800) need.push('EXPAND_BODY_TO_1500W');
      if (blog.h2Count < 7) need.push('ADD_BENCHMARK_USE_CASES_H2');
      return need.length ? need : ['OK_BUT_REVIEW'];
    })(),
  };
});

fs.writeFileSync(path.join(ROOT, 'table2-tool-blog-coverage.json'), JSON.stringify({
  source: 'tool × blog',
  totalTools: table2.length,
  needBlog: table2.filter(t => t.recommended_additions.includes('CREATE_BLOG')).length,
  needDepthRewrite: table2.filter(t => t.recommended_additions.includes('DEPTH_REWRITE')).length,
  needExpandBody: table2.filter(t => t.recommended_additions.includes('EXPAND_BODY_TO_1500W')).length,
  addBenchmarkH2: table2.filter(t => t.recommended_additions.includes('ADD_BENCHMARK_USE_CASES_H2')).length,
  okButReview: table2.filter(t => t.recommended_additions.includes('OK_BUT_REVIEW')).length,
  avgKeywordCoveragePct: Math.round(table2.reduce((s, t) => s + t.blog_keywords_coverage_pct, 0) / table2.length),
  rows: table2,
}, null, 2));

console.log('\nTABLE 2 rows:', table2.length);
console.log('  CREATE_BLOG:', table2.filter(t => t.recommended_additions.includes('CREATE_BLOG')).length);
console.log('  DEPTH_REWRITE:', table2.filter(t => t.recommended_additions.includes('DEPTH_REWRITE')).length);
console.log('  AVG coverage:', Math.round(table2.reduce((s, t) => s + t.blog_keywords_coverage_pct, 0) / table2.length) + '%');

// === TABLE 3: Top 20 by business value ===

// Query → tool mapping (assign impressions to tool via tool_slug substring match + longest prefix)
const impressionsByToolSlug = {};
for (const q of queries) {
  const qLower = (q.query || '').toLowerCase();
  const matches = queryToToolMatches(qLower);
  for (const m of matches) {
    impressionsByToolSlug[m.slug] = (impressionsByToolSlug[m.slug] || 0) + q.impressions;
  }
}

// Pages → tool mapping (parse URL slug from landing page)
const pageImpressionsByToolSlug = {};
for (const p of pages) {
  const lp = p.landing_page || '';
  // /solopreneur-foo-bar/  or  /best-solopreneur-foo-bar/
  const m1 = lp.match(/\/solopreneur-([a-z0-9-]+?)(?:-calculator|-estimator|-projection|-tracker)?\/?$/);
  const m2 = lp.match(/\/blog\/best-solopreneur-([a-z0-9-]+?)(?:-calculator|-estimator|-projection|-tracker)?\.md?\/?$/);
  let slugCandidate = null;
  if (m1) slugCandidate = 'solopreneur-' + m1[1];
  if (m2) slugCandidate = 'solopreneur-' + m2[1];
  if (slugCandidate) {
    const tool = toolBySlug[slugCandidate];
    if (tool) pageImpressionsByToolSlug[slugCandidate] = (pageImpressionsByToolSlug[slugCandidate] || 0) + p.impressions;
  }
}

// Category weight table
const CAT_WEIGHT = {
  S: 10, C: 10, D: 10,
  B: 8, A: 8,
  R: 6, M: 6, F: 6, P: 6, H: 6, T: 6,
  O: 5, K: 5, L: 5,
};

// GSC impression bucket
function impressionsToScore(imp) {
  if (imp <= 0) return 0;
  if (imp <= 5) return 5;
  if (imp <= 20) return 10;
  return 20;
}

// Commercial-intent keyword ratio
const INTENT_KEYWORDS = ['pricing', 'cost', 'revenue', 'roi', 'churn', 'conversion', 'valuation', 'fee', 'rate', 'salary', 'price', 'pay', 'expense', 'margin', 'ltv', 'cac', 'mrr', 'arr'];
function commercialIntentRatio(keywords) {
  let hits = 0;
  for (const kw of keywords) {
    const kwLow = kw.toLowerCase();
    for (const ik of INTENT_KEYWORDS) if (kwLow.includes(ik)) { hits++; break; }
  }
  return hits / keywords.length;
}

const scored = tools.tools.map(t => {
  const imp = impressionsByToolSlug[t.slug] || 0;
  const catScore = CAT_WEIGHT[t.categoryId] || 5;          // raw 5/6/8/10
  const gscScore = impressionsToScore(imp);                  // raw 0/5/10/20
  const commercial = commercialIntentRatio(t.keywords);      // 0..1
  const commercialScore = Math.round(commercial * 100) / 100; // round to 0..1

  // Weighted contributions, target max composite = 30
  //   cat:    catScore/10 * 15  → max 15
  //   gsc:    gscScore/20 * 10  → max 10
  //   comm:   commercial * 5    → max 5
  const catW = (catScore / 10) * 15;
  const gscW = (gscScore / 20) * 10;
  const commW = commercial * 5;
  const composite = Math.round((catW + gscW + commW) * 10) / 10;

  return {
    tool_slug: t.slug,
    title: t.title,
    category: t.categoryId,
    primary_keywords: t.keywords.slice(0, 5),
    cat_score: catScore,
    cat_weighted: Math.round(catW * 10) / 10,
    gsc_impressions: imp,
    gsc_score: gscScore,
    gsc_weighted: Math.round(gscW * 10) / 10,
    commercial_ratio: commercial,
    commercial_weighted: Math.round(commW * 10) / 10,
    composite,
    recommended_blog_count: composite >= 25 ? 5 : composite >= 18 ? 3 : 1,
  };
}).sort((a, b) => b.composite - a.composite);

const top20 = scored.slice(0, 20).map((r, i) => ({ rank: i + 1, ...r }));

fs.writeFileSync(path.join(ROOT, 'top20-business-value.json'), JSON.stringify({
  source: 'composite: 50% cat + 25% gsc + 25% keyword commercial',
  weights: {
    category: '50% (S/C/D=10 · B/A=8 · R/M/F/P/H/T=6 · O/K/L=5) → ×15',
    gsc: '25% (imp 0=0 · 1-5=5 · 6-20=10 · 21+=20) → /20 ×10',
    commercial_keywords: '25% (keywords containing pricing/cost/revenue/roi/churn/conversion/valuation/fee/rate/salary/price/pay/expense/margin/ltv/cac/mrr/arr) → ×5',
    composite_max: 30,
  },
  totalScored: scored.length,
  top20,
  fullRanking: scored,
}, null, 2));

console.log('\nTABLE 3 top-20 summary:');
for (const r of top20) {
  console.log(`  ${r.rank}. ${r.tool_slug} [${r.category}] comp=${r.composite} (cat=${r.cat_score}→${r.cat_weighted} gsc=${r.gsc_score}→${r.gsc_weighted} comm=${r.commercial_ratio}→${r.commercial_weighted} imp=${r.gsc_impressions} blog#=${r.recommended_blog_count})`);
}
console.log('\nWROTE:');
console.log('  table1-gsc-blog-coverage.json');
console.log('  table2-tool-blog-coverage.json');
console.log('  top20-business-value.json');

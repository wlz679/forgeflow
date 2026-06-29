/**
 * Schema.org JSON-LD factory helpers for SEO-critical pages.
 * Centralizes CollectionPage / ItemList / BreadcrumbList construction
 * so 6 category pages don't reinvent the same JSON.stringify block.
 *
 * See spec: docs/superpowers/specs/2026-06-27-content-depth-pages-design.md §6.3
 */

const SITE_URL = 'https://forgeflowkit.com';

export interface CollectionPageInput {
  lang: 'en' | 'zh';
  categorySlug: string;        // 'saas-metrics'
  categoryId: string;          // 'A'
  categoryName: string;        // 'SaaS Metrics'
  categoryDescription: string; // i18n category.{id}.desc
  tools: { slug: string; title: string }[];  // all tools in this category
}

export function createCollectionPage(input: CollectionPageInput) {
  const { lang, categorySlug, categoryName, categoryDescription, tools } = input;
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}/${lang}/${categorySlug}/#collection`,
    name: categoryName,
    description: categoryDescription,
    inLanguage: lang,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    hasPart: createCategoryItemList({ lang, categorySlug, tools }),
  };
}

export interface ItemListInput {
  lang: 'en' | 'zh';
  categorySlug: string;
  tools: { slug: string; title: string }[];
}

export function createCategoryItemList(input: ItemListInput) {
  const { lang, categorySlug, tools } = input;
  return {
    '@type': 'ItemList',
    name: `${input.tools.length} ${tools[0]?.title ? 'Calculators' : 'Tools'}`,
    itemListElement: tools.map((tool, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: tool.title,
      url: `${SITE_URL}/${lang}/${tool.slug}/`,
    })),
  };
}

export interface Breadcrumb3Input {
  lang: 'en' | 'zh';
  homeLabel: string;
  categoryName: string;
  categorySlug: string;
  currentPageName: string;
  currentPageSlug: string;
}

export function createBreadcrumb3(input: Breadcrumb3Input) {
  const { lang, homeLabel, categoryName, categorySlug, currentPageName, currentPageSlug } = input;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: homeLabel,
        item: `${SITE_URL}/${lang}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: categoryName,
        item: `${SITE_URL}/${lang}/${categorySlug}/`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: currentPageName,
        item: `${SITE_URL}/${lang}/${currentPageSlug}/`,
      },
    ],
  };
}

// =====================================================================
// Tool-page schema helpers (added 2026-06-27, Plan 1/3 of P1 series)
// See spec: docs/superpowers/specs/2026-06-27-p1-schema-factory-design.md
// These 3 helpers are used by src/pages/[lang]/[slug].astro (32 tool pages
// rendered via 1 dynamic route). Output is byte-equivalent to the previous
// inline JSON.stringify block in [slug].astro lines 91-135.
// =====================================================================

export interface SoftwareApplicationInput {
  lang: 'en' | 'zh';
  toolTitle: string;
  toolDescription: string;
  toolSlug: string;             // for url + @id
  applicationCategory: string;  // from toolMeta.applicationCategory
  featureList: string[];        // 3 items from translatedHowToUse
  author: string;
  reviewedBy: string;
  dataReviewedAt: string;       // YYYY-MM-DD format
}

export function createSoftwareApplication(input: SoftwareApplicationInput) {
  const { lang, toolTitle, toolDescription, toolSlug, applicationCategory, featureList, author, reviewedBy, dataReviewedAt } = input;
  const url = `${SITE_URL}/${lang}/${toolSlug}/`;
  return {
    '@type': 'SoftwareApplication',
    '@id': `${url}#app`,
    name: toolTitle,
    applicationCategory,
    operatingSystem: 'Web',
    description: toolDescription,
    url,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    featureList,
    isAccessibleForFree: true,
    inLanguage: lang,
    provider: { '@id': `${SITE_URL}/#org` },
    author: { '@id': `${SITE_URL}/#org` },
    dateModified: dataReviewedAt,
    reviewedBy: { '@type': 'Organization', name: reviewedBy },
    publisher: { '@id': `${SITE_URL}/#org` },
  };
}

export interface FAQPageInput {
  faqItems: { q: string; a: string }[];
}

export function createToolFAQPage(input: FAQPageInput) {
  const { faqItems } = input;
  return {
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

export interface ToolBreadcrumbInput {
  lang: 'en' | 'zh';
  homeItem: string;             // caller passes Astro.site?.toString() || '/'
  homeLabel: string;            // typically t('breadcrumb.home', lang)
  categoryName: string;         // t('category.${id}.name', lang)
  categorySlug: string;         // e.g. 'saas-metrics'
  toolTitle: string;
  toolSlug: string;
}

export function createToolBreadcrumbList(input: ToolBreadcrumbInput) {
  const { lang, homeItem, homeLabel, categoryName, categorySlug, toolTitle, toolSlug } = input;
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: homeLabel, item: homeItem },
      {
        '@type': 'ListItem',
        position: 2,
        name: categoryName,
        item: `${SITE_URL}/${lang}/${categorySlug}/`,
      },
      { '@type': 'ListItem', position: 3, name: toolTitle, item: `${SITE_URL}/${lang}/${toolSlug}/` },
    ],
  };
}

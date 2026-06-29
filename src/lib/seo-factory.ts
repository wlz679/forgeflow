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

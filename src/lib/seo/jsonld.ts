const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://golfdataviz.com";

interface BreadcrumbItem {
  label: string;
  href: string;
}

/** Build a BreadcrumbList JSON-LD object. */
export function buildBreadcrumbLD(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org" as const,
    "@type": "BreadcrumbList" as const,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem" as const,
      position: i + 1,
      name: item.label,
      item: `${SITE_URL}${item.href}`,
    })),
  };
}

interface DatasetParams {
  name: string;
  description: string;
  url: string;
}

/** Build a Dataset JSON-LD object. */
export function buildDatasetLD(params: DatasetParams) {
  return {
    "@context": "https://schema.org" as const,
    "@type": "Dataset" as const,
    name: params.name,
    description: params.description,
    url: params.url,
  };
}

interface ArticleParams {
  headline: string;
  datePublished: string;
  url?: string;
}

/** Build an Article JSON-LD object. */
export function buildArticleLD(params: ArticleParams) {
  return {
    "@context": "https://schema.org" as const,
    "@type": "Article" as const,
    headline: params.headline,
    datePublished: params.datePublished,
    ...(params.url && { url: params.url }),
  };
}

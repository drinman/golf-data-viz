import type { MetadataRoute } from "next";
import { ALL_BRACKET_SLUGS } from "@/lib/seo/slugs";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://golfdataviz.com";

const LEARN_PAGES = [
  "strokes-gained-explained",
  "strokes-gained-calculator",
  "average-strokes-gained-by-handicap",
  "strokes-gained-putting",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const existing: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/strokes-gained`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/methodology`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];

  const benchmarkPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/benchmarks`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...ALL_BRACKET_SLUGS.map((slug) => ({
      url: `${baseUrl}/benchmarks/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  const learnPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/learn`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...LEARN_PAGES.map((slug) => ({
      url: `${baseUrl}/learn/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  return [...existing, ...benchmarkPages, ...learnPages];
}

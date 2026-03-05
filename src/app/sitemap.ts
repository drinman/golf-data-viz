import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://golfdataviz.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
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
}

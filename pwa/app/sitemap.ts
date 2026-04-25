import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com";

  return [
    {
      url: `${appUrl}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${appUrl}/pwa-check`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}

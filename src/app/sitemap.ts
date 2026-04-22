import type { MetadataRoute } from "next";
import { events } from "@/data/events";

const SITE_URL = "https://disfrutonas.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/eventos`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.95,
    },
  ];

  const cityPages = Array.from(new Set(events.map((event) => event.citySlug))).map(
    (citySlug) => ({
      url: `${SITE_URL}/eventos/${citySlug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    })
  );

  const pillarPages = Array.from(
    new Set(events.map((event) => `${event.citySlug}__${event.pillarSlug}`))
  ).map((key) => {
    const [citySlug, pillarSlug] = key.split("__");

    return {
      url: `${SITE_URL}/eventos/${citySlug}/${pillarSlug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.85,
    };
  });

  const categoryPages = Array.from(
    new Set(
      events.map(
        (event) =>
          `${event.citySlug}__${event.pillarSlug}__${event.categorySlug}`
      )
    )
  ).map((key) => {
    const [citySlug, pillarSlug, categorySlug] = key.split("__");

    return {
      url: `${SITE_URL}/eventos/${citySlug}/${pillarSlug}/${categorySlug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    };
  });

  const eventPages = events.map((event) => ({
    url: `${SITE_URL}/eventos/${event.citySlug}/${event.pillarSlug}/${event.categorySlug}/${event.slug}`,
    lastModified: new Date(event.eventDate),
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  return [
    ...staticPages,
    ...cityPages,
    ...pillarPages,
    ...categoryPages,
    ...eventPages,
  ];
}
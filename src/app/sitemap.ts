import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const SITE_URL = "https://disfrutonas.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: events, error } = await supabase
    .from("events")
    .select(
      "slug, city_slug, pillar_slug, category_slug, event_date, updated_at"
    )
    .order("event_date", { ascending: true });

  if (error) {
    console.error("Error generating sitemap:", error);
  }

  const eventList = events ?? [];

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
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

  const cityPages: MetadataRoute.Sitemap = Array.from(
    new Set(eventList.map((event) => event.city_slug))
  )
    .filter(Boolean)
    .map((citySlug) => ({
      url: `${SITE_URL}/eventos/${citySlug}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    }));

  const pillarPages: MetadataRoute.Sitemap = Array.from(
    new Set(
      eventList
        .filter((event) => event.city_slug && event.pillar_slug)
        .map((event) => `${event.city_slug}__${event.pillar_slug}`)
    )
  ).map((key) => {
    const [citySlug, pillarSlug] = key.split("__");

    return {
      url: `${SITE_URL}/eventos/${citySlug}/${pillarSlug}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.85,
    };
  });

  const categoryPages: MetadataRoute.Sitemap = Array.from(
    new Set(
      eventList
        .filter(
          (event) =>
            event.city_slug &&
            event.pillar_slug &&
            event.category_slug
        )
        .map(
          (event) =>
            `${event.city_slug}__${event.pillar_slug}__${event.category_slug}`
        )
    )
  ).map((key) => {
    const [citySlug, pillarSlug, categorySlug] = key.split("__");

    return {
      url: `${SITE_URL}/eventos/${citySlug}/${pillarSlug}/${categorySlug}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    };
  });

  const eventPages: MetadataRoute.Sitemap = eventList
    .filter(
      (event) =>
        event.slug &&
        event.city_slug &&
        event.pillar_slug &&
        event.category_slug
    )
    .map((event) => ({
      url: `${SITE_URL}/eventos/${event.city_slug}/${event.pillar_slug}/${event.category_slug}/${event.slug}`,
      lastModified: event.updated_at
        ? new Date(event.updated_at)
        : new Date(event.event_date),
      changeFrequency: "weekly",
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
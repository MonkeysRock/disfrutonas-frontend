import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { buildEventUrl } from "@/lib/event-urls";

const SITE_URL = "https://disfrutonas.com";

type SitemapEvent = {
  slug: string | null;
  city_slug: string | null;
  pillar_slug: string | null;
  category_slug: string | null;
  event_date: string | null;
  end_date: string | null;
  updated_at: string | null;
  cities: {
    countries: { slug: string } | null;
  } | null;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events: SitemapEvent[] = [];
  const pageSize = 500;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("events")
      .select(
        "slug, city_slug, pillar_slug, category_slug, event_date, end_date, updated_at, cities(countries(slug))"
      )
      .order("id")
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Error generating sitemap:", error);
      throw new Error("No se pudo generar el sitemap");
    }

    const batch = (data ?? []) as unknown as SitemapEvent[];
    events.push(...batch);

    if (batch.length < pageSize) break;
  }

  const today = new Date().toISOString().slice(0, 10);

  const validEvents = events.filter((event) => {
    if (event.cities?.countries?.slug !== "espana") return false;

    const startsInFuture =
      event.event_date != null && event.event_date >= today;

    const stillActive =
      event.end_date != null && event.end_date >= today;

    const permanent =
      event.event_date == null && event.end_date == null;

    return startsInFuture || stillActive || permanent;
  });

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/eventos`,
      changeFrequency: "daily",
      priority: 0.95,
    },
  ];

  const citySlugs = new Set<string>();
  const pillarKeys = new Set<string>();
  const categoryKeys = new Set<string>();

  for (const event of validEvents) {
    if (!event.city_slug) continue;

    citySlugs.add(event.city_slug);

    if (!event.pillar_slug) continue;

    pillarKeys.add(`${event.city_slug}__${event.pillar_slug}`);

    if (!event.category_slug) continue;

    categoryKeys.add(
      `${event.city_slug}__${event.pillar_slug}__${event.category_slug}`
    );
  }

  const cityPages: MetadataRoute.Sitemap = [...citySlugs].map(
    (citySlug) => ({
      url: `${SITE_URL}${buildEventUrl({ citySlug })}`,
      changeFrequency: "daily",
      priority: 0.9,
    })
  );

  const pillarPages: MetadataRoute.Sitemap = [...pillarKeys].map(
    (key) => {
      const [citySlug, pillarSlug] = key.split("__");

      return {
        url: `${SITE_URL}${buildEventUrl({ citySlug, pillarSlug })}`,
        changeFrequency: "daily",
        priority: 0.85,
      };
    }
  );

  const categoryPages: MetadataRoute.Sitemap = [...categoryKeys].map(
    (key) => {
      const [citySlug, pillarSlug, categorySlug] = key.split("__");

      return {
        url: `${SITE_URL}${buildEventUrl({
          citySlug,
          pillarSlug,
          categorySlug,
        })}`,
        changeFrequency: "daily",
        priority: 0.8,
      };
    }
  );

  const eventPages: MetadataRoute.Sitemap = validEvents
    .filter(
      (event) =>
        event.slug &&
        event.city_slug &&
        event.pillar_slug &&
        event.category_slug
    )
    .map((event) => ({
      url: `${SITE_URL}${buildEventUrl({
        citySlug: event.city_slug!,
        pillarSlug: event.pillar_slug!,
        categorySlug: event.category_slug!,
        slug: event.slug!,
      })}`,
      ...(event.updated_at
        ? { lastModified: new Date(event.updated_at) }
        : {}),
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

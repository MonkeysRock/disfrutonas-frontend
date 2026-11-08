import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCityCountry } from "@/lib/city-country";
import { buildEventUrl } from "@/lib/event-urls";
import { categoryLabels, pillarContent } from "@/data/taxonomy";
import { getEventsByCityPillarAndCategory } from "@/app/eventos/[city]/[pillar]/[category]/page";
import EventsHeader from "@/components/layout/EventsHeader";
import EventCard from "@/components/events/EventCard";

type Props = {
  params: Promise<{
    city: string;
    pillar: string;
    category: string;
  }>;
};

async function getPageInfo(city: string, pillar: string, category: string) {
  const info = await getCityCountry(city);
  const pillarInfo = pillarContent[pillar];
  const categoryName = categoryLabels[category];

  if (
    !info ||
    !info.countrySlug ||
    info.countrySlug === "espana" ||
    !pillarInfo ||
    !categoryName
  ) {
    notFound();
  }

  return { info, pillarInfo, categoryName };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city, pillar, category } = await params;
  const { info, categoryName } = await getPageInfo(city, pillar, category);

  return {
    title: `${categoryName} en ${info.cityName}`,
    description: `Descubre ${categoryName.toLowerCase()} en ${info.cityName}, ${info.countryName}. Encuentra actividades, entradas y planes.`,
    alternates: {
      canonical: buildEventUrl({
        countrySlug: info.countrySlug,
        citySlug: info.citySlug,
        pillarSlug: pillar,
        categorySlug: category,
      }),
    },
  };
}

export default async function InternationalCategoryPage({ params }: Props) {
  const { city, pillar, category } = await params;
  console.log("[DIAGNOSTICO CATEGORIA INTERNACIONAL]", city, pillar, category);
  const { info, pillarInfo, categoryName } = await getPageInfo(
    city,
    pillar,
    category
  );

  const events = await getEventsByCityPillarAndCategory(
    info.citySlug,
    pillar,
    category
  );

  const cityUrl = buildEventUrl({
    countrySlug: info.countrySlug,
    citySlug: info.citySlug,
  });

  const pillarUrl = buildEventUrl({
    countrySlug: info.countrySlug,
    citySlug: info.citySlug,
    pillarSlug: pillar,
  });

  return (
    <>
      <EventsHeader />
      <main className="min-h-screen bg-[#fafafa] px-4 py-8">
        <section className="mx-auto max-w-[1200px]">
          <nav className="mb-6 text-sm text-[#666]">
            <a href="/eventos">Eventos</a>
            {" / "}
            <span>{info.countryName}</span>
            {" / "}
            <a href={cityUrl}>{info.cityName}</a>
            {" / "}
            <a href={pillarUrl}>{pillarInfo.label}</a>
            {" / "}
            <span>{categoryName}</span>
          </nav>

          <h1 className="mb-6 text-4xl font-bold">
            {categoryName} en {info.cityName}
          </h1>

          <p className="mb-6">
            {events.length} actividades disponibles.
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

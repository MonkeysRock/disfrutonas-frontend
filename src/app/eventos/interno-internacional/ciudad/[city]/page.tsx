import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCityCountry } from "@/lib/city-country";
import { buildEventUrl } from "@/lib/event-urls";
import { getEventsByCity } from "@/app/eventos/[city]/page";
import EventsHeader from "@/components/layout/EventsHeader";
import EventCard from "@/components/events/EventCard";

type Props = {
  params: Promise<{ city: string }>;
};

async function getInternationalCity(city: string) {
  const info = await getCityCountry(city);

  if (!info || !info.countrySlug || info.countrySlug === "espana") {
    notFound();
  }

  return info;
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { city } = await params;
  const info = await getInternationalCity(city);
  const canonical = buildEventUrl({
    countrySlug: info.countrySlug,
    citySlug: info.citySlug,
  });

  return {
    title: `Eventos en ${info.cityName}`,
    description: `Descubre qué hacer en ${info.cityName}, ${info.countryName}: monumentos, actividades culturales, ocio y planes para toda la familia.`,
    alternates: { canonical },
    robots: { index: true, follow: true },
  };
}

export default async function InternationalCityPage({
  params,
}: Props) {
  const { city } = await params;
  const info = await getInternationalCity(city);
  const events = await getEventsByCity(info.citySlug);

  const cityUrl = buildEventUrl({
    countrySlug: info.countrySlug,
    citySlug: info.citySlug,
  });

  const pillars = [
    { slug: "culturales", label: "Culturales" },
    { slug: "deportivos", label: "Deportivos" },
    { slug: "familia", label: "Familia" },
    { slug: "ocio", label: "Ocio" },
  ];

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
            <span>{info.cityName}</span>
          </nav>

          <h1 className="mb-6 text-4xl font-bold">
            Eventos en {info.cityName}
          </h1>

          <div className="mb-8 flex flex-wrap gap-3">
            <a href={cityUrl}>Todos</a>
            {pillars.map((pillar) => (
              <a
                key={pillar.slug}
                href={buildEventUrl({
                  countrySlug: info.countrySlug,
                  citySlug: info.citySlug,
                  pillarSlug: pillar.slug,
                })}
              >
                {pillar.label}
              </a>
            ))}
          </div>

          <p className="mb-6">
            {events.length} actividades disponibles en {info.cityName}.
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

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCityCountry } from "@/lib/city-country";
import { buildEventUrl } from "@/lib/event-urls";
import { pillarContent } from "@/data/taxonomy";
import { getEventsByCityAndPillar } from "@/app/eventos/[city]/[pillar]/page";
import EventsHeader from "@/components/layout/EventsHeader";
import EventCard from "@/components/events/EventCard";

type Props = {
  params: Promise<{ city: string; pillar: string }>;
};

async function getPageInfo(city: string, pillar: string) {
  const info = await getCityCountry(city);
  const pillarInfo = pillarContent[pillar];

  if (!info || !info.countrySlug || info.countrySlug === "espana" || !pillarInfo) {
    notFound();
  }

  return { info, pillarInfo };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city, pillar } = await params;
  const { info, pillarInfo } = await getPageInfo(city, pillar);

  return {
    title: `${pillarInfo.label} en ${info.cityName}`,
    description: `Descubre actividades ${pillarInfo.label.toLowerCase()} en ${info.cityName}, ${info.countryName}.`,
    alternates: {
      canonical: buildEventUrl({
        countrySlug: info.countrySlug,
        citySlug: info.citySlug,
        pillarSlug: pillar,
      }),
    },
  };
}

export default async function InternationalPillarPage({ params }: Props) {
  const { city, pillar } = await params;
  const { info, pillarInfo } = await getPageInfo(city, pillar);
  const events = await getEventsByCityAndPillar(info.citySlug, pillar);

  const cityUrl = buildEventUrl({
    countrySlug: info.countrySlug,
    citySlug: info.citySlug,
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
            <span>{pillarInfo.label}</span>
          </nav>

          <h1 className="mb-6 text-4xl font-bold">
            {pillarInfo.label} en {info.cityName}
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

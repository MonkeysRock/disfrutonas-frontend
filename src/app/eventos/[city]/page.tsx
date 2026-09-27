import type { Metadata } from "next";
import { citiesContent } from "@/data/taxonomy";
import { supabase } from "@/lib/supabase";
import EventsHeader from "@/components/layout/EventsHeader";
import EventCard from "@/components/events/EventCard";


async function getEventsByCity(city: string) {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("city_slug", city.toLowerCase())
    .or(
  `event_date.gte.${today},and(end_date.not.is.null,end_date.gte.${today})`
)
    .order("event_date", { ascending: true });

  if (error) {
    console.error("Error cargando eventos desde Supabase:", error);
    return [];
  }

  return (data || []).map((event) => ({
    id: event.id,
    title: event.title || "Evento sin título",
    slug: event.slug || event.id,
    city: event.city || "",
    citySlug: event.city_slug || "",
    pillar: event.pillar || "",
    pillarSlug: event.pillar_slug || "",
    category: event.category || "",
    categorySlug: event.category_slug || "",
    eventDate: event.event_date || "",
    date: event.date || event.event_date || "",
    time: event.time || "",
    place: event.place || "",
    isFree: Boolean(event.is_free),
    price: event.price ?? undefined,
    priceLabel:
      event.price_label ||
      (event.is_free
        ? "Gratis"
        : event.price != null
        ? `Desde ${event.price}€`
        : "Consultar precio"),

        image:
  event.image ||
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop",
imageAlt: event.image_alt || event.title || "Evento",
  }));
}

function cityNameFromSlug(city: string) {
  return city
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;

  const cityEvents = await getEventsByCity(city);
  const cityInfo = citiesContent[city];

  const cityName =
    cityInfo?.title.replace("Eventos en ", "") || cityNameFromSlug(city);

  const pageTitle = `Eventos en ${cityName} | Disfrutonas`;

  const pageDescription = cityInfo?.description
    ? `${cityInfo.description} Descubre ${cityEvents.length} eventos disponibles en ${cityName}.`
    : `Descubre ${cityEvents.length} eventos en ${cityName}: conciertos, cultura, deporte, planes en familia y mucho más.`;

  const canonicalPath = `/eventos/${city}`;

  return {
    title: pageTitle,
    description: pageDescription,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: canonicalPath,
      siteName: "Disfrutonas",
      type: "website",
      locale: "es_ES",
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
    },
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;

  const cityEvents = await getEventsByCity(city);
const cityInfo = citiesContent[city];

const cityName =
  cityInfo?.title.replace("Eventos en ", "") || cityNameFromSlug(city);

  return (
  <>
    <EventsHeader />

    <main className="min-h-screen bg-[#fafafa] px-4 py-6 md:px-5 md:py-10">
      <section className="mx-auto max-w-[1200px]">
        <div className="mb-4 text-sm text-[#666]">
          <a href="/eventos" className="text-[#666] no-underline">
            Eventos
          </a>
          {" / "}
          <span>Eventos en {cityName}</span>
        </div>

        <section className="mb-7">
  <h1 className="m-0 text-4xl font-bold leading-tight md:text-5xl">
    Eventos en {cityName}
  </h1>
</section>

       
        <section className="mb-8">
          <div className="mb-4 flex flex-wrap gap-3">
            <a
              href={`/eventos/${city}`}
              className="rounded-full bg-[#111] px-4 py-3 font-bold text-white no-underline"
            >
              Todos
            </a>
            <a
              href={`/eventos/${city}/deportivos`}
              className="rounded-full bg-[#eef6ff] px-4 py-3 font-bold text-[#1565c0] no-underline"
            >
              Deportivos
            </a>
            <a
              href={`/eventos/${city}/culturales`}
              className="rounded-full bg-[#fff0f6] px-4 py-3 font-bold text-[#d81b60] no-underline"
            >
              Culturales
            </a>
            <a
  href={`/eventos/${city}/familia`}
  className="rounded-full bg-[#fff7e6] px-4 py-3 font-bold text-[#d97706] no-underline"
>
  Familia
</a>
          </div>
        </section>

        {cityEvents.length === 0 ? (
          <section className="rounded-[24px] border border-[#eee] bg-white p-10 text-center">
            <h2 className="mt-0 text-3xl font-bold">Todavía no hay eventos aquí</h2>
            <p className="mt-3 text-[#666]">
              Más adelante podrás ver conciertos, festivales, deporte y más.
            </p>
          </section>
        ) : (
          <section>
            <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
              <h2 className="m-0 text-3xl font-bold">
                Eventos en {cityName}
              </h2>
              <span className="text-[#666]">
                {cityEvents.length} resultado{cityEvents.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {cityEvents.map((event) => (
                <EventCard
  key={event.id}
  event={event}
/>
              ))}
            </div>
          </section>
        )}
            </section>
    </main>
  </>
);
}

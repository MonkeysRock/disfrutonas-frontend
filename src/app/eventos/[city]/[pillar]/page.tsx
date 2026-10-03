import type { Metadata } from "next";
import { pillarContent } from "@/data/taxonomy";
import { supabase } from "@/lib/supabase";
import EventsHeader from "@/components/layout/EventsHeader";
import EventCard from "@/components/events/EventCard";

async function getEventsByCityAndPillar(
  city: string,
  pillar: string
) {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("city_slug", city.toLowerCase())
    .eq("pillar_slug", pillar)
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
    time: event.time || "",
    date: event.date || event.event_date || "",
    endDate: event.end_date || "",
    place: event.place || "Lugar por confirmar",
    description: event.description || "",
    isFree: Boolean(event.is_free),
    price: typeof event.price === "number" ? event.price : 0,
    priceLabel:
      event.price_label ||
      (event.is_free ? "Gratis" : `Desde ${event.price || 0}€`),
    image: event.image || "",
    imageAlt: event.image_alt || event.title || "Evento",
    sourceUrl: event.source_url || "",
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; pillar: string }>;
}): Promise<Metadata> {
  const { city, pillar } = await params;
  const pillarInfo = pillarContent[pillar];
  const filtered = await getEventsByCityAndPillar(city, pillar);

  if (!pillarInfo) {
    return {
      title: "Categoría no encontrada | Disfrutonas",
      description: "No hemos encontrado este pilar en Disfrutonas.",
    };
  }

  const cityLabel = city.charAt(0).toUpperCase() + city.slice(1);
  const pageTitle = `${pillarInfo.label} en ${cityLabel} | Disfrutonas`;
  const pageDescription = `${pillarInfo.description} Explora ${filtered.length} eventos ${pillarInfo.label.toLowerCase()} en ${cityLabel}.`;
  const canonicalPath = `/eventos/${city}/${pillar}`;

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

export default async function PillarPage({
  params,
}: {
  params: Promise<{ city: string; pillar: string }>;
}) {
  const { city, pillar } = await params;

  const pillarInfo = pillarContent[pillar];

  if (!pillarInfo) {

    return (
      <main className="min-h-screen bg-[#fafafa] px-5 py-10">
        
        <section className="mx-auto max-w-[900px] rounded-[24px] border border-[#eee] bg-white p-10 text-center">
          <h1 className="mt-0 text-3xl font-bold">Pilar no encontrado</h1>
          <p className="mt-3 text-[#666]">
            La ruta que has abierto no coincide con un pilar válido.
          </p>
          <a
            href="/eventos"
            className="mt-5 inline-block rounded-xl bg-[#111] px-5 py-3 font-bold text-white no-underline"
          >
            Volver a eventos
          </a>
        </section>
      </main>
    );
  }

  const filtered = await getEventsByCityAndPillar(city, pillar);

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
          <a href={`/eventos/${city}`} className="text-[#666] no-underline">
            {city}
          </a>
          {" / "}
          <span>{pillarInfo.label}</span>
        </div>

     <section className="mb-7">
  <div className="flex items-baseline gap-3">
    <span
      aria-hidden="true"
      className="text-4xl font-bold leading-tight md:text-5xl"
    >
      {filtered.length}
    </span>

    <h1 className="m-0 text-4xl font-bold leading-tight md:text-5xl">
      {pillarInfo.label} en {city.charAt(0).toUpperCase() + city.slice(1)}
    </h1>
  </div>
</section>

        <section className="mb-8">
          <div className="mb-4 flex flex-wrap gap-3">
            <a
              href={`/eventos/${city}`}
              className="rounded-full border border-[#ddd] bg-white px-4 py-3 font-bold text-[#111] no-underline"
            >
              Todos
            </a>

            <a
              href={`/eventos/${city}/deportivos`}
              className={`rounded-full px-4 py-3 font-bold no-underline ${
                pillar === "deportivos"
                  ? "bg-[#e9f2ff] text-[#1565c0]"
                  : "border border-[#ddd] bg-white text-[#111]"
              }`}
            >
              Deportivos
            </a>

            <a
              href={`/eventos/${city}/culturales`}
              className={`rounded-full px-4 py-3 font-bold no-underline ${
                pillar === "culturales"
                  ? "bg-[#ffe8f1] text-[#d81b60]"
                  : "border border-[#ddd] bg-white text-[#111]"
              }`}
            >
              Culturales
            </a>
          </div>

          <div className="flex flex-wrap gap-3">
            {pillarInfo.categories.map((category) => (
              <a
                key={category.slug}
                href={`/eventos/${city}/${pillar}/${category.slug}`}
                className={`rounded-full px-4 py-3 font-bold no-underline ${
                  pillar === "deportivos"
                    ? "bg-[#eef6ff] text-[#1565c0]"
                    : "bg-[#fff0f6] text-[#d81b60]"
                }`}
              >
                {category.label}
              </a>
            ))}
          </div>
        </section>

       

        {filtered.length === 0 ? (
          <section className="rounded-[24px] border border-[#eee] bg-white p-10 text-center">
            <h3 className="mt-0 text-3xl font-bold">
              No hay eventos en este pilar
            </h3>
            <p className="mt-3 text-[#666]">
              Todavía no hemos añadido eventos de {pillarInfo.label.toLowerCase()} en {city}.
            </p>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((event) => (
              <EventCard
      key={event.id}
      event={event}
    />
            ))}
          </section>
        )}
          </section>
  </main>
  </>
);
}
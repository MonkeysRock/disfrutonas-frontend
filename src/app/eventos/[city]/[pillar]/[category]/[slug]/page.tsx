import type { Metadata } from "next";
import Link from "next/link";
import EventDetailHeader from "@/components/layout/EventDetailHeader";
import { supabase } from "@/lib/supabase";

const SITE_URL = "https://disfrutonas.com";

type PageParams = {
  city: string;
  pillar: string;
  category: string;
  slug: string;
};

type SupabaseEvent = {
  id: string;
  title: string | null;
  slug: string | null;
  city: string | null;
  city_slug: string | null;
  pillar: string | null;
  pillar_slug: string | null;
  category: string | null;
  category_slug: string | null;
  event_date: string | null;
  time: string | null;
  date: string | null;
  place: string | null;
  description: string | null;
  is_free: boolean | null;
  price: number | null;
  price_label: string | null;
  image: string | null;
  image_alt: string | null;
  image_label: string | null;
  image_sub_label: string | null;
  lat: number | null;
  lng: number | null;
  source_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type EventDetail = {
  id: string;
  title: string;
  slug: string;
  city: string;
  citySlug: string;
  pillar: string;
  pillarSlug: string;
  category: string;
  categorySlug: string;
  eventDate: string;
  time: string;
  date: string;
  place: string;
  description: string;
  isFree: boolean;
  price: number;
  priceLabel: string;
  image: string;
  imageAlt: string;
  imageLabel: string;
  imageSubLabel: string;
  lat: number;
  lng: number;
  sourceUrl: string;
  includes: string[];
};

function mapSupabaseEvent(event: SupabaseEvent): EventDetail {
  const isFree = Boolean(event.is_free);
  const price = typeof event.price === "number" ? event.price : 0;

  return {
    id: event.id,
    title: event.title || "Evento sin título",
    slug: event.slug || event.id,
    city: event.city || "",
    citySlug: event.city_slug || "",
    pillar: event.pillar || "Culturales",
    pillarSlug: event.pillar_slug || "culturales",
    category: event.category || "General",
    categorySlug: event.category_slug || "general",
    eventDate: event.event_date || "",
    time: event.time || "00:00",
    date: event.date || event.event_date || "Fecha por confirmar",
    place: event.place || "Lugar por confirmar",
    description:
      event.description ||
      "Evento disponible próximamente en Disfrutonas.",
    isFree,
    price,
    priceLabel: event.price_label || (isFree ? "Gratis" : `${price}€`),
    image:
      event.image ||
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1600&auto=format&fit=crop",
    imageAlt: event.image_alt || event.title || "Evento",
    imageLabel: event.image_label || event.title || "Evento destacado",
    imageSubLabel: event.image_sub_label || event.city || "",
    lat: typeof event.lat === "number" ? event.lat : 40.4168,
    lng: typeof event.lng === "number" ? event.lng : -3.7038,
    sourceUrl: event.source_url || "",
    includes: [
      "Acceso al evento",
      "Información actualizada",
      "Ubicación verificada",
    ],
  };
}

async function getEventByFullPath(params: PageParams) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("city_slug", params.city)
    .eq("pillar_slug", params.pillar)
    .eq("category_slug", params.category)
    .eq("slug", params.slug)
    .single();

  if (error || !data) {
    console.error("Error cargando detalle desde Supabase:", error);
    return null;
  }

  return mapSupabaseEvent(data as SupabaseEvent);
}

async function getRelatedEvents(event: EventDetail) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .neq("id", event.id)
    .or(`city_slug.eq.${event.citySlug},category_slug.eq.${event.categorySlug}`)
    .limit(3);

  if (error || !data) {
    return [];
  }

  return (data as SupabaseEvent[]).map(mapSupabaseEvent);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const event = await getEventByFullPath(resolvedParams);

  if (!event) {
    return {
      title: "Evento no encontrado | Disfrutonas",
      description: "No hemos encontrado esta ficha de evento en Disfrutonas.",
    };
  }

  const pageTitle = `${event.title} en ${event.city} | Disfrutonas`;
  const pageDescription = `${event.title} · ${event.date} · ${event.place}. ${event.description}`;
  const canonicalPath = `/eventos/${event.citySlug}/${event.pillarSlug}/${event.categorySlug}/${event.slug}`;
  const absoluteUrl = `${SITE_URL}${canonicalPath}`;

  return {
    title: pageTitle,
    description: pageDescription,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: absoluteUrl,
      siteName: "Disfrutonas",
      type: "article",
      locale: "es_ES",
      images: [
        {
          url: event.image,
          width: 1600,
          height: 900,
          alt: event.imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: [event.image],
    },
  };
}

function buildEventNarrative(event: EventDetail) {
  const categoryLower = event.category.toLowerCase();
  const placeText = event.place;
  const cityText = event.city;

  const intro =
    event.pillar === "Deportivos"
      ? `${event.title} se celebra en ${placeText}, un espacio muy reconocible dentro de ${cityText} para vivir el deporte en directo con intensidad, ambiente y sensación de cita importante.`
      : `${event.title} tiene lugar en ${placeText}, un enclave muy interesante dentro de ${cityText} para disfrutar de una propuesta cultural con personalidad propia.`;

  const venue = `${placeText} encaja especialmente bien con una cita de ${categoryLower}, porque el lugar donde ocurre el evento influye muchísimo en cómo se vive.`;

  const curiosity =
    event.pillar === "Deportivos"
      ? `Como curiosidad, los eventos deportivos suelen cambiar muchísimo según el momento del calendario, el tipo de rivalidad y la reacción del público.`
      : `Como curiosidad, en los eventos culturales muchas veces lo más recordado no es solo el momento central, sino también los pequeños detalles alrededor.`;

  const participants =
    event.pillar === "Deportivos"
      ? `También influye mucho el perfil de quienes participan. En una cita así no solo cuenta el resultado, sino la forma de competir y la energía del directo.`
      : `También tiene peso el perfil de quienes forman parte del evento. La trayectoria, el estilo y la conexión con el público suelen marcar diferencias muy claras.`;

  const closing = event.includes?.length
    ? `Además, esta propuesta incluye ${event.includes
        .slice(0, 3)
        .join(", ")
        .toLowerCase()}, lo que ayuda a redondear la experiencia.`
    : event.description;

  return [intro, venue, curiosity, participants, closing];
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const resolvedParams = await params;
  const event = await getEventByFullPath(resolvedParams);

  if (!event) {
    return (
      <main className="min-h-screen bg-[#fafafa]">
        <EventDetailHeader />

        <section className="mx-auto max-w-[900px] px-4 py-10">
          <section className="rounded-[24px] border border-[#eee] bg-white p-10 text-center">
            <h1 className="mt-0 text-[34px] font-extrabold tracking-[-0.6px] text-[#111]">
              Evento no encontrado
            </h1>

            <p className="text-[#666]">
              No hemos encontrado esta ficha. Puede que la URL no exista.
            </p>

            <Link
              href="/eventos"
              className="mt-[18px] inline-block rounded-[12px] bg-[#111] px-[18px] py-3 font-bold text-white no-underline"
            >
              Volver al listado
            </Link>
          </section>
        </section>
      </main>
    );
  }

  const relatedEvents = await getRelatedEvents(event);
  const narrativeBlocks = buildEventNarrative(event);

  const eventUrl = `${SITE_URL}/eventos/${event.citySlug}/${event.pillarSlug}/${event.categorySlug}/${event.slug}`;
  const startDate = `${event.eventDate}T${event.time}:00`;

  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate,
    endDate: startDate,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    image: [event.image],
    url: eventUrl,
    isAccessibleForFree: event.isFree,
    location: {
      "@type": "Place",
      name: event.place,
      address: {
        "@type": "PostalAddress",
        addressLocality: event.city,
        addressCountry: "ES",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: event.lat,
        longitude: event.lng,
      },
    },
    offers: {
      "@type": "Offer",
      url: eventUrl,
      price: event.price,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      validFrom: event.eventDate,
    },
    organizer: {
      "@type": "Organization",
      name: "Disfrutonas",
      url: SITE_URL,
    },
  };

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(eventJsonLd),
        }}
      />

      <EventDetailHeader initialLocationName={event.city} />

      <section className="mx-auto max-w-[1180px] px-4 py-6 md:px-5 md:py-10">
        <section className="mb-7 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <article className="order-1 overflow-hidden rounded-[28px] border border-[#eee] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.06)] lg:order-0">
            <div className="relative">
              <img
                src={event.image}
                alt={event.imageAlt}
                className="block h-[280px] w-full object-cover sm:h-[360px] lg:h-[500px]"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 lg:p-8">
                <div className="mb-3 flex flex-wrap gap-2.5">
                  <span
                    className={`rounded-full px-3 py-2 text-sm font-bold ${
                      event.pillar === "Deportivos"
                        ? "bg-[#e9f2ff] text-[#1565c0]"
                        : "bg-[#ffe8f1] text-[#d81b60]"
                    }`}
                  >
                    {event.pillar}
                  </span>

                  <span className="rounded-full bg-white/90 px-3 py-2 text-sm font-bold text-[#222]">
                    {event.category}
                  </span>

                  <span className="rounded-full bg-white/90 px-3 py-2 text-sm font-bold text-[#222]">
                    {event.isFree ? "Gratis" : `Desde ${event.price}€`}
                  </span>
                </div>

                <p className="mb-2 text-sm font-bold uppercase tracking-[0.08em] text-white/80">
                  Evento destacado
                </p>

                <h1 className="m-0 max-w-[900px] text-3xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
                  {event.imageLabel}
                </h1>

                <p className="mb-0 mt-3 text-base font-medium text-white/90 sm:text-lg">
                  {event.imageSubLabel}
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-6 lg:p-[30px]">
              <div className="mb-6">
                <div className="mb-3 text-[13px] font-bold text-[#777]">
                  UBICACIÓN
                </div>

                <div className="overflow-hidden rounded-[22px] border border-[#eee] shadow-[0_6px_18px_rgba(0,0,0,0.04)]">
                  <iframe
                    title={`Mapa de ${event.place}`}
                    src={`https://www.google.com/maps?q=${event.lat},${event.lng}&z=15&output=embed`}
                    width="100%"
                    height="320"
                    style={{ border: 0 }}
                    loading="lazy"
                  />
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="m-0 text-[15px] text-[#666]">
                    {event.place}, {event.city}
                  </p>

                  <a
                    href={`https://www.google.com/maps?q=${event.lat},${event.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-sm font-bold text-[#1565c0] no-underline"
                  >
                    Ver en Google Maps →
                  </a>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                <div className="rounded-[18px] border border-[#eee] bg-[#fafafa] p-4">
                  <div className="mb-2 text-xs font-bold text-[#777]">FECHA</div>
                  <div className="font-bold">{event.date}</div>
                </div>

                <div className="rounded-[18px] border border-[#eee] bg-[#fafafa] p-4">
                  <div className="mb-2 text-xs font-bold text-[#777]">CIUDAD</div>
                  <div className="font-bold">{event.city}</div>
                </div>

                <div className="rounded-[18px] border border-[#eee] bg-[#fafafa] p-4">
                  <div className="mb-2 text-xs font-bold text-[#777]">LUGAR</div>
                  <div className="font-bold">{event.place}</div>
                </div>
              </div>

              <div>
                <h2 className="mb-4 mt-0 text-[28px] sm:text-[30px]">
                  Sobre el evento
                </h2>

                <div className="space-y-5 text-base leading-8 text-[#555] sm:text-lg">
                  {narrativeBlocks.map((paragraph, index) => (
                    <p key={index} className="m-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </article>

          <aside className="order-2 rounded-[28px] border border-[#eee] bg-white p-5 shadow-[0_12px_30px_rgba(0,0,0,0.05)] lg:order-1 lg:sticky lg:top-28 lg:h-fit lg:p-6">
            <div className="mb-1.5 text-sm font-bold text-[#777]">ENTRADAS</div>

            <div className="mb-5 text-4xl font-extrabold sm:text-5xl">
              {event.isFree ? "Gratis" : `${event.price}€`}
            </div>

            <a
              href={event.sourceUrl || "#"}
              target={event.sourceUrl ? "_blank" : undefined}
              rel={event.sourceUrl ? "noreferrer" : undefined}
              className="mb-3 block w-full rounded-[14px] border-none bg-[#111] px-[18px] py-4 text-center text-base font-bold text-white no-underline transition hover:bg-[#222]"
            >
              Comprar entrada
            </a>

            <button className="mb-5 w-full cursor-pointer rounded-[14px] border border-[#ddd] bg-white px-[18px] py-4 text-base font-bold text-[#111] transition hover:bg-[#fafafa]">
              Guardar evento
            </button>

            <div className="border-t border-[#eee] pt-[18px]">
              <div className="mb-3 text-[13px] font-bold text-[#777]">
                QUÉ INCLUYE
              </div>

              <div className="grid gap-2.5">
                {event.includes.map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-[#eee] bg-[#fafafa] px-[14px] py-3 text-[#444]"
                  >
                    ✓ {item}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        {relatedEvents.length > 0 && (
          <section>
            <h2 className="mb-[18px] text-[28px] sm:text-[30px]">
              Más eventos relacionados
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {relatedEvents.map((item) => (
                <Link
                  key={item.id}
                  href={`/eventos/${item.citySlug}/${item.pillarSlug}/${item.categorySlug}/${item.slug}`}
                  className="overflow-hidden rounded-[20px] border border-[#eee] bg-white no-underline shadow-[0_8px_20px_rgba(0,0,0,0.05)] transition hover:translate-y-[-2px]"
                >
                  <img
                    src={item.image}
                    alt={item.imageAlt}
                    className="block h-[190px] w-full object-cover"
                  />

                  <div className="p-[18px] text-[#111]">
                    <div className="mb-3 flex flex-wrap justify-between gap-2.5">
                      <span
                        className={`rounded-full px-2.5 py-[7px] text-[13px] font-bold ${
                          item.pillar === "Deportivos"
                            ? "bg-[#e9f2ff] text-[#1565c0]"
                            : "bg-[#ffe8f1] text-[#d81b60]"
                        }`}
                      >
                        {item.pillar}
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-[7px] text-[13px] font-bold ${
                          item.isFree
                            ? "bg-[#eaf8ee] text-[#1b8f3a]"
                            : "bg-[#f5f5f5] text-[#111]"
                        }`}
                      >
                        {item.isFree ? "Gratis" : `Desde ${item.price}€`}
                      </span>
                    </div>

                    <h3 className="mb-2.5 text-[24px] leading-tight">
                      {item.title}
                    </h3>

                    <p className="mb-1.5 text-[#666]">
                      <strong>Ciudad:</strong> {item.city}
                    </p>
                    <p className="mb-1.5 text-[#666]">
                      <strong>Fecha:</strong> {item.date}
                    </p>
                    <p className="m-0 text-[#666]">
                      <strong>Lugar:</strong> {item.place}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
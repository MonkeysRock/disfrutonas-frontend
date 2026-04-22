import type { Metadata } from "next";
import Link from "next/link";
import EventDetailHeader from "@/components/layout/EventDetailHeader";
import { getEventByFullPath, getRelatedEvents } from "@/lib/helpers";

const SITE_URL = "https://disfrutonas.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    city: string;
    pillar: string;
    category: string;
    slug: string;
  }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const event = getEventByFullPath(resolvedParams);

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

function buildEventNarrative(event: {
  title: string;
  city: string;
  place: string;
  pillar: string;
  category: string;
  date: string;
  description: string;
  includes: string[];
}) {
  const categoryLower = event.category.toLowerCase();
  const placeText = event.place;
  const cityText = event.city;

  const intro =
    event.pillar === "Deportivos"
      ? `${event.title} se celebra en ${placeText}, un espacio muy reconocible dentro de ${cityText} para vivir el deporte en directo con intensidad, ambiente y sensación de cita importante. Este tipo de plan suele atraer tanto a seguidores habituales como a gente que simplemente quiere disfrutar de una experiencia potente fuera de casa, con emoción, ritmo y un contexto muy distinto al de verlo desde lejos.`
      : `${event.title} tiene lugar en ${placeText}, un enclave muy interesante dentro de ${cityText} para disfrutar de una propuesta cultural con personalidad propia. Más allá del evento en sí, el entorno, el ambiente y el tipo de público que suele acudir convierten la experiencia en un plan con más recorrido, de esos que empiezan antes de entrar y que siguen dejando sensación de noche especial al salir.`

  const venue =
    `${placeText} encaja especialmente bien con una cita de ${categoryLower}, porque el lugar donde ocurre el evento influye muchísimo en cómo se vive. La ubicación, la atmósfera del recinto y la forma en la que el público se relaciona con el espacio ayudan a que la experiencia tenga más presencia, más ritmo y más recuerdo, algo que en planes en directo se nota desde el primer momento.`

  const curiosity =
    event.pillar === "Deportivos"
      ? `Como curiosidad, los eventos deportivos suelen cambiar muchísimo según el momento del calendario, el tipo de rivalidad, el estado de los participantes o incluso la reacción del público en directo. Precisamente por eso dos citas parecidas nunca se viven igual: el ambiente, la tensión y la respuesta de la grada o del entorno hacen que cada jornada tenga una personalidad propia.`
      : `Como curiosidad, en los eventos culturales muchas veces lo más recordado no es solo el momento central, sino también pequeños detalles que aparecen alrededor: reacciones del público, cambios de ritmo, improvisaciones, guiños del cartel o la forma en la que el espacio condiciona la experiencia. Esa suma de factores hace que incluso dentro de una misma categoría cada evento tenga una identidad distinta.`

  const participants =
    event.pillar === "Deportivos"
      ? `También influye mucho el perfil de quienes participan. En una cita así no solo cuenta el resultado o el desenlace, sino la forma de competir, el contexto en el que llegan los protagonistas y el tipo de energía que se genera entre participantes y asistentes. Ahí está una de las grandes gracias del directo: cada detalle puede cambiar la percepción del evento y volverlo mucho más memorable.`
      : `También tiene peso el perfil de quienes forman parte del evento. En propuestas culturales, la trayectoria, el estilo, la conexión con el público o la manera de ocupar el escenario suelen marcar diferencias muy claras. Esa mezcla entre participantes, espacio y contexto hace que la experiencia gane matices y que cada plan tenga algo propio, incluso para asistentes que consumen esta categoría con frecuencia.`

  const closing = event.includes?.length
    ? `Además, esta propuesta incluye ${event.includes
        .slice(0, 3)
        .join(", ")
        .toLowerCase()}, lo que ayuda a redondear la experiencia y refuerza la sensación de plan bien planteado para disfrutarlo con calma y sin complicaciones.`
    : event.description;

  return [intro, venue, curiosity, participants, closing];
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{
    city: string;
    pillar: string;
    category: string;
    slug: string;
  }>;
}) {
  const { city, pillar, category, slug } = await params;

  const event = getEventByFullPath({ city, pillar, category, slug });

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

  const relatedEvents = getRelatedEvents(event);
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
    isAccessibleForFree: event.price === 0,
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
                    {event.price === 0 ? "Gratis" : `Desde ${event.price}€`}
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
              {event.price === 0 ? "Gratis" : `${event.price}€`}
            </div>

            <button className="mb-3 w-full cursor-pointer rounded-[14px] border-none bg-[#111] px-[18px] py-4 text-base font-bold text-white transition hover:bg-[#222]">
              Comprar entrada
            </button>

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
                  key={item.slug}
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
                          item.price === 0
                            ? "bg-[#eaf8ee] text-[#1b8f3a]"
                            : "bg-[#f5f5f5] text-[#111]"
                        }`}
                      >
                        {item.price === 0 ? "Gratis" : `Desde ${item.price}€`}
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
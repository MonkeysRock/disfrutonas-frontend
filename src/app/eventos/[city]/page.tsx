import type { Metadata } from "next";
import { citiesContent } from "@/data/taxonomy";
import {
  getEventsByCity,
  getPillarCountByCity,
} from "@/lib/helpers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  const cityInfo = citiesContent[city];
  const cityEvents = getEventsByCity(city);

  if (!cityInfo) {
    return {
      title: "Ciudad no encontrada | Disfrutonas",
      description: "No hemos encontrado esta ciudad en Disfrutonas.",
    };
  }

  const pageTitle = `${cityInfo.title} | Disfrutonas`;
  const pageDescription = `${cityInfo.description} Descubre ${cityEvents.length} eventos disponibles en ${cityInfo.title.replace(
    "Eventos en ",
    ""
  )}.`;
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

  const cityEvents = getEventsByCity(city);
  const cityInfo = citiesContent[city];

  if (!cityInfo) {
    return (
      <main className="min-h-screen bg-[#fafafa] px-5 py-10">
        <section className="mx-auto max-w-[900px] rounded-[24px] border border-[#eee] bg-white p-10 text-center">
          <h1 className="mt-0 text-3xl font-bold">Ciudad no encontrada</h1>
          <p className="mt-3 text-[#666]">
            No hemos encontrado una página de eventos para esta ciudad.
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

  return (
    <main className="min-h-screen bg-[#fafafa] px-4 py-6 md:px-5 md:py-10">
      <section className="mx-auto max-w-[1200px]">
        <div className="mb-4 text-sm text-[#666]">
          <a href="/eventos" className="text-[#666] no-underline">
            Eventos
          </a>
          {" / "}
          <span>{cityInfo.title}</span>
        </div>

        <section className="mb-8 grid grid-cols-1 gap-6 rounded-[28px] border border-[#eee] bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.05)] md:grid-cols-[1.2fr_0.8fr] md:p-8">
          <div>
            <div className="mb-3 inline-block rounded-full bg-[#ffe8f1] px-4 py-2 text-sm font-bold text-[#d81b60]">
              Ciudad destacada
            </div>

            <h1 className="mb-3 text-4xl leading-tight md:text-6xl">
              {cityInfo.title}
            </h1>

            <p className="mb-3 text-lg font-semibold text-[#444]">
              {cityInfo.subtitle}
            </p>

            <p className="m-0 max-w-[760px] text-base leading-7 text-[#666] md:text-lg">
              {cityInfo.description}
            </p>
          </div>

          <aside className="rounded-[24px] bg-[linear-gradient(135deg,#ff4d8d,#ff7a18)] p-6 text-white shadow-[0_18px_40px_rgba(255,122,24,0.22)]">
            <div className="mb-3 text-sm font-bold uppercase tracking-[0.08em]">
              Plan local
            </div>
            <p className="m-0 text-2xl font-bold leading-tight">
              {cityInfo.highlightedPlan}
            </p>
            <a
              href="/eventos"
              className="mt-5 inline-block rounded-[14px] bg-white px-5 py-3 font-bold text-[#d81b60] no-underline"
            >
              Ver todos los eventos
            </a>
          </aside>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-[22px] border border-[#eee] bg-white p-5">
            <div className="mb-2 text-xs font-bold text-[#777]">TOTAL EVENTOS</div>
            <div className="text-3xl font-extrabold">{cityEvents.length}</div>
          </div>

          <div className="rounded-[22px] border border-[#eee] bg-white p-5">
            <div className="mb-2 text-xs font-bold text-[#777]">DEPORTIVOS</div>
            <div className="text-3xl font-extrabold">
              {getPillarCountByCity(city, "deportivos")}
            </div>
          </div>

          <div className="rounded-[22px] border border-[#eee] bg-white p-5">
            <div className="mb-2 text-xs font-bold text-[#777]">CULTURALES</div>
            <div className="text-3xl font-extrabold">
              {getPillarCountByCity(city, "culturales")}
            </div>
          </div>
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
                Eventos en {cityInfo.title.replace("Eventos en ", "")}
              </h2>
              <span className="text-[#666]">
                {cityEvents.length} resultado{cityEvents.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {cityEvents.map((event) => (
                <article
                  key={event.id}
                  className="rounded-[22px] border border-[#eee] bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.05)]"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-3 py-2 text-sm font-bold ${
                        event.pillar === "Deportivos"
                          ? "bg-[#eef6ff] text-[#1565c0]"
                          : "bg-[#fff0f6] text-[#d81b60]"
                      }`}
                    >
                      {event.pillar}
                    </span>

                    <span
                      className={`rounded-full px-3 py-2 text-sm font-bold ${
                        event.isFree
                          ? "bg-[#eaf8ee] text-[#1b8f3a]"
                          : "bg-[#f5f5f5] text-[#111]"
                      }`}
                    >
                      {event.priceLabel}
                    </span>
                  </div>

                  <h3 className="mb-3 text-[28px] leading-tight">{event.title}</h3>

                  <p className="mb-2 text-[#666]">
                    <strong>Categoría:</strong> {event.category}
                  </p>
                  <p className="mb-2 text-[#666]">
                    <strong>Fecha:</strong> {event.date}
                  </p>
                  <p className="mb-4 text-[#666]">
                    <strong>Lugar:</strong> {event.place}
                  </p>

                  <a
                    href={`/eventos/${event.citySlug}/${event.pillarSlug}/${event.categorySlug}/${event.slug}`}
                    className="block w-full rounded-[14px] bg-[#111] px-4 py-3 text-center font-bold text-white no-underline"
                  >
                    Ver evento
                  </a>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
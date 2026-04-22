import type { Metadata } from "next";
import { pillarContent } from "@/data/taxonomy";
import { getEventsByCityAndPillar } from "@/lib/helpers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; pillar: string }>;
}): Promise<Metadata> {
  const { city, pillar } = await params;
  const pillarInfo = pillarContent[pillar];
  const filtered = getEventsByCityAndPillar(city, pillar);

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

  const filtered = getEventsByCityAndPillar(city, pillar);

  return (
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

        <section className="mb-8 grid grid-cols-1 gap-6 rounded-[28px] border border-[#eee] bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.05)] md:grid-cols-[1.2fr_0.8fr] md:p-8">
          <div>
            <div
              className={`mb-3 inline-block rounded-full px-4 py-2 text-sm font-bold ${
                pillar === "deportivos"
                  ? "bg-[#e9f2ff] text-[#1565c0]"
                  : "bg-[#ffe8f1] text-[#d81b60]"
              }`}
            >
              {pillarInfo.label}
            </div>

            <h1 className="mb-3 text-4xl leading-tight md:text-6xl">
              {pillarInfo.label} en {city}
            </h1>

            <p className="mb-3 text-lg font-semibold text-[#444]">
              {pillarInfo.subtitle}
            </p>

            <p className="m-0 max-w-[760px] text-base leading-7 text-[#666] md:text-lg">
              {pillarInfo.description}
            </p>
          </div>

          <aside
            className={`rounded-[24px] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.14)] ${
              pillar === "deportivos"
                ? "bg-[linear-gradient(135deg,#1565c0,#42a5f5)] text-white"
                : "bg-[linear-gradient(135deg,#d81b60,#ff7a18)] text-white"
            }`}
          >
            <div className="mb-3 text-sm font-bold uppercase tracking-[0.08em]">
              Categorías
            </div>
            <p className="m-0 text-2xl font-bold leading-tight">
              Navega por categorías específicas
            </p>
            <p className="mt-3 text-white/85">
              Ciudad: {city} · Pilar: {pillarInfo.label}
            </p>
            <a
              href={`/eventos/${city}`}
              className="mt-5 inline-block rounded-[14px] bg-white px-5 py-3 font-bold text-[#111] no-underline"
            >
              Volver a la ciudad
            </a>
          </aside>
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

        <section className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="m-0 text-3xl font-bold">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </h2>
          <span className="text-[#666]">
            {pillarInfo.label} en {city}
          </span>
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
          </section>
        )}
      </section>
    </main>
  );
}
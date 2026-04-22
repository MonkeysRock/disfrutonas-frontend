import type { Metadata } from "next";
import { categoryLabels } from "@/data/taxonomy";
import { getEventsByCityPillarAndCategory } from "@/lib/helpers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    city: string;
    pillar: string;
    category: string;
  }>;
}): Promise<Metadata> {
  const { city, pillar, category } = await params;

  const pillarLabel =
    pillar === "deportivos"
      ? "Deportivos"
      : pillar === "culturales"
      ? "Culturales"
      : null;

  const categoryLabel = categoryLabels[category];
  const filtered = getEventsByCityPillarAndCategory(city, pillar, category);

  if (!pillarLabel || !categoryLabel) {
    return {
      title: "Categoría no encontrada | Disfrutonas",
      description: "No hemos encontrado esta categoría en Disfrutonas.",
    };
  }

  const cityLabel = city.charAt(0).toUpperCase() + city.slice(1);
  const pageTitle = `${categoryLabel} en ${cityLabel} | Disfrutonas`;
  const pageDescription = `Descubre ${filtered.length} eventos de ${categoryLabel.toLowerCase()} en ${cityLabel}. Encuentra planes, horarios, lugares y acceso a cada ficha.`;
  const canonicalPath = `/eventos/${city}/${pillar}/${category}`;

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

export default async function CategoryPage({
  params,
}: {
  params: Promise<{
    city: string;
    pillar: string;
    category: string;
  }>;
}) {
  const { city, pillar, category } = await params;

  const pillarLabel =
    pillar === "deportivos"
      ? "Deportivos"
      : pillar === "culturales"
      ? "Culturales"
      : null;

  const categoryLabel = categoryLabels[category];

  if (!pillarLabel || !categoryLabel) {
    return (
      <main className="min-h-screen bg-[#fafafa] px-5 py-10">
        <section className="mx-auto max-w-[900px] rounded-[24px] border border-[#eee] bg-white p-10 text-center">
          <h1 className="mt-0 text-3xl font-bold">Categoría no encontrada</h1>
          <p className="mt-3 text-[#666]">
            La ruta que has abierto no coincide con una categoría válida.
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

  const filtered = getEventsByCityPillarAndCategory(city, pillar, category);

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
          <a
            href={`/eventos/${city}/${pillar}`}
            className="text-[#666] no-underline"
          >
            {pillarLabel}
          </a>
          {" / "}
          <span>{categoryLabel}</span>
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
              {pillarLabel}
            </div>

            <h1 className="mb-3 text-4xl leading-tight md:text-6xl">
              {categoryLabel} en {city}
            </h1>

            <p className="m-0 max-w-[760px] text-base leading-7 text-[#666] md:text-lg">
              Aquí verás todos los eventos de la categoría {categoryLabel.toLowerCase()} en{" "}
              {city}, con acceso directo a sus fichas, precios y detalles.
            </p>
          </div>

          <aside className="rounded-[24px] bg-[linear-gradient(135deg,#111,#333)] p-6 text-white shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
            <div className="mb-3 text-sm font-bold uppercase tracking-[0.08em]">
              Categoría activa
            </div>
            <p className="m-0 text-2xl font-bold leading-tight">
              {categoryLabel}
            </p>
            <p className="mt-3 text-white/80">
              Ciudad: {city} · Pilar: {pillarLabel}
            </p>
            <a
              href={`/eventos/${city}/${pillar}`}
              className="mt-5 inline-block rounded-[14px] bg-white px-5 py-3 font-bold text-[#111] no-underline"
            >
              Volver al pilar
            </a>
          </aside>
        </section>

        <section className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-3xl font-bold">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </h2>

          <div className="flex flex-wrap gap-3">
            <a
              href={`/eventos/${city}`}
              className="rounded-full border border-[#ddd] bg-white px-4 py-3 font-bold text-[#111] no-underline"
            >
              Todos
            </a>
            <a
              href={`/eventos/${city}/${pillar}`}
              className={`rounded-full px-4 py-3 font-bold no-underline ${
                pillar === "deportivos"
                  ? "bg-[#e9f2ff] text-[#1565c0]"
                  : "bg-[#ffe8f1] text-[#d81b60]"
              }`}
            >
              {pillarLabel}
            </a>
            <span className="rounded-full bg-[#111] px-4 py-3 font-bold text-white">
              {categoryLabel}
            </span>
          </div>
        </section>

        {filtered.length === 0 ? (
          <section className="rounded-[24px] border border-[#eee] bg-white p-10 text-center">
            <h3 className="mt-0 text-3xl font-bold">
              No hay eventos en esta categoría
            </h3>
            <p className="mt-3 text-[#666]">
              Todavía no hemos añadido eventos de {categoryLabel.toLowerCase()} en {city}.
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
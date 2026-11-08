import Link from "next/link";
import { buildEventUrl } from "@/lib/event-urls";

export type EventCardData = {
  title: string;
  slug: string;
  city: string;
  citySlug: string;
  countrySlug?: string;
  pillar: string;
  pillarSlug: string;
  category: string;
  categorySlug: string;
  date: string;
  endDate?: string;
  place: string;
  isFree: boolean;
  priceLabel: string;
  image: string;
  imageAlt: string;
};

function formatEventDate(date?: string) {
  if (!date || typeof date !== "string") {
    return "Consultar disponibilidad";
  }

  const normalized = date.trim();

  // Acepta fechas YYYY-MM-DD y fechas ISO con hora.
  const match = normalized.match(/^(\\d{4})-(\\d{2})-(\\d{2})(?:$|T|\\s)/);

  if (!match) {
    return "Consultar disponibilidad";
  }

  const [, year, month, day] = match;

  // Mediodía local para evitar desplazamientos de día por zona horaria.
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    12
  );

  // Comprueba también fechas imposibles, como 2026-02-30.
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day)
  ) {
    return "Consultar disponibilidad";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
    .format(parsed)
    .replace(".", "");
}

function formatEventDateRange(date?: string, endDate?: string) {
  const start = formatEventDate(date);

  if (!endDate || endDate === date) {
    return start;
  }

  return `${start} – ${formatEventDate(endDate)}`;
}

export default function EventCard({
  event,
}: {
  event: EventCardData;
}) {
  return (
    <Link
      href={buildEventUrl({
        countrySlug: event.countrySlug,
        citySlug: event.citySlug,
        pillarSlug: event.pillarSlug,
        categorySlug: event.categorySlug,
        slug: event.slug,
      })}
      className="block overflow-hidden rounded-[24px] border border-[#eee] bg-white text-[#111] no-underline shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition hover:translate-y-[-2px]"
    >
      <img
        src={
          event.image ||
          "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop"
        }
        alt={event.imageAlt || event.title}
        className="block h-[220px] w-full object-cover"
      />

      <div className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span
            className={`rounded-full px-3 py-2 text-[12px] font-bold ${
              event.pillar === "Deportivos"
                ? "bg-[#eef6ff] text-[#1565c0]"
                : "bg-[#fff0f6] text-[#d81b60]"
            }`}
          >
            {event.pillar}
          </span>

          <span
            className={`rounded-full px-3 py-2 text-[12px] font-bold ${
              event.isFree
                ? "bg-[#eaf8ee] text-[#1b8f3a]"
                : "bg-[#f5f5f5] text-[#111]"
            }`}
          >
            {event.priceLabel}
          </span>
        </div>

        <h3 className="mb-2 text-[24px] font-extrabold leading-[1.1] tracking-[-0.5px]">
          {event.title}
        </h3>

        <p className="mb-1 text-[15px] text-[#666]">
          <strong className="text-[#222]">Ciudad:</strong>{" "}
          {event.city || "Por confirmar"}
        </p>

        <p className="mb-1 text-[15px] text-[#666]">
          <strong className="text-[#222]">Categoría:</strong>{" "}
          {event.category}
        </p>

        <p className="mb-1 text-[15px] text-[#666]">
          <strong className="text-[#222]">Fecha:</strong>{" "}
          {formatEventDateRange(event.date, event.endDate)}
        </p>

        <p className="mb-4 text-[15px] text-[#666]">
          <strong className="text-[#222]">Lugar:</strong>{" "}
          {event.place || "Por confirmar"}
        </p>

        <div className="inline-flex rounded-[14px] bg-[#111] px-4 py-3 text-sm font-bold text-white">
          Ver evento
        </div>
      </div>
    </Link>
  );
}
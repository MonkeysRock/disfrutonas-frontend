"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/layout/SiteHeader";
import FiltersModal from "@/components/search/FiltersModal";
import { events } from "@/data/events";
import { normalizeText, searchLocations } from "@/lib/helpers";
import {
  addMonths,
  AppDateMode,
  dayStart,
  formatLongSpanishDate,
  formatShortSpanishDate,
  formatYmd,
  getMonthDays,
  getMonthLabel,
  getTodayYmd,
  getTomorrowYmd,
  isBeforeDay,
  isBetweenDays,
  parseYmd,
  sameDay,
  startOfMonth,
  useIsDesktop,
  useOutsideClick,
} from "@/lib/search-ui";

const localZoneSlug = "sevilla";

const mostSearchedEvents = [
  events.find((event) => event.slug === "concierto-de-vetusta-morla-2026-04-26"),
  events.find((event) => event.slug === "sevilla-fc-vs-real-betis-2026-04-20"),
  events.find((event) => event.slug === "festival-de-jazz-nocturno-2026-04-27"),
  events.find((event) => event.slug === "partido-de-euroliga-2026-05-02"),
  events.find((event) => event.slug === "monologo-de-comedia-2026-05-03"),
  events.find((event) => event.slug === "carrera-popular-10k-2026-05-05"),
].filter(Boolean);

const latestInYourZone = events
  .filter((event) => event.citySlug === localZoneSlug)
  .sort((a, b) => b.id - a.id)
  .slice(0, 6);

const featuredCategories = [
  {
    label: "Conciertos",
    emoji: "🎵",
    href: "/eventos/sevilla/culturales/conciertos",
  },
  {
    label: "Teatro",
    emoji: "🎭",
    href: "/eventos/sevilla/culturales/teatro",
  },
  {
    label: "Deportes",
    emoji: "⚽",
    href: "/eventos/sevilla/deportivos",
  },
  {
    label: "Festivales",
    emoji: "🎉",
    href: "/eventos/sevilla/culturales/festivales",
  },
];

const sportsCategories = Array.from(
  new Set(
    events
      .filter((event) => event.pillar === "Deportivos")
      .map((event) => event.category)
  )
).sort((a, b) => a.localeCompare(b, "es"));

const culturalCategories = Array.from(
  new Set(
    events
      .filter((event) => event.pillar === "Culturales")
      .map((event) => event.category)
  )
).sort((a, b) => a.localeCompare(b, "es"));

const paidEventPrices = events
  .filter((event) => !event.isFree && typeof event.priceFrom === "number")
  .map((event) => event.priceFrom);

const minEventPrice = paidEventPrices.length ? Math.min(...paidEventPrices) : 0;
const maxEventPrice = paidEventPrices.length ? Math.max(...paidEventPrices) : 1000;

type HomeEventCardProps = {
  event: (typeof events)[number];
};

function HomeEventCard({ event }: HomeEventCardProps) {
  return (
    <Link
      href={`/eventos/${event.citySlug}/${event.pillarSlug}/${event.categorySlug}/${event.slug}`}
      className="block min-w-[280px] max-w-[280px] snap-start text-[#111] no-underline sm:min-w-[320px] sm:max-w-[320px] lg:min-w-[340px] lg:max-w-[340px]"
    >
      <article className="group">
        <div className="relative overflow-hidden rounded-[24px]">
          <img
            src={event.image}
            alt={event.imageAlt}
            className="block h-[220px] w-full rounded-[24px] object-cover transition duration-300 group-hover:scale-[1.03] sm:h-[240px]"
          />

          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-2 text-[12px] font-bold backdrop-blur-sm ${
                event.pillar === "Deportivos"
                  ? "bg-white/90 text-[#1565c0]"
                  : "bg-white/90 text-[#d81b60]"
              }`}
            >
              {event.pillar}
            </span>

            <span
              className={`rounded-full px-3 py-2 text-[12px] font-bold backdrop-blur-sm ${
                event.isFree
                  ? "bg-[#eaf8ee]/95 text-[#1b8f3a]"
                  : "bg-white/90 text-[#111]"
              }`}
            >
              {event.priceLabel}
            </span>
          </div>
        </div>

        <div className="px-1 pb-1 pt-4">
          <h3 className="mb-2 line-clamp-2 text-[22px] font-extrabold leading-[1.1] tracking-[-0.4px]">
            {event.title}
          </h3>

          <p className="mb-1 text-[15px] text-[#555]">
            <strong className="font-semibold text-[#222]">Localización:</strong>{" "}
            {event.city}
          </p>

          <p className="mb-1 text-[15px] text-[#555]">
            <strong className="font-semibold text-[#222]">Fecha:</strong>{" "}
            {event.date}
          </p>

          <p className="line-clamp-1 text-[15px] text-[#555]">
            <strong className="font-semibold text-[#222]">Lugar:</strong>{" "}
            {event.place}
          </p>
        </div>
      </article>
    </Link>
  );
}

function HorizontalEventRow({
  children,
}: {
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  function scrollByAmount(direction: "left" | "right") {
    if (!scrollRef.current) return;

    scrollRef.current.scrollBy({
      left: direction === "left" ? -360 : 360,
      behavior: "smooth",
    });
  }

  return (
    <div className="relative">
      <div className="absolute right-0 top-[-62px] z-10 hidden items-center gap-2 lg:flex">
        <button
          type="button"
          onClick={() => scrollByAmount("left")}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e7e7e7] bg-white text-[20px] font-bold text-[#111] shadow-sm transition hover:scale-[1.03] hover:shadow-md"
          aria-label="Desplazar a la izquierda"
        >
          ←
        </button>

        <button
          type="button"
          onClick={() => scrollByAmount("right")}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e7e7e7] bg-white text-[20px] font-bold text-[#111] shadow-sm transition hover:scale-[1.03] hover:shadow-md"
          aria-label="Desplazar a la derecha"
        >
          →
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const isDesktop = useIsDesktop();

  const [locationInput, setLocationInput] = useState("");
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const [selectedDateMode, setSelectedDateMode] = useState<AppDateMode>("none");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [monthCursor, setMonthCursor] = useState(startOfMonth(new Date()));

  const [showFilters, setShowFilters] = useState(false);
  const [selectedPillar, setSelectedPillar] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [onlyFree, setOnlyFree] = useState(false);
  const [priceMin, setPriceMin] = useState(minEventPrice);
  const [priceMax, setPriceMax] = useState(maxEventPrice);

  const suggestions = useMemo(() => {
    return searchLocations(locationInput, 8);
  }, [locationInput]);

  const exactMatch = useMemo(() => {
    const normalizedInput = normalizeText(locationInput);
    return suggestions.find(
      (item) => normalizeText(item.name) === normalizedInput
    );
  }, [locationInput, suggestions]);

  const activeFiltersCount =
    (selectedPillar ? 1 : 0) +
    selectedCategories.length +
    (onlyFree ? 1 : 0) +
    (!onlyFree && (priceMin !== minEventPrice || priceMax !== maxEventPrice)
      ? 1
      : 0);

  function handleSelectLocation(name: string) {
    setLocationInput(name);
    setShowLocationSuggestions(false);
  }

  function handleSearch() {
    setShowCalendar(false);
    setShowLocationSuggestions(false);

    const params = new URLSearchParams();

    if (selectedDateMode === "hoy") {
      params.set("fecha", "hoy");
    } else if (selectedDateMode === "manana") {
      params.set("fecha", "manana");
    } else if (selectedDateMode === "calendario") {
      if (dateFrom) params.set("fechaDesde", dateFrom);
      if (dateTo) {
        params.set("fechaHasta", dateTo);
      } else if (dateFrom) {
        params.set("fechaHasta", dateFrom);
      }
    }

    if (exactMatch) {
      params.set("ubicacion", exactMatch.slug);
      params.set("ubicacionNombre", exactMatch.name);
    } else if (locationInput.trim()) {
      params.set("ubicacionNombre", locationInput.trim());
    }

    if (selectedPillar) {
      params.set("pillar", selectedPillar);
    }

    if (selectedCategories.length > 0) {
      params.set("categorias", selectedCategories.join(","));
    }

    if (onlyFree) {
      params.set("gratis", "1");
    } else {
      if (priceMin !== minEventPrice) {
        params.set("precioMin", String(priceMin));
      }
      if (priceMax !== maxEventPrice) {
        params.set("precioMax", String(priceMax));
      }
    }

    const query = params.toString();
    router.push(query ? `/eventos?${query}` : "/eventos");
  }

  function applyFilters() {
    const params = new URLSearchParams();

    if (selectedDateMode === "hoy") {
      params.set("fecha", "hoy");
    } else if (selectedDateMode === "manana") {
      params.set("fecha", "manana");
    } else if (selectedDateMode === "calendario") {
      if (dateFrom) params.set("fechaDesde", dateFrom);
      if (dateTo) {
        params.set("fechaHasta", dateTo);
      } else if (dateFrom) {
        params.set("fechaHasta", dateFrom);
      }
    }

    if (exactMatch) {
      params.set("ubicacion", exactMatch.slug);
      params.set("ubicacionNombre", exactMatch.name);
    } else if (locationInput.trim()) {
      params.set("ubicacionNombre", locationInput.trim());
    }

    if (selectedPillar) {
      params.set("pillar", selectedPillar);
    }

    if (selectedCategories.length > 0) {
      params.set("categorias", selectedCategories.join(","));
    }

    if (onlyFree) {
      params.set("gratis", "1");
    } else {
      if (priceMin !== minEventPrice) {
        params.set("precioMin", String(priceMin));
      }
      if (priceMax !== maxEventPrice) {
        params.set("precioMax", String(priceMax));
      }
    }

    setShowFilters(false);

    const query = params.toString();
    router.push(query ? `/eventos?${query}` : "/eventos");
  }

  function resetFilters() {
    setSelectedPillar("");
    setSelectedCategories([]);
    setOnlyFree(false);
    setPriceMin(minEventPrice);
    setPriceMax(maxEventPrice);
  }

  return (
    <main className="min-h-screen bg-white text-[#111]">
      <SiteHeader
        locationInput={locationInput}
        setLocationInput={setLocationInput}
        showLocationSuggestions={showLocationSuggestions}
        setShowLocationSuggestions={setShowLocationSuggestions}
        showCalendar={showCalendar}
        setShowCalendar={setShowCalendar}
        suggestions={suggestions}
        handleSelectLocation={handleSelectLocation}
        selectedDateMode={selectedDateMode}
        setSelectedDateMode={setSelectedDateMode}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        monthCursor={monthCursor}
        setMonthCursor={setMonthCursor}
        handleSearch={handleSearch}
        formatShortSpanishDate={formatShortSpanishDate}
        formatLongSpanishDate={formatLongSpanishDate}
        formatYmd={formatYmd}
        parseYmd={parseYmd}
        sameDay={sameDay}
        isBeforeDay={isBeforeDay}
        isBetweenDays={isBetweenDays}
        dayStart={dayStart}
        getTodayYmd={getTodayYmd}
        getTomorrowYmd={getTomorrowYmd}
        getMonthDays={getMonthDays}
        getMonthLabel={getMonthLabel}
        addMonths={addMonths}
        useOutsideClick={useOutsideClick}
        compact={isDesktop}
        sticky
        showFiltersButton
        onOpenFilters={() => setShowFilters(true)}
        filtersCount={activeFiltersCount}
      />

      <FiltersModal
        open={showFilters}
        onClose={() => setShowFilters(false)}
        selectedPillar={selectedPillar}
        setSelectedPillar={setSelectedPillar}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        onlyFree={onlyFree}
        setOnlyFree={setOnlyFree}
        priceMin={priceMin}
        setPriceMin={setPriceMin}
        priceMax={priceMax}
        setPriceMax={setPriceMax}
        onApply={applyFilters}
        onReset={resetFilters}
        resultsCount={events.length}
        sportsCategories={sportsCategories}
        culturalCategories={culturalCategories}
        minEventPrice={minEventPrice}
        maxEventPrice={maxEventPrice}
        useOutsideClick={useOutsideClick}
      />

      <section className="mx-auto max-w-[1440px] px-4 pb-14 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <section className="mb-14">
          <div className="mx-auto max-w-[980px] text-center">
            <div className="mb-4 inline-block rounded-full bg-[#ffe5ef] px-4 py-2 text-sm font-bold text-[#e91e63]">
              Encuentra planes en tu ciudad o pueblo
            </div>

            <h1 className="mx-auto mb-4 max-w-[920px] text-[42px] font-extrabold leading-[0.96] tracking-[-1.4px] sm:text-[56px] lg:text-[72px]">
              Descubre conciertos, teatro, deporte y mucho más
            </h1>

            <p className="mx-auto max-w-[760px] text-[18px] leading-8 text-[#666] sm:text-[19px]">
              Busca qué hacer hoy, mañana o en tu próxima escapada. Disfrutonas
              te enseña eventos de forma rápida, clara y directa.
            </p>
          </div>
        </section>

        <section className="mb-14">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div>
              <h2 className="mb-2 mt-0 text-[30px] font-extrabold tracking-[-0.8px] sm:text-[38px]">
                Eventos más buscados
              </h2>
              <p className="m-0 text-[17px] text-[#666] sm:text-[18px]">
                Una selección de los planes que más interés están generando ahora mismo.
              </p>
            </div>

            <Link href="/eventos" className="font-bold text-[#111] no-underline">
              Ver todos →
            </Link>
          </div>

          <HorizontalEventRow>
            {mostSearchedEvents.map((event) => {
              if (!event) return null;
              return <HomeEventCard key={event.slug} event={event} />;
            })}
          </HorizontalEventRow>
        </section>

        <section className="mb-14">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div>
              <h2 className="mb-2 mt-0 text-[30px] font-extrabold tracking-[-0.8px] sm:text-[38px]">
                Últimas subidas en tu zona
              </h2>
              <p className="m-0 text-[17px] text-[#666] sm:text-[18px]">
                Novedades recientes en Sevilla para que no se te escape nada.
              </p>
            </div>

            <Link
              href="/eventos/sevilla"
              className="font-bold text-[#111] no-underline"
            >
              Ver Sevilla →
            </Link>
          </div>

          <HorizontalEventRow>
            {latestInYourZone.map((event) => (
              <HomeEventCard key={event.slug} event={event} />
            ))}
          </HorizontalEventRow>
        </section>

        <section className="mb-14">
          <div className="mb-5">
            <h2 className="mb-2 mt-0 text-[30px] font-extrabold tracking-[-0.8px] sm:text-[38px]">
              Explora por categorías
            </h2>
            <p className="m-0 text-[17px] text-[#666] sm:text-[18px]">
              Accede rápido a los tipos de plan más buscados.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {featuredCategories.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-[22px] border border-[#eee] bg-white p-5 text-[#111] no-underline shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition hover:translate-y-[-2px]"
              >
                <div className="mb-3 text-[28px]">{item.emoji}</div>
                <div className="text-[20px] font-bold">{item.label}</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 rounded-[28px] border border-[#eee] bg-white p-6 shadow-[0_10px_24px_rgba(0,0,0,0.04)] sm:p-[30px] lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="mb-2 text-[14px] font-bold uppercase tracking-[0.08em] text-[#999]">
              Disfrutonas
            </div>

            <h2 className="mb-[10px] mt-0 text-[32px] font-extrabold tracking-[-0.8px] sm:text-[38px]">
              Descubre planes que merecen la pena
            </h2>

            <p className="m-0 max-w-[780px] text-[17px] leading-8 text-[#666] sm:text-[18px]">
              Conciertos, festivales, teatro, deporte y eventos culturales en
              las ciudades y pueblos que más se mueven.
            </p>
          </div>

          <Link
            href="/eventos"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-[16px] bg-[#111] px-6 py-4 font-extrabold text-white no-underline"
          >
            Explorar eventos
          </Link>
        </section>
      </section>
    </main>
  );
}
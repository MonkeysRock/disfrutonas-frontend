"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "@/components/layout/SiteHeader";
import type { AppDateMode } from "@/components/search/SearchHeader";
import FiltersModal from "@/components/search/FiltersModal";
import { normalizeText, searchLocations } from "@/lib/helpers";
import { supabase } from "@/lib/supabase";
import {
  addMonths,
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
  matchesDateRange,
  parseYmd,
  sameDay,
  startOfMonth,
  useIsDesktop,
  useOutsideClick,
} from "@/lib/search-ui";

type AppEvent = {
  title: string;
  slug: string;
  city: string;
  citySlug: string;
  pillar: string;
  pillarSlug: string;
  category: string;
  categorySlug: string;
  eventDate: string;
  date: string;
  time: string;
  place: string;
  description: string;
  isFree: boolean;
  price?: number;
  priceLabel: string;
  image: string;
  imageAlt: string;
  imageLabel: string;
  imageSubLabel: string;
  lat?: number;
  lng?: number;
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

function mapSupabaseEvent(event: SupabaseEvent): AppEvent {
  const isFree = Boolean(event.is_free);
  const price = typeof event.price === "number" ? event.price : undefined;

  return {
    title: event.title || "Evento sin título",
    slug: event.slug || event.id,
    city: event.city || "",
    citySlug: event.city_slug || "",
    pillar: event.pillar || "Culturales",
    pillarSlug: event.pillar_slug || "culturales",
    category: event.category || "General",
    categorySlug: event.category_slug || "general",
    eventDate: event.event_date || "",
    date: event.date || event.event_date || "",
    time: event.time || "",
    place: event.place || "",
    description: event.description || "",
    isFree,
    price,
    priceLabel: event.price_label || (isFree ? "Gratis" : price ? `Desde ${price}€` : "Consultar precio"),
    image:
      event.image ||
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop",
    imageAlt: event.image_alt || event.title || "Evento",
    imageLabel: event.image_label || event.title || "Evento",
    imageSubLabel: event.image_sub_label || event.city || "",
    lat: typeof event.lat === "number" ? event.lat : undefined,
    lng: typeof event.lng === "number" ? event.lng : undefined,
  };
}

function resolveModeFromParams(
  fecha: string | null,
  fechaDesde: string | null,
  fechaHasta: string | null
): AppDateMode {
  if (fecha === "hoy") return "hoy";
  if (fecha === "manana") return "manana";
  if (fechaDesde || fechaHasta) return "calendario";
  return "none";
}

function EventResultCard({ event }: { event: AppEvent }) {
  return (
    <Link
      href={`/eventos/${event.citySlug}/${event.pillarSlug}/${event.categorySlug}/${event.slug}`}
      className="block overflow-hidden rounded-[24px] border border-[#eee] bg-white text-[#111] no-underline shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition hover:translate-y-[-2px]"
    >
      <img src={event.image} alt={event.imageAlt} className="block h-[220px] w-full object-cover" />

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
              event.isFree ? "bg-[#eaf8ee] text-[#1b8f3a]" : "bg-[#f5f5f5] text-[#111]"
            }`}
          >
            {event.priceLabel}
          </span>
        </div>

        <h3 className="mb-2 text-[24px] font-extrabold leading-[1.1] tracking-[-0.5px]">
          {event.title}
        </h3>

        <p className="mb-1 text-[15px] text-[#666]">
          <strong className="text-[#222]">Ciudad:</strong> {event.city || "Por confirmar"}
        </p>

        <p className="mb-1 text-[15px] text-[#666]">
          <strong className="text-[#222]">Categoría:</strong> {event.category}
        </p>

        <p className="mb-1 text-[15px] text-[#666]">
          <strong className="text-[#222]">Fecha:</strong> {event.date || "Próximamente"}
        </p>

        <p className="mb-4 text-[15px] text-[#666]">
          <strong className="text-[#222]">Lugar:</strong> {event.place || "Por confirmar"}
        </p>

        <div className="inline-flex rounded-[14px] bg-[#111] px-4 py-3 text-sm font-bold text-white">
          Ver evento
        </div>
      </div>
    </Link>
  );
}

function EventsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDesktop = useIsDesktop();

  const [events, setEvents] = useState<AppEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

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

  const paidEventPrices = useMemo(
    () =>
      events
        .filter((event) => !event.isFree && typeof event.price === "number")
        .map((event) => event.price as number),
    [events]
  );

  const minEventPrice = paidEventPrices.length ? Math.min(...paidEventPrices) : 0;
  const maxEventPrice = paidEventPrices.length ? Math.max(...paidEventPrices) : 1000;

  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(1000);

  useEffect(() => {
    async function loadEvents() {
      setIsLoadingEvents(true);
      setSupabaseError(null);

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("SUPABASE DATA:", data);
      console.log("SUPABASE ERROR:", error);

      if (error) {
        setSupabaseError(error.message);
        setEvents([]);
        setIsLoadingEvents(false);
        return;
      }

      const mappedEvents = (data || []).map((event) =>
        mapSupabaseEvent(event as SupabaseEvent)
      );

      setEvents(mappedEvents);
      setIsLoadingEvents(false);
    }

    loadEvents();
  }, []);

  useEffect(() => {
    setPriceMin(minEventPrice);
    setPriceMax(maxEventPrice);
  }, [minEventPrice, maxEventPrice]);

  const sportsCategories = useMemo(
    () =>
      Array.from(
        new Set(
          events
            .filter((event) => event.pillar === "Deportivos")
            .map((event) => event.category)
        )
      ).sort((a, b) => a.localeCompare(b, "es")),
    [events]
  );

  const culturalCategories = useMemo(
    () =>
      Array.from(
        new Set(
          events
            .filter((event) => event.pillar === "Culturales")
            .map((event) => event.category)
        )
      ).sort((a, b) => a.localeCompare(b, "es")),
    [events]
  );

  useEffect(() => {
    const fecha = searchParams.get("fecha");
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const ubicacion = searchParams.get("ubicacion") || "";
    const ubicacionNombre = searchParams.get("ubicacionNombre") || "";

    const pillarParam = searchParams.get("pillar") || "";
    const categoriesParam = searchParams.get("categorias") || "";
    const gratisParam = searchParams.get("gratis") === "1";
    const precioMinParam = searchParams.get("precioMin");
    const precioMaxParam = searchParams.get("precioMax");

    setSelectedDateMode(resolveModeFromParams(fecha, fechaDesde, fechaHasta));

    if (fecha === "hoy") {
      const today = getTodayYmd();
      setDateFrom(today);
      setDateTo(today);
      setMonthCursor(startOfMonth(parseYmd(today)));
    } else if (fecha === "manana") {
      const tomorrow = getTomorrowYmd();
      setDateFrom(tomorrow);
      setDateTo(tomorrow);
      setMonthCursor(startOfMonth(parseYmd(tomorrow)));
    } else {
      setDateFrom(fechaDesde || "");
      setDateTo(fechaHasta || "");
      setMonthCursor(
        fechaDesde ? startOfMonth(parseYmd(fechaDesde)) : startOfMonth(new Date())
      );
    }

    setSelectedPillar(pillarParam);
    setSelectedCategories(
      categoriesParam ? categoriesParam.split(",").filter(Boolean) : []
    );
    setOnlyFree(gratisParam);

    if (precioMinParam) setPriceMin(Number(precioMinParam));
    if (precioMaxParam) setPriceMax(Number(precioMaxParam));

    if (ubicacionNombre) {
      setLocationInput(ubicacionNombre);
      return;
    }

    if (ubicacion) {
      const allLocations = searchLocations("", 999);
      const found = allLocations.find((item) => item.slug === ubicacion);
      if (found) {
        setLocationInput(found.name);
        return;
      }
    }

    setLocationInput("");
  }, [searchParams]);

  const suggestions = useMemo(() => searchLocations(locationInput, 8), [locationInput]);

  const exactMatch = useMemo(() => {
    const normalizedInput = normalizeText(locationInput);
    return suggestions.find((item) => normalizeText(item.name) === normalizedInput);
  }, [locationInput, suggestions]);

  const filteredEvents = useMemo(() => {
    const ubicacionParam = searchParams.get("ubicacion");
    const normalizedInput = normalizeText(locationInput);

    return events.filter((event) => {
      const matchesLocationFromParam = ubicacionParam
        ? event.citySlug === ubicacionParam
        : true;

      const matchesLocationFromInput = locationInput
        ? normalizeText(event.city).includes(normalizedInput) ||
          normalizeText(event.place || "").includes(normalizedInput)
        : true;

      const matchesLocation = ubicacionParam
        ? matchesLocationFromParam
        : matchesLocationFromInput;

      const eventDateForFilter = event.eventDate || event.date || "";

      const matchesDates =
        selectedDateMode === "none"
          ? true
          : selectedDateMode === "hoy"
          ? matchesDateRange(eventDateForFilter, getTodayYmd(), getTodayYmd())
          : selectedDateMode === "manana"
          ? matchesDateRange(eventDateForFilter, getTomorrowYmd(), getTomorrowYmd())
          : matchesDateRange(eventDateForFilter, dateFrom, dateTo || dateFrom);

      const matchesPillar = selectedPillar ? event.pillar === selectedPillar : true;

      const matchesCategory =
        selectedCategories.length > 0
          ? selectedCategories.includes(event.category)
          : true;

      const matchesFree = onlyFree ? event.isFree : true;

      const matchesPrice = onlyFree
        ? true
        : event.isFree
        ? true
        : typeof event.price === "number"
        ? event.price >= priceMin && event.price <= priceMax
        : true;

      return (
        matchesLocation &&
        matchesDates &&
        matchesPillar &&
        matchesCategory &&
        matchesFree &&
        matchesPrice
      );
    });
  }, [
    events,
    searchParams,
    locationInput,
    selectedDateMode,
    dateFrom,
    dateTo,
    selectedPillar,
    selectedCategories,
    onlyFree,
    priceMin,
    priceMax,
  ]);

  function buildSearchParams(includeLocation = true) {
    const params = new URLSearchParams();

    if (selectedDateMode === "hoy") {
      params.set("fecha", "hoy");
    } else if (selectedDateMode === "manana") {
      params.set("fecha", "manana");
    } else if (selectedDateMode === "calendario") {
      if (dateFrom) params.set("fechaDesde", dateFrom);
      if (dateTo) params.set("fechaHasta", dateTo);
      else if (dateFrom) params.set("fechaHasta", dateFrom);
    }

    if (includeLocation) {
      if (exactMatch) {
        params.set("ubicacion", exactMatch.slug);
        params.set("ubicacionNombre", exactMatch.name);
      } else if (locationInput.trim()) {
        params.set("ubicacionNombre", locationInput.trim());
      }
    }

    if (selectedPillar) params.set("pillar", selectedPillar);
    if (selectedCategories.length > 0) params.set("categorias", selectedCategories.join(","));
    if (onlyFree) params.set("gratis", "1");

    if (!onlyFree) {
      if (priceMin !== minEventPrice) params.set("precioMin", String(priceMin));
      if (priceMax !== maxEventPrice) params.set("precioMax", String(priceMax));
    }

    return params;
  }

  function handleSelectLocation(name: string) {
    setLocationInput(name);
    setShowLocationSuggestions(false);
  }

  function handleSearch() {
    setShowCalendar(false);
    setShowLocationSuggestions(false);

    const params = buildSearchParams(true);
    const query = params.toString();
    router.push(query ? `/eventos?${query}` : "/eventos");
  }

  function applyFilters() {
    const params = buildSearchParams(true);
    const query = params.toString();
    setShowFilters(false);
    router.push(query ? `/eventos?${query}` : "/eventos");
  }

  function resetFilters() {
    setSelectedPillar("");
    setSelectedCategories([]);
    setOnlyFree(false);
    setPriceMin(minEventPrice);
    setPriceMax(maxEventPrice);
  }

  function clearAllFilters() {
    setLocationInput("");
    setSelectedDateMode("none");
    setDateFrom("");
    setDateTo("");
    setSelectedPillar("");
    setSelectedCategories([]);
    setOnlyFree(false);
    setPriceMin(minEventPrice);
    setPriceMax(maxEventPrice);
    setShowCalendar(false);
    setShowLocationSuggestions(false);
    setShowFilters(false);
    router.push("/eventos");
  }

  const activeDateLabel =
    selectedDateMode === "hoy"
      ? "Hoy"
      : selectedDateMode === "manana"
      ? "Mañana"
      : dateFrom
      ? dateTo && dateTo !== dateFrom
        ? `${formatShortSpanishDate(parseYmd(dateFrom))} - ${formatShortSpanishDate(parseYmd(dateTo))}`
        : formatShortSpanishDate(parseYmd(dateFrom))
      : "";

  const activeFiltersCount =
    (selectedPillar ? 1 : 0) +
    selectedCategories.length +
    (onlyFree ? 1 : 0) +
    (!onlyFree && (priceMin !== minEventPrice || priceMax !== maxEventPrice) ? 1 : 0);

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
        resultsCount={filteredEvents.length}
        sportsCategories={sportsCategories}
        culturalCategories={culturalCategories}
        minEventPrice={minEventPrice}
        maxEventPrice={maxEventPrice}
        useOutsideClick={useOutsideClick}
      />

      <section className="mx-auto max-w-[1440px] px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {locationInput && (
            <span className="rounded-full bg-[#f5f5f5] px-4 py-2 text-sm font-semibold text-[#111]">
              📍 {locationInput}
            </span>
          )}

          {activeDateLabel && (
            <span className="rounded-full bg-[#f5f5f5] px-4 py-2 text-sm font-semibold text-[#111]">
              📅 {activeDateLabel}
            </span>
          )}

          {selectedPillar && (
            <span className="rounded-full bg-[#f5f5f5] px-4 py-2 text-sm font-semibold text-[#111]">
              {selectedPillar}
            </span>
          )}

          {selectedCategories.map((category) => (
            <span key={category} className="rounded-full bg-[#f5f5f5] px-4 py-2 text-sm font-semibold text-[#111]">
              {category}
            </span>
          ))}

          {onlyFree && (
            <span className="rounded-full bg-[#f5f5f5] px-4 py-2 text-sm font-semibold text-[#111]">
              Gratis
            </span>
          )}

          {(locationInput ||
            activeDateLabel ||
            selectedPillar ||
            selectedCategories.length > 0 ||
            onlyFree ||
            priceMin !== minEventPrice ||
            priceMax !== maxEventPrice) && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="rounded-full border border-[#e7e7e7] px-4 py-2 text-sm font-semibold text-[#111] transition hover:bg-[#fafafa]"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="mb-8">
          <h1 className="mb-2 text-[34px] font-extrabold tracking-[-0.8px] sm:text-[44px]">
            {isLoadingEvents
              ? "Cargando eventos..."
              : `${filteredEvents.length} evento${filteredEvents.length === 1 ? "" : "s"} encontrados`}
          </h1>

          <p className="m-0 text-[17px] text-[#666] sm:text-[18px]">
            Resultados cargados desde Supabase.
          </p>

          {supabaseError && (
            <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              Error Supabase: {supabaseError}
            </p>
          )}
        </div>

        {!isLoadingEvents && filteredEvents.length === 0 ? (
          <section className="rounded-[28px] border border-[#eee] bg-white p-8 shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
            <h2 className="mb-3 text-[28px] font-extrabold tracking-[-0.6px]">
              No hay eventos cargados desde Supabase
            </h2>
            <p className="mb-5 max-w-[760px] text-[17px] leading-8 text-[#666]">
              Ahora mismo la web no está usando los eventos de prueba. Si ves esto en producción,
              significa que Supabase está devolviendo 0 filas o hay un problema de conexión.
            </p>

            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex rounded-[16px] bg-[#111] px-5 py-3 font-bold text-white"
            >
              Limpiar filtros
            </button>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredEvents.map((event) => (
              <EventResultCard key={`${event.citySlug}-${event.slug}`} event={event} />
            ))}
          </section>
        )}
      </section>
    </main>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={null}>
      <EventsPageContent />
    </Suspense>
  );
}
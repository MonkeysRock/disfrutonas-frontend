"use client";

import { useMemo, useState } from "react";
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

type EventDetailHeaderProps = {
  initialLocationName?: string;
};

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
  .filter((event) => !event.isFree && typeof event.price === "number")
  .map((event) => event.price);

const minEventPrice = paidEventPrices.length ? Math.min(...paidEventPrices) : 0;
const maxEventPrice = paidEventPrices.length ? Math.max(...paidEventPrices) : 100;

export default function EventDetailHeader({
  initialLocationName = "",
}: EventDetailHeaderProps) {
  const router = useRouter();
  const isDesktop = useIsDesktop();

  const [locationInput, setLocationInput] = useState(initialLocationName);
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

  function buildSearchParams() {
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

    return params;
  }

  function handleSelectLocation(name: string) {
    setLocationInput(name);
    setShowLocationSuggestions(false);
  }

  function handleSearch() {
    setShowCalendar(false);
    setShowLocationSuggestions(false);

    const params = buildSearchParams();
    const query = params.toString();
    router.push(query ? `/eventos?${query}` : "/eventos");
  }

  function applyFilters() {
    const params = buildSearchParams();
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

  return (
    <>
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
    </>
  );
}
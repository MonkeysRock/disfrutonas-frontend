"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import SiteHeader from "@/components/layout/SiteHeader";
import type { AppDateMode } from "@/components/search/SearchHeader";
import { searchLocations } from "@/lib/helpers";

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
  parseYmd,
  sameDay,
  useOutsideClick,
} from "@/lib/search-ui";

export default function EventsHeader() {
  const router = useRouter();

  const [locationInput, setLocationInput] = useState("");
  const [showLocationSuggestions, setShowLocationSuggestions] =
    useState(false);

  const [showCalendar, setShowCalendar] = useState(false);

  const [selectedDateMode, setSelectedDateMode] =
    useState<AppDateMode>("none");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [monthCursor, setMonthCursor] = useState(new Date());

  const suggestions = useMemo(
    () => searchLocations(locationInput).slice(0, 8),
    [locationInput]
  );

  function handleSelectLocation(name: string) {
    setLocationInput(name);
    setShowLocationSuggestions(false);
  }

  function handleSearch() {
    const location = locationInput.trim();

    if (!location) {
      router.push("/eventos");
      return;
    }

    const match = searchLocations(location).find(
      (item) => item.name.toLowerCase() === location.toLowerCase()
    );

    if (match) {
      router.push(`/eventos/${match.slug}`);
      return;
    }

    router.push(
      `/eventos?ubicacionNombre=${encodeURIComponent(location)}`
    );
  }

  return (
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
      showFiltersButton={false}
      filtersCount={0}
    />
  );
}
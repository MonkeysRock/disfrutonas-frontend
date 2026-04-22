"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SearchHeader from "./SearchHeader";
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
  startOfMonth,
  useOutsideClick,
} from "@/lib/search-ui";
import { normalizeText, searchLocations } from "@/lib/helpers";

export default function DetailPageHeader() {
  const router = useRouter();

  const [locationInput, setLocationInput] = useState("");
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const [selectedDateMode, setSelectedDateMode] = useState<
    "none" | "hoy" | "manana" | "calendario"
  >("none");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [monthCursor, setMonthCursor] = useState(startOfMonth(new Date()));

  const suggestions = useMemo(() => {
    return searchLocations(locationInput, 8);
  }, [locationInput]);

  const exactMatch = useMemo(() => {
    const normalizedInput = normalizeText(locationInput);
    return suggestions.find(
      (item) => normalizeText(item.name) === normalizedInput
    );
  }, [locationInput, suggestions]);

  function handleSelectLocation(name: string) {
    setLocationInput(name);
    setShowLocationSuggestions(false);
  }

  function handleSearch() {
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

    const query = params.toString();
    router.push(query ? `/eventos?${query}` : "/eventos");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#efefef] bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <Link
            href="/"
            className="shrink-0 text-[28px] font-extrabold text-[#e91e63] no-underline"
          >
            Disfrutonas
          </Link>

          <div className="flex justify-center">
            <SearchHeader
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
              compact
            />
          </div>
        </div>
      </div>
    </header>
  );
}
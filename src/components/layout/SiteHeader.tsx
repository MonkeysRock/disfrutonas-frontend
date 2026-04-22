"use client";

import Link from "next/link";
import SearchHeader, { AppDateMode } from "@/components/search/SearchHeader";
import { useIsDesktop, useScrolled } from "@/lib/search-ui";

type SiteHeaderProps = {
  locationInput: string;
  setLocationInput: React.Dispatch<React.SetStateAction<string>>;
  showLocationSuggestions: boolean;
  setShowLocationSuggestions: React.Dispatch<React.SetStateAction<boolean>>;
  showCalendar: boolean;
  setShowCalendar: React.Dispatch<React.SetStateAction<boolean>>;
  suggestions: Array<{
    name: string;
    slug: string;
    province: string;
    region: string;
  }>;
  handleSelectLocation: (name: string) => void;
  selectedDateMode: AppDateMode;
  setSelectedDateMode: React.Dispatch<React.SetStateAction<AppDateMode>>;
  dateFrom: string;
  setDateFrom: React.Dispatch<React.SetStateAction<string>>;
  dateTo: string;
  setDateTo: React.Dispatch<React.SetStateAction<string>>;
  monthCursor: Date;
  setMonthCursor: React.Dispatch<React.SetStateAction<Date>>;
  handleSearch: () => void;
  formatShortSpanishDate: (date: Date) => string;
  formatLongSpanishDate: (date: Date) => string;
  formatYmd: (date: Date) => string;
  parseYmd: (value: string) => Date;
  sameDay: (a: Date, b: Date) => boolean;
  isBeforeDay: (a: Date, b: Date) => boolean;
  isBetweenDays: (target: Date, start: Date, end: Date) => boolean;
  dayStart: (date: Date) => Date;
  getTodayYmd: () => string;
  getTomorrowYmd: () => string;
  getMonthDays: (monthDate: Date) => Array<{
    key: string;
    date: Date;
    currentMonth: boolean;
  }>;
  getMonthLabel: (date: Date) => string;
  addMonths: (date: Date, amount: number) => Date;
  useOutsideClick: <T extends HTMLElement>(
    ref: React.RefObject<T | null>,
    handler: () => void,
    ignoreRefs?: Array<React.RefObject<HTMLElement | null>>
  ) => void;
  compact?: boolean;
  sticky?: boolean;
  showFiltersButton?: boolean;
  onOpenFilters?: () => void;
  filtersCount?: number;
};

function LogoFlowerPower() {
  return (
    <Link
      href="/"
      className="relative z-10 shrink-0 text-[28px] font-extrabold tracking-[-0.6px] no-underline"
      aria-label="Ir a inicio"
    >
      <span className="text-[#e91e63]">Dis</span>
      <span className="text-[#f97316]">fru</span>
      <span className="text-[#eab308]">to</span>
      <span className="text-[#14b8a6]">nas</span>
    </Link>
  );
}

function CompactSearchPill({
  locationInput,
  dateFrom,
  dateTo,
  handleOpenSearch,
  filtersCount,
  onOpenFilters,
}: {
  locationInput: string;
  dateFrom: string;
  dateTo: string;
  handleOpenSearch: () => void;
  filtersCount: number;
  onOpenFilters?: () => void;
}) {
  const locationText = locationInput?.trim() ? locationInput.trim() : "Destino";
  const dateText =
    dateFrom && dateTo
      ? `${new Intl.DateTimeFormat("es-ES", {
          day: "numeric",
          month: "short",
        }).format(new Date(dateFrom))} - ${new Intl.DateTimeFormat("es-ES", {
          day: "numeric",
          month: "short",
        }).format(new Date(dateTo))}`
      : dateFrom
      ? new Intl.DateTimeFormat("es-ES", {
          day: "numeric",
          month: "short",
        }).format(new Date(dateFrom))
      : "Fechas";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleOpenSearch}
        className="flex h-[54px] items-center gap-3 rounded-full border border-[#dddddd] bg-white px-4 shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)]"
      >
        <span className="text-[15px] font-bold text-[#111]">{locationText}</span>
        <span className="h-4 w-px bg-[#e5e5e5]" />
        <span className="text-[15px] font-medium text-[#555]">{dateText}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111] text-white">
          ⌕
        </span>
      </button>

      {onOpenFilters && (
        <button
          type="button"
          onClick={onOpenFilters}
          className="relative inline-flex h-[54px] items-center gap-2 rounded-full border border-[#dddddd] bg-white px-5 text-[15px] font-bold text-[#111] shadow-[0_8px_20px_rgba(0,0,0,0.05)] transition hover:bg-[#fafafa] hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)]"
        >
          <span aria-hidden="true">⚙️</span>
          <span>Filtros</span>

          {filtersCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#111] px-1.5 text-[11px] font-extrabold text-white">
              {filtersCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

export default function SiteHeader({
  locationInput,
  setLocationInput,
  showLocationSuggestions,
  setShowLocationSuggestions,
  showCalendar,
  setShowCalendar,
  suggestions,
  handleSelectLocation,
  selectedDateMode,
  setSelectedDateMode,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  monthCursor,
  setMonthCursor,
  handleSearch,
  formatShortSpanishDate,
  formatLongSpanishDate,
  formatYmd,
  parseYmd,
  sameDay,
  isBeforeDay,
  isBetweenDays,
  dayStart,
  getTodayYmd,
  getTomorrowYmd,
  getMonthDays,
  getMonthLabel,
  addMonths,
  useOutsideClick,
  compact = true,
  sticky = true,
  showFiltersButton = false,
  onOpenFilters,
  filtersCount = 0,
}: SiteHeaderProps) {
  const isDesktop = useIsDesktop();
  const scrolled = useScrolled(36);

  const headerSearch = (
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
      compact={isDesktop ? compact : false}
    />
  );

  return (
    <header
      className={`z-50 border-b border-[#efefef] bg-white/92 backdrop-blur-md transition-all duration-300 ${
        sticky ? "sticky top-0" : ""
      } ${
        scrolled
          ? "shadow-[0_12px_32px_rgba(0,0,0,0.08)]"
          : "shadow-[0_3px_12px_rgba(0,0,0,0.03)]"
      }`}
    >
      <div
        className={`mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
          scrolled ? "py-3" : "py-5"
        }`}
      >
        {isDesktop ? (
          <div className="relative flex min-h-[78px] items-center justify-between gap-4">
            <LogoFlowerPower />

            <div className="hidden lg:block lg:w-[180px]" />

            <div className="absolute left-1/2 flex w-full max-w-[860px] -translate-x-1/2 items-center justify-center gap-3">
              {!scrolled ? (
                <>
                  <div className="min-w-0 flex-1">{headerSearch}</div>

                  {showFiltersButton && onOpenFilters && (
                    <button
                      type="button"
                      onClick={onOpenFilters}
                      className="relative inline-flex h-[54px] shrink-0 cursor-pointer items-center gap-2 rounded-full border border-[#dddddd] bg-white px-5 text-[15px] font-bold text-[#111] shadow-[0_8px_20px_rgba(0,0,0,0.05)] transition hover:bg-[#fafafa] hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)]"
                    >
                      <span aria-hidden="true">⚙️</span>
                      <span>Filtros</span>

                      {filtersCount > 0 && (
                        <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#111] px-1.5 text-[11px] font-extrabold text-white">
                          {filtersCount}
                        </span>
                      )}
                    </button>
                  )}
                </>
              ) : (
                <CompactSearchPill
                  locationInput={locationInput}
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  handleOpenSearch={() => {
                    if (typeof window !== "undefined") {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  filtersCount={filtersCount}
                  onOpenFilters={showFiltersButton ? onOpenFilters : undefined}
                />
              )}
            </div>

            <div className="w-[140px]" />
          </div>
        ) : (
          <div>
            <div className="flex min-h-[56px] items-center justify-between gap-4">
              <LogoFlowerPower />
            </div>

            <div className="mt-4">{headerSearch}</div>

            {showFiltersButton && onOpenFilters && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={onOpenFilters}
                  className="relative inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[#dddddd] bg-white px-6 py-4 text-[16px] font-bold text-[#111] transition hover:bg-[#fafafa]"
                >
                  <span aria-hidden="true">⚙️</span>
                  Filtros

                  {filtersCount > 0 && (
                    <span className="absolute right-4 top-1/2 flex h-6 min-w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[#111] px-1.5 text-[11px] font-extrabold text-white">
                      {filtersCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
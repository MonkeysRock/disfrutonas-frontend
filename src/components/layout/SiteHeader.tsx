"use client";

import Link from "next/link";
import { useState } from "react";
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
        className="flex h-[54px] items-center gap-3 rounded-full border border-[#dddddd] bg-white px-4 shadow-[0_8px_20px_rgba(0,0,0,0.06)]"
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
          className="relative inline-flex h-[54px] items-center gap-2 rounded-full border border-[#dddddd] bg-white px-5 text-[15px] font-bold text-[#111]"
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  function searchAndCloseMobile() {
    setMobileSearchOpen(false);
    handleSearch();
  }

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

  const mobileSheetSearch = (
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
      handleSearch={searchAndCloseMobile}
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
      compact={false}
    />
  );

  return (
    <>
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
                        className="relative inline-flex h-[54px] shrink-0 cursor-pointer items-center gap-2 rounded-full border border-[#dddddd] bg-white px-5 text-[15px] font-bold text-[#111] shadow-[0_8px_20px_rgba(0,0,0,0.05)] transition hover:bg-[#fafafa]"
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
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    filtersCount={filtersCount}
                    onOpenFilters={showFiltersButton ? onOpenFilters : undefined}
                  />
                )}
              </div>

              <div className="w-[140px]" />
            </div>
          ) : (
            <div className="pb-1">
              <div className="flex min-h-[54px] items-center justify-between">
                <LogoFlowerPower />
              </div>

              <button
                type="button"
                onClick={() => setMobileSearchOpen(true)}
                className="mt-4 flex h-[58px] w-full items-center justify-center gap-3 rounded-full border border-[#dddddd] bg-white px-5 text-[17px] font-extrabold text-[#111] shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
              >
                <span className="text-[20px]">⌕</span>
                <span>Localización del Evento</span>
              </button>

              {showFiltersButton && onOpenFilters && (
                <button
                  type="button"
                  onClick={onOpenFilters}
                  className="mt-3 relative inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[#dddddd] bg-white px-6 py-4 text-[16px] font-bold text-[#111]"
                >
                  <span aria-hidden="true">⚙️</span>
                  Filtros

                  {filtersCount > 0 && (
                    <span className="absolute right-4 top-1/2 flex h-6 min-w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[#111] px-1.5 text-[11px] font-extrabold text-white">
                      {filtersCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {!isDesktop && mobileSearchOpen && (
        <div className="fixed inset-0 z-[999] bg-[#f7f7f7]">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between bg-white px-5 pb-4 pt-5 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setMobileSearchOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[32px] leading-none shadow-[0_4px_16px_rgba(0,0,0,0.14)]"
                  aria-label="Cerrar búsqueda"
                >
                  ×
                </button>

                <div>
                  <p className="m-0 text-[13px] font-bold uppercase tracking-[0.08em] text-[#999]">
                    Disfrutonas
                  </p>
                  <h2 className="m-0 text-[22px] font-extrabold text-[#111]">
                    Empieza a buscar
                  </h2>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5">
              <div className="rounded-[28px] bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.10)]">
                {mobileSheetSearch}
              </div>

              {showFiltersButton && onOpenFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileSearchOpen(false);
                    onOpenFilters();
                  }}
                  className="mt-4 flex w-full items-center justify-between rounded-[22px] bg-white px-5 py-5 text-[18px] font-extrabold text-[#111] shadow-[0_8px_22px_rgba(0,0,0,0.08)]"
                >
                  <span>Filtros</span>
                  <span>
                    ⚙️ {filtersCount > 0 ? `(${filtersCount})` : ""}
                  </span>
                </button>
              )}
            </div>

            <div className="border-t border-[#e8e8e8] bg-white px-5 pb-6 pt-4">
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setLocationInput("");
                    setSelectedDateMode("none");
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="text-[17px] font-extrabold text-[#111] underline"
                >
                  Restablecer
                </button>

                <button
                  type="button"
                  onClick={searchAndCloseMobile}
                  className="rounded-[18px] bg-[#e91e63] px-8 py-4 text-[18px] font-extrabold text-white shadow-[0_8px_20px_rgba(233,30,99,0.28)]"
                >
                  ⌕ Buscar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
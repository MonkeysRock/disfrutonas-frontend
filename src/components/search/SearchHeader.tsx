"use client";

import { useRef } from "react";
import CalendarPopover from "./CalendarPopover";

export type AppDateMode = "none" | "hoy" | "manana" | "calendario";

type SearchHeaderProps = {
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
    handler: () => void
  ) => void;
  compact?: boolean;
};

export default function SearchHeader({
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
  compact = false,
}: SearchHeaderProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const locationDropdownRef = useRef<HTMLDivElement | null>(null);
  const calendarDropdownRef = useRef<HTMLDivElement | null>(null);

  useOutsideClick(wrapperRef, () => {
    setShowLocationSuggestions(false);
    setShowCalendar(false);
  });

  function handleDateSelect(date: Date) {
    const today = dayStart(new Date());
    if (isBeforeDay(date, today)) return;

    const ymd = formatYmd(date);
    setSelectedDateMode("calendario");

    if (!dateFrom && !dateTo) {
      setDateFrom(ymd);
      setDateTo("");
      return;
    }

    if (dateFrom && !dateTo) {
      const from = parseYmd(dateFrom);

      if (sameDay(date, from)) {
        setDateTo(ymd);
        return;
      }

      if (isBeforeDay(date, from)) {
        setDateFrom(ymd);
        setDateTo(dateFrom);
        return;
      }

      setDateTo(ymd);
      return;
    }

    if (dateFrom && dateTo) {
      setDateFrom(ymd);
      setDateTo("");
    }
  }

  function handleQuickMode(mode: "hoy" | "manana") {
    const value = mode === "hoy" ? getTodayYmd() : getTomorrowYmd();
    setSelectedDateMode(mode);
    setDateFrom(value);
    setDateTo(value);
    setShowCalendar(false);
  }

  function handleClearDates() {
    setSelectedDateMode("none");
    setDateFrom("");
    setDateTo("");
  }

  function getDateText() {
    if (selectedDateMode === "none" || !dateFrom) {
      return "Introduce la fecha";
    }

    if (selectedDateMode === "hoy") return "Hoy";
    if (selectedDateMode === "manana") return "Mañana";

    if (dateFrom && !dateTo) {
      return compact
        ? formatShortSpanishDate(parseYmd(dateFrom))
        : formatLongSpanishDate(parseYmd(dateFrom));
    }

    if (dateFrom === dateTo) {
      return compact
        ? formatShortSpanishDate(parseYmd(dateFrom))
        : formatLongSpanishDate(parseYmd(dateFrom));
    }

    return compact
      ? `${formatShortSpanishDate(parseYmd(dateFrom))} - ${formatShortSpanishDate(parseYmd(dateTo))}`
      : `${formatLongSpanishDate(parseYmd(dateFrom))} — ${formatLongSpanishDate(parseYmd(dateTo))}`;
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full rounded-full border border-[#dcdcdc] bg-white shadow-[0_14px_34px_rgba(0,0,0,0.08)] ${
        compact ? "max-w-[1120px]" : "max-w-[980px]"
      }`}
    >
      <div
        className={`items-center ${
          compact
            ? "grid min-w-0 grid-cols-[minmax(0,1.35fr)_minmax(0,1.1fr)_112px]"
            : "grid grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_auto] lg:gap-0 lg:p-2"
        }`}
      >
        <div
          className={`relative min-w-0 transition ${
            compact
              ? "cursor-text rounded-l-full border-r border-[#ececec] px-8 py-5 hover:bg-[#fafafa]"
              : "rounded-[28px] px-5 py-4 hover:bg-[#fafafa] lg:cursor-text lg:border-r lg:border-[#ececec]"
          }`}
        >
          <div className="mb-1 text-xs font-bold text-[#555]">Destino</div>

          <input
            value={locationInput}
            onChange={(e) => {
              setLocationInput(e.target.value);
              setShowLocationSuggestions(true);
              setShowCalendar(false);
            }}
            onFocus={() => {
              setShowLocationSuggestions(true);
              setShowCalendar(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setShowLocationSuggestions(false);
                handleSearch();
              }

              if (e.key === "Escape") {
                setShowLocationSuggestions(false);
              }
            }}
            placeholder="Buscar ciudad o pueblo"
            className={`w-full min-w-0 truncate border-none bg-transparent text-[#111] outline-none placeholder:text-[#777] ${
              compact ? "cursor-text text-[18px]" : "text-[17px]"
            }`}
          />

          {showLocationSuggestions && (
            <div
              ref={locationDropdownRef}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 right-0 top-[calc(100%+14px)] z-40 rounded-[28px] border border-[#e8e8e8] bg-white p-4 shadow-[0_22px_50px_rgba(0,0,0,0.14)]"
            >
              {suggestions.length === 0 ? (
                <div className="px-3 py-3 text-[15px] text-[#777]">
                  No hemos encontrado esa localización.
                </div>
              ) : (
                suggestions.map((location) => (
                  <button
                    key={location.slug}
                    type="button"
                    onClick={() => handleSelectLocation(location.name)}
                    className="grid w-full cursor-pointer grid-cols-[54px_1fr] items-center gap-4 rounded-[18px] border-none bg-white p-3 text-left transition hover:bg-[#fafafa]"
                  >
                    <div className="flex h-[54px] w-[54px] items-center justify-center rounded-[16px] bg-[#f5f5f5] text-[28px]">
                      📍
                    </div>

                    <div className="min-w-0">
                      <div className="mb-1 truncate text-[17px] font-bold text-[#111]">
                        {location.name}
                      </div>
                      <div className="truncate text-[14px] text-[#777]">
                        {location.province} · {location.region}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div
          className={`relative min-w-0 transition ${
            compact
              ? "rounded-r-full border-r border-[#ececec] px-8 py-5 hover:bg-[#fafafa]"
              : "rounded-[28px] px-5 py-4 hover:bg-[#fafafa] lg:border-r lg:border-[#ececec]"
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowLocationSuggestions(false);
              setShowCalendar((prev) => !prev);
            }}
            className="block w-full min-w-0 cursor-pointer text-left"
          >
            <div className="mb-1 text-xs font-bold text-[#555]">Fechas</div>

            <div
              className={`min-w-0 truncate ${
                selectedDateMode === "none" || !dateFrom
                  ? "text-[#777]"
                  : "text-[#111]"
              } ${compact ? "text-[18px] font-medium" : "text-[17px]"}`}
            >
              {getDateText()}
            </div>
          </button>

          {showCalendar && (
            <div
              ref={calendarDropdownRef}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <CalendarPopover
                visible={showCalendar}
                monthCursor={monthCursor}
                setMonthCursor={setMonthCursor}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onSelectDate={handleDateSelect}
                onQuickMode={handleQuickMode}
                onClear={handleClearDates}
                compact={compact}
                getMonthDays={getMonthDays}
                getMonthLabel={getMonthLabel}
                addMonths={addMonths}
                parseYmd={parseYmd}
                sameDay={sameDay}
                isBeforeDay={isBeforeDay}
                isBetweenDays={isBetweenDays}
                dayStart={dayStart}
                formatLongSpanishDate={formatLongSpanishDate}
              />
            </div>
          )}
        </div>

        <div
          className={`${
            compact
              ? "flex items-center justify-center px-4"
              : "flex items-center justify-end px-2 pb-2 lg:pb-0"
          }`}
        >
          <button
            type="button"
            onClick={handleSearch}
            className={`flex cursor-pointer items-center justify-center rounded-full border-none bg-[#111] font-bold text-white transition hover:scale-[1.03] hover:bg-[#222] ${
              compact
                ? "h-[62px] w-[62px] text-[20px]"
                : "min-h-[64px] px-7 py-4 text-[17px]"
            }`}
            aria-label="Buscar"
          >
            ⌕
          </button>
        </div>
      </div>
    </div>
  );
}
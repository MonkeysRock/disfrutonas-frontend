"use client";

type CalendarDay = {
  key: string;
  date: Date;
  currentMonth: boolean;
};

type CalendarPopoverProps = {
  visible: boolean;
  monthCursor: Date;
  setMonthCursor: React.Dispatch<React.SetStateAction<Date>>;
  dateFrom: string;
  dateTo: string;
  onSelectDate: (date: Date) => void;
  onQuickMode: (mode: "hoy" | "manana") => void;
  onClear: () => void;
  compact?: boolean;
  getMonthDays: (monthDate: Date) => CalendarDay[];
  getMonthLabel: (date: Date) => string;
  addMonths: (date: Date, amount: number) => Date;
  parseYmd: (value: string) => Date;
  sameDay: (a: Date, b: Date) => boolean;
  isBeforeDay: (a: Date, b: Date) => boolean;
  isBetweenDays: (target: Date, start: Date, end: Date) => boolean;
  dayStart: (date: Date) => Date;
  formatLongSpanishDate: (date: Date) => string;
};

export default function CalendarPopover({
  visible,
  monthCursor,
  setMonthCursor,
  dateFrom,
  dateTo,
  onSelectDate,
  onQuickMode,
  onClear,
  compact = false,
  getMonthDays,
  getMonthLabel,
  addMonths,
  parseYmd,
  sameDay,
  isBeforeDay,
  isBetweenDays,
  dayStart,
  formatLongSpanishDate,
}: CalendarPopoverProps) {
  if (!visible) return null;

  const monthA = monthCursor;
  const monthB = addMonths(monthCursor, 1);
  const daysA = getMonthDays(monthA);
  const daysB = getMonthDays(monthB);

  const fromDate = dateFrom ? parseYmd(dateFrom) : null;
  const toDate = dateTo ? parseYmd(dateTo) : null;
  const today = dayStart(new Date());
  const weekDays = ["L", "M", "X", "J", "V", "S", "D"];

  function renderMonth(days: CalendarDay[], monthDate: Date) {
    return (
      <div className="min-w-0">
        <div className="mb-4 text-center text-[18px] font-bold text-[#111]">
          {getMonthLabel(monthDate)}
        </div>

        <div className="grid grid-cols-7 gap-y-2">
          {weekDays.map((day) => (
            <div
              key={`${monthDate.getMonth()}-${day}`}
              className="mb-2 text-center text-[13px] font-semibold text-[#777]"
            >
              {day}
            </div>
          ))}

          {days.map((item) => {
            const isPast = isBeforeDay(item.date, today);
            const isSelectedStart =
              fromDate !== null && sameDay(item.date, fromDate);
            const isSelectedEnd =
              toDate !== null && sameDay(item.date, toDate);
            const isSingleDay =
              fromDate !== null &&
              toDate !== null &&
              sameDay(fromDate, toDate) &&
              sameDay(item.date, fromDate);
            const isOnlyStartSelected =
              fromDate !== null &&
              dateTo === "" &&
              sameDay(item.date, fromDate);
            const isInRange =
              fromDate !== null &&
              toDate !== null &&
              isBetweenDays(item.date, fromDate, toDate);

            const highlightLeft =
              isInRange ||
              (isSelectedEnd &&
                fromDate !== null &&
                toDate !== null &&
                !sameDay(fromDate, toDate));

            const highlightRight =
              isInRange ||
              (isSelectedStart &&
                fromDate !== null &&
                toDate !== null &&
                !sameDay(fromDate, toDate));

            return (
              <div
                key={item.key}
                className="relative flex h-11 items-center justify-center"
              >
                {highlightLeft && (
                  <div className="absolute left-0 top-1/2 h-10 w-1/2 -translate-y-1/2 bg-[#f3f3f3]" />
                )}

                {highlightRight && (
                  <div className="absolute right-0 top-1/2 h-10 w-1/2 -translate-y-1/2 bg-[#f3f3f3]" />
                )}

                <button
                  type="button"
                  disabled={isPast}
                  onClick={() => onSelectDate(item.date)}
                  className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full text-[15px] transition ${
                    item.currentMonth ? "text-[#111]" : "text-[#c7c7c7]"
                  } ${
                    isPast
                      ? "cursor-not-allowed text-[#d6d6d6]"
                      : isSelectedStart ||
                        isSelectedEnd ||
                        isSingleDay ||
                        isOnlyStartSelected
                      ? "bg-[#111] font-bold text-white"
                      : isInRange
                      ? "bg-[#f3f3f3] text-[#111]"
                      : "hover:bg-[#f5f5f5]"
                  }`}
                >
                  {item.date.getDate()}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`absolute top-[calc(100%+14px)] z-40 rounded-[32px] border border-[#ececec] bg-white shadow-[0_24px_70px_rgba(0,0,0,0.14)] ${
        compact
          ? "left-1/2 w-[min(96vw,980px)] -translate-x-1/2 p-5 lg:p-7"
          : "left-0 right-0 p-5"
      }`}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onQuickMode("hoy")}
            className="rounded-full border border-[#e5e5e5] px-4 py-2 text-sm font-semibold text-[#111] transition hover:bg-[#f7f7f7]"
          >
            Hoy
          </button>

          <button
            type="button"
            onClick={() => onQuickMode("manana")}
            className="rounded-full border border-[#e5e5e5] px-4 py-2 text-sm font-semibold text-[#111] transition hover:bg-[#f7f7f7]"
          >
            Mañana
          </button>

          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-[#e5e5e5] px-4 py-2 text-sm font-semibold text-[#111] transition hover:bg-[#f7f7f7]"
          >
            Limpiar
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonthCursor((prev) => addMonths(prev, -1))}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e5e5e5] text-[20px] text-[#111] transition hover:bg-[#f7f7f7]"
            aria-label="Mes anterior"
          >
            ←
          </button>

          <button
            type="button"
            onClick={() => setMonthCursor((prev) => addMonths(prev, 1))}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e5e5e5] text-[20px] text-[#111] transition hover:bg-[#f7f7f7]"
            aria-label="Mes siguiente"
          >
            →
          </button>
        </div>
      </div>

      <div
        className={`grid gap-8 ${
          compact ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {renderMonth(daysA, monthA)}
        {compact && renderMonth(daysB, monthB)}
      </div>

      <div className="mt-6 rounded-[22px] bg-[#fafafa] px-4 py-4 text-[15px] text-[#555]">
        {dateFrom && dateTo ? (
          <>
            <span className="font-semibold text-[#111]">Selección:</span>{" "}
            {formatLongSpanishDate(parseYmd(dateFrom))}
            {dateFrom !== dateTo
              ? ` — ${formatLongSpanishDate(parseYmd(dateTo))}`
              : ""}
          </>
        ) : dateFrom ? (
          <>
            <span className="font-semibold text-[#111]">Inicio:</span>{" "}
            {formatLongSpanishDate(parseYmd(dateFrom))}. Selecciona la fecha
            final o pulsa el mismo día para dejar una sola fecha.
          </>
        ) : (
          "Selecciona un día o un rango de fechas."
        )}
      </div>
    </div>
  );
}
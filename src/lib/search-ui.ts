import * as React from "react";

export type AppDateMode = "none" | "hoy" | "manana" | "calendario";

export type CalendarDay = {
  key: string;
  date: Date;
  currentMonth: boolean;
};

export function formatYmd(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseYmd(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatShortSpanishDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatLongSpanishDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isBeforeDay(a: Date, b: Date) {
  return dayStart(a).getTime() < dayStart(b).getTime();
}

export function isAfterDay(a: Date, b: Date) {
  return dayStart(a).getTime() > dayStart(b).getTime();
}

export function isBetweenDays(target: Date, start: Date, end: Date) {
  const t = dayStart(target).getTime();
  const s = dayStart(start).getTime();
  const e = dayStart(end).getTime();
  return t > s && t < e;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function getMonthLabel(date: Date) {
  const label = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(date);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function getMonthDays(monthDate: Date): CalendarDay[] {
  const firstDay = startOfMonth(monthDate);
  const startWeekDay = (firstDay.getDay() + 6) % 7;
  const firstGridDay = new Date(firstDay);
  firstGridDay.setDate(firstDay.getDate() - startWeekDay);

  return Array.from({ length: 42 }).map((_, index) => {
    const date = new Date(firstGridDay);
    date.setDate(firstGridDay.getDate() + index);

    return {
      key: formatYmd(date),
      date,
      currentMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

export function getTodayYmd() {
  return formatYmd(new Date());
}

export function getTomorrowYmd() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatYmd(tomorrow);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function extractEventDateFromSlug(slug: string) {
  const match = slug.match(/(\d{4}-\d{2}-\d{2})$/);
  return match ? match[1] : null;
}

export function matchesDateRange(
  eventSlug: string,
  dateFrom: string,
  dateTo: string
): boolean {
  const eventDate = extractEventDateFromSlug(eventSlug);
  if (!eventDate) return true;
  if (!dateFrom && !dateTo) return true;

  const from = dateFrom || dateTo;
  const to = dateTo || dateFrom;

  if (!from || !to) return true;

  return eventDate >= from && eventDate <= to;
}

export function useOutsideClick<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: () => void,
  ignoreRefs: Array<React.RefObject<HTMLElement | null>> = []
) {
  React.useEffect(() => {
    function listener(event: PointerEvent) {
      const target = event.target as Node | null;
      const node = ref.current;

      if (!target || !node) return;

      if (node.contains(target)) return;

      for (const ignoreRef of ignoreRefs) {
        const ignoreNode = ignoreRef.current;
        if (ignoreNode && ignoreNode.contains(target)) {
          return;
        }
      }

      handler();
    }

    document.addEventListener("pointerdown", listener);

    return () => {
      document.removeEventListener("pointerdown", listener);
    };
  }, [ref, handler, ignoreRefs]);
}

export function useIsDesktop(breakpoint = 1024) {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    function check() {
      setIsDesktop(window.innerWidth >= breakpoint);
    }

    check();
    window.addEventListener("resize", check);

    return () => {
      window.removeEventListener("resize", check);
    };
  }, [breakpoint]);

  return isDesktop;
}

export function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > threshold);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [threshold]);

  return scrolled;
}
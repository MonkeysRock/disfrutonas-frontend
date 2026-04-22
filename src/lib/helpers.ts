import { events, type EventItem } from "@/data/events";
import { locations, type LocationItem } from "@/data/locations";

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getAllEvents(): EventItem[] {
  return events;
}

export function getEventsByCity(city: string): EventItem[] {
  return events.filter((event) => event.citySlug === city);
}

export function getEventsByCityAndPillar(
  city: string,
  pillar: string
): EventItem[] {
  return events.filter(
    (event) => event.citySlug === city && event.pillarSlug === pillar
  );
}

export function getEventsByCityPillarAndCategory(
  city: string,
  pillar: string,
  category: string
): EventItem[] {
  return events.filter(
    (event) =>
      event.citySlug === city &&
      event.pillarSlug === pillar &&
      event.categorySlug === category
  );
}

export function getEventByFullPath(params: {
  city: string;
  pillar: string;
  category: string;
  slug: string;
}): EventItem | undefined {
  return events.find(
    (event) =>
      event.citySlug === params.city &&
      event.pillarSlug === params.pillar &&
      event.categorySlug === params.category &&
      event.slug === params.slug
  );
}

export function getRelatedEvents(event: EventItem): EventItem[] {
  return events.filter(
    (item) =>
      item.slug !== event.slug &&
      item.citySlug === event.citySlug &&
      item.pillarSlug === event.pillarSlug
  );
}

export function getPillarCountByCity(
  city: string,
  pillar: "deportivos" | "culturales"
): number {
  return events.filter(
    (event) => event.citySlug === city && event.pillarSlug === pillar
  ).length;
}

export function filterEventsList(options: {
  selectedPillar: "Todos" | "Deportivos" | "Culturales";
  selectedCategory: string | null;
  onlyFree: boolean;
  maxPrice: number | null;
  selectedLocation: string;
}): EventItem[] {
  const {
    selectedPillar,
    selectedCategory,
    onlyFree,
    maxPrice,
    selectedLocation,
  } = options;

  return events.filter((event) => {
    const pillarMatch =
      selectedPillar === "Todos" || event.pillar === selectedPillar;

    const categoryMatch =
      selectedCategory === null || event.category === selectedCategory;

    const freeMatch = !onlyFree || event.isFree;

    const priceMatch =
      maxPrice === null || event.isFree || event.price <= maxPrice;

    const locationMatch =
      selectedLocation === "Todas" || event.city === selectedLocation;

    return (
      pillarMatch &&
      categoryMatch &&
      freeMatch &&
      priceMatch &&
      locationMatch
    );
  });
}

export function searchLocations(query: string, limit = 8): LocationItem[] {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return locations.slice(0, limit);
  }

  const startsWithMatches = locations.filter((location) =>
    normalizeText(
      `${location.name} ${location.province} ${location.region}`
    ).startsWith(normalizedQuery)
  );

  const includesMatches = locations.filter((location) =>
    normalizeText(
      `${location.name} ${location.province} ${location.region}`
    ).includes(normalizedQuery)
  );

  const unique = new Map<string, LocationItem>();

  [...startsWithMatches, ...includesMatches].forEach((location) => {
    unique.set(location.slug, location);
  });

  return Array.from(unique.values()).slice(0, limit);
}
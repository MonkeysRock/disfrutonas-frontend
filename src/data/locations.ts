import { KNOWN_CITIES } from "./cities.js";

export type LocationItem = {
  name: string;
  slug: string;
  province: string;
  region: string;
  type: "city" | "town";
};

function slugifyLocation(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const locations: LocationItem[] = KNOWN_CITIES.map((name) => ({
  name,
  slug: slugifyLocation(name),
  province: "",
  region: "",
  type: "city",
}));

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function searchLocations(
  query: string,
  limit = 8
): LocationItem[] {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) return [];

  return locations
    .filter((location) => {
      const normalizedName = normalizeText(location.name);
      return normalizedName.includes(normalizedQuery);
    })
    .slice(0, limit);
}
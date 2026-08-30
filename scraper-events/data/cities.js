import { KNOWN_CITIES } from "../../scraper-fever/cities-data.mjs";

export const CITY_SEARCH_NAMES = KNOWN_CITIES;

function normalizeCityName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getCanonicalCityName(value) {
  if (!value) return null;

  const normalizedValue = normalizeCityName(value);

  const match = KNOWN_CITIES.find(
    (city) => normalizeCityName(city) === normalizedValue
  );

  return match || value;
}
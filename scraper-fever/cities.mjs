import { KNOWN_CITIES } from "./cities-data.mjs";

function slugifyCity(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const FEVER_CITIES = KNOWN_CITIES.map((city) => ({
  city,
  slug: slugifyCity(city),
  url: `https://feverup.com/es/${slugifyCity(
    city
  )}/conciertos-festivales`,
}));
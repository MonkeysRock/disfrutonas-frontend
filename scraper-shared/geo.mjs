
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import axios from "axios";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export async function loadGeoCities() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Faltan credenciales de Supabase");
  }

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };

  const countriesResponse = await axios.get(
    `${SUPABASE_URL}/rest/v1/countries`,
    {
      headers,
      params: {
        select: "id,name,slug",
        limit: 1000,
      },
    }
  );

  const countries = countriesResponse.data;
  const allCities = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/cities`,
      {
        headers,
        params: {
          select: "id,name,slug,country_id,region",
          order: "id.asc",
          limit: pageSize,
          offset,
        },
      }
    );

    allCities.push(...response.data);

    if (response.data.length < pageSize) break;
  }

  return {
    countries,
    cities: allCities,
  };
}

const CITY_ALIASES = {
  "pamplona/iruna": "Pamplona",
  "palma": "Palma de Mallorca",
  "coruna, a": "A Coruña",
  "alicante/alacant": "Alicante",
  "palmas de gran canaria, las": "Las Palmas de Gran Canaria",
  "jerez de la frontera. cadiz": "Jerez de la Frontera",
"castellon de la plana/castello de la plana": "Castellón de la Plana",
};

export function findGeoCity(geo, cityName, countrySlug = "espana") {
  const country = geo.countries.find(
    (item) => item.slug === countrySlug
  );

  if (!country) return null;

  const resolvedCityName =
  CITY_ALIASES[normalize(cityName)] || cityName;

  const matches = geo.cities.filter(
    (city) =>
      city.country_id === country.id &&
      (normalize(city.name) === normalize(resolvedCityName) ||
        normalize(city.slug) === normalize(resolvedCityName))
  );

  // No elegimos arbitrariamente entre ciudades homónimas.
  return matches.length === 1 ? matches[0] : null;
}

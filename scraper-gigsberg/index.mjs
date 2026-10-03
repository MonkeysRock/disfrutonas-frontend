import dotenv from "dotenv";
dotenv.config({ path: "../.env.local" });

import fs from "fs";
import { parse } from "csv-parse";
import { createGunzip } from "zlib";
import axios from "axios";


// ============================================================
// CONFIGURACIÓN
// ============================================================

const FEED_FILE = new URL(
  "./102705-117210-en_ES-Fastify_EUR_ES_Feed.csv.gz",
  import.meta.url
);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const DRY_RUN = true;

if (!SUPABASE_URL) {
  throw new Error("Falta SUPABASE_URL en .env.local");
}

if (!SUPABASE_KEY) {
  throw new Error("Falta SUPABASE_KEY en .env.local");
}


// ============================================================
// UTILIDADES
// ============================================================

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(text) {
  return cleanText(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getGigsbergClassification(eventType) {
  const type = cleanText(eventType).toLowerCase();

  let pillar = "Ocio";
  let category = "Otros";
  let subcategory = "General";

  switch (type) {
    case "concert":
      pillar = "Culturales";
      category = "Conciertos";
      subcategory = "General";
      break;

    case "sport":
      pillar = "Deportivos";
      category = "Deporte";
      subcategory = "General";
      break;

    case "comedy":
      pillar = "Culturales";
      category = "Monólogos";
      subcategory = "General";
      break;

    case "theatre":
      pillar = "Culturales";
      category = "Teatro";
      subcategory = "General";
      break;

    case "festival":
      pillar = "Culturales";
      category = "Festivales";
      subcategory = "General";
      break;
  }

  return {
    pillar,
    pillar_slug: slugify(pillar),

    category,
    category_slug: slugify(category),

    subcategory,
    subcategory_slug: slugify(subcategory),
  };
}

function normalizeForFingerprint(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bconsigue tus entradas para\b/g, "")
    .replace(/\badquiere tus entradas para\b/g, "")
    .replace(/\bentradas para\b/g, "")
    .replace(/\bentradas?\b/g, "")
    .replace(/\ben concierto\b/g, "")
    .replace(/\btour\b/g, "")
    .replace(/\bgira\b/g, "")
    .replace(/\bshow\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}


function buildEventFingerprint(event) {
  return [
    normalizeForFingerprint(event.title),
    event.event_date || "",
    normalizeForFingerprint(event.city),
    normalizeForFingerprint(event.place),
  ].join("|");
}


function tokenize(value) {
  return normalizeForFingerprint(value)
    .split(" ")
    .filter(Boolean);
}


function titleSimilarity(a, b) {
  const normalizedA = normalizeForFingerprint(a);
  const normalizedB = normalizeForFingerprint(b);

  if (!normalizedA || !normalizedB) {
    return 0;
  }

  if (normalizedA === normalizedB) {
    return 1;
  }

  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));

  if (!setA.size || !setB.size) {
    return 0;
  }

  const intersection = [...setA].filter((token) =>
    setB.has(token)
  );

  const union = new Set([...setA, ...setB]);

  const jaccard =
    intersection.length / union.size;

  const coverage =
    intersection.length /
    Math.min(setA.size, setB.size);

  return Math.max(jaccard, coverage);
}


function placeSimilarity(a, b) {
  const normalizedA = normalizeForFingerprint(a);
  const normalizedB = normalizeForFingerprint(b);

  if (!normalizedA || !normalizedB) {
    return 0;
  }

  if (normalizedA === normalizedB) {
    return 1;
  }

  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));

  if (!setA.size || !setB.size) {
    return 0;
  }

  const intersection = [...setA].filter((token) =>
    setB.has(token)
  );

  return (
    intersection.length /
    Math.min(setA.size, setB.size)
  );
}


function isValidDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}


// ============================================================
// LEER FEED GIGSBERG
// ============================================================

async function readFeed() {
  console.log("🚀 Leyendo feed Gigsberg...");

  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(FEED_FILE)
      .pipe(createGunzip())
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          relax_quotes: true,
          relax_column_count: true,
          trim: true,
        })
      )
      .on("data", (row) => {
        rows.push(row);
      })
      .on("end", () => {
        resolve(rows);
      })
      .on("error", reject);
  });
}


// ============================================================
// EXTRAER CAMPOS DE DESCRIPTION
// ============================================================

function extractDescriptionField(description, field) {
  const text = String(description || "");

  const fields = [
    "Location",
    "EventType",
    "Venue",
    "Date",
    "Time",
  ];

  const nextFields = fields
    .filter((item) => item !== field)
    .join("|");

  const regex = new RegExp(
    `${field}:\\s*(.*?)(?=,\\s*(?:${nextFields}):|$)`,
    "i"
  );

  const match = text.match(regex);

  return match
    ? cleanText(match[1])
    : "";
}


// ============================================================
// TRANSFORMAR GIGSBERG
// ============================================================

function parseGigsbergRow(row) {
  const description = cleanText(
    row.description
  );

  const title = cleanText(
    row.product_name
  );

  const city = extractDescriptionField(
    description,
    "Location"
  );

  const eventType = extractDescriptionField(
    description,
    "EventType"
  );

  const place = extractDescriptionField(
    description,
    "Venue"
  );

  const eventDate = extractDescriptionField(
    description,
    "Date"
  );

  const time = extractDescriptionField(
    description,
    "Time"
  );

  const price = Number.parseFloat(
    row.search_price
  );

  const classification =
  getGigsbergClassification(eventType);

  if (!title || !city || !eventDate) {
    return null;
  }

  const event = {
    title,

    slug: slugify(`${title}-${eventDate}-${city}`),

city,
city_slug: slugify(city),

...classification,

    

    place:
      place ||
      "Lugar por confirmar",

    eventType:
      eventType ||
      cleanText(row.merchant_category) ||
      "Other",

  event_date:
  eventDate,

date:
  eventDate,

end_date:
  null,

time:
  time || null,

description:
  `${title} en ${place || "lugar por confirmar"}, ${city}.`,

    is_free:
  Number.isFinite(price) && price === 0,

price:
  Number.isFinite(price)
    ? price
    : null,

price_label:
  Number.isFinite(price) && price > 0
    ? `Desde ${price.toFixed(2).replace(".", ",")} €`
    : Number.isFinite(price) && price === 0
    ? "Gratis"
    : "Consultar precio",

    currency:
      cleanText(row.currency) ||
      "EUR",

    image:
      cleanText(row.merchant_image_url) ||
      cleanText(row.aw_image_url) ||
      null,

      image_alt:
  title,

image_label:
  classification.category,

image_sub_label:
  classification.subcategory,

lat:
  null,

lng:
  null,

    source:
      "gigsberg",

    source_id:
      cleanText(row.merchant_product_id) ||
      cleanText(row.aw_product_id),

    source_url:
      cleanText(row.aw_deep_link),

      last_seen_at:
  new Date().toISOString(),
  };

  event.fingerprint =
    buildEventFingerprint(event);

  return event;
}


// ============================================================
// LEER EVENTOS DE SUPABASE
// SOLO GET
// ============================================================

async function getExistingEvents() {
  console.log(
    "\n🔎 Consultando eventos existentes en Supabase..."
  );

  const events = [];

  let offset = 0;
  const limit = 1000;

  while (true) {
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/events`,
      {
        params: {
          select:
            "id,title,event_date,city,place,source,source_url,fingerprint",

          limit,
          offset,
        },

        headers: {
          apikey:
            SUPABASE_KEY,

          Authorization:
            `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    events.push(
      ...response.data
    );

    if (
      response.data.length < limit
    ) {
      break;
    }

    offset += limit;
  }

  console.log(
    `📚 Eventos existentes en Supabase: ${events.length}`
  );

  return events;
}


// ============================================================
// DETECTOR FLEXIBLE DE DUPLICADOS
// ============================================================

function findPossibleDuplicate(
  event,
  existingEvents
) {
  const eventCity =
    normalizeForFingerprint(
      event.city
    );

  // Solo misma fecha + misma ciudad
  const candidates =
    existingEvents.filter(
      (existing) => {
        return (
          existing.event_date ===
            event.event_date &&

          normalizeForFingerprint(
            existing.city
          ) === eventCity
        );
      }
    );

  let bestMatch = null;

  for (const existing of candidates) {
    const titleScore =
      titleSimilarity(
        event.title,
        existing.title
      );

    const placeScore =
      placeSimilarity(
        event.place,
        existing.place
      );

    let confidence =
      titleScore;

    if (placeScore >= 0.6) {
      confidence = Math.min(
        1,
        confidence + 0.05
      );
    }

    const strongTitleMatch =
      titleScore >= 0.75;

    const strongVenueMatch =
      titleScore >= 0.4 &&
      placeScore >= 0.75;

    const isPossibleDuplicate =
      strongTitleMatch ||
      strongVenueMatch;

    if (
      isPossibleDuplicate &&
      (
        !bestMatch ||
        confidence >
          bestMatch.confidence
      )
    ) {
      bestMatch = {
        existing,
        titleScore,
        placeScore,
        confidence,
      };
    }
  }

  return bestMatch;
}


// ============================================================
// MAIN
// ============================================================

async function main() {
  const rows =
    await readFeed();

  console.log(
    `📦 Registros Gigsberg: ${rows.length}`
  );


  // ----------------------------------------------------------
  // TRANSFORMACIÓN
  // ----------------------------------------------------------

  const events = rows
    .map(parseGigsbergRow)
    .filter(Boolean)
    .filter(
      (event) =>
        isValidDate(
          event.event_date
        )
    );

  console.log(
    `🎟️ Eventos correctamente parseados: ${events.length}`
  );

  console.log(
    `⏭️ Registros descartados: ${
      rows.length -
      events.length
    }`
  );


  // ----------------------------------------------------------
  // SOLO VIGENTES
  // ----------------------------------------------------------

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  const futureEvents =
    events.filter(
      (event) =>
        event.event_date >= today
    );

  console.log(
    `\n📅 Fecha utilizada: ${today}`
  );

  console.log(
    `✅ Eventos vigentes/futuros: ${futureEvents.length}`
  );


  // ----------------------------------------------------------
  // TIPOS
  // ----------------------------------------------------------

  const eventTypes =
    new Map();

  for (
    const event
    of futureEvents
  ) {
    const type =
      event.eventType ||
      "Unknown";

    eventTypes.set(
      type,
      (
        eventTypes.get(type) ||
        0
      ) + 1
    );
  }

  console.log(
    "\n🎭 TIPOS DE EVENTO:"
  );

  for (
    const [type, count]
    of [...eventTypes.entries()]
      .sort(
        (a, b) =>
          b[1] - a[1]
      )
  ) {
    console.log(
      `${count} × ${type}`
    );
  }


  // ----------------------------------------------------------
  // CIUDADES
  // ----------------------------------------------------------

  const cities =
    new Map();

  for (
    const event
    of futureEvents
  ) {
    cities.set(
      event.city,
      (
        cities.get(
          event.city
        ) || 0
      ) + 1
    );
  }

  const sortedCities =
    [...cities.entries()]
      .sort(
        (a, b) =>
          b[1] - a[1]
      );

  console.log(
    "\n🌍 TOP 50 CIUDADES GIGSBERG:"
  );

  for (
    const [city, count]
    of sortedCities.slice(
      0,
      50
    )
  ) {
    console.log(
      `${String(count).padStart(5)} × ${city}`
    );
  }


  // ----------------------------------------------------------
  // ESPAÑA
  //
  // Temporalmente usamos ciudades conocidas.
  // Después lo sustituiremos por una solución internacional.
  // ----------------------------------------------------------

  const spanishCities =
    new Set([
      "Madrid",
      "Barcelona",
      "Sevilla",
      "Valencia",

      "Málaga",
      "Malaga",

      "Bilbao",
      "Zaragoza",
      "Alicante",
      "Murcia",
      "Granada",

      "Córdoba",
      "Cordoba",

      "Valladolid",
      "Vigo",

      "A Coruña",
      "La Coruña",

      "San Sebastián",
      "San Sebastian",

      "Pamplona",
      "Santander",
      "Salamanca",
      "Toledo",
      "Tarragona",
      "Girona",

      "Palma",
      "Palma de Mallorca",

      "Ibiza",

      "Cádiz",
      "Cadiz",

      "Jerez de la Frontera",
      "Marbella",
      "Benidorm",
      "Cartagena",

      "Oviedo",

      "Gijón",
      "Gijon",

      "Almería",
      "Almeria",

      "Huelva",
      "Burgos",

      "León",
      "Leon",

      "Logroño",
      "Badajoz",

      "Cáceres",
      "Caceres",

      "Albacete",
      "Segovia",

      "Ávila",
      "Avila",

      "Cuenca",
    ]);


  const spanishEvents =
    futureEvents.filter(
      (event) =>
        spanishCities.has(
          event.city
        )
    );


  const spanishCityCounts =
    new Map();

  for (
    const event
    of spanishEvents
  ) {
    spanishCityCounts.set(
      event.city,

      (
        spanishCityCounts.get(
          event.city
        ) || 0
      ) + 1
    );
  }


  console.log(
    "\n🇪🇸 EVENTOS DETECTADOS EN ESPAÑA:"
  );

  for (
    const [city, count]
    of [
      ...spanishCityCounts.entries()
    ].sort(
      (a, b) =>
        b[1] - a[1]
    )
  ) {
    console.log(
      `${String(count).padStart(5)} × ${city}`
    );
  }


  // ==========================================================
  // SUPABASE
  // SOLO LECTURA
  // ==========================================================

  const existingEvents =
    await getExistingEvents();


  const fingerprintMap =
    new Map(
      existingEvents
        .filter(
          (event) =>
            event.fingerprint
        )
        .map(
          (event) => [
            event.fingerprint,
            event,
          ]
        )
    );


  const exactDuplicates = [];
  const possibleDuplicates = [];
  const reallyNewEvents = [];


  // ----------------------------------------------------------
  // COMPARAR LOS 455 DE ESPAÑA
  // ----------------------------------------------------------

  for (
    const event
    of spanishEvents
  ) {
    // 1. Fingerprint exacto

    const exactExisting =
      fingerprintMap.get(
        event.fingerprint
      );

    if (exactExisting) {
      exactDuplicates.push({
        gigsberg:
          event,

        existing:
          exactExisting,
      });

      continue;
    }


    // 2. Comparación flexible

    const possibleMatch =
      findPossibleDuplicate(
        event,
        existingEvents
      );

    if (possibleMatch) {
      possibleDuplicates.push({
        gigsberg:
          event,

        existing:
          possibleMatch.existing,

        titleScore:
          possibleMatch.titleScore,

        placeScore:
          possibleMatch.placeScore,

        confidence:
          possibleMatch.confidence,
      });

      continue;
    }


    // 3. No existe

    reallyNewEvents.push(
      event
    );
  }


  // ==========================================================
  // RESULTADOS DEL CRUCE
  // ==========================================================

  console.log(
    "\n========================================"
  );

  console.log(
    "🔎 GIGSBERG ↔ SUPABASE"
  );

  console.log(
    "========================================"
  );

  console.log(
    `♻️ Duplicados exactos:  ${exactDuplicates.length}`
  );

  console.log(
    `⚠️ Posibles duplicados: ${possibleDuplicates.length}`
  );

  console.log(
    `🆕 Realmente nuevos:    ${reallyNewEvents.length}`
  );

  

  console.log(
    `🎟️ Total comparado:     ${spanishEvents.length}`
  );


  // ==========================================================
  // DE DÓNDE VIENEN LAS COINCIDENCIAS
  // ==========================================================

  const duplicateSources = {};

  for (
    const item
    of [
      ...exactDuplicates,
      ...possibleDuplicates,
    ]
  ) {
    const source =
      item.existing?.source ||
      "sin_source";

    duplicateSources[source] =
      (
        duplicateSources[source] ||
        0
      ) + 1;
  }


  console.log(
    "\n📊 FUENTES DE LOS EVENTOS COINCIDENTES:"
  );

  console.log(
    duplicateSources
  );


  // ==========================================================
  // POSIBLES DUPLICADOS
  // ==========================================================

  possibleDuplicates.sort(
    (a, b) =>
      b.confidence -
      a.confidence
  );


  console.log(
    "\n🔎 PRIMEROS 30 POSIBLES DUPLICADOS:"
  );


  for (
    const item
    of possibleDuplicates.slice(
      0,
      30
    )
  ) {
    console.log(
      "\n----------------------------------------"
    );

    console.log(
      `GIGSBERG: ${item.gigsberg.title}`
    );

    console.log(
      `SUPABASE: ${item.existing.title}`
    );

    console.log(
      `Fecha:    ${item.gigsberg.event_date}`
    );

    console.log(
      `Ciudad:   ${item.gigsberg.city}`
    );

    console.log(
      `Título:   ${(item.titleScore * 100).toFixed(0)}%`
    );

    console.log(
      `Recinto:  ${(item.placeScore * 100).toFixed(0)}%`
    );

    console.log(
      `Confianza: ${(item.confidence * 100).toFixed(0)}%`
    );

    console.log(
      `Lugar Gigsberg: ${item.gigsberg.place}`
    );

    console.log(
      `Lugar DB:       ${item.existing.place}`
    );

    console.log(
      `Fuente DB:      ${item.existing.source}`
    );

    console.log(
      `Precio Gigsberg: ${item.gigsberg.price ?? "?"} €`
    );
  }

  // ============================================================
// PREVIEW PAYLOADS GIGSBERG
// ============================================================

if (DRY_RUN) {
  console.log(
    "\n🧪 PREVIEW DE 10 PAYLOADS GIGSBERG:"
  );

  for (const event of reallyNewEvents.slice(0, 10)) {
    console.log(
      "\n----------------------------------------"
    );

    console.log({
      title: event.title,
      slug: event.slug,

      city: event.city,
      city_slug: event.city_slug,

      pillar: event.pillar,
      pillar_slug: event.pillar_slug,

      category: event.category,
      category_slug: event.category_slug,

      subcategory: event.subcategory,
      subcategory_slug: event.subcategory_slug,

      event_date: event.event_date,
      date: event.date,
      end_date: event.end_date,
      time: event.time,

      place: event.place,
      description: event.description,

      is_free: event.is_free,
      price: event.price,
      price_label: event.price_label,
      currency: event.currency,

      image: event.image,
      image_alt: event.image_alt,
      image_label: event.image_label,
      image_sub_label: event.image_sub_label,

      lat: event.lat,
      lng: event.lng,

      source: event.source,
      source_id: event.source_id,
      source_url: event.source_url,

      last_seen_at: event.last_seen_at,
      fingerprint: event.fingerprint,
    });
  }
}

  // ==========================================================
  // NUEVOS
  // ==========================================================

  console.log(
    "\n🆕 PRIMEROS 20 EVENTOS REALMENTE NUEVOS:"
  );

  for (
    const event
    of reallyNewEvents.slice(
      0,
      20
    )
  ) {
    console.log(
      "\n----------------------------------------"
    );

    console.log({
      title:
        event.title,

      date:
        event.event_date,

      time:
        event.time,

      city:
        event.city,

      place:
        event.place,

      type:
        event.eventType,

      price:
        event.price,

      currency:
        event.currency,

      source:
        event.source,
    });
  }


  // ==========================================================
  // RESUMEN FINAL
  // ==========================================================

  console.log(
    "\n========================================"
  );

  console.log(
    "📊 RESUMEN GIGSBERG"
  );

  console.log(
    "========================================"
  );

  console.log(
    `📦 Feed total:          ${rows.length}`
  );

  console.log(
    `🎟️ Parseados:           ${events.length}`
  );

  console.log(
    `📅 Vigentes:            ${futureEvents.length}`
  );

  console.log(
    `🇪🇸 España aprox.:       ${spanishEvents.length}`
  );

  console.log(
    `🌍 Ciudades totales:    ${cities.size}`
  );

  console.log(
    `📚 Eventos Supabase:    ${existingEvents.length}`
  );

  console.log(
    `♻️ Duplicados exactos:  ${exactDuplicates.length}`
  );

  console.log(
    `⚠️ Posibles duplicados: ${possibleDuplicates.length}`
  );

  console.log(
    `🆕 Realmente nuevos:    ${reallyNewEvents.length}`
  );

  console.log(
  `🧪 Modo:                ${DRY_RUN ? "DRY RUN" : "REAL"}`
);


  console.log(
    "\n🛑 SOLO LECTURA: no se ha modificado nada en Supabase."
  );
}


// ============================================================
// EJECUTAR
// ============================================================

main().catch((error) => {
  console.error(
    "❌ Error procesando Gigsberg:",
    error
  );

  process.exit(1);
});
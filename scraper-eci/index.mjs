import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import fs from "fs";
import axios from "axios";
import { parse } from "csv-parse";
import { createGunzip } from "zlib";

const AWIN_FEED_URL = process.env.AWIN_FEED_URL;

if (!AWIN_FEED_URL) {
  throw new Error("Falta AWIN_FEED_URL en .env.local");
}

const DRY_RUN = process.env.ECI_DRY_RUN !== "false";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL) {
  throw new Error("Falta SUPABASE_URL en .env");
}

if (!SUPABASE_KEY) {
  throw new Error("Falta SUPABASE_KEY en .env");
}

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

function parseNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const cleaned = String(value)
    .replace(/"/g, "")
    .replace(",", ".")
    .trim();

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
}

function getClassification(row) {
  const eciCategory = cleanText(row.merchant_category);
  const eciSubcategory = cleanText(row.merchant_product_second_category);

  let pillar = "Culturales";
  let category = eciCategory || "Otros";

  switch (eciCategory.toLowerCase()) {
    case "conciertos":
      pillar = "Culturales";
      category = "Conciertos";
      break;

    case "teatro":
      pillar = "Culturales";
      category = "Teatro";
      break;

    case "cultura":
      pillar = "Culturales";
      category = "Cultura";
      break;

    case "festivales":
      pillar = "Culturales";
      category = "Festivales";
      break;

    case "en familia":
      pillar = "Familia";
      category = "En familia";
      break;

    case "deporte":
      pillar = "Deportivos";
      category = "Deporte";
      break;

    case "experiencias":
      pillar = "Ocio";
      category = "Experiencias";
      break;

    case "entrada":
      pillar = "Ocio";
      category = "Otros";
      break;

    default:
      pillar = "Ocio";
      category = eciCategory || "Otros";
      break;
  }

  const subcategory = eciSubcategory || "General";

  return {
    pillar,
    pillar_slug: slugify(pillar),

    category,
    category_slug: slugify(category),

    subcategory,
    subcategory_slug: slugify(subcategory),
  };
}

function parseEventDates(value) {
  const text = cleanText(value);

  if (!text) {
    return {
      eventDate: null,
      endDate: null,
      dates: [],
    };
  }

  // Extraemos cualquier fecha YYYY-MM-DD existente
  const matches = text.match(/\d{4}-\d{2}-\d{2}/g) || [];

  // Quitamos posibles duplicados
  const dates = [...new Set(matches)].sort();

  if (!dates.length) {
    return {
      eventDate: null,
      endDate: null,
      dates: [],
    };
  }

  return {
    eventDate: dates[0],
    endDate:
      dates.length > 1
        ? dates[dates.length - 1]
        : null,
    dates,
  };
}

function transformRow(row) {
  const title = cleanText(
    row["Tickets:event_name"] ||
      row.product_name ||
      row["Tickets:primary_artist"]
  );

 const {
  eventDate,
  endDate,
  dates: eventDates,
} = parseEventDates(row["Tickets:event_date"]);

  const city = cleanText(row["Tickets:event_location_city"]);

  const place =
    cleanText(row["Tickets:venue_name"]) || "Lugar por confirmar";

  if (!title || !eventDate || !city) {
    return null;
  }

  const classification = getClassification(row);

  const price =
    parseNumber(row["Tickets:min_price"]) ??
    parseNumber(row.search_price);

  const lat = parseNumber(row["Tickets:latitude"]);
  const lng = parseNumber(row["Tickets:longitude"]);

  const sourceId =
    cleanText(row.merchant_product_id) ||
    cleanText(row.aw_product_id);

  const event = {
    title,

    slug: slugify(`${title}-${eventDate}-${city}`),

    city,
    city_slug: slugify(city),

    ...classification,

    event_date: eventDate,
date: eventDate,
end_date: endDate,
time: null,

    place,

    description:
      cleanText(row.description) ||
      `${title} en ${place}, ${city}.`,

    is_free: price === 0,

    price,

    price_label:
      price !== null && price > 0
        ? `Desde ${price.toFixed(2).replace(".", ",")} €`
        : price === 0
        ? "Gratis"
        : "Consultar precio",

    image:
      cleanText(row.merchant_image_url) ||
      cleanText(row.aw_image_url) ||
      null,

    image_alt: title,
    image_label: classification.category,
    image_sub_label: classification.subcategory,

    lat,
    lng,

    source: "eci",

    source_id: sourceId,

    // IMPORTANTE:
    // guardamos el enlace de afiliado de Awin.
    source_url: cleanText(row.aw_deep_link),

    last_seen_at: new Date().toISOString(),
  };

  event.fingerprint = buildEventFingerprint(event);

  return event;
}

async function readFeed() {
  console.log("🌐 Descargando feed actualizado desde AWIN...");

  const response = await axios.get(AWIN_FEED_URL, {
    responseType: "stream",
    decompress: true,
    timeout: 120000,
  });

  return new Promise((resolve, reject) => {
    const rows = [];

    response.data
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
        console.log(`✅ Feed AWIN descargado: ${rows.length} filas`);
        resolve(rows);
      })
      .on("error", reject);
  });
}

async function getExistingFingerprints() {
  console.log("\n🔎 Consultando eventos existentes en Supabase...");

  const existingEvents = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/events`,
      {
        params: {
          select: "id,title,event_date,city,place,source,source_url,fingerprint",
          limit,
          offset,
        },
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    existingEvents.push(...response.data);

    if (response.data.length < limit) {
      break;
    }

    offset += limit;
  }

  console.log(
    `📚 Eventos existentes en Supabase: ${existingEvents.length}`
  );

  return existingEvents;
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

  // Coincidencia exacta después de normalizar
  if (normalizedA === normalizedB) {
    return 1;
  }

  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (!tokensA.length || !tokensB.length) {
    return 0;
  }

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  const intersection = [...setA].filter((token) =>
    setB.has(token)
  );

  // Jaccard: palabras compartidas respecto al total
  const union = new Set([...setA, ...setB]);

  const jaccard = intersection.length / union.size;

  // Coverage: cuánto del título más corto aparece en el largo.
  // Muy útil para:
  // "Miguel Poveda"
  // vs
  // "Miguel Poveda - El árbol de la alegría"
  const shortestLength = Math.min(setA.size, setB.size);

  const coverage =
    shortestLength > 0
      ? intersection.length / shortestLength
      : 0;

  // Nos quedamos con la señal más fuerte.
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

  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));

  if (!tokensA.size || !tokensB.size) {
    return 0;
  }

  const intersection = [...tokensA].filter((token) =>
    tokensB.has(token)
  );

  return (
    intersection.length /
    Math.min(tokensA.size, tokensB.size)
  );
}

function findPossibleDuplicate(event, existingEvents) {
  const eventCity = normalizeForFingerprint(event.city);

  // Solo comparamos eventos de la misma fecha y ciudad
  const candidates = existingEvents.filter((existing) => {
    return (
      existing.event_date === event.event_date &&
      normalizeForFingerprint(existing.city) === eventCity
    );
  });

  let bestMatch = null;

  for (const existing of candidates) {
    const titleScore = titleSimilarity(
      event.title,
      existing.title
    );

    const placeScore = placeSimilarity(
      event.place,
      existing.place
    );

    let confidence = titleScore;

    // El recinto aumenta ligeramente la confianza
    if (placeScore >= 0.6) {
      confidence = Math.min(
        1,
        confidence + 0.05
      );
    }

    // Regla A:
    // título muy parecido
    const strongTitleMatch =
      titleScore >= 0.75;

    // Regla B:
    // título moderadamente parecido + mismo recinto
    const strongVenueMatch =
      titleScore >= 0.4 &&
      placeScore >= 0.75;

    const isPossibleDuplicate =
      strongTitleMatch || strongVenueMatch;

    if (
      isPossibleDuplicate &&
      (!bestMatch ||
        confidence > bestMatch.confidence)
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

async function insertEvents(events) {
  if (!events.length) {
    console.log("\nℹ️ No hay eventos nuevos para importar.");
    return;
  }

  console.log("\n========================================");
  console.log("📤 IMPORTACIÓN ECI");
  console.log("========================================");

  console.log(`Eventos preparados: ${events.length}`);

  if (DRY_RUN) {
    console.log(
      "🧪 DRY_RUN activo: NO se enviará nada a Supabase."
    );

    console.log("\n🔎 EJEMPLOS DEL PAYLOAD:");

    for (const event of events.slice(0, 10)) {
      console.log("\n----------------------------------------");

     console.log({
  title: event.title,
  slug: event.slug,
  event_date: event.event_date,
  end_date: event.end_date,
  city: event.city,
        place: event.place,
        pillar: event.pillar,
        category: event.category,
        subcategory: event.subcategory,
        price: event.price,
        source: event.source,
        source_id: event.source_id,
        source_url: event.source_url,
        fingerprint: event.fingerprint,
      });
    }

    return;
  }

  // ============================================================
// EVITAR CONFLICTOS POR SOURCE_URL YA EXISTENTE EN SUPABASE
// ============================================================

console.log("\n🔍 Comprobando URLs Awin que ya existen en Supabase...");

const existingSourceUrls = new Set();

const urlsToCheck = [
  ...new Set(
    events
      .map((event) => event.source_url)
      .filter(Boolean)
  ),
];

const URL_CHECK_BATCH = 50;

for (let i = 0; i < urlsToCheck.length; i += URL_CHECK_BATCH) {
  const urlBatch = urlsToCheck.slice(i, i + URL_CHECK_BATCH);

  const encodedUrls = urlBatch
    .map((url) => `"${url.replace(/"/g, '\\"')}"`)
    .join(",");

  const response = await axios.get(
    `${SUPABASE_URL}/rest/v1/events`,
    {
      params: {
        select: "source_url",
        source_url: `in.(${encodedUrls})`,
      },
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );

  for (const row of response.data) {
    if (row.source_url) {
      existingSourceUrls.add(row.source_url);
    }
  }
}

console.log(
  `🔗 URLs del feed que ya existen en Supabase: ${existingSourceUrls.size}`
);

const seenSourceUrls = new Set();

const eventsToInsert = events.filter((event) => {
  // Si no tiene URL, dejamos que continúe
  if (!event.source_url) return true;

  // Ya existe en Supabase
  if (existingSourceUrls.has(event.source_url)) {
    return false;
  }

  // Ya apareció antes dentro de este mismo lote
  if (seenSourceUrls.has(event.source_url)) {
    return false;
  }

  seenSourceUrls.add(event.source_url);
  return true;
});

const skippedByUrl = events.length - eventsToInsert.length;

console.log(`🔗 URLs ya existentes descartadas: ${skippedByUrl}`);
console.log(`📥 Eventos que realmente se insertarán: ${eventsToInsert.length}`);

if (!eventsToInsert.length) {
  console.log("ℹ️ Todos los eventos ya existen por source_url.");
  return;
}

console.log(
  `\n🧪 PRUEBA REAL: se insertarán ${eventsToInsert.length} de ${events.length} eventos.`
);


  /*
    IMPORTACIÓN REAL

    Solo se alcanza esta parte cuando:
    DRY_RUN = false
  */

  const batchSize = 100;

let inserted = 0;

for (let i = 0; i < eventsToInsert.length; i += batchSize) {
  const originalBatch = eventsToInsert.slice(i, i + batchSize);

  // Comprobar qué source_id de ECI ya existen en Supabase
  const sourceIds = originalBatch
    .map((event) => event.source_id)
    .filter(Boolean);

  let existingSourceIds = new Set();

  if (sourceIds.length > 0) {
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/events?source=eq.eci&source_id=in.(${sourceIds
        .map((id) => `"${id}"`)
        .join(",")})&select=source_id`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    existingSourceIds = new Set(
      response.data.map((event) => event.source_id)
    );
  }

  const batch = originalBatch.filter(
    (event) =>
      !event.source_id ||
      !existingSourceIds.has(event.source_id)
  );

  const skipped = originalBatch.length - batch.length;

  if (skipped > 0) {
    console.log(
      `♻️ ${skipped} eventos ECI ya existían por source_id. Omitidos.`
    );
  }

  if (batch.length === 0) {
    continue;
  }

 try {
  const response = await axios.post(
    `${SUPABASE_URL}/rest/v1/events?on_conflict=slug`,
    batch,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=representation",
      },
    }
  );

  inserted += response.data.length;

  console.log(
    `✅ Insertados ${inserted}/${eventsToInsert.length}`
  );
} catch (error) {
  if (
    error.response?.status === 409 &&
    error.response?.data?.code === "23505"
  ) {
    console.log(
      "⚠️ Batch contiene un evento que ya existe por source/source_id. Saltando duplicado."
    );
    continue;
  }

  console.error("❌ ERROR INSERTANDO EN SUPABASE");
  console.error("Status:", error.response?.status);
  console.error("Detalle:", error.response?.data);
  throw error;
}

   console.log(
  `✅ Insertados ${inserted}/${eventsToInsert.length}`
);
  }

  console.log(
    `\n🎉 Importación terminada: ${inserted} eventos insertados.`
  );
}

async function updateAffiliateLinks(items) {
  if (!items.length) {
    console.log("\nℹ️ No hay enlaces existentes que actualizar.");
    return;
  }

  console.log("\n========================================");
  console.log("💰 ACTUALIZACIÓN ENLACES AFILIADOS");
  console.log("========================================");
  console.log(`Eventos a actualizar: ${items.length}`);

  if (DRY_RUN) {
    console.log("🧪 DRY_RUN activo: NO se actualizará nada.");
    return;
  }

  let updated = 0;

  const itemsToUpdate = items;

console.log(
  `🧪 PRUEBA CONTROLADA: se actualizará ${itemsToUpdate.length} de ${items.length} eventos.`
);

  for (const item of itemsToUpdate) {
  try {
    await axios.patch(
      `${SUPABASE_URL}/rest/v1/events?id=eq.${item.existing.id}`,
      {
        source_url: item.eci.source_url,
        last_seen_at: new Date().toISOString(),
      },
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
      }
    );

    updated++;

    console.log(
      `✅ ${updated}/${items.length} | ${item.existing.title}`
    );
  } catch (error) {

    console.log("🔴 ERROR PATCH:");
console.log("Título:", item.existing.title);
console.log("Status:", error.response?.status);
console.log("Code:", error.response?.data?.code);
console.log("Message:", error.response?.data?.message);
console.log("URL:", item.eci.source_url);

    if (
  error.response?.status === 409 ||
  error.response?.data?.code === "23505"
) {
      console.log(
        `⚠️ URL Awin ya utilizada. Saltando: ${item.existing.title}`
      );
      continue;
    }

    throw error;
  }

  }

  console.log(
    `\n💰 Actualización terminada: ${updated} enlaces pasados a ECI/Awin.`
  );
}

async function main() {
  console.log("🚀 Leyendo feed de El Corte Inglés...");

  const rows = await readFeed();

  console.log(`📦 Productos ECI encontrados: ${rows.length}`);

  const events = rows
    .map(transformRow)
    .filter(Boolean);

  console.log(`🎟️ Eventos válidos transformados: ${events.length}`);
  console.log(
    `⏭️ Registros descartados por falta de datos: ${
      rows.length - events.length
    }`
  );

  const classifications = new Map();

  for (const event of events) {
    const key = `${event.pillar} → ${event.category} → ${event.subcategory}`;

    classifications.set(
      key,
      (classifications.get(key) || 0) + 1
    );
  }

  console.log("\n📚 CLASIFICACIÓN DISFRUTONAS:");

  for (const [classification, count] of [...classifications.entries()].sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`${count} × ${classification}`);
  }

  if (events.length > 0) {
    console.log("\n🎟️ PRIMER EVENTO TRANSFORMADO:");
    console.log(events[0]);
  }

  const miguelPoveda = events.find((event) =>
    event.title.toLowerCase().includes("miguel poveda")
  );

  if (miguelPoveda) {
    console.log("\n🔥 COMPROBACIÓN MIGUEL POVEDA:");
    console.log({
      title: miguelPoveda.title,
      pillar: miguelPoveda.pillar,
      category: miguelPoveda.category,
      subcategory: miguelPoveda.subcategory,
      date: miguelPoveda.event_date,
      city: miguelPoveda.city,
      place: miguelPoveda.place,
      price: miguelPoveda.price,
      lat: miguelPoveda.lat,
      lng: miguelPoveda.lng,
      source: miguelPoveda.source,
      source_id: miguelPoveda.source_id,
      affiliate_url: miguelPoveda.source_url,
      fingerprint: miguelPoveda.fingerprint,
    });
  }

  console.log("\n🔍 EVENTOS QUE HAN QUEDADO EN GENERAL:");

for (const event of events) {
  if (event.subcategory === "General") {
    console.log(
      `${event.category} | ${event.title} | ${event.city}`
    );
  }
}

const existingEvents = await getExistingFingerprints();

const fingerprintMap = new Map(
  existingEvents
    .filter((event) => event.fingerprint)
    .map((event) => [event.fingerprint, event])
);

const exactDuplicates = [];
const possibleDuplicates = [];
const reallyNewEvents = [];

for (const event of events) {
  // 1. Primero buscamos fingerprint exacto
  const exactExisting = fingerprintMap.get(
    event.fingerprint
  );

  if (exactExisting) {
    exactDuplicates.push({
      eci: event,
      existing: exactExisting,
    });

    continue;
  }

  // 2. Si no hay fingerprint exacto,
  // hacemos búsqueda flexible.
  const possibleMatch = findPossibleDuplicate(
    event,
    existingEvents
  );

  if (possibleMatch) {
    possibleDuplicates.push({
      eci: event,
      existing: possibleMatch.existing,
      titleScore: possibleMatch.titleScore,
      placeScore: possibleMatch.placeScore,
      confidence: possibleMatch.confidence,
    });

    continue;
  }

  // 3. No encontramos nada parecido
  reallyNewEvents.push(event);
}

console.log("\n========================================");
console.log("📊 COMPARACIÓN ECI ↔ SUPABASE");
console.log("========================================");

console.log(
  `♻️ Duplicados exactos:       ${exactDuplicates.length}`
);

console.log(
  `⚠️ Posibles duplicados:      ${possibleDuplicates.length}`
);

console.log(
  `🆕 Realmente nuevos:         ${reallyNewEvents.length}`
);

console.log(
  `📦 Total ECI analizado:      ${events.length}`
);

/*
  Mostramos los posibles duplicados
  ordenados por confianza.
*/

possibleDuplicates.sort(
  (a, b) => b.confidence - a.confidence
);

console.log("\n🔎 POSIBLES DUPLICADOS:");

for (const item of possibleDuplicates.slice(0, 50)) {
  console.log("\n----------------------------------------");

  console.log(`ECI:       ${item.eci.title}`);
  console.log(`SUPABASE:  ${item.existing.title}`);

  console.log(
    `Fecha:     ${item.eci.event_date}`
  );

  console.log(
    `Ciudad:    ${item.eci.city}`
  );

  console.log(
    `Título:    ${(item.titleScore * 100).toFixed(0)}%`
  );

  console.log(
    `Recinto:   ${(item.placeScore * 100).toFixed(0)}%`
  );

  console.log(
    `Confianza: ${(item.confidence * 100).toFixed(0)}%`
  );

  console.log(
    `Lugar ECI: ${item.eci.place}`
  );

  console.log(
    `Lugar DB:  ${item.existing.place}`
  );

  console.log(
    `Fuente DB: ${item.existing.source}`
  );
}

// ============================================================
// AUDITORÍA DE LA DETECCIÓN FLEXIBLE
// ============================================================

console.log("\n\n🧪 AUDITORÍA DE POSIBLES DUPLICADOS");

// ------------------------------------------------------------
// 1. Distribución por nivel de confianza
// ------------------------------------------------------------

const confidence95 = possibleDuplicates.filter(
  (item) => item.confidence >= 0.95
);

const confidence85 = possibleDuplicates.filter(
  (item) =>
    item.confidence >= 0.85 &&
    item.confidence < 0.95
);

const confidence75 = possibleDuplicates.filter(
  (item) =>
    item.confidence >= 0.75 &&
    item.confidence < 0.85
);

console.log("\n📊 DISTRIBUCIÓN:");

console.log(
  `🟢 95%-100%: ${confidence95.length}`
);

console.log(
  `🟡 85%-94%:  ${confidence85.length}`
);

console.log(
  `🟠 75%-84%:  ${confidence75.length}`
);

// ------------------------------------------------------------
// 2. Mostrar los casos más dudosos
// ------------------------------------------------------------

console.log("\n🔬 CASOS DUDOSOS 75%-85%:");

for (const item of confidence75) {
  console.log("\n----------------------------------------");

  console.log(`ECI:       ${item.eci.title}`);
  console.log(`SUPABASE:  ${item.existing.title}`);

  console.log(`Fecha:     ${item.eci.event_date}`);
  console.log(`Ciudad:    ${item.eci.city}`);

  console.log(
    `Título:    ${(item.titleScore * 100).toFixed(0)}%`
  );

  console.log(
    `Recinto:   ${(item.placeScore * 100).toFixed(0)}%`
  );

  console.log(
    `Confianza: ${(item.confidence * 100).toFixed(0)}%`
  );

  console.log(`Lugar ECI: ${item.eci.place}`);
  console.log(`Lugar DB:  ${item.existing.place}`);
}

// ============================================================
// AUDITORÍA DE ENLACES AFILIADOS ECI/AWIN
// ============================================================

console.log("\n💰 AUDITORÍA DE ENLACES AFILIADOS ECI/AWIN:");

console.log("\n🔬 DEBUG PRIMEROS DUPLICADOS:");

for (const item of exactDuplicates.slice(0, 5)) {
  console.log({
    eciTitle: item.eci?.title,
    eciUrl: item.eci?.source_url,
    existingTitle: item.existing?.title,
    existingSource: item.existing?.source,
    existingId: item.existing?.id,
  });
}

const duplicateSources = {};

for (const item of [...exactDuplicates, ...possibleDuplicates]) {
  const source = item.existing?.source || "sin_source";
  duplicateSources[source] = (duplicateSources[source] || 0) + 1;
}

console.log("\n📊 FUENTES DE LOS DUPLICADOS:");
console.log(duplicateSources);

console.log("\n🔎 COMPARANDO URLs ECI EXISTENTES VS AWIN DEL FEED:");

let sameAwinUrl = 0;
let differentAwinUrl = 0;
let existingWithoutUrl = 0;

for (const item of [...exactDuplicates, ...possibleDuplicates]) {
  const newUrl = item.eci?.source_url;
  const oldUrl = item.existing?.source_url;

  if (!oldUrl) {
    existingWithoutUrl++;
    continue;
  }

  if (newUrl === oldUrl) {
    sameAwinUrl++;
  } else if (newUrl?.includes("awin1.com")) {
    differentAwinUrl++;
  }
}

console.log({
  sameAwinUrl,
  differentAwinUrl,
  existingWithoutUrl,
});

console.log("\n🔎 EJEMPLOS DE URLs AWIN DIFERENTES:");

let shownDifferent = 0;

for (const item of [...exactDuplicates, ...possibleDuplicates]) {
  const newUrl = item.eci?.source_url;
  const oldUrl = item.existing?.source_url;

  if (
    newUrl &&
    oldUrl &&
    newUrl !== oldUrl &&
    newUrl.includes("awin1.com")
  ) {
    console.log({
      title: item.existing.title,
      oldUrl,
      newUrl,
    });

    shownDifferent++;

    if (shownDifferent >= 10) break;
  }
}

const affiliateUpdates = [
  ...exactDuplicates,
  ...possibleDuplicates,
].filter((item) => {
  const newUrl = item.eci?.source_url;
  const oldUrl = item.existing?.source_url;

  if (
    !item.existing?.id ||
    !newUrl ||
    !newUrl.includes("awin1.com") ||
    newUrl === oldUrl
  ) {
    return false;
  }

  // Seguridad extra para afiliación:
  // misma fecha + misma ciudad + título prácticamente igual.
  const sameDate =
    item.eci.event_date === item.existing.event_date;

  const sameCity =
    normalizeForFingerprint(item.eci.city) ===
    normalizeForFingerprint(item.existing.city);

  const titleScore = titleSimilarity(
    item.eci.title,
    item.existing.title
  );

const samePlace =
  normalizeForFingerprint(item.eci.place) ===
  normalizeForFingerprint(item.existing.place);

const exactTitle =
  normalizeForFingerprint(item.eci.title) ===
  normalizeForFingerprint(item.existing.title);

const safeAffiliateMatch =
  sameDate &&
  sameCity &&
  (
    exactTitle ||
    (titleScore >= 0.90 && samePlace)
  );

if (!safeAffiliateMatch) {
  console.log(
    `🛑 Awin rechazado | ${item.existing.title} ↔ ${item.eci.title} | título: ${Math.round(titleScore * 100)}%`
  );

  return false;
}

  return true;
});
console.log(
  `🔗 Eventos existentes que podrían pasar a Awin: ${affiliateUpdates.length}`
);

for (const item of affiliateUpdates.slice(0, 30)) {
  console.log("\n----------------------------------------");
  console.log(`🎟️ ${item.existing.title}`);
  console.log(`📅 ${item.existing.event_date}`);
  console.log(`📍 ${item.existing.city}`);
  console.log(`🗄️ Fuente actual: ${item.existing.source}`);
  console.log(`🔗 URL actual: ${item.existing.source_url || "SIN URL"}`);
  console.log(`💰 URL Awin: ${item.eci.source_url}`);
}

await updateAffiliateLinks(affiliateUpdates);

// ============================================================
// 3. BUSCAR POSIBLES DUPLICADOS QUE SE NOS HAYAN ESCAPADO
// ============================================================

console.log(
  "\n\n🕵️ BUSCANDO DUPLICADOS ESCAPADOS ENTRE LOS 'NUEVOS'..."
);

const suspiciousNewEvents = [];

for (const event of reallyNewEvents) {
  const eventCity = normalizeForFingerprint(event.city);

  const candidates = existingEvents.filter((existing) => {
    return (
      existing.event_date === event.event_date &&
      normalizeForFingerprint(existing.city) === eventCity
    );
  });

  for (const existing of candidates) {
    const titleScore = titleSimilarity(
      event.title,
      existing.title
    );

    const placeScore = placeSimilarity(
      event.place,
      existing.place
    );

    /*
      Aquí NO usamos el 75%.

      Buscamos casos que nuestro detector principal
      ha rechazado pero tienen un recinto muy parecido.

      Esto nos permite encontrar falsos negativos.
    */

    if (
      titleScore >= 0.4 &&
      titleScore < 0.75 &&
      placeScore >= 0.75
    ) {
      suspiciousNewEvents.push({
        eci: event,
        existing,
        titleScore,
        placeScore,
      });
    }
  }
}


// Ordenamos primero los más sospechosos

suspiciousNewEvents.sort((a, b) => {
  const scoreA =
    a.titleScore * 0.7 +
    a.placeScore * 0.3;

  const scoreB =
    b.titleScore * 0.7 +
    b.placeScore * 0.3;

  return scoreB - scoreA;
});


console.log(
  `\n🚨 Nuevos sospechosos encontrados: ${suspiciousNewEvents.length}`
);


// ------------------------------------------------------------
// 4. Mostrar hasta 50 sospechosos
// ------------------------------------------------------------

for (const item of suspiciousNewEvents.slice(0, 50)) {
  console.log("\n----------------------------------------");

  console.log(`ECI:       ${item.eci.title}`);
  console.log(`SUPABASE:  ${item.existing.title}`);

  console.log(`Fecha:     ${item.eci.event_date}`);
  console.log(`Ciudad:    ${item.eci.city}`);

  console.log(
    `Título:    ${(item.titleScore * 100).toFixed(0)}%`
  );

  console.log(
    `Recinto:   ${(item.placeScore * 100).toFixed(0)}%`
  );

  console.log(`Lugar ECI: ${item.eci.place}`);
  console.log(`Lugar DB:  ${item.existing.place}`);
}

console.log("\n========================================");

await insertEvents(reallyNewEvents);

if (DRY_RUN) {
  console.log(
    "\n🛑 DRY_RUN: no se ha enviado nada a Supabase."
  );
}

return {
  dryRun: DRY_RUN,
  existingEvents: existingEvents.length,
  newEvents: reallyNewEvents.length,
  exactDuplicates: exactDuplicates.length,
  possibleDuplicates: possibleDuplicates.length,
  affiliateUpdates: affiliateUpdates.length,
  suspiciousNewEvents: suspiciousNewEvents.length,
};

}

export async function scrapeECI() {
  return await main();
}

// Solo ejecutar automáticamente cuando lanzamos:
// node scraper-eci/index.mjs
if (process.argv[1]?.endsWith("scraper-eci/index.mjs")) {
  scrapeECI().catch((error) => {
    console.error("❌ Error procesando feed:", error);
    process.exit(1);
  });
}
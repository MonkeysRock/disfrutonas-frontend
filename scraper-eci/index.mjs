import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import fs from "fs";
import axios from "axios";
import { parse } from "csv-parse";
import { createGunzip } from "zlib";
import {
  loadGeoCities,
  findGeoCity,
} from "../scraper-shared/geo.mjs";

const AWIN_FEED_URL = process.env.AWIN_FEED_URL;

if (!AWIN_FEED_URL) {
  throw new Error("Falta AWIN_FEED_URL en .env.local");
}

const DRY_RUN = process.env.ECI_DRY_RUN !== "false";
const ECI_IMPORT_EVENTS = process.env.ECI_IMPORT_EVENTS === "true";
const ECI_UPDATE_OFFERS = process.env.ECI_UPDATE_OFFERS === "true";
const ECI_INSERT_OFFERS = process.env.ECI_INSERT_OFFERS === "true";


const ECI_TEST_MODE = process.env.ECI_TEST_MODE !== "false";
const ECI_TEST_LIMIT = 5;

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

    const normalizedTitle = title.toLowerCase();

let ticketType = null;

if (/\bpremium\b/i.test(normalizedTitle)) {
  ticketType = "Premium";
} else if (/\b(reducida|reducido)\b/i.test(normalizedTitle)) {
  ticketType = "Reducida";
} else if (/\b(flexible|flexible entry)\b/i.test(normalizedTitle)) {
  ticketType = "Flexible";
} else if (/\b(general)\b/i.test(normalizedTitle)) {
  ticketType = "General";
}

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
    ticket_type: ticketType,

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
          select: "id,title,event_date,city,city_id,place,source,source_url,fingerprint",
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

async function getExistingOffers() {
  console.log(
    "\n🎫 Consultando ofertas existentes en Supabase..."
  );

  const existingOffers = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/event_offers`,
      {
        params: {
          select:
            "id,event_id,merchant,source,source_id,price,currency,ticket_type,affiliate_url,last_seen_at",
          limit,
          offset,
        },

        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    existingOffers.push(...response.data);

    if (response.data.length < limit) {
      break;
    }

    offset += limit;
  }

  console.log(
    `🎟️ Ofertas existentes en Supabase: ${existingOffers.length}`
  );

  return existingOffers;
}

async function insertOffer(offer) {
  if (DRY_RUN) {
    console.log(
      `🧪 DRY RUN: oferta no insertada: ${offer.source_id}`
    );
    return null;
  }

  const response = await axios.post(
    `${SUPABASE_URL}/rest/v1/event_offers?on_conflict=source,source_id`,
    {
      event_id: offer.event_id,
      merchant: offer.merchant,
      source: offer.source,
      source_id: offer.source_id,
      price: offer.price,
      currency: offer.currency || "EUR",
      ticket_type: offer.ticket_type || null,
      affiliate_url: offer.affiliate_url,
      last_seen_at: new Date().toISOString(),
    },
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=representation",
      },
    }
  );

 const insertedOffer = response.data?.[0];

if (!insertedOffer?.id) {
  console.log(
    `⏭️ Oferta ECI ya existente, inserción omitida: ${offer.source_id}`
  );
  return null;
}

console.log(
  `✅ Oferta ECI insertada: ${offer.source_id}`
);

return insertedOffer;
}

async function updateOffer(offer) {
  if (DRY_RUN) {
    console.log(
      `🧪 DRY RUN: oferta no actualizada: ${offer.source_id}`
    );
    return null;
  }

  const response = await axios.patch(
    `${SUPABASE_URL}/rest/v1/event_offers`,
    {
      event_id: offer.event_id,
      merchant: offer.merchant,
      price: offer.price,
      currency: offer.currency || "EUR",
      ticket_type: offer.ticket_type || null,
      affiliate_url: offer.affiliate_url,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
    params: {
  source: "eq.eci",
  source_id: `eq.${offer.source_id}`,
},
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
    }
  );

  const updatedOffer = response.data?.[0];

  if (!updatedOffer?.id) {
    throw new Error(
      `No se pudo actualizar oferta ECI: ${offer.source_id}`
    );
  }

  return updatedOffer;
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
function normalizeEventWithoutTicketType(title) {
  return normalizeForFingerprint(title)
    .replace(/\b(vip|premium|general|reducida|reducido|flexible)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findPossibleDuplicate(event, existingEvents) {
  const eventCity = normalizeForFingerprint(event.city);

  // Solo comparamos eventos de la misma fecha y ciudad
  const candidates = existingEvents.filter((existing) => {
   return (
  existing.event_date === event.event_date &&
  (
    event.city_id != null && existing.city_id != null
      ? Number(event.city_id) === Number(existing.city_id)
      : normalizeForFingerprint(existing.city) === eventCity
  )
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
  titleScore >= 0.85 &&
  placeScore >= 0.6;

    // Regla B:
    // título moderadamente parecido + mismo recinto
    const strongVenueMatch =
  titleScore >= 0.75 &&
  placeScore >= 0.85;

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
  return [];
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

       return [];
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
  return [];
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
const insertedEvents = [];

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
    batch.map(({
  ticket_type,
  _internalDuplicateCandidate,
  _internalMatchSourceId,
  _mainSourceId,
  ...eventData
}) => eventData),
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
  insertedEvents.push(
  ...response.data.map((insertedEvent) => ({
    ...insertedEvent,
    ticket_type:
      batch.find((event) => event.slug === insertedEvent.slug)?.ticket_type ?? null,
  }))
);

  console.log(
    `✅ Insertados ${inserted}/${eventsToInsert.length}`
  );
} catch (error) {
  if (
    error.response?.status === 409 &&
    error.response?.data?.code === "23505"
  ) {
    console.log(
      `⚠️ Conflicto en lote de ${batch.length} eventos. Recuperando individualmente...`
    );

    for (const event of batch) {
      try {
        const response = await axios.post(
          `${SUPABASE_URL}/rest/v1/events?on_conflict=slug`,
          [{ ...Object.fromEntries(
  Object.entries(event).filter(
  ([key]) =>
    ![
  "ticket_type",
  "_internalDuplicateCandidate",
  "_internalMatchSourceId",
  "_mainSourceId"
].includes(key)
)
) }],
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
        insertedEvents.push(
  ...response.data.map((insertedEvent) => ({
    ...insertedEvent,
    ticket_type: event.ticket_type ?? null,
  }))
);
      } catch (individualError) {
        if (
          individualError.response?.status === 409 &&
          individualError.response?.data?.code === "23505"
        ) {
          console.log(
            `⏭️ Duplicado omitido: ${event.title}`
          );
          continue;
        }

        throw individualError;
      }
    }

    console.log(
      `✅ Recuperación completada. Insertados: ${inserted}`
    );
  } else {
    console.error("❌ ERROR INSERTANDO EN SUPABASE");
    console.error("Status:", error.response?.status);
    console.error("Detalle:", error.response?.data);
    throw error;
  }
}

   console.log(
  `✅ Insertados ${inserted}/${eventsToInsert.length}`
);
  }

  console.log(
    `\n🎉 Importación terminada: ${inserted} eventos insertados.`
  );
  return insertedEvents;
}

async function insertOffersForNewEvents(
  insertedEvents,
  additionalEciOffers = []
) {
  const eventIdBySourceId = new Map(
    insertedEvents.map(event => [
      String(event.source_id),
      event.id
    ])
  );

  const extraOffers = additionalEciOffers
    .filter(event => event._mainSourceId)
    .map(event => ({
      ...event,
      id: eventIdBySourceId.get(String(event._mainSourceId))
    }))
    .filter(event => event.id);

  const allOffers = [...insertedEvents, ...extraOffers];

  for (const event of allOffers) {
    const offer = {
      event_id: event.id,
      merchant: "El Corte Inglés",
      source: "eci",
      source_id: String(event.source_id),
      price: event.price,
      currency: "EUR",
      ticket_type: event.ticket_type || null,
      affiliate_url: event.source_url,
    };

    const validOffer =
  offer.event_id &&
  offer.source_id &&
  offer.source_id !== "undefined" &&
  Number.isFinite(Number(offer.price)) &&
  Number(offer.price) > 0 &&
  offer.currency === "EUR" &&
  (() => {
    try {
      return new URL(offer.affiliate_url).hostname === "www.awin1.com";
    } catch {
      return false;
    }
  })();

if (!validOffer) {
  console.log(`⚠️ Oferta ECI inválida: ${offer.source_id}`);
  continue;
}

await insertOffer(offer);
  }
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

    // Vincular eventos ECI con las ciudades de Supabase
const geo = await loadGeoCities();

let linkedCities = 0;
let unlinkedCities = 0;

for (const event of events) {
  const geoCity = findGeoCity(geo, event.city, "espana");

  if (geoCity) {
    event.city_id = geoCity.id;
    linkedCities++;
  } else {
    event.city_id = null;
    unlinkedCities++;
    console.log(`⚠️ Ciudad sin vincular: ${event.city}`);
  }
}

console.log(
  `🌍 Ciudades vinculadas: ${linkedCities} | Sin vincular: ${unlinkedCities}`
);

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

const existingOffers = await getExistingOffers();

const existingOffersMap = new Map(
  existingOffers.map((offer) => [
    `${offer.source}|${offer.source_id}`,
    offer,
  ])
);

const fingerprintMap = new Map(
  existingEvents
    .filter((event) => event.fingerprint)
    .map((event) => [event.fingerprint, event])
);

const exactDuplicates = [];
const possibleDuplicates = [];
const reallyNewEvents = [];
const newFingerprints = new Set();
const newEventsByFingerprint = new Map();

// Modalidades adicionales de eventos nuevos.
// Se conservan para asociarlas posteriormente
// a una única ficha de evento.
const additionalEciOffers = [];
let internalDuplicates = 0;

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

  // Comprobar duplicados flexibles entre eventos nuevos de ECI
const internalMatch = findPossibleDuplicate(
  event,
  reallyNewEvents
);

// Coincidencia estricta para modalidades de entradas.
// Respetamos tanto la fecha inicial como la final.
const sameEventForOffers = reallyNewEvents.find(main =>
  normalizeEventWithoutTicketType(main.title) ===
    normalizeEventWithoutTicketType(event.title) &&
  normalizeForFingerprint(main.city) ===
    normalizeForFingerprint(event.city) &&
  normalizeForFingerprint(main.place) ===
    normalizeForFingerprint(event.place) &&
  main.event_date === event.event_date &&
  (main.end_date || null) === (event.end_date || null) &&
  main.source_id !== event.source_id
);

if (sameEventForOffers) {
  additionalEciOffers.push({
    ...event,
    _mainSourceId: sameEventForOffers.source_id,
  });

  console.log(
    `🎟️ Modalidad agrupada: ${event.title} → ${sameEventForOffers.title}`
  );

  continue;
}

if (internalMatch) {
  internalDuplicates++;

  console.log(
    `⚠️ Duplicado interno ECI: ${event.title} [${event.source_id}] ↔ ${internalMatch.existing.title} [${internalMatch.existing.source_id}]`
  );

  // Pendiente de decidir si es otra modalidad
  // o una experiencia realmente diferente.
  // No descartamos el producto ni su enlace.
  event._internalDuplicateCandidate = true;
  event._internalMatchSourceId = internalMatch.existing.source_id;
}

 // 3. Evitar duplicados exactos dentro del propio feed ECI
if (newFingerprints.has(event.fingerprint)) {
  internalDuplicates++;

  const mainEvent = newEventsByFingerprint.get(event.fingerprint);

  additionalEciOffers.push({
    ...event,
    _mainSourceId: mainEvent.source_id,
  });

  console.log(
    `🎟️ Modalidad ECI conservada: ${event.title} | ${event.ticket_type || "Sin especificar"} | Evento principal: ${mainEvent.source_id}`
  );

  continue;
}

newFingerprints.add(event.fingerprint);
newEventsByFingerprint.set(event.fingerprint, event);

// 4. Evento realmente nuevo
reallyNewEvents.push(event);
}

console.log(
  `🔎 Coincidencias internas ECI detectadas: ${internalDuplicates}`
);

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

const matchedEciEvents = [
  ...exactDuplicates,
  ...possibleDuplicates,
].filter((item) => {
  if (!item.existing?.id) {
    return false;
  }

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

  return (
    sameDate &&
    sameCity &&
    (
      exactTitle ||
      (titleScore >= 0.90 && samePlace)
    )
  );
});

console.log(
  `🎟️ Coincidencias seguras para ofertas ECI: ${matchedEciEvents.length}`
);

const eciOffers = matchedEciEvents
  .filter((item) =>
    item.eci.source_id &&
    item.eci.source_url &&
    item.existing?.id
  )
  .map((item) => ({
    event_id: item.existing.id,
    merchant: "El Corte Inglés",
    source: "eci",
    source_id: String(item.eci.source_id),
    price: item.eci.price,
    currency: "EUR",
    ticket_type: item.eci.ticket_type || null,
    affiliate_url: item.eci.source_url,
  }));

console.log(
  `🎟️ Ofertas ECI preparadas: ${eciOffers.length}`
);

const newEciOffers = [];
const changedEciOffers = [];
const unchangedEciOffers = [];

const processedOfferKeys = new Set();

for (const offer of eciOffers) {
  const key = `${offer.source}|${offer.source_id}`;

  // Evitar procesar dos veces el mismo producto del feed
  if (processedOfferKeys.has(key)) {
    continue;
  }

  processedOfferKeys.add(key);

  const existing = existingOffersMap.get(key);

  if (!existing) {
    newEciOffers.push(offer);
    continue;
  }

 const hasChanged =
  existing.event_id !== offer.event_id ||
  Number(existing.price) !== Number(offer.price) ||
  existing.currency !== offer.currency ||
  (existing.ticket_type || null) !== (offer.ticket_type || null) ||
  existing.affiliate_url !== offer.affiliate_url;

  if (hasChanged) {
  changedEciOffers.push(offer);

  console.log("🔄 CAMBIO OFERTA ECI:", {
    source_id: offer.source_id,
    event_id_anterior: existing.event_id,
    event_id_nuevo: offer.event_id,
    precio_anterior: existing.price,
    precio_nuevo: offer.price,
    tipo_anterior: existing.ticket_type,
    tipo_nuevo: offer.ticket_type,
    enlace_cambiado: existing.affiliate_url !== offer.affiliate_url,
  });
} else {
    unchangedEciOffers.push(offer);
  }
}

console.log("\n🎟️ RESUMEN DE OFERTAS ECI");
console.log(`🆕 Nuevas: ${newEciOffers.length}`);
console.log(`🔄 Modificadas: ${changedEciOffers.length}`);
console.log(`⏭️ Sin cambios: ${unchangedEciOffers.length}`);

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

// await updateAffiliateLinks(affiliateUpdates);

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

// ============================================================
// GUARDAR OFERTAS DE EL CORTE INGLÉS
// ============================================================

console.log("\n========================================");
console.log("🎟️ SINCRONIZACIÓN DE OFERTAS ECI");
console.log("========================================");

console.log(`🆕 Nuevas: ${newEciOffers.length}`);
console.log(`🔄 Modificadas: ${changedEciOffers.length}`);
console.log(`⏭️ Sin cambios: ${unchangedEciOffers.length}`);

console.log("\n🔎 COMPARACIÓN ECI VS SUPABASE");

for (const offer of newEciOffers.slice(0, 5)) {
  const match = matchedEciEvents.find(
    (item) =>
      String(item.eci.source_id) === offer.source_id &&
      item.existing.id === offer.event_id
  );

  console.log({
    titulo_eci: match?.eci.title,
    titulo_supabase: match?.existing.title,
    fecha_eci: match?.eci.event_date,
    fecha_supabase: match?.existing.event_date,
    ciudad_eci: match?.eci.city,
    ciudad_supabase: match?.existing.city,
  });
}

console.log("\n🔎 VALIDACIÓN DE LAS 5 OFERTAS ECI");

for (const offer of newEciOffers.slice(0, 5)) {
  console.log({
    event_id: offer.event_id,
    source_id: offer.source_id,

    titulo_evento:
  existingEvents.find((event) => event.id === offer.event_id)?.title ||
  "NO ENCONTRADO",

  fecha_evento:
  existingEvents.find((event) => event.id === offer.event_id)?.event_date,

ciudad_evento:
  existingEvents.find((event) => event.id === offer.event_id)?.city,

dominio_afiliado: (() => {
  try {
    return new URL(offer.affiliate_url).hostname;
  } catch {
    return "URL INVÁLIDA";
  }
})(),
    price: offer.price,
    currency: offer.currency,
    affiliate_url_valida:
      typeof offer.affiliate_url === "string" &&
      offer.affiliate_url.startsWith("https://"),
  });
}

 console.log(
  "🔎 PRIMERAS 5 OFERTAS ECI:",
  newEciOffers.slice(0, 5).map((offer) => ({
    event_id: offer.event_id,
    source_id: offer.source_id,
    price: offer.price,
    ticket_type: offer.ticket_type,
    affiliate_url: offer.affiliate_url,
  }))
);

if (DRY_RUN || !ECI_INSERT_OFFERS) {
  console.log(
    "🛡️ Inserción de ofertas ECI desactivada."
  );
} else {

 
 const offersToInsert = ECI_TEST_MODE
  ? newEciOffers.slice(0, ECI_TEST_LIMIT)
  : newEciOffers;

console.log(
  `🧪 Ofertas seleccionadas para insertar: ${offersToInsert.length}`
);

for (const offer of offersToInsert) {
  const validOffer =
    offer.event_id &&
    offer.source_id &&
    Number.isFinite(Number(offer.price)) &&
    Number(offer.price) > 0 &&
    offer.currency === "EUR" &&
    (() => {
      try {
        return new URL(offer.affiliate_url).hostname === "www.awin1.com";
      } catch {
        return false;
      }
    })();

  if (!validOffer) {
    throw new Error(
      `Oferta ECI inválida: ${offer.source_id}`
    );
  }

    await insertOffer(offer);
}

  console.log("✅ Inserción de ofertas ECI terminada.");
}

// Actualizaciones independientes de las inserciones
if (ECI_UPDATE_OFFERS && !DRY_RUN) {
  for (const offer of changedEciOffers.slice(0, ECI_TEST_MODE ? ECI_TEST_LIMIT : undefined)) {

    const key = `${offer.source}|${offer.source_id}`;
const previous = existingOffersMap.get(key);

if (!previous || previous.event_id !== offer.event_id) {
  console.log(
    `⚠️ Asociación de evento pendiente de revisión: ${offer.source_id}`
  );
  continue;
}

const oldPrice = Number(previous?.price);
const newPrice = Number(offer.price);

if (
  !Number.isFinite(oldPrice) ||
  !Number.isFinite(newPrice) ||
  oldPrice <= 0 ||
  newPrice <= 0 ||
  Math.abs((newPrice - oldPrice) / oldPrice) > 0.30
) {
  console.log(`⚠️ Precio pendiente de revisión: ${offer.source_id}`);
  continue;
}

    await updateOffer(offer);
  }
} else {
  console.log("🛡️ Actualizaciones de ofertas ECI desactivadas.");
}

  console.log("✅ Sincronización de ofertas ECI terminada.");


// Importación de eventos desactivada temporalmente.
// Solo estamos probando las ofertas de El Corte Inglés.
if (DRY_RUN || !ECI_IMPORT_EVENTS) {
  console.log("🛡️ Importación de eventos nuevos desactivada.");
} else {
  const safeNewEvents = reallyNewEvents.filter(
  (event) => !event._internalDuplicateCandidate
);

console.log(
  `🛡️ Eventos nuevos seguros: ${safeNewEvents.length} | Pendientes de revisión: ${reallyNewEvents.length - safeNewEvents.length}`
);

const insertedEvents = await insertEvents(safeNewEvents);
  await insertOffersForNewEvents(
  insertedEvents,
  additionalEciOffers
);
}

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
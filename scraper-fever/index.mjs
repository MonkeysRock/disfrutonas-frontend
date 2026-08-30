import * as cheerio from "cheerio";
import { FEVER_CITIES } from "./cities.mjs";
import { scrapeFeverDetail } from "./scrape-detail.mjs";
import { pathToFileURL } from "node:url";

const REQUEST_DELAY_MS = 2500;

// Procesamiento por bloques.
const START_CITY = Number(process.argv[2] ?? 0);
const BLOCK_SIZE = Number(process.argv[3] ?? 25);

// Sin límite de eventos por ciudad.
const MAX_LINKS_PER_CITY = Infinity;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

function getSupabaseHeaders(extraHeaders = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
}
function cleanText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
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

function mapFeverEventToDisfrutonas(event) {
  const place = event.venue || "Lugar por confirmar";
  const price =
    typeof event.price === "number" && Number.isFinite(event.price)
      ? event.price
      : null;

  const mapped = {
    title: event.title,
    slug: slugify(
      `${event.title}-${event.event_date}-${event.city}`
    ),

    city: event.city,
    city_slug: slugify(event.city),

    pillar: "Culturales",
    pillar_slug: "culturales",

    category: "Conciertos",
    category_slug: "conciertos",

    subcategory: "General",
    subcategory_slug: "general",

    event_date: event.event_date,
    date: event.event_date,
    time: event.event_time || null,

    place,
    description: event.description || event.title,

    is_free: Boolean(event.is_free),
    price,
    price_label:
      event.price_text ||
      (price !== null ? `Desde ${price} €` : "Consultar"),

    image: event.image_url || null,
    image_alt: event.title,
    image_label: "Conciertos",
    image_sub_label: event.title,

    lat: null,
    lng: null,

    source: "fever",
    source_id: event.source_id,
    source_url: event.source_url,
    last_seen_at: new Date().toISOString(),
  };

  mapped.fingerprint = buildEventFingerprint(mapped);

  return mapped;
}

async function findDuplicateEvent(event) {
  const fingerprintResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/events?fingerprint=eq.${encodeURIComponent(
      event.fingerprint
    )}&select=id,title,slug,event_date,city,place,price,source,source_id,fingerprint&limit=1`,
    {
      headers: getSupabaseHeaders(),
    }
  );

  if (!fingerprintResponse.ok) {
    throw new Error(
      `Error buscando fingerprint: ${fingerprintResponse.status} ${await fingerprintResponse.text()}`
    );
  }

  const fingerprintRows = await fingerprintResponse.json();

  if (fingerprintRows.length > 0) {
    return {
      event: fingerprintRows[0],
      matchedBy: "fingerprint",
    };
  }

  const slugResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/events?slug=eq.${encodeURIComponent(
      event.slug
    )}&select=id,title,slug,event_date,city,place,price,source,source_id,fingerprint&limit=1`,
    {
      headers: getSupabaseHeaders(),
    }
  );

  if (!slugResponse.ok) {
    throw new Error(
      `Error buscando slug: ${slugResponse.status} ${await slugResponse.text()}`
    );
  }

  const slugRows = await slugResponse.json();

  if (slugRows.length > 0) {
    return {
      event: slugRows[0],
      matchedBy: "slug",
    };
  }

  return null;
}

function chooseLowestPrice(existingPrice, scrapedPrice) {
  const validPrices = [existingPrice, scrapedPrice].filter(
    (price) => typeof price === "number" && Number.isFinite(price)
  );

  if (!validPrices.length) return null;

  return Math.min(...validPrices);
}

async function updateDuplicateEvent(existing, scrapedEvent) {
  const lowestPrice = chooseLowestPrice(
    existing.price,
    scrapedEvent.price
  );

  const updatedEvent = {
    ...scrapedEvent,
    slug: existing.slug,
    price: lowestPrice,
    price_label:
      lowestPrice !== null ? `Desde ${lowestPrice} €` : "Consultar",
    last_seen_at: new Date().toISOString(),
  };

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/events?id=eq.${existing.id}`,
    {
      method: "PATCH",
      headers: getSupabaseHeaders({
        Prefer: "return=minimal",
      }),
      body: JSON.stringify(updatedEvent),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Error actualizando duplicado: ${response.status} ${await response.text()}`
    );
  }
}

async function upsertEventBySource(event) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/events?on_conflict=source,source_id`,
    {
      method: "POST",
      headers: getSupabaseHeaders({
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Error guardando evento: ${response.status} ${await response.text()}`
    );
  }
}

async function saveEvent(event) {
  const duplicate = await findDuplicateEvent(event);

  if (duplicate) {
    await updateDuplicateEvent(duplicate.event, event);

    return {
      status: "duplicate-updated",
      matchedBy: duplicate.matchedBy,
    };
  }

  await upsertEventBySource(event);

  return {
    status: "source-upserted",
    matchedBy: "source",
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; DisfrutonasEventIndexer/1.0)",
      "accept-language": "es-ES,es;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

function extractEventLinks(html) {
  const $ = cheerio.load(html);
  const links = new Set();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");

    if (!href) {
      return;
    }

    // Enlaces relativos de Fever:
    // /m/645776
    if (/^\/m\/\d+/.test(href)) {
      links.add(`https://feverup.com${href.split("?")[0]}`);
    }

    // Enlaces absolutos de Fever:
    // https://feverup.com/m/645776
    if (/^https:\/\/feverup\.com\/m\/\d+/.test(href)) {
      links.add(href.split("?")[0]);
    }
  });

  return [...links].slice(0, MAX_LINKS_PER_CITY);
}

export async function scrapeFever({
  startCity = START_CITY,
  blockSize = BLOCK_SIZE,
} = {}) {

  const start = Date.now();

  const supportedCities = [];
  const scrapedEvents = [];

const citiesToTest = FEVER_CITIES.slice(
  startCity,
  startCity + blockSize
);

console.log(
  `Bloque: ciudades ${startCity} a ${startCity + citiesToTest.length - 1}`
);

  console.log(`Probando ${citiesToTest.length} ciudades...\n`);

  for (const source of citiesToTest) {
    try {
      console.log(`🔎 ${source.city}`);
      console.log(source.url);

      const html = await fetchHtml(source.url);
      const eventLinks = extractEventLinks(html);

      if (eventLinks.length === 0) {
        console.log("Sin conciertos encontrados\n");
      } else {
        console.log(
          `${eventLinks.length} conciertos encontrados`
        );

        for (const link of eventLinks) {
          try {
           const rawEvent = await scrapeFeverDetail(
  link,
  source.city
);

const event = mapFeverEventToDisfrutonas(rawEvent);

const saveResult = await saveEvent(event);

scrapedEvents.push(event);

            console.log(`  ✅ ${event.title}`);
            console.log(
              `     ${event.event_date ?? "Sin fecha"} - ${
                event.place ?? "Sin recinto"
              }`
            );
          } catch (error) {
            console.log(`  ❌ ${link}`);
            console.log(
              `     ${
                error instanceof Error
                  ? error.message
                  : "Error desconocido"
              }`
            );
          }

          await sleep(REQUEST_DELAY_MS);
        }

        supportedCities.push({
          city: source.city,
          slug: source.slug,
          url: source.url,
          eventLinks,
        });

        console.log("");
      }
    } catch (error) {
      console.log(
        `Saltada: ${
          error instanceof Error
            ? error.message
            : "Error desconocido"
        }\n`
      );
    }

    await sleep(REQUEST_DELAY_MS);
  }



  const totalSeconds = (Date.now() - start) / 1000;

 console.log(
  `Eventos procesados en Supabase: ${scrapedEvents.length} ${new Date().toISOString()}`
);

  console.log(
    `Terminado. ${supportedCities.length} ciudades con resultados y ${scrapedEvents.length} eventos extraídos.`
  );

  console.log(
    `Tiempo total: ${totalSeconds.toFixed(1)} segundos`
  );

  console.log(
    `Tiempo medio por evento: ${
      scrapedEvents.length > 0
        ? (
            totalSeconds / scrapedEvents.length
          ).toFixed(2)
        : "0.00"
    } segundos`
  );
return {
  supportedCities: supportedCities.length,
  eventsExtracted: scrapedEvents.length,
  totalSeconds,
  startCity,
  blockSize,
  nextCity: startCity + citiesToTest.length,
};

}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  scrapeFever().catch((error) => {
    console.error("Error fatal:", error);
    process.exitCode = 1;
  });
}
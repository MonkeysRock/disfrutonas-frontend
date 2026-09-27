import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
import * as cheerio from "cheerio";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const LIST_URL =
  "https://www.carreraspopulares.com/calendario_carreras/lista";

const SOURCE = "carreraspopulares";

// PRIMERA PRUEBA: solo guardamos 1 carrera.
// Cuando comprobemos Supabase, lo quitamos.
const TEST_LIMIT = null;

if (!SUPABASE_URL) {
  throw new Error("Falta SUPABASE_URL en .env");
}

if (!SUPABASE_KEY) {
  throw new Error("Falta SUPABASE_KEY en .env");
}

const MONTHS = {
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  septiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
};

function cleanText(value = "") {
  return String(value || "")
    .replace(/\u00a0/g, " ")
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
    .replace(/\bentradas?\b/g, "")
    .replace(/\binscripciones?\b/g, "")
    .replace(/\bcarrera popular\b/g, "")
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

function getSupabaseHeaders(extraHeaders = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
}

function parseSpanishDate(text) {
  const match = String(text || "").match(
    /(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+(\d{1,2})\s+(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?(\d{4})/i
  );

  if (!match) return null;

  const day = match[1].padStart(2, "0");
  const month = MONTHS[match[2].toLowerCase()];
  const year = match[3];

  return `${year}-${month}-${day}`;
}

function findEventContainer($, element) {
  let current = $(element);

  for (let i = 0; i < 8; i++) {
    current = current.parent();

    if (!current.length) break;

    const text = cleanText(current.text());

    const hasDate =
      /(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+\d{1,2}\s+/i.test(
        text
      );

    if (hasDate) {
      return current;
    }
  }

  return null;
}

function extractSourceId(url) {
  try {
    const parsed = new URL(url);

    return parsed.pathname
      .replace(/\/+$/, "")
      .toLowerCase();
  } catch {
    return slugify(url);
  }
}

async function getHtml(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/152 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "es-ES,es;q=0.9",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Error descargando ${url}: ${response.status}`
    );
  }

  return response.text();
}

async function fetchEventDetails(url) {
  const html = await getHtml(url);
  const $ = cheerio.load(html);

  const pageText = cleanText($("body").text());

  const timeMatch = pageText.match(
    /Fecha:.*?(?:a partir de las|a las)\s+(\d{1,2}:\d{2})\s*h?/i
  );

  const time = timeMatch ? timeMatch[1] : null;

  let image = null;

  const ogImage = $('meta[property="og:image"]').attr(
    "content"
  );

  if (ogImage) {
    image = new URL(ogImage, url).href;
  } else {
    const firstImage = $("img")
      .map((_, img) => $(img).attr("src"))
      .get()
      .find(
        (src) =>
          src &&
          !src.includes("logo") &&
          !src.includes("icon")
      );

    if (firstImage) {
      image = new URL(firstImage, url).href;
    }
  }

  // Quitamos carteles genéricos.
  if (
    image &&
    (image.includes("/carteles_def/") ||
      image.includes("cartel_def_"))
  ) {
    image = null;
  }

  let price = null;
  let isFree = false;
  let priceLabel = null;

  const freeMatch = pageText.match(
    /inscripci[oó]n\s+gratuita|inscripciones?\s+gratuitas?|participaci[oó]n\s+gratuita/i
  );

  if (freeMatch) {
    isFree = true;
    price = 0;
    priceLabel = "Gratis";
  } else {
    const priceMatch = pageText.match(
      /(?:precio|inscripci[oó]n|cuota)[^€]{0,80}?(\d+(?:[.,]\d{1,2})?)\s*€/i
    );

    if (priceMatch) {
      price = Number(
        priceMatch[1].replace(",", ".")
      );

      priceLabel = `Desde ${price} €`;
    }
  }

  const distanceMatch = pageText.match(
    /Distancia:\s*(.+?)(?=Modalidad:|Organiza:|Info\. evento|$)/i
  );

  const modalityMatch = pageText.match(
    /Modalidad:\s*([\s\S]{1,250}?)(?=Organiza:|Periodo de inscripción:|Info\. evento|Inscríbete|Me gusta|Te puede interesar|También te puede interesar|Artículos relacionados|Entrenamientos|Consejos para salir a correr|googletag|$)/i
  );

  const organizerMatch = pageText.match(
    /Organiza:\s*(.+?)(?=Distancia:|Modalidad:|Info\. evento|$)/i
  );

  return {
    distance: distanceMatch
      ? cleanText(distanceMatch[1])
      : null,

    modality: modalityMatch
      ? cleanText(modalityMatch[1])
      : null,

    organizer: organizerMatch
      ? cleanText(organizerMatch[1])
      : null,

    time,
    image,
    price,
    is_free: isFree,
    price_label: priceLabel,
  };
}

async function getBaseEvents() {
  console.log("🏃 Descargando CarrerasPopulares...");

  const html = await getHtml(LIST_URL);

  console.log(
    `✅ HTML descargado: ${html.length} caracteres`
  );

  const $ = cheerio.load(html);

  const events = [];
  const seen = new Set();

  $("a[href*='/carrera/']").each((_, element) => {
    const anchor = $(element);

    const title = cleanText(anchor.text());
    const href = anchor.attr("href");

    if (!title || !href) return;

    if (
      /info\.?\s*evento/i.test(title) ||
      /más información/i.test(title)
    ) {
      return;
    }

    const detailUrl = new URL(
      href,
      LIST_URL
    ).href;

    if (seen.has(detailUrl)) return;

    const container = findEventContainer(
      $,
      element
    );

    if (!container) return;

    const text = cleanText(container.text());

    const date = parseSpanishDate(text);

    if (!date) return;

    let city = null;
    let province = null;

    const locationMatch = text.match(
      /(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+\d{1,2}\s+(?:de\s+)?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?\d{4}\s+(.+?)\s+\(([^)]+)\)/i
    );

    if (locationMatch) {
      city = cleanText(locationMatch[1]);
      province = cleanText(locationMatch[2]);
    }

    if (!city) return;

    let registrationUrl = null;

    container.find("a").each((_, link) => {
      const linkText = cleanText($(link).text());

      if (/inscr[ií]bete/i.test(linkText)) {
        const regHref = $(link).attr("href");

        if (regHref) {
          registrationUrl = new URL(
            regHref,
            LIST_URL
          ).href;
        }
      }
    });

    seen.add(detailUrl);

    events.push({
      title,
      date,
      city,
      province,
      detail_url: detailUrl,
      registration_url: registrationUrl,
    });
  });

  return events;
}

function getTodaySpainYmd() {
  const parts = new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(new Date());

  const year = parts.find(
    (p) => p.type === "year"
  )?.value;

  const month = parts.find(
    (p) => p.type === "month"
  )?.value;

  const day = parts.find(
    (p) => p.type === "day"
  )?.value;

  return `${year}-${month}-${day}`;
}

function buildSupabaseEvent(baseEvent, details) {
  const place =
    details.organizer ||
    baseEvent.city ||
    "Lugar por confirmar";

  const descriptionParts = [
    baseEvent.title,
    details.distance
      ? `Distancia: ${details.distance}.`
      : null,
    details.modality
      ? `Modalidad: ${details.modality}.`
      : null,
    details.organizer
      ? `Organiza: ${details.organizer}.`
      : null,
  ].filter(Boolean);

  const sourceUrl =
    baseEvent.registration_url ||
    baseEvent.detail_url;

  const event = {
    title: baseEvent.title,

    slug: slugify(
      `${baseEvent.title}-${baseEvent.date}-${baseEvent.city}`
    ),

    city: baseEvent.city,
    city_slug: slugify(baseEvent.city),

    pillar: "Deportivos",
    pillar_slug: "deportivos",

    category: "Running",
    category_slug: "running",

    subcategory: "Carreras populares",
    subcategory_slug: "carreras-populares",

    event_date: baseEvent.date,
    date: baseEvent.date,
    time: details.time,

    place,

    description:
      descriptionParts.join(" ") ||
      baseEvent.title,

    is_free: details.is_free,
    price: details.price,

    price_label:
      details.price_label ||
      (details.is_free
        ? "Gratis"
        : "Consultar"),

    image: details.image,
    image_alt: baseEvent.title,
    image_label: "Running",
    image_sub_label:
      details.modality ||
      "Carreras populares",

    lat: null,
    lng: null,

    source: SOURCE,

    // ID estable de la ficha de CarrerasPopulares.
    source_id: extractSourceId(
      baseEvent.detail_url
    ),

    // Para el usuario preferimos el enlace directo
    // de inscripción cuando exista.
    source_url: sourceUrl,

    last_seen_at: new Date().toISOString(),
  };

  event.fingerprint =
    buildEventFingerprint(event);

  return event;
}

async function findDuplicateEvent(event) {
  const fingerprintUrl = new URL(
    `${SUPABASE_URL}/rest/v1/events`
  );

  fingerprintUrl.searchParams.set(
    "fingerprint",
    `eq.${event.fingerprint}`
  );

  fingerprintUrl.searchParams.set(
    "select",
    "id,title,slug,event_date,city,place,price,source,source_id,fingerprint"
  );

  fingerprintUrl.searchParams.set(
    "limit",
    "1"
  );

  const fingerprintResponse = await fetch(
    fingerprintUrl,
    {
      headers: getSupabaseHeaders(),
      cache: "no-store",
    }
  );

  if (!fingerprintResponse.ok) {
    throw new Error(
      `Error buscando fingerprint: ${fingerprintResponse.status} ${await fingerprintResponse.text()}`
    );
  }

  const fingerprintRows =
    await fingerprintResponse.json();

  if (fingerprintRows.length > 0) {
    return {
      event: fingerprintRows[0],
      matchedBy: "fingerprint",
    };
  }

  const slugUrl = new URL(
    `${SUPABASE_URL}/rest/v1/events`
  );

  slugUrl.searchParams.set(
    "slug",
    `eq.${event.slug}`
  );

  slugUrl.searchParams.set(
    "select",
    "id,title,slug,event_date,city,place,price,source,source_id,fingerprint"
  );

  slugUrl.searchParams.set(
    "limit",
    "1"
  );

  const slugResponse = await fetch(
    slugUrl,
    {
      headers: getSupabaseHeaders(),
      cache: "no-store",
    }
  );

  if (!slugResponse.ok) {
    throw new Error(
      `Error buscando slug: ${slugResponse.status} ${await slugResponse.text()}`
    );
  }

  const slugRows =
    await slugResponse.json();

  if (slugRows.length > 0) {
    return {
      event: slugRows[0],
      matchedBy: "slug",
    };
  }

  return null;
}

function chooseLowestPrice(
  existingPrice,
  scrapedPrice
) {
  const validPrices = [
    existingPrice,
    scrapedPrice,
  ].filter(
    (price) =>
      typeof price === "number" &&
      Number.isFinite(price)
  );

  if (!validPrices.length) {
    return null;
  }

  return Math.min(...validPrices);
}

async function updateDuplicateEvent(
  existing,
  scrapedEvent
) {
  const lowestPrice = chooseLowestPrice(
    existing.price,
    scrapedEvent.price
  );

  const updatedEvent = {
    ...scrapedEvent,

    // Conservamos la URL pública existente.
    slug: existing.slug,

    price: lowestPrice,

    price_label:
      lowestPrice !== null
        ? `Desde ${lowestPrice} €`
        : scrapedEvent.is_free
          ? "Gratis"
          : "Consultar",

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
        Prefer:
          "resolution=merge-duplicates,return=minimal",
      }),

      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Error haciendo upsert: ${response.status} ${await response.text()}`
    );
  }
}

async function saveEvent(event) {
  const duplicate =
    await findDuplicateEvent(event);

  if (duplicate) {
    await updateDuplicateEvent(
      duplicate.event,
      event
    );

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

export async function scrape({
  limit = TEST_LIMIT,
} = {}) {
  console.log(
    "🚀 Scraper CarrerasPopulares iniciado"
  );

  const baseEvents =
    await getBaseEvents();

  console.log(
    `🏁 Carreras detectadas: ${baseEvents.length}`
  );

  const today = getTodaySpainYmd();

  const candidates = baseEvents
    .filter(
      (event) =>
        event.date &&
        event.date >= today
    )
    .slice(0, limit || undefined);

  console.log(
    `🧪 Carreras a procesar en esta ejecución: ${candidates.length}`
  );

  let insertedOrUpdated = 0;
  let duplicatesUpdated = 0;
  let skipped = 0;
  let errors = 0;

  for (const baseEvent of candidates) {
    try {
      console.log(
        `\n🔎 Procesando: ${baseEvent.title}`
      );

      const details =
        await fetchEventDetails(
          baseEvent.detail_url
        );

      const event =
        buildSupabaseEvent(
          baseEvent,
          details
        );

      console.dir(event, {
        depth: null,
      });

      const result =
        await saveEvent(event);

      if (
        result.status ===
        "duplicate-updated"
      ) {
        duplicatesUpdated++;

        console.log(
          `♻️ Duplicado actualizado por ${result.matchedBy}:`,
          event.title
        );
      } else {
        insertedOrUpdated++;

        console.log(
          "✅ Guardado/actualizado:",
          event.title
        );
      }
    } catch (error) {
      errors++;

      console.error(
        "❌ Error guardando carrera:",
        baseEvent.title,
        error.message
      );
    }
  }

  console.log(
    "\n✔ Scraper CarrerasPopulares terminado"
  );

  console.log(
    "Guardados/actualizados:",
    insertedOrUpdated
  );

  console.log(
    "Duplicados actualizados:",
    duplicatesUpdated
  );

  console.log(
    "Ignorados:",
    skipped
  );

  console.log(
    "Errores:",
    errors
  );

  return {
    detected: baseEvents.length,
    processed: candidates.length,
    insertedOrUpdated,
    duplicatesUpdated,
    skipped,
    errors,
  };
}

// Permite probarlo directamente con:
// node scraper-carreras-populares/index.mjs
if (
  import.meta.url ===
  `file://${process.argv[1]}`
) {
  scrape().catch((error) => {
    console.error(
      "❌ Error general:",
      error
    );

    process.exit(1);
  });
}
import "dotenv/config";
import axios from "axios";
import * as cheerio from "cheerio";
import {
  CITY_SEARCH_NAMES,
  getCanonicalCityName,
} from "./data/cities.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const BASE_URL = "https://ticketrona.com";
const START_URL = `${BASE_URL}/conciertos`;
const MAX_PAGES = 84;

if (!SUPABASE_URL) throw new Error("Falta SUPABASE_URL en .env");
if (!SUPABASE_KEY) throw new Error("Falta SUPABASE_KEY en .env");

function cleanText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function cleanEventTitle(title) {
  return cleanText(title)
    .replace(/^consigue tus entradas para\s+/i, "")
    .replace(/^entradas para\s+/i, "")
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

function extractSourceId(url) {
  try {
    const parsed = new URL(url);

    return parsed.pathname.replace(/\/+$/, "").toLowerCase();
  } catch {
    return slugify(url);
  }
}

function normalizeForFingerprint(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bconsigue tus entradas para\b/g, "")
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

function absoluteUrl(href) {
  if (!href) return null;
  if (href.startsWith("http")) return href;

  return new URL(href, BASE_URL).toString();
}

function parseDate(text) {
  const match = String(text || "").match(/(\d{2})-(\d{2})-(\d{2,4})/);

  if (!match) return null;

  const day = match[1];
  const month = match[2];
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];

  return `${year}-${month}-${day}`;
}

function parsePrice(text) {
  const match = String(text || "")
    .replace(",", ".")
    .match(/(\d+(?:\.\d+)?)/);

  return match ? Number(match[1]) : null;
}

function parseLocation(locationText, title) {
  const parts = String(locationText || "")
    .split(",")
    .map(cleanText)
    .filter(Boolean);

  const knownCities = CITY_SEARCH_NAMES;

  const normalize = (value) => slugify(value);

  let city = null;
  let place = null;

  const cityFromLocation = parts.find((part) =>
    knownCities.some((cityName) => normalize(part) === normalize(cityName))
  );

  if (cityFromLocation) {
    city = cityFromLocation;
  } else {
    const cityFromTitle = knownCities.find((cityName) =>
      normalize(title).includes(`en-${normalize(cityName)}`)
    );

    city = cityFromTitle || parts[parts.length - 1] || null;
  }

  place =
    parts.find((part) => normalize(part) !== normalize(city)) ||
    city ||
    "Lugar por confirmar";

  if (place?.toLowerCase().startsWith("desde")) {
    place = city || "Lugar por confirmar";
  }

  city = getCanonicalCityName(city);

  return {
    city,
    place,
    address: parts.join(", "),
  };
}

function getSupabaseHeaders(extraHeaders = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
}

async function getHtml(url) {
  const { data } = await axios.get(url, {
    timeout: 25000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36",
      "Accept-Language": "es-ES,es;q=0.9",
    },
  });

  return data;
}

async function getEventDetail(url) {
  try {
    const html = await getHtml(url);
    const $ = cheerio.load(html);

    const rawTitle =
      cleanText($("meta[property='og:title']").attr("content")) ||
      cleanText($("meta[name='twitter:title']").attr("content")) ||
      cleanText($("h1").first().text());

    const title = cleanEventTitle(rawTitle);

    const description =
      cleanText($("meta[name='description']").attr("content")) ||
      cleanText($("meta[property='og:description']").attr("content")) ||
      cleanText($("meta[name='twitter:description']").attr("content"));

    let image =
      $("meta[property='og:image']").attr("content") ||
      $("meta[name='twitter:image']").attr("content") ||
      null;

    if (!image) {
      const imgs = $("img")
        .toArray()
        .map((img) => absoluteUrl($(img).attr("src")))
        .filter(Boolean)
        .filter((src) => !src.includes("logo"))
        .filter((src) => !src.includes("icon"))
        .filter((src) => !src.includes("svg"));

      image = imgs[0] || null;
    }

    return {
      title: title || null,
      description: description || null,
      image: image ? absoluteUrl(image) : null,
    };
  } catch (error) {
    console.log("⚠️ No pude leer detalle:", url, error.message);

    return {};
  }
}

function getCandidateCards($) {
  const cards = [];

  $("article, li, div").each((_, el) => {
    const $el = $(el);
    const text = cleanText($el.text());

    if (!text.includes("Inicio")) return;
    if (!text.includes("Fin")) return;
    if (!text.includes("Desde")) return;
    if (!text.includes("ENTRADAS")) return;

    const childHasSame = $el
      .children()
      .toArray()
      .some((child) => {
        const childText = cleanText($(child).text());

        return (
          childText.includes("Inicio") &&
          childText.includes("Fin") &&
          childText.includes("Desde") &&
          childText.includes("ENTRADAS")
        );
      });

    if (childHasSame) return;

    cards.push(el);
  });

  return cards;
}

function extractEventsFromPage(html, pageUrl) {
  const $ = cheerio.load(html);
  const cards = getCandidateCards($);
  const events = [];

  for (const card of cards) {
    const $card = $(card);

    const lines = $card
      .text()
      .split("\n")
      .map(cleanText)
      .filter(Boolean);

    const startIndex = lines.findIndex((line) =>
      /^Inicio\s+\d{2}-\d{2}-\d{2,4}/.test(line)
    );

    if (startIndex <= 0) continue;

    const rawTitle = lines[startIndex - 1];
    const title = cleanEventTitle(rawTitle);

    const startDate = parseDate(lines[startIndex]);
    const locationText = lines[startIndex + 2] || "";
    const priceLine = lines.find((line) => line.startsWith("Desde")) || "";

    if (!title || !startDate) continue;
    if (title.toLowerCase() === "conciertos") continue;
    if (title.toLowerCase() === "entradas") continue;

    const price = parsePrice(priceLine);
    const { city, place, address } = parseLocation(locationText, title);

    if (!city || city.toLowerCase() === "s/n") {
      console.log("⏭️ Ignorado sin ciudad buena:", title, locationText);
      continue;
    }

    const img = absoluteUrl($card.find("img").first().attr("src"));

    const link =
      absoluteUrl(
        $card
          .find("a")
          .filter((_, a) =>
            cleanText($(a).text()).toLowerCase().includes("entradas")
          )
          .first()
          .attr("href")
      ) ||
      absoluteUrl($card.find("a").first().attr("href")) ||
      pageUrl;

    const eventSlug = slugify(`${title}-${startDate}-${city}`);

    const event = {
      title,
      slug: eventSlug,

      city,
      city_slug: slugify(city),

      pillar: "Culturales",
      pillar_slug: "culturales",

      category: "Conciertos",
      category_slug: "conciertos",

      subcategory: "General",
      subcategory_slug: "general",

      event_date: startDate,
      date: startDate,
      time: null,

      place,
      description: `${title}${address ? ` — ${address}` : ""}`,

      is_free: price === 0,
      price,
      price_label: price !== null ? `Desde ${price} €` : "Consultar",

      image: img,
      image_alt: title,
      image_label: "Conciertos",
      image_sub_label: title,

      lat: null,
      lng: null,

      source: "ticketrona",
      source_id: extractSourceId(link),
      source_url: link,
      last_seen_at: new Date().toISOString(),
    };

    event.fingerprint = buildEventFingerprint(event);

    events.push(event);
  }

  return events;
}

/**
 * Busca el evento primero por su huella exacta:
 *
 * título normalizado + fecha + ciudad + recinto.
 *
 * Después busca por slug para cubrir eventos antiguos que todavía
 * no tengan fingerprint.
 */
async function findDuplicateEvent(event) {
  const fingerprintResponse = await axios.get(
    `${SUPABASE_URL}/rest/v1/events`,
    {
      params: {
        fingerprint: `eq.${event.fingerprint}`,
        select:
          "id,title,slug,event_date,city,place,price,source,source_id,fingerprint",
        limit: 1,
      },
      headers: getSupabaseHeaders(),
    }
  );

  if (fingerprintResponse.data.length > 0) {
    return {
      event: fingerprintResponse.data[0],
      matchedBy: "fingerprint",
    };
  }

  const slugResponse = await axios.get(
    `${SUPABASE_URL}/rest/v1/events`,
    {
      params: {
        slug: `eq.${event.slug}`,
        select:
          "id,title,slug,event_date,city,place,price,source,source_id,fingerprint",
        limit: 1,
      },
      headers: getSupabaseHeaders(),
    }
  );

  if (slugResponse.data.length > 0) {
    return {
      event: slugResponse.data[0],
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

    // Conservamos el slug que ya está publicado en vuestra web.
    slug: existing.slug,

    // En la beta mostramos el precio más barato conocido.
    price: lowestPrice,
    price_label:
      lowestPrice !== null ? `Desde ${lowestPrice} €` : "Consultar",

    // Actualizamos la fecha de última comprobación.
    last_seen_at: new Date().toISOString(),
  };

  await axios.patch(
    `${SUPABASE_URL}/rest/v1/events?id=eq.${existing.id}`,
    updatedEvent,
    {
      headers: getSupabaseHeaders({
        Prefer: "return=minimal",
      }),
    }
  );
}

async function upsertEventBySource(event) {
  await axios.post(
    `${SUPABASE_URL}/rest/v1/events?on_conflict=source,source_id`,
    event,
    {
      headers: getSupabaseHeaders({
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
    }
  );
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
function getTodaySpainYmd() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year").value;
  const month = parts.find((p) => p.type === "month").value;
  const day = parts.find((p) => p.type === "day").value;

  return `${year}-${month}-${day}`;
}

export async function scrape({
  startPage = 1,
  endPage = MAX_PAGES,
} = {}) {
  const firstPage = Math.max(1, Number(startPage) || 1);
  const lastPage = Math.min(
    MAX_PAGES,
    Math.max(firstPage, Number(endPage) || MAX_PAGES)
  );
console.log(
  `🚀 Scraper Ticketrona iniciado — páginas ${firstPage} a ${lastPage}`
);

  let insertedOrUpdated = 0;
  let duplicatesUpdated = 0;
  let skipped = 0;
  let errors = 0;
  let reachedEnd = false;

  const today = getTodaySpainYmd();

  for (let page = firstPage; page <= lastPage; page++) {
    const pageUrl = page === 1 ? START_URL : `${START_URL}/page/${page}`;

    console.log(`\n📄 Página ${page}: ${pageUrl}`);

    let html;

    try {
      html = await getHtml(pageUrl);
    } catch (error) {
      errors++;

      console.error(
        `❌ Error leyendo la página ${page}:`,
        error.response?.data || error.message
      );

      continue;
    }

    const events = extractEventsFromPage(html, pageUrl);

   if (!events.length) {
  console.log("Sin eventos. Hemos llegado al final.");
  reachedEnd = true;
  break;
}

    console.log(`Eventos encontrados: ${events.length}`);

    for (const event of events) {
     if (!event.event_date || event.event_date < today) {
  skipped++;
  console.log("⏭ Evento pasado:", event.title, event.event_date);
  continue;

     }
      try {
        const detail = await getEventDetail(event.source_url);

        if (detail.title) {
          event.title = cleanEventTitle(detail.title);
          event.image_alt = event.title;
          event.image_sub_label = event.title;

          event.slug = slugify(
            `${event.title}-${event.event_date}-${event.city}`
          );
        }

        if (detail.description) {
          event.description = cleanText(detail.description);
        }

        if (detail.image) {
          event.image = detail.image;
        }

        event.last_seen_at = new Date().toISOString();
        event.fingerprint = buildEventFingerprint(event);

        const result = await saveEvent(event);

        if (result.status === "duplicate-updated") {
          duplicatesUpdated++;

          console.log(
            `♻️ Duplicado actualizado por ${result.matchedBy}:`,
            event.title,
            event.event_date,
            event.city,
            event.place
          );
        } else {
          insertedOrUpdated++;

          console.log(
            "✅ Guardado/actualizado:",
            event.title,
            event.event_date,
            event.city
          );
        }
      } catch (error) {
        errors++;

        console.error(
          "❌ Error guardando:",
          event.title,
          error.response?.data || error.message
        );
      }
    }
  }

  console.log("\n✔ Scraper Ticketrona terminado");
  console.log("Guardados/actualizados por fuente:", insertedOrUpdated);
  console.log("Duplicados detectados y actualizados:", duplicatesUpdated);
  console.log("Eventos antiguos ignorados:", skipped);
  console.log("Errores:", errors);

 return {
  startPage: firstPage,
  endPage: lastPage,
  insertedOrUpdated,
  duplicatesUpdated,
  skipped,
  errors,
  reachedEnd,
};
}


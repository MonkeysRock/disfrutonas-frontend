import "dotenv/config";
import axios from "axios";
import * as cheerio from "cheerio";

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
  const match = String(text || "").replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function parseLocation(locationText, title) {
  const parts = String(locationText || "")
    .split(",")
    .map(cleanText)
    .filter(Boolean);

  let city = null;
  let place = null;

  const titleCityMatch = title.match(/\ben\s+(.+)$/i);
  if (titleCityMatch) city = cleanText(titleCityMatch[1]);

  if (!city && parts.length) city = parts[parts.length - 1];

  if (parts.length >= 2) {
    place = parts[1];
  } else {
    place = parts[0] || city;
  }

  if (place?.toLowerCase().startsWith("desde")) {
    place = parts[0] || city;
  }

  return {
    city,
    place,
    address: parts.join(", "),
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

    const childHasSame = $el.children().toArray().some((child) => {
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

    events.push({
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

      source_url: `${link}#${eventSlug}`,
    });
  }

  return events;
}

async function saveEvent(event) {
  await axios.post(
    `${SUPABASE_URL}/rest/v1/events?on_conflict=source_url`,
    event,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
    }
  );
}

async function scrape() {
  console.log("🚀 Scraper Ticketrona iniciado");

  let saved = 0;
  let skipped = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (let page = 1; page <= MAX_PAGES; page++) {
    const pageUrl = page === 1 ? START_URL : `${START_URL}/page/${page}`;

    console.log(`\n📄 Página ${page}: ${pageUrl}`);

    const html = await getHtml(pageUrl);
    const events = extractEventsFromPage(html, pageUrl);

    if (!events.length) {
      console.log("Sin eventos. Paramos.");
      break;
    }

    console.log(`Eventos encontrados: ${events.length}`);

    for (const event of events) {
      if (event.event_date < today) {
        skipped++;
        continue;
      }

      try {
        const detailUrl = event.source_url.split("#")[0];
        const detail = await getEventDetail(detailUrl);

        if (detail.title) {
          event.title = cleanEventTitle(detail.title);
          event.image_alt = event.title;
          event.image_sub_label = event.title;
          event.slug = slugify(`${event.title}-${event.event_date}-${event.city}`);
        }

        if (detail.description) {
          event.description = cleanEventTitle(detail.description);
        }

        if (detail.image) {
          event.image = detail.image;
        }

        await saveEvent(event);
        saved++;
        console.log("✅ Guardado:", event.title, event.event_date, event.city);
      } catch (error) {
        skipped++;
        console.error(
          "❌ Error guardando:",
          event.title,
          error.response?.data || error.message
        );
      }
    }
  }

  console.log("\n✔ Scraper Ticketrona terminado");
  console.log("Guardados:", saved);
  console.log("Ignorados:", skipped);
}

scrape().catch((error) => {
  console.error("Error general:", error.response?.data || error.message);
});
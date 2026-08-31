import { FESTIVALS } from "./festivals-data.mjs";
import { extractFestivalDetails } from "./scrape-detail.mjs";
import * as cheerio from "cheerio";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const REQUEST_DELAY_MS = 1200;

function getSupabaseHeaders(extraHeaders = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
}

async function upsertFestivalEvent(event) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Faltan SUPABASE_URL o SUPABASE_KEY"
    );
  }

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
    const errorText = await response.text();

    throw new Error(
      `Error guardando festival en Supabase: ${response.status} ${errorText}`
    );
  }

  return true;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapFestivalToEvent({
  festival,
  details,
  sourceUrl,
}) {
  const title = `${festival.name} ${details.watch_year}`;

  return {
    title,

    slug: slugify(
      `${festival.name}-${details.watch_year}-${festival.city}`
    ),

    city: festival.city,
    city_slug: slugify(festival.city),

    pillar: "Culturales",
    pillar_slug: "culturales",

    category: "Festivales",
    category_slug: "festivales",

    subcategory:
      festival.subcategories?.[0] || "General",

    subcategory_slug:
      festival.subcategory_slugs?.[0] || "general",

    event_date: details.start_date,
end_date: details.end_date,
date: details.start_date,

    time: null,

    place:
      details.place || "Por confirmar",

    description:
      `${festival.name} ${details.watch_year} en ${festival.city}.`,

    is_free: false,

    price: null,
    price_label: "Consultar",

    image: null,
    image_alt: title,
    image_label: "Festivales",
    image_sub_label: festival.name,

    lat: null,
    lng: null,

    source: "festival-official",

    source_id: slugify(
      `${festival.name}-${details.watch_year}`
    ),

    source_url:
      sourceUrl || festival.official_url,

    last_seen_at: new Date().toISOString(),
  };
}

async function fetchFestivalPage(festival) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000);

  try {
    const response = await fetch(festival.official_url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DisfrutonasFestivalBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    return {
      ok: true,
      status: response.status,
      finalUrl: response.url,
      html,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      finalUrl: festival.official_url,
      html: "",
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function detectYear(html, year) {
  if (!html) return false;

  const normalized = normalizeText(html);

  return normalized.includes(String(year));
}

function detectConfirmedStatus(festival, html) {
  const hasWatchYear = detectYear(
    html,
    festival.watch_year
  );

  if (hasWatchYear) {
    return "possible-2027";
  }

  return festival.status || "watching";
}

const MAX_INTERNAL_LINKS = 8;

function getCandidateInternalLinks(html, baseUrl, targetYear) {
  const $ = cheerio.load(html);

  const base = new URL(baseUrl);
  const links = new Map();

  const keywords = [
    String(targetYear),
    "entradas",
    "entrada",
    "tickets",
    "ticket",
    "noticias",
    "noticia",
    "news",
    "festival",
    "proxima-edicion",
    "proxima",
    "next-edition",
    "preventa",
    "abonos",
  ];

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    const anchorText = $(element)
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    if (!href) return;

    try {
      const url = new URL(href, baseUrl);

      // Solo enlaces de la misma web.
      if (url.hostname !== base.hostname) {
        return;
      }

      // Quitamos anchors.
      url.hash = "";

      const fullUrl = url.href;

      // Evitamos volver a comprobar la home.
      if (
        fullUrl === base.href ||
        fullUrl === `${base.origin}/`
      ) {
        return;
      }

      const haystack =
        `${url.pathname} ${url.search} ${anchorText}`.toLowerCase();

      const score = keywords.reduce(
        (total, keyword) =>
          haystack.includes(keyword.toLowerCase())
            ? total + 1
            : total,
        0
      );

      if (score === 0) {
        return;
      }

      const previousScore =
        links.get(fullUrl)?.score ?? -1;

      if (score > previousScore) {
        links.set(fullUrl, {
          url: fullUrl,
          score,
        });
      }
    } catch {
      // Ignoramos href inválidos.
    }
  });

  return [...links.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_INTERNAL_LINKS)
    .map((item) => item.url);
}

async function findFestival2027InInternalPages(
  festival,
  homepageHtml
) {
  const candidateLinks =
    getCandidateInternalLinks(
      homepageHtml,
      festival.official_url,
      festival.watch_year
    );

  if (candidateLinks.length === 0) {
    return {
      found: false,
      details: null,
      sourceUrl: null,
      checked: 0,
    };
  }

  console.log(
    `   🔗 Enlaces internos candidatos: ${candidateLinks.length}`
  );

  for (const url of candidateLinks) {
    console.log(`      ↳ ${url}`);

    const page = await fetchFestivalPage({
      ...festival,
      official_url: url,
    });

    if (!page.ok) {
      console.log(
        `        ❌ ${page.error}`
      );

      await sleep(400);
      continue;
    }

    const details =
      extractFestivalDetails({
        html: page.html,
        festival,
      });

    if (details.readyToCreate) {
      console.log(
        `        🎯 Fecha 2027 encontrada: ${details.start_date} → ${details.end_date}`
      );

      return {
        found: true,
        details,
        sourceUrl: page.finalUrl || url,
        checked: candidateLinks.indexOf(url) + 1,
      };
    }

    await sleep(400);
  }

  return {
    found: false,
    details: null,
    sourceUrl: null,
    checked: candidateLinks.length,
  };
}

export async function checkFestivals({
  start = 0,
  limit = FESTIVALS.length,
} = {}) {
  const enabledFestivals = FESTIVALS.filter(
    (festival) => festival.enabled
  );

  const festivalsToCheck = enabledFestivals.slice(
    start,
    start + limit
  );

  console.log(
    `\n🎪 Comprobando ${festivalsToCheck.length} festivales`
  );
  console.log(
    `📍 Desde índice ${start}`
  );
  console.log("");

  const results = [];

  for (let i = 0; i < festivalsToCheck.length; i++) {
    const festival = festivalsToCheck[i];
    const globalIndex = start + i;

    console.log(
      `[${globalIndex + 1}/${enabledFestivals.length}] ${festival.name}`
    );

    console.log(
      `   🌐 ${festival.official_url}`
    );

    const page = await fetchFestivalPage(festival);

    if (!page.ok) {
      console.log(
        `   ❌ Error: ${page.error}`
      );

      results.push({
        name: festival.name,
        city: festival.city,
        url: festival.official_url,
        ok: false,
        status: festival.status,
        detected2027: false,
        error: page.error,
      });

      await sleep(REQUEST_DELAY_MS);
      continue;
    }

const details = extractFestivalDetails({
  html: page.html,
  festival,
});

let finalDetails = details;
let detectedSourceUrl = page.finalUrl;

if (!details.readyToCreate) {
  const internalResult =
    await findFestival2027InInternalPages(
      festival,
      page.html
    );

  if (internalResult.found) {
    finalDetails = internalResult.details;
    detectedSourceUrl =
      internalResult.sourceUrl;
  }
}

console.log(
  finalDetails.readyToCreate
    ? `   📅 Fecha válida: ${finalDetails.start_date} → ${finalDetails.end_date}`
    : `   ⏳ Todavía sin fecha válida ${festival.watch_year}`
);

const detected2027 =
  finalDetails.hasValidDate;

 const detectedStatus =
  finalDetails.readyToCreate
    ? "confirmed"
    : "watching";

 if (finalDetails.readyToCreate) {
  const event = mapFestivalToEvent({
    festival,
    details: finalDetails,
    sourceUrl: detectedSourceUrl,
  });

  await upsertFestivalEvent(event);

  console.log(
    `   💾 Guardado en Supabase: ${event.title}`
  );
}

    console.log(
      `   ✅ HTTP ${page.status}`
    );

    console.log(
      detected2027
        ? `   🔥 Detectado ${festival.watch_year}`
        : `   👀 Sin referencia a ${festival.watch_year}`
    );

    results.push({
      name: festival.name,
      city: festival.city,
      province: festival.province,
      url: festival.official_url,
     finalUrl: detectedSourceUrl,
      ok: true,
      status: detectedStatus,
      detected2027,
      subcategories: festival.subcategories,
    });

    await sleep(REQUEST_DELAY_MS);
  }

  const online = results.filter(
    (festival) => festival.ok
  ).length;

  const offline = results.filter(
    (festival) => !festival.ok
  ).length;

  const detected2027 = results.filter(
    (festival) => festival.detected2027
  ).length;

  console.log("\n==============================");
  console.log("🎪 RESUMEN FESTIVALES");
  console.log("==============================");
  console.log(`Total comprobados: ${results.length}`);
  console.log(`Webs accesibles: ${online}`);
  console.log(`Webs con error: ${offline}`);
  console.log(
    `Con referencia a 2027: ${detected2027}`
  );
  console.log("==============================\n");

  return {
    total: results.length,
    online,
    offline,
    detected2027,
    results,
  };
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url ===
    new URL(
      `file://${process.argv[1]}`
    ).href;

if (isDirectRun) {
  const start = Number(
    process.argv[2] ?? 0
  );

  const limit = Number(
    process.argv[3] ?? FESTIVALS.length
  );

  checkFestivals({
    start,
    limit,
  }).catch((error) => {
    console.error(
      "❌ Error fatal:",
      error
    );

    process.exitCode = 1;
  });
}
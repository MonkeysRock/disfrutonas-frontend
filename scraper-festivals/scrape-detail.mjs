import * as cheerio from "cheerio";


const MONTHS = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function toISODate(year, month, day) {
  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${pad(month)}-${pad(day)}`;
}

function extractJsonLdDates($, targetYear) {
  const dates = [];

  $('script[type="application/ld+json"]').each(
    (_, element) => {
      const raw = $(element).html();

      if (!raw) return;

      try {
        const json = JSON.parse(raw);

        const items = Array.isArray(json)
          ? json
          : json["@graph"]
            ? json["@graph"]
            : [json];

        for (const item of items) {
          if (!item || typeof item !== "object") {
            continue;
          }

          const startDate = item.startDate;
          const endDate = item.endDate;

          if (
            typeof startDate === "string" &&
            startDate.includes(String(targetYear))
          ) {
            dates.push({
              source: "json-ld",
              startDate,
              endDate:
                typeof endDate === "string"
                  ? endDate
                  : null,
            });
          }
        }
      } catch {
        // Algunos sitios tienen JSON-LD inválido.
      }
    }
  );

  return dates;
}

function extractIsoDates(text, targetYear) {
  const results = [];

  const regex = new RegExp(
    `\\b(${targetYear})-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])\\b`,
    "g"
  );

  for (const match of text.matchAll(regex)) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const iso = toISODate(year, month, day);

    if (iso) {
      results.push(iso);
    }
  }

  return results;
}

function extractSpanishDates(text, targetYear) {
  const results = [];

  const monthNames = Object.keys(MONTHS).join("|");

  const regex = new RegExp(
    `\\b([0-3]?\\d)\\s+de\\s+(${monthNames})\\s+(?:de\\s+)?(${targetYear})\\b`,
    "gi"
  );

  for (const match of text.matchAll(regex)) {
    const day = Number(match[1]);
    const monthName = match[2].toLowerCase();
    const year = Number(match[3]);

    const month = MONTHS[monthName];

    const iso = toISODate(year, month, day);

    if (iso) {
      results.push(iso);
    }
  }

  return results;
}

function extractSpanishDateRanges(text, targetYear) {
  const results = [];

  const monthNames = Object.keys(MONTHS).join("|");

  // Ejemplo:
  // 17, 18 y 19 de junio de 2027
  const multipleDaysRegex = new RegExp(
    `\\b([0-3]?\\d)\\s*[,/]\\s*([0-3]?\\d)\\s*(?:y|-)\\s*([0-3]?\\d)\\s+de\\s+(${monthNames})\\s+(?:de\\s+)?(${targetYear})\\b`,
    "gi"
  );

  for (const match of text.matchAll(
    multipleDaysRegex
  )) {
    const days = [
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
    ];

    const month =
      MONTHS[match[4].toLowerCase()];

    const year = Number(match[5]);

    const parsedDates = days
      .map((day) =>
        toISODate(year, month, day)
      )
      .filter(Boolean);

    if (parsedDates.length) {
      results.push(...parsedDates);
    }
  }

  // Ejemplo:
  // 17-19 de junio de 2027
  // 17 al 19 de junio de 2027
  const sameMonthRegex = new RegExp(
    `\\b([0-3]?\\d)\\s*(?:-|–|al)\\s*([0-3]?\\d)\\s+de\\s+(${monthNames})\\s+(?:de\\s+)?(${targetYear})\\b`,
    "gi"
  );

  for (const match of text.matchAll(
    sameMonthRegex
  )) {
    const startDay = Number(match[1]);
    const endDay = Number(match[2]);

    const month =
      MONTHS[match[3].toLowerCase()];

    const year = Number(match[4]);

    const startDate = toISODate(
      year,
      month,
      startDay
    );

    const endDate = toISODate(
      year,
      month,
      endDay
    );

    if (startDate && endDate) {
      results.push(startDate, endDate);
    }
  }

  // Ejemplo:
  // 29 de julio al 1 de agosto de 2027
  const differentMonthRegex = new RegExp(
    `\\b([0-3]?\\d)\\s+de\\s+(${monthNames})\\s+(?:-|–|al)\\s+([0-3]?\\d)\\s+de\\s+(${monthNames})\\s+(?:de\\s+)?(${targetYear})\\b`,
    "gi"
  );

  for (const match of text.matchAll(
    differentMonthRegex
  )) {
    const startDay = Number(match[1]);
    const startMonth =
      MONTHS[match[2].toLowerCase()];

    const endDay = Number(match[3]);
    const endMonth =
      MONTHS[match[4].toLowerCase()];

    const year = Number(match[5]);

    const startDate = toISODate(
      year,
      startMonth,
      startDay
    );

    const endDate = toISODate(
      year,
      endMonth,
      endDay
    );

    if (startDate && endDate) {
      results.push(startDate, endDate);
    }
  }

  return results;
}

function uniqueSortedDates(dates) {
  return [...new Set(dates)]
    .filter(Boolean)
    .sort();
}

function normalizeForMatch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function festivalNameMatchesText(festivalName, text) {
  const normalizedName = normalizeForMatch(festivalName);
  const normalizedText = normalizeForMatch(text);

  if (!normalizedName || !normalizedText) {
    return false;
  }

  const nameWords = normalizedName
    .split(" ")
    .filter((word) => word.length >= 4);

  if (nameWords.length === 0) {
    return normalizedText.includes(normalizedName);
  }

  const matchedWords = nameWords.filter((word) =>
    normalizedText.includes(word)
  );

  return matchedWords.length >= Math.min(2, nameWords.length);
}

function getPageIdentityText($) {
  const title = cleanText($("title").first().text());
  const h1 = cleanText($("h1").first().text());

  const ogTitle = cleanText(
    $('meta[property="og:title"]').attr("content")
  );

  const description = cleanText(
    $('meta[name="description"]').attr("content")
  );

  return [title, h1, ogTitle, description]
    .filter(Boolean)
    .join(" ");
}

function isFestivalEditionPage({
  $,
  festival,
  targetYear,
}) {
  const identityText = getPageIdentityText($);

  const normalizedIdentity =
    normalizeForMatch(identityText);

  const normalizedFestivalName =
    normalizeForMatch(festival.name);

  const festivalMatches =
    festivalNameMatchesText(
      festival.name,
      identityText
    );

  const hasYear =
    normalizedIdentity.includes(
      String(targetYear)
    );

  // Para considerar que esta página representa realmente
  // la edición del festival, exigimos una identificación fuerte.
  //
  // Esto evita falsos positivos como:
  // /hakuna/
  // /artista-x/
  // /grupo-y/
  //
  // donde puede aparecer "Icónica Santalucía Sevilla Fest"
  // en la descripción, footer o metadatos,
  // aunque la página sea realmente de un concierto concreto.
  const strongFestivalMatch =
    normalizedFestivalName &&
    (
      normalizedIdentity.startsWith(
        normalizedFestivalName
      ) ||
      normalizedIdentity.includes(
        `${normalizedFestivalName} ${targetYear}`
      ) ||
      normalizedIdentity.includes(
        `${targetYear} ${normalizedFestivalName}`
      )
    );

  return {
    festivalMatches,
    strongFestivalMatch,
    hasYear,

    valid:
      festivalMatches &&
      strongFestivalMatch &&
      hasYear,

    identityText,
  };
}

function extractContextualFestivalDates(
  pageText,
  festival,
  targetYear
) {
  const normalizedText = cleanText(pageText);
  const normalizedFestivalName =
    normalizeForMatch(festival.name);

  if (!normalizedText || !normalizedFestivalName) {
    return [];
  }

  const candidates = uniqueSortedDates([
    ...extractIsoDates(
      normalizedText,
      targetYear
    ),
    ...extractSpanishDates(
      normalizedText,
      targetYear
    ),
    ...extractSpanishDateRanges(
      normalizedText,
      targetYear
    ),
  ]);

  if (candidates.length === 0) {
    return [];
  }

  const festivalWords = normalizedFestivalName
    .split(" ")
    .filter((word) => word.length >= 4);

  const chunks = normalizedText
    .split(/(?<=[.!?])\s+|\n+/)
    .map((chunk) => cleanText(chunk))
    .filter(Boolean);

  const validDates = [];

  for (const chunk of chunks) {
    const normalizedChunk =
      normalizeForMatch(chunk);

    const mentionsFestival =
      festivalWords.length > 0 &&
      festivalWords.filter((word) =>
        normalizedChunk.includes(word)
      ).length >=
        Math.min(2, festivalWords.length);

    const mentionsEdition =
      normalizedChunk.includes(
        String(targetYear)
      ) &&
      (
        normalizedChunk.includes("festival") ||
        normalizedChunk.includes("edicion") ||
        normalizedChunk.includes("edition")
      );

    if (!mentionsFestival && !mentionsEdition) {
      continue;
    }

    const chunkDates = uniqueSortedDates([
      ...extractIsoDates(
        chunk,
        targetYear
      ),
      ...extractSpanishDates(
        chunk,
        targetYear
      ),
      ...extractSpanishDateRanges(
        chunk,
        targetYear
      ),
    ]);

    validDates.push(...chunkDates);
  }

  return uniqueSortedDates(validDates);
}

export function extractFestivalDetails({
  html,
  festival,
}) {
  const $ = cheerio.load(html);

  $("script, style, noscript, svg").remove();

  const pageText = cleanText(
    $("body").text()
  );

  const targetYear =
    Number(festival.watch_year) || 2027;

    const pageIdentity =
  isFestivalEditionPage({
    $,
    festival,
    targetYear,
  });

  const jsonLdDates = extractJsonLdDates(
    $,
    targetYear
  );

const textDates =
  extractContextualFestivalDates(
    pageText,
    festival,
    targetYear
  );

  const jsonDates = [];

  for (const item of jsonLdDates) {
    if (item.startDate) {
      jsonDates.push(
        item.startDate.slice(0, 10)
      );
    }

    if (item.endDate) {
      jsonDates.push(
        item.endDate.slice(0, 10)
      );
    }
  }

  const allDates = uniqueSortedDates([
    ...jsonDates,
    ...textDates,
  ]).filter((date) =>
    date.startsWith(`${targetYear}-`)
  );

  const hasTargetYear =
    pageText.includes(String(targetYear)) ||
    jsonLdDates.length > 0;

  const hasValidDate =
  allDates.length > 0 &&
  pageIdentity.valid;

  return {
  name: festival.name,
  city: festival.city,
  province: festival.province,

  watch_year: targetYear,

  hasTargetYear,
  hasValidDate,

  start_date:
    allDates.length > 0
      ? allDates[0]
      : null,

  end_date:
    allDates.length > 1
      ? allDates[allDates.length - 1]
      : allDates[0] || null,

  detected_dates: allDates,

  place: "Por confirmar",

  subcategories:
    festival.subcategories,

  subcategory_slugs:
    festival.subcategory_slugs,

  official_url:
    festival.official_url,

  readyToCreate:
    hasTargetYear && hasValidDate,

  festivalPageMatch:
    pageIdentity.festivalMatches,

  yearInPageIdentity:
    pageIdentity.hasYear,

  pageIdentityText:
    pageIdentity.identityText,
};
}
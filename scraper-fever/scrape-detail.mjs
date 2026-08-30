import * as cheerio from "cheerio";

function cleanText(value = "") {
  return String(value)
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripEmojis(value = "") {
  return cleanText(value).replace(
    /[\p{Extended_Pictographic}\uFE0F\u200D]/gu,
    ""
  );
}

function cleanVenue(value = "") {
  let venue = stripEmojis(value);

  venue = venue
    .replace(
      /\b(?:experiencia|edad|consulta|puedes consultar|bono cultural|política de menores|accesibilidad|información|entradas?)\b.*$/i,
      ""
    )
    .replace(/\s*👉.*$/u, "")
    .replace(/[|•·]+.*$/g, "")
    .replace(/[,.;:—–-]+\s*$/g, "")
    .trim();

  return venue;
}

function cleanAddress(value = "", venue = "") {
  let address = stripEmojis(value);

  if (
    venue &&
    address.toLowerCase().startsWith(venue.toLowerCase())
  ) {
    address = cleanText(address.slice(venue.length));
  }

  address = address
    .replace(
      /\b(?:experiencia|edad|consulta|puedes consultar|bono cultural|política de menores|accesibilidad|información|entradas?)\b.*$/i,
      ""
    )
    .replace(/\s*👉.*$/u, "")
    .replace(/[|•·]+.*$/g, "")
    .replace(/^[,.;:\s-]+|[,.;:\s-]+$/g, "")
    .trim();

  return address;
}

function normalizeAddress(value = "", venue = "", city = "") {
  let address = cleanAddress(value, venue);

  const removablePrefixes = [
    venue,
    city,
    "Madrid",
    "La Latina",
    "Chamberí",
    "Moncloa",
    "Islas Filipinas",
    "Gran Vía",
    "Ópera",
    "Sol",
    "Tribunal",
    "Colón",
    "Santiago Bernabéu",
    "Lavapiés",
    "Malasaña",
    "Embajadores",
    "Argüelles",
    "Atocha",
    "Retiro",
  ]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const prefix of removablePrefixes) {
    const escapedPrefix = prefix.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    address = address.replace(
      new RegExp(`^${escapedPrefix}\\s+`, "i"),
      ""
    );
  }

  address = address
    // Elimina barrios o estaciones añadidos al final.
    .replace(
      /\s+(La Latina|Chamberí|Moncloa|Islas Filipinas|Gran Vía|Ópera|Sol|Tribunal|Colón|Santiago Bernabéu|Lavapiés|Malasaña|Embajadores|Argüelles|Atocha|Retiro)$/i,
      ""
    )
    // Elimina Madrid repetido al principio.
    .replace(/^Madrid\s+/i, "")
    // Elimina códigos postales duplicados.
    .replace(/\b(\d{5}),\s*\1\b/g, "$1")
    // Normaliza espacios.
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/^[,.;:\s-]+|[,.;:\s-]+$/g, "")
    .trim();

  return address;
}

function splitVenueAndAddress(
  venueValue = "",
  addressValue = ""
) {
  let venue = cleanVenue(venueValue);
  let address = cleanAddress(addressValue, venue);

  const patterns = [
    /\.\s*(C\/|C\.|Calle)\s+/i,
    /\.\s*(Av\.|Avenida)\s+/i,
    /\.\s*(P\.º|Pº|Paseo)\s+/i,
    /\.\s*(Plaza|Pza\.)\s+/i,
    /\.\s*(Carretera|Ctra\.)\s+/i,
    /\.\s*(Ronda)\s+/i,
    /\.\s*(Camino)\s+/i,
  ];

  for (const pattern of patterns) {
    const match = venue.match(pattern);

    if (!match || match.index === undefined) {
      continue;
    }

    const originalVenue = venue;

    venue = cleanVenue(
      originalVenue.slice(0, match.index)
    );

    if (!address) {
      address = cleanAddress(
        originalVenue.slice(match.index + 1),
        venue
      );
    }

    break;
  }

  return {
    venue,
    address,
  };
}

function cleanCity(value = "", fallbackCity = "") {
  let city = stripEmojis(value || fallbackCity);

  city = city
    .replace(/\([^)]*\)/g, "")
    .replace(/\b\d{5}\b/g, "")
    .replace(/[|•·]+.*$/g, "")
    .replace(/^[,.;:\s-]+|[,.;:\s-]+$/g, "")
    .trim();

  return city || fallbackCity;
}

function extractSourceId(url) {
  const match = url.match(/\/m\/(\d+)/);
  return match?.[1] ?? null;
}

function parseSpanishDate(value = "") {
  const months = {
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

  const normalizedValue = cleanText(value).toLowerCase();

  const match = normalizedValue.match(
    /(\d{1,2}) de ([a-záéíóúñ]+) de (\d{4})/
  );

  if (!match) {
    return null;
  }

  const [, day, monthName, year] = match;
  const month = months[monthName];

  if (!month) {
    return null;
  }

  return `${year}-${month}-${day.padStart(2, "0")}`;
}

function extractLabeledValue(text, label) {
  const escapedLabel = label.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const regex = new RegExp(
    `${escapedLabel}:?\\s*(.+?)(?=` +
      [
        "Fecha:",
        "Hora:",
        "Lugar:",
        "Precio:",
        "Accesibilidad:",
        "Política de menores:",
        "Descripción",
        "¿Cómo llegar",
        "$",
      ].join("|") +
      ")",
    "i"
  );

  return cleanText(text.match(regex)?.[1] ?? "");
}

function normalizePriceNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0
      ? value
      : null;
  }

  const normalized = cleanText(value)
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");

  if (!normalized) {
    return null;
  }

  const number = Number.parseFloat(normalized);

  return Number.isFinite(number) && number >= 0
    ? number
    : null;
}

function findJsonLdObjects(value, results = []) {
  if (!value) {
    return results;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      findJsonLdObjects(item, results);
    }

    return results;
  }

  if (typeof value !== "object") {
    return results;
  }

  results.push(value);

  for (const child of Object.values(value)) {
    if (child && typeof child === "object") {
      findJsonLdObjects(child, results);
    }
  }

  return results;
}

function extractPriceFromJsonLd($) {
  const jsonObjects = [];

  $('script[type="application/ld+json"]').each(
    (_, element) => {
      const rawJson = $(element).html();

      if (!rawJson) {
        return;
      }

      try {
        const parsed = JSON.parse(rawJson);
        findJsonLdObjects(parsed, jsonObjects);
      } catch {
        // Algunos bloques de Fever pueden no ser JSON válido.
      }
    }
  );

  for (const item of jsonObjects) {
    const offers = item.offers;

    if (!offers) {
      continue;
    }

    const offerList = Array.isArray(offers)
      ? offers
      : [offers];

    for (const offer of offerList) {
      if (!offer || typeof offer !== "object") {
        continue;
      }

      const rawPrice =
        offer.lowPrice ??
        offer.price ??
        offer.highPrice ??
        offer.minPrice ??
        null;

      const price = normalizePriceNumber(rawPrice);

      if (price !== null) {
        const isFree = price === 0;

        return {
          price,
          isFree,
          priceText: isFree
            ? "Gratis"
            : `Desde ${price} €`,
        };
      }
    }
  }

  return null;
}

function extractPriceFromText(pageText) {
  const text = cleanText(pageText);

  const freePatterns = [
    /\bentrada\s+gratuita\b/i,
    /\bacceso\s+gratuito\b/i,
    /\bevento\s+gratuito\b/i,
    /\bgratis\b/i,
    /\bprecio:\s*0(?:[,.]00)?\s*€/i,
  ];

  if (
    freePatterns.some((pattern) => pattern.test(text))
  ) {
    return {
      price: 0,
      isFree: true,
      priceText: "Gratis",
    };
  }

  const pricePatterns = [
    /\bdesde\s+(\d{1,4}(?:[,.]\d{1,2})?)\s*€/i,
    /\bentradas?\s+desde\s+(\d{1,4}(?:[,.]\d{1,2})?)\s*€/i,
    /\bprecio\s*:?\s*(\d{1,4}(?:[,.]\d{1,2})?)\s*€/i,
    /\bpor\s+(\d{1,4}(?:[,.]\d{1,2})?)\s*€/i,
    /\b(\d{1,4}(?:[,.]\d{1,2})?)\s*€\b/i,
  ];

  for (const pattern of pricePatterns) {
    const match = text.match(pattern);

    if (!match) {
      continue;
    }

    const price = normalizePriceNumber(match[1]);

    if (price === null) {
      continue;
    }

    return {
      price,
      isFree: price === 0,
      priceText:
        price === 0 ? "Gratis" : `Desde ${price} €`,
    };
  }

  return null;
}

function extractPrice($, pageText) {
  return (
    extractPriceFromJsonLd($) ??
    extractPriceFromText(pageText)
  );
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

export async function scrapeFeverDetail(
  url,
  fallbackCity = ""
) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const pageText = cleanText($("body").text());

  const sourceId = extractSourceId(url);

  const title =
    cleanText($("h1").first().text()) ||
    cleanText(
      $('meta[property="og:title"]').attr("content")
    );

  const description =
    cleanText(
      $('meta[name="description"]').attr("content")
    ) ||
    cleanText(
      $('meta[property="og:description"]').attr(
        "content"
      )
    );

  const imageUrl =
    cleanText(
      $('meta[property="og:image"]').attr("content")
    ) || null;

  const dateText = extractLabeledValue(
    pageText,
    "Fecha"
  );
  const timeText = extractLabeledValue(
    pageText,
    "Hora"
  );
  const placeText = extractLabeledValue(
    pageText,
    "Lugar"
  );

  const eventDate = parseSpanishDate(dateText);

  const timeMatch = timeText.match(
    /\b(\d{1,2}:\d{2})\b/
  );

  const eventTime = timeMatch?.[1] ?? null;

  let venue = "";
  let city = cleanCity(fallbackCity, fallbackCity);

  if (placeText.includes(",")) {
    const parts = placeText
      .split(",")
      .map((part) => cleanText(part))
      .filter(Boolean);

    venue = cleanVenue(parts[0] || "");
  } else {
    venue = cleanVenue(placeText);
  }

  let address = "";

  $("h2, h3").each((_, heading) => {
    const headingText = cleanText($(heading).text());

    if (
      !/cómo llegar/i.test(headingText) ||
      address
    ) {
      return;
    }

    const sectionText = cleanText(
      $(heading)
        .nextUntil("h2, h3")
        .text()
    );

    const withoutVenue =
      venue &&
      sectionText
        .toLowerCase()
        .startsWith(venue.toLowerCase())
        ? cleanText(
            sectionText.slice(venue.length)
          )
        : sectionText;

    address = cleanAddress(withoutVenue, venue);
  });

  /*
   * Alternativa por si la dirección no está bajo
   * el encabezado "Cómo llegar".
   */
  if (!address) {
    const addressMeta =
      $(
        'meta[property="place:location:address"]'
      ).attr("content") ||
      $('meta[name="address"]').attr("content") ||
      "";

    address = cleanAddress(addressMeta, venue);
  }

  venue = cleanVenue(venue);
  address = cleanAddress(address, venue);
  city = cleanCity(city, fallbackCity);

  const location = splitVenueAndAddress(
    venue,
    address
  );

  venue = location.venue;
  address = location.address;

  /*
   * En algunos eventos Fever devuelve textos genéricos
   * como "emblemático de Madrid" en vez del recinto.
   * Intentamos recuperar el recinto desde la dirección.
   */
  if (!venue || /emblemático de/i.test(venue)) {
    const venueMatch = address.match(
      /^(Sala\s+[A-Za-zÁÉÍÓÚÜÑ0-9 .'-]+|Movistar Arena|La Riviera|Nazca Events Club|Wurlitzer Ballroom|Teatro Eslava|Live Las Ventas|El Sótano)/i
    );

    if (venueMatch) {
      venue = cleanVenue(venueMatch[1]);
    }
  }

  address = cleanAddress(address, venue);
  address = normalizeAddress(
    address,
    venue,
    city
  );

  const priceData = extractPrice($, pageText);

  const missingFields = [];

  if (!sourceId) {
    missingFields.push("source_id");
  }

  if (!title) {
    missingFields.push("title");
  }

  if (!eventDate) {
    missingFields.push("event_date");
  }

  if (!venue) {
    missingFields.push("venue");
  }

  if (!address) {
    missingFields.push("address");
  }

  if (!city) {
    missingFields.push("city");
  }

  if (missingFields.length > 0) {
    throw new Error(
      `Evento descartado. Faltan campos obligatorios: ${missingFields.join(
        ", "
      )}`
    );
  }

  if (!priceData) {
    throw new Error(
      "Evento descartado. No se ha podido confirmar si es gratis ni obtener un precio"
    );
  }

  return {
    source: "fever",
    source_id: sourceId,
    source_url: url,
    title,
    description: description || null,
    image_url: imageUrl,
    event_date: eventDate,
    event_time: eventTime,
    date_text: dateText || null,
    venue,
    address,
    city,
    category: "conciertos",
    price: priceData.price,
    price_text: priceData.priceText,
    is_free: priceData.isFree,
  };
}
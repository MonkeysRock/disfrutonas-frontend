import { NextResponse } from "next/server";
import { scrapeFever } from "../../../../../scraper-fever/index.mjs";
import { FEVER_CITIES } from "../../../../../scraper-fever/cities.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SOURCE = "fever";
const CITIES_PER_RUN = 1;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

function getSupabaseHeaders(prefer) {
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };

  if (prefer) {
    headers.Prefer = prefer;
  }

  return headers;
}

async function getCurrentCity() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/scraper_state?source=eq.${SOURCE}&select=current_page&limit=1`,
    {
      method: "GET",
      headers: getSupabaseHeaders(),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `No se pudo leer scraper_state: ${response.status} ${await response.text()}`
    );
  }

  const rows = await response.json();

  return Number(rows[0]?.current_page) || 0;
}

async function updateCurrentCity(currentCity) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/scraper_state?source=eq.${SOURCE}`,
    {
      method: "PATCH",
      headers: getSupabaseHeaders("return=minimal"),
      body: JSON.stringify({
        current_page: currentCity,
        updated_at: new Date().toISOString(),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `No se pudo actualizar scraper_state: ${response.status} ${await response.text()}`
    );
  }
}

export async function GET(request) {
  const authorization = request.headers.get("authorization");

  if (
    !process.env.CRON_SECRET ||
    authorization !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json(
      {
        ok: false,
        error: "Faltan SUPABASE_URL o SUPABASE_KEY",
      },
      {
        status: 500,
      }
    );
  }

  const startedAt = Date.now();

  try {
    const startCity = await getCurrentCity();

    console.log(
      `⏱️ Cron Fever: procesando desde ciudad ${startCity}, bloque de ${CITIES_PER_RUN}`
    );

    const summary = await scrapeFever({
      startCity,
      blockSize: CITIES_PER_RUN,
    });

   const nextCity =
  summary.nextCity >= FEVER_CITIES.length
    ? 0
    : summary.nextCity;

    await updateCurrentCity(nextCity);

    return NextResponse.json({
      ok: true,
      message: "Bloque de Fever terminado",
      durationSeconds: Math.round((Date.now() - startedAt) / 1000),
      processedRange: {
        startCity,
        blockSize: CITIES_PER_RUN,
      },
      nextCity,
      summary,
    });
  } catch (error) {
    console.error("❌ Error cron Fever:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Error desconocido",
        durationSeconds: Math.round((Date.now() - startedAt) / 1000),
      },
      {
        status: 500,
      }
    );
  }
}
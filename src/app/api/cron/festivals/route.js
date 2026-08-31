import { NextResponse } from "next/server";
import { checkFestivals } from "../../../../../scraper-festivals/index.mjs";
import { FESTIVALS } from "../../../../../scraper-festivals/festivals-data.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SOURCE = "festivals";

// Empezamos con pocos por ejecución para no acercarnos al límite de Vercel.
const FESTIVALS_PER_RUN = 3;

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

async function getCurrentFestivalIndex() {
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

  return Number(rows[0]?.current_page ?? 0);
}

async function updateCurrentFestivalIndex(currentIndex) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/scraper_state?source=eq.${SOURCE}`,
    {
      method: "PATCH",
      headers: getSupabaseHeaders("return=minimal"),
      body: JSON.stringify({
        current_page: currentIndex,
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
    const enabledFestivals = FESTIVALS.filter(
      (festival) => festival.enabled
    );

    const start = await getCurrentFestivalIndex();

    console.log(
      `🎪 Cron festivals: procesando desde índice ${start}, bloque de ${FESTIVALS_PER_RUN}`
    );

    const summary = await checkFestivals({
      start,
      limit: FESTIVALS_PER_RUN,
    });

    const processedCount = summary.total;

    let nextIndex = start + processedCount;

    if (
      processedCount === 0 ||
      nextIndex >= enabledFestivals.length
    ) {
      nextIndex = 0;
    }

    await updateCurrentFestivalIndex(nextIndex);

    return NextResponse.json({
      ok: true,
      message: "Bloque de festivales terminado",
      durationSeconds: Math.round(
        (Date.now() - startedAt) / 1000
      ),
      processedRange: {
        start,
        limit: FESTIVALS_PER_RUN,
      },
      nextIndex,
      summary,
    });
  } catch (error) {
    console.error("❌ Error cron festivals:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido",
        durationSeconds: Math.round(
          (Date.now() - startedAt) / 1000
        ),
      },
      {
        status: 500,
      }
    );
  }
}
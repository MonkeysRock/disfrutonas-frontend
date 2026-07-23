import { NextResponse } from "next/server";
import { scrape } from "../../../../../scraper-events/index.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SOURCE = "ticketrona";
const PAGES_PER_RUN = 5;

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

async function getCurrentPage() {
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

  return Number(rows[0]?.current_page) || 1;
}

async function updateCurrentPage(currentPage) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/scraper_state?source=eq.${SOURCE}`,
    {
      method: "PATCH",
      headers: getSupabaseHeaders("return=minimal"),
      body: JSON.stringify({
        current_page: currentPage,
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
    const startPage = await getCurrentPage();
    const endPage = startPage + PAGES_PER_RUN - 1;

    console.log(
      `⏱️ Cron Ticketrona: procesando páginas ${startPage}-${endPage}`
    );

    const summary = await scrape({
      startPage,
      endPage,
    });

    const nextPage = summary.reachedEnd ? 1 : endPage + 1;

    await updateCurrentPage(nextPage);

    return NextResponse.json({
      ok: true,
      message: "Bloque de Ticketrona terminado",
      durationSeconds: Math.round((Date.now() - startedAt) / 1000),
      processedRange: {
        startPage,
        endPage,
      },
      nextPage,
      summary,
    });
  } catch (error) {
    console.error("❌ Error cron Ticketrona:", error);

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
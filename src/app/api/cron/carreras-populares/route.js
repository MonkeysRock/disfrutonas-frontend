import { NextResponse } from "next/server";
import { scrape } from "../../../../../scraper-carreras-populares/index.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

  const startedAt = Date.now();

  try {
    console.log("⏱️ Cron CarrerasPopulares iniciado");

    const summary = await scrape({
      limit: null,
    });

    return NextResponse.json({
      ok: true,
      message: "CarrerasPopulares terminado",
      durationSeconds: Math.round((Date.now() - startedAt) / 1000),
      summary,
    });
  } catch (error) {
    console.error("❌ Error cron CarrerasPopulares:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido",
        durationSeconds: Math.round((Date.now() - startedAt) / 1000),
      },
      {
        status: 500,
      }
    );
  }
}
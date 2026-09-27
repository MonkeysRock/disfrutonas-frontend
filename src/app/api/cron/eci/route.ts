import { NextResponse } from "next/server";
import { scrapeECI } from "../../../../../scraper-eci/index.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
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
    console.log("🚀 Iniciando cron ECI...");

    const summary = await scrapeECI();

    return NextResponse.json({
      ok: true,
      message: "Cron ECI terminado correctamente",
      durationSeconds: Math.round((Date.now() - startedAt) / 1000),
      summary: summary ?? null,
    });
  } catch (error) {
    console.error("❌ Error cron ECI:", error);

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
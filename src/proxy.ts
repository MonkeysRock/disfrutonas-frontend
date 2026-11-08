import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function proxy(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);

  if (segments[0] !== "eventos") {
    return NextResponse.next();
  }

  // RUTAS INTERNACIONALES DE CIUDAD

  // Evitar que las URLs internas sean accesibles directamente.
  if (
    segments.length === 4 &&
    segments[1] === "interno-internacional" &&
    segments[2] === "ciudad"
  ) {
    const city = segments[3];

    const { data } = await supabase
      .from("cities")
      .select("slug, countries(slug)")
      .eq("slug", city)
      .maybeSingle();

    const country = (
      data?.countries as { slug?: string } | null
    )?.slug;

    if (!country || country === "espana") {
      return new NextResponse("Página no encontrada", { status: 404 });
    }

    const destination = request.nextUrl.clone();
    destination.pathname = `/eventos/${country}/${city}`;

    return NextResponse.redirect(destination, 308);
  }

  // /eventos/italia/roma
  if (segments.length === 3) {
    const [, country, city] = segments;

    const { data, error } = await supabase
      .from("cities")
      .select("slug, countries(slug)")
      .eq("slug", city)
      .maybeSingle();

    if (error) {
      return new NextResponse("Error consultando ciudad", { status: 503 });
    }

    if (data) {
      const actualCountry = (
        data.countries as { slug?: string } | null
      )?.slug;

      if (actualCountry !== country || actualCountry === "espana") {
        return new NextResponse("Página no encontrada", { status: 404 });
      }

      const destination = request.nextUrl.clone();
      destination.pathname = `/eventos/interno-internacional/ciudad/${city}`;

      return NextResponse.rewrite(destination);
    }
  }

  // RUTAS INTERNACIONALES DE PILARES

  // Evitar acceso directo a la ruta interna.
  if (
    segments.length === 5 &&
    segments[1] === "interno-internacional" &&
    segments[2] === "pilar"
  ) {
    const [, , , city, pillar] = segments;

    const { data, error } = await supabase
      .from("cities")
      .select("countries(slug)")
      .eq("slug", city)
      .maybeSingle();

    if (error) {
      return new NextResponse("Error consultando ciudad", { status: 503 });
    }

    const country = (
      data?.countries as { slug?: string } | null
    )?.slug;

    if (!country || country === "espana") {
      return new NextResponse("Página no encontrada", { status: 404 });
    }

    const destination = request.nextUrl.clone();
    destination.pathname = `/eventos/${country}/${city}/${pillar}`;

    return NextResponse.redirect(destination, 308);
  }

  // /eventos/italia/roma/culturales
  if (segments.length === 4) {
    const [, country, city, pillar] = segments;

    const { data, error } = await supabase
      .from("cities")
      .select("countries(slug)")
      .eq("slug", city)
      .maybeSingle();

    if (error) {
      return new NextResponse("Error consultando ciudad", { status: 503 });
    }

    if (data) {
      const actualCountry = (
        data.countries as { slug?: string } | null
      )?.slug;

      if (actualCountry !== country || actualCountry === "espana") {
        return new NextResponse("Página no encontrada", { status: 404 });
      }

      const destination = request.nextUrl.clone();
      destination.pathname =
        `/eventos/interno-internacional/pilar/${city}/${pillar}`;

      return NextResponse.rewrite(destination);
    }
  }

  // RUTAS INTERNACIONALES DE CATEGORIAS

  // Redirigir el acceso directo a las páginas internas.
  if (
    segments.length === 6 &&
    segments[1] === "interno-internacional" &&
    segments[2] === "categoria"
  ) {
    const [, , , city, pillar, category] = segments;

    const { data, error } = await supabase
      .from("cities")
      .select("countries(slug)")
      .eq("slug", city)
      .maybeSingle();

    if (error) {
      return new NextResponse("Error consultando ciudad", { status: 503 });
    }

    const country = (
      data?.countries as { slug?: string } | null
    )?.slug;

    if (!country || country === "espana") {
      return new NextResponse("Página no encontrada", { status: 404 });
    }

    const destination = request.nextUrl.clone();
    destination.pathname =
      `/eventos/${country}/${city}/${pillar}/${category}`;

    return NextResponse.redirect(destination, 308);
  }

  // /eventos/italia/roma/culturales/monumentos
  // Solo interpretar como categoría internacional si el primer
  // segmento corresponde a un país registrado en Supabase.
  if (segments.length === 5) {
    const [, country, city, pillar, category] = segments;

    const { data: countryData, error: countryError } = await supabase
      .from("countries")
      .select("slug")
      .eq("slug", country)
      .maybeSingle();

    if (countryError) {
      return new NextResponse("Error consultando país", { status: 503 });
    }

    if (countryData && country !== "espana") {
      const { data: cityData, error: cityError } = await supabase
        .from("cities")
        .select("countries(slug)")
        .eq("slug", city)
        .maybeSingle();

      if (cityError) {
        return new NextResponse("Error consultando ciudad", { status: 503 });
      }

      const actualCountry = (
        cityData?.countries as { slug?: string } | null
      )?.slug;

      if (!actualCountry || actualCountry !== country) {
        return new NextResponse("Página no encontrada", { status: 404 });
      }

      const destination = request.nextUrl.clone();
      destination.pathname =
        `/eventos/interno-internacional/categoria/${city}/${pillar}/${category}`;

      return NextResponse.rewrite(destination);
    }
  }

  // Fichas sin país: /eventos/roma/culturales/monumentos/panteon-de-roma
  if (segments.length === 5) {
    const [, city, pillar, category, slug] = segments;

    const { data, error } = await supabase
      .from("events")
      .select("cities(countries(slug))")
      .eq("city_slug", city)
      .eq("pillar_slug", pillar)
      .eq("category_slug", category)
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.next();
    }

    const cityData = data.cities as {
      countries?: { slug?: string } | null;
    } | null;

    const countrySlug = cityData?.countries?.slug;

    if (countrySlug && countrySlug !== "espana") {
      const destination = request.nextUrl.clone();
      destination.pathname = `/eventos/${countrySlug}/${city}/${pillar}/${category}/${slug}`;
      return NextResponse.redirect(destination, 308);
    }

    return NextResponse.next();
  }

  if (segments.length !== 6) {
    return NextResponse.next();
  }

  const [, country, city, pillar, category, slug] = segments;

  const { data, error } = await supabase
    .from("events")
    .select("cities(countries(slug))")
    .eq("city_slug", city)
    .eq("pillar_slug", pillar)
    .eq("category_slug", category)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.next();
  }

  const cityData = data.cities as {
    countries?: { slug?: string } | null;
  } | null;

  const actualCountry = cityData?.countries?.slug;

  if (actualCountry && actualCountry !== country) {
    return new NextResponse("Página no encontrada", { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/eventos/:path*"],
};

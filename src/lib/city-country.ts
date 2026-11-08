import { supabase } from "@/lib/supabase";

export async function getCityCountry(citySlug: string) {
  const { data, error } = await supabase
    .from("cities")
    .select("name, slug, countries(name, slug)")
    .eq("slug", citySlug.toLowerCase())
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const country = data.countries as {
    name?: string;
    slug?: string;
  } | null;

  return {
    cityName: data.name,
    citySlug: data.slug,
    countryName: country?.name || "",
    countrySlug: country?.slug || "",
  };
}

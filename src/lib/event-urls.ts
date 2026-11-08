export type EventUrlParts = {
  countrySlug?: string | null;
  citySlug: string;
  pillarSlug?: string;
  categorySlug?: string;
  slug?: string;
};

export function buildEventUrl({
  countrySlug,
  citySlug,
  pillarSlug,
  categorySlug,
  slug,
}: EventUrlParts): string {
  const segments = ["eventos"];

  if (countrySlug && countrySlug !== "espana") {
    segments.push(countrySlug);
  }

  segments.push(citySlug);

  if (pillarSlug) segments.push(pillarSlug);
  if (categorySlug) segments.push(categorySlug);
  if (slug) segments.push(slug);

  return "/" + segments.map(encodeURIComponent).join("/");
}

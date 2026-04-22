export type LocationItem = {
  name: string;
  slug: string;
  province: string;
  region: string;
  type: "city" | "town";
};

export const locations: LocationItem[] = [
  {
    name: "Sevilla",
    slug: "sevilla",
    province: "Sevilla",
    region: "Andalucía",
    type: "city",
  },
  {
    name: "Dos Hermanas",
    slug: "dos-hermanas",
    province: "Sevilla",
    region: "Andalucía",
    type: "town",
  },
];
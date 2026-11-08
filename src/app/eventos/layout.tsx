import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eventos, conciertos y planes en España",
  description:
    "Encuentra eventos, conciertos, festivales, teatro, deporte y planes en España. Busca por ciudad, categoría y fecha en Disfrutonas.",
  alternates: {
    canonical: "/eventos",
  },
};

export default function EventosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

export type EventItem = {
  id: number;
  title: string;
  slug: string;
  pillar: "Deportivos" | "Culturales";
  pillarSlug: "deportivos" | "culturales";
  category: string;
  categorySlug: string;
  city: string;
  citySlug: string;
  eventDate: string;
  time: string;
  date: string;
  place: string;
  isFree: boolean;
  price: number;
  priceLabel: string;
  image: string;
  imageAlt: string;
  imageLabel: string;
  imageSubLabel: string;
  description: string;
  includes: string[];
  lat: number;
  lng: number;
};

export const events: EventItem[] = [
  {
    id: 1,
    title: "Sevilla FC vs Real Betis",
    slug: "sevilla-fc-vs-real-betis-2026-04-20",
    pillar: "Deportivos",
    pillarSlug: "deportivos",
    category: "Fútbol",
    categorySlug: "futbol",
    city: "Sevilla",
    citySlug: "sevilla",
    eventDate: "2026-04-20",
    time: "21:00",
    date: "Sáb 20 abril · 21:00",
    place: "Estadio Ramón Sánchez-Pizjuán",
    isFree: false,
    price: 45,
    priceLabel: "Desde 45€",
    image:
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Sevilla FC vs Real Betis",
    imageLabel: "Sevilla FC vs Real Betis",
    imageSubLabel: "Sevilla · 20 abril 2026 · 21:00",
    description:
      "Vive uno de los partidos más intensos del calendario en una ciudad donde el fútbol se siente de verdad. Un plan perfecto para disfrutar del ambiente, la rivalidad y una noche grande de deporte.",
    includes: [
      "Acceso al recinto",
      "Entrada general",
      "Ambiente deportivo en directo",
      "Evento recomendado para grupos y escapadas",
    ],
    lat: 37.3841,
    lng: -5.9707,
  },
  {
    id: 2,
    title: "Concierto de Vetusta Morla",
    slug: "concierto-de-vetusta-morla-2026-04-26",
    pillar: "Culturales",
    pillarSlug: "culturales",
    category: "Conciertos",
    categorySlug: "conciertos",
    city: "Madrid",
    citySlug: "madrid",
    eventDate: "2026-04-26",
    time: "22:00",
    date: "Vie 26 abril · 22:00",
    place: "WiZink Center",
    isFree: false,
    price: 35,
    priceLabel: "Desde 35€",
    image:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Concierto de Vetusta Morla",
    imageLabel: "Concierto de Vetusta Morla",
    imageSubLabel: "Madrid · 26 abril 2026 · 22:00",
    description:
      "Una noche de música en directo con uno de los grupos más potentes del panorama nacional. Un plan cultural redondo para disfrutar Madrid.",
    includes: [
      "Acceso al concierto",
      "Entrada general",
      "Música en directo",
      "Ideal para parejas y grupos",
    ],
    lat: 40.424,
    lng: -3.6735,
  },
  {
    id: 3,
    title: "Festival de Jazz Nocturno",
    slug: "festival-de-jazz-nocturno-2026-04-27",
    pillar: "Culturales",
    pillarSlug: "culturales",
    category: "Festivales",
    categorySlug: "festivales",
    city: "Sevilla",
    citySlug: "sevilla",
    eventDate: "2026-04-27",
    time: "20:30",
    date: "Sáb 27 abril · 20:30",
    place: "Cartuja Center",
    isFree: true,
    price: 0,
    priceLabel: "Gratis",
    image:
      "https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Festival de Jazz Nocturno",
    imageLabel: "Festival de Jazz Nocturno",
    imageSubLabel: "Sevilla · 27 abril 2026 · 20:30",
    description:
      "Un festival con mucho estilo, grandes músicos y una atmósfera especial para una noche cultural diferente en Sevilla.",
    includes: [
      "Acceso gratuito",
      "Música en directo",
      "Ambiente cultural",
      "Perfecto para una noche especial",
    ],
    lat: 37.4103,
    lng: -6.0017,
  },
  {
    id: 4,
    title: "Partido de Euroliga",
    slug: "partido-de-euroliga-2026-05-02",
    pillar: "Deportivos",
    pillarSlug: "deportivos",
    category: "Baloncesto",
    categorySlug: "baloncesto",
    city: "Madrid",
    citySlug: "madrid",
    eventDate: "2026-05-02",
    time: "20:45",
    date: "Jue 2 mayo · 20:45",
    place: "WiZink Center",
    isFree: false,
    price: 28,
    priceLabel: "Desde 28€",
    image:
      "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Partido de Euroliga",
    imageLabel: "Partido de Euroliga",
    imageSubLabel: "Madrid · 2 mayo 2026 · 20:45",
    description:
      "Baloncesto europeo al máximo nivel, con intensidad, espectáculo y un ambiente espectacular para vivir una gran noche de deporte en Madrid.",
    includes: [
      "Acceso al pabellón",
      "Entrada general",
      "Evento indoor",
      "Ideal para fans del baloncesto",
    ],
    lat: 40.424,
    lng: -3.6735,
  },
  {
    id: 5,
    title: "Monólogo de comedia",
    slug: "monologo-de-comedia-2026-05-03",
    pillar: "Culturales",
    pillarSlug: "culturales",
    category: "Monólogos",
    categorySlug: "monologos",
    city: "Sevilla",
    citySlug: "sevilla",
    eventDate: "2026-05-03",
    time: "21:30",
    date: "Vie 3 mayo · 21:30",
    place: "Sala Custom",
    isFree: false,
    price: 18,
    priceLabel: "Desde 18€",
    image:
      "https://images.unsplash.com/photo-1527224538127-2104bb71c51b?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Monólogo de comedia",
    imageLabel: "Monólogo de comedia",
    imageSubLabel: "Sevilla · 3 mayo 2026 · 21:30",
    description:
      "Humor en directo, buen ambiente y una noche perfecta para desconectar con amigos o en pareja en una de las salas más interesantes de la ciudad.",
    includes: [
      "Acceso al espectáculo",
      "Entrada general",
      "Comedia en directo",
      "Ideal para grupos",
    ],
    lat: 37.3826,
    lng: -5.9732,
  },
  {
    id: 6,
    title: "Carrera popular 10K",
    slug: "carrera-popular-10k-2026-05-05",
    pillar: "Deportivos",
    pillarSlug: "deportivos",
    category: "Atletismo",
    categorySlug: "atletismo",
    city: "Sevilla",
    citySlug: "sevilla",
    eventDate: "2026-05-05",
    time: "09:00",
    date: "Dom 5 mayo · 09:00",
    place: "Parque de María Luisa",
    isFree: true,
    price: 0,
    priceLabel: "Gratis",
    image:
      "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Carrera popular 10K",
    imageLabel: "Carrera popular 10K",
    imageSubLabel: "Sevilla · 5 mayo 2026 · 09:00",
    description:
      "Una carrera popular ideal para runners de todos los niveles, en un entorno top y con un ambiente muy bueno para disfrutar del deporte al aire libre.",
    includes: [
      "Inscripción gratuita",
      "Recorrido urbano",
      "Ambiente runner",
      "Plan perfecto de mañana",
    ],
    lat: 37.3772,
    lng: -5.9875,
  },
];
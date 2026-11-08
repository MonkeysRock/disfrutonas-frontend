export const citiesContent: Record<
  string,
  {
    title: string;
    subtitle: string;
    description: string;
    highlightedPlan: string;
  }
> = {
  madrid: {
    title: "Eventos en Madrid",
    subtitle: "Conciertos, cultura, deporte y planes destacados",
    description:
      "Descubre una selección de planes para disfrutar Madrid a lo grande: conciertos, baloncesto, festivales y propuestas culturales para cualquier momento.",
    highlightedPlan:
      "Madrid vibra con música en directo, grandes recintos y eventos top todo el año.",
  },
  sevilla: {
    title: "Eventos en Sevilla",
    subtitle: "Planes con mucho ambiente para tu escapada o tu día a día",
    description:
      "Encuentra los mejores eventos en Sevilla: fútbol, festivales, monólogos, carreras populares y planes culturales para exprimir la ciudad.",
    highlightedPlan:
      "Sevilla mezcla cultura, ocio y deporte con un ambiente muy difícil de superar.",
  },
};

export const pillarContent: Record<
  string,
  {
    label: string;
    subtitle: string;
    description: string;
    categories: { label: string; slug: string }[];
  }
> = {
  deportivos: {
    label: "Deportivos",
    subtitle: "Fútbol, basket, running y más",
    description:
      "Encuentra planes deportivos en tu ciudad y navega por categorías específicas para ir al grano.",
    categories: [
      { label: "Fútbol", slug: "futbol" },
      { label: "Baloncesto", slug: "baloncesto" },
      { label: "Atletismo", slug: "atletismo" },
      { label: "Tenis", slug: "tenis" },
      { label: "Motor", slug: "motor" },
      { label: "Running", slug: "running" },
    ],
  },
  culturales: {
    label: "Culturales",
    subtitle: "Conciertos, festivales, monólogos y mucho más",
    description:
      "Explora eventos culturales por ciudad y por categoría para encontrar planes con personalidad.",
    categories: [
      { label: "Conciertos", slug: "conciertos" },
      { label: "Monólogos", slug: "monologos" },
      { label: "Teatro", slug: "teatro" },
      { label: "Cine", slug: "cine" },
      { label: "Exposiciones", slug: "exposiciones" },
      { label: "Festivales", slug: "festivales" },
      { label: "Monumentos", slug: "monumentos" },
      { label: "Museos", slug: "museos" },
      { label: "Parques temáticos", slug: "parques-tematicos" },
      { label: "Acuarios y zoológicos", slug: "acuarios-y-zoologicos" },
      { label: "Cruceros turísticos", slug: "cruceros-turisticos" },
      { label: "Transporte turístico", slug: "transporte-turistico" },
      { label: "Excursiones", slug: "excursiones" },
      { label: "Visitas guiadas", slug: "visitas-guiadas" },
      { label: "Gastronomía", slug: "gastronomia" },
      { label: "Jardines y naturaleza", slug: "jardines-y-naturaleza" },
      { label: "Miradores y observatorios", slug: "miradores-y-observatorios" },
      { label: "Bienestar y spas", slug: "bienestar-y-spas" },
      { label: "Talleres y actividades", slug: "talleres-y-actividades" },
      { label: "Actividades aéreas", slug: "actividades-aereas" },
      { label: "Pases turísticos", slug: "pases-turisticos" },
      { label: "Espectáculos", slug: "espectaculos" },
    ],
  },
};

export const categoryLabels: Record<string, string> = {
  futbol: "Fútbol",
  baloncesto: "Baloncesto",
  atletismo: "Atletismo",
  tenis: "Tenis",
  motor: "Motor",
  running: "Running",
  conciertos: "Conciertos",
  monologos: "Monólogos",
  teatro: "Teatro",
  cine: "Cine",
  exposiciones: "Exposiciones",
  festivales: "Festivales",
  monumentos: "Monumentos",
  museos: "Museos",
  "parques-tematicos": "Parques temáticos",
  "acuarios-y-zoologicos": "Acuarios y zoológicos",
  "cruceros-turisticos": "Cruceros turísticos",
  "transporte-turistico": "Transporte turístico",
  excursiones: "Excursiones",
  "visitas-guiadas": "Visitas guiadas",
  gastronomia: "Gastronomía",
  "jardines-y-naturaleza": "Jardines y naturaleza",
  "miradores-y-observatorios": "Miradores y observatorios",
  "bienestar-y-spas": "Bienestar y spas",
  "talleres-y-actividades": "Talleres y actividades",
  "actividades-aereas": "Actividades aéreas",
  "pases-turisticos": "Pases turísticos",
  espectaculos: "Espectáculos",
};

export const sportsCategories = [
  "Fútbol",
  "Baloncesto",
  "Atletismo",
  "Tenis",
  "Motor",
  "Running",
];

export const culturalCategories = [
  "Conciertos",
  "Monólogos",
  "Teatro",
  "Cine",
  "Exposiciones",
  "Festivales",
  "Monumentos",
  "Museos",
  "Parques temáticos",
  "Acuarios y zoológicos",
  "Cruceros turísticos",
  "Transporte turístico",
  "Excursiones",
  "Visitas guiadas",
  "Gastronomía",
  "Jardines y naturaleza",
  "Miradores y observatorios",
  "Bienestar y spas",
  "Talleres y actividades",
  "Actividades aéreas",
  "Pases turísticos",
  "Espectáculos",
];

export const cities = ["Todas", "Sevilla", "Madrid"];
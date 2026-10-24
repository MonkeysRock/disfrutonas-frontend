import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/eventos/donostia/:path*",
        destination: "/eventos/san-sebastian/:path*",
        permanent: true,
      },
      {
        source:
          "/eventos/barcelona/culturales/conciertos/the-strokes-reality-awaits-en-barcelona-2026-10-20-barcelona",
        destination:
          "/eventos/barcelona/culturales/conciertos/the-strokes-reality-awaits-2026-10-20-barcelona",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
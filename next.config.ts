import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/eventos/:country/:city/:pillar/:category/:slug",
        destination: "/eventos/:city/:pillar/:category/:slug",
      },
    ];
  },
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
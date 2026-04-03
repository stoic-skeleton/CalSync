import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // TheSportsDB (IPL team badges)
      { protocol: "https", hostname: "**.thesportsdb.com" },
      // ESPN CDN (NFL / NBA / MLS team logos)
      { protocol: "https", hostname: "**.espncdn.com" },
      // ESPN images subdomain variants
      { protocol: "https", hostname: "a.espncdn.com" },
      { protocol: "https", hostname: "a1.espncdn.com" },
      { protocol: "https", hostname: "a2.espncdn.com" },
      { protocol: "https", hostname: "a4.espncdn.com" },
      // Jolpica / Formula 1 logos if ever added
      { protocol: "https", hostname: "**.jolpica.com" },
      { protocol: "https", hostname: "**.formula1.com" },
    ],
  },
};

export default nextConfig;

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
      // Clearbit Logo API (league + calendar app logos on homepage)
      { protocol: "https", hostname: "logo.clearbit.com" },
      // Wikimedia uploads (high-res league/team badges hosted on Wikimedia)
      { protocol: "https", hostname: "upload.wikimedia.org" },
      // Google Favicons API (used for IPL and other league logos)
      { protocol: "https", hostname: "www.google.com" },
    ],
  },
};

export default nextConfig;

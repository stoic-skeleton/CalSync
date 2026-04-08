import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cal-sync.app";
  const now = new Date();
  return [
    { url: `${baseUrl}`, lastModified: now },
    { url: `${baseUrl}/browse`, lastModified: now },
    { url: `${baseUrl}/schedule`, lastModified: now },
    { url: `${baseUrl}/get-calendar`, lastModified: now },
    { url: `${baseUrl}/pricing`, lastModified: now },
  ];
}

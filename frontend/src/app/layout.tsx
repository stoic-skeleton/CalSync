import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "CalSync — Never Miss a Game", template: "%s | CalSync" },
  description:
    "Sync your favourite sports schedules — F1, IPL, NFL, NBA, MLS — directly into Google Calendar, Apple Calendar, or Outlook. Free, auto-updating .ics feeds.",
  keywords: [
    "sports calendar",
    "formula 1 calendar",
    "NFL calendar",
    "IPL schedule",
    "ical sports",
  ],
  openGraph: {
    type: "website",
    title: "CalSync — Never Miss a Game",
    description: "Sports schedules synced to your calendar.",
    siteName: "CalSync",
  },
  twitter: {
    card: "summary_large_image",
    title: "CalSync — Never Miss a Game",
    description:
      "Sync your favourite sports schedules — F1, IPL, NFL, NBA, MLS — directly into Google Calendar, Apple Calendar, or Outlook.",
  },
};

export const metadataBase = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://cal-sync.app");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cal-sync.app";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "name": "CalSync",
        "url": siteUrl,
      },
      {
        "@type": "WebSite",
        "name": "CalSync",
        "url": siteUrl,
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${siteUrl}/browse?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Prevents theme flash on load by reading localStorage before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('calsync-theme');if(t)document.documentElement.setAttribute('data-theme',t);})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

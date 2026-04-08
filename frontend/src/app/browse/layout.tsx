import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Browse Sports Leagues",
  description:
    "Explore F1, IPL, NFL, NBA, MLS and more. Pick leagues and teams, then sync their schedules to your calendar in seconds.",
};

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

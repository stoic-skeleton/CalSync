import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Upcoming Sports Schedule",
  description:
    "See upcoming games across F1, NFL, NBA, IPL and MLS. Filter by sport and sync events to your calendar.",
};

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

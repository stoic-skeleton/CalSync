import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Build Your Calendar Feed",
  description:
    "Select leagues and teams, get a custom .ics subscription URL, and add it to Google Calendar, Apple Calendar, or Outlook.",
};

export default function GetCalendarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

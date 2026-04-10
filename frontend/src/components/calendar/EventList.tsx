"use client";

import EventCard from "@/components/event-card";
import type { Event } from "@/lib/types";

type Props = { events: Event[] };

export default function EventList({ events }: Props) {
  if (!events || events.length === 0) {
    return <div className="text-sm" style={{ color: 'var(--muted)' }}>No events for this date.</div>;
  }
  return (
    <div className="flex flex-col gap-3">
      {events.map(ev => (
        <EventCard key={ev.id} event={ev} />
      ))}
    </div>
  );
}

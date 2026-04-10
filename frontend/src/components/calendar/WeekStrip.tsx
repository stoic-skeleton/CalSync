"use client";

import { useMemo } from "react";
import type { Event } from "@/lib/types";
import { formatDateKey, countEventsByDate } from "@/lib/calendar";

type Props = {
  /** Any date – the strip shows the full week containing this date */
  reference?: string | null;
  events?: Event[];
  selected?: string | null;
  onSelect?: (dateIso: string) => void;
};

const TODAY_KEY = formatDateKey(new Date());

function startOfWeek(d: Date) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() - dt.getDay());
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export default function WeekStrip({ reference, events = [], selected, onSelect }: Props) {
  const dateCounts = useMemo(() => countEventsByDate(events), [events]);
  const refDate = reference ? new Date(reference) : new Date();
  const start = startOfWeek(refDate);
  const days = Array.from({ length: 7 }, (_, i) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
  );

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {days.map((d) => {
        const key = formatDateKey(d);
        const count = dateCounts[key] ?? 0;
        const isSelected = selected != null && key === formatDateKey(selected);
        const isToday = key === TODAY_KEY;

        return (
          <button
            key={key}
            onClick={() => onSelect?.(new Date(d).toISOString())}
            className="flex-shrink-0 w-[72px] p-2.5 rounded-xl text-center transition-colors hover:bg-[var(--surface-hover)]"
            style={{
              background: isSelected ? "var(--accent-muted)" : "var(--surface)",
              border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          >
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>
              {d.toLocaleDateString(undefined, { weekday: "short" })}
            </div>
            <div
              className={`w-7 h-7 mx-auto flex items-center justify-center rounded-full text-sm font-semibold ${isToday ? "text-white" : ""}`}
              style={isToday ? { background: "var(--accent)" } : undefined}
            >
              {d.getDate()}
            </div>
            {count > 0 && (
              <div className="text-xs mt-1" style={{ color: isSelected ? "var(--accent)" : "var(--muted)" }}>
                {count}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

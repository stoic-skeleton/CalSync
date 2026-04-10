"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import type { Event } from "@/lib/types";
import { formatDateKey, countEventsByDate } from "@/lib/calendar";

type Props = {
  /** ISO string of any date in the month to display */
  displayMonth: string;
  events?: Event[];
  selected?: string | null;
  onSelect?: (dateIso: string) => void;
  onMonthChange?: (newMonthIso: string) => void;
};

const TODAY_KEY = formatDateKey(new Date());

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

export default function MonthCalendar({
  displayMonth,
  events = [],
  selected = null,
  onSelect,
  onMonthChange,
}: Props) {
  const dateCounts = useMemo(() => countEventsByDate(events), [events]);
  const base = new Date(displayMonth);
  const start = startOfMonth(base);
  const end = endOfMonth(base);

  // Build days array with leading/trailing cells to fill Sun–Sat rows
  const days: Date[] = [];
  const firstWeekday = start.getDay();
  for (let i = 0; i < firstWeekday; i++) {
    days.push(new Date(start.getFullYear(), start.getMonth(), i - firstWeekday + 1));
  }
  for (let d = 1; d <= end.getDate(); d++) {
    days.push(new Date(start.getFullYear(), start.getMonth(), d));
  }
  const trailing = 6 - days[days.length - 1].getDay();
  const lastDay = days[days.length - 1];
  for (let i = 1; i <= trailing; i++) {
    days.push(new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + i));
  }

  const monthLabel = base.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="w-full rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      {/* Month navigation header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onMonthChange?.(addMonths(base, -1).toISOString())}
          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
          aria-label="Previous month"
          style={{ color: "var(--muted)" }}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          {monthLabel}
        </span>
        <button
          onClick={() => onMonthChange?.(addMonths(base, 1).toISOString())}
          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
          aria-label="Next month"
          style={{ color: "var(--muted)" }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-xs text-center py-1 font-medium" style={{ color: "var(--muted)" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const key = formatDateKey(day);
          const count = dateCounts[key] ?? 0;
          const isCurrentMonth = day.getMonth() === start.getMonth();
          const isSelected = selected != null && key === formatDateKey(selected);
          const isToday = key === TODAY_KEY;

          return (
            <button
              key={key}
              onClick={() => onSelect?.(new Date(day).toISOString())}
              className="relative flex flex-col items-center py-1.5 rounded-lg text-xs transition-colors hover:bg-[var(--surface-hover)] min-h-[52px]"
              style={{
                background: isSelected ? "var(--accent-muted)" : undefined,
                color: "var(--foreground)",
                opacity: isCurrentMonth ? 1 : 0.35,
              }}
            >
              <span
                className={`w-6 h-6 flex items-center justify-center rounded-full mb-0.5 font-medium ${isToday ? "text-white" : ""}`}
                style={isToday ? { background: "var(--accent)" } : undefined}
              >
                {day.getDate()}
              </span>
              {count > 0 && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: isSelected ? "var(--accent)" : "var(--muted)" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

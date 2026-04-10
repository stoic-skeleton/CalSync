export function formatDateKey(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function countEventsByDate(events: { start_time: string }[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const e of events) {
    if (!e?.start_time) continue;
    const k = formatDateKey(e.start_time);
    map[k] = (map[k] || 0) + 1;
  }
  return map;
}

export function monthRange(dateIso?: string | Date) {
  const d = dateIso ? (typeof dateIso === 'string' ? new Date(dateIso) : dateIso) : new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function weekRange(dateIso?: string | Date) {
  const d = dateIso ? (typeof dateIso === 'string' ? new Date(dateIso) : dateIso) : new Date();
  const start = new Date(d);
  const diff = start.getDay();
  start.setDate(start.getDate() - diff);
  start.setHours(0,0,0,0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23,59,59,999);
  return { from: start.toISOString(), to: end.toISOString() };
}

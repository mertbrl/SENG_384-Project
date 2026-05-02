export function newRowKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** One row per offered meeting: calendar day + local time window; API stores start instant only. */
export function defaultSlotRanges() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n) => String(n).padStart(2, "0");
  const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return [{ _key: newRowKey(), date: dateStr, start: "10:00", end: "11:00" }];
}

export function rangesToIsoStarts(ranges) {
  if (!Array.isArray(ranges)) return [];
  const out = [];
  for (const row of ranges) {
    if (!row?.date || !row?.start) continue;
    const endTime = row.end || row.start;
    const [y, mo, da] = row.date.split("-").map((n) => Number(n));
    const [sh, sm] = String(row.start).split(":").map((n) => Number(n));
    const [eh, em] = String(endTime).split(":").map((n) => Number(n));
    if ([y, mo, da, sh, sm, eh, em].some((n) => Number.isNaN(n))) continue;
    const startMs = new Date(y, mo - 1, da, sh, sm, 0, 0).getTime();
    const endMs = new Date(y, mo - 1, da, eh, em, 0, 0).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) continue;
    out.push(new Date(startMs).toISOString());
  }
  return out.slice(0, 8);
}

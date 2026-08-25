const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Debug marker to confirm latest time utility is inside production bundle.
if (typeof window !== "undefined") {
  window.__CRM_TIME_FIX = "PKT_UTC_PLUS_5_20260805";
}

export const parseDbTime = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;

  const raw = String(value).trim();
  if (!raw) return null;

  const isoLike = raw.includes("T") ? raw : raw.replace(" ", "T");
  const hasTimezone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(isoLike);

  const parsed = new Date(hasTimezone ? isoLike : `${isoLike}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const fmtDbDateTime = (value) => {
  const d = parseDbTime(value);
  if (!d) return "-";

  const pkt = new Date(d.getTime() + PKT_OFFSET_MS);

  const month = MONTHS[pkt.getUTCMonth()];
  const day = pkt.getUTCDate();
  const year = pkt.getUTCFullYear();

  let hour = pkt.getUTCHours();
  const minute = String(pkt.getUTCMinutes()).padStart(2, "0");
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;

  return `${month} ${day}, ${year}, ${hour}:${minute} ${ampm}`;
};

export const fmtDbTimeAgo = (value) => {
  const d = parseDbTime(value);
  if (!d) return "-";

  const diffMs = Date.now() - d.getTime();
  const abs = Math.abs(diffMs);

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (abs < minute) return "just now";

  const suffix = diffMs >= 0 ? "ago" : "from now";
  if (abs < hour) return `${Math.round(abs / minute)}m ${suffix}`;
  if (abs < day) return `${Math.round(abs / hour)}h ${suffix}`;
  return `${Math.round(abs / day)}d ${suffix}`;
};

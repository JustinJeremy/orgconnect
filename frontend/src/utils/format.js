const toDate = (iso) => new Date(`${iso}T00:00:00`);

export function formatDate(iso) {
  if (!iso) return "";
  return toDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function shortDate(iso) {
  if (!iso) return "";
  return toDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function dateParts(iso) {
  const d = toDate(iso);
  return {
    mon: d.toLocaleDateString("en-US", { month: "short" }),
    day: d.getDate(),
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
  };
}

export function formatTime(time) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .filter((w, i, arr) => i === 0 || i === arr.length - 1)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// True when a "YYYY-MM-DD" date at an "HH:MM" time is already behind us
export function isPast(iso, time) {
  return new Date(`${iso}T${time}:00`) <= new Date();
}

// "Today", "Yesterday", "3 days ago", or the date. Accepts "YYYY-MM-DD" or a full timestamp.
export function relativeDate(value) {
  if (!value) return "";
  const iso = value.slice(0, 10);
  const days = Math.round((toDate(todayIso()) - toDate(iso)) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(iso);
}

export const percent = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

export const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

export function slug(text = "") {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// ---- Event helpers ----
export const isCompleted = (e) => e.status === "completed";
export const attendedCount = (e) => e.registrations.filter((r) => r.status === "attended").length;
export const myRegistration = (e, userId) => e.registrations.find((r) => r.userId === userId);

// "Blockchain, smart contracts, Blockchain" -> ["Blockchain", "smart contracts"] (trimmed, no blanks or repeats, at most 8)
export const splitTopics = (text) =>
  [...new Set(text.split(",").map((t) => t.trim().slice(0, 40)).filter(Boolean))].slice(0, 8);

// 2.5 -> "2.5 hours", 1 -> "1 hour", 1.25 -> "1 hr 15 min", 0.75 -> "45 min"
export function hoursText(value) {
  const h = Number(value) || 0;
  if (Number.isInteger(h * 2)) return `${h} ${h === 1 ? "hour" : "hours"}`;
  const whole = Math.floor(h);
  const minutes = Math.round((h - whole) * 60);
  return whole ? `${whole} hr ${minutes} min` : `${minutes} min`;
}

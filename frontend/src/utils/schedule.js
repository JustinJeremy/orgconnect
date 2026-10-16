// Tutoring sessions repeat weekly and are written as text, e.g. "Mondays, 3:00 PM" or "Wednesday, 1:30pm".
// parseSchedule reads the weekday (0 = Sunday) and the time ("15:00"), or returns null if it can't.
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function parseSchedule(text = "") {
  const lower = text.toLowerCase();
  const day = DAYS.findIndex((d) => new RegExp(`\\b${d}`).test(lower));
  const t = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (day < 0 || !t) return null;
  let hour = Number(t[1]) % 12;
  if (t[3] === "pm") hour += 12;
  if (!t[3] && Number(t[1]) < 7) hour += 12; // "3:00" with no am/pm: a class-day afternoon
  if (t[3] === "am" && Number(t[1]) === 12) hour = 0;
  return { weekday: day, time: `${String(hour).padStart(2, "0")}:${t[2] || "00"}` };
}

// The dates ("YYYY-MM-DD") a weekly session falls on between two dates (inclusive)
export function weeklyDates(weekday, from, to) {
  const pad = (n) => String(n).padStart(2, "0");
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7));
  const out = [];
  for (; d <= to; d.setDate(d.getDate() + 7)) out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  return out;
}

// "Add to calendar" for events and tutoring sessions:
//   google(item) -> a Google Calendar link that opens the event already filled in
//   downloadIcs(item) -> a .ics file, which phone calendars (iPhone, Android) and Outlook open
// Times are Philippine time. Events last 2 hours and tutoring sessions 1 hour (neither has an end time).
const TZ = "Asia/Manila";
const pad = (n) => String(n).padStart(2, "0");

// "2026-10-20" + "13:00" + hours -> "20261020T130000" and the end, as wall-clock times in Manila
function stamps(date, time, hours) {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, h, min));
  const end = new Date(start.getTime() + hours * 3600000);
  const fmt = (t) => `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00`;
  return [fmt(start), fmt(end)];
}

// { title, details, location, start, end, weekly } for an event or a session
function describe(item, orgName) {
  if (item.subject) {
    // A tutoring session: one meeting, on its date
    if (!item.date || !item.time) return null;
    const [start, end] = stamps(item.date, item.time, 1);
    return {
      title: `Peer tutoring: ${item.subject}`,
      details: [`Tutor: ${item.tutorName}`, item.description, orgName && `${orgName} on OrgConnect`].filter(Boolean).join("\n"),
      location: item.location,
      start, end, weekly: false,
    };
  }
  const [start, end] = stamps(item.date, item.time, 2);
  return {
    title: item.title,
    details: [item.description, orgName && `${orgName} on OrgConnect`].filter(Boolean).join("\n"),
    location: item.location,
    start, end, weekly: false,
  };
}

export function googleCalendarUrl(item, orgName) {
  const d = describe(item, orgName);
  if (!d) return null;
  const params = new URLSearchParams({ action: "TEMPLATE", text: d.title, dates: `${d.start}/${d.end}`, details: d.details, location: d.location || "", ctz: TZ });
  if (d.weekly) params.set("recur", "RRULE:FREQ=WEEKLY");
  return `https://calendar.google.com/calendar/render?${params}`;
}

// Text in a calendar file: commas, semicolons and new lines are escaped
const esc = (text = "") => text.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");

export function downloadIcs(item, orgName) {
  const d = describe(item, orgName);
  if (!d) return false;
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//OrgConnect//EN", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${item.subject ? "session" : "event"}-${item.id}@orgconnect`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;TZID=${TZ}:${d.start}`,
    `DTEND;TZID=${TZ}:${d.end}`,
    ...(d.weekly ? ["RRULE:FREQ=WEEKLY"] : []),
    `SUMMARY:${esc(d.title)}`,
    `DESCRIPTION:${esc(d.details)}`,
    `LOCATION:${esc(d.location)}`,
    "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", `DESCRIPTION:${esc(d.title)}`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ];
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${d.title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "orgconnect"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
}

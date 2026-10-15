// Where a notification leads when clicked: { page, eventId?, eventTitle? }
// The API sends link as "events/12" (page + event id), "hours", ... Older notifications
// (or an API that doesn't send links) have none, so the page is worked out from the message.
const PAGES = ["dashboard", "events", "hours", "tutoring", "announcements", "profile"];

const EVENT_TITLE = [/^New event: (.+)$/, /^Your certificate for (.+) is ready$/];

function guessPage(message) {
  const text = message.toLowerCase();
  if (text.includes("event") || text.includes("certificate")) return "events";
  if (text.includes("hrs for")) return "hours";
  if (text.includes("tutoring")) return "tutoring";
  if (text.includes("announcement")) return "announcements";
  return "dashboard";
}

export function notificationTarget({ link, message = "" }) {
  const [linkPage, id] = (link || "").split("/");
  const page = PAGES.includes(linkPage) ? linkPage : guessPage(message);
  if (page !== "events") return { page };

  const eventTitle = EVENT_TITLE.map((re) => message.match(re)?.[1]).find(Boolean);
  return { page, eventId: id ? Number(id) : undefined, eventTitle };
}

// Where a notification leads when clicked: { page, kind?, id?, view?, search?, eventId?, eventTitle? }
// The API sends links like "events/12", "announcements/4", "hours/31", "tutoring/received/7",
// "applications". Older notifications (or ones without a link) are worked out from the message,
// and the item is then found by its title instead of its id.
const PAGES = ["dashboard", "events", "hours", "tutoring", "announcements", "profile"];

const EVENT_TITLE = [/^New event: (.+)$/, /^Your certificate for (.+) is ready$/];
const POST_TITLE = [/^New announcement: (.+)$/, / commented on (.+)$/];
const HOURS_ACTIVITY = /^Your [\d.]+ hrs for (.+) were \w+$/;

function guessPage(message) {
  const text = message.toLowerCase();
  if (text.includes("applied to join") || text.includes("asked to be reactivated")) return "applications";
  if (text.includes("event") || text.includes("certificate")) return "events";
  if (text.includes("hrs for")) return "hours";
  if (text.includes("tutoring")) return "tutoring";
  if (text.includes("announcement") || text.includes("commented on")) return "announcements";
  return "dashboard";
}

const firstMatch = (patterns, message) => patterns.map((re) => message.match(re)?.[1]).find(Boolean);

export function notificationTarget({ link, message = "" }) {
  const parts = (link || "").split("/");
  const linked = parts[0] === "applications" || parts[0] === "register-org" || PAGES.includes(parts[0]) ? parts[0] : null;
  // "dashboard" was the catch-all link for older notifications: trust the message if it says more
  const guessed = guessPage(message);
  const page = linked && !(linked === "dashboard" && guessed !== "dashboard") ? linked : guessed;
  const lastId = Number(parts[parts.length - 1]) || undefined;

  switch (page) {
    case "events":
      return { page, eventId: lastId, eventTitle: firstMatch(EVENT_TITLE, message) };
    case "announcements":
      return { page, kind: "post", id: lastId, search: firstMatch(POST_TITLE, message) };
    case "hours":
      return { page, kind: "hour", id: lastId, search: message.match(HOURS_ACTIVITY)?.[1] };
    case "tutoring":
      // Requests for your session -> "received"; answers to your own request -> "sent"
      return {
        page,
        kind: "request",
        id: lastId,
        view: parts[1] === "received" || / requested your tutoring session/.test(message) ? "received" : "sent",
      };
    case "applications":
      return { page: "hours", kind: "applications" };
    case "register-org":
      return { page: "register-org" };
    default:
      return { page };
  }
}

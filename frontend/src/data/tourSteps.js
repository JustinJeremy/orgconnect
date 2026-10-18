// Guided tour content, grouped by section (the help menu can start any section on its own).
// Each step: { title, body, page?, target?, click?, managersOnly? }
//   page   - the app page to open first ("dashboard", "events", "hours", "tutoring", "announcements", "profile")
//   click  - an element to click before the step (only tabs: the tour never changes any data)
//   target - the element to highlight; when it isn't on screen the card shows in the middle instead
//   managersOnly - only for officers who manage members (President, Vice Presidents, Secretary)

const NAV = [
  {
    target: ".sidebar .org-switcher-btn",
    title: "Switch organizations",
    body: "One account works for every org you join. Pick another org here; if you haven't joined it yet, you'll see its page and can apply. Starting a new org? \"Register an organization\" at the bottom of this menu sends it to an OrgConnect admin for review.",
  },
  {
    target: ".nav",
    title: "Main menu",
    body: "Dashboard, Events, Peer Tutoring, People, Messages, Members & Hours and Announcements. The tour visits each of them next.",
  },
  {
    target: '[data-tour="notifications"]',
    title: "Notifications",
    body: "The bell shows updates meant for you, like approved hours, new events and tutoring replies. The number counts unread ones; \"View all notifications\" at the bottom opens the full list, with filters.",
  },
];

const PROFILE = {
  key: "profile",
  label: "Profile & settings",
  steps: [
    {
      page: "profile",
      target: ".sidebar-user-btn",
      title: "Your profile",
      body: "Click your name any time to open Profile & settings.",
    },
    {
      page: "profile",
      target: ".page .stat-row.stat-accent",
      title: "Your history",
      body: "Click any of these numbers to see the full list: every hour log and who reviewed it, every event you attended or missed, and your certificates to download.",
    },
    {
      page: "profile",
      target: '[data-tour="profile-details"]',
      title: "Personal details",
      body: "Your name, student ID, email, course and year level, as officers see them on the roster. They're locked during the school year: the OrgConnect admin opens updates at the start of a new one, and fixes mistakes in the meantime.",
    },
    {
      page: "profile",
      target: '[data-tour="profile-password"]',
      title: "Change password",
      body: "Enter your current password and a new one. Your other devices are signed out for safety.",
    },
    {
      page: "profile",
      target: '[data-tour="profile-orgs"]',
      title: "My organizations",
      body: "Every org you joined or applied to, with your role in each. Switch to another one from here.",
    },
  ],
};

const FINISH = {
  target: '[data-tour="help"]',
  title: "That's the tour!",
  body: "Open this help button any time to replay the full tour or just one section.",
};

// Same for officers and members
const PEOPLE = {
  key: "people",
  label: "People",
  steps: [
    {
      page: "people",
      click: '[data-tour="tab-members"]',
      target: '[data-tour="people-directory"]',
      title: "Everyone in your org",
      body: "Officers first, then members. Click a name to open their profile: what they've done here and what they tutor. Add friends straight from here.",
    },
    {
      page: "people",
      click: '[data-tour="tab-friends"]',
      target: '[data-tour="friends-list"]',
      title: "Friends",
      body: "Your friends, from any org you're in. Requests waiting for you show above, with Accept and Decline. Friends can see each other's email.",
    },
    {
      page: "people",
      click: '[data-tour="tab-helpful"]',
      target: ['[data-tour="people-helpful"]', ".page .empty-state"],
      title: "Most helpful",
      body: "Tutors ranked by completed peer tutoring sessions. Beside it: your own tutoring and rank, and the subjects students ask for most (click one to open that session).",
    },
  ],
};

// Same for officers and members
const MESSAGES = {
  key: "messages",
  label: "Messages",
  steps: [
    {
      page: "messages",
      target: '[data-tour="messages"]',
      title: "Messages",
      body: "Message anyone in this org (to reach someone in another org, switch to that org first). Officers also have a conversation with the OrgConnect admin: the President, VPs and Secretary write in it and the other officers read along. New messages show a number beside Messages and a notification that opens the chat. Hover over your own message and press ⋯ to edit or delete it.",
    },
    {
      page: "messages",
      target: '[data-tour="messages-new"]',
      title: "Start a conversation",
      body: "Search anyone in the org. Friends you haven't messaged yet come first. You can also press Message on someone's profile or card on the People page.",
    },
    {
      page: "messages",
      target: '[data-tour="messages-new"]',
      title: "Group chats",
      body: "New, then New group: name it and pick people from this org, for a committee or a study group. Anyone in the group can add more people, rename it or leave (Members, at the top of the chat). Everyone added gets a notification.",
    },
    {
      page: "messages",
      target: ['[data-tour="messages-attach"]', '[data-tour="messages"]'],
      title: "Photos and files",
      body: "The paperclip beside the message box sends a photo (PNG or JPG, shown in the chat) or a file like a PDF, Word, Excel or PowerPoint, up to 10 MB. Officers can attach one to an announcement too.",
    },
  ],
};

const OFFICER = [
  {
    key: "dashboard",
    label: "Dashboard",
    steps: [
      {
        page: "dashboard",
        title: "Welcome to OrgConnect",
        body: "This tour shows everything officers can do, page by page. Use Next and Back (or the arrow keys); Esc leaves the tour.",
      },
      {
        page: "dashboard",
        target: ['[data-tour="search"]', ".topbar"],
        title: "Search everything",
        body: "Search (or Ctrl+K anywhere) finds people, events, tutoring sessions, announcements, learning resources and your chats in this org. Use the arrow keys and Enter to open a result.",
      },
      {
        page: "dashboard",
        target: ".stat-row",
        title: "Your org at a glance",
        body: "Active members, upcoming events, approved volunteer hours and the attendance rate, all up to date.",
      },
      {
        page: "dashboard",
        target: '[data-tour="review"]',
        title: "Needs review",
        body: "Approve or reject volunteer hours, tutoring requests and membership applications in one place. The tabs show how many are waiting.",
      },
      {
        page: "dashboard",
        target: '[data-tour="upcoming"]',
        title: "Upcoming events",
        body: "This month's calendar: days with an event are highlighted and today is orange. Click a day to see its events, then click one to open it.",
      },
      {
        page: "dashboard",
        target: '[data-tour="attendance"]',
        title: "Recent attendance",
        body: "How many members registered and actually attended your recent events.",
      },
      {
        page: "dashboard",
        target: '[data-tour="leaders"]',
        title: "Top volunteers",
        body: "Members ranked by approved volunteer hours, for recognition.",
      },
      {
        page: "dashboard",
        target: '[data-tour="dash-friends"]',
        title: "Friends",
        body: "Your friends at a glance, and any friend requests waiting for you. Click a name to see their profile.",
      },
      ...NAV.map((s) => ({ page: "dashboard", ...s })),
    ],
  },
  {
    key: "events",
    label: "Events",
    steps: [
      {
        page: "events",
        click: '[data-tour="tab-upcoming"]',
        target: '[data-tour="event-filters"]',
        title: "All, upcoming and past events",
        body: "Upcoming lists what's next; Past holds completed events where attendance was recorded; My Events shows the ones you RSVP'd to.",
      },
      {
        page: "events",
        click: '[data-tour="tab-upcoming"]',
        target: '[data-tour="event-tools"]',
        title: "Search, filter and sort",
        body: "Find events by keyword, narrow them by category, and sort by date or by most RSVPs.",
      },
      {
        page: "events",
        click: '[data-tour="tab-upcoming"]',
        target: '[data-tour="event-create"]',
        title: "Create an event",
        body: "Set the title, category, date, time, place, format (face-to-face, online or hybrid) and capacity. Every member is notified.",
      },
      {
        page: "events",
        click: '[data-tour="tab-upcoming"]',
        target: [".page .event-card:not(.skeleton-card)", ".page .empty-state"],
        title: "Event cards",
        body: "Each card shows the schedule, format and how many are going. Use the pencil to edit and the bin to delete.",
      },
      {
        page: "events",
        click: '[data-tour="tab-upcoming"]',
        target: [".page .event-card:not(.skeleton-card) .checkin-btn", ".page .event-card:not(.skeleton-card)", ".page .empty-state"],
        title: "QR check-in",
        body: "The QR icon shows the event's check-in code until the event is finished; scanning works from a day before it starts. Show it at the venue: members scan it with their phone camera and are marked present, even walk-ins. Names appear as they scan.",
      },
      {
        page: "events",
        click: '[data-tour="tab-past"]',
        target: [".page .event-card:not(.skeleton-card)", ".page .empty-state"],
        title: "Attendance and certificates",
        body: "On a past event, Attendance lets you tick who came. Marking the event completed issues certificates to everyone present.",
      },
    ],
  },
  {
    key: "tutoring",
    label: "Peer Tutoring",
    steps: [
      {
        page: "tutoring",
        click: '[data-tour="tab-sessions"]',
        target: '[data-tour="tutoring-tabs"]',
        title: "Sessions, requests and resources",
        body: "Tutoring sessions members can join, the requests they send, and shared study materials.",
      },
      {
        page: "tutoring",
        click: '[data-tour="tab-sessions"]',
        target: '[data-tour="session-post"]',
        title: "Post a session",
        body: "Any member can tutor. Give the subject, area, schedule, place and number of open slots.",
      },
      {
        page: "tutoring",
        click: '[data-tour="tab-sessions"]',
        target: [".card-grid > .session-card:not(.skeleton-card)", ".page .empty-state"],
        title: "Session cards",
        body: "Members request a slot here. Officers and the tutor can edit or delete the session, and show its check-in QR (the square icon) at each meeting.",
      },
      {
        page: "tutoring",
        click: '[data-tour="tab-requests"]',
        target: '[data-tour="tutoring-requests"]',
        title: "Answer requests",
        body: "Approve or reject each request; approving uses one slot. After the session, mark it completed.",
      },
      {
        page: "tutoring",
        click: '[data-tour="tab-resources"]',
        target: '[data-tour="resource-share"]',
        title: "Share resources",
        body: "Post links to notes, reviewers and videos, tagged by subject so members can find them.",
      },
    ],
  },
  PEOPLE,
  MESSAGES,
  {
    key: "hours",
    label: "Members & Hours",
    steps: [
      {
        page: "hours",
        click: '[data-tour="tab-hours"]',
        target: '[data-tour="hours-tabs"]',
        title: "Hours, members and requests",
        body: "Hour logs to verify, your own hours (My Hours: officers log theirs too, and the President, VPs or Secretary approve them), and the member roster. The President, VPs and Secretary also see membership applications and reactivation requests here.",
      },
      {
        page: "hours",
        click: '[data-tour="tab-hours"]',
        target: '[data-tour="hours-tools"]',
        title: "Verify volunteer hours",
        body: "Filter logs by status or search by member or activity, then approve or reject each one. Your own logs are reviewed by another officer.",
      },
      {
        page: "hours",
        click: '[data-tour="tab-hours"]',
        target: '[data-tour="hours-export"]',
        title: "Export a summary",
        body: "Download a CSV of every member's approved and pending hours for reports.",
      },
      {
        page: "hours",
        managersOnly: true,
        click: '[data-tour="tab-members"]',
        target: '[data-tour="member-add"]',
        title: "Add a member",
        body: "Add someone directly. A brand-new account gets a temporary password, shown to you once to pass on.",
      },
      {
        page: "hours",
        managersOnly: true,
        click: '[data-tour="tab-members"]',
        target: [".table tbody tr .row-actions", ".page .empty-state"],
        title: "Edit or remove",
        body: "Change a member's position or status, or remove them. Names and emails are locked to each person's account. Only the President promotes, edits or removes officers. Forgotten passwords are reset by the OrgConnect admin.",
      },
      {
        page: "hours",
        managersOnly: true,
        click: '[data-tour="tab-applications"]',
        target: '[data-tour="applications"]',
        title: "Applications and reactivations",
        body: "Students who signed up wait here with any message they wrote; rejecting asks for a reason they will see. Below are inactive members asking to be active again, with their message and the reason they were made inactive.",
      },
    ],
  },
  {
    key: "announcements",
    label: "Announcements",
    steps: [
      {
        page: "announcements",
        target: '[data-tour="announcement-create"]',
        title: "Post an announcement",
        body: "Write an update with a category (General, Event, Deadline, Urgent), and attach a photo or a file if you like (a poster, a map, the minutes). Every member is notified.",
      },
      {
        page: "announcements",
        target: [".feed > .post", ".page .empty-state"],
        title: "Manage posts",
        body: "Pin important posts to the top, edit or delete them, and see how many members have read each one.",
      },
    ],
  },
  PROFILE,
];

const MEMBER = [
  {
    key: "dashboard",
    label: "Dashboard",
    steps: [
      {
        page: "dashboard",
        title: "Welcome to OrgConnect",
        body: "This tour shows everything you can do as a member, page by page. Use Next and Back (or the arrow keys); Esc leaves the tour.",
      },
      {
        page: "dashboard",
        target: ['[data-tour="search"]', ".topbar"],
        title: "Search everything",
        body: "Search (or Ctrl+K anywhere) finds people, events, tutoring sessions, announcements, learning resources and your chats in this org. Use the arrow keys and Enter to open a result.",
      },
      {
        page: "dashboard",
        target: '[data-tour="feed"]',
        title: "Your feed",
        body: "Announcements from your officers, newest first. Like a post or leave a comment.",
      },
      {
        page: "dashboard",
        target: '[data-tour="upcoming"]',
        title: "Upcoming events",
        body: "Days with an event are highlighted and today is orange. Click a day to see its events, then click one to open it and RSVP.",
      },
      {
        page: "dashboard",
        target: '[data-tour="suggestions"]',
        title: "Suggestions",
        body: "Peer tutors with open slots (click one to see their profile), and tutoring sessions in subjects you haven't tried yet.",
      },
      {
        page: "dashboard",
        target: '[data-tour="dash-friends"]',
        title: "Friends",
        body: "Your friends at a glance, and any friend requests waiting for you. Click a name to see their profile.",
      },
      ...NAV.map((s) => ({ page: "dashboard", ...s })),
    ],
  },
  {
    key: "events",
    label: "Events",
    steps: [
      {
        page: "events",
        click: '[data-tour="tab-upcoming"]',
        target: '[data-tour="event-filters"]',
        title: "Find events",
        body: "All events, upcoming ones, past ones, and My Events for the ones you RSVP'd to.",
      },
      {
        page: "events",
        click: '[data-tour="tab-upcoming"]',
        target: '[data-tour="event-tools"]',
        title: "Search, filter and sort",
        body: "Search by keyword, filter by category, and sort by date or popularity.",
      },
      {
        page: "events",
        click: '[data-tour="tab-upcoming"]',
        target: [".page .event-card:not(.skeleton-card)", ".page .empty-state"],
        title: "RSVP",
        body: "Press RSVP to save your spot; press it again to cancel. At the event, scan the officers' QR code with your phone camera to check in, and you'll get a certificate.",
      },
    ],
  },
  {
    key: "tutoring",
    label: "Peer Tutoring",
    steps: [
      {
        page: "tutoring",
        click: '[data-tour="tab-sessions"]',
        target: [".card-grid > .session-card:not(.skeleton-card)", ".page .empty-state"],
        title: "Book a peer tutor",
        body: "Press Request session to ask for a slot. The tutor or an officer approves it and you're notified. At the session, scan the tutor's QR code to check in.",
      },
      {
        page: "tutoring",
        click: '[data-tour="tab-sessions"]',
        target: '[data-tour="session-post"]',
        title: "Become a tutor",
        body: "Good at a subject? Post your own session and answer the requests you receive.",
      },
      {
        page: "tutoring",
        click: '[data-tour="tab-requests"]',
        target: '[data-tour="tutoring-requests"]',
        title: "Your requests",
        body: "Follow your requests from pending to confirmed to completed.",
      },
      {
        page: "tutoring",
        click: '[data-tour="tab-resources"]',
        target: '[data-tour="resource-tools"]',
        title: "Study resources",
        body: "Browse notes, reviewers and videos by subject, and share your own.",
      },
    ],
  },
  PEOPLE,
  MESSAGES,
  {
    key: "hours",
    label: "Volunteer hours",
    steps: [
      {
        page: "hours",
        target: '[data-tour="log-hours"]',
        title: "Log volunteer hours",
        body: "Enter what you did, the date and how many hours. An officer verifies each log.",
      },
      {
        page: "hours",
        target: '[data-tour="my-logs"]',
        title: "Track your logs",
        body: "See each log's status (pending, approved or rejected). You can delete a log while it's still pending.",
      },
    ],
  },
  {
    key: "announcements",
    label: "Announcements",
    steps: [
      {
        page: "announcements",
        click: '[data-tour="tab-all"]',
        target: ".page > .tabs",
        title: "Stay updated",
        body: "All shows every post; Unread shows only what's new to you.",
      },
      {
        page: "announcements",
        click: '[data-tour="tab-all"]',
        target: [".feed > .post", ".page .empty-state"],
        title: "Read announcements",
        body: "Mark a post as read, or mark everything as read at once.",
      },
    ],
  },
  PROFILE,
];

// Platform admin console (AdminApp)
export const ADMIN_TOUR = [
  {
    page: "overview",
    target: '[data-tour="admin-stats"]',
    title: "Platform overview",
    body: "Totals across every org: live organizations, requests waiting for you, active members and approved volunteer hours.",
  },
  {
    page: "overview",
    target: '[data-tour="admin-requests"]',
    title: "Org requests",
    body: "Students who want to bring their org onto OrgConnect. Open View details to check everything they sent, fix the course list if needed, then approve or reject.",
  },
  {
    page: "overview",
    target: '[data-tour="admin-requests"]',
    title: "What approving does",
    body: "The org goes live in the org list, and the student who asked becomes its President. They add their own officers, then students can apply. Rejecting asks for a reason, which the student sees so they can fix it and send it again.",
  },
  {
    page: "overview",
    target: '[data-tour="admin-orgs"]',
    title: "All organizations",
    body: "Every live org with its President, members and events. Suspend hides an org and stops its members from using it until you reactivate it; nothing is deleted.",
  },
  {
    page: "accounts",
    target: '[data-tour="admin-accounts"]',
    title: "Accounts",
    body: "Look up any account. Correct someone's name, student ID, email, course or year with Edit details. When someone forgets their password, reset it here: they get a temporary password to pass on, and they change it on their profile. Only you can do this.",
  },
  {
    page: "accounts",
    target: '[data-tour="admin-details-switch"]',
    title: "New school year",
    body: "Students' details are locked during the year. Turn this on at the start of a new school year so everyone can update their course, year and details, then turn it off again.",
  },
  {
    page: "announcements",
    target: '[data-tour="admin-announce-form"]',
    title: "Announcements",
    body: "Send an update to presidents, all officers, all members or every account, in every org or only the ones you pick. It shows on their Announcements page and in their notifications.",
  },
  {
    page: "announcements",
    target: '[data-tour="admin-announce-list"]',
    title: "Replies",
    body: "Each org's President, VPs and Secretary can write back. Every org has its own private thread with you. Open an announcement to read and answer them; the menu shows how many are waiting.",
  },
  {
    page: "messages",
    target: '[data-tour="messages"]',
    title: "Messages",
    body: "Talk with an org's officers (start from Organizations → View → Message officers, or New here) and with people registering an org. On an org request, Ask for changes sends them a message and lets them edit their request.",
  },
  {
    page: "overview",
    target: '[data-tour="admin-nav"]',
    title: "Menu",
    body: "Org requests also lists the ones you rejected; Organizations shows the full table. The number shows requests waiting for review.",
  },
  { ...FINISH, page: "overview", body: "Open this help button any time to replay the tour." },
].map((step) => ({ ...step, section: "Platform admin" }));

// sectionKey = null → the full tour
export function tourSections(isOfficer) {
  return isOfficer ? OFFICER : MEMBER;
}

// canManageMembers = false leaves out the steps about managing the roster
export function buildTour(isOfficer, sectionKey = null, canManageMembers = false) {
  const sections = tourSections(isOfficer);
  const label = (s) => s.steps.filter((step) => canManageMembers || !step.managersOnly).map((step) => ({ ...step, section: s.label }));
  if (sectionKey) return label(sections.find((s) => s.key === sectionKey));
  return [...sections.flatMap(label), { ...FINISH, section: "Done" }];
}

// The admin tour in parts, for the help menu's "Or just one part" (same order as the full tour)
const adminPart = (key, label, titles) => ({
  key,
  label,
  steps: ADMIN_TOUR.filter((step) => titles.includes(step.title)).map((step) => ({ ...step, section: label })),
});
export const ADMIN_SECTIONS = [
  adminPart("overview", "Overview", ["Platform overview"]),
  adminPart("requests", "Org requests", ["Org requests", "What approving does"]),
  adminPart("organizations", "Organizations", ["All organizations"]),
  adminPart("accounts", "Accounts", ["Accounts", "New school year"]),
  adminPart("announcements", "Announcements", ["Announcements", "Replies"]),
  adminPart("messages", "Messages", ["Messages"]),
  adminPart("menu", "Getting around", ["Menu"]),
];

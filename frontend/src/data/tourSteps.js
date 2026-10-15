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
    body: "One account works for every org you join. Pick another org here; if you haven't joined it yet, you'll see its page and can apply.",
  },
  {
    target: ".nav",
    title: "Main menu",
    body: "Dashboard, Events, Members & Hours, Peer Tutoring and Announcements. The tour visits each of them next.",
  },
  {
    target: '[data-tour="notifications"]',
    title: "Notifications",
    body: "The bell shows updates meant for you, like approved hours, new events and tutoring replies. The number counts unread ones.",
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
      target: '[data-tour="profile-details"]',
      title: "Personal details",
      body: "Keep your name, student ID, email, course and year level up to date. Officers see these on the member roster.",
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
        body: "The next events with their RSVP count against capacity. View all opens the Events page.",
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
        target: ".page > .tabs",
        title: "Upcoming and past events",
        body: "Upcoming lists what's next; Past holds completed events where attendance was recorded.",
      },
      {
        page: "events",
        click: '[data-tour="tab-upcoming"]',
        target: ".page > .toolbar",
        title: "Search, filter and sort",
        body: "Find events by keyword, narrow them by category, and sort by date or by most RSVPs.",
      },
      {
        page: "events",
        click: '[data-tour="tab-upcoming"]',
        target: ".page > .toolbar .toolbar-cta",
        title: "Create an event",
        body: "Set the title, category, date, time, place, format (face-to-face, online or hybrid) and capacity. Every member is notified.",
      },
      {
        page: "events",
        click: '[data-tour="tab-upcoming"]',
        target: ".card-grid > .event-card",
        title: "Event cards",
        body: "Each card shows the schedule, format and how many are going. Use the pencil to edit and the bin to delete.",
      },
      {
        page: "events",
        click: '[data-tour="tab-past"]',
        target: ".card-grid > .event-card",
        title: "Attendance and certificates",
        body: "On a past event, Attendance lets you tick who came. Marking the event completed issues certificates to everyone present.",
      },
    ],
  },
  {
    key: "hours",
    label: "Members & Hours",
    steps: [
      {
        page: "hours",
        click: '[data-tour="tab-hours"]',
        target: ".page > .tabs",
        title: "Hours, members and applications",
        body: "Hour logs to verify and the member roster. The President, Vice Presidents and Secretary also see new membership applications here.",
      },
      {
        page: "hours",
        click: '[data-tour="tab-hours"]',
        target: ".page > .toolbar",
        title: "Verify volunteer hours",
        body: "Filter logs by status or search by member or activity, then approve or reject each one. Your own logs are reviewed by another officer.",
      },
      {
        page: "hours",
        click: '[data-tour="tab-hours"]',
        target: ".page > .toolbar .toolbar-cta",
        title: "Export a summary",
        body: "Download a CSV of every member's approved and pending hours for reports.",
      },
      {
        page: "hours",
        managersOnly: true,
        click: '[data-tour="tab-members"]',
        target: ".page > .toolbar .toolbar-cta",
        title: "Add a member",
        body: "Add someone directly. A brand-new account gets a temporary password, shown to you once to pass on.",
      },
      {
        page: "hours",
        managersOnly: true,
        click: '[data-tour="tab-members"]',
        target: ".table tbody tr .row-actions",
        title: "Edit, reset or remove",
        body: "Change a member's status, reset a forgotten password (key icon), or remove them. Only the President promotes, edits or removes officers.",
      },
      {
        page: "hours",
        managersOnly: true,
        click: '[data-tour="tab-applications"]',
        target: '[data-tour="applications"]',
        title: "Membership applications",
        body: "Students who signed up wait here until an officer approves or declines them.",
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
        target: ".page > .tabs",
        title: "Sessions, requests and resources",
        body: "Tutoring sessions members can join, the requests they send, and shared study materials.",
      },
      {
        page: "tutoring",
        click: '[data-tour="tab-sessions"]',
        target: ".page > .toolbar .toolbar-cta",
        title: "Post a session",
        body: "Any member can tutor. Give the subject, area, schedule, place and number of open slots.",
      },
      {
        page: "tutoring",
        click: '[data-tour="tab-sessions"]',
        target: ".card-grid > .session-card",
        title: "Session cards",
        body: "Members request a slot here. Officers and the tutor can edit or delete the session.",
      },
      {
        page: "tutoring",
        click: '[data-tour="tab-requests"]',
        target: ".page > .panel.flush",
        title: "Answer requests",
        body: "Approve or reject each request; approving uses one slot. After the session, mark it completed.",
      },
      {
        page: "tutoring",
        click: '[data-tour="tab-resources"]',
        target: ".page > .toolbar .toolbar-cta",
        title: "Share resources",
        body: "Post links to notes, reviewers and videos, tagged by subject so members can find them.",
      },
    ],
  },
  {
    key: "announcements",
    label: "Announcements",
    steps: [
      {
        page: "announcements",
        target: ".page > .toolbar .toolbar-cta",
        title: "Post an announcement",
        body: "Write an update with a category (General, Event, Deadline, Urgent). Every member is notified.",
      },
      {
        page: "announcements",
        target: ".feed > .post",
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
        target: ".stat-row",
        title: "Your activity",
        body: "Your approved volunteer hours, upcoming RSVPs, events attended and certificates earned.",
      },
      {
        page: "dashboard",
        target: '[data-tour="my-events"]',
        title: "My upcoming events",
        body: "Events you RSVP'd to, soonest first.",
      },
      {
        page: "dashboard",
        target: '[data-tour="dash-announcements"]',
        title: "Latest announcements",
        body: "The newest updates from your officers. Pinned posts stay on top.",
      },
      {
        page: "dashboard",
        target: '[data-tour="certificates"]',
        title: "My certificates",
        body: "Download a PDF certificate for every event you attended.",
      },
      {
        page: "dashboard",
        target: '[data-tour="leaders"]',
        title: "Top volunteers",
        body: "Members ranked by approved volunteer hours. Log your hours to climb the list!",
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
        target: ".page > .tabs",
        title: "Find events",
        body: "Upcoming events, past ones, and My RSVPs for the events you're going to.",
      },
      {
        page: "events",
        click: '[data-tour="tab-upcoming"]',
        target: ".page > .toolbar",
        title: "Search, filter and sort",
        body: "Search by keyword, filter by category, and sort by date or popularity.",
      },
      {
        page: "events",
        click: '[data-tour="tab-upcoming"]',
        target: ".card-grid > .event-card",
        title: "RSVP",
        body: "Press RSVP to save your spot; press it again to cancel. Attend and you'll get a certificate.",
      },
    ],
  },
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
    key: "tutoring",
    label: "Peer Tutoring",
    steps: [
      {
        page: "tutoring",
        click: '[data-tour="tab-sessions"]',
        target: ".card-grid > .session-card",
        title: "Book a peer tutor",
        body: "Press Request session to ask for a slot. The tutor or an officer approves it and you're notified.",
      },
      {
        page: "tutoring",
        click: '[data-tour="tab-sessions"]',
        target: ".page > .toolbar .toolbar-cta",
        title: "Become a tutor",
        body: "Good at a subject? Post your own session and answer the requests you receive.",
      },
      {
        page: "tutoring",
        click: '[data-tour="tab-requests"]',
        target: ".page > .panel.flush",
        title: "Your requests",
        body: "Follow your requests from pending to confirmed to completed.",
      },
      {
        page: "tutoring",
        click: '[data-tour="tab-resources"]',
        target: ".page > .toolbar",
        title: "Study resources",
        body: "Browse notes, reviewers and videos by subject, and share your own.",
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
        target: ".feed > .post",
        title: "Read announcements",
        body: "Mark a post as read, or mark everything as read at once.",
      },
    ],
  },
  PROFILE,
];

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

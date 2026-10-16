import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./context/AuthContext.jsx";
import { useOrg } from "./context/OrgContext.jsx";
import Landing from "./pages/Landing.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Events from "./pages/Events.jsx";
import VolunteerHours from "./pages/VolunteerHours.jsx";
import Tutoring from "./pages/Tutoring.jsx";
import Announcements from "./pages/Announcements.jsx";
import JoinOrg from "./pages/JoinOrg.jsx";
import RegisterOrg from "./pages/RegisterOrg.jsx";
import AdminApp from "./pages/AdminApp.jsx";
import useUrlPage from "./hooks/useUrlPage.js";
import RejectApplicationDialog from "./components/RejectApplicationDialog.jsx";
import { ADMIN_THEME, applyTheme } from "./utils/theme.js";
import Profile from "./pages/Profile.jsx";
import Notifications from "./pages/Notifications.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";
import Toast from "./components/Toast.jsx";
import AttendanceModal from "./components/AttendanceModal.jsx";
import ConfirmDialog from "./components/ConfirmDialog.jsx";
import TemporaryPasswordDialog from "./components/TemporaryPasswordDialog.jsx";
import Tour from "./components/Tour.jsx";
import AvatarPicker from "./components/AvatarPicker.jsx";
import { buildTour, tourSections } from "./data/tourSteps.js";
import { errorMessage } from "./api/client.js";
import { notificationTarget } from "./utils/notificationTarget.js";
import {
  announcementsApi,
  eventsApi,
  hoursApi,
  membersApi,
  notificationsApi,
  tutoringApi,
} from "./api/services.js";

const APP_PAGES = ["dashboard", "events", "hours", "tutoring", "announcements", "profile", "notifications"];

const PAGE_META = {
  notifications: { title: "Notifications" },
  events: {
    title: "Events",
    officer: "Create events, track RSVPs and record attendance",
    member: "Find events and opportunities to join",
  },
  hours: {
    title: "Members & Hours",
    officer: "Verify volunteer hours and manage the member roster",
    member: "Log your volunteer hours and track their status",
  },
  tutoring: {
    title: "Peer Tutoring",
    officer: "Manage tutoring sessions, requests and shared materials",
    member: "Book a session with a peer tutor",
  },
  announcements: {
    title: "Announcements",
    officer: "Post updates for the whole organization",
    member: "Updates from your officers",
  },
  profile: {
    title: "Profile & settings",
    officer: "Your account details, password and organizations",
    member: "Your account details, password and organizations",
  },
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// Lists loaded from the API. Members, applications and reactivation requests are officer-only.
const LOADERS = {
  events: eventsApi.list,
  hours: hoursApi.list,
  leaderboard: hoursApi.leaderboard,
  sessions: tutoringApi.sessions,
  requests: tutoringApi.requests,
  resources: tutoringApi.resources,
  announcements: announcementsApi.list,
  notifications: notificationsApi.list,
  certificates: eventsApi.certificates,
};
const OFFICER_LOADERS = {
  members: membersApi.list,
  applications: membersApi.applications,
  reactivations: membersApi.reactivations,
};
const EMPTY_DATA = Object.fromEntries(
  [...Object.keys(LOADERS), ...Object.keys(OFFICER_LOADERS)].map((key) => [key, []])
);

function MainApp() {
  const { user } = useAuth();
  const isOfficer = user.role === "officer";
  // The page is in the address bar (/events, /hours...): refresh, Back and new tabs work
  const [page, setPage] = useUrlPage(APP_PAGES, "dashboard");
  // Goes up when you click the menu item of the page you're already on: the page starts over
  // (its first tab, no filters)
  const [pageReset, setPageReset] = useState(0);
  const navigate = (next) => {
    if (next === page) setPageReset((n) => n + 1);
    setPage(next);
  };
  // An item to show and highlight on its page (from a notification or a dashboard card):
  // { page, key, ...notificationTarget() }, e.g. { page: "events", eventId } or { page: "hours", kind: "hour", id }
  const [focus, setFocus] = useState(null);
  const clearFocus = useCallback(() => setFocus(null), []);
  const focusFor = (name) => (focus?.page === name ? focus : null);
  const [menuOpen, setMenuOpen] = useState(false);
  // Desktop: the sidebar can shrink to icons only (remembered on this browser)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("orgconnect_sidebar_collapsed") === "1";
    } catch {
      return false;
    }
  });
  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem("orgconnect_sidebar_collapsed", c ? "0" : "1");
      } catch {
        /* storage blocked: still toggles for this visit */
      }
      return !c;
    });

  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [attendanceEvent, setAttendanceEvent] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [reasonState, setReasonState] = useState(null); // { app, resolve }: rejecting an application
  const [tempPassword, setTempPassword] = useState(null); // { name, email, password, isNew }

  const [toast, setToast] = useState(null);
  const [tourSteps, setTourSteps] = useState(null); // the guided tour while it runs
  const toastTimer = useRef(null);

  const flash = useCallback((message, tone = "default") => {
    setToast({ message, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // ---- Loading ----
  const loaders = isOfficer ? { ...LOADERS, ...OFFICER_LOADERS } : LOADERS;

  const reload = useCallback(
    async (...keys) => {
      const list = keys.length ? keys : Object.keys(loaders);
      const results = await Promise.allSettled(list.map((key) => loaders[key]()));
      const next = {};
      let failed = null;
      results.forEach((r, i) => {
        if (r.status === "fulfilled") next[list[i]] = r.value || [];
        else failed = failed || r.reason;
      });
      setData((d) => ({ ...d, ...next }));
      return failed;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOfficer]
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const failed = await reload();
    if (failed) setLoadError(errorMessage(failed));
    setLoading(false);
  }, [reload]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ---- Guided tour (help button in the top bar) ----
  const startTour = (sectionKey = null) => {
    setMenuOpen(false);
    setTourSteps(buildTour(isOfficer, sectionKey, user.canManageMembers));
  };

  // Show the full tour automatically the first time someone signs in on this browser
  useEffect(() => {
    if (loading) return;
    const key = `orgconnect_tour_seen_${user.id}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      return; // storage blocked: don't start a tour on every visit
    }
    setTourSteps(buildTour(isOfficer, null, user.canManageMembers));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Check for new notifications every minute
  useEffect(() => {
    const timer = setInterval(() => reload("notifications"), 60000);
    return () => clearInterval(timer);
  }, [reload]);

  // ---- Helpers for actions ----
  const set = (key, fn) => setData((d) => ({ ...d, [key]: fn(d[key]) }));
  const upsert = (key, item) =>
    set(key, (list) => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list]));
  const drop = (key, id) => set(key, (list) => list.filter((x) => x.id !== id));

  // Runs an API call, shows a toast, returns true when it worked
  const run = async (task, success) => {
    try {
      await task();
      if (success) flash(success);
      return true;
    } catch (error) {
      flash(errorMessage(error), "error");
      return false;
    }
  };

  const confirm = (options) =>
    new Promise((resolve) => setConfirmState({ ...options, resolve }));
  // Resolves with the typed reason, or null if cancelled
  const askReason = (app) => new Promise((resolve) => setReasonState({ app, resolve }));

  const closeConfirm = (answer) => {
    confirmState?.resolve(answer);
    setConfirmState(null);
  };

  // ---- Events ----
  const events = {
    // poster: a File to upload, null to remove the current one, undefined to leave it as is
    save: (id, form, poster) =>
      run(async () => {
        let event = id ? await eventsApi.update(id, form) : await eventsApi.create(form);
        upsert("events", event);
        try {
          if (poster) event = await eventsApi.uploadPoster(event.id, poster);
          else if (poster === null && event.posterUrl) event = await eventsApi.removePoster(event.id);
          upsert("events", event);
        } catch (error) {
          // The event itself is saved, so don't keep the form open (saving again would publish it twice)
          flash(`${id ? "Event updated" : "Event published"}, but the poster wasn't saved: ${errorMessage(error)}`, "error");
          return;
        }
        flash(id ? "Event updated" : "Event published");
      }),
    remove: async (event) => {
      const ok = await confirm({
        title: "Delete event?",
        message: `"${event.title}" and its RSVPs will be removed. This can't be undone.`,
        confirmLabel: "Delete event",
      });
      if (ok) run(async () => (await eventsApi.remove(event.id), drop("events", event.id)), "Event deleted");
    },
    toggleRsvp: (event, going) =>
      run(
        async () => upsert("events", going ? await eventsApi.cancelRsvp(event.id) : await eventsApi.rsvp(event.id)),
        going ? "RSVP cancelled" : `You're going to ${event.title}`
      ),
    openAttendance: setAttendanceEvent,
    saveAttendance: async (event, registrations, completed) => {
      const present = registrations.filter((r) => r.status === "attended");
      const ok = await run(
        async () => upsert("events", await eventsApi.saveAttendance(event.id, present.map((r) => r.id), completed)),
        completed ? `Attendance saved. Certificates issued to ${present.length}.` : "Attendance saved"
      );
      if (ok) setAttendanceEvent(null);
    },
    downloadCertificate: (event) =>
      run(async () => {
        const res = await eventsApi.certificate(event.id);
        const url = URL.createObjectURL(res.data);
        const link = document.createElement("a");
        link.href = url;
        link.download = `certificate-${event.id}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      }),
  };

  // ---- Hours & members ----
  const hours = {
    log: (form) => run(async () => upsert("hours", await hoursApi.create(form)), "Hours submitted for review"),
    decide: (log, status) =>
      run(async () => {
        upsert("hours", await hoursApi.decide(log.id, status));
        reload("leaderboard", ...(isOfficer ? ["members"] : []));
      }, `${log.hours} hrs ${status === "Approved" ? "approved" : "rejected"} for ${log.memberName}`),
    remove: async (log) => {
      const ok = await confirm({
        title: "Delete this log?",
        message: `${log.hours} hrs for "${log.activity}" will be removed.`,
        confirmLabel: "Delete",
      });
      if (ok) run(async () => (await hoursApi.remove(log.id), drop("hours", log.id)), "Hour log deleted");
    },
  };

  const members = {
    save: (id, form) =>
      run(async () => {
        if (id) return upsert("members", await membersApi.update(id, form));
        const { temporaryPassword, ...member } = await membersApi.create(form);
        upsert("members", member);
        // A brand-new account: show its temporary password once
        if (temporaryPassword) setTempPassword({ name: member.name, email: member.email, password: temporaryPassword, isNew: true });
      }, id ? "Member updated" : `${form.name} added`),
    resetPassword: async (member) => {
      const ok = await confirm({
        title: "Reset password?",
        message: `${member.name} will get a new temporary password and be signed out on all devices.`,
        confirmLabel: "Reset password",
      });
      if (ok)
        run(async () => {
          const { temporaryPassword } = await membersApi.resetPassword(member.id);
          setTempPassword({ name: member.name, email: member.email, password: temporaryPassword, isNew: false });
        });
    },
    remove: async (member) => {
      const ok = await confirm({
        title: "Remove member?",
        message: `${member.name} will be removed from the roster.`,
        confirmLabel: "Remove",
      });
      if (ok) run(async () => (await membersApi.remove(member.id), drop("members", member.id)), `${member.name} removed`);
    },
    decideApplication: async (app, status) => {
      // Rejecting asks for a reason, which the applicant sees
      const reason = status === "Rejected" ? await askReason(app) : null;
      if (status === "Rejected" && reason === null) return;
      await run(async () => {
        upsert("applications", await membersApi.decideApplication(app.id, status, reason));
        if (status === "Approved") reload("members");
      }, status === "Approved" ? `${app.name} is now a member` : `${app.name}'s application was declined`);
    },
    decideReactivation: (request, status) =>
      run(async () => {
        await membersApi.decideReactivation(request.id, status);
        drop("reactivations", request.id);
        if (status === "Approved") reload("members");
      }, status === "Approved" ? `${request.name} is active again` : `${request.name}'s request was declined`),
  };

  // ---- Tutoring ----
  const tutoring = {
    saveSession: (id, form) =>
      run(async () => upsert("sessions", id ? await tutoringApi.updateSession(id, form) : await tutoringApi.createSession(form)), id ? "Session updated" : "Session posted"),
    removeSession: async (session) => {
      const ok = await confirm({
        title: "Delete session?",
        message: `"${session.subject}" and its pending requests will be removed.`,
        confirmLabel: "Delete session",
      });
      if (ok)
        run(async () => {
          await tutoringApi.removeSession(session.id);
          drop("sessions", session.id);
          set("requests", (list) => list.filter((r) => r.sessionId !== session.id));
        }, "Session deleted");
    },
    request: (session) => run(async () => upsert("requests", await tutoringApi.request(session.id)), "Request sent to the tutor"),
    decide: (req, status) =>
      run(
        async () => {
          upsert("requests", await tutoringApi.decideRequest(req.id, status));
          if (status === "Confirmed") reload("sessions"); // approving uses up a slot
        },
        { Confirmed: "Tutoring request approved", Rejected: "Tutoring request rejected", Completed: "Session marked as completed" }[status]
      ),
    saveResource: (id, form) =>
      run(async () => upsert("resources", id ? await tutoringApi.updateResource(id, form) : await tutoringApi.createResource(form)), id ? "Resource updated" : "Resource shared"),
    removeResource: async (resource) => {
      const ok = await confirm({
        title: "Delete resource?",
        message: `"${resource.title}" will be removed for everyone.`,
        confirmLabel: "Delete",
      });
      if (ok) run(async () => (await tutoringApi.removeResource(resource.id), drop("resources", resource.id)), "Resource deleted");
    },
  };

  // ---- Announcements ----
  const announcements = {
    save: (id, form) =>
      run(async () => upsert("announcements", id ? await announcementsApi.update(id, form) : await announcementsApi.create(form)), id ? "Announcement updated" : "Announcement posted"),
    remove: async (post) => {
      const ok = await confirm({
        title: "Delete announcement?",
        message: `"${post.title}" will be removed for everyone.`,
        confirmLabel: "Delete",
      });
      if (ok) run(async () => (await announcementsApi.remove(post.id), drop("announcements", post.id)), "Announcement deleted");
    },
    togglePin: (post) =>
      run(async () => upsert("announcements", await announcementsApi.update(post.id, { ...post, pinned: !post.pinned })), post.pinned ? "Unpinned" : "Pinned to the top"),
    markRead: (post) => run(async () => upsert("announcements", await announcementsApi.markRead(post.id))),
    markAllRead: () =>
      run(async () => {
        await announcementsApi.markAllRead();
        set("announcements", (list) => list.map((a) => ({ ...a, isRead: true })));
      }, "All caught up"),
  };

  const markNotificationsRead = () =>
    run(async () => {
      await notificationsApi.markAllRead();
      set("notifications", (list) => list.map((n) => ({ ...n, isRead: true })));
    });

  // Clicking a notification (read or unread) marks it read and opens the page it is about
  const openNotification = (notification) => {
    if (!notification.isRead) {
      set("notifications", (list) => list.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
      notificationsApi.markRead(notification.id).catch(() => reload("notifications"));
    }
    const target = notificationTarget(notification);
    setPage(target.page);
    // Show and highlight the item the notification is about (if it has one)
    setFocus(target.page !== "dashboard" ? { ...target, key: Date.now() } : null);
  };

  // Dashboard event cards: open the Events page on that event (same highlight as a notification)
  const openEvent = (event) => {
    setPage("events");
    setFocus({ page: "events", eventId: event.id, eventTitle: event.title, key: Date.now() });
  };

  // Dashboard calendar: open Peer Tutoring on that session
  const openSession = (session) => {
    setPage("tutoring");
    setFocus({ page: "tutoring", kind: "session", id: session.id, search: session.subject, key: Date.now() });
  };

  // ---- Page ----
  const meta =
    page === "dashboard"
      ? {
          // Figma: officers get a greeting, members a plain "Dashboard"
          title: isOfficer ? `${greeting()}, ${user.name.split(" ")[0]}` : "Dashboard",
          subtitle: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
        }
      : { title: PAGE_META[page].title }; // Figma: page titles stand alone, no subtitle

  const pageProps = { data, loading, onNavigate: setPage, flash };

  const topbar = (
    <Topbar
      title={meta.title}
      subtitle={meta.subtitle}
      notifications={data.notifications}
      onMarkAllRead={markNotificationsRead}
      onOpenNotification={openNotification}
      onViewAll={() => setPage("notifications")}
      onOpenMenu={() => setMenuOpen(true)}
      tourSections={tourSections(isOfficer)}
      onStartTour={startTour}
    />
  );

  const errorBanner = loadError && (
    <div className="banner banner-error" role="alert">
      <span>{loadError}</span>
      <button type="button" className="btn btn-outline btn-sm" onClick={loadAll}>
        Try again
      </button>
    </div>
  );

  return (
    <div className={`layout ${collapsed ? "is-collapsed" : ""}`}>
      <Sidebar
        page={page}
        onNavigate={navigate}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />

      <main className={`main ${page === "dashboard" ? "main-dashboard" : ""}`}>
        {page === "dashboard" ? (
          // The dashboard lays out its own header column and right-hand rail (Figma)
          <Dashboard
            {...pageProps}
            header={<>{topbar}{errorBanner}</>}
            events={events}
            hours={hours}
            members={members}
            tutoring={tutoring}
            announcements={announcements}
            onOpenEvent={openEvent}
            onOpenSession={openSession}
          />
        ) : (
          <>
            {topbar}
            {errorBanner}
            {page === "events" && <Events key={pageReset} {...pageProps} actions={events} focus={focusFor("events")} onFocusDone={clearFocus} />}
            {page === "hours" && <VolunteerHours key={pageReset} {...pageProps} hours={hours} members={members} focus={focusFor("hours")} onFocusDone={clearFocus} />}
            {page === "tutoring" && <Tutoring key={pageReset} {...pageProps} actions={tutoring} focus={focusFor("tutoring")} onFocusDone={clearFocus} />}
            {page === "announcements" && <Announcements key={pageReset} {...pageProps} actions={announcements} focus={focusFor("announcements")} onFocusDone={clearFocus} />}
            {page === "profile" && <Profile key={pageReset} {...pageProps} />}
            {page === "notifications" && <Notifications key={pageReset} {...pageProps} onOpen={openNotification} onMarkAllRead={markNotificationsRead} />}
          </>
        )}
      </main>

      {attendanceEvent && (
        <AttendanceModal
          key={attendanceEvent.id}
          event={attendanceEvent}
          onClose={() => setAttendanceEvent(null)}
          onSave={events.saveAttendance}
        />
      )}

      {confirmState && (
        <ConfirmDialog
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          onCancel={() => closeConfirm(false)}
          onConfirm={() => closeConfirm(true)}
        />
      )}

      {reasonState && (
        <RejectApplicationDialog
          applicant={reasonState.app}
          onCancel={() => {
            reasonState.resolve(null);
            setReasonState(null);
          }}
          onReject={(reason) => {
            reasonState.resolve(reason);
            setReasonState(null);
          }}
        />
      )}

      {tempPassword && <TemporaryPasswordDialog {...tempPassword} onClose={() => setTempPassword(null)} />}

      {tourSteps && <Tour steps={tourSteps} page={page} onNavigate={setPage} onClose={() => setTourSteps(null)} />}

      <Toast toast={toast} />
    </div>
  );
}

function App() {
  const { current, loading: orgsLoading, error: orgsError, reload } = useOrg();
  const { user, checking, registeringOrg, setAvatar } = useAuth();
  const isAdmin = Boolean(user?.isAdmin);
  // "Skip for now" on the avatar picker is remembered on this browser; Profile can still set one
  const skipKey = user ? `orgconnect_avatar_skipped_${user.id}` : null;
  const [avatarSkipped, setAvatarSkipped] = useState(false);
  const skippedBefore = () => {
    try {
      return Boolean(skipKey && localStorage.getItem(skipKey));
    } catch {
      return false;
    }
  };
  const skipAvatar = () => {
    try {
      localStorage.setItem(skipKey, "1");
    } catch {
      /* storage blocked: skipped for this visit only */
    }
    setAvatarSkipped(true);
  };
  // Recolor the whole app: the selected org's palette, or charcoal for the platform admin
  useEffect(() => {
    applyTheme(isAdmin ? ADMIN_THEME : current?.theme);
  }, [isAdmin, current]);
  const loadingScreen = <div className="app-loading" aria-busy="true" aria-label="Loading" />;

  if (orgsLoading || checking) return loadingScreen;
  if (!current) {
    return (
      <div className="app-error" role="alert">
        <p>{orgsError || "No organizations found."}</p>
        <button type="button" className="btn btn-primary" onClick={reload}>Try again</button>
      </div>
    );
  }
  if (!user) return <Landing />;
  // Platform admins have their own console; they don't belong to any org
  if (isAdmin) return <AdminApp />;
  // Registering a new org (from the landing page or the org menu)
  if (registeringOrg) return <RegisterOrg />;
  if (user.orgSlug !== current.slug) return loadingScreen; // switching orgs
  // Not a member yet, still under review, or inactive: the org's own screen instead of the app
  if (user.membershipStatus !== "Active") return <JoinOrg />;
  // First time in after being approved: pick an avatar
  if (!user.avatar && !avatarSkipped && !skippedBefore()) {
    return <AvatarPicker user={user} orgName={current.shortName} onSave={setAvatar} onSkip={skipAvatar} />;
  }
  // key: switching orgs starts the app fresh and loads that org's data
  return <MainApp key={current.slug} />;
}

export default App;

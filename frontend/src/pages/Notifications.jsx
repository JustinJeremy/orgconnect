import { useState } from "react";
import Icon from "../components/Icon.jsx";
import Tabs from "../components/Tabs.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Pagination from "../components/Pagination.jsx";
import usePagedList from "../hooks/usePagedList.js";
import { notificationsApi } from "../api/services.js";
import { relativeDate } from "../utils/format.js";

// Every notification, not just the bell's latest few: All / Unread, a type filter, and pages.
// Clicking one opens what it's about (and marks it read), the same as in the bell.
const PER_PAGE = 12;
const TYPES = [
  { key: "All", label: "All types" },
  { key: "events", label: "Events" },
  { key: "hours", label: "Volunteer hours" },
  { key: "tutoring", label: "Peer tutoring" },
  { key: "announcements", label: "Announcements" },
  { key: "membership", label: "Membership" },
];
// The icon for each notification, from the page it links to
const ICONS = { events: "calendar", hours: "clock", tutoring: "book", announcements: "megaphone" };
const iconFor = (link = "") => ICONS[link.split("/")[0]] || "users";

export default function Notifications({ data, onOpen, onMarkAllRead }) {
  const [view, setView] = useState("all");
  const [type, setType] = useState("All");
  // Reloads when a notification is read here or in the bell (data.notifications changes)
  const list = usePagedList(notificationsApi.page, { view: view === "unread" ? "unread" : "", type }, PER_PAGE, data.notifications);
  const unread = data.notifications.filter((n) => !n.isRead).length;

  return (
    <div className="page">
      <div className="tab-card" data-tour="notifications-page">
        <Tabs
          label="Show"
          value={view}
          onChange={setView}
          items={[
            { key: "all", label: "All" },
            { key: "unread", label: "Unread", count: unread },
          ]}
        />
        <button type="button" className="btn btn-outline toolbar-cta" onClick={onMarkAllRead} disabled={!unread}>
          <Icon name="check" size={16} /> Mark all as read
        </button>
      </div>

      <div className="toolbar">
        <label htmlFor="notif-type" className="sr-only">Type</label>
        <select id="notif-type" className="input select notif-type" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        {list.loaded && <span className="muted">{list.total} {list.total === 1 ? "notification" : "notifications"}</span>}
      </div>

      <section className="panel flush">
        {!list.loaded ? (
          <div className="skeleton-list padded" aria-hidden="true"><span /><span /><span /></div>
        ) : list.total === 0 ? (
          <EmptyState
            icon="bell"
            title={view === "unread" ? "You're all caught up" : "No notifications here"}
            text={view === "unread" ? "New updates for you will show up here." : "Try another type."}
          />
        ) : (
          <ul className={`notif-page-list ${list.pending ? "is-pending" : ""}`}>
            {list.items.map((n) => (
              <li key={n.id}>
                <button type="button" className={`notif-page-item ${n.isRead ? "" : "unread"}`} onClick={() => onOpen(n)}>
                  <span className="notif-page-icon"><Icon name={iconFor(n.link)} size={18} /></span>
                  <span className="notif-page-text">
                    <span className="notif-msg">{n.message}</span>
                    <span className="notif-when">{relativeDate(n.createdAt)}</span>
                  </span>
                  {!n.isRead && <span className="notif-dot" aria-label="Unread" />}
                  <Icon name="arrowRight" size={15} className="notif-go" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Pagination page={list.page} totalPages={list.totalPages} onChange={list.setPage} />
    </div>
  );
}

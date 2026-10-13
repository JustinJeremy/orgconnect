import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { relativeDate } from "../utils/format.js";

export default function Topbar({ title, subtitle, notifications, onMarkAllRead, onOpenMenu }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const unread = notifications.filter((n) => !n.isRead).length;

  // Close the notification panel when clicking outside it
  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-title">
        <button type="button" className="icon-btn menu-btn" aria-label="Open menu" onClick={onOpenMenu}>
          <Icon name="menu" size={20} />
        </button>
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      <div className="notif-wrap" ref={panelRef}>
        <button
          type="button"
          className="icon-btn bordered"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <Icon name="bell" size={19} />
          {unread > 0 && <span className="notif-count">{unread > 9 ? "9+" : unread}</span>}
        </button>

        {open && (
          <div className="notif-panel">
            <div className="notif-head">
              <strong>Notifications</strong>
              {unread > 0 && (
                <button type="button" className="link-btn" onClick={onMarkAllRead}>
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="notif-empty">No notifications yet.</p>
            ) : (
              <div className="notif-list">
                {notifications.slice(0, 8).map((n) => (
                  <div key={n.id} className={`notif-item ${n.isRead ? "" : "unread"}`}>
                    <span className="notif-dot" />
                    <div>
                      <div className="notif-msg">{n.message}</div>
                      <div className="notif-when">{relativeDate(n.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { relativeDate } from "../utils/format.js";

// tourSections: [{ key, label }] for the help menu; onStartTour(sectionKey | null) starts the guided tour
// onOpenNotification(notification): marks it read and goes to its page
export default function Topbar({ title, subtitle, notifications, onMarkAllRead, onOpenNotification, onOpenMenu, tourSections, onStartTour }) {
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const panelRef = useRef(null);
  const helpRef = useRef(null);

  const unread = notifications.filter((n) => !n.isRead).length;

  // Close the notification panel and the help menu when clicking outside them
  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
      if (helpRef.current && !helpRef.current.contains(e.target)) setHelpOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const startTour = (sectionKey) => {
    setHelpOpen(false);
    onStartTour(sectionKey);
  };

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

      <div className="topbar-actions">
        <div className="notif-wrap" ref={helpRef}>
          <button
            type="button"
            className="icon-btn bordered"
            data-tour="help"
            aria-label="Guided tour"
            title="Guided tour"
            aria-expanded={helpOpen}
            onClick={() => setHelpOpen(!helpOpen)}
          >
            <Icon name="help" size={19} />
          </button>

          {helpOpen && (
            <div className="notif-panel help-panel">
              <div className="notif-head">
                <strong>Guided tour</strong>
              </div>
              <div className="help-body">
                <p className="muted small">A step-by-step walkthrough of every feature. Replay it any time.</p>
                <button type="button" className="btn btn-primary btn-block" onClick={() => startTour(null)}>
                  Take the full tour
                </button>
                {tourSections.length > 0 && <p className="help-label">Or just one part</p>}
                <ul className="help-list">
                  {tourSections.map((s) => (
                    <li key={s.key}>
                      <button type="button" className="help-item" onClick={() => startTour(s.key)}>
                        {s.label}
                        <Icon name="arrowRight" size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="notif-wrap" ref={panelRef}>
          <button
            type="button"
            className="icon-btn bordered"
            data-tour="notifications"
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
                    <button
                      type="button"
                      key={n.id}
                      className={`notif-item ${n.isRead ? "" : "unread"}`}
                      onClick={() => {
                        setOpen(false);
                        onOpenNotification(n);
                      }}
                    >
                      <span className="notif-dot" />
                      <div>
                        <div className="notif-msg">{n.message}</div>
                        <div className="notif-when">{relativeDate(n.createdAt)}</div>
                      </div>
                      <Icon name="arrowRight" size={14} className="notif-go" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

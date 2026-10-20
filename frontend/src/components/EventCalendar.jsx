import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { formatTime, isPast } from "../utils/format.js";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// "Completed" (attendance recorded) or "Passed" (over), shown in the day's list
function StateTag({ done, passed }) {
  if (done) return <span className="calendar-state is-done">Completed</span>;
  if (passed) return <span className="calendar-state is-passed">Passed</span>;
  return null;
}
const pad = (n) => String(n).padStart(2, "0");
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Month calendar for the dashboard rail.
//   Events: navy bubble. Your tutoring (sessions you tutor, or are confirmed in): green bubble,
//   or a green dot on an event day. Today: orange number.
//   Hover a busy day for a quick preview; click any day for its full list (or "nothing scheduled").
// sessions/requests/userId: for the tutoring; onOpenEvent(event) and onOpenTutoring() open the item.
export default function EventCalendar({ events, sessions = [], requests = [], userId, onOpenEvents, onOpenEvent, onOpenTutoring }) {
  const today = new Date();
  const todayKey = keyOf(today);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [openDay, setOpenDay] = useState(null); // "YYYY-MM-DD" whose list is open
  const [hoverDay, setHoverDay] = useState(null); // "YYYY-MM-DD" being previewed
  const popRef = useRef(null);

  // Your tutoring sessions (as the tutor, or a confirmed student), each on its date
  const tutoring = useMemo(() => {
    const mine = new Map();
    sessions.filter((s) => s.tutorId === userId).forEach((s) => mine.set(s.id, { session: s, role: "tutor" }));
    requests
      .filter((r) => r.userId === userId && r.status === "Confirmed")
      .forEach((r) => {
        const s = sessions.find((x) => x.id === r.sessionId);
        if (s && !mine.has(s.id)) mine.set(s.id, { session: s, role: "student" });
      });
    const list = [];
    mine.forEach(({ session, role }) => {
      if (session.date) list.push({ id: `t${session.id}`, date: session.date, time: session.time, session, role });
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, requests, userId, todayKey]);

  // "YYYY-MM-DD" -> { events, tutoring }, each earliest first
  const byDay = useMemo(() => {
    const map = {};
    const slot = (date) => (map[date] ||= { events: [], tutoring: [] });
    [...events].sort((a, b) => a.time.localeCompare(b.time)).forEach((e) => slot(e.date).events.push(e));
    [...tutoring].sort((a, b) => a.time.localeCompare(b.time)).forEach((t) => slot(t.date).tutoring.push(t));
    return map;
  }, [events, tutoring]);

  // Close the list when clicking elsewhere or pressing Escape
  useEffect(() => {
    if (!openDay) return;
    const onDown = (e) => !popRef.current?.contains(e.target) && !e.target.closest?.(".calendar-day") && setOpenDay(null);
    const onKey = (e) => e.key === "Escape" && setOpenDay(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openDay]);

  const year = month.getFullYear();
  const m = month.getMonth();
  const firstWeekday = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);

  const label = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const shift = (n) => {
    setOpenDay(null);
    setMonth(new Date(year, m + n, 1));
  };
  const openEvent = (event) => {
    setOpenDay(null);
    if (onOpenEvent) onOpenEvent(event);
    else onOpenEvents?.();
  };
  const openTutoring = (session) => {
    setOpenDay(null);
    onOpenTutoring?.(session);
  };

  const longDate = (key) => new Date(`${key}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const day = openDay ? byDay[openDay] || { events: [], tutoring: [] } : null;
  const isEmpty = day && !day.events.length && !day.tutoring.length;
  const preview = hoverDay && hoverDay !== openDay ? byDay[hoverDay] : null;
  // Earliest first, events and tutoring together
  const previewLines = preview
    ? [
        ...preview.events.map((e) => [e.time, `${formatTime(e.time)} · ${e.title}`]),
        ...preview.tutoring.map((t) => [t.time, `${formatTime(t.time)} · Tutoring: ${t.session.subject}`]),
      ]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([, line]) => line)
    : [];

  return (
    <div className="calendar" data-tour="upcoming">
      <div className="calendar-head">
        <button type="button" className="calendar-nav" aria-label="Previous month" onClick={() => shift(-1)}>
          <Icon name="chevronLeft" size={16} />
        </button>
        <strong aria-live="polite">{label}</strong>
        <button type="button" className="calendar-nav" aria-label="Next month" onClick={() => shift(1)}>
          <Icon name="chevronRight" size={16} />
        </button>
      </div>

      <div className="calendar-grid" role="grid" aria-label={label}>
        {WEEKDAYS.map((d) => (
          <span key={d} className="calendar-weekday" role="columnheader">
            {d}
          </span>
        ))}
        {cells.map((n, i) => {
          if (!n) return <span key={`e${i}`} className="calendar-day is-empty" />;
          const key = `${year}-${pad(m + 1)}-${pad(n)}`;
          const items = byDay[key];
          const hasEvent = Boolean(items?.events.length);
          const hasTutoring = Boolean(items?.tutoring.length);
          const classes = [
            "calendar-day",
            hasEvent ? "has-event" : "",
            hasTutoring ? (hasEvent ? "has-both" : "has-tutoring") : "",
            key === todayKey ? "is-today" : "",
            key < todayKey ? "is-past" : "",
            key === openDay ? "is-open" : "",
          ].join(" ");
          const count = (items?.events.length || 0) + (items?.tutoring.length || 0);
          return (
            <button
              key={key}
              type="button"
              className={classes}
              aria-label={`${longDate(key)}: ${count ? `${count} scheduled` : "nothing scheduled"}`}
              aria-expanded={key === openDay}
              onClick={() => {
                setHoverDay(null);
                setOpenDay(key === openDay ? null : key);
              }}
              onMouseEnter={() => count && setHoverDay(key)}
              onMouseLeave={() => setHoverDay(null)}
              onFocus={() => count && setHoverDay(key)}
              onBlur={() => setHoverDay(null)}
            >
              <span>{n}</span>
              {hasTutoring && hasEvent && <i className="calendar-dot" aria-hidden="true" />}
              {/* Hover preview: what's on that day, at a glance. A <small>, not a <span>: the day's
                  "> span" bubble styles must not reach it */}
              {hoverDay === key && previewLines.length > 0 && (
                <small className={`calendar-tip ${i % 7 <= 1 ? "from-left" : i % 7 >= 5 ? "from-right" : ""}`} role="tooltip">
                  {previewLines.slice(0, 3).map((line) => <span key={line}>{line}</span>)}
                  {previewLines.length > 3 && <span className="calendar-tip-more">+{previewLines.length - 3} more</span>}
                </small>
              )}
            </button>
          );
        })}
      </div>

      {openDay && (
        <div className="calendar-pop" ref={popRef} role="dialog" aria-label={`Scheduled on ${longDate(openDay)}`}>
          <div className="calendar-pop-head">
            <strong>{openDay === todayKey ? `Today · ${longDate(openDay)}` : longDate(openDay)}</strong>
            <button type="button" className="icon-btn sm" aria-label="Close" onClick={() => setOpenDay(null)}>
              <Icon name="close" size={14} />
            </button>
          </div>
          {isEmpty ? (
            <p className="calendar-pop-empty">
              <Icon name="calendar" size={16} /> No events or tutoring scheduled for {openDay === todayKey ? "today" : "this day"}.
            </p>
          ) : (
            <ul>
              {day.events.map((e) => (
                <li key={e.id}>
                  <button type="button" className="calendar-pop-event" onClick={() => openEvent(e)}>
                    <span className="calendar-pop-time">{formatTime(e.time)}</span>
                    <span className="calendar-pop-text">
                      <StateTag done={e.status === "completed"} passed={isPast(e.date, e.time)} />
                      <span className="calendar-pop-title">{e.title}</span>
                      <span className="calendar-pop-meta">{e.category} · {e.location}</span>
                    </span>
                    <Icon name="arrowRight" size={14} />
                  </button>
                </li>
              ))}
              {day.tutoring.map((t) => (
                <li key={t.id}>
                  <button type="button" className="calendar-pop-event is-tutoring" onClick={() => openTutoring(t.session)}>
                    <span className="calendar-pop-time">{formatTime(t.time)}</span>
                    <span className="calendar-pop-text">
                      <StateTag done={false} passed={isPast(t.date, t.time)} />
                      <span className="calendar-pop-title">Tutoring: {t.session.subject}</span>
                      <span className="calendar-pop-meta">
                        {t.role === "tutor" ? "You're the tutor" : `With ${t.session.tutorName}`} · {t.session.location}
                      </span>
                    </span>
                    <Icon name="arrowRight" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="calendar-legend">
        <span className="calendar-legend-item">
          <span className="calendar-legend-dot" aria-hidden="true" /> Event
        </span>
        <span className="calendar-legend-item">
          <span className="calendar-legend-dot is-tutoring" aria-hidden="true" /> Tutoring
        </span>
        <span className="calendar-legend-item">
          <span className="calendar-legend-dot is-today" aria-hidden="true" /> Today
        </span>
      </div>
    </div>
  );
}

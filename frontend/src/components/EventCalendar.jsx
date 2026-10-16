import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { formatTime } from "../utils/format.js";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const pad = (n) => String(n).padStart(2, "0");

// Month calendar for the dashboard rail. Days with an event get a navy bubble,
// today's number is orange. Clicking an event day shows that day's events in a small popup;
// clicking one opens it on the Events page (onOpenEvent), or the Events page (onOpenEvents).
export default function EventCalendar({ events, onOpenEvents, onOpenEvent }) {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [openDay, setOpenDay] = useState(null); // "YYYY-MM-DD" whose events are showing
  const popRef = useRef(null);

  // "YYYY-MM-DD" -> the events on that day, earliest first
  const byDay = useMemo(() => {
    const map = {};
    [...events].sort((a, b) => a.time.localeCompare(b.time)).forEach((e) => (map[e.date] = [...(map[e.date] || []), e]));
    return map;
  }, [events]);

  // Close the popup when clicking elsewhere or pressing Escape
  useEffect(() => {
    if (!openDay) return;
    const onDown = (e) => !popRef.current?.contains(e.target) && !e.target.closest?.(".calendar-day.has-event") && setOpenDay(null);
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
  const open = (event) => {
    setOpenDay(null);
    if (onOpenEvent) onOpenEvent(event);
    else onOpenEvents?.();
  };
  const dayEvents = openDay ? byDay[openDay] || [] : [];
  const dayLabel = openDay
    ? new Date(`${openDay}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : "";

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
        {cells.map((day, i) => {
          if (!day) return <span key={`e${i}`} className="calendar-day is-empty" />;
          const key = `${year}-${pad(m + 1)}-${pad(day)}`;
          const list = byDay[key];
          const classes = ["calendar-day", list ? "has-event" : "", key === todayKey ? "is-today" : "", key === openDay ? "is-open" : ""].join(" ");
          return list ? (
            <button
              key={key}
              type="button"
              className={classes}
              title={list.map((e) => e.title).join("\n")}
              aria-label={`${day}: ${list.length} ${list.length === 1 ? "event" : "events"}`}
              aria-expanded={key === openDay}
              onClick={() => setOpenDay(key === openDay ? null : key)}
            >
              <span>{day}</span>
            </button>
          ) : (
            <span key={key} className={classes} role="gridcell">
              <span>{day}</span>
            </span>
          );
        })}
      </div>

      {openDay && (
        <div className="calendar-pop" ref={popRef} role="dialog" aria-label={`Events on ${dayLabel}`}>
          <div className="calendar-pop-head">
            <strong>{openDay === todayKey ? `Today · ${dayLabel}` : dayLabel}</strong>
            <button type="button" className="icon-btn sm" aria-label="Close" onClick={() => setOpenDay(null)}>
              <Icon name="close" size={14} />
            </button>
          </div>
          <ul>
            {dayEvents.map((e) => (
              <li key={e.id}>
                <button type="button" className="calendar-pop-event" onClick={() => open(e)}>
                  <span className="calendar-pop-time">{formatTime(e.time)}</span>
                  <span className="calendar-pop-text">
                    <span className="calendar-pop-title">{e.title}</span>
                    <span className="calendar-pop-meta">{e.category} · {e.location}</span>
                  </span>
                  <Icon name="arrowRight" size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="calendar-legend">
        <span className="calendar-legend-item">
          <span className="calendar-legend-dot" aria-hidden="true" /> Event
        </span>
        <span className="calendar-legend-item">
          <span className="calendar-legend-dot is-today" aria-hidden="true" /> Today
        </span>
      </div>
    </div>
  );
}

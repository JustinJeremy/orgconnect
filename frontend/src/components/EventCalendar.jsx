import { useMemo, useState } from "react";
import Icon from "./Icon.jsx";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const pad = (n) => String(n).padStart(2, "0");

// Month calendar for the dashboard rail. Days with an event get a navy bubble,
// today's number is orange. Clicking an event day opens the Events page.
export default function EventCalendar({ events, onOpenEvents }) {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  // "YYYY-MM-DD" -> titles of the events on that day
  const byDay = useMemo(() => {
    const map = {};
    events.forEach((e) => (map[e.date] = [...(map[e.date] || []), e.title]));
    return map;
  }, [events]);

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
  const shift = (n) => setMonth(new Date(year, m + n, 1));

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
          const titles = byDay[key];
          const classes = ["calendar-day", titles ? "has-event" : "", key === todayKey ? "is-today" : ""].join(" ");
          return titles ? (
            <button
              key={key}
              type="button"
              className={classes}
              title={titles.join("\n")}
              aria-label={`${day}: ${titles.join(", ")}`}
              onClick={onOpenEvents}
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

      <div className="calendar-legend">
        <span className="calendar-legend-dot" aria-hidden="true" /> Event
      </div>
    </div>
  );
}

import { useState } from "react";
import Icon from "./Icon.jsx";
import ModeTag from "./ModeTag.jsx";
import { attendedCount, dateParts, formatTime, isCompleted, myRegistration, percent } from "../utils/format.js";

export default function EventCard({ event, userId, isOfficer, actions }) {
  const [busy, setBusy] = useState(false);
  const done = isCompleted(event);
  const registered = event.registrations.length;
  const attended = attendedCount(event);
  const mine = myRegistration(event, userId);
  const isFull = registered >= event.capacity;
  const { mon, day, weekday } = dateParts(event.date);

  const fill = done ? percent(attended, registered) : Math.min(100, percent(registered, event.capacity));

  const toggleRsvp = async () => {
    setBusy(true);
    await actions.toggleRsvp(event, Boolean(mine));
    setBusy(false);
  };

  return (
    <article className={`event-card ${done ? "is-done" : ""}`}>
      <div className="event-card-top">
        <div className="date-block">
          <span>{mon}</span>
          <strong>{day}</strong>
        </div>
        <div className="event-card-head">
          <span className="event-cat">{event.category}</span>
          <h3>{event.title}</h3>
        </div>
        {isOfficer && (
          <div className="card-tools">
            <button type="button" className="icon-btn sm" aria-label={`Edit ${event.title}`} onClick={() => actions.edit(event)}>
              <Icon name="edit" size={16} />
            </button>
            <button type="button" className="icon-btn sm danger" aria-label={`Delete ${event.title}`} onClick={() => actions.remove(event)}>
              <Icon name="trash" size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="event-meta">
        <span>
          <Icon name="clock" size={14} /> {weekday}, {formatTime(event.time)}
        </span>
        <span>
          <Icon name="pin" size={14} /> {event.location}
          <ModeTag mode={event.mode} />
        </span>
      </div>

      {event.description && <p className="event-desc">{event.description}</p>}

      <div className="event-card-foot">
        <div className="capacity">
          <span>
            {done ? (
              <>
                <strong>{attended}</strong> of {registered} attended
              </>
            ) : (
              <>
                <strong>{registered}</strong> of {event.capacity} going
              </>
            )}
          </span>
          <div className="meter" aria-hidden="true">
            <span style={{ width: `${fill}%` }} />
          </div>
        </div>

        {isOfficer ? (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => actions.openAttendance(event)}>
            Attendance
          </button>
        ) : done ? (
          mine?.status === "attended" ? (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => actions.downloadCertificate(event)}>
              <Icon name="download" size={15} /> Certificate
            </button>
          ) : (
            <span className="muted small">{mine ? "Marked absent" : "Ended"}</span>
          )
        ) : mine ? (
          <div className="rsvp-on">
            <span className="going">
              <Icon name="check" size={15} /> Going
            </span>
            <button type="button" className="link-btn" onClick={toggleRsvp} disabled={busy} aria-label={`Cancel RSVP for ${event.title}`}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-primary btn-sm" onClick={toggleRsvp} disabled={busy || isFull}>
            {isFull ? "Full" : "RSVP"}
          </button>
        )}
      </div>
    </article>
  );
}

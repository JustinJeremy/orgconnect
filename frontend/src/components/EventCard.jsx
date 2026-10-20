import { useState } from "react";
import Icon from "./Icon.jsx";
import ModeTag from "./ModeTag.jsx";
import { EventDetails } from "./ItemDetails.jsx";
import CheckinQr from "./CheckinQr.jsx";
import { attendedCount, dateParts, formatTime, isCompleted, isPast, myRegistration, percent } from "../utils/format.js";

// layout "row": thumbnail on the left (members); "box": date badge beside the title (officers)
export default function EventCard({ event, userId, isOfficer, actions, layout = "row", highlighted = false }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false); // the details pop-up
  const [qrOpen, setQrOpen] = useState(false); // officers: the check-in QR code
  const done = isCompleted(event);
  // Over, but attendance isn't recorded yet
  const passed = !done && isPast(event.date, event.time);
  const registered = event.registrations.length;
  const attended = attendedCount(event);
  const mine = myRegistration(event, userId);
  const isFull = registered >= event.capacity;
  const { mon, day, weekday } = dateParts(event.date);

  const fill = done ? percent(attended, registered) : Math.min(100, percent(registered, event.capacity));

  const dateBlock = (
    <div className="date-block">
      <span>{mon}</span>
      <strong>{day}</strong>
    </div>
  );

  const toggleRsvp = async () => {
    setBusy(true);
    await actions.toggleRsvp(event, Boolean(mine));
    setBusy(false);
  };

  // RSVP, attendance or certificate: on the card and in its details
  const action = isOfficer ? (
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
  ) : passed && !mine ? (
    <span className="muted small">Started</span>
  ) : mine ? (
    <div className="rsvp-on">
      <span className="going">
        <Icon name="check" size={15} /> Going
      </span>
      {!passed && (
        <button type="button" className="link-btn" onClick={toggleRsvp} disabled={busy} aria-label={`Cancel RSVP for ${event.title}`}>
          Cancel
        </button>
      )}
    </div>
  ) : (
    <button type="button" className="btn btn-primary btn-sm" onClick={toggleRsvp} disabled={busy || isFull}>
      {isFull ? "Full" : "RSVP"}
    </button>
  );

  return (
    <>
    <article
      className={`event-card is-openable ${done ? "is-done" : ""} ${passed ? "is-passed" : ""} ${highlighted ? "is-highlighted" : ""}`}
      data-event-id={event.id}
      onClick={(e) => !e.target.closest("button, a, input, label") && setOpen(true)}
    >
      {/* Poster, or a grey placeholder when the event has none */}
      {layout === "row" && (
        <div className="event-thumb">
          {event.posterUrl && <img src={event.posterUrl} alt={`Poster for ${event.title}`} className="event-thumb-img" loading="lazy" />}
          {dateBlock}
        </div>
      )}
      {layout === "box" && event.posterUrl && (
        <img src={event.posterUrl} alt={`Poster for ${event.title}`} className="event-box-poster" loading="lazy" />
      )}

      <div className="event-card-body">
        <div className="event-card-top">
          {layout === "box" && dateBlock}
          <div className="event-card-head">
            <span className="event-cat">
              {event.category}
              {done && <span className="event-state is-done"><Icon name="check" size={12} /> Completed</span>}
              {passed && <span className="event-state is-passed"><Icon name="clock" size={12} /> Passed</span>}
            </span>
            <h3><button type="button" className="card-title-btn" onClick={() => setOpen(true)}>{event.title}</button></h3>
          </div>
          {isOfficer && (
            <div className="card-tools">
              {/* The check-in QR code, until the event is finished (scanning works from a day before it) */}
              {!event.finished && (
                <button type="button" className="icon-btn sm checkin-btn" aria-label={`Check-in QR for ${event.title}`} title="Check-in QR" onClick={() => setQrOpen(true)}>
                  <Icon name="qr" size={16} />
                </button>
              )}
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
                  <strong>{registered}</strong> of {event.capacity} going ·{" "}
                  <span className={isFull ? "slots-full" : "slots-left"}>{isFull ? "Full" : `${event.capacity - registered} left`}</span>
                </>
              )}
            </span>
            <div className="meter" aria-hidden="true">
              <span style={{ width: `${fill}%` }} />
            </div>
          </div>

          {action}
        </div>
      </div>
    </article>
    {open && <EventDetails event={event} footer={action} onClose={() => setOpen(false)} />}
    {qrOpen && <CheckinQr type="event" item={event} onClose={() => setQrOpen(false)} />}
    </>
  );
}

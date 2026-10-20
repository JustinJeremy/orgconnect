import Icon from "./Icon.jsx";
import Modal from "./Modal.jsx";
import ModeTag from "./ModeTag.jsx";
import { SlotMeter, sessionState } from "./SlotMeter.jsx";
import { UserAvatar } from "./Avatars.jsx";
import { usePeople } from "../context/PeopleContext.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import { downloadIcs, googleCalendarUrl } from "../utils/calendar.js";
import { attendedCount, dateParts, formatDate, formatTime, isCompleted, isPast, percent } from "../utils/format.js";

// The full details of an event or tutoring session, opened by clicking its card.
// footer: the card's own buttons (RSVP, Request session...), so they work here too.

export function TopicChips({ topics }) {
  if (!topics?.length) return null;
  return (
    <div className="detail-section">
      <h3>Topics</h3>
      <div className="person-chips">
        {topics.map((t) => (
          <span key={t} className="person-chip">{t}</span>
        ))}
      </div>
    </div>
  );
}

// Save it to your own calendar: Google Calendar, or a .ics file for phone calendars and Outlook.
// Sessions repeat weekly in the calendar too.
function AddToCalendar({ item }) {
  const { current: org } = useOrg();
  const google = googleCalendarUrl(item, org?.shortName);
  if (!google) return null;
  return (
    <div className="detail-section">
      <h3>Add to your calendar</h3>
      <div className="calendar-buttons">
        <a className="btn btn-outline btn-sm" href={google} target="_blank" rel="noreferrer">
          <Icon name="calendar" size={15} /> Google Calendar
        </a>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => downloadIcs(item, org?.shortName)}>
          <Icon name="download" size={15} /> Phone or Outlook (.ics)
        </button>
      </div>
      {item.subject && <p className="muted small">Adds it every week, starting from its next meeting.</p>}
    </div>
  );
}

function Fact({ icon, label, children }) {
  return (
    <div className="detail-fact">
      <span className="detail-fact-icon"><Icon name={icon} size={16} /></span>
      <span>
        <span className="detail-fact-label">{label}</span>
        <span className="detail-fact-value">{children}</span>
      </span>
    </div>
  );
}

export function EventDetails({ event, footer, onClose }) {
  const { openPerson } = usePeople();
  const done = isCompleted(event);
  const passed = !done && isPast(event.date, event.time);
  const registered = event.registrations.length;
  const attended = attendedCount(event);
  const { mon, day, weekday } = dateParts(event.date);
  const people = done ? event.registrations.filter((r) => r.status === "attended") : event.registrations;

  return (
    <Modal title={event.title} subtitle={event.category} onClose={onClose} size="lg" footer={<div className="detail-footer">{footer}</div>}>
      <div className="item-details">
        <div className="detail-poster">
          {event.posterUrl ? (
            <>
              <img className="detail-poster-backdrop" src={event.posterUrl} alt="" aria-hidden="true" />
              <img className="detail-poster-img" src={event.posterUrl} alt={`Poster for ${event.title}`} />
            </>
          ) : (
            <span className="detail-poster-date"><span>{mon}</span><strong>{day}</strong></span>
          )}
        </div>

        <div className="detail-tags">
          <span className="person-chip">{event.category}</span>
          <ModeTag mode={event.mode} />
          {done && <span className="event-state is-done"><Icon name="check" size={12} /> Completed</span>}
          {passed && <span className="event-state is-passed"><Icon name="clock" size={12} /> Passed</span>}
        </div>

        <div className="detail-facts">
          <Fact icon="calendar" label="Date">{weekday}, {formatDate(event.date)}</Fact>
          <Fact icon="clock" label="Time">{formatTime(event.time)}</Fact>
          <Fact icon="pin" label="Where">{event.location}</Fact>
          <Fact icon="users" label={done ? "Attendance" : "Going"}>
            {done ? `${attended} of ${registered} attended (${percent(attended, registered)}%)` : `${registered} of ${event.capacity} spots taken · ${event.capacity - registered > 0 ? `${event.capacity - registered} left` : "Full"}`}
          </Fact>
        </div>

        {event.description && (
          <div className="detail-section">
            <h3>About this event</h3>
            <p className="detail-text">{event.description}</p>
          </div>
        )}
        <TopicChips topics={event.topics} />
        {!done && !passed && <AddToCalendar item={event} />}

        {people.length > 0 && (
          <div className="detail-section">
            <h3>{done ? "Who attended" : "Who's going"}</h3>
            <div className="detail-people">
              {people.slice(0, 12).map((r) => (
                <button key={r.id} type="button" className="detail-person" onClick={() => openPerson(r.userId)} title={r.name}>
                  <UserAvatar user={r} className="sm" />
                  <span>{r.name?.split(" ")[0]}</span>
                </button>
              ))}
              {people.length > 12 && <span className="muted small">+{people.length - 12} more</span>}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function SessionDetails({ session, footer, onClose }) {
  const { openPerson } = usePeople();

  return (
    <Modal title={session.subject} subtitle={`Peer tutoring · ${session.area}`} onClose={onClose} size="lg" footer={<div className="detail-footer">{footer}</div>}>
      <div className="item-details">
        <button type="button" className="detail-tutor" onClick={() => openPerson(session.tutorId)}>
          <UserAvatar user={{ name: session.tutorName, ...session.tutorAvatar }} className="person-avatar" />
          <span>
            <span className="detail-fact-label">Tutor</span>
            <strong>{session.tutorName}</strong>
            <span className="muted small">View profile <Icon name="arrowRight" size={12} /></span>
          </span>
        </button>

        <div className="detail-tags">
          <span className="person-chip">{session.area}</span>
          <ModeTag mode={session.mode} />
          {sessionState(session) === "Ended" && <span className="event-state is-passed"><Icon name="clock" size={12} /> Ended</span>}
        </div>

        <div className="detail-facts">
          <Fact icon="calendar" label="Date">{session.date ? `${dateParts(session.date).weekday}, ${formatDate(session.date)}` : session.schedule}</Fact>
          <Fact icon="clock" label="Time">{session.time ? formatTime(session.time) : "—"}</Fact>
          <Fact icon="pin" label="Where">{session.location}</Fact>
          <Fact icon="users" label="Slots"><SlotMeter session={session} /></Fact>
        </div>

        {session.description && (
          <div className="detail-section">
            <h3>About this session</h3>
            <p className="detail-text">{session.description}</p>
          </div>
        )}
        <TopicChips topics={session.topics} />
        <AddToCalendar item={session} />
      </div>
    </Modal>
  );
}

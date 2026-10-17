import { useState } from "react";
import Icon from "./Icon.jsx";
import { StatusBadge } from "./Badges.jsx";
import { parseSchedule, weeklyDates } from "../utils/schedule.js";
import { UserAvatar } from "./Avatars.jsx";
import { usePeople } from "../context/PeopleContext.jsx";
import { SessionDetails } from "./ItemDetails.jsx";

// The next date a weekly session meets, e.g. "Fri, Oct 23" (today counts until its start time)
function nextMeeting(schedule) {
  const when = parseSchedule(schedule);
  if (!when) return null;
  const now = new Date();
  const soon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  const date = weeklyDates(when.weekday, now, soon).find((d) => new Date(`${d}T${when.time}:00`) > now);
  if (!date) return null;
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function SessionCard({ session, myRequest, canManage, canRequest, onRequest, onEdit, onDelete, highlighted }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false); // the details pop-up
  const { openPerson } = usePeople();
  const next = nextMeeting(session.schedule);

  const request = async () => {
    setBusy(true);
    await onRequest(session);
    setBusy(false);
  };

  // Request button or your request's status: on the card and in its details
  const action = myRequest ? (
    <span className="request-state">
      Your request <StatusBadge status={myRequest.status} />
    </span>
  ) : canRequest ? (
    <button type="button" className="btn btn-primary btn-sm" onClick={request} disabled={busy || session.slots < 1}>
      Request session
    </button>
  ) : null;

  return (
    <>
    <article
      className={`session-card is-openable ${highlighted ? "is-highlighted" : ""}`}
      data-focus={`session-${session.id}`}
      onClick={(e) => !e.target.closest("button, a, input, label") && setOpen(true)}
    >
      <div className="event-card-top">
        <div className="event-card-head">
          <span className="event-cat">{session.area}</span>
          <h3><button type="button" className="card-title-btn" onClick={() => setOpen(true)}>{session.subject}</button></h3>
        </div>
        {canManage && (
          <div className="card-tools">
            <button type="button" className="icon-btn sm" aria-label={`Edit ${session.subject}`} onClick={() => onEdit(session)}>
              <Icon name="edit" size={16} />
            </button>
            <button type="button" className="icon-btn sm danger" aria-label={`Delete ${session.subject}`} onClick={() => onDelete(session)}>
              <Icon name="trash" size={16} />
            </button>
          </div>
        )}
      </div>

      <button type="button" className="tutor tutor-link" onClick={() => openPerson(session.tutorId)} title={`View ${session.tutorName}'s profile`}>
        <UserAvatar user={{ name: session.tutorName, ...session.tutorAvatar }} className="xs" />
        <span>{session.tutorName}</span>
      </button>

      <div className="event-meta">
        <span>
          <Icon name="clock" size={14} /> {session.schedule}
          {next && <span className="session-next">Next: {next}</span>}
        </span>
        <span>
          <Icon name="pin" size={14} /> {session.location}
        </span>
      </div>

      {session.description && <p className="event-desc">{session.description}</p>}

      <div className="event-card-foot">
        <span className="muted small">
          {session.slots} {session.slots === 1 ? "slot" : "slots"} open
        </span>
        {action}
      </div>
    </article>
    {open && <SessionDetails session={session} next={next} footer={action} onClose={() => setOpen(false)} />}
    </>
  );
}

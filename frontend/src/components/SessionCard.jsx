import { useState } from "react";
import Icon from "./Icon.jsx";
import { StatusBadge } from "./Badges.jsx";
import ModeTag from "./ModeTag.jsx";
import { SlotMeter, sessionState } from "./SlotMeter.jsx";
import { UserAvatar } from "./Avatars.jsx";
import { usePeople } from "../context/PeopleContext.jsx";
import { SessionDetails } from "./ItemDetails.jsx";
import CheckinQr from "./CheckinQr.jsx";

export default function SessionCard({ session, myRequest, canManage, canRequest, onRequest, onEdit, onDelete, highlighted }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false); // the details pop-up
  const [qrOpen, setQrOpen] = useState(false); // the tutor and officers: the check-in QR code
  const { openPerson } = usePeople();
  const state = sessionState(session);

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
    <button type="button" className="btn btn-primary btn-sm" onClick={request} disabled={busy || session.slots < 1 || session.finished}>
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
            {/* The check-in QR code (scanning works on the session's day) */}
            <button type="button" className="icon-btn sm checkin-btn" aria-label={`Check-in QR for ${session.subject}`} title="Check-in QR" onClick={() => setQrOpen(true)}>
              <Icon name="qr" size={16} />
            </button>
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
          {state && <span className={`session-next ${state === "Ended" ? "is-ended" : ""}`}>{state}</span>}
        </span>
        <span>
          <Icon name="pin" size={14} /> {session.location}
          <ModeTag mode={session.mode} />
        </span>
      </div>

      {session.description && <p className="event-desc">{session.description}</p>}

      <div className="event-card-foot">
        <SlotMeter session={session} />
        {action}
      </div>
    </article>
    {open && <SessionDetails session={session} footer={action} onClose={() => setOpen(false)} />}
    {qrOpen && <CheckinQr type="session" item={session} onClose={() => setQrOpen(false)} />}
    </>
  );
}

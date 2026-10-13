import { useState } from "react";
import Icon from "./Icon.jsx";
import { StatusBadge } from "./Badges.jsx";
import { initials } from "../utils/format.js";

export default function SessionCard({ session, myRequest, canManage, canRequest, onRequest, onEdit, onDelete }) {
  const [busy, setBusy] = useState(false);

  const request = async () => {
    setBusy(true);
    await onRequest(session);
    setBusy(false);
  };

  return (
    <article className="session-card">
      <div className="event-card-top">
        <div className="event-card-head">
          <span className="event-cat">{session.area}</span>
          <h3>{session.subject}</h3>
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

      <div className="tutor">
        <span className="avatar xs">{initials(session.tutorName)}</span>
        <span>{session.tutorName}</span>
      </div>

      <div className="event-meta">
        <span>
          <Icon name="clock" size={14} /> {session.schedule}
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
        {myRequest ? (
          <span className="request-state">
            Your request <StatusBadge status={myRequest.status} />
          </span>
        ) : canRequest ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={request} disabled={busy || session.slots < 1}>
            Request session
          </button>
        ) : null}
      </div>
    </article>
  );
}

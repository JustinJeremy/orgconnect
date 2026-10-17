import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import Modal from "./Modal.jsx";
import FriendButton from "./FriendButton.jsx";
import { StatusBadge } from "./Badges.jsx";
import { UserAvatar } from "./Avatars.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import { peopleApi } from "../api/services.js";
import { errorMessage } from "../api/client.js";
import { formatDate, plural } from "../utils/format.js";

// Someone's profile in this org: who they are, what they've done here, what they tutor,
// and a friend button. Email shows only to their friends and officers.
export default function PersonDialog({ id, flash, onChanged, onMessage, onClose }) {
  const { current: org } = useOrg();
  const [person, setPerson] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    peopleApi.show(id).then(setPerson).catch((err) => setError(errorMessage(err)));
  }, [id]);

  const setFriendship = (friendship) => {
    setPerson((p) => ({ ...p, friendship }));
    onChanged?.();
    // Friends see each other's email: fetch it
    if (friendship === "friends") peopleApi.show(id).then(setPerson).catch(() => {});
  };

  const unfriend = async () => {
    try {
      await peopleApi.remove(id);
      setPerson((p) => ({ ...p, friendship: "none" }));
      onChanged?.();
      flash?.(`Removed ${person.name} from your friends`);
    } catch (err) {
      flash?.(errorMessage(err), "error");
    }
  };

  return (
    <Modal title="Profile" onClose={onClose} size="md">
      {error ? (
        <div className="alert alert-error" role="alert">{error}</div>
      ) : !person ? (
        <div className="skeleton-list" aria-hidden="true"><span /><span /><span /></div>
      ) : (
        <div className="person-profile">
          <div className="person-head">
            <UserAvatar user={person} className="person-avatar" />
            <div className="person-head-text">
              <h3>{person.name}</h3>
              <p>
                {person.position} · {org.shortName}
                {person.status === "Inactive" && <StatusBadge status="Inactive" />}
              </p>
              <p className="muted small">
                {[person.course, person.yearLevel].filter(Boolean).join(" · ")}
                {person.joinDate && ` · Joined ${formatDate(person.joinDate)}`}
              </p>
              {person.email && (
                <p className="person-email small">
                  <Icon name="mail" size={14} /> <a href={`mailto:${person.email}`}>{person.email}</a>
                </p>
              )}
            </div>
          </div>

          <div className="person-actions">
            <FriendButton person={person} state={person.friendship} onChange={setFriendship} flash={flash} size="" />
            {person.friendship === "friends" && onMessage && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => onMessage(person.id)}>
                <Icon name="mail" size={15} /> Message
              </button>
            )}
            {person.friendship === "friends" && (
              <button type="button" className="link-btn danger-link" onClick={unfriend}>Unfriend</button>
            )}
            {person.friendship === "received" && (
              <span className="muted small">{person.name.split(" ")[0]} sent you a friend request</span>
            )}
          </div>

          <dl className="person-stats">
            <div><dt>Approved hours</dt><dd>{person.stats.hours}</dd></div>
            <div><dt>Events attended</dt><dd>{person.stats.eventsAttended}</dd></div>
            <div><dt>Sessions taught</dt><dd>{person.stats.sessionsTaught}</dd></div>
            <div><dt>Students helped</dt><dd>{person.stats.studentsHelped}</dd></div>
          </dl>

          <div className="person-section">
            <h4>Tutors in</h4>
            {person.tutoring.length === 0 ? (
              <p className="muted small">Not offering tutoring sessions right now.</p>
            ) : (
              <div className="person-chips">
                {person.tutoring.map((s) => (
                  <span key={s.id} className="person-chip">
                    <Icon name="book" size={13} /> {s.subject}
                    {s.area && <span className="muted"> · {s.area}</span>}
                  </span>
                ))}
              </div>
            )}
            {person.stats.studentsHelped > 0 && (
              <p className="muted small">Has helped {plural(person.stats.studentsHelped, "student")} through peer tutoring.</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

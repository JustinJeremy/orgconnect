import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import Modal from "./Modal.jsx";
import { UserAvatar } from "./Avatars.jsx";
import { platformApi } from "../api/services.js";
import { errorMessage } from "../api/client.js";
import { relativeDate } from "../utils/format.js";

// This org's private thread with the OrgConnect admin under one announcement.
// Officers read it; the President, VPs and Secretary can write in it.
function OrgThread({ announcement }) {
  const [replies, setReplies] = useState(null);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    platformApi.replies(announcement.id).then(setReplies).catch(() => setReplies([]));
  }, [announcement.id]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const reply = await platformApi.reply(announcement.id, text.trim());
      setReplies((list) => [...list, reply]);
      setText("");
      setNote("");
    } catch (err) {
      setNote(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="detail-section">
      <h3>Replies with the OrgConnect admin</h3>
      <p className="muted small">Only your org's officers and the admin see this.</p>
      {replies === null ? (
        <p className="muted small">Loading…</p>
      ) : replies.length === 0 ? (
        <p className="muted small">No replies yet.</p>
      ) : (
        <ul className="thread-list">
          {replies.map((r) => (
            <li key={r.id} className={r.isAdmin ? "is-admin" : ""}>
              {!r.isAdmin && <UserAvatar user={{ name: r.userName, ...r.userAvatar }} className="xs" />}
              <div className="thread-bubble">
                <div className="thread-who">
                  <strong>{r.userName}</strong>
                  {r.position && <span className="muted small"> · {r.position}</span>}
                  <span className="muted small"> · {relativeDate(r.createdAt)}</span>
                </div>
                <p>{r.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {note && <p className="field-error">{note}</p>}
      {announcement.canReply ? (
        <form className="feed-comment-form" onSubmit={send}>
          <label htmlFor={`pa-reply-${announcement.id}`} className="sr-only">Reply to the admin</label>
          <input id={`pa-reply-${announcement.id}`} className="input" placeholder="Reply to the OrgConnect admin" maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
          <button type="submit" className="btn btn-primary btn-sm" disabled={!text.trim() || sending}>Send</button>
        </form>
      ) : (
        <p className="muted small">The President, VPs and Secretary can reply.</p>
      )}
    </div>
  );
}

function Details({ announcement, onClose }) {
  return (
    <Modal title={announcement.title} subtitle={`From OrgConnect · ${relativeDate(announcement.createdAt)}`} size="lg" onClose={onClose}>
      <div className="item-details">
        <div className="detail-tags">
          <span className="platform-badge"><Icon name="megaphone" size={13} /> OrgConnect announcement</span>
          <span className="person-chip">To: {announcement.audienceLabel}</span>
        </div>
        <p className="detail-text">{announcement.content}</p>
        {announcement.seeReplies && <OrgThread announcement={announcement} />}
      </div>
    </Modal>
  );
}

// Announcements from the OrgConnect admin, above the org's own on the Announcements page.
// openId: one to open right away (from a notification)
export default function PlatformAnnouncements({ openId, onOpened }) {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    platformApi.list().then(setList).catch(() => setList([]));
  }, []);

  useEffect(() => {
    if (!openId || !list.length) return;
    const found = list.find((a) => a.id === openId);
    if (found) setOpen(found);
    onOpened?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, list]);

  if (!list.length) return null;

  return (
    <section className="platform-list" data-tour="platform-announcements">
      {list.slice(0, 3).map((a) => (
        <button key={a.id} type="button" className="platform-item" onClick={() => setOpen(a)}>
          <span className="platform-icon"><Icon name="megaphone" size={18} /></span>
          <span className="platform-text">
            <span className="platform-eyebrow">From OrgConnect · {relativeDate(a.createdAt)}</span>
            <strong>{a.title}</strong>
            <span className="platform-preview">{a.content}</span>
          </span>
          {a.seeReplies && a.replies > 0 && (
            <span className="platform-replies"><Icon name="comment" size={14} /> {a.replies}</span>
          )}
        </button>
      ))}
      {open && <Details announcement={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

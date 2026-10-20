import { useEffect, useState } from "react";
import Icon from "../components/Icon.jsx";
import Panel from "../components/Panel.jsx";
import Modal from "../components/Modal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { UserAvatar } from "../components/Avatars.jsx";
import { adminApi } from "../api/services.js";
import { errorMessage } from "../api/client.js";
import { relativeDate } from "../utils/format.js";
import { textProblem } from "../utils/validation.js";

// Who an announcement goes to. Replies: each org's President, VPs and Secretary write back in their
// own thread with you; their other officers can read it; members never see replies.
const AUDIENCES = [
  { key: "presidents", label: "Presidents", hint: "Only each org's President" },
  { key: "officers", label: "All officers", hint: "President, VPs, Secretary, Treasurer and other officers" },
  { key: "members", label: "All members", hint: "Everyone in the org, officers included" },
  { key: "everyone", label: "Every account", hint: "Everyone on OrgConnect, in any org or none" },
];

// One org's thread under an announcement: their messages and yours
function Thread({ announcement, org, flash, onReplied }) {
  const [replies, setReplies] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    adminApi.announcementReplies(announcement.id, org.organizationId).then(setReplies).catch(() => setReplies([]));
  }, [announcement.id, org.organizationId]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const reply = await adminApi.replyToOrg(announcement.id, org.organizationId, text.trim());
      setReplies((list) => [...list, reply]);
      setText("");
      onReplied();
    } catch (err) {
      flash(errorMessage(err), "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="thread">
      {replies === null ? (
        <p className="muted small">Loading…</p>
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
      <form className="feed-comment-form" onSubmit={send}>
        <label htmlFor={`thread-${org.organizationId}`} className="sr-only">Reply to {org.shortName}</label>
        <input id={`thread-${org.organizationId}`} className="input" placeholder={`Reply to ${org.shortName}`} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit" className="btn btn-primary btn-sm" disabled={!text.trim() || sending}>Send</button>
      </form>
    </div>
  );
}

function AnnouncementDetails({ announcement, flash, onClose, onChanged }) {
  const threads = announcement.threads;
  const [openOrg, setOpenOrg] = useState(threads[0]?.organizationId ?? null);

  return (
    <Modal title={announcement.title} subtitle={`${announcement.audienceLabel} · ${announcement.organizations ? announcement.organizations.map((o) => o.shortName).join(", ") : "All organizations"} · ${relativeDate(announcement.createdAt)}`} size="lg" onClose={onClose}>
      <div className="item-details">
        <p className="detail-text">{announcement.content}</p>
        <p className="muted small">Sent to {announcement.recipients} {announcement.recipients === 1 ? "account" : "accounts"}.</p>
        <div className="detail-section">
          <h3>Replies from organizations</h3>
          {threads.length === 0 ? (
            <p className="muted small">No replies yet. Presidents, VPs and Secretaries can write back; each org's replies stay private to that org and you.</p>
          ) : (
            <>
              <div className="thread-tabs" role="tablist">
                {threads.map((t) => (
                  <button key={t.organizationId} type="button" role="tab" aria-selected={openOrg === t.organizationId} className={openOrg === t.organizationId ? "active" : ""} onClick={() => setOpenOrg(t.organizationId)}>
                    {t.shortName}
                    <span className="tab-count">{t.replies}</span>
                    {t.waiting && <span className="thread-waiting" title="Waiting for your reply" />}
                  </button>
                ))}
              </div>
              {openOrg && <Thread key={openOrg} announcement={announcement} org={threads.find((t) => t.organizationId === openOrg)} flash={flash} onReplied={onChanged} />}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function AdminAnnouncements({ flash, organizations, onChanged }) {
  const live = organizations.filter((o) => o.status === "Active");
  const [list, setList] = useState(null);
  const [form, setForm] = useState({ title: "", content: "", audience: "officers", scope: "all", orgIds: [] });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    onChanged?.(); // the menu badge for replies waiting
    return adminApi.announcements().then(setList).catch((err) => flash(errorMessage(err), "error"));
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (patch) => {
    setForm({ ...form, ...patch });
    setError("");
  };
  const toggleOrg = (id) => set({ orgIds: form.orgIds.includes(id) ? form.orgIds.filter((x) => x !== id) : [...form.orgIds, id] });

  const send = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return setError("Write a title and a message.");
    const problem = textProblem("words", form.title, "Title") || textProblem("words", form.content, "The announcement");
    if (problem) return setError(problem);
    if (form.audience !== "everyone" && form.scope === "some" && form.orgIds.length === 0) return setError("Pick at least one organization.");
    setSending(true);
    try {
      const sent = await adminApi.sendAnnouncement({
        title: form.title.trim(),
        content: form.content.trim(),
        audience: form.audience,
        organizationIds: form.audience !== "everyone" && form.scope === "some" ? form.orgIds : null,
      });
      flash(`Announcement sent to ${sent.recipients} ${sent.recipients === 1 ? "account" : "accounts"}`);
      setForm({ title: "", content: "", audience: form.audience, scope: "all", orgIds: [] });
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const remove = async () => {
    const a = deleting;
    setDeleting(null);
    try {
      await adminApi.deleteAnnouncement(a.id);
      flash("Announcement deleted");
      load();
    } catch (err) {
      flash(errorMessage(err), "error");
    }
  };

  const open = list?.find((a) => a.id === openId);

  return (
    <div className="admin-announce">
      <Panel title="New announcement" subtitle="Shows on their Announcements page and in their notifications" tour="admin-announce-form">
        <form className="stack" onSubmit={send} noValidate>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <div className="field">
            <label htmlFor="pa-title">Title</label>
            <input id="pa-title" className="input" maxLength={160} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Org renewal documents due Oct 30" />
          </div>
          <div className="field">
            <label htmlFor="pa-content">Message</label>
            <textarea id="pa-content" className="input" rows="4" maxLength={5000} value={form.content} onChange={(e) => set({ content: e.target.value })} />
          </div>
          <fieldset className="field">
            <legend>Send to</legend>
            <div className="audience-options">
              {AUDIENCES.map((a) => (
                <label key={a.key} className={`audience-option ${form.audience === a.key ? "is-on" : ""}`}>
                  <input type="radio" name="audience" value={a.key} checked={form.audience === a.key} onChange={() => set({ audience: a.key })} />
                  <span><strong>{a.label}</strong><span className="muted small">{a.hint}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          {form.audience !== "everyone" && (
            <fieldset className="field">
              <legend>Organizations</legend>
              <div className="audience-scope">
                <label className="checkbox"><input type="radio" name="scope" checked={form.scope === "all"} onChange={() => set({ scope: "all" })} /> All organizations</label>
                <label className="checkbox"><input type="radio" name="scope" checked={form.scope === "some"} onChange={() => set({ scope: "some" })} /> Only these:</label>
              </div>
              {form.scope === "some" && (
                <div className="course-chips">
                  {live.map((o) => (
                    <button key={o.id} type="button" className={`course-chip ${form.orgIds.includes(o.id) ? "is-on" : ""}`} aria-pressed={form.orgIds.includes(o.id)} onClick={() => toggleOrg(o.id)}>
                      <span className="course-dot" aria-hidden="true" /> {o.name}
                    </button>
                  ))}
                </div>
              )}
            </fieldset>
          )}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={sending}>
              <Icon name="megaphone" size={16} /> {sending ? "Sending…" : "Send announcement"}
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Sent" subtitle="Click one to read and answer each org's replies" className="flush" tour="admin-announce-list">
        {!list ? (
          <div className="skeleton-list padded" aria-hidden="true"><span /><span /></div>
        ) : list.length === 0 ? (
          <EmptyState compact icon="megaphone" title="Nothing sent yet" text="Your announcements and the replies to them show here." />
        ) : (
          <ul className="review-list sent-list">
            {list.map((a) => {
              const waiting = a.threads.filter((t) => t.waiting).length;
              return (
                <li key={a.id}>
                  <button type="button" className="sent-item" onClick={() => setOpenId(a.id)}>
                    <span className="review-name">{a.title}</span>
                    <span className="review-detail">
                      {a.audienceLabel} · {a.organizations ? a.organizations.map((o) => o.shortName).join(", ") : "All organizations"} · {relativeDate(a.createdAt)}
                    </span>
                    <span className="review-detail">
                      {a.threads.length ? `${a.threads.length} ${a.threads.length === 1 ? "org replied" : "orgs replied"}` : "No replies yet"}
                      {waiting > 0 && <strong className="sent-waiting"> · {waiting} waiting for you</strong>}
                    </span>
                  </button>
                  <button type="button" className="icon-btn sm danger" aria-label={`Delete ${a.title}`} onClick={() => setDeleting(a)}>
                    <Icon name="trash" size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {open && <AnnouncementDetails key={open.id} announcement={open} flash={flash} onClose={() => setOpenId(null)} onChanged={load} />}
      {deleting && (
        <ConfirmDialog
          title="Delete this announcement?"
          message={`"${deleting.title}" and every org's replies to it are removed for everyone.`}
          confirmLabel="Delete"
          onCancel={() => setDeleting(null)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}

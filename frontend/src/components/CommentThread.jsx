import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import { UserAvatar } from "./Avatars.jsx";
import { announcementsApi } from "../api/services.js";
import { useAuth } from "../context/AuthContext.jsx";
import { relativeDate } from "../utils/format.js";

// An announcement's comments, with replies under each comment (one level).
// Used in the dashboard feed and in an announcement's pop-up. Anyone can comment and reply;
// authors edit their own (as often as they like, shown "edited"); authors and officers delete.
// onCount(n): the number of comments and replies, whenever it changes
export default function CommentThread({ postId, onCount }) {
  const { user } = useAuth();
  const [comments, setComments] = useState(null); // null = loading
  const [note, setNote] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // { id, name } of the comment being answered
  const [reply, setReply] = useState("");
  const [confirmingId, setConfirmingId] = useState(null); // comment waiting for "Delete?" confirmation
  const [editing, setEditing] = useState(null); // { id, text } while a comment is being edited
  const [saving, setSaving] = useState(false);

  const isMine = (c) => c.userId === user.id;
  const canDelete = (c) => isMine(c) || user.role === "officer";

  const load = () =>
    announcementsApi.comments(postId)
      .then((list) => setComments(Array.isArray(list) ? list : []))
      .catch(() => {
        setComments([]);
        setNote("Couldn't load the comments. Try again later.");
      });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  useEffect(() => {
    if (comments) onCount?.(comments.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments]);

  const send = async (e, parentId = null) => {
    e.preventDefault();
    const value = (parentId ? reply : text).trim();
    if (!value || sending) return;
    setSending(true);
    try {
      const added = await announcementsApi.addComment(postId, value, parentId);
      setComments((list) => [...(list || []), added]);
      if (parentId) {
        setReply("");
        setReplyTo(null);
      } else {
        setText("");
      }
      setNote("");
    } catch {
      setNote("Couldn't post that. Try again.");
    } finally {
      setSending(false);
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    const value = editing.text.trim();
    if (!value || saving) return;
    setSaving(true);
    try {
      const updated = await announcementsApi.updateComment(postId, editing.id, value);
      setComments((list) => list.map((c) => (c.id === updated.id ? updated : c)));
      setEditing(null);
      setNote("");
    } catch {
      setNote("Couldn't save your changes. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (comment) => {
    setConfirmingId(null);
    try {
      await announcementsApi.deleteComment(postId, comment.id);
      // Its replies go with it
      setComments((list) => list.filter((c) => c.id !== comment.id && c.parentId !== comment.id));
      setNote("");
    } catch {
      setNote("Couldn't delete the comment. Try again.");
    }
  };

  // A plain function, not a component, so the edit box keeps its focus while typing
  const renderComment = (c, isReply = false) => (
    <li key={c.id} className={`feed-comment ${isReply ? "is-reply" : ""}`}>
      {editing?.id === c.id ? (
        <form className="feed-comment-edit" onSubmit={saveEdit}>
          <label htmlFor={`edit-comment-${c.id}`} className="sr-only">Edit your comment</label>
          <input
            id={`edit-comment-${c.id}`}
            className="input"
            value={editing.text}
            maxLength={500}
            autoFocus
            onChange={(e) => setEditing({ ...editing, text: e.target.value })}
            onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={!editing.text.trim() || saving}>Save</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
        </form>
      ) : (
        <>
          <UserAvatar user={{ name: c.userName, ...c.userAvatar }} className="xs comment-avatar" />
          <span className="feed-comment-text">
            <strong>{c.userName}</strong> <span>{c.text}</span>
            {c.createdAt && <time className="muted small"> · {relativeDate(c.createdAt)}</time>}
            {c.edited && <span className="muted small"> (edited)</span>}
            {!isReply && (
              <button type="button" className="link-btn comment-reply-btn" onClick={() => { setReplyTo({ id: c.id, name: c.userName }); setReply(""); }}>
                Reply
              </button>
            )}
          </span>
          {confirmingId === c.id ? (
            <span className="feed-comment-confirm">
              Delete?
              <button type="button" className="link-btn is-danger" onClick={() => remove(c)}>Delete</button>
              <button type="button" className="link-btn" onClick={() => setConfirmingId(null)}>Cancel</button>
            </span>
          ) : (
            <span className="feed-comment-tools">
              {isMine(c) && (
                <button type="button" className="feed-comment-tool" onClick={() => { setConfirmingId(null); setEditing({ id: c.id, text: c.text }); }} aria-label="Edit your comment" title="Edit comment">
                  <Icon name="edit" size={14} />
                </button>
              )}
              {canDelete(c) && (
                <button type="button" className="feed-comment-tool is-delete" onClick={() => setConfirmingId(c.id)} aria-label={`Delete comment by ${c.userName}`} title="Delete comment">
                  <Icon name="trash" size={14} />
                </button>
              )}
            </span>
          )}
        </>
      )}
    </li>
  );

  const top = (comments || []).filter((c) => !c.parentId);
  const repliesTo = (id) => comments.filter((c) => c.parentId === id);

  return (
    <div className="feed-comments">
      {comments === null ? (
        <p className="muted small">Loading comments…</p>
      ) : top.length === 0 ? (
        <p className="muted small">No comments yet. Be the first!</p>
      ) : (
        <ul>
          {top.map((c) => (
            <li key={c.id} className="comment-group">
              <ul>
                {renderComment(c)}
              </ul>
              {(repliesTo(c.id).length > 0 || replyTo?.id === c.id) && (
                <ul className="comment-replies">
                  {repliesTo(c.id).map((r) => renderComment(r, true))}
                  {replyTo?.id === c.id && (
                    <li>
                      <form className="feed-comment-form" onSubmit={(e) => send(e, c.id)}>
                        <label htmlFor={`reply-${c.id}`} className="sr-only">Reply to {c.userName}</label>
                        <input
                          id={`reply-${c.id}`}
                          className="input"
                          placeholder={`Reply to ${replyTo.name}`}
                          value={reply}
                          maxLength={500}
                          autoFocus
                          onChange={(e) => setReply(e.target.value)}
                          onKeyDown={(e) => e.key === "Escape" && setReplyTo(null)}
                        />
                        <button type="submit" className="btn btn-primary btn-sm" disabled={!reply.trim() || sending}>Reply</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReplyTo(null)}>Cancel</button>
                      </form>
                    </li>
                  )}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
      {note && <p className="muted small" role="status">{note}</p>}
      <form className="feed-comment-form" onSubmit={(e) => send(e)}>
        <label htmlFor={`comment-${postId}`} className="sr-only">Write a comment</label>
        <input
          id={`comment-${postId}`}
          className="input"
          placeholder="Write a comment"
          value={text}
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={!text.trim() || sending}>Post</button>
      </form>
    </div>
  );
}

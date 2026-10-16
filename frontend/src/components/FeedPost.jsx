import { useState } from "react";
import Icon from "./Icon.jsx";
import { announcementsApi } from "../api/services.js";
import { useAuth } from "../context/AuthContext.jsx";
import { initials, relativeDate } from "../utils/format.js";

const NOT_READY = "Comments aren't available yet.";

// One announcement in the member dashboard feed (Figma), with Like and Comment.
// Likes and comments use endpoints the backend is still adding: until then the count stays 0,
// a like quietly undoes itself, and the comment box says comments aren't available yet.
export default function FeedPost({ post }) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(Number(post.likes) || 0);
  const [liked, setLiked] = useState(Boolean(post.likedByMe));
  const [liking, setLiking] = useState(false);

  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState(null); // null = not loaded yet
  const [commentCount, setCommentCount] = useState(Number(post.commentCount) || 0);
  const [note, setNote] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null); // comment waiting for "Delete?" confirmation
  const [editing, setEditing] = useState(null); // { id, text } while a comment is being edited
  const [saving, setSaving] = useState(false);

  // Only authors can edit; authors can delete their own comments and officers any (moderation)
  const isMine = (c) => c.userId === user.id;
  const canDelete = (c) => isMine(c) || user.role === "officer";

  const toggleLike = async () => {
    if (liking) return;
    const before = { likes, liked };
    setLiked(!liked); // show it right away, undo if the server says no
    setLikes(likes + (liked ? -1 : 1));
    setLiking(true);
    try {
      const res = liked ? await announcementsApi.unlike(post.id) : await announcementsApi.like(post.id);
      if (res && typeof res.likes === "number") {
        setLikes(res.likes);
        setLiked(Boolean(res.likedByMe));
      }
    } catch {
      setLikes(before.likes);
      setLiked(before.liked);
    } finally {
      setLiking(false);
    }
  };

  const toggleComments = async () => {
    const next = !open;
    setOpen(next);
    if (!next || comments !== null) return;
    try {
      const list = await announcementsApi.comments(post.id);
      setComments(Array.isArray(list) ? list : []);
      setCommentCount(Array.isArray(list) ? list.length : 0);
      setNote("");
    } catch {
      setComments([]);
      setNote(NOT_READY);
    }
  };

  const sendComment = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      const added = await announcementsApi.addComment(post.id, value);
      setComments((list) => [...(list || []), added]);
      setCommentCount((n) => n + 1);
      setText("");
      setNote("");
    } catch {
      setNote(NOT_READY);
    } finally {
      setSending(false);
    }
  };

  const startEdit = (comment) => {
    setConfirmingId(null);
    setEditing({ id: comment.id, text: comment.text });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    const value = editing.text.trim();
    if (!value || saving) return;
    setSaving(true);
    try {
      const updated = await announcementsApi.updateComment(post.id, editing.id, value);
      setComments((list) => list.map((c) => (c.id === updated.id ? updated : c)));
      setEditing(null);
      setNote("");
    } catch {
      setNote("Couldn't save your changes. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteComment = async (comment) => {
    setConfirmingId(null);
    try {
      await announcementsApi.deleteComment(post.id, comment.id);
      setComments((list) => list.filter((c) => c.id !== comment.id));
      setCommentCount((n) => Math.max(0, n - 1));
      setNote("");
    } catch {
      setNote("Couldn't delete the comment. Try again.");
    }
  };

  return (
    <article className="feed-post">
      <header className="feed-post-head">
        <span className="avatar feed-avatar" aria-hidden="true">{initials(post.authorName || "")}</span>
        <div>
          <div className="feed-author">{post.authorName}</div>
          <time className="feed-time" dateTime={post.createdAt}>
            {relativeDate(post.createdAt)}
          </time>
        </div>
        {post.pinned && (
          <span className="feed-pinned">
            <Icon name="pushpin" size={13} /> Pinned
          </span>
        )}
      </header>

      <div className="feed-cat">{post.category}</div>
      <h3 className="feed-title">{post.title}</h3>
      {post.content && <p className="feed-body">{post.content}</p>}

      <footer className="feed-actions">
        <span className="feed-count" aria-label={`${likes} likes`}>{likes}</span>
        <button
          type="button"
          className={`feed-btn ${liked ? "is-on" : ""}`}
          aria-pressed={liked}
          onClick={toggleLike}
          disabled={liking}
        >
          <Icon name="heart" size={16} /> Like
        </button>
        <button type="button" className="feed-btn" aria-expanded={open} onClick={toggleComments}>
          <Icon name="comment" size={16} /> Comment{commentCount > 0 && ` (${commentCount})`}
        </button>
      </footer>

      {open && (
        <div className="feed-comments">
          {comments === null ? (
            <p className="muted small">Loading comments…</p>
          ) : (
            comments.length > 0 && (
              <ul>
                {comments.map((c) => (
                  <li key={c.id} className="feed-comment">
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
                        <button type="submit" className="btn btn-primary btn-sm" disabled={!editing.text.trim() || saving}>
                          Save
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className="feed-comment-text">
                          <strong>{c.userName}</strong> <span>{c.text}</span>
                          {c.createdAt && <time className="muted small"> · {relativeDate(c.createdAt)}</time>}
                          {c.edited && <span className="muted small"> (edited)</span>}
                        </span>
                        {confirmingId === c.id ? (
                          <span className="feed-comment-confirm">
                            Delete?
                            <button type="button" className="link-btn is-danger" onClick={() => deleteComment(c)}>Delete</button>
                            <button type="button" className="link-btn" onClick={() => setConfirmingId(null)}>Cancel</button>
                          </span>
                        ) : (
                          <span className="feed-comment-tools">
                            {/* One edit per comment: no pencil once it has been edited */}
                            {isMine(c) && !c.edited && (
                              <button
                                type="button"
                                className="feed-comment-tool"
                                onClick={() => startEdit(c)}
                                aria-label="Edit your comment"
                                title="Edit comment"
                              >
                                <Icon name="edit" size={14} />
                              </button>
                            )}
                            {canDelete(c) && (
                              <button
                                type="button"
                                className="feed-comment-tool is-delete"
                                onClick={() => setConfirmingId(c.id)}
                                aria-label={`Delete comment by ${c.userName}`}
                                title="Delete comment"
                              >
                                <Icon name="trash" size={14} />
                              </button>
                            )}
                          </span>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )
          )}
          {note && <p className="muted small" role="status">{note}</p>}
          <form className="feed-comment-form" onSubmit={sendComment}>
            <label htmlFor={`comment-${post.id}`} className="sr-only">Write a comment</label>
            <input
              id={`comment-${post.id}`}
              className="input"
              placeholder="Write a comment"
              value={text}
              maxLength={500}
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={!text.trim() || sending}>
              Post
            </button>
          </form>
        </div>
      )}
    </article>
  );
}

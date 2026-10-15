import { useState } from "react";
import Icon from "./Icon.jsx";
import { announcementsApi } from "../api/services.js";
import { initials, relativeDate } from "../utils/format.js";

const NOT_READY = "Comments aren't available yet.";

// One announcement in the member dashboard feed (Figma), with Like and Comment.
// Likes and comments use endpoints the backend is still adding: until then the count stays 0,
// a like quietly undoes itself, and the comment box says comments aren't available yet.
export default function FeedPost({ post }) {
  const [likes, setLikes] = useState(Number(post.likes) || 0);
  const [liked, setLiked] = useState(Boolean(post.likedByMe));
  const [liking, setLiking] = useState(false);

  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState(null); // null = not loaded yet
  const [commentCount, setCommentCount] = useState(Number(post.commentCount) || 0);
  const [note, setNote] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

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
                  <li key={c.id}>
                    <strong>{c.userName}</strong> <span>{c.text}</span>
                    {c.createdAt && <time className="muted small"> · {relativeDate(c.createdAt)}</time>}
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

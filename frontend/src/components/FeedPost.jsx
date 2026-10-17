import { useState } from "react";
import Icon from "./Icon.jsx";
import { announcementsApi } from "../api/services.js";
import { relativeDate } from "../utils/format.js";
import { UserAvatar } from "./Avatars.jsx";
import CommentThread from "./CommentThread.jsx";

// One announcement in the member dashboard feed (Figma), with Like and Comment (comments and replies:
// CommentThread.jsx)
export default function FeedPost({ post }) {
  const [likes, setLikes] = useState(Number(post.likes) || 0);
  const [liked, setLiked] = useState(Boolean(post.likedByMe));
  const [liking, setLiking] = useState(false);

  const [open, setOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(Number(post.commentCount) || 0);

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

  return (
    <article className="feed-post">
      <header className="feed-post-head">
        <UserAvatar user={{ name: post.authorName || "", ...post.authorAvatar }} className="feed-avatar" />
        <div>
          <div className="feed-author">{post.authorName}</div>
          <div className="feed-time">
            {/* Which officer posted it, e.g. "Secretary · Oct 3, 2026" */}
            {post.authorPosition && <span className="feed-position">{post.authorPosition} · </span>}
            <time dateTime={post.createdAt}>{relativeDate(post.createdAt)}</time>
          </div>
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
        <button type="button" className="feed-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon name="comment" size={16} /> Comment{commentCount > 0 && ` (${commentCount})`}
        </button>
      </footer>

      {open && <CommentThread postId={post.id} onCount={setCommentCount} />}
    </article>
  );
}

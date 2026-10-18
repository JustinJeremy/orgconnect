import { useEffect, useState } from "react";
import Icon from "../components/Icon.jsx";
import Tabs from "../components/Tabs.jsx";
import EmptyState from "../components/EmptyState.jsx";
import AnnouncementForm from "../components/AnnouncementForm.jsx";
import Pagination from "../components/Pagination.jsx";
import Modal from "../components/Modal.jsx";
import CommentThread from "../components/CommentThread.jsx";
import PlatformAnnouncements from "../components/PlatformAnnouncements.jsx";
import { UserAvatar } from "../components/Avatars.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import usePagedList from "../hooks/usePagedList.js";
import useFocusItem from "../hooks/useFocusItem.js";
import { announcementsApi } from "../api/services.js";
import { ANNOUNCEMENT_CATEGORIES } from "../data/constants.js";
import { formatDate, relativeDate } from "../utils/format.js";
import PostAttachment from "../components/PostAttachment.jsx";

const PER_PAGE = 8;

// One announcement in full, with its comments and replies (officers see and answer members' comments here)
function AnnouncementDetails({ post, isOfficer, memberCount, onClose }) {
  const [count, setCount] = useState(Number(post.commentCount) || 0);
  return (
    <Modal title={post.title} subtitle={`${post.category} · ${relativeDate(post.createdAt)}`} onClose={onClose} size="lg">
      <div className="item-details">
        <div className="announcement-author">
          <UserAvatar user={{ name: post.authorName || "", ...post.authorAvatar }} className="sm" />
          <span>
            <strong>{post.authorName}</strong>
            <span className="muted small">{post.authorPosition ? `${post.authorPosition} · ` : ""}{formatDate(post.createdAt.slice(0, 10))}</span>
          </span>
          {post.pinned && <span className="post-pinned"><Icon name="pushpin" size={13} /> Pinned</span>}
        </div>
        <p className="detail-text">{post.content}</p>
        <PostAttachment file={post.attachment} />
        {isOfficer && (
          <p className="muted small">Read by {post.readCount ?? 0}{memberCount ? ` of ${memberCount}` : ""} members</p>
        )}
        <div className="detail-section">
          <h3>Comments{count > 0 && <span className="tab-count">{count}</span>}</h3>
          <CommentThread postId={post.id} onCount={setCount} />
        </div>
      </div>
    </Modal>
  );
}

function Post({ post, isOfficer, memberCount, actions, onEdit, highlighted = false }) {
  const unread = !isOfficer && !post.isRead;
  const [open, setOpen] = useState(false); // the full post with its comments
  // Opening it counts as reading it
  const openPost = () => {
    setOpen(true);
    if (unread) actions.markRead(post);
  };

  return (
    <>
    <article
      className={`post is-openable ${unread ? "is-unread" : ""} ${post.category === "Urgent" ? "is-urgent" : ""} ${highlighted ? "is-focused" : ""}`}
      data-focus={`post-${post.id}`}
      onClick={(e) => !e.target.closest("button, a, input") && openPost()}
    >
      <div className="post-meta">
        {post.pinned && (
          <span className="post-pinned">
            <Icon name="pushpin" size={13} /> Pinned
          </span>
        )}
        <span className="post-cat">{post.category}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={post.createdAt} title={formatDate(post.createdAt.slice(0, 10))}>
          {relativeDate(post.createdAt)}
        </time>
        {unread && <span className="unread-dot" aria-label="Unread" />}
      </div>

      <h3><button type="button" className="card-title-btn" onClick={openPost}>{post.title}</button></h3>
      <p className="post-body">{post.content}</p>
      <PostAttachment file={post.attachment} />

      <footer className="post-foot">
        <span className="muted small">
          {post.authorName}
          {post.authorPosition && `, ${post.authorPosition}`}
          <button type="button" className="link-btn post-comments-link" onClick={openPost}>
            <Icon name="comment" size={14} /> {post.commentCount ? `${post.commentCount} ${post.commentCount === 1 ? "comment" : "comments"}` : "Comment"}
          </button>
        </span>

        {isOfficer ? (
          <div className="post-actions">
            <span className="muted small">
              Read by {post.readCount ?? 0}
              {memberCount ? ` of ${memberCount}` : ""}
            </span>
            <button
              type="button"
              className={`icon-btn sm ${post.pinned ? "is-on" : ""}`}
              aria-label={post.pinned ? `Unpin ${post.title}` : `Pin ${post.title}`}
              aria-pressed={post.pinned}
              onClick={() => actions.togglePin(post)}
            >
              <Icon name="pushpin" size={16} />
            </button>
            <button type="button" className="icon-btn sm" aria-label={`Edit ${post.title}`} onClick={() => onEdit(post)}>
              <Icon name="edit" size={16} />
            </button>
            <button type="button" className="icon-btn sm danger" aria-label={`Delete ${post.title}`} onClick={() => actions.remove(post)}>
              <Icon name="trash" size={16} />
            </button>
          </div>
        ) : (
          unread && (
            <button type="button" className="link-btn" onClick={() => actions.markRead(post)}>
              Mark as read
            </button>
          )
        )}
      </footer>
    </article>
    {open && <AnnouncementDetails post={post} isOfficer={isOfficer} memberCount={memberCount} onClose={() => setOpen(false)} />}
    </>
  );
}

// focus: { kind: "post", id, search, key } from a clicked notification
export default function Announcements({ data, loading, actions, focus, onFocusDone }) {
  const { user } = useAuth();
  const isOfficer = user.role === "officer";
  const { announcements, members } = data;
  const memberCount = members.filter((m) => m.status === "Active").length;

  const [view, setView] = useState("all"); // all | unread
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [form, setForm] = useState(null); // null | { post? }

  const unreadCount = announcements.filter((a) => !a.isRead).length;
  const filtersActive = Boolean(search.trim()) || category !== "All";
  // One page of posts from the API (pinned first, then newest); reloads when posts change or are read
  const list = usePagedList(announcementsApi.page, { view: view === "unread" ? "unread" : "", category, search }, PER_PAGE, announcements);

  // From a notification: show every post, search for its title, then scroll to it and highlight it
  useEffect(() => {
    if (!focus || focus.kind === "platform") return;
    setView("all");
    setCategory("All");
    setSearch(focus.search || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key]);
  const highlightId = useFocusItem({ focus, kind: "post", items: list.items, ready: list.loaded, onDone: onFocusDone });

  const handleSave = async (values, attachment) => {
    const ok = await actions.save(form.post?.id, values, attachment);
    if (ok) setForm(null);
  };

  return (
    <div className="page">
      {/* Announcements from the OrgConnect admin (a notification can open one) */}
      <PlatformAnnouncements openId={focus?.kind === "platform" ? focus.id : null} onOpened={onFocusDone} />
      {!isOfficer && (
        <Tabs
          label="Filter"
          value={view}
          onChange={setView}
          items={[
            { key: "all", label: "All" },
            { key: "unread", label: "Unread", count: unreadCount },
          ]}
        />
      )}

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={17} className="search-icon" />
          <label htmlFor="an-search" className="sr-only">Search announcements</label>
          <input
            id="an-search"
            type="search"
            className="input"
            placeholder="Search announcements"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label htmlFor="an-filter" className="sr-only">Category</label>
        <select id="an-filter" className="input select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="All">All categories</option>
          {ANNOUNCEMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {isOfficer ? (
          <button type="button" className="btn btn-accent toolbar-cta" data-tour="announcement-create" onClick={() => setForm({})}>
            <Icon name="plus" size={17} /> New announcement
          </button>
        ) : (
          unreadCount > 0 && (
            <button type="button" className="btn btn-outline toolbar-cta" onClick={actions.markAllRead}>
              Mark all as read
            </button>
          )
        )}
      </div>

      {loading || !list.loaded ? (
        <div className="panel"><div className="skeleton-list" aria-hidden="true"><span /><span /><span /></div></div>
      ) : list.total === 0 ? (
        <EmptyState
          icon="megaphone"
          title={
            filtersActive ? "No matching announcements" : view === "unread" ? "You're all caught up" : "No announcements yet"
          }
          text={
            filtersActive
              ? "Try another keyword or category."
              : view === "unread"
              ? "There's nothing new since your last visit."
              : isOfficer
              ? "Post an update and every member will be notified."
              : "Updates from your officers will appear here."
          }
        />
      ) : (
        <div className="feed">
          {list.items.map((post) => (
            <Post
              key={post.id}
              post={post}
              isOfficer={isOfficer}
              memberCount={memberCount}
              actions={actions}
              onEdit={(p) => setForm({ post: p })}
              highlighted={post.id === highlightId}
            />
          ))}
        </div>
      )}

      {!loading && <Pagination page={list.page} totalPages={list.totalPages} onChange={list.setPage} />}

      {form && <AnnouncementForm initial={form.post} onSave={handleSave} onCancel={() => setForm(null)} />}
    </div>
  );
}

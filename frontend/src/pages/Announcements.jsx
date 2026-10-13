import { useState } from "react";
import Icon from "../components/Icon.jsx";
import Tabs from "../components/Tabs.jsx";
import EmptyState from "../components/EmptyState.jsx";
import AnnouncementForm from "../components/AnnouncementForm.jsx";
import Pagination from "../components/Pagination.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import usePagedList from "../hooks/usePagedList.js";
import { announcementsApi } from "../api/services.js";
import { ANNOUNCEMENT_CATEGORIES } from "../data/constants.js";
import { formatDate, relativeDate } from "../utils/format.js";

const PER_PAGE = 8;

function Post({ post, isOfficer, memberCount, actions, onEdit }) {
  const unread = !isOfficer && !post.isRead;

  return (
    <article className={`post ${unread ? "is-unread" : ""} ${post.category === "Urgent" ? "is-urgent" : ""}`}>
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

      <h3>{post.title}</h3>
      <p className="post-body">{post.content}</p>

      <footer className="post-foot">
        <span className="muted small">
          {post.authorName}
          {post.authorPosition && `, ${post.authorPosition}`}
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
  );
}

export default function Announcements({ data, loading, actions }) {
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

  const handleSave = async (values) => {
    const ok = await actions.save(form.post?.id, values);
    if (ok) setForm(null);
  };

  return (
    <div className="page">
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
          <button type="button" className="btn btn-accent toolbar-cta" onClick={() => setForm({})}>
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
            />
          ))}
        </div>
      )}

      {!loading && <Pagination page={list.page} totalPages={list.totalPages} onChange={list.setPage} />}

      {form && <AnnouncementForm initial={form.post} onSave={handleSave} onCancel={() => setForm(null)} />}
    </div>
  );
}

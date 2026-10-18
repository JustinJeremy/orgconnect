import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { UserAvatar } from "./Avatars.jsx";
import { usePeople } from "../context/PeopleContext.jsx";
import { searchApi } from "../api/services.js";
import { errorMessage } from "../api/client.js";
import { formatDate, formatTime, relativeDate } from "../utils/format.js";

// Search everything in the selected org (the sidebar's Search, or Ctrl+K): people, events, tutoring,
// announcements, shared resources and your chats. Arrow keys move, Enter opens, Esc closes.
// onOpen(kind, item): show the item on its page (people open their profile here)
export default function SearchPalette({ orgName, onOpen, onClose }) {
  const { openPerson } = usePeople();
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Searched as you type (from 2 letters), a moment after you stop
  useEffect(() => {
    const words = q.trim();
    if (words.length < 2) {
      setResults(null);
      setLoading(false);
      return undefined;
    }
    let live = true;
    setLoading(true);
    const timer = setTimeout(() => {
      searchApi
        .search(words)
        .then((r) => live && (setResults(r), setError(""), setActive(0)))
        .catch((err) => live && setError(errorMessage(err)))
        .finally(() => live && setLoading(false));
    }, 220);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q]);

  // One flat list (for the arrow keys), in sections
  const items = useMemo(() => {
    if (!results) return [];
    const rows = [];
    const add = (section, kind, list, row) => list.forEach((item) => rows.push({ section, kind, item, key: `${kind}-${item.id}-${rows.length}`, ...row(item) }));
    add("People", "person", results.people, (p) => ({ title: p.name, sub: p.position !== "Member" ? p.position : "Member", avatar: p }));
    add("Events", "event", results.events, (e) => ({ title: e.title, sub: `${formatDate(e.date)} · ${formatTime(e.time)} · ${e.location}${e.completed ? " · Completed" : ""}`, icon: "calendar" }));
    add("Peer tutoring", "session", results.sessions, (s) => ({ title: s.subject, sub: `${s.tutorName} · ${s.schedule}`, icon: "book" }));
    add("Announcements", "announcement", results.announcements, (a) => ({ title: a.title, sub: `${a.category} · ${relativeDate(a.createdAt)}`, icon: "megaphone" }));
    add("Learning resources", "resource", results.resources, (r) => ({ title: r.title, sub: `${r.subject} · ${r.type} · opens in a new tab`, icon: "link" }));
    add("Chats", "chat", results.chats, (c) => ({ title: c.title, sub: c.snippet ? `${c.subtitle}${c.snippet}` : c.subtitle, avatar: c.who?.group ? null : c.who, icon: c.who?.group ? "users" : "mail" }));
    return rows;
  }, [results]);

  const open = (row) => {
    if (row.kind === "person") openPerson(row.item.id);
    else if (row.kind === "resource") window.open(row.item.url, "_blank", "noopener");
    else onOpen(row.kind, row.item);
    onClose();
  };

  const onKeyDown = (e) => {
    if (!items.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      setActive(next);
      listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      open(items[active]);
    }
  };

  const words = q.trim();

  return (
    <div className="modal-backdrop search-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="search-palette" role="dialog" aria-modal="true" aria-label={`Search ${orgName}`}>
        <div className="search-palette-input">
          <Icon name="search" size={19} />
          <input
            ref={inputRef}
            type="search"
            placeholder={`Search ${orgName}: people, events, tutoring, posts, chats…`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            aria-controls="search-results"
            aria-activedescendant={items[active] ? `search-row-${active}` : undefined}
          />
          {loading && <span className="search-spinner" aria-hidden="true" />}
          <kbd>Esc</kbd>
        </div>

        <div className="search-palette-body" ref={listRef} id="search-results" role="listbox" aria-label="Results">
          {error ? (
            <p className="search-palette-note">{error}</p>
          ) : words.length < 2 ? (
            <div className="search-palette-note">
              <p>Type at least 2 letters.</p>
              <p className="muted small">Try a name, an event, a subject like "SQL", or a word from a chat.</p>
            </div>
          ) : results && !items.length ? (
            <p className="search-palette-note">Nothing in {orgName} matches "{words}".</p>
          ) : (
            items.map((row, i) => (
              <div key={row.key}>
                {row.section !== items[i - 1]?.section && <p className="search-section">{row.section}</p>}
                <button
                  type="button"
                  id={`search-row-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={i === active}
                  className={`search-row ${i === active ? "is-active" : ""}`}
                  onMouseMove={() => setActive(i)}
                  onClick={() => open(row)}
                >
                  {row.avatar ? <UserAvatar user={row.avatar} className="sm" /> : <span className="search-row-icon"><Icon name={row.icon} size={17} /></span>}
                  <span className="search-row-text">
                    <strong>{row.title}</strong>
                    <span>{row.sub}</span>
                  </span>
                  <Icon name={row.kind === "resource" ? "link" : "arrowRight"} size={15} className="search-row-go" />
                </button>
              </div>
            ))
          )}
        </div>
        <footer className="search-palette-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
          <span><kbd>Enter</kbd> open</span>
          <span><kbd>Ctrl</kbd><kbd>K</kbd> search from anywhere</span>
        </footer>
      </div>
    </div>
  );
}

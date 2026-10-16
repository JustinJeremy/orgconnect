import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Icon from "../components/Icon.jsx";
import EventCard from "../components/EventCard.jsx";
import EventForm from "../components/EventForm.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Pagination from "../components/Pagination.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { eventsApi } from "../api/services.js";
import usePagedList from "../hooks/usePagedList.js";
import { EVENT_CATEGORIES } from "../data/constants.js";

const PER_PAGE = 9;

// Pill filter under the search bar (All / Upcoming / Past / My Events)
// One highlight slides under the active pill (measured from the active button)
function EventPills({ items, value, onChange }) {
  const wrapRef = useRef(null);
  const [mark, setMark] = useState(null); // { x, w } of the active pill

  useLayoutEffect(() => {
    const measure = () => {
      const el = wrapRef.current?.querySelector(".pill.active");
      if (el) setMark({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [value]);

  return (
    <div className="pills" role="tablist" aria-label="Which events" data-tour="event-filters" ref={wrapRef}>
      {mark && (
        <span
          className="pill-mark"
          aria-hidden="true"
          style={{ width: mark.w, height: mark.h, transform: `translate(${mark.x}px, ${mark.y}px)` }}
        />
      )}
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={value === item.key}
          data-tour={`tab-${item.key}`}
          className={`pill ${value === item.key ? "active" : ""}`}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

// focus: { eventId?, eventTitle?, key } from a clicked notification: find that event, scroll to it and highlight it
export default function Events({ data, loading, actions, focus, onFocusDone }) {
  const { user } = useAuth();
  const isOfficer = user.role === "officer";
  const { events } = data;

  const [tab, setTab] = useState("upcoming"); // all | upcoming | past | mine
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("date");
  const [form, setForm] = useState(null); // null | { event? }


  const tabs = [
    { key: "all", label: "All" },
    { key: "upcoming", label: "Upcoming" },
    { key: "past", label: "Past" },
    { key: "mine", label: "My Events" },
  ];

  // One page at a time from the API, filtered and sorted there; reloads when events change
  const list = usePagedList(eventsApi.page, { tab, category, search, sort: sortBy }, PER_PAGE, events);
  const filtersActive = Boolean(search.trim()) || category !== "All";

  // From a notification: search all events for its title, then scroll to the card once it is loaded
  const [highlightId, setHighlightId] = useState(null);
  const listRef = useRef(null);
  useEffect(() => {
    if (!focus) return;
    setTab("all");
    setCategory("All");
    setSearch(focus.eventTitle || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key]);

  useEffect(() => {
    if (!focus || !list.loaded || search !== (focus.eventTitle || "") || tab !== "all") return;
    const match = list.items.find((e) => (focus.eventId ? e.id === focus.eventId : e.title === focus.eventTitle));
    if (!match) return; // the list may still show the previous results; wait for the next load
    setHighlightId(match.id);
    listRef.current?.querySelector(`[data-event-id="${match.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    onFocusDone?.();
  }, [focus, list.loaded, list.items, search, tab, onFocusDone]);

  // Stop looking if the event never shows up (e.g. it was deleted)
  useEffect(() => {
    if (!focus) return;
    const timer = setTimeout(() => onFocusDone?.(), 4000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key]);

  // The highlight fades after a few seconds
  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlightId(null), 3000);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const resetFilters = () => {
    setSearch("");
    setCategory("All");
  };

  const handleSave = async (values, poster) => {
    const ok = await actions.save(form.event?.id, values, poster);
    if (ok) {
      setForm(null);
      if (!form.event) setTab("upcoming");
    }
  };

  // Officers see box cards in a grid; members see one wide row per event
  const listClass = isOfficer ? "card-grid" : "event-rows";

  const cardActions = { ...actions, edit: (event) => setForm({ event }) };

  const emptyText = {
    upcoming: isOfficer ? "Create an event so members can start signing up." : "Check back soon for new events.",
    all: isOfficer ? "Create an event so members can start signing up." : "Check back soon for new events.",
    past: "Completed events will be listed here.",
    mine: "Events you RSVP to will be listed here.",
  };

  return (
    <div className="page">
      <div className="event-tools" data-tour="event-tools">
        <div className="search">
          <Icon name="search" size={17} className="search-icon" />
          <label htmlFor="event-search" className="sr-only">Search events</label>
          <input
            id="event-search"
            type="search"
            className="input"
            placeholder="Search events"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label htmlFor="event-category" className="sr-only">Category</label>
        <select id="event-category" className="input select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="All">All categories</option>
          {EVENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label htmlFor="event-sort" className="sr-only">Sort</label>
        <select id="event-sort" className="input select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="date">Sort by date</option>
          <option value="popular">Most RSVPs</option>
        </select>
        {isOfficer && (
          <button type="button" className="btn btn-accent toolbar-cta" data-tour="event-create" onClick={() => setForm({})}>
            <Icon name="plus" size={16} /> Create event
          </button>
        )}
      </div>

      <EventPills items={tabs} value={tab} onChange={setTab} />

      {/* Skeleton only for the very first load; switching tabs keeps the current list (dimmed) until the next one arrives */}
      {loading || !list.loaded ? (
        <div className={listClass} aria-hidden="true">
          {[0, 1, 2].map((i) => <div key={i} className="event-card skeleton-card" />)}
        </div>
      ) : list.total === 0 ? (
        filtersActive ? (
          <EmptyState
            icon="search"
            title="No matching events"
            text="Try another keyword or category."
            action={
              <button type="button" className="btn btn-outline btn-sm" onClick={resetFilters}>
                Clear filters
              </button>
            }
          />
        ) : (
          <EmptyState
            icon="calendar"
            title={tab === "past" ? "No past events" : tab === "mine" ? "No RSVPs yet" : tab === "all" ? "No events yet" : "No upcoming events"}
            text={emptyText[tab]}
            action={
              isOfficer && (tab === "upcoming" || tab === "all") ? (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm({})}>
                  Create an event
                </button>
              ) : null
            }
          />
        )
      ) : (
        <div className={`list-swap ${list.pending ? "is-pending" : ""}`} aria-busy={list.pending}>
          <p className="result-count">
            {list.total} {list.total === 1 ? "event" : "events"}
            {filtersActive && (
              <button type="button" className="link-btn" onClick={resetFilters}>
                Clear filters
              </button>
            )}
          </p>
          {/* Keyed on the list version: a new tab, filter or page re-mounts the cards so they rise in, in order */}
          <div className={`${listClass} list-enter`} ref={listRef} key={list.version}>
            {list.items.map((event, i) => (
              <div key={event.id} className="list-item" style={{ "--i": Math.min(i, 8) }}>
                <EventCard event={event} userId={user.id} isOfficer={isOfficer} actions={cardActions} layout={isOfficer ? "box" : "row"} highlighted={event.id === highlightId} />
              </div>
            ))}
          </div>
          <Pagination page={list.page} totalPages={list.totalPages} onChange={list.setPage} />
        </div>
      )}

      {form && <EventForm initial={form.event} onSave={handleSave} onCancel={() => setForm(null)} />}
    </div>
  );
}

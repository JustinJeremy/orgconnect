import { useState } from "react";
import Icon from "../components/Icon.jsx";
import Tabs from "../components/Tabs.jsx";
import EventCard from "../components/EventCard.jsx";
import EventForm from "../components/EventForm.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Pagination from "../components/Pagination.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { EVENT_CATEGORIES } from "../data/constants.js";
import { isCompleted, myRegistration } from "../utils/format.js";

const PER_PAGE = 9;

export default function Events({ data, loading, actions }) {
  const { user } = useAuth();
  const isOfficer = user.role === "officer";
  const { events } = data;

  const [tab, setTab] = useState("upcoming"); // upcoming | past | mine
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("date");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // null | { event? }

  const upcoming = events.filter((e) => !isCompleted(e));
  const past = events.filter(isCompleted);
  const mine = upcoming.filter((e) => myRegistration(e, user.id));
  const lists = { upcoming, past, mine };

  const tabs = [
    { key: "upcoming", label: "Upcoming", count: upcoming.length },
    { key: "past", label: "Past", count: past.length },
    ...(isOfficer ? [] : [{ key: "mine", label: "My RSVPs", count: mine.length }]),
  ];

  const query = search.trim().toLowerCase();
  const filtered = lists[tab]
    .filter((e) => category === "All" || e.category === category)
    .filter((e) => !query || `${e.title} ${e.location} ${e.description || ""}`.toLowerCase().includes(query))
    .sort((a, b) => {
      if (sortBy === "popular") return b.registrations.length - a.registrations.length;
      return tab === "past" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const filtersActive = Boolean(query) || category !== "All";

  const change = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch("");
    setCategory("All");
    setPage(1);
  };

  const handleSave = async (values) => {
    const ok = await actions.save(form.event?.id, values);
    if (ok) {
      setForm(null);
      if (!form.event) setTab("upcoming");
    }
  };

  const cardActions = { ...actions, edit: (event) => setForm({ event }) };

  const emptyText = {
    upcoming: isOfficer ? "Create an event so members can start signing up." : "Check back soon for new events.",
    past: "Completed events will be listed here.",
    mine: "Events you RSVP to will be listed here.",
  };

  return (
    <div className="page">
      <Tabs label="Event status" items={tabs} value={tab} onChange={change(setTab)} />

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={17} className="search-icon" />
          <label htmlFor="event-search" className="sr-only">Search events</label>
          <input
            id="event-search"
            type="search"
            className="input"
            placeholder="Search events"
            value={search}
            onChange={(e) => change(setSearch)(e.target.value)}
          />
        </div>
        <label htmlFor="event-category" className="sr-only">Category</label>
        <select id="event-category" className="input select" value={category} onChange={(e) => change(setCategory)(e.target.value)}>
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
          <button type="button" className="btn btn-accent toolbar-cta" onClick={() => setForm({})}>
            <Icon name="plus" size={17} /> New event
          </button>
        )}
      </div>

      {loading ? (
        <div className="card-grid" aria-hidden="true">
          {[0, 1, 2].map((i) => <div key={i} className="event-card skeleton-card" />)}
        </div>
      ) : filtered.length === 0 ? (
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
            title={tab === "past" ? "No past events" : tab === "mine" ? "No RSVPs yet" : "No upcoming events"}
            text={emptyText[tab]}
            action={
              isOfficer && tab === "upcoming" ? (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm({})}>
                  Create an event
                </button>
              ) : null
            }
          />
        )
      ) : (
        <>
          <p className="result-count">
            {filtered.length} {filtered.length === 1 ? "event" : "events"}
            {filtersActive && (
              <button type="button" className="link-btn" onClick={resetFilters}>
                Clear filters
              </button>
            )}
          </p>
          <div className="card-grid">
            {pageItems.map((event) => (
              <EventCard key={event.id} event={event} userId={user.id} isOfficer={isOfficer} actions={cardActions} />
            ))}
          </div>
          <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {form && <EventForm initial={form.event} onSave={handleSave} onCancel={() => setForm(null)} />}
    </div>
  );
}

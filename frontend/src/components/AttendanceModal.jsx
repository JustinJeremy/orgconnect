import { useState } from "react";
import Icon from "./Icon.jsx";
import Modal from "./Modal.jsx";
import { formatDate, formatTime, isCompleted } from "../utils/format.js";

// Attendance checklist for one event (event_registrations: registered -> attended)
export default function AttendanceModal({ event, onClose, onSave }) {
  const [registrations, setRegistrations] = useState(() => event.registrations.map((r) => ({ ...r })));
  const [completed, setCompleted] = useState(isCompleted(event));
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const present = registrations.filter((r) => r.status === "attended").length;
  const q = query.trim().toLowerCase();
  const visible = registrations.filter((r) => !q || r.name.toLowerCase().includes(q));

  const toggle = (id) =>
    setRegistrations((list) =>
      list.map((r) => (r.id === id ? { ...r, status: r.status === "attended" ? "registered" : "attended" } : r))
    );
  const setAll = (status) => setRegistrations((list) => list.map((r) => ({ ...r, status })));

  const save = async () => {
    setSaving(true);
    await onSave(event, registrations, completed);
    setSaving(false);
  };

  return (
    <Modal
      title={`Attendance · ${event.title}`}
      subtitle={`${formatDate(event.date)} · ${formatTime(event.time)} · ${event.location}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <label className="checkbox">
            <input type="checkbox" checked={completed} onChange={(e) => setCompleted(e.target.checked)} />
            Mark event as completed and issue certificates
          </label>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save attendance"}
            </button>
          </div>
        </>
      }
    >
      {registrations.length === 0 ? (
        <p className="muted">Nobody has registered for this event yet.</p>
      ) : (
        <>
          <div className="att-tools">
            <div className="search">
              <Icon name="search" size={17} className="search-icon" />
              <label htmlFor="att-search" className="sr-only">Search registrants</label>
              <input
                id="att-search"
                type="search"
                className="input"
                placeholder="Search registrants"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <span className="att-count">
              <strong>{present}</strong> of {registrations.length} present
            </span>
            <button type="button" className="link-btn" onClick={() => setAll("attended")}>
              Mark all present
            </button>
            <button type="button" className="link-btn muted-link" onClick={() => setAll("registered")}>
              Clear
            </button>
          </div>

          <ul className="att-list">
            {visible.length === 0 && <li className="muted att-empty">No one matches “{query}”.</li>}
            {visible.map((r) => (
              <li key={r.id}>
                <label className="att-row">
                  <input type="checkbox" checked={r.status === "attended"} onChange={() => toggle(r.id)} />
                  <span className="att-name">{r.name}</span>
                  <span className={`status ${r.status === "attended" ? "status-approved" : "status-inactive"}`}>
                    {r.status === "attended" ? "Present" : "Absent"}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}

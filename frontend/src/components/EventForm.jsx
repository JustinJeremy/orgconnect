import { useState } from "react";
import Modal from "./Modal.jsx";
import { EVENT_CATEGORIES, EVENT_MODES } from "../data/constants.js";
import { todayIso, isPast } from "../utils/format.js";

const EMPTY = {
  title: "",
  category: EVENT_CATEGORIES[0],
  date: "",
  time: "15:00",
  location: "",
  mode: "F2F",
  capacity: 50,
  description: "",
};

// Create / edit an event
export default function EventForm({ initial, onSave, onCancel }) {
  const [formData, setFormData] = useState(() =>
    initial
      ? {
          title: initial.title,
          category: initial.category,
          date: initial.date,
          time: initial.time,
          location: initial.location,
          mode: initial.mode || "F2F",
          capacity: initial.capacity,
          description: initial.description || "",
        }
      : EMPTY
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const registered = initial?.registrations?.length || 0;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  // Same rules the Laravel Form Request should enforce
  const validate = () => {
    const found = {};
    if (!formData.title.trim()) found.title = "Title is required.";
    if (!formData.date) found.date = "Pick a date.";
    else if (!formData.time) found.date = "Pick a time.";
    else {
      // Past events can still be edited as long as the schedule is left alone
      const rescheduled = !initial || formData.date !== initial.date || formData.time !== initial.time;
      if (rescheduled && isPast(formData.date, formData.time)) found.date = "Pick a date and time that has not passed yet.";
    }
    if (!formData.location.trim()) found.location = "Location is required.";
    const capacity = Number(formData.capacity);
    if (!(capacity >= 1)) found.capacity = "Capacity must be at least 1.";
    else if (capacity < registered) found.capacity = `${registered} people have already registered.`;
    return found;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    await onSave({
      ...formData,
      title: formData.title.trim(),
      location: formData.location.trim(),
      description: formData.description.trim(),
      capacity: Number(formData.capacity),
    });
    setSaving(false);
  };

  const fieldClass = (name) => `input ${errors[name] ? "input-error" : ""}`;

  return (
    <Modal
      title={initial ? "Edit event" : "New event"}
      subtitle={initial ? `${registered} ${registered === 1 ? "person has" : "people have"} registered` : "Members are notified when you publish."}
      onClose={onCancel}
      onSubmit={handleSubmit}
      footer={
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : initial ? "Update event" : "Publish event"}
          </button>
        </div>
      }
    >
      <div className="form-grid">
        <div className="field span-2">
          <label htmlFor="ev-title">Title</label>
          <input id="ev-title" className={fieldClass("title")} name="title" value={formData.title} onChange={handleChange} />
          {errors.title && <span className="field-error">{errors.title}</span>}
        </div>

        <div className="field">
          <label htmlFor="ev-category">Category</label>
          <select id="ev-category" className="input" name="category" value={formData.category} onChange={handleChange}>
            {EVENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="ev-capacity">Capacity</label>
          <input id="ev-capacity" type="number" min="1" className={fieldClass("capacity")} name="capacity" value={formData.capacity} onChange={handleChange} />
          {errors.capacity && <span className="field-error">{errors.capacity}</span>}
        </div>

        <div className="field">
          <label htmlFor="ev-date">Date</label>
          <input id="ev-date" type="date" min={initial ? undefined : todayIso()} className={fieldClass("date")} name="date" value={formData.date} onChange={handleChange} />
          {errors.date && <span className="field-error">{errors.date}</span>}
        </div>

        <div className="field">
          <label htmlFor="ev-time">Time</label>
          <input id="ev-time" type="time" className="input" name="time" value={formData.time} onChange={handleChange} />
        </div>

        <div className="field">
          <label htmlFor="ev-location">Location</label>
          <input
            id="ev-location"
            className={fieldClass("location")}
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder={formData.mode === "Online" ? "Zoom or Google Meet link" : formData.mode === "Hybrid" ? "Room + meeting link" : "Room or venue"}
          />
          {errors.location && <span className="field-error">{errors.location}</span>}
        </div>

        <div className="field">
          <label htmlFor="ev-mode">Format</label>
          <select id="ev-mode" className="input" name="mode" value={formData.mode} onChange={handleChange}>
            {Object.entries(EVENT_MODES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="field span-2">
          <label htmlFor="ev-description">
            Description <span className="optional">Optional</span>
          </label>
          <textarea id="ev-description" className="input" rows="3" name="description" value={formData.description} onChange={handleChange} />
        </div>
      </div>
    </Modal>
  );
}

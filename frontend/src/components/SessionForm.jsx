import { useState } from "react";
import Modal from "./Modal.jsx";
import LocationPicker, { locationForMode, locationProblem } from "./LocationPicker.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import { EVENT_MODES } from "../data/constants.js";
import { isPast, splitTopics, todayIso } from "../utils/format.js";
import { textProblem } from "../utils/validation.js";

// A tutoring session meets once, on the date and time picked here
const EMPTY = { subject: "", area: "", date: "", time: "15:00", mode: "F2F", location: "", slots: 3, description: "", topics: "" };

export default function SessionForm({ initial, onSave, onCancel }) {
  const { current: org } = useOrg();
  // The org's own areas, plus a session's old area if the org has since changed its list
  const areas = initial && !org.tutoringAreas.includes(initial.area) ? [...org.tutoringAreas, initial.area] : org.tutoringAreas;
  const [formData, setFormData] = useState(() =>
    initial
      ? {
          subject: initial.subject,
          area: initial.area,
          date: initial.date || "",
          time: initial.time || "15:00",
          mode: initial.mode || "F2F",
          location: initial.location,
          slots: initial.slots,
          description: initial.description || "",
          topics: (initial.topics || []).join(", "),
        }
      : { ...EMPTY, area: areas[0] }
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // A new format keeps the part of the location that still fits (e.g. the room when Hybrid becomes F2F)
    const location = name === "mode" ? locationForMode(formData.location, formData.mode, value) : formData.location;
    setFormData({ ...formData, location, [name]: value });
    setErrors({ ...errors, [name]: undefined, ...(name === "mode" ? { location: undefined } : {}) });
  };

  const setLocation = (location) => {
    setFormData({ ...formData, location });
    setErrors({ ...errors, location: undefined });
  };

  // Same rules the server checks (it also refuses a repeated subject that day or a room already in use)
  const validate = () => {
    const found = {};
    const add = (key, problem) => problem && !found[key] && (found[key] = problem);
    add("subject", !formData.subject.trim() ? "Subject is required." : textProblem("words", formData.subject, "Subject"));
    if (!formData.date || !formData.time) add("date", "Pick a date and time.");
    else {
      // An older session can still be edited as long as it isn't moved
      const moved = !initial || formData.date !== initial.date || formData.time !== initial.time;
      if (moved && isPast(formData.date, formData.time)) add("date", "Pick a date and time that has not passed yet.");
    }
    add("location", locationProblem(formData.location, formData.mode) || textProblem("words", formData.location, "Location"));
    add("description", textProblem("words", formData.description, "Description"));
    add("topics", splitTopics(formData.topics).map((t) => textProblem("words", t, "A topic")).find(Boolean));
    return found;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    await onSave({
      ...formData,
      subject: formData.subject.trim(),
      location: formData.location.trim(),
      description: formData.description.trim(),
      topics: splitTopics(formData.topics),
      slots: Math.max(1, Number(formData.slots) || 1),
    });
    setSaving(false);
  };

  const fieldClass = (name) => `input ${errors[name] ? "input-error" : ""}`;
  const error = (name) => errors[name] && <span className="field-error">{errors[name]}</span>;

  return (
    <Modal
      title={initial ? "Edit tutoring session" : "Post a tutoring session"}
      subtitle={initial ? null : "Members can request a slot once it's posted."}
      onClose={onCancel}
      onSubmit={handleSubmit}
      footer={
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : initial ? "Update session" : "Post session"}
          </button>
        </div>
      }
    >
      <div className="form-grid">
        <div className="field span-2">
          <label htmlFor="ts-subject">Subject / topic</label>
          <input id="ts-subject" className={fieldClass("subject")} name="subject" value={formData.subject} onChange={handleChange} />
          {error("subject")}
        </div>
        <div className="field">
          <label htmlFor="ts-area">Area</label>
          <select id="ts-area" className="input" name="area" value={formData.area} onChange={handleChange}>
            {areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ts-slots">Open slots</label>
          <input id="ts-slots" type="number" min="1" max="100" className="input" name="slots" value={formData.slots} onChange={handleChange} />
        </div>
        <div className="field">
          <label htmlFor="ts-date">Date</label>
          <input id="ts-date" type="date" min={initial ? undefined : todayIso()} className={fieldClass("date")} name="date" value={formData.date} onChange={handleChange} />
          {error("date")}
        </div>
        <div className="field">
          <label htmlFor="ts-time">Time</label>
          <input id="ts-time" type="time" className={fieldClass("date")} name="time" value={formData.time} onChange={handleChange} />
        </div>
        <div className="field span-2">
          <label htmlFor="ts-mode">Format</label>
          <select id="ts-mode" className="input" name="mode" value={formData.mode} onChange={handleChange}>
            {Object.entries(EVENT_MODES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <LocationPicker idPrefix="ts" mode={formData.mode} value={formData.location} rooms={org.rooms} onChange={setLocation} error={errors.location} />
        <div className="field span-2">
          <label htmlFor="ts-description">
            Description <span className="optional">Optional</span>
          </label>
          <textarea id="ts-description" className={fieldClass("description")} rows="3" name="description" value={formData.description} onChange={handleChange} />
          {error("description")}
        </div>
        <div className="field span-2">
          <label htmlFor="ts-topics">
            Topics <span className="optional">Optional</span>
          </label>
          <input id="ts-topics" className={fieldClass("topics")} name="topics" value={formData.topics} onChange={handleChange} placeholder="Separate with commas, e.g. Joins, GROUP BY, Analytics" />
          {error("topics")}
        </div>
      </div>
    </Modal>
  );
}

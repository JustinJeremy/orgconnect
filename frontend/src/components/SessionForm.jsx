import { useState } from "react";
import Modal from "./Modal.jsx";
import { useOrg } from "../context/OrgContext.jsx";

const EMPTY = { subject: "", area: "", schedule: "", location: "", slots: 3, description: "" };

export default function SessionForm({ initial, onSave, onCancel }) {
  const { current: org } = useOrg();
  // The org's own areas, plus a session's old area if the org has since changed its list
  const areas = initial && !org.tutoringAreas.includes(initial.area) ? [...org.tutoringAreas, initial.area] : org.tutoringAreas;
  const [formData, setFormData] = useState(() =>
    initial
      ? {
          subject: initial.subject,
          area: initial.area,
          schedule: initial.schedule,
          location: initial.location,
          slots: initial.slots,
          description: initial.description || "",
        }
      : { ...EMPTY, area: areas[0] }
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.schedule.trim() || !formData.location.trim()) {
      setError("Subject, schedule and location are required.");
      return;
    }
    setSaving(true);
    await onSave({
      ...formData,
      subject: formData.subject.trim(),
      schedule: formData.schedule.trim(),
      location: formData.location.trim(),
      description: formData.description.trim(),
      slots: Math.max(1, Number(formData.slots) || 1),
    });
    setSaving(false);
  };

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
          <input id="ts-subject" className="input" name="subject" value={formData.subject} onChange={handleChange} />
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
          <input id="ts-slots" type="number" min="1" className="input" name="slots" value={formData.slots} onChange={handleChange} />
        </div>
        <div className="field">
          <label htmlFor="ts-schedule">Schedule</label>
          <input id="ts-schedule" className="input" name="schedule" value={formData.schedule} onChange={handleChange} placeholder="e.g. Mondays, 3:00 PM" />
        </div>
        <div className="field">
          <label htmlFor="ts-location">Location</label>
          <input id="ts-location" className="input" name="location" value={formData.location} onChange={handleChange} placeholder="Room or meeting link" />
        </div>
        <div className="field span-2">
          <label htmlFor="ts-description">
            Description <span className="optional">Optional</span>
          </label>
          <textarea id="ts-description" className="input" rows="3" name="description" value={formData.description} onChange={handleChange} />
        </div>
      </div>
      {error && <span className="field-error">{error}</span>}
    </Modal>
  );
}

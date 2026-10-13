import { useState } from "react";
import { todayIso } from "../utils/format.js";

const EMPTY = () => ({ activity: "", hours: "", date: todayIso() });

export default function LogHoursForm({ onSubmit }) {
  const [formData, setFormData] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hours = Number(formData.hours);
    if (!formData.activity.trim()) return setError("Describe the activity.");
    if (!formData.date) return setError("Pick the date of the activity.");
    if (formData.date > todayIso()) return setError("You can't log hours for a future date.");
    if (!(hours > 0) || hours > 24) return setError("Hours must be between 0.5 and 24.");

    setSaving(true);
    const ok = await onSubmit({ activity: formData.activity.trim(), hours, date: formData.date });
    setSaving(false);
    if (ok) setFormData(EMPTY());
  };

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="lh-activity">Activity</label>
        <input id="lh-activity" className="input" name="activity" value={formData.activity} onChange={handleChange} />
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="lh-date">Date</label>
          <input id="lh-date" type="date" max={todayIso()} className="input" name="date" value={formData.date} onChange={handleChange} />
        </div>
        <div className="field">
          <label htmlFor="lh-hours">Hours</label>
          <input id="lh-hours" type="number" min="0.5" max="24" step="0.5" className="input" name="hours" value={formData.hours} onChange={handleChange} />
        </div>
      </div>
      {error && <span className="field-error">{error}</span>}
      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? "Submitting…" : "Submit for approval"}
      </button>
      <p className="muted small">An officer verifies each log before it counts toward your total.</p>
    </form>
  );
}

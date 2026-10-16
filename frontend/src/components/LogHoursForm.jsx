import { useMemo, useState } from "react";
import { todayIso } from "../utils/format.js";

const EMPTY = () => ({ choice: "", custom: "", hours: "", date: todayIso() });
const OTHER = "__other";
// Things members often volunteer for
const COMMON = [
  "Event setup and cleanup",
  "Registration desk",
  "Org booth duty",
  "Peer tutoring session",
  "Poster and publicity design",
  "Community outreach",
  "Committee meeting",
];

// events: the org's events; the ones from the last two months (up to today) are offered first,
// and picking one fills in its date
export default function LogHoursForm({ onSubmit, events = [] }) {
  const [formData, setFormData] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const recent = useMemo(() => {
    const today = todayIso();
    const from = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
    return events
      .filter((e) => e.date <= today && e.date >= from)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);
  }, [events]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const next = { ...formData, [name]: value };
    // An event: use its date
    if (name === "choice") {
      const event = recent.find((ev) => `event:${ev.id}` === value);
      if (event) next.date = event.date;
    }
    setFormData(next);
    setError("");
  };

  const activity = (() => {
    if (formData.choice === OTHER) return formData.custom.trim();
    if (formData.choice.startsWith("event:")) return recent.find((ev) => `event:${ev.id}` === formData.choice)?.title || "";
    return formData.choice;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hours = Number(formData.hours);
    if (!activity) return setError(formData.choice === OTHER ? "Describe the activity." : "Pick an activity.");
    if (!formData.date) return setError("Pick the date of the activity.");
    if (formData.date > todayIso()) return setError("You can't log hours for a future date.");
    if (!(hours > 0) || hours > 24) return setError("Hours must be between 0.5 and 24.");

    setSaving(true);
    const ok = await onSubmit({ activity, hours, date: formData.date });
    setSaving(false);
    if (ok) setFormData(EMPTY());
  };

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="lh-activity">Activity</label>
        <select id="lh-activity" className="input select" name="choice" value={formData.choice} onChange={handleChange}>
          <option value="" disabled>Choose an activity</option>
          {recent.length > 0 && (
            <optgroup label="Recent events">
              {recent.map((ev) => <option key={ev.id} value={`event:${ev.id}`}>{ev.title}</option>)}
            </optgroup>
          )}
          <optgroup label="Common activities">
            {COMMON.map((a) => <option key={a} value={a}>{a}</option>)}
          </optgroup>
          <option value={OTHER}>Other (type your own)</option>
        </select>
      </div>
      {formData.choice === OTHER && (
        <div className="field">
          <label htmlFor="lh-custom">What did you do?</label>
          <input id="lh-custom" className="input" name="custom" maxLength={255} placeholder="e.g. Helped set up the hackathon venue" value={formData.custom} onChange={handleChange} autoFocus />
        </div>
      )}
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

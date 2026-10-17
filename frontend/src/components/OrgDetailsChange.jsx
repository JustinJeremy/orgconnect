import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import Modal from "./Modal.jsx";
import { StatusBadge } from "./Badges.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import { orgsApi } from "../api/services.js";
import { errorMessage } from "../api/client.js";
import { shortDate } from "../utils/format.js";
import { ColorPicker } from "./OrgColors.jsx";

// President only (Profile): ask to change the org's details. An OrgConnect admin reviews the
// request (with the reason) before anything changes; the latest request's status shows here.
const FIELDS = [
  { key: "name", label: "Organization name" },
  { key: "shortName", label: "Short name", half: true },
  { key: "college", label: "College", half: true },
  { key: "tagline", label: "Tagline" },
  { key: "description", label: "About the organization", long: true },
  { key: "mission", label: "Mission", long: true },
  { key: "vision", label: "Vision", long: true },
  { key: "adviser", label: "Adviser", half: true },
  { key: "email", label: "Contact email", half: true },
  { key: "office", label: "Office", half: true },
  { key: "meetingSchedule", label: "Meeting schedule", half: true },
  { key: "membershipFee", label: "Membership fee", half: true },
];
export const FIELD_LABELS = { ...Object.fromEntries(FIELDS.map((f) => [f.key, f.label])), courses: "Courses that can join", color: "Color" };

export default function OrgDetailsChange({ flash }) {
  const { current: org } = useOrg();
  const [latest, setLatest] = useState(undefined); // undefined while loading
  const [editing, setEditing] = useState(false);

  const load = () => orgsApi.changeRequest().then((r) => setLatest(r.request)).catch(() => setLatest(null));
  useEffect(() => {
    load();
  }, [org.id]);

  const pending = latest?.status === "Pending";

  return (
    <div className="stack org-change">
      <p className="muted small">
        Changes to {org.shortName}'s name, description, courses and other details are reviewed by an OrgConnect admin before they go live.
      </p>
      {latest && (
        <div className={`org-change-status is-${latest.status.toLowerCase()}`}>
          <div className="org-change-head">
            <StatusBadge status={latest.status === "Pending" ? "Pending" : latest.status} />
            <span className="muted small">
              {latest.status === "Pending" ? `Sent ${shortDate(latest.submittedAt)}, waiting for review` : `Reviewed ${shortDate(latest.reviewedAt)}`}
            </span>
          </div>
          <div className="small">
            {latest.changes.map((c) => FIELD_LABELS[c.field] || c.field).join(", ")}
          </div>
          {latest.status === "Rejected" && latest.reviewNote && <p className="org-change-note">Admin's note: {latest.reviewNote}</p>}
        </div>
      )}
      <button type="button" className="btn btn-outline" onClick={() => setEditing(true)} disabled={latest === undefined || pending}>
        <Icon name="edit" size={16} /> {pending ? "A request is waiting for review" : "Request changes"}
      </button>
      {editing && (
        <ChangeForm
          org={org}
          onClose={() => setEditing(false)}
          onSent={() => {
            setEditing(false);
            flash?.("Change request sent to the OrgConnect admin");
            load();
          }}
        />
      )}
    </div>
  );
}

function ChangeForm({ org, onClose, onSent }) {
  const [form, setForm] = useState(() => Object.fromEntries(FIELDS.map((f) => [f.key, org[f.key] ?? ""])));
  const [courses, setCourses] = useState(org.courses || []);
  const [newCourse, setNewCourse] = useState("");
  const [reason, setReason] = useState("");
  const [themeKey, setThemeKey] = useState(""); // "" keeps the current color
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };
  const addCourse = () => {
    const c = newCourse.trim().toUpperCase();
    if (c && !courses.includes(c)) setCourses([...courses, c]);
    setNewCourse("");
  };

  const submit = async (e) => {
    e.preventDefault();
    // Send only what changed
    const data = {};
    FIELDS.forEach(({ key }) => {
      if ((form[key] || "").trim() !== (org[key] ?? "").toString().trim()) data[key] = form[key].trim();
    });
    if (courses.join(",") !== (org.courses || []).join(",")) data.courses = courses;
    if (themeKey) data.themeKey = themeKey;
    if (!Object.keys(data).length) return setError("Change at least one detail.");
    if (!courses.length) return setError("Keep at least one course.");
    if (!reason.trim()) return setError("Say why the details are changing.");
    setBusy(true);
    try {
      await orgsApi.requestChanges({ ...data, reason: reason.trim() });
      onSent();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Change ${org.shortName}'s details`}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Sending…" : "Send for review"}</button>
        </div>
      }
    >
      <div className="stack">
        <p className="muted small">Edit what should change. Nothing changes until an OrgConnect admin approves it.</p>
        <div className="form-grid">
          {FIELDS.map((f) => (
            <div key={f.key} className={`field ${f.half ? "" : "span-all"}`}>
              <label htmlFor={`oc-${f.key}`}>{f.label}</label>
              {f.long ? (
                <textarea id={`oc-${f.key}`} className="input" rows="3" name={f.key} value={form[f.key]} onChange={change} />
              ) : (
                <input id={`oc-${f.key}`} className="input" name={f.key} value={form[f.key]} onChange={change} />
              )}
            </div>
          ))}
        </div>
        <fieldset className="field course-picker">
          <legend>Courses that can join</legend>
          <div className="course-chips">
            {courses.map((c) => (
              <span key={c} className="course-chip is-on">
                <span className="course-dot" aria-hidden="true" /> {c}
                <button type="button" className="chip-remove" aria-label={`Remove ${c}`} onClick={() => setCourses(courses.filter((x) => x !== c))}>
                  <Icon name="close" size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="course-add">
            <label htmlFor="oc-course" className="sr-only">Add a course</label>
            <input id="oc-course" className="input" placeholder="Add a course, e.g. BSCpE" maxLength={20} value={newCourse} onChange={(e) => setNewCourse(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCourse(); } }} />
            <button type="button" className="btn btn-outline" onClick={addCourse} disabled={!newCourse.trim()}><Icon name="plus" size={16} /> Add</button>
          </div>
        </fieldset>
        <ColorPicker value={themeKey} onChange={(k) => { setThemeKey(k); setError(""); }} current={org.color} label="Color" />
        <div className="field">
          <label htmlFor="oc-reason">Reason for the change <span className="muted">(shown to the admin)</span></label>
          <textarea id="oc-reason" className="input" rows="3" maxLength={1000} placeholder="e.g. The officers voted on a new tagline at the general assembly." value={reason} onChange={(e) => { setReason(e.target.value); setError(""); }} />
        </div>
        {error && <span className="field-error">{error}</span>}
      </div>
    </Modal>
  );
}

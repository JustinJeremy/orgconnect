import { useState } from "react";
import Icon from "../components/Icon.jsx";
import Panel from "../components/Panel.jsx";
import StatRow from "../components/StatRow.jsx";
import { StatusBadge } from "../components/Badges.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import { COURSES, YEAR_LEVELS } from "../data/constants.js";
import { initials, myRegistration } from "../utils/format.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Name, student ID, email, course and year level
function DetailsForm({ user, flash }) {
  const { updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    name: user.name,
    studentId: user.studentId || "",
    email: user.email,
    course: user.course || COURSES[0],
    yearLevel: user.yearLevel || YEAR_LEVELS[0],
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Keep a course that isn't in the list (e.g. typed in by an officer) selectable
  const courses = COURSES.includes(formData.course) ? COURSES : [...COURSES, formData.course];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...formData, name: formData.name.trim(), studentId: formData.studentId.trim(), email: formData.email.trim() };
    if (!data.name || !data.studentId || !data.email) return setError("Name, student ID and email are required.");
    if (!EMAIL.test(data.email)) return setError("Enter a valid email address.");

    setSaving(true);
    const result = await updateProfile(data);
    setSaving(false);
    if (result.ok) flash("Profile updated");
    else setError(result.message);
  };

  return (
    <form className="profile-form" onSubmit={handleSubmit} noValidate>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="form-grid">
        <div className="field span-2">
          <label htmlFor="pf-name">Full name</label>
          <input id="pf-name" className="input" name="name" value={formData.name} onChange={handleChange} autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="pf-id">Student ID</label>
          <input id="pf-id" className="input" name="studentId" value={formData.studentId} onChange={handleChange} />
        </div>
        <div className="field">
          <label htmlFor="pf-email">School email</label>
          <input id="pf-email" type="email" className="input" name="email" value={formData.email} onChange={handleChange} autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="pf-course">Course</label>
          <select id="pf-course" className="input" name="course" value={formData.course} onChange={handleChange}>
            {courses.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pf-year">Year level</label>
          <select id="pf-year" className="input" name="yearLevel" value={formData.yearLevel} onChange={handleChange}>
            {YEAR_LEVELS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

const EMPTY_PASSWORDS = { current: "", password: "", confirm: "" };

function PasswordForm({ flash }) {
  const { changePassword } = useAuth();
  const [formData, setFormData] = useState(EMPTY_PASSWORDS);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.current) return setError("Enter your current password.");
    if (formData.password.length < 8) return setError("Use at least 8 characters for the new password.");
    if (formData.password !== formData.confirm) return setError("New passwords don't match.");

    setSaving(true);
    const result = await changePassword(formData.current, formData.password, formData.confirm);
    setSaving(false);
    if (result.ok) {
      setFormData(EMPTY_PASSWORDS);
      flash("Password changed. Other devices were signed out.");
    } else setError(result.message);
  };

  const type = show ? "text" : "password";

  return (
    <form className="profile-form" onSubmit={handleSubmit} noValidate>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="field">
        <label htmlFor="pw-current">Current password</label>
        <div className="input-with-btn">
          <input id="pw-current" type={type} className="input" name="current" value={formData.current} onChange={handleChange} autoComplete="current-password" />
          <button type="button" className="input-icon-btn" aria-label={show ? "Hide passwords" : "Show passwords"} onClick={() => setShow(!show)}>
            <Icon name={show ? "eyeOff" : "eye"} />
          </button>
        </div>
      </div>
      <div className="field">
        <label htmlFor="pw-new">New password</label>
        <input id="pw-new" type={type} className="input" name="password" value={formData.password} onChange={handleChange} placeholder="At least 8 characters" autoComplete="new-password" />
      </div>
      <div className="field">
        <label htmlFor="pw-confirm">Confirm new password</label>
        <input id="pw-confirm" type={type} className="input" name="confirm" value={formData.confirm} onChange={handleChange} autoComplete="new-password" />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Changing…" : "Change password"}
        </button>
      </div>
    </form>
  );
}

// Every org you joined or applied to, with your role there; switch to it from here
function MyOrganizations() {
  const { memberships } = useAuth();
  const { organizations, current, selectOrg } = useOrg();

  const mine = organizations
    .map((org) => ({ org, m: memberships.find((m) => m.organizationId === org.id) }))
    .filter(({ m }) => m);

  return (
    <ul className="org-list">
      {mine.map(({ org, m }) => (
        <li key={org.id} className={org.slug === current.slug ? "is-current" : ""}>
          <span className="org-swatch" style={{ background: org.theme?.navy }} aria-hidden="true">
            <span style={{ background: org.theme?.highlight }} />
          </span>
          <span className="org-option-text">
            <span className="org-option-name">{org.name}</span>
            <span className="org-option-note">{m.role === "officer" ? `${m.position} · Officer` : "Member"}</span>
          </span>
          {m.status !== "Active" && <StatusBadge status={m.status} />}
          {org.slug === current.slug ? (
            <span className="muted small">Viewing</span>
          ) : (
            m.status !== "Rejected" && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => selectOrg(org.slug)}>
                Switch
              </button>
            )
          )}
        </li>
      ))}
    </ul>
  );
}

export default function Profile({ data, loading, flash }) {
  const { user, logout } = useAuth();
  const { current: org } = useOrg();

  const myLogs = data.hours.filter((h) => h.userId === user.id);
  const approved = myLogs.filter((h) => h.status === "Approved").reduce((s, h) => s + Number(h.hours), 0);
  const attended = data.events.filter((e) => myRegistration(e, user.id)?.status === "attended").length;

  const stats = [
    { label: "Approved hours", value: approved, note: `In ${org.shortName}` },
    { label: "Events attended", value: attended, note: `In ${org.shortName}` },
    { label: "Certificates", value: data.certificates.length, note: "From events you attended" },
  ];

  return (
    <div className="page">
      <Panel>
        <div className="profile-card">
          <span className="avatar">{initials(user.name)}</span>
          <div className="profile-card-text">
            <h2>{user.name}</h2>
            <p>
              {user.role === "officer" ? `${user.position} · Officer` : "Member"} of {org.name} · {user.email}
            </p>
          </div>
          <button type="button" className="btn btn-outline" onClick={() => logout()}>
            <Icon name="logout" size={16} /> Sign out
          </button>
        </div>
      </Panel>

      <StatRow items={stats} loading={loading} />

      <div className="dash-grid">
        <Panel title="Personal details" subtitle="Shown to officers on the member roster" className="span-7">
          <DetailsForm user={user} flash={flash} />
        </Panel>
        <Panel title="Change password" className="span-5">
          <PasswordForm flash={flash} />
        </Panel>
        <Panel title="My organizations" subtitle="One account works for every org you join" className="span-7">
          <MyOrganizations />
        </Panel>
      </div>
    </div>
  );
}

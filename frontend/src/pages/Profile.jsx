import { useState } from "react";
import Icon from "../components/Icon.jsx";
import Panel from "../components/Panel.jsx";
import OrgSwatch from "../components/OrgSwatch.jsx";
import StatRow from "../components/StatRow.jsx";
import { StatusBadge } from "../components/Badges.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import { orgsApi } from "../api/services.js";
import { errorMessage } from "../api/client.js";
import { initials, myRegistration } from "../utils/format.js";

// Name, student ID, email, course and year level: shown locked, members can't edit them here
function LockedField({ id, label, value, wide }) {
  return (
    <div className={`field ${wide ? "span-2" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className="locked-input">
        <input id={id} className="input" value={value || "—"} readOnly aria-readonly="true" tabIndex={-1} />
        <Icon name="lock" size={16} className="locked-icon" />
      </div>
    </div>
  );
}

function DetailsForm({ user }) {
  return (
    <div className="profile-form is-locked">
      <div className="form-grid">
        <LockedField id="pf-name" label="Full name" value={user.name} wide />
        <LockedField id="pf-id" label="Student ID" value={user.studentId} />
        <LockedField id="pf-email" label="School email" value={user.email} />
        <LockedField id="pf-course" label="Course" value={user.course} />
        <LockedField id="pf-year" label="Year level" value={user.yearLevel} />
      </div>
      <p className="locked-note">
        <Icon name="lock" size={14} /> These details are locked. Ask your org admin if something needs to change.
      </p>
    </div>
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

// Officers: upload or remove the selected org's logo (shown in the org dropdown and lists)
function OrgLogoForm({ flash }) {
  const { current: org, reload } = useOrg();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (request, message) => {
    setError("");
    setBusy(true);
    try {
      await request();
      await reload(); // refresh every org dropdown with the new logo
      flash(message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    e.target.value = ""; // lets the same file be picked again
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return setError("The logo must be 2 MB or smaller.");
    run(() => orgsApi.uploadLogo(file), "Logo updated");
  };

  return (
    <div className="org-logo-form">
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="org-logo-row">
        <span className="org-logo-preview">
          {org.logoUrl ? <img src={org.logoUrl} alt={`${org.name} logo`} /> : <Icon name="image" size={28} />}
        </span>
        <div className="org-logo-actions">
          <label className={`btn btn-primary btn-sm ${busy ? "is-disabled" : ""}`}>
            <Icon name="upload" size={15} /> {org.logoUrl ? "Change logo" : "Upload logo"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handleFile} disabled={busy} />
          </label>
          {org.logoUrl && (
            <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => run(orgsApi.removeLogo, "Logo removed")}>
              Remove
            </button>
          )}
          <p className="muted small">PNG, JPG or WebP, up to 2 MB. A square image works best.</p>
        </div>
      </div>
    </div>
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
          <OrgSwatch org={org} />
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

      <StatRow items={stats} loading={loading} className="stat-accent" />

      <div className="dash-grid">
        <Panel title="Personal details" tour="profile-details" subtitle="Shown to officers on the member roster" className="span-7">
          <DetailsForm user={user} />
        </Panel>
        <Panel title="Change password" className="span-5" tour="profile-password">
          <PasswordForm flash={flash} />
        </Panel>
        {user.role === "officer" && (
          <Panel title="Organization logo" subtitle={`Shown for ${org.name} in the organization menu`} className="span-5">
            <OrgLogoForm flash={flash} />
          </Panel>
        )}
        <Panel title="My organizations" tour="profile-orgs" subtitle="One account works for every org you join" className="span-7">
          <MyOrganizations />
        </Panel>
      </div>
    </div>
  );
}

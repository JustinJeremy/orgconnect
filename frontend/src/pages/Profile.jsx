import { useState } from "react";
import Icon from "../components/Icon.jsx";
import Panel from "../components/Panel.jsx";
import OrgSwatch from "../components/OrgSwatch.jsx";
import StatRow from "../components/StatRow.jsx";
import { StatusBadge } from "../components/Badges.jsx";
import { UserAvatar } from "../components/Avatars.jsx";
import AvatarPicker from "../components/AvatarPicker.jsx";
import ProfileHistory from "../components/ProfileHistory.jsx";
import ReasonDialog from "../components/ReasonDialog.jsx";
import OrgDetailsChange from "../components/OrgDetailsChange.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import { orgsApi } from "../api/services.js";
import { errorMessage } from "../api/client.js";
import { COURSES, YEAR_LEVELS } from "../data/constants.js";
import { myRegistration } from "../utils/format.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Name, student ID, email, course and year level. Your own details are yours to keep up to date
// (officers can't change the email of someone who also belongs to another org).
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
function MyOrganizations({ flash }) {
  const { memberships, reloadAccount } = useAuth();
  const { organizations, current, switchOrg } = useOrg();
  const [leaving, setLeaving] = useState(null); // the org being left

  const leave = async (reason) => {
    try {
      await orgsApi.leave(leaving.slug, reason);
      flash?.(`You left ${leaving.name}`);
      await reloadAccount();
      return true;
    } catch (error) {
      flash?.(errorMessage(error), "error");
      return false;
    }
  };

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
              <button type="button" className="btn btn-outline btn-sm" onClick={() => switchOrg(org.slug)}>
                Switch
              </button>
            )
          )}
          {/* The President hands the role over first */}
          {["Active", "Inactive"].includes(m.status) && m.position !== "President" && (
            <button type="button" className="btn btn-outline btn-sm danger-text" onClick={() => setLeaving(org)}>
              Leave
            </button>
          )}
        </li>
      ))}
      {leaving && (
        <ReasonDialog
          title={`Leave ${leaving.name}?`}
          intro="Your past hours, events and certificates stay on record, and you can apply again later. The officers will see your reason."
          label="Why are you leaving?"
          placeholder="e.g. I'm moving to another school next semester."
          confirmLabel="Leave organization"
          onCancel={() => setLeaving(null)}
          onSubmit={leave}
        />
      )}
    </ul>
  );
}

export default function Profile({ data, loading, flash }) {
  const { user, logout, setAvatar } = useAuth();
  const { current: org } = useOrg();
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const [history, setHistory] = useState(null); // null | "hours" | "events" | "certificates"

  // avatar: a character key, or { photo: File }. Errors show in the picker, so it gets the result.
  const saveAvatar = async (avatar) => {
    const result = await setAvatar(avatar);
    if (result.ok) {
      setPickingAvatar(false);
      flash?.("Avatar updated");
    }
    return result;
  };

  const myLogs = data.hours.filter((h) => h.userId === user.id);
  const approved = myLogs.filter((h) => h.status === "Approved").reduce((s, h) => s + Number(h.hours), 0);
  const attended = data.events.filter((e) => myRegistration(e, user.id)?.status === "attended").length;

  const stats = [
    // Your own numbers (the officer dashboard shows the whole org's)
    // Each opens your history for it
    { label: "Your approved hours", value: approved, note: `Your logs in ${org.shortName}`, onClick: () => setHistory("hours"), active: history === "hours" },
    { label: "Events you attended", value: attended, note: `In ${org.shortName}`, onClick: () => setHistory("events"), active: history === "events" },
    { label: "Your certificates", value: data.certificates.length, note: "From events you attended", onClick: () => setHistory("certificates"), active: history === "certificates" },
  ];

  return (
    <div className="page">
      <Panel>
        <div className="profile-card">
          {/* Click the avatar to change it */}
          <button type="button" className="profile-avatar-btn" onClick={() => setPickingAvatar(true)} title="Change avatar">
            <UserAvatar user={user} />
            <span className="profile-avatar-edit" aria-hidden="true"><Icon name="edit" size={13} /></span>
            <span className="sr-only">Change avatar</span>
          </button>
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

      {history ? (
        <ProfileHistory tab={history} onTab={setHistory} onClose={() => setHistory(null)} orgName={org.shortName} flash={flash} />
      ) : (
      <div className="dash-grid">
        <Panel title="Personal details" tour="profile-details" subtitle="Shown to officers on the member roster" className="span-7">
          <DetailsForm user={user} flash={flash} />
        </Panel>
        <Panel title="Change password" className="span-5" tour="profile-password">
          <PasswordForm flash={flash} />
        </Panel>
        {user.role === "officer" && (
          <Panel title="Organization logo" subtitle={`Shown for ${org.name} in the organization menu`} className="span-5">
            <OrgLogoForm flash={flash} />
          </Panel>
        )}
        {user.isPresident && (
          <Panel title="Organization details" subtitle="Name, description, courses and more" className="span-7" tour="profile-org-details">
            <OrgDetailsChange flash={flash} />
          </Panel>
        )}
        {/* Rows of 12 columns: an officer's logo (5) sits beside this (7); the President's logo sits beside
            Organization details, so this takes the whole row (as it does for members) */}
        <Panel
          title="My organizations"
          tour="profile-orgs"
          subtitle="One account works for every org you join"
          className={user.role === "officer" && !user.isPresident ? "span-7" : "span-12"}
        >
          <MyOrganizations flash={flash} />
        </Panel>
      </div>
      )}
      {pickingAvatar && (
        <AvatarPicker user={user} orgName={org.shortName} current={user.avatar} onSave={saveAvatar} onClose={() => setPickingAvatar(false)} />
      )}
    </div>
  );
}

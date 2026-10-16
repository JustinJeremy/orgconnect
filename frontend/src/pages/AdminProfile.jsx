import { useState } from "react";
import Icon from "../components/Icon.jsx";
import Panel from "../components/Panel.jsx";
import AvatarPicker from "../components/AvatarPicker.jsx";
import { UserAvatar } from "../components/Avatars.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { PasswordForm } from "./Profile.jsx";

// The platform admin's own Profile & settings: name, email, password and picture.
// No student details (student ID, course, year): the admin isn't a member of any org.
export default function AdminProfile({ flash }) {
  const { user, logout, updateProfile, setAvatar } = useAuth();
  const [form, setForm] = useState({ name: user.name, email: user.email });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return setError("Name and email are required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError("Enter a valid email address.");
    setSaving(true);
    const result = await updateProfile({ name: form.name.trim(), email: form.email.trim() });
    setSaving(false);
    if (result.ok) flash("Profile updated");
    else setError(result.message);
  };

  const saveAvatar = async (avatar) => {
    const result = await setAvatar(avatar);
    if (result.ok) {
      setPicking(false);
      flash("Avatar updated");
    }
    return result;
  };

  return (
    <>
      <Panel>
        <div className="profile-card">
          <button type="button" className="profile-avatar-btn" onClick={() => setPicking(true)} title="Change avatar">
            <UserAvatar user={user} />
            <span className="profile-avatar-edit" aria-hidden="true"><Icon name="edit" size={13} /></span>
            <span className="sr-only">Change avatar</span>
          </button>
          <div className="profile-card-text">
            <h2>{user.name}</h2>
            <p>Platform admin · {user.email}</p>
          </div>
          <button type="button" className="btn btn-outline" onClick={() => logout()}>
            <Icon name="logout" size={16} /> Sign out
          </button>
        </div>
      </Panel>

      <div className="dash-grid profile-grid">
        <Panel title="Your details" subtitle="Shown to students when you review their requests" className="span-7" tour="admin-profile">
          <form className="stack" onSubmit={save} noValidate>
            <div className="field">
              <label htmlFor="ap-name">Full name</label>
              <input id="ap-name" className="input" value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setError(""); }} />
            </div>
            <div className="field">
              <label htmlFor="ap-email">Email</label>
              <input id="ap-email" type="email" className="input" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(""); }} />
            </div>
            {error && <span className="field-error">{error}</span>}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
            </div>
          </form>
        </Panel>
        <Panel title="Change password" className="span-5">
          <PasswordForm flash={flash} />
        </Panel>
      </div>

      {picking && <AvatarPicker user={user} orgName="OrgConnect" current={user.avatar} onSave={saveAvatar} onClose={() => setPicking(false)} />}
    </>
  );
}

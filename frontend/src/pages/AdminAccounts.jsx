import { Fragment, useEffect, useState } from "react";
import Icon from "../components/Icon.jsx";
import Panel from "../components/Panel.jsx";
import Modal from "../components/Modal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Pagination from "../components/Pagination.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import TemporaryPasswordDialog from "../components/TemporaryPasswordDialog.jsx";
import { UserAvatar } from "../components/Avatars.jsx";
import usePagedList from "../hooks/usePagedList.js";
import { useOrg } from "../context/OrgContext.jsx";
import { adminApi } from "../api/services.js";
import { errorMessage } from "../api/client.js";
import { COURSES, YEAR_LEVELS } from "../data/constants.js";
import { STUDENT_ID, formatStudentId } from "../utils/format.js";
import { keepAllowed, textProblem } from "../utils/validation.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Students can't change their own details while they're locked, so the admin corrects them here
function DetailsDialog({ account, onSaved, onClose }) {
  const [form, setForm] = useState({
    name: account.name,
    email: account.email,
    studentId: account.studentId || "",
    course: account.course || COURSES[0],
    yearLevel: account.yearLevel || YEAR_LEVELS[0],
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const courses = COURSES.includes(form.course) ? COURSES : [...COURSES, form.course];
  const change = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name === "studentId" ? formatStudentId(value) : name === "name" ? keepAllowed("name", value) : value });
    setError("");
  };

  const save = async (e) => {
    e.preventDefault();
    const data = { ...form, name: form.name.trim(), email: form.email.trim(), studentId: form.studentId.trim() };
    if (!data.name || !data.email || !data.studentId) return setError("Name, student ID and email are required.");
    if (data.name !== account.name && textProblem("name", data.name, "Full name")) return setError(textProblem("name", data.name, "Full name"));
    if (data.studentId !== account.studentId && !STUDENT_ID.test(data.studentId)) return setError("Student IDs look like 2025-00142.");
    if (!EMAIL.test(data.email)) return setError("Enter a valid email address.");
    setSaving(true);
    try {
      await adminApi.updateUser(account.id, data);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Edit details"
      subtitle={account.name}
      onClose={onClose}
      onSubmit={save}
      footer={
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save details"}</button>
        </div>
      }
    >
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="form-grid">
        <div className="field span-2">
          <label htmlFor="ad-name">Full name</label>
          <input id="ad-name" className="input" name="name" value={form.name} onChange={change} />
        </div>
        <div className="field">
          <label htmlFor="ad-id">Student ID</label>
          <input id="ad-id" className="input" name="studentId" value={form.studentId} onChange={change} placeholder="2025-00000" inputMode="numeric" maxLength={10} />
        </div>
        <div className="field">
          <label htmlFor="ad-email">School email</label>
          <input id="ad-email" type="email" className="input" name="email" value={form.email} onChange={change} />
        </div>
        <div className="field">
          <label htmlFor="ad-course">Course</label>
          <select id="ad-course" className="input" name="course" value={form.course} onChange={change}>
            {courses.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ad-year">Year level</label>
          <select id="ad-year" className="input" name="yearLevel" value={form.yearLevel} onChange={change}>
            {YEAR_LEVELS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}

// Platform admin: every account, searchable. Forgotten passwords are reset here (only here):
// a temporary password the admin passes on; the person changes it on their Profile.
// Students' details are locked; the admin corrects them here, or opens updates for a new school year.
export default function AdminAccounts({ flash }) {
  const { organizations } = useOrg();
  const [search, setSearch] = useState("");
  const [orgId, setOrgId] = useState(""); // "" = every account; an org: its people, officers first
  const org = organizations.find((o) => String(o.id) === orgId);
  const [resetting, setResetting] = useState(null); // account to confirm
  const [temporary, setTemporary] = useState(null); // { name, email, password }
  const [editing, setEditing] = useState(null); // account whose details are being corrected
  const [detailsOpen, setDetailsOpen] = useState(null); // null until loaded
  const [saved, setSaved] = useState(0); // goes up after an edit, to reload the page
  const list = usePagedList(adminApi.users, { search, org: orgId }, 12, saved);
  // With an org chosen: which group each person is in there, for the section headings
  const groupOf = (u) => {
    const m = u.orgs.find((o) => o.shortName === org?.shortName);
    if (!m) return null;
    if (m.status === "Pending") return "Applicants";
    return m.position === "Member" ? "Members" : "Officers";
  };

  useEffect(() => {
    adminApi.settings().then((s) => setDetailsOpen(s.detailsOpen)).catch(() => {});
  }, []);

  const toggleDetails = async (open) => {
    try {
      const s = await adminApi.saveSettings({ detailsOpen: open });
      setDetailsOpen(s.detailsOpen);
      flash(s.detailsOpen ? "Students can now update their details" : "Students' details are locked again");
    } catch (error) {
      flash(errorMessage(error), "error");
    }
  };

  const reset = async () => {
    const account = resetting;
    setResetting(null);
    try {
      const { temporaryPassword } = await adminApi.resetPassword(account.id);
      setTemporary({ name: account.name, email: account.email, password: temporaryPassword });
    } catch (error) {
      flash(errorMessage(error), "error");
    }
  };

  return (
    <>
      <Panel className="details-switch-panel" tour="admin-details-switch">
        <label className="details-switch">
          <input type="checkbox" checked={!!detailsOpen} disabled={detailsOpen === null} onChange={(e) => toggleDetails(e.target.checked)} />
          <span>
            <span className="strong">Let students update their details</span>
            <span className="muted small">
              {detailsOpen
                ? "Open: students can change their name, student ID, email, course and year on their Profile. Turn this off when the new school year's updates are done."
                : "Locked: students and officers can't change names, student IDs, emails, courses or years. Turn this on at the start of a new school year."}
            </span>
          </span>
        </label>
      </Panel>

      <div className="toolbar" data-tour="admin-accounts-search">
        <div className="search">
          <Icon name="search" size={17} className="search-icon" />
          <label htmlFor="account-search" className="sr-only">Search accounts</label>
          <input id="account-search" type="search" className="input" placeholder="Search by name, email or student ID" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <label htmlFor="account-org" className="sr-only">Organization</label>
        <select id="account-org" className="input select account-org-select" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
          <option value="">All accounts</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </div>

      <Panel title="Accounts" subtitle="Correct someone's details, or reset a forgotten password (they get a temporary one and are signed out everywhere)" className="flush" tour="admin-accounts">
        {!list.loaded ? (
          <div className="skeleton-list padded" aria-hidden="true"><span /><span /><span /></div>
        ) : list.total === 0 ? (
          <EmptyState icon="users" title="No accounts found" text="Try another name or email." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Student ID</th><th>Organizations</th><th><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {list.items.map((u, i) => {
                  const group = org ? groupOf(u) : null;
                  const heading = group && group !== (i > 0 ? groupOf(list.items[i - 1]) : null);
                  return (
                  <Fragment key={u.id}>
                  {heading && (
                    <tr className="account-group">
                      <td colSpan={4}>{group}</td>
                    </tr>
                  )}
                  <tr>
                    <td>
                      <div className="person">
                        <UserAvatar user={u} className="sm" />
                        <div>
                          <div className="strong">{u.name}</div>
                          <div className="muted small">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="muted nowrap">{u.studentId}</td>
                    <td>
                      {u.orgs.length === 0 ? (
                        <span className="muted small">None</span>
                      ) : (
                        <div className="account-orgs">
                          {u.orgs.map((o) => (
                            <span key={o.shortName} className={`account-org is-${o.status.toLowerCase()}`}>
                              {o.shortName} · {o.status === "Active" ? o.position : o.status}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="row-end">
                      <div className="account-actions">
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(u)}>
                          <Icon name="edit" size={15} /> Edit details
                        </button>
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => setResetting(u)}>
                          <Icon name="key" size={15} /> Reset password
                        </button>
                      </div>
                    </td>
                  </tr>
                  </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Pagination page={list.page} totalPages={list.totalPages} onChange={list.setPage} />

      {resetting && (
        <ConfirmDialog
          title="Reset password?"
          message={`${resetting.name} will get a new temporary password and be signed out on all devices.`}
          confirmLabel="Reset password"
          onCancel={() => setResetting(null)}
          onConfirm={reset}
        />
      )}
      {editing && (
        <DetailsDialog
          account={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            flash("Details updated");
            setSaved((n) => n + 1);
          }}
        />
      )}
      {temporary && <TemporaryPasswordDialog {...temporary} isNew={false} onClose={() => setTemporary(null)} />}
    </>
  );
}

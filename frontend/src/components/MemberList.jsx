import { useState } from "react";
import Icon from "./Icon.jsx";
import Modal from "./Modal.jsx";
import EmptyState from "./EmptyState.jsx";
import Pagination from "./Pagination.jsx";
import { StatusBadge } from "./Badges.jsx";
import { POSITIONS } from "../data/constants.js";
import { formatDate, initials } from "../utils/format.js";

const PER_PAGE = 10;
const EMPTY = { name: "", email: "", position: "Member", status: "Active" };

function MemberForm({ member, onSave, onCancel }) {
  const [formData, setFormData] = useState(
    member ? { name: member.name, email: member.email, position: member.position, status: member.status } : EMPTY
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return setError("Name and email are required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return setError("Enter a valid email address.");
    setSaving(true);
    await onSave({ ...formData, name: formData.name.trim(), email: formData.email.trim() });
    setSaving(false);
  };

  return (
    <Modal
      title={member ? "Edit member" : "Add member"}
      onClose={onCancel}
      onSubmit={handleSubmit}
      size="sm"
      footer={
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save member"}
          </button>
        </div>
      }
    >
      <div className="stack">
        <div className="field">
          <label htmlFor="m-name">Full name</label>
          <input id="m-name" className="input" name="name" value={formData.name} onChange={handleChange} />
        </div>
        <div className="field">
          <label htmlFor="m-email">Email</label>
          <input id="m-email" type="email" className="input" name="email" value={formData.email} onChange={handleChange} />
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="m-position">Position</label>
            <select id="m-position" className="input" name="position" value={formData.position} onChange={handleChange}>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="m-status">Status</label>
            <select id="m-status" className="input" name="status" value={formData.status} onChange={handleChange}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
        {error && <span className="field-error">{error}</span>}
      </div>
    </Modal>
  );
}

export default function MemberList({ members, onSave, onRemove }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // null | { member? }

  const query = search.trim().toLowerCase();
  const filtered = members
    .filter((m) => !query || `${m.name} ${m.email} ${m.position}`.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const handleSave = async (values) => {
    const ok = await onSave(form.member?.id, values);
    if (ok) setForm(null);
  };

  return (
    <>
      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={17} className="search-icon" />
          <label htmlFor="member-search" className="sr-only">Search members</label>
          <input
            id="member-search"
            type="search"
            className="input"
            placeholder="Search by name, email or position"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <button type="button" className="btn btn-accent toolbar-cta" onClick={() => setForm({})}>
          <Icon name="plus" size={17} /> Add member
        </button>
      </div>

      <section className="panel flush">
        {filtered.length === 0 ? (
          <EmptyState
            icon="users"
            title={members.length ? "No matching members" : "No members yet"}
            text={members.length ? "Try a different search." : "Approved applications and members you add will appear here."}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Joined</th>
                  <th className="right">Approved hrs</th>
                  <th>Status</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="person">
                        <span className="avatar sm">{initials(m.name)}</span>
                        <div>
                          <div className="strong">{m.name}</div>
                          <div className="muted small">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{m.position}</td>
                    <td className="muted nowrap">{formatDate(m.joinDate)}</td>
                    <td className="right num">{m.approvedHours ?? 0}</td>
                    <td>
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="right">
                      <div className="row-actions">
                        <button type="button" className="icon-btn sm" aria-label={`Edit ${m.name}`} onClick={() => setForm({ member: m })}>
                          <Icon name="edit" size={16} />
                        </button>
                        <button type="button" className="icon-btn sm danger" aria-label={`Remove ${m.name}`} onClick={() => onRemove(m)}>
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />

      {form && <MemberForm member={form.member} onSave={handleSave} onCancel={() => setForm(null)} />}
    </>
  );
}

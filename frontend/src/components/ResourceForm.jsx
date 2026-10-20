import { useState } from "react";
import Modal from "./Modal.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import { RESOURCE_TYPES } from "../data/constants.js";
import { textProblem } from "../utils/validation.js";

const EMPTY = { title: "", subject: "", type: RESOURCE_TYPES[0], url: "", description: "" };

// Share / edit a learning resource (a link to notes, a reviewer, a video...)
export default function ResourceForm({ initial, onSave, onCancel }) {
  const { current: org } = useOrg();
  // The org's own areas, plus a resource's old subject if the org has since changed its list
  const areas = initial && !org.tutoringAreas.includes(initial.subject) ? [...org.tutoringAreas, initial.subject] : org.tutoringAreas;
  const [formData, setFormData] = useState(() =>
    initial
      ? {
          title: initial.title,
          subject: initial.subject,
          type: initial.type,
          url: initial.url,
          description: initial.description || "",
        }
      : { ...EMPTY, subject: areas[0] }
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.url.trim()) {
      setError("Title and link are required.");
      return;
    }
    if (!/^https?:\/\/\S+$/i.test(formData.url.trim())) {
      setError("Enter a full link starting with http:// or https://");
      return;
    }
    const problem = textProblem("words", formData.title, "Title") || textProblem("words", formData.description, "Description");
    if (problem) return setError(problem);
    setSaving(true);
    await onSave({
      ...formData,
      title: formData.title.trim(),
      url: formData.url.trim(),
      description: formData.description.trim(),
    });
    setSaving(false);
  };

  return (
    <Modal
      title={initial ? "Edit resource" : "Share a resource"}
      subtitle={initial ? null : "Paste a link to notes, a reviewer, a video or a shared drive file."}
      onClose={onCancel}
      onSubmit={handleSubmit}
      footer={
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : initial ? "Update resource" : "Share resource"}
          </button>
        </div>
      }
    >
      <div className="form-grid">
        <div className="field span-2">
          <label htmlFor="rs-title">Title</label>
          <input id="rs-title" className="input" name="title" value={formData.title} onChange={handleChange} />
        </div>
        <div className="field">
          <label htmlFor="rs-subject">Subject</label>
          <select id="rs-subject" className="input" name="subject" value={formData.subject} onChange={handleChange}>
            {areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="rs-type">Type</label>
          <select id="rs-type" className="input" name="type" value={formData.type} onChange={handleChange}>
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="field span-2">
          <label htmlFor="rs-url">Link</label>
          <input id="rs-url" type="url" className="input" name="url" value={formData.url} onChange={handleChange} placeholder="https://" />
        </div>
        <div className="field span-2">
          <label htmlFor="rs-description">
            Description <span className="optional">Optional</span>
          </label>
          <textarea id="rs-description" className="input" rows="2" name="description" value={formData.description} onChange={handleChange} />
        </div>
      </div>
      {error && <span className="field-error">{error}</span>}
    </Modal>
  );
}

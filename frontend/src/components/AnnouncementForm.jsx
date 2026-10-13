import { useState } from "react";
import Modal from "./Modal.jsx";
import { ANNOUNCEMENT_CATEGORIES } from "../data/constants.js";

const MAX_LENGTH = 1000;
const EMPTY = { title: "", category: ANNOUNCEMENT_CATEGORIES[0], content: "", pinned: false };

// Create / edit an announcement
export default function AnnouncementForm({ initial, onSave, onCancel }) {
  const [formData, setFormData] = useState(() =>
    initial
      ? { title: initial.title, category: initial.category, content: initial.content, pinned: initial.pinned }
      : EMPTY
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
    setErrors({ ...errors, [name]: undefined });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!formData.title.trim()) found.title = "Add a title.";
    if (!formData.content.trim()) found.content = "Write a message.";
    else if (formData.content.length > MAX_LENGTH) found.content = `Keep it under ${MAX_LENGTH} characters.`;
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    await onSave({ ...formData, title: formData.title.trim(), content: formData.content.trim() });
    setSaving(false);
  };

  const remaining = MAX_LENGTH - formData.content.length;

  return (
    <Modal
      title={initial ? "Edit announcement" : "New announcement"}
      subtitle={initial ? null : "Every member gets a notification."}
      onClose={onCancel}
      onSubmit={handleSubmit}
      footer={
        <>
          <label className="checkbox">
            <input type="checkbox" name="pinned" checked={formData.pinned} onChange={handleChange} />
            Pin to the top
          </label>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : initial ? "Save changes" : "Post announcement"}
            </button>
          </div>
        </>
      }
    >
      <div className="form-grid">
        <div className="field span-2">
          <label htmlFor="an-title">Title</label>
          <input
            id="an-title"
            className={`input ${errors.title ? "input-error" : ""}`}
            name="title"
            value={formData.title}
            onChange={handleChange}
          />
          {errors.title && <span className="field-error">{errors.title}</span>}
        </div>

        <div className="field span-2">
          <label htmlFor="an-category">Category</label>
          <select id="an-category" className="input" name="category" value={formData.category} onChange={handleChange}>
            {ANNOUNCEMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="field span-2">
          <label htmlFor="an-content">Message</label>
          <textarea
            id="an-content"
            className={`input ${errors.content ? "input-error" : ""}`}
            rows="6"
            name="content"
            value={formData.content}
            onChange={handleChange}
          />
          <div className="field-foot">
            {errors.content ? <span className="field-error">{errors.content}</span> : <span />}
            <span className={`char-count ${remaining < 0 ? "over" : ""}`}>{remaining}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

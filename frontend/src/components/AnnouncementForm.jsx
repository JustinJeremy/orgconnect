import { useRef, useState } from "react";
import Modal from "./Modal.jsx";
import Icon from "./Icon.jsx";
import { ATTACH_TYPES, attachmentProblem, fileSize } from "../utils/format.js";
import { ANNOUNCEMENT_CATEGORIES } from "../data/constants.js";

const MAX_LENGTH = 1000;
const EMPTY = { title: "", category: ANNOUNCEMENT_CATEGORIES[0], content: "", pinned: false };

// Create / edit an announcement, with an optional photo or file.
// onSave(form, { file, removeFile }): file is a new attachment; removeFile drops the current one
export default function AnnouncementForm({ initial, onSave, onCancel }) {
  const [formData, setFormData] = useState(() =>
    initial
      ? { title: initial.title, category: initial.category, content: initial.content, pinned: initial.pinned }
      : EMPTY
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);
  const [removeFile, setRemoveFile] = useState(false);
  const fileRef = useRef(null);
  const current = initial?.attachment && !removeFile ? initial.attachment : null;

  const pickFile = (e) => {
    const chosen = e.target.files?.[0];
    e.target.value = "";
    if (!chosen) return;
    const problem = attachmentProblem(chosen);
    setErrors({ ...errors, file: problem || undefined });
    if (!problem) setFile(chosen);
  };

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
    await onSave({ ...formData, title: formData.title.trim(), content: formData.content.trim() }, { file, removeFile });
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

        <div className="field span-2">
          <span className="field-label">Photo or file <span className="muted">(optional)</span></span>
          {file || current ? (
            <div className="msg-attach-chip ann-attach-chip">
              <Icon name={(file ? file.type.startsWith("image/") : current.type === "image") ? "image" : "file"} size={15} />
              <span className="msg-attach-name">{file ? file.name : current.name}</span>
              <span className="muted small">{fileSize(file ? file.size : current.size)}</span>
              <button
                type="button"
                className="icon-btn xs"
                aria-label="Remove the attachment"
                onClick={() => (file ? setFile(null) : setRemoveFile(true))}
              >
                <Icon name="close" size={13} />
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-outline btn-sm ann-attach-btn" onClick={() => fileRef.current?.click()}>
              <Icon name="clip" size={15} /> Attach a photo or file
            </button>
          )}
          <input ref={fileRef} type="file" accept={ATTACH_TYPES} className="sr-only" tabIndex={-1} onChange={pickFile} aria-hidden="true" />
          {errors.file ? <span className="field-error">{errors.file}</span> : <span className="field-hint">PNG or JPG photos show in the post; PDF, Word, Excel, PowerPoint and other files can be downloaded. Up to 10 MB.</span>}
        </div>
      </div>
    </Modal>
  );
}

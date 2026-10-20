import { useState } from "react";
import Modal from "./Modal.jsx";
import { textProblem } from "../utils/validation.js";

// Asks for a short reason before something happens (leaving an org, cancelling a request...).
// onSubmit(reason) returns true when it worked (the dialog closes) or false (it stays open).
// optional: the text may be left empty (e.g. a note when reactivating an org)
export default function ReasonDialog({ title, intro, label, placeholder, confirmLabel, danger = true, optional = false, onCancel, onSubmit }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!optional && !reason.trim()) return setError("Please give a reason.");
    if (textProblem("words", reason, "The reason")) return setError(textProblem("words", reason, "The reason"));
    setBusy(true);
    const ok = await onSubmit(reason.trim());
    setBusy(false);
    if (ok) onCancel();
  };

  return (
    <Modal
      title={title}
      onClose={onCancel}
      onSubmit={submit}
      size="sm"
      footer={
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button type="submit" className={`btn ${danger ? "btn-danger" : "btn-primary"}`} disabled={busy}>
            {busy ? "Sending…" : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="stack">
        {intro && <p className="muted">{intro}</p>}
        <div className="field">
          <label htmlFor="reason-text">{label}</label>
          <textarea
            id="reason-text"
            className="input"
            rows="3"
            maxLength={500}
            placeholder={placeholder}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError("");
            }}
            autoFocus
          />
          {error && <span className="field-error">{error}</span>}
        </div>
      </div>
    </Modal>
  );
}

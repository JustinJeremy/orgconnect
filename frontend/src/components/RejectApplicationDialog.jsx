import { useState } from "react";
import Modal from "./Modal.jsx";

// Asks the officer why an application is rejected; the applicant sees the reason on their screen
export default function RejectApplicationDialog({ applicant, onCancel, onReject }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!reason.trim()) return setError("Give the applicant a reason.");
    onReject(reason.trim());
  };

  return (
    <Modal
      title={`Reject ${applicant.name}?`}
      onClose={onCancel}
      onSubmit={submit}
      size="sm"
      footer={
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-danger">Reject application</button>
        </div>
      }
    >
      <div className="stack">
        {applicant.message && (
          <div className="join-sent-note">
            <div className="muted small">Their message</div>
            <p>"{applicant.message}"</p>
          </div>
        )}
        <div className="field">
          <label htmlFor="reject-reason">
            Reason <span className="muted">(shown to {applicant.name.split(" ")[0]})</span>
          </label>
          <textarea
            id="reject-reason"
            className="input"
            rows="3"
            maxLength={500}
            placeholder="e.g. We're only open to CCS students this semester."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError("");
            }}
          />
          {error && <span className="field-error">{error}</span>}
          <span className="muted small">They can apply again after reading it.</span>
        </div>
      </div>
    </Modal>
  );
}

import { useState } from "react";
import Icon from "./Icon.jsx";
import Modal from "./Modal.jsx";

// Shows a temporary password once (after adding a new member or resetting a password).
// It isn't stored anywhere the officer can see it again.
export default function TemporaryPasswordDialog({ name, email, password, isNew, onClose }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal
      title={isNew ? `${name} was added` : `Password reset for ${name}`}
      subtitle="Share this temporary password with them privately. It won't be shown again."
      onClose={onClose}
      size="sm"
      footer={
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      }
    >
      <div className="stack">
        <div className="temp-password">
          <code>{password}</code>
          <button type="button" className="btn btn-outline btn-sm" onClick={copy}>
            <Icon name={copied ? "check" : "copy"} size={15} /> {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="muted small">
          They sign in with <strong>{email}</strong> and this password, then set their own on the Profile page.
          {!isNew && " They were signed out on all devices."}
        </p>
      </div>
    </Modal>
  );
}

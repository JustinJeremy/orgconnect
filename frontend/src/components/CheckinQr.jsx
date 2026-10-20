import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import Modal from "./Modal.jsx";
import Icon from "./Icon.jsx";
import { UserAvatar } from "./Avatars.jsx";
import { errorMessage } from "../api/client.js";
import { eventsApi, tutoringApi } from "../api/services.js";
import { formatTime } from "../utils/format.js";

// The check-in QR code for an event (officers) or a tutoring session (its tutor and officers).
// Show it at the venue: members scan it with their phone camera, which opens OrgConnect and marks them
// present. Nothing is typed in when creating the event or session: the code is made the first time
// this opens. "New code" makes the old QR stop working (e.g. if a photo of it was shared).
// Who has checked in updates every few seconds.
export default function CheckinQr({ type, item, onClose }) {
  const api = type === "event" ? eventsApi : tutoringApi;
  const title = type === "event" ? item.title : item.subject;
  const [info, setInfo] = useState(null);
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const link = info && `${window.location.origin}/checkin?type=${type}&id=${item.id}&code=${info.code}`;

  const load = useCallback(async () => {
    try {
      setInfo(await api.checkin(item.id));
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [api, item.id]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!link) return;
    QRCode.toDataURL(link, { width: 640, margin: 1, color: { dark: "#152b54", light: "#ffffff" } }).then(setQr).catch(() => setQr(""));
  }, [link]);

  const newCode = async () => {
    setBusy(true);
    try {
      setInfo(await api.resetCheckin(item.id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: the link is still in the QR code
    }
  };

  // When scanning works
  const when = !info
    ? ""
    : info.open
      ? "Check-in is open. Members scan this with their phone camera."
      : type === "event"
        ? info.closed
        : `Check-in works on the session's day only (${item.schedule}).`;

  return (
    <Modal
      title="Check-in QR"
      subtitle={title}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={newCode} disabled={busy || !info}>
            New code
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </>
      }
    >
      <div className="checkin-qr">
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <div className="checkin-qr-code">
          {qr ? <img src={qr} alt={`Check-in QR code for ${title}`} /> : <span className="checkin-qr-placeholder" aria-hidden="true" />}
        </div>
        <p className={`checkin-qr-when ${info?.open ? "is-open" : ""}`}>
          <Icon name={info?.open ? "check" : "clock"} size={15} /> {when}
        </p>
        {link && (
          <button type="button" className="link-btn small" onClick={copy}>
            <Icon name="copy" size={14} /> {copied ? "Copied" : "Copy the check-in link"}
          </button>
        )}

        <div className="checkin-qr-list">
          <h3>
            Checked in{type === "session" ? " today" : ""} <span className="checkin-count">{info?.checkedIn.length ?? 0}</span>
          </h3>
          {!info ? null : info.checkedIn.length === 0 ? (
            <p className="muted small">No one yet. Names show up here as people scan.</p>
          ) : (
            <ul>
              {info.checkedIn.map((p) => (
                <li key={p.id}>
                  <UserAvatar user={p} className="xs" />
                  <span>{p.name}</span>
                  <time className="muted small" dateTime={p.at}>{formatTime(p.at.slice(11, 16))}</time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

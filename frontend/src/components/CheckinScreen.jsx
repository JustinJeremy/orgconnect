import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { errorMessage } from "../api/client.js";
import { checkinApi } from "../api/services.js";

// Scanning a check-in QR code opens /checkin?type=&id=&code= on the phone. The app keeps it for this
// tab (signing in first is fine), and once you're signed in this screen sends it and shows the result.
const KEY = "orgconnect_checkin";

if (window.location.pathname === "/checkin") {
  const params = new URLSearchParams(window.location.search);
  const scan = { type: params.get("type"), id: Number(params.get("id")), code: params.get("code") };
  try {
    if (scan.type && scan.id && scan.code) sessionStorage.setItem(KEY, JSON.stringify(scan));
  } catch {
    // Storage blocked: the scan can't wait for sign-in
  }
  window.history.replaceState(null, "", "/");
}

export function pendingCheckin() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

export function clearCheckin() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing saved
  }
}

// Signed out: a note over the landing page saying what happens after signing in
export function CheckinPendingNote() {
  return (
    <p className="checkin-pending" role="status">
      <Icon name="qr" size={16} /> Sign in to finish checking in.
    </p>
  );
}

// onDone(slug | null, page | null): open that org's page, or just carry on
export default function CheckinScreen({ scan, onDone }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    checkinApi.scan(scan).then(setResult).catch((err) => setError(errorMessage(err)));
  }, [scan]);

  const page = result?.link?.split("/")[0] || null;

  return (
    <div className="checkin-screen">
      <div className={`checkin-card ${result ? "is-ok" : error ? "is-error" : ""}`} role="status" aria-live="polite">
        {!result && !error ? (
          <>
            <span className="checkin-mark is-busy" aria-hidden="true"><Icon name="qr" size={34} /></span>
            <h1>Checking you in…</h1>
          </>
        ) : result ? (
          <>
            <span className="checkin-mark" aria-hidden="true"><Icon name="check" size={36} /></span>
            <p className="checkin-eyebrow">{result.organization.shortName}</p>
            <h1>{result.title}</h1>
            <p className="checkin-msg">{result.message}</p>
            <button type="button" className="btn btn-primary" onClick={() => onDone(result.organization.slug, page)}>
              Open {result.organization.shortName} <Icon name="arrowRight" size={16} />
            </button>
          </>
        ) : (
          <>
            <span className="checkin-mark" aria-hidden="true"><Icon name="alert" size={34} /></span>
            <h1>Couldn't check you in</h1>
            <p className="checkin-msg">{error}</p>
            <button type="button" className="btn btn-primary" onClick={() => onDone(null, null)}>
              Continue to OrgConnect
            </button>
          </>
        )}
      </div>
    </div>
  );
}

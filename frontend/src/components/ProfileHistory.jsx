import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import Tabs from "./Tabs.jsx";
import Panel from "./Panel.jsx";
import EmptyState from "./EmptyState.jsx";
import { StatusBadge } from "./Badges.jsx";
import { eventsApi, profileApi } from "../api/services.js";
import { errorMessage } from "../api/client.js";
import { shortDate } from "../utils/format.js";

// Profile -> click a stat: your full record in this org, in three tabs
//   hours        every log you submitted, its status and who reviewed it
//   events       every event you signed up for: attended, missed or still to come
//   certificates the ones you earned, each with a download button
const TABS = [
  { key: "hours", label: "Volunteer hours" },
  { key: "events", label: "Events" },
  { key: "certificates", label: "Certificates" },
];
const RESULT = { attended: "Attended", missed: "Missed", going: "Going" };

export default function ProfileHistory({ tab, onTab, onClose, orgName, flash }) {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    profileApi.history().then(setHistory).catch((e) => setError(errorMessage(e)));
  }, []);

  const download = async (cert) => {
    setDownloading(cert.id);
    try {
      const res = await eventsApi.certificate(cert.eventId);
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `certificate-${cert.eventId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      flash?.(errorMessage(e), "error");
    }
    setDownloading(null);
  };

  const approved = history?.hours.filter((h) => h.status === "Approved").reduce((s, h) => s + Number(h.hours), 0) ?? 0;
  const past = history?.events.filter((e) => e.result !== "going") ?? [];
  const attended = past.filter((e) => e.result === "attended").length;
  const counts = history ? { hours: history.hours.length, events: history.events.length, certificates: history.certificates.length } : {};

  const subtitle = {
    hours: `${approved} approved ${approved === 1 ? "hour" : "hours"} in ${orgName}`,
    events: past.length ? `Attended ${attended} of ${past.length} past events you signed up for` : `Events you signed up for in ${orgName}`,
    certificates: `From events you attended in ${orgName}`,
  }[tab];

  return (
    <div className="profile-history" data-tour="profile-history">
      <div className="tab-card history-tabs">
        <Tabs label="History" value={tab} onChange={onTab} items={TABS.map((t) => ({ ...t, count: counts[t.key] }))} />
        <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
          <Icon name="arrowLeft" size={15} /> Back to profile
        </button>
      </div>

      <Panel title={TABS.find((t) => t.key === tab).label} subtitle={history ? subtitle : ""} className="flush">
        {error ? (
          <div className="padded"><div className="alert alert-error" role="alert">{error}</div></div>
        ) : !history ? (
          <div className="skeleton-list padded" aria-hidden="true"><span /><span /><span /></div>
        ) : tab === "hours" ? (
          history.hours.length === 0 ? (
            <EmptyState icon="clock" title="No hours logged yet" text="Log hours on Members & Hours after you volunteer." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Activity</th><th>Date</th><th className="num">Hours</th><th>Status</th><th>Reviewed by</th></tr>
                </thead>
                <tbody>
                  {history.hours.map((h) => (
                    <tr key={h.id}>
                      <td className="strong">{h.activity}</td>
                      <td>{shortDate(h.date)}</td>
                      <td className="num">{h.hours}</td>
                      <td><StatusBadge status={h.status} />{h.status === "Rejected" && h.rejectionReason && <span className="reject-reason">{h.rejectionReason}</span>}</td>
                      <td className="muted">{h.reviewedBy || "Waiting for review"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : tab === "events" ? (
          history.events.length === 0 ? (
            <EmptyState icon="calendar" title="No events yet" text="RSVP to an event on the Events page and it shows up here." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Event</th><th>Date</th><th>Category</th><th>Result</th><th><span className="sr-only">Certificate</span></th></tr>
                </thead>
                <tbody>
                  {history.events.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <div className="strong">{e.title}</div>
                        <div className="muted small">{e.location}</div>
                      </td>
                      <td>{shortDate(e.date)}</td>
                      <td>{e.category}</td>
                      <td><span className={`history-result is-${e.result}`}>{RESULT[e.result]}</span></td>
                      <td className="row-end">{e.hasCertificate && <span className="muted small"><Icon name="award" size={14} /> Certificate</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : history.certificates.length === 0 ? (
          <EmptyState icon="award" title="No certificates yet" text="You get one for every event an officer marks you present at." />
        ) : (
          <ul className="history-certs">
            {history.certificates.map((c) => (
              <li key={c.id}>
                <span className="history-cert-icon"><Icon name="award" size={20} /></span>
                <div className="review-text">
                  <div className="review-name">{c.title}</div>
                  <div className="review-detail">Event on {shortDate(c.date)} · issued {shortDate(c.issuedAt.slice(0, 10))}</div>
                </div>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => download(c)} disabled={downloading === c.id}>
                  <Icon name="download" size={15} /> {downloading === c.id ? "Downloading…" : "Download"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

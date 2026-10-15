import { useState } from "react";
import Tabs from "./Tabs.jsx";
import EmptyState from "./EmptyState.jsx";
import Pagination from "./Pagination.jsx";
import usePagination from "../hooks/usePagination.js";
import { initials, shortDate } from "../utils/format.js";

const TAB_LABELS = {
  hours: "Volunteer hours",
  tutoring: "Tutoring",
  memberships: "Memberships",
};

// Pending items an officer needs to approve or reject.
export default function ApprovalCenter({
  hours = [],
  requests = [],
  sessions = [],
  applications = [],
  onDecideHours,
  onDecideRequest,
  onDecideApplication,
  tabs = ["hours", "tutoring", "memberships"],
  limit,
  userId, // your own hours and requests are reviewed by another officer, so they aren't listed
}) {
  const [tab, setTab] = useState(tabs[0]);
  const [busy, setBusy] = useState(null);

  const rows = {
    hours: hours
      .filter((h) => h.status === "Pending" && h.userId !== userId)
      .map((h) => ({
        id: `h${h.id}`,
        name: h.memberName,
        detail: h.activity,
        meta: `${h.hours} hrs · ${shortDate(h.date)}`,
        decide: (status) => onDecideHours(h, status),
      })),
    tutoring: requests
      .filter((r) => r.status === "Pending" && r.userId !== userId)
      .map((r) => {
        const s = sessions.find((x) => x.id === r.sessionId);
        return {
          id: `t${r.id}`,
          name: r.requesterName,
          detail: s ? `${s.subject} · with ${s.tutorName}` : "Tutoring session",
          meta: r.yearLevel || "",
          decide: (status) => onDecideRequest(r, status === "Approved" ? "Confirmed" : status),
        };
      }),
    memberships: applications
      .filter((a) => a.status === "Pending")
      .map((a) => ({
        id: `m${a.id}`,
        name: a.name,
        detail: `${a.course} · ${a.yearLevel} · ${a.studentId}`,
        meta: `Applied ${shortDate(a.appliedAt)}`,
        decide: (status) => onDecideApplication(a, status),
      })),
  };

  const list = rows[tab];
  const pages = usePagination(list, 10, tab);
  // The dashboard shows only the first few (limit); the full page uses pagination
  const shown = limit ? list.slice(0, limit) : pages.pageItems;

  const decide = async (row, status) => {
    setBusy(row.id);
    await row.decide(status);
    setBusy(null);
  };

  return (
    <div className="review">
      {tabs.length > 1 && (
        <Tabs
          label="Approval type"
          value={tab}
          onChange={setTab}
          items={tabs.map((t) => ({ key: t, label: TAB_LABELS[t], count: rows[t].length }))}
        />
      )}

      {list.length === 0 ? (
        <EmptyState compact title="Nothing to review" text={`New ${TAB_LABELS[tab].toLowerCase()} requests will show up here.`} />
      ) : (
        <ul className="review-list">
          {shown.map((row) => (
            <li key={row.id}>
              <span className="avatar sm">{initials(row.name)}</span>
              <div className="review-text">
                <div className="review-name">
                  {row.name}
                  {row.meta && <span className="review-meta">{row.meta}</span>}
                </div>
                <div className="review-detail">{row.detail}</div>
              </div>
              <div className="review-actions">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={busy === row.id}
                  onClick={() => decide(row, "Rejected")}
                  aria-label={`Reject ${row.name}`}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={busy === row.id}
                  onClick={() => decide(row, "Approved")}
                >
                  Approve
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!limit && <Pagination page={pages.page} totalPages={pages.totalPages} onChange={pages.setPage} />}

      {limit && list.length > limit && (
        <p className="review-more">
          {list.length - limit} more waiting
        </p>
      )}
    </div>
  );
}

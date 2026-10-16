import { useEffect, useState } from "react";
import Icon from "../components/Icon.jsx";
import Tabs from "../components/Tabs.jsx";
import Panel from "../components/Panel.jsx";
import StatRow from "../components/StatRow.jsx";
import EmptyState from "../components/EmptyState.jsx";
import HoursTable from "../components/HoursTable.jsx";
import LogHoursForm from "../components/LogHoursForm.jsx";
import MemberList from "../components/MemberList.jsx";
import ApprovalCenter from "../components/ApprovalCenter.jsx";
import Pagination from "../components/Pagination.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import usePagedList from "../hooks/usePagedList.js";
import useFocusItem from "../hooks/useFocusItem.js";
import { hoursApi, membersApi } from "../api/services.js";
import { errorMessage } from "../api/client.js";
import { shortDate } from "../utils/format.js";
import { UserAvatar } from "../components/Avatars.jsx";

const STATUSES = ["All", "Pending", "Approved", "Rejected"];
const PER_PAGE = 10;
const sumHours = (logs) => logs.reduce((s, h) => s + Number(h.hours), 0);

function StatusSelect({ value, onChange }) {
  return (
    <>
      <label htmlFor="hours-status" className="sr-only">Status</label>
      <select id="hours-status" className="input select" value={value} onChange={(e) => onChange(e.target.value)}>
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s === "All" ? "All statuses" : s}</option>
        ))}
      </select>
    </>
  );
}

// The server builds the CSV, one row per member account (so two people with the same name stay separate)
async function exportCsv(flash) {
  try {
    const res = await membersApi.exportHours();
    const url = URL.createObjectURL(res.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = "volunteer-hours-summary.csv";
    link.click();
    URL.revokeObjectURL(url);
    flash("Exported volunteer-hours-summary.csv");
  } catch (error) {
    flash(errorMessage(error), "error");
  }
}

/* ---------- Officer ---------- */

function OfficerView({ data, loading, hours: hourActions, members: memberActions, flash, focus, onFocusDone }) {
  const { user } = useAuth();
  const { hours, members, applications, reactivations } = data;
  const [tab, setTab] = useState("hours");
  const [status, setStatus] = useState("Pending");
  const [search, setSearch] = useState("");

  const pendingLogs = hours.filter((h) => h.status === "Pending").length;
  const pendingApps = applications.filter((a) => a.status === "Pending").length + reactivations.length;
  const query = search.trim();
  // One page of hour logs from the API; reloads when a log is approved, rejected or deleted
  const list = usePagedList(hoursApi.page, { status, search }, PER_PAGE, hours);

  // From a notification: an application -> the Applications tab; an hour log -> that log
  useEffect(() => {
    if (!focus) return;
    if (focus.kind === "applications") {
      // Only member managers have the Requests tab; other officers stay on Members
      setTab(user.canManageMembers ? "applications" : "members");
      onFocusDone?.();
      return;
    }
    setTab("hours");
    setStatus("All");
    setSearch(focus.search || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key]);
  const highlightId = useFocusItem({ focus, kind: "hour", items: list.items, ready: list.loaded, onDone: onFocusDone });

  return (
    <div className="page">
      <div className="tab-card" data-tour="hours-tabs">
        <Tabs
          label="Section"
          value={tab}
          onChange={setTab}
          items={[
            { key: "hours", label: "Hour Logs", count: pendingLogs },
            { key: "members", label: "Members" },
            ...(user.canManageMembers ? [{ key: "applications", label: "Requests", count: pendingApps }] : []),
          ]}
        />
        <button type="button" className="btn btn-outline toolbar-cta export-btn" data-tour="hours-export" onClick={() => exportCsv(flash)} disabled={!members.length}>
          <Icon name="download" size={16} /> Export summary
        </button>
      </div>

      {tab === "hours" && (
        <div className="toolbar" data-tour="hours-tools">
            <div className="search">
              <Icon name="search" size={17} className="search-icon" />
              <label htmlFor="hours-search" className="sr-only">Search hour logs</label>
              <input
                id="hours-search"
                type="search"
                className="input"
                placeholder="Search by member or activity"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <StatusSelect value={status} onChange={setStatus} />
        </div>
      )}

      {tab === "hours" && (
        <>
          <section className="panel flush">
            {loading || !list.loaded ? (
              <div className="skeleton-list padded" aria-hidden="true"><span /><span /><span /></div>
            ) : list.total === 0 ? (
              <EmptyState
                icon="clock"
                title={status === "Pending" && !query ? "No hours waiting for review" : "No hour logs found"}
                text={status === "Pending" && !query ? "New submissions from members will appear here." : "Try another status or search."}
              />
            ) : (
              <HoursTable rows={list.items} isOfficer userId={user.id} onDecide={hourActions.decide} highlightId={highlightId} />
            )}
          </section>
          <Pagination page={list.page} totalPages={list.totalPages} onChange={list.setPage} />
        </>
      )}

      {tab === "members" && <MemberList members={members} onSave={memberActions.save} onRemove={memberActions.remove} />}

      {tab === "applications" && (
        <Panel title="Membership applications" tour="applications" subtitle="Students who signed up and are waiting to join">
          <ApprovalCenter applications={applications} onDecideApplication={memberActions.decideApplication} tabs={["memberships"]} />
        </Panel>
      )}

      {tab === "applications" && (
        <Panel title="Reactivation requests" tour="reactivations" subtitle="Inactive members asking to be active again">
          <ReactivationList requests={reactivations} onDecide={memberActions.decideReactivation} />
        </Panel>
      )}
    </div>
  );
}

// Inactive members who asked to be active again: their message, and why they were made inactive
function ReactivationList({ requests, onDecide }) {
  const [busy, setBusy] = useState(null);

  if (!requests.length) return <EmptyState compact title="No reactivation requests" text="Inactive members who ask to come back will show up here." />;

  const decide = async (request, status) => {
    setBusy(request.id);
    await onDecide(request, status);
    setBusy(null);
  };

  return (
    <ul className="review-list">
      {requests.map((r) => (
        <li key={r.id} className="reactivation-row">
          <UserAvatar user={r} className="sm" />
          <div className="review-text">
            <div className="review-name">{r.name}</div>
            <div className="reactivation-message">"{r.message}"</div>
            {r.reason && <div className="review-detail">Inactive since {shortDate(r.inactiveAt)}: {r.reason}</div>}
          </div>
          <div className="review-when">
            <strong>Requested</strong>
            <span>{shortDate(r.requestedAt)}</span>
          </div>
          <div className="review-actions">
            <button type="button" className="btn btn-outline btn-sm" disabled={busy === r.id} onClick={() => decide(r, "Declined")} aria-label={`Decline ${r.name}`}>
              Decline
            </button>
            <button type="button" className="btn btn-outline btn-sm btn-approve" disabled={busy === r.id} onClick={() => decide(r, "Approved")}>
              Reactivate
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Member ---------- */

function MemberView({ data, loading, hours: hourActions, focus, onFocusDone }) {
  const { user } = useAuth();
  const [status, setStatus] = useState("All");
  const mine = data.hours.filter((h) => h.userId === user.id);
  // The table loads one page of your logs from the API; the totals above use all of them
  const list = usePagedList(hoursApi.page, { status }, PER_PAGE, data.hours);

  // From a notification: show logs of every status, then scroll to that log and highlight it
  useEffect(() => {
    if (focus) setStatus("All");
  }, [focus?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const highlightId = useFocusItem({ focus, kind: "hour", items: list.items, ready: list.loaded, onDone: onFocusDone });

  const stats = [
    { label: "Approved hours", value: sumHours(mine.filter((h) => h.status === "Approved")), note: "Counted toward your record" },
    { label: "Pending review", value: sumHours(mine.filter((h) => h.status === "Pending")), note: "Hours waiting for an officer" },
    { label: "Logs submitted", value: mine.length, note: `${mine.filter((h) => h.status === "Rejected").length} rejected` },
  ];

  return (
    <div className="page">
      <StatRow items={stats} loading={loading} />

      <div className="dash-grid">
        <Panel title="Log volunteer hours" className="span-4" tour="log-hours">
          <LogHoursForm onSubmit={hourActions.log} events={data.events} />
        </Panel>

        <Panel title="My hour logs" className="span-8 flush-body" tour="my-logs" action={<StatusSelect value={status} onChange={setStatus} />}>
          {loading || !list.loaded ? (
            <div className="skeleton-list padded" aria-hidden="true"><span /><span /><span /></div>
          ) : list.total === 0 ? (
            <EmptyState
              compact
              title={mine.length ? "No logs with this status" : "No hours logged yet"}
              text={mine.length ? null : "Submit your first activity using the form."}
            />
          ) : (
            <>
              <HoursTable rows={list.items} userId={user.id} onDelete={hourActions.remove} highlightId={highlightId} />
              {list.totalPages > 1 && (
                <div className="panel-pagination">
                  <Pagination page={list.page} totalPages={list.totalPages} onChange={list.setPage} />
                </div>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}

export default function VolunteerHours(props) {
  const { user } = useAuth();
  return user.role === "officer" ? <OfficerView {...props} /> : <MemberView {...props} />;
}

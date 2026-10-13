import { useState } from "react";
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
import { hoursApi } from "../api/services.js";

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

function exportCsv(members, hours, flash) {
  const rows = [["Member", "Email", "Position", "Status", "Approved hours", "Pending hours"]];
  members.forEach((m) => {
    const pending = sumHours(hours.filter((h) => h.memberName === m.name && h.status === "Pending"));
    rows.push([m.name, m.email, m.position, m.status, m.approvedHours ?? 0, pending]);
  });
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "volunteer-hours-summary.csv";
  link.click();
  URL.revokeObjectURL(url);
  flash("Exported volunteer-hours-summary.csv");
}

/* ---------- Officer ---------- */

function OfficerView({ data, loading, hours: hourActions, members: memberActions, flash }) {
  const { hours, members, applications } = data;
  const [tab, setTab] = useState("hours");
  const [status, setStatus] = useState("Pending");
  const [search, setSearch] = useState("");

  const pendingLogs = hours.filter((h) => h.status === "Pending").length;
  const pendingApps = applications.filter((a) => a.status === "Pending").length;
  const query = search.trim();
  // One page of hour logs from the API; reloads when a log is approved, rejected or deleted
  const list = usePagedList(hoursApi.page, { status, search }, PER_PAGE, hours);

  return (
    <div className="page">
      <Tabs
        label="Section"
        value={tab}
        onChange={setTab}
        items={[
          { key: "hours", label: "Hour logs", count: pendingLogs },
          { key: "members", label: "Members" },
          { key: "applications", label: "Applications", count: pendingApps },
        ]}
      />

      {tab === "hours" && (
        <>
          <div className="toolbar">
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
            <button type="button" className="btn btn-outline toolbar-cta" onClick={() => exportCsv(members, hours, flash)} disabled={!members.length}>
              <Icon name="download" size={16} /> Export summary
            </button>
          </div>
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
              <HoursTable rows={list.items} isOfficer onDecide={hourActions.decide} />
            )}
          </section>
          <Pagination page={list.page} totalPages={list.totalPages} onChange={list.setPage} />
        </>
      )}

      {tab === "members" && <MemberList members={members} onSave={memberActions.save} onRemove={memberActions.remove} onResetPassword={memberActions.resetPassword} />}

      {tab === "applications" && (
        <Panel title="Membership applications" subtitle="Students who signed up and are waiting to join">
          <ApprovalCenter applications={applications} onDecideApplication={memberActions.decideApplication} tabs={["memberships"]} />
        </Panel>
      )}
    </div>
  );
}

/* ---------- Member ---------- */

function MemberView({ data, loading, hours: hourActions }) {
  const { user } = useAuth();
  const [status, setStatus] = useState("All");
  const mine = data.hours.filter((h) => h.userId === user.id);
  // The table loads one page of your logs from the API; the totals above use all of them
  const list = usePagedList(hoursApi.page, { status }, PER_PAGE, data.hours);

  const stats = [
    { label: "Approved hours", value: sumHours(mine.filter((h) => h.status === "Approved")), note: "Counted toward your record" },
    { label: "Pending review", value: sumHours(mine.filter((h) => h.status === "Pending")), note: "Hours waiting for an officer" },
    { label: "Logs submitted", value: mine.length, note: `${mine.filter((h) => h.status === "Rejected").length} rejected` },
  ];

  return (
    <div className="page">
      <StatRow items={stats} loading={loading} />

      <div className="dash-grid">
        <Panel title="Log volunteer hours" className="span-4">
          <LogHoursForm onSubmit={hourActions.log} />
        </Panel>

        <Panel title="My hour logs" className="span-8 flush-body" action={<StatusSelect value={status} onChange={setStatus} />}>
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
              <HoursTable rows={list.items} userId={user.id} onDelete={hourActions.remove} />
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

import { useState } from "react";
import Icon from "../components/Icon.jsx";
import Tabs from "../components/Tabs.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Pagination from "../components/Pagination.jsx";
import SessionCard from "../components/SessionCard.jsx";
import SessionForm from "../components/SessionForm.jsx";
import ResourceForm from "../components/ResourceForm.jsx";
import { StatusBadge } from "../components/Badges.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import usePagination from "../hooks/usePagination.js";
import { RESOURCE_TYPES } from "../data/constants.js";

const SESSIONS_PER_PAGE = 9;
const ROWS_PER_PAGE = 10;
const RESOURCE_ICONS = { Link: "link", Video: "eye" };

function SearchBox({ id, label, placeholder, value, onChange }) {
  return (
    <div className="search">
      <Icon name="search" size={17} className="search-icon" />
      <label htmlFor={id} className="sr-only">{label}</label>
      <input id={id} type="search" className="input" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function AreaSelect({ id, value, onChange, allLabel = "All areas" }) {
  const { current: org } = useOrg();
  return (
    <>
      <label htmlFor={id} className="sr-only">Subject area</label>
      <select id={id} className="input select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="All">{allLabel}</option>
        {org.tutoringAreas.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
    </>
  );
}

/* ---------- Sessions ---------- */

function SessionsTab({ sessions, requests, loading, actions, onPost, onEdit }) {
  const { user } = useAuth();
  const isOfficer = user.role === "officer";
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("All");

  const query = search.trim().toLowerCase();
  const visible = sessions
    .filter((s) => area === "All" || s.area === area)
    .filter((s) => !query || `${s.subject} ${s.tutorName} ${s.area}`.toLowerCase().includes(query));
  const { pageItems, page, totalPages, setPage } = usePagination(visible, SESSIONS_PER_PAGE, `${query}|${area}`);

  return (
    <>
      <div className="toolbar">
        <SearchBox id="session-search" label="Search tutoring sessions" placeholder="Search by subject or tutor" value={search} onChange={setSearch} />
        <AreaSelect id="session-area" value={area} onChange={setArea} />
        <button type="button" className="btn btn-accent toolbar-cta" onClick={onPost}>
          <Icon name="plus" size={17} /> Post a session
        </button>
      </div>

      {loading ? (
        <div className="card-grid" aria-hidden="true">
          {[0, 1, 2].map((i) => <div key={i} className="session-card skeleton-card" />)}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon="book"
          title={sessions.length ? "No matching sessions" : "No tutoring sessions yet"}
          text={sessions.length ? "Try another subject or area." : "Post a session to start helping other members."}
        />
      ) : (
        <>
          <div className="card-grid">
            {pageItems.map((s) => {
              const isTutor = s.tutorId === user.id;
              return (
                <SessionCard
                  key={s.id}
                  session={s}
                  myRequest={requests.find((r) => r.sessionId === s.id && r.userId === user.id)}
                  canRequest={!isTutor}
                  canManage={isOfficer || isTutor}
                  onRequest={actions.request}
                  onEdit={onEdit}
                  onDelete={actions.removeSession}
                />
              );
            })}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </>
  );
}

/* ---------- Requests ---------- */

// Officers answer every request. Peer tutors answer the requests sent to their own sessions.
function RequestsTab({ sessions, requests, actions }) {
  const { user } = useAuth();
  const isOfficer = user.role === "officer";
  const sessionById = (id) => sessions.find((s) => s.id === id);
  const canAnswer = (r) => r.userId !== user.id && (isOfficer || sessionById(r.sessionId)?.tutorId === user.id);

  const known = requests.filter((r) => sessionById(r.sessionId));
  const received = known.filter(canAnswer);
  const sent = known.filter((r) => r.userId === user.id);
  const isTutor = !isOfficer && received.length > 0;

  const [view, setView] = useState(isTutor ? "received" : "sent");
  const [status, setStatus] = useState("All");
  const shown = isOfficer ? known : isTutor && view === "received" ? received : sent;
  const rows = shown.filter((r) => status === "All" || r.status === status);
  const { pageItems, page, totalPages, setPage } = usePagination(rows, ROWS_PER_PAGE, `${view}|${status}`);
  const showStudent = isOfficer || (isTutor && view === "received");

  return (
    <>
      <div className="toolbar">
        {isTutor && (
          <>
            <label htmlFor="request-view" className="sr-only">Show</label>
            <select id="request-view" className="input select" value={view} onChange={(e) => setView(e.target.value)}>
              <option value="received">Requests for my sessions</option>
              <option value="sent">Requests I sent</option>
            </select>
          </>
        )}
        <label htmlFor="request-status" className="sr-only">Status</label>
        <select id="request-status" className="input select" value={status} onChange={(e) => setStatus(e.target.value)}>
          {["All", "Pending", "Confirmed", "Completed", "Rejected"].map((s) => (
            <option key={s} value={s}>{s === "All" ? "All statuses" : s}</option>
          ))}
        </select>
      </div>

      <section className="panel flush">
        {rows.length === 0 ? (
          <EmptyState
            icon="book"
            title="No tutoring requests"
            text={
              status !== "All"
                ? "Try another status."
                : showStudent
                ? "Requests from members will appear here."
                : "Request a session from the Sessions tab."
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {showStudent && <th>Student</th>}
                  <th>Session</th>
                  <th>Tutor</th>
                  <th>Status</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r) => {
                  const s = sessionById(r.sessionId);
                  return (
                    <tr key={r.id}>
                      {showStudent && (
                        <td>
                          <div className="strong">{r.requesterName}</div>
                          {r.yearLevel && <div className="muted small">{r.yearLevel}</div>}
                        </td>
                      )}
                      <td>
                        <div>{s.subject}</div>
                        <div className="muted small">{s.schedule}</div>
                      </td>
                      <td>{s.tutorName}</td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="right">
                        {canAnswer(r) && (
                          <div className="row-actions">
                            {r.status === "Pending" && (
                              <>
                                <button type="button" className="btn btn-outline btn-sm" onClick={() => actions.decide(r, "Rejected")}>
                                  Reject
                                </button>
                                <button type="button" className="btn btn-primary btn-sm" onClick={() => actions.decide(r, "Confirmed")}>
                                  Approve
                                </button>
                              </>
                            )}
                            {r.status === "Confirmed" && (
                              <button type="button" className="btn btn-outline btn-sm" onClick={() => actions.decide(r, "Completed")}>
                                Mark completed
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </>
  );
}

/* ---------- Resources ---------- */

function ResourcesTab({ resources, loading, actions, onShare, onEdit }) {
  const { user } = useAuth();
  const isOfficer = user.role === "officer";
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All");
  const [type, setType] = useState("All");

  const query = search.trim().toLowerCase();
  const visible = resources
    .filter((r) => subject === "All" || r.subject === subject)
    .filter((r) => type === "All" || r.type === type)
    .filter((r) => !query || `${r.title} ${r.description || ""} ${r.uploadedBy}`.toLowerCase().includes(query));
  const { pageItems, page, totalPages, setPage } = usePagination(visible, ROWS_PER_PAGE, `${query}|${subject}|${type}`);

  return (
    <>
      <div className="toolbar">
        <SearchBox id="resource-search" label="Search resources" placeholder="Search by title or who shared it" value={search} onChange={setSearch} />
        <AreaSelect id="resource-subject" value={subject} onChange={setSubject} allLabel="All subjects" />
        <label htmlFor="resource-type" className="sr-only">Type</label>
        <select id="resource-type" className="input select" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="All">All types</option>
          {RESOURCE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button type="button" className="btn btn-accent toolbar-cta" onClick={onShare}>
          <Icon name="plus" size={17} /> Share a resource
        </button>
      </div>

      <section className="panel flush">
        {loading ? (
          <div className="skeleton-list padded" aria-hidden="true"><span /><span /><span /></div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon="file"
            title={resources.length ? "No matching resources" : "No shared resources"}
            text={resources.length ? "Try another keyword, subject or type." : "Share reviewers, notes and links to help other members study."}
          />
        ) : (
          <ul className="row-list padded">
            {pageItems.map((res) => {
              const canManage = isOfficer || res.uploadedById === user.id;
              return (
                <li key={res.id}>
                  <div className="person">
                    <span className="file-icon">
                      <Icon name={RESOURCE_ICONS[res.type] || "file"} size={18} />
                    </span>
                    <div>
                      <div className="strong">{res.title}</div>
                      <div className="muted small">
                        {res.type} · {res.subject} · Shared by {res.uploadedBy}
                      </div>
                      {res.description && <div className="small">{res.description}</div>}
                    </div>
                  </div>
                  <div className="row-actions">
                    {canManage && (
                      <>
                        <button type="button" className="icon-btn sm" aria-label={`Edit ${res.title}`} onClick={() => onEdit(res)}>
                          <Icon name="edit" size={16} />
                        </button>
                        <button type="button" className="icon-btn sm danger" aria-label={`Delete ${res.title}`} onClick={() => actions.removeResource(res)}>
                          <Icon name="trash" size={16} />
                        </button>
                      </>
                    )}
                    <a className="btn btn-outline btn-sm" href={res.url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </>
  );
}

/* ---------- Page ---------- */

export default function Tutoring({ data, loading, actions }) {
  const { user } = useAuth();
  const isOfficer = user.role === "officer";
  const { sessions, requests, resources } = data;

  const [tab, setTab] = useState("sessions");
  const [sessionForm, setSessionForm] = useState(null); // null | { session? }
  const [resourceForm, setResourceForm] = useState(null); // null | { resource? }

  // Badge = pending requests this user can answer
  const myTutoredIds = new Set(sessions.filter((s) => s.tutorId === user.id).map((s) => s.id));
  const pendingToAnswer = requests.filter(
    (r) => r.status === "Pending" && r.userId !== user.id && (isOfficer || myTutoredIds.has(r.sessionId))
  ).length;

  const saveSession = async (values) => {
    const ok = await actions.saveSession(sessionForm.session?.id, values);
    if (ok) setSessionForm(null);
  };

  const saveResource = async (values) => {
    const ok = await actions.saveResource(resourceForm.resource?.id, values);
    if (ok) setResourceForm(null);
  };

  return (
    <div className="page">
      <Tabs
        label="Section"
        value={tab}
        onChange={setTab}
        items={[
          { key: "sessions", label: "Sessions" },
          { key: "requests", label: "Requests", count: pendingToAnswer },
          { key: "resources", label: "Resources" },
        ]}
      />

      {tab === "sessions" && (
        <SessionsTab
          sessions={sessions}
          requests={requests}
          loading={loading}
          actions={actions}
          onPost={() => setSessionForm({})}
          onEdit={(session) => setSessionForm({ session })}
        />
      )}
      {tab === "requests" && <RequestsTab sessions={sessions} requests={requests} actions={actions} />}
      {tab === "resources" && (
        <ResourcesTab
          resources={resources}
          loading={loading}
          actions={actions}
          onShare={() => setResourceForm({})}
          onEdit={(resource) => setResourceForm({ resource })}
        />
      )}

      {sessionForm && <SessionForm initial={sessionForm.session} onSave={saveSession} onCancel={() => setSessionForm(null)} />}
      {resourceForm && <ResourceForm initial={resourceForm.resource} onSave={saveResource} onCancel={() => setResourceForm(null)} />}
    </div>
  );
}

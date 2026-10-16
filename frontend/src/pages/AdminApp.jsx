import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "../components/Icon.jsx";
import Logo from "../components/Logo.jsx";
import Rings from "../components/Rings.jsx";
import Topbar from "../components/Topbar.jsx";
import StatRow from "../components/StatRow.jsx";
import Panel from "../components/Panel.jsx";
import Modal from "../components/Modal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import Toast from "../components/Toast.jsx";
import Tour from "../components/Tour.jsx";
import { StatusBadge } from "../components/Badges.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { adminApi } from "../api/services.js";
import { errorMessage } from "../api/client.js";
import { ADMIN_TOUR } from "../data/tourSteps.js";
import { initials, shortDate } from "../utils/format.js";

// Platform admin: reviews requests to register new orgs, and can suspend or reactivate orgs.
// Admins don't belong to any org, so this replaces the whole org app.
const PAGES = {
  overview: { label: "Overview", icon: "dashboard", title: "Platform overview", subtitle: "Every organization on OrgConnect" },
  requests: { label: "Org requests", icon: "file", title: "Org requests", subtitle: "New orgs waiting to join OrgConnect" },
  organizations: { label: "Organizations", icon: "layers", title: "Organizations", subtitle: "Approve, suspend or look up any org" },
};
const TOUR_KEY = (id) => `orgconnect_tour_seen_${id}`;

export default function AdminApp() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [details, setDetails] = useState(null); // request shown in the details dialog
  const [rejecting, setRejecting] = useState(null); // request being rejected (asks for a reason)
  const [confirmState, setConfirmState] = useState(null);
  const [toast, setToast] = useState(null);
  const [tourOn, setTourOn] = useState(false);
  const toastTimer = useRef(null);

  const flash = useCallback((message, tone = "default") => {
    setToast({ message, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      setData(await adminApi.overview());
    } catch (error) {
      setLoadError(errorMessage(error));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // First visit: start the admin tour once
  useEffect(() => {
    try {
      if (!localStorage.getItem(TOUR_KEY(user.id))) {
        localStorage.setItem(TOUR_KEY(user.id), "1");
        setTourOn(true);
      }
    } catch {
      /* storage blocked: no auto tour */
    }
  }, [user.id]);

  const run = async (action, message) => {
    try {
      await action();
      await load();
      if (message) flash(message);
      return true;
    } catch (error) {
      flash(errorMessage(error), "error");
      return false;
    }
  };

  const approve = (request, courses) =>
    run(() => adminApi.decide(request.id, "Approved", courses ? { courses } : {}), `${request.shortName} is live. ${request.requestedBy} is its President`);

  const reject = (request, note) => run(() => adminApi.decide(request.id, "Rejected", { note }), `${request.shortName}'s request was rejected`);

  const setStatus = (org, status) =>
    setConfirmState({
      title: status === "Suspended" ? `Suspend ${org.name}?` : `Reactivate ${org.name}?`,
      message:
        status === "Suspended"
          ? "Its members and officers can't use it until you reactivate it, and it's hidden from the org list. Nothing is deleted."
          : "Members and officers can use it again, and it shows in the org list.",
      confirmLabel: status === "Suspended" ? "Suspend" : "Reactivate",
      onConfirm: () => run(() => adminApi.setStatus(org.id, status), `${org.name} is ${status === "Suspended" ? "suspended" : "active again"}`),
    });

  const pending = data?.requests.filter((r) => r.status === "Pending") || [];
  const meta = PAGES[page];
  const notifications = pending.map((r) => ({ id: r.id, message: `${r.requestedBy} asked to register ${r.shortName}`, createdAt: r.submittedAt, isRead: false }));

  const requestsPanel = (all) => (
    <Panel title="Organization requests" subtitle={all ? "Waiting for review, and ones you rejected" : "New orgs waiting to join OrgConnect"} tour="admin-requests">
      <RequestList requests={all ? data.requests : pending} onDetails={setDetails} onApprove={approve} onReject={setRejecting} />
    </Panel>
  );

  const orgsPanel = (
    <Panel title="All organizations" subtitle="Approve, suspend or look up any org" tour="admin-orgs" className="flush">
      <OrgTable orgs={data?.organizations || []} onSetStatus={setStatus} />
    </Panel>
  );

  return (
    <div className="layout admin-layout">
      {menuOpen && <button type="button" className="sidebar-backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <Rings preset="sidebar" />
        <div className="sidebar-brand">
          <Logo
            size={35}
            subtitle={<span className="admin-subtitle">Platform admin</span>}
            onHome={() => {
              setPage("overview");
              setMenuOpen(false);
            }}
          />
        </div>
        <nav className="nav" aria-label="Main" data-tour="admin-nav">
          {Object.entries(PAGES).map(([key, item]) => (
            <button
              key={key}
              type="button"
              className={`nav-item ${page === key ? "active" : ""}`}
              aria-current={page === key ? "page" : undefined}
              onClick={() => {
                setPage(key);
                setMenuOpen(false);
              }}
            >
              <Icon name={item.icon} />
              <span className="nav-label">{item.label}</span>
              {key === "requests" && pending.length > 0 && <span className="nav-count">{pending.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-user-btn" title={user.email}>
            <span className="avatar">{initials(user.name)}</span>
            <span className="sidebar-user-text">
              <span className="sidebar-user-name">{user.name}</span>
              <span className="sidebar-user-role">Platform admin</span>
            </span>
          </div>
          <button type="button" className="icon-btn" aria-label="Sign out" onClick={() => logout()}>
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      <main className="main">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          notifications={notifications}
          onMarkAllRead={() => {}}
          onOpenNotification={() => setPage("requests")}
          onOpenMenu={() => setMenuOpen(true)}
          tourSections={[]}
          onStartTour={() => setTourOn(true)}
        />

        {loadError && (
          <div className="banner banner-error" role="alert">
            <span>{loadError}</span>
            <button type="button" className="btn btn-outline btn-sm" onClick={load}>Try again</button>
          </div>
        )}

        <div className="page">
          {!data ? (
            !loadError && <div className="panel"><div className="skeleton-list" aria-hidden="true"><span /><span /><span /></div></div>
          ) : (
            <>
              {page === "overview" && (
                <>
                  <div data-tour="admin-stats">
                    <StatRow
                      variant="cards"
                      items={[
                        {
                          label: "Organizations",
                          value: data.stats.organizations,
                          note: data.stats.activeOrganizations === data.stats.organizations ? "All active" : `${data.stats.activeOrganizations} active`,
                        },
                        { label: "Org requests", value: data.stats.pendingRequests, note: "Waiting for review" },
                        { label: "Members", value: data.stats.members, note: "Active across all orgs" },
                        { label: "Volunteer hours", value: data.stats.approvedHours, note: "Approved, all orgs" },
                      ]}
                    />
                  </div>
                  {requestsPanel(false)}
                  {orgsPanel}
                </>
              )}
              {page === "requests" && requestsPanel(true)}
              {page === "organizations" && orgsPanel}
            </>
          )}
        </div>
      </main>

      {details && (
        <RequestDetails
          request={details}
          onClose={() => setDetails(null)}
          onApprove={async (courses) => (await approve(details, courses)) && setDetails(null)}
          onReject={() => {
            setRejecting(details);
            setDetails(null);
          }}
        />
      )}
      {rejecting && <RejectDialog request={rejecting} onClose={() => setRejecting(null)} onReject={async (note) => (await reject(rejecting, note)) && setRejecting(null)} />}
      {confirmState && (
        <ConfirmDialog
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          onCancel={() => setConfirmState(null)}
          onConfirm={() => {
            confirmState.onConfirm();
            setConfirmState(null);
          }}
        />
      )}
      {tourOn && <Tour steps={ADMIN_TOUR} page={page} onNavigate={setPage} onClose={() => setTourOn(false)} />}
      <Toast toast={toast} />
    </div>
  );
}

function RequestList({ requests, onDetails, onApprove, onReject }) {
  const [busy, setBusy] = useState(null);
  if (!requests.length) return <EmptyState compact title="No org requests" text="New registration requests will show up here." />;

  const act = async (r, fn) => {
    setBusy(r.id);
    await fn();
    setBusy(null);
  };

  return (
    <ul className="review-list org-requests">
      {requests.map((r) => (
        <li key={r.id}>
          <span className="avatar sm">{initials(r.name)}</span>
          <div className="review-text">
            <div className="review-name">
              {r.name} <span className="review-meta">Submitted {shortDate(r.submittedAt)}</span>
            </div>
            <div className="review-detail">
              {r.college} · Adviser {r.adviser} · Requested by {r.requestedBy}
            </div>
            {r.status === "Rejected" && <div className="review-detail">Rejected {shortDate(r.reviewedAt)}: {r.reviewNote}</div>}
          </div>
          <div className="review-actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => onDetails(r)}>View details</button>
            {r.status === "Pending" ? (
              <>
                <button type="button" className="btn btn-outline btn-sm" disabled={busy === r.id} onClick={() => onReject(r)}>Reject</button>
                <button type="button" className="btn btn-primary btn-sm" disabled={busy === r.id} onClick={() => act(r, () => onApprove(r))}>Approve</button>
              </>
            ) : (
              <StatusBadge status={r.status} />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function OrgTable({ orgs, onSetStatus }) {
  if (!orgs.length) return <EmptyState compact title="No organizations yet" text="Approved orgs will show up here." />;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Organization</th>
            <th>President</th>
            <th className="num">Members</th>
            <th className="num">Events</th>
            <th>Status</th>
            <th><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((o) => (
            <tr key={o.id}>
              <td>
                <div className="strong">{o.name}</div>
                <div className="muted small">{o.college}</div>
              </td>
              <td>{o.president || <span className="muted">None yet</span>}</td>
              <td className="num">{o.members}</td>
              <td className="num">{o.events}</td>
              <td><StatusBadge status={o.status} /></td>
              <td className="row-end">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => onSetStatus(o, o.status === "Suspended" ? "Active" : "Suspended")}>
                  {o.status === "Suspended" ? "Reactivate" : "Suspend"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Everything the requester sent; the admin can fix the course list before approving
function RequestDetails({ request, onClose, onApprove, onReject }) {
  const [courses, setCourses] = useState(request.courses);
  const [newCourse, setNewCourse] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = request.status === "Pending";

  const addCourse = () => {
    const c = newCourse.trim().toUpperCase();
    if (c && !courses.includes(c)) setCourses([...courses, c]);
    setNewCourse("");
  };

  return (
    <Modal
      title={request.name}
      onClose={onClose}
      footer={
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Close</button>
          {pending && (
            <>
              <button type="button" className="btn btn-outline" onClick={onReject}>Reject</button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || !courses.length}
                onClick={async () => {
                  setBusy(true);
                  await onApprove(courses);
                  setBusy(false);
                }}
              >
                Approve
              </button>
            </>
          )}
        </div>
      }
    >
      <div className="stack">
        <p className="muted">{request.tagline}</p>
        <p>{request.description}</p>
        <dl className="join-facts">
          <div><dt>Short name</dt><dd>{request.shortName}</dd></div>
          <div><dt>College</dt><dd>{request.college}</dd></div>
          <div><dt>Adviser</dt><dd>{request.adviser}</dd></div>
          <div><dt>Contact email</dt><dd>{request.email}</dd></div>
          <div><dt>Requested by</dt><dd>{request.requestedBy}<br /><span className="muted small">{request.requestedByEmail}</span></dd></div>
          <div><dt>Submitted</dt><dd>{shortDate(request.submittedAt)}</dd></div>
        </dl>
        <div className="field">
          <span className="label">Proof of recognition</span>
          {request.proofUrl ? (
            <a href={request.proofUrl} target="_blank" rel="noreferrer" className="proof-link"><Icon name="link" size={14} /> {request.proofUrl}</a>
          ) : (
            <span className="muted">None attached</span>
          )}
        </div>
        <fieldset className="field course-picker">
          <legend>Courses that can join{pending && <span className="muted"> (you can edit these before approving)</span>}</legend>
          <div className="course-chips">
            {courses.map((c) => (
              <span key={c} className="course-chip is-on">
                <span className="course-dot" aria-hidden="true" /> {c}
                {pending && (
                  <button type="button" className="chip-remove" aria-label={`Remove ${c}`} onClick={() => setCourses(courses.filter((x) => x !== c))}>
                    <Icon name="close" size={12} />
                  </button>
                )}
              </span>
            ))}
          </div>
          {pending && (
            <div className="course-add">
              <label htmlFor="ad-course" className="sr-only">Add a course</label>
              <input
                id="ad-course"
                className="input"
                placeholder="Add a course, e.g. BSCpE"
                maxLength={20}
                value={newCourse}
                onChange={(e) => setNewCourse(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCourse();
                  }
                }}
              />
              <button type="button" className="btn btn-outline" onClick={addCourse} disabled={!newCourse.trim()}>
                <Icon name="plus" size={16} /> Add
              </button>
            </div>
          )}
        </fieldset>
      </div>
    </Modal>
  );
}

function RejectDialog({ request, onClose, onReject }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!note.trim()) return setError("Give the requester a reason.");
    setBusy(true);
    await onReject(note.trim());
    setBusy(false);
  };

  return (
    <Modal
      title={`Reject ${request.shortName}?`}
      onClose={onClose}
      onSubmit={submit}
      size="sm"
      footer={
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-danger" disabled={busy}>Reject request</button>
        </div>
      }
    >
      <div className="field">
        <label htmlFor="reject-note">Reason <span className="muted">(shown to {request.requestedBy})</span></label>
        <textarea
          id="reject-note"
          className="input"
          rows="3"
          maxLength={500}
          placeholder="e.g. Attach the OSA recognition letter, then send the request again."
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setError("");
          }}
        />
        {error && <span className="field-error">{error}</span>}
      </div>
    </Modal>
  );
}

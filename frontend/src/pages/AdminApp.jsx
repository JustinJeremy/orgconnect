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
import useUrlPage, { isPlainClick, pagePath } from "../hooks/useUrlPage.js";
import { adminApi, messagesApi } from "../api/services.js";
import { errorMessage } from "../api/client.js";
import { ADMIN_TOUR } from "../data/tourSteps.js";
import AdminAccounts from "./AdminAccounts.jsx";
import AdminProfile from "./AdminProfile.jsx";
import AdminAnnouncements from "./AdminAnnouncements.jsx";
import Messages from "../components/Messages.jsx";
import { ColorTag } from "../components/OrgColors.jsx";
import { UserAvatar } from "../components/Avatars.jsx";
import { shortDate } from "../utils/format.js";
import ReasonDialog from "../components/ReasonDialog.jsx";
import { FIELD_LABELS } from "../components/OrgDetailsChange.jsx";

// A detail's value for the before/after table
const show = (v) =>
  v && typeof v === "object" && !Array.isArray(v) && v.color ? <ColorTag color={v} /> : Array.isArray(v) ? v.join(", ") : v || "(empty)";


// Platform admin: reviews requests to register new orgs, and can suspend or reactivate orgs.
// Admins don't belong to any org, so this replaces the whole org app.
const PAGES = {
  overview: { label: "Overview", icon: "dashboard", title: "Platform overview", subtitle: "Every organization on OrgConnect" },
  requests: { label: "Org requests", icon: "file", title: "Org requests", subtitle: "New orgs waiting to join OrgConnect" },
  organizations: { label: "Organizations", icon: "layers", title: "Organizations", subtitle: "Approve, suspend or look up any org" },
  accounts: { label: "Accounts", icon: "users", title: "Accounts", subtitle: "Look up anyone, correct details, reset a forgotten password" },
  announcements: { label: "Announcements", icon: "megaphone", title: "Announcements", subtitle: "Send updates to presidents, officers, members or everyone" },
  messages: { label: "Messages", icon: "mail", title: "Messages", subtitle: "Talk with org officers and people registering an org" },
  // Opened from your name at the bottom of the sidebar, not the menu
  profile: { label: "Profile", icon: "users", title: "Profile & settings", subtitle: "Your admin account", hidden: true },
};
const TOUR_KEY = (id) => `orgconnect_tour_seen_${id}`;

export default function AdminApp() {
  const { user, logout } = useAuth();
  // /admin/overview, /admin/requests, /admin/organizations
  const [page, setPage] = useUrlPage(Object.keys(PAGES), "overview", "/admin");
  const go = (e, key) => {
    if (!isPlainClick(e)) return; // Ctrl/middle-click: new tab
    e.preventDefault();
    setPage(key);
    setMenuOpen(false);
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [details, setDetails] = useState(null); // request shown in the details dialog
  const [rejectingChange, setRejectingChange] = useState(null); // org detail change being rejected
  const [rejecting, setRejecting] = useState(null); // request being rejected (asks for a reason)
  const [approving, setApproving] = useState(null); // { request, courses } being approved (optional message)
  const [statusChange, setStatusChange] = useState(null); // { org, status }: suspending (reason) or reactivating (note)
  const [viewing, setViewing] = useState(null); // org shown in the "View" pop-up
  const [askingChanges, setAskingChanges] = useState(null); // org request the admin is sending back for changes
  const [openConversation, setOpenConversation] = useState(null); // conversation to open on the Messages page
  const [unreadMessages, setUnreadMessages] = useState(0);
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

  // Unread messages, for the menu badge (checked every 30 seconds)
  const loadUnread = useCallback(() => {
    messagesApi.unread().then((r) => setUnreadMessages(r.count)).catch(() => {});
  }, []);
  useEffect(() => {
    loadUnread();
    const timer = setInterval(loadUnread, 30000);
    return () => clearInterval(timer);
  }, [loadUnread]);

  // Open (or start) a conversation and go to Messages
  const openMessages = async (start) => {
    try {
      const conversation = await start();
      setOpenConversation(conversation.id);
      setPage("messages");
      setViewing(null);
      setDetails(null);
    } catch (error) {
      flash(errorMessage(error), "error");
    }
  };

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

  const approve = (request, courses, note) =>
    run(
      () => adminApi.decide(request.id, "Approved", { ...(courses ? { courses } : {}), note }),
      `${request.shortName} is live. ${request.requestedBy} is its President and was emailed the details`
    );

  const reject = (request, note) => run(() => adminApi.decide(request.id, "Rejected", { note }), `${request.shortName}'s request was rejected`);

  // Suspending asks for a reason (its officers are told); reactivating takes an optional note
  const setStatus = (org, status) => setStatusChange({ org, status });

  const pending = data?.requests.filter((r) => r.status === "Pending") || [];
  const meta = PAGES[page];
  const waiting = data?.repliesWaiting || 0; // org replies to your announcements, not answered yet
  const notifications = [
    ...pending.map((r) => ({ id: r.id, message: `${r.requestedBy} asked to register ${r.shortName}`, createdAt: r.submittedAt, isRead: false, page: "requests" })),
    ...(waiting ? [{ id: "replies", message: `${waiting} ${waiting === 1 ? "organization replied" : "organizations replied"} to your announcements`, createdAt: new Date().toISOString(), isRead: false, page: "announcements" }] : []),
  ];

  const requestsPanel = (all) => (
    <Panel title="Organization requests" subtitle={all ? "Waiting for review, and ones you rejected" : "New orgs waiting to join OrgConnect"} tour="admin-requests">
      <RequestList requests={all ? data.requests : pending} onDetails={setDetails} onApprove={(r) => setApproving({ request: r })} onReject={setRejecting} onAskChanges={setAskingChanges} />
    </Panel>
  );

  // Presidents asking to change their org's details: current vs new, and their reason
  const changesPanel = data?.changeRequests?.length > 0 && (
    <Panel title="Organization detail changes" subtitle="Presidents asking to change their org's details" tour="admin-changes">
      <ul className="change-list">
        {data.changeRequests.map((c) => (
          <li key={c.id}>
            <div className="change-head">
              <div>
                <div className="review-name">{c.organization.name}</div>
                <div className="review-detail">Requested by {c.requestedBy} (President) · {shortDate(c.submittedAt)}</div>
              </div>
              <div className="review-actions">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setRejectingChange(c)}>Reject</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => run(() => adminApi.decideChange(c.id, "Approved"), `${c.organization.shortName}'s new details are live`)}>
                  Approve
                </button>
              </div>
            </div>
            <p className="change-reason"><strong>Reason:</strong> {c.reason}</p>
            <table className="table change-table">
              <thead><tr><th>Detail</th><th>Now</th><th>Changes to</th></tr></thead>
              <tbody>
                {c.changes.map((ch) => (
                  <tr key={ch.field}>
                    <td className="strong">{FIELD_LABELS[ch.field] || ch.field}</td>
                    <td className="muted">{show(ch.from)}</td>
                    <td className="change-new">{show(ch.to)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </li>
        ))}
      </ul>
    </Panel>
  );

  const orgsPanel = (
    <Panel title="All organizations" subtitle="Approve, suspend or look up any org" tour="admin-orgs" className="flush">
      <OrgTable orgs={data?.organizations || []} onSetStatus={setStatus} onView={setViewing} />
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
            homeHref={pagePath("overview", "/admin")}
            onHome={() => {
              setPage("overview");
              setMenuOpen(false);
            }}
          />
        </div>
        <nav className="nav" aria-label="Main" data-tour="admin-nav">
          {Object.entries(PAGES).filter(([, item]) => !item.hidden).map(([key, item]) => (
            <a
              key={key}
              href={pagePath(key, "/admin")}
              className={`nav-item ${page === key ? "active" : ""}`}
              aria-current={page === key ? "page" : undefined}
              onClick={(e) => go(e, key)}
            >
              <Icon name={item.icon} />
              <span className="nav-label">{item.label}</span>
              {key === "requests" && pending.length > 0 && <span className="nav-count">{pending.length}</span>}
              {key === "announcements" && waiting > 0 && <span className="nav-count">{waiting}</span>}
              {key === "messages" && unreadMessages > 0 && <span className="nav-count">{unreadMessages > 9 ? "9+" : unreadMessages}</span>}
            </a>
          ))}
        </nav>
        <div className="sidebar-user">
          <a
            href={pagePath("profile", "/admin")}
            className={`sidebar-user-btn ${page === "profile" ? "active" : ""}`}
            onClick={(e) => go(e, "profile")}
            aria-current={page === "profile" ? "page" : undefined}
            title="Profile & settings"
          >
            <UserAvatar user={user} />
            <span className="sidebar-user-text">
              <span className="sidebar-user-name">{user.name}</span>
              <span className="sidebar-user-role">Platform admin</span>
            </span>
          </a>
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
          onOpenNotification={(n) => setPage(n.page || "requests")}
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
          {/* These two don't need the overview data */}
          {page === "accounts" ? (
            <AdminAccounts flash={flash} />
          ) : page === "profile" ? (
            <AdminProfile flash={flash} />
          ) : page === "messages" ? (
            <Messages
              openId={openConversation}
              onOpenedId={() => setOpenConversation(null)}
              onUnread={loadUnread}
              newOptions={async (search) =>
                (data?.organizations || [])
                  .filter((o) => o.status === "Active" && o.name.toLowerCase().includes(search.toLowerCase()))
                  .map((o) => ({ key: `o${o.id}`, label: o.name, sub: "Its officers", who: { name: o.name }, open: () => messagesApi.org(o.id) }))
              }
              emptyText="Message an org's officers, or ask someone registering an org for changes."
            />
          ) : page === "announcements" ? (
            <AdminAnnouncements flash={flash} organizations={data?.organizations || []} onChanged={load} />
          ) : !data ? (
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
                  {changesPanel}
                  {orgsPanel}
                </>
              )}
              {page === "requests" && (
                <>
                  {requestsPanel(true)}
                  {changesPanel}
                </>
              )}
              {page === "organizations" && orgsPanel}
            </>
          )}
        </div>
      </main>

      {details && (
        <RequestDetails
          request={details}
          onClose={() => setDetails(null)}
          onApprove={(courses) => {
            setApproving({ request: details, courses });
            setDetails(null);
          }}
          onReject={() => {
            setRejecting(details);
            setDetails(null);
          }}
          onAskChanges={() => {
            setAskingChanges(details);
            setDetails(null);
          }}
          onOpenConversation={() => openMessages(() => messagesApi.request(details.id))}
        />
      )}
      {askingChanges && (
        <ReasonDialog
          title={`Ask ${askingChanges.requestedBy} for changes?`}
          intro={`The ${askingChanges.shortName} request stays waiting for review. They see your message, can answer it and edit their request.`}
          label="What should they change?"
          placeholder="e.g. Please attach the OSA recognition letter and add BSEMC to the courses."
          confirmLabel="Send"
          danger={false}
          onCancel={() => setAskingChanges(null)}
          onSubmit={(message) => run(() => adminApi.askChanges(askingChanges.id, message), `Sent to ${askingChanges.requestedBy}`)}
        />
      )}
      {rejectingChange && (
        <ReasonDialog
          title={`Reject ${rejectingChange.organization.shortName}'s changes?`}
          intro="Nothing changes. The President sees your note."
          label="Note for the President"
          placeholder="e.g. Please confirm the new name with your adviser first."
          confirmLabel="Reject changes"
          onCancel={() => setRejectingChange(null)}
          onSubmit={(note) => run(() => adminApi.decideChange(rejectingChange.id, "Rejected", note), "Changes rejected")}
        />
      )}
      {approving && (
        <ReasonDialog
          title={`Approve ${approving.request.shortName}?`}
          intro={`It goes live and ${approving.request.requestedBy} becomes its President. They get a notification and an email with the org's details.`}
          label="Message for them (optional)"
          placeholder="e.g. Welcome! Add your officers and post your first event."
          confirmLabel="Approve"
          danger={false}
          optional
          onCancel={() => setApproving(null)}
          onSubmit={(note) => approve(approving.request, approving.courses, note || null)}
        />
      )}
      {statusChange && (
        <ReasonDialog
          title={statusChange.status === "Suspended" ? `Suspend ${statusChange.org.name}?` : `Reactivate ${statusChange.org.name}?`}
          intro={
            statusChange.status === "Suspended"
              ? "Its members and officers can't use it until you reactivate it, and it's hidden from the org list. Nothing is deleted. Its officers see your reason."
              : "Members and officers can use it again, and it shows in the org list. Its officers are told."
          }
          label={statusChange.status === "Suspended" ? "Reason (its officers see this)" : "Note for its officers (optional)"}
          placeholder={statusChange.status === "Suspended" ? "e.g. Your adviser's endorsement for this school year is missing." : "e.g. Thanks for sending the documents."}
          confirmLabel={statusChange.status === "Suspended" ? "Suspend" : "Reactivate"}
          danger={statusChange.status === "Suspended"}
          optional={statusChange.status !== "Suspended"}
          onCancel={() => setStatusChange(null)}
          onSubmit={(reason) =>
            run(
              () => adminApi.setStatus(statusChange.org.id, statusChange.status, reason || null),
              `${statusChange.org.name} is ${statusChange.status === "Suspended" ? "suspended" : "active again"}`
            )
          }
        />
      )}
      {viewing && (
        <OrgView
          org={viewing}
          onClose={() => setViewing(null)}
          onSetStatus={(s) => { setViewing(null); setStatus(viewing, s); }}
          onMessage={() => openMessages(() => messagesApi.org(viewing.id))}
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

function RequestList({ requests, onDetails, onApprove, onReject, onAskChanges }) {
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
          <UserAvatar user={{ name: r.requestedBy || r.name, ...r.requestedByAvatar }} className="sm" />
          <div className="review-text">
            <div className="review-name">
              {r.name} <span className="review-meta">Submitted {shortDate(r.submittedAt)}</span>
            </div>
            <div className="review-detail">
              {r.college} · Adviser {r.adviser} · Requested by {r.requestedBy}
            </div>
            {r.status === "Rejected" && <div className="review-detail">Rejected {shortDate(r.reviewedAt)}: {r.reviewNote}</div>}
            {r.status === "Pending" && r.changesRequested && <span className="changes-chip"><Icon name="clock" size={12} /> Changes requested</span>}
          </div>
          <div className="review-actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => onDetails(r)}>View details</button>
            {r.status === "Pending" ? (
              <>
                <button type="button" className="btn btn-outline btn-sm" disabled={busy === r.id} onClick={() => onAskChanges(r)}>Ask for changes</button>
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

function OrgTable({ orgs, onSetStatus, onView }) {
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
                <div className="account-actions">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => onView(o)}>
                    <Icon name="eye" size={15} /> View
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => onSetStatus(o, o.status === "Suspended" ? "Active" : "Suspended")}>
                    {o.status === "Suspended" ? "Reactivate" : "Suspend"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Everything the requester sent; the admin can fix the course list before approving
function RequestDetails({ request, onClose, onApprove, onReject, onAskChanges, onOpenConversation }) {
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
          <button type="button" className="btn btn-outline" onClick={onOpenConversation}>
            <Icon name="mail" size={15} /> Conversation
          </button>
          {pending && (
            <>
              <button type="button" className="btn btn-outline" onClick={onAskChanges}>Ask for changes</button>
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
          {request.color && <div><dt>Color</dt><dd><ColorTag color={request.color} /></dd></div>}
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
        <label htmlFor="reject-note">Reason <span className="muted">(shown to {request.requestedBy} and emailed to them)</span></label>
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

// Everything about one org: details, color, officers and numbers. Suspend or reactivate from here too.
function OrgView({ org, onClose, onSetStatus, onMessage }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.organization(org.id).then(setInfo).catch((err) => setError(errorMessage(err)));
  }, [org.id]);

  const fact = (label, value) => value ? <div><dt>{label}</dt><dd>{value}</dd></div> : null;

  return (
    <Modal
      title={org.name}
      subtitle={org.college}
      size="lg"
      onClose={onClose}
      footer={
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Close</button>
          <button type="button" className="btn btn-outline" onClick={onMessage}>
            <Icon name="mail" size={15} /> Message officers
          </button>
          <button type="button" className={`btn ${org.status === "Suspended" ? "btn-primary" : "btn-danger"}`} onClick={() => onSetStatus(org.status === "Suspended" ? "Active" : "Suspended")}>
            {org.status === "Suspended" ? "Reactivate" : "Suspend"}
          </button>
        </div>
      }
    >
      {error ? (
        <div className="alert alert-error" role="alert">{error}</div>
      ) : !info ? (
        <div className="skeleton-list" aria-hidden="true"><span /><span /><span /></div>
      ) : (
        <div className="item-details">
          <div className="org-view-head">
            {info.logoUrl ? <img src={info.logoUrl} alt="" className="org-view-logo" /> : <span className="org-view-logo is-empty"><Icon name="image" size={22} /></span>}
            <div>
              <div className="detail-tags">
                <StatusBadge status={info.status} />
                <ColorTag color={info.color} />
              </div>
              {info.tagline && <p className="muted">{info.tagline}</p>}
            </div>
          </div>
          {info.status === "Suspended" && info.suspensionReason && (
            <div className="alert alert-error"><strong>Suspended:</strong> {info.suspensionReason}</div>
          )}

          <div className="org-view-counts">
            <div><strong>{info.counts.members}</strong><span>Active members</span></div>
            <div><strong>{info.counts.applicants}</strong><span>Applicants</span></div>
            <div><strong>{info.counts.events}</strong><span>Events ({info.counts.upcoming} upcoming)</span></div>
            <div><strong>{info.counts.approvedHours}</strong><span>Approved hours</span></div>
          </div>

          {info.description && (
            <div className="detail-section">
              <h3>About</h3>
              <p className="detail-text">{info.description}</p>
            </div>
          )}

          <dl className="join-facts">
            {fact("Short name", info.shortName)}
            {fact("Adviser", info.adviser)}
            {fact("Email", info.email)}
            {fact("Office", info.office)}
            {fact("Meetings", info.meetingSchedule)}
            {fact("Membership fee", info.membershipFee)}
            {fact("Founded", info.foundedYear)}
            {fact("Requested by", info.requestedBy)}
            {fact("Approved", info.approvedAt && shortDate(info.approvedAt))}
            {fact("Courses", (info.courses || []).join(", "))}
          </dl>

          <div className="detail-section">
            <h3>Officers</h3>
            {info.officers.length === 0 ? (
              <p className="muted small">No officers yet.</p>
            ) : (
              <ul className="org-view-officers">
                {info.officers.map((o) => (
                  <li key={o.id}>
                    <UserAvatar user={o} className="sm" />
                    <span>
                      <strong>{o.name}</strong>
                      <span className="muted small">{o.position} · {o.email}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

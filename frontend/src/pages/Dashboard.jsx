import Icon from "../components/Icon.jsx";
import Panel from "../components/Panel.jsx";
import StatRow from "../components/StatRow.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ApprovalCenter from "../components/ApprovalCenter.jsx";
import EventCalendar from "../components/EventCalendar.jsx";
import FeedPost from "../components/FeedPost.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  attendedCount,
  formatDate,
  initials,
  isCompleted,
  percent,
  plural,
} from "../utils/format.js";

const sumHours = (logs) => logs.reduce((s, h) => s + Number(h.hours), 0);

function ViewAll({ onClick, label = "View all" }) {
  return (
    <button type="button" className="link-btn" onClick={onClick}>
      {label} <Icon name="arrowRight" size={14} />
    </button>
  );
}

function Leaderboard({ leaders, loading, currentUserId }) {
  if (loading) return <div className="skeleton-list" aria-hidden="true"><span /><span /><span /></div>;
  if (leaders.length === 0) {
    return <EmptyState compact title="No hours yet" text="Members appear here once their hours are approved." />;
  }
  return (
    <ol className="leaders">
      {leaders.slice(0, 5).map((l, i) => {
        const me = l.id === currentUserId;
        return (
          <li key={l.id} className={me ? "is-me" : ""}>
            <span className="leader-rank">{i + 1}</span>
            <span className="avatar leader-avatar">{initials(l.name)}</span>
            <span className="leader-name">
              {l.name}
              {me && " (you)"}
            </span>
            <span className="leader-hours">{l.hours} hrs</span>
          </li>
        );
      })}
    </ol>
  );
}

// Right-hand column of the dashboard (Figma): event calendar, then a second section
function DashboardRail({ events, onNavigate, children }) {
  return (
    <aside className="dash-rail">
      <div className="rail-head">
        <h2>Upcoming events</h2>
        <button type="button" className="rail-link" onClick={() => onNavigate("events")}>
          View all <Icon name="arrowRight" size={16} />
        </button>
      </div>
      <EventCalendar events={events} onOpenEvents={() => onNavigate("events")} />
      {children}
    </aside>
  );
}

function TopVolunteers({ leaders, loading, currentUserId }) {
  return (
    <section className="rail-section" data-tour="leaders">
      <div className="rail-head stacked">
        <h2>Top volunteers</h2>
        <p>Approved hours</p>
      </div>
      <Leaderboard leaders={leaders} loading={loading} currentUserId={currentUserId} />
    </section>
  );
}

/* ---------- Officer ---------- */

function OfficerDashboard({ header, data, loading, onNavigate, events: eventActions, hours: hourActions, members: memberActions, tutoring }) {
  const { user } = useAuth();
  const { events, hours, members, sessions, requests, applications, leaderboard } = data;

  const upcoming = events.filter((e) => !isCompleted(e)).sort((a, b) => a.date.localeCompare(b.date));
  const completed = events.filter(isCompleted).sort((a, b) => b.date.localeCompare(a.date));
  const registered = completed.reduce((s, e) => s + e.registrations.length, 0);
  const attended = completed.reduce((s, e) => s + attendedCount(e), 0);
  const pendingApps = applications.filter((a) => a.status === "Pending").length;
  const pendingHours = sumHours(hours.filter((h) => h.status === "Pending"));

  const stats = [
    {
      label: "Active Members",
      value: members.filter((m) => m.status === "Active").length,
      note: pendingApps ? `${plural(pendingApps, "application")} to review` : "No pending applications",
    },
    { label: "Upcoming Events", value: upcoming.length, note: `${completed.length} completed` },
    {
      label: "Approved Hours",
      value: sumHours(hours.filter((h) => h.status === "Approved")),
      // The whole org's hours (your own are on Profile & settings)
      note: pendingHours ? `All members · ${pendingHours} hrs awaiting review` : "All members · nothing awaiting review",
    },
    {
      label: "Attendance Rate",
      value: completed.length ? `${percent(attended, registered)}%` : "—",
      note: completed.length ? `All members · ${plural(completed.length, "completed event")}` : "No completed events yet",
    },
  ];

  return (
    <div className="dash-layout">
      <div className="dash-main">
        {header}
        <StatRow items={stats} loading={loading} variant="cards" />

        <Panel
          title="Needs Review"
          className="dash-card"
          id="approvals"
          tour="review"
          action={<ViewAll onClick={() => onNavigate("hours")} label="View All" />}
        >
          <ApprovalCenter
            hours={hours}
            requests={requests}
            sessions={sessions}
            applications={applications}
            onDecideHours={hourActions.decide}
            onDecideRequest={tutoring.decide}
            onDecideApplication={memberActions.decideApplication}
            tabs={user.canManageMembers ? ["hours", "tutoring", "memberships"] : ["hours", "tutoring"]}
            userId={user.id}
            limit={3}
          />
        </Panel>

        <Panel
          title="Recent Attendance"
          className="dash-card"
          tour="attendance"
          action={<ViewAll onClick={() => onNavigate("events")} label="View All" />}
        >
          {completed.length === 0 ? (
            <EmptyState compact title="No completed events" text="Attendance shows here after you record it for an event." />
          ) : (
            <div className="table-wrap">
              <table className="table attendance-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th className="center">Registered</th>
                    <th className="center">Attended</th>
                    <th className="center">Rate</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {completed.slice(0, 3).map((e) => (
                    <tr key={e.id}>
                      <td>
                        <div className="strong">{e.title}</div>
                        <div className="muted small">{formatDate(e.date)}</div>
                      </td>
                      <td className="center num">{e.registrations.length}</td>
                      <td className="center num">{attendedCount(e)}</td>
                      <td className="center num">{percent(attendedCount(e), e.registrations.length)}%</td>
                      <td className="right">
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => eventActions.openAttendance(e)}
                          aria-label={`Edit attendance for ${e.title}`}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <DashboardRail events={events} onNavigate={onNavigate}>
        <TopVolunteers leaders={leaderboard} loading={loading} currentUserId={user.id} />
      </DashboardRail>
    </div>
  );
}

/* ---------- Member ---------- */

// The member's latest "hours approved" / "certificate ready" notification, as a thank-you card.
// Notifications only carry a message, so this reads the wording the backend uses for those two.
function latestRecognition(notifications) {
  for (const n of notifications) {
    const hours = n.message.match(/^Your ([\d.]+) hrs for (.+) were approved$/);
    if (hours) return { title: hours[2], text: "Thank you for volunteering! Your hours have been verified.", when: n.createdAt };
    const cert = n.message.match(/^Your certificate for (.+) is ready$/);
    if (cert) return { title: cert[1], text: "Thank you for making it to our event! Your certificate is ready.", when: n.createdAt };
  }
  return null;
}

function Suggestions({ user, sessions, requests, onNavigate }) {
  const open = sessions.filter((s) => s.slots > 0 && s.tutorId !== user.id);

  // Tutors with open slots (one entry per tutor)
  const tutors = [];
  open.forEach((s) => {
    if (!tutors.some((t) => t.id === s.tutorId)) tutors.push({ id: s.tutorId, name: s.tutorName, subject: s.subject });
  });

  // Sessions in areas this member hasn't requested yet
  const requestedIds = new Set(requests.filter((r) => r.userId === user.id).map((r) => r.sessionId));
  const triedAreas = new Set(sessions.filter((s) => requestedIds.has(s.id)).map((s) => s.area));
  const groups = open.filter((s) => !requestedIds.has(s.id) && !triedAreas.has(s.area));

  return (
    <section className="rail-section" data-tour="suggestions">
      <div className="rail-head">
        <h2>Suggestions</h2>
      </div>

      <div className="suggest-card">
        <h3>Peer Tutoring Connections</h3>
        {tutors.length === 0 ? (
          <p className="muted small">No tutors with open slots right now.</p>
        ) : (
          <ul className="suggest-list">
            {tutors.slice(0, 3).map((t) => (
              <li key={t.id}>
                <button type="button" className="suggest-item" onClick={() => onNavigate("tutoring")}>
                  <span className="avatar suggest-avatar">{initials(t.name)}</span>
                  <span className="suggest-text">
                    <strong>{t.name}</strong>
                    <span>{t.subject}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="suggest-card">
        <h3>Suggested Study Groups</h3>
        {groups.length === 0 ? (
          <p className="muted small">You've tried every subject with open sessions. Nice!</p>
        ) : (
          <ul className="suggest-list">
            {groups.slice(0, 3).map((s) => (
              <li key={s.id}>
                <button type="button" className="suggest-item" onClick={() => onNavigate("tutoring")}>
                  <span className="suggest-icon"><Icon name="book" size={16} /></span>
                  <span className="suggest-text">
                    <strong>{s.subject}</strong>
                    <span>{s.area} · {s.schedule}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function MemberDashboard({ header, data, loading, onNavigate }) {
  const { user } = useAuth();
  const { events, announcements, notifications, sessions, requests } = data;

  // Pinned first, then newest (same order as the Announcements page)
  const feed = [...announcements].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)
  );
  const recognition = latestRecognition(notifications);

  return (
    <div className="dash-layout">
      <div className="dash-main">
        {header}

        <section className="feed-list" data-tour="feed" aria-label="Feed">
          {loading ? (
            <div className="feed-post"><div className="skeleton-list" aria-hidden="true"><span /><span /><span /></div></div>
          ) : (
            <>
              {feed.slice(0, 1).map((post) => <FeedPost key={post.id} post={post} />)}

              {recognition && (
                <article className="recognition-card">
                  <h3>{recognition.title}</h3>
                  <p>{recognition.text}</p>
                </article>
              )}

              {feed.slice(1).map((post) => <FeedPost key={post.id} post={post} />)}

              {feed.length === 0 && (
                <div className="feed-post">
                  <EmptyState compact icon="megaphone" title="No posts yet" text="Updates from your officers will appear here." />
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <DashboardRail events={events} onNavigate={onNavigate}>
        <Suggestions user={user} sessions={sessions} requests={requests} onNavigate={onNavigate} />
      </DashboardRail>
    </div>
  );
}

export default function Dashboard(props) {
  const { user } = useAuth();
  return user.role === "officer" ? <OfficerDashboard {...props} /> : <MemberDashboard {...props} />;
}

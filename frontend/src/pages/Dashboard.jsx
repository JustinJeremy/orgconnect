import Icon from "../components/Icon.jsx";
import Panel from "../components/Panel.jsx";
import StatRow from "../components/StatRow.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ModeTag from "../components/ModeTag.jsx";
import ApprovalCenter from "../components/ApprovalCenter.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  attendedCount,
  dateParts,
  formatDate,
  formatTime,
  isCompleted,
  myRegistration,
  percent,
  plural,
  relativeDate,
  shortDate,
} from "../utils/format.js";

const sumHours = (logs) => logs.reduce((s, h) => s + Number(h.hours), 0);

function ViewAll({ onClick, label = "View all" }) {
  return (
    <button type="button" className="link-btn" onClick={onClick}>
      {label} <Icon name="arrowRight" size={14} />
    </button>
  );
}

function EventList({ events, loading, empty }) {
  if (loading) return <div className="skeleton-list" aria-hidden="true"><span /><span /><span /></div>;
  if (events.length === 0) return empty;
  return (
    <ul className="event-list">
      {events.map((e) => {
        const { mon, day } = dateParts(e.date);
        return (
          <li key={e.id}>
            <div className="date-block">
              <span>{mon}</span>
              <strong>{day}</strong>
            </div>
            <div className="event-list-text">
              <div className="event-list-title">{e.title}</div>
              <div className="muted small">
                {formatTime(e.time)} · {e.location} <ModeTag mode={e.mode} />
              </div>
            </div>
            <span className="event-list-count" title="Registered / capacity">
              {e.registrations.length}/{e.capacity}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Leaderboard({ leaders, loading, currentUserId }) {
  if (loading) return <div className="skeleton-list" aria-hidden="true"><span /><span /><span /></div>;
  if (leaders.length === 0) {
    return <EmptyState compact title="No hours yet" text="Members appear here once their hours are approved." />;
  }
  return (
    <ol className="leaders">
      {leaders.slice(0, 5).map((l, i) => (
        <li key={l.id} className={l.id === currentUserId ? "is-me" : ""}>
          <span className="leader-rank">{i + 1}</span>
          <span className="leader-name">
            {l.name}
            {l.id === currentUserId && <span className="muted"> (you)</span>}
          </span>
          <span className="leader-hours">{l.hours} hrs</span>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Officer ---------- */

function OfficerDashboard({ data, loading, onNavigate, events: eventActions, hours: hourActions, members: memberActions, tutoring }) {
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
      label: "Active members",
      value: members.filter((m) => m.status === "Active").length,
      note: pendingApps ? `${plural(pendingApps, "application")} to review` : "No pending applications",
    },
    { label: "Upcoming events", value: upcoming.length, note: `${completed.length} completed` },
    {
      label: "Approved hours",
      value: sumHours(hours.filter((h) => h.status === "Approved")),
      note: pendingHours ? `${pendingHours} hrs awaiting review` : "Nothing awaiting review",
    },
    {
      label: "Attendance rate",
      value: completed.length ? `${percent(attended, registered)}%` : "—",
      note: completed.length ? `Across ${plural(completed.length, "completed event")}` : "No completed events yet",
    },
  ];

  return (
    <div className="page">
      <StatRow items={stats} loading={loading} />

      <div className="dash-grid">
        <Panel title="Needs review" className="span-8" id="approvals" tour="review">
          <ApprovalCenter
            hours={hours}
            requests={requests}
            sessions={sessions}
            applications={applications}
            onDecideHours={hourActions.decide}
            onDecideRequest={tutoring.decide}
            onDecideApplication={memberActions.decideApplication}
            limit={5}
          />
        </Panel>

        <Panel title="Upcoming events" className="span-4" tour="upcoming" action={<ViewAll onClick={() => onNavigate("events")} />}>
          <EventList
            events={upcoming.slice(0, 4)}
            loading={loading}
            empty={
              <EmptyState
                compact
                title="No upcoming events"
                action={
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => onNavigate("events")}>
                    Create an event
                  </button>
                }
              />
            }
          />
        </Panel>

        <Panel title="Recent attendance" className="span-8" tour="attendance" action={<ViewAll onClick={() => onNavigate("events")} label="All events" />}>
          {completed.length === 0 ? (
            <EmptyState compact title="No completed events" text="Attendance shows here after you record it for an event." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th className="right">Registered</th>
                    <th className="right">Attended</th>
                    <th className="right">Rate</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {completed.slice(0, 5).map((e) => (
                    <tr key={e.id}>
                      <td>
                        <div className="strong">{e.title}</div>
                        <div className="muted small">{formatDate(e.date)}</div>
                      </td>
                      <td className="right num">{e.registrations.length}</td>
                      <td className="right num">{attendedCount(e)}</td>
                      <td className="right num">{percent(attendedCount(e), e.registrations.length)}%</td>
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

        <Panel title="Top volunteers" subtitle="Approved hours" className="span-4" tour="leaders">
          <Leaderboard leaders={leaderboard} loading={loading} currentUserId={user.id} />
        </Panel>
      </div>
    </div>
  );
}

/* ---------- Member ---------- */

function MemberDashboard({ data, loading, onNavigate, events: eventActions }) {
  const { user } = useAuth();
  const { events, hours, announcements, leaderboard } = data;

  const mine = events.filter((e) => myRegistration(e, user.id));
  const myUpcoming = mine.filter((e) => !isCompleted(e)).sort((a, b) => a.date.localeCompare(b.date));
  const myCompleted = mine.filter(isCompleted);
  const myAttended = myCompleted.filter((e) => myRegistration(e, user.id).status === "attended").length;
  const { certificates } = data;
  const myLogs = hours.filter((h) => h.userId === user.id);
  const pendingHours = sumHours(myLogs.filter((h) => h.status === "Pending"));
  const latest = [...announcements]
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  const stats = [
    {
      label: "Approved hours",
      value: sumHours(myLogs.filter((h) => h.status === "Approved")),
      note: pendingHours ? `${pendingHours} hrs pending review` : "Nothing pending",
    },
    {
      label: "Upcoming RSVPs",
      value: myUpcoming.length,
      note: myUpcoming[0] ? `Next on ${shortDate(myUpcoming[0].date)}` : "No RSVPs yet",
    },
    { label: "Events attended", value: myAttended, note: myCompleted.length ? `Of ${myCompleted.length} registered` : "None yet" },
    { label: "Certificates", value: certificates.length, note: "From events you attended" },
  ];

  return (
    <div className="page">
      {user.membershipStatus === "Pending" && (
        <div className="banner" role="status">
          <Icon name="clock" size={18} />
          <span>
            <strong>Your membership application is under review.</strong> You can browse events and request tutoring
            in the meantime.
          </span>
        </div>
      )}

      <StatRow items={stats} loading={loading} />

      <div className="dash-grid">
        <Panel title="My upcoming events" className="span-7" tour="my-events" action={<ViewAll onClick={() => onNavigate("events")} label="Browse events" />}>
          <EventList
            events={myUpcoming.slice(0, 4)}
            loading={loading}
            empty={
              <EmptyState
                compact
                title="You haven't RSVP'd to anything yet"
                action={
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => onNavigate("events")}>
                    Find an event
                  </button>
                }
              />
            }
          />
        </Panel>

        <Panel title="Announcements" className="span-5" tour="dash-announcements" action={<ViewAll onClick={() => onNavigate("announcements")} />}>
          {latest.length === 0 ? (
            <EmptyState compact title="No announcements" />
          ) : (
            <ul className="mini-feed">
              {latest.map((a) => (
                <li key={a.id}>
                  {!a.isRead && <span className="unread-dot" aria-label="Unread" />}
                  <div>
                    <div className="mini-feed-title">{a.title}</div>
                    <div className="muted small">
                      {a.category} · {relativeDate(a.createdAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="My certificates" className="span-7" tour="certificates">
          {certificates.length === 0 ? (
            <EmptyState compact title="No certificates yet" text="You'll get one for every event you attend." />
          ) : (
            <ul className="row-list">
              {certificates.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <div>
                    <div className="strong">{c.title}</div>
                    <div className="muted small">{formatDate(c.date)}</div>
                  </div>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => eventActions.downloadCertificate({ id: c.eventId })}>
                    <Icon name="download" size={15} /> Download
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Top volunteers" subtitle="Approved hours" className="span-5" tour="leaders">
          <Leaderboard leaders={leaderboard} loading={loading} currentUserId={user.id} />
        </Panel>
      </div>
    </div>
  );
}

export default function Dashboard(props) {
  const { user } = useAuth();
  return user.role === "officer" ? <OfficerDashboard {...props} /> : <MemberDashboard {...props} />;
}

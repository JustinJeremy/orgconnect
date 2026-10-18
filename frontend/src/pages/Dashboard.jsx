import Icon from "../components/Icon.jsx";
import Panel from "../components/Panel.jsx";
import StatRow from "../components/StatRow.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ApprovalCenter from "../components/ApprovalCenter.jsx";
import EventCalendar from "../components/EventCalendar.jsx";
import FeedPost from "../components/FeedPost.jsx";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { usePeople } from "../context/PeopleContext.jsx";
import { UserAvatar } from "../components/Avatars.jsx";
import { peopleApi } from "../api/services.js";
import {
  attendedCount,
  dateParts,
  formatDate,
  formatTime,
  isCompleted,
  myRegistration,
  percent,
  plural,
  todayIso,
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
  const { openPerson } = usePeople();
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
            <button type="button" className="helpful-person" onClick={() => openPerson(l.id)}>
              <UserAvatar user={l} className="leader-avatar" />
              <span className="leader-name">
                {l.name}
                {me && " (you)"}
              </span>
            </button>
            <span className="leader-hours">{l.hours} hrs</span>
          </li>
        );
      })}
    </ol>
  );
}

// Right-hand column of the dashboard (Figma): event calendar, then a second section
function DashboardRail({ events, sessions, requests, userId, onNavigate, onOpenEvent, onOpenSession, children }) {
  return (
    <aside className="dash-rail">
      <div className="rail-head">
        <h2>Upcoming events</h2>
        <button type="button" className="rail-link" onClick={() => onNavigate("events")}>
          View all <Icon name="arrowRight" size={16} />
        </button>
      </div>
      <EventCalendar
        events={events}
        sessions={sessions}
        requests={requests}
        userId={userId}
        onOpenEvents={() => onNavigate("events")}
        onOpenEvent={onOpenEvent}
        onOpenTutoring={(session) => (onOpenSession ? onOpenSession(session) : onNavigate("tutoring"))}
      />
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

function OfficerDashboard({ header, data, loading, onNavigate, onOpenEvent, onOpenSession, onOpenReview, events: eventActions, hours: hourActions, members: memberActions, tutoring }) {
  const [reviewTab, setReviewTab] = useState("hours"); // the Needs Review tab that is open
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
          action={<ViewAll onClick={() => (onOpenReview ? onOpenReview(reviewTab) : onNavigate("hours"))} label="View All" />}
        >
          <ApprovalCenter
            onTabChange={setReviewTab}
            hours={hours}
            requests={requests}
            sessions={sessions}
            applications={applications}
            onDecideHours={hourActions.decide}
            onDecideRequest={tutoring.decide}
            onDecideApplication={memberActions.decideApplication}
            tabs={user.canManageMembers ? ["hours", "tutoring", "memberships"] : ["hours", "tutoring"]}
            userId={user.id}
            canReviewOfficers={user.canManageMembers}
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

      <DashboardRail events={events} sessions={sessions} requests={requests} userId={user.id} onNavigate={onNavigate} onOpenEvent={onOpenEvent} onOpenSession={onOpenSession}>
        <TopVolunteers leaders={leaderboard} loading={loading} currentUserId={user.id} />
        <FriendsCard onNavigate={onNavigate} />
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

// Your friends, under the calendar: up to 4, plus how many requests are waiting.
// Same card and list as Suggestions; a name opens their profile.
function FriendsCard({ onNavigate }) {
  const { openPerson, friendsVersion } = usePeople();
  const [data, setData] = useState(null);

  useEffect(() => {
    peopleApi.friends().then(setData).catch(() => setData({ friends: [], received: [], sent: [] }));
  }, [friendsVersion]);

  const friends = data?.friends ?? [];
  const waiting = data?.received.length ?? 0;

  return (
    <section className="rail-section" data-tour="dash-friends">
      <div className="rail-head">
        <h2>Friends</h2>
        <button type="button" className="rail-link" onClick={() => onNavigate("people")}>
          {friends.length ? "See all" : "Find people"} <Icon name="arrowRight" size={16} />
        </button>
      </div>
      <div className="suggest-card">
        {waiting > 0 && (
          <button type="button" className="friend-requests-note" onClick={() => onNavigate("people")}>
            <Icon name="users" size={15} /> {plural(waiting, "friend request")} waiting
          </button>
        )}
        {!data ? (
          <div className="skeleton-list" aria-hidden="true"><span /><span /></div>
        ) : friends.length === 0 ? (
          <p className="muted small">No friends yet. Add people you know from the People page.</p>
        ) : (
          <ul className="suggest-list">
            {friends.slice(0, 4).map((f) => (
              <li key={f.id}>
                <button type="button" className="suggest-item" onClick={() => openPerson(f.id)}>
                  <UserAvatar user={f} className="suggest-avatar" />
                  <span className="suggest-text">
                    <strong>{f.name}</strong>
                    <span>{f.inThisOrg ? [f.position !== "Member" ? f.position : null, f.course, f.yearLevel].filter(Boolean).join(" · ") : `In ${f.orgs.join(", ")}`}</span>
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

function Suggestions({ user, sessions, requests, onNavigate }) {
  const { openPerson } = usePeople();
  const open = sessions.filter((s) => s.slots > 0 && s.tutorId !== user.id);

  // Tutors with open slots (one entry per tutor)
  const tutors = [];
  open.forEach((s) => {
    if (!tutors.some((t) => t.id === s.tutorId)) tutors.push({ id: s.tutorId, name: s.tutorName, subject: s.subject, ...s.tutorAvatar });
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
                <button type="button" className="suggest-item" onClick={() => openPerson(t.id)}>
                  <UserAvatar user={t} className="suggest-avatar" />
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

// Event poster, or the event's date on the org color when there is no poster
function EventImage({ event, className = "" }) {
  const { mon, day } = dateParts(event.date);
  return (
    <span className={`dash-event-image ${className}`} aria-hidden="true">
      {event.posterUrl ? (
        <img src={event.posterUrl} alt="" loading="lazy" />
      ) : (
        <span className="dash-event-fallback">
          <span>{mon}</span>
          <strong>{day}</strong>
        </span>
      )}
    </span>
  );
}

const eventWhen = (e) => `${dateParts(e.date).weekday}, ${formatDate(e.date)} · ${formatTime(e.time)}`;

// The member's next RSVP'd event (or the soonest one), big, with RSVP right there
function FeaturedEvent({ event, userId, onOpen, onToggleRsvp }) {
  const mine = myRegistration(event, userId);
  const going = event.registrations.length;
  const isFull = going >= event.capacity;
  return (
    <article className="dash-featured">
      <button type="button" className="dash-featured-media" onClick={() => onOpen(event)} aria-label={`View ${event.title}`}>
        {/* A blurred copy of the poster fills the space around it, so the frame matches any org's colors */}
        {event.posterUrl && <img className="dash-featured-backdrop" src={event.posterUrl} alt="" aria-hidden="true" />}
        <EventImage event={event} />
      </button>
      <div className="dash-featured-body">
        <span className="dash-eyebrow">{mine ? "Your next event" : "Happening soon"}</span>
        <h2>{event.title}</h2>
        <ul className="dash-featured-meta">
          <li><Icon name="calendar" size={15} /> {eventWhen(event)}</li>
          {event.location && <li><Icon name="pin" size={15} /> {event.location}</li>}
          <li><Icon name="users" size={15} /> {going} of {event.capacity} going</li>
        </ul>
        <div className="dash-featured-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onOpen(event)}>
            View event <Icon name="arrowRight" size={15} />
          </button>
          {mine ? (
            <span className="going"><Icon name="check" size={15} /> You're going</span>
          ) : (
            <button type="button" className="btn btn-outline-navy btn-sm" onClick={() => onToggleRsvp(event, false)} disabled={isFull}>
              {isFull ? "Full" : "RSVP"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function MemberDashboard({ header, data, loading, onNavigate, onOpenEvent, onOpenSession, events: eventActions }) {
  const { user } = useAuth();
  const { events, announcements, notifications, sessions, requests } = data;

  // Pinned first, then newest (same order as the Announcements page)
  const feed = [...announcements].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)
  );
  const recognition = latestRecognition(notifications);

  // Upcoming = not completed and not on an earlier day, soonest first
  const today = todayIso();
  const upcoming = events
    .filter((e) => !isCompleted(e) && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const featured = upcoming.find((e) => myRegistration(e, user.id)) || upcoming[0];
  const more = upcoming.filter((e) => e !== featured).slice(0, 3);

  return (
    <div className="dash-layout">
      <div className="dash-main">
        {header}

        {!loading && featured && (
          <FeaturedEvent event={featured} userId={user.id} onOpen={onOpenEvent} onToggleRsvp={eventActions.toggleRsvp} />
        )}

        {!loading && more.length > 0 && (
          <section className="dash-section" aria-labelledby="dash-more-events">
            <div className="dash-section-head">
              <h2 id="dash-more-events">More upcoming events</h2>
              <ViewAll onClick={() => onNavigate("events")} />
            </div>
            <div className="dash-event-row">
              {more.map((e) => (
                <button key={e.id} type="button" className="dash-event-tile" onClick={() => onOpenEvent(e)}>
                  <EventImage event={e} />
                  <span className="dash-event-tile-body">
                    <strong>{e.title}</strong>
                    <span>{formatDate(e.date)} · {formatTime(e.time)}</span>
                    {myRegistration(e, user.id) && <span className="dash-event-going"><Icon name="check" size={12} /> Going</span>}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="dash-section-head">
          <h2>Latest from your officers</h2>
          <ViewAll onClick={() => onNavigate("announcements")} />
        </div>
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

      <DashboardRail events={events} sessions={sessions} requests={requests} userId={user.id} onNavigate={onNavigate} onOpenEvent={onOpenEvent} onOpenSession={onOpenSession}>
        <Suggestions user={user} sessions={sessions} requests={requests} onNavigate={onNavigate} />
        <FriendsCard onNavigate={onNavigate} />
      </DashboardRail>
    </div>
  );
}

export default function Dashboard(props) {
  const { user } = useAuth();
  return user.role === "officer" ? <OfficerDashboard {...props} /> : <MemberDashboard {...props} />;
}

import { useEffect, useState } from "react";
import Icon from "../components/Icon.jsx";
import Tabs from "../components/Tabs.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Pagination from "../components/Pagination.jsx";
import FriendButton from "../components/FriendButton.jsx";
import { UserAvatar } from "../components/Avatars.jsx";
import usePagedList from "../hooks/usePagedList.js";
import { usePeople } from "../context/PeopleContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { peopleApi } from "../api/services.js";
import { errorMessage } from "../api/client.js";
import { plural } from "../utils/format.js";

const PER_PAGE = 12;

// Name + avatar that opens their profile
function PersonLink({ person, sub }) {
  const { openPerson } = usePeople();
  return (
    <button type="button" className="person-link" onClick={() => openPerson(person.id)}>
      <UserAvatar user={person} className="suggest-avatar" />
      <span className="suggest-text">
        <strong>{person.name}</strong>
        <span>{sub}</span>
      </span>
    </button>
  );
}

const details = (p) => [p.position && p.position !== "Member" ? p.position : null, p.course, p.yearLevel].filter(Boolean).join(" · ");

// Everyone in the org, officers first; add friends straight from the card
function Directory({ flash }) {
  const { friendsVersion, friendsChanged } = usePeople();
  const [search, setSearch] = useState("");
  const list = usePagedList(peopleApi.page, { search }, PER_PAGE, friendsVersion);

  return (
    <>
      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={17} className="search-icon" />
          <label htmlFor="people-search" className="sr-only">Search people</label>
          <input id="people-search" type="search" className="input" placeholder="Search by name, course or position" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      {!list.loaded ? (
        <div className="skeleton-list" aria-hidden="true"><span /><span /><span /></div>
      ) : list.total === 0 ? (
        <EmptyState icon="users" title="No one found" text="Try another name or course." />
      ) : (
        <div className="card-grid person-grid" data-tour="people-directory">
          {list.items.map((p) => (
            <article key={p.id} className="person-card">
              <PersonLink person={p} sub={details(p) || "Member"} />
              {p.friendship === "self" ? (
                <span className="friend-state is-you">You</span>
              ) : (
                <FriendButton person={p} state={p.friendship} onChange={friendsChanged} flash={flash} />
              )}
            </article>
          ))}
        </div>
      )}
      <Pagination page={list.page} totalPages={list.totalPages} onChange={list.setPage} />
    </>
  );
}

// Your friends, and friend requests waiting on either side
function Friends({ flash }) {
  const { friendsVersion, friendsChanged } = usePeople();
  const [data, setData] = useState(null);

  useEffect(() => {
    peopleApi.friends().then(setData).catch((err) => flash(errorMessage(err), "error"));
  }, [friendsVersion, flash]);

  const act = async (call, person, message) => {
    try {
      await call(person.id);
      friendsChanged();
      flash(message);
    } catch (err) {
      flash(errorMessage(err), "error");
    }
  };

  if (!data) return <div className="skeleton-list" aria-hidden="true"><span /><span /><span /></div>;
  const where = (f) => (f.inThisOrg ? details(f) || "Member" : `In ${f.orgs.join(", ") || "another org"}`);

  return (
    <div className="friends-layout">
      {data.received.length > 0 && (
        <section className="suggest-card" data-tour="friend-requests">
          <h3>Friend requests</h3>
          <ul className="suggest-list">
            {data.received.map((f) => (
              <li key={f.id} className="friend-row">
                <PersonLink person={f} sub={where(f)} />
                <span className="friend-row-actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => act(peopleApi.accept, f, `You and ${f.name} are now friends`)}>Accept</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => act(peopleApi.remove, f, "Request declined")}>Decline</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="suggest-card" data-tour="friends-list">
        <h3>Your friends{data.friends.length > 0 && <span className="tab-count">{data.friends.length}</span>}</h3>
        {data.friends.length === 0 ? (
          <p className="muted small">No friends yet. Add people from the Members tab.</p>
        ) : (
          <ul className="suggest-list friend-grid">
            {data.friends.map((f) => (
              <li key={f.id} className="friend-row">
                <PersonLink person={f} sub={where(f)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.sent.length > 0 && (
        <section className="suggest-card">
          <h3>Requests you sent</h3>
          <ul className="suggest-list">
            {data.sent.map((f) => (
              <li key={f.id} className="friend-row">
                <PersonLink person={f} sub={where(f)} />
                <button type="button" className="btn btn-outline btn-sm" onClick={() => act(peopleApi.remove, f, "Friend request cancelled")}>Cancel</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// Your own tutoring across the top, then two equal columns: tutors ranked by completed
// tutoring sessions in this org, and the subjects students ask for most
function Helpful({ flash, onOpenSession, onNavigate }) {
  const { user } = useAuth();
  const { openPerson } = usePeople();
  const [data, setData] = useState(null);

  useEffect(() => {
    peopleApi.helpful().then(setData).catch((err) => flash(errorMessage(err), "error"));
  }, [flash]);

  if (!data) return <div className="skeleton-list" aria-hidden="true"><span /><span /><span /></div>;
  const { tutors, mine, subjects } = data;
  const maxRequests = Math.max(1, ...subjects.map((s) => s.requests));

  return (
    <div className="helpful-page">
      <section className="suggest-card helpful-mine" data-tour="people-my-tutoring">
        <div className="helpful-mine-text">
          <h3>Your tutoring</h3>
          <p className="muted small">
            {mine.rank
              ? `You're #${mine.rank} of ${mine.of} tutors. Thanks for helping!`
              : mine.teaching
                ? "Mark your sessions completed after you teach them to join the ranking."
                : "Post a tutoring session to start helping other members."}
          </p>
        </div>
        <dl className="helpful-mine-stats">
          <div><dt>Sessions taught</dt><dd>{mine.sessions}</dd></div>
          <div><dt>Students helped</dt><dd>{mine.students}</dd></div>
          <div><dt>Your rank</dt><dd>{mine.rank ? `#${mine.rank}` : "–"}</dd></div>
        </dl>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => onNavigate?.("tutoring")}>
          Peer Tutoring <Icon name="arrowRight" size={14} />
        </button>
      </section>

      <div className="helpful-columns">
        <section className="suggest-card" data-tour="people-helpful">
          <h3>Most helpful tutors</h3>
          <p className="helpful-note muted small">Ranked by completed peer tutoring sessions</p>
          {tutors.length === 0 ? (
            <EmptyState compact icon="book" title="No completed tutoring yet" text="Tutors show up here once their sessions are marked completed." />
          ) : (
            <ol className="leaders helpful-list">
              {tutors.map((r, i) => (
                <li key={r.id} className={r.id === user.id ? "is-me" : ""}>
                  <span className="leader-rank">{i + 1}</span>
                  <button type="button" className="helpful-person" onClick={() => openPerson(r.id)}>
                    <UserAvatar user={r} className="leader-avatar" />
                    <span className="helpful-who">
                      <span className="leader-name">
                        {r.name}
                        {r.id === user.id && " (you)"}
                      </span>
                      <span className="helpful-sub">{details(r) || "Member"}</span>
                    </span>
                  </button>
                  <span className="helpful-count">
                    <strong>{plural(r.sessions, "session")}</strong>
                    <span>{plural(r.students, "student")} helped</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="suggest-card" data-tour="people-subjects">
          <h3>Most requested subjects</h3>
          <p className="helpful-note muted small">What students ask tutors for most. Click one to see the session.</p>
          {subjects.length === 0 ? (
            <p className="muted small">No tutoring requests yet.</p>
          ) : (
            <ol className="subject-list">
              {subjects.map((s) => (
                <li key={s.id}>
                  <button type="button" className="subject-item" onClick={() => onOpenSession?.(s)}>
                    <span className="suggest-icon"><Icon name="book" size={16} /></span>
                    <span className="subject-text">
                      <span className="subject-top">
                        <strong>{s.subject}</strong>
                        <span className="subject-count">{plural(s.requests, "request")}</span>
                      </span>
                      <span className="subject-sub">{s.area} · with {s.tutor}</span>
                      <span className="subject-bar" aria-hidden="true"><span style={{ width: `${(s.requests / maxRequests) * 100}%` }} /></span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

export default function People({ flash, focus, onFocusDone, onOpenSession, onNavigate }) {
  const { friendsVersion } = usePeople();
  const [tab, setTab] = useState(focus?.tab || "members");
  const [requests, setRequests] = useState(0);

  // From a friend request notification: the Friends tab
  useEffect(() => {
    if (!focus) return;
    setTab(focus.tab || "friends");
    onFocusDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key]);

  // The number of requests waiting for you, on the Friends tab
  useEffect(() => {
    peopleApi.friends().then((d) => setRequests(d.received.length)).catch(() => {});
  }, [friendsVersion]);

  return (
    <div className="page">
      <div className="tab-card" data-tour="people-tabs">
        <Tabs
          label="Section"
          value={tab}
          onChange={setTab}
          items={[
            { key: "members", label: "Members" },
            { key: "friends", label: "Friends", count: requests },
            { key: "helpful", label: "Most helpful" },
          ]}
        />
      </div>
      {tab === "members" && <Directory flash={flash} />}
      {tab === "friends" && <Friends flash={flash} />}
      {tab === "helpful" && <Helpful flash={flash} onOpenSession={onOpenSession} onNavigate={onNavigate} />}
    </div>
  );
}

import { useState } from "react";
import Icon from "../components/Icon.jsx";
import Logo from "../components/Logo.jsx";
import Rings from "../components/Rings.jsx";
import OrgSwitcher from "../components/OrgSwitcher.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import { initials, shortDate } from "../utils/format.js";

// Shown instead of the app when you can't use the selected org yet:
//   not a member (or not accepted)  -> apply to join
//   Pending                          -> your application is under review
//   Inactive                         -> why, and ask to be reactivated
export default function JoinOrg() {
  const { current: org } = useOrg();
  const { user, logout } = useAuth();

  const facts = [
    { icon: "users", label: "Active members", value: org.memberCount },
    { icon: "calendar", label: "Founded", value: org.foundedYear },
    { icon: "award", label: "Adviser", value: org.adviser },
    { icon: "pin", label: "Office", value: org.office },
    { icon: "clock", label: "Meetings", value: org.meetingSchedule },
    { icon: "file", label: "Membership fee", value: org.membershipFee },
  ].filter((f) => f.value);

  const status = user.membershipStatus;

  return (
    <div className="join-page">
      <header className="join-nav">
        <Logo size={36} subtitle={<OrgSwitcher />} />
        <div className="join-user">
          <span className="avatar sm">{initials(user.name)}</span>
          <span className="join-user-name">{user.name}</span>
          <button type="button" className="icon-btn" aria-label="Sign out" onClick={() => logout()}>
            <Icon name="logout" />
          </button>
        </div>
      </header>

      <main className="join-main">
        <section className="join-hero">
          <Rings preset="dark" />
          <p className="join-eyebrow">{org.college}</p>
          <h1>{org.name}</h1>
          <p className="join-tagline">{org.tagline}</p>
          {org.courses?.length > 0 && (
            <ul className="join-courses" aria-label="Courses that can join">
              {org.courses.map((c) => <li key={c}>{c}</li>)}
            </ul>
          )}
        </section>

        <div className="join-grid">
          <section className="panel join-about">
            <h2>About {org.shortName}</h2>
            <p>{org.description}</p>
            {org.mission && (
              <>
                <h3>Mission</h3>
                <p>{org.mission}</p>
              </>
            )}
            {org.vision && (
              <>
                <h3>Vision</h3>
                <p>{org.vision}</p>
              </>
            )}
            <dl className="join-facts">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt><Icon name={f.icon} size={15} /> {f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
            {(org.email || org.facebookUrl) && (
              <p className="join-contact">
                {org.email && <a href={`mailto:${org.email}`}>{org.email}</a>}
                {org.email && org.facebookUrl && <span aria-hidden="true"> · </span>}
                {org.facebookUrl && <a href={org.facebookUrl} target="_blank" rel="noreferrer">Facebook page</a>}
              </p>
            )}
          </section>

          <aside className="panel join-cta">
            {status === "Pending" ? <UnderReview org={org} user={user} /> : status === "Inactive" ? <Inactive org={org} user={user} /> : <Apply org={org} user={user} />}

            <div className="join-divider"><span>or</span></div>

            <button type="button" className="btn btn-outline btn-block" onClick={() => logout("signin")}>
              Sign in with another account
            </button>
            {!status && (
              <button type="button" className="btn btn-outline btn-block" onClick={() => logout("signup")}>
                Create a new account
              </button>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function Apply({ org, user }) {
  const { joinOrg } = useAuth();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rejection = user.membershipStatus === "Rejected" ? user.rejection || {} : null;

  const apply = async () => {
    setBusy(true);
    setError("");
    const result = await joinOrg(message.trim());
    setBusy(false);
    if (!result.ok) setError(result.message);
  };

  return (
    <>
      {rejection ? (
        <>
          <p className="join-state is-inactive">
            <Icon name="alert" size={16} /> Not approved
          </p>
          <h2>Your application wasn't approved</h2>
          <div className="join-reason">
            <div className="muted small">
              {rejection.by ? `Reason from ${rejection.by}${rejection.byPosition ? ` (${rejection.byPosition})` : ""}` : "Reason"}
              {rejection.at && ` · ${shortDate(rejection.at)}`}
            </div>
            <p>{rejection.reason || `No reason was given. Contact the officers at ${org.email || "the org office"}.`}</p>
          </div>
          <p className="muted">If you've sorted it out, you can apply again.</p>
        </>
      ) : (
        <>
          <h2>Join {org.shortName}</h2>
          <p className="muted">
            You're signed in as <strong>{user.email}</strong>. Apply with this account and an officer will review your
            application. Events, hours and tutoring open up once you're approved.
          </p>
        </>
      )}
      <MessageField id="apply-message" value={message} onChange={setMessage} />
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <button type="button" className="btn btn-accent btn-block" onClick={apply} disabled={busy}>
        {busy ? "Sending application…" : rejection ? "Apply again" : `Apply to join ${org.shortName}`}
      </button>
    </>
  );
}

// Optional note to the officers who review the application
function MessageField({ id, value, onChange }) {
  return (
    <div className="field">
      <label htmlFor={id}>
        Message to the officers <span className="muted">(optional)</span>
      </label>
      <textarea
        id={id}
        className="input"
        rows="3"
        maxLength={500}
        placeholder="e.g. Why you'd like to join, or events you've helped with"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// On the "under review" screen: add or change the note to the officers
function ApplicationMessage({ user }) {
  const { updateApplication } = useAuth();
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState(user.applicationMessage || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setBusy(true);
    setError("");
    const result = await updateApplication(message.trim());
    setBusy(false);
    if (result.ok) setEditing(false);
    else setError(result.message);
  };

  if (!editing) {
    return user.applicationMessage ? (
      <div className="join-sent-note">
        <div className="muted small">Your message to the officers</div>
        <p>"{user.applicationMessage}"</p>
        <button type="button" className="link-btn" onClick={() => setEditing(true)}>Edit message</button>
      </div>
    ) : (
      <button type="button" className="btn btn-outline btn-block" onClick={() => setEditing(true)}>
        <Icon name="edit" size={16} /> Add a message for the officers
      </button>
    );
  }

  return (
    <div className="stack">
      <MessageField id="pending-message" value={message} onChange={setMessage} />
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save message"}</button>
      </div>
    </div>
  );
}

function UnderReview({ org, user }) {
  const { withdrawApplication } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const withdraw = async () => {
    setBusy(true);
    setError("");
    const result = await withdrawApplication();
    setBusy(false);
    if (!result.ok) setError(result.message);
  };

  return (
    <>
      <p className="join-state is-pending">
        <Icon name="clock" size={16} /> Application pending
      </p>
      <h2>Your application is under review</h2>
      <p className="muted">
        You applied to join {org.shortName}
        {user.appliedAt && ` on ${shortDate(user.appliedAt)}`}. An officer will review it, and you'll get a notification as
        soon as they decide.
      </p>
      <ol className="join-steps">
        <li className="done">
          <span className="join-dot"><Icon name="check" size={14} /></span>
          <div>
            <div className="strong">Application sent</div>
            {user.appliedAt && <div className="muted small">{shortDate(user.appliedAt)}</div>}
          </div>
        </li>
        <li className="now">
          <span className="join-dot" />
          <div>
            <div className="strong">Officer review</div>
            <div className="muted small">Usually within a few days</div>
          </div>
        </li>
        <li>
          <span className="join-dot" />
          <div>
            <div className="strong">Welcome to {org.shortName}</div>
            <div className="muted small">Full access to events, hours and tutoring</div>
          </div>
        </li>
      </ol>
      <p className="join-note">
        <Icon name="alert" size={16} /> Events, hours and tutoring open up once you're approved. Until then you can switch
        to another org you belong to.
      </p>
      <ApplicationMessage user={user} />
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <button type="button" className="btn btn-outline btn-block" onClick={withdraw} disabled={busy}>
        {busy ? "Withdrawing…" : "Withdraw application"}
      </button>
    </>
  );
}

function Inactive({ org, user }) {
  const { requestReactivation } = useAuth();
  const info = user.inactive || {};
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const send = async (e) => {
    e.preventDefault();
    if (!message.trim()) return setError("Write a short message for the officers.");
    setBusy(true);
    setError("");
    const result = await requestReactivation(message.trim());
    setBusy(false);
    if (!result.ok) setError(result.message);
  };

  return (
    <>
      <p className="join-state is-inactive">
        <Icon name="alert" size={16} /> Membership inactive
      </p>
      <h2>Your membership is inactive</h2>
      <p className="muted">
        An officer marked your {org.shortName} membership as inactive, so events, hours and tutoring are paused.
      </p>
      <div className="join-reason">
        <div className="muted small">
          {info.by ? `Reason from ${info.by}${info.byPosition ? ` (${info.byPosition})` : ""}` : "Reason"}
          {info.at && ` · ${shortDate(info.at)}`}
        </div>
        <p>{info.reason || "No reason was given. Contact the officers to find out more."}</p>
      </div>

      {info.requestedAt ? (
        <div className="join-note is-sent">
          <Icon name="check" size={16} />
          <span>
            <strong>Request sent {shortDate(info.requestedAt)}.</strong> An officer will review it and you'll be notified.
            {info.message && <span className="join-sent-message">"{info.message}"</span>}
          </span>
        </div>
      ) : (
        <form className="join-request" onSubmit={send} noValidate>
          <div className="field">
            <label htmlFor="reactivation-message">Request reactivation</label>
            <textarea
              id="reactivation-message"
              className="input"
              rows="4"
              maxLength={1000}
              placeholder="Tell the officers what changed, e.g. you've paid the fee or can attend again."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setError("");
              }}
            />
            <span className="muted small">An officer will review your request and you'll be notified.</span>
          </div>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <button type="submit" className="btn btn-accent btn-block" disabled={busy}>
            {busy ? "Sending…" : "Send request"}
          </button>
        </form>
      )}
    </>
  );
}

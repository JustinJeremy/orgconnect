import { useState } from "react";
import Icon from "../components/Icon.jsx";
import Logo from "../components/Logo.jsx";
import Rings from "../components/Rings.jsx";
import OrgSwitcher from "../components/OrgSwitcher.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import { initials } from "../utils/format.js";

// Shown when you're signed in but viewing an org you haven't joined (or were not accepted to).
export default function JoinOrg() {
  const { current: org } = useOrg();
  const { user, joinOrg, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rejected = user.membershipStatus === "Rejected";

  const apply = async () => {
    setBusy(true);
    setError("");
    const result = await joinOrg();
    setBusy(false);
    if (!result.ok) setError(result.message);
  };

  const facts = [
    { icon: "users", label: "Active members", value: org.memberCount },
    { icon: "calendar", label: "Founded", value: org.foundedYear },
    { icon: "award", label: "Adviser", value: org.adviser },
    { icon: "pin", label: "Office", value: org.office },
    { icon: "clock", label: "Meetings", value: org.meetingSchedule },
    { icon: "file", label: "Membership fee", value: org.membershipFee },
  ].filter((f) => f.value);

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
            {rejected ? (
              <>
                <h2>Application not approved</h2>
                <p className="muted">
                  Your application to {org.shortName} was not approved. Contact the officers at{" "}
                  {org.email || "the org office"} if you think this is a mistake.
                </p>
              </>
            ) : (
              <>
                <h2>Join {org.shortName}</h2>
                <p className="muted">
                  You're signed in as <strong>{user.email}</strong>. Apply with this account and an officer will
                  review your application. You can browse events and tutoring while you wait.
                </p>
                {error && <div className="alert alert-error" role="alert">{error}</div>}
                <button type="button" className="btn btn-accent btn-block" onClick={apply} disabled={busy}>
                  {busy ? "Sending application…" : `Apply to join ${org.shortName}`}
                </button>
              </>
            )}

            <div className="join-divider"><span>or</span></div>

            <button type="button" className="btn btn-outline btn-block" onClick={() => logout("signin")}>
              Sign in with another account
            </button>
            <button type="button" className="btn btn-outline btn-block" onClick={() => logout("signup")}>
              Create a new account
            </button>
          </aside>
        </div>
      </main>
    </div>
  );
}

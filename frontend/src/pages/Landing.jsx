import { useEffect, useState } from "react";
import Icon from "../components/Icon.jsx";
import Logo from "../components/Logo.jsx";
import HeroShapes from "../components/HeroShapes.jsx";
import OrgSwitcher from "../components/OrgSwitcher.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import AuthPage from "./AuthPage.jsx";

export default function Landing() {
  const { authView, clearAuthView } = useAuth();
  const { organizations, current, selectOrg } = useOrg();
  // "home" | "signin" | "signup" (after "Sign in with another account", open that form directly)
  const [view, setView] = useState(() => authView || "home");

  useEffect(() => {
    if (authView) clearAuthView();
  }, [authView, clearAuthView]);

  if (view !== "home") {
    return <AuthPage mode={view} onModeChange={setView} onBack={() => setView("home")} />;
  }

  const openSignIn = () => setView("signin");

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="container nav-inner">
          <Logo size={36} subtitle={<OrgSwitcher />} />
        </div>
      </header>

      <main className="hero">
        <HeroShapes />
        <div className="container hero-inner">
          <p className="hero-eyebrow">
            {current.name} · {current.college}
          </p>
          <h1>
            Connect, Volunteer,
            <br />
            and Learn Together
          </h1>
          <p>
            OrgConnect brings your student organization's events, volunteer hours,
            <br className="hide-sm" /> and peer tutoring into one place.
          </p>
          <div className="hero-buttons">
            <button type="button" className="btn btn-accent btn-pill btn-lg" onClick={openSignIn}>
              Sign in to {current.shortName} <Icon name="arrowRight" size={20} />
            </button>
            <button type="button" className="btn btn-outline-navy btn-pill btn-lg" onClick={() => setView("signup")}>
              Create an account
            </button>
          </div>
        </div>
      </main>

      {organizations.length > 1 && (
        <section className="org-picker container" aria-labelledby="org-picker-title">
          <h2 id="org-picker-title">Organizations on OrgConnect</h2>
          <p className="muted">Pick your organization. One account works for every org you join.</p>
          <div className="org-cards">
            {organizations.map((org) => {
              const selected = org.slug === current.slug;
              return (
                <button
                  key={org.id}
                  type="button"
                  className={`org-card ${selected ? "is-selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => selectOrg(org.slug)}
                  style={{ "--card-navy": org.theme?.navy, "--card-highlight": org.theme?.highlight }}
                >
                  <span className="org-card-band" aria-hidden="true" />
                  <span className="org-card-college">{org.college}</span>
                  <span className="org-card-name">{org.name}</span>
                  <span className="org-card-tagline">{org.tagline}</span>
                  <span className="org-card-meta">
                    <Icon name="users" size={14} /> {org.memberCount} members
                    {org.courses?.length > 0 && <> · {org.courses.join(", ")}</>}
                  </span>
                  {selected && (
                    <span className="org-card-check">
                      <Icon name="check" size={14} /> Selected
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
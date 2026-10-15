import { useEffect, useState } from "react";
import Icon from "../components/Icon.jsx";
import Logo from "../components/Logo.jsx";
import HeroShapes from "../components/HeroShapes.jsx";
import OrgSwitcher from "../components/OrgSwitcher.jsx";
import { DEFAULT_NAVY } from "../components/OrgSwatch.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import AuthPage from "./AuthPage.jsx";

export default function Landing() {
  const { authView, clearAuthView, startOrgRegistration, endOrgRegistration } = useAuth();
  const { organizations, current, selectOrg } = useOrg();
  // "home" | "signin" | "signup" (after "Sign in with another account", open that form directly)
  const [view, setView] = useState(() => authView || "home");

  useEffect(() => {
    if (authView) clearAuthView();
  }, [authView, clearAuthView]);

  if (view !== "home") {
    return (
      <AuthPage
        mode={view}
        onModeChange={setView}
        onBack={() => {
          endOrgRegistration();
          setView("home");
        }}
      />
    );
  }

  const openSignIn = () => {
    endOrgRegistration();
    setView("signin");
  };
  // Registering a new org needs an account first; the form opens right after signing in
  const registerOrg = () => {
    startOrgRegistration();
    setView("signup");
  };

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
            <button
              type="button"
              className="btn btn-outline-navy btn-pill btn-lg"
              onClick={() => {
                endOrgRegistration();
                setView("signup");
              }}
            >
              Create an account
            </button>
          </div>
        </div>
      </main>

      {organizations.length > 0 && (
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
                  style={{ "--card-navy": org.theme?.navy || DEFAULT_NAVY }}
                  aria-pressed={selected}
                  onClick={() => selectOrg(org.slug)}
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
            <button type="button" className="org-card org-card-register" onClick={registerOrg}>
              <span className="org-register-icon" aria-hidden="true"><Icon name="plus" size={18} /></span>
              <span className="org-card-name">Register your organization</span>
              <span className="org-card-tagline">Bring your student org to OrgConnect. An admin reviews each request.</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
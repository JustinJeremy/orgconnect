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

      <main className={`hero ${organizations.length > 0 ? "has-overlap" : ""}`}>
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

      {/* Org picker: a floating card that overlaps the bottom of the hero */}
      {organizations.length > 0 && (
        <section className="org-picker container" aria-labelledby="org-picker-title">
          <div className="org-picker-card">
            <h2 id="org-picker-title">Choose your organization</h2>
            <p className="org-picker-lead">One account works for every org you join. You can switch anytime.</p>

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
                    <span className="org-card-head">
                      <span className="org-card-logo" aria-hidden="true">
                        {org.logoUrl ? <img src={org.logoUrl} alt="" /> : (org.shortName || org.name).slice(0, 2)}
                      </span>
                      <span className="org-card-title">
                        <span className="org-card-name">{org.name}</span>
                        <span className="org-card-sub">{org.tagline || org.college}</span>
                      </span>
                      {/* Radio-style marker: filled with a check on the selected org */}
                      <span className="org-card-radio" aria-hidden="true">
                        {selected && <Icon name="check" size={12} />}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="org-register-line">
              Don't see your organization?{" "}
              <button type="button" className="org-register-link" onClick={registerOrg}>
                Register it <Icon name="arrowRight" size={14} />
              </button>
            </p>
          </div>
        </section>
      )}

      <footer className="landing-footer">
        © OrgConnect {new Date().getFullYear()}. All rights reserved.
      </footer>
    </div>
  );
}
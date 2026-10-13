import Icon from "../components/Icon.jsx";
import Logo from "../components/Logo.jsx";
import LoginForm from "../components/LoginForm.jsx";
import SignUpForm from "../components/SignUpForm.jsx";
import OrgSwitcher from "../components/OrgSwitcher.jsx";
import { useOrg } from "../context/OrgContext.jsx";

export default function AuthPage({ mode, onModeChange, onBack }) {
  const { current: org } = useOrg();

  return (
    <div className="auth-page">
      <section className="auth-side">
        {/* Large faint background text (decorative) */}
        <p className="auth-watermark" aria-hidden="true">
          Manage your organization's events, track volunteer hours, connect with peer tutors all in one place
        </p>

        <button type="button" className="auth-back" onClick={onBack}>
          <Icon name="arrowLeft" size={16} /> Back to home
        </button>

        <div className="auth-side-logo">
          <Logo size={92} stacked />
          <p className="auth-tagline">Events · Volunteer hours · Peer tutoring</p>
          <div className="auth-org">
            <span className="auth-org-label">Organization</span>
            <OrgSwitcher />
            <span className="auth-org-college">{org.college}</span>
          </div>
        </div>
      </section>

      <section className="auth-main">
        <div className="auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Account">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signin"}
              className={mode === "signin" ? "active" : ""}
              onClick={() => onModeChange("signin")}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              className={mode === "signup" ? "active" : ""}
              onClick={() => onModeChange("signup")}
            >
              Sign up
            </button>
          </div>

          {mode === "signin" ? (
            <LoginForm onSwitch={() => onModeChange("signup")} />
          ) : (
            <SignUpForm onSwitch={() => onModeChange("signin")} />
          )}
        </div>
      </section>
    </div>
  );
}

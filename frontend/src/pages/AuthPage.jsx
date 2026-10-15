import { useEffect, useState } from "react";
import Icon from "../components/Icon.jsx";
import Logo from "../components/Logo.jsx";
import LoginForm from "../components/LoginForm.jsx";
import SignUpForm from "../components/SignUpForm.jsx";
import OrgSwitcher from "../components/OrgSwitcher.jsx";
import { useOrg } from "../context/OrgContext.jsx";

// The Figma frame for Sign in / Sign up is 1099 x 720. On computer screens the page is laid out
// in those exact coordinates and scaled to fit the window, so it keeps the Figma proportions
// (the card grows with the screen). Phones and narrow windows use the stacked layout instead.
const FRAME_W = 1099;
const FRAME_H = 720;

// Background text, broken into the same lines as the Figma frame (one line each on computer screens)
const WATERMARK_LINES = [
  "Manage your",
  "organization's",
  "events, track",
  "volunteer",
  "hours, and",
  "connect with",
  "peer tutors all in",
  "one place",
];

function useFrameScale() {
  // scale: null on narrow windows; gutter: space left of the centered frame, in frame units
  const measure = () => {
    if (typeof window === "undefined" || window.innerWidth < 961) return { scale: null, gutter: 0 };
    const scale = Math.min(window.innerWidth / FRAME_W, window.innerHeight / FRAME_H, 1.75);
    return { scale, gutter: Math.max(0, (window.innerWidth - FRAME_W * scale) / 2 / scale) };
  };
  const [frame, setFrame] = useState(measure);
  useEffect(() => {
    const onResize = () => setFrame(measure());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return frame;
}

export default function AuthPage({ mode, onModeChange, onBack }) {
  const { current: org } = useOrg();
  // gutter lets the background text start at the window's left edge, like in Figma
  const { scale, gutter } = useFrameScale();

  return (
    <div className={`auth-page ${scale ? "is-staged" : ""}`}>
      <div className="auth-frame" style={scale ? { width: FRAME_W * scale, height: FRAME_H * scale } : undefined}>
        <div className="auth-stage" style={scale ? { transform: `scale(${scale})` } : undefined}>
          <section className="auth-side" style={scale ? { "--frame-gutter": `${gutter}px` } : undefined}>
            {/* Large faint background text (decorative) */}
            <p className="auth-watermark" aria-hidden="true">
              {WATERMARK_LINES.map((line, i) => (
                <span key={i} className="auth-watermark-line">{line} </span>
              ))}
            </p>

            <button type="button" className="auth-back" onClick={onBack}>
              <Icon name="arrowLeft" size={16} /> Back to home
            </button>

            <div className="auth-side-logo">
              <Logo size={101} stacked />
              <div className="auth-org">
                <span className="auth-org-label">Organization</span>
                <OrgSwitcher />
                <span className="auth-org-college">{org.college}</span>
              </div>
            </div>
          </section>

          <section className={`auth-main is-${mode}`}>
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
      </div>
    </div>
  );
}

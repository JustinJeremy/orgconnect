import { useState } from "react";
import Icon from "./Icon.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useOrg } from "../context/OrgContext.jsx";

export default function LoginForm({ onSwitch }) {
  const { login } = useAuth();
  const { current: org } = useOrg();
  const [formData, setFormData] = useState({ email: "", password: "", remember: true });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
    setError("");
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    const result = await login(formData.email, formData.password, formData.remember);
    setSubmitting(false);
    if (!result.ok) setError(result.message);
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-heading">
        <h2>Welcome back</h2>
        <p>Sign in to {org.name} to see your events, hours and tutoring sessions.</p>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {info && <div className="alert alert-info">{info}</div>}

      <div className="field">
        <label htmlFor="login-email">School email</label>
        <input
          id="login-email"
          className="input"
          type="email"
          name="email"
          placeholder="you@school.edu.ph"
          value={formData.email}
          onChange={handleChange}
          autoComplete="email"
        />
      </div>

      <div className="field">
        <label htmlFor="login-password">Password</label>
        <div className="input-with-btn">
          <input
            id="login-password"
            className="input"
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="current-password"
          />
          <button
            type="button"
            className="input-icon-btn"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword(!showPassword)}
          >
            <Icon name={showPassword ? "eyeOff" : "eye"} />
          </button>
        </div>
      </div>

      <div className="form-row-between">
        {/* Remember me off: signed out when the browser closes (and after 12 hours at most) */}
        <label className="checkbox">
          <input type="checkbox" name="remember" checked={formData.remember} onChange={handleChange} />
          Remember me
        </label>
        <button
          type="button"
          className="link-btn"
          onClick={() =>
            setInfo(`Ask an officer of ${org.name} to reset it. They'll give you a temporary password to sign in with, which you can then change on your Profile page.`)
          }
        >
          Forgot password?
        </button>
      </div>

      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </button>

      <p className="auth-switch">
        Don't have an account?{" "}
        <button type="button" className="link-btn" onClick={onSwitch}>
          Sign up
        </button>
      </p>

    </form>
  );
}

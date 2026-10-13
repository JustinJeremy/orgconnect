import { useState } from "react";
import Icon from "./Icon.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import { COURSES, YEAR_LEVELS } from "../data/constants.js";

const EMPTY = {
  name: "",
  studentId: "",
  email: "",
  course: "BSIT",
  yearLevel: "1st year",
  password: "",
  confirmPassword: "",
  agree: false,
};

function validate(data) {
  const errors = {};
  if (!data.name.trim()) errors.name = "Enter your full name.";
  if (!data.studentId.trim()) errors.studentId = "Enter your student ID.";
  if (!data.email.trim()) errors.email = "Enter your school email.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Enter a valid email address.";
  if (data.password.length < 8) errors.password = "Use at least 8 characters.";
  if (data.confirmPassword !== data.password) errors.confirmPassword = "Passwords don't match.";
  if (!data.agree) errors.agree = "Please accept the org's data privacy notice.";
  return errors;
}

export default function SignUpForm({ onSwitch }) {
  const { register } = useAuth();
  const { current: org } = useOrg();
  const [formData, setFormData] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
    setErrors({ ...errors, [name]: undefined });
    setFormError("");
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(formData);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    const result = await register(formData);
    setSubmitting(false);
    if (!result.ok) setFormError(result.message);
  };

  const fieldClass = (name) => `input ${errors[name] ? "input-error" : ""}`;

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-heading">
        <h2>Create your account</h2>
        <p>
          You're applying to <strong>{org.name}</strong>. An officer will review your application.
        </p>
      </div>

      {formError && <div className="alert alert-error" role="alert">{formError}</div>}

      <div className="field">
        <label htmlFor="su-name">Full name</label>
        <input id="su-name" className={fieldClass("name")} name="name" value={formData.name} onChange={handleChange} placeholder="Juan Dela Cruz" autoComplete="name" />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </div>

      <div className="form-grid-2">
        <div className="field">
          <label htmlFor="su-id">Student ID</label>
          <input id="su-id" className={fieldClass("studentId")} name="studentId" value={formData.studentId} onChange={handleChange} placeholder="2025-00000" />
          {errors.studentId && <span className="field-error">{errors.studentId}</span>}
        </div>
        <div className="field">
          <label htmlFor="su-email">School email</label>
          <input id="su-email" type="email" className={fieldClass("email")} name="email" value={formData.email} onChange={handleChange} placeholder="you@school.edu.ph" autoComplete="email" />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>
      </div>

      <div className="form-grid-2">
        <div className="field">
          <label htmlFor="su-course">Course</label>
          <select id="su-course" className="input" name="course" value={formData.course} onChange={handleChange}>
            {COURSES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="su-year">Year level</label>
          <select id="su-year" className="input" name="yearLevel" value={formData.yearLevel} onChange={handleChange}>
            {YEAR_LEVELS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-grid-2">
        <div className="field">
          <label htmlFor="su-password">Password</label>
          <div className="input-with-btn">
            <input id="su-password" type={showPassword ? "text" : "password"} className={fieldClass("password")} name="password" value={formData.password} onChange={handleChange} placeholder="At least 8 characters" autoComplete="new-password" />
            <button type="button" className="input-icon-btn" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>
              <Icon name={showPassword ? "eyeOff" : "eye"} />
            </button>
          </div>
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>
        <div className="field">
          <label htmlFor="su-confirm">Confirm password</label>
          <input id="su-confirm" type={showPassword ? "text" : "password"} className={fieldClass("confirmPassword")} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Re-enter password" autoComplete="new-password" />
          {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
        </div>
      </div>

      <div className="field">
        <label className="checkbox">
          <input type="checkbox" name="agree" checked={formData.agree} onChange={handleChange} />
          I agree to the org's data privacy notice.
        </label>
        {errors.agree && <span className="field-error">{errors.agree}</span>}
      </div>

      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? "Creating account…" : "Create account"}
      </button>

      <p className="form-note">New accounts join as Members. Officer roles are assigned by an Org Admin.</p>

      <p className="auth-switch">
        Already have an account?{" "}
        <button type="button" className="link-btn" onClick={onSwitch}>
          Sign in
        </button>
      </p>
    </form>
  );
}

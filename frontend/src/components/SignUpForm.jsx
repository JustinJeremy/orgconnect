import { useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon.jsx";
import PrivacyNotice from "./PrivacyNotice.jsx";
import { LeaderArt, StudentArt } from "./SignUpChooser.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import { COURSES, YEAR_LEVELS } from "../data/constants.js";
import { STUDENT_ID, STUDENT_ID_ERROR, formatStudentId } from "../utils/format.js";
import { keepAllowed, textProblem } from "../utils/validation.js";

const EMPTY = {
  name: "",
  studentId: "",
  email: "",
  course: "",
  yearLevel: "1st year",
  password: "",
  confirmPassword: "",
  agree: false,
};

function validate(data) {
  const errors = {};
  if (!data.name.trim()) errors.name = "Enter your full name.";
  else if (textProblem("name", data.name, "Full name")) errors.name = textProblem("name", data.name, "Full name");
  if (!data.studentId.trim()) errors.studentId = "Enter your student ID.";
  else if (!STUDENT_ID.test(data.studentId.trim())) errors.studentId = STUDENT_ID_ERROR;
  if (!data.email.trim()) errors.email = "Enter your school email.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Enter a valid email address.";
  if (data.password.length < 8) errors.password = "Use at least 8 characters.";
  if (data.confirmPassword !== data.password) errors.confirmPassword = "Passwords don't match.";
  if (!data.agree) errors.agree = "Please accept the org's data privacy notice.";
  return errors;
}

// 0-4 from length and character variety, for the strength bar under the password
function passwordStrength(pw) {
  if (!pw) return 0;
  let score = pw.length >= 8 ? 1 : 0;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score += 1;
  else if (/\d|[^A-Za-z0-9]/.test(pw) && score > 0) score += 0.5;
  return Math.min(4, Math.round(score));
}
const STRENGTH = ["Too short", "Weak", "Okay", "Good", "Strong"];

// onBack: back to the "What brings you to OrgConnect?" choice
export default function SignUpForm({ onSwitch, onBack }) {
  const { register, registeringOrg } = useAuth();
  const { current: org } = useOrg();
  const [formData, setFormData] = useState(EMPTY);

  // Only the courses this org accepts (picking another org on this page updates the list)
  // (registering a new org: any course)
  const courses = !registeringOrg && org.courses?.length ? org.courses : COURSES;
  const course = courses.includes(formData.course) ? formData.course : courses[0];
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNotice, setShowNotice] = useState(false);

  const handleChange = (e) => {
    const { name, type, checked } = e.target;
    const value = name === "studentId" ? formatStudentId(e.target.value) : name === "name" ? keepAllowed("name", e.target.value) : e.target.value;
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
    const result = await register({ ...formData, course });
    setSubmitting(false);
    if (!result.ok) setFormError(result.message);
  };

  const fieldClass = (name) => `input ${errors[name] ? "input-error" : ""}`;
  const strength = passwordStrength(formData.password);
  const passwordsMatch = formData.confirmPassword.length > 0 && formData.confirmPassword === formData.password;

  return (
    <form className="auth-form signup-form" onSubmit={handleSubmit} noValidate>
      {onBack && (
        <div className={`signup-path ${registeringOrg ? "is-register" : "is-join"}`}>
          <span className="signup-path-art">{registeringOrg ? <LeaderArt head /> : <StudentArt head />}</span>
          <span className="signup-path-text">
            <strong>{registeringOrg ? "Registering a new organization" : `Joining ${org.shortName}`}</strong>
            <span>{registeringOrg ? "Account first, then your org's details" : "An officer will review your application"}</span>
          </span>
          <button type="button" className="signup-path-change" onClick={onBack}>
            <Icon name="arrowLeft" size={13} /> Change
          </button>
        </div>
      )}
      <div className="auth-heading">
        <h2>Create your account</h2>
        {/* The path banner above already says this */}
        {!onBack && (
          <p>
            {registeringOrg
              ? "First create your account. Next you'll fill in your organization's details."
              : "Join your org on OrgConnect. It takes less than a minute."}
          </p>
        )}
      </div>

      {formError && <div className="alert alert-error" role="alert">{formError}</div>}

      <fieldset className="signup-section">
        <legend><span className="signup-step">1</span> About you</legend>

        <div className="form-grid-2">
          <div className="field">
            <label htmlFor="su-name">Full name</label>
            <div className="input-icon">
              <Icon name="user" size={16} />
              <input id="su-name" className={fieldClass("name")} name="name" value={formData.name} onChange={handleChange} placeholder="Juan Dela Cruz" autoComplete="name" />
            </div>
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>
          <div className="field">
            <label htmlFor="su-id">Student ID</label>
            <div className="input-icon">
              <Icon name="idCard" size={16} />
              <input id="su-id" className={fieldClass("studentId")} name="studentId" value={formData.studentId} onChange={handleChange} placeholder="2025-00000" inputMode="numeric" maxLength={10} />
            </div>
            {errors.studentId && <span className="field-error">{errors.studentId}</span>}
          </div>
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label htmlFor="su-course">Course</label>
            <select id="su-course" className="input" name="course" value={course} onChange={handleChange}>
              {courses.map((c) => (
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
      </fieldset>

      <fieldset className="signup-section">
        <legend><span className="signup-step">2</span> Your login</legend>

        <div className="field">
          <label htmlFor="su-email">School email</label>
          <div className="input-icon">
            <Icon name="mail" size={16} />
            <input id="su-email" type="email" className={fieldClass("email")} name="email" value={formData.email} onChange={handleChange} placeholder="you@school.edu.ph" autoComplete="email" />
          </div>
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label htmlFor="su-password">Password</label>
            <div className="input-icon input-with-btn">
              <Icon name="lock" size={16} />
              <input id="su-password" type={showPassword ? "text" : "password"} className={fieldClass("password")} name="password" value={formData.password} onChange={handleChange} placeholder="At least 8 characters" autoComplete="new-password" />
              <button type="button" className="input-icon-btn" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>
                <Icon name={showPassword ? "eyeOff" : "eye"} />
              </button>
            </div>
            {formData.password && (
              <div className={`signup-strength is-${strength}`} aria-live="polite">
                <span className="signup-strength-bars" aria-hidden="true"><i /><i /><i /><i /></span>
                {STRENGTH[strength]}
              </div>
            )}
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>
          <div className="field">
            <label htmlFor="su-confirm">Confirm password</label>
            <div className="input-icon">
              <Icon name="lock" size={16} />
              <input id="su-confirm" type={showPassword ? "text" : "password"} className={fieldClass("confirmPassword")} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Re-enter password" autoComplete="new-password" />
              {passwordsMatch && <span className="signup-match" aria-label="Passwords match"><Icon name="check" size={14} /></span>}
            </div>
            {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
          </div>
        </div>
      </fieldset>

      <div className="field">
        <label className="checkbox">
          <input type="checkbox" name="agree" checked={formData.agree} onChange={handleChange} />
          <span>
            I agree to the org's{" "}
            <button
              type="button"
              className="link-btn"
              onClick={(e) => {
                e.preventDefault(); // don't tick the box
                setShowNotice(true);
              }}
            >
              data privacy notice
            </button>.
          </span>
        </label>
        {errors.agree && <span className="field-error">{errors.agree}</span>}
      </div>

      <button type="submit" className="btn btn-primary btn-block signup-submit" disabled={submitting}>
        {submitting ? "Creating account…" : <>Create account <Icon name="arrowRight" size={16} /></>}
      </button>

      <p className="form-note">New accounts join as Members. The org's President assigns officer roles.</p>
      {/* In <body>, so the auth card's zoom doesn't apply to it */}
      {showNotice && createPortal(<PrivacyNotice org={org} onClose={() => setShowNotice(false)} />, document.body)}
    </form>
  );
}

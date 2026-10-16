import { useCallback, useEffect, useState } from "react";
import Icon from "../components/Icon.jsx";
import Logo from "../components/Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import { orgRequestsApi } from "../api/services.js";
import { errorMessage } from "../api/client.js";
import { COURSES } from "../data/constants.js";
import { shortDate } from "../utils/format.js";
import { UserAvatar } from "../components/Avatars.jsx";

// Bring a new org onto OrgConnect: the request form, then its status.
//   Pending  -> waiting for an OrgConnect admin
//   Active   -> approved: you're its President, open it
//   Rejected -> the admin's reason, and the form again (filled in) to send a new request
const COMMON_COURSES = COURSES.filter((c) => c !== "Other");
const EMPTY = { name: "", shortName: "", college: "", tagline: "", description: "", adviser: "", email: "", proofUrl: "" };

export default function RegisterOrg() {
  const { user, logout, endOrgRegistration, reloadOrgRequests } = useAuth();
  const [requests, setRequests] = useState(null); // null while loading
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoadError("");
    try {
      setRequests(await orgRequestsApi.mine());
      reloadOrgRequests(); // the org menu shows the latest request's status
    } catch (error) {
      setLoadError(errorMessage(error));
    }
  }, [reloadOrgRequests]);

  useEffect(() => {
    load();
  }, [load]);

  const latest = requests?.[0];
  const showForm = requests && (!latest || latest.status === "Rejected");

  return (
    <div className="join-page register-page">
      <header className="join-nav">
        <Logo size={36} subtitle="Register an organization" />
        <div className="join-user">
          <UserAvatar user={user} className="sm" />
          <span className="join-user-name">{user.name}</span>
          <button type="button" className="icon-btn" aria-label="Sign out" onClick={() => logout()}>
            <Icon name="logout" />
          </button>
        </div>
      </header>

      <main className="join-main register-main">
        <div className="register-head">
          <h1>Register your organization</h1>
          <p>Tell us about your org. An OrgConnect admin reviews every request before the org goes live.</p>
        </div>

        {loadError && (
          <div className="banner banner-error" role="alert">
            <span>{loadError}</span>
            <button type="button" className="btn btn-outline btn-sm" onClick={load}>Try again</button>
          </div>
        )}

        {!requests && !loadError && <div className="panel"><div className="skeleton-list" aria-hidden="true"><span /><span /><span /></div></div>}

        {requests && (
          <div className="register-grid">
            {showForm ? (
              <RequestForm previous={latest} onSent={load} onCancel={endOrgRegistration} />
            ) : (
              <RequestStatus request={latest} onClose={endOrgRegistration} />
            )}
            <HowItWorks request={showForm ? null : latest} email={user.email} />
          </div>
        )}
      </main>
    </div>
  );
}

function RequestForm({ previous, onSent, onCancel }) {
  // After a rejection, start from what was sent last time
  const [form, setForm] = useState(() =>
    previous ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, previous[k] || ""])) : EMPTY
  );
  const [courses, setCourses] = useState(previous?.courses || []);
  const [newCourse, setNewCourse] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);

  const change = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
    setFormError("");
  };

  const toggleCourse = (course) => {
    setCourses((list) => (list.includes(course) ? list.filter((c) => c !== course) : [...list, course]));
    setErrors({ ...errors, courses: undefined });
  };

  // Any course the school offers, not only the common ones
  const addCourse = () => {
    const course = newCourse.trim().toUpperCase();
    if (!course) return;
    if (!courses.includes(course)) setCourses([...courses, course]);
    setNewCourse("");
    setErrors({ ...errors, courses: undefined });
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    ["name", "shortName", "college", "tagline", "description", "adviser", "email"].forEach((k) => {
      if (!form[k].trim()) found[k] = "Required.";
    });
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) found.email = "Enter a valid email address.";
    if (!courses.length) found.courses = "Pick at least one course that can join.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSending(true);
    try {
      await orgRequestsApi.create({ ...form, proofUrl: form.proofUrl.trim() || null, courses });
      await onSent();
    } catch (error) {
      setFormError(errorMessage(error));
      setSending(false);
    }
  };

  const field = (name, label, props = {}) => (
    <div className="field">
      <label htmlFor={`ro-${name}`}>{label}</label>
      <input id={`ro-${name}`} className={`input ${errors[name] ? "input-error" : ""}`} name={name} value={form[name]} onChange={change} {...props} />
      {errors[name] && <span className="field-error">{errors[name]}</span>}
    </div>
  );

  const allCourses = [...COMMON_COURSES, ...courses.filter((c) => !COMMON_COURSES.includes(c))];

  return (
    <form className="panel register-form" onSubmit={submit} noValidate data-tour="register-form">
      {previous?.status === "Rejected" && (
        <div className="join-reason">
          <div className="muted small">Your request for {previous.name} was not approved{previous.reviewedAt && ` · ${shortDate(previous.reviewedAt)}`}</div>
          <p>{previous.reviewNote}</p>
        </div>
      )}
      {formError && <div className="alert alert-error" role="alert">{formError}</div>}

      {field("name", "Organization name", { placeholder: "e.g. Junior Philippine Computer Society – TIP" })}
      <div className="form-grid">
        {field("shortName", "Short name", { placeholder: "e.g. JPCS", maxLength: 20 })}
        {field("college", "College", { placeholder: "e.g. College of Computer Studies" })}
      </div>
      {field("tagline", "Tagline", { placeholder: "e.g. Building tomorrow's IT leaders, together", maxLength: 160 })}
      <div className="field">
        <label htmlFor="ro-description">About the organization</label>
        <textarea id="ro-description" className={`input ${errors.description ? "input-error" : ""}`} name="description" rows="3" placeholder="e.g. What your org does, who it's for and its regular activities" value={form.description} onChange={change} />
        {errors.description && <span className="field-error">{errors.description}</span>}
      </div>
      <div className="form-grid">
        {field("adviser", "Adviser", { placeholder: "e.g. Engr. Paolo Dizon" })}
        {field("email", "Contact email", { type: "email", placeholder: "e.g. org@school.edu.ph" })}
      </div>

      <fieldset className="field course-picker" data-tour="register-courses">
        <legend>Courses that can join</legend>
        <div className="course-chips">
          {allCourses.map((c) => (
            <button
              key={c}
              type="button"
              className={`course-chip ${courses.includes(c) ? "is-on" : ""}`}
              aria-pressed={courses.includes(c)}
              onClick={() => toggleCourse(c)}
            >
              <span className="course-dot" aria-hidden="true" /> {c}
            </button>
          ))}
        </div>
        <div className="course-add">
          <label htmlFor="ro-course" className="sr-only">Add another course</label>
          <input
            id="ro-course"
            className="input"
            placeholder="Another course, e.g. BSCpE"
            maxLength={20}
            value={newCourse}
            onChange={(e) => setNewCourse(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCourse();
              }
            }}
          />
          <button type="button" className="btn btn-outline" onClick={addCourse} disabled={!newCourse.trim()}>
            <Icon name="plus" size={16} /> Add
          </button>
        </div>
        {errors.courses && <span className="field-error">{errors.courses}</span>}
      </fieldset>

      {field("proofUrl", <>Proof of recognition <span className="muted">Optional</span></>, { placeholder: "e.g. a Google Drive link to your school recognition letter" })}

      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={sending}>{sending ? "Sending…" : "Submit for review"}</button>
      </div>
    </form>
  );
}

function RequestStatus({ request, onClose }) {
  const { switchOrg, reload } = useOrg();
  const [opening, setOpening] = useState(false);

  // Approved: load the org list again (the new org wasn't in it yet) and switch to it
  const openOrg = async () => {
    setOpening(true);
    await reload();
    switchOrg(request.slug);
    onClose();
  };

  if (request.status === "Active") {
    return (
      <section className="panel register-status">
        <p className="join-state is-live"><Icon name="check" size={16} /> Approved</p>
        <h2>{request.name} is live</h2>
        <p className="muted">
          You're its President. Next, add your officers from Members &amp; Hours, then share the org so students can
          apply.
        </p>
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Back</button>
          <button type="button" className="btn btn-accent" onClick={openOrg} disabled={opening}>
            {opening ? "Opening…" : `Open ${request.shortName}`}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel register-status">
      <p className="join-state is-pending"><Icon name="clock" size={16} /> Waiting for review</p>
      <h2>{request.name}</h2>
      <p className="muted">Sent {shortDate(request.submittedAt)}. An OrgConnect admin will check the details and you'll see the result here.</p>
      <dl className="join-facts">
        <div><dt>Short name</dt><dd>{request.shortName}</dd></div>
        <div><dt>College</dt><dd>{request.college}</dd></div>
        <div><dt>Adviser</dt><dd>{request.adviser}</dd></div>
        <div><dt>Courses</dt><dd>{request.courses.join(", ")}</dd></div>
      </dl>
      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={onClose}>Back</button>
      </div>
    </section>
  );
}

function HowItWorks({ request, email }) {
  const sent = Boolean(request);
  const live = request?.status === "Active";
  return (
    <aside className="panel register-how">
      <h2>How it works</h2>
      <ol className="join-steps">
        <li className={sent ? "done" : "now"}>
          <span className="join-dot">{sent && <Icon name="check" size={14} />}</span>
          <div>
            <div className="strong">Submit this form</div>
            <div className="muted small">Signed in as {email}</div>
          </div>
        </li>
        <li className={live ? "done" : sent ? "now" : ""}>
          <span className="join-dot">{live && <Icon name="check" size={14} />}</span>
          <div>
            <div className="strong">Admin review</div>
            <div className="muted small">OrgConnect admins check the details</div>
          </div>
        </li>
        <li className={live ? "done" : ""}>
          <span className="join-dot">{live && <Icon name="check" size={14} />}</span>
          <div>
            <div className="strong">Your org goes live</div>
            <div className="muted small">Members can find it and apply to join</div>
          </div>
        </li>
      </ol>
      <p className="join-note">
        <Icon name="alert" size={16} /> You'll be the org's first President. You can add the other officers once it's approved.
      </p>
    </aside>
  );
}

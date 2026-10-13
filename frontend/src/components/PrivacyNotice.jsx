import Modal from "./Modal.jsx";

// Data privacy notice shown from the sign-up form (Data Privacy Act of 2012, RA 10173).
// Uses the selected org's own name and contact email.
export default function PrivacyNotice({ org, onClose }) {
  const contact = org.email ? <a href={`mailto:${org.email}`}>{org.email}</a> : "the org's officers";

  return (
    <Modal
      title="Data privacy notice"
      subtitle={org.name}
      onClose={onClose}
      footer={
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      }
    >
      <div className="privacy-notice">
        <h3>What we collect</h3>
        <p>
          Your name, student ID, school email, course and year level, plus the records you create in OrgConnect: event
          RSVPs and attendance, volunteer hour logs, tutoring sessions and requests, and certificates.
        </p>

        <h3>Why</h3>
        <p>
          To review your membership application, manage the member roster, verify volunteer hours, run peer tutoring and
          issue attendance certificates for {org.name}.
        </p>

        <h3>Who can see it</h3>
        <p>
          The officers of {org.name}. Other members can see your name on events you attend, on tutoring sessions, on
          announcements you post and on the volunteer hours leaderboard. Your data isn't shared outside the organization.
        </p>

        <h3>How long we keep it</h3>
        <p>For as long as you are a member, or until you ask us to remove it.</p>

        <h3>Your rights</h3>
        <p>
          Under the Data Privacy Act of 2012 (RA 10173) you can access and correct your data (most of it is editable on
          your Profile page) and ask for it to be deleted. Contact {contact}.
        </p>
      </div>
    </Modal>
  );
}

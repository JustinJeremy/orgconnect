import { percent, todayIso } from "../utils/format.js";

// "Today" or "Ended" beside the date (a session meets once, on its date)
export function sessionState(session) {
  if (session.finished) return "Ended";
  return session.date === todayIso() ? "Today" : null;
}

// How many of its slots are taken and how many are left, with a bar (also in the session's details)
export function SlotMeter({ session }) {
  const total = session.slots + (session.taken || 0);
  return (
    <div className="capacity">
      <span>
        <strong>{session.taken || 0}</strong> of {total} {total === 1 ? "slot" : "slots"} taken ·{" "}
        <span className={session.slots < 1 ? "slots-full" : "slots-left"}>{session.slots < 1 ? "Full" : `${session.slots} left`}</span>
      </span>
      <div className="meter" aria-hidden="true">
        <span style={{ width: `${percent(session.taken || 0, total)}%` }} />
      </div>
    </div>
  );
}

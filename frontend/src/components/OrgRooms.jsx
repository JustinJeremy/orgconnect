import { useState } from "react";
import Icon from "./Icon.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import { orgsApi } from "../api/services.js";
import { errorMessage } from "../api/client.js";
import { textProblem } from "../utils/validation.js";

// Officers (Profile): the rooms and venues offered in the location dropdowns of events and tutoring.
// Anyone can still pick "Other" and type a place that isn't on the list.
export default function OrgRooms({ flash }) {
  const { current: org, reload } = useOrg();
  const [rooms, setRooms] = useState(org.rooms || []);
  const [newRoom, setNewRoom] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const changed = rooms.join("\n") !== (org.rooms || []).join("\n");

  const add = () => {
    const room = newRoom.trim().replace(/\s+\+\s+/g, " ");
    if (!room) return;
    const problem = textProblem("words", room, "A room");
    if (problem) return setError(problem);
    if (rooms.some((r) => r.toLowerCase() === room.toLowerCase())) return setError("That room is already on the list.");
    setRooms([...rooms, room]);
    setNewRoom("");
    setError("");
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await orgsApi.updateRooms(rooms);
      await reload(); // the forms read the list from the org
      flash("Rooms saved");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="course-chips">
        {rooms.length === 0 && <span className="muted small">No rooms yet. Add the places your org uses.</span>}
        {rooms.map((r) => (
          <span key={r} className="course-chip is-on">
            <Icon name="pin" size={12} /> {r}
            <button type="button" className="chip-remove" aria-label={`Remove ${r}`} onClick={() => setRooms(rooms.filter((x) => x !== r))}>
              <Icon name="close" size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="course-add">
        <label htmlFor="org-room" className="sr-only">Add a room</label>
        <input
          id="org-room"
          className="input"
          placeholder="Add a room, e.g. Computer Lab 3"
          maxLength={80}
          value={newRoom}
          onChange={(e) => {
            setNewRoom(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn btn-outline" onClick={add} disabled={!newRoom.trim()}>
          <Icon name="plus" size={16} /> Add
        </button>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-primary" onClick={save} disabled={busy || !changed}>
          {busy ? "Saving…" : "Save rooms"}
        </button>
      </div>
    </div>
  );
}

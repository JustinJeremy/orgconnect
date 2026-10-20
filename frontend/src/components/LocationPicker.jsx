import { useState } from "react";
import { PLATFORMS } from "../data/constants.js";

// Where an event or tutoring session happens, picked from the org's rooms and the meeting apps,
// or "Other" to type a place. Saved as one text: F2F "Room 210" · Online "Zoom" · Hybrid "Room 210 + Zoom".
const OTHER = "__other";

function parts(value = "", mode) {
  if (mode === "Online") return { room: "", online: value };
  const [room = "", online = ""] = value.split(" + ");
  return { room, online: mode === "Hybrid" ? online : "" };
}

function join({ room, online }, mode) {
  if (mode === "Online") return online;
  if (mode === "Hybrid") return `${room} + ${online}`;
  return room;
}

// The location when the format changes, keeping what still fits (Hybrid -> F2F keeps the room)
export function locationForMode(value, from, to) {
  return join(parts(value, from), to);
}

// Missing half of a location ("" when it's complete)
export function locationProblem(value, mode) {
  const { room, online } = parts(value, mode);
  if (mode !== "Online" && !room.trim()) return "Pick a room or venue.";
  if (mode !== "F2F" && !online.trim()) return "Pick where to meet online.";
  return "";
}

function Choice({ id, label, options, value, onChange, otherPlaceholder, hint, invalid }) {
  const [other, setOther] = useState(value !== "" && !options.includes(value));
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className={`input ${invalid ? "input-error" : ""}`}
        value={other ? OTHER : value}
        onChange={(e) => {
          const picked = e.target.value;
          setOther(picked === OTHER);
          onChange(picked === OTHER ? "" : picked);
        }}
      >
        <option value="" disabled>Choose…</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
        <option value={OTHER}>Other (type it)</option>
      </select>
      {other && (
        <input
          className={`input location-other ${invalid ? "input-error" : ""}`}
          aria-label={`${label}, other`}
          value={value}
          maxLength={120}
          placeholder={otherPlaceholder}
          onChange={(e) => onChange(e.target.value.replace(" + ", " "))}
          autoFocus
        />
      )}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

// rooms: the org's list (org.rooms); error: shown under the last field
export default function LocationPicker({ idPrefix, mode, value, rooms = [], onChange, error }) {
  const current = parts(value, mode);
  const set = (key) => (text) => onChange(join({ ...current, [key]: text }, mode));
  return (
    <>
      {mode !== "Online" && (
        <Choice
          key={`room-${mode}`}
          id={`${idPrefix}-room`}
          label="Room or venue"
          options={rooms}
          value={current.room}
          onChange={set("room")}
          otherPlaceholder="e.g. CCS Building, Room 401"
          hint={!rooms.length ? "Officers can add the org's rooms on their Profile page." : ""}
          invalid={Boolean(error)}
        />
      )}
      {mode !== "F2F" && (
        <Choice
          key={`online-${mode}`}
          id={`${idPrefix}-online`}
          label="Online meeting"
          options={PLATFORMS}
          value={current.online}
          onChange={set("online")}
          otherPlaceholder="e.g. a Discord server or meeting link"
          invalid={Boolean(error)}
        />
      )}
      {error && <span className="field-error span-2">{error}</span>}
    </>
  );
}

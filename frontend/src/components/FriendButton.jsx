import { useState } from "react";
import Icon from "./Icon.jsx";
import { peopleApi } from "../api/services.js";
import { errorMessage } from "../api/client.js";

// Add friend / Requested / Accept / Friends, depending on where you stand with this person.
// state: none | sent | received | friends | self; onChange(newState) after the server agrees
export default function FriendButton({ person, state, onChange, flash, size = "btn-sm" }) {
  const [busy, setBusy] = useState(false);
  if (state === "self") return null;

  const run = async (call, message) => {
    setBusy(true);
    try {
      const { friendship } = await call(person.id);
      onChange(friendship);
      flash?.(message);
    } catch (error) {
      flash?.(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  if (state === "friends") {
    return (
      <span className="friend-state">
        <Icon name="check" size={14} /> Friends
      </span>
    );
  }
  if (state === "sent") {
    return (
      <button type="button" className={`btn btn-outline ${size}`} disabled={busy} onClick={() => run(peopleApi.remove, "Friend request cancelled")}>
        Requested · Cancel
      </button>
    );
  }
  if (state === "received") {
    return (
      <button type="button" className={`btn btn-primary ${size}`} disabled={busy} onClick={() => run(peopleApi.accept, `You and ${person.name} are now friends`)}>
        <Icon name="check" size={15} /> Accept request
      </button>
    );
  }
  return (
    <button type="button" className={`btn btn-outline ${size}`} disabled={busy} onClick={() => run(peopleApi.add, `Friend request sent to ${person.name}`)}>
      <Icon name="plus" size={15} /> Add friend
    </button>
  );
}

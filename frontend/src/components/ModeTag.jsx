import { EVENT_MODES } from "../data/constants.js";

// Small label next to an event's location: F2F, Online or Hybrid
export default function ModeTag({ mode }) {
  if (!mode) return null;
  return (
    <span className={`mode-tag mode-${mode.toLowerCase()}`} title={EVENT_MODES[mode]}>
      {mode}
    </span>
  );
}

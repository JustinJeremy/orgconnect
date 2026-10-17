import { useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import { themesApi } from "../api/services.js";

// An org's color: a swatch and its name ({ label, color })
export function ColorTag({ color }) {
  if (!color) return null;
  return (
    <span className="color-tag">
      <span className="color-dot" style={{ background: color.color }} aria-hidden="true" /> {color.label}
    </span>
  );
}

// Pick the org's color: shades of blue no other org has (taken ones are shown but can't be picked).
// A small preview shows the sidebar, a button and a tag in that color.
// value: a key or "" (keep the current / default navy); onChange(key)
export function ColorPicker({ value, onChange, current, label = "Organization color" }) {
  const [options, setOptions] = useState(null);

  useEffect(() => {
    themesApi.list().then(setOptions).catch(() => setOptions([]));
  }, []);

  if (!options) return <div className="skeleton-list" aria-hidden="true"><span /></div>;
  const picked = options.find((o) => o.key === value);

  return (
    <fieldset className="field color-picker">
      <legend>{label}</legend>
      <div className="color-options" role="radiogroup">
        <button
          type="button"
          role="radio"
          aria-checked={!value}
          className={`color-option ${!value ? "is-on" : ""}`}
          onClick={() => onChange("")}
        >
          <span className="color-swatch" style={{ background: current?.color || "#1b3a6b" }} />
          <span>{current ? `Keep ${current.label}` : "Navy (default)"}</span>
        </button>
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={value === o.key}
            className={`color-option ${value === o.key ? "is-on" : ""}`}
            disabled={o.taken}
            title={o.taken ? "Another organization uses this color" : o.label}
            onClick={() => onChange(o.key)}
          >
            <span className="color-swatch" style={{ background: o.theme.navy }}>
              {value === o.key && <Icon name="check" size={14} />}
            </span>
            <span>{o.label}{o.taken && <span className="muted"> · taken</span>}</span>
          </button>
        ))}
      </div>
      {picked && (
        <div className="color-preview" aria-hidden="true">
          <span className="color-preview-side" style={{ background: picked.theme.navy }} />
          <span className="color-preview-body" style={{ background: picked.theme.bg }}>
            <span className="color-preview-btn" style={{ background: picked.theme.navy }}>Button</span>
            <span className="color-preview-tag" style={{ background: picked.theme.skySoft, color: picked.theme.navy }}>Tag</span>
          </span>
        </div>
      )}
    </fieldset>
  );
}

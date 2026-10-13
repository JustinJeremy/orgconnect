// Decorative soft 3D rings (the O and C shapes from the logo).
// Purely visual: hidden from screen readers.
//
// <Rings preset="hero" />   big rings in the four corners (homepage hero)
// <Rings preset="panel" />  smaller rings for banners and side panels

import { useId } from "react";

export function Ring({ kind = "o", size, style, from, to }) {
  const id = `ring${useId().replace(/:/g, "")}`;
  return (
    <svg className="ring" width={size} height={size} viewBox="0 0 200 200" style={style} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: from }} />
          <stop offset="1" style={{ stopColor: to }} />
        </linearGradient>
        <radialGradient id={`${id}-h`} cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      {kind === "o" ? (
        <>
          <circle cx="100" cy="100" r="64" fill="none" stroke={`url(#${id}-g)`} strokeWidth="46" />
          <circle cx="100" cy="100" r="64" fill="none" stroke={`url(#${id}-h)`} strokeWidth="46" />
        </>
      ) : (
        <>
          <path d="M150 52 A66 66 0 1 0 150 148" fill="none" stroke={`url(#${id}-g)`} strokeWidth="44" strokeLinecap="round" />
          <path d="M150 52 A66 66 0 1 0 150 148" fill="none" stroke={`url(#${id}-h)`} strokeWidth="44" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

const PRESETS = {
  hero: [
    { kind: "c", size: 340, from: "#A5B4FC", to: "#BAE6FD", style: { top: -90, left: -110, transform: "rotate(160deg)" } },
    { kind: "o", size: 300, from: "#99F6E4", to: "#BAE6FD", style: { top: -60, right: -120 } },
    { kind: "o", size: 300, from: "#BAE6FD", to: "#A5B4FC", style: { bottom: -110, left: 20 } },
    { kind: "c", size: 300, from: "#A5B4FC", to: "#99F6E4", style: { bottom: -120, right: -40, transform: "rotate(-30deg)" } },
  ],
  panel: [
    { kind: "o", size: 260, from: "#BAE6FD", to: "#A5B4FC", style: { top: -80, right: -70 } },
    { kind: "c", size: 220, from: "#99F6E4", to: "#A5B4FC", style: { bottom: -90, left: -60, transform: "rotate(200deg)" } },
  ],
  banner: [
    { kind: "o", size: 220, from: "#BAE6FD", to: "#A5B4FC", style: { top: -70, right: 60 } },
    { kind: "c", size: 200, from: "#99F6E4", to: "#BAE6FD", style: { bottom: -110, right: -40, transform: "rotate(-20deg)" } },
  ],
  // sidebar / dark follow the selected org's palette
  sidebar: [
    { kind: "o", size: 220, from: "var(--ring-1)", to: "var(--ring-2)", style: { bottom: 70, right: -110, opacity: 0.55 } },
    { kind: "c", size: 200, from: "var(--ring-2)", to: "var(--ring-1)", style: { bottom: -110, left: -70, transform: "rotate(200deg)", opacity: 0.45 } },
  ],
  dark: [
    { kind: "o", size: 240, from: "var(--ring-1)", to: "var(--ring-2)", style: { top: -90, right: -60, opacity: 0.6 } },
    { kind: "c", size: 220, from: "var(--ring-2)", to: "var(--ring-1)", style: { bottom: -100, left: -50, transform: "rotate(200deg)", opacity: 0.5 } },
  ],
};

export default function Rings({ preset = "hero" }) {
  return (
    <div className="rings" aria-hidden="true">
      {PRESETS[preset].map((r, i) => (
        <Ring key={i} {...r} />
      ))}
    </div>
  );
}

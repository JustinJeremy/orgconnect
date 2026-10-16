// OrgConnect logo — Linked O + C mark
//
// <Logo />                    mark + wordmark in a row
// <Logo stacked size={88} />  mark above the wordmark (auth pages)
// <Logo variant="white" />    for navy / dark backgrounds
// <Logo showText={false} />   mark only

const C_ARC = "M46.71 22.81 A12 12 0 1 0 46.71 41.19";
// Crossings: a background-colored gap, then the letter that passes over
const GAP_TOP = "M27.90 20.36 A12 12 0 0 1 35.06 25.46";
const O_TOP = "M26.05 20.04 A12 12 0 0 1 35.88 26.93";
const GAP_BOTTOM = "M36.10 43.64 A12 12 0 0 1 28.94 38.54";
const C_BOTTOM = "M37.95 43.95 A12 12 0 0 1 28.12 37.07";

// Colors come from the selected org's palette (CSS variables), so the mark matches each org
export function LogoMark({ size = 38, variant = "color" }) {
  const white = variant === "white";
  const bg = white ? "#FFFFFF" : "var(--logo-bg)";
  const ring = white ? "var(--logo-bg)" : "#FFFFFF";

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo-mark">
      <rect width="64" height="64" rx="16" style={{ fill: bg }} />
      <circle cx="25" cy="32" r="12" fill="none" strokeWidth="5" style={{ stroke: ring }} />
      <path d={C_ARC} fill="none" strokeWidth="5" strokeLinecap="round" style={{ stroke: "var(--highlight)" }} />
      <path d={GAP_TOP} fill="none" strokeWidth="9" style={{ stroke: bg }} />
      <path d={O_TOP} fill="none" strokeWidth="5" style={{ stroke: ring }} />
      <path d={GAP_BOTTOM} fill="none" strokeWidth="9" style={{ stroke: bg }} />
      <path d={C_BOTTOM} fill="none" strokeWidth="5" style={{ stroke: "var(--highlight)" }} />
    </svg>
  );
}

// onHome: makes the mark and the word "OrgConnect" a button to the home page (Dashboard / Overview)
export default function Logo({ size = 36, variant = "color", showText = true, stacked = false, subtitle, onHome }) {
  const classes = ["logo", stacked ? "logo-stacked" : "", variant === "white" ? "logo-white" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} role={typeof subtitle === "object" ? undefined : "img"} aria-label={typeof subtitle === "object" ? undefined : "OrgConnect"}>
      {onHome ? (
        <button type="button" className="logo-home" onClick={onHome} aria-label="OrgConnect: go to the home page" title="Home">
          <LogoMark size={size} variant={variant} />
        </button>
      ) : (
        <LogoMark size={size} variant={variant} />
      )}
      {showText && (
        <span className="logo-text">
          {onHome ? (
            <button type="button" className="logo-home logo-word" style={{ fontSize: size * 0.56 }} onClick={onHome} tabIndex={-1} aria-hidden="true">
              OrgConnect
            </button>
          ) : (
            <span className="logo-word" style={{ fontSize: stacked ? size * 0.52 : size * 0.56 }}>
              OrgConnect
            </span>
          )}
          {subtitle && <span className="logo-sub">{subtitle}</span>}
        </span>
      )}
    </span>
  );
}

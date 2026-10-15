// An org's own colors (organizations.theme) in place of the default navy palette in App.css :root.
// An org with no theme ({}) keeps the default Figma palette (navy #1B3A6B, sky #D0E6F4, orange #F58A1F).
// Only the "navy" and "sky" families change; the orange accent and the status colors stay the same.
const VARS = {
  navy: ["--c-navy"], // also --navy, --brand and --primary (they point at --c-navy)
  navyDark: ["--navy-dark"],
  navy2: ["--navy-2"],
  sky: ["--c-sky"],
  skySoft: ["--sky-soft", "--tint", "--primary-soft"],
  skyRgb: ["--sky-rgb"], // "r, g, b" for see-through sky on the sidebar
  bg: ["--bg"],
  primaryLine: ["--primary-line"],
  sidebarMuted: ["--sidebar-muted"],
  ring1: ["--ring-1"],
  ring2: ["--ring-2"],
  pageFrom: ["--page-from"], // left edge of the page background gradient
  softInk: ["--soft-ink"], // secondary text (Figma #57708d)
  softInk2: ["--soft-ink-2"], // dates and small print
  cardLine: ["--card-line"],
  cardLineStrong: ["--card-line-strong"],
  metaInk: ["--meta-ink"],
  metaInkStrong: ["--meta-ink-strong"],
};

const DEFAULT_META = "#1b3a6b";

// Platform admin console: charcoal and greys instead of an org's colors (mockup 5)
export const ADMIN_THEME = {
  navy: "#1f2328", navyDark: "#121417", navy2: "#353a41",
  sky: "#e3e6ea", skySoft: "#f1f3f5", skyRgb: "227, 230, 234", bg: "#f5f6f7",
  primaryLine: "#cdd2d8", sidebarMuted: "#b3b9c1", ring1: "#3a4048", ring2: "#2c3137",
  pageFrom: "#eff1f3", softInk: "#5f6670", softInk2: "#9aa1aa",
  cardLine: "#e1e4e8", cardLineStrong: "#c8cdd4", metaInk: "#646b75", metaInkStrong: "#3f454d",
};

export function applyTheme(theme) {
  const root = document.documentElement.style;
  Object.entries(VARS).forEach(([key, cssVars]) =>
    cssVars.forEach((cssVar) => (theme?.[key] ? root.setProperty(cssVar, theme[key]) : root.removeProperty(cssVar)))
  );
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme?.navy || DEFAULT_META);
}

// CSS variables an org theme used to override (kept so old overrides get cleared).
const VARS = {
  navy: "--navy",
  navyDark: "--navy-dark",
  navy2: "--navy-2",
  brand: "--brand",
  accent: "--accent",
  accentDark: "--accent-dark",
  highlight: "--highlight",
  bg: "--bg",
  tint: "--tint",
  primarySoft: "--primary-soft",
  primaryLine: "--primary-line",
  accentSoft: "--orange-soft",
  sidebarMuted: "--sidebar-muted",
  ring1: "--ring-1",
  ring2: "--ring-2",
};

// Every organization now uses the same three-color palette defined in App.css :root
// (navy #1B3A6B, sky #D0E6F4, orange #F58A1F). A theme stored for an org in the
// database is ignored on purpose: this only clears any override left from before.
export function applyTheme() {
  const root = document.documentElement.style;
  Object.values(VARS).forEach((cssVar) => root.removeProperty(cssVar));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", "#1b3a6b");
}

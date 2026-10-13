// Each organization has its own color palette (stored in the database as `theme`).
// Applying it overrides the CSS variables defined in App.css :root.
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

export function applyTheme(theme = {}) {
  const root = document.documentElement.style;
  Object.entries(VARS).forEach(([key, cssVar]) => {
    if (theme[key]) root.setProperty(cssVar, theme[key]);
    else root.removeProperty(cssVar);
  });
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && theme.navy) meta.setAttribute("content", theme.navy);
}

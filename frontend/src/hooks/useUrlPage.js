import { useCallback, useEffect, useState } from "react";

// Keeps the page you're on in the address bar, e.g. /events or /admin/requests, so that:
//   refreshing stays on that page, Back and Forward work, and links can open in a new tab.
// pages: the page keys this app has; fallback: the page for "/" or an unknown address;
// prefix: "" for the org app, "/admin" for the admin console.
const pageFromPath = (pages, fallback, prefix) => {
  const path = window.location.pathname.replace(/\/+$/, "");
  const key = path.startsWith(`${prefix}/`) ? path.slice(prefix.length + 1) : "";
  return pages.includes(key) ? key : fallback;
};

export const pagePath = (page, prefix = "") => `${prefix}/${page}`;

export default function useUrlPage(pages, fallback, prefix = "") {
  const [page, setPageState] = useState(() => pageFromPath(pages, fallback, prefix));

  // An unknown or bare address ("/") shows the fallback page: put its address in the bar
  useEffect(() => {
    if (window.location.pathname !== pagePath(page, prefix)) {
      window.history.replaceState(null, "", pagePath(page, prefix) + window.location.search);
    }
    // Only once, when the app opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back / Forward
  useEffect(() => {
    const onPop = () => setPageState(pageFromPath(pages, fallback, prefix));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [pages, fallback, prefix]);

  const setPage = useCallback(
    (next) => {
      setPageState(next);
      if (window.location.pathname !== pagePath(next, prefix)) window.history.pushState(null, "", pagePath(next, prefix));
    },
    [prefix]
  );

  return [page, setPage];
}

// For links that switch pages in place: a plain click is handled by the app, while
// Ctrl/Cmd/Shift-click and middle-click are left to the browser (new tab or window)
export function isPlainClick(e) {
  return e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey;
}

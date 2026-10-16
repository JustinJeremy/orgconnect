import { useEffect, useRef, useState } from "react";
import { errorMessage } from "../api/client.js";

// Loads one page of a list from the API (server-side pagination, filtering and search).
// load:    an API call like eventsApi.page → ({ ...filters, page, perPage }) → { data, meta }
// filters: { search, category, ... } — "All" and empty values are left out; a change goes back to page 1
// refresh: anything that changes when the list was edited elsewhere (e.g. data.events), to reload this page
// Returns the page plus: pending (a new page is on its way; the old one is still shown) and
// version (goes up each time new items arrive; key the list on it to animate them in).
export default function usePagedList(load, filters, perPage, refresh) {
  const params = Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])
      .filter(([, value]) => value !== "" && value !== "All" && value != null)
  );
  const key = JSON.stringify(params);

  const [page, setPage] = useState(1);
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setPage(1);
  }

  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1, loaded: false, error: "", version: 0 });
  const [pending, setPending] = useState(false);
  // Only the search text waits (so typing sends one request, not one per letter);
  // tabs, filters and pages load right away
  const lastSearch = useRef(params.search);
  // Which list is showing (filters + page). An edit elsewhere reloads the same view quietly;
  // a different view shows as pending and animates in.
  const lastView = useRef(null);

  useEffect(() => {
    let active = true;
    const typing = lastSearch.current !== params.search;
    lastSearch.current = params.search;
    const view = `${key}|${page}`, newView = lastView.current !== view;
    if (newView) setPending(true);
    const timer = setTimeout(() => {
      load({ ...JSON.parse(key), page, perPage })
        .then(({ data, meta }) => {
          if (!active) return;
          // The page we were on no longer exists (e.g. its last item was deleted): go to the last page
          if (page > meta.lastPage) return setPage(meta.lastPage);
          lastView.current = view;
          setResult((r) => ({ items: data, total: meta.total, totalPages: meta.lastPage, loaded: true, error: "", version: r.version + (newView ? 1 : 0) }));
          setPending(false);
        })
        .catch((err) => {
          if (!active) return;
          setResult((r) => ({ ...r, loaded: true, error: errorMessage(err) }));
          setPending(false);
        });
    }, typing ? 250 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page, perPage, refresh]);

  return { ...result, pending, page, setPage };
}

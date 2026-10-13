import { useEffect, useState } from "react";
import { errorMessage } from "../api/client.js";

// Loads one page of a list from the API (server-side pagination, filtering and search).
// load:    an API call like eventsApi.page → ({ ...filters, page, perPage }) → { data, meta }
// filters: { search, category, ... } — "All" and empty values are left out; a change goes back to page 1
// refresh: anything that changes when the list was edited elsewhere (e.g. data.events), to reload this page
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

  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1, loaded: false, error: "" });

  useEffect(() => {
    let active = true;
    // A short pause so typing in a search box sends one request, not one per letter
    const timer = setTimeout(() => {
      load({ ...JSON.parse(key), page, perPage })
        .then(({ data, meta }) => {
          if (!active) return;
          // The page we were on no longer exists (e.g. its last item was deleted): go to the last page
          if (page > meta.lastPage) return setPage(meta.lastPage);
          setResult({ items: data, total: meta.total, totalPages: meta.lastPage, loaded: true, error: "" });
        })
        .catch((err) => active && setResult((r) => ({ ...r, loaded: true, error: errorMessage(err) })));
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page, perPage, refresh]);

  return { ...result, page, setPage };
}

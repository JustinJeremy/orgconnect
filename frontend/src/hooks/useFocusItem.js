import { useEffect, useState } from "react";

// Shows the item a notification is about: once it is in the loaded list, scroll to it
// (the element with data-focus="<kind>-<id>") and return its id so the page can highlight it.
// The page is expected to clear its filters for `focus` itself, so the item can appear.
//   focus: { kind, id, key } or null; items: the list on screen; ready: that list has loaded
export default function useFocusItem({ focus, kind, items, ready, onDone }) {
  const [highlightId, setHighlightId] = useState(null);

  useEffect(() => {
    if (!focus || focus.kind !== kind || !focus.id || !ready) return;
    if (!items.some((item) => item.id === focus.id)) return; // not loaded yet; wait for the next list
    setHighlightId(focus.id);
    requestAnimationFrame(() =>
      document.querySelector(`[data-focus="${kind}-${focus.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" })
    );
    onDone?.();
  }, [focus, kind, items, ready, onDone]);

  // Stop looking if it never shows up (e.g. it was deleted)
  useEffect(() => {
    if (!focus) return;
    const timer = setTimeout(() => onDone?.(), 4000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key]);

  // The highlight fades after a few seconds
  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlightId(null), 3000);
    return () => clearTimeout(timer);
  }, [highlightId]);

  return highlightId;
}

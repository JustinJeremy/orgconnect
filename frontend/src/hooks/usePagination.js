import { useState } from "react";

// Splits a list into pages. The page goes back to 1 whenever resetKey changes
// (pass the current search / filter values so a new search starts on page 1).
export default function usePagination(items, perPage, resetKey = "") {
  const [page, setPage] = useState(1);
  const [lastKey, setLastKey] = useState(resetKey);

  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const currentPage = Math.min(page, totalPages);

  return {
    pageItems: items.slice((currentPage - 1) * perPage, currentPage * perPage),
    page: currentPage,
    totalPages,
    setPage,
  };
}

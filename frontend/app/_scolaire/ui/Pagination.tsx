"use client";

import { useState } from "react";

export const PAGE_SIZE = 25;

/**
 * Découpe une liste en pages. `resetKey` résume les filtres : quand il
 * change (nouvelle recherche, autre classe…), on revient à la page 1.
 */
export function usePagination<T>(rows: T[], resetKey: string, pageSize = PAGE_SIZE) {
  const [state, setState] = useState({ page: 0, key: resetKey });
  const requested = state.key === resetKey ? state.page : 0;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(requested, pageCount - 1);
  return {
    visible: rows.slice(page * pageSize, (page + 1) * pageSize),
    page,
    pageCount,
    setPage: (next: number) => setState({ page: next, key: resetKey }),
  };
}

/** Précédent / Suivant, placés au-dessus de la liste pour être vus sans défiler. */
export function Pagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (page: number) => void }) {
  if (pageCount <= 1) return null;
  return (
    <nav className="ec-pagination" aria-label="Pagination">
      <span>Page {page + 1} sur {pageCount}</span>
      <button type="button" className="ec-btn" disabled={page === 0} onClick={() => onChange(page - 1)}>Précédent</button>
      <button type="button" className="ec-btn" disabled={page >= pageCount - 1} onClick={() => onChange(page + 1)}>Suivant</button>
    </nav>
  );
}

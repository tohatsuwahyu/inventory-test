/* =========================================================
 * qrlib.js (CSS payload)
 * Mobile Card View for ITEMS Table  — aligned with new design system
 * =======================================================*/
@media (max-width: 768px) {
  table.items-table {
    border-collapse: separate !important;
    border-spacing: 0 12px !important;
    background: transparent;
  }

  table.items-table thead { display: none !important; }

  table.items-table tbody tr {
    display: grid !important;
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "main check"
      "price stock"
      "min   loc"
      "action action";
    gap: 8px 14px;
    background: var(--surface);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border);
    margin-bottom: 12px;
    padding: 16px;
    position: relative;
    transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
  }
  table.items-table tbody tr:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    border-color: var(--border-strong);
  }

  table.items-table td {
    border: none !important;
    padding: 0 !important;
    font-size: 0.875rem;
    background: transparent !important;
  }

  /* checkbox */
  table.items-table td:nth-child(1) {
    grid-area: check;
    justify-self: end;
    align-self: start;
    width: auto !important;
  }

  /* hide QR-thumb, image, dept (handled by main label) */
  table.items-table td:nth-child(2),
  table.items-table td:nth-child(4),
  table.items-table td:nth-child(8) {
    display: none !important;
  }

  /* main name+code */
  table.items-table td:nth-child(3) {
    grid-area: main;
    min-width: 0;
  }
  table.items-table td:nth-child(3) .small {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--text-muted);
  }
  table.items-table td:nth-child(3) .td-name,
  table.items-table td:nth-child(3) .link-item {
    display: block;
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary);
    text-decoration: none;
    overflow-wrap: anywhere;
    line-height: 1.3;
  }

  /* grid placement */
  table.items-table td:nth-child(5) { grid-area: price; }
  table.items-table td:nth-child(6) { grid-area: stock; }
  table.items-table td:nth-child(7) { grid-area: min; }
  table.items-table td:nth-child(9) { grid-area: loc; }

  /* mini labels above each metric */
  table.items-table td:nth-child(5)::before,
  table.items-table td:nth-child(6)::before,
  table.items-table td:nth-child(7)::before,
  table.items-table td:nth-child(9)::before {
    display: block;
    color: var(--text-muted);
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 2px;
  }
  table.items-table td:nth-child(5)::before { content: "価格 (Harga)"; }
  table.items-table td:nth-child(6)::before { content: "在庫 (Stok)"; }
  table.items-table td:nth-child(7)::before { content: "最小 (Min)"; }
  table.items-table td:nth-child(9)::before { content: "置場 (Lokasi)"; }

  /* values: a touch heavier */
  table.items-table td:nth-child(5),
  table.items-table td:nth-child(6),
  table.items-table td:nth-child(7) {
    font-weight: 600;
    color: var(--text-primary);
  }

  /* action row */
  table.items-table td.td-actions {
    grid-area: action;
    border-top: 1px dashed var(--border) !important;
    padding-top: 12px !important;
    margin-top: 4px;
  }
  table.items-table td.td-actions .act-grid {
    display: grid !important;
    grid-template-columns: repeat(5, minmax(40px, 1fr)) !important;
    gap: 6px !important;
    justify-content: stretch !important;
  }
  table.items-table td.td-actions .btn {
    width: 100%;
    min-height: 38px;
    padding: 4px 6px;
    font-size: 0.72rem;
    border-radius: var(--r-xs);
  }
}

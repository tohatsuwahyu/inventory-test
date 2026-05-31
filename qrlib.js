/* Mobile Table Cards (ITEMS) - revised */
@media (max-width: 768px) {
  table.items-table {
    border-collapse: separate !important;
    border-spacing: 0 12px !important;
  }

  table.items-table thead {
    display: none !important;
  }

  table.items-table tbody tr {
    display: grid !important;
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "main check"
      "price stock"
      "min loc"
      "action action";
    gap: 8px 12px;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
    margin-bottom: 12px;
    padding: 14px;
    border: 1px solid var(--border);
    position: relative;
  }

  table.items-table td {
    border: none !important;
    padding: 0 !important;
    font-size: 0.92rem;
  }

  table.items-table td:nth-child(1) {
    grid-area: check;
    justify-self: end;
    align-self: start;
    width: auto !important;
  }

  table.items-table td:nth-child(2),
  table.items-table td:nth-child(4),
  table.items-table td:nth-child(8) {
    display: none !important;
  }

  table.items-table td:nth-child(3) {
    grid-area: main;
    min-width: 0;
  }

  table.items-table td:nth-child(3) .small {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.74rem;
  }

  table.items-table td:nth-child(3) .td-name,
  table.items-table td:nth-child(3) .link-item {
    display: block;
    font-size: 1.04rem;
    font-weight: 700;
    color: #0f172a;
    text-decoration: none;
    overflow-wrap: anywhere;
  }

  table.items-table td:nth-child(5) {
    grid-area: price;
  }

  table.items-table td:nth-child(6) {
    grid-area: stock;
  }

  table.items-table td:nth-child(7) {
    grid-area: min;
  }

  table.items-table td:nth-child(9) {
    grid-area: loc;
  }

  table.items-table td:nth-child(5)::before {
    content: "価格";
    display: block;
    color: var(--muted);
    font-size: 0.72rem;
    margin-bottom: 2px;
  }

  table.items-table td:nth-child(6)::before {
    content: "在庫";
    display: block;
    color: var(--muted);
    font-size: 0.72rem;
    margin-bottom: 2px;
  }

  table.items-table td:nth-child(7)::before {
    content: "最小";
    display: block;
    color: var(--muted);
    font-size: 0.72rem;
    margin-bottom: 2px;
  }

  table.items-table td:nth-child(9)::before {
    content: "置場";
    display: block;
    color: var(--muted);
    font-size: 0.72rem;
    margin-bottom: 2px;
  }

  table.items-table td.td-actions {
    grid-area: action;
    border-top: 1px dashed #e2e8f0 !important;
    padding-top: 10px !important;
  }

  table.items-table td.td-actions .act-grid {
    display: grid !important;
    grid-template-columns: repeat(5, minmax(42px, 1fr)) !important;
    gap: 8px !important;
    min-width: 0 !important;
    justify-content: stretch !important;
  }

  table.items-table td.td-actions .btn {
    width: 100%;
    min-height: 38px;
  }
}

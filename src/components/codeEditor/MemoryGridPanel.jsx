import { useMemo, useState } from "react";

import { formatRegValue, formatSignedValue } from "./utils.js";

const PAGE_SIZE = 128;
const TOTAL_CELLS = 4096;
const PAGE_COUNT = TOTAL_CELLS / PAGE_SIZE;

function hex(n, pad = 3) {
  return n.toString(16).toUpperCase().padStart(pad, "0");
}

export default function MemoryGridPanel({
  memory,
  symbolTable,
  recentlyWritten,
  recentlyRead,
  watchAddresses,
  accessCounts,
  onAddWatch,
  onRemoveWatch,
}) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const addrToLabel = useMemo(() => {
    const map = {};
    for (const [label, addr] of Object.entries(symbolTable ?? {})) {
      map[addr] = label;
    }
    return map;
  }, [symbolTable]);

  const maxAccess = useMemo(() => {
    if (!accessCounts) return 1;
    let max = 1;
    for (let i = 0; i < TOTAL_CELLS; i += 1) {
      const total = (accessCounts.reads[i] ?? 0) + (accessCounts.writes[i] ?? 0);
      if (total > max) max = total;
    }
    return max;
  }, [accessCounts]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return null;
    const query = search.trim().toLowerCase();
    const rows = [];
    for (let i = 0; i < TOTAL_CELLS; i += 1) {
      const label = addrToLabel[i];
      const addrHex = hex(i, 3).toLowerCase();
      if (addrHex.startsWith(query) || (label && label.toLowerCase().includes(query))) {
        rows.push(i);
      }
    }
    return rows;
  }, [search, addrToLabel]);

  const pageStart = page * PAGE_SIZE;
  const addresses = filteredRows ?? Array.from({ length: PAGE_SIZE }, (_, k) => pageStart + k);

  function heatStyle(addr) {
    if (!accessCounts) return {};
    const reads = accessCounts.reads[addr] ?? 0;
    const writes = accessCounts.writes[addr] ?? 0;
    if (reads === 0 && writes === 0) return {};
    const intensity = Math.min((reads + writes) / maxAccess, 1);
    const writeRatio = writes / (reads + writes);
    const hue = Math.round(220 - writeRatio * 200);
    const lightness = Math.round(8 + intensity * 18);
    return { background: `hsl(${hue}, 60%, ${lightness}%)` };
  }

  const mem = memory ?? new Uint16Array(TOTAL_CELLS);

  return (
    <div className="mem-grid-panel">
      <div className="mem-grid-search-row">
        <input
          className="mem-grid-search"
          placeholder="Search address or label..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(0);
          }}
        />
        {search && (
          <button className="mem-grid-clear-btn" onClick={() => setSearch("")}>
            ×
          </button>
        )}
      </div>

      <p className="mem-grid-helper">Search by hex address or symbol name, then pin important cells to Watch.</p>

      <div className="mem-grid-header">
        <span className="mem-grid-th mem-grid-th-addr">Addr</span>
        <span className="mem-grid-th mem-grid-th-label">Label</span>
        <span className="mem-grid-th mem-grid-th-hex">Hex</span>
        <span className="mem-grid-th mem-grid-th-dec">Dec</span>
        <span className="mem-grid-th mem-grid-th-action" />
      </div>

      <div className="mem-grid-rows">
        {addresses.map((addr) => {
          const value = mem[addr] ?? 0;
          const label = addrToLabel[addr];
          const isWatched = watchAddresses?.has(addr);
          const isWritten = recentlyWritten?.has(addr);
          const isRead = recentlyRead?.has(addr);

          let rowClass = "mem-grid-row";
          if (isWatched) rowClass += " mem-row-watch";
          else if (isWritten) rowClass += " mem-row-written";
          else if (isRead) rowClass += " mem-row-read";
          else if (value !== 0) rowClass += " mem-row-nonzero";

          return (
            <div
              key={addr}
              className={rowClass}
              style={!isWatched && !isWritten && !isRead ? heatStyle(addr) : {}}
            >
              <span className="mem-grid-cell mem-grid-addr">{hex(addr, 3)}</span>
              <span className="mem-grid-cell mem-grid-label" title={label ?? ""}>
                {label ?? ""}
              </span>
              <span className="mem-grid-cell mem-grid-hex">{formatRegValue(value)}</span>
              <span className="mem-grid-cell mem-grid-dec">{formatSignedValue(value)}</span>
              <span className="mem-grid-cell mem-grid-action">
                {isWatched ? (
                  <button
                    className="mem-watch-btn mem-watch-btn--remove"
                    title="Remove from watch list"
                    onClick={() => onRemoveWatch?.(addr)}
                  >
                    -
                  </button>
                ) : (
                  <button
                    className="mem-watch-btn"
                    title="Add to watch list"
                    onClick={() => onAddWatch?.(addr)}
                  >
                    +
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {!filteredRows && (
        <div className="mem-grid-pagination">
          <button
            className="mem-grid-page-btn"
            disabled={page === 0}
            onClick={() => setPage((prev) => prev - 1)}
          >
            ‹
          </button>
          <span className="mem-grid-page-info">
            {hex(pageStart, 3)}-{hex(Math.min(pageStart + PAGE_SIZE - 1, TOTAL_CELLS - 1), 3)}
          </span>
          <button
            className="mem-grid-page-btn"
            disabled={page >= PAGE_COUNT - 1}
            onClick={() => setPage((prev) => prev + 1)}
          >
            ›
          </button>
        </div>
      )}

      {filteredRows && (
        <div className="mem-grid-pagination">
          <span className="mem-grid-page-info">
            {filteredRows.length} result{filteredRows.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}

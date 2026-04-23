import { useEffect, useRef } from "react";

function ChevronRight() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
      <path d="M2 1 L6 4 L2 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
      <path d="M1 2 L4 6 L7 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PHASE_CONFIG = {
  fetch: { label: "FETCH", className: "rtl-phase-fetch" },
  decode: { label: "DECODE", className: "rtl-phase-decode" },
  execute: { label: "EXEC", className: "rtl-phase-execute" },
};

export default function RtlLogPanel({ entries, collapsed, onToggle, width }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current && !collapsed) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [entries.length, collapsed]);

  return (
    <div
      className={`terminal-col terminal-col-rtl${collapsed ? " terminal-col--collapsed" : ""}`}
      style={!collapsed && width ? { width, flexBasis: width, flexShrink: 0, flexGrow: 0 } : undefined}
    >
      <div className="terminal-header">
        <span className="terminal-title">RTL Log</span>
        {entries.length > 0 && <span className="rtl-entry-count">{entries.length}</span>}
        <button
          className="terminal-collapse-btn"
          onClick={onToggle}
          title={collapsed ? "Expand RTL log" : "Collapse RTL log"}
        >
          {collapsed ? <ChevronRight /> : <ChevronDown />}
        </button>
      </div>

      {!collapsed && (
        <div className="rtl-log" ref={listRef}>
          {entries.length === 0 && (
            <div className="panel-empty panel-empty--compact">
              <span className="panel-empty-eyebrow">Micro-step Trace</span>
              <p className="panel-empty-title">RTL operations appear while micro-stepping.</p>
              <p className="panel-empty-hint">Use F8 or the uStep button to inspect fetch, decode, and execute activity.</p>
            </div>
          )}

          {entries.map((entry, index) => {
            const cfg = PHASE_CONFIG[entry.phase] ?? PHASE_CONFIG.execute;
            const isLatest = index === entries.length - 1;
            return (
              <div key={index} className={`rtl-entry${isLatest ? " rtl-entry--latest" : ""}`}>
                <span className={`rtl-phase-badge ${cfg.className}`}>{cfg.label}</span>
                <span className="rtl-description">{entry.description}</span>
                {isLatest && entry.changedRegisters.length > 0 && (
                  <span className="rtl-changed-regs">
                    {entry.changedRegisters.map((reg) => (
                      <span key={reg} className="rtl-reg-chip">{reg}</span>
                    ))}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

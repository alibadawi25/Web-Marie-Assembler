import { useState } from "react";

function ChevronRight() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" aria-hidden="true">
      <path d="M2 1 L6 4 L2 7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" aria-hidden="true">
      <path d="M1 2 L4 6 L7 2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const OPCODE_NAMES = [
  "JNS", "LOAD", "STORE", "ADD", "SUBT", "INPUT", "OUTPUT", "HALT",
  "SKIPCOND", "JUMP", "CLEAR", "ADDI", "JUMPI", "LOADI", "STOREI",
];

function hex4(n) {
  return `0x${(n >>> 0).toString(16).toUpperCase().padStart(4, "0")}`;
}

function decodeInstruction(ir) {
  const opcode = (ir >> 12) & 0xf;
  const address = ir & 0xfff;
  const name = OPCODE_NAMES[opcode] ?? `OP${opcode}`;
  const noArg = ["INPUT", "OUTPUT", "HALT", "CLEAR"];
  if (noArg.includes(name)) return name;
  return `${name} ${hex4(address)}`;
}

function diffRegs(before, after) {
  const diffs = [];
  for (const key of ["AC", "PC", "IR", "MAR", "MBR"]) {
    if (before[key] !== after[key]) {
      diffs.push({ key, before: before[key], after: after[key] });
    }
  }
  return diffs;
}

export default function ExecutionHistoryPanel({ entries, collapsed, onToggle }) {
  const [expanded, setExpanded] = useState(null);

  function toggleExpand(idx) {
    setExpanded((prev) => (prev === idx ? null : idx));
  }

  const reversed = [...entries].reverse();

  return (
    <div className={`hist-panel${collapsed ? " hist-panel--collapsed" : ""}`}>
      <div className="hist-header" onClick={onToggle} title={collapsed ? "Expand history" : "Collapse history"}>
        <span className="hist-title">History</span>
        {entries.length > 0 && <span className="hist-count">{entries.length}</span>}
        <span className="hist-chevron">{collapsed ? <ChevronRight /> : <ChevronDown />}</span>
      </div>

      {!collapsed && (
        <div className="hist-list">
          {entries.length === 0 && (
            <div className="panel-empty panel-empty--compact">
              <span className="panel-empty-eyebrow">Execution History</span>
              <p className="panel-empty-title">No instructions executed yet.</p>
              <p className="panel-empty-hint">Step or run the program to build an instruction-by-instruction timeline here.</p>
            </div>
          )}

          {reversed.map((entry, index) => {
            const realIdx = entries.length - 1 - index;
            const isExpanded = expanded === realIdx;
            const diffs = diffRegs(entry.preState, entry.postState);

            return (
              <div key={realIdx} className={`hist-entry${isExpanded ? " hist-entry--expanded" : ""}`}>
                <div className="hist-entry-row" onClick={() => toggleExpand(realIdx)}>
                  <span className="hist-step-num">#{entry.stepIndex}</span>
                  <span className="hist-instr">{decodeInstruction(entry.preState.IR || 0)}</span>
                  <span className="hist-diffs">
                    {diffs.slice(0, 2).map(({ key, after }) => (
                      <span key={key} className="hist-diff-chip">
                        {key}={hex4(after)}
                      </span>
                    ))}
                  </span>
                  <span className="hist-expand-btn">{isExpanded ? "-" : "+"}</span>
                </div>

                {isExpanded && (
                  <div className="hist-detail">
                    {diffs.length === 0 && <span className="hist-no-change">No register changes</span>}
                    {diffs.map(({ key, before, after }) => (
                      <div key={key} className="hist-detail-row">
                        <span className="hist-detail-reg">{key}</span>
                        <span className="hist-detail-before">{hex4(before)}</span>
                        <span className="hist-detail-arrow">-&gt;</span>
                        <span className="hist-detail-after">{hex4(after)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

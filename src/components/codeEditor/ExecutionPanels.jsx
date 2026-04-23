import { useState } from "react";

import DisplayPanel from "./DisplayPanel.jsx";
import ExecutionHistoryPanel from "./ExecutionHistoryPanel.jsx";
import MemoryGridPanel from "./MemoryGridPanel.jsx";
import RtlLogPanel from "./RtlLogPanel.jsx";
import WatchPanel from "./WatchPanel.jsx";
import { REGISTER_ORDER } from "./constants.js";
import { formatRegValue, formatSignedValue } from "./utils.js";

function PanelChevronRight() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
      <path d="M2 1 L6 4 L2 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PanelChevronDown() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
      <path d="M1 2 L4 6 L7 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmptyPanelMessage({ eyebrow, title, hint }) {
  return (
    <div className="panel-empty">
      {eyebrow ? <span className="panel-empty-eyebrow">{eyebrow}</span> : null}
      <p className="panel-empty-title">{title}</p>
      {hint ? <p className="panel-empty-hint">{hint}</p> : null}
    </div>
  );
}

function MobileRegisterStrip({ isCodeAssembled, registerState }) {
  if (!isCodeAssembled) return null;

  return (
    <div className="register-viewer register-viewer-mobile">
      {REGISTER_ORDER.map(({ name }) => (
        <div key={name} className="register-cell">
          <span className="register-name">{name}</span>
          <span className="register-value">{formatRegValue(registerState[name])}</span>
        </div>
      ))}
    </div>
  );
}

function OutputColumn({
  isRunning,
  isCodeAssembled,
  outputCollapsed,
  outputMode,
  output,
  errorMessage,
  terminalRef,
  executionHistory,
  historyCollapsed,
  onToggle,
  onToggleHistory,
}) {
  return (
    <div className={`terminal-col terminal-col-output${outputCollapsed ? " terminal-col--collapsed" : ""}`}>
      <div className="terminal-header">
        <span className="terminal-title">Output</span>
        {isRunning && (
          <span className="terminal-status terminal-running-badge">
            <span className="terminal-status-dot" />
            Running
          </span>
        )}
        {isCodeAssembled && !isRunning && (
          <span className="terminal-status terminal-ready-badge">
            <span className="terminal-status-dot" />
            Assembled
          </span>
        )}
        <button
          className="terminal-collapse-btn"
          onClick={onToggle}
          title={outputCollapsed ? "Expand output" : "Collapse output"}
          aria-label={outputCollapsed ? "Expand output" : "Collapse output"}
        >
          {outputCollapsed ? <PanelChevronRight /> : <PanelChevronDown />}
        </button>
      </div>

      {!outputCollapsed && (
        <>
          <div className="terminal" ref={terminalRef}>
            {output.length === 0 && !errorMessage && (
              <EmptyPanelMessage
                eyebrow="Program Output"
                title={isCodeAssembled ? "Ready — click Run or Step." : "No output yet."}
                hint={isCodeAssembled
                  ? "Use Run to execute fully, or Step to go instruction by instruction."
                  : "Write your program above, then click Assemble \u2192 Run."}
              />
            )}

            {output.length > 0 && (
              <div className="output">
                {outputMode === "unicode" ? (
                  <pre className="output-unicode">{output.join("")}</pre>
                ) : (
                  output.map((value, index) => (
                    <p key={index} className="output-line">
                      <span className="output-index">{index + 1}</span>
                      {value}
                    </p>
                  ))
                )}
              </div>
            )}

            {errorMessage && (
              <p className="error">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 11 11"
                  fill="currentColor"
                  aria-hidden="true"
                  style={{ marginRight: 5, flexShrink: 0, verticalAlign: "middle" }}
                >
                  <path d="M5.5 0L11 11H0L5.5 0Z" opacity="0.85" />
                  <rect x="5" y="4" width="1" height="3.5" fill="#111" rx="0.3" />
                  <rect x="5" y="8.2" width="1" height="1" fill="#111" rx="0.3" />
                </svg>
                {errorMessage}
              </p>
            )}
          </div>

          <ExecutionHistoryPanel
            entries={executionHistory}
            collapsed={historyCollapsed}
            onToggle={onToggleHistory}
          />
        </>
      )}
    </div>
  );
}

function StateColumn({
  stateCollapsed,
  statePanelWidth,
  registerState,
  memoryValues,
  watchList,
  fullMemory,
  symbolTable,
  recentlyWritten,
  recentlyRead,
  accessCounts,
  viewMode,
  onToggle,
  onAddWatch,
  onRemoveWatch,
}) {
  const [activeView, setActiveView] = useState("variables");
  const hasVariables = Object.keys(memoryValues).length > 0;
  const isFocus = viewMode === "focus";

  return (
    <div
      className={`terminal-col terminal-col-state${stateCollapsed ? " terminal-col--collapsed" : ""}`}
      style={{ flexBasis: statePanelWidth, flexGrow: 0, flexShrink: 0 }}
    >
      <div className="terminal-header terminal-header-state">
        <div className="terminal-header-copy">
          <span className="terminal-title">{isFocus ? "State" : "Inspector"}</span>
          <span className="terminal-header-subtitle">
            {isFocus ? "Registers & variables" : "Registers, watches, and memory views"}
          </span>
        </div>

        {!isFocus && (
          <div className="inspector-toggle-group" role="tablist" aria-label="Inspector views">
            <button
              className={`mem-view-toggle${activeView === "variables" ? " mem-view-toggle--active" : ""}`}
              onClick={() => setActiveView("variables")}
              title="Show variables"
            >
              Variables
            </button>
            <button
              className={`mem-view-toggle${activeView === "grid" ? " mem-view-toggle--active" : ""}`}
              onClick={() => setActiveView("grid")}
              title="Show memory map"
            >
              Memory
            </button>
            <button
              className={`mem-view-toggle${activeView === "display" ? " mem-view-toggle--active" : ""}`}
              onClick={() => setActiveView("display")}
              title="Show display memory"
            >
              Display
            </button>
          </div>
        )}

        <button
          className="terminal-collapse-btn"
          onClick={onToggle}
          title={stateCollapsed ? "Expand state panel" : "Collapse state panel"}
          aria-label={stateCollapsed ? "Expand state panel" : "Collapse state panel"}
        >
          {stateCollapsed ? <PanelChevronRight /> : <PanelChevronDown />}
        </button>
      </div>

      {!stateCollapsed && (
        <div className="state-panel">
          <div className="state-section">
            <div className="state-section-label">Registers</div>
            <div className="state-reg-grid">
              {REGISTER_ORDER.map(({ name, signed }) => (
                <div key={name} className={`state-reg-row${name === "AC" ? " state-reg-row--ac" : ""}`}>
                  <span className="state-reg-name">{name}</span>
                  <span className="state-reg-hex">{formatRegValue(registerState[name])}</span>
                  <span className="state-reg-dec">
                    {signed ? formatSignedValue(registerState[name]) : Number(registerState[name])}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="state-section">
            <div className="state-section-label">Variables</div>
            {hasVariables ? (
              <div className="state-mem-grid">
                {Object.entries(memoryValues).map(([label, { addr, value }]) => (
                  <div key={label} className="state-mem-row">
                    <span className="state-mem-label">{label}</span>
                    <span className="state-mem-addr">@{addr.toString(16).toUpperCase().padStart(3, "0")}</span>
                    <span className="state-mem-hex">{formatRegValue(value)}</span>
                    <span className="state-mem-dec">{formatSignedValue(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanelMessage
                eyebrow="Variables"
                title={isFocus ? "No variables declared yet." : "No labeled variables yet."}
                hint={isFocus
                  ? 'Add a line like  n,  dec 0  to declare a variable, then assemble.'
                  : "Assemble a program with labels like counter, temp, or sum to inspect them here."}
              />
            )}
          </div>

          {!isFocus && (
            <div className="state-section">
              <div className="state-section-label">Watch</div>
              <WatchPanel
                watchList={watchList}
                memory={fullMemory}
                symbolTable={symbolTable}
                onAddWatch={onAddWatch}
                onRemoveWatch={onRemoveWatch}
              />
            </div>
          )}

          {!isFocus && activeView === "display" && (
            <div className="state-section state-section--display">
              <div className="state-section-label">Display · 0xF00-0xFFF</div>
              <DisplayPanel memory={fullMemory} />
            </div>
          )}

          {!isFocus && activeView === "grid" && (
            <div className="state-section state-section--full-mem">
              <div className="state-section-label">Full Memory</div>
              <MemoryGridPanel
                memory={fullMemory}
                symbolTable={symbolTable}
                recentlyWritten={recentlyWritten}
                recentlyRead={recentlyRead}
                watchAddresses={new Set(watchList.map((watch) => watch.address))}
                accessCounts={accessCounts}
                onAddWatch={(addr) => onAddWatch(addr, null)}
                onRemoveWatch={onRemoveWatch}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { StateColumn };

export default function ExecutionPanels({
  terminalHeight,
  outputCollapsed,
  rtlPanelWidth,
  rtlLogCollapsed,
  isRunning,
  isCodeAssembled,
  outputMode,
  output,
  errorMessage,
  registerState,
  terminalRef,
  rtlLog,
  executionHistory,
  historyCollapsed,
  viewMode,
  onResizeStart,
  onRtlResizeStart,
  onToggleOutput,
  onToggleRtlLog,
  onToggleHistory,
}) {
  const showRtl = viewMode === "advanced";

  return (
    <>
      <MobileRegisterStrip
        isCodeAssembled={isCodeAssembled}
        registerState={registerState}
      />

      <div className="terminal-panel" style={{ height: terminalHeight }}>
        <div className="terminal-resize-handle" onMouseDown={onResizeStart} title="Drag to resize" />

        <div className="terminal-columns">
          <OutputColumn
            isRunning={isRunning}
            isCodeAssembled={isCodeAssembled}
            outputCollapsed={outputCollapsed}
            outputMode={outputMode}
            output={output}
            errorMessage={errorMessage}
            terminalRef={terminalRef}
            executionHistory={executionHistory}
            historyCollapsed={historyCollapsed}
            onToggle={onToggleOutput}
            onToggleHistory={onToggleHistory}
          />

          {showRtl && (
            <div className="state-resize-handle" onMouseDown={onRtlResizeStart} title="Drag to resize" />
          )}

          {showRtl && (
            <RtlLogPanel
              entries={rtlLog}
              collapsed={rtlLogCollapsed}
              onToggle={onToggleRtlLog}
              width={rtlPanelWidth}
            />
          )}

        </div>
      </div>
    </>
  );
}

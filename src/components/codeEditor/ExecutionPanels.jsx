import { REGISTER_ORDER } from "./constants.js";
import { formatRegValue, formatSignedValue } from "./utils.js";

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
  onToggle,
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
          {outputCollapsed ? "▶" : "▼"}
        </button>
      </div>
      {!outputCollapsed && (
        <div className="terminal" ref={terminalRef}>
          {output.length === 0 && !errorMessage && (
            <p className="terminal-placeholder">Program output will appear here…</p>
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
          {errorMessage && <p className="error">⚠ {errorMessage}</p>}
        </div>
      )}
    </div>
  );
}

function StateColumn({
  stateCollapsed,
  statePanelWidth,
  registerState,
  memoryValues,
  onToggle,
}) {
  return (
    <div
      className={`terminal-col terminal-col-state${stateCollapsed ? " terminal-col--collapsed" : ""}`}
      style={{ flexBasis: statePanelWidth, flexGrow: 0, flexShrink: 0 }}
    >
      <div className="terminal-header">
        <span className="terminal-title">Registers & Memory</span>
        <button
          className="terminal-collapse-btn"
          onClick={onToggle}
          title={stateCollapsed ? "Expand registers" : "Collapse registers"}
          aria-label={stateCollapsed ? "Expand registers" : "Collapse registers"}
        >
          {stateCollapsed ? "▶" : "▼"}
        </button>
      </div>
      {!stateCollapsed && (
        <div className="state-panel">
          <div className="state-section">
            <div className="state-section-label">Registers</div>
            <div className="state-reg-grid">
              {REGISTER_ORDER.map(({ name, signed }) => (
                <div key={name} className="state-reg-row">
                  <span className="state-reg-name">{name}</span>
                  <span className="state-reg-hex">{formatRegValue(registerState[name])}</span>
                  <span className="state-reg-dec">
                    {signed
                      ? formatSignedValue(registerState[name])
                      : Number(registerState[name])}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {Object.keys(memoryValues).length > 0 && (
            <div className="state-section">
              <div className="state-section-label">Variables</div>
              <div className="state-mem-grid">
                {Object.entries(memoryValues).map(([label, { addr, value }]) => (
                  <div key={label} className="state-mem-row">
                    <span className="state-mem-label">{label}</span>
                    <span className="state-mem-addr">
                      @{addr.toString(16).toUpperCase().padStart(3, "0")}
                    </span>
                    <span className="state-mem-hex">{formatRegValue(value)}</span>
                    <span className="state-mem-dec">{formatSignedValue(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExecutionPanels({
  terminalHeight,
  outputCollapsed,
  stateCollapsed,
  statePanelWidth,
  isRunning,
  isCodeAssembled,
  outputMode,
  output,
  errorMessage,
  registerState,
  memoryValues,
  terminalRef,
  onResizeStart,
  onHorizontalResizeStart,
  onToggleOutput,
  onToggleState,
}) {
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
            onToggle={onToggleOutput}
          />

          <div className="state-resize-handle" onMouseDown={onHorizontalResizeStart} title="Drag to resize" />

          <StateColumn
            stateCollapsed={stateCollapsed}
            statePanelWidth={statePanelWidth}
            registerState={registerState}
            memoryValues={memoryValues}
            onToggle={onToggleState}
          />
        </div>
      </div>
    </>
  );
}

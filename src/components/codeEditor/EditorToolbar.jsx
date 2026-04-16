import { Button, Dropdown, Input, Select, Slider } from "antd";

import { OUTPUT_MODE_ITEMS, SPEED_OPTIONS } from "./constants.js";

function CpuIcon() {
  return (
    <svg className="toolbar-btn-icon" width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
      <rect x="2.5" y="2.5" width="5" height="5" rx="0.8" />
      <rect x="0" y="3.6" width="2" height="0.9" rx="0.3" />
      <rect x="0" y="5.5" width="2" height="0.9" rx="0.3" />
      <rect x="8" y="3.6" width="2" height="0.9" rx="0.3" />
      <rect x="8" y="5.5" width="2" height="0.9" rx="0.3" />
      <rect x="3.6" y="0" width="0.9" height="2" rx="0.3" />
      <rect x="5.5" y="0" width="0.9" height="2" rx="0.3" />
      <rect x="3.6" y="8" width="0.9" height="2" rx="0.3" />
      <rect x="5.5" y="8" width="0.9" height="2" rx="0.3" />
    </svg>
  );
}

function StepIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
      <path d="M1 1 L6 5 L1 9 Z" />
      <rect x="7" y="1" width="2.5" height="8" rx="1" />
    </svg>
  );
}

function RunIcon() {
  return (
    <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor" aria-hidden="true">
      <path d="M1 1 L8 5 L1 9 Z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor" aria-hidden="true">
      <rect x="0" y="0" width="9" height="9" rx="1.5" />
    </svg>
  );
}

function RecentProjectLabel({ name, fileName }) {
  return (
    <div className="recent-project-item">
      <span className="recent-project-name">{name}</span>
      <span className="recent-project-file">{fileName}</span>
    </div>
  );
}

export default function EditorToolbar({
  fileName,
  projectName,
  recentProjects,
  stepSpeed,
  outputMode,
  isCodeAssembled,
  isRunning,
  isStepping,
  onProjectNameChange,
  onLoadSourceClick,
  onSaveSource,
  onLoadRecentProject,
  onStepSpeedChange,
  onOutputModeChange,
  onAssembleClick,
  onStepClick,
  onRunClick,
  onStopClick,
}) {
  const recentProjectsMenu = {
    items: recentProjects.length
      ? recentProjects.map((project, index) => ({
          key: String(index),
          label: (
            <RecentProjectLabel
              name={project.name}
              fileName={project.fileName}
            />
          ),
        }))
      : [{ key: "empty", label: "No recent projects", disabled: true }],
    onClick: onLoadRecentProject,
  };

  const outputModeMenu = {
    items: OUTPUT_MODE_ITEMS,
    onClick: ({ key }) => onOutputModeChange(key),
  };

  return (
    <div className="editor-toolbar">
      <div className="toolbar-row toolbar-row-files">
        <div className="toolbar-section">
          <Input
            value={projectName}
            onChange={onProjectNameChange}
            placeholder="Untitled Project"
            className="toolbar-project-input"
          />
          <span className="toolbar-file-chip" title={fileName}>
            <span className="toolbar-file-chip-icon">◈</span>
            <span className="toolbar-file-chip-name">{fileName}</span>
          </span>
        </div>
        <div className="toolbar-spacer" />
        <div className="toolbar-section">
          <Button onClick={onLoadSourceClick} className="toolbar-btn-ghost" title="Load file (Ctrl+O)">
            Load
          </Button>
          <Button onClick={onSaveSource} className="toolbar-btn-ghost" title="Save file (Ctrl+S)">
            Save
          </Button>
          <Dropdown trigger={["click"]} menu={recentProjectsMenu}>
            <Button className="toolbar-btn-ghost" disabled={!recentProjects.length}>
              Recents ▾
            </Button>
          </Dropdown>
        </div>
      </div>

      <div className="toolbar-row toolbar-row-exec">
        <div className="toolbar-section toolbar-speed-group toolbar-speed-slider">
          <span className="toolbar-label">Speed</span>
          <Slider
            value={stepSpeed}
            min={0}
            step={10}
            max={1000}
            tooltip={{ formatter: (value) => `${value} ms` }}
            className="step-speed"
            onChange={onStepSpeedChange}
          />
          <span className="toolbar-speed-value">{stepSpeed}ms</span>
        </div>

        <div className="toolbar-section toolbar-speed-group toolbar-speed-select">
          <span className="toolbar-label">Speed</span>
          <Select
            value={stepSpeed}
            onChange={onStepSpeedChange}
            className="speed-select"
            popupMatchSelectWidth={false}
            options={SPEED_OPTIONS}
          />
        </div>

        <div className="toolbar-row-divider" />

        <div className="toolbar-section">
          <span className="toolbar-label">Output</span>
          <Dropdown trigger={["click"]} menu={outputModeMenu}>
            <Button className="toolbar-dropdown-btn">{outputMode.toUpperCase()} ▾</Button>
          </Dropdown>
        </div>

        <div className="toolbar-spacer" />

        <div className="toolbar-section toolbar-section-exec">
          {isCodeAssembled && !isRunning && !isStepping && (
            <span className="toolbar-assembled-badge">
              <span className="toolbar-assembled-badge-dot" />
              Ready
            </span>
          )}
          {isStepping && (
            <span className="toolbar-stepping-badge">
              <span className="toolbar-stepping-badge-dot" />
              Stepping
            </span>
          )}

          <Button onClick={onAssembleClick} className="toolbar-btn toolbar-btn-assemble" title="Assemble (Ctrl+Enter)">
            <span className="toolbar-btn-inner">
              <CpuIcon />
              <span className="toolbar-btn-label">Assemble</span>
              <kbd className="toolbar-kbd">⌃↵</kbd>
            </span>
          </Button>

          {!isRunning || isStepping ? (
            <Button
              onClick={isStepping ? onStepClick : isRunning ? undefined : onStepClick}
              disabled={!isCodeAssembled || (isRunning && !isStepping)}
              className="toolbar-btn toolbar-btn-step"
              title={isStepping ? "Next instruction (F6)" : "Step through (F6)"}
            >
              <span className="toolbar-btn-inner">
                <StepIcon />
                <span className="toolbar-btn-label">{isStepping ? "Next" : "Step"}</span>
                <kbd className="toolbar-kbd">F6</kbd>
              </span>
            </Button>
          ) : null}

          <Button
            onClick={isRunning ? onStopClick : onRunClick}
            disabled={!isCodeAssembled}
            className={`toolbar-btn ${isRunning ? "toolbar-btn-stop" : "toolbar-btn-run"}`}
            title={isRunning ? "Stop (Shift+F5)" : "Run (F5)"}
          >
            <span className="toolbar-btn-inner">
              {isRunning ? (
                <>
                  <StopIcon />
                  <span className="toolbar-btn-label">Stop</span>
                  <kbd className="toolbar-kbd">⇧F5</kbd>
                </>
              ) : (
                <>
                  <RunIcon />
                  <span className="toolbar-btn-label">Run</span>
                  <kbd className="toolbar-kbd">F5</kbd>
                </>
              )}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}

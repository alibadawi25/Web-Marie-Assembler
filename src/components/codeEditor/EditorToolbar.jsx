import { Button, Dropdown, Input, Select, Slider } from "antd";

import { CpuSvgIcon } from "./DataPathDiagram.jsx";
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

function MicroStepIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
      <path d="M1 2 L4.5 5 L1 8 Z" />
      <path d="M5 2 L8.5 5 L5 8 Z" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
      <rect x="0" y="1" width="2.5" height="8" rx="1" />
      <path d="M9 1 L4 5 L9 9 Z" />
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
  canStepBack,
  viewMode,
  onProjectNameChange,
  onLoadSourceClick,
  onSaveSource,
  onLoadRecentProject,
  onStepSpeedChange,
  onOutputModeChange,
  onAssembleClick,
  onStepClick,
  onMicroStepClick,
  onStepBackClick,
  onRunClick,
  onStopClick,
  onShareClick,
  onExamplesClick,
  onExportClick,
  onDataPathClick,
  onViewModeChange,
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

  const exportMenu = {
    items: [
      { key: "hex", label: "Hex Dump (.hex)" },
      { key: "bin", label: "Binary (.bin)" },
      { key: "logisim", label: "Logisim Image (.hex)" },
    ],
    onClick: ({ key }) => onExportClick?.(key),
  };

  return (
    <div className="editor-toolbar">
      <div className="toolbar-row toolbar-row-files">
        <div className="toolbar-section toolbar-section-project">
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

        <div className="toolbar-section toolbar-section-utilities">
          <Button onClick={onExamplesClick} className="toolbar-btn-ghost" title="Browse example programs">
            Examples
          </Button>
          {viewMode === "advanced" && (
            <Button
              onClick={onDataPathClick}
              className="toolbar-btn-ghost toolbar-btn-datapath"
              title="Open data path diagram"
            >
              <span className="toolbar-btn-inner">
                <CpuSvgIcon size={12} />
                <span className="toolbar-btn-label">Data Path</span>
              </span>
            </Button>
          )}
          <Button onClick={onLoadSourceClick} className="toolbar-btn-ghost" title="Load file (Ctrl+O)">
            Load
          </Button>
          <Button onClick={onSaveSource} className="toolbar-btn-ghost" title="Save file (Ctrl+S)">
            Save
          </Button>
          <Button onClick={onShareClick} className="toolbar-btn-ghost" title="Copy share link">
            Share
          </Button>
          {isCodeAssembled && (
            <Dropdown trigger={["click"]} menu={exportMenu}>
              <Button className="toolbar-btn-ghost">Export ▾</Button>
            </Dropdown>
          )}
          <Dropdown trigger={["click"]} menu={recentProjectsMenu}>
            <Button className="toolbar-btn-ghost" disabled={!recentProjects.length}>
              Recents ▾
            </Button>
          </Dropdown>
        </div>
      </div>

      <div className="toolbar-row toolbar-row-exec">
        <div className="toolbar-section toolbar-section-mode">
          <div className="toolbar-view-toggle" title="Switch between Focus and Advanced view">
            <button
              className={`toolbar-view-btn${viewMode === "focus" ? " toolbar-view-btn--active" : ""}`}
              onClick={() => onViewModeChange("focus")}
            >
              Focus
            </button>
            <button
              className={`toolbar-view-btn${viewMode === "advanced" ? " toolbar-view-btn--active" : ""}`}
              onClick={() => onViewModeChange("advanced")}
            >
              Advanced
            </button>
          </div>
          <div className="toolbar-row-divider" />
        </div>

        <div className="toolbar-section toolbar-section-config">
          <div className="toolbar-stack toolbar-stack-inline toolbar-speed-slider">
            <span className="toolbar-label">Speed</span>
            <div className="toolbar-speed-group">
              <Slider
                value={stepSpeed}
                min={0}
                step={10}
                max={1000}
                tooltip={{ formatter: (value) => `${value} ms` }}
                className="step-speed"
                onChange={onStepSpeedChange}
              />
            </div>
          </div>

          <div className="toolbar-stack toolbar-stack-inline toolbar-speed-select">
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

          <div className="toolbar-stack toolbar-stack-inline">
            <Dropdown trigger={["click"]} menu={outputModeMenu}>
              <Button className="toolbar-dropdown-btn">{outputMode.toUpperCase()} ▾</Button>
            </Dropdown>
          </div>
        </div>

        <div className="toolbar-spacer" />

        <div className="toolbar-section toolbar-section-exec toolbar-section-actions">
          <div className="toolbar-stack toolbar-stack-inline toolbar-status-block">
            <div className="toolbar-status-row">
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
            </div>
          </div>

          <div className="toolbar-action-group">
            <Button onClick={onAssembleClick} className="toolbar-btn toolbar-btn-assemble" title="Assemble (Ctrl+Enter)">
              <span className="toolbar-btn-inner">
                <CpuIcon />
                <span className="toolbar-btn-label">Assemble</span>
                <kbd className="toolbar-kbd">Ctrl+Enter</kbd>
              </span>
            </Button>

            {isStepping && (
              <Button
                onClick={onStepBackClick}
                disabled={!canStepBack}
                className="toolbar-btn toolbar-btn-back"
                title="Step back (F7)"
              >
                <span className="toolbar-btn-inner">
                  <BackIcon />
                  <span className="toolbar-btn-label">Back</span>
                  <kbd className="toolbar-kbd">F7</kbd>
                </span>
              </Button>
            )}

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

            {isStepping && (
              <Button
                onClick={onMicroStepClick}
                className="toolbar-btn toolbar-btn-micro"
                title="Micro-step one RTL operation (F8)"
              >
                <span className="toolbar-btn-inner">
                  <MicroStepIcon />
                  <span className="toolbar-btn-label">uStep</span>
                  <kbd className="toolbar-kbd">F8</kbd>
                </span>
              </Button>
            )}

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
                    <kbd className="toolbar-kbd">Shift+F5</kbd>
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
    </div>
  );
}

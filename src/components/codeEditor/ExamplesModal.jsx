import { Modal } from "antd";
import { useEffect, useState } from "react";
import { EXAMPLE_PROGRAMS } from "../../data/examplePrograms.js";

const DIFFICULTY_COLOR = {
  Beginner:     { bg: '#0d2118', color: '#4ecf7c', border: '#1a4030' },
  Intermediate: { bg: '#1a1a00', color: '#cfc04e', border: '#3a3a00' },
  Advanced:     { bg: '#1a0000', color: '#cf5a4e', border: '#3a1010' },
};

export default function ExamplesModal({ open, onClose, onLoad }) {
  const [selected, setSelected] = useState(EXAMPLE_PROGRAMS[0]);

  useEffect(() => {
    if (open) {
      setSelected(EXAMPLE_PROGRAMS[0]);
    }
  }, [open]);

  function handleLoad() {
    onLoad?.(selected.code, selected.name);
    onClose?.();
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      title={null}
      className="examples-modal"
      centered
    >
      <div className="examples-modal-inner">
        {/* Left: program list */}
        <div className="examples-list">
          <div className="examples-list-header">
            <span>Example Programs</span>
            <span className="examples-list-count">{EXAMPLE_PROGRAMS.length}</span>
          </div>
          {EXAMPLE_PROGRAMS.map((prog) => {
            const isActive = prog.id === selected.id;
            const diffStyle = DIFFICULTY_COLOR[prog.difficulty] ?? DIFFICULTY_COLOR.Beginner;
            return (
              <button
                key={prog.id}
                className={`examples-list-item${isActive ? ' examples-list-item--active' : ''}`}
                onClick={() => setSelected(prog)}
              >
                <span className="examples-item-name">{prog.name}</span>
                <span
                  className="examples-item-diff"
                  style={{ background: diffStyle.bg, color: diffStyle.color, border: `1px solid ${diffStyle.border}` }}
                >
                  {prog.difficulty}
                </span>
                <span className="examples-item-desc">{prog.description}</span>
              </button>
            );
          })}
        </div>

        {/* Right: preview */}
        <div className="examples-preview">
          <div className="examples-preview-header">
            <div className="examples-preview-title">{selected.name}</div>
            <div className="examples-preview-desc">{selected.description}</div>
          </div>
          <pre className="examples-preview-code">{selected.code}</pre>
          <div className="examples-preview-footer">
            <button className="examples-load-btn" onClick={handleLoad}>
              Load into Editor
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

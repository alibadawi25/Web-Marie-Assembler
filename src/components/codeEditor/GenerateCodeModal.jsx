import { Button, Input, Modal, Select } from "antd";

import {
  CONDITION_OPTIONS,
  GENERATOR_TYPE_CARDS,
  VARIABLE_TYPE_OPTIONS,
} from "./constants.js";
import { buildGenSnippet, getGenerateCodeDisabled } from "./utils.js";

export default function GenerateCodeModal({
  open,
  generatedCode,
  formState,
  identifier,
  onCancel,
  onInsert,
  onGeneratedCodeChange,
  onFormChange,
}) {
  const isDisabled = getGenerateCodeDisabled({
    generatedCode,
    ...formState,
  });

  const previewSnippet = buildGenSnippet(generatedCode, {
    ...formState,
    identifier,
    ifSeq: formState.ifStatementCount + 1,
    loopSeq: formState.loopSeqCount + 1,
  });

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      className="generate-code-modal"
      title={null}
      width={500}
      footer={
        <Button
          className="toolbar-btn toolbar-btn-assemble gen-insert-btn"
          disabled={isDisabled}
          onClick={onInsert}
        >
          Insert into Editor
        </Button>
      }
    >
      <div className="gen-header">
        <div className="gen-title">Generate Code</div>
        <div className="gen-subtitle">Pick a pattern — right-click in editor to open this anytime</div>
      </div>

      <div className="gen-type-cards">
        {GENERATOR_TYPE_CARDS.map(({ key, name, desc }) => (
          <button
            key={key}
            className={`gen-type-card${generatedCode === key ? " gen-type-card--active" : ""}`}
            onClick={() => onGeneratedCodeChange(key)}
          >
            <span className="gen-type-card-name">{name}</span>
            <span className="gen-type-card-desc">{desc}</span>
          </button>
        ))}
      </div>

      <div className="gen-divider" />

      {generatedCode === "if-condition" && (
        <div className="gen-body">
          <p className="gen-hint">
            Works by doing <code>LOAD A</code> → <code>SUBT B</code> → <code>SKIPCOND</code>.<br />
            Type variable names or click the chips below to pick from your code.
          </p>
          <div className="gen-if-row">
            <div className="gen-if-field">
              <label className="gen-label">Variable A</label>
              <Input
                value={formState.ifIdentifier1}
                onChange={(event) => onFormChange("ifIdentifier1", event.target.value)}
                placeholder="e.g. X"
              />
              {identifier.length > 0 && (
                <div className="gen-chips">
                  {identifier.map((id) => (
                    <button
                      key={id}
                      className={`gen-chip${formState.ifIdentifier1 === id ? " gen-chip--active" : ""}`}
                      onClick={() => onFormChange("ifIdentifier1", id)}
                    >
                      {id}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="gen-if-field gen-if-op">
              <label className="gen-label">Condition</label>
              <Select
                value={formState.conditionOperator}
                onChange={(value) => onFormChange("conditionOperator", value)}
                className="gen-op-select"
                popupClassName="gen-op-dropdown"
                popupMatchSelectWidth={false}
                options={CONDITION_OPTIONS}
              />
            </div>
            <div className="gen-if-field">
              <label className="gen-label">Variable B</label>
              <Input
                value={formState.ifIdentifier2}
                onChange={(event) => onFormChange("ifIdentifier2", event.target.value)}
                placeholder="e.g. Y"
              />
              {identifier.length > 0 && (
                <div className="gen-chips">
                  {identifier.map((id) => (
                    <button
                      key={id}
                      className={`gen-chip${formState.ifIdentifier2 === id ? " gen-chip--active" : ""}`}
                      onClick={() => onFormChange("ifIdentifier2", id)}
                    >
                      {id}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {generatedCode === "loop" && (
        <div className="gen-body">
          <p className="gen-hint">
            Generates a countdown loop. The counter starts at <em>N</em> and decrements by 1 each iteration until it hits 0.
          </p>
          <div className="gen-fields">
            <div className="gen-field">
              <label className="gen-label">Counter variable name</label>
              <Input
                placeholder="e.g. counter"
                value={formState.loopLabel}
                onChange={(event) => onFormChange("loopLabel", event.target.value)}
              />
              <span className="gen-field-hint">This label will hold the running count — pick a descriptive name</span>
            </div>
            <div className="gen-field">
              <label className="gen-label">Number of iterations</label>
              <Input
                placeholder="e.g. 10"
                value={formState.loopIterations}
                onChange={(event) => onFormChange("loopIterations", event.target.value)}
                type="number"
                min={1}
              />
              <span className="gen-field-hint">How many times should the loop body run?</span>
            </div>
          </div>
        </div>
      )}

      {generatedCode === "subroutine" && (
        <div className="gen-body">
          <p className="gen-hint">
            MARIE subroutines use <code>JNS</code> to call and <code>JUMPI</code> to return.<br />
            After inserting, call your subroutine anywhere with <code>jns {formState.subroutineName.trim() || "name"}</code>.
          </p>
          <div className="gen-fields">
            <div className="gen-field">
              <label className="gen-label">Subroutine name</label>
              <Input
                placeholder="e.g. printChar"
                value={formState.subroutineName}
                onChange={(event) => onFormChange("subroutineName", event.target.value)}
              />
              <span className="gen-field-hint">Use a descriptive name — it becomes the label and call target</span>
            </div>
          </div>
        </div>
      )}

      {generatedCode === "variable" && (
        <div className="gen-body">
          <p className="gen-hint">
            Insert a variable declaration anywhere in your file. Choose whether it should be stored as <code>DEC</code> or <code>HEX</code>.
          </p>
          <div className="gen-fields">
            <div className="gen-field">
              <label className="gen-label">Variable name</label>
              <Input
                placeholder="e.g. total"
                value={formState.variableName}
                onChange={(event) => onFormChange("variableName", event.target.value)}
              />
              <span className="gen-field-hint">This becomes the label you can reference with LOAD, STORE, ADD, and more</span>
            </div>
            <div className="gen-field">
              <label className="gen-label">Value type</label>
              <Select
                value={formState.variableType}
                onChange={(value) => onFormChange("variableType", value)}
                className="gen-op-select"
                popupClassName="gen-op-dropdown"
                popupMatchSelectWidth={false}
                options={VARIABLE_TYPE_OPTIONS}
              />
              <span className="gen-field-hint">Use DEC for integers or HEX for hexadecimal values</span>
            </div>
            <div className="gen-field">
              <label className="gen-label">Initial value</label>
              <Input
                placeholder={formState.variableType === "hex" ? "e.g. FF" : "e.g. 42"}
                value={formState.variableValue}
                onChange={(event) => onFormChange("variableValue", event.target.value)}
              />
              <span className="gen-field-hint">
                {formState.variableType === "hex"
                  ? "Enter hexadecimal digits only, without 0x"
                  : "Enter a decimal integer such as 0, 5, or -1"}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="gen-preview-block">
        <div className="gen-preview-label">Preview — what gets inserted</div>
        <pre className="gen-preview-code">
          {previewSnippet || "— fill in the fields above —"}
        </pre>
      </div>
    </Modal>
  );
}

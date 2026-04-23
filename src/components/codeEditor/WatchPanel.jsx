import { useState } from "react";

import { formatRegValue, formatSignedValue } from "./utils.js";

function hex(n, pad = 3) {
  return n.toString(16).toUpperCase().padStart(pad, "0");
}

export default function WatchPanel({ watchList, memory, symbolTable, onAddWatch, onRemoveWatch }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (symbolTable && trimmed in symbolTable) {
      onAddWatch?.(symbolTable[trimmed], trimmed);
      setInput("");
      setError("");
      return;
    }

    let addr = Number.NaN;
    if (/^0x[0-9a-fA-F]+$/i.test(trimmed)) {
      addr = parseInt(trimmed, 16);
    } else if (/^[0-9a-fA-F]{1,3}$/.test(trimmed)) {
      addr = parseInt(trimmed, 16);
    } else if (/^\d+$/.test(trimmed)) {
      addr = parseInt(trimmed, 10);
    }

    if (Number.isNaN(addr) || addr < 0 || addr > 0xfff) {
      setError("Enter a label or hex address (0-FFF).");
      return;
    }

    onAddWatch?.(addr, null);
    setInput("");
    setError("");
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") handleAdd();
  }

  const mem = memory ?? new Uint16Array(4096);

  return (
    <div className="watch-panel">
      <div className="watch-add-row">
        <input
          className="watch-input"
          placeholder="Label or hex addr"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setError("");
          }}
          onKeyDown={handleKeyDown}
        />
        <button className="watch-add-btn" onClick={handleAdd} title="Add to watch list">
          +
        </button>
      </div>

      <p className="watch-helper">Try a label like `sum` or an address like `0F2`.</p>
      {error && <div className="watch-error">{error}</div>}

      {watchList.length === 0 && (
        <div className="watch-empty">
          Add values you want to keep an eye on while stepping through execution.
        </div>
      )}

      {watchList.map(({ address, label }) => {
        const value = mem[address] ?? 0;
        return (
          <div key={address} className="watch-row">
            <span className="watch-row-label" title={label ?? hex(address)}>
              {label ?? `@${hex(address)}`}
            </span>
            <span className="watch-row-addr">@{hex(address)}</span>
            <span className="watch-row-hex">{formatRegValue(value)}</span>
            <span className="watch-row-dec">{formatSignedValue(value)}</span>
            <button
              className="watch-remove-btn"
              title="Remove"
              onClick={() => onRemoveWatch?.(address)}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

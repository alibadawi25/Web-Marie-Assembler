import { useEffect, useRef } from "react";

const DISPLAY_BASE = 0xf00;
const DISPLAY_COLS = 16;
const DISPLAY_ROWS = 16;

function expand5to8(v5) {
  return (v5 << 3) | (v5 >> 2);
}

export default function DisplayPanel({ memory }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.createImageData(DISPLAY_COLS, DISPLAY_ROWS);
    const data = imageData.data;

    for (let row = 0; row < DISPLAY_ROWS; row++) {
      for (let col = 0; col < DISPLAY_COLS; col++) {
        const addr = DISPLAY_BASE + row * DISPLAY_COLS + col;
        const value = memory[addr] ?? 0;
        const pixelIndex = (row * DISPLAY_COLS + col) * 4;
        data[pixelIndex]     = expand5to8((value >> 10) & 0x1f);
        data[pixelIndex + 1] = expand5to8((value >> 5) & 0x1f);
        data[pixelIndex + 2] = expand5to8(value & 0x1f);
        data[pixelIndex + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [memory]);

  return (
    <div className="display-panel">
      <canvas
        ref={canvasRef}
        width={DISPLAY_COLS}
        height={DISPLAY_ROWS}
        className="display-canvas"
        title="16×16 RGB display — memory 0xF00–0xFFF"
      />
      <div className="display-panel-format">
        <span className="display-panel-addr">0xF00 – 0xFFF</span>
        <span className="display-panel-fmt">bit 15·unused · 14–10·R · 9–5·G · 4–0·B</span>
      </div>
    </div>
  );
}

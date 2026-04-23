import { useEffect, useRef } from "react";

export function usePanelResizers({
  terminalHeight,
  setTerminalHeight,
  statePanelWidth,
  setStatePanelWidth,
  rtlPanelWidth,
  setRtlPanelWidth,
}) {
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const isHorizontalDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const isRtlDragging = useRef(false);
  const rtlDragStartX = useRef(0);
  const rtlDragStartWidth = useRef(0);

  useEffect(() => {
    function onMouseMove(event) {
      if (isDragging.current) {
        const delta = dragStartY.current - event.clientY;
        const nextHeight = Math.min(600, Math.max(80, dragStartHeight.current + delta));
        setTerminalHeight(nextHeight);
      }

      if (isHorizontalDragging.current) {
        const delta = dragStartX.current - event.clientX;
        const nextWidth = Math.min(520, Math.max(140, dragStartWidth.current + delta));
        setStatePanelWidth(nextWidth);
      }

      if (isRtlDragging.current) {
        const delta = event.clientX - rtlDragStartX.current;
        const nextWidth = Math.min(400, Math.max(120, rtlDragStartWidth.current + delta));
        setRtlPanelWidth?.(nextWidth);
      }
    }

    function onMouseUp() {
      if (isDragging.current || isHorizontalDragging.current || isRtlDragging.current) {
        isDragging.current = false;
        isHorizontalDragging.current = false;
        isRtlDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [setRtlPanelWidth, setStatePanelWidth, setTerminalHeight]);

  function handleResizeStart(event) {
    isDragging.current = true;
    dragStartY.current = event.clientY;
    dragStartHeight.current = terminalHeight;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
    event.preventDefault();
  }

  function handleHorizontalResizeStart(event) {
    isHorizontalDragging.current = true;
    dragStartX.current = event.clientX;
    dragStartWidth.current = statePanelWidth;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    event.preventDefault();
  }

  function handleRtlResizeStart(event) {
    isRtlDragging.current = true;
    rtlDragStartX.current = event.clientX;
    rtlDragStartWidth.current = rtlPanelWidth ?? 200;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    event.preventDefault();
  }

  return {
    handleResizeStart,
    handleHorizontalResizeStart,
    handleRtlResizeStart,
  };
}

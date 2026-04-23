import { App } from "antd";
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";

import assembleCode from "../utils/marieAssembler.js";
import { MarieSimulator } from "../utils/marieSimulator.js";
import EditorToolbar from "./codeEditor/EditorToolbar.jsx";
import DataPathDiagram from "./codeEditor/DataPathDiagram.jsx";
import ExamplesModal from "./codeEditor/ExamplesModal.jsx";
import ExecutionPanels, { StateColumn } from "./codeEditor/ExecutionPanels.jsx";
import GenerateCodeModal from "./codeEditor/GenerateCodeModal.jsx";
import MarieInputModal from "./codeEditor/MarieInputModal.jsx";
import StatsBar from "./codeEditor/StatsBar.jsx";
import {
  DEFAULT_CODE,
  EDITOR_OPTIONS,
  STORAGE_KEYS,
} from "./codeEditor/constants.js";
import { registerMarieLanguage } from "./codeEditor/monacoSetup.js";
import { usePanelResizers } from "./codeEditor/usePanelResizers.js";
import {
  buildAddressToLineMap,
  buildFileNameFromProjectName,
  buildGenSnippet,
  buildInitialMemoryValues,
  buildProgramArray,
  decodeShareParam,
  downloadFile,
  encodeShareUrl,
  exportAsBinary,
  exportAsHexDump,
  exportAsLogisim,
  getInputValue,
  getProjectNameFromFileName,
  normalizeProjectName,
  validateCodeStructure,
} from "./codeEditor/utils.js";
import "./CodeEditor.css";

const MonacoEditor = lazy(() =>
  import("@monaco-editor/react").then((mod) => ({ default: mod.Editor }))
);

const EMPTY_STATS = { instructionCount: 0, cycleCount: 0, memoryReads: 0, memoryWrites: 0, inputOps: 0, outputOps: 0 };
const RECENTLY_ACCESSED_TTL = 1200; // ms

function CodeEditor() {
  const { message, notification } = App.useApp();

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationRef = useRef([]);
  const identifierRef = useRef([]);
  const currentLineDecRef = useRef([]);
  const breakpointDecRef = useRef([]);
  const addressToLineRef = useRef({});
  const lineToAddressRef = useRef({});
  const symbolTableRef = useRef({});
  const terminalRef = useRef(null);
  const fileInputRef = useRef(null);
  const simulatorRef = useRef(MarieSimulator.getInstance());
  const handlersRef = useRef({});
  const stepIndexRef = useRef(0);

  // Timers for "recently accessed" highlight fade
  const recentlyWrittenTimers = useRef({});
  const recentlyReadTimers = useRef({});

  const simulator = simulatorRef.current;

  // ─── Panel sizes ──────────────────────────────────────────────────────────
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 640;
  const [terminalHeight, setTerminalHeight] = useState(isMobile ? 160 : 220);
  const [statePanelWidth, setStatePanelWidth] = useState(520);
  const [rtlPanelWidth, setRtlPanelWidth] = useState(200);
  const [outputCollapsed, setOutputCollapsed] = useState(false);
  const [stateCollapsed, setStateCollapsed] = useState(isMobile);
  const [rtlLogCollapsed, setRtlLogCollapsed] = useState(true);
  const [historyCollapsed, setHistoryCollapsed] = useState(true);

  // ─── Register / memory state ──────────────────────────────────────────────
  const [registerState, setRegisterState] = useState({ AC: 0, PC: 0, IR: 0, MAR: 0, MBR: 0 });
  const [memoryValues, setMemoryValues] = useState({});
  const [fullMemory, setFullMemory] = useState(new Uint16Array(4096));
  const [accessCounts, setAccessCounts] = useState(null);
  const [recentlyWritten, setRecentlyWritten] = useState(new Set());
  const [recentlyRead, setRecentlyRead] = useState(new Set());

  // ─── Execution state ──────────────────────────────────────────────────────
  const [isStepping, setIsStepping] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isCodeAssembled, setIsCodeAssembled] = useState(false);
  const [canStepBack, setCanStepBack] = useState(false);
  const [simStats, setSimStats] = useState(EMPTY_STATS);

  // ─── RTL log & history ────────────────────────────────────────────────────
  const [rtlLog, setRtlLog] = useState([]);
  const [executionHistory, setExecutionHistory] = useState([]);
  const prevStateRef = useRef(null); // captures state before each step for history

  // ─── Watch list ───────────────────────────────────────────────────────────
  const [watchList, setWatchList] = useState([]);

  // ─── Breakpoints (line numbers) ───────────────────────────────────────────
  const [breakpoints, setBreakpoints] = useState(new Set());

  // ─── Code / project state ─────────────────────────────────────────────────
  const [code, setCode] = useState(DEFAULT_CODE);
  const [machineCode, setMachineCode] = useState([]);
  const [startAddress, setStartAddress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [output, setOutput] = useState([]);
  const [identifier, setIdentifier] = useState([]);
  const [inputModalVisible, setInputModalVisible] = useState(false);
  const [generateCodeModalVisible, setGenerateCodeModalVisible] = useState(false);
  const [generateCodeInsertPosition, setGenerateCodeInsertPosition] = useState(null);
  const [generatedCode, setGeneratedCode] = useState("if-condition");
  const [examplesModalVisible, setExamplesModalVisible] = useState(false);
  const [dataPathVisible, setDataPathVisible] = useState(false);

  const [generatorForm, setGeneratorForm] = useState({
    ifIdentifier1: "", conditionOperator: "==", ifIdentifier2: "",
    ifStatementCount: 0, loopLabel: "", loopIterations: "10",
    loopSeqCount: 0, subroutineName: "", subroutineSeqCount: 0,
    variableName: "", variableType: "dec", variableValue: "0",
  });

  const [fileName, setFileName] = useState("program.mas");
  const [projectName, setProjectName] = useState("Untitled Project");
  const [recentProjects, setRecentProjects] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [inputType, setInputType] = useState("dec");
  const [outputMode, setOutputMode] = useState("dec");
  const [stepSpeed, setStepSpeed] = useState(100);
  const [viewMode, setViewMode] = useState(() =>
    localStorage.getItem("marie-view-mode") || "focus"
  );

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    localStorage.setItem("marie-view-mode", mode);
  }, []);

  const { handleResizeStart, handleHorizontalResizeStart, handleRtlResizeStart } = usePanelResizers({
    terminalHeight, setTerminalHeight,
    statePanelWidth, setStatePanelWidth,
    rtlPanelWidth, setRtlPanelWidth,
  });

  // ─── Monaco helpers ───────────────────────────────────────────────────────

  const handleEditorWillMount = useCallback((monaco) => {
    registerMarieLanguage(monaco, identifierRef, symbolTableRef);
  }, []);

  const highlightCurrentLine = useCallback((lineNumber) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    currentLineDecRef.current = editor.deltaDecorations(
      currentLineDecRef.current,
      lineNumber ? [{
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: { isWholeLine: true, className: "executingLineHighlight" },
      }] : []
    );
  }, []);

  const highlightErrorLine = useCallback((lineNumber, msg) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;
    if (lineNumber && model.getLineCount() >= lineNumber) {
      const lineLength = model.getLineLength(lineNumber);
      monaco.editor.setModelMarkers(model, "owner", [{
        startLineNumber: lineNumber, startColumn: 1,
        endLineNumber: lineNumber, endColumn: lineLength + 1,
        message: msg || "Syntax error", severity: monaco.MarkerSeverity.Error,
      }]);
      decorationRef.current = editor.deltaDecorations(decorationRef.current, [{
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: { isWholeLine: true, className: "errorLineHighlight" },
      }]);
      return;
    }
    monaco.editor.setModelMarkers(model, "owner", []);
    decorationRef.current = editor.deltaDecorations(decorationRef.current, []);
  }, []);

  // Sync breakpoint glyph decorations to Monaco
  const applyBreakpointDecorations = useCallback((bps) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const decorations = [...bps].map((line) => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: false,
        glyphMarginClassName: 'breakpoint-glyph',
      },
    }));
    breakpointDecRef.current = editor.deltaDecorations(breakpointDecRef.current, decorations);
  }, []);

  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.addAction({
      id: "generate",
      label: "Generate Code",
      contextMenuGroupId: "navigation",
      run: (activeEditor) => {
        setGenerateCodeInsertPosition(activeEditor.getPosition());
        setGenerateCodeModalVisible(true);
      },
    });

    // Breakpoint gutter click
    editor.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const line = e.target.position?.lineNumber;
        if (!line) return;
        setBreakpoints((prev) => {
          const next = new Set(prev);
          if (next.has(line)) next.delete(line);
          else next.add(line);
          applyBreakpointDecorations(next);
          return next;
        });
      }
    });
  }, [applyBreakpointDecorations]);

  // ─── Memory snapshot helpers ──────────────────────────────────────────────

  const snapshotMemory = useCallback(() => {
    const symbolTable = symbolTableRef.current;
    if (!Object.keys(symbolTable).length) return;
    const snapshot = {};
    for (const [label, addr] of Object.entries(symbolTable)) {
      snapshot[label] = { addr, value: simulator.memory[addr] ?? 0 };
    }
    setMemoryValues(snapshot);
  }, [simulator]);

  const snapshotFullMemory = useCallback(() => {
    setFullMemory(new Uint16Array(simulator.memory));
    setAccessCounts(simulator.getAccessCounts());
  }, [simulator]);

  // Flash a recently-accessed address (briefly highlight in memory grid)
  const flashWrite = useCallback((addr) => {
    setRecentlyWritten((prev) => new Set([...prev, addr]));
    clearTimeout(recentlyWrittenTimers.current[addr]);
    recentlyWrittenTimers.current[addr] = setTimeout(() => {
      setRecentlyWritten((prev) => { const next = new Set(prev); next.delete(addr); return next; });
    }, RECENTLY_ACCESSED_TTL);
  }, []);

  const flashRead = useCallback((addr) => {
    setRecentlyRead((prev) => new Set([...prev, addr]));
    clearTimeout(recentlyReadTimers.current[addr]);
    recentlyReadTimers.current[addr] = setTimeout(() => {
      setRecentlyRead((prev) => { const next = new Set(prev); next.delete(addr); return next; });
    }, RECENTLY_ACCESSED_TTL);
  }, []);

  // ─── Persist / restore ───────────────────────────────────────────────────

  const persistSource = useCallback((nextCode, nextFileName = fileName, nextProjectName = projectName) => {
    window.localStorage.setItem(STORAGE_KEYS.source, nextCode);
    window.localStorage.setItem(STORAGE_KEYS.fileName, nextFileName);
    window.localStorage.setItem(STORAGE_KEYS.projectName, nextProjectName);
  }, [fileName, projectName]);

  // ─── Reset ────────────────────────────────────────────────────────────────

  const resetExecutionState = useCallback(() => {
    simulator.stop();
    setIsRunning(false);
    setIsStepping(false);
    setIsCodeAssembled(false);
    setMachineCode([]);
    setStartAddress(0);
    setOutput([]);
    setErrorMessage("");
    setRegisterState({ AC: 0, PC: 0, IR: 0, MAR: 0, MBR: 0 });
    setMemoryValues({});
    setFullMemory(new Uint16Array(4096));
    setAccessCounts(null);
    setRtlLog([]);
    setExecutionHistory([]);
    setSimStats(EMPTY_STATS);
    setCanStepBack(false);
    prevStateRef.current = null;
    stepIndexRef.current = 0;
    addressToLineRef.current = {};
    lineToAddressRef.current = {};
    symbolTableRef.current = {};
    highlightCurrentLine(null);
  }, [highlightCurrentLine, simulator]);

  // ─── Recent projects ──────────────────────────────────────────────────────

  const saveRecentProjectSnapshot = useCallback((nextCode = code, nextFileName = fileName, nextProjectName = projectName) => {
    const normalizedProjectName = normalizeProjectName(nextProjectName);
    const normalizedFileName = nextFileName.trim() || buildFileNameFromProjectName(normalizedProjectName, nextFileName);
    setRecentProjects((previousProjects) => {
      const nextRecentProjects = [
        { name: normalizedProjectName, fileName: normalizedFileName, code: nextCode, savedAt: new Date().toISOString() },
        ...previousProjects.filter((p) => p.name.toLowerCase() !== normalizedProjectName.toLowerCase()),
      ].slice(0, 6);
      window.localStorage.setItem(STORAGE_KEYS.recentProjects, JSON.stringify(nextRecentProjects));
      return nextRecentProjects;
    });
  }, [code, fileName, projectName]);

  const applyCodeValue = useCallback((value = "", nextFileName, nextProjectName) => {
    setCode(value);
    setFileName(nextFileName);
    setProjectName(nextProjectName);
    resetExecutionState();
    persistSource(value, nextFileName, nextProjectName);
    const { identifiers, errorLine, errorMessage: nextErrorMessage } = validateCodeStructure(value);
    setIdentifier(identifiers);
    identifierRef.current = identifiers;
    highlightErrorLine(errorLine, nextErrorMessage);
  }, [highlightErrorLine, persistSource, resetExecutionState]);

  const handleCodeChange = useCallback((value = "") => {
    applyCodeValue(value, fileName, projectName);
  }, [applyCodeValue, fileName, projectName]);

  // ─── Output formatting ────────────────────────────────────────────────────

  const handleOutput = useCallback((value) => {
    let formatted = value;
    if (outputMode === "hex") formatted = `0x${Number(value).toString(16).toUpperCase()}`;
    else if (outputMode === "bin") formatted = `0b${Number(value).toString(2)}`;
    else if (outputMode === "unicode") formatted = typeof value === "number" ? String.fromCharCode(value) : value;
    setOutput((prev) => [...prev, formatted]);
  }, [outputMode]);

  // ─── Simulator callbacks (set in useEffect) ───────────────────────────────

  useEffect(() => {
    simulator.outputCallback = handleOutput;
    simulator.errorCallback = (error) => {
      setErrorMessage(error.message);
      setIsRunning(false);
      setIsStepping(false);
      highlightCurrentLine(null);
    };
    simulator.inputCallback = () => setInputModalVisible(true);
    simulator.onProgramEnd = () => {
      const state = simulator.getState();
      setRegisterState({ AC: state.AC, PC: state.PC, IR: state.IR, MAR: state.MAR, MBR: state.MBR });
      snapshotMemory();
      snapshotFullMemory();
      setSimStats(simulator.getStats());
      setIsRunning(false);
      setIsStepping(false);
      setCanStepBack(false);
      highlightCurrentLine(null);
    };
    simulator.onBreakpointHit = (addr) => {
      const line = addressToLineRef.current[addr] ?? null;
      setIsRunning(false);
      setIsStepping(true);
      setCanStepBack(simulator.canStepBack);
      highlightCurrentLine(line);
      notification.info({
        message: `Breakpoint hit`,
        description: line ? `Paused at line ${line}` : `Paused at address 0x${addr.toString(16).toUpperCase()}`,
        duration: 3,
      });
    };
    simulator.onStep = (registers) => {
      setRegisterState({ AC: registers.AC, PC: registers.PC, IR: registers.IR, MAR: registers.MAR, MBR: registers.MBR });
      snapshotMemory();
      snapshotFullMemory();
      setSimStats(simulator.getStats());
      setCanStepBack(simulator.canStepBack);

      // Capture execution history entry
      if (prevStateRef.current) {
        const stepIdx = stepIndexRef.current++;
        const entry = {
          stepIndex: stepIdx,
          preState: prevStateRef.current,
          postState: { ...registers },
        };
        setExecutionHistory((prev) => [...prev.slice(-49), entry]);
      }
      prevStateRef.current = { ...registers };

      if (registers.PC !== undefined) {
        highlightCurrentLine(addressToLineRef.current[registers.PC] ?? null);
      }
    };
    simulator.onMicroStep = (op, registers) => {
      setRegisterState({ AC: registers.AC, PC: registers.PC, IR: registers.IR, MAR: registers.MAR, MBR: registers.MBR });
      snapshotFullMemory();

      setRtlLog((prev) => [...prev.slice(-199), {
        phase: op.phase,
        description: op.description,
        changedRegisters: op.changedRegisters,
      }]);

      // Flash memory grid for read/write ops
      const mar = registers.MAR;
      if (op.description.includes('M[MAR] ←')) flashWrite(mar);
      else if (op.description.includes('← M[MAR]')) flashRead(mar);

      // Expand RTL log automatically when first micro-step fires
      setRtlLogCollapsed(false);
    };

    return () => {
      simulator.outputCallback = null;
      simulator.errorCallback = null;
      simulator.inputCallback = null;
      simulator.onProgramEnd = null;
      simulator.onStep = null;
      simulator.onMicroStep = null;
      simulator.onBreakpointHit = null;
    };
  }, [flashRead, flashWrite, handleOutput, highlightCurrentLine, notification, simulator, snapshotFullMemory, snapshotMemory]);

  // Sync breakpoint addresses to simulator whenever breakpoints or assembly changes
  useEffect(() => {
    const lineToAddr = lineToAddressRef.current;
    const addrSet = new Set();
    for (const line of breakpoints) {
      const addr = lineToAddr[line];
      if (addr !== undefined) addrSet.add(addr);
    }
    simulator.breakpointAddresses = addrSet;
  }, [breakpoints, simulator]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  // ─── Execution controls ───────────────────────────────────────────────────

  const handleRunClick = useCallback(() => {
    if (!machineCode.length) { setErrorMessage("No machine code available. Assemble first."); return; }
    setErrorMessage("");
    setOutput([]);
    setIsStepping(false);
    setRtlLog([]);
    setExecutionHistory([]);
    setSimStats(EMPTY_STATS);
    stepIndexRef.current = 0;
    prevStateRef.current = null;
    highlightCurrentLine(null);
    simulator.loadProgram(buildProgramArray(machineCode), startAddress);
    simulator.run();
    setIsRunning(true);
  }, [highlightCurrentLine, machineCode, simulator, startAddress]);

  const handleStepClick = useCallback(() => {
    if (!machineCode.length) { setErrorMessage("No machine code available. Assemble first."); return; }

    if (!isStepping) {
      setErrorMessage("");
      setOutput([]);
      setRtlLog([]);
      setExecutionHistory([]);
      setSimStats(EMPTY_STATS);
      stepIndexRef.current = 0;
      simulator.loadProgram(buildProgramArray(machineCode), startAddress);
      setIsRunning(true);
      setIsStepping(true);
      setCanStepBack(false);
      prevStateRef.current = simulator._captureRegisters();
      setRegisterState({ AC: 0, PC: simulator.PC, IR: 0, MAR: 0, MBR: 0 });
      highlightCurrentLine(addressToLineRef.current[simulator.PC] ?? null);
      return;
    }

    if (!simulator.running) return;

    prevStateRef.current = simulator._captureRegisters();
    try {
      simulator.step();
    } catch (error) {
      setErrorMessage(error.message);
      setIsRunning(false);
      setIsStepping(false);
      highlightCurrentLine(null);
    }
  }, [highlightCurrentLine, isStepping, machineCode, simulator, startAddress]);

  const handleMicroStepClick = useCallback(() => {
    if (!isStepping || !simulator.running) return;
    try {
      simulator.stepMicro();
    } catch (error) {
      setErrorMessage(error.message);
      setIsRunning(false);
      setIsStepping(false);
      highlightCurrentLine(null);
    }
  }, [highlightCurrentLine, isStepping, simulator]);

  const handleStepBackClick = useCallback(() => {
    if (!isStepping) return;
    const restored = simulator.stepBack();
    if (restored) {
      setCanStepBack(simulator.canStepBack);
      snapshotMemory();
      snapshotFullMemory();
    }
  }, [isStepping, simulator, snapshotFullMemory, snapshotMemory]);

  const handleStopClick = useCallback(() => {
    simulator.stop();
    setIsRunning(false);
    setIsStepping(false);
    setCanStepBack(false);
    highlightCurrentLine(null);
  }, [highlightCurrentLine, simulator]);

  const handleAssembleClick = useCallback(() => {
    const result = assembleCode(code);
    if (!result.success) {
      const firstError = result.errors?.[0];
      setOutput([]);
      setMachineCode([]);
      setIsCodeAssembled(false);
      setErrorMessage(firstError?.message ?? "Assembly failed");
      highlightErrorLine(firstError?.line ?? null, firstError?.message);
      return;
    }

    setMachineCode(result.machineCode);
    setStartAddress(result.startAddress ?? 0);
    setOutput([]);
    setErrorMessage("");
    setIsCodeAssembled(true);
    setRegisterState({ AC: 0, PC: 0, IR: 0, MAR: 0, MBR: 0 });
    setMemoryValues(buildInitialMemoryValues(result.symbolTable ?? {}, result.machineCode, result.startAddress ?? 0));
    setIsStepping(false);
    setRtlLog([]);
    setExecutionHistory([]);
    setSimStats(EMPTY_STATS);
    setCanStepBack(false);
    highlightErrorLine(null);
    highlightCurrentLine(null);

    // Build address↔line maps
    const a2l = buildAddressToLineMap(result.machineCode, result.startAddress ?? 0);
    addressToLineRef.current = a2l;
    symbolTableRef.current = result.symbolTable ?? {};

    // Build inverse map (line → address)
    const l2a = {};
    for (const [addr, line] of Object.entries(a2l)) {
      l2a[line] = Number(addr);
    }
    lineToAddressRef.current = l2a;

    // Update breakpoint addresses in simulator
    const addrSet = new Set();
    for (const line of breakpoints) {
      const addr = l2a[line];
      if (addr !== undefined) addrSet.add(addr);
    }
    simulator.breakpointAddresses = addrSet;
  }, [breakpoints, code, highlightCurrentLine, highlightErrorLine, simulator]);

  // ─── Share / Export ───────────────────────────────────────────────────────

  const handleShareClick = useCallback(async () => {
    const url = encodeShareUrl(code);
    try {
      await navigator.clipboard.writeText(url);
      message.success('Link copied to clipboard!');
    } catch {
      message.info(`Share URL: ${url}`);
    }
  }, [code, message]);

  const handleExportClick = useCallback((type) => {
    const codes = machineCode.map((item) => item.code);
    const baseName = buildFileNameFromProjectName(projectName, fileName).replace(/\.[^.]+$/, '');
    if (type === 'hex') {
      downloadFile(exportAsHexDump(codes, startAddress), `${baseName}.hex`, 'text/plain');
    } else if (type === 'bin') {
      downloadFile(exportAsBinary(codes), `${baseName}.bin`, 'application/octet-stream');
    } else if (type === 'logisim') {
      downloadFile(exportAsLogisim(codes), `${baseName}-logisim.hex`, 'text/plain');
    }
  }, [fileName, machineCode, projectName, startAddress]);

  // ─── Examples ─────────────────────────────────────────────────────────────

  const handleLoadExample = useCallback((exCode, exName) => {
    const exFileName = `${exName.replace(/\s+/g, '-').toLowerCase()}.mas`;
    applyCodeValue(exCode, exFileName, exName);
    saveRecentProjectSnapshot(exCode, exFileName, exName);
  }, [applyCodeValue, saveRecentProjectSnapshot]);

  // ─── Watch list ───────────────────────────────────────────────────────────

  const handleAddWatch = useCallback((address, label) => {
    setWatchList((prev) => {
      if (prev.some((w) => w.address === address)) return prev;
      return [...prev, { address, label: label ?? null }];
    });
  }, []);

  const handleRemoveWatch = useCallback((address) => {
    setWatchList((prev) => prev.filter((w) => w.address !== address));
  }, []);

  // ─── Input ────────────────────────────────────────────────────────────────

  const handleInputConfirm = useCallback(() => {
    const result = simulator.setInput([getInputValue(inputType, inputValue)]);
    if (!result?.success) { setErrorMessage(result?.error?.message ?? "Invalid input"); return; }
    if (isStepping) {
      simulator.running = true;
    } else {
      simulator.resume();
    }
    setInputModalVisible(false);
    setInputValue("");
    setInputType("dec");
  }, [inputType, inputValue, isStepping, simulator]);

  // ─── File operations ──────────────────────────────────────────────────────

  const handleStepSpeedChange = useCallback((value) => {
    simulator.setDelay(value);
    setStepSpeed(value);
  }, [simulator]);

  const handleProjectNameChange = useCallback((event) => {
    const nextProjectName = event.target.value;
    setProjectName(nextProjectName);
    persistSource(code, fileName, nextProjectName);
  }, [code, fileName, persistSource]);

  const handleLoadRecentProject = useCallback(({ key }) => {
    const selectedProject = recentProjects[Number(key)];
    if (!selectedProject) return;
    applyCodeValue(selectedProject.code, selectedProject.fileName, selectedProject.name);
    saveRecentProjectSnapshot(selectedProject.code, selectedProject.fileName, selectedProject.name);
  }, [applyCodeValue, recentProjects, saveRecentProjectSnapshot]);

  const handleSaveSource = useCallback(() => {
    const normalizedProjectName = normalizeProjectName(projectName);
    const finalName = buildFileNameFromProjectName(normalizedProjectName, fileName);
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = finalName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
    setFileName(finalName);
    setProjectName(normalizedProjectName);
    persistSource(code, finalName, normalizedProjectName);
    saveRecentProjectSnapshot(code, finalName, normalizedProjectName);
  }, [code, fileName, persistSource, projectName, saveRecentProjectSnapshot]);

  const handleLoadSourceClick = useCallback(() => { fileInputRef.current?.click(); }, []);

  const handleLoadSource = useCallback((event) => {
    const [selectedFile] = event.target.files ?? [];
    if (!selectedFile) return;
    const reader = new FileReader();
    reader.onload = () => {
      const loadedCode = String(reader.result ?? "");
      const loadedProjectName = getProjectNameFromFileName(selectedFile.name);
      applyCodeValue(loadedCode, selectedFile.name, loadedProjectName);
      saveRecentProjectSnapshot(loadedCode, selectedFile.name, loadedProjectName);
    };
    reader.onerror = () => { setErrorMessage("Unable to read the selected file."); };
    reader.readAsText(selectedFile);
    event.target.value = "";
  }, [applyCodeValue, saveRecentProjectSnapshot]);

  // ─── Code generation ──────────────────────────────────────────────────────

  const handleGeneratorFormChange = useCallback((field, value) => {
    setGeneratorForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleInsertGenerated = useCallback(() => {
    let nextGeneratedSnippet = "";
    if (generatedCode === "if-condition") {
      const nextSequence = generatorForm.ifStatementCount + 1;
      setGeneratorForm((prev) => ({ ...prev, ifStatementCount: nextSequence }));
      nextGeneratedSnippet = buildGenSnippet("if-condition", { ...generatorForm, identifier, ifSeq: nextSequence, loopSeq: generatorForm.loopSeqCount + 1 });
    } else if (generatedCode === "loop") {
      const nextSequence = generatorForm.loopSeqCount + 1;
      setGeneratorForm((prev) => ({ ...prev, loopSeqCount: nextSequence }));
      nextGeneratedSnippet = buildGenSnippet("loop", { ...generatorForm, identifier, ifSeq: generatorForm.ifStatementCount + 1, loopSeq: nextSequence });
    } else if (generatedCode === "subroutine") {
      const nextSequence = generatorForm.subroutineSeqCount + 1;
      setGeneratorForm((prev) => ({ ...prev, subroutineSeqCount: nextSequence }));
      nextGeneratedSnippet = buildGenSnippet("subroutine", { ...generatorForm, identifier, ifSeq: generatorForm.ifStatementCount + 1, loopSeq: generatorForm.loopSeqCount + 1 });
    } else if (generatedCode === "variable") {
      nextGeneratedSnippet = buildGenSnippet("variable", { ...generatorForm, identifier, ifSeq: generatorForm.ifStatementCount + 1, loopSeq: generatorForm.loopSeqCount + 1 });
    }

    const editor = editorRef.current;
    const MonacoRange = monacoRef.current?.Range;
    if (!editor || !MonacoRange) return;

    if (nextGeneratedSnippet && generateCodeInsertPosition) {
      const { lineNumber, column } = generateCodeInsertPosition;
      editor.executeEdits("insert-generated-code", [
        { range: new MonacoRange(lineNumber, column, lineNumber, column), text: nextGeneratedSnippet, forceMoveMarkers: true },
      ]);
    }

    if (generatedCode === "if-condition") {
      const newVars = [generatorForm.ifIdentifier1.trim(), generatorForm.ifIdentifier2.trim()]
        .filter((v, i, a) => v && !identifier.includes(v) && a.indexOf(v) === i);
      if (newVars.length > 0) {
        const model = editor.getModel();
        const lastLine = model.getLineCount();
        const lastColumn = model.getLineLength(lastLine) + 1;
        editor.executeEdits("append-variables", [
          { range: new MonacoRange(lastLine, lastColumn, lastLine, lastColumn), text: `\n${newVars.map((v) => `${v}, dec 0`).join("\n")}`, forceMoveMarkers: true },
        ]);
      }
    }

    setGenerateCodeInsertPosition(null);
    setGenerateCodeModalVisible(false);
  }, [generateCodeInsertPosition, generatedCode, generatorForm, identifier]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────

  handlersRef.current = {
    handleSaveSource, handleLoadSourceClick, handleAssembleClick,
    handleRunClick, handleStopClick, handleStepClick,
    handleMicroStepClick, handleStepBackClick,
  };

  useEffect(() => {
    function onKeyDown(event) {
      const mod = event.ctrlKey || event.metaKey;
      const { handleSaveSource: save, handleLoadSourceClick: load, handleAssembleClick: assemble,
        handleRunClick: run, handleStopClick: stop, handleStepClick: step,
        handleMicroStepClick: microStep, handleStepBackClick: stepBack } = handlersRef.current;

      if (mod && event.key === "s") { event.preventDefault(); save(); return; }
      if (mod && event.key === "o") { event.preventDefault(); load(); return; }
      if (mod && event.key === "Enter") { event.preventDefault(); assemble(); return; }
      if (mod && event.key === "f") {
        event.preventDefault();
        editorRef.current?.focus();
        editorRef.current?.trigger("keyboard", "actions.find", null);
        return;
      }
      if (event.key === "F5" && !event.shiftKey) { event.preventDefault(); run(); return; }
      if (event.key === "F5" && event.shiftKey) { event.preventDefault(); stop(); return; }
      if (event.key === "F6") { event.preventDefault(); step(); return; }
      if (event.key === "F7") { event.preventDefault(); stepBack(); return; }
      if (event.key === "F8") { event.preventDefault(); microStep(); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ─── Initial load: check share URL first, then localStorage ───────────────

  useEffect(() => {
    // Check for shared code in URL first
    const sharedCode = decodeShareParam();
    if (sharedCode) {
      applyCodeValue(sharedCode, "shared.mas", "Shared Program");
      notification.info({ message: 'Program loaded from shared link', duration: 4 });
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('share');
      window.history.replaceState({}, '', url.toString());
      return;
    }

    // Otherwise load from localStorage
    const savedCode = window.localStorage.getItem(STORAGE_KEYS.source);
    const savedFileName = window.localStorage.getItem(STORAGE_KEYS.fileName);
    const savedProjectName = window.localStorage.getItem(STORAGE_KEYS.projectName);
    const savedRecentProjects = window.localStorage.getItem(STORAGE_KEYS.recentProjects);

    if (savedRecentProjects) {
      try {
        const parsed = JSON.parse(savedRecentProjects);
        if (Array.isArray(parsed)) setRecentProjects(parsed.slice(0, 6));
      } catch {
        window.localStorage.removeItem(STORAGE_KEYS.recentProjects);
      }
    }

    if (savedCode !== null) {
      applyCodeValue(savedCode, savedFileName || "program.mas",
        savedProjectName || getProjectNameFromFileName(savedFileName || ""));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="code-editor">
      <input
        ref={fileInputRef}
        type="file"
        accept=".mas,.asm,.marie,.txt,text/plain"
        className="editor-file-input"
        onChange={handleLoadSource}
      />

      <EditorToolbar
        fileName={fileName}
        projectName={projectName}
        recentProjects={recentProjects}
        stepSpeed={stepSpeed}
        outputMode={outputMode}
        isCodeAssembled={isCodeAssembled}
        isRunning={isRunning}
        isStepping={isStepping}
        canStepBack={canStepBack}
        onProjectNameChange={handleProjectNameChange}
        onLoadSourceClick={handleLoadSourceClick}
        onSaveSource={handleSaveSource}
        onLoadRecentProject={handleLoadRecentProject}
        onStepSpeedChange={handleStepSpeedChange}
        onOutputModeChange={setOutputMode}
        onAssembleClick={handleAssembleClick}
        onStepClick={handleStepClick}
        onMicroStepClick={handleMicroStepClick}
        onStepBackClick={handleStepBackClick}
        onRunClick={handleRunClick}
        onStopClick={handleStopClick}
        onShareClick={handleShareClick}
        onExamplesClick={() => setExamplesModalVisible(true)}
        onExportClick={handleExportClick}
        onDataPathClick={() => setDataPathVisible(true)}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />

      <StatsBar stats={simStats} visible={isCodeAssembled} />

      <div className="editor-body">
        <div className="editor-left">
          <div className="editor-wrapper">
            <Suspense fallback={<div className="editor" />}>
              <MonacoEditor
                className="editor"
                theme="marieDark"
                defaultLanguage="marie"
                value={code}
                options={EDITOR_OPTIONS}
                defaultValue={DEFAULT_CODE}
                onChange={handleCodeChange}
                beforeMount={handleEditorWillMount}
                onMount={handleEditorDidMount}
              />
            </Suspense>
          </div>

          <ExecutionPanels
            terminalHeight={terminalHeight}
            outputCollapsed={outputCollapsed}
            rtlPanelWidth={rtlPanelWidth}
            rtlLogCollapsed={rtlLogCollapsed}
            isRunning={isRunning}
            isCodeAssembled={isCodeAssembled}
            outputMode={outputMode}
            output={output}
            errorMessage={errorMessage}
            registerState={registerState}
            terminalRef={terminalRef}
            rtlLog={rtlLog}
            executionHistory={executionHistory}
            historyCollapsed={historyCollapsed}
            onResizeStart={handleResizeStart}
            onRtlResizeStart={handleRtlResizeStart}
            onToggleOutput={() => setOutputCollapsed((v) => !v)}
            onToggleRtlLog={() => setRtlLogCollapsed((v) => !v)}
            onToggleHistory={() => setHistoryCollapsed((v) => !v)}
            viewMode={viewMode}
          />
        </div>

        <StateColumn
          stateCollapsed={stateCollapsed}
          statePanelWidth={statePanelWidth}
          registerState={registerState}
          memoryValues={memoryValues}
          watchList={watchList}
          fullMemory={fullMemory}
          symbolTable={symbolTableRef.current}
          recentlyWritten={recentlyWritten}
          recentlyRead={recentlyRead}
          accessCounts={accessCounts}
          viewMode={viewMode}
          onToggle={() => setStateCollapsed((v) => !v)}
          onAddWatch={handleAddWatch}
          onRemoveWatch={handleRemoveWatch}
        />
      </div>

      <MarieInputModal
        open={inputModalVisible}
        inputType={inputType}
        inputValue={inputValue}
        onInputTypeChange={setInputType}
        onInputValueChange={setInputValue}
        onConfirm={handleInputConfirm}
      />

      <GenerateCodeModal
        open={generateCodeModalVisible}
        generatedCode={generatedCode}
        formState={generatorForm}
        identifier={identifier}
        onCancel={() => setGenerateCodeModalVisible(false)}
        onInsert={handleInsertGenerated}
        onGeneratedCodeChange={setGeneratedCode}
        onFormChange={handleGeneratorFormChange}
      />

      <ExamplesModal
        open={examplesModalVisible}
        onClose={() => setExamplesModalVisible(false)}
        onLoad={handleLoadExample}
      />

      <DataPathDiagram
        open={dataPathVisible}
        onClose={() => setDataPathVisible(false)}
        registers={registerState}
        latestEntry={rtlLog.length > 0 ? rtlLog[rtlLog.length - 1] : null}
      />
    </div>
  );
}

export default CodeEditor;

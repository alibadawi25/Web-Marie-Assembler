import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { Button, Slider, Modal, Input, Typography, Dropdown, Select } from "antd";

import assembleCode from "../utils/marieAssembler.js";
import { MarieSimulator } from "../utils/marieSimulator.js";
import "./CodeEditor.css";

const { Title, Text } = Typography;
const MonacoEditor = lazy(() =>
  import("@monaco-editor/react").then((mod) => ({ default: mod.Editor }))
);
const INSTRUCTIONS_WITH_ARGS = [
  "load",
  "store",
  "add",
  "subt",
  "skipcond",
  "jump",
  "addi",
  "jumpi",
  "loadi",
  "storei",
  "jns",
];

// ── Pure snippet builder — used for both preview and insertion ──────────────
function buildGenSnippet(type, {
  ifIdentifier1, ifIdentifier2, conditionOperator, ifSeq,
  loopLabel, loopIterations, loopSeq, identifier,
  subroutineName,
}) {
  if (type === "if-condition") {
    if (!ifIdentifier1.trim() || !ifIdentifier2.trim()) return "";
    const ifLbl    = `if${ifSeq}`;
    const elseLbl  = `else${ifSeq}`;
    const endifLbl = `endIf${ifSeq}`;
    const cfg = {
      "==": { skipcond: "400", invert: false },
      "!=": { skipcond: "400", invert: true  },
      "<":  { skipcond: "000", invert: false },
      "<=": { skipcond: "800", invert: true  },
      ">":  { skipcond: "800", invert: false },
      ">=": { skipcond: "000", invert: true  },
    }[conditionOperator] ?? { skipcond: "400", invert: false };
    const jumpA = cfg.invert ? ifLbl : elseLbl;
    const jumpB = cfg.invert ? elseLbl : ifLbl;
    return (
      `load ${ifIdentifier1.trim()}\n` +
      `subt ${ifIdentifier2.trim()}\n` +
      `skipcond ${cfg.skipcond}\n` +
      `jump ${jumpA}\n` +
      `jump ${jumpB}\n` +
      `${ifLbl}, // if-block — write body here\n` +
      `jump ${endifLbl}\n` +
      `${elseLbl}, // else-block — write body here\n` +
      `${endifLbl},`
    );
  }
  if (type === "loop") {
    if (!loopLabel.trim() || !loopIterations.trim()) return "";
    const cntLbl = loopLabel.trim();
    const loopLbl = `loop${loopSeq}`;
    const endLbl  = `endLoop${loopSeq}`;
    const oneLbl  = identifier.includes("One") ? "One" : `loopOne${loopSeq}`;
    const needOne = !identifier.includes("One");
    return (
      `load ${cntLbl}Start\n` +
      `store ${cntLbl}\n` +
      `${loopLbl}, // loop body — write code here\n` +
      `load ${cntLbl}\n` +
      `subt ${oneLbl}\n` +
      `store ${cntLbl}\n` +
      `skipcond 400 // exit when counter = 0\n` +
      `jump ${loopLbl}\n` +
      `${endLbl},\n` +
      `${cntLbl}Start, dec ${loopIterations.trim()}\n` +
      `${cntLbl}, dec 0` +
      (needOne ? `\n${oneLbl}, dec 1` : "")
    );
  }
  if (type === "subroutine") {
    if (!subroutineName.trim()) return "";
    const name = subroutineName.trim();
    return (
      `// call with: jns ${name}\n` +
      `${name}, hex 0 // return address stored here\n` +
      `// subroutine body — write code here\n` +
      `jumpi ${name} // return`
    );
  }
  return "";
}

function CodeEditor() {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationRef = useRef([]);
  const terminalRef = useRef(null);
  const terminalPanelRef = useRef(null);
  const fileInputRef = useRef(null);
  const [terminalHeight, setTerminalHeight] = useState(190);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const simulator = MarieSimulator.getInstance();
  const storageKey = "web-marie-assembler.source";
  const storageNameKey = "web-marie-assembler.fileName";
  const projectNameKey = "web-marie-assembler.projectName";
  const recentProjectsKey = "web-marie-assembler.recentProjects";

  const [errorLine, setErrorLine] = useState(null);
  const [errorMessageLine, setErrorMessageLine] = useState("");
  const [code, setCode] = useState("// Your code here");
  const [machineCode, setMachineCode] = useState([]);
  const [startAddress, setStartAddress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [output, setOutput] = useState([]);
  const [identifier, setIdentifier] = useState([]);
  const [isCodeAssembled, setIsCodeAssembled] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [inputModalVisible, setInputModalVisible] = useState(false);
  const [generateCodeModalVisible, setGenerateCodeModalVisible] =
    useState(false);
  const [generateCodeInsertPosition, setGenerateCodeInsertPosition] =
    useState(null);
  const [generatedCode, setGeneratedCode] = useState("if-condition");

  const [ifIdentifier1, setIfIdentifier1] = useState("");
  const [conditionOperator, setConditionOperator] = useState("==");
  const [ifIdentifier2, setIfIdentifier2] = useState("");
  const [ifStatementCount, setIfStatementCount] = useState(0);

  const [loopLabel, setLoopLabel] = useState("");
  const [loopIterations, setLoopIterations] = useState("10");
  const [loopSeqCount, setLoopSeqCount] = useState(0);

  const [subroutineName, setSubroutineName] = useState("");
  const [subroutineSeqCount, setSubroutineSeqCount] = useState(0);
  const [fileName, setFileName] = useState("program.mas");
  const [projectName, setProjectName] = useState("Untitled Project");
  const [recentProjects, setRecentProjects] = useState([]);

  const [inputValue, setInputValue] = useState("");
  const [inputType, setInputType] = useState("dec");
  const [outputMode, setOutputMode] = useState("dec");
  const [stepSpeed, setStepSpeed] = useState(100);

  function handleEditorWillMount(monaco) {
    monaco.languages.register({ id: "marie" });
    monaco.languages.setMonarchTokensProvider("marie", {
      tokenizer: {
        root: [
          [
            /\b(?:load|store|add|subt|input|output|halt|skipcond|jump|clear|addi|jumpi|loadi|storei|jns|dec|hex)\b/,
            "keyword",
          ],
          [/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*,/, "identifier-declaration"],
          [/\b[a-zA-Z_][a-zA-Z0-9_]*\b/, "identifier-reference"],
          [/\b\d+[a-fA-F]+\d*\b/, "number"],
          [/\b[a-fA-F]+\d+[a-fA-F]*\b/, "number"],
          [/\b\d+\b/, "number"],
          [/\/\/.*$/, "comment"],
        ],
      },
    });

    monaco.editor.defineTheme("marieDark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "569cd6" },
        { token: "identifier-declaration", foreground: "8d6ec2" },
        { token: "identifier-reference", foreground: "dcdcaa" },
        { token: "number", foreground: "b5cea8" },
        { token: "comment", foreground: "608b4e" },
      ],
      colors: {},
    });

    monaco.languages.registerCompletionItemProvider("marie", {
      provideCompletionItems: () => {
        const suggestions = [];
        const instructions = [
          "load",
          "store",
          "add",
          "subt",
          "input",
          "output",
          "halt",
          "skipcond",
          "jump",
          "clear",
          "addi",
          "jumpi",
          "loadi",
          "storei",
          "jns",
          "dec",
          "hex",
        ];

        instructions.forEach((inst) => {
          suggestions.push({
            label: inst,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: inst,
          });
        });

        identifier.forEach((id) => {
          suggestions.push({
            label: id,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: id,
          });
        });

        return { suggestions };
      },
    });
  }

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.addAction({
      id: "generate",
      label: "Generate Code",
      contextMenuGroupId: "navigation",
      run: (ed) => {
        setGenerateCodeInsertPosition(ed.getPosition());
        setGenerateCodeModalVisible(true);
      },
    });
  }

  function highlightErrorLine(lineNumber, message) {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const model = editor.getModel();
    if (!model) return;

    if (lineNumber && model.getLineCount() >= lineNumber) {
      const lineLength = model.getLineLength(lineNumber);
      monaco.editor.setModelMarkers(model, "owner", [
        {
          startLineNumber: lineNumber,
          startColumn: 1,
          endLineNumber: lineNumber,
          endColumn: lineLength + 1,
          message: message || "Syntax error: undefined error",
          severity: monaco.MarkerSeverity.Error,
        },
      ]);

      decorationRef.current = editor.deltaDecorations(decorationRef.current, [
        {
          range: new monaco.Range(lineNumber, 1, lineNumber, 1),
          options: {
            isWholeLine: true,
            className: "errorLineHighlight",
          },
        },
      ]);
    } else {
      monaco.editor.setModelMarkers(model, "owner", []);
      decorationRef.current = editor.deltaDecorations(decorationRef.current, []);
    }
  }

  function normalizeProjectName(name) {
    const trimmed = name.trim();
    return trimmed || "Untitled Project";
  }

  function getProjectNameFromFileName(name) {
    const trimmed = name.trim();
    if (!trimmed) return "Untitled Project";
    return trimmed.replace(/\.[^.]+$/, "") || "Untitled Project";
  }

  function buildFileNameFromProjectName(name, preferredFileName = fileName) {
    const extension =
      preferredFileName.trim().match(/\.[^.]+$/)?.[0] ?? ".mas";
    return `${normalizeProjectName(name)}${extension}`;
  }

  const persistSource = useCallback(function persistSource(
    nextCode,
    nextFileName = fileName,
    nextProjectName = projectName
  ) {
    window.localStorage.setItem(storageKey, nextCode);
    window.localStorage.setItem(storageNameKey, nextFileName);
    window.localStorage.setItem(projectNameKey, nextProjectName);
  }, [fileName, projectName, projectNameKey, storageKey, storageNameKey]);

  const resetExecutionState = useCallback(function resetExecutionState() {
    simulator.stop();
    setIsRunning(false);
    setIsCodeAssembled(false);
    setMachineCode([]);
    setStartAddress(0);
    setOutput([]);
    setErrorMessage("");
  }, []);

  function saveRecentProjectSnapshot(
    nextCode = code,
    nextFileName = fileName,
    nextProjectName = projectName
  ) {
    const normalizedProjectName = normalizeProjectName(nextProjectName);
    const normalizedFileName =
      nextFileName.trim() || buildFileNameFromProjectName(normalizedProjectName);

    setRecentProjects((previousProjects) => {
      const nextRecentProjects = [
        {
          name: normalizedProjectName,
          fileName: normalizedFileName,
          code: nextCode,
          savedAt: new Date().toISOString(),
        },
        ...previousProjects.filter(
          (project) =>
            project.name.toLowerCase() !== normalizedProjectName.toLowerCase()
        ),
      ].slice(0, 6);

      window.localStorage.setItem(
        recentProjectsKey,
        JSON.stringify(nextRecentProjects)
      );

      return nextRecentProjects;
    });
  }

  const applyCodeValue = useCallback(function applyCodeValue(
    value = "",
    nextFileName,
    nextProjectName
  ) {
    setCode(value);
    setFileName(nextFileName);
    setProjectName(nextProjectName);
    resetExecutionState();
    persistSource(value, nextFileName, nextProjectName);

    const identifierRegex = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,/gm;
    let match;
    const identifiers = [];
    while ((match = identifierRegex.exec(value))) {
      if (!identifiers.includes(match[1])) {
        identifiers.push(match[1]);
      }
    }
    setIdentifier(identifiers);

    const identifierSet = new Set(identifiers.map((id) => id.toLowerCase()));
    const lines = value.split("\n");
    let foundErrorLine = null;
    let localErrorMessage = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === "" || line.trim().startsWith("//")) continue;

      const instructionMatchWithComma = line.match(
        /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,?\s*([a-zA-Z]+)\s*(.*)$/
      );
      const instructionMatch = line.match(/^\s*([a-zA-Z]+)\s*(.*)$/);

      if (instructionMatchWithComma) {
        const instruction = instructionMatchWithComma[2].toLowerCase();
        const args = instructionMatchWithComma[3].trim();

        if (INSTRUCTIONS_WITH_ARGS.includes(instruction) && !args) {
          foundErrorLine = i + 1;
          localErrorMessage = `Syntax error: instruction '${instruction}' requires an argument`;
          break;
        }

        if (
          (instruction === "dec" && !/^-?\d+$/.test(args)) ||
          (instruction === "hex" && !/^[0-9a-fA-F]+$/.test(args))
        ) {
          foundErrorLine = i + 1;
          localErrorMessage = `Syntax error: '${instruction}' requires a valid number`;
          break;
        }
      }

      if (instructionMatch) {
        const instruction = instructionMatch[1].toLowerCase();
        const args = instructionMatch[2].trim();

        if (INSTRUCTIONS_WITH_ARGS.includes(instruction) && !args) {
          foundErrorLine = i + 1;
          localErrorMessage = `Syntax error: instruction '${instruction}' requires an argument`;
          break;
        }

        if (
          (instruction === "dec" && !/^-?\d+$/.test(args)) ||
          (instruction === "hex" && !/^[0-9a-fA-F]+$/.test(args))
        ) {
          foundErrorLine = i + 1;
          localErrorMessage = `Syntax error: '${instruction}' requires a valid number`;
          break;
        }
      }

      if (
        /^\s*(load|store|add|subt|jump|addi|jumpi|loadi|storei|jns)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/i.test(
          line
        )
      ) {
        const lineMatch = line.match(
          /^\s*(load|store|add|subt|jump|addi|jumpi|loadi|storei|jns)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/i
        );
        const usedIdentifier = lineMatch[2].toLowerCase();
        if (!identifierSet.has(usedIdentifier)) {
          foundErrorLine = i + 1;
          localErrorMessage = `Syntax error: identifier '${lineMatch[2]}' is not defined`;
          break;
        }
      }

      if (
        /^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*,\s*(load|store|add|subt|jump|addi|jumpi|loadi|storei|jns)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/i.test(
          line
        )
      ) {
        const lineMatch = line.match(
          /^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*,\s*(load|store|add|subt|jump|addi|jumpi|loadi|storei|jns)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/i
        );
        const usedIdentifier = lineMatch[2].toLowerCase();
        if (!identifierSet.has(usedIdentifier)) {
          foundErrorLine = i + 1;
          localErrorMessage = `Syntax error: identifier '${lineMatch[2]}' is not defined`;
          break;
        }
      }

      if (/,/.test(line) && !/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*,/.test(line)) {
        foundErrorLine = i + 1;
        localErrorMessage =
          "Syntax error: label must be at start of line and cannot be a number or have spaces";
        break;
      }
    }

    if (foundErrorLine !== errorLine || localErrorMessage !== errorMessageLine) {
      setErrorLine(foundErrorLine);
      setErrorMessageLine(localErrorMessage);
      highlightErrorLine(foundErrorLine, localErrorMessage);
    }

    if (!foundErrorLine && errorLine) {
      setErrorLine(null);
      setErrorMessageLine("");
      highlightErrorLine(null);
    }
  }, [persistSource, resetExecutionState]);

  function handleCodeChange(value = "") {
    applyCodeValue(value, fileName, projectName);
  }

  function handleProjectNameChange(event) {
    const nextProjectName = event.target.value;
    setProjectName(nextProjectName);
    persistSource(code, fileName, nextProjectName);
  }

  function handleLoadRecentProject({ key }) {
    const selectedProject = recentProjects[Number(key)];
    if (!selectedProject) return;

    applyCodeValue(
      selectedProject.code,
      selectedProject.fileName,
      selectedProject.name
    );
    saveRecentProjectSnapshot(
      selectedProject.code,
      selectedProject.fileName,
      selectedProject.name
    );
  }

  const handleOutput = useCallback(
    (value) => {
      let formattedValue = value;
      if (outputMode === "hex") {
        formattedValue = `0x${Number(value).toString(16).toUpperCase()}`;
      } else if (outputMode === "bin") {
        formattedValue = `0b${Number(value).toString(2)}`;
      } else if (outputMode === "unicode") {
        formattedValue =
          typeof value === "number" ? String.fromCharCode(value) : value;
      }
      setOutput((prevOutput) => [...prevOutput, formattedValue]);
    },
    [outputMode]
  );

  useEffect(() => {
    const savedCode = window.localStorage.getItem(storageKey);
    const savedFileName = window.localStorage.getItem(storageNameKey);
    const savedProjectName = window.localStorage.getItem(projectNameKey);
    const savedRecentProjects = window.localStorage.getItem(recentProjectsKey);

    if (savedRecentProjects) {
      try {
        const parsedRecentProjects = JSON.parse(savedRecentProjects);
        if (Array.isArray(parsedRecentProjects)) {
          setRecentProjects(parsedRecentProjects.slice(0, 6));
        }
      } catch {
        window.localStorage.removeItem(recentProjectsKey);
      }
    }

    if (savedCode !== null) {
      applyCodeValue(
        savedCode,
        savedFileName || "program.mas",
        savedProjectName || getProjectNameFromFileName(savedFileName || "")
      );
    }
  }, [applyCodeValue]);

  useEffect(() => {
    simulator.outputCallback = handleOutput;
    simulator.errorCallback = (error) => {
      setErrorMessage(error.message);
      setIsRunning(false);
    };
    simulator.inputCallback = () => {
      setInputModalVisible(true);
    };
    simulator.onProgramEnd = () => {
      setIsRunning(false);
    };

    return () => {
      simulator.outputCallback = null;
      simulator.errorCallback = null;
      simulator.inputCallback = null;
      simulator.onProgramEnd = null;
    };
  }, [simulator, handleOutput]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  function handleSaveSource() {
    const normalizedProjectName = normalizeProjectName(projectName);
    const finalName = buildFileNameFromProjectName(
      normalizedProjectName,
      fileName
    );

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
  }

  function handleLoadSourceClick() {
    fileInputRef.current?.click();
  }

  function handleLoadSource(event) {
    const [selectedFile] = event.target.files ?? [];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = () => {
      const loadedCode = String(reader.result ?? "");
      const loadedProjectName = getProjectNameFromFileName(selectedFile.name);
      applyCodeValue(
        loadedCode,
        selectedFile.name,
        loadedProjectName
      );
      saveRecentProjectSnapshot(loadedCode, selectedFile.name, loadedProjectName);
    };
    reader.onerror = () => {
      setErrorMessage("Unable to read the selected file.");
    };
    reader.readAsText(selectedFile);
    event.target.value = "";
  }

  function handleRunClick() {
    if (!machineCode.length) {
      setErrorMessage("No machine code available. Assemble first.");
      return;
    }

    setErrorMessage("");
    setOutput([]);

    const programArray = machineCode.map((instruction) => instruction.code);
    simulator.loadProgram(programArray, startAddress);
    simulator.run();
    setIsRunning(true);
  }

  function handleStopClick() {
    simulator.stop();
    setIsRunning(false);
  }

  function handleAssembleClick() {
    const result = assembleCode(code);
    if (!result.success) {
      const firstError = result.errors?.[0];
      setOutput([]);
      setMachineCode([]);
      setIsCodeAssembled(false);
      setErrorMessage(firstError?.message ?? "Assembly failed");
      setErrorLine(firstError?.line ?? null);
      setErrorMessageLine(firstError?.message ?? "");
      highlightErrorLine(firstError?.line ?? null, firstError?.message);
      return;
    }

    setMachineCode(result.machineCode);
    setStartAddress(result.startAddress ?? 0);
    setOutput([]);
    setErrorMessage("");
    setIsCodeAssembled(true);
    setErrorLine(null);
    setErrorMessageLine("");
    highlightErrorLine(null);
  }

  // ── Terminal resize ─────────────────────────────────────────────────────
  useEffect(() => {
    function onMouseMove(e) {
      if (!isDragging.current) return;
      const delta = dragStartY.current - e.clientY;
      const next = Math.min(600, Math.max(80, dragStartHeight.current + delta));
      setTerminalHeight(next);
    }
    function onMouseUp() {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function handleResizeStart(e) {
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragStartHeight.current = terminalHeight;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  }

  // ── Generate code insertion ─────────────────────────────────────────────
  function handleInsertGenerated() {
    let seq, snippet;

    if (generatedCode === "if-condition") {
      seq = ifStatementCount + 1;
      setIfStatementCount(seq);
      snippet = buildGenSnippet("if-condition", { ifIdentifier1, ifIdentifier2, conditionOperator, ifSeq: seq, loopLabel, loopIterations, loopSeq: loopSeqCount + 1, identifier, subroutineName });
    } else if (generatedCode === "loop") {
      seq = loopSeqCount + 1;
      setLoopSeqCount(seq);
      snippet = buildGenSnippet("loop", { ifIdentifier1, ifIdentifier2, conditionOperator, ifSeq: ifStatementCount + 1, loopLabel, loopIterations, loopSeq: seq, identifier, subroutineName });
    } else if (generatedCode === "subroutine") {
      seq = subroutineSeqCount + 1;
      setSubroutineSeqCount(seq);
      snippet = buildGenSnippet("subroutine", { ifIdentifier1, ifIdentifier2, conditionOperator, ifSeq: ifStatementCount + 1, loopLabel, loopIterations, loopSeq: loopSeqCount + 1, identifier, subroutineName });
    }

    const editor = editorRef.current;
    const MonacoRange = monacoRef.current?.Range;
    if (!MonacoRange || !editor) return;

    // Insert the snippet at cursor position
    if (snippet && generateCodeInsertPosition) {
      const pos = generateCodeInsertPosition;
      const range = new MonacoRange(pos.lineNumber, pos.column, pos.lineNumber, pos.column);
      editor.executeEdits("insert-generated-code", [{ range, text: snippet, forceMoveMarkers: true }]);
    }

    // Append any new variables to end of file (initialised to dec 0)
    if (generatedCode === "if-condition") {
      const newVars = [ifIdentifier1.trim(), ifIdentifier2.trim()].filter(
        (v, i, arr) => v && !identifier.includes(v) && arr.indexOf(v) === i
      );
      if (newVars.length > 0) {
        const model = editor.getModel();
        const lastLine = model.getLineCount();
        const lastCol = model.getLineLength(lastLine) + 1;
        const appendText = "\n" + newVars.map((v) => `${v}, dec 0`).join("\n");
        const endRange = new MonacoRange(lastLine, lastCol, lastLine, lastCol);
        editor.executeEdits("append-variables", [{ range: endRange, text: appendText, forceMoveMarkers: true }]);
        setIdentifier((prev) => [...prev, ...newVars]);
      }
    }

    setGenerateCodeInsertPosition(null);
    setGenerateCodeModalVisible(false);
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  // Use a ref so the listener always calls the latest version of each handler
  // without needing to re-register on every render.
  const handlersRef = useRef({});
  handlersRef.current = {
    handleSaveSource,
    handleLoadSourceClick,
    handleAssembleClick,
    handleRunClick,
    handleStopClick,
  };

  useEffect(() => {
    function onKeyDown(e) {
      const mod = e.ctrlKey || e.metaKey;
      const { handleSaveSource, handleLoadSourceClick, handleAssembleClick,
              handleRunClick, handleStopClick } = handlersRef.current;

      // Ctrl/Cmd + S → Save
      if (mod && e.key === "s") {
        e.preventDefault();
        handleSaveSource();
        return;
      }
      // Ctrl/Cmd + O → Load
      if (mod && e.key === "o") {
        e.preventDefault();
        handleLoadSourceClick();
        return;
      }
      // Ctrl/Cmd + Enter → Assemble
      if (mod && e.key === "Enter") {
        e.preventDefault();
        handleAssembleClick();
        return;
      }
      // Ctrl/Cmd + F → Find in editor (focus Monaco then trigger its built-in find)
      if (mod && e.key === "f") {
        e.preventDefault();
        editorRef.current?.focus();
        editorRef.current?.trigger("keyboard", "actions.find", null);
        return;
      }
      // F5 → Run
      if (e.key === "F5" && !e.shiftKey) {
        e.preventDefault();
        handleRunClick();
        return;
      }
      // Shift + F5 → Stop
      if (e.key === "F5" && e.shiftKey) {
        e.preventDefault();
        handleStopClick();
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="code-editor">
      <input
        ref={fileInputRef}
        type="file"
        accept=".mas,.asm,.marie,.txt,text/plain"
        className="editor-file-input"
        onChange={handleLoadSource}
      />
      <div className="editor-toolbar">

        {/* ── Row 1: File management ── */}
        <div className="toolbar-row toolbar-row-files">
          <div className="toolbar-section">
            <Input
              value={projectName}
              onChange={handleProjectNameChange}
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
            <Button onClick={handleLoadSourceClick} className="toolbar-btn-ghost" title="Load file (Ctrl+O)">
              Load
            </Button>
            <Button onClick={handleSaveSource} className="toolbar-btn-ghost" title="Save file (Ctrl+S)">
              Save
            </Button>
            <Dropdown
              trigger={["click"]}
              menu={{
                items: recentProjects.length
                  ? recentProjects.map((project, index) => ({
                      key: String(index),
                      label: (
                        <div className="recent-project-item">
                          <span className="recent-project-name">{project.name}</span>
                          <span className="recent-project-file">{project.fileName}</span>
                        </div>
                      ),
                    }))
                  : [{ key: "empty", label: "No recent projects", disabled: true }],
                onClick: handleLoadRecentProject,
              }}
            >
              <Button className="toolbar-btn-ghost" disabled={!recentProjects.length}>
                Recents ▾
              </Button>
            </Dropdown>
          </div>
        </div>

        {/* ── Row 2: Execution controls ── */}
        <div className="toolbar-row toolbar-row-exec">
          {/* Slider — wide screens */}
          <div className="toolbar-section toolbar-speed-group toolbar-speed-slider">
            <span className="toolbar-label">Speed</span>
            <Slider
              value={stepSpeed}
              min={0}
              step={10}
              max={1000}
              tooltip={{ formatter: (v) => `${v} ms` }}
              className="step-speed"
              onChange={(value) => { simulator.setDelay(value); setStepSpeed(value); }}
            />
            <span className="toolbar-speed-value">{stepSpeed}ms</span>
          </div>
          {/* Select — narrow screens */}
          <div className="toolbar-section toolbar-speed-group toolbar-speed-select">
            <span className="toolbar-label">Speed</span>
            <Select
              value={stepSpeed}
              onChange={(value) => { simulator.setDelay(value); setStepSpeed(value); }}
              className="speed-select"
              popupMatchSelectWidth={false}
              options={[
                { label: "Instant (0ms)",  value: 0 },
                { label: "Fast (100ms)",   value: 100 },
                { label: "Normal (300ms)", value: 300 },
                { label: "Slow (600ms)",   value: 600 },
                { label: "Step (1s)",      value: 1000 },
              ]}
            />
          </div>
          <div className="toolbar-row-divider" />
          <div className="toolbar-section">
            <span className="toolbar-label">Output</span>
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  { key: "dec", label: "Decimal" },
                  { key: "hex", label: "Hex" },
                  { key: "bin", label: "Binary" },
                  { key: "unicode", label: "Unicode" },
                ],
                onClick: ({ key }) => setOutputMode(key),
              }}
            >
              <Button className="toolbar-dropdown-btn">{outputMode.toUpperCase()} ▾</Button>
            </Dropdown>
          </div>
          <div className="toolbar-spacer" />
          <div className="toolbar-section toolbar-section-exec">
            {isCodeAssembled && !isRunning && (
              <span className="toolbar-assembled-badge">
                <span className="toolbar-assembled-badge-dot" />
                Ready
              </span>
            )}
            <Button onClick={handleAssembleClick} className="toolbar-btn toolbar-btn-assemble" title="Assemble (Ctrl+Enter)">
              <span className="toolbar-btn-inner">
                Assemble
                <kbd className="toolbar-kbd">⌃↵</kbd>
              </span>
            </Button>
            <Button
              onClick={isRunning ? handleStopClick : handleRunClick}
              disabled={!isCodeAssembled}
              className={`toolbar-btn ${isRunning ? "toolbar-btn-stop" : "toolbar-btn-run"}`}
              title={isRunning ? "Stop (Shift+F5)" : "Run (F5)"}
            >
              <span className="toolbar-btn-inner">
                {isRunning ? (
                  <>
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor">
                      <rect x="0" y="0" width="9" height="9" rx="1.5" />
                    </svg>
                    Stop
                    <kbd className="toolbar-kbd">⇧F5</kbd>
                  </>
                ) : (
                  <>
                    <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor">
                      <path d="M1 1 L8 5 L1 9 Z" />
                    </svg>
                    Run
                    <kbd className="toolbar-kbd">F5</kbd>
                  </>
                )}
              </span>
            </Button>
          </div>
        </div>

      </div>

      <div className="editor-wrapper">
        <Suspense fallback={<div className="editor" />}>
          <MonacoEditor
            className="editor"
            theme="marieDark"
            defaultLanguage="marie"
            value={code}
            options={{
              fontSize: 15,
              minimap: { enabled: false },
              lineNumbersMinChars: 3,
              padding: { top: 12 },
              scrollBeyondLastLine: false,
            }}
            defaultValue="// Your code here"
            onChange={handleCodeChange}
            beforeMount={handleEditorWillMount}
            onMount={handleEditorDidMount}
          />
        </Suspense>
      </div>

      <div className="terminal-panel" ref={terminalPanelRef} style={{ height: terminalHeight }}>
        <div className="terminal-resize-handle" onMouseDown={handleResizeStart} title="Drag to resize" />
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
        </div>
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
          {errorMessage && (
            <p className="error">⚠ {errorMessage}</p>
          )}
        </div>
      </div>

      <Modal
        open={inputModalVisible}
        closable={false}
        footer={
          <Button
            className="run-assemble-button"
            onClick={() => {
              let value;
              if (inputType === "hex") value = Number.parseInt(inputValue, 16);
              else if (inputType === "bin")
                value = Number.parseInt(inputValue, 2);
              else if (inputType === "unicode")
                value = inputValue.charCodeAt(0);
              else value = Number.parseInt(inputValue, 10);

              const result = simulator.setInput([value]);
              if (!result?.success) {
                setErrorMessage(result?.error?.message ?? "Invalid input");
                return;
              }

              simulator.resume();
              setInputModalVisible(false);
              setInputValue("");
              setInputType("dec");
            }}
            disabled={
              inputType === "unicode"
                ? inputValue.length !== 1
                : inputValue.trim() === "" ||
                  Number.isNaN(
                    inputType === "hex"
                      ? Number.parseInt(inputValue, 16)
                      : inputType === "bin"
                      ? Number.parseInt(inputValue, 2)
                      : Number.parseInt(inputValue, 10)
                  )
            }
          >
            OK
          </Button>
        }
      >
        <Title level={4}>MARIE Input</Title>
        <Dropdown
          menu={{
            items: [
              { key: "dec", label: "Dec" },
              { key: "hex", label: "Hex" },
              { key: "bin", label: "Bin" },
              { key: "unicode", label: "Unicode" },
            ],
            onClick: ({ key }) => setInputType(key),
          }}
        >
          <Button>{inputType.toUpperCase()}</Button>
        </Dropdown>
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={
            inputType === "unicode"
              ? "Enter a single character"
              : `Enter a ${inputType} number`
          }
          type="text"
          maxLength={inputType === "unicode" ? 1 : undefined}
          className="input-field"
        />
      </Modal>

      <Modal
        open={generateCodeModalVisible}
        onCancel={() => setGenerateCodeModalVisible(false)}
        className="generate-code-modal"
        title={null}
        width={500}
        footer={
          <Button
            className="toolbar-btn toolbar-btn-assemble gen-insert-btn"
            disabled={
              (generatedCode === "if-condition" && (!ifIdentifier1.trim() || !ifIdentifier2.trim())) ||
              (generatedCode === "loop" && (!loopLabel.trim() || !loopIterations.trim())) ||
              (generatedCode === "subroutine" && !subroutineName.trim())
            }
            onClick={handleInsertGenerated}
          >
            Insert into Editor
          </Button>
        }
      >
        {/* ── Header ── */}
        <div className="gen-header">
          <div className="gen-title">Generate Code</div>
          <div className="gen-subtitle">Pick a pattern — right-click in editor to open this anytime</div>
        </div>

        {/* ── Type cards ── */}
        <div className="gen-type-cards">
          {[
            { key: "if-condition", name: "If / Else",  desc: "Compare two values, branch on result" },
            { key: "loop",         name: "Loop",       desc: "Repeat a block N times" },
            { key: "subroutine",   name: "Subroutine", desc: "JNS function stub with return" },
          ].map(({ key, name, desc }) => (
            <button
              key={key}
              className={`gen-type-card${generatedCode === key ? " gen-type-card--active" : ""}`}
              onClick={() => setGeneratedCode(key)}
            >
              <span className="gen-type-card-name">{name}</span>
              <span className="gen-type-card-desc">{desc}</span>
            </button>
          ))}
        </div>

        <div className="gen-divider" />

        {/* ── If-condition form ── */}
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
                  value={ifIdentifier1}
                  onChange={(e) => setIfIdentifier1(e.target.value)}
                  placeholder="e.g. X"
                />
                {identifier.length > 0 && (
                  <div className="gen-chips">
                    {identifier.map((id) => (
                      <button
                        key={id}
                        className={`gen-chip${ifIdentifier1 === id ? " gen-chip--active" : ""}`}
                        onClick={() => setIfIdentifier1(id)}
                      >{id}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="gen-if-field gen-if-op">
                <label className="gen-label">Condition</label>
                <Select
                  value={conditionOperator}
                  onChange={setConditionOperator}
                  className="gen-op-select"
                  popupMatchSelectWidth={false}
                  options={["==","!=","<","<=",">",">="].map((op) => ({ label: op, value: op }))}
                />
              </div>
              <div className="gen-if-field">
                <label className="gen-label">Variable B</label>
                <Input
                  value={ifIdentifier2}
                  onChange={(e) => setIfIdentifier2(e.target.value)}
                  placeholder="e.g. Y"
                />
                {identifier.length > 0 && (
                  <div className="gen-chips">
                    {identifier.map((id) => (
                      <button
                        key={id}
                        className={`gen-chip${ifIdentifier2 === id ? " gen-chip--active" : ""}`}
                        onClick={() => setIfIdentifier2(id)}
                      >{id}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Loop form ── */}
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
                  value={loopLabel}
                  onChange={(e) => setLoopLabel(e.target.value)}
                />
                <span className="gen-field-hint">This label will hold the running count — pick a descriptive name</span>
              </div>
              <div className="gen-field">
                <label className="gen-label">Number of iterations</label>
                <Input
                  placeholder="e.g. 10"
                  value={loopIterations}
                  onChange={(e) => setLoopIterations(e.target.value)}
                  type="number"
                  min={1}
                />
                <span className="gen-field-hint">How many times should the loop body run?</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Subroutine form ── */}
        {generatedCode === "subroutine" && (
          <div className="gen-body">
            <p className="gen-hint">
              MARIE subroutines use <code>JNS</code> to call and <code>JUMPI</code> to return.<br />
              After inserting, call your subroutine anywhere with <code>jns {subroutineName.trim() || "name"}</code>.
            </p>
            <div className="gen-fields">
              <div className="gen-field">
                <label className="gen-label">Subroutine name</label>
                <Input
                  placeholder="e.g. printChar"
                  value={subroutineName}
                  onChange={(e) => setSubroutineName(e.target.value)}
                />
                <span className="gen-field-hint">Use a descriptive name — it becomes the label and call target</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Live code preview ── */}
        <div className="gen-preview-block">
          <div className="gen-preview-label">Preview — what gets inserted</div>
          <pre className="gen-preview-code">
            {buildGenSnippet(generatedCode, {
              ifIdentifier1, ifIdentifier2, conditionOperator, ifSeq: ifStatementCount + 1,
              loopLabel, loopIterations, loopSeq: loopSeqCount + 1, identifier,
              subroutineName,
            }) || "— fill in the fields above —"}
          </pre>
        </div>
      </Modal>
    </div>
  );
}

export default CodeEditor;

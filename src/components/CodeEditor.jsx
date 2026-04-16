import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";

import assembleCode from "../utils/marieAssembler.js";
import { MarieSimulator } from "../utils/marieSimulator.js";
import EditorToolbar from "./codeEditor/EditorToolbar.jsx";
import ExecutionPanels from "./codeEditor/ExecutionPanels.jsx";
import GenerateCodeModal from "./codeEditor/GenerateCodeModal.jsx";
import MarieInputModal from "./codeEditor/MarieInputModal.jsx";
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
  getInputValue,
  getProjectNameFromFileName,
  normalizeProjectName,
  validateCodeStructure,
} from "./codeEditor/utils.js";
import "./CodeEditor.css";

const MonacoEditor = lazy(() =>
  import("@monaco-editor/react").then((mod) => ({ default: mod.Editor }))
);

function CodeEditor() {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationRef = useRef([]);
  const identifierRef = useRef([]);
  const currentLineDecRef = useRef([]);
  const addressToLineRef = useRef({});
  const symbolTableRef = useRef({});
  const terminalRef = useRef(null);
  const fileInputRef = useRef(null);
  const simulatorRef = useRef(MarieSimulator.getInstance());
  const handlersRef = useRef({});

  const simulator = simulatorRef.current;

  const [terminalHeight, setTerminalHeight] = useState(190);
  const [statePanelWidth, setStatePanelWidth] = useState(220);
  const [outputCollapsed, setOutputCollapsed] = useState(false);
  const [stateCollapsed, setStateCollapsed] = useState(false);

  const [registerState, setRegisterState] = useState({
    AC: 0,
    PC: 0,
    IR: 0,
    MAR: 0,
    MBR: 0,
  });
  const [memoryValues, setMemoryValues] = useState({});
  const [isStepping, setIsStepping] = useState(false);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [machineCode, setMachineCode] = useState([]);
  const [startAddress, setStartAddress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [output, setOutput] = useState([]);
  const [identifier, setIdentifier] = useState([]);
  const [isCodeAssembled, setIsCodeAssembled] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [inputModalVisible, setInputModalVisible] = useState(false);
  const [generateCodeModalVisible, setGenerateCodeModalVisible] = useState(false);
  const [generateCodeInsertPosition, setGenerateCodeInsertPosition] = useState(null);
  const [generatedCode, setGeneratedCode] = useState("if-condition");

  const [generatorForm, setGeneratorForm] = useState({
    ifIdentifier1: "",
    conditionOperator: "==",
    ifIdentifier2: "",
    ifStatementCount: 0,
    loopLabel: "",
    loopIterations: "10",
    loopSeqCount: 0,
    subroutineName: "",
    subroutineSeqCount: 0,
    variableName: "",
    variableType: "dec",
    variableValue: "0",
  });

  const [fileName, setFileName] = useState("program.mas");
  const [projectName, setProjectName] = useState("Untitled Project");
  const [recentProjects, setRecentProjects] = useState([]);

  const [inputValue, setInputValue] = useState("");
  const [inputType, setInputType] = useState("dec");
  const [outputMode, setOutputMode] = useState("dec");
  const [stepSpeed, setStepSpeed] = useState(100);

  const { handleResizeStart, handleHorizontalResizeStart } = usePanelResizers({
    terminalHeight,
    setTerminalHeight,
    statePanelWidth,
    setStatePanelWidth,
  });

  const handleEditorWillMount = useCallback((monaco) => {
    registerMarieLanguage(monaco, identifierRef, symbolTableRef);
  }, []);

  const highlightCurrentLine = useCallback((lineNumber) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    currentLineDecRef.current = editor.deltaDecorations(
      currentLineDecRef.current,
      lineNumber
        ? [
            {
              range: new monaco.Range(lineNumber, 1, lineNumber, 1),
              options: {
                isWholeLine: true,
                className: "executingLineHighlight",
              },
            },
          ]
        : []
    );
  }, []);

  const highlightErrorLine = useCallback((lineNumber, message) => {
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
      return;
    }

    monaco.editor.setModelMarkers(model, "owner", []);
    decorationRef.current = editor.deltaDecorations(decorationRef.current, []);
  }, []);

  const snapshotMemory = useCallback(() => {
    const symbolTable = symbolTableRef.current;
    if (!Object.keys(symbolTable).length) return;

    const snapshot = {};
    for (const [label, addr] of Object.entries(symbolTable)) {
      snapshot[label] = { addr, value: simulator.memory[addr] ?? 0 };
    }
    setMemoryValues(snapshot);
  }, [simulator]);

  const persistSource = useCallback((nextCode, nextFileName = fileName, nextProjectName = projectName) => {
    window.localStorage.setItem(STORAGE_KEYS.source, nextCode);
    window.localStorage.setItem(STORAGE_KEYS.fileName, nextFileName);
    window.localStorage.setItem(STORAGE_KEYS.projectName, nextProjectName);
  }, [fileName, projectName]);

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
    addressToLineRef.current = {};
    symbolTableRef.current = {};
    highlightCurrentLine(null);
  }, [highlightCurrentLine, simulator]);

  const saveRecentProjectSnapshot = useCallback((nextCode = code, nextFileName = fileName, nextProjectName = projectName) => {
    const normalizedProjectName = normalizeProjectName(nextProjectName);
    const normalizedFileName =
      nextFileName.trim() || buildFileNameFromProjectName(normalizedProjectName, nextFileName);

    setRecentProjects((previousProjects) => {
      const nextRecentProjects = [
        {
          name: normalizedProjectName,
          fileName: normalizedFileName,
          code: nextCode,
          savedAt: new Date().toISOString(),
        },
        ...previousProjects.filter(
          (project) => project.name.toLowerCase() !== normalizedProjectName.toLowerCase()
        ),
      ].slice(0, 6);

      window.localStorage.setItem(
        STORAGE_KEYS.recentProjects,
        JSON.stringify(nextRecentProjects)
      );

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
  }, []);

  const handleOutput = useCallback((value) => {
    let formattedValue = value;
    if (outputMode === "hex") {
      formattedValue = `0x${Number(value).toString(16).toUpperCase()}`;
    } else if (outputMode === "bin") {
      formattedValue = `0b${Number(value).toString(2)}`;
    } else if (outputMode === "unicode") {
      formattedValue = typeof value === "number" ? String.fromCharCode(value) : value;
    }
    setOutput((prevOutput) => [...prevOutput, formattedValue]);
  }, [outputMode]);

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

  const handleLoadSourceClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

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
    reader.onerror = () => {
      setErrorMessage("Unable to read the selected file.");
    };
    reader.readAsText(selectedFile);
    event.target.value = "";
  }, [applyCodeValue, saveRecentProjectSnapshot]);

  const handleRunClick = useCallback(() => {
    if (!machineCode.length) {
      setErrorMessage("No machine code available. Assemble first.");
      return;
    }

    setErrorMessage("");
    setOutput([]);
    setIsStepping(false);
    highlightCurrentLine(null);

    simulator.loadProgram(buildProgramArray(machineCode), startAddress);
    simulator.run();
    setIsRunning(true);
  }, [highlightCurrentLine, machineCode, simulator, startAddress]);

  const handleStepClick = useCallback(() => {
    if (!machineCode.length) {
      setErrorMessage("No machine code available. Assemble first.");
      return;
    }

    if (!isStepping) {
      setErrorMessage("");
      setOutput([]);
      simulator.loadProgram(buildProgramArray(machineCode), startAddress);
      setIsRunning(true);
      setIsStepping(true);
      setRegisterState({ AC: 0, PC: simulator.PC, IR: 0, MAR: 0, MBR: 0 });
      highlightCurrentLine(addressToLineRef.current[simulator.PC] ?? null);
      return;
    }

    if (!simulator.running) return;

    try {
      simulator.step();
    } catch (error) {
      setErrorMessage(error.message);
      setIsRunning(false);
      setIsStepping(false);
      highlightCurrentLine(null);
    }
  }, [highlightCurrentLine, isStepping, machineCode, simulator, startAddress]);

  const handleStopClick = useCallback(() => {
    simulator.stop();
    setIsRunning(false);
    setIsStepping(false);
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
    setMemoryValues(buildInitialMemoryValues(
      result.symbolTable ?? {},
      result.machineCode,
      result.startAddress ?? 0
    ));
    setIsStepping(false);
    highlightErrorLine(null);
    highlightCurrentLine(null);

    addressToLineRef.current = buildAddressToLineMap(
      result.machineCode,
      result.startAddress ?? 0
    );
    symbolTableRef.current = result.symbolTable ?? {};
  }, [code, highlightCurrentLine, highlightErrorLine]);

  const handleInputConfirm = useCallback(() => {
    const result = simulator.setInput([getInputValue(inputType, inputValue)]);
    if (!result?.success) {
      setErrorMessage(result?.error?.message ?? "Invalid input");
      return;
    }

    if (isStepping) {
      simulator.running = true;
    } else {
      simulator.resume();
    }

    setInputModalVisible(false);
    setInputValue("");
    setInputType("dec");
  }, [inputType, inputValue, isStepping, simulator]);

  const handleGeneratorFormChange = useCallback((field, value) => {
    setGeneratorForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleInsertGenerated = useCallback(() => {
    let nextGeneratedSnippet = "";

    if (generatedCode === "if-condition") {
      const nextSequence = generatorForm.ifStatementCount + 1;
      setGeneratorForm((prev) => ({ ...prev, ifStatementCount: nextSequence }));
      nextGeneratedSnippet = buildGenSnippet("if-condition", {
        ...generatorForm,
        identifier,
        ifSeq: nextSequence,
        loopSeq: generatorForm.loopSeqCount + 1,
      });
    } else if (generatedCode === "loop") {
      const nextSequence = generatorForm.loopSeqCount + 1;
      setGeneratorForm((prev) => ({ ...prev, loopSeqCount: nextSequence }));
      nextGeneratedSnippet = buildGenSnippet("loop", {
        ...generatorForm,
        identifier,
        ifSeq: generatorForm.ifStatementCount + 1,
        loopSeq: nextSequence,
      });
    } else if (generatedCode === "subroutine") {
      const nextSequence = generatorForm.subroutineSeqCount + 1;
      setGeneratorForm((prev) => ({ ...prev, subroutineSeqCount: nextSequence }));
      nextGeneratedSnippet = buildGenSnippet("subroutine", {
        ...generatorForm,
        identifier,
        ifSeq: generatorForm.ifStatementCount + 1,
        loopSeq: generatorForm.loopSeqCount + 1,
      });
    } else if (generatedCode === "variable") {
      nextGeneratedSnippet = buildGenSnippet("variable", {
        ...generatorForm,
        identifier,
        ifSeq: generatorForm.ifStatementCount + 1,
        loopSeq: generatorForm.loopSeqCount + 1,
      });
    }

    const editor = editorRef.current;
    const MonacoRange = monacoRef.current?.Range;
    if (!editor || !MonacoRange) return;

    if (nextGeneratedSnippet && generateCodeInsertPosition) {
      const { lineNumber, column } = generateCodeInsertPosition;
      const range = new MonacoRange(lineNumber, column, lineNumber, column);
      editor.executeEdits("insert-generated-code", [
        { range, text: nextGeneratedSnippet, forceMoveMarkers: true },
      ]);
    }

    if (generatedCode === "if-condition") {
      const newVars = [
        generatorForm.ifIdentifier1.trim(),
        generatorForm.ifIdentifier2.trim(),
      ].filter((value, index, array) => value && !identifier.includes(value) && array.indexOf(value) === index);

      if (newVars.length > 0) {
        const model = editor.getModel();
        const lastLine = model.getLineCount();
        const lastColumn = model.getLineLength(lastLine) + 1;
        const endRange = new MonacoRange(lastLine, lastColumn, lastLine, lastColumn);
        const appendText = `\n${newVars.map((value) => `${value}, dec 0`).join("\n")}`;

        editor.executeEdits("append-variables", [
          { range: endRange, text: appendText, forceMoveMarkers: true },
        ]);
      }
    }

    setGenerateCodeInsertPosition(null);
    setGenerateCodeModalVisible(false);
  }, [generateCodeInsertPosition, generatedCode, generatorForm, identifier]);

  handlersRef.current = {
    handleSaveSource,
    handleLoadSourceClick,
    handleAssembleClick,
    handleRunClick,
    handleStopClick,
    handleStepClick,
  };

  useEffect(() => {
    const savedCode = window.localStorage.getItem(STORAGE_KEYS.source);
    const savedFileName = window.localStorage.getItem(STORAGE_KEYS.fileName);
    const savedProjectName = window.localStorage.getItem(STORAGE_KEYS.projectName);
    const savedRecentProjects = window.localStorage.getItem(STORAGE_KEYS.recentProjects);

    if (savedRecentProjects) {
      try {
        const parsedRecentProjects = JSON.parse(savedRecentProjects);
        if (Array.isArray(parsedRecentProjects)) {
          setRecentProjects(parsedRecentProjects.slice(0, 6));
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEYS.recentProjects);
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
      setIsStepping(false);
      highlightCurrentLine(null);
    };
    simulator.inputCallback = () => {
      setInputModalVisible(true);
    };
    simulator.onProgramEnd = () => {
      const state = simulator.getState();
      setRegisterState({
        AC: state.AC,
        PC: state.PC,
        IR: state.IR,
        MAR: state.MAR,
        MBR: state.MBR,
      });
      snapshotMemory();
      setIsRunning(false);
      setIsStepping(false);
      highlightCurrentLine(null);
    };
    simulator.onStep = () => {
      const state = simulator.getState();
      setRegisterState({
        AC: state.AC,
        PC: state.PC,
        IR: state.IR,
        MAR: state.MAR,
        MBR: state.MBR,
      });
      snapshotMemory();
      if (state.running) {
        highlightCurrentLine(addressToLineRef.current[state.PC] ?? null);
      }
    };

    return () => {
      simulator.outputCallback = null;
      simulator.errorCallback = null;
      simulator.inputCallback = null;
      simulator.onProgramEnd = null;
      simulator.onStep = null;
    };
  }, [handleOutput, highlightCurrentLine, simulator, snapshotMemory]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    function onKeyDown(event) {
      const mod = event.ctrlKey || event.metaKey;
      const {
        handleSaveSource: saveSource,
        handleLoadSourceClick: loadSourceClick,
        handleAssembleClick: assembleClick,
        handleRunClick: runClick,
        handleStopClick: stopClick,
        handleStepClick: stepClick,
      } = handlersRef.current;

      if (mod && event.key === "s") {
        event.preventDefault();
        saveSource();
        return;
      }

      if (mod && event.key === "o") {
        event.preventDefault();
        loadSourceClick();
        return;
      }

      if (mod && event.key === "Enter") {
        event.preventDefault();
        assembleClick();
        return;
      }

      if (mod && event.key === "f") {
        event.preventDefault();
        editorRef.current?.focus();
        editorRef.current?.trigger("keyboard", "actions.find", null);
        return;
      }

      if (event.key === "F5" && !event.shiftKey) {
        event.preventDefault();
        runClick();
        return;
      }

      if (event.key === "F5" && event.shiftKey) {
        event.preventDefault();
        stopClick();
        return;
      }

      if (event.key === "F6") {
        event.preventDefault();
        stepClick();
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

      <EditorToolbar
        fileName={fileName}
        projectName={projectName}
        recentProjects={recentProjects}
        stepSpeed={stepSpeed}
        outputMode={outputMode}
        isCodeAssembled={isCodeAssembled}
        isRunning={isRunning}
        isStepping={isStepping}
        onProjectNameChange={handleProjectNameChange}
        onLoadSourceClick={handleLoadSourceClick}
        onSaveSource={handleSaveSource}
        onLoadRecentProject={handleLoadRecentProject}
        onStepSpeedChange={handleStepSpeedChange}
        onOutputModeChange={setOutputMode}
        onAssembleClick={handleAssembleClick}
        onStepClick={handleStepClick}
        onRunClick={handleRunClick}
        onStopClick={handleStopClick}
      />

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
        stateCollapsed={stateCollapsed}
        statePanelWidth={statePanelWidth}
        isRunning={isRunning}
        isCodeAssembled={isCodeAssembled}
        outputMode={outputMode}
        output={output}
        errorMessage={errorMessage}
        registerState={registerState}
        memoryValues={memoryValues}
        terminalRef={terminalRef}
        onResizeStart={handleResizeStart}
        onHorizontalResizeStart={handleHorizontalResizeStart}
        onToggleOutput={() => setOutputCollapsed((value) => !value)}
        onToggleState={() => setStateCollapsed((value) => !value)}
      />

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
    </div>
  );
}

export default CodeEditor;

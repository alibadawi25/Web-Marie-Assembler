import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { Button, Slider, Modal, Input, Typography, Dropdown } from "antd";
import assembleCode from "../utils/marieAssembler.js";
import { MarieSimulator } from "../utils/marieSimulator.js";
import "./CodeEditor.css";

const { Title, Text } = Typography;
const MonacoEditor = lazy(() =>
  import("@monaco-editor/react").then((mod) => ({ default: mod.Editor }))
);

function CodeEditor() {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationRef = useRef([]);
  const terminalRef = useRef(null);
  const simulator = MarieSimulator.getInstance();

  const [errorLine, setErrorLine] = useState(null);
  const [errorMessageLine, setErrorMessageLine] = useState("");
  const [code, setCode] = useState("// Your code here");
  const [machineCode, setMachineCode] = useState([]);
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
  const [newIdentifierName, setNewIdentifierName] = useState("");
  const [newIdentifierValue, setNewIdentifierValue] = useState("0");
  const [conditionOperator, setConditionOperator] = useState("==");
  const [ifIdentifier2, setIfIdentifier2] = useState("");
  const [ifStatementCount, setIfStatementCount] = useState(0);

  const [inputValue, setInputValue] = useState("");
  const [inputType, setInputType] = useState("dec");
  const [outputMode, setOutputMode] = useState("dec");
  const [stepSpeed, setStepSpeed] = useState(100);

  const instructionsWithArgs = [
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

  function handleCodeChange(value = "") {
    setCode(value);
    setIsCodeAssembled(false);
    setMachineCode([]);

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

        if (instructionsWithArgs.includes(instruction) && !args) {
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

        if (instructionsWithArgs.includes(instruction) && !args) {
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

  function handleRunClick() {
    if (!machineCode.length) {
      setErrorMessage("No machine code available. Assemble first.");
      return;
    }

    setErrorMessage("");
    setOutput([]);

    const programArray = machineCode.map((instruction) => instruction.code);
    simulator.loadProgram(programArray);
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
    setOutput([]);
    setErrorMessage("");
    setIsCodeAssembled(true);
    setErrorLine(null);
    setErrorMessageLine("");
    highlightErrorLine(null);
  }

  return (
    <div className="code-editor">
      <div className="editor-toolbar">
        <div className="toolbar-group toolbar-speed">
          <label htmlFor="step-speed" className="toolbar-label">Speed</label>
          <Slider
            id="step-speed"
            defaultValue={100}
            min={0}
            step={10}
            max={1000}
            tooltip={{ formatter: (v) => `${v} ms` }}
            className="step-speed"
            onChange={(value) => { simulator.setDelay(value); setStepSpeed(value); }}
          />
          <span className="toolbar-speed-value">{stepSpeed} ms</span>
        </div>
        <div className="toolbar-group toolbar-actions">
          <Dropdown
            id="output-mode"
            className="output-mode-dropdown"
            defaultValue="dec"
            value={outputMode}
            trigger={["click"]}
            menu={{
              items: [
                { key: "dec", label: "Dec" },
                { key: "hex", label: "Hex" },
                { key: "bin", label: "Bin" },
                { key: "unicode", label: "Unicode" },
              ],
              onClick: ({ key }) => setOutputMode(key),
            }}
          >
            <Button className="toolbar-dropdown-btn">{outputMode.toUpperCase()} ▾</Button>
          </Dropdown>
          <Button onClick={handleAssembleClick} className="toolbar-btn toolbar-btn-assemble">
            Assemble
          </Button>
          <Button
            onClick={isRunning ? handleStopClick : handleRunClick}
            disabled={!isCodeAssembled}
            className={`toolbar-btn ${isRunning ? "toolbar-btn-stop" : "toolbar-btn-run"}`}
          >
            <span className="toolbar-btn-inner">
              {isRunning ? (
                <>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <rect x="0" y="0" width="10" height="10" rx="1.5" />
                  </svg>
                  Stop
                </>
              ) : (
                <>
                  <svg width="10" height="11" viewBox="0 0 10 11" fill="currentColor">
                    <path d="M1 1.5 L9 5.5 L1 9.5 Z" />
                  </svg>
                  Run
                </>
              )}
            </span>
          </Button>
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

      <div className="terminal-panel">
        <div className="terminal-header">
          <span className="terminal-title">Output</span>
          {isRunning && <span className="terminal-running-badge">● Running</span>}
          {isCodeAssembled && !isRunning && <span className="terminal-ready-badge">● Ready</span>}
        </div>
        <div className="terminal" ref={terminalRef}>
          {output.length === 0 && !errorMessage && (
            <p className="terminal-placeholder">Program output will appear here…</p>
          )}
          {output.length > 0 && (
            <div className="output">
              {output.map((value, index) => (
                <p key={index} className="output-line">
                  <span className="output-index">{index + 1}</span>
                  {value}
                </p>
              ))}
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
        closable={false}
        className="generate-code-modal"
        footer={
          <Button
            className="run-assemble-button"
            disabled={
              generatedCode === "if-condition" &&
              (!ifIdentifier1 || !ifIdentifier2)
            }
            onClick={() => {
              let conditionCode = "";

              if (generatedCode === "if-condition") {
                const sequence = ifStatementCount + 1;
                setIfStatementCount(sequence);

                const ifIdentifier = `if${sequence}`;
                const elseIdentifier = `else${sequence}`;
                const endifIdentifier = `endIf${sequence}`;

                const conditionConfig = {
                  "==": { skipcond: "400", invert: false },
                  "!=": { skipcond: "400", invert: true },
                  "<": { skipcond: "000", invert: false },
                  "<=": { skipcond: "800", invert: true },
                  ">": { skipcond: "800", invert: false },
                  ">=": { skipcond: "000", invert: true },
                }[conditionOperator];

                const firstJumpTarget = conditionConfig.invert
                  ? ifIdentifier
                  : elseIdentifier;
                const secondJumpTarget = conditionConfig.invert
                  ? elseIdentifier
                  : ifIdentifier;

                conditionCode =
                  `load ${ifIdentifier1}\n` +
                  `subt ${ifIdentifier2}\n` +
                  `skipcond ${conditionConfig.skipcond}\n` +
                  `jump ${firstJumpTarget}\n` +
                  `jump ${secondJumpTarget}\n` +
                  `${ifIdentifier}, // if block starts here\n` +
                  `// write code before jump ${endifIdentifier} line\n` +
                  `jump ${endifIdentifier}\n` +
                  `${elseIdentifier}, // else block starts here\n` +
                  `${endifIdentifier}, // if-statement block ends here\n`;
              }

              if (editorRef.current && generateCodeInsertPosition) {
                const editor = editorRef.current;
                const pos = generateCodeInsertPosition;
                const monacoRangeClass = monacoRef.current?.Range;
                if (!monacoRangeClass) return;

                const range = new monacoRangeClass(
                  pos.lineNumber,
                  pos.column,
                  pos.lineNumber,
                  pos.column
                );
                editor.executeEdits("insert-generated-code", [
                  {
                    range,
                    text: conditionCode,
                    forceMoveMarkers: true,
                  },
                ]);
              }

              setGenerateCodeInsertPosition(null);
              setGenerateCodeModalVisible(false);
            }}
          >
            OK
          </Button>
        }
      >
        <Title level={4}>Generate Code</Title>
        <Dropdown
          menu={{
            items: [
              { key: "if-condition", label: "If Condition" },
              { key: "loop", label: "Loop" },
              { key: "subroutine", label: "Subroutine" },
            ],
            onClick: ({ key }) => setGeneratedCode(key),
          }}
        >
          <Button style={{ display: "block", marginBottom: "10px" }}>
            {generatedCode}
          </Button>
        </Dropdown>

        {generatedCode === "if-condition" &&
          (identifier.length >= 2 ? (
            <>
              <Text style={{ marginRight: "10px" }}>{"if ("}</Text>
              <Dropdown
                menu={{
                  items: identifier.map((id) => ({
                    key: id,
                    label: id,
                  })),
                  onClick: ({ key }) => setIfIdentifier1(key),
                }}
              >
                <Button>{ifIdentifier1 || "Select Identifier"}</Button>
              </Dropdown>
              <Dropdown
                menu={{
                  items: [
                    { key: "==", label: "==" },
                    { key: "!=", label: "!=" },
                    { key: "<", label: "<" },
                    { key: "<=", label: "<=" },
                    { key: ">", label: ">" },
                    { key: ">=", label: ">=" },
                  ],
                  onClick: ({ key }) => {
                    setConditionOperator(key);
                  },
                }}
              >
                <Button style={{ marginInline: "10px" }}>
                  {conditionOperator}
                </Button>
              </Dropdown>
              <Dropdown
                menu={{
                  items: identifier.map((id) => ({
                    key: id,
                    label: id,
                  })),
                  onClick: ({ key }) => setIfIdentifier2(key),
                }}
              >
                <Button>{ifIdentifier2 || "Select Identifier"}</Button>
              </Dropdown>
              <Text style={{ marginLeft: "10px" }}>{" ) {"}</Text>
            </>
          ) : (
            <>
              <Title level={4}>Generate an identifier</Title>
              <Input
                placeholder="Identifier Name"
                value={newIdentifierName}
                onChange={(e) => setNewIdentifierName(e.target.value)}
                className="input-field"
              />
              <Input
                placeholder="Initial Value"
                value={newIdentifierValue}
                onChange={(e) => setNewIdentifierValue(e.target.value)}
                type="number"
                className="input-field"
              />
              <Button
                onClick={() => {
                  if (!newIdentifierName) return;
                  setIdentifier((prev) => [...prev, newIdentifierName]);
                  setIfIdentifier1(newIdentifierName);
                  setCode(
                    (prev) =>
                      `${prev}\n${newIdentifierName}, dec ${newIdentifierValue}`
                  );
                  setNewIdentifierName("");
                  setNewIdentifierValue("0");
                }}
                disabled={!newIdentifierName}
                className="run-assemble-button"
                style={{ marginTop: "10px" }}
              >
                Add Identifier
              </Button>
            </>
          ))}

        {generatedCode === "loop" && (
          <Input
            placeholder="Enter loop condition (e.g., A < 10)"
            className="input-field"
          />
        )}
        {generatedCode === "subroutine" && (
          <Input
            placeholder="Enter subroutine name (e.g., mySubroutine)"
            className="input-field"
          />
        )}
      </Modal>
    </div>
  );
}

export default CodeEditor;

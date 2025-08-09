import { Editor } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import { Button, Menu, Slider, Modal, Input, Typography, Dropdown } from "antd";
import assembleCode from "../utils/marieAssembler.js";
import { MarieSimulator } from "../utils/marieSimulator.js";
import "./CodeEditor.css";
const { Title } = Typography;

function CodeEditor() {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationRef = useRef([]);
  const simulator = MarieSimulator.getInstance(); // Use singleton instance

  const [errorLine, setErrorLine] = useState(null);
  const [errorMessageLine, setErrorMessageLine] = useState("");
  const [code, setCode] = useState("// Your code here");
  const [machineCode, setMachineCode] = useState([]);
  const [symbolTable, setSymbolTable] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [output, setOutput] = useState([]);
  const [identifier, setIdentifier] = useState([]);
  const [isCodeAssembled, setIsCodeAssembled] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [stepSpeed, setStepSpeed] = useState(100); // Default step speed in ms
  const [inputModalVisible, setInputModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [inputType, setInputType] = useState("dec"); // Add this state
  const [outputMode, setOutputMode] = useState("dec"); // Add this state
  // MARIE instructions that require arguments
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
  // Setup function for Monaco
  function handleEditorWillMount(monaco) {
    monaco.languages.register({ id: "marie" });
    monaco.languages.setMonarchTokensProvider("marie", {
      tokenizer: {
        root: [
          [
            /\b(?:load|store|add|subt|input|output|halt|skipcond|jump|clear|addi|jumpi|loadi|storei|jns|dec|hex)\b/,
            "keyword",
          ],
          [/\b\d+[a-fA-F]+\d*\b/, "number"],
          [/\b[a-fA-F]+\d+[a-fA-F]*\b/, "number"],
          [/\b\d+\b/, "number"],
          [/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*,/, "identifier"],
          [/\/\/.*$/, "comment"],
        ],
      },
    });

    // change theme
    monaco.editor.defineTheme("marieDark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "569cd6" },
        { token: "identifier", foreground: "8d6ec2" },
        { token: "number", foreground: "b5cea8" },
        { token: "comment", foreground: "608b4e" },
      ],
      colors: {},
    });

    // Register autocomplete provider for MARIE
    monaco.languages.registerCompletionItemProvider("marie", {
      provideCompletionItems: (model, position) => {
        const suggestions = [];

        // MARIE instructions (add more as needed)
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

        // Suggest instructions
        instructions.forEach((inst) => {
          suggestions.push({
            label: inst,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: inst,
          });
        });

        // Use identifiers array for suggestions
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
  }

  function highlightErrorLine(lineNumber, errorMessage) {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();

    if (lineNumber && model.getLineCount() >= lineNumber) {
      const lineLength = model.getLineLength(lineNumber);
      monaco.editor.setModelMarkers(model, "owner", [
        {
          startLineNumber: lineNumber,
          startColumn: 1,
          endLineNumber: lineNumber,
          endColumn: lineLength + 1,
          message: errorMessage || "Syntax error: undefined error",
          severity: monaco.MarkerSeverity.Error,
        },
      ]);
      // Remove previous decoration and add new one
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
      decorationRef.current = editor.deltaDecorations(
        decorationRef.current,
        []
      );
    }
  }

  useEffect(() => {
    console.log(identifier);
  }, [identifier]);

  function handleCodeChange(value) {
    setCode(value);

    // Extract identifiers from code
    const identifierRegex = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,/gm;
    let match;
    const identifiers = [];
    while ((match = identifierRegex.exec(value))) {
      if (!identifiers.includes(match[1])) {
        identifiers.push(match[1]);
      }
    }
    setIdentifier(identifiers);

    const lines = value.split("\n");
    let foundErrorLine = null;
    let errorMessage = "";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === "") continue; // Skip empty lines
      if (line.trim().startsWith("//")) continue; // Skip comments

      // Check if instruction requires args but has no args
      const instructionMatchWithComma = line.match(
        /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,?\s*([a-zA-Z]+)\s*(.*)$/
      );

      const instructionMatch = line.match(/^\s*([a-zA-Z]+)\s*(.*)$/);

      if (instructionMatchWithComma) {
        const instruction = instructionMatchWithComma[2];
        const args = instructionMatchWithComma[3].trim();
        // Check if instruction requires args but has no args
        if (instructionsWithArgs.includes(instruction) && !args) {
          foundErrorLine = i + 1;
          errorMessage = `Syntax error: instruction '${instruction}' requires an argument`;
          break;
        }

        if (instruction === "dec" || instruction === "hex") {
          // Check if dec or hex is used without a number
          if (!args.match(/^\d+$/) && !args.match(/^[0-9a-fA-F]+$/)) {
            foundErrorLine = i + 1;
            errorMessage = `Syntax error: '${instruction}' requires a valid number`;
            break;
          }
        }
      }

      if (instructionMatch) {
        const instruction = instructionMatch[1];
        const args = instructionMatch[2].trim();
        if (instructionsWithArgs.includes(instruction) && !args) {
          foundErrorLine = i + 1;
          errorMessage = `Syntax error: instruction '${instruction}' requires an argument`;
          break;
        }
        if (instruction === "dec" || instruction === "hex") {
          // Check if dec or hex is used without a number
          if (!args.match(/^\d+$/) && !args.match(/^[0-9a-fA-F]+$/)) {
            foundErrorLine = i + 1;
            errorMessage = `Syntax error: '${instruction}' requires a valid number`;
            break;
          }
        }
      }

      // check that after a keyword there must be a known identifier
      if (
        /^\s*(load|store|add|subt|jump|skipcond|addi|jumpi|loadi|storei|jns)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/.test(
          line
        )
      ) {
        const match = line.match(
          /^\s*(load|store|add|subt|jump|skipcond|addi|jumpi|loadi|storei|jns)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/
        );
        const usedIdentifier = match[2];
        if (!identifiers.includes(usedIdentifier)) {
          foundErrorLine = i + 1;
          errorMessage = `Syntax error: identifier '${usedIdentifier}' is not defined`;
          break;
        }
      }

      // check for lines with labels followed by instructions that use undefined identifiers
      // Example: "start, load x" where x is not defined
      if (
        /^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*,\s*(load|store|add|subt|jump|skipcond|addi|jumpi|loadi|storei|jns)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/.test(
          line
        )
      ) {
        const match = line.match(
          /^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*,\s*(load|store|add|subt|jump|skipcond|addi|jumpi|loadi|storei|jns)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/
        );
        const usedIdentifier = match[2];
        if (!identifiers.includes(usedIdentifier)) {
          foundErrorLine = i + 1;
          errorMessage = `Syntax error: identifier '${usedIdentifier}' is not defined`;
          break;
        }
      }

      // Check for syntax error: label must be at start of line and cannot be a number or have spaces
      if (/,/.test(line) && !/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*,/.test(line)) {
        foundErrorLine = i + 1;
        errorMessage =
          "Syntax error: label must be at start of line and cannot be a number or have spaces";
        break;
      }
    }

    // Only update if the error line has changed OR error message has changed
    if (foundErrorLine !== errorLine || errorMessage !== errorMessageLine) {
      setErrorLine(foundErrorLine);
      setErrorMessageLine(errorMessage);
      highlightErrorLine(foundErrorLine, errorMessage);
    }
    // Clear error if no error found
    if (!foundErrorLine && errorLine) {
      setErrorLine(null);
      setErrorMessageLine("");
      highlightErrorLine(null);
    }
  }
  function handleOutput(value) {
    let formattedValue = value;
    if (outputMode === "hex") {
      formattedValue = "0x" + Number(value).toString(16).toUpperCase();
      console.log("Hex output:", formattedValue);
    } else if (outputMode === "bin") {
      formattedValue = "0b" + Number(value).toString(2);
    } else if (outputMode === "unicode") {
      formattedValue =
        typeof value === "number" ? String.fromCharCode(value) : value;
    }
    setOutput((prevOutput) => [...prevOutput, formattedValue]);
    // Scroll to the bottom of the output
    const terminal = document.querySelector(".terminal");
    if (terminal) {
      terminal.scrollTop = terminal.scrollHeight;
    }
  }

  simulator.outputCallback = handleOutput;
  simulator.errorCallback = (error) => {
    setErrorMessage(error.message);
  };
  simulator.inputCallback = () => {
    setInputModalVisible(true);
  };

  function handleRunClick() {
    errorMessage && setErrorMessage(""); // Clear error message
    setOutput([]); // Clear previous output
    // Stop any previous run
    if (isRunning) {
      runningRef.current = false; // Signal the async function to stop
      simulator.stop();
      setIsRunning(false);
      return; // Don't start a new run, just stop the current one
    }

    // Extract code values from machine code objects
    const programArray = machineCode.map((instruction) => instruction.code);

    simulator.loadProgram(programArray);
    simulator.run();
    setIsRunning(true);
    console.log("Run button clicked");
  }

  function handleStopClick() {
    simulator.stop();

    console.log(simulator.running);
    console.log(simulator.getState());
    setIsRunning(false);
    console.log("Stop button clicked");
  }

  function handleAssembleClick() {
    const result = assembleCode(code);
    if (!result.success) {
      console.error("Assembly failed:", result.errors);
      setOutput([]);
      setErrorMessage(result.errors);
      highlightErrorLine(result.errors[0].line, result.errors[0].message);
      return;
    } else {
      setMachineCode(result.machineCode);
      setSymbolTable(result.symbolTable);
      console.log("Assembly successful:", result.machineCode);

      setIsCodeAssembled(true);
      // Optionally, you can store the assembled code or do something with it
      // For example, you can save it to a state or send it to a simulator
    }
  }
  return (
    <div className="code-editor">
      <Menu mode="horizontal" className="editor-menu">
        <label htmlFor="step-speed">Step Speed(ms):</label>
        <Slider
          id="step-speed"
          defaultValue={100}
          min={0}
          step={10}
          max={1000}
          tooltip={{ open: true }}
          className="step-speed"
          onChange={(value) => simulator.setDelay(value)}
        ></Slider>
        <label htmlFor="output-mode">Output Mode:</label>
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
          <Button style={{ width: "100px" }}>{outputMode.toUpperCase()}</Button>
        </Dropdown>
        <Button onClick={handleAssembleClick} className="run-assemble-button">
          Assemble
        </Button>
        <Button
          onClick={isRunning ? handleStopClick : handleRunClick}
          disabled={!isCodeAssembled}
          className="run-assemble-button"
        >
          {isRunning ? "Stop" : "Run"}
        </Button>
      </Menu>
      <Editor
        className="editor"
        theme="marieDark"
        defaultLanguage="marie"
        value={code.toLowerCase()}
        options={{
          fontSize: 16,
          minimap: { enabled: false },
        }}
        defaultValue="// Your code here"
        onChange={handleCodeChange}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
      />
      <div className="terminal">
        {output.length > 0 && (
          <div className="output">
            <strong>Output:</strong>
            <div className="output-values">
              {output.map((value, index) => (
                <p key={index} style={{ margin: "4px 0" }}>
                  {value}
                </p>
              ))}
            </div>
          </div>
        )}{" "}
        {errorMessage && (
          <p className="error" style={{ margin: "4px 0" }}>
            Error: {errorMessage}
          </p>
        )}
      </div>
      <Modal
        open={inputModalVisible}
        closable={false}
        footer={
          <Button
            className="run-assemble-button"
            onClick={() => {
              let value = inputValue;
              if (inputType === "hex") value = parseInt(inputValue, 16);
              else if (inputType === "bin") value = parseInt(inputValue, 2);
              else if (inputType === "unicode")
                value = inputValue.charCodeAt(0);
              else value = parseInt(inputValue, 10);
              console.log(value);
              simulator.setInput([value]);
              console.log(simulator.getState());
              simulator.resume(); // Resume execution after input
              setInputModalVisible(false);
              setInputValue(""); // Reset input
              setInputType("dec"); // Reset type
            }}
            disabled={
              inputType === "unicode"
                ? inputValue.length !== 1
                : inputValue.trim() === "" ||
                  isNaN(
                    inputType === "hex"
                      ? parseInt(inputValue, 16)
                      : inputType === "bin"
                      ? parseInt(inputValue, 2)
                      : parseInt(inputValue, 10)
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
          type={inputType === "unicode" ? "text" : "text"}
          maxLength={inputType === "unicode" ? 1 : undefined}
          className="input-field"
        />
      </Modal>
    </div>
  );
}

export default CodeEditor;

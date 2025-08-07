import { Editor } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import { Button, Menu, Slider } from "antd";
import assembleCode from "../utils/marieAssembler.js";
import { MarieSimulator } from "../utils/marieSimulator.js";
import "./CodeEditor.css";

function CodeEditor() {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationRef = useRef([]);
  const simulator = new MarieSimulator();

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
  const runningRef = useRef(false);
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

  function run() {
    setErrorMessage(""); // Clear previous error message
    setOutput([]); // Clear previous output
    setIsRunning(true);
    runningRef.current = true;

    const runWithDelay = async () => {
      try {
        while (simulator.running && runningRef.current) {
          if (!runningRef.current) break; // Check if we should stop

          simulator.step();
          // Add configurable delay between steps
          await new Promise((resolve) => setTimeout(resolve, stepSpeed));

          // Check again after delay
          if (!runningRef.current) break;

          // Update output after each step in case there are OUTPUT instructions
          const currentOutput = simulator.getOutput();
          setOutput([...currentOutput]);
        }
        // Get final output after execution completes
        const programOutput = simulator.getOutput();
        setOutput(programOutput);
      } catch (error) {
        if (error.message === "INPUT_REQUIRED") {
          // Handle input required error
        } else {
          setErrorMessage(error.message);
        }
        // Still get output even if there's an error
        const programOutput = simulator.getOutput();
        setOutput(programOutput);
      } finally {
        setIsRunning(false);
        runningRef.current = false;
      }
    };

    runWithDelay();
  }

  function handleRunClick() {
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
    run();
    console.log("Run button clicked");
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
          value={stepSpeed}
          min={0}
          step={10}
          max={1000}
          tooltip={{ open: true }}
          className="step-speed"
          onChange={(value) => setStepSpeed(value)}
        ></Slider>
        <Button onClick={handleAssembleClick} className="run-assemble-button">
          Assemble
        </Button>
        <Button
          onClick={handleRunClick}
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
        value={code}
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
    </div>
  );
}

export default CodeEditor;

import { Editor } from "@monaco-editor/react";
import { useRef, useState } from "react";

import "./CodeEditor.css";

function CodeEditor() {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationRef = useRef([]);
  const [errorLine, setErrorLine] = useState(null);
  const [code, setCode] = useState("// Your code here");

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

  function handleCodeChange(value) {
    setCode(value);

    const lines = value.split("\n");
    let foundErrorLine = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/,/.test(line) && !/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*,/.test(line)) {
        foundErrorLine = i + 1;
        break;
      }
    }
    // Only update if the error line has changed
    if (foundErrorLine !== errorLine) {
      setErrorLine(foundErrorLine);
      highlightErrorLine(
        foundErrorLine,
        "Syntax error: label must be at start of line and cannot be a number or have spaces"
      );
    }
    // Clear error if no error found
    if (!foundErrorLine && errorLine) {
      setErrorLine(null);
      highlightErrorLine(null);
    }
  }
  return (
    <div className="code-editor">
      <Editor
        className="editor"
        theme="marieDark"
        defaultLanguage="marie"
        options={{
          fontSize: 16,
          minimap: { enabled: false },
        }}
        defaultValue="// Your code here"
        onChange={handleCodeChange}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
      />
    </div>
  );
}

export default CodeEditor;

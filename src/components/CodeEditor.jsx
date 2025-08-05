import { Editor } from "@monaco-editor/react";
import "./CodeEditor.css";

function CodeEditor() {
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
        ],
      },
    });
  }

  return (
    <div className="code-editor">
      <Editor
        className="editor"
        theme="vs-dark"
        defaultLanguage="marie"
        options={{
          fontSize: 16,
          minimap: { enabled: false },
        }}
        defaultValue="// Your code here"
        beforeMount={handleEditorWillMount}
      />
    </div>
  );
}

export default CodeEditor;

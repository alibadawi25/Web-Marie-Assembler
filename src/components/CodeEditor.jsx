import { Editor } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "./CodeEditor.css";
function CodeEditor() {
  monaco.languages.register({
    id: "marie",
  });
  monaco.languages.setMonarchTokensProvider("marie", {
    tokenizer: {
      root: [
        // keywords
      ],
    },
  });
  return (
    <div className="code-editor">
      <Editor
        className="editor"
        theme="vs-dark"
        defaultLanguage="plaintext"
        options={{
          fontSize: 16,
          minimap: { enabled: false },
        }}
        defaultValue="// Your code here"
      />
    </div>
  );
}
export default CodeEditor;

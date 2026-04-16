import { LABEL_REF_INSTRUCTIONS } from "./constants.js";

const INSTRUCTION_INFO = {
  load: {
    detail: "AC ← Memory[addr]",
    doc: "**Syntax:** `LOAD addr`\n\nLoads the value at `addr` into the accumulator (AC).\n\n*Example:*\n```\nload X\n```",
  },
  store: {
    detail: "Memory[addr] ← AC",
    doc: "**Syntax:** `STORE addr`\n\nStores the accumulator's current value into memory at `addr`.\n\n*Example:*\n```\nstore Result\n```",
  },
  add: {
    detail: "AC ← AC + Memory[addr]",
    doc: "**Syntax:** `ADD addr`\n\nAdds the value at `addr` to AC. Result wraps in 16-bit 2's complement.\n\n*Example:*\n```\nadd Y\n```",
  },
  subt: {
    detail: "AC ← AC − Memory[addr]",
    doc: "**Syntax:** `SUBT addr`\n\nSubtracts the value at `addr` from AC. Result wraps in 16-bit 2's complement.\n\n*Example:*\n```\nsubt One\n```",
  },
  input: {
    detail: "AC ← user input",
    doc: "**Syntax:** `INPUT`\n\nPauses execution and reads an integer from the user into AC.",
  },
  output: {
    detail: "print AC",
    doc: "**Syntax:** `OUTPUT`\n\nOutputs the current value of the accumulator (AC) to the output panel.",
  },
  halt: {
    detail: "stop execution",
    doc: "**Syntax:** `HALT`\n\nStops program execution. Every program should end with HALT.",
  },
  skipcond: {
    detail: "skip next if AC satisfies cond",
    doc: "**Syntax:** `SKIPCOND cond`\n\nSkips the next instruction if the condition is met:\n- `000` — skip if **AC < 0**\n- `400` — skip if **AC = 0**\n- `800` — skip if **AC > 0**\n\n*Example:*\n```\nskipcond 400\njump Done\n```",
    snippet: "skipcond ${1|000,400,800|}",
  },
  jump: {
    detail: "PC ← addr",
    doc: "**Syntax:** `JUMP addr`\n\nUnconditionally jumps to `addr`.\n\n*Example:*\n```\njump Loop\n```",
  },
  clear: {
    detail: "AC ← 0",
    doc: "**Syntax:** `CLEAR`\n\nSets the accumulator to zero. Equivalent to `LOAD` of a zero variable.",
  },
  jns: {
    detail: "save return addr, jump to addr+1",
    doc: "**Syntax:** `JNS addr`\n\nSaves the return address (current PC) at `addr`, then jumps to `addr + 1`. Used for subroutine calls.\n\n*Example:*\n```\njns MySub\n```",
  },
  addi: {
    detail: "AC ← AC + Memory[Memory[addr]]",
    doc: "**Syntax:** `ADDI addr`\n\nIndirect add: treats `addr` as a pointer. Reads `Memory[addr]` as an address, then adds `Memory[Memory[addr]]` to AC.",
  },
  jumpi: {
    detail: "PC ← Memory[addr]",
    doc: "**Syntax:** `JUMPI addr`\n\nIndirect jump: reads `addr` as a pointer and jumps to the address stored there.",
  },
  loadi: {
    detail: "AC ← Memory[Memory[addr]]",
    doc: "**Syntax:** `LOADI addr`\n\nIndirect load: reads `addr` as a pointer, then loads `Memory[Memory[addr]]` into AC.",
  },
  storei: {
    detail: "Memory[Memory[addr]] ← AC",
    doc: "**Syntax:** `STOREI addr`\n\nIndirect store: writes AC to the address pointed to by the value at `addr`.",
  },
  dec: {
    detail: "decimal data constant",
    doc: "**Syntax:** `[label,] DEC value`\n\nDeclares a decimal constant in memory.\n\n*Example:*\n```\nX, dec 10\n```",
    snippet: "dec ${1:0}",
  },
  hex: {
    detail: "hex data constant (0000–FFFF)",
    doc: "**Syntax:** `[label,] HEX value`\n\nDeclares a 16-bit hexadecimal constant in memory.\n\n*Example:*\n```\nMask, hex FF\n```",
    snippet: "hex ${1:0}",
  },
  org: {
    detail: "set origin address (hex)",
    doc: "**Syntax:** `ORG addr`\n\nSets the assembler's address counter to `addr` (hex). Instructions that follow are placed starting at this address.\n\n*Example:*\n```\norg 100\n```",
    snippet: "org ${1:100}",
  },
};

const INSTRUCTION_DOCS = Object.fromEntries(
  Object.entries(INSTRUCTION_INFO).map(([instruction, info]) => [instruction, info.doc])
);

const INSTRUCTION_SORT_ORDER = [
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
  "jns",
  "dec",
  "hex",
  "org",
  "addi",
  "jumpi",
  "loadi",
  "storei",
];

export function registerMarieLanguage(monaco, identifierRef, symbolTableRef) {
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
    triggerCharacters: [" "],
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const lineContent = model.getLineContent(position.lineNumber);
      const beforeCursor = lineContent.substring(0, position.column - 1).split("//")[0];
      const withoutLabel = beforeCursor.replace(/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*,\s*/, "");
      const tokens = withoutLabel.trim().split(/\s+/).filter(Boolean);
      const firstToken = tokens[0]?.toLowerCase();
      const currentIdentifiers = identifierRef.current;
      const symbolTable = symbolTableRef.current ?? {};
      const suggestions = [];

      const labelSuggestions = () =>
        currentIdentifiers.map((id, index) => {
          const address = symbolTable[id];
          const addressHint = address !== undefined
            ? `@0x${address.toString(16).toUpperCase().padStart(3, "0")} (dec ${address})`
            : "label defined in this file";

          return {
            label: id,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: id,
            detail: addressHint,
            sortText: `z${String(index).padStart(4, "0")}`,
            range,
          };
        });

      if (!firstToken || tokens.length <= 1) {
        INSTRUCTION_SORT_ORDER.forEach((instruction, index) => {
          const info = INSTRUCTION_INFO[instruction];
          const needsOperand =
            LABEL_REF_INSTRUCTIONS.has(instruction) ||
            ["dec", "hex", "org"].includes(instruction);
          const hasSnippet = Boolean(info.snippet);

          suggestions.push({
            label: instruction,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: hasSnippet
              ? info.snippet
              : needsOperand
                ? `${instruction} `
                : instruction,
            insertTextRules: hasSnippet
              ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              : undefined,
            command: !hasSnippet && needsOperand
              ? { id: "editor.action.triggerSuggest", title: "Trigger suggestions" }
              : undefined,
            detail: info.detail,
            documentation: { value: info.doc },
            sortText: String(index).padStart(4, "0"),
            range,
          });
        });
      } else if (LABEL_REF_INSTRUCTIONS.has(firstToken)) {
        suggestions.push(...labelSuggestions());
      } else if (firstToken === "skipcond") {
        const conditionDocs = {
          "000": {
            detail: "skip if AC < 0",
            doc: "**000** — Skips the next instruction if the accumulator is **negative** (sign bit set).",
          },
          "400": {
            detail: "skip if AC = 0",
            doc: "**400** — Skips the next instruction if the accumulator is **zero**.",
          },
          "800": {
            detail: "skip if AC > 0",
            doc: "**800** — Skips the next instruction if the accumulator is **positive** (non-zero and sign bit clear).",
          },
        };

        Object.entries(conditionDocs).forEach(([condition, info], index) => {
          suggestions.push({
            label: condition,
            kind: monaco.languages.CompletionItemKind.EnumMember,
            insertText: condition,
            detail: info.detail,
            documentation: { value: info.doc },
            sortText: String(index),
            range,
          });
        });
      }

      return { suggestions };
    },
  });

  monaco.languages.registerHoverProvider("marie", {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const instructionDoc = INSTRUCTION_DOCS[word.word.toLowerCase()];
      if (instructionDoc) {
        return {
          range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
          contents: [
            { value: `**\`${word.word.toUpperCase()}\`** — MARIE instruction` },
            { value: instructionDoc },
          ],
        };
      }

      const symbolTable = symbolTableRef.current;
      if (symbolTable && word.word in symbolTable) {
        const address = symbolTable[word.word];
        return {
          range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
          contents: [
            { value: `**\`${word.word}\`** — label` },
            {
              value: `Memory address: \`0x${address.toString(16).toUpperCase().padStart(3, "0")}\` (decimal ${address})`,
            },
          ],
        };
      }

      return null;
    },
  });
}

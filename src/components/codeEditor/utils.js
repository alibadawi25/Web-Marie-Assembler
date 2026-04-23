import {
  ALL_INSTRUCTIONS_WITH_INLINE_ARGS,
  LABEL_REF_INSTRUCTIONS,
} from "./constants.js";

export function buildGenSnippet(type, {
  ifIdentifier1,
  ifIdentifier2,
  conditionOperator,
  ifSeq,
  loopLabel,
  loopIterations,
  loopSeq,
  identifier,
  subroutineName,
  variableName,
  variableType,
  variableValue,
}) {
  if (type === "if-condition") {
    if (!ifIdentifier1.trim() || !ifIdentifier2.trim()) return "";

    const ifLabel = `if${ifSeq}`;
    const elseLabel = `else${ifSeq}`;
    const endifLabel = `endIf${ifSeq}`;
    const conditionConfig = {
      "==": { skipcond: "400", invert: false },
      "!=": { skipcond: "400", invert: true },
      "<": { skipcond: "000", invert: false },
      "<=": { skipcond: "800", invert: true },
      ">": { skipcond: "800", invert: false },
      ">=": { skipcond: "000", invert: true },
    }[conditionOperator] ?? { skipcond: "400", invert: false };

    const jumpA = conditionConfig.invert ? ifLabel : elseLabel;
    const jumpB = conditionConfig.invert ? elseLabel : ifLabel;

    return (
      `load ${ifIdentifier1.trim()}\n` +
      `subt ${ifIdentifier2.trim()}\n` +
      `skipcond ${conditionConfig.skipcond}\n` +
      `jump ${jumpA}\n` +
      `jump ${jumpB}\n` +
      `${ifLabel}, // if-block — write body here\n` +
      `jump ${endifLabel}\n` +
      `${elseLabel}, // else-block — write body here\n` +
      `${endifLabel},`
    );
  }

  if (type === "loop") {
    if (!loopLabel.trim() || !loopIterations.trim()) return "";

    const counterLabel = loopLabel.trim();
    const loopBodyLabel = `loop${loopSeq}`;
    const endLoopLabel = `endLoop${loopSeq}`;
    const oneLabel = identifier.includes("One") ? "One" : `loopOne${loopSeq}`;
    const needsOneLabel = !identifier.includes("One");

    return (
      `load ${counterLabel}Start\n` +
      `store ${counterLabel}\n` +
      `${loopBodyLabel}, // loop body — write code here\n` +
      `load ${counterLabel}\n` +
      `subt ${oneLabel}\n` +
      `store ${counterLabel}\n` +
      `skipcond 400 // exit when counter = 0\n` +
      `jump ${loopBodyLabel}\n` +
      `${endLoopLabel},\n` +
      `${counterLabel}Start, dec ${loopIterations.trim()}\n` +
      `${counterLabel}, dec 0` +
      (needsOneLabel ? `\n${oneLabel}, dec 1` : "")
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

  if (type === "variable") {
    if (!variableName.trim() || !variableValue.trim()) return "";
    return `${variableName.trim()}, ${variableType} ${variableValue.trim()}`;
  }

  return "";
}

export function formatRegValue(value) {
  const numericValue = Number(value) || 0;
  return `0x${numericValue.toString(16).toUpperCase().padStart(4, "0")}`;
}

export function formatSignedValue(value) {
  const numericValue = Number(value) || 0;
  return numericValue > 0x7fff ? numericValue - 0x10000 : numericValue;
}

export function normalizeProjectName(name) {
  const trimmedName = name.trim();
  return trimmedName || "Untitled Project";
}

export function getProjectNameFromFileName(name) {
  const trimmedName = name.trim();
  if (!trimmedName) return "Untitled Project";
  return trimmedName.replace(/\.[^.]+$/, "") || "Untitled Project";
}

export function buildFileNameFromProjectName(name, preferredFileName = "program.mas") {
  const extension = preferredFileName.trim().match(/\.[^.]+$/)?.[0] ?? ".mas";
  return `${normalizeProjectName(name)}${extension}`;
}

export function extractIdentifiers(value = "") {
  const identifierRegex = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,/gm;
  const identifiers = [];
  let match;

  while ((match = identifierRegex.exec(value))) {
    if (!identifiers.includes(match[1])) {
      identifiers.push(match[1]);
    }
  }

  return identifiers;
}

export function validateCodeStructure(value = "") {
  const identifiers = extractIdentifiers(value);
  const identifierSet = new Set(identifiers.map((id) => id.toLowerCase()));
  const lines = value.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const withoutComment = lines[index].split("//")[0];
    const trimmedLine = withoutComment.trim();

    if (!trimmedLine) continue;

    let remainder = trimmedLine;
    const labelPrefixMatch = trimmedLine.match(
      /^([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*(.*)$/
    );

    if (labelPrefixMatch) {
      remainder = labelPrefixMatch[2].trim();
    } else if (trimmedLine.includes(",")) {
      return {
        identifiers,
        errorLine: lineNumber,
        errorMessage:
          "Syntax error: label must be 'name,' at start of line with a valid identifier",
      };
    }

    if (!remainder) continue;

    const tokens = remainder.split(/\s+/).filter(Boolean);
    const instruction = tokens[0].toLowerCase();
    const operand = tokens[1] ?? "";

    if (ALL_INSTRUCTIONS_WITH_INLINE_ARGS.has(instruction) && !operand) {
      return {
        identifiers,
        errorLine: lineNumber,
        errorMessage: `Syntax error: '${instruction}' requires an argument`,
      };
    }

    if (instruction === "dec" && operand && !/^-?\d+$/.test(operand)) {
      return {
        identifiers,
        errorLine: lineNumber,
        errorMessage: "Syntax error: 'dec' requires a decimal integer (e.g. dec 42)",
      };
    }

    if (instruction === "hex" && operand && !/^[0-9a-fA-F]+$/.test(operand)) {
      return {
        identifiers,
        errorLine: lineNumber,
        errorMessage: "Syntax error: 'hex' requires a hex number (e.g. hex 1F)",
      };
    }

    if (
      LABEL_REF_INSTRUCTIONS.has(instruction) &&
      operand &&
      /^[a-zA-Z_]/.test(operand) &&
      !identifierSet.has(operand.toLowerCase())
    ) {
      return {
        identifiers,
        errorLine: lineNumber,
        errorMessage: `Syntax error: identifier '${operand}' is not defined`,
      };
    }
  }

  return {
    identifiers,
    errorLine: null,
    errorMessage: "",
  };
}

export function buildProgramArray(machineCode) {
  return machineCode.map((instruction) => instruction.code);
}

export function buildAddressToLineMap(machineCode, startAddress = 0) {
  const addressToLine = {};

  machineCode.forEach((entry, index) => {
    addressToLine[startAddress + index] = entry.lineNumber;
  });

  return addressToLine;
}

export function buildInitialMemoryValues(symbolTable = {}, machineCode = [], startAddress = 0) {
  const initialMemoryValues = {};

  for (const [label, addr] of Object.entries(symbolTable)) {
    initialMemoryValues[label] = {
      addr,
      value: machineCode[addr - startAddress]?.code ?? 0,
    };
  }

  return initialMemoryValues;
}

export function getInputValue(inputType, inputValue) {
  if (inputType === "hex") return Number.parseInt(inputValue, 16);
  if (inputType === "bin") return Number.parseInt(inputValue, 2);
  if (inputType === "unicode") return inputValue.charCodeAt(0);
  return Number.parseInt(inputValue, 10);
}

// ─── Share URL ───────────────────────────────────────────────────────────────

export function encodeShareUrl(code) {
  try {
    const encoded = btoa(unescape(encodeURIComponent(code)));
    const url = new URL(window.location.href);
    url.searchParams.set('share', encoded);
    url.hash = '';
    return url.toString();
  } catch {
    return window.location.href;
  }
}

export function decodeShareParam() {
  try {
    const param = new URLSearchParams(window.location.search).get('share');
    if (!param) return null;
    return decodeURIComponent(escape(atob(param)));
  } catch {
    return null;
  }
}

// ─── Export helpers ───────────────────────────────────────────────────────────

export function exportAsHexDump(machineCode, startAddress) {
  const WORDS_PER_LINE = 8;
  const lines = [];
  for (let i = 0; i < machineCode.length; i += WORDS_PER_LINE) {
    const addr = (startAddress + i).toString(16).toUpperCase().padStart(4, '0');
    const words = machineCode
      .slice(i, i + WORDS_PER_LINE)
      .map((w) => w.toString(16).toUpperCase().padStart(4, '0'))
      .join(' ');
    lines.push(`:${addr}  ${words}`);
  }
  return lines.join('\n');
}

export function exportAsBinary(machineCode) {
  const buffer = new Uint8Array(machineCode.length * 2);
  machineCode.forEach((word, i) => {
    buffer[i * 2] = (word >> 8) & 0xff;
    buffer[i * 2 + 1] = word & 0xff;
  });
  return buffer;
}

export function exportAsLogisim(machineCode) {
  const words = machineCode.map((w) => w.toString(16).toUpperCase().padStart(4, '0'));
  return `v2.0 raw\n${words.join(' ')}`;
}

export function downloadFile(content, filename, mimeType) {
  const blob = content instanceof Uint8Array
    ? new Blob([content], { type: mimeType })
    : new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function isInputValueInvalid(inputType, inputValue) {
  if (inputType === "unicode") {
    return inputValue.length !== 1;
  }

  if (inputValue.trim() === "") {
    return true;
  }

  return Number.isNaN(getInputValue(inputType, inputValue));
}

export function getGenerateCodeDisabled({
  generatedCode,
  ifIdentifier1,
  ifIdentifier2,
  loopLabel,
  loopIterations,
  subroutineName,
  variableName,
  variableValue,
}) {
  if (generatedCode === "if-condition") {
    return !ifIdentifier1.trim() || !ifIdentifier2.trim();
  }

  if (generatedCode === "loop") {
    return !loopLabel.trim() || !loopIterations.trim();
  }

  if (generatedCode === "subroutine") {
    return !subroutineName.trim();
  }

  if (generatedCode === "variable") {
    return !variableName.trim() || !variableValue.trim();
  }

  return false;
}

class AssemblerError extends Error {
  constructor(message, line) {
    super(message);
    this.name = "AssemblerError";
    this.line = line;
  }
}

const instructionsWithArgs = new Set([
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
  "dec",
  "hex",
]);

function parseLine(rawLine, lineNumber) {
  const withoutComment = rawLine.split("//")[0].trim();
  if (!withoutComment) return null;

  let label = null;
  let remainder = withoutComment;

  const labelMatch = remainder.match(
    /^(?<label>[a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*(?<rest>.*)$/
  );
  if (labelMatch) {
    label = labelMatch.groups.label;
    remainder = labelMatch.groups.rest.trim();
  }

  // Label-only lines are allowed and point to the next instruction address.
  if (!remainder) {
    return { lineNumber, label, instruction: null, operand: null };
  }

  const tokens = remainder.split(/\s+/).filter(Boolean);
  if (tokens.length > 2) {
    throw new AssemblerError(
      `Syntax error: too many tokens on this line`,
      lineNumber
    );
  }

  const instruction = tokens[0].toLowerCase();
  const operand = tokens[1] ?? null;
  return { lineNumber, label, instruction, operand };
}

function parseDecOperand(operand, lineNumber) {
  if (!/^-?\d+$/.test(operand)) {
    throw new AssemblerError(`Syntax error: DEC requires a valid number`, lineNumber);
  }

  const value = Number.parseInt(operand, 10);
  if (value < 0 || value > 0xffff) {
    throw new AssemblerError(
      `Syntax error: DEC value must be between 0 and 65535`,
      lineNumber
    );
  }
  return value;
}

function parseHexOperand(operand, lineNumber) {
  if (!/^[0-9a-fA-F]+$/.test(operand)) {
    throw new AssemblerError(`Syntax error: HEX requires a valid number`, lineNumber);
  }

  const value = Number.parseInt(operand, 16);
  if (value < 0 || value > 0xffff) {
    throw new AssemblerError(
      `Syntax error: HEX value must be between 0000 and FFFF`,
      lineNumber
    );
  }
  return value;
}

export function assembleCode(sourceCode) {
  try {
    const lines = sourceCode.split("\n");
    const parsedLines = [];
    const machineCode = [];
    const symbolTable = {};

    let address = 0;
    let startAddress = 0; // set by the first ORG directive
    let hasOrg = false;
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const parsed = parseLine(line, lineNumber);
      if (!parsed) return;

      // ORG: set the current address counter (value is hex).
      if (parsed.instruction === "org") {
        const orgAddr = parseHexOperand(parsed.operand, lineNumber);
        if (!hasOrg) { startAddress = orgAddr; hasOrg = true; }
        address = orgAddr;
        return; // ORG emits no machine word
      }

      if (parsed.label) {
        // Labels are case-sensitive in MARIE (e.g. 'T' for Tan ≠ 't' for Triangle).
        if (parsed.label in symbolTable) {
          throw new AssemblerError(
            `Duplicate label: '${parsed.label}'`,
            lineNumber
          );
        }
        symbolTable[parsed.label] = address;
      }

      parsedLines.push(parsed);

      if (parsed.instruction) {
        address++;
      }
    });

    parsedLines.forEach(({ lineNumber, instruction, operand }) => {
      // Label-only and ORG lines emit no machine instruction.
      if (!instruction || instruction === "org") return;

      const requiresArg = instructionsWithArgs.has(instruction);

      if (requiresArg && !operand) {
        throw new AssemblerError(
          `Syntax error: instruction '${instruction}' requires an argument`,
          lineNumber
        );
      }

      if (!requiresArg && operand) {
        throw new AssemblerError(
          `Syntax error: instruction '${instruction}' does not accept an argument`,
          lineNumber
        );
      }

      let opcode;
      let args = 0;

      if (instruction === "dec") {
        opcode = 0;
        args = parseDecOperand(operand, lineNumber);
      } else if (instruction === "hex") {
        opcode = 0;
        args = parseHexOperand(operand, lineNumber);
      } else if (instruction === "skipcond") {
        opcode = getOpcode(instruction);
        if (!/^(000|400|800)$/i.test(operand)) {
          throw new AssemblerError(
            `Syntax error: instruction 'skipcond' requires one of 000, 400, 800`,
            lineNumber
          );
        }
        args = Number.parseInt(operand, 16);
      } else if (requiresArg) {
        opcode = getOpcode(instruction);
        // Label lookup is case-sensitive to match MARIE spec.
        const symbol = symbolTable[operand];
        if (symbol === undefined) {
          throw new AssemblerError(`Undefined symbol: '${operand}'`, lineNumber);
        }
        args = symbol;
      } else {
        opcode = getOpcode(instruction);
      }

      if (opcode === undefined) {
        throw new AssemblerError(`Unknown instruction: ${instruction}`, lineNumber);
      }

      machineCode.push({ code: opcode + args, lineNumber });
    });

    return {
      success: true,
      machineCode,
      symbolTable,
      startAddress,
      errors: [],
    };
  } catch (error) {
    if (error instanceof AssemblerError) {
      return {
        success: false,
        errors: [{ line: error.line, message: error.message }],
      };
    }

    return {
      success: false,
      errors: [{ line: null, message: error.message ?? "Unknown assembler error" }],
    };
  }
}

function getOpcode(instruction) {
  const opcodes = {
    jns: 0,
    load: 4096,
    store: 8192,
    add: 12288,
    subt: 16384,
    input: 20480,
    output: 24576,
    halt: 28672,
    skipcond: 32768,
    jump: 36864,
    clear: 40960,
    addi: 45056,
    jumpi: 49152,
    loadi: 53248,
    storei: 57344,
  };

  return opcodes[instruction.toLowerCase()];
}

export default assembleCode;

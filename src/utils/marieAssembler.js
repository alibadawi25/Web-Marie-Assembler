export function assembleCode(sourceCode) {
  try {
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
      "dec",
      "hex",
    ];
    // Parse the source code
    const lines = sourceCode.split("\n");
    const machineCode = [];
    const symbolTable = {};

    let address = 0;
    lines.forEach((element) => {
      if (
        !element ||
        /^\s*$/.test(element) ||
        element.trim().startsWith("//")
      ) {
        return;
      }
      const labelMatch = element.match(/^(?<label>\w+),/);
      if (labelMatch) {
        const label = labelMatch.groups.label;
        symbolTable[label] = address;
      }
      address++;
    });

    console.log("Symbol Table:", symbolTable);
    // Second pass: generate machine code
    let secondPassAddress = 0;
    lines.forEach((element, index) => {
      let opcode;
      let args = 0;
      if (
        !element ||
        /^\s*$/.test(element) ||
        element.trim().startsWith("//")
      ) {
        return;
      }

      // split either by space or comma
      const tokens = element.split(/[\s,]+/).filter(Boolean);
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].startsWith("//")) {
          tokens.splice(i); // Remove everything after the comment
          break;
        }
      }
      if (tokens.length === 0) {
        return; // Skip empty lines
      } else if (
        tokens.length === 1 &&
        instructionsWithArgs.includes(tokens[0])
      ) {
        // If the instruction requires an argument but no argument is provided
        throw new Error(
          `Syntax error: instruction '${tokens[0]}' requires an argument`
        );
      } else if (
        tokens.length > 2 &&
        !instructionsWithArgs.includes(tokens[1])
      ) {
        // If the instruction does not require an argument but one is provided
        throw new Error(
          `Syntax error: instruction '${tokens[1]}' does not accept an argument`
        );
      } else if (
        tokens.length > 2 &&
        instructionsWithArgs.includes(tokens[1])
      ) {
        console.log("Processing tokens:", tokens);
        console.log("Symbol Table:", symbolTable);
        console.log("Symbol Table:", symbolTable[tokens[0]]);

        if (tokens[0] in symbolTable && tokens[2] in symbolTable) {
          opcode = getOpcode(tokens[1]);
          args = symbolTable[tokens[2]];
        } else if (tokens[1] == "dec") {
          opcode = 0;
          args = parseInt(tokens[2], 10);
        } else if (tokens[1] == "hex") {
          opcode = 0;
          args = parseInt(tokens[2], 16);
        } else if (tokens[1] == "skipcond") {
          opcode = getOpcode(tokens[1]);
          args = parseInt(tokens[2], 16); // Shift left by 10 bits for condition
        } else {
          throw new Error(
            `Undefined symbol: '${
              tokens[0] in symbolTable ? tokens[2] : tokens[0]
            }'`
          );
        }
      } else if (tokens.length === 2) {
        if (
          tokens[0] in symbolTable &&
          instructionsWithArgs.includes(tokens[1])
        ) {
          throw new Error(
            `Syntax error: instruction '${tokens[0]}' requires an argument`
          );
        } else if (tokens[0] in symbolTable) {
          opcode = getOpcode(tokens[1]);
          args = 0;
        } else if (
          tokens[1] in symbolTable &&
          instructionsWithArgs.includes(tokens[0])
        ) {
          opcode = getOpcode(tokens[0]);
          args = symbolTable[tokens[1]];
        } else if (!instructionsWithArgs.includes(tokens[0])) {
          throw new Error(
            `Syntax error: instruction '${tokens[0]}' does not accept an argument`
          );
        } else if (tokens[0] == "dec") {
          opcode = 0;
          args = parseInt(tokens[1], 10);
        } else if (tokens[0] == "hex") {
          opcode = 0;
          args = parseInt(tokens[1], 16);
        } else if (tokens[0] == "skipcond") {
          opcode = getOpcode(tokens[0]);
          args = parseInt(tokens[1], 16); // Shift left by 10 bits for condition
        } else {
          throw new Error(`Undefined symbol: '${tokens[1]}'`);
        }
      } else if (tokens.length === 1) {
        if (instructionsWithArgs.includes(tokens[0])) {
          throw new Error(
            `Syntax error: instruction '${tokens[0]}' requires an argument`
          );
        }
        opcode = getOpcode(tokens[0]);
      }

      if (opcode === undefined) {
        throw new Error(`Unknown instruction: ${tokens[0]}`);
      }

      if (opcode === 32768 && args !== 0 && args !== 1024 && args !== 2048) {
        throw new Error(
          `Syntax error: instruction 'skipcond' requires a valid condition`
        );
      }
      let code = opcode + args;
      machineCode.push({ code });
      secondPassAddress++;
    });

    return {
      success: true,
      machineCode,
      symbolTable,
      errors: [],
    };
  } catch (error) {
    return {
      success: false,
      errors: [error.message],
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

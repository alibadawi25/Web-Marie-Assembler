export class MarieSimulator {
  constructor() {
    this.memory = new Array(4096).fill(0); // Store numbers, not strings
    this._AC = 0; // MARIE accumulator
    this._IR = 0; // MARIE instruction register
    this._MAR = 0; // MARIE memory address register
    this._MBR = 0; // MARIE memory buffer register
    this._PC = 0; // MARIE program counter
    this.running = false; // Simulation state
    this.inputBuffer = []; // For handling input operations
    this.outputBuffer = []; // For storing output
  }

  // Helper method to validate 16-bit values
  validateRegisterValue(value, registerName) {
    if (value < 0 || value > 0xffff) {
      throw new Error(
        `${registerName} value ${value} is out of bounds (0-65535)`
      );
    }
    return value & 0xffff; // Ensure 16-bit value
  }

  // Helper method to validate 12-bit addresses
  validateAddress(address) {
    if (address < 0 || address > 0xfff) {
      throw new Error(`Memory address ${address} is out of bounds (0-4095)`);
    }
    return address & 0xfff; // Ensure 12-bit address
  }

  // Getters and setters with validation
  get AC() {
    return this._AC;
  }
  set AC(value) {
    this._AC = this.validateRegisterValue(value, "AC");
  }

  get IR() {
    return this._IR;
  }
  set IR(value) {
    this._IR = this.validateRegisterValue(value, "IR");
  }

  get MAR() {
    return this._MAR;
  }
  set MAR(value) {
    this._MAR = this.validateAddress(value);
  }

  get MBR() {
    return this._MBR;
  }
  set MBR(value) {
    this._MBR = this.validateRegisterValue(value, "MBR");
  }

  get PC() {
    return this._PC;
  }
  set PC(value) {
    this._PC = this.validateAddress(value);
  }

  readMemory(address) {
    address = this.validateAddress(address);
    return this.memory[address];
  }

  writeMemory(address, value) {
    address = this.validateAddress(address);
    value = this.validateRegisterValue(value, "Memory");
    this.memory[address] = value;
  }

  loadProgram(program) {
    this.memory = new Array(4096).fill(0); // Reset memory
    program.forEach((instruction, index) => {
      if (index < this.memory.length) {
        this.memory[index] = instruction;
      }
    });
    this.PC = 0; // Reset program counter
    this.running = true; // Start simulation
    this.outputBuffer = []; // Clear output
  }

  step() {
    if (!this.running) {
      throw new Error("Simulation is not running");
    }

    // Fetch the next instruction
    this.MAR = this.PC;
    this.IR = this.readMemory(this.MAR);
    this.PC++;

    // Decode the instruction
    const opcode = (this.IR >> 12) & 0xf; // Extract upper 4 bits
    const address = this.IR & 0xfff; // Extract lower 12 bits

    // Execute the instruction
    this.executeInstruction(opcode, address);
  }

  executeInstruction(opcode, address) {
    switch (opcode) {
      case 0: // JNS (Jump and Store)
        this.writeMemory(address, this.PC);
        this.PC = address + 1;
        break;
      case 1: // LOAD
        this.AC = this.readMemory(address);
        break;
      case 2: // STORE
        this.writeMemory(address, this.AC);
        break;
      case 3: // ADD
        const addResult = this.AC + this.readMemory(address);
        if (addResult > 0xffff) {
          throw new Error(
            `ADD overflow: result ${addResult} exceeds 16-bit limit`
          );
        }
        this.AC = addResult;
        break;
      case 4: // SUBT (Subtract)
        const subtResult = this.AC - this.readMemory(address);
        if (subtResult < 0) {
          throw new Error(`SUBT underflow: result ${subtResult} is negative`);
        }
        this.AC = subtResult;
        break;
      case 5: // INPUT
        if (this.inputBuffer.length > 0) {
          const inputValue = this.inputBuffer.shift();
          this.AC = this.validateRegisterValue(inputValue, "INPUT");
        } else {
          // Need input - pause execution
          this.PC--; // Go back to retry this instruction
          throw new Error("INPUT_REQUIRED");
        }
        break;
      case 6: // OUTPUT
        this.outputBuffer.push(this.AC);
        console.log("Output:", this.AC);
        break;
      case 7: // HALT
        this.running = false;
        break;
      case 8: // SKIPCOND
        const condition = (address >> 10) & 0x3; // Extract condition bits
        switch (condition) {
          case 0: // Skip if AC < 0
            if (this.AC & 0x8000) this.PC++; // Check sign bit
            break;
          case 1: // Skip if AC = 0
            if (this.AC === 0) this.PC++;
            break;
          case 2: // Skip if AC > 0
            if (this.AC > 0 && !(this.AC & 0x8000)) this.PC++;
            break;
          default:
            throw new Error(`Invalid SKIPCOND condition: ${condition}`);
        }
        break;
      case 9: // JUMP
        this.PC = address;
        break;
      case 10: // CLEAR
        this.AC = 0;
        break;
      case 11: // ADDI (Add Indirect)
        const indirectAddress1 = this.readMemory(address);
        const addiResult = this.AC + this.readMemory(indirectAddress1);
        if (addiResult > 0xffff) {
          throw new Error(
            `ADDI overflow: result ${addiResult} exceeds 16-bit limit`
          );
        }
        this.AC = addiResult;
        break;
      case 12: // JUMPI (Jump Indirect)
        const jumpTarget = this.readMemory(address);
        this.PC = this.validateAddress(jumpTarget);
        break;
      case 13: // LOADI (Load Indirect)
        const indirectAddress2 = this.readMemory(address);
        this.AC = this.readMemory(indirectAddress2);
        break;
      case 14: // STOREI (Store Indirect)
        const indirectAddress3 = this.readMemory(address);
        this.writeMemory(indirectAddress3, this.AC);
        break;
      default:
        throw new Error(`Unknown instruction opcode: ${opcode}`);
    }
  }

  // Helper methods
  setInput(inputValues) {
    // Validate all input values before setting
    const validatedInputs = inputValues.map((value, index) =>
      this.validateRegisterValue(value, `INPUT[${index}]`)
    );
    this.inputBuffer = [...validatedInputs];
  }

  getOutput() {
    return [...this.outputBuffer];
  }

  getState() {
    return {
      AC: this.AC,
      PC: this.PC,
      IR: this.IR,
      MAR: this.MAR,
      MBR: this.MBR,
      running: this.running,
      memory: [...this.memory],
      output: this.getOutput(),
    };
  }

  run() {
    try {
      while (this.running) {
        this.step();
      }
    } catch (error) {
      if (error.message === "INPUT_REQUIRED") {
        console.log("Program paused - input required");
      } else {
        throw error;
      }
    }
  }
}

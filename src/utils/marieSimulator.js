export class MarieSimulator {
  constructor() {
    if (MarieSimulator.instance) {
      return MarieSimulator.instance;
    }

    this.memory = new Uint16Array(4096);
    this._AC = 0;
    this._IR = 0;
    this._MAR = 0;
    this._MBR = 0;
    this._PC = 0;
    this.running = false;
    this.inputBuffer = [];
    this.outputBuffer = [];
    this.outputCallback = null;
    this.errorCallback = null;
    this.inputCallback = null;
    this.onProgramEnd = null;
    this.stepDelay = 100;
    this.onStep = null;
    this.onMicroStep = null;
    this.onDisplayWrite = null; // called with (address, value) when 0xF00–0xFFF is written

    // Snapshot history for step-back (circular buffer, max 50)
    this._history = [];
    this._historyMaxSize = 50;

    // Micro-step queue
    this._microQueue = [];
    this._microPhase = 'idle'; // 'idle' | 'mid-instruction'

    // Memory access tracking
    this._readCounts = new Uint32Array(4096);
    this._writeCounts = new Uint32Array(4096);

    // Execution stats
    this._stats = {
      instructionCount: 0,
      cycleCount: 0,
      memoryReads: 0,
      memoryWrites: 0,
      inputOps: 0,
      outputOps: 0,
    };

    // Breakpoints: set of PC addresses (not line numbers)
    this.breakpointAddresses = new Set();
    this.onBreakpointHit = null;

    MarieSimulator.instance = this;
  }

  static getInstance() {
    if (!MarieSimulator.instance) {
      MarieSimulator.instance = new MarieSimulator();
    }
    return MarieSimulator.instance;
  }

  reset() {
    this.memory = new Uint16Array(4096);
    this._AC = 0;
    this._IR = 0;
    this._MAR = 0;
    this._MBR = 0;
    this._PC = 0;
    this.running = false;
    this.inputBuffer = [];
    this.outputBuffer = [];
    this.outputCallback = null;
    this.inputCallback = null;
    this.onProgramEnd = null;
    this.onStep = null;
    this.onMicroStep = null;
    this.onDisplayWrite = null;
    this._history = [];
    this._microQueue = [];
    this._microPhase = 'idle';
    this._readCounts = new Uint32Array(4096);
    this._writeCounts = new Uint32Array(4096);
    this._stats = { instructionCount: 0, cycleCount: 0, memoryReads: 0, memoryWrites: 0, inputOps: 0, outputOps: 0 };
  }

  // ─── Validation ────────────────────────────────────────────────────────────

  validateRegisterValue(value) {
    return ((value % 0x10000) + 0x10000) % 0x10000;
  }

  validateAddress(address) {
    if (address < 0 || address > 0xfff) {
      throw new Error(`Memory address ${address} is out of bounds (0-4095)`);
    }
    return address & 0xfff;
  }

  // ─── Register accessors ────────────────────────────────────────────────────

  get AC() { return this._AC; }
  set AC(value) { this._AC = this.validateRegisterValue(value); }

  get IR() { return this._IR; }
  set IR(value) { this._IR = this.validateRegisterValue(value); }

  get MAR() { return this._MAR; }
  set MAR(value) { this._MAR = this.validateAddress(value); }

  get MBR() { return this._MBR; }
  set MBR(value) { this._MBR = this.validateRegisterValue(value); }

  get PC() { return this._PC; }
  set PC(value) { this._PC = this.validateAddress(value); }

  // ─── Memory ────────────────────────────────────────────────────────────────

  readMemory(address) {
    address = this.validateAddress(address);
    this._readCounts[address]++;
    this._stats.memoryReads++;
    return this.memory[address];
  }

  writeMemory(address, value) {
    address = this.validateAddress(address);
    value = this.validateRegisterValue(value);
    this._writeCounts[address]++;
    this._stats.memoryWrites++;
    this.memory[address] = value;
    if (address >= 0xf00 && this.onDisplayWrite) {
      this.onDisplayWrite(address, value);
    }
  }

  // ─── Snapshot / Rewind ────────────────────────────────────────────────────

  _captureRegisters() {
    return { AC: this._AC, PC: this._PC, IR: this._IR, MAR: this._MAR, MBR: this._MBR };
  }

  _pushSnapshot() {
    const snapshot = {
      registers: this._captureRegisters(),
      memory: new Uint16Array(this.memory),
      inputBuffer: [...this.inputBuffer],
      outputBuffer: [...this.outputBuffer],
    };
    this._history.push(snapshot);
    if (this._history.length > this._historyMaxSize) {
      this._history.shift();
    }
  }

  stepBack() {
    if (this._history.length === 0) return false;
    const snap = this._history.pop();
    this._AC = snap.registers.AC;
    this._PC = snap.registers.PC;
    this._IR = snap.registers.IR;
    this._MAR = snap.registers.MAR;
    this._MBR = snap.registers.MBR;
    this.memory.set(snap.memory);
    this.inputBuffer = [...snap.inputBuffer];
    this.outputBuffer = [...snap.outputBuffer];
    this.running = true;
    this._microQueue = [];
    this._microPhase = 'idle';
    if (this.onStep) this.onStep(this._captureRegisters());
    return true;
  }

  get canStepBack() {
    return this._history.length > 0;
  }

  // ─── Load program ──────────────────────────────────────────────────────────

  loadProgram(program, startAddress = 0) {
    this.memory = new Uint16Array(4096);
    this._AC = 0;
    this._IR = 0;
    this._MAR = 0;
    this._MBR = 0;
    this.inputBuffer = [];
    this.outputBuffer = [];
    this._history = [];
    this._microQueue = [];
    this._microPhase = 'idle';
    this._readCounts = new Uint32Array(4096);
    this._writeCounts = new Uint32Array(4096);
    this._stats = { instructionCount: 0, cycleCount: 0, memoryReads: 0, memoryWrites: 0, inputOps: 0, outputOps: 0 };

    program.forEach((instruction, index) => {
      const addr = startAddress + index;
      if (addr < this.memory.length) {
        this.memory[addr] = instruction;
      }
    });
    this.PC = startAddress;
    this.running = true;
  }

  // ─── Micro-step execution ─────────────────────────────────────────────────

  _hex(address) {
    return `0x${address.toString(16).toUpperCase().padStart(3, '0')}`;
  }

  _buildExecuteOps(opcode, address) {
    const h = this._hex(address);
    switch (opcode) {
      case 0: // JNS
        return [
          { phase: 'execute', description: `MAR ← ${h}`, changedRegisters: ['MAR'], apply: (s) => { s._MAR = address; } },
          { phase: 'execute', description: 'MBR ← PC', changedRegisters: ['MBR'], apply: (s) => { s._MBR = s._PC; } },
          { phase: 'execute', description: 'M[MAR] ← MBR', changedRegisters: [], apply: (s) => { s.memory[s._MAR] = s._MBR; s._writeCounts[s._MAR]++; s._stats.memoryWrites++; } },
          { phase: 'execute', description: `PC ← ${h} + 1`, changedRegisters: ['PC'], apply: (s) => { s._PC = (address + 1) & 0xfff; } },
        ];
      case 1: // LOAD
        return [
          { phase: 'execute', description: `MAR ← ${h}`, changedRegisters: ['MAR'], apply: (s) => { s._MAR = address; } },
          { phase: 'execute', description: 'MBR ← M[MAR]', changedRegisters: ['MBR'], apply: (s) => { s._MBR = s.memory[s._MAR]; s._readCounts[s._MAR]++; s._stats.memoryReads++; } },
          { phase: 'execute', description: 'AC ← MBR', changedRegisters: ['AC'], apply: (s) => { s._AC = s._MBR; } },
        ];
      case 2: // STORE
        return [
          { phase: 'execute', description: `MAR ← ${h}`, changedRegisters: ['MAR'], apply: (s) => { s._MAR = address; } },
          { phase: 'execute', description: 'MBR ← AC', changedRegisters: ['MBR'], apply: (s) => { s._MBR = s._AC; } },
          { phase: 'execute', description: 'M[MAR] ← MBR', changedRegisters: [], apply: (s) => { s.memory[s._MAR] = s._MBR; s._writeCounts[s._MAR]++; s._stats.memoryWrites++; } },
        ];
      case 3: // ADD
        return [
          { phase: 'execute', description: `MAR ← ${h}`, changedRegisters: ['MAR'], apply: (s) => { s._MAR = address; } },
          { phase: 'execute', description: 'MBR ← M[MAR]', changedRegisters: ['MBR'], apply: (s) => { s._MBR = s.memory[s._MAR]; s._readCounts[s._MAR]++; s._stats.memoryReads++; } },
          { phase: 'execute', description: 'AC ← AC + MBR', changedRegisters: ['AC'], apply: (s) => { s._AC = s.validateRegisterValue(s._AC + s._MBR); } },
        ];
      case 4: // SUBT
        return [
          { phase: 'execute', description: `MAR ← ${h}`, changedRegisters: ['MAR'], apply: (s) => { s._MAR = address; } },
          { phase: 'execute', description: 'MBR ← M[MAR]', changedRegisters: ['MBR'], apply: (s) => { s._MBR = s.memory[s._MAR]; s._readCounts[s._MAR]++; s._stats.memoryReads++; } },
          { phase: 'execute', description: 'AC ← AC − MBR', changedRegisters: ['AC'], apply: (s) => { s._AC = s.validateRegisterValue(s._AC - s._MBR); } },
        ];
      case 5: // INPUT
        return [
          { phase: 'execute', description: 'AC ← IN', changedRegisters: ['AC'], apply: (s) => {
            if (s.inputBuffer.length > 0) {
              s._AC = s.validateRegisterValue(s.inputBuffer.shift());
              s._stats.inputOps++;
            } else {
              s._PC = (s._PC - 1 + 0x1000) & 0xfff;
              s.pause();
              if (s.inputCallback) s.inputCallback();
            }
          }},
        ];
      case 6: // OUTPUT
        return [
          { phase: 'execute', description: 'OUT ← AC', changedRegisters: [], apply: (s) => {
            if (s.outputCallback) s.outputCallback(s._AC);
            s.outputBuffer.push(s._AC);
            s._stats.outputOps++;
          }},
        ];
      case 7: // HALT
        return [
          { phase: 'execute', description: 'Halt', changedRegisters: [], apply: (s) => {
            s.running = false;
            if (s.onProgramEnd) s.onProgramEnd();
          }},
        ];
      case 8: // SKIPCOND
        return [
          { phase: 'execute', description: `SKIPCOND ${h}`, changedRegisters: ['PC'], apply: (s) => {
            const condition = (address >> 10) & 0x3;
            let skip = false;
            if (condition === 0) skip = !!(s._AC & 0x8000);
            else if (condition === 1) skip = s._AC === 0;
            else if (condition === 2) skip = s._AC > 0 && !(s._AC & 0x8000);
            if (skip) s._PC = (s._PC + 1) & 0xfff;
          }},
        ];
      case 9: // JUMP
        return [
          { phase: 'execute', description: `PC ← ${h}`, changedRegisters: ['PC'], apply: (s) => { s._PC = address; } },
        ];
      case 10: // CLEAR / LOADIMMI (address field is the immediate value; CLEAR = LOADIMMI 0)
        return [
          { phase: 'execute', description: `AC ← ${address}`, changedRegisters: ['AC'], apply: (s) => { s._AC = address; } },
        ];
      case 11: // ADDI
        return [
          { phase: 'execute', description: `MAR ← ${h}`, changedRegisters: ['MAR'], apply: (s) => { s._MAR = address; } },
          { phase: 'execute', description: 'MBR ← M[MAR]', changedRegisters: ['MBR'], apply: (s) => { s._MBR = s.memory[s._MAR]; s._readCounts[s._MAR]++; s._stats.memoryReads++; } },
          { phase: 'execute', description: 'MAR ← MBR', changedRegisters: ['MAR'], apply: (s) => { s._MAR = s._MBR & 0xfff; } },
          { phase: 'execute', description: 'MBR ← M[MAR]', changedRegisters: ['MBR'], apply: (s) => { s._MBR = s.memory[s._MAR]; s._readCounts[s._MAR]++; s._stats.memoryReads++; } },
          { phase: 'execute', description: 'AC ← AC + MBR', changedRegisters: ['AC'], apply: (s) => { s._AC = s.validateRegisterValue(s._AC + s._MBR); } },
        ];
      case 12: // JUMPI
        return [
          { phase: 'execute', description: `MAR ← ${h}`, changedRegisters: ['MAR'], apply: (s) => { s._MAR = address; } },
          { phase: 'execute', description: 'MBR ← M[MAR]', changedRegisters: ['MBR'], apply: (s) => { s._MBR = s.memory[s._MAR]; s._readCounts[s._MAR]++; s._stats.memoryReads++; } },
          { phase: 'execute', description: 'PC ← MBR', changedRegisters: ['PC'], apply: (s) => { s._PC = s._MBR & 0xfff; } },
        ];
      case 13: // LOADI
        return [
          { phase: 'execute', description: `MAR ← ${h}`, changedRegisters: ['MAR'], apply: (s) => { s._MAR = address; } },
          { phase: 'execute', description: 'MBR ← M[MAR]', changedRegisters: ['MBR'], apply: (s) => { s._MBR = s.memory[s._MAR]; s._readCounts[s._MAR]++; s._stats.memoryReads++; } },
          { phase: 'execute', description: 'MAR ← MBR', changedRegisters: ['MAR'], apply: (s) => { s._MAR = s._MBR & 0xfff; } },
          { phase: 'execute', description: 'MBR ← M[MAR]', changedRegisters: ['MBR'], apply: (s) => { s._MBR = s.memory[s._MAR]; s._readCounts[s._MAR]++; s._stats.memoryReads++; } },
          { phase: 'execute', description: 'AC ← MBR', changedRegisters: ['AC'], apply: (s) => { s._AC = s._MBR; } },
        ];
      case 14: // STOREI
        return [
          { phase: 'execute', description: `MAR ← ${h}`, changedRegisters: ['MAR'], apply: (s) => { s._MAR = address; } },
          { phase: 'execute', description: 'MBR ← M[MAR]', changedRegisters: ['MBR'], apply: (s) => { s._MBR = s.memory[s._MAR]; s._readCounts[s._MAR]++; s._stats.memoryReads++; } },
          { phase: 'execute', description: 'MAR ← MBR', changedRegisters: ['MAR'], apply: (s) => { s._MAR = s._MBR & 0xfff; } },
          { phase: 'execute', description: 'MBR ← AC', changedRegisters: ['MBR'], apply: (s) => { s._MBR = s._AC; } },
          { phase: 'execute', description: 'M[MAR] ← MBR', changedRegisters: [], apply: (s) => { s.memory[s._MAR] = s._MBR; s._writeCounts[s._MAR]++; s._stats.memoryWrites++; } },
        ];
      default:
        return [
          { phase: 'execute', description: `Unknown opcode ${opcode}`, changedRegisters: [], apply: () => { throw new Error(`Unknown instruction opcode: ${opcode}`); } },
        ];
    }
  }

  _buildMicroOps(opcode, address) {
    const fetchOps = [
      { phase: 'fetch', description: 'MAR ← PC', changedRegisters: ['MAR'], apply: (s) => { s._MAR = s._PC; } },
      { phase: 'fetch', description: 'MBR ← M[MAR]', changedRegisters: ['MBR'], apply: (s) => { s._MBR = s.memory[s._MAR]; s._readCounts[s._MAR]++; s._stats.memoryReads++; } },
      { phase: 'fetch', description: 'IR ← MBR', changedRegisters: ['IR'], apply: (s) => { s._IR = s._MBR; } },
      { phase: 'fetch', description: 'PC ← PC + 1', changedRegisters: ['PC'], apply: (s) => { s._PC = (s._PC + 1) & 0xfff; } },
    ];

    const decodeOp = {
      phase: 'decode',
      description: `Decode: opcode=0x${opcode.toString(16).toUpperCase()}, addr=${this._hex(address)}`,
      changedRegisters: [],
      apply: () => {},
    };

    const executeOps = this._buildExecuteOps(opcode, address);
    return [...fetchOps, decodeOp, ...executeOps];
  }

  stepMicro() {
    if (!this.running) {
      throw new Error('Simulation is not running');
    }

    if (this._microPhase === 'idle') {
      this._pushSnapshot();
      const ir = this.memory[this._PC];
      const opcode = (ir >> 12) & 0xf;
      const address = ir & 0xfff;
      this._microQueue = this._buildMicroOps(opcode, address);
      this._microPhase = 'mid-instruction';
    }

    if (this._microQueue.length === 0) {
      this._microPhase = 'idle';
      return;
    }

    const op = this._microQueue.shift();
    op.apply(this);
    this._stats.cycleCount++;

    if (this.onMicroStep) {
      this.onMicroStep(op, this._captureRegisters());
    }

    if (this._microQueue.length === 0) {
      this._microPhase = 'idle';
      this._stats.instructionCount++;
      if (this.onStep) this.onStep(this._captureRegisters());
    }
  }

  get isMidInstruction() {
    return this._microPhase === 'mid-instruction';
  }

  // ─── Standard step ────────────────────────────────────────────────────────

  step() {
    if (!this.running) {
      throw new Error('Simulation is not running');
    }

    this._pushSnapshot();

    // Fetch
    this._MAR = this._PC;
    this._MBR = this.memory[this._MAR];
    this._readCounts[this._MAR]++;
    this._stats.memoryReads++;
    this._IR = this._MBR;
    this._PC = (this._PC + 1) & 0xfff;

    // Decode
    const opcode = (this._IR >> 12) & 0xf;
    const address = this._IR & 0xfff;

    // Execute
    this.executeInstruction(opcode, address);

    this._stats.instructionCount++;
    this._stats.cycleCount += (4 + this._buildExecuteOps(opcode, address).length);

    if (this.onStep) {
      this.onStep(this._captureRegisters());
    }
  }

  executeInstruction(opcode, address) {
    switch (opcode) {
      case 0: // JNS
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
        this.AC = this.validateRegisterValue(this.AC + this.readMemory(address));
        break;
      case 4: // SUBT
        this.AC = this.validateRegisterValue(this.AC - this.readMemory(address));
        break;
      case 5: // INPUT
        if (this.inputBuffer.length > 0) {
          this.AC = this.validateRegisterValue(this.inputBuffer.shift());
          this._stats.inputOps++;
        } else {
          this.PC--;
          this.pause();
          if (this.inputCallback) this.inputCallback();
        }
        break;
      case 6: // OUTPUT
        if (this.outputCallback) this.outputCallback(this.AC);
        this.outputBuffer.push(this.AC);
        this._stats.outputOps++;
        break;
      case 7: // HALT
        this.running = false;
        if (this.onProgramEnd) this.onProgramEnd();
        break;
      case 8: // SKIPCOND
        {
          const condition = (address >> 10) & 0x3;
          switch (condition) {
            case 0:
              if (this.AC & 0x8000) this.PC++;
              break;
            case 1:
              if (this.AC === 0) this.PC++;
              break;
            case 2:
              if (this.AC > 0 && !(this.AC & 0x8000)) this.PC++;
              break;
            default:
              throw new Error(`Invalid SKIPCOND condition: ${condition}`);
          }
        }
        break;
      case 9: // JUMP
        this.PC = address;
        break;
      case 10: // CLEAR / LOADIMMI
        this.AC = address;
        break;
      case 11: // ADDI
        {
          const ind1 = this.readMemory(address);
          this.AC = this.validateRegisterValue(this.AC + this.readMemory(ind1));
        }
        break;
      case 12: // JUMPI
        this.PC = this.validateAddress(this.readMemory(address));
        break;
      case 13: // LOADI
        this.AC = this.readMemory(this.readMemory(address));
        break;
      case 14: // STOREI
        this.writeMemory(this.readMemory(address), this.AC);
        break;
      default:
        throw new Error(`Unknown instruction opcode: ${opcode}`);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  setInput(inputValues) {
    try {
      const validated = inputValues.map((v) => this.validateRegisterValue(v));
      this.inputBuffer = [...validated];
      return { success: true };
    } catch (error) {
      if (this.errorCallback) this.errorCallback(error);
      return { success: false, error };
    }
  }

  setDelay(delay) {
    if (typeof delay !== 'number' || delay < 0) {
      throw new Error('Delay must be a non-negative number');
    }
    this.stepDelay = delay;
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
      memory: Array.from(this.memory),
      output: this.getOutput(),
    };
  }

  getStats() {
    return { ...this._stats };
  }

  getAccessCounts() {
    return {
      reads: new Uint32Array(this._readCounts),
      writes: new Uint32Array(this._writeCounts),
    };
  }

  // ─── Run loop ─────────────────────────────────────────────────────────────

  run() {
    const stepLoop = () => {
      if (!this.running) return;

      // Check breakpoint before executing the instruction at current PC
      if (this.breakpointAddresses.size > 0 && this.breakpointAddresses.has(this._PC)) {
        this.pause();
        if (this.onBreakpointHit) this.onBreakpointHit(this._PC);
        return;
      }

      try {
        this.step();
        if (this.running) {
          setTimeout(stepLoop, this.stepDelay);
        }
      } catch (error) {
        this.running = false;
        if (this.errorCallback) this.errorCallback(error);
      }
    };
    stepLoop();
  }

  pause() {
    this.running = false;
  }

  resume() {
    if (this.running) return;
    this.running = true;
    this.run();
  }

  stop() {
    this.running = false;
    if (this.onProgramEnd) this.onProgramEnd();
  }
}

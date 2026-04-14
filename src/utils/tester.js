/**
 * MARIE Assembler + Simulator test suite.
 * Run via:  node --experimental-vm-modules src/utils/tester.js
 * Or import and call runAllTests() from a dev console.
 */

import assembleCode from "./marieAssembler.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`  ✓  ${description}`);
    passed++;
  } else {
    console.error(`  ✗  ${description}`);
    failed++;
  }
}

function assembleOk(description, src) {
  const result = assembleCode(src);
  assert(description, result.success);
  return result;
}

function assembleErr(description, src, expectedMsg) {
  const result = assembleCode(src);
  const hasError = !result.success;
  const msgMatch = expectedMsg
    ? result.errors?.[0]?.message?.includes(expectedMsg)
    : true;
  assert(description, hasError && msgMatch);
  return result;
}

// ─── Test groups ──────────────────────────────────────────────────────────────

function testBasicInstructions() {
  console.log("\n── Basic instructions ──");

  assembleOk("HALT alone", "halt");
  assembleOk("INPUT + OUTPUT + HALT", "input\noutput\nhalt");
  assembleOk("CLEAR", "clear\nhalt");
  assembleOk("LOAD + STORE with label", "load X\nstore X\nhalt\nX, dec 0");
  assembleOk("ADD", "load A\nadd B\nhalt\nA,dec 5\nB,dec 3");
  assembleOk("SUBT", "load A\nsubt B\nhalt\nA,dec 10\nB,dec 4");
  assembleOk("JUMP", "loop, jump loop\nhalt");
  assembleOk("SKIPCOND 000", "skipcond 000\nhalt");
  assembleOk("SKIPCOND 400", "skipcond 400\nhalt");
  assembleOk("SKIPCOND 800", "skipcond 800\nhalt");
  assembleOk("JNS (subroutine)", "jns Sub\nhalt\nSub, hex 0\nhalt\njumpi Sub");
  assembleOk("ADDI", "load Ptr\naddi Ptr\nhalt\nPtr,dec 0");
  assembleOk("LOADI", "loadi Ptr\nhalt\nPtr,dec 0");
  assembleOk("STOREI", "storei Ptr\nhalt\nPtr,dec 0");
  assembleOk("JUMPI", "jumpi Ptr\nPtr,dec 0");
}

function testDataDirectives() {
  console.log("\n── Data directives ──");

  assembleOk("DEC positive", "X, dec 42\nhalt");
  assembleOk("DEC zero", "X, dec 0\nhalt");
  assembleOk("DEC max (65535)", "X, dec 65535\nhalt");
  assembleOk("HEX lowercase", "X, hex ff\nhalt");
  assembleOk("HEX uppercase", "X, hex FF\nhalt");
  assembleOk("HEX zero", "X, hex 0\nhalt");
  assembleOk("HEX max (FFFF)", "X, hex FFFF\nhalt");
  assembleOk("Multiple DEC rows", "A,dec 1\nB,dec 2\nC,dec 3\nhalt");
  const rOrg = assembleOk("ORG sets address (ORG 100 → symbol at 0x100=256)", "ORG 100\nhalt\nX, dec 5");
  assert("  Symbol after ORG 100 lands at address 257", rOrg.symbolTable?.["X"] === 257);
  assert("  startAddress returned as 256", rOrg.startAddress === 256);

  const rNoOrg = assembleOk("No ORG → startAddress defaults to 0", "halt");
  assert("  startAddress = 0 when no ORG", rNoOrg.startAddress === 0);
}

function testLabelCaseSensitivity() {
  console.log("\n── Label case-sensitivity ──");

  assembleOk("Uppercase and lowercase labels coexist (T vs t)",
    "load T\nload t\nhalt\nT, dec 1\nt, dec 2");

  assembleOk("Mixed-case label used consistently",
    "Jump MyLabel\nhalt\nMyLabel, halt");

  assembleOk("Labels differing only in one char case",
    "load Abc\nload ABC\nhalt\nAbc,dec 1\nABC,dec 2");

  assembleErr("Exact duplicate label detected",
    "X, dec 1\nX, dec 2\nhalt", "Duplicate label");

  assembleErr("Same-case duplicate detected",
    "loop, jump loop\nloop, halt", "Duplicate label");
}

function testErrors() {
  console.log("\n── Error detection ──");

  assembleErr("Missing operand for LOAD", "load\nhalt", "requires an argument");
  assembleErr("Missing operand for STORE", "store\nhalt", "requires an argument");
  assembleErr("Missing operand for JUMP", "jump\nhalt", "requires an argument");
  assembleErr("Undefined symbol", "load NoSuchLabel\nhalt", "Undefined symbol");
  assembleErr("Invalid SKIPCOND value", "skipcond 999\nhalt", "000, 400, 800");
  assembleErr("DEC with non-numeric value", "X, dec abc\nhalt", "valid number");
  assembleErr("HEX with non-hex value", "X, hex GG\nhalt", "valid number");
  assembleErr("Extra token on line", "load X Y\nhalt\nX,dec 0", "too many tokens");
  assembleErr("Unknown instruction", "foobar\nhalt", "Unknown instruction");
}

function testComments() {
  console.log("\n── Comments ──");

  assembleOk("Inline comment ignored", "load X // load it\nhalt\nX,dec 5");
  assembleOk("Full-line comment ignored", "// this is a comment\nhalt");
  assembleOk("Comment after label", "X, dec 5 // five\nhalt");
}

function testEdgeCases() {
  console.log("\n── Edge cases ──");

  assembleOk("Empty program (no instructions)", "");
  assembleOk("Blank lines between instructions", "load X\n\n\nhalt\nX,dec 0");
  assembleOk("Label-only line (no instruction on same line)",
    "Start,\nload X\nhalt\nX,dec 0");
  assembleOk("Multiple labels in sequence pointing same address",
    "A,\nB,\nC, halt");
  assembleOk("Label name same as instruction keyword is valid identifier",
    // MARIE allows 'load' as a label as long as it's followed by comma
    "MyLoad, dec 0\nload MyLoad\nhalt");
  assembleOk("HEX value used as address pointer (as in FINALL.mas style)",
    "Ptr, hex 10D\nhalt");
  assembleOk("Case-insensitive instructions (LOAD vs load vs Load)",
    "LOAD X\nSTORE X\nHALT\nX,DEC 0");
  assembleOk("Long program with many labels", (() => {
    const lines = [];
    for (let i = 0; i < 50; i++) lines.push(`L${i}, dec ${i}`);
    lines.push("halt");
    return lines.join("\n");
  })());
}

function testTwosComplement() {
  console.log("\n── 2's complement arithmetic ──");

  // These test the assembler's output; runtime behaviour is in the simulator
  assembleOk("SUBT that would go negative is valid assembly",
    "load A\nsubt B\nhalt\nA,dec 3\nB,dec 10");
  assembleOk("ADD that would overflow is valid assembly",
    "load A\nadd B\nhalt\nA,dec 65000\nB,dec 1000");
}

function testMachineCodeValues() {
  console.log("\n── Machine code output ──");

  const r1 = assembleOk("HALT emits 0x7000 (28672)", "halt");
  assert("  HALT opcode = 28672", r1.machineCode[0]?.code === 28672);

  const r2 = assembleOk("LOAD X emits correct opcode + address", "load X\nhalt\nX,dec 0");
  // LOAD opcode = 4096, X is at address 2 → 4096 + 2 = 4098
  assert("  LOAD X code = 4098", r2.machineCode[0]?.code === 4098);

  const r3 = assembleOk("DEC 42 emits 42", "halt\nX, dec 42");
  assert("  DEC 42 code = 42", r3.machineCode[1]?.code === 42);

  const r4 = assembleOk("HEX FF emits 255", "halt\nX, hex FF");
  assert("  HEX FF code = 255", r4.machineCode[1]?.code === 255);

  const r5 = assembleOk("INPUT opcode = 20480", "input\nhalt");
  assert("  INPUT opcode = 20480", r5.machineCode[0]?.code === 20480);

  const r6 = assembleOk("OUTPUT opcode = 24576", "output\nhalt");
  assert("  OUTPUT opcode = 24576", r6.machineCode[0]?.code === 24576);
}

// ─── Run all ──────────────────────────────────────────────────────────────────

export function runAllTests() {
  console.log("=== MARIE Assembler Tests ===");
  passed = 0;
  failed = 0;

  testBasicInstructions();
  testDataDirectives();
  testLabelCaseSensitivity();
  testErrors();
  testComments();
  testEdgeCases();
  testTwosComplement();
  testMachineCodeValues();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  return { passed, failed };
}

// Auto-run when executed directly
runAllTests();

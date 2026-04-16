export const DEFAULT_CODE = "// Your code here";

export const STORAGE_KEYS = {
  source: "web-marie-assembler.source",
  fileName: "web-marie-assembler.fileName",
  projectName: "web-marie-assembler.projectName",
  recentProjects: "web-marie-assembler.recentProjects",
};

export const INSTRUCTIONS_WITH_ARGS = [
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
];

export const LABEL_REF_INSTRUCTIONS = new Set([
  "load",
  "store",
  "add",
  "subt",
  "jump",
  "addi",
  "jumpi",
  "loadi",
  "storei",
  "jns",
]);

export const ALL_INSTRUCTIONS_WITH_INLINE_ARGS = new Set([
  ...INSTRUCTIONS_WITH_ARGS,
  "dec",
  "hex",
]);

export const REGISTER_ORDER = [
  { name: "AC", signed: true },
  { name: "PC", signed: false },
  { name: "IR", signed: false },
  { name: "MAR", signed: false },
  { name: "MBR", signed: false },
];

export const SPEED_OPTIONS = [
  { label: "Instant (0ms)", value: 0 },
  { label: "Fast (100ms)", value: 100 },
  { label: "Normal (300ms)", value: 300 },
  { label: "Slow (600ms)", value: 600 },
  { label: "Step (1s)", value: 1000 },
];

export const OUTPUT_MODE_ITEMS = [
  { key: "dec", label: "Decimal" },
  { key: "hex", label: "Hex" },
  { key: "bin", label: "Binary" },
  { key: "unicode", label: "Unicode" },
];

export const INPUT_TYPE_ITEMS = [
  { key: "dec", label: "Dec" },
  { key: "hex", label: "Hex" },
  { key: "bin", label: "Bin" },
  { key: "unicode", label: "Unicode" },
];

export const GENERATOR_TYPE_CARDS = [
  { key: "if-condition", name: "If / Else", desc: "Compare two values, branch on result" },
  { key: "loop", name: "Loop", desc: "Repeat a block N times" },
  { key: "subroutine", name: "Subroutine", desc: "JNS function stub with return" },
  { key: "variable", name: "Variable", desc: "Declare a DEC or HEX memory value" },
];

export const CONDITION_OPTIONS = ["==", "!=", "<", "<=", ">", ">="].map((op) => ({
  label: op,
  value: op,
}));

export const VARIABLE_TYPE_OPTIONS = [
  { label: "DEC", value: "dec" },
  { label: "HEX", value: "hex" },
];

export const EDITOR_OPTIONS = {
  fontSize: 15,
  minimap: { enabled: false },
  lineNumbersMinChars: 3,
  padding: { top: 12 },
  scrollBeyondLastLine: false,
};

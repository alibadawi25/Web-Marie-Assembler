# Web MARIE Assembler & Simulator

A browser-based assembler and simulator for the MARIE (Machine Architecture that is Really Intuitive and Easy) architecture, built for students learning computer organisation and assembly programming.

---

## Features

### Editor
- Monaco Editor (VS Code core) with MARIE syntax highlighting, autocomplete, and inline error markers
- Real-time syntax checking as you type — errors highlighted before you assemble
- Right-click → **Generate Code** to insert if-condition templates with proper jump logic
- Project name editing, file load/save, and recent-projects history (up to 6)

### Toolbar
- Two-row layout: file management on top, execution controls on the bottom
- Speed control: **slider** on wide screens, **dropdown presets** (Instant / Fast / Normal / Slow / Step) on narrow screens
- Output format toggle: Decimal · Hex · Binary · Unicode
- Keyboard shortcuts shown inline on buttons

### Execution
- Assemble → Run/Stop with live status badges
- Configurable step delay (0 – 1000 ms)
- INPUT instruction triggers a modal — supports Dec, Hex, Bin, Unicode input types
- Unicode output mode renders as a continuous text block (newlines display as real line breaks)

### Output panel
- Drag the handle at the top of the panel to resize it (80 – 600 px)
- Numbered output lines in Dec / Hex / Bin modes; flowing `<pre>` block in Unicode mode
- Running / Assembled status indicators with animated pulse

### Responsiveness
- All controls visible at every width down to ~375 px
- Keyboard shortcut badges hidden on very small screens to save space
- File chip hidden below 680 px (filename still editable via project input)

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+S` | Save file |
| `Ctrl+O` | Load / open file |
| `Ctrl+Enter` | Assemble |
| `Ctrl+F` | Find in editor |
| `F5` | Run |
| `Shift+F5` | Stop |

---

## MARIE Architecture

### Registers

| Register | Size | Purpose |
|---|---|---|
| AC | 16-bit | Accumulator — primary arithmetic register |
| IR | 16-bit | Instruction register |
| MAR | 12-bit | Memory address register |
| MBR | 16-bit | Memory buffer register |
| PC | 12-bit | Program counter |

### Memory

- **4096 words** (12-bit addressing), **16 bits** per word
- Direct and indirect addressing modes
- 2's complement arithmetic — negative SUBT results wrap correctly

### Instruction Set

| Instruction | Opcode | Description |
|---|---|---|
| `JNS addr` | 0x0 | Jump and store return address |
| `LOAD addr` | 0x1 | Load memory → AC |
| `STORE addr` | 0x2 | AC → memory |
| `ADD addr` | 0x3 | AC += memory (wraps 2's complement) |
| `SUBT addr` | 0x4 | AC -= memory (wraps 2's complement) |
| `INPUT` | 0x5 | Read input → AC |
| `OUTPUT` | 0x6 | AC → output |
| `HALT` | 0x7 | Stop execution |
| `SKIPCOND cond` | 0x8 | Skip next if condition met (000/400/800) |
| `JUMP addr` | 0x9 | Unconditional jump |
| `CLEAR` | 0xA | AC = 0 |
| `ADDI addr` | 0xB | AC += memory[memory[addr]] |
| `JUMPI addr` | 0xC | PC = memory[addr] |
| `LOADI addr` | 0xD | AC = memory[memory[addr]] |
| `STOREI addr` | 0xE | memory[memory[addr]] = AC |

**SKIPCOND conditions:** `000` skip if AC < 0 · `400` skip if AC = 0 · `800` skip if AC > 0

### Directives

| Directive | Example | Notes |
|---|---|---|
| `DEC n` | `x, DEC 42` | Declare signed decimal word |
| `HEX n` | `y, HEX 2A` | Declare hex word |
| `ORG addr` | `ORG 100` | Set load address (hex) — PC starts here |

---

## Assembler Correctness

- **Labels are case-sensitive** — `T` and `t` are distinct identifiers (matches the original MARIE spec)
- **Instructions are case-insensitive** — `LOAD`, `load`, `Load` all work
- **`ORG` support** — sets the memory load address; the simulator starts PC at that address so hardcoded pointer values in data sections line up correctly
- **2's complement arithmetic** — `SUBT` and `ADD` wrap mod 2¹⁶ instead of throwing; `SKIPCOND 000` correctly detects negative results via the sign bit

---

## Assembly Syntax

```
[LABEL,] INSTRUCTION [OPERAND]   // optional comment
```

```assembly
// Add two numbers
ORG 100
        LOAD   X
        ADD    Y
        STORE  Result
        OUTPUT
        HALT

X,      DEC 15
Y,      DEC 25
Result, DEC 0
```

```assembly
// Print "Hi" in unicode mode
        LOAD   H
        OUTPUT
        LOAD   i
        OUTPUT
        HALT

H, HEX 48   // 'H'
i, HEX 69   // 'i'
```

---

## Getting Started

```bash
git clone https://github.com/alibadawi25/Web-Marie-Assembler.git
cd Web-Marie-Assembler
npm install
npm run dev
```

Open `http://localhost:5173`.

```bash
npm run build   # production build
npm run preview # preview production build
```

---

## Testing

```bash
node --experimental-vm-modules src/utils/tester.js
```

67 tests covering: all instructions, data directives, ORG, case-sensitive labels, 2's complement arithmetic, error detection, comments, edge cases, and machine code output values.

---

## Project Structure

```
src/
├── components/
│   ├── CodeEditor.jsx      # Main editor + toolbar + terminal
│   └── CodeEditor.css
├── pages/
│   └── TutorialPage.jsx    # Interactive tutorial with missions & quiz
├── utils/
│   ├── marieAssembler.js   # Two-pass assembler
│   ├── marieSimulator.js   # Fetch-decode-execute simulator
│   └── tester.js           # Test suite
├── App.jsx
└── main.jsx
public/
└── favicon.svg             # Brand icon (matches in-app M mark)
```

---

## Tech Stack

- **React 19** with hooks
- **Monaco Editor** — VS Code editor core
- **Ant Design** — UI components
- **Vite** — build tool

---

## Acknowledgments

MARIE architecture by Linda Null and Julia Lobur. Monaco Editor by Microsoft. UI components by Ant Design.

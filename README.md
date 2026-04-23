# MARIE Assembler & Simulator

A feature-rich, browser-based assembler and simulator for the **MARIE** (Machine Architecture that is Really Intuitive and Easy) educational computer architecture. Built to surpass the reference implementation at [marie.js.org](https://marie.js.org).

---

## What's New (v3)

### UX & Layout

| Change | Detail |
|---|---|
| **Focus / Advanced mode** | Toolbar toggle persisted in localStorage. Focus hides RTL Log, Watch, Memory/Display tabs, and Data Path — only Output + Registers + Variables shown. Advanced restores full view. |
| **Wide-screen side panel** | At ≥ 1100 px the State panel (registers + variables) becomes a permanent 320 px right column. Output stays at the bottom of the editor where it's expected. |
| **Registers moved to top** | In the State panel, Registers are now the first section — no longer buried below Watch. AC row is given subtle visual emphasis. |
| **Mobile layout (≤ 480 px)** | Toolbar collapses to Assemble + Step + Run only. Speed, Output mode, and view toggle are hidden. State panel starts collapsed. `100dvh` fix for iOS Safari address bar. |
| **Loading screen** | Replaced plain amber spinner with a branded screen: M logo + "MARIE Assembler" name + sweeping bar. Fades out smoothly on load. |
| **Toolbar declutter** | Removed redundant WORKSPACE, OUTPUT, EXECUTION meta-labels and the speed value text. PROJECT label removed from the project name field. |
| **Section label contrast** | Panel titles (OUTPUT, STATE) lifted from near-invisible #444 to #666. Section headers (REGISTERS, VARIABLES) from #3a3a3a to a readable blue-gray. |
| **State panel spacing** | Row padding doubled (2 px → 4 px), section gaps increased (10 px → 16 px), top padding increased — panel no longer feels dense. |
| **Inspector renamed** | Called "State" in Focus mode with subtitle "Registers & variables". "Memory Grid" tab renamed "Memory". |
| **Better empty states** | Output: guides students to assemble first. Variables: explains how to declare a variable. |

---

## What's New (v2)

| Feature | Description |
|---|---|
| **Micro-step (F8)** | Step through individual RTL operations — MAR←PC, MBR←M[MAR], IR←MBR, etc. |
| **RTL Log panel** | Live register-transfer trace with colour-coded Fetch / Decode / Execute phases |
| **Step Back (F7)** | Rewind up to 50 instructions — restores all registers and memory |
| **Breakpoints** | Click the gutter to set red-dot breakpoints; Run pauses automatically |
| **Full Memory Grid** | View all 4096 cells with search, heatmap coloring by access frequency |
| **Watch List** | Pin any address or label for live monitoring |
| **Execution History** | Last 50 instructions with register diffs, expandable per row |
| **Stats Bar** | Instruction count, cycle count, memory reads/writes |
| **Share via URL** | Encode any program into a shareable link |
| **8 Example Programs** | Echo, Add Two, Multiply, Fibonacci, Factorial, GCD, Count Down, Max of Two |
| **Export** | Hex Dump, Binary, or Logisim memory image |
| **Data Path Diagram** | Live SVG diagram — animated bus paths and register glow during every micro-step |

---

## Features

### Editor
- **Monaco Editor** (VS Code engine) with full MARIE syntax highlighting, IntelliSense, autocomplete, and hover documentation
- **Code Generation** — right-click to generate If/Else, Loop, Subroutine, and Variable templates
- **Real-time validation** with inline error markers
- **Breakpoints** — click the gutter (left of line numbers) to toggle; red dot appears, Run pauses when hit

### Execution
| Mode | Shortcut | Description |
|---|---|---|
| **Run** | F5 | Continuous execution until HALT or breakpoint |
| **Step** | F6 | Execute one full instruction, update all registers |
| **Micro-step** | F8 | Execute one RTL sub-operation (only while stepping) |
| **Step Back** | F7 | Rewind to previous instruction (only while stepping) |
| **Stop** | Shift+F5 | Halt execution |

### Panels

| Panel | Location | Description |
|---|---|---|
| **Output** | Bottom | Program output in Dec / Hex / Binary / Unicode |
| **Execution History** | Below output | Last 50 instructions with register diffs |
| **RTL Log** | Bottom (Advanced mode) | Micro-operation trace (auto-expands on first μStep) |
| **Registers** | Right column (top) | AC, PC, IR, MAR, MBR in hex and decimal — always visible on wide screens |
| **Variables** | Right column | Symbol table values after each step |
| **Watch List** | Right column (Advanced) | Pin any label or address for live updates |
| **Memory** | Right column (Advanced) | All 4096 cells with heatmap coloring by access frequency |
| **Display** | Right column (Advanced) | 16×16 RGB canvas mapped to memory 0xF00–0xFFF |
| **Data Path Diagram** | Toolbar (Advanced) | Animated SVG of the full MARIE architecture |

### Project Management
- **Save / Load** `.mas` source files
- **Recent Projects** — last 6, one-click restore
- **Share via URL** — program is base64-encoded into a URL parameter
- **Export** — Hex Dump (`.hex`), Binary (`.bin`), Logisim memory image

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

| Instruction | Opcode | RTL | Description |
|---|---|---|---|
| `JNS addr` | 0x0 | M[addr]←PC; PC←addr+1 | Jump and Store (subroutine call) |
| `LOAD addr` | 0x1 | AC←M[addr] | Load memory into AC |
| `STORE addr` | 0x2 | M[addr]←AC | Store AC to memory |
| `ADD addr` | 0x3 | AC←AC+M[addr] | Add memory to AC |
| `SUBT addr` | 0x4 | AC←AC−M[addr] | Subtract memory from AC |
| `INPUT` | 0x5 | AC←IN | Read from input |
| `OUTPUT` | 0x6 | OUT←AC | Write AC to output |
| `HALT` | 0x7 | — | Stop execution |
| `SKIPCOND cond` | 0x8 | if cond: PC←PC+1 | Conditional skip (000/400/800) |
| `JUMP addr` | 0x9 | PC←addr | Unconditional jump |
| `CLEAR` | 0xA | AC←0 | Clear accumulator |
| `ADDI addr` | 0xB | AC←AC+M[M[addr]] | Add indirect |
| `JUMPI addr` | 0xC | PC←M[addr] | Jump indirect |
| `LOADI addr` | 0xD | AC←M[M[addr]] | Load indirect |
| `STOREI addr` | 0xE | M[M[addr]]←AC | Store indirect |

**SKIPCOND conditions:** `000` = skip if AC < 0 · `400` = skip if AC = 0 · `800` = skip if AC > 0

### Directives

| Directive | Example | Notes |
|---|---|---|
| `DEC n` | `x, DEC 42` | Declare signed decimal word |
| `HEX n` | `y, HEX 2A` | Declare hex word |
| `ORG addr` | `ORG 100` | Set load address (hex) — PC starts here |

---

## Assembler Notes

- **Labels are case-sensitive** — `T` and `t` are distinct identifiers
- **Instructions are case-insensitive** — `LOAD`, `load`, `Load` all work
- **`ORG` support** — sets the memory load address; PC starts there
- **2's complement** — `SUBT`/`ADD` wrap mod 2¹⁶; `SKIPCOND 000` uses sign bit

---

## Assembly Syntax

```
[LABEL,] INSTRUCTION [OPERAND]   // optional comment
```

```assembly
// Add two numbers and output the result
        input
        store  a
        input
        add    a
        output
        halt

a, dec 0
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Enter` | Assemble |
| `F5` | Run |
| `Shift+F5` | Stop |
| `F6` | Step (instruction) |
| `F7` | Step Back |
| `F8` | Micro-step (RTL operation) |
| `Ctrl+S` | Save file |
| `Ctrl+O` | Load file |
| `Ctrl+F` | Find in editor |

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
npm run build    # production build
npm run preview  # preview production build
```

---

## Testing

```bash
node --experimental-vm-modules src/utils/tester.js
```

---

## Project Structure

```
src/
├── components/
│   ├── CodeEditor.jsx               # Main editor shell
│   ├── CodeEditor.css
│   └── codeEditor/
│       ├── EditorToolbar.jsx        # File ops + execution controls
│       ├── ExecutionPanels.jsx      # Output, RTL log, registers, memory
│       ├── RtlLogPanel.jsx          # Micro-step RTL trace
│       ├── MemoryGridPanel.jsx      # Full 4096-cell memory view
│       ├── WatchPanel.jsx           # Pinned address monitor
│       ├── ExecutionHistoryPanel.jsx # Step history with diffs
│       ├── StatsBar.jsx             # Cycle/instruction counter
│       ├── DataPathDiagram.jsx      # Animated SVG data path (Drawer)
│       ├── ExamplesModal.jsx        # Built-in example programs
│       ├── GenerateCodeModal.jsx    # Code snippet generator
│       ├── MarieInputModal.jsx      # Runtime INPUT dialog
│       ├── monacoSetup.js           # MARIE language + IntelliSense
│       ├── constants.js
│       ├── utils.js                 # Helpers, share URL, export
│       └── usePanelResizers.js      # Drag-to-resize logic
├── data/
│   └── examplePrograms.js           # 8 annotated example programs
├── pages/
│   └── TutorialPage.jsx             # Interactive tutorial + quiz
├── utils/
│   ├── marieAssembler.js            # Two-pass assembler
│   ├── marieSimulator.js            # Micro-step simulator with rewind
│   └── tester.js                    # Test suite
├── App.jsx
└── main.jsx
```

---

## Tech Stack

- **React 19** with hooks
- **Monaco Editor** — VS Code editor core
- **Ant Design 5** — UI components
- **Vite** — build tool with code splitting

---

## Acknowledgments

MARIE architecture by Linda Null and Julia Lobur. Monaco Editor by Microsoft. UI components by Ant Design.

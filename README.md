# Web MARIE Assembler & Simulator

## Overview

The Web MARIE Assembler is a modern, browser-based implementation of a MARIE (Machine Architecture that is Really Intuitive and Easy) computer simulator. This project provides both an assembler to convert assembly language into machine code and a real-time simulator to execute the assembled programs with an intuitive web interface built using React and Monaco Editor.

## Features

- **Modern Web Interface**: Built with React and Monaco Editor for a professional IDE-like experience
- **Real-time Assembly**: Live syntax highlighting and error detection as you type
- **Interactive Execution**: Step-by-step program execution with configurable speed control
- **Multiple I/O Formats**: Support for Decimal, Hexadecimal, Binary, and Unicode input/output
- **Smart Error Handling**: Comprehensive error detection with line highlighting and detailed messages
- **Auto-completion**: Intelligent instruction and label completion
- **Memory Simulation**: Complete 4096-word memory simulation with register validation
- **Singleton Architecture**: Efficient memory management with single simulator instance
- **Responsive Design**: Works seamlessly across different screen sizes

## Technology Stack

- **Frontend**: React 18 with Hooks
- **Code Editor**: Monaco Editor (VS Code editor core)
- **UI Components**: Ant Design
- **Styling**: CSS3 with custom themes
- **Build Tool**: Vite
- **Language**: JavaScript/JSX

## MARIE Architecture

### Registers

- **AC (Accumulator)**: 16-bit primary register for arithmetic and logic operations
- **IR (Instruction Register)**: 16-bit register holding the current instruction
- **MAR (Memory Address Register)**: 12-bit register for memory addresses
- **PC (Program Counter)**: 12-bit counter pointing to the next instruction
- **MBR (Memory Buffer Register)**: 16-bit temporary storage for data transfers

### Memory

- **Size**: 4096 words (12-bit addressing)
- **Word Size**: 16 bits
- **Addressing Modes**: Direct and indirect addressing
- **Validation**: Automatic bounds checking for all memory operations

## Instruction Set

### Instructions with Arguments

| Instruction | Opcode | Hex    | Description                   |
| ----------- | ------ | ------ | ----------------------------- |
| JNS         | 0000   | 0x0000 | Jump and Store                |
| LOAD        | 0001   | 0x1000 | Load from memory to AC        |
| STORE       | 0010   | 0x2000 | Store AC to memory            |
| ADD         | 0011   | 0x3000 | Add memory value to AC        |
| SUBT        | 0100   | 0x4000 | Subtract memory value from AC |
| JUMP        | 1001   | 0x9000 | Unconditional jump            |
| ADDI        | 1011   | 0xB000 | Add indirect                  |
| JUMPI       | 1100   | 0xC000 | Jump indirect                 |
| LOADI       | 1101   | 0xD000 | Load indirect                 |
| STOREI      | 1110   | 0xE000 | Store indirect                |

### Instructions without Arguments

| Instruction | Opcode | Hex    | Description            |
| ----------- | ------ | ------ | ---------------------- |
| INPUT       | 0101   | 0x5000 | Read input to AC       |
| OUTPUT      | 0110   | 0x6000 | Write AC to output     |
| HALT        | 0111   | 0x7000 | Stop program execution |
| CLEAR       | 1010   | 0xA000 | Clear AC (set to 0)    |

### Special Instructions

| Instruction | Opcode | Hex    | Description                                              |
| ----------- | ------ | ------ | -------------------------------------------------------- |
| SKIPCOND    | 1000   | 0x8000 | Skip next instruction based on condition (000, 400, 800) |

**SKIPCOND Conditions:**

- `SKIPCOND 000`: Skip if AC > 0
- `SKIPCOND 400`: Skip if AC = 0
- `SKIPCOND 800`: Skip if AC < 0

### Data Declaration

| Directive | Description               | Example      |
| --------- | ------------------------- | ------------ |
| DEC       | Declare decimal value     | `x, DEC 123` |
| HEX       | Declare hexadecimal value | `y, HEX A0F` |

## Assembly Language Syntax

### Basic Format

```assembly
[LABEL,] INSTRUCTION [OPERAND]
```

### Examples

```assembly
// Simple arithmetic program
start, LOAD x          // Load value from address x into AC
       ADD y           // Add value from address y to AC
       STORE result    // Store AC value to address result
       LOAD result     // Load result for output
       OUTPUT          // Output AC value
       HALT           // Stop execution

// Data declarations
x, DEC 15             // Declare variable x with value 15
y, DEC 25             // Declare variable y with value 25
result, DEC 0         // Declare variable result with value 0
```

### Advanced Example - Loop with Input

```assembly
// Program that reads numbers and outputs their sum
loop, INPUT            // Read a number
      SKIPCOND 400     // Skip if input is 0 (exit condition)
      JUMP continue    // Continue if not 0
      JUMP end         // Jump to end if 0

continue, ADD sum      // Add input to running sum
          STORE sum    // Store updated sum
          JUMP loop    // Loop back for next input

end, LOAD sum         // Load final sum
     OUTPUT           // Output the result
     HALT             // Stop program

sum, DEC 0            // Storage for sum
```

## Web Interface Features

### Code Editor

- **Syntax Highlighting**: MARIE-specific syntax highlighting with custom theme
- **Error Detection**: Real-time error detection with line highlighting
- **Auto-completion**: Tab completion for instructions and defined labels
- **Line Numbers**: Automatic line numbering
- **Dark Theme**: Professional dark theme optimized for coding

### Control Panel

- **Speed Control**: Adjustable execution speed from 0ms to 1000ms per step
- **Output Format**: Toggle between Decimal, Hexadecimal, Binary, and Unicode output
- **Assemble Button**: Convert assembly code to machine code
- **Run/Stop Button**: Start/stop program execution with proper state management

### Input/Output System

- **Modal Input**: Clean modal dialog for program input
- **Multiple Input Types**:
  - Decimal: Standard base-10 numbers
  - Hexadecimal: Base-16 numbers (with 0x prefix display)
  - Binary: Base-2 numbers (with 0b prefix display)
  - Unicode: Single character input (converts to ASCII value)
- **Real-time Output**: Live output display with automatic scrolling
- **Error Display**: Comprehensive error messages with context

## Error Handling

### Syntax Errors

- **Missing Arguments**: Instructions requiring arguments without operands
- **Invalid Instructions**: Unrecognized instruction names
- **Undefined Labels**: References to labels that don't exist
- **Invalid Numbers**: Malformed decimal or hexadecimal values
- **Label Format**: Improper label syntax (must start line and end with comma)

### Runtime Errors

- **Memory Bounds**: Automatic checking for valid memory addresses (0-4095)
- **Register Overflow**: 16-bit register value validation (0-65535)
- **Input Validation**: Range checking for all input values
- **Execution State**: Proper handling of program start/stop states

### Visual Feedback

- **Line Highlighting**: Red highlighting for syntax errors
- **Error Markers**: Monaco editor error markers with detailed messages
- **Console Logging**: Detailed error information in browser console
- **User Alerts**: User-friendly alert dialogs for input errors

## Architecture & Implementation

### Frontend Structure

```
src/
├── components/
│   ├── codeEditor.jsx          # Main editor component
│   └── CodeEditor.css          # Component styling
├── utils/
│   ├── marieAssembler.js       # Assembly to machine code conversion
│   ├── marieSimulator.js       # MARIE machine simulation
│   └── tester.js              # Testing utilities
├── App.jsx                     # Main application component
└── main.jsx                   # Application entry point
```

### Key Components

#### MarieSimulator (Singleton)

- **Memory Management**: 4096-word memory with bounds checking
- **Register Simulation**: Complete MARIE register set with validation
- **Execution Engine**: Fetch-decode-execute cycle with configurable timing
- **Callback System**: Real-time communication with React components

#### MarieAssembler

- **Two-Pass Assembly**: Symbol table generation and machine code translation
- **Error Detection**: Comprehensive syntax and semantic validation
- **Label Resolution**: Automatic address calculation for labels and jumps

#### CodeEditor Component

- **Monaco Integration**: Full-featured code editor with MARIE language support
- **State Management**: React hooks for all application state
- **Event Handling**: User interaction management and callback setup

### Assembly Process

1. **Lexical Analysis**: Parse assembly code into tokens
2. **Symbol Table**: First pass to collect labels and addresses
3. **Code Generation**: Second pass to generate machine code
4. **Validation**: Syntax and semantic error checking
5. **Memory Loading**: Load machine code into simulator memory

### Execution Process

1. **Initialization**: Reset registers and load program
2. **Fetch-Decode-Execute**:
   - Fetch instruction from memory[PC]
   - Decode opcode and operand
   - Execute instruction and update registers
   - Handle special cases (INPUT, conditional jumps)
3. **State Updates**: Real-time UI updates through callbacks
4. **Error Handling**: Graceful handling of runtime errors

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/alibadawi25/Web-Marie-Assembler.git
   cd Web-Marie-Assembler
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

4. **Open browser**
   Navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

## Usage Guide

### Writing Your First Program

1. **Open the application** in your web browser
2. **Clear the editor** and enter your assembly code
3. **Use the syntax** shown in examples above
4. **Watch for errors** - they'll be highlighted in red
5. **Click "Assemble"** to convert to machine code
6. **Click "Run"** to execute your program
7. **Interact with INPUT** instructions via modal dialogs
8. **View output** in the terminal section

### Example Session

```assembly
// Echo program - reads input and outputs it
start, INPUT           // Prompt for input
       OUTPUT          // Display the input
       HALT           // Stop execution
```

1. Type the code above
2. Click "Assemble" - should succeed with no errors
3. Click "Run" - input modal will appear
4. Enter a number (e.g., 42)
5. See the output displayed below
6. Program stops automatically

### Tips for Success

- **Always end with HALT** to properly terminate programs
- **Declare variables** with labels before using them
- **Use meaningful label names** for better readability
- **Test with small programs** before building complex ones
- **Check the output format** setting for expected display format

## Acknowledgments

- MARIE architecture designed by Linda Null and Julia Lobur
- Monaco Editor by Microsoft for the excellent code editing experience
- Ant Design team for the beautiful UI components
- React team for the powerful frontend framework

\*\*\* End Patch

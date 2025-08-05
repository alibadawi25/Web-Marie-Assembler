# Marie Assembler Documentation

## Overview

The Marie Assembler is a complete implementation of a MARIE (Machine Architecture that is Really Intuitive and Easy) computer simulator. This project provides both an assembler to convert assembly language into machine code and a simulator to execute the assembled programs with a graphical user interface.

## Features

- **Assembly Language Support**: Full implementation of MARIE instruction set
- **Graphical User Interface**: User-friendly GUI built with CustomTkinter
- **Multiple Output Formats**: Support for Decimal (DEC), Hexadecimal (HEX), and ASCII output
- **Error Handling**: Comprehensive error detection and reporting
- **Line Number Management**: Automatic line numbering for assembly code
- **Auto-completion**: Intelligent instruction completion
- **Memory Simulation**: 4096-word memory simulation
- **Register Simulation**: Complete MARIE register set implementation

## MARIE Architecture

### Registers

- **AC (Accumulator)**: Primary register for arithmetic and logic operations
- **IR (Instruction Register)**: Holds the current instruction being executed
- **MAR (Memory Address Register)**: Holds memory addresses
- **PC (Program Counter)**: Points to the next instruction to execute
- **MBR (Memory Buffer Register)**: Temporary storage for data transfers
- **IN/OUT**: Input/Output registers for data communication

### Memory

- **Size**: 4096 words
- **Word Size**: 16 bits
- **Addressing**: Direct addressing with 12-bit addresses

## Instruction Set

### Instructions with Arguments

| Instruction | Opcode | Description                   |
| ----------- | ------ | ----------------------------- |
| JNS         | 0000   | Jump and Store                |
| LOAD        | 0001   | Load from memory to AC        |
| STORE       | 0010   | Store AC to memory            |
| ADD         | 0011   | Add memory value to AC        |
| SUBT        | 0100   | Subtract memory value from AC |
| JUMP        | 1001   | Unconditional jump            |
| ADDI        | 1011   | Add indirect                  |
| JUMPI       | 1100   | Jump indirect                 |
| LOADI       | 1101   | Load indirect                 |
| STOREI      | 1110   | Store indirect                |

### Instructions without Arguments

| Instruction | Opcode | Description            |
| ----------- | ------ | ---------------------- |
| INPUT       | 0101   | Read input to AC       |
| OUTPUT      | 0110   | Write AC to output     |
| HALT        | 0111   | Stop program execution |
| CLEAR       | 1010   | Clear AC (set to 0)    |

### Special Instructions

| Instruction | Description                                              |
| ----------- | -------------------------------------------------------- |
| SKIPCOND    | Skip next instruction based on condition (800, 400, 000) |

### Data Declaration

| Directive | Description               | Example   |
| --------- | ------------------------- | --------- |
| DEC       | Declare decimal value     | `DEC 123` |
| HEX       | Declare hexadecimal value | `HEX A0F` |

## Assembly Language Syntax

### Basic Format

```
[LABEL,] INSTRUCTION [OPERAND]
```

### Examples

```assembly
1: LOAD X          // Load value from address X into AC
2: ADD Y           // Add value from address Y to AC
3: STORE Z         // Store AC value to address Z
4: OUTPUT          // Output AC value
5: HALT            // Stop execution

6: X, DEC 10       // Declare variable X with value 10
7: Y, DEC 5        // Declare variable Y with value 5
8: Z, DEC 0        // Declare variable Z with value 0
```

### Labels

- Labels must end with a comma (`,`)
- Used to define variables and memory locations
- Can be referenced by instructions

### Comments

- Not explicitly shown in code, but the assembler processes line by line

## Output Modes

The assembler supports three output display modes:

1. **DEC (Decimal)**: Displays output as decimal numbers
2. **HEX (Hexadecimal)**: Displays output as hexadecimal numbers
3. **ASCII**: Displays output as ASCII characters

## GUI Components

### Input Section

- **Text Area**: For writing assembly code
- **Line Numbers**: Automatically managed
- **Auto-completion**: Press Tab to complete instructions

### Output Section

- **Display Area**: Shows program output
- **Format Selection**: Choose between DEC, HEX, ASCII

### Control Buttons

- **Assemble**: Converts assembly code to machine code
- **Run**: Executes the assembled program

## Error Handling

The assembler provides comprehensive error checking:

### Syntax Errors

- Missing instructions after labels
- Invalid instruction names
- Missing arguments for instructions that require them
- Extra arguments for instructions that don't accept them

### Data Errors

- Invalid decimal numbers in DEC declarations
- Invalid hexadecimal numbers in HEX declarations
- Undefined symbol references

### Runtime Errors

- Memory access violations
- Invalid input values

## File Structure

```
MarieAssembler/
├── gui.py                              # Main GUI implementation
├── test.py                             # Assembly and translation logic
├── assembly_to_machine_code_translator.py  # Instruction translation
├── marie_register.py                   # Register definitions
├── marie_memory.py                     # Memory simulation
├── fetch_decode_execute.py             # Execution engine
├── program_executer.py                 # Individual instruction execution
├── Output_Mode.py                      # Output format management
├── ErrorHandling.py                    # Error handling utilities
└── test_cases.py                       # Test cases
```

## Usage Instructions

### Running the Assembler

1. Execute `python gui.py` to start the application
2. Enter your assembly code in the input area
3. Click "Assemble" to convert to machine code
4. Click "Run" to execute the program
5. View output in the output area

### Writing Assembly Programs

1. Use line numbers (automatically added)
2. Define variables with labels and DEC/HEX directives
3. Write instructions using the supported instruction set
4. Use HALT to end your program

### Example Program

```assembly
1: LOAD NUM1       // Load first number
2: ADD NUM2        // Add second number
3: STORE RESULT    // Store the result
4: LOAD RESULT     // Load result for output
5: OUTPUT          // Display the result
6: HALT            // Stop execution
7: NUM1, DEC 15    // First number
8: NUM2, DEC 25    // Second number
9: RESULT, DEC 0   // Storage for result
```

## Technical Implementation

### Assembly Process

1. **First Pass**: Scan for labels and build symbol table
2. **Second Pass**: Translate instructions to machine code
3. **Error Checking**: Validate syntax and semantics
4. **Memory Loading**: Store machine code in simulated memory

### Execution Process

1. **Initialization**: Reset all registers and flags
2. **Fetch-Decode Cycle**:
   - Fetch instruction from memory
   - Decode instruction and operand
   - Execute instruction
   - Update program counter
3. **GUI Updates**: Real-time display updates during execution

### Memory Management

- Instructions stored starting at address 0
- 16-bit word size with binary representation
- Support for both direct and indirect addressing modes

## Dependencies

- **Python 3.x**
- **CustomTkinter**: For modern GUI components
- **Standard Library**: re, sys modules

## Installation

1. Install Python 3.x
2. Install CustomTkinter: `pip install customtkinter`
3. Clone or download the project files
4. Run `python gui.py` to start the application

This documentation provides a comprehensive guide to understanding and using the Marie Assembler project.

## complex example

ORG 100

LOADI MessageAddr
OUTPUT

WelcomeLoop, Load MessageAddr
Add One
Store MessageAddr
LoadI MessageAddr
SKIPCOND 800
JUMP Calculate
LoadI MessageAddr
OUTPUT
JUMP WelcomeLoop

HEX 0

MessageAddr, HEX 10D
Msg, HEX 57
HEX 65
HEX 6C
HEX 63
HEX 6F
HEX 6D
HEX 65
HEX 0A
HEX 50
HEX 75
HEX 74
HEX 20
HEX 61
HEX 20
HEX 6D // ASCII code for 'm'
HEX 61 // ASCII code for 'a'
HEX 74 // ASCII code for 't'
HEX 68 // ASCII code for 'h'
HEX 20 // ASCII code for ' '
HEX 73 // ASCII code for 's'
HEX 79 // ASCII code for 'y'
HEX 6D // ASCII code for 'm'
HEX 62 // ASCII code for 'b'
HEX 6F // ASCII code for 'o'
HEX 6C // ASCII code for 'l'
HEX 0A
HEX 0

EnterSignLoop, Load SymbolEnteryMsg
Add One
Store SymbolEnteryMsg
LoadI SymbolEnteryMsg
SKIPCOND 800
JUMP Start
LoadI SymbolEnteryMsg
OUTPUT
JUMP EnterSignLoop

SymbolEnteryMsg, HEX 131
HEX 45
HEX 6E // ASCII code for 'n'
HEX 74 // ASCII code for 't'
HEX 65 // ASCII code for 'e'
HEX 72 // ASCII code for 'r'
HEX 20 // ASCII code for ' '
HEX 61 // ASCII code for 'a'
HEX 20 // ASCII code for ' '
HEX 4E
HEX 75
HEX 6D
HEX 62
HEX 65
HEX 72
HEX 0A // ASCII code for new line
HEX 0

PrintTrue, Load TrueWord
Add One
Store TrueWord
LoadI TrueWord
SKIPCOND 800
JUMP End
LoadI TrueWord
OUTPUT
JUMP PrintTrue

TrueWord, HEX 14B
HEX 74 // ASCII code for 't'
HEX 72 // ASCII code for 'r'
HEX 75 // ASCII code for 'u'
HEX 65 // ASCII code for 'e'
HEX 20 // ASCII code for ' '
HEX 0A // ASCII code for new line
HEX 0

PrintFalse, Load FalseWord
Add One
Store FalseWord
LoadI FalseWord
SKIPCOND 800
JUMP End
LoadI FalseWord
OUTPUT
JUMP PrintFalse

FalseWord, HEX 15C
HEX 66 // ASCII code for 'f'
HEX 61 // ASCII code for 'a'
HEX 6C // ASCII code for 'l'
HEX 73 // ASCII code for 's'
HEX 65 // ASCII code for 'e'
HEX 20 // ASCII code for ' '
HEX 0A // ASCII code for new line
HEX 0

SinResults, HEX 165
DEC 0017
DEC 0034
DEC 0052
DEC 0069
DEC 0087
DEC 0104
DEC 0121
DEC 0139
DEC 0156
DEC 0173
DEC 0190
DEC 0207
DEC 0224
DEC 0241
DEC 0258
DEC 0275
DEC 0292
DEC 0309
DEC 0325
DEC 0342
DEC 0358
DEC 0374
DEC 0390
DEC 0406
DEC 0422
DEC 0438
DEC 0453
DEC 0469
DEC 0484
DEC 0500
DEC 0515
DEC 0529
DEC 0544
DEC 0559
DEC 0573
DEC 0587
DEC 0601
DEC 0615
DEC 0629
DEC 0642
DEC 0656
DEC 0669
DEC 0681
DEC 0694
DEC 0707
DEC 0719
DEC 0731
DEC 0743
DEC 0754
DEC 0766
DEC 0777
DEC 0788
DEC 0798
DEC 0809
DEC 0819
DEC 0829
DEC 0838
DEC 0848
DEC 0857
DEC 0866
DEC 0874
DEC 0882
DEC 0891
DEC 0898
DEC 0906
DEC 0913
DEC 0920
DEC 0927
DEC 0933
DEC 0939
DEC 0945
DEC 0951
DEC 0956
DEC 0961
DEC 0965
DEC 0970
DEC 0974
DEC 0978
DEC 0981
DEC 0984
DEC 0987
DEC 0990
DEC 0992
DEC 0994
DEC 0996
DEC 0997
DEC 0998
DEC 0999
DEC 0999
DEC 1000

List, HEX 1C1
DEC 10000
DEC 1000
DEC 100
DEC 10
DEC 0

PrintInvalid, Load InvalidWord
Add One
Store InvalidWord
LoadI InvalidWord
SKIPCOND 800
JUMP End
LoadI InvalidWord
OUTPUT
JUMP PrintInvalid

InvalidWord, HEX 1CF
HEX 49 // ASCII code for 'I'
HEX 6E // ASCII code for 'n'
HEX 76 // ASCII code for 'v'
HEX 61 // ASCII code for 'a'
HEX 6C // ASCII code for 'l'
HEX 69 // ASCII code for 'i'
HEX 64 // ASCII code for 'd'
HEX 0A // ASCII code for new line
HEX 0

PrintValid, Load ValidWord
Add One
Store ValidWord
LoadI ValidWord
SKIPCOND 800
JUMP End
LoadI ValidWord
OUTPUT
JUMP PrintValid

ValidWord, HEX 1E2
HEX 56 // ASCII code for 'V'
HEX 61 // ASCII code for 'a'
HEX 6C // ASCII code for 'l'
HEX 69 // ASCII code for 'i'
HEX 64 // ASCII code for 'd'
HEX 0A // ASCII code for new line
HEX 0

ClearPage, HEX 0
Load ClearPageStart
Store empty
ClearLoop, Load empty
Add One
Store empty
LoadI empty
SKIPCOND 800
JumpI ClearPage
LoadI empty
OUTPUT
JUMP ClearLoop

empty, HEX 1F6
HEX 0A
HEX 0A
HEX 0A
HEX 0A
HEX 0A
HEX 0A
HEX 0A
HEX 0A
HEX 0A
HEX 0

PrintSin, HEX 0
SinStringLoop, Load SinString
Add One
Store SinString
LoadI SinString
SKIPCOND 800
JumpI PrintSin
LoadI SinString
OUTPUT
JUMP SinStringLoop

SinString, HEX 20B
HEX 53 // ASCII code for 'S'
HEX 69 // ASCII code for 'i'
HEX 6E // ASCII code for 'n'
HEX 0

PrintCos, HEX 0
CosStringLoop, Load CosString
Add One
Store CosString
LoadI CosString
SKIPCOND 800
JumpI PrintCos
LoadI CosString
OUTPUT
JUMP CosStringLoop

CosString, HEX 21A
HEX 43 // ASCII code for 'C'
HEX 6F // ASCII code for 'o'
HEX 73 // ASCII code for 's'
HEX 0

PrintTan, HEX 0
TanStringLoop, Load TanString
Add One
Store TanString
LoadI TanString
SKIPCOND 800
JumpI PrintTan
LoadI TanString
OUTPUT
JUMP TanStringLoop

TanString, HEX 229
HEX 54 // ASCII code for 'T'
HEX 61 // ASCII code for 'a'
HEX 6E // ASCII code for 'n'
HEX 0

Calculate, Input
Store Sign
JnS ClearPage
Jump EnterSignLoop

Start, JnS ClearPage

CheckPlus, Load Sign
Subt Plus
Skipcond 400
Jump CheckMinus
Input
Store X
Input
Store Y
JnS PrintQuestion
Load X
Add Y
Store Sum
Load Sum
Store N
JnS toNumFunc
Jump End

CheckMinus, Load Sign
Subt Minus
Skipcond 400
Jump CheckMult
Input
Store X
Input
Store Y
JnS PrintQuestion
Load X
Subt Y
Store Sum
Load Sum
Store N
JnS toNumFunc
Jump End

CheckMult, Load Sign
Subt MultSign
Skipcond 400
Jump CheckDivision
Input
Store X
Input
Store Y
JnS PrintQuestion
JnS Mult
Load Sum
Store N
JnS toNumFunc
Jump End
Mult, Load Sum
Clear
Store Sum
Load Y
Store Cntr
MultLoop, Load Sum
Add X
Store Sum
Load Cntr
Subt One
Store Cntr
Skipcond 400
Jump MultLoop
JumpI Mult
Load Sum
Add toNum
Output
Jump End

CheckDivision, Load Sign
Subt DivSign
Skipcond 400
Jump CheckPower
Input
Store X
Input
Store Y
JnS PrintQuestion
Clear
Store DecimalCntr
Jns Div
Load Sum
Add toNum
Output
Jump End
Div, Load Sum
Back, Clear
Clear
Store Sum
Load Y
Store OldY
DivLoop, Load X
Subt Y
Skipcond 000
Jump Cont
Jump RemainderLoop
Cont, Store X
Load Sum
Add One
Store Sum
Load X
Skipcond 400
Jump DivLoop
JumpI Div
RemainderLoop, Load Sum
Load isRemainderUsed
Add One
Store isRemainderUsed
Load Pre
Subt One
Store Pre
Skipcond 800
Jump End
Load Sum
Add toNum
Output
Load Ten
Store Y
Jns Mult
Load Sum
Store X
Load OldY
Store Y
Load DecimalCntr
Skipcond 400
Jump Back
Load DecimalPoint
Output
Load DecimalCntr
Add One
Store DecimalCntr
Jump Back

CheckPower, Load Sign
Subt PowerSign
Skipcond 400
Jump CheckSmallerThan
Input
Store X
Input
Store Y
JnS PrintQuestion
JnS Power
Load PowerSum
Store N
JnS toNumFunc
Jump End
Power, Load PowerSum
Clear
Store PowerSum
Load Y
Subt One
Skipcond 400
Jump ContPower
Load X
Store Sum
JumpI Power
ContPower, Store PowerCntr
Load X
Store PowerSum
PowerLoop, Load PowerSum
Store Y
Jns Mult
Load Sum
Store PowerSum
Load PowerCntr
Subt One
Store PowerCntr
Skipcond 400
Jump PowerLoop
JumpI Power
Jump End

CheckSmallerThan, Load Sign
Subt LessThanSign
Skipcond 400
Jump CheckGreaterThan
Input
Store X
Input
Store Y
JnS PrintQuestion
Load X
Subt Y
Skipcond 800
Jump PrintTrue
Jump PrintFalse

CheckGreaterThan, Load Sign
Subt GreaterThanSign
Skipcond 400
Jump CheckSin
Input
Store X
Input
Store Y
JnS PrintQuestion
Load X
Subt Y
Skipcond 800
Jump PrintFalse
Jump PrintTrue

CheckSin, Load Sign
Subt S
Skipcond 400
Jump CheckFactorization
Input
Store X
JnS PrintSin
Load openBracket
Output
Load X
Store N
JnS toNumFunc
Load DegreeSign
Output
Load closedBracket
Output
Load Equal
Output
Load One
Store isSin
JnS Sin
Load ResultSin
Store X
Load Thousand
Store Y
Clear
Store DecimalCntr
JnS Div
Load Sum
Add toNum
Output
Jump End
Sin, HEX 0
Load X
Store OldX
check180, Load X
Subt OneEighty
Skipcond 800
jump continueSin
Store X
Load isNegative
Subt One
Skipcond 400
Add Two
Store isNegative
Jump check180
continueSin, Load X
Subt OneEighty
Skipcond 400
Jump check90
Load toNum
Output
Jump End
check90, Load X
Subt Ninety
Skipcond 800
jump checkIsSin
Load OneEighty
Subt X
Store X
checkIsSin, Load isSin
Subt One
Skipcond 400
Jump goOnSin
checkIsNegative, Load isNegative
Subt One
Skipcond 400
Jump goOnSin
Load Minus
Output
Load isNegative
Subt One
Store isNegative
goOnSin, Load SinResultStart
Store SinResults
Load SinResults
Add X
Store SinResults
LoadI SinResults
Store ResultSin
Load OldX
Store X
JumpI Sin

CheckFactorization, Load Sign
Subt F
Skipcond 400
Jump CheckCos
Input
Store X
Load One
Store PotentialFactor
FactorLoop, Load PotentialFactor
Load X
Store A
Load PotentialFactor
Store B
JnS MOD
Load Result

Load Result
Skipcond 400
Jump NextFactor
Load PotentialFactor
Store N
JnS toNumFunc
Load FeedLine
Output
NextFactor, Load PotentialFactor
Add One
Store PotentialFactor
Load X
Subt PotentialFactor
Skipcond 000
Jump FactorLoop
Jump End

Load PotentialFactor
Add One
Store PotentialFactor

MOD, Load A
MODLoop, Load A
Subt B
Skipcond 000
Jump ElseMod
Add B
Store Result
JumpI MOD
ElseMod, Store A
Store A
Jump MODLoop

CheckCos, Load Sign
Subt C
Skipcond 400
Jump CheckTan
Input
Store X
JnS PrintCos
Load openBracket
Output
Load X
Store N
JnS toNumFunc
Load DegreeSign
Output
Load closedBracket
Output
Load Equal
Output
Load One
Store isSin
JnS Cos
Load ResultCos
Store X
Load Thousand
Store Y
Clear
Store DecimalCntr
JnS Div
Load Sum
Add toNum
Output
Jump End
Cos, HEX 0
Load X
Add Ninety
Store X
JnS Sin
Load ResultSin
Store ResultCos
JumpI Cos

CheckTan, Load Sign
Subt T
Skipcond 400
Jump CheckTriangleDetection
Input
Store X
JnS PrintTan
Load openBracket
Output
Load X
Store N
JnS toNumFunc
Load DegreeSign
Output
Load closedBracket
Output
Load Equal
Output
Clear
Store isSin
JnS Sin
Load isNegativeTan
Add isNegative
Store isNegativeTan
Clear
Store isNegative
contTan, Load ResultSin
Store PrevResultSin
Clear
Store isSin
JnS Cos
Load isNegativeTan
Skipcond 400
Jump contTan2
Add isNegative
Jump contTan3
contTan2, Load isNegativeTan
Subt isNegative
contTan3, Store isNegativeTan
Clear
Store isNegative
Load PrevResultSin
Store ResultSin
Load isNegativeTan
Subt One
Skipcond 400
Jump EndTan
Load Minus
Output
EndTan, Load ResultSin
Store X
Load ResultCos
Store Y
Clear
Store DecimalCntr
JnS Div
Jump End

CheckTriangleDetection, Load Sign
Subt t
Skipcond 400
Jump PrintInvalid

Input
Store Opp
Input
Store Adj
Input
Store Hyp //biggest number
Load Hyp
Subt Opp
Skipcond 800
Jump PrintInvalid
Load Hyp
Subt Adj
Skipcond 800
Jump PrintInvalid
Load Hyp
Subt Adj
Subt Hyp
Skipcond 800
Jump PrintValid
Jump PrintInvalid

PrintQuestion, Load X
JnS ClearPage
Load N
Add X
Store N
JnS toNumFunc
Load Sign
Output
Load N
Add Y
Store N
JnS toNumFunc
Load Equal
Output
JumpI PrintQuestion

toNumFunc, Load N
Clear
Store isRemainderUsed
Load Four
Store ZerosCount
Load N
Subt Ten
Skipcond 000
jump tryTen
Load N
Add toNum
Output
Clear
Store N
JumpI toNumFunc
tryTen, Load N
LoadI List
Store Degree
Load N
Subt Degree
Skipcond 000
Jump OutputNums
Load List
Add One
Store List
Load ZerosCount
Subt One
Store ZerosCount
Jump tryTen
OutputNums, Load X
Store OldX
Load Sum
Store OldSum
Load Y
Store OldFunctionY
Load N
Store X
LoadI List
Store Y
Load One
Store DecimalCntr
JnS Div
Load OldFunctionY
Store Y
Load OldX
Store X
Load Sum
Add toNum
Output
Load ZerosCount
Subt isRemainderUsed
Store ZerosCount
Skipcond 400
Jump ZeroOutput
Jump OutputDone
ZeroOutput, Load toNum
Output
Load ZerosCount
Subt One
Store ZerosCount
Skipcond 400
Jump ZeroOutput
OutputDone, Load OldSum
Store Sum
Clear
Store N
Load ListStart
Store List
JumpI toNumFunc
Skipcond 800
Jump TenOut
Load X
Store OldX
Load Y
Store OldFunctionY
Load Ten
Store Y
Load N
Store X
Load DecimalCntr
Add One
Store DecimalCntr
Jns Div
Load OldFunctionY
Store Y
Load OldX
Store X
Load Sum
Add toNum
Output
Clear
Store N
JumpI toNumFunc
TenOut, Load One
Add toNum
Output
Load toNum
Output
Clear
Store N
JumpI toNumFunc

End, JnS ClearPage
Halt

isSin, DEC 0
isFlipped, DEC 0
isNegative, DEC 0
isNegativeTan, DEC 0
isRemainderUsed, DEC 0

C, HEX 43 // Cos
S, HEX 53 // Sin
T, HEX 54 // Tan
t, HEX 74 // Triangle Detection
F, HEX 46 // Factorization

GreaterThanSign, HEX 3E
LessThanSign, HEX 3C  
PowerSign, HEX 5E
DecimalPoint, HEX 2E
MultSign, HEX 2A
DivSign, HEX 2F
Cntr, DEC 0
PowerCntr, DEC 0
Plus, HEX 2B
Minus, HEX 2D
Equal, HEX 3D
Sign, HEX 0
toNum, DEC 48
OldX, DEC 0
OldY, DEC 0
OldSum, DEC 0
OldFunctionY, DEC 0
One, DEC 1
Two, Dec 2
Four, DEC 4
Ten, Dec 10
OneEighty, DEC 180
Ninety, DEC 90
Thousand, DEC 1000
DecimalCntr, Dec 0
PotentialFactor, DEC 0
Result, DEC 0
FeedLine, HEX 0A
Pre, Dec 15
Degree, DEC 0

SinResultStart, HEX 165
ListStart, HEX 1C1
ClearPageStart, HEX 1F6

ZerosCount, DEC 4

Sum, DEC 0
PowerSum, DEC 0
ResultSin, DEC 0
PrevResultSin, DEC 0
ResultCos, DEC 0
PrevResultCos, DEC 0

openBracket, HEX 28
closedBracket, HEX 29
DegreeSign, HEX B0

Opp, DEC 0
Adj, DEC 0
Hyp, DEC 0

N, DEC 0
A, DEC 0
B, DEC 0
X, DEC 0
Y, DEC 0

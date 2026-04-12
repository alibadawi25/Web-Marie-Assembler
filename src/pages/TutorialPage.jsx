import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./TutorialPage.css";

// ─── Data ────────────────────────────────────────────────────────────────────

const CAT = {
  memory:     { label: "Memory",     color: "#2f8477" },
  arithmetic: { label: "Arithmetic", color: "#cf6032" },
  io:         { label: "I/O",        color: "#7b5ea7" },
  control:    { label: "Control",    color: "#b08b22" },
  data:       { label: "Data",       color: "#3a6fa8" },
};

const instructionRef = [
  { name: "LOAD",    syntax: "LOAD X",            category: "memory",     description: "Copy the value stored at label X into AC.",                       example: "load total"    },
  { name: "STORE",   syntax: "STORE X",           category: "memory",     description: "Write AC into the memory cell named X.",                          example: "store result"  },
  { name: "LOADI",   syntax: "LOADI X",           category: "memory",     description: "Indirect load: AC = memory[ memory[X] ].",                        example: "loadi ptr"     },
  { name: "STOREI",  syntax: "STOREI X",          category: "memory",     description: "Indirect store: memory[ memory[X] ] = AC.",                       example: "storei ptr"    },
  { name: "ADD",     syntax: "ADD X",             category: "arithmetic", description: "Add the value at X to AC.",                                       example: "add bonus"     },
  { name: "SUBT",    syntax: "SUBT X",            category: "arithmetic", description: "Subtract the value at X from AC.",                                example: "subt tax"      },
  { name: "ADDI",    syntax: "ADDI X",            category: "arithmetic", description: "Indirect add: AC = AC + memory[ memory[X] ].",                    example: "addi ptr"      },
  { name: "CLEAR",   syntax: "CLEAR",             category: "arithmetic", description: "Set AC to zero.",                                                  example: "clear"         },
  { name: "INPUT",   syntax: "INPUT",             category: "io",         description: "Pause, read a number from the user, store it in AC.",             example: "input"         },
  { name: "OUTPUT",  syntax: "OUTPUT",            category: "io",         description: "Print the current value of AC.",                                  example: "output"        },
  { name: "HALT",    syntax: "HALT",              category: "control",    description: "Stop the program immediately.",                                   example: "halt"          },
  { name: "JUMP",    syntax: "JUMP X",            category: "control",    description: "Unconditionally set PC to label X.",                              example: "jump loop"     },
  { name: "SKIPCOND",syntax: "SKIPCOND 000/400/800", category: "control", description: "Skip the very next instruction if the condition on AC is true.", example: "skipcond 800"  },
  { name: "JNS",     syntax: "JNS X",            category: "control",    description: "Save return address at X, jump to X+1. Used for subroutines.",    example: "jns myFunc"    },
  { name: "JUMPI",   syntax: "JUMPI X",          category: "control",    description: "Indirect jump: PC = memory[X].",                                  example: "jumpi retAddr" },
  { name: "DEC",     syntax: "label, DEC n",     category: "data",       description: "Declare a memory cell with a decimal value.",                     example: "x, dec 42"     },
  { name: "HEX",     syntax: "label, HEX n",     category: "data",       description: "Declare a memory cell with a hexadecimal value.",                 example: "mask, hex FF"  },
];

const missions = [
  {
    id: "echo", title: "Echo Bot", difficulty: "Easy", xp: 10,
    objective: "Read a number from the user and print it straight back.",
    code: `start, input
       output
       halt`,
    steps: [
      { instr: "input",  ac: "→ user's value", pc: "0 → 1", note: "The program pauses. The user types a number. That number is stored in AC." },
      { instr: "output", ac: "(unchanged)",     pc: "1 → 2", note: "Print whatever is in AC right now — the user's number." },
      { instr: "halt",   ac: "(unchanged)",     pc: "2",     note: "Execution stops. Program is done." },
    ],
  },
  {
    id: "sum", title: "Two-Number Sum", difficulty: "Easy", xp: 15,
    objective: "Add constants x=7 and y=11, print the result (18).",
    code: `start, load x
       add y
       output
       halt
x, dec 7
y, dec 11`,
    steps: [
      { instr: "load x",  ac: "?? → 7",  pc: "0 → 1", note: "Fetch the value at label 'x' (7) into AC." },
      { instr: "add y",   ac: "7 → 18",  pc: "1 → 2", note: "Add the value at 'y' (11) to AC. 7 + 11 = 18." },
      { instr: "output",  ac: "18",       pc: "2 → 3", note: "Print 18." },
      { instr: "halt",    ac: "18",       pc: "3",     note: "Done." },
    ],
  },
  {
    id: "branch", title: "Branch Check", difficulty: "Medium", xp: 25,
    objective: "Print 1 if a value is positive, 0 otherwise.",
    code: `start, load value
       skipcond 800
       jump nonPos
       load posMsg
       output
       halt
nonPos, load zeroMsg
       output
       halt
value,  dec 5
posMsg, dec 1
zeroMsg,dec 0`,
    steps: [
      { instr: "load value",    ac: "?? → 5",     pc: "0 → 1", note: "AC becomes 5 — the number we're testing." },
      { instr: "skipcond 800",  ac: "5",           pc: "1 → 2", note: "Is AC > 0? Yes (5 > 0). So skip the very next instruction." },
      { instr: "jump nonPos",   ac: "5",           pc: "SKIPPED", note: "Skipped! Because skipcond was satisfied, we skip this jump." },
      { instr: "load posMsg",   ac: "5 → 1",       pc: "3 → 4", note: "AC = 1, our 'positive' marker." },
      { instr: "output",        ac: "1",           pc: "4 → 5", note: "Print 1." },
      { instr: "halt",          ac: "1",           pc: "5",     note: "Done. If value were ≤ 0, we'd have jumped to nonPos and printed 0 instead." },
    ],
  },
  {
    id: "loop", title: "Count Down", difficulty: "Medium", xp: 30,
    objective: "Output 3, 2, 1 using a loop.",
    code: `start, load counter
loop,  output
       subt one
       store counter
       skipcond 400
       jump loop
       halt
counter, dec 3
one,     dec 1`,
    steps: [
      { instr: "load counter", ac: "?? → 3", pc: "0 → 1", note: "Load the starting counter (3) into AC." },
      { instr: "output",       ac: "3",       pc: "1 → 2", note: "Print current value — outputs 3 on first pass." },
      { instr: "subt one",     ac: "3 → 2",   pc: "2 → 3", note: "Subtract 1. AC = 2." },
      { instr: "store counter",ac: "2",        pc: "3 → 4", note: "Write the new value back to memory so next loop sees it." },
      { instr: "skipcond 400", ac: "2",        pc: "4 → 5", note: "Is AC == 0? No (2 ≠ 0). Don't skip — fall through to JUMP." },
      { instr: "jump loop",    ac: "2",        pc: "5 → 1", note: "Go back to 'loop'. Repeats printing 2, then 1." },
      { instr: "halt",         ac: "0",        pc: "6",     note: "When counter hits 0, skipcond 400 is true → jump is skipped → we land here." },
    ],
  },
];

const skipcondGuide = {
  "000": { meaning: "Skip the next instruction when AC is negative",     logic: "AC < 0",  color: "#cf6032" },
  "400": { meaning: "Skip the next instruction when AC equals zero",     logic: "AC == 0", color: "#b08b22" },
  "800": { meaning: "Skip the next instruction when AC is positive",     logic: "AC > 0",  color: "#2f8477" },
};

const quizItems = [
  { id: "q1", question: "Which instruction stops execution?",         options: ["STORE", "HALT", "JUMP", "CLEAR"],                         answer: "HALT",                explanation: "HALT is the dedicated stop instruction in MARIE." },
  { id: "q2", question: "What does skipcond 400 test?",               options: ["AC < 0", "AC == 0", "AC > 0", "AC != 0"],                  answer: "AC == 0",             explanation: "Condition code 400 maps to equality with zero." },
  { id: "q3", question: "Which instruction reads user input?",         options: ["LOAD", "INPUT", "READ", "FETCH"],                          answer: "INPUT",               explanation: "INPUT pauses and waits for the user to type a number into AC." },
  { id: "q4", question: "What does LOAD X do?",                        options: ["Copy AC to X", "Copy memory[X] to AC", "Jump to X", "Add X to AC"], answer: "Copy memory[X] to AC", explanation: "LOAD fetches a value from memory into the Accumulator." },
  { id: "q5", question: "To loop, you combine SKIPCOND with:",         options: ["HALT", "STORE", "JUMP", "INPUT"],                          answer: "JUMP",                explanation: "SKIPCOND decides whether to skip the next line. Pair it with JUMP to control loops." },
  { id: "q6", question: "DEC 42 is used to:",                          options: ["Jump to line 42", "Subtract 42", "Declare a variable = 42", "Skip 42 lines"], answer: "Declare a variable = 42", explanation: "DEC defines a memory location holding a decimal constant." },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function MissionTrace({ steps }) {
  const [idx, setIdx] = useState(0);
  const s = steps[idx];

  return (
    <div className="trace-panel">
      <div className="trace-registers">
        <div className="trace-reg trace-reg-ac">
          <span className="trace-reg-label">AC</span>
          <span className="trace-reg-value">{s.ac}</span>
        </div>
        <div className="trace-reg trace-reg-pc">
          <span className="trace-reg-label">PC</span>
          <span className="trace-reg-value">{s.pc}</span>
        </div>
      </div>
      <div className="trace-current">
        <span className="trace-exec-label">Executing</span>
        <code className="trace-instr">{s.instr}</code>
      </div>
      <p className="trace-note">{s.note}</p>
      <div className="trace-nav">
        <button type="button" disabled={idx === 0} onClick={() => setIdx(i => i - 1)}>← Prev</button>
        <div className="trace-dots">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Step ${i + 1}`}
              className={`trace-dot ${i === idx ? "trace-dot-active" : ""}`}
              onClick={() => setIdx(i)}
            />
          ))}
        </div>
        <button type="button" disabled={idx === steps.length - 1} onClick={() => setIdx(i => i + 1)}>Next →</button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function TutorialPage() {
  const [activeMissionId, setActiveMissionId] = useState(missions[0].id);
  const [copiedId, setCopiedId] = useState("");
  const [skipcondValue, setSkipcondValue] = useState("800");
  const [quizAnswers, setQuizAnswers] = useState({});
  const [activeCategory, setActiveCategory] = useState("all");
  const [completedMissions, setCompletedMissions] = useState(new Set());
  const [showTrace, setShowTrace] = useState(false);

  const activeMission = useMemo(
    () => missions.find(m => m.id === activeMissionId),
    [activeMissionId]
  );

  const filteredInstructions = useMemo(
    () => activeCategory === "all"
      ? instructionRef
      : instructionRef.filter(i => i.category === activeCategory),
    [activeCategory]
  );

  const totalXP = [...completedMissions].reduce((sum, id) => {
    const m = missions.find(m => m.id === id);
    return sum + (m?.xp ?? 0);
  }, 0);

  const maxXP = missions.reduce((sum, m) => sum + m.xp, 0);

  const quizScore = Object.entries(quizAnswers).filter(([id, ans]) => {
    const q = quizItems.find(q => q.id === id);
    return q?.answer === ans;
  }).length;

  function handleCopy(code, id) {
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopiedId(id);
        setCompletedMissions(prev => new Set([...prev, id]));
        window.setTimeout(() => setCopiedId(""), 1600);
      })
      .catch(() => setCopiedId(""));
  }

  function handleMissionSelect(id) {
    setActiveMissionId(id);
    setShowTrace(false);
  }

  return (
    <main className="tutorial-page">

      {/* ── Hero ── */}
      <section className="tutorial-hero">
        <div className="tutorial-hero-content">
          <p className="tutorial-kicker">MARIE Learning Lab</p>
          <h1>Learn MARIE Assembly</h1>
          <p className="tutorial-subtitle">
            Interactive missions, step-by-step traces, and quick challenges — built for students who are just getting started.
          </p>
          <div className="tutorial-hero-actions">
            <Link to="/" className="tutorial-primary-link">Open Editor</Link>
            <a href="#missions" className="tutorial-secondary-link">Start Learning ↓</a>
          </div>
        </div>
        <div className="tutorial-xp-card">
          <div className="xp-ring">
            <svg viewBox="0 0 64 64" className="xp-ring-svg">
              <circle cx="32" cy="32" r="28" className="xp-ring-bg" />
              <circle
                cx="32" cy="32" r="28"
                className="xp-ring-fill"
                style={{ strokeDashoffset: 176 - (176 * totalXP) / maxXP }}
              />
            </svg>
            <span className="xp-number">{totalXP}</span>
          </div>
          <div className="xp-label">XP Earned</div>
          <div className="xp-missions">{completedMissions.size} / {missions.length} missions</div>
        </div>
      </section>

      {/* ── What is MARIE ── */}
      <section className="tutorial-section">
        <h2>0. What is MARIE?</h2>
        <p>
          MARIE stands for <strong>Machine Architecture that is Really Intuitive and Easy</strong>. It's a simplified CPU designed to teach how computers work at the lowest level — fetch an instruction, decode it, execute it, repeat.
        </p>
        <div className="marie-registers-grid">
          {[
            { name: "AC",  full: "Accumulator",        desc: "The main working register. Nearly every operation reads from or writes to AC." },
            { name: "PC",  full: "Program Counter",     desc: "Holds the address of the next instruction to run. Auto-increments each step." },
            { name: "MAR", full: "Memory Address Reg",  desc: "Temporarily holds the address being accessed during a LOAD or STORE." },
            { name: "MBR", full: "Memory Buffer Reg",   desc: "Temporarily holds data travelling between the CPU and memory." },
            { name: "IR",  full: "Instruction Register",desc: "Holds the instruction currently being decoded and executed." },
          ].map(reg => (
            <div key={reg.name} className="reg-info-card">
              <span className="reg-info-name">{reg.name}</span>
              <span className="reg-info-full">{reg.full}</span>
              <p>{reg.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Instruction Reference ── */}
      <section className="tutorial-section">
        <h2>1. Instruction Reference</h2>
        <p>Every MARIE instruction you will ever use. Filter by category to focus.</p>
        <div className="category-filter">
          <button
            type="button"
            className={activeCategory === "all" ? "cat-btn cat-btn-active" : "cat-btn"}
            onClick={() => setActiveCategory("all")}
          >All</button>
          {Object.entries(CAT).map(([key, { label, color }]) => (
            <button
              key={key}
              type="button"
              className={activeCategory === key ? "cat-btn cat-btn-active" : "cat-btn"}
              style={activeCategory === key ? { background: color, borderColor: color, color: "#fff" } : {}}
              onClick={() => setActiveCategory(key)}
            >{label}</button>
          ))}
        </div>
        <div className="instr-grid">
          {filteredInstructions.map(instr => (
            <div key={instr.name} className="instr-card">
              <div className="instr-card-top">
                <span className="instr-name">{instr.name}</span>
                <span className="instr-badge" style={{ background: CAT[instr.category].color }}>
                  {CAT[instr.category].label}
                </span>
              </div>
              <code className="instr-syntax">{instr.syntax}</code>
              <p className="instr-desc">{instr.description}</p>
              <div className="instr-example">
                <span className="instr-eg">e.g.</span>
                <code>{instr.example}</code>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Missions ── */}
      <section id="missions" className="tutorial-section">
        <h2>2. Missions</h2>
        <p>Pick a mission. Step through the trace to see what each instruction does, then copy it to the editor and run it yourself.</p>

        <div className="tutorial-card-grid">
          {missions.map(m => (
            <button
              key={m.id}
              type="button"
              className={[
                "mission-card",
                activeMissionId === m.id ? "mission-card-active" : "",
                completedMissions.has(m.id) ? "mission-card-done" : "",
              ].join(" ")}
              onClick={() => handleMissionSelect(m.id)}
            >
              {completedMissions.has(m.id) && <span className="mission-done-tick">✓</span>}
              <span className="mission-difficulty">{m.difficulty}</span>
              <h3>{m.title}</h3>
              <p>{m.objective}</p>
              <span className="mission-xp">+{m.xp} XP</span>
            </button>
          ))}
        </div>

        <article className="code-lab">
          <header className="code-lab-header">
            <div>
              <h3>{activeMission.title}</h3>
              <p>{activeMission.objective}</p>
            </div>
            <button
              type="button"
              className={`trace-toggle-btn ${showTrace ? "trace-toggle-on" : ""}`}
              onClick={() => setShowTrace(v => !v)}
            >
              {showTrace ? "Hide Trace" : "▶ Step Through"}
            </button>
          </header>

          <div className={`code-lab-body ${showTrace ? "code-lab-split" : ""}`}>
            <pre><code>{activeMission.code}</code></pre>
            {showTrace && <MissionTrace key={activeMission.id} steps={activeMission.steps} />}
          </div>

          <div className="code-lab-actions">
            <button type="button" onClick={() => handleCopy(activeMission.code, activeMission.id)}>
              {copiedId === activeMission.id ? "Copied ✓" : "Copy Code"}
            </button>
            <Link to="/">Run in Editor →</Link>
          </div>
        </article>
      </section>

      {/* ── SKIPCOND Decoder ── */}
      <section className="tutorial-section">
        <h2>3. SKIPCOND Decoder</h2>
        <p>SKIPCOND skips exactly <em>one</em> instruction when its condition is met. Pick a code and see what it tests.</p>
        <div className="skipcond-panel">
          <div className="skipcond-options">
            {Object.entries(skipcondGuide).map(([value, info]) => (
              <button
                type="button"
                key={value}
                className={skipcondValue === value ? "skipcond-btn skipcond-active" : "skipcond-btn"}
                style={skipcondValue === value ? { background: info.color, borderColor: info.color, color: "#fff" } : {}}
                onClick={() => setSkipcondValue(value)}
              >
                skipcond {value}
              </button>
            ))}
          </div>
          <div className="skipcond-result">
            <div className="skipcond-logic-box" style={{ borderColor: skipcondGuide[skipcondValue].color }}>
              <code style={{ color: skipcondGuide[skipcondValue].color, fontSize: "1.6rem", fontWeight: 700 }}>
                {skipcondGuide[skipcondValue].logic}
              </code>
            </div>
            <p className="skipcond-meaning">{skipcondGuide[skipcondValue].meaning}</p>
            <p className="skipcond-tip">
              <strong>Tip:</strong> put a <code>JUMP</code> on the line right after SKIPCOND.
              If the condition is true the JUMP is skipped (falls through); if false the JUMP runs (loops or branches).
            </p>
          </div>
        </div>
      </section>

      {/* ── Quiz ── */}
      <section className="tutorial-section">
        <h2>4. Quick Quiz</h2>
        <div className="quiz-score-bar">
          <span className="quiz-score-text">{quizScore} / {quizItems.length} correct</span>
          <div className="quiz-score-track">
            <div
              className="quiz-score-fill"
              style={{ width: `${(quizScore / quizItems.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="quiz-list">
          {quizItems.map((quiz, index) => {
            const selected = quizAnswers[quiz.id];
            const correct = selected === quiz.answer;
            return (
              <article
                key={quiz.id}
                className={[
                  "quiz-card",
                  selected ? (correct ? "quiz-card-correct" : "quiz-card-wrong") : "",
                ].join(" ")}
              >
                <h3>Q{index + 1}. {quiz.question}</h3>
                <div className="quiz-options">
                  {quiz.options.map(option => (
                    <button
                      key={option}
                      type="button"
                      disabled={!!selected}
                      className={[
                        selected === option ? "quiz-selected" : "",
                        selected && option === quiz.answer ? "quiz-correct-option" : "",
                      ].join(" ")}
                      onClick={() => setQuizAnswers(prev => ({ ...prev, [quiz.id]: option }))}
                    >{option}</button>
                  ))}
                </div>
                {selected && (
                  <p className={correct ? "quiz-feedback-ok" : "quiz-feedback-bad"}>
                    {correct ? "Correct!" : `Not quite — the answer is "${quiz.answer}".`} {quiz.explanation}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* ── Golden Rules ── */}
      <section className="tutorial-section tutorial-checklist">
        <h2>5. Golden Rules</h2>
        <ul>
          <li>Every jump target needs a <strong>label</strong> followed by a comma.</li>
          <li>Every runnable program must end with <strong>HALT</strong>.</li>
          <li>SKIPCOND skips <em>one</em> line — pair it with JUMP to branch or loop.</li>
          <li>Declare variables with <strong>DEC</strong> or <strong>HEX</strong> at the bottom of your program.</li>
          <li>AC is your only scratchpad — use <strong>STORE</strong> when you need to save a value.</li>
          <li>Test one change at a time and read error messages carefully.</li>
        </ul>
        <Link to="/" className="tutorial-primary-link">Back to Editor →</Link>
      </section>

    </main>
  );
}

export default TutorialPage;

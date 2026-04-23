import { Drawer } from "antd";

// ─── Layout constants ─────────────────────────────────────────────────────────

const NODES = {
  PC:     { x: 25,  y: 20,  w: 80, h: 36, label: 'PC',     sub: '12-bit',  regKey: 'PC'  },
  MAR:    { x: 25,  y: 155, w: 80, h: 36, label: 'MAR',    sub: '12-bit',  regKey: 'MAR' },
  IR:     { x: 25,  y: 300, w: 80, h: 36, label: 'IR',     sub: '16-bit',  regKey: 'IR'  },
  MBR:    { x: 200, y: 180, w: 80, h: 36, label: 'MBR',    sub: '16-bit',  regKey: 'MBR' },
  ALU:    { x: 200, y: 285, w: 80, h: 50, label: 'ALU',    sub: '',        regKey: null  },
  AC:     { x: 360, y: 180, w: 80, h: 36, label: 'AC',     sub: '16-bit',  regKey: 'AC'  },
  MEMORY: { x: 360, y: 20,  w: 80, h: 120,label: 'Memory', sub: '4096×16', regKey: null  },
  INPUT:  { x: 360, y: 305, w: 80, h: 36, label: 'INPUT',  sub: '',        regKey: null  },
  OUTPUT: { x: 360, y: 360, w: 80, h: 36, label: 'OUTPUT', sub: '',        regKey: null  },
};

// Helper: center x/y, and edge accessors
const cx   = (id) => NODES[id].x + NODES[id].w / 2;
const cy   = (id) => NODES[id].y + NODES[id].h / 2;
const top  = (id) => ({ x: cx(id),              y: NODES[id].y });
const bot  = (id) => ({ x: cx(id),              y: NODES[id].y + NODES[id].h });
const lft  = (id) => ({ x: NODES[id].x,         y: cy(id) });
const rgt  = (id) => ({ x: NODES[id].x + NODES[id].w, y: cy(id) });

// ─── Connection paths ─────────────────────────────────────────────────────────
// Each path is a SVG `d` string. Paths are carefully routed to avoid overlap.

const PATHS = {
  // Fetch cycle
  pc_to_mar:  `M${top('MAR').x},${bot('PC').y} L${top('MAR').x},${top('MAR').y}`,
  mar_to_mem: `M${rgt('MAR').x},${rgt('MAR').y} C185,${rgt('MAR').y} 185,${cy('MEMORY')} ${lft('MEMORY').x},${cy('MEMORY')}`,
  mem_to_mbr: `M${bot('MEMORY').x},${bot('MEMORY').y} C${bot('MEMORY').x},163 ${top('MBR').x},163 ${top('MBR').x},${top('MBR').y}`,

  // Decode
  ir_to_mar:  `M${rgt('IR').x},${rgt('IR').y - 8} C148,${rgt('IR').y - 8} 148,${rgt('MAR').y} ${rgt('MAR').x},${rgt('MAR').y}`,

  // Execute — IR address → MAR  (same visual as decode ir_to_mar, just different color)
  // mbr_to_ir used in fetch (IR ← MBR)
  mbr_to_ir:  `M${lft('MBR').x},${lft('MBR').y + 6} C140,${lft('MBR').y + 6} 140,${rgt('IR').y} ${rgt('IR').x},${rgt('IR').y}`,

  // JNS: PC → MBR
  pc_to_mbr:  `M${rgt('PC').x},${rgt('PC').y} C200,${rgt('PC').y} ${top('MBR').x},100 ${top('MBR').x},${top('MBR').y}`,

  // MBR → Memory (write)
  mbr_to_mem: `M${top('MBR').x},${top('MBR').y} C${top('MBR').x},157 ${bot('MEMORY').x},157 ${bot('MEMORY').x},${bot('MEMORY').y}`,

  // MBR ↔ AC  (slightly offset so both directions are visible)
  mbr_to_ac:  `M${rgt('MBR').x},${rgt('MBR').y - 4} L${lft('AC').x},${lft('AC').y - 4}`,
  ac_to_mbr:  `M${lft('AC').x},${lft('AC').y + 4} L${rgt('MBR').x},${rgt('MBR').y + 4}`,

  // ALU paths
  mbr_to_alu: `M${bot('MBR').x},${bot('MBR').y} L${top('ALU').x},${top('ALU').y}`,
  ac_to_alu:  `M${bot('AC').x},${bot('AC').y} C415,${bot('AC').y} 415,${cy('ALU')} ${rgt('ALU').x},${cy('ALU')}`,
  alu_to_ac:  `M${rgt('ALU').x},${cy('ALU') - 8} C${rgt('AC').x - 25},${cy('ALU') - 8} ${rgt('AC').x - 15},${bot('AC').y + 8} ${bot('AC').x},${bot('AC').y}`,

  // I/O
  in_to_ac:   `M${top('INPUT').x},${top('INPUT').y} L${bot('AC').x},${bot('AC').y}`,
  ac_to_out:  `M${rgt('AC').x},${rgt('AC').y} L458,${rgt('AC').y} L458,${rgt('OUTPUT').y} L${rgt('OUTPUT').x},${rgt('OUTPUT').y}`,

  // Jump: IR → PC (route via right side)
  ir_to_pc:   `M${rgt('IR').x},${rgt('IR').y} L135,${rgt('IR').y} L135,${rgt('PC').y} L${rgt('PC').x},${rgt('PC').y}`,

  // JUMPI / ADDI / LOADI: MBR → PC
  mbr_to_pc:  `M${top('MBR').x - 6},${top('MBR').y} C${top('MBR').x - 6},100 130,${rgt('PC').y} ${rgt('PC').x},${rgt('PC').y}`,

  // Indirect: MBR → MAR
  mbr_to_mar: `M${lft('MBR').x},${lft('MBR').y - 6} C150,${lft('MBR').y - 6} 150,${rgt('MAR').y} ${rgt('MAR').x},${rgt('MAR').y}`,

  // JNS: PC → MBR path (MBR ← PC)
  pc_to_mbr_v2: `M${rgt('PC').x},${rgt('PC').y + 4} C205,${rgt('PC').y + 4} ${top('MBR').x + 6},105 ${top('MBR').x + 6},${top('MBR').y}`,
};

// ─── Active path map ──────────────────────────────────────────────────────────
// Maps RTL description regex → { paths[], nodes[] }
// Paths array uses PATHS keys; nodes array uses NODES keys.

const ACTIVE_MAP = [
  // Fetch
  { re: /^MAR ← PC$/,          paths: ['pc_to_mar'],                          nodes: ['PC','MAR']              },
  { re: /^MBR ← M\[MAR\]$/,    paths: ['mar_to_mem','mem_to_mbr'],            nodes: ['MAR','MEMORY','MBR']    },
  { re: /^IR ← MBR$/,          paths: ['mbr_to_ir'],                          nodes: ['MBR','IR']              },
  // Decode
  { re: /^MAR ← IR/,           paths: ['ir_to_mar'],                          nodes: ['IR','MAR']              },
  { re: /^PC ← PC \+ 1$/,      paths: [],                                     nodes: ['PC']                    },
  // Execute — memory address load (same visual as decode but execute color)
  { re: /^MAR ← 0x/,           paths: ['ir_to_mar'],                          nodes: ['IR','MAR']              },
  // Execute — register transfers
  { re: /^AC ← MBR$/,          paths: ['mbr_to_ac'],                          nodes: ['MBR','AC']              },
  { re: /^MBR ← AC$/,          paths: ['ac_to_mbr'],                          nodes: ['AC','MBR']              },
  { re: /^M\[MAR\] ← MBR$/,    paths: ['mbr_to_mem'],                         nodes: ['MBR','MAR','MEMORY']    },
  { re: /^AC ← AC [+−] MBR$/,  paths: ['mbr_to_alu','ac_to_alu','alu_to_ac'],nodes: ['MBR','AC','ALU']        },
  { re: /^AC ← IN$/,           paths: ['in_to_ac'],                           nodes: ['INPUT','AC']            },
  { re: /^OUT ← AC$/,          paths: ['ac_to_out'],                          nodes: ['AC','OUTPUT']           },
  { re: /^PC ← 0x/,            paths: ['ir_to_pc'],                           nodes: ['IR','PC']               },
  { re: /^PC ← MBR$/,          paths: ['mbr_to_pc'],                          nodes: ['MBR','PC']              },
  { re: /^MBR ← PC$/,          paths: ['pc_to_mbr_v2'],                       nodes: ['PC','MBR']              },
  { re: /^MAR ← MBR$/,         paths: ['mbr_to_mar'],                         nodes: ['MBR','MAR']             },
  { re: /^AC ← 0$/,            paths: [],                                     nodes: ['AC']                    },
  { re: /^SKIPCOND/,           paths: [],                                     nodes: ['AC','PC']               },
  { re: /^PC ← .+ \+ 1$/,      paths: [],                                     nodes: ['PC']                    },
  { re: /^Halt$/,               paths: [],                                     nodes: []                        },
];

// ─── Phase colors ─────────────────────────────────────────────────────────────

const PHASE_COLOR = {
  fetch:   '#4a9eff',
  decode:  '#f5a623',
  execute: '#52c41a',
};
const INACTIVE_COLOR  = '#2a2a3a';
const NODE_DEFAULT_BG = '#1a1a2e';
const NODE_BORDER     = '#383858';
const NODE_ACTIVE_BG  = '#12122a';
const TEXT_PRIMARY    = '#e0e0f0';
const TEXT_SECONDARY  = '#666688';
const TEXT_VALUE      = '#a0e0ff';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexVal(v, bits = 16) {
  const digits = bits <= 12 ? 3 : 4;
  return `0x${(v >>> 0).toString(16).toUpperCase().padStart(digits, '0')}`;
}

function resolveActive(description, phase) {
  if (!description) return { paths: new Set(), nodes: new Set() };
  for (const entry of ACTIVE_MAP) {
    if (entry.re.test(description)) {
      return {
        paths: new Set(entry.paths),
        nodes: new Set(entry.nodes),
        phase,
      };
    }
  }
  return { paths: new Set(), nodes: new Set(), phase };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NodeBox({ id, registers, activeNodes, activePhase }) {
  const node    = NODES[id];
  const isActive = activeNodes.has(id);
  const color   = isActive ? (PHASE_COLOR[activePhase] ?? PHASE_COLOR.execute) : NODE_BORDER;
  const regVal  = node.regKey != null ? registers[node.regKey] : null;
  const isALU   = id === 'ALU';
  const isMem   = id === 'MEMORY';

  // ALU rendered as a trapezoid
  if (isALU) {
    const { x, y, w, h } = node;
    const inset = 10;
    const points = `${x + inset},${y} ${x + w - inset},${y} ${x + w},${y + h} ${x},${y + h}`;
    return (
      <g>
        <polygon
          points={points}
          fill={isActive ? NODE_ACTIVE_BG : NODE_DEFAULT_BG}
          stroke={color}
          strokeWidth={isActive ? 1.8 : 1}
          style={isActive ? { filter: `drop-shadow(0 0 5px ${color}88)` } : undefined}
        />
        <text x={cx(id)} y={cy(id) + 1} textAnchor="middle" dominantBaseline="middle"
          fontSize="11" fontWeight="700" fill={isActive ? color : TEXT_PRIMARY} letterSpacing="0.5">
          ALU
        </text>
      </g>
    );
  }

  return (
    <g>
      <rect
        x={node.x} y={node.y} width={node.w} height={node.h} rx="5"
        fill={isActive ? NODE_ACTIVE_BG : NODE_DEFAULT_BG}
        stroke={color}
        strokeWidth={isActive ? 1.8 : 1}
        style={isActive ? { filter: `drop-shadow(0 0 6px ${color}99)` } : undefined}
      />
      {/* Label */}
      <text
        x={node.x + (isMem ? node.w / 2 : 10)} y={node.y + (isMem ? 16 : node.h / 2 - 4)}
        fontSize="10" fontWeight="700" letterSpacing="0.4"
        fill={isActive ? color : TEXT_PRIMARY}
        textAnchor={isMem ? 'middle' : 'start'}
        dominantBaseline={isMem ? 'auto' : 'middle'}
      >
        {node.label}
      </text>
      {/* Sub-label */}
      {node.sub && (
        <text
          x={node.x + (isMem ? node.w / 2 : 10)} y={node.y + (isMem ? 28 : node.h / 2 + 6)}
          fontSize="8" fill={TEXT_SECONDARY}
          textAnchor={isMem ? 'middle' : 'start'}
          dominantBaseline={isMem ? 'auto' : 'middle'}
        >
          {node.sub}
        </text>
      )}
      {/* Register value */}
      {regVal != null && (
        <text
          x={node.x + node.w - 6} y={node.y + node.h / 2}
          fontSize="9" fill={isActive ? TEXT_VALUE : TEXT_SECONDARY}
          textAnchor="end" dominantBaseline="middle" fontFamily="monospace"
        >
          {hexVal(regVal, node.sub.includes('12') ? 12 : 16)}
        </text>
      )}
      {/* Memory cell count indicator */}
      {isMem && (
        <text x={cx(id)} y={node.y + 48} fontSize="8" fill={TEXT_SECONDARY} textAnchor="middle">
          4096 words
        </text>
      )}
    </g>
  );
}

function Connection({ id, activePaths, activePhase }) {
  const d = PATHS[id];
  if (!d) return null;
  const isActive = activePaths.has(id);
  const color    = isActive ? (PHASE_COLOR[activePhase] ?? PHASE_COLOR.execute) : INACTIVE_COLOR;
  const markerId = isActive ? `arrow-${activePhase ?? 'execute'}` : 'arrow-inactive';

  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={isActive ? 2 : 1}
      strokeDasharray={isActive ? '7 4' : 'none'}
      strokeLinecap="round"
      strokeLinejoin="round"
      markerEnd={`url(#${markerId})`}
      style={isActive ? {
        animation: 'dp-dash 0.55s linear infinite',
        filter: `drop-shadow(0 0 3px ${color}88)`,
      } : undefined}
    />
  );
}

// ─── CPU boundary ─────────────────────────────────────────────────────────────

function CpuBoundary() {
  return (
    <g>
      <rect x="8" y="8" width="344" height="410" rx="8"
        fill="none" stroke="#252540" strokeWidth="1" strokeDasharray="5 4" />
      <text x="14" y="22" fontSize="8" fill="#333355" letterSpacing="1">CPU</text>
    </g>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  const items = [
    { color: PHASE_COLOR.fetch,   label: 'Fetch'   },
    { color: PHASE_COLOR.decode,  label: 'Decode'  },
    { color: PHASE_COLOR.execute, label: 'Execute' },
  ];
  return (
    <g transform="translate(14, 426)">
      {items.map(({ color, label }, i) => (
        <g key={label} transform={`translate(${i * 90}, 0)`}>
          <line x1="0" y1="4" x2="16" y2="4" stroke={color} strokeWidth="2"
            strokeDasharray="5 3" />
          <circle cx="8" cy="4" r="2.5" fill={color} />
          <text x="20" y="8" fontSize="9" fill={TEXT_SECONDARY}>{label}</text>
        </g>
      ))}
    </g>
  );
}

// ─── Arrow markers ────────────────────────────────────────────────────────────

function Markers() {
  const defs = [
    { id: 'arrow-inactive', fill: '#2a2a3a' },
    { id: 'arrow-fetch',    fill: PHASE_COLOR.fetch   },
    { id: 'arrow-decode',   fill: PHASE_COLOR.decode  },
    { id: 'arrow-execute',  fill: PHASE_COLOR.execute },
  ];
  return (
    <defs>
      {defs.map(({ id, fill }) => (
        <marker key={id} id={id} markerWidth="7" markerHeight="7"
          refX="5.5" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0.5 L0,5.5 L6,3 Z" fill={fill} />
        </marker>
      ))}
      <style>{`
        @keyframes dp-dash {
          from { stroke-dashoffset: 22; }
          to   { stroke-dashoffset: 0;  }
        }
      `}</style>
    </defs>
  );
}

// ─── Main diagram ─────────────────────────────────────────────────────────────

function DiagramSvg({ registers, latestEntry }) {
  const { paths: activePaths, nodes: activeNodes, phase: activePhase } =
    resolveActive(latestEntry?.description, latestEntry?.phase);

  return (
    <svg
      viewBox="0 0 470 445"
      width="100%"
      style={{ display: 'block', maxHeight: 'calc(100vh - 140px)' }}
      aria-label="MARIE data path diagram"
    >
      <Markers />
      <CpuBoundary />

      {/* Inactive paths first (background layer) */}
      {Object.keys(PATHS).filter(id => !activePaths.has(id)).map(id => (
        <Connection key={id} id={id} activePaths={activePaths} activePhase={activePhase} />
      ))}
      {/* Active paths on top */}
      {[...activePaths].map(id => (
        <Connection key={id} id={id} activePaths={activePaths} activePhase={activePhase} />
      ))}

      {/* Component boxes */}
      {Object.keys(NODES).map(id => (
        <NodeBox
          key={id}
          id={id}
          registers={registers}
          activeNodes={activeNodes}
          activePhase={activePhase}
        />
      ))}

      {/* Current RTL description overlay */}
      {latestEntry && (
        <g>
          <rect x="8" y="418" width="454" height="16" rx="4"
            fill={PHASE_COLOR[activePhase] ?? PHASE_COLOR.execute}
            opacity="0.12" />
          <text x="16" y="429" fontSize="9.5" fill={PHASE_COLOR[activePhase] ?? TEXT_SECONDARY}
            fontFamily="monospace">
            {latestEntry.description}
          </text>
        </g>
      )}

      <Legend />
    </svg>
  );
}

// ─── Drawer wrapper ───────────────────────────────────────────────────────────

export default function DataPathDiagram({ open, onClose, registers, latestEntry }) {
  return (
    <Drawer
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CpuSvgIcon />
          Data Path
        </span>
      }
      placement="right"
      width={490}
      open={open}
      onClose={onClose}
      styles={{
        body:   { padding: '12px 16px', background: '#0f0f1a' },
        header: { background: '#0f0f1a', borderBottom: '1px solid #1e1e30', padding: '12px 16px', color: TEXT_PRIMARY },
        mask:   { backdropFilter: 'blur(2px)' },
      }}
    >
      <DiagramSvg registers={registers} latestEntry={latestEntry} />
    </Drawer>
  );
}

// ─── Toolbar icon (exported for use in EditorToolbar) ─────────────────────────

export function CpuSvgIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} aria-hidden="true">
      <rect x="4" y="4" width="8" height="8" rx="1.5" />
      <rect x="0" y="5.5" width="3" height="1.5" rx="0.5" />
      <rect x="0" y="9" width="3" height="1.5" rx="0.5" />
      <rect x="13" y="5.5" width="3" height="1.5" rx="0.5" />
      <rect x="13" y="9" width="3" height="1.5" rx="0.5" />
      <rect x="5.5" y="0" width="1.5" height="3" rx="0.5" />
      <rect x="9" y="0" width="1.5" height="3" rx="0.5" />
      <rect x="5.5" y="13" width="1.5" height="3" rx="0.5" />
      <rect x="9" y="13" width="1.5" height="3" rx="0.5" />
    </svg>
  );
}

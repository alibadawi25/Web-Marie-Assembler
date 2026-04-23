export default function StatsBar({ stats, visible }) {
  if (!visible) return null;

  return (
    <div className="stats-bar">
      <StatPill label="Instructions" value={stats.instructionCount} />
      <span className="stats-divider" />
      <StatPill label="Cycles" value={stats.cycleCount} />
      <span className="stats-divider" />
      <StatPill label="Mem Reads" value={stats.memoryReads} color="blue" />
      <span className="stats-divider" />
      <StatPill label="Mem Writes" value={stats.memoryWrites} color="amber" />
      {stats.inputOps > 0 && (
        <>
          <span className="stats-divider" />
          <StatPill label="IN" value={stats.inputOps} />
        </>
      )}
      {stats.outputOps > 0 && (
        <>
          <span className="stats-divider" />
          <StatPill label="OUT" value={stats.outputOps} />
        </>
      )}
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <span className={`stats-pill${color ? ` stats-pill--${color}` : ''}`}>
      <span className="stats-pill-label">{label}</span>
      <span className="stats-pill-value">{value}</span>
    </span>
  );
}

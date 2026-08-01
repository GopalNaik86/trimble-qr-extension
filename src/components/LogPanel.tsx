import type { LogEntry } from "../types/assembly";

export function LogPanel({ entries }: { entries: LogEntry[] }) {
  return (
    <div className="log-panel" aria-live="polite">
      {entries.length === 0 && <div className="log-empty">Logs will appear here.</div>}
      {entries.map((entry) => (
        <div key={entry.id} className={`log-line log-${entry.level}`}>
          <span className="log-time">{entry.timestamp}</span>
          <span className="log-message">{entry.message}</span>
        </div>
      ))}
    </div>
  );
}

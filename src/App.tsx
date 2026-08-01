import { useCallback, useRef, useState } from "react";
import { LogPanel } from "./components/LogPanel";
import { runAssemblyWorkflow } from "./services/AssemblyWorkflow";
import { AssemblyWorkflowError, FRIENDLY_MESSAGES } from "./services/errors";
import type { AssemblyRequest, LogEntry } from "./types/assembly";

export default function App() {
  const [trimbleUrl, setTrimbleUrl] = useState("");
  const [assembly, setAssembly] = useState("B110");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const nextLogId = useRef(0);

  const addLog = useCallback((message: string, level: LogEntry["level"] = "info") => {
    setLogs((prev) => [
      ...prev,
      {
        id: nextLogId.current++,
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
      },
    ]);
  }, []);

  const handleOpenAssembly = useCallback(async () => {
    setError(null);
    setLogs([]);
    setIsRunning(true);

    // This is exactly the payload a future QR code will encode -
    // see AssemblyRequest / AssemblyWorkflow for where this plugs in.
    const request: AssemblyRequest = {
      trimbleUrl: trimbleUrl.trim(),
      assembly: assembly.trim(),
    };

    try {
      await runAssemblyWorkflow(request, (message) => addLog(message));
    } catch (err) {
      const workflowError =
        err instanceof AssemblyWorkflowError
          ? err
          : new AssemblyWorkflowError("UNKNOWN", String(err));
      addLog(workflowError.message, "error");
      setError(FRIENDLY_MESSAGES[workflowError.code]);
    } finally {
      setIsRunning(false);
    }
  }, [trimbleUrl, assembly, addLog]);

  const canSubmit = trimbleUrl.trim().length > 0 && assembly.trim().length > 0;

  return (
    <div className="app">
      <header className="app-header">
        <h1>QR Assembly Viewer</h1>
        <p className="app-subtitle">
          Paste the link a QR code would carry, then run the same workflow a scan
          will trigger.
        </p>
      </header>

      <form
        className="assembly-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!isRunning && canSubmit) void handleOpenAssembly();
        }}
      >
        <label className="field">
          <span>Trimble Connect Link</span>
          <input
            value={trimbleUrl}
            onChange={(e) => setTrimbleUrl(e.target.value)}
            placeholder="https://web.connect.trimble.com/project/..."
            disabled={isRunning}
          />
        </label>

        <label className="field">
          <span>Assembly Mark</span>
          <input
            value={assembly}
            onChange={(e) => setAssembly(e.target.value)}
            placeholder="B110"
            disabled={isRunning}
          />
        </label>

        <button type="submit" disabled={isRunning || !canSubmit}>
          {isRunning ? "Working..." : "Open Assembly"}
        </button>
      </form>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      <LogPanel entries={logs} />
    </div>
  );
}

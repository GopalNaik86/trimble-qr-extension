/**
 * The payload that a future QR code will encode.
 *
 * Today these two fields are typed in manually via the form. Once QR
 * scanning is added, a scanned code is parsed into this same shape and
 * passed straight into `runAssemblyWorkflow` - nothing else in the app
 * needs to change.
 *
 * `trimbleUrl` is the exact link Trimble Connect generates from
 * "Generate QR Code" / "Copy Link" (e.g.
 * https://web.connect.trimble.com/project/xxxxxxxxxxxxxxxxxxxxxxxx) - it
 * already identifies the correct project (and, via Trimble Connect's own
 * last-viewed state, the correct model), so no separate project/model
 * fields are needed.
 */
export interface AssemblyRequest {
  trimbleUrl: string;
  assembly: string;
}

/** A single line item shown in the on-screen log panel. */
export interface LogEntry {
  id: number;
  timestamp: string;
  level: "info" | "success" | "error";
  message: string;
}

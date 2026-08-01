/**
 * Typed errors so the UI can show a friendly, specific message
 * instead of a raw exception dump.
 */
export type AssemblyErrorCode =
  | "INVALID_URL"
  | "VIEWER_NOT_READY"
  | "AUTH_FAILED"
  | "MODEL_NOT_FOUND"
  | "ASSEMBLY_NOT_FOUND"
  | "UNKNOWN";

export class AssemblyWorkflowError extends Error {
  code: AssemblyErrorCode;

  constructor(code: AssemblyErrorCode, message: string) {
    super(message);
    this.name = "AssemblyWorkflowError";
    this.code = code;
  }
}

/** User-facing copy for each error code. Kept separate from the throw sites. */
export const FRIENDLY_MESSAGES: Record<AssemblyErrorCode, string> = {
  INVALID_URL:
    "That doesn't look like a Trimble Connect link. Paste the exact link from Trimble Connect's \"Copy Link\" or \"Generate QR Code\" action.",
  VIEWER_NOT_READY:
    "The 3D Viewer isn't ready yet. Keep this extension open inside Trimble Connect's 3D Viewer and try again.",
  AUTH_FAILED:
    "Trimble Connect couldn't authenticate this extension. Reopen it from inside Trimble Connect.",
  MODEL_NOT_FOUND:
    "No loaded model was found. Make sure this extension is open inside the 3D Viewer for the project that link points to.",
  ASSEMBLY_NOT_FOUND:
    "No object with that Assembly Mark was found in the loaded model(s). Double-check the Assembly value.",
  UNKNOWN: "Something went wrong. See the log below for details.",
};

/** Normalizes any thrown value into an AssemblyWorkflowError. */
export function toAssemblyError(err: unknown): AssemblyWorkflowError {
  if (err instanceof AssemblyWorkflowError) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new AssemblyWorkflowError("UNKNOWN", message);
}

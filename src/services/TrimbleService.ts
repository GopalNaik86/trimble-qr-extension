import * as WorkspaceAPI from "trimble-connect-workspace-api";
import type { WorkspaceAPI as WorkspaceAPIType } from "trimble-connect-workspace-api";
import { AssemblyWorkflowError } from "./errors";

export type LogFn = (message: string) => void;

/**
 * Owns the connection to the Trimble Connect Workspace API.
 *
 * This app is meant to run as a Trimble Connect 3D Extension - i.e. it is
 * loaded inside Trimble Connect's 3D Viewer in an iframe, and Trimble
 * Connect itself is `window.parent`. See:
 * https://components.connect.trimble.com/trimble-connect-workspace-api/index.html#1-extensions
 *
 * Because this runs as an extension (not an embedded/standalone iframe),
 * Trimble Connect manages the user session for us - there's no access
 * token or login flow to build here.
 */
export class TrimbleService {
  private api: WorkspaceAPIType | null = null;
  private connecting: Promise<WorkspaceAPIType> | null = null;

  constructor(private readonly log: LogFn) {}

  /**
   * Connects to the host Trimble Connect application.
   * Safe to call multiple times - the connection is cached.
   */
  async connect(): Promise<WorkspaceAPIType> {
    if (this.api) return this.api;
    if (this.connecting) return this.connecting;

    this.connecting = (async () => {
      try {
        // WorkspaceAPI.connect() - documented "Connecting to the API" step
        // for 3D Extensions. window.parent is Trimble Connect itself.
        const api = await WorkspaceAPI.connect(
          window.parent,
          (event: string, data: unknown) => {
            // Central place to see every event coming from Trimble Connect.
            // Individual services subscribe to the ones they care about
            // via onEvent() below.
            this.dispatch(event, data);
          },
          15000,
        );
            console.log("Workspace API:", api);
    console.log("Viewer API:", api.viewer);
    console.log("Inside iframe:", window.parent !== window);

    if (!api.viewer) {
      throw new AssemblyWorkflowError(
        "VIEWER_NOT_READY",
        window.parent === window
          ? "The application is running as a standalone webpage. Open it inside the Trimble Connect 3D Viewer."
          : "Connected to Trimble Connect, but the Viewer API is unavailable. Ensure this application is registered and opened as a 3D Extension.",
      );
    }

    this.api = api;
    this.log("Connected to the Trimble Connect 3D Viewer.");
    return api;
      } catch (err) {
        throw new AssemblyWorkflowError(
          "VIEWER_NOT_READY",
          `Failed to connect to Trimble Connect Workspace API: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      } finally {
        this.connecting = null;
      }
    })();

    return this.connecting;
  }

  getApi(): WorkspaceAPIType {
    if (!this.api) {
      throw new AssemblyWorkflowError(
        "VIEWER_NOT_READY",
        "Not connected to Trimble Connect yet.",
      );
    }
    return this.api;
  }

  // --- simple pub/sub so multiple services can listen to viewer events ---

  private listeners = new Set<(event: string, data: unknown) => void>();

  onEvent(handler: (event: string, data: unknown) => void): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  private dispatch(event: string, data: unknown) {
    for (const listener of this.listeners) listener(event, data);
  }
}

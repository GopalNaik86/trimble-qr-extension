import type { ModelSpec } from "trimble-connect-workspace-api";
import type { TrimbleService } from "./TrimbleService";
import { AssemblyWorkflowError } from "./errors";

const MODEL_LOAD_TIMEOUT_MS = 60000;

/**
 * Waits for the 3D Viewer to finish loading the model(s) implied by the
 * Trimble Connect link that was just opened.
 *
 * There's no separate model ID to load here - the link identifies the
 * project, and Trimble Connect restores whichever model(s) were last open
 * in that project's 3D Viewer on its own. This service just waits until
 * that's actually finished before the caller starts searching for objects.
 */
export class ViewerService {
  constructor(private readonly trimble: TrimbleService) {}

  async waitUntilLoaded(): Promise<void> {
    const api = this.trimble.getApi();

    // ViewerAPI.getModels - documented method to list models and their
    // load state. Check first in case a model already finished loading
    // before we start listening for the state-changed event below.
    const models: ModelSpec[] = await api.viewer.getModels();
    if (models.some((m) => m.state === "loaded")) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        unsubscribe();
        reject(
          new AssemblyWorkflowError(
            "MODEL_NOT_FOUND",
            "Timed out waiting for the viewer to finish loading a model.",
          ),
        );
      }, MODEL_LOAD_TIMEOUT_MS);

      // viewer.onModelStateChanged - documented event fired when a
      // model's loaded/unloaded state changes.
      const unsubscribe = this.trimble.onEvent((event, data) => {
        if (event !== "viewer.onModelStateChanged") return;
        const spec = (data as { data?: ModelSpec })?.data;
        if (spec?.state === "loaded") {
          clearTimeout(timer);
          unsubscribe();
          resolve();
        }
      });
    });
  }
}

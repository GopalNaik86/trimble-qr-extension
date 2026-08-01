import type { TrimbleService } from "./TrimbleService";
import type { FoundAssembly } from "./PropertyService";

/**
 * Handles selecting the found assembly object and isolating it, i.e.
 * hiding every other object in the viewer - equivalent to the viewer's
 * built-in "Show only selected objects" feature.
 */
export class SelectionService {
  constructor(private readonly trimble: TrimbleService) {}

  async select(found: FoundAssembly): Promise<void> {
    const api = this.trimble.getApi();
    // ViewerAPI.setSelection - documented method to set the current
    // selection. mode "set" replaces any existing selection.
    await api.viewer.setSelection(
      {
        modelObjectIds: [
          { modelId: found.modelId, objectRuntimeIds: [found.objectRuntimeId] },
        ],
      },
      "set",
    );
  }

  async isolate(found: FoundAssembly): Promise<void> {
    const api = this.trimble.getApi();
    // ViewerAPI.isolateEntities - documented method equivalent to
    // "Show only selected objects": hides every object except the ones
    // provided here.
    await api.viewer.isolateEntities([
      { modelId: found.modelId, entityIds: [found.objectRuntimeId] },
    ]);
  }
}

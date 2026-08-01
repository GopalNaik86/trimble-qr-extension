import type { TrimbleService } from "./TrimbleService";
import type { FoundAssembly } from "./PropertyService";

/** Handles fitting the camera to a specific object. */
export class CameraService {
  constructor(private readonly trimble: TrimbleService) {}

  async fitTo(found: FoundAssembly): Promise<void> {
    const api = this.trimble.getApi();
    // ViewerAPI.setCamera - documented method. Passing an ObjectSelector
    // (instead of an explicit Camera) fits the camera to the objects
    // matched by that selector.
    await api.viewer.setCamera(
      {
        modelObjectIds: [
          { modelId: found.modelId, objectRuntimeIds: [found.objectRuntimeId] },
        ],
      },
      { animationTime: 800 },
    );
  }
}

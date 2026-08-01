import type { ModelObjects, ModelSpec, ObjectProperties } from "trimble-connect-workspace-api";
import type { TrimbleService } from "./TrimbleService";
import { AssemblyWorkflowError } from "./errors";
import type { LogFn } from "./TrimbleService";

/** How many objects to request properties for in a single API call. */
const BATCH_SIZE = 500;

/**
 * Property names that IFC exports of Tekla assemblies commonly use for the
 * assembly mark/position. We don't hardcode which one a given model uses -
 * instead we treat this as a *preference* list: every object's full property
 * set is scanned, and a name is accepted if it contains "mark" or is one of
 * these known aliases. This keeps the search dynamic (per the requirement
 * to never hardcode object IDs) while still finding the right field quickly
 * across differently-configured models/exports.
 */
const ASSEMBLY_MARK_NAME_HINTS = [
  "assembly/cast unit mark",
  "assembly mark",
  "assembly position",
  "cast unit mark",
  "mark",
];

function looksLikeAssemblyMarkProperty(propertyName: string): boolean {
  const normalized = propertyName.toLowerCase();
  return ASSEMBLY_MARK_NAME_HINTS.some((hint) => normalized.includes(hint));
}

function valuesMatch(propertyValue: string | number, target: string): boolean {
  return String(propertyValue).trim().toLowerCase() === target.trim().toLowerCase();
}

export interface FoundAssembly {
  modelId: string;
  objectRuntimeId: number;
}

/**
 * Searches every object in every currently loaded model for the one whose
 * Assembly Mark property matches the requested value. Nothing here is
 * hardcoded to a specific object ID or model ID - both are found purely
 * from data returned by the Workspace API at runtime, since the Trimble
 * Connect link only identifies the project, not a model ID.
 */
export class PropertyService {
  constructor(
    private readonly trimble: TrimbleService,
    private readonly log: LogFn,
  ) {}

  async findByAssemblyMark(assemblyMark: string): Promise<FoundAssembly> {
    const api = this.trimble.getApi();

    // ViewerAPI.getModels - documented method to list the models currently
    // loaded in the viewer.
    const models: ModelSpec[] = await api.viewer.getModels();
    const loadedModelIds = models.filter((m) => m.state === "loaded").map((m) => m.id);

    if (loadedModelIds.length === 0) {
      throw new AssemblyWorkflowError(
        "MODEL_NOT_FOUND",
        "No loaded model was found in the viewer.",
      );
    }

    let totalScanned = 0;

    for (const modelId of loadedModelIds) {
      // ViewerAPI.getObjects - documented method to enumerate all objects
      // belonging to a model. We don't pass an ObjectSelector, so every
      // object in the model is returned.
      const modelObjects: ModelObjects[] = await api.viewer.getObjects({
        modelObjectIds: [{ modelId }],
      });

      const runtimeIds = modelObjects
        .filter((m) => m.modelId === modelId)
        .flatMap((m) => m.objects.map((o) => o.id));

      if (runtimeIds.length === 0) continue;
      totalScanned += runtimeIds.length;

      this.log(
        `Scanning ${runtimeIds.length} objects in model "${modelId}" for Assembly Mark "${assemblyMark}"...`,
      );

      for (let i = 0; i < runtimeIds.length; i += BATCH_SIZE) {
        const batch = runtimeIds.slice(i, i + BATCH_SIZE);

        // ViewerAPI.getObjectProperties - documented method to retrieve
        // full IFC property sets for a batch of objects, identified by
        // their ObjectRuntimeId.
        const propsBatch: ObjectProperties[] = await api.viewer.getObjectProperties(
          modelId,
          batch,
        );

        for (const obj of propsBatch) {
          if (this.objectMatchesAssemblyMark(obj, assemblyMark)) {
            return { modelId, objectRuntimeId: obj.id };
          }
        }
      }
    }

    if (totalScanned === 0) {
      throw new AssemblyWorkflowError(
        "ASSEMBLY_NOT_FOUND",
        "The loaded model(s) reported no objects to search.",
      );
    }

    throw new AssemblyWorkflowError(
      "ASSEMBLY_NOT_FOUND",
      `No object with Assembly Mark "${assemblyMark}" was found in the loaded model(s).`,
    );
  }

  private objectMatchesAssemblyMark(obj: ObjectProperties, assemblyMark: string): boolean {
    if (!obj.properties) return false;
    for (const propertySet of obj.properties) {
      if (!propertySet.properties) continue;
      for (const property of propertySet.properties) {
        if (
          looksLikeAssemblyMarkProperty(property.name) &&
          valuesMatch(property.value, assemblyMark)
        ) {
          return true;
        }
      }
    }
    return false;
  }
}

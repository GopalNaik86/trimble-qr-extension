import { TrimbleService, type LogFn } from "./TrimbleService";
import { ViewerService } from "./ViewerService";
import { PropertyService } from "./PropertyService";
import { SelectionService } from "./SelectionService";
import { CameraService } from "./CameraService";
import { parseProjectId } from "./trimbleUrl";
import { toAssemblyError } from "./errors";
import type { AssemblyRequest } from "../types/assembly";

/**
 * Runs the exact same workflow a scanned QR code will eventually trigger:
 * read the Trimble Connect link -> wait for that project's viewer to
 * finish loading -> find the assembly by IFC properties -> select it ->
 * hide everything else -> fit camera to it.
 *
 * This runs as a Trimble Connect 3D Extension, so by the time it's open
 * it's already running inside the 3D Viewer for the project the link
 * points to - there's no separate navigation call to make. The link is
 * parsed here only to validate it and to identify the project in the log.
 *
 * Swapping manual form input for QR scanning later only means changing
 * where `request` comes from - this function itself does not change.
 */
export async function runAssemblyWorkflow(
  request: AssemblyRequest,
  log: LogFn,
): Promise<void> {
  const trimble = new TrimbleService(log);
  const viewer = new ViewerService(trimble);
  const properties = new PropertyService(trimble, log);
  const selection = new SelectionService(trimble);
  const camera = new CameraService(trimble);

  try {
    const projectId = parseProjectId(request.trimbleUrl);

    log("Connecting...");
    await trimble.connect();

    log(`Using project ${projectId} from the Trimble Connect link...`);
    log("Waiting for the viewer to finish loading...");
    await viewer.waitUntilLoaded();

    log(`Searching assembly ${request.assembly}...`);
    const found = await properties.findByAssemblyMark(request.assembly);
    log("Object found.");

    log("Selecting...");
    await selection.select(found);

    log("Hiding remaining objects...");
    await selection.isolate(found);

    log("Fitting camera...");
    await camera.fitTo(found);
    log("Zoom complete.");

    log("Done.");
  } catch (err) {
    throw toAssemblyError(err);
  }
}

# QR Assembly Viewer — Trimble Connect 3D Extension (PoC)

Proof of concept that uses the official **Trimble Connect Workspace API**
(`trimble-connect-workspace-api` npm package) to wait for the already-open
project's 3D model to finish loading, find one assembly by its Assembly
Mark property, select it, hide every other object, and zoom the camera to
it — the workflow a future QR code scan will trigger automatically.

The form takes two fields: the **Trimble Connect Link** (the exact URL
Trimble Connect generates via "Generate QR Code" / "Copy Link", e.g.
`https://web.connect.trimble.com/project/xxxxxxxxxxxxxxxxxxxxxxxx`) and
the **Assembly Mark** (e.g. `B110`). There's no separate Project ID or
Model ID field — the link already identifies both, and since this runs as
a 3D Extension inside Trimble Connect's own viewer, the project is already
open by the time the extension runs.

No custom IFC viewer, no Three.js, no IFC.js — every 3D operation goes
through the real Trimble Connect 3D Viewer via documented Workspace API
methods only.

## Why this runs as a Trimble Connect "3D Extension"

The Workspace API supports two integration patterns:

1. **3D Extension** — your app runs *inside* Trimble Connect's 3D Viewer
   (in an iframe Trimble Connect creates for you). Trimble Connect manages
   the user's session, so there is no OAuth/token flow to build.
2. **Embedded Viewer** — you embed Trimble Connect's viewer inside *your*
   app instead, and you are responsible for obtaining and refreshing an
   access token yourself.

This PoC uses **option 1** (3D Extension), since the brief is "control the
existing Trimble Connect Viewer" rather than "build a standalone app that
happens to show Trimble Connect's viewer." It also means the PoC has zero
auth code to get wrong.

Reference: https://components.connect.trimble.com/trimble-connect-workspace-api/index.html#1-extensions

## Project structure

```
src/
  types/assembly.ts          # AssemblyRequest — the future QR payload shape
  services/
    errors.ts                 # Typed errors + friendly messages
    trimbleUrl.ts              # Parses the project ID out of the Trimble link
    TrimbleService.ts         # Connects to the Workspace API
    ViewerService.ts          # Waits for the viewer to finish loading
    PropertyService.ts        # Dynamically finds the object by Assembly Mark
    SelectionService.ts       # Selects + isolates (hides everything else)
    CameraService.ts          # Zooms camera to the found object
    AssemblyWorkflow.ts       # Orchestrates the workflow, emits logs
  components/LogPanel.tsx     # On-screen log feed
  App.tsx                     # The input form (Trimble Connect Link/Assembly Mark)
```

Each concern is its own service, matching the required architecture:
`TrimbleService`, `ViewerService`, `SelectionService`, `PropertyService`,
`CameraService`.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build -> dist/
```

A dev server on its own won't do anything by itself — Trimble Connect has
to load it as an extension (see below). For quick local iteration on the
form/log UI in isolation, you can open `http://localhost:5173` directly,
but calls to the Workspace API will reject until it's actually loaded
inside Trimble Connect (`window.parent` isn't Trimble Connect otherwise).

## Installing it as a real extension

1. Deploy `dist/` somewhere reachable over HTTPS (with CORS enabled, since
   Trimble Connect fetches the manifest cross-origin).
2. Edit `extension-manifest.json`, replacing `YOUR-DEPLOYED-DOMAIN` with
   your real URL.
3. In Trimble Connect for Browser: open a project → 3D Viewer settings →
   Extensions → add a new extension using your manifest's URL.
4. Open the 3D Viewer; the extension panel appears with the form.

## How the assembly mark is found (no hardcoded IDs)

`PropertyService.findByAssemblyMark`:

1. Calls `viewer.getModels()` to find every model currently loaded in the
   viewer (there's no model ID to be handed one directly, since the
   Trimble link only identifies the project).
2. For each loaded model, calls
   `viewer.getObjects({ modelObjectIds: [{ modelId }] })` to list every
   object's runtime ID.
3. Batches those IDs into `viewer.getObjectProperties(modelId, ids)` calls
   (500 at a time) to pull each object's full IFC property sets.
4. Scans every property set for a property whose *name* looks like an
   assembly mark field (`Assembly Mark`, `Assembly/Cast unit Mark`,
   `Cast unit Mark`, `Assembly Position`, or anything containing "mark"),
   and whose *value* matches the entered Assembly string
   (case-insensitive, trimmed).

Because Tekla → IFC exports don't all use identical property names, the
match list is a set of hints rather than one fixed name — but the object
ID itself is always discovered at runtime from the model's own property
data, never hardcoded.

If your models consistently expose the mark under one exact property
name/pset, you can tighten `ASSEMBLY_MARK_NAME_HINTS` in
`PropertyService.ts` to just that one name for a faster, more precise
match.

## Swapping in real QR scanning later

Everything downstream of the input already expects this exact shape
(`src/types/assembly.ts`):

```ts
interface AssemblyRequest {
  trimbleUrl: string;
  assembly: string;
}
```

`App.tsx` currently builds this object from the two text inputs and
passes it to `runAssemblyWorkflow(request, log)`. To go from manual entry
to QR scanning:

- Add a QR-scanning library/camera view that parses a scanned code's JSON
  into an `AssemblyRequest`.
- Call `runAssemblyWorkflow(request, log)` with that parsed object instead
  of the one built from form state.

`AssemblyWorkflow.ts` and every service beneath it are unchanged — they
don't know or care whether `request` came from a form or a scanner.

## Error handling

`services/errors.ts` defines `AssemblyWorkflowError` with codes for each
case called out in the brief: `INVALID_URL`, `VIEWER_NOT_READY`,
`AUTH_FAILED`, `MODEL_NOT_FOUND`, `ASSEMBLY_NOT_FOUND`, plus `UNKNOWN` as
a fallback. Each maps to a friendly, worker-facing message shown in the
red banner above the log panel; the raw underlying error is still written
to the log feed for debugging.

## Workspace API methods used (all documented, none invented)

| Purpose | Method |
|---|---|
| Connect to host app | `WorkspaceAPI.connect(window.parent, onEvent)` |
| List currently loaded models | `viewer.getModels()` |
| Know when a model finished loading | `viewer.onModelStateChanged` event |
| Enumerate objects in a model | `viewer.getObjects({ modelObjectIds })` |
| Read IFC properties per object | `viewer.getObjectProperties(modelId, runtimeIds)` |
| Select object | `viewer.setSelection(selector, "set")` |
| Hide everything else | `viewer.isolateEntities([{ modelId, entityIds }])` |
| Zoom camera to object | `viewer.setCamera(selector, { animationTime })` |

Since this runs as a 3D Extension, Trimble Connect has already opened the
correct project (and its 3D Viewer) before the extension itself loads —
so there's no `project.setProject()` call here. The Trimble Connect Link
field is parsed only to validate it and to surface the project ID in the
log; navigation itself isn't something the extension needs to do.

Docs: https://components.connect.trimble.com/trimble-connect-workspace-api/index.html

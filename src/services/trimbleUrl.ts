import { AssemblyWorkflowError } from "./errors";

/**
 * Pulls the project ID out of a Trimble Connect link - the exact URL
 * Trimble Connect generates from its "Generate QR Code" / "Copy Link"
 * actions, e.g.:
 *
 *   https://web.connect.trimble.com/project/xxxxxxxxxxxxxxxxxxxxxxxx
 *
 * The project ID is the path segment right after "project"/"projects".
 * Trimble Connect itself keeps track of which model(s) were last open in
 * that project, so nothing else needs to be parsed out of the link.
 */
export function parseProjectId(trimbleUrl: string): string {
  const trimmed = trimbleUrl.trim();

  if (!trimmed) {
    throw new AssemblyWorkflowError(
      "INVALID_URL",
      "Enter the Trimble Connect link before opening an assembly.",
    );
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new AssemblyWorkflowError("INVALID_URL", `"${trimmed}" isn't a valid URL.`);
  }

  // Accepts both /project/{id} and /projects/{id}, since Trimble Connect
  // has used both forms.
  const match = url.pathname.match(/\/projects?\/([^/?#]+)/i);
  if (!match) {
    throw new AssemblyWorkflowError(
      "INVALID_URL",
      "Couldn't find a project ID in that Trimble Connect link.",
    );
  }

  return decodeURIComponent(match[1]);
}

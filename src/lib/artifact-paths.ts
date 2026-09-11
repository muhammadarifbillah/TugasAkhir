/**
 * Validation for AI-supplied artifact paths and sizes.
 *
 * Generated file names come from model output, which is untrusted input. They
 * are later used as ZIP entry names (`api/export/zip`, `api/export/artifacts`)
 * and as GitHub tree paths (`api/github/push`). Without validation a hostile or
 * prompt-injected response could emit keys such as `../../.env` or
 * `/etc/cron.d/x` and escape the extraction directory — CWE-22 (path traversal
 * / "ZIP slip").
 */

/** Hard ceiling on how many files one stage result may contribute. */
export const MAX_ARTIFACT_FILES = 300;
/** Hard ceiling on a single file's length, in characters. */
export const MAX_ARTIFACT_BYTES = 512 * 1024;
/** Hard ceiling on the total payload of one stage result, in characters. */
export const MAX_ARTIFACT_TOTAL_BYTES = 8 * 1024 * 1024;
/** Hard ceiling on the raw model response we are willing to parse, in characters. */
export const MAX_MODEL_OUTPUT_CHARS = 4 * 1024 * 1024;

const WINDOWS_DRIVE = /^[A-Za-z]:/;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const BACKSLASH = /\\/;
const RESERVED_WINDOWS_NAMES =
  /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

/**
 * @returns an error message when `path` is not a safe, relative POSIX-style
 * artifact path; `null` when it is acceptable.
 */
export function validateArtifactPath(path: string): string | null {
  if (!path) return "empty path";
  if (path.length > 400) return "path too long";
  if (CONTROL_CHARS.test(path)) return "path contains control characters";
  if (BACKSLASH.test(path)) return "path must use forward slashes";
  if (path.startsWith("/")) return "absolute path not allowed";
  if (path.startsWith("~")) return "home-relative path not allowed";
  if (WINDOWS_DRIVE.test(path)) return "drive-qualified path not allowed";

  const segments = path.split("/");
  for (const segment of segments) {
    if (segment === "" ) return "path contains an empty segment";
    if (segment === "." || segment === "..") return "path traversal not allowed";
    if (RESERVED_WINDOWS_NAMES.test(segment)) return "reserved file name not allowed";
  }

  return null;
}

export function isSafeArtifactPath(path: string): boolean {
  return validateArtifactPath(path) === null;
}

/**
 * Collects every problem with an artifact map so the caller can reject the whole
 * batch and report why, instead of silently dropping files.
 */
export function findArtifactProblems(
  artifacts: Record<string, string>,
): string[] {
  const problems: string[] = [];

  const paths = Object.keys(artifacts);
  if (paths.length > MAX_ARTIFACT_FILES) {
    problems.push(
      `too many files: ${paths.length} (max ${MAX_ARTIFACT_FILES})`,
    );
  }

  let total = 0;
  for (const path of paths) {
    const error = validateArtifactPath(path);
    if (error) problems.push(`${JSON.stringify(path)}: ${error}`);

    const content = artifacts[path] ?? "";
    total += content.length;
    if (content.length > MAX_ARTIFACT_BYTES) {
      problems.push(
        `${JSON.stringify(path)}: file too large (${content.length} chars, max ${MAX_ARTIFACT_BYTES})`,
      );
    }
  }

  if (total > MAX_ARTIFACT_TOTAL_BYTES) {
    problems.push(`total size too large: ${total} chars (max ${MAX_ARTIFACT_TOTAL_BYTES})`);
  }

  return problems;
}

/**
 * Returns only the safe entries of an artifact map, reporting what was dropped.
 * Used at the export boundary, where failing the whole download would be worse
 * than omitting an unusable entry.
 */
export function filterSafeArtifacts(artifacts: Record<string, string>): {
  files: Record<string, string>;
  rejected: string[];
} {
  const files: Record<string, string> = {};
  const rejected: string[] = [];

  for (const [path, content] of Object.entries(artifacts)) {
    if (!isSafeArtifactPath(path) || typeof content !== "string") {
      rejected.push(path);
      continue;
    }
    files[path] = content;
  }

  return { files, rejected };
}

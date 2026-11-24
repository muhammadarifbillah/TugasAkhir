/** Maps an Octokit push failure to the message shown in the push panel. */
export function githubPushError(err: unknown, opts?: { hasWorkflows?: boolean }): string {
  const message = err instanceof Error ? err.message : "GitHub push failed";
  const status = (err as { status?: unknown } | null)?.status;
  if (message.includes("already exists")) return "Repository name already exists on your GitHub.";
  if (status === 401 || /401|bad credentials|authentication/i.test(message)) {
    return "GitHub authentication failed. Provide a valid Personal Access Token or reconnect GitHub.";
  }
  if (status === 403 || /403|permission|forbidden|not accessible/i.test(message)) {
    if (opts?.hasWorkflows) {
      // GitHub answers 403 with an empty body for workflow writes, so the missing
      // permission cannot be read from the response.
      return "GitHub denied write access. A fine-grained token needs Contents: Read and write and Workflows: Read and write to push .github/workflows/.";
    }
    return "GitHub denied write access to this repository. Check the token scope and repository permissions.";
  }
  return "GitHub push failed. Check the repository URL, token, and permissions.";
}

/** Warning shown when a revision started but its release branch/PR could not be created. */
export function githubRevisionWarning(err: unknown): string {
  const status = (err as { status?: unknown } | null)?.status;
  const base = "Revision started, but the GitHub release branch/PR could not be created.";
  // A fine-grained token without Pull requests write gets 403 here, and the
  // response body does not say which permission is missing.
  return status === 403
    ? `${base} A fine-grained token needs Pull requests: Read and write.`
    : `${base} Check the linked token and repository.`;
}

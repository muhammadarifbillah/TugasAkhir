/** Maps an Octokit push failure to the message shown in the push panel. */
export function githubPushError(err: unknown): string {
  const message = err instanceof Error ? err.message : "GitHub push failed";
  const status = (err as { status?: unknown } | null)?.status;
  if (message.includes("already exists")) return "Repository name already exists on your GitHub.";
  if (status === 401 || /401|bad credentials|authentication/i.test(message)) {
    return "GitHub authentication failed. Provide a valid Personal Access Token or reconnect GitHub.";
  }
  if (status === 403 || /403|permission|forbidden|not accessible/i.test(message)) {
    return "GitHub denied write access to this repository. Check the token scope and repository permissions.";
  }
  return "GitHub push failed. Check the repository URL, token, and permissions.";
}

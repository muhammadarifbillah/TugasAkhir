/**
 * Container tooling (Run app + Security Scan) needs a Docker daemon on the host.
 * On hosts without one (e.g. serverless platforms) set RUNNER_MODE=disabled so
 * those features are skipped gracefully instead of failing at runtime.
 */
export function runnerDisabled(): boolean {
  return process.env.RUNNER_MODE === "disabled";
}

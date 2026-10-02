/**
 * Host interface on which generated-app and database ports are published.
 *
 * Defaults to loopback so a generated app (and any throwaway database) is not
 * reachable from the LAN or the internet. Set `RUNNER_BIND_HOST=0.0.0.0` to
 * expose it deliberately (e.g. for a remote demo behind a reverse proxy).
 */
export function runnerBindHost(): string {
  const host = process.env.RUNNER_BIND_HOST?.trim();
  return host && host.length > 0 ? host : "127.0.0.1";
}

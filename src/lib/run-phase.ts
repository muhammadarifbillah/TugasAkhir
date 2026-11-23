export type RunPhase = "container" | "install" | "start" | "ready";
export const RUN_PHASES: readonly RunPhase[] = ["container", "install", "start", "ready"];

/** Best-effort phase inferred from the container logs (no server protocol needed). */
export function inferRunPhase(status: string, logs: string): RunPhase {
  if (status === "running") return "ready";
  if (/(listening|ready|Local:|started server|Uvicorn running|Running on)/i.test(logs)) return "start";
  if (/(npm|pnpm|yarn|pip|added \d+ packages|Installing|Collecting|Downloading)/i.test(logs)) return "install";
  return "container";
}

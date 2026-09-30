import { randomBytes } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { isSafeArtifactPath } from "@/lib/artifact-paths";
import { findFreePort } from "./ports";
import { resolvePlan, type ResolvedPlan } from "./registry";
import {
  containerLogs,
  containerState,
  containerStats,
  createNetwork,
  ensureImage,
  removeContainer,
  removeNetwork,
  runContainer,
} from "./docker";
import { startService, stopService, supportedServices, type ServiceHandle } from "./database";

export type RunStatus = "starting" | "running" | "error" | "stopped";

export interface RunSession {
  projectId: string;
  userId: string;
  containerName: string;
  workDir: string;
  hostPort: number;
  containerPort: number;
  stackId: string;
  stackLabel: string;
  services: string[];
  network: string | null;
  serviceHandles: ServiceHandle[];
  status: RunStatus;
  error?: string;
  startedAt: number;
  lastAccess: number;
}

/** Cap concurrent generated-app containers to keep the host responsive. */
const MAX_ACTIVE_RUNS = 2;
const TTL_MS = 15 * 60 * 1000;
// Dependency install for a generated app can take several minutes (npm install
// observed at ~6 min), so allow a generous window before declaring a timeout.
const READY_TIMEOUT_MS = 15 * 60 * 1000;

// Survive Next.js dev HMR: keep the registry on globalThis.
const globalStore = globalThis as unknown as { __sdlcRuns?: Map<string, RunSession> };
const sessions = (globalStore.__sdlcRuns ??= new Map<string, RunSession>());

async function writeProjectFiles(workDir: string, files: Record<string, string>): Promise<void> {
  for (const [path, content] of Object.entries(files)) {
    if (!isSafeArtifactPath(path)) continue;
    const target = join(workDir, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }
}

function buildCommand(plan: ResolvedPlan): string[] | undefined {
  const steps = [...plan.install, ...plan.build, plan.start].filter(Boolean);
  if (steps.length === 0) return undefined;
  // The Alpine Node image ships without OpenSSL, which Prisma's native engine
  // requires. Install it (best-effort) before the app's own steps so generated
  // apps that use Prisma can run.
  const setup =
    plan.stackId === "node"
      ? "(command -v apk >/dev/null 2>&1 && apk add --no-cache openssl >/dev/null 2>&1 || true)"
      : null;
  const commands = setup ? [setup, ...steps] : steps;
  return ["sh", "-c", commands.join(" && ")];
}

async function forceStop(session: RunSession): Promise<void> {
  await removeContainer(session.containerName).catch(() => undefined);
  for (const handle of session.serviceHandles) {
    await stopService(handle).catch(() => undefined);
  }
  if (session.network) {
    await removeNetwork(session.network).catch(() => undefined);
  }
  await rm(session.workDir, { recursive: true, force: true }).catch(() => undefined);
  sessions.delete(session.projectId);
}

export interface StartRunResult {
  runId: string;
  stackId: string;
  stackLabel: string;
  containerPort: number;
  hostPort: number;
  url: string;
}

export async function startRun(
  projectId: string,
  userId: string,
  files: Record<string, string>,
): Promise<StartRunResult> {
  const plan = resolvePlan(files);
  if (!plan) {
    throw new Error("UNSUPPORTED_STACK");
  }

  const existing = sessions.get(projectId);
  if (existing) await forceStop(existing);
  if (sessions.size >= MAX_ACTIVE_RUNS) {
    throw new Error("TOO_MANY_RUNS");
  }

  const runId = randomBytes(4).toString("hex");
  const workDir = await mkdtemp(join(tmpdir(), "sdlc-run-"));
  await writeProjectFiles(workDir, files);
  await ensureImage(plan.adapter.image);

  // Start throwaway services (postgres/mysql/redis) on a private network so the
  // app can reach them by container name via the injected connection env.
  const wantedServices = plan.services.filter((s) => supportedServices().includes(s));
  let network: string | null = null;
  const serviceHandles: ServiceHandle[] = [];
  const serviceEnv: Record<string, string> = {};
  if (wantedServices.length > 0) {
    network = `sdlc-net-${runId}`;
    await createNetwork(network);
    for (const service of wantedServices) {
      const handle = await startService(service, network, runId);
      if (handle) {
        serviceHandles.push(handle);
        Object.assign(serviceEnv, handle.env);
      }
    }
  }

  const hostPort = await findFreePort();
  const containerName = `sdlc-run-${projectId.slice(0, 8)}-${runId}`;

  try {
    await runContainer({
      name: containerName,
      image: plan.adapter.image,
      hostPort,
      containerPort: plan.port,
      mountSource: workDir,
      mountTarget: plan.adapter.mountTarget,
      command: buildCommand(plan),
      env: {
        NODE_ENV: "development",
        // Stream npm output (so the terminal shows progress) and skip the slow
        // audit/fund passes during dependency install.
        ...(plan.stackId === "node"
          ? { npm_config_loglevel: "info", npm_config_fund: "false", npm_config_audit: "false" }
          : {}),
        ...plan.env,
        ...serviceEnv,
      },
      // Reuse a persistent npm cache across runs so repeat installs are fast.
      extraMounts: plan.stackId === "node" ? ["sdlc-npm-cache:/root/.npm"] : undefined,
      network: network ?? undefined,
    });
  } catch (err) {
    for (const handle of serviceHandles) await stopService(handle).catch(() => undefined);
    if (network) await removeNetwork(network).catch(() => undefined);
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    throw err;
  }

  const session: RunSession = {
    projectId,
    userId,
    containerName,
    workDir,
    hostPort,
    containerPort: plan.port,
    stackId: plan.stackId,
    stackLabel: plan.adapter.label,
    services: plan.services,
    network,
    serviceHandles,
    status: "starting",
    startedAt: Date.now(),
    lastAccess: Date.now(),
  };
  sessions.set(projectId, session);

  return {
    runId: containerName,
    stackId: plan.stackId,
    stackLabel: plan.adapter.label,
    containerPort: plan.port,
    hostPort,
    url: `http://localhost:${hostPort}`,
  };
}

export interface RunStatusResult {
  status: RunStatus;
  url: string | null;
  stackId: string;
  stackLabel: string;
  services: string[];
  stats?: string | null;
  error?: string;
  logs?: string;
}

async function runningResult(session: RunSession): Promise<RunStatusResult> {
  const stats = await containerStats(session.containerName).catch(() => null);
  return {
    status: "running",
    url: `http://localhost:${session.hostPort}`,
    stackId: session.stackId,
    stackLabel: session.stackLabel,
    services: session.services,
    stats,
  };
}

export async function getRunStatus(projectId: string): Promise<RunStatusResult | null> {
  const session = sessions.get(projectId);
  if (!session) return null;
  session.lastAccess = Date.now();

  const state = await containerState(session.containerName);
  if (!state) {
    session.status = "stopped";
    return { status: "stopped", url: null, stackId: session.stackId, stackLabel: session.stackLabel, services: session.services };
  }
  if (state === "exited" || state === "dead") {
    session.status = "error";
    const logs = await containerLogs(session.containerName, 120);
    return {
      status: "error",
      url: null,
      stackId: session.stackId,
      stackLabel: session.stackLabel,
      services: session.services,
      error: "Container exited. See logs.",
      logs,
    };
  }

  if (session.status === "running") {
    return runningResult(session);
  }

  // Still installing/starting: probe the app until it answers.
  try {
    const res = await fetch(`http://127.0.0.1:${session.hostPort}/`, {
      signal: AbortSignal.timeout(2500),
    });
    if (res.status < 500) {
      session.status = "running";
      return runningResult(session);
    }
  } catch {
    // not ready yet
  }

  if (Date.now() - session.startedAt > READY_TIMEOUT_MS) {
    session.status = "error";
    const logs = await containerLogs(session.containerName, 120);
    return {
      status: "error",
      url: null,
      stackId: session.stackId,
      stackLabel: session.stackLabel,
      services: session.services,
      error: "Timed out waiting for the app to start.",
      logs,
    };
  }

  return { status: "starting", url: null, stackId: session.stackId, stackLabel: session.stackLabel, services: session.services };
}

export async function stopRun(projectId: string): Promise<void> {
  const session = sessions.get(projectId);
  if (!session) return;
  await forceStop(session);
}

export function getSession(projectId: string): RunSession | null {
  return sessions.get(projectId) ?? null;
}

// Auto-stop containers that have been idle past the TTL.
const sweeper = globalThis as unknown as { __sdlcRunSweeper?: NodeJS.Timeout };
if (!sweeper.__sdlcRunSweeper) {
  sweeper.__sdlcRunSweeper = setInterval(() => {
    const now = Date.now();
    for (const session of [...sessions.values()]) {
      if (now - session.lastAccess > TTL_MS) {
        void forceStop(session);
      }
    }
  }, 60_000);
  sweeper.__sdlcRunSweeper.unref?.();
}

import { randomBytes } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { isSafeArtifactPath } from "@/lib/artifact-paths";
import { relaxFramingForPreview } from "./framing";
import { findFreePort } from "./ports";
import { resolvePlan, type ResolvedPlan } from "./registry";
import {
  containerLogs,
  containerState,
  containerStats,
  createNetwork,
  ensureImage,
  listSdlcContainers,
  removeContainer,
  removeNetwork,
  runContainer,
} from "./docker";
import { startService, stopService, supportedServices, type ServiceHandle } from "./database";

export type RunStatus = "starting" | "running" | "error" | "stopped";

/** A demo account parsed from a generated app's seed/README. */
export interface DemoAccount {
  email: string;
  password?: string;
}

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
  demo?: DemoAccount[];
}

/** Cap concurrent generated-app containers to keep the host responsive. */
const MAX_ACTIVE_RUNS = 2;
// Keep a run alive for a while even if the studio tab is not polling (e.g. the
// user opened the generated app in another tab). Override with RUN_TTL_MINUTES.
const TTL_MS = Math.max(5, Number(process.env.RUN_TTL_MINUTES ?? 60)) * 60 * 1000;
// Dependency install for a generated app can take several minutes (npm install
// observed at ~6 min), so allow a generous window before declaring a timeout.
const READY_TIMEOUT_MS = 15 * 60 * 1000;

// Survive Next.js dev HMR: keep the registry on globalThis.
const globalStore = globalThis as unknown as { __sdlcRuns?: Map<string, RunSession> };
const sessions = (globalStore.__sdlcRuns ??= new Map<string, RunSession>());

/**
 * Rebuilds the in-memory session registry from labelled Docker containers, so a
 * process restart (e.g. dev HMR) does not lose track of running apps.
 */
async function reconcileSessions(): Promise<void> {
  try {
    const containers = await listSdlcContainers();
    for (const c of containers) {
      if (sessions.has(c.projectId) || c.state !== "running") continue;
      sessions.set(c.projectId, {
        projectId: c.projectId,
        userId: c.userId,
        containerName: c.name,
        workDir: c.workDir,
        hostPort: c.hostPort,
        containerPort: c.containerPort,
        stackId: c.stackId,
        stackLabel: c.stackLabel,
        services: c.services,
        network: c.network,
        serviceHandles: [],
        status: "running",
        startedAt: c.startedAt,
        lastAccess: Date.now(),
      });
    }
  } catch {
    // Best-effort: reconciliation must never throw.
  }
}

async function writeProjectFiles(workDir: string, files: Record<string, string>): Promise<void> {
  for (const [path, content] of Object.entries(files)) {
    if (!isSafeArtifactPath(path)) continue;
    const target = join(workDir, path);
    await mkdir(dirname(target), { recursive: true });
    // Relax framing headers only in the sandbox copy, so the preview iframe can
    // render the app while the saved artifacts stay hardened.
    await writeFile(target, relaxFramingForPreview(content), "utf8");
  }
}

function buildCommand(plan: ResolvedPlan, files: Record<string, string>): string[] | undefined {
  const hasPrisma = Boolean(files["prisma/schema.prisma"]);
  const setup: string[] = [];
  if (plan.stackId === "node") {
    // The Alpine Node image lacks OpenSSL, which Prisma's native engine needs.
    setup.push("(command -v apk >/dev/null 2>&1 && apk add --no-cache openssl >/dev/null 2>&1 || true)");
  }

  // Generated Prisma apps need the client generated, the schema pushed, and any
  // seed run (e.g. a demo account) before they can serve their API routes.
  // Some models emit a Prisma 6 schema with Prisma 7 packages; normalise to v6.
  const db: string[] = [];
  if (hasPrisma) {
    db.push("(npm install --no-save --prefer-offline prisma@^6 @prisma/client@^6 || true)");
    db.push("(npx prisma generate || true)");
    db.push("(npx prisma db push --skip-generate --accept-data-loss || true)");
    const seedFile = ["prisma/seed.mjs", "prisma/seed.js", "prisma/seed.cjs", "prisma/seed.ts"].find(
      (f) => files[f],
    );
    if (seedFile) {
      db.push(
        seedFile.endsWith(".ts")
          ? "(npx --yes tsx prisma/seed.ts || true)"
          : `(node ${seedFile} || true)`,
      );
    }
  }

  const steps = [...setup, ...plan.install, ...db, ...plan.build, plan.start].filter(Boolean);
  if (steps.length === 0) return undefined;
  return ["sh", "-c", steps.join(" && ")];
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
  demo?: DemoAccount[];
}

/** Best-effort parse of demo credentials from a generated app's seed/README. */
function extractDemoAccounts(files: Record<string, string>): DemoAccount[] {
  const seed =
    files["prisma/seed.mjs"] ??
    files["prisma/seed.js"] ??
    files["prisma/seed.cjs"] ??
    files["prisma/seed.ts"] ??
    "";
  if (!seed) return [];
  const emails = Array.from(
    new Set(seed.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? []),
  ).slice(0, 8);
  const password =
    seed.match(/bcrypt\.hash\(\s*["']([^"']+)["']/)?.[1] ??
    seed.match(/[Pp]assword[^\n]{0,30}?["']([^"']{4,})["']/)?.[1];
  return emails.map((email) => ({ email, password }));
}

function demoOf(session: RunSession): { demo: DemoAccount[] } | Record<string, never> {
  return session.demo && session.demo.length > 0 ? { demo: session.demo } : {};
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

  const hasPrisma = Boolean(files["prisma/schema.prisma"]);
  const demo = extractDemoAccounts(files);
  const runEnv: Record<string, string> = {
    NODE_ENV: "development",
    // Stream npm output (so the terminal shows progress) and skip the slow
    // audit/fund passes during dependency install.
    ...(plan.stackId === "node"
      ? {
          npm_config_loglevel: "info",
          npm_config_fund: "false",
          npm_config_audit: "false",
          // Use the persistent cache without re-validating every entry, so
          // repeat installs stay fast even on slow networks.
          npm_config_prefer_offline: "true",
        }
      : {}),
    ...plan.env,
    ...serviceEnv,
  };
  // Generated Prisma apps may omit DATABASE_URL. Fall back to a local SQLite
  // file so `prisma db push` and the running app can both use it (unless a real
  // database service is attached).
  if (
    hasPrisma &&
    !runEnv.DATABASE_URL &&
    !plan.services.includes("postgres") &&
    !plan.services.includes("mysql")
  ) {
    runEnv.DATABASE_URL = "file:./dev.db";
  }

  const startedAt = Date.now();

  try {
    await runContainer({
      name: containerName,
      image: plan.adapter.image,
      hostPort,
      containerPort: plan.port,
      mountSource: workDir,
      mountTarget: plan.adapter.mountTarget,
      command: buildCommand(plan, files),
      env: runEnv,
      // Reuse a persistent npm cache across runs so repeat installs are fast.
      extraMounts: plan.stackId === "node" ? ["sdlc-npm-cache:/root/.npm"] : undefined,
      // Node installs are CPU-bound; give them more headroom than the default.
      ...(plan.stackId === "node" ? { memory: "2g", cpus: "2", pidsLimit: 512 } : {}),
      network: network ?? undefined,
      labels: {
        "sdlc.projectId": projectId,
        "sdlc.userId": userId,
        "sdlc.stackId": plan.stackId,
        "sdlc.stackLabel": plan.adapter.label,
        "sdlc.hostPort": String(hostPort),
        "sdlc.containerPort": String(plan.port),
        "sdlc.workDir": workDir,
        "sdlc.network": network ?? "",
        "sdlc.services": plan.services.join(","),
        "sdlc.startedAt": String(startedAt),
      },
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
    startedAt,
    lastAccess: Date.now(),
    demo,
  };
  sessions.set(projectId, session);

  return {
    runId: containerName,
    stackId: plan.stackId,
    stackLabel: plan.adapter.label,
    containerPort: plan.port,
    hostPort,
    url: `http://localhost:${hostPort}`,
    demo,
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
  demo?: DemoAccount[];
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
    ...demoOf(session),
  };
}

export async function getRunStatus(projectId: string): Promise<RunStatusResult | null> {
  let session = sessions.get(projectId);
  if (!session) {
    // The registry may have been cleared by a restart; rebuild from Docker.
    await reconcileSessions();
    session = sessions.get(projectId);
  }
  if (!session) return null;
  session.lastAccess = Date.now();

  const state = await containerState(session.containerName);
  if (!state) {
    session.status = "stopped";
    return { status: "stopped", url: null, stackId: session.stackId, stackLabel: session.stackLabel, services: session.services, ...demoOf(session) };
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
      ...demoOf(session),
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
      ...demoOf(session),
    };
  }

  return { status: "starting", url: null, stackId: session.stackId, stackLabel: session.stackLabel, services: session.services, ...demoOf(session) };
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
  // Rebuild sessions left over from a previous process before sweeping.
  void reconcileSessions();
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

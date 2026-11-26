import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { runnerBindHost } from "./config";

export interface DockerResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Runs the `docker` CLI without a host shell (args are passed verbatim). */
export function docker(args: string[], timeoutMs = 120_000): Promise<DockerResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

export async function ensureImage(image: string): Promise<void> {
  const inspect = await docker(["image", "inspect", image], 30_000);
  if (inspect.code === 0) return;
  const pull = await docker(["pull", image], 600_000);
  if (pull.code !== 0) {
    throw new Error(`Failed to pull image ${image}: ${pull.stderr.trim() || "unknown error"}`);
  }
}

export interface RunContainerParams {
  name: string;
  image: string;
  hostPort: number;
  containerPort: number;
  mountSource: string;
  mountTarget: string;
  command?: string[];
  env?: Record<string, string>;
  memory?: string;
  cpus?: string;
  pidsLimit?: number;
  network?: string;
  /** Extra bind/volume mounts, each as "source:target". */
  extraMounts?: string[];
  /** Mount the container root filesystem read-only (writable dirs are tmpfs/binds). */
  readOnly?: boolean;
  /** Docker labels (key/value) used to reconcile containers after a restart. */
  labels?: Record<string, string>;
}

export async function runContainer(params: RunContainerParams): Promise<void> {
  const args = [
    "run",
    "-d",
    "--name",
    params.name,
    ...(params.network ? ["--network", params.network] : []),
    // Publish on loopback only, so a generated app is not exposed to the LAN.
    "-p",
    `${runnerBindHost()}:${params.hostPort}:${params.containerPort}`,
    "-v",
    `${params.mountSource}:${params.mountTarget}`,
    ...(params.extraMounts ?? []).flatMap((m) => ["-v", m]),
    "-w",
    params.mountTarget,
    "--memory",
    params.memory ?? "1g",
    "--cpus",
    params.cpus ?? "1",
    "--pids-limit",
    String(params.pidsLimit ?? 256),
    // Reap orphaned child processes and keep the root filesystem immutable
    // where the stack does not need to write to it during install/build.
    "--init",
    "--cap-drop",
    "ALL",
    // Docker applies its default seccomp profile automatically; passing
    // "seccomp=default" is invalid (it is read as a profile file path).
    "--security-opt",
    "no-new-privileges",
    "--tmpfs",
    "/tmp",
    "--tmpfs",
    "/run",
    ...(params.readOnly ? ["--read-only"] : []),
  ];
  for (const [key, value] of Object.entries(params.env ?? {})) {
    args.push("-e", `${key}=${value}`);
  }
  for (const [key, value] of Object.entries(params.labels ?? {})) {
    args.push("--label", `${key}=${value}`);
  }
  args.push(params.image);
  if (params.command && params.command.length > 0) args.push(...params.command);

  const res = await docker(args, 180_000);
  if (res.code !== 0) {
    throw new Error(res.stderr.trim() || "docker run failed");
  }
}

export async function containerState(name: string): Promise<string | null> {
  const res = await docker(["inspect", "-f", "{{.State.Status}}", name], 20_000);
  if (res.code !== 0) return null;
  return res.stdout.trim();
}

export async function containerLogs(name: string, tail = 400): Promise<string> {
  const res = await docker(["logs", "--tail", String(tail), name], 30_000);
  return `${res.stdout}${res.stderr}`.trim();
}

export async function removeContainer(name: string): Promise<void> {
  await docker(["rm", "-f", name], 60_000);
}

/** One-shot resource usage for a running container. */
export async function containerStats(name: string): Promise<string | null> {
  const res = await docker(
    ["stats", "--no-stream", "--format", "{{.CPUPerc}}|{{.MemUsage}}", name],
    20_000,
  );
  if (res.code !== 0) return null;
  return res.stdout.trim() || null;
}

export async function createNetwork(name: string): Promise<void> {
  const res = await docker(["network", "create", name], 30_000);
  if (res.code !== 0) throw new Error(res.stderr.trim() || "network create failed");
}

export async function removeNetwork(name: string): Promise<void> {
  await docker(["network", "rm", name], 30_000);
}

/** Streams `docker logs -f` as a web ReadableStream (used for SSE). */
export function streamContainerLogs(name: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let child: ChildProcessWithoutNullStreams | null = null;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      child = spawn("docker", ["logs", "-f", "--tail", "200", name], { windowsHide: true });
      const push = (buf: Buffer) => {
        // The consumer may have disconnected; ignore writes after cancel/close.
        try {
          controller.enqueue(encoder.encode(buf.toString()));
        } catch {
          // stream already cancelled
        }
      };
      child.stdout.on("data", push);
      child.stderr.on("data", push);
      child.on("close", () => {
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
      child.on("error", () => {
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    // Called when the client disconnects: stop the `docker logs -f` process so
    // it does not linger for the lifetime of the container.
    cancel() {
      child?.kill();
    },
  });
}

export interface SdlcContainerInfo {
  name: string;
  projectId: string;
  userId: string;
  stackId: string;
  stackLabel: string;
  hostPort: number;
  containerPort: number;
  workDir: string;
  network: string | null;
  services: string[];
  healthPath?: string;
  startedAt: number;
  state: string;
}

/**
 * Lists Saksi run containers by label so the in-memory session registry
 * can be rebuilt after a process restart (otherwise runs look "lost").
 */
export async function listSdlcContainers(): Promise<SdlcContainerInfo[]> {
  const res = await docker(
    ["ps", "-a", "--filter", "label=sdlc.projectId", "--format", "{{json .}}"],
    30_000,
  );
  if (res.code !== 0) return [];
  const out: SdlcContainerInfo[] = [];
  for (const line of res.stdout.split("\n").map((l) => l.trim()).filter(Boolean)) {
    try {
      const c = JSON.parse(line) as { Names?: string; Labels?: string; State?: string };
      const labels: Record<string, string> = {};
      for (const pair of (c.Labels ?? "").split(",")) {
        const idx = pair.indexOf("=");
        if (idx > 0) labels[pair.slice(0, idx)] = pair.slice(idx + 1);
      }
      if (!labels["sdlc.projectId"]) continue;
      out.push({
        name: c.Names ?? "",
        projectId: labels["sdlc.projectId"],
        userId: labels["sdlc.userId"] ?? "",
        stackId: labels["sdlc.stackId"] ?? "",
        stackLabel: labels["sdlc.stackLabel"] ?? "",
        hostPort: Number(labels["sdlc.hostPort"] ?? 0),
        containerPort: Number(labels["sdlc.containerPort"] ?? 0),
        workDir: labels["sdlc.workDir"] ?? "",
        network: labels["sdlc.network"] || null,
        services: (labels["sdlc.services"] ?? "").split(",").filter(Boolean),
        healthPath: labels["sdlc.healthPath"] || undefined,
        startedAt: Number(labels["sdlc.startedAt"] ?? Date.now()),
        state: c.State ?? "",
      });
    } catch {
      // ignore malformed lines
    }
  }
  return out;
}

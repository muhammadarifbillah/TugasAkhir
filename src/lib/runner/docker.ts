import { spawn } from "node:child_process";

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
}

export async function runContainer(params: RunContainerParams): Promise<void> {
  const args = [
    "run",
    "-d",
    "--name",
    params.name,
    ...(params.network ? ["--network", params.network] : []),
    "-p",
    `${params.hostPort}:${params.containerPort}`,
    "-v",
    `${params.mountSource}:${params.mountTarget}`,
    "-w",
    params.mountTarget,
    "--memory",
    params.memory ?? "1g",
    "--cpus",
    params.cpus ?? "1",
    "--pids-limit",
    String(params.pidsLimit ?? 256),
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
  ];
  for (const [key, value] of Object.entries(params.env ?? {})) {
    args.push("-e", `${key}=${value}`);
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
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const child = spawn("docker", ["logs", "-f", "--tail", "200", name], { windowsHide: true });
      const push = (buf: Buffer) => controller.enqueue(encoder.encode(buf.toString()));
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
  });
}

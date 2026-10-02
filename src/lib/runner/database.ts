import { randomBytes } from "node:crypto";
import { docker, removeContainer } from "./docker";
import { runnerBindHost } from "./config";
import { findFreePort } from "./ports";

/**
 * Throwaway database/cache services for a run. Each service runs in its own
 * container on the run's private network, so the generated app can reach it by
 * container name via the injected connection env. Everything is destroyed when
 * the run stops.
 */

export interface ServiceHandle {
  service: string;
  containerName: string;
  env: Record<string, string>;
}

const DB_NAME = "appdb";

/** Fresh random password per service container (no shared static credential). */
function randomPassword(): string {
  return randomBytes(18).toString("hex");
}
const SERVICE_MEMORY: Record<string, string> = {
  postgres: "512m",
  mysql: "768m",
  redis: "256m",
};
const SERVICE_IMAGE: Record<string, string> = {
  postgres: "postgres:16-alpine",
  mysql: "mysql:8.0",
  redis: "redis:7-alpine",
};

export function supportedServices(): string[] {
  return Object.keys(SERVICE_IMAGE);
}

/** Deterministic name of a run's throwaway service container. */
export function serviceContainerName(service: string, runId: string): string {
  return `sdlc-svc-${service}-${runId}`;
}

export async function startService(
  service: string,
  network: string,
  runId: string,
): Promise<ServiceHandle | null> {
  const image = SERVICE_IMAGE[service];
  if (!image) return null;

  const containerName = serviceContainerName(service, runId);
  const args = [
    "run",
    "-d",
    "--name",
    containerName,
    "--network",
    network,
    "--memory",
    SERVICE_MEMORY[service],
    "--cpus",
    "1",
    "--pids-limit",
    "256",
    "--cap-drop",
    "ALL",
    // Official DB images need these to chown their data dir and drop to their
    // service user; everything else stays dropped.
    "--cap-add",
    "CHOWN",
    "--cap-add",
    "DAC_OVERRIDE",
    "--cap-add",
    "FOWNER",
    "--cap-add",
    "SETGID",
    "--cap-add",
    "SETUID",
    "--security-opt",
    "no-new-privileges",
  ];

  const password = randomPassword();
  let env: Record<string, string>;
  if (service === "postgres") {
    args.push("-e", `POSTGRES_PASSWORD=${password}`, "-e", `POSTGRES_DB=${DB_NAME}`);
    env = {
      DATABASE_URL: `postgresql://postgres:${password}@${containerName}:5432/${DB_NAME}`,
    };
  } else if (service === "mysql") {
    args.push("-e", `MYSQL_ROOT_PASSWORD=${password}`, "-e", `MYSQL_DATABASE=${DB_NAME}`);
    env = {
      DATABASE_URL: `mysql://root:${password}@${containerName}:3306/${DB_NAME}`,
    };
  } else {
    env = { REDIS_URL: `redis://${containerName}:6379` };
  }

  args.push(image);
  const res = await docker(args, 300_000);
  if (res.code !== 0) {
    throw new Error(res.stderr.trim() || `Failed to start ${service} service`);
  }
  return { service, containerName, env };
}

export async function stopService(handle: ServiceHandle): Promise<void> {
  await removeContainer(handle.containerName).catch(() => undefined);
}

const SERVICE_PORT: Record<string, number> = { postgres: 5432, mysql: 3306, redis: 6379 };

export interface PersistentDatabase {
  service: string;
  containerName: string;
  hostPort: number;
  url: string;
}

/**
 * Creates a long-lived database for a finalized project. Unlike the throwaway
 * run services it maps a host port so the user (and the downloaded app) can
 * connect from outside Docker.
 */
export async function startPersistentDatabase(
  service: string,
  projectId: string,
): Promise<PersistentDatabase | null> {
  const image = SERVICE_IMAGE[service];
  const port = SERVICE_PORT[service];
  if (!image || !port) return null;

  const containerName = `sdlc-db-${service}-${projectId}`;
  await removeContainer(containerName).catch(() => undefined);
  const hostPort = await findFreePort();

  const args = [
    "run",
    "-d",
    "--name",
    containerName,
    // Loopback only, so the database is not exposed to the network.
    "-p",
    `${runnerBindHost()}:${hostPort}:${port}`,
    "--memory",
    SERVICE_MEMORY[service],
    "--cpus",
    "1",
    "--pids-limit",
    "256",
    "--cap-drop",
    "ALL",
    "--cap-add",
    "CHOWN",
    "--cap-add",
    "DAC_OVERRIDE",
    "--cap-add",
    "FOWNER",
    "--cap-add",
    "SETGID",
    "--cap-add",
    "SETUID",
    "--security-opt",
    "no-new-privileges",
  ];

  const password = randomPassword();
  let url: string;
  if (service === "postgres") {
    args.push("-e", `POSTGRES_PASSWORD=${password}`, "-e", `POSTGRES_DB=${DB_NAME}`);
    url = `postgresql://postgres:${password}@localhost:${hostPort}/${DB_NAME}`;
  } else if (service === "mysql") {
    args.push("-e", `MYSQL_ROOT_PASSWORD=${password}`, "-e", `MYSQL_DATABASE=${DB_NAME}`);
    url = `mysql://root:${password}@localhost:${hostPort}/${DB_NAME}`;
  } else {
    url = `redis://localhost:${hostPort}`;
  }

  args.push(image);
  const res = await docker(args, 300_000);
  if (res.code !== 0) {
    throw new Error(res.stderr.trim() || `Failed to start ${service} database`);
  }
  return { service, containerName, hostPort, url };
}

export async function removePersistentDatabase(containerName: string): Promise<void> {
  await removeContainer(containerName).catch(() => undefined);
}

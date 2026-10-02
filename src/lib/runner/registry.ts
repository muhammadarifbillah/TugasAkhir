/**
 * Stack adapters for the local Docker runner.
 *
 * A generated project is executed by detecting its stack (from the AI-authored
 * `.securesdlc/run.json` when present, otherwise from marker files) and mapping
 * it to a base image, install/start commands and the port the app listens on.
 */

export interface StackAdapter {
  id: string;
  label: string;
  image: string;
  /** Files that indicate this stack (any match wins). */
  markers: RegExp[];
  /** Where the project is mounted inside the container. */
  mountTarget: string;
  defaultPort: number;
  defaultInstall?: string;
  defaultStart?: string;
}

export interface RunManifest {
  stack?: string;
  install?: string | string[];
  build?: string | string[];
  start?: string;
  port?: number;
  services?: string[];
  env?: Record<string, string>;
  /** Optional readiness probe path (defaults to "/"). */
  healthPath?: string;
}

export const ADAPTERS: StackAdapter[] = [
  {
    id: "node",
    label: "Node / Next.js",
    image: "node:20-alpine",
    markers: [/^package\.json$/],
    mountTarget: "/app",
    defaultPort: 3000,
    defaultInstall: "npm install",
    defaultStart: "npm run dev -- -H 0.0.0.0 -p 3000",
  },
  {
    id: "python",
    label: "Python",
    image: "python:3.12-alpine",
    markers: [/^requirements\.txt$/, /^pyproject\.toml$/, /^app\.py$/, /^manage\.py$/],
    mountTarget: "/app",
    defaultPort: 5000,
    defaultInstall: "pip install --no-cache-dir -r requirements.txt",
    defaultStart: "python app.py",
  },
  {
    id: "php",
    label: "PHP",
    // The composer image is built on php:8.x-cli and bundles composer, so both
    // `composer install` and `php ...` work from one container.
    image: "composer:2",
    markers: [/^composer\.json$/, /^artisan$/],
    mountTarget: "/app",
    defaultPort: 8000,
    defaultInstall: "composer install --no-interaction --no-progress",
    defaultStart: "php -S 0.0.0.0:8000 -t .",
  },
  {
    id: "go",
    label: "Go",
    image: "golang:1.22-alpine",
    markers: [/^go\.mod$/],
    mountTarget: "/app",
    defaultPort: 8080,
    defaultInstall: "go mod download",
    defaultStart: "go run .",
  },
  {
    id: "static",
    label: "Static HTML",
    // Unprivileged image: serves on 8080 as a non-root user, so it runs fine
    // with `--cap-drop ALL` (the stock nginx image needs root caps for port 80).
    image: "nginxinc/nginx-unprivileged:alpine",
    markers: [/^index\.html$/, /^public\/index\.html$/],
    mountTarget: "/usr/share/nginx/html",
    defaultPort: 8080,
    defaultStart: "",
  },
];

const MANIFEST_PATH = ".securesdlc/run.json";

export function parseManifest(files: Record<string, string>): RunManifest | null {
  const raw = files[MANIFEST_PATH];
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RunManifest;
  } catch {
    return null;
  }
}

export function detectStack(files: Record<string, string>): StackAdapter | null {
  const paths = Object.keys(files);
  for (const adapter of ADAPTERS) {
    if (adapter.markers.some((re) => paths.some((p) => re.test(p)))) return adapter;
  }
  return null;
}

function toSteps(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).map((s) => s.trim()).filter(Boolean);
}

export interface ResolvedPlan {
  adapter: StackAdapter;
  stackId: string;
  install: string[];
  build: string[];
  start: string;
  port: number;
  services: string[];
  env: Record<string, string>;
  healthPath?: string;
}

/**
 * Resolves how to run a project: the adapter is chosen from the manifest's
 * `stack` when it matches a known id, else from marker files. Commands fall
 * back to the adapter defaults so a missing/partial manifest still runs.
 */
export function resolvePlan(files: Record<string, string>): ResolvedPlan | null {
  const manifest = parseManifest(files);
  const byManifest = manifest?.stack
    ? ADAPTERS.find((a) => a.id === manifest.stack!.toLowerCase()) ?? null
    : null;
  const adapter = byManifest ?? detectStack(files);
  if (!adapter) return null;

  const install = toSteps(manifest?.install);
  const build = toSteps(manifest?.build);
  const start = manifest?.start?.trim() || adapter.defaultStart || "";
  // Static sites are served by the adapter's own image, so its port is fixed.
  const port =
    adapter.id === "static"
      ? adapter.defaultPort
      : manifest?.port && manifest.port > 0
        ? manifest.port
        : adapter.defaultPort;

  return {
    adapter,
    stackId: adapter.id,
    install: install.length > 0 ? install : toSteps(adapter.defaultInstall),
    build,
    start,
    port,
    services: manifest?.services ?? [],
    env: manifest?.env ?? {},
    healthPath: manifest?.healthPath,
  };
}

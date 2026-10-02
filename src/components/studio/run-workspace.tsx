"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, ExternalLink, Loader2, Monitor, Play, Smartphone, Square, Tablet, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeWorkspace } from "@/components/studio/code-workspace";
import { useToast } from "@/components/ui/toast";
import { csrfFetch } from "@/lib/csrf-client";

type RunStatus = "idle" | "starting" | "running" | "error" | "stopped";
type DeviceSize = "desktop" | "tablet" | "mobile";

export interface RunWorkspaceLabels {
  run: string;
  stop: string;
  starting: string;
  running: string;
  error: string;
  stopped: string;
  notRunning: string;
  noLogs: string;
  logs: string;
  demoAccount: string;
  terminal: string;
  explorer: string;
  preview: string;
  save: string;
  saveAll: string;
  saved: string;
  unsaved: string;
  confirmDiscard: string;
  openInNewTab: string;
  edgeRuntimeHint: string;
  codeErrorHint: string;
}

interface RunWorkspaceProps {
  projectId: string;
  projectName: string;
  files: Record<string, string>;
  activeFile: string | null;
  onSelectFile: (file: string) => void;
  dirty: Set<string>;
  onChange: (file: string, value: string) => void;
  onSave: (file: string) => void;
  onSaveAll: () => void;
  saving: boolean;
  onClose: () => void;
  labels: RunWorkspaceLabels;
}

const DEVICE_WIDTH: Record<DeviceSize, string> = {
  desktop: "100%",
  tablet: "834px",
  mobile: "390px",
};

const STATUS_VARIANT: Record<RunStatus, "secondary" | "success" | "warning" | "danger"> = {
  idle: "secondary",
  starting: "warning",
  running: "success",
  error: "danger",
  stopped: "secondary",
};

const STATUS_LABEL: Record<RunStatus, keyof RunWorkspaceLabels> = {
  idle: "stopped",
  starting: "starting",
  running: "running",
  error: "error",
  stopped: "stopped",
};

export function RunWorkspace({
  projectId,
  projectName,
  files,
  activeFile,
  onSelectFile,
  dirty,
  onChange,
  onSave,
  onSaveAll,
  saving,
  onClose,
  labels,
}: RunWorkspaceProps) {
  const [status, setStatus] = useState<RunStatus>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [stackLabel, setStackLabel] = useState<string>("");
  const [services, setServices] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState("");
  const [stats, setStats] = useState<string | null>(null);
  const [demo, setDemo] = useState<{ email: string; password?: string }[]>([]);
  const [device, setDevice] = useState<DeviceSize>("desktop");
  const [iframeKey, setIframeKey] = useState(0);
  const [polling, setPolling] = useState(false);
  const startedRef = useRef(false);
  const prevStatusRef = useRef<RunStatus | null>(null);
  const { addToast } = useToast();

  // Notify the user once when the app becomes ready (or fails).
  useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev !== status) {
      if (status === "running" && prev !== "running") {
        addToast("success", `${projectName} — ${labels.running}`);
      } else if (status === "error" && prev !== "error") {
        addToast("error", error ?? labels.error);
      }
      prevStatusRef.current = status;
    }
  }, [status, error, projectName, labels.running, labels.error, addToast]);

  const start = useCallback(async () => {
    setStatus("starting");
    setError(null);
    setLogs("");
    setUrl(null);
    setPolling(false);
    try {
      const res = await csrfFetch(`/api/run/${projectId}`, { method: "POST" });
      const data = (await res.json()) as { error?: string; stackLabel?: string; services?: string[]; demo?: { email: string; password?: string }[] };
      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? labels.error);
        return;
      }
      setStackLabel(data.stackLabel ?? "");
      setServices(data.services ?? []);
      setDemo(data.demo ?? []);
      // Only start polling once the container exists: during the (slow) start
      // request the status endpoint reports "stopped" because no session exists
      // yet, which would otherwise cancel polling prematurely.
      setPolling(true);
    } catch {
      setStatus("error");
      setError(labels.error);
    }
  }, [projectId, labels.error]);

  const stop = useCallback(async () => {
    setPolling(false);
    try {
      await csrfFetch(`/api/run/${projectId}`, { method: "DELETE" });
    } catch {
      // ignore
    }
    setStatus("stopped");
    setUrl(null);
  }, [projectId]);

  const handleClose = useCallback(() => {
    if (dirty.size > 0 && !window.confirm(labels.confirmDiscard)) return;
    void stop();
    onClose();
  }, [stop, onClose, dirty, labels.confirmDiscard]);

  // On open: adopt an already-running session, otherwise start a new one.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void (async () => {
      try {
        const res = await fetch(`/api/run/${projectId}/status`);
        const data = (await res.json()) as {
          status: RunStatus;
          url: string | null;
          stackLabel?: string;
          services?: string[];
          demo?: { email: string; password?: string }[];
        };
        if (data.status === "running" || data.status === "starting") {
          setStatus(data.status);
          setUrl(data.url ?? null);
          if (data.stackLabel) setStackLabel(data.stackLabel);
          if (data.services) setServices(data.services);
          if (data.demo) setDemo(data.demo);
          setPolling(true);
          return;
        }
      } catch {
        // fall through to a fresh start
      }
      void start();
    })();
  }, [projectId, start]);

  // Poll status while a session exists. Kept running through "error" so a slow
  // install that later becomes ready recovers automatically.
  useEffect(() => {
    if (!polling) return;
    if (status === "stopped") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/run/${projectId}/status`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          status: RunStatus;
          url: string | null;
          stackLabel?: string;
          services?: string[];
          stats?: string | null;
          error?: string;
          logs?: string;
          demo?: { email: string; password?: string }[];
        };
        if (cancelled) return;
        setStatus(data.status);
        setUrl(data.url ?? null);
        if (data.stackLabel) setStackLabel(data.stackLabel);
        if (data.services) setServices(data.services);
        if (data.demo) setDemo(data.demo);
        if (data.error) setError(data.error);
        if (data.logs) setLogs(data.logs);
        setStats(data.stats ?? null);
      } catch {
        // transient
      }
    };
    void tick();
    const id = setInterval(tick, 2500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [polling, status, projectId]);

  // Stream container logs (SSE) once a session exists. Keyed on `polling` (not
  // `status`) so a starting -> running transition does not reopen the stream and
  // replay the last 200 lines as duplicates.
  useEffect(() => {
    if (!polling) return;
    const es = new EventSource(`/api/run/${projectId}/logs/stream`);
    es.onmessage = (e) => {
      if (!e.data) return;
      setLogs((prev) => `${prev}${e.data}\n`.slice(-20_000));
    };
    // The server emits a named "end" event when there is no live session.
    const onEnd = () => es.close();
    es.addEventListener("end", onEnd);
    es.onerror = () => es.close();
    return () => {
      es.removeEventListener("end", onEnd);
      es.close();
    };
  }, [polling, projectId]);

  // The app runs on the same host as the studio but a different port, so point
  // at the browser's hostname so a user on another device reaches this server.
  const appUrl =
    url && typeof window !== "undefined"
      ? url.replace("localhost", window.location.hostname || "localhost")
      : url;

  // Surface common generated-code failures instead of leaving the user with a
  // blank/error preview: an Edge middleware importing a Node-only module, or a
  // runtime/syntax error inside the generated source.
  const logErrorHint = /edge runtime does not support/i.test(logs)
    ? labels.edgeRuntimeHint
    : /(ReferenceError|SyntaxError|is not defined|Cannot find module|Module not found)/i.test(
        logs,
      )
      ? labels.codeErrorHint
      : null;

  const preview = appUrl ? (
    <div className="flex h-full w-full justify-center overflow-auto bg-muted/40 p-2">
      <div style={{ width: DEVICE_WIDTH[device], maxWidth: "100%" }} className="h-full">
        <iframe
          key={iframeKey}
          src={appUrl}
          title="App preview"
          className="h-full w-full rounded-md border bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />
      </div>
    </div>
  ) : (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
      {status === "starting" ? (
        <>
          <Loader2 className="size-5 animate-spin" />
          {labels.starting}
        </>
      ) : (
        <span className="text-destructive">{error ?? labels.notRunning}</span>
      )}
    </div>
  );

  const terminal = (
    <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-muted-foreground">
      {logs || labels.noLogs}
    </pre>
  );

  const deviceBtn = (size: DeviceSize, Icon: typeof Monitor, title: string) => (
    <button
      type="button"
      title={title}
      onClick={() => setDevice(size)}
      className={`flex size-7 items-center justify-center rounded-md ${device === size ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}
    >
      <Icon className="size-4" />
    </button>
  );

  return (
    <div className="fixed inset-0 z-[70] flex h-dvh flex-col bg-background">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-sm font-semibold">{projectName}</h2>
          {stackLabel && <Badge variant="secondary">{stackLabel}</Badge>}
          <Badge variant={STATUS_VARIANT[status]}>{labels[STATUS_LABEL[status]]}</Badge>
          {services.length > 0 && <Badge variant="outline">{services.join(", ")}</Badge>}
          {stats && <Badge variant="muted">{stats.replace("|", " · ")}</Badge>}
        </div>
        <div className="flex items-center gap-1.5">
          {deviceBtn("desktop", Monitor, "Desktop")}
          {deviceBtn("tablet", Tablet, "Tablet")}
          {deviceBtn("mobile", Smartphone, "Mobile")}
          {appUrl && (
            <>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setIframeKey((k) => k + 1)}>
                Reload
              </Button>
              <a
                href={appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ExternalLink className="size-3.5" /> {labels.openInNewTab}
              </a>
            </>
          )}
          {status === "running" || status === "starting" ? (
            <Button size="sm" variant="outline" onClick={stop}>
              <Square className="size-3.5" /> {labels.stop}
            </Button>
          ) : (
            <Button size="sm" onClick={start}>
              <Play className="size-3.5" /> {labels.run}
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={handleClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>
      </div>
      {logErrorHint && (
        <div className="flex shrink-0 items-start gap-2 border-b border-warning/40 bg-warning/10 px-3 py-1.5 text-[11px] text-warning">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>{logErrorHint}</span>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <CodeWorkspace
          variant="popup"
          files={files}
          activeFile={activeFile}
          onSelectFile={onSelectFile}
          dirty={dirty}
          onChange={onChange}
          onSave={onSave}
          onSaveAll={onSaveAll}
          saving={saving}
          preview={preview}
          terminal={terminal}
          terminalTitle={labels.logs}
          demoPanel={demo.length > 0 ? <DemoAccountList accounts={demo} title={labels.demoAccount} /> : undefined}
          demoLabel={labels.demoAccount}
          loadingLabel="Loading editor..."
          labels={{
            save: labels.save,
            saveAll: labels.saveAll,
            saved: labels.saved,
            unsaved: labels.unsaved,
            terminal: labels.terminal,
            explorer: labels.explorer,
            preview: labels.preview,
            demo: labels.demoAccount,
          }}
        />
      </div>
    </div>
  );
}

/** Sidebar panel (opened from the key icon) listing the run's demo accounts. */
function DemoAccountList({
  accounts,
  title,
}: {
  accounts: { email: string; password?: string }[];
  title: string;
}) {
  return (
    <div className="space-y-2">
      <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {accounts.map((a) => {
        const credential = a.password ? `${a.email} / ${a.password}` : a.email;
        return (
          <div key={a.email} className="rounded-md border bg-card p-2 text-[11px]">
            <div className="flex items-start justify-between gap-1">
              <span className="break-all font-mono text-foreground">{a.email}</span>
              <CopyButton value={credential} />
            </div>
            {a.password && (
              <p className="mt-1 break-all font-mono text-muted-foreground">{a.password}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copy"
      aria-label="Copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard unavailable
        }
      }}
      className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
    </button>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Monitor, Play, Smartphone, Square, Tablet, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeWorkspace } from "@/components/studio/code-workspace";
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

  const start = useCallback(async () => {
    setStatus("starting");
    setError(null);
    setLogs("");
    setUrl(null);
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

  // Stream container logs (SSE) while the app is starting or running.
  useEffect(() => {
    if (status !== "starting" && status !== "running") return;
    const es = new EventSource(`/api/run/${projectId}/logs/stream`);
    es.onmessage = (e) => {
      if (!e.data) return;
      setLogs((prev) => `${prev}${e.data}\n`.slice(-20_000));
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [status, projectId]);

  const preview = url ? (
    <div className="flex h-full w-full justify-center overflow-auto bg-muted/40 p-2">
      <div style={{ width: DEVICE_WIDTH[device], maxWidth: "100%" }} className="h-full">
        <iframe
          key={iframeKey}
          src={url}
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
          {url && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setIframeKey((k) => k + 1)}>
              Reload
            </Button>
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
      {demo.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">{labels.demoAccount}:</span>
          {demo.map((a) => (
            <span key={a.email} className="rounded bg-background px-1.5 py-0.5 font-mono">
              {a.email}
              {a.password ? ` / ${a.password}` : ""}
            </span>
          ))}
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
          loadingLabel="Loading editor..."
          labels={{
            save: labels.save,
            saveAll: labels.saveAll,
            saved: labels.saved,
            unsaved: labels.unsaved,
            terminal: labels.terminal,
            explorer: labels.explorer,
            preview: labels.preview,
          }}
        />
      </div>
    </div>
  );
}

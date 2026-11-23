"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Eraser, ExternalLink, Loader2, Monitor, Pause, Play, RotateCw, Search, Smartphone, Square, Tablet, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeWorkspace } from "@/components/studio/code-workspace";
import { CopyButton } from "@/components/ui/copy-button";
import { useToast } from "@/components/ui/toast";
import { fmt } from "@/lib/format";
import { RUN_PHASES as PHASES, inferRunPhase, type RunPhase } from "@/lib/run-phase";
import { cn } from "@/lib/utils";
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
  phaseLabel: string;
  phaseContainer: string;
  phaseInstall: string;
  phaseStart: string;
  phaseReady: string;
  logSearch: string;
  logPause: string;
  logResume: string;
  logClear: string;
  logMatches: string;
  copy: string;
  copied: string;
  reload: string;
  deviceDesktop: string;
  deviceTablet: string;
  deviceMobile: string;
  appPreview: string;
  close: string;
  loadingEditor: string;
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
          title={labels.appPreview}
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

  const terminal = <LogViewer logs={logs} labels={labels} />;
  const phase = inferRunPhase(status, logs);
  const phaseLabels: Record<RunPhase, string> = {
    container: labels.phaseContainer,
    install: labels.phaseInstall,
    start: labels.phaseStart,
    ready: labels.phaseReady,
  };

  const deviceBtn = (size: DeviceSize, Icon: typeof Monitor, title: string) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={device === size}
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
          {deviceBtn("desktop", Monitor, labels.deviceDesktop)}
          {deviceBtn("tablet", Tablet, labels.deviceTablet)}
          {deviceBtn("mobile", Smartphone, labels.deviceMobile)}
          {appUrl && (
            <>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setIframeKey((k) => k + 1)}>
                <RotateCw className="size-3.5" /> {labels.reload}
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
          <Button size="icon" variant="ghost" onClick={handleClose} aria-label={labels.close} title={labels.close}>
            <X className="size-4" />
          </Button>
        </div>
      </div>
      {status === "starting" && (
        <ol
          aria-label={labels.phaseLabel}
          className="flex shrink-0 items-center gap-1 overflow-x-auto border-b px-3 py-1.5 text-[11px]"
        >
          {PHASES.map((p, i) => {
            const idx = PHASES.indexOf(phase);
            const done = i < idx;
            const current = i === idx;
            return (
              <li
                key={p}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5",
                  done && "text-success",
                  current && "bg-primary/10 font-medium text-primary",
                  !done && !current && "text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="size-3" />
                ) : current ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <span className="size-1.5 rounded-full bg-current opacity-50" aria-hidden="true" />
                )}
                {phaseLabels[p]}
              </li>
            );
          })}
        </ol>
      )}
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
          demoPanel={demo.length > 0 ? <DemoAccountList accounts={demo} title={labels.demoAccount} labels={labels} /> : undefined}
          demoLabel={labels.demoAccount}
          loadingLabel={labels.loadingEditor}
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
  labels,
}: {
  accounts: { email: string; password?: string }[];
  title: string;
  labels: { copy: string; copied: string };
}) {
  return (
    <div className="space-y-2">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {accounts.map((a) => {
        const credential = a.password ? `${a.email} / ${a.password}` : a.email;
        return (
          <div key={a.email} className="rounded-md border bg-card p-2 text-[11px]">
            <div className="flex items-start justify-between gap-1">
              <span className="break-all font-mono text-foreground">{a.email}</span>
              <CopyButton value={credential} label={labels.copy} copiedLabel={labels.copied} />
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

const ERROR_LINE = /\b(error|failed|exception|fatal|ERR!|Traceback)\b/i;
const WARN_LINE = /\b(warn|warning|deprecated)\b/i;

/** Container log viewer: search, pausable auto-scroll, copy, clear, coloured lines. */
function LogViewer({ logs, labels }: { logs: string; labels: RunWorkspaceLabels }) {
  const [query, setQuery] = useState("");
  const [paused, setPaused] = useState(false);
  // Polling replaces the whole log tail, so "clear" remembers the last line seen
  // and hides everything up to it instead of mutating the shared log state.
  const [clearMarker, setClearMarker] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const allLines = useMemo(() => (logs ? logs.replace(/\n$/, "").split("\n") : []), [logs]);
  const lines = useMemo(() => {
    if (clearMarker === null) return allLines;
    const at = allLines.lastIndexOf(clearMarker);
    return at >= 0 ? allLines.slice(at + 1) : allLines;
  }, [allLines, clearMarker]);
  const onClear = () => setClearMarker(allLines[allLines.length - 1] ?? null);
  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () => (q ? lines.filter((l) => l.toLowerCase().includes(q)) : lines),
    [lines, q],
  );

  useEffect(() => {
    if (paused) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visible, paused]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b px-1 pb-1.5">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute start-1.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.logSearch}
            aria-label={labels.logSearch}
            className="h-7 w-full rounded-md border border-input bg-background ps-6 pe-2 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          title={paused ? labels.logResume : labels.logPause}
          aria-label={paused ? labels.logResume : labels.logPause}
          className={cn(
            "rounded p-1.5 hover:bg-muted",
            paused ? "text-warning" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
        </button>
        <CopyButton value={logs} label={labels.copy} copiedLabel={labels.copied} className="p-1.5" />
        <button
          type="button"
          onClick={onClear}
          title={labels.logClear}
          aria-label={labels.logClear}
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Eraser className="size-3.5" />
        </button>
      </div>
      {q && (
        <p className="shrink-0 px-1 pt-1 text-[11px] text-muted-foreground tabular-nums" aria-live="polite">
          {fmt(labels.logMatches, { count: visible.length })}
        </p>
      )}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pt-1" role="log" aria-live="off">
        {visible.length === 0 ? (
          <p className="font-mono text-[11px] text-muted-foreground">{labels.noLogs}</p>
        ) : (
          <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
            {visible.map((line, i) => (
              <span
                key={i}
                className={cn(
                  "block",
                  ERROR_LINE.test(line)
                    ? "text-danger"
                    : WARN_LINE.test(line)
                      ? "text-warning"
                      : "text-muted-foreground",
                )}
              >
                {line || " "}
              </span>
            ))}
          </pre>
        )}
      </div>
    </div>
  );
}
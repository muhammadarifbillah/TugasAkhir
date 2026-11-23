"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Eye, Files, KeyRound, Loader2, Save, TerminalSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileEditor, inferLanguage } from "@/components/studio/code-editor";

export interface CodeWorkspaceLabels {
  unsaved?: string;
  save?: string;
  saveAll?: string;
  terminal?: string;
  explorer?: string;
  preview?: string;
  saved?: string;
  demo?: string;
}

export interface CodeWorkspaceProps {
  files: Record<string, string>;
  activeFile: string | null;
  onSelectFile: (file: string) => void;
  dirty?: Set<string>;
  onChange?: (file: string, value: string) => void;
  onSave?: (file: string) => void;
  onSaveAll?: () => void;
  saving?: boolean;
  readOnly?: boolean;
  variant?: "studio" | "popup";
  preview?: React.ReactNode;
  terminal?: React.ReactNode;
  terminalTitle?: string;
  /** Sidebar panel shown by the demo/credentials rail icon. */
  demoPanel?: React.ReactNode;
  demoLabel?: string;
  editorOverride?: React.ReactNode;
  emptyLabel?: string;
  loadingLabel?: string;
  headerActions?: React.ReactNode;
  statusRight?: React.ReactNode;
  labels?: CodeWorkspaceLabels;
  /** 1-based line to scroll to / place the cursor on in the active file. */
  revealLine?: number | null;
  revealKey?: number;
}

const MIN_TERMINAL = 96;
const MAX_TERMINAL = 520;

export function CodeWorkspace({
  files,
  activeFile,
  onSelectFile,
  dirty,
  onChange,
  onSave,
  onSaveAll,
  saving,
  readOnly,
  variant = "studio",
  preview,
  terminal,
  terminalTitle,
  demoPanel,
  demoLabel,
  editorOverride,
  emptyLabel,
  loadingLabel,
  headerActions,
  statusRight,
  labels,
  revealLine,
  revealKey,
}: CodeWorkspaceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sortedFiles = useMemo(() => Object.keys(files).sort(), [files]);
  const hasPreview = preview !== undefined && preview !== null;
  const [view, setView] = useState<"preview" | "file">(hasPreview ? "preview" : "file");
  const [sidePanel, setSidePanel] = useState<"explorer" | "demo" | null>(
    variant === "popup" ? "explorer" : null,
  );
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(180);
  const dragRef = useRef<{ y: number; h: number } | null>(null);

  const dirtyCount = dirty ? dirty.size : 0;

  const selectFile = useCallback(
    (file: string) => {
      setView("file");
      onSelectFile(file);
    },
    [onSelectFile],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "s") return;
      // Only while focus is inside this workspace (editor, tabs, explorer), so a
      // second mounted workspace or an unrelated input never triggers a save.
      if (!rootRef.current?.contains(document.activeElement)) return;
      e.preventDefault();
      if (e.shiftKey) onSaveAll?.();
      else if (activeFile && dirty?.has(activeFile)) onSave?.(activeFile);
    },
    [activeFile, dirty, onSave, onSaveAll],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Warn before a full page unload while there are unsaved edits.
  useEffect(() => {
    if (dirtyCount === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirtyCount]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      setTerminalHeight(Math.min(MAX_TERMINAL, Math.max(MIN_TERMINAL, d.h + (d.y - e.clientY))));
    };
    const up = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  const content =
    view === "preview" && hasPreview ? (
      preview
    ) : editorOverride ? (
      editorOverride
    ) : activeFile && files[activeFile] !== undefined ? (
      <FileEditor
        value={files[activeFile]}
        language={inferLanguage(activeFile)}
        readOnly={readOnly}
        onChange={readOnly ? undefined : (value) => onChange?.(activeFile, value)}
        loadingLabel={loadingLabel}
        revealLine={revealLine}
        revealKey={revealKey}
      />
    ) : (
      <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
        {emptyLabel}
      </div>
    );

  const tabClass = (active: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs transition-colors ${
      active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent"
    }`;

  return (
    <div ref={rootRef} className="flex h-full min-h-0 flex-col bg-background">
      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto border-b px-2 py-1.5">
        {hasPreview && (
          <button type="button" onClick={() => setView("preview")} className={tabClass(view === "preview")}>
            <Eye className="size-3.5" />
            {labels?.preview ?? "Preview"}
          </button>
        )}
        {sortedFiles.map((file) => (
          <button key={file} type="button" onClick={() => selectFile(file)} className={tabClass(view === "file" && activeFile === file)}>
            <span className="truncate max-w-[220px]">{file}</span>
            {dirty?.has(file) && <span className="size-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />}
          </button>
        ))}
        {sortedFiles.length === 0 && !hasPreview && (
          <span className="px-2 py-1 text-xs text-muted-foreground">{emptyLabel}</span>
        )}
        {headerActions && <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-2">{headerActions}</div>}
      </div>

      <div className="flex min-h-0 flex-1">
        {variant === "popup" && (
          <div className="flex w-10 shrink-0 flex-col items-center gap-1 border-r py-2">
            <button
              type="button"
              title={labels?.explorer ?? "Explorer"}
              onClick={() => setSidePanel((p) => (p === "explorer" ? null : "explorer"))}
              className={`flex size-8 items-center justify-center rounded-md ${sidePanel === "explorer" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}
            >
              <Files className="size-4" />
            </button>
            {demoPanel && (
              <button
                type="button"
                title={demoLabel ?? labels?.demo ?? "Demo account"}
                onClick={() => setSidePanel((p) => (p === "demo" ? null : "demo"))}
                className={`flex size-8 items-center justify-center rounded-md ${sidePanel === "demo" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}
              >
                <KeyRound className="size-4" />
              </button>
            )}
            {terminal && (
              <button
                type="button"
                title={labels?.terminal ?? "Terminal"}
                onClick={() => setTerminalOpen((v) => !v)}
                className={`flex size-8 items-center justify-center rounded-md ${terminalOpen ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}
              >
                <TerminalSquare className="size-4" />
              </button>
            )}
          </div>
        )}

        {sidePanel === "explorer" && (
          <div className="hidden w-56 shrink-0 overflow-y-auto border-r p-2 sm:block">
            {sortedFiles.map((file) => (
              <button
                key={file}
                type="button"
                onClick={() => selectFile(file)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left font-mono text-xs ${
                  activeFile === file ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className="truncate">{file}</span>
                {dirty?.has(file) && <span className="ml-auto size-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />}
              </button>
            ))}
          </div>
        )}

        {sidePanel === "demo" && demoPanel && (
          <div className="w-56 shrink-0 overflow-y-auto border-r p-2">{demoPanel}</div>
        )}

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">{content}</div>

          {terminal && terminalOpen && (
            <>
              <div
                onPointerDown={(e) => {
                  dragRef.current = { y: e.clientY, h: terminalHeight };
                }}
                className="h-1 shrink-0 cursor-row-resize bg-border/60 hover:bg-primary/50"
              />
              <div style={{ height: terminalHeight }} className="shrink-0 overflow-auto border-t bg-muted/30">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                  <span>{terminalTitle ?? labels?.terminal ?? "Terminal"}</span>
                  <button type="button" onClick={() => setTerminalOpen(false)} aria-label="Hide terminal">
                    <ChevronDown className="size-3.5" />
                  </button>
                </div>
                <div className="p-2">{terminal}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between gap-2 border-t px-3 py-1 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          {dirtyCount > 0 ? (
            <span className="text-warning">
              {dirtyCount} {labels?.unsaved ?? "unsaved"}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Check className="size-3 text-success" />
              {labels?.saved ?? "Saved"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {terminal && (
            <button
              type="button"
              onClick={() => setTerminalOpen((v) => !v)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted"
            >
              {terminalOpen ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
              {labels?.terminal ?? "Terminal"}
            </button>
          )}
          {!readOnly && onSave && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[11px]"
              disabled={!activeFile || !dirty?.has(activeFile) || saving}
              onClick={() => activeFile && onSave(activeFile)}
            >
              {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
              {labels?.save ?? "Save"}
            </Button>
          )}
          {!readOnly && onSaveAll && (
            <Button
              size="sm"
              className="h-6 px-2 text-[11px]"
              disabled={dirtyCount === 0 || saving}
              onClick={onSaveAll}
            >
              {labels?.saveAll ?? "Save All"}
            </Button>
          )}
          {statusRight}
        </div>
      </div>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { loader } from "@monaco-editor/react";
import { useTheme } from "next-themes";

// Serve Monaco from our own origin (copied to public/monaco/vs by
// scripts/copy-monaco.mjs) instead of the jsdelivr CDN. The path must be
// absolute (with origin) because Monaco's language workers are created from
// blob: URLs, where a root-relative path like "/monaco/vs" fails to resolve.
if (typeof window !== "undefined") {
  loader.config({ paths: { vs: `${window.location.origin}/monaco/vs` } });
}

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const DiffEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.DiffEditor), {
  ssr: false,
});

interface FileEditorProps {
  value: string;
  language?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  loadingLabel?: string;
  revealLine?: number | null;
  /** Changes on every reveal request so clicking the same location again re-reveals it. */
  revealKey?: number;
  fontSize?: number;
}

const EXT_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  md: "markdown",
  yml: "yaml",
  yaml: "yaml",
  css: "css",
  html: "html",
  py: "python",
  go: "go",
  sql: "sql",
  env: "shell",
  sh: "shell",
};

export function inferLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXT_LANG[ext] ?? "plaintext";
}

type EditorInstance = Parameters<NonNullable<ComponentProps<typeof MonacoEditor>["onMount"]>>[0];

export function FileEditor({ value, language, onChange, readOnly, loadingLabel, revealLine, revealKey, fontSize = 13 }: FileEditorProps) {
  const editorRef = useRef<EditorInstance | null>(null);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !revealLine || revealLine < 1) return;
    // Defer one tick so a just-switched file's content is in the model first.
    const id = setTimeout(() => {
      const line = Math.min(revealLine, editor.getModel()?.getLineCount() ?? revealLine);
      editor.revealLineInCenter(line);
      editor.setSelection({ startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: Number.MAX_SAFE_INTEGER });
      editor.focus();
    }, 0);
    return () => clearTimeout(id);
  }, [revealLine, revealKey, mounted]);

  const monacoProps: ComponentProps<typeof MonacoEditor> = {
    height: "100%",
    language,
    value,
    onChange: readOnly ? undefined : ((v?: string) => onChange?.(v ?? "")) as never,
    options: {
      readOnly: !!readOnly,
      minimap: { enabled: false },
      fontSize,
      scrollBeyondLastLine: false,
      wordWrap: "on",
      renderLineHighlight: "all",
      tabSize: 2,
      automaticLayout: true,
      padding: { top: 8, bottom: 8 },
    },
    theme: resolvedTheme === "light" ? "light" : "vs-dark",
    onMount: (editor) => {
      editorRef.current = editor;
      setMounted(true);
    },
    loading: <div className="p-4 text-xs text-muted-foreground">{loadingLabel ?? "Loading editor..."}</div>,
  };

  return <MonacoEditor {...monacoProps} />;
}

export function MonacoDiff({
  original,
  modified,
  language,
}: {
  original: string;
  modified: string;
  language?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sideBySide, setSideBySide] = useState(true);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSideBySide(entry.contentRect.width >= 600);
    });
    ro.observe(el);
    setSideBySide(el.clientWidth >= 600);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-full">
      <DiffEditor
        height="100%"
        original={original}
        modified={modified}
        language={language}
        theme={resolvedTheme === "light" ? "light" : "vs-dark"}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          scrollBeyondLastLine: false,
          renderSideBySide: sideBySide,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
/** Read-only Monaco viewer with syntax highlighting, for result dialogs. */
export function CodeViewer({
  value,
  path,
  height = 320,
  loadingLabel,
}: {
  value: string;
  path: string;
  height?: number | string;
  loadingLabel?: string;
}) {
  return (
    <div style={{ height }} className="overflow-hidden rounded-md border">
      <FileEditor value={value} language={inferLanguage(path)} readOnly loadingLabel={loadingLabel} fontSize={12} />
    </div>
  );
}
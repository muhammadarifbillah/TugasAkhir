"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";

interface FullscreenViewerProps {
  title: string;
  onClose: () => void;
  maximized: boolean;
  onToggleMaximize: () => void;
  children: React.ReactNode;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export function FullscreenViewer({
  title,
  onClose,
  maximized,
  onToggleMaximize,
  children,
}: FullscreenViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const panStart = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  const zoomIn = useCallback(
    () => setZoom((z) => Math.min(MAX_ZOOM, Math.round((z + ZOOM_STEP) * 100) / 100)),
    [],
  );
  const zoomOut = useCallback(
    () => setZoom((z) => Math.max(MIN_ZOOM, Math.round((z - ZOOM_STEP) * 100) / 100)),
    [],
  );
  const resetZoom = useCallback(() => setZoom(1), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Restore the window first when maximized, otherwise close the viewer.
        if (maximized) onToggleMaximize();
        else onClose();
        return;
      }
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        resetZoom();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, maximized, onToggleMaximize, zoomIn, zoomOut, resetZoom]);

  // Drag-to-pan for mouse: grab anywhere on the content and move it in any
  // direction. Touch keeps the browser's native overflow scrolling.
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("a,button,input,textarea,select")) return;
    const el = contentRef.current;
    if (!el) return;
    if (el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight) return;
    panStart.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // capture is a best-effort optimisation; dragging still works without it
    }
    setIsPanning(true);
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const start = panStart.current;
    const el = contentRef.current;
    if (!start || !el) return;
    el.scrollLeft = start.left - (e.clientX - start.x);
    el.scrollTop = start.top - (e.clientY - start.y);
  }, []);

  const endPan = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!panStart.current) return;
    panStart.current = null;
    setIsPanning(false);
    try {
      contentRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // capture may already be released
    }
  }, []);

  const iconBtn =
    "flex size-9 shrink-0 items-center justify-center rounded-md hover:bg-muted disabled:opacity-40";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4 sm:py-3 md:px-6">
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base md:text-lg">{title}</h2>
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-0.5">
          <button onClick={zoomOut} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out" title="Zoom out" className={iconBtn}>
            <ZoomOut className="size-4" />
          </button>
          <button
            onClick={resetZoom}
            aria-label="Reset zoom"
            title="Reset zoom"
            className="min-w-11 shrink-0 rounded-md px-1 py-1.5 text-xs tabular-nums text-muted-foreground hover:bg-muted"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={zoomIn} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in" title="Zoom in" className={iconBtn}>
            <ZoomIn className="size-4" />
          </button>
          <button onClick={resetZoom} aria-label="Fit to screen" title="Fit to screen" className={iconBtn}>
            <RotateCcw className="size-4" />
          </button>
          <span className="mx-0.5 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
          <button
            onClick={onToggleMaximize}
            aria-label={maximized ? "Restore" : "Maximize"}
            title={maximized ? "Restore" : "Maximize"}
            className={iconBtn}
          >
            {maximized ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
          <button onClick={onClose} aria-label="Close" title="Close" className={iconBtn}>
            <X className="size-5" />
          </button>
        </div>
      </div>
      <div
        ref={contentRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        className={`min-h-0 flex-1 overflow-auto p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-4 md:p-6 ${
          zoom !== 1 ? (isPanning ? "cursor-grabbing select-none" : "cursor-grab") : ""
        }`}
      >
        {/* The spacer reserves the scaled layout size so the overflow container
            can scroll/pan; the inner box is counter-scaled so the transform
            yields exactly `zoom`× the available area. */}
        <div style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
          <div
            style={{
              width: `${100 / zoom}%`,
              height: `${100 / zoom}%`,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

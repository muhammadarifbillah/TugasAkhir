"use client";

import { useEffect, useRef, useState } from "react";
import { Accessibility, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type FontSize = "sm" | "md" | "lg";

interface AccessibilityToggleProps {
  labels: {
    title: string;
    fontSize: string;
    contrast: string;
    contrastHigh: string;
    contrastNormal: string;
  };
}

function apply(size: FontSize, highContrast: boolean) {
  const root = document.documentElement;
  if (size === "md") root.removeAttribute("data-fontsize");
  else root.setAttribute("data-fontsize", size);
  if (highContrast) root.setAttribute("data-contrast", "high");
  else root.removeAttribute("data-contrast");
}

/** Header control for manual font-size and high-contrast preferences. */
export function AccessibilityToggle({ labels }: AccessibilityToggleProps) {
  const [open, setOpen] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("a11y-fontsize") as FontSize) || "md"
      : "md",
  );
  const [contrast, setContrast] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("a11y-contrast") === "high" : false,
  );
  const ref = useRef<HTMLDivElement>(null);

  // Reflect the stored preference on the document (no state update here).
  useEffect(() => {
    apply(fontSize, contrast);
  }, [fontSize, contrast]);

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function setSize(size: FontSize) {
    setFontSize(size);
    localStorage.setItem("a11y-fontsize", size);
    apply(size, contrast);
  }

  function toggleContrast() {
    const next = !contrast;
    setContrast(next);
    localStorage.setItem("a11y-contrast", next ? "high" : "normal");
    apply(fontSize, next);
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={labels.title}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <Accessibility className="size-4" />
      </Button>

      {open && (
        <div className="card-elevated absolute end-0 top-[calc(100%+6px)] z-50 w-56 rounded-lg border bg-popover p-3 text-popover-foreground">
          <p className="mb-2 text-xs font-semibold">{labels.title}</p>

          <p className="mb-1 text-[11px] text-muted-foreground">{labels.fontSize}</p>
          <div className="mb-3 flex rounded-md border p-0.5">
            {(["sm", "md", "lg"] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSize(size)}
                aria-pressed={fontSize === size}
                className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                  fontSize === size ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {size === "sm" ? "A-" : size === "md" ? "A" : "A+"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleContrast}
            aria-pressed={contrast}
            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-muted"
          >
            <span>{labels.contrast}</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              {contrast ? labels.contrastHigh : labels.contrastNormal}
              {contrast && <Check className="size-3 text-primary" />}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

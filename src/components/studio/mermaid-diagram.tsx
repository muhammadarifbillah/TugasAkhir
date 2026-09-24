"use client";

import { useEffect, useRef } from "react";
import mermaid from "mermaid";

let initialized = false;

interface MermaidDiagramProps {
  code: string;
  id: string;
  /** "fullscreen" makes the rendered SVG scale to fill the available area. */
  variant?: "inline" | "fullscreen";
}

export function MermaidDiagram({ code, id, variant = "inline" }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const theme = document.documentElement.classList.contains("dark") ? "dark" : "default";
    if (!initialized) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        fontFamily: "var(--font-geist-sans)",
        theme,
      });
      initialized = true;
    }
    if (!ref.current) return;
    const graphId = `mmd-${id}-${Math.random().toString(36).slice(2, 8)}`;
    mermaid
      .render(graphId, code)
      .then(({ svg }) => {
        if (!ref.current) return;
        ref.current.innerHTML = svg;
        if (variant === "fullscreen") {
          // Mermaid ships fixed pixel dimensions and a natural max-width. In
          // fullscreen we let the SVG fill the area and scale its viewBox to
          // fit (contain) so the whole diagram stays visible.
          const svgEl = ref.current.querySelector("svg");
          if (svgEl) {
            svgEl.removeAttribute("width");
            svgEl.removeAttribute("height");
            svgEl.style.width = "100%";
            svgEl.style.height = "100%";
            svgEl.style.maxWidth = "100%";
            svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
          }
        }
      })
      .catch(() => {
        if (ref.current) {
          ref.current.textContent = code;
        }
      });
  }, [code, id, variant]);

  return (
    <div
      className={
        variant === "fullscreen"
          ? "h-full w-full overflow-auto rounded-lg border bg-card p-2 sm:p-4"
          : "w-full overflow-auto rounded-lg border bg-card p-4"
      }
    >
      <div
        ref={ref}
        className={variant === "fullscreen" ? "flex h-full w-full items-center justify-center" : undefined}
      />
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import mermaid from "mermaid";
import { sanitizeMermaid } from "@/lib/mermaid";

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
        // On a parse failure we want a rejected promise (handled below) instead
        // of Mermaid injecting its own "Syntax error" graphic.
        suppressErrorRendering: true,
      });
      initialized = true;
    }
    if (!ref.current) return;

    let cancelled = false;
    const baseId = `mmd-${id}-${Math.random().toString(36).slice(2, 8)}`;

    const renderCandidate = async (candidate: string, attempt: number): Promise<string> => {
      await mermaid.parse(candidate);
      const { svg } = await mermaid.render(`${baseId}-${attempt}`, candidate);
      if (/Syntax error in text/i.test(svg)) throw new Error("mermaid syntax error");
      return svg;
    };

    const run = async () => {
      const candidates = [code, sanitizeMermaid(code)];
      for (let i = 0; i < candidates.length; i++) {
        try {
          const svg = await renderCandidate(candidates[i], i);
          if (cancelled || !ref.current) return;
          ref.current.innerHTML = svg;
          if (variant === "fullscreen") {
            // Let the SVG fill + scale (contain) the available area.
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
          return;
        } catch {
          // try the next (sanitised) candidate
        }
      }
      // All candidates failed: show the source, not Mermaid's error graphic.
      if (cancelled || !ref.current) return;
      ref.current.innerHTML = "";
      const pre = document.createElement("pre");
      pre.className = "max-h-64 overflow-auto whitespace-pre-wrap break-words text-[11px] text-muted-foreground";
      pre.textContent = code;
      ref.current.appendChild(pre);
    };

    void run();
    return () => {
      cancelled = true;
    };
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

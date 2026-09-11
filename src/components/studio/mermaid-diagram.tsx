"use client";

import { useEffect, useRef } from "react";
import mermaid from "mermaid";

let initialized = false;

export function MermaidDiagram({ code, id }: { code: string; id: string }) {
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
        if (ref.current) ref.current.innerHTML = svg;
      })
      .catch(() => {
        if (ref.current) {
          ref.current.textContent = code;
        }
      });
  }, [code, id]);

  return <div ref={ref} className="w-full overflow-auto rounded-lg border bg-card p-4" />;
}
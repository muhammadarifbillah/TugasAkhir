"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DesignScreen as DesignScreenType } from "@/lib/design";

/** Logical viewport each mockup is authored against. */
const LOGICAL: Record<DesignScreenType["device"], { w: number; h: number }> = {
  desktop: { w: 1280, h: 800 },
  tablet: { w: 834, h: 1112 },
  mobile: { w: 390, h: 844 },
};

/**
 * Allows inline scripts (the mockup's own visual interactions and our bridge)
 * while forbidding network calls, forms and child frames. Without
 * `allow-same-origin` the document also cannot reach this app's cookies or DOM.
 */
const MOCKUP_CSP_BASE = [
  "default-src 'none'",
  "img-src * data: blob:",
  "style-src * 'unsafe-inline'",
  "font-src * data:",
  "connect-src 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
];

/** `script-src` must repeat the nonce: both the parent and this meta policy apply. */
function mockupCsp(nonce: string): string {
  return [...MOCKUP_CSP_BASE, nonce ? `script-src 'nonce-${nonce}'` : "script-src 'unsafe-inline'"].join(
    "; ",
  );
}

const MOCKUP_MESSAGE_SOURCE = "saksi-mockup";

const MOCKUP_BRIDGE = `(function () {
  function send(href) {
    try { parent.postMessage({ source: "${MOCKUP_MESSAGE_SOURCE}", href: href }, "*"); } catch (e) {}
  }
  document.addEventListener("click", function (e) {
    var node = e.target;
    var link = node && node.closest ? node.closest("a[href]") : null;
    if (!link) return;
    e.preventDefault();
    send(link.getAttribute("href") || "");
  }, true);
  document.addEventListener("submit", function (e) { e.preventDefault(); }, true);
})();`;

/**
 * Injects the CSP + link bridge into a generated document.
 *
 * A sandboxed `srcDoc` frame inherits this app's nonce-based `script-src`, so
 * every inline script needs that nonce to run at all. The meta policy below
 * only tightens what the parent already allows (no network, no forms).
 */
export function interactiveDocument(html: string, nonce: string): string {
  const attr = nonce ? ` nonce="${nonce}"` : "";
  const head =
    `<meta http-equiv="Content-Security-Policy" content="${mockupCsp(nonce)}">` +
    `<script${attr}>${MOCKUP_BRIDGE}</script>`;
  const inline = (doc: string) =>
    doc.replace(/<script(?![^>]*\bnonce=)(?![^>]*\bsrc=)/gi, `<script${attr}`);
  if (/<head[^>]*>/i.test(html)) {
    return inline(html.replace(/<head[^>]*>/i, (tag) => `${tag}${head}`));
  }
  if (/<html[^>]*>/i.test(html)) {
    return inline(html.replace(/<html[^>]*>/i, (tag) => `${tag}<head>${head}</head>`));
  }
  return inline(`<!doctype html><html><head>${head}</head><body>${html}</body></html>`);
}

interface DesignScreenProps {
  html: string;
  title: string;
  device?: DesignScreenType["device"];
  /** Render at 1:1 (used inside the fullscreen viewer). Defaults to scaling to fit. */
  scaleToFit?: boolean;
  /** Card height when scaled to fit. */
  viewportHeight?: number;
  className?: string;
  /** Offer the "click around" mode (fullscreen only). */
  allowInteractive?: boolean;
  /** CSP nonce of the current page; required for the bridge to run in the sandbox. */
  nonce?: string;
  /** Called with the href of a clicked mockup link. */
  onNavigate?: (href: string) => void;
  labels?: { start: string; stop: string };
}

/**
 * Renders an AI-generated UI mockup in a locked-down iframe. By default scripts
 * are disabled and the frame is inert; the viewer can opt into an interactive
 * mode where inline scripts run in an opaque origin and only link clicks are
 * bridged back to the parent.
 */
export function DesignScreen({
  html,
  title,
  device = "desktop",
  scaleToFit = true,
  viewportHeight = 240,
  className,
  allowInteractive = false,
  nonce = "",
  onNavigate,
  labels,
}: DesignScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [interactive, setInteractive] = useState(false);
  const { w, h } = LOGICAL[device] ?? LOGICAL.desktop;
  const [scale, setScale] = useState(0.3);
  const [left, setLeft] = useState(0);

  const onMessage = useCallback(
    (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { source?: unknown; href?: unknown } | null;
      if (!data || data.source !== MOCKUP_MESSAGE_SOURCE || typeof data.href !== "string") return;
      onNavigate?.(data.href);
    },
    [onNavigate],
  );

  useEffect(() => {
    if (!interactive) return;
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [interactive, onMessage]);

  useEffect(() => {
    if (!scaleToFit) return;
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const cw = el.clientWidth;
      if (cw <= 0) return;
      const s = Math.min(cw / w, viewportHeight / h);
      const l = Math.max(0, (cw - w * s) / 2);
      setScale((prev) => (Math.abs(prev - s) < 0.001 ? prev : s));
      setLeft((prev) => (Math.abs(prev - l) < 0.5 ? prev : l));
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const raf = requestAnimationFrame(update);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [scaleToFit, w, h, viewportHeight]);

  if (!scaleToFit) {
    return (
      <div className="relative" style={{ width: w, height: h }}>
        {allowInteractive && (
          <button
            type="button"
            onClick={() => setInteractive((v) => !v)}
            aria-pressed={interactive}
            className={cn(
              "absolute end-2 top-2 z-10 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors",
              interactive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-muted",
            )}
          >
            <MousePointerClick className="size-3.5" aria-hidden="true" />
            {interactive
              ? (labels?.stop ?? "Stop clicking")
              : (labels?.start ?? "Click around")}
          </button>
        )}
        <iframe
          ref={frameRef}
          // Remount when the mode flips: a sandbox attribute changed after the
          // document loaded is ignored, so the bridge would never run.
          key={interactive ? "interactive" : "static"}
          title={title}
          srcDoc={interactive ? interactiveDocument(html, nonce) : html}
          sandbox={interactive ? "allow-scripts" : ""}
          loading="lazy"
          style={{ width: w, height: h }}
          className={cn("border-0 bg-white", className)}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden bg-white", className)}
      style={{ height: viewportHeight }}
    >
      <iframe
        title={title}
        srcDoc={html}
        sandbox=""
        loading="lazy"
        style={{
          width: w,
          height: h,
          transform: `translateX(${left}px) scale(${scale})`,
          transformOrigin: "top left",
        }}
        className="pointer-events-none border-0 bg-white"
      />
    </div>
  );
}
